/**
 * MEBOfficialSkillsPortal.tsx — Türkiye Yüzyılı Maarif Modeli (TYMM)
 * T.C. Millî Eğitim Bakanlığı Okul Öncesi Resmî Müfredat ve Beceri Analiz Portalı
 * Kaynak: https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi
 * 
 * BİLEŞENLER:
 * 1. 📊 İnteraktif Beceri Dağılımı (Stacked Bar Chart: 6 Boyut x 3 Yaş Grubu)
 * 2. 🏛️ Resmî MEB Örnek Planları (Eylül, Aralık, Mayıs ve Günlük Planlar)
 * 3. 📚 9 Çekirdek Ders Kitabı Vitrini (Görsel Kapaklar & Hızlı İnceleme)
 * 4. ⚡ 1-Tıkla Günlük Planlayıcıya ve Aylık Plana Enjeksiyon
 */

import React, { useState } from "react";
import { type DailyPlanRecord, type AgeGroup, createDailyPlan } from "./daily-plan-core.ts";
import "./official-forms.css";

// ─── MEB RESMÎ BECERİ DAĞILIMI VERİSİ (CANLI MEB API İLE BİREBİR) ───────────
export interface SkillDistributionCategory {
  key: string;
  label: string;
  icon: string;
  totalItems: number;
  byAge: {
    "36-48": {
      count: number;
      percentage: number;
      planTitle: string;
      items: string[];
      dailySampleItems?: string[];
    };
    "48-60": {
      count: number;
      percentage: number;
      planTitle: string;
      items: string[];
      dailySampleItems?: string[];
    };
    "60-72": {
      count: number;
      percentage: number;
      planTitle: string;
      items: string[];
      dailySampleItems?: string[];
    };
  };
}

