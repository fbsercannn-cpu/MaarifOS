import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { ObservationOutcomeCandidate } from "./observation-outcome-package.ts";

const CLOUD_BLOCKING_PATTERN =
  /(?:tan[ıi]|teşhis|otizm|dehb|ilaç|reçete|sağlık|hastalık|terapi|psikolog|psikiyatri|adres|mahalle|cadde|sokak|apartman|daire|boşan|velayet|vefat|şehit|gazi|şiddet|istismar)/iu;
const TCKN_PATTERN = /\b\d{11}\b/gu;
const PHONE_PATTERN = /\b(?:\+?90\s*)?0?5\d{2}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/gu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const IBAN_PATTERN = /\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/giu;
const UNSAFE_AI_JUDGMENT =
  /(?:tanısı|teşhisi|normal değil|geri(?:dir| kalmış)|başarısız|üstün zekalı|problemli çocuk|yetersiz çocuk)|%\s*\d/iu;
const GENERIC_IDENTITY_TOKENS = new Set([
  "çocuk",
  "öğrenci",
  "anne",
  "baba",
  "veli",
  "yakın",
  "diğer",
]);

export interface ObservationOutcomeAIRequest {
  readonly prompt: string;
  readonly systemPrompt: string;
  readonly privacyDisclosure: string;
  readonly redactionCount: number;
}

export interface ObservationOutcomeAIRequester {
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

function knownIdentityNames(snapshot: DataSnapshot): readonly string[] {
  const names = new Set<string>();
  const add = (value: unknown) => {
    const name = normalized(value);
    if (name.length < 3) return;
    names.add(name);
    for (const part of name.split(/\s+/u)) {
      if (
        part.length >= 3 &&
        !GENERIC_IDENTITY_TOKENS.has(part.toLocaleLowerCase("tr-TR"))
      ) names.add(part);
    }
  };
  for (const student of snapshot.students.filter(live)) {
    add(student.displayName);
    add(student.firstName);
    add(student.lastName);
    if (Array.isArray(student.contacts)) {
      for (const contact of student.contacts) {
        if (contact && typeof contact === "object" && !Array.isArray(contact)) {
          add((contact as Record<string, unknown>).name);
        }
      }
    }
  }
  return [...names].sort((left, right) => right.length - left.length);
}

function redactKnownNames(
  text: string,
  names: readonly string[],
): { text: string; count: number } {
  let output = text;
  let count = 0;
  for (const name of names) {
    const pattern = new RegExp(escapePattern(name), "giu");
    output = output.replace(pattern, () => {
      count += 1;
      return "[ÇOCUK ADI ÇIKARILDI]";
    });
  }
  return { text: output, count };
}

function redactPattern(
  text: string,
  pattern: RegExp,
  replacement: string,
): { text: string; count: number } {
  let count = 0;
  return {
    text: text.replace(pattern, () => {
      count += 1;
      return replacement;
    }),
    count,
  };
}

function containsPattern(text: string, pattern: RegExp): boolean {
  return new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text);
}

function selectedObservation(snapshot: DataSnapshot, candidate: ObservationOutcomeCandidate): StoredRecord {
  const observation = snapshot.observations.find(
    (record) =>
      record.id === candidate.observationId &&
      live(record) &&
      record.rawTextImmutable === true &&
      (record.studentId === candidate.studentId ||
        (Array.isArray(record.studentIds) && record.studentIds.includes(candidate.studentId))),
  );
  if (!observation) throw new Error("Kaynak gözlem veya çocuk bağlantısı artık doğrulanamıyor. Taslağı yeniden açın.");
  return observation;
}

