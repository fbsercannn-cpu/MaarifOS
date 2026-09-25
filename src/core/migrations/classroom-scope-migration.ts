import {
  ATTENDANCE_COMPLETION_SETTING_TYPE,
} from "../domain/attendance.ts";
import {
  availableClassroomScopes,
  classroomScopesEqual,
  LEGACY_ASSIGNMENT_ASSIGNED,
  LEGACY_ASSIGNMENT_NEEDS_REVIEW,
  recordHasCompleteClassroomScope,
  type ActiveClassroomScope,
} from "../domain/classroom-scope.ts";
import type {
  CollectionName,
  DataSnapshot,
  StoredRecord,
} from "../domain/model.ts";
import type { LocalDataStore } from "../repository/contracts.ts";

const MIGRATED_COLLECTIONS = [
  "academicYears",
  "classrooms",
  "students",
  "attendanceRecords",
  "observations",
  "activities",
  "plans",
  "settings",
] as const satisfies readonly CollectionName[];

const DATA_COLLECTIONS = [
  "students",
  "attendanceRecords",
  "observations",
  "activities",
  "plans",
] as const satisfies readonly CollectionName[];

export interface ClassroomScopeMigrationReport {
  assigned: number;
  quarantined: number;
  unchanged: number;
}

function changedRecord(
  record: StoredRecord,
  scope: ActiveClassroomScope | null,
  updatedAt: string,
): StoredRecord {
  if (scope) {
    return {
      ...record,
      classroomId: scope.classroomId,
      academicYearId: scope.academicYearId,
      legacyAssignmentStatus: LEGACY_ASSIGNMENT_ASSIGNED,
      updatedAt,
    };
  }
  return {
    ...record,
    legacyAssignmentStatus: LEGACY_ASSIGNMENT_NEEDS_REVIEW,
    updatedAt,
  };
}

function uniqueRelatedStudentScope(
  record: StoredRecord,
  studentsById: ReadonlyMap<string, StoredRecord>,
): ActiveClassroomScope | null {
  const studentIds = typeof record.studentId === "string"
    ? [record.studentId]
    : Array.isArray(record.studentIds)
      ? record.studentIds.filter((id): id is string => typeof id === "string")
      : [];
  if (studentIds.length === 0) return null;

  const scopes = studentIds
    .map((id) => studentsById.get(id))
    .filter((student): student is StoredRecord => student !== undefined)
    .filter(recordHasCompleteClassroomScope)
    .filter(
      (student) =>
        student.legacyAssignmentStatus !== LEGACY_ASSIGNMENT_NEEDS_REVIEW,
    )
    .map((student) => ({
      classroomId: student.classroomId,
      academicYearId: student.academicYearId,
    }));
  if (
    scopes.length !== studentIds.length ||
    !scopes.every((scope) => classroomScopesEqual(scope, scopes[0]))
  ) {
    return null;
  }
  return scopes[0];
}

function targetForRecord(
  collection: CollectionName,
  record: StoredRecord,
  onlyScope: ActiveClassroomScope | null,
  studentsById: ReadonlyMap<string, StoredRecord>,
): ActiveClassroomScope | null {
  if (collection === "attendanceRecords" || collection === "observations") {
    const hasStudentRelation =
      typeof record.studentId === "string" ||
      (Array.isArray(record.studentIds) &&
        record.studentIds.some((id) => typeof id === "string"));
    if (hasStudentRelation) {
      return uniqueRelatedStudentScope(record, studentsById);
    }
    return onlyScope;
  }
  return onlyScope;
}

/**
 * Sınıf kimliği bulunmayan eski kayıtları tek-sınıflı kurulumda atomik olarak
 * ilişkilendirir; birden çok olası sınıfta kayıtları silmeden inceleme
 * karantinasına alır. İkinci çalıştırma hiçbir kaydı yeniden yazmaz.
 */
