/**
 * AmbientClassroomWorkspace.tsx — MaarifOS 0.92.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Ortam Pedagojik Rezonansı & İstasyon Algılayıcı (Horizon-3 Pillar 1)
 * 
 * Öğretmenin sınıftaki 6 merkez arasında dolaşırken NFC veya QR ile istasyon
 * değiştirmesini, o merkezin öğrencilerini ve TYMM kazanımlarını eller-serbest
 * gözleme hazırlamasını sağlar.
 */

import React, { useState, useEffect } from "react";
import {
  LEARNING_CENTER_STATIONS,
  isWebNfcSupported,
  type LearningCenterStation,
} from "../../services/ambient-classroom-sensor.ts";
import { persistClassifiedObservation } from "../../services/ai-observation-classifier.ts";

const SAMPLE_CENTER_STUDENTS: Record<string, string[]> = {
  center_blok: ["Ali Kaya", "Kerem Tekin", "Mehmet Çelik"],
  center_sanat: ["Zeynep Baran", "Elif Sarı", "Defne Yıldız"],
  center_fen: ["Defne Yıldız", "Emir Aydın"],
  center_kitap: ["Zeynep Baran", "Ayşe Demir"],
  center_dramatik: ["Elif Sarı", "Kerem Tekin", "Ayşe Demir"],
  center_muzik: ["Emir Aydın", "Ali Kaya"],
};

