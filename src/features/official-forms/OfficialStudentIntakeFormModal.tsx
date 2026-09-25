import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export function OfficialStudentIntakeFormModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useOfficialFormState("studentName", "");
  const [birthDate, setBirthDate] = useOfficialFormState("birthDate", "");
  const [bloodType, setBloodType] = useOfficialFormState("bloodType", "");
  const [schoolName, setSchoolName] = useOfficialFormState("schoolName", "");
  const [teacherName, setTeacherName] = useOfficialFormState("teacherName", "");
  const [parentName, setParentName] = useOfficialFormState("parentName", "");
  const [parentPhone, setParentPhone] = useOfficialFormState("parentPhone", "");
  const [emergencyContact, setEmergencyContact] = useOfficialFormState("emergencyContact", "");
  const [pickupAuthPersons, setPickupAuthPersons] = useOfficialFormState("pickupAuthPersons", "");

  const [allergies, setAllergies] = useOfficialFormState("allergies", "");
  const [chronicDiseases, setChronicDiseases] = useOfficialFormState("chronicDiseases", "");
  const [nutritionHabits, setNutritionHabits] = useOfficialFormState("nutritionHabits", "");
  const [toiletIndependence, setToiletIndependence] = useOfficialFormState("toiletIndependence", "");
  const [sleepHabits, setSleepHabits] = useOfficialFormState("sleepHabits", "");
  const [fearsAndCalming, setFearsAndCalming] = useOfficialFormState("fearsAndCalming", "");
  const [specialInterests, setSpecialInterests] = useOfficialFormState("specialInterests", "");

  const handlePrint = () => {
    printOfficialFormA4(`Ogrenci_Tanima_ve_Aile_Bilgi_Formu_${studentName.replace(/\s+/g, '_')}`);
  };

  const handleExportWord = () => downloadOfficialFormWord("OfficialStudentIntakeFormModal");

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
              value={studentName} readOnly aria-label="Kayıtlı çocuğun adı"
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Doğum Tarihi:</label>
            <input
              type="date"
              className="of-meta-input"
              value={birthDate} readOnly aria-label="Kayıtlı doğum tarihi"
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
