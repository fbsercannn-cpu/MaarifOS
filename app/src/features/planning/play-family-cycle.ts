import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  assertFamilyEngagementRelationships,
  communicationPreferenceHead,
  familyEngagementRecords,
  familyScopeMatches,
  resolveCommunicationPreference,
  type FamilyEngagementRecord,
} from "../../core/domain/family-engagement.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { isUuid, resolveLocalTeacherIdentity } from "../evidence/local-teacher-identity.ts";

export const PLAY_FAMILY_CYCLE_SETTING_TYPE = "play-family-cycle-v1" as const;
export const PLAY_FAMILY_CYCLE_CHANGED_EVENT = "maarifos:play-family-cycle-changed" as const;
export const PLAY_FAMILY_CYCLE_NOTICE =
  "Materyal, uyarlama, uygulama, gözleme dayalı yansıtma, aile önerisi ve aile geri bildirimi ayrı kayıtlardır. Aile geri bildirimi otomatik beceri veya kazanım oluşturmaz." as const;

export interface PlayApplicationWorkflow {
  readonly kind: "application";
  readonly sourcePlanId: string;
  readonly sourceActivityId: string;
  readonly materials: readonly string[];
  readonly adaptation: string;
  readonly implementation: string;
  readonly appliedAtUtc: string;
}

export interface PlayReflectionWorkflow {
  readonly kind: "reflection";
  readonly sourceApplicationId: string;
  readonly observationIds: readonly string[];
  readonly teacherReflection: string;
  readonly nextStep: string;
}

export interface PlayFamilySuggestionWorkflow {
  readonly kind: "family-suggestion";
  readonly sourceReflectionId: string;
  readonly familyEngagementRecordId: string;
  readonly contactId: string;
  readonly suggestion: string;
  readonly sharedOn: string;
}

export interface PlayFamilyFeedbackWorkflow {
  readonly kind: "family-feedback";
  readonly sourceSuggestionId: string;
  readonly familyEngagementRecordId: string;
  readonly contactId: string;
  readonly receivedOn: string;
  readonly source: "oral" | "written";
  readonly feedback: string;
  readonly teacherNote: string;
}

export type PlayFamilyWorkflow =
  | PlayApplicationWorkflow
  | PlayReflectionWorkflow
  | PlayFamilySuggestionWorkflow
  | PlayFamilyFeedbackWorkflow;

export interface PlayFamilyCycleRecord extends StoredRecord, ActiveClassroomScope {
  readonly settingType: typeof PLAY_FAMILY_CYCLE_SETTING_TYPE;
  readonly schemaVersion: 1;
  readonly deletedAt: null;
  readonly studentId: string;
  readonly previousRecordId: string | null;
  readonly teacherConfirmedAt: string;
  readonly teacherUserId: string;
  readonly workflow: PlayFamilyWorkflow;
}

export interface RecordPlayFamilyCycleInput extends ActiveClassroomScope {
  readonly studentId: string;
  readonly previousRecordId: string | null;
  readonly teacherConfirmed: true;
  readonly workflow: PlayFamilyWorkflow;
  readonly requestedTeacherUserId?: string;
  readonly now?: Date;
}

export interface PlayFamilyCycleView {
  readonly application: PlayFamilyCycleRecord & { readonly workflow: PlayApplicationWorkflow };
  readonly reflection: (PlayFamilyCycleRecord & { readonly workflow: PlayReflectionWorkflow }) | null;
  readonly familySuggestions: readonly (PlayFamilyCycleRecord & { readonly workflow: PlayFamilySuggestionWorkflow })[];
  readonly familyFeedback: readonly (PlayFamilyCycleRecord & { readonly workflow: PlayFamilyFeedbackWorkflow })[];
  readonly notice: typeof PLAY_FAMILY_CYCLE_NOTICE;
  readonly contract: {
    readonly planIsObservation: false;
    readonly applicationIsObservation: false;
    readonly reflectionIsAutomaticJudgement: false;
    readonly familyFeedbackCreatesSkill: false;
  };
}

export const PLAY_FAMILY_CYCLE_KEYS = [
  "id", "createdAt", "updatedAt", "civilDate", "deletedAt", "schemaVersion",
  "settingType", "academicYearId", "classroomId", "studentId", "previousRecordId",
  "teacherConfirmedAt", "teacherUserId", "workflow",
] as const;

