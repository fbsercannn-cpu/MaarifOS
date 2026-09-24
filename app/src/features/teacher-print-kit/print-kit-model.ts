import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { studentMembershipOverlaps } from "../../core/domain/student-membership.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { loadMonthPackageInventory } from "../documents/month-end-package.ts";

function context(data: DataSnapshot) {
  const scope = resolveActiveClassroomScope(data);
  if (!scope) throw new Error("Belge için etkin sınıfı seçin.");
  const classroom = data.classrooms.find(r => r.id === scope.classroomId)!;
  const year = data.academicYears.find(r => r.id === scope.academicYearId)!;
  return { scope, schoolName: String(classroom.schoolName ?? ""), classroomName: String(classroom.name ?? ""), teacherName: String(classroom.teacherName ?? ""), yearName: String(year.name ?? ""), yearStart: String(year.startDate), yearEnd: String(year.endDate) };
}
export function pickupSheetModel(data: DataSnapshot, civilDate: string) {
  const meta = context(data);
  if (!isCivilDate(civilDate) || civilDate < meta.yearStart || civilDate > meta.yearEnd) throw new Error("Teslim günü eğitim yılı içinde olmalıdır.");
  const records = teacherFollowups(data).filter(r => recordBelongsToClassroomScope(r, meta.scope));
  const corrected = new Set(records.flatMap(r => r.workflow.kind === "pickup-correction" ? [r.workflow.sourceId] : []));
  const rows = data.students.filter(s => !s.deletedAt && studentMembershipOverlaps(s, { ...meta.scope, academicYear:data.academicYears.find(y => y.id === meta.scope.academicYearId)!, periodStart: civilDate, periodEnd: civilDate })).sort((a,b) => String(a.displayName).localeCompare(String(b.displayName),"tr-TR") || a.id.localeCompare(b.id)).map(student => {
    const contacts = studentContactsFromRecord(student.contacts).filter(c => c.isAuthorizedPickup === true).map(c => ({ id:c.id, name:c.name ?? "", phone:c.phone, relationship:c.relationship }));
    const logs = records.filter(r => r.studentId === student.id && r.civilDate === civilDate && r.workflow.kind === "pickup-log" && !corrected.has(r.id));
    return { studentId: student.id, studentName: String(student.displayName), contacts,
      deliveries: logs.flatMap(r => r.workflow.kind === "pickup-log" ? [{ id:r.id, contact:r.workflow.contact, handedOverAt:r.workflow.handedOverAt }] : []),
      correctionCount: records.filter(r => r.studentId === student.id && r.workflow.kind === "pickup-log" && r.civilDate === civilDate && corrected.has(r.id)).length };
  });
  const result = { ...meta, civilDate, rows };
  return { ...result, fingerprint: canonicalJson(result) };
}
export async function loadPickupSheet(store: LocalDataStore, civilDate: string) { return pickupSheetModel(await store.readSnapshot(), civilDate); }
export type PickupSheetModel = ReturnType<typeof pickupSheetModel>;

export async function loadBinderKit(store: LocalDataStore, month: string, selectedIds?: readonly string[]) {
  const inventory = await loadMonthPackageInventory(store, month), data = await store.readSnapshot(), meta = context(data);
  const ids = selectedIds ? [...selectedIds] : inventory.items.map(i => i.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !inventory.items.some(item => item.id === id))) throw new Error("Seçili belge artık bulunamıyor. Aynı kapsamı kontrol ederek yenileyin.");
  const items = ids.map(id => inventory.items.find(i => i.id === id)!);
  const saved = items.filter(i => i.kind === "saved").map(i => data.settings.find(r => r.id === i.planId)!);
  // Plan packages include their child plans and support references; saved versions
  // keep their immutable bytes/hash. Newly saved unrelated PDFs are not sources.
  const planSources = items.some(i => i.kind !== "saved") ? data.plans.filter(r => recordBelongsToClassroomScope(r,meta.scope)) : [];
  const studentIds = new Set(saved.flatMap(r => Array.isArray(r.studentIds) ? r.studentIds as string[] : []));
  if (planSources.length) data.students.filter(r => !r.deletedAt && recordBelongsToClassroomScope(r,meta.scope)).forEach(r => studentIds.add(r.id));
  const students = data.students.filter(r => studentIds.has(r.id) && !r.deletedAt).map(r => ({id:r.id,label:String(r.displayName)})).sort((a,b) => a.id.localeCompare(b.id));
  if (students.length !== studentIds.size) throw new Error("Seçili belgelerin öğrenci kapsamı değişti.");
  const source = { ...meta, month, items, students, saved, planSources:[...planSources].sort((a,b) => a.id.localeCompare(b.id)) };
  return { ...meta, month, inventory, items, students, fingerprint:canonicalJson(source) };
}
export type BinderKitModel = Awaited<ReturnType<typeof loadBinderKit>>;
