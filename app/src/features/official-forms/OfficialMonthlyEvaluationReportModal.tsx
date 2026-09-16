import React, { useState } from "react";
import "./official-forms.css";

const CHILD_CRITERIA = [
  "Çocuklar bireysel etkinliklere aktif katılım göstermiştir.",
  "Çocuklar grup etkinliklerine istekli ve iş birlikçi katılmıştır.",
  "Çocuklar öğrenme-öğretme uygulamalarına merak ve ilgiyle yaklaşmıştır.",
  "Çocuklar hedeflenen öğrenme çıktıları doğrultusunda beklenen ilerlemeyi kaydetmiştir.",
  "Çocuklar sosyal-duygusal öğrenme becerilerinde (öz düzenleme, empati) gelişim göstermiştir.",
  "Çocuklar okuryazarlık becerilerine ilişkin süreçlerde farkındalık sergilemiştir.",
  "Çocuklar eğilimler ve değerlere ilişkin davranışları günlük süreçlere yansıtmıştır.",
  "Desteklenmesi gereken çocukların bireysel gereksinimleri saptanmıştır.",
  "Bireysel farklılıklara göre zenginleştirme ve destekleme uyarlamaları uygulanmıştır."
];

const PROGRAM_CRITERIA = [
  "Öğrenme çıktıları çocukların yaş ve hazır bulunuşluk düzeyine uygun gerçekleşmiştir.",
  "Öğrenme ortamları ve merkezler hedeflenen kazanımları destekleyecek nitelikte düzenlenmiştir.",
  "Kullanılan eğitim materyalleri (doğal/sıfır atık) sürece zenginlik katmıştır.",
  "Günün rutinleri (güne başlama, beslenme, oyun, kapanış) dengeli işletilmiştir.",
  "Açık hava ve okul dışı öğrenme etkinliklerine yeterli süre ayrılmıştır.",
  "Aile ve toplum katılımı çalışmaları plan doğrultusunda yürütülmüştür."
];

const TEACHER_CRITERIA = [
  "Planlama ve uygulama süreci etkili ve sistematik bir şekilde yürütülmüştür.",
  "Çocuklarla destekleyici, empatik ve teşvik edici bir iletişim kurulmuştur.",
  "Öğrenme ortamı etkinliklerin amaçlarına uygun biçimde dönüştürülmüştür.",
  "Çocukların etkinliklere aktif katılımı ve fikir üretmesi desteklenmiştir.",
  "Öğretmenin rehberlik rolü süreç odaklı ve esnek şekilde kullanılmıştır.",
  "Çocukların duygu ve düşüncelerini özgürce ifade etmelerine fırsat tanınmıştır.",
  "Çocukların anlık ilgi ve ihtiyaçları doğrultusunda pedagojik esneklik sağlanmıştır.",
  "Gözlem ve anekdot kayıtları öğrenme-öğretme uygulamalarına yansıtılmıştır.",
  "Öğretmenin kendi uygulamalarına ilişkin güçlü ve gelişime açık yönleri analiz edilmiştir.",
  "Günlük planlar uygulanırken zaman yönetimi başarıyla gerçekleştirilmiştir.",
  "Tüm çocuklara adil ve kapsayıcı fırsat eşitliği sağlanmıştır.",
  "Karşılaşılan güçlükler saptanarak bir sonraki ayın planlamasına uyarlanmıştır."
];

interface Props {
  onClose?: () => void;
}

