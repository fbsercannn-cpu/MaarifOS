import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGACY_STORAGE_KEY,
  loadDashboardState,
  migrateLegacyDashboardState,
} from "../../src/features/dashboard/dashboard-data.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function memoryStore(snapshot, { failWrites = false, afterCommit } = {}) {
  return {
    async readSnapshot() {
      return structuredClone(snapshot);
    },
    async transaction(mode, _collections, task) {
      const working = structuredClone(snapshot);
      const result = await task({
        async getAll(collection) {
          return structuredClone(working[collection]);
        },
        async putMany(collection, records) {
          if (failWrites) throw new Error("Kurgu atomik yazma hatası.");
          const byId = new Map(
            working[collection].map((record) => [record.id, record]),
          );
          for (const record of records) {
            byId.set(record.id, structuredClone(record));
          }
          working[collection] = [...byId.values()];
        },
        async clear(collection) {
          if (failWrites) throw new Error("Kurgu atomik yazma hatası.");
          working[collection] = [];
        },
      });
      if (mode === "readwrite") {
        for (const collection of Object.keys(snapshot)) {
          snapshot[collection] = working[collection];
        }
        afterCommit?.(snapshot);
      }
      return result;
    },
    close() {},
  };
}

async function withLocalStorage(entries, task) {
  const originalWindow = globalThis.window;
  const state = new Map(entries);
  const storage = {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
  try {
    return await task({ state, storage });
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
}

test("legacy kimlikleri UUID'ye taşır ve öğrenci-gözlem ilişkisini korur", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-01",
          studentId: "s-01",
          rawText: "Korunması gereken kurgu ham gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
      attendanceCompleted: true,
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.match(result.students[0].id, uuid);
  assert.match(result.observations[0].id, uuid);
  assert.equal(result.observations[0].studentId, result.students[0].id);
  assert.equal(result.observations[0].rawText, "Korunması gereken kurgu ham gözlem.");
  assert.equal(result.attendanceCompleted, true);
});

test("ilişkisiz legacy ham gözlemi silmez; inceleme bayrağıyla karantinaya alır", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-orphan",
          studentId: "missing-old-student",
          rawText: "İlişkisi eksik olsa da korunacak kurgu gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.equal(result.observations.length, 1);
  assert.match(result.observations[0].studentId, uuid);
  assert.equal(result.observations[0].requiresStudentReview, true);
  assert.equal(result.observations[0].legacyStudentId, "missing-old-student");
  assert.equal(result.observations[0].rawText, "İlişkisi eksik olsa da korunacak kurgu gözlem.");
});

test("UUID biçimli fakat bulunmayan legacy öğrenci ilişkisini de karantinaya alır", () => {
  const missingStudentId = "00000000-0000-4000-8000-000000000099";
  const result = migrateLegacyDashboardState(
    {
      students: [{
        id: "00000000-0000-4000-8000-000000000098",
        name: "Kurgu Mevcut Öğrenci",
        status: "present",
      }],
      observations: [{
        id: "00000000-0000-4000-8000-000000000097",
        studentId: missingStudentId,
        rawText: "UUID biçimi geçerli olsa da ilişkisi eksik kurgu gözlem.",
        createdAtUtc: "2026-07-22T07:20:00.000Z",
      }],
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].studentId, missingStudentId);
  assert.equal(result.observations[0].requiresStudentReview, true);
  assert.equal(result.observations[0].legacyStudentId, missingStudentId);
});

test("öğrenci üstündeki eski yoklamayı kendi tarihine atomik taşıyıp sonra temizler", async () => {
  const snapshot = createEmptySnapshot();
  const studentId = "00000000-0000-4000-8000-000000000051";
  snapshot.students.push({
    id: studentId,
    displayName: "Kurgu Öğrenci",
    attendanceStatus: "absent",
    createdAt: "2026-07-20T06:00:00.000Z",
    updatedAt: "2026-07-20T06:00:00.000Z",
    civilDate: "2026-07-20",
    deletedAt: null,
    schemaVersion: 1,
  });
  const store = {
    async readSnapshot() {
      return structuredClone(snapshot);
    },
    async transaction(_mode, _collections, task) {
      return task({
        async getAll(collection) {
          return structuredClone(snapshot[collection]);
        },
        async putMany(collection, records) {
          const byId = new Map(snapshot[collection].map((record) => [record.id, record]));
          for (const record of records) byId.set(record.id, structuredClone(record));
          snapshot[collection] = [...byId.values()];
        },
        async clear(collection) {
          snapshot[collection] = [];
        },
      });
    },
    close() {},
  };

  await loadDashboardState(store, {
    students: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-07-22",
  });

  assert.equal(snapshot.students[0].attendanceStatus, undefined);
  assert.equal(snapshot.attendanceRecords.length, 1);
  assert.equal(snapshot.attendanceRecords[0].studentId, studentId);
  assert.equal(snapshot.attendanceRecords[0].civilDate, "2026-07-20");
  assert.equal(snapshot.attendanceRecords[0].status, "absent");
});

