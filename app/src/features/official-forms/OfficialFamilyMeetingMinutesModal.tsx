import { useState } from "react";
import "./official-forms.css";

interface MeetingDecision {
  id: string;
  topic: string;
  decision: string;
}

interface ParentAttendee {
  id: string;
  studentName: string;
  parentName: string;
  phone: string;
  signed: boolean;
}

const DEFAULT_DECISIONS: MeetingDecision[] = [
  {
    id: "d1",
    topic: "TYMM Müfredat Yaklaşımı",
    decision: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Programı'nın ezberden uzak, süreç odaklı ve oyun temelli yapısı velilere anlatıldı. Çocukların beceri edinimlerinin portfolyo ve gözlem kayıtlarıyla takip edileceği kararlaştırıldı.",
  },
  {
    id: "d2",
    topic: "Giriş-Çıkış ve Beslenme Rutinleri",
    decision: "Sabah kahvaltısının evde hafif yapılması, sınıfta sağlıklı beslenme ve su içme alışkanlığının desteklenmesi; paketli işlenmiş gıdaların okula getirilmemesi oy birliğiyle kabul edildi.",
  },
  {
    id: "d3",
    topic: "Aile Katılımı ve Atölyeler",
    decision: "EK-10 Aile Katılımı Formları doğrultusunda her hafta bir velinin sınıfta meslek tanıtımı, geleneksel sanat veya masal atölyesi gerçekleştirmesi takvime bağlandı.",
  },
  {
    id: "d4",
    topic: "Ekran Süresi ve Dijital Güvenlik",
    decision: "Ev ortamında çocukların günlük ekran süresinin 30 dakikayı geçmemesi, sınıf içi etkinlik fotoğraf ve videolarının sosyal medyada paylaşılmaması hususunda mutabakata varıldı.",
  },
];

const DEFAULT_ATTENDEES: ParentAttendee[] = [
  { id: "a1", studentName: "Demir Korkmaz", parentName: "Ahmet Korkmaz", phone: "0555 111 22 33", signed: true },
  { id: "a2", studentName: "Zeynep Aslan", parentName: "Merve Aslan", phone: "0555 222 33 44", signed: true },
  { id: "a3", studentName: "Kerem Aydın", parentName: "Fatma Aydın", phone: "0555 333 44 55", signed: true },
  { id: "a4", studentName: "Elif Şahin", parentName: "Mehmet Şahin", phone: "0555 444 55 66", signed: true },
  { id: "a5", studentName: "Can Yılmaz", parentName: "Ayşe Yılmaz", phone: "0555 555 66 77", signed: true },
  { id: "a6", studentName: "Defne Çelik", parentName: "Mustafa Çelik", phone: "0555 666 77 88", signed: true },
];

