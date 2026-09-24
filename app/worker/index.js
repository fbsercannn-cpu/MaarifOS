export const PREMIUM_LICENSE_API_ORIGIN =
  /* @maarifos-sites-build:premium-license-api-origin */ null;

export const TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES = Object.freeze([
  "https://tymm.meb.gov.tr/assets/pdf/",
  "https://tymm.meb.gov.tr/upload/brosur/",
]);

export const SITES_APP_SHELL_PATH =
  /* @maarifos-sites-package:app-shell-path */ null;
export const SITES_APP_SHELL_SHA256 =
  /* @maarifos-sites-package:app-shell-sha256 */ null;

export function createContentSecurityPolicy(licenseApiOrigin = null) {
  const connectSources = [
    "'self'",
    ...(licenseApiOrigin === null ? [] : [licenseApiOrigin]),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `frame-src 'self' ${TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function createSecurityHeaders(licenseApiOrigin = null) {
  return Object.freeze({
    "Content-Security-Policy": createContentSecurityPolicy(licenseApiOrigin),
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
}

export const CONTENT_SECURITY_POLICY = createContentSecurityPolicy(
  PREMIUM_LICENSE_API_ORIGIN,
);
export const SECURITY_HEADERS = createSecurityHeaders(PREMIUM_LICENSE_API_ORIGIN);

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isReservedNetworkPath(pathname) {
  return ["/api", "/auth"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const ACCOUNT_UPSTREAM_ORIGINS = Object.freeze([
  "https://maarifos-account-api.otonom-hesaplama.workers.dev",
]);
export const ACCOUNT_PROXY_MAX_BODY_BYTES = 8 * 1024 * 1024;
const ACCOUNT_PROXY_REQUEST_HEADERS = Object.freeze([
  "Accept", "Cookie", "Origin", "Content-Type", "X-CSRF-Token", "X-CSRF",
]);
const ACCOUNT_PROXY_RESPONSE_HEADERS = new Set([
  "content-type", "content-disposition", "location", "set-cookie", "retry-after",
]);

export function validateAccountProxyConfiguration(env) {
  try {
    if (typeof env?.MAARIFOS_ACCOUNT_UPSTREAM !== "string") return null;
    const url = new URL(env.MAARIFOS_ACCOUNT_UPSTREAM);
    if (
      !ACCOUNT_UPSTREAM_ORIGINS.includes(url.origin) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash
    ) return null;
    if (
      typeof env.MAARIFOS_ACCOUNT_PROXY_KEY !== "string" ||
      !/^[A-Za-z0-9_-]{32,256}$/.test(env.MAARIFOS_ACCOUNT_PROXY_KEY)
    ) return null;
    return { origin: url.origin, key: env.MAARIFOS_ACCOUNT_PROXY_KEY };
  } catch {
    return null;
  }
}

const isAccountNetworkPath = (pathname) => ["/api/account", "/auth/google"].some(
  (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
);

const accountProxyError = (status, error, code) => withSecurityHeaders(new Response(
  JSON.stringify({ available: false, status: code === "account_not_configured" ? "not_configured" : "unavailable", error, code }),
  { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
));

export const AI_GATEWAY_PATHS = Object.freeze(["/api/ai/status", "/api/ai/chat"]);
export const AI_GATEWAY_MAX_BODY_BYTES = 32 * 1024;
export const AI_GATEWAY_MODELS = Object.freeze(["deepseek-flash", "deepseek-v4-pro"]);
const AI_GATEWAY_RATE_WINDOW_MS = 60_000;
const AI_GATEWAY_RATE_LIMIT = 12;
const aiRateWindows = new Map();

export function validateAIGatewayConfiguration(env) {
  const apiKey = env?.MAARIFOS_DEEPSEEK_API_KEY;
  if (
    typeof apiKey !== "string" ||
    apiKey.length < 24 ||
    apiKey.length > 256 ||
    !/^sk-[A-Za-z0-9_-]+$/.test(apiKey)
  ) return null;
  const model = env?.MAARIFOS_DEEPSEEK_MODEL ?? AI_GATEWAY_MODELS[0];
  if (!AI_GATEWAY_MODELS.includes(model)) return null;
  return { apiKey, model };
}

const aiGatewayError = (status, error, code) => withSecurityHeaders(new Response(
  JSON.stringify({ available: false, provider: "none", error, code }),
  { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
));

const isConnectedAccountStatus = (value) =>
  value?.available === true && value?.status === "connected" &&
  typeof value?.user?.subject === "string" && value.user.subject.length > 0;

async function authorizeAIRequest(request, env, accountFetcher) {
  const cookie = request.headers.get("Cookie");
  if (cookie === null || !cookie.includes("__Host-maarifos-session=")) return false;
  const statusUrl = new URL("/api/account/status", request.url);
  const statusRequest = new Request(statusUrl, {
    method: "GET",
    headers: { Accept: "application/json", Cookie: cookie, Origin: statusUrl.origin },
  });
  const response = await proxyAccountRequest(
    statusRequest,
    env,
    statusUrl,
    "/api/account/status",
    accountFetcher,
  );
  if (!response.ok) return false;
  return isConnectedAccountStatus(await response.json().catch(() => null));
}

async function aiRateLimitKey(request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cookie));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function consumeAIRateLimit(request, now = Date.now()) {
  const key = await aiRateLimitKey(request);
  const current = aiRateWindows.get(key);
  if (!current || now - current.startedAt >= AI_GATEWAY_RATE_WINDOW_MS) {
    if (aiRateWindows.size > 2_000) aiRateWindows.clear();
    aiRateWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= AI_GATEWAY_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

const boundedText = (value, maximum) =>
  typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;

async function handleAIGatewayRequest(request, env, requestUrl, accountFetcher, aiFetcher) {
  const configuration = validateAIGatewayConfiguration(env);
  if (configuration === null) {
    return aiGatewayError(503, "Bulut asistanı bu yayında yapılandırılmadı.", "ai_not_configured");
  }
  if (!["GET", "POST"].includes(request.method)) {
    return aiGatewayError(405, "İstek yöntemi desteklenmiyor.", "method_not_allowed");
  }
  if (request.headers.get("Origin") !== requestUrl.origin) {
    return aiGatewayError(403, "İstek kaynağı doğrulanamadı.", "origin_rejected");
  }
  if (!await authorizeAIRequest(request, env, accountFetcher)) {
    return aiGatewayError(401, "Bağlı öğretmen hesabı gerekiyor.", "authentication_required");
  }
  if (requestUrl.pathname === "/api/ai/status") {
    if (request.method !== "GET") return aiGatewayError(405, "İstek yöntemi desteklenmiyor.", "method_not_allowed");
    return withSecurityHeaders(Response.json(
      { available: true, provider: "deepseek", model: configuration.model },
      { headers: { "Cache-Control": "no-store" } },
    ));
  }
  if (requestUrl.pathname !== "/api/ai/chat" || request.method !== "POST") {
    return aiGatewayError(404, "Yapay zeka uç noktası bulunamadı.", "not_found");
  }
  if (!await consumeAIRateLimit(request)) {
    return aiGatewayError(429, "Kısa sürede çok fazla istek gönderildi.", "rate_limited");
  }
  if (!(request.headers.get("Content-Type") ?? "").toLocaleLowerCase("en-US").startsWith("application/json")) {
    return aiGatewayError(415, "JSON istek gövdesi gerekiyor.", "unsupported_media_type");
  }
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > AI_GATEWAY_MAX_BODY_BYTES)) {
    return aiGatewayError(413, "İstek gövdesi sınırı aşıyor.", "body_too_large");
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > AI_GATEWAY_MAX_BODY_BYTES) {
    return aiGatewayError(413, "İstek gövdesi sınırı aşıyor.", "body_too_large");
  }
  let body;
  try { body = JSON.parse(rawBody); } catch {
    return aiGatewayError(400, "JSON istek gövdesi geçersiz.", "invalid_json");
  }
  const prompt = boundedText(body?.prompt, 12_000);
  const context = body?.context === undefined ? null : boundedText(body.context, 8_000);
  const systemPrompt = body?.systemPrompt === undefined ? null : boundedText(body.systemPrompt, 6_000);
  if (prompt === null || (body?.context !== undefined && context === null) || (body?.systemPrompt !== undefined && systemPrompt === null)) {
    return aiGatewayError(400, "İstek alanları geçersiz veya çok uzun.", "invalid_request");
  }
  const messages = [
    { role: "system", content: systemPrompt ?? "Türkçe yanıt veren, okul öncesi eğitim için taslak üreten bir pedagoji yardımcısısın. Resmî kaydı değiştirme." },
    ...(context ? [{ role: "system", content: `Bağlam:\n${context}` }] : []),
    { role: "user", content: prompt },
  ];
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 40_000);
  try {
    const upstream = await aiFetcher("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
      body: JSON.stringify({ model: configuration.model, messages, temperature: 0.4, max_tokens: 2_500, stream: false }),
      redirect: "error",
      signal: abort.signal,
    });
    if (!upstream.ok) return aiGatewayError(502, "Yapay zeka sağlayıcısı yanıt veremedi.", "provider_unavailable");
    const value = await upstream.json().catch(() => null);
    const text = value?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length === 0 || text.length > 40_000) {
      return aiGatewayError(502, "Yapay zeka sağlayıcısı geçersiz yanıt verdi.", "provider_invalid_response");
    }
    return withSecurityHeaders(Response.json(
      { text, model: configuration.model },
      { headers: { "Cache-Control": "no-store" } },
    ));
  } catch {
    return aiGatewayError(502, "Yapay zeka sağlayıcısına ulaşılamadı.", "provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function proxyAccountRequest(request, env, requestUrl, routingPath, fetcher) {
  if (requestUrl.pathname !== routingPath) {
    return accountProxyError(400, "Hesap isteğinin yolu geçersiz.", "invalid_path");
  }
  const configuration = validateAccountProxyConfiguration(env);
  if (configuration === null) {
    return accountProxyError(503, "Google hesap sunucusu bu yayında henüz yapılandırılmadı. Şifreli dosya yedeğini kullanabilirsiniz.", "account_not_configured");
  }
  if (!["GET", "HEAD", "POST"].includes(request.method)) {
    return accountProxyError(405, "Hesap isteğinin yöntemi desteklenmiyor.", "method_not_allowed");
  }
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null && !/^\d+$/.test(declaredLength)) {
    return accountProxyError(400, "Hesap isteğinin boyutu geçersiz.", "invalid_length");
  }
  if (declaredLength !== null && Number(declaredLength) > ACCOUNT_PROXY_MAX_BODY_BYTES) {
    return accountProxyError(413, "Bulut yedeği 8 MB sınırını aşıyor; şifreli dosya yedeğini kullanın.", "body_too_large");
  }
  const headers = new Headers();
  for (const name of ACCOUNT_PROXY_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // The credential exists only in the server binding; client-supplied proxy,
  // forwarding, Host and Sec-* headers never become trusted backend inputs.
  headers.set("X-MaarifOS-Account-Proxy", configuration.key);
  const upstreamUrl = new URL(configuration.origin);
  upstreamUrl.pathname = requestUrl.pathname;
  upstreamUrl.search = requestUrl.search;
  let bodyTooLarge = false;
  let bytes = 0;
  const body = request.body?.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > ACCOUNT_PROXY_MAX_BODY_BYTES) {
        bodyTooLarge = true;
        controller.error(new Error("Account request body exceeds its bounded size."));
        return;
      }
      controller.enqueue(chunk);
    },
  }));
  const abort = new AbortController();
  const cancel = () => abort.abort();
  request.signal.addEventListener("abort", cancel, { once: true });
  if (request.signal.aborted) cancel();
  const timeout = setTimeout(cancel, 60_000);
  try {
    const response = await fetcher(new Request(upstreamUrl, {
      method: request.method,
      headers,
      ...(body ? { body, duplex: "half" } : {}),
      redirect: "manual",
      signal: abort.signal,
    }));
    if (bodyTooLarge) {
      await response.body?.cancel();
      return accountProxyError(413, "Bulut yedeği 8 MB sınırını aşıyor; şifreli dosya yedeğini kullanın.", "body_too_large");
    }
    // Cloning Headers retains each Set-Cookie value, including cookie deletion
    // and the new session cookie in the same OAuth callback response.
    const responseHeaders = new Headers(response.headers);
    for (const name of [...responseHeaders.keys()]) {
      if (!ACCOUNT_PROXY_RESPONSE_HEADERS.has(name.toLocaleLowerCase("en-US"))) responseHeaders.delete(name);
    }
    responseHeaders.set("Cache-Control", "no-store");
    return withSecurityHeaders(new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status, statusText: response.statusText, headers: responseHeaders,
    }));
  } catch {
    // Never log the request URL: callback query parameters carry OAuth codes.
    return bodyTooLarge
      ? accountProxyError(413, "Bulut yedeği 8 MB sınırını aşıyor; şifreli dosya yedeğini kullanın.", "body_too_large")
      : accountProxyError(502, "Google hesap sunucusuna ulaşılamadı. Yeniden deneyin.", "account_upstream_unavailable");
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", cancel);
  }
}

const decodeRoutingPath = (pathname) => {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes("%") || decoded.includes("\\") || decoded.includes("\0")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const acceptsHtmlResponse = (request) =>
  (request.headers.get("Accept") ?? "").split(",").some((mediaRange) =>
    mediaRange.trim().split(";", 1)[0].trim().toLocaleLowerCase("en-US") === "text/html"
  );

const isValidAppShellConfiguration = (pathValue, sha256Value) =>
  typeof pathValue === "string" &&
  /^\/assets\/maarifos-shell-[0-9a-f]{64}\.bin$/.test(pathValue) &&
  typeof sha256Value === "string" &&
  /^[0-9a-f]{64}$/.test(sha256Value) &&
  pathValue === `/assets/maarifos-shell-${sha256Value}.bin`;

const sha256Hex = async (bytes) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
};

const decodeOpaqueAppShell = (encodedBytes) => {
  let encoded;
  try {
    encoded = new TextDecoder("ascii", { fatal: true }).decode(encodedBytes);
  } catch {
    return null;
  }
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  ) {
    return null;
  }

  try {
    const decoded = atob(encoded);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
};

const appShellUnavailable = () => withSecurityHeaders(
  new Response("Application shell unavailable.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  }),
);

async function fetchVerifiedAppShell(request, env, appShellPath, appShellSha256) {
  if (!isValidAppShellConfiguration(appShellPath, appShellSha256)) {
    return appShellUnavailable();
  }

  const shellUrl = new URL(request.url);
  shellUrl.pathname = appShellPath;
  shellUrl.search = "";
  shellUrl.hash = "";
  const shellHeaders = new Headers(request.headers);
  shellHeaders.set("Accept", "application/octet-stream");
  shellHeaders.set("Accept-Encoding", "identity");
  for (const name of ["If-Match", "If-None-Match", "If-Modified-Since", "Range"]) {
    shellHeaders.delete(name);
  }

  const shellResponse = await env.ASSETS.fetch(new Request(shellUrl, {
    method: "GET",
    headers: shellHeaders,
    redirect: "manual",
  }));
  if (shellResponse.status !== 200) return appShellUnavailable();
  const contentEncoding = shellResponse.headers.get("Content-Encoding");
  if (contentEncoding !== null && contentEncoding !== "identity") {
    return appShellUnavailable();
  }

  const shellBytes = await shellResponse.arrayBuffer();
  if (await sha256Hex(shellBytes) !== appShellSha256) {
    return appShellUnavailable();
  }
  const decodedShellBytes = decodeOpaqueAppShell(shellBytes);
  if (decodedShellBytes === null) return appShellUnavailable();

  const headers = new Headers({
    "Cache-Control": "no-cache",
    "Content-Length": String(decodedShellBytes.byteLength),
    "Content-Type": "text/html; charset=utf-8",
  });
  return withSecurityHeaders(new Response(
    request.method === "HEAD" ? null : decodedShellBytes,
    { status: 200, headers },
  ));
}

export function createSitesWorker({
  appShellPath = SITES_APP_SHELL_PATH,
  appShellSha256 = SITES_APP_SHELL_SHA256,
  accountFetcher = fetch,
  aiFetcher = fetch,
} = {}) {
  return {
    async fetch(request, env) {
      const requestUrl = new URL(request.url);
      const routingPath = decodeRoutingPath(requestUrl.pathname);
      if (routingPath !== null && AI_GATEWAY_PATHS.includes(routingPath)) {
        return handleAIGatewayRequest(request, env, requestUrl, accountFetcher, aiFetcher);
      }
      if (routingPath !== null && isAccountNetworkPath(routingPath)) {
        return proxyAccountRequest(request, env, requestUrl, routingPath, accountFetcher);
      }
      const response = await env.ASSETS.fetch(request);
      const acceptsHtml = acceptsHtmlResponse(request);
      const isExactShellPath =
        routingPath !== null && ["/", "/index.html"].includes(routingPath);
      const finalPathSegment = routingPath?.split("/").at(-1) ?? "";
      const isExtensionlessAppRoute =
        routingPath !== null &&
        !routingPath.startsWith("/assets/") &&
        routingPath !== "/assets" &&
        !finalPathSegment.includes(".");

      if (
        response.status !== 404 ||
        (!isExactShellPath && (!acceptsHtml || !isExtensionlessAppRoute)) ||
        !["GET", "HEAD"].includes(request.method) ||
        routingPath === null ||
        isReservedNetworkPath(routingPath)
      ) {
        return withSecurityHeaders(response);
      }

      return fetchVerifiedAppShell(
        request,
        env,
        appShellPath,
        appShellSha256,
      );
    },
  };
}

export default createSitesWorker();
