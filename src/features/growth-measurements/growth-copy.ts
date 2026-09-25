import type {
  GrowthMeasurementMetric,
  GrowthMeasurementSource,
} from "../../core/domain/growth-measurements.ts";
import type { GrowthPeriodStatus } from "./growth-model.ts";

export const GROWTH_COPY = Object.freeze({
  title: "Boy–kilo takibi",
  subtitle: "Tarihli ölçümler, eksikler ve değişim",
  tabs: {
    entry: "Dönem çizelgesi",
    student: "Çocuk görünümü",
    class: "Sınıf özeti",
    missing: "Eksik ölçümler",
    documents: "Çıktılar",
  },
  metrics: {
    height: "Boy",
    weight: "Kilo",
  } satisfies Record<GrowthMeasurementMetric, string>,
  sources: {
    school: "Okulda ölçüldü",
    family: "Aile bildirdi",
    document: "Belgeden aktarıldı",
  } satisfies Record<GrowthMeasurementSource, string>,
  statuses: {
    planned: "Planlandı",
    waiting: "Ölçüm bekliyor",
    partial: "Kısmen tamamlandı",
    complete: "Tamamlandı",
    recovery: "Telafi ölçümü",
    "out-of-scope": "Kapsam dışı",
    review: "İnceleme bekliyor",
  } satisfies Record<GrowthPeriodStatus, string>,
  noChildren: "Bu eğitim yılı ve sınıfta ölçüm kapsamına giren çocuk bulunmuyor.",
  noValue: "Ölçülmedi",
  nonMedicalNotice:
    "Bu alan ölçüm ve öğretmen takibi içindir; tıbbi etiket, persentil, puan veya çocuk sıralaması üretmez.",
  classAverageNotice:
    "Dönem ortalamalarındaki çocuk kümesi değişebilir. Eşleşen değişim yalnız iki dönemde de ölçülen aynı çocuklarla hesaplanır.",
  saveConflict:
    "Bu ölçüm başka bir sekmede değişti. Güncel kaydı yeniden açıp seçiminizi tekrar yapın.",
  importIdentity:
    "Ölçüm satırları yalnız çocuk anahtarıyla eşleştirilir; ad benzerliği otomatik eşleşme oluşturmaz.",
  individualExplanationLabel: "Veli belgesi öğretmen açıklaması (isteğe bağlı)",
  individualExplanationPlaceholder:
    "Ölçümlerin hangi koşulda paylaşıldığını anlatan kısa açıklama",
});

export type GrowthCopy = typeof GROWTH_COPY;
