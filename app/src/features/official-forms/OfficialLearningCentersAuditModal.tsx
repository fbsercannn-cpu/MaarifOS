import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface AuditItem {
  id: string;
  criterion: string;
  status: "uygun" | "kismen" | "eksik";
  notes: string;
}

interface CenterAudit {
  centerId: string;
  centerName: string;
  icon: string;
  items: AuditItem[];
}

const INITIAL_CENTERS: CenterAudit[] = [
  {
    centerId: "blok",
    centerName: "Blok Merkezi",
    icon: "🧱",
    items: [
      { id: "b1", criterion: "Farklı ebat ve dokularda doğal ahşap ve yumuşak bloklar mevcuttur.", status: "uygun", notes: "Doğal çam ve sünger bloklar tam." },
      { id: "b2", criterion: "Blokların devrilme riskine karşı zemin halısı ve güvenli alan ayrılmıştır.", status: "uygun", notes: "Yumuşak oyun halısı serili." },
      { id: "b3", criterion: "Raflarda blok çeşitleri görsel etiketlerle kategorize edilmiştir.", status: "uygun", notes: "Fotoğraflı kutu etiketleri yapıştırıldı." },
      { id: "b4", criterion: "Tamamlayıcı figürler (insan, hayvan, taşıt, trafik işaretleri) bulunmaktadır.", status: "kismen", notes: "Trafik levhaları eklenecek." },
    ],
  },
  {
    centerId: "kitap",
    centerName: "Kitap Merkezi",
    icon: "📚",
    items: [
      { id: "k1", criterion: "Kitaplar kapakları çocuklara dönük açık raflarda sergilenmektedir.", status: "uygun", notes: "Çocuk boyu ahşap kitaplık." },
      { id: "k2", criterion: "Merkezde sessizliği destekleyen minderler, puf ve yumuşak ışık vardır.", status: "uygun", notes: "Okuma köşesi puf ve minderi hazır." },
      { id: "k3", criterion: "Kitaplar yaş grubuna uygun, yıpranmamış ve değer/kavram çeşitliliği taşımaktadır.", status: "uygun", notes: "35 adet zengin resimli kitap." },
      { id: "k4", criterion: "Çocukların kendi hazırladıkları hikaye kitapları için özel sergi yeri ayrılmıştır.", status: "kismen", notes: "Askılık alanı ayrılacak." },
    ],
  },
  {
    centerId: "muzik",
    centerName: "Müzik Merkezi",
    icon: "🎵",
    items: [
      { id: "m1", criterion: "Orff çalgıları (marakas, tef, üçgen zil, ritim çubukları, ksilofon) mevcuttur.", status: "uygun", notes: "Standart Orff seti rafta." },
      { id: "m2", criterion: "Doğal ve geri dönüşümden üretilmiş ses çıkaran özgün aletler yer almaktadır.", status: "uygun", notes: "Ceviz kabuğu ve bakliyat şişeleri mevcut." },
      { id: "m3", criterion: "Müzik aletleri çocukların tek başına alıp koyabileceği yüksekliktedir.", status: "uygun", notes: "Alçak açık sepetlerde." },
      { id: "m4", criterion: "Sınıfın sessiz alanlarıyla ses çatışması önlenecek biçimde konumlandırılmıştır.", status: "uygun", notes: "Dramatik oyun merkezine komşu." },
    ],
  },
  {
    centerId: "sanat",
    centerName: "Sanat Merkezi",
    icon: "🎨",
    items: [
      { id: "s1", criterion: "Kullanılan tüm boya ve yapıştırıcılar su bazlı, CE / EN-71 toksik olmayan sertifikalıdır.", status: "uygun", notes: "Sağlık Bakanlığı onaylı su bazlı guaj ve parmak boyası." },
      { id: "s2", criterion: "Merkez su kaynağına ve lavaboya yakın, kolay temizlenebilir zemin üzerindedir.", status: "uygun", notes: "Islak zemin muşambası ve koruyucu önlükler hazır." },
      { id: "s3", criterion: "Farklı kâğıt, karton, killi çamur, kumaş ve doğal atık malzemeler zengindir.", status: "uygun", notes: "Sıfır atık kutusuyla entegre." },
      { id: "s4", criterion: "Kuruma rafı ve çocuk ürünlerini asma panosu düzenli işletilmektedir.", status: "uygun", notes: "İpli mandallı kurutma teli faal." },
    ],
  },
  {
    centerId: "fen",
    centerName: "Fen ve Doğa Merkezi",
    icon: "🔬",
    items: [
      { id: "f1", criterion: "Kırılmaz büyüteç, mikroskop, terazi, mıknatıs ve ölçüm kapları mevcuttur.", status: "uygun", notes: "Güvenli plastik mercekli büyüteçler." },
      { id: "f2", criterion: "Tohum, kozalak, yaprak, taş, deniz kabuğu koleksiyonları etiketlidir.", status: "uygun", notes: "Mevsimlik doğa kutuları güncel." },
      { id: "f3", criterion: "Bitki yetiştirme saksıları ve bakım çizelgesi aktiftir.", status: "kismen", notes: "Fasulye çimlendirme saksısı hazırlandı." },
      { id: "f4", criterion: "Merkez doğrudan doğal gün ışığı alan pencere yakınına yerleştirilmiştir.", status: "uygun", notes: "Güneş alan aydınlık köşe." },
    ],
  },
  {
    centerId: "drama",
    centerName: "Dramatik Oyun Merkezi",
    icon: "🎭",
    items: [
      { id: "d1", criterion: "Farklı meslek ve toplumsal roller için güvenli kostüm ve aksesuarlar vardır.", status: "uygun", notes: "Doktor, itfaiyeci, aşçı önlükleri." },
      { id: "d2", criterion: "Kırılmaz güvenlik aynası çocuğun boyuna uygun monte edilmiştir.", status: "uygun", notes: "Akrilik güvenlik aynası duvarda." },
      { id: "d3", criterion: "Evcilik, mutfak ve market köşesi eşyaları temiz ve hasarsızdır.", status: "uygun", notes: "Ahşap mutfak tezgâhı ve kaplar." },
      { id: "d4", criterion: "Kukla sahnesi, el ve parmak kuklaları kullanıma hazırdır.", status: "uygun", notes: "Kumaş paravan kukla sahnesi." },
    ],
  },
];

