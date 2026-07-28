import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import {
  QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION,
  QUICK_OBSERVATION_DRAFT_SETTING_TYPE,
  isQuickObservationDraftRecord,
  isQuickObservationType,
  normalizeQuickObservationCategories,
  type QuickObservationCategory,
  type QuickObservationDraft,
  type QuickObservationType,
} from "../../core/domain/quick-observation.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";

export {
  QUICK_OBSERVATION_CATEGORIES,
  QUICK_OBSERVATION_NEUTRAL_TEMPLATES,
  QUICK_OBSERVATION_TYPES,
  type QuickObservationCategory,
  type QuickObservationDraft,
  type QuickObservationType,
} from "../../core/domain/quick-observation.ts";

export interface PersistQuickObservationDraftInput {
  studentId: string;
  planId: string;
  activityId: string;
  rawText: string;
  context?: string;
  childQuote?: string;
  observationType: QuickObservationType;
  categoryIds: readonly QuickObservationCategory[];
  now?: Date;
}

export interface FinalizeQuickObservationDraftInput {
  studentId: string;
  observationId?: string;
  observedAt?: string;
  now?: Date;
}

export interface FinalizedQuickObservation {
  observation: StoredRecord;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value: string | undefined, fieldName: string): string {
  const id = value ?? crypto.randomUUID();
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`${fieldName} kimliği geçersiz.`);
  }
  return id;
}

function validDate(value: Date, fieldName: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${fieldName} geçerli olmalıdır.`);
  }
  return value;
}

function validUtc(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${fieldName} UTC ISO biçiminde olmalıdır.`);
  }
  return value;
}

function activeStudent(
  records: readonly StoredRecord[],
  studentId: string,
  scope: ActiveClassroomScope,
): StoredRecord | undefined {
  return records.find(
    (record) =>
      record.id === studentId &&
      typeof record.deletedAt !== "string" &&
      record.enrollmentStatus !== "left" &&
      record.enrollmentStatus !== "completed" &&
      record.enrollmentStatus !== "transferred" &&
      recordBelongsToClassroomScope(record, scope),
  );
}

function matchingPlanAndActivity(
  plans: readonly StoredRecord[],
  activities: readonly StoredRecord[],
  input: { planId: string; activityId: string; studentId: string },
  scope: ActiveClassroomScope,
): { plan: StoredRecord; activity: StoredRecord } {
  const plan = plans.find(
    (record) =>
      record.id === input.planId &&
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  const activity = activities.find(
    (record) =>
      record.id === input.activityId &&
      record.planId === input.planId &&
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  if (!plan || !activity) {
    throw new Error("Hızlı gözlemin plan ve etkinlik ilişkisi etkin sınıfla uyuşmuyor.");
  }
  if (
    Array.isArray(activity.studentIds) &&
    activity.studentIds.length > 0 &&
    !activity.studentIds.includes(input.studentId)
  ) {
    throw new Error(
      "Hızlı gözlem yalnız bu etkinlik için planlı takip açılan çocuğa kaydedilebilir.",
    );
  }
  return { plan, activity };
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
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
    throw new Error("Hızlı gözlem için etkin ve arşivlenmemiş bir sınıf gerekli.");
  }
  return scope;
}

function liveStudentDrafts(
  settings: readonly StoredRecord[],
  studentId: string,
  scope: ActiveClassroomScope,
): QuickObservationDraft[] {
  return settings
    .filter(
      (record): record is QuickObservationDraft =>
        typeof record.deletedAt !== "string" &&
        isQuickObservationDraftRecord(record) &&
        record.studentId === studentId &&
        recordBelongsToClassroomScope(record, scope),
    )
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    );
}

export async function loadQuickObservationDraft(
  store: LocalDataStore,
  input: { studentId: string },
): Promise<QuickObservationDraft | null> {
  const studentId = validUuid(input.studentId, "Öğrenci");
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope || !activeStudent(snapshot.students, studentId, scope)) return null;
  return liveStudentDrafts(snapshot.settings, studentId, scope)[0] ?? null;
}

