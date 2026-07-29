import type {
  CurriculumFramework,
  CurriculumProfileSnapshot,
} from "../evidence/evidence-flow.ts";

export type CurriculumTargetKind =
  | "learning-outcome"
  | "process-component"
  | "field-skill"
  | "conceptual-skill"
  | "social-emotional-skill"
  | "value"
  | "literacy"
  | "disposition"
  | "development-domain"
  | "acquisition"
  | "indicator";

export type CurriculumAssignmentMode = "whole-class" | "selected-students";

export type CurriculumAssignmentStatus = "planned";

export type CurriculumAssessmentLevel =
  | "not_assessed"
  | "not_yet"
  | "with_frequent_support"
  | "mostly_independent"
  | "independent";

export interface CurriculumTargetDefinition {
  id: string;
  framework: CurriculumFramework;
  referenceCode: string;
  referenceTitle: string;
  kind: CurriculumTargetKind;
  domain: string;
  parentCode?: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceCheckedOn: string;
  catalogCompleteness: "partial" | "complete";
  verificationStatus:
    | "official-source-checked"
    | "teacher-declared-unverified";
}

export interface CurriculumTargetSnapshot extends CurriculumTargetDefinition {
  catalogId: string;
  sourceVersion: string;
  referenceOrigin: CurriculumProfileSnapshot["referenceOrigin"];
  officialCatalogVerified: boolean;
}

export interface PlannedCurriculumAssignment {
  studentId: string;
  targetId: string;
  referenceCode: string;
  status: CurriculumAssignmentStatus;
  assignedAt: string;
}

export const OFFICIAL_STARTER_CATALOG_PROFILES = {
  tymm: {
    catalogId: "meb-tymm-okul-oncesi-2024-partial",
    sourceVersion: "2024",
  },
  meb_2024: {
    catalogId: "meb-okul-oncesi-egitim-programi-2024-partial",
    sourceVersion: "2024",
  },
} as const;

export const CURRICULUM_TARGET_KIND_LABELS: Record<
  CurriculumTargetKind,
  string
> = {
  "learning-outcome": "Öğrenme çıktısı",
  "process-component": "Alt öğrenme çıktısı / süreç bileşeni",
  "field-skill": "Alan becerisi",
  "conceptual-skill": "Kavramsal beceri",
  "social-emotional-skill": "Sosyal-duygusal öğrenme becerisi",
  value: "Değer",
  literacy: "Okuryazarlık becerisi",
  disposition: "Eğilim",
  "development-domain": "Gelişim alanı",
  acquisition: "Kazanım",
  indicator: "Gösterge",
};

export const CURRICULUM_ASSESSMENT_LEVELS: ReadonlyArray<{
  value: CurriculumAssessmentLevel;
  label: string;
  description: string;
}> = [
  {
    value: "not_assessed",
    label: "Henüz değerlendirilmedi",
    description: "Yeterli gözlem yok veya bu hedef dönem içinde ele alınmadı.",
  },
  {
    value: "not_yet",
    label: "Henüz gerçekleştiremedi",
    description: "Seçili kanıtlarda hedeflenen davranış henüz görülmedi.",
  },
  {
    value: "with_frequent_support",
    label: "Sıklıkla destekle gerçekleştiriyor",
    description: "Kısmen gerçekleştiriyor ve sık yetişkin desteğine ihtiyaç duyuyor.",
  },
  {
    value: "mostly_independent",
    label: "Büyük oranda gerçekleştiriyor",
    description: "Bazen hata yapsa da çoğunlukla ve az destekle gerçekleştiriyor.",
  },
  {
    value: "independent",
    label: "Bağımsız gerçekleştiriyor",
    description: "Seçili kanıtlarda bağımsız ve başarılı biçimde gerçekleştiriyor.",
  },
];

const TYMM_SOURCE =
  "https://tymm.meb.gov.tr/okul-oncesi/unite/479";
const MEB_2024_SOURCE =
  "https://tegm.meb.gov.tr/dosya/okuloncesi/guncellenenokuloncesiegitimprogrami.pdf";
const SOURCE_CHECKED_ON = "2026-07-27";

/**
 * Bu liste tam resmî katalog değildir. İlk güvenli dikey akışta seçme, sınıfa
 * dağıtma ve kanıta bağlama davranışını doğrulamak için resmî MEB kaynaklarından
 * alınmış, kaynak adresi görünür bir başlangıç setidir.
 */
const STARTER_CURRICULUM_TARGET_DEFINITIONS: readonly Omit<
  CurriculumTargetDefinition,
  "catalogCompleteness" | "verificationStatus"
