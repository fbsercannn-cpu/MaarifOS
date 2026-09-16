import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const screenSource = await readFile(
  new URL(
    "../../src/features/premium-plans/PremiumPlanCenterScreen.tsx",
    import.meta.url,
  ),
  "utf8",
);

function sourceBetween(startMarker, endMarker) {
  const start = screenSource.indexOf(startMarker);
  const end = screenSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} kaynakta bulunmalı`);
  assert.notEqual(end, -1, `${endMarker} kaynakta bulunmalı`);
  return screenSource.slice(start, end);
}

test("premium plan merkezi etkin olmayan entitlement durumlarını açık salt-okunur gerekçeyle sunar", () => {
  const presentation = sourceBetween(
    "export function premiumPlanReadOnlyPresentation",
    "export function assertPremiumPlanMutationAccess",
  );

  assert.match(presentation, /access\?\.status === "expired"/);
  assert.match(presentation, /access\?\.status === "refresh-required"/);
  assert.match(presentation, /access\?\.status === "revoked"/);
  assert.match(presentation, /Mevcut öğretmen planlarınız okunabilir kalır/);
  assert.match(presentation, /yeni premium plan, tercih veya değerlendirme kaydı oluşturulmaz/);
  assert.match(screenSource, /id=\{PREMIUM_READ_ONLY_REASON_ID\}/);
  assert.match(screenSource, /role="status"/);
  assert.match(screenSource, /aria-live="polite"/);
});

test("lens, haftalık ve aylık kalıcı yazımları entitlement'ı işlem anında yeniden doğrular", () => {
  const lensHandler = sourceBetween(
    "const applyLensPreference = async () =>",
    "const useActivity =",
  );
  const weeklyHandler = sourceBetween(
    "const saveWeeklyReview = async () =>",
    "const loadMonthlyEvaluationIntoForm =",
  );
  const monthlyHandler = sourceBetween(
    "const saveMonthlyReview = async () =>",
    "const weeklyCarryForwardForWeek =",
  );

  for (const [label, handler, writeCall] of [
    ["lens", lensHandler, "updatePremiumPlanLensPreferences"],
    ["haftalık", weeklyHandler, "recordPremiumWeeklyEvaluation"],
    ["aylık", monthlyHandler, "recordPremiumMonthlyEvaluation"],
  ]) {
    const guardIndex = handler.indexOf("assertPremiumPlanMutationAccess(");
    const writeIndex = handler.indexOf(writeCall);
    assert.ok(guardIndex >= 0, `${label} yazımı entitlement guard'ı taşımalı`);
    assert.ok(writeIndex >= 0, `${label} kalıcı yazım çağrısı bulunmalı`);
    assert.ok(
      guardIndex < writeIndex,
      `${label} entitlement guard'ı kalıcı yazımdan hemen önce çalışmalı`,
    );
  }
});

test("erişim kapanınca düzenleme kontrolleri fail-closed olurken kurulu plan inceleme yolları açık kalır", () => {
  assert.match(
    screenSource,
    /disabled=\{[\s\S]{0,100}busy \|\|[\s\S]{0,100}readOnlyPresentation\.mutationsBlocked[\s\S]{0,100}!lensPreferenceDirty/,
    "lens tercihi kaydı salt-okunur durumda kapanmalı",
  );
  assert.match(
    screenSource,
    /reviewBusy \|\|\s*readOnlyPresentation\.mutationsBlocked \|\|/,
    "haftalık değerlendirme kaydı salt-okunur durumda kapanmalı",
  );
  assert.match(
    screenSource,
    /monthlyReviewBusy \|\|\s*readOnlyPresentation\.mutationsBlocked \|\|/,
    "aylık değerlendirme kaydı salt-okunur durumda kapanmalı",
  );
  assert.match(
    screenSource,
    /disabled=\{!installed \|\| reviewBusy\}/,
    "haftalık plan ve değerlendirme okuma girişi entitlement yüzünden kapanmamalı",
  );
  assert.match(
    screenSource,
    /disabled=\{!installed \|\| monthlyReviewBusy\}/,
    "aylık plan ve değerlendirme okuma girişi entitlement yüzünden kapanmamalı",
  );
  assert.match(
    screenSource,
    /!readOnlyPresentation\.mutationsBlocked \? \(/,
    "premium ekran içindeki değer kanıtı yazım editörü erişim kapanınca unmount edilmeli",
  );
});

test("ortak built-in mod exact kaynak erişimini kullanır ve görünür kopyası ticari dil taşımaz", () => {
  assert.match(screenSource, /sharedBuiltInAccess\?: boolean/u);
  assert.match(screenSource, /createSharedBuiltInAccess\(pack\)/u);
  assert.match(
    screenSource,
    /sharedBuiltInAccess\s*\? loadSharedBuiltInMaarifPlanPack\(sharedBuiltInPackReference\)/u,
  );
  assert.match(
    screenSource,
    /reference\s*\? loaders\.loadSnapshot\(reference\)\s*:\s*loaders\.loadCurrent\(\)/u,
  );
  assert.match(
    screenSource,
    /sharedBuiltInAccess \? "MaarifOS · " : "MaarifOS Premium · "/u,
  );
  assert.match(
    screenSource,
    /sharedBuiltInAccess[\s\S]{0,120}<ReaderIcon aria-hidden="true" \/>[\s\S]{0,120}<LockClosedIcon/u,
  );
  assert.match(
    screenSource,
    /!sharedBuiltInAccess && effectivePremiumAccess\?\.grant\.accessMode === "trial"/u,
  );

  const sharedPresentation = sourceBetween(
    "if (sharedBuiltInAccess) {",
    'if (effectivePremiumAccess?.source === "development-preview")',
  );
  const visibleStringLiterals = [...sharedPresentation.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/gu)]
    .map((match) => match[1]);
  assert.ok(visibleStringLiterals.length >= 8);
  for (const visibleText of visibleStringLiterals) {
    assert.doesNotMatch(
      visibleText,
      /premium|demo|deneme|kurucu|satın alma|cihaz hakkı|lisans|kilit/iu,
    );
  }
  assert.match(sharedPresentation, /Hazır Maarif planları kullanıma açık/u);
  assert.match(sharedPresentation, /Ortak erişimde açık/u);
  assert.match(
    screenSource,
    /Makine doğrulaması tamamlandı; erken çocukluk[\s\S]{0,220}insan uzman incelemeleri bekliyor/u,
  );
});
