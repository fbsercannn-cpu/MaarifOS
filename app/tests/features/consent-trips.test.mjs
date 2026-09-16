import assert from "node:assert/strict";
import test from "node:test";
import { assertConsentTripRelationships, consentTripRecords, consentTripReminders, documentedSharingConsentSummary, isConsentTripRecord, resolveConsentForUse, tripState } from "../../src/core/domain/consent-trips.ts";
import { executeConsentTrip } from "../../src/features/consent-trips/consent-trip-service.ts";
import { createStudentDossier } from "../../src/features/reports/student-dossier.ts";
import { ConsentMemoryStore, consentScope as scope, consentChildren as children, consentNow as now, consentUid as uid } from "../fixtures/consent-trip-fixture.mjs";
const documentInput = { previousDocumentId: null, title: "Kurgu müze gezisi izin belgesi", purpose: "trip", eventTitle: "Kurgu Müze Gezisi", body: "Belirtilen etkinlik için veli kararının kaynak metni.", validFrom: "2026-09-01", validUntil: "2027-06-30" };
const record = (store, command, date = now) => executeConsentTrip(store, { scope, command, now: date });
const define = (store, input = documentInput) => record(store, { action: "document", document: input });
const decide = (store, documentId, studentId = children[0], values = {}) => record(store, { action: "decision", studentId, decision: { documentId, previousDecisionId: null, decision: "grant", signedOn: "2026-09-08", validFrom: "2026-09-01", validUntil: "2027-06-30", signatory: "Kurgu Veli", signatoryRole: "Veli", source: "signed-paper", sourceReference: "Kurgu dosya / sayfa 1", note: "", ...values } });
const resolve = (store, doc, studentId = children[0], values = {}) => resolveConsentForUse(store.snapshot, { ...scope, studentId, documentId: doc.id, purpose: doc.workflow.purpose, eventId: doc.workflow.eventId, civilDate: "2026-09-08", ...values });
const createPlan = (store, documentId, values = {}) => record(store, { action: "plan", plan: { title: "Kurgu Müze Gezisi", plannedOn: "2026-09-08", destination: "Kurgu Müze", responsible: "Kurgu Öğretmen", documentId, selectedStudentIds: children, ...values } });
const action = (store, tripId, values) => record(store, { tripId, expectedEventId: tripState(consentTripRecords(store.snapshot), tripId).latestEventId, ...values });
const check = (store, tripId, studentId, stage, values = {}) => action(store, tripId, { action: "check", studentId, stage, outcome: "seen", actualAt: now.toISOString(), previousCheckId: null, correctionReason: "", note: "", ...values });
async function started() { const store = new ConsentMemoryStore(); const doc = await define(store); const grants = await Promise.all(children.map(id => decide(store, doc.id, id))); const plan = await createPlan(store, doc.id); const start = await action(store, plan.id, { action: "start" }); return { store, doc, grants, plan, start }; }

