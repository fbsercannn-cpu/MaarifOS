import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { createEmptySnapshot, type CollectionName, type DataSnapshot } from "../../core/domain/model.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { isUuid, LOCAL_TEACHER_IDENTITY_SETTING_ID, resolveLocalTeacherIdentity } from "../evidence/local-teacher-identity.ts";
import {
  DEVELOPMENT_REPORT_NOTICE, DEVELOPMENT_REPORT_SETTING_TYPE, DEVELOPMENT_REPORT_TITLE,
  isDevelopmentReportRecord, type DevelopmentReportEvidenceSnapshot, type DevelopmentReportRecord, type DevelopmentReportScope,
} from "./development-report-model.ts";
import { assertDevelopmentReportRelationships, assertDevelopmentReportScope, developmentReportEvidence, developmentReportSourcesMatch } from "./development-report-sources.ts";

export * from "./development-report-model.ts";
export { buildDevelopmentReportWorkspace } from "./development-report-sources.ts";

const SOURCE_COLLECTIONS: CollectionName[] = ["academicYears", "classrooms", "students", "settings", "observations", "plans", "activities", "evidenceCurriculumLinks"];

export interface SaveDevelopmentReportDraftInput extends DevelopmentReportScope {
  reportId?: string;
  expectedRevision?: number;
  selectedObservationIds: string[];
  /** Optional UI read preimage; never persist sources the teacher has not seen. */
  expectedEvidenceSnapshots?: DevelopmentReportEvidenceSnapshot[];
  teacherEvaluation: string;
  nextSupport?: string;
  now?: Date;
}

export interface DevelopmentReportReadModel {
  record: DevelopmentReportRecord;
  sourceStatus: "current" | "stale" | "invalid";
  canExport: boolean;
  missingFields: string[];
}

/** This is a local integrity seal, not a digital signature or official approval. */
export function developmentReportDigestContent(record: DevelopmentReportRecord): string {
  const { contentSha256: _digest, approvalSeal, ...content } = record;
  const seal = approvalSeal ? (({ contentSha256: _sealDigest, ...fields }) => fields)(approvalSeal) : null;
  return canonicalJson({ ...content, approvalSeal: seal });
}

async function sealContent(record: DevelopmentReportRecord): Promise<DevelopmentReportRecord> {
  const contentSha256 = await sha256Hex(developmentReportDigestContent(record));
  return { ...record, contentSha256, approvalSeal: record.approvalSeal ? { ...record.approvalSeal, contentSha256 } : null };
}

export async function assertDevelopmentReportDigest(record: DevelopmentReportRecord): Promise<void> {
  if (!isDevelopmentReportRecord(record) || await sha256Hex(developmentReportDigestContent(record)) !== record.contentSha256) {
    throw new Error("Öğretmen gözlem özeti içerik mührü doğrulanamadı.");
  }
}

/** Backup retains a stale approved snapshot without granting export permission. */
export async function assertDevelopmentReportBackupIntegrity(snapshot: DataSnapshot): Promise<void> {
  for (const setting of snapshot.settings) {
    if (setting.settingType !== DEVELOPMENT_REPORT_SETTING_TYPE) continue;
    if (!isDevelopmentReportRecord(setting)) throw new Error("Öğretmen gözlem özeti kayıt sözleşmesi geçersiz.");
    await assertDevelopmentReportDigest(setting);
    assertDevelopmentReportRelationships(snapshot, setting);
  }
}

async function transactionSnapshot(tx: DataTransaction): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  await Promise.all(SOURCE_COLLECTIONS.map(async (collection) => { snapshot[collection] = await tx.getAll(collection); }));
  return snapshot;
}

function existingReport(snapshot: DataSnapshot, id: string): DevelopmentReportRecord {
  const record = snapshot.settings.find((row) => row.id === id);
  if (!record || !isDevelopmentReportRecord(record) || typeof record.deletedAt === "string") {
    throw new Error("Öğretmen gözlem özeti bulunamadı veya geçersiz.");
  }
  return record;
}

