import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { verifyPremiumEntitlement } from "../../src/features/premium-access/entitlement.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import {
  createPremiumDailyFlowDraft,
  premiumContentPackSnapshot,
} from "../../src/features/premium-plans/domain.ts";
import {
  buildPremiumPlanExportParagraphs,
  createPremiumPlanDocx,
  paginatePremiumPlanExportParagraphs,
  preparePremiumPlanExportDocument,
} from "../../src/features/premium-plans/export-document.ts";
import { loadInstalledPremiumPlanExportSource } from "../../src/features/premium-plans/export-read-model.ts";
import {
  installPremiumPlanBoard,
  preparePremiumDailyTemplate,
  recordPremiumMonthlyEvaluation,
  recordPremiumWeeklyEvaluation,
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
} from "../../src/features/premium-plans/plan-service.ts";
import { createSignedEntitlementFixture } from "../helpers/premium-entitlement.mjs";

function sourceFixture(content) {
  return {
    contentPackSnapshot: premiumContentPackSnapshot(content),
    valuesMappingStatus: content.valuesMappingStatus,
    annualPlan: {
      recordId: "00000000-0000-4000-8000-000000009001",
      teacherTitle: `${content.displayName} Yıllık Planlama Panosu`,
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      annualMonths: structuredClone(content.annualMonths),
    },
    monthlyPlan: {
      recordId: "00000000-0000-4000-8000-000000009002",
      teacherTitle: content.monthlyPlan.title,
      sourceSnapshot: structuredClone(content.monthlyPlan),
      fullDayFlow: structuredClone(content.fullDayFlow),
    },
    weeks: content.weeks.map((week, index) => ({
      recordId: `00000000-0000-4000-8000-${String(9003 + index).padStart(12, "0")}`,
      teacherTitle: week.title,
      sourceSnapshot: structuredClone(week),
      activitySnapshots: structuredClone(
        content.activities.filter((activity) => activity.weekId === week.id),
      ),
      evaluations: [],
      dailyPlans: [],
    })),
    lensPreference: {
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
      lensSelectionMode: "preference_only",
    },
  };
}

async function pack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v2.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

async function valuesPack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v3.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        records.forEach((record) => byId.set(record.id, structuredClone(record)));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      collections.forEach((collection) => {
        this.snapshot[collection] = working[collection];
      });
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000009101";
const classroomId = "00000000-0000-4000-8000-000000009102";
const studentId = "00000000-0000-4000-8000-000000009103";
const profile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Belge Test Sınıfı",
    ageGroup: "60–72 ay",
    curriculumProfileSnapshot: profile,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    displayName: "Test Çocuğu",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

test("deneme erişimi PDF ve Word çıktı hazırlığını kapatır", async () => {
  const content = await pack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "trial" }),
  );
  assert.throws(
    () => preparePremiumPlanExportDocument(
      content,
      sourceFixture(content),
      access,
      "pdf",
    ),
    /Deneme sürümünde PDF ve Word çıktısı kapalıdır/,
  );
});

test("satın alınan veya STAFF erişimli seçili paket eksiksiz çıktı belgesi hazırlar", async () => {
  const content = await pack();
  for (const kind of ["purchased", "staff-code"]) {
    const access = await verifyPremiumEntitlement(
      await createSignedEntitlementFixture(content, { accessMode: kind }),
    );
    const document = preparePremiumPlanExportDocument(
      content,
      sourceFixture(content),
      access,
      kind === "purchased" ? "pdf" : "word",
    );
    assert.equal(document.weeks.length, 4);
    assert.equal(document.activities.length, 12);
    assert.equal(document.fullDayFlow.length, 10);
    assert.equal(document.contentPackVersion, content.version);
    assert.match(document.fileName, kind === "purchased" ? /\.pdf$/ : /\.docx$/);
    const paragraphs = buildPremiumPlanExportParagraphs(document);
    assert.ok(paragraphs.length > 150);
    assert.ok(paragraphs.some((paragraph) => paragraph.text.includes("Öğretmen yansıtması")));
  }
});

