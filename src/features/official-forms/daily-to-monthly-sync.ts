/**
 * daily-to-monthly-sync.ts — MaarifOS 0.64.0
 * Günlük planlardan aylık plan + EK-15 matrisini reaktif olarak türeten motor.
 * O(n) Map-Reduce — iç içe döngü YOK.
 * Torvalds inisiyatifi: mutation-free, saf fonksiyonlar.
 */

import { type DailyPlanRecord, type MonthKey, type AgeGroup, getPlansForMonth, loadDailyPlans, monthFromDate } from "./daily-plan-core.ts";
import type { ChecklistItem } from "./ek15-catalog.ts";

// ─── AYLI ÖZET (Aylık Plan formuna basılacak değerler) ───────────────────────
export interface MonthlySyncResult {
  monthKey: MonthKey;
  ageGroup: AgeGroup;
  domainCodes: string[];      // union of all daily plan domainCodes
  processCodes: string[];     // union of all daily plan processCodes
  tendencyCodes: string[];    // union
  sdbCodes: string[];         // union
  valueCodes: string[];       // union
  literacyCodes: string[];    // union
  specialDayCodes: string[];  // union
  conceptLabels: string[];    // union
  materialLabels: string[];   // union
  planCount: number;          // bu aydaki toplam günlük plan sayısı
  planDates: string[];        // ["21.09.2026", "22.09.2026", ...]
}

