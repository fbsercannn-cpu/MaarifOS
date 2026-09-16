import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const artifactRoot = (process.env.MAARIF_DOCUMENTS_OUTPUT_DIR?.trim() ||
  "output/export-fixes-2026-09-09").replace(/[\\/]+$/u, "");
const output = `${artifactRoot}/growth/pdf-qa`;
test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ timeout: 120000 });

async function prepare(page: Page) {
  await mkdir(output, { recursive: true });
  await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir", exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const { growthFixture, growthScope, growthStudents, addGrowthStudents, GrowthMemoryStore } = await import("/tests/fixtures/growth-measurements-fixture.mjs");
    const { saveGrowthMeasurement } = await import("/src/features/growth-measurements/growth-measurement-service.ts");
    const snapshot = growthFixture();
    snapshot.students = snapshot.students.filter(row => row.id !== growthStudents.deniz);
    const store = new GrowthMemoryStore(snapshot);
    const periods = ["2026-09", "2026-12", "2027-03", "2027-06"];
    for (let index = 0; index < periods.length; index++) {
      const periodKey = periods[index], measuredOn = `${periodKey}-15`;
      for (const [studentIndex, studentId] of [growthStudents.ada, growthStudents.bora, growthStudents.cem].entries()) {
        if (studentId === growthStudents.cem && index < 2) continue;
        for (const metric of ["height", "weight"] as const) {
          if (studentId === growthStudents.ada && ((metric === "height" && index === 2) || (metric === "weight" && index === 1))) continue;
          await saveGrowthMeasurement(store, { ...growthScope, studentId, periodKey, metric,
            integerValue: metric === "height" ? 1100 + studentIndex * 50 + index * 20 : 18500 + studentIndex * 1500 + index * 500,
            measuredOn, source: studentIndex === 1 ? "family" : "school", expectedSelectionEventId: null,
            now: new Date(`${measuredOn}T10:00:00.000Z`) });
        }
      }
    }
    const measured = await store.readSnapshot();
    const long = addGrowthStudents(structuredClone(measured), 40);
    long.students.at(-1).displayName = "Kurgu Son Öğrenci " + "İğdeÇınarŞule".repeat(10);
    const canvasRuns: any[] = [];
    const runtime = { createCanvas() {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      const original = context.fillText.bind(context);
      const run = { texts: [] as any[], chartBoxes: [] as any[], images: 0, width: 0, height: 0 };
      const drawImage = context.drawImage.bind(context);
      context.drawImage = function(...args: any[]) { run.images++; return drawImage(...args); };
      const rect = context.roundRect.bind(context);
      context.roundRect = function(...args: any[]) { run.chartBoxes.push(args.slice(0,4)); return rect(...args); };
      context.fillText = function(text: string, x: number, y: number, maxWidth?: number) {
        run.width = canvas.width; run.height = canvas.height;
        const metrics = context.measureText(text);
        const width = maxWidth === undefined ? metrics.width : Math.min(maxWidth, metrics.width);
        const left = context.textAlign === "center" ? x - width / 2 : context.textAlign === "right" ? x - width : x;
        run.texts.push({ text, bounds: [left, y - metrics.actualBoundingBoxAscent, left + width, y + metrics.actualBoundingBoxDescent], font: context.font });
        return maxWidth === undefined ? original(text, x, y) : original(text, x, y, maxWidth);
      };
      canvasRuns.push(run); return canvas;
    } };
    Object.assign(window, { growthQa: { measured, long, studentId: growthStudents.ada, scope: growthScope, canvasRuns, runtime } });
  });
}

