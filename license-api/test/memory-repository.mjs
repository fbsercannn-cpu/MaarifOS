export class MemoryLicenseRepository {
  constructor() {
    this.challenges = new Map();
    this.rateLimits = new Map();
    this.idempotency = new Map();
    this.bindings = new Map();
    this.tombstones = new Map();
    this.audits = [];
    this.lockTail = Promise.resolve();
  }

  async withLock(callback) {
    let release;
    const predecessor = this.lockTail;
    this.lockTail = new Promise((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return callback();
    } finally {
      release();
    }
  }

  async createChallenge(challenge) {
    return this.withLock(() => {
      if (this.challenges.has(challenge.challengeId)) {
        throw new Error("duplicate_challenge");
      }
      this.challenges.set(challenge.challengeId, {
        ...structuredClone(challenge),
        usedAtUtc: null,
        usedIdempotencyKey: null,
        usedRequestFingerprint: null,
      });
      return challenge;
    });
  }

  async getChallenge(challengeId) {
    const challenge = this.challenges.get(challengeId);
    return challenge ? structuredClone(challenge) : null;
  }

  async claimChallenge(input) {
    return this.withLock(() => {
      const current = this.challenges.get(input.challengeId);
      if (
        !current ||
        current.purpose !== input.purpose ||
        current.deviceKeyThumbprint !== input.deviceKeyThumbprint ||
        current.expiresAtUtc <= input.nowUtc
      ) {
        return "rejected";
      }
      if (current.usedAtUtc === null) {
        current.usedAtUtc = input.nowUtc;
        current.usedIdempotencyKey = input.idempotencyKey;
        current.usedRequestFingerprint = input.requestFingerprint;
        return "claimed";
      }
      return current.usedIdempotencyKey === input.idempotencyKey &&
        current.usedRequestFingerprint === input.requestFingerprint
        ? "same-request"
        : "rejected";
    });
  }

  async incrementRateLimit(input) {
    return this.withLock(() => {
      const key = `${input.scope}\u0000${input.keyHmac}\u0000${input.bucketStartEpoch}`;
      const next = (this.rateLimits.get(key)?.count ?? 0) + 1;
      this.rateLimits.set(key, { ...structuredClone(input), count: next });
      return next;
    });
  }

  async getIdempotency(idempotencyKey) {
    const value = this.idempotency.get(idempotencyKey);
    return value ? structuredClone(value) : null;
  }

  async putIdempotency(record) {
    return this.withLock(() => {
      if (!this.idempotency.has(record.idempotencyKey)) {
        this.idempotency.set(record.idempotencyKey, structuredClone(record));
      }
      return structuredClone(this.idempotency.get(record.idempotencyKey));
    });
  }

  async getActiveBinding(deviceKeyThumbprint) {
    const binding = [...this.bindings.values()].find(
      (candidate) =>
        candidate.active && candidate.deviceKeyThumbprint === deviceKeyThumbprint,
    );
    return binding ? structuredClone(binding) : null;
  }

  async isFounderDeviceTombstoned(deviceKeyThumbprint) {
    return this.tombstones.has(deviceKeyThumbprint);
  }

  async claimFounderDevice(input) {
    return this.withLock(() => {
      if (this.tombstones.has(input.deviceKeyThumbprint)) {
        return { status: "denied", binding: null };
      }
      const existing = [...this.bindings.values()].find(
        (candidate) =>
          candidate.active &&
          candidate.deviceKeyThumbprint === input.deviceKeyThumbprint,
      );
      if (existing) {
        existing.lastIssuedAtUtc = input.nowUtc;
        return { status: "existing", binding: structuredClone(existing) };
      }
      let slot = [1, 2].find((candidate) => !this.bindings.has(candidate));
      if (slot === undefined) {
        slot = [1, 2].find((candidate) => !this.bindings.get(candidate).active);
      }
      if (slot === undefined) return { status: "limit", binding: null };
      const previous = this.bindings.get(slot);
      const binding = {
        slot,
        deviceKeyThumbprint: input.deviceKeyThumbprint,
        devicePublicKeyJwkJson: input.devicePublicKeyJwkJson,
        entitlementId: input.entitlementId,
        active: true,
        revocationGeneration: previous?.revocationGeneration ?? 0,
        activatedAtUtc: input.nowUtc,
        lastIssuedAtUtc: input.nowUtc,
        lastOperatorRequestId: null,
      };
      this.bindings.set(slot, binding);
      return { status: "claimed", binding: structuredClone(binding) };
    });
  }

  async touchBinding(deviceKeyThumbprint, nowUtc) {
    return this.withLock(() => {
      const binding = [...this.bindings.values()].find(
        (candidate) =>
          candidate.active && candidate.deviceKeyThumbprint === deviceKeyThumbprint,
      );
      if (binding) binding.lastIssuedAtUtc = nowUtc;
    });
  }

  async deactivateSlot(slot, nowUtc, operatorRequestId = `operator-reset-${slot}`) {
    return this.withLock(() => {
      const binding = this.bindings.get(slot);
      if (!binding || !binding.active) return false;
      if (this.tombstones.has(binding.deviceKeyThumbprint)) {
        throw new Error("founder_device_tombstone_conflict");
      }
      this.tombstones.set(binding.deviceKeyThumbprint, {
        deviceKeyThumbprint: binding.deviceKeyThumbprint,
        entitlementId: binding.entitlementId,
        slot,
        revocationGeneration: binding.revocationGeneration + 1,
        tombstonedAtUtc: nowUtc,
        operatorRequestId,
      });
      binding.active = false;
      binding.revocationGeneration += 1;
      binding.lastIssuedAtUtc = nowUtc;
      binding.lastOperatorRequestId = operatorRequestId;
      this.audits.push({
        requestId: operatorRequestId,
        occurredAtUtc: nowUtc,
        eventType: "founder_slot_deactivated",
        result: "success",
        reasonCode: "operator-confirmed-tombstoned",
        pseudonymousIp: null,
        pseudonymousDevice: null,
      });
      return true;
    });
  }

  async countActiveBindings() {
    return [...this.bindings.values()].filter((binding) => binding.active).length;
  }

  async writeAudit(event) {
    this.audits.push(structuredClone(event));
  }
}