/** İki string[] union'ı — O(n) Set. */
function unionArrays(...arrays: string[][]): string[] {
  const set = new Set<string>();
  for (const arr of arrays) {
    for (const item of arr) {
      const trimmed = item.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort();
}

/** YYYY-MM-DD → GG.AA.YYYY */
function formatDateTR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Belirli ay + yaş grubu için tüm günlük planlardan aylık özet çıkarır.
 * Günlük plan silinince bu fonksiyon yeniden çağrıldığında otomatik güncellenir.
 */
export function buildMonthlySyncResult(monthKey: MonthKey, ageGroup: AgeGroup): MonthlySyncResult {
  const plans = getPlansForMonth(monthKey, ageGroup);

  return {
    monthKey,
    ageGroup,
    domainCodes: unionArrays(...plans.map(p => p.domainCodes)),
    processCodes: unionArrays(...plans.map(p => p.processCodes)),
    tendencyCodes: unionArrays(...plans.map(p => p.tendencyCodes)),
    sdbCodes: unionArrays(...plans.map(p => p.sdbCodes)),
    valueCodes: unionArrays(...plans.map(p => p.valueCodes)),
    literacyCodes: unionArrays(...plans.map(p => p.literacyCodes)),
    specialDayCodes: unionArrays(...plans.map(p => p.specialDayCodes)),
    conceptLabels: unionArrays(...plans.map(p => p.conceptLabels)),
    materialLabels: unionArrays(...plans.map(p => p.materialLabels)),
    planCount: plans.length,
    planDates: plans.map(p => formatDateTR(p.date)).sort(),
  };
}

// ─── EK-15 MATRİS GÜNCELLEMESI ───────────────────────────────────────────────
export interface DailyPlanMatrix {
  /** matrix[checklistItemId][monthKey] = true/false */
  matrix: Record<string, Record<string, boolean>>;
  sourceCount: number;
  matchCount: number;
}

/**
 * Tüm günlük planlardan EK-15 matrisi oluşturur.
 * ChecklistItem'ın code alanı, günlük plan kodlarıyla karşılaştırılır.
 * Etkinlik silinince matrix[itemId][monthKey] = false (başka planda varsa hâlâ true).
 */
export function buildDailyPlanMatrix(
  items: ChecklistItem[],
  ageGroup: AgeGroup,
): DailyPlanMatrix {
  // Map: code → Set<itemId>  (O(n))
  const codeToItems = new Map<string, string[]>();
  for (const item of items) {
    if (item.category === "kavram") continue; // kavramlar matrise dahil değil
    const existing = codeToItems.get(item.code) ?? [];
    existing.push(item.id);
    codeToItems.set(item.code, existing);
  }

  const allPlans = loadDailyPlans().filter(p => p.ageGroup === ageGroup);

  const matrix: Record<string, Record<string, boolean>> = {};
  let matchCount = 0;

  for (const plan of allPlans) {
    const month = monthFromDate(plan.date);
    if (!month) continue;

    // Tüm kod setleri: domain + process + tendency + sdb + value + literacy
    const allCodes = new Set([
      ...plan.domainCodes,
      ...plan.processCodes,
      ...plan.tendencyCodes,
      ...plan.sdbCodes,
      ...plan.valueCodes,
      ...plan.literacyCodes,
    ]);

    for (const code of allCodes) {
      const itemIds = codeToItems.get(code);
      if (!itemIds) continue;
      for (const itemId of itemIds) {
        if (!matrix[itemId]) matrix[itemId] = {};
        if (!matrix[itemId][month]) {
          matrix[itemId][month] = true;
          matchCount++;
        }
      }
    }
  }

  return { matrix, sourceCount: allPlans.length, matchCount };
}

// ─── TÜM AYLARIN SYNC SONUÇLARINI TOPLU DÖNDÜR ───────────────────────────────
export type AllMonthsSyncResult = Partial<Record<MonthKey, MonthlySyncResult>>;

const ALL_MONTHS: MonthKey[] = [
  "Eylül", "Ekim", "Kasım", "Aralık",
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
];

export function buildAllMonthsSyncResult(ageGroup: AgeGroup): AllMonthsSyncResult {
  const result: AllMonthsSyncResult = {};
  for (const month of ALL_MONTHS) {
    const sync = buildMonthlySyncResult(month, ageGroup);
    if (sync.planCount > 0) {
      result[month] = sync;
    }
  }
  return result;
}

// ─── AYLARA GÖRE GÜNLÜK PLAN LİSTESİ (takvim görünümü için) ─────────────────
export interface DailyPlanListByMonth {
  month: MonthKey;
  plans: DailyPlanRecord[];
}

export function groupPlansByMonth(ageGroup: AgeGroup): DailyPlanListByMonth[] {
  const allPlans = loadDailyPlans().filter(p => p.ageGroup === ageGroup);

  // Map: monthKey → DailyPlanRecord[]  (O(n))
  const byMonth = new Map<MonthKey, DailyPlanRecord[]>();
  for (const plan of allPlans) {
    const month = monthFromDate(plan.date);
    if (!month) continue;
    const existing = byMonth.get(month) ?? [];
    existing.push(plan);
    byMonth.set(month, existing);
  }

  // Sort plans within each month by date
  for (const [, plans] of byMonth) {
    plans.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Return in curriculum order
  return ALL_MONTHS
    .filter(m => byMonth.has(m))
    .map(m => ({ month: m, plans: byMonth.get(m)! }));
}

// ─── HUMAN-READABLE SUMMARY (Aylık plan formuna yapıştırma için) ─────────────
/** Bir MonthlySyncResult'ı aylık plan formunun ilgili alanına basılacak
 *  human-readable Türkçe metne çevirir. */
export function syncResultToFieldText(sync: MonthlySyncResult): {
  domainSkills: string;
  tendencies: string;
  socialEmotional: string;
  values: string;
  literacy: string;
  concepts: string;
  materials: string;
} {
  return {
    domainSkills: sync.domainCodes.join(", ") || "—",
    tendencies: sync.tendencyCodes.join(", ") || "—",
    socialEmotional: sync.sdbCodes.join(", ") || "—",
    values: sync.valueCodes.join(", ") || "—",
    literacy: sync.literacyCodes.join(", ") || "—",
    concepts: sync.conceptLabels.join(", ") || "—",
    materials: sync.materialLabels.join(", ") || "—",
  };
}
