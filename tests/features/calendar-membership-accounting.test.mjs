import test from "node:test";
import assert from "node:assert/strict";
import { calendarAccountingFixture, accountingScope as scope, accountingId as id, accountingEpisode as episode, accountingRecord as record, AccountingMemoryStore } from "../fixtures/calendar-accounting-fixture.mjs";
import { resolveSchoolDay, resolveTeachingCivilDate, resolveTeacherWeekTeachingDays, localNoSchoolPeriodsFromCalendarEntries, schoolCivilDates } from "../../src/core/domain/school-calendar.ts";
import { resolveStudentMembershipOn, studentMembershipOverlaps } from "../../src/core/domain/student-membership.ts";
import { buildAttendanceDayBreakdown } from "../../src/features/attendance/attendance-day-breakdown.ts";
import { resolveTeacherDayClosureWorkspace, closeTeacherDay, isTeacherDayClosureSetting } from "../../src/features/day-closure/teacher-day-closure.ts";
import { saveCalendarEntry, removeCalendarEntry } from "../../src/features/calendar/academic-calendar.ts";
import { loadStudentAttendanceHistory } from "../../src/features/attendance/attendance-history.ts";
import { membershipContains } from "../../src/features/development/development-overview.ts";
import { buildStudentLongitudinalArchiveFromSnapshot } from "../../src/features/archive/academic-year-archive.ts";
const options = { scope, periodStart: "2026-09-14", periodEnd: "2026-09-20", asOfCivilDate: "2026-09-20" };

test("devam payı, kayıt kapsamı ve eksik yoklama ayrılır; tatil, geç kayıt ve dönüş boşluğu paydadan çıkar", () => {
  const snapshot = calendarAccountingFixture(); const before = structuredClone(snapshot);
  const result = buildAttendanceDayBreakdown(snapshot, options);
  assert.deepEqual(result.totals, { expectedStudentDays: 6, recordedStudentDays: 3, presentStudentDays: 1, lateStudentDays: 1, absentStudentDays: 1, missingStudentDays: 3, excludedStudentDays: 15, attendanceNumerator: 2, attendanceDenominator: 3, coverageNumerator: 3, coverageDenominator: 6 });
  const row = (day, student) => result.days.find(d => d.civilDate === day).rows.find(r => r.studentId === id(student));
  assert.equal(row("2026-09-14", 7111).status, "late");
  assert.equal(row("2026-09-14", 7112).reason, "before-enrollment");
  assert.equal(row("2026-09-17", 7111).reason, "between-enrollments");
  assert.equal(row("2026-09-15", 7111).reason, "local-closure");
  assert.equal(row("2026-09-19", 7111).reason, "weekend");
  assert.equal(row("2026-09-18", 7112).classification, "missing");
  assert.equal(row("2026-09-18", 7112).canonicalRecordId, id(7308));
  assert.deepEqual(snapshot, before);
});

test("geçersiz ve mükerrer kaynaklar kaybolmaz; başka sınıf kanonik kaydı bu sınıfı değiştirmez", () => {
  const result = buildAttendanceDayBreakdown(calendarAccountingFixture(), options);
  for (const [record, reason] of [[7301, "duplicate-record"], [7306, "invalid-record"], [7307, "duplicate-record"], [7308, "deleted-record"], [7309, "excluded-day"], [7310, "unknown-student"], [7311, "invalid-record"]]) assert.ok(result.sourceIssues.some(i => i.recordId === id(record) && i.reason === reason), `${record}:${reason}`);
  assert.equal(result.sourceIssues.some(i => i.recordId === id(7303)), false);
  assert.equal(result.days[0].rows.find(row => row.studentId === id(7113)).membership.reason, "invalid-membership");
  assert.equal(buildAttendanceDayBreakdown(calendarAccountingFixture(), { ...options, asOfCivilDate: "2026-09-17" }).totals.expectedStudentDays, 4);
});

