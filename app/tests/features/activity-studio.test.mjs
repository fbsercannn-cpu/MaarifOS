import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVITY_STUDIO_AGE_BANDS,
  ACTIVITY_STUDIO_CATEGORY_IDS,
  ACTIVITY_STUDIO_COLLECTIONS,
  ACTIVITY_STUDIO_ITEMS,
  createActivityStudioChildSession,
  filterActivityStudioItems,
} from "../../src/features/activity-studio/activity-studio-model.ts";
import { renderActivityStudioPrintable } from "../../src/features/activity-studio/printable-templates.ts";
import { createActivityStudioObservationSeed } from "../../src/features/activity-studio/activity-observation-seed.ts";
import {
  ACTIVITY_STUDIO_DRAWING_COLORS,
  activityStudioDrawingPadMode,
  buildDrawingPadDownloadName,
  calculateDrawingPadCanvasMetrics,
  normalizeDrawingPadPoint,
} from "../../src/features/activity-studio/drawing-pad-model.ts";
import { PRESCHOOL_ACTIVITY_SUGGESTIONS } from "../../src/features/planning/activity-suggestions.ts";
import {
  ACTIVITY_YEAR_MONTH_LENSES,
  ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT,
  ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY,
  createActivityYearRotation,
  resolveActivityYearMonthLens,
  selectDailyActivitySuggestions,
} from "../../src/features/activity-studio/activity-year-program.ts";

test("stüdyo üç resmî TYMM yaş bandını ve yedi pratik kategoriyi kapsar", () => {
  assert.deepEqual(ACTIVITY_STUDIO_AGE_BANDS, ["36-48", "48-60", "60-72"]);

  const categories = new Set(ACTIVITY_STUDIO_ITEMS.map((item) => item.category));
  assert.deepEqual([...categories].sort(), [...ACTIVITY_STUDIO_CATEGORY_IDS].sort());
  assert.equal(ACTIVITY_STUDIO_ITEMS.length, PRESCHOOL_ACTIVITY_SUGGESTIONS.length);
  assert.equal(ACTIVITY_STUDIO_ITEMS.length, 120);

  const areaCounts = Object.groupBy(
    PRESCHOOL_ACTIVITY_SUGGESTIONS,
    (item) => item.area,
  );
  assert.equal(Object.keys(areaCounts).length, 8);
  assert.ok(Object.values(areaCounts).every((items) => items?.length === 15));

  for (const ageBand of ACTIVITY_STUDIO_AGE_BANDS) {
    const items = filterActivityStudioItems({ ageBand });
    assert.ok(items.length >= 116, `${ageBand} için en az 116 etkinlik bekleniyor`);
    for (const category of ACTIVITY_STUDIO_CATEGORY_IDS) {
      assert.ok(
        items.some((item) => item.category === category),
        `${ageBand} / ${category} için en az bir etkinlik bulunmalı`,
      );
    }
  }
});

test("kart verileri yerel önerilere bağlı, tam ve resmî etkinlikten ayrıdır", () => {
  const sourceIds = new Set(PRESCHOOL_ACTIVITY_SUGGESTIONS.map((item) => item.id));
  const itemIds = new Set();

  for (const item of ACTIVITY_STUDIO_ITEMS) {
    assert.equal(itemIds.has(item.id), false);
    itemIds.add(item.id);
    assert.equal(sourceIds.has(item.sourceSuggestionId), true);
    assert.equal(item.contentOrigin, "MaarifOS-original");
    assert.equal(item.officialMebActivity, false);
    assert.ok(item.durationMinutes >= 10 && item.durationMinutes <= 45);
    assert.ok(item.environment.length > 0);
    assert.ok(item.materials.length >= 2);
    assert.ok(item.tymmDomains.length >= 1);
    assert.equal(item.ageBands.length, Object.keys(item.ageAdaptations).length);
    assert.ok(item.preparationMinutes >= 1 && item.preparationMinutes <= 20);
    assert.equal(item.teacherSteps.length, 3);
    assert.ok(item.teacherSteps.every((step) => step.length >= 24));
    assert.ok(item.inclusionNote.length >= 40);
    assert.ok(item.observationPrompt.length >= 40);
    assert.ok(item.familyExtension.length >= 40);
  }
});

