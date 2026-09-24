/**
 * SmartDailyPlanWizard.tsx — MaarifOS 0.66.0 MEGA SÜRÜM
 * Adım Adım MEB TYMM 2026 Resmî Günlük Planlayıcı.
 * 
 * Görsel ve Mimari Standartlar (Norman, Tufte, Rams, Carmack, Torvalds):
 * - Sıfır Çift Scrollbar: İster tam sayfa inline ister tek-katman modal
 * - Canlı Pedagojik Süreç Bileşenleri: "TADB.1.a" gibi kuru kodlar yerine Türkçe açık yönergeler
 * - Dokunmatik Taktil Kartlar: Ham HTML checkbox yerine modern interaktif seçim kartları
 * - 528 MEB Basılı Ders Kitabı Etkinliği ile 1-tıkla otomatik form doldurma
 * - 60 FPS Sıvı Responsive Tasarım: Inter tipografi, kurumsal lacivert ve zümrüt yeşili palet
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  type DailyPlanRecord,
  type AgeGroup,
  createDailyPlan,
  createDailyPlanFromTextbook,
  upsertDailyPlan,
  CHILD_EVAL_PRESETS,
  PROGRAM_EVAL_PRESETS,
  TEACHER_EVAL_PRESETS,
} from "./daily-plan-core.ts";
import { generateDailyPlanWithAI } from "../../services/ai-plan-generator";
import {
  MEB_TEXTBOOK_ACTIVITIES,
  type TextbookActivityItem,
} from "./tymm-textbook-catalog.ts";
import {
  TENDENCY_CHIPS,
  SDB_CHIPS,
  VALUE_CHIPS,
  LITERACY_CHIPS,
  EK7_CONCEPT_GROUPS,
  TYMM_MATERIAL_CENTERS,
  LEARNING_ENVIRONMENTS,
  ACTIVITY_TYPES,
  PEDAGOGICAL_METHODS,
  GUNE_BASLAMA_PRESETS,
  BESLENME_TEMIZLIK_PRESETS,
  GECIS_STRATEJILERI,
  ENRICHMENT_STRATEGIES,
  SUPPORT_STRATEGIES,
  EVALUATION_QUESTION_BANK,
  FAMILY_COMMUNITY_OPTIONS,
  SPECIAL_DAYS_CATALOG,
  DOMAIN_GROUPS,
  SUB_SKILL_DESCRIPTIONS,
} from "./tymm-domain-chips.ts";
import { printOfficialFormA4, downloadOfficialFormWord } from "./official-form-export-service.ts";
import { triggerHaptic } from "../../core/haptics.ts";
import "./official-forms.css";

// ─── YARDIMCI BİLEŞENLER ─────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  accent?: "blue" | "green" | "purple" | "orange" | "red" | "teal" | "emerald";
  badge?: string;
  icon?: string;
}

function Chip({ label, selected, onClick, accent = "blue", badge, icon }: ChipProps) {
  return (
    <button
      type="button"
      className={`sdpw-chip chip-${accent} ${selected ? "sdpw-chip--selected" : ""}`}
      onClick={() => {
        triggerHaptic(8);
        onClick();
      }}
    >
      {icon && <span className="sdpw-chip__icon">{icon}</span>}
      <span className="sdpw-chip__indicator">{selected ? "✓" : "+"}</span>
      <span className="sdpw-chip__label">{label}</span>
      {badge && <span className="sdpw-chip__badge">{badge}</span>}
    </button>
  );
}

// ─── HAZIR TEMALAR VE ARAŞTIRMA SORULARI ─────────────────────────────────────
const PRESET_TOPICS = [
  { topic: "Doğa ve Canlılar: Böceklerin Gizli Dünyası", question: "Böcekler neden bitkilerin arasına saklanır?", domain: "Fen", icon: "🐞" },
  { topic: "Su Döngüsü: Yağmur Nereden Gelir?", question: "Bulutlar suyu gökyüzünde nasıl taşır?", domain: "Fen", icon: "🌧️" },
  { topic: "Taşıtlar ve Güvenli Yolculuk", question: "Tekerlekler olmasaydı araçlar nasıl hareket ederdi?", domain: "Matematik", icon: "🚗" },
  { topic: "Duygularımız ve Empati: Yüzüm Ne Anlatıyor?", question: "Üzgün bir arkadaşımızı nasıl neşelendirebiliriz?", domain: "Sosyal", icon: "🎭" },
  { topic: "Geometrik Şekillerle Mimari Yapılar", question: "Kare ve üçgen bloklarla en sağlam köprüyü nasıl kurarız?", domain: "Matematik", icon: "📐" },
  { topic: "Renklerin Dansı: Yeni Renkler Keşfediyoruz", question: "İki rengi karıştırdığımızda neden bambaşka bir renk ortaya çıkar?", domain: "Sanat", icon: "🎨" },
  { topic: "Bedenimiz ve Ritim: Kalbimizin Atışı", question: "Hızlı koştuğumuzda kalbimizin ritmi neden değişir?", domain: "Müzik", icon: "🥁" },
  { topic: "Tohumdan Ağaca: Yaşam Döngüsü", question: "Kuru bir tohum nasıl kocaman bir ağaca dönüşür?", domain: "Fen", icon: "🌱" },
  { topic: "Geri Dönüşüm ve Sıfır Atık Dedektifleri", question: "Kullanılmış kağıtları çöpe atmak yerine neye dönüştürebiliriz?", domain: "Sosyal", icon: "♻️" },
  { topic: "Uzay ve Gezegenler: Gökyüzünde Neler Var?", question: "Gündüz parlayan Güneş gece nereye gider?", domain: "Fen", icon: "🚀" },
  { topic: "Cumhuriyet ve Bayrağımız: Birlikte Güçlüyüz", question: "Bayrağımızdaki ay ve yıldız bize ne hissettirir?", domain: "Sosyal", icon: "🇹🇷" },
  { topic: "Sağlıklı Beslenme: Tabağımdaki Renkler", question: "Sebze ve meyveler neden farklı renklerdedir?", domain: "Sağlık", icon: "🍎" },
];

const STEPS = [
  { id: 1, title: "Künye & Tema", shortTitle: "Künye", icon: "📋" },
  { id: 2, title: "Alan Becerileri (EK-1)", shortTitle: "Beceriler", icon: "🎯" },
  { id: 3, title: "Eğilim & Değerler", shortTitle: "Değerler", icon: "💎" },
  { id: 4, title: "Kavram & Sözcük", shortTitle: "Kavramlar", icon: "🔤" },
  { id: 5, title: "Materyal & Ortam", shortTitle: "Materyal", icon: "🧱" },
  { id: 6, title: "Akış & Etkinlik", shortTitle: "Akış", icon: "⏰" },
  { id: 7, title: "Farklılaştırma (BEP)", shortTitle: "BEP", icon: "🛡️" },
  { id: 8, title: "Değerlendirme", shortTitle: "Değerlendirme", icon: "📊" },
];

const DOMAIN_ICONS: Record<string, string> = {
  turkce: "📖",
  matematik: "🔢",
  fen: "🔬",
  sosyal: "🤝",
  hareket: "🏃",
  sanat: "🎨",
  muzik: "🎵",
};

interface SmartDailyPlanWizardProps {
  onClose?: () => void;
  editPlan?: DailyPlanRecord;
  onSaved?: (plan: DailyPlanRecord) => void;
  isInline?: boolean;
}

export function SmartDailyPlanWizard({ onClose, editPlan, onSaved, isInline = true }: SmartDailyPlanWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [plan, setPlan] = useState<DailyPlanRecord>(() =>
    editPlan ?? createDailyPlan({ ageGroup: "60-72", date: new Date().toISOString().slice(0, 10) })
  );
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Arama filtreleri
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedCenterTab, setSelectedCenterTab] = useState("blok");
  const [selectedConceptTab, setSelectedConceptTab] = useState("renk");
  const [domainAccordion, setDomainAccordion] = useState<string>("turkce");

  // Güncelleme yardımcı fonksiyonu
  const updateField = useCallback(<K extends keyof DailyPlanRecord>(field: K, value: DailyPlanRecord[K]) => {
    setPlan((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Chip çoklu seçim toggle
  const toggleArrayItem = useCallback((field: keyof DailyPlanRecord, item: string) => {
    setPlan((prev) => {
      const arr = (prev[field] as string[]) || [];
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [field]: next };
    });
  }, []);

  // Yapay Zeka API Plan Üretimi Durumu
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenNotice, setAiGenNotice] = useState("");

  const handleGenerateWithAI = async (customPrompt?: string) => {
    const text = (customPrompt || aiPrompt).trim();
    if (!text) {
      setAiGenNotice("Lütfen yapay zekaya plan yazdırmak için bir konu veya tema giriniz.");
      return;
    }
    setIsGeneratingAI(true);
    setAiGenNotice("⏳ Yapay Zeka API'si MEB 2026 EK-6 formatında planınızı üretiyor...");
    try {
      const generated = await generateDailyPlanWithAI({
        prompt: text,
        ageGroup: plan.ageGroup,
        date: plan.date,
        schoolName: plan.schoolName,
        teacherName: plan.teacherName,
      });
      setPlan(generated);
      setAiGenNotice(`✅ "${generated.topic}" başarıyla üretildi ve tüm adımlara yerleştirildi!`);
      triggerHaptic(30);
    } catch (err: any) {
      setAiGenNotice(`❌ Hata: ${err.message || "Plan üretilemedi"}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Kaydetme işlemi
  const handleSave = () => {
    try {
      upsertDailyPlan(plan);
      setSaveStatus("✅ Günlük Plan başarıyla kaydedildi! EK-15 matrisi ve Aylık Plan otomatik güncellendi.");
      triggerHaptic(25);
      if (onSaved) onSaved(plan);
      setTimeout(() => setSaveStatus(""), 4000);
    } catch (err) {
      setSaveStatus("❌ Kaydedilirken bir hata oluştu.");
    }
  };

  useEffect(() => {
    if (editPlan) {
      setPlan(editPlan);
      setCurrentStep(1);
    }
  }, [editPlan]);

  // MEB Ders Kitabı Seçici Modal Durumu
  const [showTextbookModal, setShowTextbookModal] = useState(false);
  const [textbookModalSearch, setTextbookModalSearch] = useState("");
  const [textbookModalAge, setTextbookModalAge] = useState<"all" | AgeGroup>("all");

  const filteredModalActivities = useMemo(() => {
    const q = textbookModalSearch.trim().toLowerCase();
    return MEB_TEXTBOOK_ACTIVITIES.filter((act) => {
      if (textbookModalAge !== "all" && act.ageGroup !== textbookModalAge) return false;
      if (q) {
        return (
          act.title.toLowerCase().includes(q) ||
          act.text.toLowerCase().includes(q) ||
          act.domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [textbookModalSearch, textbookModalAge]);

  const handleSelectTextbookActivity = (act: TextbookActivityItem) => {
    const populated = createDailyPlanFromTextbook(act, plan.date);
    setPlan(populated);
    setShowTextbookModal(false);
    triggerHaptic(20);
  };

  // ─── ADIM 1: KÜNYE & TEMA ──────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="sdpw-step-body">
      {/* ─── 1-TIKLA YAPAY ZEKA API İLE EK-6 PLAN ÜRETİCİ ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(2, 132, 199, 0.12) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          borderRadius: "14px",
          padding: "16px 20px",
          marginBottom: "16px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>🤖</span>
            <div>
              <strong style={{ fontSize: "0.98rem", color: "#38bdf8", display: "block" }}>
                Yapay Zeka API ile 1-Tıkla Resmî EK-6 Planı Üret
              </strong>
              <small style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                Konuyu yazın; Gemini, DeepSeek veya Dahili Zeka tüm alan becerileri, kavramlar ve sorularla doldursun
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("maarif_open_api_config"))}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#e2e8f0",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚡ API Ayarları
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Örn: Sonbahar yaprakları ile ritmik sayma ve drama, Cumhuriyet Bayramı..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateWithAI()}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              background: "#070d18",
              color: "#ffffff",
              fontSize: "0.88rem",
            }}
          />
          <button
            type="button"
            disabled={isGeneratingAI}
            onClick={() => handleGenerateWithAI()}
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: isGeneratingAI ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
              whiteSpace: "nowrap",
            }}
          >
            {isGeneratingAI ? "⏳ Üretiliyor..." : "✨ API ile Planı Üret"}
          </button>
        </div>

        {/* Hızlı Öneri Çipleri */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
          <small style={{ color: "#94a3b8", fontSize: "0.72rem", alignSelf: "center", marginRight: "4px" }}>Hızlı Temalar:</small>
          {[
            "🍂 Sonbahar ve Ritmik Sayma",
            "🇹🇷 29 Ekim Cumhuriyet Bayramı",
            "🍎 Sağlıklı Beslenme ve C Vitamini",
            "🚀 Uzay ve Gökyüzü Keşfi",
            "🌊 Deniz Canlıları ve Çevre",
          ].map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => {
                setAiPrompt(theme);
                handleGenerateWithAI(theme);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              {theme}
            </button>
          ))}
        </div>

        {aiGenNotice && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              background: aiGenNotice.startsWith("✅")
                ? "rgba(16, 185, 129, 0.15)"
                : aiGenNotice.startsWith("⏳")
                ? "rgba(2, 132, 199, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              color: aiGenNotice.startsWith("✅")
                ? "#34d399"
                : aiGenNotice.startsWith("⏳")
                ? "#38bdf8"
                : "#f87171",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {aiGenNotice}
          </div>
        )}
      </div>

      {/* 528 MEB Ders Kitabı Hızlı Yükleyici Banner */}
      <div className="sdpw-hero-banner">
        <div className="sdpw-hero-banner-content">
          <span className="sdpw-hero-pill">Resmî Müfredat Envanteri</span>
          <h3 className="sdpw-hero-title">📚 528 MEB Çekirdek Kitap Etkinliğinden 1-Tıkla Doldur</h3>
          <p className="sdpw-hero-desc">
            3, 4 ve 5 yaş MEB basılı ders kitaplarındaki gerçek etkinlikleri seçin; tüm materyaller, kavramlar, değerler ve sorular anında dolsun!
          </p>
        </div>
        <button
          type="button"
          className="sdpw-hero-btn"
          onClick={() => setShowTextbookModal(true)}
        >
          🔍 Etkinlik Seç (528)
        </button>
      </div>

      {/* MEB Etkinlik Seçici Modal */}
      {showTextbookModal && (
        <div className="sdpw-modal-overlay">
          <div className="sdpw-modal-card">
            <div className="sdpw-modal-header">
              <div>
                <h3>📚 MEB 9 Çekirdek Ders Kitabı Etkinlik Havuzu</h3>
                <p>Seçtiğiniz etkinlik künyesi, materyalleri ve kavramlarıyla doğrudan plana aktarılır.</p>
              </div>
              <button
                type="button"
                className="sdpw-modal-close"
                onClick={() => setShowTextbookModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Arama & Yaş Filtresi */}
            <div className="sdpw-modal-filter-row">
              <select
                value={textbookModalAge}
                onChange={(e) => setTextbookModalAge(e.target.value as "all" | AgeGroup)}
                className="sdpw-select"
              >
                <option value="all">Tüm Yaşlar (528)</option>
                <option value="36-48">36–48 Ay (112)</option>
                <option value="48-60">48–60 Ay (148)</option>
                <option value="60-72">60–72 Ay (268)</option>
              </select>

              <input
                type="text"
                placeholder="Etkinlik adı veya kavram ara... (Örn: yunuslar, böcekler, daire)"
                value={textbookModalSearch}
                onChange={(e) => setTextbookModalSearch(e.target.value)}
                className="sdpw-input"
                style={{ flex: 1 }}
              />
              <span className="sdpw-badge-info">
                Bulunan: {filteredModalActivities.length}
              </span>
            </div>

            {/* Liste */}
            <div className="sdpw-modal-list">
              {filteredModalActivities.slice(0, 60).map((act) => (
                <div key={act.id} className="sdpw-modal-item">
                  <div style={{ flex: 1 }}>
                    <div className="sdpw-modal-item-tags">
                      <span className="badge-age">{act.ageGroup} Ay</span>
                      <span className="badge-book">Kitap {act.bookNo} · S.{act.pageNo}</span>
                      <span className="badge-domain">{act.domain}</span>
                    </div>
                    <strong className="sdpw-modal-item-title">{act.title}</strong>
                    <div className="sdpw-modal-item-q">❓ {act.researchQuestion}</div>
                    <div className="sdpw-modal-item-meta">
                      <strong>Materyaller:</strong> {act.materials.join(", ")} · <strong>Kavramlar:</strong> {act.concepts.join(", ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="sdpw-action-primary-btn"
                    onClick={() => handleSelectTextbookActivity(act)}
                  >
                    ⚡ Plana Aktar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">📋</div>
        <div>
          <h3 className="sdpw-step-title">Adım 1: Künye, Günün Teması ve Araştırma Sorusu</h3>
          <p className="sdpw-hint">Tarih, yaş grubu ve günün odak araştırmasını belirleyin. Dilerseniz hazır temalardan tek dokunuşla seçin.</p>
        </div>
      </div>

      <div className="of-grid-4" style={{ marginBottom: "16px" }}>
        <div className="of-field">
          <label>Tarih:</label>
          <input
            type="date"
            value={plan.date}
            onChange={(e) => updateField("date", e.target.value)}
            className="sdpw-input"
          />
        </div>
        <div className="of-field">
          <label>Yaş Grubu:</label>
          <select
            value={plan.ageGroup}
            onChange={(e) => updateField("ageGroup", e.target.value as AgeGroup)}
            className="sdpw-select"
          >
            <option value="36-48">36–48 Ay</option>
            <option value="48-60">48–60 Ay</option>
            <option value="60-72">60–72 Ay</option>
          </select>
        </div>
        <div className="of-field">
          <label>Okul Adı:</label>
          <input
            type="text"
            value={plan.schoolName}
            onChange={(e) => updateField("schoolName", e.target.value)}
            className="sdpw-input"
          />
        </div>
        <div className="of-field">
          <label>Öğretmen Adı:</label>
          <input
            type="text"
            value={plan.teacherName}
            onChange={(e) => updateField("teacherName", e.target.value)}
            className="sdpw-input"
          />
        </div>
      </div>

      {/* Hazır TYMM Temaları Grid */}
      <div className="sdpw-section">
        <label className="sdpw-section-title">✨ Hazır TYMM Temaları ve Araştırma Soruları (Tıkla ve Uygula):</label>
        <div className="sdpw-preset-grid">
          {PRESET_TOPICS.map((pt, idx) => (
            <button
              key={idx}
              type="button"
              className={`sdpw-preset-card-v2 ${plan.topic === pt.topic ? "is-selected" : ""}`}
              onClick={() => {
                updateField("topic", pt.topic);
                updateField("researchQuestion", pt.question);
                triggerHaptic(12);
              }}
            >
              <div className="preset-card-icon">{pt.icon}</div>
              <div className="preset-card-text">
                <strong>{pt.topic}</strong>
                <small>❓ "{pt.question}"</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="of-grid-2" style={{ marginTop: "12px" }}>
        <div className="of-field">
          <label>Günün Konusu / Teması:</label>
          <input
            type="text"
            placeholder="Örn: Taşıtlar ve Güvenli Yolculuk"
            value={plan.topic}
            onChange={(e) => updateField("topic", e.target.value)}
            className="sdpw-input"
          />
        </div>
        <div className="of-field">
          <label>Günün Araştırma / Merak Sorusu:</label>
          <input
            type="text"
            placeholder="Örn: Tren rayların üzerinde nasıl dengede durur?"
            value={plan.researchQuestion}
            onChange={(e) => updateField("researchQuestion", e.target.value)}
            className="sdpw-input"
          />
        </div>
      </div>

      {/* Belirli Gün ve Haftalar */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">📅 Belirli Gün ve Hafta (Varsa Seçin):</label>
        <div className="sdpw-chip-grid">
          {SPECIAL_DAYS_CATALOG.map((sd) => (
            <Chip
              key={sd.code}
              label={sd.name}
              badge={sd.dateRange}
              selected={plan.specialDayCodes.includes(sd.code)}
              onClick={() => toggleArrayItem("specialDayCodes", sd.code)}
              accent="red"
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ─── ADIM 2: ALAN BECERİLERİ (EK-1) ────────────────────────────────────────
  const renderStep2 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">🎯</div>
        <div>
          <h3 className="sdpw-step-title">Adım 2: Alan Becerileri ve Süreç Bileşenleri (EK-1)</h3>
          <p className="sdpw-hint">
            TYMM 7 Gelişim Alanı kazanımlarını ve alt süreç bileşenlerini tıklayarak seçin.
            Seçtiğiniz beceriler EK-15 kontrol çizelgesine anında yeşil tik olarak işlenir.
          </p>
        </div>
      </div>

      {/* Alan Sekmeleri (Segmented Tabs with Badges) */}
      <div className="sdpw-domain-tabs-nav">
        {DOMAIN_GROUPS.map((dg) => {
          const selectedInDomain = plan.domainCodes.filter((c) => dg.skills.some((s) => s.code === c)).length;
          const isActive = domainAccordion === dg.id;
          return (
            <button
              key={dg.id}
              type="button"
              className={`sdpw-domain-nav-tab ${isActive ? "is-active" : ""} domain-${dg.id}`}
              onClick={() => {
                setDomainAccordion(dg.id);
                triggerHaptic(8);
              }}
            >
              <span className="domain-nav-icon">{DOMAIN_ICONS[dg.id] || "📌"}</span>
              <span className="domain-nav-name">{dg.name}</span>
              {selectedInDomain > 0 && (
                <span className="domain-nav-badge">{selectedInDomain}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seçili Alanın Becerileri - Modern Card Gridi */}
      {DOMAIN_GROUPS.filter((dg) => dg.id === domainAccordion).map((dg) => (
        <div key={dg.id} className="sdpw-skills-container">
          <div className="sdpw-skills-grid">
            {dg.skills.map((skill) => {
              const isSkillSelected = plan.domainCodes.includes(skill.code);
              const selectedProcessCount = skill.processComponents.filter((pc) => plan.processCodes.includes(pc)).length;

              return (
                <div
                  key={skill.code}
                  className={`sdpw-skill-card-v2 ${isSkillSelected ? "is-selected" : ""}`}
                >
                  <div
                    className="skill-card-header"
                    onClick={() => {
                      toggleArrayItem("domainCodes", skill.code);
                      triggerHaptic(12);
                    }}
                  >
                    <div className="skill-card-code-col">
                      <span className="skill-code-badge">{skill.code}</span>
                    </div>

                    <div className="skill-card-text-col">
                      <h4 className="skill-card-title">{skill.label}</h4>
                      <small className="skill-card-meta">
                        {skill.processComponents.length} süreç bileşeni · {selectedProcessCount > 0 ? `✓ ${selectedProcessCount} seçildi` : "Henüz seçilmedi"}
                      </small>
                    </div>

                    <button
                      type="button"
                      className={`skill-select-toggle ${isSkillSelected ? "selected" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArrayItem("domainCodes", skill.code);
                        triggerHaptic(12);
                      }}
                    >
                      {isSkillSelected ? "✓ Hedeflendi" : "+ Seç"}
                    </button>
                  </div>

                  {/* Süreç bileşenleri (Pill Tiles) */}
                  <div className="skill-subcomponents-area">
                    <span className="subcomponents-label">Süreç Bileşenleri (Açık Yönergeler):</span>
                    <div className="subcomponents-chips-grid">
                      {skill.processComponents.map((pc) => {
                        const isPcSelected = plan.processCodes.includes(pc);
                        const desc = SUB_SKILL_DESCRIPTIONS[pc] || pc;
                        return (
                          <button
                            key={pc}
                            type="button"
                            className={`subcomponent-chip ${isPcSelected ? "is-active" : ""}`}
                            onClick={() => {
                              toggleArrayItem("processCodes", pc);
                              // Eğer ana beceri seçili değilse, alt süreç seçildiğinde ana beceriyi de otomatik ekle!
                              if (!plan.domainCodes.includes(skill.code)) {
                                toggleArrayItem("domainCodes", skill.code);
                              }
                              triggerHaptic(10);
                            }}
                          >
                            <span className="chip-indicator">{isPcSelected ? "✓" : "○"}</span>
                            <strong className="chip-code">{pc}</strong>
                            <span className="chip-desc">{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── ADIM 3: EĞİLİMLER & DEĞERLER ──────────────────────────────────────────
  const renderStep3 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">💎</div>
        <div>
          <h3 className="sdpw-step-title">Adım 3: Eğilimler, Değerler ve Sosyal-Duygusal Beceriler</h3>
          <p className="sdpw-hint">TYMM'nin kalbi olan 21 Eğilim, 20 Değer ve 9 Sosyal-Duygusal Öğrenme Becerisinden hedeflenenleri tıklayın.</p>
        </div>
      </div>

      {/* 21 Eğilim */}
      <div className="sdpw-section">
        <label className="sdpw-section-title">🧭 Eğilimler (EK-13 - 21 Eğilim):</label>
        <div className="sdpw-chip-grid">
          {TENDENCY_CHIPS.map((t) => (
            <Chip
              key={t.code}
              label={`${t.code} ${t.label}`}
              badge={t.category}
              selected={plan.tendencyCodes.includes(t.code)}
              onClick={() => toggleArrayItem("tendencyCodes", t.code)}
              accent="blue"
            />
          ))}
        </div>
      </div>

      {/* Sosyal Duygusal Beceriler */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🤝 Sosyal-Duygusal Öğrenme Becerileri (SDB1 - SDB3):</label>
        <div className="sdpw-chip-grid">
          {SDB_CHIPS.map((s) => (
            <Chip
              key={s.code}
              label={`${s.code} ${s.label}`}
              selected={plan.sdbCodes.includes(s.code)}
              onClick={() => toggleArrayItem("sdbCodes", s.code)}
              accent="purple"
            />
          ))}
        </div>
      </div>

      {/* 20 Millî ve Manevi Değer */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">💎 Erdem-Değer-Eylem Çerçevesi (EK-12 - 20 Değer):</label>
        <div className="sdpw-chip-grid">
          {VALUE_CHIPS.map((v) => (
            <Chip
              key={v.code}
              label={`${v.code} ${v.label}`}
              selected={plan.valueCodes.includes(v.code)}
              onClick={() => toggleArrayItem("valueCodes", v.code)}
              accent="emerald"
            />
          ))}
        </div>
      </div>

      {/* Okuryazarlık Becerileri */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">📚 Programlar Arası Okuryazarlık Becerileri (OB1 - OB8):</label>
        <div className="sdpw-chip-grid">
          {LITERACY_CHIPS.map((ob) => (
            <Chip
              key={ob.code}
              label={`${ob.code} ${ob.label}`}
              selected={plan.literacyCodes.includes(ob.code)}
              onClick={() => toggleArrayItem("literacyCodes", ob.code)}
              accent="teal"
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ─── ADIM 4: KAVRAMLAR & SÖZCÜKLER ──────────────────────────────────────────
  const renderStep4 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">🔤</div>
        <div>
          <h3 className="sdpw-step-title">Adım 4: EK-7 Kavram Havuzu ve Sözcük Dağarcığı</h3>
          <p className="sdpw-hint">10 Kategorideki 180+ resmî TTKB kavramından hedeflenenleri tıklayın.</p>
        </div>
      </div>

      {/* 10 Kategori Sekmesi */}
      <div className="sdpw-tabs-row">
        {EK7_CONCEPT_GROUPS.map((cg) => {
          const selectedInCat = plan.conceptLabels.filter((c) => cg.concepts.includes(c)).length;
          return (
            <button
              key={cg.category}
              type="button"
              className={`sdpw-tab-btn ${selectedConceptTab === cg.category ? "is-active" : ""}`}
              onClick={() => setSelectedConceptTab(cg.category)}
            >
              {cg.title} {selectedInCat > 0 && <span className="sdpw-tab-count">{selectedInCat}</span>}
            </button>
          );
        })}
      </div>

      {/* Seçilen Kategorinin Kavramları */}
      {EK7_CONCEPT_GROUPS.filter((cg) => cg.category === selectedConceptTab).map((cg) => (
        <div key={cg.category} className="sdpw-section" style={{ marginTop: "12px" }}>
          <div className="sdpw-chip-grid">
            {cg.concepts.map((concept) => (
              <Chip
                key={concept}
                label={concept}
                selected={plan.conceptLabels.includes(concept)}
                onClick={() => toggleArrayItem("conceptLabels", concept)}
                accent="orange"
              />
            ))}
          </div>
        </div>
      ))}

      {/* Sözcük ve Kavram Notu */}
      <div className="of-field" style={{ marginTop: "16px" }}>
        <label>Günün Yeni / Hedef Sözcükleri (Virgülle ayırın):</label>
        <input
          type="text"
          placeholder="Örn: Kamuflaj, mikroskop, habitat, ekosistem..."
          value={plan.words}
          onChange={(e) => updateField("words", e.target.value)}
          className="sdpw-input"
        />
      </div>
    </div>
  );

  // ─── ADIM 5: MATERYAL SANDIĞI & ÖĞRENME ORTAMLARI ──────────────────────────
  const renderStep5 = () => {
    const activeCenter = TYMM_MATERIAL_CENTERS.find((c) => c.id === selectedCenterTab);
    const filteredMaterials = activeCenter
      ? activeCenter.materials.filter((m) =>
          materialSearch ? m.toLowerCase().includes(materialSearch.toLowerCase()) : true
        )
      : [];

    return (
      <div className="sdpw-step-body">
        <div className="sdpw-step-hero">
          <div className="sdpw-step-hero-icon">🧱</div>
          <div>
            <h3 className="sdpw-step-title">Adım 5: 9 Öğrenme Merkezi ve 240+ Materyal Sandığı</h3>
            <p className="sdpw-hint">Merkezleri ve etkinlikte kullanılacak somut materyalleri seçin.</p>
          </div>
        </div>

        {/* Seçilen Materyaller Tepsisi */}
        {plan.materialLabels.length > 0 && (
          <div className="sdpw-selected-shelf">
            <span className="shelf-title">🎒 Seçilen Materyaller ({plan.materialLabels.length}):</span>
            <div className="shelf-chips">
              {plan.materialLabels.map((mat) => (
                <span key={mat} className="shelf-chip" onClick={() => toggleArrayItem("materialLabels", mat)}>
                  {mat} <small>✕</small>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Merkez Sekmeleri */}
        <div className="sdpw-tabs-row">
          {TYMM_MATERIAL_CENTERS.map((mc) => {
            const count = plan.materialLabels.filter((m) => mc.materials.includes(m)).length;
            return (
              <button
                key={mc.id}
                type="button"
                className={`sdpw-tab-btn ${selectedCenterTab === mc.id ? "is-active" : ""}`}
                onClick={() => setSelectedCenterTab(mc.id)}
              >
                <span>{mc.icon}</span>
                <span>{mc.name}</span>
                {count > 0 && <span className="sdpw-tab-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Arama Kutusu */}
        <div className="sdpw-search-box">
          <input
            type="text"
            placeholder={`${activeCenter?.name || "Merkez"} içinde materyal ara...`}
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            className="sdpw-input"
          />
          {materialSearch && (
            <button
              type="button"
              className="sdpw-clear-btn"
              onClick={() => setMaterialSearch("")}
            >
              Temizle
            </button>
          )}
        </div>

        {/* Materyal Chip Gridi */}
        <div className="sdpw-chip-grid">
          {filteredMaterials.map((mat) => (
            <Chip
              key={mat}
              label={mat}
              selected={plan.materialLabels.includes(mat)}
              onClick={() => toggleArrayItem("materialLabels", mat)}
              accent="purple"
            />
          ))}
        </div>

        {/* Öğrenme Ortamları */}
        <div className="sdpw-section" style={{ marginTop: "20px" }}>
          <label className="sdpw-section-title">🏞️ Öğrenme Ortamı (Sınıf İçi, Açık Hava veya Okul Dışı):</label>
          <div className="sdpw-chip-grid">
            {LEARNING_ENVIRONMENTS.map((env) => (
              <Chip
                key={env.id}
                label={env.name}
                selected={plan.learningEnvLabels.includes(env.name)}
                onClick={() => toggleArrayItem("learningEnvLabels", env.name)}
                accent="green"
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── ADIM 6: GÜNÜN AKIŞI, RUTİNLER & ETKİNLİK PLANI ───────────────────────
  const renderStep6 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">⏰</div>
        <div>
          <h3 className="sdpw-step-title">Adım 6: Günün Akışı, 4 Resmî Rutin ve Etkinlik Planı</h3>
          <p className="sdpw-hint">Güne Başlama, Merkezler, Beslenme ve Geçiş stratejilerini belirleyin.</p>
        </div>
      </div>

      {/* Rutin 1: Güne Başlama */}
      <div className="sdpw-section">
        <label className="sdpw-section-title">🌅 Rutin 1: Güne Başlama Zamanı Stratejisi:</label>
        <div className="sdpw-preset-list">
          {GUNE_BASLAMA_PRESETS.map((gb) => (
            <div
              key={gb.id}
              className={`sdpw-preset-row ${plan.routineStartingDayId === gb.id ? "is-selected" : ""}`}
              onClick={() => {
                updateField("routineStartingDayId", gb.id);
                triggerHaptic(10);
              }}
            >
              <input
                type="radio"
                checked={plan.routineStartingDayId === gb.id}
                readOnly
              />
              <div>
                <strong>{gb.title}</strong>
                <p>{gb.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rutin 2: Merkez Seçimleri */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🧱 Rutin 2: Bugün Açık Olan Öğrenme Merkezleri:</label>
        <div className="sdpw-chip-grid">
          {TYMM_MATERIAL_CENTERS.map((mc) => (
            <Chip
              key={mc.id}
              label={`${mc.icon} ${mc.name}`}
              selected={plan.selectedCenters.includes(mc.id)}
              onClick={() => toggleArrayItem("selectedCenters", mc.id)}
              accent="blue"
            />
          ))}
        </div>
      </div>

      {/* Rutin 3: Beslenme & Temizlik */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🍎 Rutin 3: Beslenme, Öz Bakım ve Sıfır Atık:</label>
        <div className="sdpw-preset-list">
          {BESLENME_TEMIZLIK_PRESETS.map((bt) => (
            <div
              key={bt.id}
              className={`sdpw-preset-row ${plan.routineSnackCleanId === bt.id ? "is-selected" : ""}`}
              onClick={() => {
                updateField("routineSnackCleanId", bt.id);
                triggerHaptic(10);
              }}
            >
              <input
                type="radio"
                checked={plan.routineSnackCleanId === bt.id}
                readOnly
              />
              <div>
                <strong>{bt.title}</strong>
                <p>{bt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rutin 4: Geçiş Stratejisi */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🔄 Rutin 4: Merkezler ve Etkinlikler Arası Geçiş:</label>
        <div className="sdpw-preset-list">
          {GECIS_STRATEJILERI.map((gc) => (
            <div
              key={gc.id}
              className={`sdpw-preset-row ${plan.routineTransitionId === gc.id ? "is-selected" : ""}`}
              onClick={() => {
                updateField("routineTransitionId", gc.id);
                triggerHaptic(10);
              }}
            >
              <input
                type="radio"
                checked={plan.routineTransitionId === gc.id}
                readOnly
              />
              <div>
                <strong>{gc.title}</strong>
                <p>{gc.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Etkinlik Yöntem ve Teknikleri */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🎲 Pedagojik Öğretim Yöntem ve Teknikleri:</label>
        <div className="sdpw-chip-grid">
          {PEDAGOGICAL_METHODS.map((pm) => (
            <Chip
              key={pm.id}
              label={pm.name}
              selected={plan.pedagogicalMethods.includes(pm.id)}
              onClick={() => toggleArrayItem("pedagogicalMethods", pm.id)}
              accent="emerald"
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ─── ADIM 7: FARKLILAŞTIRMA & AİLE KATILIMI ─────────────────────────────────
  const renderStep7 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">🛡️</div>
        <div>
          <h3 className="sdpw-step-title">Adım 7: Farklılaştırma (Zenginleştirme & Destekleme) ve Aile Katılımı</h3>
          <p className="sdpw-hint">Bireysel farklılıklara yönelik BEP destekleme ve ileri düzey zenginleştirme stratejilerini seçin.</p>
        </div>
      </div>

      {/* Zenginleştirme */}
      <div className="sdpw-section">
        <label className="sdpw-section-title">🚀 Zenginleştirme Stratejileri (İleri Düzey / Hızlı Öğrenen):</label>
        <div className="sdpw-preset-list">
          {ENRICHMENT_STRATEGIES.map((es) => (
            <div
              key={es.id}
              className={`sdpw-preset-row ${plan.enrichmentStrategies.includes(es.title) ? "is-selected" : ""}`}
              onClick={() => {
                toggleArrayItem("enrichmentStrategies", es.title);
                triggerHaptic(10);
              }}
            >
              <input
                type="checkbox"
                checked={plan.enrichmentStrategies.includes(es.title)}
                readOnly
              />
              <div>
                <strong>{es.title}</strong>
                <p>{es.strategy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Destekleme (BEP) */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🛡️ Destekleme Stratejileri (Özel Gereksinim / Ek Desteğe İhtiyaç Duyan):</label>
        <div className="sdpw-preset-list">
          {SUPPORT_STRATEGIES.map((ss) => (
            <div
              key={ss.id}
              className={`sdpw-preset-row ${plan.supportStrategies.includes(ss.title) ? "is-selected" : ""}`}
              onClick={() => {
                toggleArrayItem("supportStrategies", ss.title);
                triggerHaptic(10);
              }}
            >
              <input
                type="checkbox"
                checked={plan.supportStrategies.includes(ss.title)}
                readOnly
              />
              <div>
                <strong>{ss.title}</strong>
                <p>{ss.strategy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aile ve Toplum Katılımı */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">🏡 Aile ve Toplum Katılımı Etkinlikleri:</label>
        <div className="sdpw-preset-list">
          {FAMILY_COMMUNITY_OPTIONS.map((fco) => (
            <div
              key={fco.id}
              className={`sdpw-preset-row ${
                plan.familyParticipationId === fco.id || plan.communityParticipationId === fco.id ? "is-selected" : ""
              }`}
              onClick={() => {
                if (fco.type === "aile") updateField("familyParticipationId", fco.id);
                else updateField("communityParticipationId", fco.id);
                triggerHaptic(10);
              }}
            >
              <input
                type="radio"
                checked={plan.familyParticipationId === fco.id || plan.communityParticipationId === fco.id}
                readOnly
              />
              <div>
                <strong>[{fco.type.toLocaleUpperCase("tr-TR")}] {fco.title}</strong>
                <p>{fco.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── ADIM 8: GÜNÜ DEĞERLENDİRME & YANSITMA ──────────────────────────────────
  const renderStep8 = () => (
    <div className="sdpw-step-body">
      <div className="sdpw-step-hero">
        <div className="sdpw-step-hero-icon">📊</div>
        <div>
          <h3 className="sdpw-step-title">Adım 8: Günü Değerlendirme Çemberi ve Plan Kapsam Özeti</h3>
          <p className="sdpw-hint">Çocuk değerlendirme çemberi sorularını seçin, öğretmen ve program yansıtmasını onaylayarak planı kaydedin.</p>
        </div>
      </div>

      {/* 4 Boyutlu Çocuk Çember Soruları */}
      <div className="sdpw-section">
        <label className="sdpw-section-title">⭕ Günü Değerlendirme Çemberi Soru Bankası (4 Boyut):</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
          {EVALUATION_QUESTION_BANK.map((group) => (
            <div key={group.category} style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ fontSize: "0.85rem", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                {group.title}
              </strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.questions.map((q, qIdx) => {
                  const isSelected = plan.selectedEvalQuestions.includes(q);
                  return (
                    <div
                      key={qIdx}
                      className={`sdpw-preset-row ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        toggleArrayItem("selectedEvalQuestions", q);
                        triggerHaptic(10);
                      }}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <span style={{ color: isSelected ? "#0284c7" : "#94a3b8", fontWeight: 700 }}>
                        {isSelected ? "✓" : "○"}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: isSelected ? "#0f172a" : "#475569" }}>
                        {q}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Çocuk Değerlendirme Notu */}
      <div className="sdpw-section" style={{ marginTop: "16px" }}>
        <label className="sdpw-section-title">👶 Çocuk Açısından Değerlendirme Hazır Notu:</label>
        <div className="sdpw-preset-list">
          {CHILD_EVAL_PRESETS.map((note, idx) => (
            <div
              key={idx}
              className={`sdpw-preset-row ${plan.childEvalPreset === idx ? "is-selected" : ""}`}
              onClick={() => {
                updateField("childEvalPreset", idx);
                triggerHaptic(10);
              }}
            >
              <input type="radio" checked={plan.childEvalPreset === idx} readOnly />
              <p style={{ margin: 0, fontSize: "0.82rem" }}>{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Kapsam Özeti Kartı */}
      <div className="sdpw-summary-box">
        <h4>📋 Günlük Plan Kapsam Matrisi (Otomatik EK-15 Dağılımı):</h4>
        <div className="sdpw-summary-grid">
          <div>🎯 <strong>Alan Becerileri:</strong> {plan.domainCodes.join(", ") || "—"}</div>
          <div>⚙️ <strong>Süreç Bileşenleri:</strong> {plan.processCodes.join(", ") || "—"}</div>
          <div>🧭 <strong>Eğilimler:</strong> {plan.tendencyCodes.join(", ") || "—"}</div>
          <div>🤝 <strong>SDB:</strong> {plan.sdbCodes.join(", ") || "—"}</div>
          <div>💎 <strong>Değerler:</strong> {plan.valueCodes.join(", ") || "—"}</div>
          <div>📚 <strong>Okuryazarlık:</strong> {plan.literacyCodes.join(", ") || "—"}</div>
          <div>🔤 <strong>Kavramlar:</strong> {plan.conceptLabels.slice(0, 5).join(", ") || "—"}</div>
          <div>🧱 <strong>Materyaller:</strong> {plan.materialLabels.slice(0, 5).join(", ") || "—"}</div>
        </div>
      </div>
    </div>
  );

  const wizardContent = (
    <div className="sdpw-workspace-surface">
      {/* Üst Başlık & Eylem Çubuğu */}
      <header className="sdpw-header">
        <div className="sdpw-title-row">
          <div className="sdpw-header-titles">
            <span className="sdpw-subbadge">MEB TTKB 2026 · EK-6</span>
            <h2 className="sdpw-main-title">
              Resmî Günlük Planlayıcı (EK-6)
            </h2>
            <div className="sdpw-header-tags">
              <span className="tag-date">📅 {plan.date}</span>
              <span className="tag-age">👶 {plan.ageGroup} Ay</span>
              <span className="tag-topic">🎯 {plan.topic || "Konu seçilmedi"}</span>
            </div>
          </div>

          <div className="sdpw-header-actions">
            <button
              type="button"
              className="sdpw-btn-save"
              onClick={handleSave}
            >
              💾 Kaydet & Matrise İşle
            </button>
            <button
              type="button"
              className="sdpw-btn-print"
              onClick={() => printOfficialFormA4(`EK-6_Gunluk_Plan_${plan.date}`)}
            >
              🖨️ A4 Yazdır
            </button>
            <button
              type="button"
              className="sdpw-btn-word"
              onClick={() => downloadOfficialFormWord("SmartDailyPlanWizard")}
            >
              📥 Word İndir
            </button>
            {onClose && (
              <button
                type="button"
                className="sdpw-btn-close"
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="sdpw-progress-container">
          <div className="sdpw-progress-info">
            <span>Adım <strong>{currentStep}</strong> / {STEPS.length}: {STEPS[currentStep - 1].title}</span>
            <span>%{Math.round((currentStep / STEPS.length) * 100)} Tamamlandı</span>
          </div>
          <div className="sdpw-progress-track">
            <div
              className="sdpw-progress-bar"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Adım Göstergesi (Steppers) */}
        <div className="sdpw-stepper-bar">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sdpw-stepper-btn ${currentStep === s.id ? "is-active" : ""} ${currentStep > s.id ? "is-done" : ""}`}
              onClick={() => {
                triggerHaptic(10);
                setCurrentStep(s.id);
              }}
            >
              <span className="sdpw-stepper-num">{currentStep > s.id ? "✓" : s.id}</span>
              <span className="sdpw-stepper-icon">{s.icon}</span>
              <span className="sdpw-stepper-text">{s.shortTitle}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Durum Bildirimi */}
      {saveStatus && (
        <div className="sdpw-status-banner" role="status">
          {saveStatus}
        </div>
      )}

      {/* Gövde */}
      <div className="sdpw-content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderStep7()}
        {currentStep === 8 && renderStep8()}
      </div>

      {/* Footer Navigasyon */}
      <footer className="sdpw-footer">
        <button
          type="button"
          className="sdpw-nav-btn prev"
          disabled={currentStep === 1}
          onClick={() => {
            triggerHaptic(10);
            setCurrentStep((p) => Math.max(1, p - 1));
          }}
        >
          ← Önceki Adım
        </button>

        <span className="sdpw-footer-step-text">
          Adım <strong>{currentStep}</strong> / {STEPS.length}
        </span>

        {currentStep < STEPS.length ? (
          <button
            type="button"
            className="sdpw-nav-btn next"
            onClick={() => {
              triggerHaptic(10);
              setCurrentStep((p) => Math.min(STEPS.length, p + 1));
            }}
          >
            Sonraki Adım →
          </button>
        ) : (
          <button
            type="button"
            className="sdpw-nav-btn complete"
            onClick={handleSave}
          >
            ✅ Planı Tamamla & Kaydet
          </button>
        )}
      </footer>

    </div>
  );

  if (onClose && !isInline) {
    return (
      <div className="sdpw-modal-overlay">
        <div className="sdpw-modal-dialog">
          {wizardContent}
        </div>
      </div>
    );
  }

  return wizardContent;
}
