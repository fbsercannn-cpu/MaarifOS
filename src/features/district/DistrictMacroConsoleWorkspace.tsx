/**
 * DistrictMacroConsoleWorkspace.tsx — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * İlçe / İl MEM ve Zümre Makro Konsolu Çalışma Masası (Horizon-2 Pillar 4)
 * 
 * Sunucu bağımlılığı olmaksızın (%100 Stateless Client-Side) okulların ve şubelerin
 * anonimleştirilmiş pedagojik paketlerini birleştirir ve zümre başkanı / müfettiş
 * seviyesinde makro analiz ve teftiş brifingi sunar.
 */

import React, { useState, useMemo } from "react";
import {
  aggregateDistrictPackets,
  exportCurrentClassroomPacket,
  SAMPLE_DISTRICT_PACKETS,
  type ClassroomDistrictPacket,
} from "../../services/district-macro-service.ts";

export function DistrictMacroConsoleWorkspace() {
  const [packets, setPackets] = useState<ClassroomDistrictPacket[]>(SAMPLE_DISTRICT_PACKETS);
  const [uploadNotice, setUploadNotice] = useState("");

  const aggregation = useMemo(() => aggregateDistrictPackets(packets), [packets]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.schoolName && parsed.classroomName) {
          setPackets((prev) => [parsed, ...prev]);
          setUploadNotice(`✓ '${parsed.schoolName} - ${parsed.classroomName}' paketi başarıyla zümre matrisine eklendi!`);
          setTimeout(() => setUploadNotice(""), 4000);
        } else {
          alert("Geçersiz zümre paketi formatı.");
        }
      } catch (err) {
        alert("Dosya okuma hatası: " + String(err));
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="district-console-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#fcd34d", marginBottom: "8px" }}>
              <span>🏛️</span> İLÇE & ZÜMRE MAKRO KONSOLU (HORIZON-2)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              Sıfır Sunucu Maliyetli İlçe ve Zümre Konsolide Brifingi
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", maxWidth: "680px", lineHeight: "1.4" }}>
              Okulların ürettiği anonimleştirilmiş .maarif-dist veri paketlerini istemci RAM'inde birleştirerek ilçe geneli merkez doygunluğunu, erdem haritasını ve şube başarı metriklerini raporlar.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => exportCurrentClassroomPacket()}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
              }}
            >
              <span>📦</span>
              <span>Sınıf Paketini İndir (.maarif-dist)</span>
            </button>

            <label
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📂</span>
              <span>Paket Yükle</span>
              <input type="file" accept=".maarif-dist,.json" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🖨️</span>
              <span>A4 Brifing Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {uploadNotice && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontWeight: 700, fontSize: "0.85rem" }}>
          {uploadNotice}
        </div>
      )}

      {/* 5'li Makro Telemetri Sayaçları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Okul Sayısı", val: aggregation.totalSchools, icon: "🏫", color: "#3b82f6" },
          { label: "Toplam Şube", val: aggregation.totalClassrooms, icon: "🚪", color: "#10b981" },
          { label: "İzlenen Öğrenci", val: aggregation.totalStudentsMonitored, icon: "👶", color: "#8b5cf6" },
          { label: "Kayıtlı Gözlem", val: aggregation.totalObservationsSum, icon: "📝", color: "#f59e0b" },
          { label: "Ort. Katılım", val: `%${aggregation.overallAttendanceAverage}`, icon: "📈", color: "#06b6d4" },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>{item.label}</span>
              <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: item.color, marginTop: "4px" }}>
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* Merkez Doygunluğu ve Değerler Grafiği */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* İlçe Merkezleri Doygunluk Dağılımı */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
            📊 İlçe Geneli Öğrenme Merkezleri Doygunluk Payı
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(aggregation.districtCenterShare).map(([center, pct]) => (
              <div key={center}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, marginBottom: "3px" }}>
                  <span>{center}</span>
                  <span style={{ color: "#0284c7" }}>%{pct}</span>
                </div>
                <div style={{ height: "7px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)", borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.74rem", color: "#475569" }}>
            💡 <strong>Zümre Önerisi:</strong> En yüksek etkileşim <strong>{aggregation.strongestCenterName}</strong> alanında. Zümre toplantısında <strong>{aggregation.weakestCenterName}</strong> takviyesi planlanmalıdır.
          </div>
        </div>

        {/* En Çok İşlenen TYMM Erdem & Değerleri */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
            ⭐ İlçe TYMM Erdem & Değer Haritası (Top 5)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {aggregation.topValuesDemonstrated.map((v, i) => (
              <div
                key={v.code}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: i === 0 ? "#fef3c7" : "#f8fafc",
                  borderRadius: "8px",
                  border: i === 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: i === 0 ? "#b45309" : "#64748b" }}>#{i + 1}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{v.name}</span>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#059669" }}>{v.count} Gözlem</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Şube Bazında Karşılaştırma Matrisi Tablosu */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
          🏫 Şube Bazında Pedagojik Başarı & Katılım Matrisi
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>Okul Adı</th>
              <th style={{ padding: "8px 10px" }}>Şube & Öğretmen</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Mevcut</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Gözlem</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Katılım</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Motor</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Bilişsel</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Dil</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Sosyal</th>
              <th style={{ padding: "8px 10px", textAlign: "center" }}>Öz Bakım</th>
            </tr>
          </thead>
          <tbody>
            {aggregation.classes.map((cls, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px", fontWeight: 700, color: "#1e293b" }}>{cls.schoolName}</td>
                <td style={{ padding: "10px", color: "#475569" }}>{cls.classroomName} <small>({cls.teacherTitle})</small></td>
                <td style={{ padding: "10px", textAlign: "center", fontWeight: 700 }}>{cls.studentCount}</td>
                <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#0284c7" }}>{cls.totalObservationsRecorded}</td>
                <td style={{ padding: "10px", textAlign: "center", fontWeight: 800, color: "#10b981" }}>%{cls.averageAttendancePercent}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>⭐ {cls.domainScores.motor}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>⭐ {cls.domainScores.cognitive}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>⭐ {cls.domainScores.language}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>⭐ {cls.domainScores.social}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>⭐ {cls.domainScores.selfCare}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