export function OfficialFamilyMeetingMinutesModal({ onClose }: { onClose?: () => void }) {
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [className, setClassName] = useState("Papatyalar Sınıfı (60-72 Ay)");
  const [meetingDate, setMeetingDate] = useState("2026-09-15");
  const [meetingTitle, setMeetingTitle] = useState("2026-2027 Eğitim-Öğretim Yılı Sene Başı Genel Veli Toplantısı");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [decisions, setDecisions] = useState<MeetingDecision[]>(DEFAULT_DECISIONS);
  const [attendees, setAttendees] = useState<ParentAttendee[]>(DEFAULT_ATTENDEES);

  const handleUpdateDecision = (id: string, field: "topic" | "decision", value: string) => {
    setDecisions(prev => prev.map(d => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Veli_Toplantisi_Tutanagi</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.3; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 9.5pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          GENEL VELİ TOPLANTISI TUTANAĞI VE ALINAN KARARLAR
        </div>
        <table>
          <tr><td><b>Okul Adı:</b> ${schoolName}</td><td><b>Şube:</b> ${className}</td></tr>
          <tr><td><b>Toplantı Tarihi:</b> ${meetingDate}</td><td><b>Toplantı Başkanı:</b> ${teacherName}</td></tr>
          <tr><td colspan='2'><b>Toplantı Konusu:</b> ${meetingTitle}</td></tr>
        </table>
        <h4>Görüşülen Gündem Maddeleri ve Alınan Kararlar</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 30%'>Gündem Konusu</th>
              <th style='width: 70%'>Alınan Ortak Karar ve Uygulama Esasları</th>
            </tr>
          </thead>
          <tbody>
            ${decisions.map(d => `
              <tr>
                <td><b>${d.topic}</b></td>
                <td>${d.decision}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h4>Toplantıya Katılan Veli İmza Listesi</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 30px;'>No</th>
              <th>Öğrencinin Adı Soyadı</th>
              <th>Velinin Adı Soyadı</th>
              <th>İletişim Tel</th>
              <th style='width: 80px;'>İmza</th>
            </tr>
          </thead>
          <tbody>
            ${attendees.map((a, idx) => `
              <tr>
                <td style='text-align:center;'>${idx + 1}</td>
                <td>${a.studentName}</td>
                <td>${a.parentName}</td>
                <td>${a.phone}</td>
                <td style='text-align:center;'>${a.signed ? 'İmzalandı' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni / Yazman</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Onay<br/>Mühür / İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Veli_Toplantisi_Tutanagi_${meetingDate}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = [
      ...decisions.map((d, i) => ({
        type: "Gündem ve Karar",
        col1: `Madde ${i + 1}: ${d.topic}`,
        col2: d.decision,
        col3: "Oy Birliği ile Kabul Edildi",
      })),
      ...attendees.map((a, i) => ({
        type: "Katılımcı Veli Hazirun",
        col1: `${i + 1}. ${a.parentName} (${a.studentName} Velisi)`,
        col2: `İletişim: ${a.phone}`,
        col3: a.signed ? "İmzalandı [✓]" : "İmza Eksik [✗]",
      })),
    ];

    await exportOfficialTableToExcel({
      fileName: `MEB_Veli_Toplantisi_Tutanagi_${meetingDate}`,
      sheetName: "Toplantı Tutanağı",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — GENEL VELİ TOPLANTISI TUTANAĞI VE ALINAN KARARLAR",
      subtitle: `${schoolName} · ${className} · Tarih: ${meetingDate} · Başkan: ${teacherName}`,
      metadata: [
        { label: "Okul", value: schoolName },
        { label: "Şube", value: className },
        { label: "Toplantı Başlığı", value: meetingTitle },
        { label: "Tarih", value: meetingDate },
        { label: "Toplantı Başkanı", value: teacherName },
        { label: "Katılımcı Veli Sayısı", value: `${attendees.length} Veli` },
      ],
      columns: [
        { header: "Kayıt Türü", key: "type", width: 22, align: "left" },
        { header: "Gündem Başlığı / Veli Bilgisi", key: "col1", width: 35, align: "left" },
        { header: "Alınan Karar / İletişim Detayı", key: "col2", width: 55, align: "left" },
        { header: "Durum / İmza", key: "col3", width: 25, align: "center" },
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
          <span className="of-tag of-tag--navy">Aile Katılımı</span>
          <span className="of-tag of-tag--emerald">Veli Toplantı Tutanağı &amp; Kararları</span>
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

      {/* Printable Sheet */}
      <div className="official-a4-sheet">
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            GENEL VELİ TOPLANTISI TUTANAĞI VE ALINAN KARARLAR
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, s. 94–96
          </div>
        </div>

        {/* Identity Table */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "20%" }}><strong>Okul Adı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                />
              </td>
              <td style={{ width: "20%" }}><strong>Şube / Yaş Grubu:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Toplantı Tarihi:</strong></td>
              <td>
                <input
                  type="date"
                  className="of-input"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                />
              </td>
              <td><strong>Toplantı Başkanı:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Toplantı Başlığı / No:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Decisions Table */}
        <h3 style={{ margin: "1rem 0 0.4rem 0", color: "#1e3a8a", fontSize: "0.95rem" }}>
          Görüşülen Gündem Maddeleri ve Alınan Kararlar
        </h3>
        <table className="of-data-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Gündem Konusu</th>
              <th style={{ width: "70%" }}>Alınan Ortak Karar ve Uygulama Esasları</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  <input
                    type="text"
                    className="of-input"
                    value={d.topic}
                    onChange={e => handleUpdateDecision(d.id, "topic", e.target.value)}
                  />
                </td>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={d.decision}
                    onChange={e => handleUpdateDecision(d.id, "decision", e.target.value)}
                    style={{ fontSize: "0.85rem" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Attendee Signatures Table */}
        <h3 style={{ margin: "1rem 0 0.4rem 0", color: "#1e3a8a", fontSize: "0.95rem" }}>
          Toplantıya Katılan Veli İmza Listesi
        </h3>
        <table className="of-data-table" style={{ fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ width: "30px", textAlign: "center" }}>No</th>
              <th>Öğrencinin Adı Soyadı</th>
              <th>Velinin Adı Soyadı</th>
              <th>İletişim Telefonu</th>
              <th style={{ width: "80px", textAlign: "center" }}>İmza</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a, idx) => (
              <tr key={a.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td>{a.studentName}</td>
                <td>{a.parentName}</td>
                <td>{a.phone}</td>
                <td style={{ textAlign: "center", fontStyle: "italic", color: "#16a34a" }}>İmza</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Closing Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Toplantı Başkanı / Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Okul Müdürü</span>
            <span className="of-signature-block__name">İnceleme ve Onay</span>
            <span className="of-signature-block__sign">Mühür / İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
