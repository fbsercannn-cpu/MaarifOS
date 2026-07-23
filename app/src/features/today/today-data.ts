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

export { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE };

export type TodayActivityStatus = "planned" | "in_progress" | "completed";

export type ClassroomContext =
  | { status: "not_configured" }
  | {
      status: "configured";
      academicYearId: string;
      academicYearName: string;
      classroomId: string;
      classroomName: string;
      ageGroup?: string;
      curriculumProgram?: string;
      curriculumCatalogLabel?: string;
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
  };
  schedule: ClassroomScheduleInput;
  now?: Date;
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

function classroomContext(snapshot: DataSnapshot): ClassroomContext {
  const classroom = selectedClassroom(snapshot);
  if (!classroom || !isClassroomSchedule(classroom.schedule)) return { status: "not_configured" };

  const academicYear = snapshot.academicYears.find(
    (record) =>
      record.id === classroom.academicYearId &&
      record.status !== "archived" &&
      typeof record.deletedAt !== "string",
  );
  if (!academicYear || typeof academicYear.name !== "string" || !academicYear.name.trim()) {
    return { status: "not_configured" };
  }

  return {
    status: "configured",
    academicYearId: classroom.academicYearId,
    academicYearName: academicYear.name.trim(),
    classroomId: classroom.id,
    classroomName: classroom.name.trim(),
    ...(classroom.ageGroup ? { ageGroup: classroom.ageGroup } : {}),
    ...(classroom.curriculumProgram ? { curriculumProgram: classroom.curriculumProgram } : {}),
    ...(classroom.curriculumCatalogLabel
      ? { curriculumCatalogLabel: classroom.curriculumCatalogLabel }
      : {}),
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

function curriculumReferenceIds(record: StoredRecord): string[] {
  return Array.isArray(record.maarifRefs)
    ? record.maarifRefs.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
}

export function resolveTodayWorkspace(snapshot: DataSnapshot, now = new Date()): TodayWorkspace {
  const civilDate = civilDateInIstanbul(now);
  const classroom = classroomContext(snapshot);
  const scope = resolveActiveClassroomScope(snapshot);
  const scopedActivities = scope
    ? snapshot.activities.filter((record) =>
        recordBelongsToClassroomScope(record, scope),
      )
    : [];
  const scopedPlans = scope
    ? snapshot.plans.filter((record) =>
        recordBelongsToClassroomScope(record, scope),
      )
    : [];
  const planItems = scopedActivities
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
  const linkedGoals = new Set<string>();
  for (const record of [...scopedActivities, ...scopedPlans]) {
    if (record.civilDate !== civilDate || typeof record.deletedAt === "string") continue;
    for (const referenceId of curriculumReferenceIds(record)) linkedGoals.add(referenceId);
  }
  const scopedEvidenceLinks = scope
    ? snapshot.evidenceCurriculumLinks.filter((record) =>
        recordBelongsToClassroomScope(record, scope),
      )
    : [];
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
    pendingEvidenceLinks: todayObservations.filter(
      (record) =>
        curriculumReferenceIds(record).length === 0 &&
        !linkedObservationIds.has(record.id),
    ).length,
    linkedLearningGoalCount: linkedGoals.size,
    datedEvidenceCount: todayObservations.length,
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
      const preservedClassroom: Record<string, unknown> = existingClassroom
        ? { ...existingClassroom }
        : {};
      const preservedSelection: Record<string, unknown> = existingSelection
        ? { ...existingSelection }
        : {};
      delete preservedClassroom.ageGroup;
      delete preservedClassroom.curriculumProgram;
      delete preservedClassroom.curriculumCatalogLabel;
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
    await transaction.putMany("activities", [
      {
        ...existing,
        status,
        updatedAt: now.toISOString(),
      },
    ]);
  });
}
