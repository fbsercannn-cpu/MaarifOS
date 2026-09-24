import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ACTIVE_CLASSROOM_SETTING_ID } from "../../src/core/domain/classroom.ts";
import { assertFamilyEngagementRelationships, appointmentState, availableFamilySlots, familyCalendarDay, familyContactSnapshot, familyEngagementRecords, familyEngagementReminders, familyLocalToUtc, isFamilyEngagementRecord, resolveCommunicationPreference } from "../../src/core/domain/family-engagement.ts";
import { assertTeacherFollowupRelationships, teacherFollowups } from "../../src/core/domain/teacher-followup.ts";
import { executeFamilyEngagement } from "../../src/features/family-engagement/family-engagement-service.ts";
import { familyAppointmentPdfRecipe } from "../../src/features/family-engagement/family-engagement-document.ts";
import { FamilyMemoryStore, familyFixture, familyNow, familyPreference, familyScope, familyStudentId, familyUid, seedFamilyEngagementFixture } from "../fixtures/family-engagement-fixture.mjs";
const run = (store, command, overrides = {}) => executeFamilyEngagement(store, { scope: familyScope, now: familyNow, command, ...overrides });
const windowCommand = (overrides = {}) => ({ action: "availability", availability: { scheduledOn: "2026-09-18", startTime: "14:00", endTime: "16:00", slotMinutes: 20, calendarNote: "", ...overrides } });
async function appointmentCommand(store, availability, overrides = {}) {
  const snapshot = await store.readSnapshot();
  return { action: "appointment", studentId: familyStudentId, appointment: { previousEventId: null, availabilityId: availability.id, contact: familyContactSnapshot(snapshot.students[0].contacts[0]), scheduledOn: "2026-09-18", startTime: "14:00", endTime: "14:20", location: "Kurgu görüşme odası", purpose: "Kurgu uyum görüşmesi", reason: "", calendarNote: "", ...overrides } };
}
async function booked() { const store = new FamilyMemoryStore(); const a = await run(store, windowCommand()); const r = await run(store, await appointmentCommand(store, a)); return { store, a, r }; }

