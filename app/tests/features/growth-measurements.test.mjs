import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";

import {
  assertGrowthMeasurementSnapshotRelations,
  growthMeasurementRecordsFromSnapshot,
  growthPeriodsForAcademicYear,
  isGrowthMeasurementRecord,
} from "../../src/core/domain/growth-measurements.ts";
import {
  loadGrowthWorkspace,
  saveGrowthMeasurement,
  saveGrowthMeasurementBatch,
  selectGrowthMeasurement,
} from "../../src/features/growth-measurements/growth-measurement-service.ts";
import { DEFAULT_SCHOOL_DOCUMENT_TEMPLATE } from "../../src/core/domain/school-document-template.ts";
import { appendSchoolDocumentTemplate } from "../../src/features/school-document-template/school-document-template-service.ts";
import {
  buildGrowthWorkspace,
  growthAgeMonths,
  growthChartPoints,
  growthChartSegments,
  matchedGrowthChange,
} from "../../src/features/growth-measurements/growth-model.ts";
import { createGrowthPdfDocument } from "../../src/features/growth-measurements/growth-pdf.ts";
import { growthReminders } from "../../src/features/growth-measurements/growth-reminders.ts";
import {
  commitGrowthImport,
  createGrowthSpreadsheet,
  GROWTH_PRINT_DATA_START_ROW,
  GROWTH_PRINT_HEADER_ROW,
  growthImportCandidates,
  readGrowthWorkbook,
  reviewGrowthImport,
} from "../../src/features/growth-measurements/growth-spreadsheet.ts";
import {
  formatGrowthInteger,
  parseGrowthDisplayValue,
  parseGrowthStoredValue,
} from "../../src/features/growth-measurements/growth-value.ts";
import {
  GrowthMemoryStore,
  addGrowthStudents,
  growthFixture,
  growthNow,
  growthScope,
  growthStudents,
  growthUid,
} from "../fixtures/growth-measurements-fixture.mjs";

let identity = 10_000;
const TINY_JPEG_DATA_URL = `data:image/jpeg;base64,${readFileSync("tests/fixtures/document-blank.jpg").toString("base64")}`;
const BOLD_PDF_FONT_BYTES = new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Bold.ttf"));
function identities() {
  return {
    measurementId: growthUid(identity++),
    selectionEventId: growthUid(identity++),
  };
}

function xlsxPackageText(bytes, path) {
  const archive = XLSX.CFB.read(bytes, { type: "array" });
  const entry = XLSX.CFB.find(archive, `Root Entry/${path}`);
  assert.ok(entry?.content, `${path} XLSX paketinde bulunmalı`);
  return new TextDecoder("utf-8").decode(entry.content);
}

function workbookValues(workbook) {
  return workbook.SheetNames.flatMap((name) => Object.entries(workbook.Sheets[name])
    .filter(([address]) => !address.startsWith("!"))
    .map(([, cell]) => cell.v));
}

async function save(store, input) {
  return saveGrowthMeasurement(store, {
    ...growthScope,
    studentId: growthStudents.ada,
    periodKey: "2026-09",
    metric: "height",
    integerValue: 1_100,
    measuredOn: "2026-09-08",
    source: "school",
    expectedSelectionEventId: null,
    now: new Date("2026-09-08T09:00:00.000Z"),
    ...identities(),
    ...input,
  });
}

test("gerçek eğitim yılı dört dönemi tam YYYY-AA ile doğru yıla bağlar", () => {
  const year = growthFixture().academicYears[0];
  const periods = growthPeriodsForAcademicYear(year);
  assert.deepEqual(periods.map((period) => period.key), [
    "2026-09", "2026-12", "2027-03", "2027-06",
  ]);
  assert.deepEqual(periods.map((period) => period.label), [
    "Eylül 2026", "Aralık 2026", "Mart 2027", "Haziran 2027",
  ]);
  assert.deepEqual(periods.map(({ windowStart, windowEnd }) => [windowStart, windowEnd]), [
    ["2026-09-01", "2026-09-30"],
    ["2026-12-01", "2026-12-31"],
    ["2027-03-01", "2027-03-31"],
    ["2027-06-01", "2027-06-30"],
  ]);
});

test("Türkçe virgüllü giriş mm/g tam sayıya kayıpsız döner; sıfır ve belirsiz yazım reddedilir", () => {
  assert.equal(parseGrowthDisplayValue("112,5", "height"), 1_125);
  assert.equal(parseGrowthDisplayValue("19,40", "weight"), 19_400);
  assert.equal(parseGrowthDisplayValue("19.400", "weight"), 19_400);
  assert.equal(parseGrowthStoredValue("1125", "mm", "height"), 1_125);
  assert.equal(formatGrowthInteger(1_125, "height"), "112,5 cm");
  assert.equal(formatGrowthInteger(19_400, "weight"), "19,4 kg");
  for (const invalid of ["0", "-1", "NaN", "1 2", "1,2,3", "1e3"]) {
    assert.throws(() => parseGrowthDisplayValue(invalid, "height"));
  }
  assert.throws(() => parseGrowthDisplayValue("112,55", "height"), /1 ondalık/u);
  assert.throws(() => parseGrowthDisplayValue("19,4001", "weight"), /3 ondalık/u);
});

