import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";

type PwaWindow = Window & {
  __maarifosPwaStatus?: {
    phase: string;
    offlineReady: boolean;
    activeVersion: string | null;
  };
};

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
  expect(serviceWorkerScript).toContain("/sw.js?v=0.7.0");
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
    await expect(offlinePage.locator(".native-app-runtime")).toBeVisible();
    await expect(
      offlinePage.getByRole("main", { name: "MaarifOS Bugün ekranı" }),
    ).toBeVisible();
    expect(
      await offlinePage.evaluate(
        () =>
          Boolean(
            navigator.serviceWorker.controller &&
              (window as PwaWindow).__maarifosPwaStatus?.offlineReady,
          ),
      ),
    ).toBe(true);
  } finally {
    await offlineContext?.close();
    await onlineContext?.close();
    await rm(profileDirectory, { recursive: true, force: true });
  }
});
