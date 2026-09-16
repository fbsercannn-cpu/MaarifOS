import { useState } from "react";
import "./official-forms.css";

interface DigitalRuleItem {
  id: string;
  title: string;
  description: string;
  parentCommitment: string;
}

const DIGITAL_RULES: DigitalRuleItem[] = [
  {
    id: "r1",
    title: "1. Pasif İzleme Yerine Etkileşimli ve Amaçlı Kullanım",
    description: "Dijital araçlar çocukları saatlerce ekran karşısında hareketsiz bırakan bir oyalama aracı olarak değil; merak ettiği bir hayvanı araştırma, sesleri dinleme veya problem çözme aracı olarak kullanılmalıdır.",
    parentCommitment: "Çocuğuma dijital cihazları sakinleştirici veya yemek yedirici bir ödül olarak sunmayacağımı taahhüt ederim.",
  },
  {
    id: "r2",
    title: "2. Günlük Ekran Süresi Sınırı (Maksimum 20–30 Dakika)",
    description: "Okul öncesi dönemde kontrolsüz ekran maruziyeti dikkat eksikliğine ve dil gelişiminde gecikmeye yol açmaktadır. Günde en fazla 20-30 dakika ve mutlaka bir yetişkin eşliğinde olmalıdır.",
    parentCommitment: "Evde ekran süresini 30 dakika ile sınırlayacağımı ve süreyi görsel bir zamanlayıcıyla yöneteceğimi taahhüt ederim.",
  },
  {
    id: "r3",
    title: "3. Dijital Mahremiyet ve Sosyal Medya Koruma Kalkanı",
    description: "Okulda ve sınıf içi etkinliklerde çocukların yüzlerinin, özel anlarının veya arkadaşlarının yer aldığı fotoğraf/videoların sosyal medya mecralarında herkese açık paylaşılması çocuğun yüksek yararına aykırıdır.",
    parentCommitment: "Sınıf içi etkinliklerde çekilen ve paylaşılan hiçbir çocuk fotoğrafını veya videosunu üçüncü şahıslarla ya da sosyal medyada paylaşmayacağımı kabul ederim.",
  },
  {
    id: "r4",
    title: "4. Kaliteli Uyku ve Mavi Işık İzolasyonu",
    description: "Yatmadan en az 1 saat önce televizyon, tablet ve telefon kullanımı tamamen sonlandırılmalıdır. Mavi ışık melatonin salgılanmasını baskılayarak uyku derinliğini ve zihinsel dinlenmeyi bozar.",
    parentCommitment: "Uykudan önceki 1 saatlik dilimde ekran yerine kitap okuma ve sohbet rutinini uygulayacağımı taahhüt ederim.",
  },
  {
    id: "r5",
    title: "5. Şiddet ve Reklamsız Pedagojik Güvenli Alan",
    description: "Çocukların eriştiği dijital içerikler hızlı geçişli reklamlar, subliminal mesajlar veya şiddet unsurları içermemelidir. Millî Eğitim Bakanlığı ve TRT Çocuk onaylı pedagojik içerikler tercih edilmelidir.",
    parentCommitment: "Cihazlarda ebeveyn denetimi filtresini aktif tutacağımı ve güvenli pedagojik kaynakları seçeceğimi taahhüt ederim.",
  },
];

export function OfficialDigitalLearningGuideModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useState("Demir Korkmaz");
  const [parentName, setParentName] = useState("Ahmet Korkmaz (Veli)");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [date, setDate] = useState("2026-09-15");

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Dijital_Ogrenme_ve_Ekran_Sozlesmesi</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.35; }
        .header { text-align: center; font-weight: bold; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 9.5pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          DİJİTAL ÖĞRENME, EKRAN SÜRESİ VE ÇOCUK MAHREMİYETİ TAAHHÜTNAMESİ
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${studentName}</td><td><b>Veli Adı Soyadı:</b> ${parentName}</td></tr>
          <tr><td><b>Okul / Kurum Adı:</b> ${schoolName}</td><td><b>Tarih:</b> ${date}</td></tr>
          <tr><td colspan='2'><b>Sınıf Öğretmeni:</b> ${teacherName}</td></tr>
        </table>
        <h4>Mevzuat İlkeleri ve Karşılıklı Aile Taahhütleri (TTKB Sayfa 107–108)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 45%'>Pedagojik İlke ve Bilinçli Kullanım Rehberi</th>
              <th style='width: 55%'>Velinin Kabul ve Uygulama Taahhüdü</th>
            </tr>
          </thead>
          <tbody>
            ${DIGITAL_RULES.map(r => `
              <tr>
                <td><b>${r.title}</b><br/><small>${r.description}</small></td>
                <td>[X] ${r.parentCommitment}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Öğrenci Velisi</b><br/><br/>${parentName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Dijital_Ogrenme_Taahhutnamesi_${studentName.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 107–108</span>
          <span className="of-tag of-tag--navy">Dijital Öğrenme Ortamları</span>
          <span className="of-tag of-tag--emerald">Ekran Bilinci &amp; Mahremiyet Taahhütnamesi</span>
        </div>
        <div className="of-actions-bar__right">
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
            DİJİTAL ÖĞRENME, EKRAN SÜRESİ VE ÇOCUK MAHREMİYETİ TAAHHÜTNAMESİ
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, Bölüm 13.3 (s. 107–108)
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
              <td style={{ width: "20%" }}><strong>Veli Adı Soyadı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Okul / Kurum Adı:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                />
              </td>
              <td><strong>Tarih:</strong></td>
              <td>
                <input
                  type="date"
                  className="of-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
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

        {/* Guidelines and Commitments */}
        <h3 style={{ margin: "1.2rem 0 0.5rem 0", color: "#1e3a8a", fontSize: "0.95rem" }}>
          Pedagojik İlkeler ve Karşılıklı Aile Taahhütleri (5 Altın Kural)
        </h3>
        <table className="of-data-table" style={{ fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ width: "45%" }}>MEB TYMM Dijital Öğrenme İlkesi</th>
              <th style={{ width: "55%" }}>Ailenin Ev Ortamında Uygulama Taahhüdü</th>
            </tr>
          </thead>
          <tbody>
            {DIGITAL_RULES.map(rule => (
              <tr key={rule.id}>
                <td>
                  <strong style={{ display: "block", color: "#1e3a8a", marginBottom: "4px" }}>
                    {rule.title}
                  </strong>
                  <span style={{ color: "#475569", lineHeight: "1.3" }}>
                    {rule.description}
                  </span>
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>[✓]</span>
                    <span style={{ fontStyle: "italic", color: "#0f172a" }}>
                      "{rule.parentCommitment}"
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Commitment Statement */}
        <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#64748b", lineHeight: "1.4" }}>
          * İşbu taahhütname, Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı
          13.3 Dijital Öğrenme Ortamları yönergeleri doğrultusunda çocuğun fiziksel, zihinsel ve sosyal-duygusal
          esenliğini korumak amacıyla hazırlanmış olup sene başında karşılıklı imzalanarak öğrenci gelişim dosyasına eklenir.
        </p>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Öğrenci Velisi</span>
            <span className="of-signature-block__name">{parentName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
