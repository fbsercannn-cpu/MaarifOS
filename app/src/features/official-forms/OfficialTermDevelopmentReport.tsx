import React, { useState, useEffect } from "react";
import "./official-forms.css";

export interface StudentProfileItem {
  id: string;
  name: string;
  birthDate?: string;
  studentNo?: string;
  photoUrl?: string;
}

export type SkillLevel = "gelistirilmeli" | "iyi" | "cok_basarili";

export interface ReportAreaRating {
  areaKey: string;
  areaTitle: string;
  code: string;
  level: SkillLevel;
  teacherNote?: string;
}

const REPORT_AREAS = [
  { areaKey: "turkce", areaTitle: "Türkçe Alanı", code: "TADB", defaultLevel: "iyi" as SkillLevel, summary: "Kendini sözel ifade etme, hikâyeleri dinleme, anlama ve sözcük dağarcığı" },
  { areaKey: "matematik", areaTitle: "Matematik Alanı", code: "MAB", defaultLevel: "cok_basarili" as SkillLevel, summary: "Ritmik sayma, birebir eşleme, geometrik şekilleri tanıma ve parça-bütün" },
  { areaKey: "fen", areaTitle: "Fen Alanı", code: "FAB", defaultLevel: "iyi" as SkillLevel, summary: "Doğayı ve olayları merakla inceleme, tahmin yürütme ve bilimsel gözlem" },
  { areaKey: "sosyal", areaTitle: "Sosyal Alan", code: "SAB", defaultLevel: "iyi" as SkillLevel, summary: "Zaman ve mekân algısı, yakın çevresini tanıma ve toplumsal kurallara uyum" },
  { areaKey: "hareket_saglik", areaTitle: "Hareket ve Sağlık", code: "HSAB", defaultLevel: "cok_basarili" as SkillLevel, summary: "Büyük ve küçük kas koordinasyonu, denge, öz bakım ve hijyen becerileri" },
  { areaKey: "sanat", areaTitle: "Sanat Alanı", code: "SNAB", defaultLevel: "cok_basarili" as SkillLevel, summary: "Farklı malzemelerle özgün ürünler oluşturma, renk uyumu ve yaratıcılık" },
  { areaKey: "muzik", areaTitle: "Müzik Alanı", code: "MÜAB", defaultLevel: "iyi" as SkillLevel, summary: "Ritim çalgılarını kullanma, şarkılara eşlik etme ve sesleri ayırt etme" },
  { areaKey: "sdb", areaTitle: "Sosyal-Duygusal Beceriler", code: "SDB", defaultLevel: "iyi" as SkillLevel, summary: "Duygularını fark etme, öfke/sevinç kontrolü, akran iş birliği ve empati" },
  { areaKey: "degerler", areaTitle: "Erdem-Değer Çerçevesi", code: "DEĞER", defaultLevel: "cok_basarili" as SkillLevel, summary: "Saygı, sevgi, sorumluluk, sabır, dürüstlük ve paylaşımcılık tutumları" },
  { areaKey: "okuryazarlik", areaTitle: "Okuryazarlık Becerileri", code: "OB", defaultLevel: "iyi" as SkillLevel, summary: "Görsel okuma, kitap sevgisi, dijital araç farkındalığı ve çevre bilinci" },
];

const TEACHER_OPINION_PRESETS = [
  "Dönem boyunca sınıf içi etkinliklere istekli katılmış; özellikle sanat ve hareket merkezinde yüksek yaratıcılık sergilemiştir. Sosyal uyumu ve arkadaşlık ilişkileri çok güçlüdür.",
  "Merak ve soru sorma eğilimi oldukça gelişmiştir. Bilişsel ve dil becerilerinde belirgin bir ilerleme kaydetmiş, sorumluluk alma ve başladığı işi bitirme konusunda başarılı olmuştur.",
  "Öz düzenleme ve sabır gerektiren çalışmalarda olumlu tutum sergilemektedir. İkinci dönemde fen ve doğa gözlemlerine daha fazla yönlendirilmesi gelişimini pekiştirecektir.",
  "Sınıf kurallarına titizlikle uymakta, akranlarıyla paylaşımcı ve nezaketli bir iletişim dili kurmaktadır. Bütünsel gelişim sürecini başarıyla sürdürmektedir."
];

