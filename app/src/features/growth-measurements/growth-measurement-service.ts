import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  assertGrowthMeasurementSnapshotRelations,
  growthMeasurementRecordsFromSnapshot,
  growthPeriodsForAcademicYear,
  growthSelectionHead,
  isGrowthMeasurementSelectionRecord,
  isGrowthMeasurementValueRecord,
  type GrowthMeasurementMetric,
  type GrowthMeasurementSelectionRecord,
  type GrowthMeasurementSource,
  type GrowthMeasurementValueRecord,
  type GrowthSelectionReason,
} from "../../core/domain/growth-measurements.ts";
import {
  classroomScopesEqual,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import { growthMembershipForPeriod, buildGrowthWorkspace } from "./growth-model.ts";
import { growthUnit } from "./growth-value.ts";

const GROWTH_COLLECTIONS = [
  "academicYears",
  "classrooms",
  "students",
  "settings",
] as const;

export const GROWTH_WRITE_CONFLICT_MESSAGE =
  "Bu ölçüm başka bir sekmede değişti. Güncel kaydı yeniden açıp seçiminizi tekrar yapın.";

export interface SaveGrowthMeasurementInput extends ActiveClassroomScope {
  readonly studentId: string;
  readonly periodKey: string;
  readonly metric: GrowthMeasurementMetric;
  readonly integerValue: number;
  readonly measuredOn: string;
  readonly source: GrowthMeasurementSource;
  readonly measuredBy?: string;
  readonly instrument?: string;
  readonly conditionsNote?: string;
  readonly documentDate?: string;
  readonly repeatOfId?: string;
  readonly correction?: Readonly<{
    correctsId: string;
    reason: string;
  }>;
  /** Selection head shown to the caller; null means no prior selection. */
  readonly expectedSelectionEventId: string | null;
  readonly measurementId?: string;
  readonly selectionEventId?: string;
  readonly now?: Date;
}

export interface SavedGrowthMeasurement {
  readonly measurement: GrowthMeasurementValueRecord;
  readonly selection: GrowthMeasurementSelectionRecord;
}

export interface SelectGrowthMeasurementInput extends ActiveClassroomScope {
  readonly studentId: string;
  readonly periodKey: string;
  readonly metric: GrowthMeasurementMetric;
  readonly selectedMeasurementId: string;
  readonly expectedSelectionEventId: string | null;
  readonly reason: Exclude<GrowthSelectionReason, "initial">;
  readonly selectionEventId?: string;
  readonly now?: Date;
}

function normalizedOptional(value: string | undefined): string | undefined {
  const normalized = value?.normalize("NFC").trim();
  return normalized ? normalized : undefined;
}

function safeNow(now: Date | undefined): Date {
  const result = now ?? new Date();
  if (!Number.isFinite(result.getTime())) throw new Error("Ölçüm kayıt zamanı geçersiz.");
  return result;
}

async function snapshotFromTransaction(
  transaction: DataTransaction,
): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  const [academicYears, classrooms, students, settings] = await Promise.all([
    transaction.getAll("academicYears"),
    transaction.getAll("classrooms"),
    transaction.getAll("students"),
    transaction.getAll("settings"),
  ]);
  snapshot.academicYears = academicYears;
  snapshot.classrooms = classrooms;
  snapshot.students = students;
  snapshot.settings = settings;
  return snapshot;
}

function requireWriteScope(
  snapshot: DataSnapshot,
  input: ActiveClassroomScope & { studentId: string; periodKey: string; measuredOn?: string },
): {
  academicYear: (typeof snapshot.academicYears)[number];
  period: ReturnType<typeof growthPeriodsForAcademicYear>[number];
} {
  const active = resolveActiveClassroomScope(snapshot);
  if (!active || !classroomScopesEqual(active, input)) {
    throw new Error("Aktif sınıf değişti. Boy-kilo çizelgesini yeniden açın.");
  }
  const academicYear = snapshot.academicYears.find((record) =>
    record.id === input.academicYearId && typeof record.deletedAt !== "string");
  const student = snapshot.students.find((record) =>
    record.id === input.studentId && typeof record.deletedAt !== "string");
  if (!academicYear || !student) {
    throw new Error("Ölçüm yapılacak çocuk veya eğitim yılı bulunamadı.");
  }
  const period = growthPeriodsForAcademicYear(academicYear).find((candidate) =>
    candidate.key === input.periodKey);
  if (!period) throw new Error("Ölçüm dönemi eğitim yılına ait değil.");
  const periodMembership = growthMembershipForPeriod(student, input, academicYear, period);
  if (periodMembership.status !== "included") {
    throw new Error(periodMembership.status === "review"
      ? "Öğrencinin hedef dönem üyeliği incelenmeden ölçüm kaydedilemez."
      : "Öğrenci hedef ölçüm döneminde bu sınıfın kapsamında değil.");
  }
  if (input.measuredOn) {
    const actual = resolveStudentMembershipOn(student, {
      ...input,
      academicYear,
      civilDate: input.measuredOn,
    });
    if (!actual.eligible || actual.issues.length > 0) {
      throw new Error("Gerçek ölçüm günü öğrencinin doğrulanmış sınıf üyeliğine uymuyor.");
    }
  }
  return { academicYear, period };
}

