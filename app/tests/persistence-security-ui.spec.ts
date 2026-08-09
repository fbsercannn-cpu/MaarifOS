import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Sınıf adı").fill("Güvenli Kurgu Sınıfı");
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup
    .getByRole("button", {
      name: "Sınıfı ve çalışma düzenini kaydet",
    })
    .click();
  await expect(setup).toBeHidden();
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByRole("button", { name: `${name} için diğer işlemler` }).click();
  await expect(
    page.getByRole("button", { name: `${name} çocuğunu sınıftan ayır` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

test("sınıf kurulumu pedagojik bağlamı sessizce tahmin etmez", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  const save = setup.getByRole("button", {
    name: "Sınıfı ve çalışma düzenini kaydet",
  });

  await expect(setup.getByLabel("Yaş grubu")).toHaveValue("");
  await expect(setup.getByLabel("Çalışma düzeni")).toHaveValue("");
  await expect(setup.getByLabel("Uygulanan program")).toHaveValue("");
  await expect(setup.getByLabel("Başlangıç", { exact: true })).toHaveValue("");
  await expect(setup.getByLabel("Bitiş", { exact: true })).toHaveValue("");
  await setup.getByLabel("Sınıf adı").fill("Açık Seçim Sınıfı");
  await expect(save).toBeDisabled();

  await setup.getByLabel("Yaş grubu").selectOption({ label: "48–60 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("afternoon");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await expect(setup.getByLabel("Başlangıç", { exact: true })).toHaveValue("13:00");
  await expect(setup.getByLabel("Bitiş", { exact: true })).toHaveValue("17:00");
  await expect(save).toBeEnabled();
});

test("IndexedDB yazma hatasında yoklama geri alınır ve yeni yazmalar fail-closed durur", async ({
  page,
}) => {
  const childName = "Rollback Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  await page.getByRole("button", { name: /Bugünkü devam/ }).click();
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
  await expect(
    page.getByTestId("persistence-status"),
  ).toContainText("Kayıt durdu");

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
  await page.getByRole("button", { name: /Bugünkü devam/ }).click();
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
  await expect(page.getByTestId("persistence-status")).not.toContainText("Kayıt durdu");
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

  const captureTrigger = page.getByRole("button", {
    name: "Kayıt ekle",
    exact: true,
  });
  await captureTrigger.click();
  const captureMenu = page.getByRole("dialog", { name: "Ne ekleyelim?" });
  const observationTrigger = captureMenu.getByRole("button", {
    name: /Gözlem yaz/,
  });
  await observationTrigger.click();

  const studentRegion = page.getByRole("region", {
    name: "Gözlem yapılacak çocuk",
  });
  await studentRegion
    .getByRole("button", { name: new RegExp(firstChild) })
    .click();
  await page.getByLabel("Ne oldu?").fill(draftText);
  await studentRegion
    .getByRole("button", { name: new RegExp(secondChild) })
    .click();
  await studentRegion
    .getByRole("button", { name: new RegExp(firstChild) })
    .click();
  await expect(page.getByLabel("Ne oldu?")).toHaveValue(draftText);

  await page.keyboard.press("Escape");
  await expect(captureMenu).toBeVisible();
  await expect(observationTrigger).toBeFocused();

  await observationTrigger.click();
  await studentRegion
    .getByRole("button", { name: new RegExp(firstChild) })
    .click();
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

test("Ana menü plan ve belge merkezlerini kalıcı gösterir, AI vaatlerini açmaz", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  const navigation = page.getByRole("navigation", { name: "Ana menü" });
  await expect(navigation.getByRole("button", { name: "Bugün", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Sınıfım", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Kayıt ekle", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Planlar", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Belgeler", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Belgeler" })).toHaveCount(0);
});