test("boy ve kilo ayrı tarihler/kaynaklarla saklanır; eksik alan ayrı paydadır", async () => {
  const store = new GrowthMemoryStore();
  await saveGrowthMeasurementBatch(store, [
    {
      ...growthScope, ...identities(), studentId: growthStudents.ada,
      periodKey: "2026-09", metric: "height", integerValue: 1_100,
      measuredOn: "2026-09-05", source: "school", expectedSelectionEventId: null,
      now: new Date("2026-09-10T09:00:00.000Z"),
    },
    {
      ...growthScope, ...identities(), studentId: growthStudents.ada,
      periodKey: "2026-09", metric: "weight", integerValue: 18_500,
      measuredOn: "2026-09-09", source: "family", expectedSelectionEventId: null,
      now: new Date("2026-09-10T09:00:00.000Z"),
    },
  ]);
  await save(store, {
    studentId: growthStudents.bora,
    integerValue: 1_120,
    measuredOn: "2026-09-06",
  });
  const workspace = await loadGrowthWorkspace(store, "2026-09-10");
  const ada = workspace.states.find((state) =>
    state.student.id === growthStudents.ada && state.period.key === "2026-09");
  assert.equal(ada.height.selected.measuredOn, "2026-09-05");
  assert.equal(ada.weight.selected.measuredOn, "2026-09-09");
  assert.equal(ada.height.selected.source, "school");
  assert.equal(ada.weight.selected.source, "family");
  const september = workspace.statistics[0];
  assert.equal(september.expectedN, 3);
  assert.equal(september.height.n, 2);
  assert.equal(september.weight.n, 1);
  assert.equal(september.completeN, 1);
  assert.equal(september.height.mean, 1_110);
  assert.equal(september.height.median, 1_110);
  assert.deepEqual(september.heightSources, { school: 2, family: 0, document: 0 });
  assert.deepEqual(september.weightSources, { school: 0, family: 1, document: 0 });
});

test("geç katılım ve ayrılık her dönem paydasını tarihli üyelikten kurar", () => {
  const workspace = buildGrowthWorkspace(growthFixture(), "2027-06-15");
  const state = (studentId, periodKey) => workspace.states.find((item) =>
    item.student.id === studentId && item.period.key === periodKey);
  assert.equal(state(growthStudents.cem, "2026-09").membership, "out-of-scope");
  assert.equal(state(growthStudents.cem, "2027-06").membership, "included");
  assert.equal(state(growthStudents.deniz, "2026-12").membership, "included");
  assert.equal(state(growthStudents.deniz, "2027-03").membership, "out-of-scope");
  assert.equal(workspace.statistics[0].expectedN, 3);
  assert.equal(workspace.statistics.at(-1).expectedN, 3);
});

test("aynı çocukların Eylül-Haziran değişimi 4,75 cm; yalnız Hazirandaki çocuk eşleşmeye katılmaz", async () => {
  const store = new GrowthMemoryStore();
  for (const [studentId, september, june] of [
    [growthStudents.ada, 1_100, 1_150],
    [growthStudents.bora, 1_120, 1_165],
  ]) {
    await save(store, { studentId, integerValue: september, measuredOn: "2026-09-08" });
    await save(store, {
      studentId, periodKey: "2027-06", integerValue: june,
      measuredOn: "2027-06-18", now: new Date("2027-06-18T09:00:00.000Z"),
    });
  }
  await save(store, {
    studentId: growthStudents.cem, periodKey: "2027-06", integerValue: 1_180,
    measuredOn: "2027-06-19", now: new Date("2027-06-19T09:00:00.000Z"),
  });
  const workspace = await loadGrowthWorkspace(store, "2027-06-30");
  assert.equal(workspace.statistics.at(-1).height.n, 3);
  const change = matchedGrowthChange(workspace, "2026-09", "2027-06", "height");
  assert.equal(change.matchedN, 2);
  assert.equal(change.meanChange, 47.5);
  assert.equal(formatGrowthInteger(change.meanChange, "height", { signed: true }), "+4,75 cm");
  const points = growthChartPoints(workspace, growthStudents.ada, "height");
  assert.deepEqual(growthChartSegments(points).map((segment) => segment.length), [1, 1]);
  assert.equal(growthAgeMonths(workspace.students.find((item) => item.id === growthStudents.ada), "2027-06-18"), 72);
  assert.equal(growthAgeMonths(workspace.students.find((item) => item.id === growthStudents.cem), "2027-06-18"), null);
});

test("gelecek dönem gecikmiş gösterilmez; başlamadan kayıt da yapılamaz", async () => {
  const store = new GrowthMemoryStore();
  const reminders = growthReminders(await store.readSnapshot(), "2026-09-08");
  assert.equal(reminders.length, 1);
  assert.match(reminders[0].title, /Eylül 2026/u);
  assert.doesNotMatch(reminders[0].title, /Mart|Haziran/u);
  await assert.rejects(save(store, {
    periodKey: "2026-12",
    measuredOn: "2026-09-08",
  }), /başlamamış/u);
  assert.equal(growthMeasurementRecordsFromSnapshot(await store.readSnapshot()).length, 0);
});