export const MEB_SKILL_CATEGORIES: SkillDistributionCategory[] = [
  {
    key: "degerler",
    label: "Değerler (D)",
    icon: "💎",
    totalItems: 19,
    byAge: {
      "36-48": {
        count: 7,
        percentage: 37,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: [
          "D1. Adalet",
          "D3. Çalışkanlık",
          "D4. Dostluk",
          "D5. Duyarlılık",
          "D10. Mütevazılık",
          "D16. Sorumluluk",
          "D18. Temizlik",
        ],
      },
      "48-60": {
        count: 7,
        percentage: 37,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: [
          "D2. Aile Bütünlüğü",
          "D3. Çalışkanlık",
          "D6. Dürüstlük",
          "D14. Saygı",
          "D17. Tasarruf",
          "D18. Temizlik",
          "D20. Yardımseverlik",
        ],
      },
      "60-72": {
        count: 5,
        percentage: 26,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "D4. Dostluk (D4.2. Arkadaşları ile etkili iletişim)",
          "D9. Merhamet (D9.3. İnsanı ve doğayı sevmek)",
          "D11. Özgürlük (D11.1. Kararlı olmak)",
          "D12. Sabır (D12.1. Duygu ve davranışta kontrol, D12.2. İstikrar)",
          "D16. Sorumluluk (D16.1. Kendine, D16.2. Topluma, D16.3. Görev bilinci)",
        ],
      },
    },
  },
  {
    key: "alan_becerileri",
    label: "Alan Becerileri (TAB / MAB / FBAB / SBAB / HSAB / SNAB / MZB)",
    icon: "🎯",
    totalItems: 21,
    byAge: {
      "36-48": {
        count: 7,
        percentage: 33,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: [
          "Dinleme/İzleme Becerisi (TAB1)",
          "Okuma Becerisi (TAB2)",
          "Konuşma Becerisi (TAB3)",
          "Matematiksel Muhakeme Becerisi (MAB1)",
          "Sınıflandırma Becerisi (FBAB2)",
          "Zamanı Algılama ve Kronolojik Düşünme Becerisi (SBAB1)",
        ],
        dailySampleItems: ["Matematiksel Muhakeme Becerisi (MAB1)"],
      },
      "48-60": {
        count: 5,
        percentage: 24,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: [
          "Dinleme/İzleme Becerisi (TAB1)",
          "Okuma Becerisi (TAB2)",
          "Konuşma Becerisi (TAB3)",
          "Matematiksel Muhakeme Becerisi (MAB1)",
          "Sınıflandırma Becerisi (FBAB2)",
        ],
      },
      "60-72": {
        count: 9,
        percentage: 43,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "Dinleme/İzleme Becerisi (TAB1)",
          "Okuma Becerisi (TAB2)",
          "Konuşma Becerisi (TAB3)",
          "Matematiksel Muhakeme Becerisi (MAB1)",
          "Matematiksel Problem Çözme Becerisi (MAB2)",
          "Matematiksel Temsil Becerisi (MAB3)",
          "Bilimsel Model Oluşturma Becerisi (FBAB9)",
          "Kanıt Kullanma Becerisi (FBAB12)",
          "Coğrafi Gözlem ve Saha Çalışması Becerisi (SBAB9)",
        ],
      },
    },
  },
  {
    key: "okuryazarlik",
    label: "Okuryazarlık Becerileri (OB)",
    icon: "📚",
    totalItems: 9,
    byAge: {
      "36-48": {
        count: 2,
        percentage: 22,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: ["OB1. Bilgi Okuryazarlığı", "OB4. Görsel Okuryazarlık"],
      },
      "48-60": {
        count: 2,
        percentage: 22,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: ["OB1. Bilgi Okuryazarlığı", "OB4. Görsel Okuryazarlık"],
      },
      "60-72": {
        count: 5,
        percentage: 56,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "OB1. Bilgi Okuryazarlığı",
          "OB2. Dijital Okuryazarlık",
          "OB4. Görsel Okuryazarlık",
          "OB7. Veri Okuryazarlığı",
          "OB8. Sürdürülebilirlik Okuryazarlığı",
        ],
      },
    },
  },
  {
    key: "egilimler",
    label: "Eğilimler (E1 Benlik / E2 Sosyal / E3 Entelektüel)",
    icon: "🧭",
    totalItems: 23,
    byAge: {
      "36-48": {
        count: 7,
        percentage: 30,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: [
          "E1.1. Merak",
          "E1.2. Bağımsızlık",
          "E1.5. Kendine Güvenme (Öz Güven)",
          "E2.2. Sorumluluk",
          "E2.5. Oyunseverlik",
          "E3.2. Odaklanma",
          "E3.3. Yaratıcılık",
        ],
      },
      "48-60": {
        count: 7,
        percentage: 30,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: [
          "E1.1. Merak",
          "E1.3. Azim ve Kararlılık",
          "E1.4. Kendine İnanma (Öz Yeterlilik)",
          "E1.5. Kendine Güvenme (Öz Güven)",
          "E2.2. Sorumluluk",
          "E2.5. Oyunseverlik",
          "E3.3. Yaratıcılık",
        ],
      },
      "60-72": {
        count: 9,
        percentage: 40,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "E1.1. Merak",
          "E1.3. Azim ve Kararlılık",
          "E1.5. Kendine Güvenme (Öz Güven)",
          "E2.2. Sorumluluk",
          "E2.3. Girişkenlik",
          "E2.5. Oyunseverlik",
          "E3.3. Yaratıcılık",
          "E3.5. Açık Fikirlilik",
          "E3.8. Soru Sorma",
        ],
      },
    },
  },
  {
    key: "sosyal_duygusal",
    label: "Sosyal-Duygusal Öğrenme Becerileri (SDB)",
    icon: "🤝",
    totalItems: 9,
    byAge: {
      "36-48": {
        count: 2,
        percentage: 22,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: [
          "SDB1.2. Kendini Düzenleme (Öz Düzenleme Becerisi)",
          "SDB2.1. İletişim Becerisi",
        ],
      },
      "48-60": {
        count: 2,
        percentage: 22,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: [
          "SDB1.1. Kendini Tanıma (Öz Farkındalık Becerisi)",
          "SDB1.2. Kendini Düzenleme (Öz Düzenleme Becerisi)",
        ],
      },
      "60-72": {
        count: 5,
        percentage: 56,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "SDB1.1. Kendini Tanıma (Öz Farkındalık Becerisi)",
          "SDB1.2. Kendini Düzenleme (Öz Düzenleme Becerisi)",
          "SDB2.1. İletişim Becerisi",
          "SDB2.2. İş Birliği Becerisi",
          "SDB2.3. Sosyal Farkındalık Becerisi",
        ],
      },
    },
  },
  {
    key: "kavramsal",
    label: "Kavramsal Beceriler (KB)",
    icon: "💡",
    totalItems: 23,
    byAge: {
      "36-48": {
        count: 6,
        percentage: 26,
        planTitle: "36-48 Ay Eylül Ayı Planı",
        items: [
          "KB2.4. Çözümleme Becerisi",
          "KB2.5. Sınıflandırma Becerisi",
          "KB2.14. Yorumlama Becerisi",
          "KB1.6. Seçme",
        ],
        dailySampleItems: ["KB1.5. Bulma", "KB1.6. Seçme"],
      },
      "48-60": {
        count: 5,
        percentage: 22,
        planTitle: "48-60 Ay Aralık Ayı Planı",
        items: [
          "KB2.2. Gözlemleme Becerisi",
          "KB2.3. Özetleme Becerisi",
          "KB2.4. Çözümleme Becerisi",
          "KB2.7. Karşılaştırma Becerisi",
          "KB2.10. Çıkarım Yapma Becerisi",
        ],
      },
      "60-72": {
        count: 12,
        percentage: 52,
        planTitle: "60-72 Ay Mayıs Ayı Planı",
        items: [
          "KB2.2. Gözlemleme Becerisi",
          "KB2.5. Sınıflandırma Becerisi",
          "KB2.6. Bilgi Toplama Becerisi",
          "KB2.7. Karşılaştırma Becerisi",
          "KB2.8. Sorgulama Becerisi",
          "KB2.10. Çıkarım Yapma Becerisi",
          "KB2.11. Gözleme Dayalı Tahmin Etme Becerisi",
          "KB2.15. Yansıtma Becerisi",
          "KB2.17. Değerlendirme Becerisi",
          "KB2.20. Sentezleme Becerisi",
          "KB1.1. Sayma",
        ],
        dailySampleItems: ["KB2.9. Genelleme Becerisi"],
      },
    },
  },
];

