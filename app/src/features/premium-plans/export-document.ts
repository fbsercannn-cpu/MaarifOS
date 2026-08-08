import type {
  PremiumActivityTemplate,
  PremiumAnnualMonth,
  PremiumContentPack,
  PremiumFullDayFlowBlock,
  PremiumLensPreferenceSnapshot,
  PremiumMonthlyPlan,
  PremiumPlanWeek,
} from "./domain.ts";
import {
  assertPremiumPackActionAccess,
  assertVerifiedPremiumAccess,
  type VerifiedPremiumAccess,
} from "../premium-access/entitlement.ts";
import {
  valueDefinitionByCode,
  type ValueCode,
} from "../values/values-constitution.ts";
import { premiumPilotLensById } from "./lens-catalog.ts";
import type {
  InstalledPremiumPlanExportSource,
  PremiumPlanExportDailyPlan,
} from "./export-read-model.ts";
import {
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
  type PremiumMonthlyCriterionStatus,
  type PremiumMonthlyEvaluation,
  type PremiumWeeklyEvaluation,
} from "./plan-service.ts";

export type PremiumPlanExportFormat = "pdf" | "word";
export type PremiumPlanExportAccess = VerifiedPremiumAccess;

export interface PremiumPlanExportWeek extends PremiumPlanWeek {
  sourceRecordId: string;
  dailyPlans: readonly PremiumPlanExportDailyPlan[];
  evaluations: readonly PremiumWeeklyEvaluation[];
}

export interface PremiumPlanExportDocument {
  format: PremiumPlanExportFormat;
  fileName: string;
  title: string;
  programLabel: "TYMM 2024";
  ageLabel: "60–72 ay";
  academicRelease: string;
  contentPackId: string;
  contentPackVersion: string;
  valuesMappingStatus: PremiumContentPack["valuesMappingStatus"];
  annualPlanTitle: string;
  annualPlanRecordId: string;
  monthlyPlanRecordId: string;
  annualMonths: readonly PremiumAnnualMonth[];
  lensPreference: PremiumLensPreferenceSnapshot;
  monthlyPlan: PremiumMonthlyPlan;
  monthlyEvaluations: readonly PremiumMonthlyEvaluation[];
  fullDayFlow: readonly PremiumFullDayFlowBlock[];
  weeks: readonly PremiumPlanExportWeek[];
  activities: readonly PremiumActivityTemplate[];
  teacherReviewNotice: string;
}

export interface PremiumPlanExportFile {
  format: PremiumPlanExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  document: PremiumPlanExportDocument;
}

export interface PremiumPlanExportParagraph {
  text: string;
  style: "title" | "heading1" | "heading2" | "body" | "bullet" | "meta";
  pageBreakBefore?: boolean;
  forcePageBreakBefore?: boolean;
  keepWithNext?: boolean;
}

interface PremiumPlanPdfTextStyle {
  font: string;
  color: string;
  lineHeight: number;
  gap: number;
}

export interface PremiumPlanPdfPageItem {
  paragraphIndex: number;
  text: string;
  style: PremiumPlanExportParagraph["style"];
  lines: readonly string[];
  font: string;
  color: string;
  lineHeight: number;
  gap: number;
  height: number;
}

export interface PremiumPlanPdfPageLayout {
  items: readonly PremiumPlanPdfPageItem[];
  usedHeight: number;
}

const encoder = new TextEncoder();

