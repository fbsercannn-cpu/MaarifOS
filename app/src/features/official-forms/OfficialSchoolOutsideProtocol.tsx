import React, { useState } from "react";
import "./official-forms.css";

export interface ProtocolCheckItem {
  id: string;
  category: "Etkinlik Öncesi" | "Etkinlik Sırası" | "Etkinlik Sonrası";
  title: string;
  ruleText: string;
  checked: boolean;
}

const DEFAULT_PROTOCOL_CHECKS: ProtocolCheckItem[] = [
  // Öncesi
  {
    id: "pre-1",
    category: "Etkinlik Öncesi",
    title: "Eğitimsel Amaç ve Kazanım Uyumu",
    ruleText: "Etkinliğin eğitimsel amacı açık biçimde tanımlanmış, çocukların yaş ve gelişim düzeyiyle uyumlu hale getirilmiştir.",
    checked: true,
  },
  {
    id: "pre-2",
    category: "Etkinlik Öncesi",
    title: "Zümre İş Birliği ve Görev Dağılımı",
    ruleText: "Zümre öğretmenleriyle uygulama süreci ve sorumluluklar paylaşılarak planlama birliği sağlanmıştır.",
    checked: true,
  },
  {
    id: "pre-3",
    category: "Etkinlik Öncesi",
    title: "Ortam Seçimi ve Ön Ziyaret",
    ruleText: "Öğretmen ortamı önceden ziyaret etmiş, fiziki riskleri ve öğrenme fırsatlarını yerinde tespit etmiştir.",
    checked: true,
  },
  {
    id: "pre-4",
    category: "Etkinlik Öncesi",
    title: "Erişilebilirlik ve Kapsayıcılık",
    ruleText: "Özel gereksinimli ve BEP'li çocukların fiziksel ve duyusal erişim koşulları güvenceye alınmıştır.",
    checked: true,
  },
  {
    id: "pre-5",
    category: "Etkinlik Öncesi",
    title: "İzin ve Resmî Onay Süreçleri",
    ruleText: "Okul müdürlüğü / İlçe MEM resmî izin oluru alınmış; tüm velilerden ıslak imzalı muvafakatname toplanmıştır.",
    checked: true,
  },
  {
    id: "pre-6",
    category: "Etkinlik Öncesi",
    title: "Lojistik ve Güvenlik Yönetimi",
    ruleText: "Araç uygunluk belgeleri (D2, sigorta, emniyet kemeri), güzergâh, ilk yardım çantası ve acil eylem planı hazırdır.",
    checked: true,
  },
  {
    id: "pre-7",
    category: "Etkinlik Öncesi",
    title: "Çocukların Ön Hazırlığı",
    ruleText: "Zihin haritaları, tahmin çalışmaları ve soru listeleriyle çocuklarda merak ve güvenlik bilinci uyandırılmıştır.",
    checked: true,
  },

  // Sırası
  {
    id: "during-1",
    category: "Etkinlik Sırası",
    title: "Grup Kontrolü ve Düzenli Sayım",
    ruleText: "Araç biniş-inişlerinde, mekân giriş-çıkışlarında çocuklar düzenli olarak sayılmakta; ikili eşleşme takip edilmektedir.",
    checked: true,
  },
  {
    id: "during-2",
    category: "Etkinlik Sırası",
    title: "Aktif Katılım ve Keşif",
    ruleText: "Çocuklar pasif izleyici kalmamakta; dokunarak, sorarak ve inceleyerek aktif etkileşim kurmaktadır.",
    checked: true,
  },
  {
    id: "during-3",
    category: "Etkinlik Sırası",
    title: "Odaklı Öğrenme ve Rehberlik",
    ruleText: "Tüm alan hızla gezilmek yerine, hedeflenen öğrenme duraklarına odaklanılarak açık uçlu sorular sorulmaktadır.",
    checked: true,
  },
  {
    id: "during-4",
    category: "Etkinlik Sırası",
    title: "Temel İhtiyaçlar ve Fırsat Eğitimi",
    ruleText: "Dinlenme, su ve tuvalet ihtiyaçları aksatılmamakta; anlık gelişen durumlar (kelebek, rüzgar vb.) fırsat eğitimine çevrilmektedir.",
    checked: true,
  },

  // Sonrası
  {
    id: "post-1",
    category: "Etkinlik Sonrası",
    title: "Öğrenmenin Değerlendirilmesi",
    ruleText: "Etkinlik amaçlarına ne ölçüde ulaşıldığı EK-4'teki 8 değerlendirme sorusu ile ölçülmüştür.",
    checked: true,
  },
  {
    id: "post-2",
    category: "Etkinlik Sonrası",
    title: "Çocukların İfade Süreçleri",
    ruleText: "Sohbet çemberi, resim yapma, drama ve hikâye kurgulama ile deneyimler dışa vurulmuştur.",
    checked: true,
  },
  {
    id: "post-3",
    category: "Etkinlik Sonrası",
    title: "Merkezlerde Yeniden Yapılandırma & Paylaşım",
    ruleText: "Fotoğraf albümü, sınıf panosu ve dijital portfolyo ile deneyimler ailelerle paylaşılmış; merkezlerde pekiştirilmiştir.",
    checked: true,
  },
];

