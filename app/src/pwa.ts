const SERVICE_WORKER_URL = "/sw.js";

async function installServiceWorker(): Promise<void> {
  try {
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