test("Aralık telafisi Ocak gerçek tarihini korur ve durumunu telafi gösterir", async () => {
  const store = new GrowthMemoryStore();
  await save(store, {
    periodKey: "2026-12", measuredOn: "2027-01-05",
    now: new Date("2027-01-05T09:00:00.000Z"),
  });
  const workspace = await loadGrowthWorkspace(store, "2027-01-05");
  const state = workspace.states.find((item) =>
    item.student.id === growthStudents.ada && item.period.key === "2026-12");
  assert.equal(state.height.selected.measuredOn, "2027-01-05");
  assert.equal(state.status, "recovery");
});

test("tekrar/düzeltme eklemeli geçmişi korur; açık seçim ve eski sekme çakışması kayıp yazmaz", async () => {
  const store = new GrowthMemoryStore();
  const initial = await save(store, {});
  const repeat = await save(store, {
    integerValue: 1_105,
    repeatOfId: initial.measurement.id,
    expectedSelectionEventId: initial.selection.id,
    now: new Date("2026-09-08T09:01:00.000Z"),
  });
  const correction = await save(store, {
    integerValue: 1_104,
    correction: { correctsId: repeat.measurement.id, reason: "Kurgu yazım denetimi" },
    expectedSelectionEventId: repeat.selection.id,
    now: new Date("2026-09-08T09:02:00.000Z"),
  });
  const manual = await selectGrowthMeasurement(store, {
    ...growthScope,
    studentId: growthStudents.ada,
    periodKey: "2026-09",
    metric: "height",
    selectedMeasurementId: initial.measurement.id,
    expectedSelectionEventId: correction.selection.id,
    reason: "manual-review",
    selectionEventId: growthUid(identity++),
    now: new Date("2026-09-08T09:03:00.000Z"),
  });
  const firstSnapshot = await store.readSnapshot();
  assert.equal(buildGrowthWorkspace(firstSnapshot, "2026-09-08").states[0].height.selected.id, initial.measurement.id);
  assert.ok(firstSnapshot.settings.some((record) => record.id === repeat.measurement.id));
  assert.ok(firstSnapshot.settings.some((record) => record.id === correction.measurement.id));

  const competing = [1_111, 1_112].map((integerValue) => save(store, {
    integerValue,
    repeatOfId: initial.measurement.id,
    expectedSelectionEventId: manual.id,
    now: new Date("2026-09-08T09:04:00.000Z"),
  }));
  const results = await Promise.allSettled(competing);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.match(results.find((result) => result.status === "rejected").reason.message, /başka bir sekmede/u);
  assert.equal(growthMeasurementRecordsFromSnapshot(await store.readSnapshot()).length, 9);
});

test("toplu kayıt ikinci satırda bozulursa ilk satırı da yazmaz", async () => {
  const store = new GrowthMemoryStore();
  const before = await store.readSnapshot();
  await assert.rejects(saveGrowthMeasurementBatch(store, [
    {
      ...growthScope, ...identities(), studentId: growthStudents.ada,
      periodKey: "2026-09", metric: "height", integerValue: 1_100,
      measuredOn: "2026-09-08", source: "school", expectedSelectionEventId: null,
      now: new Date("2026-09-08T09:00:00.000Z"),
    },
    {
      ...growthScope, ...identities(), studentId: growthStudents.ada,
      periodKey: "2026-09", metric: "weight", integerValue: 0,
      measuredOn: "2026-09-08", source: "school", expectedSelectionEventId: null,
      now: new Date("2026-09-08T09:00:00.000Z"),
    },
  ]), /sıfırdan büyük/u);
  assert.deepEqual(await store.readSnapshot(), before);
});

test("strict validator extra key, kendi referansı, çapraz çocuk bağı ve seçim çatalını reddeder", async () => {
  const store = new GrowthMemoryStore();
  const initial = await save(store, {});
  assert.equal(isGrowthMeasurementRecord({ ...initial.measurement, extra: true }), false);
  assert.equal(isGrowthMeasurementRecord({ ...initial.measurement, measuredBy: " Kurgu Öğretmen" }), false);
  assert.equal(isGrowthMeasurementRecord({ ...initial.measurement, civilDate: "2026-09-10" }), false);
  assert.equal(isGrowthMeasurementRecord({ ...initial.measurement, documentDate: "2026-09-08" }), false);

  const selfLinked = await store.readSnapshot();
  const value = selfLinked.settings.find((record) => record.id === initial.measurement.id);
  value.repeatOfId = value.id;
  assert.throws(() => assertGrowthMeasurementSnapshotRelations(selfLinked), /kaynağı/u);

  const crossChild = await store.readSnapshot();
  const foreignIds = identities();
  const foreign = {
    ...initial.measurement,
    id: foreignIds.measurementId,
    studentId: growthStudents.bora,
  };
  const foreignSelection = {
    ...initial.selection,
    id: foreignIds.selectionEventId,
    studentId: growthStudents.bora,
    selectedMeasurementId: foreignIds.measurementId,
  };
  crossChild.settings.push(foreign, foreignSelection);
  const originalSelection = crossChild.settings.find((record) => record.id === initial.selection.id);
  originalSelection.selectedMeasurementId = foreign.id;
  assert.throws(() => assertGrowthMeasurementSnapshotRelations(crossChild), /başka çocuk/u);

  const fork = await store.readSnapshot();
  fork.settings.push({
    ...initial.selection,
    id: growthUid(identity++),
    previousSelectionEventId: initial.selection.id,
    selectionReason: "manual-review",
    createdAt: "2026-09-08T09:01:00.000Z",
    updatedAt: "2026-09-08T09:01:00.000Z",
  }, {
    ...initial.selection,
    id: growthUid(identity++),
    previousSelectionEventId: initial.selection.id,
    selectionReason: "manual-review",
    createdAt: "2026-09-08T09:02:00.000Z",
    updatedAt: "2026-09-08T09:02:00.000Z",
  });
  assert.throws(() => assertGrowthMeasurementSnapshotRelations(fork), /çatallanmış/u);
});