function ensureExpectedHead(
  snapshot: DataSnapshot,
  input: ActiveClassroomScope & {
    studentId: string;
    periodKey: string;
    metric: GrowthMeasurementMetric;
    expectedSelectionEventId: string | null;
  },
) {
  const records = growthMeasurementRecordsFromSnapshot(snapshot);
  const head = growthSelectionHead(records, input);
  if ((head?.id ?? null) !== input.expectedSelectionEventId) {
    throw new Error(GROWTH_WRITE_CONFLICT_MESSAGE);
  }
  return { records, head };
}

function preparedMeasurement(
  snapshot: DataSnapshot,
  input: SaveGrowthMeasurementInput,
): SavedGrowthMeasurement {
  const now = safeNow(input.now);
  const timestamp = now.toISOString();
  const civilDate = civilDateInIstanbul(now);
  if (!isCivilDate(input.measuredOn) || input.measuredOn > civilDate) {
    throw new Error("Ölçüm tarihi gelecekte olamaz ve gerçek bir takvim günü olmalıdır.");
  }
  if (!Number.isSafeInteger(input.integerValue) || input.integerValue <= 0) {
    throw new Error("Ölçüm değeri sıfırdan büyük tam sayı mm veya g olmalıdır.");
  }
  const { period } = requireWriteScope(snapshot, input);
  if (period.windowStart > civilDate || input.measuredOn < period.windowStart) {
    throw new Error("Henüz başlamamış ölçüm dönemine kayıt yapılamaz.");
  }
  const { records, head } = ensureExpectedHead(snapshot, input);
  if (head && !input.repeatOfId && !input.correction) {
    throw new Error("Yeni değerin tekrar ölçüm mü düzeltme mi olduğunu seçin.");
  }
  if (!head && (input.repeatOfId || input.correction)) {
    throw new Error("İlk ölçüm tekrar veya düzeltme olarak kaydedilemez.");
  }
  const linkedId = input.correction?.correctsId ?? input.repeatOfId;
  if (linkedId) {
    const linked = records.find((record) => record.id === linkedId);
    if (!linked || !isGrowthMeasurementValueRecord(linked) ||
      linked.studentId !== input.studentId ||
      linked.academicYearId !== input.academicYearId ||
      linked.classroomId !== input.classroomId ||
      linked.periodKey !== input.periodKey ||
      linked.metric !== input.metric) {
      throw new Error("Tekrar veya düzeltme kaynağı aynı çocuk ve ölçüm alanına ait değil.");
    }
  }
  const correctionReason = normalizedOptional(input.correction?.reason);
  if (input.correction && !correctionReason) {
    throw new Error("Düzeltme gerekçesini yazın; önceki değer korunacaktır.");
  }
  const measurementId = input.measurementId ?? crypto.randomUUID();
  const selectionEventId = input.selectionEventId ?? crypto.randomUUID();
  if (measurementId === selectionEventId ||
    snapshot.settings.some((record) => record.id === measurementId || record.id === selectionEventId)) {
    throw new Error("Ölçüm olay kimliği daha önce kullanılmış.");
  }
  const common = {
    settingType: "growth-measurement-v1" as const,
    schemaVersion: 1 as const,
    studentId: input.studentId,
    classroomId: input.classroomId,
    academicYearId: input.academicYearId,
    periodKey: input.periodKey,
    metric: input.metric,
    createdAt: timestamp,
    updatedAt: timestamp,
    civilDate,
    deletedAt: null,
  };
  const measurement: GrowthMeasurementValueRecord = {
    ...common,
    id: measurementId,
    eventKind: input.correction ? "correction" : "measurement",
    integerValue: input.integerValue,
    unit: growthUnit(input.metric),
    measuredOn: input.measuredOn,
    source: input.source,
    ...(normalizedOptional(input.measuredBy) ? { measuredBy: normalizedOptional(input.measuredBy) } : {}),
    ...(normalizedOptional(input.instrument) ? { instrument: normalizedOptional(input.instrument) } : {}),
    ...(normalizedOptional(input.conditionsNote) ? { conditionsNote: normalizedOptional(input.conditionsNote) } : {}),
    ...(input.documentDate ? { documentDate: input.documentDate } : {}),
    ...(input.repeatOfId ? { repeatOfId: input.repeatOfId } : {}),
    ...(input.correction ? {
      correctsId: input.correction.correctsId,
      correctionReason: correctionReason!,
    } : {}),
  };
  const reason: GrowthSelectionReason = input.correction
    ? "correction-confirmed"
    : input.repeatOfId
      ? "repeat-confirmed"
      : "initial";
  const selection: GrowthMeasurementSelectionRecord = {
    ...common,
    id: selectionEventId,
    eventKind: "selection",
    selectedMeasurementId: measurement.id,
    previousSelectionEventId: head?.id ?? null,
    selectionReason: reason,
  };
  if (!isGrowthMeasurementValueRecord(measurement) ||
    !isGrowthMeasurementSelectionRecord(selection)) {
    throw new Error("Boy-kilo ölçüm sözleşmesi doğrulanamadı.");
  }
  return { measurement, selection };
}

