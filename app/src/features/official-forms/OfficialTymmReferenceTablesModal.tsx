import React, { useState } from "react";
import "./official-forms.css";

interface Props {
  onClose?: () => void;
}

export function OfficialTymmReferenceTablesModal({ onClose }: Props) {
  const [selectedSubTab, setSelectedSubTab] = useState<"ek11" | "ek12" | "ek13" | "ek14">("ek11");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handlePrint = () => window.print();

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable" style={{ maxWidth: "1150px" }}>
        {/* Top actions */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>Resmî TYMM Referans Tabloları (EK-11, EK-12, EK-13, EK-14)</strong>
            <small>Talim ve Terbiye Kurulu Başkanlığı Müfredat Kataloğu</small>
          </div>
          <div className="official-form-actions__buttons">
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır
            </button>
            {onClose && (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            )}
          </div>
        </div>

        {/* Sub Navigation (No Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "8px",
            background: "#f1f5f9",
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "16px",
            overflowX: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedSubTab("ek11")}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "6px",
              border: selectedSubTab === "ek11" ? "1px solid #0284c7" : "1px solid #cbd5e1",
              background: selectedSubTab === "ek11" ? "#0284c7" : "#ffffff",
              color: selectedSubTab === "ek11" ? "#ffffff" : "#1e293b",
              fontWeight: selectedSubTab === "ek11" ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🧠 EK-11 Sosyal-Duygusal Beceriler (s. 193)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab("ek12")}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "6px",
              border: selectedSubTab === "ek12" ? "1px solid #0284c7" : "1px solid #cbd5e1",
              background: selectedSubTab === "ek12" ? "#0284c7" : "#ffffff",
              color: selectedSubTab === "ek12" ? "#ffffff" : "#1e293b",
              fontWeight: selectedSubTab === "ek12" ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            💎 EK-12 Erdem: Değer-Eylem (s. 197)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab("ek13")}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "6px",
              border: selectedSubTab === "ek13" ? "1px solid #0284c7" : "1px solid #cbd5e1",
              background: selectedSubTab === "ek13" ? "#0284c7" : "#ffffff",
              color: selectedSubTab === "ek13" ? "#ffffff" : "#1e293b",
              fontWeight: selectedSubTab === "ek13" ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🌱 EK-13 Eğilimler (s. 204)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab("ek14")}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "6px",
              border: selectedSubTab === "ek14" ? "1px solid #0284c7" : "1px solid #cbd5e1",
              background: selectedSubTab === "ek14" ? "#0284c7" : "#ffffff",
              color: selectedSubTab === "ek14" ? "#ffffff" : "#1e293b",
              fontWeight: selectedSubTab === "ek14" ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            📚 EK-14 Okuryazarlık Becerileri (s. 205)
          </button>
        </div>

        {/* Content Area */}
        {selectedSubTab === "ek11" && (
          <div>
            <header className="official-form-header">
              <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
              <h1>EK-11 SOSYAL-DUYGUSAL ÖĞRENME BECERİLERİ TABLOSU (SDB)</h1>
              <p className="official-form-subtext">TTKB Okul Öncesi Eğitim Programı Sayfa 193–196</p>
            </header>
            <table className="of-table" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  <th style={{ width: "25%" }}>Beceri Grubu / Kod</th>
                  <th style={{ width: "35%" }}>Süreç Bileşeni (SB)</th>
                  <th>Okul Öncesi Göstergesi (G)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>SDB1.1. Kendini Tanıma (Öz Farkındalık)</strong><br /><small>Duygu, düşünce ve ilgi farkındalığı</small></td>
                  <td>SDB1.1.SB1. Kendine ilişkin farkındalık geliştirmek<br />SDB1.1.SB2. Duygularını tanımak ve adlandırmak</td>
                  <td>G1. Fiziksel özelliklerini ve ilgi alanlarını ifade eder.<br />G2. Temel duyguları (sevinç, üzüntü, öfke, korku) mimik ve sözle ifade eder.</td>
                </tr>
                <tr>
                  <td><strong>SDB1.2. Kendini Düzenleme (Öz Düzenleme)</strong><br /><small>Hedefe yönelik kontrol ve sabır</small></td>
                  <td>SDB1.2.SB1. Duygularını düzenlemek<br />SDB1.2.SB3. Davranışlarını düzenlemek</td>
                  <td>G1. Yoğun duygular karşısında sakinleşme stratejilerini kullanır.<br />G2. Sırasını bekler; merkezlerdeki kurallara uyar; etkinliğe odaklanır.</td>
                </tr>
                <tr>
                  <td><strong>SDB2.1. İletişim</strong><br /><small>Aktif dinleme ve nezaket dili</small></td>
                  <td>SDB2.1.SB1. Etkili dinleme ve konuşma<br />SDB2.1.SB2. Beden dilini kullanma</td>
                  <td>G1. Konuşanın yüzüne bakar; sözünü kesmeden dinler.<br />G2. Nezaket sözcüklerini (lütfen, teşekkür ederim, özür dilerim) bağlama uygun kullanır.</td>
                </tr>
                <tr>
                  <td><strong>SDB2.2. İş Birliği</strong><br /><small>Grup dinamiği ve yardımlaşma</small></td>
                  <td>SDB2.2.SB1. Birlikte çalışma ve paylaşma<br />SDB2.2.SB2. Ortak hedefe odaklanma</td>
                  <td>G1. Grup oyunlarında materyalleri arkadaşlarıyla paylaşır.<br />G2. Görev dağılımına uyum sağlar; arkadaşına yardım teklif eder.</td>
                </tr>
                <tr>
                  <td><strong>SDB2.3. Sosyal Farkındalık</strong><br /><small>Empati ve çeşitliliğe saygı</small></td>
                  <td>SDB2.3.SB1. Başkalarının duygularını anlama<br />SDB2.3.SB2. Bireysel farklılıklara saygı</td>
                  <td>G1. Üzülen veya sevinen arkadaşının duygusunu fark eder.<br />G2. Farklı özelliklere sahip çocuklara anlayış ve saygıyla yaklaşır.</td>
                </tr>
                <tr>
                  <td><strong>SDB3.1. Uyum</strong><br /><small>Yeni ortamlara ve kurallara esneklik</small></td>
                  <td>SDB3.1.SB1. Değişen koşullara uyum sağlama</td>
                  <td>G1. Etkinlik veya merkez geçişlerinde yönlendirmelere kolayca ayak uydurur.</td>
                </tr>
                <tr>
                  <td><strong>SDB3.3. Sorumlu Karar Verme</strong><br /><small>Seçimlerinin sonucunu görebilme</small></td>
                  <td>SDB3.3.SB1. Seçenekleri değerlendirme ve karar alma</td>
                  <td>G1. Kendi yapacağı etkinliği veya oyun merkezini bilinçli şekilde seçer.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedSubTab === "ek12" && (
          <div>
            <header className="official-form-header">
              <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
              <h1>EK-12 ERDEM: DEĞER-EYLEM TABLOLARI (20 RESMÎ DEĞER)</h1>
              <p className="official-form-subtext">TTKB Okul Öncesi Eğitim Programı Sayfa 197–203</p>
            </header>
            <table className="of-table" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#fef3c7", color: "#92400e" }}>
                  <th style={{ width: "20%" }}>Değer (D)</th>
                  <th style={{ width: "35%" }}>Resmî Eylem Tanımı</th>
                  <th>Okul Öncesi Sınıf İçi Yaklaşım &amp; Yöntem</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><b>D1. ADALET</b></td><td>D1.1. Hak ve özgürlüklerini bilmek ve korumak<br />D1.2. Hakkaniyetli davranmak</td><td>Oyunlarda ve materyal kullanımında eşit sıra alma; haksızlık karşısında itiraz edebilme.</td></tr>
                <tr><td><b>D2. AİLE BÜTÜNLÜĞÜ</b></td><td>D2.1. Aile içi dayanışma<br />D2.2. Aile içi iletişimi güçlendirmek</td><td>Aile bireylerinin meslekleri, evdeki sorumluluklar ve sevgi bağları sohbetleri.</td></tr>
                <tr><td><b>D3. ÇALIŞKANLIK</b></td><td>D3.1. Azimli olmak<br />D3.2. Planlı olmak<br />D3.3. Araştırmacı olmak</td><td>Başladığı boyama veya kule inşaatını bitirme; merkezdeki materyalleri toplama.</td></tr>
                <tr><td><b>D4. DOSTLUK</b></td><td>D4.1. Arkadaşlarına destek olmak<br />D4.2. Güvene dayalı ilişkiler</td><td>Yalnız kalan arkadaşını oyuna davet etme; üzgün arkadaşına sarılma.</td></tr>
                <tr><td><b>D5. DUYARLILIK</b></td><td>D5.1. İnsana değer vermek<br />D5.2. Çevreye ve canlılara değer vermek</td><td>Sınıf bitkisini sulama; okul bahçesindeki karıncaları ezmeme; hayvanları koruma.</td></tr>
                <tr><td><b>D6. DÜRÜSTLÜK</b></td><td>D6.1. Samimi olmak<br />D6.2. Doğru ve güvenilir olmak</td><td>Yaptığı eylemi dürüstçe açıklama; arkadaşının eşyasını izinsiz almama.</td></tr>
                <tr><td><b>D7. ESTETİK</b></td><td>D7.1. Duyusal derinliği anlamak<br />D7.2. Sanatsal zevkler</td><td>Doğanın renk ve dokularını fark etme; eserini özenle sergileme.</td></tr>
                <tr><td><b>D8. MAHREMİYET</b></td><td>D8.1. Kişisel özgürlük alanını korumak</td><td>Dokunulmazlık alanlarının bilincinde olma; başkasının özel alanına saygı duyma.</td></tr>
                <tr><td><b>D9. MERHAMET</b></td><td>D9.1. Vicdanlı olmak<br />D9.2. Şefkatli olmak</td><td>Yaralanan veya ağlayan arkadaşına şefkatle yaklaşma; sokak hayvanlarına su verme.</td></tr>
                <tr><td><b>D12. SABIR</b></td><td>D12.1. Kontrollü olmak<br />D12.2. İstikrarlı olmak</td><td>Kaydırakta sıra bekleme; arkadaşının sözünü bitirmesini bekleme.</td></tr>
                <tr><td><b>D13. SAĞLIKLI YAŞAM</b></td><td>D13.1. Dengeli beslenmek<br />D13.2. Fiziksel hareket</td><td>Meyve saatinde sağlıklı yiyecekleri tercih etme; yemekten önce el yıkama.</td></tr>
                <tr><td><b>D14. SAYGI</b></td><td>D14.1. Nezaketli olmak<br />D14.2. Değerlere saygı</td><td>Sınıfa girince selam verme; bayrağa ve İstiklâl Marşı'na saygı gösterme.</td></tr>
                <tr><td><b>D15. SEVGİ</b></td><td>D15.1. Anlayışlı ve barışçıl olmak</td><td>Arkadaşlarına, ailesine ve doğaya sevgiyle sarılma; barışçıl oyun dili kurma.</td></tr>
                <tr><td><b>D16. SORUMLULUK</b></td><td>D16.1. Kendine karşı görevler<br />D16.3. Görev bilinci</td><td>Montunu askıya asma; ayakkabısını giyme; sınıf nöbetçiliği görevini yapma.</td></tr>
                <tr><td><b>D17. TASARRUF</b></td><td>D17.2. İsraftan kaçınmak</td><td>Ellerini sabunlarken musluğu kapatma; kağıt havluyu tek yaprak kullanma.</td></tr>
                <tr><td><b>D18. TEMİZLİK</b></td><td>D18.1. Kişisel bakım<br />D18.2. Ortam temizliği</td><td>Etkinlik sonrası masayı silme; yerdeki çöpleri kutuya atma; hijyen kuralları.</td></tr>
                <tr><td><b>D19. VATANSEVERLİK</b></td><td>D19.1. Millî bilinç<br />D19.2. Millî kimlik</td><td>29 Ekim, 23 Nisan coşkusu; Atatürk'ü tanıma ve sevme; Türk bayrağını koruma.</td></tr>
                <tr><td><b>D20. YARDIMSEVERLİK</b></td><td>D20.1. Cömert olmak<br />D20.2. Dayanışma</td><td>Dağılan boyaları toplamaya yardım etme; paylaşımcı olma.</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedSubTab === "ek13" && (
          <div>
            <header className="official-form-header">
              <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
              <h1>EK-13 EĞİLİMLER TABLOSU</h1>
              <p className="official-form-subtext">TTKB Okul Öncesi Eğitim Programı Sayfa 204</p>
            </header>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px" }}>
                <h3 style={{ color: "#166534", margin: "0 0 8px 0", fontSize: "0.95rem" }}>🌱 Benlik Eğilimleri (E1)</h3>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", lineHeight: "1.6" }}>
                  <li><b>E1.1. Merak:</b> Çevresini, doğayı ve nesneleri derinlemesine inceleme isteği.</li>
                  <li><b>E1.2. Bağımsızlık:</b> Kendi işini kendi yapabilme, öz güvenli eylem sergileme.</li>
                  <li><b>E1.3. Azim ve Kararlılık:</b> Zorlukla karşılaştığında vazgeçmeme, başladığı işi bitirme.</li>
                  <li><b>E1.4. Kendine İnanma (Öz Yeterlilik):</b> "Ben bunu yapabilirim" algısı.</li>
                  <li><b>E1.5. Kendine Güvenme (Öz Güven):</b> Duygu ve fikirlerini topluluk önünde rahatça ifade edebilme.</li>
                </ul>
              </div>

              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px" }}>
                <h3 style={{ color: "#1e40af", margin: "0 0 8px 0", fontSize: "0.95rem" }}>🤝 Sosyal Eğilimler (E2)</h3>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", lineHeight: "1.6" }}>
                  <li><b>E2.1. Empati:</b> Arkadaşının ne hissettiğini tahmin edip anlayabilme.</li>
                  <li><b>E2.2. Sorumluluk:</b> Sınıf kurallarına ve görevlerine bağlı kalma.</li>
                  <li><b>E2.3. Girişkenlik:</b> Yeni oyun başlatabilme, gruba dahil olabilme.</li>
                  <li><b>E2.4. Güven:</b> Arkadaşlarına ve öğretmenine güven duyabilme.</li>
                  <li><b>E2.5. Oyunseverlik:</b> Kurallı ve kuralsız oyunlara neşeyle katılabilme.</li>
                </ul>
              </div>

              <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "12px" }}>
                <h3 style={{ color: "#6b21a8", margin: "0 0 8px 0", fontSize: "0.95rem" }}>💡 Entelektüel Eğilimler (E3)</h3>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", lineHeight: "1.6" }}>
                  <li><b>E3.2. Odaklanma:</b> Dikkatini dağıtmadan etkinliğe yoğunlaşabilme.</li>
                  <li><b>E3.3. Yaratıcılık:</b> Malzemeleri alışılmışın dışında, özgün kurgularda kullanabilme.</li>
                  <li><b>E3.5. Açık Fikirlilik:</b> Başka çocukların alternatif fikirlerini deneyebilme.</li>
                  <li><b>E3.6. Analitiklik:</b> Neden-sonuç ilişkilerini ve örüntüleri çözümleyebilme.</li>
                  <li><b>E3.8. Soru Sorma:</b> "Neden, nasıl, ne zaman?" sorularıyla derinleşebilme.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedSubTab === "ek14" && (
          <div>
            <header className="official-form-header">
              <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
              <h1>EK-14 OKURYAZARLIK BECERİLERİ TABLOSU</h1>
              <p className="official-form-subtext">TTKB Okul Öncesi Eğitim Programı Sayfa 205–206</p>
            </header>
            <table className="of-table" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                  <th style={{ width: "25%" }}>Okuryazarlık Türü</th>
                  <th style={{ width: "35%" }}>Bütünleşik Beceri</th>
                  <th>Süreç Bileşeni (Okul Öncesi)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><b>OB1. BİLGİ OKURYAZARLIĞI</b></td><td>Bilgi İhtiyacını Fark Etme</td><td>Bilgi ihtiyacını fark etmek; bilgi türlerini (hikâye, doğa, gündelik) tanımak.</td></tr>
                <tr><td><b>OB2. DİJİTAL OKURYAZARLIK</b></td><td>Dijital Araçları Anlama</td><td>Akıllı tahta, tablet ve ses kayıt cihazlarının eğitim amaçlı olduğunu bilmek; ekran süresi sınırını kavramak.</td></tr>
                <tr><td><b>OB3. FİNANSAL OKURYAZARLIK</b></td><td>İhtiyaç ve İstek Ayrımı</td><td>İhtiyaç (beslenme, giyim) ile istek (oyuncak) arasındaki farkı kavramak; paranın değişim aracı olduğunu anlamak.</td></tr>
                <tr><td><b>OB4. GÖRSEL OKURYAZARLIK</b></td><td>Görsel İpuçlarını Okuma</td><td>Resimli kitaplardaki detayları betimlemek; piktogram ve sembolleri (tuvalet, acil çıkış, geri dönüşüm) okumak.</td></tr>
                <tr><td><b>OB5. KÜLTÜR OKURYAZARLIĞI</b></td><td>Kültürel Unsurları Tanıma</td><td>Geleneksel oyunlar, ninniler, bayramlar ve yerel motiflerin farkına varmak.</td></tr>
                <tr><td><b>OB6. VATANDAŞLIK OKURYAZARLIĞI</b></td><td>Toplumsal Kurallar</td><td>Toplumsal kuralların (sıraya girme, yere çöp atmama) farkına varmak; hak ve sorumlulukları bilmek.</td></tr>
                <tr><td><b>OB7. VERİ OKURYAZARLIĞI</b></td><td>Soru Sorma ve Basit Grafik</td><td>Sınıf yoklama grafiği, hava durumu tablosu gibi somut verileri okumak ve karşılaştırmak.</td></tr>
                <tr><td><b>OB8. SÜRDÜRÜLEBİLİRLİK</b></td><td>Doğa ve Kaynak Bilinci</td><td>Su, enerji ve gıda israfından kaçınmak; geri dönüştürülebilir atıkları ayrıştırmak.</td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "14px", fontSize: "0.72rem", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          * MEB Talim ve Terbiye Kurulu Başkanlığı Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı resmî referans tablolarıdır. Plan hazırlarken ve değerlendirme yaparken kılavuz olarak kullanılır.
        </div>
      </div>
    </div>
  );
}
