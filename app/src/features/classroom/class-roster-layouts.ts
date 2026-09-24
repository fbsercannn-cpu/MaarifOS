import {
  ALL_CLASS_ROSTER_COLUMN_IDS,
  type ClassRosterColumnId,
} from "./class-roster-columns.ts";

export const CLASS_ROSTER_LAYOUT_IDS = [
  "daily-classroom",
  "contact-blocks",
  "detailed-roster",
  "single-page-roster",
] as const;

export type ClassRosterLayoutId = (typeof CLASS_ROSTER_LAYOUT_IDS)[number];

export interface ClassRosterLayoutDefinition {
  readonly id: ClassRosterLayoutId;
  readonly purposeLabel: "Sınıfta kullan" | "İletişim için hazırla" | "Ayrıntılı döküm al" | "Tek sayfa sınıf listesi";
  readonly title: string;
  readonly description: string;
  readonly orientation: "portrait" | "landscape";
  readonly fileSegment: "Gunluk" | "Iletisim" | "Ayrintili" | "Tek_Sayfa";
  readonly defaultColumns: readonly ClassRosterColumnId[];
}

const CONTACT_BLOCK_COLUMNS = [
  "sequence",
  "schoolNumber",
  "name",
  "motherName",
  "motherPhone",
  "motherOccupation",
  "fatherName",
  "fatherPhone",
  "fatherOccupation",
  "otherName",
  "otherPhone",
  "otherRelationship",
  "otherOccupation",
  "priorityContact",
  "emergencyContact",
  "pickupAuthorization",
] as const satisfies readonly ClassRosterColumnId[];

export const CLASS_ROSTER_LAYOUTS: readonly ClassRosterLayoutDefinition[] = Object.freeze([
  Object.freeze({
    id: "daily-classroom",
    purposeLabel: "Sınıfta kullan",
    title: "Günlük sınıf çizelgesi",
    description: "Dikey A4 üzerinde sıra, okul numarası, geniş öğrenci adı ve beş boş işaret alanı.",
    orientation: "portrait",
    fileSegment: "Gunluk",
    defaultColumns: Object.freeze(["sequence", "schoolNumber", "name"] as const),
  }),
  Object.freeze({
    id: "contact-blocks",
    purposeLabel: "İletişim için hazırla",
    title: "Veli iletişim blokları",
    description: "Her öğrenciyi anne, baba ve diğer yakın iletişim bölgeleriyle birlikte tutan yatay A4 düzeni.",
    orientation: "landscape",
    fileSegment: "Iletisim",
    defaultColumns: Object.freeze(CONTACT_BLOCK_COLUMNS),
  }),
  Object.freeze({
    id: "detailed-roster",
    purposeLabel: "Ayrıntılı döküm al",
    title: "Ayrıntılı öğrenci dökümü",
    description: "Seçilen bütün alanları öğrenci bazında etiketli bilgi bloklarında koruyan dikey A4 düzeni.",
    orientation: "portrait",
    fileSegment: "Ayrintili",
    defaultColumns: Object.freeze([...ALL_CLASS_ROSTER_COLUMN_IDS]),
  }),
  Object.freeze({
    id: "single-page-roster",
    purposeLabel: "Tek sayfa sınıf listesi",
    title: "Sınıf öğrenci ve veli listesi",
    description: "Otuz öğrenciye kadar temel öğrenci ve veli iletişim alanlarını tek yatay A4 sayfada gösteren yoğun çizelge.",
    orientation: "landscape",
    fileSegment: "Tek_Sayfa",
    defaultColumns: Object.freeze([
      "sequence",
      "name",
      "nationalId",
      "motherName",
      "motherOccupation",
      "motherPhone",
      "fatherName",
      "fatherOccupation",
      "fatherPhone",
      "otherName",
      "otherRelationship",
      "otherPhone",
    ] as const),
  }),
]);

export function isClassRosterLayoutId(value: unknown): value is ClassRosterLayoutId {
  return typeof value === "string" && CLASS_ROSTER_LAYOUT_IDS.includes(value as ClassRosterLayoutId);
}

export function resolveClassRosterLayout(layout: ClassRosterLayoutId): ClassRosterLayoutDefinition {
  const definition = CLASS_ROSTER_LAYOUTS.find((candidate) => candidate.id === layout);
  if (!definition) throw new Error("Geçerli bir sınıf listesi kullanım amacı seçin.");
  return definition;
}

/** A purpose click starts from its deliberate field preset; later layout switches may keep the user's fields. */
export function classRosterInputForPurpose<
  Input extends object,
>(
  input: Input,
  layout: ClassRosterLayoutId,
  options: Readonly<{ preserveSelectedColumns?: boolean }> = {},
): Input & Readonly<{ layout: ClassRosterLayoutId; columns: readonly ClassRosterColumnId[] }> {
  const definition = resolveClassRosterLayout(layout);
  const selectedColumns = "columns" in input
    ? (input as Readonly<{ columns?: readonly ClassRosterColumnId[] }>).columns
    : undefined;
  return {
    ...input,
    layout,
    columns: options.preserveSelectedColumns && selectedColumns
      ? [...selectedColumns]
      : [...definition.defaultColumns],
  };
}
