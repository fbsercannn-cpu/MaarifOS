import assert from "node:assert/strict";
import test from "node:test";

import {
  ROOF_VALUE_CODES,
  VALUE_CODES,
  VALUE_DEFINITIONS_BY_CODE,
  VALUES_PEDAGOGY_CONSTITUTION,
} from "../../src/features/values/values-constitution.ts";
import {
  OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE,
} from "../../src/features/values/official-preschool-value-actions.ts";
import {
  FOREST_SCHOOL_NATURE_ACTIVITY_BOUNDARY,
  FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY,
  PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY,
  evaluateVerifiedMonthlyCoverage,
  evaluateVerifiedMonthlyCulturalContinuity,
  evaluateVerifiedTermCoverage,
  parseAnnualValuesPlan,
  parseDailyValuesPlan,
  parseFamilyCommunityValuesPlan,
  parseForestSchoolValuesOverlay,
  parseMonthlyValuesPlan,
  parseObservationEvidenceIntent,
  parsePlanValueIntent,
  parsePreparedEnvironmentValuesOverlay,
  parseTeacherValuesEvaluation,
  parseWeeklyValuesPlan,
} from "../../src/features/values/value-plan-contracts.ts";

const culturalBridgeId = VALUES_PEDAGOGY_CONSTITUTION.culturalBridges[0].id;
const confirmedAtUtc = "2026-08-07T08:30:00.000Z";
const httpsReviewEvidence = Object.freeze({
  sourceVersion: "test-source-1",
  sourceSha256: `sha256:${"a".repeat(64)}`,
  reviewerRole: "turkish-islamic-culture-and-theology",
  reviewerActorId: "reviewer-test-independent-1",
  reviewDecisionId: "cultural-review-decision-https-1",
  reviewedAtUtc: confirmedAtUtc,
});
const oralReviewEvidence = Object.freeze({
  ...httpsReviewEvidence,
  sourceVersion: "test-oral-source-1",
  sourceSha256: `sha256:${"b".repeat(64)}`,
  reviewDecisionId: "cultural-review-decision-oral-1",
});
const baseReviewSubject = Object.freeze({
  culturalBridgeId,
  locality: "Denizli",
  period: "Güncel yerel uygulama",
  variant: "Denizli anlatım varyantı",
  adaptationNote:
    "Kaynak, okul öncesi çocuk için somut bakım ve paylaşma eylemine uyarlanır.",
});
const registeredReviewRequests = new Map([
  [
    httpsReviewEvidence.reviewDecisionId,
    {
      ...baseReviewSubject,
      sourceKind: "https",
      sourceTitle: "Kurumsal kültür kaynağı",
      sourceLocator: "https://example.org/kultur-kaynagi",
      checkedAtUtc: confirmedAtUtc,
      reviewEvidence: httpsReviewEvidence,
    },
  ],
  [
    oralReviewEvidence.reviewDecisionId,
    {
      ...baseReviewSubject,
      sourceKind: "oral_local",
      sourceTitle: "Yerel kültür aktarımı",
      sourceLocator:
        "oral_local:local_culture_bearer:Denizli Somut Olmayan Kültürel Miras Kurulu",
      checkedAtUtc: confirmedAtUtc,
      reviewEvidence: oralReviewEvidence,
    },
  ],
]);
const authoritativeReviewRegistry = (reviewDecisionId) => {
  const registered = registeredReviewRequests.get(reviewDecisionId);
  return registered
    ? {
        ...structuredClone(registered),
        decision: "accepted",
        independentReviewer: true,
      }
    : null;
};
const officialActionEntryByValueCode = Object.freeze(
  Object.fromEntries(
    VALUE_CODES.map((code) => {
      const entry = Object.values(OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE)
        .find((candidate) => candidate.valueCode === code);
      assert.ok(entry, `${code} için doğrulanmış bir Ek-14 göstergesi bulunmalıdır.`);
      return [code, entry];
    }),
  ),
);

function verifiedCulturalContext(overrides = {}) {
  return {
    culturalBridgeId,
    locality: "Denizli",
    period: "Güncel yerel uygulama",
    variant: "Denizli anlatım varyantı",
    adaptationNote: "Kaynak, okul öncesi çocuk için somut bakım ve paylaşma eylemine uyarlanır.",
    provenance: {
      sourceKind: "https",
      sourceTitle: "Kurumsal kültür kaynağı",
      sourceUrl: "https://example.org/kultur-kaynagi",
      oralLocalSource: null,
      status: "verified",
      checkedAtUtc: confirmedAtUtc,
      reviewEvidence: { ...httpsReviewEvidence },
    },
    ...overrides,
  };
}

