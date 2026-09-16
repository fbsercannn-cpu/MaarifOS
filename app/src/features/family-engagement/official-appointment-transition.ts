import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  assertFamilyEngagementRelationships,
  appointmentState,
  familyEngagementRecords,
  familyScopeMatches,
} from "../../core/domain/family-engagement.ts";
import {
  createEmptySnapshot,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  isUuid,
  resolveLocalTeacherIdentity,
} from "../evidence/local-teacher-identity.ts";
import { FAMILY_ENGAGEMENT_CHANGED_EVENT } from "./family-engagement-service.ts";

export const OFFICIAL_APPOINTMENT_SYSTEM_URL =
  "https://okulrandevu.meb.gov.tr/" as const;
export const OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE =
  "official-appointment-transition-v1" as const;

export interface OfficialAppointmentCompletionRecord extends StoredRecord, ActiveClassroomScope {
  readonly settingType: typeof OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE;
  readonly schemaVersion: 1;
  readonly deletedAt: null;
  readonly studentId: string;
  readonly appointmentId: string;
  readonly sourceAppointmentEventId: string;
  readonly previousCompletionId: string | null;
  readonly officialSystem: "MEB Okul Randevu Sistemi";
  readonly officialReference: string;
  readonly officialScheduledOn: string;
  readonly teacherConfirmedAt: string;
  readonly teacherUserId: string;
}

export interface OfficialAppointmentTransitionView {
  readonly localStatus: "local-preparation" | "local-cancelled" | "local-meeting-recorded" | "missing";
  readonly localLabel: string;
  readonly officialStatus: "action-required" | "official-completed" | "needs-review";
  readonly officialLabel: string;
  readonly completion: OfficialAppointmentCompletionRecord | null;
  readonly officialSystemUrl: typeof OFFICIAL_APPOINTMENT_SYSTEM_URL;
}

export const OFFICIAL_APPOINTMENT_TRANSITION_KEYS = [
  "id", "createdAt", "updatedAt", "civilDate", "deletedAt", "schemaVersion",
  "settingType", "academicYearId", "classroomId", "studentId", "appointmentId",
  "sourceAppointmentEventId", "previousCompletionId", "officialSystem",
  "officialReference", "officialScheduledOn", "teacherConfirmedAt", "teacherUserId",
] as const;

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

function normalizedReference(value: unknown): value is string {
  return typeof value === "string" && value.length >= 3 && value.length <= 200 &&
    value === value.normalize("NFC").trim() && !/[\u0000-\u001f\u007f]/u.test(value);
}

export function isOfficialAppointmentCompletionRecord(
  value: unknown,
): value is OfficialAppointmentCompletionRecord {
  if (!object(value) || !exactKeys(value, OFFICIAL_APPOINTMENT_TRANSITION_KEYS)) return false;
  return isUuid(value.id) && utc(value.createdAt) && value.updatedAt === value.createdAt &&
    isCivilDate(value.civilDate) && value.civilDate === civilDateInIstanbul(new Date(value.createdAt)) &&
    value.deletedAt === null && value.schemaVersion === 1 &&
    value.settingType === OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE &&
    isUuid(value.academicYearId) && isUuid(value.classroomId) && isUuid(value.studentId) &&
    isUuid(value.appointmentId) && isUuid(value.sourceAppointmentEventId) &&
    (value.previousCompletionId === null || isUuid(value.previousCompletionId)) &&
    value.officialSystem === "MEB Okul Randevu Sistemi" &&
    normalizedReference(value.officialReference) && isCivilDate(value.officialScheduledOn) &&
    utc(value.teacherConfirmedAt) && value.teacherConfirmedAt === value.createdAt &&
    isUuid(value.teacherUserId);
}

