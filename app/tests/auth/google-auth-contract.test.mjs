import assert from "node:assert/strict";
import test from "node:test";

import {
  SECURE_GOOGLE_AUTH_PROFILE,
  hasSecureGoogleAuthProfile,
  validateAuthorizationUrl,
  validateLocalReturnPath,
} from "../../src/auth/googleAuthContract.ts";

const authorizationPolicy = {
  allowedOrigins: ["https://accounts.google.com", "http://127.0.0.1:4173"],
  allowedPaths: ["/o/oauth2/v2/auth", "/auth/dev-start"],
  allowLoopbackHttp: true,
};

test("güvenli profil authorization code + S256 PKCE + BFF bağlı state/nonce ister", () => {
  assert.equal(hasSecureGoogleAuthProfile(SECURE_GOOGLE_AUTH_PROFILE), true);
  assert.equal(
    hasSecureGoogleAuthProfile({
      ...SECURE_GOOGLE_AUTH_PROFILE,
      browserTokenStorage: "localStorage",
    }),
    false,
  );
  assert.equal(SECURE_GOOGLE_AUTH_PROFILE.childDataTransfer, "none");
});

test("Google yetkilendirme adresi tam origin ve tam path allowlist ile kabul edilir", () => {
  const url = validateAuthorizationUrl(
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=public-id&response_type=code",
    authorizationPolicy,
  );

  assert.equal(url?.origin, "https://accounts.google.com");
  assert.equal(url?.pathname, "/o/oauth2/v2/auth");
});

test("açık yönlendirme, kullanıcı bilgisi, fragment ve benzer alan adı reddedilir", () => {
  const unsafe = [
    "https://evil.example/o/oauth2/v2/auth",
    "https://accounts.google.com.evil.example/o/oauth2/v2/auth",
    "https://user:pass@accounts.google.com/o/oauth2/v2/auth",
    "https://accounts.google.com/o/oauth2/v2/auth/extra",
    "https://accounts.google.com/o/oauth2/v2/auth#credential",
    "javascript:alert(1)",
  ];

  for (const candidate of unsafe) {
    assert.equal(validateAuthorizationUrl(candidate, authorizationPolicy), null, candidate);
  }
});

test("HTTP yalnız açıkça izin verilen loopback geliştirme adresinde kabul edilir", () => {
  assert.ok(
    validateAuthorizationUrl("http://127.0.0.1:4173/auth/dev-start", authorizationPolicy),
  );
  assert.equal(
    validateAuthorizationUrl("http://accounts.google.com/o/oauth2/v2/auth", authorizationPolicy),
    null,
  );
});

test("uygulama dönüş yolu yalnız same-origin ve izinli yol öneklerini kullanır", () => {
  const policy = {
    appOrigin: "https://app.maarifos.example",
    allowedPathPrefixes: ["/gunum", "/ayarlar/hesap"],
  };

  assert.equal(
    validateLocalReturnPath("/gunum?kaynak=giris#bugun", policy),
    "/gunum?kaynak=giris#bugun",
  );
  assert.equal(validateLocalReturnPath("/gunumluk", policy), null);
  assert.equal(validateLocalReturnPath("//evil.example/gunum", policy), null);
  assert.equal(validateLocalReturnPath("https://evil.example/gunum", policy), null);
  assert.equal(validateLocalReturnPath("/gunum\\evil", policy), null);
});

test("sözleşmenin seri hale gelen yüzeyi token veya çocuk verisi alanı içermez", () => {
  const publicSurface = JSON.stringify({
    securityProfile: SECURE_GOOGLE_AUTH_PROFILE,
    startResult: { kind: "redirect", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth" },
    session: {
      status: "connected",
      user: { subject: "provider-subject", displayName: "Öğretmen" },
    },
  });

  assert.doesNotMatch(publicSurface, /accessToken|refreshToken|idToken|student|observation|media/i);
});
