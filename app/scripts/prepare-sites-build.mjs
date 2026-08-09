#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { createSecurityHeaders } from "../worker/index.js";

export const PREMIUM_LICENSE_API_ORIGIN_ENV = "VITE_PREMIUM_LICENSE_API_ORIGIN";

const LICENSE_ORIGIN_INJECTION_MARKER =
  "/* @maarifos-sites-build:premium-license-api-origin */ null";
const LOOPBACK_HOST_PATTERN = /^(?:localhost|.*\.localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i;
const CLOUDFLARE_HEADERS_LINE_LIMIT = 2_000;
const RESERVED_NETWORK_SEGMENTS = new Set(["api", "auth"]);

export function validateProductionLicenseApiOrigin(value) {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > 300) {
    throw new Error(`${PREMIUM_LICENSE_API_ORIGIN_ENV} must be absent or an exact HTTPS origin.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${PREMIUM_LICENSE_API_ORIGIN_ENV} must be absent or an exact HTTPS origin.`);
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hostname.includes("*") ||
    LOOPBACK_HOST_PATTERN.test(url.hostname)
  ) {
    throw new Error(
      `${PREMIUM_LICENSE_API_ORIGIN_ENV} must be a canonical public HTTPS origin without credentials, path, query, fragment, or wildcard.`,
    );
  }

  return url.origin;
}

export function renderSitesWorker(workerSource, licenseApiOrigin) {
  const markerCount = workerSource.split(LICENSE_ORIGIN_INJECTION_MARKER).length - 1;
  if (markerCount !== 1) {
    throw new Error("Sites Worker license-origin build marker must occur exactly once.");
  }
  const injectedValue = licenseApiOrigin === null
    ? "null"
    : JSON.stringify(licenseApiOrigin);
  return workerSource.replace(LICENSE_ORIGIN_INJECTION_MARKER, injectedValue);
}

export function renderStaticAssetHeadersFile(securityHeaders) {
  if (
    typeof securityHeaders !== "object" ||
    securityHeaders === null ||
    Array.isArray(securityHeaders)
  ) {
    throw new Error("Sites static security headers must be a record.");
  }

  const headerLines = Object.entries(securityHeaders).map(([name, value]) => {
    if (!/^[A-Za-z0-9-]+$/.test(name) || typeof value !== "string" || value.length === 0) {
      throw new Error("Sites static security headers must use non-empty single-line names and values.");
    }
    if (/\r|\n/.test(value)) {
      throw new Error("Sites static security headers must use non-empty single-line names and values.");
    }
    const headerLine = `  ${name}: ${value}`;
    if (headerLine.length > CLOUDFLARE_HEADERS_LINE_LIMIT) {
      throw new Error("Sites static security header lines must not exceed 2,000 characters.");
    }
    return headerLine;
  });

  if (headerLines.length === 0) {
    throw new Error("Sites static security headers must not be empty.");
  }

  return ["/*", ...headerLines, ""].join("\n");
}

const isReservedStaticRoute = (relativePath) => {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const [topLevelSegment] = normalizedPath.split("/");
  if (RESERVED_NETWORK_SEGMENTS.has(topLevelSegment)) return true;

  if (!normalizedPath.includes("/") && topLevelSegment.endsWith(".html")) {
    return RESERVED_NETWORK_SEGMENTS.has(topLevelSegment.slice(0, -".html".length));
  }

  return false;
};

export function assertNoReservedStaticAssets(clientRoot) {
  const violations = [];
  const visit = (directory, relativeDirectory = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (isReservedStaticRoute(relativePath)) violations.push(relativePath);
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relativePath);
    }
  };

  visit(clientRoot);
  if (violations.length > 0) {
    throw new Error(
      "Sites client output must not contain static assets under reserved /api or /auth routes.",
    );
  }
}

const moveStagedFile = (source, destination) => {
  mkdirSync(path.dirname(destination), { recursive: true });
  rmSync(destination, { force: true });
  renameSync(source, destination);
};

export function prepareSitesBuild({
  root,
  environment,
} = {}) {
  const resolvedRoot = root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dist = path.join(resolvedRoot, "dist");
  const index = path.join(dist, "client", "index.html");
  const worker = path.join(resolvedRoot, "worker", "index.js");
  const hosting = path.join(resolvedRoot, ".openai", "hosting.json");
  const serverOutput = path.join(dist, "server", "index.js");
  const headersOutput = path.join(dist, "client", "_headers");
  const hostingOutput = path.join(dist, ".openai", "hosting.json");

  // A failed or interrupted build must never leave older deployment metadata or
  // security policy beside a new client bundle.
  for (const output of [serverOutput, headersOutput, hostingOutput]) {
    rmSync(output, { force: true });
  }

  const buildEnvironment = environment ?? loadEnv("production", resolvedRoot, "VITE_");
  const licenseApiOrigin = validateProductionLicenseApiOrigin(
    buildEnvironment[PREMIUM_LICENSE_API_ORIGIN_ENV],
  );

  for (const file of [index, worker, hosting]) {
    if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
  }
  assertNoReservedStaticAssets(path.dirname(index));

  const workerOutput = renderSitesWorker(readFileSync(worker, "utf8"), licenseApiOrigin);
  const headersOutputBytes = renderStaticAssetHeadersFile(
    createSecurityHeaders(licenseApiOrigin),
  );
  const hostingOutputBytes = readFileSync(hosting);
  const stagingRoot = mkdtempSync(path.join(dist, ".sites-build-"));
  const stagedWorker = path.join(stagingRoot, "server", "index.js");
  const stagedHeaders = path.join(stagingRoot, "client", "_headers");
  const stagedHosting = path.join(stagingRoot, ".openai", "hosting.json");

  try {
    mkdirSync(path.dirname(stagedWorker), { recursive: true });
    mkdirSync(path.dirname(stagedHeaders), { recursive: true });
    mkdirSync(path.dirname(stagedHosting), { recursive: true });
    writeFileSync(stagedWorker, workerOutput, { encoding: "utf8", flag: "wx" });
    writeFileSync(stagedHeaders, headersOutputBytes, { encoding: "utf8", flag: "wx" });
    writeFileSync(stagedHosting, hostingOutputBytes, { flag: "wx" });

    // Publish the executable Worker last. Its presence is the completed-build marker.
    moveStagedFile(stagedHosting, hostingOutput);
    moveStagedFile(stagedHeaders, headersOutput);
    moveStagedFile(stagedWorker, serverOutput);
  } finally {
    rmSync(stagingRoot, { force: true, recursive: true });
  }

  return Object.freeze({ licenseApiOrigin, serverOutput, headersOutput, hostingOutput });
}

const invokedAsScript = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const result = prepareSitesBuild();
  console.log(
    `Prepared Sites build: dist/client/_headers, dist/server/index.js, and dist/.openai/hosting.json (license origin: ${result.licenseApiOrigin ?? "self-only"})`,
  );
}
