import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  builtInPackReferenceFromInstalledPlan,
  loadBuiltInMaarifPlanPack,
  loadBuiltInMaarifPlanPackForSnapshot,
} from "../../src/features/premium-plans/built-in-maarif-content.ts";
import { createSharedBuiltInAccess } from "../../src/features/premium-access/entitlement.ts";

const SOURCE_BY_PATH = new Map([
  [
    "/assets/maarif-content/tymm-6072-2026-09-v3.json",
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/content.v3.json",
      import.meta.url,
    ),
  ],
  [
    "/assets/maarif-content/tymm-6072-2026-09-manifest-v3.json",
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/manifest.v3.json",
      import.meta.url,
    ),
  ],
  [
    "/assets/maarif-content/tymm-6072-2026-09-v2.json",
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/content.v2.json",
      import.meta.url,
    ),
  ],
  [
    "/assets/maarif-content/values-pedagogy-constitution.v1.json",
    new URL(
      "../../src/features/values/values-pedagogy-constitution.v1.json",
      import.meta.url,
    ),
  ],
  [
    "/assets/maarif-content/official-preschool-value-actions.v1.json",
    new URL(
      "../../src/features/values/official-preschool-value-actions.v1.json",
      import.meta.url,
    ),
  ],
]);

async function exactSourceFetcher(input) {
  const path = new URL(String(input), "https://maarifos.test/").pathname;
  const source = SOURCE_BY_PATH.get(path);
  if (!source) return new Response("not found", { status: 404 });
  const bytes = await readFile(source);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-length": String(bytes.byteLength),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

test("yerleşik Maarif plan kaynağı entitlement veya DEV olmadan exact v3 zincirini açar", async () => {
  const pack = await loadBuiltInMaarifPlanPack({ fetcher: exactSourceFetcher });

  assert.equal(pack.id, "maarifos-tymm-6072-2026-2027-v3");
  assert.equal(pack.version, "3.0.0");
  assert.equal(pack.program, "tymm_2024");
  assert.equal(pack.ageProfile, "60-72");
  assert.equal(pack.activities.length, 12);
  assert.equal(pack.weeks.length, 4);
  assert.equal(pack.annualMonths.length, 10);
  assert.equal(
    pack.valuesMappingStatus,
    "machine_validated_pending_human_review",
  );
});

test("yerleşik Maarif plan kaynağı tek, değişmez ve yeniden kullanılabilir nesne döndürür", async () => {
  const first = await loadBuiltInMaarifPlanPack({ fetcher: exactSourceFetcher });
  const second = await loadBuiltInMaarifPlanPack({ fetcher: exactSourceFetcher });

  assert.equal(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.activities), true);
  assert.equal(Object.isFrozen(first.activities[0]), true);
  assert.throws(() => {
    first.activities[0].title = "Değiştirildi";
  }, TypeError);
});

test("snapshot-aware resolver exact legacy v2 kaydını kendi değişmez kaynağıyla açar", async () => {
  const pack = await loadBuiltInMaarifPlanPackForSnapshot(
    {
      id: "maarifos-tymm-6072-2026-2027-v2",
      version: "2.0.0",
      manifestDigest:
        "sha256:f59acdadd13d535936ef23bd4667914e49ef8cec96a5acc72ef33008a979d2a1",
    },
    { fetcher: exactSourceFetcher },
  );

  assert.equal(pack.id, "maarifos-tymm-6072-2026-2027-v2");
  assert.equal(pack.version, "2.0.0");
  assert.equal(pack.valuesMappingStatus, "legacy-unmapped");
  assert.equal(Object.isFrozen(pack), true);
});

