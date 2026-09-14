import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { assertConsentTripRelationships, consentTripEligibleStudents, consentTripRecords, CONSENT_TRIP_SETTING_TYPE, isConsentTripRecord, latestTripCheck, resolveConsentForUse, tripState, type ConsentDecision, type ConsentDocument, type ConsentTripRecord, type ConsentTripWorkflow, type TripPlan, type TripStage } from "../../core/domain/consent-trips.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const CONSENT_TRIPS_CHANGED_EVENT = "maarifos:consent-trips-changed";
export type ConsentTripCommand =
  | { action: "document"; document: Omit<ConsentDocument, "kind" | "documentKey" | "version" | "eventId">; purposeEventId?: string | null }
  | { action: "decision"; studentId: string; decision: Omit<ConsentDecision, "kind"> }
  | { action: "plan"; plan: Omit<TripPlan, "kind" | "redactedParticipantCount"> }
  | { action: "start"; tripId: string; expectedEventId: string }
  | { action: "check"; tripId: string; expectedEventId: string; studentId: string; stage: TripStage; outcome: "seen" | "not-seen"; actualAt: string; previousCheckId: string | null; correctionReason: string; note: string }
  | { action: "complete" | "cancel" | "reopen"; tripId: string; expectedEventId: string; reason?: string };
