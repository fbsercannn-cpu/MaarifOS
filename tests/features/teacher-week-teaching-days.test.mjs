import assert from "node:assert/strict";
import test from "node:test";

import {
  localNoSchoolPeriodsFromCalendarEntries,
  officialTeachingCivilDates2026_2027,
  resolveOfficialTeachingCivilDate,
  resolveTeacherWeekTeachingDays,
} from "../../src/features/planning/teacher-week-teaching-days.ts";

const officialYear = {
  id: "00000000-0000-4000-8000-00000000f001",
  name: "2026–2027 Eğitim Yılı",
  startDate: "2026-09-07",
  endDate: "2027-06-25",
};
const schedule = {
  kind: "morning",
  startTime: "08:30",
  endTime: "12:30",
  timeZone: "Europe/Istanbul",
};

function weekly(periodStart, periodEnd) {
  return {
    id: crypto.randomUUID(),
    periodStart,
    periodEnd,
  };
}

test("resmî tarih aralığının öğretmen tarafından yeniden adlandırılması ara tatili değiştirmez", () => {
  for (const name of ["2026-2027", "Güneş Sınıfı Eğitim Yılı", ""]) {
    const result = resolveTeacherWeekTeachingDays({
      academicYear: { ...officialYear, name, startDate: "2026-09-01", endDate: "2027-08-31" },
      weekly: weekly("2026-11-16", "2026-11-22"), classroomSchedule: schedule,
    });
    assert.deepEqual(result.expectedCivilDates, []);
    assert.equal(result.provenance.mode, "official-meb-2026-2027");
  }
});

test("2026–2027 MEB profilinde uyum ve normal dönem haftalarını ayrı provenance ile exact çözer", () => {
  const adaptation = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-09-07", "2026-09-13"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(adaptation.expectedCivilDates, [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
  ]);
  assert.equal(adaptation.lastExpectedCivilDate, "2026-09-11");
  assert.equal(adaptation.evaluationOpensAtUtc, "2026-09-11T09:30:00.000Z");
  assert.equal(adaptation.provenance.mode, "official-meb-2026-2027");
  assert.equal(adaptation.provenance.instructionalPhase, "adaptation");
  assert.equal(
    adaptation.provenance.basis,
    "adaptation-and-term-weekdays-minus-breaks-and-full-day-holidays",
  );
  assert.equal(
    adaptation.provenance.sources.some(
      (source) => source.authority === "Millî Eğitim Bakanlığı",
    ),
    true,
  );

  const term = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-09-14", "2026-09-20"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(term.expectedCivilDates, [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ]);
  assert.equal(term.provenance.instructionalPhase, "term");
  assert.equal(term.evaluationOpensAtUtc, "2026-09-18T09:30:00.000Z");
});

test("ara tatili ve tam gün resmî tatilleri, Kurban günleri dahil, öğretim kümesinden çıkarır", () => {
  const teacherWorkWeek = resolveTeacherWeekTeachingDays({
    academicYear: { ...officialYear, startDate: "2026-09-01" },
    weekly: weekly("2026-09-01", "2026-09-06"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(teacherWorkWeek.expectedCivilDates, []);
  assert.equal(teacherWorkWeek.provenance.instructionalPhase, "no-school");

  const breakWeek = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-11-16", "2026-11-22"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(breakWeek.expectedCivilDates, []);
  assert.equal(breakWeek.evaluationOpensAtUtc, null);
  assert.equal(breakWeek.provenance.instructionalPhase, "no-school");

  const republicWeek = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-10-26", "2026-11-01"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(republicWeek.expectedCivilDates, [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
  ]);
  assert.equal(republicWeek.evaluationOpensAtUtc, "2026-10-30T09:30:00.000Z");

  const newYearWeek = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-12-28", "2027-01-03"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(newYearWeek.expectedCivilDates, [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
  ]);

  const childrensDayWeek = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2027-04-19", "2027-04-25"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(childrensDayWeek.expectedCivilDates, [
    "2027-04-19",
    "2027-04-20",
    "2027-04-21",
    "2027-04-22",
    "2027-04-23",
  ]);

  const sacrificeWeek = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2027-05-17", "2027-05-23"),
    classroomSchedule: schedule,
  });
  assert.deepEqual(sacrificeWeek.expectedCivilDates, [
    "2027-05-20",
    "2027-05-21",
  ]);
  assert.equal(
    sacrificeWeek.provenance.excludedPeriodIds.includes("sacrifice-feast"),
    true,
  );
});