test("İstanbul sivil gün/saat UTC ile tam eşleşir; olanaksız gün ve saat reddedilir", () => {
  assert.equal(familyLocalToUtc("2026-09-18", "00:20"), "2026-09-17T21:20:00.000Z");
  assert.equal(familyLocalToUtc("2026-09-18", "14:00"), "2026-09-18T11:00:00.000Z");
  for (const [d, t] of [["2026-02-30", "12:00"], ["2026-09-18", "24:00"]]) assert.throws(() => familyLocalToUtc(d, t));
});
test("uygun aralık gerçek dilimler üretir; yeni randevu yalnız seçilen dilimi doldurur", async () => {
  const { store } = await booked(), snapshot = await store.readSnapshot();
  const slots = availableFamilySlots(snapshot, familyScope, "2026-09-18");
  assert.equal(slots.length, 6); assert.equal(slots.filter(s => s.available).length, 5); assert.equal(slots[0].available, false);
  assertFamilyEngagementRelationships(snapshot);
});
test("aynı öğretmenin başka sınıfındaki eşzamanlı randevu atomik reddedilir", async () => {
  const { store } = await booked();
  const secondScope = { ...familyScope, classroomId: familyUid(100) }, s = store.snapshot;
  s.classrooms.push({ ...s.classrooms[0], id: secondScope.classroomId });
  s.students.push({ ...s.students[0], id: familyUid(101), classroomId: secondScope.classroomId, enrollments: [{ ...s.students[0].enrollments[0], id: familyUid(102), classroomId: secondScope.classroomId }], contacts: [{ ...s.students[0].contacts[0], id: familyUid(103) }] });
  s.settings.find(r => r.id === ACTIVE_CLASSROOM_SETTING_ID).classroomId = secondScope.classroomId;
  const availability = await run(store, windowCommand(), { scope: secondScope });
  const command = await appointmentCommand(store, availability); command.studentId = familyUid(101); command.appointment.contact = familyContactSnapshot(s.students[1].contacts[0]);
  const before = await store.readSnapshot(); await assert.rejects(run(store, command, { scope: secondScope }), /başka bir sınıf veya yılda/u); assert.deepEqual(await store.readSnapshot(), before);
});
test("eşzamanlı iki rezervasyonda tek işlem kazanır; ikinci işlem boş yer varsayımına güvenmez", async () => {
  const store = new FamilyMemoryStore(), a = await run(store, windowCommand()), command = await appointmentCommand(store, a);
  const results = await Promise.allSettled([run(store, command), run(store, command)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(familyEngagementRecords(await store.readSnapshot()).filter(r => r.workflow.kind === "appointment").length, 1);
});
test("randevu değişikliği geçmişi korur ve önceki saati serbest bırakır", async () => {
  const { store, a, r } = await booked(), before = structuredClone(r);
  const command = await appointmentCommand(store, a, { previousEventId: r.id, startTime: "14:20", endTime: "14:40", reason: "Yakın saat değişikliği istedi" }); command.appointmentId = r.workflow.appointmentId;
  const revised = await run(store, command), s = await store.readSnapshot(), slots = availableFamilySlots(s, familyScope, "2026-09-18");
  assert.deepEqual(s.settings.find(e => e.id === r.id), before); assert.equal(appointmentState(familyEngagementRecords(s), r.workflow.appointmentId).last.id, revised.id); assert.equal(slots[0].available, true); assert.equal(slots[1].available, false);
});
test("eski sekmenin iptal veya değişiklik komutu yeni geçmişi ezemez", async () => {
  const { store, a, r } = await booked(); const cmd = await appointmentCommand(store, a, { previousEventId: r.id, startTime: "14:20", endTime: "14:40", reason: "İlk değişiklik" }); cmd.appointmentId = r.workflow.appointmentId; await run(store, cmd);
  const before = await store.readSnapshot(); await assert.rejects(run(store, { action: "cancel", appointmentId: r.workflow.appointmentId, expectedEventId: r.id, reason: "Eski ekran" }), /başka oturumda/u); assert.deepEqual(await store.readSnapshot(), before);
});
test("gerekçeli iptal randevuyu kapatır; eski olay durur ve saat açılır", async () => {
  const { store, r } = await booked(); await run(store, { action: "cancel", appointmentId: r.workflow.appointmentId, expectedEventId: r.id, reason: "Veli yeniden gün belirleyecek" });
  const s = await store.readSnapshot(); assert.equal(appointmentState(familyEngagementRecords(s), r.workflow.appointmentId).status, "cancelled"); assert.equal(availableFamilySlots(s, familyScope, "2026-09-18")[0].available, true); assert.equal(familyEngagementReminders(s, "2026-09-18").length, 0);
});
test("aktif randevulu aralık kapatılamaz; iptalden sonra gerekçeyle kapanır", async () => {
  const { store, a, r } = await booked(); await assert.rejects(run(store, { action: "close-availability", availabilityId: a.id, reason: "Program değişti" }), /önce randevuları/u);
  await run(store, { action: "cancel", appointmentId: r.workflow.appointmentId, expectedEventId: r.id, reason: "Program değişti" }); await run(store, { action: "close-availability", availabilityId: a.id, reason: "Yeni gün belirlenecek" }); assert.equal(availableFamilySlots(await store.readSnapshot(), familyScope, "2026-09-18").length, 0);
});
test("arşivlenen çocuğun randevusu gerekçeyle iptal edilebilir; öğretmenin saati kilitli kalmaz", async () => {
  const { store, r } = await booked(); store.snapshot.students[0].active = false; store.snapshot.students[0].deletedAt = "2026-09-18T09:00:00.000Z";
  await run(store, { action: "cancel", appointmentId: r.workflow.appointmentId, expectedEventId: r.id, reason: "Çocuk arşivlendi; randevu kapatıldı" }); assert.equal(availableFamilySlots(store.snapshot, familyScope, "2026-09-18")[0].available, true);
});
test("tatil ve yerel kapanış ortak takvimden görünür; gerekçesiz randevu açılmaz", async () => {
  const store = new FamilyMemoryStore(); const saturday = windowCommand({ scheduledOn: "2026-09-19" });
  assert.ok(familyCalendarDay(store.snapshot, familyScope, "2026-09-19").reasons.includes("weekend")); await assert.rejects(run(store, saturday), /gerekçesini/u);
  saturday.availability.calendarNote = "Veliyle kararlaştırılan çevrim içi görüşme"; await run(store, saturday);
  store.snapshot.calendarEntries.push({ ...store.snapshot.classrooms[0], id: familyUid(200), entryType: "no_school", status: "planned", title: "Kurgu okul kapanışı", startDate: "2026-09-18", endDate: "2026-09-18" });
  assert.ok(familyCalendarDay(store.snapshot, familyScope, "2026-09-18").reasons.includes("local-closure")); await assert.rejects(run(store, windowCommand()), /kapanışı/u);
});
test("gelecek değil geçmiş randevu, yıl dışı ve gerçek dilime uymayan saat reddedilir", async () => {
  const store = new FamilyMemoryStore(), a = await run(store, windowCommand());
  await assert.rejects(run(store, windowCommand({ scheduledOn: "2026-09-17" })), /geçmişte/u);
  await assert.rejects(run(store, windowCommand({ scheduledOn: "2027-07-01" })), /dışında/u);
  await assert.rejects(run(store, await appointmentCommand(store, a, { startTime: "14:05", endTime: "14:25" })), /aralığına/u);
});
test("sahte veya değişmiş contact bilgisi ile kayıt yapılmaz", async () => {
  const store = new FamilyMemoryStore(), a = await run(store, windowCommand()), cmd = await appointmentCommand(store, a); cmd.appointment.contact.id = familyUid(999);
  await assert.rejects(run(store, cmd), /Yakın kişinin/u);
  const preference = familyPreference(store.snapshot.students[0].contacts[0]); store.snapshot.students[0].contacts[0].name = "Kurgu Düzeltilen Anne";
  await assert.rejects(run(store, { action: "preference", studentId: familyStudentId, preference }), /Yakın kişinin/u);
});
test("anne baba üçüncü kişinin dil/kanal/erişim bildirimleri birbirine yayılmaz", async () => {
  const store = new FamilyMemoryStore();
  for (const [i, c] of store.snapshot.students[0].contacts.entries()) await run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(c, null, { channels: i === 0 ? ["phone"] : i === 1 ? ["sms"] : ["in-person"], language: i === 1 ? "" : "Türkçe", formats: i === 2 ? ["large-print"] : ["text"] }) });
  const s = await store.readSnapshot(); assert.equal(resolveCommunicationPreference(s, familyScope, familyStudentId, familyUid(5)).preference.channels[0], "phone"); assert.equal(resolveCommunicationPreference(s, familyScope, familyStudentId, familyUid(6)).preference.language, ""); assert.deepEqual(resolveCommunicationPreference(s, familyScope, familyStudentId, familyUid(7)).preference.formats, ["large-print"]);
});
test("bildirilmemiş tercih uydurulmaz; profil değişince önceki tercih uygulanmaz", async () => {
  const store = new FamilyMemoryStore(); assert.equal(resolveCommunicationPreference(store.snapshot, familyScope, familyStudentId, familyUid(5)).state, "not-declared");
  await run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(store.snapshot.students[0].contacts[0]) }); store.snapshot.students[0].contacts[0].name = "Kurgu Farklı Kişi";
  assert.equal(resolveCommunicationPreference(store.snapshot, familyScope, familyStudentId, familyUid(5)).state, "contact-changed"); store.snapshot.students[0].contacts = []; assert.equal(resolveCommunicationPreference(store.snapshot, familyScope, familyStudentId, familyUid(5)).state, "contact-removed"); assertFamilyEngagementRelationships(store.snapshot);
});
test("tercih geri çekme ve yeni bildirim append-only; eski sürüm reddedilir", async () => {
  const store = new FamilyMemoryStore(), c = store.snapshot.students[0].contacts[0]; const first = await run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(c) });
  await run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(c, first.id, { status: "withdrawn", note: "Veli geri çekti" }) });
  await assert.rejects(run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(c, first.id) }), /eski veya dallanmış/u); assert.equal(resolveCommunicationPreference(store.snapshot, familyScope, familyStudentId, c.id).state, "withdrawn"); assert.equal(familyEngagementRecords(store.snapshot).length, 2);
});
test("tercih sözleşmesi gelecek bildirim, ters saat, tanı alanı ve tekrar kanal kabul etmez", async () => {
  const store = new FamilyMemoryStore(), c = store.snapshot.students[0].contacts[0];
  for (const invalid of [{ reportedOn: "2026-09-19" }, { availableUntil: "13:00" }, { channels: ["phone", "phone"] }, { diagnosis: "uydurma" }]) await assert.rejects(run(store, { action: "preference", studentId: familyStudentId, preference: familyPreference(c, null, invalid) }));
  assert.equal(familyEngagementRecords(store.snapshot).length, 0);
});
test("görüşme tamamlanması gerçek teacher-followup ve randevu bağlantısını atomik kaydeder", async () => {
  const store = new FamilyMemoryStore(), result = await seedFamilyEngagementFixture(store), s = await store.readSnapshot();
  assertTeacherFollowupRelationships(s); assertFamilyEngagementRelationships(s); const meeting = teacherFollowups(s)[0]; assert.equal(meeting.workflow.kind, "family-meeting"); assert.equal(result.meeting.workflow.meetingId, meeting.id); assert.equal(meeting.workflow.followupOn, "2026-09-25"); assert.equal(appointmentState(familyEngagementRecords(s), result.appointment.workflow.appointmentId).status, "completed");
});
test("gerçekleşmemiş/yanlış gün görüşmesi reddedilir; disk kesintisi yarım bağlantı bırakmaz", async () => {
  const { store, r } = await booked(); const command = { action: "meeting", appointmentId: r.workflow.appointmentId, expectedEventId: r.id, actualAtUtc: "2026-09-18T11:00:00.000Z", participants: "Kurgu veli", discussion: "Kurgu konu", decision: "Kurgu karar", followupOn: null };
  await assert.rejects(run(store, command), /gelecekte/u); await assert.rejects(run(store, { ...command, actualAtUtc: "2026-09-19T11:00:00.000Z" }, { now: new Date("2026-09-19T12:00:00Z") }), /gerçek veli görüşmesiyle/u);
  const before = await store.readSnapshot(); store.failWrites = true; await assert.rejects(run(store, command, { now: new Date("2026-09-18T12:00:00Z") }), /disk/u); assert.deepEqual(await store.readSnapshot(), before);
});
test("yedek ilişkisi yetim, yanlış çocuk ve geçmiş dallanmasını reddeder", async () => {
  const { store, r } = await booked(), snapshot = await store.readSnapshot();
  for (const change of [s => { s.settings.find(e => e.id === r.id).workflow.availabilityId = familyUid(900); }, s => { s.settings.find(e => e.id === r.id).studentId = familyUid(901); }, s => { s.settings.push({ ...structuredClone(r), id: familyUid(902), createdAt: "2026-09-18T09:00:02.000Z", updatedAt: "2026-09-18T09:00:02.000Z" }); }]) { const s = structuredClone(snapshot); change(s); assert.throws(() => assertFamilyEngagementRelationships(s)); }
  const extra = { ...r, invented: true }; assert.equal(isFamilyEngagementRecord(extra), false);
});
test("hatırlatma tamamlanmamış randevuyu tarihiyle taşır; gelecek güne sonuç uydurmaz", async () => {
  const { store, r } = await booked(); assert.deepEqual(familyEngagementReminders(store.snapshot, "2026-09-17"), []); assert.equal(familyEngagementReminders(store.snapshot, "2026-09-18")[0].id, r.workflow.appointmentId); assert.equal(familyEngagementReminders(store.snapshot, "2026-09-19")[0].title, "Veli randevusunun sonucunu kaydet");
});
test("kişiye özel ve ortak PDF farklı kapsamlı gerçek PDF üretir", async t => {
  t.mock.method(globalThis, "fetch", async path => { assert.equal(path, "/assets/fonts/MaarifOSSans-Regular.ttf"); return new Response(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")); });
  const { store, r } = await booked(), snapshot = await store.readSnapshot();
  for (const appointmentId of [undefined, r.workflow.appointmentId]) {
    const recipe = familyAppointmentPdfRecipe(snapshot, { scope: familyScope, scheduledOn: "2026-09-18", appointmentId });
    const file = await recipe.build(recipe.initial);
    assert.equal(Buffer.from(file.bytes.subarray(0, 5)).toString(), "%PDF-");
    assert.equal(file.mimeType, "application/pdf");
    if (appointmentId) {
      assert.deepEqual(recipe.students, [{ id: familyStudentId, label: "Kurgu Randevu Çocuğu" }]);
      assert.deepEqual(recipe.initial.studentIds, [familyStudentId]);
      await assert.rejects(recipe.build({ ...recipe.initial, studentIds: [] }), /geçerli öğrenci/u);
      await assert.rejects(recipe.build({ ...recipe.initial, studentIds: [familyUid(999)] }), /geçerli öğrenci/u);
    } else {
      assert.equal(recipe.students, undefined);
      assert.equal(recipe.initial.studentIds, undefined);
    }
  }
});
