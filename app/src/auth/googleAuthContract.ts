import type { GoogleReadiness, NetworkStatus } from "./authMachine";

export const SECURE_GOOGLE_AUTH_PROFILE = Object.freeze({
  authorizationFlow: "authorization-code" as const,
  pkce: "S256" as const,
  stateBinding: "bff-bound" as const,
  nonceBinding: "bff-bound" as const,
  sessionTransport: "http-only-secure-samesite-cookie" as const,
  browserTokenStorage: "forbidden" as const,
  childDataTransfer: "none" as const,
});

export type GoogleAuthSecurityProfile = typeof SECURE_GOOGLE_AUTH_PROFILE;

export type GoogleSessionSnapshot =
  | { status: "not_connected" }
  | {
      status: "connected";
      user: {
        /** Stable provider subject. This value is not an OAuth credential. */
        subject: string;
        displayName: string;
      };
    };

export type GoogleAuthStartResult =
  | { kind: "redirect"; authorizationUrl: string }
  | { kind: "cancelled" }
  | { kind: "unavailable" }
  | { kind: "failed"; reason: "invalid_response" | "provider_error" };

/**
 * Future BFF adapter boundary. Implementations must never return OAuth access,
 * refresh or ID tokens to the application runtime.
 */
export interface GoogleAuthGateway {
  readonly securityProfile: GoogleAuthSecurityProfile;

  readiness(): GoogleReadiness;

  startConnection(input: {
    network: NetworkStatus;
    returnPath: string;
    signal?: AbortSignal;
  }): Promise<GoogleAuthStartResult>;

  readSession(input?: { signal?: AbortSignal }): Promise<GoogleSessionSnapshot>;

  disconnect(input?: { signal?: AbortSignal }): Promise<void>;
}

export type AuthorizationUrlPolicy = {
  allowedOrigins: readonly string[];
  allowedPaths: readonly string[];
  allowLoopbackHttp?: boolean;
};

const isLoopback = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/** Exact origin and exact path matching prevents an OAuth open redirect. */
export const validateAuthorizationUrl = (
  rawUrl: string,
  policy: AuthorizationUrlPolicy,
): URL | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const validProtocol =
    parsed.protocol === "https:" ||
    (policy.allowLoopbackHttp === true && parsed.protocol === "http:" && isLoopback(parsed.hostname));

  if (!validProtocol || parsed.username || parsed.password || parsed.hash) return null;
  if (!policy.allowedOrigins.includes(parsed.origin)) return null;
  if (!policy.allowedPaths.includes(parsed.pathname)) return null;
  return parsed;
};

export type ReturnPathPolicy = {
  appOrigin: string;
  allowedPathPrefixes: readonly string[];
};

const isAllowedPathPrefix = (pathname: string, prefix: string): boolean => {
  if (prefix === "/") return pathname.startsWith("/");
  const normalized = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
};

/** Returns a normalized same-origin path or null; never returns an absolute URL. */
export const validateLocalReturnPath = (
  rawPath: string,
  policy: ReturnPathPolicy,
): string | null => {
  if (!rawPath.startsWith("/") || rawPath.startsWith("//") || rawPath.includes("\\")) {
    return null;
  }

  let appOrigin: URL;
  let parsed: URL;
  try {
    appOrigin = new URL(policy.appOrigin);
    parsed = new URL(rawPath, appOrigin);
  } catch {
    return null;
  }

  if (parsed.origin !== appOrigin.origin || parsed.username || parsed.password) return null;
  if (!policy.allowedPathPrefixes.some((prefix) => isAllowedPathPrefix(parsed.pathname, prefix))) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

export const hasSecureGoogleAuthProfile = (candidate: unknown): candidate is GoogleAuthSecurityProfile => {
  if (candidate === null || typeof candidate !== "object") return false;
  const profile = candidate as Partial<Record<keyof GoogleAuthSecurityProfile, unknown>>;
  return (Object.keys(SECURE_GOOGLE_AUTH_PROFILE) as Array<keyof GoogleAuthSecurityProfile>).every(
    (key) => profile[key] === SECURE_GOOGLE_AUTH_PROFILE[key],
  );
};
