import { expect, test } from "@playwright/test";

test("V11 resmî randevu ile oyun-aile zincirini şifreli yedekte kayıpsız taşır; V10 etiketi ve kopuk zincir atomik reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const familyFixture = await import("/tests/fixtures/family-engagement-fixture.mjs");
    const appointment = await import("/src/features/family-engagement/official-appointment-transition.ts");
    const play = await import("/src/features/planning/play-family-cycle.ts");

    const source = new core.IndexedDbDataStore({
      databaseName: `recommendations-v11-source-${crypto.randomUUID()}`,
    });
    const seed = familyFixture.familyFixture();
    seed.academicYears[0].operationalStartedAt = "2026-09-01T06:00:00.000Z";
    delete seed.classrooms[0].classroomId;
    await source.transaction("readwrite", core.COLLECTION_NAMES, async (transaction) => {
      for (const collection of core.COLLECTION_NAMES) {
        if (seed[collection].length > 0) await transaction.putMany(collection, seed[collection]);
      }
    });
    const family = await familyFixture.seedFamilyEngagementFixture(source, { includeMeeting: false });
    const completion = await appointment.recordOfficialAppointmentCompletion(source, {
      ...familyFixture.familyScope,
      appointmentId: family.appointment.workflow.appointmentId,
      sourceAppointmentEventId: family.appointment.id,
      expectedPreviousCompletionId: null,
      officialReference: "MEB-RND-KURGU-0042",
      officialScheduledOn: family.appointment.workflow.scheduledOn,
      teacherConfirmed: true,
      now: new Date("2026-09-18T09:05:00.000Z"),
    });

    const planId = familyFixture.familyUid(530);
    const activityId = familyFixture.familyUid(531);
    const observationId = familyFixture.familyUid(532);
    const base = {
      createdAt: "2026-09-18T08:00:00.000Z",
      updatedAt: "2026-09-18T08:00:00.000Z",
      civilDate: "2026-09-18",
      deletedAt: null,
      schemaVersion: 2,
      ...familyFixture.familyScope,
    };
    await source.transaction("readwrite", ["plans", "activities", "observations"], async (transaction) => {
      await transaction.putMany("plans", [{
        ...base,
        id: planId,
        title: "Kurgu yapı oyunu planı",
      }]);
      await transaction.putMany("activities", [{
        ...base,
        id: activityId,
        planId,
        title: "Kurgu yapı oyunu",
        status: "completed",
        studentIds: [familyFixture.familyStudentId],
      }]);
      await transaction.putMany("observations", [{
        ...base,
        id: observationId,
        planId,
        activityId,
        studentIds: [familyFixture.familyStudentId],
        rawText: "Çocuk iki parçayı yan yana getirip yakınına gösterdi.",
        rawTextImmutable: true,
        workflowStatus: "captured",
        observedAt: "2026-09-18T08:30:00.000Z",
      }]);
    });
    const common = {
      ...familyFixture.familyScope,
      studentId: familyFixture.familyStudentId,
      teacherConfirmed: true as const,
    };
    const application = await play.recordPlayFamilyCycle(source, {
      ...common,
      previousRecordId: null,
      now: new Date("2026-09-18T12:00:00.000Z"),
      workflow: {
        kind: "application",
        sourcePlanId: planId,
        sourceActivityId: activityId,
        materials: ["Ahşap bloklar", "Kumaş parçaları"],
        adaptation: "Kavraması kolay iki büyük parça yakına yerleştirildi.",
        implementation: "Çocukların seçtiği parçalarla ortak bir yapı oyunu uygulandı.",
        appliedAtUtc: "2026-09-18T08:30:00.000Z",
      },
    });
    const reflection = await play.recordPlayFamilyCycle(source, {
      ...common,
      previousRecordId: application.id,
      now: new Date("2026-09-18T12:01:00.000Z"),
      workflow: {
        kind: "reflection",
        sourceApplicationId: application.id,
        observationIds: [observationId],
        teacherReflection: "Ham gözlemde görülen yaklaşım yeniden incelenecek.",
        nextStep: "Bir sonraki oyunda farklı büyüklükte parçalar sunulacak.",
      },
    });
    const suggestion = await play.recordPlayFamilyCycle(source, {
      ...common,
      previousRecordId: reflection.id,
      now: new Date("2026-09-18T12:02:00.000Z"),
      workflow: {
        kind: "family-suggestion",
        sourceReflectionId: reflection.id,
        familyEngagementRecordId: family.preference.id,
        contactId: family.preference.workflow.contact.id,
        suggestion: "Evde iki farklı dokudaki nesneyle küçük bir yapı kurmayı deneyebilirsiniz.",
        sharedOn: "2026-09-18",
      },
    });
    await play.recordPlayFamilyCycle(source, {
      ...common,
      previousRecordId: suggestion.id,
      now: new Date("2026-09-18T12:03:00.000Z"),
      workflow: {
        kind: "family-feedback",
        sourceSuggestionId: suggestion.id,
        familyEngagementRecordId: family.preference.id,
        contactId: family.preference.workflow.contact.id,
        receivedOn: "2026-09-18",
        source: "oral",
        feedback: "Yakını, kumaş parçalarıyla kısa süre oyun kurduklarını bildirdi.",
        teacherNote: "Bildirim ayrı aile kaydıdır; sonraki gözlemde yeniden bakılacak.",
      },
    });

    const service = new core.BackupService(source, {
      appVersion: "0.34.0",
      clock: () => new Date("2026-09-18T13:00:00.000Z"),
    });
    const expected = await source.readSnapshot();
    const backup = await service.exportBackup();
    const encrypted = service.serializeEncryptedBackup(
      await service.exportEncryptedBackup("Kurgu-V11-yedek-parolası!"),
    );
    const target = new core.IndexedDbDataStore({
      databaseName: `recommendations-v11-target-${crypto.randomUUID()}`,
    });
    const restore = new core.BackupService(target, { appVersion: "0.34.0" });
    await restore.restoreEncryptedBackup(encrypted, "Kurgu-V11-yedek-parolası!", {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const actual = await target.readSnapshot();
    const types = actual.settings
      .filter((record) => record.settingType === appointment.OFFICIAL_APPOINTMENT_TRANSITION_SETTING_TYPE ||
        record.settingType === play.PLAY_FAMILY_CYCLE_SETTING_TYPE)
      .map((record) => record.settingType)
      .sort();

    const negative = new core.IndexedDbDataStore({
      databaseName: `recommendations-v11-negative-${crypto.randomUUID()}`,
    });
    const negativeService = new core.BackupService(negative, { appVersion: "0.34.0" });
    const before = core.canonicalJson(await negative.readSnapshot());
    const failures: string[] = [];
    for (const kind of ["v10", "unknown-field", "broken-chain"]) {
      const candidate = structuredClone(backup);
      if (kind === "v10") candidate.manifest.dataSchemaVersion = 10;
      if (kind === "unknown-field") {
        candidate.payload.settings.find((record) => record.id === completion.id)!.reservationCreated = true;
      }
      if (kind === "broken-chain") {
        const record = candidate.payload.settings.find((entry) =>
          entry.settingType === play.PLAY_FAMILY_CYCLE_SETTING_TYPE &&
          entry.workflow?.kind === "family-feedback");
        record.previousRecordId = crypto.randomUUID();
      }
      candidate.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(candidate.payload));
      try {
        await negativeService.restoreBackup(candidate, { mode: "replace", createRecoverySnapshot: false });
      } catch {
        failures.push(kind);
      }
    }
    const unchanged = before === core.canonicalJson(await negative.readSnapshot());
    source.close();
    target.close();
    negative.close();
    return {
      schemaVersion: backup.manifest.dataSchemaVersion,
      exact: core.canonicalJson(expected) === core.canonicalJson(actual),
      types,
      encryptedNoPlaintext: !encrypted.includes("MEB-RND-KURGU-0042") &&
        !encrypted.includes("Yakını, kumaş parçalarıyla"),
      receipt: restore.lastRestoreVerification !== null,
      failures,
      unchanged,
    };
  });

  expect(result.schemaVersion).toBe(11);
  expect(result.exact).toBe(true);
  expect(result.types).toEqual([
    "official-appointment-transition-v1",
    "play-family-cycle-v1",
    "play-family-cycle-v1",
    "play-family-cycle-v1",
    "play-family-cycle-v1",
  ]);
  expect(result.encryptedNoPlaintext).toBe(true);
  expect(result.receipt).toBe(true);
  expect(result.failures).toEqual(["v10", "unknown-field", "broken-chain"]);
  expect(result.unchanged).toBe(true);
});
