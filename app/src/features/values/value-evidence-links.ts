import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  VALUE_EVIDENCE_ROLES,
  VALUE_EVIDENCE_TARGET_CODES,
  isValueEvidenceLinkRecord,
  type ValueEvidenceLinkRecord,
  type ValueEvidenceProvenanceCapsule,
  type ValueEvidenceRole,
  type ValueEvidenceTargetCode,
} from "../../core/repository/entities.ts";
import {
  parsePremiumActivityValueDesignSnapshot,
  parsePremiumValuesContentPackSnapshot,
} from "../premium-plans/content-repository.ts";
import type { PremiumActivityValueDesign } from "../premium-plans/domain.ts";
import {
  isUuid,
  requireUuid,
  resolveLocalTeacherIdentity,
} from "../evidence/local-teacher-identity.ts";
import {
  assertValueEvidenceSourceObservationPolicy,
  parseTeacherEvidenceRationale,
} from "./value-plan-models.ts";
import { valueDefinitionByCode } from "./values-constitution.ts";

export type {
  ValueEvidenceLinkRecord,
  ValueEvidenceProvenanceCapsule,
  ValueEvidenceRole,
  ValueEvidenceTargetCode,
};

const RECORD_KEYS = [
  "id",
  "createdAt",
  "updatedAt",
  "civilDate",
  "deletedAt",
  "schemaVersion",
  "academicYearId",
  "classroomId",
  "observationId",
  "studentId",
  "planId",
  "activityId",
  "evidenceRole",
  "targetValueCode",
  "targetIndicatorCode",
  "teacherRationale",
  "confirmationMethod",
  "confirmationScope",
  "confirmedByActorKind",
  "confirmedByActorId",
  "confirmedAt",
  "provenance",
  "supersedesLinkId",
] as const;
const PROVENANCE_KEYS = [
  "contentPackId",
  "contentPackVersion",
  "contentReleaseId",
  "contentManifestDigest",
  "appliedActivityTemplateId",
  "appliedValuesDesignId",
  "appliedValuesDesignVersion",
  "appliedValuesDesignDigest",
] as const;

export interface ConfirmObservationValueEvidenceLinkInput {
  observationId: string;
  studentId: string;
  evidenceRole: ValueEvidenceRole;
  targetValueCode: ValueEvidenceTargetCode;
  targetIndicatorCode: string;
  teacherRationale: string;
  linkId?: string;
  now?: Date;
}

export interface SupersedeObservationValueEvidenceLinkInput {
  linkId: string;
  evidenceRole: ValueEvidenceRole;
  teacherRationale: string;
  now?: Date;
}

export interface TombstoneObservationValueEvidenceLinkInput {
  linkId: string;
  now?: Date;
}

export interface ListValueEvidenceLinksOptions {
  includeTombstones?: boolean;
}

export interface ValueEvidenceEditorTarget {
  targetValueCode: ValueEvidenceTargetCode;
  valueName: string;
  valueRoles: readonly ("primary" | "roof" | "supporting")[];
  targetIndicatorCode: string;
  indicatorText: string;
  actionName: string;
  sourcePage: number;
}

export interface ValueEvidenceEditorLink {
  record: ValueEvidenceLinkRecord;
  target: ValueEvidenceEditorTarget;
}

export interface ValueEvidenceLinkEditorModel {
  observationId: string;
  studentId: string;
  studentName: string;
  activityId: string;
  activityTitle: string;
  rawObservation: string;
  appliedActivityTemplateId: string;
  appliedValuesDesignId: string;
  appliedValuesDesignVersion: "1.0.0";
  mappingStatus: "machine_validated_pending_human_review";
  targets: readonly ValueEvidenceEditorTarget[];
  activeLinks: readonly ValueEvidenceEditorLink[];
  historyLinks: readonly ValueEvidenceEditorLink[];
}

interface AuthoritativeValueContext {
  scope: ActiveClassroomScope;
  studentId: string;
  observation: StoredRecord;
  plan: StoredRecord;
  activity: StoredRecord;
  valuesDesign: PremiumActivityValueDesign;
  valuesDesignPreimage: string;
  provenanceWithoutDesignDigest: Omit<
    ValueEvidenceProvenanceCapsule,
    "appliedValuesDesignDigest"
  >;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value);
  const unexpected = actual.filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !(key in value));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `${label} alan sözleşmesi geçersiz` +
        `${unexpected.length > 0 ? `; beklenmeyen: ${unexpected.join(", ")}` : ""}` +
        `${missing.length > 0 ? `; eksik: ${missing.join(", ")}` : ""}.`,
    );
  }
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  return value.trim();
}

function validDate(input: Date | undefined, label: string): Date {
  const value = input ?? new Date();
  if (Number.isNaN(value.getTime())) throw new Error(`${label} geçersiz.`);
  return value;
}

