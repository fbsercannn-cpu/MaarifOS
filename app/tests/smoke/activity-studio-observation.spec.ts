import { expect, test, type Page } from "@playwright/test";

async function configureClassroomAndStudent(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Etkinlik Akışı Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Etkinlik Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "48–60 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Etkinlik Kanıt Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
}

test("Bugün önerisine dokununca genel listenin başı değil exact etkinlik açılır", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  const suggestion = page
    .locator(".simple-today__suggestion-list > button")
    .first();
  const suggestedTitle = (await suggestion.locator("strong").textContent())?.trim();
  expect(suggestedTitle).toBeTruthy();
  await suggestion.click();

  const cards = page.locator("article.activity-card");
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText(
    suggestedTitle!,
  );
  await expect(page.locator(".activity-studio__search input")).toHaveValue(
    suggestedTitle!,
  );
});

test("etkinlik baskısı gerçek pencere açar; seçim ve çizim öğretmen taslağına taşınır", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Etkinlik ve Materyal Stüdyosu" }),
  ).toBeVisible();

  await page
    .locator(".activity-studio__category-options")
    .getByRole("button", { name: "Çizim", exact: true })
    .click();
  const activity = page.locator("article.activity-card").first();
  const activityTitle = (await activity.getByRole("heading").textContent())?.trim() ?? "";
  expect(activityTitle).not.toBe("");

  const popupPromise = page.waitForEvent("popup");
  await activity.getByRole("button", { name: /materyalini yazdır$/u }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  expect(popup.url()).toMatch(/^blob:/u);
  await expect(popup).toHaveTitle(new RegExp(activityTitle, "u"));
  await popup.close();

  await activity.getByRole("button", { name: /Çocuk Modunda uygula$/u }).click();
  const childMode = page.locator("main.activity-child-mode");
  await expect(childMode).toBeVisible();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();

  const choice = childMode.locator(".activity-child-mode__choice").first();
  const choiceLabel = (await choice.textContent())?.trim() ?? "";
  await choice.click();
  const downloadPromise = page.waitForEvent("download");
  await childMode.getByRole("button", { name: "PNG indir", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^maarifos-.+\.png$/u);

  await childMode
    .getByRole("button", { name: "Bu etkinlik için gözlem yaz", exact: true })
    .click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await expect(page.locator(".quick-observation-page")).toHaveAttribute(
    "data-initial-draft",
    "true",
  );
  const seedLength = Number(
    await page.locator(".quick-observation-page").getAttribute("data-initial-draft-length"),
  );
  expect(seedLength).toBeGreaterThan(0);
  const selectedStudent = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: "Etkinlik Kanıt Çocuğu", exact: true });
  await expect(selectedStudent).toHaveAttribute("aria-pressed", "true");
  const observationText = page.getByLabel("Ne oldu?");
  await expect(observationText).toHaveValue(new RegExp(choiceLabel, "u"));
  await expect(observationText).toHaveValue(/4 çizgi/u);

  const savedObservationCount = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<number>((resolve, reject) => {
        const transaction = database.transaction("observations", "readonly");
        const request = transaction.objectStore("observations").count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
  expect(savedObservationCount).toBe(0);
});
