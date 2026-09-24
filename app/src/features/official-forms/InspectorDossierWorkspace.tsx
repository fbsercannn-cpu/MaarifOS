import React, { useState } from "react";
import {
  PrinterIcon,
  FileTextIcon,
  ShieldCheckIcon,
  TableIcon,
  CheckCircleIcon,
} from "../../components/MaarifIcons";
import { printOfficialFormA4 } from "./official-form-export-service";

interface InspectorDossierWorkspaceProps {
  onClose?: () => void;
}

const DOSSIER_DOCUMENTS = [
  { no: 1, code: "EK-5", title: "Aylık Eğitim Planı (Tüm Aylar Cildi)", category: "Planlama", pages: "18 Sayfa", status: "Hazır" },
  { no: 2, code: "EK-6", title: "Günlük Eğitim Akışı ve Etkinlik Planları (Külliyat)", category: "Planlama", pages: "180 Sayfa", status: "Hazır" },
  { no: 3, code: "EK-15", title: "Kazanım, Gösterge, Değer ve Eğilim Takip Çizelgesi", category: "Matris", pages: "12 Sayfa", status: "Hazır" },
  { no: 4, code: "EK-7", title: "Dönemlik Kavram Çizelgesi (10 Kategori, 180+ Kavram)", category: "Matris", pages: "4 Sayfa", status: "Hazır" },
  { no: 5, code: "EK-8", title: "Öğrenme Merkezleri Materyal & Güvenlik Envanteri", category: "Envanter", pages: "2 Sayfa", status: "Hazır" },
  { no: 6, code: "EK-1", title: "Öğrenci Tanıma Kartları Dosyası", category: "Öğrenci Dosyası", pages: "25 Sayfa", status: "Hazır" },
  { no: 7, code: "EK-2", title: "Anekdot Kayıtları ve Gözlem Notları Cildi", category: "Gözlem", pages: "35 Sayfa", status: "Hazır" },
  { no: 8, code: "EK-3", title: "Gelişim Gözlem ve Süreç Değerlendirme Formları", category: "Değerlendirme", pages: "25 Sayfa", status: "Hazır" },
  { no: 9, code: "ŞABLON", title: "13 Sütunlu Veli İletişim & Acil Durum Çizelgesi", category: "Veli", pages: "2 Sayfa", status: "Hazır" },
  { no: 10, code: "ÖLÇÜM", title: "Dönem Başı / Sonu Boy-Kilo Gelişim Takip Cetveli", category: "Sağlık", pages: "2 Sayfa", status: "Hazır" },
  { no: 11, code: "GÖREV", title: "Sınıf İçi Nöbet, Meyve & Beslenme Dağıtım Takvimi", category: "Rutin", pages: "4 Sayfa", status: "Hazır" },
  { no: 12, code: "ZÜMRE", title: "Okul Öncesi Zümre Öğretmenler Kurulu Tutanakları", category: "Yönetmelik", pages: "6 Sayfa", status: "Hazır" },
];

