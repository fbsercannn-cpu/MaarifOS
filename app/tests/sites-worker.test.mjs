import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  FOUNDER_BUILD_ATTESTATION,
  FOUNDER_PRODUCTION_MODE,
  FOUNDER_PRODUCTION_PROFILE,
  PREMIUM_LICENSE_AUDIENCE_ENV,
  PREMIUM_LICENSE_API_ORIGIN_ENV,
  PREMIUM_LICENSE_ISSUER_ENV,
  PREMIUM_LICENSE_TRUSTED_KEYS_ENV,
  PRECACHE_MANIFEST_FILENAME,
  PRODUCTION_FOUNDER_KEY_ID,
  createPrecacheManifest,
  parseFounderProductionProfile,
  preflightSitesBuild,
  prepareSitesBuild,
  renderSitesWorker,
  renderStaticAssetHeadersFile,
  validateProductionFounderEnvironment,
  validateProductionLicenseApiOrigin,
} from "../scripts/prepare-sites-build.mjs";
import {
  MAARIFOS_LIVE_SITES_PROJECT_ID,
  assertNoDeploymentSecrets,
  stageSitesPackage,
} from "../scripts/prepare-sites-package.mjs";
import {
  TYMM_OFFICIAL_LIBRARY,
  canEmbedTymmOfficialLibraryResource,
} from "../src/features/curriculum/tymm-official-library.ts";
import worker, {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES,
  createSitesWorker,
  createSecurityHeaders,
  ACCOUNT_PROXY_MAX_BODY_BYTES,
  ACCOUNT_UPSTREAM_ORIGINS,
  AI_GATEWAY_MAX_BODY_BYTES,
  AI_GATEWAY_MODELS,
  validateAIGatewayConfiguration,
  validateAccountProxyConfiguration,
} from "../worker/index.js";

const accountProxyEnvironment = () => ({
  MAARIFOS_ACCOUNT_UPSTREAM: ACCOUNT_UPSTREAM_ORIGINS[0],
  MAARIFOS_ACCOUNT_PROXY_KEY: "synthetic-test-proxy-key-never-a-live-secret-2026",
  ASSETS: { fetch: async () => new Response("static missing", { status: 404 }) },
});

const aiGatewayEnvironment = () => ({
  ...accountProxyEnvironment(),
  MAARIFOS_DEEPSEEK_API_KEY: `sk-${"synthetic_test_material_2026".replaceAll("_", "-")}`,
  MAARIFOS_DEEPSEEK_MODEL: AI_GATEWAY_MODELS[0],
});

const connectedAccountFetcher = async () => Response.json({
  available: true,
  status: "connected",
  user: { subject: "synthetic-teacher", displayName: "Kurgu Öğretmen" },
  driveConnected: false,
});

const aiRequest = (pathname, init = {}) => new Request(`https://example.test${pathname}`, {
  ...init,
  headers: {
    Origin: "https://example.test",
    Cookie: "__Host-maarifos-session=synthetic-session",
    ...(init.headers ?? {}),
  },
});

test("AI gateway accepts only server bindings and approved models", () => {
  const env = aiGatewayEnvironment();
  assert.deepEqual(validateAIGatewayConfiguration(env), {
    apiKey: env.MAARIFOS_DEEPSEEK_API_KEY,
    model: AI_GATEWAY_MODELS[0],
  });
  for (const apiKey of [undefined, "short", "sk-bad key", `sk-${"a".repeat(300)}`]) {
    assert.equal(validateAIGatewayConfiguration({ ...env, MAARIFOS_DEEPSEEK_API_KEY: apiKey }), null);
  }
  assert.equal(validateAIGatewayConfiguration({ ...env, MAARIFOS_DEEPSEEK_MODEL: "attacker-model" }), null);
});

test("browser-delivered AI sources contain no provider endpoint or embedded secret", async () => {
  const browserSources = await Promise.all([
    "../src/services/secure-ai-client.ts",
    "../src/services/ai-plan-generator.ts",
    "../src/services/ai-observation-classifier.ts",
    "../src/components/MaarifAIAssistant.tsx",
    "../src/components/MaarifApiConfigModal.tsx",
    "../src/features/chatgpt-bridge/ChatGPTBridgeModal.tsx",
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));
  const combined = browserSources.join("\n");
  for (const forbidden of [
    "api.deepseek.com",
    "api.openai.com",
    "generativelanguage.googleapis.com",
    "deepseek-chat",
    "Authorization: `Bearer",
  ]) assert.equal(combined.includes(forbidden), false, forbidden);
  assert.equal(/sk-[A-Za-z0-9_-]{20,}/u.test(combined), false);
});

test("AI gateway fails closed when secret or account authentication is absent", async () => {
  const unconfigured = createSitesWorker({ accountFetcher: connectedAccountFetcher });
  assert.equal((await unconfigured.fetch(aiRequest("/api/ai/status"), accountProxyEnvironment())).status, 503);

  let providerCalls = 0;
  const secured = createSitesWorker({
    accountFetcher: async () => Response.json({ available: true, status: "not_connected" }),
    aiFetcher: async () => { providerCalls++; return Response.json({}); },
  });
  const response = await secured.fetch(aiRequest("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Kurgu eğitim taslağı" }),
  }), aiGatewayEnvironment());
  assert.equal(response.status, 401);
  assert.equal(providerCalls, 0);
  assertSecurityHeaders(response);
});

test("AI gateway rejects cross-origin and oversized requests before provider access", async () => {
  let providerCalls = 0;
  const secured = createSitesWorker({
    accountFetcher: connectedAccountFetcher,
    aiFetcher: async () => { providerCalls++; return Response.json({}); },
  });
  const env = aiGatewayEnvironment();
  const crossOrigin = await secured.fetch(aiRequest("/api/ai/status", {
    headers: { Origin: "https://evil.test" },
  }), env);
  assert.equal(crossOrigin.status, 403);
  const oversized = await secured.fetch(aiRequest("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(AI_GATEWAY_MAX_BODY_BYTES + 1) },
    body: "{}",
  }), env);
  assert.equal(oversized.status, 413);
  assert.equal(providerCalls, 0);
});

test("AI gateway keeps provider secret server-side and returns bounded text", async () => {
  const env = aiGatewayEnvironment();
  let providerCalls = 0;
  const secured = createSitesWorker({
    accountFetcher: connectedAccountFetcher,
    aiFetcher: async (url, init) => {
      providerCalls++;
      assert.equal(url, "https://api.deepseek.com/chat/completions");
      assert.equal(init.headers.Authorization, `Bearer ${env.MAARIFOS_DEEPSEEK_API_KEY}`);
      const body = JSON.parse(init.body);
      assert.equal(body.model, AI_GATEWAY_MODELS[0]);
      assert.equal(body.stream, false);
      return Response.json({ choices: [{ message: { content: "Öğretmen incelemesine açık kurgu taslak." } }] });
    },
  });
  const status = await secured.fetch(aiRequest("/api/ai/status"), env);
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { available: true, provider: "deepseek", model: AI_GATEWAY_MODELS[0] });
  const response = await secured.fetch(aiRequest("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Kurgu eğitim taslağı" }),
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: "Öğretmen incelemesine açık kurgu taslak.", model: AI_GATEWAY_MODELS[0] });
  assert.equal(providerCalls, 1);
  assert.equal(JSON.stringify(await secured.fetch(aiRequest("/api/ai/status"), env)).includes(env.MAARIFOS_DEEPSEEK_API_KEY), false);
});

