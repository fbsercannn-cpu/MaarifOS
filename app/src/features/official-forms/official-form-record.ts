import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { isStudentPrivacyDeletionRepository, type LocalDataStore } from "../../core/repository/contracts.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { isUuid } from "../evidence/local-teacher-identity.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";

export const OFFICIAL_FORM_SETTING_TYPE = "official-form-draft-v1" as const;
export const OFFICIAL_FORM_LEGACY_TYPE = "official-form-legacy-v1" as const;
export const OFFICIAL_FORM_KEYS = ["formId", "period", "ageBand", "studentIds", "revision", "formValues", "legacyKey", "legacyJson", "legacySha256", "reviewStatus"] as const;
export type FormValue = string | number | boolean | null | FormValue[] | { [key: string]: FormValue };
export interface OfficialFormScope { classroomId: string; academicYearId: string; studentIds: string[]; period: string; ageBand: string }
export interface OfficialFormRecord extends StoredRecord, OfficialFormScope {
  settingType: typeof OFFICIAL_FORM_SETTING_TYPE;
  formId: string;
  revision: number;
  formValues: Record<string, FormValue>;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const utc = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function isFormValue(v: unknown, depth = 0): v is FormValue {
  if (depth > 30) return false;
  if (v === null || typeof v === "boolean" || typeof v === "string") return typeof v !== "string" || v.length <= 250000;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length <= 10000 && v.every(item => isFormValue(item, depth + 1));
  return object(v) && Object.keys(v).length <= 10000 && Object.entries(v).every(([key, value]) => !["__proto__", "constructor", "prototype"].includes(key) && isFormValue(value, depth + 1));
}
export function isOfficialFormRecord(v: unknown): v is OfficialFormRecord {
  if (!object(v) || v.settingType !== OFFICIAL_FORM_SETTING_TYPE) return false;
  const keys = ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", "settingType", "classroomId", "academicYearId", "studentIds", "formId", "period", "ageBand", "revision", "formValues"];
  return Object.keys(v).every(k => keys.includes(k)) && keys.every(k => k in v) && isUuid(v.id) && isUuid(v.classroomId) && isUuid(v.academicYearId)
    && utc(v.createdAt) && utc(v.updatedAt) && v.createdAt <= v.updatedAt && isCivilDate(v.civilDate) && v.schemaVersion === 1 && v.deletedAt === null
    && typeof v.formId === "string" && /^[a-z][a-z0-9_-]{0,79}$/.test(v.formId)
    && typeof v.period === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.period) && isCivilDate(v.period)
    && typeof v.ageBand === "string" && ["", "36-48", "48-60", "60-72"].includes(v.ageBand)
    && Number.isSafeInteger(v.revision) && Number(v.revision) >= 1 && Array.isArray(v.studentIds) && v.studentIds.every(isUuid) && new Set(v.studentIds).size === v.studentIds.length
    && object(v.formValues) && isFormValue(v.formValues);
}
export function isOfficialFormLegacyRecord(v: unknown): v is StoredRecord {
  const keys = ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", "settingType", "legacyKey", "legacyJson", "legacySha256", "reviewStatus"];
  return object(v) && Object.keys(v).every(k => keys.includes(k)) && keys.every(k => k in v) && v.settingType === OFFICIAL_FORM_LEGACY_TYPE && isUuid(v.id) && utc(v.createdAt) && utc(v.updatedAt) && isCivilDate(v.civilDate)
    && v.schemaVersion === 1 && v.deletedAt === null && typeof v.legacyKey === "string" && LEGACY_FORM_KEYS.includes(v.legacyKey)
    && typeof v.legacyJson === "string" && typeof v.legacySha256 === "string" && /^[a-f0-9]{64}$/.test(v.legacySha256) && v.reviewStatus === "unassigned-source-preserved";
}
export function sameOfficialFormScope(a: OfficialFormScope, b: OfficialFormScope): boolean {
  return a.classroomId === b.classroomId && a.academicYearId === b.academicYearId && a.period === b.period && a.ageBand === b.ageBand
    && canonicalJson([...a.studentIds].sort()) === canonicalJson([...b.studentIds].sort());
}
export function assertOfficialFormRelationships(snapshot: DataSnapshot): void {
  const seen = new Set<string>();
  for (const record of snapshot.settings.filter(r => r.settingType === OFFICIAL_FORM_SETTING_TYPE)) {
    if (!isOfficialFormRecord(record)) throw new Error("Form kaydı doğrulanamadı.");
    const key = canonicalJson([record.formId, record.classroomId, record.academicYearId, record.period, record.ageBand, [...record.studentIds].sort()]);
    if (seen.has(key)) throw new Error("Aynı kapsamda birden fazla resmî form kaydı var.");
    seen.add(key);
    const classroom = snapshot.classrooms.find(r => r.id === record.classroomId);
    if (!classroom || classroom.academicYearId !== record.academicYearId || !snapshot.academicYears.some(r => r.id === record.academicYearId)) throw new Error("Formun sınıf ve eğitim yılı bağı geçersiz.");
    for (const id of record.studentIds) {
      const child = snapshot.students.find(r => r.id === id);
      const historical = child && Array.isArray(child.enrollments) && child.enrollments.some(e => object(e) && e.classroomId === record.classroomId && e.academicYearId === record.academicYearId);
      if (!child || ((child.classroomId !== record.classroomId || child.academicYearId !== record.academicYearId) && !historical)) throw new Error("Form başka bir çocuğun veya sınıfın kaydını içeriyor.");
    }
  }
  if (snapshot.settings.some(r => r.settingType === OFFICIAL_FORM_LEGACY_TYPE && !isOfficialFormLegacyRecord(r))) throw new Error("Eski form arşivi doğrulanamadı.");
}
export async function saveOfficialForm(store: LocalDataStore, formId: string, scope: OfficialFormScope, formValues: Record<string, FormValue>, expectedRevision: number): Promise<OfficialFormRecord> {
  return store.transaction("readwrite", ["settings", "classrooms", "academicYears", "students"], async tx => {
    const settings = await tx.getAll("settings");
    const found = settings.filter(isOfficialFormRecord).filter(r => r.formId === formId && sameOfficialFormScope(r, scope));
    if (found.length > 1) throw new Error("Aynı kapsamda birden fazla form bulundu; hiçbir kayıt ezilmedi.");
    const current = found[0];
    if ((current?.revision ?? 0) !== expectedRevision) throw new Error("Form başka bir sekmede değişti. Kaydetmeden önce son kaydı yeniden açın.");
    const students = await tx.getAll("students");
    const classrooms = await tx.getAll("classrooms");
    const years = await tx.getAll("academicYears");
    if (!classrooms.some(c => c.id === scope.classroomId && c.academicYearId === scope.academicYearId && !c.deletedAt) || !years.some(y => y.id === scope.academicYearId && !y.deletedAt)) throw new Error("Formun etkin sınıfı bulunamadı.");
    if (scope.studentIds.some(id => !students.some(s => s.id === id && s.classroomId === scope.classroomId && s.academicYearId === scope.academicYearId && !s.deletedAt))) throw new Error("Seçilen çocuk artık bu sınıfta değil. Form kaydedilmedi.");
    const now = new Date();
    const record: OfficialFormRecord = { id: current?.id ?? crypto.randomUUID(), createdAt: current?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(), civilDate: civilDateInIstanbul(now), schemaVersion: 1, deletedAt: null, settingType: OFFICIAL_FORM_SETTING_TYPE, ...scope, studentIds: [...scope.studentIds], formId, revision: expectedRevision + 1, formValues: structuredClone(formValues) };
    if (!isOfficialFormRecord(record)) throw new Error("Form alanları kayıt sözleşmesine uymuyor.");
    await tx.putMany("settings", [record]);
    return record;
  });
}
export const LEGACY_FORM_KEYS = ["maarif_portfolio_items", "maarif_term_reports_data", "maarif_term_opinions_data", "maarif_weekly_newsletters", "maarif_ek15_matrix_60_72"];
/** Preserve exact bytes in the encrypted store. Never infer a real child from a legacy name. */
export async function migrateLegacyOfficialForms(store: LocalDataStore, storage: Pick<Storage, "getItem" | "removeItem">): Promise<number> {
  let migrated = 0;
  for (const legacyKey of LEGACY_FORM_KEYS) {
    const legacyJson = storage.getItem(legacyKey);
    if (legacyJson === null) continue;
    const legacySha256 = await sha256Hex(legacyJson);
    await store.transaction("readwrite", ["settings"], async tx => {
      const existing = (await tx.getAll("settings")).find(r => r.settingType === OFFICIAL_FORM_LEGACY_TYPE && r.legacyKey === legacyKey && r.legacySha256 === legacySha256);
      if (existing) return;
      const now = new Date();
      await tx.putMany("settings", [{ id: crypto.randomUUID(), settingType: OFFICIAL_FORM_LEGACY_TYPE, schemaVersion: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: civilDateInIstanbul(now), deletedAt: null, legacyKey, legacyJson, legacySha256, reviewStatus: "unassigned-source-preserved" }]);
    });
    const verified = (await store.readSnapshot()).settings.find(r => r.settingType === OFFICIAL_FORM_LEGACY_TYPE && r.legacyKey === legacyKey && r.legacySha256 === legacySha256);
    if (!verified || verified.legacyJson !== legacyJson || await sha256Hex(String(verified.legacyJson)) !== legacySha256) throw new Error("Eski form kaydı kasada doğrulanamadı; kaynak korundu.");
    if (storage.getItem(legacyKey) !== legacyJson) throw new Error("Eski form aktarım sırasında değişti; kaynak korundu.");
    storage.removeItem(legacyKey);
    migrated++;
  }
  return migrated;
}

