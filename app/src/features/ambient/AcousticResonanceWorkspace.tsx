/**
 * AcousticResonanceWorkspace.tsx — MaarifOS 0.95.0
 * Akustik Sınıf Rezonansı & Gerçek Zamanlı Desibel Pusulası Çalışma Masası
 */

import React, { useState, useEffect } from "react";
import {
  AcousticClassroomSensor,
  type AcousticTelemetry,
} from "../../services/acoustic-classroom-sensor.ts";
import {
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "../../components/MaarifIcons.tsx";

export function AcousticResonanceWorkspace() {
  const [isActive, setIsActive] = useState(false);
  const [telemetry, setTelemetry] = useState<AcousticTelemetry>({
    dbLevel: 44,
    category: "ideal",
    categoryLabel: "İdeal Üretken Uğultu",
    spectralBalance: { lowBass: 35, speechBand: 52, highHarsh: 18 },
    pedagogicalAdvice: "Sınıf akustiği merkez çalışmaları ve serbest etkinlikler için dengeli.",
    recommendedActivity: "Mevcut blok ve sanat çalışmalarını sürdürün.",
  });
  const [permissionError, setPermissionError] = useState("");

  const toggleSensor = async () => {
    if (isActive) {
      AcousticClassroomSensor.stopListening();
      setIsActive(false);
    } else {
      setPermissionError("");
      const success = await AcousticClassroomSensor.startListening((data) => {
        setTelemetry(data);
      });
      if (success) {
        setIsActive(true);
      } else {
        setPermissionError(
          "Mikrofon erişimi sağlanamadı. Lütfen tarayıcı izinlerinden mikrofon erişimine izin verin."
        );
      }
    }
  };

  useEffect(() => {
    return () => {
      AcousticClassroomSensor.stopListening();
    };
  }, []);

  const getStatusColor = () => {
    switch (telemetry.category) {
      case "sessiz":
        return "#38bdf8";
      case "ideal":
        return "#10b981";
      case "uyari":
        return "#f59e0b";
      case "kaos":
        return "#ef4444";
      default:
        return "#10b981";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* BAŞLIK & TELEMETRİ KARTI */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "24px",
          color: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8" }}>
              <span>🎙️</span>
              <span>SESSİZ PEDAGOJİK PUSULA</span>
            </div>
            <h2 style={{ margin: "12px 0 6px 0", fontSize: "1.5rem", fontWeight: 800 }}>
              Akustik Sınıf Rezonansı &amp; Desibel Sensörü
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", maxWidth: "600px" }}>
              Web Audio API ile sınıfın gürültü ve ses dengesini milisaniyelik frekans analiziyle (FFT) ölçer. Ses kaydı tutulmaz; %100 yerel donanımda çalışır.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleSensor}
            style={{
              background: isActive
                ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                : "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isActive ? "0 4px 16px rgba(239, 68, 68, 0.4)" : "0 4px 16px rgba(16, 185, 129, 0.4)",
            }}
          >
            <span>{isActive ? "⏹️" : "🎙️"}</span>
            <span>{isActive ? "Sensörü Durdur" : "Akustik Dinlemeyi Başlat"}</span>
          </button>
        </div>

        {permissionError && (
          <div style={{ marginTop: "16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "0.85rem" }}>
            {permissionError}
          </div>
        )}
      </div>

      {/* CANLI DESİBEL GÖSTERGESİ & KOGNİTİF KADRAN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Kadran Kartı */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: `1px solid ${getStatusColor()}40`,
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxShadow: `0 8px 30px ${getStatusColor()}15`,
          }}
        >
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            Anlık Sınıf Ses Seviyesi
          </span>

          <div style={{ margin: "20px 0", position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={getStatusColor()}
                strokeWidth="12"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * (telemetry.dbLevel - 30)) / 65}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 0.15s ease, stroke 0.3s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "2.8rem", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                {telemetry.dbLevel}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: getStatusColor(), marginTop: "4px" }}>
                dB (SPL)
              </span>
            </div>
          </div>

          <div
            style={{
              background: `${getStatusColor()}20`,
              border: `1px solid ${getStatusColor()}60`,
              color: getStatusColor(),
              padding: "6px 16px",
              borderRadius: "20px",
              fontWeight: 800,
              fontSize: "0.9rem",
            }}
          >
            {telemetry.categoryLabel}
          </div>

          {/* Frekans Bantları */}
          <div style={{ width: "100%", marginTop: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
              <span>Düşük Frekans (Gürültü / Adım):</span>
              <strong style={{ color: "#ffffff" }}>{telemetry.spectralBalance.lowBass}%</strong>
            </div>
            <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, telemetry.spectralBalance.lowBass)}%`, height: "100%", background: "#60a5fa" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
              <span>Konuşma Bandı (Diyalog &amp; İletişim):</span>
              <strong style={{ color: "#ffffff" }}>{telemetry.spectralBalance.speechBand}%</strong>
            </div>
            <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, telemetry.spectralBalance.speechBand)}%`, height: "100%", background: "#10b981" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
              <span>Yüksek Frekans (Metalik / Çığlık):</span>
              <strong style={{ color: "#ffffff" }}>{telemetry.spectralBalance.highHarsh}%</strong>
            </div>
            <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, telemetry.spectralBalance.highHarsh)}%`, height: "100%", background: "#ef4444" }} />
            </div>
          </div>
        </div>

        {/* Canlı Pedagojik Reçete & Eylem Kartı */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 800, fontSize: "0.85rem", textTransform: "uppercase" }}>
              <SparklesIcon size={16} />
              <span>CANLI AKUSTİK PEDAGOJİ YORUMU</span>
            </div>

            <div style={{ marginTop: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "1rem" }}>
                Pedagojik Değerlendirme:
              </h4>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.88rem", lineHeight: "1.5" }}>
                {telemetry.pedagogicalAdvice}
              </p>
            </div>

            <div style={{ marginTop: "14px", background: `${getStatusColor()}15`, border: `1px solid ${getStatusColor()}30`, borderRadius: "12px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 6px 0", color: getStatusColor(), fontSize: "1rem" }}>
                Önerilen Sınıf Müdahalesi:
              </h4>
              <p style={{ margin: 0, color: "#ffffff", fontSize: "0.88rem", fontWeight: 600 }}>
                {telemetry.recommendedActivity}
              </p>
            </div>
          </div>

          {/* Hızlı Müdahale Butonları */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
            <button
              type="button"
              onClick={() => {
                alert("🧘 'Sessiz Göl' modu başlatıldı. Çocuklara derin bir nefes alıp kuğu gibi sessizce yüzmeleri telkin edildi.");
              }}
              style={{
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🌊 Sakinleşme Çemberi
            </button>

            <button
              type="button"
              onClick={() => {
                alert("🥁 'Ritim ve Alkış' oyunu başlatıldı. Çocukların dikkati öğretmenin alkış temposuna odaklandı.");
              }}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              👏 Ritimle Toplanma
            </button>
          </div>

          {/* Zero-Trust Rozeti */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", fontSize: "0.74rem", color: "#64748b" }}>
            <ShieldCheckIcon size={14} style={{ color: "#10b981" }} />
            <span>%100 Cihaz İçi Web Audio Analizi • Ham ses asla kaydedilmez ve iletilmez.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