// ─── MEB RESMÎ ÜNİTE VE PLAN MODELLERİ ───────────────────────────────────────
export interface OfficialMEBUnit {
  id: string;
  unitNo: number;
  ageGroup: AgeGroup;
  title: string;
  type: "monthly" | "daily_sample";
  month: string;
  theme: string;
  researchQuestion: string;
  domainSkills: string[];
  tendencies: string[];
  values: string[];
  literacies: string[];
  sdb: string[];
  concepts: string[];
  specialDays: string[];
  differentiation: {
    enrichment: string;
    support: string;
    family: string;
  };
}

export const OFFICIAL_MEB_UNITS: OfficialMEBUnit[] = [
  {
    id: "meb-unit-443",
    unitNo: 443,
    ageGroup: "36-48",
    title: "36-48 Ay Eylül Ayı Planı",
    type: "monthly",
    month: "Eylül",
    theme: "Okula Uyum, Ben ve Yeni Arkadaşlarım",
    researchQuestion: "Okulda neler keşfedebilirim ve yeni arkadaşlarımla nasıl oyun oynarım?",
    domainSkills: ["TAB1", "TAB2", "TAB3", "MAB1", "FBAB2", "SBAB1"],
    tendencies: ["E1.1", "E1.2", "E1.5", "E2.2", "E2.5", "E3.2", "E3.3"],
    values: ["D1", "D3", "D4", "D5", "D10", "D16", "D18"],
    literacies: ["OB1", "OB4"],
    sdb: ["SDB1.2", "SDB2.1"],
    concepts: ["Kırmızı", "Sarı", "Büyük-Küçük", "Az-Çok", "Ön-Arka", "Mutlu-Üzgün"],
    specialDays: ["İlköğretim Haftası (Eylül 3. Hafta)"],
    differentiation: {
      enrichment: "İleri düzey çocuklara okulun fiziki krokisini çizdirme ve arkadaşlarına tanıttırma görevi verilir.",
      support: "Ayrılık kaygısı yaşayan çocuklara nesne geçişi (evden getirdiği oyuncak) ve kademeli anne ayrılığı uygulanır.",
      family: "Haber mektubu ile uyum haftası evde pekiştirilir; velilere okul rutini hakkında bilgi notu gönderilir.",
    },
  },
  {
    id: "meb-unit-482",
    unitNo: 482,
    ageGroup: "36-48",
    title: "36-48 Ay Günlük Plan Örneği",
    type: "daily_sample",
    month: "Eylül",
    theme: "Renkli Toplar ve Ritmik Adımlar",
    researchQuestion: "Farklı renkteki topları nasıl gruplayabiliriz ve onlarla nasıl bir kule kurarız?",
    domainSkills: ["TAB1", "TAB3", "MAB1", "FBAB2"],
    tendencies: ["E1.1", "E2.5", "E3.3"],
    values: ["D4", "D16", "D18"],
    literacies: ["OB1", "OB4"],
    sdb: ["SDB1.2", "SDB2.1"],
    concepts: ["Kırmızı", "Büyük-Küçük", "Aynı-Farklı"],
    specialDays: [],
    differentiation: {
      enrichment: "Kendi top labirentini ahşap bloklarla inşa etme.",
      support: "Büyük tutuşlu dokulu toplarla nesne takibi yapma.",
      family: "Evde kırmızı renkli nesneleri bulma oyunu önerilir.",
    },
  },
  {
    id: "meb-unit-446",
    unitNo: 446,
    ageGroup: "48-60",
    title: "48-60 Ay Aralık Ayı Planı",
    type: "monthly",
    month: "Aralık",
    theme: "Kış Mevsimi, Paylaşma ve Ailem",
    researchQuestion: "Kışın havalar soğuduğunda hayvanlar ve bitkiler nasıl korunur?",
    domainSkills: ["TAB1", "TAB2", "TAB3", "MAB1", "FBAB2"],
    tendencies: ["E1.1", "E1.3", "E1.4", "E1.5", "E2.2", "E2.5", "E3.3"],
    values: ["D2", "D3", "D6", "D14", "D17", "D18", "D20"],
    literacies: ["OB1", "OB4"],
    sdb: ["SDB1.1", "SDB1.2"],
    concepts: ["Mavi", "Beyaz", "Soğuk-Sıcak", "Kalın-İnce", "1-5 Sayma", "Kare", "Üçgen"],
    specialDays: ["Tutum, Yatırım ve Türk Malları Haftası (12-18 Aralık)"],
    differentiation: {
      enrichment: "Kış uykusuna yatan hayvanların yaşam alanlarını gösteren 3 boyutlu diorama tasarlama.",
      support: "Eldiven ve bere takma öz bakım sürecinde basamaklandırılmış görsel kart desteği.",
      family: "Yerli malı haftasında ev yapımı kurutulmuş meyve ve fındık paylaşımı.",
    },
  },
  {
    id: "meb-unit-483",
    unitNo: 483,
    ageGroup: "48-60",
    title: "48-60 Ay Günlük Plan Örneği",
    type: "daily_sample",
    month: "Aralık",
    theme: "Kar Tanelerinin Dansı ve Ritmik Sayma",
    researchQuestion: "Neden gökyüzünden düşen hiçbir kar tanesi birbirine benzemez?",
    domainSkills: ["TAB1", "TAB3", "MAB1", "FBAB2"],
    tendencies: ["E1.1", "E3.3", "E3.2"],
    values: ["D17", "D18", "D20"],
    literacies: ["OB1", "OB4"],
    sdb: ["SDB1.2", "SDB2.1"],
    concepts: ["Beyaz", "Soğuk", "Geometrik Şekiller", "1-5 Sayma"],
    specialDays: [],
    differentiation: {
      enrichment: "Tuz ve buz deneyinde erime hızlarını kronometreyle kaydetme.",
      support: "Buz kalıplarına renkli parmak boyası karıştırarak duyusal keşif sağlama.",
      family: "Buzlukta su dondurup gözlem yapma önerisi.",
    },
  },
  {
    id: "meb-unit-481",
    unitNo: 481,
    ageGroup: "60-72",
    title: "60-72 Ay Mayıs Ayı Planı",
    type: "monthly",
    month: "Mayıs",
    theme: "Doğayı Koruma, Bilimsel Modeller ve Coğrafi Keşif",
    researchQuestion: "Okul bahçemizdeki ekosistemi korumak için nasıl bir bilimsel model ve harita tasarlayabiliriz?",
    domainSkills: ["TAB1", "TAB2", "TAB3", "MAB1", "MAB2", "MAB3", "FBAB9", "FBAB12", "SBAB9"],
    tendencies: ["E1.1", "E1.3", "E1.5", "E2.2", "E2.3", "E2.5", "E3.3", "E3.5", "E3.8"],
    values: ["D4", "D9", "D11", "D12", "D16"],
    literacies: ["OB1", "OB2", "OB4", "OB7", "OB8"],
    sdb: ["SDB1.1", "SDB1.2", "SDB2.1", "SDB2.2", "SDB2.3"],
    concepts: ["Sıra Sayısı", "Islak-Kuru", "Sıcak-Soğuk-Ilık", "Korku-Şaşkınlık", "Yarım-Tam", "Sağ-Sol", "Hızlı-Yavaş", "Canlı-Cansız"],
    specialDays: [
      "Trafik ve İlk Yardım Haftası (Mayıs 1. Hafta)",
      "Anneler Günü (Mayıs 2. Pazar)",
      "Engelliler Haftası (10-16 Mayıs)",
      "Müzeler Haftası (18-24 Mayıs)",
    ],
    differentiation: {
      enrichment: "Okul bahçesinde pusula ve basit kroki ile hazine avı tasarlayıp arkadaşlarına rehberlik etme.",
      support: "Harita yönlerini renkli zemin oklarıyla somutlaştırma ve akran desteği eşleştirmesi.",
      family: "Müzeler haftasında aileyle sanal veya yerel müze ziyareti ve aile bülteni etkinliği.",
    },
  },
  {
    id: "meb-unit-484",
    unitNo: 484,
    ageGroup: "60-72",
    title: "60-72 Ay Günlük Plan Örneği",
    type: "daily_sample",
    month: "Mayıs",
    theme: "Okul Bahçesi Doğa Dedektifleri ve Bilimsel Modelleme",
    researchQuestion: "Toprağın altındaki minik canlıların yaşam döngüsünü modelleyerek nasıl bir gözlem kutusu yaparız?",
    domainSkills: ["TAB1", "TAB3", "MAB1", "MAB2", "FBAB9", "FBAB12", "SBAB9"],
    tendencies: ["E1.1", "E2.2", "E2.3", "E3.3", "E3.8"],
    values: ["D5", "D9", "D16"],
    literacies: ["OB1", "OB4", "OB8"],
    sdb: ["SDB2.1", "SDB2.2", "SDB2.3"],
    concepts: ["Canlı-Cansız", "Islak-Kuru", "Yarım-Tam", "Sıra Sayısı"],
    specialDays: [],
    differentiation: {
      enrichment: "Gözlemlenen böcekleri dijital büyüteç kamerayla inceleyip sınıf panosuna fotoğrafını asma.",
      support: "Böcek kartlarını eşleştirerek dokunsal toprak kutusunda güvenle gözlem yapma.",
      family: "Doğadan toplanan yaprak ve dallarla evde geri dönüşüm heykeli yapma.",
    },
  },
];

