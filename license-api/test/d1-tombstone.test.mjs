import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { D1LicenseRepository } from "../src/d1-repository.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(testDirectory, "..");

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.parameters = [];
  }

  bind(...parameters) {
    this.parameters = parameters;
    return this;
  }

  async run() {
    const result = this.statement.run(...this.parameters);
    return { meta: { changes: Number(result.changes) } };
  }

  async first() {
    return this.statement.get(...this.parameters) ?? null;
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database.prepare(sql));
  }
}

async function applyMigrations(database) {
  for (const migration of [
    "0001_founder_license.sql",
    "0002_operator_reset_audit_link.sql",
    "0003_founder_device_tombstones.sql",
  ]) {
    database.exec(await readFile(
      resolve(licenseApiRoot, "migrations", migration),
      "utf8",
    ));
  }
}

function operatorReset(database, slot, occurredAtUtc, requestId) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const tombstone = database.prepare(`
      INSERT INTO founder_device_tombstones (
        device_thumbprint, entitlement_id, slot, revocation_generation,
        tombstoned_at_utc, operator_request_id
      )
      SELECT device_thumbprint, entitlement_id, slot,
             revocation_generation + 1, ?, ?
        FROM founder_device_bindings
       WHERE slot = ? AND active = 1
    `).run(occurredAtUtc, requestId, slot);
    const deactivated = database.prepare(`
      UPDATE founder_device_bindings
         SET active = 0,
             revocation_generation = revocation_generation + 1,
             last_issued_at_utc = ?,
             last_operator_request_id = ?
       WHERE slot = ? AND active = 1
         AND EXISTS (
           SELECT 1 FROM founder_device_tombstones
            WHERE operator_request_id = ? AND slot = ?
         )
    `).run(occurredAtUtc, requestId, slot, requestId, slot);
    const audited = database.prepare(`
      INSERT INTO license_audit_events (
        request_id, occurred_at_utc, civil_date, event_type, result,
        reason_code, pseudonymous_ip, pseudonymous_device, content_release_id
      ) VALUES (?, ?, '2026-08-09', 'founder_slot_deactivated', 'success',
                'operator-confirmed-tombstoned', NULL, NULL, 'test-release')
    `).run(requestId, occurredAtUtc);
    assert.equal(Number(tombstone.changes), 1);
    assert.equal(Number(deactivated.changes), 1);
    assert.equal(Number(audited.changes), 1);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

test("migration 0003 and D1 repository retain former-device tombstones across repeated slot reuse", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    await applyMigrations(database);
    const repository = new D1LicenseRepository(new SqliteD1Database(database));
    const firstThumbprint = `sha256:${"A".repeat(43)}`;
    const secondThumbprint = `sha256:${"B".repeat(43)}`;
    const thirdThumbprint = `sha256:${"C".repeat(43)}`;
    const first = await repository.claimFounderDevice({
      deviceKeyThumbprint: firstThumbprint,
      devicePublicKeyJwkJson: "{}",
      entitlementId: "entitlement-first",
      nowUtc: "2026-08-09T10:00:00.000Z",
    });
    assert.equal(first.status, "claimed");
    assert.equal(first.binding.slot, 1);

    operatorReset(
      database,
      1,
      "2026-08-09T10:01:00.000Z",
      "10000000-0000-4000-8000-000000000201",
    );
    assert.equal(await repository.isFounderDeviceTombstoned(firstThumbprint), true);
    assert.deepEqual(
      await repository.claimFounderDevice({
        deviceKeyThumbprint: firstThumbprint,
        devicePublicKeyJwkJson: "{}",
        entitlementId: "entitlement-first-replay",
        nowUtc: "2026-08-09T10:02:00.000Z",
      }),
      { status: "denied", binding: null },
    );

    const second = await repository.claimFounderDevice({
      deviceKeyThumbprint: secondThumbprint,
      devicePublicKeyJwkJson: "{}",
      entitlementId: "entitlement-second",
      nowUtc: "2026-08-09T10:03:00.000Z",
    });
    assert.equal(second.status, "claimed");
    assert.equal(second.binding.slot, 1);
    assert.equal(second.binding.revocationGeneration, 1);

    operatorReset(
      database,
      1,
      "2026-08-09T10:04:00.000Z",
      "10000000-0000-4000-8000-000000000202",
    );
    assert.equal(await repository.isFounderDeviceTombstoned(firstThumbprint), true);
    assert.equal(await repository.isFounderDeviceTombstoned(secondThumbprint), true);
    assert.equal(
      Number(database.prepare("SELECT COUNT(*) AS count FROM founder_device_tombstones").get().count),
      2,
    );

    const third = await repository.claimFounderDevice({
      deviceKeyThumbprint: thirdThumbprint,
      devicePublicKeyJwkJson: "{}",
      entitlementId: "entitlement-third",
      nowUtc: "2026-08-09T10:05:00.000Z",
    });
    assert.equal(third.status, "claimed");
    assert.equal(third.binding.slot, 1);
    assert.equal(third.binding.revocationGeneration, 2);

    assert.throws(
      () => database.prepare(`
        UPDATE founder_device_tombstones
           SET tombstoned_at_utc = '2026-08-09T11:00:00.000Z'
         WHERE device_thumbprint = ?
      `).run(firstThumbprint),
      /append_only/,
    );
    assert.throws(
      () => database.prepare(
        "DELETE FROM founder_device_tombstones WHERE device_thumbprint = ?",
      ).run(firstThumbprint),
      /append_only/,
    );
    const audits = database.prepare(`
      SELECT reason_code, pseudonymous_device
        FROM license_audit_events
       WHERE event_type = 'founder_slot_deactivated'
       ORDER BY occurred_at_utc
    `).all().map((row) => ({
      reason_code: row.reason_code,
      pseudonymous_device: row.pseudonymous_device,
    }));
    assert.deepEqual(audits, [
      { reason_code: "operator-confirmed-tombstoned", pseudonymous_device: null },
      { reason_code: "operator-confirmed-tombstoned", pseudonymous_device: null },
    ]);
  } finally {
    database.close();
  }
});
