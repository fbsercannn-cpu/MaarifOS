import React, { useState, useEffect, useMemo } from "react";
import { generateCurriculumMatrix } from "./planToChecklistSync.ts";
import "./official-forms.css";

export const MONTHS = [
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
] as const;

export type MonthKey = (typeof MONTHS)[number];

export interface ChecklistItem {
  id: string;
  category: "alan" | "egilim" | "sdb" | "deger" | "okuryazarlik" | "kavram";
  subCategory: string;
  code: string;
  description: string;
}

export const EK15_ITEMS: ChecklistItem[] = [
  // MATEMATİK
  { id: "mab-1", category: "alan", subCategory: "Matematik", code: "MAB.1", description: "Sayıları farklı durumlarda doğru kullanabilme" },
  { id: "mab-2", category: "alan", subCategory: "Matematik", code: "MAB.2", description: "Parça-bütün özelliklerini çözümleyebilme" },
  { id: "mab-3", category: "alan", subCategory: "Matematik", code: "MAB.3", description: "Matematikle ilgili durumları yorumlayabilme" },
  { id: "mab-4", category: "alan", subCategory: "Matematik", code: "MAB.4", description: "Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme" },
  { id: "mab-5", category: "alan", subCategory: "Matematik", code: "MAB.5", description: "Matematikle ilgili problemleri çözümleyebilme" },
  { id: "mab-6", category: "alan", subCategory: "Matematik", code: "MAB.6", description: "Matematikle ilgili problemleri yorumlayabilme" },
  { id: "mab-7", category: "alan", subCategory: "Matematik", code: "MAB.7", description: "Problemlere çözüm yolları geliştirebilme" },
  { id: "mab-8", category: "alan", subCategory: "Matematik", code: "MAB.8", description: "Problem çözme deneyimlerini yansıtabilme" },
  { id: "mab-9", category: "alan", subCategory: "Matematik", code: "MAB.9", description: "Temsillerden yararlanabilme" },
  { id: "mab-10", category: "alan", subCategory: "Matematik", code: "MAB.10", description: "Matematiksel temsilleri değerlendirebilme" },
  { id: "mab-11", category: "alan", subCategory: "Matematik", code: "MAB.11", description: "Veriyle çalışabilme" },
  { id: "mab-12", category: "alan", subCategory: "Matematik", code: "MAB.12", description: "Bulguya ulaşabilme" },
  { id: "mab-13", category: "alan", subCategory: "Matematik", code: "MAB.13", description: "Bulguyu yorumlayabilme" },

  // FEN
  { id: "fab-1", category: "alan", subCategory: "Fen", code: "FAB.1", description: "Fen olaylarına yönelik bilimsel gözlem yapabilme" },
  { id: "fab-2", category: "alan", subCategory: "Fen", code: "FAB.2", description: "Nesne ve olayları benzerlik/farklılıklarına göre sınıflandırabilme" },
  { id: "fab-3", category: "alan", subCategory: "Fen", code: "FAB.3", description: "Bilimsel gözleme dayalı tahminlerde bulunabilme" },
  { id: "fab-4", category: "alan", subCategory: "Fen", code: "FAB.4", description: "Bilimsel veriye dayalı tahminlerde bulunabilme" },
  { id: "fab-7", category: "alan", subCategory: "Fen", code: "FAB.7", description: "Merak ettiği konular hakkında deneyler yapabilme" },
  { id: "fab-8", category: "alan", subCategory: "Fen", code: "FAB.8", description: "Gözlemlerine dayalı basit bilimsel çıkarımlar yapabilme" },
  { id: "fab-9", category: "alan", subCategory: "Fen", code: "FAB.9", description: "Basit bilimsel modellerden faydalanabilme" },
  { id: "fab-12", category: "alan", subCategory: "Fen", code: "FAB.12", description: "Bilimsel olayları açıklamak için kanıtlar kullanabilme" },
  { id: "fab-13", category: "alan", subCategory: "Fen", code: "FAB.13", description: "Fen olaylarına yönelik bilimsel sorgulama yapabilme" },

  // SOSYAL
  { id: "sab-1", category: "alan", subCategory: "Sosyal", code: "SAB.1", description: "Zaman içerisinde değişen ve benzer özellikleri karşılaştırabilme" },
  { id: "sab-2", category: "alan", subCategory: "Sosyal", code: "SAB.2", description: "Olay ve kavramları kronolojik olarak sıralayabilme" },
  { id: "sab-3", category: "alan", subCategory: "Sosyal", code: "SAB.3", description: "Zamanla geçirilen dönüşümleri karşılaştırarak ifade edebilme" },
  { id: "sab-4", category: "alan", subCategory: "Sosyal", code: "SAB.4", description: "Ülkemizle ilgili merak ettiği konulara yönelik sorular sorabilme" },
  { id: "sab-5", category: "alan", subCategory: "Sosyal", code: "SAB.5", description: "Ülkemizle ilgili merak ettiği kaynakları inceleyebilme" },
  { id: "sab-6", category: "alan", subCategory: "Sosyal", code: "SAB.6", description: "Mekânın coğrafi koşullarını tanımlayabilme" },
  { id: "sab-7", category: "alan", subCategory: "Sosyal", code: "SAB.7", description: "Coğrafi olay ve mekânlara yönelik sorular sorabilme" },
  { id: "sab-8", category: "alan", subCategory: "Sosyal", code: "SAB.8", description: "Coğrafi gözlem ve saha çalışması hazırlığı yapabilme" },
  { id: "sab-9", category: "alan", subCategory: "Sosyal", code: "SAB.9", description: "Okul dışı çalışmaları çevreye duyarlı uygulayabilme" },
  { id: "sab-10", category: "alan", subCategory: "Sosyal", code: "SAB.10", description: "Saha çalışma sonuçlarını sözel/görsel sunabilme" },
  { id: "sab-11", category: "alan", subCategory: "Sosyal", code: "SAB.11", description: "Basit krokiyi / haritayı okuyabilme" },
  { id: "sab-12", category: "alan", subCategory: "Sosyal", code: "SAB.12", description: "Konum belirlemek üzere krokiyi çözümleyebilme" },
  { id: "sab-13", category: "alan", subCategory: "Sosyal", code: "SAB.13", description: "Kendi krokisini oluşturabilme" },
  { id: "sab-14", category: "alan", subCategory: "Sosyal", code: "SAB.14", description: "Toplumsal yaşama yönelik nesne ve olayları çözümleyebilme" },
  { id: "sab-15", category: "alan", subCategory: "Sosyal", code: "SAB.15", description: "Toplumsal yaşama yönelik konuları sorgulayabilme" },

  // HAREKET VE SAĞLIK
  { id: "hsab-1", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.1", description: "Temel hareket becerilerini sergileyebilme" },
  { id: "hsab-2", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.2", description: "Farklı özellikteki nesneleri kullanabilme" },
  { id: "hsab-3", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.3", description: "Müzik ve ritim eşliğinde hareket örüntüleri sergileyebilme" },
  { id: "hsab-4", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.4", description: "Beden farkındalığına dayalı doğru duruş sergileyebilme" },
  { id: "hsab-5", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.5", description: "Kişisel ve genel alanın farkında olarak hareket edebilme" },
  { id: "hsab-6", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.6", description: "Yeterli ve dengeli beslenebilme" },
  { id: "hsab-7", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.7", description: "İç ve dış mekânda fiziksel aktivitelere katılabilme" },
  { id: "hsab-8", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.8", description: "Temel kişisel hijyen ve ortam düzeni farkındalığı" },
  { id: "hsab-9", category: "alan", subCategory: "Hareket ve Sağlık", code: "HSAB.9", description: "Kaza ve tehlikeli durumlarda güvenli davranış sergileyebilme" },

  // SANAT
  { id: "snab-1", category: "alan", subCategory: "Sanat", code: "SNAB.1", description: "Sanat türlerini tanıyabilme" },
  { id: "snab-2", category: "alan", subCategory: "Sanat", code: "SNAB.2", description: "Sanat eserini eleştirebilme" },
  { id: "snab-3", category: "alan", subCategory: "Sanat", code: "SNAB.3", description: "Sanatın önemini fark edebilme" },
  { id: "snab-4", category: "alan", subCategory: "Sanat", code: "SNAB.4", description: "Sanat etkinliği uygulayabilme" },

  // MÜZİK
  { id: "mab-mus-1", category: "alan", subCategory: "Müzik", code: "MDB.1-3", description: "Çeşitli müzik eserlerini dinleyebilme ve temel özellikleri ifade edebilme" },
  { id: "mab-mus-2", category: "alan", subCategory: "Müzik", code: "MSB.1-2", description: "Şarkılara kendi sesiyle eşlik edebilme ve söyleme becerileri" },
  { id: "mab-mus-3", category: "alan", subCategory: "Müzik", code: "MÇB.1-2", description: "Duyduğu sesleri çalabilme ve çalgıları kullanabilme" },
  { id: "mab-mus-4", category: "alan", subCategory: "Müzik", code: "MHB.1-2", description: "Müzik eserleriyle hareket ve dans edebilme" },

  // TÜRKÇE
  { id: "tab-1", category: "alan", subCategory: "Türkçe", code: "TAB.1", description: "Konuşmalarında nezaket sözcüklerini kullanabilme" },
  { id: "tab-2", category: "alan", subCategory: "Türkçe", code: "TAB.2", description: "Dinlediği hikâyenin ana fikrini ve karakterlerini açıklayabilme" },
  { id: "tab-3", category: "alan", subCategory: "Türkçe", code: "TAB.3", description: "Söz dağarcığını zenginleştirerek kendini ifade edebilme" },

  // EĞİLİMLER
  { id: "e1", category: "egilim", subCategory: "Benlik Eğilimleri", code: "E1.1-1.5", description: "Merak, Bağımsızlık, Azim, Kendine İnanma ve Kendine Güvenme" },
  { id: "e2", category: "egilim", subCategory: "Sosyal Eğilimler", code: "E2.1-2.5", description: "Empati, Sorumluluk, Girişkenlik, Güven, Oyunseverlik" },
  { id: "e3", category: "egilim", subCategory: "Entelektüel Eğilimler", code: "E3.2-3.8", description: "Odaklanma, Yaratıcılık, Açık Fikirlilik, Analitiklik, Soru Sorma" },

  // SOSYAL-DUYGUSAL (SDB)
  { id: "sdb-1", category: "sdb", subCategory: "Benlik Becerileri", code: "SDB1.1-1.2", description: "Kendini Tanıma (Öz Farkındalık) ve Kendini Düzenleme (Öz Düzenleme)" },
  { id: "sdb-2", category: "sdb", subCategory: "Sosyal Yaşam Becerileri", code: "SDB2.1-2.3", description: "İletişim, İş Birliği, Sosyal Farkındalık" },
  { id: "sdb-3", category: "sdb", subCategory: "Ortak / Birleşik", code: "SDB3.1, 3.3", description: "Uyum ve Sorumlu Karar Verme" },

  // DEĞERLER (D1 - D20)
  { id: "d-1", category: "deger", subCategory: "Erdem-Değer", code: "D1-D3", description: "Adalet, Aile Bütünlüğü, Çalışkanlık" },
  { id: "d-2", category: "deger", subCategory: "Erdem-Değer", code: "D4-D7", description: "Dostluk, Duyarlılık, Dürüstlük, Estetik" },
  { id: "d-3", category: "deger", subCategory: "Erdem-Değer", code: "D8-D11", description: "Mahremiyet, Merhamet, Mütevazılık, Özgürlük" },
  { id: "d-4", category: "deger", subCategory: "Erdem-Değer", code: "D12-D15", description: "Sabır, Sağlıklı Yaşam, Saygı, Sevgi" },
  { id: "d-5", category: "deger", subCategory: "Erdem-Değer", code: "D16-D20", description: "Sorumluluk, Tasarruf, Temizlik, Vatanseverlik, Yardımseverlik" },

  // OKURYAZARLIK BECERİLERİ
  { id: "ob-1", category: "okuryazarlik", subCategory: "Okuryazarlık", code: "OB1-OB4", description: "Bilgi, Dijital, Finansal ve Görsel Okuryazarlık" },
  { id: "ob-2", category: "okuryazarlik", subCategory: "Okuryazarlık", code: "OB5-OB8", description: "Kültür, Vatandaşlık, Veri ve Sürdürülebilirlik Okuryazarlığı" },

  // KAVRAMLAR
  { id: "k-renk", category: "kavram", subCategory: "Kavramlar", code: "Renk", description: "Ana ve ara renkler, açık-koyu tonlar" },
  { id: "k-sekil", category: "kavram", subCategory: "Kavramlar", code: "Geometrik Şekil", description: "Daire, Üçgen, Kare, Dikdörtgen, Çember, Kenar, Köşe" },
  { id: "k-boyut", category: "kavram", subCategory: "Kavramlar", code: "Boyut", description: "Büyük-Orta-Küçük, İnce-Kalın, Uzun-Kısa, Geniş-Dar" },
  { id: "k-miktar", category: "kavram", subCategory: "Kavramlar", code: "Miktar", description: "Az-Çok, Ağır-Hafif, Boş-Dolu, Tek-Çift, Yarım-Tam, Eşit, Parça-Bütün" },
  { id: "k-mekan", category: "kavram", subCategory: "Kavramlar", code: "Mekânda Konum", description: "Ön-Arka, Yukarı-Aşağı, İleri-Geri, Sağ-Sol, İç-Dış, Altında-Üstünde" },
  { id: "k-sayi", category: "kavram", subCategory: "Kavramlar", code: "Sayı / Sayma", description: "1-20 Arası Sayılar, Sıfır, İlk-Orta-Son, Sıra Sayısı" },
  { id: "k-zaman", category: "kavram", subCategory: "Kavramlar", code: "Zaman", description: "Gece-Gündüz, Sabah-Öğle-Akşam, Dün-Bugün-Yarın, Önce-Şimdi-Sonra" },
  { id: "k-duyu", category: "kavram", subCategory: "Kavramlar", code: "Duyu & Duygu", description: "Tatlar, dokular, sıcak-soğuk; Mutluluk, Üzüntü, Öfke, Korku vb." },
  { id: "k-zit", category: "kavram", subCategory: "Kavramlar", code: "Zıt Kavramlar", description: "Aynı-Farklı, Hızlı-Yavaş, Canlı-Cansız, Düzenli-Dağınık, Kolay-Zor" },
];

interface Props {
  onClose?: () => void;
}

export function OfficialMonthlyPlanChecklistForm({ onClose }: Props) {
  const storageKey = "maarif_ek15_matrix_60_72";

  const [schoolName, setSchoolName] = useState("Atatürk Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [ageBand, setAgeBand] = useState<"36-48" | "48-60" | "60-72">("60-72");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default mock data for realistic presentation
    const initial: Record<string, Record<string, boolean>> = {};
    EK15_ITEMS.forEach((item, index) => {
      initial[item.id] = {
        Eylül: index % 3 === 0,
        Ekim: index % 2 === 0,
        Kasım: index % 4 === 0,
      };
    });
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(matrix));
    } catch {
      // ignore
    }
  }, [matrix]);

  const toggleCell = (itemId: string, month: MonthKey) => {
    setMatrix((prev) => {
      const itemRow = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...itemRow,
          [month]: !itemRow[month],
        },
      };
    });
  };

  const filteredItems = useMemo(() => {
    return EK15_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subCategory.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const tableRows = EK15_ITEMS.map((item) => {
      const monthCols = MONTHS.map((m) => {
        const checked = matrix[item.id]?.[m];
        return `<td style="text-align:center; font-weight:bold; color:${checked ? '#059669' : '#ccc'};">${checked ? 'X' : ''}</td>`;
      }).join("");

      return `<tr>
        <td><b>${item.subCategory}</b><br><small>${item.code}</small></td>
        <td>${item.description}</td>
        ${monthCols}
      </tr>`;
    }).join("");

    const monthHeaders = MONTHS.map((m) => `<th style="width:50px; text-align:center;">${m}</th>`).join("");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-15 AYLIK EĞİTİM PLANI KONTROL ÇİZELGESİ</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 8pt; color: #111; padding: 10px; }
  h2 { text-align: center; font-size: 11pt; color: #0284c7; margin-bottom: 4px; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; }
  .meta-table td { padding: 4px; border: 1px solid #999; }
  .main-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  .main-table th, .main-table td { border: 1px solid #777; padding: 3px 4px; vertical-align: middle; }
  .main-table th { background-color: #e0f2fe; color: #0369a1; }
  @page { size: landscape; margin: 8mm; }
</style>
</head>
<body>
  <h2>EK-15 AYLIK EĞİTİM PLANI KONTROL ÇİZELGESİ (60-72 Ay)</h2>
  <table class="meta-table">
    <tr><td><b>Okul Adı:</b> ${schoolName}</td><td><b>Öğretmen:</b> ${teacherName}</td><td><b>Eğitim Yılı:</b> ${academicYear}</td><td><b>Yaş Grubu:</b> 60-72 Ay</td></tr>
  </table>
  <table class="main-table">
    <thead>
      <tr>
        <th style="width:140px;">Bileşen / Kod</th>
        <th>Açıklama</th>
        ${monthHeaders}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff" + htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-15_Aylik_Plan_Kontrol_Cizelgesi_${academicYear}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable" style={{ maxWidth: "1200px" }}>
        {/* Actions Bar */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-15 Aylık Eğitim Planı Kontrol Çizelgesi (TTKB Sayfa 207–220)</strong>
            <small>60-72 Ay · Yıllık Alan Becerileri, Eğilimler ve Kavram Matrisi</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn"
              style={{ background: "#0284c7", color: "#fff" }}
              onClick={() => {
                if (window.confirm("Kayıtlı resmî MEB müfredat planına göre tüm aylar otomatik işaretlensin mi?")) {
                  setMatrix(generateCurriculumMatrix(EK15_ITEMS));
                }
              }}
              title="Müfredat kazanımlarını aylara göre otomatik doldur"
            >
              🔄 Plandan Otomatik Doldur
            </button>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #cbd5e1" }}
              onClick={() => {
                if (window.confirm("Tüm işaretlemeler temizlensin mi?")) {
                  const empty: Record<string, Record<string, boolean>> = {};
                  EK15_ITEMS.forEach((i) => {
                    empty[i.id] = {};
                  });
                  setMatrix(empty);
                }
              }}
            >
              🗑️ Temizle
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📥 Word İndir (.doc)
            </button>
            {onClose ? (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            ) : null}
          </div>
        </div>

        {/* Age Selector Bar (No Print) */}
        <div className="of-card no-print" style={{ marginBottom: "10px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#1e3a8a" }}>Müfredat Yaş Grubu:</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className={`of-chip ${ageBand === "36-48" ? "is-selected" : ""}`}
                  onClick={() => setAgeBand("36-48")}
                  style={{ fontSize: "0.8rem", padding: "3px 10px" }}
                >
                  36-48 Ay
                </button>
                <button
                  type="button"
                  className={`of-chip ${ageBand === "48-60" ? "is-selected" : ""}`}
                  onClick={() => setAgeBand("48-60")}
                  style={{ fontSize: "0.8rem", padding: "3px 10px" }}
                >
                  48-60 Ay
                </button>
                <button
                  type="button"
                  className={`of-chip ${ageBand === "60-72" ? "is-selected" : ""}`}
                  onClick={() => setAgeBand("60-72")}
                  style={{ fontSize: "0.8rem", padding: "3px 10px" }}
                >
                  60-72 Ay (Resmî EK-15)
                </button>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>TTKB Sayfa 207–220</span>
          </div>
        </div>

        {/* Printable Header */}
        <header className="official-form-header">
          <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 style={{ fontSize: "1.05rem" }}>EK-15 AYLIK EĞİTİM PLANI KONTROL ÇİZELGESİ ({ageBand} AY)</h1>
          <p className="official-form-subtext">Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı Yıllık Kazanım İzleme Formu</p>
        </header>

        {/* Meta inputs */}
        <div className="of-grid-4" style={{ marginBottom: "12px" }}>
          <div className="of-field">
            <label>Okul Adı:</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Öğretmen Adı:</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Eğitim Yılı:</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Yaş Grubu:</label>
            <input type="text" value={`${ageBand} Ay`} readOnly style={{ background: "#f1f5f9", fontWeight: "bold" }} />
          </div>
        </div>

        {/* Filter Controls (No Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "Tümü (60)" },
              { id: "alan", label: "Alan Becerileri" },
              { id: "egilim", label: "Eğilimler" },
              { id: "sdb", label: "Sosyal-Duygusal" },
              { id: "deger", label: "Değerler" },
              { id: "okuryazarlik", label: "Okuryazarlık" },
              { id: "kavram", label: "Kavramlar" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "6px",
                  border: activeCategory === cat.id ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: activeCategory === cat.id ? "#0284c7" : "#ffffff",
                  color: activeCategory === cat.id ? "#ffffff" : "#334155",
                  fontWeight: activeCategory === cat.id ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ minWidth: "180px" }}>
            <input
              type="text"
              placeholder="🔍 Ara (Kod veya açıklama)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: "0.8rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="of-table" style={{ fontSize: "0.78rem", width: "100%", minWidth: "850px" }}>
            <thead>
              <tr style={{ background: "#e0f2fe", color: "#0369a1" }}>
                <th style={{ width: "130px", padding: "6px 8px" }}>Bileşen / Kod</th>
                <th style={{ padding: "6px 8px" }}>Öğrenme Çıktısı / Açıklama</th>
                {MONTHS.map((m) => (
                  <th key={m} style={{ width: "45px", textAlign: "center", padding: "6px 2px", fontSize: "0.72rem" }}>
                    {m.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ breakInside: "avoid" }}>
                  <td style={{ padding: "5px 6px", verticalAlign: "top" }}>
                    <strong style={{ color: "#0369a1", fontSize: "0.75rem" }}>{item.code}</strong>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{item.subCategory}</div>
                  </td>
                  <td style={{ padding: "5px 6px", verticalAlign: "middle" }}>{item.description}</td>
                  {MONTHS.map((m) => {
                    const isChecked = Boolean(matrix[item.id]?.[m]);
                    return (
                      <td
                        key={m}
                        onClick={() => toggleCell(item.id, m)}
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "2px",
                          cursor: "pointer",
                          background: isChecked ? "#f0fdf4" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "20px",
                            height: "20px",
                            lineHeight: "18px",
                            borderRadius: "4px",
                            border: isChecked ? "1.5px solid #059669" : "1px solid #cbd5e1",
                            background: isChecked ? "#059669" : "#ffffff",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                          }}
                        >
                          {isChecked ? "✓" : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: "12px", fontSize: "0.72rem", color: "#64748b" }}>
          * Millî Eğitim Bakanlığı Talim ve Terbiye Kurulu Başkanlığı Okul Öncesi Eğitim Programı EK-15 standardıdır. İlgili ayda ele alınan bileşenleri kutucuklara tıklayarak işaretleyiniz.
        </div>
      </div>
    </div>
  );
}
