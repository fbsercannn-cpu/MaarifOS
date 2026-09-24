import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prototypeSource = await readFile(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);
const prototypeCssSource = await readFile(
  new URL("../../src/prototype.css", import.meta.url),
  "utf8",
);

function sourceBetween(start, end, source = prototypeSource) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} kaynakta bulunamadı`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `${end} kaynakta bulunamadı`);
  return source.slice(startIndex, endIndex);
}

function testIdButtonSource(testId) {
  const marker = `data-testid="${testId}"`;
  const markerIndex = prototypeSource.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${testId} düğmesi bulunamadı`);
  const openingIndex = prototypeSource.lastIndexOf("<button", markerIndex);
  const closingIndex = prototypeSource.indexOf("</button>", markerIndex);
  assert.notEqual(openingIndex, -1, `${testId} açılış etiketi bulunamadı`);
  assert.notEqual(closingIndex, -1, `${testId} kapanış etiketi bulunamadı`);
  return prototypeSource.slice(openingIndex, closingIndex + "</button>".length);
}

function pixelMinHeights(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockPattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "gu");
  const values = [];
  for (const match of prototypeCssSource.matchAll(blockPattern)) {
    for (const height of match[1].matchAll(/min-height:\s*(\d+(?:\.\d+)?)px/gu)) {
      values.push(Number(height[1]));
    }
  }
  return values;
}

