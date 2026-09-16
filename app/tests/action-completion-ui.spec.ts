import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ timeout: 90_000 });
const child = "Kurgu İşlem Çocuğu";

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-10T09:00:00.000Z"));
  await page.goto("/classroom?native=1");
  const dialog = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await dialog.getByLabel("Okul adı").fill("Kurgu İşlem Anaokulu");
  await dialog.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await dialog.getByLabel("Sınıf adı").fill("Kurgu İşlem Sınıfı");
  await dialog.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await dialog.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
}

async function countChildren(page: Page) {
  return page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try { return (await store.readSnapshot()).students.length; } finally { store.close(); }
  });
}

test("yanlış eklenen aktif öğrenci seçerek tamamen silinir, iptal veri değiştirmez, yenilemede dönmez", async ({ page }) => {
  await setup(page);
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: `${child} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${child} öğrencisini tamamen sil`, exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Kalıcı öğrenci silme", exact: true });
  await expect(deletion).toBeVisible();
  await expect(deletion.getByRole("heading", { name: child, exact: true })).toBeVisible();
  const confirm = deletion.getByRole("button", { name: "Öğrenciyi ve bağlı kayıtları kalıcı sil", exact: true });
  await expect(confirm).toBeDisabled();
  await expect(deletion.getByRole("textbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(deletion).toBeHidden();
  expect(await countChildren(page)).toBe(1);
  await page.getByRole("button", { name: `${child} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${child} öğrencisini tamamen sil`, exact: true }).click();
  await deletion.getByRole("checkbox").check();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(deletion).toBeHidden();
  expect(await countChildren(page)).toBe(0);
  await page.reload();
  expect(await countChildren(page)).toBe(0);
  await expect(page.getByText(child, { exact: true })).toHaveCount(0);
});

test("silme önizlemesi eskidiğinde kapsam yenilenir ve aynı ekrandan işlem tamamlanır", async ({ page }) => {
  await setup(page);
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: `${child} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${child} öğrencisini tamamen sil`, exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Kalıcı öğrenci silme", exact: true });
  await expect(deletion.getByRole("heading", { name: child, exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try {
      await store.transaction("readwrite", ["students"], async transaction => {
        const [student] = await transaction.getAll("students");
        await transaction.putMany("students", [{ ...student, updatedAt: "2026-09-10T09:00:01.000Z" }]);
      });
    } finally { store.close(); }
  });
  await page.clock.setFixedTime(new Date("2026-09-10T09:01:00.000Z"));
  await deletion.getByRole("checkbox").check();
  await deletion.getByRole("button", { name: "Öğrenciyi ve bağlı kayıtları kalıcı sil", exact: true }).click();
  await expect(deletion.getByRole("alert")).toContainText("önizlemeden sonra değişti");
  expect(await countChildren(page)).toBe(1);
  await deletion.getByRole("button", { name: "Güncel silme kapsamını yeniden hazırla", exact: true }).click();
  await expect(deletion.getByRole("checkbox")).not.toBeChecked();
  await deletion.getByRole("checkbox").check();
  await deletion.getByRole("button", { name: "Öğrenciyi ve bağlı kayıtları kalıcı sil", exact: true }).click();
  await expect(deletion).toBeHidden();
  expect(await countChildren(page)).toBe(0);
});

test("arşivlenen öğrenciye de tamamen sil işlemi ulaşır ve 320 pikselde taşmaz", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: `${child} için diğer işlemler`, exact: true }).click();
  await page.getByRole("button", { name: `${child} öğrencisini sil`, exact: true }).click();
  const archive = page.getByRole("dialog", { name: "Öğrenciyi sil", exact: true });
  await archive.getByRole("button", { name: "Sil ve geri alınabilir arşive taşı", exact: true }).click();
  await expect(archive).toBeHidden();
  await page.getByText("Silinen / ayrılan öğrenciler · 1", { exact: true }).click();
  await page.getByRole("button", { name: `${child} öğrencisini tamamen sil`, exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Kalıcı öğrenci silme", exact: true });
  await expect(deletion).toBeVisible();
  expect(await deletion.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await deletion.getByRole("checkbox").check();
  await deletion.getByRole("button", { name: "Öğrenciyi ve bağlı kayıtları kalıcı sil", exact: true }).click();
  await expect(deletion).toBeHidden();
  expect(await countChildren(page)).toBe(0);
});

test("gözlem kaydından kategoriye ve gerçek haftalık plana yalnız seçimle ilerler", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  const startYear = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  if (await startYear.isVisible()) { await startYear.click(); await expect(startYear).toBeHidden(); }
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${child} için Maarif gelişim gözlemi ekle`, exact: true }).click();
  const raw = "Kurgu çocuk arkadaşıyla blok oyununda parçaları paylaştı.";
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(raw);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  const completion = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  await expect(completion).toBeVisible();
  await expect(completion).toContainText(raw);
  await completion.getByRole("button", { name: "Oyun ve katılım", exact: true }).click();
  await expect(completion).toContainText("2. Sonraki adımı planla");
  await completion.getByText("Küçük grupta fırsat sun", { exact: true }).click();
  await completion.getByRole("button", { name: "Seç ve haftalık plana ekle", exact: true }).click();
  await expect(completion).toContainText("Sonraki destek adımı haftalık plana kaydedildi.");
  const persisted = await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try {
      const s = await store.readSnapshot();
      const links = s.settings.filter(r => r.workflow?.kind === "learning-plan-link");
      const weekly = s.plans.find(r => r.id === links[0]?.workflow.planId);
      return { observations: s.observations.map(o => ({ id: o.id, rawText: o.rawText, categories: o.observationCategories })), links: links.length, planId: weekly?.id, steps: weekly?.teacherContent.followupSupportSteps.length };
    } finally { store.close(); }
  });
  expect(persisted.observations).toHaveLength(1);
  expect(persisted.observations[0].rawText).toBe(raw);
  expect(persisted.observations[0].categories).toEqual(["play-participation"]);
  expect(persisted.links).toBe(1);
  expect(persisted.steps).toBe(1);
  await completion.getByRole("button", { name: "Kaydedilen planı aç", exact: true }).click();
  const plans = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı", exact: true });
  await expect(plans).toBeVisible();
  await expect(plans.locator(`#teacher-week-${persisted.planId}`)).toContainText("Küçük".toLocaleLowerCase("tr-TR"));
  await expect(plans.locator(`#teacher-week-${persisted.planId}`)).toContainText(child);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sınıfım", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByRole("button", { name: "Seç ve haftalık plana ekle", exact: true })).toHaveCount(0);
});