export function preparePremiumPlanExportDocument(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
  access: PremiumPlanExportAccess,
  format: PremiumPlanExportFormat,
): PremiumPlanExportDocument {
  assertVerifiedPremiumAccess(access);
  if (access.grant.accessMode === "trial") {
    throw new Error("Deneme sürümünde PDF ve Word çıktısı kapalıdır.");
  }
  assertPremiumPackActionAccess(access, pack, "export");
  if (format !== "pdf" && format !== "word") {
    throw new Error("Dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const installedIdentity = source.contentPackSnapshot;
  if (
    installedIdentity.id !== pack.id ||
    installedIdentity.version !== pack.version ||
    installedIdentity.contentReleaseId !== pack.contentReleaseId ||
    installedIdentity.manifestDigest !== pack.manifestDigest ||
    installedIdentity.sku !== pack.sku ||
    installedIdentity.academicRelease !== pack.academicRelease ||
    installedIdentity.valuesMappingStatus !== source.valuesMappingStatus
  ) {
    throw new Error(
      "Belge yalnız seçili paketle aynı kimlik ve sürümü taşıyan kurulmuş plan kaydından hazırlanabilir.",
    );
  }
  const extension = format === "pdf" ? "pdf" : "docx";
  const monthlyPlan = {
    ...structuredClone(source.monthlyPlan.sourceSnapshot),
    title: source.monthlyPlan.teacherTitle,
  };
  const weeks = source.weeks.map((week) => ({
    ...structuredClone(week.sourceSnapshot),
    title: week.teacherTitle,
    sourceRecordId: week.recordId,
    dailyPlans: structuredClone(week.dailyPlans),
    evaluations: structuredClone(week.evaluations),
  }));
  return {
    format,
    fileName: `MaarifOS_TYMM_6072_Eylul_2026_v${pack.version}.${extension}`,
    title: monthlyPlan.title,
    programLabel: "TYMM 2024",
    ageLabel: "60–72 ay",
    academicRelease: pack.academicRelease,
    contentPackId: installedIdentity.id,
    contentPackVersion: installedIdentity.version,
    valuesMappingStatus: source.valuesMappingStatus,
    annualPlanTitle: source.annualPlan.teacherTitle,
    annualPlanRecordId: source.annualPlan.recordId,
    monthlyPlanRecordId: source.monthlyPlan.recordId,
    annualMonths: structuredClone(source.annualPlan.annualMonths),
    lensPreference: structuredClone(source.lensPreference),
    monthlyPlan,
    monthlyEvaluations: structuredClone(source.monthlyPlan.evaluations ?? []),
    fullDayFlow: structuredClone(source.monthlyPlan.fullDayFlow),
    weeks,
    activities: source.weeks.flatMap((week) =>
      structuredClone(week.activitySnapshots),
    ),
    teacherReviewNotice:
      "Bu belge öğretmenin sınıf bağlamına göre kurduğu plan zincirinden hazırlanmıştır; kaydedilmiş günlük uyarlamalar ile haftalık ve aylık öğretmen değerlendirmeleri varsa aynen eklenir.",
  };
}

function addList(
  target: PremiumPlanExportParagraph[],
  heading: string,
  values: readonly string[],
): void {
  if (values.length === 0) return;
  target.push({ text: heading, style: "heading2" });
  values.forEach((text) => target.push({ text, style: "bullet" }));
}

function valueLabel(code: ValueCode): string {
  return `${code} ${valueDefinitionByCode(code).officialName}`;
}

function lensLabel(lensId: string): string {
  const lens = premiumPilotLensById(lensId);
  return lens ? `${lens.displayName} (${lens.id})` : lensId;
}

function dailyBlockStatusLabel(
  status: PremiumPlanExportDailyPlan["dailyFlow"]["blocks"][number]["status"],
): string {
  if (status === "optional") return "isteğe bağlı";
  if (status === "skipped") return "uygulanmayacak";
  return "planlandı";
}

function nextPlanDecisionLabel(
  decision: PremiumWeeklyEvaluation["nextPlanDecision"],
): string {
  if (decision === "adapt") return "Uyarlayarak sürdür";
  if (decision === "replace") return "Başka yolla değiştir";
  if (decision === "observe-more") return "Ek gözlem gerekli";
  return "Aynen sürdür";
}

function addActivityValuesDesign(
  target: PremiumPlanExportParagraph[],
  activity: PremiumActivityTemplate,
): void {
  const design = activity.valuesDesign;
  if (!design) return;
  const mapping = design.mapping;
  target.push({ text: "Değerler pedagojisi", style: "heading2" });
  target.push({
    text: `Ana değer: ${valueLabel(mapping.primaryValueCode)} · Çatı ankrajı: ${valueLabel(mapping.roofValueCode)}`,
    style: "body",
  });
  if (mapping.supportingValueCodes.length > 0) {
    target.push({
      text: `Destekleyici değerler: ${mapping.supportingValueCodes.map(valueLabel).join(", ")}`,
      style: "body",
    });
  }
  target.push({
    text: `Tasarım yönü: ${mapping.designDirection === "value_led" ? "değer öncüllü" : "öğrenme çıktısı öncüllü"}`,
    style: "meta",
  });
  addList(
    target,
    "Resmî TYMM Okul Öncesi Ek-14 eylemleri",
    mapping.officialActionSnapshots.map(
      (snapshot) =>
        `${snapshot.indicatorCode} · ${snapshot.indicatorText} (s. ${snapshot.sourcePage})`,
    ),
  );
  target.push({ text: `Yaşantı/ikilem: ${mapping.livedContextOrDilemma}`, style: "body" });
  addList(target, "Yetişkin model eylemleri", mapping.adultModelActions);
  addList(target, "Çocuk seçim ve ifade yolları", mapping.childAgencyOptions);
  addList(target, "Onarma veya katkı yolları", mapping.repairOrContributionOptions);
  addList(target, "Değer gözlem soruları", mapping.observationPrompts);
  target.push({ text: `Karşı kanıt sorusu: ${mapping.counterEvidencePrompt}`, style: "body" });
  target.push({ text: `Değer yansıtması: ${mapping.reflectionPrompt}`, style: "body" });
  target.push({ text: `Sonraki plan karar kuralı: ${mapping.nextPlanDecisionRule}`, style: "body" });
  if (mapping.familyCommunityTransfer) {
    target.push({ text: `Aile/toplum aktarımı: ${mapping.familyCommunityTransfer}`, style: "body" });
  }
  if (mapping.natureStewardshipTransfer) {
    target.push({ text: `Doğa sorumluluğu aktarımı: ${mapping.natureStewardshipTransfer}`, style: "body" });
  }
  addList(
    target,
    "Kaynak adayı bulunan kültürel bağlamlar",
    design.culturalContexts.map(
      (context) =>
        `${context.variant}: ${context.adaptationNote} · Kaynak: ${context.provenance.sourceTitle} · Durum: ${
          context.provenance.status === "verified"
            ? "uzman tarafından doğrulanmış"
            : "taslak; uzman doğrulaması bekliyor"
        }`,
    ),
  );
  target.push({
    text: "Editoryal durum: Makine doğrulaması tamamlandı; altı rollü insan uzman incelemesi bekliyor. Bu durum öğretmen onayı veya çocuk hakkında değer hükmü değildir.",
    style: "meta",
  });
}

function addPersistedDailyPlans(
  target: PremiumPlanExportParagraph[],
  week: PremiumPlanExportWeek,
): void {
  if (week.dailyPlans.length === 0) return;
  target.push({
    text: "Öğretmenin kaydettiği günlük planlar",
    style: "heading2",
  });
  week.dailyPlans.forEach((dailyPlan) => {
    target.push({
      text: `${dailyPlan.civilDate} · ${dailyPlan.planTitle}`,
      style: "heading2",
    });
    target.push({
      text: `Plan kayıt kimliği: ${dailyPlan.recordId} · Etkinlik kayıt kimliği: ${dailyPlan.activityRecordId}`,
      style: "meta",
    });
    target.push({
      text: `Öğretmenin etkinlik başlığı: ${dailyPlan.activityTitle} · Saat: ${dailyPlan.startTime}${
        dailyPlan.endTime ? `–${dailyPlan.endTime}` : ""
      }`,
      style: "body",
    });
    target.push({
      text: `Kaynak şablon: ${dailyPlan.sourceActivityTemplateId} · Uygulanan şablon: ${dailyPlan.appliedActivityTemplateId} · ${dailyPlan.appliedActivityTemplateTitle}`,
      style: "meta",
    });
    if (dailyPlan.alternativeActivated) {
      target.push({
        text: "Öğretmen bu günlük planda haftanın alternatif etkinliğini uygulamak üzere seçti.",
        style: "body",
      });
    }
    addList(
      target,
      "Öğretmenin seçtiği program hedefleri",
      dailyPlan.curriculumTargetCodes,
    );
    target.push({ text: "Kaydedilmiş 10 bloklu günlük akış", style: "heading2" });
    dailyPlan.dailyFlow.blocks.forEach((block, index) => {
      target.push({
        text: `${index + 1}. ${block.title} · ${dailyBlockStatusLabel(block.status)} · ${block.durationMinutes} dakika`,
        style: "body",
      });
      if (block.transitionNote) {
        target.push({
          text: `Öğretmenin geçiş notu: ${block.transitionNote}`,
          style: "body",
        });
      }
      if (block.teacherNote) {
        target.push({
          text: `Öğretmenin blok notu: ${block.teacherNote}`,
          style: "body",
        });
      }
    });
    target.push({
      text: `Günlük planın tarihsel yaklaşım tercihi: ${lensLabel(
        dailyPlan.lensPreference.teacherPreferredLensId,
      )}${
        dailyPlan.lensPreference.teacherPreferredSupportingLensIds.length > 0
          ? ` · Destekleyici: ${dailyPlan.lensPreference.teacherPreferredSupportingLensIds.map(lensLabel).join(", ")}`
          : ""
      }`,
      style: "meta",
    });
  });
}

function addPersistedWeeklyEvaluations(
  target: PremiumPlanExportParagraph[],
  week: PremiumPlanExportWeek,
): void {
  if (week.evaluations.length === 0) return;
  target.push({
    text: "Kaydedilmiş haftalık öğretmen değerlendirmeleri",
    style: "heading2",
  });
  week.evaluations.forEach((evaluation, index) => {
    target.push({
      text: `${index + 1}. değerlendirme · ${evaluation.createdAt}`,
      style: "heading2",
    });
    target.push({
      text: `Değerlendirme kayıt kimliği: ${evaluation.id}`,
      style: "meta",
    });
    target.push({
      text: `Kanıt özeti: ${evaluation.evidenceSummary}`,
      style: "body",
    });
    target.push({
      text: `Öğretmen değerlendirmesi: ${evaluation.reflection}`,
      style: "body",
    });
    target.push({
      text: `Sonraki plan kararı: ${nextPlanDecisionLabel(evaluation.nextPlanDecision)}`,
      style: "body",
    });
    target.push({
      text: `Bağlı ham gözlem kimlikleri: ${evaluation.observationIds.join(", ")}`,
      style: "meta",
    });
    if (evaluation.nextPlanTargetPlanId) {
      target.push({
        text: `Kararın taşındığı sonraki plan kaydı: ${evaluation.nextPlanTargetPlanId}`,
        style: "meta",
      });
    }
  });
}

function monthlyCriterionStatusLabel(
  status: PremiumMonthlyCriterionStatus,
): string {
  if (status === "observed-working") return "İşleyen yön olarak gözlendi";
  if (status === "needs-adjustment") return "Uyarlama gerekiyor";
  return "Bu ay gözlenmedi / değerlendirilmedi";
}

function addPersistedMonthlyEvaluations(
  target: PremiumPlanExportParagraph[],
  evaluations: readonly PremiumMonthlyEvaluation[],
): void {
  evaluations.forEach((evaluation, index) => {
    target.push({
      text: `Kaydedilmiş aylık öğretmen değerlendirmesi ${index + 1}`,
      style: "heading1",
      pageBreakBefore: true,
    });
    target.push({
      text: `Değerlendirme kaydı: ${evaluation.id} · Aylık plan: ${evaluation.monthlyPlanId} · ${evaluation.createdAt}`,
      style: "meta",
    });
    target.push({
      text: `MEB kaynak izi: ${evaluation.mebProvenance.programTitle} (${evaluation.mebProvenance.sourceVersion}) · s. ${evaluation.mebProvenance.evaluationPages} · ${evaluation.mebProvenance.annex}, s. ${evaluation.mebProvenance.annexPage}`,
      style: "meta",
    });

    target.push({ text: "1. Çocuklar yönünden değerlendirme", style: "heading2" });
    target.push({
      text:
        evaluation.children.evidenceState === "insufficient-evidence"
          ? "Kanıt durumu: Yetersiz kanıt. Sistem kesin beceri hükmü üretmedi."
          : "Kanıt durumu: Öğretmen seçili kaynakları yeterli kanıt olarak işaretledi; otomatik beceri puanı veya hükmü üretilmedi.",
      style: "body",
    });
    const coverage = evaluation.children.coverage;
    target.push({
      text: `Kapsam: ${coverage.observationCount} gözlem · ${coverage.anecdotalObservationCount} anekdot · ${coverage.distinctCivilDateCount} farklı gün · ${coverage.distinctWeekCount} farklı hafta · ${coverage.distinctStudentCount} farklı çocuk · ${coverage.distinctEnvironmentCount} farklı ortam · ${coverage.programLinkedObservationCount} program bağlantılı gözlem · ${coverage.curriculumLinkCount} öğretmen onaylı program bağı · aktif sınıf temsili ${coverage.coveredActiveStudentCount}/${coverage.activeStudentCount}`,
      style: "meta",
    });
    if (coverage.uncoveredActiveStudentIds.length > 0) {
      target.push({
        text: `${coverage.uncoveredActiveStudentIds.length} aktif çocuk seçili kanıtta henüz temsil edilmiyor. Teknik kimlik izi kayıt verisinde korunur.`,
        style: "meta",
      });
    }
    if (evaluation.children.narrative) {
      target.push({
        text: `Öğretmenin çocuklar yönü notu: ${evaluation.children.narrative}`,
        style: "body",
      });
    }
    target.push({
      text: `Kaynak gözlem kimlikleri: ${evaluation.children.observationIds.length > 0 ? evaluation.children.observationIds.join(", ") : "Seçilmedi"}`,
      style: "meta",
    });
    target.push({
      text: `Kaynak program bağı kimlikleri: ${evaluation.children.curriculumLinkIds.length > 0 ? evaluation.children.curriculumLinkIds.join(", ") : "Seçilmedi"}`,
      style: "meta",
    });

    target.push({ text: "2. Program yönünden değerlendirme", style: "heading2" });
    target.push({ text: evaluation.program.narrative, style: "body" });
    const programLabels = new Map(
      PREMIUM_MONTHLY_PROGRAM_CRITERIA.map((criterion) => [
        criterion.id,
        criterion.label,
      ]),
    );
    evaluation.program.criteria.forEach((response) => {
      target.push({
        text: `${programLabels.get(response.criterionId) ?? response.criterionId} — ${monthlyCriterionStatusLabel(response.status)}`,
        style: "bullet",
      });
    });

    target.push({ text: "3. Öğretmen yönünden değerlendirme", style: "heading2" });
    target.push({ text: evaluation.teacher.narrative, style: "body" });
    const teacherLabels = new Map(
      PREMIUM_MONTHLY_TEACHER_CRITERIA.map((criterion) => [
        criterion.id,
        criterion.label,
      ]),
    );
    evaluation.teacher.criteria.forEach((response) => {
      target.push({
        text: `${teacherLabels.get(response.criterionId) ?? response.criterionId} — ${monthlyCriterionStatusLabel(response.status)}`,
        style: "bullet",
      });
    });
    target.push({
      text: `Sonraki ay için öğretmen önerisi: ${evaluation.nextMonthRecommendation}`,
      style: "body",
    });
    target.push({
      text: "Uygulama durumu: Henüz uygulanmadı. Ekim planı yayımlanmadığı için öneri otomatik olarak bir plana işlenmedi; gelecekte öğretmen incelemesiyle ele alınacak karar kuyruğunda korunuyor.",
      style: "meta",
    });
  });
}

export function buildPremiumPlanExportParagraphs(
  document: PremiumPlanExportDocument,
): PremiumPlanExportParagraph[] {
  const paragraphs: PremiumPlanExportParagraph[] = [
    { text: document.title, style: "title" },
    {
      text: `${document.programLabel} · ${document.ageLabel} · ${document.academicRelease} Eğitim Öğretim Yılı`,
      style: "meta",
    },
    {
      text: `İçerik paketi: ${document.contentPackId} · sürüm ${document.contentPackVersion}`,
      style: "meta",
    },
    {
      text: document.valuesMappingStatus === "legacy-unmapped"
        ? "Değer tasarımı: Eski içerik sürümünde değer snapshot'ı bulunmuyor; geriye dönük eşleme üretilmedi."
        : "Değer tasarımı: Makine doğrulamalı; altı rollü insan uzman incelemesi bekliyor.",
      style: "meta",
    },
    {
      text: `Yıllık plan: ${document.annualPlanTitle} · Kayıt zinciri: yıllık ${document.annualPlanRecordId} · aylık ${document.monthlyPlanRecordId}`,
      style: "meta",
    },
    {
      text: `Haftalık kayıtlar: ${document.weeks
        .map((week) => `${week.id}→${week.sourceRecordId}`)
        .join(" · ")}`,
      style: "meta",
    },
    {
      text: `Öğretmenin yaklaşım tercihi: ${lensLabel(
        document.lensPreference.teacherPreferredLensId,
      )}${
        document.lensPreference.teacherPreferredSupportingLensIds.length > 0
          ? ` · Destekleyici: ${document.lensPreference.teacherPreferredSupportingLensIds.map(lensLabel).join(", ")}`
          : ""
      }`,
      style: "meta",
    },
    { text: document.teacherReviewNotice, style: "body" },
    {
      text: "Yıllık plan omurgası",
      style: "heading1",
      pageBreakBefore: true,
      forcePageBreakBefore: true,
    },
  ];

  document.annualMonths.forEach((month) => {
    paragraphs.push({ text: `${month.monthKey} · ${month.title}`, style: "heading2" });
    paragraphs.push({ text: month.purpose, style: "body", keepWithNext: true });
    paragraphs.push({
      text: month.releaseStatus === "internal-review-ready"
        ? "İçerik durumu: Makine doğrulaması tamamlandı; altı rollü insan uzman incelemesi bekliyor"
        : month.releaseStatus === "ready"
          ? "İçerik durumu: Eski pilot içerik kullanılabilir; değer tasarımı bulunmuyor"
          : "İçerik durumu: Planlı yayın",
      style: "meta",
    });
  });

  const monthly = document.monthlyPlan;
  paragraphs.push({ text: monthly.title, style: "heading1", pageBreakBefore: true });
  paragraphs.push({ text: monthly.purpose, style: "body" });
  addList(paragraphs, "Çocuklarla araştırılacak sorular", monthly.childQuestions);
  addList(paragraphs, "Materyal özeti", monthly.materialSummary);
  addList(paragraphs, "Düşük maliyetli materyal seçenekleri", monthly.lowCostMaterialSummary);
  addList(paragraphs, "Rutinler", monthly.routines);
  addList(paragraphs, "Geçişler", monthly.transitions);
  paragraphs.push({ text: "Aile katılımı ilkesi", style: "heading2" });
  paragraphs.push({ text: monthly.familyParticipationPrinciple, style: "body" });
  addList(paragraphs, "Öğretmen yansıtma soruları", monthly.teacherReflectionPrompts);

  paragraphs.push({ text: "10 bloklu tam gün akışı", style: "heading1", pageBreakBefore: true });
  document.fullDayFlow.forEach((block, index) => {
    paragraphs.push({ text: `${index + 1}. ${block.title}`, style: "heading2" });
    paragraphs.push({ text: block.purpose, style: "body", keepWithNext: true });
    paragraphs.push({ text: `Esneklik: ${block.flexibilityNote}`, style: "meta" });
  });

  document.weeks.forEach((week) => {
    paragraphs.push({
      text: `${week.title} · ${week.dateRange}`,
      style: "heading1",
      pageBreakBefore: true,
    });
    paragraphs.push({ text: week.purpose, style: "body", keepWithNext: true });
    paragraphs.push({ text: `Araştırma sorusu: ${week.inquiryQuestion}`, style: "body" });
    addList(paragraphs, "Gözlem odağı", week.observationFocus);
    paragraphs.push({ text: `Aile katılımı: ${week.familyParticipation}`, style: "body" });

    document.activities
      .filter((activity) => activity.weekId === week.id)
      .forEach((activity) => {
        paragraphs.push({
          text: `${activity.activityRole === "main" ? "Ana etkinlik" : "Haftalık alternatif"}: ${activity.title}`,
          style: "heading2",
        });
        paragraphs.push({
          text: `${activity.recommendedCivilDate} · ${activity.durationMinutes} dakika · ${activity.environment}`,
          style: "meta",
          keepWithNext: true,
        });
        paragraphs.push({ text: activity.shortDescription, style: "body" });
        addActivityValuesDesign(paragraphs, activity);
        addList(paragraphs, "Program hedefleri", activity.curriculumTargetCodes);
        addList(paragraphs, "Materyaller", activity.materials);
        addList(paragraphs, "Düşük maliyetli seçenekler", activity.lowCostAlternatives);
        addList(paragraphs, "Hazırlık", activity.preparation);
        paragraphs.push({ text: "Açılış", style: "heading2" });
        paragraphs.push({ text: activity.opening, style: "body" });
        addList(paragraphs, "Uygulama adımları", activity.processSteps);
        addList(paragraphs, "Yetişkinin kullanabileceği sorular", activity.adultPrompts);
        addList(paragraphs, "Çocuk katılımı ve seçim noktaları", activity.childAgencyPoints);
        addList(paragraphs, "Gözlem soruları", activity.observationPrompts);
        addList(paragraphs, "Kanıt seçenekleri", activity.evidenceOptions);
        addList(paragraphs, "Farklılaştırma ve erişim", activity.differentiation);
        addList(paragraphs, "Sağlık ve güvenlik", activity.safetyNotes);
        paragraphs.push({ text: `Aile/toplum bağlantısı: ${activity.familyCommunityConnection}`, style: "body" });
        paragraphs.push({ text: `İç mekân karşılığı: ${activity.indoorEquivalent}`, style: "body" });
        paragraphs.push({ text: `Geçiş desteği: ${activity.transitionSupport}`, style: "body" });
        paragraphs.push({ text: `Öğretmen yansıtması: ${activity.reflectionPrompt}`, style: "body" });
      });
    addPersistedDailyPlans(paragraphs, week);
    addPersistedWeeklyEvaluations(paragraphs, week);
  });
  addPersistedMonthlyEvaluations(paragraphs, document.monthlyEvaluations ?? []);
  return paragraphs;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function littleEndian(value: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  if (length === 2) view.setUint16(0, value, true);
  else view.setUint32(0, value >>> 0, true);
  return bytes;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: readonly { name: string; contents: string }[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.contents);
    const checksum = crc32(data);
    const local = joinBytes([
      littleEndian(0x04034b50, 4), littleEndian(20, 2), littleEndian(0x0800, 2),
      littleEndian(0, 2), littleEndian(0, 2), littleEndian(33, 2),
      littleEndian(checksum, 4), littleEndian(data.length, 4), littleEndian(data.length, 4),
      littleEndian(name.length, 2), littleEndian(0, 2), name, data,
    ]);
    localParts.push(local);
    centralParts.push(joinBytes([
      littleEndian(0x02014b50, 4), littleEndian(20, 2), littleEndian(20, 2),
      littleEndian(0x0800, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(33, 2),
      littleEndian(checksum, 4), littleEndian(data.length, 4), littleEndian(data.length, 4),
      littleEndian(name.length, 2), littleEndian(0, 2), littleEndian(0, 2),
      littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 4), littleEndian(offset, 4), name,
    ]));
    offset += local.length;
  });
  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    littleEndian(0x06054b50, 4), littleEndian(0, 2), littleEndian(0, 2),
    littleEndian(files.length, 2), littleEndian(files.length, 2),
    littleEndian(central.length, 4), littleEndian(offset, 4), littleEndian(0, 2),
  ]);
}

