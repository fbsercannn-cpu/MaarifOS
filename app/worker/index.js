const PREMIUM_LICENSE_API_ORIGIN =
  /* @maarifos-sites-build:premium-license-api-origin */ null;

const CONNECT_SOURCES = [
  "'self'",
  ...(PREMIUM_LICENSE_API_ORIGIN === null ? [] : [PREMIUM_LICENSE_API_ORIGIN]),
];

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src ${CONNECT_SOURCES.join(" ")}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

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

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const requestUrl = new URL(request.url);

    if (
      response.status !== 404 ||
      !acceptsHtml ||
      !["GET", "HEAD"].includes(request.method) ||
      isReservedNetworkPath(requestUrl.pathname)
    ) {
      return withSecurityHeaders(response);
    }

    const indexUrl = requestUrl;
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return withSecurityHeaders(
      await env.ASSETS.fetch(new Request(indexUrl, request)),
    );
  },
};
