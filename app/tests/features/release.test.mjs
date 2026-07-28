import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  acknowledgeCurrentRelease,
  CURRENT_RELEASE,
  inspectCurrentRelease,
  PWA_UPDATE_READY_EVENT,
  RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION,
  RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
} from "../../src/release.ts";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, value);
  }
}

function acknowledgement({
  firstSeenVersion = "0.1.0",
  acknowledgedVersion = "0.1.0",
  acknowledgedAt = "2026-07-22T06:00:00.000Z",
} = {}) {
  return JSON.stringify({
    schemaVersion: RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION,
    firstSeenVersion,
    acknowledgedVersion,
    acknowledgedAt,
  });
}

test("güncel sürüm kullanıcıya gösterilecek eksiksiz Türkçe metadata taşır", () => {
  assert.equal(CURRENT_RELEASE.version, "0.2.0");
  assert.equal(CURRENT_RELEASE.releasedOn, "2026-07-28");
  assert.equal(CURRENT_RELEASE.title, "Çocuğu merkeze alan gözlem deneyimi");
  assert.ok(CURRENT_RELEASE.notes.length >= 4);
  assert.ok(CURRENT_RELEASE.notes.every((note) => note.trim().length >= 20));
  assert.equal(
    RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
    "maarifos.release.acknowledgement.v1",
  );
  assert.equal(PWA_UPDATE_READY_EVENT, "maarifos:update-ready");
});

test("paket, yedek ve PWA aynı kanonik uygulama sürümünü kullanır", async () => {
  const [packageJson, prototype, pwa, worker] = await Promise.all([
    readFile(new URL("../../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/pwa.ts", import.meta.url), "utf8"),
    readFile(new URL("../../public/sw.js", import.meta.url), "utf8"),
  ]);

  assert.equal(packageJson.version, CURRENT_RELEASE.version);
  assert.match(prototype, /appVersion: CURRENT_RELEASE\.version/);
  assert.match(
    pwa,
    /encodeURIComponent\(CURRENT_RELEASE\.version\)/,
  );
  assert.match(
    worker,
    new RegExp(`const WORKER_RELEASE = "${CURRENT_RELEASE.version.replaceAll(".", "\\.")}"`),
  );
});

test("boş cihazı ilk kurulum sayar fakat güncellendi bildirimi üretmez", () => {
  const state = inspectCurrentRelease({ storage: new MemoryStorage() });

  assert.equal(state.kind, "first_install");
  assert.equal(state.shouldPresent, false);
  assert.equal(state.previousVersion, null);
  assert.equal(state.storageAvailable, true);
  assert.equal(state.release, CURRENT_RELEASE);
});

test("ilk kurulumu onaylar ve sonraki açılışı güncel sürüm olarak tanır", () => {
  const storage = new MemoryStorage();
  const acknowledged = acknowledgeCurrentRelease({
    storage,
    acknowledgedAt: new Date("2026-07-28T12:30:00.000Z"),
  });

  assert.equal(acknowledged, true);
  assert.deepEqual(
    JSON.parse(storage.getItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY)),
    {
      schemaVersion: 1,
      firstSeenVersion: "0.2.0",
      acknowledgedVersion: "0.2.0",
      acknowledgedAt: "2026-07-28T12:30:00.000Z",
    },
  );

  const state = inspectCurrentRelease({ storage });
  assert.equal(state.kind, "current");
  assert.equal(state.shouldPresent, false);
  assert.equal(state.previousVersion, "0.2.0");
});

test("önceki sürümü gerçek güncelleme olarak ayırır ve sürüm notlarını sunar", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
    acknowledgement({ acknowledgedVersion: "0.1.0" }),
  );

  const state = inspectCurrentRelease({ storage });

  assert.equal(state.kind, "update");
  assert.equal(state.shouldPresent, true);
  assert.equal(state.previousVersion, "0.1.0");
  assert.equal(state.release.version, "0.2.0");
});

test("güncelleme onayında ilk görülen sürümü korur", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
    acknowledgement({
      firstSeenVersion: "0.0.5",
      acknowledgedVersion: "0.1.0",
    }),
  );

  assert.equal(
    acknowledgeCurrentRelease({
      storage,
      acknowledgedAt: new Date("2026-07-28T15:00:00.000Z"),
    }),
    true,
  );

  assert.deepEqual(
    JSON.parse(storage.getItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY)),
    {
      schemaVersion: 1,
      firstSeenVersion: "0.0.5",
      acknowledgedVersion: "0.2.0",
      acknowledgedAt: "2026-07-28T15:00:00.000Z",
    },
  );
});

test("bozuk veya beklenmeyen storage içeriğini güvenli ilk kurulum sayar", () => {
  const malformed = new MemoryStorage();
  malformed.setItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY, "{bozuk");

  assert.doesNotThrow(() => inspectCurrentRelease({ storage: malformed }));
  assert.equal(
    inspectCurrentRelease({ storage: malformed }).kind,
    "first_install",
  );

  const extraFields = new MemoryStorage();
  extraFields.setItem(
    RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
    JSON.stringify({
      ...JSON.parse(acknowledgement()),
      unexpectedStudentData: "saklanmamalı",
    }),
  );
  assert.equal(
    inspectCurrentRelease({ storage: extraFields }).kind,
    "first_install",
  );
});

test("localStorage okuma ve yazma engelleri uygulamayı kırmaz", () => {
  const readBlocked = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("SecurityError");
    },
  };

  const unavailable = inspectCurrentRelease({ storage: readBlocked });
  assert.equal(unavailable.kind, "storage_unavailable");
  assert.equal(unavailable.shouldPresent, false);
  assert.equal(unavailable.storageAvailable, false);
  assert.equal(
    acknowledgeCurrentRelease({ storage: readBlocked }),
    false,
  );

  const writeBlocked = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };

  assert.equal(
    acknowledgeCurrentRelease({ storage: writeBlocked }),
    false,
  );
});

test("depolama bulunmayan ortamda güvenli biçimde sessiz kalır", () => {
  const state = inspectCurrentRelease({ storage: null });

  assert.deepEqual(state, {
    kind: "storage_unavailable",
    release: CURRENT_RELEASE,
    previousVersion: null,
    shouldPresent: false,
    storageAvailable: false,
  });
  assert.equal(acknowledgeCurrentRelease({ storage: null }), false);
});

test("geçersiz onay saati storage alanına yazılmaz", () => {
  const storage = new MemoryStorage();

  assert.equal(
    acknowledgeCurrentRelease({
      storage,
      acknowledgedAt: new Date("geçersiz"),
    }),
    false,
  );
  assert.equal(storage.getItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY), null);
});