function validEvidenceRole(value: unknown): ValueEvidenceRole {
  if (
    typeof value !== "string" ||
    !(VALUE_EVIDENCE_ROLES as readonly string[]).includes(value)
  ) {
    throw new Error("Değer kanıt rolü supports, contrasts veya context_only olmalıdır.");
  }
  return value as ValueEvidenceRole;
}

function validTargetValueCode(value: unknown): ValueEvidenceTargetCode {
  if (
    typeof value !== "string" ||
    !(VALUE_EVIDENCE_TARGET_CODES as readonly string[]).includes(value)
  ) {
    throw new Error("Hedef değer kodu D1–D20 arasında tanımlı olmalıdır.");
  }
  return value as ValueEvidenceTargetCode;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function activeLink(record: ValueEvidenceLinkRecord): boolean {
  return record.deletedAt === null;
}

function assertActiveLinkHasNoSuccessorClaim(
  link: ValueEvidenceLinkRecord,
  links: readonly ValueEvidenceLinkRecord[],
): void {
  if (
    activeLink(link) &&
    links.some((candidate) => candidate.supersedesLinkId === link.id)
  ) {
    throw new Error(
      "Aktif değer kanıt bağlantısı daha önce bir successor tarafından sahiplenilmiş; tombstone uygulanamaz.",
    );
  }
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function normalizeObservationText(value: unknown): string {
  return typeof value === "string" ? value.trim().normalize("NFC") : "";
}

function assertRationaleIsNotRawObservation(
  rationale: string,
  observation: StoredRecord,
): void {
  if (rationale === normalizeObservationText(observation.rawText)) {
    throw new Error(
      "Öğretmen kanıt gerekçesi ham gözlem metninin kopyası olamaz; seçilen rolün nedenini açıklamalıdır.",
    );
  }
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
  const snapshot = createEmptySnapshot();
  [snapshot.academicYears, snapshot.classrooms, snapshot.settings] =
    await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
    ]);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  return scope;
}