export function createPremiumPlanDocx(
  paragraphs: readonly PremiumPlanExportParagraph[],
): Uint8Array {
  const body = paragraphs.map((paragraph) => {
    const style = paragraph.style === "title"
      ? "Title"
      : paragraph.style === "heading1"
        ? "Heading1"
        : paragraph.style === "heading2"
          ? "Heading2"
          : "Normal";
    const pageBreak = paragraph.pageBreakBefore ? '<w:pageBreakBefore/>' : "";
    const prefix = paragraph.style === "bullet" ? "• " : "";
    const color = paragraph.style === "meta" ? '<w:color w:val="666666"/>' : "";
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${pageBreak}</w:pPr><w:r><w:rPr>${color}</w:rPr><w:t xml:space="preserve">${xmlEscape(prefix + paragraph.text)}</w:t></w:r></w:p>`;
  }).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="392458"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="4F3475"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="5C4085"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
  return createZip([
    { name: "[Content_Types].xml", contents: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
    { name: "_rels/.rels", contents: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: "word/document.xml", contents: documentXml },
    { name: "word/styles.xml", contents: stylesXml },
    { name: "word/_rels/document.xml.rels", contents: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
  ]);
}

function base64Bytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createImagePdf(images: readonly Uint8Array[]): Uint8Array {
  const objects: { id: number; bytes: Uint8Array }[] = [];
  const pageIds = images.map((_, index) => 3 + index * 3);
  objects.push({ id: 1, bytes: encoder.encode("<< /Type /Catalog /Pages 2 0 R >>") });
  objects.push({
    id: 2,
    bytes: encoder.encode(`<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`),
  });
  images.forEach((image, index) => {
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const content = encoder.encode("q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ");
    objects.push({ id: pageId, bytes: encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`) });
    objects.push({ id: imageId, bytes: joinBytes([encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, encoder.encode("\nendstream")]) });
    objects.push({ id: contentId, bytes: joinBytes([encoder.encode(`<< /Length ${content.length} >>\nstream\n`), content, encoder.encode("\nendstream")]) });
  });
  objects.sort((left, right) => left.id - right.id);
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Map<number, number>();
  let offset = parts[0].length;
  objects.forEach((object) => {
    const prefix = encoder.encode(`${object.id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets.set(object.id, offset);
    parts.push(prefix, object.bytes, suffix);
    offset += prefix.length + object.bytes.length + suffix.length;
  });
  const xrefOffset = offset;
  const maxId = objects.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, "0000000000 65535 f \n"];
  for (let id = 1; id <= maxId; id += 1) {
    xref.push(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(encoder.encode(`${xref.join("")}trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return joinBytes(parts);
}

const PREMIUM_PLAN_PDF_TEXT_STYLES: Readonly<
  Record<PremiumPlanExportParagraph["style"], PremiumPlanPdfTextStyle>
> = {
  title: {
    font: '700 52px "Premium Export Roboto", Arial, sans-serif',
    color: "#392458",
    lineHeight: 66,
    gap: 28,
  },
  heading1: {
    font: '700 38px "Premium Export Roboto", Arial, sans-serif',
    color: "#4f3475",
    lineHeight: 50,
    gap: 22,
  },
  heading2: {
    font: '700 28px "Premium Export Roboto", Arial, sans-serif',
    color: "#5c4085",
    lineHeight: 38,
    gap: 14,
  },
  body: {
    font: '400 25px "Premium Export Roboto", Arial, sans-serif',
    color: "#242027",
    lineHeight: 36,
    gap: 12,
  },
  bullet: {
    font: '400 24px "Premium Export Roboto", Arial, sans-serif',
    color: "#242027",
    lineHeight: 35,
    gap: 8,
  },
  meta: {
    font: '400 22px "Premium Export Roboto", Arial, sans-serif',
    color: "#6b6470",
    lineHeight: 32,
    gap: 10,
  },
};

const PDF_SECTION_BREAK_MINIMUM_FILL_RATIO = 0.42;

function splitLongPdfWord(
  word: string,
  font: string,
  maxWidth: number,
  measureTextWidth: (text: string, font: string) => number,
): string[] {
  if (measureTextWidth(word, font) <= maxWidth) return [word];
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    const candidate = piece + character;
    if (piece && measureTextWidth(candidate, font) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = candidate;
    }
  }
  if (piece) pieces.push(piece);
  return pieces.length > 0 ? pieces : [word];
}

function wrapPremiumPlanPdfText(
  text: string,
  font: string,
  maxWidth: number,
  measureTextWidth: (text: string, font: string) => number,
): string[] {
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => splitLongPdfWord(word, font, maxWidth, measureTextWidth));
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureTextWidth(candidate, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function shouldKeepPdfParagraphWithNext(
  paragraph: PremiumPlanExportParagraph,
): boolean {
  return paragraph.keepWithNext === true
    || paragraph.style === "heading1"
    || paragraph.style === "heading2";
}

function splitOversizedPdfItem(
  item: PremiumPlanPdfPageItem,
  contentHeight: number,
): PremiumPlanPdfPageItem[] {
  if (item.height <= contentHeight) return [item];
  const maxLinesPerPage = Math.max(
    1,
    Math.floor((contentHeight - item.gap) / item.lineHeight),
  );
  const chunks: string[][] = [];
  for (let index = 0; index < item.lines.length; index += maxLinesPerPage) {
    chunks.push(item.lines.slice(index, index + maxLinesPerPage));
  }
  const lastChunk = chunks.at(-1);
  const previousChunk = chunks.at(-2);
  if (lastChunk?.length === 1 && previousChunk && previousChunk.length > 2) {
    lastChunk.unshift(previousChunk.pop()!);
  }
  return chunks.map((lines) => ({
    ...item,
    lines,
    height: lines.length * item.lineHeight + item.gap,
  }));
}

export function paginatePremiumPlanExportParagraphs(
  paragraphs: readonly PremiumPlanExportParagraph[],
  measureTextWidth: (text: string, font: string) => number,
  contentWidth: number,
  contentHeight: number,
): PremiumPlanPdfPageLayout[] {
  if (contentWidth <= 0 || contentHeight <= 0) {
    throw new Error("PDF içerik alanı pozitif ölçülere sahip olmalıdır.");
  }
  const items = paragraphs.map((paragraph, paragraphIndex) => {
    const style = PREMIUM_PLAN_PDF_TEXT_STYLES[paragraph.style];
    const text = paragraph.style === "bullet" ? `• ${paragraph.text}` : paragraph.text;
    const lines = wrapPremiumPlanPdfText(
      text,
      style.font,
      contentWidth,
      measureTextWidth,
    );
    return {
      paragraphIndex,
      text,
      style: paragraph.style,
      lines,
      font: style.font,
      color: style.color,
      lineHeight: style.lineHeight,
      gap: style.gap,
      height: lines.length * style.lineHeight + style.gap,
    } satisfies PremiumPlanPdfPageItem;
  });

  const groups: PremiumPlanPdfPageItem[][] = [];
  for (let index = 0; index < items.length;) {
    const group = [items[index]!];
    let tailIndex = index;
    while (
      tailIndex + 1 < items.length
      && shouldKeepPdfParagraphWithNext(paragraphs[tailIndex]!)
      && paragraphs[tailIndex + 1]?.pageBreakBefore !== true
    ) {
      tailIndex += 1;
      group.push(items[tailIndex]!);
    }
    groups.push(group);
    index = tailIndex + 1;
  }

  const pages: { items: PremiumPlanPdfPageItem[]; usedHeight: number }[] = [];
  let page = { items: [] as PremiumPlanPdfPageItem[], usedHeight: 0 };
  const finishPage = () => {
    if (page.items.length > 0) pages.push(page);
    page = { items: [], usedHeight: 0 };
  };
  const placeItem = (item: PremiumPlanPdfPageItem) => {
    splitOversizedPdfItem(item, contentHeight).forEach((chunk) => {
      if (page.items.length > 0 && page.usedHeight + chunk.height > contentHeight) {
        finishPage();
      }
      page.items.push(chunk);
      page.usedHeight += chunk.height;
    });
  };

  groups.forEach((group) => {
    const firstParagraph = paragraphs[group[0]!.paragraphIndex]!;
    if (firstParagraph.pageBreakBefore && page.items.length > 0) {
      const pageIsSubstantiallyFilled = page.usedHeight
        >= contentHeight * PDF_SECTION_BREAK_MINIMUM_FILL_RATIO;
      if (firstParagraph.forcePageBreakBefore || pageIsSubstantiallyFilled) {
        finishPage();
      }
    }
    const groupHeight = group.reduce((sum, item) => sum + item.height, 0);
    if (
      groupHeight <= contentHeight
      && page.items.length > 0
      && page.usedHeight + groupHeight > contentHeight
    ) {
      finishPage();
    }
    if (groupHeight <= contentHeight) {
      group.forEach((item) => {
        page.items.push(item);
        page.usedHeight += item.height;
      });
    } else {
      group.forEach(placeItem);
    }
  });
  finishPage();
  return pages.length > 0 ? pages : [{ items: [], usedHeight: 0 }];
}

export async function createPremiumPlanPdf(
  paragraphs: readonly PremiumPlanExportParagraph[],
): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("PDF dosyası yalnız uygulamanın belge üretim ortamında hazırlanabilir.");
  }
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF sayfa yüzeyi hazırlanamadı.");
  const images: Uint8Array[] = [];
  const margin = 100;
  const bottomContentLimit = canvas.height - 170;
  const contentWidth = canvas.width - margin * 2;
  let pageNumber = 1;

  const beginPage = () => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#5c4085";
    context.fillRect(0, 0, canvas.width, 24);
  };
  const finishPage = () => {
    context.fillStyle = "#6b6470";
    context.font = '22px "Premium Export Roboto", Arial, sans-serif';
    context.textAlign = "center";
    context.fillText(`MaarifOS · ${pageNumber}`, canvas.width / 2, canvas.height - 48);
    context.textAlign = "left";
    images.push(base64Bytes(canvas.toDataURL("image/jpeg", 0.9)));
    pageNumber += 1;
  };

  const pages = paginatePremiumPlanExportParagraphs(
    paragraphs,
    (text, font) => {
      context.font = font;
      return context.measureText(text).width;
    },
    contentWidth,
    bottomContentLimit - margin,
  );
  pages.forEach((page) => {
    beginPage();
    let y = margin;
    page.items.forEach((item) => {
      context.font = item.font;
      context.fillStyle = item.color;
      item.lines.forEach((line) => {
        context.fillText(line, margin, y);
        y += item.lineHeight;
      });
      y += item.gap;
    });
    finishPage();
  });
  return createImagePdf(images);
}

export async function generatePremiumPlanExportFile(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
  access: PremiumPlanExportAccess,
  format: PremiumPlanExportFormat,
): Promise<PremiumPlanExportFile> {
  const exportDocument = preparePremiumPlanExportDocument(
    pack,
    source,
    access,
    format,
  );
  const paragraphs = buildPremiumPlanExportParagraphs(exportDocument);
  const bytes = format === "word"
    ? createPremiumPlanDocx(paragraphs)
    : await createPremiumPlanPdf(paragraphs);
  return {
    format,
    fileName: exportDocument.fileName,
    mimeType: format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    document: exportDocument,
  };
}
