import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { academicYearOperationalStatus } from "../../core/domain/academic-year-operational.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import {
  OBSERVATION_TAXONOMY_VERSION_V1,
  isObservationTaxonomyVersion,
  type ObservationTaxonomyVersion,
} from "../../core/domain/observation-taxonomy.ts";
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
import {
  parseDevelopmentObservationSelection,
  type DevelopmentObservationSelection,
} from "./development-observation-presets.ts";
import {
  assertDevelopmentObservationContext,
  loadDevelopmentObservationGraphFactory,
  prepareDevelopmentObservationRecord,
} from "./development-observation-record.ts";

export {
  QUICK_OBSERVATION_CATEGORIES,
  QUICK_OBSERVATION_CATEGORIES_V2,
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
  taxonomyVersion?: ObservationTaxonomyVersion;
  developmentSelection?: DevelopmentObservationSelection;
  now?: Date;
}

export interface FinalizeQuickObservationDraftInput {
  studentId: string;
  planId?: string;
  activityId?: string;
  taxonomyVersion?: ObservationTaxonomyVersion;
  /**
   * The latest editor value to commit in the same IndexedDB transaction as
   * the immutable observation. When omitted, the last autosaved draft is
   * finalized for backwards compatibility.
   */
  draft?: Omit<
    PersistQuickObservationDraftInput,
    "studentId" | "planId" | "activityId" | "now"
  >;
  observationId?: string;
  observedAt?: string;
  now?: Date;
}

export interface QuickObservationDraftSelector {
  studentId: string;
  planId?: string;
  activityId?: string;
  taxonomyVersion?: ObservationTaxonomyVersion;
}

export interface FinalizedQuickObservation {
  observation: StoredRecord;
}

export type QuickObservationCaptureScope = "selected-children";

export interface QuickObservationBatchDraft extends QuickObservationDraft {
  batchId: string;
  captureScope: QuickObservationCaptureScope;
}

export interface PersistQuickObservationDraftBatchInput {
  studentIds: readonly string[];
  planId: string;
  activityId: string;
  rawText: string;
  context?: string;
  childQuote?: string;
  observationType: QuickObservationType;
  categoryIds: readonly QuickObservationCategory[];
  taxonomyVersion?: ObservationTaxonomyVersion;
  developmentSelection?: DevelopmentObservationSelection;
  batchId?: string;
  now?: Date;
}

export interface PersistQuickObservationDraftBatchResult {
  drafts: QuickObservationBatchDraft[];
  batchId: string;
}

export interface FinalizeQuickObservationDraftBatchInput {
  studentIds: readonly string[];
  planId: string;
  activityId: string;
  taxonomyVersion?: ObservationTaxonomyVersion;
  batchId: string;
  observationIds?: Readonly<Record<string, string>>;
  observedAt?: string;
  now?: Date;
}

