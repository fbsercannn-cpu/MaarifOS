import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { createTeacherOwnedDailyFlow } from "../../src/core/domain/teacher-owned-daily-flow.ts";
import {
  createLocalDailyPlanReview,
  generateDailyPlanReviewWithDeepSeek,
  mergeDailyPlanReviewIntoBlocks,
  prepareDailyPlanReviewAIRequest,
} from "../../src/features/ai-work-center/deepseek-plan-review.ts";

const planId = "00000000-0000-4000-8000-000000007301";
const teacherId = "00000000-0000-4000-8000-000000007302";

function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.students.push({
    id: "00000000-0000-4000-8000-000000007303",
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-09-25T06:00:00.000Z",
    civilDate: "2026-09-25",
    schemaVersion: 1,
    displayName: "Ada Yılmaz",
    firstName: "Ada",
    lastName: "Yılmaz",
    contacts: [{ name: "Ayşe Yılmaz", phone: "0555 111 22 33" }],
  });
  const kinds = [
    "welcome", "center-play", "community-circle", "teacher-activity-one", "food-selfcare",
    "outdoor-movement", "teacher-activity-two", "rest-regulation", "small-group", "closing",
  ];
  const flow = createTeacherOwnedDailyFlow({
    blocks: kinds.map((kind, index) => ({
      kind,
      title: index === 3 ? "Ada ile gölge araştırması" : `Akış ${index + 1}`,
      status: "planned",
      durationMinutes: 30,
      transitionNote: index === 2 ? "Ayşe Yılmaz aranacak" : "",
      teacherNote: index === 3 ? "İletişim: 0555 111 22 33" : "",
    })),
    schedule: { kind: "full_day", startTime: "08:00", endTime: "13:00", timeZone: "Europe/Istanbul" },
    confirmedByUserId: teacherId,
    now: new Date("2026-09-25T06:00:00.000Z"),
  });
  snapshot.plans.push({
    id: planId,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-09-25T06:00:00.000Z",
    civilDate: "2026-09-25",
    schemaVersion: 1,
    planType: "daily",
    title: "Gölge araştırması",
    teacherOwnedDailyFlow: flow,
  });
  return snapshot;
}

const validAI = {
  inclusiveAdaptation: "Yönergeyi resim, nesne ve kısa sözlü anlatımla sunup katılım biçimini çocukların seçmesine alan açın.",
  openEndedQuestions: [
    "Işığın yerini değiştirdiğinde gölgenin biçiminde nasıl bir değişiklik fark ettin?",
    "Aynı nesneyle farklı bir gölge oluşturmak için hangi yolu denemek istersin?",
    "Arkadaşının çözümünden kendi denemene eklemek istediğin fikir hangisi oldu?",
  ],
  endOfDayEvaluation: "Çocukların tahmin kurma, deneme sonucunu açıklama ve çözümünü değiştirme anlarını somut örneklerle kaydedin.",
  nextDaySuggestion: "Ertesi gün farklı ışık kaynaklarını küçük gruplara sunup önceki tahminlerle yeni sonuçların karşılaştırılmasını sağlayın.",
};

test("plan inceleme istemi çocuk ve yakını kimliklerini ve iletişim bilgisini çıkarır", () => {
  const request = prepareDailyPlanReviewAIRequest(fixture(), planId);
  assert.doesNotMatch(request.prompt, /Ada ile|Yılmaz|Ayşe|0555 111 22 33/u);
  assert.match(request.prompt, /\[ÇOCUK ADI ÇIKARILDI\]/u);
  assert.match(request.prompt, /\[TELEFON ÇIKARILDI\]/u);
  assert.match(request.prompt, /Akış revizyonu: 1/u);
});

test("doğrulanmış DeepSeek JSON'u kaynak plan sürümüne bağlı düzenlenebilir taslağa dönüşür", async () => {
  const candidate = await generateDailyPlanReviewWithDeepSeek(fixture(), planId, {
    async requestCompletion(prompt) {
      assert.doesNotMatch(prompt, /Ada ile|Yılmaz/u);
      return { text: JSON.stringify(validAI), model: "deepseek-chat" };
    },
  });
  assert.equal(candidate.planId, planId);
  assert.equal(candidate.sourceFlowRevisionNumber, 1);
  assert.equal(candidate.generationMode, "deepseek");
  assert.equal(candidate.openEndedQuestions.length, 3);
});

test("beklenmeyen alan ve pedagojik hüküm taşıyan DeepSeek yanıtları fail-closed reddedilir", async () => {
  await assert.rejects(
    generateDailyPlanReviewWithDeepSeek(fixture(), planId, {
      async requestCompletion() {
        return { text: JSON.stringify({ ...validAI, score: 95 }), model: "deepseek-chat" };
      },
    }),
    /beklenmeyen alan/u,
  );
  await assert.rejects(
    generateDailyPlanReviewWithDeepSeek(fixture(), planId, {
      async requestCompletion() {
        return { text: JSON.stringify({ ...validAI, endOfDayEvaluation: "Çocukların %80 başarılı olduğu kesin biçimde görüldü ve gelişim tamamlandı." }), model: "deepseek-chat" };
      },
    }),
    /gizlilik veya pedagojik güven/u,
  );
});

test("öğretmen seçimi dört ayrı gerçek akış bloğuna izlenebilir not olarak yazılır", () => {
  const snapshot = fixture();
  const plan = snapshot.plans[0];
  const merged = mergeDailyPlanReviewIntoBlocks(
    plan.teacherOwnedDailyFlow.blocks,
    validAI,
    "deepseek-chat",
  );
  assert.equal(merged.length, 10);
  assert.match(merged.find((block) => block.kind === "teacher-activity-one").teacherNote, /DeepSeek kapsayıcı uyarlama/u);
  assert.match(merged.find((block) => block.kind === "teacher-activity-two").teacherNote, /3\. Arkadaşının çözümünden/u);
  assert.match(merged.find((block) => block.kind === "closing").teacherNote, /gün sonu değerlendirmesi/u);
  assert.match(merged.find((block) => block.kind === "small-group").teacherNote, /ertesi gün önerisi/u);
  assert.equal(plan.teacherOwnedDailyFlow.blocks[6].teacherNote, "");
});

test("çevrim dışı taslak kaynak revizyona bağlıdır ve resmî planı kendiliğinden değiştirmez", () => {
  const snapshot = fixture();
  const before = structuredClone(snapshot.plans[0]);
  const candidate = createLocalDailyPlanReview(snapshot, planId);
  assert.equal(candidate.generationMode, "local");
  assert.equal(candidate.expectedUpdatedAt, before.updatedAt);
  assert.deepEqual(snapshot.plans[0], before);
});
