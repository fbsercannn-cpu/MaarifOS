import React, { useState, useEffect } from "react";
import { CircadianRhythmEngine, type CircadianPhase } from "../../services/circadian-rhythm-engine";
import { triggerHaptic } from "../../services/mobile-haptics";

interface MobileApexStatusBarProps {
  onOpenQuickObservation?: () => void;
  onOpenAttendance?: () => void;
  onOpenPlanHub?: () => void;
  onToggleVoiceDikte?: () => void;
  onOpenSettings?: () => void;
  isVoiceActive?: boolean;
}

/**
 * MobileApexStatusBar — MaarifOS Mobile Nöro-Pedagojik Durum ve Başparmak Çubuğu
 * 120 FPS akıcı geçiş, Sirkadiyen Biyolojik Ritim Takibi ve Haptik Geri Bildirim.
 */
export const MobileApexStatusBar: React.FC<MobileApexStatusBarProps> = ({
  onOpenQuickObservation,
  onOpenAttendance,
  onOpenPlanHub,
  onToggleVoiceDikte,
  onOpenSettings,
  isVoiceActive = false,
}) => {
  const [phase, setPhase] = useState<CircadianPhase>(() => CircadianRhythmEngine.getCurrentPhase());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      );
      setPhase(CircadianRhythmEngine.getCurrentPhase(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // 30 sn'de bir yenile
    return () => clearInterval(interval);
  }, []);

  const handleAction = (callback?: () => void, hapticType: "light" | "medium" | "heavy" = "light") => {
    triggerHaptic(hapticType);
    callback?.();
  };

  return (
    <div
      className="mobile-apex-status-container"
      style={{
        background: "linear-gradient(135deg, rgba(7, 13, 24, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
        color: "#ffffff",
        padding: "6px 12px",
        fontSize: "0.78rem",
        zIndex: 9998,
        userSelect: "none",
        WebkitUserSelect: "none",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
        transition: "all 0.2s ease",
      }}
    >
      {/* ─── ÜST DURUM ŞERİDİ ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Sol: Sirkadiyen Pedagojik Faz Rozeti */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: "rgba(6, 78, 59, 0.6)",
            border: "1px solid #10b981",
            borderRadius: "16px",
            padding: "2px 8px",
            color: "#6ee7b7",
            fontWeight: 800,
            fontSize: "0.72rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            outline: "none",
          }}
          title="Nöro-Pedagojik Sirkadiyen Ritim Detayları"
        >
          <span style={{ fontSize: "0.85rem" }}>
            {phase.phaseId === "morning_peak" ? "🧠" : phase.phaseId === "kinetic_burst" ? "🏃" : phase.phaseId === "lunch_nutrition" ? "🍽️" : "🎨"}
          </span>
          <span>{phase.phaseName}</span>
          <span style={{ color: "#a7f3d0", fontSize: "0.68rem" }}>{phase.timeRange}</span>
          <span style={{ fontSize: "0.6rem", opacity: 0.8 }}>{isExpanded ? "▲" : "▼"}</span>
        </button>

        {/* Sağ: Yerel Güvenlik ve Saat */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "0.68rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
            title="Sıfır Sunucu / %100 Donanımsal Uç Nokta İzolasyonu"
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            <span>Uç Nokta</span>
          </span>
          <strong style={{ fontSize: "0.75rem", color: "#f8fafc", fontFamily: "monospace" }}>
            {currentTimeStr}
          </strong>
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => handleAction(onOpenSettings, "light")}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: "2px",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Sistem ve Lisans Ayarları"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* ─── AÇILIR SİRKADİYEN REHBERLİK PANELİ ─── */}
      {isExpanded && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "8px",
            fontSize: "0.72rem",
            lineHeight: "1.4",
            color: "#e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>🎯 {phase.primaryDomain}</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>Bilişsel Kapasite: %{phase.cognitiveCapacity}</span>
          </div>
          <p style={{ margin: "2px 0", color: "#cbd5e1" }}>{phase.pedagogicalGuidance}</p>
          <div style={{ marginTop: "4px", fontSize: "0.68rem", color: "#94a3b8" }}>
            🏛️ Önerilen Merkez: <strong style={{ color: "#34d399" }}>{phase.recommendedCenter}</strong>
          </div>
        </div>
      )}

      {/* ─── THUMB-ZONE HIZLI ERİŞİM DOCK (TEK BAŞPARMAK) ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          gap: "6px",
          marginTop: "6px",
          paddingTop: "6px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <button
          type="button"
          onClick={() => handleAction(onOpenQuickObservation, "medium")}
          style={{
            flex: "1 1 0%",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "5px 6px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
          }}
          title="Hızlı Gözlem ve Anektod Formu"
        >
          <span>⚡</span>
          <span>Hızlı Gözlem</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(onToggleVoiceDikte, "heavy")}
          style={{
            flex: "0 0 auto",
            background: isVoiceActive
              ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              : "rgba(255, 255, 255, 0.08)",
            border: isVoiceActive ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.2)",
            color: isVoiceActive ? "#ffffff" : "#38bdf8",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "0.72rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Mikrofon ile Sesli Dikte"
        >
          <span>{isVoiceActive ? "🔴" : "🎤"}</span>
          <span>{isVoiceActive ? "Kayıtta" : "Dikte"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(onOpenAttendance, "light")}
          style={{
            flex: "1 1 0%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#f8fafc",
            borderRadius: "6px",
            padding: "5px 6px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
          title="Günlük Sınıf Yoklaması"
        >
          <span>📋</span>
          <span>Yoklama</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(onOpenPlanHub, "medium")}
          style={{
            flex: "1 1 0%",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "5px 6px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
          }}
          title="TYMM 2026 Planlama Terminali ve 34 Resmî Form"
        >
          <span>🪄</span>
          <span>Plan Hub</span>
        </button>
      </div>
    </div>
  );
};
