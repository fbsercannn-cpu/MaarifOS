import { mkdir, readFile, writeFile } from "node:fs/promises";
import { classRosterFixture } from "../tests/fixtures/class-roster-fixture.mjs";
import { createSimpleClassRosterDocument, createSimpleClassRosterPdfDocument } from "../src/features/students/simple-class-roster-document.ts";

const directory = new URL("../output/document-qa/class-roster-v3-2026-09-07/", import.meta.url);
await mkdir(directory, { recursive: true });
const fontBytes = new Uint8Array(await readFile(new URL("../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const result = [];
for (const count of [1, 15, 30, 40]) {
  const input = classRosterFixture(count);
  const html = createSimpleClassRosterDocument(input);
  const pdf = await createSimpleClassRosterPdfDocument(input, { runtime: { fontBytes } });
  await writeFile(new URL(`sinif-listesi-${count}.html`, directory), html.bytes);
  await writeFile(new URL(`sinif-listesi-${count}.pdf`, directory), pdf.bytes);
  result.push({ students: count, htmlPages: html.pageCount, pdfPages: pdf.pageCount, bytes: pdf.bytes.length });
}
await writeFile(new URL("generation.json", directory), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
