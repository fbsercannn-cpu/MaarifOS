import type { PremiumPlanLens, PremiumPlanLensId } from "./domain.ts";

/**
 * Pilot arayüzünde gösterilebilen, ücretli etkinlik metni içermeyen katalog.
 * Gerçek plan ve etkinlikler uygulama paketinin dışındaki imzalı içerik paketindedir.
 */
export const PREMIUM_PILOT_LENSES: readonly PremiumPlanLens[] = Object.freeze([
  Object.freeze({
    id: "guided-play",
    displayName: "Çocuk Girişimli ve Rehberli Oyun",
    shortDescription: "Çocuk seçimini koruyan, öğretmen sorularıyla derinleşen oyun.",
    evidenceGrade: "B",
    inspiration: "Gelişime uygun uygulama",
  }),
  Object.freeze({
    id: "belonging-family-weave",
    displayName: "Aidiyet–İlişki–Aile Dokuması",
    shortDescription: "İyi oluşu, aile bilgisini ve güvenli ilişkileri planın merkezine alır.",
    evidenceGrade: "C",
    inspiration: "Te Whāriki ilkeleri",
  }),
  Object.freeze({
    id: "accessible-participation",
    displayName: "Erişilebilir Katılım Tasarımı",
    shortDescription: "Ortam engellerini azaltır, çocuğun katılım ve ifade yolunu çeşitlendirir.",
    evidenceGrade: "A-B",
    inspiration: "Kapsayıcı erken çocukluk uygulamaları",
  }),
  Object.freeze({
    id: "prepared-environment",
    displayName: "Hazırlanmış Çevre ve Bağımsız Çalışma",
    shortDescription: "Düzenli ortam, gerçek yaşam işi, seçim ve kademeli bağımsızlık.",
    evidenceGrade: "B",
    inspiration: "Montessori ilkeleri",
  }),
  Object.freeze({
    id: "emotion-relationship-coregulation",
    displayName: "Duygu–İlişki–Eş Düzenleme",
    shortDescription: "Güvenli ilişki, duygu dili ve yetişkin eş düzenleme desteğini birleştirir.",
    evidenceGrade: "A",
    inspiration: "İlişki temelli sosyal-duygusal öğrenme",
  }),
  Object.freeze({
    id: "plan-act-reflect",
    displayName: "Planla–Uygula–Değerlendir",
    shortDescription: "Çocuğun niyetini belirtmesine, uygulamasına ve sürece geri dönmesine alan açar.",
    evidenceGrade: "B",
    inspiration: "HighScope ilkeleri",
  }),
]);

export const PREMIUM_PILOT_LENS_IDS: readonly PremiumPlanLensId[] =
  Object.freeze(PREMIUM_PILOT_LENSES.map((lens) => lens.id));

export function premiumPilotLensById(id: string): PremiumPlanLens | null {
  return PREMIUM_PILOT_LENSES.find((lens) => lens.id === id) ?? null;
}