interface Props {
  onClose?: () => void;
}

export function OfficialSchoolOutsideProtocol({ onClose }: Props) {
  const [checklist, setChecklist] = useState<ProtocolCheckItem[]>(DEFAULT_PROTOCOL_CHECKS);
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [destination, setDestination] = useState("Denizli Çamlık Doğa Parkı ve Botanik Bahçesi");
  const [activityDate, setActivityDate] = useState("21.10.2026");
  const [responsibleTeacher, setResponsibleTeacher] = useState("Emine Öğretmen");
  const [companionCount, setCompanionCount] = useState("2 Öğretmen, 2 Rehber Veli");

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Okul Dışı Öğrenme Güvenlik ve İzin Protokolü</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; padding: 20px; line-height: 1.4; }
        h1 { font-size: 15pt; color: #7e22ce; text-align: center; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .meta-table td { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; }
        .section-title { font-weight: bold; background: #f3e8ff; padding: 6px; margin: 12px 0 6px 0; font-size: 11pt; color: #6b21a8; }
        .item { margin-bottom: 6px; font-size: 9.5pt; }
        .sig { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10pt; }
      </style>
      </head>
      <body>
        <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI · TTKB OKUL ÖNCESİ EĞİTİMİ</h1>
        <h2 style="text-align: center; font-size: 12pt; color: #475569;">EK-3 OKUL DIŞI ÖĞRENME ETKİNLİĞİ PLANLANIRKEN DİKKAT EDİLECEK HUSUSLAR VE GÜVENLİK PROTOKOLÜ (s. 179)</h2>

        <table class="meta-table">
          <tr>
            <td style="width: 25%;"><strong>Okul Adı:</strong></td>
            <td style="width: 25%;">${schoolName}</td>
            <td style="width: 25%;"><strong>Etkinlik Tarihi:</strong></td>
            <td style="width: 25%;">${activityDate}</td>
          </tr>
          <tr>
            <td><strong>Gidilecek Yer:</strong></td>
            <td>${destination}</td>
            <td><strong>Sorumlu Ekip:</strong></td>
            <td>${responsibleTeacher} (${companionCount})</td>
          </tr>
        </table>

        <div class="section-title">1. ETKİNLİK ÖNCESİ PLANLAMA VE GÜVENLİK KONTROL LİSTESİ</div>
        ${checklist.filter(c => c.category === "Etkinlik Öncesi").map(c => `
          <div class="item">[${c.checked ? "X" : " "}] <strong>${c.title}:</strong> ${c.ruleText}</div>
        `).join("")}

        <div class="section-title">2. ETKİNLİK SIRASINDA UYGULAMA PROTOKOLÜ</div>
        ${checklist.filter(c => c.category === "Etkinlik Sırası").map(c => `
          <div class="item">[${c.checked ? "X" : " "}] <strong>${c.title}:</strong> ${c.ruleText}</div>
        `).join("")}

        <div class="section-title">3. ETKİNLİK SONRASI DEĞERLENDİRME VE PEKİŞTİRME</div>
        ${checklist.filter(c => c.category === "Etkinlik Sonrası").map(c => `
          <div class="item">[${c.checked ? "X" : " "}] <strong>${c.title}:</strong> ${c.ruleText}</div>
        `).join("")}

        <div style="margin-top: 30px; display: table; width: 100%;">
          <div style="display: table-cell; width: 50%;">
            <strong>Gezi Sorumlusu Öğretmen:</strong><br/><br/>
            ${responsibleTeacher} (İmza)
          </div>
          <div style="display: table-cell; width: 50%; text-align: right;">
            <strong>Okul Müdürü:</strong><br/><br/>
            Uygundur (İmza / Mühür)
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EK3_Okul_Disi_Guvenlik_Protokolu.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#7e22ce", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🛡️</span>
            <span>EK-3 Okul Dışı Öğrenme Güvenlik, İzin ve Denetim Protokolü</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Sayfa 179 Resmî Kılavuz Standartları | Gezi öncesi, sırası ve sonrası 14 maddelik tam güvenlik taahhüdü
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
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
            🖨️ A4 Protokol Yazdır
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

      {/* EDİTÖZ KONSOLU */}
      <div className="print-hidden" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", margin: "14px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Okul Adı:</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Gidilecek Yer / Ortam:</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Etkinlik Tarihi:</label>
          <input
            type="text"
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
      </div>

      {/* CANLI A4 PROTOKOL FORMU */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #7e22ce", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · TÜRKİYE YÜZYILI MAARİF MODELİ
          </div>
          <h1 style={{ margin: "4px 0 2px 0", fontSize: "1.35rem", color: "#6b21a8", fontWeight: 800 }}>
            EK-3 Okul Dışı Öğrenme Güvenlik, İzin ve Uygulama Protokolü
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            TTKB Okul Öncesi Eğitim Programı Sayfa 179 Standartları
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
            <span>🏫 {schoolName}</span>
            <span>📍 {destination}</span>
            <span>📅 {activityDate}</span>
          </div>
        </div>

        {/* 3 RESMÎ AŞAMA LİSTESİ */}
        {(["Etkinlik Öncesi", "Etkinlik Sırası", "Etkinlik Sonrası"] as const).map((cat) => {
          const items = checklist.filter((i) => i.category === cat);
          const badgeColor = cat === "Etkinlik Öncesi" ? "#0284c7" : cat === "Etkinlik Sırası" ? "#ea580c" : "#16a34a";
          const bgLight = cat === "Etkinlik Öncesi" ? "#f0f9ff" : cat === "Etkinlik Sırası" ? "#fff7ed" : "#f0fdf4";

          return (
            <div key={cat} style={{ marginBottom: "18px" }}>
              <div
                style={{
                  background: bgLight,
                  borderLeft: `4px solid ${badgeColor}`,
                  padding: "6px 12px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: badgeColor,
                  borderRadius: "0 6px 6px 0",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                {cat === "Etkinlik Öncesi" ? "1. ETKİNLİK ÖNCESİ PLANLAMA VE İZİN PROTOKOLÜ" : cat === "Etkinlik Sırası" ? "2. ETKİNLİK SIRASINDA GÜVENLİK VE UYGULAMA ESASLARI" : "3. ETKİNLİK SONRASI DEĞERLENDİRME VE PEKİŞTİRME"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: item.checked ? "#ffffff" : "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCheck(item.id)}
                      style={{ marginTop: "3px", cursor: "pointer", accentColor: badgeColor }}
                    />
                    <div>
                      <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1e293b" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "0.79rem", color: "#475569", lineHeight: 1.4 }}>
                        {item.ruleText}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* İMZA VE ONAY KUTUSU */}
        <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "0.82rem" }}>
          <div>
            <strong>Gezi ve Etkinlik Sorumlusu Öğretmen</strong>
            <div style={{ marginTop: "28px", fontWeight: 700, color: "#1e293b" }}>
              {responsibleTeacher} (İmza)
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Okul Müdürü</strong>
            <div style={{ marginTop: "28px", fontWeight: 700, color: "#1e293b" }}>
              UYGUNDUR (İmza / Resmî Mühür)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