test("önceki eğitim yılı ölçümleri aktif yılın çalışma alanına karışmaz", async () => {
  const snapshot = growthFixture();
  const oldScope = { academicYearId: growthUid(50), classroomId: growthUid(51) };
  const base = { createdAt: "2025-09-01T06:00:00.000Z", updatedAt: "2025-09-01T06:00:00.000Z", civilDate: "2025-09-01", schemaVersion: 1, deletedAt: null };
  snapshot.academicYears.push({ ...base, id: oldScope.academicYearId, name: "2025–2026", startDate: "2025-09-01", operationalStartDate: "2025-09-01", endDate: "2026-06-30", status: "active" });
  snapshot.classrooms.push({ ...base, id: oldScope.classroomId, academicYearId: oldScope.academicYearId, name: "Eski Kurgu Sınıfı" });
  const oldStudent = { ...base, ...oldScope, id: growthUid(52), displayName: "Kurgu Eski Çocuk", active: true, enrollments: [{ id: growthUid(53), ...oldScope, startedOn: "2025-09-01", status: "active", schemaVersion: 1 }] };
  snapshot.students.push(oldStudent);
  const active = snapshot.settings.find((record) => record.settingType === "active-classroom-selection");
  Object.assign(active, oldScope);
  const store = new GrowthMemoryStore(snapshot);
  await saveGrowthMeasurement(store, {
    ...oldScope, ...identities(), studentId: oldStudent.id, periodKey: "2025-09",
    metric: "height", integerValue: 1_020, measuredOn: "2025-09-08", source: "school",
    expectedSelectionEventId: null, now: new Date("2025-09-08T09:00:00.000Z"),
  });
  Object.assign(store.snapshot.settings.find((record) => record.settingType === "active-classroom-selection"), growthScope);
  const workspace = await loadGrowthWorkspace(store, "2026-09-08");
  assert.ok(workspace.records.every((record) => record.academicYearId === growthScope.academicYearId));
  assert.ok(workspace.students.every((student) => student.id !== oldStudent.id));
});

