import type { ActivityStudioItem } from "./activity-studio-model.ts";

export const ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY = 180 as const;
export const ACTIVITY_YEAR_DAILY_SUGGESTION_COUNT = 3 as const;
export const ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT =
  ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY * ACTIVITY_YEAR_DAILY_SUGGESTION_COUNT;

export interface ActivityYearMonthLens {
  readonly month: 1 | 2 | 3 | 4 | 5 | 6 | 9 | 10 | 11 | 12;
  readonly label: string;
  readonly teacherIntent: string;
  readonly familyBridge: string;
}

export const ACTIVITY_YEAR_MONTH_LENSES: readonly ActivityYearMonthLens[] =
  Object.freeze([
    {
      month: 9,
      label: "Aidiyet, güven ve sınıf rutinleri",
      teacherIntent: "Çocukların mekânı, yetişkinleri, arkadaşlarını ve seçim yollarını güvenle tanımasına alan açın.",
      familyBridge: "Ev-okul geçişinde işe yarayan sakin ve gönüllü bir rutini aileden dinleyin.",
    },
    {
      month: 10,
      label: "Çevre, ortak yaşam ve kültürel merak",
      teacherIntent: "Yakın çevreyi gözlem, soru, rol ve ortak sorumluluk deneyimleriyle araştırın.",
      familyBridge: "Ailenin çevresinde önem verdiği bir yer, emek veya komşuluk örneğini yargısızca paylaşmasına alan açın.",
    },
    {
      month: 11,
      label: "Beden, hareket ve sağlıklı günlük yaşam",
      teacherIntent: "Beden sinyali, güvenli hareket, dinlenme, temizlik ve bakım kararlarını görünür kılın.",
      familyBridge: "Evde işe yarayan bir su, dinlenme veya temizlik rutinini çocukla birlikte adlandırmalarını önerin.",
    },
    {
      month: 12,
      label: "Işık, ses, örüntü ve birlikte üretme",
      teacherIntent: "Kısa günlerin ışık, gölge, ritim ve sıra örüntülerini sanat ve araştırmayla birleştirin.",
      familyBridge: "Evde duyulan güvenli bir sesin veya görülen bir ışık değişiminin tarif edilmesini isteyin.",
    },
    {
      month: 1,
      label: "Kış gözlemleri, kaynakları koruma ve dayanışma",
      teacherIntent: "Hava değişimini, ihtiyaçları, yeniden kullanmayı ve yardımlaşmayı somut sınıf kararlarına bağlayın.",
      familyBridge: "Yeni malzeme istemeden, evde yeniden kullanılan bir nesnenin öyküsünü paylaşmalarını önerin.",
    },
    {
      month: 2,
      label: "Dil, hikâye, duygu ve farklı bakışlar",
      teacherIntent: "Çocuk sözünü değiştirmeden kaydedin; aynı olayın farklı anlatım ve çözüm yollarını açık tutun.",
      familyBridge: "Ailece hatırlanan kısa bir günlük olayı çocuğun seçtiği resim, söz veya hareketle anlatmalarını önerin.",
    },
    {
      month: 3,
      label: "Su, toprak, büyüme ve bilimsel merak",
      teacherIntent: "Tahmin, deneme, karşılaştırma ve değişimi uzun süreli doğa gözlemleriyle ilişkilendirin.",
      familyBridge: "Ev-okul yolunda fark edilen tek bir mevsim değişimini çocuk sözüyle kaydetmelerini önerin.",
    },
    {
      month: 4,
      label: "Doğaya özen, canlılar ve açık hava araştırmaları",
      teacherIntent: "Canlıya zarar vermeyen gözlem, güvenli rota ve çevre sorumluluğunu çocukların sorularıyla planlayın.",
      familyBridge: "Aileye doğadan parça toplamadan bir renk, ses veya iz fark etme daveti verin.",
    },
    {
      month: 5,
      label: "İş birliği, tasarım ve açık uçlu problem çözme",
      teacherIntent: "Çocukların görev, malzeme, sıra ve çözüm kararlarını birlikte denemesine ve değiştirmesine zaman verin.",
      familyBridge: "Evde birlikte çözülen küçük bir işi sonuçtan çok kullanılan yol üzerinden konuşmalarını önerin.",
    },
    {
      month: 6,
      label: "Yansıtma, paylaşma ve öğrenme izlerini görünür kılma",
      teacherIntent: "Ürünü sıralamadan, çocukların seçim, deneme, değişiklik ve gelecek meraklarını yeniden ziyaret edin.",
      familyBridge: "Çocuğun yıl içinden anlatmak istediği tek bir öğrenme izini ailece dinlemelerini önerin.",
    },
  ]);

