import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Güvenli Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Güvenli Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Güvenli Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" })
    .locator("summary")
    .click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(name);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

test("sınıf kurulumu dört açık bilgiyi ister ve güvenli çalışma varsayılanını gösterir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup.getByLabel("Okul adı")).toHaveValue("");
  await expect(setup.getByLabel("Öğretmen adı soyadı")).toHaveValue("");
  await expect(setup.getByLabel("Sınıf adı")).toHaveValue("");
  await expect(setup.getByLabel("Maarif Modeli yaş grubu", { exact: true })).toHaveValue("");
  const advancedSettings = setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" });
  await expect(advancedSettings).not.toHaveAttribute("open", "");
  const save = setup.getByRole("button", { name: "Sınıfımı hazırla" });
  await expect(save).toBeDisabled();
  await setup.getByLabel("Okul adı").fill("Açık Seçim Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Açık Seçim Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Açık Seçim Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "48–60 ay" });
  await advancedSettings.locator("summary").click();
  await expect(setup.getByLabel("Çalışma düzeni", { exact: true })).toHaveValue("full_day");
  await expect(setup.getByLabel("Başlangıç", { exact: true })).toHaveValue("08:30");
  await expect(setup.getByLabel("Bitiş", { exact: true })).toHaveValue("16:30");
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("afternoon");
  await expect(setup.getByLabel("Başlangıç", { exact: true })).toHaveValue("13:00");
  await expect(setup.getByLabel("Bitiş", { exact: true })).toHaveValue("17:00");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(setup).toBeHidden();
});

test("IndexedDB yazma hatasında yoklama geri alınır ve yeni yazmalar fail-closed durur", async ({
  page,
}) => {
  const childName = "Rollback Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Bugünün yoklaması" }).click();
  const student = page.locator("button.student-row").filter({ hasText: childName });
  await expect(student.getByText("İşaretlenmedi", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalIdbPut?: typeof IDBObjectStore.prototype.put;
    };
    testWindow.__maarifOriginalIdbPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function forcedWriteFailure() {
      throw new DOMException("Kurgu yazma hatası", "UnknownError");
    };
  });
  await student.click();

  const gate = page.getByRole("dialog", {
    name: "Yeni kayıtlar güvenlik için durduruldu",
  });
  await expect(gate).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalIdbPut?: typeof IDBObjectStore.prototype.put;
    };
    if (testWindow.__maarifOriginalIdbPut) {
      IDBObjectStore.prototype.put = testWindow.__maarifOriginalIdbPut;
      delete testWindow.__maarifOriginalIdbPut;
    }
  });
  await gate
    .getByRole("button", { name: "Cihaz verilerine yeniden bağlan" })
    .click();
  await expect(gate).toBeHidden();
  await expect(student.getByText("İşaretlenmedi", { exact: true })).toBeVisible();
});

test("alan doğrulama hatası yazma kanalını küresel olarak kilitlemez", async ({
  page,
}) => {
  const childName = "Doğrulama Kurgu Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Bugünün yoklaması" }).click();
  const student = page.locator("button.student-row").filter({ hasText: childName });
  await expect(student.getByText("İşaretlenmedi", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalIdbPut?: typeof IDBObjectStore.prototype.put;
    };
    testWindow.__maarifOriginalIdbPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function forcedValidationFailure() {
      throw new DOMException("Kurgu alan doğrulama hatası", "DataError");
    };
  });
  await student.click();

  await expect(
    page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" }),
  ).toBeHidden();
  await expect(student.getByText("İşaretlenmedi", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalIdbPut?: typeof IDBObjectStore.prototype.put;
    };
    if (testWindow.__maarifOriginalIdbPut) {
      IDBObjectStore.prototype.put = testWindow.__maarifOriginalIdbPut;
      delete testWindow.__maarifOriginalIdbPut;
    }
  });
  await student.click();
  await expect(student.getByText("Geldi", { exact: true })).toBeVisible();
});

test("gözlem taslağı Escape ve çocuk değişiminden önce flush edilir; odak geri döner", async ({
  page,
}) => {
  const firstChild = "Taslak Bir";
  const secondChild = "Taslak İki";
  const draftText = "Bloklarla iki köprü kurdu ve arkadaşına sırasını anlattı.";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, firstChild);
  await addChild(page, secondChild);

  await page.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  const applyTrigger = page
    .getByRole("button", { name: /etkinliğini Çocuk Modunda uygula/ })
    .first();
  await applyTrigger.click();
  const observationTrigger = page.getByRole("button", {
    name: "Bu etkinlik için gözlem yaz",
    exact: true,
  });
  await observationTrigger.click();

  const studentRegion = page.getByRole("region", {
    name: "Gözlem yapılacak çocuk",
  });
  const chooseStudent = async (name: string) => {
    const trigger = studentRegion.getByRole("button", { name: new RegExp(name) });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#quick-save-readiness")).not.toContainText(
      "Taslak yükleniyor.",
    );
  };
  await chooseStudent(firstChild);
  await page.getByLabel("Ne oldu?").fill(draftText);
  await expect(page.getByLabel("Ne oldu?")).toHaveValue(draftText);
  await chooseStudent(secondChild);
  await chooseStudent(firstChild);
  await expect(page.getByLabel("Ne oldu?")).toHaveValue(draftText);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Etkinlik ve Materyal Stüdyosu" })).toBeVisible();
  await expect(applyTrigger).toBeFocused();

  await applyTrigger.click();
  await page
    .getByRole("button", { name: "Bu etkinlik için gözlem yaz", exact: true })
    .click();
  await chooseStudent(firstChild);
  await expect(page.getByLabel("Ne oldu?")).toHaveValue(draftText);
});

test("uygulama kilidi oturum parolasını saklamadan erişilebilir modal olarak çalışır", async ({
  page,
}) => {
  const pin = "246810";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("Uygulama PIN’i").fill(pin);
  await page.getByLabel("PIN’i doğrula").fill(pin);
  await page
    .getByRole("button", { name: "Uygulama kilidini etkinleştir" })
    .click();
  await expect(page.getByText("Uygulama kilidi bu cihazda etkinleştirildi.")).toBeVisible();
  await page.getByRole("button", { name: "Şimdi kilitle" }).click();

  const lockGate = page.getByRole("dialog", { name: "MaarifOS kilitli" });
  await expect(lockGate).toBeVisible();
  await expect(
    page.getByRole("main", { name: "MaarifOS Bugün ekranı" }),
  ).toHaveCount(0);
  await lockGate.getByLabel("Uygulama PIN’i").fill(pin);
  await lockGate.getByRole("button", { name: "Kilidi aç" }).click();
  await expect(lockGate).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await expect(lockGate).toBeVisible();
  await lockGate.getByLabel("Uygulama PIN’i").fill(pin);
  await lockGate.getByRole("button", { name: "Kilidi aç" }).click();
  await expect(lockGate).toBeHidden();
});

test("Ana menü etkinlik, plan ve çıktı merkezlerini kalıcı gösterir, AI vaatlerini açmaz", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  const navigation = page.getByRole("navigation", { name: "Ana menü" });
  await expect(navigation.getByRole("button", { name: "Bugün", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Sınıfım", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Etkinlikler", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Planlar", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Çıktılar", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Çıktılar" })).toHaveCount(0);
});
