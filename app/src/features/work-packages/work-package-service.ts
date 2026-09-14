import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type CollectionName, type StoredRecord } from "../../core/domain/model.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import type { LocalDataStore, DataTransaction } from "../../core/repository/contracts.ts";
import { isEntityRecord } from "../../core/repository/entities.ts";
import { actionCenterModel } from "../action-center/action-center-model.ts";
import { ACTION_CENTER_COPY as copy } from "../action-center/action-center-copy.ts";
import { assignObservationCategory, executeObservationSupport } from "../action-center/action-center-service.ts";
import { observationMetadataModel } from "../observation-management/observation-management-model.ts";
import { saveObservationMetadata, type MetadataPlacement } from "../observation-management/observation-management-service.ts";
import { loadPlanNextSteps, applyPlanNextStep, type PlanNextStepOption } from "../planning/plan-next-steps.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";
import { withDefaultRequest, workPackageFingerprint, type WorkPackageModel, type WorkPackageChoice, type WorkPackageCandidate, type WorkPackageSelection, type WorkPackageReceipt, type WorkPackageUndoStateEntry, type WorkPackageUndoPreview, type WorkPackageUndoResult, type WorkPackageResultAction } from "./work-package-model.ts";

const STALE = "Paketin kaynakları değişti. Güncel hazırlanmış seçeneklerden yeniden seçin.";
const UNDO = "Bu paketin kayıtları sonradan değişti veya başka kayıtlarda kullanılıyor. Geri alma uygulanmadı.";
const receipts = new WeakMap<WorkPackageReceipt, string>();
const live = (r: StoredRecord) => typeof r.deletedAt !== "string";
const fingerprint = (data: DataSnapshot) => canonicalJson(data);
function memory(data: DataSnapshot): LocalDataStore {
  const tx: DataTransaction = {
    getAll: async name => structuredClone(data[name]) as never,
    putMany: async (name: CollectionName, rows: readonly StoredRecord[]) => {
      for (const row of rows) { const index = data[name].findIndex(r => r.id === row.id); if (index < 0) data[name].push(structuredClone(row)); else data[name][index] = structuredClone(row); }
    }, clear: async name => { data[name] = []; },
  };
  return { readSnapshot: async () => structuredClone(data), transaction: async (_mode, _names, task) => task(tx), close() {} };
}
async function read(tx: DataTransaction) { const data = createEmptySnapshot(); for (const name of COLLECTION_NAMES) data[name] = await tx.getAll(name); return data; }
async function nextPlanTime(store: LocalDataStore, now: Date) {
  const data = await store.readSnapshot();
  return new Date(Math.max(now.getTime(), ...data.plans.map(p => (Date.parse(p.updatedAt) || 0) + 1)));
}
function validate(data: DataSnapshot, now = new Date()) {
  for (const name of COLLECTION_NAMES) for (const row of data[name]) if (!isEntityRecord(name, row)) throw new Error("Paket kaydının biçimi doğrulanamadı.");
  assertDataSnapshotRelationships(data, civilDateInIstanbul(now));
}
async function dailyOptions(store: LocalDataStore, day: string, now: Date): Promise<readonly PlanNextStepOption[]> {
  for (let index = 0; index < 5; index++) {
    const model = await loadPlanNextSteps(store, { civilDate: day, requestedLevel: "daily" });
    if (model.status !== "action-required") return [];
    if (model.level === "daily") return model.options.filter(o => o.request?.kind === "create-daily-plan");
    const request = model.options.find(o => o.request)?.request;
    if (!request) return [];
    await applyPlanNextStep(store, request, { now: await nextPlanTime(store, now) });
  }
  throw new Error("Plan omurgası tamamlanamadı.");
}