test("çocuk ekranındaki yetişkin handoff ve çıkış kısa pointer tıklamasıyla kapanamaz", () => {
  const dialogSource = sourceBetween(
    "function TymmChildParticipationDialog(",
    "export default function Prototype()",
  );
  const adultExitButton = testIdButtonSource("tymm-child-adult-exit");
  const handoffButton = testIdButtonSource("tymm-child-handoff");

  assert.match(dialogSource, /const TYMM_ADULT_HOLD_MS\s*=\s*1_400/);
  for (const [label, button] of [
    ["yetişkin çıkışı", adultExitButton],
    ["öğretmene handoff", handoffButton],
  ]) {
    assert.match(button, /onPointerDown=/, `${label} hold başlangıcını dinlemeli`);
    assert.match(button, /onPointerUp=/, `${label} kısa basmayı iptal etmeli`);
    assert.match(button, /onPointerCancel=/, `${label} pointer iptalini kapatmalı`);
  }

  assert.doesNotMatch(
    adultExitButton,
    /onClick=\{\(\)\s*=>\s*onAdultExit\(\)\}/,
    "yetişkin çıkışı doğrudan click callback'i olamaz",
  );
  assert.doesNotMatch(
    handoffButton,
    /onClick=\{\(\)\s*=>\s*onHandoff\(/,
    "handoff doğrudan click callback'i olamaz",
  );
});

test("1400 ms hold pointer için ortak güvenlik eşiğidir; klavye ve AT sentetik aktivasyonu iki aşamalıdır", () => {
  const dialogSource = sourceBetween(
    "function TymmChildParticipationDialog(",
    "export default function Prototype()",
  );
  const adultExitButton = testIdButtonSource("tymm-child-adult-exit");
  const handoffButton = testIdButtonSource("tymm-child-handoff");

  assert.match(dialogSource, /const TYMM_ADULT_HOLD_MS\s*=\s*1_400/);
  assert.match(
    dialogSource,
    /const beginAdultHold = \(action:[\s\S]{0,500}window\.setTimeout\([\s\S]{0,220}completeAdultAction\(action\)[\s\S]{0,80}TYMM_ADULT_HOLD_MS/,
  );
  assert.match(dialogSource, /data-testid="tymm-adult-confirmation"/);
  assert.match(dialogSource, /data-testid="tymm-adult-confirm-action"/);
  assert.match(
    dialogSource,
    /onClick=\{\(\) => completeAdultAction\(adultConfirmationAction\)\}/,
  );

  for (const [label, action, button] of [
    ["yetişkin çıkışı", "exit", adultExitButton],
    ["öğretmene handoff", "handoff", handoffButton],
  ]) {
    assert.match(
      button,
      new RegExp(`beginAdultHold\\("${action}"\\)`),
      `${label} 1400 ms hold yoluna bağlanmalı`,
    );
    assert.match(button, /onKeyDown=/, `${label} klavye basışını dinlemeli`);
    assert.match(button, /onKeyUp=/, `${label} klavye bırakışını dinlemeli`);
    assert.match(
      button,
      new RegExp(`onClick=\\{\\(\\) => setAdultConfirmationAction\\("${action}"\\)\\}`),
      `${label} sentetik click'te yalnız ilk doğrulama aşamasını açmalı`,
    );
    assert.doesNotMatch(button, /completeAdultAction|onAdultExit|onHandoff/);
  }
});

test("tymm-child history popstate yetişkin kapısı olmadan fail-closed geri iter", () => {
  const popstateSource = sourceBetween(
    "const handlePopState = (event: PopStateEvent) => {",
    'window.addEventListener("popstate", handlePopState)',
  );
  const childGuardIndex = popstateSource.indexOf('currentSurface === "tymm-child"');
  assert.notEqual(childGuardIndex, -1, "tymm-child için ayrı popstate guardı bulunmalı");
  const childGuardEnd = popstateSource.indexOf("\n      if (", childGuardIndex + 1);
  assert.notEqual(childGuardEnd, -1, "tymm-child guardından sonraki history dalı bulunmalı");
  const childGuard = popstateSource.slice(childGuardIndex, childGuardEnd);
  assert.match(childGuard, /window\.history\.pushState\(/);
  assert.match(childGuard, /appHistoryState\(currentSurface\)/);
  assert.match(childGuard, /return;/);
  assert.doesNotMatch(childGuard, /applyHistoryTarget\(targetSurface\)[\s\S]*return;/);
});

test("çocuk kökenli handoff preserve politikası taşır ve planlı etkinliği ilerletmez", () => {
  const handoffSource = sourceBetween(
    "const handoffTymmChildParticipation =",
    "const openCaptureEntry =",
  );
  const activityEvidenceSource = sourceBetween(
    "const openActivityEvidence = async (",
    "const openSpontaneousObservation = async (",
  );

  assert.match(handoffSource, /openStudentObservation\([\s\S]{0,320}"preserve"/);
  assert.match(activityEvidenceSource, /activityStartPolicy: EvidenceActivityStartPolicy/);
  assert.match(
    activityEvidenceSource,
    /selected\.status === "planned"[\s\S]{0,180}activityStartPolicy === "start-if-planned"/,
  );
  assert.doesNotMatch(
    activityEvidenceSource,
    /if \(selected\.status === "planned"\) \{\s*await enqueuePersistence/,
    "preserve politikasını atlayan koşulsuz planned→in_progress mutasyonu dönmemeli",
  );
});

test("çocuk seçimi, atlama, handoff ve yetişkin çıkışı tüm ekran genişliklerinde en az 56 px kalır", () => {
  for (const selector of [
    ".tymm-child-header > button",
    ".tymm-child-choice-grid > button",
    ".tymm-child-skip",
    ".tymm-child-handoff > button",
    ".tymm-adult-confirm-dialog button",
  ]) {
    const values = pixelMinHeights(selector);
    assert.ok(values.length > 0, `${selector} için min-height sözleşmesi bulunmalı`);
    assert.ok(
      values.every((height) => height >= 56),
      `${selector} min-height değerleri 56 px altına inemez: ${values.join(", ")}`,
    );
  }
});

test("çocuk katılım yetkisi doğum tarihinden değil yetişkinin seçtiği exact TYMM sınıf bandından gelir", () => {
  const authoritySource = sourceBetween(
    "const currentClassTymmAgeBand =",
    "const educationalWriteNotice =",
  );
  const launchSource = sourceBetween(
    "const startTymmChildParticipation =",
    "const handoffTymmChildParticipation =",
  );

  assert.match(
    authoritySource,
    /curriculumAgeBandFromLabel\(\s*configuredClassroom\?\.ageGroup/,
  );
  assert.match(
    authoritySource,
    /configuredClassroom\?\.curriculumProfile\?\.framework !== "tymm"/,
  );
  assert.match(
    authoritySource,
    /currentClassTymmAgeBand !== selectedTymmGuide\.ageBand/,
  );
  assert.doesNotMatch(authoritySource, /birthDate|Date\.now|getMonth|monthDiff/);
  assert.match(launchSource, /if \(childParticipationBlockedReason \|\| !selectedTymmStudent\)/);
  assert.match(launchSource, /guide: selectedTymmGuide/);
});
