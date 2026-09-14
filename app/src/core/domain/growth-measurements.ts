import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import {
  resolveStudentMembershipOn,
  studentMembershipOverlaps,
} from "./student-membership.ts";

export const GROWTH_MEASUREMENT_SETTING_TYPE = "growth-measurement-v1" as const;
export const GROWTH_MEASUREMENT_SCHEMA_VERSION = 1 as const;

export const GROWTH_MEASUREMENT_METRICS = ["height", "weight"] as const;
export type GrowthMeasurementMetric =
  (typeof GROWTH_MEASUREMENT_METRICS)[number];
export type GrowthMeasurementUnit = "mm" | "g";
export type GrowthMeasurementSource = "school" | "family" | "document";
export type GrowthMeasurementEventKind =
  | "measurement"
  | "correction"
  | "selection";
export type GrowthSelectionReason =
  | "initial"
  | "repeat-confirmed"
  | "correction-confirmed"
  | "manual-review";

export interface GrowthPeriodDefinition {
  readonly key: string;
  readonly label: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly month: 3 | 6 | 9 | 12;
}

interface GrowthMeasurementBase extends StoredRecord {
  readonly settingType: typeof GROWTH_MEASUREMENT_SETTING_TYPE;
  readonly schemaVersion: typeof GROWTH_MEASUREMENT_SCHEMA_VERSION;
  readonly studentId: string;
  readonly classroomId: string;
  readonly academicYearId: string;
  readonly periodKey: string;
  readonly metric: GrowthMeasurementMetric;
  readonly eventKind: GrowthMeasurementEventKind;
  readonly deletedAt?: null;
}

export interface GrowthMeasurementValueRecord extends GrowthMeasurementBase {
  readonly eventKind: "measurement" | "correction";
  /** Height is stored as integer millimetres; weight as integer grams. */
  readonly integerValue: number;
  readonly unit: GrowthMeasurementUnit;
  /** The real civil day on which this metric was measured. */
  readonly measuredOn: string;
  readonly source: GrowthMeasurementSource;
  readonly measuredBy?: string;
  readonly instrument?: string;
  readonly conditionsNote?: string;
  readonly documentDate?: string;
  /** A new measurement event may identify the value it intentionally repeats. */
  readonly repeatOfId?: string;
  /** A correction never overwrites its source value. */
  readonly correctsId?: string;
  readonly correctionReason?: string;
}

export interface GrowthMeasurementSelectionRecord
  extends GrowthMeasurementBase {
  readonly eventKind: "selection";
  readonly selectedMeasurementId: string;
  /** Compare-and-append head. Null is valid only for the first selection. */
  readonly previousSelectionEventId: string | null;
  readonly selectionReason: GrowthSelectionReason;
}

export type GrowthMeasurementRecord =
  | GrowthMeasurementValueRecord
  | GrowthMeasurementSelectionRecord;

const BASE_KEYS = [
  "id",
  "createdAt",
  "updatedAt",
  "civilDate",
  "deletedAt",
  "schemaVersion",
] as const;
const SCOPE_KEYS = [
  "settingType",
  "eventKind",
  "studentId",
  "classroomId",
  "academicYearId",
  "periodKey",
  "metric",
] as const;
const VALUE_KEYS = [
  "integerValue",
  "unit",
  "measuredOn",
  "source",
  "measuredBy",
  "instrument",
  "conditionsNote",
  "documentDate",
  "repeatOfId",
  "correctsId",
  "correctionReason",
] as const;
const SELECTION_KEYS = [
  "selectedMeasurementId",
  "previousSelectionEventId",
  "selectionReason",
] as const;

/** Shared backup/repository allow-list. The guard below still enforces each union branch. */
export const GROWTH_MEASUREMENT_RECORD_KEYS = [
  ...BASE_KEYS,
  ...SCOPE_KEYS,
  ...VALUE_KEYS,
  ...SELECTION_KEYS,
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PERIOD_KEY_PATTERN = /^\d{4}-(?:03|06|09|12)$/u;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isOptionalText(value: unknown, maximumLength: number): boolean {
  return value === undefined ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= maximumLength &&
      value === value.normalize("NFC").trim());
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const known = new Set(allowed);
  return Object.keys(value).every((key) => known.has(key));
}

function isBaseRecord(value: Record<string, unknown>): boolean {
  return isUuid(value.id) &&
    isUtcIso(value.createdAt) &&
    value.updatedAt === value.createdAt &&
    isCivilDate(value.civilDate) &&
    typeof value.civilDate === "string" &&
    value.civilDate <= civilDateInIstanbul(new Date(String(value.createdAt))) &&
    (value.deletedAt === undefined || value.deletedAt === null) &&
    value.schemaVersion === GROWTH_MEASUREMENT_SCHEMA_VERSION &&
    value.settingType === GROWTH_MEASUREMENT_SETTING_TYPE &&
    isUuid(value.studentId) &&
    isUuid(value.classroomId) &&
    isUuid(value.academicYearId) &&
    typeof value.periodKey === "string" &&
    PERIOD_KEY_PATTERN.test(value.periodKey) &&
    (value.metric === "height" || value.metric === "weight");
}

