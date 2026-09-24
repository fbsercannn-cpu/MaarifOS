/**
 * ClassroomDynamicIsland.tsx — MaarifOS 1.1.0
 * Dinamik Sınıf Pedagojik Adası (Omnipresent Ambient Co-Pilot)
 * 
 * DÖRT DÜNYA BİLGESİ PERSPEKTİFİ:
 * 1. Linus Torvalds & John Carmack: $O(1)$ reaktif durum dinleyicisi, sıfır modal blokajı, sıfır GC baskısı.
 * 2. Jony Ive & Dieter Rams: "Invisible AI" — ekranı işgal eden sohbet kutusu yerine zarif, akışkan cam kapsül.
 * 3. Maria Montessori & Lev Vygotsky: 3 Saniye Kuralı — çocukla göz temasını koparmadan tek dokunuşla resmî kayıt.
 * 4. Steve Jobs & Bret Victor: Modal ve form angaryası yok; durumsal eylem hapları (Action Pills) doğrudan icra edilir.
 * 
 * %100 İstemci Taraflı (Stateless Client-Side) & Sıfır Bulut Bağımlılığı.
 */

import React, { useState, useEffect, useMemo } from "react";
import { CircadianRhythmEngine, type CircadianPhase } from "../services/circadian-rhythm-engine";
import { AmbientClassroomPedagogue } from "../services/ambient-classroom-pedagogue";
import { triggerHaptic } from "../core/haptics";

export interface ClassroomDynamicIslandProps {
  absentCount?: number;
  presentCount?: number;
  totalStudents?: number;
  absentStudentNames?: string[];
  classroomName?: string;
  teacherName?: string;
  onOpenAttendance?: () => void;
  onOpenPlanFlow?: () => void;
  onOpenQuickObservation?: () => void;
}