export interface FinalizeQuickObservationDraftBatchResult {
  observations: StoredRecord[];
  batchId: string;
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

function validSelectedStudentIds(studentIds: readonly string[]): string[] {
  if (!Array.isArray(studentIds)) {
    throw new Error("Toplu hızlı gözlem için çocuk seçimi geçersiz.");
  }
  const uniqueIds = [
    ...new Set(studentIds.map((studentId) => validUuid(studentId, "Öğrenci"))),
  ];
  if (uniqueIds.length < 2) {
    throw new Error(
      "Toplu hızlı gözlem için en az iki farklı aktif çocuk seçilmelidir.",
    );
  }
  return uniqueIds;
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
  return activeScopeFromRecords(academicYears, classrooms, settings);
}

function activeScopeFromRecords(
  academicYears: StoredRecord[],
  classrooms: StoredRecord[],
  settings: StoredRecord[],
): ActiveClassroomScope {
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

function assertObservationDateInsideActiveYear(
  academicYears: readonly StoredRecord[],
  scope: ActiveClassroomScope,
  observedAt: string,
): void {
  const civilDate = civilDateInIstanbul(new Date(observedAt));
  const academicYear = academicYears.find(
    (record) =>
      record.id === scope.academicYearId &&
      typeof record.deletedAt !== "string",
  );
  if (
    !academicYear ||
    typeof academicYear.startDate !== "string" ||
    typeof academicYear.endDate !== "string" ||
    academicYearOperationalStatus(
      academicYear.startDate,
      academicYear.endDate,
      civilDate,
      typeof academicYear.operationalStartDate === "string"
        ? academicYear.operationalStartDate
        : undefined,
    ) !== "active"
  ) {
    throw new Error("Gözlem yalnız etkin eğitim yılı içinde kaydedilebilir.");
  }
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
    .map((record) => ({
      ...record,
      observationTaxonomyVersion:
        record.observationTaxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1,
    }))
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    );
}

function validDraftSelector(
  input: QuickObservationDraftSelector,
): Required<Pick<QuickObservationDraftSelector, "studentId">> &
  Omit<QuickObservationDraftSelector, "studentId"> {
  const studentId = validUuid(input.studentId, "Öğrenci");
  if ((input.planId === undefined) !== (input.activityId === undefined)) {
    throw new Error(
      "Hızlı gözlem taslağı bağlamı için plan ve etkinlik birlikte verilmelidir.",
    );
  }
  if (
    input.taxonomyVersion !== undefined &&
    input.planId === undefined
  ) {
    throw new Error(
      "Hızlı gözlem taksonomi sürümü yalnız plan ve etkinlik bağlamıyla seçilebilir.",
    );
  }
  const planId =
    input.planId === undefined ? undefined : validUuid(input.planId, "Plan");
  const activityId =
    input.activityId === undefined
      ? undefined
      : validUuid(input.activityId, "Etkinlik");
  if (
    input.taxonomyVersion !== undefined &&
    !isObservationTaxonomyVersion(input.taxonomyVersion)
  ) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }
  return {
    studentId,
    ...(planId === undefined ? {} : { planId }),
    ...(activityId === undefined ? {} : { activityId }),
    ...(input.taxonomyVersion === undefined
      ? {}
      : { taxonomyVersion: input.taxonomyVersion }),
  };
}

function matchingDrafts(
  drafts: readonly QuickObservationDraft[],
  selector: Omit<QuickObservationDraftSelector, "studentId">,
): QuickObservationDraft[] {
  return drafts.filter(
    (draft) =>
      (selector.planId === undefined || draft.planId === selector.planId) &&
      (selector.activityId === undefined ||
        draft.activityId === selector.activityId) &&
      (selector.taxonomyVersion === undefined ||
        draft.observationTaxonomyVersion === selector.taxonomyVersion),
  );
}

function matchingIndependentDrafts(
  drafts: readonly QuickObservationDraft[],
  selector: Omit<QuickObservationDraftSelector, "studentId">,
): QuickObservationDraft[] {
  return matchingDrafts(drafts, selector).filter(
    (draft) =>
      draft.batchId === undefined && draft.captureScope === undefined,
  );
}

function quickObservationBatchDraft(
  draft: QuickObservationDraft,
  batchId: string,
): draft is QuickObservationBatchDraft {
  return (
    draft.batchId === batchId &&
    draft.captureScope === "selected-children"
  );
}

function batchDraftPayload(draft: QuickObservationDraft): string {
  return JSON.stringify({
    planId: draft.planId,
    activityId: draft.activityId,
    rawText: draft.rawText,
    context: draft.context,
    childQuote: draft.childQuote,
    observationType: draft.observationType,
    categoryIds: draft.categoryIds,
    developmentSelection: draft.developmentSelection,
    observationTaxonomyVersion:
      draft.observationTaxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1,
  });
}

