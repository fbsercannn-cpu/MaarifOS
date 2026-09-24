export const STORAGE_WARNING_PERCENT = 80 as const;
export const STORAGE_CRITICAL_PERCENT = 90 as const;

export type StoragePressureLevel =
  | "normal"
  | "warning"
  | "critical"
  | "unknown";

export interface StoragePressureState {
  readonly level: StoragePressureLevel;
  readonly usagePercent: number | null;
}

export interface StorageEstimateLike {
  readonly usage?: number;
  readonly quota?: number;
}

export interface StorageManagerLike {
  readonly persist?: () => Promise<boolean>;
  readonly estimate?: () => Promise<StorageEstimateLike>;
}

export type StoragePersistenceState =
  | {
      readonly kind: "granted" | "denied";
      readonly supported: true;
      readonly message: string;
    }
  | {
      readonly kind: "unsupported";
      readonly supported: false;
      readonly message: string;
    }
  | {
      readonly kind: "error";
      readonly supported: true;
      readonly message: string;
    };

export type StorageEstimateState =
  | {
      readonly kind: "available";
      readonly supported: true;
      readonly usageBytes: number | null;
      readonly quotaBytes: number | null;
      readonly usagePercent: number | null;
      readonly level: StoragePressureLevel;
      readonly message: string;
    }
  | {
      readonly kind: "unsupported";
      readonly supported: false;
      readonly usageBytes: null;
      readonly quotaBytes: null;
      readonly usagePercent: null;
      readonly level: "unknown";
      readonly message: string;
    }
  | {
      readonly kind: "error";
      readonly supported: true;
      readonly usageBytes: null;
      readonly quotaBytes: null;
      readonly usagePercent: null;
      readonly level: "unknown";
      readonly message: string;
    };

export interface StorageHealthState {
  readonly persistence: StoragePersistenceState;
  readonly estimate: StorageEstimateState;
}

export interface InspectStorageHealthOptions {
  /**
   * Test veya gömülü çalışma ortamı için StorageManager bağımlılığı.
   * `undefined` tarayıcıdaki `navigator.storage` değerini güvenli biçimde çözer;
   * `null` desteğin bilerek bulunmadığını belirtir.
   */
  readonly storageManager?: StorageManagerLike | null;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number): string {
  return String(value).replace(".", ",");
}

/**
 * Kullanım ve kota çiftini öğretmenin göreceği kararlı eşiklere dönüştürür.
 * Eksik, sonsuz veya kullanılamaz bir kota değerinden tahmini yüzde üretmez.
 */
export function storagePressureLevel(
  usage: number | undefined,
  quota: number | undefined,
): StoragePressureState {
  if (!isFiniteNonNegative(usage) || !isFinitePositive(quota)) {
    return { level: "unknown", usagePercent: null };
  }

  const usagePercent = roundPercent(Math.min(100, (usage / quota) * 100));
  if (usagePercent >= STORAGE_CRITICAL_PERCENT) {
    return { level: "critical", usagePercent };
  }
  if (usagePercent >= STORAGE_WARNING_PERCENT) {
    return { level: "warning", usagePercent };
  }
  return { level: "normal", usagePercent };
}

function resolveBrowserStorageManager(
  provided: StorageManagerLike | null | undefined,
): StorageManagerLike | null {
  if (provided !== undefined) return provided;

  try {
    return globalThis.navigator?.storage ?? null;
  } catch {
    return null;
  }
}

async function inspectPersistence(
  storageManager: StorageManagerLike | null,
): Promise<StoragePersistenceState> {
  if (!storageManager || typeof storageManager.persist !== "function") {
    return {
      kind: "unsupported",
      supported: false,
      message:
        "Bu tarayıcı kalıcı depolama güvencesini bildirmiyor; düzenli şifreli yedek alın.",
    };
  }

  try {
    const granted = await storageManager.persist();
    return granted
      ? {
          kind: "granted",
          supported: true,
          message:
            "Cihaz, MaarifOS verilerini kalıcı depolama kapsamında koruyor.",
        }
      : {
          kind: "denied",
          supported: true,
          message:
            "Kalıcı depolama izni verilmedi; cihaz alan açarken verileri kaldırabilir. Şifreli yedek alın.",
        };
  } catch {
    return {
      kind: "error",
      supported: true,
      message:
        "Kalıcı depolama durumu okunamadı. Verilere dokunulmadı; daha sonra yeniden deneyin.",
    };
  }
}

async function inspectEstimate(
  storageManager: StorageManagerLike | null,
): Promise<StorageEstimateState> {
  if (!storageManager || typeof storageManager.estimate !== "function") {
    return {
      kind: "unsupported",
      supported: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      level: "unknown",
      message:
        "Bu tarayıcı yerel depolama kullanımını bildirmiyor; cihaz alanını ve yedekleri düzenli kontrol edin.",
    };
  }

  try {
    const estimate = await storageManager.estimate();
    const pressure = storagePressureLevel(estimate.usage, estimate.quota);
    const hasUsablePair = pressure.usagePercent !== null;

    return {
      kind: "available",
      supported: true,
      usageBytes: hasUsablePair ? estimate.usage! : null,
      quotaBytes: hasUsablePair ? estimate.quota! : null,
      usagePercent: pressure.usagePercent,
      level: pressure.level,
      message: hasUsablePair
        ? `Yerel depolama alanının %${formatPercent(pressure.usagePercent!)}'i kullanılıyor.`
        : "Tarayıcı depolama desteği sunuyor ancak kullanım ve kota değerlerini bildirmedi.",
    };
  } catch {
    return {
      kind: "error",
      supported: true,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      level: "unknown",
      message:
        "Yerel depolama kullanımı okunamadı. Verilere dokunulmadı; daha sonra yeniden deneyin.",
    };
  }
}

/**
 * StorageManager'ın iki bağımsız yeteneğini birlikte ve hata yalıtımlı sorgular.
 * Bir çağrının başarısız olması diğerinin güvenilir sonucunu kaybettirmez.
 */
export async function inspectStorageHealth(
  options: InspectStorageHealthOptions = {},
): Promise<StorageHealthState> {
  const storageManager = resolveBrowserStorageManager(options.storageManager);
  const [persistence, estimate] = await Promise.all([
    inspectPersistence(storageManager),
    inspectEstimate(storageManager),
  ]);

  return { persistence, estimate };
}
