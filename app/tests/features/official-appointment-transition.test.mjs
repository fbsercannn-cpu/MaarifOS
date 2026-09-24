import assert from "node:assert/strict";
import test from "node:test";
import { familyContactSnapshot } from "../../src/core/domain/family-engagement.ts";
import { assertEntityRecord } from "../../src/core/repository/entities.ts";
import { executeFamilyEngagement } from "../../src/features/family-engagement/family-engagement-service.ts";
import {
  assertOfficialAppointmentCompletionRelationships,
  isOfficialAppointmentCompletionRecord,
  OFFICIAL_APPOINTMENT_SYSTEM_URL,
  recordOfficialAppointmentCompletion,
  resolveOfficialAppointmentTransition,
} from "../../src/features/family-engagement/official-appointment-transition.ts";
import {
  FamilyMemoryStore,
  familyNow,
  familyScope,
  familyStudentId,
  seedFamilyEngagementFixture,
} from "../fixtures/family-engagement-fixture.mjs";

test("yerel randevu yalnız hazırlık görünür; resmî tamamlanma gerçek referans, tarih ve öğretmen onayı ister", async () => {
  const store = new FamilyMemoryStore();
  const seeded = await seedFamilyEngagementFixture(store, { includeMeeting: false });
  const appointmentId = seeded.appointment.workflow.appointmentId;
  const before = resolveOfficialAppointmentTransition(store.snapshot, appointmentId);
  assert.equal(before.localStatus, "local-preparation");
  assert.equal(before.localLabel, "Yerel görüşme hazırlığı");
  assert.equal(before.officialStatus, "action-required");
  assert.equal(before.officialSystemUrl, OFFICIAL_APPOINTMENT_SYSTEM_URL);

  const base = {
    ...familyScope,
    appointmentId,
    sourceAppointmentEventId: seeded.appointment.id,
    expectedPreviousCompletionId: null,
    officialReference: "MEB-RND-2026-0042",
    officialScheduledOn: seeded.appointment.workflow.scheduledOn,
    teacherConfirmed: true,
    now: new Date("2026-09-18T09:05:00.000Z"),
  };
  await assert.rejects(
    recordOfficialAppointmentCompletion(store, { ...base, teacherConfirmed: false }),
    /açık onayıyla/u,
  );
  await assert.rejects(
    recordOfficialAppointmentCompletion(store, { ...base, officialReference: "" }),
    /referansı ve randevu tarihi/u,
  );
  await assert.rejects(
    recordOfficialAppointmentCompletion(store, { ...base, officialScheduledOn: "2026-09-19" }),
    /güncel yerel hazırlık/u,
  );
  assert.equal(resolveOfficialAppointmentTransition(store.snapshot, appointmentId).officialStatus, "action-required");

  const completion = await recordOfficialAppointmentCompletion(store, base);
  assert.doesNotThrow(() => assertEntityRecord("settings", completion));
  assert.equal(completion.officialReference, "MEB-RND-2026-0042");
  assert.equal(completion.officialScheduledOn, "2026-09-18");
  assert.ok(completion.teacherUserId);
  assert.equal(resolveOfficialAppointmentTransition(store.snapshot, appointmentId).officialLabel, "Resmî işlem tamamlandı");
  assertOfficialAppointmentCompletionRelationships(store.snapshot);
  assert.equal(isOfficialAppointmentCompletionRecord({ ...completion, reservationStatus: "reserved" }), false);

  const contact = familyContactSnapshot(store.snapshot.students[0].contacts[0]);
  await executeFamilyEngagement(store, {
    scope: familyScope,
    now: new Date("2026-09-18T09:10:00.000Z"),
    command: {
      action: "appointment",
      studentId: familyStudentId,
      appointmentId,
      appointment: {
        previousEventId: seeded.appointment.id,
        availabilityId: seeded.availability.id,
        contact,
        scheduledOn: "2026-09-18",
        startTime: "14:20",
        endTime: "14:40",
        location: "Kurgu görüşme odası",
        purpose: "Güncellenmiş hazırlık",
        reason: "Saat değişikliği",
        calendarNote: "",
      },
    },
  });
  const changed = resolveOfficialAppointmentTransition(store.snapshot, appointmentId);
  assert.equal(changed.localStatus, "local-preparation");
  assert.equal(changed.officialStatus, "needs-review");
  assert.equal(changed.officialLabel, "Resmî işlem kaydı yeniden doğrulanmalı");
});

test("olmayan yerel hazırlık hiçbir zaman resmî rezervasyon sonucu üretmez", () => {
  const store = new FamilyMemoryStore();
  const state = resolveOfficialAppointmentTransition(store.snapshot, crypto.randomUUID());
  assert.equal(state.localStatus, "missing");
  assert.equal(state.officialStatus, "action-required");
  assert.equal(state.completion, null);
});
