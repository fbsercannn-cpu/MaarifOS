import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";

export const SPONTANEOUS_OBSERVATION_PLAN_TYPE =
  "spontaneous-observation" as const;
export const SPONTANEOUS_OBSERVATION_ACTIVITY_KIND =
  "spontaneous-observation" as const;

const CONTEXT_TITLE = "Anlık gözlemler";
const CONTEXT_SCHEMA_VERSION = 2;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface EnsureSpontaneousObservationContextInput {
  studentId: string;
  civilDate: string;
  now?: Date;
}

export interface SpontaneousObservationContext {
  plan: StoredRecord;
  activity: StoredRecord;
  created: boolean;
}

function validStudentId(studentId: string): string {
  if (!UUID_PATTERN.test(studentId)) {
    throw new Error("Anlık gözlem için öğrenci kimliği geçersiz.");
  }
  return studentId;
}

function validNow(now: Date): Date {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Anlık gözlem için geçerli bir kayıt zamanı gerekli.");
  }
  return now;
}

function activeStudentInScope(
  students: readonly StoredRecord[],
  studentId: string,
  scope: ActiveClassroomScope,
): StoredRecord | null {
  const student = students.find((record) => record.id === studentId);
  if (
    !student ||
    !recordBelongsToClassroomScope(student, scope) ||
    typeof student.deletedAt === "string" ||
    student.active === false ||
    (student.enrollmentStatus !== undefined &&
      student.enrollmentStatus !== "active")
  ) {
    return null;
  }

  if (Array.isArray(student.enrollments)) {
    const scopedEnrollments = student.enrollments.filter(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).academicYearId ===
          scope.academicYearId &&
        (value as Record<string, unknown>).classroomId === scope.classroomId,
    ) as Array<Record<string, unknown>>;
    if (
      scopedEnrollments.length > 0 &&
      !scopedEnrollments.some(
        (enrollment) =>
          enrollment.status === "active" &&
          enrollment.endedOn === undefined,
      )
    ) {
      return null;
    }
  }

  return student;
}

function timeInIstanbul(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) {
    throw new Error("Anlık gözlem saati oluşturulamadı.");
  }
  return `${hour}:${minute}`;
}

function isLiveContextRecord(
  record: StoredRecord,
  scope: ActiveClassroomScope,
  civilDate: string,
): boolean {
  return (
    record.civilDate === civilDate &&
    typeof record.deletedAt !== "string" &&
    recordBelongsToClassroomScope(record, scope)
  );
}

function hasNoProgramTargets(record: StoredRecord): boolean {
  const targetsEmpty =
    record.curriculumTargets === undefined ||
    (Array.isArray(record.curriculumTargets) &&
      record.curriculumTargets.length === 0);
  const referencesEmpty =
    record.maarifRefs === undefined ||
    (Array.isArray(record.maarifRefs) && record.maarifRefs.length === 0);
  const assignmentsEmpty =
    record.targetAssignments === undefined ||
    (Array.isArray(record.targetAssignments) &&
      record.targetAssignments.length === 0);
  return targetsEmpty && referencesEmpty && assignmentsEmpty;
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<{
  scope: ActiveClassroomScope;
  academicYears: StoredRecord[];
  classrooms: StoredRecord[];
}> {
  const [academicYears, classrooms, settings] = await Promise.all([
    transaction.getAll("academicYears"),
    transaction.getAll("classrooms"),
    transaction.getAll("settings"),
  ]);
  const scope = resolveActiveClassroomScope({
    academicYears,
    classrooms,
    settings,
  });
  if (!scope) {
    throw new Error(
      "Anlık gözlem için etkin ve arşivlenmemiş bir sınıf gerekli.",
    );
  }
  return { scope, academicYears, classrooms };
}

export async function ensureSpontaneousObservationContext(
  store: LocalDataStore,
  input: EnsureSpontaneousObservationContextInput,
): Promise<SpontaneousObservationContext> {
  const studentId = validStudentId(input.studentId);
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Anlık gözlem günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const now = validNow(input.now ?? new Date());
  const timestamp = now.toISOString();
  let result: SpontaneousObservationContext | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
    ],
    async (transaction) => {
      const { scope, academicYears, classrooms } =
        await activeScopeInTransaction(transaction);
      const [students, plans, activities] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
      ]);
      if (!activeStudentInScope(students, studentId, scope)) {
        throw new Error(
          "Anlık gözlem yalnız aktif sınıftaki etkin bir çocuk için açılabilir.",
        );
      }

      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.civilDate < academicYear.startDate ||
        input.civilDate > academicYear.endDate
      ) {
        throw new Error(
          "Anlık gözlem günü aktif eğitim yılının tarih aralığında olmalıdır.",
        );
      }

      const classroom = classrooms.find(
        (record) =>
          record.id === scope.classroomId &&
          record.academicYearId === scope.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      const curriculumProfile = classroom?.curriculumProfileSnapshot;
      if (
        typeof curriculumProfile !== "object" ||
        curriculumProfile === null ||
        Array.isArray(curriculumProfile)
      ) {
        throw new Error(
          "Anlık gözlem için sınıfın kayıtlı program profili tamamlanmalıdır.",
        );
      }

      const matchingPlans = plans.filter(
        (record) =>
          record.planType === SPONTANEOUS_OBSERVATION_PLAN_TYPE &&
          isLiveContextRecord(record, scope, input.civilDate),
      );
      const matchingActivities = activities.filter(
        (record) =>
          record.activityKind === SPONTANEOUS_OBSERVATION_ACTIVITY_KIND &&
          isLiveContextRecord(record, scope, input.civilDate),
      );

      if (matchingPlans.length > 1 || matchingActivities.length > 1) {
        throw new Error(
          "Bu sınıf ve gün için birden fazla anlık gözlem bağlamı bulundu; kayıtlar silinmeden inceleme gerekir.",
        );
      }

      if (matchingPlans.length === 1 || matchingActivities.length === 1) {
        const plan = matchingPlans[0];
        const activity = matchingActivities[0];
        if (
          !plan ||
          !activity ||
          activity.planId !== plan.id ||
          !hasNoProgramTargets(plan) ||
          !hasNoProgramTargets(activity)
        ) {
          throw new Error(
            "Anlık gözlem bağlamı eksik veya program hedefi içeriyor; mevcut kayıtlar değiştirilmeden inceleme gerekir.",
          );
        }
        result = { plan, activity, created: false };
        return;
      }

      const planId = crypto.randomUUID();
      const activityId = crypto.randomUUID();
      const plan: StoredRecord = {
        id: planId,
        planType: SPONTANEOUS_OBSERVATION_PLAN_TYPE,
        title: CONTEXT_TITLE,
        status: "active",
        curriculumProfileSnapshot: curriculumProfile,
        curriculumTargets: [],
        maarifRefs: [],
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: CONTEXT_SCHEMA_VERSION,
      };
      const activity: StoredRecord = {
        id: activityId,
        planId,
        activityKind: SPONTANEOUS_OBSERVATION_ACTIVITY_KIND,
        title: CONTEXT_TITLE,
        startTime: timeInIstanbul(now),
        status: "in_progress",
        curriculumProfileSnapshot: curriculumProfile,
        curriculumTargets: [],
        maarifRefs: [],
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: CONTEXT_SCHEMA_VERSION,
      };
      await transaction.putMany("plans", [plan]);
      await transaction.putMany("activities", [activity]);
      result = { plan, activity, created: true };
    },
  );

  if (!result) {
    throw new Error("Anlık gözlem bağlamı oluşturulamadı.");
  }
  return result;
}