test("dolu IndexedDB doğrulandıktan sonra stale açık metin v1 anahtarını idempotent kaldırır", async () => {
  const snapshot = createEmptySnapshot();
  snapshot.students.push({
    id: "00000000-0000-4000-8000-000000000071",
    displayName: "Güvenli Depodaki Kurgu Öğrenci",
    firstName: "Güvenli",
    lastName: "Kurgu",
    createdAt: "2026-08-28T08:00:00.000Z",
    updatedAt: "2026-08-28T08:00:00.000Z",
    civilDate: "2026-08-28",
    deletedAt: null,
    schemaVersion: 1,
  });
  const stale = JSON.stringify({
    students: [{
      id: "legacy",
      name: "Güvenli Kurgu",
      firstName: "Güvenli",
      lastName: "Kurgu",
      status: "present",
    }],
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, stale]], async ({ state }) => {
    const store = memoryStore(snapshot);
    await loadDashboardState(store, {
      students: [],
      archivedStudents: [],
      observations: [],
      attendanceCompleted: false,
      attendanceCivilDate: "2026-08-28",
    });
    assert.equal(state.has(LEGACY_STORAGE_KEY), false);

    await loadDashboardState(store, {
      students: [],
      archivedStudents: [],
      observations: [],
      attendanceCompleted: false,
      attendanceCivilDate: "2026-08-28",
    });
    assert.equal(state.has(LEGACY_STORAGE_KEY), false);
  });
});

test("legacy commit tamamlanıp v1 silinmeden kesilirse sonraki açılış aynı kayıtları kanonik doğrular ve çoğaltmaz", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [{
      id: "legacy-crash-student",
      name: "Kesinti Kurgu Öğrenci",
      status: "late",
    }],
    observations: [{
      id: "legacy-crash-observation",
      studentId: "legacy-crash-student",
      rawText: "Commit sonrası kesinti için kurgu gözlem.",
      createdAtUtc: "2026-08-28T09:00:00.000Z",
    }],
    attendanceCompleted: true,
  });
  const fallback = {
    students: [],
    archivedStudents: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-08-28",
  };

  await withLocalStorage(
    [[LEGACY_STORAGE_KEY, legacy]],
    async ({ state, storage }) => {
      const store = memoryStore(snapshot);
      storage.removeItem = () => {};
      await assert.rejects(
        loadDashboardState(store, fallback),
        /Eski cihaz verisi kalıcı alandan kaldırılamadı/,
      );
      assert.equal(snapshot.students.length, 1);
      assert.equal(snapshot.observations.length, 1);
      assert.equal(snapshot.attendanceRecords.length, 1);
      const importedStudentId = snapshot.students[0].id;
      const importedObservationId = snapshot.observations[0].id;
      assert.match(importedStudentId, uuid);
      assert.match(importedObservationId, uuid);
      assert.equal(state.get(LEGACY_STORAGE_KEY), legacy);

      storage.removeItem = (key) => state.delete(key);
      await loadDashboardState(store, fallback);

      assert.equal(snapshot.students.length, 1);
      assert.equal(snapshot.students[0].id, importedStudentId);
      assert.equal(snapshot.observations.length, 1);
      assert.equal(snapshot.observations[0].id, importedObservationId);
      assert.equal(snapshot.attendanceRecords.length, 1);
      assert.equal(snapshot.attendanceRecords[0].studentId, importedStudentId);
      assert.equal(snapshot.attendanceRecords[0].status, "late");
      assert.equal(state.has(LEGACY_STORAGE_KEY), false);
    },
  );
});