// ─── 9 ÇEKİRDEK DERS KİTABI LİSTESİ ─────────────────────────────────────────
export const OFFICIAL_MEB_TEXTBOOKS = [
  { id: 9, title: "Okul Öncesi Eğitim 3 Yaş Çekirdek 1", age: "36-48", bookNo: 1, count: 56, coverGrad: "from-blue-600 to-indigo-800", icon: "🌱" },
  { id: 10, title: "Okul Öncesi Eğitim 3 Yaş Çekirdek 2", age: "36-48", bookNo: 2, count: 56, coverGrad: "from-sky-600 to-blue-900", icon: "🎈" },
  { id: 11, title: "Okul Öncesi Eğitim 4 Yaş Çekirdek 1", age: "48-60", bookNo: 1, count: 48, coverGrad: "from-teal-600 to-emerald-800", icon: "🌿" },
  { id: 12, title: "Okul Öncesi Eğitim 4 Yaş Çekirdek 2", age: "48-60", bookNo: 2, count: 52, coverGrad: "from-cyan-600 to-teal-900", icon: "🧩" },
  { id: 13, title: "Okul Öncesi Eğitim 4 Yaş Çekirdek 3", age: "48-60", bookNo: 3, count: 48, coverGrad: "from-emerald-600 to-green-900", icon: "🎨" },
  { id: 14, title: "Okul Öncesi Eğitim 5 Yaş Çekirdek 1", age: "60-72", bookNo: 1, count: 68, coverGrad: "from-rose-600 to-red-800", icon: "🚀" },
  { id: 15, title: "Okul Öncesi Eğitim 5 Yaş Çekirdek 2", age: "60-72", bookNo: 2, count: 68, coverGrad: "from-amber-600 to-orange-800", icon: "🔬" },
  { id: 16, title: "Okul Öncesi Eğitim 5 Yaş Çekirdek 3", age: "60-72", bookNo: 3, count: 66, coverGrad: "from-purple-600 to-indigo-900", icon: "🌟" },
  { id: 17, title: "Okul Öncesi Eğitim 5 Yaş Çekirdek 4", age: "60-72", bookNo: 4, count: 66, coverGrad: "from-red-700 to-rose-950", icon: "🏆" },
];

