import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCAL_TEACHER_IDENTITY_SETTING_ID,
  LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
  resolveLocalTeacherIdentity,
} from "../../src/features/evidence/local-teacher-identity.ts";

const teacherUserId = "00000000-0000-4000-9000-000000000099";

function identitySetting(overrides = {}) {
  return {
    id: LOCAL_TEACHER_IDENTITY_SETTING_ID,
    settingType: LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
    teacherUserId,
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-10T08:00:00.000Z",
    civilDate: "2026-09-10",
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function transactionHarness(initialSettings = []) {
  const settings = structuredClone(initialSettings);
  const writes = [];
  return {
    settings,
    writes,
    transaction: {
      async getAll(collection) {
        assert.equal(collection, "settings");
        return structuredClone(settings);
      },
      async putMany(collection, records) {
        assert.equal(collection, "settings");
        writes.push(structuredClone(records));
        const byId = new Map(settings.map((record) => [record.id, record]));
        for (const record of records) byId.set(record.id, structuredClone(record));
        settings.splice(0, settings.length, ...byId.values());
      },
      async clear(collection) {
        assert.equal(collection, "settings");
        settings.splice(0, settings.length);
      },
    },
  };
}

test("aktif yerel öğretmen kimliği geçmişe dönük onayda sıfır yazımla reddedilir", async () => {
  const activeIdentity = identitySetting({
    updatedAt: "2026-09-11T08:00:00.000Z",
  });
  const harness = transactionHarness([activeIdentity]);

  await assert.rejects(
    resolveLocalTeacherIdentity(harness.transaction, {
      now: new Date("2026-09-05T08:00:00.000Z"),
    }),
    /geçmişe dönük onay veya canlandırma/,
  );
  assert.equal(harness.writes.length, 0);
  assert.deepEqual(harness.settings, [activeIdentity]);
});

test("tombstoned kimlik geçmişe canlandırılmaz, ileri zamanda aynı UUID ile canlanır", async () => {
  const tombstonedIdentity = identitySetting({
    updatedAt: "2026-09-11T08:00:00.000Z",
    deletedAt: "2026-09-11T08:00:00.000Z",
  });
  const rejected = transactionHarness([tombstonedIdentity]);

  await assert.rejects(
    resolveLocalTeacherIdentity(rejected.transaction, {
      now: new Date("2026-09-05T08:00:00.000Z"),
    }),
    /geçmişe dönük onay veya canlandırma/,
  );
  assert.equal(rejected.writes.length, 0);
  assert.deepEqual(rejected.settings, [tombstonedIdentity]);

  const revived = transactionHarness([tombstonedIdentity]);
  const resolvedTeacherUserId = await resolveLocalTeacherIdentity(
    revived.transaction,
    { now: new Date("2026-09-12T08:00:00.000Z") },
  );
  assert.equal(resolvedTeacherUserId, teacherUserId);
  assert.equal(revived.writes.length, 1);
  assert.deepEqual(revived.settings, [
    {
      ...tombstonedIdentity,
      updatedAt: "2026-09-12T08:00:00.000Z",
      deletedAt: null,
    },
  ]);
});

test("mevcut kimliğin bozuk UTC alanları ve chronology'si fail-closed kalır", async () => {
  const invalidIdentities = [
    identitySetting({ createdAt: "2026-09-10" }),
    identitySetting({ updatedAt: "geçersiz" }),
    identitySetting({ deletedAt: "2026-09-11" }),
    identitySetting({ updatedAt: "2026-09-09T08:00:00.000Z" }),
    identitySetting({
      updatedAt: "2026-09-11T08:00:00.000Z",
      deletedAt: "2026-09-09T08:00:00.000Z",
    }),
  ];
  const missingDeletedAt = identitySetting();
  delete missingDeletedAt.deletedAt;
  invalidIdentities.push(missingDeletedAt);

  for (const invalidIdentity of invalidIdentities) {
    const harness = transactionHarness([invalidIdentity]);
    await assert.rejects(
      resolveLocalTeacherIdentity(harness.transaction, {
        now: new Date("2026-09-12T08:00:00.000Z"),
      }),
      /UTC ISO|zaman çizelgesi/,
    );
    assert.equal(harness.writes.length, 0);
    assert.deepEqual(harness.settings, [invalidIdentity]);
  }
});

test("yeni kimlik oluşturulur ve ileri tarihli aktif kimlik yazmadan yeniden kullanılır", async () => {
  const fresh = transactionHarness();
  const createdTeacherUserId = await resolveLocalTeacherIdentity(
    fresh.transaction,
    { now: new Date("2026-09-10T08:00:00.000Z"), requestedTeacherUserId: teacherUserId },
  );
  assert.equal(createdTeacherUserId, teacherUserId);
  assert.equal(fresh.writes.length, 1);
  assert.equal(fresh.settings[0].createdAt, "2026-09-10T08:00:00.000Z");
  assert.equal(fresh.settings[0].updatedAt, "2026-09-10T08:00:00.000Z");
  assert.equal(fresh.settings[0].deletedAt, null);

  fresh.writes.splice(0, fresh.writes.length);
  const reusedTeacherUserId = await resolveLocalTeacherIdentity(
    fresh.transaction,
    { now: new Date("2026-09-11T08:00:00.000Z") },
  );
  assert.equal(reusedTeacherUserId, teacherUserId);
  assert.equal(fresh.writes.length, 0);
});
