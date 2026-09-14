import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type CollectionName, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { isEntityRecord } from "../../core/repository/entities.ts";
import { ensureSpontaneousObservationContext } from "../evidence/spontaneous-observation.ts";
import { confirmObservationCurriculumLink } from "../evidence/evidence-flow.ts";
import { prepareDevelopmentObservationRecord, loadDevelopmentObservationGraphFactory } from "../evidence/development-observation-record.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";
import { observationMetadataModel, shiftedObservedAt, type ObservationMetadataModel } from "./observation-management-model.ts";
import { OBSERVATION_MANAGEMENT_COPY as copy } from "./observation-management-copy.ts";

export type MetadataPlacement = { kind: "keep" } | { kind: "development"; presetId: string } | { kind: "spontaneous"; clearProgramLinks: boolean } | { kind: "activity"; activityId: string; targetId?: string; clearProgramLinks: boolean; expectedActivityUpdatedAt: string; expectedPlanUpdatedAt: string };
export interface SaveObservationMetadataInput { model: ObservationMetadataModel; placement: MetadataPlacement; now?: Date }
async function readAll(tx: DataTransaction): Promise<DataSnapshot> { const snapshot = createEmptySnapshot(); for (const name of COLLECTION_NAMES) snapshot[name] = await tx.getAll(name); return snapshot; }
function stagedStore(snapshot: DataSnapshot): LocalDataStore {
  const tx: DataTransaction = { getAll: async name => structuredClone(snapshot[name]) as never, putMany: async (name: CollectionName, rows: readonly StoredRecord[]) => { for (const row of rows) { const index = snapshot[name].findIndex(r => r.id === row.id); if (index < 0) snapshot[name].push(structuredClone(row)); else snapshot[name][index] = structuredClone(row); } }, clear: async name => { snapshot[name] = []; } };
  return { readSnapshot: async () => structuredClone(snapshot), close() {}, transaction: async (_mode, _names, task) => task(tx) };
}

