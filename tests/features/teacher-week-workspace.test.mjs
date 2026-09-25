import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  resolveTeacherDayClosureWorkspace,
  TEACHER_DAY_CLOSURE_SCHEMA_VERSION,
  TEACHER_DAY_CLOSURE_SETTING_TYPE,
} from "../../src/features/day-closure/teacher-day-closure.ts";
import {
  resolveTeacherWeekWorkspace,
  teacherWeekStart,
} from "../../src/features/teacher-cycle/teacher-week-workspace.ts";

const ids = {
  year: "00000000-0000-4000-8000-00000000f101",
  classroom: "00000000-0000-4000-8000-00000000f102",
  student: "00000000-0000-4000-8000-00000000f103",
};
const timestamp = "2026-09-07T06:00:00.000Z";

function record(id, civilDate, extra = {}) {
  return {
    id,
    academicYearId: ids.year,
    classroomId: ids.classroom,
    civilDate,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    schemaVersion: 1,
    ...extra,
  };
}

function configuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(record(ids.year, "2026-09-07", {
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  }));
  snapshot.classrooms.push(record(ids.classroom, "2026-09-07", {
    name: "Kurgu Öğretmen Haftası",
    academicYearId: ids.year,
    ageGroup: "60–72 ay",
    schedule: {
      kind: "full_day",
      startTime: "08:30",
      endTime: "16:30",
      timeZone: "Europe/Istanbul",
    },
  }));
  snapshot.students.push(record(ids.student, "2026-09-07", {
    firstName: "Kurgu",
    lastName: "Ada",
    active: true,
  }));
  snapshot.settings.push(record(ACTIVE_CLASSROOM_SETTING_ID, "2026-09-07", {
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
  }));
  return snapshot;
}

