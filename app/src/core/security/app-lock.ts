import {
  base64ToBytes,
  bytesToBase64,
  constantTimeEqual,
  deriveVerifierBytes,
  PBKDF2_SALT_BYTES,
  PBKDF2_SHA256_ITERATIONS,
  randomBytes,
} from "../backup/crypto";

export const APP_LOCK_CONFIG_VERSION = 1;
export const APP_LOCK_KDF = "PBKDF2-HMAC-SHA-256";
export const APP_LOCK_VERIFIER_BYTES = 32;

const UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const LOCKOUT_DELAYS_MS = [
  1_000,
  2_000,
  5_000,
  15_000,
  60_000,
  300_000,
  900_000,
] as const;

export interface AppLockConfig {
  version: typeof APP_LOCK_CONFIG_VERSION;
  keyDerivation: typeof APP_LOCK_KDF;
  iterations: number;
  salt: string;
  verifier: string;
  createdAt: string;
}

export interface AppLockAttemptState {
  failedAttempts: number;
  lockedUntil: string | null;
  lastFailedAt: string | null;
}

export type AppLockVerificationStatus = "verified" | "invalid" | "locked";

export interface AppLockVerificationResult {
  verified: boolean;
  status: AppLockVerificationStatus;
  retryAfterMs: number;
  attemptState: AppLockAttemptState;
}

export interface AppLockSessionState {
  unlocked: boolean;
  unlockedAt: string | null;
  attemptState: AppLockAttemptState;
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function validUtc(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UTC_ISO_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function validNow(now: Date): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Uygulama kilidi için geçerli bir UTC zamanı gerekli.");
  }
  return now;
}

export function initialAppLockAttemptState(): AppLockAttemptState {
  return {
    failedAttempts: 0,
    lockedUntil: null,
    lastFailedAt: null,
  };
}

export function assertAppLockConfig(
  value: unknown,
): asserts value is AppLockConfig {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !exactKeys(value, [
      "createdAt",
      "iterations",
      "keyDerivation",
      "salt",
      "verifier",
      "version",
    ])
  ) {
    throw new Error("Uygulama kilidi doğrulayıcı yapılandırması geçersiz.");
  }
  const config = value as Record<string, unknown>;
  if (
    config.version !== APP_LOCK_CONFIG_VERSION ||
    config.keyDerivation !== APP_LOCK_KDF ||
    !Number.isInteger(config.iterations) ||
    (config.iterations as number) < PBKDF2_SHA256_ITERATIONS ||
    (config.iterations as number) > 10_000_000 ||
    !validUtc(config.createdAt)
  ) {
    throw new Error("Uygulama kilidi güvenlik parametreleri geçersiz.");
  }
  base64ToBytes(String(config.salt), PBKDF2_SALT_BYTES);
  base64ToBytes(String(config.verifier), APP_LOCK_VERIFIER_BYTES);
}

export function assertAppLockAttemptState(
  value: unknown,
): asserts value is AppLockAttemptState {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !exactKeys(value, ["failedAttempts", "lastFailedAt", "lockedUntil"])
  ) {
    throw new Error("Uygulama kilidi deneme durumu geçersiz.");
  }
  const state = value as Record<string, unknown>;
  if (
    !Number.isInteger(state.failedAttempts) ||
    (state.failedAttempts as number) < 0 ||
    (state.failedAttempts as number) > 1_000 ||
    (state.lockedUntil !== null && !validUtc(state.lockedUntil)) ||
    (state.lastFailedAt !== null && !validUtc(state.lastFailedAt))
  ) {
    throw new Error("Uygulama kilidi deneme durumu geçersiz.");
  }
}

