import { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

interface OutdoorInspectionItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  isChecked: boolean;
}

const DEFAULT_INSPECTION_ITEMS: OutdoorInspectionItem[] = [
  {
    id: "out-1",
    category: "Çevre ve Zemin Güvenliği",
    title: "1. Hava ve Isı Şartları Uygunluğu",
    requirement: "Aşırı fırtına, şiddetli yağış, dolu veya aşırı sıcak (>34°C) durumlarında açık hava planı gölgelik alana ya da kapalı ortama uyarlanır.",
    isChecked: true,
  },
  {
    id: "out-2",
    category: "Çevre ve Zemin Güvenliği",
    title: "2. Bahçe Çitleri ve Kapı Güvenliği",
    requirement: "Okul bahçesi sınır çitlerinde delik/açıklık bulunmadığı, ana kapının kilitli olduğu teyit edilir.",
    isChecked: true,
  },
  {
    id: "out-3",
    category: "Çevre ve Zemin Güvenliği",
    title: "3. Zemin ve Kayma/Düşme Taraması",
    requirement: "Zeminde kesici taş, kırık cam, paslı metal, derin çukur ve kaygan su birikintisi bulunmadığı denetlenir.",
    isChecked: true,
  },
  {
    id: "out-4",
    category: "Doğal Çevre ve Flora-Fauna",
    title: "4. Toksik Bitki ve Zararlı Böcek Kontrolü",
    requirement: "Çocukların temas edebileceği zehirli mantar, dikenli ot veya arı/eşek arısı kovanı kontrolü yapılır.",
    isChecked: true,
  },
  {
    id: "out-5",
    category: "İstasyon Standartları",
    title: "5. Çamur Mutfağı Hijyeni ve Materyalleri",
    requirement: "Çamur mutfağındaki kaplar, tahta kaşıklar ve doğal araçlar temiz; çatlak/kırık aletler ayrıştırılmıştır.",
    isChecked: true,
  },
  {
    id: "out-6",
    category: "İstasyon Standartları",
    title: "6. Kum Havuzu Taraması ve Kedi/Köpek İzolasyonu",
    requirement: "Kum havuzu tırmıkla taranmış, yabancı madde arındırılmış ve kullanım dışı saatlerde koruyucu brandayla örtülüdür.",
    isChecked: true,
  },
  {
    id: "out-7",
    category: "İstasyon Standartları",
    title: "7. Su Dinamiği ve Oluk İstasyonu Güvenliği",
    requirement: "Su kanallarında temiz şebeke suyu kullanılır; su birikintilerinin çamurlaşarak kayma yaratması engellenir.",
    isChecked: true,
  },
  {
    id: "out-8",
    category: "Çocuk Koruma ve Giyim",
    title: "8. Hava Şartlarına Uygun Giyim ve Yedek Kıyafet",
    requirement: "Tüm çocukların çizme/yağmurluk, mevsime uygun şapka ve sınıfta en az bir takım yedek kıyafeti mevcuttur.",
    isChecked: true,
  },
  {
    id: "out-9",
    category: "Çocuk Koruma ve Giyim",
    title: "9. Güneş Koruması ve Alerjen Önlemleri",
    requirement: "Güneşli havalarda veli izniyle güneş kremi uygulaması ve polen/toz alerjisi olan çocukların yakın takibi sağlanır.",
    isChecked: true,
  },
  {
    id: "out-10",
    category: "Acil Durum ve Lojistik",
    title: "10. Taşınabilir İlk Yardım Kiti ve İletişim",
    requirement: "Öğretmenin yanında antiseptik mendil, yara bandı, buz jeli ve okul idaresiyle acil iletişim telefonu bulunur.",
    isChecked: true,
  },
  {
    id: "out-11",
    category: "Süreç Yönetimi",
    title: "11. 3 Aşamalı Sayım (Çıkışta - Oyunda - Girişte)",
    requirement: "Bahçeye çıkarken, serbest istasyon oyunları sırasında ve içeri dönüşte eksiksiz mevcudiyet sayımı yapılır.",
    isChecked: true,
  },
  {
    id: "out-12",
    category: "Süreç Yönetimi",
    title: "12. Dönüş Hijyeni ve El Yıkama Çemberi",
    requirement: "Açık hava sonrası ayakkabı değişimi, 20 saniye köpüklü el yıkama ve günü değerlendirme çemberi işletilir.",
    isChecked: true,
  },
];

