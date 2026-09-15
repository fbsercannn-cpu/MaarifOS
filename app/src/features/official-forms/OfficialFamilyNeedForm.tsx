import { useState } from "react";
import "./official-forms.css";

export interface FamilyNeedFormData {
  parentName: string;
  studentName: string;
  className: string;
  date: string;
  selectedTopics: string[];
  preferredFormat: string[];
  frequency: string;
  preferredTime: string[];
  expectations: string;
  specialSituation: string;
}

interface Props {
  initialData?: Partial<FamilyNeedFormData>;
  onClose?: () => void;
}

const DEFAULT_TOPICS = [
  "Okula Merhaba: Güvenli ve Mutlu Başlangıç",
  "Okul Öncesi Eğitimde Aile ve Toplum Rolü",
  "Kelimelerin Gücü: Çocukla Bağ Kuran İletişim ve Olumlu Ebeveynlik",
  "Küçük Kalplerde Büyük Duygular: Duygularını Tanıma ve Yönetme Rehberi",
  "Sınır koyma, tutarlılık ve olumlu disiplin yaklaşımları",
  "Ailede güvenli bağlanma, sevgi ve aidiyet duygusunu güçlendirme",
  "Ben Yapabilirim! Çocuklarda Öz güven, Öz Bakım ve Sorumluluk Bilinci",
  "Oyun yoluyla öğrenme ve evde nitelikli zaman geçirme",
  "Dünya Eve Sığar: Merakı Besleyen ve İlham Veren Ev Ortamı",
  "Erdemin İlk Adımları: Değerlerle Büyüyen Çocuklar",
  "Ailede kitap okuma kültürü, dil gelişimi ve erken okuryazarlık",
  "Dijital Çağda Ailelerin Yol Haritası (Ekran Dengesi ve Güvenli Teknoloji)",
  "Sağlıklı beslenme, uyku, temizlik ve temel alışkanlıkların kazandırılması",
  "Çocuklarda sosyal beceriler, arkadaşlık ilişkileri ve problem çözme",
  "Davranış problemlerini anlama ve çözüm yolları",
  "Doğa, çevre farkındalığı ve sürdürülebilir yaşam alışkanlıkları",
  "Aile-okul iş birliği ve çocuğun gelişimini birlikte izleme",
  "İlkokula hazırlık sürecinde aileye düşen sorumluluklar",
  "Farklı gelişim özellikleri olan çocukların desteklenmesi",
];

const FORMAT_OPTIONS = [
  "Yüz yüze aile eğitimi toplantısı",
  "Çevrim içi aile eğitimi",
  "Küçük grup veli çalışması",
  "Bireysel veli görüşmesi",
  "Atölye çalışması / uygulamalı etkinlik",
  "Evde uygulanacak kısa aile görevleri",
  "Bilgilendirici broşür / kısa rehber paylaşımı",
  "Video, EBA içeriği veya dijital materyal desteği",
  "Okul-aile birlikte etkinlik günü",
];

