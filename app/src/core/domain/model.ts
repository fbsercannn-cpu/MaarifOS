export const COLLECTION_NAMES = [
  "academicYears",
  "classrooms",
  "students",
  "attendanceRecords",
  "observations",
  "observationRevisions",
  "activities",
  "mediaAssets",
  "plans",
  "calendarEntries",
  "maarifReferences",
  "evidenceCurriculumLinks",
  "valueEvidenceLinks",
  "portfolioSelections",
  "reportDrafts",
  "externalFeedback",
  "exportPackages",
  "notificationRules",
  "settings",
  "auditLogs",
] as const;

export type CollectionName = (typeof COLLECTION_NAMES)[number];

/**
 * Bütün kalıcı alan kayıtlarının ortak zarfı. Saatler UTC ISO-8601, öğretmenin
 * takvim günü ise saat diliminden bağımsız YYYY-MM-DD olarak ayrıca saklanır.
 */
export interface StoredRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  civilDate: string;
  deletedAt?: string | null;
  schemaVersion: number;
  [key: string]: unknown;
}

export type DataSnapshot = Record<CollectionName, StoredRecord[]>;

export function createEmptySnapshot(): DataSnapshot {
  return Object.fromEntries(
    COLLECTION_NAMES.map((collection) => [collection, []]),
  ) as unknown as DataSnapshot;
}
