import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export function OfficialConflictResolutionModal({ onClose }: { onClose?: () => void }) {
  const [schoolName, setSchoolName] = useOfficialFormState("schoolName", "Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useOfficialFormState("teacherName", "Okul Öncesi Öğretmeni");
  const [date, setDate] = useOfficialFormState("date", "2026-09-15");
  const [childA, setChildA] = useOfficialFormState("childA", "Demir Korkmaz");
  const [childB, setChildB] = useOfficialFormState("childB", "Caner Yıldız");
  const [location, setLocation] = useOfficialFormState("location", "Blok ve İnşa Merkezi");
  const [incidentDescription, setIncidentDescription] = useOfficialFormState("incidentDescription",
    "Aynı renkli büyük ahşap bloğu her iki öğrenci de aynı anda kulesinde kullanmak istedi; aralarında çekişme ve ses yükselmesi yaşandı."
  );

  const [step1CoolDown, setStep1CoolDown] = useOfficialFormState("step1CoolDown",
    "Öğrenciler 'Barış Masası'na davet edildi. 3 kez derin çiçek koklama ve mum üfleme nefesi alındı; duygular yatıştırıldı."
  );

  const [step2ListeningA, setStep2ListeningA] = useOfficialFormState("step2ListeningA",
    "Demir: 'Ben o bloğu şato çatısı için en baştan planlamıştım, Caner elimden çekince çok kızdım.'"
  );

  const [step2ListeningB, setStep2ListeningB] = useOfficialFormState("step2ListeningB",
    "Caner: 'Ben de köprü yapıyordum, uzun blok sadece o kalmıştı, vermeyince üzüldüm.'"
  );

  const [step3Empathy, setStep3Empathy] = useOfficialFormState("step3Empathy",
    "Her iki öğrenciye de 'Arkadaşın böyle hissedince sen ne hissettin?' sorusu yöneltildi. Birbirlerinin hayal kırıklığını fark ettiler."
  );

  const [step4Solution, setStep4Solution] = useOfficialFormState("step4Solution",
    "Ortak Çözüm: Bloğun önce köprüde 10 dakika kullanılması, ardından şato çatısına aktarılması kararlaştırıldı. Kum saati ters çevrildi ve el sıkışıldı."
  );

  const [teacherFollowup, setTeacherFollowup] = useOfficialFormState("teacherFollowup",
    "Öğrenciler süre sonunda bloğu nezaketle birbirine devretti. Gün sonu çemberinde adalet ve sabır örneği olarak takdir edildiler."
  );

  const handlePrint = () => {
    printOfficialFormA4(`Baris_Masasi_Cozum_Protokolu_${date}`);
  };

  const handleExportWord = () => downloadOfficialFormWord("OfficialConflictResolutionModal");

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
            📄 Word İndir (.docx)
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
