import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { chromium, expect, test } from "@playwright/test";

type PwaWindow = Window & {
  __maarifosPwaStatus?: {
    phase: string;
    offlineReady: boolean;
    activeVersion: string | null;
    updateVersion: string | null;
  };
};

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

const packageMetadata = JSON.parse(
  await readFile(resolve(process.cwd(), "package.json"), "utf8"),
) as { version: string };
const currentRelease = packageMetadata.version;
const previousRelease = (() => {
  const [major, minor, patch] = currentRelease.split(".").map(Number);
  if (![major, minor, patch].every(Number.isInteger)) {
    throw new Error("PWA üretim testi geçerli bir uygulama sürümü gerektirir.");
  }
  if (patch > 0) return `${major}.${minor}.${patch - 1}`;
  if (minor > 0) return `${major}.${minor - 1}.0`;
  throw new Error("PWA üretim testi önceki bir sürüm türetemedi.");
})();

async function startVersionUpgradeServer() {
  const distRoot = resolve(process.cwd(), "dist", "client");
  const currentWorker = await readFile(join(distRoot, "sw.js"), "utf8");
  expect(currentWorker).toContain(`const WORKER_RELEASE = "${currentRelease}";`);
  const previousWorker = currentWorker.replace(
    `const WORKER_RELEASE = "${currentRelease}";`,
    `const WORKER_RELEASE = "${previousRelease}";`,
  );
  const currentPrecacheManifest = JSON.parse(
    await readFile(join(distRoot, "maarifos-precache-manifest.json"), "utf8"),
  ) as { release: string };
  expect(currentPrecacheManifest.release).toBe(currentRelease);
  const previousPrecacheManifest = {
    ...currentPrecacheManifest,
    release: previousRelease,
  };
  let currentWorkerEnabled = false;

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/sw.js") {
        const body = Buffer.from(
          currentWorkerEnabled ? currentWorker : previousWorker,
          "utf8",
        );
        response.writeHead(200, {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Content-Length": String(body.byteLength),
          "Content-Type": contentTypes[".js"],
          "Service-Worker-Allowed": "/",
        });
        response.end(body);
        return;
      }
      if (url.pathname === "/maarifos-precache-manifest.json") {
        const body = Buffer.from(
          `${JSON.stringify(
            currentWorkerEnabled ? currentPrecacheManifest : previousPrecacheManifest,
            null,
            2,
          )}\n`,
          "utf8",
        );
        response.writeHead(200, {
          "Cache-Control": "no-cache, must-revalidate",
          "Content-Length": String(body.byteLength),
          "Content-Type": contentTypes[".json"],
        });
        response.end(body);
        return;
      }

      const decodedPath = decodeURIComponent(url.pathname);
      const relativePath =
        decodedPath === "/" || extname(decodedPath) === ""
          ? "index.html"
          : decodedPath.replace(/^\/+/, "");
      const filePath = resolve(distRoot, relativePath);
      if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
        response.writeHead(404).end();
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": relativePath === "index.html" ? "no-cache" : "public, max-age=60",
        "Content-Length": String(body.byteLength),
        "Content-Type": contentTypes[extname(relativePath)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Sürüm yükseltme test sunucusu port alamadı.");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    enableCurrentWorker: () => {
      currentWorkerEnabled = true;
    },
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      }),
  };
}

async function workerHealth(page: import("@playwright/test").Page, kind: "active" | "waiting") {
  return page.evaluate(async (workerKind) => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const worker = registration?.[workerKind];
    if (!worker) return null;

    return new Promise<{
      version: string;
      shellReady: boolean;
    } | null>((resolveHealth) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => resolveHealth(null), 5_000);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        resolveHealth(event.data);
      };
      worker.postMessage({ type: "maarifos:get-status" }, [channel.port2]);
    });
  }, kind);
}