function validMapping(code, { family = true, nature = true, cultural = true } = {}) {
  const roofValueCode = ROOF_VALUE_CODES.includes(code)
    ? code
    : VALUE_DEFINITIONS_BY_CODE[code].roofLinks[0];
  const officialEntry = officialActionEntryByValueCode[code];
  return {
    designDirection: "value_led",
    primaryValueCode: code,
    roofValueCode,
    roofValueChecks: {
      respect: "Çocuğun sınırı, sözü ve farklı ifade yolu görünür biçimde korunur.",
      responsibility: "Çocuk yaşına uygun gerçek bir görevi seçer ve sonucu onarma fırsatı bulur.",
      justice: "Roller, erişim ihtiyacı ve söz hakkı gözetilerek hakkaniyetle dağıtılır.",
    },
    supportingValueCodes: [],
    officialActionSnapshots: [{
      valueCode: officialEntry.valueCode,
      actionCode: officialEntry.actionCode,
      actionName: officialEntry.actionName,
      indicatorCode: officialEntry.indicatorCode,
      indicatorText: officialEntry.indicatorText,
      catalogId: officialEntry.catalogId,
      sourceVersion: officialEntry.sourceVersion,
      sourceUrl: officialEntry.sourceUrl,
      sourceSha256: officialEntry.sourceSha256,
      sourcePage: officialEntry.sourcePage,
    }],
    culturalBridgeIds: cultural ? [culturalBridgeId] : [],
    rationale: "Değer, çocuğun günlük yaşamındaki somut bir ilişki ve katkı davranışıyla kurulur.",
    livedContextOrDilemma: "Çocuklar ortak bir malzemenin kullanımı ve bakım yolu için seçenek üretir.",
    adultModelActions: ["Öğretmen izin istemeyi, dinlemeyi ve hakkaniyetli sıra kurmayı model olur."],
    childAgencyOptions: [
      "Çocuk katılım yolunu söz, işaret veya nesneyle seçebilir.",
      "Çocuk mola verebilir ve hazır olduğunda eşdeğer bir yoldan geri dönebilir.",
    ],
    repairOrContributionOptions: ["Çocuk ortak alan için yaşına uygun bir onarım veya bakım katkısı seçebilir."],
    ...(family
      ? { familyCommunityTransfer: "Aileye gönüllü, düşük maliyetli ve eşdeğer seçenekli bir bakım daveti sunulur." }
      : {}),
    ...(nature
      ? { natureStewardshipTransfer: "Çocuk kullanılan doğal kaynağın korunması için güvenli bir bakım yolu seçer." }
      : {}),
    observationPrompts: ["Çocuk seçimini ve katkısını hangi gözlenebilir eylemle gösterdi?"],
    counterEvidencePrompt: "Eylemin görülmediği veya daha fazla ortam desteği gerektirdiği bağlam neydi?",
    reflectionPrompt: "Yetişkin dili, ortam ve materyal çocuğun seçimini nasıl etkiledi?",
    nextPlanDecisionRule: "Katılım yolları dar kaldıysa sonraki planda yeni ve erişilebilir bir ifade yolu eklenir.",
  };
}

function validIntent(code, options = {}) {
  const {
    verified = true,
    family = true,
    nature = true,
    cultural = true,
    id = `intent-${code}-${verified ? "verified" : "draft"}`,
  } = options;
  const context = verifiedCulturalContext();
  if (!verified) {
    context.provenance.status = "draft";
    context.provenance.checkedAtUtc = null;
    delete context.provenance.reviewEvidence;
  }
  return {
    id,
    version: 1,
    mapping: validMapping(code, { family, nature, cultural }),
    culturalContexts: cultural ? [context] : [],
    verification: {
      status: verified ? "verified" : "draft",
      teacherConfirmed: verified,
      confirmedAtUtc: verified ? confirmedAtUtc : null,
    },
  };
}

function roofChecks(intents) {
  const used = new Set(
    intents
      .filter((intent) => intent.verification.status === "verified")
      .map((intent) => intent.mapping.roofValueCode),
  );
  return ROOF_VALUE_CODES.map((valueCode) => ({
    valueCode,
    status: used.has(valueCode) ? "verified_present" : "reviewed_not_selected",
    rationale: used.has(valueCode)
      ? `${valueCode} doğrulanmış değer niyetinde somut yetişkin ve çocuk eylemine bağlanır.`
      : `${valueCode} bu kapsam için incelendi; mekanik ekleme yapılmadı.`,
  }));
}

function observationIntent(intent, suffix = "1") {
  return {
    id: `observation-${intent.id}-${suffix}`,
    valueIntentId: intent.id,
    observableActionPrompt: "Çocuk hangi somut eylemi, hangi bağlamda ve hangi katılım yoluyla gösterdi?",
    contextAndSupportPrompt: "Ortam, materyal, yetişkin veya akran desteği eylemi nasıl etkiledi?",
    counterEvidencePrompt: "Aynı eylemin görülmediği ya da farklılaştığı karşı bağlam neydi?",
    evidenceRoles: ["supports", "contrasts", "context_only"],
    childVoiceCapture: "optional",
    teacherConfirmationRequired: true,
    singleEventCharacterInferenceProhibited: true,
  };
}

function emptyOverlays() {
  return { forestSchool: null, preparedEnvironment: null };
}