export async function loadQuickObservationDraft(
  store: LocalDataStore,
  input: QuickObservationDraftSelector,
): Promise<QuickObservationDraft | null> {
  const selector = validDraftSelector(input);
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (
    !scope ||
    !activeStudent(snapshot.students, selector.studentId, scope)
  ) {
    return null;
  }
  return (
    matchingIndependentDrafts(
      liveStudentDrafts(snapshot.settings, selector.studentId, scope),
      selector,
    )[0] ?? null
  );
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
  const taxonomyVersion =
    input.taxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1;
  if (!isObservationTaxonomyVersion(taxonomyVersion)) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }
  const categoryIds = normalizeQuickObservationCategories(
    input.categoryIds,
    taxonomyVersion,
  );
  const now = validDate(input.now ?? new Date(), "Taslak kayıt zamanı");
  const timestamp = now.toISOString();
  const developmentSelection = input.developmentSelection === undefined ? undefined :
    parseDevelopmentObservationSelection(input.developmentSelection);
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
      const existing = matchingIndependentDrafts(
        liveStudentDrafts(settings, studentId, scope),
        {
          planId,
          activityId,
          taxonomyVersion,
        },
      )[0];
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
        observationTaxonomyVersion: taxonomyVersion,
        ...(developmentSelection ? { developmentSelection } : {}),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION,
      };
      if (developmentSelection) {
        const classrooms = await transaction.getAll("classrooms");
        assertDevelopmentObservationContext({
          selection: developmentSelection, observation: result,
          classrooms, plans, activities,
        });
      }
      await transaction.putMany("settings", [result]);
    },
  );
  if (!result) throw new Error("Hızlı gözlem taslağı kaydedilemedi.");
  return result;
}

export async function persistQuickObservationDraftBatch(
  store: LocalDataStore,
  input: PersistQuickObservationDraftBatchInput,
): Promise<PersistQuickObservationDraftBatchResult> {
  const studentIds = validSelectedStudentIds(input.studentIds);
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const batchId = validUuid(input.batchId, "Toplu gözlem");
  if (!isQuickObservationType(input.observationType)) {
    throw new Error("Hızlı gözlem türü geçersiz.");
  }
  const taxonomyVersion =
    input.taxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1;
  if (!isObservationTaxonomyVersion(taxonomyVersion)) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }
  const categoryIds = normalizeQuickObservationCategories(
    input.categoryIds,
    taxonomyVersion,
  );
  const now = validDate(input.now ?? new Date(), "Toplu taslak kayıt zamanı");
  const timestamp = now.toISOString();
  const developmentSelection = input.developmentSelection === undefined ? undefined :
    parseDevelopmentObservationSelection(input.developmentSelection);
  let drafts: QuickObservationBatchDraft[] | null = null;

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

      for (const studentId of studentIds) {
        if (!activeStudent(students, studentId, scope)) {
          throw new Error(
            "Toplu hızlı gözlem taslağı yalnız etkin sınıftaki çocuklara bağlanabilir.",
          );
        }
        matchingPlanAndActivity(
          plans,
          activities,
          { studentId, planId, activityId },
          scope,
        );
      }

      const openDraftsForBatch = settings.filter(
        (record): record is QuickObservationBatchDraft =>
          typeof record.deletedAt !== "string" &&
          isQuickObservationDraftRecord(record) &&
          quickObservationBatchDraft(record, batchId),
      );
      const conflictingBatchDraft = settings.find(
        (record) =>
          typeof record.deletedAt !== "string" &&
          isQuickObservationDraftRecord(record) &&
          record.batchId === batchId &&
          (record.captureScope !== "selected-children" ||
            record.planId !== planId ||
            record.activityId !== activityId ||
            record.classroomId !== scope.classroomId ||
            record.academicYearId !== scope.academicYearId ||
            (record.observationTaxonomyVersion ??
              OBSERVATION_TAXONOMY_VERSION_V1) !== taxonomyVersion),
      );
      if (conflictingBatchDraft) {
        throw new Error(
          "Toplu gözlem kimliği başka bir açık taslak grubunda kullanılıyor.",
        );
      }
      if (
        new Set(openDraftsForBatch.map((draft) => draft.studentId)).size !==
        openDraftsForBatch.length
      ) {
        throw new Error(
          "Toplu gözlem grubunda aynı çocuk için birden fazla açık taslak bulundu; yazma güvenlik için durduruldu.",
        );
      }

      drafts = studentIds.map((studentId) => {
        const existing = openDraftsForBatch.find(
          (draft) => draft.studentId === studentId,
        );
        return {
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
          categoryIds: [...categoryIds],
          observationTaxonomyVersion: taxonomyVersion,
          ...(developmentSelection ? { developmentSelection } : {}),
          batchId,
          captureScope: "selected-children",
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
          deletedAt: null,
          schemaVersion: QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION,
        };
      });
      if (developmentSelection) {
        const classrooms = await transaction.getAll("classrooms");
        for (const draft of drafts) {
          assertDevelopmentObservationContext({
            selection: developmentSelection, observation: draft,
            classrooms, plans, activities,
          });
        }
      }
      const removedDrafts = openDraftsForBatch
        .filter((draft) => !studentIds.includes(draft.studentId))
        .map((draft) => ({
          ...draft,
          updatedAt: timestamp,
          deletedAt: timestamp,
        }));
      await transaction.putMany("settings", [...drafts, ...removedDrafts]);
    },
  );

  if (!drafts) {
    throw new Error("Toplu hızlı gözlem taslakları kaydedilemedi.");
  }
  return { drafts, batchId };
}