export function OfficialFamilyNeedForm({ initialData, onClose }: Props) {
  const [formData, setFormData] = useState<FamilyNeedFormData>({
    parentName: initialData?.parentName || "Veli Adı Soyadı",
    studentName: initialData?.studentName || "Öğrenci Adı Soyadı",
    className: initialData?.className || "Papatyalar Sınıfı (5 Yaş)",
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    selectedTopics: initialData?.selectedTopics || [DEFAULT_TOPICS[0], DEFAULT_TOPICS[2], DEFAULT_TOPICS[7]],
    preferredFormat: initialData?.preferredFormat || [FORMAT_OPTIONS[0], FORMAT_OPTIONS[4]],
    frequency: initialData?.frequency || "Ayda bir",
    preferredTime: initialData?.preferredTime || ["Hafta içi öğleden sonra"],
    expectations: initialData?.expectations || "Çocuğun okul uyumu ve sosyal ilişkilerinde olumlu destek sağlanması.",
    specialSituation: initialData?.specialSituation || "Bilinen bir alerji veya kronik rahatsızlık bulunmamaktadır.",
  });

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-9 AİLE EĞİTİMİ İHTİYAÇ BELİRLEME FORMU - ${formData.studentName}</title>
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
  <h2>EK-9 AİLE EĞİTİMİ İHTİYAÇ BELİRLEME FORMU</h2>
  <div class="subtitle">T.C. Millî Eğitim Bakanlığı Temel Eğitim Genel Müdürlüğü - Türkiye Yüzyılı Maarif Modeli</div>
  <table>
    <tr><td class="label-cell">Veli Adı Soyadı:</td><td>${formData.parentName}</td><td class="label-cell">Tarih:</td><td>${formData.date}</td></tr>
    <tr><td class="label-cell">Çocuğun Adı Soyadı:</td><td>${formData.studentName}</td><td class="label-cell">Sınıfı:</td><td>${formData.className}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">A. EĞİTİM ALMAK İSTENİLEN ÖNCELİKLİ KONULAR</th></tr>
    <tr><td>${formData.selectedTopics.map((t, idx) => `• [${idx + 1}] ${t}`).join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">B. TERCİH EDİLEN UYGULAMA BİÇİMİ</th></tr>
    <tr><td>${formData.preferredFormat.join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">C. UYGUN GÖRÜLEN SIKLIK VE ZAMAN</th></tr>
    <tr><td><b>Sıklık:</b> ${formData.frequency}<br><b>Zaman:</b> ${formData.preferredTime.join(", ")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">D. AİLE EĞİTİMLERİNDEN BEKLENTİLER</th></tr>
    <tr><td>${formData.expectations.split("\n").join("<br>")}</td></tr>
  </table>

  <table>
    <tr><th class="section-header">E. ÖĞRETMENİN BİLGİLENDİRİLMESİ İSTENEN ÖZEL DURUM</th></tr>
    <tr><td>${formData.specialSituation.split("\n").join("<br>")}</td></tr>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-9_Aile_Ihtiyac_Formu_${formData.studentName.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleTopic = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter((t) => t !== topic)
        : [...prev.selectedTopics, topic],
    }));
  };

  const toggleFormat = (fmt: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredFormat: prev.preferredFormat.includes(fmt)
        ? prev.preferredFormat.filter((f) => f !== fmt)
        : [...prev.preferredFormat, fmt],
    }));
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable">
        {/* Actions Toolbar */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-9 Aile Eğitimi İhtiyaç Belirleme Formu (TTKB Sayfa 188–189)</strong>
            <small>Resmî Format · A4 Çıktı ve Word (.doc) Uyumluluğu</small>
          </div>
          <div className="official-form-actions__buttons">
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
              EK-9 AİLE EĞİTİMİ İHTİYAÇ BELİRLEME FORMU
            </h1>
            <p className="official-sheet__guidance">
              Değerli Velimiz; Türkiye Yüzyılı Maarif Modeli kapsamında çocuğunuzun gelişimini desteklemek amacıyla aile eğitimi konularındaki ihtiyaçlarınızı belirlemek üzere bu form hazırlanmıştır.
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

          {/* Bölüm A: Konular */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  A. EĞİTİM ALMAK İSTEDİĞİNİZ KONULAR (İşaretleyiniz)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {DEFAULT_TOPICS.map((topic, idx) => {
                      const isSelected = formData.selectedTopics.includes(topic);
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
                            onChange={() => toggleTopic(topic)}
                          />
                          <span style={{ fontSize: "0.88rem", fontWeight: isSelected ? 600 : 400 }}>
                            {topic}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm B: Uygulama Biçimi */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  B. TERCİH ETTİĞİNİZ UYGULAMA BİÇİMİ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "6px" }}>
                    {FORMAT_OPTIONS.map((fmt, idx) => {
                      const isSelected = formData.preferredFormat.includes(fmt);
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
                            onChange={() => toggleFormat(fmt)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>{fmt}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm C & Ç: Sıklık ve Zaman */}
          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">C. Uygun Görülen Sıklık:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  />
                  <span className="print-only-text">{formData.frequency}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Ç. Uygun Zaman:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.preferredTime.join(", ")}
                    onChange={(e) =>
                      setFormData({ ...formData, preferredTime: e.target.value.split(",").map((s) => s.trim()) })
                    }
                  />
                  <span className="print-only-text">{formData.preferredTime.join(", ")}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bölüm D & E: Beklentiler ve Özel Durum */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  D. AİLE EĞİTİMLERİNDEN BEKLENTİLERİNİZ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.expectations}
                    onChange={(e) => setFormData({ ...formData, expectations: e.target.value })}
                  />
                  <div className="print-only-text multiline-text">{formData.expectations}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  E. ÖĞRETMENİN BİLGİLENDİRİLMESİNİ İSTEDİĞİNİZ ÖZEL BİR DURUM
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.specialSituation}
                    onChange={(e) => setFormData({ ...formData, specialSituation: e.target.value })}
                  />
                  <div className="print-only-text multiline-text">{formData.specialSituation}</div>
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
              188–189
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