export async function persistQuickObservationDraft(
  store: LocalDataStore,
  input: PersistQuickObservationDraftInput,
): Promise<QuickObservationDraft> {
  const studentId = validUuid(input.studentId, "Öğrenci");
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  if (!isQuickObservationType(input.observationType)) {
    throw new Error("Hızlı gözlem türü geçersiz.");
  }
  const categoryIds = normalizeQuickObservationCategories(input.categoryIds);
  const now = validDate(input.now ?? new Date(), "Taslak kayıt zamanı");
  const timestamp = now.toISOString();
  let result: QuickObservationDraft | null = null;

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
      const scope = await activeScopeInTransaction(transaction);
      const [students, plans, activities, settings] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("settings"),
      ]);
      if (!activeStudent(students, studentId, scope)) {
        throw new Error("Hızlı gözlem taslağı yalnız etkin sınıftaki çocuğa bağlanabilir.");
      }
      matchingPlanAndActivity(
        plans,
        activities,
        { studentId, planId, activityId },
        scope,
      );
      const existing = liveStudentDrafts(settings, studentId, scope)[0];
      result = {
        id: existing?.id ?? crypto.randomUUID(),
        settingType: QUICK_OBSERVATION_DRAFT_SETTING_TYPE,
        studentId,
        classroomId: scope.classroomId,
        academicYearId: scope.academicYearId,
        planId,
        activityId,
        rawText: input.rawText,
        context: input.context ?? "",
        childQuote: input.childQuote ?? "",
        observationType: input.observationType,
        categoryIds,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION,
      };
      await transaction.putMany("settings", [result]);
    },
  );
  if (!result) throw new Error("Hızlı gözlem taslağı kaydedilemedi.");
  return result;
}

export async function discardQuickObservationDraft(
  store: LocalDataStore,
  input: { studentId: string; now?: Date },
): Promise<boolean> {
  const studentId = validUuid(input.studentId, "Öğrenci");
  const now = validDate(input.now ?? new Date(), "Taslak kapatma zamanı");
  const timestamp = now.toISOString();
  let discarded = false;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const settings = await transaction.getAll("settings");
      const drafts = liveStudentDrafts(settings, studentId, scope);
      if (drafts.length === 0) return;
      discarded = true;
      await transaction.putMany(
        "settings",
        drafts.map((draft) => ({
          ...draft,
          updatedAt: timestamp,
          deletedAt: timestamp,
        })),
      );
    },
  );
  return discarded;
}

export async function finalizeQuickObservationDraft(
  store: LocalDataStore,
  input: FinalizeQuickObservationDraftInput,
): Promise<FinalizedQuickObservation> {
  const studentId = validUuid(input.studentId, "Öğrenci");
  const observationId = validUuid(input.observationId, "Gözlem");
  const now = validDate(input.now ?? new Date(), "Gözlem kayıt zamanı");
  const observedAt = validUtc(
    input.observedAt ?? now.toISOString(),
    "Gözlem zamanı",
  );
  const timestamp = now.toISOString();
  let observation: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [students, plans, activities, observations, settings] =
        await Promise.all([
          transaction.getAll("students"),
          transaction.getAll("plans"),
          transaction.getAll("activities"),
          transaction.getAll("observations"),
          transaction.getAll("settings"),
        ]);
      if (!activeStudent(students, studentId, scope)) {
        throw new Error("Hızlı gözlem yalnız etkin sınıftaki çocuğa bağlanabilir.");
      }
      const drafts = liveStudentDrafts(settings, studentId, scope);
      const draft = drafts[0];
      if (!draft) {
        throw new Error("Kaydedilecek hızlı gözlem taslağı bulunamadı.");
      }
      if (draft.rawText.trim().length === 0) {
        throw new Error("Gözlem notu boş bırakılamaz.");
      }
      matchingPlanAndActivity(
        plans,
        activities,
        {
          studentId,
          planId: draft.planId,
          activityId: draft.activityId,
        },
        scope,
      );
      if (observations.some((record) => record.id === observationId)) {
        throw new Error(
          "Gözlem notu kimliği daha önce kullanılmış; kanıtın üzerine yazılamaz.",
        );
      }
      observation = {
        id: observationId,
        studentIds: [studentId],
        planId: draft.planId,
        activityId: draft.activityId,
        rawText: draft.rawText,
        rawTextImmutable: true,
        ...(draft.context.trim() ? { context: draft.context } : {}),
        ...(draft.childQuote.trim() ? { childQuote: draft.childQuote } : {}),
        observationType: draft.observationType,
        observationCategories: [...draft.categoryIds],
        observedAt,
        workflowStatus: "captured",
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(new Date(observedAt)),
        deletedAt: null,
        schemaVersion: 2,
      };
      await transaction.putMany("observations", [observation]);
      await transaction.putMany(
        "settings",
        drafts.map((record) => ({
          ...record,
          updatedAt: timestamp,
          deletedAt: timestamp,
        })),
      );
    },
  );
  if (!observation) throw new Error("Hızlı gözlem kaydedilemedi.");
  return { observation };
}
