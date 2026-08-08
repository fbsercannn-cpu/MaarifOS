import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  base64UrlDecode,
  base64UrlEncode,
  challengeSigningPayload,
  publicJwkThumbprint,
  sha256Hex,
} from "../src/crypto.mjs";
import { FOUNDER_CONTENT_RELEASE } from "../src/release.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(scriptDirectory, "..");
const apiOrigin = process.env.LICENSE_API_URL ?? "http://localhost:8787";
const pwaOrigin = process.env.MAARIFOS_PWA_ORIGIN ?? "http://localhost:4173";
const expectDeviceLimit = process.env.EXPECT_FOUNDER_DEVICE_LIMIT === "1";
const trustedKeysPath = process.env.ENTITLEMENT_TRUSTED_KEYS_PATH ?? resolve(
  licenseApiRoot,
  ".secrets",
  "entitlement-trusted-keys.json",
);
let founderPin = process.env.MAARIFOS_FOUNDER_PIN;
if (founderPin !== undefined) delete process.env.MAARIFOS_FOUNDER_PIN;
if (!/^\d{6}$/u.test(founderPin ?? "")) {
  throw new Error("MAARIFOS_FOUNDER_PIN bu süreç için altı haneli verilmelidir.");
}

const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
const deviceKeyThumbprint = await publicJwkThumbprint(publicJwk);
const commonHeaders = {
  Origin: pwaOrigin,
  "Content-Type": "application/json",
};
const challengeResponse = await fetch(`${apiOrigin}/v1/device/challenge`, {
  method: "POST",
  headers: commonHeaders,
  body: JSON.stringify({
    deviceKeyThumbprint,
    purpose: "redeem-code",
  }),
});
if (!challengeResponse.ok) throw new Error("Yerel challenge isteği başarısız.");
const challenge = await challengeResponse.json();
const idempotencyKey = crypto.randomUUID();
const proofSignature = base64UrlEncode(
  await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(
      challengeSigningPayload(challenge, idempotencyKey),
    ),
  ),
);
const redeemPayload = {
  code: founderPin,
  challengeId: challenge.challengeId,
  proofSignature,
  devicePublicKeyJwk: publicJwk,
  deviceKeyThumbprint,
  appVersion: "0.9.0",
  idempotencyKey,
};
let serializedRedeem = JSON.stringify(redeemPayload);
const redeemHeaders = { ...commonHeaders, "Idempotency-Key": idempotencyKey };
const redeemResponse = await fetch(`${apiOrigin}/v1/founder/redeem`, {
  method: "POST",
  headers: redeemHeaders,
  body: serializedRedeem,
});
founderPin = "";
redeemPayload.code = "";
if (expectDeviceLimit) {
  serializedRedeem = "";
  const rejection = await redeemResponse.json();
  if (
    redeemResponse.status !== 403 ||
    rejection.error !== "request_rejected" ||
    !/^[0-9a-f-]{36}$/iu.test(rejection.requestId) ||
    Object.keys(rejection).sort().join(",") !== "error,requestId"
  ) {
    throw new Error("Üçüncü cihaz genel hata ile reddedilmedi.");
  }
  process.stdout.write("Local D1 third-device generic rejection PASS.\n");
} else {
  if (!redeemResponse.ok) throw new Error("Yerel kurucu aktivasyonu başarısız.");
  const body = await redeemResponse.json();
  const retryResponse = await fetch(`${apiOrigin}/v1/founder/redeem`, {
    method: "POST",
    headers: redeemHeaders,
    body: serializedRedeem,
  });
  serializedRedeem = "";
  if (!retryResponse.ok) throw new Error("Yerel idempotent tekrar başarısız.");
  const retryBody = await retryResponse.json();
  if (retryBody.entitlementToken !== body.entitlementToken) {
    throw new Error("Yerel idempotent tekrar aynı entitlement'ı döndürmedi.");
  }
  const [encodedHeader, encodedClaims, encodedSignature] =
    body.entitlementToken.split(".");
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader)));
  const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedClaims)));
  const trustedKeys = JSON.parse(
    await readFile(trustedKeysPath, "utf8"),
  );
  const trustedJwk = trustedKeys[header.kid];
  if (!trustedJwk || header.alg !== "ES256" || header.typ !== "JWT") {
    throw new Error("Yerel entitlement başlığı güvenilir değil.");
  }
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    trustedJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const signatureValid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    base64UrlDecode(encodedSignature, 64),
    new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`),
  );
  const grant = claims.grants?.[0];
  const contentBytes = new TextEncoder().encode(body.contentBundle.contentJson);
  const contentDigest = `sha256:${await sha256Hex(contentBytes)}`;
  if (
    !signatureValid ||
    claims.iss !== apiOrigin ||
    claims.aud !== "maarifos-pwa" ||
    claims.device_key_thumbprint !== deviceKeyThumbprint ||
    grant?.access_mode !== "staff-code" ||
    grant?.content_release_id !== FOUNDER_CONTENT_RELEASE.contentReleaseId ||
    body.contentBundle.contentReleaseId !== FOUNDER_CONTENT_RELEASE.contentReleaseId ||
    body.contentBundle.contentByteLength !== contentBytes.byteLength ||
    body.contentBundle.contentSha256 !== contentDigest ||
    contentDigest !== FOUNDER_CONTENT_RELEASE.contentRawSha256
  ) {
    throw new Error("Yerel entitlement veya özel içerik doğrulaması başarısız.");
  }
  process.stdout.write(
    `Local Worker+D1 smoke PASS: ${FOUNDER_CONTENT_RELEASE.contentReleaseId}; imza, cihaz bağı, idempotency ve ham içerik kilidi doğrulandı.\n`,
  );
}
