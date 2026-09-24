import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { isTeacherOwnedPlanRecord, type TeacherOwnedWeeklyPlan } from "../../core/domain/teacher-owned-plan.ts";
import {
  assertTeacherFollowupRelationships, isTeacherFollowupRecord, isTeacherSupportStep, teacherFollowups, TEACHER_FOLLOWUP_SETTING_TYPE,
  type ContactArea, type ContactSnapshot, type PreparationItem, type PreparationSource, type TeacherFollowupRecord, type TeacherWorkflow,
} from "../../core/domain/teacher-followup.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";

export const FOLLOWUP_CHANGED_EVENT = "maarifos:teacher-followup-changed";
const clean = (s: string) => s.normalize("NFC").trim();
export async function followupFingerprint(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(value)));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function pickupContactSnapshot(value: ReturnType<typeof studentContactsFromRecord>[number]): ContactSnapshot {
  return { id: value.id, name: value.name ?? "", relationship: value.relationship, phone: value.phone, authorized: value.isAuthorizedPickup === true };
}
export function contactAreaValue(student: StoredRecord, area: ContactArea): unknown {
  const contacts = studentContactsFromRecord(student.contacts).sort((a, b) => a.id.localeCompare(b.id));
  if (area === "phones") return contacts.map(c => ({ id: c.id, name: c.name ?? "", phone: c.phone, relationship: c.relationship }));
  if (area === "pickup") return contacts.map(pickupContactSnapshot);
  const care = student.careDetails as Record<string, unknown> | undefined;
  return { address: care?.homeAddress ?? "", parts: care?.homeAddressParts ?? null };
}
export type ContactFreshness = { area: ContactArea; missing: boolean; checkedOn: string | null; source: string | null; state: "missing" | "unverified" | "changed" | "old" | "current" };
export async function contactFreshness(student: StoredRecord, records: readonly TeacherFollowupRecord[], asOf: string): Promise<ContactFreshness[]> {
  return Promise.all((["phones", "address", "pickup"] as const).map(async area => {
    const contacts = studentContactsFromRecord(student.contacts);
    const care = student.careDetails as Record<string, unknown> | undefined;
    const missing = area === "phones" ? !contacts.some(c => c.phone.trim()) : area === "address" ? !String(care?.homeAddress ?? "").trim() : !contacts.some(c => c.isAuthorizedPickup && c.name?.trim());
    const latest = records.filter(r => r.studentId === student.id && r.civilDate <= asOf && r.workflow.kind === "contact-check" && r.workflow.areas.includes(area)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const check = latest?.workflow.kind === "contact-check" ? latest.workflow : null;
    const ageDays = latest ? Math.floor((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${latest.civilDate}T00:00:00Z`)) / 86_400_000) : 0;
    const unchanged = check ? check.fingerprints[area] === await followupFingerprint(contactAreaValue(student, area)) : false;
    return { area, missing, checkedOn: latest?.civilDate ?? null, source: check?.source ?? null, state: missing ? "missing" : !check ? "unverified" : !unchanged ? "changed" : ageDays >= 90 ? "old" : "current" };
  }));
}
async function transactionSnapshot(transaction: DataTransaction): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
  return snapshot;
}
function currentScope(snapshot: DataSnapshot): ActiveClassroomScope {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Takip kaydı için etkin bir sınıf seçin.");
  const year = snapshot.academicYears.find(r => r.id === scope.academicYearId);
  if (year?.status === "archived") throw new Error("Arşivlenen eğitim yılına yeni takip kaydı eklenemez.");
  return scope;
}
function makeRecord(snapshot: DataSnapshot, scope: ActiveClassroomScope, studentId: string | null, workflow: TeacherWorkflow, civilDate: string, now: Date): TeacherFollowupRecord {
  const max = snapshot.settings.filter(r => r.settingType === TEACHER_FOLLOWUP_SETTING_TYPE).reduce((n, r) => Math.max(n, Date.parse(r.createdAt)), 0);
  const createdAt = new Date(Math.max(now.getTime(), max + 1)).toISOString();
  const result: TeacherFollowupRecord = { id: crypto.randomUUID(), createdAt, updatedAt: createdAt, civilDate, deletedAt: null, schemaVersion: 1, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, ...scope, studentId, workflow: structuredClone(workflow) };
  if (!isTeacherFollowupRecord(result)) throw new Error("Takip alanlarını ve tarihleri kontrol edin; kayıt oluşturulmadı.");
  return result;
}
export function notifyFollowupChanged(): void { if (typeof window !== "undefined") window.dispatchEvent(new Event(FOLLOWUP_CHANGED_EVENT)); }

export async function appendTeacherFollowup(store: LocalDataStore, input: { studentId: string | null; workflow: TeacherWorkflow; civilDate?: string; now?: Date; expectedStudentUpdatedAt?: string }): Promise<TeacherFollowupRecord> {
  if (["learning-plan-link", "pickup-authority", "learning-continuation", "observation-focus", "family-preparation-link", "family-meeting-form", "family-meeting-task", "family-task-check"].includes(input.workflow.kind)) throw new Error("Bu kayıt yalnız ilgili plan, profil veya hazır adım işlemiyle birlikte oluşturulabilir.");
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = await transactionSnapshot(transaction);
    const scope = currentScope(snapshot);
    const student = input.studentId ? snapshot.students.find(s => s.id === input.studentId) : undefined;
    if (input.studentId && (!student || typeof student.deletedAt === "string" || student.active === false || student.academicYearId !== scope.academicYearId || student.classroomId !== scope.classroomId)) throw new Error("Yeni takip için etkin sınıftaki bir çocuğu seçin.");
    if (input.expectedStudentUpdatedAt !== undefined && student?.updatedAt !== input.expectedStudentUpdatedAt) throw new Error("Çocuk bilgileri değişti. Son bilgileri açıp yeniden doğrulayın.");
    if (input.workflow.kind === "learning-decision" && input.workflow.observationIds.some(id => !snapshot.observations.some(o => o.id === id && typeof o.deletedAt !== "string"))) throw new Error("Destek kararı için silinmemiş bir kaynak gözlem seçin.");
    if (input.workflow.kind === "preparation-list" && input.workflow.sources.some(s => snapshot[s.collection].find(r => r.id === s.id && typeof r.deletedAt !== "string")?.updatedAt !== s.updatedAt)) throw new Error("Seçilen hazırlık kaynağı değişti. Güncel kaynakları yeniden birleştirin.");
    if (input.workflow.kind === "pickup-log") {
      const w = input.workflow;
      const selected = studentContactsFromRecord(student?.contacts).find(c => c.id === w.contact.id);
      if (!selected || !selected.isAuthorizedPickup || canonicalJson(pickupContactSnapshot(selected)) !== canonicalJson(w.contact) || w.authorityFingerprint !== await followupFingerprint(contactAreaValue(student!, "pickup"))) throw new Error("Teslim yetkisi veya kişi bilgisi değişti. Güncel yetkili kişiyi yeniden seçin.");
      if (civilDateInIstanbul(new Date(w.handedOverAt)) !== civilDateInIstanbul(now)) throw new Error("Teslim kaydı bugünün gerçek teslim zamanıyla girilmelidir.");
      const prior = teacherFollowups(snapshot).filter(r => r.studentId === input.studentId && r.civilDate === civilDateInIstanbul(now) && r.workflow.kind === "pickup-log");
      if (prior.some(r => !snapshot.settings.some(s => isTeacherFollowupRecord(s) && s.workflow.kind === "pickup-correction" && s.workflow.sourceId === r.id))) throw new Error("Bugün teslim kaydı var. Yeni kayıt gerekiyorsa önce gerekçeli düzeltme ekleyin.");
    }
    if (input.workflow.kind === "contact-check") {
      const w = input.workflow;
      for (const area of w.areas) if (w.fingerprints[area] !== await followupFingerprint(contactAreaValue(student!, area))) throw new Error("Doğrulanan iletişim bilgisi değişti; son bilgileri yeniden açın.");
    }
    const record = makeRecord(snapshot, scope, input.studentId, input.workflow, input.civilDate ?? civilDateInIstanbul(now), now);
    snapshot.settings.push(record);
    assertTeacherFollowupRelationships(snapshot);
    await transaction.putMany("settings", [record]);
    return record;
  });
  notifyFollowupChanged();
  return result;
}

/** Called inside the existing roster transaction; contact removal and every authority edit share its commit. */
export function contactAuthorityHistory(before: StoredRecord | undefined, after: StoredRecord, now: Date): TeacherFollowupRecord[] {
  if (!before || typeof after.academicYearId !== "string" || typeof after.classroomId !== "string") return [];
  const oldContacts = studentContactsFromRecord(before.contacts).map(pickupContactSnapshot);
  const newContacts = studentContactsFromRecord(after.contacts).map(pickupContactSnapshot);
  const records: TeacherFollowupRecord[] = [];
  for (const contactId of new Set([...oldContacts, ...newContacts].map(c => c.id))) {
    const oldValue = oldContacts.find(c => c.id === contactId) ?? null;
    const newValue = newContacts.find(c => c.id === contactId) ?? null;
    if (canonicalJson(oldValue) === canonicalJson(newValue) || (!oldValue?.authorized && !newValue?.authorized)) continue;
    const timestamp = now.toISOString();
    records.push({ id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp, civilDate: civilDateInIstanbul(now), deletedAt: null, schemaVersion: 1, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, academicYearId: after.academicYearId, classroomId: after.classroomId, studentId: after.id, workflow: { kind: "pickup-authority", contactId, before: oldValue, after: newValue, reason: "Çocuk profilinde teslim yetkisi veya yetkili kişinin bilgisi değiştirildi." } });
  }
  return records;
}

export async function applyLearningDecisionToPlan(store: LocalDataStore, input: { decisionId: string; planId: string; expectedUpdatedAt: string; appliedText: string; now?: Date }): Promise<TeacherFollowupRecord> {
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = await transactionSnapshot(transaction);
    const scope = currentScope(snapshot);
    const decision = teacherFollowups(snapshot).find(r => r.id === input.decisionId);
    const plan = snapshot.plans.find(r => r.id === input.planId);
    if (!decision || decision.workflow.kind !== "learning-decision" || decision.classroomId !== scope.classroomId || !plan || !isTeacherOwnedPlanRecord(plan) || plan.planType !== "weekly" || plan.classroomId !== scope.classroomId || plan.academicYearId !== scope.academicYearId || plan.updatedAt !== input.expectedUpdatedAt || plan.periodStart !== decision.workflow.targetWeekStart || plan.periodEnd !== decision.workflow.targetWeekEnd) throw new Error("Hedef haftanın güncel öğretmen planını seçin.");
    const existing = teacherFollowups(snapshot).find(r => r.workflow.kind === "learning-plan-link" && r.workflow.sourceId === input.decisionId && r.workflow.planId === input.planId);
    if (existing) return existing;
    const appliedText = clean(input.appliedText);
    if (!appliedText || appliedText.length > 8000) throw new Error("Plana eklenecek öğretmen metnini 1–8000 karakterle yazın.");
    const timestamp = new Date(Math.max(now.getTime(), Date.parse(plan.updatedAt) + 1)).toISOString();
    const priorSteps = plan.teacherContent.followupSupportSteps ?? [];
    if (!Array.isArray(priorSteps) || !priorSteps.every(isTeacherSupportStep)) throw new Error("Önceki plan destek adımları doğrulanamadı.");
    const revised: TeacherOwnedWeeklyPlan = { ...structuredClone(plan), teacherContent: { ...structuredClone(plan.teacherContent), followupSupportSteps: [...priorSteps.map(s => ({ ...s })), { decisionId: decision.id, studentId: decision.studentId!, text: appliedText }] }, updatedAt: timestamp, revisionNumber: plan.revisionNumber + 1, revisionHistory: [...plan.revisionHistory, { revisionNumber: plan.revisionNumber, title: plan.title, teacherContent: structuredClone(plan.teacherContent), periodStart: plan.periodStart, periodEnd: plan.periodEnd, updatedAt: plan.updatedAt, capturedAt: timestamp }] };
    if (!isTeacherOwnedPlanRecord(revised)) throw new Error("Plan metni kayıt sınırına uymuyor; önce metni düzenleyin.");
    const record = makeRecord(snapshot, scope, decision.studentId, { kind: "learning-plan-link", sourceId: decision.id, planId: plan.id, planRevision: revised.revisionNumber, appliedText }, civilDateInIstanbul(now), new Date(timestamp));
    snapshot.plans = snapshot.plans.map(p => p.id === revised.id ? revised : p);
    snapshot.settings.push(record);
    assertTeacherFollowupRelationships(snapshot);
    await transaction.putMany("plans", [revised]);
    await transaction.putMany("settings", [record]);
    return record;
  });
  notifyFollowupChanged();
  return result;
}

export interface PreparationCandidate { source: PreparationSource; materials: string[]; preparation: string[]; missingMaterials: boolean }
export function preparationCandidates(snapshot: DataSnapshot, scope: ActiveClassroomScope, start: string, end: string): PreparationCandidate[] {
  const textArray = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(clean) : typeof v === "string" && v.trim() ? [clean(v)] : [];
  const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const select = (records: StoredRecord[], collection: "activities" | "plans"): PreparationCandidate[] => records.filter(r => r.classroomId === scope.classroomId && r.academicYearId === scope.academicYearId && typeof r.deletedAt !== "string" && (typeof r.periodStart === "string" && typeof r.periodEnd === "string" ? r.periodStart <= end && r.periodEnd >= start : r.civilDate >= start && r.civilDate <= end) && (collection === "activities" || ["daily", "weekly"].includes(String(r.planType)))).map(r => {
    const template = object(r.sourceActivityTemplateSnapshot);
    const content = object(r.teacherContent);
    const materials = [...textArray(r.materials), ...textArray(template.materials), ...textArray(content.materials)];
    const preparation = [...textArray(r.preparation), ...textArray(template.preparation), ...textArray(content.preparation)];
    return { source: { collection, id: r.id, title: String(r.title ?? (collection === "plans" ? "Öğretmen planı" : "Etkinlik")), updatedAt: r.updatedAt }, materials, preparation, missingMaterials: materials.length === 0 };
  });
  return [...select(snapshot.activities, "activities"), ...select(snapshot.plans, "plans")];
}
/** Normalize exact material names only; never infer quantities or equate different materials. */
export function combinePreparationItems(candidates: readonly PreparationCandidate[], dueOn: string): PreparationItem[] {
  const items = new Map<string, PreparationItem>();
  for (const candidate of candidates) for (const [texts, advance] of [[candidate.materials, false], [candidate.preparation, true]] as const) for (const value of texts) {
    const text = clean(value).replace(/\s+/gu, " ");
    const key = `${advance}:${text.toLocaleLowerCase("tr-TR")}`;
    const found = items.get(key);
    if (found) { if (!found.sourceIds.includes(candidate.source.id)) found.sourceIds.push(candidate.source.id); }
    else items.set(key, { id: crypto.randomUUID(), text, advance, dueOn, sourceIds: [candidate.source.id] });
  }
  return [...items.values()];
}
