import assert from "node:assert/strict";
import test from "node:test";

import { COLLECTION_NAMES } from "../../src/core/domain/model.ts";
import {
  ENTITY_RECORD_GUARDS,
  assertEntityRecord,
  createEmptyEntitySnapshot,
  isEntityRecord,
} from "../../src/core/repository/entities.ts";

const base = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 1,
};

const academicYearId = "00000000-0000-4000-8000-000000000901";
const classroomId = "00000000-0000-4000-8000-000000000902";
const studentId = "00000000-0000-4000-8000-000000000903";

const records = {
  academicYears: {
    ...base,
    id: academicYearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  },
  classrooms: {
    ...base,
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
  },
  students: {
    ...base,
    id: studentId,
    academicYearId,
    classroomId,
    displayName: "Ada Kurgu",
  },
  attendanceRecords: {
    ...base,
    id: "00000000-0000-4000-8000-000000000904",
    academicYearId,
    classroomId,
    studentId,
    status: "present",
  },
  observations: {
    ...base,
    id: "00000000-0000-4000-8000-000000000905",
    academicYearId,
    classroomId,
    studentIds: [studentId],
    rawText: "Kurgu nesnel gözlem notu.",
    observedAt: "2026-09-02T06:00:00.000Z",
  },
  calendarEntries: {
    ...base,
    id: "00000000-0000-4000-8000-000000000906",
    academicYearId,
    classroomId,
    title: "Kurgu veli toplantısı",
    entryType: "parent_meeting",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    status: "planned",
  },
};

test("EntityMap ile modellenen altı koleksiyon ortak registry guard'ından geçer", () => {
  for (const [collection, record] of Object.entries(records)) {
    assert.equal(isEntityRecord(collection, record), true, collection);
    assert.doesNotThrow(() => assertEntityRecord(collection, record));
  }
});

test("registry bütün koleksiyonları kapsar ve açık koleksiyonları StoredRecord olarak doğrular", () => {
  assert.deepEqual(Object.keys(ENTITY_RECORD_GUARDS).sort(), [...COLLECTION_NAMES].sort());
  assert.equal(
    isEntityRecord("settings", {
      ...base,
      id: "00000000-0000-4000-8000-000000000907",
      settingType: "kurgu-ayar",
    }),
    true,
  );
});

test("koleksiyon ile kayıt tipi karıştığında ve domain alanı bozulduğunda fail-closed davranır", () => {
  assert.equal(isEntityRecord("students", records.attendanceRecords), false);
  assert.equal(
    isEntityRecord("attendanceRecords", {
      ...records.attendanceRecords,
      status: "izinli",
    }),
    false,
  );
  assert.equal(
    isEntityRecord("calendarEntries", {
      ...records.calendarEntries,
      startDate: "2026-09-11",
      endDate: "2026-09-10",
    }),
    false,
  );
  assert.throws(
    () => assertEntityRecord("classrooms", { ...records.classrooms, name: "" }),
    /sınıf sözleşmesine uymuyor/,
  );
});

test("EntitySnapshot tüm koleksiyonları bağımsız ve boş dizilerle başlatır", () => {
  const snapshot = createEmptyEntitySnapshot();
  assert.deepEqual(Object.keys(snapshot).sort(), [...COLLECTION_NAMES].sort());
  assert.ok(COLLECTION_NAMES.every((collection) => snapshot[collection].length === 0));

  snapshot.students.push(records.students);
  assert.equal(snapshot.students[0].displayName, "Ada Kurgu");
  assert.equal(snapshot.classrooms.length, 0);
});

test("öğrenci guard'ı tolerant profil okuyucusunun atacağı bozuk optional alanları reddeder", () => {
  const invalidStudents = [
    { ...records.students, contacts: "bozuk" },
    { ...records.students, firstName: 42 },
    { ...records.students, academicYearId: "geçersiz" },
    { ...records.students, active: "true" },
    { ...records.students, enrollmentStatus: "beklemede" },
    {
      ...records.students,
      contacts: [{
        id: "00000000-0000-4000-8000-000000000908",
        kind: "mother",
        relationship: "Anne",
        phone: "+905551112233",
      }],
    },
  ];

  assert.ok(
    invalidStudents.every((record) => !isEntityRecord("students", record)),
  );
});

test("takvim guard'ı eksik zorunlu alanı ve sessizce düşürülebilecek optional alanları reddeder", () => {
  const { endDate: _endDate, ...missingEndDate } = records.calendarEntries;
  const invalidEntries = [
    missingEndDate,
    { ...records.calendarEntries, note: 42 },
    { ...records.calendarEntries, note: "" },
    { ...records.calendarEntries, officialEventId: 42 },
    { ...records.calendarEntries, academicYearId: "geçersiz" },
  ];

  assert.ok(
    invalidEntries.every(
      (record) => !isEntityRecord("calendarEntries", record),
    ),
  );
});

test("gözlem guard'ı ilan ettiği bütün optional domain alanlarını fail-closed doğrular", () => {
  const invalidObservations = [
    { ...records.observations, observationType: "yorum" },
    { ...records.observations, observationCategories: "dil" },
    { ...records.observations, observationCategories: ["bilinmeyen"] },
    { ...records.observations, academicYearId: "geçersiz" },
    { ...records.observations, classroomId: 42 },
    { ...records.observations, _MUKERRER_INCELE: false },
    { ...records.observations, duplicateOf: "geçersiz" },
  ];

  assert.ok(
    invalidObservations.every(
      (record) => !isEntityRecord("observations", record),
    ),
  );
});
