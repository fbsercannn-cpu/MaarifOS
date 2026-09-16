import React, { useState, useEffect } from "react";
import "./official-forms.css";

export interface PortfolioItem {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  date: string;
  domain: string;
  childQuote: string;
  teacherNote: string;
  imageUrl?: string;
  tag: string;
}

const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: "p-1",
    studentId: "s-1",
    studentName: "Ali Yılmaz",
    title: "Sonbahar Yaprak Baskısı ve Ağaç Kolajı",
    date: "14.10.2026",
    domain: "Sanat (SNAB.2)",
    childQuote: "Ağacım rüzgarda dans ediyor, yapraklar sarı ve kırmızı oldu.",
    teacherNote: "Doğal malzemeleri sanatsal ifadeye başarıyla dönüştürdü; renk tonlama becerisi gelişti.",
    tag: "Görsel Sanat",
  },
  {
    id: "p-2",
    studentId: "s-1",
    studentName: "Ali Yılmaz",
    title: "Geometrik Bloklarla Uzay İstasyonu",
    date: "04.11.2026",
    domain: "Matematik (MAB.2) & Fen",
    childQuote: "En tepedeki üçgen blok radyo anteni, uzaydaki astronotlarla konuşuyor.",
    teacherNote: "Denge ve 3 boyutlu simetri kurmada çok başarılı bir mimari kurgu sergiledi.",
    tag: "3B Yapı / Blok",
  },
  {
    id: "p-3",
    studentId: "s-2",
    studentName: "Ayşe Kaya",
    title: "Cumhuriyet Bayramı Bayrak ve Çiçekleri",
    date: "28.10.2026",
    domain: "Sosyal (SAB.4) & Sanat",
    childQuote: "Atatürk'e kırmızı kalpler ve bayraklar çizdim, çünkü onu çok seviyorum.",
    teacherNote: "Millî değerleri duyguyla özdeşleştirdi; ince motor makas ve yapıştırma becerisi çok iyi.",
    tag: "Millî Değer / Çizim",
  },
  {
    id: "p-4",
    studentId: "s-3",
    studentName: "Mehmet Demir",
    title: "Kendi Kendini Temizleyen Doğa Şehri",
    date: "18.11.2026",
    domain: "Fen (FAB.9) & Sürdürülebilirlik",
    childQuote: "Buradaki çark rüzgarla dönüyor, göldeki balıklara temiz su pompalıyor.",
    teacherNote: "Neden-sonuç ilişkisini ve çevre bilincini somut model üzerinde başarıyla anlattı.",
    tag: "Fen ve Doğa Modeli",
  },
];

interface Props {
  onClose?: () => void;
}

