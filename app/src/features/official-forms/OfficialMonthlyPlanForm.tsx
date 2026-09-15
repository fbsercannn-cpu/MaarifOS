import { useState } from "react";
import "./official-forms.css";

export interface MonthlyPlanFormData {
  schoolName: string;
  month: string;
  ageGroup: string;
  teacherName: string;
  domainSkills: string;
  tendencies: string;
  socialEmotional: string;
  values: string;
  literacy: string;
  concepts: string;
  specialDays: string;
  learningExperiences: string;
  enrichment: string;
  support: string;
  familyCommunityEngagement: string;
  childEvaluation: string;
  programEvaluation: string;
  teacherEvaluation: string;
  teacherReflections: string;
}

interface Props {
  initialData?: Partial<MonthlyPlanFormData>;
  onClose?: () => void;
}

const EVALUATION_PRESETS = {
  child: [
    "Çocuklar süreç boyunca aktif katılım göstermiş, merak ve soru sorma eğilimlerini somut materyallerle desteklemiştir.",
    "Çocukların dil ve sosyal-duygusal becerilerinde belirgin bir gelişim izlenmiş, iş birliği gerektiren etkinliklerde akran etkileşimi artmıştır.",
    "Bireysel farklılıklar gözlemlenmiş; bazı çocukların motor ve dil becerilerinde ek desteğe ihtiyaç duyduğu saptanmıştır.",
    "Çocuklar öz düzenleme ve sorumluluk alma alanında olumlu tutum sergilemiş, merkezlerde kurallara uyum güçlenmiştir."
  ],
  program: [
    "Programda yer alan öğrenme çıktıları ve alan becerileri çocukların gelişim seviyesine uygun olarak gerçekleştirilmiştir.",
    "Öğrenme ortamları ve materyaller hedeflenen kazanımları destekleyecek nitelikte optimize edilmiştir.",
    "Açık hava ve bahçe etkinliklerine daha fazla yer verilmesi gerektiği tespit edilmiş, bir sonraki aya yönelik düzenleme planlanmıştır.",
    "Entegre edilen disiplinler arası temalar çocukların bütüncül gelişimini başarıyla desteklemiştir."
  ],
  teacher: [
    "Öğrenme merkezlerinde süreç odaklı rehberlik yapılmış, çocukların ilgi ve meraklarına göre anlık esnek geçişler sağlanmıştır.",
    "Gözlem ve anekdot kayıtları düzenli tutularak çocukların bireysel gelişim haritalarına işlenmiştir.",
    "Farklılaştırma (zenginleştirme ve destekleme) stratejileri etkili şekilde uygulanmış, her çocuğun potansiyeline ulaşması hedeflenmiştir.",
    "Aile katılım bültenleri ve ev etkinlikleri geri bildirimleri zamanında değerlendirilmiştir."
  ]
};

