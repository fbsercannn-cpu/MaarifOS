import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-08-31T06:00:00.000Z"));
});

async function ensureClassroomConfigured(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Eski Taslak Test Okulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Eski Taslak Test Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Eski Taslak Test Sınıfı");
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
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addSheet.getByLabel("Çocuğun adı").fill(name);
  await addSheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addSheet).toBeHidden();
  await expect(studentProfileButton(page, name)).toBeVisible();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

async function openQuickObservation(page: Page, childName: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("region", { name: "Çocuklar", exact: true })
    .getByRole("listitem")
    .filter({ hasText: childName })
    .getByRole("button", {
      name: `${childName} için Maarif gelişim gözlemi ekle`,
      exact: true,
    })
    .click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await expect(page.locator(".quick-selected-child")).toContainText(childName);
  await expect(page.locator(".quick-selected-child").getByRole("button", { name: "Çocuğu değiştir", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Gözlem yapılacak çocuk" })).toHaveCount(0);
}

function studentProfileButton(page: Page, name: string) {
  return page
    .getByRole("region", { name: "Çocuklar", exact: true })
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button")
    .first();
}

async function replaceSavedDraftWithLegacyDetails(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("settings", "readwrite");
        const store = transaction.objectStore("settings");
        const request = store.getAll();
        request.onsuccess = () => {
          const draft = request.result.find(
            (record) => record.settingType === "quick-observation-draft",
          );
          if (!draft) {
            transaction.abort();
            reject(new Error("Hızlı gözlem taslağı bulunamadı."));
            return;
          }
          draft.context = "Eski fen merkezi bağlamı";
          draft.childQuote = "Ben iki parçayı birleştirdim.";
          draft.updatedAt = new Date().toISOString();
          store.put(draft);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
}

async function savedObservationDetails(page: Page, rawText: string) {
  return page.evaluate(async (expectedRawText) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ context: string; childQuote: string }>(
        (resolve, reject) => {
          const transaction = database.transaction("observations", "readonly");
          const request = transaction.objectStore("observations").getAll();
          request.onsuccess = () => {
            const observation = request.result.find(
              (record) => record.rawText === expectedRawText,
            );
            if (!observation) {
              reject(new Error("Kaydedilen gözlem bulunamadı."));
              return;
            }
            resolve({
              context: observation.context ?? "",
              childQuote: observation.childQuote ?? "",
            });
          };
          request.onerror = () => reject(request.error);
        },
      );
    } finally {
      database.close();
    }
  }, rawText);
}

test("görünmeyen eski taslak ayrıntısı öğretmenin açık kararı olmadan finalleşmez", async ({
  page,
}) => {
  const rawText = "Kurgu çocuk üç parçayı aynı sırada yeniden kurdu.";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, "Eski Taslak Kurgu Çocuk");
  await openQuickObservation(page, "Eski Taslak Kurgu Çocuk");
  await page.getByLabel("Ne oldu?").fill(rawText);
  await expect(
    page.getByRole("status").filter({ hasText: "Taslak bu cihazda korundu" }),
  ).toBeVisible();
  await replaceSavedDraftWithLegacyDetails(page);

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await openQuickObservation(page, "Eski Taslak Kurgu Çocuk");

  const legacyReview = page.getByTestId("quick-legacy-review");
  await expect(legacyReview).toBeVisible();
  await expect(legacyReview).toContainText("Eski fen merkezi bağlamı");
  await expect(legacyReview).toContainText("Ben iki parçayı birleştirdim.");
  await expect(page.getByRole("button", { name: "Gözlemi kaydet" })).toBeDisabled();

  await legacyReview.getByRole("button", { name: "Kayda dahil et" }).click();
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(
    page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı" }),
  ).toBeHidden();
  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
  await expect(savedObservationDetails(page, rawText)).resolves.toEqual({
    context: "Eski fen merkezi bağlamı",
    childQuote: "Ben iki parçayı birleştirdim.",
  });
});

test("çocuk sözü ana gözlem alanından tek kez kaydolur ve reload sonrası profilde görünür", async ({
  page,
}) => {
  const childName = "Çocuk Sözü Kurgu Çocuk";
  const quote = "Bu uzun parçayı köprü yapacağım.";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await openQuickObservation(page, childName);

  await page.getByText("İstersen ayrıntı ekle", { exact: true }).click();
  await page.getByRole("button", { name: "Çocuk sözü", exact: true }).click();
  await page.getByLabel("Çocuğun aynen sözü", { exact: true }).fill(quote);
  await expect(page.getByLabel("Çocuğun sözü", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(
    page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı" }),
  ).toBeHidden();
  await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await studentProfileButton(page, childName).click();
  const profile = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(profile).toContainText(quote);

  const stored = await page.evaluate(async (expectedQuote) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ rawText: string; childQuote: string; type: string }>(
        (resolve, reject) => {
          const request = database
            .transaction("observations", "readonly")
            .objectStore("observations")
            .getAll();
          request.onsuccess = () => {
            const record = request.result.find(
              (candidate) => candidate.rawText === expectedQuote,
            );
            if (!record) {
              reject(new Error("Çocuk sözü gözlemi bulunamadı."));
              return;
            }
            resolve({
              rawText: record.rawText,
              childQuote: record.childQuote ?? "",
              type: record.observationType,
            });
          };
          request.onerror = () => reject(request.error);
        },
      );
    } finally {
      database.close();
    }
  }, quote);
  expect(stored).toEqual({ rawText: quote, childQuote: "", type: "child-quote" });
});
