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
  await expect(setup).toBeHidden();
}

test("premiumPilot sorgusu dar telefonda sade TYMM plan ekranını değiştirmez", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?premiumPilot=1", { waitUntil: "networkidle" });
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
    "60–72 AY · HAZIR MAARİF İÇERİĞİ",
  );
  await expect(builtInMaarifLibrary).toContainText(
    "Kaynak bütünlüğü doğrulanmış içerikler",
  );

  const layout = await plans.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    clippedTitles: [...element.querySelectorAll(".simple-action-list button strong")]
      .filter((title) => title.scrollHeight > title.clientHeight + 1)
      .map((title) => title.textContent?.trim() ?? ""),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.clippedTitles).toEqual([]);

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