test("dolu v2 yanında UUID kimlikli benzersiz legacy ek kayıtları güvenle ve idempotent tamamlar", async () => {
  const snapshot = createEmptySnapshot();
  snapshot.students.push({
    id: "00000000-0000-4000-8000-000000000084",
    displayName: "Mevcut Kurgu Öğrenci",
    firstName: "Mevcut",
    lastName: "Kurgu Öğrenci",
    createdAt: "2026-08-28T08:00:00.000Z",
    updatedAt: "2026-08-28T08:00:00.000Z",
    civilDate: "2026-08-28",
    deletedAt: null,
    schemaVersion: 8,
  });
  const addedStudentId = "00000000-0000-4000-8000-000000000082";
  const addedObservationId = "00000000-0000-4000-8000-000000000083";
  const legacy = JSON.stringify({
    students: [{
      id: addedStudentId,
      name: "Eklenen Kurgu Öğrenci",
      status: "absent",
    }],
    observations: [{
      id: addedObservationId,
      studentId: addedStudentId,
      rawText: "Dolu v2 üzerine güvenli tamamlanan kurgu gözlem.",
      createdAtUtc: "2026-08-28T09:10:00.000Z",
    }],
    attendanceCompleted: false,
  });
  const fallback = {
    students: [],
    archivedStudents: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-08-28",
  };

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    const store = memoryStore(snapshot);
    await loadDashboardState(store, fallback);

    assert.equal(snapshot.students.length, 2);
    assert.ok(snapshot.students.some((record) => record.id === addedStudentId));
    assert.equal(snapshot.observations.length, 1);
    assert.equal(snapshot.observations[0].id, addedObservationId);
    assert.equal(snapshot.observations[0].studentIds[0], addedStudentId);
    assert.equal(snapshot.attendanceRecords.length, 1);
    assert.equal(snapshot.attendanceRecords[0].studentId, addedStudentId);
    assert.equal(snapshot.attendanceRecords[0].status, "absent");
    assert.equal(state.has(LEGACY_STORAGE_KEY), false);

    await loadDashboardState(store, fallback);
    assert.equal(snapshot.students.length, 2);
    assert.equal(snapshot.observations.length, 1);
    assert.equal(snapshot.attendanceRecords.length, 1);
  });
});

test("dolu v2 içinde non-UUID legacy öğrenci profili tekil eşleşmiyorsa yazmaz ve blobu silmez", async () => {
  const snapshot = createEmptySnapshot();
  for (const id of [
    "00000000-0000-4000-8000-000000000085",
    "00000000-0000-4000-8000-000000000086",
  ]) {
    snapshot.students.push({
      id,
      displayName: "Aynı Kurgu Profil",
      firstName: "Aynı",
      lastName: "Kurgu Profil",
      createdAt: "2026-08-28T08:00:00.000Z",
      updatedAt: "2026-08-28T08:00:00.000Z",
      civilDate: "2026-08-28",
      deletedAt: null,
      schemaVersion: 8,
    });
  }
  const legacy = JSON.stringify({
    students: [{
      id: "legacy-ambiguous-student",
      name: "Aynı Kurgu Profil",
      status: "present",
    }],
    observations: [],
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await assert.rejects(
      loadDashboardState(memoryStore(snapshot), {
        students: [],
        archivedStudents: [],
        observations: [],
        attendanceCompleted: false,
        attendanceCivilDate: "2026-08-28",
      }),
      /Eski öğrenci kimliği güvenli kayıtla tekil eşleştirilemedi/,
    );
    assert.equal(snapshot.students.length, 2);
    assert.equal(snapshot.attendanceRecords.length, 0);
    assert.equal(state.get(LEGACY_STORAGE_KEY), legacy);
  });
});

test("boş IndexedDB legacy importi doğrulanmadan v1 açık metin anahtarını silmez", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [{ id: "legacy-01", name: "Korunacak Kurgu Öğrenci", status: "present" }],
    observations: [],
    attendanceCompleted: false,
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await assert.rejects(
      loadDashboardState(memoryStore(snapshot, { failWrites: true }), {
        students: [],
        archivedStudents: [],
        observations: [],
        attendanceCompleted: false,
        attendanceCivilDate: "2026-08-28",
      }),
      /Kurgu atomik yazma hatası/,
    );
    assert.equal(state.get(LEGACY_STORAGE_KEY), legacy);
  });
});

test("boş IndexedDB legacy importi atomik yazılıp yeniden okunduktan sonra v1 anahtarını kaldırır", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [{ id: "legacy-02", name: "Aktarılan Kurgu Öğrenci", status: "present" }],
    observations: [{
      id: "legacy-obs-02",
      studentId: "legacy-02",
      rawText: "Aktarım doğrulama gözlemi.",
      createdAtUtc: "2026-08-28T08:10:00.000Z",
    }],
    attendanceCompleted: true,
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await loadDashboardState(memoryStore(snapshot), {
      students: [],
      archivedStudents: [],
      observations: [],
      attendanceCompleted: false,
      attendanceCivilDate: "2026-08-28",
    });
    assert.equal(snapshot.students.length, 1);
    assert.equal(snapshot.observations.length, 1);
    assert.equal(snapshot.observations[0].studentIds[0], snapshot.students[0].id);
    assert.equal(state.has(LEGACY_STORAGE_KEY), false);
  });
});

