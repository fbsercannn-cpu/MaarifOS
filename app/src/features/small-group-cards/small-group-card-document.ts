import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { TEACHER_DOCUMENT_THEME, teacherDocumentRunningHeader } from "../documents/document-theme.ts";
import {
  validatePdfSelection,
  type PdfChoice,
  type PdfPreviewRecipe,
  type PdfPreviewSelection,
} from "../documents/pdf-preview-model.ts";
import {
  createSemanticTaggedPdf,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";
import {
  resolveSmallGroupCardModel,
  type SmallGroupCardModel,
  type SmallGroupPlanCard,
} from "./small-group-card-model.ts";

export interface CreateSmallGroupCardsRecipeInput {
  readonly planIds: readonly string[];
  readonly now?: Date;
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!, 12)));
}

function cardText(card: SmallGroupPlanCard, index: number): string {
  const time = card.startTime
    ? card.endTime ? `${card.startTime}–${card.endTime}` : card.startTime
    : "Saat kaynakta belirtilmedi";
  return [
    `KART ${index + 1}`,
    `${dateLabel(card.civilDate)} · ${time}`,
    `Etkinlik: ${card.activityTitle}`,
    `Küçük grup: ${card.studentNames.join(", ")}`,
    `Materyaller: ${card.materials.length ? card.materials.join(", ") : "____________________________"}`,
    `Materyal kaynağı: ${card.materialSourceLabels.length ? card.materialSourceLabels.join(" · ") : "Kayıtlı planda belirtilmedi"}`,
    "Durum: Planlandı",
    "Gözlem notu:",
    "________________________________",
    "________________________________",
    "________________________________",
  ].join("\n");
}

function rows(cards: readonly SmallGroupPlanCard[]): string[][] {
  const result: string[][] = [];
  for (let index = 0; index < cards.length; index += 2) {
    result.push([
      cardText(cards[index]!, index),
      cards[index + 1] ? cardText(cards[index + 1]!, index + 1) : "",
    ]);
  }
  return result;
}

function cardsFromModel(model: SmallGroupCardModel, planIds: readonly string[]): SmallGroupPlanCard[] {
  const cards = planIds.map((planId) => model.printableCards.find((card) => card.planId === planId));
  if (cards.some((card) => !card)) {
    throw new Error("Seçilen küçük grup kartlarından biri değişti veya artık yazdırılamıyor.");
  }
  return cards as SmallGroupPlanCard[];
}

function cardStudents(cards: readonly SmallGroupPlanCard[]): PdfChoice[] {
  const labels = new Map<string, string>();
  for (const card of cards) {
    card.studentIds.forEach((id, index) => {
      const label = card.studentNames[index];
      if (!label) throw new Error("Küçük grup kartındaki çocuk kapsamı doğrulanamadı.");
      const existing = labels.get(id);
      if (existing && existing !== label) throw new Error("Küçük grup kartındaki çocuk adı kaynaklar arasında değişiyor.");
      labels.set(id, label);
    });
  }
  return [...labels].map(([id, label]) => ({ id, label }));
}

function assertExactStudentSet(selection: PdfPreviewSelection, requiredIds: readonly string[]): void {
  const selected = selection.studentIds ?? [];
  const required = new Set(requiredIds);
  if (selected.length !== requiredIds.length || selected.some((id) => !required.has(id))) {
    throw new Error("Küçük grup kartları, kayıtlı gruptaki çocukların tamamını birlikte içerir. Çocuk kapsamını değiştirmeden hazırlayın.");
  }
}

