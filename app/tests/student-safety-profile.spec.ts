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
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2026–2027");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("telefon akışında sağlık, acil iletişim ve teslim yetkisi kaydedilip yeniden açılır", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/classroom?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const quickAdd = page.getByRole("dialog", { name: "Çocuk ekle" });
  await quickAdd.locator("details.student-optional-details > summary").click();
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
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: false }).click();
  await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
  await profile.getByLabel("Bilinen alerjiler").fill("Fındık alerjisi");
  await profile.getByLabel("Beslenme gereksinimleri").fill("Laktozsuz");
  await profile.getByLabel("İlaç ve uygulama notu").fill("Veli yazılı talimatı dosyada");
  await profile
    .getByLabel("Acil durumda bilinmesi gerekenler")
    .fill("Önce anne aranır");
  await profile.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click();
  await profile.getByLabel("Ev adresi").fill("Kurgu Mahallesi 12, Denizli");
  await profile.getByLabel("Hekim / sağlık birimi").fill("Kurgu Aile Hekimi");
  await profile.getByLabel("Hekim telefonu").fill("0258 123 45 67");
  await profile
    .getByLabel("Sağlık cihazı veya sürekli destek")
    .fill("Gözlük");

  await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
  await profile.getByLabel("Anne ve baba ayrı yaşıyor").check();
  await profile.getByLabel("Baba vefat etmiş").check();
  await profile.getByLabel("Şehit çocuğu").check();
  await profile.getByLabel("Aile durumu açıklaması", { exact: true }).fill("Kurgu aile görüşmesi notu");
  await profile.getByLabel("Çocuğa özel bilgi notu").fill("Geçiş öncesinde sakin bir hatırlatma yardımcı oluyor.");
  await profile.getByLabel("Veli e-posta adresi").fill("veli@example.com");
  await profile.getByLabel("Aile eğitimi ihtiyaçları").fill("Oyunla öğrenme");
  await profile.getByLabel("Aile katılım tercihleri").fill("Cuma çevrim içi");
  await profile.getByLabel("Fotoğraf / video kullanım formu").check();
  await profile.getByLabel("Okul dışı gezi / öğrenme formu").check();
  await profile.getByLabel("Dijital iletişim formu").check();
  await profile.getByLabel("Formların son kontrol tarihi").fill("2026-08-21");

  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  const guardian = profile.locator("section.student-contact-card").first();
  await guardian.getByLabel("Mesleği", { exact: true }).fill("Mimar");
  const father = profile.getByRole("region", { name: "Baba bilgileri", exact: true });
  await father.getByLabel("Adı ve soyadı", { exact: true }).fill("Kurgu Baba");
  await father.getByLabel("Mesleği", { exact: true }).fill("Teknisyen");
  await guardian.getByLabel("Acil durumda aranabilir").check();
  await guardian.getByLabel("Çocuğu teslim alabilir").check();
  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
  await expect(profile).toBeHidden();

  await expect(page.getByText("Alerji notu var", { exact: true })).toBeVisible();
  await profileButton.click();
  profile = page.getByRole("dialog", { name: `${studentName} profili` });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: false }).click();
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
  await expect(profile.getByLabel("Anne ve baba ayrı yaşıyor")).toBeChecked();
  await expect(profile.getByLabel("Baba vefat etmiş")).toBeChecked();
  await expect(profile.getByLabel("Şehit çocuğu")).toBeChecked();
  await expect(profile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Geçiş öncesinde sakin bir hatırlatma yardımcı oluyor.");
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  const restoredGuardian = profile.locator("section.student-contact-card").first();
  await expect(restoredGuardian.getByLabel("Acil durumda aranabilir")).toBeChecked();
  await expect(restoredGuardian.getByLabel("Çocuğu teslim alabilir")).toBeChecked();
  await expect(restoredGuardian.getByLabel("Mesleği", { exact: true })).toHaveValue("Mimar");
  await expect(profile.getByRole("region", { name: "Baba bilgileri", exact: true }).getByLabel("Mesleği", { exact: true })).toHaveValue("Teknisyen");

  const tabLayout = await profile.locator(".student-profile-tabs").evaluate((tabs) => ({
    left: tabs.getBoundingClientRect().left,
    right: tabs.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(tabLayout.left).toBeGreaterThanOrEqual(0);
  expect(tabLayout.right).toBeLessThanOrEqual(tabLayout.viewport);

  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
  await expect(profile).toBeHidden();
  await page.locator("details.simple-classroom__operations > summary").click();
  await page.getByRole("button", { name: `${studentName} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${studentName} öğrencisini sil`, exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Öğrenciyi sil", exact: true });
  await expect(deletion).toContainText("Gözlemler, yoklamalar, fotoğraflar");
  await deletion.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(deletion).toBeHidden();
  await expect(profileButton).toBeVisible();
  await page.getByRole("button", { name: `${studentName} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${studentName} öğrencisini sil`, exact: true }).click();
  await deletion.getByRole("button", { name: "Sil ve geri alınabilir arşive taşı", exact: true }).click();
  await expect(deletion).toBeHidden();
  await expect(profileButton).toHaveCount(0);
  await page.locator("details.simple-classroom__archive > summary").click();
  await page.getByRole("button", { name: `${studentName} çocuğunu sınıfa geri al`, exact: true }).click();
  await expect(profileButton).toBeVisible();
  await page.context().setOffline(true);
  await profileButton.click();
  const recoveredProfile = page.getByRole("dialog", { name: `${studentName} profili` });
  await recoveredProfile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: false }).click();
  await recoveredProfile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
  await expect(recoveredProfile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Geçiş öncesinde sakin bir hatırlatma yardımcı oluyor.");
});
