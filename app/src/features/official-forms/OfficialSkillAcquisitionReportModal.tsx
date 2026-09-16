import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface StudentReportData {
  id: string;
  name: string;
  ageMonth: string;
  turkce: string;
  matematik: string;
  fen: string;
  sosyal: string;
  hareketSaglik: string;
  sanat: string;
  muzik: string;
  sdbDegerler: string;
  teacherOpinion: string;
}

const DEFAULT_STUDENTS: StudentReportData[] = [
  {
    id: "s1",
    name: "Demir Korkmaz",
    ageMonth: "62 Ay",
    turkce: "Dinlediği hikâyelerin ana fikrini ve kahramanlarını doğru aktarabilmekte, olaylar arası neden-sonuç bağlarını zengin sözcüklerle ifade etmektedir.",
    matematik: "1-20 arası nesneleri birebir eşleyerek saymakta, geometrik şekilleri (kare, üçgen, çember) özelliklerine göre ayırt edip örüntüler kurabilmektedir.",
    fen: "Doğa olaylarına yönelik yüksek merak ve sorgulama eğilimi göstermektedir. Basit deneylerde tahminlerde bulunup gözlem sonuçlarını modellemektedir.",
    sosyal: "Mekânda konum kavramlarını doğru kullanmakta, aile ve okul yaşamındaki kurallara ve toplumsal rollere duyarlılıkla uymaktadır.",
    hareketSaglik: "Büyük kas koordinasyonunda denge tahtası ve top oyunlarında başarılıdır. Kişisel temizlik ve öz bakım rutinlerini bağımsız yerine getirmektedir.",
    sanat: "Farklı malzemeleri (kil, atık karton, guaj boya) birleştirerek üç boyutlu özgün tasarımlar üretmekte, estetik ayrıntılara dikkat etmektedir.",
    muzik: "Ritim çalgılarını şarkının temposuna uygun çalmakta, doğadaki sesleri ve müzik aletlerinin tınılarını kolaylıkla ayırt etmektedir.",
    sdbDegerler: "Akranlarıyla iş birliği yapmaktan keyif almakta; paylaşma, nezaket ve sabır değerlerini sınıf içi rutinlerde tutarlı biçimde yansıtmaktadır.",
    teacherOpinion: "Bütünsel gelişim sürecinde yaşının üzerinde bir bilişsel merak ve sosyal olgunluk sergilemektedir. Süreç odaklı öğrenme merkezlerinde liderlik potansiyeli yüksektir.",
  },
  {
    id: "s2",
    name: "Zeynep Aslan",
    ageMonth: "60 Ay",
    turkce: "Kendini akıcı ve anlaşılır biçimde ifade etmekte, grup sohbetlerinde söz alarak konuşma ve dinleme kurallarına özen göstermektedir.",
    matematik: "Nesneleri boyut, renk ve miktarlarına göre sınıflandırabilmekte, parça-bütün ilişkilerini somut materyallerle doğru kurgulamaktadır.",
    fen: "Bitki yetiştirme ve mevsim döngüleri gözlemlerine aktif katılmakta, canlıların yaşam döngüleri hakkında çıkarımlarda bulunmaktadır.",
    sosyal: "Çevresindeki bireylerin duygularını fark edebilmekte, bayram ve belirli günlerin anlam ve önemine dair farkındalık sergilemektedir.",
    hareketSaglik: "İnce motor becerilerde makas ve kalem kontrolü oldukça gelişmiştir. Sağlıklı beslenme tercihlerinde bilinçlidir.",
    sanat: "Görsel sanatlarda renk uyumu ve özgün figürler çizme konusunda yeteneklidir. Sanat etkinliklerinde odaklanma süresi uzundur.",
    muzik: "Sınıf korosunda şarkılara hevesle eşlik etmekte, ritim ve hareket çalışmalarında beden perküsyonunu başarıyla uygulamaktadır.",
    sdbDegerler: "Duygularını tanımlayabilmekte ve arkadaşlarına empatiyle yaklaşmaktadır. Sorumluluk alma ve başladığı işi bitirme konusunda titizdir.",
    teacherOpinion: "Sakin, uyumlu ve estetik duyarlılığı yüksek bir gelişim profili sergilemektedir. İkinci dönemde fen sorgulamalarıyla merakının desteklenmesi önerilir.",
  },
];