test("günlük plan tarihi resmî takvimde fail-closed çözülür ve en yakın öğretim gününü verir", () => {
  const dates = officialTeachingCivilDates2026_2027();
  assert.equal(dates.length, 186);
  assert.equal(dates[0], "2026-09-07");
  assert.equal(dates.at(-1), "2027-06-25");

  assert.deepEqual(resolveOfficialTeachingCivilDate("2026-09-01"), {
    applies: true,
    civilDate: "2026-09-01",
    isTeachingDay: false,
    nearestCivilDate: "2026-09-07",
  });
  assert.deepEqual(resolveOfficialTeachingCivilDate("2026-09-14"), {
    applies: true,
    civilDate: "2026-09-14",
    isTeachingDay: true,
    nearestCivilDate: "2026-09-14",
  });
  assert.deepEqual(resolveOfficialTeachingCivilDate("2026-11-16"), {
    applies: true,
    civilDate: "2026-11-16",
    isTeachingDay: false,
    nearestCivilDate: "2026-11-13",
  });
  assert.deepEqual(resolveOfficialTeachingCivilDate("2027-01-30"), {
    applies: true,
    civilDate: "2027-01-30",
    isTeachingDay: false,
    nearestCivilDate: "2027-01-22",
  });
  assert.deepEqual(resolveOfficialTeachingCivilDate("2027-06-26"), {
    applies: true,
    civilDate: "2027-06-26",
    isTeachingDay: false,
    nearestCivilDate: "2027-06-25",
  });
  assert.deepEqual(resolveOfficialTeachingCivilDate("2026-08-27"), {
    applies: false,
    civilDate: "2026-08-27",
    isTeachingDay: false,
    nearestCivilDate: null,
  });
});

test("özel eğitim yılında Mon–Fri fallback ve açık kaynaklı no-school istisnasını provenance ile görünür kılar", () => {
  const custom = resolveTeacherWeekTeachingDays({
    academicYear: {
      id: "00000000-0000-4000-8000-00000000f002",
      name: "Kurgu Özel Eğitim Yılı",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
    },
    weekly: weekly("2026-12-07", "2026-12-13"),
    classroomSchedule: schedule,
    explicitNoSchoolPeriods: [{
      id: "local-authority-no-school-2026-12-09",
      title: "Kaynaklı yerel okul tatili",
      startDate: "2026-12-09",
      endDate: "2026-12-09",
      sourceUrl: "https://example.edu.tr/duyuru/okul-tatili",
      sourceCheckedOn: "2026-12-01",
    }],
  });
  assert.deepEqual(custom.expectedCivilDates, [
    "2026-12-07",
    "2026-12-08",
    "2026-12-10",
    "2026-12-11",
  ]);
  assert.deepEqual(custom.provenance, {
    mode: "custom-year-weekday-fallback",
    profileId: null,
    basis: "monday-friday-with-explicit-no-school-periods",
    sources: [
      {
        authority: "Öğretmenin etkin eğitim yılı kaydı",
        url: "urn:maarifos:academic-year:00000000-0000-4000-8000-00000000f002",
        checkedOn: "2026-12-07",
      },
      {
        authority: "Kaynaklı yerel okul tatili",
        url: "https://example.edu.tr/duyuru/okul-tatili",
        checkedOn: "2026-12-01",
      },
    ],
    excludedPeriodIds: ["local-authority-no-school-2026-12-09"],
  });
});

test("sınıf schedule yoksa tarih kümesini korur fakat değerlendirme açılış anını uydurmaz", () => {
  const resolution = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-09-07", "2026-09-13"),
  });
  assert.equal(resolution.expectedCivilDates.length, 5);
  assert.equal(resolution.scheduleEndTime, null);
  assert.equal(resolution.evaluationOpensAtUtc, null);
});

test("öğretmenin yerel okul kapanışı kaydı exact sınıf kapsamında paydayı düşürür", () => {
  const scope = {
    academicYearId: officialYear.id,
    classroomId: "00000000-0000-4000-8000-00000000f003",
  };
  const periods = localNoSchoolPeriodsFromCalendarEntries([{
    id: "00000000-0000-4000-8000-00000000f004",
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    entryType: "no_school",
    title: "Yerel kurum kapanışı",
    startDate: "2026-09-16",
    endDate: "2026-09-16",
    status: "planned",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  }], scope);
  const resolution = resolveTeacherWeekTeachingDays({
    academicYear: officialYear,
    weekly: weekly("2026-09-14", "2026-09-20"),
    classroomSchedule: schedule,
    explicitNoSchoolPeriods: periods,
  });

  assert.deepEqual(resolution.expectedCivilDates, [
    "2026-09-14",
    "2026-09-15",
    "2026-09-17",
    "2026-09-18",
  ]);
  assert.equal(
    resolution.provenance.sources.some(
      (source) =>
        source.authority === "Öğretmenin okul takvimi · Yerel kurum kapanışı" &&
        source.url === "urn:maarifos:calendar-entry:00000000-0000-4000-8000-00000000f004",
    ),
    true,
  );
});
