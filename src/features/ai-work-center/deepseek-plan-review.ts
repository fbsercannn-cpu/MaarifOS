import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type {
  TeacherOwnedDailyFlow,
  TeacherOwnedDailyFlowBlockEdit,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import { isTeacherOwnedDailyFlow } from "../../core/domain/teacher-owned-daily-flow.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { updateTeacherOwnedDailyFlow } from "../planning/teacher-owned-plan-service.ts";

const TCKN_PATTERN = /\b\d{11}\b/gu;
const PHONE_PATTERN = /\b(?:\+?90\s*)?0?5\d{2}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/gu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const IBAN_PATTERN = /\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/giu;
const SENSITIVE_DETAIL_PATTERN = /(?:tan[ıi]|teşhis|otizm|dehb|ilaç|reçete|sağlık|hastalık|terapi|psikolog|psikiyatri|açık adres|mahalle|cadde|sokak|apartman|daire|boşan|velayet|vefat|şiddet|istismar)/iu;
const UNSAFE_JUDGMENT_PATTERN = /(?:tanısı|teşhisi|normal değil|geri(?:dir| kalmış)|başarısız|üstün zekalı|problemli çocuk|yetersiz çocuk)|%\s*\d/iu;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PLAN_REVIEW_TIMEOUT_MS = 8_000;

export interface DailyPlanReviewContent {
  readonly inclusiveAdaptation: string;
  readonly openEndedQuestions: readonly string[];
  readonly endOfDayEvaluation: string;
  readonly nextDaySuggestion: string;
}

export interface DailyPlanReviewCandidate extends DailyPlanReviewContent {
  readonly planId: string;
  readonly expectedUpdatedAt: string;
  readonly sourceFlowRevisionNumber: number;
  readonly generationMode: "local" | "deepseek";
  readonly aiModel: string;
  readonly privacyDisclosure: string;
}

export interface DailyPlanReviewAIRequest {
  readonly prompt: string;
  readonly systemPrompt: string;
  readonly privacyDisclosure: string;
}

export interface DailyPlanReviewAIRequester {
  requestCompletion(
    prompt: string,
    options: { systemPrompt: string },
  ): Promise<{ text: string; model: string }>;
}

function live(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

function normalized(value: unknown): string {
  return String(value ?? "").normalize("NFC").replace(/\s+/gu, " ").trim();
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function identityPattern(value: string, flags: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapePattern(value)}(?![\\p{L}\\p{N}])`, flags);
}

function knownNames(snapshot: DataSnapshot): readonly string[] {
  const names = new Set<string>();
  for (const student of snapshot.students.filter(live)) {
    for (const value of [student.displayName, student.firstName, student.lastName]) {
      const name = normalized(value);
      if (name.length >= 3) names.add(name);
    }
    if (Array.isArray(student.contacts)) {
      for (const contact of student.contacts) {
        if (!contact || typeof contact !== "object" || Array.isArray(contact)) continue;
        const name = normalized((contact as Record<string, unknown>).name);
        if (name.length >= 3) names.add(name);
      }
    }
  }
  return [...names].sort((left, right) => right.length - left.length);
}

function replacePattern(text: string, pattern: RegExp, replacement: string): string {
  return text.replace(pattern, replacement);
}

function safePlanText(value: unknown, names: readonly string[]): string {
  let text = normalized(value);
  for (const name of names) {
    text = text.replace(identityPattern(name, "giu"), "[ÇOCUK ADI ÇIKARILDI]");
  }
  text = replacePattern(text, TCKN_PATTERN, "[TCKN ÇIKARILDI]");
  text = replacePattern(text, PHONE_PATTERN, "[TELEFON ÇIKARILDI]");
  text = replacePattern(text, EMAIL_PATTERN, "[E-POSTA ÇIKARILDI]");
  text = replacePattern(text, IBAN_PATTERN, "[IBAN ÇIKARILDI]");
  if (SENSITIVE_DETAIL_PATTERN.test(text)) return "[HASSAS AYRINTI GÖNDERİLMEDİ]";
  return text;
}

function selectedPlan(snapshot: DataSnapshot, planId: string): StoredRecord & {
  teacherOwnedDailyFlow: TeacherOwnedDailyFlow;
} {
  if (!UUID_PATTERN.test(planId)) throw new Error("Günlük plan kimliği doğrulanamadı.");
  const plan = snapshot.plans.find(
    (candidate) => candidate.id === planId && candidate.planType === "daily" && live(candidate),
  );
  if (!plan || !isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)) {
    throw new Error("İncelenecek doğrulanmış öğretmen günlük planı bulunamadı.");
  }
  if (typeof plan.updatedAt !== "string") throw new Error("Günlük plan sürümü doğrulanamadı.");
  return plan as StoredRecord & {
    teacherOwnedDailyFlow: TeacherOwnedDailyFlow;
  };
}

function assertText(
  value: unknown,
  label: string,
  names: readonly string[],
  maximum: number,
): string {
  const text = normalized(value);
  if (text.length < 20 || text.length > maximum) {
    throw new Error(`${label} 20-${maximum} karakter arasında olmalıdır.`);
  }
  const patterns = [TCKN_PATTERN, PHONE_PATTERN, EMAIL_PATTERN, IBAN_PATTERN];
  if (
    patterns.some((pattern) => new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text)) ||
    SENSITIVE_DETAIL_PATTERN.test(text) ||
    UNSAFE_JUDGMENT_PATTERN.test(text) ||
    names.some((name) => identityPattern(name, "iu").test(text))
  ) {
    throw new Error(`${label} gizlilik veya pedagojik güven kontrolünden geçmedi.`);
  }
  return text;
}

export function validateDailyPlanReviewContent(
  value: DailyPlanReviewContent,
  names: readonly string[] = [],
): DailyPlanReviewContent {
  if (!Array.isArray(value.openEndedQuestions) || value.openEndedQuestions.length < 3 || value.openEndedQuestions.length > 5) {
    throw new Error("Açık uçlu soru sayısı 3-5 arasında olmalıdır.");
  }
  const questions = value.openEndedQuestions.map((question, index) =>
    assertText(question, `${index + 1}. açık uçlu soru`, names, 180));
  if (new Set(questions.map((question) => question.toLocaleLowerCase("tr-TR"))).size !== questions.length) {
    throw new Error("Açık uçlu sorular birbirinden farklı olmalıdır.");
  }
  return {
    inclusiveAdaptation: assertText(value.inclusiveAdaptation, "Kapsayıcı uyarlama", names, 500),
    openEndedQuestions: questions,
    endOfDayEvaluation: assertText(value.endOfDayEvaluation, "Gün sonu değerlendirmesi", names, 500),
    nextDaySuggestion: assertText(value.nextDaySuggestion, "Ertesi gün önerisi", names, 500),
  };
}

export function prepareDailyPlanReviewAIRequest(
  snapshot: DataSnapshot,
  planId: string,
): DailyPlanReviewAIRequest {
  const plan = selectedPlan(snapshot, planId);
  const names = knownNames(snapshot);
  const flow = plan.teacherOwnedDailyFlow;
  const safeBlocks = flow.blocks.map((block) => {
    const title = safePlanText(block.title, names);
    const transition = safePlanText(block.transitionNote, names);
    const note = safePlanText(block.teacherNote, names);
    return [
      `${block.order}. ${title} (${block.durationMinutes} dk, ${block.status})`,
      transition ? `Geçiş: ${transition}` : "",
      note ? `Öğretmen notu: ${note}` : "",
    ].filter(Boolean).join(" | ");
  });
  return {
    prompt: [
      "Aşağıdaki kimliksizleştirilmiş okul öncesi tam gün akışını pedagojik olarak incele.",
      `Tarih: ${normalized(plan.civilDate)}. Akış revizyonu: ${flow.revisionNumber}.`,
      ...safeBlocks,
      "Yalnız şu JSON nesnesini döndür:",
      '{"inclusiveAdaptation":"...","openEndedQuestions":["...","...","..."],"endOfDayEvaluation":"...","nextDaySuggestion":"..."}',
      "3-5 açık uçlu soru üret. İçeriği gözlenebilir, uygulanabilir ve kısa tut.",
      "Çocuk adı, aile bilgisi, tanı, puan, yüzde, karşılaştırma veya kesin gelişim hükmü üretme.",
    ].join("\n"),
    systemPrompt:
      "Sen TYMM okul öncesi öğretmeninin plan inceleme yardımcısısın. Yalnız geçerli JSON üret. Çıktı öğretmen incelemesi olmadan resmî plan revizyonu değildir.",
    privacyDisclosure:
      "DeepSeek istemine çocuk adı, iletişim bilgisi, adres, aile özel notu veya sağlık ayrıntısı eklenmedi; riskli plan parçaları çıkarıldı.",
  };
}

function parseJSONPayload(text: string): Record<string, unknown> {
  const compact = text.trim();
  const unfenced = compact.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu)?.[1] ?? compact;
  let value: unknown;
  try {
    value = JSON.parse(unfenced);
  } catch {
    throw new Error("DeepSeek geçerli plan inceleme JSON'u döndürmedi; cihaz içi taslak korunuyor.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("DeepSeek plan inceleme yanıtı doğrulanamadı; cihaz içi taslak korunuyor.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ["endOfDayEvaluation", "inclusiveAdaptation", "nextDaySuggestion", "openEndedQuestions"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("DeepSeek plan inceleme yanıtı beklenmeyen alan taşıyor; cihaz içi taslak korunuyor.");
  }
  return record;
}

export function createLocalDailyPlanReview(
  snapshot: DataSnapshot,
  planId: string,
): DailyPlanReviewCandidate {
  const plan = selectedPlan(snapshot, planId);
  const flow = plan.teacherOwnedDailyFlow;
  const focus = safePlanText(
    flow.blocks.find((block) => block.kind === "teacher-activity-one")?.title ?? plan.title ?? "bugünün etkinliği",
    knownNames(snapshot),
  );
  return {
    planId: plan.id,
    expectedUpdatedAt: String(plan.updatedAt),
    sourceFlowRevisionNumber: flow.revisionNumber,
    inclusiveAdaptation: `${focus} sırasında yönergeyi görsel, sözel ve nesneyle gösterme seçenekleri sunun; katılım biçimini çocuğun seçmesine ve kendi hızında yeniden denemesine alan açın.`,
    openEndedQuestions: [
      "Bugünkü çalışmada seni en çok düşündüren veya meraklandıran ne oldu?",
      "Aynı malzemeleri başka bir yolla kullansaydın nasıl bir sonuç beklerdin?",
      "Bir arkadaşının fikrini duyduğunda kendi düşüncende neler değişti?",
    ],
    endOfDayEvaluation: "Çocukların seçim yapma, çözümünü açıklama ve akran fikrine yanıt verme anlarını somut örneklerle not edin; planlanan süre ile gerçek odaklanma süresini karşılaştırın.",
    nextDaySuggestion: "Bugün tekrar edilen merak sorusunu yarın iki farklı malzeme ve çocukların seçeceği küçük grup düzeniyle yeniden ele alın; önceki çözümle yeni çözüm arasındaki farkı görünür kılın.",
    generationMode: "local",
    aiModel: "maarifos-local-plan-review",
    privacyDisclosure: "Cihaz içi güvenli taslak hazırlandı; hiçbir sınıf verisi cihazdan çıkmadı.",
  };
}

export async function generateDailyPlanReviewWithDeepSeek(
  snapshot: DataSnapshot,
  planId: string,
  requester?: DailyPlanReviewAIRequester,
): Promise<DailyPlanReviewCandidate> {
  const plan = selectedPlan(snapshot, planId);
  const request = prepareDailyPlanReviewAIRequest(snapshot, planId);
  const activeRequester = requester ?? (await import("../../services/secure-ai-client.ts")).SecureAIClient;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = globalThis.setTimeout(
      () => reject(new Error("DeepSeek plan incelemesi 8 saniyede yanıt vermedi; cihaz içi taslak korunuyor.")),
      PLAN_REVIEW_TIMEOUT_MS,
    );
  });
  let result: { text: string; model: string };
  try {
    result = await Promise.race([
      activeRequester.requestCompletion(request.prompt, {
        systemPrompt: request.systemPrompt,
      }),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
  }
  const parsed = parseJSONPayload(result.text);
  const content = validateDailyPlanReviewContent({
    inclusiveAdaptation: String(parsed.inclusiveAdaptation ?? ""),
    openEndedQuestions: Array.isArray(parsed.openEndedQuestions)
      ? parsed.openEndedQuestions.map((item) => String(item))
      : [],
    endOfDayEvaluation: String(parsed.endOfDayEvaluation ?? ""),
    nextDaySuggestion: String(parsed.nextDaySuggestion ?? ""),
  }, knownNames(snapshot));
  const model = normalized(result.model);
  if (!/^[A-Za-z0-9._-]{2,80}$/u.test(model)) {
    throw new Error("DeepSeek model bilgisi doğrulanamadı; cihaz içi taslak korunuyor.");
  }
  return {
    ...content,
    planId: plan.id,
    expectedUpdatedAt: String(plan.updatedAt),
    sourceFlowRevisionNumber: plan.teacherOwnedDailyFlow.revisionNumber,
    generationMode: "deepseek",
    aiModel: model,
    privacyDisclosure: request.privacyDisclosure,
  };
}

function reviewNote(label: string, text: string, model: string): string {
  return `[${label} · ${model}]\n${text}`;
}

function appendReview(existing: string, addition: string, label: string): string {
  const output = [existing.trim(), addition].filter(Boolean).join("\n\n");
  if (output.length > 1_000) {
    throw new Error(`${label} için mevcut öğretmen notu ile yapay zekâ taslağı 1000 karakter sınırını aşıyor. Metni kısaltın; mevcut not silinmedi.`);
  }
  return output;
}

export function mergeDailyPlanReviewIntoBlocks(
  blocks: readonly TeacherOwnedDailyFlowBlockEdit[],
  content: DailyPlanReviewContent,
  model: string,
): readonly TeacherOwnedDailyFlowBlockEdit[] {
  const validated = validateDailyPlanReviewContent(content);
  const questions = validated.openEndedQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n");
  const targets = new Map<string, { label: string; text: string }>([
    ["teacher-activity-one", { label: "DeepSeek kapsayıcı uyarlama", text: validated.inclusiveAdaptation }],
    ["teacher-activity-two", { label: "DeepSeek açık uçlu sorular", text: questions }],
    ["closing", { label: "DeepSeek gün sonu değerlendirmesi", text: validated.endOfDayEvaluation }],
    ["small-group", { label: "DeepSeek ertesi gün önerisi", text: validated.nextDaySuggestion }],
  ]);
  return blocks.map((block) => {
    const target = targets.get(block.kind);
    if (!target) return structuredClone(block);
    return {
      ...structuredClone(block),
      teacherNote: appendReview(
        block.teacherNote,
        reviewNote(target.label, target.text, model),
        target.label,
      ),
    };
  });
}

export async function applyDailyPlanReview(
  store: LocalDataStore,
  candidate: DailyPlanReviewCandidate,
  edited: DailyPlanReviewContent,
  now: Date = new Date(),
): Promise<{ planId: string; revisionNumber: number; updatedAt: string }> {
  const snapshot = await store.readSnapshot();
  const plan = selectedPlan(snapshot, candidate.planId);
  if (
    plan.updatedAt !== candidate.expectedUpdatedAt ||
    plan.teacherOwnedDailyFlow.revisionNumber !== candidate.sourceFlowRevisionNumber
  ) {
    throw new Error("Günlük plan siz taslağı incelerken değişti. Son sürümü açıp yeni öneri hazırlayın; hiçbir değişiklik kaydedilmedi.");
  }
  const content = validateDailyPlanReviewContent(edited, knownNames(snapshot));
  const blocks = mergeDailyPlanReviewIntoBlocks(
    plan.teacherOwnedDailyFlow.blocks,
    content,
    candidate.aiModel,
  );
  const updated = await updateTeacherOwnedDailyFlow(store, {
    planId: plan.id,
    expectedUpdatedAt: candidate.expectedUpdatedAt,
    blocks,
    now,
  });
  return {
    planId: updated.id,
    revisionNumber: updated.teacherOwnedDailyFlow.revisionNumber,
    updatedAt: String(updated.updatedAt),
  };
}