function monthlyPlan() {
  const intents = ["D1", "D14", "D16", "D4"].map((code) => validIntent(code));
  return {
    schemaVersion: 1,
    planType: "monthly",
    id: "month-plan-2026-09",
    yearPlanId: "year-plan-2026",
    monthKey: "2026-09",
    programProfileId: "tymm-preschool-2024",
    valueIntents: intents,
    selectedValueCodes: intents.map((intent) => intent.mapping.primaryValueCode),
    roofValueChecks: roofChecks(intents),
    familyCommunityBalance: {
      valueIntentIds: [intents[0].id],
      rationale: "Ay içinde okul ve aile arasında gönüllü, düşük maliyetli bir devam yolu korunur.",
      participationOptional: true,
      noResponsePenalty: false,
      lowOrNoCostAlternative: "Aile yalnız konuşarak, çizerek veya paylaşmayarak katılım biçimini seçebilir.",
    },
    natureStewardshipBalance: {
      valueIntentIds: [intents[1].id],
      rationale: "Ay içinde doğayla ilişki, gerçek bakım ve kaynak sorumluluğu eylemine bağlanır.",
      safetyAndAccessPlan: "Alan önceden incelenir ve her çocuk için güvenli erişim yolu sunulur.",
      indoorAlternative: "Hava koşulunda aynı bakım sorusu sınıftaki canlı köşesinde sürdürülür.",
    },
    culturalContinuity: {
      valueIntentIds: [intents[2].id],
      rationale: "Yerel kültür köprüsü kaynak ve uyarlama zinciri doğrulanarak ay boyunca sürdürülür.",
    },
    reflectionPrompt: "Hangi ortamlar değer eylemlerini kolaylaştırdı, hangileri yeni destek gerektirdi?",
    nextMonthDecisionRule: "Eksik kalan fırsat sonraki ay uygun bağlama taşınır; çocuğa başarı hükmü verilmez.",
    overlays: emptyOverlays(),
  };
}

function forestOverlay(intents, overrides = {}) {
  return {
    schemaVersion: 1,
    overlayType: "forest_school",
    id: "forest-overlay-autumn",
    claimLevel: "nature_based_continuity",
    governingStandard: "https://forestschoolassociation.org/full-principles-and-criteria-for-good-practice/",
    leaderQualificationEvidenceRefs: [],
    recognitionEvidenceRefs: [],
    siteId: "school-garden-zone-a",
    civilDateRange: { start: "2026-09-01", end: "2027-03-01" },
    cadence: "İki haftada bir aynı çekirdek grupla düzenli oturum",
    plannedSessionIds: Array.from({ length: 12 }, (_, index) => `session-${index + 1}`),
    valueIntentIds: intents.map((intent) => intent.id),
    roofValueChecks: roofChecks(intents),
    seasonalReturnPoints: ["İlk yaprak izleri", "Sonbahar değişiminin yeniden gözlenmesi"],
    childLedInquiryThreads: ["Çocukların aynı yerde fark ettiği değişim soruları izlenir."],
    careAndReciprocityCommitments: ["Alana verilen bakım, kullanılan kaynağa karşı gerçek katkı olarak planlanır."],
    riskBenefitReviews: ["Her oturum öncesi yaşa uygun risk–fayda incelemesi güncellenir."],
    dynamicRiskProtocol: "Değişen hava ve saha durumu oturum sırasında yeniden değerlendirilir.",
    accessibilityRoutes: ["Hareket, iletişim ve duyusal ihtiyaçlar için eşdeğer rota sağlanır."],
    weatherAndEmergencyRules: ["Hava eşiği, toplanma alanı ve acil iletişim yolu önceden tanımlanır."],
    leaveNoTraceAndHabitatCare: ["Canlı ve habitat korunur; alan kullanım sonrası birlikte gözden geçirilir."],
    observationReviewReplanningCycle: [
      "Çocuk ilgisi ve saha gözlemi oturum sonunda kaydedilir.",
      "Sonraki oturum önceki gözlem ve karşı kanıta göre uyarlanır.",
    ],
    familyCommunityConnection: ["Aileye pahalı ekipman gerektirmeyen gönüllü bir yer gözlemi sunulur."],
    incidentAndNearMissReview: "Olay ve ramak kala kaydı çocuk hükmü üretmeden plan güvenliğini günceller.",
    qualifiedPracticeBoundary: FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY,
    ...overrides,
  };
}

function preparedEnvironmentOverlay(intents, overrides = {}) {
  return {
    schemaVersion: 1,
    overlayType: "prepared_environment",
    id: "prepared-environment-overlay-1",
    claimLevel: "montessori_inspired",
    certificationClaimed: false,
    valueIntentIds: intents.map((intent) => intent.id),
    roofValueChecks: roofChecks(intents),
    environmentArea: "Günlük yaşam ve ortak bakım alanı",
    realLifeWork: "Çocuk ortak malzemeyi seçer, kullanır ve yerine koyma sürecine katılır.",
    childSizedAccess: "Malzeme görünür, erişilebilir ve çocuk ölçeğinde güvenli raftadır.",
    orderAndReturnSequence: "İşin başlangıcı, kullanımı ve yerine koyma sırası görsel olarak erişilebilirdir.",
    independentChoice: "Çocuk işi, ifade yolunu ve tekrar sayısını güvenli sınırlar içinde seçebilir.",
    careOfSelfOthersEnvironment: "Çalışma kendine, başkasının alanına ve ortak çevreye özenle bağlanır.",
    repetitionAndSelfCorrection: "Çocuk tekrar deneyebilir; yetişkin ürünü sessizce düzeltmez.",
    adultObservationThreshold: "Yetişkin güvenlik veya yardım talebi yoksa önce gözler ve kısa model sunar.",
    interventionAndGraceCourtesyNotes: ["İzin isteme ve bekleme dili gerçek ilişkide yetişkin tarafından model olunur."],
    inclusionAndAccessRoutes: ["Kavrama, görme ve iletişim ihtiyacı için eşdeğer materyal ve ifade yolu sunulur."],
    certificationBoundary: PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY,
    ...overrides,
  };
}

