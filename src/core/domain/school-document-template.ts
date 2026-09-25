import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";

export const SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE = "school-document-template-v1" as const;
export const SCHOOL_DOCUMENT_TEMPLATE_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export const SCHOOL_DOCUMENT_LOGO_MAX_BYTES = 256 * 1024;
export type SchoolDocumentLogo = { dataUrl: string; width: number; height: number };
export type SchoolDocumentTemplate = {
  layout: "official" | "simple";
  headerLines: string[];
  logo: SchoolDocumentLogo | null;
  signatureLayout: "teacher-right" | "teacher-left" | "teacher-and-principal";
  principalName: string;
  orientation: "auto" | "portrait" | "landscape";
};
export type SchoolDocumentTemplateRecord = StoredRecord & {
  settingType: typeof SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE;
  academicYearId: string; classroomId: string; studentId: null;
  schemaVersion: 1; deletedAt: null;
  workflow: { kind: "template-set"; previousEventId: string | null; template: SchoolDocumentTemplate };
};
export const DEFAULT_SCHOOL_DOCUMENT_TEMPLATE: Readonly<SchoolDocumentTemplate> = Object.freeze({
  layout: "official", headerLines: [], logo: null, signatureLayout: "teacher-right", principalName: "", orientation: "auto",
});
type Scope = { academicYearId: string; classroomId: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const line = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && v === v.normalize("NFC").trim() && !/[\u0000-\u001f\u007f]/u.test(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;

/** Checks the encoded raster dimensions too: a claimed small size cannot hide a huge image. */
export function schoolDocumentLogoDimensions(dataUrl: unknown): { width: number; height: number } | null {
  if (typeof dataUrl !== "string" || dataUrl.length > Math.ceil(SCHOOL_DOCUMENT_LOGO_MAX_BYTES / 3) * 4 + 30) return null;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/u.exec(dataUrl);
  if (!match || match[2]!.length % 4 !== 0) return null;
  try {
    const raw = atob(match[2]!);
    if (raw.length > SCHOOL_DOCUMENT_LOGO_MAX_BYTES || btoa(raw) !== match[2]) return null;
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    let width = 0, height = 0;
    if (match[1] === "png") {
      if (bytes.length < 33 || [137,80,78,71,13,10,26,10].some((b,i) => bytes[i] !== b) || view.getUint32(8) !== 13 || raw.slice(12,16) !== "IHDR") return null;
      width = view.getUint32(16); height = view.getUint32(20);
    } else {
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return null;
      let offset = 2;
      while (offset + 4 <= bytes.length) {
        if (bytes[offset++] !== 255) return null;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++]!;
        if (marker === 218 || marker === 217) break;
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) return null;
        if ([192,193,194].includes(marker)) {
          if (length < 8) return null;
          height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
        }
        offset += length;
      }
    }
    return width > 0 && height > 0 && width <= 1024 && height <= 1024 ? { width, height } : null;
  } catch { return null; }
}
export function isSchoolDocumentTemplate(v: unknown): v is SchoolDocumentTemplate {
  if (!object(v) || !keys(v, ["layout", "headerLines", "logo", "signatureLayout", "principalName", "orientation"])) return false;
  if (!["official", "simple"].includes(String(v.layout)) || !["auto", "portrait", "landscape"].includes(String(v.orientation)) || !["teacher-right", "teacher-left", "teacher-and-principal"].includes(String(v.signatureLayout)) || !line(v.principalName, 160)) return false;
  if (!Array.isArray(v.headerLines) || v.headerLines.length > 3 || !v.headerLines.every(s => line(s, 160) && s.length > 0)) return false;
  if (v.logo === null) return true;
  if (!object(v.logo) || !keys(v.logo, ["dataUrl", "width", "height"])) return false;
  const dimensions = schoolDocumentLogoDimensions(v.logo.dataUrl);
  return !!dimensions && dimensions.width === v.logo.width && dimensions.height === v.logo.height;
}
export function isSchoolDocumentTemplateRecord(v: unknown): v is SchoolDocumentTemplateRecord {
  if (!object(v) || !keys(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...SCHOOL_DOCUMENT_TEMPLATE_KEYS]) || !id(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !isCivilDate(String(v.civilDate)) || String(v.civilDate) > civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE || !id(v.academicYearId) || !id(v.classroomId) || v.studentId !== null) return false;
  const w = v.workflow;
  return object(w) && keys(w, ["kind", "previousEventId", "template"]) && w.kind === "template-set" && (w.previousEventId === null || id(w.previousEventId)) && isSchoolDocumentTemplate(w.template);
}
export function schoolDocumentTemplateRecords(snapshot: Pick<DataSnapshot, "settings">, scope?: Scope): SchoolDocumentTemplateRecord[] {
  return snapshot.settings.filter(isSchoolDocumentTemplateRecord).filter(r => !scope || r.academicYearId === scope.academicYearId && r.classroomId === scope.classroomId).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function activeSchoolDocumentTemplate(snapshot: Pick<DataSnapshot, "settings">, scope: Scope): SchoolDocumentTemplate {
  return structuredClone(schoolDocumentTemplateRecords(snapshot, scope).at(-1)?.workflow.template ?? DEFAULT_SCHOOL_DOCUMENT_TEMPLATE);
}
export function assertSchoolDocumentTemplateRelationships(snapshot: DataSnapshot): void {
  const source = snapshot.settings.filter(r => r.settingType === SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE);
  if (source.some(r => !isSchoolDocumentTemplateRecord(r))) throw new Error("Okul belge şablonu kaydı geçersiz.");
  const heads = new Map<string, SchoolDocumentTemplateRecord>();
  for (const record of schoolDocumentTemplateRecords(snapshot)) {
    const year = snapshot.academicYears.find(r => r.id === record.academicYearId && typeof r.deletedAt !== "string");
    const classroom = snapshot.classrooms.find(r => r.id === record.classroomId && typeof r.deletedAt !== "string");
    if (!year || !classroom || classroom.academicYearId !== year.id) throw new Error("Okul şablonunun sınıf ve eğitim yılı ilişkisi geçersiz.");
    const key = `${year.id}/${classroom.id}`, previous = heads.get(key);
    if (record.workflow.previousEventId !== (previous?.id ?? null) || previous && record.createdAt <= previous.createdAt) throw new Error("Okul şablonu sürüm zinciri eksik veya çakışıyor.");
    heads.set(key, record);
  }
}
