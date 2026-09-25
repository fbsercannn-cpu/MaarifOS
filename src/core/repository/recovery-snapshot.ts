import { canonicalClone, canonicalJson } from "../backup/canonical-json";
import { sha256Hex } from "../backup/crypto";
import { assertBackupEnvelope, type BackupEnvelope } from "../backup/schema";
import {
  RECOVERY_SNAPSHOT_REASONS,
  type RecoverySnapshotMetadata,
  type RecoverySnapshotReason,
  type RecoverySnapshotRecord,
} from "./contracts";

export const DEFAULT_RECOVERY_SNAPSHOT_RETENTION = 5;
export const MAX_RECOVERY_SNAPSHOT_RETENTION = 20;

const UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RECORD_KEYS = [
  "checksumAlgorithm",
  "createdAt",
  "envelope",
  "id",
  "reason",
  "snapshotChecksum",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isRecoveryReason(value: unknown): value is RecoverySnapshotReason {
  return RECOVERY_SNAPSHOT_REASONS.includes(value as RecoverySnapshotReason);
}

function checksumInput(
  snapshot: Omit<RecoverySnapshotRecord, "snapshotChecksum">,
): unknown {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    checksumAlgorithm: snapshot.checksumAlgorithm,
    envelope: snapshot.envelope,
  };
}

export function validateRecoveryRetentionLimit(
  value: number | undefined,
): number {
  const retention = value ?? DEFAULT_RECOVERY_SNAPSHOT_RETENTION;
  if (
    !Number.isInteger(retention) ||
    retention < 1 ||
    retention > MAX_RECOVERY_SNAPSHOT_RETENTION
  ) {
    throw new Error(
      `Kurtarma snapshot saklama sınırı 1-${MAX_RECOVERY_SNAPSHOT_RETENTION} arasında olmalıdır.`,
    );
  }
  return retention;
}

export function assertRecoverySnapshotRecordStructure(
  value: unknown,
): asserts value is RecoverySnapshotRecord {
  if (!isRecord(value) || !exactKeys(value, RECORD_KEYS)) {
    throw new Error("Kurtarma snapshot kaydı eksik veya geçersiz.");
  }
  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.createdAt !== "string" ||
    !UTC_ISO_PATTERN.test(value.createdAt) ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !isRecoveryReason(value.reason) ||
    value.checksumAlgorithm !== "SHA-256" ||
    typeof value.snapshotChecksum !== "string" ||
    !SHA256_PATTERN.test(value.snapshotChecksum)
  ) {
    throw new Error("Kurtarma snapshot metadata alanları geçersiz.");
  }
  assertBackupEnvelope(value.envelope);
}

export async function createRecoverySnapshotRecord(
  envelope: BackupEnvelope,
  reason: RecoverySnapshotReason,
  options: {
    id?: string;
    createdAt?: string;
  } = {},
): Promise<RecoverySnapshotRecord> {
  assertBackupEnvelope(envelope);
  if (!isRecoveryReason(reason)) {
    throw new Error("Kurtarma snapshot nedeni geçersiz.");
  }
  const id = options.id ?? globalThis.crypto.randomUUID();
  const createdAt = options.createdAt ?? new Date().toISOString();
  const snapshotWithoutChecksum = {
    id,
    createdAt,
    reason,
    checksumAlgorithm: "SHA-256" as const,
    envelope: canonicalClone(envelope),
  };
  const snapshot: RecoverySnapshotRecord = {
    ...snapshotWithoutChecksum,
    snapshotChecksum: await sha256Hex(
      canonicalJson(checksumInput(snapshotWithoutChecksum)),
    ),
  };
  assertRecoverySnapshotRecordStructure(snapshot);
  return canonicalClone(snapshot);
}

export async function verifyRecoverySnapshotRecord(
  value: unknown,
): Promise<RecoverySnapshotRecord> {
  assertRecoverySnapshotRecordStructure(value);
  const expected = await sha256Hex(
    canonicalJson(
      checksumInput({
        id: value.id,
        createdAt: value.createdAt,
        reason: value.reason,
        checksumAlgorithm: value.checksumAlgorithm,
        envelope: value.envelope,
      }),
    ),
  );
  if (expected !== value.snapshotChecksum) {
    throw new Error(
      "Kurtarma snapshot bütünlük kontrolünü geçemedi; kayıt bozuk veya değiştirilmiş.",
    );
  }
  return canonicalClone(value);
}

export function recoverySnapshotMetadata(
  snapshot: RecoverySnapshotRecord,
): RecoverySnapshotMetadata {
  assertRecoverySnapshotRecordStructure(snapshot);
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    snapshotChecksum: snapshot.snapshotChecksum,
    entityCount: Object.values(snapshot.envelope.manifest.entityCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}