const clean = (v: string) => v.normalize("NFC").trim();
function normalizeWorkflow<T extends ConsentTripWorkflow>(v: T): T { return Object.fromEntries(Object.entries(v).map(([key, value]) => [key, typeof value === "string" ? clean(value) : value])) as T; }
export async function executeConsentTrip(store: LocalDataStore, input: { scope: ActiveClassroomScope; command: ConsentTripCommand; now?: Date }): Promise<ConsentTripRecord> {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Kayıt saati geçersiz.");
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope || scope.academicYearId !== input.scope.academicYearId || scope.classroomId !== input.scope.classroomId) throw new Error("Etkin sınıf değişti. Güncel sınıfın izin/gezi alanını yeniden açın.");
    assertConsentTripRelationships(snapshot);
    const records = consentTripRecords(snapshot);
    const command = input.command;
    const today = civilDateInIstanbul(now);
    const maxTimestamp = records.reduce((max, r) => Math.max(max, Date.parse(r.createdAt)), 0);
    // Monotonic milliseconds make equal-clock appends deterministic across tabs.
    if (maxTimestamp > now.getTime() + 60_000) throw new Error("Cihaz saati önceki kayıtların gerisinde. Saati doğrulayıp tekrar deneyin.");
    const createdAt = new Date(Math.max(now.getTime(), maxTimestamp + 1)).toISOString();
    let studentId: string | null = null;
    let workflow: ConsentTripWorkflow;
    if (command.action === "document") {
      const previous = command.document.previousDocumentId ? records.find(r => r.id === command.document.previousDocumentId) : undefined;
      if (command.document.previousDocumentId && (!previous || previous.workflow.kind !== "consent-document" || previous.classroomId !== scope.classroomId || previous.academicYearId !== scope.academicYearId)) throw new Error("Önceki belge sürümü bulunamadı.");
      const old = previous?.workflow.kind === "consent-document" ? previous.workflow : undefined;
      workflow = { ...command.document, kind: "consent-document", documentKey: old?.documentKey ?? crypto.randomUUID(), version: old ? old.version + 1 : 1, eventId: old?.eventId ?? (command.document.purpose === "trip" ? crypto.randomUUID() : command.purposeEventId ?? null) };
    } else if (command.action === "decision") {
      studentId = command.studentId;
      const child = snapshot.students.find(s => s.id === studentId && typeof s.deletedAt !== "string");
      if (!child || child.active === false || child.classroomId !== scope.classroomId || child.academicYearId !== scope.academicYearId) throw new Error("İzin kaydı için etkin sınıf kapsamındaki çocuğu seçin.");
      workflow = { kind: "consent-decision", ...command.decision };
    } else if (command.action === "plan") {
      const eligible = new Set(consentTripEligibleStudents(snapshot, scope, command.plan.plannedOn).map(s => s.id));
      if (command.plan.selectedStudentIds.some(s => !eligible.has(s))) throw new Error("Seçilen çocuklardan biri gezi gününde sınıf kapsamı dışında. Kadroyu yenileyin.");
      workflow = { kind: "trip-plan", ...command.plan, redactedParticipantCount: 0 };
    } else {
      const plan = records.find(r => r.id === command.tripId && r.workflow.kind === "trip-plan" && r.classroomId === scope.classroomId && r.academicYearId === scope.academicYearId);
      if (!plan || plan.workflow.kind !== "trip-plan") throw new Error("Gezi planı etkin sınıfta bulunamadı.");
      const planDocumentId = plan.workflow.documentId;
      const state = tripState(records, plan.id);
      if (state.latestEventId !== command.expectedEventId) throw new Error("Gezi sayımı başka oturumda değişti. Sayımı yenileyip yeniden işaretleyin.");
      const linked = { tripId: plan.id, previousEventId: command.expectedEventId };
      if (command.action === "start") {
        if (state.status !== "planned" || state.start) throw new Error("Bu gezi zaten başlatılmış veya iptal edilmiş.");
        if (today !== plan.workflow.plannedOn) throw new Error("Gezi yalnız planlanan günün gerçek başlangıç zamanında başlatılabilir.");
        const eligible = new Set(consentTripEligibleStudents(snapshot, scope, today).map(s => s.id));
        const document = records.find(r => r.id === planDocumentId);
        if (!document || document.workflow.kind !== "consent-document") throw new Error("Gezi izin belgesi bulunamadı.");
        const roster = plan.workflow.selectedStudentIds.map(id => {
          if (!eligible.has(id)) throw new Error("Başlangıç kadrosunda gezi günü sınıf kapsamı dışında bir çocuk var. Planı yeniden oluşturun.");
          const resolved = resolveConsentForUse(snapshot, { ...scope, studentId: id, purpose: "trip", eventId: document.workflow.kind === "consent-document" ? document.workflow.eventId : null, documentId: document.id, civilDate: today, asOfUtc: createdAt });
          if (!resolved.allowed || !resolved.decision) throw new Error(resolved.reason + " Kadrodaki bütün izinleri tamamlayın.");
          return { studentId: id, consentDecisionId: resolved.decision.id };
        });
        if (!roster.length) throw new Error("Geziyi başlatmak için en az bir mevcut çocuk gerekli.");
        workflow = { kind: "trip-start", ...linked, startedAt: now.toISOString(), roster, redactedParticipantCount: plan.workflow.redactedParticipantCount };
      } else if (command.action === "check") {
        studentId = command.studentId;
        const previous = latestTripCheck(records, plan.id, studentId, command.stage);
        if ((previous?.id ?? null) !== command.previousCheckId) throw new Error("Çocuğun sayımı değişti. Son kaydı açıp düzeltin.");
        if (command.actualAt > now.toISOString() || civilDateInIstanbul(new Date(command.actualAt)) !== today) throw new Error("Sayım gelecekte olamaz ve gerçek gezi gününe ait olmalı.");
        workflow = { kind: "trip-check", ...linked, stage: command.stage, outcome: command.outcome, actualAt: command.actualAt, previousCheckId: command.previousCheckId, correctionReason: command.correctionReason, note: command.note };
      } else if (command.action === "complete") workflow = { kind: "trip-complete", ...linked, completedAt: now.toISOString() };
      else workflow = { kind: command.action === "cancel" ? "trip-cancel" : "trip-reopen", ...linked, reason: command.reason ?? "" };
    }
    const record: ConsentTripRecord = { id: crypto.randomUUID(), ...scope, createdAt, updatedAt: createdAt, civilDate: today, schemaVersion: 1, deletedAt: null, settingType: CONSENT_TRIP_SETTING_TYPE, studentId, workflow: normalizeWorkflow(workflow) };
    if (!isConsentTripRecord(record)) throw new Error("İzin/gezi alanlarını ve tarihlerini kontrol edin; kayıt oluşturulmadı.");
    snapshot.settings.push(record);
    assertConsentTripRelationships(snapshot);
    await transaction.putMany("settings", [record]);
    return record;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_TRIPS_CHANGED_EVENT));
  return result;
}
export async function readConsentTripSnapshot(store: LocalDataStore): Promise<DataSnapshot> {
  return store.transaction("readonly", COLLECTION_NAMES, async transaction => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    return snapshot;
  });
}
