#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoReservedStaticAssets } from "./prepare-sites-build.mjs";

const APP_SHELL_PATH_MARKER =
  "/* @maarifos-sites-package:app-shell-path */ null";
const APP_SHELL_SHA256_MARKER =
  "/* @maarifos-sites-package:app-shell-sha256 */ null";
const DETERMINISTIC_TIMESTAMP = new Date("2000-01-01T00:00:00.000Z");
const MAX_APP_SHELL_BYTES = 1_048_576;
const HOSTING_KEYS = new Set(["project_id", "d1", "r2"]);
const TEXT_FILE_PATTERN = /(?:^_headers$|\.(?:c?js|mjs|css|html?|json|map|txt|webmanifest|xml))$/i;
const FORBIDDEN_SECRET_TOKENS = Object.freeze([
  "founder_pin_hmac_secret",
  "founder-pin-hmac-secret",
  "entitlement_private_key",
  "entitlement-private-key",
  "-----begin private key-----",
  "-----begin rsa private key-----",
  "openai_api_key",
  "cloudflare_api_token",
]);
const FORBIDDEN_SECRET_PATH_SEGMENT = /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.secrets?|\.wrangler|private-assets?|\.git|\.npmrc|\.pypirc|\.yarnrc(?:\.yml)?)$/i;
const FORBIDDEN_SECRET_FILE_EXTENSION = /\.(?:key|pem|p12|pfx)$/i;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const isWithin = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const visitFiles = (root, visitor, relativeDirectory = "") => {
  const entries = readdirSync(path.join(root, relativeDirectory), {
    withFileTypes: true,
  }).sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error("Sites package input must not contain symbolic links.");
    }
    if (!stat.isFile() && !stat.isDirectory()) {
      throw new Error("Sites package input must contain only regular files and directories.");
    }
    visitor({ absolutePath, entry, relativePath });
    if (entry.isDirectory()) visitFiles(root, visitor, relativePath);
  }
};

export function assertNoDeploymentSecrets(root) {
  visitFiles(root, ({ absolutePath, entry, relativePath }) => {
    const pathSegments = relativePath.split(path.sep);
    if (
      pathSegments.some((segment) => FORBIDDEN_SECRET_PATH_SEGMENT.test(segment)) ||
      (!entry.isDirectory() && FORBIDDEN_SECRET_FILE_EXTENSION.test(entry.name))
    ) {
      throw new Error("Sites package input contains a forbidden secret-bearing path.");
    }

    if (!entry.isFile() || !TEXT_FILE_PATTERN.test(entry.name)) return;
    const source = readFileSync(absolutePath, "utf8").toLocaleLowerCase("en-US");
    if (FORBIDDEN_SECRET_TOKENS.some((token) => source.includes(token))) {
      throw new Error("Sites package input contains a forbidden secret marker.");
    }
  });
}

const parseHostingMetadata = (bytes) => {
  let metadata;
  try {
    metadata = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Sites hosting metadata must be valid JSON.");
  }

  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    throw new Error("Sites hosting metadata must be a JSON object.");
  }
  if (Object.keys(metadata).some((key) => !HOSTING_KEYS.has(key))) {
    throw new Error("Sites hosting metadata contains an unsupported key.");
  }
  if (
    typeof metadata.project_id !== "string" ||
    metadata.project_id.length === 0 ||
    metadata.project_id.length > 200
  ) {
    throw new Error("Sites hosting metadata must contain a valid project_id.");
  }
  return metadata;
};

const injectExactlyOnce = (source, marker, value, label) => {
  const markerCount = source.split(marker).length - 1;
  if (markerCount !== 1) {
    throw new Error(`Sites package ${label} marker must occur exactly once.`);
  }
  return source.replace(marker, JSON.stringify(value));
};

const normalizeTreeMetadata = (root) => {
  const directories = [root];
  visitFiles(root, ({ absolutePath, entry }) => {
    if (entry.isDirectory()) {
      directories.push(absolutePath);
      return;
    }
    chmodSync(absolutePath, 0o644);
    utimesSync(absolutePath, DETERMINISTIC_TIMESTAMP, DETERMINISTIC_TIMESTAMP);
  });

  for (const directory of directories.reverse()) {
    chmodSync(directory, 0o755);
    utimesSync(directory, DETERMINISTIC_TIMESTAMP, DETERMINISTIC_TIMESTAMP);
  }
};

