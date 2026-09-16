import { useState } from "react";
import "./official-forms.css";

interface QuestionAnswer {
  id: string;
  question: string;
  category: "bilişsel" | "sosyal" | "duygu" | "merkezler" | "özgün";
  childResponse: string;
  teacherNote: string;
}

const PRESET_QUESTIONS: Omit<QuestionAnswer, "childResponse" | "teacherNote">[] = [
  {
    id: "q1",
    category: "bilişsel",
    question: "Sence gökyüzündeki bulutlar neden bazen beyaz bazen gri olur?",
  },
  {
    id: "q2",
    category: "bilişsel",
    question: "Ağaçlar sonbaharda neden yapraklarını dökerler sence?",
  },
  {
    id: "q3",
    category: "sosyal",
    question: "Bir arkadaşın oyuncağını seninle paylaşmak istemediğinde ne yaparsın?",
  },
  {
    id: "q4",
    category: "duygu",
    question: "Seni sınıfta en çok ne mutlu eder, canın sıkıldığında ne yapmak istersin?",
  },
  {
    id: "q5",
    category: "merkezler",
    question: "Sınıftaki öğrenme merkezlerinden en çok hangisinde oynamayı seviyorsun? Neden?",
  },
  {
    id: "q6",
    category: "özgün",
    question: "Eğer sihirli bir kutun olsaydı, içinden ne çıkmasını isterdin?",
  },
];

