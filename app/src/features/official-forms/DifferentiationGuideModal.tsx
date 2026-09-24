import { useOfficialFormState } from "./OfficialFormRecordProvider.tsx";
import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import React, { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface DifferentiationStrategy {
  id: string;
  domain: string;
  domainCode: string;
  supportStrategies: {
    adaptationTitle: string;
    actionSteps: string[];
    materialHint: string;
    familyRecommendation: string;
  };
  enrichmentStrategies: {
    adaptationTitle: string;
    actionSteps: string[];
    materialHint: string;
    familyRecommendation: string;
  };
}

const OFFICIAL_DIFFERENTIATION_MATRIX: DifferentiationStrategy[] = [
  {
    id: "diff-1",
    domain: "Türkçe & Erken Okuryazarlık Becerileri",
    domainCode: "DAB / EOB",
    supportStrategies: {
      adaptationTitle: "Görsel Destekli Adım Adım İfade & Ses Farkındalığı",
      actionSteps: [
        "Yönergeleri tek cümlelik, kısa ve somut adımlarla veriniz.",
        "Hikaye anlatırken kukla, görsel kart veya somut nesnelerle destekleyiniz.",
        "Akran eşleştirmesi ile 'anlat-dinle' ikili sohbet çemberleri kurunuz.",
        "Kendi hızında konuşabilmesi için ek bekleme süresi tanıyınız.",
      ],
      materialHint: "Resimli iletişim kartları (PECS), duygu yüzleri, parmak kuklaları.",
      familyRecommendation: "Evde her akşam bol resimli 1 masal kitabı okuyup 'Sence sonra ne oldu?' gibi basit sorularla konuşmaya teşvik ediniz.",
    },
    enrichmentStrategies: {
      adaptationTitle: "Kendi Hikayesini Resmetme, Yazma & Drama ile Sunma",
      actionSteps: [
        "Hikayenin sonunu alternatif olarak yeniden kurgulamasını isteyiniz.",
        "Sınıf arkadaşlarına kendi uydurduğu masalı anlatması için liderlik veriniz.",
        "Kitap merkezinde kelime avı ve harf-ses benzeşimi oyunları kurgulayınız.",
      ],
      materialHint: "Boş hikaye defterleri, çizgi roman şablonları, ses kayıt cihazı.",
      familyRecommendation: "Çocuğunuzun anlattığı masalları birlikte bir deftere yazarak kendi aile kitabınızı oluşturunuz.",
    },
  },
  {
    id: "diff-2",
    domain: "Matematiksel Düşünme Becerileri",
    domainCode: "MAB",
    supportStrategies: {
      adaptationTitle: "Somut Nesnelerle Sayma, Eşleme & Dokunsal Sayı Kartları",
      actionSteps: [
        "Sayıları ve miktarları soyut çizim yerine ceviz, düğme, boncuk ile saydırınız.",
        "1-5 arası sayılarda 1'e 1 eşleme modelini parmak temasını kullanarak pekiştiriniz.",
        "Geometrik şekilleri dokunarak hissedeceği zımpara kağıdı kartlarla tanıtınız.",
      ],
      materialHint: "Büyük ahşap sayma pulları, yumurta kolisi ile gruplama kutusu.",
      familyRecommendation: "Yemek masasını hazırlarken '3 kaşık getirir misin?' gibi günlük yaşam sayma görevleri veriniz.",
    },
    enrichmentStrategies: {
      adaptationTitle: "Karmaşık Örüntüler (A-B-B-C), Kodlama & Ölçüm Problemleri",
      actionSteps: [
        "3 ve 4 öğeli ritmik örüntüler kurgulatıp sınıfın tahmin etmesini sağlayınız.",
        "Standart olmayan ölçme araçlarıyla (adım, karış, pipet) sınıfın boyutlarını haritalandırınız.",
        "İkili mantık grafikleri ve nesne gruplama matrisleri tasarlatınız.",
      ],
      materialHint: "Tangram, geometrik örüntü blokları, ölçüm şeritleri, mantık tabloları.",
      familyRecommendation: "Evde legolarla renk ve boyut örüntüleri oluşturup aradaki gizli kuralı bulma oyunu oynayınız.",
    },
  },
  {
    id: "diff-3",
    domain: "Fen ve Bilimsel Keşif Becerileri",
    domainCode: "FAB",
    supportStrategies: {
      adaptationTitle: "Duyusal Keşif & Çoklu Duyu İstasyonları",
      actionSteps: [
        "Doğa olaylarını doğrudan dokunma, koklama ve dinleme yoluyla deneyimletiniz.",
        "Büyüteç kullanımında el-göz koordinasyonuna fiziksel rehberlik ediniz.",
        "Basit sebep-sonuç ilişkilerini (ıslak-kuru, sıcak-soğuk) net zıtlıklarla gösteriniz.",
      ],
      materialHint: "Duyusal keşif havuzu (pirinç, fasulye, su), kırılmaz büyüteç, dokunma torbaları.",
      familyRecommendation: "Balkonda veya saksıda birlikte bir tohum ekip büyümesini günlük olarak sulayarak gözlemleyiniz.",
    },
    enrichmentStrategies: {
      adaptationTitle: "Hipotez Kurma, Deney Defteri & Doğa Bilimcisi Rolü",
      actionSteps: [
        "'Sence bu cisim suda batar mı, yüzer mi? Neden?' sorusuyla hipotez kurdurunuz.",
        "Fen merkezinde gözlemlediği böcek ve bitkilerin detaylı çizim günlüğünü tutturunuz.",
        "Merkezlerde arkadaşlarına deney adımlarını gösteren küçük bilim insanı görevi veriniz.",
      ],
      materialHint: "Gerçek mikroskop/dijital büyüteç, deney tüpleri, doğa keşif çantası.",
      familyRecommendation: "Doğa yürüyüşlerinde yanınıza bir not defteri alıp farklı kuş ve ağaç türlerini listeleyiniz.",
    },
  },
  {
    id: "diff-4",
    domain: "Hareket ve Sağlık Becerileri (Büyük/Küçük Motor)",
    domainCode: "HAB",
    supportStrategies: {
      adaptationTitle: "Aşamalı Motor Görevler, Genişletilmiş Çizgi & Yumuşak Araçlar",
      actionSteps: [
        "Makas kullanımında yaylı destekli makaslar ve hamur kesme alıştırması yaptırınız.",
        "Denge tahtasında yürürken yanından destek verip adım mesafesini kısaltınız.",
        "Geniş gövdeli ergonomik boya kalemleri ve parmak boyası tercih ediniz.",
      ],
      materialHint: "Yaylı antrenman makası, oyun hamuru, denge minderleri, fasulye torbaları.",
      familyRecommendation: "Evde çorapları eşleştirip sepete basket atma, mandalları ipe dizme gibi eğlenceli parmak oyunları oynayınız.",
    },
    enrichmentStrategies: {
      adaptationTitle: "Çok Basamaklı Engel Parkuru & Koordinasyon Kaptanlığı",
      actionSteps: [
        "Zıplama, sürünme, tırmanma ve top sürmeyi içeren karmaşık parkurlar tasarlatınız.",
        "Beden perküsyonu ve karmaşık ritim hareketlerinde ritim şefi rolü veriniz.",
        "Origami (kağıt katlama) ve minyatür model inşası gibi hassas motor görevleri sununuz.",
      ],
      materialHint: "Jonglör eşarpları, koordinasyon merdiveni, origami kağıtları.",
      familyRecommendation: "Parkta tırmanma duvarı, bisiklet/scooter parkurlarında yön ve refleks oyunları deneyiniz.",
    },
  },
  {
    id: "diff-5",
    domain: "Sosyal-Duygusal Beceriler & Birlikte Yaşama",
    domainCode: "SAB / SDB",
    supportStrategies: {
      adaptationTitle: "Sakinleşme Köşesi, Sıra Alma Görseli & Duygu Aynası",
      actionSteps: [
        "Öfke ve hayal kırıklığı anlarında sakinleşme köşesindeki duygu minderini kullanınız.",
        "Sıra bekleme süreçlerinde kum saati veya görsel süre sayacı kullanınız.",
        "Arkadaşına duygu ifade etmesi için kalıp cümleler ('Benimle oynar mısın?') fısıldayınız.",
      ],
      materialHint: "Sıvı zamanlayıcı (kum saati), stres topu, sakinleşme şişesi, duygu aynası.",
      familyRecommendation: "Evde çocuğun duygularını isimlendiriniz ('Şu an biraz öfkeli hissediyorsun, seni anlıyorum').",
    },
    enrichmentStrategies: {
      adaptationTitle: "Akran Arabuluculuğu, Çözüm Çemberi Liderliği",
      actionSteps: [
        "Küçük anlaşmazlıklarda 'Sence her iki tarafı da mutlu edecek çözüm ne olabilir?' diye sorunuz.",
        "Grup projelerinde iş bölümü yapma ve arkadaşlarını teşvik etme sorumluluğu veriniz.",
        "Farklı kültürler, empati ve yardımlaşma projelerinde öncü rol tanıyınız.",
      ],
      materialHint: "Barış çubuğu / konuşma taşı, işbirliği panosu.",
      familyRecommendation: "Ailecek bir sosyal sorumluluk etkinliği (kuşlara yem bırakma, komşuya selam verme) planlayınız.",
    },
  },
];

interface Props {
  onClose?: () => void;
}

export function DifferentiationGuideModal({ onClose }: Props) {
  const [selectedDomainId, setSelectedDomainId] = useState<string>("diff-1");
  const [targetStudentName, setTargetStudentName] = useOfficialFormState<string>("targetStudentName", "");
  const [customTeacherNote, setCustomTeacherNote] = useOfficialFormState<string>("customTeacherNote",
    "Öğrencinin görsel odaklanma becerisi güçlüdür; sözel yönergelerin somut materyal ve görsellerle desteklenmesi motivasyonunu doğrudan artırmaktadır."
  );

  const activeStrategy = OFFICIAL_DIFFERENTIATION_MATRIX.find((s) => s.id === selectedDomainId) || OFFICIAL_DIFFERENTIATION_MATRIX[0];

  const handlePrint = () => {
    printOfficialFormA4(`Bireysel_Farklilastirma_Tutanagi_${targetStudentName.replace(/\s+/g, "_")}`);
  };

  const handleDownloadDoc = () => downloadOfficialFormWord("DifferentiationGuideModal");

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = OFFICIAL_DIFFERENTIATION_MATRIX.flatMap((d, index) => [
      {
        no: `${index + 1}.1`,
        domain: d.domain,
        domainCode: d.domainCode,
        strategyType: "Destekleme (Özel Gereksinim & Destek)",
        title: d.supportStrategies.adaptationTitle,
        actionSteps: d.supportStrategies.actionSteps.join("\n"),
        materialHint: d.supportStrategies.materialHint,
        familyRecommendation: d.supportStrategies.familyRecommendation,
      },
      {
        no: `${index + 1}.2`,
        domain: d.domain,
        domainCode: d.domainCode,
        strategyType: "Zenginleştirme (İleri Düzey & Yetenek)",
        title: d.enrichmentStrategies.adaptationTitle,
        actionSteps: d.enrichmentStrategies.actionSteps.join("\n"),
        materialHint: d.enrichmentStrategies.materialHint,
        familyRecommendation: d.enrichmentStrategies.familyRecommendation,
      },
    ]);

    await exportOfficialTableToExcel({
      fileName: `MEB_Farklilastirma_ve_BEP_Kilavuzu_${targetStudentName.replace(/\s+/g, "_")}`,
      sheetName: "Farklılaştırma Kılavuzu",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — BİREYSELLEŞTİRİLMİŞ FARKLILAŞTIRMA VE UYARLAMA REHBERİ",
      subtitle: `Öğrenci: ${targetStudentName} · TTKB Sayfa 105–108 Zenginleştirme ve Destekleme Standartları`,
      metadata: [
        { label: "Öğrenci", value: targetStudentName },
        { label: "Öğretmen Notu", value: customTeacherNote },
        { label: "Kapsanan Alan", value: `${OFFICIAL_DIFFERENTIATION_MATRIX.length} Öğrenme Alanı` },
      ],
      columns: [
        { header: "No", key: "no", width: 8, align: "center" },
        { header: "Öğrenme Alanı", key: "domain", width: 25, align: "left" },
        { header: "Alan Kodu", key: "domainCode", width: 14, align: "center" },
        { header: "Farklılaştırma Türü", key: "strategyType", width: 28, align: "left" },
        { header: "Uyarlama Başlığı", key: "title", width: 35, align: "left" },
        { header: "Uygulama Adımları & Stratejiler", key: "actionSteps", width: 50, align: "left" },
        { header: "Tavsiye Materyaller", key: "materialHint", width: 35, align: "left" },
        { header: "Aileye Ev Tavsiyesi", key: "familyRecommendation", width: 40, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK VE EYLEMLER */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#4338ca", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚡</span>
            <span>Bireyselleştirilmiş Farklılaştırma & BEP Kılavuzu</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB s. 105–108 Zenginleştirme ve Destekleme Standartları | Her çocuk için tek tıkla pedagojik uyarlama
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleDownloadExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: "#15803d",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <span>📊</span>
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleDownloadDoc}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <span>💾</span>
            <span>Word (.docx) İndir</span>
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <span>🖨️</span>
            <span>A4 Plan Yazdır</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "7px 12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Kapat
            </button>
          )}
        </div>
      </div>

      {/* KONTROL ALANI: ÖĞRENCİ VE ALAN SEÇİMİ */}
      <div className="print-hidden" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", margin: "14px 0", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            Öğrenci Adı Soyadı:
          </label>
          <input
            type="text"
            readOnly title="Çocuk profilindeki kayıtlı bilgi" value={targetStudentName}
            onChange={(e) => setTargetStudentName(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
            placeholder="Örn: Ali Yılmaz"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            Gelişim ve Öğrenme Alanı:
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {OFFICIAL_DIFFERENTIATION_MATRIX.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedDomainId(s.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "16px",
                  border: selectedDomainId === s.id ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                  background: selectedDomainId === s.id ? "#e0e7ff" : "#ffffff",
                  color: selectedDomainId === s.id ? "#3730a3" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                {s.domainCode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* A4 BASKI FORMU MİZANPAJI */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "24px",
          color: "#1e293b",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* RESMÎ BAŞLIK */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #4f46e5", paddingBottom: "14px", marginBottom: "18px" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · TÜRKİYE YÜZYILI MAARİF MODELİ
          </div>
          <h1 style={{ margin: "4px 0 2px 0", fontSize: "1.35rem", color: "#3730a3", fontWeight: 800 }}>
            Bireyselleştirilmiş Farklılaştırma (Zenginleştirme ve Destekleme) Planı
          </h1>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Okul Öncesi Eğitim Programı Sayfa 105–108 Standartları
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px", fontSize: "0.88rem", fontWeight: 600 }}>
            <span style={{ background: "#f1f5f9", padding: "2px 10px", borderRadius: "12px", color: "#1e293b" }}>
              👤 Öğrenci: <strong>{targetStudentName}</strong>
            </span>
            <span style={{ background: "#e0e7ff", padding: "2px 10px", borderRadius: "12px", color: "#3730a3" }}>
              🎯 Alan: <strong>{activeStrategy.domain} ({activeStrategy.domainCode})</strong>
            </span>
          </div>
        </div>

        {/* 2 SÜTUNLU DESTEKLEME & ZENGİNLEŞTİRME KARTLARI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
          {/* DESTEKLEME KARTI */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderLeft: "6px solid #3b82f6",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🌱</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e40af", fontWeight: 800 }}>
                  DESTEKLEME STRATEJİLERİ
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 600 }}>
                  Gelişimsel Destek & BEP Gereksinimi Olan Çocuklar
                </span>
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", marginBottom: "10px", border: "1px solid #dbeafe" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e40af", marginBottom: "4px" }}>
                Pedagojik Uyarlama Odağı:
              </div>
              <div style={{ fontSize: "0.85rem", color: "#1e3a8a", fontWeight: 600 }}>
                {activeStrategy.supportStrategies.adaptationTitle}
              </div>
            </div>

            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e40af", marginBottom: "6px" }}>
              Süreçte Uygulanacak Somut Adımlar:
            </div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: "18px", fontSize: "0.82rem", color: "#1e293b", lineHeight: 1.5 }}>
              {activeStrategy.supportStrategies.actionSteps.map((step, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {step}
                </li>
              ))}
            </ul>

            <div style={{ background: "#dbeafe", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#1e40af", marginBottom: "8px" }}>
              📦 <strong>Önerilen Materyal:</strong> {activeStrategy.supportStrategies.materialHint}
            </div>

            <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#1e3a8a", borderLeft: "3px solid #60a5fa" }}>
              🏡 <strong>Veliye Ev Tavsiyesi:</strong> {activeStrategy.supportStrategies.familyRecommendation}
            </div>
          </div>

          {/* ZENGİNLEŞTİRME KARTI */}
          <div
            style={{
              background: "#fdf4ff",
              border: "1px solid #f5d0fe",
              borderLeft: "6px solid #d946ef",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🚀</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#86198f", fontWeight: 800 }}>
                  ZENGİNLEŞTİRME STRATEJİLERİ
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#c026d3", fontWeight: 600 }}>
                  Hızlı Öğrenen & İleri Düzey Yetenekli Çocuklar
                </span>
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", marginBottom: "10px", border: "1px solid #fae8ff" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#86198f", marginBottom: "4px" }}>
                Pedagojik Zenginleştirme Odağı:
              </div>
              <div style={{ fontSize: "0.85rem", color: "#701a75", fontWeight: 600 }}>
                {activeStrategy.enrichmentStrategies.adaptationTitle}
              </div>
            </div>

            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#86198f", marginBottom: "6px" }}>
              Süreçte Uygulanacak Derinleştirme Adımları:
            </div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: "18px", fontSize: "0.82rem", color: "#1e293b", lineHeight: 1.5 }}>
              {activeStrategy.enrichmentStrategies.actionSteps.map((step, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {step}
                </li>
              ))}
            </ul>

            <div style={{ background: "#fae8ff", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#86198f", marginBottom: "8px" }}>
              📦 <strong>Önerilen Materyal:</strong> {activeStrategy.enrichmentStrategies.materialHint}
            </div>

            <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#701a75", borderLeft: "3px solid #e879f9" }}>
              🏡 <strong>Veliye Ev Tavsiyesi:</strong> {activeStrategy.enrichmentStrategies.familyRecommendation}
            </div>
          </div>
        </div>

        {/* ÖĞRETMENİN BİREYSEL GÖZLEM VE UYARLAMA NOTU */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
            📝 Öğretmenin Bireysel Gözlem ve Eylem Notu:
          </div>
          <textarea
            value={customTeacherNote}
            onChange={(e) => setCustomTeacherNote(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              lineHeight: 1.4,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* İMZA VE DENETİM BÖLÜMÜ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderTop: "1px solid #cbd5e1", paddingTop: "14px", fontSize: "0.82rem", color: "#475569" }}>
          <div>
            <strong>Okul Öncesi Öğretmeni</strong>
            <div style={{ marginTop: "30px", fontWeight: 700, color: "#1e293b" }}>......................... (İmza)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Okul Müdürü / Rehberlik Servisi</strong>
            <div style={{ marginTop: "30px", fontWeight: 700, color: "#1e293b" }}>Uygundur (İmza / Mühür)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
