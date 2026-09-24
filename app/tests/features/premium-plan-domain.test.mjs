import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import { PREMIUM_PILOT_LENS_IDS } from "../../src/features/premium-plans/lens-catalog.ts";

const contentUrl = new URL(
  "../../../premium-content/releases/tymm-6072/2026-09/content.v2.json",
  import.meta.url,
);

async function sourcePack() {
  return JSON.parse(await readFile(contentUrl, "utf8"));
}

async function sourcePackText() {
  return readFile(contentUrl, "utf8");
}

const profile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

test("kapalı pilot paketi dört hafta, on iki özgün etkinlik, tam gün akışı ve doğrulanmış TYMM hedefleri taşır", async () => {
  const pack = parsePremiumContentPack(await sourcePack());
  assert.equal(pack.status, "internal_pilot");
  assert.equal(pack.accessMode, "staff-code");
  assert.deepEqual(new Set(pack.lenses.map((lens) => lens.id)), new Set(PREMIUM_PILOT_LENS_IDS));
  assert.equal(pack.annualMonths.length, 10);
  assert.equal(pack.weeks.length, 4);
  assert.equal(pack.activities.length, 12);
  assert.equal(pack.fullDayFlow.length, 10);
  assert.equal(new Set(pack.activities.map((activity) => activity.id)).size, 12);
  assert.equal(pack.valuesMappingStatus, "legacy-unmapped");
  assert.equal(pack.valuesContract, null);
  assert.ok(pack.activities.every((activity) => activity.valuesDesign === null));

  for (const week of pack.weeks) {
    const weekActivities = pack.activities.filter((activity) => activity.weekId === week.id);
    assert.equal(weekActivities.filter((activity) => activity.activityRole === "main").length, 2);
    assert.equal(weekActivities.filter((activity) => activity.activityRole === "alternative").length, 1);
  }

  const officialCodes = new Set(
    curriculumTargetsForProfile(profile, "60-72").map((target) => target.referenceCode),
  );
  for (const activity of pack.activities) {
    assert.ok(activity.curriculumTargetCodes.length > 0);
    assert.ok(activity.curriculumTargetCodes.every((code) => officialCodes.has(code)));
    assert.ok(activity.processSteps.length >= 4);
    assert.ok(activity.preparation.length >= 1);
    assert.ok(activity.evidenceOptions.length >= 2);
    assert.ok(activity.differentiation.length >= 2);
    assert.ok(activity.safetyNotes.length >= 2);
    assert.ok(activity.indoorEquivalent.length > 0);
    assert.ok(activity.transitionSupport.length > 0);
  }
});

test("content.v2 byte-for-byte korunur ve sonradan değer eşlemesi uydurulmaz", async () => {
  const source = await sourcePackText();
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "f096c3d98990796c11e4b72747458248e2fd7a530dd54102acba9ddea996d8e5",
  );
  const injected = JSON.parse(source);
  injected.activities[0].valuesDesign = null;
  assert.throws(
    () => parsePremiumContentPack(injected),
    /Legacy premium paketler geriye dönük değer eşlemesi taşıyamaz/,
  );
});

test("paket codec'i fazla alanı, pilot dışı lensi ve on üçüncü etkinliği reddeder", async () => {
  const raw = await sourcePack();
  assert.throws(() => parsePremiumContentPack({ ...raw, leakedSecret: "x" }), /beklenmeyen alan/);

  const wrongLens = structuredClone(raw);
  wrongLens.lenses[0].id = "nature-outdoor";
  assert.throws(() => parsePremiumContentPack(wrongLens), /sabit altı/);

  const thirteenthActivity = structuredClone(raw);
  thirteenthActivity.activities.push(structuredClone(thirteenthActivity.activities[0]));
  thirteenthActivity.activities[12].id = "thirteenth";
  assert.throws(() => parsePremiumContentPack(thirteenthActivity), /dört hafta ve on iki/);

  const wrongRole = structuredClone(raw);
  wrongRole.activities[0].activityRole = "alternative";
  assert.throws(() => parsePremiumContentPack(wrongRole), /iki ana ve bir alternatif/);

  const wrongFlow = structuredClone(raw);
  [wrongFlow.fullDayFlow[0], wrongFlow.fullDayFlow[1]] = [
    wrongFlow.fullDayFlow[1],
    wrongFlow.fullDayFlow[0],
  ];
  assert.throws(() => parsePremiumContentPack(wrongFlow), /kanonik sırada/);

  const duplicateLens = structuredClone(raw);
  duplicateLens.lenses.push(structuredClone(duplicateLens.lenses[0]));
  assert.throws(() => parsePremiumContentPack(duplicateLens), /sabit altı/);

  const impossibleDate = structuredClone(raw);
  impossibleDate.weeks[0].periodStart = "2026-09-98";
  impossibleDate.weeks[0].periodEnd = "2026-09-99";
  impossibleDate.activities
    .filter((activity) => activity.weekId === impossibleDate.weeks[0].id)
    .forEach((activity) => { activity.recommendedCivilDate = "2026-09-98"; });
  assert.throws(() => parsePremiumContentPack(impossibleDate), /geçerli bir 2026-09/);

  const duplicateWeekActivity = structuredClone(raw);
  duplicateWeekActivity.weeks[0].activityIds[1] = duplicateWeekActivity.weeks[0].activityIds[0];
  assert.throws(() => parsePremiumContentPack(duplicateWeekActivity), /Hafta etkinlik ilişkisi/);
});

test("premium etkinlik metni app/src altında statik modül olarak bulunmaz", async () => {
  await assert.rejects(
    readFile(new URL("../../src/features/premium-plans/tymm-6072-september.ts", import.meta.url), "utf8"),
  );
});
