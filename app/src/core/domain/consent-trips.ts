import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { ActiveClassroomScope } from "./classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import { resolveStudentMembershipOn, studentEnrollments } from "./student-membership.ts";

export const CONSENT_TRIP_SETTING_TYPE = "consent-trip-v1" as const;
export const CONSENT_TRIP_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export const CONSENT_PURPOSES = ["trip", "photo-sharing", "portfolio-sharing", "other"] as const;
export type ConsentPurpose = typeof CONSENT_PURPOSES[number];
export type ConsentDocument = { kind: "consent-document"; documentKey: string; version: number; previousDocumentId: string | null; title: string; purpose: ConsentPurpose; eventId: string | null; eventTitle: string; body: string; validFrom: string; validUntil: string };
export type ConsentDecision = { kind: "consent-decision"; documentId: string; previousDecisionId: string | null; decision: "grant" | "revoke"; signedOn: string; validFrom: string; validUntil: string; signatory: string; signatoryRole: string; source: "signed-paper" | "signed-electronic-document" | "recorded-statement"; sourceReference: string; note: string };
export type TripPlan = { kind: "trip-plan"; title: string; plannedOn: string; destination: string; responsible: string; documentId: string; selectedStudentIds: string[]; redactedParticipantCount: number };
export type TripStage = "departure" | "checkpoint" | "return";
type TripEvent = { tripId: string; previousEventId: string };
export type ConsentTripWorkflow = ConsentDocument | ConsentDecision | TripPlan
  | (TripEvent & { kind: "trip-start"; startedAt: string; roster: { studentId: string; consentDecisionId: string }[]; redactedParticipantCount: number })
  | (TripEvent & { kind: "trip-check"; stage: TripStage; outcome: "seen" | "not-seen"; actualAt: string; previousCheckId: string | null; correctionReason: string; note: string })
  | (TripEvent & { kind: "trip-complete"; completedAt: string })
  | (TripEvent & { kind: "trip-cancel"; reason: string })
  | (TripEvent & { kind: "trip-reopen"; reason: string });