test("ValueIntent somut eylem zincirini ve doğrulanmış kültürel provenance'ı dondurur", () => {
  const parsed = parsePlanValueIntent(validIntent("D4"), authoritativeReviewRegistry);

  assert.equal(parsed.mapping.primaryValueCode, "D4");
  assert.equal(parsed.culturalContexts[0].locality, "Denizli");
  assert.equal(parsed.culturalContexts[0].provenance.sourceKind, "https");
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.mapping));
  assert.ok(Object.isFrozen(parsed.culturalContexts[0].provenance));
});

test("aylık plan en az dört doğrulanmış niyet ile aile, doğa ve kültür dengesini zorunlu tutar", () => {
  const plan = monthlyPlan();
  const parsed = parseMonthlyValuesPlan(plan, authoritativeReviewRegistry);

  assert.deepEqual(parsed.selectedValueCodes, ["D1", "D14", "D16", "D4"]);
  assert.equal(parsed.familyCommunityBalance.participationOptional, true);
  assert.equal(parsed.natureStewardshipBalance.valueIntentIds.length, 1);
  assert.equal(parsed.culturalContinuity.valueIntentIds.length, 1);

  const noNatureBalance = structuredClone(plan);
  delete noNatureBalance.natureStewardshipBalance;
  assert.throws(
    () => parseMonthlyValuesPlan(noNatureBalance, authoritativeReviewRegistry),
    /zorunlu alanları eksik/i,
  );

  const optionalActivityTransfers = validIntent("D4", {
    family: false,
    nature: false,
    cultural: false,
  });
  assert.equal(
    parsePlanValueIntent(optionalActivityTransfers, authoritativeReviewRegistry)
      .mapping.familyCommunityTransfer,
    undefined,
  );
});

test("kapsama ve kültürel süreklilik taslak niyetleri saymaz", () => {
  const intents = [
    parsePlanValueIntent(validIntent("D1"), authoritativeReviewRegistry),
    parsePlanValueIntent(validIntent("D14"), authoritativeReviewRegistry),
    parsePlanValueIntent(validIntent("D16"), authoritativeReviewRegistry),
    parsePlanValueIntent(validIntent("D4", { verified: false }), authoritativeReviewRegistry),
  ];

  const monthly = evaluateVerifiedMonthlyCoverage(intents);
  assert.equal(monthly.valid, false);
  assert.deepEqual(monthly.coveredValueCodes, ["D1", "D14", "D16"]);
  assert.deepEqual(monthly.ignoredDraftIntentIds, ["intent-D4-draft"]);

  const cultural = evaluateVerifiedMonthlyCulturalContinuity(intents);
  assert.equal(cultural.valid, true);
  assert.ok(!cultural.valueIntentIds.includes("intent-D4-draft"));
  assert.deepEqual(cultural.ignoredUnverifiedValueIntentIds, ["intent-D4-draft"]);
});

test("yıllık plan her dönem D1–D20 ve her ay doğrulanmış dört değer ister", () => {
  const intents = VALUE_CODES.map((code) => validIntent(code));
  const parsedIntents = intents.map((intent) =>
    parsePlanValueIntent(intent, authoritativeReviewRegistry));
  const plan = {
    schemaVersion: 1,
    planType: "annual",
    id: "annual-plan-2026",
    academicYearId: "academic-year-2026",
    programProfileId: "tymm-preschool-2024",
    valueIntents: intents,
    terms: [{ id: "term-1", valueIntentIds: intents.map((intent) => intent.id) }],
    monthlyWindows: [{
      monthKey: "2026-09",
      valueIntentIds: intents.slice(0, 4).map((intent) => intent.id),
      familyCommunityValueIntentIds: [intents[0].id],
      natureStewardshipValueIntentIds: [intents[1].id],
      culturalValueIntentIds: [intents[2].id],
    }],
    roofValueChecks: roofChecks(intents),
    roofBalanceRationale: "Adalet, saygı ve sorumluluk yıl boyunca rutin, onarım ve çocuk seçimi bağlamında izlenir.",
    culturalCalendarAnchors: ["Yerel ve millî kültür bağlamları kaynak ve temsil incelemesiyle planlanır."],
    familyCommunityPartnershipPrinciples: ["Katılım gönüllü, mahrem ve düşük maliyetli eşdeğer yollar taşır."],
    inclusionAndSafeguardReview: "Yaş, dil, yeterlik, aile çeşitliliği ve din/vicdan özgürlüğü için erişim incelemesi yapılır.",
    overlays: emptyOverlays(),
  };

  assert.equal(evaluateVerifiedTermCoverage(parsedIntents).valid, true);
  assert.equal(
    parseAnnualValuesPlan(plan, authoritativeReviewRegistry).terms[0]
      .valueIntentIds.length,
    20,
  );

  const incomplete = structuredClone(plan);
  incomplete.terms[0].valueIntentIds.pop();
  assert.throws(
    () => parseAnnualValuesPlan(incomplete, authoritativeReviewRegistry),
    /D1–D20/i,
  );
});

