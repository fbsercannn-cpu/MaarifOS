import React, { useState, useMemo } from "react";
import "./official-forms.css";

export interface SkillItem {
  id: string;
  domain: string;
  code: string;
  ageBand: "36-48" | "48-60" | "60-72";
  outcomeTitle: string;
  processComponents: string[];
}

const OFFICIAL_EK1_DATABASE: SkillItem[] = [
  // --- TÜRKÇE ---
  {
    id: "ek1-tr-36-1",
    domain: "Türkçe",
    code: "TADB.1",
    ageBand: "36-48",
    outcomeTitle: "Dinleyecekleri/izleyecekleri şiir, hikâye, animasyon materyallerini yönetebilme",
    processComponents: [
      "a. Kendisine sunulan seçenekler arasından dinleyecekleri materyalleri seçer.",
      "b. Seçilen materyalleri kısa süreli dinler/izler."
    ]
  },
  {
    id: "ek1-tr-36-2",
    domain: "Türkçe",
    code: "TADB.2",
    ageBand: "36-48",
    outcomeTitle: "Dinledikleri materyallerle ilgili yeni anlamlar oluşturabilme",
    processComponents: [
      "a. Yetişkin rehberliğinde materyallerdeki bilgiler ile günlük yaşamı arasında ilişki kurar.",
      "b. Görsellerden yararlanarak dinleyeceği hakkında basit tahminlerde bulunur."
    ]
  },
  {
    id: "ek1-tr-48-1",
    domain: "Türkçe",
    code: "TADB.1",
    ageBand: "48-60",
    outcomeTitle: "Dinleyecekleri/izleyecekleri şiir, hikâye, tiyatro materyallerini yönetebilme",
    processComponents: [
      "a. İlgi duyduğu dinleme/izleme materyallerini belirler ve seçer.",
      "b. Dinleme/izleme sürecinde dikkatini odaklayarak sürdürür."
    ]
  },
  {
    id: "ek1-tr-48-2",
    domain: "Türkçe",
    code: "TAKB.1",
    ageBand: "48-60",
    outcomeTitle: "Sözcük dağarcığını zenginleştirerek kendini akıcı ifade edebilme",
    processComponents: [
      "a. Yeni duyduğu kelimelerin anlamını sorar ve konuşmalarında kullanır.",
      "b. Olayları oluş sırasına göre 3-4 cümleyle anlatır."
    ]
  },
  {
    id: "ek1-tr-60-1",
    domain: "Türkçe",
    code: "TADB.3",
    ageBand: "60-72",
    outcomeTitle: "Dinledikleri/izledikleri materyalleri çözümleyebilme ve değerlendirebilme",
    processComponents: [
      "a. Dinlediklerindeki ana karakter, mekân ve olay örgüsünü ayrıntılı açıklar.",
      "b. Karakterlerin duygularını ve davranışlarının nedenlerini sorgular.",
      "c. Hikâyeye alternatif bir son kurgular."
    ]
  },
  {
    id: "ek1-tr-60-2",
    domain: "Türkçe",
    code: "TAEB.1",
    ageBand: "60-72",
    outcomeTitle: "Yazı farkındalığı ve fonolojik duyarlılık gösterebilme",
    processComponents: [
      "a. Yazının soldan sağa ve yukarıdan aşağıya okunduğunu gösterir.",
      "b. Sözcüklerin başlangıç ve bitiş seslerindeki benzerlikleri ayırt eder (kafiye/aliterasyon).",
      "c. Kendi ismindeki sesleri tanır ve sembolik olarak yazar."
    ]
  },

  // --- MATEMATİK ---
  {
    id: "ek1-mat-36-1",
    domain: "Matematik",
    code: "MAB.1",
    ageBand: "36-48",
    outcomeTitle: "1-5 arası nesneleri sayabilme ve azlık-çokluk algılayabilme",
    processComponents: [
      "a. 1'den 5'e kadar ritmik sayar.",
      "b. 1-3 arasındaki nesneleri birebir eşleme yaparak sayar.",
      "c. Az ve çok olan iki nesne grubunu ayırt eder."
    ]
  },
  {
    id: "ek1-mat-48-1",
    domain: "Matematik",
    code: "MAB.1",
    ageBand: "48-60",
    outcomeTitle: "1-10 arası nesneleri sayabilme ve miktarı sembolle eşleştirebilme",
    processComponents: [
      "a. 1'den 10'a kadar ileriye doğru ritmik sayar.",
      "b. Saydığı nesne grubunun son sayısının toplam miktarı gösterdiğini (kardinallik) kavrar.",
      "c. 1-5 arası rakamları tanır ve uygun nesne miktarıyla eşleştirir."
    ]
  },
  {
    id: "ek1-mat-60-1",
    domain: "Matematik",
    code: "MAB.2",
    ageBand: "60-72",
    outcomeTitle: "Matematiksel muhakeme, örüntü ve parça-bütün ilişkisi kurabilme",
    processComponents: [
      "a. 3 ve 4 öğeli ritmik örüntüler (A-B-B-C) kurar ve eksik bırakılan ögeyi tamamlar.",
      "b. Bir bütünü iki eşit yarım parçaya böler ve yarımı bütünle karşılaştırır.",
      "c. 1-20 arası ritmik sayar; 1-10 arası toplama ve çıkarma durumlarını somut nesnelerle çözümler."
    ]
  },
  {
    id: "ek1-mat-60-2",
    domain: "Matematik",
    code: "MAB.4",
    ageBand: "60-72",
    outcomeTitle: "Veri toplama, basit çetele ve grafik oluşturabilme",
    processComponents: [
      "a. Sınıf içi ilgi ve tercihlere ilişkin veri toplar (örn. en sevilen meyve).",
      "b. Verileri somut nesne grafiği üzerinde gösterir ve yorumlar."
    ]
  },

  // --- FEN ---
  {
    id: "ek1-fen-36-1",
    domain: "Fen",
    code: "FAB.1",
    ageBand: "36-48",
    outcomeTitle: "Çevresindeki canlı ve cansız varlıkları duyularıyla gözlemleyebilme",
    processComponents: [
      "a. Dokunarak, koklayarak ve dinleyerek doğal nesneleri inceler.",
      "b. Gözlemlediği nesnelerin belirgin özelliklerini (ıslak-kuru, sert-yumuşak) söyler."
    ]
  },
  {
    id: "ek1-fen-48-1",
    domain: "Fen",
    code: "FAB.3",
    ageBand: "48-60",
    outcomeTitle: "Gözlemlerine dayanarak doğa olayları hakkında tahminde bulunabilme",
    processComponents: [
      "a. Gökyüzündeki bulutlara bakarak hava durumu tahmini yapar.",
      "b. Suda batan ve yüzen cisimleri tahmin eder ve deneyle test eder."
    ]
  },
  {
    id: "ek1-fen-60-1",
    domain: "Fen",
    code: "FAB.5",
    ageBand: "60-72",
    outcomeTitle: "Bilimsel deney yapma, model oluşturma ve kanıt kullanabilme",
    processComponents: [
      "a. Basit bir deneyin (bitki çimlenmesi, su döngüsü) aşamalarını uygular.",
      "b. Deney sonuçlarını resmederek bir gözlem günlüğü tutar.",
      "c. 'Neden böyle oldu?' sorusuna gözlemlerine dayanarak bilimsel açıklama getirir."
    ]
  },

  // --- SOSYAL ---
  {
    id: "ek1-sos-36-1",
    domain: "Sosyal",
    code: "SAB.1",
    ageBand: "36-48",
    outcomeTitle: "Kendisini ve yakın çevresindeki kişileri tanıyabilme",
    processComponents: [
      "a. Adını, soyadını ve yaşını söyler.",
      "b. Aile bireylerini ve okuldaki öğretmen/arkadaşlarını tanıtır."
    ]
  },
  {
    id: "ek1-sos-48-1",
    domain: "Sosyal",
    code: "SAB.3",
    ageBand: "48-60",
    outcomeTitle: "Mekânsal düşünme ve sınıf içi kurallara uyum sağlayabilme",
    processComponents: [
      "a. Sınıftaki öğrenme merkezlerinin yerini ve kullanım amacını bilir.",
      "b. Ortak kullanım alanlarını düzenli ve temiz tutma kuralına uyar."
    ]
  },
  {
    id: "ek1-sos-60-1",
    domain: "Sosyal",
    code: "SAB.4",
    ageBand: "60-72",
    outcomeTitle: "Tarihsel ve kültürel değerleri, bayrağımızı ve Atatürk'ü kavrayabilme",
    processComponents: [
      "a. Türk bayrağının renk ve şekillerini, İstiklal Marşı dinleme kurallarını uygular.",
      "b. Atatürk'ün çocuklara armağan ettiği bayramları ve millet sevgisini açıklar.",
      "c. Farklı kültürlere, geleneklere ve yaşam biçimlerine saygı gösterir."
    ]
  },

  // --- HAREKET VE SAĞLIK ---
  {
    id: "ek1-har-48-1",
    domain: "Hareket ve Sağlık",
    code: "HAB.1",
    ageBand: "48-60",
    outcomeTitle: "Temel motor becerileri koordineli ve dengeli sergileyebilme",
    processComponents: [
      "a. Belirli bir mesafeyi tek ayak üzerinde veya sıçrayarak aşar.",
      "b. Nesneleri hedef alarak atar, tutar ve yuvarlar."
    ]
  },
  {
    id: "ek1-har-60-1",
    domain: "Hareket ve Sağlık",
    code: "HAB.2",
    ageBand: "60-72",
    outcomeTitle: "Kişisel bakım, temizlik, sağlıklı beslenme ve güvenlik kurallarını yönetebilme",
    processComponents: [
      "a. El yıkama, diş fırçalama ve tuvalet hijyenini bağımsız tamamlar.",
      "b. Sağlıklı ve zararlı yiyecekleri ayırt eder; dengeli beslenir.",
      "c. Okulda, evde ve trafikte acil durum ve güvenlik önlemlerini bilir."
    ]
  },

  // --- SANAT ---
  {
    id: "ek1-san-48-1",
    domain: "Sanat",
    code: "SNAB.1",
    ageBand: "48-60",
    outcomeTitle: "Görsel sanat tekniklerini kullanarak duygu ve düşüncelerini yansıtabilme",
    processComponents: [
      "a. Farklı boyama, yoğurma ve baskı tekniklerini dener.",
      "b. Yaptığı resmi hikâyeleştirerek açıklar."
    ]
  },
  {
    id: "ek1-san-60-1",
    domain: "Sanat",
    code: "SNAB.4",
    ageBand: "60-72",
    outcomeTitle: "Sanatsal kompozisyon oluşturma ve sanat eserlerini inceleyebilme",
    processComponents: [
      "a. Doğal ve atık malzemeleri birleştirerek 3 boyutlu heykel/kolaj üretir.",
      "b. Ünlü bir ressamın tablosundaki renk ve duygu temasını yorumlar."
    ]
  },

  // --- MÜZİK ---
  {
    id: "ek1-muz-48-1",
    domain: "Müzik",
    code: "MZB.1",
    ageBand: "48-60",
    outcomeTitle: "Ritim algılama, şarkı söyleme ve beden perküsyonu yapabilme",
    processComponents: [
      "a. Dinlediği müziğin ritmine uygun el çırpar veya adım atar.",
      "b. Basit çocuk şarkılarını grup halinde doğru tonda söyler."
    ]
  },
  {
    id: "ek1-muz-60-1",
    domain: "Müzik",
    code: "MZB.3",
    ageBand: "60-72",
    outcomeTitle: "Ritim çalgılarını çalabilme ve müzikle özgün hareketler tasarlayabilme",
    processComponents: [
      "a. Marakas, tef, üçgen zil veya ritim çubuklarını doğru vuruşlarla çalar.",
      "b. Müziğin hızına (hızlı-yavaş) ve şiddetine (kuvvetli-hafif) göre özgün dans figürleri sergiler."
    ]
  }
];

