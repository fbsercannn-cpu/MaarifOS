import * as XLSX from "xlsx";
import { isCivilDate } from "../../core/domain/attendance.ts";
import type { StudentHomeAddressParts } from "../../core/domain/student-home-address.ts";
import { normalizeStudentProfile, normalizeTurkishSearchText, splitStudentDisplayName, type StudentProfileInput, type StudentProfile } from "../../core/domain/student.ts";

export const IMPORT_FIELDS = {
  optionalCode: "Öğrenci numarası", displayName: "Öğrenci adı soyadı", nationalIdentityNumber: "T.C. kimlik numarası", birthDate: "Doğum tarihi",
  motherName: "Anne adı soyadı", motherPhone: "Anne telefonu", motherOccupation: "Anne mesleği",
  fatherName: "Baba adı soyadı", fatherPhone: "Baba telefonu", fatherOccupation: "Baba mesleği",
  otherName: "3. kişi adı soyadı", otherPhone: "3. kişi telefonu", otherRelationship: "3. kişi yakınlığı / ünvanı",
  homeAddress: "Ev adresi", childPrivateNotes: "Çocuğa özel bilgi notu", familySituationNotes: "Aile durumu açıklaması", enrollmentYear: "Okula kayıt yılı",
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;
export type ImportMapping = Partial<Record<ImportField, number>>;
export type ImportValues = Record<ImportField, string>;
export interface ImportSheet { name: string; rows: string[][]; suggestedHeader: number; suggestedMapping: ImportMapping; }
export interface ImportCandidate { id: string; sourceRow: number; values: ImportValues; homeAddressParts?: StudentHomeAddressParts; }
export interface ImportExistingStudent { id: string; name: string; birthDate?: string; nationalIdentityNumber?: string; optionalCode?: string; }
export interface ImportReview { candidate: ImportCandidate; profile?: StudentProfile; errors: string[]; warnings: string[]; duplicateIds: string[]; flag?: "_MUKERRER_INCELE"; }
export const IMPORT_LIMITS = { bytes: 10 * 1024 * 1024, rows: 1000, columns: 80, sheets: 20 } as const;

const compact = (value: string) => normalizeTurkishSearchText(value).replace(/[^a-z0-9]/g, "");
function guessField(header: string, group: string): ImportField | undefined {
  const h = compact(header), g = compact(group);
  const parent = h.includes("anne") || g.includes("annenin") ? "mother" : h.includes("baba") || g.includes("babanin") ? "father" : h.includes("3kisi") || h.includes("ucuncu") || g.includes("3kisi") ? "other" : null;
  if (h.includes("adres")) return "homeAddress";
  if (h.includes("ozelbilgi") || h.includes("ozelnot")) return "childPrivateNotes";
  if (h.includes("ailedurumu")) return "familySituationNotes";
  if (h.includes("kayityil")) return "enrollmentYear";
  if (h.includes("dogum")) return "birthDate";
  if (h.includes("kimlik") || h === "tckn") return "nationalIdentityNumber";
  if (["no", "numara", "ogrencino", "okulno", "ogrencinumarasi"].includes(h)) return "optionalCode";
  if (parent) {
    if (h.includes("tel") || h.includes("cep")) return `${parent}Phone`;
    if (h.includes("mesle") && parent !== "other") return `${parent}Occupation`;
    if ((h.includes("yakin") || h.includes("unvan")) && parent === "other") return "otherRelationship";
    if (h.includes("ad") || h === "anne" || h === "baba") return `${parent}Name`;
  }
  if (["adisoyadi", "adsoyad", "ogrenciadisoyadi", "ogrencininadisoyadi", "cocugunadisoyadi", "ogrenci"].includes(h)) return "displayName";
  return undefined;
}

export function suggestImportMapping(rows: readonly string[][], headerRow: number): ImportMapping {
  const headers = rows[headerRow] ?? [];
  const parentRow = rows[headerRow - 1] ?? [];
  let group = "";
  const mapping: ImportMapping = {};
  headers.forEach((header, index) => {
    if (parentRow[index]?.trim()) group = parentRow[index];
    const key = guessField(header, group);
    if (key && mapping[key] === undefined) mapping[key] = index;
  });
  return mapping;
}

export function readStudentWorkbook(bytes: ArrayBuffer, filename: string): ImportSheet[] {
  if (!/\.(xls|xlsx|csv|tsv)$/i.test(filename)) throw new Error("Excel (.xls, .xlsx), CSV veya TSV dosyası seçin.");
  if (bytes.byteLength === 0 || bytes.byteLength > IMPORT_LIMITS.bytes) throw new Error("Dosya boş veya 10 MB sınırından büyük.");
  let workbook: XLSX.WorkBook;
  try {
    let input: ArrayBuffer | string = bytes;
    const textFile = /\.(csv|tsv)$/i.test(filename);
    if (textFile) {
      try { input = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { input = new TextDecoder("windows-1254").decode(bytes); }
    }
    workbook = XLSX.read(input, { type: textFile ? "string" : "array", raw: textFile, cellDates: false, cellFormula: false, cellHTML: false, sheetRows: IMPORT_LIMITS.rows + 31 });
  }
  catch { throw new Error("Dosya okunamadı. Şifreli veya bozuk dosyayı Excel'de açıp yeniden kaydedin."); }
  if (workbook.SheetNames.length > IMPORT_LIMITS.sheets) throw new Error("Dosyada en fazla 20 çalışma sayfası olabilir.");
  const sheets: ImportSheet[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"]!);
    if (range.e.r > IMPORT_LIMITS.rows + 29 || range.e.c >= IMPORT_LIMITS.columns) throw new Error("Çalışma sayfası 1.000 öğrenci / 80 sütun sınırını aşıyor. Daha küçük bir dosya seçin.");
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true, range: 0 });
    // Excel date serials use workbook's own date system; never guess US day/month order.
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const cell = sheet[address];
      if (cell.t === "n" && cell.w && /[./-]/.test(cell.w) && cell.v > 0 && cell.v < 100000) {
        const position = XLSX.utils.decode_cell(address);
        if (/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/.test(cell.w)) {
          const date = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 });
          if (date && rows[position.r]) rows[position.r][position.c] = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
        }
      }
    }
    let suggestedHeader = 0, score = -1;
    rows.slice(0, 20).forEach((_, i) => {
      const mapping = suggestImportMapping(rows, i);
      const next = Object.keys(mapping).length + (mapping.displayName !== undefined ? 10 : 0);
      if (next > score) { score = next; suggestedHeader = i; }
    });
    if (rows.some(row => row.some(value => String(value).trim()))) sheets.push({ name, rows, suggestedHeader, suggestedMapping: suggestImportMapping(rows, suggestedHeader) });
  }
  if (!sheets.length) throw new Error("Dosyada okunabilir bir tablo bulunamadı.");
  return sheets;
}

