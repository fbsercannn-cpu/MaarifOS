export interface ReleaseMetadata {
  readonly version: string;
  readonly releasedOn: string;
  readonly title: string;
  readonly notes: readonly string[];
}

export interface ReleaseStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ReleaseLaunchKind =
  | "first_install"
  | "update"
  | "current"
  | "storage_unavailable";

export interface ReleaseLaunchState {
  readonly kind: ReleaseLaunchKind;
  readonly release: ReleaseMetadata;
  readonly previousVersion: string | null;
  readonly shouldPresent: boolean;
  readonly storageAvailable: boolean;
}

export interface InspectCurrentReleaseOptions {
  /**
   * Testler veya gömülü çalışma ortamları için storage bağımlılığı.
   * `undefined` tarayıcı localStorage alanını güvenli biçimde çözmeye çalışır;
   * `null` ise depolamanın bilerek kullanılamadığını belirtir.
   */
  readonly storage?: ReleaseStorage | null;
}

export interface AcknowledgeCurrentReleaseOptions
  extends InspectCurrentReleaseOptions {
  readonly acknowledgedAt?: Date;
}

interface ReleaseAcknowledgementRecord {
  readonly schemaVersion: typeof RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION;
  readonly firstSeenVersion: string;
  readonly acknowledgedVersion: string;
  readonly acknowledgedAt: string;
}

type StoredAcknowledgement =
  | { readonly kind: "missing" }
  | {
      readonly kind: "valid";
      readonly record: ReleaseAcknowledgementRecord;
    }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable" };

export const RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION = 1 as const;
export const RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY =
  "maarifos.release.acknowledgement.v1";
export const PWA_UPDATE_READY_EVENT = "maarifos:update-ready";

const MAX_ACKNOWLEDGEMENT_LENGTH = 2_048;
const VERSION_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z._+-]{0,63})$/;

export const CURRENT_RELEASE: ReleaseMetadata = Object.freeze({
  version: "0.8.0",
  releasedOn: "2026-08-08",
  title: "Değerler eğitimi ve güvenli öğretmen akışı güçlendi",
  notes: Object.freeze([
    "Saygı, sorumluluk ve adalet merkezli Değerler Pedagojisi altyapısı; TYMM’nin D1–D20 değerleri ve resmî Ek-14 kaynak zinciriyle güçlendirildi.",
    "Uzman incelemesi bekleyen yıllık ve premium içerikler ana öğretmen akışından ayrı tutuldu; günlük kullanım yalnız doğrulanmış mevcut yeteneklerle devam eder.",
    "Plan ve gözlem kayıtlarından değer kanıtı oluşturma, yalnız öğretmenin açık seçimi ve onayıyla ilerleyecek biçimde güvence altına alındı.",
    "Çocuk gözlemlerinde puanlama, kalıcı karakter hükmü ve inanç ya da ibadet üzerinden değer sonucu üretmeye karşı koruma katmanları eklendi.",
    "Şifreli yedek, geri yükleme, kalıcı silme ve eşzamanlı işlemlerde veri bütünlüğü ile mahremiyet kontrolleri güçlendirildi.",
    "Yeni sürüm açık öğretmen girdisini kesmeden hazır olur; kayıtlar cihazda korunur ve yenilikler güncellemeden sonra bir kez gösterilir.",
  ]),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION_PATTERN.test(value);
}

function isCanonicalUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isAcknowledgementRecord(
  value: unknown,
): value is ReleaseAcknowledgementRecord {
  if (!isRecord(value)) return false;

  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "acknowledgedAt",
    "acknowledgedVersion",
    "firstSeenVersion",
    "schemaVersion",
  ];

  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    value.schemaVersion === RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION &&
    isValidVersion(value.firstSeenVersion) &&
    isValidVersion(value.acknowledgedVersion) &&
    isCanonicalUtcIso(value.acknowledgedAt)
  );
}

function resolveBrowserStorage(
  provided: ReleaseStorage | null | undefined,
): ReleaseStorage | null {
  if (provided !== undefined) return provided;

  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readAcknowledgement(storage: ReleaseStorage): StoredAcknowledgement {
  let raw: string | null;

  try {
    raw = storage.getItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY);
  } catch {
    return { kind: "unavailable" };
  }

  if (raw === null) return { kind: "missing" };
  if (raw.length > MAX_ACKNOWLEDGEMENT_LENGTH) return { kind: "invalid" };

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAcknowledgementRecord(parsed)
      ? { kind: "valid", record: parsed }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * Geçerli sürümün bu cihazda daha önce onaylanıp onaylanmadığını okur.
 *
 * İlk kurulum bir güncelleme değildir ve bildirim üretmez. Daha eski bir
 * sürüm onaylanmışsa `update`, aynı sürüm onaylanmışsa `current` döner.
 * Tarayıcı depolaması engellendiğinde istisna fırlatmaz.
 */
export function inspectCurrentRelease(
  options: InspectCurrentReleaseOptions = {},
): ReleaseLaunchState {
  const storage = resolveBrowserStorage(options.storage);
  if (!storage) {
    return {
      kind: "storage_unavailable",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: false,
    };
  }

  const stored = readAcknowledgement(storage);
  if (stored.kind === "unavailable") {
    return {
      kind: "storage_unavailable",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: false,
    };
  }

  if (stored.kind === "missing" || stored.kind === "invalid") {
    return {
      kind: "first_install",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: true,
    };
  }

  if (stored.record.acknowledgedVersion === CURRENT_RELEASE.version) {
    return {
      kind: "current",
      release: CURRENT_RELEASE,
      previousVersion: stored.record.acknowledgedVersion,
      shouldPresent: false,
      storageAvailable: true,
    };
  }

  return {
    kind: "update",
    release: CURRENT_RELEASE,
    previousVersion: stored.record.acknowledgedVersion,
    shouldPresent: true,
    storageAvailable: true,
  };
}

/**
 * Geçerli sürümü bu cihaz için görüldü/onaylandı olarak işaretler.
 *
 * Yalnız teknik sürüm bilgisi saklanır; öğretmen veya çocuk verisi yazılmaz.
 * Depolama engeli, kota ya da bozuk eski kayıt halinde `false` döner ve
 * uygulamanın açılışını kesmez.
 */
export function acknowledgeCurrentRelease(
  options: AcknowledgeCurrentReleaseOptions = {},
): boolean {
  const storage = resolveBrowserStorage(options.storage);
  if (!storage) return false;

  const acknowledgedAt = options.acknowledgedAt ?? new Date();
  if (Number.isNaN(acknowledgedAt.getTime())) return false;

  const stored = readAcknowledgement(storage);
  if (stored.kind === "unavailable") return false;

  const record: ReleaseAcknowledgementRecord = {
    schemaVersion: RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION,
    firstSeenVersion:
      stored.kind === "valid"
        ? stored.record.firstSeenVersion
        : CURRENT_RELEASE.version,
    acknowledgedVersion: CURRENT_RELEASE.version,
    acknowledgedAt: acknowledgedAt.toISOString(),
  };

  try {
    storage.setItem(
      RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
      JSON.stringify(record),
    );
    return true;
  } catch {
    return false;
  }
}
