import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface FamilyParticipationFormData {
  parentName: string;
  studentName: string;
  className: string;
  date: string;
  inClassActivities: string[];
  homeSupport: string[];
  professionShare: string[];
  outsideSchool: string[];
  materialSupport: string[];
  participationPreference: string;
  availableTimes: string;
  otherNotes: string;
}

interface Props {
  initialData?: Partial<FamilyParticipationFormData>;
  onClose?: () => void;
}

const IN_CLASS_OPTIONS = [
  "Hikâye, masal veya kitap okuma etkinliğine katılabilirim.",
  "Oyun etkinliklerinde çocuklara eşlik edebilirim.",
  "Sanat etkinliklerinde çocuklarla birlikte çalışabilirim.",
  "Müzik, ritim veya şarkı etkinliklerinde destek olabilirim.",
  "Drama, canlandırma veya tiyatro etkinliklerine katılabilirim.",
  "Fen, doğa ve deney etkinliklerinde destek olabilirim.",
  "Matematik, dikkat, eşleştirme veya problem çözme oyunlarında destek olabilirim.",
  "Hareket, spor veya geleneksel çocuk oyunları etkinliklerine katılabilirim.",
  "Türk kültürü, gelenekler ve değerler temalı etkinliklerde aktif katılım sağlayabilirim.",
];

const HOME_SUPPORT_OPTIONS = [
  "Evde sorumluluk, paylaşma ve yardımlaşma davranışlarını destekleyebilirim.",
  "Aile sohbetleri yapmak, çocukla ekransız oyunlar oynamak gibi aile bütünlüğünü destekleyen kurallara uyulmasını sağlayabilirim.",
  "Çocuğumla birlikte kitap okuma ve sohbet zamanları oluşturabilirim.",
  "Çocuğumun kendi işlerini yapmasına ve ev işlerinde sorumluluk almasına fırsat vererek onu teşvik edebilirim.",
  "Çocuğumun duygu ifade etme ve sakinleşme becerilerini destekleyebilirim.",
  "Evde sağlıklı beslenme, uyku ve öz bakım alışkanlıklarını destekleyebilirim.",
  "Okulda öğrenilen değerlerle ilgili oyunlar oynayarak model olabilirim.",
  "Öğretmenin önerdiği kısa ev uygulamalarını çocuğumla birlikte yapabilirim.",
];

const PROFESSION_OPTIONS = [
  "Mesleğimi çocuklara tanıtabilirim.",
  "El becerisi, sanat, müzik, spor veya benzeri bir ilgi alanımı paylaşabilirim.",
  "Yemek yapma, bahçe işleri, tamir, dikiş, tasarım gibi günlük yaşam becerilerini tanıtabilirim.",
  "Kültürel miras, yöresel oyunlar veya geleneksel sanatlarla ilgili paylaşım yapabilirim.",
  "Çocuklara uygun koleksiyon, araç gereç veya doğal materyal tanıtımı yapabilirim.",
  "Uzmanlık alanıma uygun kısa bir veli paylaşımı yapabilirim.",
];

const OUTSIDE_SCHOOL_OPTIONS = [
  "Gezi ve gözlem etkinliklerinde öğretmene destek olabilirim.",
  "Müze, kütüphane, doğa alanı, pazar yeri, meslek alanı gibi okul dışı öğrenme ortamları için öneride bulunabilirim.",
  "Çevre temizliği, geri dönüşüm veya doğa farkındalığı çalışmalarına destek olabilirim.",
  "Okul-aile-toplum katılımı kapsamında yerel kurumlarla iletişim kurulmasına yardımcı olabilirim.",
  "Sosyal sorumluluk ve yardımlaşma temalı etkinliklere destek olabilirim.",
];

const MATERIAL_OPTIONS = [
  "Etkinlikler için artık materyal, doğal materyal veya geri dönüşüm malzemesi sağlayabilirim.",
  "Sınıf içi öğrenme merkezleri için materyal hazırlamaya destek olabilirim.",
  "Etkinlik öncesi veya sonrası düzenleme çalışmalarına yardımcı olabilirim.",
  "Okulda düzenlenecek sergi, şenlik, atölye veya özel gün hazırlıklarına katkı sağlayabilirim.",
];

