import assert from "node:assert/strict";
import test from "node:test";

import { migrateLegacyDashboardState } from "../../src/features/dashboard/dashboard-data.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("legacy kimlikleri UUID'ye taşır ve öğrenci-gözlem ilişkisini korur", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-01",
          studentId: "s-01",
          rawText: "Korunması gereken kurgu ham gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
      attendanceCompleted: true,
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.match(result.students[0].id, uuid);
  assert.match(result.observations[0].id, uuid);
  assert.equal(result.observations[0].studentId, result.students[0].id);
  assert.equal(result.observations[0].rawText, "Korunması gereken kurgu ham gözlem.");
  assert.equal(result.attendanceCompleted, true);
});

test("ilişkisiz legacy ham gözlemi silmez; inceleme bayrağıyla karantinaya alır", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-orphan",
          studentId: "missing-old-student",
          rawText: "İlişkisi eksik olsa da korunacak kurgu gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.equal(result.observations.length, 1);
  assert.match(result.observations[0].studentId, uuid);
  assert.equal(result.observations[0].requiresStudentReview, true);
  assert.equal(result.observations[0].legacyStudentId, "missing-old-student");
  assert.equal(result.observations[0].rawText, "İlişkisi eksik olsa da korunacak kurgu gözlem.");
});