test("haftalık plan doğa sürekliliği ve hazırlanmış çevreyi aynı doğrulanmış niyetlerin overlay'i olarak kurar", () => {
  const intents = ["D1", "D14", "D16"].map((code) => validIntent(code));
  const plan = {
    schemaVersion: 1,
    planType: "weekly",
    id: "week-plan-1",
    monthPlanId: "month-plan-2026-09",
    programProfileId: "tymm-preschool-2024",
    civilDateRange: { start: "2026-09-07", end: "2026-09-11" },
    valueIntents: intents,
    focusValueCodes: intents.map((intent) => intent.mapping.primaryValueCode),
    roofValueChecks: roofChecks(intents),
    routineActionOpportunities: ["Karşılama ve malzeme toplama sırasında gerçek sıra, bakım ve onarım fırsatı sunulur."],
    observationIntents: intents.map((intent) => observationIntent(intent)),
    repairOrContributionOpportunity: "Ortak alandaki bozulma, çocukların seçebileceği küçük ve güvenli katkılarla onarılır.",
    reflectionPrompt: "Rutin ve serbest oyun hangi değer eylemlerini görünür kıldı?",
    nextWeekDecisionRule: "Karşı kanıt görülen bağlam için ortam veya yetişkin desteği yeniden düzenlenir.",
    overlays: {
      forestSchool: forestOverlay(intents),
      preparedEnvironment: preparedEnvironmentOverlay(intents),
    },
  };

  const parsed = parseWeeklyValuesPlan(plan, authoritativeReviewRegistry);
  assert.equal(parsed.overlays.forestSchool.claimLevel, "nature_based_continuity");
  assert.equal(parsed.overlays.preparedEnvironment.certificationClaimed, false);
});

test("doğa sürekliliği Orman Okulu iddiasına dönüşmez; sahte standart ve tanınma referansları reddedilir", () => {
  const intents = ["D1", "D14", "D16"].map((code) =>
    parsePlanValueIntent(validIntent(code), authoritativeReviewRegistry));
  const shortClaim = forestOverlay(intents, { plannedSessionIds: ["session-1"] });
  assert.throws(
    () => parseForestSchoolValuesOverlay(shortClaim, intents),
    /en az on iki planlı oturum/i,
  );

  const fakeStandard = forestOverlay(intents, {
    governingStandard: "Uydurma Orman Okulu standardı",
  });
  assert.throws(
    () => parseForestSchoolValuesOverlay(fakeStandard, intents),
    /kanonik Forest School Association/i,
  );

  const unsupportedRecognition = forestOverlay(intents, {
    claimLevel: "recognised_or_certified_forest_school",
    governingStandard: "Uydurma standart",
    leaderQualificationEvidenceRefs: ["fake-leader"],
    recognitionEvidenceRefs: ["fake-recognition"],
  });
  assert.throws(
    () => parseForestSchoolValuesOverlay(unsupportedRecognition, intents),
    /yetkili sicil entegrasyonu olmadan kapalıdır/i,
  );

  const legacyInflatedClaim = forestOverlay(intents, {
    claimLevel: "forest_school_informed_continuity",
  });
  assert.throws(
    () => parseForestSchoolValuesOverlay(legacyInflatedClaim, intents),
    /dürüst nature_based_continuity/i,
  );

  const invertedBoundary = forestOverlay(intents, {
    qualifiedPracticeBoundary:
      "Orman Okulu değildir demek yanlıştır; tanınma iddiası değildir demek yanlıştır; nitelikli lider gereksizdir.",
  });
  assert.throws(
    () => parseForestSchoolValuesOverlay(invertedBoundary, intents),
    /kanonik Orman Okulu olmayan uygulama.*exact/i,
  );

  const honestNatureActivity = forestOverlay(intents, {
    claimLevel: "nature_based_activity",
    governingStandard: null,
    qualifiedPracticeBoundary: FOREST_SCHOOL_NATURE_ACTIVITY_BOUNDARY,
  });
  assert.equal(
    parseForestSchoolValuesOverlay(honestNatureActivity, intents).claimLevel,
    "nature_based_activity",
  );
  assert.throws(
    () => parseForestSchoolValuesOverlay({
      ...honestNatureActivity,
      qualifiedPracticeBoundary: "Bu resmî ve sertifikalı bir Orman Okulu programıdır.",
    }, intents),
    /kanonik Orman Okulu olmayan uygulama.*exact/i,
  );

  const prepared = preparedEnvironmentOverlay(intents, { certificationClaimed: true });
  assert.throws(
    () => parsePreparedEnvironmentValuesOverlay(prepared, intents),
    /sertifika iddiası false/i,
  );

  const falseMontessoriBoundary = preparedEnvironmentOverlay(intents, {
    certificationBoundary: "Bu AMI onaylı ve sertifikalı resmî Montessori programıdır.",
  });
  assert.throws(
    () => parsePreparedEnvironmentValuesOverlay(falseMontessoriBoundary, intents),
    /kanonik Montessori okul ve sertifika dışı uygulama sınırını exact/i,
  );
});

