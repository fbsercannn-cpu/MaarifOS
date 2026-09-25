import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });
// The workflow requires a teaching day; every tab shares one civil clock.
test.beforeEach(async ({ context }) => {
  const offsetMs = Date.parse("2026-09-10T06:00:00.000Z") - Date.now();
  await context.addInitScript((offset: number) => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [NativeDate.now() + offset]); },
      apply() { return new NativeDate(NativeDate.now() + offset).toString(); },
      get(target, key, receiver) { return key === "now" ? () => NativeDate.now() + offset : Reflect.get(target, key, receiver); },
    });
  }, offsetMs);
});

async function ensureClassroomConfigured(page: Page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[data-testid="persistence-gate"]')) return false;
    const main = document.querySelector("main");
    if (!main) return false;
    const setupRequired = main.textContent?.includes("Sınıf kurulumu tamamlanmadı") ?? false;
    if (!setupRequired) return true;
    return [...document.querySelectorAll('[role="dialog"]')].some((dialog) =>
      dialog.textContent?.includes("Sınıfını hazırla"),
    );
  });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  if (await setup.isVisible().catch(() => false)) {
    await setup.getByLabel("Okul adı").fill("Kurgu Test Okulu");
    await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Test Öğretmeni");
    await setup.getByLabel("Sınıf adı").fill("Kurgu Test Sınıfı");
    await setup
      .getByLabel("Maarif Modeli yaş grubu", { exact: true })
      .selectOption({ label: "60–72 ay" });
    await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
    await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
    await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
    await setup.getByText("İleri ayarlar", { exact: true }).click();
    await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
    await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
    await expect(setup).toBeHidden();
  }
  const startYear = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  if (await startYear.isVisible()) { await startYear.click(); await expect(startYear).toBeHidden(); }
}

async function addChild(page: Page, name: string) {
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .last()
    .click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addSheet.getByLabel("Çocuğun adı").fill(name);
  await addSheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addSheet).toBeHidden();
  await expect(studentProfileButton(page, name)).toBeVisible();
}

function classroomList(page: Page) {
  return page.getByRole("region", { name: "Çocuklar", exact: true });
}

async function openProfileDetails(dialog: Locator) {
  const details = dialog.locator("details.student-profile-context-details");
  if (await details.getAttribute("open") === null) {
    await dialog.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  }
  await expect(details).toHaveAttribute("open", "");
}

function studentListItem(page: Page, name: string) {
  return classroomList(page).getByRole("listitem").filter({ hasText: name }).first();
}

function studentProfileButton(page: Page, name: string) {
  return studentListItem(page, name).getByRole("button").first();
}

