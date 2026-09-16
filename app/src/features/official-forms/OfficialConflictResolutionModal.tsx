import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export function OfficialConflictResolutionModal({ onClose }: { onClose?: () => void }) {
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [date, setDate] = useState("2026-09-15");
  const [childA, setChildA] = useState("Demir Korkmaz");
  const [childB, setChildB] = useState("Caner Yıldız");
  const [location, setLocation] = useState("Blok ve İnşa Merkezi");
  const [incidentDescription, setIncidentDescription] = useState(
    "Aynı renkli büyük ahşap bloğu her iki öğrenci de aynı anda kulesinde kullanmak istedi; aralarında çekişme ve ses yükselmesi yaşandı."
  );

  const [step1CoolDown, setStep1CoolDown] = useState(
    "Öğrenciler 'Barış Masası'na davet edildi. 3 kez derin çiçek koklama ve mum üfleme nefesi alındı; duygular yatıştırıldı."
  );

  const [step2ListeningA, setStep2ListeningA] = useState(
    "Demir: 'Ben o bloğu şato çatısı için en baştan planlamıştım, Caner elimden çekince çok kızdım.'"
  );

  const [step2ListeningB, setStep2ListeningB] = useState(
    "Caner: 'Ben de köprü yapıyordum, uzun blok sadece o kalmıştı, vermeyince üzüldüm.'"
  );

  const [step3Empathy, setStep3Empathy] = useState(
    "Her iki öğrenciye de 'Arkadaşın böyle hissedince sen ne hissettin?' sorusu yöneltildi. Birbirlerinin hayal kırıklığını fark ettiler."
  );

  const [step4Solution, setStep4Solution] = useState(
    "Ortak Çözüm: Bloğun önce köprüde 10 dakika kullanılması, ardından şato çatısına aktarılması kararlaştırıldı. Kum saati ters çevrildi ve el sıkışıldı."
  );

  const [teacherFollowup, setTeacherFollowup] = useState(
    "Öğrenciler süre sonunda bloğu nezaketle birbirine devretti. Gün sonu çemberinde adalet ve sabır örneği olarak takdir edildiler."
  );

  const handlePrint = () => {
    printOfficialFormA4(`Baris_Masasi_Cozum_Protokolu_${date}`);
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Baris_Masasi_ve_Catishma_Cozme_Tutanagi</title>
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
          BARIŞ MASASI VE AKRAN ÇATIŞMASI BARIŞÇIL ÇÖZÜM PROTOKOLÜ
        </div>
        <table>
          <tr><td><b>Okul / Kurum Adı:</b> ${schoolName}</td><td><b>Tarih / Saat:</b> ${date}</td></tr>
          <tr><td><b>1. Öğrenci:</b> ${childA}</td><td><b>2. Öğrenci:</b> ${childB}</td></tr>
          <tr><td><b>Olay Yeri / Merkez:</b> ${location}</td><td><b>Gözlemci / Arabulucu Öğretmen:</b> ${teacherName}</td></tr>
        </table>
        <h4>Olayın Özeti ve Çatışma Nedeni</h4>
        <p>${incidentDescription}</p>
        <h4>4 Adımlı Onarıcı Barış Masası Süreci (TTKB Sayfa 84, 108)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 30%'>Arabuluculuk Adımı</th>
              <th style='width: 70%'>Uygulama ve Çocuk İfadeleri</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><b>1. Adım: Sakinleşme & Duygu Tanıma</b></td><td>${step1CoolDown}</td></tr>
            <tr><td><b>2. Adım: Sırayla Dinleme & İfade</b></td><td>${step2ListeningA}<br/><br/>${step2ListeningB}</td></tr>
            <tr><td><b>3. Adım: Empati ve Duygu Yansıtması</b></td><td>${step3Empathy}</td></tr>
            <tr><td><b>4. Adım: Ortak Çözüm ve Anlaşma</b></td><td>${step4Solution}</td></tr>
          </tbody>
        </table>
        <h4>Öğretmenin İzleme ve Pekiştirme Notu</h4>
        <p>${teacherFollowup}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 33%;'><b>1. Öğrencinin Sembolü</b><br/><br/>(${childA})</td>
            <td style='border: none; text-align: center; width: 33%;'><b>2. Öğrencinin Sembolü</b><br/><br/>(${childB})</td>
            <td style='border: none; text-align: center; width: 34%;'><b>Arabulucu Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Baris_Masasi_ve_Catishma_Cozme_Tutanagi.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `Baris_Masasi_Tutanagi_${date.replace(/[^a-zA-Z0-9]/g, "_")}`,
      sheetName: "Barış Masası",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — BARIŞ MASASI VE AKRAN ÇATIŞMASI ÇÖZÜM PROTOKOLÜ",
      subtitle: `${schoolName} · Tarih: ${date} · Öğrenciler: ${childA} & ${childB} · Arabulucu: ${teacherName}`,
      metadata: [
        { label: "Okul Adı", value: schoolName },
        { label: "Tarih", value: date },
        { label: "1. Öğrenci", value: childA },
        { label: "2. Öğrenci", value: childB },
        { label: "Merkez / Yer", value: location },
        { label: "Arabulucu Öğretmen", value: teacherName },
      ],
      columns: [
        { header: "Protokol Adımı", key: "step", width: 28, align: "left" },
        { header: "Uygulama, Çocuk İfadeleri ve Pedagojik İzleme", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { step: "OLAY ÖZETİ VE ÇATIŞMA NEDENİ", content: incidentDescription },
        { step: "1. ADIM: SAKİNLEŞME & DUYGU TANIMA", content: step1CoolDown },
        { step: "2. ADIM: SIRAYLA DİNLEME & İFADE", content: `${childA}: ${step2ListeningA}\n${childB}: ${step2ListeningB}` },
        { step: "3. ADIM: EMPATİ VE DUYGU YANSITMASI", content: step3Empathy },
        { step: "4. ADIM: ORTAK ÇÖZÜM VE ANLAŞMA", content: step4Solution },
        { step: "ÖĞRETMENİN İZLEME VE GERİ BİLDİRİMİ", content: teacherFollowup },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 84, 108</span>
          <h3 className="of-action-title">Barış Masası &amp; Çatışma Çözme Protokolü</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="Barış masası tutanağını Excel (.xlsx) olarak indir"
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
            BARIŞ MASASI VE AKRAN ÇATIŞMASI BARIŞÇIL ÇÖZÜM PROTOKOLÜ
          </div>
          <div className="of-header-meta-ref">MEB TTKB Sosyal-Duygusal Beceriler ve Rehberlik (Sayfa 84, 108)</div>
        </div>

        <div className="of-meta-grid">
          <div className="of-meta-field">
            <label className="of-meta-label">1. Öğrenci:</label>
            <input
              type="text"
              className="of-meta-input"
              value={childA}
              onChange={(e) => setChildA(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">2. Öğrenci:</label>
            <input
              type="text"
              className="of-meta-input"
              value={childB}
              onChange={(e) => setChildB(e.target.value)}
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
            <label className="of-meta-label">Olay Yeri / Öğrenme Merkezi:</label>
            <input
              type="text"
              className="of-meta-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label className="of-meta-label">Çatışmanın Başlangıcı ve Somut Durum:</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
          />
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          4 Adımlı Barış Masası Uygulama Protokolü
        </h4>

        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "32%", textAlign: "left" }}>Arabuluculuk Adımı</th>
              <th style={{ width: "68%", textAlign: "left" }}>Süreç ve Çocuk İfadeleri</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ pageBreakInside: "avoid" }}>
              <td style={{ verticalAlign: "top" }}>
                <strong>1. Adım: Sakinleşme</strong>
                <small style={{ color: "#64748b", display: "block" }}>Derin nefes ve duygu termometresi</small>
              </td>
              <td>
                <textarea
                  className="of-textarea"
                  rows={2}
                  value={step1CoolDown}
                  onChange={(e) => setStep1CoolDown(e.target.value)}
                  style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                />
              </td>
            </tr>

            <tr style={{ pageBreakInside: "avoid" }}>
              <td style={{ verticalAlign: "top" }}>
                <strong>2. Adım: Sırayla Dinleme</strong>
                <small style={{ color: "#64748b", display: "block" }}>Her iki tarafın sözlü ifadesi</small>
              </td>
              <td>
                <div style={{ marginBottom: "6px" }}>
                  <small style={{ fontWeight: "bold", color: "#1d4ed8" }}>{childA}:</small>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={step2ListeningA}
                    onChange={(e) => setStep2ListeningA(e.target.value)}
                    style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <small style={{ fontWeight: "bold", color: "#059669" }}>{childB}:</small>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={step2ListeningB}
                    onChange={(e) => setStep2ListeningB(e.target.value)}
                    style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                  />
                </div>
              </td>
            </tr>

            <tr style={{ pageBreakInside: "avoid" }}>
              <td style={{ verticalAlign: "top" }}>
                <strong>3. Adım: Empati</strong>
                <small style={{ color: "#64748b", display: "block" }}>Karşı tarafın hissini anlama</small>
              </td>
              <td>
                <textarea
                  className="of-textarea"
                  rows={2}
                  value={step3Empathy}
                  onChange={(e) => setStep3Empathy(e.target.value)}
                  style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                />
              </td>
            </tr>

            <tr style={{ pageBreakInside: "avoid" }}>
              <td style={{ verticalAlign: "top" }}>
                <strong>4. Adım: Ortak Çözüm</strong>
                <small style={{ color: "#64748b", display: "block" }}>Uzlaşma, paylaşım veya dönüşümlü sıra</small>
              </td>
              <td>
                <textarea
                  className="of-textarea"
                  rows={2}
                  value={step4Solution}
                  onChange={(e) => setStep4Solution(e.target.value)}
                  style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "12px" }}>
          <label className="of-meta-label">Arabulucu Öğretmenin İzleme ve Pekiştirme Notu:</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={teacherFollowup}
            onChange={(e) => setTeacherFollowup(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
          />
        </div>

        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">1. Öğrenci</div>
            <div className="of-sig-name">{childA}</div>
            <div className="of-sig-line">Barış İşareti / Parmak</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">2. Öğrenci</div>
            <div className="of-sig-name">{childB}</div>
            <div className="of-sig-line">Barış İşareti / Parmak</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Arabulucu Sınıf Öğretmeni</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