export async function migrateLegacyClassroomScopes(
  store: LocalDataStore,
  options: { now?: Date } = {},
): Promise<ClassroomScopeMigrationReport> {
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Sınıf kapsamı göçü için geçerli bir zaman gerekli.");
  }
  const updatedAt = now.toISOString();

  return store.transaction(
    "readwrite",
    MIGRATED_COLLECTIONS,
    async (transaction) => {
      const entries = await Promise.all(
        MIGRATED_COLLECTIONS.map(async (collection) => [
          collection,
          await transaction.getAll(collection),
        ] as const),
      );
      const snapshot = Object.fromEntries(entries) as Pick<
        DataSnapshot,
        (typeof MIGRATED_COLLECTIONS)[number]
      >;
      const scopes = availableClassroomScopes(snapshot);
      const onlyScope = scopes.length === 1 ? scopes[0] : null;
      const report: ClassroomScopeMigrationReport = {
        assigned: 0,
        quarantined: 0,
        unchanged: 0,
      };
      if (scopes.length === 0) {
        report.unchanged =
          DATA_COLLECTIONS.reduce(
            (total, collection) => total + snapshot[collection].length,
            0,
          ) +
          snapshot.settings.filter(
            (record) =>
              record.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE ||
              typeof record.attendanceCompleted === "boolean",
          ).length;
        return report;
      }

      const migratedStudents = snapshot.students.map((record) => {
        if (recordHasCompleteClassroomScope(record)) {
          report.unchanged += 1;
          return record;
        }
        const next = changedRecord(record, onlyScope, updatedAt);
        if (onlyScope) report.assigned += 1;
        else report.quarantined += 1;
        return next;
      });
      const studentsById = new Map(
        migratedStudents.map((record) => [record.id, record]),
      );
      const recordsToWrite = new Map<CollectionName, StoredRecord[]>();
      const changedStudents = migratedStudents.filter(
        (record, index) => record !== snapshot.students[index],
      );
      if (changedStudents.length > 0) {
        recordsToWrite.set("students", changedStudents);
      }

      for (const collection of DATA_COLLECTIONS.slice(1)) {
        const changed: StoredRecord[] = [];
        for (const record of snapshot[collection]) {
          if (recordHasCompleteClassroomScope(record)) {
            report.unchanged += 1;
            continue;
          }
          const target = targetForRecord(
            collection,
            record,
            onlyScope,
            studentsById,
          );
          const desiredStatus = target
            ? LEGACY_ASSIGNMENT_ASSIGNED
            : LEGACY_ASSIGNMENT_NEEDS_REVIEW;
          if (
            record.legacyAssignmentStatus === desiredStatus &&
            (!target ||
              (record.classroomId === target.classroomId &&
                record.academicYearId === target.academicYearId))
          ) {
            report.unchanged += 1;
            continue;
          }
          changed.push(changedRecord(record, target, updatedAt));
          if (target) report.assigned += 1;
          else report.quarantined += 1;
        }
        if (changed.length > 0) recordsToWrite.set(collection, changed);
      }

      const changedSettings: StoredRecord[] = [];
      for (const record of snapshot.settings) {
        const isAttendanceSetting =
          record.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE ||
          typeof record.attendanceCompleted === "boolean";
        if (!isAttendanceSetting || recordHasCompleteClassroomScope(record)) {
          continue;
        }
        const desiredStatus = onlyScope
          ? LEGACY_ASSIGNMENT_ASSIGNED
          : LEGACY_ASSIGNMENT_NEEDS_REVIEW;
        if (record.legacyAssignmentStatus === desiredStatus) continue;
        changedSettings.push(changedRecord(record, onlyScope, updatedAt));
        if (onlyScope) report.assigned += 1;
        else report.quarantined += 1;
      }
      if (changedSettings.length > 0) {
        recordsToWrite.set("settings", changedSettings);
      }

      for (const [collection, records] of recordsToWrite) {
        await transaction.putMany(collection, records);
      }
      return report;
    },
  );
}
