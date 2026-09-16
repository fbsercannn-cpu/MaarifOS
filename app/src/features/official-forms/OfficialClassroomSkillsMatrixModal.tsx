import { useState } from "react";
import {
  exportOfficialTableToExcel,
  printOfficialFormA4,
} from "./official-form-export-service.ts";
import "./official-forms.css";

interface StudentSkillRow {
  id: string;
  name: string;
  tab: number; // Türkçe 1..3
  mab: number; // Matematik
  fab: number; // Fen
  sab: number; // Sosyal
  hab: number; // Hareket-Sağlık
  snab: number; // Sanat
  mzb: number; // Müzik
  sdb: number; // Sosyal-Duygusal
  ed: number; // Erdem-Değer
  egl: number; // Eğilimler
}

const INITIAL_STUDENTS: StudentSkillRow[] = [
  { id: "s1", name: "Ahmet Yılmaz", tab: 3, mab: 2, fab: 3, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 3, egl: 3 },
  { id: "s2", name: "Ayşe Kaya", tab: 3, mab: 3, fab: 2, sab: 3, hab: 2, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s3", name: "Can Demir", tab: 2, mab: 3, fab: 3, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 2 },
  { id: "s4", name: "Defne Çelik", tab: 3, mab: 3, fab: 3, sab: 3, hab: 3, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s5", name: "Demir Korkmaz", tab: 3, mab: 3, fab: 3, sab: 3, hab: 3, snab: 2, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s6", name: "Elif Şahin", tab: 3, mab: 2, fab: 2, sab: 3, hab: 2, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s7", name: "Emir Yıldız", tab: 2, mab: 2, fab: 2, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 2 },
  { id: "s8", name: "Fatma Öztürk", tab: 3, mab: 3, fab: 2, sab: 3, hab: 2, snab: 3, mzb: 2, sdb: 3, ed: 3, egl: 3 },
  { id: "s9", name: "Kerem Aydın", tab: 2, mab: 3, fab: 3, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 3 },
  { id: "s10", name: "Melis Arslan", tab: 3, mab: 2, fab: 2, sab: 3, hab: 2, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s11", name: "Mustafa Koç", tab: 2, mab: 2, fab: 2, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 2 },
  { id: "s12", name: "Nehir Doğan", tab: 3, mab: 3, fab: 3, sab: 3, hab: 3, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s13", name: "Ozan Güler", tab: 2, mab: 3, fab: 3, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 2 },
  { id: "s14", name: "Selin Çetin", tab: 3, mab: 2, fab: 2, sab: 3, hab: 2, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
  { id: "s15", name: "Umut Kurt", tab: 2, mab: 2, fab: 2, sab: 2, hab: 3, snab: 2, mzb: 2, sdb: 2, ed: 2, egl: 2 },
  { id: "s16", name: "Zeynep Aslan", tab: 3, mab: 3, fab: 3, sab: 3, hab: 3, snab: 3, mzb: 3, sdb: 3, ed: 3, egl: 3 },
];

const DOMAINS: { key: keyof Omit<StudentSkillRow, "id" | "name">; label: string; short: string }[] = [
  { key: "tab", label: "Türkçe Becerileri", short: "TÜRKÇE" },
  { key: "mab", label: "Matematik Becerileri", short: "MATEMATİK" },
  { key: "fab", label: "Fen Becerileri", short: "FEN" },
  { key: "sab", label: "Sosyal Beceriler", short: "SOSYAL" },
  { key: "hab", label: "Hareket ve Sağlık", short: "HAREKET" },
  { key: "snab", label: "Sanat Becerileri", short: "SANAT" },
  { key: "mzb", label: "Müzik Becerileri", short: "MÜZİK" },
  { key: "sdb", label: "Sosyal-Duygusal (SDB)", short: "SDB" },
  { key: "ed", label: "Erdem ve Değerler", short: "DEĞER" },
  { key: "egl", label: "Temel Eğilimler", short: "EĞİLİM" },
];

export function OfficialClassroomSkillsMatrixModal({ onClose }: { onClose?: () => void }) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [students, setStudents] = useState<StudentSkillRow[]>(INITIAL_STUDENTS);
  const [term, setTerm] = useState("1. Dönem Sonu İzleme");
  const [schoolYear, setSchoolYear] = useState("2026-2027");
  const [className, setClassName] = useState("Papatyalar Sınıfı (60-72 Ay)");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCycleScore = (studentId: string, domainKey: keyof Omit<StudentSkillRow, "id" | "name">) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.id !== studentId) return s;
        const current = s[domainKey];
        const next = current === 3 ? 1 : current + 1;
        return { ...s, [domainKey]: next };
      })
    );
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute Domain Averages
  const domainAverages = DOMAINS.map(d => {
    const sum = students.reduce((acc, s) => acc + s[d.key], 0);
    const avg = (sum / (students.length || 1)).toFixed(1);
    return { ...d, avg };
  });

  const handlePrint = () => {
    printOfficialFormA4(`MEB_Sinif_Gelisim_Matrisi_${schoolYear.replace('/', '-')}`);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportOfficialTableToExcel({
        fileName: `MEB_Sinif_Gelisim_Matrisi_${schoolYear.replace('/', '-')}`,
        sheetName: "Gelişim Matrisi",
        title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — SINIF DÜZEYİ BÜTÜNCÜL BECERİ VE EĞİLİMLER GELİŞİM MATRİSİ",
        subtitle: `${className} · ${term} · ${teacherName}`,
        metadata: [
          { label: "Eğitim Yılı", value: schoolYear },
          { label: "Dönem", value: term },
          { label: "Şube", value: className },
          { label: "Öğretmen", value: teacherName },
          { label: "Ölçütler", value: "1: Geliştirilmeli | 2: İyi Düzeyde | 3: Çok Başarılı" },
        ],
        columns: [
          { header: "No", key: "no", width: 8, align: "center", isNumeric: true },
          { header: "Öğrenci Adı Soyadı", key: "name", width: 25 },
          ...DOMAINS.map((d) => ({
            header: d.short,
            key: d.key,
            width: 14,
            align: "center" as const,
            isNumeric: true,
          })),
          { header: "Genel Ort.", key: "overallAvg", width: 14, align: "center", isNumeric: true },
        ],
        rows: students.map((s, idx) => {
          const rowAvg = Number((DOMAINS.reduce((acc, d) => acc + s[d.key], 0) / DOMAINS.length).toFixed(1));
          return {
            no: idx + 1,
            name: s.name,
            ...DOMAINS.reduce((acc, d) => ({ ...acc, [d.key]: s[d.key] }), {}),
            overallAvg: rowAvg,
          };
        }),
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Sinif_Duzeyi_Gelisim_Matrisi</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; }
        .header { text-align: center; font-weight: bold; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 8.5pt; }
        th { background-color: #f2f2f2; }
        .student-name { text-align: left; font-weight: bold; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          SINIF DÜZEYİ BÜTÜNCÜL BECERİ VE EĞİLİMLER GELİŞİM MATRİSİ
        </div>
        <p><b>Eğitim Yılı:</b> ${schoolYear} | <b>Dönem:</b> ${term} | <b>Şube:</b> ${className} | <b>Öğretmen:</b> ${teacherName}</p>
        <p><small>Ölçütler: 1: Geliştirilmeli (Düşük) | 2: İyi Düzeyde (Orta) | 3: Çok Başarılı (Yetkin)</small></p>
        <table>
          <thead>
            <tr>
              <th style='width: 30px;'>No</th>
              <th style='width: 140px; text-align: left;'>Öğrenci Adı Soyadı</th>
              ${DOMAINS.map(d => `<th>${d.short}</th>`).join('')}
              <th>Genel Ort.</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const rowAvg = (
                DOMAINS.reduce((acc, d) => acc + s[d.key], 0) / DOMAINS.length
              ).toFixed(1);
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class='student-name'>${s.name}</td>
                  ${DOMAINS.map(d => `<td>${s[d.key]}</td>`).join('')}
                  <td><b>${rowAvg}</b></td>
                </tr>
              `;
            }).join('')}
            <tr style='background-color: #e2e8f0; font-weight: bold;'>
              <td colspan='2' style='text-align: left;'>Sınıf Ortalaması</td>
              ${domainAverages.map(d => `<td>${d.avg}</td>`).join('')}
              <td>-</td>
            </tr>
          </tbody>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü / Maarif Müfettişi</b><br/><br/>Onay<br/>İmza / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Sinif_Gelisim_Matrisi_${schoolYear.replace('/', '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 109–114</span>
          <span className="of-tag of-tag--navy">Bütüncül Gelişim Matrisi</span>
          <span className="of-tag of-tag--emerald">10 Boyutlu Sınıf Profil Karnesi</span>
        </div>
        <div className="of-actions-bar__right">
          <button
            type="button"
            className="of-btn of-btn--excel"
            onClick={handleDownloadExcel}
            disabled={isExportingExcel}
          >
            {isExportingExcel ? "⏳ Hazırlanıyor..." : "📊 Excel (.xlsx)"}
          </button>
          <button type="button" className="of-btn of-btn--primary" onClick={handlePrint}>
            🖨️ A4 Yazdır / PDF (Yatay)
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

      {/* Domain Averages & Search (No Print) */}
      <div className="of-card no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h4 style={{ margin: 0, color: "#1e3a8a", fontSize: "0.95rem" }}>
              📊 Sınıf Düzeyi Alan Becerileri Dağılım Özeti (N={students.length})
            </h4>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Hücrelere tıklayarak seviyeleri anında döngüsel değiştirin: [1: Geliştirilmeli 🔴] → [2: İyi 🟡] → [3: Başarılı 🟢]
            </span>
          </div>
          <input
            type="text"
            className="of-input"
            style={{ width: "200px" }}
            placeholder="Öğrenci Ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.4rem" }}>
          {domainAverages.map(d => (
            <div key={d.key} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold" }}>{d.short}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: Number(d.avg) >= 2.5 ? "#16a34a" : "#ca8a04" }}>
                {d.avg} / 3.0
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Sheet (Landscape) */}
      <div className="official-a4-sheet" style={{ maxWidth: "1100px" }}>
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            SINIF DÜZEYİ BÜTÜNCÜL BECERİ VE EĞİLİMLER GELİŞİM MATRİSİ
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, s. 109–114, 140–177
          </div>
        </div>

        {/* Identity Bar */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td><strong>Eğitim-Öğretim Yılı:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={schoolYear}
                  onChange={e => setSchoolYear(e.target.value)}
                />
              </td>
              <td><strong>İzleme Dönemi:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                />
              </td>
              <td><strong>Şube / Yaş Grubu:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                />
              </td>
              <td><strong>Sınıf Öğretmeni:</strong></td>
              <td>
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

        {/* Big Matrix Table */}
        <table className="of-data-table" style={{ marginTop: "1rem", fontSize: "0.8rem" }}>
          <thead>
            <tr>
              <th style={{ width: "30px", textAlign: "center" }}>No</th>
              <th style={{ width: "160px", textAlign: "left" }}>Öğrenci Adı Soyadı</th>
              {DOMAINS.map(d => (
                <th key={d.key} style={{ textAlign: "center", fontSize: "0.75rem", padding: "4px 2px" }} title={d.label}>
                  {d.short}
                </th>
              ))}
              <th style={{ textAlign: "center", width: "60px" }}>Ort.</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const rowSum = DOMAINS.reduce((acc, d) => acc + student[d.key], 0);
              const rowAvg = (rowSum / DOMAINS.length).toFixed(1);

              return (
                <tr key={student.id}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ fontWeight: "600" }}>{student.name}</td>
                  {DOMAINS.map(d => {
                    const score = student[d.key];
                    const bg = score === 3 ? "#dcfce7" : score === 2 ? "#fef9c3" : "#fee2e2";
                    const color = score === 3 ? "#15803d" : score === 2 ? "#a16207" : "#b91c1c";
                    return (
                      <td key={d.key} style={{ textAlign: "center", padding: "2px" }}>
                        <button
                          type="button"
                          onClick={() => handleCycleScore(student.id, d.key)}
                          style={{
                            background: bg,
                            color: color,
                            border: "none",
                            borderRadius: "4px",
                            padding: "3px 6px",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            width: "100%",
                          }}
                          title="Tıkla seviye değiştir (1..3)"
                        >
                          {score}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", fontWeight: "bold", color: "#1e3a8a" }}>
                    {rowAvg}
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: "#f1f5f9", fontWeight: "bold" }}>
              <td colSpan={2} style={{ textAlign: "left", paddingLeft: "8px" }}>
                Sınıf Düzeyi Ortalaması
              </td>
              {domainAverages.map(d => (
                <td key={d.key} style={{ textAlign: "center", color: "#1e3a8a" }}>
                  {d.avg}
                </td>
              ))}
              <td style={{ textAlign: "center", color: "#1e3a8a" }}>
                {(domainAverages.reduce((acc, d) => acc + Number(d.avg), 0) / domainAverages.length).toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#475569" }}>
          <span><strong>1: Geliştirilmeli</strong> (Destekleme ihtiyacı)</span>
          <span><strong>2: İyi Düzeyde</strong> (Kazanım beklentisiyle uyumlu)</span>
          <span><strong>3: Çok Başarılı</strong> (Üst düzey yetkinlik ve liderlik)</span>
        </div>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Okul Müdürü / Maarif Müfettişi</span>
            <span className="of-signature-block__name">İnceleme ve Onay</span>
            <span className="of-signature-block__sign">Mühür / İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