export async function createSmallGroupCardsRecipe(
  store: LocalDataStore,
  input: CreateSmallGroupCardsRecipeInput,
  runtime: SemanticTaggedPdfRuntime = {},
): Promise<PdfPreviewRecipe> {
  if (
    input.planIds.length < 1 ||
    input.planIds.length > 6 ||
    new Set(input.planIds).size !== input.planIds.length
  ) throw new Error("Bir A4 için 1 ile 6 arasında farklı kayıtlı küçük grup kartı seçin.");
  const snapshot = await store.readSnapshot();
  const selectedPlan = snapshot.plans.find((record) => record.id === input.planIds[0]);
  if (!selectedPlan || typeof selectedPlan.civilDate !== "string") {
    throw new Error("Yazdırılacak küçük grup planı bulunamadı.");
  }
  const now = input.now ? new Date(input.now) : new Date();
  const model = resolveSmallGroupCardModel(snapshot, { civilDate: selectedPlan.civilDate, now });
  const cards = cardsFromModel(model, input.planIds);
  const students = cardStudents(cards);
  const requiredStudentIds = students.map((student) => student.id);
  const expected = canonicalJson({
    scope: model.scope,
    schoolName: model.schoolName,
    classroomName: model.classroomName,
    academicYearLabel: model.academicYearLabel,
    cards,
  });
  const assertSourceCurrent = async () => {
    const fresh = await store.readSnapshot();
    const first = fresh.plans.find((record) => record.id === input.planIds[0]);
    if (!first || typeof first.civilDate !== "string") throw new Error("Kart kaynağı kaldırıldı; belgeyi yeniden açın.");
    const freshModel = resolveSmallGroupCardModel(fresh, { civilDate: first.civilDate, now });
    const freshCards = cardsFromModel(freshModel, input.planIds);
    if (canonicalJson({
      scope: freshModel.scope,
      schoolName: freshModel.schoolName,
      classroomName: freshModel.classroomName,
      academicYearLabel: freshModel.academicYearLabel,
      cards: freshCards,
    }) !== expected) throw new Error("Kartların plan, çocuk veya materyal kaynağı değişti. Önizlemeyi yenileyin.");
  };
  const assertExportAllowed = async (selection: PdfPreviewSelection) => {
    validatePdfSelection(recipe, selection);
    assertExactStudentSet(selection, requiredStudentIds);
    await assertSourceCurrent();
  };
  const recipe: PdfPreviewRecipe = {
    title: "Küçük grup plan kartları",
    description: "Kayıtlı günlük planlardan seçilen en çok 6 küçük grup kartı A4 üzerinde kesilebilir düzende hazırlanır. Çocuk, etkinlik ve materyal bilgileri gerçek plan kaynaklarından gelir; kart uygulama veya gözlem kaydı oluşturmaz.",
    fields: [{ id: "cards", label: "Çocuk, etkinlik ve materyal kaynaklı kartlar" }],
    students,
    initial: { fields: ["cards"], studentIds: requiredStudentIds },
    printEnabled: true,
    assertExportAllowed,
    refresh: () => createSmallGroupCardsRecipe(store, input, runtime),
    async build(selection) {
      await assertExportAllowed(selection);
      if (!selection.fields.includes("cards")) throw new Error("Küçük grup kartları bölümü seçilmelidir.");
      const bytes = await createSemanticTaggedPdf({
        title: "Küçük grup plan kartları",
        language: "tr-TR",
        orientation: "portrait",
        pageFormat: "A4",
        pageMargin: 28,
        theme: TEACHER_DOCUMENT_THEME,
        artifactHeaderText: teacherDocumentRunningHeader("Küçük grup plan kartları", {
          schoolName: model.schoolName,
          classroomName: model.classroomName,
          periodLabel: `${model.weekStart}–${model.weekEnd}`,
        }),
        artifactHeaderOnFirstPage: false,
        artifactFooterText: "MaarifOS · Kart sınırlarından kesin · Planlandı",
        includeTotalPages: true,
        technicalMetadata: [
          { key: "document-kind", value: "small-group-plan-cards" },
          { key: "card-count", value: String(cards.length) },
        ],
        nodes: [
          { kind: "heading", level: 1, text: "KÜÇÜK GRUP PLAN KARTLARI" },
          { kind: "paragraph", tone: "meta", text: `${model.schoolName} · ${model.classroomName} · ${model.academicYearLabel}` },
          { kind: "paragraph", tone: "meta", text: `${model.weekStart}–${model.weekEnd} · ${cards.length} kayıtlı kart · Dış çizgiler kesim sınırıdır.` },
          {
            kind: "table",
            headers: ["Kesilebilir kart", "Kesilebilir kart"],
            rows: rows(cards),
            summary: "Kayıtlı günlük planlardan hazırlanan iki sütun ve en çok üç satırlık küçük grup kartları",
            columnWeights: [1, 1],
            cellPadding: 9,
            fontSize: 10.5,
            rowHeaderColumn: 0,
            balancePages: false,
          },
        ],
      }, runtime);
      await assertExportAllowed(selection);
      return {
        bytes,
        mimeType: "application/pdf",
        fileName: `MaarifOS_Kucuk_Grup_Kartlari_${model.weekStart}_${cards.length}.pdf`,
      };
    },
  };
  return recipe;
}
