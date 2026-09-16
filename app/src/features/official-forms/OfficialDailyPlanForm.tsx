import { useState } from "react";
import { OfficialConceptsAndDaysPalette } from "./OfficialConceptsAndDaysPalette.tsx";
import { OFFICIAL_MEB_DAILY_SAMPLE_PLANS } from "./officialSamplePlansService.ts";
import "./official-forms.css";

export interface DailyPlanFormData {
  schoolName: string;
  ageGroup: string;
  teacherName: string;
  date: string;
  domainSkills: string;
  tendencies: string;
  socialEmotional: string;
  values: string;
  literacy: string;
  concepts: string;
  words: string;
  materials: string;
  learningEnvironments: string;
  startingDay: string;
  centersPlay: string;
  nutritionCleanup: string;
  activities: string;
  enrichment: string;
  support: string;
  dayEvaluation: string;
  familyEngagement: string;
  communityEngagement: string;
}

interface Props {
  initialData?: Partial<DailyPlanFormData>;
  onClose?: () => void;
}

export function OfficialDailyPlanForm({ initialData, onClose }: Props) {
  const [formData, setFormData] = useState<DailyPlanFormData>({
    schoolName: initialData?.schoolName || "Atatürk Anaokulu",
    ageGroup: initialData?.ageGroup || "60-72 Ay",
    teacherName: initialData?.teacherName || "Okul Öncesi Öğretmeni",
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    domainSkills:
      initialData?.domainSkills ||
      "TÜRKÇE: TADB.2. Dinledikleri / izledikleri şiir, hikâye hakkında çıkarım yapar.\nMATEMATİK: MAB.1. Nesneleri sayar, eşleştirir ve örüntü oluşturur.\nSANAT: SNAB.4. Sanat etkinliği için materyal seçer ve özgün ürün oluşturur.",
    tendencies: initialData?.tendencies || "E1.1. Merak, E3.2. Odaklanma, E2.2. Azim",
    socialEmotional: initialData?.socialEmotional || "SDB1.2. Kendini Düzenleme, SDB2.1. İletişim",
    values: initialData?.values || "D7. Estetik, D3. Çalışkanlık, D12. Sabır",
    literacy: initialData?.literacy || "OB4. Görsel Okuryazarlık, OB1. Erken Okuryazarlık",
    concepts: initialData?.concepts || "Büyük-Küçük, Daire-Kare, Renkler",
    words: initialData?.words || "Paylaşım, Ritim, Geometri",
    materials: initialData?.materials || "Boya kalemleri, kil, bloklar, hikaye kartları",
    learningEnvironments: initialData?.learningEnvironments || "Sanat Merkezi, Blok Merkezi, Kitap Merkezi",
    startingDay: initialData?.startingDay || "Güne başlama halkası kurulur, duygular panosu incelenir ve günün hava durumu işaretlenir.",
    centersPlay: initialData?.centersPlay || "Çocuklar ilgi ve tercihlerine göre merkezlere dağılır; serbest ve kurallı oyunlar sürdürülür.",
    nutritionCleanup: initialData?.nutritionCleanup || "El yıkama, sağlıklı beslenme rutini ve sınıftaki materyallerin toplanması.",
    activities: initialData?.activities || "1. Bütünleştirilmiş Türkçe-Sanat: 'Renklerin Dansı'\n2. Matematik-Oyun: 'Şekil Avcıları'",
    enrichment: initialData?.enrichment || "İleri düzey örüntü kartları ve 3 boyutlu blok kurguları sunulur.",
    support: initialData?.support || "İkili akran eşleşmesi ve görsel ipuçları ile destekleme sağlanır.",
    dayEvaluation: initialData?.dayEvaluation || "Günün akışı resimli kartlarla tekrar edilir. Çocukların en çok keyif aldığı anlar dinlenir.",
    familyEngagement: initialData?.familyEngagement || "Evde artık materyallerle şekil avı oyunu önerisi veli bilgi notuyla paylaşılır.",
    communityEngagement: initialData?.communityEngagement || "Okul kütüphanesi ziyareti planlanır.",
  });

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EK-6 GÜNLÜK PLAN - ${formData.date}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #111; line-height: 1.35; padding: 20px; }
  h2 { text-align: center; font-size: 13pt; color: #c2410c; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #777; padding: 6px 8px; vertical-align: top; }
  .label-cell { width: 28%; background-color: #f8fafc; font-weight: bold; }
  .section-header { background-color: #ffedd5; font-weight: bold; color: #c2410c; padding: 6px; }
</style>
</head>
<body>
  <h2>EK-6 GÜNLÜK PLAN</h2>
  <table>
    <tr><td class="label-cell">Okul Adı:</td><td>${formData.schoolName}</td><td class="label-cell">Tarih:</td><td>${formData.date}</td></tr>
    <tr><td class="label-cell">Öğretmenin Adı:</td><td>${formData.teacherName}</td><td class="label-cell">Yaş Grubu (AY):</td><td>${formData.ageGroup}</td></tr>
  </table>
  <table>
    <tr><th class="section-header" colspan="2">ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ</th></tr>
    <tr><td colspan="2">${formData.domainSkills.replace(/\n/g, "<br>")}</td></tr>
    <tr><th class="section-header" colspan="2">EĞİLİMLER</th></tr>
    <tr><td colspan="2">${formData.tendencies.replace(/\n/g, "<br>")}</td></tr>
    <tr><th class="section-header" colspan="2">PROGRAMLAR ARASI BİLEŞENLER</th></tr>
    <tr><td><b>Sosyal-Duygusal:</b> ${formData.socialEmotional}</td><td><b>Değerler:</b> ${formData.values}</td></tr>
    <tr><td colspan="2"><b>Okuryazarlık:</b> ${formData.literacy}</td></tr>
    <tr><td class="label-cell">Kavramlar:</td><td>${formData.concepts}</td></tr>
    <tr><td class="label-cell">Sözcükler:</td><td>${formData.words}</td></tr>
    <tr><td class="label-cell">Materyaller:</td><td>${formData.materials}</td></tr>
    <tr><td class="label-cell">Eğitim / Öğrenme Ortamları:</td><td>${formData.learningEnvironments}</td></tr>
  </table>
  <table>
    <tr><th class="section-header">ÖĞRENME-ÖĞRETME UYGULAMALARI</th></tr>
    <tr><td><b>Güne Başlama Zamanı:</b><br>${formData.startingDay.replace(/\n/g, "<br>")}</td></tr>
    <tr><td><b>Öğrenme Merkezlerinde Oyun:</b><br>${formData.centersPlay.replace(/\n/g, "<br>")}</td></tr>
    <tr><td><b>Beslenme, Toplanma ve Temizlik:</b><br>${formData.nutritionCleanup.replace(/\n/g, "<br>")}</td></tr>
    <tr><td><b>ETKİNLİKLER:</b><br>${formData.activities.replace(/\n/g, "<br>")}</td></tr>
  </table>
  <table>
    <tr><th class="section-header" colspan="2">FARKLILAŞTIRMA</th></tr>
    <tr><td><b>Zenginleştirme:</b><br>${formData.enrichment}</td><td><b>Destekleme:</b><br>${formData.support}</td></tr>
  </table>
  <table>
    <tr><th class="section-header">GÜNÜ DEĞERLENDİRME</th></tr>
    <tr><td>${formData.dayEvaluation.replace(/\n/g, "<br>")}</td></tr>
  </table>
  <table>
    <tr><th class="section-header" colspan="2">AİLE VE TOPLUM KATILIMI</th></tr>
    <tr><td><b>Aile Katılımı:</b><br>${formData.familyEngagement}</td><td><b>Toplum Katılımı:</b><br>${formData.communityEngagement}</td></tr>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff" + htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EK-6_Gunluk_Plan_${formData.date}.doc`;
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
            <strong>EK-6 Günlük Plan (TTKB Sayfa 183–184)</strong>
            <small>Resmî Format · A4 Çıktı ve Word Uyumluluğu</small>
          </div>
          <div className="official-form-actions__buttons">
            <select
              className="of-btn"
              style={{ background: "#fff7ed", color: "#c2410c", border: "1.5px solid #ea580c", fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}
              onChange={(e) => {
                const plan = OFFICIAL_MEB_DAILY_SAMPLE_PLANS.find(p => p.id === e.target.value);
                if (plan) {
                  setFormData(prev => ({
                    ...prev,
                    ageGroup: plan.ageGroup,
                    domainSkills: plan.domainSkills,
                    tendencies: plan.tendencies,
                    socialEmotional: plan.socialEmotional,
                    values: plan.values,
                    literacy: plan.literacy,
                    concepts: plan.concepts,
                    words: plan.words,
                    materials: plan.materials,
                    learningEnvironments: plan.learningEnvironments,
                    startingDay: plan.startingDay,
                    centersPlay: plan.centersPlay,
                    nutritionCleanup: plan.nutritionCleanup,
                    activities: plan.activities,
                    enrichment: plan.enrichment,
                    support: plan.support,
                    dayEvaluation: plan.dayEvaluation,
                    familyEngagement: plan.familyEngagement,
                    communityEngagement: plan.communityEngagement,
                  }));
                }
              }}
              defaultValue=""
              aria-label="MEB Resmî Örnek Planı Yükle"
            >
              <option value="" disabled>⚡ MEB Resmî Örnek Planını Yükle...</option>
              {OFFICIAL_MEB_DAILY_SAMPLE_PLANS.map(p => (
                <option key={p.id} value={p.id}>{p.ageGroup} ({p.pageRef}): {p.planTitle}</option>
              ))}
            </select>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır / PDF Kaydet
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📄 Word Olarak İndir (.doc)
            </button>
            {onClose && <button type="button" className="of-btn of-btn--close" onClick={onClose}>Kapat</button>}
          </div>
        </div>

        <div className="official-sheet">
          <header className="official-sheet__header">
            <h1 className="official-sheet__title">EK-6 GÜNLÜK PLAN</h1>
          </header>

          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Okul Adı:</th>
                <td>
                  <input type="text" className="of-input" value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} />
                  <span className="print-only-text">{formData.schoolName}</span>
                </td>
                <th className="official-table__label">Tarih:</th>
                <td>
                  <input type="date" className="of-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  <span className="print-only-text">{formData.date}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Öğretmenin Adı:</th>
                <td>
                  <input type="text" className="of-input" value={formData.teacherName} onChange={e => setFormData({ ...formData, teacherName: e.target.value })} />
                  <span className="print-only-text">{formData.teacherName}</span>
                </td>
                <th className="official-table__label">Yaş Grubu (AY):</th>
                <td>
                  <input type="text" className="of-input" value={formData.ageGroup} onChange={e => setFormData({ ...formData, ageGroup: e.target.value })} />
                  <span className="print-only-text">{formData.ageGroup}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header">ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={4} value={formData.domainSkills} onChange={e => setFormData({ ...formData, domainSkills: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.domainSkills}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header">EĞİLİMLER</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={2} value={formData.tendencies} onChange={e => setFormData({ ...formData, tendencies: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.tendencies}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header">PROGRAMLAR ARASI BİLEŞENLER</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Sosyal-Duygusal Öğrenme Becerileri:</strong>
                  <input type="text" className="of-input" value={formData.socialEmotional} onChange={e => setFormData({ ...formData, socialEmotional: e.target.value })} />
                  <span className="print-only-text">{formData.socialEmotional}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Değerler:</strong>
                  <input type="text" className="of-input" value={formData.values} onChange={e => setFormData({ ...formData, values: e.target.value })} />
                  <span className="print-only-text">{formData.values}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Okuryazarlık Becerileri:</strong>
                  <input type="text" className="of-input" value={formData.literacy} onChange={e => setFormData({ ...formData, literacy: e.target.value })} />
                  <span className="print-only-text">{formData.literacy}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Kavramlar:</strong>
                  <input type="text" className="of-input" value={formData.concepts} onChange={e => setFormData({ ...formData, concepts: e.target.value })} />
                  <span className="print-only-text">{formData.concepts}</span>
                  <OfficialConceptsAndDaysPalette
                    currentValue={formData.concepts}
                    onSelect={(val) => setFormData({ ...formData, concepts: val })}
                    mode="concepts"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Sözcükler:</strong>
                  <input type="text" className="of-input" value={formData.words} onChange={e => setFormData({ ...formData, words: e.target.value })} />
                  <span className="print-only-text">{formData.words}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Materyaller:</strong>
                  <input type="text" className="of-input" value={formData.materials} onChange={e => setFormData({ ...formData, materials: e.target.value })} />
                  <span className="print-only-text">{formData.materials}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Eğitim / Öğrenme Ortamları:</strong>
                  <input type="text" className="of-input" value={formData.learningEnvironments} onChange={e => setFormData({ ...formData, learningEnvironments: e.target.value })} />
                  <span className="print-only-text">{formData.learningEnvironments}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header">ÖĞRENME-ÖĞRETME UYGULAMALARI</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Güne Başlama Zamanı:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.startingDay} onChange={e => setFormData({ ...formData, startingDay: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.startingDay}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Öğrenme Merkezlerinde Oyun:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.centersPlay} onChange={e => setFormData({ ...formData, centersPlay: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.centersPlay}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Beslenme, Toplanma ve Temizlik:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.nutritionCleanup} onChange={e => setFormData({ ...formData, nutritionCleanup: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.nutritionCleanup}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>ETKİNLİKLER:</strong>
                  <textarea className="of-textarea" rows={4} value={formData.activities} onChange={e => setFormData({ ...formData, activities: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.activities}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header" colSpan={2}>FARKLILAŞTIRMA</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Zenginleştirme:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.enrichment} onChange={e => setFormData({ ...formData, enrichment: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.enrichment}</div>
                </td>
                <td>
                  <strong>Destekleme:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.support} onChange={e => setFormData({ ...formData, support: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.support}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header">GÜNÜ DEĞERLENDİRME</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={3} value={formData.dayEvaluation} onChange={e => setFormData({ ...formData, dayEvaluation: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.dayEvaluation}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="official-table">
            <thead>
              <tr><th className="official-table__section-header" colSpan={2}>AİLE VE TOPLUM KATILIMI</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Aile Katılımı:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.familyEngagement} onChange={e => setFormData({ ...formData, familyEngagement: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.familyEngagement}</div>
                </td>
                <td>
                  <strong>Toplum Katılımı:</strong>
                  <textarea className="of-textarea" rows={3} value={formData.communityEngagement} onChange={e => setFormData({ ...formData, communityEngagement: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.communityEngagement}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <footer className="official-sheet__footer">
            <div className="official-sheet__signature">
              <span>Öğretmen:</span>
              <strong>{formData.teacherName}</strong>
              <div className="signature-line">İmza: ...................................</div>
            </div>
            <div className="official-sheet__page-num">183–184</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
