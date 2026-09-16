import { useState } from "react";
import "./official-forms.css";

export function OfficialStudentIntakeFormModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useState("Demir Korkmaz");
  const [birthDate, setBirthDate] = useState("2021-04-12");
  const [bloodType, setBloodType] = useState("A Rh(+)");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [parentName, setParentName] = useState("Ahmet Korkmaz (Baba) / Zeliha Korkmaz (Anne)");
  const [parentPhone, setParentPhone] = useState("0532 111 22 33");
  const [emergencyContact, setEmergencyContact] = useState("Fatma Korkmaz (Büyükanne) - 0533 444 55 66");
  const [pickupAuthPersons, setPickupAuthPersons] = useState("Anne (Zeliha Korkmaz), Baba (Ahmet Korkmaz), Büyükanne (Fatma Korkmaz)");

  const [allergies, setAllergies] = useState("Yumurta akı ve fındık alerjisi mevcuttur (Hafif deri döküntüsü yapar).");
  const [chronicDiseases, setChronicDiseases] = useState("Bilinen kronik rahatsızlığı veya düzenli kullandığı ilaç yoktur.");
  const [nutritionHabits, setNutritionHabits] = useState("Kendi kendine kaşık/çatal kullanarak yer. Sebze yemeklerinde seçicidir, meyve ve çorbaları sever.");
  const [toiletIndependence, setToiletIndependence] = useState("Tuvalet ihtiyacını bağımsız karşılar, sifon çeker ve el yıkama rutinini bilir.");
  const [sleepHabits, setSleepHabits] = useState("Öğle uykusu uyumaz; dinlenme saatinde masal dinler veya minder köşesinde kitap inceler.");
  const [fearsAndCalming, setFearsAndCalming] = useState("Yüksek gök gürültüsü ve ani karanlıktan çekinir. Kucağa alınıp sırtı sıvazlandığında hızla sakinleşir.");
  const [specialInterests, setSpecialInterests] = useState("Dinozorlar, taşıtlar, ahşap bloklarla köprü yapma ve parmak boyası.");

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Ogrenciyi_Tanima_Formu_${studentName.replace(/\s+/g, "_")}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.35; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 5px 8px; font-size: 9pt; }
        th { background-color: #f2f2f2; text-align: left; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          SENE BAŞI ÖĞRENCİYİ TANIMA VE AİLE BİLGİ FORMU
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${studentName}</td><td><b>Doğum Tarihi:</b> ${birthDate}</td></tr>
          <tr><td><b>Kan Grubu:</b> ${bloodType}</td><td><b>Sınıf Öğretmeni:</b> ${teacherName}</td></tr>
          <tr><td><b>Anne & Baba Adı:</b> ${parentName}</td><td><b>İletişim Telefonu:</b> ${parentPhone}</td></tr>
          <tr><td><b>Acil Durum Kişisi:</b> ${emergencyContact}</td><td><b>Kurum / Okul:</b> ${schoolName}</td></tr>
          <tr><td colspan='2'><b>Okuldan Teslim Almaya Yetkili Kişiler:</b> ${pickupAuthPersons}</td></tr>
        </table>
        <h4>1. Sağlık ve Alerji Bilgileri</h4>
        <table>
          <tr><th style='width: 30%'>Besin / İlaç Alerjisi</th><td>${allergies}</td></tr>
          <tr><th>Kronik Rahatsızlık</th><td>${chronicDiseases}</td></tr>
        </table>
        <h4>2. Günlük Yaşam ve Öz Bakım Alışkanlıkları</h4>
        <table>
          <tr><th style='width: 30%'>Beslenme Alışkanlığı</th><td>${nutritionHabits}</td></tr>
          <tr><th>Tuvalet Bağımsızlığı</th><td>${toiletIndependence}</td></tr>
          <tr><th>Uyku ve Dinlenme</th><td>${sleepHabits}</td></tr>
        </table>
        <h4>3. Duygusal Özellikler ve Özel İlgiler</h4>
        <table>
          <tr><th style='width: 30%'>Korkuları ve Sakinleşme</th><td>${fearsAndCalming}</td></tr>
          <tr><th>Özel İlgileri ve Sevdiği Oyunlar</th><td>${specialInterests}</td></tr>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Bilgileri Beyan Eden Veli</b><br/><br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Teslim Alan Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ogrenciyi_Tanima_Formu_${studentName.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `Ogrenciyi_Tanima_Formu_${studentName.replace(/\s+/g, "_")}`,
      sheetName: "Öğrenciyi Tanıma",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — SENE BAŞI ÖĞRENCİYİ TANIMA VE AİLE BİLGİ FORMU",
      subtitle: `${studentName} · Doğum: ${birthDate} · Kan Grubu: ${bloodType} · Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Öğrenci Adı Soyadı", value: studentName },
        { label: "Doğum Tarihi", value: birthDate },
        { label: "Kan Grubu", value: bloodType },
        { label: "Ebeveyn", value: parentName },
        { label: "İletişim", value: parentPhone },
        { label: "Öğretmen", value: teacherName },
      ],
      columns: [
        { header: "Kategori / Gelişim Alanı", key: "section", width: 28, align: "left" },
        { header: "Aile Beyanı ve Sağlık / Gelişim Detayları", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { section: "ACİL DURUM İLETİŞİMİ", content: `Telefon: ${parentPhone} | Acil Durum: ${emergencyContact}` },
        { section: "TESLİM ALMAYA YETKİLİLER", content: pickupAuthPersons },
        { section: "1. SAĞLIK VE ALERJİ", content: `Alerjiler: ${allergies}\nKronik Rahatsızlık: ${chronicDiseases}` },
        { section: "2. GÜNLÜK YAŞAM & ÖZ BAKIM", content: `Beslenme: ${nutritionHabits}\nTuvalet: ${toiletIndependence}\nUyku: ${sleepHabits}` },
        { section: "3. DUYGUSAL ÖZELLİKLER & İLGİLER", content: `Korkular ve Sakinleşme: ${fearsAndCalming}\nÖzel İlgiler ve Oyunlar: ${specialInterests}` },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 193–196</span>
          <h3 className="of-action-title">Öğrenciyi Tanıma ve Aile Bilgi Formu</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="Öğrenci tanıma formunu Excel (.xlsx) olarak indir"
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
            SENE BAŞI ÖĞRENCİYİ TANIMA VE AİLE BİLGİ FORMU
          </div>
          <div className="of-header-meta-ref">MEB TTKB Öğrenciyi Tanıma ve Uyum Standartları (Sayfa 193–196)</div>
        </div>

        <div className="of-meta-grid">
          <div className="of-meta-field">
            <label className="of-meta-label">Öğrencinin Adı Soyadı:</label>
            <input
              type="text"
              className="of-meta-input"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Doğum Tarihi:</label>
            <input
              type="date"
              className="of-meta-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Kan Grubu:</label>
            <input
              type="text"
              className="of-meta-input"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
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
          <div className="of-meta-field" style={{ gridColumn: "span 2" }}>
            <label className="of-meta-label">Anne / Baba Adı Soyadı:</label>
            <input
              type="text"
              className="of-meta-input"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Veli İletişim Telefonu:</label>
            <input
              type="text"
              className="of-meta-input"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Acil Durum İletişim Kişisi (Yedek):</label>
            <input
              type="text"
              className="of-meta-input"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>
          <div className="of-meta-field" style={{ gridColumn: "span 2" }}>
            <label className="of-meta-label">Okuldan Teslim Almaya Yetkili Kişiler:</label>
            <input
              type="text"
              className="of-meta-input"
              value={pickupAuthPersons}
              onChange={(e) => setPickupAuthPersons(e.target.value)}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          1. Sağlık, Alerji ve Acil Müdahale Bilgileri
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label className="of-meta-label">Besin / İlaç Alerjileri:</label>
            <textarea
              className="of-textarea"
              rows={2}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="of-meta-label">Kronik Rahatsızlık / Takip Notu:</label>
            <textarea
              className="of-textarea"
              rows={2}
              value={chronicDiseases}
              onChange={(e) => setChronicDiseases(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          2. Günlük Yaşam, Öz Bakım ve Beslenme Alışkanlıkları
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label className="of-meta-label">Beslenme Alışkanlığı:</label>
            <textarea
              className="of-textarea"
              rows={3}
              value={nutritionHabits}
              onChange={(e) => setNutritionHabits(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="of-meta-label">Tuvalet Bağımsızlığı:</label>
            <textarea
              className="of-textarea"
              rows={3}
              value={toiletIndependence}
              onChange={(e) => setToiletIndependence(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="of-meta-label">Uyku ve Dinlenme Alışkanlığı:</label>
            <textarea
              className="of-textarea"
              rows={3}
              value={sleepHabits}
              onChange={(e) => setSleepHabits(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          3. Sosyal-Duygusal İpuçları ve Bireysel İlgi Alanları
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label className="of-meta-label">Korkuları ve Sakinleşme Yöntemleri:</label>
            <textarea
              className="of-textarea"
              rows={2}
              value={fearsAndCalming}
              onChange={(e) => setFearsAndCalming(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="of-meta-label">Özel İlgileri ve Sevdiği Etkinlikler:</label>
            <textarea
              className="of-textarea"
              rows={2}
              value={specialInterests}
              onChange={(e) => setSpecialInterests(e.target.value)}
              style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">Bilgileri Beyan Eden Öğrenci Velisi</div>
            <div className="of-sig-name">Ad Soyad / İmza</div>
            <div className="of-sig-line">İmza</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Teslim Alan Sınıf Öğretmeni</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
