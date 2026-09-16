import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { getDevelopmentObservationPresets, resolveDevelopmentObservationProgramMapping } from "../../src/features/evidence/development-observation-presets.ts";
import { developmentObservationGraphReference } from "../../src/features/evidence/development-observation-graph-references.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
import { formatDevelopmentDate, resolveDevelopmentOverview } from "../../src/features/development/development-overview.ts";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const yearId = id(1);
const classroomId = id(2);
const studentId = id(3);
const base = { createdAt: "2026-08-31T08:00:00.000Z", updatedAt: "2026-08-31T08:00:00.000Z", civilDate: "2026-08-31", deletedAt: null, schemaVersion: 2 };

function membership(overrides = {}) {
  return { id: id(500), classroomId, academicYearId: yearId, startedOn: "2026-08-31", status: "active", schemaVersion: 1, ...overrides };
}

function fixture(ageBand = "48-60") {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({ ...base, id: yearId, name: "Kurgu eğitim yılı", status: "active", startDate: "2026-09-01", endDate: "2027-06-30", operationalStartDate: "2026-08-31" });
  snapshot.classrooms.push({ ...base, id: classroomId, academicYearId: yearId, name: "Kurgu sınıf", ageGroup: `${ageBand} ay` });
  snapshot.students.push({ ...base, id: studentId, academicYearId: yearId, classroomId, displayName: "Kurgu Çocuk A", active: true, enrollmentStatus: "active", enrollments: [membership()] });
  snapshot.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId: yearId, classroomId });
  return snapshot;
}

function addObservation(snapshot, number, day, { development = false, ageBand = "48-60", student = studentId } = {}) {
  const preset = getDevelopmentObservationPresets(ageBand)[0];
  const { target, profile } = resolveDevelopmentObservationProgramMapping(preset.id, ageBand);
  const selection = { presetId: preset.id, ageBand, support: "with-reminder" };
  const scope = { academicYearId: yearId, classroomId };
  const plan = { ...base, ...scope, id: id(number + 1000), title: "Anlık gözlemler", planType: "spontaneous-observation", curriculumProfileSnapshot: profile, curriculumTargets: [], maarifRefs: [], civilDate: day };
  const activity = { ...base, ...scope, id: id(number + 2000), planId: plan.id, title: "Anlık gözlemler", activityKind: "spontaneous-observation", curriculumProfileSnapshot: profile, curriculumTargets: [], maarifRefs: [], startTime: "10:00", status: "in_progress", civilDate: day };
  const observation = { ...base, ...scope, id: id(number), planId: plan.id, activityId: activity.id, studentIds: [student], observedAt: `${day}T07:00:00.000Z`, civilDate: day, rawText: `  Kurgu gözlem ${number}.\nÖğretmenin özgün metni.  `, context: "Oyun sırasında", rawTextImmutable: true, observationType: development ? "systematic" : "quick-note", observationCategories: ["cognitive"], ...(development ? { developmentSelection: selection } : {}) };
  snapshot.plans.push(plan);
  snapshot.activities.push(activity);
  snapshot.observations.push(observation);
  if (development) snapshot.evidenceCurriculumLinks.push({
    ...base, ...scope, ...profile, id: id(number + 3000), observationId: observation.id, confirmationMethod: "teacher-confirmed", civilDate: day,
    referenceCode: target.referenceCode, referenceTitle: target.referenceTitle, targetKind: target.kind, targetDomain: target.domain,
    targetSourceUrl: target.sourceUrl, targetSourcePage: target.sourcePage, targetSourceSha256: target.sourceSha256,
    targetSnapshot: structuredClone(target), holisticGraphReference: developmentObservationGraphReference(ageBand, target.referenceCode), developmentSelection: selection,
  });
  return { observation, activity, plan, target };
}

function overview(snapshot, period = "month", civilDate = "2026-09-09", scope) {
  return resolveDevelopmentOverview(snapshot, { civilDate, period, ...(scope ? { scope } : {}) });
}