interface Props {
  onLoadUnitIntoWizard: (plan: DailyPlanRecord) => void;
  onFilterBookInCatalog: (ageGroup: AgeGroup, bookNo: number) => void;
}

export function MEBOfficialSkillsPortal({ onLoadUnitIntoWizard, onFilterBookInCatalog }: Props) {
  const [selectedAgeBand, setSelectedAgeBand] = useState<"all" | "36-48" | "48-60" | "60-72">("all");
  const [activeTooltip, setActiveTooltip] = useState<{
    catKey: string;
    ageKey: "36-48" | "48-60" | "60-72";
    catLabel: string;
    data: any;
  } | null>(null);

  const [inspectModalUnit, setInspectModalUnit] = useState<OfficialMEBUnit | null>(null);

  // Bir MEB Ünitesini tam DailyPlanRecord nesnesine dönüştürme motoru
  const convertUnitToDailyPlan = (unit: OfficialMEBUnit): DailyPlanRecord => {
    return createDailyPlan({
      date: new Date().toISOString().slice(0, 10),
      ageGroup: unit.ageGroup,
      topic: `${unit.title}: ${unit.theme}`,
      researchQuestion: unit.researchQuestion,
      domainCodes: unit.domainSkills,
      tendencyCodes: unit.tendencies,
      valueCodes: unit.values,
      literacyCodes: unit.literacies,
      sdbCodes: unit.sdb,
      conceptLabels: unit.concepts,
      specialDayCodes: unit.specialDays,
      enrichmentCustomNote: unit.differentiation.enrichment,
      supportCustomNote: unit.differentiation.support,
      familyNote: unit.differentiation.family,
    });
  };

  return (
    <div className="meb-portal-root">
      {/* ─── RESMÎ MEB APEX HERO BAŞLIK ŞERİDİ ─── */}
      <section className="meb-portal-hero">
        <div className="meb-portal-hero-badge">
          <span className="hero-flag">🇹🇷</span>
          <span>T.C. MİLLÎ EĞİTİM BAKANLIĞI · TALİM VE TERBİYE KURULU BAŞKANLIĞI</span>
        </div>
        <h2 className="meb-portal-hero-title">
          Türkiye Yüzyılı Maarif Modeli · Okul Öncesi Müfredat Analizi
        </h2>
        <p className="meb-portal-hero-desc">
          Resmî <strong>tymm.meb.gov.tr</strong> verileri ile entegre beceri dağılım grafiği, 3 yaş grubu ünite külliyatı ve 9 çekirdek ders kitabı havuzu.
        </p>

        {/* Resmî Kitap & Mevzuat Köprüleri */}
        <div className="meb-portal-hero-links">
          <a
            href="https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi"
            target="_blank"
            rel="noopener noreferrer"
            className="meb-hero-action-link"
          >
            🌐 MEB Resmî Sayfasını Aç
          </a>
          <a
            href="./assets/resources/ttkb-okul-oncesi-programi.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="meb-hero-action-link primary"
          >
            📑 Resmî TTKB Müfredat Kitabını Aç (221 Sayfa PDF)
          </a>
        </div>
      </section>

      {/* ─── 1. BÖLÜM: RESMÎ BECERİ DAĞILIMI (STACKED BAR CHART) ─── */}
      <section className="meb-card-surface" style={{ marginTop: "24px" }}>
        <div className="meb-section-header">
          <div className="meb-section-header-left">
            <span className="meb-section-icon">📊</span>
            <div>
              <h3 className="meb-section-title">Beceri Dağılımı (Resmî Stacked Bar Matrisi)</h3>
              <p className="meb-section-subtitle">
                Sınıf düzeylerine göre program bileşenlerinin yüzdesel dağılımı. Detay için çubukların üzerine gelin veya dokunun.
              </p>
            </div>
          </div>

          {/* Yaş Bandı Filtre Düğmeleri */}
          <div className="meb-legend-pills">
            <button
              type="button"
              className={`legend-pill navy ${selectedAgeBand === "36-48" ? "active" : ""}`}
              onClick={() => setSelectedAgeBand((p) => (p === "36-48" ? "all" : "36-48"))}
            >
              <span className="pill-dot navy" /> 36-48 Ay
            </button>
            <button
              type="button"
              className={`legend-pill teal ${selectedAgeBand === "48-60" ? "active" : ""}`}
              onClick={() => setSelectedAgeBand((p) => (p === "48-60" ? "all" : "48-60"))}
            >
              <span className="pill-dot teal" /> 48-60 Ay
            </button>
            <button
              type="button"
              className={`legend-pill coral ${selectedAgeBand === "60-72" ? "active" : ""}`}
              onClick={() => setSelectedAgeBand((p) => (p === "60-72" ? "all" : "60-72"))}
            >
              <span className="pill-dot coral" /> 60-72 Ay
            </button>
          </div>
        </div>

        {/* Grafik Çubukları Listesi */}
        <div className="meb-chart-bars-container">
          {MEB_SKILL_CATEGORIES.map((cat) => {
            const sum =
              cat.byAge["36-48"].count + cat.byAge["48-60"].count + cat.byAge["60-72"].count;
            const pct36 = Math.round((cat.byAge["36-48"].count / sum) * 100) || 33;
            const pct48 = Math.round((cat.byAge["48-60"].count / sum) * 100) || 33;
            const pct60 = 100 - pct36 - pct48;

            return (
              <div key={cat.key} className="meb-chart-row">
                <div className="meb-chart-label">
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-text">{cat.label}</span>
                  <span className="cat-total">({sum} adet)</span>
                </div>

                <div className="meb-stacked-bar-track">
                  {/* 36-48 Ay Dilimi */}
                  {(selectedAgeBand === "all" || selectedAgeBand === "36-48") && (
                    <div
                      className="meb-bar-segment segment-navy"
                      style={{ width: `${selectedAgeBand === "36-48" ? 100 : pct36}%` }}
                      onMouseEnter={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "36-48",
                          catLabel: cat.label,
                          data: cat.byAge["36-48"],
                        })
                      }
                      onClick={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "36-48",
                          catLabel: cat.label,
                          data: cat.byAge["36-48"],
                        })
                      }
                    >
                      <span className="segment-text">{cat.byAge["36-48"].count} ({pct36}%)</span>
                    </div>
                  )}

                  {/* 48-60 Ay Dilimi */}
                  {(selectedAgeBand === "all" || selectedAgeBand === "48-60") && (
                    <div
                      className="meb-bar-segment segment-teal"
                      style={{ width: `${selectedAgeBand === "48-60" ? 100 : pct48}%` }}
                      onMouseEnter={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "48-60",
                          catLabel: cat.label,
                          data: cat.byAge["48-60"],
                        })
                      }
                      onClick={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "48-60",
                          catLabel: cat.label,
                          data: cat.byAge["48-60"],
                        })
                      }
                    >
                      <span className="segment-text">{cat.byAge["48-60"].count} ({pct48}%)</span>
                    </div>
                  )}

                  {/* 60-72 Ay Dilimi */}
                  {(selectedAgeBand === "all" || selectedAgeBand === "60-72") && (
                    <div
                      className="meb-bar-segment segment-coral"
                      style={{ width: `${selectedAgeBand === "60-72" ? 100 : pct60}%` }}
                      onMouseEnter={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "60-72",
                          catLabel: cat.label,
                          data: cat.byAge["60-72"],
                        })
                      }
                      onClick={() =>
                        setActiveTooltip({
                          catKey: cat.key,
                          ageKey: "60-72",
                          catLabel: cat.label,
                          data: cat.byAge["60-72"],
                        })
                      }
                    >
                      <span className="segment-text">{cat.byAge["60-72"].count} ({pct60}%)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Canlı Koyu Cam (Dark Glass) Detay Kartı */}
        {activeTooltip && (
          <div className="meb-chart-tooltip-panel">
            <div className="tooltip-panel-header">
              <div className="tooltip-header-left">
                <span className={`badge-age-pill age-${activeTooltip.ageKey}`}>
                  {activeTooltip.ageKey} Ay
                </span>
                <strong>{activeTooltip.catLabel}</strong>
                <span className="tooltip-count-badge">
                  {activeTooltip.data.count} Adet · %{activeTooltip.data.percentage}
                </span>
              </div>
              <button
                type="button"
                className="tooltip-close-btn"
                onClick={() => setActiveTooltip(null)}
              >
                ✕ Kapat
              </button>
            </div>

            <div className="tooltip-plan-title">
              📋 <strong>{activeTooltip.data.planTitle}</strong> Kapsamı:
            </div>

            <div className="tooltip-items-chip-list">
              {activeTooltip.data.items.map((item: string, idx: number) => (
                <span key={idx} className="tooltip-chip-item">
                  ✓ {item}
                </span>
              ))}
              {activeTooltip.data.dailySampleItems?.map((item: string, idx: number) => (
                <span key={`ds-${idx}`} className="tooltip-chip-item highlight">
                  ⭐ Günlük Plan: {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── 2. BÖLÜM: 3 YAŞ GRUBU RESMÎ MEB ÜNİTELERİ VE PLANLARI ─── */}
      <section className="meb-card-surface" style={{ marginTop: "24px" }}>
        <div className="meb-section-header">
          <div className="meb-section-header-left">
            <span className="meb-section-icon">🏛️</span>
            <div>
              <h3 className="meb-section-title">MEB Resmî Örnek Üniteleri ve Plan Havuzu</h3>
              <p className="meb-section-subtitle">
                MEB tarafından resmen onaylanmış Eylül, Aralık ve Mayıs aylık ve günlük planları. 1 tıkla inceleyin veya günlük planlayıcıya aktarın.
              </p>
            </div>
          </div>
        </div>

        <div className="meb-units-grid">
          {OFFICIAL_MEB_UNITS.map((unit) => {
            const isMonthly = unit.type === "monthly";
            return (
              <div key={unit.id} className="meb-unit-card">
                <div className="meb-unit-card-top">
                  <span className={`meb-unit-badge age-${unit.ageGroup}`}>
                    {unit.ageGroup} Ay
                  </span>
                  <span className="meb-unit-type-badge">
                    {isMonthly ? "📅 Resmî Aylık Plan" : "⚡ Resmî Günlük Plan"}
                  </span>
                  <span className="meb-unit-no">Ünite #{unit.unitNo}</span>
                </div>

                <h4 className="meb-unit-title">{unit.title}</h4>
                <div className="meb-unit-theme">
                  <strong>Tema:</strong> {unit.theme}
                </div>
                <div className="meb-unit-q">
                  ❓ <em>"{unit.researchQuestion}"</em>
                </div>

                <div className="meb-unit-summary-chips">
                  <span>🎯 {unit.domainSkills.length} Alan Becerisi</span>
                  <span>💎 {unit.values.length} Değer</span>
                  <span>🧭 {unit.tendencies.length} Eğilim</span>
                  <span>🔤 {unit.concepts.length} Kavram</span>
                </div>

                <div className="meb-unit-actions">
                  <button
                    type="button"
                    className="meb-unit-btn secondary"
                    onClick={() => setInspectModalUnit(unit)}
                  >
                    🔍 Detay İncele
                  </button>
                  <button
                    type="button"
                    className="meb-unit-btn primary"
                    onClick={() => {
                      const plan = convertUnitToDailyPlan(unit);
                      onLoadUnitIntoWizard(plan);
                    }}
                  >
                    📋 1-Tıkla Planlayıcıya Aktar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 3. BÖLÜM: 9 ÇEKİRDEK DERS KİTABI VİTRİNİ ─── */}
      <section className="meb-card-surface" style={{ marginTop: "24px" }}>
        <div className="meb-section-header">
          <div className="meb-section-header-left">
            <span className="meb-section-icon">📚</span>
            <div>
              <h3 className="meb-section-title">MEB Okul Öncesi 9 Çekirdek Ders Kitabı Vitrini</h3>
              <p className="meb-section-subtitle">
                3, 4 ve 5 yaş gruplarına basılı dağıtılan resmî 9 çekirdek ders kitabı ve 528 gerçek etkinliği.
              </p>
            </div>
          </div>
        </div>

        <div className="meb-books-shelf">
          {OFFICIAL_MEB_TEXTBOOKS.map((b) => (
            <div key={b.id} className="meb-book-card">
              <div className={`meb-book-cover bg-gradient-${b.coverGrad}`}>
                <div className="meb-book-cover-inner">
                  <span className="meb-book-emblem">🇹🇷 MEB</span>
                  <span className="meb-book-icon">{b.icon}</span>
                  <strong className="meb-book-age">{b.age} Ay</strong>
                  <span className="meb-book-title">{b.title}</span>
                </div>
              </div>

              <div className="meb-book-meta">
                <span className="meb-book-count">🎯 <strong>{b.count}</strong> Etkinlik</span>
                <button
                  type="button"
                  className="meb-book-action-btn"
                  onClick={() => onFilterBookInCatalog(b.age as AgeGroup, b.bookNo)}
                >
                  📖 Etkinlikleri Gör →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ÜNİTE DETAY MODALİ ─── */}
      {inspectModalUnit && (
        <div className="sdpw-modal-overlay">
          <div className="sdpw-modal-dialog" style={{ maxWidth: "780px" }}>
            <div className="sdpw-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`meb-unit-badge age-${inspectModalUnit.ageGroup}`}>
                  {inspectModalUnit.ageGroup} Ay
                </span>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                  {inspectModalUnit.title}
                </h3>
              </div>
              <button
                type="button"
                className="sdpw-modal-close-btn"
                onClick={() => setInspectModalUnit(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="meb-detail-block">
                <strong>🎯 Tema & Araştırma Sorusu:</strong>
                <p style={{ margin: "4px 0 0", color: "#334155", fontSize: "0.95rem" }}>
                  <em>"{inspectModalUnit.researchQuestion}"</em>
                </p>
              </div>

              <div className="meb-detail-block">
                <strong>🏛️ Alan Becerileri (Kazanımlar):</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {inspectModalUnit.domainSkills.map((c) => (
                    <span key={c} className="sdpw-chip chip-blue sdpw-chip--selected">
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="meb-detail-block">
                <strong>💎 Değerler & Eğilimler:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {inspectModalUnit.values.map((v) => (
                    <span key={v} className="sdpw-chip chip-purple sdpw-chip--selected">
                      💎 {v}
                    </span>
                  ))}
                  {inspectModalUnit.tendencies.map((t) => (
                    <span key={t} className="sdpw-chip chip-amber sdpw-chip--selected">
                      🧭 {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="meb-detail-block">
                <strong>🔤 Kavramlar:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {inspectModalUnit.concepts.map((cp) => (
                    <span key={cp} className="sdpw-chip chip-emerald sdpw-chip--selected">
                      🔤 {cp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="meb-detail-block">
                <strong>⚡ Farklılaştırma Stratejileri:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "20px", fontSize: "0.88rem", color: "#475569" }}>
                  <li><strong>Zenginleştirme:</strong> {inspectModalUnit.differentiation.enrichment}</li>
                  <li><strong>Destekleme (BEP):</strong> {inspectModalUnit.differentiation.support}</li>
                  <li><strong>Aile Katılımı:</strong> {inspectModalUnit.differentiation.family}</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="of-btn-secondary"
                onClick={() => setInspectModalUnit(null)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="of-btn-primary"
                onClick={() => {
                  const plan = convertUnitToDailyPlan(inspectModalUnit);
                  setInspectModalUnit(null);
                  onLoadUnitIntoWizard(plan);
                }}
              >
                📋 Bu Planı Planlayıcıya Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
