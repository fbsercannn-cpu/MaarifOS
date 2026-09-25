import { expect, test, type Page } from "@playwright/test";

async function configureMaarifClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Premium Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Premium Mobil Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await expect(setup.locator(".official-calendar-applied")).toHaveText(/Uygulandı/);
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden({timeout:30_000});
}

test("premiumPilot sorgusu dar telefonda sade TYMM plan ekranını değiştirmez", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?view=app&native=1&premiumPilot=1", { waitUntil: "networkidle" });
  await configureMaarifClassroom(page);

  await expect(page.getByRole("button", { name: "Planları aç" })).toHaveCount(0);
  await expect(page.getByTestId("premium-plan-center")).toHaveCount(0);
  await page.getByRole("button", { name: "Planlar", exact: true }).click();

  const plans = page.getByRole("main", { name: "Planlar" });
  await expect(plans).toBeVisible();
  await expect(plans).toContainText("Yalnız Türkiye Yüzyılı Maarif Modeli");
  const planTypes = plans.getByRole("region", { name: "Neyi hazırlayacaksınız?" });
  await expect(planTypes.getByRole("button")).toHaveCount(5);
  const builtInMaarifLibrary = planTypes.getByTestId(
    "built-in-maarif-library-entry",
  );
  await expect(builtInMaarifLibrary).toContainText(
    "60–72 AY · DÜZENLENEBİLİR İÇERİK",
  );
  await expect(builtInMaarifLibrary).toContainText(
    "MaarifOS’un özgün içeriği · TYMM’ye dayalı",
  );

  const officialResources = plans.getByTestId("tymm-official-library-panel");
  await expect(officialResources.getByRole("button")).toHaveCount(1);
  await expect(officialResources).toContainText(
    "erişilemeyen üç resmî PDF bağlantısı",
  );
  await expect(
    plans.getByRole("heading", { name: "Etkinlik ve okul ekleri" }),
  ).toHaveCount(0);
  const advancedSupport = plans.getByRole("button", {
    name: /Gelişmiş plan desteğini aç/u,
  });
  await advancedSupport.click();
  const quickTools = plans.getByRole("region", { name: "Etkinlik ve okul ekleri" });
  await expect(quickTools).toBeVisible();
  await expect(quickTools.getByRole("button")).toHaveCount(3);
  await plans
    .getByRole("button", { name: /Gelişmiş plan desteğini kapat/u })
    .click();
  await expect(
    plans.getByRole("heading", { name: "Etkinlik ve okul ekleri" }),
  ).toHaveCount(0);
  const officialOpen = officialResources.getByTestId("tymm-official-library-open");
  await officialOpen.click();
  const officialDialog = page.getByRole("dialog", {
    name: "Resmî TYMM okul öncesi kütüphanesi",
  });
  const officialFeatured = officialDialog.getByTestId("tymm-library-featured");
  await officialFeatured
    .getByText("Bu plan için öne çıkan kaynaklar", { exact: true })
    .click();
  const officialDetails = officialFeatured.locator(".tymm-library-plan-examples");
  await officialDetails
    .getByText("MEB’de yayımlanmış plan örnekleri", { exact: true })
    .click();
  await expect(officialDetails.getByRole("link")).toHaveCount(5);
  await expect(officialDetails).toContainText("planınıza otomatik aktarılmaz");

  const officialMetrics = await officialDetails.evaluate((element) => {
    const summary = element.querySelector("summary");
    const links = [...element.querySelectorAll("a")];
    const textNodes = [...element.querySelectorAll("small, p")];
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      summaryHeight: summary?.getBoundingClientRect().height ?? 0,
      linkHeights: links.map((link) => link.getBoundingClientRect().height),
      textSizes: textNodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
    };
  });
  expect(officialMetrics.scrollWidth).toBeLessThanOrEqual(officialMetrics.clientWidth);
  expect(officialMetrics.summaryHeight).toBeGreaterThanOrEqual(44);
  expect(officialMetrics.linkHeights.every((height) => height >= 44)).toBe(true);
  expect(officialMetrics.textSizes.every((size) => size >= 12)).toBe(true);
  await officialDialog
    .getByRole("button", { name: "Resmî kaynak kütüphanesini kapat" })
    .click();
  await expect(officialOpen).toBeFocused();

  const layout = await plans.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    clippedTitles: [...element.querySelectorAll(".simple-action-list button strong")]
      .filter((title) => title.scrollHeight > title.clientHeight + 1)
      .map((title) => title.textContent?.trim() ?? ""),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.clippedTitles).toEqual([]);

  const guideEntry = page.getByTestId("tymm-age-guide-entry");
  await expect(guideEntry).toContainText("Resmî program ve plan kaynağı");
  await expect(guideEntry).toContainText("Yaş bandına göre öğrenme çıktıları");
  await expect(guideEntry.getByTestId("tymm-guide-open")).toHaveText(/Yaş rehberini aç/u);
  await guideEntry.getByTestId("tymm-guide-open").click();
  const guide = page.getByRole("dialog", { name: "TYMM 2024 Yaş Rehberi" });
  await expect(guide.getByRole("tab")).toHaveCount(0);
  const ageGroup = guide.getByRole("group", { name: "TYMM yaş bandı" });
  await expect(ageGroup.getByRole("button", { pressed: true })).toHaveCount(1);
  const guideExamples = guide.getByTestId("tymm-official-examples");
  await expect(guideExamples).not.toHaveAttribute("open", "");
  await guideExamples.getByText("Resmî örnek planlar", { exact: true }).click();
  await expect(guideExamples.getByRole("link")).toHaveCount(5);
  await expect(
    guideExamples.getByRole("link").first(),
  ).toHaveAccessibleName(/yeni sekmede/u);
  const programDetails = guide.getByTestId("tymm-program-details");
  await expect(programDetails).not.toHaveAttribute("open", "");
  await programDetails.getByText("Program ayrıntıları", { exact: true }).click();
  await expect(programDetails).toHaveAttribute("open", "");
  const domainGroup = programDetails.getByRole("group", { name: "Öğrenme alanları" });
  await expect(domainGroup.getByRole("button", { pressed: true })).toHaveCount(1);
  await expect(
    guide.getByRole("link", { name: /Resmî program PDF’sini yeni sekmede aç/u }),
  ).toHaveAttribute(
    "href",
    "https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf",
  );
  const guideMetrics = await guide.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    linkHeights: [...element.querySelectorAll("a")].map(
      (link) => link.getBoundingClientRect().height,
    ),
    textSizes: [...element.querySelectorAll("small, p, .d1-kicker, .tymm-age-tabs strong, .tymm-domain-tabs span, .tymm-domain-tabs strong, .tymm-outcome-list li > span")].map((node) =>
      Number.parseFloat(getComputedStyle(node).fontSize),
    ),
  }));
  expect(guideMetrics.scrollWidth).toBeLessThanOrEqual(guideMetrics.clientWidth);
  expect(guideMetrics.linkHeights.every((height) => height >= 44)).toBe(true);
  expect(guideMetrics.textSizes.every((size) => size >= 12)).toBe(true);
  await guide.getByRole("button", { name: "TYMM 2024 Yaş Rehberi ekranını kapat" }).click();
  await expect(guide).toBeHidden();

  await builtInMaarifLibrary.click();
  const builtInMaarifPlans = page.getByTestId("premium-plan-center");
  await expect(
    builtInMaarifPlans.getByRole("heading", {
      name: "Hazır Maarif planları",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    builtInMaarifPlans.getByTestId("premium-install-panel"),
  ).toBeVisible();
  await builtInMaarifPlans
    .getByRole("button", { name: "Plan Kütüphanesi’ni kapat" })
    .click();
  await expect(builtInMaarifPlans).toBeHidden();

  await planTypes
    .getByRole("button", { name: /Yıllık planlama panosu/i })
    .click();
  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog.getByRole("heading", { name: "Plan zincirim" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "TYMM başlangıç öneriniz hazır" })).toBeVisible();
  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
  await expect(dialog).toBeHidden();
});
