import { CURRENT_RELEASE, PWA_UPDATE_READY_EVENT } from "./release";

const SERVICE_WORKER_URL = `/sw.js?v=${encodeURIComponent(CURRENT_RELEASE.version)}`;
const SERVICE_WORKER_UPDATE_MESSAGE = "maarifos:update-ready";
const SERVICE_WORKER_STATUS_REQUEST = "maarifos:get-status";
const SERVICE_WORKER_STATUS_RESPONSE = "maarifos:sw-status";
const SERVICE_WORKER_ACTIVATE_MESSAGE = "maarifos:skip-waiting";
const SERVICE_WORKER_MESSAGE_TIMEOUT_MS = 4_000;
const AUTOMATIC_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1_000;

export const PWA_STATUS_EVENT = "maarifos:pwa-status";
export const PWA_APPLY_UPDATE_EVENT = "maarifos:apply-update";
export const PWA_CHECK_UPDATE_EVENT = "maarifos:check-update";

export type PwaRuntimePhase =
  | "idle"
  | "disabled"
  | "unsupported"
  | "registering"
  | "installing"
  | "checking-update"
  | "ready"
  | "update-ready"
  | "activating-update"
  | "error";

export interface PwaRuntimeStatus {
  readonly phase: PwaRuntimePhase;
  readonly offlineReady: boolean;
  readonly version: string;
  readonly activeVersion: string | null;
  readonly updateVersion: string | null;
  readonly lastCheckedAt: string | null;
  readonly message: string;
  readonly errorCode?: "unsupported" | "registration" | "controller" | "cache" | "activation";
}

interface ServiceWorkerHealth {
  readonly type: typeof SERVICE_WORKER_STATUS_RESPONSE;
  readonly version: string;
  readonly shellReady: boolean;
  readonly shellCache: string;
  readonly fallbackCacheCount: number;
}

type PwaStatusWindow = Window & {
  __maarifosPwaStatus?: PwaRuntimeStatus;
};

let currentStatus: PwaRuntimeStatus = Object.freeze({
  phase: "idle",
  offlineReady: false,
  version: CURRENT_RELEASE.version,
  activeVersion: null,
  updateVersion: null,
  lastCheckedAt: null,
  message: "Çevrim dışı çalışma hazırlanıyor.",
});
let currentRegistration: ServiceWorkerRegistration | null = null;
let announcedWaitingWorker: ServiceWorker | null = null;
let updateActivationRequested = false;
let controllerReloadStarted = false;
let listenersInstalled = false;
let lastAutomaticUpdateCheckAt = 0;
let updateCheckInFlight: Promise<boolean> | null = null;

function ensureNativeRuntimeQuery(): void {
  const url = new URL(window.location.href);
  if (url.searchParams.has("native")) return;

  url.searchParams.set("native", "1");
  window.history.replaceState({}, "", url);
}

function publishStatus(
  status: Omit<PwaRuntimeStatus, "lastCheckedAt"> & {
    readonly lastCheckedAt?: string | null;
  },
): void {
  currentStatus = Object.freeze({
    ...status,
    lastCheckedAt: status.lastCheckedAt ?? currentStatus.lastCheckedAt,
  });
  (window as PwaStatusWindow).__maarifosPwaStatus = currentStatus;
  window.dispatchEvent(
    new CustomEvent<PwaRuntimeStatus>(PWA_STATUS_EVENT, {
      detail: currentStatus,
    }),
  );
}

export function getPwaRuntimeStatus(): PwaRuntimeStatus {
  return currentStatus;
}

function isServiceWorkerHealth(value: unknown): value is ServiceWorkerHealth {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ServiceWorkerHealth>;
  return (
    candidate.type === SERVICE_WORKER_STATUS_RESPONSE &&
    typeof candidate.version === "string" &&
    typeof candidate.shellReady === "boolean" &&
    typeof candidate.shellCache === "string" &&
    typeof candidate.fallbackCacheCount === "number"
  );
}

function requestWorkerHealth(worker: ServiceWorker): Promise<ServiceWorkerHealth> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Service worker sağlık yanıtı zamanında gelmedi."));
    }, SERVICE_WORKER_MESSAGE_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      if (isServiceWorkerHealth(event.data)) {
        resolve(event.data);
      } else {
        reject(new Error("Service worker sağlık yanıtı geçersiz."));
      }
    };

    worker.postMessage({ type: SERVICE_WORKER_STATUS_REQUEST }, [channel.port2]);
  });
}

