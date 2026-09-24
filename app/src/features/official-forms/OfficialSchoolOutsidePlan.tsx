import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface SchoolOutsidePlanData {
  place: string;
  date: string;
  schoolName: string;
  classes: string;
  ageGroup: string;
  girlCount: number | string;
  boyCount: number | string;
  departureReturnHours: string;
  staff: string;
  parents: string;
  vehicleInfo: string;
  route: string;
  domainSkills: string;
  tendencies: string;
  interdisciplinary: string;
  concepts: string;
  materials: string;
  beforeActivity: string;
  duringActivity: string;
  afterActivity: string;
  evaluationQuestions: string;
  teacherName: string;
}

interface Props {
  initialData?: Partial<SchoolOutsidePlanData>;
  onClose?: () => void;
}

export function OfficialSchoolOutsidePlan({ initialData, onClose }: Props) {
  const [formData, setFormData] = useOfficialFormState<SchoolOutsidePlanData>("formData", {
    place: initialData?.place || "Oyuncak Müzesi",
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    schoolName: initialData?.schoolName || "Atatürk Anaokulu",
    classes: initialData?.classes || "Papatyalar Sınıfı (5 Yaş)",
    ageGroup: initialData?.ageGroup || "5 yaş (60-72 ay)",
    girlCount: initialData?.girlCount || 10,
    boyCount: initialData?.boyCount || 10,
    departureReturnHours: initialData?.departureReturnHours || "09:30 - 12:30",
    staff: initialData?.staff || "Ayşe Yılmaz (Öğretmen), Fatma Demir (Yardımcı Personel)",
    parents: initialData?.parents || "2 Veli Temsilcisi Refakatçi",
    vehicleInfo: initialData?.vehicleInfo || "Okul Servis Aracı - 20 S 0123",
    route: initialData?.route || "Okul -> Çamlık Bulvarı -> Müze Güzergâhı",
    domainSkills:
      initialData?.domainSkills ||
      "TÜRKÇE ALANI:\nTADB.2. Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ile ilgili yeni anlamlar oluşturabilme\nTADB.2. c. Dinledikleri / izledikleri materyallere ilişkin çıkarım yapar.\n\nSANAT ALANI:\nSNAB.4. Sanat etkinliği uygulayabilme\nSNAB.4. b. Sanat etkinliği için gerekli materyalleri seçer.\nSNAB.4. c. Sanat materyallerini amacına uygun biçimde kullanır.\nSNAB.4. d. Sanat etkinliklerinde özgün ürünler oluşturur.",
    tendencies:
      initialData?.tendencies ||
      "E1. Benlik Eğilimleri (E1.1. Merak)\nE3. Entelektüel Eğilimler (E3.2. Odaklanma)",
    interdisciplinary:
      initialData?.interdisciplinary ||
      "SOSYAL-DUYGUSAL ÖĞRENME BECERİLERİ: SDB1.2. Kendini Düzenleme (Öz Düzenleme)\nDEĞERLER: D7. Estetik (D7.2), D3. Çalışkanlık (D3.4), D12. Sabır (D12.1)\nOKURYAZARLIK BECERİLERİ: OB4. Görsel Okuryazarlık",
    concepts: initialData?.concepts || "Eski-Yeni, Geçmiş-Gelecek, Ahşap-Plastik",
    materials:
      initialData?.materials ||
      "Oyuncak fotoğrafları, müze kurallarını içeren görsel kartlar, boya kalemleri, kâğıt, atık materyaller.",
    beforeActivity:
      initialData?.beforeActivity ||
      "Çocuklardan en çok sevdikleri oyuncağı sınıfa getirmeleri istenir. Getirilen oyuncaklar hakkında sohbet edilir. Çocuklara 'Anneannenizin, dedenizin, annenizin veya babanızın çocukken oynadığı oyuncakları gördünüz mü?' soruları yöneltilir. Müzeye gidileceği söylenir ve müze kuralları hatırlatılır.",
    duringActivity:
      initialData?.duringActivity ||
      "Müzeye gelindiğinde çocuklara iki parçaya ayrılmış oyuncak görselleri dağıtılır. Müze rehberi veya öğretmen oyuncakların tarihçesi hakkında bilgi verir. Çocuklar müzede bulunan oyuncaklarla drama yoluyla canlandırma yapar.",
    afterActivity:
      initialData?.afterActivity ||
      "Sınıfa dönüldüğünde çocuklarla resimleri hakkında sohbet edilir. Çocuklara 'Bir oyuncak tasarlayacak olsaydınız bu nasıl bir oyuncak olurdu?' sorusu sorularak atık materyallerle oyuncak tasarımları yapmaları sağlanır. Ürünler sergilenir.",
    evaluationQuestions:
      initialData?.evaluationQuestions ||
      "• Bugün müzede hangi oyuncakları gördük?\n• Bugün incelediğimiz oyuncaklar hangi malzemelerden yapılmıştı?\n• En çok hangi oyuncağı beğendin?\n• Hangi oyuncak seni şaşırttı?\n• Eski oyuncaklar günümüzdeki oyuncaklara benziyor mu?\n• Evinizde müzedeki oyuncaklara benzeyen oyuncaklar var mı?\n• Oyuncak müzesini tek başına gezsen neleri incelerdin?\n• Yeniden bir oyuncak tasarlasan farklı ne yapardın?",
    teacherName: initialData?.teacherName || "Okul Öncesi Öğretmeni",
  });

  const handlePrint = () => {
    printOfficialFormA4(`EK-4_Okul_Disi_Plan_${formData.place.replace(/\s+/g, "_")}_${formData.date}`);
  };

  const handleDownloadWord = () => downloadOfficialFormWord("OfficialSchoolOutsidePlan");

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    await exportOfficialTableToExcel({
      fileName: `EK-4_Okul_Disi_Plan_${formData.place.replace(/\s+/g, "_")}_${formData.date}`,
      sheetName: "EK-4 Okul Dışı Plan",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — EK-4 OKUL DIŞI ÖĞRENME ETKİNLİĞİ PLANI",
      subtitle: `${formData.schoolName} · ${formData.place} · Tarih: ${formData.date} · Öğretmen: ${formData.teacherName}`,
      metadata: [
        { label: "Okul Adı", value: formData.schoolName },
        { label: "Etkinlik Yeri", value: formData.place },
        { label: "Tarih", value: formData.date },
        { label: "Yaş Grubu", value: formData.ageGroup },
        { label: "Öğretmen", value: formData.teacherName },
        { label: "Katılımcı", value: `${formData.girlCount} Kız, ${formData.boyCount} Erkek (Toplam: ${Number(formData.girlCount) + Number(formData.boyCount)})` },
      ],
      columns: [
        { header: "Bölüm / Parametre", key: "section", width: 30, align: "left" },
        { header: "Plan Açıklama ve Detayları", key: "content", width: 65, align: "left" },
      ],
      rows: [
        { section: "ETKİNLİK YERİ VE TARİHİ", content: `${formData.place} (${formData.date})` },
        { section: "GİDİŞ-DÖNÜŞ SAATLERİ", content: formData.departureReturnHours },
        { section: "GÖREVLİ ÖĞRETMEN / PERSONEL", content: formData.staff },
        { section: "KATILAN EBEVEYNLER", content: formData.parents },
        { section: "TAŞIT BİLGİSİ & GÜZERGÂH", content: `${formData.vehicleInfo} | Güzergâh: ${formData.route}` },
        { section: "ALAN BECERİLERİ & ÇIKTILAR", content: formData.domainSkills },
        { section: "EĞİLİMLER", content: formData.tendencies },
        { section: "PROGRAMLAR ARASI BİLEŞENLER", content: formData.interdisciplinary },
        { section: "KAVRAMLAR & MATERYALLER", content: `Kavramlar: ${formData.concepts}\nMateryaller: ${formData.materials}` },
        { section: "ETKİNLİK ÖNCESİ HAZIRLIK", content: formData.beforeActivity },
        { section: "ETKİNLİK SÜRECİ (UYGULAMA)", content: formData.duringActivity },
        { section: "ETKİNLİK SONRASI DEĞERLENDİRME", content: formData.afterActivity },
        { section: "DEĞERLENDİRME SORULARI", content: formData.evaluationQuestions },
      ],
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable">
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-4 Okul Dışı Öğrenme Etkinliği Plan Örneği (TTKB Sayfa 180–181)</strong>
            <small>Resmî Format · A4 Çıktı, Excel ve Word Uyumluluğu</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn"
              style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
              onClick={() => void handleDownloadExcel()}
              title="Okul dışı öğrenme planını Excel (.xlsx) olarak indir"
            >
              📊 Excel (.xlsx)
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır / PDF Kaydet
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📄 Word Olarak İndir (.docx)
            </button>
            {onClose ? (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                Kapat
              </button>
            ) : null}
          </div>
        </div>

        <div className="official-sheet">
          <header className="official-sheet__header">
            <h1 className="official-sheet__title">EK-4 OKUL DIŞI ÖĞRENME ETKİNLİĞİ PLAN ÖRNEĞİ</h1>
          </header>

          <table className="official-table">
            <tbody>
              <tr>
                <th className="official-table__label">Etkinlik Yeri:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.place} onChange={e => setFormData({ ...formData, place: e.target.value })} />
                  <span className="print-only-text">{formData.place}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Etkinlik Tarihi:</th>
                <td className="official-table__value">
                  <input type="date" className="of-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  <span className="print-only-text">{formData.date}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Okulun Adı:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} />
                  <span className="print-only-text">{formData.schoolName}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Etkinliğe Katılacak Sınıflar:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.classes} onChange={e => setFormData({ ...formData, classes: e.target.value })} />
                  <span className="print-only-text">{formData.classes}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Yaş Grubu:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.ageGroup} onChange={e => setFormData({ ...formData, ageGroup: e.target.value })} />
                  <span className="print-only-text">{formData.ageGroup}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Etkinliğe Katılacak Çocuk Sayısı:</th>
                <td className="official-table__value">
                  <div className="of-row-inputs no-print">
                    <label>Kız: <input type="number" className="of-input-short" value={formData.girlCount} onChange={e => setFormData({ ...formData, girlCount: e.target.value })} /></label>
                    <label>Erkek: <input type="number" className="of-input-short" value={formData.boyCount} onChange={e => setFormData({ ...formData, boyCount: e.target.value })} /></label>
                  </div>
                  <span className="print-only-text">{formData.girlCount} Kız, {formData.boyCount} Erkek</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Gidiş-Dönüş Saatleri:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.departureReturnHours} onChange={e => setFormData({ ...formData, departureReturnHours: e.target.value })} />
                  <span className="print-only-text">{formData.departureReturnHours}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Etkinliğe Katılacak Öğretmen / Personel:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.staff} onChange={e => setFormData({ ...formData, staff: e.target.value })} />
                  <span className="print-only-text">{formData.staff}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Etkinliğe Katılacak Ebeveyn Bilgisi:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.parents} onChange={e => setFormData({ ...formData, parents: e.target.value })} />
                  <span className="print-only-text">{formData.parents}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Taşıt Bilgisi (Araç tipi ve plakası):</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.vehicleInfo} onChange={e => setFormData({ ...formData, vehicleInfo: e.target.value })} />
                  <span className="print-only-text">{formData.vehicleInfo}</span>
                </td>
              </tr>
              <tr>
                <th className="official-table__label">Yol / Güzergâh:</th>
                <td className="official-table__value">
                  <input type="text" className="of-input" value={formData.route} onChange={e => setFormData({ ...formData, route: e.target.value })} />
                  <span className="print-only-text">{formData.route}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ALAN BECERİLERİ */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header">ALAN BECERİLERİ, ÖĞRENME ÇIKTILARI VE SÜREÇ BİLEŞENLERİ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={5} value={formData.domainSkills} onChange={e => setFormData({ ...formData, domainSkills: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.domainSkills}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* EĞİLİMLER */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header">EĞİLİMLER</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={3} value={formData.tendencies} onChange={e => setFormData({ ...formData, tendencies: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.tendencies}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* PROGRAMLAR ARASI BİLEŞENLER */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header">PROGRAMLAR ARASI BİLEŞENLER</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={4} value={formData.interdisciplinary} onChange={e => setFormData({ ...formData, interdisciplinary: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.interdisciplinary}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Kavramlar: </strong>
                  <input type="text" className="of-input-inline" value={formData.concepts} onChange={e => setFormData({ ...formData, concepts: e.target.value })} />
                  <span className="print-only-text">{formData.concepts}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Materyaller: </strong>
                  <input type="text" className="of-input-inline" value={formData.materials} onChange={e => setFormData({ ...formData, materials: e.target.value })} />
                  <span className="print-only-text">{formData.materials}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ÖĞRENME-ÖĞRETME UYGULAMALARI */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header">ÖĞRENME-ÖĞRETME UYGULAMALARI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Okul Dışı Öğrenme Etkinliği Öncesi:</strong>
                  <textarea className="of-textarea" rows={4} value={formData.beforeActivity} onChange={e => setFormData({ ...formData, beforeActivity: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.beforeActivity}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Okul Dışı Öğrenme Etkinliği Süreci:</strong>
                  <textarea className="of-textarea" rows={5} value={formData.duringActivity} onChange={e => setFormData({ ...formData, duringActivity: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.duringActivity}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Okul Dışı Öğrenme Etkinliği Sonrası:</strong>
                  <textarea className="of-textarea" rows={4} value={formData.afterActivity} onChange={e => setFormData({ ...formData, afterActivity: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.afterActivity}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* DEĞERLENDİRME */}
          <table className="official-table">
            <thead>
              <tr>
                <th className="official-table__section-header">DEĞERLENDİRME</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="official-table__text-area-cell">
                  <textarea className="of-textarea" rows={5} value={formData.evaluationQuestions} onChange={e => setFormData({ ...formData, evaluationQuestions: e.target.value })} />
                  <div className="print-only-text multiline-text">{formData.evaluationQuestions}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <footer className="official-sheet__footer">
            <div className="official-sheet__signature">
              <span>Sınıf Öğretmeni</span>
              <strong>{formData.teacherName}</strong>
              <div className="signature-line">İmza: ...................................</div>
            </div>
            <div className="official-sheet__signature">
              <span>Okul Müdürü</span>
              <strong>Onaylandı</strong>
              <div className="signature-line">İmza / Mühür: ...........................</div>
            </div>
            <div className="official-sheet__page-num">180–181</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
