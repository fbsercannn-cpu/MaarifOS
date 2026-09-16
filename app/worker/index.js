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
} = {}) {
  return {
    async fetch(request, env) {
      const response = await env.ASSETS.fetch(request);
      const requestUrl = new URL(request.url);
      const routingPath = decodeRoutingPath(requestUrl.pathname);
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