export function OfficialChildInterviewModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useState("Demir Korkmaz");
  const [studentAge, setStudentAge] = useState("62 Ay");
  const [interviewDate, setInterviewDate] = useState("2026-09-15");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [interviewTopic, setInterviewTopic] = useState("Doğa Olayları, Akran İletişimi ve Merkez Tercihleri");
  
  const [qaList, setQaList] = useState<QuestionAnswer[]>([
    {
      id: "q1",
      category: "bilişsel",
      question: "Sence gökyüzündeki bulutlar neden bazen beyaz bazen gri olur?",
      childResponse: "Çünkü gri olunca içine çok fazla su dolduruyorlar, ağırlaşıyorlar ve yağmur olarak yere düşüyorlar.",
      teacherNote: "Neden-sonuç ilişkisini somut ve tutarlı bir mantıkla kurabiliyor. Bilimsel kavrayış yüksek.",
    },
    {
      id: "q3",
      category: "sosyal",
      question: "Bir arkadaşın oyuncağını seninle paylaşmak istemediğinde ne yaparsın?",
      childResponse: "Önce sırayla oynamayı teklif ederim. 'Sen beş dakika oyna sonra bana ver' derim. Vermezse öğretmene haber veririm.",
      teacherNote: "Uzlaşma ve müzakere becerisi gelişmiş. Problem çözme basamaklarını doğru uyguluyor.",
    },
    {
      id: "q5",
      category: "merkezler",
      question: "Sınıftaki öğrenme merkezlerinden en çok hangisinde oynamayı seviyorsun? Neden?",
      childResponse: "Blok merkezini çok seviyorum. Çünkü orada kocaman gökdelenler ve uzay üsleri inşa edebiliyorum.",
      teacherNote: "Üç boyutlu uzamsal ve mimari yapılandırma ilgisi çok güçlü.",
    },
  ]);

  const [generalEvaluation, setGeneralEvaluation] = useState(
    "Öğrenci düşüncelerini açık, net ve özgün cümlelerle ifade etmektedir. Akran iletişiminde barışçıl ve uzlaşmacı stratejiler benimsediği, doğa olaylarına yönelik gözlem ve merak düzeyinin yüksek olduğu gözlenmiştir."
  );

  const [followupPlan, setFollowupPlan] = useState(
    "Fen merkezinde su döngüsü ve hava durumu deneyleriyle bilişsel merakı desteklenecek. Blok merkezinde küçük grup iş birliği projelerine liderlik etmesi teşvik edilecek."
  );

  const handleAddQuestion = (preset: typeof PRESET_QUESTIONS[0]) => {
    if (qaList.some(q => q.id === preset.id)) return;
    setQaList(prev => [
      ...prev,
      {
        ...preset,
        childResponse: "",
        teacherNote: "",
      },
    ]);
  };

  const handleUpdateQa = (id: string, field: "childResponse" | "teacherNote" | "question", value: string) => {
    setQaList(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveQa = (id: string) => {
    setQaList(prev => prev.filter(item => item.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Cocukla_Gorusme_Formu_${studentName}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; }
        .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 10pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          ÇOCUKLA BİREYSEL GÖRÜŞME (MÜLAKAT) VE DÜŞÜNCE KAYIT FORMU
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${studentName}</td><td><b>Yaş / Ay:</b> ${studentAge}</td></tr>
          <tr><td><b>Görüşme Tarihi:</b> ${interviewDate}</td><td><b>Uygulayıcı Öğretmen:</b> ${teacherName}</td></tr>
          <tr><td colspan='2'><b>Görüşme Konusu / Amacı:</b> ${interviewTopic}</td></tr>
        </table>
        <table>
          <thead>
            <tr>
              <th style='width: 30%'>Sorulan Soru</th>
              <th style='width: 40%'>Çocuğun İfadesi (Birebir Alıntı)</th>
              <th style='width: 30%'>Öğretmen Gözlem ve Değerlendirmesi</th>
            </tr>
          </thead>
          <tbody>
            ${qaList.map(q => `
              <tr>
                <td><b>${q.question}</b><br/><small>[${q.category.toLocaleUpperCase('tr-TR')}]</small></td>
                <td>"${q.childResponse || '-'}"</td>
                <td>${q.teacherNote || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p><b>Genel Pedagojik Değerlendirme:</b><br/>${generalEvaluation}</p>
        <p><b>İzleme ve Destekleme Planı:</b><br/>${followupPlan}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Uygulayıcı Öğretmen</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü / Rehberlik</b><br/><br/>Onay<br/>İmza / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Cocukla_Gorusme_${studentName.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* Header Controls (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 109–110</span>
          <span className="of-tag of-tag--navy">Çocuğu Tanıma ve Değerlendirme</span>
          <span className="of-tag of-tag--emerald">Mülakat &amp; Düşünce Kaydı</span>
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

      {/* Preset Question Picker (No Print) */}
      <div className="of-card no-print" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "#1e3a8a" }}>
          💡 Pedagojik Mülakat Soru Bankası (Eklemek İçin Tıklayın)
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {PRESET_QUESTIONS.map(preset => {
            const isAdded = qaList.some(q => q.id === preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                className={`of-chip ${isAdded ? "is-selected" : ""}`}
                onClick={() => handleAddQuestion(preset)}
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
              >
                {isAdded ? "✓ " : "+ "}
                [{preset.category.toLocaleUpperCase('tr-TR')}] {preset.question.slice(0, 45)}...
              </button>
            );
          })}
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
            ÇOCUKLA BİREYSEL GÖRÜŞME (MÜLAKAT) VE DÜŞÜNCE KAYIT FORMU
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, s. 109–110
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
              <td style={{ width: "20%" }}><strong>Yaş / Ay Düzeyi:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={studentAge}
                  onChange={e => setStudentAge(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Görüşme Tarihi:</strong></td>
              <td>
                <input
                  type="date"
                  className="of-input"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                />
              </td>
              <td><strong>Uygulayıcı Öğretmen:</strong></td>
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
              <td><strong>Görüşme Konusu / Amacı:</strong></td>
              <td colSpan={3}>
                <input
                  type="text"
                  className="of-input"
                  value={interviewTopic}
                  onChange={e => setInterviewTopic(e.target.value)}
                  placeholder="Görüşmenin ana hedefi ve pedagojik teması"
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Questions and Answers Table */}
        <table className="of-data-table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Sorulan Soru ve Odak</th>
              <th style={{ width: "40%" }}>Çocuğun İfadesi (Birebir Alıntı)</th>
              <th style={{ width: "30%" }}>Öğretmen Gözlem ve Değerlendirmesi</th>
            </tr>
          </thead>
          <tbody>
            {qaList.map(item => (
              <tr key={item.id}>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={item.question}
                    onChange={e => handleUpdateQa(item.id, "question", e.target.value)}
                    style={{ fontWeight: "600", fontSize: "0.85rem" }}
                  />
                  <div className="no-print" style={{ marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveQa(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                    >
                      🗑️ Soruyu Kaldır
                    </button>
                  </div>
                </td>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={item.childResponse}
                    onChange={e => handleUpdateQa(item.id, "childResponse", e.target.value)}
                    placeholder="Çocuğun kendi kelimeleriyle verdiği yanıt..."
                    style={{ fontStyle: "italic", fontSize: "0.85rem" }}
                  />
                </td>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={item.teacherNote}
                    onChange={e => handleUpdateQa(item.id, "teacherNote", e.target.value)}
                    placeholder="Bilişsel, duygusal, dil gelişimi değerlendirmesi..."
                    style={{ fontSize: "0.85rem" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Synthesis & Followup */}
        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#1e3a8a" }}>
            Genel Pedagojik Değerlendirme ve Sentez:
          </label>
          <textarea
            className="of-textarea"
            rows={3}
            value={generalEvaluation}
            onChange={e => setGeneralEvaluation(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#1e3a8a" }}>
            İzleme, Destekleme ve Bireysel Gelişim Planı:
          </label>
          <textarea
            className="of-textarea"
            rows={2}
            value={followupPlan}
            onChange={e => setFollowupPlan(e.target.value)}
          />
        </div>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Uygulayıcı Okul Öncesi Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Okul Müdürü / Rehberlik Servisi</span>
            <span className="of-signature-block__name">İnceleme ve Onay</span>
            <span className="of-signature-block__sign">Mühür / İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
