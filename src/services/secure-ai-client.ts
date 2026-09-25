/**
 * MaarifOS AI istemcisi.
 *
 * Gizli sağlayıcı anahtarları hiçbir zaman tarayıcıya verilmez. Bulut özelliği
 * yalnız aynı origin üzerindeki /api/ai ağ geçidine gider; ağ geçidi kapalıysa
 * uygulama yerel pedagoji motoruna güvenli biçimde geri döner.
 */

import { synthesizeLocalResponse, type SynthesizedResponse } from "../components/pedagogical-ai-brain.ts";
import { Capacitor } from "@capacitor/core";
import { nativeAuthorizationHeader, NATIVE_ACCOUNT_ORIGIN } from "../native/native-account.ts";

export type SupportedAIProvider = "deepseek" | "gemini" | "local";

export interface AIStreamRequest {
  provider: SupportedAIProvider;
  prompt: string;
  context?: string;
  systemPrompt?: string;
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/** @deprecated Sağlayıcı anahtarları artık istemcide tutulmaz. */
export interface StoredAPIKeys {
  deepseekKey?: never;
  geminiKey?: never;
}

export type AIGatewayStatus = {
  available: boolean;
  provider: "deepseek" | "none";
  model?: string;
  reason?: "not_configured" | "authentication_required" | "unavailable";
};

type AIGatewayResponse = { text: string; model: string; error?: string; code?: string };

const STORAGE_KEYS_TO_REMOVE = [
  "maarif_deepseek_key",
  "maarif_gemini_key",
  "maarif_openai_key",
  "maarif_ai_deepseek_key",
  "maarif_ai_gemini_key",
  "maarif_ai_openai_key",
] as const;
const ACTIVE_PROVIDER_KEY = "maarif_active_provider";
const REQUEST_TIMEOUT_MS = 45_000;

export const MEB_TYMM_SYSTEM_PROMPT = `Sen T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM) Okul Öncesi Müfredatı konusunda uzmanlaşmış bir pedagoji danışmanısın.

Yanıtların Türkçe, somut, öğretmen tarafından gözden geçirilebilir ve çocukları etiketlemeyen bir dille yazılmalıdır. Resmî kayıt oluşturma veya değiştirme; yalnız taslak ve öneri üret. Kişisel veri isteme ve yanıtta kişisel veriyi tekrar etme.`;

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function purgeLegacyClientSecrets(): void {
  const storage = browserStorage();
  if (!storage) return;
  for (const key of STORAGE_KEYS_TO_REMOVE) storage.removeItem(key);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function gatewayRequest(path: "/api/ai/status" | "/api/ai/chat", init: RequestInit): Promise<Response> {
  const native = Capacitor.isNativePlatform();
  const headers = new Headers(init.headers);
  if (native) {
    for (const [name, value] of Object.entries(await nativeAuthorizationHeader())) headers.set(name, value);
  }
  return fetchWithTimeout(native ? `${NATIVE_ACCOUNT_ORIGIN}${path}` : path, {
    ...init,
    credentials: native ? "omit" : "same-origin",
    headers,
  });
}

export class SecureAIClient {
  static getStoredKeys(): StoredAPIKeys {
    purgeLegacyClientSecrets();
    return {};
  }

  static saveKey(_provider: "deepseek" | "gemini", _key: string): void {
    purgeLegacyClientSecrets();
  }

  static getActiveProvider(): SupportedAIProvider {
    purgeLegacyClientSecrets();
    const stored = browserStorage()?.getItem(ACTIVE_PROVIDER_KEY);
    return stored === "local" ? "local" : "deepseek";
  }

  static setActiveProvider(provider: SupportedAIProvider): void {
    purgeLegacyClientSecrets();
    const storage = browserStorage();
    if (storage) storage.setItem(ACTIVE_PROVIDER_KEY, provider === "deepseek" ? "deepseek" : "local");
  }

  static sanitizePrompt(text: string): string {
    return text
      .replace(/\b\d{11}\b/g, "[TCKN ÇIKARILDI]")
      .replace(/\b05\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}\b/g, "[TELEFON ÇIKARILDI]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[E-POSTA ÇIKARILDI]");
  }

  static async getGatewayStatus(): Promise<AIGatewayStatus> {
    try {
      const response = await gatewayRequest("/api/ai/status", {
        headers: { Accept: "application/json" },
      });
      const value = await response.json().catch(() => null) as AIGatewayStatus | null;
      if (!response.ok || !value || typeof value.available !== "boolean") {
        return {
          available: false,
          provider: "none",
          reason: response.status === 401
            ? "authentication_required"
            : response.status === 503
              ? "not_configured"
              : "unavailable",
        };
      }
      return value;
    } catch {
      return { available: false, provider: "none", reason: "unavailable" };
    }
  }

  static async requestCompletion(
    prompt: string,
    options: { context?: string; systemPrompt?: string } = {},
  ): Promise<AIGatewayResponse> {
    const response = await gatewayRequest("/api/ai/chat", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: this.sanitizePrompt(prompt),
        ...(options.context ? { context: this.sanitizePrompt(options.context) } : {}),
        ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
      }),
    });
    const value = await response.json().catch(() => null) as AIGatewayResponse | null;
    if (!response.ok || !value || typeof value.text !== "string" || typeof value.model !== "string") {
      const safeMessage = response.status === 401
        ? "Bulut asistanı için bağlı öğretmen hesabı gerekiyor."
        : response.status === 503
          ? "Bulut asistanı bu yayında yapılandırılmadı."
          : value?.code === "provider_http_402"
            ? "DeepSeek hesabında kullanılabilir bakiye yok. Yerel pedagoji motoru kullanıldı."
            : response.status === 502 && value?.code?.startsWith("provider_http_")
              ? "DeepSeek isteği sağlayıcı tarafından reddedildi. Yerel pedagoji motoru kullanıldı."
          : "Bulut asistanı şu anda yanıt veremiyor.";
      throw new Error(safeMessage);
    }
    return { text: value.text, model: value.model };
  }

  static async streamResponse(request: AIStreamRequest): Promise<void> {
    if (request.provider === "deepseek") {
      try {
        const result = await this.requestCompletion(request.prompt, {
          context: request.context,
          systemPrompt: request.systemPrompt || MEB_TYMM_SYSTEM_PROMPT,
        });
        request.onChunk(result.text);
        request.onDone(result.text);
        return;
      } catch (error) {
        request.onError(error instanceof Error ? error : new Error("Bulut asistanı kullanılamadı."));
        return;
      }
    }

    try {
      const localResult: SynthesizedResponse = synthesizeLocalResponse(
        request.prompt,
        request.context ? { topic: request.context } : {},
      );
      request.onChunk(localResult.markdown);
      request.onDone(localResult.markdown);
    } catch (error) {
      request.onError(error instanceof Error ? error : new Error("Yerel motor yanıt üretemedi."));
    }
  }

  static async validateKey(
    _provider?: "deepseek" | "gemini",
    _apiKey?: string,
  ): Promise<{ success: boolean; message: string }> {
    purgeLegacyClientSecrets();
    const status = await this.getGatewayStatus();
    return status.available
      ? { success: true, message: `Sunucu taraflı DeepSeek bağlantısı hazır (${status.model ?? "yapılandırılmış model"}).` }
      : {
          success: false,
          message: status.reason === "authentication_required"
            ? "Bulut bağlantısını sınamak için önce öğretmen hesabınıza bağlanın."
            : "DeepSeek ağ geçidi bu yayında henüz etkin değil; yerel motor kullanılacak.",
        };
  }
}
