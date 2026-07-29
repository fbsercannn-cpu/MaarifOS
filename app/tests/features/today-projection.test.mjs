import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { resolveTodayWorkspace } from "../../src/features/today/today-data.ts";

const academicYearId = "00000000-0000-4000-8000-000000000a01";
const classroomId = "00000000-0000-4000-8000-000000000a02";
const plannedActivityId = "00000000-0000-4000-8000-000000000a03";
const spontaneousActivityId = "00000000-0000-4000-8000-000000000a04";
const plannedPlanId = "00000000-0000-4000-8000-000000000a05";
const spontaneousPlanId = "00000000-0000-4000-8000-000000000a06";

const baseRecord = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 2,
};

function configuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...baseRecord,
    id: academicYearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...baseRecord,
    id: classroomId,
    academicYearId,
    name: "Kurgu Güneş Sınıfı",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
  });
  snapshot.settings.push({
    ...baseRecord,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
  return snapshot;
}

test("anlık gözlem bağlamını Günün planı ve odak etkinliği projeksiyonuna taşımaz", () => {
  const snapshot = configuredSnapshot();
  snapshot.activities.push(
    {
      ...baseRecord,
      id: plannedActivityId,
      planId: plannedPlanId,
      academicYearId,
      classroomId,
      title: "Bahçedeki gölgeleri araştırıyoruz",
      startTime: "09:30",
      status: "in_progress",
      activityKind: "planned-learning",
    },
    {
      ...baseRecord,
      id: spontaneousActivityId,
      planId: spontaneousPlanId,
      academicYearId,
      classroomId,
      title: "Anlık gözlemler",
      startTime: "09:00",
      status: "planned",
      activityKind: "spontaneous-observation",
      curriculumTargets: [],
      maarifRefs: [],
    },
  );
  snapshot.observations.push({
    ...baseRecord,
    id: "00000000-0000-4000-8000-000000000a07",
    academicYearId,
    classroomId,
    planId: spontaneousPlanId,
    activityId: spontaneousActivityId,
    rawText: "Kurgu çocuk oyunda nesneleri renklerine göre kendiliğinden ayırdı.",
    rawTextImmutable: true,
    observedAt: "2026-09-02T06:05:00.000Z",
    studentIds: ["00000000-0000-4000-8000-000000000a08"],
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:00:00.000Z"),
  );

  assert.deepEqual(
    workspace.planItems.map((item) => item.id),
    [plannedActivityId],
  );
  assert.equal(workspace.currentActivity?.id, plannedActivityId);
  assert.equal(workspace.planItems.some((item) => item.id === spontaneousActivityId), false);
  assert.equal(workspace.datedEvidenceCount, 1);
  assert.equal(workspace.pendingEvidenceLinks, 1);
});

test("yalnız anlık gözlem bağlamı varsa odak etkinliği üretmez", () => {
  const snapshot = configuredSnapshot();
  snapshot.activities.push({
    ...baseRecord,
    id: spontaneousActivityId,
    planId: spontaneousPlanId,
    academicYearId,
    classroomId,
    title: "Anlık gözlemler",
    startTime: "10:15",
    status: "in_progress",
    activityKind: "spontaneous-observation",
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:30:00.000Z"),
  );

  assert.deepEqual(workspace.planItems, []);
  assert.equal(workspace.currentActivity, null);
});
