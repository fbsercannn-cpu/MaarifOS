import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Kurgu Mobil Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Ceviz Ağacı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden({ timeout: 30_000 });
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.documentWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.bodyWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function expectInteractiveControlsInsideViewport(page: Page) {
  const offenders = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      "button, input, select, textarea, [role='button'], [role='tab'], [role='dialog'], [role='navigation']",
    ));
    return controls.flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hidden = style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width < 1 || rect.height < 1;
      if (hidden || element.closest("[aria-hidden='true']")) return [];
      if (rect.left >= -1 && rect.right <= viewport + 1) return [];
      const clippedByIntentionalRail = Boolean(element.closest(".mobile-carousel"));
      if (clippedByIntentionalRail) return [];
      return [{
        tag: element.tagName,
        label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || "",
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        viewport,
      }];
    });
  });
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

test("public root is a responsive promotional website without full app access", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Bugünkü sınıf akışını kolayca dijitale taşı." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ana menü" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Menüyü aç" })).toBeVisible();
  await expect(page.getByLabel("MaarifOS günlük sınıf panosu önizlemesi")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectInteractiveControlsInsideViewport(page);

  if (testInfo.project.name === "chromium-phone") {
    await page.screenshot({ path: "output/maarifos-redesign-20260924/public-site-mobile.png", fullPage: true });
  }

  await expect(page.getByRole("link", { name: /Ürünü incele/ }).first()).toHaveAttribute("href", "#urun-onizlemesi");
  await expect(page.getByRole("button", { name: /Uygulamayı aç|Bugünü hazırla|Sınıfıma geç|Planlama alanını aç/ })).toHaveCount(0);
  await expect(page.getByText(/Bu site tanıtım amaçlıdır/)).toBeVisible();
});

test("Today surface and AI assistant fit narrow phones without clipped actions", async ({ page }, testInfo) => {
  let deepSeekRequestBody: Record<string, unknown> | null = null;
  await page.route("**/api/ai/chat", async (route) => {
    deepSeekRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "Haftalık sınıf bülteni taslağı hazır. Öğretmen incelemesi gerekir.",
        model: "deepseek-test",
      }),
    });
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?view=app&native=1");
  await configureClassroom(page);

  const deepSeekWorkCenter = page.getByRole("region", { name: "DeepSeek Öğretmen İşleri" });
  await expect(deepSeekWorkCenter).toBeVisible();
  await expect(deepSeekWorkCenter.getByRole("button")).toHaveCount(3);
  await expect(deepSeekWorkCenter.getByText(/T\.C\. kimlik numarası/)).toBeVisible();
  await expect(deepSeekWorkCenter.getByRole("button", { name: /AI ile bugünün plan taslağını hazırla/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(deepSeekWorkCenter.getByRole("button", { name: /AI ile bugünün plan taslağını hazırla/ })).toBeInViewport();
  if (testInfo.project.name === "chromium-phone") {
    await deepSeekWorkCenter.screenshot({ path: "output/maarifos-redesign-20260924/deepseek-work-center-mobile.png" });
  }

  await deepSeekWorkCenter.getByRole("button", { name: /Veli bülteni taslağı/ }).click();
  const assistantFromTask = page.getByRole("dialog", { name: "MaarifOS Yapay Zekâ Pedagojik Destek" });
  await expect(assistantFromTask.getByText("Haftalık sınıf bülteni taslağı hazır. Öğretmen incelemesi gerekir.")).toBeVisible();
  expect(deepSeekRequestBody).not.toBeNull();
  const deepSeekPayload = JSON.stringify(deepSeekRequestBody);
  expect(deepSeekPayload).toContain("Kayıtlı çocuk sayısı: 0");
  expect(deepSeekPayload).not.toContain("Emine Öğretmen");
  expect(deepSeekPayload).not.toContain("Ceviz Ağacı");
  expect(deepSeekPayload).not.toContain("Kurgu Mobil Anaokulu");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("maarif_close_ai_assistant")));
  await expect(assistantFromTask).toBeHidden();

  const island = page.getByRole("complementary", { name: "Dinamik Pedagojik Ada" });
  await expect(island).toBeVisible();
  await expect(island.getByRole("tab", { name: "Günün ritmi" })).toBeVisible();
  await expect(island.getByRole("tab", { name: "Öğrenme iskelesi" })).toBeVisible();
  await expect(island.getByRole("tab", { name: "Aile ve çatışma" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const width of [360, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoHorizontalOverflow(page);
    await expectInteractiveControlsInsideViewport(page);
    const islandMetrics = await island.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewport: window.innerWidth };
    });
    expect(islandMetrics.left).toBeGreaterThanOrEqual(-1);
    expect(islandMetrics.right).toBeLessThanOrEqual(islandMetrics.viewport + 1);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  if (testInfo.project.name === "chromium-phone") {
    await page.screenshot({ path: "output/maarifos-redesign-20260924/today-mobile.png", fullPage: true });
  }

  await page.getByRole("button", { name: "Pedagojik Yapay Zekâ Desteğini Aç" }).click();
  const assistant = page.getByRole("dialog", { name: "MaarifOS Yapay Zekâ Pedagojik Destek" });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByRole("button", { name: /Sohbet/ })).toBeVisible();
  await expect(assistant.getByRole("button", { name: /Reçeteler/ })).toBeVisible();
  await expect(assistant.getByRole("button", { name: /Ayarlar/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectInteractiveControlsInsideViewport(page);

  const composer = assistant.getByPlaceholder(/Pedagojik sorunuzu yazın/);
  await composer.focus();
  await expect(composer).toBeInViewport();
  const panelMetrics = await assistant.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(panelMetrics.left).toBeGreaterThanOrEqual(0);
  expect(panelMetrics.top).toBeGreaterThanOrEqual(0);
  expect(panelMetrics.right).toBeLessThanOrEqual(panelMetrics.viewportWidth + 1);
  expect(panelMetrics.bottom).toBeLessThanOrEqual(panelMetrics.viewportHeight + 1);

  if (testInfo.project.name === "chromium-phone") {
    await page.screenshot({ path: "output/maarifos-redesign-20260924/assistant-mobile.png" });
  }

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("maarif_close_ai_assistant")));
  await expect(assistant).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("maarif_open_settings")));
  const systemSettings = page.getByRole("dialog", { name: "Sistem ve gizlilik ayarları" });
  await expect(systemSettings).toBeVisible();
  await systemSettings.getByRole("button", { name: "Yapılandır" }).click();
  const aiSettings = page.getByRole("dialog", { name: "Yapay zekâ çalışma biçimi" });
  await expect(aiSettings).toBeVisible();
  await aiSettings.getByRole("button", { name: /DeepSeek destekli bulut asistanı/ }).click();
  await expect(aiSettings.getByRole("button", { name: "Kaydet" })).toBeDisabled();
  await aiSettings.getByRole("button", { name: "Google hesabını ve bulut bağlantısını aç" }).click();
  await expect(page.getByRole("dialog", { name: "Hesap ve veri güvenliği" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Google hesabı ve şifreli yedek" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectInteractiveControlsInsideViewport(page);
});