async function showAndDownload(page: Page, template: "class" | "blank" | "individual", filename: string, extreme = false) {
  const original = await page.evaluate(async ({ template, extreme }) => {
    const { createGrowthPdfDocument } = await import("/src/features/growth-measurements/growth-pdf.ts");
    const { downloadBrowserFile } = await import("/src/features/documents/browser-file-download.ts");
    const qa = (window as any).growthQa;
    qa.canvasRuns.length = 0;
    const snapshot = structuredClone(template === "individual" ? qa.measured : qa.long);
    if (extreme) {
      snapshot.students.find(row => row.id === qa.studentId).displayName = "Kurgu " + "İğdeÇınarŞule".repeat(10);
      snapshot.classrooms[0].schoolName = "Kurgu " + "Gökkuşağı Anaokulu ".repeat(10);
    }
    const file = await createGrowthPdfDocument(snapshot, "2027-06-30", { template, ...(template === "individual" ? { studentId: qa.studentId } : {}), generatedAt: "2027-06-30T09:00:00.000Z",
      explanation: extreme ? ("Kurgu açıklama " + "uzun açıklama ".repeat(21)).padEnd(320, "a") : "Kurgu ölçümler gerçek tarihlerle kaydedildi." }, qa.runtime);
    if (template === "individual") {
      const { pdfPreviewRecipe } = await import("/src/features/documents/pdf-preview-model.ts");
      const recipe = pdfPreviewRecipe(file.bytes);
      if (!recipe) throw new Error("Büyüme PDF önizleme tarifi eksik.");
      const originalRuns = [...qa.canvasRuns];
      const rebuilt = await recipe.build(recipe.initial);
      if (rebuilt.bytes.length !== file.bytes.length || rebuilt.bytes.some((byte, index) => byte !== file.bytes[index])) throw new Error("Aynı büyüme PDF seçimi aynı baytları üretmedi.");
      qa.canvasRuns.splice(0, qa.canvasRuns.length, ...originalRuns);
    }
    downloadBrowserFile(file);
    return Array.from(file.bytes);
  }, { template, extreme });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 30000 });
  const event = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  await (await event).saveAs(`${output}/${filename}.pdf`);
  expect(Array.from(await readFile(`${output}/${filename}.pdf`))).toEqual(original);
  await page.screenshot({ path: `${output}/${filename}-preview.png` });
  const diagnostic = await page.evaluate(() => {
    const pages = (window as any).growthQa.canvasRuns;
    return pages.length ? { pages, texts: pages.flatMap(row => row.texts), chartBoxes: pages.flatMap(row => row.chartBoxes) } : null;
  });
  if (diagnostic) await writeFile(`${output}/${filename}-canvas.json`, JSON.stringify(diagnostic, null, 2));
  await dialog.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
  return diagnostic;
}

test("boy/kilo üç şablon gerçek canvas ve aynı PDF indirmesi; 40 çocuk ve uzun ad", async ({ page }) => {
  await prepare(page);
  await showAndDownload(page, "class", "class-40");
  await showAndDownload(page, "blank", "blank-40");
  const canvas = await showAndDownload(page, "individual", "individual");
  expect(canvas.chartBoxes).toHaveLength(2);
  expect(canvas.texts.some(row => row.text === "Boy (cm) · gerçek tarihler")).toBe(true);
  expect(canvas.texts.some(row => row.text === "Kilo (kg) · gerçek tarihler")).toBe(true);
  expect(canvas.chartBoxes[0][1] + canvas.chartBoxes[0][3]).toBeLessThan(canvas.chartBoxes[1][1]);
  expect(canvas.texts.some(row => row.text.includes("Boy ölçülmedi"))).toBe(true);
  expect(canvas.texts.some(row => row.text.includes("Kilo ölçülmedi"))).toBe(true);
  const heightLabels = canvas.texts.filter(row => row.bounds[1] >= canvas.chartBoxes[0][1] && row.bounds[1] < canvas.chartBoxes[0][1] + canvas.chartBoxes[0][3]).map(row => row.text);
  const weightLabels = canvas.texts.filter(row => row.bounds[1] >= canvas.chartBoxes[1][1] && row.bounds[1] < canvas.chartBoxes[1][1] + canvas.chartBoxes[1][3]).map(row => row.text);
  expect(heightLabels.filter(text => /^\d.* cm$/u.test(text))).toEqual(["110 cm", "112 cm", "116 cm"]);
  expect(weightLabels.filter(text => /^\d.* kg$/u.test(text))).toEqual(["18,5 kg", "19,5 kg", "20 kg"]);
  expect(heightLabels.filter(text => text.endsWith(" kg"))).toEqual([]);
  expect(weightLabels.filter(text => text.endsWith(" cm"))).toEqual([]);
  expect(heightLabels.filter(text => /^\d{2}\.\d{2}\.\d{4}$/u.test(text))).toEqual(["15.09.2026", "15.12.2026", "15.06.2027"]);
  expect(weightLabels.filter(text => /^\d{2}\.\d{2}\.\d{4}$/u.test(text))).toEqual(["15.09.2026", "15.03.2027", "15.06.2027"]);
  expect(canvas.texts.filter(row => row.bounds[0] < 0 || row.bounds[1] < 0 || row.bounds[2] > 1240 || row.bounds[3] > 1754)).toEqual([]);
});