async function completeSimpleClassroomSetup(
  page: import("@playwright/test").Page,
  classroomName: string,
) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Okul adı").fill("Deneme Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Deneme");
  await setup.getByLabel("Sınıf adı").fill(classroomName);
  await setup
    .getByLabel("Maarif Modeli yaş grubu")
    .selectOption({ label: "48–60 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("üretim PWA gerçek ekranla açılır ve çevrim dışı yeniden başlar", async ({ context, page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();

  await completeSimpleClassroomSetup(page, "Güneş Sınıfı");
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestBody = await manifest.json();
  expect(manifestBody.display).toBe("standalone");
  expect(manifestBody.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-192.png",
        sizes: "192x192",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-512.png",
        sizes: "512x512",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-maskable-512.png",
        sizes: "512x512",
        purpose: "maskable",
      }),
    ]),
  );

  for (const icon of manifestBody.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok()).toBeTruthy();
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }

  const precacheResponse = await page.request.get("/maarifos-precache-manifest.json");
  expect(precacheResponse.ok()).toBeTruthy();
  const precacheManifest = await precacheResponse.json() as {
    schemaVersion: number;
    release: string;
    assets: Array<{ path: string; sha256: string; size: number }>;
  };
  expect(precacheManifest.schemaVersion).toBe(1);
  expect(precacheManifest.release).toBe(currentRelease);
  expect(precacheManifest.assets).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: expect.stringMatching(/^assets\/activity-studio-.*\.js$/u) }),
    ]),
  );
  expect(precacheManifest.assets.every((asset) =>
    asset.path.startsWith("assets/") &&
    /^[a-f0-9]{64}$/u.test(asset.sha256) &&
    Number.isSafeInteger(asset.size)
  )).toBe(true);

  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as PwaWindow).__maarifosPwaStatus?.offlineReady ?? false,
        ),
      { message: "PWA yalnız doğrulanmış app-shell cache sonrasında hazır olmalı" },
    )
    .toBe(true);

  const serviceWorkerScript = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? "";
  });
  expect(serviceWorkerScript).toContain(`/sw.js?v=${currentRelease}`);
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("button", { name: "Şimdi yenile" }),
  ).toHaveCount(0);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();

  await page.goto("/gunum/cevrimdisi", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();

  // Bu lazy ekran çevrim içiyken hiç açılmadı; ilk kez tamamen ağsız yüklenebilmelidir.
  await page
    .getByRole("region", { name: "Bugünün işi tek yerde" })
    .getByRole("button", { name: /Etkinlik bankası/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Etkinlik ve Materyal Stüdyosu", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".activity-studio__grid")).toBeVisible();
});

test(`${previousRelease} etkin worker ${currentRelease} sürümünü doğrular, kullanıcı onayıyla etkinleştirir ve cihaz verisini korur`, async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const server = await startVersionUpgradeServer();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${server.origin}/?native=1`, { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const status = (window as PwaWindow).__maarifosPwaStatus;
            return status?.offlineReady ? status.activeVersion : null;
          }),
        { message: `${previousRelease} app-shell etkin ve sağlıklı olmalı`, timeout: 15_000 },
      )
      .toBe(previousRelease);
    expect(await workerHealth(page, "active")).toEqual(
      expect.objectContaining({ version: previousRelease, shellReady: true }),
    );

    await completeSimpleClassroomSetup(page, "Sürüm Koruma Sınıfı");
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
    await page.getByLabel("Çocuğun adı").fill("Sürüm Koruma Çocuğu");
    await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Sürüm Koruma Çocuğu/ }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Bugün", exact: true }).click();

    server.enableCurrentWorker();
    await page.getByRole("button", { name: "Ayarları aç" }).click();
    const settings = page.getByRole("dialog", {
      name: "Hesap ve veri güvenliği",
    });
    await settings.getByRole("button", {
      name: "Güncellemeleri şimdi denetle",
    }).click();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const status = (window as PwaWindow).__maarifosPwaStatus;
            return status?.phase === "update-ready"
              ? `${status.activeVersion}->${status.updateVersion}`
              : status?.phase ?? null;
          }),
        { message: `${currentRelease} worker sağlık denetiminden sonra waiting olmalı`, timeout: 15_000 },
      )
      .toBe(`${previousRelease}->${currentRelease}`);
    expect(await workerHealth(page, "waiting")).toEqual(
      expect.objectContaining({ version: currentRelease, shellReady: true }),
    );
    await expect(settings).toContainText(`Çevrim dışı paket ${previousRelease}`);
    const applyUpdate = settings.getByRole("button", {
      name: `${currentRelease} sürümüne güvenle güncelle`,
    });
    await expect(applyUpdate).toBeEnabled();

    const reloaded = page.waitForEvent("framenavigated", (frame) => {
      return frame === page.mainFrame();
    });
    await applyUpdate.click();
    await reloaded;
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const status = (window as PwaWindow).__maarifosPwaStatus;
            return status?.offlineReady ? status.activeVersion : null;
          }),
        { message: `controllerchange ve reload sonrasında ${currentRelease} etkin olmalı`, timeout: 15_000 },
      )
      .toBe(currentRelease);
    expect(await workerHealth(page, "active")).toEqual(
      expect.objectContaining({ version: currentRelease, shellReady: true }),
    );
    expect(
      await page.evaluate(
        () => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type,
      ),
    ).toBe("reload");

    const studentNames = await page.evaluate(
      () =>
        new Promise<string[]>((resolveStudents, rejectStudents) => {
          const open = indexedDB.open("maarifos-local");
          open.onerror = () => rejectStudents(open.error);
          open.onsuccess = () => {
            const database = open.result;
            const read = database
              .transaction("students", "readonly")
              .objectStore("students")
              .getAll();
            read.onerror = () => rejectStudents(read.error);
            read.onsuccess = () => {
              resolveStudents(
                (read.result as Array<{ displayName?: string }>).flatMap((student) =>
                  typeof student.displayName === "string" ? [student.displayName] : [],
                ),
              );
              database.close();
            };
          };
        }),
    );
    expect(studentNames).toContain("Sürüm Koruma Çocuğu");
  } finally {
    await context.close();
    await server.close();
  }
});

test("kalıcı tarayıcı profili ağsız yeni süreçte app-shell ile soğuk başlar", async ({}, testInfo) => {
  test.setTimeout(60_000);
  const baseURL = String(testInfo.project.use.baseURL);
  const profileDirectory = await mkdtemp(join(tmpdir(), "maarifos-pwa-profile-"));
  let onlineContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  let offlineContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;

  try {
    onlineContext = await chromium.launchPersistentContext(profileDirectory, {
      headless: true,
      viewport: { width: 1280, height: 900 },
    });
    const onlinePage = onlineContext.pages()[0] ?? (await onlineContext.newPage());
    await onlinePage.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        () =>
          onlinePage.evaluate(
            () => (window as PwaWindow).__maarifosPwaStatus?.offlineReady ?? false,
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    expect(
      await onlinePage.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        const cacheNames = await caches.keys();
        return Boolean(
          navigator.serviceWorker.controller &&
            registration.active &&
            cacheNames.some((name) => name.startsWith("maarifos-shell-")),
        );
      }),
    ).toBe(true);
    await onlineContext.close();
    onlineContext = null;

    offlineContext = await chromium.launchPersistentContext(profileDirectory, {
      headless: true,
      viewport: { width: 1280, height: 900 },
    });
    await offlineContext.setOffline(true);
    const offlinePage = offlineContext.pages()[0] ?? (await offlineContext.newPage());
    const response = await offlinePage.goto(new URL("/gunum/kalici-profil", baseURL).href, {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    await expect(offlinePage.locator(".native-app-runtime")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      offlinePage.getByRole("dialog", { name: "Sınıfını hazırla" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        () =>
          offlinePage.evaluate(() =>
            Boolean(
              navigator.serviceWorker.controller &&
                (window as PwaWindow).__maarifosPwaStatus?.offlineReady,
            ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
  } finally {
    await offlineContext?.close();
    await onlineContext?.close();
    await rm(profileDirectory, { recursive: true, force: true });
  }
});
