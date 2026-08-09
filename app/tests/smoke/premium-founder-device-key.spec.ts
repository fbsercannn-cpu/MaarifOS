import { expect, test } from "@playwright/test";

test("premium cihaz anahtarı IDB roundtrip sonrası Chromium/WebKit'te imza doğrular", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const premium = await import("/src/features/premium-access/index.ts");
    const databaseName = `maarifos-founder-key-smoke-${crypto.randomUUID()}`;
    const store = new premium.IndexedDbPremiumDeviceIdentityStore(databaseName);
    const nativeStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = ((value: unknown, options?: StructuredSerializeOptions) => {
      if (
        value instanceof CryptoKey ||
        (value && typeof value === "object" &&
          Object.values(value).some((nested) => nested instanceof CryptoKey))
      ) {
        throw new DOMException(
          "CryptoKey redundant JS structuredClone smoke tarafından engellendi.",
          "DataCloneError",
        );
      }
      return nativeStructuredClone(value, options);
    }) as typeof structuredClone;

    try {
      const [first, concurrent] = await Promise.all([
        premium.getOrCreatePremiumDeviceIdentity(store),
        premium.getOrCreatePremiumDeviceIdentity(store),
      ]);
      const message = new TextEncoder().encode("maarifos-founder-key-smoke");
      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        first.privateKey,
        message,
      );
      const verifies = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        first.publicKey,
        signature,
        message,
      );
      store.close();
      return {
        sameIdentity: first.thumbprint === concurrent.thumbprint,
        verifies,
        privateExtractable: first.privateKey.extractable,
      };
    } finally {
      globalThis.structuredClone = nativeStructuredClone;
    }
  });

  expect(result.sameIdentity).toBe(true);
  expect(result.verifies).toBe(true);
  expect(result.privateExtractable).toBe(false);
});

test("premium lisans IDB blocked ve versionchange durumlarında fail-closed kalır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const premium = await import("/src/features/premium-access/index.ts");

    const blockedName = `maarifos-founder-blocked-smoke-${crypto.randomUUID()}`;
    const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(blockedName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const blockedStore = new premium.IndexedDbPremiumDeviceIdentityStore(blockedName);
    let blockedReason = "";
    try {
      await blockedStore.load();
    } catch (error) {
      blockedReason = error instanceof premium.PremiumLicenseStorageError
        ? error.reason
        : "unexpected";
    } finally {
      blocker.close();
      blockedStore.close();
    }

    const changedName = `maarifos-founder-versionchange-smoke-${crypto.randomUUID()}`;
    const changedStore = new premium.IndexedDbPremiumDeviceIdentityStore(changedName);
    await premium.getOrCreatePremiumDeviceIdentity(changedStore);
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        changedName,
        premium.PREMIUM_LICENSE_DATABASE_VERSION + 1,
      );
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("versionchange blocked"));
    });
    let versionChangedReason = "";
    try {
      await changedStore.load();
    } catch (error) {
      versionChangedReason = error instanceof premium.PremiumLicenseStorageError
        ? error.reason
        : "unexpected";
    } finally {
      changedStore.close();
      upgraded.close();
    }

    return { blockedReason, versionChangedReason };
  });

  expect(result.blockedReason).toBe("open-blocked");
  expect(result.versionChangedReason).toBe("version-changed");
});
