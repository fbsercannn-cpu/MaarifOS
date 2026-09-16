import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { archiveAcademicYear, reenrollArchivedStudent } from "../../src/features/archive/academic-year-archive.ts";
import { persistStudentRosterChange } from "../../src/features/dashboard/dashboard-data.ts";
import { transitionAcademicYearConfiguration } from "../../src/features/today/today-data.ts";
import { resolveDevelopmentOverview } from "../../src/features/development/development-overview.ts";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const yearId = id(701), classroomId = id(702), studentId = id(703);
const base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-05T06:00:00.000Z", civilDate: "2026-09-01", deletedAt: null, schemaVersion: 2 };
class MemoryStore {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const result = await task({
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const map = new Map(working[collection].map((record) => [record.id, record]));
        records.forEach((record) => map.set(record.id, structuredClone(record)));
        working[collection] = [...map.values()];
      },
      clear: async (collection) => { working[collection] = []; },
    });
    if (mode === "readwrite") collections.forEach((collection) => { this.snapshot[collection] = working[collection]; });
    return result;
  }
  close() {}
}
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({ ...base, id: yearId, name: "2026–2027 Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-08-31", status: "active" });
  snapshot.classrooms.push({ ...base, id: classroomId, academicYearId: yearId, name: "Kurgu Sınıf", ageGroup: "60–72 ay", schedule: { kind: "morning", startTime: "08:30", endTime: "12:30", timeZone: "Europe/Istanbul" } });
  snapshot.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId: yearId, classroomId });
  snapshot.students.push({ ...base, id: studentId, academicYearId: yearId, classroomId, displayName: "Kurgu Çocuk", firstName: "Kurgu", lastName: "Çocuk", active: false, enrollmentStatus: "left", enrollments: [{ id: id(704), academicYearId: yearId, classroomId, startedOn: "2026-09-01", endedOn: "2026-09-05", status: "left", schemaVersion: 1 }] });
  return new MemoryStore(snapshot);
}
const request = (startedOn = "2026-10-01") => ({ studentId, academicYearId: yearId, classroomId, startedOn, now: new Date("2026-10-01T08:00:00.000Z") });

test("gerçek yeniden kayıt ayrılık aralığını koruyan yeni dönem açar ve tekrar çağrı idempotenttir", async () => {
  const store = fixture();
  const original = structuredClone(store.snapshot.students[0].enrollments[0]);
  await reenrollArchivedStudent(store, request());
  const after = await store.readSnapshot();
  assert.equal(after.students[0].enrollments.length, 2);
  assert.deepEqual(after.students[0].enrollments[0], original);
  assert.notEqual(after.students[0].enrollments[1].id, original.id);
  assert.equal(after.students[0].enrollments[1].startedOn, "2026-10-01");
  assert.equal(resolveDevelopmentOverview(after, { civilDate: "2026-09-15", period: "month" }).students.length, 0);
  await reenrollArchivedStudent(store, { ...request(), now: new Date("2026-10-02T08:00:00.000Z") });
  assert.deepEqual(await store.readSnapshot(), after);
});

test("yanlışlıkla silme ve geri al son dönemi aynen açar; önceki ayrılık dönemi değişmez", async () => {
  const store = fixture();
  await reenrollArchivedStudent(store, request());
  const before = structuredClone(store.snapshot.students[0].enrollments);
  const student = { id: studentId, name: "Kurgu Çocuk", status: "present", attendanceMarked: false };
  await persistStudentRosterChange(store, { student, archived: true, preserveCurrentProfile: true, now: new Date("2026-10-03T08:00:00.000Z") });
  assert.deepEqual(store.snapshot.students[0].enrollments[0], before[0]);
  assert.equal(store.snapshot.students[0].enrollments[1].endedOn, "2026-10-03");
  await persistStudentRosterChange(store, { student, archived: false, preserveCurrentProfile: true, now: new Date("2026-10-04T08:00:00.000Z") });
  assert.deepEqual(store.snapshot.students[0].enrollments, before);
  await persistStudentRosterChange(store, { student: { ...student, name: "Kurgu Güncel Çocuk" }, archived: false, now: new Date("2026-10-04T09:00:00.000Z") });
  assert.deepEqual(store.snapshot.students[0].enrollments, before);
});

for (const startedOn of ["2026-08-31", "2027-09-01", "2026-02-30"]) {
  test(`yeniden kayıt hedef yıl sınırını korur: ${startedOn}`, async () => {
    const store = fixture(); const before = await store.readSnapshot();
    await assert.rejects(reenrollArchivedStudent(store, request(startedOn)), /başlangıcı|başlangıç|YYYY/);
    assert.deepEqual(await store.readSnapshot(), before);
  });
}