export async function discardQuickObservationDraft(
  store: LocalDataStore,
  input: QuickObservationDraftSelector & { now?: Date },
): Promise<boolean> {
  const selector = validDraftSelector(input);
  const now = validDate(input.now ?? new Date(), "Taslak kapatma zamanı");
  const timestamp = now.toISOString();
  let discarded = false;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const settings = await transaction.getAll("settings");
      const draft = matchingIndependentDrafts(
        liveStudentDrafts(settings, selector.studentId, scope),
        selector,
      )[0];
      if (!draft) return;
      discarded = true;
      await transaction.putMany(
        "settings",
        [{
          ...draft,
          updatedAt: timestamp,
          deletedAt: timestamp,
        }],
      );
    },
  );
  return discarded;
}

export async function finalizeQuickObservationDraft(
  store: LocalDataStore,
  input: FinalizeQuickObservationDraftInput,
): Promise<FinalizedQuickObservation> {
  const selector = validDraftSelector(input);
  const studentId = selector.studentId;
  const observationId = validUuid(input.observationId, "Gözlem");
  const now = validDate(input.now ?? new Date(), "Gözlem kayıt zamanı");
  const observedAt = validUtc(
    input.observedAt ?? now.toISOString(),
    "Gözlem zamanı",
  );
  const timestamp = now.toISOString();
  const draftInput = input.draft;
  if (draftInput && !isQuickObservationType(draftInput.observationType)) {
    throw new Error("Hızlı gözlem türü geçersiz.");
  }
  const draftTaxonomyVersion =
    draftInput?.taxonomyVersion ?? selector.taxonomyVersion ??
    OBSERVATION_TAXONOMY_VERSION_V1;
  if (!isObservationTaxonomyVersion(draftTaxonomyVersion)) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }
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
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const [academicYears, classrooms, settings, students, plans, activities, observations] =
        await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("settings"),
          transaction.getAll("students"),
          transaction.getAll("plans"),
          transaction.getAll("activities"),
          transaction.getAll("observations"),
        ]);
      const scope = activeScopeFromRecords(academicYears, classrooms, settings);
      assertObservationDateInsideActiveYear(academicYears, scope, observedAt);
      if (!activeStudent(students, studentId, scope)) {
        throw new Error("Hızlı gözlem yalnız etkin sınıftaki çocuğa bağlanabilir.");
      }
      const existingDraft = matchingIndependentDrafts(
        liveStudentDrafts(settings, studentId, scope),
        selector,
      )[0];
      const developmentSelection = draftInput?.developmentSelection === undefined
        ? existingDraft?.developmentSelection
        : parseDevelopmentObservationSelection(draftInput.developmentSelection);
      const draft: QuickObservationDraft | undefined = draftInput
        ? {
            id: existingDraft?.id ?? crypto.randomUUID(),
            settingType: QUICK_OBSERVATION_DRAFT_SETTING_TYPE,
            studentId,
            classroomId: scope.classroomId,
            academicYearId: scope.academicYearId,
            planId: selector.planId ?? "",
            activityId: selector.activityId ?? "",
            rawText: draftInput.rawText,
            context: draftInput.context ?? "",
            childQuote: draftInput.childQuote ?? "",
            observationType: draftInput.observationType,
            categoryIds: normalizeQuickObservationCategories(
              draftInput.categoryIds,
              draftTaxonomyVersion,
            ),
            observationTaxonomyVersion: draftTaxonomyVersion,
            ...(developmentSelection ? { developmentSelection } : {}),
            createdAt: existingDraft?.createdAt ?? timestamp,
            updatedAt: timestamp,
            civilDate: existingDraft?.civilDate ?? civilDateInIstanbul(now),
            deletedAt: null,
            schemaVersion: QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION,
          }
        : existingDraft;
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
      if (draft.developmentSelection) {
        const classrooms = await transaction.getAll("classrooms");
        assertDevelopmentObservationContext({
          selection: draft.developmentSelection,
          observation: draft,
          classrooms,
          plans,
          activities,
        });
      }
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
        observationTaxonomyVersion:
          draft.observationTaxonomyVersion ??
          OBSERVATION_TAXONOMY_VERSION_V1,
        ...(draft.developmentSelection ? { developmentSelection: { ...draft.developmentSelection } } : {}),
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
      const developmentLink = draft.developmentSelection
        ? await prepareDevelopmentObservationRecord(transaction, {
            observation,
            selection: draft.developmentSelection,
            now,
            graphReferenceFactory: await loadDevelopmentObservationGraphFactory(),
          })
        : null;
      await transaction.putMany("observations", [observation]);
      if (developmentLink) await transaction.putMany("evidenceCurriculumLinks", [developmentLink]);
      // Doğrudan kesin kayıtta henüz diske yazılmış bir taslak yoksa sırf
      // ardından silmek için yeni bir ayar kaydı üretme. Bu hem gereksiz bir
      // mezar taşı bırakıyor hem de şifreli `settings` koleksiyonunu ikinci
      // kez commit ederek mobil Safari/WebKit kayıt yolunu uzatıyordu.
      if (existingDraft) {
        await transaction.putMany(
          "settings",
          [{
            ...draft,
            updatedAt: timestamp,
            deletedAt: timestamp,
          }],
        );
      }
    },
  );
  if (!observation) throw new Error("Hızlı gözlem kaydedilemedi.");
  return { observation };
}