export function OfficialSkillAcquisitionReportModal({ onClose }: { onClose?: () => void }) {
  const [students, setStudents] = useState<StudentReportData[]>(DEFAULT_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("s1");
  const [term, setTerm] = useState("2026-2027 Eğitim-Öğretim Yılı 1. Dönem");
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0]!;

  const handleUpdateField = (field: keyof StudentReportData, value: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === selectedStudentId ? { ...s, [field]: value } : s))
    );
  };

  const handleCopyField = (fieldName: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAllForEOkul = () => {
    const fullText = `TÜRKÇE: ${activeStudent.turkce}\nMATEMATİK: ${activeStudent.matematik}\nFEN: ${activeStudent.fen}\nSOSYAL: ${activeStudent.sosyal}\nHAREKET VE SAĞLIK: ${activeStudent.hareketSaglik}\nSANAT: ${activeStudent.sanat}\nMÜZİK: ${activeStudent.muzik}\nSOSYAL-DUYGUSAL & DEĞERLER: ${activeStudent.sdbDegerler}\nÖĞRETMEN GÖRÜŞÜ: ${activeStudent.teacherOpinion}`;
    navigator.clipboard.writeText(fullText);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handlePrint = () => {
    printOfficialFormA4(`Beceri_Edinim_Raporu_${activeStudent.name.replace(/\s+/g, "_")}`);
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Beceri_Edinim_Raporu_${activeStudent.name}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; }
        .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 10pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          BECERİ EDİNİM RAPORU (E-OKUL DÖNEM SONU GELİŞİM BELGESİ)
        </div>
        <table>
          <tr><td><b>Öğrencinin Adı Soyadı:</b> ${activeStudent.name}</td><td><b>Yaş / Ay:</b> ${activeStudent.ageMonth}</td></tr>
          <tr><td><b>Okul Adı:</b> ${schoolName}</td><td><b>Dönem:</b> ${term}</td></tr>
          <tr><td colspan='2'><b>Sınıf Öğretmeni:</b> ${teacherName}</td></tr>
        </table>
        <table>
          <thead>
            <tr>
              <th style='width: 25%'>Öğrenme Alanı / Boyut</th>
              <th style='width: 75%'>Süreç Odaklı Beceri Edinim Düzeyi ve Kazanım Gözlemleri</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><b>Türkçe Alanı</b></td><td>${activeStudent.turkce}</td></tr>
            <tr><td><b>Matematik Alanı</b></td><td>${activeStudent.matematik}</td></tr>
            <tr><td><b>Fen Alanı</b></td><td>${activeStudent.fen}</td></tr>
            <tr><td><b>Sosyal Alan</b></td><td>${activeStudent.sosyal}</td></tr>
            <tr><td><b>Hareket ve Sağlık</b></td><td>${activeStudent.hareketSaglik}</td></tr>
            <tr><td><b>Sanat Alanı</b></td><td>${activeStudent.sanat}</td></tr>
            <tr><td><b>Müzik Alanı</b></td><td>${activeStudent.muzik}</td></tr>
            <tr><td><b>Sosyal-Duygusal &amp; Değerler</b></td><td>${activeStudent.sdbDegerler}</td></tr>
            <tr><td><b>Öğretmen Genel Kanaati</b></td><td>${activeStudent.teacherOpinion}</td></tr>
          </tbody>
        </table>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Onay<br/>İmza / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEB_Beceri_Edinim_Raporu_${activeStudent.name.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = students.map((s, index) => ({
      no: index + 1,
      name: s.name,
      ageMonth: s.ageMonth,
      turkce: s.turkce,
      matematik: s.matematik,
      fen: s.fen,
      sosyal: s.sosyal,
      hareketSaglik: s.hareketSaglik,
      sanat: s.sanat,
      muzik: s.muzik,
      sdbDegerler: s.sdbDegerler,
      teacherOpinion: s.teacherOpinion,
    }));

    await exportOfficialTableToExcel({
      fileName: `MEB_Beceri_Edinim_Raporlari_${term.replace(/\s+/g, "_")}`,
      sheetName: "Beceri Edinim",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — OKUL ÖNCESİ BECERİ EDİNİM RAPORLARI (E-OKUL MATRİSİ)",
      subtitle: `${schoolName} · ${term} · Değerlendiren Öğretmen: ${teacherName}`,
      metadata: [
        { label: "Okul", value: schoolName },
        { label: "Dönem", value: term },
        { label: "Öğretmen", value: teacherName },
        { label: "Kapsanan Öğrenci", value: `${students.length} Öğrenci` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenci Adı Soyadı", key: "name", width: 22, align: "left" },
        { header: "Yaş", key: "ageMonth", width: 10, align: "center" },
        { header: "Türkçe Alan Becerileri", key: "turkce", width: 35, align: "left" },
        { header: "Matematik Alan Becerileri", key: "matematik", width: 35, align: "left" },
        { header: "Fen Alan Becerileri", key: "fen", width: 35, align: "left" },
        { header: "Sosyal Alan Becerileri", key: "sosyal", width: 35, align: "left" },
        { header: "Hareket ve Sağlık", key: "hareketSaglik", width: 35, align: "left" },
        { header: "Sanat Alan Becerileri", key: "sanat", width: 35, align: "left" },
        { header: "Müzik Alan Becerileri", key: "muzik", width: 35, align: "left" },
        { header: "Sosyal-Duygusal & Değerler", key: "sdbDegerler", width: 35, align: "left" },
        { header: "Öğretmen Genel Kanaati", key: "teacherOpinion", width: 40, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  const domainFields: { key: keyof StudentReportData; label: string; icon: string }[] = [
    { key: "turkce", label: "Türkçe Alan Becerileri", icon: "📖" },
    { key: "matematik", label: "Matematik Alan Becerileri", icon: "🔢" },
    { key: "fen", label: "Fen Alan Becerileri", icon: "🔬" },
    { key: "sosyal", label: "Sosyal Alan Becerileri", icon: "🌍" },
    { key: "hareketSaglik", label: "Hareket ve Sağlık Becerileri", icon: "🏃" },
    { key: "sanat", label: "Sanat Alan Becerileri", icon: "🎨" },
    { key: "muzik", label: "Müzik Alan Becerileri", icon: "🎵" },
    { key: "sdbDegerler", label: "Sosyal-Duygusal ve Değerler", icon: "🤝" },
    { key: "teacherOpinion", label: "Öğretmenin Genel Gelişim Kanaati", icon: "✍️" },
  ];

  return (
    <div className="official-form-container">
      {/* Header Actions (No Print) */}
      <div className="of-actions-bar no-print">
        <div className="of-actions-bar__left">
          <span className="of-tag of-tag--gold">TTKB s. 110</span>
          <span className="of-tag of-tag--navy">Sonuç Odaklı Değerlendirme</span>
          <span className="of-tag of-tag--emerald">e-Okul Beceri Edinim Raporu</span>
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
          <button type="button" className="of-btn of-btn--gold" onClick={handleCopyAllForEOkul}>
            {copiedField === "all" ? "✓ Kopyalandı!" : "📋 e-Okul İçin Tümünü Kopyala"}
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

      {/* Student Selector Bar (No Print) */}
      <div className="of-card no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ fontWeight: "700", color: "#1e3a8a", fontSize: "0.9rem" }}>
              Öğrenci Seçin:
            </label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {students.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`of-chip ${s.id === selectedStudentId ? "is-selected" : ""}`}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  {s.name} ({s.ageMonth})
                </button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            💡 Her alanın yanındaki <strong>[Kopyala]</strong> butonu ile e-Okul alanına doğrudan yapıştırabilirsiniz.
          </span>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="official-a4-sheet">
        <div className="of-sheet-header">
          <div className="of-sheet-header__emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 className="of-sheet-header__title">
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI
          </h1>
          <h2 className="of-sheet-header__subtitle">
            BECERİ EDİNİM RAPORU (DÖNEM SONU E-OKUL GELİŞİM DEĞERLENDİRMESİ)
          </h2>
          <div className="of-sheet-header__ref">
            Mevzuat Dayanağı: MEB TTKB Okul Öncesi Eğitim Programı, Sayfa 110
          </div>
        </div>

        {/* Identity Table */}
        <table className="of-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "20%" }}><strong>Öğrencinin Adı Soyadı:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={activeStudent.name}
                  onChange={e => handleUpdateField("name", e.target.value)}
                />
              </td>
              <td style={{ width: "20%" }}><strong>Yaş / Ay Düzeyi:</strong></td>
              <td style={{ width: "30%" }}>
                <input
                  type="text"
                  className="of-input"
                  value={activeStudent.ageMonth}
                  onChange={e => handleUpdateField("ageMonth", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Eğitim-Öğretim Yılı / Dönem:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                />
              </td>
              <td><strong>Sınıf Öğretmeni:</strong></td>
              <td>
                <input
                  type="text"
                  className="of-input"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Skills Evaluation Table */}
        <table className="of-data-table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Öğrenme Alanı / Süreç Boyutu</th>
              <th style={{ width: "72%" }}>Beceri Edinim Düzeyi ve Gözlem Kanaati</th>
            </tr>
          </thead>
          <tbody>
            {domainFields.map(domain => (
              <tr key={domain.key}>
                <td style={{ verticalAlign: "top" }}>
                  <div style={{ fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{domain.icon}</span>
                    <span>{domain.label}</span>
                  </div>
                  <div className="no-print" style={{ marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyField(domain.key, String(activeStudent[domain.key]))}
                      style={{
                        background: copiedField === domain.key ? "#dcfce7" : "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "0.75rem",
                        color: copiedField === domain.key ? "#16a34a" : "#475569",
                        cursor: "pointer",
                      }}
                      title="e-Okul alanına yapıştırmak için kopyala"
                    >
                      {copiedField === domain.key ? "✓ Kopyalandı" : "📋 Kopyala"}
                    </button>
                  </div>
                </td>
                <td>
                  <textarea
                    className="of-textarea"
                    rows={2}
                    value={String(activeStudent[domain.key])}
                    onChange={e => handleUpdateField(domain.key, e.target.value)}
                    style={{ fontSize: "0.85rem" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="of-signatures-grid" style={{ marginTop: "2rem" }}>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Sınıf Öğretmeni</span>
            <span className="of-signature-block__name">{teacherName}</span>
            <span className="of-signature-block__sign">İmza</span>
          </div>
          <div className="of-signature-block">
            <span className="of-signature-block__title">Okul Müdürü</span>
            <span className="of-signature-block__name">İnceleme ve Onay</span>
            <span className="of-signature-block__sign">Mühür / İmza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
