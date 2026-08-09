import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  PREMIUM_LICENSE_API_ORIGIN_ENV,
  prepareSitesBuild,
  renderStaticAssetHeadersFile,
  validateProductionLicenseApiOrigin,
} from "../scripts/prepare-sites-build.mjs";
import worker, {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  createSecurityHeaders,
} from "../worker/index.js";

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
    assert.equal(source.includes("https://"), false);
  } else {
    assert.equal(countOccurrences(source, licenseApiOrigin), 1);
  }
};

const createSitesFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "maarifos-sites-build-"));
  await Promise.all([
    mkdir(path.join(root, "dist", "client"), { recursive: true }),
    mkdir(path.join(root, "worker"), { recursive: true }),
    mkdir(path.join(root, ".openai"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" })),
    writeFile(path.join(root, "dist", "client", "index.html"), "<!doctype html>"),
    writeFile(
      path.join(root, "worker", "index.js"),
      await readFile(new URL("../worker/index.js", import.meta.url), "utf8"),
    ),
    writeFile(path.join(root, ".openai", "hosting.json"), "{\"project_id\":\"test\"}"),
  ]);
  return root;
};

const importBuiltWorker = async (root) => {
  const workerUrl = pathToFileURL(path.join(root, "dist", "server", "index.js"));
  workerUrl.searchParams.set("case", crypto.randomUUID());
  return import(workerUrl.href);
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

test("falls back to the canonical root asset for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          if (url.pathname === "/") return new Response("app", { status: 200 });
          if (url.pathname === "/index.html") {
            return new Response(null, {
              status: 307,
              headers: { location: "/" },
            });
          }
          return new Response("missing", { status: 404 });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/"]);
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

test("does not reserve similarly named application routes", async () => {
  for (const pathname of ["/apiary", "/authentication"]) {
    const calls = [];
    const response = await worker.fetch(
      new Request(`https://example.test${pathname}`, { headers: { accept: "text/html" } }),
      {
        ASSETS: {
          fetch: async (request) => {
            const requestedPath = new URL(request.url).pathname;
            calls.push(requestedPath);
            return new Response(requestedPath === "/" ? "app" : "missing", {
              status: requestedPath === "/" ? 200 : 404,
            });
          },
        },
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [pathname, "/"]);
    assertSecurityHeaders(response);
  }
});

test("injects one exact canonical HTTPS license origin into the production CSP", async () => {
  const root = await createSitesFixture();
  const licenseApiOrigin = "https://license.maarif.example:8443";
  try {
    const result = prepareSitesBuild({
      root,
      environment: { [PREMIUM_LICENSE_API_ORIGIN_ENV]: licenseApiOrigin },
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

test("keeps production CSP self-only when the license origin is absent", async () => {
  const root = await createSitesFixture();
  try {
    const result = prepareSitesBuild({ root, environment: {} });
    assert.equal(result.licenseApiOrigin, null);
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

test("loads the same production Vite env used by the client build", async () => {
  const root = await createSitesFixture();
  const licenseApiOrigin = "https://license-env.maarif.example";
  try {
    await writeFile(
      path.join(root, ".env.production"),
      `${PREMIUM_LICENSE_API_ORIGIN_ENV}=${licenseApiOrigin}\n`,
    );
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
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid license origins and removes any stale deployable Worker", async () => {
  const invalidOrigins = [
    "",
    "http://license.example.test",
    "http://127.0.0.1:8787",
    "https://localhost:8787",
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
  try {
    await mkdir(path.dirname(staleWorker), { recursive: true });
    await mkdir(path.dirname(staleHosting), { recursive: true });
    await writeFile(staleWorker, "stale-worker");
    await writeFile(staleHeaders, "stale-headers");
    await writeFile(staleHosting, "stale-hosting");
    assert.throws(
      () => prepareSitesBuild({
        root,
        environment: {
          [PREMIUM_LICENSE_API_ORIGIN_ENV]: "https://license.example.test/path",
        },
      }),
      /canonical public HTTPS origin/,
    );
    await assert.rejects(access(staleWorker), { code: "ENOENT" });
    await assert.rejects(access(staleHeaders), { code: "ENOENT" });
    await assert.rejects(access(staleHosting), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/client/_headers", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
