PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS founder_challenges (
  challenge_id TEXT PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose = 'redeem-code'),
  device_thumbprint TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  expires_at_utc TEXT NOT NULL,
  used_at_utc TEXT,
  used_idempotency_key TEXT,
  used_request_fingerprint TEXT,
  CHECK (
    (used_at_utc IS NULL AND used_idempotency_key IS NULL AND used_request_fingerprint IS NULL)
    OR
    (used_at_utc IS NOT NULL AND used_idempotency_key IS NOT NULL AND used_request_fingerprint IS NOT NULL)
  )
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_founder_challenges_expiry
  ON founder_challenges (expires_at_utc);

CREATE TABLE IF NOT EXISTS founder_device_bindings (
  slot INTEGER PRIMARY KEY CHECK (slot IN (1, 2)),
  device_thumbprint TEXT NOT NULL UNIQUE,
  device_public_jwk_json TEXT NOT NULL,
  entitlement_id TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  revocation_generation INTEGER NOT NULL DEFAULT 0 CHECK (revocation_generation >= 0),
  activated_at_utc TEXT NOT NULL,
  last_issued_at_utc TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_active_device
  ON founder_device_bindings (device_thumbprint)
  WHERE active = 1;

CREATE TABLE IF NOT EXISTS founder_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  device_thumbprint TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  entitlement_token TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (challenge_id) REFERENCES founder_challenges(challenge_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_founder_idempotency_device
  ON founder_idempotency (device_thumbprint, created_at_utc);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  scope TEXT NOT NULL,
  key_hmac TEXT NOT NULL,
  bucket_start_epoch INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  expires_at_utc TEXT NOT NULL,
  PRIMARY KEY (scope, key_hmac, bucket_start_epoch)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry
  ON rate_limit_buckets (expires_at_utc);

CREATE TABLE IF NOT EXISTS license_audit_events (
  request_id TEXT PRIMARY KEY,
  occurred_at_utc TEXT NOT NULL,
  civil_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  result TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  pseudonymous_ip TEXT,
  pseudonymous_device TEXT,
  content_release_id TEXT
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_license_audit_occurred
  ON license_audit_events (occurred_at_utc);