test("120 çekirdek etkinliğin öğretmen ve çocuk katmanları etkinliğe özgüdür", () => {
  const supportSignatures = new Set(
    ACTIVITY_STUDIO_ITEMS.map((item) =>
      [
        ...item.teacherSteps,
        item.inclusionNote,
        item.observationPrompt,
        item.familyExtension,
      ].join("|"),
    ),
  );
  assert.equal(supportSignatures.size, ACTIVITY_STUDIO_ITEMS.length);

  const childPrompts = new Set();
  const reflectionPrompts = new Set();
  const choiceIds = new Set();
  for (const item of ACTIVITY_STUDIO_ITEMS) {
    const session = createActivityStudioChildSession(item.id, "60-72");
    assert.ok(session, `${item.id} için 60–72 ay çocuk oturumu bulunmalı`);
    assert.equal(session.title, item.title);
    assert.match(session.childPrompt, new RegExp(item.title, "u"));
    assert.match(session.reflectionPrompt, new RegExp(item.title, "u"));
    childPrompts.add(session.childPrompt);
    reflectionPrompts.add(session.reflectionPrompt);
    for (const choice of session.choices) {
      assert.equal(choiceIds.has(choice.id), false, `${choice.id} mükerrer olmamalı`);
      choiceIds.add(choice.id);
      assert.ok(choice.label.length >= 18);
    }
  }

  assert.equal(childPrompts.size, ACTIVITY_STUDIO_ITEMS.length);
  assert.equal(reflectionPrompts.size, ACTIVITY_STUDIO_ITEMS.length);
  assert.equal(choiceIds.size, ACTIVITY_STUDIO_ITEMS.length * 3);
});

test("hazır koleksiyonlar gerçek envanteri öğretmen ihtiyacına göre daraltır", () => {
  assert.equal(ACTIVITY_STUDIO_COLLECTIONS.length, 6);
  for (const collection of ACTIVITY_STUDIO_COLLECTIONS) {
    const items = filterActivityStudioItems({
      ageBand: "60-72",
      collection: collection.id,
    });
    assert.ok(items.length >= 3, `${collection.label} koleksiyonu dolu olmalı`);
  }

  const quick = filterActivityStudioItems({
    ageBand: "60-72",
    collection: "hemen",
  });
  assert.ok(quick.every((item) => item.durationMinutes <= 20));

  const outdoor = filterActivityStudioItems({
    ageBand: "48-60",
    collection: "acik-hava",
  });
  assert.ok(
    outdoor.every(
      (item) =>
        item.category === "acik-hava" ||
        item.environment === "Bahçe" ||
        item.environment === "Sınıf veya bahçe",
    ),
  );
});

test("yaş ve kategori filtreleri tahmin yapmadan birlikte çalışır", () => {
  const filtered = filterActivityStudioItems({
    ageBand: "36-48",
    category: "hareket",
    query: "denge",
  });
  assert.ok(filtered.length >= 1);
  assert.ok(filtered.some((item) => item.id === "hareket-renkli-denge-parkuru"));
  assert.ok(
    filtered.every(
      (item) => {
        const searchableText = [
          item.title,
          item.teacherPrompt,
          item.environment,
          ...item.materials,
          ...item.tymmDomains,
          ...item.teacherSteps,
          item.inclusionNote,
          item.observationPrompt,
          item.familyExtension,
        ].join(" ").toLocaleLowerCase("tr-TR");
        return (
          item.ageBands.includes("36-48") &&
          item.category === "hareket" &&
          searchableText.includes("denge")
        );
      },
    ),
  );

  const notSupported = filterActivityStudioItems({
    ageBand: "36-48",
    category: "oyun",
    query: "tamir",
  });
  assert.equal(notSupported.length, 0);
});

test("Çocuk Modu üç yaşta puansız, reklamsız ve yetişkin eşliğindedir", () => {
  for (const ageBand of ACTIVITY_STUDIO_AGE_BANDS) {
    const activity = filterActivityStudioItems({ ageBand })[0];
    assert.ok(activity);
    const session = createActivityStudioChildSession(activity.id, ageBand);
    assert.ok(session);
    assert.equal(session.ageBand, ageBand);
    assert.equal(session.choices.length, 3);
    assert.equal(session.minimumTouchTargetPx >= 56, true);
    assert.equal(session.allowSkip, true);
    assert.equal(session.allowChange, true);
    assert.equal(session.scoreless, true);
    assert.equal(session.competitive, false);
    assert.equal(session.advertising, false);
    assert.equal(session.externalLinks, false);
    assert.match(session.notice, /puanlanmaz/u);
  }

  assert.equal(
    createActivityStudioChildSession(
      "oyun-oyuncak-tamir-atolyesi",
      "36-48",
    ),
    null,
  );
});

