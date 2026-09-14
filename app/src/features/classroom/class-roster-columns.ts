export const CLASS_ROSTER_COLUMNS = Object.freeze([
  { id: "sequence", label: "Sıra numarası", group: "Öğrenci" },
  { id: "schoolNumber", label: "Okul numarası", group: "Öğrenci" },
  { id: "name", label: "Adı soyadı", group: "Öğrenci" },
  { id: "nationalId", label: "T.C. kimlik numarası", group: "Öğrenci" },
  { id: "birthDate", label: "Doğum tarihi", group: "Öğrenci" },
  { id: "enrollmentYear", label: "Kayıt yılı", group: "Öğrenci" },
  { id: "motherName", label: "Anne adı soyadı", group: "Anne" },
  { id: "motherPhone", label: "Anne telefonu", group: "Anne" },
  { id: "motherOccupation", label: "Anne mesleği", group: "Anne" },
  { id: "fatherName", label: "Baba adı soyadı", group: "Baba" },
  { id: "fatherPhone", label: "Baba telefonu", group: "Baba" },
  { id: "fatherOccupation", label: "Baba mesleği", group: "Baba" },
  { id: "otherName", label: "3. kişi adı soyadı", group: "Diğer yakınlar" },
  { id: "otherPhone", label: "3. kişi telefonu", group: "Diğer yakınlar" },
  { id: "otherRelationship", label: "3. kişi yakınlığı / ünvanı", group: "Diğer yakınlar" },
  { id: "otherOccupation", label: "3. kişi mesleği", group: "Diğer yakınlar" },
  { id: "priorityContact", label: "Öncelikli iletişim (kişinin rolü)", group: "İletişim ve adres" },
  { id: "emergencyContact", label: "Acil iletişim (kişinin rolü)", group: "İletişim ve adres" },
  { id: "pickupAuthorization", label: "Teslim yetkilisi (kişinin rolü)", group: "İletişim ve adres" },
  { id: "address", label: "Ev adresi", group: "İletişim ve adres" },
] as const);

export type ClassRosterColumnId = (typeof CLASS_ROSTER_COLUMNS)[number]["id"];
export type ClassRosterColumn = (typeof CLASS_ROSTER_COLUMNS)[number];
export const ALL_CLASS_ROSTER_COLUMN_IDS: readonly ClassRosterColumnId[] = Object.freeze(CLASS_ROSTER_COLUMNS.map(column => column.id));
export const DEFAULT_CLASS_ROSTER_COLUMN_IDS = ALL_CLASS_ROSTER_COLUMN_IDS;
export const CLASS_ROSTER_IDENTITY_COLUMN_IDS = ["schoolNumber", "birthDate", "nationalId", "enrollmentYear"] as const satisfies readonly ClassRosterColumnId[];
export const CLASS_ROSTER_PRESETS = Object.freeze([
  { id: "names", label: "Ad listesi", fields: ["sequence", "name"] },
  { id: "contact", label: "Kısa iletişim", fields: ["sequence", "name", "motherName", "motherPhone", "fatherName", "fatherPhone", "otherName", "otherPhone", "otherRelationship", "priorityContact", "emergencyContact"] },
  { id: "full", label: "Tam kayıt", fields: ALL_CLASS_ROSTER_COLUMN_IDS },
] as const);
const identityColumns = new Set<ClassRosterColumnId>(["sequence", "schoolNumber", "name", "nationalId", "birthDate", "enrollmentYear"]);

/** Explicit granular selection wins; legacy groups remain accepted at the input boundary. */
export function resolveClassRosterColumns(columns?: readonly ClassRosterColumnId[], legacyFields?: readonly string[]): readonly ClassRosterColumn[] {
  if (columns !== undefined) {
    if (!Array.isArray(columns) || !columns.length || columns.some(id => !ALL_CLASS_ROSTER_COLUMN_IDS.includes(id)) || new Set(columns).size !== columns.length) {
      throw new Error("En az bir geçerli sınıf listesi alanı seçin; alanlar tekrarlanamaz.");
    }
    return CLASS_ROSTER_COLUMNS.filter(column => columns.includes(column.id));
  }
  if (legacyFields === undefined) return CLASS_ROSTER_COLUMNS;
  if (!Array.isArray(legacyFields) || !legacyFields.length || legacyFields.some(field => !["identity", "contacts", "address", "care"].includes(field)) || new Set(legacyFields).size !== legacyFields.length) {
    throw new Error("En az bir geçerli belge alanı seçin.");
  }
  // Legacy contact/address exports always included student identity context.
  return CLASS_ROSTER_COLUMNS.filter(column => column.id === "sequence" || column.id === "name"
    || (identityColumns.has(column.id) ? legacyFields.includes("identity")
      : column.id === "address" ? legacyFields.includes("address") : legacyFields.includes("contacts")));
}
