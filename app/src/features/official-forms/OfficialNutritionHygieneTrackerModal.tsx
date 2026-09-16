import { useState } from "react";
import {
  exportOfficialTableToExcel,
  printOfficialFormA4,
} from "./official-form-export-service.ts";
import "./official-forms.css";

interface StudentMealRow {
  id: string;
  name: string;
  breakfast: "full" | "half" | "taste";
  lunch: "full" | "half" | "taste";
  waterCups: number;
  teethBrushed: boolean;
  notes: string;
}

const DEFAULT_STUDENTS: StudentMealRow[] = [
  { id: "s1", name: "Demir Korkmaz", breakfast: "full", lunch: "full", waterCups: 5, teethBrushed: true, notes: "Sebze çorbasını çok severek bitirdi." },
  { id: "s2", name: "Zeynep Aydın", breakfast: "full", lunch: "half", waterCups: 4, teethBrushed: true, notes: "Pirinç pilavını yedi, yoğurttan tattı." },
  { id: "s3", name: "Caner Yıldız", breakfast: "half", lunch: "full", waterCups: 6, teethBrushed: true, notes: "Su içme hedefini tamamladı." },
  { id: "s4", name: "Elif Sönmez", breakfast: "full", lunch: "full", waterCups: 5, teethBrushed: true, notes: "Yemek sonrası ellerini özenle yıkadı." },
  { id: "s5", name: "Ali Kaya", breakfast: "taste", lunch: "half", waterCups: 3, teethBrushed: true, notes: "Sabah iştahsızdı, öğle ekmeğini bitirdi." },
];

