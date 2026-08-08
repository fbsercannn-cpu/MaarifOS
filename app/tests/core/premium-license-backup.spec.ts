import { expect, test } from "@playwright/test";

test("premium lisans sırlarını ana veri yedeğinden ayrı tutar", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const premium = await import(
      "/src/features/premium-access/license-store.ts"
    );
    const mainStore = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-license-backup-${crypto.randomUUID()}`,
    });
    const licenseStore = new premium.IndexedDbPremiumEntitlementStore(
      `maarifos-test-license-vault-${crypto.randomUUID()}`,
    );
    const secretMarkers = {
      token: "SIGNED-ENTITLEMENT-TOKEN-DO-NOT-BACKUP",
      rawCode: "RAW-REDEEM-CODE-DO-NOT-BACKUP",
      recoverySecret: "RECOVERY-SECRET-DO-NOT-BACKUP",
      privateKey: "DEVICE-PRIVATE-KEY-DO-NOT-BACKUP",
    };
    const token = Object.values(secretMarkers).join(".");
    await licenseStore.save({
      token,
      claims: {
        ver: 1,
        iss: "https://license.maarifos.example",
        aud: "maarifos-mobile",
        jti: "00000000-0000-4000-8000-000000000951",
        entitlementId: "00000000-0000-4000-8000-000000000952",
        deviceKeyThumbprint: `sha256:${"A".repeat(43)}`,
        grants: [{
          sku: "maarifos.tymm.6072.annual",
          contentReleaseId: "tymm-6072-2026-09-v2",
          contentPackId: "tymm-6072",
          contentPackVersion: "2.0.0",
          manifestDigest: `sha256:${"a".repeat(64)}`,
          accessMode: "purchased",
          academicRelease: "2026-2027",
          trialStartedAt: null,
          accessExpiresAt: null,
        }],
        issuedAt: 1_788_225_600,
        notBefore: 1_788_225_600,
        refreshAfter: 1_788_830_400,
        offlineUntil: 1_790_817_600,
        archiveAccessAfter: 1_790_817_600,
        revocationGeneration: 1,
        legalTermsVersion: "2026-01",
      },
      savedAtUtc: "2026-09-01T06:00:00.000Z",
      maxObservedWallClockUtc: "2026-09-01T06:00:00.000Z",
    });
    await Promise.all([
      licenseStore.updateMaxObservedWallClock(new Date("2026-09-01T08:00:00.000Z")),
      licenseStore.updateMaxObservedWallClock(new Date("2026-09-01T07:00:00.000Z")),
    ]);
    const backupService = new core.BackupService(mainStore, {
      appVersion: "0.7.0-test",
      clock: () => new Date("2026-09-01T06:30:00.000Z"),
      civilDateProvider: () => "2026-09-01",
    });
    const serializedBackup = backupService.serializeBackup(
      await backupService.exportBackup(),
    );
    const storedLicense = await licenseStore.load();
    mainStore.close();
    licenseStore.close();
    return {
      serializedBackup,
      storedToken: storedLicense?.token ?? "",
      maxObservedWallClockUtc: storedLicense?.maxObservedWallClockUtc ?? "",
      secretMarkers,
    };
  });

  for (const secret of Object.values(result.secretMarkers)) {
    expect(result.serializedBackup).not.toContain(secret);
  }
  expect(result.storedToken).toContain(result.secretMarkers.token);
  expect(result.storedToken).toContain(result.secretMarkers.rawCode);
  expect(result.storedToken).toContain(result.secretMarkers.recoverySecret);
  expect(result.storedToken).toContain(result.secretMarkers.privateKey);
  expect(result.maxObservedWallClockUtc).toBe("2026-09-01T08:00:00.000Z");
});

test("cihaz kimliği tekildir, kalıcıdır ve özel anahtar dışarı çıkarılamaz", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const premium = await import("/src/features/premium-access/index.ts");
    const databaseName = `maarifos-test-device-identity-${crypto.randomUUID()}`;
    const firstStore = new premium.IndexedDbPremiumDeviceIdentityStore(databaseName);
    const [first, concurrent] = await Promise.all([
      premium.getOrCreatePremiumDeviceIdentity(
        firstStore,
        new Date("2026-09-01T06:00:00.000Z"),
      ),
      premium.getOrCreatePremiumDeviceIdentity(
        firstStore,
        new Date("2026-09-01T06:00:01.000Z"),
      ),
    ]);
    firstStore.close();
    const reopenedStore = new premium.IndexedDbPremiumDeviceIdentityStore(databaseName);
    const reopened = await premium.getOrCreatePremiumDeviceIdentity(reopenedStore);
    const message = new TextEncoder().encode("maarifos-device-proof");
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      reopened.privateKey,
      message,
    );
    const verifies = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      reopened.publicKey,
      signature,
      message,
    );
    let privateExportError = "";
    try {
      await crypto.subtle.exportKey("jwk", reopened.privateKey);
    } catch (error) {
      privateExportError = error instanceof Error ? error.name : String(error);
    }
    reopenedStore.close();
    return {
      firstThumbprint: first.thumbprint,
      concurrentThumbprint: concurrent.thumbprint,
      reopenedThumbprint: reopened.thumbprint,
      publicJwkHasPrivateValue: "d" in reopened.publicJwk,
      privateExtractable: reopened.privateKey.extractable,
      privateExportError,
      verifies,
    };
  });

  expect(result.firstThumbprint).toMatch(/^sha256:[A-Za-z0-9_-]{43}$/);
  expect(result.concurrentThumbprint).toBe(result.firstThumbprint);
  expect(result.reopenedThumbprint).toBe(result.firstThumbprint);
  expect(result.publicJwkHasPrivateValue).toBe(false);
  expect(result.privateExtractable).toBe(false);
  expect(result.privateExportError).toBe("InvalidAccessError");
  expect(result.verifies).toBe(true);
});