export function AmbientClassroomWorkspace() {
  const [activeStation, setActiveStation] = useState<LearningCenterStation>(LEARNING_CENTER_STATIONS[0]);
  const [detectionMode, setDetectionMode] = useState<string>("manual");
  const [quickNote, setQuickNote] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [savedNotice, setSavedNotice] = useState("");

  const nfcAvailable = isWebNfcSupported();

  useEffect(() => {
    const studentsInCenter = SAMPLE_CENTER_STUDENTS[activeStation.id] || [];
    setSelectedStudent(studentsInCenter[0] || "Öğrenci");
  }, [activeStation]);

  const handleSelectStation = (station: LearningCenterStation, mode: string = "manual") => {
    setActiveStation(station);
    setDetectionMode(mode);
  };

  const handleSaveObservation = async () => {
    if (!quickNote.trim()) return;

    try {
      const fullText = `[İstasyon: ${activeStation.name}] ${selectedStudent}: ${quickNote}`;
      await persistClassifiedObservation(
        null,
        selectedStudent,
        fullText,
        {
          domainCodes: ["MAB"],
          domainLabels: [activeStation.name],
          valueCodes: ["D14 Adalet & Paylaşım"],
          tendencyCodes: ["E2.4 İş Birliği"],
          conceptLabels: ["Örüntü / Tasarım"],
          learningCenter: activeStation.name,
          dimension: "bilissel",
          dimensionLabel: "Bilişsel & Motor Tasarım",
          pedagogicalInterpretation: `${activeStation.name} ortamında doğrudan gözlemlendi.`,
        }
      );

      setSavedNotice(`✓ ${selectedStudent} için gözlem ${activeStation.name} bağlamında kaydedildi!`);
      setQuickNote("");
      setTimeout(() => setSavedNotice(""), 3500);
    } catch (e) {
      alert("Kayıt hatası: " + String(e));
    }
  };

  const printStationBadges = () => {
    window.print();
  };

  return (
    <div className="ambient-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #042f2e 0%, #0f766e 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(4, 47, 46, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(45, 212, 191, 0.2)", border: "1px solid rgba(45, 212, 191, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#99f6e4", marginBottom: "8px" }}>
              <span>📡</span> AMBIENT INTELLIGENCE &amp; İSTASYON SENSÖRÜ (HORIZON-3)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              Öğrenme Merkezleri Ortam Rezonansı &amp; NFC İstasyonu
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#ccfbf1", maxWidth: "680px", lineHeight: "1.4" }}>
              Öğretmenin gözü ekranda değil çocukta kalsın. Sınıftaki 6 merkezin NFC etiketine dokunun veya seçin; sistem o merkezin öğrencilerini, TYMM becerilerini ve gözlem taslağını anında açsın.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={printStationBadges}
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
              <span>🖨️</span>
              <span>6 Merkez Etiketini A4 Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Merkez Seçim Masası (İstasyon Paneli) */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {LEARNING_CENTER_STATIONS.map((station) => {
          const isActive = activeStation.id === station.id;
          return (
            <div
              key={station.id}
              onClick={() => handleSelectStation(station, "tap")}
              style={{
                background: isActive ? `${station.themeColor}12` : "#ffffff",
                border: isActive ? `2px solid ${station.themeColor}` : "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive ? `0 4px 12px ${station.themeColor}25` : "0 2px 4px rgba(0,0,0,0.02)",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "1.6rem" }}>{station.icon}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: isActive ? station.themeColor : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#64748b",
                  }}
                >
                  {station.activeChildCount} Çocuk
                </span>
              </div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>
                {station.name}
              </h4>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "monospace" }}>
                {station.nfcTagId}
              </div>
              {isActive && (
                <div style={{ marginTop: "8px", fontSize: "0.7rem", fontWeight: 800, color: station.themeColor, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🟢</span>
                  <span>AKTİF İSTASYON</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {savedNotice && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontWeight: 700, fontSize: "0.85rem" }}>
          {savedNotice}
        </div>
      )}

      {/* Aktif Merkez Yönetim & Hızlı Gözlem Güvertesi */}
      <div
        className="no-print"
        style={{
          background: "#ffffff",
          border: `1.5px solid ${activeStation.themeColor}`,
          borderRadius: "14px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "2rem" }}>{activeStation.icon}</span>
            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Algılanan İstasyon ({detectionMode === "tap" ? "NFC / Dokunma" : "Manüel"})
              </span>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                {activeStation.name}
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {activeStation.dominantTymmCodes.map((code, idx) => (
              <span
                key={idx}
                style={{
                  background: `${activeStation.themeColor}15`,
                  color: activeStation.themeColor,
                  border: `1px solid ${activeStation.themeColor}30`,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>

        {/* İstasyondaki Öğrenci Seçici */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
            İstasyondaki Öğrenciler (Gözlem Yapılacak Çocuğa Dokunun):
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(SAMPLE_CENTER_STUDENTS[activeStation.id] || []).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedStudent(name)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: selectedStudent === name ? `2px solid ${activeStation.themeColor}` : "1px solid #cbd5e1",
                  background: selectedStudent === name ? `${activeStation.themeColor}15` : "#f8fafc",
                  color: selectedStudent === name ? activeStation.themeColor : "#334155",
                  fontWeight: selectedStudent === name ? 800 : 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                👤 {name}
              </button>
            ))}
          </div>
        </div>

        {/* Pedagojik Odak Kılavuzu */}
        <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", borderLeft: `3px solid ${activeStation.themeColor}`, marginBottom: "14px", fontSize: "0.78rem", color: "#334155" }}>
          <strong>🎯 {activeStation.name} Pedagojik Odak İpucu:</strong> {activeStation.suggestedPrompt}
        </div>

        {/* Hızlı Gözlem Notu */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            rows={2}
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder={`${selectedStudent} için bu merkezde gözlemlediğiniz davranışı yazın...`}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.82rem",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={handleSaveObservation}
              disabled={!quickNote.trim()}
              style={{
                background: quickNote.trim() ? activeStation.themeColor : "#cbd5e1",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: quickNote.trim() ? "pointer" : "not-allowed",
                boxShadow: quickNote.trim() ? `0 2px 8px ${activeStation.themeColor}40` : "none",
              }}
            >
              💾 Gözlemi Bu İstasyona Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* Yazdırılabilir Matbu Merkez Kartları (Yalnızca @media print'te görünür) */}
      <div className="print-only" style={{ display: "none" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          T.C. MİLLÎ EĞİTİM BAKANLIĞI OKUL ÖNCESİ ÖĞRENME MERKEZLERİ İSTASYON ETİKETLERİ
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {LEARNING_CENTER_STATIONS.map((s) => (
            <div key={s.id} style={{ border: "2px solid #000", padding: "16px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>{s.icon}</div>
              <h3 style={{ margin: "8px 0", fontSize: "1.3rem" }}>{s.name}</h3>
              <p style={{ fontSize: "0.85rem" }}>NFC Kodu: {s.nfcTagId}</p>
              <div style={{ border: "1px dashed #666", padding: "8px", margin: "10px 0" }}>
                [KAREKOD BURAYA / NFC DOKUNMA NOKTASI]
              </div>
              <small>{s.dominantTymmCodes.join(" • ")}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
