#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

export const PREMIUM_LICENSE_API_ORIGIN_ENV = "VITE_PREMIUM_LICENSE_API_ORIGIN";

const LICENSE_ORIGIN_INJECTION_MARKER =
  "/* @maarifos-sites-build:premium-license-api-origin */ null";
const LOOPBACK_HOST_PATTERN = /^(?:localhost|.*\.localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i;

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
  const hostingOutput = path.join(dist, ".openai", "hosting.json");

  // A failed or interrupted build must never leave an older CSP beside a new client bundle.
  rmSync(serverOutput, { force: true });

  const buildEnvironment = environment ?? loadEnv("production", resolvedRoot, "VITE_");
  const licenseApiOrigin = validateProductionLicenseApiOrigin(
    buildEnvironment[PREMIUM_LICENSE_API_ORIGIN_ENV],
  );

  for (const file of [index, worker, hosting]) {
    if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
  }

  const workerOutput = renderSitesWorker(readFileSync(worker, "utf8"), licenseApiOrigin);
  const hostingOutputBytes = readFileSync(hosting);
  const stagingRoot = mkdtempSync(path.join(dist, ".sites-build-"));
  const stagedWorker = path.join(stagingRoot, "server", "index.js");
  const stagedHosting = path.join(stagingRoot, ".openai", "hosting.json");

  try {
    mkdirSync(path.dirname(stagedWorker), { recursive: true });
    mkdirSync(path.dirname(stagedHosting), { recursive: true });
    writeFileSync(stagedWorker, workerOutput, { encoding: "utf8", flag: "wx" });
    writeFileSync(stagedHosting, hostingOutputBytes, { flag: "wx" });

    // Publish the executable Worker last. Its presence is the completed-build marker.
    moveStagedFile(stagedHosting, hostingOutput);
    moveStagedFile(stagedWorker, serverOutput);
  } finally {
    rmSync(stagingRoot, { force: true, recursive: true });
  }

  return Object.freeze({ licenseApiOrigin, serverOutput, hostingOutput });
}

const invokedAsScript = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const result = prepareSitesBuild();
  console.log(
    `Prepared Sites build: dist/server/index.js and dist/.openai/hosting.json (license origin: ${result.licenseApiOrigin ?? "self-only"})`,
  );
}