function waitForController(): Promise<ServiceWorker | null> {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve(navigator.serviceWorker.controller);
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      resolve(navigator.serviceWorker.controller);
    }, SERVICE_WORKER_MESSAGE_TIMEOUT_MS);
    const handleControllerChange = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      resolve(navigator.serviceWorker.controller);
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
  });
}

async function verifyOfflineReadiness(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerHealth> {
  const activeWorker = registration.active;
  if (!activeWorker) {
    publishStatus({
      phase: "error",
      offlineReady: false,
      version: CURRENT_RELEASE.version,
      activeVersion: null,
      updateVersion: currentStatus.updateVersion,
      message: "Çevrim dışı uygulama kabuğu etkinleştirilemedi.",
      errorCode: "registration",
    });
    throw new Error("Etkin service worker bulunamadı.");
  }

  const controller = await waitForController();
  if (!controller) {
    publishStatus({
      phase: "error",
      offlineReady: false,
      version: CURRENT_RELEASE.version,
      activeVersion: null,
      updateVersion: currentStatus.updateVersion,
      message: "Çevrim dışı uygulama bu sekmeyi henüz denetlemiyor.",
      errorCode: "controller",
    });
    throw new Error("Service worker controller oluşmadı.");
  }

  const health = await requestWorkerHealth(activeWorker);
  if (!health.shellReady) {
    publishStatus({
      phase: "error",
      offlineReady: false,
      version: CURRENT_RELEASE.version,
      activeVersion: health.version,
      updateVersion: currentStatus.updateVersion,
      message: "Çevrim dışı uygulama dosyaları doğrulanamadı.",
      errorCode: "cache",
    });
    throw new Error("Service worker app-shell cache doğrulaması başarısız.");
  }

  publishStatus({
    phase: "ready",
    offlineReady: true,
    version: CURRENT_RELEASE.version,
    activeVersion: health.version,
    updateVersion: null,
    message: "Çevrim dışı uygulama hazır.",
  });
  return health;
}

function isNewReleaseMessage(
  value: unknown,
): value is { readonly type: string; readonly version: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { readonly type?: unknown; readonly version?: unknown };
  return (
    candidate.type === SERVICE_WORKER_UPDATE_MESSAGE &&
    typeof candidate.version === "string"
  );
}

function publishWaitingWorkerVerificationFailure(): void {
  announcedWaitingWorker = null;
  if (currentStatus.offlineReady) {
    publishStatus({
      ...currentStatus,
      phase: "ready",
      updateVersion: null,
      message: "Çevrim dışı uygulama hazır.",
    });
    return;
  }

  publishStatus({
    phase: "error",
    offlineReady: false,
    version: CURRENT_RELEASE.version,
    activeVersion: currentStatus.activeVersion,
    updateVersion: null,
    message: "Yeni çevrim dışı sürümün uygulama dosyaları doğrulanamadı.",
    errorCode: "cache",
  });
}

async function announceWaitingWorker(
  registration: ServiceWorkerRegistration,
  announcedVersion?: string,
): Promise<boolean> {
  const waitingWorker = registration.waiting;
  if (
    !registration.active ||
    !waitingWorker
  ) {
    return false;
  }

  if (
    waitingWorker === announcedWaitingWorker &&
    currentStatus.phase === "update-ready"
  ) {
    return true;
  }

  let waitingHealth: ServiceWorkerHealth;
  try {
    waitingHealth = await requestWorkerHealth(waitingWorker);
  } catch {
    publishWaitingWorkerVerificationFailure();
    return false;
  }

  if (
    !waitingHealth.shellReady ||
    (announcedVersion !== undefined && announcedVersion !== waitingHealth.version)
  ) {
    publishWaitingWorkerVerificationFailure();
    return false;
  }

  announcedWaitingWorker = waitingWorker;
  publishStatus({
    phase: "update-ready",
    offlineReady: currentStatus.offlineReady,
    version: CURRENT_RELEASE.version,
    activeVersion: currentStatus.activeVersion,
    updateVersion: waitingHealth.version,
    message: "Yeni sürüm hazır; açık kaydınızı tamamladıktan sonra güncelleyebilirsiniz.",
  });
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT));
  return true;
}