test("yazdırılabilir A4 HTML özgün, çevrimdışı ve betiksizdir", () => {
  for (const ageBand of ACTIVITY_STUDIO_AGE_BANDS) {
    const activity = filterActivityStudioItems({ ageBand })[0];
    assert.ok(activity);
    const printable = renderActivityStudioPrintable(activity, ageBand);
    assert.equal(printable.mimeType, "text/html;charset=utf-8");
    assert.equal(printable.license, "CC BY 4.0");
    assert.equal(printable.contentOrigin, "MaarifOS-original");
    assert.match(printable.html, /^<!doctype html>/u);
    assert.match(printable.html, /<html lang="tr">/u);
    assert.match(printable.html, /@page \{ size: A4/u);
    assert.match(printable.html, /TYMM alanı/u);
    assert.match(printable.html, /resmî MEB etkinliği veya değerlendirme aracı değildir/u);
    assert.doesNotMatch(printable.html, /<script|<svg|https?:\/\//iu);
  }
});

test("telefon CSS'i 320 pikselde sayfa taşmasını önler ve dokunma hedeflerini korur", async () => {
  const css = await readFile(
    new URL("../../src/features/activity-studio/activity-studio.css", import.meta.url),
    "utf8",
  );
  const component = await readFile(
    new URL("../../src/features/activity-studio/ActivityStudio.tsx", import.meta.url),
    "utf8",
  );

  assert.match(css, /@media \(max-width: 359px\)/u);
  assert.match(css, /width: min\(100%, 760px\)/u);
  assert.match(css, /max-width: 100%/u);
  assert.match(css, /min-width: 0/u);
  assert.match(css, /overflow-x: clip/u);
  assert.match(css, /min-height: 72px/u);
  assert.match(css, /min-height: 56px/u);
  assert.match(
    css,
    /activity-child-mode[\s\S]*var\(--maarif-nav-height, 64px\)[\s\S]*scroll-padding-bottom/u,
  );
  assert.doesNotMatch(
    css,
    /\n\s+min-width:\s*(?:3[2-9]\d|[4-9]\d\d|\d{4,})px/u,
  );

  const guide = await readFile(
    new URL("../../src/features/activity-studio/ActivityTeacherGuide.tsx", import.meta.url),
    "utf8",
  );
  const guideCopy = await readFile(
    new URL("../../src/features/activity-studio/activity-teacher-guide.copy.ts", import.meta.url),
    "utf8",
  );
  for (const label of [
    "Planıma ekle",
    "Çocuk Modunda uygula",
    "Yazdır",
    "Pas geç",
    "Öğretmene dön",
    "Bu etkinlik için gözlem yaz",
  ]) {
    assert.match(`${component}\n${guideCopy}`, new RegExp(label, "u"));
  }
  assert.match(component, /onWriteObservation\?\(/u);
  assert.match(component, /Etkinlik, malzeme veya TYMM alanı ara/u);
  assert.match(guideCopy, /Rehberi aç/u);
  assert.match(guide, /ACTIVITY_TEACHER_GUIDE_COPY as copy/u);
  assert.match(guideCopy, /Program bağlantısı ve araçlar/u);
  assert.match(component, /visibleCount, setVisibleCount/u);
  assert.match(component, /6 öneri daha göster/u);
  assert.match(component, /öneri gösteriliyor/u);
  assert.doesNotMatch(component, /<strong>\{activities\.length\}<\/strong> uygun etkinlik/u);
  assert.match(component, /Tüm filtreler/u);
  assert.match(guideCopy, /Katılımı kolaylaştır/u);
  assert.match(guideCopy, /Aileye uzatma/u);
  assert.match(component, /leaveChildMode\(true\)/u);
  assert.match(component, /initialCollection = "tumu"/u);
  assert.match(component, /useState<ActivityStudioCollectionFilter>\(initialCollection\)/u);
  assert.match(component, /ACTIVITY_TEACHER_GUIDE_COPY\.openGuideLabel\(activity\.title\)/u);
  assert.doesNotMatch(component, /<img|<svg|emoji|https?:\/\//iu);
});

test("hazırlık döneminde Çocuk Modu kalıcı kanıt yazmadan açılır ve gözlem gerekçeli kilitlenir", async () => {
  const component = await readFile(
    new URL("../../src/features/activity-studio/ActivityStudio.tsx", import.meta.url),
    "utf8",
  );
  const prototype = await readFile(
    new URL("../../src/Prototype.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../../src/features/activity-studio/activity-studio.css", import.meta.url),
    "utf8",
  );

  const applyStart = prototype.indexOf("onApply={async (activity, context) => {");
  const persistenceStart = prototype.indexOf(
    "ensureActivityStudioApplication(store",
    applyStart,
  );
  const previewGuard = prototype.indexOf(
    "if (educationalWriteNotice)",
    applyStart,
  );
  assert.ok(applyStart >= 0);
  assert.ok(previewGuard > applyStart && previewGuard < persistenceStart);
  assert.match(
    prototype.slice(previewGuard, persistenceStart),
    /uygulama oturumu ve kanıt oluşturulmadı/u,
  );
  assert.match(component, /childModeObservationUnavailableReason\?: string/u);
  assert.match(
    component,
    /busyAction !== null \|\| Boolean\(childModeObservationUnavailableReason\)/u,
  );
  assert.match(component, /aria-describedby=\{/u);
  assert.match(component, /className="activity-child-mode__recording-note"/u);
  assert.match(
    css,
    /activity-child-mode__observation-button:disabled[\s\S]*opacity: 1/u,
  );
});

test("plan koleksiyonları ve orkestra adımları stüdyoyu doğru bağlamla açar", async () => {
  const source = await readFile(
    new URL("../../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /activityId: phase\.activity\?\.id/u);
  assert.match(source, /scenarioId,/u);
  assert.match(source, /collection: collection\.id/u);
  assert.doesNotMatch(source, /onClick=\{onOpenActivityStudio\}/u);
});

test("resmî MEB rotasyonu uyumdan yıl sonuna yalnız öğretim günlerini kapsar", () => {
  assert.equal(ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY, 186);
  assert.equal(ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT, 558);
  assert.equal(ACTIVITY_YEAR_MONTH_LENSES.length, 10);

  const items = filterActivityStudioItems({ ageBand: "60-72" });
  const rotation = createActivityYearRotation({
    items,
    startCivilDate: "2026-09-01",
  });
  assert.equal(rotation.length, ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY);
  assert.equal(
    new Set(rotation.map((day) => day.civilDate)).size,
    ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY,
  );
  assert.equal(rotation[0]?.civilDate, "2026-09-07");
  assert.equal(rotation.at(-1)?.civilDate, "2027-06-25");

  const rotationDates = new Set(rotation.map((day) => day.civilDate));
  const excludedPeriods = [
    ["2026-09-01", "2026-09-06"],
    ["2026-11-16", "2026-11-20"],
    ["2027-01-25", "2027-02-05"],
    ["2027-03-08", "2027-03-12"],
    ["2027-05-16", "2027-05-19"],
    ["2027-06-26", "2027-08-31"],
  ];
  assert.equal(
    rotation.every((day) =>
      excludedPeriods.every(
        ([startDate, endDate]) =>
          day.civilDate < startDate || day.civilDate > endDate,
      ),
    ),
    true,
  );
  for (const excludedDate of [
    "2026-09-01",
    "2026-09-04",
    "2026-11-16",
    "2026-11-20",
    "2027-01-01",
    "2027-01-25",
    "2027-02-05",
    "2027-03-08",
    "2027-03-12",
    "2027-05-17",
    "2027-05-19",
    "2027-06-26",
  ]) {
    assert.equal(
      rotationDates.has(excludedDate),
      false,
      `${excludedDate} öğretim günü olarak planlanmamalı`,
    );
  }
  for (const includedDate of [
    "2026-09-07",
    "2026-09-11",
    "2026-09-14",
    "2027-01-22",
    "2027-02-08",
    "2027-06-25",
  ]) {
    assert.equal(
      rotationDates.has(includedDate),
      true,
      `${includedDate} resmî öğretim kümesinde bulunmalı`,
    );
  }

  assert.equal(
    rotation.every((day) => {
      const weekday = new Date(`${day.civilDate}T12:00:00.000Z`).getUTCDay();
      const inInstructionalPhase =
        (day.civilDate >= "2026-09-07" && day.civilDate <= "2026-09-11") ||
        (day.civilDate >= "2026-09-14" && day.civilDate <= "2027-01-22") ||
        (day.civilDate >= "2027-02-08" && day.civilDate <= "2027-06-25");
      return weekday >= 1 && weekday <= 5 && inInstructionalPhase;
    }),
    true,
  );

  const usedIds = new Set();
  for (const day of rotation) {
    assert.equal(day.activities.length, 3);
    assert.equal(new Set(day.activities.map((item) => item.id)).size, 3);
    assert.equal(new Set(day.activities.map((item) => item.category)).size, 3);
    day.activities.forEach((item) => usedIds.add(item.id));
  }
  assert.ok(usedIds.size >= 110, `yıllık rotasyonda yalnız ${usedIds.size} etkinlik kullanıldı`);

  const first = selectDailyActivitySuggestions(items, "2026-09-05");
  const nextMonthSameDay = selectDailyActivitySuggestions(items, "2026-10-05");
  assert.notDeepEqual(
    first.map((item) => item.id),
    nextMonthSameDay.map((item) => item.id),
  );
  assert.equal(resolveActivityYearMonthLens("2026-09-05")?.month, 9);
  assert.equal(resolveActivityYearMonthLens("2026-07-05"), null);
  assert.throws(
    () => selectDailyActivitySuggestions(items, "05.09.2026"),
    /YYYY-MM-DD/u,
  );

  assert.deepEqual(
    createActivityYearRotation({
      items,
      startCivilDate: "2027-06-26",
    }),
    [],
  );
  const overRequestedRotation = createActivityYearRotation({
    items,
    startCivilDate: "2026-09-01",
    schoolDayCount: 366,
  });
  assert.equal(overRequestedRotation.length, ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY);
  assert.equal(overRequestedRotation.at(-1)?.civilDate, "2027-06-25");
});

test("yazdırılabilir etkinlik telefon önizlemesinde tek sütuna döner", async () => {
  const source = await readFile(
    new URL("../../src/features/activity-studio/printable-templates.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /@media screen and \(max-width: 600px\)/u);
  assert.match(
    source,
    /\.three-column, \.two-column, \.cut-row \{ grid-template-columns: minmax\(0, 1fr\)/u,
  );
  assert.match(source, /@media print/u);
  assert.match(source, /page-break-inside: avoid/u);
});

test("çizim ve boyama kategorileri altı renkli çevrimdışı çizim aracını açar", () => {
  assert.equal(ACTIVITY_STUDIO_DRAWING_COLORS.length, 6);
  assert.equal(
    new Set(ACTIVITY_STUDIO_DRAWING_COLORS.map((color) => color.value)).size,
    6,
  );

  for (const activity of ACTIVITY_STUDIO_ITEMS) {
    const expected =
      activity.category === "cizim"
        ? "drawing"
        : activity.category === "boyama"
          ? "coloring"
          : null;
    assert.equal(activityStudioDrawingPadMode(activity), expected);
  }
});

test("canvas ölçüsü cihaz piksel oranını korur ve işaretçi koordinatını sınırlar", () => {
  assert.deepEqual(calculateDrawingPadCanvasMetrics(280, 210, 3), {
    cssWidth: 280,
    cssHeight: 210,
    pixelRatio: 3,
    backingWidth: 840,
    backingHeight: 630,
  });
  assert.deepEqual(calculateDrawingPadCanvasMetrics(0, Number.NaN, 0), {
    cssWidth: 1,
    cssHeight: 1,
    pixelRatio: 1,
    backingWidth: 1,
    backingHeight: 1,
  });
  assert.deepEqual(
    normalizeDrawingPadPoint(250, 90, 0.8, {
      left: 50,
      top: 20,
      width: 400,
      height: 200,
    }),
    { x: 0.5, y: 0.35, pressure: 0.8 },
  );
  assert.deepEqual(
    normalizeDrawingPadPoint(-100, 900, 0, {
      left: 0,
      top: 0,
      width: 300,
      height: 200,
    }),
    { x: 0, y: 1, pressure: 0.5 },
  );
});

test("çizim dosya adı Türkçe başlıktan güvenli ve yerel PNG adı üretir", () => {
  assert.equal(
    buildDrawingPadDownloadName("  Doğanın Renk Paleti  "),
    "maarifos-doğanın-renk-paleti.png",
  );
  assert.equal(buildDrawingPadDownloadName("***"), "maarifos-cizim.png");
});

test("dokunmatik çizim bileşeni geri al, temizle, PNG ve yazdırmayı ağsız sunar", async () => {
  const drawingPad = await readFile(
    new URL(
      "../../src/features/activity-studio/ActivityDrawingPad.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const studio = await readFile(
    new URL("../../src/features/activity-studio/ActivityStudio.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../../src/features/activity-studio/activity-studio.css", import.meta.url),
    "utf8",
  );

  assert.match(drawingPad, /<canvas/u);
  assert.match(drawingPad, /onPointerDown=\{handlePointerDown\}/u);
  assert.match(drawingPad, /onPointerMove=\{handlePointerMove\}/u);
  assert.match(drawingPad, /onPointerCancel=\{handlePointerEnd\}/u);
  assert.match(drawingPad, /onLostPointerCapture/u);
  assert.match(drawingPad, /setPointerCapture/u);
  assert.match(drawingPad, /window\.devicePixelRatio/u);
  assert.match(drawingPad, /canvas\.toBlob/u);
  assert.match(drawingPad, /canvas\.toDataURL\("image\/png"\)/u);
  assert.match(drawingPad, /openHtmlPrintWindow/u);
  assert.match(drawingPad, /onEvidenceChange/u);
  for (const label of [
    "Geri al",
    "Temizle",
    "PNG indir",
    "Yazdır",
    "Puan yok",
    "Klavye ile şekil ekle",
    "Nokta ekle",
    "Çizgi ekle",
    "Daire ekle",
  ]) {
    assert.match(drawingPad, new RegExp(label, "u"));
  }
  assert.match(drawingPad, /addKeyboardShape/u);
  assert.match(drawingPad, /Enter veya Boşluk/u);
  assert.match(studio, /activityStudioDrawingPadMode\(childActivity\)/u);
  assert.match(studio, /<ActivityDrawingPad/u);
  assert.match(studio, /childHeadingRef/u);
  assert.match(studio, /data-activity-child-trigger/u);
  assert.match(studio, /returnTarget\?\.isConnected/u);
  assert.match(studio, /remountedTarget/u);
  assert.match(studio, /setSelectedChoiceId\(choice\?\.id \?\? null\)/u);
  assert.match(studio, /selectedChoice/u);
  assert.match(studio, /drawingEvidence/u);
  assert.match(css, /touch-action: none/u);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(css, /box-shadow: 0 0 0 6px #0b2a55 !important/u);
  assert.doesNotMatch(drawingPad, /fetch\(|XMLHttpRequest|axios|https?:\/\//iu);
  assert.doesNotMatch(drawingPad, /\.ellipse\(|bezierCurveTo/u);
});

test("çocuk seçimi ve çizim yalnız düzenlenebilir gözlem taslağına dürüst bağlam olur", () => {
  const activity = ACTIVITY_STUDIO_ITEMS.find((item) => item.category === "cizim");
  assert.ok(activity);
  const session = createActivityStudioChildSession(activity.id, "48-60");
  assert.ok(session);
  const choice = session.choices[1];
  assert.ok(choice);

  const seed = createActivityStudioObservationSeed({
    activity,
    ageBand: "48-60",
    ageLabel: "48–60 ay",
    session,
    choice,
    drawingEvidence: {
      mode: "drawing",
      strokeCount: 4,
      downloadedFileName: "maarifos-cizim.png",
    },
  });

  assert.match(seed.rawText, new RegExp(choice.label, "u"));
  assert.match(seed.rawText, /4 çizgi/u);
  assert.match(seed.rawText, /öğretmen.*düzenleyip doğrulamalıdır/iu);
  assert.match(seed.context, /maarifos-cizim\.png/u);
  assert.match(seed.context, /otomatik eklenmedi/u);
  assert.equal(seed.childQuote, "");
  assert.equal(seed.observationType, "quick-note");
  assert.deepEqual(seed.categoryIds, ["art-creativity"]);
});