interface Props {
  students?: readonly StudentProfileItem[];
  onClose?: () => void;
}

export function OfficialTermDevelopmentReport({
  students = [
    { id: "s-1", name: "Ali Yılmaz", birthDate: "12.04.2020", studentNo: "101" },
    { id: "s-2", name: "Ayşe Kaya", birthDate: "05.08.2020", studentNo: "102" },
    { id: "s-3", name: "Mehmet Demir", birthDate: "21.01.2020", studentNo: "103" },
    { id: "s-4", name: "Zeynep Çelik", birthDate: "14.11.2020", studentNo: "104" },
    { id: "s-5", name: "Can Aksoy", birthDate: "09.06.2020", studentNo: "105" },
    { id: "s-6", name: "Elif Öztürk", birthDate: "30.03.2020", studentNo: "106" },
  ],
  onClose,
}: Props) {
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const currentStudent = students[activeStudentIndex] || students[0]!;

  const [term, setTerm] = useState<"1" | "2">("1");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [schoolName, setSchoolName] = useState("Atatürk Anaokulu");
  const [className, setClassName] = useState("Güneş Sınıfı (5 Yaş / 60-72 Ay)");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [principalName, setPrincipalName] = useState("Ahmet Öztürk");

  // Ratings map per studentId -> areaKey -> level
  const [allRatings, setAllRatings] = useState<Record<string, Record<string, SkillLevel>>>(() => {
    try {
      const saved = localStorage.getItem("maarif_term_reports_data");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initial: Record<string, Record<string, SkillLevel>> = {};
    students.forEach((s) => {
      initial[s.id] = {};
      REPORT_AREAS.forEach((a) => {
        initial[s.id]![a.areaKey] = a.defaultLevel;
      });
    });
    return initial;
  });

  // Teacher opinions map per studentId
  const [opinions, setOpinions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("maarif_term_opinions_data");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initial: Record<string, string> = {};
    students.forEach((s, idx) => {
      initial[s.id] = TEACHER_OPINION_PRESETS[idx % TEACHER_OPINION_PRESETS.length]!;
    });
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem("maarif_term_reports_data", JSON.stringify(allRatings));
    } catch {
      // ignore
    }
  }, [allRatings]);

  useEffect(() => {
    try {
      localStorage.setItem("maarif_term_opinions_data", JSON.stringify(opinions));
    } catch {
      // ignore
    }
  }, [opinions]);

  const setRating = (areaKey: string, level: SkillLevel) => {
    setAllRatings((prev) => ({
      ...prev,
      [currentStudent.id]: {
        ...(prev[currentStudent.id] || {}),
        [areaKey]: level,
      },
    }));
  };

  const setOpinion = (text: string) => {
    setOpinions((prev) => ({
      ...prev,
      [currentStudent.id]: text,
    }));
  };

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const ratings = allRatings[currentStudent.id] || {};
    const areaRows = REPORT_AREAS.map((a) => {
      const lvl = ratings[a.areaKey] || a.defaultLevel;
      const isG = lvl === "gelistirilmeli";
      const isI = lvl === "iyi";
      const isC = lvl === "cok_basarili";

      return `<tr>
        <td style="width:28%; font-weight:bold; background-color:#f8fafc;">${a.areaTitle} <small>(${a.code})</small></td>
        <td style="font-size:8.5pt;">${a.summary}</td>
        <td style="width:10%; text-align:center; font-weight:bold; color:${isG ? '#dc2626' : '#bbb'};">${isG ? 'X' : ''}</td>
        <td style="width:10%; text-align:center; font-weight:bold; color:${isI ? '#2563eb' : '#bbb'};">${isI ? 'X' : ''}</td>
        <td style="width:10%; text-align:center; font-weight:bold; color:${isC ? '#059669' : '#bbb'};">${isC ? 'X' : ''}</td>
      </tr>`;
    }).join("");

    const currentOpinion = opinions[currentStudent.id] || TEACHER_OPINION_PRESETS[0];

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GELİŞİM RAPORU - ${currentStudent.name}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.5pt; color: #111; padding: 20px; }
  h2 { text-align: center; font-size: 13pt; color: #c2410c; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #777; padding: 5px 7px; vertical-align: middle; }
  th { background-color: #ffedd5; color: #c2410c; font-size: 9pt; }
  .label-cell { width: 22%; background-color: #f8fafc; font-weight: bold; }
  .opinion-box { border: 1px solid #777; padding: 10px; background-color: #fafafa; margin-top: 8px; min-height: 80px; }
  .sign-table { width: 100%; margin-top: 30px; border: none; }
  .sign-table td { border: none; text-align: center; width: 50%; font-weight: bold; }
</style>
</head>
<body>
  <div style="text-align:center; font-weight:bold; font-size:11pt;">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
  <h2>OKUL ÖNCESİ EĞİTİM DÖNEM SONU GELİŞİM RAPORU</h2>
  <div class="subtitle">${academicYear} Eğitim-Öğretim Yılı · ${term}. Dönem Sonu Resmî Belgesi</div>

  <table>
    <tr><td class="label-cell">Öğrencinin Adı Soyadı:</td><td><b>${currentStudent.name}</b></td><td class="label-cell">Öğrenci No:</td><td>${currentStudent.studentNo || '-'}</td></tr>
    <tr><td class="label-cell">Doğum Tarihi:</td><td>${currentStudent.birthDate || '-'}</td><td class="label-cell">Okul Adı:</td><td>${schoolName}</td></tr>
    <tr><td class="label-cell">Sınıfı / Şubesi:</td><td>${className}</td><td class="label-cell">Öğretmen:</td><td>${teacherName}</td></tr>
  </table>

  <table>
    <thead>
      <tr>
        <th>Gelişim Alanı</th>
        <th>Kazanım &amp; Gösterge Özeti</th>
        <th style="width:65px; text-align:center;">Geliştirilmeli</th>
        <th style="width:65px; text-align:center;">İyi Düzeyde</th>
        <th style="width:65px; text-align:center;">Çok Başarılı</th>
      </tr>
    </thead>
    <tbody>
      ${areaRows}
    </tbody>
  </table>

  <div style="font-weight:bold; margin-top:10px; color:#c2410c;">ÖĞRETMENİN GENEL GÖRÜŞ VE ÖNERİLERİ:</div>
  <div class="opinion-box">${currentOpinion}</div>

  <table class="sign-table">
    <tr>
      <td>${teacherName}<br><small>Sınıf Öğretmeni</small></td>
      <td>${principalName}<br><small>Okul Müdürü</small></td>
    </tr>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff" + htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Gelisim_Raporu_${currentStudent.name.replace(/\s+/g, "_")}_${term}_Donem.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const levelLabels: Record<SkillLevel, string> = {
      gelistirilmeli: "Geliştirilmeli (1)",
      iyi: "İyi Düzeyde (2)",
      cok_basarili: "Çok Başarılı (3)",
    };

    const rows = students.map((s, index) => {
      const r = allRatings[s.id] || {};
      const op = opinions[s.id] || TEACHER_OPINION_PRESETS[0];
      return {
        no: index + 1,
        studentNo: s.studentNo || String(100 + index + 1),
        name: s.name,
        birthDate: s.birthDate || "-",
        turkce: levelLabels[r.turkce || "iyi"],
        matematik: levelLabels[r.matematik || "cok_basarili"],
        fen: levelLabels[r.fen || "iyi"],
        sosyal: levelLabels[r.sosyal || "iyi"],
        hareket: levelLabels[r.hareket_saglik || "cok_basarili"],
        sanat: levelLabels[r.sanat || "cok_basarili"],
        muzik: levelLabels[r.muzik || "iyi"],
        sdb: levelLabels[r.sdb || "iyi"],
        degerler: levelLabels[r.degerler || "cok_basarili"],
        okuryazarlik: levelLabels[r.okuryazarlik || "iyi"],
        opinion: op,
      };
    });

    await exportOfficialTableToExcel({
      fileName: `Resmi_Gelisim_Raporu_Toplu_${term}_Donem`,
      sheetName: "Sınıf Gelişim Karnesi",
      title: `T.C. MİLLÎ EĞİTİM BAKANLIĞI — OKUL ÖNCESİ DÖNEM SONU GELİŞİM RAPORU (${term}. DÖNEM)`,
      subtitle: `${schoolName} · ${className} · ${academicYear} Eğitim Öğretim Yılı`,
      metadata: [
        { label: "Okul Adı", value: schoolName },
        { label: "Şube", value: className },
        { label: "Öğretmen", value: teacherName },
        { label: "Müdür", value: principalName },
        { label: "Dönem", value: `${term}. Dönem` },
        { label: "Mevcut", value: String(students.length) },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "No", key: "studentNo", width: 8, align: "center" },
        { header: "Öğrenci Adı Soyadı", key: "name", width: 24, align: "left" },
        { header: "Doğum Tarihi", key: "birthDate", width: 14, align: "center" },
        { header: "Türkçe (TADB)", key: "turkce", width: 18, align: "center" },
        { header: "Matematik (MAB)", key: "matematik", width: 18, align: "center" },
        { header: "Fen (FAB)", key: "fen", width: 18, align: "center" },
        { header: "Sosyal (SAB)", key: "sosyal", width: 18, align: "center" },
        { header: "Hareket & Sağlık", key: "hareket", width: 18, align: "center" },
        { header: "Sanat (SNAB)", key: "sanat", width: 18, align: "center" },
        { header: "Müzik (MÜAB)", key: "muzik", width: 18, align: "center" },
        { header: "Sosyal-Duygusal (SDB)", key: "sdb", width: 20, align: "center" },
        { header: "Erdem-Değer", key: "degerler", width: 18, align: "center" },
        { header: "Okuryazarlık (OB)", key: "okuryazarlik", width: 18, align: "center" },
        { header: "Öğretmenin Genel Kanaati", key: "opinion", width: 45, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  const currentRatings = allRatings[currentStudent.id] || {};
  const currentOpinion = opinions[currentStudent.id] || TEACHER_OPINION_PRESETS[0];

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable" style={{ maxWidth: "1150px" }}>
        {/* Actions bar (No print) */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>MEB Okul Öncesi Resmî Gelişim Raporu (Karne) — TTKB s. 109–114</strong>
            <small>Dönem Sonu Karnesi · A4 Resmî Çıktı, Word İndirme ve Toplu Sınıf Excel</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn"
              style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
              onClick={() => void handleDownloadExcel()}
              title="Tüm sınıfın dönem sonu gelişim karnesini toplu Excel (.xlsx) olarak indir"
            >
              📊 Sınıf Karnesi Excel (.xlsx)
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır (Karne Bas)
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📥 Word İndir (.doc)
            </button>
            {onClose ? (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            ) : null}
          </div>
        </div>

        {/* Student Selector Bar (No print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "10px",
            padding: "8px 12px",
            marginBottom: "14px",
            overflowX: "auto",
          }}
        >
          <strong style={{ fontSize: "0.82rem", color: "#9a3412", whiteSpace: "nowrap" }}>
            👤 Öğrenci Seç ({activeStudentIndex + 1}/{students.length}):
          </strong>
          <div style={{ display: "flex", gap: "6px" }}>
            {students.map((student, idx) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setActiveStudentIndex(idx)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "14px",
                  border: activeStudentIndex === idx ? "1.5px solid #ea580c" : "1px solid #cbd5e1",
                  background: activeStudentIndex === idx ? "#ea580c" : "#ffffff",
                  color: activeStudentIndex === idx ? "#ffffff" : "#334155",
                  fontWeight: activeStudentIndex === idx ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {student.name}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Official Header */}
        <header className="official-form-header">
          <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 style={{ fontSize: "1.1rem", color: "#c2410c" }}>OKUL ÖNCESİ EĞİTİM DÖNEM SONU GELİŞİM RAPORU</h1>
          <p className="official-form-subtext">
            {academicYear} Eğitim-Öğretim Yılı · {term}. Dönem Resmî Gelişim Belgesi (TTKB 2026)
          </p>
        </header>

        {/* Meta info inputs */}
        <div className="of-grid-4" style={{ marginBottom: "12px" }}>
          <div className="of-field">
            <label>Öğrenci Adı Soyadı:</label>
            <input type="text" value={currentStudent.name} readOnly style={{ fontWeight: 700, background: "#f8fafc" }} />
          </div>
          <div className="of-field">
            <label>Okul No / Doğum Tarihi:</label>
            <input type="text" value={`No: ${currentStudent.studentNo || '-'} · D.T: ${currentStudent.birthDate || '-'}`} readOnly style={{ background: "#f8fafc" }} />
          </div>
          <div className="of-field">
            <label>Dönem Seçimi:</label>
            <select value={term} onChange={(e) => setTerm(e.target.value as "1" | "2")}>
              <option value="1">1. Dönem Sonu (Ocak)</option>
              <option value="2">2. Dönem Sonu (Haziran)</option>
            </select>
          </div>
          <div className="of-field">
            <label>Sınıfı / Şubesi:</label>
            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} />
          </div>
        </div>

        {/* 10 Areas Assessment Matrix */}
        <table className="of-table" style={{ fontSize: "0.82rem", marginBottom: "14px" }}>
          <thead>
            <tr style={{ background: "#ffedd5", color: "#c2410c" }}>
              <th style={{ width: "24%" }}>Gelişim Alanı / Kod</th>
              <th>Öğrenme Çıktısı ve Gösterge Özeti</th>
              <th style={{ width: "85px", textAlign: "center" }}>Geliştirilmeli</th>
              <th style={{ width: "85px", textAlign: "center" }}>İyi Düzeyde</th>
              <th style={{ width: "85px", textAlign: "center" }}>Çok Başarılı</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_AREAS.map((area) => {
              const currentLvl = currentRatings[area.areaKey] || area.defaultLevel;
              return (
                <tr key={area.areaKey} style={{ breakInside: "avoid" }}>
                  <td style={{ verticalAlign: "middle" }}>
                    <strong style={{ color: "#0f172a" }}>{area.areaTitle}</strong>
                    <div style={{ fontSize: "0.7rem", color: "#ea580c", fontWeight: 700 }}>{area.code}</div>
                  </td>
                  <td style={{ verticalAlign: "middle", fontSize: "0.78rem", color: "#334155" }}>
                    {area.summary}
                  </td>
                  {(["gelistirilmeli", "iyi", "cok_basarili"] as SkillLevel[]).map((lvl) => {
                    const active = currentLvl === lvl;
                    return (
                      <td
                        key={lvl}
                        onClick={() => setRating(area.areaKey, lvl)}
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          cursor: "pointer",
                          background: active ? (lvl === "cok_basarili" ? "#f0fdf4" : lvl === "iyi" ? "#eff6ff" : "#fef2f2") : "transparent",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "22px",
                            height: "22px",
                            lineHeight: "20px",
                            borderRadius: "50%",
                            border: active
                              ? lvl === "cok_basarili"
                                ? "2px solid #059669"
                                : lvl === "iyi"
                                ? "2px solid #2563eb"
                                : "2px solid #dc2626"
                              : "1px solid #cbd5e1",
                            background: active
                              ? lvl === "cok_basarili"
                                ? "#059669"
                                : lvl === "iyi"
                                ? "#2563eb"
                                : "#dc2626"
                              : "#ffffff",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                          }}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Teacher Opinion & Presets */}
        <div style={{ marginTop: "12px", breakInside: "avoid" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <strong style={{ fontSize: "0.85rem", color: "#c2410c" }}>
              📝 ÖĞRETMENİN GENEL GÖRÜŞ VE ÖNERİLERİ:
            </strong>
            {/* Presets dropdown (no print) */}
            <div className="no-print" style={{ display: "flex", gap: "4px" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Hazır Şablon:</span>
              {TEACHER_OPINION_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setOpinion(preset)}
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.7rem",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                  title={preset}
                >
                  Şablon {pIdx + 1}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="of-textarea"
            rows={4}
            value={currentOpinion}
            onChange={(e) => setOpinion(e.target.value)}
            style={{ width: "100%", fontSize: "0.85rem", lineHeight: "1.4" }}
          />
          <div className="print-only-text multiline-text" style={{ padding: "8px", border: "1px solid #777", minHeight: "60px" }}>
            {currentOpinion}
          </div>
        </div>

        {/* Signatures */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: "30px",
            paddingTop: "14px",
            borderTop: "1px solid #cbd5e1",
            textAlign: "center",
            breakInside: "avoid",
          }}
        >
          <div>
            <strong>{teacherName}</strong>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Sınıf Öğretmeni</div>
          </div>
          <div>
            <strong>{principalName}</strong>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Okul Müdürü</div>
          </div>
        </div>
      </div>
    </div>
  );
}
