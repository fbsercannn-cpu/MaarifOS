/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * Plana Bağlı Resmî Örnek Çıktılar Sandığı (Linked Plan Sample Outputs Modal)
 * Mimari: %100 Client-Side, A4 Yazdırılabilir, WhatsApp Deep-Link Uyumlu
 */

import { useState } from "react";
import "./official-forms.css";

export interface OfficialPlanLinkedOutputsProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle?: string;
  civilDate?: string;
  ageGroup?: string;
  domainSkills?: string;
  concepts?: string;
  materials?: string;
  activities?: string;
  values?: string;
}

export function OfficialPlanLinkedOutputsModal({
  isOpen,
  onClose,
  planTitle = "Günün Eğitim Planı",
  civilDate = new Date().toISOString().slice(0, 10),
  ageGroup = "60-72 Ay",
  domainSkills = "Matematik: Sayma ve eşleştirme, Türkçe: Hikaye tamamlama, Sanat: Özgün ürün oluşturma",
  concepts = "Büyük-Küçük, Daire-Kare, Renkler, Paylaşım",
  materials = "Renkli kartonlar, pastel boyalar, tahta bloklar, masal kartları",
  activities = "1. 'Renklerin Dansı' (Bütünleştirilmiş Sanat-Türkçe)\n2. 'Şekil Avcıları' (Matematik-Oyun)",
  values = "D3. Çalışkanlık, D7. Estetik, D12. Sabır",
}: OfficialPlanLinkedOutputsProps) {
  const [activeTab, setActiveTab] = useState<
    "newsletter" | "shopping" | "timeline" | "materials" | "centers" | "evaluation"
  >("newsletter");
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. WhatsApp Veli Bülteni Metni
  const whatsappText = `🌟 *HAFTALIK VELİ BÜLTENİ & GÜNLÜK AKIŞ* 🌟
📅 *Tarih:* ${civilDate} | *Grup:* ${ageGroup}
📌 *Plan / Konu:* ${planTitle}

✨ *Bu Hafta Neler Öğreniyoruz?*
${concepts ? `• *Kavramlarımız:* ${concepts}` : ""}
${values ? `• *Değerlerimiz & Erdemlerimiz:* ${values}` : ""}

🎨 *Günün Kilit Etkinlikleri:*
${activities}

🏡 *Evde Destek & Sohbet Kancası:*
Çocuğunuzla gün sonunda "Bugün sınıfta seni en çok şaşırtan veya güldüren ne oldu?" sorusunu konuşabilir, evdeki eşyaları büyük-küçük veya renklerine göre ayırma oyunu oynayabilirsiniz.

Sevgi ve saygılarımızla,
*Okul Öncesi Zümresi* 🎈`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStatus(`✅ ${label} panoya kopyalandı!`);
      setTimeout(() => setCopiedStatus(null), 3000);
    } catch {
      setCopiedStatus("❌ Kopyalama başarısız oldu.");
    }
  };

  // Malzeme listesi elemanları
  const materialItems = materials
    .split(/[,\n]/)
    .map((m) => m.trim())
    .filter(Boolean);

  return (
    <div
      className="official-form-modal"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 10050 }}
    >
      <div
        className="official-form-container"
        style={{
          maxWidth: "850px",
          width: "95%",
          background: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 20px",
            background: "#0f172a",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>📦</span>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                Plana Bağlı Resmî Örnek Çıktılar
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
              {planTitle} · {civilDate} · {ageGroup}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#ffffff",
              fontSize: "1.2rem",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </header>

        {/* Tab Selector */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "#f1f5f9",
            padding: "8px 16px",
            borderBottom: "1px solid #cbd5e1",
            overflowX: "auto",
          }}
        >
          {[
            { id: "newsletter", label: "📱 Veli WhatsApp Bülteni", icon: "💬" },
            { id: "shopping", label: "🛒 Malzeme & Alışveriş", icon: "📋" },
            { id: "timeline", label: "⏰ 10 Blokluk Zaman Çizelgesi", icon: "⏱️" },
            { id: "materials", label: "🎨 Pedagojik Materyaller", icon: "📄" },
            { id: "centers", label: "🧩 Merkez Dağılımı", icon: "🧱" },
            { id: "evaluation", label: "🌟 3B Değerlendirme", icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? "#0284c7" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {copiedStatus && (
            <div
              style={{
                padding: "8px 14px",
                marginBottom: "14px",
                borderRadius: "6px",
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {copiedStatus}
            </div>
          )}

          {/* TAB 1: WhatsApp Bülteni */}
          {activeTab === "newsletter" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                  Haftalık / Günlük Veli WhatsApp Mesajı
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(whatsappText, "WhatsApp Mesajı")}
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    📋 Metni Kopyala
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#059669",
                      color: "#fff",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      textDecoration: "none",
                      fontSize: "0.82rem",
                    }}
                  >
                    💬 WhatsApp'ta Aç
                  </a>
                </div>
              </div>
              <pre
                style={{
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                  color: "#334155",
                }}
              >
                {whatsappText}
              </pre>
            </div>
          )}

          {/* TAB 2: Malzeme & Alışveriş */}
          {activeTab === "shopping" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                  Etkinlik Malzemeleri & İhtiyaç Listesi
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      materialItems.map((m) => `[ ] ${m}`).join("\n"),
                      "Malzeme Listesi",
                    )
                  }
                  style={{
                    background: "#0284c7",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  📋 Listeyi Kopyala
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", width: "40px" }}>Durum</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Materyal Adı</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Temin / Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  {materialItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center" }}>
                        <input type="checkbox" />
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontWeight: 600 }}>{item}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", color: "#64748b" }}>
                        Sınıf Dolabı / Veli Desteği / Okul Deposu
                      </td>
                    </tr>
                  ))}
                  {materialItems.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "12px", color: "#94a3b8" }}>
                        Planda belirtilen özel materyal bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: 10 Blokluk Günlük Akış */}
          {activeTab === "timeline" && (
            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#1e293b" }}>
                Resmî TTKB 10 Blokluk Zaman Akış Çizelgesi
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { time: "08:30 - 09:00", title: "1. Güne Başlama Zamanı", desc: "Karşılama, duygu panosu yoklaması, günün mesajı ve merak sorusu.", tag: "Rutin" },
                  { time: "09:00 - 10:00", title: "2. Öğrenme Merkezlerinde Oyun", desc: "Çocukların ilgi alanlarına göre merkezlere serbest dağılımı.", tag: "Merkezler" },
                  { time: "10:00 - 10:30", title: "3. Beslenme & Temizlik Rutini", desc: "Sağlıklı atıştırmalık, el yıkama, masa düzeni ve öz bakım.", tag: "Rutin" },
                  { time: "10:30 - 11:30", title: "4. 1. Temel Etkinlik Zamanı", desc: activities.split("\n")[0] || "Bütünleştirilmiş alan etkinliği.", tag: "Etkinlik" },
                  { time: "11:30 - 12:15", title: "5. Açık Hava & Bahçe Oyunları", desc: "Fiziksel hareket, çamur mutfağı, denge parkuru ve doğa keşfi.", tag: "Açık Hava" },
                  { time: "12:15 - 13:15", title: "6. Öğle Yemeği & Dinlenme", desc: "Öğle menüsü, sofra adabı ve sessiz dinlenme / masal dinletisi.", tag: "Beslenme" },
                  { time: "13:15 - 14:15", title: "7. 2. Temel Etkinlik Zamanı", desc: activities.split("\n")[1] || "Oyun temelli matematik/fen etkinliği.", tag: "Etkinlik" },
                  { time: "14:15 - 15:00", title: "8. Küçük Grup & Bireysel Destek", desc: "Farklılaştırma: İleri düzey zenginleştirme veya BEP destekleme.", tag: "Bireysel" },
                  { time: "15:00 - 15:45", title: "9. Serbest Oyun & Sanat Tamamlama", desc: "Yarım kalan ürünlerin bitirilmesi, portfolyoya ekleme.", tag: "Serbest" },
                  { time: "15:45 - 16:30", title: "10. Günü Değerlendirme & Kapanış", desc: "Günün 3 boyutta yansıtılması, kapanış çemberi, veli teslimi.", tag: "Kapanış" },
                ].map((block, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "10px 14px",
                      background: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0284c7", minWidth: "95px" }}>
                      {block.time}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "0.86rem", color: "#0f172a" }}>{block.title}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>{block.desc}</p>
                    </div>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "#e0f2fe",
                        color: "#0369a1",
                      }}
                    >
                      {block.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Pedagojik Materyaller */}
          {activeTab === "materials" && (
            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#1e293b" }}>
                Günün Temasına Uygun Pedagojik Materyal Kartları
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 6px 0", color: "#c2410c", fontSize: "0.88rem" }}>🎵 Haftanın Şarkısı & Tekerlemesi</h4>
                  <p style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.45 }}>
                    "Tık tık kim o?<br />
                    Ben bir küçük şekilim.<br />
                    Dört kenarım dört köşem,<br />
                    Kare derler adıma,<br />
                    Haydi gel oyna bana!"
                  </p>
                </div>
                <div style={{ padding: "14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 6px 0", color: "#059669", fontSize: "0.88rem" }}>🎨 A4 Boyama & Çizgi Çalışması</h4>
                  <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    Temaya uygun geometrik şekiller ve desen eşleme boyama şablonu A4 paged media yazdırmaya hazır.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      marginTop: "8px",
                      background: "#059669",
                      color: "#fff",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    🖨️ A4 Yazdır
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Merkez Dağılımı */}
          {activeTab === "centers" && (
            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#1e293b" }}>
                Öğrenme Merkezleri Dengeli Dağılım Çizelgesi
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {[
                  { name: "🧱 Blok Merkezi", cap: "4 Çocuk", focus: "Kule, köprü, 3B yapılar" },
                  { name: "📚 Kitap Merkezi", cap: "3 Çocuk", focus: "Masal kartları, sessiz okuma" },
                  { name: "🎨 Sanat Merkezi", cap: "4 Çocuk", focus: "Boya, kil, kolaj" },
                  { name: "🔬 Fen Merkezi", cap: "3 Çocuk", focus: "Büyüteç, terazi, doğa materyalleri" },
                  { name: "🎵 Müzik Merkezi", cap: "3 Çocuk", focus: "Ritim aletleri, marakas" },
                  { name: "🎭 Dramatik Oyun", cap: "3 Çocuk", focus: "Kostüm, meslek canlandırma" },
                ].map((c, i) => (
                  <div key={i} style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>{c.name}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 600, marginTop: "2px" }}>Kapasite: {c.cap}</div>
                    <small style={{ display: "block", color: "#64748b", marginTop: "4px", fontSize: "0.74rem" }}>{c.focus}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: 3B Değerlendirme */}
          {activeTab === "evaluation" && (
            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#1e293b" }}>
                MEB TTKB 3 Boyutlu Değerlendirme Çıktısı
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "12px", border: "1px solid #fed7aa", borderRadius: "8px", background: "#fff7ed" }}>
                  <strong style={{ color: "#c2410c", fontSize: "0.86rem" }}>1. Çocuk Açısından:</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#334155" }}>
                    Çocuklar etkinlik sürecinde yönergeleri ilgiyle takip etti; geometrik şekilleri çevrelerindeki nesnelerle eşleştirirken yüksek motivasyon gösterdi.
                  </p>
                </div>
                <div style={{ padding: "12px", border: "1px solid #bfdbfe", borderRadius: "8px", background: "#eff6ff" }}>
                  <strong style={{ color: "#1d4ed8", fontSize: "0.86rem" }}>2. Program Açısından:</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#334155" }}>
                    Süreç bileşenleri zamanlamaya uygun işledi; oyunlaştırılmış matematik geçişi açık hava oyunlarıyla dengelendi.
                  </p>
                </div>
                <div style={{ padding: "12px", border: "1px solid #bbf7d0", borderRadius: "8px", background: "#f0fdf4" }}>
                  <strong style={{ color: "#15803d", fontSize: "0.86rem" }}>3. Öğretmen Açısından:</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#334155" }}>
                    Merkezler arası rotasyonda akran yardımlaşması teşvik edildi; desteğe ihtiyaç duyan çocuklara ikili eşleşmeyle rehberlik sağlandı.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            🖨️ A4 Yazdır
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#0284c7",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Tamam
          </button>
        </footer>
      </div>
    </div>
  );
}
