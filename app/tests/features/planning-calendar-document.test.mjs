import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync as makeTemp, readFileSync as readFile, rmSync as removeTemp, writeFileSync as writeFile } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { semanticTaggedPdfPageCount } from "../../src/features/documents/semantic-tagged-pdf.ts";
import {
  buildMonthlyWallCalendarModel,
  buildWeeklyDeskPlanModel,
} from "../../src/features/planning/calendar-print-model.ts";
import {
  createMonthRecipe,
  createMonthlyWallCalendarPdf,
  createWeekRecipe,
  createWeeklyDeskPlanPdf,
} from "../../src/features/planning/planning-calendar-pdf.ts";
import { createWeeklyDeskPlanWord } from "../../src/features/planning/planning-calendar-word.ts";
import { readDocxParts } from "../fixtures/word-design-fixtures.mjs";

const ids = {
  year: "00000000-0000-4000-8000-000000009101",
  classroom: "00000000-0000-4000-8000-000000009102",
  otherClassroom: "00000000-0000-4000-8000-000000009103",
  studentA: "00000000-0000-4000-8000-000000009201",
  studentB: "00000000-0000-4000-8000-000000009202",
  week: "00000000-0000-4000-8000-000000009301",
  planA: "00000000-0000-4000-8000-000000009401",
  planB: "00000000-0000-4000-8000-000000009402",
  planEmpty: "00000000-0000-4000-8000-000000009403",
  activityA: "00000000-0000-4000-8000-000000009501",
  activityB: "00000000-0000-4000-8000-000000009502",
  calendar: "00000000-0000-4000-8000-000000009601",
  closure: "00000000-0000-4000-8000-000000009602",
};
const at = "2026-09-10T07:00:00.000Z";
const fontBytes = new Uint8Array(readFile(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const boldFontBytes = new Uint8Array(readFile(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const runtime = { fontBytes, boldFontBytes };

function record(id, civilDate, extra = {}) {
  return { id, createdAt: at, updatedAt: at, civilDate, deletedAt: null, schemaVersion: 1, ...extra };
}

function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(record(ids.year, "2026-09-01", {
    name: "2026–2027 Eğitim Öğretim Yılı", status: "active", startDate: "2026-09-01", operationalStartDate: "2026-09-07", endDate: "2027-06-30",
  }));
  snapshot.classrooms.push(
    record(ids.classroom, "2026-09-01", { academicYearId: ids.year, name: "Güneş Sınıfı", schoolName: "Kurgu Cumhuriyet Anaokulu", teacherName: "Kurgu Emine Öğretmen" }),
    record(ids.otherClassroom, "2026-09-01", { academicYearId: ids.year, name: "Başka Sınıf" }),
  );
  snapshot.settings.push(record(ACTIVE_CLASSROOM_SETTING_ID, "2026-09-10", { settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId: ids.year, classroomId: ids.classroom }));
  snapshot.students.push(
    record(ids.studentA, "2026-09-01", { academicYearId: ids.year, classroomId: ids.classroom, displayName: "Kurgu Ada Öğrenci", active: true }),
    record(ids.studentB, "2026-09-01", { academicYearId: ids.year, classroomId: ids.classroom, displayName: "Kurgu Bora Öğrenci", active: true }),
  );
  snapshot.plans.push(
    record(ids.week, "2026-09-14", {
      academicYearId: ids.year, classroomId: ids.classroom, planType: "weekly", periodStart: "2026-09-14", periodEnd: "2026-09-18",
      teacherContent: { observations: ["Yaprakları büyüklüğüne göre karşılaştırma"] },
    }),
    record(ids.planA, "2026-09-14", { academicYearId: ids.year, classroomId: ids.classroom, planType: "daily", title: "Bahçe yapraklarını inceleme", sourceWeeklyPlanId: ids.week, studentIds: [ids.studentA] }),
    record(ids.planB, "2026-09-15", { academicYearId: ids.year, classroomId: ids.classroom, planType: "daily", title: "Denge parkuru", sourceWeeklyPlanId: ids.week, studentIds: [ids.studentB] }),
    record(ids.planEmpty, "2026-09-16", { academicYearId: ids.year, classroomId: ids.classroom, planType: "daily", title: "Kayıtlı başlık, etkinlik bekliyor", sourceWeeklyPlanId: ids.week, studentIds: [ids.studentA, ids.studentB] }),
    record("00000000-0000-4000-8000-000000009499", "2026-09-14", { academicYearId: ids.year, classroomId: ids.otherClassroom, planType: "daily", title: "GİZLİ BAŞKA SINIF PLANI" }),
  );
  snapshot.activities.push(
    record(ids.activityA, "2026-09-14", {
      academicYearId: ids.year, classroomId: ids.classroom, planId: ids.planA, title: "Yaprak dedektifleri", startTime: "09:30", studentIds: [ids.studentA],
      appliedActivityTemplateSnapshot: { materials: ["Büyüteç", "Kurgu yaprak kartları"] },
    }),
    record(ids.activityB, "2026-09-15", {
      academicYearId: ids.year, classroomId: ids.classroom, planId: ids.planB, title: "Kurgu motor parkuru", startTime: "10:00", studentIds: [ids.studentB], materials: ["Denge tahtası"],
    }),
  );
  snapshot.calendarEntries.push(
    record(ids.calendar, "2026-09-17", { academicYearId: ids.year, classroomId: ids.classroom, title: "Kurgu kütüphane buluşması", entryType: "activity", status: "planned", startDate: "2026-09-17", endDate: "2026-09-17" }),
    record(ids.closure, "2026-09-18", { academicYearId: ids.year, classroomId: ids.classroom, title: "Kurgu yerel hizmet içi çalışma", entryType: "no_school", status: "planned", startDate: "2026-09-18", endDate: "2026-09-18" }),
  );
  return snapshot;
}

function storeFrom(snapshot) {
  return { snapshot, async readSnapshot() { return structuredClone(this.snapshot); } };
}

function pdfText(bytes) {
  if (spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error) return null;
  const directory = makeTemp(path.join(tmpdir(), "maarifos-calendar-pdf-"));
  try {
    const source = path.join(directory, "document.pdf"), target = path.join(directory, "document.txt");
    writeFile(source, bytes); execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", source, target]);
    return readFile(target, "utf8").replaceAll("\r", "");
  } finally { removeTemp(directory, { recursive: true, force: true }); }
}

test("haftalık saf model beş günü, gerçek plan kaynaklarını, öğrenci filtresini ve yerel kapanışı korur", () => {
  const snapshot = fixture();
  const model = buildWeeklyDeskPlanModel(snapshot, { civilDate: "2026-09-16", studentIds: [ids.studentA] });
  assert.equal(model.days.length, 5);
  assert.deepEqual(model.days.map((day) => day.civilDate), ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]);
  assert.deepEqual(model.days[0].items.map((item) => item.title), ["Yaprak dedektifleri"]);
  assert.deepEqual(model.days[0].items[0].materials, ["Büyüteç", "Kurgu yaprak kartları"]);
  assert.deepEqual(model.days[0].items[0].observationFocus, ["Yaprakları büyüklüğüne göre karşılaştırma"]);
  assert.equal(model.days[1].isEmpty, true, "yalnız diğer öğrenciye atanmış plan seçime sızmamalı");
  assert.equal(model.days[2].items[0].kind, "daily-plan", "etkinliği olmayan gerçek günlük plan kaybolmamalı");
  assert.equal(model.days[3].items[0].kind, "calendar-entry");
  assert.equal(model.days[4].isTeachingDay, false);
  assert.equal(model.days[4].schoolDayReason, "local-closure");
  assert.doesNotMatch(JSON.stringify(model), /GİZLİ BAŞKA SINIF PLANI/u);
  assert.throws(() => buildWeeklyDeskPlanModel(snapshot, { civilDate: "2026-09-16", studentIds: ["00000000-0000-4000-8000-000000009999"] }), /etkin sınıf öğrencileri/iu);
});

test("aylık saf model gerçek ay ızgarasını, seçilmiş dönemi ve boş gün sözleşmesini verir", () => {
  const snapshot = fixture();
  const model = buildMonthlyWallCalendarModel(snapshot, { monthKey: "2026-09", periodStart: "2026-09-14", periodEnd: "2026-09-18" });
  assert.equal(model.days.length, 35);
  assert.equal(model.days.filter((day) => day.inMonth).length, 30);
  assert.equal(model.days.find((day) => day.civilDate === "2026-09-14").items[0].planId, ids.planA);
  assert.equal(model.days.find((day) => day.civilDate === "2026-09-10").inSelectedPeriod, false);
  assert.equal(model.days.find((day) => day.civilDate === "2026-09-10").isEmpty, true);
  const changed = structuredClone(snapshot); changed.activities.find((record) => record.id === ids.activityA).title = "Aynı zamanda değiştirilmiş kaynak";
  assert.equal(buildMonthlyWallCalendarModel(changed, { monthKey: "2026-09" }).days.find((day) => day.civilDate === "2026-09-14").items[0].title, "Aynı zamanda değiştirilmiş kaynak");
});

test("haftalık ve aylık PDF yatay A4, seçilebilir Türkçe metin ve gerçek kaynak değerleriyle tek sayfadır", async () => {
  const snapshot = fixture();
  const weekly = buildWeeklyDeskPlanModel(snapshot, { civilDate: "2026-09-16" });
  const monthly = buildMonthlyWallCalendarModel(snapshot, { monthKey: "2026-09" });
  const portraitTemplate = { layout: "official", headerLines: ["Kurgu okul üst bilgisi"], logo: null, signatureLayout: "teacher-right", principalName: "", orientation: "portrait" };
  const [weekFile, monthFile] = await Promise.all([
    createWeeklyDeskPlanPdf(weekly, { schoolTemplate: portraitTemplate, runtime }),
    createMonthlyWallCalendarPdf(monthly, { schoolTemplate: portraitTemplate, runtime }),
  ]);
  for (const [label, file] of [["haftalık", weekFile], ["aylık", monthFile]]) {
    assert.equal(semanticTaggedPdfPageCount(file.bytes), 1, `${label} belge tek sayfa olmalı`);
    const latin = Buffer.from(file.bytes).toString("latin1");
    assert.match(latin, /\/MediaBox \[0 0 841\.89 595\.28\]/u);
    assert.match(latin, /\/Lang \(tr-TR\)/u);
    assert.match(latin, /\/ToUnicode\b/u);
    assert.match(latin, /\/StructTreeRoot\b/u);
  }
  const weekText = pdfText(weekFile.bytes), monthText = pdfText(monthFile.bytes);
  if (weekText && monthText) {
    assert.match(weekText, /Etkinlikler[\s\S]*Yaprak dedektifleri/u);
    assert.match(weekText, /Gözlem odağı[\s\S]*Yaprakları büyüklüğüne göre\s+karşılaştırma/u);
    assert.match(weekText, /Materyaller[\s\S]*Büyüteç/u);
    assert.match(monthText, /Aylık Duvar Takvimi|AYLIK DUVAR TAKVİMİ/u);
    assert.match(monthText, /Kurgu kütüphane\s+buluşması/u);
    assert.doesNotMatch(`${weekText}\n${monthText}`, /GİZLİ BAŞKA SINIF PLANI/u);
  }
});

test("önizleme seçimi kapsamı daraltır, gövde aynı updatedAt ile değişse de indirmeyi reddeder ve Word beş sütunu korur", async () => {
  const store = storeFrom(fixture());
  const recipe = await createWeekRecipe(store, { civilDate: "2026-09-16" }, { runtime });
  assert.deepEqual(recipe.fields.map((field) => field.id), ["activities", "observation-focus", "materials", "calendar-entries"]);
  assert.equal(recipe.students.length, 2);
  assert.deepEqual(recipe.period, { min: "2026-09-14", max: "2026-09-18" });
  const selection = { ...recipe.initial, fields: ["activities"], studentIds: [ids.studentA] };
  const file = await recipe.build(selection);
  await recipe.assertExportAllowed(selection);
  const text = pdfText(file.bytes);
  if (text) {
    assert.match(text, /Yaprak dedektifleri/u);
    assert.doesNotMatch(text, /Kurgu motor parkuru|Büyüteç|Gözlem odağı/u);
  }
  store.snapshot.activities.find((record) => record.id === ids.activityA).title = "Aynı updatedAt ile değiştirilmiş etkinlik";
  await assert.rejects(recipe.assertExportAllowed(selection), /önizlemeden sonra değişti/iu);

  const cleanModel = buildWeeklyDeskPlanModel(fixture(), { civilDate: "2026-09-16" });
  const word = createWeeklyDeskPlanWord(cleanModel);
  const parts = readDocxParts(word.bytes), xml = parts.get("word/document.xml");
  assert.equal(word.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(xml, /w:orient="landscape"/u);
  assert.equal((xml.match(/<w:gridCol /gu) ?? []).length, 5);
  assert.match(xml, /<w:tblHeader\/>/u);
  assert.match(xml, /Etkinlikler/u);
  assert.match(xml, /Gözlem odağı/u);
  assert.match(xml, /Materyaller/u);
  assert.match(xml, /Yaprak dedektifleri/u);

  const monthRecipe = await createMonthRecipe(storeFrom(fixture()), { monthKey: "2026-09" }, { runtime });
  const monthFile = await monthRecipe.build(monthRecipe.initial);
  assert.equal(semanticTaggedPdfPageCount(monthFile.bytes), 1);
  await monthRecipe.assertExportAllowed(monthRecipe.initial);
});
