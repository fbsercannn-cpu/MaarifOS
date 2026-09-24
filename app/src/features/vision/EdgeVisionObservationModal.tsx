/**
 * EdgeVisionObservationModal.tsx — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Görsel & Bilişsel Pedagojik Sensör Modalı (Horizon-2 Pillar 5)
 * 
 * Sıfır Bulut (%100 Stateless Client-Side) HTML5 Canvas görüntü analitiği ile
 * çocuğun blok yapısını veya çizimini analiz edip MEB EK-2 Anekdotuna dönüştürür.
 */

import React, { useState } from "react";
import {
  analyzeChildWorkWithEdgeVision,
  type EdgeVisionAnalysisResult,
} from "../../services/edge-vision-analyzer.ts";

interface EdgeVisionObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  onApplyObservation?: (anecdoteText: string, center: string) => void;
}

// Hızlı test ve simülasyon için 3 yerel SVG veri görseli
const SAMPLE_IMAGE_BLOCKS = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23f1f5f9'/><rect x='80' y='180' width='96' height='40' fill='%23d97706'/><rect x='96' y='140' width='64' height='40' fill='%23b45309'/><rect x='112' y='90' width='32' height='50' fill='%2392400e'/><polygon points='128,40 108,90 148,90' fill='%23ef4444'/></svg>";
const SAMPLE_IMAGE_DRAWING = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23ffffff'/><circle cx='128' cy='70' r='30' fill='%23fef08a' stroke='%23eab308' stroke-width='4'/><line x1='128' y1='100' x2='128' y2='170' stroke='%233b82f6' stroke-width='6'/><line x1='90' y1='130' x2='166' y2='130' stroke='%233b82f6' stroke-width='6'/><line x1='128' y1='170' x2='100' y2='220' stroke='%231e293b' stroke-width='6'/><line x1='128' y1='170' x2='156' y2='220' stroke='%231e293b' stroke-width='6'/><circle cx='210' cy='45' r='25' fill='%23f97316'/></svg>";
const SAMPLE_IMAGE_CLAY = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23f8fafc'/><circle cx='128' cy='128' r='60' fill='%2310b981'/><circle cx='105' cy='110' r='12' fill='%23059669'/><circle cx='151' cy='110' r='12' fill='%23059669'/><ellipse cx='128' cy='150' rx='25' ry='10' fill='%23047857'/></svg>";

export function EdgeVisionObservationModal({
  isOpen,
  onClose,
  studentName = "Öğrenci",
  onApplyObservation,
}: EdgeVisionObservationModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EdgeVisionAnalysisResult | null>(null);
  const [editableDraft, setEditableDraft] = useState("");
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (!isOpen) return null;

  const runAnalysis = async (src: string | File) => {
    setAnalyzing(true);
    setAnalysisResult(null);
    setAppliedSuccess(false);

    try {
      const result = await analyzeChildWorkWithEdgeVision(src, studentName);
      setAnalysisResult(result);
      setEditableDraft(result.anecdoteObservationDraft);
    } catch (e) {
      alert("Görüntü analiz hatası: " + String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runAnalysis(file);
    }
  };

  const handleApply = () => {
    if (onApplyObservation && analysisResult) {
      onApplyObservation(editableDraft, analysisResult.suggestedLearningCenter);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Başlığı */}
        <div
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            padding: "16px 20px",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.3rem" }}>📷</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                Görsel & Bilişsel Pedagojik Sensör
              </h3>
              <span style={{ fontSize: "0.72rem", color: "#bae6fd" }}>
                Sıfır Bulut • %100 Cihaz İçi KVKK Korumalı • {studentName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              fontSize: "1.2rem",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* İçerik Alanı */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Fotoğraf Yükleme ve Hızlı Seçim */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
              Çocuğun Çalışmasını Seçin veya Kameradan Çekin:
            </label>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label
                style={{
                  flex: 1,
                  background: "#f0f9ff",
                  border: "2px dashed #0284c7",
                  borderRadius: "10px",
                  padding: "12px",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#0369a1",
                }}
              >
                <span>📸</span>
                <span>Fotoğraf Çek / Yükle</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>

              {/* Hızlı Demo Seçenekleri */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => runAnalysis(SAMPLE_IMAGE_BLOCKS)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🧱 Blok Kulesi
                </button>
                <button
                  type="button"
                  onClick={() => runAnalysis(SAMPLE_IMAGE_DRAWING)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🎨 Çocuk Resmi
                </button>
                <button
                  type="button"
                  onClick={() => runAnalysis(SAMPLE_IMAGE_CLAY)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🏺 Hamur Heykel
                </button>
              </div>
            </div>
          </div>

          {/* Tarama / Analiz Animasyonu */}
          {analyzing && (
            <div style={{ textAlign: "center", padding: "24px 0", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>🔄</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0284c7", marginTop: "8px" }}>
                Pikseller RAM'de taranıyor (Mekânsal simetri, çizgi gradyanı ve renk entropisi)...
              </div>
            </div>
          )}

          {/* Analiz Sonucu */}
          {analysisResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Telemetri Sayaçları & Önizleme */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <img
                  src={analysisResult.imageUrl}
                  alt="Analiz"
                  style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Motor Kararlılık</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0284c7" }}>%{analysisResult.metrics.motorPrecisionScore}</div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Mekânsal Denge</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#10b981" }}>%{analysisResult.metrics.spatialBalancePercent}</div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Renk & Duyu</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#f59e0b" }}>%{analysisResult.metrics.colorHarmonyScore}</div>
                  </div>
                </div>
              </div>

              {/* TYMM Rozetleri */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>
                  Otomatik Eşlenen TYMM 2026 Becerileri:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {analysisResult.highlightedTYMMCompetencies.map((comp) => (
                    <span
                      key={comp.code}
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        color: "#1d4ed8",
                      }}
                    >
                      {comp.code}: {comp.title}
                    </span>
                  ))}
                  <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "3px 8px", fontSize: "0.74rem", fontWeight: 700, color: "#065f46" }}>
                    📍 {analysisResult.suggestedLearningCenter}
                  </span>
                </div>
              </div>

              {/* Üretilen EK-2 Anekdot Taslağı */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                  Derlenen MEB EK-2 Anekdot / Portfolyo Notu (Düzenlenebilir):
                </label>
                <textarea
                  rows={3}
                  value={editableDraft}
                  onChange={(e) => setEditableDraft(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    lineHeight: "1.4",
                  }}
                />
              </div>

              {/* Pedagojik Reçete */}
              <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "0.74rem", color: "#92400e" }}>
                💡 <strong>Öğretmen Reçetesi:</strong> {analysisResult.pedagogicalPrescription}
              </div>

              {appliedSuccess && (
                <div style={{ background: "#dcfce7", color: "#166534", padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700 }}>
                  ✓ Gözlem forma aktarıldı!
                </div>
              )}

              {/* Butonlar */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px",
                    fontWeight: 800,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                  }}
                >
                  💾 Bu Notu Gözlem Olarak Ekle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
