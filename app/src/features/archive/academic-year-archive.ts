import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  isValueEvidenceLinkRecord,
  type ValueEvidenceLinkRecord,
} from "../../core/repository/entities.ts";

export const STUDENT_ENROLLMENT_VERSION = 1 as const;
export const STUDENT_ARCHIVE_VERSION = 1 as const;

export type StudentEnrollmentStatus =
  | "active"
  | "left"
  | "completed"
  | "transferred";

export interface StudentEnrollment {
  id: string;
  academicYearId: string;
  classroomId: string;
  startedOn: string;
  endedOn?: string;
  status: StudentEnrollmentStatus;
  schemaVersion: typeof STUDENT_ENROLLMENT_VERSION;
}

export interface AcademicYearArchiveSummary {
  academicYearId: string;
  academicYearName: string;
  archivedAt: string;
  closedOn: string;
  classroomCount: number;
  studentCount: number;
  attendanceCount: number;
  observationCount: number;
  activityCount: number;
  planCount: number;
  valueEvidenceLinkCount: number;
}

export interface StudentLongitudinalArchive {
  archiveVersion: typeof STUDENT_ARCHIVE_VERSION;
  generatedAt: string;
  studentId: string;
  student: StoredRecord;
  enrollments: StudentEnrollment[];
  academicYears: StoredRecord[];
  classrooms: StoredRecord[];
  attendanceRecords: StoredRecord[];
  observations: StoredRecord[];
  observationRevisions: StoredRecord[];
  evidenceCurriculumLinks: StoredRecord[];
  valueEvidenceLinks: ValueEvidenceLinkRecord[];
  activityReferences: StoredRecord[];
  planReferences: StoredRecord[];
  mediaAssets: StoredRecord[];
  portfolioSelections: StoredRecord[];
  reportDrafts: StoredRecord[];
  externalFeedback: StoredRecord[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isEnrollment(value: unknown): value is StudentEnrollment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    UUID_PATTERN.test(record.id) &&
    typeof record.academicYearId === "string" &&
    UUID_PATTERN.test(record.academicYearId) &&
    typeof record.classroomId === "string" &&
    UUID_PATTERN.test(record.classroomId) &&
    isCivilDate(record.startedOn) &&
    (record.endedOn === undefined || isCivilDate(record.endedOn)) &&
    (record.status === "active" ||
      record.status === "left" ||
      record.status === "completed" ||
      record.status === "transferred") &&
    record.schemaVersion === STUDENT_ENROLLMENT_VERSION
  );
}

export function studentEnrollments(record: StoredRecord): StudentEnrollment[] {
  return Array.isArray(record.enrollments)
    ? record.enrollments.filter(isEnrollment).map((enrollment) => ({ ...enrollment }))
    : [];
}

function scopeKey(academicYearId: string, classroomId: string): string {
  return `${academicYearId}\u0000${classroomId}`;
}

function recordScopeKey(record: StoredRecord): string | null {
  return typeof record.academicYearId === "string" &&
    typeof record.classroomId === "string"
    ? scopeKey(record.academicYearId, record.classroomId)
    : null;
}

function enrollmentScopes(record: StoredRecord): Set<string> {
  const scopes = new Set(
    studentEnrollments(record).map((enrollment) =>
      scopeKey(enrollment.academicYearId, enrollment.classroomId),
    ),
  );
  const current = recordScopeKey(record);
  if (current) scopes.add(current);
  return scopes;
}

function countByScope(
  records: readonly StoredRecord[],
  scopes: ReadonlySet<string>,
): number {
  return records.filter((record) => {
    const key = recordScopeKey(record);
    return key !== null && scopes.has(key);
  }).length;
}

export function listAcademicYearArchives(
  snapshot: DataSnapshot,
): AcademicYearArchiveSummary[] {
  return snapshot.academicYears
    .filter(
      (academicYear) =>
        academicYear.status === "archived" &&
        typeof academicYear.archivedAt === "string" &&
        typeof academicYear.closedOn === "string",
    )
    .map((academicYear) => {
      const classrooms = snapshot.classrooms.filter(
        (classroom) => classroom.academicYearId === academicYear.id,
      );
      const scopes = new Set(
        classrooms.map((classroom) => scopeKey(academicYear.id, classroom.id)),
      );
      const students = snapshot.students.filter((student) =>
        [...enrollmentScopes(student)].some((key) => scopes.has(key)),
      );
      return {
        academicYearId: academicYear.id,
        academicYearName:
          typeof academicYear.name === "string" ? academicYear.name : "Arşivlenmiş eğitim yılı",
        archivedAt: academicYear.archivedAt as string,
        closedOn: academicYear.closedOn as string,
        classroomCount: classrooms.length,
        studentCount: students.length,
        attendanceCount: countByScope(snapshot.attendanceRecords, scopes),
        observationCount: countByScope(snapshot.observations, scopes),
        activityCount: countByScope(snapshot.activities, scopes),
        planCount: countByScope(snapshot.plans, scopes),
        valueEvidenceLinkCount: countByScope(
          snapshot.valueEvidenceLinks,
          scopes,
        ),
      };
    })
    .sort((left, right) => right.closedOn.localeCompare(left.closedOn));
}