test("bireysel belge geçerli uzun ad okul ve 320 karakter açıklamayı sayfa dışında bırakmaz", async ({ page }) => {
  await prepare(page);
  const canvas = await showAndDownload(page, "individual", "individual-long", true);
  expect(canvas.pages.length).toBeGreaterThan(1);
  expect(canvas.chartBoxes).toHaveLength(2);
  const completeText = canvas.texts.map(row => row.text).join("").replace(/\s/gu, "");
  expect(completeText).toContain(("Kurgu " + "İğdeÇınarŞule".repeat(10)).replace(/\s/gu, ""));
  expect(completeText).toContain(("Kurgu " + "Gökkuşağı Anaokulu ".repeat(10)).replace(/\s/gu, ""));
  const clipped = canvas.texts.filter(row => row.bounds[0] < 0 || row.bounds[1] < 0 || row.bounds[2] > 1240 || row.bounds[3] > 1754);
  await writeFile(`${output}/individual-long-clipping.json`, JSON.stringify({ clippedCount: clipped.length, clipped: clipped.map(row => ({ bounds: row.bounds, textLength: row.text.length })) }, null, 2));
  expect(clipped).toEqual([]);
});

test("kayıtlı okul logosu, uzun üç başlık ve müdür imzası büyüme belgelerinde kayıpsız kalır", async ({ page }) => {
  for (const orientation of ["portrait", "landscape"] as const) {
  await prepare(page);
  await page.evaluate(async orientation => {
    const { GrowthMemoryStore } = await import("/tests/fixtures/growth-measurements-fixture.mjs");
    const { appendSchoolDocumentTemplate } = await import("/src/features/school-document-template/school-document-template-service.ts");
    const qa = (window as any).growthQa;
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const c = canvas.getContext("2d")!; c.fillStyle = "#176b5b"; c.fillRect(0, 0, 64, 64);
    const template = { layout: "official", orientation, logo: { dataUrl: canvas.toDataURL("image/png"), width: 64, height: 64 }, headerLines: ["T.C.", ("Kurgu Millî Eğitim Müdürlüğü ".repeat(6)).slice(0,160).trim(), ("Kurgu Uzun Okul Başlığı ".repeat(8)).slice(0,160).trim()], signatureLayout: "teacher-and-principal", principalName: "KURGU " + "UZUNSOYADI".repeat(14) };
    const store = new GrowthMemoryStore(qa.measured);
    const record = await appendSchoolDocumentTemplate(store, { template, expectedScope: qa.scope, expectedHead: null, now: new Date("2027-06-30T09:00:00.000Z") });
    qa.measured = await store.readSnapshot(); qa.long.settings.push(record);
  }, orientation);
  const canvas = await showAndDownload(page, "individual", `individual-school-styled-${orientation}`, true);
  const clipped = canvas.pages.flatMap(p => p.texts.filter(row => row.bounds[0] < 0 || row.bounds[1] < 0 || row.bounds[2] > p.width || row.bounds[3] > p.height));
  await writeFile(`${output}/individual-school-styled-${orientation}-clipping.json`, JSON.stringify({ pages: canvas.pages.length, clippedCount: clipped.length, clipped: clipped.map(row => ({ bounds: row.bounds, textLength: row.text.length })) }, null, 2));
  expect(clipped).toEqual([]);
  expect(canvas.chartBoxes).toHaveLength(2);
  expect(canvas.pages.every(p => p.images > 0)).toBe(true);
  expect(canvas.pages.every(p => p.width === (orientation === "portrait" ? 1240 : 1754) && p.height === (orientation === "portrait" ? 1754 : 1240))).toBe(true);
  const text = canvas.texts.map(row => row.text).join("").replace(/\s/gu, "");
  expect(text.toLocaleLowerCase("tr-TR")).toContain(("Kurgu " + "Uzunsoyadı".repeat(14)).replace(/\s/gu, "").toLocaleLowerCase("tr-TR"));
  await showAndDownload(page, "class", `class-school-styled-${orientation}`);
  await showAndDownload(page, "blank", `blank-school-styled-${orientation}`);
  }
});
