import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { classRosterFixture, classRosterExtremeFixture } from "../tests/fixtures/class-roster-fixture.mjs";
import { createSimpleClassRosterDocument, createSimpleClassRosterPdfDocument } from "../src/features/students/simple-class-roster-document.ts";

const directory = new URL("../output/document-qa/class-roster-v31-master-2026-09-07/", import.meta.url);
await mkdir(directory, { recursive: true });
const fontBytes = new Uint8Array(await readFile(new URL("../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
const result = [];
try {
  for (const variant of [0, 1, 15, 30, 40, "extreme"]) {
    const input = variant === "extreme" ? classRosterExtremeFixture() : classRosterFixture(variant);
    const html = createSimpleClassRosterDocument(input);
    const pdf = await createSimpleClassRosterPdfDocument(input, { runtime: { fontBytes } });
    await writeFile(new URL(`roster-${variant}.html`, directory), html.bytes);
    await writeFile(new URL(`roster-${variant}.pdf`, directory), pdf.bytes);
    await page.setContent(html.html);
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: fileURLToPath(new URL(`html-print-${variant}.pdf`, directory)), preferCSSPageSize: true, printBackground: true });
    result.push({ variant, students: html.rowCount, htmlPages: html.pageCount, pdfPages: pdf.pageCount, ...await page.evaluate(() => ({
      pageHeights: [...document.querySelectorAll(".roster-page")].map((element) => Number(element.getBoundingClientRect().height.toFixed(2))),
      overflowingCells: [...document.querySelectorAll("td .cell-value")].filter((element) => element.scrollWidth > element.clientWidth + 1).length,
      firstStudentPages: [...document.querySelectorAll('[data-section="parents"]')].map((section, index) => [...section.querySelectorAll('td[data-label="Sıra"]')].some((cell) => cell.textContent.trim() === "1") ? index : -1).filter((index) => index >= 0),
    })) });
  }
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(await readFile(new URL("roster-15.html", directory), "utf8"));
  await page.locator('[data-label="3. Kişi Adı Soyadı"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL("third-contact-mobile-390.png", directory)) });
  await writeFile(new URL("generation.json", directory), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