test("XLSX aktarımı alan türlerini, gerçek baskı ayarını ve kayıpsız içe aktarma turunu korur", async () => {
  const source = new GrowthMemoryStore();
  await save(source, { measuredBy: "Kurgu Öğretmen", instrument: "Kurgu mezura" });
  const file = createGrowthSpreadsheet(await source.readSnapshot(), "2026-09-08", growthScope);
  assert.equal(Buffer.from(file.bytes.subarray(0, 2)).toString("latin1"), "PK");
  const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true, cellStyles: true });
  assert.deepEqual(workbook.SheetNames, ["Aktarılabilir veri", "Baskı çizelgesi"]);
  const dataSheet = workbook.Sheets["Aktarılabilir veri"];
  const printSheet = workbook.Sheets["Baskı çizelgesi"];
  assert.equal(dataSheet["!merges"], undefined);
  assert.equal(dataSheet.B2.t, "s");
  assert.equal(dataSheet.B2.v, growthStudents.ada);
  assert.equal(dataSheet.H2.t, "n");
  assert.equal(dataSheet.H2.v, 1_100);
  assert.equal(dataSheet.J2.t, "d");
  assert.equal(dataSheet.J2.v.toISOString().slice(0, 10), "2026-09-08");
  assert.equal(printSheet.A1.v, "SINIF BOY–KİLO ÖLÇÜM ÇİZELGESİ · TÜM YIL");
  assert.equal(printSheet.A2.v, "Kurgu Anaokulu");
  assert.equal(printSheet.A3.v, "Sınıf: Kurgu Deniz Sınıfı · Eğitim yılı: 2026–2027 Kurgu Eğitim Yılı · Kapsam: Tüm yıl");
  assert.equal(printSheet[`A${GROWTH_PRINT_DATA_START_ROW}`].t, "n");
  assert.equal(printSheet[`A${GROWTH_PRINT_DATA_START_ROW}`].v, 1);
  assert.equal(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].t, "n");
  assert.equal(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].v, 110);
  assert.match(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].f, /INDEX\('Aktarılabilir veri'!\$H\$2:\$H\$2,MATCH\(/u);
  assert.ok(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].f.includes(dataSheet.A2.v));
  assert.match(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].f, /\/10\)\)$/u);
  assert.match(printSheet[`E${GROWTH_PRINT_DATA_START_ROW}`].f, /INDEX\('Aktarılabilir veri'!\$J\$2:\$J\$2,MATCH\(/u);
  assert.match(printSheet[`B${GROWTH_PRINT_DATA_START_ROW}`].f, /INDEX\('Aktarılabilir veri'!\$C\$2:\$C\$2,MATCH\(/u);
  assert.equal(dataSheet.H2.f, undefined);
  assert.equal(printSheet[`E${GROWTH_PRINT_DATA_START_ROW}`].t, "d");
  assert.equal(printSheet[`E${GROWTH_PRINT_DATA_START_ROW}`].v.toISOString().slice(0, 10), "2026-09-08");
  assert.equal(printSheet.A22.v, "Okul Öncesi Öğretmeni: Kurgu Öğretmen");
  assert.equal(printSheet.D22.v, "Tarih: 08.09.2026");
  assert.equal(printSheet.F22.v, "İmza: ____________________");
  assert.equal(printSheet["!ref"], "A1:G22");

  const printXml = xlsxPackageText(file.bytes, "xl/worksheets/sheet2.xml");
  const workbookXml = xlsxPackageText(file.bytes, "xl/workbook.xml");
  const stylesXml = xlsxPackageText(file.bytes, "xl/styles.xml");
  assert.match(workbookXml, /<workbookView activeTab="1"\/>/u);
  assert.match(workbookXml, /<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"\/>/u);
  assert.match(printSheet[`D${GROWTH_PRINT_DATA_START_ROW}`].f, /COUNTIFS\(.+<>1,NA\(\),IF\(.+="",""/u);
  assert.match(printXml, /<pageSetUpPr fitToPage="1"\/>/u);
  assert.match(printXml, /<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/u);
  assert.match(printXml, new RegExp(`<pane xSplit="2" ySplit="${GROWTH_PRINT_HEADER_ROW}"[^>]+state="frozen"`, "u"));
  assert.match(workbookXml, /_xlnm\.Print_Area[^<]+Baskı çizelgesi[^<]+\$A\$1:\$G\$22/u);
  assert.match(workbookXml, new RegExp(`_xlnm\\.Print_Titles[^<]+\\$A:\\$B[^<]+\\$1:\\$${GROWTH_PRINT_HEADER_ROW}`, "u"));
  assert.match(stylesXml, /formatCode="dd&quot;\.&quot;mm&quot;\.&quot;yyyy"/u);
  assert.match(stylesXml, /wrapText="1"/u);
  assert.match(stylesXml, /FF42C7BD|FFCFEFEB/u);
  for (const column of ["D", "E", "F", "G"]) {
    const blankAddress = `${column}${GROWTH_PRINT_DATA_START_ROW + 1}`;
    assert.equal(printSheet[blankAddress].t, "s", `${blankAddress} biçimli boş metin hücresi olmalı`);
    assert.equal(printSheet[blankAddress].v, "", `${blankAddress} sıfır veya ölçüm değeri üretmemeli`);
    assert.match(printXml, new RegExp(`<c[^>]*r="${blankAddress}"[^>]*s="(?:1[7-9]|2[0-2])"`, "u"));
  }

  const sheets = readGrowthWorkbook(file.bytes.buffer, file.fileName);
  const data = sheets.find((sheet) => sheet.name === "Aktarılabilir veri");
  const candidates = growthImportCandidates(data, data.suggestedHeader, data.suggestedMapping);
  assert.equal(candidates.length, 1);
  const target = new GrowthMemoryStore();
  const renamed = [{
    ...candidates[0],
    values: { ...candidates[0].values, displayName: "Dosyada Farklı Ad" },
  }];
  const review = reviewGrowthImport(renamed, await target.readSnapshot(), growthScope, "2026-09-08");
  assert.equal(review[0].errors.length, 0);
  assert.match(review[0].warnings.join(" "), /ad farklı/u);
  await commitGrowthImport(target, {
    reviews: review,
    selectedSourceRows: [review[0].candidate.sourceRow],
    now: new Date("2026-09-08T09:05:00.000Z"),
  });
  const imported = growthMeasurementRecordsFromSnapshot(await target.readSnapshot());
  assert.equal(imported.length, 2);
  assert.equal(imported.find((record) => record.eventKind !== "selection").integerValue, 1_100);

  const wrongIdentity = [{
    ...candidates[0],
    values: { ...candidates[0].values, studentId: growthUid(999_999) },
  }];
  const rejected = reviewGrowthImport(wrongIdentity, await target.readSnapshot(), growthScope, "2026-09-08");
  assert.match(rejected[0].errors.join(" "), /anahtarı/u);
});

test("XLSX seçili dönem kapsamı veri, baskı, metadata ve dosya adından diğer dönemleri tamamen çıkarır", async () => {
  const source = new GrowthMemoryStore();
  await save(source, { integerValue: 1_111, measuredOn: "2026-09-09", now: new Date("2026-09-09T09:00:00.000Z") });
  await save(source, {
    periodKey: "2026-12",
    metric: "weight",
    integerValue: 98_765,
    measuredOn: "2026-12-12",
    now: new Date("2026-12-12T09:00:00.000Z"),
  });
  const snapshot = await source.readSnapshot();
  const file = createGrowthSpreadsheet(snapshot, "2027-06-30", growthScope, {
    mode: "class",
    periodKey: "2026-09",
  });
  assert.match(file.fileName, /Eylul_2026\.xlsx$/u);
  assert.ok(file.dataRows.every((row) => row[5] === "2026-09"));
  assert.ok(file.printRows.filter((row) => /^\d+$/u.test(row[0] ?? "")).every((row) => row[2] === "Eylül 2026"));

  const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true, cellStyles: true });
  const values = workbookValues(workbook);
  const packageText = [
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "docProps/core.xml",
    "docProps/custom.xml",
  ].map((path) => xlsxPackageText(file.bytes, path)).join(" ");
  assert.ok(values.includes(1_111));
  assert.ok(values.includes("2026-09"));
  assert.ok(values.includes("Eylül 2026"));
  assert.ok(!values.includes(98_765));
  assert.ok(!values.includes("2026-12"));
  assert.ok(!values.includes("Aralık 2026"));
  assert.doesNotMatch(packageText, /98765|2026-12|Aralık 2026/u);
  assert.match(packageText, /Eylül 2026/u);
  assert.equal(workbook.Props.Title, "Boy-kilo ölçüm çizelgesi · Eylül 2026");

  const data = readGrowthWorkbook(file.bytes.buffer, file.fileName)
    .find((sheet) => sheet.name === "Aktarılabilir veri");
  const candidates = growthImportCandidates(data, data.suggestedHeader, data.suggestedMapping);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].values.periodKey, "2026-09");
  assert.throws(() => createGrowthSpreadsheet(snapshot, "2027-06-30", growthScope, {
    mode: "class",
    periodKey: "2026-10",
  }), /baskı dönemi/u);
});

test("XLSX bireysel kapsamı diğer çocuğun adını, anahtarını ve ölçümünü hiçbir sayfaya taşımaz", async () => {
  const source = new GrowthMemoryStore();
  await save(source, { studentId: growthStudents.ada, integerValue: 1_111 });
  await save(source, {
    studentId: growthStudents.bora,
    metric: "weight",
    integerValue: 19_987,
    measuredOn: "2026-09-07",
  });
  const snapshot = await source.readSnapshot();
  const individual = createGrowthSpreadsheet(snapshot, "2026-09-08", growthScope, {
    mode: "individual",
    studentId: growthStudents.ada,
  });
  const individualBook = XLSX.read(individual.bytes, { type: "array", cellDates: true });
  const values = workbookValues(individualBook);
  assert.ok(values.includes("Kurgu Ada"));
  assert.ok(values.includes(growthStudents.ada));
  assert.ok(!values.includes("Kurgu Bora"));
  assert.ok(!values.includes(growthStudents.bora));
  assert.ok(!values.includes(19_987));
  assert.ok(individual.dataRows.every((row) => row[1] === growthStudents.ada));
  assert.ok(individual.printRows.filter((row) => /^\d+$/u.test(row[0] ?? "")).every((row) => row[1] === "Kurgu Ada"));
  assert.match(individual.fileName, /Kurgu_Ada/u);

  const data = readGrowthWorkbook(individual.bytes.buffer, individual.fileName)
    .find((sheet) => sheet.name === "Aktarılabilir veri");
  const candidates = growthImportCandidates(data, data.suggestedHeader, data.suggestedMapping);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].values.studentId, growthStudents.ada);

  const classFile = createGrowthSpreadsheet(snapshot, "2026-09-08", growthScope, { mode: "class" });
  const classValues = workbookValues(XLSX.read(classFile.bytes, { type: "array" }));
  assert.ok(classValues.includes("Kurgu Bora"));
  assert.ok(classValues.includes(growthStudents.bora));
  assert.ok(classValues.includes(19_987));
  assert.throws(() => createGrowthSpreadsheet(snapshot, "2026-09-08", growthScope, {
    mode: "individual",
    studentId: growthUid(999_998),
  }), /açık sınıf/u);
});