export type ConsentTripRecord = StoredRecord & ActiveClassroomScope & { schemaVersion: 1; settingType: typeof CONSENT_TRIP_SETTING_TYPE; studentId: string | null; workflow: ConsentTripWorkflow; deletedAt: null };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const nullableId = (v: unknown) => v === null || id(v);
const text = (v: unknown, max = 2000): v is string => typeof v === "string" && v.length <= max && v === v.normalize("NFC").trim();
const required = (v: unknown, max = 2000) => text(v, max) && v.length > 0;
const day = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 1000;
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 1000 && v.every(id) && new Set(v).size === v.length;
export function isConsentTripWorkflow(v: unknown): v is ConsentTripWorkflow {
  if (!object(v)) return false;
  const fields = (names: string[]) => exact(v, ["kind", ...names]);
  const linked = () => id(v.tripId) && id(v.previousEventId);
  switch (v.kind) {
    case "consent-document": return fields(["documentKey", "version", "previousDocumentId", "title", "purpose", "eventId", "eventTitle", "body", "validFrom", "validUntil"]) && id(v.documentKey) && Number.isSafeInteger(v.version) && Number(v.version) >= 1 && nullableId(v.previousDocumentId) && (v.version === 1) === (v.previousDocumentId === null) && required(v.title, 300) && CONSENT_PURPOSES.includes(v.purpose as ConsentPurpose) && nullableId(v.eventId) && (v.purpose !== "trip" || id(v.eventId)) && text(v.eventTitle, 300) && (v.eventId === null || required(v.eventTitle, 300)) && text(v.body, 12000) && day(v.validFrom) && day(v.validUntil) && v.validFrom <= v.validUntil;
    case "consent-decision": return fields(["documentId", "previousDecisionId", "decision", "signedOn", "validFrom", "validUntil", "signatory", "signatoryRole", "source", "sourceReference", "note"]) && id(v.documentId) && nullableId(v.previousDecisionId) && ["grant", "revoke"].includes(String(v.decision)) && day(v.signedOn) && day(v.validFrom) && day(v.validUntil) && v.validFrom <= v.validUntil && v.signedOn <= v.validUntil && required(v.signatory, 200) && required(v.signatoryRole, 120) && ["signed-paper", "signed-electronic-document", "recorded-statement"].includes(String(v.source)) && required(v.sourceReference, 500) && text(v.note) && (v.decision !== "revoke" || (id(v.previousDecisionId) && required(v.note)));
    case "trip-plan": return fields(["title", "plannedOn", "destination", "responsible", "documentId", "selectedStudentIds", "redactedParticipantCount"]) && required(v.title, 300) && day(v.plannedOn) && required(v.destination, 500) && required(v.responsible, 200) && id(v.documentId) && ids(v.selectedStudentIds) && count(v.redactedParticipantCount) && v.selectedStudentIds.length + Number(v.redactedParticipantCount) > 0;
    case "trip-start": return fields(["tripId", "previousEventId", "startedAt", "roster", "redactedParticipantCount"]) && linked() && utc(v.startedAt) && count(v.redactedParticipantCount) && Array.isArray(v.roster) && v.roster.length <= 1000 && v.roster.every(r => object(r) && exact(r, ["studentId", "consentDecisionId"]) && id(r.studentId) && id(r.consentDecisionId)) && new Set(v.roster.map(r => r.studentId)).size === v.roster.length && v.roster.length + Number(v.redactedParticipantCount) > 0;
    case "trip-check": return fields(["tripId", "previousEventId", "stage", "outcome", "actualAt", "previousCheckId", "correctionReason", "note"]) && linked() && ["departure", "checkpoint", "return"].includes(String(v.stage)) && ["seen", "not-seen"].includes(String(v.outcome)) && utc(v.actualAt) && nullableId(v.previousCheckId) && text(v.correctionReason) && (v.previousCheckId === null ? v.correctionReason === "" : required(v.correctionReason)) && text(v.note);
    case "trip-complete": return fields(["tripId", "previousEventId", "completedAt"]) && linked() && utc(v.completedAt);
    case "trip-cancel": case "trip-reopen": return fields(["tripId", "previousEventId", "reason"]) && linked() && required(v.reason);
    default: return false;
  }
}
export function isConsentTripRecord(v: unknown): v is ConsentTripRecord {
  if (!object(v) || !exact(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...CONSENT_TRIP_KEYS]) || !id(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !day(v.civilDate) || v.civilDate > civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== CONSENT_TRIP_SETTING_TYPE || !id(v.academicYearId) || !id(v.classroomId) || !nullableId(v.studentId) || !isConsentTripWorkflow(v.workflow)) return false;
  const w = v.workflow;
  if ((w.kind === "consent-decision" || w.kind === "trip-check") !== (v.studentId !== null)) return false;
  if (w.kind === "consent-decision" && w.signedOn > v.civilDate) return false;
  const actual = w.kind === "trip-start" ? w.startedAt : w.kind === "trip-check" ? w.actualAt : w.kind === "trip-complete" ? w.completedAt : null;
  return !actual || (actual <= v.createdAt && civilDateInIstanbul(new Date(actual)) === v.civilDate);
}
export function consentTripRecords(snapshot: DataSnapshot): ConsentTripRecord[] {
  return snapshot.settings.filter(isConsentTripRecord).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
const sameScope = (a: ActiveClassroomScope, b: StoredRecord) => a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
export type ConsentUseState = "no-document" | "missing" | "granted" | "revoked" | "expired" | "pending" | "superseded";
export interface ConsentUseInput extends ActiveClassroomScope { studentId: string; purpose: ConsentPurpose; eventId: string | null; documentId: string; civilDate: string; asOfUtc?: string }
export interface ConsentUseResolution { state: ConsentUseState; allowed: boolean; reason: string; document: ConsentTripRecord | null; decision: ConsentTripRecord | null }
/** Exact document, version, event, child and date are required. Legacy profile booleans never authorize this use. */
export function resolveConsentForUse(snapshot: DataSnapshot, input: ConsentUseInput): ConsentUseResolution {
  const records = consentTripRecords(snapshot).filter(r => sameScope(input, r) && (!input.asOfUtc || r.createdAt <= input.asOfUtc));
  const document = records.find(r => r.id === input.documentId && r.workflow.kind === "consent-document") ?? null;
  const result = (state: ConsentUseState, reason: string, decision: ConsentTripRecord | null = null): ConsentUseResolution => ({ state, allowed: state === "granted", reason, document, decision });
  if (!isCivilDate(input.civilDate) || !document || document.workflow.kind !== "consent-document" || document.workflow.purpose !== input.purpose || document.workflow.eventId !== input.eventId) return result("no-document", "Bu amaç ve etkinlik için eşleşen belge yok.");
  const w = document.workflow;
  if (records.some(r => r.workflow.kind === "consent-document" && r.workflow.documentKey === w.documentKey && r.workflow.version > w.version)) return result("superseded", "Belgenin yeni sürümü var; yeni sürüm için izin kaydı gerekli.");
  const decisions = records.filter(r => r.studentId === input.studentId && r.workflow.kind === "consent-decision" && r.workflow.documentId === document.id && r.workflow.signedOn <= input.civilDate);
  const decision = decisions.at(-1) ?? null;
  if (decision?.workflow.kind === "consent-decision" && decision.workflow.decision === "revoke") return result("revoked", "Veli izni geri çekilmiş.", decision);
  if (input.civilDate < w.validFrom) return result("pending", "Belgenin geçerlilik tarihi henüz başlamadı.", decision);
  if (input.civilDate > w.validUntil) return result("expired", "Belgenin geçerlilik süresi doldu.", decision);
  if (!decision || decision.workflow.kind !== "consent-decision") return result("missing", "Bu çocuk için belgeye bağlı izin kaydı yok.");
  if (input.civilDate < decision.workflow.validFrom) return result("pending", "Veli izninin geçerlilik tarihi henüz başlamadı.", decision);
  if (input.civilDate > decision.workflow.validUntil) return result("expired", "Veli izninin geçerlilik süresi doldu.", decision);
  return result("granted", "Belge sürümü, etkinlik ve tarih için veli izni kayıtlı.", decision);
}
export function documentedSharingConsentSummary(snapshot: DataSnapshot, input: { scope: ActiveClassroomScope; studentId: string; purpose: "photo-sharing" | "portfolio-sharing"; civilDate: string }): ConsentUseResolution {
  const documents = consentTripRecords(snapshot).filter(r => sameScope(input.scope, r) && r.workflow.kind === "consent-document" && r.workflow.purpose === input.purpose && r.workflow.eventId === null);
  const current = documents.at(-1);
  return resolveConsentForUse(snapshot, { ...input.scope, studentId: input.studentId, purpose: input.purpose, eventId: null, documentId: current?.id ?? "", civilDate: input.civilDate });
}
export function tripEvents(records: readonly ConsentTripRecord[], tripId: string): ConsentTripRecord[] {
  return records.filter(r => r.id === tripId || ("tripId" in r.workflow && r.workflow.tripId === tripId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function latestTripCheck(records: readonly ConsentTripRecord[], tripId: string, studentId: string, stage: TripStage): ConsentTripRecord | undefined {
  return tripEvents(records, tripId).filter(r => r.studentId === studentId && r.workflow.kind === "trip-check" && r.workflow.stage === stage).at(-1);
}
export function tripState(records: readonly ConsentTripRecord[], tripId: string) {
  const events = tripEvents(records, tripId);
  const start = events.find(r => r.workflow.kind === "trip-start");
  const roster = start?.workflow.kind === "trip-start" ? start.workflow.roster : [];
  const closure = events.filter(r => ["trip-complete", "trip-cancel", "trip-reopen"].includes(r.workflow.kind)).at(-1);
  const status = closure?.workflow.kind === "trip-cancel" ? "cancelled" : closure?.workflow.kind === "trip-complete" ? "completed" : start ? "active" : "planned";
  const returned = roster.filter(r => { const check = latestTripCheck(events, tripId, r.studentId, "return"); return check?.workflow.kind === "trip-check" && check.workflow.outcome === "seen"; }).length;
  return { events, latestEventId: events.at(-1)?.id ?? tripId, start, roster, returned, missing: roster.length - returned, redactedParticipantCount: start?.workflow.kind === "trip-start" ? start.workflow.redactedParticipantCount : 0, status } as const;
}
export function consentTripEligibleStudents(snapshot: DataSnapshot, scope: ActiveClassroomScope, civilDate: string): StoredRecord[] {
  const academicYear = snapshot.academicYears.find(y => y.id === scope.academicYearId);
  return academicYear ? snapshot.students.filter(s => resolveStudentMembershipOn(s, { ...scope, academicYear, civilDate }).eligible) : [];
}

/** Used by both runtime transactions and backup validation. Sources are never silently discarded. */
export function assertConsentTripRelationships(snapshot: DataSnapshot): void {
  const raw = snapshot.settings.filter(r => r.settingType === CONSENT_TRIP_SETTING_TYPE);
  if (!raw.every(isConsentTripRecord) || new Set(raw.map(r => r.id)).size !== raw.length) throw new Error("Veli izni veya gezi kayıt biçimi geçersiz.");
  const records = consentTripRecords(snapshot);
  const prior: ConsentTripRecord[] = [];
  for (const r of records) {
    const year = snapshot.academicYears.find(y => y.id === r.academicYearId);
    if (!year || !snapshot.classrooms.some(c => c.id === r.classroomId && c.academicYearId === r.academicYearId)) throw new Error("İzin/gezi kaydının sınıf veya eğitim yılı bulunamadı.");
    const scopedChild = (studentId: string) => snapshot.students.some(s => s.id === studentId && (sameScope(r, s) || studentEnrollments(s).some(e => e.academicYearId === r.academicYearId && e.classroomId === r.classroomId)));
    if (r.studentId && !scopedChild(r.studentId)) throw new Error("İzin/gezi kaydının çocuğu bu sınıfın geçmişinde bulunamadı.");
    const w = r.workflow;
    const inYear = (date: string) => typeof year.startDate === "string" && typeof year.endDate === "string" && date >= year.startDate && date <= year.endDate;
    const source = (sourceId: string) => { const value = prior.find(p => p.id === sourceId); if (!value || !sameScope(r, value) || value.createdAt >= r.createdAt) throw new Error("İzin/gezi kaynak ilişkisi veya zaman sırası geçersiz."); return value; };
    if (w.kind === "consent-document") {
      if (!inYear(w.validFrom) || !inYear(w.validUntil)) throw new Error("Belge geçerliliği eğitim yılı içinde olmalı.");
      const versions = prior.filter(p => p.workflow.kind === "consent-document" && p.workflow.documentKey === w.documentKey);
      const previous = versions.at(-1);
      if (w.version === 1 ? versions.length > 0 : !previous || previous.id !== w.previousDocumentId || previous.workflow.kind !== "consent-document" || previous.workflow.version + 1 !== w.version || previous.workflow.purpose !== w.purpose || previous.workflow.eventId !== w.eventId || !sameScope(r, previous)) throw new Error("Belge sürüm zinciri veya etkinliği değişmiş.");
    } else if (w.kind === "consent-decision") {
      const document = source(w.documentId);
      if (document.workflow.kind !== "consent-document" || w.validFrom < document.workflow.validFrom || w.validUntil > document.workflow.validUntil) throw new Error("İzin tarihleri belge kapsamıyla uyuşmuyor.");
      const decisions = prior.filter(p => p.studentId === r.studentId && p.workflow.kind === "consent-decision" && p.workflow.documentId === w.documentId);
      if ((decisions.at(-1)?.id ?? null) !== w.previousDecisionId) throw new Error("Veli izni başka oturumda değişti; son kaydı yeniden açın.");
      if (decisions.at(-1)?.workflow.kind === "consent-decision" && w.signedOn < (decisions.at(-1)!.workflow as ConsentDecision).signedOn) throw new Error("Yeni izin kararı önceki kararın tarihinden önce olamaz.");
    } else if (w.kind === "trip-plan") {
      const document = source(w.documentId);
      if (!inYear(w.plannedOn) || document.workflow.kind !== "consent-document" || document.workflow.purpose !== "trip" || !document.workflow.eventId || w.plannedOn < document.workflow.validFrom || w.plannedOn > document.workflow.validUntil) throw new Error("Gezi tarihi ve izin belgesi eşleşmiyor.");
      if (w.selectedStudentIds.some(studentId => !scopedChild(studentId))) throw new Error("Gezi katılımcısı bu sınıfın geçmişinde bulunamadı.");
    } else {
      const plan = source(w.tripId);
      if (plan.workflow.kind !== "trip-plan") throw new Error("Gezi planı bulunamadı.");
      const plannedRoster = plan.workflow.selectedStudentIds;
      const state = tripState(prior, plan.id);
      if (w.previousEventId !== state.latestEventId) throw new Error("Gezi sayımı başka oturumda değişti; güncel sayımı yeniden açın.");
      const actualDay = r.civilDate;
      if (!inYear(actualDay) || (w.kind !== "trip-cancel" && actualDay !== plan.workflow.plannedOn)) throw new Error("Gerçek sayım günü gezi tarihiyle uyuşmalı.");
      if (w.kind === "trip-start") {
        if (state.status !== "planned" || state.start) throw new Error("Bu gezi zaten başlatılmış veya iptal edilmiş.");
        if (w.roster.length !== plannedRoster.length || w.redactedParticipantCount !== plan.workflow.redactedParticipantCount || w.roster.some(p => !plannedRoster.includes(p.studentId))) throw new Error("Başlangıç kadrosu planla uyuşmuyor.");
        const document = source(plan.workflow.documentId);
        if (document.workflow.kind !== "consent-document") throw new Error("Gezi izin belgesi bulunamadı.");
        for (const participant of w.roster) {
          const consent = resolveConsentForUse(snapshot, { academicYearId: r.academicYearId, classroomId: r.classroomId, studentId: participant.studentId, documentId: document.id, purpose: "trip", eventId: document.workflow.eventId, civilDate: actualDay, asOfUtc: r.createdAt });
          if (!consent.allowed || consent.decision?.id !== participant.consentDecisionId) throw new Error("Gezi başlangıcında her çocuk için etkinliğe ve belge sürümüne uygun izin gerekir.");
        }
      } else if (w.kind === "trip-reopen") {
        if (state.status !== "completed") throw new Error("Yalnız tamamlanmış sayım gerekçeyle yeniden açılabilir.");
      } else if (w.kind === "trip-cancel") {
        if (state.status === "completed" || state.status === "cancelled" || (state.start && state.missing > 0)) throw new Error("Başlayan gezi iptal edilse de bütün çocukların dönüş sayımı tamamlanmalı.");
      } else {
        if (!state.start || state.status !== "active") throw new Error("Sayım için başlamış ve açık bir gezi gerekli.");
        if (w.kind === "trip-complete") {
          if (state.missing > 0) throw new Error("Bütün çocukların dönüşü görülmeden gezi tamamlanamaz.");
        } else {
          if (!state.roster.some(p => p.studentId === r.studentId)) throw new Error("Çocuk başlangıçta kilitlenen gezi kadrosunda yok.");
          const previous = latestTripCheck(prior, plan.id, r.studentId!, w.stage);
          if ((previous?.id ?? null) !== w.previousCheckId) throw new Error("Sayım değişti; düzeltmeyi son kayda bağlayın.");
          const departure = latestTripCheck(prior, plan.id, r.studentId!, "departure");
          if (w.stage !== "departure" && !(departure?.workflow.kind === "trip-check" && departure.workflow.outcome === "seen" && departure.workflow.actualAt <= w.actualAt)) throw new Error("Kontrol veya dönüşten önce çocuğun çıkışı görülmeli.");
          if (state.start.workflow.kind === "trip-start" && w.actualAt < state.start.workflow.startedAt) throw new Error("Sayım zamanı gezi başlangıcından önce olamaz.");
          if (w.stage === "departure" && w.outcome === "not-seen" && (["checkpoint", "return"] as const).some(stage => { const check = latestTripCheck(prior, plan.id, r.studentId!, stage); return check?.workflow.kind === "trip-check" && check.workflow.outcome === "seen"; })) throw new Error("Sonraki aşamada görüldü kaydı olan çocuğun çıkışını değiştirmeden önce sonraki sayımı gerekçeyle düzeltin.");
        }
      }
    }
    prior.push(r);
  }
}
export interface ConsentTripReminder { id: string; studentId: string | null; title: string; dueOn: string; kind: "consent" | "trip"; section: "consents" | "trips" }
export function consentTripReminders(snapshot: DataSnapshot, today: string): ConsentTripReminder[] {
  if (!isCivilDate(today)) return [];
  const records = consentTripRecords(snapshot);
  const reminders: ConsentTripReminder[] = [];
  for (const document of records) {
    if (document.workflow.kind !== "consent-document") continue;
    const doc = document.workflow;
    if (records.some(r => r.workflow.kind === "consent-document" && r.workflow.documentKey === doc.documentKey && r.workflow.version > doc.version)) continue;
    const studentIds = new Set(records.filter(r => r.workflow.kind === "consent-decision" && r.workflow.documentId === document.id).map(r => r.studentId).filter((id): id is string => id !== null));
    for (const studentId of studentIds) {
      if (!snapshot.students.some(s => s.id === studentId && s.active !== false && typeof s.deletedAt !== "string")) continue;
      const resolution = resolveConsentForUse(snapshot, { academicYearId: document.academicYearId, classroomId: document.classroomId, studentId, documentId: document.id, purpose: doc.purpose, eventId: doc.eventId, civilDate: today });
      const decision = resolution.decision;
      if (!resolution.allowed || decision?.workflow.kind !== "consent-decision") continue;
      const dueOn = decision.workflow.validUntil < doc.validUntil ? decision.workflow.validUntil : doc.validUntil;
      const days = (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
      if (days >= 0 && days <= 3) reminders.push({ id: decision.id, studentId, title: `Veli izin süresi doluyor: ${doc.title}`, dueOn, kind: "consent", section: "consents" });
    }
  }
  for (const plan of records.filter(r => r.workflow.kind === "trip-plan")) {
    if (plan.workflow.kind !== "trip-plan") continue;
    const state = tripState(records, plan.id);
    if (state.status === "active") reminders.push({ id: plan.id, studentId: null, title: `${plan.workflow.title}: ${state.missing} çocuğun dönüş sayımı bekliyor`, dueOn: plan.workflow.plannedOn, kind: "trip", section: "trips" });
    else if (state.status === "planned" && plan.workflow.plannedOn >= today && Date.parse(`${plan.workflow.plannedOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`) <= 3 * 86400000) reminders.push({ id: plan.id, studentId: null, title: `${plan.workflow.title}: gezi kadrosunu ve belgeye bağlı izinleri kontrol edin`, dueOn: plan.workflow.plannedOn, kind: "consent", section: "trips" });
  }
  return reminders;
}