export function OfficialMonthlyEvaluationReportModal({ onClose }: Props) {
  const [selectedMonth, setSelectedMonth] = useState("Ekim 2026");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [className, setClassName] = useState("Papatyalar Sınıfı (5 Yaş / 60-72 Ay)");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");

  const [selectedChildCriteria, setSelectedChildCriteria] = useState<string[]>([
    CHILD_CRITERIA[0],
    CHILD_CRITERIA[1],
    CHILD_CRITERIA[3],
    CHILD_CRITERIA[4],
  ]);

  const [selectedProgramCriteria, setSelectedProgramCriteria] = useState<string[]>([
    PROGRAM_CRITERIA[0],
    PROGRAM_CRITERIA[1],
    PROGRAM_CRITERIA[2],
  ]);

  const [selectedTeacherCriteria, setSelectedTeacherCriteria] = useState<string[]>([
    TEACHER_CRITERIA[0],
    TEACHER_CRITERIA[1],
    TEACHER_CRITERIA[4],
    TEACHER_CRITERIA[7],
  ]);

  const [childNarrative, setChildNarrative] = useState(
    "Ay boyunca uygulanan etkinliklerde çocukların özellikle fen ve doğa gözlemlerine büyük ilgi duyduğu, merak ve soru sorma eğilimlerinin arttığı gözlemlenmiştir. Grup oyunlarında akran paylaşımı ve sıra alma becerisi pekişmiş; ince motor çalışmalarında belirgin bir ilerleme kaydedilmiştir."
  );

  const [programNarrative, setProgramNarrative] = useState(
    "Aylık eğitim planındaki öğrenme çıktıları zümre kararları doğrultusunda eksiksiz uygulanmıştır. Doğal materyal kullanımının çocukların yaratıcılığına olumlu katkı sağladığı; bahçe ve açık hava oyunlarının sürece dinamizm kattığı değerlendirilmiştir."
  );

  const [teacherNarrative, setTeacherNarrative] = useState(
    "Öğrenme merkezlerinde rehberlik rolü aktif tutulmuş, çocukların kendi ilgi alanlarına göre merkez seçmelerine imkân tanınmıştır. Gelecek ayda ritim ve beden perküsyonu çalışmalarına daha fazla ağırlık verilmesi kararlaştırılmıştır."
  );

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Aylık Eğitim Planı Değerlendirme Raporu - ${selectedMonth}</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; padding: 20px; line-height: 1.45; color: #1e293b; }
        h1 { font-size: 16pt; color: #0284c7; text-align: center; }
        .meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .meta td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9.5pt; }
        .section-title { font-weight: bold; font-size: 11.5pt; color: #0369a1; background: #e0f2fe; padding: 6px 10px; margin-top: 14px; border-left: 4px solid #0284c7; }
        ul { margin: 6px 0; padding-left: 20px; font-size: 9.5pt; }
        li { margin-bottom: 3px; }
        .narrative { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 9.5pt; margin-top: 6px; font-style: italic; }
      </style>
      </head>
      <body>
        <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI · TTKB OKUL ÖNCESİ EĞİTİMİ</h1>
        <h2 style="text-align: center; font-size: 12.5pt; color: #475569;">AYLIK EĞİTİM PLANI 3 BOYUTLU DEĞERLENDİRME RAPORU (TTKB s. 111–114)</h2>

        <table class="meta">
          <tr>
            <td><strong>Okul Adı:</strong> ${schoolName}</td>
            <td><strong>Değerlendirilen Ay:</strong> ${selectedMonth}</td>
          </tr>
          <tr>
            <td><strong>Sınıf / Şube:</strong> ${className}</td>
            <td><strong>Öğretmen:</strong> ${teacherName}</td>
          </tr>
        </table>

        <div class="section-title">1. ÇOCUK AÇISINDAN DEĞERLENDİRME (TABLO 1 ÖLÇÜTLERİ)</div>
        <ul>
          ${selectedChildCriteria.map(c => `<li>${c}</li>`).join("")}
        </ul>
        <div class="narrative">${childNarrative}</div>

        <div class="section-title">2. PROGRAM AÇISINDAN DEĞERLENDİRME (TABLO 2 ÖLÇÜTLERİ)</div>
        <ul>
          ${selectedProgramCriteria.map(c => `<li>${c}</li>`).join("")}
        </ul>
        <div class="narrative">${programNarrative}</div>

        <div class="section-title">3. ÖĞRETMEN AÇISINDAN DEĞERLENDİRME (TABLO 3 ÖLÇÜTLERİ)</div>
        <ul>
          ${selectedTeacherCriteria.map(c => `<li>${c}</li>`).join("")}
        </ul>
        <div class="narrative">${teacherNarrative}</div>

        <div style="margin-top: 30px; display: table; width: 100%;">
          <div style="display: table-cell; width: 50%;">
            <strong>Okul Öncesi Öğretmeni:</strong><br/><br/>
            ${teacherName} (İmza)
          </div>
          <div style="display: table-cell; width: 50%; text-align: right;">
            <strong>Okul Müdürü:</strong><br/><br/>
            Uygundur (İmza / Mühür)
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aylik_Degerlendirme_Raporu_${selectedMonth.replace(/\s+/g, "_")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows: Array<Record<string, unknown>> = [];

    rows.push({
      dimension: "1. ÇOCUK AÇISINDAN",
      type: "Ölçütler",
      content: selectedChildCriteria.join(" \n• "),
      narrative: childNarrative,
    });
    rows.push({
      dimension: "2. PROGRAM AÇISINDAN",
      type: "Ölçütler",
      content: selectedProgramCriteria.join(" \n• "),
      narrative: programNarrative,
    });
    rows.push({
      dimension: "3. ÖĞRETMEN AÇISINDAN",
      type: "Ölçütler",
      content: selectedTeacherCriteria.join(" \n• "),
      narrative: teacherNarrative,
    });

    await exportOfficialTableToExcel({
      fileName: `3B_Aylik_Degerlendirme_${selectedMonth.replace(/\s+/g, "_")}`,
      sheetName: "3B Aylık Değerlendirme",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — AYLIK EĞİTİM PLANI 3 BOYUTLU DEĞERLENDİRME RAPORU",
      subtitle: `${schoolName} · ${className} · Ay: ${selectedMonth} · Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Okul Adı", value: schoolName },
        { label: "Şube", value: className },
        { label: "Öğretmen", value: teacherName },
        { label: "Değerlendirilen Ay", value: selectedMonth },
      ],
      columns: [
        { header: "Değerlendirme Boyutu", key: "dimension", width: 24, align: "left" },
        { header: "Tür", key: "type", width: 14, align: "center" },
        { header: "Seçilen Resmî Ölçütler (Tablo 1-2-3)", key: "content", width: 55, align: "left" },
        { header: "Öğretmenin Ay Sonu Yansıtması ve Genel Kanaati", key: "narrative", width: 50, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📊</span>
            <span>Aylık Eğitim Planı 3 Boyutlu Resmî Değerlendirme Raporu</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Sayfa 111–114 Resmî Tablo 1, 2, 3 Ölçütleri ve Bütüncül Yansıtma Standartları
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void handleDownloadExcel()}
            style={{
              padding: "7px 12px",
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
            title="3 Boyutlu değerlendirme raporunu Microsoft Excel (.xlsx) olarak indir"
          >
            📊 Excel (.xlsx) İndir
          </button>
          <button
            onClick={handleDownloadDoc}
            style={{
              padding: "7px 12px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            💾 Word (.doc) İndir
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "7px 12px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            🖨️ A4 Rapor Yazdır
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "7px 12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Kapat
            </button>
          )}
        </div>
      </div>

      {/* EDİTÖR KONSOLU (AY SEÇİMİ) */}
      <div className="print-hidden" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", margin: "14px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Değerlendirilen Ay:</label>
          <input
            type="text"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Okul Adı:</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Sınıf / Yaş:</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Öğretmen Adı:</label>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
      </div>

      {/* CANLI A4 RAPOR KARTI */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #0284c7", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · TÜRKİYE YÜZYILI MAARİF MODELİ
          </div>
          <h1 style={{ margin: "4px 0 2px 0", fontSize: "1.35rem", color: "#0369a1", fontWeight: 800 }}>
            Aylık Eğitim Planı Değerlendirme Raporu
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            TTKB Okul Öncesi Eğitim Programı Sayfa 111–114 Standartları
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
            <span>🏫 {schoolName}</span>
            <span>📅 {selectedMonth}</span>
            <span>👩‍🏫 {teacherName}</span>
          </div>
        </div>

        {/* 1. ÇOCUK AÇISINDAN */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ background: "#f0f9ff", borderLeft: "4px solid #0284c7", padding: "6px 12px", fontSize: "0.88rem", fontWeight: 800, color: "#0369a1", borderRadius: "0 6px 6px 0", marginBottom: "8px" }}>
            1. ÇOCUK AÇISINDAN DEĞERLENDİRME (TABLO 1 ÖLÇÜTLERİ)
          </div>
          <div className="print-hidden" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {CHILD_CRITERIA.map((crit, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(selectedChildCriteria, setSelectedChildCriteria, crit)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  border: selectedChildCriteria.includes(crit) ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                  background: selectedChildCriteria.includes(crit) ? "#e0f2fe" : "#ffffff",
                  color: selectedChildCriteria.includes(crit) ? "#0369a1" : "#64748b",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {selectedChildCriteria.includes(crit) ? "✓ " : "+ "} {crit}
              </button>
            ))}
          </div>
          <ul style={{ margin: "0 0 8px 0", paddingLeft: "18px", fontSize: "0.82rem", color: "#334155" }}>
            {selectedChildCriteria.map((c, i) => (
              <li key={i} style={{ marginBottom: "2px" }}>{c}</li>
            ))}
          </ul>
          <textarea
            value={childNarrative}
            onChange={(e) => setChildNarrative(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontStyle: "italic", background: "#f8fafc" }}
          />
        </div>

        {/* 2. PROGRAM AÇISINDAN */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ background: "#f0fdf4", borderLeft: "4px solid #16a34a", padding: "6px 12px", fontSize: "0.88rem", fontWeight: 800, color: "#166534", borderRadius: "0 6px 6px 0", marginBottom: "8px" }}>
            2. PROGRAM AÇISINDAN DEĞERLENDİRME (TABLO 2 ÖLÇÜTLERİ)
          </div>
          <div className="print-hidden" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {PROGRAM_CRITERIA.map((crit, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(selectedProgramCriteria, setSelectedProgramCriteria, crit)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  border: selectedProgramCriteria.includes(crit) ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                  background: selectedProgramCriteria.includes(crit) ? "#dcfce7" : "#ffffff",
                  color: selectedProgramCriteria.includes(crit) ? "#166534" : "#64748b",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {selectedProgramCriteria.includes(crit) ? "✓ " : "+ "} {crit}
              </button>
            ))}
          </div>
          <ul style={{ margin: "0 0 8px 0", paddingLeft: "18px", fontSize: "0.82rem", color: "#334155" }}>
            {selectedProgramCriteria.map((c, i) => (
              <li key={i} style={{ marginBottom: "2px" }}>{c}</li>
            ))}
          </ul>
          <textarea
            value={programNarrative}
            onChange={(e) => setProgramNarrative(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontStyle: "italic", background: "#f8fafc" }}
          />
        </div>

        {/* 3. ÖĞRETMEN AÇISINDAN */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ background: "#fffbeb", borderLeft: "4px solid #d97706", padding: "6px 12px", fontSize: "0.88rem", fontWeight: 800, color: "#b45309", borderRadius: "0 6px 6px 0", marginBottom: "8px" }}>
            3. ÖĞRETMEN AÇISINDAN DEĞERLENDİRME (TABLO 3 ÖLÇÜTLERİ)
          </div>
          <div className="print-hidden" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {TEACHER_CRITERIA.map((crit, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(selectedTeacherCriteria, setSelectedTeacherCriteria, crit)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  border: selectedTeacherCriteria.includes(crit) ? "1.5px solid #d97706" : "1px solid #cbd5e1",
                  background: selectedTeacherCriteria.includes(crit) ? "#fef3c7" : "#ffffff",
                  color: selectedTeacherCriteria.includes(crit) ? "#b45309" : "#64748b",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {selectedTeacherCriteria.includes(crit) ? "✓ " : "+ "} {crit}
              </button>
            ))}
          </div>
          <ul style={{ margin: "0 0 8px 0", paddingLeft: "18px", fontSize: "0.82rem", color: "#334155" }}>
            {selectedTeacherCriteria.map((c, i) => (
              <li key={i} style={{ marginBottom: "2px" }}>{c}</li>
            ))}
          </ul>
          <textarea
            value={teacherNarrative}
            onChange={(e) => setTeacherNarrative(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontStyle: "italic", background: "#f8fafc" }}
          />
        </div>

        {/* İMZA ALANI */}
        <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "0.82rem" }}>
          <div>
            <strong>Okul Öncesi Öğretmeni</strong>
            <div style={{ marginTop: "28px", fontWeight: 700, color: "#1e293b" }}>
              {teacherName} (İmza)
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Okul Müdürü</strong>
            <div style={{ marginTop: "28px", fontWeight: 700, color: "#1e293b" }}>
              UYGUNDUR (İmza / Resmî Mühür)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