export async function finalizeQuickObservationDraftBatch(
  store: LocalDataStore,
  input: FinalizeQuickObservationDraftBatchInput,
): Promise<FinalizeQuickObservationDraftBatchResult> {
  const studentIds = validSelectedStudentIds(input.studentIds);
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const batchId = validUuid(input.batchId, "Toplu gözlem");
  const taxonomyVersion =
    input.taxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1;
  if (!isObservationTaxonomyVersion(taxonomyVersion)) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }
  const observationIds = studentIds.map((studentId) =>
    validUuid(input.observationIds?.[studentId], "Gözlem"),
  );
  if (new Set(observationIds).size !== observationIds.length) {
    throw new Error(
      "Toplu gözlemde her çocuk için benzersiz bir gözlem kimliği gereklidir.",
    );
  }
  const now = validDate(input.now ?? new Date(), "Toplu gözlem kayıt zamanı");
  const observedAt = validUtc(
    input.observedAt ?? now.toISOString(),
    "Gözlem zamanı",
  );
  const timestamp = now.toISOString();
  let finalizedObservations: StoredRecord[] | null = null;

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
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const [academicYears, classrooms, settings, students, plans, activities, observations] =
        await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("settings"),
          transaction.getAll("students"),
          transaction.getAll("plans"),
          transaction.getAll("activities"),
          transaction.getAll("observations"),
        ]);
      const scope = activeScopeFromRecords(academicYears, classrooms, settings);
      assertObservationDateInsideActiveYear(academicYears, scope, observedAt);

      const drafts = studentIds.map((studentId) => {
        if (!activeStudent(students, studentId, scope)) {
          throw new Error(
            "Toplu hızlı gözlem yalnız etkin sınıftaki çocuklara bağlanabilir.",
          );
        }
        matchingPlanAndActivity(
          plans,
          activities,
          { studentId, planId, activityId },
          scope,
        );
        const draft = matchingDrafts(
          liveStudentDrafts(settings, studentId, scope),
          { planId, activityId, taxonomyVersion },
        ).find((candidate) => quickObservationBatchDraft(candidate, batchId));
        if (!draft) {
          throw new Error(
            "Seçili çocukların tamamı için açık toplu hızlı gözlem taslağı bulunmalıdır.",
          );
        }
        return draft;
      });

      if (drafts.some((draft) => draft.rawText.trim().length === 0)) {
        throw new Error("Gözlem notu boş bırakılamaz.");
      }
      if (new Set(drafts.map(batchDraftPayload)).size !== 1) {
        throw new Error(
          "Toplu hızlı gözlem taslak içerikleri uyuşmuyor; kanıtlar ayrı ayrı gözden geçirilmelidir.",
        );
      }
      if (
        observations.some((record) => observationIds.includes(record.id))
      ) {
        throw new Error(
          "Toplu gözlem kimliklerinden biri daha önce kullanılmış; kanıtın üzerine yazılamaz.",
        );
      }

      finalizedObservations = drafts.map((draft, index) => ({
        id: observationIds[index],
        studentIds: [draft.studentId],
        planId,
        activityId,
        rawText: draft.rawText,
        rawTextImmutable: true,
        ...(draft.context.trim() ? { context: draft.context } : {}),
        ...(draft.childQuote.trim() ? { childQuote: draft.childQuote } : {}),
        observationType: draft.observationType,
        observationCategories: [...draft.categoryIds],
        observationTaxonomyVersion:
          draft.observationTaxonomyVersion ??
          OBSERVATION_TAXONOMY_VERSION_V1,
        ...(draft.developmentSelection ? { developmentSelection: { ...draft.developmentSelection } } : {}),
        batchId,
        captureScope: "selected-children",
        observedAt,
        workflowStatus: "captured",
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(new Date(observedAt)),
        deletedAt: null,
        schemaVersion: 2,
      }));
      const developmentLinks: StoredRecord[] = [];
      const graphReferenceFactory = finalizedObservations.some(
        (observation) => observation.developmentSelection !== undefined,
      )
        ? await loadDevelopmentObservationGraphFactory()
        : null;
      for (const observation of finalizedObservations) {
        const selection = observation.developmentSelection;
        if (selection !== undefined) {
          developmentLinks.push(await prepareDevelopmentObservationRecord(transaction, {
            observation,
            selection: parseDevelopmentObservationSelection(selection),
            now,
            graphReferenceFactory: graphReferenceFactory!,
          }));
        }
      }
      await transaction.putMany("observations", finalizedObservations);
      if (developmentLinks.length) await transaction.putMany("evidenceCurriculumLinks", developmentLinks);
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

  if (!finalizedObservations) {
    throw new Error("Toplu hızlı gözlemler kaydedilemedi.");
  }
  return { observations: finalizedObservations, batchId };
}
