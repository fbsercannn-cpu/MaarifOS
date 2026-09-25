import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { listenForNativeAuthCallbacks } from "./auth-callback";
import {
  readSecureSessionValue,
  removeSecureSessionValue,
  writeSecureSessionValue,
} from "./secure-session";

export const NATIVE_ACCOUNT_ORIGIN = "https://www.maarifos.com";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,160}$/;
const VERIFIER_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function challenge(verifier: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export async function nativeAuthorizationHeader(): Promise<Record<string, string>> {
  if (!Capacitor.isNativePlatform()) return {};
  const token = await readSecureSessionValue("session");
  return token && TOKEN_PATTERN.test(token) ? { Authorization: `Bearer ${token}` } : {};
}

export async function beginNativeGoogleConnection(purpose: "login" | "backup"): Promise<void> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)));
  if (!VERIFIER_PATTERN.test(verifier)) throw new Error("Uygulama giriş doğrulaması hazırlanamadı.");
  await writeSecureSessionValue("pkce", verifier);
  try {
    const response = await fetch(`${NATIVE_ACCOUNT_ORIGIN}/auth/google/native/start`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(await nativeAuthorizationHeader()) },
      body: JSON.stringify({ purpose, challenge: await challenge(verifier) }),
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json() as { authorizationUrl?: string; callbackUrl?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Google girişi başlatılamadı.");
    const authorization = new URL(result.authorizationUrl ?? "");
    if (
      authorization.origin !== "https://accounts.google.com" ||
      authorization.pathname !== "/o/oauth2/v2/auth" ||
      authorization.username || authorization.password || authorization.hash ||
      result.callbackUrl !== "maarifos://auth/callback"
    ) {
      throw new Error("Google giriş adresi doğrulanamadı.");
    }
    await Browser.open({ url: authorization.href, presentationStyle: "popover" });
  } catch (error) {
    await removeSecureSessionValue("pkce");
    throw error;
  }
}

export async function clearNativeAccountSession(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Promise.all([
    removeSecureSessionValue("session"),
    removeSecureSessionValue("pkce"),
  ]);
}

export async function installNativeAccountHandler(): Promise<(() => Promise<void>) | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const handle = await listenForNativeAuthCallbacks(async (callback) => {
    try {
      await Browser.close().catch(() => undefined);
      if (callback.kind === "cancelled") {
        await removeSecureSessionValue("pkce");
        window.dispatchEvent(new CustomEvent("maarifos-native-account", { detail: { status: "cancelled" } }));
        return;
      }
      const verifier = await readSecureSessionValue("pkce");
      if (!verifier || !VERIFIER_PATTERN.test(verifier)) throw new Error("Giriş doğrulaması bu cihazda bulunamadı.");
      const response = await fetch(`${NATIVE_ACCOUNT_ORIGIN}/api/account/native/exchange`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoff: callback.handoff, verifier }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json() as { sessionToken?: string; error?: string };
      if (!response.ok || !result.sessionToken || !TOKEN_PATTERN.test(result.sessionToken)) {
        throw new Error(result.error || "Google girişi tamamlanamadı.");
      }
      await writeSecureSessionValue("session", result.sessionToken);
      await removeSecureSessionValue("pkce");
      window.dispatchEvent(new CustomEvent("maarifos-native-account", { detail: { status: "connected" } }));
    } catch (error) {
      await removeSecureSessionValue("pkce");
      window.dispatchEvent(new CustomEvent("maarifos-native-account", {
        detail: { status: "error", message: error instanceof Error ? error.message : "Google girişi tamamlanamadı." },
      }));
    }
  });
  return handle ? () => handle.remove() : null;
}