/** Atomic batch; an invalid or stale row leaves every row untouched. */
export async function saveGrowthMeasurementBatch(
  store: LocalDataStore,
  inputs: readonly SaveGrowthMeasurementInput[],
): Promise<SavedGrowthMeasurement[]> {
  const frozen = structuredClone(inputs);
  if (!frozen.length || frozen.length > 1_000) {
    throw new Error("Bir işlemde 1 ile 1.000 arasında ölçüm kaydedilebilir.");
  }
  const scopeKeys = frozen.map((input) => [
    input.studentId,
    input.academicYearId,
    input.classroomId,
    input.periodKey,
    input.metric,
  ].join("|"));
  if (new Set(scopeKeys).size !== scopeKeys.length) {
    throw new Error("Aynı çocuk, dönem ve ölçüm alanı toplu işlemde yinelenemez.");
  }
  return store.transaction("readwrite", GROWTH_COLLECTIONS, async (transaction) => {
    const current = await snapshotFromTransaction(transaction);
    assertGrowthMeasurementSnapshotRelations(current);
    const results: SavedGrowthMeasurement[] = [];
    for (const input of frozen) {
      const result = preparedMeasurement(current, input);
      results.push(result);
      current.settings.push(result.measurement, result.selection);
    }
    assertGrowthMeasurementSnapshotRelations(current);
    await transaction.putMany("settings", results.flatMap((result) => [
      result.measurement,
      result.selection,
    ]));
    return structuredClone(results);
  });
}

export async function saveGrowthMeasurement(
  store: LocalDataStore,
  input: SaveGrowthMeasurementInput,
): Promise<SavedGrowthMeasurement> {
  return (await saveGrowthMeasurementBatch(store, [input]))[0]!;
}

export async function selectGrowthMeasurement(
  store: LocalDataStore,
  input: SelectGrowthMeasurementInput,
): Promise<GrowthMeasurementSelectionRecord> {
  const frozen = structuredClone(input);
  return store.transaction("readwrite", GROWTH_COLLECTIONS, async (transaction) => {
    const snapshot = await snapshotFromTransaction(transaction);
    assertGrowthMeasurementSnapshotRelations(snapshot);
    requireWriteScope(snapshot, frozen);
    const { records, head } = ensureExpectedHead(snapshot, frozen);
    const selected = records.find((record) => record.id === frozen.selectedMeasurementId);
    if (!selected || !isGrowthMeasurementValueRecord(selected) ||
      selected.studentId !== frozen.studentId ||
      selected.academicYearId !== frozen.academicYearId ||
      selected.classroomId !== frozen.classroomId ||
      selected.periodKey !== frozen.periodKey ||
      selected.metric !== frozen.metric) {
      throw new Error("Seçilen geçerli sonuç aynı ölçüm geçmişinde bulunamadı.");
    }
    const now = safeNow(frozen.now);
    const timestamp = now.toISOString();
    if (timestamp < selected.createdAt || (head && timestamp < head.createdAt)) {
      throw new Error("Sonuç seçimi bağlı ölçümden önce oluşturulamaz.");
    }
    const selection: GrowthMeasurementSelectionRecord = {
      id: frozen.selectionEventId ?? crypto.randomUUID(),
      settingType: "growth-measurement-v1",
      schemaVersion: 1,
      eventKind: "selection",
      studentId: frozen.studentId,
      classroomId: frozen.classroomId,
      academicYearId: frozen.academicYearId,
      periodKey: frozen.periodKey,
      metric: frozen.metric,
      selectedMeasurementId: selected.id,
      previousSelectionEventId: head?.id ?? null,
      selectionReason: frozen.reason,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: civilDateInIstanbul(now),
      deletedAt: null,
    };
    if (snapshot.settings.some((record) => record.id === selection.id) ||
      !isGrowthMeasurementSelectionRecord(selection)) {
      throw new Error("Sonuç seçimi olay sözleşmesine uymuyor.");
    }
    snapshot.settings.push(selection);
    assertGrowthMeasurementSnapshotRelations(snapshot);
    await transaction.putMany("settings", [selection]);
    return structuredClone(selection);
  });
}

export async function loadGrowthWorkspace(
  store: LocalDataStore,
  today = civilDateInIstanbul(new Date()),
): Promise<ReturnType<typeof buildGrowthWorkspace>> {
  return buildGrowthWorkspace(await store.readSnapshot(), today);
}
