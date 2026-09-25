import { expect, test, type Page } from "@playwright/test";
import { installCivilClock } from "./helpers/development-workspace-ui";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => { await installCivilClock(page); });

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
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  const startYear = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  if (await startYear.isVisible()) {
    await startYear.click();
    await expect(startYear).toBeHidden();
  }
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(name);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await expect(addStudent).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

async function openClassroomOperations(page: Page) {
  const classroom = page.getByRole("main", { name: "Sınıfım" });
  if (!(await classroom.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await expect(classroom).toBeVisible();

  const operations = classroom.locator("details.simple-classroom__operations");
  if ((await operations.getAttribute("open")) === null) {
    await operations.locator(":scope > summary").click();
  }
  await expect(operations).toHaveAttribute("open", "");
  return operations;
}

async function openAttendance(page: Page) {
  const operations = await openClassroomOperations(page);
  await operations
    .getByRole("button", { name: /^Bugünün yoklaması/u })
    .click();
  const attendance = page.getByRole("dialog", {
    name: "Hızlı Dokunmatik Yoklama (E5)",
  });
  await expect(attendance).toBeVisible();
  return attendance;
}

type EncryptedBackupFixture = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

async function createEncryptedBackupFile(
  page: Page,
  passphrase: string,
): Promise<EncryptedBackupFixture> {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const settings = page.getByRole("dialog", {
    name: "Hesap ve veri güvenliği",
  });
  await settings.locator("#backup-password").fill(passphrase);
  await settings.getByLabel("Parolayı doğrula").fill(passphrase);
  const downloadPromise = page.waitForEvent("download");
  await settings
    .getByRole("button", { name: /Şifreli yedek oluştur/ })
    .click();
  const backupDownload = await downloadPromise;
  const source = await backupDownload.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of source) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    name: backupDownload.suggestedFilename(),
    mimeType: "application/json",
    buffer: Buffer.concat(chunks),
  };
}

async function openMissingKeyRecoveryGate(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(
        "maarifos-local--maarifos-student-sensitive-keys",
      );
      request.addEventListener("success", () => resolve(), { once: true });
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("Kurgu anahtar silme hatası")),
        { once: true },
      );
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  const gate = page.getByRole("dialog", {
    name: "Yeni kayıtlar güvenlik için durduruldu",
  });
  await expect(gate).toBeVisible();
  return gate;
}

async function verifyRecoveryBackup(
  page: Page,
  backupFile: EncryptedBackupFixture,
  passphrase: string,
) {
  const gate = page.getByRole("dialog", {
    name: "Yeni kayıtlar güvenlik için durduruldu",
  });
  await gate
    .getByLabel("Kasa kurtarma için şifreli MaarifOS yedeği seç")
    .setInputFiles(backupFile);
  await gate.getByLabel("Yedek parolası", { exact: true }).fill(passphrase);
  await gate
    .getByRole("button", { name: "Yedeği bellekte aç ve doğrula" })
    .click();
  await expect(gate.getByText(/Yedek doğrulandı/)).toBeVisible();
  await expect(gate.getByLabel("Yedek parolasını yeniden girin")).toBeFocused();
  return gate;
}

test("sınıf kurulumu dört açık bilgiyi ister ve güvenli çalışma varsayılanını gösterir", async ({
  page,
}) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
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
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  await openAttendance(page);
  const student = page.getByRole("button", { name: `${childName} Geldi`, exact: true });
  await expect(student).toHaveAttribute("aria-pressed", "false");

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
  await expect(student).toHaveAttribute("aria-pressed", "false");
});

test("alan doğrulama hatası yazma kanalını küresel olarak kilitlemez", async ({
  page,
}) => {
  const childName = "Doğrulama Kurgu Çocuğu";
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  await openAttendance(page);
  const student = page.getByRole("button", { name: `${childName} Geldi`, exact: true });
  await expect(student).toHaveAttribute("aria-pressed", "false");

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
  await expect(student).toHaveAttribute("aria-pressed", "false");

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
  await expect(student).toHaveAttribute("aria-pressed", "true");
});

