import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import {
  exportOfficialTableToExcel,
  printOfficialFormA4,
} from "./official-form-export-service.ts";
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
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [formData, setFormData] = useOfficialFormState<OfficialAnecdoteFormData>("formData", {
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
    printOfficialFormA4(`EK-2_Anekdot_${formData.studentName.replace(/\s+/g, "_")}_${formData.date}`);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportOfficialTableToExcel({
        fileName: `EK-2_Anekdot_${formData.studentName.replace(/\s+/g, "_")}_${formData.date}`,
        sheetName: "EK-2 Anekdot",
        title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — EK-2 ANEKDOT KAYIT FORMU",
        subtitle: `Öğrenci: ${formData.studentName} · Tarih: ${formData.date} · Mekân: ${formData.observedPlace}`,
        metadata: [
          { label: "Çocuğun Adı Soyadı", value: formData.studentName },
          { label: "Tarih", value: formData.date },
          { label: "Gözlenen Mekân", value: formData.observedPlace },
          { label: "Öğretmen", value: formData.teacherName || "Öğretmen" },
        ],
        columns: [
          { header: "Form Bölümü", key: "section", width: 25 },
          { header: "Gözlem ve Değerlendirme Kaydı", key: "content", width: 75 },
        ],
        rows: [
          { section: "GÖZLENEN DURUM", content: formData.observedSituation },
          { section: "GÖZLENEN BECERİLER", content: formData.observedSkills },
          { section: "GENEL DEĞERLENDİRME", content: formData.generalEvaluation },
          { section: "GÖZLEMCİ / ÖĞRETMEN", content: formData.teacherName || "" },
        ],
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadWord = () => downloadOfficialFormWord("OfficialAnecdoteForm");

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
              className="of-btn"
              style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
              onClick={() => void handleDownloadExcel()}
              disabled={isExportingExcel}
              title="Microsoft Excel (.xlsx) olarak indir"
            >
              {isExportingExcel ? "Excel Hazırlanıyor..." : "📊 Excel (.xlsx)"}
            </button>
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
              📄 Word Olarak İndir (.docx)
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
                    <input readOnly title="Çocuk profilindeki kayıtlı bilgi"
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