async function authoritativeValueContext(
  transaction: DataTransaction,
  observationId: string,
  studentId: string,
): Promise<AuthoritativeValueContext> {
  const scope = await activeScopeInTransaction(transaction);
  const [students, observations, plans, activities] = await Promise.all([
    transaction.getAll("students"),
    transaction.getAll("observations"),
    transaction.getAll("plans"),
    transaction.getAll("activities"),
  ]);
  const student = students.find(
    (record) =>
      record.id === studentId &&
      typeof record.deletedAt !== "string" &&
      record.enrollmentStatus !== "left" &&
      record.enrollmentStatus !== "completed" &&
      record.enrollmentStatus !== "transferred" &&
      sameScope(record, scope),
  );
  if (!student) {
    throw new Error("Değer kanıtı yalnız etkin sınıftaki canlı çocuk kaydına bağlanabilir.");
  }
  const observation = observations.find(
    (record) =>
      record.id === observationId &&
      record.rawTextImmutable === true &&
      typeof record.rawText === "string" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!observation) {
    throw new Error("Değer kanıtı kurulacak değişmez ham gözlem etkin sınıfta bulunamadı.");
  }
  if (
    !Array.isArray(observation.studentIds) ||
    observation.studentIds.length !== 1 ||
    observation.studentIds[0] !== studentId
  ) {
    throw new Error("Değer kanıtı yalnız tam bir çocuk kimliği taşıyan tek çocuklu gözleme bağlanabilir.");
  }
  if (!isUuid(observation.planId) || !isUuid(observation.activityId)) {
    throw new Error("Gözlemin plan ve etkinlik kimlikleri geçersiz.");
  }
  const plan = plans.find(
    (record) =>
      record.id === observation.planId &&
      record.planType === "daily" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  const activity = activities.find(
    (record) =>
      record.id === observation.activityId &&
      record.planId === observation.planId &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!plan || !activity) {
    throw new Error("Değer kanıtı yalnız aynı kapsamdaki günlük plan ve etkinliğe bağlanabilir.");
  }
  if (
    typeof activity.appliedActivityTemplateId !== "string" ||
    !activity.appliedActivityTemplateId.trim() ||
    activity.appliedActivityTemplateId !== plan.appliedActivityTemplateId ||
    !sameCanonical(
      activity.appliedActivityTemplateSnapshot,
      plan.appliedActivityTemplateSnapshot,
    )
  ) {
    throw new Error("Günlük plan ile etkinliğin uygulanan premium şablon ilişkisi uyuşmuyor.");
  }
  const appliedTemplate = objectValue(
    activity.appliedActivityTemplateSnapshot,
    "Uygulanan premium etkinlik snapshot'ı",
  );
  if (appliedTemplate.id !== activity.appliedActivityTemplateId) {
    throw new Error("Uygulanan premium etkinlik kimliği snapshot ile uyuşmuyor.");
  }
  const activityContent = parsePremiumValuesContentPackSnapshot(
    activity.sourceContentPackSnapshot,
    "Etkinlik kaynak içerik snapshot'ı",
  );
  const planContent = parsePremiumValuesContentPackSnapshot(
    plan.sourceContentPackSnapshot,
    "Günlük plan kaynak içerik snapshot'ı",
  );
  if (!sameCanonical(activityContent, planContent)) {
    throw new Error("Günlük plan ile etkinliğin premium içerik kaynak zinciri uyuşmuyor.");
  }
  const lineageIds = [
    plan.sourceAnnualPlanId,
    plan.sourceMonthlyPlanId,
    plan.sourceWeeklyPlanId,
    activity.sourceAnnualPlanId,
    activity.sourceMonthlyPlanId,
    activity.sourceWeeklyPlanId,
  ];
  if (
    !lineageIds.every(isUuid) ||
    plan.sourceAnnualPlanId !== activity.sourceAnnualPlanId ||
    plan.sourceMonthlyPlanId !== activity.sourceMonthlyPlanId ||
    plan.sourceWeeklyPlanId !== activity.sourceWeeklyPlanId
  ) {
    throw new Error("Günlük premium planın yıllık/aylık/haftalık kaynak kimlikleri geçersiz.");
  }
  const annual = plans.find(
    (record) =>
      record.id === plan.sourceAnnualPlanId &&
      record.planType === "annual" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  const monthly = plans.find(
    (record) =>
      record.id === plan.sourceMonthlyPlanId &&
      record.planType === "monthly" &&
      record.annualPlanId === plan.sourceAnnualPlanId &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  const weekly = plans.find(
    (record) =>
      record.id === plan.sourceWeeklyPlanId &&
      record.planType === "weekly" &&
      record.annualPlanId === plan.sourceAnnualPlanId &&
      record.monthlyPlanId === plan.sourceMonthlyPlanId &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!annual || !monthly || !weekly) {
    throw new Error("Günlük premium planın kurulu yıllık/aylık/haftalık kaynak zinciri bulunamadı.");
  }
  for (const [label, sourcePlan] of [
    ["Yıllık", annual],
    ["Aylık", monthly],
    ["Haftalık", weekly],
  ] as const) {
    const sourceContent = parsePremiumValuesContentPackSnapshot(
      sourcePlan.contentPackSnapshot,
      `${label} plan içerik snapshot'ı`,
    );
    if (!sameCanonical(sourceContent, activityContent)) {
      throw new Error(`${label} plan premium içerik kaynak zinciri günlük etkinlikle uyuşmuyor.`);
    }
  }
  const storedWeeklyTemplate = Array.isArray(weekly.premiumActivityTemplates)
    ? weekly.premiumActivityTemplates.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          !Array.isArray(candidate) &&
          candidate.id === activity.appliedActivityTemplateId,
      )
    : undefined;
  const storedMonthlyTemplate = Array.isArray(monthly.premiumActivityTemplates)
    ? monthly.premiumActivityTemplates.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          !Array.isArray(candidate) &&
          candidate.id === activity.appliedActivityTemplateId,
      )
    : undefined;
  if (
    !storedWeeklyTemplate ||
    !storedMonthlyTemplate ||
    !sameCanonical(storedWeeklyTemplate, appliedTemplate) ||
    !sameCanonical(storedMonthlyTemplate, appliedTemplate)
  ) {
    throw new Error("Uygulanan etkinlik snapshot'ı kurulu aylık ve haftalık içerik zinciriyle uyuşmuyor.");
  }
  const rawValuesDesign = appliedTemplate.valuesDesign;
  const valuesDesign = parsePremiumActivityValueDesignSnapshot(
    rawValuesDesign,
    activity.appliedActivityTemplateId,
  );
  const valuesDesignPreimage = canonicalJson(rawValuesDesign);
  const contentPackId = requiredText(activityContent.id, "İçerik paketi kimliği");
  const contentPackVersion = requiredText(
    activityContent.version,
    "İçerik paketi sürümü",
  );
  const contentReleaseId = requiredText(
    activityContent.contentReleaseId,
    "İçerik yayın kimliği",
  );
  const contentManifestDigest = requiredText(
    activityContent.manifestDigest,
    "İçerik manifest özeti",
  ) as `sha256:${string}`;

  return {
    scope,
    studentId,
    observation,
    plan,
    activity,
    valuesDesign,
    valuesDesignPreimage,
    provenanceWithoutDesignDigest: {
      contentPackId,
      contentPackVersion,
      contentReleaseId,
      contentManifestDigest,
      appliedActivityTemplateId: activity.appliedActivityTemplateId,
      appliedValuesDesignId: valuesDesign.id,
      appliedValuesDesignVersion: valuesDesign.version,
    },
  };
}

function assertTargetInAuthoritativeMapping(
  context: AuthoritativeValueContext,
  targetValueCode: ValueEvidenceTargetCode,
  targetIndicatorCode: string,
): void {
  const mapping = context.valuesDesign.mapping;
  const selectedCodes = new Set<string>([
    mapping.primaryValueCode,
    mapping.roofValueCode,
    ...mapping.supportingValueCodes,
  ]);
  if (!selectedCodes.has(targetValueCode)) {
    throw new Error("Hedef değer, uygulanan etkinliğin ana/çatı/destek değer kümesinde değil.");
  }
  const officialAction = mapping.officialActionSnapshots.find(
    (snapshot) => snapshot.indicatorCode === targetIndicatorCode,
  );
  if (!officialAction || officialAction.valueCode !== targetValueCode) {
    throw new Error("Hedef gösterge, seçilen değer koduna ait uygulanan resmî Ek-14 eylemi değil.");
  }
}

function targetKey(record: {
  observationId: string;
  activityId: string;
  targetValueCode: string;
  targetIndicatorCode: string;
}): string {
  return [
    record.observationId,
    record.activityId,
    record.targetValueCode,
    record.targetIndicatorCode,
  ].join("\u0000");
}

function assertLinkMatchesAuthoritativeContext(
  link: ValueEvidenceLinkRecord,
  context: AuthoritativeValueContext,
): void {
  if (
    link.academicYearId !== context.scope.academicYearId ||
    link.classroomId !== context.scope.classroomId ||
    link.observationId !== context.observation.id ||
    link.studentId !== context.studentId ||
    link.planId !== context.plan.id ||
    link.activityId !== context.activity.id
  ) {
    throw new Error("Değer kanıt bağlantısının kapsam veya kaynak ilişkisi bozuk.");
  }
}

function provenanceWithDigest(
  context: AuthoritativeValueContext,
  appliedValuesDesignDigest: `sha256:${string}`,
): ValueEvidenceProvenanceCapsule {
  return {
    ...context.provenanceWithoutDesignDigest,
    appliedValuesDesignDigest,
  };
}

function createLinkRecord(input: {
  id: string;
  context: AuthoritativeValueContext;
  evidenceRole: ValueEvidenceRole;
  targetValueCode: ValueEvidenceTargetCode;
  targetIndicatorCode: string;
  teacherRationale: string;
  confirmedByActorId: string;
  provenance: ValueEvidenceProvenanceCapsule;
  supersedesLinkId: string | null;
  now: Date;
}): ValueEvidenceLinkRecord {
  const timestamp = input.now.toISOString();
  return {
    id: input.id,
    academicYearId: input.context.scope.academicYearId,
    classroomId: input.context.scope.classroomId,
    observationId: input.context.observation.id,
    studentId: input.context.studentId,
    planId: input.context.plan.id,
    activityId: input.context.activity.id,
    evidenceRole: input.evidenceRole,
    targetValueCode: input.targetValueCode,
    targetIndicatorCode: input.targetIndicatorCode,
    teacherRationale: input.teacherRationale,
    confirmationMethod: "teacher-confirmed",
    confirmationScope: "observation-to-value-action-link",
    confirmedByActorKind: "local-teacher-identity",
    confirmedByActorId: input.confirmedByActorId,
    confirmedAt: timestamp,
    provenance: input.provenance,
    supersedesLinkId: input.supersedesLinkId,
    createdAt: timestamp,
    updatedAt: timestamp,
    civilDate: civilDateInIstanbul(input.now),
    deletedAt: null,
    schemaVersion: 1,
  };
}

/** Exact-key codec shared by service, backup and tests. */
export function parseValueEvidenceLinkRecord(
  value: unknown,
): ValueEvidenceLinkRecord {
  const item = objectValue(value, "Değer kanıt bağlantısı");
  exactKeys(item, RECORD_KEYS, "Değer kanıt bağlantısı");
  const provenance = objectValue(item.provenance, "Değer kanıt kaynak kapsülü");
  exactKeys(provenance, PROVENANCE_KEYS, "Değer kanıt kaynak kapsülü");
  if (!isValueEvidenceLinkRecord(item)) {
    throw new Error("Değer kanıt bağlantısı kayıt sözleşmesine uymuyor.");
  }
  const normalizedRationale = parseTeacherEvidenceRationale(
    item.teacherRationale,
    item.evidenceRole,
  );
  if (normalizedRationale !== item.teacherRationale) {
    throw new Error("Öğretmen kanıt gerekçesi NFC ve kırpılmış biçimde saklanmalıdır.");
  }
  if (
    item.confirmedAt !== item.createdAt ||
    item.civilDate !== civilDateInIstanbul(new Date(item.confirmedAt))
  ) {
    throw new Error("Değer kanıt onay zamanı kayıt zarfıyla uyuşmuyor.");
  }
  if (item.deletedAt === null) {
    if (item.updatedAt !== item.createdAt) {
      throw new Error("Canlı değer kanıt bağlantısı oluşturulduktan sonra değiştirilemez.");
    }
  } else if (
    typeof item.deletedAt !== "string" ||
    item.updatedAt !== item.deletedAt ||
    item.deletedAt < item.createdAt
  ) {
    throw new Error("Değer kanıt tombstone zamanı geçersiz.");
  }
  if (item.supersedesLinkId === item.id) {
    throw new Error("Değer kanıt bağlantısı kendisini geçersiz kılamaz.");
  }
  return structuredClone(item) as unknown as ValueEvidenceLinkRecord;
}

const CONTEXT_COLLECTIONS = [
  "academicYears",
  "classrooms",
  "settings",
  "students",
  "observations",
  "plans",
  "activities",
] as const;

export async function confirmObservationValueEvidenceLink(
  store: LocalDataStore,
  input: ConfirmObservationValueEvidenceLinkInput,
): Promise<ValueEvidenceLinkRecord> {
  const observationId = requireUuid(input.observationId, "Gözlem");
  const studentId = requireUuid(input.studentId, "Öğrenci");
  const requestedLinkId = requireUuid(input.linkId, "Değer kanıt bağlantısı");
  const evidenceRole = validEvidenceRole(input.evidenceRole);
  const targetValueCode = validTargetValueCode(input.targetValueCode);
  const targetIndicatorCode = requiredText(
    input.targetIndicatorCode,
    "Hedef resmî gösterge kodu",
  );
  const teacherRationale = parseTeacherEvidenceRationale(
    input.teacherRationale,
    evidenceRole,
  );
  const now = validDate(input.now, "Değer kanıt onay zamanı");

  const readonlyContext = await store.transaction(
    "readonly",
    CONTEXT_COLLECTIONS,
    (transaction) =>
      authoritativeValueContext(transaction, observationId, studentId),
  );
  assertTargetInAuthoritativeMapping(
    readonlyContext,
    targetValueCode,
    targetIndicatorCode,
  );
  assertRationaleIsNotRawObservation(teacherRationale, readonlyContext.observation);
  assertValueEvidenceSourceObservationPolicy(
    readonlyContext.observation.rawText,
    evidenceRole,
    teacherRationale,
  );
  if (now.toISOString() < String(readonlyContext.observation.createdAt)) {
    throw new Error("Değer kanıt onayı gözlem oluşturulmadan önceye tarihlenemez.");
  }
  const appliedValuesDesignDigest =
    `sha256:${await sha256Hex(readonlyContext.valuesDesignPreimage)}` as const;
  let result: ValueEvidenceLinkRecord | null = null;

  await store.transaction(
    "readwrite",
    [...CONTEXT_COLLECTIONS, "valueEvidenceLinks"],
    async (transaction) => {
      const context = await authoritativeValueContext(
        transaction,
        observationId,
        studentId,
      );
      if (context.valuesDesignPreimage !== readonlyContext.valuesDesignPreimage) {
        throw new Error("Uygulanan değer tasarımı onay sırasında değişti; bağlantı kurulmadı.");
      }
      assertTargetInAuthoritativeMapping(context, targetValueCode, targetIndicatorCode);
      assertRationaleIsNotRawObservation(teacherRationale, context.observation);
      assertValueEvidenceSourceObservationPolicy(
        context.observation.rawText,
        evidenceRole,
        teacherRationale,
      );
      if (now.toISOString() < String(context.observation.createdAt)) {
        throw new Error("Değer kanıt onayı gözlem oluşturulmadan önceye tarihlenemez.");
      }
      const provenance = provenanceWithDigest(context, appliedValuesDesignDigest);
      const links = (await transaction.getAll("valueEvidenceLinks")).map(
        parseValueEvidenceLinkRecord,
      );
      const key = targetKey({
        observationId,
        activityId: context.activity.id,
        targetValueCode,
        targetIndicatorCode,
      });
      const duplicate = links.find(
        (link) => activeLink(link) && targetKey(link) === key,
      );
      if (duplicate) {
        assertLinkMatchesAuthoritativeContext(duplicate, context);
        if (
          duplicate.evidenceRole === evidenceRole &&
          duplicate.teacherRationale === teacherRationale &&
          sameCanonical(duplicate.provenance, provenance)
        ) {
          const confirmedByActorId = await resolveLocalTeacherIdentity(transaction, {
            now,
          });
          if (duplicate.confirmedByActorId !== confirmedByActorId) {
            throw new Error("Mevcut değer kanıt bağlantısının yerel öğretmen kimliği uyuşmuyor.");
          }
          result = duplicate;
          return;
        }
        throw new Error(
          "Aynı gözlem, etkinlik, değer ve gösterge için farklı bir canlı bağlantı zaten var; düzeltme için supersede kullanılmalıdır.",
        );
      }
      if (links.some((link) => link.id === requestedLinkId)) {
        throw new Error("Değer kanıt bağlantısı kimliği daha önce kullanılmış.");
      }
      const confirmedByActorId = await resolveLocalTeacherIdentity(transaction, {
        now,
      });
      const link = createLinkRecord({
        id: requestedLinkId,
        context,
        evidenceRole,
        targetValueCode,
        targetIndicatorCode,
        teacherRationale,
        confirmedByActorId,
        provenance,
        supersedesLinkId: null,
        now,
      });
      result = parseValueEvidenceLinkRecord(link);
      await transaction.putMany("valueEvidenceLinks", [result]);
    },
  );
  if (!result) throw new Error("Değer kanıt bağlantısı kaydedilemedi.");
  return result;
}

export async function supersedeObservationValueEvidenceLink(
  store: LocalDataStore,
  input: SupersedeObservationValueEvidenceLinkInput,
): Promise<{
  tombstone: ValueEvidenceLinkRecord;
  replacement: ValueEvidenceLinkRecord;
}> {
  const linkId = requireUuid(input.linkId, "Düzeltilecek değer kanıt bağlantısı");
  const evidenceRole = validEvidenceRole(input.evidenceRole);
  const teacherRationale = parseTeacherEvidenceRationale(
    input.teacherRationale,
    evidenceRole,
  );
  const now = validDate(input.now, "Değer kanıt düzeltme zamanı");
  const readonlyResult = await store.transaction(
    "readonly",
    [...CONTEXT_COLLECTIONS, "valueEvidenceLinks"],
    async (transaction) => {
      const allLinks = (await transaction.getAll("valueEvidenceLinks")).map(
        parseValueEvidenceLinkRecord,
      );
      const oldLink = allLinks.find(
        (link) => link.id === linkId && activeLink(link),
      );
      if (!oldLink) throw new Error("Düzeltilecek canlı değer kanıt bağlantısı bulunamadı.");
      if (allLinks.some((link) => link.supersedesLinkId === oldLink.id)) {
        throw new Error(
          "Değer kanıt bağlantısı daha önce bir successor üretmiş; ikinci düzeltme dalı oluşturulamaz.",
        );
      }
      const context = await authoritativeValueContext(
        transaction,
        oldLink.observationId,
        oldLink.studentId,
      );
      assertLinkMatchesAuthoritativeContext(oldLink, context);
      assertTargetInAuthoritativeMapping(
        context,
        oldLink.targetValueCode,
        oldLink.targetIndicatorCode,
      );
      assertRationaleIsNotRawObservation(teacherRationale, context.observation);
      assertValueEvidenceSourceObservationPolicy(
        context.observation.rawText,
        evidenceRole,
        teacherRationale,
      );
      if (
        oldLink.evidenceRole === evidenceRole &&
        oldLink.teacherRationale === teacherRationale
      ) {
        throw new Error("Değer kanıt düzeltmesi rol veya gerekçede gerçek bir değişiklik içermelidir.");
      }
      return { oldLink, oldLinkPreimage: canonicalJson(oldLink), context };
    },
  );
  if (now.toISOString() < readonlyResult.oldLink.createdAt) {
    throw new Error("Değer kanıt düzeltmesi ilk onaydan önceye tarihlenemez.");
  }
  const appliedValuesDesignDigest =
    `sha256:${await sha256Hex(readonlyResult.context.valuesDesignPreimage)}` as const;
  let result: {
    tombstone: ValueEvidenceLinkRecord;
    replacement: ValueEvidenceLinkRecord;
  } | null = null;

  await store.transaction(
    "readwrite",
    [...CONTEXT_COLLECTIONS, "valueEvidenceLinks"],
    async (transaction) => {
      const links = (await transaction.getAll("valueEvidenceLinks")).map(
        parseValueEvidenceLinkRecord,
      );
      const oldLink = links.find((link) => link.id === linkId && activeLink(link));
      if (!oldLink) throw new Error("Düzeltilecek canlı değer kanıt bağlantısı artık mevcut değil.");
      if (links.some((link) => link.supersedesLinkId === oldLink.id)) {
        throw new Error(
          "Değer kanıt bağlantısı daha önce bir successor üretmiş; ikinci düzeltme dalı oluşturulamaz.",
        );
      }
      if (canonicalJson(oldLink) !== readonlyResult.oldLinkPreimage) {
        throw new Error("Düzeltilecek değer kanıt bağlantısı işlem sırasında değişti; kayıt korunmuştur.");
      }
      if (now.toISOString() < oldLink.createdAt) {
        throw new Error("Değer kanıt düzeltmesi ilk onaydan önceye tarihlenemez.");
      }
      const context = await authoritativeValueContext(
        transaction,
        oldLink.observationId,
        oldLink.studentId,
      );
      assertLinkMatchesAuthoritativeContext(oldLink, context);
      if (context.valuesDesignPreimage !== readonlyResult.context.valuesDesignPreimage) {
        throw new Error("Uygulanan değer tasarımı düzeltme sırasında değişti; bağlantı korunmuştur.");
      }
      assertTargetInAuthoritativeMapping(
        context,
        oldLink.targetValueCode,
        oldLink.targetIndicatorCode,
      );
      assertRationaleIsNotRawObservation(teacherRationale, context.observation);
      assertValueEvidenceSourceObservationPolicy(
        context.observation.rawText,
        evidenceRole,
        teacherRationale,
      );
      const provenance = provenanceWithDigest(context, appliedValuesDesignDigest);
      if (!sameCanonical(oldLink.provenance, provenance)) {
        throw new Error("Değer kanıt bağlantısının kaynak zinciri değişti; hedef/provenance düzeltilemez.");
      }
      const key = targetKey(oldLink);
      if (
        links.some(
          (link) => link.id !== oldLink.id && activeLink(link) && targetKey(link) === key,
        )
      ) {
        throw new Error("Aynı hedef için birden fazla canlı bağlantı bulundu; düzeltme uygulanmadı.");
      }
      const confirmedByActorId = await resolveLocalTeacherIdentity(transaction, {
        now,
      });
      if (confirmedByActorId !== oldLink.confirmedByActorId) {
        throw new Error("Değer kanıt düzeltmesi ilk onayı veren yerel öğretmen kimliğiyle uyuşmuyor.");
      }
      let replacementId = crypto.randomUUID();
      while (links.some((link) => link.id === replacementId)) {
        replacementId = crypto.randomUUID();
      }
      const timestamp = now.toISOString();
      const tombstone = parseValueEvidenceLinkRecord({
        ...oldLink,
        updatedAt: timestamp,
        deletedAt: timestamp,
      });
      const replacement = parseValueEvidenceLinkRecord(
        createLinkRecord({
          id: replacementId,
          context,
          evidenceRole,
          targetValueCode: oldLink.targetValueCode,
          targetIndicatorCode: oldLink.targetIndicatorCode,
          teacherRationale,
          confirmedByActorId,
          provenance: oldLink.provenance,
          supersedesLinkId: oldLink.id,
          now,
        }),
      );
      await transaction.putMany("valueEvidenceLinks", [tombstone, replacement]);
      result = { tombstone, replacement };
    },
  );
  if (!result) throw new Error("Değer kanıt bağlantısı düzeltilemedi.");
  return result;
}

export async function tombstoneObservationValueEvidenceLink(
  store: LocalDataStore,
  input: TombstoneObservationValueEvidenceLinkInput,
): Promise<ValueEvidenceLinkRecord> {
  const linkId = requireUuid(input.linkId, "Kaldırılacak değer kanıt bağlantısı");
  const now = validDate(input.now, "Değer kanıt kaldırma zamanı");
  await store.transaction(
    "readonly",
    ["valueEvidenceLinks"],
    async (transaction) => {
      const links = (await transaction.getAll("valueEvidenceLinks")).map(
        parseValueEvidenceLinkRecord,
      );
      const link = links.find((candidate) => candidate.id === linkId);
      if (!link) {
        throw new Error("Kaldırılacak değer kanıt bağlantısı bulunamadı.");
      }
      assertActiveLinkHasNoSuccessorClaim(link, links);
    },
  );
  let result: ValueEvidenceLinkRecord | null = null;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "valueEvidenceLinks"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const links = (await transaction.getAll("valueEvidenceLinks")).map(
        parseValueEvidenceLinkRecord,
      );
      const link = links.find((candidate) => candidate.id === linkId);
      if (!link || !sameScope(link, scope)) {
        throw new Error("Kaldırılacak değer kanıt bağlantısı etkin sınıfta bulunamadı.");
      }
      assertActiveLinkHasNoSuccessorClaim(link, links);
      const confirmedByActorId = await resolveLocalTeacherIdentity(transaction, {
        now,
      });
      if (confirmedByActorId !== link.confirmedByActorId) {
        throw new Error("Değer kanıt kaldırma işlemi yerel öğretmen kimliğiyle uyuşmuyor.");
      }
      if (!activeLink(link)) {
        result = link;
        return;
      }
      const timestamp = now.toISOString();
      if (timestamp < link.createdAt) {
        throw new Error("Değer kanıt bağlantısı oluşturulmadan önce kaldırılamaz.");
      }
      const tombstone = parseValueEvidenceLinkRecord({
        ...link,
        updatedAt: timestamp,
        deletedAt: timestamp,
      });
      await transaction.putMany("valueEvidenceLinks", [tombstone]);
      result = tombstone;
    },
  );
  if (!result) throw new Error("Değer kanıt bağlantısı kaldırılamadı.");
  return result;
}