test("günlük plan doğal akış, en az iki seçim yolu, mola ve her niyet için karşı kanıt ister", () => {
  const intents = [validIntent("D4"), validIntent("D16")];
  const plan = {
    schemaVersion: 1,
    planType: "daily",
    id: "day-plan-2026-09-08",
    monthPlanId: "month-plan-2026-09",
    weekPlanId: "week-plan-1",
    programProfileId: "tymm-preschool-2024",
    civilDate: "2026-09-08",
    valueIntents: intents,
    valueMoments: [{ moment: "free_play", valueIntentIds: intents.map((intent) => intent.id) }],
    roofValueChecks: roofChecks(intents),
    adultModelCommitment: "Öğretmen yardım istemeyi, izin almayı ve bozulan ilişkiyi onarmayı görünür biçimde model olur.",
    childChoicePoints: [
      "Çocuk katılım biçimini seçebilir.",
      "Çocuk söz, işaret, hareket veya nesneyle ifade yolunu seçebilir.",
    ],
    pauseOrDeclinePath: "Çocuk güvenli biçimde ara verebilir ve hazır olduğunda eşdeğer yoldan geri dönebilir.",
    repairProtocol: "Zarar durdurulur, ihtiyaç dinlenir ve yaşa uygun onarım seçenekleri birlikte üretilir.",
    observationIntents: intents.map((intent) => observationIntent(intent)),
    safetyAndPrivacyChecks: ["Çocuğun paylaşmama hakkı ve kişisel sınırı korunur."],
    familyTransitionNote: "Aileye yalnız sınıf geneli, gönüllü ve mahrem bir devam önerisi sunulur.",
    overlays: emptyOverlays(),
  };

  assert.equal(
    parseDailyValuesPlan(plan, authoritativeReviewRegistry).valueMoments[0]
      .moment,
    "free_play",
  );

  const unknown = structuredClone(plan);
  unknown.unapprovedScore = 5;
  assert.throws(
    () => parseDailyValuesPlan(unknown, authoritativeReviewRegistry),
    /beklenmeyen alan/i,
  );

  const coercive = structuredClone(plan);
  coercive.valueIntents[0].mapping.adultModelActions = ["Çocuk ibadete zorlanır."];
  assert.throws(
    () => parseDailyValuesPlan(coercive, authoritativeReviewRegistry),
    /çocuk hakkı|zorlama|inanç özgürlüğü/i,
  );
});

test("gözlem/kanıt niyeti destek, karşı ve bağlam kanıtını birlikte ve öğretmen onaylı planlar", () => {
  const verified = parsePlanValueIntent(
    validIntent("D4"),
    authoritativeReviewRegistry,
  );
  const parsed = parseObservationEvidenceIntent(observationIntent(verified), [verified]);
  assert.deepEqual(parsed.evidenceRoles, ["supports", "contrasts", "context_only"]);

  const missingCounterRole = observationIntent(verified);
  missingCounterRole.evidenceRoles = ["supports", "context_only"];
  assert.throws(
    () => parseObservationEvidenceIntent(missingCounterRole, [verified]),
    /supports, contrasts ve context_only/i,
  );

  const draft = parsePlanValueIntent(
    validIntent("D5", { verified: false }),
    authoritativeReviewRegistry,
  );
  assert.throws(
    () => parseObservationEvidenceIntent(observationIntent(draft), [draft]),
    /yalnız öğretmen tarafından doğrulanmış/i,
  );
});