test("gözlem taslağı Escape ve çocuk değişiminden önce flush edilir; odak geri döner", async ({
  page,
}) => {
  const firstChild = "Taslak Bir";
  const secondChild = "Taslak İki";
  const draftText = "Bloklarla iki köprü kurdu ve arkadaşına sırasını anlattı.";
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, firstChild);
  await addChild(page, secondChild);

  await page.getByRole("navigation", { name: "Ana menü", exact: true })
    .getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /Gelişmiş plan desteğini aç/u }).click();
  await page.getByRole("button", { name: /^Oyun ve materyaller/u }).click();
  const activity = page.locator("article.activity-card").first();
  const activityTitle = (await activity.getByRole("heading").textContent())?.trim() ?? "";
  expect(activityTitle).not.toBe("");
  await activity.getByRole("button", { name: /rehberini aç$/u }).click();
  const guide = page.locator("main.activity-teacher-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await guide.locator("summary").filter({ hasText: "Program bağlantısı ve araçlar" }).click();
  const applyTrigger = guide.getByRole("button", { name: /etkinliğini Çocuk Modunda uygula$/u });
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
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await expect(guide.getByRole("button", { name: "Çocuğa gözlem ekle", exact: true })).toBeFocused();
  await expect(guide.locator("details.activity-teacher-guide__details")).toHaveAttribute("open", "");

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
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
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

test("Ana menü kayıt, plan ve belge merkezlerini kalıcı gösterir, AI vaatlerini açmaz", async ({
  page,
}) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  const navigation = page.getByRole("navigation", { name: "Ana menü" });
  await expect(navigation.getByRole("button", { name: "Bugün", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Sınıfım", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Gözlem", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Planlar", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Belgeler", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Belgeler" })).toHaveCount(0);
});

test("doğrulanmış IndexedDB hydration açık metin legacy v1 gölgesini kaldırır", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "maarifos-akis-pusulasi-v1",
      JSON.stringify({
        students: [
          {
            id: "legacy-browser-student",
            name: "Tarayıcı Kurgu Öğrencisi",
            status: "present",
          },
        ],
        observations: [],
        attendanceCompleted: false,
      }),
    );
  });
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await expect(page.getByTestId("persistence-gate")).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("maarifos-akis-pusulasi-v1"),
      ),
    )
    .toBeNull();
});

test("tüm verileri sil ana DB, kasa anahtarı, vault state ve legacy v1 gölgesini kriptografik olarak yeniler", async ({
  page,
}) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  const originalInstanceId = await page.evaluate(async () => {
    const readRequest = <T,>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Kurgu IDB okuma hatası")),
          { once: true },
        );
      });
    const database = await readRequest(
      indexedDB.open("maarifos-local--maarifos-student-sensitive-keys"),
    );
    const transaction = database.transaction("metadata", "readonly");
    const metadata = await readRequest<Record<string, unknown> | undefined>(
      transaction.objectStore("metadata").get("database-instance-v2"),
    );
    database.close();
    localStorage.setItem(
      "maarifos-akis-pusulasi-v1",
      JSON.stringify({ students: [{ name: "Silinecek Kurgu PII" }] }),
    );
    return String(metadata?.databaseInstanceId ?? "");
  });
  expect(originalInstanceId).not.toBe("");

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const advanced = page
    .getByRole("dialog", { name: "Hesap ve veri güvenliği" })
    .locator("details")
    .filter({ hasText: "Gelişmiş cihaz işlemleri" });
  await advanced.locator("summary").click();
  await advanced.getByLabel("Tüm verileri silme onayı").fill("TÜM VERİLERİ SİL");
  await Promise.all([
    page.waitForEvent("framenavigated"),
    advanced
      .getByRole("button", {
        name: "Bu cihazdaki tüm verileri kalıcı sil",
      })
      .click(),
  ]);
  await expect(
    page.getByRole("dialog", { name: "Sınıfını hazırla" }),
  ).toBeVisible();
  await expect(page.getByTestId("persistence-gate")).toBeHidden();

  const resetState = await page.evaluate(async () => {
    const readRequest = <T,>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Kurgu IDB okuma hatası")),
          { once: true },
        );
      });
    const keyDatabase = await readRequest(
      indexedDB.open("maarifos-local--maarifos-student-sensitive-keys"),
    );
    const keyTransaction = keyDatabase.transaction("metadata", "readonly");
    const metadata = await readRequest<Record<string, unknown> | undefined>(
      keyTransaction.objectStore("metadata").get("database-instance-v2"),
    );
    keyDatabase.close();
    const mainDatabase = await readRequest(indexedDB.open("maarifos-local"));
    const mainTransaction = mainDatabase.transaction(
      ["students", "__maarifosRecoverySnapshots", "__maarifosVaultState"],
      "readonly",
    );
    const [students, recovery, vaultState] = await Promise.all([
      readRequest(mainTransaction.objectStore("students").getAll()),
      readRequest(
        mainTransaction.objectStore("__maarifosRecoverySnapshots").getAll(),
      ),
      readRequest(mainTransaction.objectStore("__maarifosVaultState").getAll()),
    ]);
    mainDatabase.close();
    return {
      instanceId: String(metadata?.databaseInstanceId ?? ""),
      studentCount: students.length,
      recoveryCount: recovery.length,
      vaultStateIds: vaultState
        .map((record) => String((record as { id?: unknown }).id ?? ""))
        .sort(),
      legacy: localStorage.getItem("maarifos-akis-pusulasi-v1"),
    };
  });
  expect(resetState.instanceId).not.toBe("");
  expect(resetState.instanceId).not.toBe(originalInstanceId);
  expect(resetState.studentCount).toBe(0);
  expect(resetState.recoveryCount).toBe(0);
  expect(resetState.vaultStateIds).toEqual([
    "all-collections-v2",
    "students-v2",
  ]);
  expect(resetState.legacy).toBeNull();
});

