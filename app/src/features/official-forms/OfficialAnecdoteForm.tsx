import { useState } from "react";
import "./official-forms.css";

export interface OfficialAnecdoteFormData {
  studentName: string;
  date: string;
  observedPlace: string;
  observedSituation: string;
  observedSkills: string;
  generalEvaluation: string;
  teacherName?: string;
  schoolName?: string;
}

interface Props {
  initialData?: Partial<OfficialAnecdoteFormData>;
  studentList?: { id: string; name: string }[];
  onClose?: () => void;
}

export function OfficialAnecdoteForm({
  initialData,
  studentList = [],
  onClose,
}: Props) {
  const [formData, setFormData] = useState<OfficialAnecdoteFormData>({
    studentName: initialData?.studentName || (studentList[0]?.name ?? ""),
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    observedPlace: initialData?.observedPlace || "Öğrenme Merkezi / Sınıf",
    observedSituation:
      initialData?.observedSituation ||
      "Etkinlik sürecinde arkadaşlarıyla iş birliği yaparken materyalleri paylaşma ve sırasını bekleme konusunda olumlu tutum sergiledi.",
    observedSkills:
      initialData?.observedSkills ||
      "Sosyal-Duygusal Beceriler: SDB1.2. Kendini Düzenleme, Değerler: D3.4. Çalışkanlık ve Paylaşım",
    generalEvaluation:
      initialData?.generalEvaluation ||
      "Gözlenen durum çocuğun sosyal uyum ve empati becerilerinin gelişimini desteklemektedir. Süreç takip edilmeye devam edecektir.",
    teacherName: initialData?.teacherName || "Okul Öncesi Öğretmeni",
    schoolName: initialData?.schoolName || "",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-2 ANEKDOT KAYIT FORMU - ${formData.studentName}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #111; line-height: 1.4; padding: 20px; }
  h2 { text-align: center; font-size: 14pt; color: #c2410c; margin-bottom: 8px; }
  .guidance { font-style: italic; font-size: 9.5pt; color: #444; margin-bottom: 20px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #777; padding: 10px; vertical-align: top; }
  .label-cell { width: 30%; background-color: #f8fafc; font-weight: bold; }
  .section-header { background-color: #ffedd5; font-weight: bold; padding: 8px 10px; }
  .footer { margin-top: 30px; text-align: right; font-weight: bold; }
</style>
</head>
<body>
  <h2>EK-2 ANEKDOT KAYIT FORMU</h2>
  <div class="guidance">
    Günlük plan kapsamında gerçekleştirilen etkinliklerin ardından yapılan gözlemler doğrultusunda günlük veya haftalık olarak ya da özel bir durumun ortaya çıkması hâlinde anekdot kaydı tutulması beklenmektedir. Bu form, çocuğa ilişkin olumlu veya olumsuz nitelikte dikkat çekici bir durum gözlemlendiğinde öğretmen tarafından gerektiği zaman doldurulabilir.
  </div>
  <table>
    <tr>
      <td class="label-cell">Çocuğun Adı Soyadı</td>
      <td>${formData.studentName}</td>
    </tr>
    <tr>
      <td class="label-cell">Tarih</td>
      <td>${formData.date}</td>
    </tr>
    <tr>
      <td class="label-cell">Gözlenen Mekân</td>
      <td>${formData.observedPlace}</td>
    </tr>
    <tr>
      <td colspan="2" class="section-header">
        Gözlenen Durum<br>
        <span style="font-size: 8.5pt; font-weight: normal; color: #555;">(Bu formu doldurmanıza neden olan durumu açıklamanız beklenmektedir.)</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="min-height: 120px; height: 120px;">
        ${formData.observedSituation.split("\n").join("<br>")}
      </td>
    </tr>
    <tr>
      <td colspan="2" class="section-header">Gözlenen Beceriler</td>
    </tr>
    <tr>
      <td colspan="2" style="min-height: 80px; height: 80px;">
        ${formData.observedSkills.split("\n").join("<br>")}
      </td>
    </tr>
    <tr>
      <td colspan="2" class="section-header">Gözlemcinin Genel Değerlendirmesi</td>
    </tr>
    <tr>
      <td colspan="2" style="min-height: 100px; height: 100px;">
        ${formData.generalEvaluation.split("\n").join("<br>")}
      </td>
    </tr>
  </table>
  <div class="footer">
    <p>Gözlem Yapan Öğretmen: ${formData.teacherName}</p>
    <p>İmza: .......................................</p>
  </div>
</body>
</html>`;

    const blob = new Blob(["﻿" + htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-2_Anekdot_Formu_${formData.studentName.replace(/\s+/g, "_")}_${formData.date}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable">
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-2 Anekdot Kayıt Formu (TTKB Sayfa 178)</strong>
            <small>Resmî Format · A4 Çıktı ve Word Uyumluluğu</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn of-btn--print"
              onClick={handlePrint}
            >
              🖨️ A4 Yazdır / PDF Kaydet
            </button>
            <button
              type="button"
              className="of-btn of-btn--word"
              onClick={handleDownloadWord}
            >
              📄 Word Olarak İndir (.doc)
            </button>
            {onClose ? (
              <button
                type="button"
                className="of-btn of-btn--close"
                onClick={onClose}
              >
                Kapat
              </button>
            ) : null}
          </div>
        </div>

        <div className="official-sheet">
          <header className="official-sheet__header">
            <h1 className="official-sheet__title">EK-2 ANEKDOT KAYIT FORMU</h1>
            <p className="official-sheet__guidance">
              Günlük plan kapsamında gerçekleştirilen etkinliklerin ardından
              yapılan gözlemler doğrultusunda günlük veya haftalık olarak ya da
              özel bir durumun ortaya çıkması hâlinde anekdot kaydı tutulması
              beklenmektedir. Bu form, çocuğa ilişkin olumlu veya olumsuz
              nitelikte dikkat çekici bir durum gözlemlendiğinde öğretmen
              tarafından gerektiği zaman doldurulabilir.
            </p>
          </header>

          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Çocuğun Adı Soyadı</th>
                <td className="official-table__value">
                  {studentList.length > 0 ? (
                    <select
                      className="of-input no-print-select"
                      value={formData.studentName}
                      onChange={(e) =>
                        setFormData({ ...formData, studentName: e.target.value })
                      }
                    >
                      {studentList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="of-input"
                      value={formData.studentName}
                      onChange={(e) =>
                        setFormData({ ...formData, studentName: e.target.value })
                      }
                    />
                  )}
                  <span className="print-only-text">{formData.studentName}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Tarih</th>
                <td className="official-table__value">
                  <input
                    type="date"
                    className="of-input"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                  <span className="print-only-text">{formData.date}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Gözlenen Mekân</th>
                <td className="official-table__value">
                  <input
                    type="text"
                    className="of-input"
                    value={formData.observedPlace}
                    placeholder="Örn: Bahçe, Sanat Merkezi, Oyun Parkı..."
                    onChange={(e) =>
                      setFormData({ ...formData, observedPlace: e.target.value })
                    }
                  />
                  <span className="print-only-text">
                    {formData.observedPlace}
                  </span>
                </td>
              </tr>
              <tr>
                <th colSpan={2} className="official-table__section-header">
                  Gözlenen Durum
                  <small>
                    (Bu formu doldurmanıza neden olan durumu açıklamanız
                    beklenmektedir.)
                  </small>
                </th>
              </tr>
              <tr>
                <td colSpan={2} className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea of-textarea--large"
                    rows={5}
                    value={formData.observedSituation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observedSituation: e.target.value,
                      })
                    }
                  />
                  <div className="print-only-text multiline-text">
                    {formData.observedSituation}
                  </div>
                </td>
              </tr>
              <tr>
                <th colSpan={2} className="official-table__section-header">
                  Gözlenen Beceriler
                </th>
              </tr>
              <tr>
                <td colSpan={2} className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={4}
                    value={formData.observedSkills}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observedSkills: e.target.value,
                      })
                    }
                  />
                  <div className="print-only-text multiline-text">
                    {formData.observedSkills}
                  </div>
                </td>
              </tr>
              <tr>
                <th colSpan={2} className="official-table__section-header">
                  Gözlemcinin Genel Değerlendirmesi
                </th>
              </tr>
              <tr>
                <td colSpan={2} className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={4}
                    value={formData.generalEvaluation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalEvaluation: e.target.value,
                      })
                    }
                  />
                  <div className="print-only-text multiline-text">
                    {formData.generalEvaluation}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <footer className="official-sheet__footer">
            <div className="official-sheet__signature">
              <span>Gözlem Yapan Öğretmen</span>
              <strong>{formData.teacherName}</strong>
              <div className="signature-line">İmza: ...................................</div>
            </div>
            <div className="official-sheet__page-num">178</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
