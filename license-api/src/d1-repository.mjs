const SQL = Object.freeze({
  insertChallenge: `
    INSERT INTO founder_challenges (
      challenge_id, nonce, purpose, device_thumbprint, created_at_utc, expires_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
  getChallenge: `
    SELECT challenge_id, nonce, purpose, device_thumbprint, created_at_utc,
           expires_at_utc, used_at_utc, used_idempotency_key,
           used_request_fingerprint
      FROM founder_challenges
     WHERE challenge_id = ?
  `,
  claimChallenge: `
    UPDATE founder_challenges
       SET used_at_utc = ?, used_idempotency_key = ?, used_request_fingerprint = ?
     WHERE challenge_id = ?
       AND purpose = ?
       AND device_thumbprint = ?
       AND expires_at_utc > ?
       AND used_at_utc IS NULL
  `,
  incrementRateLimit: `
    INSERT INTO rate_limit_buckets (
      scope, key_hmac, bucket_start_epoch, count, expires_at_utc
    ) VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(scope, key_hmac, bucket_start_epoch)
    DO UPDATE SET count = rate_limit_buckets.count + 1,
                  expires_at_utc = excluded.expires_at_utc
    RETURNING count
  `,
  getIdempotency: `
    SELECT idempotency_key, challenge_id, device_thumbprint, request_fingerprint,
           entitlement_token, created_at_utc
      FROM founder_idempotency
     WHERE idempotency_key = ?
  `,
  insertIdempotency: `
    INSERT OR IGNORE INTO founder_idempotency (
      idempotency_key, challenge_id, device_thumbprint, request_fingerprint,
      entitlement_token, created_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
  getActiveBinding: `
    SELECT slot, device_thumbprint, device_public_jwk_json, entitlement_id,
           active, revocation_generation, activated_at_utc, last_issued_at_utc
      FROM founder_device_bindings
     WHERE device_thumbprint = ? AND active = 1
  `,
  isFounderDeviceTombstoned: `
    SELECT 1 AS denied
      FROM founder_device_tombstones
     WHERE device_thumbprint = ?
  `,
  insertBinding: `
    INSERT OR IGNORE INTO founder_device_bindings (
      slot, device_thumbprint, device_public_jwk_json, entitlement_id,
      active, activated_at_utc, last_issued_at_utc
    )
    SELECT ?, ?, ?, ?, 1, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM founder_device_tombstones WHERE device_thumbprint = ?
     )
  `,
  rebindInactiveSlot: `
    UPDATE founder_device_bindings
       SET device_thumbprint = ?, device_public_jwk_json = ?, entitlement_id = ?,
           active = 1, activated_at_utc = ?, last_issued_at_utc = ?,
           last_operator_request_id = NULL
     WHERE slot = ? AND active = 0
       AND NOT EXISTS (
         SELECT 1 FROM founder_device_tombstones WHERE device_thumbprint = ?
       )
  `,
  touchBinding: `
    UPDATE founder_device_bindings
       SET last_issued_at_utc = ?
     WHERE device_thumbprint = ? AND active = 1
  `,
  countActiveBindings: `
    SELECT COUNT(*) AS count
      FROM founder_device_bindings
     WHERE active = 1
  `,
  insertAudit: `
    INSERT OR IGNORE INTO license_audit_events (
      request_id, occurred_at_utc, civil_date, event_type, result,
      reason_code, pseudonymous_ip, pseudonymous_device, content_release_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
});

function changes(result) {
  return Number(result?.meta?.changes ?? result?.meta?.rows_written ?? 0);
}

function mapChallenge(row) {
  if (!row) return null;
  return Object.freeze({
    challengeId: row.challenge_id,
    nonce: row.nonce,
    purpose: row.purpose,
    deviceKeyThumbprint: row.device_thumbprint,
    createdAtUtc: row.created_at_utc,
    expiresAtUtc: row.expires_at_utc,
    usedAtUtc: row.used_at_utc,
    usedIdempotencyKey: row.used_idempotency_key,
    usedRequestFingerprint: row.used_request_fingerprint,
  });
}

function mapBinding(row) {
  if (!row) return null;
  return Object.freeze({
    slot: Number(row.slot),
    deviceKeyThumbprint: row.device_thumbprint,
    devicePublicKeyJwkJson: row.device_public_jwk_json,
    entitlementId: row.entitlement_id,
    active: Number(row.active) === 1,
    revocationGeneration: Number(row.revocation_generation),
    activatedAtUtc: row.activated_at_utc,
    lastIssuedAtUtc: row.last_issued_at_utc,
  });
}

export class D1LicenseRepository {
  constructor(database) {
    if (!database || typeof database.prepare !== "function") {
      throw new Error("license_database_missing");
    }
    this.database = database;
  }

  async createChallenge(challenge) {
    await this.database
      .prepare(SQL.insertChallenge)
      .bind(
        challenge.challengeId,
        challenge.nonce,
        challenge.purpose,
        challenge.deviceKeyThumbprint,
        challenge.createdAtUtc,
        challenge.expiresAtUtc,
      )
      .run();
    return challenge;
  }

  async getChallenge(challengeId) {
    return mapChallenge(
      await this.database.prepare(SQL.getChallenge).bind(challengeId).first(),
    );
  }

  async claimChallenge({
    challengeId,
    purpose,
    deviceKeyThumbprint,
    nowUtc,
    idempotencyKey,
    requestFingerprint,
  }) {
    const result = await this.database
      .prepare(SQL.claimChallenge)
      .bind(
        nowUtc,
        idempotencyKey,
        requestFingerprint,
        challengeId,
        purpose,
        deviceKeyThumbprint,
        nowUtc,
      )
      .run();
    if (changes(result) > 0) return "claimed";
    const current = await this.getChallenge(challengeId);
    if (
      current &&
      current.purpose === purpose &&
      current.deviceKeyThumbprint === deviceKeyThumbprint &&
      current.expiresAtUtc > nowUtc &&
      current.usedIdempotencyKey === idempotencyKey &&
      current.usedRequestFingerprint === requestFingerprint
    ) {
      return "same-request";
    }
    return "rejected";
  }

  async incrementRateLimit({ scope, keyHmac, bucketStartEpoch, expiresAtUtc }) {
    const row = await this.database
      .prepare(SQL.incrementRateLimit)
      .bind(scope, keyHmac, bucketStartEpoch, expiresAtUtc)
      .first();
    return Number(row?.count ?? 0);
  }

  async getIdempotency(idempotencyKey) {
    const row = await this.database
      .prepare(SQL.getIdempotency)
      .bind(idempotencyKey)
      .first();
    if (!row) return null;
    return Object.freeze({
      idempotencyKey: row.idempotency_key,
      challengeId: row.challenge_id,
      deviceKeyThumbprint: row.device_thumbprint,
      requestFingerprint: row.request_fingerprint,
      entitlementToken: row.entitlement_token,
      createdAtUtc: row.created_at_utc,
    });
  }

  async putIdempotency(record) {
    await this.database
      .prepare(SQL.insertIdempotency)
      .bind(
        record.idempotencyKey,
        record.challengeId,
        record.deviceKeyThumbprint,
        record.requestFingerprint,
        record.entitlementToken,
        record.createdAtUtc,
      )
      .run();
    return this.getIdempotency(record.idempotencyKey);
  }

  async getActiveBinding(deviceKeyThumbprint) {
    return mapBinding(
      await this.database
        .prepare(SQL.getActiveBinding)
        .bind(deviceKeyThumbprint)
        .first(),
    );
  }

  async isFounderDeviceTombstoned(deviceKeyThumbprint) {
    const row = await this.database
      .prepare(SQL.isFounderDeviceTombstoned)
      .bind(deviceKeyThumbprint)
      .first();
    return Number(row?.denied ?? 0) === 1;
  }

  async claimFounderDevice({
    deviceKeyThumbprint,
    devicePublicKeyJwkJson,
    entitlementId,
    nowUtc,
  }) {
    if (await this.isFounderDeviceTombstoned(deviceKeyThumbprint)) {
      return Object.freeze({ status: "denied", binding: null });
    }
    const existing = await this.getActiveBinding(deviceKeyThumbprint);
    if (existing) {
      await this.touchBinding(deviceKeyThumbprint, nowUtc);
      return Object.freeze({ status: "existing", binding: existing });
    }
    for (const slot of [1, 2]) {
      await this.database
        .prepare(SQL.insertBinding)
        .bind(
          slot,
          deviceKeyThumbprint,
          devicePublicKeyJwkJson,
          entitlementId,
          nowUtc,
          nowUtc,
          deviceKeyThumbprint,
        )
        .run();
      const claimed = await this.getActiveBinding(deviceKeyThumbprint);
      if (claimed) {
        return Object.freeze({ status: "claimed", binding: claimed });
      }
      try {
        await this.database
          .prepare(SQL.rebindInactiveSlot)
          .bind(
            deviceKeyThumbprint,
            devicePublicKeyJwkJson,
            entitlementId,
            nowUtc,
            nowUtc,
            slot,
            deviceKeyThumbprint,
          )
          .run();
      } catch {
        // A concurrent claimant or a retained unique device row won this slot.
      }
      const rebound = await this.getActiveBinding(deviceKeyThumbprint);
      if (rebound) {
        return Object.freeze({ status: "claimed", binding: rebound });
      }
    }
    return Object.freeze({ status: "limit", binding: null });
  }

  async touchBinding(deviceKeyThumbprint, nowUtc) {
    await this.database
      .prepare(SQL.touchBinding)
      .bind(nowUtc, deviceKeyThumbprint)
      .run();
  }

  async countActiveBindings() {
    const row = await this.database.prepare(SQL.countActiveBindings).first();
    return Number(row?.count ?? 0);
  }

  async writeAudit(event) {
    await this.database
      .prepare(SQL.insertAudit)
      .bind(
        event.requestId,
        event.occurredAtUtc,
        event.civilDate,
        event.eventType,
        event.result,
        event.reasonCode,
        event.pseudonymousIp ?? null,
        event.pseudonymousDevice ?? null,
        event.contentReleaseId ?? null,
      )
      .run();
  }
}

export function createD1LicenseRepository(env) {
  return new D1LicenseRepository(env.LICENSE_DB);
}
