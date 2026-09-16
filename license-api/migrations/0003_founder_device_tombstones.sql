PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS founder_device_tombstones (
  device_thumbprint TEXT PRIMARY KEY,
  entitlement_id TEXT NOT NULL UNIQUE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  revocation_generation INTEGER NOT NULL CHECK (revocation_generation > 0),
  tombstoned_at_utc TEXT NOT NULL,
  operator_request_id TEXT NOT NULL UNIQUE
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_founder_device_tombstones_occurred
  ON founder_device_tombstones (tombstoned_at_utc);

CREATE TRIGGER IF NOT EXISTS founder_device_tombstones_append_only_update
BEFORE UPDATE ON founder_device_tombstones
BEGIN
  SELECT RAISE(ABORT, 'founder_device_tombstones_append_only');
END;

CREATE TRIGGER IF NOT EXISTS founder_device_tombstones_append_only_delete
BEFORE DELETE ON founder_device_tombstones
BEGIN
  SELECT RAISE(ABORT, 'founder_device_tombstones_append_only');
END;
