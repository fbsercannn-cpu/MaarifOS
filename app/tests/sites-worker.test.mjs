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
  PREMIUM_LICENSE_API_ORIGIN_ENV,
  prepareSitesBuild,
  renderStaticAssetHeadersFile,
  validateProductionLicenseApiOrigin,
} from "../scripts/prepare-sites-build.mjs";
import {
  assertNoDeploymentSecrets,
  stageSitesPackage,
} from "../scripts/prepare-sites-package.mjs";
import worker, {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  createSitesWorker,
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
const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

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
  const inheritedLicenseApiOrigin = process.env[PREMIUM_LICENSE_API_ORIGIN_ENV];
  try {
    delete process.env[PREMIUM_LICENSE_API_ORIGIN_ENV];
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
    if (inheritedLicenseApiOrigin === undefined) {
      delete process.env[PREMIUM_LICENSE_API_ORIGIN_ENV];
    } else {
      process.env[PREMIUM_LICENSE_API_ORIGIN_ENV] = inheritedLicenseApiOrigin;
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

test("stages a deterministic opaque shell without changing the source dist", async () => {
  const root = await createSitesFixture();
  const stageOne = `${root}-stage-one`;
  const stageTwo = `${root}-stage-two`;
  try {
    const licenseApiOrigin = "https://license.maarif.example";
    await mkdir(path.join(root, "dist", "client", "assets"), { recursive: true });
    await writeFile(
      path.join(root, "dist", "client", "assets", "app.js"),
      "console.log('app')",
      { flag: "wx" },
    );
    prepareSitesBuild({
      root,
      environment: { [PREMIUM_LICENSE_API_ORIGIN_ENV]: licenseApiOrigin },
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
