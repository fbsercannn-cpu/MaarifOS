import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { classRosterFixture, classRosterExtremeFixture } from "../tests/fixtures/class-roster-fixture.mjs";
import { createClassRosterPdfDocument } from "../src/features/classroom/class-roster-document.ts";
import { developmentReportExportFixture } from "../tests/helpers/development-report-export-fixture.mjs";
import { createDevelopmentReportPdfDocument } from "../src/features/development/development-report-export.ts";

const out = resolve(process.argv[2] ?? `output/document-acceptance-${new Date().toISOString().replace(/[:.]/gu, "-")}/pdf`);
const relativeOutput = relative(resolve("output"), out);
if (!relativeOutput || relativeOutput.startsWith("..") || /^[A-Za-z]:/u.test(relativeOutput)) throw new Error("Belge kabul çıktısı app/output altında ayrı bir klasör olmalıdır.");
await mkdir(out, { recursive: true });
const runtime = { fontBytes: new Uint8Array(await readFile("public/assets/fonts/MaarifOSSans-Regular.ttf")), boldFontBytes: new Uint8Array(await readFile("public/assets/fonts/MaarifOSSans-Bold.ttf")) };
const variants = [
  ...[0, 1, 15, 40].map(count => [`roster-${count}`, classRosterFixture(count)]),
  ["roster-extreme", classRosterExtremeFixture()],
  ["roster-name-only", { ...classRosterFixture(15), columns: ["sequence", "name"] }],
  ["student-record-all", { ...classRosterFixture(1), template: "student-record", fields: ["identity", "contacts", "address", "care"] }],
  ["student-record-three", { ...classRosterFixture(3), template: "student-record", fields: ["identity", "contacts", "address"] }],
  ["emergency-all", { ...classRosterFixture(1), template: "emergency-card", fields: ["identity", "contacts", "address", "care"] }],
];
const result = [];
for (const [name, input] of variants) {
  const before = JSON.stringify(input);
  const file = await createClassRosterPdfDocument({ ...input, generatedAt: "2026-09-09T09:00:00.000Z" }, { runtime });
  if (before !== JSON.stringify(input)) throw new Error(`Kaynak değişti: ${name}`);
  await writeFile(resolve(out, `${name}.pdf`), file.bytes);
  result.push({ name, pageCount: file.pageCount, rowCount: file.rowCount, sourcePreserved: true, sha256: createHash("sha256").update(file.bytes).digest("hex") });
}
for (const [name, input] of [
  ["development-short", {}],
  ["development-long", { rawText: "Kurgu ham gözlem başlangıcı. " + Array.from({ length: 170 }, (_, index) => `KANIT${String(index).padStart(3, "0")} çocuk nesneyi kutuya koydu.`).join(" ") + " HAM GÖZLEM SONU", teacherEvaluation: "Kurgu öğretmen yorumu. " + "İkinci etkinlikte aynı davranış için gözlem fırsatı sunacağım. ".repeat(25) }],
]) {
  const { snapshot, reportId } = await developmentReportExportFixture(input);
  const before = JSON.stringify(snapshot);
  const file = await createDevelopmentReportPdfDocument(snapshot, reportId, { runtime, exportedAt: "2026-09-09T09:00:00.000Z" });
  if (before !== JSON.stringify(snapshot)) throw new Error(`Kaynak değişti: ${name}`);
  await writeFile(resolve(out, `${name}.pdf`), file.bytes);
  result.push({ name, pageCount: file.pageCount, sourcePreserved: true, sha256: createHash("sha256").update(file.bytes).digest("hex") });
}
await writeFile(resolve(out, "generation.json"), JSON.stringify({ generatedAtUtc: new Date().toISOString(), syntheticOnly: true, variants: result }, null, 2));
process.stdout.write(JSON.stringify({ output: out, files: result.length, pages: result.reduce((sum, file) => sum + file.pageCount, 0) }) + "\n");