test("üç yaş bandında kart yalnız doğrulanmış alanı ve olay desteğini özgün kayda bağlar", () => {
  for (const ageBand of ["36-48", "48-60", "60-72"]) {
    const snapshot = fixture(ageBand);
    const { observation, target } = addObservation(snapshot, 11, "2026-09-08", { development: true, ageBand });
    addObservation(snapshot, 12, "2026-09-02");
    const before = structuredClone(snapshot);
    const result = overview(snapshot);
    const student = result.students[0];
    assert.equal(result.observationCount, 2);
    assert.equal(result.observedStudentCount, 1);
    assert.equal(student.lastObservationDate, "2026-09-08");
    assert.deepEqual(student.observations.map((entry) => entry.id), [id(11), id(12)]);
    assert.equal(student.observations[0].rawText, observation.rawText);
    assert.equal(student.observations[0].context, "Oyun sırasında");
    assert.equal(student.observations[0].developmentSupportLabel, "Hatırlatmayla");
    assert.deepEqual(student.observations[0].confirmedCurriculumTargets, [target]);
    assert.deepEqual(student.domainCounts, [{ domain: "Türkçe", count: 1 }, { domain: "Alan belirtilmedi", count: 1 }]);
    assert.deepEqual(student.observations[1].domainLabels, ["Alan belirtilmedi"]);
    assert.equal(student.score, undefined);
    assert.equal(student.progress, undefined);
    assert.equal(student.observations[0].assessmentLevel, undefined);
    assert.deepEqual(snapshot, before);
  }
});

test("hafta pazartesiden, ay ayın başından sayar; gelecek kayıtları saymaz", () => {
  const snapshot = fixture();
  for (const [number, day] of [[10, "2026-08-31"], [11, "2026-09-01"], [12, "2026-09-06"], [13, "2026-09-07"], [14, "2026-09-09"], [15, "2026-09-10"]]) addObservation(snapshot, number, day);
  const weekly = overview(snapshot, "week");
  assert.deepEqual(weekly.period, { kind: "week", label: "Bu hafta", startDate: "2026-09-07", endDate: "2026-09-09" });
  assert.equal(weekly.observationCount, 2);
  assert.equal(overview(snapshot, "month").observationCount, 4);
  assert.equal(overview(snapshot, "year").observationCount, 5);
  assert.equal(overview(snapshot, "year").period.startDate, "2026-08-31");
});

test("takvim yılı ve artık gün sınırları UTC sivil tarihle çözülür, yılı aşan dönem boş kalır", () => {
  const snapshot = fixture();
  assert.equal(overview(snapshot, "week", "2027-01-02").period.startDate, "2026-12-28");
  assert.equal(overview(snapshot, "month", "2026-08-30").period, null);
  assert.equal(overview(snapshot, "month", "2027-07-01").period, null);
  assert.equal(overview(snapshot, "year", "2027-07-01").period.endDate, "2027-06-30");
  Object.assign(snapshot.academicYears[0], { startDate: "2027-09-01", operationalStartDate: "2027-09-01", endDate: "2028-06-30" });
  assert.equal(overview(snapshot, "month", "2028-02-29").period.endDate, "2028-02-29");
  assert.throws(() => overview(snapshot, "month", "2026-02-29"), /geçerli bir tarih/u);
  assert.throws(() => overview(snapshot, "week", "2026-09-09T07:00:00Z"), /geçerli bir tarih/u);
  assert.throws(() => overview(snapshot, "day"), /dönemi geçersiz/u);
  assert.equal(formatDevelopmentDate("2026-09-09"), "9 Eylül 2026");
  assert.equal(formatDevelopmentDate("2026-02-30"), "");
});

test("silinmiş, yanlış sınıf/yıl, bozuk gün ve kanonik olmayan kayıtlar sayılmaz", () => {
  const mutations = [
    (entry) => { entry.observation.deletedAt = base.updatedAt; },
    (entry) => { entry.observation.classroomId = id(99); },
    (entry) => { entry.observation.academicYearId = id(99); },
    (entry) => { entry.observation.civilDate = "2026-02-30"; },
    (entry) => { entry.observation.rawTextImmutable = false; },
    (entry) => { entry.observation.studentIds = [studentId, id(99)]; },
    (entry) => { entry.activity.deletedAt = base.updatedAt; },
    (entry) => { entry.plan.deletedAt = base.updatedAt; },
    (entry) => { entry.observation.legacyAssignmentStatus = "needs-review"; },
  ];
  const snapshot = fixture();
  addObservation(snapshot, 10, "2026-09-08");
  mutations.forEach((mutate, index) => mutate(addObservation(snapshot, index + 20, "2026-09-08")));
  assert.equal(overview(snapshot).observationCount, 1);
  assert.deepEqual(overview(snapshot).students[0].observations.map((entry) => entry.id), [id(10)]);
});

