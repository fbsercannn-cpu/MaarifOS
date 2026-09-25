import { Capacitor, registerPlugin } from "@capacitor/core";

export type SecureSessionKey = "session" | "pkce";

interface SecureSessionPlugin {
  get(options: { key: SecureSessionKey }): Promise<{ value?: string }>;
  set(options: { key: SecureSessionKey; value: string }): Promise<void>;
  remove(options: { key: SecureSessionKey }): Promise<void>;
}

const SecureSession = registerPlugin<SecureSessionPlugin>("SecureSession");

function requireNative(): void {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Güvenli uygulama oturumu yalnız mağaza uygulamasında kullanılabilir.");
  }
}

export async function readSecureSessionValue(key: SecureSessionKey): Promise<string | null> {
  requireNative();
  const result = await SecureSession.get({ key });
  return typeof result.value === "string" && result.value ? result.value : null;
}

export async function writeSecureSessionValue(key: SecureSessionKey, value: string): Promise<void> {
  requireNative();
  await SecureSession.set({ key, value });
}

export async function removeSecureSessionValue(key: SecureSessionKey): Promise<void> {
  requireNative();
  await SecureSession.remove({ key });
}
