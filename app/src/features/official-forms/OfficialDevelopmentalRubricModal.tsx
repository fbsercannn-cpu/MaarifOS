import { useState } from "react";
import "./official-forms.css";

interface RubricCriterion {
  id: string;
  domain: string;
  skillName: string;
  level1: string; // Başlangıç (1 puan)
  level2: string; // Gelişmekte Olan (2 puan)
  level3: string; // Yetkin / İleri (3 puan)
}

const RUBRIC_CRITERIA: RubricCriterion[] = [
  {
    id: "turkce",
    domain: "Türkçe Alan Becerileri (TADB / TAOB / TAKB)",
    skillName: "Dinleme, Sözlü İfade ve Erken Okuryazarlık Farkındalığı",
    level1: "Dinleme ve anlatımda yetişkinin doğrudan sözel desteğine ve yönlendirici sorularına ihtiyaç duyar. Sözcük dağarcığı sınırlıdır.",
    level2: "Dinlediklerini kısmen kendi cümleleriyle aktarır, resimli kitapları inceler ve aşina olduğu sembol/yazıların anlamını merak eder.",
    level3: "Konuşmayı akıcı sürdürür, dinlediği öyküdeki sebep-sonuç ilişkilerini açıklar ve yazı-ses farkındalığını bağımsız sergiler.",
  },
  {
    id: "matematik",
    domain: "Matematik Alan Becerileri (MAB)",
    skillName: "Sayı Hissi, Örüntü Kurma ve Geometrik/Mekânsal Akıl Yürütme",
    level1: "1-5 arası nesneleri sayarken teke tek eşlemede desteğe gereksinim duyar. Basit örüntüleri model olmadan sürdürmekte zorlanır.",
    level2: "1-10 arası nesneleri sayar, temel geometrik şekilleri (daire, üçgen, kare) tanır ve 2 ögeli (AB-AB) örüntüyü sürdürür.",
    level3: "10 ve üzeri nesneleri doğru sayar, nesneleri miktar ve boyutuna göre karşılaştırır, karmaşık örüntüler üretir ve problem çözer.",
  },
  {
    id: "fen",
    domain: "Fen Alan Becerileri (FAB)",
    skillName: "Bilimsel Gözlem, Hipotez Geliştirme ve Neden-Sonuç İlişkisi",
    level1: "Çevresindeki canlı ve cansız varlıkları gözlemlerken yetişkinin yönlendirmesine güvenir. Tahminde bulunmakta çekimserdir.",
    level2: "Duyularını kullanarak deney ve gözlemlere katılır, 'Bunu suya atarsak ne olur?' gibi sorulara somut tahminler üretir.",
    level3: "Gözlemlerini bağımsız kayıt altına alır, neden-sonuç bağıntılarını açıklar, merak ettiği konuları araştırmak için deneyler kurgular.",
  },
  {
    id: "sosyal",
    domain: "Sosyal Alan Becerileri (SAB)",
    skillName: "Akran İş Birliği, Sorumluluk Alma ve Sosyal Kurallara Uyum",
    level1: "Grup oyunlarında sırasını beklemekte ve sınıf kurallarına uymakta yetişkin hatırlatmasına sürekli ihtiyaç duyar.",
    level2: "Arkadaşlarıyla iş birliği yapar, paylaşıma açıktır, sınıf rutinlerine ve nezaket kurallarına çoğunlukla özen gösterir.",
    level3: "Grup etkinliklerinde liderlik veya destekleyici roller üstlenir, akran çatışmalarında müzakere yolunu seçer, sorumluluklarını sahiplenir.",
  },
  {
    id: "hareket",
    domain: "Hareket ve Sağlık Becerileri (HAB)",
    skillName: "Kaba-İnce Motor Koordinasyon, Denge ve Kişisel Hijyen/Öz Bakım",
    level1: "Makas kullanma, fermuar çekme veya tek ayak üstünde durma gibi denge hareketlerinde fiziksel desteğe ihtiyaç duyar.",
    level2: "Düz çizgide yürür, topu hedefe atar, el-göz koordinasyonunu gerektiren manipülatif materyalleri (lego, makas, boya) yönetir.",
    level3: "Vücut koordinasyonu ve esnekliği yüksektir; karmaşık hareket parkurlarını tamamlar, öz bakım ve el yıkama rutinini bağımsız yürütür.",
  },
  {
    id: "sanat",
    domain: "Sanat Alan Becerileri (SNAB)",
    skillName: "Yaratıcı İfade, Özgün Ürün Tasarımı ve Estetik Yorumlama",
    level1: "Sanat materyallerini tanıma aşamasındadır; çoğunlukla yetişkinin yaptığı örneği birebir kopyalama eğilimindedir.",
    level2: "Farklı boya, kil ve atık malzemeleri deneyimler; kendi fikirlerini içeren renkli ve özgün kompozisyonlar oluşturur.",
    level3: "Farklı malzemeleri sıra dışı birleştirerek özgün sanat eserleri üretir; akranlarının ve sanatçıların çalışmalarını estetik açıdan yorumlar.",
  },
  {
    id: "muzik",
    domain: "Müzik Alan Becerileri (MZB)",
    skillName: "Ritim Algısı, Ses Tonlama ve Vücut/Çalgı Perküsyonu",
    level1: "Müzik dinlerken ritme eşlik etmekte zorlanır; şarkı sözlerini melodiye uydurmakta yetişkin desteği bekler.",
    level2: "Şarkıları ses tonuna uygun söyler, basit el çırpma ve orff çalgılarıyla (marakas, tef) ritim kalıplarına uyum sağlar.",
    level3: "Karmaşık ritim kalıplarını bedeniyle veya çalgıyla bağımsız tekrar eder; doğaçlama melodiler ve ritim oyunları kurgular.",
  },
];

export function OfficialDevelopmentalRubricModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useState("Demir Korkmaz");
  const [date, setDate] = useState("2026-09-15");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [ageGroup, setAgeGroup] = useState("60-72 Ay (5 Yaş)");
  const [contextName, setContextName] = useState("Doğal Materyallerle Sayma, Tartı ve Yaratıcı Tasarım Atölyesi");

  const [scores, setScores] = useState<Record<string, number>>({
    turkce: 3,
    matematik: 2,
    fen: 3,
    sosyal: 2,
    hareket: 3,
    sanat: 2,
    muzik: 3,
  });

  const [teacherNotes, setTeacherNotes] = useState(
    "Öğrenci genel olarak üst düzey merak ve katılım sergilemektedir. Matematik ve örüntü çalışmalarında somut materyallerle desteklenmesi gelişimini pekiştirecektir."
  );

  const totalScore = Object.values(scores).reduce((acc, val) => acc + val, 0);
  const maxScore = RUBRIC_CRITERIA.length * 3;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const handleScoreChange = (criterionId: string, level: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: level }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Gelisim_Gozlem_Rubrigi_${studentName.replace(/\s+/g, "_")}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.3; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 9pt; }
        th { background-color: #f2f2f2; text-align: center; }
        .selected { background-color: #d1fae5; font-weight: bold; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          SÜREÇ ODAKLI DERECELİ PUANLAMA ANAHTARI (GELİŞİM GÖZLEM RUBRİĞİ)
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${studentName}</td><td><b>Yaş Grubu:</b> ${ageGroup}</td></tr>
          <tr><td><b>Gözlem Bağlamı / Etkinlik:</b> ${contextName}</td><td><b>Gözlem Tarihi:</b> ${date}</td></tr>
          <tr><td><b>Okul / Kurum:</b> ${schoolName}</td><td><b>Değerlendiren Öğretmen:</b> ${teacherName}</td></tr>
          <tr><td colspan='2'><b>Genel Performans Skoru:</b> ${totalScore} / ${maxScore} (%${percentage})</td></tr>
        </table>
        <h4>7 Öğrenme Alanı Süreç Odaklı Düzey Değerlendirmesi (TTKB Sayfa 109)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 25%'>Öğrenme Alanı ve Beceri</th>
              <th style='width: 25%'>1. Düzey: Başlangıç (1 P)</th>
              <th style='width: 25%'>2. Düzey: Gelişmekte (2 P)</th>
              <th style='width: 25%'>3. Düzey: Yetkin (3 P)</th>
            </tr>
          </thead>
          <tbody>
            ${RUBRIC_CRITERIA.map((c) => {
              const currentScore = scores[c.id] || 1;
              return `
                <tr>
                  <td><b>${c.domain}</b><br/><small>${c.skillName}</small><br/><b>[Seçilen: ${currentScore} Puan]</b></td>
                  <td class='${currentScore === 1 ? "selected" : ""}'>${c.level1}</td>
                  <td class='${currentScore === 2 ? "selected" : ""}'>${c.level2}</td>
                  <td class='${currentScore === 3 ? "selected" : ""}'>${c.level3}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
        <br/>
        <table>
          <tr>
            <td><b>Öğretmenin Pedagojik Geri Bildirimi ve Destekleme Planı:</b><br/>${teacherNotes}</td>
          </tr>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Onay / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Gelisim_Gozlem_Rubrigi_${studentName.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const levelTitles: Record<number, string> = {
      1: "1. Düzey: Başlangıç",
      2: "2. Düzey: Gelişmekte",
      3: "3. Düzey: Yetkin",
    };

    const rows = RUBRIC_CRITERIA.map((c, index) => {
      const score = scores[c.id] || 1;
      return {
        no: index + 1,
        domain: c.domain,
        skillName: c.skillName,
        levelTitle: levelTitles[score],
        score,
        level1: c.level1,
        level2: c.level2,
        level3: c.level3,
      };
    });

    await exportOfficialTableToExcel({
      fileName: `Gozlem_Rubrigi_${studentName.replace(/\s+/g, "_")}`,
      sheetName: "Gelişim Rubriği",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — SÜREÇ ODAKLI DERECELİ PUANLAMA ANAHTARI (RUBRİK)",
      subtitle: `${schoolName} · ${studentName} (${ageGroup}) · Tarih: ${date} · Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Öğrenci", value: studentName },
        { label: "Yaş Grubu", value: ageGroup },
        { label: "Etkinlik", value: contextName },
        { label: "Tarih", value: date },
        { label: "Öğretmen", value: teacherName },
        { label: "Toplam Skor", value: `${totalScore} / ${maxScore} (%${percentage})` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenme Alanı", key: "domain", width: 28, align: "left" },
        { header: "Hedeflenen Beceri", key: "skillName", width: 32, align: "left" },
        { header: "Ulaşılan Düzey", key: "levelTitle", width: 20, align: "center" },
        { header: "Puan (1-3)", key: "score", width: 12, align: "center", isNumeric: true },
        { header: "1. Düzey: Başlangıç", key: "level1", width: 35, align: "left" },
        { header: "2. Düzey: Gelişmekte", key: "level2", width: 35, align: "left" },
        { header: "3. Düzey: Yetkin", key: "level3", width: 35, align: "left" },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 109</span>
          <h3 className="of-action-title">Süreç Odaklı Dereceli Puanlama Anahtarı (Rubrik)</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
            onClick={() => void handleDownloadExcel()}
            title="Süreç odaklı rubrik puanlarını Excel (.xlsx) olarak indir"
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
            SÜREÇ ODAKLI DERECELİ PUANLAMA ANAHTARI (BECERİ GÖZLEM RUBRİĞİ)
          </div>
          <div className="of-header-meta-ref">MEB TTKB Ölçme ve Değerlendirme Esasları (Sayfa 109)</div>
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
            <label className="of-meta-label">Yaş Grubu:</label>
            <select
              className="of-meta-input"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
            >
              <option value="36-48 Ay (3 Yaş)">36-48 Ay (3 Yaş)</option>
              <option value="48-60 Ay (4 Yaş)">48-60 Ay (4 Yaş)</option>
              <option value="60-72 Ay (5 Yaş)">60-72 Ay (5 Yaş)</option>
            </select>
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Gözlem Tarihi:</label>
            <input
              type="date"
              className="of-meta-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Okul / Kurum:</label>
            <input
              type="text"
              className="of-meta-input"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Değerlendiren Öğretmen:</label>
            <input
              type="text"
              className="of-meta-input"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div className="of-meta-field" style={{ gridColumn: "span 2" }}>
            <label className="of-meta-label">Gözlem Bağlamı / Etkinlik Adı:</label>
            <input
              type="text"
              className="of-meta-input"
              value={contextName}
              onChange={(e) => setContextName(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <strong style={{ color: "#166534" }}>Bütüncül Yetkinlik Skoru: </strong>
            <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#15803d" }}>
              {totalScore} / {maxScore} Puan
            </span>
            <span style={{ marginLeft: "8px", color: "#166534" }}>(%{percentage})</span>
          </div>
          <div style={{ width: "200px", height: "10px", background: "#dcfce7", borderRadius: "5px", overflow: "hidden" }}>
            <div
              style={{
                width: `${percentage}%`,
                height: "100%",
                background: percentage > 75 ? "#16a34a" : percentage > 50 ? "#ca8a04" : "#dc2626",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
          <thead>
            <tr>
              <th style={{ width: "24%", textAlign: "left", background: "#f8fafc" }}>
                Öğrenme Alanı &amp; Süreç Bileşeni
              </th>
              <th style={{ width: "25%", textAlign: "center", background: "#fef2f2" }}>
                1. Düzey: Başlangıç (1 P)
              </th>
              <th style={{ width: "25%", textAlign: "center", background: "#fefce8" }}>
                2. Düzey: Gelişmekte (2 P)
              </th>
              <th style={{ width: "26%", textAlign: "center", background: "#f0fdf4" }}>
                3. Düzey: Yetkin (3 P)
              </th>
            </tr>
          </thead>
          <tbody>
            {RUBRIC_CRITERIA.map((crit) => {
              const currentScore = scores[crit.id] || 1;
              return (
                <tr key={crit.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ verticalAlign: "top" }}>
                    <strong style={{ display: "block", color: "#0f172a" }}>{crit.domain}</strong>
                    <small style={{ color: "#64748b", display: "block", marginTop: "2px" }}>
                      {crit.skillName}
                    </small>
                    <div style={{ marginTop: "6px" }} className="no-print">
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#1d4ed8" }}>
                        Seçim: {currentScore} Puan
                      </span>
                    </div>
                  </td>

                  <td
                    onClick={() => handleScoreChange(crit.id, 1)}
                    style={{
                      cursor: "pointer",
                      verticalAlign: "top",
                      background: currentScore === 1 ? "#fee2e2" : "transparent",
                      border: currentScore === 1 ? "2px solid #ef4444" : "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <input
                        type="radio"
                        name={`score-${crit.id}`}
                        checked={currentScore === 1}
                        onChange={() => handleScoreChange(crit.id, 1)}
                        aria-label="1. Düzey Başlangıç"
                      />
                      <span style={{ fontSize: "0.85rem", lineHeight: "1.35" }}>{crit.level1}</span>
                    </div>
                  </td>

                  <td
                    onClick={() => handleScoreChange(crit.id, 2)}
                    style={{
                      cursor: "pointer",
                      verticalAlign: "top",
                      background: currentScore === 2 ? "#fef08a" : "transparent",
                      border: currentScore === 2 ? "2px solid #eab308" : "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <input
                        type="radio"
                        name={`score-${crit.id}`}
                        checked={currentScore === 2}
                        onChange={() => handleScoreChange(crit.id, 2)}
                        aria-label="2. Düzey Gelişmekte"
                      />
                      <span style={{ fontSize: "0.85rem", lineHeight: "1.35" }}>{crit.level2}</span>
                    </div>
                  </td>

                  <td
                    onClick={() => handleScoreChange(crit.id, 3)}
                    style={{
                      cursor: "pointer",
                      verticalAlign: "top",
                      background: currentScore === 3 ? "#bbf7d0" : "transparent",
                      border: currentScore === 3 ? "2px solid #22c55e" : "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <input
                        type="radio"
                        name={`score-${crit.id}`}
                        checked={currentScore === 3}
                        onChange={() => handleScoreChange(crit.id, 3)}
                        aria-label="3. Düzey Yetkin"
                      />
                      <span style={{ fontSize: "0.85rem", lineHeight: "1.35" }}>{crit.level3}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: "14px" }}>
          <label className="of-meta-label">
            Öğretmenin Pedagojik Geri Bildirimi ve Destekleme / Zenginleştirme Planı:
          </label>
          <textarea
            className="of-textarea"
            rows={3}
            value={teacherNotes}
            onChange={(e) => setTeacherNotes(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.9rem" }}
          />
        </div>

        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">Değerlendiren Sınıf Öğretmeni</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Okul Müdürü</div>
            <div className="of-sig-name">Uygundur / Tasdik Olunur</div>
            <div className="of-sig-line">Mühür ve İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
