import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function ensureClassroomConfigured(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (await setup.isVisible().catch(() => false)) {
    await setup.getByLabel("Sınıf adı").fill("Kurgu Test Sınıfı");
    await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
    await setup.getByLabel("Çalışma düzeni").selectOption("morning");
    await setup
      .getByLabel("Uygulanan program")
      .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
    await setup.getByLabel("Program katalog kimliği").fill("KURGU-KATALOG");
    await setup.getByLabel("Kaynak sürümü").fill("2026-test");
    await setup
      .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
      .click();
    await expect(setup).toBeHidden();
  }
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByRole("button", { name: `${name} için işlemler` }).click();
  await expect(page.getByRole("button", { name: `${name} çocuğunu sınıftan ayır` })).toBeVisible();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

async function openStudentActions(page: Page, name: string) {
  await page.getByRole("button", { name: `${name} için işlemler` }).click();
}

async function openArchivedStudents(page: Page) {
  await page
    .locator("summary")
    .filter({ hasText: "Sınıftan ayrılanlar" })
    .click();
}

async function createD1Observation(page: Page, text: string) {
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await page.getByRole("button", { name: /Gözlem yaz/ }).click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button")
    .first()
    .click();
  await page.getByLabel("Ne oldu?").fill(text);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
}

test("çocuk ekleme, sınıftan ayırma ve geri alma yeniden açılışta korunur", async ({ page }) => {
  const childName = "Kurgu Çocuk Yeni";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await addChild(page, "Kurgu Çocuk İkinci");

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openStudentActions(page, childName);
  await page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` }).click();
  await openArchivedStudents(page);
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openArchivedStudents(page);
  await page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` }).click();
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openStudentActions(page, childName);
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` })).toBeVisible();
});

test("cihaz verisi kalıcıdır; yedek doğrulanır ve replace geri yükleme veri kaybını önler", async ({
  page,
}, testInfo) => {
  const childName = "Ada Kurgu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(
    page.getByRole("heading", { name: "Şifreli yedek ve geri yükle" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Google ile giriş/ })).toHaveCount(0);

  const backupPassphrase = "Kurgu-Yedek-2026!";
  await page.getByLabel("Yedek parolası").fill(backupPassphrase);
  await page.getByLabel("Parolayı doğrula").fill(backupPassphrase);
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Şifreli yedek oluştur/ }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error(`Playwright yedek dosya yolunu oluşturamadı: ${testInfo.title}`);
  const envelope = JSON.parse(await readFile(backupPath, "utf8"));
  expect(envelope.encryption.format).toBe("maarifos-encrypted-json");
  expect(envelope.encryption.algorithm).toBe("AES-256-GCM");
  expect(envelope.ciphertext).toEqual(expect.any(String));
  expect(await readFile(backupPath, "utf8")).not.toContain(childName);

  await page.keyboard.press("Escape");
  await createD1Observation(
    page,
    "Kurgu test gözlemi; yedek geri yükleme sonrasında kaldırılmalı.",
  );
  await expect(
    page
      .getByRole("region", { name: /Çocuklarım/i })
      .getByText("1 gözlem", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath);
  await expect(
    page.getByText("Şifreli yedek tanındı. İçeriği doğrulamak için parolayı girin."),
  ).toBeVisible();
  await page.getByLabel("Yedek parolası").last().fill(backupPassphrase);
  await page.getByRole("button", { name: "Yedeği aç ve doğrula" }).click();
  await expect(
    page.getByText("Şifreli yedek doğrulandı. Geri yükleme modunu seçin."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle" }).click();
  await expect(page.getByText(/Geri yükleme tamamlandı/)).toBeVisible();
  await expect(
    page.getByText(/kalıcı kurtarma noktası bu cihazda doğrulanmış olarak saklanıyor/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("region", { name: /Çocuklarım/i })
      .getByText("0 gözlem", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Bugünkü devam\s+0\/1 çocuk/ }).click();
  const attendanceStudent = page.locator("button.student-row").filter({ hasText: childName });
  await attendanceStudent.click();
  await attendanceStudent.click();
  await expect(page.getByRole("button", { name: "Son değişikliği geri al" })).toBeVisible();
  await page.getByRole("button", { name: "Son değişikliği geri al" }).click();
  await expect(attendanceStudent.getByText("Geldi", { exact: true })).toBeVisible();
  await attendanceStudent.click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await expect(page.locator(".sr-live")).toContainText("Yoklama tamamlandı.");
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});

test("bozuk yedek mevcut veriye dokunmadan Türkçe hata verir", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(
    page.getByRole("heading", { name: "Şifreli yedek ve geri yükle" }),
  ).toBeVisible();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles({
    name: "bozuk-maarifos-yedegi.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"manifest":{"backupVersion":1},"payload":{}}', "utf8"),
  });
  await expect(
    page.getByText("Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
});

test("ikinci sekmedeki gözlem eski devam durumunu geri ezmez", async ({ context, page }) => {
  const childName = "Çift Sekme Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  const stalePage = await context.newPage();
  await stalePage.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(stalePage);
  await stalePage.getByRole("button", { name: /Bugünkü devam\s+0\/1 çocuk/ }).click();
  await expect(stalePage.getByRole("button", { name: new RegExp(childName) }).getByText("İşaretlenmedi", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Bugünkü devam\s+0\/1 çocuk/ }).click();
  const activeStudent = page.locator("button.student-row").filter({ hasText: childName });
  await activeStudent.click();
  await activeStudent.click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await expect(page.locator(".sr-live")).toContainText("Yoklama tamamlandı.");

  await stalePage.keyboard.press("Escape");
  await createD1Observation(stalePage, "İkinci sekmeden kurgu gözlem.");
  await expect(
    stalePage
      .getByRole("region", { name: /Çocuklarım/i })
      .getByText("1 gözlem", { exact: true }),
  ).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});

test("ana sayfadaki çocuktan profil ve plansız hızlı gözlem akışı kalıcı çalışır", async ({
  page,
}, testInfo) => {
  const childName = `Profil Akış ${testInfo.workerIndex + 1}`;
  const preferredName = "Minik Kâşif";
  const birthDate = "2021-04-23";
  const optionalCode = "SINIF-A7";
  const homeLanguages = "Türkçe, İngilizce";
  const interests = "Yapılar kurma ve bahçedeki küçük canlıları inceleme";

  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  const childrenRail = page.getByRole("region", { name: /Çocuklarım/i });
  await expect(childrenRail).toBeVisible();
  await childrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();

  const profileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await profileDialog.getByLabel(/Tercih edilen ad/i).fill(preferredName);
  await profileDialog.getByLabel(/Doğum tarihi/i).fill(birthDate);
  await profileDialog.getByLabel(/İsteğe bağlı kod|Sınıf içi kod/i).fill(optionalCode);
  await profileDialog.getByLabel(/Evde kullanılan diller/i).fill(homeLanguages);
  await profileDialog.getByLabel(/İlgi ve merak alanları/i).fill(interests);
  await profileDialog
    .getByRole("button", { name: /Profili kaydet|Bilgileri kaydet/i })
    .click();
  await expect(profileDialog).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  const reloadedChildrenRail = page.getByRole("region", { name: /Çocuklarım/i });
  await reloadedChildrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();

  const reloadedProfileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await reloadedProfileDialog
    .getByRole("button", { name: "Bilgiler", exact: true })
    .click();
  await expect(reloadedProfileDialog.getByLabel(/Tercih edilen ad/i)).toHaveValue(preferredName);
  await expect(reloadedProfileDialog.getByLabel(/Doğum tarihi/i)).toHaveValue(birthDate);
  await expect(
    reloadedProfileDialog.getByLabel(/İsteğe bağlı kod|Sınıf içi kod/i),
  ).toHaveValue(optionalCode);
  await expect(
    reloadedProfileDialog.getByLabel(/Evde kullanılan diller/i),
  ).toHaveValue(homeLanguages);
  await expect(
    reloadedProfileDialog.getByLabel(/İlgi ve merak alanları/i),
  ).toHaveValue(interests);
  await page.keyboard.press("Escape");
  await expect(reloadedProfileDialog).toBeHidden();

  await reloadedChildrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*hızlı gözlem`, "i") })
    .click();

  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  const selectedChild = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: new RegExp(childName) });
  await expect(selectedChild).toHaveAttribute("aria-pressed", "true");

  await page
    .getByLabel("Ne oldu?")
    .fill("Oyun sırasında üç taşı yan yana dizdi ve arkadaşına sırasını anlattı.");
  await page.getByText("İstersen ayrıntı ekle", { exact: true }).click();
  await expect(page.getByLabel("Bağlam / ne sırasında?", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Çocuğun sözü", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Çocuk sözü", exact: true }).click();
  await expect(page.getByLabel("Çocuğun aynen sözü", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Çocuğun sözünü yorum eklemeden ve düzeltmeden yazın.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kısa not", exact: true }).click();
  await page.getByRole("button", { name: /Oyun ve katılım/i }).click();
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();

  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: /Çocuklarım/i })
      .getByText("1 gözlem", { exact: true }),
  ).toBeVisible();
});