export function OfficialLearningCentersAuditModal({ onClose }: { onClose?: () => void }) {
  const [centers, setCenters] = useState<CenterAudit[]>(INITIAL_CENTERS);
  const [schoolName, setSchoolName] = useState("Millî Egemenlik Anaokulu");
  const [className, setClassName] = useState("Papatyalar Sınıfı (5 Yaş / 60-72 Ay)");
  const [auditDate, setAuditDate] = useState("2026-09-15");
  const [auditorName, setAuditorName] = useState("Emine Öğretmen");
  const [remedialAction, setRemedialAction] = useState(
    "Kitap merkezine çocuk yapımı ürün askılığı eklenecek. Blok merkezine ahşap trafik tabelaları temin edilecek. Tüm merkezlerde hijyen ve CE uygunluğu tam."
  );

  const handleToggleStatus = (centerId: string, itemId: string) => {
    setCenters(prev =>
      prev.map(c => {
        if (c.centerId !== centerId) return c;
        return {
          ...c,
          items: c.items.map(it => {
            if (it.id !== itemId) return it;
            const nextStatus: AuditItem["status"] =
              it.status === "uygun" ? "kismen" : it.status === "kismen" ? "eksik" : "uygun";
            return { ...it, status: nextStatus };
          }),
        };
      })
    );
  };

  const handleUpdateNote = (centerId: string, itemId: string, note: string) => {
    setCenters(prev =>
      prev.map(c => {
        if (c.centerId !== centerId) return c;
        return {
          ...c,
          items: c.items.map(it => (it.id === itemId ? { ...it, notes: note } : it)),
        };
      })
    );
  };

  const totalItems = centers.reduce((acc, c) => acc + c.items.length, 0);
  const uygunCount = centers.reduce(
    (acc, c) => acc + c.items.filter(it => it.status === "uygun").length,
    0
  );
  const kismenCount = centers.reduce(
    (acc, c) => acc + c.items.filter(it => it.status === "kismen").length,
    0
  );
  const eksikCount = centers.reduce(
    (acc, c) => acc + c.items.filter(it => it.status === "eksik").length,
    0
  );
  const complianceScore = Math.round(((uygunCount + kismenCount * 0.5) / totalItems) * 100);

  const handlePrint = () => {
    printOfficialFormA4(`Ogrenme_Merkezleri_Denetim_Tutanagi_${auditDate}`);
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Ogrenme_Merkezleri_Denetim_Tutanagi</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.3; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 9pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          ÖĞRENME MERKEZLERİ STANDART DONATIM VE GÜVENLİK DENETİM TUTANAĞI
        </div>
        <table>
          <tr><td><b>Okul Adı:</b> ${schoolName}</td><td><b>Şube / Yaş Grubu:</b> ${className}</td></tr>
          <tr><td><b>Denetim Tarihi:</b> ${auditDate}</td><td><b>Denetleyen:</b> ${auditorName}</td></tr>
          <tr><td colspan='2'><b>Genel Standart Uygunluk Skoru:</b> %${complianceScore} (${uygunCount} Uygun, ${kismenCount} Kısmen, ${eksikCount} Eksik)</td></tr>
        </table>
        ${centers.map(c => `
          <h4>${c.icon} ${c.centerName}</h4>
          <table>
            <thead>
              <tr>
                <th style='width: 60%'>Denetim Kriteri</th>
                <th style='width: 15%'>Durum</th>
                <th style='width: 25%'>Açıklama / Tespit</th>
              </tr>
            </thead>
            <tbody>
              ${c.items.map(it => `
                <tr>
                  <td>${it.criterion}</td>
                  <td style='text-align: center;'>${it.status === 'uygun' ? 'UYGUN [✓]' : it.status === 'kismen' ? 'KISMEN [⚠️]' : 'EKSİK [✗]'}</td>
                  <td>${it.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}
        <p><b>Gerekli İyileştirme ve Tamamlama Eylemleri:</b><br/>${remedialAction}</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${auditorName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü / Denetçi</b><br/><br/>Mühür / İmza</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Ogrenme_Merkezleri_Denetim_${auditDate}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const statusMap: Record<string, string> = {
      uygun: "UYGUN [✓]",
      kismen: "KISMEN [⚠️]",
      eksik: "EKSİK [✗]",
    };

    let rowNo = 1;
    const rows = centers.flatMap(c =>
      c.items.map(it => ({
        no: rowNo++,
        centerName: c.centerName,
        criterion: it.criterion,
        status: statusMap[it.status] || it.status,
        score: it.status === "uygun" ? 2 : it.status === "kismen" ? 1 : 0,
        notes: it.notes || "-",
      }))
    );

    await exportOfficialTableToExcel({
      fileName: `MEB_Ogrenme_Merkezleri_Denetim_${auditDate}`,
      sheetName: "Merkezler Denetim",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — ÖĞRENME MERKEZLERİ STANDART DONATIM VE GÜVENLİK DENETİM TUTANAĞI",
      subtitle: `${schoolName} · ${className} · Tarih: ${auditDate} · Denetleyen: ${auditorName}`,
      metadata: [
        { label: "Okul", value: schoolName },
        { label: "Sınıf / Şube", value: className },
        { label: "Denetim Tarihi", value: auditDate },
        { label: "Denetleyen Öğretmen", value: auditorName },
        { label: "Standart Uyum Skoru", value: `%${complianceScore} (${uygunCount} Uygun, ${kismenCount} Kısmen, ${eksikCount} Eksik)` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenme Merkezi", key: "centerName", width: 22, align: "left" },
        { header: "Denetim Kriteri", key: "criterion", width: 50, align: "left" },
        { header: "Durum", key: "status", width: 16, align: "center" },
        { header: "Puan", key: "score", width: 10, align: "center", isNumeric: true },
        { header: "Açıklama / Tespit / Önlem", key: "notes", width: 35, align: "left" },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 97–104</span>
          <span className="of-tag of-tag--navy">Öğrenme Ortamları</span>
          <span className="of-tag of-tag--emerald">MEB Donatım &amp; Güvenlik Standardı</span>
        </div>
        <div className="of-actions-bar__right">
          <button
            type="button"
            className="of-btn"
            onClick={handleExportExcel}
            style={{ background: "#15803d", color: "#fff", borderColor: "#15803d" }}
          >
            📊 Excel (.xlsx)
          </button>
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

      {/* Summary Score Bar (No Print) */}
      <div className="of-card no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h4 style={{ margin: 0, color: "#1e3a8a", fontSize: "1rem" }}>
              📊 Öğrenme Merkezleri Standart Uyum Skoru: %{complianceScore}
            </h4>
            <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "4px" }}>
              Toplam {totalItems} Kriter: <strong style={{ color: "#16a34a" }}>{uygunCount} Tam Uygun</strong>,{" "}
              <strong style={{ color: "#ca8a04" }}>{kismenCount} Kısmen Uygun</strong>,{" "}
              <strong style={{ color: "#dc2626" }}>{eksikCount} Eksik</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span className="of-tag of-tag--emerald">Tıkla Durum Değiştir: [Uygun ✓] → [Kısmen ⚠️] → [Eksik ✗]</span>
          </div>
        </div>
      </div>

      {/* Printable A4 Sheet */}
      <div className="official-a4-sheet">
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            ÖĞRENME MERKEZLERİ STANDART DONATIM VE GÜVENLİK DENETİM TUTANAĞI
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, s. 97–104
          </div>
        </div>

        {/* Identity Table */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "20%" }}><strong>Okul Adı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                />
              </td>
              <td style={{ width: "20%" }}><strong>Şube / Yaş Grubu:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Denetim Tarihi:</strong></td>
              <td>
                <input
                  type="date"
                  className="of-input"
                  value={auditDate}
                  onChange={e => setAuditDate(e.target.value)}
                />
              </td>
              <td><strong>Denetleyen Öğretmen:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={auditorName}
                  onChange={e => setAuditorName(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Centers Table */}
        {centers.map(center => (
          <div key={center.centerId} style={{ marginTop: "1rem", pageBreakInside: "avoid" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", color: "#1e3a8a", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>{center.icon}</span>
              <span>{center.centerName} Standart Denetimi</span>
            </h3>
            <table className="of-data-table">
              <thead>
                <tr>
                  <th style={{ width: "55%" }}>Denetlenen MEB Standardı ve Kriter</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Durum</th>
                  <th style={{ width: "30%" }}>Gözlem Notu / Tamamlama Kararı</th>
                </tr>
              </thead>
              <tbody>
                {center.items.map(item => {
                  const statusBg =
                    item.status === "uygun" ? "#dcfce7" : item.status === "kismen" ? "#fef9c3" : "#fee2e2";
                  const statusText =
                    item.status === "uygun" ? "UYGUN ✓" : item.status === "kismen" ? "KISMEN ⚠️" : "EKSİK ✗";
                  const statusColor =
                    item.status === "uygun" ? "#15803d" : item.status === "kismen" ? "#a16207" : "#b91c1c";

                  return (
                    <tr key={item.id}>
                      <td style={{ fontSize: "0.85rem" }}>{item.criterion}</td>
                      <td style={{ textAlign: "center", padding: "4px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(center.centerId, item.id)}
                          style={{
                            background: statusBg,
                            color: statusColor,
                            border: "1px solid " + statusColor,
                            borderRadius: "4px",
                            padding: "3px 6px",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            width: "100%",
                          }}
                          title="Durumu değiştirmek için tıklayın"
                        >
                          {statusText}
                        </button>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="of-input"
                          style={{ fontSize: "0.8rem", padding: "4px" }}
                          value={item.notes}
                          onChange={e => handleUpdateNote(center.centerId, item.id, e.target.value)}
                          placeholder="Tespit notu..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Remedial Actions */}
        <div style={{ marginTop: "1rem", pageBreakInside: "avoid" }}>
          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", color: "#1e3a8a" }}>
            Eksikliklerin Giderilmesine İlişkin İyileştirme ve Güvenlik Eylem Planı:
          </label>
          <textarea
            className="of-textarea"
            rows={3}
            value={remedialAction}
            onChange={e => setRemedialAction(e.target.value)}
          />
        </div>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "1.5rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Denetleyen Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{auditorName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Okul Müdürü / Maarif Müfettişi</span>
            <span className="of-signature-block__name">İnceleme ve Onay</span>
            <span className="of-signature-block__sign">Mühür / İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