test("ortak üyelik sözleşmesi sınırları dahil tutar; bozuk veya boş açık geçmiş eski root kapsamına dönmez", () => {
  const s = calendarAccountingFixture(), academicYear = s.academicYears[0], student = s.students[0];
  const at = (day, row = student) => resolveStudentMembershipOn(row, { ...scope, academicYear, civilDate: day });
  assert.equal(at("2026-09-16").eligible, true); assert.equal(at("2026-09-17").eligible, false); assert.equal(at("2026-09-18").eligible, true);
  assert.equal(at("2026-09-18", { ...student, enrollments: [] }).reason, "outside-scope");
  assert.equal(at("2026-09-18", { ...student, enrollments: "bad" }).reason, "invalid-membership");
  const repeated = { ...student, enrollments: [episode(7220, "2026-09-14"), episode(7220, "2026-09-14"), episode(7221, "2026-09-14")] };
  assert.deepEqual(at("2026-09-18", repeated).issues.map(i => i.code), ["duplicate-episode", "overlapping-episodes"]);
  assert.equal(studentMembershipOverlaps(student, { ...scope, academicYear, periodStart: "2026-09-17", periodEnd: "2026-09-17" }), false);
  assert.equal(studentMembershipOverlaps(student, { ...scope, academicYear, periodStart: "2026-09-17", periodEnd: "2026-09-18" }), true);
  for (const day of schoolCivilDates(options.periodStart, options.periodEnd)) assert.equal(membershipContains(student, scope, day, academicYear), at(day).eligible);
});

test("erken çalışma başlangıcı hazırlanmış ilk üyeliği açar; sonradan gelen öğrencinin sınırını öne çekmez", () => {
  const year = { id: scope.academicYearId, startDate: "2026-09-14", operationalStartDate: "2026-09-07", endDate: "2027-08-31" };
  const student = record(7111, { enrollments: [episode(7230, "2026-09-14")] });
  assert.equal(resolveStudentMembershipOn(student, { ...scope, academicYear: year, civilDate: "2026-09-07" }).eligible, true);
  assert.equal(resolveStudentMembershipOn({ ...student, enrollments: [episode(7230, "2026-09-15")] }, { ...scope, academicYear: year, civilDate: "2026-09-07" }).reason, "before-enrollment");
  assert.equal(resolveSchoolDay({ academicYear: year, civilDate: "2026-09-07" }).reason, "adaptation");
  assert.equal(resolveSchoolDay({ academicYear: year, civilDate: "2026-11-16" }).reason, "official-break");
  assert.equal(resolveSchoolDay({ academicYear: year, civilDate: "2027-01-01" }).reason, "full-day-holiday");
});

test("haftalık plan ve gün sonu aynı takvim ve çocuk-gün toplamını kullanır", () => {
  const snapshot = calendarAccountingFixture(), result = buildAttendanceDayBreakdown(snapshot, options);
  const weekly = resolveTeacherWeekTeachingDays({ academicYear: snapshot.academicYears[0], weekly: { id: id(7500), periodStart: options.periodStart, periodEnd: options.periodEnd }, explicitNoSchoolPeriods: localNoSchoolPeriodsFromCalendarEntries(snapshot.calendarEntries, scope) });
  assert.deepEqual(weekly.expectedCivilDates, result.days.filter(day => day.calendar.isTeachingDay).map(day => day.civilDate));
  for (const day of result.days) {
    const closure = resolveTeacherDayClosureWorkspace(snapshot, day.civilDate);
    assert.equal(closure.evidence.expectedStudentCount, day.rows.filter(row => row.classification !== "excluded").length);
    assert.equal(closure.evidence.attendanceMarkedCount, day.rows.filter(row => row.classification === "counted").length);
    if (!day.calendar.isTeachingDay) assert.equal(closure.issues.some(issue => ["no-students", "attendance-incomplete", "daily-plan-missing"].includes(issue.code)), false);
  }
});