function observeInstallingWorker(
  registration: ServiceWorkerRegistration,
  worker: ServiceWorker,
): void {
  publishStatus({
    ...currentStatus,
    phase: "installing",
    message: currentStatus.offlineReady
      ? "Yeni çevrim dışı sürüm hazırlanıyor."
      : "Çevrim dışı uygulama dosyaları hazırlanıyor.",
  });

  worker.addEventListener("statechange", () => {
    if (
      worker.state === "installed" &&
      registration.active &&
      registration.waiting
    ) {
      void announceWaitingWorker(registration);
      return;
    }

    if (worker.state === "redundant" && !registration.active) {
      publishStatus({
        phase: "error",
        offlineReady: false,
        version: CURRENT_RELEASE.version,
        activeVersion: null,
        updateVersion: null,
        message: "Çevrim dışı uygulama kurulamadı.",
        errorCode: "registration",
      });
    }
  });
}

function observeRegistration(registration: ServiceWorkerRegistration): void {
  registration.addEventListener("updatefound", () => {
    if (registration.installing) {
      observeInstallingWorker(registration, registration.installing);
    }
  });

  if (registration.installing) {
    observeInstallingWorker(registration, registration.installing);
  }
  if (registration.waiting) {
    void announceWaitingWorker(registration);
  }
}

function restoreStatusAfterUpdateCheck(lastCheckedAt: string): void {
  if (currentStatus.phase !== "checking-update") return;

  publishStatus({
    ...currentStatus,
    phase: currentStatus.offlineReady ? "ready" : "registering",
    lastCheckedAt,
    message: currentStatus.offlineReady
      ? `MaarifOS ${currentStatus.activeVersion ?? CURRENT_RELEASE.version} bu cihazda güncel.`
      : "Çevrim dışı uygulama dosyaları hazırlanıyor.",
  });
}

async function performServiceWorkerUpdateCheck(force: boolean): Promise<boolean> {
  if (!navigator.onLine) {
    if (force) {
      publishStatus({
        ...currentStatus,
        message: "Güncelleme denetimi için internet bağlantısı gerekiyor.",
      });
    }
    return false;
  }

  const registration =
    currentRegistration ??
    (await navigator.serviceWorker.getRegistration());
  if (!registration) {
    if (force) {
      publishStatus({
        ...currentStatus,
        phase: "error",
        message: "Güncelleme hizmeti henüz hazır değil. Birkaç saniye sonra yeniden deneyin.",
        errorCode: "registration",
      });
    }
    return false;
  }

  currentRegistration = registration;
  if (registration.waiting) {
    return announceWaitingWorker(registration);
  }

  const checkedAt = new Date().toISOString();
  publishStatus({
    ...currentStatus,
    phase: "checking-update",
    lastCheckedAt: checkedAt,
    message: "Yeni MaarifOS sürümü denetleniyor.",
  });

  try {
    await registration.update();
    if (registration.waiting) {
      return announceWaitingWorker(registration);
    }
    restoreStatusAfterUpdateCheck(checkedAt);
    return false;
  } catch (error) {
    if (currentStatus.offlineReady) {
      publishStatus({
        ...currentStatus,
        phase: "ready",
        lastCheckedAt: checkedAt,
        message: "Güncelleme denetimi tamamlanamadı; mevcut çevrim dışı sürüm hazır.",
      });
    } else if (currentStatus.phase !== "error") {
      publishStatus({
        ...currentStatus,
        phase: "error",
        lastCheckedAt: checkedAt,
        message: "Güncelleme hizmetine ulaşılamadı; bağlantınızı denetleyin.",
        errorCode: "registration",
      });
    }
    console.warn("MaarifOS güncelleme denetimi tamamlanamadı.", error);
    return false;
  }
}

export function checkForServiceWorkerUpdate(
  options: { readonly force?: boolean } = {},
): Promise<boolean> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }
  if (updateCheckInFlight) return updateCheckInFlight;

  const force = options.force === true;
  const now = Date.now();
  if (
    !force &&
    now - lastAutomaticUpdateCheckAt < AUTOMATIC_UPDATE_CHECK_INTERVAL_MS
  ) {
    return Promise.resolve(false);
  }
  lastAutomaticUpdateCheckAt = now;

  const task = performServiceWorkerUpdateCheck(force);
  updateCheckInFlight = task.finally(() => {
    updateCheckInFlight = null;
  });
  return updateCheckInFlight;
}