test("v3 çıktısı değer tasarımını kaynak ve ihtiyat diliyle gösterir; v2'ye değer uydurmaz", async () => {
  const content = await valuesPack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const document = preparePremiumPlanExportDocument(
    content,
    sourceFixture(content),
    access,
    "word",
  );
  const text = buildPremiumPlanExportParagraphs(document)
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(text, /Ana değer: D4 Dostluk/);
  assert.match(text, /D4\.1\.1.*İyi ve kötü zamanlarında arkadaşlarına destek olur/);
  assert.match(text, /Yaşantı\/ikilem:/);
  assert.match(text, /Karşı kanıt sorusu:/);
  assert.match(text, /altı rollü insan uzman incelemesi bekliyor/);
  assert.doesNotMatch(text, /değeri kazandı|değer puanı|liderlik tablosu/i);

  const legacy = await pack();
  const legacyAccess = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(legacy, { accessMode: "staff-code" }),
  );
  const legacyDocument = preparePremiumPlanExportDocument(
    legacy,
    sourceFixture(legacy),
    legacyAccess,
    "word",
  );
  const legacyText = buildPremiumPlanExportParagraphs(legacyDocument)
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(legacyText, /Eski içerik sürümünde değer snapshot'ı bulunmuyor/);
  assert.doesNotMatch(legacyText, /Ana değer: D\d+/);
});

test("kurulmuş legacy v2 planı read-model üzerinden okunur ve geriye dönük değer eşlemesi icat edilmez", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T05:00:00.000Z"),
  });
  const source = await loadInstalledPremiumPlanExportSource(
    store,
    content,
    installed.annualPlanId,
  );
  assert.equal(source.valuesMappingStatus, "legacy-unmapped");
  assert.ok(
    source.weeks.flatMap((week) => week.activitySnapshots)
      .every((activity) => activity.valuesDesign === null),
  );
});

test("Word çıktısı geçerli DOCX kabını ve Türkçe plan metnini üretir", async () => {
  const content = await pack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const document = preparePremiumPlanExportDocument(
    content,
    sourceFixture(content),
    access,
    "word",
  );
  const bytes = createPremiumPlanDocx(buildPremiumPlanExportParagraphs(document));
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const decoded = new TextDecoder().decode(bytes);
  assert.match(decoded, /\[Content_Types\]\.xml/);
  assert.match(decoded, /word\/document\.xml/);
  assert.match(decoded, /öğretmenin sınıf bağlamına göre/);
  assert.match(decoded, /TYMM 2024/);
});

test("PDF sayfalama başlığı izleyen içerikten koparmaz ve seyrek bölüm sonu sayfası üretmez", async () => {
  const content = await valuesPack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const document = preparePremiumPlanExportDocument(
    content,
    sourceFixture(content),
    access,
    "pdf",
  );
  const paragraphs = buildPremiumPlanExportParagraphs(document);
  const pages = paginatePremiumPlanExportParagraphs(
    paragraphs,
    (text, font) => {
      const fontSize = Number(font.match(/(\d+)px/)?.[1] ?? 24);
      return [...text].length * fontSize * 0.5;
    },
    1040,
    1484,
  );

  assert.ok(pages.length < 47, `beklenmeyen sayfa sayısı: ${pages.length}`);
  assert.deepEqual(
    pages.flatMap((page) => page.items.map((item) => item.text)),
    paragraphs.map((paragraph) => (
      paragraph.style === "bullet" ? `• ${paragraph.text}` : paragraph.text
    )),
    "her plan paragrafı eksiksiz ve aynı sırada yer almalıdır",
  );
  pages.forEach((page, index) => {
    assert.ok(page.usedHeight <= 1484, `${index + 1}. sayfa A4 içerik alanını aşıyor`);
    assert.notEqual(
      page.items.at(-1)?.style,
      "heading1",
      `${index + 1}. sayfa ana başlıkla bitmemelidir`,
    );
    assert.notEqual(
      page.items.at(-1)?.style,
      "heading2",
      `${index + 1}. sayfa alt başlıkla bitmemelidir`,
    );
    if (index > 0) {
      assert.ok(page.items.length > 1, `${index + 1}. sayfa tek paragraf taşımamalıdır`);
    }
  });
});

test("PDF yumuşak bölüm geçişini az dolu sayfada sürdürür, kapak geçişini korur", () => {
  const pages = paginatePremiumPlanExportParagraphs(
    [
      { text: "Kapak", style: "title" },
      {
        text: "Yıllık plan",
        style: "heading1",
        pageBreakBefore: true,
        forcePageBreakBefore: true,
      },
      { text: "Eylül", style: "heading2" },
      { text: "Amaç", style: "body", keepWithNext: true },
      { text: "İçerik durumu", style: "meta" },
      { text: "Aylık plan", style: "heading1", pageBreakBefore: true },
      { text: "Aylık amaç", style: "body" },
    ],
    (text) => text.length * 10,
    1040,
    800,
  );

  assert.equal(pages.length, 2);
  assert.deepEqual(pages[0].items.map((item) => item.text), ["Kapak"]);
  assert.deepEqual(
    pages[1].items.map((item) => item.text),
    ["Yıllık plan", "Eylül", "Amaç", "İçerik durumu", "Aylık plan", "Aylık amaç"],
  );
});