test("legacy profilin kimlik, veli, bakım ve fotoğraf alanlarını eksiksiz doğruladıktan sonra v1 anahtarını kaldırır", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [{
      id: "legacy-sensitive-profile",
      name: "Eski Görünen Ad",
      firstName: "  Deniz  ",
      lastName: "  Yılmaz  ",
      preferredName: "  Deno  ",
      birthDate: "2020-04-18",
      optionalCode: "  KELEBEK-07  ",
      nationalIdentityNumber: "  10000000146  ",
      enrollmentYear: "2024",
      homeLanguages: "  Türkçe, İngilizce  ",
      interests: "  Su deneyleri ve ritim oyunları  ",
      strengths: "  Akranlarını oyuna davet ediyor  ",
      supportPreferences: "  Geçişten önce görsel hatırlatma  ",
      contacts: [{
        id: "00000000-0000-4000-8000-000000000081",
        kind: "mother",
        relationship: "  Anne  ",
        name: "  Kurgu Veli  ",
        phone: "0532 123 45 67",
        isPrimary: true,
        isEmergencyContact: true,
        isAuthorizedPickup: true,
      }],
      careDetails: {
        homeAddress: "  Kurgu Mahallesi 1  ",
        allergies: "  Kurgu alerji notu  ",
        dietaryNeeds: "  Kurgu beslenme notu  ",
        medicationNotes: "  Kurgu ilaç notu  ",
        emergencyNotes: "  Kurgu acil durum notu  ",
        physicianName: "  Kurgu Hekim  ",
        physicianPhone: "+90 258 000 00 00",
        medicalDevices: "  Kurgu destek cihazı  ",
        guardianEmail: "veli@example.test",
        familyEducationNeeds: "  Kurgu aile eğitimi ihtiyacı  ",
        familyParticipationPreferences: "  Kurgu katılım tercihi  ",
        photoVideoPermissionOnFile: true,
        fieldTripPermissionOnFile: true,
        digitalCommunicationPermissionOnFile: true,
        permissionFormDate: "2026-08-20",
      },
      profilePhotoDataUrl: "data:image/png;base64,AQID",
      status: "present",
    }],
    observations: [{
      id: "legacy-sensitive-observation",
      studentId: "legacy-sensitive-profile",
      rawText: "Kurgu hassas profil aktarım gözlemi.",
      createdAtUtc: "2026-08-28T08:10:00.000Z",
      requiresStudentReview: true,
      legacyStudentId: "legacy-observation-link",
    }],
    attendanceCompleted: false,
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await loadDashboardState(memoryStore(snapshot), {
      students: [],
      archivedStudents: [],
      observations: [],
      attendanceCompleted: false,
      attendanceCivilDate: "2026-08-28",
    });

    const storedStudent = snapshot.students[0];
    assert.deepEqual({
      displayName: storedStudent.displayName,
      firstName: storedStudent.firstName,
      lastName: storedStudent.lastName,
      preferredName: storedStudent.preferredName,
      birthDate: storedStudent.birthDate,
      optionalCode: storedStudent.optionalCode,
      nationalIdentityNumber: storedStudent.nationalIdentityNumber,
      enrollmentYear: storedStudent.enrollmentYear,
      homeLanguages: storedStudent.homeLanguages,
      interests: storedStudent.interests,
      strengths: storedStudent.strengths,
      supportPreferences: storedStudent.supportPreferences,
      contacts: storedStudent.contacts,
      careDetails: storedStudent.careDetails,
      profilePhotoDataUrl: storedStudent.profilePhotoDataUrl,
    }, {
      displayName: "Deniz Yılmaz",
      firstName: "Deniz",
      lastName: "Yılmaz",
      preferredName: "Deno",
      birthDate: "2020-04-18",
      optionalCode: "KELEBEK-07",
      nationalIdentityNumber: "10000000146",
      enrollmentYear: "2024",
      homeLanguages: "Türkçe, İngilizce",
      interests: "Su deneyleri ve ritim oyunları",
      strengths: "Akranlarını oyuna davet ediyor",
      supportPreferences: "Geçişten önce görsel hatırlatma",
      contacts: [{
        id: "00000000-0000-4000-8000-000000000081",
        kind: "mother",
        relationship: "Anne",
        name: "Kurgu Veli",
        phone: "+905321234567",
        isPrimary: true,
        isEmergencyContact: true,
        isAuthorizedPickup: true,
      }],
      careDetails: {
        homeAddress: "Kurgu Mahallesi 1",
        allergies: "Kurgu alerji notu",
        dietaryNeeds: "Kurgu beslenme notu",
        medicationNotes: "Kurgu ilaç notu",
        emergencyNotes: "Kurgu acil durum notu",
        physicianName: "Kurgu Hekim",
        physicianPhone: "+90 258 000 00 00",
        medicalDevices: "Kurgu destek cihazı",
        guardianEmail: "veli@example.test",
        familyEducationNeeds: "Kurgu aile eğitimi ihtiyacı",
        familyParticipationPreferences: "Kurgu katılım tercihi",
        photoVideoPermissionOnFile: true,
        fieldTripPermissionOnFile: true,
        digitalCommunicationPermissionOnFile: true,
        permissionFormDate: "2026-08-20",
      },
      profilePhotoDataUrl: "data:image/png;base64,AQID",
    });
    assert.equal(snapshot.observations[0].requiresStudentReview, true);
    assert.equal(snapshot.observations[0].legacyStudentId, "legacy-observation-link");
    assert.equal(state.has(LEGACY_STORAGE_KEY), false);
  });
});