test("account proxy accepts only the exact HTTPS backend and server-only credential", () => {
  const env = accountProxyEnvironment();
  assert.equal(validateAccountProxyConfiguration(env).origin, ACCOUNT_UPSTREAM_ORIGINS[0]);
  for (const value of [
    "http://maarifos-account-api.otonom-hesaplama.workers.dev",
    "https://maarifos-account-api.otonom-hesaplama.workers.dev.evil.test",
    "https://other.otonom-hesaplama.workers.dev", "https://127.0.0.1",
    "https://maarifos-account-api.otonom-hesaplama.workers.dev/path",
    "https://user:password@maarifos-account-api.otonom-hesaplama.workers.dev",
    `${env.MAARIFOS_ACCOUNT_UPSTREAM}?target=another`, `${env.MAARIFOS_ACCOUNT_UPSTREAM}#fragment`,
  ]) assert.equal(validateAccountProxyConfiguration({ ...env, MAARIFOS_ACCOUNT_UPSTREAM: value }), null);
  for (const key of [undefined, "short", "a".repeat(257), "a".repeat(32) + "\n"])
    assert.equal(validateAccountProxyConfiguration({ ...env, MAARIFOS_ACCOUNT_PROXY_KEY: key }), null);
});

test("unconfigured account routes return explicit no-store JSON before static assets", async () => {
  const env = { ASSETS: { fetch: () => { throw new Error("must not serve an account asset"); } } };
  for (const pathname of ["/api/account/status", "/api/account", "/auth/google/start", "/auth/google/callback?code=synthetic-code&state=synthetic-state"]) {
    const response = await worker.fetch(new Request(`https://example.test${pathname}`), env);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const value = await response.json();
    assert.equal(value.status, "not_configured");
    assert.equal(value.code, "account_not_configured");
    assert.equal(JSON.stringify(value).includes("synthetic-code"), false);
    assertSecurityHeaders(response);
  }
});