test("kurulmuş planın öğretmen düzenlemesi ve haftalık değerlendirmesi PDF/DOCX kaynak metnine aynen taşınır", async () => {
  const store = activeStore();
  const content = await valuesPack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T05:00:00.000Z"),
  });
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const beforeSource = await loadInstalledPremiumPlanExportSource(
    store,
    content,
    installed.annualPlanId,
  );
  const beforeDocument = preparePremiumPlanExportDocument(
    content,
    beforeSource,
    access,
    "word",
  );
  const beforeDocx = createPremiumPlanDocx(
    buildPremiumPlanExportParagraphs(beforeDocument),
  );

  const activity = content.activities.find(
    (candidate) => candidate.activityRole === "main",
  );
  assert.ok(activity);
  const selection = preparePremiumDailyTemplate(content, activity.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const requestedCodes = new Set(selection.targetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72")
    .filter((target) => requestedCodes.has(target.referenceCode));
  const teacherFlow = createPremiumDailyFlowDraft(selection.fullDayFlow);
  teacherFlow[0] = {
    ...teacherFlow[0],
    status: "optional",
    durationMinutes: 25,
    transitionNote: "Öğretmenin kaydettiği sakin geçiş düzenlemesi.",
    teacherNote: "Öğretmenin kaydettiği karşılama notu.",
  };
  const dailyPlanId = "00000000-0000-4000-8000-000000009201";
  const activityRecordId = "00000000-0000-4000-8000-000000009202";
  const daily = await createPlanWithActivity(store, {
    civilDate: activity.recommendedCivilDate,
    planId: dailyPlanId,
    activityId: activityRecordId,
    planTitle: "Öğretmenin düzenlediği günlük keşif planı",
    activityTitle: "Öğretmenin düzenlediği gölge araştırması",
    startTime: "09:15",
    endTime: "10:05",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
    premiumDailyFlowBlocks: teacherFlow,
    now: new Date(`${activity.recommendedCivilDate}T06:00:00.000Z`),
  });
  const observationId = "00000000-0000-4000-8000-000000009203";
  const captured = await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId: daily.plan.id,
    activityId: daily.activity.id,
    rawText: "Çocuk rota kartını yeniden çizdi ve farklı bir yol denedi.",
    observedAt: `${activity.recommendedCivilDate}T07:30:00.000Z`,
    now: new Date(`${activity.recommendedCivilDate}T07:31:00.000Z`),
  });
  const weeklyPlanId = installed.weeklyPlanIds.find(
    (entry) => entry.weekId === activity.weekId,
  )?.planId;
  assert.ok(weeklyPlanId);
  const evaluation = await recordPremiumWeeklyEvaluation(store, {
    weeklyPlanId,
    reflection:
      "Çocukların sessiz katılım seçeneğiyle sürece daha uzun süre katıldığı gözlendi.",
    evidenceSummary:
      "Rota kartının yeniden çizilmesi ve farklı yol denenmesi birlikte incelendi.",
    observationIds: [captured.observation.id],
    nextPlanDecision: "adapt",
    now: new Date("2026-09-11T13:00:00.000Z"),
  });
  const target = daily.activity.curriculumTargets[0];
  const curriculumLink = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: profile.framework,
    catalogId: profile.catalogId,
    sourceVersion: profile.sourceVersion,
    referenceOrigin: profile.referenceOrigin,
    officialCatalogVerified: profile.officialCatalogVerified,
    referenceCode: target.referenceCode,
    referenceTitle: target.referenceTitle,
    plannedTargetId: target.id,
    approvedByUserId: "00000000-0000-4000-8000-000000009204",
    now: new Date("2026-09-11T13:05:00.000Z"),
  });
  const monthlyEvaluation = await recordPremiumMonthlyEvaluation(store, {
    monthlyPlanId: installed.monthlyPlanId,
    childEvidenceState: "insufficient-evidence",
    childNarrative:
      "Tek haftadaki seçili kayıt tüm ay için yeterli olmadığından kesin beceri hükmü kurulmadı.",
    observationIds: [observationId],
    curriculumLinkIds: [curriculumLink.id],
    programCriteria: PREMIUM_MONTHLY_PROGRAM_CRITERIA.map(({ id }) => ({
      criterionId: id,
      status: id === "duration-fit" ? "needs-adjustment" : "observed-working",
    })),
    programNarrative:
      "Katılım seçeneği işledi; süre ve geçiş düzeninin sonraki uygulamada uyarlanması gerekiyor.",
    teacherCriteria: PREMIUM_MONTHLY_TEACHER_CRITERIA.map(({ id }) => ({
      criterionId: id,
      status: id === "time-management" ? "needs-adjustment" : "observed-working",
    })),
    teacherNarrative:
      "Zaman yönetimi ile sessiz katılım seçeneğinin görünürlüğünü yeniden düşündüm.",
    nextMonthRecommendation:
      "Farklı gün ve haftalardan kanıt toplamayı ve geçiş süresini uyarlamayı sürdüreceğim.",
    now: new Date("2026-09-30T13:00:00.000Z"),
  });

  const afterSource = await loadInstalledPremiumPlanExportSource(
    store,
    content,
    installed.annualPlanId,
  );
  const afterDocument = preparePremiumPlanExportDocument(
    content,
    afterSource,
    access,
    "word",
  );
  const afterParagraphs = buildPremiumPlanExportParagraphs(afterDocument);
  const afterText = afterParagraphs.map((paragraph) => paragraph.text).join("\n");
  const afterDocx = createPremiumPlanDocx(afterParagraphs);

  assert.equal(Buffer.from(beforeDocx).equals(Buffer.from(afterDocx)), false);
  assert.match(afterText, /Öğretmenin düzenlediği günlük keşif planı/);
  assert.match(afterText, /Öğretmenin düzenlediği gölge araştırması/);
  assert.match(afterText, /Öğretmenin kaydettiği sakin geçiş düzenlemesi/);
  assert.match(afterText, /Öğretmenin kaydettiği karşılama notu/);
  assert.match(afterText, /Rota kartının yeniden çizilmesi/);
  assert.match(afterText, /sessiz katılım seçeneğiyle sürece daha uzun süre/);
  assert.match(afterText, /Sonraki plan kararı: Uyarlayarak sürdür/);
  [
    installed.annualPlanId,
    installed.monthlyPlanId,
    weeklyPlanId,
    dailyPlanId,
    activityRecordId,
    evaluation.id,
    observationId,
    curriculumLink.id,
    monthlyEvaluation.id,
  ].forEach((sourceId) => assert.match(afterText, new RegExp(sourceId)));
  assert.match(afterText, /Kaydedilmiş aylık öğretmen değerlendirmesi/);
  assert.match(afterText, /Kanıt durumu: Yetersiz kanıt/);
  assert.match(afterText, /Sistem kesin beceri hükmü üretmedi/);
  assert.match(afterText, /Katılım seçeneği işledi/);
  assert.match(afterText, /Zaman yönetimi ile sessiz katılım/);
  assert.match(afterText, /Sonraki ay için öğretmen önerisi/);
  assert.match(afterText, /Uygulama durumu: Henüz uygulanmadı/);
  assert.doesNotMatch(afterText, /puanı|kişilik hükmü|beceriyi kazandı/i);
  assert.equal(
    afterDocument.weeks.find((week) => week.sourceRecordId === weeklyPlanId)
      ?.dailyPlans.length,
    1,
  );
});

