import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
class MemoryStore {
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
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000b01";
const classroomId = "00000000-0000-4000-8000-000000000b02";
const otherClassroomId = "00000000-0000-4000-8000-000000000b03";
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

export function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: classroomId,
      academicYearId: yearId,
      name: "Kurgu A Sınıfı",
    },
    {
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Kurgu B Sınıfı",
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

export function validDraft() {
  return {
    title: "2026–2027 Öğretmen Yıllık Planı",
    periodStart: "2026-09-07",
    periodEnd: "2026-10-30",
    teacherContent: {
      purpose: "Sınıfın yıllık öğretmen planlama omurgası",
      priorities: ["oyun", "gözlem", "aile katılımı"],
    },
    months: [
      {
        title: "Eylül Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { focus: "Uyum ve sınıf aidiyeti" },
        weeks: [
          {
            title: "7–11 Eylül Haftası",
            weekKey: "2026-W37",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { flow: ["karşılama", "oyun", "değerlendirme"] },
          },
          {
            title: "14–18 Eylül Haftası",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { flow: ["merkezler", "açık hava"] },
          },
        ],
      },
      {
        title: "Ekim Öğretmen Planı",
        monthKey: "2026-10",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-30",
        teacherContent: { focus: "Merak ve araştırma" },
        weeks: [
          {
            title: "5–9 Ekim Haftası",
            weekKey: "2026-W41",
            periodStart: "2026-10-05",
            periodEnd: "2026-10-09",
            teacherContent: { flow: ["fen", "sanat"] },
          },
        ],
      },
    ],
    now: new Date("2026-09-02T06:00:00.000Z"),
  };
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

