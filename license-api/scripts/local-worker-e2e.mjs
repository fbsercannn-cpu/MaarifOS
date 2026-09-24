import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes, randomInt, webcrypto } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(scriptDirectory, "..");
const wranglerVersion = "4.120.0";
const apiOrigin = "http://localhost:8787";
const pwaOrigin = "http://localhost:4173";
const npxCli = process.env.npm_execpath
  ? resolve(dirname(process.env.npm_execpath), "npx-cli.js")
  : resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function runChecked(command, argumentsList, options = {}) {
  const result = spawnSync(command, argumentsList, {
    cwd: licenseApiRoot,
    encoding: "utf8",
    shell: options.shell ?? false,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

async function waitUntilReady(worker, output, errors) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (worker.exitCode !== null) {
      throw new Error(
        `Wrangler dev exited before readiness.\n${output.value}\n${errors.value}`,
      );
    }
    try {
      const response = await fetch(`${apiOrigin}/v1/device/challenge`, {
        method: "OPTIONS",
        headers: {
          Origin: pwaOrigin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      if (response.status === 204) return;
    } catch {
      // Wrangler has not bound the local socket yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(
    `Wrangler dev did not become ready.\n${output.value}\n${errors.value}`,
  );
}

function stopWorkerTree(worker) {
  if (!worker || worker.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(worker.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-worker.pid, "SIGTERM");
  } catch {
    worker.kill("SIGTERM");
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "maarifos-license-e2e-"));
let worker = null;
try {
  const founderPin = String(randomInt(100000, 1000000));
  const founderHmacKey = randomBytes(32);
  const rateLimitHmacKey = randomBytes(32);
  const founderDigest = createHmac("sha256", founderHmacKey)
    .update(founderPin, "utf8")
    .digest("base64url");
  const entitlementKeyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const [privateJwk, publicJwk] = await Promise.all([
    webcrypto.subtle.exportKey("jwk", entitlementKeyPair.privateKey),
    webcrypto.subtle.exportKey("jwk", entitlementKeyPair.publicKey),
  ]);
  const envFile = join(temporaryRoot, "worker.env");
  const trustedKeysFile = join(temporaryRoot, "trusted-keys.json");
  const persistenceDirectory = join(temporaryRoot, "wrangler-state");
  await Promise.all([
    writeFile(
      envFile,
      [
        `FOUNDER_PIN_HMAC_KEY=${base64Url(founderHmacKey)}`,
        `FOUNDER_PIN_HMAC_DIGEST=${founderDigest}`,
        `RATE_LIMIT_HMAC_KEY=${base64Url(rateLimitHmacKey)}`,
        `ENTITLEMENT_PRIVATE_JWK='${JSON.stringify(privateJwk)}'`,
        "",
      ].join("\n"),
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    ),
    writeFile(
      trustedKeysFile,
      `${JSON.stringify({ "founder-es256-local": publicJwk })}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    ),
  ]);

  runChecked(
    process.execPath,
    [
      npxCli,
      "--yes",
      `wrangler@${wranglerVersion}`,
      "d1",
      "migrations",
      "apply",
      "maarifos-founder-license-local",
      "--local",
      "--env",
      "development",
      "--persist-to",
      persistenceDirectory,
      "--env-file",
      envFile,
    ],
  );

  const output = { value: "" };
  const errors = { value: "" };
  worker = spawn(
    process.execPath,
    [
      npxCli,
      "--yes",
      `wrangler@${wranglerVersion}`,
      "dev",
      "--local",
      "--env",
      "development",
      "--port",
      "8787",
      "--persist-to",
      persistenceDirectory,
      "--env-file",
      envFile,
      "--log-level",
      "warn",
    ],
    {
      cwd: licenseApiRoot,
      detached: process.platform !== "win32",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const appendBounded = (target, chunk) => {
    target.value = `${target.value}${chunk.toString("utf8")}`.slice(-16_384);
  };
  worker.stdout.on("data", (chunk) => appendBounded(output, chunk));
  worker.stderr.on("data", (chunk) => appendBounded(errors, chunk));
  await waitUntilReady(worker, output, errors);

  const smokeEnvironment = {
    ...process.env,
    LICENSE_API_URL: apiOrigin,
    MAARIFOS_PWA_ORIGIN: pwaOrigin,
    MAARIFOS_FOUNDER_PIN: founderPin,
    ENTITLEMENT_TRUSTED_KEYS_PATH: trustedKeysFile,
  };
  for (let deviceNumber = 1; deviceNumber <= 2; deviceNumber += 1) {
    runChecked(process.execPath, ["./scripts/local-smoke.mjs"], {
      env: smokeEnvironment,
    });
  }
  runChecked(process.execPath, ["./scripts/local-smoke.mjs"], {
    env: { ...smokeEnvironment, EXPECT_FOUNDER_DEVICE_LIMIT: "1" },
  });
  process.stdout.write(
    "Isolated Wrangler dev + D1 migration + founder redemption PASS.\n",
  );
} finally {
  stopWorkerTree(worker);
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const resolvedSystemTemp = resolve(tmpdir());
  if (resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`)) {
    await rm(resolvedTemporaryRoot, { recursive: true, force: true });
  }
}
