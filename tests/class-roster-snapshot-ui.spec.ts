import { test, expect } from "@playwright/test";

test("sınıf listesi okul ve öğretmen adını çocuklarla aynı güncel veri kesitinden alır", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-09-14T09:00:00.000Z") });
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL); window.__rosterSnapshotBlobs = [];
    URL.createObjectURL = blob => { if (blob instanceof Blob && blob.type === "application/pdf") window.__rosterSnapshotBlobs.push(blob); return original(blob); };
  });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Eski Okul");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Eski Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Sınıf");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill("Kurgu Deniz Çocuk");
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  // Simulate another writer updating the encrypted database before the current UI refreshes.
  await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try { await store.transaction("readwrite", ["classrooms"], async tx => {
      const records = await tx.getAll("classrooms");
      await tx.putMany("classrooms", records.map(r => ({ ...r, schoolName: "Kurgu Güncel Okul", teacherName: "Kurgu Güncel Öğretmen", updatedAt: "2026-09-14T09:00:00.001Z" })));
    }); } finally { store.close(); }
  });
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: "Sınıf listesini indir", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 30000 });
  const text = await page.evaluate(async () => {
    const { pdfText } = await import("/tests/fixtures/pdf-text-browser.ts");
    return pdfText(window.__rosterSnapshotBlobs.at(-1));
  });
  expect(text).toContain("Kurgu Güncel Okul"); expect(text).toContain("Kurgu Güncel Öğretmen");
  expect(text).toContain("Kurgu Deniz"); expect(text).not.toContain("Kurgu Eski Okul"); expect(text).not.toContain("Kurgu Eski Öğretmen");
});
