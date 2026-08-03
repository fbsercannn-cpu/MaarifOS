import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  CLASSROOM_SCHEMA_VERSION,
  classroomScheduleLabel,
  isClassroomRecord,
  isClassroomSchedule,
  isLocalTime,
  normalizeClassroomSchedule,
  type ClassroomRecord,
  type ClassroomSchedule,
  type ClassroomScheduleInput,
} from "../../core/domain/classroom.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { migrateLegacyClassroomScopes } from "../../core/migrations/classroom-scope-migration.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  normalizeCurriculumProfile,
  type CurriculumProfileInput,
  type CurriculumProfileSnapshot,
} from "../evidence/evidence-flow.ts";
import {
  STUDENT_ENROLLMENT_VERSION,
  studentEnrollments,
  type StudentEnrollment,
} from "../archive/academic-year-archive.ts";
import { SPONTANEOUS_OBSERVATION_ACTIVITY_KIND } from "../evidence/spontaneous-observation.ts";

export { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE };

export type TodayActivityStatus = "planned" | "in_progress" | "completed";
export type AcademicYearOperationalStatus =
  | "active"
  | "preparation"
  | "ended";

export function academicYearOperationalStatus(
  startDate: string,
  endDate: string,
  civilDate: string,
): AcademicYearOperationalStatus {
  if (!isCivilDate(startDate) || !isCivilDate(endDate) || !isCivilDate(civilDate)) {
    throw new Error("Eğitim yılı çalışma durumu için geçerli tarihler gereklidir.");
  }
  if (startDate > endDate) {
    throw new Error("Eğitim yılı bitiş tarihi başlangıç tarihinden önce olamaz.");
  }
  if (civilDate < startDate) return "preparation";
  if (civilDate > endDate) return "ended";
  return "active";
}

export function academicYearOperationalNotice(options: {
  status: AcademicYearOperationalStatus;
  startDate: string;
  endDate: string;
}): string | null {
  if (options.status === "active") return null;
  if (options.status === "preparation") {
    return `Hazırlık modu: eğitim yılı ${options.startDate} tarihinde başlayacak. Plan, yoklama ve gözlem için bugün etkin olan eğitim yılını seçin.`;
  }
  return `Bu eğitim yılı ${options.endDate} tarihinde sona erdi. Plan, yoklama ve gözlem için yeni veya bugün etkin olan eğitim yılını seçin.`;
}

export type ClassroomContext =
  | { status: "not_configured" }
  | {
      status: "configured";
      academicYearId: string;
      academicYearName: string;
      academicYearStart: string;
      academicYearEnd: string;
      operationalStatus: AcademicYearOperationalStatus;
      classroomId: string;
      classroomName: string;
      ageGroup?: string;
      curriculumProgram?: string;
      curriculumCatalogLabel?: string;
      curriculumProfile?: CurriculumProfileSnapshot;
      schedule: ClassroomSchedule;
      scheduleLabel: string;
    };

export interface TodayPlanItem {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  subject?: string;
  curriculumConnection?: string;
  status: TodayActivityStatus;
  evidenceCount: number;
}

export interface TodayWorkspace {
  civilDate: string;
  classroom: ClassroomContext;
  currentActivity: TodayPlanItem | null;
  planItems: TodayPlanItem[];
  pendingEvidenceLinks: number;
  linkedLearningGoalCount: number;
  datedEvidenceCount: number;
}