const WORKFLOW_KEYS = Object.freeze({
  application: ["kind", "sourcePlanId", "sourceActivityId", "materials", "adaptation", "implementation", "appliedAtUtc"],
  reflection: ["kind", "sourceApplicationId", "observationIds", "teacherReflection", "nextStep"],
  "family-suggestion": ["kind", "sourceReflectionId", "familyEngagementRecordId", "contactId", "suggestion", "sharedOn"],
  "family-feedback": ["kind", "sourceSuggestionId", "familyEngagementRecordId", "contactId", "receivedOn", "source", "feedback", "teacherNote"],
} as const);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function utc(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function normalizedText(value: unknown, max: number, required = true): value is string {
  return typeof value === "string" && value.length <= max &&
    value === value.normalize("NFC").trim() && (!required || value.length > 0) &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function uniqueUuidList(value: unknown, max = 500): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= max &&
    value.every(isUuid) && new Set(value).size === value.length;
}

function materials(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 30 &&
    value.every((entry) => normalizedText(entry, 200)) && new Set(value).size === value.length;
}

function validWorkflow(value: unknown): value is PlayFamilyWorkflow {
  if (!workflowShape(value)) return false;
  switch (value.kind) {
    case "application":
      return isUuid(value.sourcePlanId) && isUuid(value.sourceActivityId) && materials(value.materials) &&
        normalizedText(value.adaptation, 4_000) && normalizedText(value.implementation, 8_000) && utc(value.appliedAtUtc);
    case "reflection":
      return isUuid(value.sourceApplicationId) && uniqueUuidList(value.observationIds) &&
        normalizedText(value.teacherReflection, 8_000) && normalizedText(value.nextStep, 4_000, false);
    case "family-suggestion":
      return isUuid(value.sourceReflectionId) && isUuid(value.familyEngagementRecordId) &&
        isUuid(value.contactId) && normalizedText(value.suggestion, 4_000) && isCivilDate(value.sharedOn);
    case "family-feedback":
      return isUuid(value.sourceSuggestionId) && isUuid(value.familyEngagementRecordId) &&
        isUuid(value.contactId) && isCivilDate(value.receivedOn) &&
        (value.source === "oral" || value.source === "written") &&
        normalizedText(value.feedback, 8_000) && normalizedText(value.teacherNote, 4_000, false);
    default:
      return false;
  }
}

function workflowShape(value: unknown): value is PlayFamilyWorkflow {
  if (!object(value) || typeof value.kind !== "string" || !(value.kind in WORKFLOW_KEYS)) return false;
  return exactKeys(value, WORKFLOW_KEYS[value.kind as keyof typeof WORKFLOW_KEYS]);
}

export function isPlayFamilyCycleRecord(value: unknown): value is PlayFamilyCycleRecord {
  return object(value) && exactKeys(value, PLAY_FAMILY_CYCLE_KEYS) && isUuid(value.id) &&
    utc(value.createdAt) && value.updatedAt === value.createdAt &&
    isCivilDate(value.civilDate) && value.civilDate === civilDateInIstanbul(new Date(value.createdAt)) &&
    value.deletedAt === null && value.schemaVersion === 1 && value.settingType === PLAY_FAMILY_CYCLE_SETTING_TYPE &&
    isUuid(value.academicYearId) && isUuid(value.classroomId) && isUuid(value.studentId) &&
    (value.previousRecordId === null || isUuid(value.previousRecordId)) &&
    value.teacherConfirmedAt === value.createdAt && isUuid(value.teacherUserId) && validWorkflow(value.workflow);
}

export function playFamilyCycleRecords(
  snapshot: Pick<DataSnapshot, "settings">,
): PlayFamilyCycleRecord[] {
  return snapshot.settings.filter(isPlayFamilyCycleRecord)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

function recordStudentIds(record: StoredRecord): string[] {
  if (Array.isArray(record.studentIds)) return record.studentIds.filter(isUuid);
  return isUuid(record.studentId) ? [record.studentId] : [];
}

function activityIncludesStudent(activity: StoredRecord, studentId: string): boolean {
  const assigned = recordStudentIds(activity);
  return assigned.length === 0 || assigned.includes(studentId);
}

function observationIncludesStudent(observation: StoredRecord, studentId: string): boolean {
  return recordStudentIds(observation).includes(studentId);
}

function familySourceContact(
  record: FamilyEngagementRecord | undefined,
): { readonly id: string } | null {
  return record?.workflow.kind === "communication-preference" ? record.workflow.contact : null;
}

function sameRecordScope(left: PlayFamilyCycleRecord, right: PlayFamilyCycleRecord): boolean {
  return left.academicYearId === right.academicYearId && left.classroomId === right.classroomId &&
    left.studentId === right.studentId;
}

export function assertPlayFamilyCycleRelationships(snapshot: DataSnapshot): void {
  const candidates = snapshot.settings.filter((record) => record.settingType === PLAY_FAMILY_CYCLE_SETTING_TYPE);
  if (!candidates.every(isPlayFamilyCycleRecord) || new Set(candidates.map((record) => record.id)).size !== candidates.length) {
    throw new Error("Oyun ve aile zinciri kayıt sözleşmesi geçersiz.");
  }
  const records = playFamilyCycleRecords(snapshot);
  const familyRecords = familyEngagementRecords(snapshot);
  const seen: PlayFamilyCycleRecord[] = [];
  for (const record of records) {
    const year = snapshot.academicYears.find((candidate) => candidate.id === record.academicYearId && typeof candidate.deletedAt !== "string");
    const classroom = snapshot.classrooms.find((candidate) => candidate.id === record.classroomId &&
      candidate.academicYearId === record.academicYearId && typeof candidate.deletedAt !== "string");
    const child = snapshot.students.find((candidate) => candidate.id === record.studentId && typeof candidate.deletedAt !== "string");
    if (!year || !classroom || !child || !familyScopeMatches(record, child)) {
      throw new Error("Oyun ve aile zinciri yıl, sınıf veya çocuk ilişkisi geçersiz.");
    }
    const workflow = record.workflow;
    if (workflow.kind === "application") {
      if (record.previousRecordId !== null || seen.some((candidate) =>
        candidate.workflow.kind === "application" && candidate.workflow.sourceActivityId === workflow.sourceActivityId &&
        candidate.studentId === record.studentId)) {
        throw new Error("Aynı çocuk ve etkinlik için oyun uygulaması yinelenemez.");
      }
      const plan = snapshot.plans.find((candidate) => candidate.id === workflow.sourcePlanId &&
        familyScopeMatches(record, candidate) && typeof candidate.deletedAt !== "string");
      const activity = snapshot.activities.find((candidate) => candidate.id === workflow.sourceActivityId &&
        candidate.planId === workflow.sourcePlanId && familyScopeMatches(record, candidate) &&
        typeof candidate.deletedAt !== "string");
      if (!plan || !activity || plan.createdAt > record.createdAt || activity.createdAt > workflow.appliedAtUtc ||
        activity.status !== "completed" || !activityIncludesStudent(activity, record.studentId) ||
        workflow.appliedAtUtc > record.createdAt || civilDateInIstanbul(new Date(workflow.appliedAtUtc)) !== activity.civilDate) {
        throw new Error("Oyun uygulaması tamamlanmış gerçek plan ve etkinlik kaynağıyla uyuşmuyor.");
      }
    } else if (workflow.kind === "reflection") {
      const application = seen.find((candidate) => candidate.id === workflow.sourceApplicationId);
      if (!application || application.workflow.kind !== "application" || record.previousRecordId !== application.id ||
        !sameRecordScope(record, application) || application.createdAt >= record.createdAt ||
        seen.some((candidate) => candidate.workflow.kind === "reflection" && candidate.workflow.sourceApplicationId === application.id)) {
        throw new Error("Oyun yansıtması uygulama zinciriyle uyuşmuyor.");
      }
      for (const observationId of workflow.observationIds) {
        const observation = snapshot.observations.find((candidate) => candidate.id === observationId);
        if (!observation || observation.rawTextImmutable !== true ||
          observation.planId !== application.workflow.sourcePlanId ||
          observation.activityId !== application.workflow.sourceActivityId ||
          !familyScopeMatches(record, observation) || !observationIncludesStudent(observation, record.studentId) ||
          observation.createdAt > record.createdAt) {
          throw new Error("Oyun yansıtmasının gözlem kaynağı uygulama ve çocukla uyuşmuyor.");
        }
      }
    } else if (workflow.kind === "family-suggestion") {
      const reflection = seen.find((candidate) => candidate.id === workflow.sourceReflectionId);
      const historicFamilyRecords = familyRecords.filter((candidate) => candidate.createdAt < record.createdAt);
      const familyRecord = historicFamilyRecords.find((candidate) => candidate.id === workflow.familyEngagementRecordId);
      const contact = familySourceContact(familyRecord);
      if (!reflection || reflection.workflow.kind !== "reflection" || record.previousRecordId !== reflection.id ||
        !sameRecordScope(record, reflection) || reflection.createdAt >= record.createdAt ||
        !familyRecord || familyRecord.workflow.kind !== "communication-preference" ||
        familyRecord.workflow.status !== "declared" || familyRecord.studentId !== record.studentId ||
        !familyScopeMatches(record, familyRecord) ||
        !contact || contact.id !== workflow.contactId || familyRecord.createdAt >= record.createdAt ||
        communicationPreferenceHead(historicFamilyRecords, record, record.studentId, workflow.contactId)?.id !== familyRecord.id ||
        !studentContactsFromRecord(child.contacts).some((candidate) => candidate.id === workflow.contactId) ||
        workflow.sharedOn < reflection.civilDate || workflow.sharedOn > record.civilDate ||
        seen.some((candidate) => candidate.workflow.kind === "family-suggestion" &&
          candidate.workflow.sourceReflectionId === reflection.id && candidate.workflow.contactId === workflow.contactId)) {
        throw new Error("Aile oyun önerisi yansıtma veya gerçek iletişim kaynağıyla uyuşmuyor.");
      }
    } else {
      const suggestion = seen.find((candidate) => candidate.id === workflow.sourceSuggestionId);
      if (!suggestion || suggestion.workflow.kind !== "family-suggestion" || record.previousRecordId !== suggestion.id ||
        !sameRecordScope(record, suggestion) || suggestion.createdAt >= record.createdAt ||
        workflow.familyEngagementRecordId !== suggestion.workflow.familyEngagementRecordId ||
        workflow.contactId !== suggestion.workflow.contactId || workflow.receivedOn < suggestion.workflow.sharedOn ||
        workflow.receivedOn > record.civilDate || seen.some((candidate) =>
          candidate.workflow.kind === "family-feedback" && candidate.workflow.sourceSuggestionId === suggestion.id)) {
        throw new Error("Aile geri bildirimi öneri zinciriyle uyuşmuyor.");
      }
    }
    seen.push(record);
  }
}

function normalizeText(value: string): string {
  return value.normalize("NFC").trim();
}

function normalizeWorkflow(workflow: PlayFamilyWorkflow): PlayFamilyWorkflow {
  if (workflow.kind === "application") return {
    ...workflow,
    materials: workflow.materials.map(normalizeText),
    adaptation: normalizeText(workflow.adaptation),
    implementation: normalizeText(workflow.implementation),
  };
  if (workflow.kind === "reflection") return {
    ...workflow,
    teacherReflection: normalizeText(workflow.teacherReflection),
    nextStep: normalizeText(workflow.nextStep),
  };
  if (workflow.kind === "family-suggestion") return {
    ...workflow,
    suggestion: normalizeText(workflow.suggestion),
  };
  return {
    ...workflow,
    feedback: normalizeText(workflow.feedback),
    teacherNote: normalizeText(workflow.teacherNote),
  };
}

function expectedPrevious(workflow: PlayFamilyWorkflow): string | null {
  if (workflow.kind === "application") return null;
  if (workflow.kind === "reflection") return workflow.sourceApplicationId;
  if (workflow.kind === "family-suggestion") return workflow.sourceReflectionId;
  return workflow.sourceSuggestionId;
}

export async function recordPlayFamilyCycle(
  store: LocalDataStore,
  input: RecordPlayFamilyCycleInput,
): Promise<PlayFamilyCycleRecord> {
  if (input.teacherConfirmed !== true || !workflowShape(input.workflow)) {
    throw new Error("Oyun ve aile zinciri yalnız geçerli alanlar ve öğretmen onayıyla kaydedilebilir.");
  }
  if (input.previousRecordId !== expectedPrevious(input.workflow)) {
    throw new Error("Oyun ve aile zincirinin önceki kayıt kimliği uyuşmuyor.");
  }
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Oyun ve aile zinciri kayıt saati geçersiz.");
  const normalizedWorkflow = normalizeWorkflow(structuredClone(input.workflow));
  if (!validWorkflow(normalizedWorkflow)) throw new Error("Oyun ve aile zinciri metinleri geçersiz.");

  const result = await store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    const activeScope = resolveActiveClassroomScope(snapshot);
    if (!activeScope || !familyScopeMatches(input, activeScope)) {
      throw new Error("Etkin sınıf değişti. Oyun ve aile zincirini yeniden açın.");
    }
    const student = snapshot.students.find((candidate) => candidate.id === input.studentId &&
      candidate.active !== false && typeof candidate.deletedAt !== "string" && familyScopeMatches(input, candidate));
    if (!student) throw new Error("Etkin sınıftaki kayıtlı çocuğu seçin.");
    assertFamilyEngagementRelationships(snapshot);
    assertPlayFamilyCycleRelationships(snapshot);

    if (normalizedWorkflow.kind === "family-suggestion") {
      const preference = resolveCommunicationPreference(
        snapshot,
        input,
        input.studentId,
        normalizedWorkflow.contactId,
      );
      if (preference.state !== "declared" ||
        preference.record?.id !== normalizedWorkflow.familyEngagementRecordId ||
        communicationPreferenceHead(familyEngagementRecords(snapshot), input, input.studentId, normalizedWorkflow.contactId)?.id !== preference.record.id) {
        throw new Error("Aile önerisi için yakının güncel bildirilmiş iletişim kaydını seçin.");
      }
    }

    const maxCreatedAt = playFamilyCycleRecords(snapshot)
      .reduce((latest, record) => Math.max(latest, Date.parse(record.createdAt)), 0);
    if (maxCreatedAt > now.getTime() + 60_000) {
      throw new Error("Cihaz saati oyun ve aile zinciri geçmişinin gerisinde.");
    }
    const createdAt = new Date(Math.max(now.getTime(), maxCreatedAt + 1)).toISOString();
    const teacherUserId = await resolveLocalTeacherIdentity(transaction, {
      now: new Date(createdAt),
      requestedTeacherUserId: input.requestedTeacherUserId,
    });
    const record: PlayFamilyCycleRecord = {
      id: crypto.randomUUID(), createdAt, updatedAt: createdAt,
      civilDate: civilDateInIstanbul(new Date(createdAt)), deletedAt: null, schemaVersion: 1,
      settingType: PLAY_FAMILY_CYCLE_SETTING_TYPE,
      academicYearId: input.academicYearId, classroomId: input.classroomId,
      studentId: input.studentId, previousRecordId: input.previousRecordId,
      teacherConfirmedAt: createdAt, teacherUserId, workflow: normalizedWorkflow,
    };
    if (!isPlayFamilyCycleRecord(record)) throw new Error("Oyun ve aile zinciri kaydı oluşturulamadı.");
    snapshot.settings.push(record);
    assertPlayFamilyCycleRelationships(snapshot);
    await transaction.putMany("settings", [record]);
    return record;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PLAY_FAMILY_CYCLE_CHANGED_EVENT));
  return result;
}