test("profil fotoğrafı, yakın iletişimi, sınırsız gözlem arşivi ve güvenli metin aktarımı birlikte çalışır", async ({
  page,
}, testInfo) => {
  const childName = `Arşiv İletişim ${testInfo.workerIndex + 1}`;
  const longObservation = `Uzun gözlem başlangıcı. ${"Ayrıntılı ve kesilmemiş gözlem cümlesi. ".repeat(90)}Uzun gözlem sonu.`;

  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await createD1Observation(page, longObservation);

  await page
    .getByRole("region", { name: /Çocuklarım/i })
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();
  const profile = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(profile).toBeVisible();
  await expect(profile.getByText("Uzun gözlem sonu.", { exact: false })).toBeVisible();
  await expect(
    profile.getByRole("button", { name: /Program bağlantısını tamamla/ }),
  ).toBeVisible();
  await expect(
    profile.locator('input[type="file"][capture="environment"]'),
  ).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  await expect(
    profile.locator('input[type="file"]:not([capture])'),
  ).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");

  await profile.locator('input[type="file"]:not([capture])').setInputFiles({
    name: "profil.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJ+QAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(profile.getByAltText(`${childName} profil fotoğrafı`)).toBeVisible();

  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await profile.getByLabel("Adı ve soyadı").first().fill("Ayşe Kurgu");
  const primaryPhoneInput = profile.getByLabel("Cep telefonu").first();
  await expect(primaryPhoneInput).toHaveAttribute("placeholder", "05");
  await primaryPhoneInput.fill("+90 532 532 32 32");
  await expect(primaryPhoneInput).toHaveValue("0532 532 32 32");
  await primaryPhoneInput.clear();
  await primaryPhoneInput.pressSequentially("0555");
  await expect(primaryPhoneInput).toHaveValue("0555");
  await primaryPhoneInput.pressSequentially("123");
  await expect(primaryPhoneInput).toHaveValue("0555 123");
  await primaryPhoneInput.pressSequentially("45");
  await expect(primaryPhoneInput).toHaveValue("0555 123 45");
  await primaryPhoneInput.pressSequentially("678");
  await expect(primaryPhoneInput).toHaveValue("0555 123 45 67");
  await profile.getByLabel("Öncelikli iletişim kişisi").first().check();
  await profile.getByRole("button", { name: "Başka bir yakın ekle" }).click();
  await profile.getByLabel("Yakınlığı").fill("Bakıcı");
  await profile.getByLabel("Adı ve soyadı").last().fill("Melek Kurgu");
  await profile.getByLabel("Cep telefonu").last().fill("0532 000 00 00");
  await profile.getByRole("button", { name: "Profili kaydet" }).click();
  await expect(profile).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page
    .getByRole("region", { name: /Çocuklarım/i })
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();
  const reloadedProfile = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(reloadedProfile.getByAltText(`${childName} profil fotoğrafı`)).toBeVisible();
  await expect(reloadedProfile.getByText("Uzun gözlem sonu.", { exact: false })).toBeVisible();
  await expect(
    reloadedProfile.getByRole("button", { name: /Program bağlantısını tamamla/ }),
  ).toBeVisible();

  const exportDownload = page.waitForEvent("download");
  await reloadedProfile.getByRole("button", { name: "Metin indir" }).click();
  const exported = await exportDownload;
  const exportPath = await exported.path();
  if (!exportPath) throw new Error("Gözlem metni indirme yolu üretilemedi.");
  const exportedText = await readFile(exportPath, "utf8");
  expect(exportedText).toContain("Uzun gözlem başlangıcı.");
  expect(exportedText).toContain("Uzun gözlem sonu.");
  expect(exportedText).not.toContain("0555");
  expect(exportedText).not.toContain("Ayşe Kurgu");
  expect(exportedText).not.toContain("data:image");

  await reloadedProfile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await expect(
    reloadedProfile.getByRole("link", { name: /Ayşe Kurgu kişisini ara/ }),
  ).toHaveAttribute("href", "tel:+905551234567");
  await expect(
    reloadedProfile.getByRole("link", { name: /Ayşe Kurgu kişisine WhatsApp/ }),
  ).toHaveAttribute("href", "https://wa.me/905551234567");
  await expect(reloadedProfile.getByLabel("Cep telefonu").last()).toHaveValue(
    "0532 000 00 00",
  );

  await expect(
    reloadedProfile.getByRole("button", { name: /Program bağlantısını tamamla/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Program hedefi")).toHaveCount(0);
});

test("her çocuk için sade hızlı gözlem ayrı kaydedilir ve yeniden açılışta korunur", async ({
  page,
}) => {
  const childNames = ["Ece Toplu", "Arda Toplu", "Mina Toplu"];
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  for (const childName of childNames) {
    await addChild(page, childName);
  }

  for (const childName of childNames) {
    await page
      .getByRole("region", { name: /Çocuklarım/i })
      .getByRole("button", {
        name: new RegExp(`${childName}.*hızlı gözlem`, "i"),
      })
      .click();
    await page
      .getByLabel("Ne oldu?")
      .fill(`${childName} blok oyununda bir parça seçerek ortak yapıyı sürdürdü.`);
    await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  }

  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Çocuklarım/i }).getByText("1 gözlem", {
      exact: true,
    }),
  ).toHaveCount(3);

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await expect(
    page.getByRole("region", { name: /Çocuklarım/i }).getByText("1 gözlem", {
      exact: true,
    }),
  ).toHaveCount(3);
});

test("Öğretmenin plan ve belge iş alanları ana navigasyondan erişilir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);

  await expect(page.getByRole("button", { name: "Planlar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Belgeler", exact: true })).toBeVisible();
  await expect(page.getByTestId("current-work")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bugün için plan eklenmedi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Günlük plan oluştur" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Günün planı" })).toBeVisible();

  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  const capture = page.getByRole("dialog", { name: "Ne ekleyelim?" });
  await expect(capture.getByRole("button", { name: /Gözlem yaz/ })).toBeVisible();
  await expect(capture.getByRole("button", { name: /Yoklama al/ })).toBeVisible();
  await expect(capture.getByRole("button", { name: /Etkinlik planla/ })).toBeVisible();
  await expect(capture.getByRole("button", { name: /Takvime not ekle/ })).toHaveCount(0);
});