export function OfficialFamilyParticipationForm({ initialData, onClose }: Props) {
  const [formData, setFormData] = useState<FamilyParticipationFormData>({
    parentName: initialData?.parentName || "Veli Adı Soyadı",
    studentName: initialData?.studentName || "Öğrenci Adı Soyadı",
    className: initialData?.className || "Papatyalar Sınıfı (5 Yaş)",
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    inClassActivities: initialData?.inClassActivities || [IN_CLASS_OPTIONS[0]],
    homeSupport: initialData?.homeSupport || [HOME_SUPPORT_OPTIONS[2], HOME_SUPPORT_OPTIONS[7]],
    professionShare: initialData?.professionShare || [PROFESSION_OPTIONS[0]],
    outsideSchool: initialData?.outsideSchool || [OUTSIDE_SCHOOL_OPTIONS[0]],
    materialSupport: initialData?.materialSupport || [MATERIAL_OPTIONS[0]],
    participationPreference: initialData?.participationPreference || "Okula gelerek etkinliklere katılabilirim.",
    availableTimes: initialData?.availableTimes || "Hafta içi öğleden sonra veya önceden haber verilirse uygun zaman ayırabilirim.",
    otherNotes: initialData?.otherNotes || "Sınıf kitaplığına kitap bağışı ve meslek tanıtımı yapabilirim.",
  });

  const handlePrint = () => {
    printOfficialFormA4(`EK-10_Aile_Katilimi_Formu_${formData.studentName.replace(/\s+/g, "_")}_${formData.date}`);
  };

  const handleDownloadWord = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-10 AİLE KATILIMI TERCİH FORMU - ${formData.studentName}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #111; line-height: 1.35; padding: 20px; }
  h2 { text-align: center; font-size: 13pt; color: #0284c7; margin-bottom: 6px; }
  .subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #777; padding: 6px 8px; vertical-align: top; }
  .label-cell { width: 28%; background-color: #f8fafc; font-weight: bold; }
  .section-header { background-color: #e0f2fe; font-weight: bold; color: #0369a1; padding: 6px; font-size: 10pt; }
</style>
</head>
<body>
  <h2>EK-10 AİLE KATILIMI TERCİH FORMU</h2>
  <div class="subtitle">T.C. Millî Eğitim Bakanlığı Temel Eğitim Genel Müdürlüğü - Türkiye Yüzyılı Maarif Modeli</div>
  <table>
    <tr><td class="label-cell">Veli Adı Soyadı:</td><td>${formData.parentName}</td><td class="label-cell">Tarih:</td><td>${formData.date}</td></tr>
    <tr><td class="label-cell">Çocuğun Adı Soyadı:</td><td>${formData.studentName}</td><td class="label-cell">Sınıfı:</td><td>${formData.className}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">A. SINIF İÇİ ETKİNLİKLERE KATILIM TERCİHLERİ</th></tr>
    <tr><td>${formData.inClassActivities.map(a => `• ${a}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">B. AİLEDE DEĞER VE BECERİ GELİŞİMİNİ DESTEKLEME</th></tr>
    <tr><td>${formData.homeSupport.map(h => `• ${h}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">C. MESLEK, İLGİ VE YETENEK PAYLAŞIMI</th></tr>
    <tr><td>${formData.professionShare.map(p => `• ${p}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">Ç. OKUL DIŞI ÖĞRENME VE TOPLUM KATILIMI</th></tr>
    <tr><td>${formData.outsideSchool.map(o => `• ${o}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">D. MATERYAL, ORTAM VE HAZIRLIK DESTEĞİ</th></tr>
    <tr><td>${formData.materialSupport.map(m => `• ${m}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">E. KATILIM TERCİHİ VE ZAMAN</th></tr>
    <tr><td><b>Tercih:</b> ${formData.participationPreference}<br><b>Uygun Zaman:</b> ${formData.availableTimes}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">F. DİĞER KATKI VE ÖNERİLER</th></tr>
    <tr><td>${formData.otherNotes.split("\n").join("<br>")}</td></tr>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-10_Aile_Katilimi_Tercih_Formu_${formData.studentName.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `EK-10_Aile_Katilimi_Tercih_Formu_${formData.studentName.replace(/\s+/g, "_")}`,
      sheetName: "EK-10 Aile Katılımı",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — EK-10 AİLE KATILIMI TERCİH FORMU",
      subtitle: `Sınıf: ${formData.className} · Öğrenci: ${formData.studentName} · Veli: ${formData.parentName}`,
      metadata: [
        { label: "Sınıf / Şube", value: formData.className },
        { label: "Veli Adı Soyadı", value: formData.parentName },
        { label: "Öğrenci Adı Soyadı", value: formData.studentName },
        { label: "Tarih", value: formData.date },
      ],
      columns: [
        { header: "Katılım Kategorisi", key: "section", width: 28, align: "left" },
        { header: "Tercih Edilen Etkinlikler ve Destekler", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { section: "A. SINIF İÇİ ETKİNLİKLERE KATILIM", content: formData.inClassActivities.map((a, idx) => `[${idx + 1}] ${a}`).join("\n") },
        { section: "B. EVDE DESTEKLEYİCİ ÇALIŞMALAR", content: formData.homeSupport.map((a, idx) => `[${idx + 1}] ${a}`).join("\n") },
        { section: "C. MESLEK / ÖZEL YETENEK PAYLAŞIMI", content: formData.professionShare.join("\n") },
        { section: "D. OKUL DIŞI ETKİNLİKLERDE DESTEK", content: formData.outsideSchool.join("\n") },
        { section: "E. MATERYAL VE EĞİTİM ORTAMI DESTEĞİ", content: formData.materialSupport.join("\n") },
        { section: "F. GENEL KATILIM TERCİHİ VE ZAMAN", content: `Tercih: ${formData.participationPreference} | Uygun Zaman: ${formData.availableTimes}` },
        { section: "G. DİĞER KATKI VE ÖNERİLER", content: formData.otherNotes },
      ],
      includeSubtotals: false,
    });
  };

  const toggleItem = (listName: keyof FamilyParticipationFormData, item: string) => {
    setFormData((prev) => {
      const arr = (prev[listName] as string[]) || [];
      const updated = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
      return { ...prev, [listName]: updated };
    });
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable">
        {/* Actions Toolbar */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-10 Aile Katılımı Tercih Formu (TTKB Sayfa 190–192)</strong>
            <small>Resmî Format · A4 Çıktı, Excel ve Word (.doc) Uyumluluğu</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn"
              style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
              onClick={() => void handleDownloadExcel()}
              title="Aile katılımı anketini Excel (.xlsx) olarak indir"
            >
              📊 Excel (.xlsx)
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır / PDF Kaydet
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📄 Word Olarak İndir (.doc)
            </button>
            {onClose && (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            )}
          </div>
        </div>

        {/* Form Sheet */}
        <div className="official-sheet">
          <header className="official-sheet__header">
            <h1 className="official-sheet__title" style={{ color: "#0284c7" }}>
              EK-10 AİLE KATILIMI TERCİH FORMU
            </h1>
            <p className="official-sheet__guidance">
              Değerli Velimiz; Çocuğun gelişimi okul, aile ve toplumun iş birliği içinde hareket etmesiyle güçlenir. Okulumuzda yürütülecek aile katılımı çalışmalarında hangi alanlarda destek olmak istediğinizi belirlemek üzere bu form hazırlanmıştır.
            </p>
          </header>

          {/* Metadata Table */}
          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Veli Adı Soyadı:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  />
                  <span className="print-only-text">{formData.parentName}</span>
                </td>
                <th className="official-table__label">Tarih:</th>
                <td>
                  <input
                    type="date"
                    className="of-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                  <span className="print-only-text">{formData.date}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Çocuğun Adı Soyadı:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  />
                  <span className="print-only-text">{formData.studentName}</span>
                </td>
                <th className="official-table__label">Sınıfı:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  />
                  <span className="print-only-text">{formData.className}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm A: Sınıf İçi Katılım */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  A. SINIF İÇİ ETKİNLİKLERE KATILIM (İşaretleyiniz)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {IN_CLASS_OPTIONS.map((opt, idx) => {
                      const isSelected = formData.inClassActivities.includes(opt);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 8px",
                            background: isSelected ? "#f0f9ff" : "transparent",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem("inClassActivities", opt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm B: Evde Destek */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  B. AİLEDE DEĞER VE BECERİ GELİŞİMİNİ DESTEKLEME
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {HOME_SUPPORT_OPTIONS.map((opt, idx) => {
                      const isSelected = formData.homeSupport.includes(opt);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 8px",
                            background: isSelected ? "#f0f9ff" : "transparent",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem("homeSupport", opt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm C: Meslek ve Yetenek */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  C. MESLEK, İLGİ VE YETENEK PAYLAŞIMI
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {PROFESSION_OPTIONS.map((opt, idx) => {
                      const isSelected = formData.professionShare.includes(opt);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 8px",
                            background: isSelected ? "#f0f9ff" : "transparent",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem("professionShare", opt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm Ç: Okul Dışı ve Toplum */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  Ç. OKUL DIŞI ÖĞRENME VE TOPLUM KATILIMI
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {OUTSIDE_SCHOOL_OPTIONS.map((opt, idx) => {
                      const isSelected = formData.outsideSchool.includes(opt);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 8px",
                            background: isSelected ? "#f0f9ff" : "transparent",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem("outsideSchool", opt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm D: Materyal ve Ortam Desteği */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  D. MATERYAL, ORTAM VE HAZIRLIK DESTEĞİ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {MATERIAL_OPTIONS.map((opt, idx) => {
                      const isSelected = formData.materialSupport.includes(opt);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 8px",
                            background: isSelected ? "#f0f9ff" : "transparent",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem("materialSupport", opt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm E & F: Tercih, Zaman ve Diğer Notlar */}
          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">E. Katılım Tercihim:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.participationPreference}
                    onChange={(e) => setFormData({ ...formData, participationPreference: e.target.value })}
                  />
                  <span className="print-only-text">{formData.participationPreference}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">F. Uygun Zaman:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.availableTimes}
                    onChange={(e) => setFormData({ ...formData, availableTimes: e.target.value })}
                  />
                  <span className="print-only-text">{formData.availableTimes}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">G. Diğer Katkı / Öneriler:</th>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.otherNotes}
                    onChange={(e) => setFormData({ ...formData, otherNotes: e.target.value })}
                  />
                  <div className="print-only-text multiline-text">{formData.otherNotes}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <footer className="official-sheet__footer">
            <div className="official-sheet__signature">
              <span>Formu Dolduran Veli</span>
              <strong>{formData.parentName}</strong>
              <div className="signature-line">İmza: ....................</div>
            </div>
            <div className="official-sheet__page-num" style={{ color: "#0284c7" }}>
              190–192
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