export function isGrowthMeasurementValueRecord(
  value: unknown,
): value is GrowthMeasurementValueRecord {
  if (!isObject(value) ||
    !hasOnlyKeys(value, [...BASE_KEYS, ...SCOPE_KEYS, ...VALUE_KEYS]) ||
    !isBaseRecord(value) ||
    (value.eventKind !== "measurement" && value.eventKind !== "correction") ||
    !Number.isSafeInteger(value.integerValue) ||
    Number(value.integerValue) <= 0 ||
    (value.metric === "height" ? value.unit !== "mm" : value.unit !== "g") ||
    !isCivilDate(value.measuredOn) ||
    typeof value.civilDate !== "string" ||
    value.measuredOn > value.civilDate ||
    (value.source !== "school" &&
      value.source !== "family" &&
      value.source !== "document") ||
    !isOptionalText(value.measuredBy, 160) ||
    !isOptionalText(value.instrument, 160) ||
    !isOptionalText(value.conditionsNote, 2_000) ||
    (value.documentDate !== undefined &&
      (!isCivilDate(value.documentDate) ||
        value.documentDate > value.civilDate ||
        value.source !== "document")) ||
    (value.repeatOfId !== undefined && !isUuid(value.repeatOfId)) ||
    (value.correctsId !== undefined && !isUuid(value.correctsId)) ||
    !isOptionalText(value.correctionReason, 1_000)) {
    return false;
  }
  if (value.eventKind === "measurement") {
    return value.correctsId === undefined &&
      value.correctionReason === undefined;
  }
  return value.repeatOfId === undefined &&
    isUuid(value.correctsId) &&
    typeof value.correctionReason === "string";
}

export function isGrowthMeasurementSelectionRecord(
  value: unknown,
): value is GrowthMeasurementSelectionRecord {
  return isObject(value) &&
    hasOnlyKeys(value, [...BASE_KEYS, ...SCOPE_KEYS, ...SELECTION_KEYS]) &&
    isBaseRecord(value) &&
    value.eventKind === "selection" &&
    isUuid(value.selectedMeasurementId) &&
    (value.previousSelectionEventId === null ||
      isUuid(value.previousSelectionEventId)) &&
    (value.selectionReason === "initial" ||
      value.selectionReason === "repeat-confirmed" ||
      value.selectionReason === "correction-confirmed" ||
      value.selectionReason === "manual-review");
}