export async function loadWorkPackageModel(store: LocalDataStore, input: { civilDate: string; studentId?: string; observationId?: string; mode?: "all" | "observations" | "planning"; now?: Date }): Promise<WorkPackageModel> {
  if (!isCivilDate(input.civilDate)) throw new Error("Geçerli bir plan günü seçin.");
  const now = input.now ?? new Date();
  const data = await store.readSnapshot(), scope = resolveActiveClassroomScope(data);
  const model: WorkPackageModel = { civilDate: input.civilDate, candidates: [], preferences: { preferredCategory: null, preferredSupportOptionId: null, source: "none" } };
  if (!scope) return model;
  const prior = teacherFollowups(data).filter(r => live(r) && recordBelongsToClassroomScope(r, scope) && r.workflow.kind === "learning-decision").sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (prior?.workflow.kind === "learning-decision") model.preferences = { preferredCategory: null, preferredSupportOptionId: prior.workflow.support, source: "prior-explicit-actions" };
  const candidates: WorkPackageCandidate[] = [];
  const sourceFingerprint = fingerprint(data);
  const actions = input.mode === "planning" ? [] : actionCenterModel(data, { studentId: input.studentId, observationId: input.observationId, now }).observations;
  for (const action of actions) {
    const metadata = observationMetadataModel(data, action.scope.observationId, undefined, now);
    if (!metadata?.dateValid) continue;
    let placement: MetadataPlacement | undefined, sourceLabel = "";
    if (!metadata.existingLinkCount) {
      const matches = (title: string) => {
          const raw = action.rawText.toLocaleLowerCase("tr-TR");
          return title.toLocaleLowerCase("tr-TR").split(/\s+/u).some(w => w.length > 5 && raw.includes(w.slice(0, 6)));
      };
      const actual = metadata.placements.find(p => p.targets.some(t => matches(t.referenceTitle)));
      if (actual) {
        const target = actual.targets.find(t => matches(t.referenceTitle))!;
        placement = { kind: "activity", activityId: actual.id, targetId: target.id, clearProgramLinks: actual.clearProgramLinks, expectedActivityUpdatedAt: actual.expectedActivityUpdatedAt, expectedPlanUpdatedAt: actual.expectedPlanUpdatedAt };
        sourceLabel = `${actual.title} · ${target.referenceCode} ${target.referenceTitle}`;
      } else if (metadata.developmentMatchCount > 0) {
        const preset = metadata.developmentChoices[0];
        placement = { kind: "development", presetId: preset.id };
        sourceLabel = `${preset.label} · ${preset.curriculumReference.code}`;
      }
    }
    const supportNeeded = !action.planId && !!action.period;
    const placementOptions: { placement: MetadataPlacement; label: string; key: string }[] = [];
    if (!metadata.existingLinkCount) {
      for (const activity of metadata.placements) for (const target of activity.targets) {
        if (activity.clearProgramLinks) continue;
        placementOptions.push({ key: `activity:${activity.id}:${target.id}`, label: `${activity.title} · ${target.referenceCode} ${target.referenceTitle}`, placement: { kind: "activity", activityId: activity.id, targetId: target.id, clearProgramLinks: false, expectedActivityUpdatedAt: activity.expectedActivityUpdatedAt, expectedPlanUpdatedAt: activity.expectedPlanUpdatedAt } });
      }
      for (const preset of metadata.developmentChoices) placementOptions.push({ key: `development:${preset.id}`, label: `${preset.label} · ${preset.curriculumReference.code}`, placement: { kind: "development", presetId: preset.id } });
    }
    if (!action.needsCategory && !supportNeeded && !placement && !placementOptions.length) continue;
    const categories = action.needsCategory ? action.categories : [undefined];
    const supportOptions = supportNeeded ? [...copy.supportOptions].sort((a,b) => Number(b.id === model.preferences.preferredSupportOptionId) - Number(a.id === model.preferences.preferredSupportOptionId)) : [undefined];
    const id = `observation:${action.scope.observationId}:${action.scope.studentId}`;
    const choices: WorkPackageChoice[] = [];
    for (const category of categories) for (const support of supportOptions) {
      if (!category && !support && !placement) continue;
      const choiceId = `${category ?? "current"}:${support?.id ?? "linked"}`;
      const steps = [category ? `${copy.categoryLabels[category]} başlığına yerleştir` : "", sourceLabel ? `${sourceLabel} kaynağına bağla` : "", support ? `${action.period!.start}–${action.period!.end}: ${support.title}; ${action.period!.end} tarihinde yeniden gözlem takibi` : ""].filter(Boolean);
      const resultLabel = `${category ? copy.categoryLabels[category] : "Gözlem"} · ${steps.length} adımı birlikte tamamla`;
      choices.push({ id: choiceId, label: [category ? copy.categoryLabels[category] : "Mevcut başlığı koru", support?.title].filter(Boolean).join(" · "), description: steps.join(". "), resultLabel, requestItem: { kind: "observation-package", candidateId: id, choiceId, scope: action.scope, expectedObservationUpdatedAt: action.scope.expectedUpdatedAt, ...(category ? { category } : {}), ...(support ? { supportOptionId: support.id } : {}), ...(placement ? { metadataPlacement: placement, metadataFingerprint: metadata.fingerprint } : {}), period: action.period, sourceFingerprint } });
    }
    // Explicit alternatives stay available even when the teacher's wording has
    // no lexical overlap with the official target. Selecting one is the action.
    for (const option of placementOptions) {
      if (placement && canonicalJson(placement) === canonicalJson(option.placement)) continue;
      const category = categories[0], support = supportOptions[0];
      const choiceId = `source:${option.key}`;
      const resultLabel = "Seçilen kaynağa bağla ve adımları tamamla";
      choices.push({ id: choiceId, label: option.label, description: [`${option.label} kaynağına bağla`, category ? `${copy.categoryLabels[category]} başlığına yerleştir` : "", support ? `${action.period!.start}–${action.period!.end}: ${support.title}` : ""].filter(Boolean).join(". "), resultLabel, requestItem: { kind: "observation-package", candidateId: id, choiceId, scope: action.scope, expectedObservationUpdatedAt: action.scope.expectedUpdatedAt, ...(category ? { category } : {}), ...(support ? { supportOptionId: support.id } : {}), metadataPlacement: option.placement, metadataFingerprint: metadata.fingerprint, period: action.period, sourceFingerprint } });
    }
    if (!choices.length) continue;
    candidates.push(withDefaultRequest({ id, kind: "observation-package", title: `${action.studentName} · gözlem paketi`, studentName: action.studentName, rawText: action.rawText, civilDate: action.civilDate, reason: sourceLabel ? "Başlık, kaynak ve sonraki adımlar birlikte hazırlandı." : "Başlık ve destek adımları hazır. Kaynak bağını da tamamlamak için uygun kaynak seçeneğini seçin.", resultLabel: choices[0].resultLabel, sourceRecordIds: [action.scope.observationId], reusedRecordIds: [action.planId ?? action.period?.existingPlanId, placement?.kind === "activity" ? placement.activityId : null].filter((v): v is string => !!v), sourceFingerprint, choices, defaultChoiceId: choices[0].id }, input.civilDate));
  }
  if (!input.studentId && !input.observationId && input.mode !== "observations") {
    const preview = memory(structuredClone(data));
    const options = await dailyOptions(preview, input.civilDate, now);
    if (options.length) {
      const id = `plan:${input.civilDate}`;
      const choices: WorkPackageChoice[] = options.flatMap(option => option.request?.kind !== "create-daily-plan" ? [] : [{ id: option.request.curriculumTarget.id, label: option.title, description: `${option.detail}. Eksik yıl, ay ve hafta bağlantıları tamamlanır; günlük akış ve planlanmış etkinlik birlikte kaydedilir.`, resultLabel: `${input.civilDate} · ${option.request.activityTitle} ile günü tamamla`, requestItem: { kind: "plan-gap" as const, candidateId: id, choiceId: option.request.curriculumTarget.id, targetId: option.request.curriculumTarget.id, sourceFingerprint } }]);
      candidates.push(withDefaultRequest({ id, kind: "plan-gap", title: `${input.civilDate} günlük plan paketi`, civilDate: input.civilDate, reason: "Mevcut plan omurgası korunur; eksik adımlar tek seçimle tamamlanır.", resultLabel: choices[0].resultLabel, sourceRecordIds: [], reusedRecordIds: data.plans.filter(p => live(p) && recordBelongsToClassroomScope(p, scope) && p.planOrigin === "teacher-authored" && String(p.periodStart) <= input.civilDate && String(p.periodEnd) >= input.civilDate).map(p => p.id), sourceFingerprint, choices, defaultChoiceId: choices[0].id }, input.civilDate));
    }
  }
  return { ...model, candidates };
}