test("legacy hassas profil alanı doğrulama okumasında eksikse v1 anahtarını koruyup fail-closed kalır", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [{
      id: "legacy-sensitive-loss",
      name: "Kurgu Hassas Öğrenci",
      nationalIdentityNumber: "10000000146",
      status: "present",
    }],
    observations: [],
    attendanceCompleted: false,
  });
  const store = memoryStore(snapshot, {
    afterCommit(committed) {
      for (const student of committed.students) {
        delete student.nationalIdentityNumber;
      }
    },
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await assert.rejects(
      loadDashboardState(store, {
        students: [],
        archivedStudents: [],
        observations: [],
        attendanceCompleted: false,
        attendanceCivilDate: "2026-08-28",
      }),
      /Eski öğrenci kaydı güvenli depoya doğrulanarak aktarılamadı/,
    );
    assert.equal(state.get(LEGACY_STORAGE_KEY), legacy);
  });
});

test("legacy archivedStudents içeriğini sessizce düşürmez; açık metin kaynağı koruyup fail-closed kalır", async () => {
  const snapshot = createEmptySnapshot();
  const legacy = JSON.stringify({
    students: [],
    archivedStudents: [{
      id: "legacy-archived-sensitive",
      name: "Kurgu Arşiv Öğrencisi",
      nationalIdentityNumber: "10000000146",
      status: "present",
    }],
    observations: [],
    attendanceCompleted: false,
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, legacy]], async ({ state }) => {
    await assert.rejects(
      loadDashboardState(memoryStore(snapshot), {
        students: [],
        archivedStudents: [],
        observations: [],
        attendanceCompleted: false,
        attendanceCivilDate: "2026-08-28",
      }),
      /Eski arşiv kayıtları güvenli otomatik aktarıma uygun değil/,
    );
    assert.equal(snapshot.students.length, 0);
    assert.equal(state.get(LEGACY_STORAGE_KEY), legacy);
  });
});

test("bozuk legacy JSON kaynağını yok sayıp silmez; DB boş ve v1 blobu korunmuş kalır", async () => {
  const snapshot = createEmptySnapshot();
  const malformedLegacy = "{\"students\":[";

  await withLocalStorage(
    [[LEGACY_STORAGE_KEY, malformedLegacy]],
    async ({ state }) => {
      await assert.rejects(
        loadDashboardState(memoryStore(snapshot), {
          students: [],
          archivedStudents: [],
          observations: [],
          attendanceCompleted: false,
          attendanceCivilDate: "2026-08-28",
        }),
        /Eski cihaz verisi doğrulanamadı; cihaz kaydı korunmuştur/,
      );
      assert.equal(snapshot.students.length, 0);
      assert.equal(snapshot.observations.length, 0);
      assert.equal(state.get(LEGACY_STORAGE_KEY), malformedLegacy);
    },
  );
});

