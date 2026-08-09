#!/usr/bin/env node
import { createHash, createPublicKey } from "node:crypto";
import {
  existsSync,
  lstatSync,
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
export const PREMIUM_LICENSE_ISSUER_ENV = "VITE_PREMIUM_LICENSE_ISSUER";
export const PREMIUM_LICENSE_AUDIENCE_ENV = "VITE_PREMIUM_LICENSE_AUDIENCE";
export const PREMIUM_LICENSE_TRUSTED_KEYS_ENV =
  "VITE_PREMIUM_LICENSE_TRUSTED_KEYS_JSON";
export const PREMIUM_LICENSE_ENV_NAMES = Object.freeze([
  PREMIUM_LICENSE_API_ORIGIN_ENV,
  PREMIUM_LICENSE_ISSUER_ENV,
  PREMIUM_LICENSE_AUDIENCE_ENV,
  PREMIUM_LICENSE_TRUSTED_KEYS_ENV,
]);
export const FOUNDER_PRODUCTION_MODE = "founder-production";
export const FOUNDER_PRODUCTION_PROFILE = ".env.founder-production";
export const FOUNDER_BUILD_ATTESTATION = "founder-build.json";
export const PRODUCTION_FOUNDER_KEY_ID = "founder-es256-2026-08";
export const PREMIUM_LICENSE_AUDIENCE = "maarifos-pwa";

const MAX_TRUSTED_KEYS_JSON_BYTES = 16 * 1024;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;
const BASE64URL_32_BYTES_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const DANGEROUS_VITE_ENV_NAME_PATTERN =
  /(?:^|_)(?:API_KEY|CODE|CREDENTIALS?|DIGEST|HMAC|PASSWORD|PASSPHRASE|PIN|PRIVATE|SALT|SECRET|SEED|SIGNING_KEY|TOKEN)(?:_|$)/u;
const FOUNDER_PROFILE_COMMENT_PATTERN = /^\s*(?:#.*)?$/u;
const FOUNDER_PROFILE_ASSIGNMENT_PATTERN = /^([A-Z][A-Z0-9_]*)=(.*)$/u;
const TEXT_CLIENT_ASSET_PATTERN = /\.(?:c?js|mjs|json|html?)$/iu;
const FOUNDER_ATTESTATION_SCHEMA_VERSION = 1;

const LICENSE_ORIGIN_INJECTION_MARKER =
  "/* @maarifos-sites-build:premium-license-api-origin */ null";
const LOOPBACK_HOST_PATTERN = /^(?:localhost|.*\.localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i;
const CLOUDFLARE_HEADERS_LINE_LIMIT = 2_000;
const RESERVED_NETWORK_SEGMENTS = new Set(["api", "auth"]);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const exactKeys = (value, expected, label) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} must contain only the documented fields.`);
  }
  return value;
};

const canonicalFounderConfigurationBytes = (configuration) => Buffer.from(
  `${JSON.stringify({
    apiOrigin: configuration.apiOrigin,
    audience: configuration.audience,
    issuer: configuration.issuer,
    trustedKeys: configuration.trustedKeys,
  })}\n`,
  "utf8",
);

const canonicalFounderProfileBytes = (environment) => Buffer.from(
  `${PREMIUM_LICENSE_ENV_NAMES.map((name) => `${name}=${environment[name]}`).join("\n")}\n`,
  "utf8",
);

const isCanonicalPublicHostname = (hostname) => {
  const normalized = hostname.toLocaleLowerCase("en-US");
  const labels = normalized.split(".");
  if (
    !normalized.includes(".") ||
    normalized.length > 253 ||
    normalized.startsWith(".") ||
    normalized.endsWith(".") ||
    normalized.includes("..") ||
    LOOPBACK_HOST_PATTERN.test(normalized) ||
    /(?:^|\.)(?:example|invalid|internal|lan|local|localhost|test)$/u.test(normalized) ||
    /^\[.*\]$/u.test(normalized) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(normalized) ||
    labels.some((label) =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))
  ) {
    return false;
  }
  return true;
};

export function assertNoDangerousViteSecretNames(environment) {
  if (typeof environment !== "object" || environment === null || Array.isArray(environment)) {
    throw new Error("Vite environment must be a record.");
  }
  const dangerousName = Object.keys(environment).find((name) =>
    name.startsWith("VITE_") && DANGEROUS_VITE_ENV_NAME_PATTERN.test(name));
  if (dangerousName !== undefined) {
    throw new Error(`Public Vite environment contains a forbidden secret-bearing name: ${dangerousName}.`);
  }
}

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
    !isCanonicalPublicHostname(url.hostname)
  ) {
    throw new Error(
      `${PREMIUM_LICENSE_API_ORIGIN_ENV} must be a canonical public HTTPS origin without credentials, path, query, fragment, or wildcard.`,
    );
  }

  return url.origin;
}

const validateProductionPublicJwk = (value) => {
  const jwk = exactKeys(
    value,
    ["crv", "ext", "key_ops", "kty", "x", "y"],
    "Production founder public JWK",
  );
  if (
    jwk.kty !== "EC" ||
    jwk.crv !== "P-256" ||
    jwk.ext !== true ||
    !Array.isArray(jwk.key_ops) ||
    jwk.key_ops.length !== 1 ||
    jwk.key_ops[0] !== "verify" ||
    typeof jwk.x !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(jwk.x) ||
    typeof jwk.y !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(jwk.y) ||
    "d" in jwk
  ) {
    throw new Error("Production founder key must be the exact public P-256 verification JWK.");
  }

  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    if (
      key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    ) {
      throw new Error("unexpected curve");
    }
  } catch {
    throw new Error("Production founder key must be a valid public P-256 verification JWK.");
  }

  return Object.freeze({
    crv: "P-256",
    ext: true,
    key_ops: Object.freeze(["verify"]),
    kty: "EC",
    x: jwk.x,
    y: jwk.y,
  });
};

export function validateProductionFounderEnvironment(
  environment,
  { requireFounder = false } = {},
) {
  assertNoDangerousViteSecretNames(environment);
  const presentNames = PREMIUM_LICENSE_ENV_NAMES.filter((name) =>
    Object.hasOwn(environment, name) && environment[name] !== undefined);
  if (presentNames.length === 0) {
    if (requireFounder) {
      throw new Error("Founder production mode requires all four public premium license fields.");
    }
    return null;
  }
  if (presentNames.length !== PREMIUM_LICENSE_ENV_NAMES.length) {
    throw new Error("Premium founder public Vite fields must be supplied all-or-none.");
  }

  const apiOrigin = validateProductionLicenseApiOrigin(
    environment[PREMIUM_LICENSE_API_ORIGIN_ENV],
  );
  if (apiOrigin === null) {
    throw new Error("Founder production mode requires a public license API origin.");
  }
  if (environment[PREMIUM_LICENSE_ISSUER_ENV] !== apiOrigin) {
    throw new Error("Premium license issuer must exactly equal the canonical API origin.");
  }
  if (environment[PREMIUM_LICENSE_AUDIENCE_ENV] !== PREMIUM_LICENSE_AUDIENCE) {
    throw new Error(`Premium license audience must exactly equal ${PREMIUM_LICENSE_AUDIENCE}.`);
  }

  const trustedKeysJson = environment[PREMIUM_LICENSE_TRUSTED_KEYS_ENV];
  if (
    typeof trustedKeysJson !== "string" ||
    trustedKeysJson.length === 0 ||
    Buffer.byteLength(trustedKeysJson, "utf8") > MAX_TRUSTED_KEYS_JSON_BYTES
  ) {
    throw new Error("Premium trusted-keys JSON is missing or exceeds its bounded size.");
  }
  let trustedKeysInput;
  try {
    trustedKeysInput = JSON.parse(trustedKeysJson);
  } catch {
    throw new Error("Premium trusted-keys value must be valid bounded JSON.");
  }
  const trustedKeys = exactKeys(
    trustedKeysInput,
    [PRODUCTION_FOUNDER_KEY_ID],
    "Production founder trusted-keys JSON",
  );
  const productionKey = validateProductionPublicJwk(
    trustedKeys[PRODUCTION_FOUNDER_KEY_ID],
  );

  return Object.freeze({
    apiOrigin,
    audience: PREMIUM_LICENSE_AUDIENCE,
    issuer: apiOrigin,
    trustedKeys: Object.freeze({
      [PRODUCTION_FOUNDER_KEY_ID]: productionKey,
    }),
  });
}

export function parseFounderProductionProfile(source) {
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > 64 * 1024) {
    throw new Error("Founder production profile must be bounded UTF-8 text.");
  }
  const environment = Object.create(null);
  for (const line of source.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    if (FOUNDER_PROFILE_COMMENT_PATTERN.test(line)) continue;
    const match = FOUNDER_PROFILE_ASSIGNMENT_PATTERN.exec(line);
    if (match === null || !PREMIUM_LICENSE_ENV_NAMES.includes(match[1])) {
      throw new Error("Founder production profile may contain only the four public premium fields.");
    }
    if (Object.hasOwn(environment, match[1])) {
      throw new Error("Founder production profile contains a duplicate field.");
    }
    environment[match[1]] = match[2];
  }
  validateProductionFounderEnvironment(environment, { requireFounder: true });
  return Object.freeze(environment);
}

export function hashDeterministicFileTree(root) {
  if (!existsSync(root)) throw new Error("Cannot hash a missing build tree.");
  const digest = createHash("sha256");
  const visit = (directory, relativeDirectory = "") => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name)
        .split(path.sep)
        .join("/");
      const absolutePath = path.join(directory, entry.name);
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
        throw new Error("Build trees may contain only regular files and directories.");
      }
      const pathBytes = Buffer.from(relativePath, "utf8");
      digest.update(entry.isDirectory() ? "D\0" : "F\0");
      digest.update(String(pathBytes.length));
      digest.update("\0");
      digest.update(pathBytes);
      digest.update("\0");
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
      } else {
        const fileBytes = readFileSync(absolutePath);
        digest.update(String(fileBytes.length));
        digest.update("\0");
        digest.update(fileBytes);
        digest.update("\0");
      }
    }
  };
  visit(root);
  return digest.digest("hex");
}

const assertFounderConfigurationEmbeddedInClient = (clientRoot, configuration) => {
  const sources = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && TEXT_CLIENT_ASSET_PATTERN.test(entry.name)) {
        sources.push(readFileSync(absolutePath, "utf8"));
      }
    }
  };
  visit(clientRoot);
  const combined = sources.join("\n");
  const key = configuration.trustedKeys[PRODUCTION_FOUNDER_KEY_ID];
  const requiredPublicValues = [
    configuration.apiOrigin,
    configuration.audience,
    PRODUCTION_FOUNDER_KEY_ID,
    key.x,
    key.y,
  ];
  if (
    requiredPublicValues.some((value) => !combined.includes(value)) ||
    combined.includes("founder-es256-local")
  ) {
    throw new Error("Founder production client bundle does not match the validated public profile.");
  }
};

const profileContext = ({ environment, mode, requireFounder, root }) => {
  const founderRequired = requireFounder || mode === FOUNDER_PRODUCTION_MODE;
  const effectiveEnvironment = environment ?? loadEnv(mode, root, "VITE_");
  const configuration = validateProductionFounderEnvironment(effectiveEnvironment, {
    requireFounder: founderRequired,
  });
  if (configuration === null) {
    return Object.freeze({ configuration: null, profileBytes: null });
  }

  let profileBytes = canonicalFounderProfileBytes(effectiveEnvironment);
  if (founderRequired) {
    const profilePath = path.join(root, FOUNDER_PRODUCTION_PROFILE);
    if (!existsSync(profilePath)) {
      throw new Error("Founder production mode requires the tracked public profile.");
    }
    profileBytes = readFileSync(profilePath);
    const profileEnvironment = parseFounderProductionProfile(profileBytes.toString("utf8"));
    for (const name of PREMIUM_LICENSE_ENV_NAMES) {
      if (profileEnvironment[name] !== effectiveEnvironment[name]) {
        throw new Error("Effective founder environment has drifted from the tracked public profile.");
      }
    }
  }
  return Object.freeze({ configuration, profileBytes });
};

const deploymentOutputs = (root) => {
  const dist = path.join(root, "dist");
  return Object.freeze({
    attestation: path.join(dist, ".openai", FOUNDER_BUILD_ATTESTATION),
    headers: path.join(dist, "client", "_headers"),
    hosting: path.join(dist, ".openai", "hosting.json"),
    server: path.join(dist, "server", "index.js"),
  });
};

const removeDeploymentOutputs = (outputs) => {
  for (const output of Object.values(outputs)) rmSync(output, { force: true });
};

export function preflightSitesBuild({
  root,
  environment,
  mode = "production",
  requireFounder = false,
} = {}) {
  const resolvedRoot = root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outputs = deploymentOutputs(resolvedRoot);
  removeDeploymentOutputs(outputs);
  try {
    const context = profileContext({ environment, mode, requireFounder, root: resolvedRoot });
    return Object.freeze({
      founderEnabled: context.configuration !== null,
      mode,
    });
  } catch (error) {
    removeDeploymentOutputs(outputs);
    throw error;
  }
}

export function createFounderBuildAttestation({
  clientRoot,
  configuration,
  profileBytes,
}) {
  const attestation = Object.freeze({
    schemaVersion: FOUNDER_ATTESTATION_SCHEMA_VERSION,
    profileSha256: founderProfileSha256(profileBytes),
    configurationSha256: founderConfigurationSha256(configuration),
    clientTreeSha256: hashDeterministicFileTree(clientRoot),
  });
  return Buffer.from(`${JSON.stringify(attestation, null, 2)}\n`, "utf8");
}

export const founderProfileSha256 = (profileBytes) => sha256(profileBytes);

export const founderConfigurationSha256 = (configuration) =>
  sha256(canonicalFounderConfigurationBytes(configuration));

export function validateFounderBuildAttestation(value) {
  const attestation = exactKeys(
    value,
    ["clientTreeSha256", "configurationSha256", "profileSha256", "schemaVersion"],
    "Founder build attestation",
  );
  if (
    attestation.schemaVersion !== FOUNDER_ATTESTATION_SCHEMA_VERSION ||
    !SHA256_HEX_PATTERN.test(attestation.profileSha256) ||
    !SHA256_HEX_PATTERN.test(attestation.configurationSha256) ||
    !SHA256_HEX_PATTERN.test(attestation.clientTreeSha256)
  ) {
    throw new Error("Founder build attestation is malformed.");
  }
  return Object.freeze({ ...attestation });
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
  mode = "production",
  requireFounder = false,
} = {}) {
  const resolvedRoot = root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dist = path.join(resolvedRoot, "dist");
  const clientRoot = path.join(dist, "client");
  const index = path.join(dist, "client", "index.html");
  const worker = path.join(resolvedRoot, "worker", "index.js");
  const hosting = path.join(resolvedRoot, ".openai", "hosting.json");
  const outputs = deploymentOutputs(resolvedRoot);

  // A failed or interrupted build must never leave older deployment metadata or
  // security policy beside a new client bundle.
  removeDeploymentOutputs(outputs);
  let stagingRoot;
  try {
    const context = profileContext({
      environment,
      mode,
      requireFounder,
      root: resolvedRoot,
    });
    const licenseApiOrigin = context.configuration?.apiOrigin ?? null;
    for (const file of [index, worker, hosting]) {
      if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
    }
    assertNoReservedStaticAssets(clientRoot);
    if (context.configuration !== null) {
      assertFounderConfigurationEmbeddedInClient(clientRoot, context.configuration);
    }

    const workerOutput = renderSitesWorker(readFileSync(worker, "utf8"), licenseApiOrigin);
    const headersOutputBytes = renderStaticAssetHeadersFile(
      createSecurityHeaders(licenseApiOrigin),
    );
    const hostingOutputBytes = readFileSync(hosting);
    stagingRoot = mkdtempSync(path.join(dist, ".sites-build-"));
    const stagedWorker = path.join(stagingRoot, "server", "index.js");
    const stagedHeaders = path.join(stagingRoot, "client", "_headers");
    const stagedHosting = path.join(stagingRoot, ".openai", "hosting.json");
    const stagedAttestation = path.join(
      stagingRoot,
      ".openai",
      FOUNDER_BUILD_ATTESTATION,
    );

    mkdirSync(path.dirname(stagedWorker), { recursive: true });
    mkdirSync(path.dirname(stagedHeaders), { recursive: true });
    mkdirSync(path.dirname(stagedHosting), { recursive: true });
    writeFileSync(stagedWorker, workerOutput, { encoding: "utf8", flag: "wx" });
    writeFileSync(stagedHeaders, headersOutputBytes, { encoding: "utf8", flag: "wx" });
    writeFileSync(stagedHosting, hostingOutputBytes, { flag: "wx" });

    moveStagedFile(stagedHosting, outputs.hosting);
    moveStagedFile(stagedHeaders, outputs.headers);
    if (context.configuration !== null) {
      const attestationBytes = createFounderBuildAttestation({
        clientRoot,
        configuration: context.configuration,
        profileBytes: context.profileBytes,
      });
      writeFileSync(stagedAttestation, attestationBytes, { flag: "wx" });
      moveStagedFile(stagedAttestation, outputs.attestation);
    }
    // Publish the executable Worker last. Its presence is the completed-build marker.
    moveStagedFile(stagedWorker, outputs.server);

    return Object.freeze({
      attestationOutput: context.configuration === null ? null : outputs.attestation,
      founderEnabled: context.configuration !== null,
      headersOutput: outputs.headers,
      hostingOutput: outputs.hosting,
      licenseApiOrigin,
      serverOutput: outputs.server,
    });
  } catch (error) {
    removeDeploymentOutputs(outputs);
    throw error;
  } finally {
    if (stagingRoot !== undefined) {
      rmSync(stagingRoot, { force: true, recursive: true });
    }
  }
}

const parseCliArguments = (arguments_) => {
  let mode = "production";
  let preflight = false;
  let requireFounder = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--preflight") {
      preflight = true;
    } else if (argument === "--require-founder") {
      requireFounder = true;
    } else if (argument === "--mode") {
      index += 1;
      mode = arguments_[index];
    } else if (argument.startsWith("--mode=")) {
      mode = argument.slice("--mode=".length);
    } else {
      throw new Error("Unknown Sites build argument.");
    }
  }
  if (typeof mode !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(mode)) {
    throw new Error("Sites build mode is invalid.");
  }
  return Object.freeze({ mode, preflight, requireFounder });
}

const invokedAsScript = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const options = parseCliArguments(process.argv.slice(2));
  if (options.preflight) {
    const result = preflightSitesBuild(options);
    console.log(`Sites build preflight passed (founder: ${result.founderEnabled ? "enabled" : "self-only"}).`);
  } else {
    const result = prepareSitesBuild(options);
    console.log(
      `Prepared Sites build: headers, Worker, hosting metadata, and ${result.founderEnabled ? "founder attestation" : "self-only policy"}.`,
    );
  }
}