export async function activateWaitingServiceWorker(): Promise<boolean> {
  const registration =
    currentRegistration ??
    (await navigator.serviceWorker.getRegistration());
  const waitingWorker = registration?.waiting;
  if (!registration || !waitingWorker) {
    publishStatus({
      ...currentStatus,
      phase: "error",
      message: "Etkinleştirilecek yeni çevrim dışı sürüm bulunamadı.",
      errorCode: "activation",
    });
    return false;
  }

  currentRegistration = registration;
  let waitingHealth: ServiceWorkerHealth;
  try {
    waitingHealth = await requestWorkerHealth(waitingWorker);
  } catch {
    publishWaitingWorkerVerificationFailure();
    return false;
  }
  if (
    !waitingHealth.shellReady ||
    (currentStatus.updateVersion !== null &&
      currentStatus.updateVersion !== waitingHealth.version)
  ) {
    publishWaitingWorkerVerificationFailure();
    return false;
  }

  updateActivationRequested = true;
  publishStatus({
    ...currentStatus,
    phase: "activating-update",
    updateVersion: waitingHealth.version,
    message: "Yeni sürüm güvenli biçimde etkinleştiriliyor.",
  });
  waitingWorker.postMessage({
    type: SERVICE_WORKER_ACTIVATE_MESSAGE,
    version: waitingHealth.version,
  });
  return true;
}

function installGlobalListeners(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (!isNewReleaseMessage(event.data)) return;
    if (currentRegistration?.waiting) {
      void announceWaitingWorker(currentRegistration, event.data.version);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateActivationRequested || controllerReloadStarted) return;
    updateActivationRequested = false;
    controllerReloadStarted = true;

    const registration = currentRegistration;
    if (!registration) {
      window.location.reload();
      return;
    }

    void verifyOfflineReadiness(registration)
      .catch(() => undefined)
      .finally(() => window.location.reload());
  });

  window.addEventListener(PWA_APPLY_UPDATE_EVENT, () => {
    void activateWaitingServiceWorker();
  });

  window.addEventListener(PWA_CHECK_UPDATE_EVENT, () => {
    void checkForServiceWorkerUpdate({ force: true });
  });

  const checkWhenUsable = () => {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    void checkForServiceWorkerUpdate();
  };
  const checkWhenVisible = () => {
    if (document.visibilityState === "visible") checkWhenUsable();
  };
  window.addEventListener("focus", checkWhenUsable);
  window.addEventListener("online", checkWhenUsable);
  document.addEventListener("visibilitychange", checkWhenVisible);
}

async function installServiceWorker(): Promise<void> {
  publishStatus({
    phase: "registering",
    offlineReady: false,
    version: CURRENT_RELEASE.version,
    activeVersion: null,
    updateVersion: null,
    message: "Çevrim dışı uygulama hazırlanıyor.",
  });

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      updateViaCache: "none",
    });
    currentRegistration = registration;
    observeRegistration(registration);
    installGlobalListeners();
    const readyRegistration = await navigator.serviceWorker.ready;
    currentRegistration = readyRegistration;
    await verifyOfflineReadiness(readyRegistration);
    if (registration.waiting) {
      announcedWaitingWorker = null;
      await announceWaitingWorker(registration);
    }
    await checkForServiceWorkerUpdate({ force: true });
  } catch (error) {
    const waitingWorkerReady = currentRegistration
      ? await announceWaitingWorker(currentRegistration)
      : false;
    if (waitingWorkerReady) return;

    if (currentStatus.offlineReady) {
      console.warn("MaarifOS çevrim dışı güncelleme denetimi tamamlanamadı.", error);
      return;
    }

    if (currentStatus.phase !== "error") {
      publishStatus({
        phase: "error",
        offlineReady: false,
        version: CURRENT_RELEASE.version,
        activeVersion: null,
        updateVersion: null,
        message: "Çevrim dışı destek başlatılamadı; bağlantı varken kullanmaya devam edebilirsiniz.",
        errorCode: "registration",
      });
    }
    console.warn("MaarifOS çevrim dışı desteği başlatılamadı.", error);
  }
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) {
    publishStatus({
      phase: "disabled",
      offlineReady: false,
      version: CURRENT_RELEASE.version,
      activeVersion: null,
      updateVersion: null,
      message: "Çevrim dışı çalışma üretim derlemesinde etkinleşir.",
    });
    return;
  }
  if (!("serviceWorker" in navigator)) {
    publishStatus({
      phase: "unsupported",
      offlineReady: false,
      version: CURRENT_RELEASE.version,
      activeVersion: null,
      updateVersion: null,
      message: "Bu tarayıcı çevrim dışı uygulama desteğini sunmuyor.",
      errorCode: "unsupported",
    });
    return;
  }

  if (document.readyState === "complete") {
    void installServiceWorker();
    return;
  }

  window.addEventListener("load", () => void installServiceWorker(), { once: true });
}

ensureNativeRuntimeQuery();
registerServiceWorker();