async function listValueEvidenceLinks(
  store: LocalDataStore,
  predicate: (record: ValueEvidenceLinkRecord) => boolean,
  options: ListValueEvidenceLinksOptions,
): Promise<ValueEvidenceLinkRecord[]> {
  return store.transaction("readonly", ["valueEvidenceLinks"], async (transaction) =>
    (await transaction.getAll("valueEvidenceLinks"))
      .map(parseValueEvidenceLinkRecord)
      .filter(
        (record) =>
          predicate(record) &&
          (options.includeTombstones === true || activeLink(record)),
      )
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.id.localeCompare(right.id),
      ),
  );
}

export async function listValueEvidenceLinksByObservation(
  store: LocalDataStore,
  observationId: string,
  options: ListValueEvidenceLinksOptions = {},
): Promise<ValueEvidenceLinkRecord[]> {
  const id = requireUuid(observationId, "Gözlem");
  return listValueEvidenceLinks(
    store,
    (record) => record.observationId === id,
    options,
  );
}

export async function listValueEvidenceLinksByStudent(
  store: LocalDataStore,
  studentId: string,
  options: ListValueEvidenceLinksOptions = {},
): Promise<ValueEvidenceLinkRecord[]> {
  const id = requireUuid(studentId, "Öğrenci");
  return listValueEvidenceLinks(
    store,
    (record) => record.studentId === id,
    options,
  );
}