test("account proxy forwards only contract headers, preserves JSON and replaces forged credentials", async () => {
  const env = accountProxyEnvironment();
  const accountWorker = createSitesWorker({ accountFetcher: async (request) => {
    assert.equal(request.url, `${env.MAARIFOS_ACCOUNT_UPSTREAM}/auth/google/start`);
    assert.equal(request.method, "POST");
    assert.equal(request.redirect, "manual");
    assert.equal(request.headers.get("origin"), "https://example.test");
    assert.equal(request.headers.get("cookie"), "__Host-maarifos-session=synthetic-session");
    assert.equal(request.headers.get("content-type"), "application/json");
    assert.equal(request.headers.get("x-csrf-token"), "synthetic-csrf");
    assert.equal(request.headers.get("x-maarifos-account-proxy"), env.MAARIFOS_ACCOUNT_PROXY_KEY);
    for (const name of ["host", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for", "authorization", "sec-fetch-site", "cf-connecting-ip", "x-arbitrary"])
      assert.equal(request.headers.get(name), null, name);
    assert.deepEqual(await request.json(), { purpose: "login" });
    return Response.json({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic" }, { headers: { "Cache-Control": "public, max-age=600", "Access-Control-Allow-Origin": "*" } });
  } });
  const response = await accountWorker.fetch(new Request("https://example.test/auth/google/start", {
    method: "POST", body: JSON.stringify({ purpose: "login" }), headers: {
      Origin: "https://example.test", Cookie: "__Host-maarifos-session=synthetic-session",
      "Content-Type": "application/json", "X-CSRF-Token": "synthetic-csrf",
      Host: "evil.test", Forwarded: "host=evil.test", "X-Forwarded-Host": "evil.test",
      "X-Forwarded-Proto": "http", "X-Forwarded-For": "127.0.0.1", Authorization: "Bearer forged",
      "Sec-Fetch-Site": "same-origin", "CF-Connecting-IP": "127.0.0.1", "X-Arbitrary": "ignored",
      "X-MaarifOS-Account-Proxy": "forged-client-key",
    },
  }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assertSecurityHeaders(response);
});

test("OAuth callback keeps raw query, manual redirect and separate host-only cookies", async () => {
  const cookies = [
    "__Host-maarifos-attempt=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    "__Host-maarifos-session=synthetic; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax",
  ];
  const query = "?code=synthetic%2Bcode&state=a%2Fb%3D&scope=openid+profile";
  let calls = 0;
  const accountWorker = createSitesWorker({ accountFetcher: async (request) => {
    calls++;
    assert.equal(new URL(request.url).search, query);
    assert.equal(request.redirect, "manual");
    const headers = new Headers({ Location: "/classroom?native=1&account=connected" });
    for (const cookie of cookies) headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 303, headers });
  } });
  const response = await accountWorker.fetch(new Request(`https://example.test/auth/google/callback${query}`), accountProxyEnvironment());
  assert.equal(calls, 1);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/classroom?native=1&account=connected");
  assert.deepEqual(response.headers.getSetCookie(), cookies);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("account proxy refuses noncanonical paths and does not proxy neighboring namespaces", async () => {
  let calls = 0;
  const accountWorker = createSitesWorker({ accountFetcher: async () => { calls++; return Response.json({ ok: true }); } });
  const env = accountProxyEnvironment();
  for (const pathname of ["/api/account%2fstatus", "/%61pi/account/status", "/auth/google/%63allback"]) {
    assert.equal((await accountWorker.fetch(new Request(`https://example.test${pathname}`), env)).status, 400);
  }
  for (const pathname of ["/api/accounting", "/auth/google-other/start", "/api/elsewhere", "/healthz"]) {
    assert.equal((await accountWorker.fetch(new Request(`https://example.test${pathname}`), env)).status, 404);
  }
  assert.equal((await accountWorker.fetch(new Request("https://example.test/api/account/backups", { method: "DELETE" }), env)).status, 405);
  assert.equal(calls, 0);
});

test("cloud body limit uses actual streamed bytes and rejects declared oversize before fetch", async () => {
  let calls = 0;
  const accountWorker = createSitesWorker({ accountFetcher: async (request) => {
    calls++;
    const reader = request.body.getReader();
    while (!(await reader.read()).done) { /* Consume with bounded memory, like the backend reader. */ }
    return Response.json({ ok: true });
  } });
  const env = accountProxyEnvironment();
  const oversized = await accountWorker.fetch(new Request("https://example.test/api/account/backups", {
    method: "POST", body: "synthetic", headers: { "Content-Length": String(ACCOUNT_PROXY_MAX_BODY_BYTES + 1) },
  }), env);
  assert.equal(oversized.status, 413);
  assert.equal(calls, 0);
  const chunk = new Uint8Array(1024 * 1024);
  let sent = 0;
  const stream = new ReadableStream({ pull(controller) { if (sent++ < 9) controller.enqueue(chunk); else controller.close(); } });
  const response = await accountWorker.fetch(new Request("https://example.test/api/account/backups", {
    method: "POST", body: stream, duplex: "half", headers: { "Content-Length": "1" },
  }), env);
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /8 MB/);
  assert.equal(calls, 1);
});

test("upstream transport errors disclose no callback query or server credential", async () => {
  const accountWorker = createSitesWorker({ accountFetcher: async () => { throw new Error("synthetic-private-token"); } });
  const response = await accountWorker.fetch(new Request("https://example.test/auth/google/callback?code=synthetic-private-code"), accountProxyEnvironment());
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body.includes("synthetic-private"), false);
  assert.equal(body.includes(accountProxyEnvironment().MAARIFOS_ACCOUNT_PROXY_KEY), false);
});

test("public Vite account proxy credentials are rejected instead of embedded in client builds", () => {
  assert.throws(() => validateProductionFounderEnvironment({ VITE_MAARIFOS_ACCOUNT_PROXY_KEY: "synthetic-private-value" }), /forbidden secret-bearing name/);
});

test("the 8 MiB cloud request boundary is inclusive and does not buffer the body twice", async () => {
  let receivedBytes = 0;
  const accountWorker = createSitesWorker({ accountFetcher: async (request) => {
    const reader = request.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
    }
    return Response.json({ accepted: true });
  } });
  const chunk = new Uint8Array(1024 * 1024);
  let sent = 0;
  const body = new ReadableStream({ pull(controller) { if (sent++ < 8) controller.enqueue(chunk); else controller.close(); } });
  const response = await accountWorker.fetch(new Request("https://example.test/api/account/backups", {
    method: "POST", body, duplex: "half",
  }), accountProxyEnvironment());
  assert.equal(response.status, 200);
  assert.equal(receivedBytes, ACCOUNT_PROXY_MAX_BODY_BYTES);
});

test("Sites worker rendering never serializes the runtime account proxy secret", async () => {
  const name = "MAARIFOS_ACCOUNT_PROXY_KEY";
  const before = process.env[name];
  process.env[name] = "synthetic-runtime-only-secret-should-never-be-rendered";
  try {
    const source = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
    const built = renderSitesWorker(source, null);
    assert.equal(built.includes(process.env[name]), false);
    assert.equal(built.includes("env.MAARIFOS_ACCOUNT_PROXY_KEY"), true);
  } finally {
    if (before === undefined) delete process.env[name];
    else process.env[name] = before;
  }
});

const assertSecurityHeaders = (response, licenseApiOrigin = null) => {
  const expectedHeaders = createSecurityHeaders(licenseApiOrigin);
  for (const [name, expectedValue] of Object.entries(expectedHeaders)) {
    assert.equal(response.headers.get(name), expectedValue);
  }

  const contentSecurityPolicy = response.headers.get("content-security-policy") ?? "";
  assert.match(contentSecurityPolicy, /default-src 'self'/);
  assert.match(contentSecurityPolicy, /script-src 'self'/);
  assert.match(contentSecurityPolicy, /object-src 'none'/);
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
  const frameDirective = contentSecurityPolicy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-src "));
  assert.equal(
    frameDirective,
    `frame-src 'self' ${TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES.join(" ")}`,
  );
  const connectDirective = contentSecurityPolicy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("connect-src "));
  assert.equal(
    connectDirective,
    `connect-src 'self'${licenseApiOrigin === null ? "" : ` ${licenseApiOrigin}`}`,
  );
  assert.match(contentSecurityPolicy, /upgrade-insecure-requests/);
};

const countOccurrences = (value, target) => value.split(target).length - 1;
const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

const PRODUCTION_PUBLIC_JWK = Object.freeze({
  kty: "EC",
  crv: "P-256",
  x: "VXW0xDaRpJ-JbGSiqSeMv4NIIoBlCXRakT-EmjMlA3g",
  y: "0HqKTAdCzTiMnQ2D_1nCh6_pb7xaBQHUktCdF7naTHA",
  key_ops: Object.freeze(["verify"]),
  ext: true,
});

const founderEnvironment = (
  origin = "https://maarifos-founder-license-api.otonom-hesaplama.workers.dev",
) => Object.freeze({
  [PREMIUM_LICENSE_API_ORIGIN_ENV]: origin,
  [PREMIUM_LICENSE_ISSUER_ENV]: origin,
  [PREMIUM_LICENSE_AUDIENCE_ENV]: "maarifos-pwa",
  [PREMIUM_LICENSE_TRUSTED_KEYS_ENV]: JSON.stringify({
    [PRODUCTION_FOUNDER_KEY_ID]: PRODUCTION_PUBLIC_JWK,
  }),
});

const founderProfileSource = (environment) =>
  `${[
    PREMIUM_LICENSE_API_ORIGIN_ENV,
    PREMIUM_LICENSE_ISSUER_ENV,
    PREMIUM_LICENSE_AUDIENCE_ENV,
    PREMIUM_LICENSE_TRUSTED_KEYS_ENV,
  ].map((name) => `${name}=${environment[name]}`).join("\n")}\n`;

const addFounderClientBundle = async (root, environment) => {
  const trustedKeys = JSON.parse(environment[PREMIUM_LICENSE_TRUSTED_KEYS_ENV]);
  const key = trustedKeys[PRODUCTION_FOUNDER_KEY_ID];
  const source = [
    environment[PREMIUM_LICENSE_API_ORIGIN_ENV],
    environment[PREMIUM_LICENSE_AUDIENCE_ENV],
    PRODUCTION_FOUNDER_KEY_ID,
    key.x,
    key.y,
  ].map((value) => JSON.stringify(value)).join(";\n");
  await mkdir(path.join(root, "dist", "client", "assets"), { recursive: true });
  await writeFile(path.join(root, "dist", "client", "assets", "founder.js"), source);
};

const createShellRuntime = (shellBody = "<!doctype html><title>MaarifOS</title>") => {
  const shellBytes = Buffer.from(shellBody);
  const opaqueShellBytes = Buffer.from(shellBytes.toString("base64"), "ascii");
  const shellSha256 = sha256Bytes(opaqueShellBytes);
  const shellPath = `/assets/maarifos-shell-${shellSha256}.bin`;
  const calls = [];
  const requests = [];
  const env = {
    ASSETS: {
      fetch: async (request) => {
        const url = new URL(request.url);
        calls.push(`${request.method} ${url.pathname}${url.search}`);
        requests.push({
          accept: request.headers.get("accept"),
          acceptEncoding: request.headers.get("accept-encoding"),
          pathname: url.pathname,
        });
        if (url.pathname === shellPath) {
          return new Response(opaqueShellBytes, {
            status: 200,
            headers: {
              "Content-Disposition": "attachment; filename=shell.bin",
              "Content-Type": "application/octet-stream",
              ETag: '"opaque-shell"',
              "Last-Modified": "Sat, 01 Jan 2000 00:00:00 GMT",
              Vary: "Accept-Encoding",
            },
          });
        }
        return new Response("missing", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  };
  return {
    calls,
    env,
    opaqueShellBytes,
    requests,
    shellBytes,
    shellPath,
    shellSha256,
    worker: createSitesWorker({
      appShellPath: shellPath,
      appShellSha256: shellSha256,
    }),
  };
};

const snapshotTree = async (root) => {
  const entries = [];
  const visit = async (directory, relativeDirectory = "") => {
    const directoryEntries = await readdir(directory, { withFileTypes: true });
    directoryEntries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of directoryEntries) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      const stats = await lstat(absolutePath);
      assert.equal(stats.isSymbolicLink(), false);
      const metadata = {
        mode: stats.mode & 0o777,
        mtimeMs: stats.mtimeMs,
      };
      if (entry.isDirectory()) {
        entries.push({
          ...metadata,
          path: relativePath.replaceAll(path.sep, "/"),
          type: "directory",
        });
        await visit(absolutePath, relativePath);
      } else {
        entries.push({
          ...metadata,
          path: relativePath.replaceAll(path.sep, "/"),
          sha256: sha256Bytes(await readFile(absolutePath)),
          type: "file",
        });
      }
    }
  };
  await visit(root);
  return entries;
};

const assertStaticHeadersFile = (source, licenseApiOrigin = null) => {
  const expectedHeaders = createSecurityHeaders(licenseApiOrigin);
  assert.equal(source, renderStaticAssetHeadersFile(expectedHeaders));

  const lines = source.trimEnd().split("\n");
  assert.equal(lines[0], "/*");
  assert.equal(lines.length, Object.keys(expectedHeaders).length + 1);
  assert.equal(countOccurrences(source, "*"), 1, "only the required /* route may use a wildcard");

  for (const [name, value] of Object.entries(expectedHeaders)) {
    assert.equal(lines.filter((line) => line === `  ${name}: ${value}`).length, 1);
  }

  if (licenseApiOrigin === null) {
    for (const frameSource of TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES) {
      assert.equal(countOccurrences(source, frameSource), 1);
    }
  } else {
    assert.equal(countOccurrences(source, licenseApiOrigin), 1);
    for (const frameSource of TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES) {
      assert.equal(countOccurrences(source, frameSource), 1);
    }
  }
};

const createSitesFixture = async ({ projectId = "test" } = {}) => {
  const root = await mkdtemp(path.join(tmpdir(), "maarifos-sites-build-"));
  await Promise.all([
    mkdir(path.join(root, "dist", "client"), { recursive: true }),
    mkdir(path.join(root, "dist", "client", "assets"), { recursive: true }),
    mkdir(path.join(root, "worker"), { recursive: true }),
    mkdir(path.join(root, ".openai"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ type: "module", version: "9.8.7" }),
    ),
    writeFile(
      path.join(root, "dist", "client", "index.html"),
      '<!doctype html><script type="module" src="/assets/index-fixture.js"></script><link rel="stylesheet" href="/assets/index-fixture.css">',
    ),
    writeFile(path.join(root, "dist", "client", "assets", "index-fixture.js"), "export {};"),
    writeFile(path.join(root, "dist", "client", "assets", "index-fixture.css"), ":root{}"),
    writeFile(
      path.join(root, "worker", "index.js"),
      await readFile(new URL("../worker/index.js", import.meta.url), "utf8"),
    ),
    writeFile(
      path.join(root, ".openai", "hosting.json"),
      JSON.stringify({ project_id: projectId }),
    ),
  ]);
  return root;
};

const importBuiltWorker = async (root) => {
  const workerUrl = pathToFileURL(path.join(root, "dist", "server", "index.js"));
  workerUrl.searchParams.set("case", crypto.randomUUID());
  return import(workerUrl.href);
};

const importStandaloneWorker = async (workerPath) => {
  const source = await readFile(workerPath, "utf8");
  const workerUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`;
  return import(workerUrl);
};

const staticAssetEnvironment = (body = "asset", status = 200) => ({
  ASSETS: { fetch: async () => new Response(body, { status }) },
});

test("exports one canonical security policy for Worker and static assets", () => {
  assert.equal(CONTENT_SECURITY_POLICY, SECURITY_HEADERS["Content-Security-Policy"]);
  assert.deepEqual(SECURITY_HEADERS, createSecurityHeaders());
  assert.equal(Object.isFrozen(SECURITY_HEADERS), true);
  assertStaticHeadersFile(renderStaticAssetHeadersFile(SECURITY_HEADERS));
});

test("gömülebilir TYMM katalog PDF'lerinin tamamı Worker frame-src yollarıyla uyumludur", () => {
  const frameSources = TYMM_OFFICIAL_DOCUMENT_FRAME_SOURCES.map((source) => new URL(source));
  assert.ok(frameSources.length > 0);
  assert.ok(
    frameSources.every(
      (source) =>
        source.protocol === "https:" &&
        source.hostname === "tymm.meb.gov.tr" &&
        source.pathname.endsWith("/"),
    ),
  );

  const embeddableResources = TYMM_OFFICIAL_LIBRARY.filter(
    canEmbedTymmOfficialLibraryResource,
  );
  assert.equal(embeddableResources.length, 35);
  for (const resource of embeddableResources) {
    const pdfUrl = new URL(resource.pdfUrl);
    assert.ok(
      frameSources.some(
        (source) =>
          pdfUrl.origin === source.origin && pdfUrl.pathname.startsWith(source.pathname),
      ),
      `${resource.id} PDF yolu Worker frame-src allowlist dışında: ${pdfUrl.href}`,
    );
  }
});

test("fails closed when a physical _headers line exceeds Cloudflare's limit", () => {
  const prefixLength = "  X-Test: ".length;
  assert.doesNotThrow(() => renderStaticAssetHeadersFile({
    "X-Test": "a".repeat(2_000 - prefixLength),
  }));
  assert.throws(
    () => renderStaticAssetHeadersFile({
      "X-Test": "a".repeat(2_001 - prefixLength),
    }),
    /must not exceed 2,000 characters/,
  );
});

test("fails closed when static output could bypass reserved network routes", async () => {
  const reservedAssets = [
    "api",
    path.join("api", "status.json"),
    "api.html",
    "auth",
    path.join("auth", "session.json"),
    "auth.html",
  ];

  for (const relativePath of reservedAssets) {
    const root = await createSitesFixture();
    try {
      const assetPath = path.join(root, "dist", "client", relativePath);
      await mkdir(path.dirname(assetPath), { recursive: true });
      await writeFile(assetPath, "reserved");
      assert.throws(
        () => prepareSitesBuild({ root, environment: {} }),
        /must not contain static assets under reserved \/api or \/auth routes/,
      );
      await assert.rejects(
        access(path.join(root, "dist", "server", "index.js")),
        { code: "ENOENT" },
      );
      await assert.rejects(
        access(path.join(root, "dist", "client", "_headers")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("allows non-reserved static paths that merely share a prefix", async () => {
  const root = await createSitesFixture();
  try {
    for (const relativePath of [
      "apiary.html",
      path.join("apiary", "index.json"),
      "author.html",
      path.join("author", "profile.json"),
    ]) {
      const assetPath = path.join(root, "dist", "client", relativePath);
      await mkdir(path.dirname(assetPath), { recursive: true });
      await writeFile(assetPath, "allowed");
    }

    assert.doesNotThrow(() => prepareSitesBuild({ root, environment: {} }));
    await access(path.join(root, "dist", "server", "index.js"));
    await access(path.join(root, "dist", "client", "_headers"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writes one deterministic integrity manifest for every Vite asset and lazy chunk", async () => {
  const root = await createSitesFixture();
  try {
    const clientRoot = path.join(root, "dist", "client");
    const lazyPath = path.join(clientRoot, "assets", "lazy", "activity-studio-A1b2C3.js");
    const imagePath = path.join(clientRoot, "assets", "brand", "icon.png");
    await Promise.all([
      mkdir(path.dirname(lazyPath), { recursive: true }),
      mkdir(path.dirname(imagePath), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(lazyPath, "export const lazy = true;"),
      writeFile(imagePath, Buffer.from([0, 1, 2, 3, 255])),
    ]);

    const expected = createPrecacheManifest({ clientRoot, release: "9.8.7" });
    const firstResult = prepareSitesBuild({ root, environment: {} });
    assert.equal(
      firstResult.precacheManifestOutput,
      path.join(clientRoot, PRECACHE_MANIFEST_FILENAME),
    );
    const firstBytes = await readFile(firstResult.precacheManifestOutput);
    const actual = JSON.parse(firstBytes.toString("utf8"));
    assert.deepEqual(actual, expected);
    assert.deepEqual(
      actual.assets.map((asset) => asset.path),
      [...actual.assets.map((asset) => asset.path)].sort((left, right) =>
        left.localeCompare(right, "en")),
    );
    assert.ok(actual.assets.some((asset) => asset.path === "assets/lazy/activity-studio-A1b2C3.js"));
    assert.ok(actual.assets.some((asset) => asset.path === "assets/brand/icon.png"));
    assert.equal(
      actual.assets.some((asset) => /^(?:\/)?(?:api|auth)(?:\/|$)/u.test(asset.path)),
      false,
    );

    const lazyEntry = actual.assets.find(
      (asset) => asset.path === "assets/lazy/activity-studio-A1b2C3.js",
    );
    const lazyBytes = await readFile(lazyPath);
    assert.deepEqual(lazyEntry, {
      path: "assets/lazy/activity-studio-A1b2C3.js",
      sha256: sha256Bytes(lazyBytes),
      size: lazyBytes.length,
    });

    prepareSitesBuild({ root, environment: {} });
    assert.equal(
      (await readFile(firstResult.precacheManifestOutput)).equals(firstBytes),
      true,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
  assertSecurityHeaders(response);
});

test("serves a verified opaque shell for an unknown HTML app route", async () => {
  const runtime = createShellRuntime();
  const response = await runtime.worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "application/xhtml+xml, TEXT/HTML; q=0.9" },
    }),
    runtime.env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("content-disposition"), null);
  assert.equal(response.headers.get("etag"), null);
  assert.equal(response.headers.get("last-modified"), null);
  assert.equal(response.headers.get("vary"), null);
  assert.equal(response.headers.get("cache-control"), "no-cache");
  assert.equal(Buffer.from(await response.arrayBuffer()).equals(runtime.shellBytes), true);
  assert.deepEqual(runtime.calls, [
    "GET /flow/step-two?source=share",
    `GET ${runtime.shellPath}`,
  ]);
  assert.deepEqual(runtime.requests[1], {
    accept: "application/octet-stream",
    acceptEncoding: "identity",
    pathname: runtime.shellPath,
  });
  assertSecurityHeaders(response);
});

test("serves the verified shell at root even when Accept is */*", async () => {
  const runtime = createShellRuntime();
  const response = await runtime.worker.fetch(
    new Request("https://example.test/?native=1", {
      headers: { accept: "*/*" },
    }),
    runtime.env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(await response.text(), runtime.shellBytes.toString("utf8"));
  assert.deepEqual(runtime.calls, ["GET /?native=1", `GET ${runtime.shellPath}`]);
  assertSecurityHeaders(response);
});

test("serves the verified shell at exact /index.html even when Accept is */*", async () => {
  const runtime = createShellRuntime();
  const response = await runtime.worker.fetch(
    new Request("https://example.test/index.html", {
      headers: { accept: "*/*" },
    }),
    runtime.env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-cache");
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(await response.text(), runtime.shellBytes.toString("utf8"));
  assert.deepEqual(runtime.calls, ["GET /index.html", `GET ${runtime.shellPath}`]);
  assertSecurityHeaders(response);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/api/missing", { headers: { accept: "text/html" } }),
    new Request("https://example.test/api", { headers: { accept: "text/html" } }),
    new Request("https://example.test/auth/session", { headers: { accept: "text/html" } }),
    new Request("https://example.test/auth", { headers: { accept: "text/html" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
    assertSecurityHeaders(response);
  }
});

test("leaves unknown JSON and static asset requests as 404", async () => {
  for (const request of [
    new Request("https://example.test/missing.json", {
      headers: { accept: "application/json" },
    }),
    new Request("https://example.test/missing.json", {
      headers: { accept: "text/html" },
    }),
    new Request("https://example.test/assets/missing.js", {
      headers: { accept: "*/*" },
    }),
    new Request("https://example.test/assets/missing", {
      headers: { accept: "text/html" },
    }),
    new Request("https://example.test/missing%2Ejson", {
      headers: { accept: "text/html" },
    }),
  ]) {
    const runtime = createShellRuntime();
    const response = await runtime.worker.fetch(request, runtime.env);
    assert.equal(response.status, 404);
    assert.equal(runtime.calls.length, 1);
    assertSecurityHeaders(response);
  }
});

test("fails closed when the opaque shell is missing, mismatched, or unconfigured", async () => {
  const runtime = createShellRuntime();
  const missingResponse = await runtime.worker.fetch(
    new Request("https://example.test/", { headers: { accept: "*/*" } }),
    { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } },
  );
  assert.equal(missingResponse.status, 503);
  assert.equal(missingResponse.headers.get("cache-control"), "no-store");
  assertSecurityHeaders(missingResponse);

  const mismatchedWorker = createSitesWorker({
    appShellPath: runtime.shellPath,
    appShellSha256: runtime.shellSha256,
  });
  const mismatchedResponse = await mismatchedWorker.fetch(
    new Request("https://example.test/", { headers: { accept: "*/*" } }),
    {
      ASSETS: {
        fetch: async (request) => new Response(
          new URL(request.url).pathname === runtime.shellPath ? "tampered" : "missing",
          {
            status: new URL(request.url).pathname === runtime.shellPath ? 200 : 404,
            headers: { "Content-Type": "application/octet-stream" },
          },
        ),
      },
    },
  );
  assert.equal(mismatchedResponse.status, 503);
  assertSecurityHeaders(mismatchedResponse);

  const compressedResponse = await runtime.worker.fetch(
    new Request("https://example.test/", { headers: { accept: "*/*" } }),
    {
      ASSETS: {
        fetch: async (request) => new Response(
          new URL(request.url).pathname === runtime.shellPath
            ? runtime.opaqueShellBytes
            : "missing",
          {
            status: new URL(request.url).pathname === runtime.shellPath ? 200 : 404,
            headers: { "Content-Encoding": "gzip" },
          },
        ),
      },
    },
  );
  assert.equal(compressedResponse.status, 503);
  assertSecurityHeaders(compressedResponse);

  const unconfiguredResponse = await worker.fetch(
    new Request("https://example.test/", { headers: { accept: "*/*" } }),
    { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } },
  );
  assert.equal(unconfiguredResponse.status, 503);
  assertSecurityHeaders(unconfiguredResponse);
});

test("returns headers without a body for a root HEAD request", async () => {
  const runtime = createShellRuntime();
  const response = await runtime.worker.fetch(
    new Request("https://example.test/", {
      method: "HEAD",
      headers: { accept: "*/*" },
    }),
    runtime.env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), String(runtime.shellBytes.length));
  assert.equal((await response.arrayBuffer()).byteLength, 0);
  assert.deepEqual(runtime.calls, ["HEAD /", `GET ${runtime.shellPath}`]);
  assertSecurityHeaders(response);
});

test("does not reserve similarly named application routes", async () => {
  for (const pathname of ["/apiary", "/authentication"]) {
    const runtime = createShellRuntime();
    const response = await runtime.worker.fetch(
      new Request(`https://example.test${pathname}`, { headers: { accept: "text/html" } }),
      runtime.env,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(runtime.calls, [`GET ${pathname}`, `GET ${runtime.shellPath}`]);
    assertSecurityHeaders(response);
  }
});