export function OfficialMonthlyPlanForm({ initialData, onClose }: Props) {
  const [formData, setFormData] = useState<MonthlyPlanFormData>({
    schoolName: initialData?.schoolName || "Atatürk Anaokulu",
    month: initialData?.month || "Ekim 2026",
    ageGroup: initialData?.ageGroup || "60-72 Ay",
    teacherName: initialData?.teacherName || "Emine Öğretmen",
    domainSkills:
      initialData?.domainSkills ||
      "TÜRKÇE: TADB.1. Konuşmalarında nezaket sözcüklerini kullanır; TADB.2. Dinlediği hikâyenin ana fikrini ve karakterlerini açıklar.\nMATEMATİK: MAB.1. 1'den 20'ye kadar ritmik sayar; nesneleri birebir eşler; MAB.2. İki boyutlu geometrik şekilleri tanır ve gruplar.\nFEN: FAB.1. Çevresindeki doğal unsurları (sonbahar mevsimi, yapraklar, hava durumu) duyu organlarıyla inceler.\nSANAT: SNAB.2. Çeşitli malzemeleri (kuru yapraklar, pastel boya, kil) kullanarak özgün kompozisyonlar üretir.\nMÜZİK: MÜAB.1. Ritim aletleriyle verilen tempoyu takip eder ve basit ezgileri seslendirir.\nHAREKET VE SAĞLIK: HAB.1. Temel motor hareketleri (koşma, sıçrama, dengede durma) kurallı oyunlarda sergiler.",
    tendencies:
      initialData?.tendencies ||
      "E1.1. Merak ve keşfetme arzusu, E2.2. İş birliği ve yardımlaşma, E3.1. Odaklanma ve başladığı işi tamamlama, E1.3. Öz güven",
    socialEmotional:
      initialData?.socialEmotional ||
      "SDB1.1. Kendi duygularını fark etme ve adlandırma\nSDB1.2. Kendini düzenleme (sırasını bekleme, yönergeleri izleme)\nSDB2.1. Akranlarıyla empati kurma ve çatışmaları konuşarak çözme",
    values:
      initialData?.values ||
      "D3. Çalışkanlık (görev bilinci ve merkezleri toplama)\nD7. Estetik (doğanın renklerini fark etme ve sanatsal üretim)\nD12. Sabır (etkinliklerde sırasını bekleme ve dinleme)\nD14. Saygı ve Sevgi (arkadaşlarının fikirlerine değer verme)",
    literacy:
      initialData?.literacy ||
      "OB1. Erken Okuryazarlık (kitap tutma, sayfaları soldan sağa çevirme, resimleri yorumlama)\nOB4. Görsel Okuryazarlık (sembolleri ve duygu kartlarını okuma)",
    concepts:
      initialData?.concepts ||
      "Miktar: Az-Çok, Eşit | Boyut: Büyük-Orta-Küçük | Renk: Kırmızı, Sarı, Mavi, Turuncu, Yeşil | Şekil: Daire, Üçgen, Kare | Zaman: Sabah-Öğle-Akşam",
    specialDays:
      initialData?.specialDays ||
      "• 4 Ekim Hayvanları Koruma Günü\n• 29 Ekim Cumhuriyet Bayramı\n• Kızılay Haftası (29 Ekim - 4 Kasım)",
    learningExperiences:
      initialData?.learningExperiences ||
      "1. Hafta: 'Merhaba Sonbahar!' - Bahçede dökülen yaprakların toplanması, renk ve boyutlarına göre sınıflandırılması, yaprak baskısı çalışması.\n2. Hafta: 'Hayvan Dostlarımız' - Hayvan sevgisi ve barınak bilinci, hayvan sesleri ritim çalışması, veterinerlik draması.\n3. Hafta: 'Vücudumuzu Tanıyoruz' - Duyularımız ve sağlıklı beslenme, meyve günü etkinliği, boy-kilo ölçüm grafiği oluşturma.\n4. Hafta: 'Yaşasın Cumhuriyet!' - 29 Ekim Cumhuriyet coşkusu, sınıfın bayraklarla süslenmesi, marşlar ve cumhuriyet panosu sergisi.",
    enrichment:
      initialData?.enrichment ||
      "İleri düzey matematik ve örüntü kavrayışı gösteren çocuklara 3 boyutlu geometrik blok kurguları ve eşleştirme kartları verilir. Zenginleştirilmiş kitap merkezi okuma saati sunulur.",
    support:
      initialData?.support ||
      "Dil gelişiminde ek desteğe ihtiyaç duyan çocuklarla birebir resim betimleme ve ses farkındalığı çalışmaları yapılır. İkili akran eşleşmesiyle sosyal uyum desteklenir.",
    familyCommunityEngagement:
      initialData?.familyCommunityEngagement ||
      "• Aile Katılım Takvimi: Velilere haftalık 'Evde Eğlenceli Bilim ve Doğa' önerileri bülteni iletilir.\n• Meslek Tanıtımı: Bir veli sınıfa davet edilerek veterinerlik/sağlık mesleği tanıtımı yapılır.\n• Toplum Katılımı: Okul bahçesi ağaçlandırma etkinliği ve yakın çevre park gezisi düzenlenir.",
    childEvaluation:
      initialData?.childEvaluation ||
      EVALUATION_PRESETS.child[0],
    programEvaluation:
      initialData?.programEvaluation ||
      EVALUATION_PRESETS.program[0],
    teacherEvaluation:
      initialData?.teacherEvaluation ||
      EVALUATION_PRESETS.teacher[0],
    teacherReflections:
      initialData?.teacherReflections ||
      "Bu ay uygulanan etkinliklerde çocukların fen ve doğa merkezindeki merak düzeyi çok yüksekti. Sonbahar temasında açık hava kullanımının öğrenmeyi pekiştirdiği gözlendi. Önümüzdeki ay ritim ve müzik aletlerinin çeşitlendirilmesi planlanmaktadır."
  });

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-5 AYLIK EĞİTİM PLANI - ${formData.month}</title>
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
  <h2>EK-5 AYLIK EĞİTİM PLANI</h2>
  <div class="subtitle">T.C. Millî Eğitim Bakanlığı Temel Eğitim Genel Müdürlüğü - Türkiye Yüzyılı Maarif Modeli</div>
  <table>
    <tr>
      <td class="label-cell">Okul Adı:</td><td>${formData.schoolName}</td>
      <td class="label-cell">Ay / Yıl:</td><td>${formData.month}</td>
    </tr>
    <tr>
      <td class="label-cell">Öğretmenin Adı:</td><td>${formData.teacherName}</td>
      <td class="label-cell">Yaş Grubu (AY):</td><td>${formData.ageGroup}</td>
    </tr>
  </table>

  <table>
    <tr><th class="section-header" colspan="2">ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ</th></tr>
    <tr><td colspan="2">${formData.domainSkills.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">EĞİLİMLER</th></tr>
    <tr><td colspan="2">${formData.tendencies.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">PROGRAMLAR ARASI BİLEŞENLER</th></tr>
    <tr>
      <td style="width: 50%;"><b>Sosyal-Duygusal Beceriler:</b><br>${formData.socialEmotional.replace(/\n/g, "<br>")}</td>
      <td style="width: 50%;"><b>Değerler:</b><br>${formData.values.replace(/\n/g, "<br>")}</td>
    </tr>
    <tr>
      <td colspan="2"><b>Okuryazarlık Becerileri:</b><br>${formData.literacy.replace(/\n/g, "<br>")}</td>
    </tr>
    
    <tr><th class="section-header" colspan="2">KAVRAMLAR</th></tr>
    <tr><td colspan="2">${formData.concepts.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">BELİRLİ GÜN VE HAFTALAR</th></tr>
    <tr><td colspan="2">${formData.specialDays.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">ÖĞRENME-ÖĞRETME YAŞANTILARI (UYGULAMALAR)</th></tr>
    <tr><td colspan="2">${formData.learningExperiences.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">FARKLILAŞTIRMA</th></tr>
    <tr>
      <td><b>Zenginleştirme:</b><br>${formData.enrichment.replace(/\n/g, "<br>")}</td>
      <td><b>Destekleme:</b><br>${formData.support.replace(/\n/g, "<br>")}</td>
    </tr>
    
    <tr><th class="section-header" colspan="2">AİLE VE TOPLUM KATILIMI</th></tr>
    <tr><td colspan="2">${formData.familyCommunityEngagement.replace(/\n/g, "<br>")}</td></tr>
    
    <tr><th class="section-header" colspan="2">ÖĞRENME KANITLARI (DEĞERLENDİRME)</th></tr>
    <tr>
      <td colspan="2">
        <b>1. Çocuk Açısından:</b><br>${formData.childEvaluation.replace(/\n/g, "<br>")}<br><br>
        <b>2. Program Açısından:</b><br>${formData.programEvaluation.replace(/\n/g, "<br>")}<br><br>
        <b>3. Öğretmen Açısından:</b><br>${formData.teacherEvaluation.replace(/\n/g, "<br>")}
      </td>
    </tr>
    
    <tr><th class="section-header" colspan="2">ÖĞRETMEN YANSITMALARI</th></tr>
    <tr><td colspan="2">${formData.teacherReflections.replace(/\n/g, "<br>")}</td></tr>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-5_Aylik_Egitim_Plani_${formData.month.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateField = (field: keyof MonthlyPlanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable">
        {/* Toolbar (No Print) */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-5 Aylık Eğitim Planı (TTKB Sayfa 182)</strong>
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

        {/* Sheet Content */}
        <div className="official-sheet">
          <header className="official-sheet__header">
            <h1 className="official-sheet__title" style={{ color: "#0284c7" }}>
              EK-5 AYLIK EĞİTİM PLANI
            </h1>
            <p className="official-sheet__guidance" style={{ borderColor: "#0284c7", background: "#f0f9ff" }}>
              Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı doğrultusunda hazırlanmış aylık çerçeve plandır.
            </p>
          </header>

          {/* Metadata Table */}
          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Okul Adı:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.schoolName}
                    onChange={e => updateField("schoolName", e.target.value)}
                  />
                  <span className="print-only-text">{formData.schoolName}</span>
                </td>
                <th className="official-table__label">Ay / Yıl:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.month}
                    onChange={e => updateField("month", e.target.value)}
                  />
                  <span className="print-only-text">{formData.month}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Öğretmenin Adı:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.teacherName}
                    onChange={e => updateField("teacherName", e.target.value)}
                  />
                  <span className="print-only-text">{formData.teacherName}</span>
                </td>
                <th className="official-table__label">Yaş Grubu (AY):</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    value={formData.ageGroup}
                    onChange={e => updateField("ageGroup", e.target.value)}
                  />
                  <span className="print-only-text">{formData.ageGroup}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Alan Becerileri */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={4}
                    value={formData.domainSkills}
                    onChange={e => updateField("domainSkills", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.domainSkills}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Eğilimler */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  EĞİLİMLER
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.tendencies}
                    onChange={e => updateField("tendencies", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.tendencies}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Programlar Arası Bileşenler */}
          <table className="official-table">
            <thead>
              <tr>
                <th colSpan={2} className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  PROGRAMLAR ARASI BİLEŞENLER
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ width: "50%" }}>
                  <strong>Sosyal-Duygusal Öğrenme Becerileri:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.socialEmotional}
                    onChange={e => updateField("socialEmotional", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.socialEmotional}</div>
                </td>
                <td style={{ width: "50%" }}>
                  <strong>Değerler:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.values}
                    onChange={e => updateField("values", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.values}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <strong>Okuryazarlık Becerileri:</strong>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.literacy}
                    onChange={e => updateField("literacy", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.literacy}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kavramlar ve Belirli Gün/Haftalar */}
          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Kavramlar:</th>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.concepts}
                    onChange={e => updateField("concepts", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.concepts}</div>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Belirli Gün ve Haftalar:</th>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={formData.specialDays}
                    onChange={e => updateField("specialDays", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.specialDays}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Öğrenme-Öğretme Yaşantıları */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  ÖĞRENME-ÖĞRETME YAŞANTILARI (UYGULAMALAR)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={4}
                    value={formData.learningExperiences}
                    onChange={e => updateField("learningExperiences", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.learningExperiences}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Farklılaştırma */}
          <table className="official-table">
            <thead>
              <tr>
                <th colSpan={2} className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  FARKLILAŞTIRMA
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ width: "50%" }}>
                  <strong>Zenginleştirme:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.enrichment}
                    onChange={e => updateField("enrichment", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.enrichment}</div>
                </td>
                <td style={{ width: "50%" }}>
                  <strong>Destekleme:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.support}
                    onChange={e => updateField("support", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.support}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Aile ve Toplum Katılımı */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  AİLE VE TOPLUM KATILIMI
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.familyCommunityEngagement}
                    onChange={e => updateField("familyCommunityEngagement", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.familyCommunityEngagement}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Öğrenme Kanıtları (Değerlendirme) */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  ÖĞRENME KANITLARI (DEĞERLENDİRME)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong>1. Çocuk Açısından Değerlendirme:</strong>
                      <div className="no-print" style={{ display: "flex", gap: "4px", fontSize: "0.8rem" }}>
                        <span style={{ color: "#64748b" }}>Örnek Seç:</span>
                        {EVALUATION_PRESETS.child.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="of-btn of-btn--close"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            onClick={() => updateField("childEvaluation", preset)}
                          >
                            Seçenek {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      value={formData.childEvaluation}
                      onChange={e => updateField("childEvaluation", e.target.value)}
                    />
                    <div className="print-only-text multiline-text">{formData.childEvaluation}</div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong>2. Program Açısından Değerlendirme:</strong>
                      <div className="no-print" style={{ display: "flex", gap: "4px", fontSize: "0.8rem" }}>
                        <span style={{ color: "#64748b" }}>Örnek Seç:</span>
                        {EVALUATION_PRESETS.program.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="of-btn of-btn--close"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            onClick={() => updateField("programEvaluation", preset)}
                          >
                            Seçenek {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      value={formData.programEvaluation}
                      onChange={e => updateField("programEvaluation", e.target.value)}
                    />
                    <div className="print-only-text multiline-text">{formData.programEvaluation}</div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong>3. Öğretmen Açısından Değerlendirme:</strong>
                      <div className="no-print" style={{ display: "flex", gap: "4px", fontSize: "0.8rem" }}>
                        <span style={{ color: "#64748b" }}>Örnek Seç:</span>
                        {EVALUATION_PRESETS.teacher.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="of-btn of-btn--close"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            onClick={() => updateField("teacherEvaluation", preset)}
                          >
                            Seçenek {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      value={formData.teacherEvaluation}
                      onChange={e => updateField("teacherEvaluation", e.target.value)}
                    />
                    <div className="print-only-text multiline-text">{formData.teacherEvaluation}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Öğretmen Yansıtmaları */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  ÖĞRETMEN YANSITMALARI
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea
                    className="of-textarea"
                    rows={3}
                    value={formData.teacherReflections}
                    onChange={e => updateField("teacherReflections", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.teacherReflections}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature */}
          <footer className="official-sheet__footer">
            <div className="official-sheet__signature">
              <span>Uygulayan Öğretmen</span>
              <strong>{formData.teacherName}</strong>
              <div className="signature-line">İmza: ....................</div>
            </div>
            <div className="official-sheet__page-num" style={{ color: "#0284c7" }}>
              182
            </div>
            <div className="official-sheet__signature">
              <span>Okul Müdürü</span>
              <strong>.............................................</strong>
              <div className="signature-line">İmza / Mühür: ....................</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