export async function createAppLockConfig(
  secret: string,
  options: { now?: Date } = {},
): Promise<AppLockConfig> {
  const now = validNow(options.now ?? new Date());
  const salt = randomBytes(PBKDF2_SALT_BYTES);
  try {
    const verifier = await deriveVerifierBytes(
      secret,
      salt,
      PBKDF2_SHA256_ITERATIONS,
    );
    try {
      const config: AppLockConfig = {
        version: APP_LOCK_CONFIG_VERSION,
        keyDerivation: APP_LOCK_KDF,
        iterations: PBKDF2_SHA256_ITERATIONS,
        salt: bytesToBase64(salt),
        verifier: bytesToBase64(verifier),
        createdAt: now.toISOString(),
      };
      assertAppLockConfig(config);
      return { ...config };
    } finally {
      verifier.fill(0);
    }
  } finally {
    salt.fill(0);
  }
}

function lockoutDelay(failedAttempts: number): number {
  const index = Math.min(
    Math.max(failedAttempts - 1, 0),
    LOCKOUT_DELAYS_MS.length - 1,
  );
  return LOCKOUT_DELAYS_MS[index];
}

export async function verifyAppLockSecret(
  secret: string,
  config: AppLockConfig,
  attemptState: AppLockAttemptState = initialAppLockAttemptState(),
  options: { now?: Date } = {},
): Promise<AppLockVerificationResult> {
  assertAppLockConfig(config);
  assertAppLockAttemptState(attemptState);
  const now = validNow(options.now ?? new Date());
  const nowMs = now.getTime();
  const lockedUntilMs =
    attemptState.lockedUntil === null
      ? 0
      : Date.parse(attemptState.lockedUntil);
  if (lockedUntilMs > nowMs) {
    return {
      verified: false,
      status: "locked",
      retryAfterMs: lockedUntilMs - nowMs,
      attemptState: { ...attemptState },
    };
  }

  const salt = base64ToBytes(config.salt, PBKDF2_SALT_BYTES);
  const expected = base64ToBytes(config.verifier, APP_LOCK_VERIFIER_BYTES);
  try {
    const actual = await deriveVerifierBytes(
      secret,
      salt,
      config.iterations,
    );
    try {
      if (constantTimeEqual(actual, expected)) {
        return {
          verified: true,
          status: "verified",
          retryAfterMs: 0,
          attemptState: initialAppLockAttemptState(),
        };
      }
    } finally {
      actual.fill(0);
    }
  } finally {
    salt.fill(0);
    expected.fill(0);
  }

  const failedAttempts = attemptState.failedAttempts + 1;
  const retryAfterMs = lockoutDelay(failedAttempts);
  return {
    verified: false,
    status: "invalid",
    retryAfterMs,
    attemptState: {
      failedAttempts,
      lastFailedAt: now.toISOString(),
      lockedUntil: new Date(nowMs + retryAfterMs).toISOString(),
    },
  };
}

/**
 * Kilit açık durumu yalnız bu nesnenin belleğinde yaşar. Yapılandırma ve
 * deneme metadata'sını kalıcılaştırmak çağıranın sorumluluğundadır; parola/PIN
 * bu sınıfta veya dönen sonuçlarda tutulmaz.
 */
export class AppLockSession {
  private unlocked = false;
  private unlockedAt: string | null = null;
  private attemptState: AppLockAttemptState;

  constructor(
    private readonly config: AppLockConfig,
    initialAttemptState: AppLockAttemptState = initialAppLockAttemptState(),
  ) {
    assertAppLockConfig(config);
    assertAppLockAttemptState(initialAttemptState);
    this.attemptState = { ...initialAttemptState };
  }

  async unlock(
    secret: string,
    options: { now?: Date } = {},
  ): Promise<AppLockVerificationResult> {
    const result = await verifyAppLockSecret(
      secret,
      this.config,
      this.attemptState,
      options,
    );
    this.attemptState = { ...result.attemptState };
    if (result.verified) {
      const now = validNow(options.now ?? new Date());
      this.unlocked = true;
      this.unlockedAt = now.toISOString();
    }
    return {
      ...result,
      attemptState: { ...result.attemptState },
    };
  }

  lock(): void {
    this.unlocked = false;
    this.unlockedAt = null;
  }

  getState(): AppLockSessionState {
    return {
      unlocked: this.unlocked,
      unlockedAt: this.unlockedAt,
      attemptState: { ...this.attemptState },
    };
  }
}
