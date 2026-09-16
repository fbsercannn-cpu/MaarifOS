import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { CollectionName, StoredRecord } from "../../core/domain/model.ts";
import type { ObservationCategoryV2 } from "../../core/domain/observation-taxonomy.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { SupportPeriod } from "../action-center/action-center-model.ts";
import type { MetadataPlacement } from "../observation-management/observation-management-service.ts";

export type WorkPackageMode = "all" | "observations" | "planning";
export type WorkPackageCandidateKind = "observation-package" | "plan-gap";

export interface WorkPackagePreferences {
  preferredCategory: ObservationCategoryV2 | null;
  preferredSupportOptionId: string | null;
  source: "prior-explicit-actions" | "none";
}

export interface ObservationPackageRequestItem {
  kind: "observation-package";
  candidateId: string;
  choiceId: string;
  scope: ActiveClassroomScope & {
    studentId: string;
    observationId: string;
  };
  expectedObservationUpdatedAt: string;
  category?: ObservationCategoryV2;
  supportOptionId?: string;
  metadataPlacement?: MetadataPlacement;
  metadataFingerprint?: string;
  period: SupportPeriod | null;
  sourceFingerprint: string;
}

export interface PlanChainRequestItem {
  kind: "plan-gap";
  candidateId: string;
  choiceId: string;
  targetId: string;
  sourceFingerprint: string;
}

export type WorkPackageRequestItem =
  | ObservationPackageRequestItem
  | PlanChainRequestItem;

export interface WorkPackageRequest {
  civilDate: string;
  items: readonly WorkPackageRequestItem[];
}

export interface WorkPackageChoice {
  id: string;
  label: string;
  description?: string;
  resultLabel: string;
  requestItem: WorkPackageRequestItem;
}

export interface WorkPackageCandidate {
  id: string;
  kind: WorkPackageCandidateKind;
  title: string;
  studentName?: string;
  rawText?: string;
  civilDate?: string;
  reason: string;
  resultLabel: string;
  sourceRecordIds: readonly string[];
  reusedRecordIds: readonly string[];
  sourceFingerprint: string;
  choices: readonly WorkPackageChoice[];
  defaultChoiceId: string;
  request: WorkPackageRequest;
  expectedFingerprint: string;
}

export interface WorkPackageModel {
  civilDate: string;
  candidates: readonly WorkPackageCandidate[];
  preferences: WorkPackagePreferences;
}

export interface WorkPackageSelection {
  request: WorkPackageRequest;
  expectedFingerprint: string;
}

export type WorkPackageResultAction =
  | { kind: "open-observation"; label: string; recordId: string }
  | { kind: "open-plan"; label: string; recordId: string }
  | { kind: "open-daily"; label: string; recordId: string; civilDate: string }
  | { kind: "undo"; label: string; recordId: string };

export interface WorkPackageWriteSetEntry {
  collection: CollectionName;
  id: string;
  operation: "create" | "update" | "delete";
  beforeUpdatedAt: string | null;
  afterUpdatedAt: string | null;
}

export interface WorkPackageUndoStateEntry extends WorkPackageWriteSetEntry {
  before: StoredRecord | null;
  after: StoredRecord | null;
}

export interface WorkPackageReceipt {
  id: string;
  summary: string;
  createdRecordIds: readonly string[];
  reusedRecordIds: readonly string[];
  writeSet: readonly WorkPackageWriteSetEntry[];
  resultActions: readonly WorkPackageResultAction[];
  undo: { eligible: true };
  committedAt: string;
  undoState: readonly WorkPackageUndoStateEntry[];
}

export interface WorkPackageUndoPreview {
  eligible: boolean;
  reason?: string;
  expectedFingerprint?: string;
}

export interface WorkPackageUndoResult {
  undoneReceiptId: string;
  restoredRecordIds: readonly string[];
  removedRecordIds: readonly string[];
  resultActions: readonly WorkPackageResultAction[];
}

export function workPackageFingerprint(request: WorkPackageRequest): string {
  return canonicalJson(request);
}

export function prepareWorkPackageSelection(
  model: WorkPackageModel,
  input: { selections: Readonly<Record<string, string>> },
): WorkPackageSelection {
  const entries = Object.entries(input.selections).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (entries.length === 0) throw new Error("Uygulanacak en az bir iş seçin.");
  const items = entries.map(([candidateId, choiceId]) => {
    const candidate = model.candidates.find((item) => item.id === candidateId);
    const choice = candidate?.choices.find((item) => item.id === choiceId);
    if (!candidate || !choice) throw new Error("İş paketi seçimi güncel değil.");
    return structuredClone(choice.requestItem);
  });
  if (
    items.some((item) => item.kind === "plan-gap") &&
    (items.length !== 1 || items.some((item) => item.kind !== "plan-gap"))
  ) {
    throw new Error("Plan boşluğu adımı diğer gözlem işleriyle aynı pakette birleştirilemez.");
  }
  const request: WorkPackageRequest = { civilDate: model.civilDate, items };
  return { request, expectedFingerprint: workPackageFingerprint(request) };
}

export function withDefaultRequest(
  candidate: Omit<WorkPackageCandidate, "request" | "expectedFingerprint">,
  civilDate: string,
): WorkPackageCandidate {
  const choice = candidate.choices.find((item) => item.id === candidate.defaultChoiceId);
  if (!choice) throw new Error("İş paketinin varsayılan seçimi bulunamadı.");
  const request: WorkPackageRequest = {
    civilDate,
    items: [structuredClone(choice.requestItem)],
  };
  return {
    ...candidate,
    request,
    expectedFingerprint: workPackageFingerprint(request),
  };
}
