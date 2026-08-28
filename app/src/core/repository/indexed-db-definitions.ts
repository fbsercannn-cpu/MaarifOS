export const MAARIFOS_DATABASE_VERSION = 7;

export interface IndexedDbMigration {
  toVersion: number;
  description: string;
}

export const INDEXED_DB_MIGRATIONS: readonly IndexedDbMigration[] = [
  {
    toVersion: 1,
    description: "Kanonik veri koleksiyonlarını oluşturur.",
  },
  {
    toVersion: 2,
    description: "Yeni kanonik koleksiyonları kayıp olmadan tamamlar.",
  },
  {
    toVersion: 3,
    description:
      "Kurtarma snapshot deposunu ve sınıf/tarih/öğrenci indekslerini ekler.",
  },
  {
    toVersion: 4,
    description:
      "Eğitim takvimi ile haricî AI geri bildirim koleksiyonlarını ve indekslerini ekler.",
  },
  {
    toVersion: 5,
    description:
      "Öğretmen onaylı değer kanıt bağları koleksiyonunu ve kapsam/kanıt indekslerini ekler.",
  },
  {
    toVersion: 6,
    description:
      "Gözlemleri plan ve gerçek etkinlik ilişkisine göre sorgulayan indeksleri ekler.",
  },
  {
    toVersion: 7,
    description:
      "Öğrenci tam-kayıt v2 kasası için atomik hazır durum deposunu ve eski istemci yazma sınırını ekler.",
  },
] as const;

export interface IndexDefinition {
  name: string;
  keyPath: string | readonly string[];
  options?: IDBIndexParameters;
}

export const SCOPE_INDEX_DEFINITIONS = [
  { name: "by-classroom", keyPath: "classroomId" },
  {
    name: "by-academic-year-classroom",
    keyPath: ["academicYearId", "classroomId"],
  },
] as const satisfies readonly IndexDefinition[];

export const VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS = [
  ...SCOPE_INDEX_DEFINITIONS,
  {
    name: "by-observation",
    keyPath: "observationId",
    options: { unique: false },
  },
  {
    name: "by-student",
    keyPath: "studentId",
    options: { unique: false },
  },
  {
    name: "by-target-key",
    keyPath: [
      "observationId",
      "activityId",
      "targetValueCode",
      "targetIndicatorCode",
    ],
    options: { unique: false },
  },
] as const satisfies readonly IndexDefinition[];

export const OBSERVATION_RELATION_INDEX_DEFINITIONS = [
  { name: "by-plan", keyPath: "planId" },
  { name: "by-activity", keyPath: "activityId" },
] as const satisfies readonly IndexDefinition[];
