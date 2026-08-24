import { expect, test, type Page } from "@playwright/test";

async function configureClassroomWithStudent(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Plan Kullanılabilirlik Okulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Plan Kullanılabilirlik Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Plan kullanılabilirlik sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: /^(İlk öğrenciyi ekle|Öğrenci ekle)$/ })
    .last()
    .click();
  await page.getByLabel("Çocuğun adı").fill("Plan Dock Çocuğu");
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

test.use({ viewport: { width: 390, height: 844 } });

test("plan CTA'sı görünür kalır ve eksik adımları çözülene kadar açıklar", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);

  await page
    .getByRole("region", { name: "Ben hazırladım" })
    .getByRole("button", { name: /TYMM günlük plan/ })
    .click();

  const dialog = page.getByRole("dialog", { name: "Günlük plan oluşturma" });
  const dock = dialog.locator(".plan-save-dock");
  const readiness = dialog.locator(".plan-readiness");
  const saveButton = dialog.getByRole("button", { name: "Planı kaydet" });

  await expect(dialog).toBeVisible();
  await expect(dock).toHaveCSS("position", "fixed");
  await expect(readiness).toHaveAttribute("role", "status");
  await expect(readiness).toHaveAttribute("aria-live", "polite");
  await expect(readiness).toContainText("2 adım kaldı");
  await expect(readiness).toContainText("Bir etkinlik seçin veya etkinlik adını yazın.");
  await expect(readiness).toContainText("En az bir program hedefi seçin.");
  await expect(saveButton).toBeDisabled();

  const initialDockBox = await dock.boundingBox();
  expect(initialDockBox).not.toBeNull();
  expect(initialDockBox!.y).toBeGreaterThanOrEqual(64);
  expect(initialDockBox!.y + initialDockBox!.height).toBeLessThanOrEqual(844);

  const suggestion = dialog.locator(".plan-suggestion").first();
  await suggestion.click();
  await expect(suggestion).toHaveAttribute("aria-pressed", "true");
  await expect(suggestion.getByText("Seçildi", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Fikir seçildi", { exact: true })).toBeVisible();
  await expect(readiness).toContainText("1 adım kaldı");
  await expect(readiness).toContainText("En az bir program hedefi seçin.");

  await dialog
    .getByRole("region", { name: "Program alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  const target = dialog.getByRole("button", { name: /FAB\.1\b/ }).first();
  await target.click();
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await expect(target).toContainText("Seçildi");
  await expect(dialog.getByText("1 hedef seçili", { exact: true })).toBeVisible();
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(saveButton).toBeEnabled();

  await dialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  const dateInput = dialog.getByLabel("Plan tarihi");
  const startInput = dialog.getByLabel("Başlangıç");
  const endInput = dialog.getByLabel("Bitiş");
  const originalDate = await dateInput.inputValue();
  const originalStart = await startInput.inputValue();
  const originalEnd = await endInput.inputValue();

  await dateInput.fill("2026-13-40");
  await expect(readiness).toContainText(
    "Plan tarihini YYYY-AA-GG biçiminde yazın.",
  );
  await expect(saveButton).toBeDisabled();
  await dateInput.fill(originalDate);

  await startInput.fill("11:00");
  await endInput.fill("10:00");
  await expect(readiness).toContainText(
    "Bitiş saati başlangıç saatinden sonra olmalıdır.",
  );
  await expect(saveButton).toBeDisabled();
  await startInput.fill(originalStart);
  await endInput.fill(originalEnd);
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(saveButton).toBeEnabled();

  await dialog.getByText("Çocuk kapsamı", { exact: true }).click();
  await dialog.getByRole("radio", { name: /Seçili çocuklar/ }).check();
  await expect(readiness).toContainText("1 adım kaldı");
  await expect(readiness).toContainText(
    "En az bir çocuk seçerek çocuk kapsamını tamamlayın.",
  );
  await expect(saveButton).toBeDisabled();

  await dialog.getByRole("checkbox", { name: "Plan Dock Çocuğu" }).check();
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(saveButton).toBeEnabled();

  const scroller = dialog.locator(".mobile-scroll");
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const scrolledDockBox = await dock.boundingBox();
  expect(scrolledDockBox).not.toBeNull();
  expect(scrolledDockBox!.y).toBeGreaterThanOrEqual(64);
  expect(scrolledDockBox!.y + scrolledDockBox!.height).toBeLessThanOrEqual(844);

  const layout = await dialog.evaluate((element) => {
    const flow = element.querySelector<HTMLElement>(".d1-flow-scroll");
    return {
      scrollWidth: flow?.scrollWidth ?? 0,
      clientWidth: flow?.clientWidth ?? 0,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});
