import { expect, test, type Page } from "@playwright/test";

const studentName = "Kurgu Güvenlik Öğrencisi";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Kurgu Güvenlik Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Güvenlik Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2025–2026");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("telefon akışında sağlık, acil iletişim ve teslim yetkisi kaydedilip yeniden açılır", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/classroom?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const quickAdd = page.getByRole("dialog", { name: "Çocuk ekle" });
  await quickAdd.getByLabel("Çocuğun adı").fill(studentName);
  await quickAdd.getByLabel("Yakınlığı").fill("Anne");
  await quickAdd.getByLabel("Yakının adı ve soyadı").fill("Kurgu Veli");
  await quickAdd.getByLabel("Yakının cep telefonu").fill("0555 123 45 67");
  await quickAdd.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(quickAdd).toBeHidden();

  const profileButton = page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: studentName });
  await profileButton.click();
  let profile = page.getByRole("dialog", { name: `${studentName} profili` });
  await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
  await profile.getByLabel("Bilinen alerjiler").fill("Fındık alerjisi");
  await profile.getByLabel("Beslenme gereksinimleri").fill("Laktozsuz");
  await profile.getByLabel("İlaç ve uygulama notu").fill("Veli yazılı talimatı dosyada");
  await profile
    .getByLabel("Acil durumda bilinmesi gerekenler")
    .fill("Önce anne aranır");
  await profile.getByLabel("Ev adresi").fill("Kurgu Mahallesi 12, Denizli");
  await profile.getByLabel("Hekim / sağlık birimi").fill("Kurgu Aile Hekimi");
  await profile.getByLabel("Hekim telefonu").fill("0258 123 45 67");
  await profile
    .getByLabel("Sağlık cihazı veya sürekli destek")
    .fill("Gözlük");

  await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
  await profile.getByLabel("Veli e-posta adresi").fill("veli@example.com");
  await profile.getByLabel("Aile eğitimi ihtiyaçları").fill("Oyunla öğrenme");
  await profile.getByLabel("Aile katılım tercihleri").fill("Cuma çevrim içi");
  await profile.getByLabel("Fotoğraf / video kullanım formu").check();
  await profile.getByLabel("Okul dışı gezi / öğrenme formu").check();
  await profile.getByLabel("Dijital iletişim formu").check();
  await profile.getByLabel("Formların son kontrol tarihi").fill("2026-08-21");

  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  const guardian = profile.locator("section.student-contact-card").first();
  await guardian.getByLabel("Acil durumda aranabilir").check();
  await guardian.getByLabel("Çocuğu teslim alabilir").check();
  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
  await expect(profile).toBeHidden();

  await expect(page.getByText("Alerji notu var", { exact: true })).toBeVisible();
  await profileButton.click();
  profile = page.getByRole("dialog", { name: `${studentName} profili` });
  await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
  await expect(profile.getByLabel("Bilinen alerjiler")).toHaveValue("Fındık alerjisi");
  await expect(profile.getByLabel("Ev adresi")).toHaveValue(
    "Kurgu Mahallesi 12, Denizli",
  );
  await expect(profile.getByLabel("Hekim / sağlık birimi")).toHaveValue(
    "Kurgu Aile Hekimi",
  );
  await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
  await expect(profile.getByLabel("Veli e-posta adresi")).toHaveValue(
    "veli@example.com",
  );
  await expect(profile.getByLabel("Aile eğitimi ihtiyaçları")).toHaveValue(
    "Oyunla öğrenme",
  );
  await expect(profile.getByLabel("Fotoğraf / video kullanım formu")).toBeChecked();
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  const restoredGuardian = profile.locator("section.student-contact-card").first();
  await expect(restoredGuardian.getByLabel("Acil durumda aranabilir")).toBeChecked();
  await expect(restoredGuardian.getByLabel("Çocuğu teslim alabilir")).toBeChecked();

  const tabLayout = await profile.locator(".student-profile-tabs").evaluate((tabs) => ({
    left: tabs.getBoundingClientRect().left,
    right: tabs.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(tabLayout.left).toBeGreaterThanOrEqual(0);
  expect(tabLayout.right).toBeLessThanOrEqual(tabLayout.viewport);
});
