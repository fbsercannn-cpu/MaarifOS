import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import { useOfficialFormState, useOfficialFormContext } from "./OfficialFormRecordProvider.tsx";
import React, { useState, useMemo } from "react";
import { generateCurriculumMatrix, type ChecklistPlanSource } from "./planToChecklistSync.ts";
import { buildDailyPlanMatrix } from "./daily-to-monthly-sync.ts";
import {
  exportOfficialTableToExcel,
  printOfficialFormA4,
  type ExcelColumnDefinition,
} from "./official-form-export-service.ts";
import { EK15_ITEMS, EK15_SOURCE } from "./ek15-catalog.ts";
import { triggerHaptic } from "../../core/haptics.ts";
import "./official-forms.css";

export { EK15_ITEMS, type ChecklistItem } from "./ek15-catalog.ts";

export const MONTHS = [
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
] as const;

export type MonthKey = (typeof MONTHS)[number];

interface Props {
  onClose?: () => void;
}

export function OfficialMonthlyPlanChecklistForm({ onClose }: Props) {
  const { store, scope } = useOfficialFormContext();
  const [syncStatus, setSyncStatus] = useState("");
  const [, setPlanSources] = useOfficialFormState<ChecklistPlanSource[]>("planSources", []);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [schoolName, setSchoolName] = useOfficialFormState("schoolName", "Atatürk Anaokulu");
  const [teacherName, setTeacherName] = useOfficialFormState("teacherName", "Okul Öncesi Öğretmeni");
  const [academicYear, setAcademicYear] = useOfficialFormState("academicYear", "2026-2027");
  const [ageBand, setAgeBand] = useOfficialFormState<"36-48" | "48-60" | "60-72">("ageBand", "60-72");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "cards";
    }
    return "table";
  });

  const [matrix, setMatrix] = useOfficialFormState<Record<string, Record<string, boolean>>>("matrix", () => {
    return {};
  });

  const toggleCell = (itemId: string, month: MonthKey) => {
    triggerHaptic(10);
    setMatrix((prev) => {
      const itemRow = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...itemRow,
          [month]: !itemRow[month],
        },
      };
    });
  };

  const filteredItems = useMemo(() => {
    return EK15_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subCategory.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const handlePrint = () => {
    printOfficialFormA4(`EK-15_Aylik_Plan_Kontrol_Cizelgesi_${academicYear}_${ageBand}`);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      const columns: ExcelColumnDefinition[] = [
        { header: "Bileşen / Alan", key: "subCategory", width: 22 },
        { header: "Resmî Kod", key: "code", width: 14 },
        { header: "Öğrenme Çıktısı / Açıklama", key: "description", width: 45 },
        ...MONTHS.map((m) => ({
          header: m,
          key: m,
          width: 10,
          align: "center" as const,
          isNumeric: true,
        })),
      ];

      const rows = EK15_ITEMS.map((item) => {
        const rowData: Record<string, unknown> = {
          subCategory: item.subCategory,
          code: item.code,
          description: item.description,
        };
        for (const m of MONTHS) {
          rowData[m] = matrix[item.id]?.[m] ? 1 : 0;
        }
        return rowData;
      });

      await exportOfficialTableToExcel({
        fileName: `EK-15_Aylik_Plan_Kontrol_Cizelgesi_${academicYear}_${ageBand}`,
        sheetName: `EK-15 (${ageBand} Ay)`,
        title: `T.C. MİLLÎ EĞİTİM BAKANLIĞI — EK-15 AYLIK EĞİTİM PLANI KONTROL ÇİZELGESİ (${ageBand} AY)`,
        subtitle: `${schoolName} · Öğretmen: ${teacherName} · Eğitim Yılı: ${academicYear}`,
        metadata: [
          { label: "Okul Adı", value: schoolName },
          { label: "Öğretmen", value: teacherName },
          { label: "Eğitim Yılı", value: academicYear },
          { label: "Yaş Grubu", value: `${ageBand} Ay` },
        ],
        columns,
        rows,
        includeSubtotals: true,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadWord = () => downloadOfficialFormWord("OfficialMonthlyPlanChecklistForm");

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable is-landscape" style={{ maxWidth: "1200px" }}>
        <p className="no-print">Kaynak: <a href={EK15_SOURCE.url + "#page=207"} target="_blank" rel="noreferrer">TTKB EK-15 · 60–72 ay · 207–219</a>. Bu matris yalnız 60–72 ay kaynağı içindir.</p>
        {syncStatus && <p role="status" className="no-print">{syncStatus}</p>}
        {/* Actions Bar */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>EK-15 Aylık Eğitim Planı Kontrol Çizelgesi (TTKB Sayfa 207–219)</strong>
            <small>60-72 Ay · Yıllık Alan Becerileri, Eğilimler ve Kavram Matrisi</small>
          </div>
          <details className="official-output-menu"><summary className="of-btn">Çıktıyı hazırla ve çizelge araçları</summary><div className="official-form-actions__buttons">
            {/* ─── YENİ: Günlük Planlardan Otomatik Doldur ───────────────── */}
            <button
              type="button"
              className="of-btn"
              style={{ background: "#7c3aed", color: "#fff" }}
              onClick={() => {
                try {
                  const result = buildDailyPlanMatrix(EK15_ITEMS, ageBand);
                  setMatrix(previous => {
                    const merged = structuredClone(previous);
                    for (const [id, months] of Object.entries(result.matrix)) {
                      merged[id] = { ...merged[id], ...months };
                    }
                    return merged;
                  });
                  setSyncStatus(`✨ Günlük Planlardan Senkronizasyon: ${result.sourceCount} günlük plan tarandı; ${result.matchCount} kod eşleşmesi matrise eklendi. Etkinlik silindi veya değiştirilirse "Günlük Planlardan Doldur" butonuna tekrar basın.`);
                } catch {
                  setSyncStatus("Günlük plan verisi okunamadı; matris korunuyor.");
                }
              }}
              title="Kayıtlı günlük planların seçilen kodlarını otomatik olarak matrise ekler"
            >
              ✨ Günlük Planlardan Doldur
            </button>

            {/* ─── ESKİ: Kayıtlı Aylık Planlardan ─────────────────────── */}
            <button
              type="button"
              className="of-btn"
              style={{ background: "#0284c7", color: "#fff" }}
              onClick={() => void (async () => {
                const result = generateCurriculumMatrix(EK15_ITEMS, await store.readSnapshot(), scope);
                setPlanSources(result.sources);
                setMatrix(previous => {
                  const merged = structuredClone(previous);
                  for (const [id, months] of Object.entries(result.matrix)) merged[id] = { ...merged[id], ...months };
                  return merged;
                });
                setSyncStatus(`${result.sourceCount} kayıtlı aylık plan incelendi (ana plan grafiği + resmî form); ${result.matchCount} açık kod eşleşmesi planlanan kapsam olarak eklendi. Bu işaret uygulama veya çocuk gelişim kanıtı değildir. Önceki işaretler korundu. Kavramlar ve kod içermeyen metinler elle incelenmelidir.`);
              })().catch(() => setSyncStatus("Plan kaynağı okunamadı; işaretler korunuyor."))}
              title="Aynı sınıf, yıl ve yaş bandındaki kayıtlı aylık planların açık kodlarını işle"
            >
              Kayıtlı aylık planlardan ekle
            </button>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #cbd5e1" }}
              onClick={() => {
                if (window.confirm("Tüm işaretlemeler temizlensin mi?")) {
                  const empty: Record<string, Record<string, boolean>> = {};
                  EK15_ITEMS.forEach((i) => {
                    empty[i.id] = {};
                  });
                  setMatrix(empty);
                }
              }}
            >
              🗑️ Temizle
            </button>
            <button
              type="button"
              className="of-btn"
              style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", fontWeight: 700 }}
              onClick={() => void handleDownloadExcel()}
              disabled={isExportingExcel}
              title="Formül ve filtre korumalı Microsoft Excel (.xlsx) olarak indir"
            >
              {isExportingExcel ? "Excel Hazırlanıyor..." : "📊 Excel (.xlsx)"}
            </button>
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📥 Word İndir (.docx)
            </button>
          </div></details>
        </div>

        {/* Age Selector Bar (No Print) */}
        <div className="of-card no-print" style={{ marginBottom: "10px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Kaynak yaş bandı: 60–72 ay</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>TTKB Sayfa 207–219</span>
          </div>
        </div>

        {/* Printable Header */}
        <header className="official-form-header">
          <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 style={{ fontSize: "1.05rem" }}>EK-15 AYLIK EĞİTİM PLANI KONTROL ÇİZELGESİ ({ageBand} AY)</h1>
          <p className="official-form-subtext">Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı · Yıllık Planlanan Program Kapsamı</p>
          <p>İşaretler aylık planda yer verilen kapsamı gösterir; etkinliğin uygulandığı veya bir çocuğun beceriyi kazandığı anlamına gelmez.</p>
        </header>

        {/* Meta inputs */}
        <div className="of-grid-4" style={{ marginBottom: "12px" }}>
          <div className="of-field">
            <label>Okul Adı:</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Öğretmen Adı:</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Eğitim Yılı:</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </div>
          <div className="of-field">
            <label>Yaş Grubu:</label>
            <input type="text" value={`${ageBand} Ay`} readOnly style={{ background: "#f1f5f9", fontWeight: "bold" }} />
          </div>
        </div>

        {/* Filter Controls (No Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "Tümü" },
              { id: "alan", label: "Alan Becerileri" },
              { id: "egilim", label: "Eğilimler (21)" },
              { id: "sdb", label: "Sosyal-Duygusal" },
              { id: "deger", label: "Değerler" },
              { id: "okuryazarlik", label: "Okuryazarlık" },
              { id: "kavram", label: "Kavramlar" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "6px",
                  border: activeCategory === cat.id ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: activeCategory === cat.id ? "#0284c7" : "#ffffff",
                  color: activeCategory === cat.id ? "#ffffff" : "#334155",
                  fontWeight: activeCategory === cat.id ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => { triggerHaptic(10); setViewMode("cards"); }}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "6px",
                  border: viewMode === "cards" ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: viewMode === "cards" ? "#0284c7" : "#ffffff",
                  color: viewMode === "cards" ? "#ffffff" : "#334155",
                  fontWeight: viewMode === "cards" ? 700 : 500,
                  cursor: "pointer",
                }}
                title="Dikey Mobil Kart Modu (Tek sayfa, yatay kaydırmasız)"
              >
                📱 Mobil Kart
              </button>
              <button
                type="button"
                onClick={() => { triggerHaptic(10); setViewMode("table"); }}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "6px",
                  border: viewMode === "table" ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: viewMode === "table" ? "#0284c7" : "#ffffff",
                  color: viewMode === "table" ? "#ffffff" : "#334155",
                  fontWeight: viewMode === "table" ? 700 : 500,
                  cursor: "pointer",
                }}
                title="10 Aylık Matris Tablosu"
              >
                📊 Tablo
              </button>
            </div>

            <div style={{ minWidth: "180px" }}>
              <input
                type="text"
                placeholder="🔍 Ara (Kod veya açıklama)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className={`of-checklist-table-wrapper ${viewMode === "cards" ? "no-screen" : ""}`} style={{ overflowX: "auto" }}>
          <table className="of-table" style={{ fontSize: "0.78rem", width: "100%", minWidth: "850px" }}>
            <thead>
              <tr style={{ background: "#e0f2fe", color: "#0369a1" }}>
                <th style={{ width: "130px", padding: "6px 8px" }}>Bileşen / Kod</th>
                <th style={{ padding: "6px 8px" }}>Öğrenme Çıktısı / Açıklama</th>
                {MONTHS.map((m) => (
                  <th key={m} style={{ width: "45px", textAlign: "center", padding: "6px 2px", fontSize: "0.72rem" }}>
                    {m.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ breakInside: "avoid" }}>
                  <td style={{ padding: "5px 6px", verticalAlign: "top" }}>
                    <strong style={{ color: "#0369a1", fontSize: "0.75rem" }}>{item.code}</strong>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{item.subCategory}</div>
                  </td>
                  <td style={{ padding: "5px 6px", verticalAlign: "middle" }}>{item.description}</td>
                  {MONTHS.map((m) => {
                    const isChecked = Boolean(matrix[item.id]?.[m]);
                    return (
                      <td
                        key={m}
                        onClick={() => toggleCell(item.id, m)}
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "2px",
                          cursor: "pointer",
                          background: isChecked ? "#f0fdf4" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "20px",
                            height: "20px",
                            lineHeight: "18px",
                            borderRadius: "4px",
                            border: isChecked ? "1.5px solid #059669" : "1px solid #cbd5e1",
                            background: isChecked ? "#059669" : "#ffffff",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                          }}
                        >
                          {isChecked ? "✓" : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobil Dikey Kart Modu */}
        {viewMode === "cards" && (
          <div className="of-checklist-cards no-print" role="region" aria-label="Aylık plan kontrol kartları">
            {filteredItems.map((item) => (
              <div key={item.id} className="of-checklist-card">
                <div className="of-checklist-card__header">
                  <span className="of-checklist-card__code">{item.code}</span>
                  <span className="of-checklist-card__subcat">{item.subCategory}</span>
                </div>
                <div className="of-checklist-card__desc">{item.description}</div>
                <div className="of-checklist-card__months" role="group" aria-label={`${item.code} ayları`}>
                  {MONTHS.map((m) => {
                    const isChecked = Boolean(matrix[item.id]?.[m]);
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`of-checklist-month-chip ${isChecked ? "is-checked" : ""}`}
                        onClick={() => toggleCell(item.id, m)}
                        aria-pressed={isChecked}
                        aria-label={`${item.code} ${m}`}
                      >
                        {isChecked ? "✓ " : ""}{m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Note */}
        <div style={{ marginTop: "12px", fontSize: "0.72rem", color: "#64748b" }}>
          * Millî Eğitim Bakanlığı Talim ve Terbiye Kurulu Başkanlığı Okul Öncesi Eğitim Programı EK-15 standardıdır. İlgili ayda ele alınan bileşenleri kutucuklara tıklayarak işaretleyiniz.
        </div>
      </div>
    </div>
  );
}
