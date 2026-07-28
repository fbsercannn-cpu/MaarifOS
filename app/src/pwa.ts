import { CURRENT_RELEASE, PWA_UPDATE_READY_EVENT } from "./release";

const SERVICE_WORKER_URL = `/sw.js?v=${encodeURIComponent(CURRENT_RELEASE.version)}`;
const SERVICE_WORKER_UPDATE_MESSAGE = "maarifos:update-ready";
let hasAnnouncedServiceWorkerUpdate = false;

function isNewReleaseMessage(
  value: unknown,
): value is { readonly type: string; readonly version: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { readonly type?: unknown; readonly version?: unknown };
  return (
    candidate.type === SERVICE_WORKER_UPDATE_MESSAGE &&
    typeof candidate.version === "string" &&
    candidate.version !== CURRENT_RELEASE.version
  );
}

async function installServiceWorker(): Promise<void> {
  try {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (!isNewReleaseMessage(event.data) || hasAnnouncedServiceWorkerUpdate) return;

      hasAnnouncedServiceWorkerUpdate = true;
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT));
    });

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none",
    });

    await registration.update();
  } catch (error) {
    console.warn("MaarifOS çevrimdışı desteği başlatılamadı.", error);
  }
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  if (document.readyState === "complete") {
    void installServiceWorker();
    return;
  }

  window.addEventListener("load", () => void installServiceWorker(), { once: true });
}

registerServiceWorker();
