export const LOCAL_SHARED_ACCESS_SCHEMA_VERSION = 1 as const;
export const LOCAL_SHARED_ACCESS_VERIFIER_ID = "maarifos-shared-invite-v1";
export const LOCAL_SHARED_ACCESS_STORAGE_KEY = "maarifos.shared-invite-access.v1";

const EXPECTED_CODE_DIGEST_HEX =
  "f25d9c8880c05d9c431b38534d0346077ae088da5d10f65e9708f33e68ba75be";
const ASCII_SIX_DIGIT_PATTERN = /^[0-9]{6}$/;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type LocalSharedAccessGrant = {
  schemaVersion: typeof LOCAL_SHARED_ACCESS_SCHEMA_VERSION;
  verifierId: typeof LOCAL_SHARED_ACCESS_VERIFIER_ID;
  grantedAtUtc: string;
};

export type LocalSharedAccessStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type LocalSharedAccessInspection =
  | { kind: "granted"; grant: LocalSharedAccessGrant }
  | { kind: "missing" | "invalid" | "storage_unavailable"; grant: null };

export type LocalSharedAccessActivationResult =
  | { ok: true; grant: LocalSharedAccessGrant }
  | { ok: false; reason: "invalid_code" | "environment_unavailable" };

type GrantLocalSharedAccessOptions = {
  code: string;
  storage?: LocalSharedAccessStorage | null;
  subtle?: SubtleCrypto | null;
  now?: Date;
};

function browserStorage(): LocalSharedAccessStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function browserSubtleCrypto(): SubtleCrypto | null {
  try {
    return globalThis.crypto?.subtle ?? null;
  } catch {
    return null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

function constantTimeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

function isExactUtcIso(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_ISO_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isGrant(value: unknown): value is LocalSharedAccessGrant {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "grantedAtUtc" ||
    keys[1] !== "schemaVersion" ||
    keys[2] !== "verifierId"
  ) {
    return false;
  }

  return (
    record.schemaVersion === LOCAL_SHARED_ACCESS_SCHEMA_VERSION &&
    record.verifierId === LOCAL_SHARED_ACCESS_VERIFIER_ID &&
    isExactUtcIso(record.grantedAtUtc)
  );
}

function resolveStorage(
  storage: LocalSharedAccessStorage | null | undefined,
): LocalSharedAccessStorage | null {
  return storage === undefined ? browserStorage() : storage;
}

function resolveSubtleCrypto(
  subtle: SubtleCrypto | null | undefined,
): SubtleCrypto | null {
  return subtle === undefined ? browserSubtleCrypto() : subtle;
}

export function inspectLocalSharedAccess(
  storage?: LocalSharedAccessStorage | null,
): LocalSharedAccessInspection {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return { kind: "storage_unavailable", grant: null };
  }

  let serialized: string | null;
  try {
    serialized = resolvedStorage.getItem(LOCAL_SHARED_ACCESS_STORAGE_KEY);
  } catch {
    return { kind: "storage_unavailable", grant: null };
  }

  if (serialized === null) return { kind: "missing", grant: null };

  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isGrant(candidate)) return { kind: "invalid", grant: null };
    return { kind: "granted", grant: candidate };
  } catch {
    return { kind: "invalid", grant: null };
  }
}

export function hasLocalSharedAccess(
  storage?: LocalSharedAccessStorage | null,
): boolean {
  return inspectLocalSharedAccess(storage).kind === "granted";
}

export async function verifyLocalSharedAccessCode(
  code: string,
  subtle?: SubtleCrypto | null,
): Promise<boolean> {
  if (!ASCII_SIX_DIGIT_PATTERN.test(code)) return false;

  const resolvedSubtle = resolveSubtleCrypto(subtle);
  if (!resolvedSubtle) return false;

  try {
    const candidateDigest = new Uint8Array(
      await resolvedSubtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${LOCAL_SHARED_ACCESS_VERIFIER_ID}:${code}`),
      ),
    );
    const expectedDigest = hexToBytes(EXPECTED_CODE_DIGEST_HEX);
    return constantTimeBytesEqual(candidateDigest, expectedDigest);
  } catch {
    return false;
  }
}

export async function grantLocalSharedAccess({
  code,
  storage,
  subtle,
  now = new Date(),
}: GrantLocalSharedAccessOptions): Promise<LocalSharedAccessActivationResult> {
  const resolvedSubtle = resolveSubtleCrypto(subtle);
  if (!resolvedSubtle) {
    return { ok: false, reason: "environment_unavailable" };
  }

  const verified = await verifyLocalSharedAccessCode(code, resolvedSubtle);
  if (!verified) return { ok: false, reason: "invalid_code" };

  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return { ok: false, reason: "environment_unavailable" };
  }

  let grantedAtUtc: string;
  try {
    grantedAtUtc = now.toISOString();
  } catch {
    return { ok: false, reason: "environment_unavailable" };
  }

  const grant: LocalSharedAccessGrant = {
    schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
    verifierId: LOCAL_SHARED_ACCESS_VERIFIER_ID,
    grantedAtUtc,
  };

  try {
    resolvedStorage.setItem(
      LOCAL_SHARED_ACCESS_STORAGE_KEY,
      JSON.stringify(grant),
    );
    const persisted = inspectLocalSharedAccess(resolvedStorage);
    if (
      persisted.kind !== "granted" ||
      persisted.grant.grantedAtUtc !== grant.grantedAtUtc
    ) {
      return { ok: false, reason: "environment_unavailable" };
    }
  } catch {
    return { ok: false, reason: "environment_unavailable" };
  }

  return { ok: true, grant };
}

export function resetLocalSharedAccess(
  storage?: LocalSharedAccessStorage | null,
): boolean {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.removeItem(LOCAL_SHARED_ACCESS_STORAGE_KEY);
    return resolvedStorage.getItem(LOCAL_SHARED_ACCESS_STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