test("kayıp kasa anahtarı yalnız doğrulanmış şifreli yedek ve açık onayla replace kurtarılır", async ({
  page,
}) => {
  const passphrase = "Kurgu-Kasa-Kurtarma-2026!";
  const backupFile = await createEncryptedBackupFile(page, passphrase);
  const gate = await openMissingKeyRecoveryGate(page);
  await expect(gate.getByRole("heading", { name: "Şifreli yedekten kurtar" })).toBeVisible();
  await gate
    .getByLabel("Kasa kurtarma için şifreli MaarifOS yedeği seç")
    .setInputFiles({
      name: "duz-metin-yedek.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ payload: "şifreli-değil" })),
    });
  await expect(
    gate.getByText(/Yalnız en fazla 96 MiB boyutunda, parola korumalı/),
  ).toBeVisible();
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some(
        (database) => database.name === "maarifos-local",
      ),
    ),
  ).toBe(true);
  await gate
    .getByLabel("Kasa kurtarma için şifreli MaarifOS yedeği seç")
    .setInputFiles(backupFile);
  await gate.getByLabel("Yedek parolası", { exact: true }).fill(passphrase);
  await gate
    .getByRole("button", { name: "Yedeği bellekte aç ve doğrula" })
    .click();
  await expect(gate.getByText(/Yedek doğrulandı/)).toBeVisible();
  await expect(gate.getByLabel("Yedek parolasını yeniden girin")).toHaveValue("");
  await gate.getByLabel("Yedek parolasını yeniden girin").fill(passphrase);
  await gate
    .getByLabel("Onaylamak için KASAYI GERİ YÜKLE yazın")
    .fill("KASAYI GERİ YÜKLE");
  await Promise.all([
    page.waitForEvent("framenavigated"),
    gate
      .getByRole("button", {
        name: "Kasayı sil, yeniden kur ve yedeği yükle",
      })
      .click(),
  ]);
  await expect(page.getByTestId("persistence-gate")).toBeHidden();
  await expect(
    page.getByTestId("today-screen"),
  ).toBeVisible();
});

test("blocked kriptografik silme hiçbir legacy gölgeyi erken kaldırmaz ve yazmayı fail-closed tutar", async ({
  page,
}) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.evaluate(async () => {
    const testWindow = window as Window & {
      __maarifEraseBlocker?: IDBDatabase;
    };
    testWindow.__maarifEraseBlocker = await new Promise<IDBDatabase>(
      (resolve, reject) => {
        const request = indexedDB.open("maarifos-local");
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Kurgu blocker açılamadı")),
          { once: true },
        );
      },
    );
    localStorage.setItem(
      "maarifos-akis-pusulasi-v1",
      JSON.stringify({ students: [{ name: "Blocked Silme Kurgu PII" }] }),
    );
  });

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const advanced = page
    .getByRole("dialog", { name: "Hesap ve veri güvenliği" })
    .locator("details")
    .filter({ hasText: "Gelişmiş cihaz işlemleri" });
  await advanced.locator("summary").click();
  await advanced.getByLabel("Tüm verileri silme onayı").fill("TÜM VERİLERİ SİL");
  await advanced
    .getByRole("button", { name: "Bu cihazdaki tüm verileri kalıcı sil" })
    .click();

  const gate = page.getByRole("dialog", {
    name: "Yeni kayıtlar güvenlik için durduruldu",
  });
  await expect(gate).toBeVisible();
  await expect(gate).toContainText("tamamı silinemedi", { timeout: 12_000 });
  await expect(
    gate.getByRole("button", { name: "Cihaz verilerine yeniden bağlan" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("maarifos-akis-pusulasi-v1"),
    ),
  ).not.toBeNull();

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifEraseBlocker?: IDBDatabase;
    };
    testWindow.__maarifEraseBlocker?.close();
    delete testWindow.__maarifEraseBlocker;
  });
});

