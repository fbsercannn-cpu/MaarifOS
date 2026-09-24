import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { loadTeacherOwnedPlanGraph } from "../planning/teacher-owned-plan-service.ts";
import { createBinaryZip } from "./binary-zip.ts";
import { isDocumentVersionRecord } from "../../core/domain/document-history.ts";
import { documentVersionFile } from "./document-history-service.ts";
import type { SemanticTaggedPdfRuntime } from "./semantic-tagged-pdf.ts";

export interface MonthPackageItem { id: string; title: string; kind: "plan" | "evaluation" | "saved"; planId: string }
export interface MonthPackageInventory {
  month: string;
  revision: string;
  items: MonthPackageItem[];
  missing: string[];
}
function sourceRevision(snapshot: DataSnapshot): string {
  return JSON.stringify({ ...snapshot, auditLogs: [] });
}
export async function loadMonthPackageInventory(store: LocalDataStore, month: string): Promise<MonthPackageInventory> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Geçerli bir ay seçin.");
  const before = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(before);
  if (!scope) throw new Error("Ay sonu dosyası için sınıfınızı hazırlayın.");
  const graph = await loadTeacherOwnedPlanGraph(store);
  const selected = graph?.months.find(entry => entry.monthly.monthKey === month);
  const items: MonthPackageItem[] = [];
  const missing: string[] = [];
  if (selected) {
    items.push({ id: `plan:${selected.monthly.id}`, title: `${month} aylık planı ve bağlı haftalık/günlük planlar`, kind: "plan", planId: selected.monthly.id });
    if (selected.monthly.monthlyEvaluations?.length) {
      try {
        const evaluation = await import("../planning/teacher-owned-monthly-evaluation-export.ts");
        const source = await evaluation.loadTeacherOwnedMonthlyEvaluationExportSource(store, selected.monthly.id);
        evaluation.prepareTeacherOwnedMonthlyEvaluationExportDocument(source, { kind: "latest" }, "pdf");
        items.push({ id: `evaluation:${selected.monthly.id}`, title: "Aylık değerlendirme · Ek 18", kind: "evaluation", planId: selected.monthly.id });
      } catch { missing.push("Aylık değerlendirmeyi incele ve tamamla"); }
    } else missing.push("Aylık değerlendirmeyi tamamla");
  } else missing.push("Bu ayın planını hazırla");
  for (const record of before.settings.filter(isDocumentVersionRecord)) {
    const belongsToMonth = record.selection.periodStart && record.selection.periodEnd
      ? record.selection.periodStart.slice(0, 7) <= month && record.selection.periodEnd.slice(0, 7) >= month
      : record.civilDate.startsWith(`${month}-`);
    if (!record.deletedAt && record.classroomId === scope.classroomId && record.academicYearId === scope.academicYearId && belongsToMonth) {
      items.push({ id: `saved:${record.id}`, title: `Saklanan sürüm: ${record.title} · ${record.civilDate} · ${record.studentIds.length} öğrenci`, kind: "saved", planId: record.id });
    }
  }
  const after = await store.readSnapshot();
  if (sourceRevision(before) !== sourceRevision(after)) throw new Error("Kayıtlar değişti; listeyi yenileyin.");
  return { month, revision: sourceRevision(after), items, missing };
}

export async function generateMonthEndPackage(store: LocalDataStore, inventory: MonthPackageInventory, selectedIds: readonly string[], pdfRuntime: SemanticTaggedPdfRuntime = {}) {
  const fresh = await loadMonthPackageInventory(store, inventory.month);
  if (fresh.revision !== inventory.revision) throw new Error("Kayıtlar değişti. Listeyi yenileyip güncel dosyayı hazırlayın.");
  const chosen = [...new Set(selectedIds)].map(id => fresh.items.find(item => item.id === id));
  if (!chosen.length || chosen.some(item => !item)) throw new Error("Pakete eklenecek geçerli belgeleri seçin.");
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot)!;
  const classroom = snapshot.classrooms.find(record => record.id === scope.classroomId)!;
  if (typeof classroom.schoolName !== "string" || !classroom.schoolName.trim() || typeof classroom.teacherName !== "string" || !classroom.teacherName.trim()) throw new Error("Okul ve öğretmen adını sınıf ayarlarında tamamlayın.");
  const graph = await loadTeacherOwnedPlanGraph(store);
  if (!graph && chosen.some(item => item!.kind !== "saved")) throw new Error("Aylık plan bulunamadı; planı hazırlayın.");
  const files: { name: string; bytes: Uint8Array }[] = [];
  for (const item of chosen) {
    if (item!.kind === "saved") {
      const record = snapshot.settings.filter(isDocumentVersionRecord).find(record => record.id === item!.planId);
      if (!record) throw new Error("Seçilen belge sürümü değişti; listeyi yenileyin.");
      const file = await documentVersionFile(record);
      files.push({ name: `saklanan-surumler/${file.fileName}`, bytes: file.bytes });
      continue;
    }
    for (const format of ["pdf", "word"] as const) {
      const file = item!.kind === "plan"
        ? await (await import("../planning/teacher-owned-plan-document.ts")).generateStandaloneTeacherOwnedPlanExportFile(graph!, store, format, { kind: "monthly", monthlyPlanId: item!.planId }, {
          schoolName: classroom.schoolName, teacherName: classroom.teacherName,
          classroomName: typeof classroom.name === "string" ? classroom.name : undefined,
        }, pdfRuntime)
        : await (await import("../planning/teacher-owned-monthly-evaluation-export.ts")).generateTeacherOwnedMonthlyEvaluationExportFile(store, item!.planId, { kind: "latest" }, format, { pdfRuntime });
      files.push({ name: `${item!.kind}/${file.fileName}`, bytes: file.bytes });
    }
  }
  const finalSnapshot = await store.readSnapshot();
  if (sourceRevision(finalSnapshot) !== inventory.revision || chosen.some(item => item!.kind === "saved" && JSON.stringify(finalSnapshot.settings.find(record => record.id === item!.planId)) !== JSON.stringify(snapshot.settings.find(record => record.id === item!.planId)))) throw new Error("Hazırlama sırasında kayıtlar değişti; güncel paket için listeyi yenileyin.");
  const index = [`AY SONU DOSYASI · ${inventory.month}`, `Okul: ${classroom.schoolName}`, `Öğretmen: ${classroom.teacherName}`, "", "İÇİNDEKİLER", ...files.map((file, index) => `${index + 1}. ${file.name}`), "", ...fresh.missing.map(item => `Tamamlanacak: ${item}`)].join("\r\n");
  files.unshift({ name: "00_ICINDEKILER.txt", bytes: new TextEncoder().encode("\uFEFF" + index) });
  return { fileName: `MaarifOS_Ay_Sonu_${inventory.month}.zip`, mimeType: "application/zip", bytes: createBinaryZip(files) };
}