async function expectStudentObservationCount(page: Page, name: string, count: number) {
  await studentProfileButton(page, name).click();
  const profile = page.getByRole("dialog", { name: `${name} profili` });
  await expect(profile).toBeVisible();
  await expect(
    profile
      .getByRole("region", { name: "Gelişim kayıtları" })
      .getByText(`${count} gözlem`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(profile).toBeHidden();
}

function studentObservationButton(page: Page, name: string) {
  return studentListItem(page, name).getByRole("button", {
    name: `${name} için Maarif gelişim gözlemi ekle`,
    exact: true,
  });
}

async function openAttendance(page: Page) {
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await expect(page.getByRole("main", { name: "Sınıfım", exact: true })).toBeVisible();
  const operations = await openClassroomOperations(page);
  await operations.getByRole("button", { name: /^Bugünün yoklaması/ }).click();
  await expect(page.getByRole("dialog", { name: "Hızlı Dokunmatik Yoklama (E5)", exact: true })).toBeVisible();
}

async function openClassroomOperations(page: Page) {
  const operations = page.locator("details.simple-classroom__operations");
  if (await operations.getAttribute("open") === null) {
    await operations.locator(":scope > summary").click();
  }
  await expect(operations).toHaveAttribute("open", "");
  return operations;
}

async function openStudentActions(page: Page, name: string) {
  const operations = await openClassroomOperations(page);
  await operations
    .getByRole("button", { name: `${name} için diğer işlemler` })
    .click();
}

async function openArchivedStudents(page: Page) {
  const operations = await openClassroomOperations(page);
  const archive = operations.locator("details.simple-classroom__archive");
  if (await archive.getAttribute("open") === null) {
    await archive.locator(":scope > summary").click();
  }
  await expect(archive).toHaveAttribute("open", "");
}

async function expectQuickObservationSaved(page: Page) {
  // Hızlı kayıt öğretmeni ikinci bir modal kapatmaya zorlamaz. Sonraki adım,
  // Sınıfım ekranındaki hazır iş paketi olarak erişilebilir kalır.
  await expect(
    page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  await expect(page.getByText(/ için gözlem notu kaydedildi\.$/u)).toBeVisible();
}

async function createD1Observation(page: Page, text: string) {
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await classroomList(page)
    .getByRole("button", { name: / için Maarif gelişim gözlemi ekle$/u })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Hızlı Gözlem", exact: true })).toBeVisible();
  await expect(page.locator(".quick-selected-child")).toBeVisible();
  await expect(page.getByRole("button", { name: "Çocuğu değiştir", exact: true })).toBeVisible();
  await page.getByLabel("Ne oldu?").fill(text);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expectQuickObservationSaved(page);
}

test("çocuk ekleme, sınıftan ayırma ve geri alma yeniden açılışta korunur", async ({ page }) => {
  const childName = "Kurgu Çocuk Yeni";
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await addChild(page, "Kurgu Çocuk İkinci");

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openStudentActions(page, childName);
  await page.locator("details.simple-classroom__operations").getByRole("button", { name: `${childName} öğrencisini sil`, exact: true }).click();
  await page.getByRole("dialog", { name: "Öğrenciyi sil", exact: true })
    .getByRole("button", { name: "Sil ve geri alınabilir arşive taşı", exact: true }).click();
  await openArchivedStudents(page);
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openArchivedStudents(page);
  await page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` }).click();
  await expect(studentProfileButton(page, childName)).toBeVisible();
  await expect(
    page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` }),
  ).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openStudentActions(page, childName);
  await expect(page.locator("details.simple-classroom__operations").getByRole("button", { name: `${childName} öğrencisini sil`, exact: true })).toBeVisible();
});