export function officialAppointmentCompletionRecords(
  snapshot: Pick<DataSnapshot, "settings">,
): OfficialAppointmentCompletionRecord[] {
  return snapshot.settings.filter(isOfficialAppointmentCompletionRecord)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

export function assertOfficialAppointmentCompletionRelationships(snapshot: DataSnapshot): void {
  const candidates = snapshot.settings.filter(
    (record) => record.settingType === OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE,
  );
  if (!candidates.every(isOfficialAppointmentCompletionRecord)) {
    throw new Error("Resmî randevu işlem kaydı sözleşmesi geçersiz.");
  }
  const familyRecords = familyEngagementRecords(snapshot);
  const seen = new Map<string, OfficialAppointmentCompletionRecord>();
  for (const record of officialAppointmentCompletionRecords(snapshot)) {
    const source = familyRecords.find((candidate) => candidate.id === record.sourceAppointmentEventId);
    if (!source || source.workflow.kind !== "appointment" ||
      source.workflow.appointmentId !== record.appointmentId || source.studentId !== record.studentId ||
      !familyScopeMatches(record, source) || source.createdAt > record.createdAt ||
      source.workflow.scheduledOn !== record.officialScheduledOn) {
      throw new Error("Resmî randevu işlem kaynağı yerel hazırlıkla uyuşmuyor.");
    }
    const previous = seen.get(record.appointmentId) ?? null;
    if ((previous?.id ?? null) !== record.previousCompletionId) {
      throw new Error("Resmî randevu işlem geçmişi eski veya dallanmış.");
    }
    seen.set(record.appointmentId, record);
  }
}

export function resolveOfficialAppointmentTransition(
  snapshot: DataSnapshot,
  appointmentId: string,
): OfficialAppointmentTransitionView {
  const state = appointmentState(familyEngagementRecords(snapshot), appointmentId);
  const planWorkflow = state.plan?.workflow.kind === "appointment"
    ? state.plan.workflow
    : null;
  if (!state.plan || !planWorkflow) {
    return {
      localStatus: "missing",
      localLabel: "Yerel hazırlık bulunamadı",
      officialStatus: "action-required",
      officialLabel: "Resmî sistem işlemi kaydedilmedi",
      completion: null,
      officialSystemUrl: OFFICIAL_APPOINTMENT_SYSTEM_URL,
    };
  }
  const plan = state.plan;
  const completion = officialAppointmentCompletionRecords(snapshot)
    .filter((record) => record.appointmentId === appointmentId && familyScopeMatches(plan, record))
    .at(-1) ?? null;
  const localStatus = state.status === "cancelled" ? "local-cancelled" as const
    : state.status === "completed" ? "local-meeting-recorded" as const
      : "local-preparation" as const;
  const sourceCurrent = completion?.sourceAppointmentEventId === plan.id &&
    completion.officialScheduledOn === planWorkflow.scheduledOn;
  const officialStatus = completion && sourceCurrent && state.status !== "cancelled"
    ? "official-completed" as const
    : completion ? "needs-review" as const : "action-required" as const;
  return {
    localStatus,
    localLabel: state.status === "cancelled" ? "Yerel hazırlık iptal edildi"
      : state.status === "completed" ? "Yerel hazırlığa bağlı görüşme kaydedildi"
        : "Yerel görüşme hazırlığı",
    officialStatus,
    officialLabel: officialStatus === "official-completed" ? "Resmî işlem tamamlandı"
      : officialStatus === "needs-review" ? "Resmî işlem kaydı yeniden doğrulanmalı"
        : "Resmî sistem işlemi gerekli",
    completion,
    officialSystemUrl: OFFICIAL_APPOINTMENT_SYSTEM_URL,
  };
}

export interface RecordOfficialAppointmentCompletionInput extends ActiveClassroomScope {
  readonly appointmentId: string;
  readonly sourceAppointmentEventId: string;
  readonly expectedPreviousCompletionId: string | null;
  readonly officialReference: string;
  readonly officialScheduledOn: string;
  readonly teacherConfirmed: true;
  readonly requestedTeacherUserId?: string;
  readonly now?: Date;
}

export async function recordOfficialAppointmentCompletion(
  store: LocalDataStore,
  input: RecordOfficialAppointmentCompletionInput,
): Promise<OfficialAppointmentCompletionRecord> {
  if (input.teacherConfirmed !== true) {
    throw new Error("Resmî işlem yalnız öğretmenin açık onayıyla tamamlandı olarak kaydedilebilir.");
  }
  const officialReference = typeof input.officialReference === "string"
    ? input.officialReference.normalize("NFC").trim()
    : "";
  if (!normalizedReference(officialReference) || !isCivilDate(input.officialScheduledOn)) {
    throw new Error("Resmî işlem referansı ve randevu tarihi gereklidir.");
  }
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Resmî işlem kayıt saati geçersiz.");
  const createdAt = now.toISOString();
  let result: OfficialAppointmentCompletionRecord | null = null;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "students", "settings"],
    async (transaction) => {
      const [academicYears, classrooms, students, settings] = await Promise.all([
        transaction.getAll("academicYears"), transaction.getAll("classrooms"),
        transaction.getAll("students"), transaction.getAll("settings"),
      ]);
      const snapshot: DataSnapshot = {
        ...createEmptySnapshot(),
        academicYears,
        classrooms,
        students,
        settings,
      };
      const active = resolveActiveClassroomScope(snapshot);
      if (!active || !familyScopeMatches(input, active)) {
        throw new Error("Etkin sınıf değişti. Resmî randevu kaydını yeniden açın.");
      }
      assertFamilyEngagementRelationships(snapshot);
      assertOfficialAppointmentCompletionRelationships(snapshot);
      const state = appointmentState(familyEngagementRecords(snapshot), input.appointmentId);
      const planWorkflow = state.plan?.workflow.kind === "appointment"
        ? state.plan.workflow
        : null;
      if (!state.plan || !planWorkflow || state.status === "cancelled" || !familyScopeMatches(input, state.plan) ||
        state.plan.id !== input.sourceAppointmentEventId ||
        planWorkflow.scheduledOn !== input.officialScheduledOn) {
        throw new Error("Resmî işlem kaydı güncel yerel hazırlık ve randevu tarihiyle uyuşmuyor.");
      }
      const plan = state.plan;
      if (plan.createdAt > createdAt || input.officialScheduledOn < plan.civilDate) {
        throw new Error("Resmî işlem geçmişe dönük veya yerel hazırlıktan önce kaydedilemez.");
      }
      const previous = officialAppointmentCompletionRecords(snapshot)
        .filter((record) => record.appointmentId === input.appointmentId)
        .at(-1) ?? null;
      if ((previous?.id ?? null) !== input.expectedPreviousCompletionId) {
        throw new Error("Resmî randevu işlem kaydı başka bir işlemde değişti.");
      }
      if (previous && previous.sourceAppointmentEventId === plan.id &&
        previous.officialReference === officialReference &&
        previous.officialScheduledOn === input.officialScheduledOn) {
        result = previous;
        return;
      }
      const teacherUserId = await resolveLocalTeacherIdentity(transaction, {
        now,
        requestedTeacherUserId: input.requestedTeacherUserId,
      });
      const record: OfficialAppointmentCompletionRecord = {
        id: crypto.randomUUID(), createdAt, updatedAt: createdAt,
        civilDate: civilDateInIstanbul(now), deletedAt: null, schemaVersion: 1,
        settingType: OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE,
        academicYearId: input.academicYearId, classroomId: input.classroomId,
        studentId: plan.studentId!, appointmentId: input.appointmentId,
        sourceAppointmentEventId: plan.id, previousCompletionId: previous?.id ?? null,
        officialSystem: "MEB Okul Randevu Sistemi", officialReference,
        officialScheduledOn: input.officialScheduledOn,
        teacherConfirmedAt: createdAt, teacherUserId,
      };
      if (!isOfficialAppointmentCompletionRecord(record)) {
        throw new Error("Resmî randevu işlem kaydı oluşturulamadı.");
      }
      await transaction.putMany("settings", [record]);
      result = record;
    },
  );
  if (!result) throw new Error("Resmî randevu işlem kaydı oluşturulamadı.");
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FAMILY_ENGAGEMENT_CHANGED_EVENT));
  return result;
}