test("silme sonrası restore yazma hatası kapıyı açık tutar ve aynı receipt ile güvenli yeniden deneme yapılır", async ({
  page,
}) => {
  const passphrase = "Kurgu-Restore-Yeniden-2026!";
  const backupFile = await createEncryptedBackupFile(page, passphrase);
  await openMissingKeyRecoveryGate(page);
  const gate = await verifyRecoveryBackup(page, backupFile, passphrase);
  await gate.getByLabel("Yedek parolasını yeniden girin").fill(passphrase);
  await gate
    .getByLabel("Onaylamak için KASAYI GERİ YÜKLE yazın")
    .fill("KASAYI GERİ YÜKLE");

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalRestorePut?: typeof IDBObjectStore.prototype.put;
    };
    testWindow.__maarifOriginalRestorePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function forcedRestoreWriteFailure() {
      throw new DOMException("Kurgu restore yazma hatası", "UnknownError");
    };
  });
  await gate
    .getByRole("button", { name: "Kasayı sil, yeniden kur ve yedeği yükle" })
    .click();

  await expect(gate).toBeVisible();
  await expect(gate.getByText(/Kurtarma tamamlanamadı/)).toBeVisible();
  await expect(gate.getByText(/Yedek doğrulandı/)).toBeVisible();
  await expect(gate.getByLabel("Yedek parolasını yeniden girin")).toHaveValue("");
  await expect(
    gate.getByLabel("Onaylamak için KASAYI GERİ YÜKLE yazın"),
  ).toHaveValue("");
  await expect(
    gate.getByRole("button", { name: "Kasayı sil, yeniden kur ve yedeği yükle" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("maarifos-local");
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Kurgu DB açılamadı")),
          { once: true },
        );
      });
      const studentCount = await new Promise<number>((resolve, reject) => {
        const request = database
          .transaction("students", "readonly")
          .objectStore("students")
          .count();
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Kurgu count alınamadı")),
          { once: true },
        );
      });
      database.close();
      return studentCount;
    }),
  ).toBe(0);

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __maarifOriginalRestorePut?: typeof IDBObjectStore.prototype.put;
    };
    if (testWindow.__maarifOriginalRestorePut) {
      IDBObjectStore.prototype.put = testWindow.__maarifOriginalRestorePut;
      delete testWindow.__maarifOriginalRestorePut;
    }
  });
  await gate.getByLabel("Yedek parolasını yeniden girin").fill(passphrase);
  await gate
    .getByLabel("Onaylamak için KASAYI GERİ YÜKLE yazın")
    .fill("KASAYI GERİ YÜKLE");
  await Promise.all([
    page.waitForEvent("framenavigated"),
    gate
      .getByRole("button", { name: "Kasayı sil, yeniden kur ve yedeği yükle" })
      .click(),
  ]);
  await expect(page.getByTestId("persistence-gate")).toBeHidden();
});

