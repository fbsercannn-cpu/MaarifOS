import { createHmac, randomBytes, webcrypto } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(scriptDirectory, "..");
const secretDirectory = resolve(licenseApiRoot, ".secrets");
const pinPattern = /^\d{6}$/u;

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function readMaskedPin() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "Etkileşimli terminal yok. PIN'i yalnız bu süreç için MAARIFOS_FOUNDER_PIN ortam değişkeninde verin.",
    );
  }
  process.stdout.write("Altı haneli kurucu PIN'i: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolvePin, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    const onData = (character) => {
      if (character === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("İşlem iptal edildi."));
        return;
      }
      if (character === "\r" || character === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolvePin(value);
        return;
      }
      if (character === "\b" || character === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }
      if (/^\d$/u.test(character) && value.length < 6) {
        value += character;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

let founderPin = process.env.MAARIFOS_FOUNDER_PIN;
if (founderPin !== undefined) delete process.env.MAARIFOS_FOUNDER_PIN;
if (founderPin === undefined) founderPin = await readMaskedPin();
if (!pinPattern.test(founderPin)) throw new Error("Kurucu PIN tam altı hane olmalıdır.");

const founderHmacKey = randomBytes(32);
const rateLimitHmacKey = randomBytes(32);
const founderDigest = createHmac("sha256", founderHmacKey)
  .update(founderPin, "utf8")
  .digest("base64url");
founderPin = "";

const entitlementKeyPair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const [privateJwk, publicJwk] = await Promise.all([
  webcrypto.subtle.exportKey("jwk", entitlementKeyPair.privateKey),
  webcrypto.subtle.exportKey("jwk", entitlementKeyPair.publicKey),
]);
const privateJwkJson = JSON.stringify(privateJwk);
const devVars = [
  `FOUNDER_PIN_HMAC_KEY=${base64Url(founderHmacKey)}`,
  `FOUNDER_PIN_HMAC_DIGEST=${founderDigest}`,
  `RATE_LIMIT_HMAC_KEY=${base64Url(rateLimitHmacKey)}`,
  `ENTITLEMENT_PRIVATE_JWK='${privateJwkJson}'`,
  "",
].join("\n");
const trustedKeys = {
  "founder-es256-2026-08": publicJwk,
  "founder-es256-local": publicJwk,
};
const workerSecrets = {
  FOUNDER_PIN_HMAC_KEY: base64Url(founderHmacKey),
  FOUNDER_PIN_HMAC_DIGEST: founderDigest,
  RATE_LIMIT_HMAC_KEY: base64Url(rateLimitHmacKey),
  ENTITLEMENT_PRIVATE_JWK: privateJwkJson,
};

await mkdir(secretDirectory, { recursive: true, mode: 0o700 });
await Promise.all([
  writeFile(resolve(licenseApiRoot, ".dev.vars.development"), devVars, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  }),
  writeFile(
    resolve(secretDirectory, "founder-pin-hmac-key.txt"),
    `${base64Url(founderHmacKey)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
  writeFile(
    resolve(secretDirectory, "founder-pin-hmac-digest.txt"),
    `${founderDigest}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
  writeFile(
    resolve(secretDirectory, "rate-limit-hmac-key.txt"),
    `${base64Url(rateLimitHmacKey)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
  writeFile(
    resolve(secretDirectory, "entitlement-private-jwk.json"),
    `${privateJwkJson}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
  writeFile(
    resolve(secretDirectory, "entitlement-trusted-keys.json"),
    `${JSON.stringify(trustedKeys, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
  writeFile(
    resolve(secretDirectory, "worker-secrets.json"),
    `${JSON.stringify(workerSecrets, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  ),
]);

process.stdout.write(
  "Yerel secret dosyaları oluşturuldu; PIN ve anahtar değerleri ekrana/loga yazılmadı.\n",
);