test("kurulu v2 sağlayıcı CTA'sı exact snapshot referansını ortak merkeze uçtan uca taşır", async () => {
  const [teacherScreen, prototype, planCenter] = await Promise.all([
    readFile(
      new URL(
        "../../src/features/planning/TeacherOwnedPlanScreen.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../../src/features/premium-plans/PremiumPlanCenterScreen.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(
    teacherScreen,
    /onOpenProviderLibrary\(\s*"monthly",\s*sourceBuiltInPackReference \?\? undefined,\s*\)/u,
  );
  assert.match(
    prototype,
    /setPremiumPlanBuiltInReference\(builtInPackReference\)/u,
  );
  assert.match(
    prototype,
    /sharedBuiltInPackReference=\{premiumPlanBuiltInReference\}/u,
  );
  assert.match(
    planCenter,
    /loadSharedBuiltInMaarifPlanPack\(sharedBuiltInPackReference\)/u,
  );
  assert.match(
    planCenter,
    /reference\s*\? loaders\.loadSnapshot\(reference\)\s*:\s*loaders\.loadCurrent\(\)/u,
  );

  const v2 = await loadBuiltInMaarifPlanPackForSnapshot(
    {
      id: "maarifos-tymm-6072-2026-2027-v2",
      version: "2.0.0",
      manifestDigest:
        "sha256:f59acdadd13d535936ef23bd4667914e49ef8cec96a5acc72ef33008a979d2a1",
    },
    { fetcher: exactSourceFetcher },
  );
  assert.equal(v2.id, "maarifos-tymm-6072-2026-2027-v2");
  assert.notEqual(v2.id, "maarifos-tymm-6072-2026-2027-v3");
});

test("kurulu provider annual kaydı snapshot ve üst kayıt kimliği uyuştuğunda exact referans üretir", () => {
  const reference = builtInPackReferenceFromInstalledPlan({
    contentPackId: "maarifos-tymm-6072-2026-2027-v2",
    contentPackVersion: "2.0.0",
    contentPackSnapshot: {
      id: "maarifos-tymm-6072-2026-2027-v2",
      version: "2.0.0",
      manifestDigest:
        "sha256:f59acdadd13d535936ef23bd4667914e49ef8cec96a5acc72ef33008a979d2a1",
    },
  });

  assert.deepEqual(reference, {
    id: "maarifos-tymm-6072-2026-2027-v2",
    version: "2.0.0",
    manifestDigest:
      "sha256:f59acdadd13d535936ef23bd4667914e49ef8cec96a5acc72ef33008a979d2a1",
  });
  assert.throws(
    () => builtInPackReferenceFromInstalledPlan({
      contentPackId: "maarifos-tymm-6072-2026-2027-v2",
      contentPackVersion: "3.0.0",
      contentPackSnapshot: reference,
    }),
    /planı ile içerik snapshot kimliği uyuşmuyor/u,
  );
  assert.throws(
    () => builtInPackReferenceFromInstalledPlan({
      contentPackId: reference.id,
      contentPackVersion: reference.version,
    }),
    /doğrulanmış içerik snapshot'ı bulunamadı/u,
  );
});

test("snapshot-aware resolver karışık veya bilinmeyen id/version/digest bileşimini fail-closed reddeder", async () => {
  await assert.rejects(
    loadBuiltInMaarifPlanPackForSnapshot(
      {
        id: "maarifos-tymm-6072-2026-2027-v2",
        version: "3.0.0",
        manifestDigest:
          "sha256:9b4c2bcc155e3f6f8567ba5737249cd417405bc4205b75b68d194e63ca3eff1e",
      },
      { fetcher: exactSourceFetcher },
    ),
    /yalnız exact v2 veya v3 snapshot kimliğiyle/u,
  );
  await assert.rejects(
    loadBuiltInMaarifPlanPackForSnapshot(
      {
        id: "bilinmeyen-paket",
        version: "1.0.0",
        manifestDigest: `sha256:${"0".repeat(64)}`,
      },
      { fetcher: exactSourceFetcher },
    ),
    /yalnız exact v2 veya v3 snapshot kimliğiyle/u,
  );
});

test("shared built-in uyumluluk erişimi yalnız exact v2/v3 paketlere verilir", async () => {
  const currentPack = await loadBuiltInMaarifPlanPack({ fetcher: exactSourceFetcher });
  const access = createSharedBuiltInAccess(currentPack);

  assert.equal(access.source, "shared-built-in");
  assert.equal(access.canUsePremiumContent, true);
  assert.equal(access.canExportPremiumContent, true);
  assert.equal(access.grant.contentPackId, currentPack.id);
  assert.throws(
    () => createSharedBuiltInAccess({ ...currentPack, manifestDigest: `sha256:${"0".repeat(64)}` }),
    /Yerleşik Maarif içerik kimliği doğrulanamadı/u,
  );
});
