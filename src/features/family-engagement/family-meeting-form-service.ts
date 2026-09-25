import { homeGameCards } from "../home-game-cards/home-game-card-model.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { appointmentState, familyEngagementRecords, type FamilyAppointment } from "../../core/domain/family-engagement.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type CollectionName, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { isTeacherFollowupRecord, teacherFollowups, TEACHER_FOLLOWUP_SETTING_TYPE, type TeacherFollowupRecord, type TeacherWorkflow } from "../../core/domain/teacher-followup.ts";
import { isEntityRecord } from "../../core/repository/entities.ts";
import type { LocalDataStore, DataTransaction } from "../../core/repository/contracts.ts";
import { executeFamilyEngagement } from "./family-engagement-service.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";

export interface FamilyMeetingTaskDraft { owner: "family" | "teacher"; text: string; dueOn: string }
export interface FamilyMeetingFormInput {
  appointmentId: string; expectedFingerprint: string; actualAtUtc: string; participants: string; discussion: string; decision: string;
  followupOn: string | null; observationIds: string[]; tasks: FamilyMeetingTaskDraft[]; confirmedOccurred: true; tasksConfirmed: true; now?: Date;
}
export interface FamilyMeetingFormModel {
  scope: ActiveClassroomScope; fingerprint: string; appointmentId: string; appointmentEventId: string; appointment: FamilyAppointment;
  studentId: string; studentName: string; classroomName: string; teacherName: string; schoolName: string;
  status: "scheduled" | "completed" | "cancelled"; canRecord: boolean;
  observations: { id: string; civilDate: string; rawText: string; selected: boolean }[];
  agenda: string[]; meeting: { id: string; civilDate: string; actualAtUtc: string; participants: string; discussion: string; decision: string; followupOn: string | null } | null;
  formId: string | null; tasks: { id: string; owner: "family" | "teacher"; text: string; dueOn: string; completed: boolean }[];
}
const STALE = "Görüşmenin kaynakları değişti. Güncel formu yeniden yükleyin; yeni kayıt yazılmadı.";
const live = (r: StoredRecord) => typeof r.deletedAt !== "string";
const fingerprint = (data: DataSnapshot) => canonicalJson(Object.fromEntries(COLLECTION_NAMES.map(name => [name, [...data[name]].sort((a,b) => a.id.localeCompare(b.id))])));
const childHas = (r: StoredRecord, id: string) => r.studentId === id || (Array.isArray(r.studentIds) && r.studentIds.includes(id));
async function read(tx: DataTransaction) { const data = createEmptySnapshot(); for (const name of COLLECTION_NAMES) data[name] = await tx.getAll(name); return data; }
function memory(data: DataSnapshot): LocalDataStore { return { readSnapshot: async () => structuredClone(data), close() {}, transaction: async (_mode, _names, task) => task({ getAll: async name => structuredClone(data[name]) as never, clear: async name => { data[name] = []; }, putMany: async (name: CollectionName, rows: readonly StoredRecord[]) => { for (const row of rows) { const i = data[name].findIndex(r => r.id === row.id); if (i < 0) data[name].push(structuredClone(row)); else data[name][i] = structuredClone(row); } } }) }; }
function append(data: DataSnapshot, scope: ActiveClassroomScope, studentId: string, workflow: TeacherWorkflow, now: Date) {
  const at = new Date(Math.max(now.getTime(), ...data.settings.map(r => (Date.parse(r.createdAt) || 0) + 1))).toISOString();
  const row: TeacherFollowupRecord = { id: crypto.randomUUID(), ...scope, studentId, workflow, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, schemaVersion: 1, createdAt: at, updatedAt: at, civilDate: civilDateInIstanbul(now), deletedAt: null };
  if (!isTeacherFollowupRecord(row)) throw new Error("Görüşme görev alanlarını ve tarihlerini kontrol edin."); data.settings.push(row); return row;
}
export function familyMeetingFormModel(data: DataSnapshot, appointmentId: string, now = new Date()): FamilyMeetingFormModel {
  const scope = resolveActiveClassroomScope(data); if (!scope) throw new Error("Etkin sınıf bulunamadı.");
  const year = data.academicYears.find(y => y.id === scope.academicYearId), state = appointmentState(familyEngagementRecords(data), appointmentId);
  const plan = state.plan; if (!plan || !state.last || plan.workflow.kind !== "appointment" || !recordBelongsToClassroomScope(plan, scope)) throw new Error("Bu sınıfta kayıtlı veli görüşmesi bulunamadı.");
  const student = data.students.find(s => s.id === plan.studentId && live(s) && recordBelongsToClassroomScope(s, scope)); if (!student) throw new Error("Görüşmenin çocuk kaydı artık bu sınıfta değil.");
  const classroom = data.classrooms.find(c => c.id === scope.classroomId)!;
  const records = teacherFollowups(data).filter(r => recordBelongsToClassroomScope(r, scope) && r.studentId === student.id);
  const event = state.last.workflow.kind === "appointment-meeting" ? state.last.workflow : null;
  const meeting = event ? records.find(r => r.id === event.meetingId) : null;
  const form = meeting ? records.find(r => r.workflow.kind === "family-meeting-form" && r.workflow.sourceId === meeting.id) : null;
  const savedIds = form?.workflow.kind === "family-meeting-form" ? form.workflow.observationIds : null;
  const sourceLink = records.find(r => r.workflow.kind === "family-preparation-link" && r.workflow.appointmentId === appointmentId);
  const sourceId = sourceLink?.workflow.kind === "family-preparation-link" ? sourceLink.workflow.sourceId : null;
  const decision = sourceId ? records.find(r => r.id === sourceId) : null;
  const sourceIds = decision?.workflow.kind === "learning-decision" ? decision.workflow.observationIds : [];
  const familyCards = homeGameCards(data).filter(r => r.studentId === student.id && recordBelongsToClassroomScope(r, scope));
  const responseAgenda = familyCards.flatMap(r => r.workflow.kind !== "response-action" || r.workflow.appointmentId !== appointmentId ? [] : familyCards.flatMap(feedback => feedback.id === (r.workflow as {feedbackId:string}).feedbackId && feedback.workflow.kind === "feedback" ? [`Aile oyun kartına gelen gerçek yanıt (${feedback.workflow.receivedOn}): ${feedback.workflow.text}`] : []));
  const scheduledOn = plan.workflow.scheduledOn;
  const observations = data.observations.filter(o => live(o) && recordBelongsToClassroomScope(o, scope) && childHas(o, student.id) && o.civilDate <= scheduledOn && (!savedIds || savedIds.includes(o.id))).sort((a,b) => b.civilDate.localeCompare(a.civilDate) || a.id.localeCompare(b.id)).map(o => ({ id: o.id, civilDate: o.civilDate, rawText: String(o.rawText ?? ""), selected: savedIds ? savedIds.includes(o.id) : sourceIds.includes(o.id) }));
  const tasks = meeting ? records.flatMap(r => r.workflow.kind !== "family-meeting-task" || r.workflow.sourceId !== meeting.id ? [] : [{ id: r.id, owner: r.workflow.owner, text: r.workflow.text, dueOn: r.workflow.dueOn, completed: records.filter(e => e.workflow.kind === "family-task-check" && e.workflow.sourceId === r.id).at(-1)?.workflow.kind === "family-task-check" ? (records.filter(e => e.workflow.kind === "family-task-check" && e.workflow.sourceId === r.id).at(-1)!.workflow as { completed: boolean }).completed : false }]) : [];
  return { scope, fingerprint: fingerprint(data), appointmentId, appointmentEventId: state.last.id, appointment: plan.workflow, studentId: student.id, studentName: String(student.displayName), classroomName: String(classroom.name ?? ""), teacherName: String(classroom.teacherName ?? ""), schoolName: String(classroom.schoolName ?? ""), status: state.status as "scheduled" | "completed" | "cancelled", canRecord: state.status === "scheduled" && plan.workflow.startsAtUtc <= now.toISOString() && year?.status !== "archived" && student.active !== false,
    observations, agenda: [plan.workflow.purpose, ...responseAgenda, ...(decision?.workflow.kind === "learning-decision" && !plan.workflow.purpose.includes(decision.workflow.teacherDecision) ? [decision.workflow.teacherDecision] : [])].filter((text, i, values) => values.indexOf(text) === i),
    meeting: meeting?.workflow.kind === "family-meeting" && event ? { id: meeting.id, civilDate: meeting.civilDate, actualAtUtc: event.actualAtUtc, participants: meeting.workflow.participants, discussion: meeting.workflow.discussion, decision: meeting.workflow.decision, followupOn: meeting.workflow.followupOn } : null, formId: form?.id ?? null, tasks };
}
export async function loadFamilyMeetingForm(store: LocalDataStore, appointmentId: string, now = new Date()) { return familyMeetingFormModel(await store.readSnapshot(), appointmentId, now); }
function normalized(input: FamilyMeetingFormInput) { return { actualAtUtc: input.actualAtUtc, participants: input.participants.normalize("NFC").trim(), discussion: input.discussion.normalize("NFC").trim(), decision: input.decision.normalize("NFC").trim(), followupOn: input.followupOn, observationIds: [...input.observationIds].sort(), tasks: input.tasks.map(t => ({ ...t, text: t.text.normalize("NFC").trim() })) }; }
export async function saveFamilyMeetingForm(store: LocalDataStore, input: FamilyMeetingFormInput): Promise<{ meetingId: string; formId: string; taskIds: string[]; alreadyCompleted: boolean }> {
  const { assertDataSnapshotRelationships } = await import("../../core/backup/schema.ts");
  if (input.confirmedOccurred !== true || input.tasksConfirmed !== true || !Array.isArray(input.tasks) || input.tasks.length > 20 || !Array.isArray(input.observationIds) || input.observationIds.length > 100 || new Set(input.observationIds).size !== input.observationIds.length) throw new Error("Gerçek görüşmeyi, seçilen kaynakları ve kararlaştırılan görevleri doğrulayın.");
  const value = normalized(input), now = input.now ?? new Date();
  if (!value.participants || !value.discussion || !value.decision || (value.followupOn !== null && (!isCivilDate(value.followupOn) || value.followupOn < civilDateInIstanbul(now)))) throw new Error("Katılımcıları, gerçek görüşme sonucunu, kararı ve geçerli takip gününü tamamlayın.");
  const taskKeys = value.tasks.map(t => canonicalJson(t)); if (new Set(taskKeys).size !== taskKeys.length || value.tasks.some(t => !t.text || t.text.length > 1000 || !["teacher", "family"].includes(t.owner) || !isCivilDate(t.dueOn) || t.dueOn < civilDateInIstanbul(now))) throw new Error("Görevleri sorumlu ve geçerli tarihle bir kez seçin.");
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const data = await read(tx), before = new Map(data.settings.map(r => [r.id, canonicalJson(r)])), model = familyMeetingFormModel(data, input.appointmentId, now);
    if (model.status === "completed" && model.meeting && model.formId) {
      const persisted = { actualAtUtc: model.meeting.actualAtUtc, participants: model.meeting.participants, discussion: model.meeting.discussion, decision: model.meeting.decision, followupOn: model.meeting.followupOn, observationIds: model.observations.filter(o => o.selected).map(o => o.id).sort(), tasks: model.tasks.map(({ owner, text, dueOn }) => ({ owner, text, dueOn })) };
      if (canonicalJson(persisted) === canonicalJson(value)) return { meetingId: model.meeting.id, formId: model.formId, taskIds: model.tasks.map(t => t.id), alreadyCompleted: true };
      throw new Error("Bu görüşmenin sonucu zaten kaydedilmiş. İkinci sonuç oluşturulmadı.");
    }
    if (!model.canRecord || model.fingerprint !== input.expectedFingerprint || value.observationIds.some(id => !model.observations.some(o => o.id === id))) throw new Error(STALE);
    const event = await executeFamilyEngagement(memory(data), { scope: model.scope, now, command: { action: "meeting", appointmentId: input.appointmentId, expectedEventId: model.appointmentEventId, actualAtUtc: value.actualAtUtc, participants: value.participants, discussion: value.discussion, decision: value.decision, followupOn: value.followupOn } });
    if (event.workflow.kind !== "appointment-meeting") throw new Error(STALE);
    const form = append(data, model.scope, model.studentId, { kind: "family-meeting-form", sourceId: event.workflow.meetingId, appointmentId: input.appointmentId, observationIds: value.observationIds, teacherConfirmed: true }, now);
    const tasks = value.tasks.map(task => append(data, model.scope, model.studentId, { kind: "family-meeting-task", sourceId: event.workflow.kind === "appointment-meeting" ? event.workflow.meetingId : "", ...task }, now));
    for (const row of data.settings) if (!isEntityRecord("settings", row)) throw new Error("Görüşme kayıt sözleşmesi doğrulanamadı.");
    assertDataSnapshotRelationships(data, civilDateInIstanbul(now));
    // Separate puts deliberately exercise one real outer transaction, not partial service commits.
    for (const row of data.settings.filter(r => before.get(r.id) !== canonicalJson(r))) await tx.putMany("settings", [row]);
    return { meetingId: event.workflow.meetingId, formId: form.id, taskIds: tasks.map(t => t.id), alreadyCompleted: false };
  }); notifyFollowupChanged(); return result;
}
export async function completeFamilyMeetingTask(store: LocalDataStore, input: { appointmentId: string; taskId: string; expectedFingerprint: string; now?: Date }) {
  const { assertDataSnapshotRelationships } = await import("../../core/backup/schema.ts");
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const data = await read(tx), model = familyMeetingFormModel(data, input.appointmentId, now), task = model.tasks.find(t => t.id === input.taskId);
    if (!task || data.academicYears.find(y => y.id === model.scope.academicYearId)?.status === "archived") throw new Error(STALE);
    if (task.completed) return { alreadyCompleted: true };
    if (input.expectedFingerprint !== model.fingerprint) throw new Error(STALE);
    const row = append(data, model.scope, model.studentId, { kind: "family-task-check", sourceId: task.id, completed: true }, now); assertDataSnapshotRelationships(data, civilDateInIstanbul(now)); await tx.putMany("settings", [row]); return { alreadyCompleted: false };
  }); notifyFollowupChanged(); return result;
}

