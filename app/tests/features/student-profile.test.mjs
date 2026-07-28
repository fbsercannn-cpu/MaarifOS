import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDENT_PROFILE_SCHEMA_VERSION,
  ageInMonthsOn,
  normalizeStudentProfile,
  studentProfileFromRecord,
} from "../../src/core/domain/student.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { persistStudentRosterChange } from "../../src/features/dashboard/dashboard-data.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

test("öğrenci profilini Türkçe öğretmen kullanımına uygun ve veri-minimum biçimde normalleştirir", () => {
  const profile = normalizeStudentProfile(
    {
      displayName: "  Deniz Yılmaz  ",
      preferredName: "  Deniz  ",
      birthDate: "2021-04-18",
      optionalCode: "  KELEBEK-07  ",
      enrollmentDate: "  2025-09-01  ",
      homeLanguages: "  Türkçe, İngilizce  ",
      interests: "  Su deneyleri ve ritim oyunları  ",
      strengths: "  Akranlarını oyuna davet ediyor  ",
      supportPreferences: "  Geçişlerden önce kısa bir görsel hatırlatma sunulması yardımcı oluyor.  ",
    },
    "2026-07-28",
  );

  assert.deepEqual(profile, {
    displayName: "Deniz Yılmaz",
    preferredName: "Deniz",
    birthDate: "2021-04-18",
    optionalCode: "KELEBEK-07",
    enrollmentDate: "2025-09-01",
    homeLanguages: "Türkçe, İngilizce",
    interests: "Su deneyleri ve ritim oyunları",
    strengths: "Akranlarını oyuna davet ediyor",
    supportPreferences:
      "Geçişlerden önce kısa bir görsel hatırlatma sunulması yardımcı oluyor.",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("gelecek tarihleri, doğumdan önce kaydı ve kimlik numarası gibi uzun sayısal kodu reddeder", () => {
  assert.throws(
    () =>
      normalizeStudentProfile(
        { displayName: "Deniz Yılmaz", birthDate: "2027-01-01" },
        "2026-07-28",
      ),
    /gelecekte olamaz/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        { displayName: "Deniz Yılmaz", optionalCode: "12345678901" },
        "2026-07-28",
      ),
    /kimlik numarası/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        {
          displayName: "Deniz Yılmaz",
          birthDate: "2021-04-18",
          enrollmentDate: "2021-04-17",
        },
        "2026-07-28",
      ),
    /doğum tarihinden önce/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        {
          displayName: "Deniz Yılmaz",
          enrollmentDate: "2026-07-29",
        },
        "2026-07-28",
      ),
    /kayıt tarihi gelecekte olamaz/i,
  );
});

test("boş isteğe bağlı alanları saklamaz ve veri-minimum metin sınırlarını uygular", () => {
  const profile = normalizeStudentProfile(
    {
      displayName: "Deniz Yılmaz",
      enrollmentDate: " ",
      homeLanguages: "  ",
      interests: "",
      strengths: "\n",
      supportPreferences: "\t",
    },
    "2026-07-28",
  );
  assert.deepEqual(profile, {
    displayName: "Deniz Yılmaz",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });

  for (const [field, value, message] of [
    ["homeLanguages", "d".repeat(201), /evde kullanılan diller/i],
    ["interests", "i".repeat(501), /alanları/i],
    ["strengths", "g".repeat(501), /yönler/i],
    ["supportPreferences", "d".repeat(1001), /desteği notu/i],
  ]) {
    assert.throws(
      () =>
        normalizeStudentProfile(
          { displayName: "Deniz Yılmaz", [field]: value },
          "2026-07-28",
        ),
      message,
    );
  }
});

test("yaşı saklamak yerine doğum tarihinden ay olarak üretir", () => {
  assert.equal(ageInMonthsOn("2021-04-18", "2026-07-28"), 63);
  assert.equal(ageInMonthsOn("2021-07-29", "2026-07-28"), 59);
});

test("eski öğrenci kaydını bozmadan güncel profil görünümüne taşır", () => {
  const result = studentProfileFromRecord({
    id: "00000000-0000-4000-8000-000000000901",
    displayName: "Sude Ünal",
    preferredName: "Sude",
    birthDate: "2021-09-03",
    optionalCode: "SINIF-4",
    active: true,
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 1,
  });

  assert.deepEqual(result, {
    displayName: "Sude Ünal",
    preferredName: "Sude",
    birthDate: "2021-09-03",
    optionalCode: "SINIF-4",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("zengin profil alanlarını eski kayıt biçiminden güvenle okur", () => {
  const result = studentProfileFromRecord({
    id: "00000000-0000-4000-8000-000000000902",
    displayName: "  Kurgu Öğrenci  ",
    enrollmentDate: "2025-09-01",
    homeLanguages: " Türkçe ",
    interests: " Blok oyunları ",
    strengths: " Grup oyununa katılım ",
    supportPreferences: " Seçenekleri iki adımda sunmak yardımcı oluyor. ",
    active: true,
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 1,
  });

  assert.deepEqual(result, {
    displayName: "Kurgu Öğrenci",
    enrollmentDate: "2025-09-01",
    homeLanguages: "Türkçe",
    interests: "Blok oyunları",
    strengths: "Grup oyununa katılım",
    supportPreferences: "Seçenekleri iki adımda sunmak yardımcı oluyor.",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("profil güncellemesinde boşaltılan bütün isteğe bağlı alanları kalıcı kayıttan temizler", async () => {
  const snapshot = createEmptySnapshot();
  const academicYearId = "00000000-0000-4000-8000-000000000911";
  const classroomId = "00000000-0000-4000-8000-000000000912";
  const studentId = "00000000-0000-4000-8000-000000000913";
  const base = {
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 2,
  };
  snapshot.academicYears.push({
    ...base,
    id: academicYearId,
    name: "Kurgu Eğitim Yılı",
    startDate: "2025-09-01",
    endDate: "2026-06-30",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId,
    classroomId,
    displayName: "Kurgu Öğrenci",
    preferredName: "Kurgu",
    birthDate: "2021-04-18",
    optionalCode: "K-7",
    enrollmentDate: "2025-09-01",
    homeLanguages: "Türkçe",
    interests: "Su oyunları",
    strengths: "İş birliği",
    supportPreferences: "Geçişleri önceden haber vermek yardımcı oluyor.",
    profileSchemaVersion: 2,
  });
  const store = new MemoryStore(snapshot);

  await persistStudentRosterChange(store, {
    student: {
      id: studentId,
      name: "Kurgu Öğrenci",
      status: "present",
      preferredName: " ",
      birthDate: "",
      optionalCode: " ",
      enrollmentDate: "",
      homeLanguages: " ",
      interests: "",
      strengths: "\n",
      supportPreferences: "\t",
    },
    archived: false,
  });

  const record = (await store.readSnapshot()).students[0];
  for (const field of [
    "preferredName",
    "birthDate",
    "optionalCode",
    "enrollmentDate",
    "homeLanguages",
    "interests",
    "strengths",
    "supportPreferences",
  ]) {
    assert.equal(Object.hasOwn(record, field), false, `${field} temizlenmedi`);
  }
  assert.equal(record.profileSchemaVersion, STUDENT_PROFILE_SCHEMA_VERSION);
});