function diff(before: DataSnapshot, after: DataSnapshot): WorkPackageUndoStateEntry[] {
  return COLLECTION_NAMES.flatMap(collection => {
    const ids = new Set([...before[collection], ...after[collection]].map(r => r.id));
    return [...ids].flatMap(id => {
      const previous = before[collection].find(r => r.id === id) ?? null, next = after[collection].find(r => r.id === id) ?? null;
      return canonicalJson(previous) === canonicalJson(next) ? [] : [{ collection, id, operation: previous === null ? "create" as const : next === null ? "delete" as const : "update" as const, beforeUpdatedAt: previous?.updatedAt ?? null, afterUpdatedAt: next?.updatedAt ?? null, before: previous, after: next }];
    });
  });
}
export async function applyWorkPackage(store: LocalDataStore, input: WorkPackageSelection & { now?: Date }): Promise<WorkPackageReceipt> {
  const now = input.now ?? new Date();
  if (!input.request.items.length || input.request.items.length > 100 || workPackageFingerprint(input.request) !== input.expectedFingerprint) throw new Error(STALE);
  const before = await store.readSnapshot();
  const available = await loadWorkPackageModel(memory(structuredClone(before)), { civilDate: input.request.civilDate, now });
  const seen = new Set<string>();
  for (const item of input.request.items) {
    const match = available.candidates.find(c => c.id === item.candidateId)?.choices.find(c => c.id === item.choiceId);
    if (seen.has(item.candidateId) || !match || canonicalJson(match.requestItem) !== canonicalJson(item)) throw new Error(STALE);
    seen.add(item.candidateId);
  }
  if (input.request.items.some(i => i.kind === "plan-gap") && input.request.items.length !== 1) throw new Error(STALE);
  const after = structuredClone(before), staged = memory(after), resultActions: WorkPackageResultAction[] = [];
  for (const item of input.request.items) {
    if (item.kind === "plan-gap") {
      const options = await dailyOptions(staged, input.request.civilDate, now);
      const request = options.find(o => o.request?.kind === "create-daily-plan" && o.request.curriculumTarget.id === item.targetId)?.request;
      if (!request) throw new Error(STALE);
      const result = await applyPlanNextStep(staged, request, { now: await nextPlanTime(staged, now) });
      resultActions.push({ kind: "open-daily", recordId: result.nextTarget.planId, civilDate: input.request.civilDate, label: "Kaydedilen günlük planı aç" });
      continue;
    }
    if (item.metadataPlacement) {
      const model = observationMetadataModel(after, item.scope.observationId, undefined, now);
      if (!model) throw new Error(STALE);
      await saveObservationMetadata(staged, { model, placement: item.metadataPlacement, now });
    }
    let action = actionCenterModel(after, { ...item.scope, now }).observations[0];
    if (!action) throw new Error(STALE);
    if (item.category && action.needsCategory) await assignObservationCategory(staged, { ...action.scope, category: item.category, now });
    action = actionCenterModel(after, { ...item.scope, now }).observations[0];
    if (item.supportOptionId && action && !action.planId) {
      const result = await executeObservationSupport(staged, { action, optionId: item.supportOptionId, now });
      resultActions.push({ kind: "open-plan", recordId: result.planId, label: "Kaydedilen destek planını aç" });
    }
    resultActions.push({ kind: "open-observation", recordId: item.scope.observationId, label: "Yerleştirilen gözlemi aç" });
  }
  validate(after, now);
  const undoState = diff(before, after);
  if (!undoState.length) throw new Error("Bu paket zaten tamamlanmış.");
  await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    if (fingerprint(await read(tx)) !== fingerprint(before)) throw new Error(STALE);
    for (const name of new Set(undoState.map(r => r.collection))) { await tx.clear(name); await tx.putMany(name, after[name]); }
  });
  const receipt: WorkPackageReceipt = { id: crypto.randomUUID(), summary: `${input.request.items.length} iş paketi kaydedildi. Seçtiğiniz adımlar tamamlandı.`, createdRecordIds: undoState.filter(r => r.before === null).map(r => r.id), reusedRecordIds: [...new Set(available.candidates.filter(c => seen.has(c.id)).flatMap(c => [...c.reusedRecordIds]))], writeSet: undoState.map(({ before: _before, after: _after, ...r }) => r), resultActions: resultActions.filter((a,i,all) => all.findIndex(b => b.kind === a.kind && b.recordId === a.recordId) === i), undo: { eligible: true }, committedAt: now.toISOString(), undoState };
  receipts.set(receipt, canonicalJson(receipt));
  notifyFollowupChanged();
  return receipt;
}
function inverse(data: DataSnapshot, receipt: WorkPackageReceipt) {
  if (receipts.get(receipt) !== canonicalJson(receipt)) throw new Error(UNDO);
  const result = structuredClone(data);
  for (const entry of receipt.undoState) {
    const current = result[entry.collection].find(r => r.id === entry.id) ?? null;
    if (canonicalJson(current) !== canonicalJson(entry.after)) throw new Error(UNDO);
    const index = result[entry.collection].findIndex(r => r.id === entry.id);
    if (entry.before && index >= 0) result[entry.collection][index] = structuredClone(entry.before);
    else if (entry.before) result[entry.collection].push(structuredClone(entry.before));
    else result[entry.collection] = result[entry.collection].filter(r => r.id !== entry.id);
  }
  validate(result);
  return result;
}
export async function previewWorkPackageUndo(store: LocalDataStore, receipt: WorkPackageReceipt): Promise<WorkPackageUndoPreview> {
  try { const data = await store.readSnapshot(); inverse(data, receipt); return { eligible: true, expectedFingerprint: fingerprint(data) }; }
  catch { return { eligible: false, reason: UNDO }; }
}
export async function undoWorkPackage(store: LocalDataStore, input: { receipt: WorkPackageReceipt; expectedFingerprint: string; now?: Date }): Promise<WorkPackageUndoResult> {
  await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const data = await read(tx);
    if (fingerprint(data) !== input.expectedFingerprint) throw new Error(UNDO);
    const restored = inverse(data, input.receipt);
    for (const name of new Set(input.receipt.undoState.map(r => r.collection))) { await tx.clear(name); await tx.putMany(name, restored[name]); }
  });
  receipts.delete(input.receipt); notifyFollowupChanged();
  return { undoneReceiptId: input.receipt.id, restoredRecordIds: input.receipt.undoState.filter(r => r.before).map(r => r.id), removedRecordIds: input.receipt.undoState.filter(r => !r.before).map(r => r.id), resultActions: [] };
}