test("40 çocuklu XLSX baskı çizelgesi uzun adı sarar ve yeterli satır yüksekliği ayırır", () => {
  const snapshot = addGrowthStudents(growthFixture(), 40);
  const longSchoolName = `Kurgu ${"Gökkuşağı Anaokulu ".repeat(9)}`.trim();
  const longClassroomName = `Kurgu ${"Deniz Yıldız Çınar Sınıfı ".repeat(7)}`.trim();
  const longAcademicYearName = `2026–2027 ${"Kurgu Eğitim Yılı ".repeat(7)}`.trim();
  snapshot.classrooms[0].schoolName = longSchoolName;
  snapshot.classrooms[0].name = longClassroomName;
  snapshot.academicYears[0].name = longAcademicYearName;
  const file = createGrowthSpreadsheet(snapshot, "2027-06-30", growthScope);
  const workbook = XLSX.read(file.bytes, { type: "array", cellStyles: true });
  const sheet = workbook.Sheets["Baskı çizelgesi"];
  const longRowIndex = file.printRows.findIndex((row) => row[1]?.includes("Çok Uzun İsimli"));
  assert.ok(longRowIndex > 0);
  const excelRow = longRowIndex + 1;
  assert.equal(sheet.A2.v, longSchoolName);
  assert.equal(sheet.A3.v, `Sınıf: ${longClassroomName} · Eğitim yılı: ${longAcademicYearName} · Kapsam: Tüm yıl`);
  assert.ok(sheet["!rows"][1].hpt > 28);
  assert.ok(sheet["!rows"][2].hpt > 28);
  assert.ok(sheet["!rows"][excelRow - 1].hpt > 24);
  assert.equal(sheet["!ref"], "A1:G166");
  const printXml = xlsxPackageText(file.bytes, "xl/worksheets/sheet2.xml");
  assert.match(printXml, new RegExp(`<c r="B${excelRow}"[^>]+s="(?:11|12)"`, "u"));
  assert.match(printXml, new RegExp(`<row r="${excelRow}"[^>]+ht="[3-9][0-9]`, "u"));
  const breaks = [...printXml.matchAll(/<brk id="([0-9]+)"/gu)].map(match => Number(match[1]));
  assert.ok(breaks.length > 0);
  assert.ok(breaks.every(row => row >= GROWTH_PRINT_HEADER_ROW && (row - GROWTH_PRINT_HEADER_ROW) % 4 === 0), "Baskı sayfası çocuğun dört dönemlik grubu arasında kesilmemeli");
  assert.ok(printXml.indexOf("<rowBreaks") < printXml.indexOf("<ignoredErrors"), "OOXML sayfa sonları Excel'in beklediği sırada olmalı");
});

