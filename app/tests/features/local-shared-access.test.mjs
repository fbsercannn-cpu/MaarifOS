import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  grantLocalSharedAccess,
  hasLocalSharedAccess,
  inspectLocalSharedAccess,
  LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
  LOCAL_SHARED_ACCESS_STORAGE_KEY,
  LOCAL_SHARED_ACCESS_VERIFIER_ID,
  resetLocalSharedAccess,
  verifyLocalSharedAccessCode,
} from "../../src/features/access/local-shared-access.ts";

const ACCESS_CODE = ["43", "85", "79"].join("");

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, value);
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

test("yalnız ASCII altı haneli doğru davet kodu sabit digest ile doğrulanır", async () => {
  assert.equal(
    await verifyLocalSharedAccessCode(ACCESS_CODE, webcrypto.subtle),
    true,
  );
  assert.equal(
    await verifyLocalSharedAccessCode(`${ACCESS_CODE.slice(0, 5)}0`, webcrypto.subtle),
    false,
  );
  assert.equal(await verifyLocalSharedAccessCode("４３８５７９", webcrypto.subtle), false);
  assert.equal(await verifyLocalSharedAccessCode(` ${ACCESS_CODE}`, webcrypto.subtle), false);
  assert.equal(await verifyLocalSharedAccessCode(ACCESS_CODE, null), false);
});

test("başarılı erişim yalnız sürüm, doğrulayıcı ve UTC zamanını saklar", async () => {
  const storage = new MemoryStorage();
  const result = await grantLocalSharedAccess({
    code: ACCESS_CODE,
    storage,
    subtle: webcrypto.subtle,
    now: new Date("2026-08-22T08:15:30.000Z"),
  });

  assert.deepEqual(result, {
    ok: true,
    grant: {
      schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
      verifierId: LOCAL_SHARED_ACCESS_VERIFIER_ID,
      grantedAtUtc: "2026-08-22T08:15:30.000Z",
    },
  });

  const persisted = JSON.parse(storage.getItem(LOCAL_SHARED_ACCESS_STORAGE_KEY));
  assert.deepEqual(Object.keys(persisted).sort(), [
    "grantedAtUtc",
    "schemaVersion",
    "verifierId",
  ]);
  assert.equal(JSON.stringify(persisted).includes(ACCESS_CODE), false);
  assert.equal(hasLocalSharedAccess(storage), true);
});

test("yanlış kod storage alanına hiçbir erişim onayı yazmaz", async () => {
  const storage = new MemoryStorage();
  const result = await grantLocalSharedAccess({
    code: `${ACCESS_CODE.slice(0, 5)}0`,
    storage,
    subtle: webcrypto.subtle,
  });

  assert.deepEqual(result, { ok: false, reason: "invalid_code" });
  assert.equal(storage.getItem(LOCAL_SHARED_ACCESS_STORAGE_KEY), null);
});

test("bozuk, eski şemalı ve beklenmeyen alanlı grant fail-closed kalır", () => {
  const invalidValues = [
    "{bozuk",
    JSON.stringify({
      schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION + 1,
      verifierId: LOCAL_SHARED_ACCESS_VERIFIER_ID,
      grantedAtUtc: "2026-08-22T08:15:30.000Z",
    }),
    JSON.stringify({
      schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
      verifierId: "eski-dogrulayici",
      grantedAtUtc: "2026-08-22T08:15:30.000Z",
    }),
    JSON.stringify({
      schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
      verifierId: LOCAL_SHARED_ACCESS_VERIFIER_ID,
      grantedAtUtc: "2026-08-22",
    }),
    JSON.stringify({
      schemaVersion: LOCAL_SHARED_ACCESS_SCHEMA_VERSION,
      verifierId: LOCAL_SHARED_ACCESS_VERIFIER_ID,
      grantedAtUtc: "2026-08-22T08:15:30.000Z",
      studentData: "saklanmamalı",
    }),
  ];

  for (const value of invalidValues) {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_SHARED_ACCESS_STORAGE_KEY, value);
    assert.equal(inspectLocalSharedAccess(storage).kind, "invalid");
    assert.equal(hasLocalSharedAccess(storage), false);
  }
});

test("storage engelleri ve geçersiz saat güvenli biçimde erişimi reddeder", async () => {
  const blockedStorage = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("SecurityError");
    },
    removeItem() {
      throw new Error("SecurityError");
    },
  };

  assert.equal(inspectLocalSharedAccess(blockedStorage).kind, "storage_unavailable");
  assert.equal(hasLocalSharedAccess(blockedStorage), false);
  assert.deepEqual(
    await grantLocalSharedAccess({
      code: ACCESS_CODE,
      storage: blockedStorage,
      subtle: webcrypto.subtle,
    }),
    { ok: false, reason: "environment_unavailable" },
  );
  assert.deepEqual(
    await grantLocalSharedAccess({
      code: ACCESS_CODE,
      storage: new MemoryStorage(),
      subtle: webcrypto.subtle,
      now: new Date("geçersiz"),
    }),
    { ok: false, reason: "environment_unavailable" },
  );
});

test("reset yalnız davet grantini siler, başka yerel kayıtları korur", async () => {
  const storage = new MemoryStorage();
  storage.setItem("maarifos.classroom.fixture", "korunacak-sınıf");
  await grantLocalSharedAccess({
    code: ACCESS_CODE,
    storage,
    subtle: webcrypto.subtle,
  });

  assert.equal(resetLocalSharedAccess(storage), true);
  assert.equal(storage.getItem(LOCAL_SHARED_ACCESS_STORAGE_KEY), null);
  assert.equal(storage.getItem("maarifos.classroom.fixture"), "korunacak-sınıf");
});

test("istemci kaynağı kodu plaintext taşımaz ve erişim yüzeyi KeyboardInput kullanır", async () => {
  const [domainSource, screenSource] = await Promise.all([
    readFile(
      new URL("../../src/features/access/local-shared-access.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../src/features/access/InviteAccessScreen.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.equal(domainSource.includes(ACCESS_CODE), false);
  assert.equal(screenSource.includes(ACCESS_CODE), false);
  assert.match(domainSource, /resolvedSubtle\.digest\(\s*"SHA-256"/);
  assert.doesNotMatch(domainSource, /\bfetch\s*\(/);
  assert.match(screenSource, /<KeyboardInput/);
  assert.doesNotMatch(screenSource, /<input\b/);
  assert.match(screenSource, /setCode\(""\)[\s\S]*?grantLocalSharedAccess/);
});