test("kapanış gününde gözlem korunur; kayıt ve takvim yeniden yüklenir, takvim değişikliği kapanışı stale yapar", async () => {
  const snapshot = calendarAccountingFixture(); snapshot.observations.push(record(7601, { civilDate: "2026-09-15", studentIds: [id(7111)] }));
  const store = new AccountingMemoryStore(snapshot);
  const closed = await closeTeacherDay(store, { civilDate: "2026-09-15", nextDayNote: "Gözlemin program bağı öğretmen tarafından incelenecek.", now: new Date("2026-09-15T12:00:00.000Z") });
  assert.equal(isTeacherDayClosureSetting(closed), true); assert.equal(closed.evidence.isTeachingDay, false); assert.equal(closed.evidence.observationCount, 1);
  const reloaded = new AccountingMemoryStore(JSON.parse(JSON.stringify(await store.readSnapshot())));
  assert.equal(resolveTeacherDayClosureWorkspace(await reloaded.readSnapshot(), "2026-09-15").status, "closed");
  await removeCalendarEntry(reloaded, { id: id(7401), now: new Date("2026-09-15T13:00:00.000Z") });
  assert.equal(resolveTeacherDayClosureWorkspace(await reloaded.readSnapshot(), "2026-09-15").status, "stale");
  assert.equal(buildAttendanceDayBreakdown(await reloaded.readSnapshot(), options).totals.expectedStudentDays, 7);
  assert.equal((await reloaded.readSnapshot()).observations.length, 1);
});

test("aynı öğrencinin farklı sınıf geçmişleri ayrı kanonik kayıt tutar ve arşiv takvim kaynaklarını taşır", async () => {
  const snapshot = calendarAccountingFixture(); const store = new AccountingMemoryStore(snapshot);
  const all = await loadStudentAttendanceHistory(store, id(7111), { fromCivilDate: "2026-09-14", toCivilDate: "2026-09-14" });
  assert.equal(all.length, 2);
  const current = await loadStudentAttendanceHistory(store, id(7111), { fromCivilDate: "2026-09-14", toCivilDate: "2026-09-14", scope });
  assert.deepEqual(current.map(r => r.id), [id(7302)]);
  const archive = buildStudentLongitudinalArchiveFromSnapshot(snapshot, { studentId: id(7111), now: new Date("2026-09-20T12:00:00.000Z") });
  assert.deepEqual(archive.calendarEntries.map(record => record.id), [id(7401)]);
});

test("özel yıl hafta içi politikası ve yerel kapanışın kaydet-oku-iptal zinciri ortak hesapta hemen görülür", async () => {
  const snapshot = calendarAccountingFixture(); snapshot.calendarEntries = []; snapshot.academicYears[0] = { ...snapshot.academicYears[0], startDate: "2026-09-14", endDate: "2026-09-30" };
  const store = new AccountingMemoryStore(snapshot);
  assert.equal(resolveSchoolDay({ academicYear: snapshot.academicYears[0], civilDate: "2026-09-15" }).reason, "custom-weekday");
  await saveCalendarEntry(store, { id: id(7402), title: "Kurgu yerel karar", entryType: "no_school", startDate: "2026-09-16", status: "planned", now: new Date("2026-09-14T12:00:00.000Z") });
  const closed = buildAttendanceDayBreakdown(await store.readSnapshot(), options);
  assert.equal(closed.days.find(day => day.civilDate === "2026-09-16").calendar.reason, "local-closure");
  await saveCalendarEntry(store, { id: id(7402), title: "Kurgu yerel karar", entryType: "no_school", startDate: "2026-09-16", status: "cancelled", now: new Date("2026-09-14T13:00:00.000Z") });
  assert.equal(buildAttendanceDayBreakdown(await store.readSnapshot(), options).days.find(day => day.civilDate === "2026-09-16").calendar.isTeachingDay, true);
});