export async function archiveAcademicYear(
  store: LocalDataStore,
  input: {
    academicYearId: string;
    closedOn: string;
    now?: Date;
  },
): Promise<AcademicYearArchiveSummary> {
  if (!UUID_PATTERN.test(input.academicYearId)) {
    throw new Error("Arşivlenecek eğitim yılı kimliği geçersiz.");
  }
  if (!isCivilDate(input.closedOn)) {
    throw new Error("Eğitim yılı kapanış günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Eğitim yılı arşivi için geçerli bir zaman gerekli.");
  }
  const archivedAt = now.toISOString();
  const civilDate = civilDateInIstanbul(now);

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "students",
      "attendanceRecords",
      "observations",
      "activities",
      "plans",
      "settings",
      "auditLogs",
    ],
    async (transaction) => {
      const [
        academicYears,
        classrooms,
        students,
        attendanceRecords,
        observations,
        activities,
        plans,
        settings,
      ] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("students"),
        transaction.getAll("attendanceRecords"),
        transaction.getAll("observations"),
        transaction.getAll("activities"),
        transaction.getAll("plans"),
        transaction.getAll("settings"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === input.academicYearId,
      );
      if (!academicYear || typeof academicYear.deletedAt === "string") {
        throw new Error("Arşivlenecek eğitim yılı bulunamadı.");
      }
      if (academicYear.status === "archived") return;

      const yearClassrooms = classrooms.filter(
        (record) =>
          record.academicYearId === input.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      if (yearClassrooms.length === 0) {
        throw new Error("Eğitim yılına bağlı sınıf bulunmadığı için arşiv oluşturulamadı.");
      }
      const classroomIds = new Set(yearClassrooms.map((record) => record.id));
      const unresolvedScopeRecords = [
        ...students,
        ...attendanceRecords,
        ...observations,
        ...activities,
        ...plans,
      ].filter(
        (record) =>
          record.legacyAssignmentStatus === "needs-review" &&
          (record.academicYearId === input.academicYearId ||
            (typeof record.classroomId === "string" &&
              classroomIds.has(record.classroomId)) ||
            (record.academicYearId === undefined && record.classroomId === undefined)),
      );
      if (unresolvedScopeRecords.length > 0) {
        throw new Error(
          "Kapsamı belirsiz eski kayıtlar çözülmeden eğitim yılı arşivlenemez.",
        );
      }
      const changedStudents: StoredRecord[] = [];
      for (const student of students) {
        const currentMatches =
          student.academicYearId === input.academicYearId &&
          typeof student.classroomId === "string" &&
          classroomIds.has(student.classroomId);
        const enrollments = studentEnrollments(student);
        const matchingEnrollment = enrollments.find(
          (enrollment) =>
            enrollment.academicYearId === input.academicYearId &&
            classroomIds.has(enrollment.classroomId),
        );
        if (!currentMatches && !matchingEnrollment) continue;

        const classroomId = currentMatches
          ? (student.classroomId as string)
          : matchingEnrollment!.classroomId;
        const nextEnrollment: StudentEnrollment = {
          ...(matchingEnrollment ?? {}),
          id: matchingEnrollment?.id ?? crypto.randomUUID(),
          academicYearId: input.academicYearId,
          classroomId,
          startedOn:
            matchingEnrollment?.startedOn ??
            (typeof academicYear.startDate === "string" &&
            isCivilDate(academicYear.startDate)
              ? academicYear.startDate
              : input.closedOn),
          endedOn:
            matchingEnrollment?.status === "left" && matchingEnrollment.endedOn
              ? matchingEnrollment.endedOn
              : typeof student.deletedAt === "string"
                ? civilDateInIstanbul(new Date(student.deletedAt))
                : input.closedOn,
          status:
            matchingEnrollment?.status === "left" ||
            typeof student.deletedAt === "string"
              ? "left"
              : "completed",
          schemaVersion: STUDENT_ENROLLMENT_VERSION,
        };
        const nextEnrollments = matchingEnrollment
          ? enrollments.map((enrollment) =>
              enrollment.id === matchingEnrollment.id ? nextEnrollment : enrollment,
            )
          : [...enrollments, nextEnrollment];
        changedStudents.push({
          ...student,
          enrollments: nextEnrollments,
          ...(currentMatches
            ? {
                active: false,
                enrollmentStatus: nextEnrollment.status,
                ...(typeof student.deletedAt === "string"
                  ? { legacyRosterDeletedAt: student.deletedAt }
                  : {}),
                deletedAt: null,
                updatedAt: archivedAt,
              }
            : {}),
        });
      }

      const activeSelection = settings.find(
        (record) =>
          record.settingType === "active-classroom-selection" &&
          record.academicYearId === input.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      await transaction.putMany("academicYears", [
        {
          ...academicYear,
          status: "archived",
          archivedAt,
          closedOn: input.closedOn,
          updatedAt: archivedAt,
        },
      ]);
      await transaction.putMany(
        "classrooms",
        yearClassrooms.map((classroom) => ({
          ...classroom,
          status: "archived",
          archiveStatus: "archived",
          archivedAt,
          updatedAt: archivedAt,
        })),
      );
      if (changedStudents.length > 0) {
        await transaction.putMany("students", changedStudents);
      }
      if (activeSelection) {
        await transaction.putMany("settings", [
          {
            ...activeSelection,
            deletedAt: archivedAt,
            archivedAt,
            updatedAt: archivedAt,
          },
        ]);
      }
      await transaction.putMany("auditLogs", [
        {
          id: crypto.randomUUID(),
          action: "academic-year-archived",
          entityType: "academicYear",
          entityId: input.academicYearId,
          classroomCount: yearClassrooms.length,
          studentCount: changedStudents.length,
          createdAt: archivedAt,
          updatedAt: archivedAt,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );

  const summary = listAcademicYearArchives(await store.readSnapshot()).find(
    (item) => item.academicYearId === input.academicYearId,
  );
  if (!summary) throw new Error("Eğitim yılı arşivlendi ancak arşiv özeti okunamadı.");
  return summary;
}

export async function reenrollArchivedStudent(
  store: LocalDataStore,
  input: {
    studentId: string;
    academicYearId: string;
    classroomId: string;
    startedOn: string;
    now?: Date;
  },
): Promise<StoredRecord> {
  if (
    !UUID_PATTERN.test(input.studentId) ||
    !UUID_PATTERN.test(input.academicYearId) ||
    !UUID_PATTERN.test(input.classroomId)
  ) {
    throw new Error("Öğrenci veya sınıf üyeliği kimliği geçersiz.");
  }
  if (!isCivilDate(input.startedOn)) {
    throw new Error("Yeni sınıf üyeliği başlangıcı YYYY-AA-GG biçiminde olmalıdır.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const updatedAt = now.toISOString();
  let result: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "students"],
    async (transaction) => {
      const [academicYears, classrooms, students] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("students"),
      ]);
      const academicYear = academicYears.find(
        (record) =>
          record.id === input.academicYearId &&
          record.status !== "archived" &&
          typeof record.deletedAt !== "string",
      );
      const classroom = classrooms.find(
        (record) =>
          record.id === input.classroomId &&
          record.academicYearId === input.academicYearId &&
          record.archiveStatus !== "archived" &&
          record.status !== "archived" &&
          typeof record.deletedAt !== "string",
      );
      if (!academicYear || !classroom) {
        throw new Error("Yeni üyelik için etkin eğitim yılı ve sınıf bulunamadı.");
      }
      const student = students.find((record) => record.id === input.studentId);
      if (!student) throw new Error("Yeniden kaydedilecek öğrenci bulunamadı.");
      if (
        student.enrollmentStatus === "active" &&
        (student.academicYearId !== input.academicYearId ||
          student.classroomId !== input.classroomId)
      ) {
        throw new Error("Öğrencinin başka bir etkin sınıf üyeliği önce kapatılmalıdır.");
      }
      const enrollments = studentEnrollments(student);
      const existing = enrollments.find(
        (enrollment) =>
          enrollment.academicYearId === input.academicYearId &&
          enrollment.classroomId === input.classroomId,
      );
      const activeEnrollment: StudentEnrollment = {
        ...(existing ?? {}),
        id: existing?.id ?? crypto.randomUUID(),
        academicYearId: input.academicYearId,
        classroomId: input.classroomId,
        startedOn: existing?.startedOn ?? input.startedOn,
        status: "active",
        schemaVersion: STUDENT_ENROLLMENT_VERSION,
      };
      delete activeEnrollment.endedOn;
      const nextEnrollments = existing
        ? enrollments.map((enrollment) =>
            enrollment.id === existing.id ? activeEnrollment : enrollment,
          )
        : [...enrollments, activeEnrollment];
      const next: StoredRecord = {
        ...student,
        academicYearId: input.academicYearId,
        classroomId: input.classroomId,
        enrollments: nextEnrollments,
        enrollmentStatus: "active",
        active: true,
        deletedAt: null,
        updatedAt,
      };
      delete next.legacyAssignmentStatus;
      await transaction.putMany("students", [next]);
      result = next;
    },
  );
  if (!result) throw new Error("Öğrencinin yeni sınıf üyeliği kaydedilemedi.");
  return result;
}

export function buildStudentLongitudinalArchiveFromSnapshot(
  snapshot: DataSnapshot,
  input: { studentId: string; now?: Date },
): StudentLongitudinalArchive {
  if (!UUID_PATTERN.test(input.studentId)) {
    throw new Error("Arşivi üretilecek öğrenci kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir arşiv zamanı gerekli.");
  const student = snapshot.students.find((record) => record.id === input.studentId);
  if (!student) throw new Error("Arşivi üretilecek öğrenci bulunamadı.");

  const enrollments = studentEnrollments(student);
  if (
    typeof student.academicYearId === "string" &&
    typeof student.classroomId === "string" &&
    !enrollments.some(
      (enrollment) =>
        enrollment.academicYearId === student.academicYearId &&
        enrollment.classroomId === student.classroomId,
    )
  ) {
    enrollments.push({
      id: crypto.randomUUID(),
      academicYearId: student.academicYearId,
      classroomId: student.classroomId,
      startedOn: isCivilDate(student.civilDate)
        ? student.civilDate
        : civilDateInIstanbul(now),
      status: student.enrollmentStatus === "completed" ? "completed" : "active",
      ...(student.enrollmentStatus === "completed" && isCivilDate(student.civilDate)
        ? { endedOn: student.civilDate }
        : {}),
      schemaVersion: STUDENT_ENROLLMENT_VERSION,
    });
  }
  const academicYearIds = new Set(enrollments.map((item) => item.academicYearId));
  const classroomIds = new Set(enrollments.map((item) => item.classroomId));
  const observations = snapshot.observations.filter(
    (record) =>
      Array.isArray(record.studentIds) && record.studentIds.includes(input.studentId),
  );
  const observationIds = new Set(observations.map((record) => record.id));
  const activityIds = new Set(
    observations
      .map((record) => record.activityId)
      .filter((id): id is string => typeof id === "string"),
  );
  const planIds = new Set(
    observations
      .map((record) => record.planId)
      .filter((id): id is string => typeof id === "string"),
  );

  return {
    archiveVersion: STUDENT_ARCHIVE_VERSION,
    generatedAt: now.toISOString(),
    studentId: input.studentId,
    student: { ...student },
    enrollments,
    academicYears: snapshot.academicYears.filter((record) =>
      academicYearIds.has(record.id),
    ),
    classrooms: snapshot.classrooms.filter((record) =>
      classroomIds.has(record.id),
    ),
    attendanceRecords: snapshot.attendanceRecords.filter(
      (record) => record.studentId === input.studentId,
    ),
    observations,
    observationRevisions: snapshot.observationRevisions.filter(
      (record) =>
        typeof record.observationId === "string" &&
        observationIds.has(record.observationId),
    ),
    evidenceCurriculumLinks: snapshot.evidenceCurriculumLinks.filter(
      (record) =>
        typeof record.observationId === "string" &&
        observationIds.has(record.observationId),
    ),
    valueEvidenceLinks: snapshot.valueEvidenceLinks.filter(
      (record): record is ValueEvidenceLinkRecord =>
        isValueEvidenceLinkRecord(record) &&
        record.studentId === input.studentId,
    ),
    activityReferences: snapshot.activities.filter((record) =>
      activityIds.has(record.id),
    ),
    planReferences: snapshot.plans.filter((record) => planIds.has(record.id)),
    mediaAssets: snapshot.mediaAssets.filter(
      (record) =>
        Array.isArray(record.studentIds) && record.studentIds.includes(input.studentId),
    ),
    portfolioSelections: snapshot.portfolioSelections.filter(
      (record) => record.studentId === input.studentId,
    ),
    reportDrafts: snapshot.reportDrafts.filter(
      (record) =>
        Array.isArray(record.studentIds) && record.studentIds.includes(input.studentId),
    ),
    externalFeedback: snapshot.externalFeedback.filter(
      (record) => record.studentId === input.studentId,
    ),
  };
}

export async function buildStudentLongitudinalArchive(
  store: LocalDataStore,
  input: { studentId: string; now?: Date },
): Promise<StudentLongitudinalArchive> {
  return buildStudentLongitudinalArchiveFromSnapshot(
    await store.readSnapshot(),
    input,
  );
}
