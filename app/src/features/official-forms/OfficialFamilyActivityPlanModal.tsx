import { useState } from "react";
import "./official-forms.css";

export function OfficialFamilyActivityPlanModal({ onClose }: { onClose?: () => void }) {
  const [parentName, setParentName] = useState("Ayşe Yılmaz (Veli)");
  const [studentName, setStudentName] = useState("Can Yılmaz (Öğrenci)");
  const [parentProfession, setParentProfession] = useState("Geleneksel El Sanatları Ustası / Ebru Sanatçısı");
  const [activityName, setActivityName] = useState("Renklerin Dansı: Geleneksel Ebru Sanatı Atölyesi");
  const [activityType, setActivityType] = useState("Sanat ve Kültürel Miras Etkinliği");
  const [date, setDate] = useState("2026-09-15");
  const [duration, setDuration] = useState("40 Dakika");
  const [targetSkills, setTargetSkills] = useState(
    "Sanat Alan Becerisi (SNAB.4 Sanatsal Uygulama Yapma), İnce Motor Beceriler, Sabır ve Öz Denetim Değerleri (ED1, ED2)"
  );
  const [materials, setMaterials] = useState(
    "Ebru teknesi, kitreli su, doğal toprak boyalar, at kılı fırçalar, bizler, kurutma kağıtları, koruyucu önlükler (Veli tarafından temin edilmiştir)."
  );
  const [introStep, setIntroStep] = useState(
    "Veli kendini ve mesleğini/uğraşını tanıtır. Ebru sanatının tarihi ve kitreli suyun sırrı çocuklara hikaye gibi anlatılır. Çocukların teknedeki suya dokunarak kıvamını hissetmeleri sağlanır."
  );
  const [devStep, setDevStep] = useState(
    "Her çocuk sırayla tekne başına gelir. Fırçayla boya serperek su üzerinde damlalar oluşturur. Biz kullanarak laleler, çiçekler veya dalgalar çizer. Kağıt teknenin üzerine bırakılıp çekilerek çocuğun eseri somutlaştırılır."
  );
  const [conclusionStep, setConclusionStep] = useState(
    "Ürünler kuruma panosuna asılır. Çocuklar eserlerine isim verirler ('Gökkuşağı Havuzu', 'Büyülü Bahçe' vb.). Sınıfça veliye teşekkür edilir ve öğrencilerin hazırladığı teşekkür çiçeği takdim edilir."
  );
  const [parentNotes, setParentNotes] = useState(
    "Çocukların merakı ve teknede boyaların yayılmasını izlerken duydukları heyecan büyüleyiciydi. Hepsi çok dikkatli ve saygılıydı."
  );
  const [teacherEvaluation, setTeacherEvaluation] = useState(
    "Aile katılımı sınıf iklimine olağanüstü zenginlik katmıştır. Çocukların kültürel mirasımıza yönelik farkındalıkları artmış, odaklanma süreleri ve estetik duyarlılıkları desteklenmiştir."
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Aile_Katilimi_Etkinlik_Plani</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; }
        .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 10pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          AİLE KATILIMI ETKİNLİK UYGULAMA PLANI
        </div>
        <table>
          <tr><td><b>Katılımcı Veli:</b> ${parentName}</td><td><b>Öğrencinin Adı:</b> ${studentName}</td></tr>
          <tr><td><b>Velinin Mesleği/Alanı:</b> ${parentProfession}</td><td><b>Uygulama Tarihi:</b> ${date} (${duration})</td></tr>
          <tr><td colspan='2'><b>Etkinliğin Adı:</b> ${activityName}</td></tr>
          <tr><td colspan='2'><b>Etkinliğin Türü:</b> ${activityType}</td></tr>
          <tr><td colspan='2'><b>Hedeflenen Beceriler ve Değerler:</b> ${targetSkills}</td></tr>
          <tr><td colspan='2'><b>Kullanılacak Materyaller:</b> ${materials}</td></tr>
        </table>
        <h4>Uygulama Aşamaları</h4>
        <p><b>1. Giriş ve Isınma (Merak Uyandırma):</b><br/>${introStep}</p>
        <p><b>2. Gelişme ve Uygulama (Birlikte Deneyimleme):</b><br/>${devStep}</p>
        <p><b>3. Sonuç ve Değerlendirme (Ürün ve Paylaşım):</b><br/>${conclusionStep}</p>
        <h4>Süreç Değerlendirmeleri</h4>
        <p><b>Katılımcı Velinin Duygu ve Görüşleri:</b><br/>${parentNotes}</p>
        <p><b>Öğretmenin Pedagojik Değerlendirmesi:</b><br/>${teacherEvaluation}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Katılımcı Veli</b><br/><br/>${parentName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>Emine Öğretmen<br/>İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Aile_Katilimi_Plani_${date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = [
      { section: "Etkinlik Künyesi", item: "Katılımcı Veli", detail: parentName },
      { section: "Etkinlik Künyesi", item: "Öğrenci", detail: studentName },
      { section: "Etkinlik Künyesi", item: "Velinin Mesleği / Uzmanlık Alanı", detail: parentProfession },
      { section: "Etkinlik Künyesi", item: "Uygulama Tarihi ve Süresi", detail: `${date} (${duration})` },
      { section: "Etkinlik Künyesi", item: "Etkinliğin Adı", detail: activityName },
      { section: "Etkinlik Künyesi", item: "Etkinliğin Türü", detail: activityType },
      { section: "Pedagojik Çerçeve", item: "Hedeflenen Beceriler ve Değerler", detail: targetSkills },
      { section: "Pedagojik Çerçeve", item: "Kullanılacak Materyaller", detail: materials },
      { section: "Uygulama Aşamaları", item: "1. Giriş ve Isınma (Merak Uyandırma)", detail: introStep },
      { section: "Uygulama Aşamaları", item: "2. Gelişme ve Uygulama (Birlikte Deneyimleme)", detail: devStep },
      { section: "Uygulama Aşamaları", item: "3. Sonuç ve Değerlendirme (Ürün & Paylaşım)", detail: conclusionStep },
      { section: "Süreç Değerlendirmesi", item: "Katılımcı Velinin Görüş ve Duyguları", detail: parentNotes },
      { section: "Süreç Değerlendirmesi", item: "Öğretmenin Pedagojik Değerlendirmesi", detail: teacherEvaluation },
    ];

    await exportOfficialTableToExcel({
      fileName: `MEB_Aile_Katilimi_Etkinlik_Plani_${date}`,
      sheetName: "Aile Katılım Planı",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — AİLE KATILIMI ETKİNLİK UYGULAMA PLANI",
      subtitle: `${activityName} · Veli: ${parentName} · Öğrenci: ${studentName} · Tarih: ${date}`,
      metadata: [
        { label: "Katılımcı Veli", value: parentName },
        { label: "Öğrenci", value: studentName },
        { label: "Uygulama Tarihi", value: `${date} (${duration})` },
        { label: "Etkinlik Türü", value: activityType },
      ],
      columns: [
        { header: "Bölüm", key: "section", width: 22, align: "left" },
        { header: "Plan Maddesi", key: "item", width: 35, align: "left" },
        { header: "İçerik ve Açıklama", key: "detail", width: 65, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 94–96</span>
          <span className="of-tag of-tag--navy">Aile ve Toplum Katılımı</span>
          <span className="of-tag of-tag--emerald">Sınıf İçi Veli Etkinlik Planı</span>
        </div>
        <div className="of-actions-bar__right">
          <button
            type="button"
            className="of-btn"
            onClick={handleExportExcel}
            style={{ background: "#15803d", color: "#fff", borderColor: "#15803d" }}
          >
            📊 Excel (.xlsx)
          </button>
          <button type="button" className="of-btn of-btn--primary" onClick={handlePrint}>
            🖨️ A4 Yazdır / PDF
          </button>
          <button type="button" className="of-btn of-btn--outline" onClick={handleExportWord}>
            📄 Word (.doc) İndir
          </button>
          {onClose && (
            <button type="button" className="of-btn of-btn--close" onClick={onClose}>
              ✕ Kapat
            </button>
          )}
        </div>
      </div>

      {/* Printable A4 Sheet */}
      <div className="official-a4-sheet">
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            AİLE KATILIMI ETKİNLİK UYGULAMA PLANI
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, s. 94–96, EK-10
          </div>
        </div>

        {/* Identity Table */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "20%" }}><strong>Katılımcı Veli Adı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                />
              </td>
              <td style={{ width: "20%" }}><strong>Öğrencinin Adı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Velinin Mesleği/Alanı:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={parentProfession}
                  onChange={e => setParentProfession(e.target.value)}
                />
              </td>
              <td><strong>Uygulama Tarihi ve Süre:</strong></td>
              <td>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="date"
                    className="of-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                  <input
                    type="text"
                    className="of-input"
                    style={{ width: "90px" }}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td><strong>Etkinliğin Adı:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={activityName}
                  onChange={e => setActivityName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Etkinliğin Türü:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Hedef Beceriler &amp; Değerler:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={targetSkills}
                  onChange={e => setTargetSkills(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Kullanılacak Materyaller:</strong></td>
              <td colSpan={3}>
                <textarea
                  className="of-textarea"
                  rows={2}
                  value={materials}
                  onChange={e => setMaterials(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Stages */}
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e3a8a", fontSize: "0.95rem" }}>
            Etkinlik Uygulama Aşamaları
          </h3>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.85rem", color: "#0f172a" }}>
              1. Giriş ve Isınma (Tanışma ve Merak Uyandırma):
            </label>
            <textarea
              className="of-textarea"
              rows={2}
              value={introStep}
              onChange={e => setIntroStep(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.85rem", color: "#0f172a" }}>
              2. Gelişme ve Uygulama (Velinin Rehberliğinde Birlikte Üretim):
            </label>
            <textarea
              className="of-textarea"
              rows={3}
              value={devStep}
              onChange={e => setDevStep(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.85rem", color: "#0f172a" }}>
              3. Sonuç ve Değerlendirme (Ürünlerin Sergilenmesi ve Teşekkür):
            </label>
            <textarea
              className="of-textarea"
              rows={2}
              value={conclusionStep}
              onChange={e => setConclusionStep(e.target.value)}
            />
          </div>
        </div>

        {/* Reflections */}
        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.85rem", color: "#1e3a8a" }}>
              Katılımcı Velinin Görüş ve Duyguları:
            </label>
            <textarea
              className="of-textarea"
              rows={3}
              value={parentNotes}
              onChange={e => setParentNotes(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.85rem", color: "#1e3a8a" }}>
              Öğretmenin Pedagojik Değerlendirmesi:
            </label>
            <textarea
              className="of-textarea"
              rows={3}
              value={teacherEvaluation}
              onChange={e => setTeacherEvaluation(e.target.value)}
            />
          </div>
        </div>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Katılımcı Veli</span>
            <span className="of-signature-block__name">{parentName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">Emine Öğretmen</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