export function stageSitesPackage({ root, destination } = {}) {
  const resolvedRoot = path.resolve(
    root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  );
  const canonicalRoot = realpathSync(resolvedRoot);
  if (typeof destination !== "string" || destination.length === 0) {
    throw new Error("A Sites package staging destination is required.");
  }
  const resolvedDestination = path.resolve(destination);
  const sourceDist = path.join(resolvedRoot, "dist");
  const sourceClient = path.join(sourceDist, "client");
  const sourceIndex = path.join(sourceClient, "index.html");
  const sourceWorker = path.join(sourceDist, "server", "index.js");
  const sourceHosting = path.join(resolvedRoot, ".openai", "hosting.json");
  const builtHosting = path.join(sourceDist, ".openai", "hosting.json");

  for (const file of [sourceIndex, sourceWorker, sourceHosting, builtHosting]) {
    if (!existsSync(file)) throw new Error("Missing Sites package input: " + file);
  }
  if (
    isWithin(resolvedRoot, resolvedDestination) ||
    isWithin(resolvedDestination, resolvedRoot) ||
    existsSync(resolvedDestination)
  ) {
    throw new Error("Sites package staging destination must be a new path outside the source project.");
  }

  assertNoReservedStaticAssets(sourceClient);
  assertNoDeploymentSecrets(sourceDist);
  const hostingBytes = readFileSync(sourceHosting);
  parseHostingMetadata(hostingBytes);
  if (!readFileSync(builtHosting).equals(hostingBytes)) {
    throw new Error("Built and source Sites hosting metadata must match exactly.");
  }

  const indexBytes = readFileSync(sourceIndex);
  if (indexBytes.length === 0 || indexBytes.length > MAX_APP_SHELL_BYTES) {
    throw new Error("Sites app shell must be non-empty and no larger than 1 MiB.");
  }
  const opaqueShellBytes = Buffer.from(indexBytes.toString("base64"), "ascii");
  const shellSha256 = sha256(opaqueShellBytes);
  const shellPath = `/assets/maarifos-shell-${shellSha256}.bin`;
  const destinationParent = path.dirname(resolvedDestination);
  mkdirSync(destinationParent, { recursive: true });
  const canonicalDestination = path.join(
    realpathSync(destinationParent),
    path.basename(resolvedDestination),
  );
  if (
    isWithin(canonicalRoot, canonicalDestination) ||
    isWithin(canonicalDestination, canonicalRoot) ||
    existsSync(canonicalDestination)
  ) {
    throw new Error("Sites package staging destination must resolve outside the source project.");
  }
  const stagingRoot = mkdtempSync(
    path.join(destinationParent, `.${path.basename(resolvedDestination)}.staging-`),
  );

  try {
    const stagedDist = path.join(stagingRoot, "dist");
    cpSync(sourceDist, stagedDist, {
      recursive: true,
      errorOnExist: true,
      force: false,
      preserveTimestamps: false,
    });

    const stagedIndex = path.join(stagedDist, "client", "index.html");
    const stagedShell = path.join(stagedDist, "client", shellPath.slice(1));
    const stagedWorker = path.join(stagedDist, "server", "index.js");
    if (existsSync(stagedShell)) {
      throw new Error("Sites package shell asset path collides with existing output.");
    }

    rmSync(stagedIndex);
    mkdirSync(path.dirname(stagedShell), { recursive: true });
    writeFileSync(stagedShell, opaqueShellBytes, { flag: "wx" });

    let workerSource = readFileSync(stagedWorker, "utf8");
    workerSource = injectExactlyOnce(
      workerSource,
      APP_SHELL_PATH_MARKER,
      shellPath,
      "app-shell path",
    );
    workerSource = injectExactlyOnce(
      workerSource,
      APP_SHELL_SHA256_MARKER,
      shellSha256,
      "app-shell SHA-256",
    );
    writeFileSync(stagedWorker, workerSource, "utf8");

    const stagedRootHosting = path.join(stagingRoot, ".openai", "hosting.json");
    mkdirSync(path.dirname(stagedRootHosting), { recursive: true });
    writeFileSync(stagedRootHosting, hostingBytes, { flag: "wx" });
    writeFileSync(path.join(stagedDist, ".openai", "hosting.json"), hostingBytes);

    assertNoDeploymentSecrets(stagingRoot);
    if (existsSync(stagedIndex) || !readFileSync(stagedShell).equals(opaqueShellBytes)) {
      throw new Error("Sites package shell transformation did not complete exactly.");
    }

    normalizeTreeMetadata(stagingRoot);
    renameSync(stagingRoot, resolvedDestination);
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }

  return Object.freeze({
    destination: resolvedDestination,
    shellPath,
    shellSha256,
  });
}

const invokedAsScript = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const result = stageSitesPackage({ destination: process.argv[2] });
  console.log(
    `Prepared deterministic Sites package staging at ${result.destination} (${result.shellPath}).`,
  );
}