function canonicalCivilDate(civilDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(civilDate)) {
    throw new Error("Etkinlik öneri tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }
  const parsed = new Date(`${civilDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== civilDate
  ) {
    throw new Error("Etkinlik öneri tarihi geçerli bir sivil tarih olmalıdır.");
  }
  return parsed;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function stableTextHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function civilDayOrdinal(civilDate: string): number {
  return Math.floor(canonicalCivilDate(civilDate).getTime() / 86_400_000);
}

function groupByCategory(items: readonly ActivityStudioItem[]): Array<{
  category: string;
  items: ActivityStudioItem[];
}> {
  const grouped = new Map<string, ActivityStudioItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.category);
    if (bucket) bucket.push(item);
    else grouped.set(item.category, [item]);
  }
  const buckets = [...grouped].map(([category, categoryItems]) => ({
    category,
    items: categoryItems.sort(
      (left, right) =>
        stableTextHash(left.id) - stableTextHash(right.id) ||
        left.id.localeCompare(right.id, "tr-TR"),
    ),
  }));
  buckets.sort(
    (left, right) =>
      stableTextHash(left.category) - stableTextHash(right.category) ||
      left.category.localeCompare(right.category, "tr-TR"),
  );
  return buckets;
}

export function resolveActivityYearMonthLens(
  civilDate: string,
): ActivityYearMonthLens | null {
  const month = canonicalCivilDate(civilDate).getUTCMonth() + 1;
  return (
    ACTIVITY_YEAR_MONTH_LENSES.find((lens) => lens.month === month) ?? null
  );
}

/**
 * Tam sivil tarihi kullanır; ayın yalnız gün numarasına göre dönmediği için
 * her ayın 5'i aynı üç öneriyi üretmez. Aynı gün deterministiktir, ardışık
 * günlerde başlangıç ve adım birlikte değişir; ilk turda kategori çeşitliliği
 * korunur.
 */
export function selectDailyActivitySuggestions(
  items: readonly ActivityStudioItem[],
  civilDate: string,
  count: number = ACTIVITY_YEAR_DAILY_SUGGESTION_COUNT,
): readonly ActivityStudioItem[] {
  canonicalCivilDate(civilDate);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Günlük etkinlik önerisi sayısı sıfır veya pozitif tam sayı olmalıdır.");
  }
  if (count === 0 || items.length === 0) return Object.freeze([]);
  if (items.length <= count) return Object.freeze([...items]);

  const ordinal = civilDayOrdinal(civilDate);
  const categoryBuckets = groupByCategory(items);
  const categoryCount = categoryBuckets.length;
  const distinctCategoryTarget = Math.min(count, categoryCount);
  const categoryStart = positiveModulo(ordinal, categoryCount);
  const selected: ActivityStudioItem[] = [];
  const selectedIds = new Set<string>();

  for (let slot = 0; slot < distinctCategoryTarget; slot += 1) {
    const categoryIndex = positiveModulo(categoryStart + slot, categoryCount);
    const bucket = categoryBuckets[categoryIndex];
    if (!bucket) continue;

    // Bu kategori, bugünden önce tamamlanan tam kategori çevrimlerinde üç kez
    // görünür. Kalan en çok altı günü de sayarak her kategori içindeki tüm
    // etkinlikleri sırayla dolaşır; böylece yıllık rotasyon birkaç popüler karta
    // sıkışmaz.
    const completedCycles = Math.floor(ordinal / categoryCount);
    const remainingDays = positiveModulo(ordinal, categoryCount);
    let priorAppearances = completedCycles * distinctCategoryTarget;
    for (let dayOffset = 0; dayOffset < remainingDays; dayOffset += 1) {
      if (
        positiveModulo(categoryIndex - dayOffset, categoryCount) <
        distinctCategoryTarget
      ) {
        priorAppearances += 1;
      }
    }
    const item = bucket.items[
      positiveModulo(
        priorAppearances + stableTextHash(bucket.category),
        bucket.items.length,
      )
    ];
    if (!item) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }

  const ordered = categoryBuckets.flatMap((bucket) => bucket.items);
  for (let index = 0; index < ordered.length && selected.length < count; index += 1) {
    const item = ordered[positiveModulo(ordinal + index, ordered.length)];
    if (!item || selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }
  return Object.freeze(selected);
}

export interface ActivityYearRotationDay {
  readonly civilDate: string;
  readonly activities: readonly ActivityStudioItem[];
}

export function createActivityYearRotation(input: {
  readonly items: readonly ActivityStudioItem[];
  readonly startCivilDate: string;
  readonly schoolDayCount?: number;
}): readonly ActivityYearRotationDay[] {
  const start = canonicalCivilDate(input.startCivilDate);
  const schoolDayCount = input.schoolDayCount ?? ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY;
  if (!Number.isSafeInteger(schoolDayCount) || schoolDayCount < 0 || schoolDayCount > 366) {
    throw new Error("Yıllık etkinlik rotasyonu 0–366 okul günü arasında olmalıdır.");
  }

  const days: ActivityYearRotationDay[] = [];
  const categoryBuckets = groupByCategory(input.items);
  const nextItemByCategory = new Map<string, number>();
  const cursor = new Date(start);
  while (days.length < schoolDayCount) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      const civilDate = cursor.toISOString().slice(0, 10);
      const activities: ActivityStudioItem[] = [];
      const dailyTarget = Math.min(
        ACTIVITY_YEAR_DAILY_SUGGESTION_COUNT,
        categoryBuckets.length,
      );
      for (let slot = 0; slot < dailyTarget; slot += 1) {
        const bucket = categoryBuckets[
          positiveModulo(days.length + slot, categoryBuckets.length)
        ];
        if (!bucket) continue;
        const nextIndex = nextItemByCategory.get(bucket.category) ?? 0;
        const item = bucket.items[positiveModulo(nextIndex, bucket.items.length)];
        nextItemByCategory.set(bucket.category, nextIndex + 1);
        if (item) activities.push(item);
      }
      days.push(
        Object.freeze({
          civilDate,
          activities: Object.freeze(activities),
        }),
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Object.freeze(days);
}