test("injects one exact canonical HTTPS license origin into the production CSP", async () => {
  const root = await createSitesFixture();
  const licenseApiOrigin = "https://license.maarifos.app:8443";
  const environment = founderEnvironment(licenseApiOrigin);
  try {
    await addFounderClientBundle(root, environment);
    const result = prepareSitesBuild({
      root,
      environment,
    });
    assert.equal(result.licenseApiOrigin, licenseApiOrigin);

    const builtSource = await readFile(path.join(root, "dist", "server", "index.js"), "utf8");
    assert.match(builtSource, new RegExp(JSON.stringify(licenseApiOrigin)));
    assert.doesNotMatch(builtSource, /@maarifos-sites-build:premium-license-api-origin/);
    assert.equal(countOccurrences(builtSource, licenseApiOrigin), 1);

    const staticHeaders = await readFile(path.join(root, "dist", "client", "_headers"), "utf8");
    assertStaticHeadersFile(staticHeaders, licenseApiOrigin);
    assert.equal(staticHeaders.includes("founder-pin-hmac-secret"), false);
    assert.equal(staticHeaders.includes("entitlement-private-key"), false);

    const builtWorker = await importBuiltWorker(root);
    assert.equal(
      builtWorker.SECURITY_HEADERS["Content-Security-Policy"],
      createSecurityHeaders(licenseApiOrigin)["Content-Security-Policy"],
    );
    const response = await builtWorker.default.fetch(
      new Request(
        "https://app.example.test/?premiumLicenseApiOrigin=https://attacker.example",
      ),
      {
        ...staticAssetEnvironment(),
        PREMIUM_LICENSE_API_ORIGIN: "https://attacker.example",
      },
    );
    assertSecurityHeaders(response, licenseApiOrigin);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps production CSP limited to self and the official TYMM PDF paths without licensing", async () => {
  const root = await createSitesFixture();
  try {
    const result = prepareSitesBuild({ root, environment: {} });
    assert.equal(result.licenseApiOrigin, null);
    assert.equal(result.founderEnabled, false);
    await assert.rejects(
      access(path.join(root, "dist", ".openai", FOUNDER_BUILD_ATTESTATION)),
      { code: "ENOENT" },
    );
    const builtWorker = await importBuiltWorker(root);
    const staticHeaders = await readFile(path.join(root, "dist", "client", "_headers"), "utf8");
    assertStaticHeadersFile(staticHeaders);
    const response = await builtWorker.default.fetch(
      new Request("https://app.example.test/"),
      staticAssetEnvironment(),
    );
    assertSecurityHeaders(response);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("enforces all-or-none founder fields and rejects public Vite secret names", () => {
  assert.equal(validateProductionFounderEnvironment({}, { requireFounder: false }), null);
  assert.throws(
    () => validateProductionFounderEnvironment({
      [PREMIUM_LICENSE_API_ORIGIN_ENV]: "https://license.maarifos.app",
    }),
    /all-or-none/,
  );
  assert.throws(
    () => validateProductionFounderEnvironment({
      ...founderEnvironment(),
      VITE_FOUNDER_PIN: "000000",
    }),
    /forbidden secret-bearing name/,
  );
  assert.throws(
    () => validateProductionFounderEnvironment({}, { requireFounder: true }),
    /requires all four/,
  );
});

test("accepts only the production issuer, audience, kid, and exact public P-256 JWK", () => {
  const valid = founderEnvironment();
  assert.doesNotThrow(() =>
    validateProductionFounderEnvironment(valid, { requireFounder: true }));

  const cases = [
    {
      environment: { ...valid, [PREMIUM_LICENSE_ISSUER_ENV]: "https://issuer.maarifos.app" },
      message: /issuer must exactly equal/,
    },
    {
      environment: { ...valid, [PREMIUM_LICENSE_AUDIENCE_ENV]: "maarifos-local" },
      message: /audience must exactly equal/,
    },
    {
      environment: { ...valid, [PREMIUM_LICENSE_TRUSTED_KEYS_ENV]: "{" },
      message: /valid bounded JSON/,
    },
    {
      environment: {
        ...valid,
        [PREMIUM_LICENSE_TRUSTED_KEYS_ENV]: JSON.stringify({
          [PRODUCTION_FOUNDER_KEY_ID]: PRODUCTION_PUBLIC_JWK,
          "founder-es256-local": PRODUCTION_PUBLIC_JWK,
        }),
      },
      message: /only the documented fields/,
    },
    {
      environment: {
        ...valid,
        [PREMIUM_LICENSE_TRUSTED_KEYS_ENV]: JSON.stringify({
          [PRODUCTION_FOUNDER_KEY_ID]: { ...PRODUCTION_PUBLIC_JWK, d: "private-material" },
        }),
      },
      message: /only the documented fields|exact public P-256/,
    },
    {
      environment: {
        ...valid,
        [PREMIUM_LICENSE_TRUSTED_KEYS_ENV]: JSON.stringify({
          [PRODUCTION_FOUNDER_KEY_ID]: { ...PRODUCTION_PUBLIC_JWK, use: "sig" },
        }),
      },
      message: /only the documented fields/,
    },
  ];
  for (const { environment, message } of cases) {
    assert.throws(
      () => validateProductionFounderEnvironment(environment, { requireFounder: true }),
      message,
    );
  }
  assert.throws(
    () => parseFounderProductionProfile(
      `${founderProfileSource(valid)}VITE_UNDOCUMENTED_PUBLIC_FIELD=value\n`,
    ),
    /only the four public premium fields/,
  );
  assert.throws(
    () => parseFounderProductionProfile(
      `${founderProfileSource(valid)}${PREMIUM_LICENSE_AUDIENCE_ENV}=maarifos-pwa\n`,
    ),
    /duplicate field/,
  );
});

test("founder mode preflight and build bind the tracked profile to a value-free attestation", async () => {
  const root = await createSitesFixture();
  const environment = founderEnvironment();
  try {
    await Promise.all([
      writeFile(
        path.join(root, FOUNDER_PRODUCTION_PROFILE),
        founderProfileSource(environment),
      ),
      addFounderClientBundle(root, environment),
    ]);
    const preflight = preflightSitesBuild({
      root,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    assert.deepEqual(preflight, {
      founderEnabled: true,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    const result = prepareSitesBuild({
      root,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    assert.equal(result.founderEnabled, true);
    const attestationPath = path.join(root, "dist", ".openai", FOUNDER_BUILD_ATTESTATION);
    const firstAttestation = await readFile(attestationPath, "utf8");
    const parsed = JSON.parse(firstAttestation);
    assert.deepEqual(Object.keys(parsed).sort(), [
      "clientTreeSha256",
      "configurationSha256",
      "profileSha256",
      "schemaVersion",
    ]);
    assert.equal(parsed.schemaVersion, 1);
    for (const digest of [
      parsed.clientTreeSha256,
      parsed.configurationSha256,
      parsed.profileSha256,
    ]) {
      assert.match(digest, /^[a-f0-9]{64}$/u);
    }
    for (const publicValue of [
      environment[PREMIUM_LICENSE_API_ORIGIN_ENV],
      environment[PREMIUM_LICENSE_AUDIENCE_ENV],
      PRODUCTION_FOUNDER_KEY_ID,
      PRODUCTION_PUBLIC_JWK.x,
      PRODUCTION_PUBLIC_JWK.y,
    ]) {
      assert.equal(firstAttestation.includes(publicValue), false);
    }

    prepareSitesBuild({
      root,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    assert.equal(await readFile(attestationPath, "utf8"), firstAttestation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("founder preflight rejects profile drift and removes stale deployment outputs", async () => {
  const root = await createSitesFixture();
  const environment = founderEnvironment();
  const staleOutputs = [
    path.join(root, "dist", "server", "index.js"),
    path.join(root, "dist", "client", "_headers"),
    path.join(root, "dist", ".openai", "hosting.json"),
    path.join(root, "dist", ".openai", FOUNDER_BUILD_ATTESTATION),
  ];
  try {
    await writeFile(
      path.join(root, FOUNDER_PRODUCTION_PROFILE),
      founderProfileSource(environment),
    );
    await Promise.all(staleOutputs.map(async (output) => {
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, "stale");
    }));
    assert.throws(
      () => preflightSitesBuild({
        root,
        environment: founderEnvironment("https://drift.maarifos.app"),
        mode: FOUNDER_PRODUCTION_MODE,
      }),
      /drifted/,
    );
    for (const output of staleOutputs) {
      await assert.rejects(access(output), { code: "ENOENT" });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("loads the same production Vite env used by the client build", async () => {
  const root = await createSitesFixture();
  const licenseApiOrigin = "https://license-env.maarifos.app";
  const environment = founderEnvironment(licenseApiOrigin);
  const inheritedEnvironment = Object.fromEntries(
    [
      PREMIUM_LICENSE_API_ORIGIN_ENV,
      PREMIUM_LICENSE_ISSUER_ENV,
      PREMIUM_LICENSE_AUDIENCE_ENV,
      PREMIUM_LICENSE_TRUSTED_KEYS_ENV,
    ].map((name) => [name, process.env[name]]),
  );
  try {
    for (const name of Object.keys(inheritedEnvironment)) delete process.env[name];
    await writeFile(
      path.join(root, ".env.production"),
      founderProfileSource(environment),
    );
    await addFounderClientBundle(root, environment);
    const result = prepareSitesBuild({ root });
    assert.equal(result.licenseApiOrigin, licenseApiOrigin);
    const builtWorker = await importBuiltWorker(root);
    const staticHeaders = await readFile(path.join(root, "dist", "client", "_headers"), "utf8");
    assertStaticHeadersFile(staticHeaders, licenseApiOrigin);
    const response = await builtWorker.default.fetch(
      new Request("https://app.example.test/"),
      staticAssetEnvironment(),
    );
    assertSecurityHeaders(response, licenseApiOrigin);
  } finally {
    for (const [name, value] of Object.entries(inheritedEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid license origins and removes any stale deployable Worker", async () => {
  const invalidOrigins = [
    "",
    "http://license.example.test",
    "http://127.0.0.1:8787",
    "https://localhost:8787",
    "https://10.0.0.1",
    "https://license.example.test",
    "https://license.example.test/",
    "https://license.example.test/path",
    "https://license.example.test?tenant=founder",
    "https://license.example.test#fragment",
    "https://user:password@license.example.test",
    "https://*.example.test",
    "HTTPS://license.example.test",
  ];

  for (const invalidOrigin of invalidOrigins) {
    assert.throws(
      () => validateProductionLicenseApiOrigin(invalidOrigin),
      /exact HTTPS origin|canonical public HTTPS origin/,
    );
  }

  const root = await createSitesFixture();
  const staleWorker = path.join(root, "dist", "server", "index.js");
  const staleHeaders = path.join(root, "dist", "client", "_headers");
  const staleHosting = path.join(root, "dist", ".openai", "hosting.json");
  const staleAttestation = path.join(
    root,
    "dist",
    ".openai",
    FOUNDER_BUILD_ATTESTATION,
  );
  try {
    await mkdir(path.dirname(staleWorker), { recursive: true });
    await mkdir(path.dirname(staleHosting), { recursive: true });
    await writeFile(staleWorker, "stale-worker");
    await writeFile(staleHeaders, "stale-headers");
    await writeFile(staleHosting, "stale-hosting");
    await writeFile(staleAttestation, "stale-attestation");
    assert.throws(
      () => prepareSitesBuild({
        root,
        environment: founderEnvironment("https://license.example.test/path"),
      }),
      /canonical public HTTPS origin/,
    );
    await assert.rejects(access(staleWorker), { code: "ENOENT" });
    await assert.rejects(access(staleHeaders), { code: "ENOENT" });
    await assert.rejects(access(staleHosting), { code: "ENOENT" });
    await assert.rejects(access(staleAttestation), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stages a deterministic opaque shell without changing the source dist", async () => {
  const root = await createSitesFixture();
  const stageOne = `${root}-stage-one`;
  const stageTwo = `${root}-stage-two`;
  try {
    const licenseApiOrigin = "https://license.maarifos.app";
    const environment = founderEnvironment(licenseApiOrigin);
    await addFounderClientBundle(root, environment);
    await writeFile(
      path.join(root, "dist", "client", "assets", "app.js"),
      "console.log('app')",
      { flag: "wx" },
    );
    prepareSitesBuild({
      root,
      environment,
    });

    const sourceIndexPath = path.join(root, "dist", "client", "index.html");
    const sourceIndexBytes = await readFile(sourceIndexPath);
    const expectedOpaqueShellBytes = Buffer.from(sourceIndexBytes.toString("base64"), "ascii");
    const sourceSnapshot = await snapshotTree(path.join(root, "dist"));
    const resultOne = stageSitesPackage({ root, destination: stageOne });
    const resultTwo = stageSitesPackage({ root, destination: stageTwo });

    assert.equal(resultOne.shellSha256, sha256Bytes(expectedOpaqueShellBytes));
    assert.equal(resultOne.shellPath, `/assets/maarifos-shell-${resultOne.shellSha256}.bin`);
    assert.deepEqual(resultTwo, {
      destination: path.resolve(stageTwo),
      shellPath: resultOne.shellPath,
      shellSha256: resultOne.shellSha256,
    });
    assert.equal(path.extname(resultOne.shellPath), ".bin");
    assert.equal(resultOne.shellPath.endsWith(".html"), false);
    assert.equal((await readFile(sourceIndexPath)).equals(sourceIndexBytes), true);
    assert.deepEqual(await snapshotTree(path.join(root, "dist")), sourceSnapshot);
    assert.deepEqual(await snapshotTree(stageOne), await snapshotTree(stageTwo));

    const stagedIndex = path.join(stageOne, "dist", "client", "index.html");
    const stagedShell = path.join(stageOne, "dist", "client", resultOne.shellPath.slice(1));
    await assert.rejects(access(stagedIndex), { code: "ENOENT" });
    await assert.rejects(
      access(path.join(root, "dist", "client", resultOne.shellPath.slice(1))),
      { code: "ENOENT" },
    );
    const stagedShellBytes = await readFile(stagedShell);
    assert.equal(stagedShellBytes.equals(expectedOpaqueShellBytes), true);
    assert.equal(stagedShellBytes.includes(Buffer.from("<")), false);
    assert.equal(stagedShellBytes.equals(sourceIndexBytes), false);
    await access(path.join(stageOne, "dist", "server", "index.js"));
    await access(path.join(stageOne, "dist", ".openai", "hosting.json"));
    await access(path.join(stageOne, ".openai", "hosting.json"));

    const stagedWorker = await importStandaloneWorker(
      path.join(stageOne, "dist", "server", "index.js"),
    );
    assert.equal(stagedWorker.SITES_APP_SHELL_PATH, resultOne.shellPath);
    assert.equal(stagedWorker.SITES_APP_SHELL_SHA256, resultOne.shellSha256);
    assertSecurityHeaders(
      new Response(null, { headers: stagedWorker.SECURITY_HEADERS }),
      licenseApiOrigin,
    );

    const calls = [];
    const stagedEnvironment = {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(`${request.method} ${url.pathname}${url.search}`);
          if (url.pathname === resultOne.shellPath) {
            return new Response(stagedShellBytes, {
              status: 200,
              headers: {
                "Content-Disposition": "attachment; filename=shell.bin",
                "Content-Type": "application/octet-stream",
              },
            });
          }
          return new Response("missing", { status: 404 });
        },
      },
    };

    for (const [request, expectedCalls] of [
      [
        new Request("https://app.example.test/", { headers: { accept: "*/*" } }),
        ["GET /", `GET ${resultOne.shellPath}`],
      ],
      [
        new Request("https://app.example.test/classroom?native=1", {
          headers: { accept: "text/html" },
        }),
        ["GET /classroom?native=1", `GET ${resultOne.shellPath}`],
      ],
      [
        new Request("https://app.example.test/plans?native=1", {
          headers: { accept: "text/html" },
        }),
        ["GET /plans?native=1", `GET ${resultOne.shellPath}`],
      ],
      [
        new Request("https://app.example.test/documents?native=1", {
          headers: { accept: "text/html" },
        }),
        ["GET /documents?native=1", `GET ${resultOne.shellPath}`],
      ],
      [
        new Request("https://app.example.test/index.html", {
          headers: { accept: "*/*" },
        }),
        ["GET /index.html", `GET ${resultOne.shellPath}`],
      ],
      [
        new Request("https://app.example.test/", {
          method: "HEAD",
          headers: { accept: "*/*" },
        }),
        ["HEAD /", `GET ${resultOne.shellPath}`],
      ],
    ]) {
      calls.length = 0;
      const response = await stagedWorker.default.fetch(request, stagedEnvironment);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
      assert.equal(response.headers.get("content-disposition"), null);
      assert.deepEqual(calls, expectedCalls);
      assertSecurityHeaders(response, licenseApiOrigin);
    }

    for (const pathname of [
      "/api",
      "/api/missing",
      "/api%2Fmissing",
      "/auth",
      "/auth/session",
    ]) {
      calls.length = 0;
      const response = await stagedWorker.default.fetch(
        new Request(`https://app.example.test${pathname}`, {
          headers: { accept: "text/html" },
        }),
        stagedEnvironment,
      );
      assert.equal(response.status, 404);
      assert.deepEqual(calls, [`GET ${pathname}`]);
      assertSecurityHeaders(response, licenseApiOrigin);
    }

    const missingShellResponse = await stagedWorker.default.fetch(
      new Request("https://app.example.test/", { headers: { accept: "*/*" } }),
      { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } },
    );
    assert.equal(missingShellResponse.status, 503);
    assertSecurityHeaders(missingShellResponse, licenseApiOrigin);

    const mismatchedShellResponse = await stagedWorker.default.fetch(
      new Request("https://app.example.test/", { headers: { accept: "*/*" } }),
      {
        ASSETS: {
          fetch: async (request) => new Response(
            new URL(request.url).pathname === resultOne.shellPath
              ? Buffer.from("dGFtcGVyZWQ=", "ascii")
              : "missing",
            { status: new URL(request.url).pathname === resultOne.shellPath ? 200 : 404 },
          ),
        },
      },
    );
    assert.equal(mismatchedShellResponse.status, 503);
    assertSecurityHeaders(mismatchedShellResponse, licenseApiOrigin);
  } finally {
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(stageOne, { recursive: true, force: true }),
      rm(stageTwo, { recursive: true, force: true }),
    ]);
  }
});

test("requires and revalidates founder attestation for the live Sites target", async () => {
  const missingRoot = await createSitesFixture({
    projectId: MAARIFOS_LIVE_SITES_PROJECT_ID,
  });
  const missingStage = `${missingRoot}-stage`;
  const liveRoot = await createSitesFixture({
    projectId: MAARIFOS_LIVE_SITES_PROJECT_ID,
  });
  const validStage = `${liveRoot}-valid-stage`;
  const clientTamperStage = `${liveRoot}-client-tamper-stage`;
  const attestationTamperStage = `${liveRoot}-attestation-tamper-stage`;
  const driftStage = `${liveRoot}-drift-stage`;
  const environment = founderEnvironment();
  try {
    prepareSitesBuild({ root: missingRoot, environment: {} });
    assert.throws(
      () => stageSitesPackage({ root: missingRoot, destination: missingStage }),
      /requires a founder build attestation/,
    );
    await assert.rejects(access(missingStage), { code: "ENOENT" });

    await Promise.all([
      writeFile(
        path.join(liveRoot, FOUNDER_PRODUCTION_PROFILE),
        founderProfileSource(environment),
      ),
      addFounderClientBundle(liveRoot, environment),
    ]);
    prepareSitesBuild({
      root: liveRoot,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    assert.doesNotThrow(() =>
      stageSitesPackage({ root: liveRoot, destination: validStage }));

    await writeFile(
      path.join(liveRoot, "dist", "client", "assets", "founder.js"),
      "tampered-client",
    );
    assert.throws(
      () => stageSitesPackage({ root: liveRoot, destination: clientTamperStage }),
      /does not match the current client tree/,
    );
    await assert.rejects(access(clientTamperStage), { code: "ENOENT" });

    await addFounderClientBundle(liveRoot, environment);
    prepareSitesBuild({
      root: liveRoot,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    const attestationPath = path.join(
      liveRoot,
      "dist",
      ".openai",
      FOUNDER_BUILD_ATTESTATION,
    );
    const attestation = JSON.parse(await readFile(attestationPath, "utf8"));
    attestation.configurationSha256 = "0".repeat(64);
    await writeFile(attestationPath, `${JSON.stringify(attestation)}\n`);
    assert.throws(
      () => stageSitesPackage({ root: liveRoot, destination: attestationTamperStage }),
      /drifted from the tracked production profile/,
    );
    await assert.rejects(access(attestationTamperStage), { code: "ENOENT" });

    prepareSitesBuild({
      root: liveRoot,
      environment,
      mode: FOUNDER_PRODUCTION_MODE,
    });
    await writeFile(
      path.join(liveRoot, FOUNDER_PRODUCTION_PROFILE),
      founderProfileSource(founderEnvironment("https://drift.maarifos.app")),
    );
    assert.throws(
      () => stageSitesPackage({ root: liveRoot, destination: driftStage }),
      /drifted from the tracked production profile/,
    );
    await assert.rejects(access(driftStage), { code: "ENOENT" });
  } finally {
    await Promise.all([
      rm(missingRoot, { recursive: true, force: true }),
      rm(missingStage, { recursive: true, force: true }),
      rm(liveRoot, { recursive: true, force: true }),
      rm(validStage, { recursive: true, force: true }),
      rm(clientTamperStage, { recursive: true, force: true }),
      rm(attestationTamperStage, { recursive: true, force: true }),
      rm(driftStage, { recursive: true, force: true }),
    ]);
  }
});

test("keeps non-live Sites projects compatible with self-only staging", async () => {
  const root = await createSitesFixture({ projectId: "appgprj_non_live_fixture" });
  const destination = `${root}-stage`;
  try {
    prepareSitesBuild({ root, environment: {} });
    assert.doesNotThrow(() => stageSitesPackage({ root, destination }));
    await access(path.join(destination, "dist", "server", "index.js"));
  } finally {
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(destination, { recursive: true, force: true }),
    ]);
  }
});

test("staging fails closed on secret-bearing files and mismatched hosting metadata", async () => {
  const secretRoot = await createSitesFixture();
  const secretStage = `${secretRoot}-stage`;
  const mismatchRoot = await createSitesFixture();
  const mismatchStage = `${mismatchRoot}-stage`;
  try {
    prepareSitesBuild({ root: secretRoot, environment: {} });
    await writeFile(path.join(secretRoot, "dist", "client", ".env.production"), "blocked");
    assert.throws(
      () => stageSitesPackage({ root: secretRoot, destination: secretStage }),
      /forbidden secret-bearing path/,
    );
    await assert.rejects(access(secretStage), { code: "ENOENT" });
    await rm(path.join(secretRoot, "dist", "client", ".env.production"), { force: true });
    await writeFile(
      path.join(secretRoot, "dist", "client", "unsafe.js"),
      "const material = '-----BEGIN PRIVATE KEY-----';",
    );
    assert.throws(
      () => stageSitesPackage({ root: secretRoot, destination: secretStage }),
      /forbidden secret marker/,
    );
    await assert.rejects(access(secretStage), { code: "ENOENT" });

    prepareSitesBuild({ root: mismatchRoot, environment: {} });
    const inProjectStage = path.join(mismatchRoot, "package-stage");
    assert.throws(
      () => stageSitesPackage({ root: mismatchRoot, destination: inProjectStage }),
      /outside the source project/,
    );
    await assert.rejects(access(inProjectStage), { code: "ENOENT" });
    await writeFile(
      path.join(mismatchRoot, "dist", ".openai", "hosting.json"),
      "{\"project_id\":\"different\"}",
    );
    assert.throws(
      () => stageSitesPackage({ root: mismatchRoot, destination: mismatchStage }),
      /must match exactly/,
    );
    await assert.rejects(access(mismatchStage), { code: "ENOENT" });

    assert.throws(
      () => assertNoDeploymentSecrets(path.join(secretRoot, "dist")),
      /forbidden secret marker/,
    );

    for (const secretName of [
      "founder_pin_hmac_key",
      "founder_pin_hmac_digest",
      "rate_limit_hmac_key",
      "entitlement_private_jwk",
    ]) {
      await writeFile(
        path.join(mismatchRoot, "dist", "client", "unsafe.js"),
        `const forbiddenName = ${JSON.stringify(secretName)};`,
      );
      assert.throws(
        () => assertNoDeploymentSecrets(path.join(mismatchRoot, "dist")),
        /forbidden secret marker/,
      );
    }
  } finally {
    await Promise.all([
      rm(secretRoot, { recursive: true, force: true }),
      rm(secretStage, { recursive: true, force: true }),
      rm(mismatchRoot, { recursive: true, force: true }),
      rm(mismatchStage, { recursive: true, force: true }),
    ]);
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/client/_headers", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
