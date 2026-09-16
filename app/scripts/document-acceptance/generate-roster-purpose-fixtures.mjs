import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClassRosterSpreadsheet } from "../../src/features/classroom/class-roster-spreadsheet.ts";
import { classRosterFixture, classRosterExtremeFixture } from "../../tests/fixtures/class-roster-fixture.mjs";
import { CLASS_ROSTER_LAYOUTS } from "../../src/features/classroom/class-roster-layouts.ts";
if (!process.argv[2]) throw new Error("Çıktı klasörü gerekli.");
const directory = resolve(process.argv[2]);
await mkdir(directory, { recursive: true });
for (const layout of CLASS_ROSTER_LAYOUTS) {
  const input = layout.id === "daily-classroom" ? classRosterFixture(25) : classRosterExtremeFixture();
  const file = await createClassRosterSpreadsheet(input, { layout: layout.id });
  await writeFile(resolve(directory, `${layout.id}.xlsx`), file.bytes);
}
console.log(JSON.stringify({ directory, workbooks: 3 }));
