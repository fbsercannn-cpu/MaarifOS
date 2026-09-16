import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface ClosingDimension {
  id: string;
  title: string;
  guidingQuestion: string;
  notes: string;
}

const DEFAULT_DIMENSIONS: ClosingDimension[] = [
  {
    id: "dim-1",
    title: "1. Duygu ve Durum Çemberi",
    guidingQuestion: "Bugün seni en çok ne sevindirdi? Seni zorlayan ya da üzen bir an oldu mu?",
    notes: "Çocukların büyük kısmı bahçedeki su kanalı oyununda çok heyecanlandıklarını; sırayı beklerken biraz sabırsızlandıklarını ifade etti.",
  },
  {
    id: "dim-2",
    title: "2. Kavram, Beceri ve Merak Çemberi",
    guidingQuestion: "Bugün hangi yeni kelimeyi, şekli ya da bilmeceyi öğrendik?",
    notes: "'Ağır-hafif' kavramını terazide kozalak tartarak keşfettik. Daire ile silindir arasındaki farkı bloklarla karşılaştırdık.",
  },
  {
    id: "dim-3",
    title: "3. Erdem ve Değer Yaşantısı Çemberi",
    guidingQuestion: "Bugün sınıfımızda bir arkadaşına nasıl yardım ettin? Kim sana nezaket gösterdi?",
    notes: "Toplanma rutininde blok merkezinin toplanmasına herkes el birliğiyle destek oldu. Adalet ve yardımlaşma erdemi vurgulandı.",
  },
  {
    id: "dim-4",
    title: "4. Yarının Planlaması ve Eve Taşınacak Merak",
    guidingQuestion: "Yarın merkezlerde ne yapmak istersin? Akşam ailene bugünden neyi anlatacaksın?",
    notes: "Çocuklar yarın çamur mutfağında kek pişirme oyunu oynamak istediklerini söylediler. Ailelerine sonbahar yapraklarını göstermeyi kararlaştırdılar.",
  },
];