function draftFromInput(snapshot: DataSnapshot, input: SaveDevelopmentReportDraftInput, id: string, now: Date): DevelopmentReportRecord {
  const identity = assertDevelopmentReportScope(snapshot, input, true);
  const candidate = snapshot.settings.find((row) => row.id === id);
  const previous = candidate ? existingReport(snapshot, id) : null;
  if (previous && (previous.status === "approved" || previous.revision !== input.expectedRevision)) {
    throw new Error(previous.status === "approved" ? "Onaylı özet değiştirilemez; yeni bir taslak oluşturun." : "Taslak başka bir işlemde değişti; güncel kaydı yeniden açın.");
  }
  if (!previous && input.expectedRevision !== undefined && input.expectedRevision !== 0) throw new Error("Taslak sürümü bulunamadı.");
  if (previous && (previous.studentId !== input.studentId || previous.academicYearId !== input.academicYearId || previous.classroomId !== input.classroomId)) {
    throw new Error("Taslak başka çocuk veya sınıfa taşınamaz.");
  }
  if (!isUuid(id) || !Number.isFinite(now.getTime()) || (previous && now.toISOString() < previous.updatedAt) ||
    !Array.isArray(input.selectedObservationIds) || input.selectedObservationIds.length > 500 ||
    !input.selectedObservationIds.every(isUuid) || new Set(input.selectedObservationIds).size !== input.selectedObservationIds.length ||
    typeof input.teacherEvaluation !== "string" || input.teacherEvaluation.length > 20_000 ||
    (input.nextSupport !== undefined && (typeof input.nextSupport !== "string" || input.nextSupport.length > 20_000))) {
    throw new Error("Rapor metni, zaman veya açık gözlem seçimi geçersiz.");
  }
  const timestamp = now.toISOString();
  const evidenceSnapshots = input.selectedObservationIds.map((observationId) => developmentReportEvidence(snapshot, input, observationId));
  if (input.expectedEvidenceSnapshots !== undefined && canonicalJson(input.expectedEvidenceSnapshots) !== canonicalJson(evidenceSnapshots)) {
    throw new Error("Ekranda görünen gözlem kaynakları değişti; raporu yeniden açıp kaynakları inceleyin.");
  }
  return {
    id, settingType: DEVELOPMENT_REPORT_SETTING_TYPE, schemaVersion: 1,
    createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp, civilDate: civilDateInIstanbul(now), deletedAt: null,
    revision: (previous?.revision ?? 0) + 1, status: "draft",
    studentId: input.studentId, classroomId: input.classroomId, academicYearId: input.academicYearId,
    periodStart: input.periodStart, periodEnd: input.periodEnd, ...identity,
    selectedObservationIds: [...input.selectedObservationIds],
    evidenceSnapshots,
    teacherEvaluation: input.teacherEvaluation, nextSupport: input.nextSupport ?? "",
    contentSha256: "0".repeat(64), approvalSeal: null,
  };
}

export async function saveDevelopmentReportDraft(store: LocalDataStore, input: SaveDevelopmentReportDraftInput): Promise<DevelopmentReportRecord> {
  // Snapshot external inputs before the first await; UI edits cannot alter an in-flight save.
  const frozen = structuredClone(input);
  const now = frozen.now ?? new Date();
  const id = frozen.reportId ?? crypto.randomUUID();
  const initial = await store.readSnapshot();
  const initialPrevious = initial.settings.find((row) => row.id === id);
  if (initialPrevious) await assertDevelopmentReportDigest(existingReport(initial, id));
  const prepared = await sealContent(draftFromInput(initial, frozen, id, now));
  return store.transaction("readwrite", SOURCE_COLLECTIONS, async (tx) => {
    const current = await transactionSnapshot(tx);
    // Do not wait on WebCrypto while IndexedDB owns a live transaction.
    const currentPrevious = current.settings.find((row) => row.id === id);
    if (canonicalJson(initialPrevious ?? null) !== canonicalJson(currentPrevious ?? null) ||
      developmentReportDigestContent(draftFromInput(current, frozen, id, now)) !== developmentReportDigestContent(prepared)) {
      throw new Error("Taslak kaydedilirken gözlem kaynakları veya taslak değişti; yeniden inceleyin.");
    }
    if (!isDevelopmentReportRecord(prepared)) throw new Error("Öğretmen gözlem özeti kayıt sözleşmesi geçersiz.");
    await tx.putMany("settings", [prepared]);
    return structuredClone(prepared);
  });
}