test("sınıf kapsamı yalnız güncel geçerli üyeleri gösterir ve boş kaydı sıfır olarak tutar", () => {
  const snapshot = fixture();
  const mutations = [
    (student) => { student.deletedAt = base.updatedAt; },
    (student) => { student.active = false; },
    ...["left", "completed", "transferred"].map((status) => (student) => { student.enrollmentStatus = status; }),
    (student) => { student.classroomId = id(99); },
    (student) => { student.academicYearId = id(99); },
    (student) => { student.enrollments = [membership({ startedOn: "2026-09-10" })]; },
    (student) => { student.enrollments = [membership({ classroomId: id(99) })]; },
    (student) => { student.enrollments = [membership({ endedOn: "2026-09-08", status: "left" })]; },
    (student) => { student.enrollments = [membership({ startedOn: "2026-02-30" })]; },
    (student) => { student.enrollments = [membership({ startedOn: "2026-09-08", endedOn: "2026-09-01" })]; },
    (student) => { student.enrollments = []; },
    (student) => { student.enrollments = "bozuk"; },
    (student) => { student.legacyAssignmentStatus = "needs-review"; },
  ];
  mutations.forEach((mutate, index) => {
    const student = structuredClone(snapshot.students[0]);
    student.id = id(index + 50);
    mutate(student);
    snapshot.students.push(student);
  });
  const emptyStudent = { ...structuredClone(snapshot.students[0]), id: id(4), displayName: "Kurgu Çocuk B" };
  snapshot.students.push(emptyStudent);
  addObservation(snapshot, 10, "2026-09-08");
  const result = overview(snapshot);
  assert.deepEqual(result.students.map((student) => student.studentId), [studentId, id(4)]);
  assert.equal(result.observedStudentCount, 1);
  assert.equal(result.students[1].observationCount, 0);
  assert.equal(result.students[1].lastObservationDate, null);
  assert.deepEqual(result.students[1].domainCounts, []);
});

test("gözlem günündeki üyelik başlangıcı, bitişi ve yeniden katılım boşluğu korunur", () => {
  const snapshot = fixture();
  snapshot.students[0].enrollments = [
    membership({ startedOn: "2026-09-02", endedOn: "2026-09-03", status: "left" }),
    membership({ id: id(501), startedOn: "2026-09-08" }),
  ];
  for (const [number, day] of [[10, "2026-09-01"], [11, "2026-09-02"], [12, "2026-09-03"], [13, "2026-09-04"], [14, "2026-09-07"], [15, "2026-09-08"]]) addObservation(snapshot, number, day);
  assert.deepEqual(overview(snapshot).students[0].observations.map((entry) => entry.id), [id(15), id(12), id(11)]);
});

test("erken yıl başlangıcı hazırlanmış üyeliği kapsar fakat sonradan gelecek çocuğu erkene çekmez", () => {
  const snapshot = fixture();
  snapshot.students[0].enrollments = [membership({ startedOn: "2026-09-01" })];
  addObservation(snapshot, 10, "2026-08-31");
  assert.equal(overview(snapshot, "year", "2026-08-31").observationCount, 1);
  snapshot.students[0].enrollments = [membership({ startedOn: "2026-09-02" })];
  assert.equal(overview(snapshot, "year", "2026-09-02").observationCount, 0);
});

test("üyelik geçmişi olmayan eski kayıtlar ilk bilinen üyelik gününden okunur", () => {
  const snapshot = fixture();
  delete snapshot.students[0].enrollments;
  snapshot.students[0].civilDate = "2026-09-03";
  addObservation(snapshot, 10, "2026-09-02");
  addObservation(snapshot, 11, "2026-09-03");
  assert.equal(overview(snapshot).observationCount, 1);
  snapshot.students[0].civilDate = "2026-02-30";
  assert.equal(overview(snapshot).students.length, 0);
});

