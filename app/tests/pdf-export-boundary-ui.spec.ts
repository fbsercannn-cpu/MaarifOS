import { test, expect } from "@playwright/test";

async function prepare(page: import("@playwright/test").Page, boundary: "xlsx" | "guard") {
  await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir" })).toBeVisible();
  await page.evaluate(async (boundary) => {
    const { createSemanticTaggedPdf } = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const { requestPdfDocument } = await import("/src/features/documents/pdf-preview-model.ts");
    const bytes = await createSemanticTaggedPdf({ title: "Kurgu dışa aktarım", nodes: [{ kind: "paragraph", text: "Kurgu seçilen içerik" }] });
    const state = { waiting: false, held: true, downloads: 0, release: () => {} };
    Object.assign(window, { exportBoundaryState: state });
    const gate = async () => { if (!state.held) return; state.waiting = true; await new Promise<void>((resolve) => { state.release = () => { state.held = false; resolve(); }; }); };
    HTMLAnchorElement.prototype.click = () => { state.downloads += 1; };
    void requestPdfDocument({ title: "Kurgu dışa aktarım", fields: [{ id: "name", label: "Adı soyadı" }], initial: { fields: ["name"] },
      build: async () => ({ bytes, mimeType: "application/pdf", fileName: "kurgu.pdf" }),
      assertExportAllowed: async () => { if (boundary === "guard") await gate(); },
      exportActions: [{ id: "xlsx", label: "Excel'e çıkar", build: async () => { if (boundary === "xlsx") await gate(); return { bytes: new Uint8Array([80, 75]), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName: "kurgu.xlsx" }; } }],
    });
  }, boundary);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30_000 });
  return dialog;
}

test("Excel hazırlanırken kaynak değişirse eski seçim dışa aktarılamaz", async ({ page }) => {
  const dialog = await prepare(page, "xlsx");
  await dialog.getByRole("button", { name: "Excel'e çıkar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).exportBoundaryState.waiting)).toBe(true);
  await expect(dialog.getByLabel("Adı soyadı", { exact: true })).toBeDisabled();
  await page.locator("#root > button").evaluate((button: HTMLButtonElement) => button.click());
  await page.evaluate(() => (window as any).exportBoundaryState.release());
  await expect(dialog.getByRole("alert").last()).toContainText("kaynağı veya seçimi değişti");
  expect(await page.evaluate(() => (window as any).exportBoundaryState.downloads)).toBe(0);
  await expect(dialog.getByRole("button", { name: "Excel'e çıkar", exact: true })).toBeDisabled();
});

test("son izin kontrolü beklerken kaynak değişirse eski PDF indirilmez", async ({ page }) => {
  const dialog = await prepare(page, "guard");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).exportBoundaryState.waiting)).toBe(true);
  await page.locator("#root > button").evaluate((button: HTMLButtonElement) => button.click());
  await page.evaluate(() => (window as any).exportBoundaryState.release());
  await expect(dialog.getByRole("alert").last()).toContainText("kaynağı veya seçimi değişti");
  expect(await page.evaluate(() => (window as any).exportBoundaryState.downloads)).toBe(0);
});

test("Excel hazırlığı sırasında pencere kapanırsa geç sonuç indirme başlatmaz", async ({ page }) => {
  const dialog = await prepare(page, "xlsx");
  await dialog.getByRole("button", { name: "Excel'e çıkar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).exportBoundaryState.waiting)).toBe(true);
  await dialog.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.evaluate(async () => { (window as any).exportBoundaryState.release(); await new Promise<void>((resolve) => setTimeout(resolve, 100)); });
  expect(await page.evaluate(() => (window as any).exportBoundaryState.downloads)).toBe(0);
});
