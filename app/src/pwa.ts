import { CURRENT_RELEASE, PWA_UPDATE_READY_EVENT } from "./release";

const SERVICE_WORKER_URL = `/sw.js?v=${encodeURIComponent(CURRENT_RELEASE.version)}`;
let hasAnnouncedServiceWorkerUpdate = false;

async function installServiceWorker(): Promise<void> {
  try {
    const wasControlledBeforeRegistration = navigator.serviceWorker.controller !== null;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!wasControlledBeforeRegistration || hasAnnouncedServiceWorkerUpdate) return;

      hasAnnouncedServiceWorkerUpdate = true;
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT));
    }, { once: true });

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
