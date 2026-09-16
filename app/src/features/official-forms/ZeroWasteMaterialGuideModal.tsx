import React, { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface WasteMaterialCategory {
  id: string;
  centerName: string;
  icon: string;
  materials: {
    name: string;
    pedagogicalUsage: string;
    source: string;
  }[];
}

const ZERO_WASTE_DATA: WasteMaterialCategory[] = [
  {
    id: "zw-art",
    centerName: "Sanat Merkezi (SNAB)",
    icon: "🎨",
    materials: [
      { name: "Karton Rulolar (Havlu/Tuvalet)", pedagogicalUsage: "Dürbün, hayvan figürleri, baskı silindiri, roket gövdesi.", source: "Evlerden günlük tüketim" },
      { name: "Yumurta Kolileri", pedagogicalUsage: "Tırtıl/timsah heykeli, renk paleti, tohum çimlendirme kabı.", source: "Mutfak atığı" },
      { name: "Kumaş ve Yün Kırpıntıları", pedagogicalUsage: "Doku kolajı, kukla saçları, duyusal parmak resimleri.", source: "Terzi / ev artıkları" },
      { name: "Plastik Su Şişesi Kapakları", pedagogicalUsage: "Renk eşleme, mozaik tablo, tekerlek yapımı.", source: "Geri dönüşüm kutusu" },
    ],
  },
  {
    id: "zw-block",
    centerName: "Blok ve İnşa Merkezi (MAB)",
    icon: "🧱",
    materials: [
      { name: "Ayakkabı ve Kargo Kolileri", pedagogicalUsage: "Tuğla bloklar, otopark binası, tünel ve köprü inşası.", source: "Alışveriş kutuları" },
      { name: "Ahşap Çamaşır Mandalları", pedagogicalUsage: "Köşe birleştiriciler, köprü ayakları, denge heykelleri.", source: "Ev malzemesi" },
      { name: "Yoğurt / Dondurma Kapları", pedagogicalUsage: "Kule tabanları, silindirik yapılar, iç içe geçmeli sütunlar.", source: "Mutfak ambalajı" },
    ],
  },
  {
    id: "zw-fen",
    centerName: "Fen ve Doğa Merkezi (FAB)",
    icon: "🔬",
    materials: [
      { name: "Kuru Yaprak, Dal ve Kozalak", pedagogicalUsage: "Doku inceleme, boyut sıralama, büyüteçle doğa dedektifliği.", source: "Okul bahçesi / park" },
      { name: "Ceviz ve Fındık Kabukları", pedagogicalUsage: "Yüzen-batan cisim deneyleri, mini yelkenli yapımı.", source: "Mutfak / mevsim meyvesi" },
      { name: "Şeffaf Plastik/Cam Kavanozlar", pedagogicalUsage: "Mini sera, katmanlı toprak deneyi, böcek gözlem fanusu.", source: "Ev konserve kavanozu" },
    ],
  },
  {
    id: "zw-music",
    centerName: "Müzik ve Ritim Merkezi (MZB)",
    icon: "🎵",
    materials: [
      { name: "Pirinç/Mercimek Dolu Küçük Şişeler", pedagogicalUsage: "Marakas yapımı, hafif-kuvvetli ses şiddeti keşfi.", source: "İçecek şişesi & bakliyat" },
      { name: "Konserve Kutuları (Kenarları Zımparalı)", pedagogicalUsage: "Farklı tonlarda bongo davul seti, ritim eşliği.", source: "Mutfak konservesi" },
      { name: "Gazoz Kapakları ve Tel", pedagogicalUsage: "Tef ve çıngırak yapımı, el-göz ritim koordinasyonu.", source: "Metal kapaklar" },
    ],
  },
  {
    id: "zw-math",
    centerName: "Matematik ve Sayma İstasyonu",
    icon: "🔢",
    materials: [
      { name: "Renkli Plastik Şişe Kapakları", pedagogicalUsage: "1'den 20'ye sayma pulları, örüntü dizileri, gruplama.", source: "Ev kapak toplama" },
      { name: "Ahşap Dondurma Çubukları", pedagogicalUsage: "Geometrik şekil oluşturma (üçgen, kare), onluk bağlama.", source: "Yaz tatili / hobi çubuğu" },
      { name: "10'lu Yumurta Kutusu", pedagogicalUsage: "Matematiksel onluk çerçeve (ten-frame) somutlaştırması.", source: "Koli ambalajı" },
    ],
  },
];

interface Props {
  onClose?: () => void;
}

export function ZeroWasteMaterialGuideModal({ onClose }: Props) {
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const displayedCategories = selectedCenter === "all"
    ? ZERO_WASTE_DATA
    : ZERO_WASTE_DATA.filter((c) => c.id === selectedCenter);

  const handleCopyWhatsAppList = () => {
    const text = `🌱 *SEVGİLİ VELİLERİMİZ - SIFIR ATIK MATERYAL ÇAĞRISI* ♻️
Okulumuzda Türkiye Yüzyılı Maarif Modeli kapsamında "Sıfır Atık & Doğal Materyal" (OB8) atölyeleri düzenliyoruz.

Evlerinizde çöpe atmayıp temizleyerek çocuklarımızla gönderebileceğiniz malzemeler:
📦 *Temiz karton rulolar (havlu/tuvalet kâğıdı)*
🥚 *Temiz boş yumurta kolileri*
🔘 *Renkli plastik su şişesi kapakları*
🧵 *Kumaş / yün kırpıntıları ve düğmeler*
🍂 *Parktan toplanmış kuru yaprak ve çam kozalakları*

Destekleriniz için teşekkür eder, doğaya duyarlı nesiller yetiştirmeyi dileriz! 🌸`;

    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback("✅ Veli WhatsApp malzeme listesi panoya kopyalandı!");
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const handlePrint = () => {
    printOfficialFormA4(`Sifir_Atik_Materyal_Pusulasi`);
  };

  const handleDownloadDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Sıfır Atık ve Doğal Materyal Pusulası</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; padding: 20px; line-height: 1.4; color: #1e293b; }
        h1 { font-size: 16pt; color: #15803d; text-align: center; }
        h2 { font-size: 12pt; color: #166534; border-bottom: 2px solid #86efac; padding-bottom: 4px; margin-top: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9.5pt; text-align: left; }
        th { background: #f0fdf4; color: #166534; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI · TTKB OKUL ÖNCESİ EĞİTİMİ</h1>
        <p style="text-align: center; color: #475569;"><strong>SIFIR ATIK & DOĞAL MATERYAL DÖNÜŞÜM REHBERİ (TTKB s. 97, 206 - OB8)</strong></p>

        ${ZERO_WASTE_DATA.map(c => `
          <h2>${c.centerName}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30%;">Atık / Doğal Malzeme</th>
                <th style="width: 50%;">Pedagojik Kullanım & Etkinlik Amacı</th>
                <th style="width: 20%;">Temin Kaynağı</th>
              </tr>
            </thead>
            <tbody>
              ${c.materials.map(m => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.pedagogicalUsage}</td>
                  <td>${m.source}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `).join("")}
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Sifir_Atik_Dogal_Materyal_Rehberi.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    let rowNo = 1;
    const rows = displayedCategories.flatMap((c) =>
      c.materials.map((m) => ({
        no: rowNo++,
        centerName: c.centerName,
        materialName: m.name,
        usage: m.pedagogicalUsage,
        source: m.source,
      }))
    );

    await exportOfficialTableToExcel({
      fileName: "MEB_Sifir_Atik_Dogal_Materyal_Rehberi",
      sheetName: "Sıfır Atık Materyaller",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — SIFIR ATIK VE DOĞAL PEDAGOJİK MATERYAL PUSULASI (OB8)",
      subtitle: "TTKB Okul Öncesi Eğitim Programı Sayfa 97 ve 206 Sürdürülebilirlik Okuryazarlığı Standartları",
      metadata: [
        { label: "Filtre", value: selectedCenter === "all" ? "Tüm Öğrenme Merkezleri" : displayedCategories[0]?.centerName || "" },
        { label: "Kapsanan Materyal", value: `${rows.length} Çeşit Atık/Doğal Malzeme` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenme Merkezi", key: "centerName", width: 25, align: "left" },
        { header: "Atık / Doğal Malzeme", key: "materialName", width: 30, align: "left" },
        { header: "Pedagojik Kullanım & Etkinlik Amacı", key: "usage", width: 55, align: "left" },
        { header: "Temin Kaynağı", key: "source", width: 25, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#15803d", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🌱</span>
            <span>Doğal ve Sıfır Atık Pedagojik Materyal Pusulası (OB8)</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Sayfa 97 ve 206 Sürdürülebilirlik Okuryazarlığı Standartları | Merkez bazlı atık malzeme dönüştürme matrisi
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {copyFeedback && (
            <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 700 }}>
              {copyFeedback}
            </span>
          )}
          <button
            onClick={handleDownloadExcel}
            style={{
              padding: "7px 12px",
              background: "#15803d",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            📊 Excel (.xlsx)
          </button>
          <button
            onClick={handleCopyWhatsAppList}
            style={{
              padding: "7px 12px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📱</span>
            <span>WhatsApp Veli Listesi Kopyala</span>
          </button>
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

      {/* MERKEZ FİLTRESİ */}
      <div className="print-hidden" style={{ display: "flex", gap: "8px", margin: "14px 0", overflowX: "auto", paddingBottom: "4px" }}>
        <button
          onClick={() => setSelectedCenter("all")}
          style={{
            padding: "5px 12px",
            borderRadius: "16px",
            border: selectedCenter === "all" ? "2px solid #16a34a" : "1px solid #cbd5e1",
            background: selectedCenter === "all" ? "#dcfce7" : "#ffffff",
            color: selectedCenter === "all" ? "#166534" : "#475569",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          🌟 Tüm Merkezler
        </button>
        {ZERO_WASTE_DATA.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCenter(cat.id)}
            style={{
              padding: "5px 12px",
              borderRadius: "16px",
              border: selectedCenter === cat.id ? "2px solid #16a34a" : "1px solid #cbd5e1",
              background: selectedCenter === cat.id ? "#dcfce7" : "#ffffff",
              color: selectedCenter === cat.id ? "#166534" : "#475569",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {cat.icon} {cat.centerName}
          </button>
        ))}
      </div>

      {/* CANLI A4 LİSTESİ */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #16a34a", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · SÜRDÜRÜLEBİLİRLİK OKURYAZARLIĞI (OB8)
          </div>
          <h1 style={{ margin: "4px 0 2px 0", fontSize: "1.35rem", color: "#166534", fontWeight: 800 }}>
            Öğrenme Merkezleri Doğal ve Sıfır Atık Materyal Dönüşüm Pusulası
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Düşük maliyetli, çevre dostu ve süreç odaklı eğitim materyalleri kataloğu
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {displayedCategories.map((cat) => (
            <div key={cat.id} style={{ border: "1px solid #bbf7d0", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ background: "#f0fdf4", padding: "8px 14px", borderBottom: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{cat.icon}</span>
                <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#15803d" }}>{cat.centerName}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 12px", width: "30%", textAlign: "left", color: "#334155" }}>Atık / Doğal Malzeme</th>
                    <th style={{ padding: "8px 12px", width: "50%", textAlign: "left", color: "#334155" }}>Pedagojik Kullanım & Amaç</th>
                    <th style={{ padding: "8px 12px", width: "20%", textAlign: "left", color: "#334155" }}>Temin Kaynağı</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.materials.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>{m.name}</td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{m.pedagogicalUsage}</td>
                      <td style={{ padding: "8px 12px", color: "#059669", fontWeight: 600 }}>{m.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
