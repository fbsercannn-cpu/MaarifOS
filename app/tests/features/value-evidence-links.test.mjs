import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import {
  LOCAL_TEACHER_IDENTITY_SETTING_ID,
  LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
} from "../../src/features/evidence/local-teacher-identity.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import {
  installPremiumPlanBoard,
  preparePremiumDailyTemplate,
} from "../../src/features/premium-plans/plan-service.ts";
import {
  confirmObservationValueEvidenceLink,
  listValueEvidenceLinksByObservation,
  listValueEvidenceLinksByStudent,
  parseValueEvidenceLinkRecord,
  supersedeObservationValueEvidenceLink,
  tombstoneObservationValueEvidenceLink,
} from "../../src/features/values/value-evidence-links.ts";
import { parseTeacherEvidenceRationale } from "../../src/features/values/value-plan-models.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
    this.afterReadonly = null;
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(working[collection].map((record) => [record.id, record]));
        for (const record of records) byId.set(record.id, structuredClone(record));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) this.snapshot[collection] = working[collection];
    } else if (this.afterReadonly) {
      const hook = this.afterReadonly;
      this.afterReadonly = null;
      await hook(this.snapshot);
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000801";
const classroomId = "00000000-0000-4000-8000-000000000802";
const studentId = "00000000-0000-4000-8000-000000000803";
const otherStudentId = "00000000-0000-4000-8000-000000000804";
const dailyPlanId = "00000000-0000-4000-8000-000000000805";
const dailyActivityId = "00000000-0000-4000-8000-000000000806";
const observationId = "00000000-0000-4000-8000-000000000807";
const firstLinkId = "00000000-0000-4000-8000-000000000808";
const retryLinkId = "00000000-0000-4000-8000-000000000809";
const thirdLinkId = "00000000-0000-4000-8000-000000000810";
const rawText = "Çocuk öykü kartını arkadaşına uzatıp sırasını bekledi.";
const safeRationale =
  "Sıra verme ve bekleme eylemi, seçilen resmî değer göstergesiyle ilişkilendirildi.";

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};
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
    name: "Değer Kanıtı Pilot Sınıfı",
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
  snapshot.students.push(
    {
      ...base,
      id: studentId,
      displayName: "Kurgu Pilot Çocuk",
      academicYearId: yearId,
      classroomId,
    },
    {
      ...base,
      id: otherStudentId,
      displayName: "Kurgu İkinci Çocuk",
      academicYearId: yearId,
      classroomId,
    },
  );
  return new MemoryStore(snapshot);
}