test("izinli erken operasyon başlangıcı ve yılın son günü kabul edilir", async () => {
  for (const startedOn of ["2026-08-21", "2027-08-31"]) {
    const store = fixture();
    store.snapshot.academicYears[0].operationalStartDate = "2026-08-21";
    store.snapshot.students[0].enrollments = [];
    await reenrollArchivedStudent(store, request(startedOn));
    assert.equal(store.snapshot.students[0].enrollments[0].startedOn, startedOn);
  }
});

test("geçersiz yıl veya geçmiş bitiş tarihi sessizce atılmaz", async () => {
  for (const mutate of [
    (store) => { store.snapshot.academicYears[0].endDate = "2026-08-31"; },
    (store) => { store.snapshot.academicYears[0].operationalStartDate = "2028-09-01"; },
    (store) => { store.snapshot.students[0].enrollments[0].endedOn = "2026-08-31"; },
    (store) => { delete store.snapshot.students[0].enrollments[0].endedOn; },
  ]) {
    const store = fixture(); mutate(store); const before = await store.readSnapshot();
    await assert.rejects(reenrollArchivedStudent(store, request()), /tarih|geçersiz|bitiş/);
    assert.deepEqual(await store.readSnapshot(), before);
  }
});

test("yeni dönem kapalı üyeliğin dahil bitiş gününü kapsayamaz", async () => {
  const store = fixture(); const before = await store.readSnapshot();
  await assert.rejects(reenrollArchivedStudent(store, request("2026-09-05")), /bitiş gününden sonra/);
  assert.deepEqual(await store.readSnapshot(), before);
});

test("yıl arşivi kapalı ilk dönem yerine son aktif dönemi kapatır", async () => {
  const store = fixture(); await reenrollArchivedStudent(store, request());
  const first = structuredClone(store.snapshot.students[0].enrollments[0]);
  await archiveAcademicYear(store, { academicYearId: yearId, closedOn: "2027-08-31", now: new Date("2027-08-31T10:00:00.000Z") });
  assert.deepEqual(store.snapshot.students[0].enrollments[0], first);
  assert.equal(store.snapshot.students[0].enrollments[1].status, "completed");
  assert.equal(store.snapshot.students[0].enrollments[1].startedOn, "2026-10-01");
  assert.equal(store.snapshot.students[0].enrollments[1].endedOn, "2027-08-31");
});

test("kapanış bitiş günü yıl dışında veya etkin dönem başlangıcından önce olamaz", async () => {
  for (const closedOn of ["2026-08-31", "2027-09-01", "2026-09-15"]) {
    const store = fixture(); await reenrollArchivedStudent(store, request());
    const before = await store.readSnapshot();
    await assert.rejects(archiveAcademicYear(store, { academicYearId: yearId, closedOn, now: new Date("2027-09-01T08:00:00.000Z") }), /kapanış|kapanışı/);
    assert.deepEqual(await store.readSnapshot(), before);
  }
  const store = fixture(); await reenrollArchivedStudent(store, request());
  const before = await store.readSnapshot();
  await assert.rejects(persistStudentRosterChange(store, { student: { id: studentId, name: "Kurgu Çocuk", status: "present" }, archived: true, preserveCurrentProfile: true, now: new Date("2026-09-15T08:00:00.000Z") }), /başlangıcından önce/);
  assert.deepEqual(await store.readSnapshot(), before);
});

test("yeni yıla taşıma eski iki dönemi korur ve yalnız son dönemi kapatır", async () => {
  const store = fixture(); await reenrollArchivedStudent(store, request());
  const first = structuredClone(store.snapshot.students[0].enrollments[0]);
  await transitionAcademicYearConfiguration(store, {
    academicYear: { id: id(711), name: "2027–2028 Eğitim Yılı", startDate: "2027-09-01", endDate: "2028-08-31" },
    classroom: { id: id(712), name: "Kurgu Yeni Sınıf", ageGroup: "60–72 ay", curriculumProgram: "Türkiye Yüzyılı Maarif Modeli" },
    schedule: { kind: "morning", startTime: "08:30", endTime: "12:30" },
    carryStudentIds: [studentId], closedOn: "2027-08-31", now: new Date("2027-08-31T10:00:00.000Z"),
  });
  const episodes = store.snapshot.students[0].enrollments;
  assert.equal(episodes.length, 3);
  assert.deepEqual(episodes[0], first);
  assert.equal(episodes[1].status, "completed");
  assert.equal(episodes[1].startedOn, "2026-10-01");
  assert.equal(episodes[2].status, "active");
  assert.equal(episodes[2].startedOn, "2027-09-01");
});
