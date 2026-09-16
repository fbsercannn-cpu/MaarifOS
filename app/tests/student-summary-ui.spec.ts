import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 320, height: 844 } });
test("single student summary keeps narrowed fields through fresh source refresh and exports real PDF/Word", async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    Object.assign(window, { summaryBlobs: [] });
    URL.createObjectURL = blob => { if (blob instanceof Blob && blob.type === "application/pdf") (window as any).summaryBlobs.push(blob); return create(blob); };
  });
  await page.goto("/tests/document-history-fixture.html");
  await page.waitForFunction(() => Boolean((window as any).historyTest));
  await page.evaluate(async () => {
    const { store, previewModel } = (window as any).historyTest;
    const { studentSummaryFixture } = await import("/tests/fixtures/student-summary-fixture.mjs");
    const { createStudentSummaryRecipe } = await import("/src/features/student-summary/student-summary-document.ts");
    const fixture = studentSummaryFixture();
    await store.transaction("readwrite", ["observations", "settings"], async tx => { await tx.putMany("observations", fixture.input.snapshot.observations); await tx.putMany("settings", fixture.input.snapshot.settings); });
    void previewModel.requestPdfDocument(await createStudentSummaryRecipe(store, { scope: fixture.input.scope, studentId: fixture.child.id, generatedAt: "2026-09-10T09:00:00Z" }));
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  const download = dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true });
  await expect(download).toBeEnabled({ timeout: 30000 });
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByRole("checkbox", { name: "İletişim", exact: true }).uncheck();
  await expect(download).toBeEnabled({ timeout: 30000 });
  await page.evaluate(async () => {
    const { store, bump } = (window as any).historyTest;
    const snapshot = await store.readSnapshot();
    const observation = snapshot.observations.find(r => r.id.endsWith("000000000005")); observation.rawText = "Kurgu yenilenen bireysel gözlem.";
    await store.transaction("readwrite", ["observations"], async tx => tx.putMany("observations", [observation])); bump();
  });
  await expect(download).toBeDisabled();
  await dialog.getByRole("button", { name: "Aynı seçimlerle güncelle", exact: true }).click();
  await expect(download).toBeEnabled({ timeout: 30000 });
  await expect(dialog.getByRole("checkbox", { name: "İletişim", exact: true })).not.toBeChecked();
  const text = await page.evaluate(async () => {
    const { pdfText } = await import("/tests/fixtures/pdf-text-browser.ts");
    return pdfText((window as any).summaryBlobs.at(-1));
  });
  expect(text).toContain("Kurgu yenilenen bireysel gözlem");
  expect(text).not.toMatch(/DIGER_COCUK|ORTAK_COCUK|ÖZEL_ÇOCUK|ÖZEL_AİLE|0532/);
  const pdfEvent = page.waitForEvent("download"); await download.click(); expect((await pdfEvent).suggestedFilename()).toMatch(/Ogrenci_Ozeti_Kisa/);
  const menu = dialog.locator(".pdf-preview-secondary-actions"); await menu.locator("summary").click();
  const wordEvent = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Aynı özeti Word olarak indir", exact: true }).click(); expect((await wordEvent).suggestedFilename()).toMatch(/\.docx$/);
});