export async function assertOfficialLegacyIntegrity(snapshot: DataSnapshot): Promise<void> {
  for (const record of snapshot.settings.filter(r => r.settingType === OFFICIAL_FORM_LEGACY_TYPE)) {
    if (!isOfficialFormLegacyRecord(record) || await sha256Hex(String(record.legacyJson)) !== record.legacySha256) throw new Error("Eski form arşivinin içerik özeti uyuşmuyor.");
  }
}
export function assertNoUnresolvedLegacyForms(snapshot: DataSnapshot, storage?: Pick<Storage, "getItem">): void {
  if (snapshot.settings.some(r => r.settingType === OFFICIAL_FORM_LEGACY_TYPE) || LEGACY_FORM_KEYS.some(key => storage?.getItem(key) !== null && storage?.getItem(key) !== undefined)) {
    throw new Error("Çocuk kalıcı silinmeden önce Resmî Formlar alanındaki eski form arşivini inceleyin. Eski kaynakların çocuk kimlikleri bilinmediği için silme kapsamı doğrulanamıyor.");
  }
}
/** Explicit user-confirmed archive erasure also purges its recovery copies atomically. */
export async function eraseOfficialLegacyArchive(store: LocalDataStore, id: string, expectedHash: string): Promise<void> {
  if (!isStudentPrivacyDeletionRepository(store)) throw new Error("Arşiv temizliği kurtarma kopyalarını da atomik temizleyebilen kasa gerektirir.");
  await store.transactionWithStudentRecoveryPurge(id, async tx => {
    const records = await tx.getAll("settings");
    const archive = records.find(r => r.id === id);
    if (!archive || !isOfficialFormLegacyRecord(archive) || archive.legacySha256 !== expectedHash || await sha256Hex(String(archive.legacyJson)) !== expectedHash) throw new Error("Arşiv değişti; incelemeyi yenileyin.");
    await tx.clear("settings");
    await tx.putMany("settings", records.filter(r => r.id !== id));
  });
}
/** Preserve the other children's rows in class-wide forms during explicit child erasure. */
export function redactOfficialFormsForStudent(snapshot: DataSnapshot, studentId: string, timestamp: string): OfficialFormRecord[] {
  const remove = (value: FormValue): FormValue | undefined => {
    if (value === studentId) return undefined;
    if (Array.isArray(value)) return value.map(remove).filter((v): v is FormValue => v !== undefined);
    if (value && typeof value === "object") {
      if (value.id === studentId || value.studentId === studentId) return undefined;
      return Object.fromEntries(Object.entries(value).filter(([key]) => key !== studentId).flatMap(([key, item]) => {
        const cleaned = remove(item); return cleaned === undefined ? [] : [[key, cleaned]];
      }));
    }
    return value;
  };
  return snapshot.settings.filter(isOfficialFormRecord).filter(record => !record.studentIds.includes(studentId)).map(record => {
    const formValues = remove(record.formValues) as Record<string, FormValue>;
    return canonicalJson(formValues) === canonicalJson(record.formValues) ? record : { ...record, formValues, revision: record.revision + 1, updatedAt: timestamp };
  });
}

export function officialFormPeriod(formId: string, civilDate: string, academicYearStart: string): string {
  if (!isCivilDate(civilDate) || !isCivilDate(academicYearStart)) throw new Error("Geçerli kayıt tarihi seçin.");
  return formId === "checklist" ? academicYearStart : ["monthly", "monthly_evaluation"].includes(formId) ? civilDate.slice(0, 7) + "-01" : civilDate;
}
