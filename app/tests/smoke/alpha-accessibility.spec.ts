import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Erişilebilirlik Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function expectNoSeriousAxeViolation(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = result.violations
    .filter(({ impact }) => impact === "critical" || impact === "serious")
    .map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map((node) => node.target),
    }));
  expect(blocking).toEqual([]);
}

test("Hediye Alpha Günüm ve boş Sınıf yüzeyleri ciddi axe ihlali taşımaz", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await expectNoSeriousAxeViolation(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByText("Henüz çocuk eklenmedi", { exact: true })).toBeVisible();
  await expectNoSeriousAxeViolation(page);
});