test("Belge izinleri eski profil booleanlarından türetilmez; purpose/event/scope tam eşleşir", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store);
  assert.equal(resolve(store, doc).state, "missing");
  const grant = await decide(store, doc.id); assert.ok(isConsentTripRecord(grant));
  assert.equal(resolve(store, doc).allowed, true);
  assert.equal(resolve(store, doc, children[1]).allowed, false);
  for (const values of [{ purpose: "photo-sharing" }, { eventId: uid(999) }, { classroomId: uid(998) }, { academicYearId: uid(997) }]) assert.equal(resolve(store, doc, children[0], values).allowed, false);
  assert.equal(store.snapshot.students[0].photoConsent, true);
});
test("İzin geri çekme ve yeniden verme eski kaydı korur; tarih sınırları açıktır", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store);
  const grant = await decide(store, doc.id, children[0], { validFrom: "2026-09-09", validUntil: "2026-09-20" });
  assert.equal(resolve(store, doc).state, "pending"); assert.equal(resolve(store, doc, children[0], { civilDate: "2026-09-20" }).state, "granted"); assert.equal(resolve(store, doc, children[0], { civilDate: "2026-09-21" }).state, "expired");
  const revoke = await decide(store, doc.id, children[0], { previousDecisionId: grant.id, decision: "revoke", note: "Veli etkinlik kararını değiştirdi." });
  assert.equal(resolve(store, doc).state, "revoked");
  await decide(store, doc.id, children[0], { previousDecisionId: revoke.id }); assert.equal(resolve(store, doc).allowed, true);
  assert.deepEqual(store.snapshot.settings.find(r => r.id === grant.id), grant);
});
test("Yeni belge sürümü eski izinleri devralmaz, çatal sürüm engellenir", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store); await decide(store, doc.id);
  const revised = await define(store, { ...documentInput, previousDocumentId: doc.id, body: "Değişen kaynak metni" });
  assert.equal(revised.workflow.documentKey, doc.workflow.documentKey); assert.equal(revised.workflow.version, 2);
  assert.equal(resolve(store, doc).state, "superseded"); assert.equal(resolve(store, revised).state, "missing");
  await assert.rejects(define(store, { ...documentInput, previousDocumentId: doc.id }), /sürüm zinciri/);
});
test("Fotoğraf/portfolyo özetleri birbirinden ayrı ve geri çekmeye duyarlıdır", async () => {
  const store = new ConsentMemoryStore(); const query = purpose => documentedSharingConsentSummary(store.snapshot, { scope, studentId: children[0], purpose, civilDate: "2026-09-08" });
  assert.equal(query("photo-sharing").state, "no-document");
  const doc = await define(store, { ...documentInput, purpose: "photo-sharing", eventTitle: "" }); const grant = await decide(store, doc.id);
  assert.equal(query("photo-sharing").allowed, true); assert.equal(query("portfolio-sharing").allowed, false);
  await decide(store, doc.id, children[0], { previousDecisionId: grant.id, decision: "revoke", note: "Kaynak veli kararı" }); assert.equal(query("photo-sharing").state, "revoked");
});
test("İzinsiz gezi başlayamaz; bütün izinlerle exact izin kimlikli kadro kilitlenir", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store); const plan = await createPlan(store, doc.id);
  await decide(store, doc.id); await assert.rejects(action(store, plan.id, { action: "start" }), /izin/);
  await decide(store, doc.id, children[1]); const start = await action(store, plan.id, { action: "start" });
  assert.equal(start.workflow.roster.length, 2); assert.ok(start.workflow.roster.every(r => store.snapshot.settings.some(s => s.id === r.consentDecisionId && s.studentId === r.studentId)));
  await assert.rejects(action(store, plan.id, { action: "start" }), /başlatılmış/);
});
test("Gelecek gezi planlanır ama gerçek başlangıç ve sayım geleceğe yazılamaz", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store); const plan = await createPlan(store, doc.id, { plannedOn: "2026-09-10" });
  await assert.rejects(action(store, plan.id, { action: "start" }), /yalnız planlanan gün/);
  const actual = await started(); await assert.rejects(check(actual.store, actual.plan.id, children[0], "departure", { actualAt: "2026-09-08T10:00:00.000Z" }), /gelecekte/);
  await assert.rejects(decide(store, doc.id, children[0], { signedOn: "2026-09-09" }), /tarih/);
});
test("Gezi günü geç kayıt/ayrılık üyeliği kadroya uygulanır", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store);
  store.snapshot.students[1].enrollments = [{ id: uid(505), academicYearId: scope.academicYearId, classroomId: scope.classroomId, startedOn: "2026-09-10", status: "active", schemaVersion: 1 }];
  await assert.rejects(createPlan(store, doc.id), /kapsamı dışında/);
});
test("Boş ve görülmedi sayımlar devamsızlık olmaz; eksik dönüş kapanışı engeller", async () => {
  const { store, plan } = await started(); let state = tripState(consentTripRecords(store.snapshot), plan.id);
  assert.equal(state.returned, 0); assert.equal(state.missing, 2);
  await assert.rejects(action(store, plan.id, { action: "complete" }), /dönüşü görülmeden/);
  await assert.rejects(check(store, plan.id, children[0], "return"), /önce çocuğun çıkışı/);
  await check(store, plan.id, children[0], "departure"); await check(store, plan.id, children[0], "return");
  await check(store, plan.id, children[1], "departure"); const missing = await check(store, plan.id, children[1], "return", { outcome: "not-seen" });
  state = tripState(consentTripRecords(store.snapshot), plan.id); assert.equal(state.missing, 1); assert.equal(store.snapshot.attendanceRecords.length, 0);
  await assert.rejects(action(store, plan.id, { action: "complete" }), /dönüşü görülmeden/);
  await check(store, plan.id, children[1], "return", { previousCheckId: missing.id, correctionReason: "Çocuk kontrol noktasında yeniden görüldü." });
  await action(store, plan.id, { action: "complete" }); assert.equal(tripState(consentTripRecords(store.snapshot), plan.id).status, "completed");
  assert.deepEqual(store.snapshot.settings.find(r => r.id === missing.id), missing);
});
test("Düzeltme gerekçesi zorunlu; tamamlanmış gezi ancak gerekçeyle yeniden açılır", async () => {
  const { store, plan } = await started();
  const first = await check(store, plan.id, children[0], "departure");
  await assert.rejects(check(store, plan.id, children[0], "departure", { previousCheckId: first.id }), /alanlarını/);
  for (const id of children) { if (id !== children[0]) await check(store, plan.id, id, "departure"); await check(store, plan.id, id, "return"); }
  await action(store, plan.id, { action: "complete" }); await assert.rejects(action(store, plan.id, { action: "reopen", reason: "" }), /alanlarını/);
  await action(store, plan.id, { action: "reopen", reason: "Kaynak sayım saati yeniden incelenecek." }); assert.equal(tripState(consentTripRecords(store.snapshot), plan.id).status, "active");
});
test("İptal gerekçeli; başlayan gezinin eksik dönüşünü gizleyemez", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store); const plan = await createPlan(store, doc.id);
  await action(store, plan.id, { action: "cancel", reason: "Hava koşulları nedeniyle yapılmayacak." });
  await assert.rejects(action(store, plan.id, { action: "start" }), /iptal edilmiş/);
  const startedTrip = await started(); await assert.rejects(action(startedTrip.store, startedTrip.plan.id, { action: "cancel", reason: "Geri dönülüyor" }), /dönüş sayımı/);
});
test("İki sekmenin eski gezi sürümü kayıp güncelleme yaratmaz", async () => {
  const { store, plan, start } = await started();
  const commands = children.map(studentId => record(store, { action: "check", tripId: plan.id, expectedEventId: start.id, studentId, stage: "departure", outcome: "seen", actualAt: now.toISOString(), previousCheckId: null, correctionReason: "", note: "" }));
  const results = await Promise.allSettled(commands); assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(results.filter(r => r.status === "rejected").length, 1);
  assert.equal(consentTripRecords(store.snapshot).filter(r => r.workflow.kind === "trip-check").length, 1);
});
test("Yazma kesintisi bütün kaynakları korur; kapsam değiştiren sekme reddedilir", async () => {
  const store = new ConsentMemoryStore(); const before = structuredClone(store.snapshot); store.fail = true;
  await assert.rejects(define(store), /kesintisi/); assert.deepEqual(store.snapshot, before); store.fail = false;
  await assert.rejects(executeConsentTrip(store, { scope: { ...scope, classroomId: uid(666) }, command: { action: "document", document: documentInput }, now }), /sınıf değişti/);
});
test("Yanlış kapsam, eksik kaynak, extra key ve mükerrer olay geri yüklemede reddedilir", async () => {
  const { store, plan, start } = await started(); assert.doesNotThrow(() => assertConsentTripRelationships(store.snapshot));
  for (const mutate of [s => { s.settings.find(r => r.id === start.id).workflow.extra = true; }, s => { s.settings.push(structuredClone(s.settings.find(r => r.id === start.id))); }, s => { s.settings.find(r => r.id === start.id).workflow.roster[0].consentDecisionId = uid(900); }, s => { s.settings.find(r => r.id === plan.id).classroomId = uid(998); }]) { const changed = structuredClone(store.snapshot); mutate(changed); assert.throws(() => assertConsentTripRelationships(changed)); }
});
test("Başlangıç sonrası geri çekme kaynak geçmişini bozmaz; güncel kullanımı durdurur", async () => {
  const { store, doc, grants, plan } = await started(); await decide(store, doc.id, children[0], { previousDecisionId: grants[0].id, decision: "revoke", note: "Veli yeni kararını bildirdi." });
  assert.equal(resolve(store, doc).state, "revoked"); assert.doesNotThrow(() => assertConsentTripRelationships(store.snapshot));
  await check(store, plan.id, children[0], "departure"); assert.equal(tripState(consentTripRecords(store.snapshot), plan.id).status, "active");
});
test("Hatırlatmalar sadece yakın gezi veya kapanmamış dönüşü gösterir", async () => {
  const { store, plan } = await started(); const reminders = consentTripReminders(store.snapshot, "2026-09-08");
  assert.equal(reminders.length, 1); assert.match(reminders[0].title, /2 çocuğun dönüş/);
  assert.equal(consentTripReminders(store.snapshot, "bozuk").length, 0);
});
test("Gerçek portfolyo dosyası geri çekilmiş belgeyle üretilmez; export kaydı yazılmaz", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store, { ...documentInput, purpose: "portfolio-sharing", eventTitle: "" }); const grant = await decide(store, doc.id);
  await decide(store, doc.id, children[0], { previousDecisionId: grant.id, decision: "revoke", note: "Portfolyo paylaşımı veli tarafından geri çekildi." });
  const before = structuredClone(store.snapshot);
  await assert.rejects(createStudentDossier(store, { studentId: children[0], now: new Date(now.getTime() + 1000), options: { destination: "text-export", audience: "parent", identityMode: "full", alias: "", periodStart: "2026-09-01", periodEnd: "2026-09-30", includeContacts: false, includeAttendance: false, includeObservations: false, includePortfolio: true, includeExternalFeedback: false } }), /Portfolyo dosyaya eklenemedi.*geri çekilmiş/);
  assert.deepEqual(store.snapshot, before); assert.equal(store.snapshot.exportPackages.length, 0);
});
test("Okul açılmadan veli izni hazırlanabilir; gezi başlangıcı gün üyeliğini ayrıca denetler", async () => {
  const store = new ConsentMemoryStore(); store.snapshot.academicYears[0].operationalStartDate = "2026-09-14";
  const doc = await define(store); await decide(store, doc.id); assert.equal(resolve(store, doc).state, "granted");
  await assert.rejects(createPlan(store, doc.id), /kapsamı dışında/);
});
test("Yedek ilişkisi başka sınıf çocuğunu reddeder; yıl geçişinde tarihli üyelik geçmişi korunur", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store); await decide(store, doc.id);
  const student = store.snapshot.students[0]; student.classroomId = uid(778); student.academicYearId = uid(779);
  assert.throws(() => assertConsentTripRelationships(store.snapshot), /bu sınıfın geçmişinde/);
  student.enrollments = [{ id: uid(780), ...scope, schemaVersion: 1, status: "completed", startedOn: "2026-09-01", endedOn: "2027-06-30" }];
  assert.doesNotThrow(() => assertConsentTripRelationships(store.snapshot));
});
test("Belgeye bağlı geçerli iznin son üç günü hatırlatılır; geri çekme hatırlatmayı kaldırır", async () => {
  const store = new ConsentMemoryStore(); const doc = await define(store, { ...documentInput, purpose: "photo-sharing", eventTitle: "", validUntil: "2026-09-10" });
  const grant = await decide(store, doc.id, children[0], { validUntil: "2026-09-10" });
  assert.equal(consentTripReminders(store.snapshot, "2026-09-08").length, 1);
  assert.equal(consentTripReminders(store.snapshot, "2026-09-11").length, 0);
  await decide(store, doc.id, children[0], { previousDecisionId: grant.id, decision: "revoke", validUntil: "2026-09-10", note: "Veli kararı değişti." });
  assert.equal(consentTripReminders(store.snapshot, "2026-09-08").length, 0);
});
test("Çıkış düzeltmesi sonraki görüldü kaydını çelişkili bırakamaz; gerekçeli ters sıra düzeltme korunur", async () => {
  const { store, plan } = await started(); const departure = await check(store, plan.id, children[0], "departure"); const returned = await check(store, plan.id, children[0], "return");
  await assert.rejects(check(store, plan.id, children[0], "departure", { outcome: "not-seen", previousCheckId: departure.id, correctionReason: "Yanlış çocuk satırı işaretlendi." }), /Sonraki aşamada/);
  await check(store, plan.id, children[0], "return", { outcome: "not-seen", previousCheckId: returned.id, correctionReason: "Önce yanlış dönüş işareti düzeltildi." });
  await check(store, plan.id, children[0], "departure", { outcome: "not-seen", previousCheckId: departure.id, correctionReason: "Yanlış çıkış işareti de düzeltildi." });
  assert.deepEqual(store.snapshot.settings.find(r => r.id === departure.id), departure); assert.deepEqual(store.snapshot.settings.find(r => r.id === returned.id), returned);
  assert.equal(tripState(consentTripRecords(store.snapshot), plan.id).missing, 2);
});