const DOMAINS = ["Tümü", "Türkçe", "Matematik", "Fen", "Sosyal", "Hareket ve Sağlık", "Sanat", "Müzik"];

interface Props {
  onClose?: () => void;
}

export function OfficialEK1SkillMatrixModal({ onClose }: Props) {
  const [selectedAge, setSelectedAge] = useState<"Tümü" | "36-48" | "48-60" | "60-72">("60-72");
  const [selectedDomain, setSelectedDomain] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const filteredSkills = useMemo(() => {
    return OFFICIAL_EK1_DATABASE.filter((item) => {
      if (selectedAge !== "Tümü" && item.ageBand !== selectedAge) return false;
      if (selectedDomain !== "Tümü" && item.domain !== selectedDomain) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesTitle = item.outcomeTitle.toLowerCase().includes(q);
        const matchesSub = item.processComponents.some((c) => c.toLowerCase().includes(q));
        if (!matchesCode && !matchesTitle && !matchesSub) return false;
      }
      return true;
    });
  }, [selectedAge, selectedDomain, searchQuery]);

  const handleCopySkill = (skill: SkillItem) => {
    const text = `[${skill.domain} - ${skill.code} (${skill.ageBand} Ay)]\nÖğrenme Çıktısı: ${skill.outcomeTitle}\nSüreç Bileşenleri:\n${skill.processComponents.join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(`✅ ${skill.code} kopyalandı!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>MEB TTKB EK-1 Alan Becerileri ve Süreç Bileşenleri</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; padding: 20px; }
        h1 { font-size: 16pt; color: #1e3a8a; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 10pt; vertical-align: top; }
        th { background: #f1f5f9; color: #1e293b; font-weight: bold; }
        .code { font-weight: bold; color: #0284c7; }
      </style>
      </head>
      <body>
        <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI · TTKB OKUL ÖNCESİ EĞİTİM PROGRAMI</h1>
        <h2 style="text-align: center; font-size: 13pt; color: #475569;">EK-1 ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ (s. 141–177)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Alan</th>
              <th style="width: 10%;">Yaş / Kod</th>
              <th style="width: 35%;">Öğrenme Çıktısı</th>
              <th style="width: 45%;">Süreç Bileşenleri</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSkills.map(s => `
              <tr>
                <td><strong>${s.domain}</strong></td>
                <td><span class="code">${s.code}</span><br/><small>${s.ageBand} Ay</small></td>
                <td>${s.outcomeTitle}</td>
                <td>${s.processComponents.map(c => `<div>${c}</div>`).join("")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TTKB_EK1_Alan_Becerileri_${selectedAge}_Ay.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📖</span>
            <span>EK-1 Alan Becerileri, Öğrenme Çıktıları ve Süreç Bileşenleri Sandığı</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Sayfa 141–177 Resmî Müfredat Bütüncül Matrisi | 36–48, 48–60 ve 60–72 Ay Tam Kapsam
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {copyFeedback && (
            <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 700 }}>
              {copyFeedback}
            </span>
          )}
          <button
            onClick={handleDownloadDoc}
            style={{
              padding: "7px 12px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            💾 Word (.doc) İndir
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "7px 12px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            🖨️ A4 Yazdır
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "7px 12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Kapat
            </button>
          )}
        </div>
      </div>

      {/* FİLTRE VE ARAMA KONSOLU */}
      <div className="print-hidden" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", margin: "14px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* YAŞ GRUBU VE ALAN BUTONLARI */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Yaş Bandı:</span>
            {(["Tümü", "36-48", "48-60", "60-72"] as const).map((age) => (
              <button
                key={age}
                onClick={() => setSelectedAge(age)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "14px",
                  border: selectedAge === age ? "2px solid #1e40af" : "1px solid #cbd5e1",
                  background: selectedAge === age ? "#dbeafe" : "#ffffff",
                  color: selectedAge === age ? "#1e3a8a" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                {age === "Tümü" ? "Tüm Yaşlar" : `${age} Ay`}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="🔍 Kazanım, süreç bileşeni veya kod ara (örn: MAB.2, ritmik, hikâye)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        {/* ALAN ÇİPLERİ */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {DOMAINS.map((domain) => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                border: selectedDomain === domain ? "1.5px solid #0284c7" : "1px solid #e2e8f0",
                background: selectedDomain === domain ? "#e0f2fe" : "#ffffff",
                color: selectedDomain === domain ? "#0369a1" : "#64748b",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* CANLI KAZANIM LİSTESİ VE A4 TABLOSU */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e3a8a" }}>
              T.C. MEB TTKB EK-1 KAZANIM VE SÜREÇ BİLEŞENLERİ LİSTESİ
            </span>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Filtrelenen Sonuç: <strong>{filteredSkills.length} Kazanım</strong> ({selectedAge === "Tümü" ? "Tüm Yaşlar" : `${selectedAge} Ay`} · {selectedDomain})
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.84rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
              <th style={{ padding: "10px 14px", width: "12%", color: "#334155" }}>Alan</th>
              <th style={{ padding: "10px 14px", width: "12%", color: "#334155" }}>Kod / Yaş</th>
              <th style={{ padding: "10px 14px", width: "36%", color: "#334155" }}>Öğrenme Çıktısı</th>
              <th style={{ padding: "10px 14px", width: "40%", color: "#334155" }}>Süreç Bileşenleri</th>
            </tr>
          </thead>
          <tbody>
            {filteredSkills.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Arama kriterlerinize uygun kazanım bulunamadı.
                </td>
              </tr>
            ) : (
              filteredSkills.map((skill) => (
                <tr
                  key={skill.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  className="hover:bg-slate-50"
                >
                  <td style={{ padding: "10px 14px", verticalAlign: "top", fontWeight: 700, color: "#1e293b" }}>
                    {skill.domain}
                  </td>
                  <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontWeight: 800, color: "#0284c7" }}>{skill.code}</span>
                      <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "1px 6px", borderRadius: "10px", display: "inline-block", width: "fit-content" }}>
                        {skill.ageBand} Ay
                      </span>
                      <button
                        className="print-hidden"
                        onClick={() => handleCopySkill(skill)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6366f1",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                          marginTop: "2px",
                        }}
                      >
                        📋 Kopyala
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", verticalAlign: "top", color: "#334155", fontWeight: 600 }}>
                    {skill.outcomeTitle}
                  </td>
                  <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                    <ul style={{ margin: 0, paddingLeft: "16px", color: "#475569", lineHeight: 1.45, fontSize: "0.8rem" }}>
                      {skill.processComponents.map((comp, idx) => (
                        <li key={idx} style={{ marginBottom: "3px" }}>
                          {comp}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