test("1 ve 30 çocuklu yatay sınıf/boş çizelge gerçek, etiketli ve çok sayfalı PDF üretir", async () => {
  const fontBytes = new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf"));
  const one = growthFixture();
  const oneFile = await createGrowthPdfDocument(one, "2027-06-30", {
    template: "class",
    studentIds: [growthStudents.ada],
    generatedAt: "2027-06-30T09:00:00.000Z",
  }, { fontBytes, boldFontBytes: BOLD_PDF_FONT_BYTES });
  assert.equal(Buffer.from(oneFile.bytes.subarray(0, 8)).toString("latin1"), "%PDF-1.7");
  assert.match(Buffer.from(oneFile.bytes).toString("latin1"), /\/StructTreeRoot\b/u);
  assert.equal((await PDFDocument.load(oneFile.bytes)).getTitle(), "MaarifOS Sınıf Boy-Kilo Çizelgesi · Tüm yıl");

  const many = addGrowthStudents(growthFixture(), 30);
  const manyFile = await createGrowthPdfDocument(many, "2027-06-30", {
    template: "blank",
    generatedAt: "2027-06-30T09:00:00.000Z",
  }, { fontBytes, boldFontBytes: BOLD_PDF_FONT_BYTES });
  const pdf = Buffer.from(manyFile.bytes).toString("latin1");
  assert.ok((pdf.match(/\/Type \/Page\b/gu) ?? []).length > 1);
  assert.match(pdf, /\/Scope \/Column\b/u);
  assert.match(pdf, /\/Scope \/Row\b/u);
  assert.doesNotMatch(pdf, /\/Subtype \/Image\b/u);
});

test("bireysel PDF yalnız seçilen çocuğu, kaynakları ve seçilen açıklamayı çizer", async () => {
  const store = new GrowthMemoryStore();
  await save(store, {
    conditionsNote: "KURGU ÖZEL AİLE NOTU PDF'YE GİRMEMELİ",
    source: "family",
  });
  const rendered = [];
  const context = {
    beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillRect() {},
    moveTo() {}, lineTo() {}, arc() {},
    fillText(value) { rendered.push(String(value)); },
    measureText(value) { return { width: String(value).length * 10 }; },
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "round",
    lineCap: "round", font: "", textAlign: "left",
  };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => TINY_JPEG_DATA_URL,
  };
  const file = await createGrowthPdfDocument(await store.readSnapshot(), "2026-09-08", {
    template: "individual",
    studentId: growthStudents.ada,
    explanation: "Kurgu öğretmen açıklaması.",
    generatedAt: "2026-09-08T09:10:00.000Z",
  }, {
    createCanvas: () => fakeCanvas,
    fontBytes: new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")),
  });
  const text = rendered.join(" ");
  assert.equal(Buffer.from(file.bytes.subarray(0, 8)).toString("latin1"), "%PDF-1.7");
  assert.match(Buffer.from(file.bytes).toString("latin1"), /\/StructTreeRoot\b/u);
  const pdf = await PDFDocument.load(file.bytes);
  assert.equal(pdf.getTitle(), "MaarifOS Bireysel Boy-Kilo Belgesi · Tüm yıl");
  assert.doesNotMatch(pdf.getTitle(), /Kurgu Ada/u);
  assert.match(text, /Kurgu Ada/u);
  assert.match(text, /Aile bildirdi/u);
  assert.match(text, /Kurgu öğretmen açıklaması/u);
  assert.doesNotMatch(text, /Kurgu Bora/u);
  assert.doesNotMatch(text, /ÖZEL AİLE NOTU/u);
});