export interface SaveClassroomConfigurationInput {
  academicYear: {
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  classroom: {
    id?: string;
    name: string;
    ageGroup?: string;
    curriculumProgram?: string;
    curriculumCatalogLabel?: string;
    curriculumProfile?: CurriculumProfileInput;
  };
  schedule: ClassroomScheduleInput;
  now?: Date;
}

export interface TransitionAcademicYearConfigurationInput
  extends SaveClassroomConfigurationInput {
  carryStudentIds: readonly string[];
  closedOn: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} boş bırakılamaz.`);
  return normalized;
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validUuid(value: string | undefined, fieldName: string): string {
  const id = value ?? crypto.randomUUID();
  if (!UUID_PATTERN.test(id)) throw new Error(`${fieldName} kimliği geçersiz.`);
  return id;
}

function isActiveClassroomSetting(record: StoredRecord): boolean {
  return (
    record.settingType === ACTIVE_CLASSROOM_SETTING_TYPE &&
    typeof record.classroomId === "string" &&
    UUID_PATTERN.test(record.classroomId) &&
    typeof record.academicYearId === "string" &&
    UUID_PATTERN.test(record.academicYearId)
  );
}

function selectedClassroom(snapshot: DataSnapshot): ClassroomRecord | undefined {
  const active = snapshot.settings.find(
    (record) => record.id === ACTIVE_CLASSROOM_SETTING_ID && isActiveClassroomSetting(record),
  );
  if (active) {
    const candidate = snapshot.classrooms.find(
      (record) =>
        record.id === active.classroomId &&
        record.academicYearId === active.academicYearId &&
        record.status !== "archived" &&
        record.archiveStatus !== "archived" &&
        typeof record.deletedAt !== "string",
    );
    const academicYear = snapshot.academicYears.find(
      (record) =>
        record.id === active.academicYearId &&
        record.status !== "archived" &&
        typeof record.deletedAt !== "string",
    );
    return candidate && academicYear && isClassroomRecord(candidate)
      ? candidate
      : undefined;
  }

  const available = snapshot.classrooms.filter(
    (record): record is ClassroomRecord =>
      typeof record.deletedAt !== "string" &&
      record.status !== "archived" &&
      record.archiveStatus !== "archived" &&
      snapshot.academicYears.some(
        (academicYear) =>
          academicYear.id === record.academicYearId &&
          academicYear.status !== "archived" &&
          typeof academicYear.deletedAt !== "string",
      ) &&
      isClassroomRecord(record),
  );
  return available.length === 1 ? available[0] : undefined;
}

function classroomContext(
  snapshot: DataSnapshot,
  civilDate: string,
): ClassroomContext {
  const classroom = selectedClassroom(snapshot);
  if (!classroom || !isClassroomSchedule(classroom.schedule)) return { status: "not_configured" };

  const academicYear = snapshot.academicYears.find(
    (record) =>
      record.id === classroom.academicYearId &&
      record.status !== "archived" &&
      typeof record.deletedAt !== "string",
  );
  if (
    !academicYear ||
    typeof academicYear.name !== "string" ||
    !academicYear.name.trim() ||
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    academicYear.startDate > academicYear.endDate
  ) {
    return { status: "not_configured" };
  }

  let curriculumProfile: CurriculumProfileSnapshot | undefined;
  if (
    typeof classroom.curriculumProfileSnapshot === "object" &&
    classroom.curriculumProfileSnapshot !== null &&
    !Array.isArray(classroom.curriculumProfileSnapshot)
  ) {
    try {
      curriculumProfile = normalizeCurriculumProfile(
        classroom.curriculumProfileSnapshot as unknown as CurriculumProfileInput,
      );
    } catch {
      curriculumProfile = undefined;
    }
  }

  return {
    status: "configured",
    academicYearId: classroom.academicYearId,
    academicYearName: academicYear.name.trim(),
    academicYearStart: academicYear.startDate,
    academicYearEnd: academicYear.endDate,
    operationalStatus: academicYearOperationalStatus(
      academicYear.startDate,
      academicYear.endDate,
      civilDate,
    ),
    classroomId: classroom.id,
    classroomName: classroom.name.trim(),
    ...(classroom.ageGroup ? { ageGroup: classroom.ageGroup } : {}),
    ...(classroom.curriculumProgram ? { curriculumProgram: classroom.curriculumProgram } : {}),
    ...(classroom.curriculumCatalogLabel
      ? { curriculumCatalogLabel: classroom.curriculumCatalogLabel }
      : {}),
    ...(curriculumProfile ? { curriculumProfile } : {}),
    schedule: classroom.schedule,
    scheduleLabel: classroomScheduleLabel(classroom.schedule),
  };
}

function activityFromRecord(record: StoredRecord, civilDate: string): TodayPlanItem | null {
  if (
    record.civilDate !== civilDate ||
    typeof record.deletedAt === "string" ||
    typeof record.title !== "string" ||
    !record.title.trim() ||
    !isLocalTime(record.startTime)
  ) {
    return null;
  }
  const status = record.status;
  if (status !== "planned" && status !== "in_progress" && status !== "completed") return null;
  if (record.endTime !== undefined && !isLocalTime(record.endTime)) return null;

  const evidenceIds = Array.isArray(record.evidenceIds)
    ? record.evidenceIds.filter((id): id is string => typeof id === "string")
    : [];
  const storedCount = typeof record.evidenceCount === "number" && Number.isInteger(record.evidenceCount)
    ? record.evidenceCount
    : evidenceIds.length;

  return {
    id: record.id,
    title: record.title.trim(),
    startTime: record.startTime,
    ...(typeof record.endTime === "string" ? { endTime: record.endTime } : {}),
    ...(typeof record.subject === "string" && record.subject.trim()
      ? { subject: record.subject.trim() }
      : {}),
    ...(typeof record.curriculumConnection === "string" && record.curriculumConnection.trim()
      ? { curriculumConnection: record.curriculumConnection.trim() }
      : {}),
    status,
    evidenceCount: Math.max(0, storedCount),
  };
}

export function resolveTodayWorkspace(snapshot: DataSnapshot, now = new Date()): TodayWorkspace {
  const civilDate = civilDateInIstanbul(now);
  const classroom = classroomContext(snapshot, civilDate);
  const scope = resolveActiveClassroomScope(snapshot);
  const scopedActivities = scope
    ? snapshot.activities.filter(
        (record) =>
          record.activityKind !== SPONTANEOUS_OBSERVATION_ACTIVITY_KIND &&
          recordBelongsToClassroomScope(record, scope),
      )
    : [];
  const basePlanItems = scopedActivities
    .map((record) => activityFromRecord(record, civilDate))
    .filter((item): item is TodayPlanItem => item !== null)
    .sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id));
  const todayObservations = scope
    ? snapshot.observations.filter(
        (record) =>
          recordBelongsToClassroomScope(record, scope) &&
          record.civilDate === civilDate &&
          typeof record.deletedAt !== "string",
      )
    : [];
  const structuredTodayObservations = todayObservations.filter(
    (record) =>
      record.rawTextImmutable === true &&
      typeof record.planId === "string" &&
      typeof record.activityId === "string",
  );
  const evidenceCountByActivity = new Map<string, number>();
  for (const record of structuredTodayObservations) {
    evidenceCountByActivity.set(
      record.activityId as string,
      (evidenceCountByActivity.get(record.activityId as string) ?? 0) + 1,
    );
  }
  const planItems = basePlanItems.map((item) => ({
    ...item,
    evidenceCount: evidenceCountByActivity.get(item.id) ?? item.evidenceCount,
  }));
  const todayObservationIds = new Set(
    structuredTodayObservations.map((record) => record.id),
  );
  const scopedEvidenceLinks = scope
    ? snapshot.evidenceCurriculumLinks.filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          typeof record.observationId === "string" &&
          todayObservationIds.has(record.observationId) &&
          recordBelongsToClassroomScope(record, scope),
      )
    : [];
  const linkedGoals = new Set<string>();
  const linkedObservationIds = new Set(
    scopedEvidenceLinks
      .map((record) => record.observationId)
      .filter((id): id is string => typeof id === "string"),
  );
  for (const link of scopedEvidenceLinks) {
    if (typeof link.referenceCode === "string" && link.referenceCode) {
      linkedGoals.add(link.referenceCode);
    }
  }

  return {
    civilDate,
    classroom,
    currentActivity: planItems.find((item) => item.status === "in_progress") ?? null,
    planItems,
    pendingEvidenceLinks: structuredTodayObservations.filter(
      (record) => !linkedObservationIds.has(record.id),
    ).length,
    linkedLearningGoalCount: linkedGoals.size,
    datedEvidenceCount: structuredTodayObservations.length,
  };
}

export async function loadTodayWorkspace(
  store: LocalDataStore,
  options: { now?: Date } = {},
): Promise<TodayWorkspace> {
  await migrateLegacyClassroomScopes(store, { now: options.now });
  return resolveTodayWorkspace(await store.readSnapshot(), options.now ?? new Date());
}

export async function saveClassroomConfiguration(
  store: LocalDataStore,
  input: SaveClassroomConfigurationInput,
): Promise<ClassroomContext> {
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  if (!isCivilDate(input.academicYear.startDate) || !isCivilDate(input.academicYear.endDate)) {
    throw new Error("Eğitim yılı tarihleri YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (input.academicYear.startDate > input.academicYear.endDate) {
    throw new Error("Eğitim yılı bitiş tarihi başlangıç tarihinden önce olamaz.");
  }

  const academicYearId = validUuid(input.academicYear.id, "Eğitim yılı");
  const classroomId = validUuid(input.classroom.id, "Sınıf");
  const academicYearName = requiredText(input.academicYear.name, "Eğitim yılı adı");
  const classroomName = requiredText(input.classroom.name, "Sınıf adı");
  const schedule = normalizeClassroomSchedule(input.schedule);
  const curriculumProfile = input.classroom.curriculumProfile
    ? normalizeCurriculumProfile(input.classroom.curriculumProfile)
    : undefined;
  const updatedAt = now.toISOString();
  const civilDate = civilDateInIstanbul(now);

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings"],
    async (transaction) => {
      const [academicYears, classrooms, settings] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("settings"),
      ]);
      const existingAcademicYear = academicYears.find((record) => record.id === academicYearId);
      const existingClassroom = classrooms.find((record) => record.id === classroomId);
      if (existingAcademicYear?.status === "archived") {
        throw new Error("Arşivlenmiş eğitim yılı değiştirilemez; yeni eğitim yılı oluşturun.");
      }
      if (
        existingClassroom?.status === "archived" ||
        existingClassroom?.archiveStatus === "archived"
      ) {
        throw new Error("Arşivlenmiş sınıf değiştirilemez; yeni sınıf oluşturun.");
      }
      const existingSelection = settings.find((record) => record.id === ACTIVE_CLASSROOM_SETTING_ID);
      let resolvedCurriculumProfile = curriculumProfile;
      if (!resolvedCurriculumProfile && existingClassroom?.curriculumProfileSnapshot) {
        try {
          resolvedCurriculumProfile = normalizeCurriculumProfile(
            existingClassroom.curriculumProfileSnapshot as unknown as CurriculumProfileInput,
          );
        } catch {
          resolvedCurriculumProfile = undefined;
        }
      }
      const preservedClassroom: Record<string, unknown> = existingClassroom
        ? { ...existingClassroom }
        : {};
      const preservedSelection: Record<string, unknown> = existingSelection
        ? { ...existingSelection }
        : {};
      delete preservedClassroom.ageGroup;
      delete preservedClassroom.curriculumProgram;
      delete preservedClassroom.curriculumCatalogLabel;
      delete preservedClassroom.curriculumProfileSnapshot;
      delete preservedSelection.archivedAt;

      await transaction.putMany("academicYears", [
        {
          ...(existingAcademicYear ?? {}),
          id: academicYearId,
          name: academicYearName,
          startDate: input.academicYear.startDate,
          endDate: input.academicYear.endDate,
          status: "active",
          createdAt: existingAcademicYear?.createdAt ?? updatedAt,
          updatedAt,
          civilDate: existingAcademicYear?.civilDate ?? civilDate,
          deletedAt: null,
          schemaVersion: existingAcademicYear?.schemaVersion ?? 1,
        },
      ]);
      await transaction.putMany("classrooms", [
        {
          ...preservedClassroom,
          id: classroomId,
          academicYearId,
          name: classroomName,
          ...(optionalText(input.classroom.ageGroup)
            ? { ageGroup: optionalText(input.classroom.ageGroup) }
            : {}),
          ...(optionalText(input.classroom.curriculumProgram)
            ? { curriculumProgram: optionalText(input.classroom.curriculumProgram) }
            : {}),
          ...(optionalText(input.classroom.curriculumCatalogLabel)
            ? { curriculumCatalogLabel: optionalText(input.classroom.curriculumCatalogLabel) }
            : {}),
          ...(resolvedCurriculumProfile
            ? { curriculumProfileSnapshot: resolvedCurriculumProfile }
            : {}),
          schedule,
          createdAt: existingClassroom?.createdAt ?? updatedAt,
          updatedAt,
          civilDate: existingClassroom?.civilDate ?? civilDate,
          deletedAt: null,
          schemaVersion: CLASSROOM_SCHEMA_VERSION,
        },
      ]);
      await transaction.putMany("settings", [
        {
          ...preservedSelection,
          id: ACTIVE_CLASSROOM_SETTING_ID,
          settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId,
          classroomId,
          createdAt: existingSelection?.createdAt ?? updatedAt,
          updatedAt,
          civilDate: existingSelection?.civilDate ?? civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );

  const context = (await loadTodayWorkspace(store, { now })).classroom;
  if (context.status !== "configured") {
    throw new Error("Sınıf çalışma düzeni kaydedildi ancak yeniden okunamadı.");
  }
  return context;
}

export async function transitionAcademicYearConfiguration(
  store: LocalDataStore,
  input: TransitionAcademicYearConfigurationInput,
): Promise<ClassroomContext> {
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Geçerli bir eğitim yılı geçiş zamanı gerekli.");
  }
  if (
    !isCivilDate(input.closedOn) ||
    !isCivilDate(input.academicYear.startDate) ||
    !isCivilDate(input.academicYear.endDate)
  ) {
    throw new Error("Eğitim yılı geçiş tarihleri YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (input.academicYear.startDate > input.academicYear.endDate) {
    throw new Error("Yeni eğitim yılı bitiş tarihi başlangıçtan önce olamaz.");
  }
  const nextAcademicYearId = validUuid(input.academicYear.id, "Yeni eğitim yılı");
  const nextClassroomId = validUuid(input.classroom.id, "Yeni sınıf");
  const nextAcademicYearName = requiredText(
    input.academicYear.name,
    "Yeni eğitim yılı adı",
  );
  const nextClassroomName = requiredText(input.classroom.name, "Yeni sınıf adı");
  const schedule = normalizeClassroomSchedule(input.schedule);
  const curriculumProfile = input.classroom.curriculumProfile
    ? normalizeCurriculumProfile(input.classroom.curriculumProfile)
    : undefined;
  const carryStudentIds = [...new Set(input.carryStudentIds)];
  if (
    carryStudentIds.some((studentId) => !UUID_PATTERN.test(studentId))
  ) {
    throw new Error("Yeni eğitim yılına taşınacak öğrenci kimliği geçersiz.");
  }
  const timestamp = now.toISOString();
  const civilDate = civilDateInIstanbul(now);

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "students",
      "settings",
      "auditLogs",
    ],
    async (transaction) => {
      const [academicYears, classrooms, students, settings] =
        await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("students"),
          transaction.getAll("settings"),
        ]);
      const currentScope = resolveActiveClassroomScope({
        academicYears,
        classrooms,
        settings,
      });
      if (!currentScope) {
        throw new Error(
          "Yeni eğitim yılına geçmek için önce etkin sınıf bulunmalıdır.",
        );
      }
      if (
        nextAcademicYearId === currentScope.academicYearId ||
        nextClassroomId === currentScope.classroomId ||
        academicYears.some((record) => record.id === nextAcademicYearId) ||
        classrooms.some((record) => record.id === nextClassroomId)
      ) {
        throw new Error(
          "Yeni eğitim yılı ve sınıf kimlikleri önceki yıldan farklı olmalıdır.",
        );
      }
      const currentAcademicYear = academicYears.find(
        (record) => record.id === currentScope.academicYearId,
      );
      const currentClassroom = classrooms.find(
        (record) => record.id === currentScope.classroomId,
      );
      if (!currentAcademicYear || !currentClassroom) {
        throw new Error("Arşivlenecek etkin eğitim yılı veya sınıf bulunamadı.");
      }
      if (
        typeof currentAcademicYear.startDate !== "string" ||
        typeof currentAcademicYear.endDate !== "string" ||
        input.closedOn < currentAcademicYear.startDate ||
        input.closedOn > currentAcademicYear.endDate
      ) {
        throw new Error(
          "Önceki eğitim yılı kapanış günü kendi tarih aralığında olmalıdır.",
        );
      }
      if (input.academicYear.startDate <= input.closedOn) {
        throw new Error(
          "Yeni eğitim yılı başlangıcı önceki yılın kapanışından sonra olmalıdır.",
        );
      }

      const currentStudents = students.filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, currentScope),
      );
      const availableStudentIds = new Set(
        currentStudents.map((record) => record.id),
      );
      if (
        carryStudentIds.some(
          (studentId) => !availableStudentIds.has(studentId),
        )
      ) {
        throw new Error(
          "Yeni eğitim yılına yalnız etkin sınıftaki öğrenciler taşınabilir.",
        );
      }
      const carrySet = new Set(carryStudentIds);
      const changedStudents = currentStudents.map((student) => {
        const enrollments = studentEnrollments(student);
        const currentEnrollment = enrollments.find(
          (enrollment) =>
            enrollment.academicYearId === currentScope.academicYearId &&
            enrollment.classroomId === currentScope.classroomId,
        );
        const closedEnrollment: StudentEnrollment = {
          ...(currentEnrollment ?? {}),
          id: currentEnrollment?.id ?? crypto.randomUUID(),
          academicYearId: currentScope.academicYearId,
          classroomId: currentScope.classroomId,
          startedOn:
            currentEnrollment?.startedOn ??
            (currentAcademicYear.startDate as string),
          endedOn: input.closedOn,
          status:
            student.enrollmentStatus === "left"
              ? "left"
              : "completed",
          schemaVersion: STUDENT_ENROLLMENT_VERSION,
        };
        const closedEnrollments = currentEnrollment
          ? enrollments.map((enrollment) =>
              enrollment.id === currentEnrollment.id
                ? closedEnrollment
                : enrollment,
            )
          : [...enrollments, closedEnrollment];
        if (!carrySet.has(student.id)) {
          return {
            ...student,
            enrollments: closedEnrollments,
            active: false,
            enrollmentStatus: closedEnrollment.status,
            updatedAt: timestamp,
          };
        }
        const nextEnrollment: StudentEnrollment = {
          id: crypto.randomUUID(),
          academicYearId: nextAcademicYearId,
          classroomId: nextClassroomId,
          startedOn: input.academicYear.startDate,
          status: "active",
          schemaVersion: STUDENT_ENROLLMENT_VERSION,
        };
        return {
          ...student,
          academicYearId: nextAcademicYearId,
          classroomId: nextClassroomId,
          enrollments: [...closedEnrollments, nextEnrollment],
          active: true,
          enrollmentStatus: "active",
          deletedAt: null,
          updatedAt: timestamp,
        };
      });

      await transaction.putMany("academicYears", [
        {
          ...currentAcademicYear,
          status: "archived",
          archivedAt: timestamp,
          closedOn: input.closedOn,
          updatedAt: timestamp,
        },
        {
          id: nextAcademicYearId,
          name: nextAcademicYearName,
          startDate: input.academicYear.startDate,
          endDate: input.academicYear.endDate,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
      await transaction.putMany("classrooms", [
        {
          ...currentClassroom,
          status: "archived",
          archiveStatus: "archived",
          archivedAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: nextClassroomId,
          academicYearId: nextAcademicYearId,
          name: nextClassroomName,
          ...(optionalText(input.classroom.ageGroup)
            ? { ageGroup: optionalText(input.classroom.ageGroup) }
            : {}),
          ...(optionalText(input.classroom.curriculumProgram)
            ? { curriculumProgram: optionalText(input.classroom.curriculumProgram) }
            : {}),
          ...(optionalText(input.classroom.curriculumCatalogLabel)
            ? {
                curriculumCatalogLabel: optionalText(
                  input.classroom.curriculumCatalogLabel,
                ),
              }
            : {}),
          ...(curriculumProfile
            ? { curriculumProfileSnapshot: curriculumProfile }
            : {}),
          schedule,
          status: "active",
          archiveStatus: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: CLASSROOM_SCHEMA_VERSION,
        },
      ]);
      if (changedStudents.length > 0) {
        await transaction.putMany("students", changedStudents);
      }
      const existingSelection = settings.find(
        (record) => record.id === ACTIVE_CLASSROOM_SETTING_ID,
      );
      await transaction.putMany("settings", [
        {
          ...(existingSelection ?? {}),
          id: ACTIVE_CLASSROOM_SETTING_ID,
          settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: nextAcademicYearId,
          classroomId: nextClassroomId,
          createdAt: existingSelection?.createdAt ?? timestamp,
          updatedAt: timestamp,
          civilDate: existingSelection?.civilDate ?? civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
      await transaction.putMany("auditLogs", [
        {
          id: crypto.randomUUID(),
          action: "academic-year-transitioned",
          entityType: "academicYear",
          entityId: nextAcademicYearId,
          classroomCount: 1,
          studentCount: carrySet.size,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );

  const context = (await loadTodayWorkspace(store, { now })).classroom;
  if (context.status !== "configured") {
    throw new Error("Yeni eğitim yılı oluşturuldu ancak etkin sınıf okunamadı.");
  }
  return context;
}

export async function setTodayActivityStatus(
  store: LocalDataStore,
  activityId: string,
  status: TodayActivityStatus,
  options: { now?: Date } = {},
): Promise<void> {
  if (!UUID_PATTERN.test(activityId)) throw new Error("Etkinlik kimliği geçersiz.");
  if (status !== "planned" && status !== "in_progress" && status !== "completed") {
    throw new Error("Etkinlik durumu geçersiz.");
  }
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  await migrateLegacyClassroomScopes(store, { now });
  const scope = resolveActiveClassroomScope(await store.readSnapshot());
  if (!scope) {
    throw new Error("Etkinliği güncellemek için önce aktif sınıf yapılandırılmalıdır.");
  }

  await store.transaction("readwrite", ["activities"], async (transaction) => {
    const activities = await transaction.getAll("activities");
    const existing = activities.find(
      (record) =>
        record.id === activityId &&
        typeof record.deletedAt !== "string" &&
        recordBelongsToClassroomScope(record, scope),
    );
    if (!existing) {
      throw new Error("Etkinlik aktif sınıfta bulunamadı; mevcut kayıtlar değiştirilmedi.");
    }
    if (
      status === "in_progress" &&
      activities.some(
        (record) =>
          record.id !== activityId &&
          record.status === "in_progress" &&
          record.civilDate === existing.civilDate &&
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, scope),
      )
    ) {
      throw new Error(
        "Bu gün için başka bir etkinlik devam ediyor; önce onu tamamlayın.",
      );
    }
    await transaction.putMany("activities", [
      {
        ...existing,
        status,
        updatedAt: now.toISOString(),
      },
    ]);
  });
}