test("plan tarihi önerisi aynı yılın öğretim gününde kalır, yerel kapanış ve özel yıl uygulanır", () => {
  const snapshot = calendarAccountingFixture();
  const context = { academicYear: snapshot.academicYears[0], classroomId: scope.classroomId, calendarEntries: snapshot.calendarEntries };
  assert.deepEqual(resolveTeachingCivilDate({ ...context, civilDate: "2026-09-15" }), { applies: true, civilDate: "2026-09-15", isTeachingDay: false, nearestCivilDate: "2026-09-16" });
  assert.equal(resolveTeachingCivilDate({ academicYear: { ...snapshot.academicYears[0], startDate: "2028-09-01", endDate: "2028-09-30" }, civilDate: "2028-09-04" }).isTeachingDay, true);
  assert.equal(resolveTeachingCivilDate({ academicYear: { ...snapshot.academicYears[0], endDate: "bad" }, civilDate: "2026-09-15" }).nearestCivilDate, null);
});

test("normal gözlem kayıt kapısı ayrıl-dön boşluğunu reddeder, geçmişte geçerli üyelik gününü kabul eder", async () => {
  const { captureImmutableRawObservation } = await import("../../src/features/evidence/evidence-flow.ts");
  const snapshot = calendarAccountingFixture();
  snapshot.plans.push(record(7651, { planType: "daily" }));
  snapshot.activities.push(record(7652, { planId: id(7651), studentIds: [id(7111)] }));
  const store = new AccountingMemoryStore(snapshot);
  const input = { observationId: id(7653), studentId: id(7111), planId: id(7651), activityId: id(7652), rawText: "Kurgu çocuk materyalleri kendi seçtiği sırayla düzenledi.", observedAt: "2026-09-17T08:00:00.000Z", now: new Date("2026-09-18T08:00:00.000Z") };
  await assert.rejects(captureImmutableRawObservation(store, input), /Gözlem tarihinde/);
  assert.equal(store.snapshot.observations.length, 0);
  await captureImmutableRawObservation(store, { ...input, observedAt: "2026-09-16T08:00:00.000Z" });
  assert.equal(store.snapshot.observations[0].civilDate, "2026-09-16");
});

test("haftalık plan bağlı olmasa da okul kapanışı ve hafta sonu aynı öğretim kümesinde dışlanır", async () => {
  const { resolveTeacherWeekWorkspace } = await import("../../src/features/teacher-cycle/teacher-week-workspace.ts");
  const snapshot = calendarAccountingFixture();
  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-09-18");
  assert.deepEqual(workspace.days.map(day => day.civilDate), ["2026-09-14", "2026-09-16", "2026-09-17", "2026-09-18"]);
});


test("çelişen aynı üyelik kimliği sıra değiştirilerek geçerli hale gelemez; kaynaklar korunur", () => {
  const snapshot = calendarAccountingFixture(), student = snapshot.students[0];
  const first = episode(7701, "2026-09-14"), second = episode(7701, "2026-09-20");
  for (const enrollments of [[first, second], [second, first]]) {
    const source = { ...student, enrollments }, before = structuredClone(source);
    const result = resolveStudentMembershipOn(source, { ...scope, academicYear: snapshot.academicYears[0], civilDate: "2026-09-18" });
    assert.equal(result.eligible, false); assert.equal(result.reason, "invalid-membership");
    assert.ok(result.issues.some(issue => issue.code === "conflicting-episode")); assert.deepEqual(source, before);
  }
});

test("boylamsal arşiv eski tek çocuk gözlem bağını korur; açık boş diziye geri dönüş uygulamaz", () => {
  const snapshot = calendarAccountingFixture();
  snapshot.observations.push(record(7711, { studentId: id(7111) }), record(7712, { studentId: id(7111), studentIds: [] }));
  const archive = buildStudentLongitudinalArchiveFromSnapshot(snapshot, { studentId: id(7111), now: new Date("2026-09-20T12:00:00.000Z") });
  assert.deepEqual(archive.observations.map(record => record.id), [id(7711)]);
});
