import React, { useState } from "react";
import "./official-forms.css";

export interface DossierDocument {
  id: string;
  code: string;
  title: string;
  ttkbRef: string;
  status: "Hazır ve Dosyalandı" | "Güncelleniyor" | "Beklemede";
  note: string;
}

const DEFAULT_DOSSIER_DOCUMENTS: DossierDocument[] = [
  { id: "d-1", code: "EK-6", title: "Günlük Eğitim Planları Dosyası", ttkbRef: "s. 183–184", status: "Hazır ve Dosyalandı", note: "Günün 5 rutini ve 3 boyutlu değerlendirmeleri işlenmiş." },
  { id: "d-2", code: "EK-5", title: "Aylık Eğitim Planları Dosyası", ttkbRef: "s. 182", status: "Hazır ve Dosyalandı", note: "Eylül, Ekim ve Kasım aylık planları zümre onaylı." },
  { id: "d-3", code: "EK-15", title: "Aylık Eğitim Planı Kontrol Çizelgesi", ttkbRef: "s. 207–220", status: "Hazır ve Dosyalandı", note: "Kazanım ve kavram dağılım matrisi tam işaretli." },
  { id: "d-4", code: "EK-2", title: "Anekdot Kayıt Formları Arşivi", ttkbRef: "s. 178", status: "Hazır ve Dosyalandı", note: "Her çocuk için en az 2'şer adet objektif gözlem kaydı." },
  { id: "d-5", code: "EK-3 & EK-4", title: "Okul Dışı Öğrenme ve Güvenlik Protokolü Dosyası", ttkbRef: "s. 179–181", status: "Hazır ve Dosyalandı", note: "Mülki amir onayı, veli izin dilekçeleri ve 8 soru değerlendirmesi." },
  { id: "d-6", code: "EK-9", title: "Aile Eğitimi İhtiyaç Belirleme Formları", ttkbRef: "s. 188–189", status: "Hazır ve Dosyalandı", note: "Sene başında tüm velilerden toplanarak analiz edildi." },
  { id: "d-7", code: "EK-10", title: "Aile Katılımı Tercih Formları Dosyası", ttkbRef: "s. 190–192", status: "Hazır ve Dosyalandı", note: "Velilerin sınıf içi etkinlik ve materyal destek tercihleri." },
  { id: "d-8", code: "EK-1", title: "Alan Becerileri ve Süreç Bileşenleri İnceleme Dosyası", ttkbRef: "s. 141–177", status: "Hazır ve Dosyalandı", note: "36–72 ay 7 temel öğrenme alanı kazanım matrisi." },
  { id: "d-9", code: "GELİŞİM", title: "Dönem Sonu Gelişim Raporları (Karne) Arşivi", ttkbRef: "s. 109–114, 197", status: "Hazır ve Dosyalandı", note: "10 gelişim alanı ve öğretmen kanaatleri A4 formatında hazır." },
  { id: "d-10", code: "PORTFOLYO", title: "Öğrenci Gelişim Dosyası (Portfolyo Seçki Kataloğu)", ttkbRef: "s. 110, 177", status: "Hazır ve Dosyalandı", note: "Çocukların sanat ve 3B ürün fotoğrafları ile kendi sözleri." },
  { id: "d-11", code: "BÜLTEN", title: "Haftalık Veli Bilgilendirme ve Ev Pusulası Dosyası", ttkbRef: "s. 102–104", status: "Hazır ve Dosyalandı", note: "Haftalık kavramlar, erdemler, şarkılar ve ev etkinlikleri." },
  { id: "d-12", code: "BEP / UYARLAMA", title: "Bireyselleştirilmiş Farklılaştırma (Zenginleştirme/Destekleme) Dosyası", ttkbRef: "s. 105–108", status: "Hazır ve Dosyalandı", note: "Özel gereksinimli ve ileri düzey çocuklar için somut uyarlamalar." },
  { id: "d-13", code: "SIFIR ATIK", title: "Doğal ve Sıfır Atık Materyal Dönüşüm Çalışmaları", ttkbRef: "s. 97, 206 (OB8)", status: "Hazır ve Dosyalandı", note: "Merkezlerde kullanılan geri dönüşüm materyalleri rehberi." },
  { id: "d-14", code: "OYUN", title: "Oyun Temelli Etkinlikler ve Geleneksel Çocuk Oyunları Sandığı", ttkbRef: "s. 86–91", status: "Hazır ve Dosyalandı", note: "Kurallı ve serbest oyun kartları kütüphanesi." },
  { id: "d-15", code: "3B DEĞERLENDİRME", title: "Aylık Eğitim Planı 3 Boyutlu Değerlendirme Raporları", ttkbRef: "s. 111–114", status: "Hazır ve Dosyalandı", note: "Tablo 1 (Çocuk), Tablo 2 (Program), Tablo 3 (Öğretmen) raporları." },
  { id: "d-16", code: "REFERANS", title: "TYMM Referans Tabloları (SDB, Değerler, Eğilimler, Okuryazarlık)", ttkbRef: "EK-11..14", status: "Hazır ve Dosyalandı", note: "Erdem-Değer-Eylem ve Sosyal-Duygusal öğrenme tabloları." },
  { id: "d-17", code: "MÜLAKAT", title: "Çocukla Bireysel Görüşme (Mülakat) ve Düşünce Kayıtları", ttkbRef: "s. 109–110", status: "Hazır ve Dosyalandı", note: "Öğrencilerin kavramsal ve duygusal ifadelerinin birebir alıntı kayıtları." },
  { id: "d-18", code: "DONATIM DENETİMİ", title: "Öğrenme Merkezleri Standart Donatım ve Güvenlik Denetim Tutanağı", ttkbRef: "s. 97–104", status: "Hazır ve Dosyalandı", note: "6 öğrenme merkezinin CE, ergonomi ve güvenlik standart tutanakları." },
  { id: "d-19", code: "AİLE ETKİNLİĞİ", title: "Sınıf İçi Aile Katılımı Etkinlik Uygulama Planları", ttkbRef: "s. 94–96, EK-10", status: "Hazır ve Dosyalandı", note: "Velilerin sınıfta uyguladıkları atölye, meslek ve sanat etkinlik planları." },
  { id: "d-20", code: "SINIF MATRİSİ", title: "Sınıf Düzeyi Bütüncül Beceriler ve Eğilimler Gelişim Matrisi", ttkbRef: "s. 109–114, 140–177", status: "Hazır ve Dosyalandı", note: "Tüm sınıfın 7 alan becerisi ve 10 eğilimdeki gelişim seyrini gösteren tablo." },
  { id: "d-21", code: "BECERİ EDİNİM", title: "Beceri Edinim Raporları (e-Okul Dönem Sonu Gelişim Arşivi)", ttkbRef: "s. 110", status: "Hazır ve Dosyalandı", note: "e-Okul sistemine girilen 7 öğrenme alanı ve öğretmen kanaatleri dökümü." },
  { id: "d-22", code: "PDR & REHBERLİK", title: "Rehberlik ve Psikolojik Danışma Hizmetleri Yönlendirme ve Takip Dosyası", ttkbRef: "s. 81–84", status: "Hazır ve Dosyalandı", note: "Sosyal uyum, duygu ve üstün yetenek takibi için resmi yönlendirme formları." },
  { id: "d-23", code: "VELİ TOPLANTISI", title: "Genel Veli Toplantısı Tutanakları ve İmzalı Karar Çizelgeleri", ttkbRef: "s. 94–96", status: "Hazır ve Dosyalandı", note: "Sene başı ve sene sonu veli toplantı gündemleri, kararları ve veli imza listesi." },
  { id: "d-24", code: "DİJİTAL SÖZLEŞME", title: "Dijital Öğrenme, Ekran Süresi ve Mahremiyet Taahhütnameleri", ttkbRef: "s. 107–108", status: "Hazır ve Dosyalandı", note: "Veli imzalı 30 dk ekran süresi sınırı ve sosyal medya koruma taahhütleri." },
  { id: "d-25", code: "RUBRİK", title: "Süreç Odaklı Dereceli Puanlama Anahtarı (Gözlem Rubriği)", ttkbRef: "s. 109", status: "Hazır ve Dosyalandı", note: "7 alanda 3 düzeyli süreç odaklı performans derecelendirme arşivi." },
  { id: "d-26", code: "AÇIK HAVA", title: "Açık Hava, Bahçe ve Çamur Mutfağı Güvenlik Rehberi", ttkbRef: "s. 104–106", status: "Hazır ve Dosyalandı", note: "12 maddelik günlük açık hava hijyen/güvenlik kontrol listesi ve oyun rehberi." },
  { id: "d-27", code: "ÖZ/AKRAN", title: "Öz Değerlendirme ve Akran Değerlendirme Kartları Arşivi", ttkbRef: "s. 110", status: "Hazır ve Dosyalandı", note: "Çocukların resimli sembollerle kendi ve akran süreçlerini değerlendirme tutanakları." },
  { id: "d-28", code: "GÜNÜ DEĞERLENDİRME", title: "Günü Değerlendirme Çemberi ve Günlük Yansıtma Tutanakları", ttkbRef: "s. 92, 100–102", status: "Hazır ve Dosyalandı", note: "4 boyutlu çember yansıtması, çocuk alıntıları ve yarın hazırlık kayıtları." },
  { id: "d-29", code: "GÜNE BAŞLAMA", title: "Güne Başlama Zamanı ve Duygu Panosu Kayıtları", ttkbRef: "s. 93–94", status: "Hazır ve Dosyalandı", note: "Sabah duygu iklimi sayımı, günün mesajı ve merak sorusu tutanakları." },
  { id: "d-30", code: "BARIŞ MASASI", title: "Barış Masası ve Akran Çatışması Çözüm Protokolleri", ttkbRef: "s. 84, 108", status: "Hazır ve Dosyalandı", note: "4 adımlı onarıcı adalet, empati ve barışçıl uzlaşma tutanakları arşivi." },
  { id: "d-31", code: "ÖĞRENCİ TANIMA", title: "Sene Başı Öğrenciyi Tanıma ve Aile Bilgi Formları Arşivi", ttkbRef: "s. 193–196", status: "Hazır ve Dosyalandı", note: "Alerji, kronik rahatsızlık, acil durum ve teslim yetkili kişi tutanakları." },
  { id: "d-32", code: "BESLENME & SAĞLIK", title: "Günlük Beslenme, Öz Bakım ve Hijyen Takip Çizelgeleri", ttkbRef: "s. 92, 98", status: "Hazır ve Dosyalandı", note: "Rutin 3 besin tüketimi, su takibi ve öz bakım beceri kayıtları." }
];

