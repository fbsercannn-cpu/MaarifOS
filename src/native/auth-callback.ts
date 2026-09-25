import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

export const NATIVE_AUTH_CALLBACK_URL = "maarifos://auth/callback";

export type NativeAuthCallback =
  | { readonly kind: "connected"; readonly handoff: string }
  | { readonly kind: "cancelled" };

const HANDOFF_PATTERN = /^[A-Za-z0-9_-]{32,160}$/;

export function parseNativeAuthCallback(candidate: string): NativeAuthCallback | null {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (
    url.protocol !== "maarifos:" ||
    url.hostname !== "auth" ||
    url.pathname !== "/callback" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    return null;
  }

  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) return null;

  if (url.searchParams.get("status") === "cancelled") {
    return keys.length === 1 ? { kind: "cancelled" } : null;
  }

  const handoff = url.searchParams.get("handoff");
  if (keys.length !== 1 || handoff === null || !HANDOFF_PATTERN.test(handoff)) return null;
  return { kind: "connected", handoff };
}

export async function listenForNativeAuthCallbacks(
  receive: (callback: NativeAuthCallback) => void,
): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const launched = await App.getLaunchUrl();
  if (launched?.url) {
    const callback = parseNativeAuthCallback(launched.url);
    if (callback) receive(callback);
  }
  return App.addListener("appUrlOpen", ({ url }) => {
    const callback = parseNativeAuthCallback(url);
    if (callback) receive(callback);
  });
}