/** Strict structural guard used by repository and backup codecs. */
export function isGrowthMeasurementRecord(
  value: unknown,
): value is GrowthMeasurementRecord {
  return isGrowthMeasurementValueRecord(value) ||
    isGrowthMeasurementSelectionRecord(value);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthWindow(year: number, month: 3 | 6 | 9 | 12): {
  start: string;
  end: string;
} {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return {
    start: `${prefix}-01`,
    end: `${prefix}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`,
  };
}

/** Four real YYYY-MM periods derived from the academic year's actual bounds. */
export function growthPeriodsForAcademicYear(
  academicYear: Pick<StoredRecord, "id"> & {
    readonly startDate?: unknown;
    readonly endDate?: unknown;
    readonly operationalStartDate?: unknown;
  },
): GrowthPeriodDefinition[] {
  const actualStart = isCivilDate(academicYear.operationalStartDate)
    ? academicYear.operationalStartDate
    : academicYear.startDate;
  if (!isCivilDate(actualStart) ||
    !isCivilDate(academicYear.endDate) ||
    actualStart > academicYear.endDate) {
    throw new Error("Eğitim yılının gerçek tarih sınırları geçersiz.");
  }
  const endDate = academicYear.endDate;
  const startYear = Number(actualStart.slice(0, 4));
  const endYear = Number(academicYear.endDate.slice(0, 4));
  const definitions = [
    { year: startYear, month: 9 as const, name: "Eylül" },
    { year: startYear, month: 12 as const, name: "Aralık" },
    { year: endYear, month: 3 as const, name: "Mart" },
    { year: endYear, month: 6 as const, name: "Haziran" },
  ];
  const periods = definitions.map(({ year, month, name }) => {
    const window = monthWindow(year, month);
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${name} ${year}`,
      windowStart: window.start < actualStart ? actualStart : window.start,
      windowEnd: window.end > endDate
        ? endDate
        : window.end,
      month,
    };
  });
  if (new Set(periods.map((period) => period.key)).size !== 4 ||
    periods.some((period) => period.windowStart > period.windowEnd)) {
    throw new Error(
      "Eğitim yılı Eylül, Aralık, Mart ve Haziran ölçüm dönemlerinin tamamını kapsamıyor.",
    );
  }
  return periods;
}

export function growthMeasurementScopeKey(
  record: Pick<GrowthMeasurementRecord,
    "studentId" | "academicYearId" | "classroomId" | "periodKey" | "metric">,
): string {
  return [
    record.studentId,
    record.academicYearId,
    record.classroomId,
    record.periodKey,
    record.metric,
  ].join("|");
}

export function growthMeasurementRecordsFromSnapshot(
  snapshot: Pick<DataSnapshot, "settings">,
): GrowthMeasurementRecord[] {
  return snapshot.settings
    .filter((record) => record.settingType === GROWTH_MEASUREMENT_SETTING_TYPE)
    .map((record) => {
      if (!isGrowthMeasurementRecord(record)) {
        throw new Error(`Boy-kilo kaydı geçersiz: settings/${record.id}`);
      }
      return record;
    });
}

/** Returns the unique append-only selection head, or throws on a fork/cycle. */
export function growthSelectionHead(
  records: readonly GrowthMeasurementRecord[],
  scope: Pick<GrowthMeasurementRecord,
    "studentId" | "academicYearId" | "classroomId" | "periodKey" | "metric">,
): GrowthMeasurementSelectionRecord | null {
  const key = growthMeasurementScopeKey(scope);
  const selections = records.filter(
    (record): record is GrowthMeasurementSelectionRecord =>
      record.eventKind === "selection" &&
      growthMeasurementScopeKey(record) === key,
  );
  if (!selections.length) return null;
  const referenced = new Set(
    selections.flatMap((selection) =>
      selection.previousSelectionEventId
        ? [selection.previousSelectionEventId]
        : []),
  );
  const heads = selections.filter((selection) => !referenced.has(selection.id));
  if (heads.length !== 1) {
    throw new Error("Boy-kilo geçerli sonuç seçim zinciri çatallanmış.");
  }
  return heads[0]!;
}

export function selectedGrowthMeasurement(
  records: readonly GrowthMeasurementRecord[],
  scope: Pick<GrowthMeasurementRecord,
    "studentId" | "academicYearId" | "classroomId" | "periodKey" | "metric">,
): GrowthMeasurementValueRecord | null {
  const head = growthSelectionHead(records, scope);
  if (!head) return null;
  const selected = records.find(
    (record): record is GrowthMeasurementValueRecord =>
      record.id === head.selectedMeasurementId &&
      isGrowthMeasurementValueRecord(record),
  );
  if (!selected ||
    growthMeasurementScopeKey(selected) !== growthMeasurementScopeKey(scope)) {
    throw new Error("Boy-kilo seçimi geçerli bir ölçüm olayına bağlanmıyor.");
  }
  return selected;
}

function assertSameGrowthScope(
  source: GrowthMeasurementRecord,
  target: GrowthMeasurementRecord,
  label: string,
): void {
  if (growthMeasurementScopeKey(source) !== growthMeasurementScopeKey(target)) {
    throw new Error(`${label} başka çocuk, sınıf, yıl, dönem veya ölçüm türüne bağlanıyor.`);
  }
}

/**
 * Cross-record guard used by backup/restore and before every write. It rejects
 * dangling or cross-student correction/selection links and ambiguous heads.
 */
export function assertGrowthMeasurementSnapshotRelations(
  snapshot: DataSnapshot,
): void {
  const records = growthMeasurementRecordsFromSnapshot(snapshot);
  const byId = new Map<string, GrowthMeasurementRecord>();
  for (const record of records) {
    if (byId.has(record.id)) {
      throw new Error(`Boy-kilo olay kimliği yineleniyor: ${record.id}`);
    }
    byId.set(record.id, record);
  }
  const students = new Map(snapshot.students.map((record) => [record.id, record]));
  const classrooms = new Map(snapshot.classrooms.map((record) => [record.id, record]));
  const years = new Map(snapshot.academicYears.map((record) => [record.id, record]));

  for (const record of records) {
    const student = students.get(record.studentId);
    const classroom = classrooms.get(record.classroomId);
    const academicYear = years.get(record.academicYearId);
    if (!student || !classroom || !academicYear ||
      classroom.academicYearId !== record.academicYearId) {
      throw new Error(`Boy-kilo olay kapsamı bulunamadı: settings/${record.id}`);
    }
    const periods = growthPeriodsForAcademicYear(academicYear);
    const period = periods.find((candidate) => candidate.key === record.periodKey);
    if (!period || !studentMembershipOverlaps(student, {
      academicYearId: record.academicYearId,
      classroomId: record.classroomId,
      academicYear,
      periodStart: period.windowStart,
      periodEnd: period.windowEnd,
    })) {
      throw new Error(`Boy-kilo olayı hedef dönemdeki öğrenci kapsamına uymuyor: settings/${record.id}`);
    }
    if (record.eventKind !== "selection") {
      if (record.measuredOn < period.windowStart) {
        throw new Error(`Boy-kilo gerçek ölçüm tarihi hedef dönem başlamadan önce: settings/${record.id}`);
      }
      const membership = resolveStudentMembershipOn(student, {
        academicYearId: record.academicYearId,
        classroomId: record.classroomId,
        civilDate: record.measuredOn,
        academicYear,
      });
      if (!membership.eligible) {
        throw new Error(`Boy-kilo gerçek ölçüm tarihi öğrenci üyeliğine uymuyor: settings/${record.id}`);
      }
      for (const [reference, label] of [
        [record.repeatOfId, "Tekrar ölçüm"],
        [record.correctsId, "Düzeltme"],
      ] as const) {
        if (!reference) continue;
        const source = byId.get(reference);
        if (reference === record.id || !source || !isGrowthMeasurementValueRecord(source) ||
          source.createdAt > record.createdAt) {
          throw new Error(`${label} kaynağı eksik veya olaydan daha yeni.`);
        }
        assertSameGrowthScope(record, source, label);
      }
      continue;
    }
    const selected = byId.get(record.selectedMeasurementId);
    if (!selected || !isGrowthMeasurementValueRecord(selected) ||
      selected.createdAt > record.createdAt) {
      throw new Error("Boy-kilo seçiminin ölçüm kaynağı eksik veya seçimden daha yeni.");
    }
    assertSameGrowthScope(record, selected, "Geçerli sonuç seçimi");
    if (record.previousSelectionEventId === null && record.selectionReason !== "initial") {
      throw new Error("Boy-kilo ilk seçimi başlangıç nedeni taşımalıdır.");
    }
    if (record.previousSelectionEventId !== null && record.selectionReason === "initial") {
      throw new Error("Boy-kilo sonraki seçimi başlangıç nedeni taşıyamaz.");
    }
    if (record.selectionReason === "correction-confirmed" && selected.eventKind !== "correction") {
      throw new Error("Boy-kilo düzeltme seçimi bir düzeltme olayına bağlanmalıdır.");
    }
    if (record.selectionReason === "repeat-confirmed" && !selected.repeatOfId) {
      throw new Error("Boy-kilo tekrar seçimi bir tekrar ölçümüne bağlanmalıdır.");
    }
    if (record.previousSelectionEventId) {
      const previous = byId.get(record.previousSelectionEventId);
      if (!previous || !isGrowthMeasurementSelectionRecord(previous) ||
        previous.createdAt > record.createdAt) {
        throw new Error("Boy-kilo önceki seçim olayı eksik veya daha yeni.");
      }
      assertSameGrowthScope(record, previous, "Önceki sonuç seçimi");
    }
  }

  const scopeKeys = new Set(records.map(growthMeasurementScopeKey));
  for (const scopeKey of scopeKeys) {
    const scoped = records.filter(
      (record) => growthMeasurementScopeKey(record) === scopeKey,
    );
    const selections = scoped.filter(isGrowthMeasurementSelectionRecord);
    if (!selections.length) continue;
    const roots = selections.filter(
      (selection) => selection.previousSelectionEventId === null,
    );
    if (roots.length !== 1) {
      throw new Error("Boy-kilo seçim zincirinin tek bir başlangıcı olmalıdır.");
    }
    const nextByPrevious = new Map<string, GrowthMeasurementSelectionRecord>();
    for (const selection of selections) {
      if (!selection.previousSelectionEventId) continue;
      if (nextByPrevious.has(selection.previousSelectionEventId)) {
        throw new Error("Boy-kilo seçim zinciri eşzamanlı yazımla çatallanmış.");
      }
      nextByPrevious.set(selection.previousSelectionEventId, selection);
    }
    const visited = new Set<string>();
    let current: GrowthMeasurementSelectionRecord | undefined = roots[0];
    while (current) {
      if (visited.has(current.id)) {
        throw new Error("Boy-kilo seçim zincirinde döngü var.");
      }
      visited.add(current.id);
      current = nextByPrevious.get(current.id);
    }
    if (visited.size !== selections.length) {
      throw new Error("Boy-kilo seçim zinciri kopuk.");
    }
    growthSelectionHead(scoped, scoped[0]!);
  }
}
