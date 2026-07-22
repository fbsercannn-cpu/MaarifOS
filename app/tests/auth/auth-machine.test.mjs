import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_STATE_PERSISTENCE,
  createInitialAuthState,
  deriveWelcomeViewModel,
  reduceAuthState,
} from "../../src/auth/authMachine.ts";

const onlineReady = () =>
  createInitialAuthState({ network: "online", googleReadiness: "available" });

test("yerel misafir kullanımı internetsiz ve Google hazır değilken de açıktır", () => {
  const initial = createInitialAuthState();
  const view = deriveWelcomeViewModel(initial);
  const guest = reduceAuthState(initial, { type: "CONTINUE_OFFLINE" });

  assert.equal(view.localAction.enabled, true);
  assert.equal(view.localAction.label, "İnternetsiz devam et");
  assert.equal(view.googleAction.enabled, false);
  assert.match(view.googleAction.statusText, /Henüz bağlı değil/);
  assert.equal(guest.status, "local_guest");
  assert.equal(guest.network, "offline");
});

test("Google bağlantısı çevrimdışıyken başlamaz ve yerel kullanım kaybolmaz", () => {
  const guest = reduceAuthState(
    createInitialAuthState({ network: "offline", googleReadiness: "available" }),
    { type: "CONTINUE_OFFLINE" },
  );
  const result = reduceAuthState(guest, { type: "REQUEST_GOOGLE" });

  assert.equal(result.status, "google_error");
  assert.equal(result.error, "offline");
  assert.equal(result.origin, "local_guest");

  const continued = reduceAuthState(result, { type: "CONTINUE_OFFLINE" });
  assert.equal(continued.status, "local_guest");
});

test("yakında durumundaki Google düğmesi bağlantı başlatmaz", () => {
  const result = reduceAuthState(
    createInitialAuthState({ network: "online", googleReadiness: "coming_soon" }),
    { type: "REQUEST_GOOGLE" },
  );

  assert.equal(result.status, "google_error");
  assert.equal(result.error, "not_available");
});

test("kullanıcı iptali önceki yerel misafir durumuna güvenle döner", () => {
  const guest = reduceAuthState(onlineReady(), { type: "CONTINUE_OFFLINE" });
  const connecting = reduceAuthState(guest, { type: "REQUEST_GOOGLE" });
  const cancelled = reduceAuthState(connecting, { type: "GOOGLE_CANCELLED" });

  assert.equal(connecting.status, "google_connecting");
  assert.equal(cancelled.status, "local_guest");
  assert.equal(cancelled.notice, "cancelled");
  assert.equal(cancelled.googleConnection, "not_connected");
});

test("sağlayıcı hatası güvenli kodla modellenir ve ayrıntı/sır saklamaz", () => {
  const connecting = reduceAuthState(onlineReady(), { type: "REQUEST_GOOGLE" });
  const failed = reduceAuthState(connecting, {
    type: "GOOGLE_FAILED",
    reason: "provider_error",
  });

  assert.equal(failed.status, "google_error");
  assert.equal(failed.error, "provider_error");
  assert.doesNotMatch(JSON.stringify(failed), /access_token|refresh_token|id_token|authorization_code/i);
});

test("bağlantı sırasında ağ kesilirse güvenli hata durumuna geçilir", () => {
  const connecting = reduceAuthState(onlineReady(), { type: "REQUEST_GOOGLE" });
  const offline = reduceAuthState(connecting, {
    type: "NETWORK_CHANGED",
    network: "offline",
  });

  assert.equal(offline.status, "google_error");
  assert.equal(offline.error, "offline");
  assert.equal(offline.network, "offline");
});

test("yalnız bağlantı akışındaki doğrulanmış ve dolu profil oturuma dönüşür", () => {
  const ignored = reduceAuthState(onlineReady(), {
    type: "GOOGLE_SESSION_CONFIRMED",
    user: { subject: "provider-subject", displayName: "Öğretmen" },
  });
  assert.equal(ignored.status, "welcome");

  const connecting = reduceAuthState(onlineReady(), { type: "REQUEST_GOOGLE" });
  const invalid = reduceAuthState(connecting, {
    type: "GOOGLE_SESSION_CONFIRMED",
    user: { subject: " ", displayName: "Öğretmen" },
  });
  assert.equal(invalid.status, "google_error");
  assert.equal(invalid.error, "invalid_response");

  const connected = reduceAuthState(connecting, {
    type: "GOOGLE_SESSION_CONFIRMED",
    user: { subject: " provider-subject ", displayName: " Öğretmen " },
  });
  assert.equal(connected.status, "google_connected");
  assert.deepEqual(connected.user, {
    subject: "provider-subject",
    displayName: "Öğretmen",
  });
  assert.equal(AUTH_STATE_PERSISTENCE, "memory-only");
});

test("Google bağlantısını kesmek yerel verileri silmeden misafir moduna döner", () => {
  const connecting = reduceAuthState(onlineReady(), { type: "REQUEST_GOOGLE" });
  const connected = reduceAuthState(connecting, {
    type: "GOOGLE_SESSION_CONFIRMED",
    user: { subject: "provider-subject", displayName: "Öğretmen" },
  });
  const disconnected = reduceAuthState(connected, { type: "DISCONNECT_GOOGLE" });

  assert.equal(disconnected.status, "local_guest");
  assert.equal(disconnected.notice, "google_disconnected");
});
