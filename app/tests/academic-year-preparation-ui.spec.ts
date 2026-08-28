import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test("yaklaşan eğitim yılı öğretmen kararıyla bugün gerçek kayıt kullanımına açılır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Hazırlık Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Hazırlık Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Hazırlık Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" })
    .locator("summary")
    .click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2099-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2100-08-31");
  await expect(setup.getByText("Yeni dönem hazır")).toBeVisible();
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await expect(page.locator(".teacher-control")).toHaveCount(0);
  await expect(page.getByTestId("teacher-day-close")).toHaveCount(0);
  await expect(page.getByTestId("current-work")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Günün planı" })).toHaveCount(0);
  await expect(page.getByTestId("teacher-work-cycle")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Günlük plan oluştur" })).toHaveCount(0);

  const childName = "Hazırlık Kurgu Öğrencisi";
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "İlk öğrenciyi ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(childName);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  const studentRow = page.locator(".simple-student-list li").filter({ hasText: childName });
  const quickObservation = studentRow.getByRole("button", { name: "Gözlem", exact: true });
  await expect(quickObservation).toBeDisabled();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page
    .getByRole("region", { name: "Sıradaki en iyi adım" })
    .getByRole("button")
    .click();
  await expect(setup).toBeVisible();
  const calendarDetails = setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" });
  await calendarDetails.locator("summary").click();
  await expect(setup.getByText("Yeni dönem hazır")).toBeVisible();
  await expect(setup.getByLabel("Eğitim yılı başlangıcı")).toHaveValue("2099-09-01");
  await setup.getByRole("button", { name: "Çalışmayı bugün başlat" }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(quickObservation).toBeEnabled();
  await expect(
    page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" }),
  ).toBeHidden();
});

test("boş sınıf ile arama sonucu olmayan sınıf farklı ve eyleme dönük metin gösterir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Boş Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Boş Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Boş Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const emptyState = page.locator(".simple-empty-state");
  const emptyStateMessage = emptyState.getByRole("status");
  await expect(emptyStateMessage).toHaveAttribute("aria-live", "polite");
  await expect(emptyStateMessage).toHaveAttribute("aria-atomic", "true");
  await expect(
    emptyStateMessage.getByText("Henüz öğrenci eklenmedi", { exact: true }),
  ).toBeVisible();
  await expect(
    emptyStateMessage.getByText("İlk öğrenciyi ekleyerek sınıf dosyasını başlatın.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "İlk öğrenciyi ekle", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "İlk öğrenciyi ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Arama Kurgu Öğrencisi");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await expect(addStudent).toBeHidden();
  await expect(
    page.locator(".simple-student-list li").filter({ hasText: "Arama Kurgu Öğrencisi" }),
  ).toBeVisible();

  const studentSearch = page.getByLabel("Öğrenci ara");
  await studentSearch.fill("olmayan");
  await expect(studentSearch).toHaveValue("olmayan");
  await expect(
    emptyStateMessage.getByText("Eşleşen öğrenci yok", { exact: true }),
  ).toBeVisible();
  await expect(
    emptyStateMessage.getByText("Arama metnini değiştirin.", { exact: true }),
  ).toBeVisible();
});
