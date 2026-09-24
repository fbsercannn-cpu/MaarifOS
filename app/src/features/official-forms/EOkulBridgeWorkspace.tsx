/**
 * EOkulBridgeWorkspace.tsx — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * e-Okul & MEBBİS Gelişim Raporu İhraç Köprüsü Masası (Horizon-2 Pillar 3)
 * 
 * 250 karakter MEBBİS sınırına tam uyumlu 5 gelişim alanı metin derleyicisi,
 * tek tıkla e-Okul panosuna kopyalama ve Excel / A4 toplu dışa aktarma konsolu.
 */

import React, { useState, useMemo } from "react";
import {
  generateStudentEOkulReport,
  exportEOkulReportsToExcel,
  type StudentEOkulFullReport,
  type EOkulDomainReport,
} from "../../services/e-okul-bridge-service.ts";

const DEFAULT_STUDENTS = [
  { id: "s1", name: "Ali Kaya", tc: "10000000001", ageGroup: "48-60" as const },
  { id: "s2", name: "Zeynep Baran", tc: "10000000002", ageGroup: "48-60" as const },
  { id: "s3", name: "Kerem Tekin", tc: "10000000003", ageGroup: "48-60" as const },
  { id: "s4", name: "Elif Sarı", tc: "10000000004", ageGroup: "48-60" as const },
  { id: "s5", name: "Mehmet Çelik", tc: "10000000005", ageGroup: "48-60" as const },
  { id: "s6", name: "Defne Yıldız", tc: "10000000006", ageGroup: "48-60" as const },
  { id: "s7", name: "Emir Aydın", tc: "10000000007", ageGroup: "48-60" as const },
  { id: "s8", name: "Ayşe Demir", tc: "10000000008", ageGroup: "48-60" as const },
];

export function EOkulBridgeWorkspace() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("s1");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Öğrenci bazında rapor önbelleği
  const [reports, setReports] = useState<Record<string, StudentEOkulFullReport>>(() => {
    const map: Record<string, StudentEOkulFullReport> = {};
    DEFAULT_STUDENTS.forEach((s) => {
      map[s.id] = generateStudentEOkulReport(s.id, s.name, s.ageGroup, s.tc);
    });
    return map;
  });

  const currentReport = reports[selectedStudentId] || reports["s1"];

  const handleTextChange = (domainKey: keyof StudentEOkulFullReport["domains"], newText: string) => {
    setReports((prev) => {
      const cur = prev[selectedStudentId];
      if (!cur) return prev;
      return {
        ...prev,
        [selectedStudentId]: {
          ...cur,
          domains: {
            ...cur.domains,
            [domainKey]: {
              ...cur.domains[domainKey],
              text: newText,
              charCount: newText.length,
              isCompliant: newText.length <= 250,
            },
          },
        },
      };
    });
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExportExcel = () => {
    const list = Object.values(reports);
    exportEOkulReportsToExcel(list, "Maarif_Anaokulu");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="e-okul-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(30, 27, 75, 0.2)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(165, 180, 252, 0.2)", border: "1px solid rgba(165, 180, 252, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#c7d2fe", marginBottom: "8px" }}>
              <span>📋</span> e-OKUL / MEBBİS GELİŞİM RAPORU KÖPRÜSÜ (HORIZON-2)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              250 Karakter Sınırına Tam Uyumlu Gelişim Alanı İhraç Motoru
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#e0e7ff", maxWidth: "680px", lineHeight: "1.4" }}>
              Dönem sonunda e-Okul sistemindeki 5 gelişim kutucuğuna tek tek girilen değerlendirme metinlerini TYMM 2026 kriterleriyle hatasız derler. Tek tıkla e-Okul'a yapıştırın veya tüm sınıfı Excel (.xlsx) olarak indirin.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 16px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
              }}
            >
              <span>📊</span>
              <span>Tüm Sınıfı Excel'e Aktar (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                padding: "9px 16px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🖨️</span>
              <span>A4 Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {/* Öğrenci Seçim Şeridi (Tabs) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "10px",
          marginBottom: "16px",
        }}
      >
        {DEFAULT_STUDENTS.map((s) => {
          const isSelected = selectedStudentId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudentId(s.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                background: isSelected ? "rgba(79, 70, 229, 0.1)" : "#ffffff",
                color: isSelected ? "#3730a3" : "#475569",
                fontWeight: isSelected ? 800 : 600,
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>👤</span>
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* Seçili Öğrencinin e-Okul 5 Gelişim Alanı Masası */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Seçili Öğrenci</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
              {currentReport.studentName} ({currentReport.ageGroup} Ay)
            </h3>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            T.C. Kimlik: <strong style={{ fontFamily: "monospace" }}>{currentReport.nationalId}</strong>
          </div>
        </div>

        {/* 5 Gelişim Alanı Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {(Object.keys(currentReport.domains) as Array<keyof StudentEOkulFullReport["domains"]>).map((key) => {
            const domain: EOkulDomainReport = currentReport.domains[key];
            const isCopied = copiedKey === `${currentReport.studentId}-${key}`;
            const isOverLimit = domain.charCount > 250;

            return (
              <div
                key={key}
                style={{
                  border: isOverLimit ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "14px",
                  background: isOverLimit ? "#fef2f2" : "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: "#1e293b" }}>
                      {domain.domainTitle}
                    </h4>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6366f1" }}>
                      {domain.tymmCode}
                    </span>
                  </div>

                  {/* Canlı Karakter Sayacı */}
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: isOverLimit ? "#fee2e2" : domain.charCount > 240 ? "#fef3c7" : "#dcfce7",
                      color: isOverLimit ? "#991b1b" : domain.charCount > 240 ? "#92400e" : "#166534",
                    }}
                  >
                    {domain.charCount} / 250 Karakter
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={domain.text}
                  onChange={(e) => handleTextChange(key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.78rem",
                    color: "#1e293b",
                    lineHeight: "1.4",
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: "#ffffff",
                  }}
                  placeholder="e-Okul değerlendirme metni..."
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                  <span style={{ fontSize: "0.68rem", color: isOverLimit ? "#dc2626" : "#059669", fontWeight: 600 }}>
                    {isOverLimit ? "⚠️ MEB e-Okul sınırını aşıyor!" : "✓ MEB e-Okul ile tam uyumlu"}
                  </span>

                  <button
                    type="button"
                    onClick={() => copyText(domain.text, `${currentReport.studentId}-${key}`)}
                    style={{
                      background: isCopied ? "#10b981" : "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{isCopied ? "✓" : "📋"}</span>
                    <span>{isCopied ? "Kopyalandı!" : "e-Okul İçin Kopyala"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
