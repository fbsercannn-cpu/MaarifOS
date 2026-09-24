/**
 * JITCurriculumCompiler.tsx — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Dinamik Gün Akışı ve Etkinlik Planlayıcı Çalışma Masası (MEB 528 Etkinlik)
 * 
 * Sınıfın anlık nabzını (katılım, enerji, hava durumu, haftalık açık) okuyarak
 * 528 MEB ders kitabı etkinliği içerisinden saniyeler içinde MEB EK-6 uyumlu
 * 3 bloklu günlük plan akışını derler ve tek tıkla sisteme kaydeder.
 */

import React, { useState, useMemo } from "react";
import {
  compileJITDailyCurriculum,
  persistJITResultAsDailyPlan,
  type JITCurriculumContext,
  type EnergyLevel,
  type WeatherCondition,
  type CurriculumDeficitDomain,
  type JITCompilationResult,
} from "../../services/jit-curriculum-compiler.ts";
import { CircadianRhythmEngine } from "../../services/circadian-rhythm-engine.ts";
import { SparklesIcon, CalendarIcon, LayersIcon, ShieldCheckIcon } from "../../components/MaarifIcons.tsx";

interface JITCurriculumCompilerProps {
  onPlanCreated?: (planId: string) => void;
}

export function JITCurriculumCompiler({ onPlanCreated }: JITCurriculumCompilerProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Form Parametreleri
  const [date, setDate] = useState(todayStr);
  const [totalEnrolled, setTotalEnrolled] = useState(24);
  const [presentCount, setPresentCount] = useState(20);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("hyperactive");
  const [weather, setWeather] = useState<WeatherCondition>("sunny");
  const [deficitDomain, setDeficitDomain] = useState<CurriculumDeficitDomain>("FKB");
  const [ageGroup, setAgeGroup] = useState<"36-48" | "48-60" | "60-72">("48-60");
  const [savedSuccessMessage, setSavedSuccessMessage] = useState("");

  // Biyolojik Sirkadiyen Faz
  const circadianPhase = useMemo(() => CircadianRhythmEngine.getCurrentPhase(), []);

  // Derleme Sonucu
  const compilationResult: JITCompilationResult = useMemo(() => {
    const ctx: JITCurriculumContext = {
      date,
      totalEnrolled,
      presentCount,
      dominantEnergyLevel: energyLevel,
      weatherCondition: weather,
      weeklyDeficitDomain: deficitDomain,
      targetAgeGroup: ageGroup,
    };
    return compileJITDailyCurriculum(ctx);
  }, [date, totalEnrolled, presentCount, energyLevel, weather, deficitDomain, ageGroup]);

  const handleSaveAsDailyPlan = () => {
    try {
      const plan = persistJITResultAsDailyPlan(compilationResult);
      setSavedSuccessMessage(`✓ '${plan.topic}' başarıyla oluşturuldu ve MEB EK-6 Günlük Plan olarak kaydedildi!`);
      if (onPlanCreated) {
        onPlanCreated(plan.id);
      }
      setTimeout(() => setSavedSuccessMessage(""), 5000);
    } catch (e) {
      alert("Plan kaydedilirken bir hata oluştu: " + String(e));
    }
  };

  return (
    <div className="jit-compiler-container" style={{ padding: "16px 0", maxWidth: "100%", margin: "0 auto" }}>
      {/* Üst Bilgi Kartı */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8", marginBottom: "8px" }}>
              <span>⏱️</span> DİNAMİK GÜN AKIŞI VE PLANLAYICI (MEB 528 ETKİNLİK)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Sınıfın Anlık Biyolojik & Çevresel Nabzına Göre Plan Derle
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", maxWidth: "680px", lineHeight: "1.4" }}>
              528 MEB ders kitabı etkinliği taranarak katılım oranı, hava durumu ve sınıfın anlık enerjisini dengeleyen en verimli 3 bloklu MEB EK-6 akışını saniyeler içinde üretir.
            </p>
          </div>
          <div style={{ textAlign: "right", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "10px 16px" }}>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pedagojik Uyum</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#34d399" }}>%{compilationResult.matchingScore}</div>
            <div style={{ fontSize: "0.7rem", color: "#cbd5e1" }}>O(log n) Hash-Match</div>
          </div>
        </div>
      </div>

      {/* Sirkadiyen Nöro-Pedagojik Akıllı Ritim Bandı */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "20px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.6rem" }}>🧬</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "0.95rem", color: "#38bdf8" }}>
                Sirkadiyen Nöro-Ritim: {circadianPhase.phaseName} ({circadianPhase.timeRange})
              </strong>
              <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.2)", border: "1px solid rgba(56, 189, 248, 0.4)", padding: "2px 8px", borderRadius: "10px", color: "#38bdf8", fontWeight: 800 }}>
                Bilişsel Kapasite: %{circadianPhase.cognitiveCapacity}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#cbd5e1" }}>
              {circadianPhase.pedagogicalGuidance}
            </p>
          </div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.76rem" }}>
          <span style={{ color: "#94a3b8" }}>Önerilen Merkez: </span>
          <strong style={{ color: "#34d399" }}>{circadianPhase.recommendedCenter}</strong>
        </div>
      </div>

      {/* Kontrol Paneli: 4 Parametre */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {/* Tarih & Yaş Grubu */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              📅 Plan Tarihi & Yaş
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}
              />
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as any)}
                style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, background: "#f8fafc" }}
              >
                <option value="36-48">36-48 Ay</option>
                <option value="48-60">48-60 Ay</option>
                <option value="60-72">60-72 Ay</option>
              </select>
            </div>
          </div>

          {/* Yoklama & Katılım Oranı */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              👥 Sınıf Katılımı ({presentCount} / {totalEnrolled} Öğrenci — %{Math.round((presentCount / (totalEnrolled || 1)) * 100)})
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="range"
                min="5"
                max={totalEnrolled}
                value={presentCount}
                onChange={(e) => setPresentCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#0284c7" }}
              />
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0284c7", minWidth: "36px" }}>
                %{Math.round((presentCount / (totalEnrolled || 1)) * 100)}
              </span>
            </div>
          </div>

          {/* Hava Durumu */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              🌤️ Günün Hava Durumu
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { id: "sunny", label: "Güneşli", icon: "☀️" },
                { id: "rainy", label: "Yağmurlu", icon: "🌧️" },
                { id: "snowy", label: "Karlı / Soğuk", icon: "❄️" },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWeather(w.id as WeatherCondition)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    borderRadius: "6px",
                    border: weather === w.id ? "2px solid #0284c7" : "1px solid #cbd5e1",
                    background: weather === w.id ? "rgba(2, 132, 199, 0.08)" : "#f8fafc",
                    color: weather === w.id ? "#0369a1" : "#475569",
                    fontWeight: weather === w.id ? 800 : 600,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <span>{w.icon}</span>
                  <span>{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sınıf Enerjisi */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              ⚡ Sınıfın Anlık Enerjisi
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { id: "hyperactive", label: "Kinetik / Yüksek", icon: "🏃" },
                { id: "calm", label: "Sakin / Odaklı", icon: "🧘" },
                { id: "distracted", label: "Dağınık", icon: "🎈" },
              ].map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEnergyLevel(e.id as EnergyLevel)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    borderRadius: "6px",
                    border: energyLevel === e.id ? "2px solid #8b5cf6" : "1px solid #cbd5e1",
                    background: energyLevel === e.id ? "rgba(139, 92, 246, 0.08)" : "#f8fafc",
                    color: energyLevel === e.id ? "#6d28d9" : "#475569",
                    fontWeight: energyLevel === e.id ? 800 : 600,
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <span>{e.icon}</span>
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Haftalık Eksik Gelişim Alanı */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              🎯 Bu Hafta Takviye Edilecek TYMM Gelişim Alanı (Haftalık Doygunluk Dengesi)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { id: "FKB", name: "Fen & Doğa Keşfi (FKB)", desc: "Deney, Gözlem, Doğa Olayları", color: "#10b981" },
                { id: "SDB", name: "Sosyal-Duygusal & Erdem (SDB)", desc: "Adalet, Paylaşım, Empati", color: "#ec4899" },
                { id: "MAB", name: "Matematik & Bilişsel (MAB)", desc: "Sayı, Mekân, Algı, Simetri", color: "#0284c7" },
                { id: "DIL", name: "Dil & Fonolojik Farkındalık (DİL)", desc: "Söz Dağarcığı, Masal, Ritim", color: "#8b5cf6" },
                { id: "SANAT", name: "Sanat & Estetik Tasarım", desc: "Yoğurma, Boya, Yapı İnşa", color: "#f59e0b" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeficitDomain(d.id as CurriculumDeficitDomain)}
                  style={{
                    flex: "1 1 180px",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: deficitDomain === d.id ? `2px solid ${d.color}` : "1px solid #e2e8f0",
                    background: deficitDomain === d.id ? `${d.color}10` : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: deficitDomain === d.id ? d.color : "#1e293b" }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Başarı Bildirimi */}
      {savedSuccessMessage && (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🎉</span>
          <span>{savedSuccessMessage}</span>
        </div>
      )}

      {/* Derleme Çıktısı: 3 Bloklu MEB EK-6 Akışı */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Odak Soru ve Çember Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "1.6rem" }}>💬</div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase" }}>
              Güne Başlama Çemberi Odak Araştırma Sorusu
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              "{compilationResult.circleQuestion}"
            </div>
          </div>
        </div>

        {/* 3 Blok Kartı */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>
          {compilationResult.blocks.map((b) => (
            <div
              key={b.blockOrder}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span
                  style={{
                    background: b.blockOrder === 1 ? "#3b82f6" : b.blockOrder === 2 ? "#10b981" : "#8b5cf6",
                    color: "#ffffff",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    borderRadius: "4px",
                    padding: "2px 8px",
                  }}
                >
                  BLOK {b.blockOrder} ({b.timeAllocationMinutes} dk)
                </span>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>
                  📍 {b.learningCenter}
                </span>
              </div>

              <h3 style={{ margin: "0 0 6px 0", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                {b.blockTitle}
              </h3>

              <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#334155", lineHeight: "1.4", flex: 1 }}>
                {b.description}
              </p>

              <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "8px 10px", borderLeft: "3px solid #0284c7" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                  TYMM Kazanım & Erdem:
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                  {b.highlightedCompetency} • {b.erdemerOrValue}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Farklılaştırma & Müfettiş Telemetrisi */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "0.82rem", fontWeight: 800, color: "#0369a1" }}>
              🌱 Farklılaştırma: Scaffolding (Destekleme)
            </h4>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: "1.4" }}>
              {compilationResult.differentiationSupport.scaffolding}
            </p>
          </div>
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "0.82rem", fontWeight: 800, color: "#059669" }}>
              🚀 Farklılaştırma: Enrichment (Zenginleştirme)
            </h4>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: "1.4" }}>
              {compilationResult.differentiationSupport.enrichment}
            </p>
          </div>
        </div>

        {/* Aksiyon Barı: Kaydet & Çıktı */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            padding: "14px 20px",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Seçilen MEB Kaynağı: <strong>MEB Ders Kitabı {compilationResult.selectedActivity.bookNo}</strong> ({compilationResult.selectedActivity.title})
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleSaveAsDailyPlan}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
              }}
            >
              <span>🎯</span>
              <span>Bu Akışı Resmî Günlük Planım (EK-6) Olarak Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