export function buildPlayFamilyCycleView(
  snapshot: DataSnapshot,
  applicationId: string,
): PlayFamilyCycleView {
  assertPlayFamilyCycleRelationships(snapshot);
  const records = playFamilyCycleRecords(snapshot);
  const application = records.find((record) => record.id === applicationId);
  if (!application || application.workflow.kind !== "application") {
    throw new Error("Oyun uygulaması bulunamadı.");
  }
  const reflection = records.find((record) =>
    record.workflow.kind === "reflection" && record.workflow.sourceApplicationId === application.id) ?? null;
  const familySuggestions = reflection ? records.filter((record): record is PlayFamilyCycleRecord & { workflow: PlayFamilySuggestionWorkflow } =>
    record.workflow.kind === "family-suggestion" && record.workflow.sourceReflectionId === reflection.id) : [];
  const suggestionIds = new Set(familySuggestions.map((record) => record.id));
  const familyFeedback = records.filter((record): record is PlayFamilyCycleRecord & { workflow: PlayFamilyFeedbackWorkflow } =>
    record.workflow.kind === "family-feedback" && suggestionIds.has(record.workflow.sourceSuggestionId));
  return {
    application: application as PlayFamilyCycleRecord & { workflow: PlayApplicationWorkflow },
    reflection: reflection as (PlayFamilyCycleRecord & { workflow: PlayReflectionWorkflow }) | null,
    familySuggestions,
    familyFeedback,
    notice: PLAY_FAMILY_CYCLE_NOTICE,
    contract: {
      planIsObservation: false,
      applicationIsObservation: false,
      reflectionIsAutomaticJudgement: false,
      familyFeedbackCreatesSkill: false,
    },
  };
}
