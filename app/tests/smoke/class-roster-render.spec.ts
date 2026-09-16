import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { createSimpleClassRosterDocument } from "../../src/features/students/simple-class-roster-document.ts";
import { classRosterFixture, classRosterExtremeFixture } from "../fixtures/class-roster-fixture.mjs";

const yearId = "00000000-0000-4000-8000-000000009501";
const classroomId = "00000000-0000-4000-8000-000000009502";

function record(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    civilDate: "2026-08-01",
    schemaVersion: 1,
    ...fields,
  };
}

function fortyStudentInput() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(
    record(yearId, {
      name: "2026-2027 Eğitim Öğretim Yılı",
      status: "active",
    }),
  );
  snapshot.classrooms.push(
    record(classroomId, {
      academicYearId: yearId,
      name: "Çiçekler 60-72 Ay Tam Gün Sınıfı",
    }),
  );
  for (let index = 0; index < 40; index += 1) {
    snapshot.students.push(
      record(`00000000-0000-4000-9500-${String(index).padStart(12, "0")}`, {
        academicYearId: yearId,
        classroomId,
        active: true,
        enrollmentStatus: "active",
        displayName:
          index % 5 === 0
            ? `Nurbanu Nazlıcan Su Elif İrem Uzunoğulları Kahramanoğlu ${index + 1}`
            : `Kurgu Öğrenci ${String(index + 1).padStart(2, "0")} Çınaroğlu`,
        optionalCode: String(1000 + index),
        nationalIdentityNumber: "10000000146",
        contacts:
          index % 7 === 0
            ? []
            : [
                {
                  id: `00000000-0000-4000-9600-${String(index).padStart(12, "0")}`,
                  relationship: "Anne ve okul çıkışında yetkili teslim kişisi",
                  name: `Dr. Öğr. Üyesi Şehnaz Ayşegül Uzunoğulları ${index + 1}`,
                  phone: "+90 (532) 111 22 33 / iş telefonu: 0258 444 55 66",
                },
              ],
      }),
    );
  }
  return {
    scope: { academicYearId: yearId, classroomId },
    snapshot,
    schoolName:
      "T.C. Millî Eğitim Bakanlığı Denizli Merkezefendi Cumhuriyet Anaokulu Müdürlüğü",
    teacherName: "Emine Nur Akış Özdemir",
    generatedAt: "2026-08-21T10:30:00.000Z",
  };
}

function fortyStudentDocument() {
  return createSimpleClassRosterDocument(fortyStudentInput());
}

test("40 öğrencilik HTML 320/390/430 px telefonda taşmadan okunur ve son imza alanına ulaşılır", async ({
  page,
}) => {
  const file = fortyStudentDocument();
  await page.setContent(file.html, { waitUntil: "load" });

  await expect(page.locator('td[data-label="Sıra numarası"]')).toHaveCount(40);
  await expect(page.locator(".document-footer")).toHaveCount(1);
  await expect(page.locator(".signature-name")).toHaveText("Emine Nur Akış Özdemir");

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 700 });
    await page.locator(".document-footer").scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const footer = document.querySelector<HTMLElement>(".document-footer");
      const longName = document.querySelector<HTMLElement>(".student-name .cell-value");
      return {
        rootScrollWidth: root.scrollWidth,
        viewportWidth: window.innerWidth,
        footerRight: footer?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
        longNameScrollWidth: longName?.scrollWidth ?? 0,
        longNameClientWidth: longName?.clientWidth ?? 0,
      };
    });
    expect(layout.rootScrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.footerRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.longNameScrollWidth).toBeLessThanOrEqual(layout.longNameClientWidth + 1);
  }
});

test("baskı medyası ekran yardımını kaldırır, sayfa sınırını ve son sayfa imzasını korur", async ({
  page,
}) => {
  const file = fortyStudentDocument();
  await page.setContent(file.html, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".screen-output-help")).toBeHidden();
  await expect(page.locator(".roster-page")).toHaveCount(file.pageCount);
  await expect(page.locator(".roster-page:not(.roster-page--last) .document-footer")).toHaveCount(0);
  await expect(page.locator(".roster-page--last .document-footer")).toHaveCount(1);

  const printStyles = await page.evaluate(() => {
    const pages = [...document.querySelectorAll<HTMLElement>(".roster-page")];
    const heading = document.querySelector<HTMLElement>("thead");
    return {
      intermediateBreaks: pages
        .slice(0, -1)
        .map((element) => getComputedStyle(element).breakAfter),
      lastBreak: getComputedStyle(pages.at(-1)!).breakAfter,
      headingDisplay: heading ? getComputedStyle(heading).display : "missing",
      pageHeights: pages.map((element) => element.getBoundingClientRect().height),
    };
  });
  expect(printStyles.intermediateBreaks.every((value) => value === "page")).toBe(true);
  expect(printStyles.lastBreak).toBe("auto");
  expect(printStyles.headingDisplay).toBe("table-header-group");
  const printableA4HeightCssPixels = ((210 - 20) * 96) / 25.4;
  expect(
    Math.max(...printStyles.pageHeights),
    `A4 içerik yükseklikleri: ${printStyles.pageHeights.join(", ")}`,
  ).toBeLessThanOrEqual(printableA4HeightCssPixels + 1);
});

