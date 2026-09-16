import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../output/document-qa/class-roster-v3-2026-09-07/", import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
const metrics = [];
try {
  for (const count of [1, 15, 30, 40]) {
    await page.setContent(await readFile(new URL(`sinif-listesi-${count}.html`, directory), "utf8"));
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: fileURLToPath(new URL(`html-print-${count}.pdf`, directory)), preferCSSPageSize: true, printBackground: true });
    metrics.push({ students: count, ...await page.evaluate(() => ({
      plannedPages: document.querySelectorAll(".roster-page").length,
      pageHeights: [...document.querySelectorAll(".roster-page")].map((element) => Number(element.getBoundingClientRect().height.toFixed(2))),
      overflowingCells: [...document.querySelectorAll("td .cell-value")].filter((element) => element.scrollWidth > element.clientWidth + 1).length,
    })) });
  }
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(await readFile(new URL("sinif-listesi-15.html", directory), "utf8"));
  await page.screenshot({ path: fileURLToPath(new URL("mobile-preview-390.png", directory)) });
  await page.locator('[data-section="details"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL("mobile-details-390.png", directory)) });
  await writeFile(new URL("browser-layout.json", directory), JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics));
} finally { await browser.close(); }
