import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export function OfficialGuidanceReferralForm({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useState("Kerem Aydın");
  const [studentAge, setStudentAge] = useState("61 Ay");
  const [parentContact, setParentContact] = useState("Fatma Aydın (Anne) - 0555 123 45 67");
  const [referralDate, setReferralDate] = useState("2026-09-15");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [referralReason, setReferralReason] = useState<string[]>(["akran_uyum", "duygusal"]);
  const [customReason, setCustomReason] = useState("");
  const [observations, setObservations] = useState(
    "Serbest oyun ve merkez zamanlarında akranlarıyla iletişime girmekte çekingen davranmakta, oyuncağı elinden alındığında yoğun ağlama ve içe kapanma tepkisi göstermektedir. Güne başlama çemberinde konuşmaktan kaçınmaktadır."
  );
  const [classroomInterventions, setClassroomInterventions] = useState(
    "1. Blok ve dramatik oyun merkezinde sakin bir akranla ikili eşleştirme yapıldı.\n2. Duyguları tanıma kartlarıyla 'Bugün Nasıl Hissediyorum?' sohbeti gerçekleştirildi.\n3. Başardığı küçük görevlerden sonra sözel pekiştireçle desteklendi."
  );
  const [familyMeetings, setFamilyMeetings] = useState(
    "08.09.2026 tarihinde veliyle yüz yüze görüşüldü. Ev ortamında da benzer çekingenlik ve kardeşiyle paylaşım zorluğu yaşandığı ifade edildi. Aile okul rehberliği desteğine açık olduğunu belirtti."
  );
  const [referralExpectation, setReferralExpectation] = useState(
    "Öğrencinin sosyal-duygusal uyumunun, ayrılık kaygısının ve öz güven gelişiminin okul rehberlik ve psikolojik danışma servisi tarafından bireysel gözlem ve oyun terapisi/rehberlik seanslarıyla incelenmesi rica olunur."
  );

  const REASONS = [
    { id: "akran_uyum", label: "Sosyal Uyum & Akran İlişkileri" },
    { id: "duygusal", label: "Ayrılık Kaygısı & Yoğun Duygu Dalgalanmaları" },
    { id: "odaklanma", label: "Aşırı Hareketlilik & Dikkat/Odaklanma Güçlüğü" },
    { id: "dil_konusma", label: "Dil ve Konuşma Becerilerinde Destek İhtiyacı" },
    { id: "ustun_yetenek", label: "İleri Düzey Bilişsel Merak / Üstün Yetenek Sinyalleri" },
    { id: "oz_bakim", label: "Öz Bakım ve Beslenme Alışkanlıkları" },
  ];

  const handleToggleReason = (id: string) => {
    setReferralReason(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    printOfficialFormA4(`Rehberlik_Yonlendirme_Formu_${studentName.replace(/\s+/g, '_')}`);
  };

  const handleExportWord = () => {
    const reasonLabels = referralReason
      .map(r => REASONS.find(item => item.id === r)?.label)
      .filter(Boolean)
      .join(", ");

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Rehberlik_Yonlendirme_${studentName}</title>
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
          REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ ÖĞRENCİ YÖNLENDİRME FORMU
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${studentName}</td><td><b>Yaş / Ay:</b> ${studentAge}</td></tr>
          <tr><td><b>Veli Bilgisi ve İletişim:</b> ${parentContact}</td><td><b>Tarih:</b> ${referralDate}</td></tr>
          <tr><td colspan='2'><b>Sınıf Öğretmeni:</b> ${teacherName}</td></tr>
          <tr><td colspan='2'><b>Yönlendirme Alanları:</b> ${reasonLabels} ${customReason ? ' - ' + customReason : ''}</td></tr>
        </table>
        <p><b>1. Sınıf İçi Gözlenen Durumlar ve Belirtiler:</b><br/>${observations}</p>
        <p><b>2. Sınıfta Uygulanan Önleyici ve Destekleyici Tedbirler:</b><br/>${classroomInterventions}</p>
        <p><b>3. Aile ile Yapılan Görüşmelerin Özeti:</b><br/>${familyMeetings}</p>
        <p><b>4. Rehberlik Servisinden Beklentiler ve Öneriler:</b><br/>${referralExpectation}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Rehberlik Öğretmeni / PDR</b><br/><br/>Teslim Alan<br/>İmza / Tarih</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Rehberlik_Yonlendirme_${studentName.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const reasonLabels = referralReason
      .map((r) => REASONS.find((item) => item.id === r)?.label)
      .filter(Boolean)
      .join(", ");

    await exportOfficialTableToExcel({
      fileName: `MEB_Rehberlik_Yonlendirme_${studentName.replace(/\s+/g, '_')}`,
      sheetName: "PDR Yönlendirme",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — REHBERLİK SERVİSİ ÖĞRENCİ YÖNLENDİRME FORMU",
      subtitle: `${studentName} (${studentAge}) · Tarih: ${referralDate} · Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Öğrenci", value: studentName },
        { label: "Yaş / Ay", value: studentAge },
        { label: "Veli & İletişim", value: parentContact },
        { label: "Tarih", value: referralDate },
        { label: "Öğretmen", value: teacherName },
      ],
      columns: [
        { header: "Bölüm", key: "section", width: 28, align: "left" },
        { header: "Açıklama ve Pedagojik Detay", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { section: "YÖNLENDİRME ALANLARI", content: reasonLabels + (customReason ? ` - ${customReason}` : "") },
        { section: "1. SINIF İÇİ GÖZLENEN DURUMLAR", content: observations },
        { section: "2. UYGULANAN ÖNLEYİCİ TEDBİRLER", content: classroomInterventions },
        { section: "3. VELİ GÖRÜŞMELERİ ÖZETİ", content: familyMeetings },
        { section: "4. PDR SERVİSİNDEN BEKLENTİLER", content: referralExpectation },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 81–84</span>
          <span className="of-tag of-tag--navy">PDR &amp; Rehberlik</span>
          <span className="of-tag of-tag--emerald">Öğrenci Yönlendirme ve Takip Formu</span>
        </div>
        <div className="of-actions-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="PDR yönlendirme formunu Excel (.xlsx) olarak indir"
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

      {/* Printable Sheet */}
      <div className="official-a4-sheet">
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ ÖĞRENCİ YÖNLENDİRME FORMU
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, Bölüm 10 (s. 81–84)
          </div>
        </div>

        {/* Identity Table */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "20%" }}><strong>Öğrencinin Adı Soyadı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                />
              </td>
              <td style={{ width: "20%" }}><strong>Yaş / Ay Düzeyi:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={studentAge}
                  onChange={e => setStudentAge(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Veli Adı &amp; İletişim:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={parentContact}
                  onChange={e => setParentContact(e.target.value)}
                />
              </td>
              <td><strong>Yönlendirme Tarihi:</strong></td>
              <td>
                <input
                  type="date"
                  className="of-input"
                  value={referralDate}
                  onChange={e => setReferralDate(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Sınıf Öğretmeni:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Reason Selector Chips */}
        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "6px", color: "#1e3a8a", fontSize: "0.9rem" }}>
            Yönlendirme Nedeni ve Gözlem Alanları:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
            {REASONS.map(r => {
              const selected = referralReason.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`of-chip ${selected ? "is-selected" : ""}`}
                  onClick={() => handleToggleReason(r.id)}
                >
                  {selected ? "✓ " : "+ "}
                  {r.label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            className="of-input"
            placeholder="Varsa diğer özel durum..."
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
          />
        </div>

        {/* Observation Details */}
        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#0f172a", fontSize: "0.85rem" }}>
            1. Sınıf İçi Gözlenen Durumlar ve Somut Davranış Göstergeleri:
          </label>
          <textarea
            className="of-textarea"
            rows={3}
            value={observations}
            onChange={e => setObservations(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#0f172a", fontSize: "0.85rem" }}>
            2. Sınıfta Öğretmen Tarafından Uygulanan Önleyici ve Destekleyici Tedbirler:
          </label>
          <textarea
            className="of-textarea"
            rows={3}
            value={classroomInterventions}
            onChange={e => setClassroomInterventions(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#0f172a", fontSize: "0.85rem" }}>
            3. Aile ile Yapılan Görüşmeler ve Ailenin Yaklaşımı:
          </label>
          <textarea
            className="of-textarea"
            rows={2}
            value={familyMeetings}
            onChange={e => setFamilyMeetings(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#0f172a", fontSize: "0.85rem" }}>
            4. Okul Rehberlik ve Psikolojik Danışma Servisinden Beklentiler:
          </label>
          <textarea
            className="of-textarea"
            rows={2}
            value={referralExpectation}
            onChange={e => setReferralExpectation(e.target.value)}
          />
        </div>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Rehber Öğretmen / Psikolojik Danışman</span>
            <span className="of-signature-block__name">Teslim Alan</span>
            <span className="of-signature-block__sign">İmza / Tarih</span>
          </div>
        </div>
      </div>
    </div>
  );
}
