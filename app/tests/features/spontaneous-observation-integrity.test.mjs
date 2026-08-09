import assert from "node:assert/strict";
import test from "node:test";

import { isAuthenticSpontaneousObservationActivity } from "../../src/features/evidence/spontaneous-observation-integrity.ts";

const scope = {
  academicYearId: "00000000-0000-4000-8000-000000000c01",
  classroomId: "00000000-0000-4000-8000-000000000c02",
};
const civilDate = "2026-09-02";
const planId = "00000000-0000-4000-8000-000000000c03";

const base = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate,
  deletedAt: null,
  schemaVersion: 2,
  academicYearId: scope.academicYearId,
  classroomId: scope.classroomId,
};

const authenticPlan = {
  ...base,
  id: planId,
  planType: "spontaneous-observation",
  title: "Anlık gözlemler",
  curriculumTargets: [],
  maarifRefs: [],
};

const authenticActivity = {
  ...base,
  id: "00000000-0000-4000-8000-000000000c04",
  planId,
  activityKind: "spontaneous-observation",
  title: "Anlık gözlemler",
  curriculumTargets: [],
  maarifRefs: [],
};

test("kanonik anlık gözlem plan-etkinlik çiftini doğrular", () => {
  assert.equal(
    isAuthenticSpontaneousObservationActivity(
      authenticActivity,
      [authenticPlan],
      scope,
      civilDate,
    ),
    true,
  );
});

test("eksik, hedefli, silinmiş veya farklı kapsamlı bağlamları fail-closed reddeder", () => {
  const cases = [
    { activity: authenticActivity, plans: [] },
    {
      activity: authenticActivity,
      plans: [{ ...authenticPlan, planType: "daily" }],
    },
    {
      activity: { ...authenticActivity, curriculumTargets: [{ id: "target" }] },
      plans: [authenticPlan],
    },
    {
      activity: authenticActivity,
      plans: [{ ...authenticPlan, maarifRefs: ["FAB.1"] }],
    },
    {
      activity: authenticActivity,
      plans: [{ ...authenticPlan, civilDate: "2026-09-03" }],
    },
    {
      activity: authenticActivity,
      plans: [{ ...authenticPlan, classroomId: "00000000-0000-4000-8000-000000000cff" }],
    },
    {
      activity: authenticActivity,
      plans: [{ ...authenticPlan, deletedAt: "2026-09-02T07:00:00.000Z" }],
    },
  ];

  for (const candidate of cases) {
    assert.equal(
      isAuthenticSpontaneousObservationActivity(
        candidate.activity,
        candidate.plans,
        scope,
        civilDate,
      ),
      false,
    );
  }
});