test("PDF seçili dönem başlık, dosya adı, grafik ve tablo içeriğinden diğer dönem ölçümlerini çıkarır", async () => {
  const store = new GrowthMemoryStore();
  await save(store, { integerValue: 1_111, measuredOn: "2026-09-09", now: new Date("2026-09-09T09:00:00.000Z") });
  await save(store, {
    periodKey: "2026-12",
    metric: "weight",
    integerValue: 98_765,
    measuredOn: "2026-12-12",
    now: new Date("2026-12-12T09:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const rendered = [];
  const context = {
    beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillRect() {},
    moveTo() {}, lineTo() {}, arc() {},
    fillText(value) { rendered.push(String(value)); },
    measureText(value) { return { width: String(value).length * 10 }; },
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "round",
    lineCap: "round", font: "", textAlign: "left",
  };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => TINY_JPEG_DATA_URL,
  };
  const individual = await createGrowthPdfDocument(snapshot, "2027-06-30", {
    template: "individual",
    studentId: growthStudents.ada,
    periodKey: "2026-09",
    generatedAt: "2027-06-30T09:10:00.000Z",
  }, {
    createCanvas: () => fakeCanvas,
    fontBytes: new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")),
  });
  const individualText = rendered.join(" ");
  assert.match(individual.fileName, /Eylul_2026\.pdf$/u);
  assert.equal((await PDFDocument.load(individual.bytes)).getTitle(), "MaarifOS Bireysel Boy-Kilo Belgesi · Eylül 2026");
  assert.match(individualText, /Eylül 2026/u);
  assert.match(individualText, /111,1 cm/u);
  assert.doesNotMatch(individualText, /Aralık 2026|98,765 kg|12\.12\.2026/u);

  const classFile = await createGrowthPdfDocument(snapshot, "2027-06-30", {
    template: "class",
    studentIds: [growthStudents.ada],
    periodKey: "2026-09",
    generatedAt: "2027-06-30T09:10:00.000Z",
  }, {
    fontBytes: new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")),
    boldFontBytes: BOLD_PDF_FONT_BYTES,
  });
  assert.match(classFile.fileName, /Eylul_2026\.pdf$/u);
  assert.equal((await PDFDocument.load(classFile.bytes)).getTitle(), "MaarifOS Sınıf Boy-Kilo Çizelgesi · Eylül 2026");
  await assert.rejects(createGrowthPdfDocument(snapshot, "2027-06-30", {
    template: "class",
    periodKey: "2026-10",
  }), /baskı dönemi/u);
});

test("kayıtlı okul şablonu sınıf çizelgesine ve bireysel grafikli belgeye uygulanır", async () => {
  const store = new GrowthMemoryStore();
  await appendSchoolDocumentTemplate(store, {
    template: {
      ...DEFAULT_SCHOOL_DOCUMENT_TEMPLATE,
      headerLines: ["Kurgu İlçe Eğitim Müdürlüğü", "Kurgu Anaokulu"],
      signatureLayout: "teacher-and-principal",
      principalName: "KURGU MÜDÜR",
      orientation: "portrait",
    },
    expectedScope: growthScope,
    expectedHead: null,
    now: growthNow,
  });
  const snapshot = await store.readSnapshot();
  const fontBytes = new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf"));
  const classFile = await createGrowthPdfDocument(snapshot, "2027-06-30", {
    template: "class",
    studentIds: [growthStudents.ada],
    generatedAt: "2027-06-30T09:05:00.000Z",
  }, { fontBytes, boldFontBytes: BOLD_PDF_FONT_BYTES });
  assert.equal(Buffer.from(classFile.bytes.subarray(0, 8)).toString("latin1"), "%PDF-1.7");

  const rendered = [];
  const context = {
    beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillRect() {}, drawImage() {},
    moveTo() {}, lineTo() {}, arc() {},
    fillText(value) { rendered.push(String(value)); },
    measureText(value) { return { width: String(value).length * 10 }; },
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "round",
    lineCap: "round", font: "", textAlign: "left",
  };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => TINY_JPEG_DATA_URL,
  };
  await createGrowthPdfDocument(snapshot, "2027-06-30", {
    template: "individual",
    studentId: growthStudents.ada,
    generatedAt: "2027-06-30T09:05:00.000Z",
  }, { createCanvas: () => fakeCanvas, fontBytes });
  const text = rendered.join(" ");
  assert.match(text, /Kurgu İlçe Eğitim Müdürlüğü/u);
  assert.match(text, /Kurgu Müdür/u);
  assert.match(text, /Kurgu Öğretmen/u);
});