test("öğretmen değerlendirmesi çocuğu değil koşulları, karşı kanıtı ve sonraki fırsatı değerlendirir", () => {
  const intents = [validIntent("D4")];
  const evaluation = {
    schemaVersion: 1,
    planType: "teacher_evaluation",
    id: "teacher-reflection-1",
    periodId: "week-plan-1",
    scope: "week",
    programProfileId: "tymm-preschool-2024",
    valueIntents: intents,
    roofValueChecks: roofChecks(intents),
    observationIntents: intents.map((intent) => observationIntent(intent)),
    evidenceObservationIds: [],
    strengthAndEffortNoticed: "Çocukların farklı ifade yollarını deneme çabası ve birbirini dinleme anları görünür oldu.",
    conditionsThatSupportedParticipation: "Küçük grup, erişilebilir materyal ve bekleme süresi katılımı kolaylaştırdı.",
    barriersAndAdultContribution: "Yetişkinin hızlı soru sırası bazı çocukların düşünme zamanını daralttı.",
    equityAndBiasCheck: "Söz ve materyal erişimi ihtiyaca göre yeniden incelendi.",
    culturalAndConscienceCheck: "Kültürel içerik kaynaklıydı; katılım ve paylaşım tercihi çocukta kaldı.",
    counterEvidenceAndUncertainty: "Kalabalık geçişte aynı eylem görülmedi; ortam etkisini ayırmak için yeni kanıt gerekir.",
    nextOpportunity: "Sonraki planda küçük grup ve ek bekleme süresiyle yeni bir onarım fırsatı sunulur.",
    reviewStatus: "draft",
    teacherApproval: false,
  };

  assert.equal(
    parseTeacherValuesEvaluation(evaluation, authoritativeReviewRegistry)
      .teacherApproval,
    false,
  );

  const registeredEvaluationEvidence = new Map([
    "observation-week-1",
    "observation-week-2",
  ].map((observationId) => [
    observationId,
    {
      observationId,
      lifecycle: "live",
      rawTextImmutable: true,
      periodId: evaluation.periodId,
      scope: evaluation.scope,
      programProfileId: evaluation.programProfileId,
    },
  ]));
  const authoritativeEvidenceRegistry = (observationId) => {
    const registered = registeredEvaluationEvidence.get(observationId);
    return registered ? structuredClone(registered) : null;
  };
  const approved = structuredClone(evaluation);
  approved.evidenceObservationIds = ["observation-week-1", "observation-week-2"];
  approved.reviewStatus = "teacher_approved";
  approved.teacherApproval = true;
  assert.equal(
    parseTeacherValuesEvaluation(
      approved,
      authoritativeReviewRegistry,
      authoritativeEvidenceRegistry,
    ).teacherApproval,
    true,
  );

  const inconsistent = structuredClone(approved);
  inconsistent.teacherApproval = false;
  assert.throws(
    () => parseTeacherValuesEvaluation(
      inconsistent,
      authoritativeReviewRegistry,
      authoritativeEvidenceRegistry,
    ),
    /onay tutarlılığı/i,
  );

  for (const evidenceObservationIds of [[], ["observation-week-1"]]) {
    const insufficientEvidence = structuredClone(approved);
    insufficientEvidence.evidenceObservationIds = evidenceObservationIds;
    assert.throws(
      () => parseTeacherValuesEvaluation(
        insufficientEvidence,
        authoritativeReviewRegistry,
        authoritativeEvidenceRegistry,
      ),
      /week kapsamlı değerlendirme en az 2 farklı kanıt/i,
    );
  }

  const duplicateEvidence = structuredClone(approved);
  duplicateEvidence.evidenceObservationIds = [
    "observation-week-1",
    "observation-week-1",
  ];
  assert.throws(
    () => parseTeacherValuesEvaluation(
      duplicateEvidence,
      authoritativeReviewRegistry,
      authoritativeEvidenceRegistry,
    ),
    /benzersiz kimlikler/i,
  );

  assert.throws(
    () => parseTeacherValuesEvaluation(approved, authoritativeReviewRegistry),
    /yetkili gözlem sicilinde çözümlenmeden.*draft/i,
  );
  assert.throws(
    () => parseTeacherValuesEvaluation(
      approved,
      authoritativeReviewRegistry,
      () => {
        throw new Error("registry unavailable");
      },
    ),
    /güvenli biçimde çözümlenemedi.*draft/i,
  );

  const unknownEvidence = structuredClone(approved);
  unknownEvidence.evidenceObservationIds[1] = "unknown-observation";
  assert.throws(
    () => parseTeacherValuesEvaluation(
      unknownEvidence,
      authoritativeReviewRegistry,
      authoritativeEvidenceRegistry,
    ),
    /unknown-observation.*sicilinde bulunamadı.*draft/i,
  );

  for (const [field, invalidValue, expectedError] of [
    ["lifecycle", "deleted", /silinmiş veya pasif.*live/i],
    ["rawTextImmutable", false, /değişmez ham gözlem metnine/i],
    ["periodId", "other-period", /aynı dönem, kapsam ve program profiline/i],
    ["scope", "month", /aynı dönem, kapsam ve program profiline/i],
  ]) {
    const rejectingRegistry = (observationId) => {
      const registered = authoritativeEvidenceRegistry(observationId);
      return registered
        ? { ...registered, [field]: invalidValue }
        : null;
    };
    assert.throws(
      () => parseTeacherValuesEvaluation(
        approved,
        authoritativeReviewRegistry,
        rejectingRegistry,
      ),
      expectedError,
      field,
    );
  }

  for (const field of [
    "strengthAndEffortNoticed",
    "conditionsThatSupportedParticipation",
    "barriersAndAdultContribution",
    "equityAndBiasCheck",
    "culturalAndConscienceCheck",
    "counterEvidenceAndUncertainty",
    "nextOpportunity",
  ]) {
    const scoredCharacter = structuredClone(evaluation);
    scoredCharacter[field] = "Karakter açısından mükemmeldir; saygısı: 95.";
    assert.throws(
      () => parseTeacherValuesEvaluation(scoredCharacter, authoritativeReviewRegistry),
      /puan|karakter hükmü|ahlaki/i,
      field,
    );
  }

  const faithAsValueProof = structuredClone(evaluation);
  faithAsValueProof.culturalAndConscienceCheck =
    "Fâtiha okuduğu için değeri gösterdi.";
  assert.throws(
    () => parseTeacherValuesEvaluation(faithAsValueProof, authoritativeReviewRegistry),
    /inanç|ibadet|kültürel bağlam/i,
  );

  const judgmentFreeCulturalContext = structuredClone(evaluation);
  judgmentFreeCulturalContext.culturalAndConscienceCheck =
    "Fâtiha sözcüğü kültürel bağlamda anıldı; yalnız bağlamdır ve çocuk hakkında hüküm değildir.";
  assert.equal(
    parseTeacherValuesEvaluation(
      judgmentFreeCulturalContext,
      authoritativeReviewRegistry,
    )
      .culturalAndConscienceCheck,
    judgmentFreeCulturalContext.culturalAndConscienceCheck,
  );
});