test("doğrulanmamış erişimi ve başka içerik sürümünü fail-closed reddeder", async () => {
  const content = await pack();
  assert.throws(
    () => preparePremiumPlanExportDocument(
      content,
      sourceFixture(content),
      {},
      "word",
    ),
    /doğrulanmış entitlement gereklidir/,
  );
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content),
  );
  assert.throws(
    () => preparePremiumPlanExportDocument(
      { ...content, version: "başka-sürüm" },
      sourceFixture(content),
      access,
      "pdf",
    ),
    /yalnız doğrulanan paket ve akademik sürüm/,
  );
});

test("premium plan merkezi Eylül–Haziran omurgasını ve bekleyen öğretmen kararlarını dürüst dille gösterir", async () => {
  const source = await readFile(
    new URL(
      "../../src/features/premium-plans/PremiumPlanCenterScreen.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /Eylül–Haziran · 10 aylık omurga/);
  assert.match(source, /pack\.annualMonths\.map/);
  assert.match(source, /Bu ayı planla/);
  assert.match(source, /onOpenTeacherMonth/);
  assert.doesNotMatch(source, /Henüz yayımlanmadı/);
  assert.match(source, /Her ay hemen planlanabilir/);
  assert.doesNotMatch(source, /Yıllık, aylık ve haftalık planlar sınıfa eklendi/);
  assert.match(source, /Önceki haftadan öğretmen kararı/);
  assert.match(source, /Henüz otomatik uygulanmadı/);
  assert.match(source, /Sonraki ay için öğretmen önerisi/);
  assert.match(source, /Durum: Henüz uygulanmadı/);
  assert.match(source, /monthlyUncoveredStudentNames\.join/);
  assert.doesNotMatch(
    source,
    /uncoveredActiveStudentIds\.join\(["']\s*,\s*["']\)/,
  );
});