test("cihaz verisi kalıcıdır; yedek doğrulanır ve replace geri yükleme veri kaybını önler", async ({
  page,
}, testInfo) => {
  // Şifreleme, replace restore, gözlem/yoklama mutabakatı ve son reload tek
  // çok-aşamalı dayanıklılık kanıtıdır. Doğruluk süresine headroom verilir;
  // iki testlik dilimin 120 sn performans bütçesi runner'da ayrıca korunur.
  test.slow();
  const childName = "Ada Kurgu";
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(
    page.getByRole("heading", { name: "Şifreli yedek ve geri yükle" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Google ile giriş/ })).toBeDisabled();

  const backupPassphrase = "Kurgu-Yedek-2026!";
  await page.locator("#backup-password").fill(backupPassphrase);
  await page.getByLabel("Parolayı doğrula").fill(backupPassphrase);
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Şifreli yedek oluştur/ }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error(`Playwright yedek dosya yolunu oluşturamadı: ${testInfo.title}`);
  const envelope = JSON.parse(await readFile(backupPath, "utf8"));
  expect(envelope.encryption.format).toBe("maarifos-encrypted-json");
  expect(envelope.encryption.algorithm).toBe("AES-256-GCM");
  // Bu küçük kurgu yedeği 3 MiB parçalara ayırma eşiğinin altında kalır.
  // Küçük yedekte v1 uyumluluğu; büyük yedekte v2 ayrı kapasite testindedir.
  expect(envelope.encryption.version).toBe(1);
  expect(envelope.ciphertext).toEqual(expect.any(String));
  expect(envelope.ciphertext.length).toBeGreaterThan(0);
  expect(envelope.chunks).toBeUndefined();
  expect(await readFile(backupPath, "utf8")).not.toContain(childName);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await createD1Observation(
    page,
    "Kurgu test gözlemi; yedek geri yükleme sonrasında kaldırılmalı.",
  );
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expectStudentObservationCount(page, childName, 1);

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath);
  await expect(
    page.getByText("Şifreli yedek tanındı. İçeriği doğrulamak için parolayı girin."),
  ).toBeVisible();
  await page.locator("#restore-password").fill(backupPassphrase);
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
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expectStudentObservationCount(page, childName, 0);

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await openAttendance(page);
  const attendanceStudent = page.getByRole("group", { name: `${childName} yoklama`, exact: true });
  await attendanceStudent.getByRole("button", { name: `${childName} Geldi`, exact: true }).click();
  await attendanceStudent.getByRole("button", { name: `${childName} Geç Geldi`, exact: true }).click();
  await expect(page.getByRole("button", { name: "Son değişikliği geri al" })).toBeVisible();
  await page.getByRole("button", { name: "Son değişikliği geri al" }).click();
  await expect(attendanceStudent.getByRole("button", { name: `${childName} Geldi`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await attendanceStudent.getByRole("button", { name: `${childName} Geç Geldi`, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await expect(page.locator(".sr-live")).toContainText("Yoklama tamamlandı.");
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await openAttendance(page);
  await expect(page.getByRole("button", { name: `${childName} Geç Geldi`, exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("bozuk yedek mevcut veriye dokunmadan Türkçe hata verir", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
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
  await expect(page.getByTestId("today-screen")).toBeVisible();
});

test("ikinci sekmedeki gözlem eski devam durumunu geri ezmez", async ({ context, page }) => {
  const childName = "Çift Sekme Çocuğu";
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();

  const stalePage = await context.newPage();
  await stalePage.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(stalePage);
  await openAttendance(stalePage);
  await expect(stalePage.getByRole("group", { name: `${childName} yoklama`, exact: true }).locator("[aria-pressed=true]")).toHaveCount(0);

  await openAttendance(page);
  const activeStudent = page.getByRole("group", { name: `${childName} yoklama`, exact: true });
  await activeStudent.getByRole("button", { name: `${childName} Geldi`, exact: true }).click();
  await activeStudent.getByRole("button", { name: `${childName} Geç Geldi`, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await expect(page.locator(".sr-live")).toContainText("Yoklama tamamlandı.");

  await stalePage.keyboard.press("Escape");
  await createD1Observation(stalePage, "İkinci sekmeden kurgu gözlem.");
  await stalePage.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expectStudentObservationCount(stalePage, childName, 1);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await openAttendance(page);
  await expect(page.getByRole("button", { name: `${childName} Geç Geldi`, exact: true })).toHaveAttribute("aria-pressed", "true");
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

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  const childrenRail = classroomList(page);
  await expect(childrenRail).toBeVisible();
  await studentProfileButton(page, childName).click();

  const profileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await expect(profileDialog).toBeVisible();
  await openProfileDetails(profileDialog);
  await profileDialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await profileDialog.getByLabel(/Tercih edilen ad/i).fill(preferredName);
  await profileDialog.getByLabel(/Doğum tarihi/i).fill(birthDate);
  await profileDialog
    .getByLabel(/Öğrenci numarası|İsteğe bağlı kod|Sınıf içi kod/i)
    .fill(optionalCode);
  await profileDialog.getByLabel(/Evde kullanılan diller/i).fill(homeLanguages);
  await profileDialog.getByLabel(/İlgi ve merak alanları/i).fill(interests);
  await profileDialog
    .getByRole("button", { name: /Profili kaydet|Bilgileri kaydet/i })
    .click();
  await expect(profileDialog).toBeHidden();

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await studentProfileButton(page, preferredName).click();

  const reloadedProfileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await openProfileDetails(reloadedProfileDialog);
  await reloadedProfileDialog
    .getByRole("button", { name: "Bilgiler", exact: true })
    .click();
  await expect(reloadedProfileDialog.getByLabel(/Tercih edilen ad/i)).toHaveValue(preferredName);
  await expect(reloadedProfileDialog.getByLabel(/Doğum tarihi/i)).toHaveValue(birthDate);
  await expect(
    reloadedProfileDialog.getByLabel(
      /Öğrenci numarası|İsteğe bağlı kod|Sınıf içi kod/i,
    ),
  ).toHaveValue(optionalCode);
  await expect(
    reloadedProfileDialog.getByLabel(/Evde kullanılan diller/i),
  ).toHaveValue(homeLanguages);
  await expect(
    reloadedProfileDialog.getByLabel(/İlgi ve merak alanları/i),
  ).toHaveValue(interests);
  await page.keyboard.press("Escape");
  await expect(reloadedProfileDialog).toBeHidden();

  await studentObservationButton(page, preferredName).click();

  await expect(page.getByRole("heading", { name: "Hızlı Gözlem", exact: true })).toBeVisible();
  await expect(page.locator(".quick-selected-child")).toContainText(childName);
  await expect(page.getByRole("button", { name: "Çocuğu değiştir", exact: true })).toBeVisible();

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
  await expectQuickObservationSaved(page);

  await studentProfileButton(page, preferredName).click();
  await expect(page.getByRole("region", { name: "Gelişim kayıtları" }).getByText("1 gözlem", { exact: true })).toBeVisible();
});

test("profil fotoğrafı, yakın iletişimi, sınırsız gözlem arşivi ve güvenli metin aktarımı birlikte çalışır", async ({
  page,
}, testInfo) => {
  const childName = `Arşiv İletişim ${testInfo.workerIndex + 1}`;
  const longObservation = `Uzun gözlem başlangıcı. ${"Ayrıntılı ve kesilmemiş gözlem cümlesi. ".repeat(90)}Uzun gözlem sonu.`;

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await createD1Observation(page, longObservation);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await studentProfileButton(page, childName).click();
  const profile = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(profile).toBeVisible();
  await expect(profile.getByRole("region", { name: "Gelişim kayıtları" })).toBeVisible();
  await expect(profile.getByRole("button", { name: "Metin indir" })).toHaveCount(0);
  await openProfileDetails(profile);
  await expect(profile.locator(".student-observation-archive").getByText("Uzun gözlem sonu.", { exact: false })).toBeVisible();
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
  await expect(primaryPhoneInput).toHaveAttribute(
    "placeholder",
    "05xx xxx xx xx",
  );
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

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  await studentProfileButton(page, childName).click();
  const reloadedProfile = page.getByRole("dialog", { name: `${childName} profili` });
  await openProfileDetails(reloadedProfile);
  await expect(reloadedProfile.getByAltText(`${childName} profil fotoğrafı`)).toBeVisible();
  await expect(reloadedProfile.locator(".student-observation-archive").getByText("Uzun gözlem sonu.", { exact: false })).toBeVisible();
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  for (const childName of childNames) {
    await addChild(page, childName);
  }

  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  for (const childName of childNames) {
    await studentObservationButton(page, childName).click();
    await expect(page.locator(".quick-selected-child")).toContainText(childName);
    await expect(page.getByRole("button", { name: "Çocuğu değiştir", exact: true })).toBeVisible();
    await page
      .getByLabel("Ne oldu?")
      .fill(`${childName} blok oyununda bir parça seçerek ortak yapıyı sürdürdü.`);
    await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
    await expectQuickObservationSaved(page);
    await expect(
      classroomList(page),
    ).toBeVisible();
  }

  for (const childName of childNames) {
    await expectStudentObservationCount(page, childName, 1);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);
  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  for (const childName of childNames) {
    await expectStudentObservationCount(page, childName, 1);
  }
});

test("Öğretmenin plan ve belge iş alanları ana navigasyondan erişilir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureClassroomConfigured(page);

  await expect(page.getByRole("button", { name: "Planlar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Belgeler", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gözlem", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(page.getByRole("main", { name: "Planlar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Günlük eğitim planı/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Okul etkinliği ekle/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Gelişmiş plan desteğini aç/ }).click();
  await expect(page.getByRole("button", { name: /Okul etkinliği ekle/ })).toBeVisible();

  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(page.getByRole("main", { name: "Belgeler" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Sınıf listesi\. Durum:/u }),
  ).toBeVisible();
  const documentUsePolicy = page.locator("details.simple-document-use-policy");
  await expect(documentUsePolicy).toBeVisible();
  await expect(documentUsePolicy).not.toHaveAttribute("open", "");
  await documentUsePolicy.locator("summary").click();
  await expect(documentUsePolicy).toContainText("Ders öncesi");
  await expect(documentUsePolicy).toContainText("Telefon zorunlu değildir");
  await expect(documentUsePolicy).toContainText("Ders sonrası");
  await expect(documentUsePolicy).toContainText("yalnız okulun güncel yetkili kanalını kullanın");

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /Gelişmiş plan desteğini aç/ }).click();
  await page.getByRole("button", { name: /Oyun ve materyaller/ }).click();
  await expect(
    page.getByRole("main", { name: "Etkinlik ve Materyal Stüdyosu" }),
  ).toBeVisible();
});