test("legacy students veya observations alanı array değilse blobu koruyup fail-closed kalır", async () => {
  const cases = [
    {
      label: "students",
      legacy: JSON.stringify({ students: { id: "legacy-not-an-array" } }),
      message: /Eski öğrenci kayıtları doğrulanamadı/,
    },
    {
      label: "observations",
      legacy: JSON.stringify({ observations: "legacy-not-an-array" }),
      message: /Eski gözlem kayıtları doğrulanamadı/,
    },
  ];

  for (const scenario of cases) {
    const snapshot = createEmptySnapshot();
    await withLocalStorage(
      [[LEGACY_STORAGE_KEY, scenario.legacy]],
      async ({ state }) => {
        await assert.rejects(
          loadDashboardState(memoryStore(snapshot), {
            students: [],
            archivedStudents: [],
            observations: [],
            attendanceCompleted: false,
            attendanceCivilDate: "2026-08-28",
          }),
          scenario.message,
          scenario.label,
        );
        assert.equal(snapshot.students.length, 0, scenario.label);
        assert.equal(snapshot.observations.length, 0, scenario.label);
        assert.equal(state.get(LEGACY_STORAGE_KEY), scenario.legacy, scenario.label);
      },
    );
  }
});

test("legacy dizisindeki tek geçersiz öğrenci veya gözlemi filter ile düşürmez", async () => {
  const cases = [
    {
      label: "invalid-student-item",
      legacy: JSON.stringify({
        students: [
          { id: "legacy-valid", name: "Kurgu Geçerli Öğrenci", status: "present" },
          { id: "legacy-invalid", name: "Kurgu Geçersiz Öğrenci", status: "unknown" },
        ],
        observations: [],
      }),
      message: /Eski öğrenci kayıtları doğrulanamadı/,
    },
    {
      label: "invalid-observation-item",
      legacy: JSON.stringify({
        students: [
          { id: "legacy-valid", name: "Kurgu Geçerli Öğrenci", status: "present" },
        ],
        observations: [
          {
            id: "legacy-observation-valid",
            studentId: "legacy-valid",
            rawText: "Kurgu geçerli gözlem.",
            createdAtUtc: "2026-08-28T08:30:00.000Z",
          },
          {
            id: "legacy-observation-invalid",
            studentId: "legacy-valid",
            rawText: "Tarihi eksik kurgu gözlem.",
          },
        ],
      }),
      message: /Eski gözlem kayıtları doğrulanamadı/,
    },
  ];

  for (const scenario of cases) {
    const snapshot = createEmptySnapshot();
    await withLocalStorage(
      [[LEGACY_STORAGE_KEY, scenario.legacy]],
      async ({ state }) => {
        await assert.rejects(
          loadDashboardState(memoryStore(snapshot), {
            students: [],
            archivedStudents: [],
            observations: [],
            attendanceCompleted: false,
            attendanceCivilDate: "2026-08-28",
          }),
          scenario.message,
          scenario.label,
        );
        assert.equal(snapshot.students.length, 0, scenario.label);
        assert.equal(snapshot.observations.length, 0, scenario.label);
        assert.equal(state.get(LEGACY_STORAGE_KEY), scenario.legacy, scenario.label);
      },
    );
  }
});

test("doğrulanmış DB yanında v1 anahtarı silinemiyorsa hydration fail-closed kalır", async () => {
  const snapshot = createEmptySnapshot();
  snapshot.students.push({
    id: "00000000-0000-4000-8000-000000000072",
    displayName: "Fail Closed Kurgu Öğrenci",
    firstName: "Fail",
    lastName: "Closed",
    createdAt: "2026-08-28T08:20:00.000Z",
    updatedAt: "2026-08-28T08:20:00.000Z",
    civilDate: "2026-08-28",
    deletedAt: null,
    schemaVersion: 1,
  });
  const stale = JSON.stringify({
    students: [{
      id: "legacy-fail-closed",
      name: "Fail Closed",
      firstName: "Fail",
      lastName: "Closed",
      status: "present",
    }],
  });

  await withLocalStorage([[LEGACY_STORAGE_KEY, stale]], async ({ state, storage }) => {
    storage.removeItem = () => {};
    await assert.rejects(
      loadDashboardState(memoryStore(snapshot), {
        students: [],
        archivedStudents: [],
        observations: [],
        attendanceCompleted: false,
        attendanceCivilDate: "2026-08-28",
      }),
      /Eski cihaz verisi kalıcı alandan kaldırılamadı/,
    );
    assert.equal(state.get(LEGACY_STORAGE_KEY), stale);
  });
});