export function prepareObservationOutcomeAIRequest(
  snapshot: DataSnapshot,
  candidate: ObservationOutcomeCandidate,
): ObservationOutcomeAIRequest {
  const observation = selectedObservation(snapshot, candidate);
  const rawText = normalized(observation.rawText);
  if (!rawText) throw new Error("Boş gözlem buluta gönderilmez.");
  if (CLOUD_BLOCKING_PATTERN.test(rawText)) {
    throw new Error(
      "Bu gözlem sağlık, aile veya adres niteliğinde hassas ayrıntı içerebilir. DeepSeek'e gönderilmedi; cihaz içi taslak korunuyor.",
    );
  }

  const names = knownIdentityNames(snapshot);
  let result = redactKnownNames(rawText, names);
  let safeText = result.text;
  let redactionCount = result.count;
  for (const [pattern, replacement] of [
    [TCKN_PATTERN, "[TCKN ÇIKARILDI]"],
    [PHONE_PATTERN, "[TELEFON ÇIKARILDI]"],
    [EMAIL_PATTERN, "[E-POSTA ÇIKARILDI]"],
    [IBAN_PATTERN, "[IBAN ÇIKARILDI]"],
  ] as const) {
    result = redactPattern(safeText, pattern, replacement);
    safeText = result.text;
    redactionCount += result.count;
  }

  const links = snapshot.evidenceCurriculumLinks
    .filter((record) =>
      record.observationId === candidate.observationId &&
      record.confirmationMethod === "teacher-confirmed" &&
      live(record)
    )
    .map((record) => ({
      code: normalized(record.referenceCode),
      title: normalized(record.referenceTitle),
    }))
    .filter((record) => record.code || record.title)
    .slice(0, 8);
  if (links.length === 0) throw new Error("Öğretmen tarafından onaylanmış program bağlantısı bulunamadı.");

  const programContext = links
    .map((link) => `${link.code || "Kod yok"}: ${link.title || "Başlık yok"}`)
    .join(" | ");
  const prompt = [
    "Aşağıdaki kimliksizleştirilmiş tek sınıf gözleminden iki kısa Türkçe taslak üret.",
    `Somut gözlem: ${safeText}`,
    `Öğretmenin onayladığı program bağlantıları: ${programContext}`,
    "Yalnız şu JSON nesnesini döndür: {\"assessmentText\":\"...\",\"familyBulletinText\":\"...\"}",
    "Değerlendirme metni yalnız gözlenebilir davranışı ve izlenebilecek sonraki adımı anlatsın.",
    "Veli bülteni yargısız, sıcak ve evde yapılabilecek isteğe bağlı tek küçük öneri içersin.",
    "Çocuk adı, aile bilgisi, tanı, puan, yüzde, gelişim düzeyi veya kesin hüküm üretme.",
  ].join("\n");
  return {
    prompt,
    systemPrompt:
      "Sen okul öncesi öğretmeninin taslak yardımcısısın. Yalnız geçerli JSON üret. Kimlik bilgisi, tanı, puan, kişilik etiketi veya kesin gelişim hükmü üretme. Çıktı öğretmen incelemesi olmadan kayıt değildir.",
    privacyDisclosure: redactionCount > 0
      ? `${redactionCount.toLocaleString("tr-TR")} kişisel veri parçası istemden çıkarıldı; ham gözlem ve çocuk adı sunucuda saklanmak üzere gönderilmedi.`
      : "İsteme çocuk adı, iletişim bilgisi, adres, aile özel notu veya sağlık bilgisi eklenmedi.",
    redactionCount,
  };
}

function parseJSONPayload(text: string): Record<string, unknown> {
  const normalizedText = text.trim();
  const fenced = normalizedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu)?.[1] ?? normalizedText;
  let value: unknown;
  try {
    value = JSON.parse(fenced);
  } catch {
    throw new Error("DeepSeek iki alanlı geçerli taslak döndürmedi; cihaz içi taslak korunuyor.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("DeepSeek yanıt biçimi doğrulanamadı; cihaz içi taslak korunuyor.");
  }
  return value as Record<string, unknown>;
}

function validatedAIText(value: unknown, label: string, names: readonly string[]): string {
  const text = normalized(value);
  if (text.length < 40 || text.length > 6_000) {
    throw new Error(`DeepSeek ${label} güvenli uzunluk sınırını karşılamadı; cihaz içi taslak korunuyor.`);
  }
  if (
    containsPattern(text, TCKN_PATTERN) || containsPattern(text, PHONE_PATTERN) ||
    containsPattern(text, EMAIL_PATTERN) || containsPattern(text, IBAN_PATTERN) ||
    containsPattern(text, CLOUD_BLOCKING_PATTERN) || containsPattern(text, UNSAFE_AI_JUDGMENT) ||
    names.some((name) => new RegExp(escapePattern(name), "iu").test(text))
  ) {
    throw new Error(`DeepSeek ${label} gizlilik veya pedagojik güven kontrolünden geçmedi; cihaz içi taslak korunuyor.`);
  }
  return text;
}

export async function generateObservationOutcomeWithDeepSeek(
  snapshot: DataSnapshot,
  candidate: ObservationOutcomeCandidate,
  requester?: ObservationOutcomeAIRequester,
): Promise<ObservationOutcomeCandidate> {
  const request = prepareObservationOutcomeAIRequest(snapshot, candidate);
  const activeRequester = requester ?? (await import("../../services/secure-ai-client.ts")).SecureAIClient;
  const result = await activeRequester.requestCompletion(request.prompt, {
    systemPrompt: request.systemPrompt,
  });
  const value = parseJSONPayload(result.text);
  const names = knownIdentityNames(snapshot);
  const assessmentText = validatedAIText(value.assessmentText, "değerlendirme metni", names);
  const familyBulletinText = validatedAIText(value.familyBulletinText, "veli bülteni", names);
  const model = normalized(result.model);
  if (!/^[A-Za-z0-9._-]{2,80}$/u.test(model)) {
    throw new Error("DeepSeek model bilgisi doğrulanamadı; cihaz içi taslak korunuyor.");
  }
  return {
    ...candidate,
    assessmentText,
    familyBulletinText,
    sourceDisclosure:
      "Kaynak: seçilen ham gözlemin kimliksizleştirilmiş metni ve öğretmenin onayladığı program bağlantıları.",
    uncertaintyDisclosure:
      "DeepSeek çıktısı taslaktır. Metinler öğretmen tarafından düzenlenip açıkça kaydedilmeden değerlendirme veya veli iletisi sayılmaz.",
    generationMode: "deepseek",
    aiModel: model,
    privacyDisclosure: request.privacyDisclosure,
  };
}
