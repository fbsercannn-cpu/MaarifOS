import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface MoodCount {
  happy: number;
  excited: number;
  calm: number;
  tired: number;
  sadOrAnxious: number;
}

export function OfficialMorningOrientationModal({ onClose }: { onClose?: () => void }) {
  const [schoolName, setSchoolName] = useOfficialFormState("schoolName", "Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useOfficialFormState("teacherName", "Okul Öncesi Öğretmeni");
  const [date, setDate] = useOfficialFormState("date", "2026-09-15");
  const [greetingType, setGreetingType] = useOfficialFormState("greetingType", "Kalp / Sarılma & Nezaket Selamı");
  const [weatherType, setWeatherType] = useOfficialFormState("weatherType", "Güneşli ve Rüzgârlı (22°C)");
  const [presentCount, setPresentCount] = useOfficialFormState("presentCount", 19);
  const [totalCount, setTotalCount] = useOfficialFormState("totalCount", 20);

  const [moods, setMoods] = useOfficialFormState<MoodCount>("moods", {
    happy: 10,
    excited: 5,
    calm: 3,
    tired: 1,
    sadOrAnxious: 0,
  });

  const [morningMessage, setMorningMessage] = useOfficialFormState("morningMessage",
    "Günaydın Papatyalar Sınıfı! Bugün sonbaharın gelişini kutluyoruz. Bahçeden toplanan yapraklar merkezlerde bizi bekliyor!"
  );

  const [curiosityQuestion, setCuriosityQuestion] = useOfficialFormState("curiosityQuestion",
    "Ağaçların yaprakları neden sonbaharda sararır ve dökülür? Rüzgâr onları nereye taşır?"
  );

  const [specialSupportNotes, setSpecialSupportNotes] = useOfficialFormState("specialSupportNotes",
    "Sabah ayrılık kaygısı yaşayan 1 öğrencimiz (Ali) sakinleşme köşesinde peluş oyuncağıyla desteklendi, duygu panosuna gülen yüz asarak oyuna katıldı."
  );

  const handleMoodChange = (field: keyof MoodCount, val: number) => {
    setMoods((prev) => ({ ...prev, [field]: Math.max(0, val) }));
  };

  const handlePrint = () => {
    printOfficialFormA4(`Gune_Baslama_ve_Duygu_Panosu_${date}`);
  };

  const handleExportWord = () => downloadOfficialFormWord("OfficialMorningOrientationModal");

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `Gune_Baslama_Tutanagi_${date}`,
      sheetName: "Güne Başlama Çemberi",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — GÜNE BAŞLAMA ZAMANI VE DUYGU PANOSU TUTANAĞI",
      subtitle: `${schoolName} · Tarih: ${date} · Öğretmen: ${teacherName} · Mevcut: ${presentCount}/${totalCount}`,
      metadata: [
        { label: "Okul Adı", value: schoolName },
        { label: "Tarih", value: date },
        { label: "Öğretmen", value: teacherName },
        { label: "Mevcut", value: `${presentCount} / ${totalCount}` },
        { label: "Selamlaşma", value: greetingType },
        { label: "Hava Durumu", value: weatherType },
      ],
      columns: [
        { header: "Bölüm / Duygu", key: "section", width: 28, align: "left" },
        { header: "Sayı / Detay", key: "countOrText", width: 20, align: "center" },
        { header: "Pedagojik Karşılama Stratejisi ve Yorum", key: "strategy", width: 55, align: "left" },
      ],
      rows: [
        { section: "😊 Neşeli / Mutlu", countOrText: String(moods.happy), strategy: "Grup etkinliklerinde aktif katılım ve liderlik rolleri desteklendi." },
        { section: "🤩 Heyecanlı / Coşkulu", countOrText: String(moods.excited), strategy: "Merkez oyunlarında odaklanma ve keşif odaklı materyallere yönlendirildi." },
        { section: "😌 Sakin / Huzurlu", countOrText: String(moods.calm), strategy: "Kitap ve sanat merkezinde derinleşmeleri sağlandı." },
        { section: "🥱 Yorgun / Uykulu", countOrText: String(moods.tired), strategy: "Su içme, hafif esneme hareketleri ve sakin karşılama rutini uygulandı." },
        { section: "🥺 Üzgün / Endişeli", countOrText: String(moods.sadOrAnxious), strategy: "Bireysel ilgi, empati çemberi ve güven verici yetişkin teması sağlandı." },
        { section: "GÜNÜN MESAJI", countOrText: "-", strategy: morningMessage },
        { section: "MERAK SORUSU", countOrText: "-", strategy: curiosityQuestion },
        { section: "SABAH UYUM GÖZLEMLERİ", countOrText: "-", strategy: specialSupportNotes },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 93–94 (Rutin 1)</span>
          <h3 className="of-action-title">Güne Başlama Zamanı &amp; Duygu Panosu Tutanağı</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="Güne başlama tutanağını Excel (.xlsx) olarak indir"
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
            GÜNE BAŞLAMA ZAMANI, DUYGU PANOSU VE GÜNÜN MESAJI TUTANAĞI
          </div>
          <div className="of-header-meta-ref">MEB TTKB Günlük Rutinler (Rutin 1, Sayfa 93–94)</div>
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
            <label className="of-meta-label">Mevcudiyet:</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="number"
                className="of-meta-input"
                style={{ width: "65px" }}
                value={presentCount}
                onChange={(e) => setPresentCount(Number(e.target.value))}
              />
              <span>/ {totalCount} Mevcut</span>
            </div>
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Sabah Selamlaşma Modeli:</label>
            <select
              className="of-meta-input"
              value={greetingType}
              onChange={(e) => setGreetingType(e.target.value)}
            >
              <option value="Kalp / Sarılma & Nezaket Selamı">Kalp / Sarılma &amp; Nezaket Selamı</option>
              <option value="El Çakma / Yumruk Tokuşturma">El Çakma / Yumruk Tokuşturma</option>
              <option value="Dans / Ritim Hareketiyle Karşılama">Dans / Ritim Hareketiyle Karşılama</option>
              <option value="Göz Teması & Tebessüm Selamı">Göz Teması &amp; Tebessüm Selamı</option>
            </select>
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Hava Durumu ve Sıcaklık:</label>
            <input
              type="text"
              className="of-meta-input"
              value={weatherType}
              onChange={(e) => setWeatherType(e.target.value)}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          Sabah Duygu Durumu Panosu Sayımı (Sınıf İklimi Göstergesi)
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", margin: "10px 0" }}>
          <div style={{ padding: "8px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem" }}>😊</div>
            <strong style={{ fontSize: "0.8rem", color: "#166534", display: "block" }}>Neşeli</strong>
            <input
              type="number"
              className="of-meta-input"
              style={{ width: "50px", marginTop: "4px", textAlign: "center" }}
              value={moods.happy}
              onChange={(e) => handleMoodChange("happy", Number(e.target.value))}
            />
          </div>
          <div style={{ padding: "8px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: "6px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem" }}>🤩</div>
            <strong style={{ fontSize: "0.8rem", color: "#854d0e", display: "block" }}>Heyecanlı</strong>
            <input
              type="number"
              className="of-meta-input"
              style={{ width: "50px", marginTop: "4px", textAlign: "center" }}
              value={moods.excited}
              onChange={(e) => handleMoodChange("excited", Number(e.target.value))}
            />
          </div>
          <div style={{ padding: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem" }}>😌</div>
            <strong style={{ fontSize: "0.8rem", color: "#1e40af", display: "block" }}>Sakin</strong>
            <input
              type="number"
              className="of-meta-input"
              style={{ width: "50px", marginTop: "4px", textAlign: "center" }}
              value={moods.calm}
              onChange={(e) => handleMoodChange("calm", Number(e.target.value))}
            />
          </div>
          <div style={{ padding: "8px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem" }}>🥱</div>
            <strong style={{ fontSize: "0.8rem", color: "#6b21a8", display: "block" }}>Yorgun</strong>
            <input
              type="number"
              className="of-meta-input"
              style={{ width: "50px", marginTop: "4px", textAlign: "center" }}
              value={moods.tired}
              onChange={(e) => handleMoodChange("tired", Number(e.target.value))}
            />
          </div>
          <div style={{ padding: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem" }}>🥺</div>
            <strong style={{ fontSize: "0.8rem", color: "#991b1b", display: "block" }}>Destek İsteyen</strong>
            <input
              type="number"
              className="of-meta-input"
              style={{ width: "50px", marginTop: "4px", textAlign: "center" }}
              value={moods.sadOrAnxious}
              onChange={(e) => handleMoodChange("sadOrAnxious", Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label className="of-meta-label">Günün Yazılı Mesajı (Sınıf Tahtası / Karşılama Panosu):</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={morningMessage}
            onChange={(e) => setMorningMessage(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <label className="of-meta-label">Günün Merak ve Keşif Sorusu (Bilişsel Kanca):</label>
          <input
            type="text"
            className="of-meta-input"
            value={curiosityQuestion}
            onChange={(e) => setCuriosityQuestion(e.target.value)}
            style={{ width: "100%", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <label className="of-meta-label">Sabah Ayrılık / Uyum Notları ve Bireysel İlgi Kaydı:</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={specialSupportNotes}
            onChange={(e) => setSpecialSupportNotes(e.target.value)}
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
