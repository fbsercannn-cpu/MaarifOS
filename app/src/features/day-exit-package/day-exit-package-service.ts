import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import {
  assertTeacherFollowupRelationships,
  isTeacherFollowupRecord,
  teacherFollowups,
  TEACHER_FOLLOWUP_SETTING_TYPE,
  type TeacherFollowupRecord,
} from "../../core/domain/teacher-followup.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import {
  combinePreparationItems,
  notifyFollowupChanged,
  type PreparationCandidate,
} from "../teacher-followup/teacher-followup-service.ts";
import {
  dayExitPreparationSource,
  dayExitPreparationValueCovered,
  resolveDayExitPackageModel,
  type DayExitPreparationSource,
} from "./day-exit-package-model.ts";

export const DAY_EXIT_PACKAGE_CHANGED_EVENT = "maarifos:day-exit-package-changed";

export interface SaveDayExitPreparationInput {
  readonly civilDate: string;
  readonly sourceIds: readonly string[];
  readonly expectedSourceFingerprint: string;
  readonly now?: Date;
}

export interface SaveDayExitPreparationResult {
  readonly changed: boolean;
  readonly recordId: string | null;
  readonly nextTeachingDate: string;
  readonly sourceIds: readonly string[];
  readonly itemCount: number;
}

async function transactionSnapshot(transaction: DataTransaction): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
  return snapshot;
}

function notifyChanged(): void {
  notifyFollowupChanged();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DAY_EXIT_PACKAGE_CHANGED_EVENT));
}

function asCandidate(source: DayExitPreparationSource): PreparationCandidate {
  return {
    source: dayExitPreparationSource(source),
    materials: [...source.materials],
    preparation: [...source.preparation],
    missingMaterials: source.materials.length === 0,
  };
}

function recordForSources(records: readonly TeacherFollowupRecord[], sourceIds: readonly string[]): TeacherFollowupRecord | undefined {
  return records.find((record) => record.workflow.kind === "preparation-list"
    && sourceIds.some((sourceId) => record.workflow.kind === "preparation-list"
      && record.workflow.items.some((item) => item.sourceIds.includes(sourceId))));
}

export async function saveDayExitPreparation(
  store: LocalDataStore,
  input: SaveDayExitPreparationInput,
): Promise<SaveDayExitPreparationResult> {
  if (!input.sourceIds.length || input.sourceIds.length > 100
    || new Set(input.sourceIds).size !== input.sourceIds.length) {
    throw new Error("Hazırlık için 1 ile 100 arasında farklı gerçek plan veya etkinlik kaynağı seçin.");
  }
  if (typeof input.expectedSourceFingerprint !== "string" || !input.expectedSourceFingerprint.trim()) {
    throw new Error("Hazırlık için güncel kaynak parmak izi gereklidir.");
  }
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Hazırlık kaydı için geçerli zaman gerekli.");
  if (input.civilDate !== civilDateInIstanbul(now)) {
    throw new Error("Günün çıkış hazırlığı yalnız bugünün gerçek kayıtlarından oluşturulabilir.");
  }
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
    const snapshot = await transactionSnapshot(transaction);
    const today = civilDateInIstanbul(now);
    assertDataSnapshotRelationships(snapshot, today);
    const model = resolveDayExitPackageModel(snapshot, { civilDate: input.civilDate, now });
    const nextDay = model.nextDay;
    if (!nextDay) throw new Error("Eğitim yılı içinde sonraki bir öğretim günü bulunamadı.");
    if (nextDay.sourceFingerprint !== input.expectedSourceFingerprint) {
      throw new Error("Ertesi öğretim gününün plan veya materyal kaynağı değişti. Güncel hazırlığı yeniden açın.");
    }
    const selected = input.sourceIds.map((id) => nextDay.sources.find((source) => source.id === id));
    if (selected.some((source) => !source)) throw new Error("Seçilen hazırlık kaynağı artık bulunamıyor.");
    const selectedSources = selected as NonNullable<(typeof selected)[number]>[];
    if (selectedSources.some((source) => !source.available)) {
      throw new Error("Seçilen kaynakta kaydedilebilecek gerçek materyal veya ön hazırlık bilgisi yok.");
    }
    const pending = selectedSources.map((source) => ({
      ...source,
      materials: source.materials.filter((text) => !dayExitPreparationValueCovered(
        snapshot,
        dayExitPreparationSource(source),
        nextDay.civilDate,
        text,
        false,
      )),
      preparation: source.preparation.filter((text) => !dayExitPreparationValueCovered(
        snapshot,
        dayExitPreparationSource(source),
        nextDay.civilDate,
        text,
        true,
      )),
    })).filter((source) => source.materials.length > 0 || source.preparation.length > 0);
    const existing = recordForSources(teacherFollowups(snapshot), input.sourceIds);
    if (!pending.length) {
      return {
        changed: false,
        recordId: existing?.id ?? null,
        nextTeachingDate: nextDay.civilDate,
        sourceIds: [...input.sourceIds],
        itemCount: 0,
      } satisfies SaveDayExitPreparationResult;
    }
    const candidates = pending.map(asCandidate);
    const items = combinePreparationItems(candidates, nextDay.civilDate);
    if (!items.length) throw new Error("Seçilen kaynaklarda hazırlık listesine alınabilecek gerçek bilgi bulunamadı.");
    const sourceRows = candidates.map((candidate) => candidate.source);
    const maxCreatedAt = snapshot.settings.reduce((maximum, record) => Math.max(maximum, Date.parse(record.createdAt)), 0);
    const maxSourceUpdatedAt = sourceRows.reduce((maximum, source) => Math.max(maximum, Date.parse(source.updatedAt)), 0);
    const timestamp = new Date(Math.max(now.getTime(), maxCreatedAt + 1, maxSourceUpdatedAt + 1)).toISOString();
    const record: TeacherFollowupRecord = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: input.civilDate,
      deletedAt: null,
      schemaVersion: 1,
      settingType: TEACHER_FOLLOWUP_SETTING_TYPE,
      ...model.scope,
      studentId: null,
      workflow: {
        kind: "preparation-list",
        weekStart: nextDay.civilDate,
        weekEnd: nextDay.civilDate,
        sources: sourceRows,
        items,
      },
    };
    if (!isTeacherFollowupRecord(record)) throw new Error("Hazırlık kaydı öğretmen takip sözleşmesine uymuyor.");
    snapshot.settings.push(record);
    assertTeacherFollowupRelationships(snapshot);
    assertDataSnapshotRelationships(snapshot, today);
    await transaction.putMany("settings", [record]);
    return {
      changed: true,
      recordId: record.id,
      nextTeachingDate: nextDay.civilDate,
      sourceIds: pending.map((source) => source.id),
      itemCount: items.length,
    } satisfies SaveDayExitPreparationResult;
  });
  if (result.changed) notifyChanged();
  return result;
}