export function OfficialNutritionHygieneTrackerModal({ onClose }: { onClose?: () => void }) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [date, setDate] = useState("2026-09-15");
  const [menuToday, setMenuToday] = useState("Sabah: Haşlanmış Yumurta, Peynir, Zeytin, Ihlamur · Öğle: Mercimek Çorbası, Sebzeli Bulgur, Ayran");
  const [students, setStudents] = useState<StudentMealRow[]>(DEFAULT_STUDENTS);

  const handleMealChange = (id: string, field: "breakfast" | "lunch", val: "full" | "half" | "taste") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleWaterChange = (id: string, delta: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, waterCups: Math.max(0, s.waterCups + delta) } : s))
    );
  };

  const handleTeethChange = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, teethBrushed: !s.teethBrushed } : s))
    );
  };

  const handlePrint = () => {
    printOfficialFormA4(`Beslenme_ve_Hijyen_Takip_Cizelgesi_${date}`);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportOfficialTableToExcel({
        fileName: `Beslenme_ve_Hijyen_Takip_Cizelgesi_${date}`,
        sheetName: "Beslenme & Hijyen",
        title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — GÜNLÜK BESLENME, HİJYEN VE ÖZ BAKIM TAKİP ÇİZELGESİ",
        subtitle: `Tarih: ${date} · Menü: ${menuToday}`,
        metadata: [
          { label: "Okul / Kurum Adı", value: schoolName },
          { label: "Sınıf Öğretmeni", value: teacherName },
          { label: "Tarih", value: date },
          { label: "Günün Menüsü", value: menuToday },
        ],
        columns: [
          { header: "Öğrenci Adı Soyadı", key: "name", width: 25 },
          { header: "Kahvaltı Tüketimi", key: "breakfastStr", width: 18, align: "center" },
          { header: "Öğle Yemeği Tüketimi", key: "lunchStr", width: 18, align: "center" },
          { header: "Su Tüketimi (Bardak)", key: "waterCups", width: 22, align: "right", isNumeric: true },
          { header: "Diş / El Hijyeni", key: "teethBrushedStr", width: 16, align: "center" },
          { header: "Öğretmen Gözlem Notu", key: "notes", width: 35 },
        ],
        rows: students.map((s) => ({
          name: s.name,
          breakfastStr: s.breakfast === "full" ? "Tam Bitirdi" : s.breakfast === "half" ? "Yarısını Yedi" : "Tattı",
          lunchStr: s.lunch === "full" ? "Tam Bitirdi" : s.lunch === "half" ? "Yarısını Yedi" : "Tattı",
          waterCups: s.waterCups,
          teethBrushedStr: s.teethBrushed ? "Yapıldı (✓)" : "Yapılmadı (-)",
          notes: s.notes,
        })),
        includeSubtotals: true,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Beslenme_ve_Hijyen_Takip_Cizelgesi_${date}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.35; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 9pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          GÜNLÜK BESLENME, HİJYEN VE ÖZ BAKIM TAKİP ÇİZELGESİ
        </div>
        <table>
          <tr><td><b>Okul / Kurum Adı:</b> ${schoolName}</td><td><b>Tarih:</b> ${date}</td></tr>
          <tr><td><b>Sınıf Öğretmeni:</b> ${teacherName}</td><td><b>Günün Menüsü:</b> ${menuToday}</td></tr>
        </table>
        <h4>Öğrenci Bazlı Tüketim ve Hijyen Dökümü (TTKB Sayfa 92, 98)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 25%'>Öğrenci Adı Soyadı</th>
              <th style='width: 15%'>Kahvaltı</th>
              <th style='width: 15%'>Öğle Yemeği</th>
              <th style='width: 12%'>Su (Bardak)</th>
              <th style='width: 10%'>Diş/El</th>
              <th style='width: 23%'>Öğretmen Gözlem Notu</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td><b>${s.name}</b></td>
                <td style='text-align:center;'>${s.breakfast === "full" ? "Tam Bitirdi" : s.breakfast === "half" ? "Yarısını Yedi" : "Tattı"}</td>
                <td style='text-align:center;'>${s.lunch === "full" ? "Tam Bitirdi" : s.lunch === "half" ? "Yarısını Yedi" : "Tattı"}</td>
                <td style='text-align:center;'>${s.waterCups} Bardak</td>
                <td style='text-align:center;'>${s.teethBrushed ? "✓" : "-"}</td>
                <td>${s.notes}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Görülmüştür</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Beslenme_ve_Hijyen_Takip_Cizelgesi_${date}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 92, 98 (Rutin 3)</span>
          <h3 className="of-action-title">Beslenme, Hijyen &amp; Öz Bakım Takip Çizelgesi</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn of-btn--excel"
            onClick={handleDownloadExcel}
            disabled={isExportingExcel}
          >
            {isExportingExcel ? "⏳ Hazırlanıyor..." : "📊 Excel (.xlsx)"}
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
            GÜNLÜK BESLENME, HİJYEN VE ÖZ BAKIM TAKİP ÇİZELGESİ
          </div>
          <div className="of-header-meta-ref">MEB TTKB Günlük Rutinler (Rutin 3, Sayfa 92, 98)</div>
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
            <label className="of-meta-label">Uygulama Tarihi:</label>
            <input
              type="date"
              className="of-meta-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Günün Beslenme Menüsü:</label>
            <input
              type="text"
              className="of-meta-input"
              value={menuToday}
              onChange={(e) => setMenuToday(e.target.value)}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          Öğrenci Bazlı Besin Tüketimi, Su ve Öz Bakım Takip Tablosu
        </h4>

        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "22%", textAlign: "left" }}>Öğrenci Adı</th>
              <th style={{ width: "18%", textAlign: "center" }}>Kahvaltı</th>
              <th style={{ width: "18%", textAlign: "center" }}>Öğle Yemeği</th>
              <th style={{ width: "14%", textAlign: "center" }}>Su Takibi</th>
              <th style={{ width: "10%", textAlign: "center" }}>El / Diş</th>
              <th style={{ width: "18%", textAlign: "left" }}>Gözlem Notu</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} style={{ pageBreakInside: "avoid" }}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td style={{ textAlign: "center" }}>
                  <select
                    className="of-meta-input"
                    style={{ fontSize: "0.78rem", padding: "2px 4px" }}
                    value={s.breakfast}
                    onChange={(e) => handleMealChange(s.id, "breakfast", e.target.value as any)}
                  >
                    <option value="full">🟢 Tam Bitirdi</option>
                    <option value="half">🟡 Yarısını Yedi</option>
                    <option value="taste">🔴 Sadece Tattı</option>
                  </select>
                </td>
                <td style={{ textAlign: "center" }}>
                  <select
                    className="of-meta-input"
                    style={{ fontSize: "0.78rem", padding: "2px 4px" }}
                    value={s.lunch}
                    onChange={(e) => handleMealChange(s.id, "lunch", e.target.value as any)}
                  >
                    <option value="full">🟢 Tam Bitirdi</option>
                    <option value="half">🟡 Yarısını Yedi</option>
                    <option value="taste">🔴 Sadece Tattı</option>
                  </select>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      className="no-print"
                      onClick={() => handleWaterChange(s.id, -1)}
                      style={{ padding: "1px 5px", cursor: "pointer" }}
                    >
                      -
                    </button>
                    <span>💧 {s.waterCups}</span>
                    <button
                      type="button"
                      className="no-print"
                      onClick={() => handleWaterChange(s.id, 1)}
                      style={{ padding: "1px 5px", cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleTeethChange(s.id)}>
                  <input
                    type="checkbox"
                    checked={s.teethBrushed}
                    onChange={() => handleTeethChange(s.id)}
                    aria-label="El/Diş Hijyeni"
                  />
                  <span style={{ marginLeft: "4px" }}>{s.teethBrushed ? "✓" : "-"}</span>
                </td>
                <td>
                  <input
                    type="text"
                    className="of-meta-input"
                    style={{ fontSize: "0.78rem", padding: "2px 4px" }}
                    value={s.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudents((prev) => prev.map((it) => (it.id === s.id ? { ...it, notes: val } : it)));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
