import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { FormPresetSelector } from "./FormPresetSelector.tsx";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import { OfficialConceptsAndDaysPalette } from "./OfficialConceptsAndDaysPalette.tsx";
import { MAARIFOS_MONTHLY_SAMPLE_DRAFTS } from "./officialSamplePlansService.ts";
import {
  exportOfficialTableToExcel,
  printOfficialFormA4,
} from "./official-form-export-service.ts";
import { OfficialPlanLinkedOutputsModal } from "./OfficialPlanLinkedOutputsModal.tsx";
import { buildMonthlySyncResult, syncResultToFieldText } from "./daily-to-monthly-sync.ts";
import { type MonthKey, type AgeGroup } from "./daily-plan-core.ts";
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
  const [sampleUndo, setSampleUndo] = useState<MonthlyPlanFormData | null>(null);
  const [isSampleOutputsOpen, setIsSampleOutputsOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [formData, setFormData] = useOfficialFormState<MonthlyPlanFormData>("formData", {
    schoolName: initialData?.schoolName || "Atatürk Anaokulu",
    month: initialData?.month || "Ekim 2026",
    ageGroup: initialData?.ageGroup || "60-72 Ay",
    teacherName: initialData?.teacherName || "Okul Öncesi Öğretmeni",
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

  const handlePrint = () => {
    printOfficialFormA4(`EK-5_Aylik_Plan_${formData.month}`);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportOfficialTableToExcel({
        fileName: `EK-5_Aylik_Plan_${formData.month.replace(/\s+/g, "_")}`,
        sheetName: "EK-5 Aylık Plan",
        title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — EK-5 AYLIK EĞİTİM PLANI",
        subtitle: `${formData.schoolName} · ${formData.ageGroup} · Ay: ${formData.month} · Öğretmen: ${formData.teacherName}`,
        metadata: [
          { label: "Okul Adı", value: formData.schoolName },
          { label: "Ay / Yıl", value: formData.month },
          { label: "Yaş Grubu", value: formData.ageGroup },
          { label: "Öğretmenin Adı", value: formData.teacherName },
        ],
        columns: [
          { header: "Bileşen / Alan", key: "section", width: 28 },
          { header: "Aylık Plan Detayları / Kazanımlar", key: "content", width: 70 },
        ],
        rows: [
          { section: "ALAN BECERİLERİ & ÇIKTILAR", content: formData.domainSkills },
          { section: "EĞİLİMLER", content: formData.tendencies },
          { section: "SOSYAL-DUYGUSAL (SDB)", content: formData.socialEmotional },
          { section: "DEĞERLER (D)", content: formData.values },
          { section: "OKURYAZARLIK BECERİLERİ", content: formData.literacy },
          { section: "KAVRAMLAR", content: formData.concepts },
          { section: "BELİRLİ GÜN VE HAFTALAR", content: formData.specialDays },
          { section: "ÖĞRENME-ÖĞRETME YAŞANTILARI", content: formData.learningExperiences },
          { section: "FARKLILAŞTIRMA - ZENGİNLEŞTİRME", content: formData.enrichment },
          { section: "FARKLILAŞTIRMA - DESTEKLEME", content: formData.support },
          { section: "AİLE VE TOPLUM KATILIMI", content: formData.familyCommunityEngagement },
          { section: "DEĞERLENDİRME - ÇOCUK AÇISINDAN", content: formData.childEvaluation },
          { section: "DEĞERLENDİRME - PROGRAM AÇISINDAN", content: formData.programEvaluation },
          { section: "DEĞERLENDİRME - ÖĞRETMEN AÇISINDAN", content: formData.teacherEvaluation },
          { section: "ÖĞRETMENİN ÖZ YANSITMASI", content: formData.teacherReflections },
        ],
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadWord = () => downloadOfficialFormWord("OfficialMonthlyPlanForm");

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
            <small>Resmî Format · A4 Çıktı ve Word (.docx) Uyumluluğu</small>
          </div>
          <details className="official-output-menu"><summary className="of-btn">Çıktıyı hazırla ve plan araçları</summary><div className="official-form-actions__buttons">
            <select
              className="of-btn"
              style={{ background: "#f0f9ff", color: "#0369a1", border: "1.5px solid #0284c7", fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}
              onChange={(e) => {
                const plan = MAARIFOS_MONTHLY_SAMPLE_DRAFTS.find(p => p.id === e.target.value);
                if (plan) {
                  const preview = Object.entries(plan).filter(([key]) => !["id"].includes(key)).map(([key, value]) => `${key}: ${String(value)}`).join("\n\n");
                  if (!window.confirm(`${plan.sourceNotice}\n\nÖrnek plan metinleri mevcut plan alanlarını değiştirecek. Kayıt tarihi ve yaş bandı korunur. Uygulamadan önce metni inceleyin:\n\n${preview}`)) { e.target.value = ""; return; }
                  setSampleUndo(structuredClone(formData));
                  setFormData(prev => ({
                    ...prev,


                    domainSkills: plan.domainSkills,
                    tendencies: plan.tendencies,
                    socialEmotional: plan.socialEmotional,
                    values: plan.values,
                    literacy: plan.literacy,
                    concepts: plan.concepts,
                    specialDays: plan.specialDays,
                    learningExperiences: plan.learningExperiences,
                    enrichment: plan.enrichment,
                    support: plan.support,
                    familyCommunityEngagement: plan.familyCommunityEngagement,
                    childEvaluation: plan.childEvaluation,
                    programEvaluation: plan.programEvaluation,
                    teacherEvaluation: plan.teacherEvaluation,
                    teacherReflections: plan.teacherReflections,
                  }));
                }
              }}
              defaultValue=""
              aria-label="MaarifOS aylık örnek taslağını incele"
            >
              <option value="" disabled>⚡ MaarifOS örnek taslağını incele...</option>
              {MAARIFOS_MONTHLY_SAMPLE_DRAFTS.map(p => (
                <option key={p.id} value={p.id}>{p.ageGroup} ({p.pageRef}): {p.planTitle}</option>
              ))}
            </select>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#7c3aed", color: "#ffffff", border: "1px solid #6d28d9", fontWeight: 700 }}
              onClick={() => {
                const allMonths: MonthKey[] = ["Eylül", "Ekim", "Kasım", "Aralık", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"];
                const matchedMonth = allMonths.find(m => formData.month.includes(m)) || "Ekim";
                const matchedAgeGroup: AgeGroup = formData.ageGroup.includes("36") ? "36-48" : formData.ageGroup.includes("48") ? "48-60" : "60-72";
                const sync = buildMonthlySyncResult(matchedMonth, matchedAgeGroup);
                if (sync.planCount === 0) {
                  alert(`${matchedMonth} ayı için kayıtlı günlük plan bulunamadı. Önce Günlük Planlayıcı ile plan oluşturun.`);
                  return;
                }
                const fields = syncResultToFieldText(sync);
                setFormData(prev => ({
                  ...prev,
                  domainSkills: fields.domainSkills !== "—" ? fields.domainSkills : prev.domainSkills,
                  tendencies: fields.tendencies !== "—" ? fields.tendencies : prev.tendencies,
                  socialEmotional: fields.socialEmotional !== "—" ? fields.socialEmotional : prev.socialEmotional,
                  values: fields.values !== "—" ? fields.values : prev.values,
                  literacy: fields.literacy !== "—" ? fields.literacy : prev.literacy,
                  concepts: fields.concepts !== "—" ? fields.concepts : prev.concepts,
                }));
                alert(`✨ ${matchedMonth} ayındaki ${sync.planCount} adet günlük plandan alan becerileri, eğilimler, değerler ve kavramlar otomatik olarak aylık plana aktarıldı!`);
              }}
              title="Bu ayın günlük planlarındaki alan becerilerini, eğilimleri, değerleri ve kavramları otomatik aktar"
            >
              ✨ Günlük Planlardan Doldur ({formData.month.split(" ")[0]})
            </button>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd", fontWeight: 700 }}
              onClick={() => setIsSampleOutputsOpen(true)}
              title="Bu plana bağlı bülten, malzeme listesi ve 10 blokluk akış çıktısı"
            >
              📦 Bağlı Örnek Çıktılar
            </button>
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
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır / PDF Kaydet
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📄 Word Olarak İndir (.docx)
            </button>
            {sampleUndo && <button type="button" className="of-btn" onClick={() => { if (window.confirm("Örnek yüklenmeden önceki metne dönülecek. Sonraki düzenlemeler değişebilir. Devam edilsin mi?")) { setFormData(sampleUndo); setSampleUndo(null); } }}>Örnek yüklemeyi geri al</button>}
          </div></details>
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
                    aria-label="Okul adı" value={formData.schoolName}
                    onChange={e => updateField("schoolName", e.target.value)}
                  />
                  <span className="print-only-text">{formData.schoolName}</span>
                </td>
                <th className="official-table__label">Ay / Yıl:</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    aria-label="Ay" readOnly title="Üstteki kayıt kapsamından seçilir" value={formData.month}
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
                    aria-label="Öğretmen adı" value={formData.teacherName}
                    onChange={e => updateField("teacherName", e.target.value)}
                  />
                  <span className="print-only-text">{formData.teacherName}</span>
                </td>
                <th className="official-table__label">Yaş Grubu (AY):</th>
                <td>
                  <input
                    type="text"
                    className="of-input"
                    aria-label="Yaş grubu" readOnly title="Üstteki kayıt kapsamından seçilir" value={formData.ageGroup}
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
                    aria-label="Alan becerileri" value={formData.domainSkills}
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
                    aria-label="Eğilimler" value={formData.tendencies}
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
                    aria-label="Sosyal duygusal öğrenme" value={formData.socialEmotional}
                    onChange={e => updateField("socialEmotional", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.socialEmotional}</div>
                </td>
                <td style={{ width: "50%" }}>
                  <strong>Değerler:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    aria-label="Değerler" value={formData.values}
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
                    aria-label="Okuryazarlık" value={formData.literacy}
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
                    aria-label="Kavramlar" value={formData.concepts}
                    onChange={e => updateField("concepts", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.concepts}</div>
                  <OfficialConceptsAndDaysPalette
                    currentValue={formData.concepts}
                    onSelect={(val) => updateField("concepts", val)}
                    mode="concepts"
                  />
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Belirli Gün ve Haftalar:</th>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    aria-label="Belirli gün ve haftalar" value={formData.specialDays}
                    onChange={e => updateField("specialDays", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.specialDays}</div>
                  <OfficialConceptsAndDaysPalette
                    currentValue={formData.specialDays}
                    onSelect={(val) => updateField("specialDays", val)}
                    mode="specialDays"
                  />
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
                    aria-label="Öğrenme yaşantıları" value={formData.learningExperiences}
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
                    aria-label="Zenginleştirme" value={formData.enrichment}
                    onChange={e => updateField("enrichment", e.target.value)}
                  />
                  <div className="print-only-text multiline-text">{formData.enrichment}</div>
                </td>
                <td style={{ width: "50%" }}>
                  <strong>Destekleme:</strong>
                  <textarea
                    className="of-textarea"
                    rows={3}
                    aria-label="Destekleme" value={formData.support}
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
                    aria-label="Aile ve toplum katılımı" value={formData.familyCommunityEngagement}
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
                      <FormPresetSelector options={EVALUATION_PRESETS.child.map((text, index) => ({ id: String(index), title: ["Etkin katılım ve merak", "Dil gelişimi ve iş birliği", "Bireysel destek ihtiyacı", "Öz düzenleme ve sorumluluk"][index]!, text }))} currentValue={formData.childEvaluation} onSelect={text => updateField("childEvaluation", text)} />
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      aria-label="Çocuk açısından değerlendirme" value={formData.childEvaluation}
                      onChange={e => updateField("childEvaluation", e.target.value)}
                    />
                    <div className="print-only-text multiline-text">{formData.childEvaluation}</div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong>2. Program Açısından Değerlendirme:</strong>
                      <FormPresetSelector options={EVALUATION_PRESETS.program.map((text, index) => ({ id: String(index), title: ["Çıktıların yaşa uygunluğu", "Ortam ve materyal desteği", "Açık hava için sonraki adım", "Disiplinler arası bütünlük"][index]!, text }))} currentValue={formData.programEvaluation} onSelect={text => updateField("programEvaluation", text)} />
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      aria-label="Program açısından değerlendirme" value={formData.programEvaluation}
                      onChange={e => updateField("programEvaluation", e.target.value)}
                    />
                    <div className="print-only-text multiline-text">{formData.programEvaluation}</div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong>3. Öğretmen Açısından Değerlendirme:</strong>
                      <FormPresetSelector options={EVALUATION_PRESETS.teacher.map((text, index) => ({ id: String(index), title: ["Süreçte rehberlik", "Gözlem kayıtlarının takibi", "Farklılaştırma uygulaması", "Aile geri bildirimleri"][index]!, text }))} currentValue={formData.teacherEvaluation} onSelect={text => updateField("teacherEvaluation", text)} />
                    </div>
                    <textarea
                      className="of-textarea"
                      rows={2}
                      aria-label="Öğretmen açısından değerlendirme" value={formData.teacherEvaluation}
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
                    aria-label="Öğretmen yansıtması" value={formData.teacherReflections}
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

      <OfficialPlanLinkedOutputsModal
        isOpen={isSampleOutputsOpen}
        onClose={() => setIsSampleOutputsOpen(false)}
        planTitle={`EK-5 Aylık Plan (${formData.month})`}
        civilDate={formData.month}
        ageGroup={formData.ageGroup}
        domainSkills={formData.domainSkills}
        concepts={formData.concepts}
        materials="Aylık etkinlik ve merkez materyalleri"
        activities={formData.learningExperiences}
        values={formData.values}
      />
    </div>
  );
}
