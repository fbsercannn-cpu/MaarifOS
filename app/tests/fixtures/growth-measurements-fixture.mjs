import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";

export const growthUid = (value) =>
  `20000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

export const growthScope = Object.freeze({
  academicYearId: growthUid(1),
  classroomId: growthUid(2),
});

export const growthStudents = Object.freeze({
  ada: growthUid(11),
  bora: growthUid(12),
  cem: growthUid(13),
  deniz: growthUid(14),
});

export const growthNow = new Date("2027-06-30T09:00:00.000Z");

const base = Object.freeze({
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  schemaVersion: 1,
  deletedAt: null,
});

function enrollment(id, startedOn, status = "active", endedOn) {
  return {
    id: growthUid(id),
    ...growthScope,
    startedOn,
    status,
    schemaVersion: 1,
    ...(endedOn ? { endedOn } : {}),
  };
}

export function growthFixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: growthScope.academicYearId,
    name: "2026–2027 Kurgu Eğitim Yılı",
    startDate: "2026-09-01",
    operationalStartDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: growthScope.classroomId,
    academicYearId: growthScope.academicYearId,
    name: "Kurgu Deniz Sınıfı",
    schoolName: "Kurgu Anaokulu",
    teacherName: "Kurgu Öğretmen",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    ...growthScope,
  });
  snapshot.students.push(
    {
      ...base,
      ...growthScope,
      id: growthStudents.ada,
      displayName: "Kurgu Ada",
      birthDate: "2021-06-15",
      active: true,
      enrollments: [enrollment(101, "2026-09-01")],
    },
    {
      ...base,
      ...growthScope,
      id: growthStudents.bora,
      displayName: "Kurgu Bora",
      birthDate: "2021-05-10",
      active: true,
      enrollments: [enrollment(102, "2026-09-01")],
    },
    {
      ...base,
      ...growthScope,
      id: growthStudents.cem,
      displayName: "Kurgu Cem",
      active: true,
      enrollments: [enrollment(103, "2027-03-01")],
    },
    {
      ...base,
      ...growthScope,
      id: growthStudents.deniz,
      displayName: "Kurgu Deniz",
      active: false,
      enrollmentStatus: "left",
      enrollments: [enrollment(104, "2026-09-01", "completed", "2026-12-31")],
    },
  );
  return snapshot;
}

export class GrowthMemoryStore {
  constructor(snapshot = growthFixture()) {
    this.snapshot = structuredClone(snapshot);
    this.failWrites = false;
    this.queue = Promise.resolve();
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  transaction(mode, collections, task) {
    const run = async () => {
      const working = structuredClone(this.snapshot);
      const allowed = new Set(collections);
      const transaction = {
        getAll: async (name) => {
          if (!allowed.has(name)) throw new Error(`Kurgu işlem kapsamı dışında: ${name}`);
          return structuredClone(working[name]);
        },
        putMany: async (name, records) => {
          if (mode !== "readwrite" || !allowed.has(name)) {
            throw new Error("Kurgu işlem yazma kapsamı geçersiz.");
          }
          if (this.failWrites) throw new Error("Kurgu kalıcı kayıt kesintisi");
          for (const record of records) {
            const index = working[name].findIndex((candidate) => candidate.id === record.id);
            if (index >= 0) working[name][index] = structuredClone(record);
            else working[name].push(structuredClone(record));
          }
        },
        clear: async (name) => {
          if (mode !== "readwrite" || !allowed.has(name)) {
            throw new Error("Kurgu işlem temizleme kapsamı geçersiz.");
          }
          working[name] = [];
        },
      };
      const result = await task(transaction);
      if (mode === "readwrite") this.snapshot = working;
      return result;
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  close() {}
}

export function addGrowthStudents(snapshot, count) {
  for (let index = snapshot.students.length; index < count; index += 1) {
    const id = growthUid(1_000 + index);
    snapshot.students.push({
      ...base,
      ...growthScope,
      id,
      displayName: index === count - 1
        ? "Kurgu Çok Uzun İsimli Öğrenci Çocuğu Yıldız Deniz Gökkuşağı"
        : `Kurgu Çocuk ${String(index + 1).padStart(2, "0")}`,
      active: true,
      enrollments: [enrollment(2_000 + index, "2026-09-01")],
    });
  }
  return snapshot;
}