function addTeacherOwnedWeek(snapshot, periodStart, periodEnd, suffix) {
  const annualId = `00000000-0000-4000-8000-00000000${suffix}1`;
  const monthlyId = `00000000-0000-4000-8000-00000000${suffix}2`;
  const weeklyId = `00000000-0000-4000-8000-00000000${suffix}3`;
  const common = {
    planOrigin: "teacher-authored",
    title: "Kurgu öğretmen planı",
    status: "active",
    periodStart,
    periodEnd,
    teacherContent: {},
    revisionNumber: 1,
    revisionHistory: [],
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.plans.push(record(annualId, periodStart, {
    ...common,
    planType: "annual",
    monthlySectionIds: [monthlyId],
  }));
  snapshot.plans.push(record(monthlyId, periodStart, {
    ...common,
    planType: "monthly",
    annualPlanId: annualId,
    monthKey: periodStart.slice(0, 7),
    weeklySectionIds: [weeklyId],
  }));
  snapshot.plans.push(record(weeklyId, periodStart, {
    ...common,
    planType: "weekly",
    annualPlanId: annualId,
    monthlyPlanId: monthlyId,
    weekKey: `${periodStart}/${periodEnd}`,
  }));
  return weeklyId;
}

function addCompleteDay(snapshot, civilDate, suffix) {
  const planId = `00000000-0000-4000-8000-00000000${suffix}1`;
  const activityId = `00000000-0000-4000-8000-00000000${suffix}2`;
  const observationId = `00000000-0000-4000-8000-00000000${suffix}3`;
  snapshot.attendanceRecords.push(record(
    `00000000-0000-4000-8000-00000000${suffix}4`,
    civilDate,
    { studentId: ids.student, status: "present" },
  ));
  snapshot.settings.push(record(
    `00000000-0000-4000-8000-00000000${suffix}5`,
    civilDate,
    { settingType: "attendance-day-completion", attendanceCompleted: true },
  ));
  snapshot.plans.push(record(planId, civilDate, {
    planType: "daily",
    title: `${civilDate} günlük planı`,
  }));
  snapshot.activities.push(record(activityId, civilDate, {
    planId,
    status: "completed",
  }));
  snapshot.observations.push(record(observationId, civilDate, {
    planId,
    activityId,
    studentId: ids.student,
    rawText: "Kurgu nesnel gözlem.",
  }));
  snapshot.evidenceCurriculumLinks.push(record(
    `00000000-0000-4000-8000-00000000${suffix}6`,
    civilDate,
    {
      observationId,
      referenceCode: "KB1",
      title: "Karşılaştırma",
      confirmationMethod: "teacher-confirmed",
    },
  ));
  return { planId };
}

test("hafta başlangıcını İstanbul sivil gününden Pazartesi olarak çözer", () => {
  assert.equal(teacherWeekStart("2026-09-07"), "2026-09-07");
  assert.equal(teacherWeekStart("2026-09-09"), "2026-09-07");
  assert.equal(teacherWeekStart("2026-09-13"), "2026-09-07");
  assert.throws(() => teacherWeekStart("2026-02-30"), /geçerli bir sivil gün/);
});

test("aynı kurgu sınıfın beş gününü tek kanıt zincirinde özetler", () => {
  const snapshot = configuredSnapshot();
  addCompleteDay(snapshot, "2026-09-07", "f11");
  const monday = resolveTeacherDayClosureWorkspace(snapshot, "2026-09-07");
  snapshot.settings.push(record(
    "00000000-0000-4000-8000-00000000f117",
    "2026-09-07",
    {
      settingType: TEACHER_DAY_CLOSURE_SETTING_TYPE,
      schemaVersion: TEACHER_DAY_CLOSURE_SCHEMA_VERSION,
      closureStatus: "complete",
      closedAt: "2026-09-07T15:30:00.000Z",
      createdAt: "2026-09-07T15:30:00.000Z",
      updatedAt: "2026-09-07T15:30:00.000Z",
      nextDayNote: null,
      issueCodes: [],
      evidence: monday.evidence,
      evidenceFingerprint: monday.evidenceFingerprint,
    },
  ));

  const tuesdayPlan = "00000000-0000-4000-8000-00000000f121";
  snapshot.plans.push(record(tuesdayPlan, "2026-09-08", {
    planType: "daily",
    title: "Salı akışı",
  }));
  snapshot.activities.push(record(
    "00000000-0000-4000-8000-00000000f122",
    "2026-09-08",
    { planId: tuesdayPlan, status: "planned" },
  ));
  const wednesdayPlan = "00000000-0000-4000-8000-00000000f131";
  snapshot.plans.push(record(wednesdayPlan, "2026-09-09", {
    planType: "daily",
    title: "Çarşamba akışı",
  }));
  snapshot.plans.push(record(
    "00000000-0000-4000-8000-00000000f141",
    "2026-09-10",
    { planType: "daily", title: "Perşembe plan A" },
  ));
  snapshot.plans.push(record(
    "00000000-0000-4000-8000-00000000f142",
    "2026-09-10",
    { planType: "daily", title: "Perşembe plan B" },
  ));

  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-09-09");

  assert.equal(workspace.status, "ready");
  assert.equal(workspace.weekStart, "2026-09-07");
  assert.equal(workspace.weekEnd, "2026-09-11");
  assert.deepEqual(
    workspace.days.map((day) => [day.weekdayLabel, day.state]),
    [
      ["Pzt", "closed-complete"],
      ["Sal", "attendance"],
      ["Çar", "attendance"],
      ["Per", "plan-conflict"],
      ["Cum", "future"],
    ],
  );
  assert.equal(workspace.completedDayCount, 1);
  assert.equal(workspace.carriedDayCount, 0);
  assert.equal(workspace.plannedDayCount, 3);
  assert.equal(workspace.openWorkDayCount, 2);
  assert.equal(workspace.nextActionDate, "2026-09-09");
  assert.equal(workspace.nextActionLabel, "Yoklama bekliyor");
  assert.deepEqual(workspace.days[3].conflictingPlanIds, [
    "00000000-0000-4000-8000-00000000f141",
    "00000000-0000-4000-8000-00000000f142",
  ]);
});

test("etkin sınıf yoksa beş sahte gün üretmez", () => {
  const workspace = resolveTeacherWeekWorkspace(createEmptySnapshot(), "2026-09-09");
  assert.equal(workspace.status, "not-configured");
  assert.deepEqual(workspace.days, []);
  assert.equal(workspace.nextActionDate, null);
});

test("eğitim yılı başlamadan geçmiş haftayı açık iş gibi göstermez", () => {
  const snapshot = configuredSnapshot();
  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-08-15");
  assert.equal(workspace.status, "not-configured");
  assert.deepEqual(workspace.days, []);
  assert.equal(workspace.openWorkDayCount, 0);
});

test("Today paydasını öğretmene ait haftanın kanonik MEB öğretim günü kümesinden alır", () => {
  const snapshot = configuredSnapshot();
  addTeacherOwnedWeek(snapshot, "2026-09-14", "2026-09-20", "f20");

  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-09-16");

  assert.equal(workspace.status, "ready");
  assert.equal(workspace.coverageStatus, "authoritative");
  assert.equal(workspace.expectedDayCount, 5);
  assert.deepEqual(
    workspace.days.map((day) => day.civilDate),
    ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"],
  );
  assert.match(workspace.coverageDetail, /MEB çalışma takvimine göre 5 öğretim günü/);
});

test("MEB ara tatilinde sahte 0\/5 plan ve açık iş günü üretmez", () => {
  const snapshot = configuredSnapshot();
  addTeacherOwnedWeek(snapshot, "2026-11-16", "2026-11-22", "f21");

  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-11-18");

  assert.equal(workspace.status, "ready");
  assert.equal(workspace.coverageStatus, "authoritative");
  assert.equal(workspace.expectedDayCount, 0);
  assert.deepEqual(workspace.days, []);
  assert.equal(workspace.openWorkDayCount, 0);
  assert.equal(workspace.nextActionDate, null);
  assert.match(workspace.coverageDetail, /MEB çalışma takvimine göre 0 öğretim günü/);
});

test("yerel okul kapanışı Today paydasını ve görünür gün listesini aynı anda günceller", () => {
  const snapshot = configuredSnapshot();
  addTeacherOwnedWeek(snapshot, "2026-09-14", "2026-09-20", "f22");
  snapshot.calendarEntries.push(record(
    "00000000-0000-4000-8000-00000000f224",
    "2026-09-01",
    {
      entryType: "no_school",
      title: "Yerel kurum kapanışı",
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      status: "planned",
    },
  ));

  const workspace = resolveTeacherWeekWorkspace(snapshot, "2026-09-15");

  assert.equal(workspace.coverageStatus, "authoritative");
  assert.equal(workspace.expectedDayCount, 4);
  assert.deepEqual(
    workspace.days.map((day) => day.civilDate),
    ["2026-09-14", "2026-09-15", "2026-09-17", "2026-09-18"],
  );
  assert.equal(workspace.days.some((day) => day.civilDate === "2026-09-16"), false);
});
