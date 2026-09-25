import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  IndexedDbDataStore,
  normalizeClassroomSchedule,
} from "../src/core/index.ts";
import { curriculumTargetsForProfile } from "../src/features/curriculum/curriculum-catalog.ts";
import {
  captureImmutableRawObservation,
  createPlanWithActivity,
} from "../src/features/evidence/evidence-flow.ts";
import { closeTeacherDay } from "../src/features/day-closure/teacher-day-closure.ts";
import { createTeacherOwnedPlanGraph } from "../src/features/planning/teacher-owned-plan-service.ts";

async function runWave15TeacherWeekProbe() {
  const store = new IndexedDbDataStore();
  const academicYearId = "00000000-0000-4000-8000-00000000e501";
  const classroomId = "00000000-0000-4000-8000-00000000e502";
  const studentId = "00000000-0000-4000-8000-00000000e503";
  const base = {
    academicYearId,
    classroomId,
    createdAt: "2026-08-10T05:30:00.000Z",
    updatedAt: "2026-08-10T05:30:00.000Z",
    civilDate: "2026-08-10",
    deletedAt: null,
    schemaVersion: 1,
  } as const;
  const existing = await store.readSnapshot();
  if (!existing.academicYears.some((record) => record.id === academicYearId)) {
    await store.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: academicYearId,
          name: "2026 Ağustos Kurgu Eğitim Yılı",
          startDate: "2026-08-01",
          endDate: "2027-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          name: "Kurgu Güneş Sınıfı",
          schemaVersion: 2,
          curriculumProfileSnapshot: {
            framework: "tymm",
            programLabel: "Türkiye Yüzyılı Maarif Modeli",
            catalogId: "tymm-2024-okul-oncesi-v1",
            sourceVersion: "2024.1",
            referenceOrigin: "teacher-declared",
            officialCatalogVerified: false,
          },
          schedule: normalizeClassroomSchedule({
            kind: "full_day",
            startTime: "08:30",
            endTime: "16:00",
          }),
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Kurgu Ada",
          active: true,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: ACTIVE_CLASSROOM_SETTING_ID,
          settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
        }]);
      },
    );
  }

  const snapshot = await store.readSnapshot();
  const existingAnnual = snapshot.plans.find(
    (record) => record.planOrigin === "teacher-authored" && record.planType === "annual",
  );
  const graph = existingAnnual
    ? null
    : await createTeacherOwnedPlanGraph(store, {
        title: "Kurgu Öğretmen Yıllık Planı",
        periodStart: "2026-08-01",
        periodEnd: "2027-06-30",
        teacherContent: { narrative: "Kanıta dayalı öğretmen plan omurgası" },
        months: [{
          title: "Ağustos Öğretmen Planı",
          monthKey: "2026-08",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          teacherContent: { narrative: "Sınıf aidiyeti ve güvenli katılım" },
          weeks: [
            {
              title: "10–16 Ağustos Haftası",
              weekKey: "2026-W33",
              periodStart: "2026-08-10",
              periodEnd: "2026-08-16",
              teacherContent: { narrative: "Karşılama, oyun ve gözlem" },
            },
            {
              title: "17–23 Ağustos Haftası",
              weekKey: "2026-W34",
              periodStart: "2026-08-17",
              periodEnd: "2026-08-23",
              teacherContent: { narrative: "Ortak düzen ve sınıf ritmi" },
            },
          ],
        }],
        now: new Date("2026-08-10T05:31:00.000Z"),
      });

  const current = await store.readSnapshot();
  const days = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"];
  if (!current.plans.some((record) => record.planType === "daily")) {
    const curriculumProfile = {
      framework: "tymm" as const,
      programLabel: "Türkiye Yüzyılı Maarif Modeli",
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    const curriculumTarget = curriculumTargetsForProfile(curriculumProfile)
      .find((candidate) => candidate.referenceCode === "FAB.1") ??
      curriculumTargetsForProfile(curriculumProfile)[0];
    if (!curriculumTarget) throw new Error("Kurgu program hedefi bulunamadı.");

    const dailies = [];
    for (let index = 0; index < days.length; index += 1) {
      const suffix = String(index + 10).padStart(2, "0");
      dailies.push(await createPlanWithActivity(store, {
        civilDate: days[index],
        planId: `00000000-0000-4000-8000-00000000e6${suffix}`,
        planTitle: `${days[index].slice(-2)} Ağustos Öğretmen Günlük Planı`,
        activityId: `00000000-0000-4000-8000-00000000e7${suffix}`,
        activityTitle: [
          "Sınıfa birlikte merhaba",
          "Ortak oyun sırası",
          "Sesleri keşfediyoruz",
          "Hareket istasyonları",
          "Haftanın izlerini topluyoruz",
        ][index],
        startTime: "09:00",
        endTime: "09:40",
        curriculumProfile,
        curriculumTargets: [curriculumTarget],
        assignmentMode: "selected-students",
        studentIds: [studentId],
        initialActivityStatus: index === 3 ? "in_progress" : "planned",
        now: new Date(`${days[index]}T06:00:00.000Z`),
      }));
    }

    const markDay = async (index: number, completeActivity = true) => {
      const civilDate = days[index];
      const daily = dailies[index];
      await store.transaction(
        "readwrite",
        ["activities", "attendanceRecords", "settings"],
        async (transaction) => {
          const activities = await transaction.getAll("activities");
          const activity = activities.find((record) => record.id === daily.activity.id);
          if (!activity) throw new Error("Kurgu etkinlik kaydı bulunamadı.");
          if (completeActivity) {
            await transaction.putMany("activities", [{
              ...activity,
              status: "completed",
              updatedAt: `${civilDate}T12:30:00.000Z`,
            }]);
          }
          const suffix = String(index + 10).padStart(2, "0");
          await transaction.putMany("attendanceRecords", [{
            ...base,
            id: `00000000-0000-4000-8000-00000000e8${suffix}`,
            civilDate,
            studentId,
            status: "present",
            createdAt: `${civilDate}T08:00:00.000Z`,
            updatedAt: `${civilDate}T08:00:00.000Z`,
          }]);
          await transaction.putMany("settings", [{
            ...base,
            id: `00000000-0000-4000-8000-00000000e9${suffix}`,
            civilDate,
            settingType: "attendance-day-completion",
            attendanceCompleted: true,
            createdAt: `${civilDate}T08:01:00.000Z`,
            updatedAt: `${civilDate}T08:01:00.000Z`,
          }]);
        },
      );
    };

    await markDay(0);
    await closeTeacherDay(store, {
      civilDate: days[0],
      nextDayNote: "",
      now: new Date(`${days[0]}T13:30:00.000Z`),
    });
    await markDay(1);
    const observationId = "00000000-0000-4000-8000-00000000ea11";
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: dailies[1].plan.id,
      activityId: dailies[1].activity.id,
      rawText:
        "Kurgu Ada, arkadaşının önerisini dinledikten sonra oyun sırasını birlikte yeniden kurdu.",
      observedAt: `${days[1]}T09:15:00.000Z`,
      now: new Date(`${days[1]}T09:16:00.000Z`),
    });
    await closeTeacherDay(store, {
      civilDate: days[1],
      nextDayNote: "Program bağlantısını ertesi gün öğretmen incelemesiyle tamamla.",
      now: new Date(`${days[1]}T13:30:00.000Z`),
    });
    await markDay(3, false);
    await markDay(4);
  }

  const result = {
    status: "ready",
    annualPlanId: graph?.annual.id ?? existingAnnual?.id,
    civilDates: days,
  };
  store.close();
  return result;
}

const probePromise = runWave15TeacherWeekProbe();
declare global {
  interface Window {
    __wave15TeacherWeekProbe?: typeof probePromise;
  }
}
window.__wave15TeacherWeekProbe = probePromise;

void probePromise.then(
  (result) => {
    const target = document.getElementById("probe-result");
    if (target) target.textContent = JSON.stringify(result, null, 2);
  },
  (error) => {
    const target = document.getElementById("probe-result");
    if (target) target.textContent = String(error);
  },
);