export function OfficialDayClosingCircleModal({ onClose }: { onClose?: () => void }) {
  const [date, setDate] = useState("2026-09-15");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [presentCount, setPresentCount] = useState(18);
  const [totalCount, setTotalCount] = useState(20);
  const [dimensions, setDimensions] = useState<ClosingDimension[]>(DEFAULT_DIMENSIONS);
  const [quotes, setQuotes] = useState<string[]>([
    "Demir: 'Ben kozalağı tarttım, taş kadar ağır çıktı!'",
    "Zeynep: 'Arkadaşımın dökülen boyasını mendille sildim, bana teşekkür etti.'",
    "Ali: 'Yarın yine bahçeye çıkalım, solucanın evini bulduk!'",
  ]);
  const [teacherReflection, setTeacherReflection] = useState(
    "Günün 5 rutini eksiksiz tamamlandı. Açık hava çamur mutfağı istasyonu çocukların duyusal sakinleşmesine büyük katkı sağladı. Yarınki planda fen deneyine ek süre ayrılacaktır."
  );

  const handleDimensionChange = (id: string, notes: string) => {
    setDimensions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, notes } : d))
    );
  };

  const handleQuoteChange = (index: number, val: string) => {
    setQuotes((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handlePrint = () => {
    printOfficialFormA4(`Gunu_Degerlendirme_Cemberi_${date}`);
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Gunu_Degerlendirme_Cemberi_${date}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.35; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 9.5pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          GÜNÜN DEĞERLENDİRİLMESİ ZAMANI VE YANSITMA TUTANAĞI
        </div>
        <table>
          <tr><td><b>Okul / Kurum Adı:</b> ${schoolName}</td><td><b>Tarih:</b> ${date}</td></tr>
          <tr><td><b>Sınıf Öğretmeni:</b> ${teacherName}</td><td><b>Katılım:</b> ${presentCount} / ${totalCount} Çocuk</td></tr>
        </table>
        <h4>Günün Değerlendirilmesi Çemberi 4 Temel Boyutu (TTKB Sayfa 92, 100–102)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 35%'>Çember Boyutu ve Yönlendirici Soru</th>
              <th style='width: 65%'>Sınıf Paylaşımları ve Ortak Çıkarımlar</th>
            </tr>
          </thead>
          <tbody>
            ${dimensions.map(d => `
              <tr>
                <td><b>${d.title}</b><br/><small><i>${d.guidingQuestion}</i></small></td>
                <td>${d.notes}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h4>Çocukların Ağzından Günün Cümleleri (Birebir Alıntılar)</h4>
        <ul>
          ${quotes.map(q => `<li>${q}</li>`).join('')}
        </ul>
        <h4>Öğretmenin Gün Sonu Pedagojik Yansıtması</h4>
        <p>${teacherReflection}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Onay / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Gunu_Degerlendirme_Cemberi_${date}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows: Array<Record<string, unknown>> = dimensions.map((d, idx) => ({
      no: idx + 1,
      title: d.title,
      question: d.guidingQuestion,
      notes: d.notes,
    }));

    rows.push({
      no: dimensions.length + 1,
      title: "ÇOCUK ALINTILARI",
      question: "Günün Cümleleri",
      notes: quotes.join(" \n• "),
    });

    rows.push({
      no: dimensions.length + 2,
      title: "ÖĞRETMEN YANSITMASI",
      question: "Gün Sonu Öz Değerlendirme",
      notes: teacherReflection,
    });

    await exportOfficialTableToExcel({
      fileName: `Gunu_Degerlendirme_Cemberi_${date}`,
      sheetName: "Günü Değerlendirme",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — GÜNÜ DEĞERLENDİRME ÇEMBERİ VE YANSITMA TUTANAĞI",
      subtitle: `${schoolName} · Tarih: ${date} · Öğretmen: ${teacherName} · Katılım: ${presentCount}/${totalCount}`,
      metadata: [
        { label: "Okul Adı", value: schoolName },
        { label: "Tarih", value: date },
        { label: "Öğretmen", value: teacherName },
        { label: "Katılım", value: `${presentCount} / ${totalCount}` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Çember Boyutu", key: "title", width: 26, align: "left" },
        { header: "Yönlendirici Soru", key: "question", width: 35, align: "left" },
        { header: "Sınıf Paylaşımları, Ortak Çıkarımlar ve Alıntılar", key: "notes", width: 60, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 92, 100–102</span>
          <h3 className="of-action-title">Günü Değerlendirme Çemberi ve Yansıtma Tutanağı</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="Günü değerlendirme tutanağını Excel (.xlsx) olarak indir"
          >
            📊 Excel (.xlsx)
          </button>
          <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
            🖨️ A4 Yazdır
          </button>
          <button type="button" className="of-btn of-btn--word" onClick={handleExportWord}>
            📄 Word İndir (.doc)
          </button>
          {onClose && (
            <button type="button" className="of-btn of-btn--close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="of-print-page">
        <div className="of-header-block">
          <div className="of-header-crest">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <div className="of-header-sub">TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI</div>
          <div className="of-header-main-title">
            GÜNÜN DEĞERLENDİRİLMESİ ZAMANI VE YANSITMA TUTANAĞI
          </div>
          <div className="of-header-meta-ref">MEB TTKB Günlük Rutinler (Rutin 5, Sayfa 92, 100–102)</div>
        </div>

        <div className="of-meta-grid">
          <div className="of-meta-field">
            <label className="of-meta-label">Okul / Kurum Adı:</label>
            <input
              type="text"
              className="of-meta-input"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Sınıf Öğretmeni:</label>
            <input
              type="text"
              className="of-meta-input"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Tarih:</label>
            <input
              type="date"
              className="of-meta-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Katılım Durumu:</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="number"
                className="of-meta-input"
                style={{ width: "70px" }}
                value={presentCount}
                onChange={(e) => setPresentCount(Number(e.target.value))}
              />
              <span>/ {totalCount} Çocuk Mevcut</span>
            </div>
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          Çember Zamanı 4 Temel Değerlendirme Boyutu
        </h4>

        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "35%", textAlign: "left" }}>Boyut ve Soru</th>
              <th style={{ width: "65%", textAlign: "left" }}>Çocukların Paylaşımları &amp; Ortak Çıkarım</th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dim) => (
              <tr key={dim.id} style={{ pageBreakInside: "avoid" }}>
                <td style={{ verticalAlign: "top" }}>
                  <strong style={{ display: "block", color: "#0f172a" }}>{dim.title}</strong>
                  <small style={{ color: "#64748b", fontStyle: "italic", display: "block", marginTop: "2px" }}>
                    "{dim.guidingQuestion}"
                  </small>
                </td>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={dim.notes}
                    onChange={(e) => handleDimensionChange(dim.id, e.target.value)}
                    style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "14px" }}>
          <label className="of-meta-label">
            Çocukların Ağzından Günün Cümleleri (Birebir Alıntılar):
          </label>
          {quotes.map((q, idx) => (
            <input
              key={idx}
              type="text"
              className="of-meta-input"
              value={q}
              onChange={(e) => handleQuoteChange(idx, e.target.value)}
              style={{ width: "100%", marginBottom: "6px", fontSize: "0.85rem" }}
            />
          ))}
        </div>

        <div style={{ marginTop: "12px" }}>
          <label className="of-meta-label">Öğretmenin Gün Sonu Pedagojik Yansıtması ve Yarın Hazırlığı:</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={teacherReflection}
            onChange={(e) => setTeacherReflection(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
          />
        </div>

        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">Sınıf Öğretmeni</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Okul Müdürü</div>
            <div className="of-sig-name">Görülmüştür</div>
            <div className="of-sig-line">Mühür ve İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