export async function saveObservationMetadata(store: LocalDataStore, input: SaveObservationMetadataInput) {
  const now = input.now ?? new Date();
  const graphFactory = input.placement.kind === "development" ? await loadDevelopmentObservationGraphFactory() : null;
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const before = await readAll(tx), snapshot = structuredClone(before);
    const model = observationMetadataModel(snapshot, input.model.observation.id, input.model.targetDate, now);
    if (!model || model.scope.academicYearId !== input.model.scope.academicYearId || model.scope.classroomId !== input.model.scope.classroomId) throw new Error(copy.stale);
    if (!model.dateValid) throw new Error(copy.invalidDate);
    const placement = input.placement;
    const candidate = placement.kind === "activity" ? model.placements.find(p => p.id === placement.activityId) : null;
    const target = placement.kind === "activity" && placement.targetId ? candidate?.targets.find(t => t.id === placement.targetId) : null;
    const development = placement.kind === "development" ? model.developmentChoices.find(p => p.id === placement.presetId) : null;
    if (placement.kind === "activity" && (!candidate || (placement.targetId && !target))) throw new Error(copy.stale);
    const current = model.observation;
    const existingTarget = !target || snapshot.evidenceCurriculumLinks.some(link => link.observationId === current.id && link.plannedTargetId === target.id);
    const sameActivity = placement.kind === "keep" ? model.keepCurrent : placement.kind === "spontaneous" ? model.currentIsSpontaneous && model.keepCurrent : placement.kind === "activity" ? current.activityId === placement.activityId : false;
    if (placement.kind === "development" && current.civilDate === model.targetDate && current.developmentSelection && (current.developmentSelection as { presetId?: string }).presetId === placement.presetId) return { alreadyCompleted: true, observationId: current.id, civilDate: current.civilDate };
    if (current.civilDate === model.targetDate && sameActivity && existingTarget && (!("clearProgramLinks" in placement) || !placement.clearProgramLinks || model.existingLinkCount === 0)) return { alreadyCompleted: true, observationId: current.id, civilDate: current.civilDate };
    if (model.fingerprint !== input.model.fingerprint) throw new Error(copy.stale);
    if (placement.kind === "keep" && !model.keepCurrent) throw new Error(copy.stale);
    if (placement.kind === "development" && (!development || !graphFactory)) throw new Error(copy.stale);
    if (placement.kind === "spontaneous" && placement.clearProgramLinks !== model.spontaneousClearsLinks) throw new Error(copy.stale);
    if (placement.kind === "activity" && (!candidate || candidate.expectedActivityUpdatedAt !== placement.expectedActivityUpdatedAt || candidate.expectedPlanUpdatedAt !== placement.expectedPlanUpdatedAt || candidate.clearProgramLinks !== placement.clearProgramLinks || (placement.targetId && !target))) throw new Error(copy.stale);
    const staged = stagedStore(snapshot);
    let planId = current.planId, activityId = current.activityId;
    if (placement.kind === "spontaneous" || (placement.kind === "development" && !model.keepCurrent)) {
      const context = await ensureSpontaneousObservationContext(staged, { studentId: model.studentIds[0], civilDate: model.targetDate, now });
      planId = context.plan.id; activityId = context.activity.id;
    } else if (candidate) { planId = candidate.planId; activityId = candidate.id; }
    const timestamp = new Date(Math.max(now.getTime(), Date.parse(current.updatedAt) + 1)).toISOString();
    const revised: StoredRecord = { ...current, planId, activityId, observedAt: shiftedObservedAt(current, model.targetDate, now), civilDate: model.targetDate, updatedAt: timestamp };
    const clearLinks = "clearProgramLinks" in placement && placement.clearProgramLinks;
    if (clearLinks) {
      snapshot.evidenceCurriculumLinks = snapshot.evidenceCurriculumLinks.filter(r => r.observationId !== current.id);
      snapshot.valueEvidenceLinks = snapshot.valueEvidenceLinks.filter(r => r.observationId !== current.id);
      delete revised.developmentSelection;
    }
    if (target && model.studentIds.length === 1) { revised.studentIds = model.studentIds; revised.rawTextImmutable = true; revised.schemaVersion = Math.max(current.schemaVersion, 2); }
    if (!isEntityRecord("observations", revised)) throw new Error(copy.failed);
    snapshot.observations = snapshot.observations.map(r => r.id === current.id ? revised : r);
    if (development && graphFactory) {
      revised.developmentSelection = { presetId: development.id, ageBand: development.ageBand };
      revised.studentIds = model.studentIds; revised.rawTextImmutable = true; revised.schemaVersion = Math.max(current.schemaVersion, 2);
      const link = await staged.transaction("readwrite", COLLECTION_NAMES, transaction => prepareDevelopmentObservationRecord(transaction, { observation: revised, selection: { presetId: development.id, ageBand: development.ageBand }, now, graphReferenceFactory: graphFactory }));
      snapshot.evidenceCurriculumLinks.push(link);
    }
    if (target && candidate?.profile) await confirmObservationCurriculumLink(staged, { observationId: current.id, ...candidate.profile, plannedTargetId: target.id, referenceCode: target.referenceCode, referenceTitle: target.referenceTitle, now });
    // The existing revision contract records why metadata changed without rewriting raw evidence.
    snapshot.observationRevisions.push({ id: crypto.randomUUID(), observationId: current.id, ...model.scope, previousRawText: String(current.rawText), reason: `${copy.history}: ${current.civilDate} → ${model.targetDate}; ${String(current.activityId ?? "")} → ${String(activityId ?? "")}${target ? `; ${target.referenceCode}` : ""}.`, changedAt: timestamp, createdAt: timestamp, updatedAt: timestamp, civilDate: civilDateInIstanbul(now), schemaVersion: 1, deletedAt: null });
    try { assertDataSnapshotRelationships(snapshot, civilDateInIstanbul(now)); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      throw new Error(/reportDrafts|Rapor|rapor|değerlendirme|Eğitim kararı|Öğretmen takibi/u.test(message) ? copy.dependent : copy.integrity);
    }
    for (const name of COLLECTION_NAMES) {
      if (canonicalJson(snapshot[name]) === canonicalJson(before[name])) continue;
      const retained = new Set(snapshot[name].map(r => r.id));
      if (before[name].some(r => !retained.has(r.id))) { await tx.clear(name); await tx.putMany(name, snapshot[name]); }
      else { const originals = new Map(before[name].map(r => [r.id, canonicalJson(r)])); await tx.putMany(name, snapshot[name].filter(r => originals.get(r.id) !== canonicalJson(r))); }
    }
    return { alreadyCompleted: false, observationId: current.id, civilDate: model.targetDate };
  });
  notifyFollowupChanged();
  return result;
}
