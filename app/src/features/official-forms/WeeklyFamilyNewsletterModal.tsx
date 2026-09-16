import React, { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface WeeklyNewsletterData {
  id: string;
  weekNumber: number;
  dateRange: string;
  themeTitle: string;
  schoolName: string;
  className: string;
  teacherName: string;
  conceptsLearned: string[];
  virtueAndValue: {
    value: string;
    action: string;
  };
  songOrPoem: {
    title: string;
    lyrics: string;
  };
  homeActivity: {
    title: string;
    description: string;
    materials: string;
  };
  chatPrompts: string[];
  announcements: string;
}

const PRESET_NEWSLETTERS: WeeklyNewsletterData[] = [
  {
    id: "w-1",
    weekNumber: 6,
    dateRange: "12 - 16 Ekim 2026",
    themeTitle: "Sonbaharın Renkleri, Rüzgar ve Doğa Döngüsü",
    schoolName: "Denizli Maarif Anaokulu",
    className: "Papatyalar Sınıfı (5 Yaş)",
    teacherName: "Emine Öğretmen",
    conceptsLearned: ["Kırmızı", "Sarı", "Kahverengi", "Büyük - Küçük", "Rüzgar", "Kuru - Yaş", "Daire"],
    virtueAndValue: {
      value: "Sorumluluk & Doğa Sevgisi",
      action: "Park ve sokaklardaki canlıları koruma, doğayı temiz tutma ve yere çöp atmama eylemi.",
    },
    songOrPoem: {
      title: "Rüzgar ve Yapraklar Şarkısı",
      lyrics: "Rüzgar esti vuu vuu vuu,\nSarı yaprak uçtu vuu.\nAğaçlara el salla,\nSonbahar geldi sınıfa!",
    },
    homeActivity: {
      title: "Hafta Sonu Doğa Dedektifliği & Yaprak Baskısı",
      description: "Çocuğunuzla en yakın parka çıkıp yere dökülmüş farklı renkte ve boyutta 5 yaprak toplayınız. Evde bu yaprakları suluboyayla boyayıp bir kağıda basarak kendi sonbahar ağacınızı oluşturabilirsiniz.",
      materials: "Kuru yapraklar, suluboya / parmak boyası, resim kağıdı.",
    },
    chatPrompts: [
      "Bugün parkta yürürken ağaçların rengi hakkında neler fark ettin?",
      "Rüzgar estiğinde yapraklar sence nereye yolculuk yapıyor olabilir?",
    ],
    announcements: "Pazartesi günü sınıfımızdaki Fen Merkezinde incelemek üzere evden 1 adet meşe palamudu veya çam kozalağı göndermenizi rica ederiz. Mevsim geçişi nedeniyle çocukların çantalarında mevsimlik yedek kıyafet bulunması önemlidir.",
  },
  {
    id: "w-2",
    weekNumber: 8,
    dateRange: "26 - 30 Ekim 2026",
    themeTitle: "Cumhuriyetimizin Işığı, Bayrağımız ve Birlik Olmak",
    schoolName: "Denizli Maarif Anaokulu",
    className: "Papatyalar Sınıfı (5 Yaş)",
    teacherName: "Emine Öğretmen",
    conceptsLearned: ["Kırmızı", "Beyaz", "Ay - Yıldız", "Özgürlük", "Birlik", "Vatan", "Eşit"],
    virtueAndValue: {
      value: "Vatanseverlik & Adalet",
      action: "Sınıf kurallarına uyma, arkadaşlarına adil davranma ve bayrağımıza saygı gösterme.",
    },
    songOrPoem: {
      title: "Cumhuriyet Hürriyet Demek",
      lyrics: "Yirmi Dokuz Ekim'de,\nCumhuriyet kuruldu.\nHür yaşamak hakkımız,\nBunu Atatürk kurdu!",
    },
    homeActivity: {
      title: "Kırmızı-Beyaz Bayrak Yapıştırma & Aile Sohbeti",
      description: "Evde kırmızı bir karton üzerine beyaz pamuk veya kağıtlardan ay-yıldız figürü yapıştırıp penceremize asalım. Cumhuriyet Bayramı coşkusunu penceremizden tüm mahalleye hissettirelim.",
      materials: "Kırmızı karton, beyaz kağıt/pamuk, yapıştırıcı.",
    },
    chatPrompts: [
      "Bayrağımızın üzerindeki ay ve yıldız sana neleri hissettiriyor?",
      "Birlikte oyun oynarken herkesin sırayla oynaması neden önemlidir?",
    ],
    announcements: "28 Ekim Çarşamba günü saat 10:30'da okulumuz bahçesinde Cumhuriyet Bayramı Şenliği düzenlenecektir. Tüm velilerimiz kırmızı-beyaz kıyafet konseptiyle davetlidir.",
  },
];

interface Props {
  onClose?: () => void;
}

export function WeeklyFamilyNewsletterModal({ onClose }: Props) {
  const [newsletters, setNewsletters] = useState<WeeklyNewsletterData[]>(() => {
    try {
      const saved = localStorage.getItem("maarif_weekly_newsletters");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return PRESET_NEWSLETTERS;
  });

  const [activeId, setActiveId] = useState<string>(newsletters[0]?.id || "w-1");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const current = newsletters.find((n) => n.id === activeId) || newsletters[0];

  const handleUpdateCurrent = (field: keyof WeeklyNewsletterData, val: any) => {
    setNewsletters((prev) => {
      const next = prev.map((item) => (item.id === current.id ? { ...item, [field]: val } : item));
      try {
        localStorage.setItem("maarif_weekly_newsletters", JSON.stringify(next));
      } catch {
        // storage full
      }
      return next;
    });
  };

  const handlePrint = () => {
    printOfficialFormA4(`Haftalik_Veli_Bulteni_${current.weekNumber}_Hafta`);
  };

  const handleCopyWhatsApp = () => {
    const text = `📢 *HAFTALIK VELİ BÜLTENİ & EV PUSULASI* 🌟
🏫 *${current.schoolName} - ${current.className}*
📅 *Hafta ${current.weekNumber} (${current.dateRange})*
👩‍🏫 *Öğretmen:* ${current.teacherName}

🌿 *BU HAFTA NELER ÖĞRENDİK?*
🎯 *Konumuz:* ${current.themeTitle}
💡 *Kavramlarımız:* ${current.conceptsLearned.join(", ")}
💎 *Erdem & Değer:* ${current.virtueAndValue.value} (${current.virtueAndValue.action})

🎶 *HAFTANIN ŞARKISI / ŞİİRİ:*
*${current.songOrPoem.title}*
${current.songOrPoem.lyrics}

🏡 *EVDE BİRLİKTE YAPABİLECEĞİNİZ ETKİNLİK:*
✨ *${current.homeActivity.title}*
${current.homeActivity.description}
📦 *Gerekli Malzemeler:* ${current.homeActivity.materials}

💬 *EVDE SOHBET BAŞLATICILARI:*
${current.chatPrompts.map((p, i) => `${i + 1}. "${p}"`).join("\n")}

📌 *ÖNEMLİ HATIRLATMALAR:*
${current.announcements}

Sevgi ve neşeyle dolu bir hafta dileriz! 🌸`;

    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback("✅ WhatsApp bülten metni panoya kopyalandı!");
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const handleDownloadDoc = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Haftalık Veli Bülteni - Hafta ${current.weekNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; padding: 20px; line-height: 1.5; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { font-size: 18pt; margin: 0; color: #0369a1; }
        .header p { margin: 4px 0; font-size: 11pt; color: #64748b; }
        .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
        .card-title { font-weight: bold; color: #0284c7; font-size: 12pt; margin-bottom: 8px; text-transform: uppercase; }
        .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 9.5pt; font-weight: bold; }
        .quote-box { border-left: 4px solid #f59e0b; padding-left: 12px; font-style: italic; color: #475569; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI</h1>
          <h2>${current.schoolName} - ${current.className}</h2>
          <p><strong>HAFTALIK VELİ BÜLTENİ VE EV ETKİNLİK PUSULASI (Hafta ${current.weekNumber})</strong></p>
          <p>Tarih: ${current.dateRange} | Öğretmen: ${current.teacherName}</p>
        </div>

        <div class="card">
          <div class="card-title">1. Bu Hafta Neler Keşfettik? (Tema: ${current.themeTitle})</div>
          <p><strong>Haftanın Kavramları:</strong></p>
          <p>${current.conceptsLearned.map(c => `<span class="badge">${c}</span>`).join(" ")}</p>
          <p><strong>Değer ve Erdemimiz:</strong> <strong>${current.virtueAndValue.value}</strong> — ${current.virtueAndValue.action}</p>
        </div>

        <div class="card">
          <div class="card-title">2. Haftanın Şarkısı & Şiiri: ${current.songOrPoem.title}</div>
          <div class="quote-box">${current.songOrPoem.lyrics.replace(/\n/g, "<br/>")}</div>
        </div>

        <div class="card">
          <div class="card-title">3. Ev Etkinlik Pusulası: ${current.homeActivity.title}</div>
          <p>${current.homeActivity.description}</p>
          <p><strong>Gerekli Basit Malzemeler:</strong> ${current.homeActivity.materials}</p>
        </div>

        <div class="card">
          <div class="card-title">4. Evde Sohbet Başlatıcı Sorular</div>
          <ul>
            ${current.chatPrompts.map(p => `<li>${p}</li>`).join("")}
          </ul>
        </div>

        <div class="card">
          <div class="card-title">5. Önemli Duyurular ve Hatırlatmalar</div>
          <p>${current.announcements}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Haftalik_Veli_Bulteni_Hafta_${current.weekNumber}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `Haftalik_Veli_Bulteni_Hafta_${current.weekNumber}`,
      sheetName: `Hafta ${current.weekNumber} Bülten`,
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — HAFTALIK VELİ BÜLTENİ VE EV PUSULASI",
      subtitle: `${current.schoolName} · ${current.className} · Hafta: ${current.weekNumber} (${current.dateRange}) · Öğretmen: ${current.teacherName}`,
      metadata: [
        { label: "Okul Adı", value: current.schoolName },
        { label: "Şube", value: current.className },
        { label: "Öğretmen", value: current.teacherName },
        { label: "Hafta", value: `${current.weekNumber} (${current.dateRange})` },
        { label: "Tema / Odak", value: current.themeTitle },
      ],
      columns: [
        { header: "Bülten Bölümü", key: "section", width: 28, align: "left" },
        { header: "İçerik, Şarkı, Ev Etkinliği ve Açıklamalar", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { section: "HAFTANIN TEMASI", content: current.themeTitle },
        { section: "KAVRAMLAR", content: current.conceptsLearned.join(", ") },
        { section: "ERDEM & DEĞER", content: `${current.virtueAndValue.value} (${current.virtueAndValue.action})` },
        { section: "ŞARKI / ŞİİR", content: `${current.songOrPoem.title}\n${current.songOrPoem.lyrics}` },
        { section: "EV ETKİNLİĞİ", content: `${current.homeActivity.title}\n${current.homeActivity.description}\nMalzemeler: ${current.homeActivity.materials}` },
        { section: "SOHBET BAŞLATICILAR", content: current.chatPrompts.map((p, i) => `${i + 1}. "${p}"`).join("\n") },
        { section: "DUYURULAR & NOTLAR", content: current.announcements },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK VE EYLEM ÇUBUĞU */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📰</span>
            <span>Haftalık Görsel Veli Bülteni & Ev Etkinlik Pusulası</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB s. 102–104 Aile Katılımı ve Bilgilendirme | WhatsApp uyumlu, tek tıkla A4 renkli çıktı, Excel (.xlsx) ve Word (.doc)
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {copyFeedback && (
            <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: "bold" }}>
              {copyFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleDownloadExcel()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
            title="Haftalık bülten tablosunu Excel (.xlsx) olarak indir"
          >
            <span>📊</span>
            <span>Excel (.xlsx) İndir</span>
          </button>
          <button
            onClick={handleCopyWhatsApp}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <span>📱</span>
            <span>WhatsApp Metni Kopyala</span>
          </button>
          <button
            onClick={handleDownloadDoc}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
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
            <span>💾</span>
            <span>Word (.doc) İndir</span>
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
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
            <span>🖨️</span>
            <span>A4 Bülten Yazdır</span>
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

      {/* HAFTA SEÇİM ŞERİDİ */}
      <div className="print-hidden" style={{ display: "flex", gap: "8px", margin: "14px 0", overflowX: "auto", paddingBottom: "4px" }}>
        {newsletters.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveId(n.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: activeId === n.id ? "2px solid #0284c7" : "1px solid #cbd5e1",
              background: activeId === n.id ? "#e0f2fe" : "#ffffff",
              color: activeId === n.id ? "#0369a1" : "#475569",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Hafta {n.weekNumber} ({n.dateRange})
          </button>
        ))}
      </div>

      {/* CANLI A4 BÜLTEN KARTI */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          color: "#1e293b",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* RESMÎ A4 BÜLTEN KÜNYESİ */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #0284c7", paddingBottom: "14px", marginBottom: "18px" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · OKUL ÖNCESİ EĞİTİMİ
          </div>
          <h1 style={{ margin: "6px 0 2px 0", fontSize: "1.4rem", color: "#0369a1", fontWeight: 800 }}>
            {current.schoolName} · {current.className}
          </h1>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "0.9rem", color: "#475569", fontWeight: 600, marginTop: "4px" }}>
            <span style={{ background: "#f1f5f9", padding: "2px 10px", borderRadius: "12px" }}>
              📅 Hafta {current.weekNumber} ({current.dateRange})
            </span>
            <span style={{ background: "#f1f5f9", padding: "2px 10px", borderRadius: "12px" }}>
              👩‍🏫 {current.teacherName}
            </span>
          </div>
        </div>

        {/* 2 SÜTUNLU MODERN MİZANPAJ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
          {/* SOL SÜTUN: KAVRAMLAR VE ŞARKI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* 1. KAVRAMLAR VE TEMA */}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎯</span> 1. BU HAFTA NELER KEŞFETTİK?
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#15803d", marginBottom: "8px" }}>
                {current.themeTitle}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Öğrenilen Kavramlar:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {current.conceptsLearned.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#166534",
                    }}
                  >
                    ✓ {c}
                  </span>
                ))}
              </div>
            </div>

            {/* 2. ERDEM VE DEĞER */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#92400e", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💎</span> 2. ERDEM & DEĞER ODAĞIMIZ
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#b45309", marginBottom: "4px" }}>
                {current.virtueAndValue.value}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#78350f", lineHeight: 1.4 }}>
                {current.virtueAndValue.action}
              </p>
            </div>

            {/* 3. ŞARKI VE TEKERLEME */}
            <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#9d174d", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎶</span> 3. HAFTANIN ŞARKISI / ŞİİRİ
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#be185d", marginBottom: "6px" }}>
                {current.songOrPoem.title}
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "#831843",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                  background: "#ffffff",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  borderLeft: "3px solid #f43f5e",
                }}
              >
                {current.songOrPoem.lyrics}
              </div>
            </div>
          </div>

          {/* SAĞ SÜTUN: EV ETKİNLİK PUSULASI VE SOHBET */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* 4. EV ETKİNLİK PUSULASI */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0369a1", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🏡</span> 4. EV ETKİNLİK PUSULASI (AİLE SAATİ)
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0284c7", marginBottom: "6px" }}>
                {current.homeActivity.title}
              </div>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.82rem", color: "#334155", lineHeight: 1.45 }}>
                {current.homeActivity.description}
              </p>
              <div style={{ background: "#ffffff", padding: "6px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#0369a1", fontWeight: 600 }}>
                📦 <strong>Gerekli Basit Malzemeler:</strong> {current.homeActivity.materials}
              </div>
            </div>

            {/* 5. EVDE SOHBET BAŞLATICILARI */}
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#6b21a8", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💬</span> 5. EVDE SOHBET BAŞLATICI SORULAR
              </div>
              <p style={{ margin: "0 0 6px 0", fontSize: "0.8rem", color: "#7e22ce" }}>
                Yemek masasında veya uyku öncesinde çocuğunuza bu soruları yönelterek dil ve düşünme becerilerini destekleyebilirsiniz:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {current.chatPrompts.map((prompt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#ffffff",
                      borderLeft: "3px solid #a855f7",
                      padding: "6px 10px",
                      borderRadius: "0 6px 6px 0",
                      fontSize: "0.8rem",
                      color: "#581c87",
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}. "{prompt}"
                  </div>
                ))}
              </div>
            </div>

            {/* 6. DUYURULAR */}
            <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📌</span> 6. ÖNEMLİ DUYURU VE HATIRLATMA
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.45 }}>
                {current.announcements}
              </p>
            </div>
          </div>
        </div>

        {/* ALT İMZA ALANI */}
        <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
          <div>
            📍 Türkiye Yüzyılı Maarif Modeli · Aile Katılımı ve Eğitimi Standartları
          </div>
          <div style={{ fontWeight: 700, color: "#0369a1" }}>
            {current.teacherName} · Okul Öncesi Öğretmeni
          </div>
        </div>
      </div>
    </div>
  );
}