async function contentPack(version = 3) {
  const raw = JSON.parse(
    await readFile(
      new URL(
        `../../../premium-content/releases/tymm-6072/2026-09/content.v${version}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return parsePremiumContentPack(raw);
}

async function createPremiumEvidenceChain(store, version = 3, rawObservationText = rawText) {
  const content = await contentPack(version);
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T06:00:00.000Z"),
  });
  const template = content.activities[0];
  const selection = preparePremiumDailyTemplate(content, template.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const targetCodes = new Set(selection.targetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72").filter(
    (target) => targetCodes.has(target.referenceCode),
  );
  const daily = await createPlanWithActivity(store, {
    civilDate: template.recommendedCivilDate,
    planId: dailyPlanId,
    activityId: dailyActivityId,
    planTitle: selection.planTitle,
    activityTitle: selection.activityTitle,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "selected-students",
    studentIds: [studentId],
    premiumSource: selection,
    now: new Date("2026-09-08T06:00:00.000Z"),
  });
  const captured = await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId: dailyPlanId,
    activityId: dailyActivityId,
    rawText: rawObservationText,
    observedAt: "2026-09-08T07:00:00.000Z",
    now: new Date("2026-09-08T07:01:00.000Z"),
  });
  return { content, template, daily, captured };
}

function targetFrom(chain) {
  const target = chain.template.valuesDesign.mapping.officialActionSnapshots[0];
  return {
    targetValueCode: target.valueCode,
    targetIndicatorCode: target.indicatorCode,
  };
}

function confirmationInput(chain, overrides = {}) {
  const target = chain.template.valuesDesign
    ? targetFrom(chain)
    : { targetValueCode: "D1", targetIndicatorCode: "D1.1.1" };
  return {
    observationId,
    studentId,
    evidenceRole: "supports",
    ...target,
    teacherRationale: safeRationale,
    linkId: firstLinkId,
    now: new Date("2026-09-08T08:00:00.000Z"),
    ...overrides,
  };
}

test("v5 değer kanıtı yalnız açık öğretmen onayıyla kurulur; provenance ve ortak actor korunur", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const before = await store.readSnapshot();
  assert.equal(before.valueEvidenceLinks.length, 0);
  assert.equal(before.observations[0].valueScore, undefined);
  assert.equal(before.observations[0].valueJudgment, undefined);

  const link = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const after = await store.readSnapshot();
  const expectedDigest = `sha256:${createHash("sha256")
    .update(canonicalJson(chain.daily.activity.appliedActivityTemplateSnapshot.valuesDesign))
    .digest("hex")}`;

  assert.equal(link.id, firstLinkId);
  assert.equal(link.planId, dailyPlanId);
  assert.equal(link.activityId, dailyActivityId);
  assert.equal(link.confirmationScope, "observation-to-value-action-link");
  assert.equal(link.confirmedByActorKind, "local-teacher-identity");
  assert.equal(link.provenance.appliedValuesDesignDigest, expectedDigest);
  assert.equal(link.provenance.appliedValuesDesignId, chain.template.valuesDesign.id);
  assert.equal(link.provenance.appliedValuesDesignVersion, "1.0.0");
  assert.equal(link.approvedByUserId, undefined);
  for (const forbidden of ["valueScore", "valueJudgment", "rank", "mastered", "achieved", "badge"]) {
    assert.equal(link[forbidden], undefined);
  }
  assert.deepEqual(after.plans, before.plans);
  assert.deepEqual(after.activities, before.activities);
  assert.deepEqual(after.observations, before.observations);
  assert.equal(
    after.activities[0].appliedActivityTemplateSnapshot?.valuesDesign?.editorialReview?.status,
    "machine_validated_pending_human_review",
  );
  const identity = after.settings.find(
    (record) =>
      record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID &&
      record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
  );
  assert.ok(identity);
  assert.equal(link.confirmedByActorId, identity.teacherUserId);

  const retry = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain, { linkId: retryLinkId }),
  );
  assert.equal(retry.id, firstLinkId);
  assert.equal((await store.readSnapshot()).valueEvidenceLinks.length, 1);
  assert.deepEqual(
    (await listValueEvidenceLinksByObservation(store, observationId)).map((item) => item.id),
    [firstLinkId],
  );
  assert.deepEqual(
    (await listValueEvidenceLinksByStudent(store, studentId)).map((item) => item.id),
    [firstLinkId],
  );

  const curriculumLink = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: profile.framework,
    catalogId: profile.catalogId,
    sourceVersion: profile.sourceVersion,
    referenceCode: "TYMM-OÖ-DEĞER-01",
    referenceTitle: "Kurgu program bağlantısı",
    referenceOrigin: profile.referenceOrigin,
    officialCatalogVerified: profile.officialCatalogVerified,
    now: new Date("2026-09-08T08:05:00.000Z"),
  });
  assert.equal(curriculumLink.approvedByUserId, link.confirmedByActorId);
  assert.throws(
    () => parseValueEvidenceLinkRecord({ ...link, valueScore: 5 }),
    /beklenmeyen: valueScore/,
  );
});

test("rationale, rol ve resmî hedef kapıları tüm başarısızlıklarda sıfır yazım bırakır", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const cases = [
    [{ evidenceRole: "praises" }, /kanıt rolü/],
    [{ targetValueCode: "D20", targetIndicatorCode: "D20.1.1" }, /ana\/çatı\/destek/],
    [{ targetIndicatorCode: "D14.1.1" }, /seçilen değer koduna ait/],
    [{ teacherRationale: "" }, /boş bırakılamaz/],
    [{ teacherRationale: "x".repeat(1001) }, /en fazla 1000/],
    [{ teacherRationale: "Bu kanıta 10 puan verdim." }, /puan, etiket/],
    [{ teacherRationale: "Seviye 3 olarak işaretledim." }, /puan, etiket/],
    [{ teacherRationale: "Çocuğa rozet verildi." }, /puan, etiket/],
    [{ teacherRationale: "Bu kanıt için rütbe 2 seçildi." }, /puan, etiket/],
    [{ teacherRationale: "Bu davranışa 8/10 verdim." }, /puan, etiket/],
    [{ teacherRationale: "D4 düzeyi %90." }, /puan, etiket/],
    [{ teacherRationale: "Saygı değeri 95 olarak değerlendirildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı: 95" }, /puan, etiket/],
    [{ teacherRationale: "Saygısı: 95" }, /puan, etiket/],
    [{ teacherRationale: "Saygı düzeyi doksan beş olarak değerlendirildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı değeri yüzde doksan olarak kaydedildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı değeri on üzerinden sekiz olarak değerlendirildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı değeri 8⁄10 olarak değerlendirildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı için ⭐⭐⭐⭐⭐ verildi." }, /puan, etiket/],
    [{ teacherRationale: "Saygı değeri AA olarak değerlendirildi." }, /puan, etiket/],
    [{ teacherRationale: "Beş yıldız verdim." }, /puan, etiket/],
    [{ teacherRationale: "A+ olarak değerlendirdim." }, /puan, etiket/],
    [{ teacherRationale: "Çocuğun karakteri çok iyidir." }, /puan, etiket/],
    [{ teacherRationale: "Saygılı bir çocuktur." }, /puan, etiket/],
    [{ teacherRationale: "Çocuk çok sorumludur." }, /puan, etiket/],
    [{ teacherRationale: "Ahlakı güzeldir." }, /puan, etiket/],
    [{ teacherRationale: "Değerleri gelişmiştir." }, /puan, etiket/],
    [{ teacherRationale: "Bu çocuk örnek bir kişiliğe sahiptir." }, /puan, etiket/],
    [{ teacherRationale: "Karakter bakımından mükemmeldir." }, /puan, etiket/],
    [{ teacherRationale: "Karakter açısından mükemmeldir." }, /puan, etiket/],
    [{ teacherRationale: "Karakteri mükemmeldir." }, /puan, etiket/],
    [{ teacherRationale: "Hayırlı bir evlattır." }, /kişiliğini veya inancını/],
    [{ teacherRationale: "Saygı değeri yü\u200Bzde doksan olarak kaydedildi." }, /kontrol, görünmez format veya bidi/],
    [{ teacherRationale: "Müslü\u200Cman olduğu için saygı değerini gösterdi." }, /kontrol, görünmez format veya bidi/],
    [{ teacherRationale: "Na\u200Dmaz kıldığı için sorumluluk değerini gösterdi." }, /kontrol, görünmez format veya bidi/],
    [{ teacherRationale: "Bu çocuk ör\u2060nek bir kişiliğe sahiptir." }, /kontrol, görünmez format veya bidi/],
    [{ teacherRationale: "Bu çocuk bencildir." }, /kişiliğini veya inancını/],
    [{ teacherRationale: "Çocuğu dua etmeye zorladım." }, /güvenlik sınırını/],
    [{ teacherRationale: "Dua ettiği için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Kur’an okuduğu için dürüstlük değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Müslüman olduğu için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Camiye gittiği için sorumluluk değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "İnandığı için adalet değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Allah’a inandığı için iyi bir çocuktur." }, /puan, etiket|supports\/contrasts/],
    [{ teacherRationale: "Dini nedeniyle saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Ceme katıldığı için sorumluluk değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Ramazan Bayramı kutlamasına katıldığı için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Tesbih çektiği için sorumluluk değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Mümin olduğu için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Hanefi olduğu için dürüstlük değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Fâtiha okuduğu için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Kur’ân okuduğu için dürüstlük değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "İncil okuduğu için sorumluluk değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Şabat ibadetine katıldığı için adalet değerini gösterdi." }, /supports\/contrasts/],
    [{ teacherRationale: "Vaftiz olduğu için saygı değerini gösterdi." }, /supports\/contrasts/],
    [{
      teacherRationale:
        "Arkadaşının başörtüsüne saygı gösterdi; kendisi namaz kıldığı için saygı değerini gösterdi.",
    }, /supports\/contrasts/],
    [{
      evidenceRole: "context_only",
      teacherRationale:
        "Ali namaz kıldı; kültürel bağlam olarak kaydedildi.",
    }, /yalnız yargısız kültürel bağlam/],
    [{ teacherRationale: rawText }, /ham gözlem metninin kopyası/],
  ];

  for (const [overrides, pattern] of cases) {
    const before = await store.readSnapshot();
    await assert.rejects(
      confirmObservationValueEvidenceLink(
        store,
        confirmationInput(chain, overrides),
      ),
      pattern,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  }
  assert.equal((await store.readSnapshot()).valueEvidenceLinks.length, 0);
  assert.equal(
    (await store.readSnapshot()).settings.some(
      (record) => record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
    ),
    false,
  );

  const culturalContextLink = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain, {
      evidenceRole: "context_only",
      teacherRationale:
        "Bayram duası etkinliğin kültürel bağlamında anıldı; çocuğun inancı hakkında çıkarım yapılmadı.",
    }),
  );
  assert.equal(culturalContextLink.evidenceRole, "context_only");
  assert.equal(
    parseTeacherEvidenceRationale(
      "Çocuk arkadaşına iyi günler diledi.",
      "supports",
    ),
    "Çocuk arkadaşına iyi günler diledi.",
  );
  assert.equal(
    parseTeacherEvidenceRationale(
      "Çocuk sorumlu olduğu materyali yerine bıraktı.",
      "supports",
    ),
    "Çocuk sorumlu olduğu materyali yerine bıraktı.",
  );
  assert.equal(
    parseTeacherEvidenceRationale(
      "Arkadaşının inancına saygı gösterip ona alan açtı.",
      "supports",
    ),
    "Arkadaşının inancına saygı gösterip ona alan açtı.",
  );
  for (const safeSentence of [
    "Çocuk arkadaşına materyal uzattı ve sırasını bekledi.",
    "Arkadaşını dinledi.",
    "Cem arkadaşına materyal verdi.",
    "Bu inanılmaz bir iş birliğiydi.",
    "Bayram arkadaşına alan açtı.",
    "Diğer çocuğun mezhebine saygı gösterip onu zorlamadı.",
  ]) {
    assert.equal(
      parseTeacherEvidenceRationale(safeSentence, "supports"),
      safeSentence,
    );
  }
  for (const codePoint of [
    0x0000,
    0x0009,
    0x000a,
    0x200b,
    0x200c,
    0x200d,
    0x2060,
    0xfeff,
    0x202a,
    0x202b,
    0x202c,
    0x202d,
    0x202e,
    0x2066,
    0x2067,
    0x2068,
    0x2069,
  ]) {
    assert.throws(
      () =>
        parseTeacherEvidenceRationale(
          `Sırasını${String.fromCodePoint(codePoint)}bekledi.`,
          "supports",
        ),
      /kontrol, görünmez format veya bidi/,
    );
  }
});

test("yalnız canlı, değişmez ve tek çocuklu premium v3 gözlem bağlanabilir", async () => {
  for (const mutation of [
    (observation) => { observation.rawTextImmutable = false; },
    (observation) => { observation.deletedAt = "2026-09-08T07:30:00.000Z"; },
    (observation) => { observation.studentIds = [studentId, otherStudentId]; },
  ]) {
    const store = activeStore();
    const chain = await createPremiumEvidenceChain(store);
    mutation(store.snapshot.observations[0]);
    const before = await store.readSnapshot();
    await assert.rejects(
      confirmObservationValueEvidenceLink(store, confirmationInput(chain)),
      /değişmez ham gözlem|tek çocuklu/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  }

  const legacyStore = activeStore();
  const legacyChain = await createPremiumEvidenceChain(legacyStore, 2);
  await assert.rejects(
    confirmObservationValueEvidenceLink(
      legacyStore,
      confirmationInput(legacyChain, {
        targetValueCode: "D1",
        targetIndicatorCode: "D1.1.1",
      }),
    ),
    /yalnız kanonik Eylül 2026 premium v3/,
  );
  assert.equal((await legacyStore.readSnapshot()).valueEvidenceLinks.length, 0);

  for (const sensitiveRawText of [
    "Namaz kıldı; iyi ve saygılı bir çocuktu.",
    "Saygı: 95 olarak kaydedildi.",
    "Tesbih çektiği için sorumlu bir çocuktur.",
    "Fâtiha okudu.",
    "Kur’ân okudu.",
    "Hayırlı bir evlattır.",
  ]) {
    const sensitiveStore = activeStore();
    const sensitiveChain = await createPremiumEvidenceChain(sensitiveStore);
    // Eski yedek/bozulmuş depo senaryosu: yazma-öncesi kapı aşılsa bile
    // downstream değer bağı koruması hassas kaydı kullanamamalıdır.
    sensitiveStore.snapshot.observations[0].rawText = sensitiveRawText;
    const before = await sensitiveStore.readSnapshot();
    await assert.rejects(
      confirmObservationValueEvidenceLink(
        sensitiveStore,
        confirmationInput(sensitiveChain),
      ),
      /ham gözlem|kişisel inancı|karakter hükmü/,
    );
    assert.deepEqual(await sensitiveStore.readSnapshot(), before);
  }
});

test("duplicate conflict, supersede ve tombstone geçmişi sessiz overwrite veya fiziksel silme yapmaz", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const beforeConflict = await store.readSnapshot();
  await assert.rejects(
    supersedeObservationValueEvidenceLink(store, {
      linkId: first.id,
      evidenceRole: first.evidenceRole,
      teacherRationale: first.teacherRationale,
      now: new Date("2026-09-08T08:05:00.000Z"),
    }),
    /gerçek bir değişiklik/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeConflict);
  await assert.rejects(
    confirmObservationValueEvidenceLink(
      store,
      confirmationInput(chain, {
        teacherRationale: "Aynı hedef için farklı bir gerekçe girildi.",
        linkId: retryLinkId,
      }),
    ),
    /supersede kullanılmalıdır/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeConflict);

  const corrected = await supersedeObservationValueEvidenceLink(store, {
    linkId: first.id,
    evidenceRole: "contrasts",
    teacherRationale:
      "Gözlenen bekleme güçlüğü, aynı göstergenin karşı örneği olarak ilişkilendirildi.",
    now: new Date("2026-09-08T08:10:00.000Z"),
  });
  assert.equal(corrected.tombstone.id, first.id);
  assert.equal(corrected.tombstone.deletedAt, "2026-09-08T08:10:00.000Z");
  assert.equal(corrected.replacement.supersedesLinkId, first.id);
  assert.equal(corrected.replacement.evidenceRole, "contrasts");
  assert.equal(corrected.replacement.targetValueCode, first.targetValueCode);
  assert.equal(corrected.replacement.targetIndicatorCode, first.targetIndicatorCode);
  assert.deepEqual(corrected.replacement.provenance, first.provenance);
  assert.equal((await listValueEvidenceLinksByObservation(store, observationId)).length, 1);
  assert.equal(
    (await listValueEvidenceLinksByObservation(store, observationId, { includeTombstones: true })).length,
    2,
  );

  const repeatedPredecessor = await tombstoneObservationValueEvidenceLink(store, {
    linkId: corrected.tombstone.id,
    now: new Date("2026-09-08T08:15:00.000Z"),
  });
  assert.deepEqual(repeatedPredecessor, corrected.tombstone);
  assert.equal((await store.readSnapshot()).valueEvidenceLinks.length, 2);

  const removed = await tombstoneObservationValueEvidenceLink(store, {
    linkId: corrected.replacement.id,
    now: new Date("2026-09-08T08:20:00.000Z"),
  });
  const repeated = await tombstoneObservationValueEvidenceLink(store, {
    linkId: corrected.replacement.id,
    now: new Date("2026-09-08T08:30:00.000Z"),
  });
  assert.deepEqual(repeated, removed);
  assert.equal((await store.readSnapshot()).valueEvidenceLinks.length, 2);
  assert.equal((await listValueEvidenceLinksByObservation(store, observationId)).length, 0);

  const renewed = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain, {
      linkId: thirdLinkId,
      teacherRationale: "Tombstone sonrasında öğretmenin yeni açık onayı kaydedildi.",
      now: new Date("2026-09-08T08:40:00.000Z"),
    }),
  );
  assert.equal(renewed.id, thirdLinkId);
  assert.equal((await store.readSnapshot()).valueEvidenceLinks.length, 3);
});

test("tombstone yerel kimlik aynı UUID ile canlanır; ayrılmış ayar kimliği çakışması fail-closed kalır", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const identity = store.snapshot.settings.find(
    (record) => record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID,
  );
  identity.deletedAt = "2026-09-08T08:01:00.000Z";
  identity.updatedAt = identity.deletedAt;

  const retry = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain, {
      linkId: retryLinkId,
      now: new Date("2026-09-08T08:02:00.000Z"),
    }),
  );
  const revivedIdentity = store.snapshot.settings.find(
    (record) => record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID,
  );
  assert.equal(retry.id, first.id);
  assert.equal(revivedIdentity.teacherUserId, first.confirmedByActorId);
  assert.equal(revivedIdentity.deletedAt, null);
  assert.equal(store.snapshot.valueEvidenceLinks.length, 1);

  const collisionStore = activeStore();
  const collisionChain = await createPremiumEvidenceChain(collisionStore);
  collisionStore.snapshot.settings.push({
    ...base,
    id: LOCAL_TEACHER_IDENTITY_SETTING_ID,
    settingType: "unrelated-reserved-setting",
  });
  const beforeCollision = await collisionStore.readSnapshot();
  await assert.rejects(
    confirmObservationValueEvidenceLink(
      collisionStore,
      confirmationInput(collisionChain),
    ),
    /başka bir ayar türü/,
  );
  assert.deepEqual(await collisionStore.readSnapshot(), beforeCollision);
});

test("forged v3 paket kimliği, sürümü, yayın kimliği veya manifesti sıfır yazımla reddedilir", async () => {
  const mutations = [
    ["id", "maarifos-forged-v3"],
    ["version", "3.0.1"],
    ["contentReleaseId", "tymm-6072-forged-v3"],
    ["manifestDigest", `sha256:${"0".repeat(64)}`],
    ["displayName", "forged"],
    ["sourceUrl", "https://evil.example/forged.pdf"],
    ["sourceCheckedOn", "2099-01-01"],
  ];
  for (const [field, value] of mutations) {
    const store = activeStore();
    const chain = await createPremiumEvidenceChain(store);
    store.snapshot.plans.find((record) => record.id === dailyPlanId)
      .sourceContentPackSnapshot[field] = value;
    store.snapshot.activities.find((record) => record.id === dailyActivityId)
      .sourceContentPackSnapshot[field] = value;
    const before = await store.readSnapshot();
    await assert.rejects(
      confirmObservationValueEvidenceLink(store, confirmationInput(chain)),
      /kanonik Eylül 2026 premium v3/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  }

  const nestedStore = activeStore();
  const nestedChain = await createPremiumEvidenceChain(nestedStore);
  for (const record of [
    nestedStore.snapshot.plans.find((item) => item.id === dailyPlanId),
    nestedStore.snapshot.activities.find((item) => item.id === dailyActivityId),
  ]) {
    record.sourceContentPackSnapshot.valuesContract.unexpectedApproval = true;
  }
  const beforeNested = await nestedStore.readSnapshot();
  await assert.rejects(
    confirmObservationValueEvidenceLink(
      nestedStore,
      confirmationInput(nestedChain),
    ),
    /beklenmeyen alan içeriyor: unexpectedApproval/,
  );
  assert.deepEqual(await nestedStore.readSnapshot(), beforeNested);
});

test("readonly preimage değişirse digest üretilse bile readwrite yeniden okuma bağlantıyı reddeder", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  store.afterReadonly = async (snapshot) => {
    const plan = snapshot.plans.find((record) => record.id === dailyPlanId);
    const activity = snapshot.activities.find((record) => record.id === dailyActivityId);
    const appliedTemplateId = activity.appliedActivityTemplateId;
    const installedTemplates = snapshot.plans
      .flatMap((record) =>
        Array.isArray(record.premiumActivityTemplates)
          ? record.premiumActivityTemplates
          : [],
      )
      .filter((template) => template.id === appliedTemplateId);
    for (const template of [
      plan.appliedActivityTemplateSnapshot,
      activity.appliedActivityTemplateSnapshot,
      ...installedTemplates,
    ]) {
      template.valuesDesign.editorialReview.note +=
        " Kaynak yarış testi.";
    }
  };

  await assert.rejects(
    confirmObservationValueEvidenceLink(store, confirmationInput(chain)),
    /onay sırasında değişti/,
  );
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.valueEvidenceLinks.length, 0);
  assert.equal(
    snapshot.settings.some(
      (record) => record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
    ),
    false,
  );
});

test("supersede readonly ile readwrite arasında eski canlı link değişirse atomik düzeltme yapmaz", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  store.afterReadonly = async (snapshot) => {
    snapshot.valueEvidenceLinks[0].teacherRationale =
      "Eşzamanlı başka bir güvenli öğretmen gerekçesi.";
  };
  await assert.rejects(
    supersedeObservationValueEvidenceLink(store, {
      linkId: first.id,
      evidenceRole: "contrasts",
      teacherRationale: "Yeni düzeltme gerekçesi.",
      now: new Date("2026-09-08T08:10:00.000Z"),
    }),
    /işlem sırasında değişti/,
  );
  assert.equal(store.snapshot.valueEvidenceLinks.length, 1);
  assert.equal(store.snapshot.valueEvidenceLinks[0].deletedAt, null);
});

test("supersede bozulmuş predecessor kapsam veya plan ilişkisini yeni kayıtla örtemez", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  store.snapshot.valueEvidenceLinks[0].planId =
    "00000000-0000-4000-8000-000000000899";
  const before = await store.readSnapshot();
  await assert.rejects(
    supersedeObservationValueEvidenceLink(store, {
      linkId: first.id,
      evidenceRole: "contrasts",
      teacherRationale: "Plan ilişkisi bozuk kaydı düzeltmeye çalışma gerekçesi.",
      now: new Date("2026-09-08T08:10:00.000Z"),
    }),
    /kapsam veya kaynak ilişkisi bozuk/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("supersede daha önce successor üretmiş predecessor için ikinci dal oluşturmaz", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const firstCorrection = await supersedeObservationValueEvidenceLink(store, {
    linkId: first.id,
    evidenceRole: "contrasts",
    teacherRationale: "İlk ve tek düzeltme gerekçesi.",
    now: new Date("2026-09-08T08:10:00.000Z"),
  });
  const predecessor = store.snapshot.valueEvidenceLinks.find(
    (link) => link.id === first.id,
  );
  predecessor.deletedAt = null;
  predecessor.updatedAt = predecessor.createdAt;
  const successor = store.snapshot.valueEvidenceLinks.find(
    (link) => link.id === firstCorrection.replacement.id,
  );
  successor.deletedAt = "2026-09-08T08:20:00.000Z";
  successor.updatedAt = successor.deletedAt;
  const before = await store.readSnapshot();

  await assert.rejects(
    supersedeObservationValueEvidenceLink(store, {
      linkId: first.id,
      evidenceRole: "context_only",
      teacherRationale: "İkinci bir dal üretmemesi gereken gerekçe.",
      now: new Date("2026-09-08T08:30:00.000Z"),
    }),
    /ikinci düzeltme dalı oluşturulamaz/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("tombstone aktif predecessor bir successor tarafından sahiplenilmişse sıfır yazımla reddeder", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const correction = await supersedeObservationValueEvidenceLink(store, {
    linkId: first.id,
    evidenceRole: "contrasts",
    teacherRationale: "Tek successor üreten düzeltme gerekçesi.",
    now: new Date("2026-09-08T08:10:00.000Z"),
  });
  const predecessor = store.snapshot.valueEvidenceLinks.find(
    (link) => link.id === first.id,
  );
  predecessor.deletedAt = null;
  predecessor.updatedAt = predecessor.createdAt;
  const successor = store.snapshot.valueEvidenceLinks.find(
    (link) => link.id === correction.replacement.id,
  );
  successor.deletedAt = "2026-09-08T08:20:00.000Z";
  successor.updatedAt = successor.deletedAt;
  const before = await store.readSnapshot();

  await assert.rejects(
    tombstoneObservationValueEvidenceLink(store, {
      linkId: first.id,
      now: new Date("2026-09-08T08:30:00.000Z"),
    }),
    /successor.*tombstone uygulanamaz/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("tombstone readonly sonrasında eklenen successor claim'ini readwrite yeniden okumada reddeder", async () => {
  const store = activeStore();
  const chain = await createPremiumEvidenceChain(store);
  const first = await confirmObservationValueEvidenceLink(
    store,
    confirmationInput(chain),
  );
  const correction = await supersedeObservationValueEvidenceLink(store, {
    linkId: first.id,
    evidenceRole: "contrasts",
    teacherRationale: "Yarış fixture'ı için üretilen düzeltme gerekçesi.",
    now: new Date("2026-09-08T08:10:00.000Z"),
  });
  const predecessor = structuredClone(
    store.snapshot.valueEvidenceLinks.find((link) => link.id === first.id),
  );
  predecessor.deletedAt = null;
  predecessor.updatedAt = predecessor.createdAt;
  const successor = structuredClone(
    store.snapshot.valueEvidenceLinks.find(
      (link) => link.id === correction.replacement.id,
    ),
  );
  successor.deletedAt = "2026-09-08T08:20:00.000Z";
  successor.updatedAt = successor.deletedAt;
  store.snapshot.valueEvidenceLinks = [predecessor];
  const expected = await store.readSnapshot();
  expected.valueEvidenceLinks.push(successor);
  store.afterReadonly = async (snapshot) => {
    snapshot.valueEvidenceLinks.push(structuredClone(successor));
  };

  await assert.rejects(
    tombstoneObservationValueEvidenceLink(store, {
      linkId: first.id,
      now: new Date("2026-09-08T08:30:00.000Z"),
    }),
    /successor.*tombstone uygulanamaz/,
  );
  assert.deepEqual(await store.readSnapshot(), expected);
});