test("bozuk yıl sınırları ve silinmiş yıl için sahte kapsam üretilmez", () => {
  const mutations = [
    (year) => { year.startDate = "2026-02-30"; },
    (year) => { year.endDate = "2026-08-01"; },
    (year) => { year.operationalStartDate = "2026-02-30"; },
    (year) => { year.operationalStartDate = "2027-07-01"; },
    (year) => { year.deletedAt = base.updatedAt; },
  ];
  for (const mutate of mutations) {
    const snapshot = fixture();
    mutate(snapshot.academicYears[0]);
    assert.equal(overview(snapshot).period, null);
    assert.deepEqual(overview(snapshot).students, []);
  }
});

test("başka sınıf açıkça seçilebilir; seçili ayar ve önceki sınıf kayıtları değişmez", () => {
  const snapshot = fixture();
  addObservation(snapshot, 10, "2026-09-08");
  const otherScope = { academicYearId: yearId, classroomId: id(22) };
  snapshot.classrooms.push({ ...base, id: otherScope.classroomId, academicYearId: yearId, name: "Kurgu diğer sınıf" });
  const student = { ...structuredClone(snapshot.students[0]), ...otherScope, id: id(23), displayName: "Kurgu diğer çocuk", enrollments: [membership(otherScope)] };
  snapshot.students.push(student);
  const entry = addObservation(snapshot, 11, "2026-09-08", { student: student.id });
  for (const record of [entry.observation, entry.activity, entry.plan]) Object.assign(record, otherScope);
  const before = structuredClone(snapshot);
  const result = overview(snapshot, "month", "2026-09-09", otherScope);
  assert.deepEqual(result.students.map((child) => child.studentId), [student.id]);
  assert.equal(result.observationCount, 1);
  assert.deepEqual(snapshot, before);
  assert.equal(overview(snapshot, "month", "2026-09-09", { academicYearId: id(99), classroomId }).scope, null);
  snapshot.classrooms[1].deletedAt = base.updatedAt;
  assert.equal(overview(snapshot, "month", "2026-09-09", otherScope).scope, null);
});

test("tahrif edilmiş program bağı ham kaydı saklar ama alan ve kaynak doğrulanmış sayılmaz", () => {
  const snapshot = fixture();
  addObservation(snapshot, 10, "2026-09-08", { development: true });
  snapshot.evidenceCurriculumLinks[0].holisticGraphReference.relatedNodeIds.pop();
  const observation = overview(snapshot).students[0].observations[0];
  assert.deepEqual(observation.domainLabels, ["Alan belirtilmedi"]);
  assert.deepEqual(observation.confirmedCurriculumTargets, []);
  assert.deepEqual(observation.confirmedCurriculumLinkIds, []);
  assert.equal(observation.rawText, snapshot.observations[0].rawText);
});

test("plan hedefi gözlem alanı değildir; EÇE onaylı alanı TYMM alanına dönüştürülmez", () => {
  const snapshot = fixture();
  const { activity, plan, observation, target } = addObservation(snapshot, 10, "2026-09-08");
  delete plan.planType;
  delete activity.activityKind;
  plan.curriculumTargets = [target];
  activity.curriculumTargets = [target];
  assert.deepEqual(overview(snapshot).students[0].observations[0].domainLabels, ["Alan belirtilmedi"]);
  const profile = { framework: "meb_2024", catalogId: "kurgu-ece", programLabel: CURRICULUM_PROGRAM_LABELS.meb_2024, sourceVersion: "2024", referenceOrigin: "teacher-declared", officialCatalogVerified: false };
  const eceTarget = { ...target, ...profile, id: id(91), referenceCode: "Kurgu-Dil-1", referenceTitle: "Kurgu EÇE alanı", domain: "Dil gelişimi", verificationStatus: "teacher-declared-unverified" };
  plan.curriculumProfileSnapshot = profile;
  activity.curriculumProfileSnapshot = profile;
  plan.curriculumTargets = [eceTarget];
  activity.curriculumTargets = [eceTarget];
  snapshot.evidenceCurriculumLinks.push({ ...base, ...profile, classroomId, academicYearId: yearId, id: id(90), observationId: observation.id, plannedTargetId: eceTarget.id, referenceCode: eceTarget.referenceCode, referenceTitle: eceTarget.referenceTitle, confirmationMethod: "teacher-confirmed", civilDate: "2026-09-08" });
  assert.deepEqual(overview(snapshot).students[0].observations[0].domainLabels, ["Dil gelişimi"]);
  delete eceTarget.domain;
  assert.deepEqual(overview(snapshot).students[0].observations[0].domainLabels, ["Alan belirtilmedi"]);
});
