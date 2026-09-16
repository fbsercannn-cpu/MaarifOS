import { expect, test, type Page } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, resolve, sep } from "node:path";
import { excluded, firstName, otherName, output, prepare, verifySelection } from "../fixtures/class-roster-vibrant-acceptance";

const oldRoot = resolve(process.env.MAARIF_UPGRADE_FROM_DIR ?? "C:/Users/Asus/Desktop/Maarif/release-artifacts/publish-0.27.0-20260907/app/dist/client");
const oldRelease = process.env.MAARIF_UPGRADE_FROM_RELEASE ?? "0.27.0";
const currentRelease = JSON.parse(await readFile("package.json", "utf8")).version as string;
const newRoot = resolve("dist/client");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const contentTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf",
  ".woff2": "font/woff2", ".wasm": "application/wasm", ".pdf": "application/pdf" };
type PwaStatus = { phase: string; activeVersion: string | null; updateVersion: string | null; offlineReady: boolean };

async function artifactEvidence(root: string, release: string) {
  const manifestBytes = await readFile(join(root, "maarifos-precache-manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as { release: string; assets: unknown[] };
  expect(manifest.release).toBe(release);
  const html = await readFile(join(root, "index.html")), worker = await readFile(join(root, "sw.js"));
  expect(worker.toString("utf8")).toContain(`const WORKER_RELEASE = "${release}";`);
  const entry = html.toString("utf8").match(/<script[^>]*type="module"[^>]*src="([^"]+)"/u)?.[1];
  expect(entry).toBeTruthy();
  return { release, manifestSha256: sha(manifestBytes), htmlSha256: sha(html), workerSha256: sha(worker),
    entryPath: entry!, entrySha256: sha(await readFile(join(root, entry!.replace(/^\//u, "")))), assets: manifest.assets.length };
}

async function startActualArtifactServer() {
  let activeRoot = oldRoot;
  const requests: { release: string; path: string; sha256: string }[] = [];
  const server = createServer(async (request, response) => {
    // Capture one root per request. No release literals, HTML, manifest or worker bytes are rewritten.
    const requestRoot = activeRoot;
    try {
      const decoded = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
      const relative = decoded === "/" || extname(decoded) === "" ? "index.html" : decoded.replace(/^\/+/, "");
      const path = resolve(requestRoot, relative);
      if (!path.startsWith(`${requestRoot}${sep}`)) { response.writeHead(404).end(); return; }
      const bytes = await readFile(path);
      if (["index.html", "sw.js", "maarifos-precache-manifest.json"].includes(relative) || relative.endsWith(".js")) {
        requests.push({ release: requestRoot === oldRoot ? oldRelease : currentRelease, path: `/${relative}`, sha256: sha(bytes) });
      }
      response.writeHead(200, { "Content-Type": contentTypes[extname(relative)] ?? "application/octet-stream",
        // Public app-shell responses must remain cacheable. no-store would correctly
        // make the real worker reject this test server's precache responses.
        "Content-Length": String(bytes.length), "Cache-Control": "no-cache, must-revalidate",
        ...(relative === "sw.js" ? { "Service-Worker-Allowed": "/" } : {}) });
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Geçici yükseltme sunucusu port alamadı.");
  return { origin: `http://127.0.0.1:${address.port}`, requests, switchToFinal: () => { activeRoot = newRoot; },
    close: () => new Promise<void>((accept, reject) => { server.close(error => error ? reject(error) : accept()); server.closeAllConnections(); }) };
}

async function pwaStatus(page: Page) { return page.evaluate(() => (window as unknown as { __maarifosPwaStatus?: PwaStatus }).__maarifosPwaStatus ?? null); }
async function workerHealth(page: Page, kind: "active" | "waiting") {
  return page.evaluate(async workerKind => {
    const worker = (await navigator.serviceWorker.getRegistration("/"))?.[workerKind];
    if (!worker) return null;
    return new Promise<{ version: string; shellReady: boolean } | null>(accept => {
      const channel = new MessageChannel();
      const finish = (result: { version: string; shellReady: boolean } | null) => { clearTimeout(timer); channel.port1.close(); accept(result); };
      const timer = setTimeout(() => finish(null), 5000);
      channel.port1.onmessage = event => finish(event.data);
      worker.postMessage({ type: "maarifos:get-status" }, [channel.port2]);
    });
  }, kind);
}

async function encryptedStudentDigest(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((accept, reject) => { const request = indexedDB.open("maarifos-local"); request.onsuccess = () => accept(request.result); request.onerror = () => reject(request.error); });
    try {
      const rows = await new Promise<unknown[]>((accept, reject) => { const request = db.transaction("students", "readonly").objectStore("students").getAll(); request.onsuccess = () => accept(request.result); request.onerror = () => reject(request.error); });
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(rows))));
      return { count: rows.length, sha256: [...digest].map(value => value.toString(16).padStart(2, "0")).join("") };
    } finally { db.close(); }
  });
}

async function createSyntheticRecordsThroughOldUi(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu İletişim Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click(); await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const [index, name] of [firstName, otherName].entries()) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await add.getByLabel("Çocuğun adı", { exact: true }).fill(name);
    if (index === 0) {
      await add.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click();
      await add.getByLabel("Ev adresi", { exact: true }).fill(`${excluded.address} No: 12 Acıpayam Denizli`);
      await add.getByLabel("Ev adresi", { exact: true }).press("Tab");
    }
    await add.locator("details.student-optional-details > summary").click();
    await add.getByLabel("Öğrenci numarası", { exact: true }).fill(index ? "0013" : "0012");
    if (index === 0) {
      await add.getByLabel("T.C. kimlik numarası", { exact: true }).fill(excluded.identity);
      await add.getByLabel(/^Doğum tarihi/u).fill("2021-01-12");
      await add.getByLabel("Yakınlığı", { exact: true }).fill("Anne");
      await add.getByLabel("Yakının adı ve soyadı", { exact: true }).fill("Kurgu Anne Çınar");
      await add.getByLabel("Yakının cep telefonu", { exact: true }).fill("05320000001");
    }
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click(); await expect(add).toBeHidden();
  }
  await page.locator("button.simple-student-list__profile").filter({ hasText: firstName }).click();
  const profile = page.getByRole("dialog", { name: `${firstName} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Mesleği", { exact: true }).fill(excluded.occupation);
  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click(); await expect(profile).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  for (const name of [firstName, otherName]) await expect(page.locator("button.simple-student-list__profile").filter({ hasText: name })).toBeVisible();
}

test(`gerçek ${oldRelease} → ${currentRelease}: kayıtlar, çevrim dışı yirmi alan, PDF ve aynı kapsam korunur`, async ({ browser }) => {
  const oldEvidence = await artifactEvidence(oldRoot, oldRelease), newEvidence = await artifactEvidence(newRoot, currentRelease);
  expect(oldEvidence.entrySha256).not.toBe(newEvidence.entrySha256);
  expect(oldEvidence.htmlSha256).not.toBe(newEvidence.htmlSha256);
  const server = await startActualArtifactServer(), context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage();
  const sourceRequests: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/src/") || path.startsWith("/tests/")) sourceRequests.push(path); });
  try {
    await prepare(page, 390);
    const response = await page.goto(`${server.origin}/?native=1`, { waitUntil: "domcontentloaded" });
    expect(sha(await response!.body())).toBe(oldEvidence.htmlSha256);
    await expect.poll(() => pwaStatus(page), { timeout: 60000 }).toEqual(expect.objectContaining({ offlineReady: true, activeVersion: oldRelease }));
    expect(await workerHealth(page, "active")).toEqual(expect.objectContaining({ version: oldRelease, shellReady: true }));
    await createSyntheticRecordsThroughOldUi(page);
    const before = await encryptedStudentDigest(page); expect(before.count).toBe(2);
    await page.screenshot({ path: `${output}/upgrade-old-records-390.png` });
    server.switchToFinal();
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
    await page.getByRole("button", { name: "Ayarları aç", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Hesap ve veri güvenliği", exact: true });
    await settings.getByRole("button", { name: "Güncellemeleri şimdi denetle", exact: true }).click();
    await expect.poll(async () => { const status = await pwaStatus(page); return status?.phase === "update-ready" ? `${status.activeVersion}->${status.updateVersion}` : status?.phase; }, { timeout: 60000 }).toBe(`${oldRelease}->${currentRelease}`);
    expect(await workerHealth(page, "waiting")).toEqual(expect.objectContaining({ version: currentRelease, shellReady: true }));
    await page.screenshot({ path: `${output}/upgrade-ready-390.png` });
    const reload = page.waitForEvent("framenavigated", frame => frame === page.mainFrame());
    await settings.getByRole("button", { name: `${currentRelease} sürümüne güvenle güncelle`, exact: true }).click(); await reload;
    await expect.poll(async () => { const status = await pwaStatus(page); return status?.offlineReady ? status.activeVersion : null; }, { timeout: 60000 }).toBe(currentRelease);
    expect(await workerHealth(page, "active")).toEqual(expect.objectContaining({ version: currentRelease, shellReady: true }));
    expect(await encryptedStudentDigest(page)).toEqual(before);
    await context.setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    for (const name of [firstName, otherName]) await expect(page.locator("button.simple-student-list__profile").filter({ hasText: name })).toBeVisible();
    await page.getByText("Sınıf işlemleri", { exact: true }).click();
    await page.getByRole("button", { name: "Sınıf listesini indir", exact: true }).click();
    await verifySelection(page, page.getByRole("dialog", { name: "PDF önizlemesi", exact: true }), "upgraded-actual-390", 390);
    expect(sourceRequests).toEqual([]);
    expect(await encryptedStudentDigest(page)).toEqual(before);
    for (const evidence of [oldEvidence, newEvidence]) {
      for (const [path, expected] of [["/index.html", evidence.htmlSha256], ["/sw.js", evidence.workerSha256], ["/maarifos-precache-manifest.json", evidence.manifestSha256], [evidence.entryPath, evidence.entrySha256]]) {
        expect(server.requests).toEqual(expect.arrayContaining([expect.objectContaining({ release: evidence.release, path, sha256: expected })]));
      }
    }
    await writeFile(`${output}/real-upgrade-receipt.json`, JSON.stringify({ syntheticOnly: true, status: "PASS", old: oldEvidence, final: newEvidence,
      sameOrigin: true, metadataOnlySimulation: false, artifactBytesRewritten: false, recordsCreatedByOldUi: 2,
      encryptedRecordsUnchanged: before, userUpdateButtonUsed: true, offlineReloadAndExport: true, sourceModuleRequests: 0,
      acceptanceReceipt: "upgraded-actual-390-receipt.json", actualOldHtmlWorkerAndEntryServed: true, actualFinalHtmlWorkerAndEntryServed: true,
      physicalPrinterTested: false, publishedByThisTest: false }, null, 2));
  } finally { await context.close(); await server.close(); }
});