export function ClassroomDynamicIsland({
  absentCount = 0,
  presentCount = 0,
  totalStudents = 0,
  absentStudentNames = [],
  classroomName = "Sınıfım",
  teacherName = "Öğretmenim",
  onOpenAttendance,
  onOpenPlanFlow,
  onOpenQuickObservation,
}: ClassroomDynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<CircadianPhase>(() =>
    CircadianRhythmEngine.getCurrentPhase()
  );
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [deckTab, setDeckTab] = useState<"pulse" | "zpd" | "crisis">("pulse");
  const [zpdTopic, setZpdTopic] = useState<"block" | "scissor" | "share">("block");
  const [crisisTopic, setCrisisTopic] = useState<
    "aggression_physical" | "tantrum_crying" | "possession_conflict" | "separation_anxiety"
  >("possession_conflict");

  const zpdResult = useMemo(() => {
    const textMap = {
      block: "blok kule denge",
      scissor: "makas kesme boyama",
      share: "sıra paylaşma benim",
    };
    return AmbientClassroomPedagogue.scaffoldLearningMoment({
      center: currentPhase.recommendedCenter,
      studentName: "Çocuğumuz",
      actionDescription: textMap[zpdTopic],
    });
  }, [zpdTopic, currentPhase.recommendedCenter]);

  const crisisResult = useMemo(() => {
    return AmbientClassroomPedagogue.generateCrisisShield({
      studentName: "Öğrencimiz",
      incidentType: crisisTopic,
    });
  }, [crisisTopic]);

  // 60 saniyede bir sirkadiyen saati güncelle ($O(1)$)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentPhase(CircadianRhythmEngine.getCurrentPhase(now));
      setCurrentTimeStr(now.toTimeString().slice(0, 5));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    triggerHaptic(15);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Faz renk paleti ve nabız ışığı
  const phaseColors = useMemo(() => {
    switch (currentPhase.phaseId) {
      case "morning_peak":
        return {
          glow: "#38bdf8",
          badgeBg: "rgba(56, 189, 248, 0.15)",
          border: "rgba(56, 189, 248, 0.4)",
          text: "#38bdf8",
          icon: "⚡",
        };
      case "kinetic_burst":
        return {
          glow: "#f59e0b",
          badgeBg: "rgba(245, 158, 11, 0.15)",
          border: "rgba(245, 158, 11, 0.4)",
          text: "#fbbf24",
          icon: "🏃",
        };
      case "lunch_nutrition":
        return {
          glow: "#10b981",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.4)",
          text: "#34d399",
          icon: "🍎",
        };
      case "post_lunch_dip":
        return {
          glow: "#a855f7",
          badgeBg: "rgba(168, 85, 247, 0.15)",
          border: "rgba(168, 85, 247, 0.4)",
          text: "#c084fc",
          icon: "🧘",
        };
      case "social_reflection":
      default:
        return {
          glow: "#06b6d4",
          badgeBg: "rgba(6, 182, 212, 0.15)",
          border: "rgba(6, 182, 212, 0.4)",
          text: "#22d3ee",
          icon: "🤝",
        };
    }
  }, [currentPhase.phaseId]);

  // Tek dokunuşla veli devamsızlık WhatsApp metni üretimi ($O(1)$)
  const handleCopyAbsenceDigest = (e: React.MouseEvent) => {
    e.stopPropagation();
    const names = absentStudentNames.length > 0 ? absentStudentNames.join(", ") : "öğrencimiz";
    const text = `Sayın Velimiz,\nBugün ${names} sınıfımızda aramızda olamadı ve yokluğunu hissettik. Okul öncesi Maarif Modeli sürecinde günlük rutinler ve akran etkileşimi çocuğumuzun gelişimi için çok değerlidir. Sağlık veya özel bir durum varsa lütfen bizi bilgilendiriniz; evde birlikte yapabileceğiniz destekleyici oyun önerilerini paylaşmaktan mutluluk duyarız.\nSevgilerimizle,\n${classroomName} — ${teacherName}`;

    navigator.clipboard.writeText(text).then(() => {
      showToast("✅ Devamsızlık veli bildirim metni panoya kopyalandı!");
    }).catch(() => {
      showToast("📋 Metin hazırlandı, panoya erişilemedi.");
    });
  };

  const handleOpenWhatsAppDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const names = absentStudentNames.length > 0 ? absentStudentNames.join(", ") : "öğrencimiz";
    const text = encodeURIComponent(
      `Sayın Velimiz,\nBugün ${names} sınıfımızda aramızda olamadı ve yokluğunu hissettik. Sağlık veya özel bir durum varsa lütfen bizi bilgilendiriniz. Sevgilerimizle,\n${classroomName}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    showToast("💬 WhatsApp açılıyor...");
  };

  const handleTriggerVoiceAnecdote = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(20);
    window.dispatchEvent(new CustomEvent("maarif_toggle_voice_dikte"));
    showToast("🎤 Hızlı Sesli Anekdot (EK-2) başlatılıyor...");
  };

  const handleTriggerAdaptivePlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(15);
    window.dispatchEvent(
      new CustomEvent("maarif_open_tymm_hub", { detail: { tab: "jit_compiler" } })
    );
    showToast("⏱️ Dinamik Gün Akışı ve Planlayıcı açılıyor...");
  };

  const handleTriggerAcousticSensor = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(15);
    window.dispatchEvent(
      new CustomEvent("maarif_open_tymm_hub", { detail: { tab: "acoustic" } })
    );
    showToast("👂 Sınıf Akustiği ve Desibel Pusulası açılıyor...");
  };

  return (
    <aside
      className="classroom-dynamic-island"
      aria-label="Dinamik Pedagojik Ada"
      style={{
        margin: "0 0 12px 0",
        position: "relative",
        zIndex: 50,
        width: "100%",
      }}
    >
      {/* ─── GERİ BİLDİRİM TOAST BİLDİRİMİ ─── */}
      {actionFeedback && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: "-42px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#065f46",
            color: "#ecfdf5",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
            animation: "fadeInDown 0.25s ease-out",
            zIndex: 100,
            border: "1px solid #10b981",
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* ─── ANA ADA KAPSÜLÜ (COMPACT / EXPANDED) ─── */}
      <div
        onClick={() => {
          triggerHaptic(10);
          setIsExpanded(!isExpanded);
        }}
        style={{
          background: "linear-gradient(135deg, rgba(8, 15, 28, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${phaseColors.border}`,
          borderRadius: isExpanded ? "16px" : "28px",
          padding: isExpanded ? "14px 16px" : "6px 14px",
          color: "#f8fafc",
          boxShadow: `0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 12px -2px ${phaseColors.glow}33`,
          cursor: "pointer",
          transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          gap: isExpanded ? "12px" : "0px",
        }}
      >
        {/* TEPE ÇUBUĞU (DAİMA GÖRÜNÜR) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            width: "100%",
          }}
        >
          {/* SOL: CANLI NABIZ VE GÜNÜN AKIŞI */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: "1 1 auto" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: phaseColors.glow,
                boxShadow: `0 0 8px ${phaseColors.glow}`,
                animation: "pulse 2s infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: phaseColors.text,
                letterSpacing: "0.01em",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ flexShrink: 0 }}>{phaseColors.icon}</span>
              <span style={{ flexShrink: 0 }}>{currentTimeStr}</span>
              <span style={{ opacity: 0.6, flexShrink: 0 }}>·</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentPhase.shortName}
              </span>
            </span>
          </div>

          {/* SAĞ: DURUMSAL DOĞRUDAN EYLEM HAPLARI (1-TAP CHIPS) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {absentCount > 0 ? (
              <button
                type="button"
                onClick={handleCopyAbsenceDigest}
                title="Devamsız veli bildirimini panoya kopyala"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fca5a5",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "14px",
                  padding: "3px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s",
                }}
              >
                <span>💬</span>
                <span>{absentCount} Devamsız</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTriggerVoiceAnecdote}
                title="Sesli mikrofonla hızlı resmî gözlem kaydet (EK-2)"
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid rgba(16, 185, 129, 0.5)",
                  color: "#6ee7b7",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "14px",
                  padding: "3px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>🎤</span>
                <span>Gözlem</span>
              </button>
            )}

            {/* AÇMA / KAPAMA İKONU */}
            <span
              style={{
                fontSize: "0.7rem",
                color: "#94a3b8",
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.25s ease",
                padding: "2px",
                flexShrink: 0,
              }}
            >
              ▼
            </span>
          </div>
        </div>

        {/* ─── GENİŞLETİLMİŞ TELEMETRİ VE EYLEM GÜVERTESİ ─── */}
        {isExpanded && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingTop: "6px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              animation: "fadeIn 0.2s ease-in",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── 3 BÜYÜK PEDAGOJİK GÜVERTE SEKMESİ ─── */}
            <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "6px", overflowX: "auto" }}>
              <button
                type="button"
                onClick={() => setDeckTab("pulse")}
                style={{
                  background: deckTab === "pulse" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  border: deckTab === "pulse" ? "1px solid #38bdf8" : "1px solid transparent",
                  color: deckTab === "pulse" ? "#38bdf8" : "#94a3b8",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ⏱️ Günün Ritim Akışı
              </button>
              <button
                type="button"
                onClick={() => setDeckTab("zpd")}
                style={{
                  background: deckTab === "zpd" ? "rgba(245, 158, 11, 0.2)" : "transparent",
                  border: deckTab === "zpd" ? "1px solid #f59e0b" : "1px solid transparent",
                  color: deckTab === "zpd" ? "#fbbf24" : "#94a3b8",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                💡 Öğrenme İskelesi
              </button>
              <button
                type="button"
                onClick={() => setDeckTab("crisis")}
                style={{
                  background: deckTab === "crisis" ? "rgba(239, 68, 68, 0.2)" : "transparent",
                  border: deckTab === "crisis" ? "1px solid #ef4444" : "1px solid transparent",
                  color: deckTab === "crisis" ? "#fca5a5" : "#94a3b8",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🤝 Çatışma &amp; Aile Notu
              </button>
            </div>

            {/* TAB 1: SİRKADİYEN VE PEDAGOJİK BİLGİ KARTI */}
            {deckTab === "pulse" && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "10px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                    Bilişsel Kapasite
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <div
                      style={{
                        flex: 1,
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${currentPhase.cognitiveCapacity}%`,
                          height: "100%",
                          backgroundColor: phaseColors.glow,
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: phaseColors.text }}>
                      %{currentPhase.cognitiveCapacity}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                    Önerilen Merkez
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9", marginTop: "2px" }}>
                    🏛️ {currentPhase.recommendedCenter}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                    Pedagojik Rehberlik (TYMM 2026)
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                    {currentPhase.pedagogicalGuidance}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: VYGOTSKY ZPD İSKELELEME & FISILTI REÇETESİ */}
            {deckTab === "zpd" && (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "10px",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setZpdTopic("block")}
                    style={{
                      background: zpdTopic === "block" ? "rgba(245, 158, 11, 0.25)" : "transparent",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#fbbf24",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🧱 Blok/Denge
                  </button>
                  <button
                    type="button"
                    onClick={() => setZpdTopic("scissor")}
                    style={{
                      background: zpdTopic === "scissor" ? "rgba(245, 158, 11, 0.25)" : "transparent",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#fbbf24",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✂️ Makas/İnce Motor
                  </button>
                  <button
                    type="button"
                    onClick={() => setZpdTopic("share")}
                    style={{
                      background: zpdTopic === "share" ? "rgba(245, 158, 11, 0.25)" : "transparent",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#fbbf24",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🤝 Paylaşım &amp; Sıra
                  </button>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#fbbf24", fontWeight: 800 }}>
                    🗣️ ÖĞRETMENİN ÇOCUĞA YÖNELTECEĞİ AÇIK UÇLU REHBER SORU:
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#fef08a", fontWeight: 700, margin: "4px 0", fontStyle: "italic" }}>
                    {zpdResult.teacherWhisperPrompt}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    🌿 <strong>Çevresel Materyal:</strong> {zpdResult.materialSuggestion} · <strong style={{ color: "#38bdf8" }}>{zpdResult.tymmOutcomeCode}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(zpdResult.teacherWhisperPrompt);
                    showToast("✅ Rehber soru panoya kopyalandı!");
                  }}
                  style={{
                    alignSelf: "flex-start",
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid #f59e0b",
                    color: "#fde68a",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📋 Rehber Soruyu Kopyala
                </button>
              </div>
            )}

            {/* TAB 3: KRİZ VE VELİ EMPATİ KALKANI */}
            {deckTab === "crisis" && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setCrisisTopic("possession_conflict")}
                    style={{
                      background: crisisTopic === "possession_conflict" ? "rgba(239, 68, 68, 0.25)" : "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#fca5a5",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🧸 Oyuncak Paylaşamama
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrisisTopic("aggression_physical")}
                    style={{
                      background: crisisTopic === "aggression_physical" ? "rgba(239, 68, 68, 0.25)" : "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#fca5a5",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ⚠️ Fiziksel Tepki / Çatışma
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrisisTopic("tantrum_crying")}
                    style={{
                      background: crisisTopic === "tantrum_crying" ? "rgba(239, 68, 68, 0.25)" : "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#fca5a5",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    😭 Ağlama &amp; Öfke Nöbeti
                  </button>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#fca5a5", fontWeight: 800 }}>
                    🤫 SINIFTA O AN SAKİNLEŞTİRME VE REHBERLİK ADIMI:
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#fecdd3", margin: "2px 0 6px 0" }}>
                    {crisisResult.immediateTeacherAction}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#86efac", fontWeight: 800 }}>
                    💬 AİLEYE GİDECEK GELİŞİMSEL PAYLAŞIM NOTU:
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#dcfce7", lineHeight: 1.4, margin: "2px 0 6px 0" }}>
                    {crisisResult.parentWhatsAppDigest}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "#94a3b8" }}>
                    📋 <strong>MEB EK-2 Anekdot Dili:</strong> {crisisResult.officialNoteMeb}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(crisisResult.parentWhatsAppDigest);
                      showToast("✅ Aile bilgilendirme notu panoya kopyalandı!");
                    }}
                    style={{
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid #22c55e",
                      color: "#86efac",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📋 Veli Mesajını Kopyala
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(`https://wa.me/?text=${encodeURIComponent(crisisResult.parentWhatsAppDigest)}`, "_blank");
                    }}
                    style={{
                      background: "rgba(34, 197, 94, 0.3)",
                      border: "1px solid #16a34a",
                      color: "#ffffff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    💬 WhatsApp'ta Aç
                  </button>
                </div>
              </div>
            )}

            {/* DOĞRUDAN KILCAL EYLEMLER BUTON GÜVERTESİ (ZERO CHATBOT MODAL) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "8px",
              }}
            >
              {absentCount > 0 && (
                <button
                  type="button"
                  onClick={handleOpenWhatsAppDirect}
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#86efac",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    justifyContent: "center",
                  }}
                >
                  <span>💬 Veli Bilgilendirme Notu</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTriggerVoiceAnecdote}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  color: "#7dd3fc",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                <span>🎤 Sesli Anekdot (EK-2)</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerAdaptivePlan}
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  color: "#d8b4fe",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                <span>⏱️ Dinamik Gün Akışı</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerAcousticSensor}
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fde68a",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                <span>👂 Sınıf Akustiği</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