export function InspectorDossierWorkspace({ onClose }: InspectorDossierWorkspaceProps) {
  const [selectedDocs, setSelectedDocs] = useState<number[]>(DOSSIER_DOCUMENTS.map((d) => d.no));
  const [isPrinting, setIsPrinting] = useState(false);

  const toggleDoc = (no: number) => {
    setSelectedDocs((prev) =>
      prev.includes(no) ? prev.filter((item) => item !== no) : [...prev, no]
    );
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printOfficialFormA4("MEB_Mufettis_Teftis_Dosyasi_2026_2027");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="inspector-dossier-root" style={{ padding: "20px", color: "#1e293b", maxWidth: "1080px", margin: "0 auto" }}>
      {/* Üst Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · TEFTİŞ STANDARTLARI
          </span>
          <h2 style={{ margin: "2px 0 0", fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>
            🛡️ 32 Evraklı Maarif Müfettişliği Teftiş ve Denetim Dosyası
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Müfettiş denetimlerinde talep edilen tüm resmî okul öncesi evraklarını tek tıkla ciltler, sıralar ve A4 formatında basar.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
              color: "#ffffff",
              border: "none",
              padding: "9px 18px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(2, 132, 199, 0.35)",
            }}
          >
            <PrinterIcon size={16} />
            <span>{isPrinting ? "Hazırlanıyor..." : "🖨️ Teftiş Dosyasını A4 Bas"}</span>
          </button>
        </div>
      </div>

      {/* Önizleme Sayfası (A4 Kağıt Simülasyonu) */}
      <div
        className="official-print-document official-sheet"
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          padding: "36px 40px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
          fontFamily: "'Times New Roman', Times, serif",
        }}
      >
        {/* Resmî Başlık / Antet */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "20px" }}>
          <h4 style={{ margin: 0, fontSize: "1rem", letterSpacing: "1px", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI
          </h4>
          <h5 style={{ margin: "4px 0", fontSize: "0.9rem", color: "#334155" }}>
            TEMEL EĞİTİM GENEL MÜDÜRLÜĞÜ
          </h5>
          <h3 style={{ margin: "8px 0 0", fontSize: "1.15rem", fontWeight: "bold", textTransform: "uppercase" }}>
            TÜRKİYE YÜZYILI MAARİF MODELİ OKUL ÖNCESİ ÖĞRETMENİ
            <br />
            RESMÎ TEFTİŞ, DENETİM VE REHBERLİK DOSYASI
          </h3>
          <p style={{ margin: "6px 0 0", fontSize: "0.82rem", fontStyle: "italic", color: "#475569" }}>
            2026-2027 EĞİTİM ÖĞRETİM YILI
          </p>
        </div>

        {/* Dosya Künyesi */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", marginBottom: "20px", background: "#f8fafc", padding: "12px", border: "1px solid #e2e8f0" }}>
          <div><strong>İli / İlçesi:</strong> Denizli / Merkezefendi</div>
          <div><strong>Okul Adı:</strong> Resmî Anaokulu / İlkokul Bünyesi</div>
          <div><strong>Öğretmen Adı Soyadı:</strong> Okul Öncesi Öğretmeni</div>
          <div><strong>Şube / Yaş Grubu:</strong> 48-60 Ay / 5 Yaş Grubu (A Şubesi)</div>
        </div>

        {/* Fihrist / İçindekiler Tablosu */}
        <h4 style={{ fontSize: "0.95rem", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "4px", margin: "16px 0 10px" }}>
          DOSYA İÇERİĞİ VE RESMÎ EVRAK LİSTESİ (FİHRİST)
        </h4>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #0f172a" }}>
              <th style={{ padding: "6px 8px", width: "40px" }}>SIRA</th>
              <th style={{ padding: "6px 8px", width: "70px" }}>KOD</th>
              <th style={{ padding: "6px 8px" }}>RESMÎ EVRAK VE ÇİZELGE TANIMI</th>
              <th style={{ padding: "6px 8px", width: "100px" }}>KATEGORİ</th>
              <th style={{ padding: "6px 8px", width: "70px", textAlign: "right" }}>DURUM</th>
            </tr>
          </thead>
          <tbody>
            {DOSSIER_DOCUMENTS.map((doc) => {
              const isChecked = selectedDocs.includes(doc.no);
              return (
                <tr key={doc.no} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 8px" }}>{doc.no}</td>
                  <td style={{ padding: "6px 8px", fontWeight: "bold" }}>{doc.code}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDoc(doc.no)}
                        style={{ cursor: "pointer" }}
                      />
                      <span>{doc.title}</span>
                    </label>
                  </td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>{doc.category}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#059669", fontWeight: "bold" }}>
                    {isChecked ? "Mevcut ✓" : "Hariç"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Resmî Onay ve İmza Bloğu */}
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", paddingTop: "20px" }}>
          <div style={{ textAlign: "center", width: "200px" }}>
            <div><strong>Düzenleyen Öğretmen</strong></div>
            <div style={{ height: "45px" }} />
            <div>İmza / Tarih</div>
          </div>

          <div style={{ textAlign: "center", width: "200px" }}>
            <div><strong>UYGUNDUR</strong></div>
            <div style={{ fontSize: "0.78rem" }}>Okul Müdürü</div>
            <div style={{ height: "35px" }} />
            <div>Mühür / İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