export function OfficialOutdoorGardenGuideModal({ onClose }: { onClose?: () => void }) {
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");
  const [date, setDate] = useState("2026-09-15");
  const [weatherCondition, setWeatherCondition] = useState("Güneşli / Açık (23°C)");
  const [items, setItems] = useState<OutdoorInspectionItem[]>(DEFAULT_INSPECTION_ITEMS);
  const [activeStation, setActiveStation] = useState("camur");

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isChecked: !it.isChecked } : it))
    );
  };

  const checkedCount = items.filter((i) => i.isChecked).length;
  const isAllReady = checkedCount === items.length;

  const handlePrint = () => {
    printOfficialFormA4(`Acik_Hava_ve_Doga_Guvenlik_Rehberi_${date}`);
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Acik_Hava_ve_Bahce_Guvenlik_Rehberi</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.35; }
        .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 9.5pt; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class='header'>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI<br/>
          TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI<br/>
          AÇIK HAVA, BAHÇE, ÇAMUR MUTFAĞI VE DOĞA OYUNLARI GÜVENLİK VE UYGULAMA REHBERİ
        </div>
        <table>
          <tr><td><b>Okul / Kurum Adı:</b> ${schoolName}</td><td><b>Tarih:</b> ${date}</td></tr>
          <tr><td><b>Sınıf Öğretmeni:</b> ${teacherName}</td><td><b>Hava Koşulları:</b> ${weatherCondition}</td></tr>
          <tr><td colspan='2'><b>Denetim Durumu:</b> ${checkedCount} / ${items.length} Şart Sağlandı (${isAllReady ? "BAHÇE UYGULAMASINA TAM UYGUN" : "EKSİKLER GİDERİLMELİ"})</td></tr>
        </table>
        <h4>12 Maddelik Günlük Açık Hava Güvenlik ve Hijyen Denetim Listesi (TTKB Sayfa 104–106)</h4>
        <table>
          <thead>
            <tr>
              <th style='width: 10%'>Durum</th>
              <th style='width: 25%'>Denetim Başlığı</th>
              <th style='width: 65%'>Mevzuat ve Güvenlik Standardı</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td style='text-align: center;'>[${it.isChecked ? "X" : " "}]</td>
                <td><b>${it.title}</b><br/><small>${it.category}</small></td>
                <td>${it.requirement}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br/>
        <h4>Açık Hava Pedagojisi ve Veli Bilgilendirme İlkesi</h4>
        <p><b>'Kirlenmek Öğrenmektir':</b> Doğal ortamlarda toprak, su, kum ve bitkilerle etkileşim kuran çocukların bağışıklık sistemi güçlenir; ince-kaba motor becerileri ve problem çözme kapasiteleri gelişir. Islanma ve çamurlanma öğrenme sürecinin doğal bir parçasıdır.</p>
        <br/><br/>
        <table style='border: none;'>
          <tr style='border: none;'>
            <td style='border: none; text-align: center; width: 50%;'><b>Sınıf Öğretmeni</b><br/><br/>${teacherName}<br/>İmza</td>
            <td style='border: none; text-align: center; width: 50%;'><b>Okul Müdürü</b><br/><br/>Onay / Mühür</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Acik_Hava_ve_Bahce_Guvenlik_Rehberi.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = items.map((item, index) => ({
      no: index + 1,
      category: item.category,
      title: item.title,
      requirement: item.requirement,
      status: item.isChecked ? "UYGUN [✓]" : "DİKKAT [⚠️]",
      statusScore: item.isChecked ? 1 : 0,
    }));

    await exportOfficialTableToExcel({
      fileName: `MEB_Acik_Hava_Bahce_Guvenlik_Rehberi_${date}`,
      sheetName: "Bahçe Güvenlik",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — AÇIK HAVA, BAHÇE VE DOĞA OYUNLARI GÜVENLİK REHBERİ",
      subtitle: `${schoolName} · Tarih: ${date} · Öğretmen: ${teacherName} · Hava: ${weatherCondition}`,
      metadata: [
        { label: "Okul", value: schoolName },
        { label: "Tarih", value: date },
        { label: "Öğretmen", value: teacherName },
        { label: "Hava Durumu", value: weatherCondition },
        { label: "Güvenlik Hazırlık Durumu", value: `${checkedCount}/${items.length} Standart Tamamlandı (%${Math.round((checkedCount / items.length) * 100)})` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Kategori", key: "category", width: 25, align: "left" },
        { header: "Güvenlik & Uygulama Maddesi", key: "title", width: 35, align: "left" },
        { header: "Resmî Standart & Güvenlik Şartı", key: "requirement", width: 60, align: "left" },
        { header: "Durum", key: "status", width: 16, align: "center" },
        { header: "Puan", key: "statusScore", width: 10, align: "center", isNumeric: true },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  return (
    <div className="official-form-container">
      <div className="of-action-bar no-print">
        <div className="of-action-bar__left">
          <span className="of-badge">TTKB Sayfa 104–106</span>
          <h3 className="of-action-title">Açık Hava, Bahçe &amp; Doğa Oyunları Güvenlik Rehberi</h3>
        </div>
        <div className="of-action-bar__right">
          <button
            type="button"
            className="of-btn"
            onClick={handleExportExcel}
            style={{ background: "#15803d", color: "#fff", borderColor: "#15803d" }}
          >
            📊 Excel (.xlsx)
          </button>
          <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
            🖨️ A4 Yazdır
          </button>
          <button type="button" className="of-btn of-btn--word" onClick={handleExportWord}>
            📄 Word İndir (.doc)
          </button>
          {onClose && (
            <button type="button" className="of-btn of-btn--close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="of-print-page">
        <div className="of-header-block">
          <div className="of-header-crest">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <div className="of-header-sub">TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ EĞİTİM PROGRAMI</div>
          <div className="of-header-main-title">
            AÇIK HAVA, BAHÇE, ÇAMUR MUTFAĞI VE DOĞA OYUNLARI GÜVENLİK VE UYGULAMA REHBERİ
          </div>
          <div className="of-header-meta-ref">MEB TTKB Öğrenme Ortamları İlkeleri (Sayfa 104–106)</div>
        </div>

        <div className="of-meta-grid">
          <div className="of-meta-field">
            <label className="of-meta-label">Okul / Kurum Adı:</label>
            <input
              type="text"
              className="of-meta-input"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Sınıf Öğretmeni:</label>
            <input
              type="text"
              className="of-meta-input"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Uygulama Tarihi:</label>
            <input
              type="date"
              className="of-meta-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="of-meta-field">
            <label className="of-meta-label">Hava ve Sıcaklık Durumu:</label>
            <input
              type="text"
              className="of-meta-input"
              value={weatherCondition}
              onChange={(e) => setWeatherCondition(e.target.value)}
            />
          </div>
        </div>

        {/* Readiness Bar */}
        <div
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            background: isAllReady ? "#f0fdf4" : "#fefce8",
            border: `1px solid ${isAllReady ? "#86efac" : "#fef08a"}`,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <strong style={{ color: isAllReady ? "#166534" : "#854d0e" }}>
              Açık Hava Hazırlık Durumu:{" "}
            </strong>
            <span style={{ fontSize: "1rem", fontWeight: "bold", color: isAllReady ? "#15803d" : "#a16207" }}>
              {checkedCount} / {items.length} Şart Sağlandı
            </span>
            <span style={{ marginLeft: "8px", fontSize: "0.85rem", color: isAllReady ? "#166534" : "#854d0e" }}>
              {isAllReady ? "✓ Bahçe Etkinliğine Tam Hazır" : "⚠️ Bazı Güvenlik Kontrolleri Eksik"}
            </span>
          </div>
          <button
            type="button"
            className="no-print"
            onClick={() => setItems((prev) => prev.map((it) => ({ ...it, isChecked: true })))}
            style={{
              padding: "4px 8px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Tümünü Onayla
          </button>
        </div>

        {/* 5 Outdoor Stations Navigator (No Print) */}
        <div className="no-print" style={{ margin: "14px 0" }}>
          <label className="of-meta-label">Açık Hava İstasyon Pedagojisi ve Uygulama İpuçları:</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
            {[
              { id: "camur", title: "🥣 Çamur Mutfağı & Kum", icon: "🥣" },
              { id: "su", title: "💧 Su Dinamiği & Kanallar", icon: "💧" },
              { id: "parkur", title: "🪵 Ahşap Denge & Parkur", icon: "🪵" },
              { id: "bostan", title: "🌱 Mini Doğa Bostanı", icon: "🌱" },
              { id: "sanat", title: "🎨 Doğal Sanat Çardağı", icon: "🎨" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStation(st.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: activeStation === st.id ? "2px solid #0284c7" : "1px solid #cbd5e1",
                  background: activeStation === st.id ? "#e0f2fe" : "#fff",
                  color: activeStation === st.id ? "#0369a1" : "#334155",
                  fontWeight: activeStation === st.id ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {st.title}
              </button>
            ))}
          </div>

          <div style={{ padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", marginTop: "8px", fontSize: "0.85rem", color: "#334155" }}>
            {activeStation === "camur" && (
              <p><strong>Çamur Mutfağı Pedagojisi:</strong> Toprak, su, yaprak, kozalak ve kuru dallarla ölçme (dolu-boş, ağır-hafif), karıştırma ve sembolik aşçılık oyunları. Duyusal regülasyonu destekler.</p>
            )}
            {activeStation === "su" && (
              <p><strong>Su Dinamiği İstasyonu:</strong> Eğimli ahşap kanallar, su çarkları, batma-yüzme testleri ve su taşıma koordinasyonu. Yerçekimi ve akışkanlık prensiplerini somutlaştırır.</p>
            )}
            {activeStation === "parkur" && (
              <p><strong>Ahşap Denge ve Hareket Parkuru:</strong> Kütük basamaklar, hafif eğimli tahtalar, lastik tüneller. Vestibüler sistem ve propriyoseptif derin duyu gelişimini pekiştirir.</p>
            )}
            {activeStation === "bostan" && (
              <p><strong>Mini Bostan ve Botanik Köşesi:</strong> Mevsimine uygun tohum ekimi (nane, maydanoz, fasulye), büyüteçle böcek ve yaprak damarları inceleme. Yaşayan varlıklara saygı ve sabır geliştirir.</p>
            )}
            {activeStation === "sanat" && (
              <p><strong>Doğal Sanat ve Açık Hava Çardağı:</strong> Taş boyama, çamur baskısı, yaprak sürtme tekniği ve açık havada minder üzerinde doğa masalları okuma saati.</p>
            )}
          </div>
        </div>

        {/* 12-Item Safety and Hygiene Checklist */}
        <h4 style={{ margin: "14px 0 6px 0", color: "#0f172a", fontSize: "0.95rem" }}>
          12 Maddelik Günlük Açık Hava Güvenlik ve Hijyen Denetim Çizelgesi
        </h4>
        <table className="of-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "8%", textAlign: "center" }}>Kontrol</th>
              <th style={{ width: "27%", textAlign: "left" }}>Denetim Maddesi</th>
              <th style={{ width: "65%", textAlign: "left" }}>MEB TTKB Güvenlik ve Hijyen İlkesi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                <td
                  style={{ textAlign: "center", cursor: "pointer" }}
                  onClick={() => toggleItem(it.id)}
                >
                  <input
                    type="checkbox"
                    checked={it.isChecked}
                    onChange={() => toggleItem(it.id)}
                    aria-label={it.title}
                  />
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "0.85rem" }}>
                    {it.title}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{it.category}</span>
                </td>
                <td style={{ fontSize: "0.85rem", color: "#334155", verticalAlign: "top", lineHeight: "1.35" }}>
                  {it.requirement}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Philosophy Callout */}
        <div
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            background: "#faf5ff",
            border: "1px solid #e9d5ff",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "#581c87",
            lineHeight: "1.4",
          }}
        >
          <strong>TTKB Açık Hava Felsefesi ('Kirlenmek Öğrenmektir'): </strong>
          Çocuklar yağmurda, çamurda, rüzgârda ve toprakta tüm duyularıyla dünyayı keşfeder. Doğayla temas eden çocukların stresi azalır, dikkat süresi uzar ve bağışıklık sistemi güçlenir. Islanmak ve kirlenmek temizlenebilir; ancak kaçırılan bir çocukluk doğa deneyimi telafi edilemez.
        </div>

        {/* Signatures */}
        <div className="of-signatures-row" style={{ marginTop: "24px" }}>
          <div className="of-sig-block">
            <div className="of-sig-role">Nöbetçi / Uygulayıcı Öğretmen</div>
            <div className="of-sig-name">{teacherName}</div>
            <div className="of-sig-line">İmza</div>
          </div>
          <div className="of-sig-block">
            <div className="of-sig-role">Okul Müdürü</div>
            <div className="of-sig-name">Uygundur / Denetlenmiştir</div>
            <div className="of-sig-line">Mühür ve İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