test("kurtarma kapısı 320 px'de taşmaz, görünmez input odağı almaz ve yedeksiz reset açık onay ister", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  const gate = await openMissingKeyRecoveryGate(page);
  const fileButton = gate.getByRole("button", {
    name: "Şifreli .maarifos yedeği seç",
  });
  const fileInput = gate.getByLabel(
    "Kasa kurtarma için şifreli MaarifOS yedeği seç",
  );
  const resetDetails = gate
    .locator("details")
    .filter({ hasText: "Şifreli yedeğim yok" });
  const resetSummary = resetDetails.locator("summary");

  await expect(fileButton).toBeFocused();
  await expect(fileInput).toBeHidden();
  await expect(fileInput).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("Tab");
  await expect(resetSummary).toBeFocused();
  await fileInput.setInputFiles({
    name: "gecersiz-kurtarma.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ encrypted: false })),
  });
  await expect(fileButton).toBeFocused();
  await resetSummary.focus();
  await fileInput.dispatchEvent("cancel");
  await expect(fileButton).toBeFocused();

  const reflow = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".persistence-gate-card");
    const targets = [
      ...document.querySelectorAll<HTMLElement>(
        ".vault-recovery-shell button, .vault-recovery-shell summary",
      ),
    ].filter((target) => target.getClientRects().length > 0);
    const rectangle = card?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      cardLeft: rectangle?.left ?? -1,
      cardRight: rectangle?.right ?? window.innerWidth + 1,
      minimumTargetHeight: Math.min(
        ...targets.map((target) => target.getBoundingClientRect().height),
      ),
    };
  });
  expect(reflow.documentWidth).toBeLessThanOrEqual(reflow.viewportWidth);
  expect(reflow.cardLeft).toBeGreaterThanOrEqual(0);
  expect(reflow.cardRight).toBeLessThanOrEqual(reflow.viewportWidth);
  expect(reflow.minimumTargetHeight).toBeGreaterThanOrEqual(44);

  await resetSummary.click();
  const confirmation = resetDetails.getByLabel(
    "Onaylamak için BU CİHAZI SIFIRLA yazın",
  );
  const resetButton = resetDetails.getByRole("button", {
    name: "Erişilemeyen kasayı kalıcı sil",
  });
  await confirmation.fill("YANLIŞ ONAY");
  await expect(resetButton).toBeDisabled();
  await expect
    .poll(async () => (await resetButton.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await confirmation.fill("BU CİHAZI SIFIRLA");
  await expect(resetButton).toBeEnabled();
  await Promise.all([
    page.waitForEvent("framenavigated"),
    resetButton.click(),
  ]);
  await expect(
    page.getByRole("dialog", { name: "Sınıfını hazırla" }),
  ).toBeVisible();
});

test("uygulama kilidi kaydı bozukken öğretmen verileri açılmaz", async ({ page }) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("Uygulama PIN’i").fill("246810");
  await page.getByLabel("PIN’i doğrula").fill("246810");
  await page.getByRole("button", { name: "Uygulama kilidini etkinleştir" }).click();
  await expect(page.getByText("Uygulama kilidi bu cihazda etkinleştirildi.")).toBeVisible();
  await page.evaluate(async () => {
    const modulePath = "/src/core/repository/indexed-db.ts";
    const { IndexedDbDataStore } = await import(/* @vite-ignore */ modulePath);
    const store = new IndexedDbDataStore();
    try {
      await store.transaction("readwrite", ["settings"], async (transaction: { getAll: (name: string) => Promise<Array<Record<string, unknown>>>; putMany: (name: string, value: Array<Record<string, unknown>>) => Promise<void> }) => {
        const record = (await transaction.getAll("settings")).find(record => record.settingType === "app-lock-config-v1");
        if (!record) throw new Error("Kurgu kilit kaydı bulunamadı");
        await transaction.putMany("settings", [{ ...record, config: { invalid: true } }]);
      });
    } finally { await store.close(); }
  });
  await page.reload({ waitUntil: "networkidle" });
  const gate = page.getByTestId("persistence-gate");
  await expect(gate).toBeVisible();
  await expect(gate).toContainText("HYD-LOCK");
  await expect(page.locator(".maarif-app-content")).toHaveAttribute("inert", "");
  await expect(page.locator(".maarif-app-content")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("main")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Sınıfını hazırla" })).toHaveCount(0);
});

test("uygulama kilidi depolaması okunamazken kilitsiz oturum açılmaz", async ({ page }) => {
  await page.goto("/?view=app&native=1", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.addInitScript(() => {
    const originalGetAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args: Parameters<typeof originalGetAll>) {
      if (this.name === "settings") throw new DOMException("Kurgu ayar okuma hatası", "UnknownError");
      return originalGetAll.apply(this, args);
    };
  });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("persistence-gate")).toBeVisible();
  await expect(page.locator(".maarif-app-content")).toHaveAttribute("inert", "");
  await expect(page.locator(".maarif-app-content")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("main")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Sınıfını hazırla" })).toHaveCount(0);
});
