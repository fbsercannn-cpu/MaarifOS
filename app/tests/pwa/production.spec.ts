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

async function startVersionUpgradeServer() {
  const distRoot = resolve(process.cwd(), "dist", "client");
  const currentWorker = await readFile(join(distRoot, "sw.js"), "utf8");
  expect(currentWorker).toContain('const WORKER_RELEASE = "0.10.0";');
  const previousWorker = currentWorker.replace(
    'const WORKER_RELEASE = "0.10.0";',
    'const WORKER_RELEASE = "0.9.1";',
  );
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

test("üretim PWA gerçek ekranla açılır ve çevrim dışı yeniden başlar", async ({ context, page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();

  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Sınıf adı").fill("Güneş Sınıfı");
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" }).click();
  await expect(setup).toBeHidden();
  await expect(page.getByRole("heading", { name: "Bugün", exact: true })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();
  await expect(page.getByText("Sabah grubu · 08.30–12.30", { exact: true })).toBeVisible();

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
  await expect(page.locator(".today-brand-logo")).toHaveAttribute(
    "src",
    "/assets/brand/maarifos-icon-192.png",
  );

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
  expect(serviceWorkerScript).toContain("/sw.js?v=0.10.0");
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("button", { name: "Şimdi güncelle" }),
  ).toHaveCount(0);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bugün", exact: true })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();
  await expect(page.getByText("Sabah grubu · 08.30–12.30", { exact: true })).toBeVisible();

  await page.goto("/gunum/cevrimdisi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı", { exact: true })).toBeVisible();
  await expect(page.getByText("Sabah grubu · 08.30–12.30", { exact: true })).toBeVisible();
});

test("0.9.1 etkin worker 0.10.0'ı doğrular, kullanıcı onayıyla etkinleştirir ve cihaz verisini korur", async ({
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
        { message: "0.9.1 app-shell etkin ve sağlıklı olmalı", timeout: 15_000 },
      )
      .toBe("0.9.1");
    expect(await workerHealth(page, "active")).toEqual(
      expect.objectContaining({ version: "0.9.1", shellReady: true }),
    );

    const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
    await setup.getByLabel("Sınıf adı").fill("Sürüm Koruma Sınıfı");
    await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
    await setup.getByLabel("Çalışma düzeni").selectOption("morning");
    await setup
      .getByLabel("Uygulanan program")
      .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
    await setup.getByRole("button", {
      name: "Sınıfı ve çalışma düzenini kaydet",
    }).click();
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    await page
      .getByLabel("Sınıftaki çocuklar")
      .getByRole("button", { name: "Çocuk ekle", exact: true })
      .click();
    await page.getByLabel("Çocuğun adı").fill("Sürüm Koruma Çocuğu");
    await page.getByRole("button", { name: "Ekle", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sürüm Koruma Çocuğu profilini aç" }),
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
        { message: "0.10.0 worker sağlık denetiminden sonra waiting olmalı", timeout: 15_000 },
      )
      .toBe("0.9.1->0.10.0");
    expect(await workerHealth(page, "waiting")).toEqual(
      expect.objectContaining({ version: "0.10.0", shellReady: true }),
    );
    await expect(settings).toContainText("Çevrim dışı paket 0.9.1");
    const applyUpdate = settings.getByRole("button", {
      name: "0.10.0 sürümüne güvenle güncelle",
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
        { message: "controllerchange ve reload sonrasında 0.10.0 etkin olmalı", timeout: 15_000 },
      )
      .toBe("0.10.0");
    expect(await workerHealth(page, "active")).toEqual(
      expect.objectContaining({ version: "0.10.0", shellReady: true }),
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
      offlinePage.getByRole("main", { name: "MaarifOS Bugün ekranı" }),
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