export async function getDevelopmentReportReadModel(snapshot: DataSnapshot, reportId: string): Promise<DevelopmentReportReadModel> {
  // A caller may reuse/mutate its snapshot while WebCrypto runs; detach first.
  const detached = structuredClone(snapshot);
  const record = existingReport(detached, reportId);
  const missingFields: string[] = [];
  if (!record.selectedObservationIds.length) missingFields.push("En az bir gözlem seçin.");
  if (!record.teacherEvaluation.trim()) missingFields.push("Öğretmen değerlendirmesini yazın.");
  let sourceStatus: DevelopmentReportReadModel["sourceStatus"] = "invalid";
  try {
    await assertDevelopmentReportDigest(record);
    assertDevelopmentReportRelationships(detached, record);
    sourceStatus = developmentReportSourcesMatch(detached, record) ? "current" : "stale";
  } catch { sourceStatus = "invalid"; }
  return { record, sourceStatus, missingFields, canExport: record.status === "approved" && sourceStatus === "current" && missingFields.length === 0 };
}

export async function approveDevelopmentReport(store: LocalDataStore, input: { reportId: string; expectedRevision: number; now?: Date }): Promise<DevelopmentReportRecord> {
  const frozen = structuredClone(input);
  const now = frozen.now ?? new Date();
  const initial = await store.readSnapshot();
  const readModel = await getDevelopmentReportReadModel(initial, frozen.reportId);
  const original = readModel.record;
  assertDevelopmentReportScope(initial, original, true);
  if (original.revision !== frozen.expectedRevision || original.status !== "draft" || readModel.sourceStatus !== "current" || readModel.missingFields.length) {
    throw new Error("Onay için güncel kaynaklı taslağı açın, gözlem seçin ve öğretmen değerlendirmesini tamamlayın.");
  }
  if (!Number.isFinite(now.getTime()) || now.toISOString() < original.updatedAt) throw new Error("Onay zamanı taslaktan önce olamaz.");
  const identity = initial.settings.find((row) => row.id === LOCAL_TEACHER_IDENTITY_SETTING_ID);
  const approvedByUserId = identity && isUuid(identity.teacherUserId) ? identity.teacherUserId : crypto.randomUUID();
  const revision = original.revision + 1;
  const prepared = await sealContent({ ...original, status: "approved", revision, updatedAt: now.toISOString(), civilDate: civilDateInIstanbul(now),
    approvalSeal: { algorithm: "SHA-256", revision, contentSha256: "0".repeat(64), approvedAt: now.toISOString(), approvedByUserId } });
  return store.transaction("readwrite", SOURCE_COLLECTIONS, async (tx) => {
    const current = await transactionSnapshot(tx);
    assertDevelopmentReportScope(current, original, true);
    if (canonicalJson(existingReport(current, original.id)) !== canonicalJson(original) || !developmentReportSourcesMatch(current, original)) {
      throw new Error("Onay sırasında kaynak veya taslak değişti; tekrar inceleme ve onay gerekli.");
    }
    await resolveLocalTeacherIdentity(tx, { now, requestedTeacherUserId: approvedByUserId });
    await tx.putMany("settings", [prepared]);
    return structuredClone(prepared);
  });
}

export async function requireApprovedDevelopmentReport(snapshot: DataSnapshot, reportId: string) {
  const readModel = await getDevelopmentReportReadModel(snapshot, reportId);
  if (!readModel.canExport) throw new Error("PDF için güncel gözlemlerle öğretmen onayı gerekli; taslak veya değişmiş kaynak dışa aktarılamaz.");
  return { record: readModel.record, title: DEVELOPMENT_REPORT_TITLE, notice: DEVELOPMENT_REPORT_NOTICE };
}
