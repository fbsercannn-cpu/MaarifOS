import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import {
  DEFAULT_TEACHER_HOME_PREFERENCES,
  TEACHER_HOME_PREFERENCES_SETTING_TYPE,
  isTeacherHomePreferencesRecord,
  loadTeacherHomePreferences,
  resolveTeacherHomePreferences,
  saveTeacherHomePreferences,
} from "../../src/features/simple-experience/teacher-home-preferences.ts";

const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const firstScope = { academicYearId: id(901), classroomId: id(902) };
const secondScope = { academicYearId: id(901), classroomId: id(903) };
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function createStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: firstScope.academicYearId,
    name: "Kurgu eğitim yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: firstScope.classroomId,
    academicYearId: firstScope.academicYearId,
    name: "Kurgu sınıfı",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    ...firstScope,
  });
  return {
    snapshot,
    failNextWrite: false,
    putCount: 0,
    async readSnapshot() {
      return structuredClone(this.snapshot);
    },
    async transaction(mode, _collections, task) {
      const staged = structuredClone(this.snapshot);
      const result = await task({
        getAll: async (collection) => structuredClone(staged[collection]),
        putMany: async (collection, records) => {
          if (this.failNextWrite) {
            this.failNextWrite = false;
            throw new Error("Kurgu disk kesintisi");
          }
          this.putCount += 1;
          for (const record of records) {
            const index = staged[collection].findIndex((candidate) => candidate.id === record.id);
            if (index === -1) staged[collection].push(structuredClone(record));
            else staged[collection][index] = structuredClone(record);
          }
        },
        clear: async (collection) => {
          staged[collection] = [];
        },
      });
      if (mode === "readwrite") this.snapshot = staged;
      return structuredClone(result);
    },
    close() {},
  };
}

test("ana ekran tercihleri kayıt yokken ders modunu kapalı ve tam iki güvenli kısayolu seçer", async () => {
  const store = createStore();
  const model = await loadTeacherHomePreferences(store);
  assert.deepEqual(model.scope, firstScope);
  assert.equal(model.lessonMode, false);
  assert.deepEqual(model.pinnedShortcutIds, DEFAULT_TEACHER_HOME_PREFERENCES.pinnedShortcutIds);
  assert.equal(model.expectedUpdatedAt, null);
});

test("ders modu ile sıralı iki kısayol atomik kaydolur, yeniden yüklenir ve yinelenen kayıt yazmaz", async () => {
  const store = createStore();
  const saved = await saveTeacherHomePreferences(store, {
    lessonMode: true,
    pinnedShortcutIds: ["calendar", "classroom"],
    expectedUpdatedAt: null,
    now: new Date("2026-09-12T09:00:00.000Z"),
  });
  assert.equal(store.putCount, 1);
  assert.equal(saved.lessonMode, true);
  assert.deepEqual(saved.pinnedShortcutIds, ["calendar", "classroom"]);
  const records = store.snapshot.settings.filter(
    (record) => record.settingType === TEACHER_HOME_PREFERENCES_SETTING_TYPE,
  );
  assert.equal(records.length, 1);
  assert.equal(isTeacherHomePreferencesRecord(records[0]), true);
  assert.deepEqual(await loadTeacherHomePreferences(store), saved);

  const again = await saveTeacherHomePreferences(store, {
    lessonMode: true,
    pinnedShortcutIds: ["calendar", "classroom"],
    expectedUpdatedAt: saved.expectedUpdatedAt,
    now: new Date("2026-09-12T09:01:00.000Z"),
  });
  assert.deepEqual(again, saved);
  assert.equal(store.putCount, 1);
});

test("eski önizleme ve geçersiz kısayol kümeleri hiçbir tercih yazmaz", async () => {
  const store = createStore();
  const before = structuredClone(store.snapshot);
  await assert.rejects(
    saveTeacherHomePreferences(store, {
      lessonMode: true,
      pinnedShortcutIds: ["attendance", "attendance"],
      expectedUpdatedAt: null,
      now: new Date("2026-09-12T09:00:00.000Z"),
    }),
    /farklı iki sabit kısayol/u,
  );
  assert.deepEqual(store.snapshot, before);

  const current = await saveTeacherHomePreferences(store, {
    lessonMode: true,
    pinnedShortcutIds: ["attendance", "calendar"],
    expectedUpdatedAt: null,
    now: new Date("2026-09-12T09:00:00.000Z"),
  });
  const afterFirstWrite = structuredClone(store.snapshot);
  await assert.rejects(
    saveTeacherHomePreferences(store, {
      lessonMode: false,
      pinnedShortcutIds: ["classroom", "daily-plan"],
      expectedUpdatedAt: null,
      now: new Date("2026-09-12T09:01:00.000Z"),
    }),
    /başka bir işlemde değişti/u,
  );
  assert.ok(current.expectedUpdatedAt);
  assert.deepEqual(store.snapshot, afterFirstWrite);
});

test("disk kesintisi ders modu ve iki kısayolu birlikte geri alır", async () => {
  const store = createStore();
  const before = structuredClone(store.snapshot);
  store.failNextWrite = true;
  await assert.rejects(
    saveTeacherHomePreferences(store, {
      lessonMode: true,
      pinnedShortcutIds: ["attendance", "daily-plan"],
      expectedUpdatedAt: null,
      now: new Date("2026-09-12T09:00:00.000Z"),
    }),
    /disk kesintisi/u,
  );
  assert.deepEqual(store.snapshot, before);
});

test("tercihler etkin sınıf kapsamından diğer sınıfa sızmaz", async () => {
  const store = createStore();
  const first = await saveTeacherHomePreferences(store, {
    lessonMode: true,
    pinnedShortcutIds: ["calendar", "classroom"],
    expectedUpdatedAt: null,
    now: new Date("2026-09-12T09:00:00.000Z"),
  });
  store.snapshot.classrooms.push({
    ...base,
    id: secondScope.classroomId,
    academicYearId: secondScope.academicYearId,
    name: "İkinci kurgu sınıfı",
  });
  Object.assign(
    store.snapshot.settings.find((record) => record.id === ACTIVE_CLASSROOM_SETTING_ID),
    secondScope,
  );
  const secondDefault = resolveTeacherHomePreferences(store.snapshot);
  assert.equal(secondDefault.lessonMode, false);
  assert.deepEqual(secondDefault.pinnedShortcutIds, ["attendance", "daily-plan"]);
  const second = await saveTeacherHomePreferences(store, {
    lessonMode: false,
    pinnedShortcutIds: ["classroom", "daily-plan"],
    expectedUpdatedAt: null,
    now: new Date("2026-09-12T09:01:00.000Z"),
  });
  assert.deepEqual(second.scope, secondScope);

  Object.assign(
    store.snapshot.settings.find((record) => record.id === ACTIVE_CLASSROOM_SETTING_ID),
    firstScope,
  );
  const firstAgain = resolveTeacherHomePreferences(store.snapshot);
  assert.equal(firstAgain.expectedUpdatedAt, first.expectedUpdatedAt);
  assert.equal(firstAgain.lessonMode, true);
  assert.deepEqual(firstAgain.pinnedShortcutIds, ["calendar", "classroom"]);
  assert.equal(
    store.snapshot.settings.filter(
      (record) => record.settingType === TEACHER_HOME_PREFERENCES_SETTING_TYPE,
    ).length,
    2,
  );
});
