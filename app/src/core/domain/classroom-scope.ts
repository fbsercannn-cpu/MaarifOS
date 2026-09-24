import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  isClassroomRecord,
} from "./classroom.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";

export const LEGACY_ASSIGNMENT_ASSIGNED = "assigned" as const;
export const LEGACY_ASSIGNMENT_NEEDS_REVIEW = "needs-review" as const;

export interface ActiveClassroomScope {
  classroomId: string;
  academicYearId: string;
}

export type LegacyAssignmentStatus =
  | typeof LEGACY_ASSIGNMENT_ASSIGNED
  | typeof LEGACY_ASSIGNMENT_NEEDS_REVIEW;

function sameScope(
  left: ActiveClassroomScope,
  right: ActiveClassroomScope,
): boolean {
  return (
    left.classroomId === right.classroomId &&
    left.academicYearId === right.academicYearId
  );
}

/** Silinmemiş ve geçerli bütün sınıf/eğitim yılı çiftlerini döndürür. */
export function availableClassroomScopes(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms">,
): ActiveClassroomScope[] {
  const academicYearIds = new Set(
    snapshot.academicYears
      .filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          record.status !== "archived",
      )
      .map((record) => record.id),
  );
  return snapshot.classrooms
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.status !== "archived" &&
        record.archiveStatus !== "archived" &&
        isClassroomRecord(record) &&
        academicYearIds.has(record.academicYearId),
    )
    .map((record) => ({
      classroomId: record.id,
      academicYearId: record.academicYearId as string,
    }));
}

/**
 * Aktif sınıf ayarını çözer. Eski tek-sınıflı kurulumlarda açık bir seçim
 * yoksa yalnızca tek geçerli sınıf bulunduğunda güvenli geri uyumluluk sağlar.
 */
export function resolveActiveClassroomScope(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
): ActiveClassroomScope | null {
  const scopes = availableClassroomScopes(snapshot);
  const active = snapshot.settings.find(
    (record) =>
      record.id === ACTIVE_CLASSROOM_SETTING_ID &&
      record.settingType === ACTIVE_CLASSROOM_SETTING_TYPE &&
      typeof record.classroomId === "string" &&
      typeof record.academicYearId === "string" &&
      typeof record.deletedAt !== "string",
  );
  if (active) {
    const selected = {
      classroomId: active.classroomId as string,
      academicYearId: active.academicYearId as string,
    };
    return scopes.find((scope) => sameScope(scope, selected)) ?? null;
  }
  return scopes.length === 1 ? scopes[0] : null;
}

export function recordHasCompleteClassroomScope(
  record: StoredRecord,
): record is StoredRecord & ActiveClassroomScope {
  return (
    typeof record.classroomId === "string" &&
    record.classroomId.length > 0 &&
    typeof record.academicYearId === "string" &&
    record.academicYearId.length > 0
  );
}

export function recordBelongsToClassroomScope(
  record: StoredRecord,
  scope: ActiveClassroomScope,
): boolean {
  return (
    recordHasCompleteClassroomScope(record) &&
    record.classroomId === scope.classroomId &&
    record.academicYearId === scope.academicYearId &&
    record.legacyAssignmentStatus !== LEGACY_ASSIGNMENT_NEEDS_REVIEW
  );
}

export function classroomScopesEqual(
  left: ActiveClassroomScope,
  right: ActiveClassroomScope,
): boolean {
  return sameScope(left, right);
}