export function StudentPortfolioGalleryModal({ onClose }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem("maarif_portfolio_items");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_PORTFOLIO_ITEMS;
  });

  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // New item draft
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStudentName, setDraftStudentName] = useState("Ali Yılmaz");
  const [draftDomain, setDraftDomain] = useState("Sanat (SNAB.2)");
  const [draftQuote, setDraftQuote] = useState("");
  const [draftTeacherNote, setDraftTeacherNote] = useState("");
  const [draftTag, setDraftTag] = useState("Görsel Sanat");

  useEffect(() => {
    try {
      localStorage.setItem("maarif_portfolio_items", JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    const newItem: PortfolioItem = {
      id: "p-" + Date.now(),
      studentId: draftStudentName.includes("Ali") ? "s-1" : "s-2",
      studentName: draftStudentName,
      title: draftTitle,
      date: new Date().toLocaleDateString("tr-TR"),
      domain: draftDomain,
      childQuote: draftQuote,
      teacherNote: draftTeacherNote,
      tag: draftTag,
    };

    setItems([newItem, ...items]);
    setDraftTitle("");
    setDraftQuote("");
    setDraftTeacherNote("");
    setShowAddForm(false);
  };

  const handlePrint = () => window.print();

  const handleExportExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const filteredItems = items.filter((it) => {
      if (selectedStudent !== "all" && it.studentName !== selectedStudent) return false;
      if (selectedTag !== "all" && it.tag !== selectedTag) return false;
      return true;
    });

    const rows = filteredItems.map((it, index) => ({
      no: index + 1,
      studentName: it.studentName,
      title: it.title,
      date: it.date,
      domain: it.domain,
      tag: it.tag,
      childQuote: it.childQuote,
      teacherNote: it.teacherNote,
    }));

    await exportOfficialTableToExcel({
      fileName: `MEB_Portfolyo_Urun_Seckisi_${selectedStudent === "all" ? "Tum_Sinif" : selectedStudent.replace(/\s+/g, "_")}`,
      sheetName: "Portfolyo Kataloğu",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — ÖĞRENCİ GELİŞİM DOSYASI (PORTFOLYO) ÜRÜN SEÇKİSİ",
      subtitle: `Filtre: ${selectedStudent === "all" ? "Tüm Sınıf" : selectedStudent} · Kategori: ${selectedTag === "all" ? "Tüm Türler" : selectedTag} · TTKB Sayfa 110, 177`,
      metadata: [
        { label: "Öğrenci Kapsamı", value: selectedStudent === "all" ? "Tüm Sınıf" : selectedStudent },
        { label: "Ürün Türü", value: selectedTag === "all" ? "Tüm Türler" : selectedTag },
        { label: "Toplam Eser / Kanıt Sayısı", value: `${filteredItems.length} Ürün` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenci Adı", key: "studentName", width: 20, align: "left" },
        { header: "Ürün / Eser Başlığı", key: "title", width: 35, align: "left" },
        { header: "Tarih", key: "date", width: 14, align: "center" },
        { header: "Öğrenme Alanı", key: "domain", width: 24, align: "left" },
        { header: "Tür / Etiket", key: "tag", width: 18, align: "left" },
        { header: "Çocuğun Kendi İfadesi", key: "childQuote", width: 40, align: "left" },
        { header: "Öğretmenin Pedagojik Notu", key: "teacherNote", width: 45, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  const filteredItems = items.filter((item) => {
    const matchStudent = selectedStudent === "all" || item.studentName === selectedStudent;
    const matchTag = selectedTag === "all" || item.tag === selectedTag;
    return matchStudent && matchTag;
  });

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable" style={{ maxWidth: "1150px" }}>
        {/* Top actions */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>Dijital Gelişim Dosyası &amp; Ürün Seçki Portfolyosu (TTKB s. 110, 177)</strong>
            <small>Süreç Odaklı Değerlendirme · Sanatsal ve Bilişsel Ürün Arşivi</small>
          </div>
          <div className="official-form-actions__buttons">
            <button
              type="button"
              className="of-btn"
              onClick={handleExportExcel}
              style={{ background: "#15803d", color: "#fff", borderColor: "#15803d" }}
            >
              📊 Excel (.xlsx)
            </button>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#0284c7", color: "#fff" }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "✕ Formu Kapat" : "+ Yeni Ürün / Eser Ekle"}
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ Portfolyo Kataloğu Yazdır
            </button>
            {onClose ? (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            ) : null}
          </div>
        </div>

        {/* Header printable */}
        <header className="official-form-header">
          <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 style={{ fontSize: "1.1rem" }}>ÖĞRENCİ GELİŞİM DOSYASI (PORTFOLYO) ÜRÜN SEÇKİSİ</h1>
          <p className="official-form-subtext">
            Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı Süreç Odaklı Değerlendirme Kanıtları
          </p>
        </header>

        {/* Add item form (no print) */}
        {showAddForm ? (
          <form
            onSubmit={handleAddItem}
            className="no-print"
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <strong style={{ color: "#166534", display: "block", marginBottom: "8px" }}>
              🎨 Yeni Öğrenci Ürünü / Eseri Kaydet
            </strong>
            <div className="of-grid-3" style={{ marginBottom: "8px" }}>
              <div className="of-field">
                <label>Öğrenci:</label>
                <select value={draftStudentName} onChange={(e) => setDraftStudentName(e.target.value)}>
                  <option value="Ali Yılmaz">Ali Yılmaz</option>
                  <option value="Ayşe Kaya">Ayşe Kaya</option>
                  <option value="Mehmet Demir">Mehmet Demir</option>
                  <option value="Zeynep Çelik">Zeynep Çelik</option>
                  <option value="Can Aksoy">Can Aksoy</option>
                </select>
              </div>
              <div className="of-field">
                <label>Ürün / Eser Başlığı:</label>
                <input
                  type="text"
                  placeholder="Örn: Kil Heykel / Uzay Resmi"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  required
                />
              </div>
              <div className="of-field">
                <label>Alan Becerisi / Kategori:</label>
                <input
                  type="text"
                  placeholder="Örn: Sanat (SNAB.2)"
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                />
              </div>
            </div>
            <div className="of-grid-2" style={{ marginBottom: "8px" }}>
              <div className="of-field">
                <label>Çocuğun Kendi Açıklaması (Sözleri):</label>
                <input
                  type="text"
                  placeholder='Örn: "Ağacıma sarı yapraklar yaptım çünkü sonbahar geldi."'
                  value={draftQuote}
                  onChange={(e) => setDraftQuote(e.target.value)}
                />
              </div>
              <div className="of-field">
                <label>Öğretmenin Gelişimsel Notu:</label>
                <input
                  type="text"
                  placeholder="Örn: İnce motor becerisi ve renk uyumu çok başarılı."
                  value={draftTeacherNote}
                  onChange={(e) => setDraftTeacherNote(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="of-btn"
              style={{ background: "#166534", color: "#fff", fontWeight: 700 }}
            >
              ✓ Eseri Portfolyoya Kaydet
            </button>
          </form>
        ) : null}

        {/* Filter bar (no print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Öğrenci:</span>
            {["all", "Ali Yılmaz", "Ayşe Kaya", "Mehmet Demir"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedStudent(name)}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: selectedStudent === name ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: selectedStudent === name ? "#0284c7" : "#ffffff",
                  color: selectedStudent === name ? "#ffffff" : "#334155",
                  fontWeight: selectedStudent === name ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {name === "all" ? "Tüm Sınıf" : name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Toplam <strong>{filteredItems.length}</strong> Ürün Listeleniyor
          </div>
        </div>

        {/* Portfolio Items Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                breakInside: "avoid",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>{item.title}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 700 }}>
                    {item.studentName} · {item.date}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                  }}
                >
                  {item.domain}
                </span>
              </div>

              {/* Child Quote Box */}
              {item.childQuote ? (
                <div
                  style={{
                    background: "#fefce8",
                    borderLeft: "3px solid #eab308",
                    padding: "6px 8px",
                    borderRadius: "0 6px 6px 0",
                    fontSize: "0.78rem",
                    color: "#713f12",
                    fontStyle: "italic",
                    margin: "6px 0",
                  }}
                >
                  💬 "{item.childQuote}"
                </div>
              ) : null}

              {/* Teacher Note */}
              {item.teacherNote ? (
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "4px" }}>
                  <strong>Öğretmen Gözlemi:</strong> {item.teacherNote}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px", fontSize: "0.72rem", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          * Millî Eğitim Bakanlığı Okul Öncesi Eğitim Programı s. 110 uyarınca, öğrenci ürün dosyaları (portfolyo) çocuğun gelişimini süreç içerisinde somut kanıtlarla belgeleyen resmî arşiv niteliğindedir.
        </div>
      </div>
    </div>
  );
}