>[] = [
  {
    id: "tymm-fab-1",
    framework: "tymm",
    referenceCode: "FAB.1",
    referenceTitle:
      "Günlük yaşamında fene yönelik olay, olgu ve durumlara yönelik bilimsel gözlem yapabilme",
    kind: "learning-outcome",
    domain: "Fen",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-fab-1-b",
    framework: "tymm",
    referenceCode: "FAB.1.b",
    referenceTitle:
      "Materyallerin gözlemlenebilir özellikleriyle ilgili verileri duyular aracılığıyla toplar",
    kind: "process-component",
    domain: "Fen",
    parentCode: "FAB.1",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-fab-1-c",
    framework: "tymm",
    referenceCode: "FAB.1.c",
    referenceTitle:
      "Yakın çevresindeki canlı ve cansız varlıklara yönelik elde ettiği verileri açıklar",
    kind: "process-component",
    domain: "Fen",
    parentCode: "FAB.1",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-mab-1",
    framework: "tymm",
    referenceCode: "MAB.1",
    referenceTitle: "Ritmik ve algısal sayabilme",
    kind: "learning-outcome",
    domain: "Matematik",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-mab-1-a",
    framework: "tymm",
    referenceCode: "MAB.1.a",
    referenceTitle: "1 ile 20 arasında birer ritmik sayar",
    kind: "process-component",
    domain: "Matematik",
    parentCode: "MAB.1",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-tadb-1",
    framework: "tymm",
    referenceCode: "TADB.1",
    referenceTitle:
      "Dinleyecekleri veya izleyecekleri materyalleri yönetebilme",
    kind: "learning-outcome",
    domain: "Türkçe",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-tadb-1-b",
    framework: "tymm",
    referenceCode: "TADB.1.b",
    referenceTitle: "Seçilen materyalleri dinler veya izler",
    kind: "process-component",
    domain: "Türkçe",
    parentCode: "TADB.1",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-sdb-2-1-sb2",
    framework: "tymm",
    referenceCode: "SDB2.1.SB2",
    referenceTitle: "Duygu ve düşüncelerini ifade etmek",
    kind: "social-emotional-skill",
    domain: "Sosyal-Duygusal Öğrenme",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-kb-2-7-sb1",
    framework: "tymm",
    referenceCode: "KB2.7.SB1",
    referenceTitle:
      "Birden fazla kavram veya duruma ilişkin özellikleri belirlemek",
    kind: "conceptual-skill",
    domain: "Kavramsal Beceriler",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-e-1-1",
    framework: "tymm",
    referenceCode: "E1.1",
    referenceTitle: "Merak",
    kind: "disposition",
    domain: "Eğilimler",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-d-4-2-2",
    framework: "tymm",
    referenceCode: "D4.2.2",
    referenceTitle: "Arkadaşlarıyla duygu ve düşüncelerini paylaşır",
    kind: "value",
    domain: "Değerler",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "tymm-ob-4-2-sb1",
    framework: "tymm",
    referenceCode: "OB4.2.SB1",
    referenceTitle: "Görseli incelemek",
    kind: "literacy",
    domain: "Okuryazarlık Becerileri",
    sourceUrl: TYMM_SOURCE,
    sourceLabel: "TYMM Okul Öncesi 60–72 Ay Eylül Ayı Planı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-domain-cognitive",
    framework: "meb_2024",
    referenceCode: "BİLİŞSEL-GELİŞİM",
    referenceTitle: "Bilişsel gelişim",
    kind: "development-domain",
    domain: "Bilişsel Gelişim",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-domain-language",
    framework: "meb_2024",
    referenceCode: "DİL-GELİŞİMİ",
    referenceTitle: "Dil gelişimi",
    kind: "development-domain",
    domain: "Dil Gelişimi",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-language-acquisition-1",
    framework: "meb_2024",
    referenceCode: "DİL-K1",
    referenceTitle: "Sesleri ayırt eder",
    kind: "acquisition",
    domain: "Dil Gelişimi",
    parentCode: "DİL-GELİŞİMİ",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-language-indicator-1-1",
    framework: "meb_2024",
    referenceCode: "DİL-K1-G1",
    referenceTitle: "Sesin kaynağını söyler",
    kind: "indicator",
    domain: "Dil Gelişimi",
    parentCode: "DİL-K1",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-domain-social-emotional",
    framework: "meb_2024",
    referenceCode: "SOSYAL-DUYGUSAL-GELİŞİM-VE-DEĞERLER",
    referenceTitle: "Sosyal-duygusal gelişim ve değerler",
    kind: "development-domain",
    domain: "Sosyal-Duygusal Gelişim ve Değerler",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-social-acquisition-1",
    framework: "meb_2024",
    referenceCode: "SDGD-K1",
    referenceTitle:
      "Kendisinin ve yakın çevresindeki bireylerin özelliklerini tanıtır",
    kind: "acquisition",
    domain: "Sosyal-Duygusal Gelişim ve Değerler",
    parentCode: "SOSYAL-DUYGUSAL-GELİŞİM-VE-DEĞERLER",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
  {
    id: "meb-2024-domain-physical-health",
    framework: "meb_2024",
    referenceCode: "FİZİKSEL-GELİŞİM-VE-SAĞLIK",
    referenceTitle: "Fiziksel gelişim ve sağlık",
    kind: "development-domain",
    domain: "Fiziksel Gelişim ve Sağlık",
    sourceUrl: MEB_2024_SOURCE,
    sourceLabel: "MEB 2024 Okul Öncesi Eğitim Programı",
    sourceCheckedOn: SOURCE_CHECKED_ON,
  },
];

export const STARTER_CURRICULUM_TARGETS: readonly CurriculumTargetDefinition[] =
  STARTER_CURRICULUM_TARGET_DEFINITIONS.map((target) => ({
    ...target,
    catalogCompleteness: "partial",
    verificationStatus: "official-source-checked",
  }));

export function curriculumTargetsForProfile(
  profile: CurriculumProfileSnapshot,
): CurriculumTargetSnapshot[] {
  return STARTER_CURRICULUM_TARGETS
    .filter((target) => target.framework === profile.framework)
    .map((target) => ({
      ...target,
      catalogId: profile.catalogId,
      sourceVersion: profile.sourceVersion,
      referenceOrigin: profile.referenceOrigin,
      officialCatalogVerified: profile.officialCatalogVerified,
    }));
}

export function isCurriculumAssessmentLevel(
  value: unknown,
): value is CurriculumAssessmentLevel {
  return CURRICULUM_ASSESSMENT_LEVELS.some((level) => level.value === value);
}