test("aile/toplum planı gönüllülük, yanıtsızlığa yaptırımsızlık ve eşdeğer düşük maliyetli yollar taşır", () => {
  const intents = [validIntent("D2")];
  const plan = {
    schemaVersion: 1,
    planType: "family_community",
    id: "family-plan-1",
    programProfileId: "tymm-preschool-2024",
    valueIntents: intents,
    roofValueChecks: roofChecks(intents),
    purpose: "Okuldaki bakım ve dayanışma eylemini aile yaşamına gönüllü bir davetle taşımak.",
    invitationText: "Dilerseniz evde birlikte yaptığınız küçük bir bakım işini seçtiğiniz yolla paylaşabilirsiniz.",
    participationIsOptional: true,
    noResponseEffect: "none",
    choiceMenu: ["Kısa bir sözlü paylaşım", "Bir çizim veya ertesi gün sınıfta anlatım"],
    lowOrNoCostAlternative: "Hiçbir satın alma gerekmez; aile paylaşmamayı da seçebilir.",
    homeLanguageAndAccessOptions: ["Aile ev dilinde, sözle, işaretle veya çizimle katkı sunabilir."],
    faithAndCultureSensitivity: "Her aileye kendi kültürel bilgisini paylaşma veya özel tutma hakkı tanınır.",
    childAndFamilyPrivacy: "Aile katkısı açık izin olmadan toplu belgede veya çocuk değerlendirmesinde kullanılmaz.",
    feedbackChannel: "Aile kapalı not, kısa görüşme veya yanıt vermeme yolunu seçebilir.",
    schoolContinuation: "Paylaşılan bakım fikri çocuk adı anılmadan sınıftaki ortak işe taşınabilir.",
  };

  assert.equal(
    parseFamilyCommunityValuesPlan(plan, authoritativeReviewRegistry)
      .noResponseEffect,
    "none",
  );

  const penalty = structuredClone(plan);
  penalty.noResponseEffect = "negative_record";
  assert.throws(
    () => parseFamilyCommunityValuesPlan(penalty, authoritativeReviewRegistry),
    /sonucu olamaz/i,
  );
});

test("kültürel provenance yalnız yetkili sicildeki bağımsız uzman kararıyla verified olur", () => {
  const missingContext = validIntent("D4");
  missingContext.culturalContexts = [];
  assert.throws(
    () => parsePlanValueIntent(missingContext, authoritativeReviewRegistry),
    /culturalContext/i,
  );

  const insecure = validIntent("D4");
  insecure.culturalContexts[0].provenance.sourceUrl = "http://example.org/kaynak";
  assert.throws(
    () => parsePlanValueIntent(insecure, authoritativeReviewRegistry),
    /HTTPS URL/i,
  );

  const selfDeclaredVerified = validIntent("D4");
  assert.throws(
    () => parsePlanValueIntent(selfDeclaredVerified),
    /yetkili kültürel inceleme sicili.*draft/i,
  );

  for (const requiredSourceField of ["sourceSha256", "sourceVersion"]) {
    const incompleteSourceIdentity = validIntent("D4");
    delete incompleteSourceIdentity.culturalContexts[0].provenance.reviewEvidence[
      requiredSourceField
    ];
    assert.throws(
      () => parsePlanValueIntent(incompleteSourceIdentity, authoritativeReviewRegistry),
      /zorunlu alanları eksik/i,
    );
  }

  const forgedReviewer = validIntent("D4");
  forgedReviewer.culturalContexts[0].provenance.reviewEvidence.reviewerActorId =
    "self-declared-reviewer";
  assert.throws(
    () => parsePlanValueIntent(forgedReviewer, authoritativeReviewRegistry),
    /yetkili sicil kararıyla exact eşleşmiyor/i,
  );

  const nonIndependentRegistry = (reviewDecisionId) => {
    const registered = registeredReviewRequests.get(reviewDecisionId);
    return registered
      ? {
          ...structuredClone(registered),
          decision: "accepted",
          independentReviewer: false,
        }
      : null;
  };
  assert.throws(
    () => parsePlanValueIntent(validIntent("D4"), nonIndependentRegistry),
    /bağımsız uzman kararıyla verified/i,
  );

  const draftWithoutRegistry = parsePlanValueIntent(
    validIntent("D4", { verified: false }),
  );
  assert.equal(
    draftWithoutRegistry.culturalContexts[0].provenance.status,
    "draft",
  );

  const oral = validIntent("D4");
  oral.culturalContexts[0].provenance = {
    sourceKind: "oral_local",
    sourceTitle: "Yerel kültür aktarımı",
    sourceUrl: null,
    oralLocalSource: {
      sourceRole: "local_culture_bearer",
      verifyingInstitution: "Denizli Somut Olmayan Kültürel Miras Kurulu",
      verifiedAtUtc: confirmedAtUtc,
    },
    status: "verified",
    checkedAtUtc: confirmedAtUtc,
    reviewEvidence: { ...oralReviewEvidence },
  };
  assert.equal(
    parsePlanValueIntent(oral, authoritativeReviewRegistry)
      .culturalContexts[0].provenance.oralLocalSource.sourceRole,
    "local_culture_bearer",
  );

  const namedPersonField = structuredClone(oral);
  namedPersonField.culturalContexts[0].provenance.oralLocalSource.personName = "Örnek Kişi";
  assert.throws(
    () => parsePlanValueIntent(namedPersonField, authoritativeReviewRegistry),
    /beklenmeyen alan/i,
  );

  const inflatedLegacyKind = structuredClone(oral);
  inflatedLegacyKind.culturalContexts[0].provenance.sourceKind =
    "verified_oral_local";
  assert.throws(
    () => parsePlanValueIntent(inflatedLegacyKind, authoritativeReviewRegistry),
    /doğrulama iddiası taşımayan oral_local/i,
  );
});