export function importCandidates(sheet: ImportSheet, header: number, mapping: ImportMapping): { candidates: ImportCandidate[]; excludedRows: number } {
  if (mapping.displayName === undefined) throw new Error("Öğrenci adı soyadı sütununu eşleştirin.");
  const columns = Object.values(mapping);
  if (new Set(columns).size !== columns.length) throw new Error("Bir sütun iki farklı alana eşleştirilemez.");
  const candidates: ImportCandidate[] = [];
  let excludedRows = 0;
  sheet.rows.slice(header + 1).forEach((row, index) => {
    const values = Object.fromEntries(Object.keys(IMPORT_FIELDS).map(field => [field, mapping[field as ImportField] === undefined ? "" : String(row[mapping[field as ImportField]!] ?? "").trim()])) as ImportValues;
    if (![values.displayName, values.optionalCode, values.nationalIdentityNumber, values.birthDate].some(Boolean)) { excludedRows++; return; }
    candidates.push({ id: crypto.randomUUID(), sourceRow: header + index + 2, values });
  });
  if (candidates.length > IMPORT_LIMITS.rows) throw new Error("Bir aktarımda en fazla 1.000 öğrenci eklenebilir.");
  return { candidates, excludedRows };
}

function importBirthDate(value: string): string {
  if (!value || isCivilDate(value)) return value;
  const parts = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value);
  if (parts) return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  return value;
}
export function candidateProfile(candidate: ImportCandidate, civilDate: string): StudentProfile {
  const v = candidate.values;
  const name = splitStudentDisplayName(v.displayName);
  if (!name.firstName || !name.lastName) throw new Error("Öğrencinin adı ve soyadı gerekli.");
  const contacts: NonNullable<StudentProfileInput["contacts"]>[number][] = [];
  for (const kind of ["mother", "father", "other"] as const) {
    const occupation = kind !== "other" ? v[`${kind}Occupation`] : "";
    const contactName = v[`${kind}Name`], phone = v[`${kind}Phone`];
    const relationship = kind === "mother" ? "Anne" : kind === "father" ? "Baba" : v.otherRelationship;
    if (contactName || phone || occupation || (kind === "other" && relationship)) contacts.push({ id: crypto.randomUUID(), kind, name: contactName, phone, occupation, relationship: relationship || "Diğer yakın", isPrimary: !!phone && !contacts.some(contact => contact.isPrimary), isEmergencyContact: false, isAuthorizedPickup: false });
  }
  return normalizeStudentProfile({ displayName: v.displayName, ...name, birthDate: importBirthDate(v.birthDate), optionalCode: v.optionalCode, nationalIdentityNumber: v.nationalIdentityNumber, enrollmentYear: v.enrollmentYear, contacts, careDetails: { homeAddress: v.homeAddress, homeAddressParts: candidate.homeAddressParts, childPrivateNotes: v.childPrivateNotes, familySituationNotes: v.familySituationNotes } }, civilDate);
}
export function duplicateStudentIds(values: ImportValues, existing: readonly ImportExistingStudent[], ownId: string): string[] {
  const name = normalizeTurkishSearchText(values.displayName);
  const nationalIdentityNumber = values.nationalIdentityNumber.trim(), optionalCode = values.optionalCode.trim();
  return existing.filter(student => student.id !== ownId && (
    (nationalIdentityNumber && student.nationalIdentityNumber?.trim() === nationalIdentityNumber) ||
    (name && normalizeTurkishSearchText(student.name) === name) ||
    (optionalCode && student.optionalCode?.trim() === optionalCode)
  )).map(student => student.id);
}
export function importSelectionStillReviewed(review: ImportReview, acknowledgedIds: readonly string[] | undefined): boolean {
  return acknowledgedIds !== undefined && review.errors.length === 0 && review.duplicateIds.every(id => acknowledgedIds.includes(id));
}
export function reviewImportCandidates(candidates: readonly ImportCandidate[], existing: readonly ImportExistingStudent[], civilDate: string): ImportReview[] {
  const all = [...existing, ...candidates.map(candidate => ({ id: candidate.id, name: candidate.values.displayName, nationalIdentityNumber: candidate.values.nationalIdentityNumber, optionalCode: candidate.values.optionalCode }))];
  return candidates.map(candidate => {
    const errors: string[] = [], warnings: string[] = [];
    let profile: StudentProfile | undefined;
    try { profile = candidateProfile(candidate, civilDate); } catch (error) { errors.push(error instanceof Error ? error.message : "Satır doğrulanamadı."); }
    if (!candidate.values.birthDate) warnings.push("Doğum tarihi yok; doğum günü bildirimi üretilemez.");
    if (![candidate.values.motherPhone, candidate.values.fatherPhone, candidate.values.otherPhone].some(Boolean)) warnings.push("İletişim telefonu yok.");
    if (candidate.values.otherName && !candidate.values.otherRelationship) warnings.push("3. kişinin yakınlığı / ünvanı belirtilmemiş.");
    const duplicateIds = duplicateStudentIds(candidate.values, all, candidate.id);
    return { candidate, profile, errors, warnings, duplicateIds, ...(duplicateIds.length ? { flag: "_MUKERRER_INCELE" as const } : {}) };
  });
}
