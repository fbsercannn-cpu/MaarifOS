import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panelsSource = readFileSync(
  new URL("../../src/features/development/DevelopmentPanels.tsx", import.meta.url),
  "utf8",
);

const studentPanelSource = panelsSource.slice(
  panelsSource.indexOf("export function StudentDevelopmentPanel"),
);

test("çocuk gelişim paneli asenkron okuma sırasında görünür polite durum sunar", () => {
  assert.match(studentPanelSource, /if \(!overview\)/u);
  assert.match(studentPanelSource, /role="status"/u);
  assert.match(studentPanelSource, /aria-live="polite"/u);
  assert.match(studentPanelSource, /aria-atomic="true"/u);
  assert.match(studentPanelSource, /Gelişim kayıtları yükleniyor…/u);
});

test("yüklenen özet seçili çocuğu içermiyorsa panel boş kalmaz", () => {
  assert.match(studentPanelSource, /if \(!student\)/u);
  assert.match(
    studentPanelSource,
    /Bu çocuk güncel gelişim özetinde bulunamadı/u,
  );
  assert.match(studentPanelSource, /Profil ve kayıtlar değiştirilmedi/u);
  assert.doesNotMatch(studentPanelSource, /if \(!student[^\n]*return null/u);
});
