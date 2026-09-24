import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { CONSENT_TRIP_SETTING_TYPE, isConsentTripRecord, type ConsentTripRecord } from "../../core/domain/consent-trips.ts";
import { CLASSROOM_ADMIN_SETTING_TYPE, isClassroomAdminRecord } from "../../core/domain/classroom-admin.ts";

/** Child-owned events disappear; shared trip totals and surviving chronological links remain. */
export function redactStudentConsentTripRecords(snapshot: DataSnapshot, studentId: string): StoredRecord[] {
  const records: ConsentTripRecord[] = [];
  for (const record of snapshot.settings) {
    if (record.settingType !== CONSENT_TRIP_SETTING_TYPE) continue;
    if (!isConsentTripRecord(record)) throw new Error("Kalıcı silmeden önce izin/gezi kayıtları doğrulanmalıdır.");
    if (record.studentId === studentId) continue;
    const workflow = record.workflow;
    if (workflow.kind === "trip-plan") {
      const selectedStudentIds = workflow.selectedStudentIds.filter(id => id !== studentId);
      records.push(selectedStudentIds.length === workflow.selectedStudentIds.length ? record : { ...record, workflow: { ...workflow, selectedStudentIds, redactedParticipantCount: workflow.redactedParticipantCount + workflow.selectedStudentIds.length - selectedStudentIds.length } });
    } else if (workflow.kind === "trip-start") {
      const roster = workflow.roster.filter(row => row.studentId !== studentId);
      records.push(roster.length === workflow.roster.length ? record : { ...record, workflow: { ...workflow, roster, redactedParticipantCount: workflow.redactedParticipantCount + workflow.roster.length - roster.length } });
    } else records.push(record);
  }
  const byId = new Map(records.map(record => [record.id, record]));
  const previousByTrip = new Map<string, string>();
  for (const record of [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
    const workflow = record.workflow;
    if (workflow.kind === "trip-plan") previousByTrip.set(record.id, record.id);
    else if ("tripId" in workflow) {
      const previousEventId = previousByTrip.get(workflow.tripId);
      if (!previousEventId) throw new Error("Kalıcı silmede gezi olay zincirinin kaynağı bulunamadı.");
      if (previousEventId !== workflow.previousEventId) byId.set(record.id, { ...record, workflow: { ...workflow, previousEventId } });
      previousByTrip.set(workflow.tripId, record.id);
    }
  }
  return snapshot.settings.filter(record => byId.has(record.id)).map(record => byId.get(record.id)!);
}

/** Quantities and shared handover evidence survive; child references and derived titles do not. */
export function redactStudentClassroomAdminRecords(snapshot: DataSnapshot, studentId: string, removedIds: ReadonlySet<string>): StoredRecord[] {
  const childSourceIds = new Set(removedIds);
  for (const record of snapshot.settings) if (isClassroomAdminRecord(record) && record.workflow.kind === "inventory-movement" && record.workflow.party?.studentId === studentId) childSourceIds.add(record.id);
  return snapshot.settings.filter(record => record.settingType === CLASSROOM_ADMIN_SETTING_TYPE).map(record => {
    if (!isClassroomAdminRecord(record)) throw new Error("Kalıcı silmeden önce malzeme/devir kayıtları doğrulanmalıdır.");
    const workflow = record.workflow;
    if (workflow.kind === "inventory-movement" && workflow.party?.studentId === studentId) return { ...record, workflow: { ...workflow, party: { type: "removed", studentId: null, name: "" } } };
    if (workflow.kind === "handover-plan" || workflow.kind === "handover-revision") {
      let changed = false;
      const items = workflow.items.map(item => {
        if (item.studentId !== studentId && !item.sourceId?.split(":").some(id => childSourceIds.has(id))) return item;
        changed = true;
        return { ...item, title: "Kişisel kayıt kaldırıldı", sourceId: null, studentId: null, redacted: true };
      });
      return changed ? { ...record, workflow: { ...workflow, items } } : record;
    }
    return record;
  });
}