function editorTargetKey(target: {
  targetValueCode: string;
  targetIndicatorCode: string;
}): string {
  return `${target.targetValueCode}\u0000${target.targetIndicatorCode}`;
}

/**
 * Değer kanıtı editörünün salt-okunur, fail-closed projection'ı.
 * Hedefler katalogdan yeniden türetilmez; yalnız uygulanmış etkinlik
 * snapshot'ındaki doğrulanmış valuesDesign kullanılır.
 */
export async function loadValueEvidenceLinkEditorModel(
  store: LocalDataStore,
  input: { observationId: string; studentId: string },
): Promise<ValueEvidenceLinkEditorModel> {
  const observationId = requireUuid(input.observationId, "Gözlem");
  const studentId = requireUuid(input.studentId, "Öğrenci");

  return store.transaction(
    "readonly",
    [...CONTEXT_COLLECTIONS, "valueEvidenceLinks"],
    async (transaction) => {
      const context = await authoritativeValueContext(
        transaction,
        observationId,
        studentId,
      );
      const [students, rawLinks] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("valueEvidenceLinks"),
      ]);
      const student = students.find((record) => record.id === studentId);
      if (!student || typeof student.displayName !== "string") {
        throw new Error("Değer kanıtı editörü için çocuk adı bulunamadı.");
      }

      const mapping = context.valuesDesign.mapping;
      const targets = mapping.officialActionSnapshots.map(
        (snapshot): ValueEvidenceEditorTarget => {
          assertTargetInAuthoritativeMapping(
            context,
            snapshot.valueCode,
            snapshot.indicatorCode,
          );
          const valueRoles: ("primary" | "roof" | "supporting")[] = [];
          if (snapshot.valueCode === mapping.primaryValueCode) {
            valueRoles.push("primary");
          }
          if (snapshot.valueCode === mapping.roofValueCode) {
            valueRoles.push("roof");
          }
          if (mapping.supportingValueCodes.includes(snapshot.valueCode)) {
            valueRoles.push("supporting");
          }
          const definition = valueDefinitionByCode(snapshot.valueCode);
          return {
            targetValueCode: snapshot.valueCode,
            valueName: definition.officialName,
            valueRoles,
            targetIndicatorCode: snapshot.indicatorCode,
            indicatorText: snapshot.indicatorText,
            actionName: snapshot.actionName,
            sourcePage: snapshot.sourcePage,
          };
        },
      );
      const targetByKey = new Map(
        targets.map((target) => [editorTargetKey(target), target]),
      );
      const designDigest =
        `sha256:${await sha256Hex(context.valuesDesignPreimage)}` as const;
      const expectedProvenance = provenanceWithDigest(context, designDigest);
      const relatedLinks = rawLinks
        .map(parseValueEvidenceLinkRecord)
        .filter((link) => link.observationId === observationId)
        .map((record): ValueEvidenceEditorLink => {
          assertLinkMatchesAuthoritativeContext(record, context);
          assertTargetInAuthoritativeMapping(
            context,
            record.targetValueCode,
            record.targetIndicatorCode,
          );
          if (!sameCanonical(record.provenance, expectedProvenance)) {
            throw new Error(
              "Değer kanıt bağlantısının kaynak zinciri uygulanmış etkinlik snapshot'ıyla uyuşmuyor.",
            );
          }
          const target = targetByKey.get(editorTargetKey(record));
          if (!target) {
            throw new Error("Değer kanıt bağlantısının resmî eylem hedefi bulunamadı.");
          }
          return { record, target };
        })
        .sort(
          (left, right) =>
            right.record.createdAt.localeCompare(left.record.createdAt) ||
            right.record.id.localeCompare(left.record.id),
        );

      return {
        observationId: context.observation.id,
        studentId,
        studentName: student.displayName,
        activityId: context.activity.id,
        activityTitle: String(context.activity.title ?? "Etkinlik"),
        rawObservation: String(context.observation.rawText),
        appliedActivityTemplateId: String(
          context.activity.appliedActivityTemplateId,
        ),
        appliedValuesDesignId: context.valuesDesign.id,
        appliedValuesDesignVersion: context.valuesDesign.version,
        mappingStatus: "machine_validated_pending_human_review",
        targets,
        activeLinks: relatedLinks.filter((link) => activeLink(link.record)),
        historyLinks: relatedLinks.filter((link) => !activeLink(link.record)),
      };
    },
  );
}
