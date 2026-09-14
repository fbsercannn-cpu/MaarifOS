import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { DOCUMENT_VERSION_MAX_BYTES, DOCUMENT_VERSION_SETTING_TYPE, isDocumentVersionRecord, type DocumentVersionRecord } from "../../core/domain/document-history.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { BrowserFileDownload } from "./browser-file-download.ts";
import type { PdfPreviewSelection } from "./pdf-preview-model.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";

export interface DocumentHistoryContext { readonly store: LocalDataStore; readonly scope: ActiveClassroomScope; }
export const DOCUMENT_HISTORY_CHANGED_EVENT = "maarif-document-history-changed";
const scoped = (record: DocumentVersionRecord, scope: ActiveClassroomScope) => record.academicYearId === scope.academicYearId && record.classroomId === scope.classroomId && !record.deletedAt;
async function hash(bytes: Uint8Array): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer))].map(v => v.toString(16).padStart(2, "0")).join(""); }
export async function listDocumentVersions(context: DocumentHistoryContext): Promise<DocumentVersionRecord[]> {
  const snapshot = await context.store.readSnapshot();
  return snapshot.settings.filter(isDocumentVersionRecord).filter(r => scoped(r, context.scope)).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
export async function saveDocumentVersion(context: DocumentHistoryContext, input: { file: BrowserFileDownload; title: string; selection: PdfPreviewSelection; assertCurrent?: () => Promise<void>; now?: Date }): Promise<DocumentVersionRecord> {
  const bytes = input.file.bytes.slice();
  if (input.file.mimeType !== "application/pdf" || bytes.length > DOCUMENT_VERSION_MAX_BYTES || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Belge geçmişi PDF başına en fazla 2 MB saklar.");
  const sha256 = await hash(bytes);
  const selection = JSON.parse(JSON.stringify(input.selection));
  const revisionKey = await hash(new TextEncoder().encode(JSON.stringify([context.scope, input.title, selection, sha256])));
  let binary = ""; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const now = input.now ?? new Date();
  const record: DocumentVersionRecord = { id: crypto.randomUUID(), createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: civilDateInIstanbul(now), schemaVersion: 1, settingType: DOCUMENT_VERSION_SETTING_TYPE, ...context.scope, studentIds: selection.studentIds ?? [], revisionKey, title: input.title, selection, fileName: input.file.fileName, mimeType: "application/pdf", byteLength: bytes.length, contentBase64: btoa(binary), sha256 };
  if (!isDocumentVersionRecord(record)) throw new Error("Belge sürümü doğrulanamadı.");
  await input.assertCurrent?.();
  const saved = await context.store.transaction("readwrite", ["settings", "students", "classrooms", "academicYears"], async tx => {
    const settings = await tx.getAll("settings");
    const existing = settings.filter(isDocumentVersionRecord).filter(r => scoped(r, context.scope));
    const duplicate = existing.find(r => r.revisionKey === revisionKey); if (duplicate) return duplicate;
    const classrooms = await tx.getAll("classrooms"), years = await tx.getAll("academicYears"), students = await tx.getAll("students");
    if (!classrooms.some(r => r.id === context.scope.classroomId && !r.deletedAt) || !years.some(r => r.id === context.scope.academicYearId && !r.deletedAt)
      || record.studentIds.some(id => !students.some(r => r.id === id && !r.deletedAt))) throw new Error("Belgenin sınıfı veya öğrencisi değişti. Güncel kaynağı açın.");
    if (existing.length >= 20 || existing.reduce((sum, r) => sum + r.byteLength, 0) + bytes.length > 10 * 1024 * 1024) throw new Error("Belge geçmişi sınırı doldu: sınıf başına 20 sürüm veya 10 MB. Önceki sürümler korunuyor.");
    await tx.putMany("settings", [record]); return record;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DOCUMENT_HISTORY_CHANGED_EVENT));
  return saved;
}
export async function documentVersionFile(record: DocumentVersionRecord): Promise<BrowserFileDownload> {
  if (!isDocumentVersionRecord(record)) throw new Error("Kayıtlı belge sürümü geçersiz.");
  const bytes = Uint8Array.from(atob(record.contentBase64), ch => ch.charCodeAt(0));
  if (bytes.length !== record.byteLength || await hash(bytes) !== record.sha256) throw new Error("Kayıtlı belge bütünlüğü doğrulanamadı.");
  return { bytes, mimeType: record.mimeType, fileName: record.fileName.replace(/\.pdf$/u, `_Surum_${record.createdAt.slice(0, 10)}_${record.id.slice(0, 8)}.pdf`) };
}
export async function assertDocumentHistoryIntegrity(snapshot: DataSnapshot): Promise<void> {
  for (const record of snapshot.settings.filter(r => r.settingType === DOCUMENT_VERSION_SETTING_TYPE)) {
    if (!isDocumentVersionRecord(record)) throw new Error("Belge geçmişi kayıt sözleşmesi geçersiz.");
    await documentVersionFile(record);
  }
}
