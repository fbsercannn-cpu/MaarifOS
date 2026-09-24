import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  createEmptySnapshot,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const PORTFOLIO_SELECTION_SCHEMA_VERSION = 2 as const;

export type PortfolioSelectedBy = "teacher" | "teacher-child";

export interface PortfolioSelectionRecord extends StoredRecord {
  academicYearId: string;
  classroomId: string;
  studentId: string;
  periodStart: string;
  periodEnd: string;
  itemType: "observation";
  itemId: string;
  order: number;
  teacherCaption?: string;
  childReflection?: string;
  familyContribution?: string;
  selectedBy: PortfolioSelectedBy;
  selectedAt: string;
}

export interface PortfolioMonthFolder {
  key: string;
  label: string;
  observationCount: number;
  mediaCount: number;
  selectionCount: number;
  totalCount: number;
}

export interface StudentPortfolioWorkspace {
  studentId: string | null;
  academicYearId: string | null;
  classroomId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  monthFolders: PortfolioMonthFolder[];
  selections: PortfolioSelectionRecord[];
}

export interface SavePortfolioSelectionInput {
  studentId: string;
  observationId: string;
  selected: boolean;
  teacherCaption?: string;
  childReflection?: string;
  familyContribution?: string;
  selectedBy?: PortfolioSelectedBy;
  now?: Date;
}

export const emptyStudentPortfolioWorkspace: StudentPortfolioWorkspace = {
  studentId: null,
  academicYearId: null,
  classroomId: null,
  periodStart: null,
  periodEnd: null,
  monthFolders: [],
  selections: [],
};

function optionalText(value: string | undefined, maximum: number): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > maximum) {
    throw new Error(`Portfolyo notu en fazla ${maximum} karakter olabilir.`);
  }
  return normalized;
}

function academicYearForScope(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
): StoredRecord | null {
  const record = snapshot.academicYears.find(
    (candidate) =>
      candidate.id === scope.academicYearId &&
      typeof candidate.deletedAt !== "string" &&
      isCivilDate(candidate.startDate) &&
      isCivilDate(candidate.endDate) &&
      candidate.startDate <= candidate.endDate,
  );
  return record ?? null;
}

function recordMonthKey(record: StoredRecord): string | null {
  let civilDate =
    typeof record.civilDate === "string" && isCivilDate(record.civilDate)
      ? record.civilDate
      : null;
  if (!civilDate && typeof record.capturedAt === "string") {
    const capturedAt = new Date(record.capturedAt);
    if (!Number.isNaN(capturedAt.getTime())) {
      civilDate = civilDateInIstanbul(capturedAt);
    }
  }
  return civilDate ? civilDate.slice(0, 7) : null;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const raw = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return raw.charAt(0).toLocaleUpperCase("tr-TR") + raw.slice(1);
}

function belongsToStudent(record: StoredRecord, studentId: string): boolean {
  return (
    record.studentId === studentId ||
    (Array.isArray(record.studentIds) && record.studentIds.includes(studentId))
  );
}

function activeSelections(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  studentId: string,
): PortfolioSelectionRecord[] {
  return snapshot.portfolioSelections
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.studentId === studentId &&
        record.itemType === "observation" &&
        typeof record.itemId === "string" &&
        isCivilDate(record.periodStart) &&
        isCivilDate(record.periodEnd) &&
        recordBelongsToClassroomScope(record, scope),
    )
    .map((record) => record as PortfolioSelectionRecord)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.selectedAt.localeCompare(right.selectedAt) ||
        left.id.localeCompare(right.id),
    );
}

export function resolveStudentPortfolioWorkspace(
  snapshot: DataSnapshot,
  studentId: string,
): StudentPortfolioWorkspace {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return { ...emptyStudentPortfolioWorkspace, studentId };
  const academicYear = academicYearForScope(snapshot, scope);
  const student = snapshot.students.find(
    (record) =>
      record.id === studentId &&
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  if (!academicYear || !student) {
    return {
      ...emptyStudentPortfolioWorkspace,
      studentId,
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
    };
  }

  const periodStart = academicYear.startDate as string;
  const periodEnd = academicYear.endDate as string;
  const inPeriod = (record: StoredRecord): boolean =>
    record.civilDate >= periodStart && record.civilDate <= periodEnd;
  const observations = snapshot.observations.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope) &&
      belongsToStudent(record, studentId) &&
      inPeriod(record),
  );
  const media = snapshot.mediaAssets.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope) &&
      belongsToStudent(record, studentId) &&
      recordMonthKey(record) !== null &&
      (recordMonthKey(record) as string) >= periodStart.slice(0, 7) &&
      (recordMonthKey(record) as string) <= periodEnd.slice(0, 7),
  );
  const selections = activeSelections(snapshot, scope, studentId);
  const counts = new Map<
    string,
    { observationCount: number; mediaCount: number; selectionCount: number }
  >();
  const count = (
    monthKey: string | null,
    field: "observationCount" | "mediaCount" | "selectionCount",
  ) => {
    if (!monthKey) return;
    const current = counts.get(monthKey) ?? {
      observationCount: 0,
      mediaCount: 0,
      selectionCount: 0,
    };
    current[field] += 1;
    counts.set(monthKey, current);
  };
  for (const observation of observations) {
    count(recordMonthKey(observation), "observationCount");
  }
  for (const asset of media) count(recordMonthKey(asset), "mediaCount");
  const observationsById = new Map(
    observations.map((observation) => [observation.id, observation]),
  );
  for (const selection of selections) {
    count(recordMonthKey(observationsById.get(selection.itemId) ?? selection), "selectionCount");
  }

  return {
    studentId,
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    periodStart,
    periodEnd,
    selections,
    monthFolders: [...counts.entries()]
      .map(([key, value]) => ({
        key,
        label: monthLabel(key),
        ...value,
        totalCount: value.observationCount + value.mediaCount,
      }))
      .filter((folder) => folder.totalCount > 0)
      .sort((left, right) => left.key.localeCompare(right.key)),
  };
}

