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
  isQuickObservationDraftRecord,
  type QuickObservationDraft,
} from "../../core/domain/quick-observation.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { QuickObservationBatchDraft } from "./quick-observation.ts";

export interface LoadQuickObservationDraftBatchInput {
  planId: string;
  activityId: string;
  taxonomyVersion?: ObservationTaxonomyVersion;
}

export interface LoadedQuickObservationDraftBatch {
  drafts: QuickObservationBatchDraft[];
  batchId: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value: string, fieldName: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} kimliği geçersiz.`);
  }
  return value;
}

function activeStudent(
  records: readonly StoredRecord[],
  studentId: string,
  scope: ActiveClassroomScope,
): boolean {
  return records.some(
    (record) =>
      record.id === studentId &&
      typeof record.deletedAt !== "string" &&
      record.enrollmentStatus !== "left" &&
      record.enrollmentStatus !== "completed" &&
      record.enrollmentStatus !== "transferred" &&
      recordBelongsToClassroomScope(record, scope),
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

export async function loadQuickObservationDraftBatch(
  store: LocalDataStore,
  input: LoadQuickObservationDraftBatchInput,
): Promise<LoadedQuickObservationDraftBatch | null> {
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const taxonomyVersion =
    input.taxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1;
  if (!isObservationTaxonomyVersion(taxonomyVersion)) {
    throw new Error("Hızlı gözlem taksonomi sürümü geçersiz.");
  }

  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return null;

  const grouped = new Map<string, QuickObservationBatchDraft[]>();
  for (const record of snapshot.settings) {
    if (
      typeof record.deletedAt === "string" ||
      !isQuickObservationDraftRecord(record) ||
      record.captureScope !== "selected-children" ||
      typeof record.batchId !== "string" ||
      record.planId !== planId ||
      record.activityId !== activityId ||
      (record.observationTaxonomyVersion ?? OBSERVATION_TAXONOMY_VERSION_V1) !==
        taxonomyVersion ||
      !recordBelongsToClassroomScope(record, scope)
    ) {
      continue;
    }
    const drafts = grouped.get(record.batchId) ?? [];
    drafts.push(record as QuickObservationBatchDraft);
    grouped.set(record.batchId, drafts);
  }

  const latest = [...grouped.entries()]
    .map(([batchId, drafts]) => ({
      batchId,
      drafts: [...drafts].sort(
        (left, right) =>
          left.studentId.localeCompare(right.studentId) ||
          left.id.localeCompare(right.id),
      ),
      updatedAt: drafts.reduce(
        (value, draft) =>
          draft.updatedAt.localeCompare(value) > 0 ? draft.updatedAt : value,
        "",
      ),
    }))
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.batchId.localeCompare(left.batchId),
    )[0];
  if (!latest) return null;

  const studentIds = latest.drafts.map((draft) => draft.studentId);
  if (
    latest.drafts.length < 2 ||
    new Set(studentIds).size !== latest.drafts.length ||
    new Set(latest.drafts.map(batchDraftPayload)).size !== 1 ||
    latest.drafts.some(
      (draft) => !activeStudent(snapshot.students, draft.studentId, scope),
    )
  ) {
    throw new Error(
      "Yarım kalan toplu gözlem taslağı tutarsız; yanlış çocuğa bağlanmaması için açılmadı.",
    );
  }

  return { batchId: latest.batchId, drafts: latest.drafts };
}
