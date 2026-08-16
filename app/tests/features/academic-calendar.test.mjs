import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
  loadAcademicCalendar,
  officialEventsOnDate,
  removeCalendarEntry,
  saveCalendarEntry,
} from "../../src/features/calendar/academic-calendar.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot) {
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
        for (const record of records) byId.set(record.id, structuredClone(record));
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

const academicYearId = "00000000-0000-4000-8000-000000000701";
const classroomId = "00000000-0000-4000-8000-000000000702";

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    id: academicYearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    status: "active",
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    civilDate: "2026-07-29",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.classrooms.push({
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    civilDate: "2026-07-29",
    deletedAt: null,
    schemaVersion: 2,
  });
  snapshot.settings.push({
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    civilDate: "2026-07-29",
    deletedAt: null,
    schemaVersion: 1,
  });
  return new MemoryStore(snapshot);
}

test("2026–2027 MEB takvimi uyum ve dönem tarihlerini kaynaklı taşır", () => {
  const profile = OFFICIAL_ACADEMIC_CALENDAR_2026_2027;
  assert.equal(profile.instructionalStartDate, "2026-09-14");
  assert.equal(profile.instructionalEndDate, "2027-06-25");
  assert.deepEqual(
    officialEventsOnDate(profile.events, "2026-09-09").map(
      (event) => event.id,
    ),
    ["preschool-adaptation"],
  );
  assert.equal(
    profile.events.find((event) => event.id === "first-break")?.startDate,
    "2026-11-16",
  );
  assert.ok(
    profile.events.every(
      (event) =>
        event.sourceUrl.startsWith("https://meb.gov.tr/") &&
        event.sourceCheckedOn === "2026-07-29",
    ),
  );
});

test("öğretmen takvim notunu kaydeder, işaretler ve tombstone ile kaldırır", async () => {
  const store = activeStore();
  const id = "00000000-0000-4000-8000-000000000703";
  await saveCalendarEntry(store, {
    id,
    entryType: "parent_meeting",
    title: "Veli toplantısı",
    note: "Toplantı gündemini ve saatini doğrula.",
    startDate: "2026-09-18",
    status: "planned",
    now: new Date("2026-08-10T08:00:00.000Z"),
  });
  await saveCalendarEntry(store, {
    id,
    entryType: "parent_meeting",
    title: "Veli toplantısı",
    note: "Toplantı tamamlandı.",
    startDate: "2026-09-18",
    status: "completed",
    now: new Date("2026-09-18T12:00:00.000Z"),
  });
  const workspace = await loadAcademicCalendar(store);
  assert.equal(workspace.entries.length, 1);
  assert.equal(workspace.entries[0].status, "completed");
  assert.equal(workspace.officialEvents.length, 8);

  await removeCalendarEntry(store, {
    id,
    now: new Date("2026-09-19T07:00:00.000Z"),
  });
  assert.equal((await loadAcademicCalendar(store)).entries.length, 0);
  assert.equal(typeof store.snapshot.calendarEntries[0].deletedAt, "string");
});

test("takvim kaydı etkin eğitim yılı dışına taşamaz", async () => {
  const store = activeStore();
  await assert.rejects(
    saveCalendarEntry(store, {
      entryType: "general_note",
      title: "Geçersiz gün",
      startDate: "2026-08-31",
    }),
    /aktif eğitim yılının tarih aralığında/,
  );
  assert.equal(store.snapshot.calendarEntries.length, 0);
});

test("öğretmenin okulda eğitim yok kaydı takvim CRUD zincirinde ayrı tür olarak korunur", async () => {
  const store = activeStore();
  const id = "00000000-0000-4000-8000-000000000704";
  await saveCalendarEntry(store, {
    id,
    entryType: "no_school",
    title: "Yerel kurum kapanışı",
    note: "İlçe duyurusu öğretmen tarafından takvime işlendi.",
    startDate: "2026-12-09",
    status: "planned",
    now: new Date("2026-12-01T08:00:00.000Z"),
  });

  const [entry] = (await loadAcademicCalendar(store)).entries;
  assert.equal(entry.id, id);
  assert.equal(entry.entryType, "no_school");
  assert.equal(entry.startDate, "2026-12-09");
  assert.equal(entry.endDate, "2026-12-09");

  await saveCalendarEntry(store, {
    ...entry,
    status: "cancelled",
    now: new Date("2026-12-02T08:00:00.000Z"),
  });
  assert.equal((await loadAcademicCalendar(store)).entries[0].status, "cancelled");
});

