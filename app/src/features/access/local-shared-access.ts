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
  subtle?: LocalSharedAccessSubtleCrypto | null;
  now?: Date;
};

function browserStorage(): LocalSharedAccessStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function pureJsSha256(bytes: Uint8Array): ArrayBuffer {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const l = bytes.length;
  const bitLen = l * 8;
  const padLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
  const totalLen = l + padLen + 8;
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[l] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(totalLen - 4, bitLen, false);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const out = new ArrayBuffer(32);
  const outView = new DataView(out);
  outView.setUint32(0, H0, false);
  outView.setUint32(4, H1, false);
  outView.setUint32(8, H2, false);
  outView.setUint32(12, H3, false);
  outView.setUint32(16, H4, false);
  outView.setUint32(20, H5, false);
  outView.setUint32(24, H6, false);
  outView.setUint32(28, H7, false);
  return out;
}

export type LocalSharedAccessSubtleCrypto =
  | SubtleCrypto
  | { digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> };

function browserSubtleCrypto(): LocalSharedAccessSubtleCrypto | null {
  try {
    if (globalThis.crypto?.subtle) {
      return globalThis.crypto.subtle;
    }
    // Fallback for non-secure HTTP contexts (e.g. LAN IP http://192.168.x.x where crypto.subtle is restricted)
    return {
      async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
        if (algorithm !== "SHA-256") throw new Error("Unsupported algorithm");
        const bytes =
          data instanceof Uint8Array
            ? data
            : new Uint8Array(
                ArrayBuffer.isView(data)
                  ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
                  : data,
              );
        return pureJsSha256(bytes);
      },
    };
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
  subtle: LocalSharedAccessSubtleCrypto | null | undefined,
): LocalSharedAccessSubtleCrypto | null {
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
  subtle?: LocalSharedAccessSubtleCrypto | null,
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
