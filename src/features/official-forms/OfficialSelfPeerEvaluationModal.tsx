import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface EvaluationItem {
  id: string;
  question: string;
  icon: string;
  score: "smile" | "neutral" | "sad" | null;
}

const DEFAULT_ITEMS: EvaluationItem[] = [
  {
    id: "item-1",
    question: "Bugün etkinliklere ve merkezdeki oyunlara istekle katıldım.",
    icon: "🎨",
    score: "smile",
  },
  {
    id: "item-2",
    question: "Malzemelerimi ve oyuncaklarımı arkadaşlarımla paylaştım.",
    icon: "🤝",
    score: "smile",
  },
  {
    id: "item-3",
    question: "Sınıf kurallarına ve toplanma/temizlik yönergelerine uydum.",
    icon: "🧹",
    score: "smile",
  },
  {
    id: "item-4",
    question: "Zorlandığımda pes etmedim, yeni bir yol denedim veya yardım istedim.",
    icon: "💡",
    score: "neutral",
  },
  {
    id: "item-5",
    question: "Arkadaşımın konuşmasını dinledim ve fikrine saygı gösterdim.",
    icon: "👂",
    score: "smile",
  },
];

export function OfficialSelfPeerEvaluationModal({ onClose }: { onClose?: () => void }) {
  const [studentName, setStudentName] = useOfficialFormState("studentName", "Demir Korkmaz");
  const [peerName, setPeerName] = useOfficialFormState("peerName", "Zeynep Aydın");
  const [date, setDate] = useOfficialFormState("date", "2026-09-15");
  const [activityName, setActivityName] = useOfficialFormState("activityName", "Merkezlerde Serbest Oyun ve Doğal Boyama Atölyesi");
  const [schoolName, setSchoolName] = useOfficialFormState("schoolName", "Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useOfficialFormState("teacherName", "Okul Öncesi Öğretmeni");
  const [items, setItems] = useOfficialFormState<EvaluationItem[]>("items", DEFAULT_ITEMS);
  const [childComment, setChildComment] = useOfficialFormState("childComment", "Bugün kule yaparken Zeynep bana blokları getirdi, devrilince tekrar beraber yaptık.");
  const [peerComment, setPeerComment] = useOfficialFormState("peerComment", "Arkadaşım benimle boyalarını paylaştı, resmimi çok beğendi.");
  const [teacherNote, setTeacherNote] = useOfficialFormState("teacherNote", "Öğrencinin akran iş birliği ve öz farkındalık becerileri gelişmiş düzeydedir. Süreç odaklı akran değerlendirmesi arkadaşlık bağını pekiştirmiştir.");

  const handleScoreChange = (id: string, score: "smile" | "neutral" | "sad") => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, score } : it))
    );
  };

  const handlePrint = () => {
    printOfficialFormA4(`Oz_ve_Akran_Degerlendirme_${studentName.replace(/\s+/g, '_')}`);
  };

  const handleExportWord = () => downloadOfficialFormWord("OfficialSelfPeerEvaluationModal");

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const scoreMap: Record<string, { text: string; val: number }> = {
      smile: { text: "Gülücük 😊 (Evet / Başarılı)", val: 3 },
      neutral: { text: "Düşünceli 😐 (Kısmen / Geliştirilmeli)", val: 2 },
      sad: { text: "Üzgün 🙁 (Hayır / Destek Gerekli)", val: 1 },
    };

    const rows = items.map((item, index) => {
      const scoreObj = item.score ? scoreMap[item.score] : { text: "Seçilmedi", val: 0 };
      return {
        no: index + 1,
        question: item.question,
        scoreText: scoreObj.text,
        scoreVal: scoreObj.val,
      };
    });

    await exportOfficialTableToExcel({
      fileName: `Oz_ve_Akran_Degerlendirme_${studentName.replace(/\s+/g, "_")}`,
      sheetName: "Öz ve Akran Değ.",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — ÇOCUK ÖZ DEĞERLENDİRME VE AKRAN DEĞERLENDİRME FORMU",
      subtitle: `${schoolName} · Öğrenci: ${studentName} · Akran: ${peerName} · Tarih: ${date} · Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Değerlendiren Öğrenci", value: studentName },
        { label: "Birlikte Çalışılan Akran", value: peerName },
        { label: "Etkinlik / Bağlam", value: activityName },
        { label: "Tarih", value: date },
        { label: "Öğretmen", value: teacherName },
        { label: "Öz Değerlendirme Yorumu", value: childComment },
        { label: "Akran Değerlendirme Yorumu", value: peerComment },
        { label: "Öğretmen Notu", value: teacherNote },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öz Değerlendirme Boyutu / İfade", key: "question", width: 55, align: "left" },
        { header: "Çocuğun Seçimi (Sembol)", key: "scoreText", width: 32, align: "center" },
        { header: "Puan Eşdeğeri (1-3)", key: "scoreVal", width: 16, align: "center", isNumeric: true },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 110</span>
          <h3 className="of-action-title">Öz Değerlendirme ve Akran Değerlendirme Formu</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            onClick={handleExportExcel}
            style={{ background: "#15803d", color: "#fff", borderColor: "#15803d" }}
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
            ÇOCUK ÖZ DEĞERLENDİRME VE AKRAN DEĞERLENDİRME FORMU
          </div>
          <div className="of-header-meta-ref">MEB TTKB Çocuk Katılımlı Ölçme ve Değerlendirme (Sayfa 110)</div>
        </div>

        <div className="of-meta-grid">
          <div className="of-meta-field">
            <label className="of-meta-label">Öğrencinin Adı Soyadı:</label>
            <input readOnly title="Çocuk profilindeki kayıtlı bilgi"
              type="text"
              className="of-meta-input"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Birlikte Çalışılan Akran:</label>
            <input
              type="text"
              className="of-meta-input"
              value={peerName}
              onChange={(e) => setPeerName(e.target.value)}
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
            <label className="of-meta-label">Etkinlik / Bağlam:</label>
            <input
              type="text"
              className="of-meta-input"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
            />
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          1. Çocuğun Kendi Öğrenme ve Katılım Sürecini Değerlendirmesi (Öz Değerlendirme)
        </h4>

        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "55%", textAlign: "left" }}>Gözlem Boyutu</th>
              <th style={{ width: "15%", textAlign: "center" }}>🙂 Çok İyi</th>
              <th style={{ width: "15%", textAlign: "center" }}>😐 Gelişmekte</th>
              <th style={{ width: "15%", textAlign: "center" }}>🙁 Destek İstiyorum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                <td>
                  <span style={{ marginRight: "6px" }}>{it.icon}</span>
                  <strong>{it.question}</strong>
                </td>
                <td
                  style={{
                    textAlign: "center",
                    cursor: "pointer",
                    background: it.score === "smile" ? "#dcfce7" : "transparent",
                  }}
                  onClick={() => handleScoreChange(it.id, "smile")}
                >
                  <input
                    type="radio"
                    name={`eval-${it.id}`}
                    checked={it.score === "smile"}
                    onChange={() => handleScoreChange(it.id, "smile")}
                    aria-label="Çok İyi"
                  />
                  <span style={{ marginLeft: "4px", fontSize: "1.1rem" }}>🙂</span>
                </td>
                <td
                  style={{
                    textAlign: "center",
                    cursor: "pointer",
                    background: it.score === "neutral" ? "#fef9c3" : "transparent",
                  }}
                  onClick={() => handleScoreChange(it.id, "neutral")}
                >
                  <input
                    type="radio"
                    name={`eval-${it.id}`}
                    checked={it.score === "neutral"}
                    onChange={() => handleScoreChange(it.id, "neutral")}
                    aria-label="Gelişmekte"
                  />
                  <span style={{ marginLeft: "4px", fontSize: "1.1rem" }}>😐</span>
                </td>
                <td
                  style={{
                    textAlign: "center",
                    cursor: "pointer",
                    background: it.score === "sad" ? "#fee2e2" : "transparent",
                  }}
                  onClick={() => handleScoreChange(it.id, "sad")}
                >
                  <input
                    type="radio"
                    name={`eval-${it.id}`}
                    checked={it.score === "sad"}
                    onChange={() => handleScoreChange(it.id, "sad")}
                    aria-label="Destek İstiyorum"
                  />
                  <span style={{ marginLeft: "4px", fontSize: "1.1rem" }}>🙁</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
          <div>
            <label className="of-meta-label">2. Çocuğun Kendi Sözleriyle Günün Değerlendirmesi:</label>
            <textarea
              className="of-textarea"
              rows={3}
              value={childComment}
              onChange={(e) => setChildComment(e.target.value)}
              style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="of-meta-label">3. Akran Değerlendirme İfadesi ({peerName} Hakkında):</label>
            <textarea
              className="of-textarea"
              rows={3}
              value={peerComment}
              onChange={(e) => setPeerComment(e.target.value)}
              style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label className="of-meta-label">4. Öğretmenin Pedagojik Gözlemi ve Yönlendirmesi:</label>
          <textarea
            className="of-textarea"
            rows={2}
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }}
          />
        </div>

        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">Öğrencinin Çizimi / Sembolü</div>
            <div className="of-sig-name">{studentName}</div>
            <div className="of-sig-line">Sembol / Parmak İzi</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Sınıf Öğretmeni</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