interface Props {
  onClose?: () => void;
}

export function OfficialInspectionDossierModal({ onClose }: Props) {
  const [documents, setDocuments] = useState<DossierDocument[]>(DEFAULT_DOSSIER_DOCUMENTS);
  const [schoolName, setSchoolName] = useState("Denizli Maarif Anaokulu");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [className, setClassName] = useState("Papatyalar Sınıfı (5 Yaş / 60-72 Ay)");
  const [teacherName, setTeacherName] = useState("Emine Öğretmen");

  const toggleStatus = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const nextStatus =
            doc.status === "Hazır ve Dosyalandı"
              ? "Güncelleniyor"
              : doc.status === "Güncelleniyor"
              ? "Beklemede"
              : "Hazır ve Dosyalandı";
          return { ...doc, status: nextStatus };
        }
        return doc;
      })
    );
  };

  const handlePrint = () => window.print();

  const handleDownloadDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Müfettişlik Teftiş Dosyası İndeksi - ${schoolName}</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; padding: 20px; line-height: 1.4; color: #1e293b; }
        h1 { font-size: 16pt; color: #b91c1c; text-align: center; }
        .meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .meta td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9.5pt; }
        table.dossier { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.dossier th, table.dossier td { border: 1px solid #94a3b8; padding: 7px 10px; font-size: 9.5pt; text-align: left; }
        table.dossier th { background: #fee2e2; color: #991b1b; font-weight: bold; }
        .badge { font-weight: bold; color: #15803d; }
      </style>
      </head>
      <body>
        <h1>T.C. MİLLÎ EĞİTİM BAKANLIĞI</h1>
        <h2 style="text-align: center; font-size: 13pt; color: #334155;">MAARİF MÜFETTİŞLİĞİ OKUL ÖNCESİ SINIF TEFTİŞ DOSYASI İNDEKSİ</h2>
        <p style="text-align: center; font-size: 10pt; color: #64748b;">Türkiye Yüzyılı Maarif Modeli 2026 Resmî Müfredat Standartları</p>

        <table class="meta">
          <tr>
            <td><strong>Okul Adı:</strong> ${schoolName}</td>
            <td><strong>Eğitim Öğretim Yılı:</strong> ${academicYear}</td>
          </tr>
          <tr>
            <td><strong>Sınıf / Yaş Grubu:</strong> ${className}</td>
            <td><strong>Sınıf Öğretmeni:</strong> ${teacherName}</td>
          </tr>
        </table>

        <table class="dossier">
          <thead>
            <tr>
              <th style="width: 8%;">Sıra</th>
              <th style="width: 15%;">Resmî Kod</th>
              <th style="width: 32%;">Evrak / Dosya Adı</th>
              <th style="width: 15%;">TTKB Sayfa</th>
              <th style="width: 30%;">Açıklama / Durum</th>
            </tr>
          </thead>
          <tbody>
            ${documents.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${d.code}</strong></td>
                <td>${d.title}</td>
                <td>${d.ttkbRef}</td>
                <td><span class="badge">[${d.status}]</span> ${d.note}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top: 35px; display: table; width: 100%;">
          <div style="display: table-cell; width: 33%;">
            <strong>Sınıf Öğretmeni:</strong><br/><br/>
            ${teacherName} (İmza)
          </div>
          <div style="display: table-cell; width: 33%; text-align: center;">
            <strong>Okul Müdürü:</strong><br/><br/>
            İncelendi / Uygundur (İmza/Mühür)
          </div>
          <div style="display: table-cell; width: 33%; text-align: right;">
            <strong>Maarif Müfettişi:</strong><br/><br/>
            Görüldü (İmza)
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Maarif_Mufettisligi_Sinif_Teftis_Dosyasi_Indeksi.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#b91c1c", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📋</span>
            <span>Maarif Müfettişliği Resmî Sınıf Teftiş ve Evrak Dosyası İndeksi</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB 221 Sayfalık Program Denetim Standartları | 16 Resmî Matbu Evrak Kontrol Çetelesi ve Kapak
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleDownloadDoc}
            style={{
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
            💾 Word (.doc) İndir
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "7px 12px",
              background: "#b91c1c",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            🖨️ A4 Teftiş Dosyası Yazdır
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

      {/* KÜNYE BİLGİSİ */}
      <div className="print-hidden" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", margin: "14px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Okul Adı:</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Eğitim Yılı:</label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Sınıf / Şube:</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Sınıf Öğretmeni:</label>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
          />
        </div>
      </div>

      {/* CANLI A4 TEFTİŞ LİSTESİ */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #b91c1c", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · MAARİF MÜFETTİŞLİĞİ BAŞKANLIĞI
          </div>
          <h1 style={{ margin: "4px 0 2px 0", fontSize: "1.35rem", color: "#991b1b", fontWeight: 800 }}>
            Okul Öncesi Sınıf Teftiş ve Resmî Evrak Dosyası İndeksi
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı Standartları
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
            <span>🏫 {schoolName}</span>
            <span>📅 {academicYear}</span>
            <span>👩‍🏫 {teacherName} ({className})</span>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "#fef2f2", borderBottom: "2px solid #f87171" }}>
              <th style={{ padding: "8px 10px", width: "6%", textAlign: "center", color: "#991b1b" }}>No</th>
              <th style={{ padding: "8px 10px", width: "14%", textAlign: "left", color: "#991b1b" }}>Resmî Kod</th>
              <th style={{ padding: "8px 10px", width: "35%", textAlign: "left", color: "#991b1b" }}>Evrak / Klasör Adı</th>
              <th style={{ padding: "8px 10px", width: "15%", textAlign: "left", color: "#991b1b" }}>TTKB Dayanak</th>
              <th style={{ padding: "8px 10px", width: "30%", textAlign: "left", color: "#991b1b" }}>Durum / Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => (
              <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "8px 10px", fontWeight: 800, color: "#b91c1c" }}>{doc.code}</td>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{doc.title}</td>
                <td style={{ padding: "8px 10px", color: "#64748b" }}>{doc.ttkbRef}</td>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      className="print-hidden"
                      onClick={() => toggleStatus(doc.id)}
                      style={{
                        padding: "2px 6px",
                        borderRadius: "10px",
                        border: "none",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        background:
                          doc.status === "Hazır ve Dosyalandı"
                            ? "#dcfce7"
                            : doc.status === "Güncelleniyor"
                            ? "#fef3c7"
                            : "#fee2e2",
                        color:
                          doc.status === "Hazır ve Dosyalandı"
                            ? "#15803d"
                            : doc.status === "Güncelleniyor"
                            ? "#b45309"
                            : "#b91c1c",
                      }}
                    >
                      {doc.status}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#475569" }}>{doc.note}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MÜFETTİŞ VE MÜDÜR İMZA BÖLÜMÜ */}
        <div style={{ marginTop: "30px", paddingTop: "14px", borderTop: "1px solid #cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", fontSize: "0.82rem" }}>
          <div>
            <strong>Sınıf Öğretmeni:</strong>
            <div style={{ marginTop: "26px", fontWeight: 700, color: "#1e293b" }}>{teacherName} (İmza)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <strong>Okul Müdürü:</strong>
            <div style={{ marginTop: "26px", fontWeight: 700, color: "#1e293b" }}>İncelendi / Uygundur (İmza)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Maarif Müfettişi:</strong>
            <div style={{ marginTop: "26px", fontWeight: 700, color: "#1e293b" }}>Görüldü (İmza / Mühür)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
