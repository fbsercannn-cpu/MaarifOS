import assert from "node:assert/strict";
import test from "node:test";

import { resolveObservationContext } from "../../src/features/evidence/observation-context.ts";

const studentA = "00000000-0000-4000-8000-000000009101";
const studentB = "00000000-0000-4000-8000-000000009102";

function activity(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    title: "Kurgu etkinlik",
    startTime: "09:00",
    status: "planned",
    civilDate: "2026-09-02",
    curriculumProfile: {
      framework: "tymm",
      programLabel: "Türkiye Yüzyılı Maarif Modeli",
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
    },
    curriculumTargets: [],
    assignedStudentIds: [],
    assignmentMode: "whole-class",
    contextKind: "planned-activity",
    ...overrides,
  };
}

function workspace(activities) {
  return {
    civilDate: "2026-09-02",
    activities,
    pendingObservations: [],
    linkedObservations: [],
  };
}

test("global gözlem tek devam eden gerçek etkinliğe bağlanır; planlı ve sentetik bağlam onu gölgelemez", () => {
  const planned = activity({
    id: "00000000-0000-4000-8000-000000009111",
    title: "Sonraki plan",
    startTime: "10:00",
  });
  const current = activity({
    id: "00000000-0000-4000-8000-000000009112",
    title: "Uygulanan fen etkinliği",
    status: "in_progress",
  });
  const spontaneous = activity({
    id: "00000000-0000-4000-8000-000000009113",
    title: "Anlık gözlemler",
    status: "in_progress",
    contextKind: "spontaneous-observation",
  });

  assert.deepEqual(
    resolveObservationContext(workspace([planned, spontaneous, current])),
    { kind: "use-activity", activity: current },
  );
});

test("birden fazla eş öncelikli gerçek etkinlikte sistem tahmin etmez, öğretmene sıralı seçim verir", () => {
  const late = activity({
    id: "00000000-0000-4000-8000-000000009121",
    title: "Müzik etkinliği",
    startTime: "10:00",
    status: "in_progress",
  });
  const early = activity({
    id: "00000000-0000-4000-8000-000000009122",
    title: "Drama etkinliği",
    startTime: "09:15",
    status: "in_progress",
  });

  const result = resolveObservationContext(workspace([late, early]));
  assert.equal(result.kind, "choose-activity");
  assert.deepEqual(
    result.activities.map((item) => item.id),
    [early.id, late.id],
  );
});

test("çocuk profilinden açılan gözlem yalnız o çocuğu kapsayan gerçek etkinliği seçer", () => {
  const forA = activity({
    id: "00000000-0000-4000-8000-000000009131",
    assignedStudentIds: [studentA],
    assignmentMode: "selected-students",
  });
  const forB = activity({
    id: "00000000-0000-4000-8000-000000009132",
    assignedStudentIds: [studentB],
    assignmentMode: "selected-students",
  });

  assert.deepEqual(
    resolveObservationContext(workspace([forA, forB]), { studentId: studentB }),
    { kind: "use-activity", activity: forB },
  );
});

test("uygun gerçek etkinlik yoksa sentetik bağlam ancak açık plan dışı sonuç olarak döner", () => {
  const completed = activity({ status: "completed" });
  const spontaneous = activity({
    status: "in_progress",
    contextKind: "spontaneous-observation",
  });

  assert.deepEqual(
    resolveObservationContext(workspace([completed, spontaneous])),
    { kind: "spontaneous-observation" },
  );
});