test("gerçek mobil tarayıcı 40 öğrencilik etiketli yatay PDF üretir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async (input) => {
    const { createSimpleClassRosterPdfDocument } = await import(
      "/src/features/students/simple-class-roster-document.ts"
    );
    const file = await createSimpleClassRosterPdfDocument(input);
    return {
      bytes: Array.from(file.bytes),
      mimeType: file.mimeType,
      fileName: file.fileName,
      rowCount: file.rowCount,
      pageCount: file.pageCount,
    };
  }, fortyStudentInput());
  const bytes = Uint8Array.from(result.bytes);

  expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  expect(result.mimeType).toBe("application/pdf");
  expect(result.fileName).toMatch(/\.pdf$/u);
  expect(result.rowCount).toBe(40);
  expect(result.pageCount).toBeGreaterThanOrEqual(2);
  expect(Buffer.from(bytes).toString("latin1")).toMatch(
    new RegExp(`/Count ${result.pageCount}\\b`, "u"),
  );

  const outputDirectory = new URL("../../output/class-roster-vibrant-2026-09-08/smoke/", import.meta.url);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    new URL("qa-sinif-listesi-40-ogrenci.pdf", outputDirectory),
    bytes,
  );
});

test("dört ek yakın ve uzun kaynak değerleri kesilmeden aynı çocuk bloğunda basılır", async ({ page }) => {
  const input = classRosterExtremeFixture();
  await page.setContent(createSimpleClassRosterDocument(input).html, { waitUntil: "load" });
  const childRows = page.locator('[data-section="parents"] tr[data-student-sequence="1"]:not(.student-detail-band)');
  await expect(childRows).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(childRows.nth(index).locator('[data-label="Anne telefonu"]')).toHaveText(index === 0 ? "0532 000 00 01" : "");
    await expect(childRows.nth(index).locator('[data-label="Baba telefonu"]')).toHaveText(index === 0 ? "0532 000 00 02" : "");
  }
  const parentsWithChild = page.locator('[data-section="parents"]').filter({ has: page.locator('tr[data-student-sequence="1"]') });
  await expect(parentsWithChild).toHaveCount(1);
  await expect(page.locator('.student-detail-band').filter({ hasText: input.snapshot.students[6].careDetails.homeAddress })).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 1123, height: 794 });
  const metrics = await page.evaluate(() => ({
    maxHeight: Math.max(...[...document.querySelectorAll<HTMLElement>(".roster-page")].map((element) => element.getBoundingClientRect().height)),
    overflows: [...document.querySelectorAll<HTMLElement>("td .cell-value")].filter((element) => element.scrollWidth > element.clientWidth + 1).length,
    minimumTableFont: Math.min(...[...document.querySelectorAll<HTMLElement>("td,th")].map((element) => parseFloat(getComputedStyle(element).fontSize))),
  }));
  expect(metrics.maxHeight).toBeLessThanOrEqual(719);
  expect(metrics.overflows).toBe(0);
  expect(metrics.minimumTableFont).toBeGreaterThanOrEqual(8.5 * 96 / 72 - 0.01);
});

test("anne baba ve her ek yakının telefonu kendi satırında kalır; A4 yatay tablolar taşmaz", async ({ page }) => {
  const file = createSimpleClassRosterDocument(classRosterFixture(15));
  await page.setContent(file.html, { waitUntil: "load" });
  const otherRow = page.locator('[data-section="parents"] tbody tr:not(.student-detail-band)').filter({ hasText: "Kurgu İkinci Yakın" });
  await expect(otherRow).toHaveCount(1);
  await expect(otherRow.locator('[data-label="3. kişi telefonu"]')).toHaveText("0532 000 00 04");
  await expect(otherRow.locator('[data-label="3. kişi yakınlığı / ünvanı"]')).toHaveText("Dede");
  await expect(page.locator(".signature-title")).toHaveText("Okul Öncesi Öğretmeni");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.locator(".document-footer").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 1047, height: 718 });
  const measurements = await page.evaluate(() => ({
    pageHeights: [...document.querySelectorAll<HTMLElement>(".roster-page")].map((page) => page.getBoundingClientRect().height),
    overflowCells: [...document.querySelectorAll<HTMLElement>("td .cell-value")].filter((cell) => cell.scrollWidth > cell.clientWidth + 1).length,
  }));
  expect(measurements.overflowCells).toBe(0);
  expect(Math.max(...measurements.pageHeights)).toBeLessThanOrEqual(719);
});
