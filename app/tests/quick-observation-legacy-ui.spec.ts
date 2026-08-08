import { expect, test, type Page } from "@playwright/test";

async function ensureClassroomConfigured(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Sınıf adı").fill("Eski Taslak Test Sınıfı");
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

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

async function openQuickObservation(page: Page) {
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await page.getByRole("button", { name: /Gözlem yaz/ }).click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button")
    .first()
    .click();
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
  await openQuickObservation(page);
  await page.getByLabel("Ne oldu?").fill(rawText);
  await expect(page.getByText("Taslak bu cihazda korundu", { exact: true })).toBeVisible();
  await replaceSavedDraftWithLegacyDetails(page);

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await openQuickObservation(page);

  const legacyReview = page.getByTestId("quick-legacy-review");
  await expect(legacyReview).toBeVisible();
  await expect(legacyReview).toContainText("Eski fen merkezi bağlamı");
  await expect(legacyReview).toContainText("Ben iki parçayı birleştirdim.");
  await expect(page.getByRole("button", { name: "Gözlemi kaydet" })).toBeDisabled();

  await legacyReview.getByRole("button", { name: "Kayda dahil et" }).click();
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
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
  await openQuickObservation(page);

  await page.getByText("İstersen ayrıntı ekle", { exact: true }).click();
  await page.getByRole("button", { name: "Çocuk sözü", exact: true }).click();
  await page.getByLabel("Çocuğun aynen sözü", { exact: true }).fill(quote);
  await expect(page.getByLabel("Çocuğun sözü", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  const children = page.getByRole("region", { name: /Çocuklarım/i });
  await children
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();
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
