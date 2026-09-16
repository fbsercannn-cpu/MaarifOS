import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createGrowthSpreadsheet } from "../../src/features/growth-measurements/growth-spreadsheet.ts";
import { saveGrowthMeasurement } from "../../src/features/growth-measurements/growth-measurement-service.ts";
import { createClassRosterSpreadsheet } from "../../src/features/classroom/class-roster-spreadsheet.ts";
import { GrowthMemoryStore, addGrowthStudents, growthFixture, growthScope, growthStudents, growthUid } from "../../tests/fixtures/growth-measurements-fixture.mjs";
import { classRosterFixture } from "../../tests/fixtures/class-roster-fixture.mjs";

if (!process.argv[2]) throw new Error("Çıktı klasörü gerekli.");
const directory = resolve(process.argv[2]);
await mkdir(directory, { recursive: true });
const store = new GrowthMemoryStore(addGrowthStudents(growthFixture(), 16));
await saveGrowthMeasurement(store, { ...growthScope, studentId: growthStudents.ada, periodKey: "2026-09", metric: "height", integerValue: 1111, measuredOn: "2026-09-08", source: "school", measurementId: growthUid(88001), selectionEventId: growthUid(88002), expectedSelectionEventId: null, now: new Date("2026-09-08T09:00:00Z") });
await saveGrowthMeasurement(store, { ...growthScope, studentId: growthStudents.ada, periodKey: "2026-09", metric: "weight", integerValue: 18765, measuredOn: "2026-09-09", source: "school", measurementId: growthUid(88003), selectionEventId: growthUid(88004), expectedSelectionEventId: null, now: new Date("2026-09-09T09:00:00Z") });
const growth = createGrowthSpreadsheet(await store.readSnapshot(), "2027-06-30", growthScope, { mode: "class" });
const roster = await createClassRosterSpreadsheet(classRosterFixture(25), { layout: "compact-contact" });
await writeFile(resolve(directory, "growth-linked.xlsx"), growth.bytes);
await writeFile(resolve(directory, "roster-linked.xlsx"), roster.bytes);
console.log(JSON.stringify({ directory, workbooks: 2, growthSourceRows: growth.dataRows.length }));