export async function loadStudentPortfolioWorkspace(
  store: LocalDataStore,
  studentId: string,
): Promise<StudentPortfolioWorkspace> {
  return resolveStudentPortfolioWorkspace(await store.readSnapshot(), studentId);
}

export async function savePortfolioSelection(
  store: LocalDataStore,
  input: SavePortfolioSelectionInput,
): Promise<PortfolioSelectionRecord> {
  const now = input.now ?? new Date();
  const updatedAt = now.toISOString();
  const civilDate = civilDateInIstanbul(now);
  return store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "observations",
      "portfolioSelections",
    ],
    async (transaction) => {
      const [
        academicYears,
        classrooms,
        settings,
        students,
        observations,
        portfolioSelections,
      ] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("settings"),
        transaction.getAll("students"),
        transaction.getAll("observations"),
        transaction.getAll("portfolioSelections"),
      ]);
      const snapshot: DataSnapshot = {
        ...createEmptySnapshot(),
        academicYears,
        classrooms,
        settings,
        students,
        observations,
        portfolioSelections,
      };
      const scope = resolveActiveClassroomScope(snapshot);
      if (!scope) throw new Error("Portfolyo için etkin sınıf bulunamadı.");
      const academicYear = academicYearForScope(snapshot, scope);
      if (!academicYear) {
        throw new Error("Portfolyo için etkin eğitim yılı bulunamadı.");
      }
      const student = students.find(
        (record) =>
          record.id === input.studentId &&
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, scope),
      );
      const observation = observations.find(
        (record) =>
          record.id === input.observationId &&
          typeof record.deletedAt !== "string" &&
          belongsToStudent(record, input.studentId) &&
          recordBelongsToClassroomScope(record, scope),
      );
      if (!student || !observation) {
        throw new Error(
          "Portfolyo seçimi yalnız bu sınıftaki çocuğun kanıtından yapılabilir.",
        );
      }

      const existing = portfolioSelections.find(
        (record) =>
          record.studentId === input.studentId &&
          record.itemType === "observation" &&
          record.itemId === input.observationId &&
          recordBelongsToClassroomScope(record, scope),
      ) as PortfolioSelectionRecord | undefined;
      const currentSelections = activeSelections(
        snapshot,
        scope,
        input.studentId,
      );
      const record: PortfolioSelectionRecord = {
        ...(existing ?? {}),
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
        civilDate: existing?.civilDate ?? civilDate,
        deletedAt: input.selected ? null : updatedAt,
        schemaVersion: PORTFOLIO_SELECTION_SCHEMA_VERSION,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        studentId: input.studentId,
        periodStart: academicYear.startDate as string,
        periodEnd: academicYear.endDate as string,
        itemType: "observation",
        itemId: input.observationId,
        order:
          existing?.order ??
          currentSelections.reduce(
            (maximum, selection) => Math.max(maximum, selection.order),
            -1,
          ) + 1,
        selectedBy: input.selectedBy ?? existing?.selectedBy ?? "teacher",
        selectedAt: existing?.selectedAt ?? updatedAt,
        ...(optionalText(input.teacherCaption, 2_000)
          ? { teacherCaption: optionalText(input.teacherCaption, 2_000) }
          : {}),
        ...(optionalText(input.childReflection, 1_000)
          ? { childReflection: optionalText(input.childReflection, 1_000) }
          : {}),
        ...(optionalText(input.familyContribution, 2_000)
          ? { familyContribution: optionalText(input.familyContribution, 2_000) }
          : {}),
      };
      if (!record.teacherCaption) delete record.teacherCaption;
      if (!record.childReflection) delete record.childReflection;
      if (!record.familyContribution) delete record.familyContribution;

    await transaction.putMany("portfolioSelections", [record]);
      return record;
    },
  );
}
