/**
 * TYMMPlanHub.tsx — MaarifOS 0.65.0 MEGA SÜRÜM
 * Türkiye Yüzyılı Maarif Modeli (TYMM) Planlama & Öğretmen Terminali.
 * 
 * TÜM BİLEŞENLERİ TEK ÇATI ALTINDA BİRLEŞTİREN ANA YÖNETİM MERKEZİ:
 * 1. 📋 Adım Adım Resmî Günlük Planlayıcı (EK-6) — Çip Seçimli Hızlı Planlama
 * 2. 📚 MEB 9 Çekirdek Ders Kitabı Havuzu — 528 Gerçek MEB Etkinliği
 * 3. 📅 Günlük Planlarım Arşivi — Kayıtlı Planlar, A4 / Word Çıktısı, Canlı Silme / Düzenleme
 * 4. 📊 Aylık Eğitim Planı (EK-5) — Günlük planlardan saniyesinde derlenen resmî plan
 * 5. ✓ EK-15 Kontrol Çizelgesi — Günlük planlardan otomatik tiklenen canlı matris
 * 6. 🍏 Meyve ve Görev Dağıtımı — Planlandı sütunsuz, GG.AA.YYYY formatında, iş günlerine dağıtılmış
 * 
 * Torvalds / Turing inisiyatifi: O(1) indeksli, O(n) reaktif senkron, sıfır sunucu bağımlılığı.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { SmartDailyPlanWizard } from "./SmartDailyPlanWizard.tsx";
import { OfficialMonthlyPlanForm } from "./OfficialMonthlyPlanForm.tsx";
import { OfficialMonthlyPlanChecklistForm } from "./OfficialMonthlyPlanChecklistForm.tsx";
import { FruitDutyScheduler } from "../calendar/FruitDutyScheduler.tsx";
import {
  type DailyPlanRecord,
  type MonthKey,
  type AgeGroup,
  loadDailyPlans,
  deleteDailyPlan,
  changeDailyPlanDate,
  createDailyPlanFromTextbook,
  monthFromDate,
} from "./daily-plan-core.ts";
import {
  MEB_TEXTBOOK_ACTIVITIES,
  filterTextbookActivities,
  type TextbookActivityItem,
} from "./tymm-textbook-catalog.ts";
import {
  downloadOfficialFormWord,
  printOfficialFormA4,
} from "./official-form-export-service.ts";
import { MEBOfficialSkillsPortal } from "./MEBOfficialSkillsPortal.tsx";
import { PwaInstallPromptModal } from "../../components/PwaInstallPromptModal.tsx";
import {
  SparklesIcon,
  ChartBarIcon,
  BookOpenIcon,
  CalendarIcon,
  FileTextIcon,
  ClipboardCheckIcon,
  FruitIcon,
  ShieldCheckIcon,
} from "../../components/MaarifIcons.tsx";
import { MaarifAIAssistant, type AIContext } from "../../components/MaarifAIAssistant.tsx";
import { StudentSociometryGraph } from "../../components/StudentSociometryGraph.tsx";
import { InspectorDossierWorkspace } from "./InspectorDossierWorkspace.tsx";
import { JITCurriculumCompiler } from "../curriculum/JITCurriculumCompiler.tsx";
import { ParentEmpathyShieldWorkspace } from "../communication/ParentEmpathyShieldWorkspace.tsx";
import { EOkulBridgeWorkspace } from "./EOkulBridgeWorkspace.tsx";
import { DistrictMacroConsoleWorkspace } from "../district/DistrictMacroConsoleWorkspace.tsx";
import { AmbientClassroomWorkspace } from "../ambient/AmbientClassroomWorkspace.tsx";
import { AccreditationAuditWorkspace } from "../accreditation/AccreditationAuditWorkspace.tsx";
import { GraduationAlbumWorkspace } from "../portfolio/GraduationAlbumWorkspace.tsx";
import { AcousticResonanceWorkspace } from "../ambient/AcousticResonanceWorkspace.tsx";
import { PedagogicalPassportWorkspace } from "../portfolio/PedagogicalPassportWorkspace.tsx";
import { AIObservationAnecdoteWorkspace } from "../anecdote/AIObservationAnecdoteWorkspace.tsx";
import "./official-forms.css";

type HubTabId = "wizard" | "meb_portal" | "textbook" | "my_plans" | "monthly" | "checklist" | "fruit" | "sociometry" | "inspector" | "ai_assistant" | "jit_compiler" | "parent_shield" | "e_okul" | "district_console" | "ambient_station" | "accreditation" | "graduation_album" | "acoustic" | "zk_passport" | "ai_anecdote";

interface TYMMPlanHubProps {
  initialTab?: HubTabId;
  onClose?: () => void;
}

export function TYMMPlanHub({ initialTab = "wizard", onClose }: TYMMPlanHubProps) {
  const [activeTab, setActiveTab] = useState<HubTabId>(initialTab);
  const [dailyPlans, setDailyPlans] = useState<DailyPlanRecord[]>(() => loadDailyPlans());
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<DailyPlanRecord | undefined>(undefined);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);

  // ChatGPT Veri Köprüsü güncelleme dinleyicisi
  useEffect(() => {
    const handlePlansUpdated = () => {
      setDailyPlans(loadDailyPlans());
    };
    window.addEventListener("maarifos_plans_updated", handlePlansUpdated);
    return () => window.removeEventListener("maarifos_plans_updated", handlePlansUpdated);
  }, []);

  // Kitap havuzu arama/filtreleme
  const [selectedAge, setSelectedAge] = useState<"36-48" | "48-60" | "60-72" | "all">("all");
  const [selectedBook, setSelectedBook] = useState<number | "all">("all");
  const [selectedDomain, setSelectedDomain] = useState<string>("Tümü");
  const [textbookSearch, setTextbookSearch] = useState("");

  // Bildirim çubuğu
  const [toastMessage, setToastMessage] = useState<string>("");

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  // Planları yeniden yükle
  const refreshPlans = useCallback(() => {
    const plans = loadDailyPlans();
    setDailyPlans(plans);
  }, []);

  // Kitaptan plan türet ve planlayıcıya geç
  const handleLoadActivityIntoWizard = (activity: TextbookActivityItem) => {
    const newPlan = createDailyPlanFromTextbook(activity);
    setSelectedPlanForEdit(newPlan);
    setActiveTab("wizard");
    showToast(`⚡ "${activity.title}" etkinliği Resmî Planlayıcıya yüklendi!`);
  };

  // Kitaptan doğrudan kaydet
  const handleDirectSaveActivity = (activity: TextbookActivityItem) => {
    const newPlan = createDailyPlanFromTextbook(activity);
    const updated = [...dailyPlans.filter((p) => p.id !== newPlan.id), newPlan];
    localStorage.setItem("maarifos_daily_plans_v065", JSON.stringify(updated));
    setDailyPlans(updated);
    showToast(`✅ "${activity.title}" doğrudan Günlük Planlarınıza kaydedildi!`);
  };

  // Plan sil
  const handleDeletePlan = (id: string, topic: string) => {
    if (window.confirm(`"${topic || "Bu planı"}" silmek istediğinize emin misiniz? Silindiğinde Aylık Plan ve EK-15 matrisindeki ilgili tikler otomatik geri alınacaktır.`)) {
      const next = deleteDailyPlan(id);
      setDailyPlans(next);
      showToast("🗑️ Günlük plan silindi. Aylık plan ve EK-15 matrisi reaktif olarak güncellendi.");
    }
  };

  // Plan düzenle
  const handleEditPlan = (plan: DailyPlanRecord) => {
    setSelectedPlanForEdit(plan);
    setActiveTab("wizard");
  };

  // Plan tarihi değiştirme ve reaktif senkron
  const handlePlanDateChange = (planId: string, newDate: string) => {
    const updated = changeDailyPlanDate(planId, newDate);
    if (updated) {
      setDailyPlans(loadDailyPlans());
      showToast(`📅 Planın tarihi "${newDate}" olarak güncellendi. Aylık Plan ve EK-15 matrisi otomatik uyarlandı!`);
    }
  };

  // Yeni boş plan başlat
  const handleStartNewPlan = () => {
    setSelectedPlanForEdit(undefined);
    setActiveTab("wizard");
  };

  // Filtrelenmiş MEB ders kitabı etkinlikleri
  const filteredActivities = useMemo(() => {
    return filterTextbookActivities({
      ageGroup: selectedAge === "all" ? undefined : selectedAge,
      bookNo: selectedBook === "all" ? undefined : selectedBook,
      domain: selectedDomain === "Tümü" ? undefined : selectedDomain,
      search: textbookSearch,
    });
  }, [selectedAge, selectedBook, selectedDomain, textbookSearch]);

  // Örnek sınıf çocukları (Meyve çizelgesi için)
  const sampleStudents = useMemo(() => {
    return [
      { id: "s1", displayName: "Ahmet Yıldız", pastDutyCount: 0, lastDutyDate: null },
      { id: "s2", displayName: "Ayşe Kaya", pastDutyCount: 0, lastDutyDate: null },
      { id: "s3", displayName: "Mehmet Demir", pastDutyCount: 0, lastDutyDate: null },
      { id: "s4", displayName: "Zeynep Çelik", pastDutyCount: 0, lastDutyDate: null },
      { id: "s5", displayName: "Can Şahin", pastDutyCount: 0, lastDutyDate: null },
      { id: "s6", displayName: "Elif Aydın", pastDutyCount: 0, lastDutyDate: null },
      { id: "s7", displayName: "Burak Öztürk", pastDutyCount: 0, lastDutyDate: null },
      { id: "s8", displayName: "Defne Yılmaz", pastDutyCount: 0, lastDutyDate: null },
      { id: "s9", displayName: "Ege Koç", pastDutyCount: 0, lastDutyDate: null },
      { id: "s10", displayName: "Selin Doğan", pastDutyCount: 0, lastDutyDate: null },
      { id: "s11", displayName: "Kerem Arslan", pastDutyCount: 0, lastDutyDate: null },
      { id: "s12", displayName: "Fatma Aslan", pastDutyCount: 0, lastDutyDate: null },
      { id: "s13", displayName: "Deniz Kurt", pastDutyCount: 0, lastDutyDate: null },
      { id: "s14", displayName: "Yusuf Tekin", pastDutyCount: 0, lastDutyDate: null },
      { id: "s15", displayName: "Mira Taş", pastDutyCount: 0, lastDutyDate: null },
      { id: "s16", displayName: "Mert Aksoy", pastDutyCount: 0, lastDutyDate: null },
    ];
  }, []);

  return (
    <div className="tymm-hub-container">
      {/* ─── HUD BAŞLIK PANELİ ─── */}
      <header className="tymm-hub-header">
        <div className="tymm-hub-header-left">
          <span className="tymm-hub-badge">T.C. MEB · TTKB 2026</span>
          <h1 className="tymm-hub-title">Türkiye Yüzyılı Maarif Modeli · Planlama Terminali</h1>
          <p className="tymm-hub-subtitle">
            Günlük Plan (EK-6) ➔ Aylık Plan (EK-5) ➔ Aylık Kontrol Çizelgesi (EK-15) Tam Reaktif Ekosistemi
          </p>
        </div>
        <div className="tymm-hub-header-right">
          <div className="tymm-hub-telemetry">
            <span className="tymm-hub-stat">
              <strong>528</strong> Resmî Etkinlik
            </span>
            <span className="tymm-hub-stat">
              <strong>240+</strong> Materyal
            </span>
            <span className="tymm-hub-stat">
              <strong>180+</strong> Kavram
            </span>
            <span className="tymm-hub-stat highlight">
              <strong>{dailyPlans.length}</strong> Kayıtlı Plan
            </span>

          </div>

          {/* Telefona Uygulama Olarak Yükleme Butonu (PWA) */}
          <button
            type="button"
            className="tymm-hub-install-btn"
            onClick={() => setShowPwaInstallModal(true)}
            title="Telefona Doğrudan Uygulama Olarak Yükle (PWA)"
          >
            📲 Uygulama Yükle
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                marginLeft: "12px",
                background: "linear-gradient(135deg, #059669 0%, #0284c7 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.35)",
              }}
              title="Öğretmen Çalışma Masasına ve Sınıfıma Dön"
            >
              <span>←</span>
              <span>Sınıfıma / Bugün Akışına Dön</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── CANLI BİLDİRİM ŞERİDİ ─── */}
      {toastMessage && (
        <div className="tymm-toast-banner" role="status">
          {toastMessage}
        </div>
      )}

      {/* ─── ANA NAVİGASYON SEKMELERİ (7 ADET BÜYÜK BUTON) ─── */}
      <nav className="tymm-hub-nav">
        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "wizard" ? "active" : ""}`}
          onClick={() => setActiveTab("wizard")}
        >
          <span className="nav-icon"><SparklesIcon size={20} /></span>
          <span className="nav-text">
            <strong>1. Resmî Günlük Planlayıcı</strong>
            <small>Adım Adım Seçenekli (EK-6)</small>
          </span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "meb_portal" ? "active" : ""}`}
          onClick={() => setActiveTab("meb_portal")}
        >
          <span className="nav-icon"><ChartBarIcon size={20} /></span>
          <span className="nav-text">
            <strong>2. MEB Müfredat &amp; Beceri Portalı</strong>
            <small>Resmî Grafik · 3 Yaş Grubu · 9 Kitap</small>
          </span>
          <span className="nav-pill red" style={{ background: "#e11d48", color: "#ffffff" }}>MEB 2026</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "textbook" ? "active" : ""}`}
          onClick={() => setActiveTab("textbook")}
        >
          <span className="nav-icon"><BookOpenIcon size={20} /></span>
          <span className="nav-text">
            <strong>3. MEB Ders Kitapları Havuzu</strong>
            <small>528 Gerçek Resmî Etkinlik</small>
          </span>
          <span className="nav-pill">528</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "my_plans" ? "active" : ""}`}
          onClick={() => {
            refreshPlans();
            setActiveTab("my_plans");
          }}
        >
          <span className="nav-icon"><CalendarIcon size={20} /></span>
          <span className="nav-text">
            <strong>4. Günlük Planlarım</strong>
            <small>Kayıtlı Planlar Arşivi ({dailyPlans.length})</small>
          </span>
          {dailyPlans.length > 0 && <span className="nav-pill green">{dailyPlans.length}</span>}
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "monthly" ? "active" : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          <span className="nav-icon"><FileTextIcon size={20} /></span>
          <span className="nav-text">
            <strong>5. Aylık Eğitim Planı</strong>
            <small>Otomatik Derlenen EK-5</small>
          </span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "checklist" ? "active" : ""}`}
          onClick={() => setActiveTab("checklist")}
        >
          <span className="nav-icon"><ClipboardCheckIcon size={20} /></span>
          <span className="nav-text">
            <strong>6. EK-15 Kontrol Çizelgesi</strong>
            <small>Otomatik Tiklenen 10 Aylık Matris</small>
          </span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "fruit" ? "active" : ""}`}
          onClick={() => setActiveTab("fruit")}
        >
          <span className="nav-icon"><FruitIcon size={20} /></span>
          <span className="nav-text">
            <strong>7. Meyve &amp; Görev Dağıtımı</strong>
            <small>GG.AA.YYYY · İş Günlerine Adil</small>
          </span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "sociometry" ? "active" : ""}`}
          onClick={() => setActiveTab("sociometry")}
        >
          <span className="nav-icon"><SparklesIcon size={20} /></span>
          <span className="nav-text">
            <strong>8. Sosyometri &amp; Erdem Ağı</strong>
            <small>Akran Etkileşim &amp; Merkez Analizi</small>
          </span>
          <span className="nav-pill" style={{ background: "linear-gradient(90deg, #0284c7, #10b981)", color: "#fff" }}>YENİ</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "inspector" ? "active" : ""}`}
          onClick={() => setActiveTab("inspector")}
        >
          <span className="nav-icon"><ShieldCheckIcon size={20} /></span>
          <span className="nav-text">
            <strong>9. Müfettiş Teftiş Dosyası</strong>
            <small>32 Resmî Evrak Cildi &amp; A4 Baskı</small>
          </span>
          <span className="nav-pill" style={{ background: "#f59e0b", color: "#fff" }}>PRO</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn tymm-hub-nav-btn--ai ${activeTab === "ai_assistant" ? "active" : ""}`}
          onClick={() => setActiveTab("ai_assistant")}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </span>
          <span className="nav-text">
            <strong>10. AI Pedagoji Asistanı</strong>
            <small>Gemini · ChatGPT · Copilot</small>
          </span>
          <span className="nav-pill" style={{ background: "linear-gradient(90deg, #1a73e8, #10a37f)", color: "#fff" }}>YENİ</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "jit_compiler" ? "active" : ""}`}
          onClick={() => setActiveTab("jit_compiler")}
        >
          <span className="nav-icon">⚡</span>
          <span className="nav-text">
            <strong>11. Dinamik Gün Akışı</strong>
            <small>Hava, Enerji &amp; Yoklamaya Göre</small>
          </span>
          <span className="nav-pill" style={{ background: "#0284c7", color: "#fff" }}>Dinamik</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "parent_shield" ? "active" : ""}`}
          onClick={() => setActiveTab("parent_shield")}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-text">
            <strong>12. Aile İletişim &amp; Bülten</strong>
            <small>Empatik 2 Cümlelik Aile Notu</small>
          </span>
          <span className="nav-pill" style={{ background: "#10b981", color: "#fff" }}>Aile</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "e_okul" ? "active" : ""}`}
          onClick={() => setActiveTab("e_okul")}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-text">
            <strong>13. e-Okul Köprüsü</strong>
            <small>250 Karakter 5 Gelişim Alanı</small>
          </span>
          <span className="nav-pill" style={{ background: "#6366f1", color: "#fff" }}>MEB</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "district_console" ? "active" : ""}`}
          onClick={() => setActiveTab("district_console")}
        >
          <span className="nav-icon">🏛️</span>
          <span className="nav-text">
            <strong>14. İlçe &amp; Zümre Konsolu</strong>
            <small>Sıfır Sunucu Makro Raporu</small>
          </span>
          <span className="nav-pill" style={{ background: "#f59e0b", color: "#fff" }}>MEM</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "ambient_station" ? "active" : ""}`}
          onClick={() => setActiveTab("ambient_station")}
        >
          <span className="nav-icon">📡</span>
          <span className="nav-text">
            <strong>15. Ortam Zekâsı (NFC/QR)</strong>
            <small>6 Merkez İstasyon Algılayıcı</small>
          </span>
          <span className="nav-pill" style={{ background: "#0d9488", color: "#fff" }}>NFC</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "accreditation" ? "active" : ""}`}
          onClick={() => setActiveTab("accreditation")}
        >
          <span className="nav-icon">🏅</span>
          <span className="nav-text">
            <strong>16. MEB Akreditasyon Robotu</strong>
            <small>100 Maddelik Otonom Teftiş</small>
          </span>
          <span className="nav-pill" style={{ background: "#d97706", color: "#fff" }}>A+</span>
        </button>

        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "graduation_album" ? "active" : ""}`}
          onClick={() => setActiveTab("graduation_album")}
        >
          <span className="nav-icon">🎓</span>
          <span className="nav-text">
            <strong>17. Yıl Sonu Gelişim Romanı</strong>
            <small>Kuşe Baskı Mezuniyet Albümü</small>
          </span>
          <span className="nav-pill" style={{ background: "#4f46e5", color: "#fff" }}>A4</span>
        </button>

        {/* TAB 18: AKUSTİK SINIF REZONANSI & DESİBEL */}
        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "acoustic" ? "active" : ""}`}
          onClick={() => setActiveTab("acoustic")}
        >
          <span className="nav-icon">🎙️</span>
          <span className="nav-text">
            <strong>18. Akustik Sınıf Rezonansı</strong>
            <small>Desibel &amp; Diyalojik Pusula</small>
          </span>
          <span className="nav-pill" style={{ background: "#38bdf8", color: "#000" }}>FFT</span>
        </button>

        {/* TAB 19: W3C SIFIR-BİLGİ PEDAGOJİK ÇOCUK PASAPORTU */}
        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "zk_passport" ? "active" : ""}`}
          onClick={() => setActiveTab("zk_passport")}
        >
          <span className="nav-icon">🛡️</span>
          <span className="nav-text">
            <strong>19. W3C Kripto Çocuk Pasaportu</strong>
            <small>1. Sınıfa Geçiş Kanıtı</small>
          </span>
          <span className="nav-pill" style={{ background: "#10b981", color: "#fff" }}>W3C</span>
        </button>

        {/* TAB 20: YAPAY ZEKA DESTEKLİ MEB EK-2 GÖZLEM & ANEKDOT FORMU */}
        <button
          type="button"
          className={`tymm-hub-nav-btn ${activeTab === "ai_anecdote" ? "active" : ""}`}
          onClick={() => setActiveTab("ai_anecdote")}
          style={{ borderLeft: "3px solid #10b981" }}
        >
          <span className="nav-icon">✨</span>
          <span className="nav-text">
            <strong style={{ color: "#10b981" }}>20. AI Gözlem &amp; Anekdot Formu</strong>
            <small>MEB EK-2 Vaka Kayıt &amp; Dikte</small>
          </span>
          <span className="nav-pill" style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}>EK-2</span>
        </button>
      </nav>

      {/* ─── İÇERİK ALANI ─── */}
      <main className="tymm-hub-body">
        {/* ─── TAB 1: GÜNLÜK PLAN SİHİRBAZI ─── */}
        {activeTab === "wizard" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>📋 Adım Adım Resmî Günlük Planlayıcı (EK-6)</h2>
                <p>Tüm alanları tık-tık çip olarak seçin; klavye kullanmadan resmî standartta günlük plan oluşturun.</p>
              </div>
              <div className="tymm-section-toolbar-right">
                <button
                  type="button"
                  className="of-btn-secondary"
                  onClick={() => setActiveTab("textbook")}
                >
                  📚 Kitap Havuzundan Seç (528)
                </button>
                <button
                  type="button"
                  className="of-btn-secondary"
                  onClick={handleStartNewPlan}
                >
                  ➕ Yeni Boş Plan
                </button>
              </div>
            </div>

            <SmartDailyPlanWizard
              editPlan={selectedPlanForEdit}
              onSaved={(savedPlan) => {
                refreshPlans();
                showToast(`✅ "${savedPlan.topic || savedPlan.date}" başarıyla kaydedildi! EK-15 matrisi ve Aylık Plan güncellendi.`);
              }}
            />
          </section>
        )}

        {/* ─── TAB 2: MEB RESMÎ MÜFREDAT & BECERİ PORTALI ─── */}
        {activeTab === "meb_portal" && (
          <section className="tymm-hub-section">
            <MEBOfficialSkillsPortal
              onLoadUnitIntoWizard={(plan) => {
                setSelectedPlanForEdit(plan);
                setActiveTab("wizard");
                showToast(`⚡ "${plan.topic}" resmî MEB planı Resmî Planlayıcıya yüklendi!`);
              }}
              onFilterBookInCatalog={(age, bookNo) => {
                setSelectedAge(age);
                setSelectedBook(bookNo);
                setActiveTab("textbook");
                showToast(`📖 ${age} Ay Kitap ${bookNo} etkinlikleri filtrelendi.`);
              }}
            />
          </section>
        )}

        {/* ─── TAB 3: MEB DERS KİTAPLARI HAVUZU (528 ETKİNLİK) ─── */}
        {activeTab === "textbook" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>📚 MEB TTKB 9 Çekirdek Ders Kitabı Etkinlik Havuzu</h2>
                <p>3-4-5 Yaş MEB basılı ders kitaplarındaki 528 gerçek etkinlik. Tek tıkla günlük plana dönüştürün.</p>
              </div>
              <div className="tymm-section-toolbar-right">
                <span className="tymm-counter-pill">
                  Gösterilen: <strong>{filteredActivities.length}</strong> / 528
                </span>
              </div>
            </div>

            {/* Filtre Barı */}
            <div className="tymm-filter-bar">
              <div className="tymm-filter-group">
                <label>Yaş Grubu:</label>
                <div className="tymm-filter-pills">
                  <button
                    type="button"
                    className={`filter-pill ${selectedAge === "all" ? "active" : ""}`}
                    onClick={() => setSelectedAge("all")}
                  >
                    Tümü (528)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedAge === "36-48" ? "active" : ""}`}
                    onClick={() => setSelectedAge("36-48")}
                  >
                    36–48 Ay (112)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedAge === "48-60" ? "active" : ""}`}
                    onClick={() => setSelectedAge("48-60")}
                  >
                    48–60 Ay (148)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedAge === "60-72" ? "active" : ""}`}
                    onClick={() => setSelectedAge("60-72")}
                  >
                    60–72 Ay (268)
                  </button>
                </div>
              </div>

              <div className="tymm-filter-group">
                <label>Kitap No:</label>
                <div className="tymm-filter-pills">
                  <button
                    type="button"
                    className={`filter-pill ${selectedBook === "all" ? "active" : ""}`}
                    onClick={() => setSelectedBook("all")}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedBook === 1 ? "active" : ""}`}
                    onClick={() => setSelectedBook(1)}
                  >
                    Kitap 1
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedBook === 2 ? "active" : ""}`}
                    onClick={() => setSelectedBook(2)}
                  >
                    Kitap 2
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedBook === 3 ? "active" : ""}`}
                    onClick={() => setSelectedBook(3)}
                  >
                    Kitap 3
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${selectedBook === 4 ? "active" : ""}`}
                    onClick={() => setSelectedBook(4)}
                  >
                    Kitap 4
                  </button>
                </div>
              </div>

              <div className="tymm-filter-group" style={{ flex: 1 }}>
                <label>Gelişim / Öğrenme Alanı:</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="tymm-select"
                >
                  <option value="Tümü">Tüm Alanlar</option>
                  <option value="Fen ve Doğa">Fen ve Doğa</option>
                  <option value="Matematik">Matematik</option>
                  <option value="Sanat">Sanat</option>
                  <option value="Müzik">Müzik</option>
                  <option value="Hareket ve Sağlık">Hareket ve Sağlık</option>
                  <option value="Sosyal & Duygusal">Sosyal & Duygusal</option>
                  <option value="Erken Okuryazarlık & Türkçe">Erken Okuryazarlık & Türkçe</option>
                </select>
              </div>

              <div className="tymm-filter-group" style={{ flex: 1.5 }}>
                <label>Etkinlik Arama:</label>
                <input
                  type="text"
                  placeholder="Başlık, yönerge veya kavram ara... (Örn: yunuslar, böcekler, daire)"
                  value={textbookSearch}
                  onChange={(e) => setTextbookSearch(e.target.value)}
                  className="tymm-search-input"
                />
              </div>
            </div>

            {/* Etkinlik Kartları Grid */}
            <div className="tymm-activity-grid">
              {filteredActivities.slice(0, 100).map((act) => (
                <div key={act.id} className="tymm-activity-card">
                  <div className="act-header">
                    <span className="act-badge-age">{act.ageGroup} Ay</span>
                    <span className="act-badge-book">Kitap {act.bookNo} · S.{act.pageNo}</span>
                    <span className="act-badge-domain">{act.domain}</span>
                  </div>

                  <h3 className="act-title">{act.title}</h3>

                  <div className="act-question">
                    <strong>❓ Araştırma Sorusu:</strong> {act.researchQuestion}
                  </div>

                  <p className="act-text-preview">{act.text}</p>

                  <div className="act-chips-row">
                    <div className="act-chip-group">
                      <span className="act-chip-label">Materyaller:</span>
                      {act.materials.slice(0, 3).map((m, i) => (
                        <span key={i} className="act-chip material">{m}</span>
                      ))}
                    </div>
                    <div className="act-chip-group">
                      <span className="act-chip-label">Kavramlar:</span>
                      {act.concepts.slice(0, 3).map((c, i) => (
                        <span key={i} className="act-chip concept">{c}</span>
                      ))}
                    </div>
                    <div className="act-chip-group">
                      <span className="act-chip-label">Değer & Eğilim:</span>
                      {act.values.slice(0, 1).map((v, i) => (
                        <span key={i} className="act-chip value">{v}</span>
                      ))}
                      {act.tendencies.slice(0, 1).map((t, i) => (
                        <span key={i} className="act-chip tendency">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="act-actions">
                    <button
                      type="button"
                      className="act-btn-plan"
                      onClick={() => handleLoadActivityIntoWizard(act)}
                    >
                      ⚡ Bu Etkinlikle Günlük Plan Hazırla
                    </button>
                    <button
                      type="button"
                      className="act-btn-direct"
                      onClick={() => handleDirectSaveActivity(act)}
                      title="Planlayıcıyı açmadan bugünün tarihine doğrudan kaydet"
                    >
                      💾 Direkt Ekle
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredActivities.length > 100 && (
              <div className="tymm-load-more-hint">
                💡 İlk 100 etkinlik listelendi. Daha spesifik arama yapmak için filtreleri veya arama kutusunu kullanabilirsiniz.
              </div>
            )}
          </section>
        )}

        {/* ─── TAB 4: GÜNLÜK PLANLARIM ARŞİVİ ─── */}
        {activeTab === "my_plans" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>📅 Kayıtlı Günlük Planlarım Arşivi</h2>
                <p>Hazırladığınız tüm günlük planlar. Silinen veya düzenlenen planlar anında Aylık Plan ve EK-15'e yansır.</p>
              </div>
              <div className="tymm-section-toolbar-right">
                <button
                  type="button"
                  className="of-btn-primary"
                  onClick={handleStartNewPlan}
                >
                  ➕ Yeni Günlük Plan Hazırla
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("maarif_open_chatgpt_bridge"))}
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#34d399",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  📥 ChatGPT'den Plan Çek
                </button>
              </div>
            </div>

            {dailyPlans.length === 0 ? (
              <div className="tymm-empty-state">
                <div className="empty-icon">📝</div>
                <h3>Henüz kayıtlı bir günlük planınız bulunmuyor.</h3>
                <p>Hemen "Resmî Günlük Planlayıcı" ile veya "MEB Ders Kitapları Havuzu"ndan tek tıkla ilk planınızı hazırlayın!</p>
                <div className="empty-buttons">
                  <button
                    type="button"
                    className="of-btn-primary"
                    onClick={() => setActiveTab("textbook")}
                  >
                    📚 Kitap Etkinliklerinden Seç
                  </button>
                  <button
                    type="button"
                    className="of-btn-secondary"
                    onClick={() => setActiveTab("wizard")}
                  >
                    📋 Adım Adım Planlayıcıyı Başlat
                  </button>
                  <button
                    type="button"
                    className="of-btn-secondary"
                    onClick={() => window.dispatchEvent(new CustomEvent("maarif_open_chatgpt_bridge"))}
                    style={{ borderColor: "rgba(16, 185, 129, 0.4)", color: "#34d399" }}
                  >
                    📥 ChatGPT'den Veri Çek
                  </button>
                </div>
              </div>
            ) : (
              <div className="tymm-plans-list">
                {dailyPlans
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((p) => {
                    const month = monthFromDate(p.date) || "Belirsiz Ay";
                    return (
                      <div key={p.id} className="tymm-plan-card">
                        <div className="plan-card-header">
                          <div className="plan-card-date">
                            <span className="date-day">{p.date.split("-")[2]}</span>
                            <span className="date-month">{month}</span>
                            <span className="date-year">{p.date.split("-")[0]}</span>
                          </div>
                          <div className="plan-card-info">
                            <span className="plan-age-tag">{p.ageGroup} Ay</span>
                            <h3 className="plan-card-topic">{p.topic || p.activityName || "Günlük Plan"}</h3>
                            <p className="plan-card-question">❓ {p.researchQuestion || "Araştırma sorusu belirlendi"}</p>
                          </div>
                        </div>

                        <div className="plan-card-body">
                          <div className="plan-card-stat">
                            <strong>Materyaller ({p.materialLabels?.length || 0}):</strong>
                            <span>{p.materialLabels?.slice(0, 4).join(", ") || "—"}</span>
                          </div>
                          <div className="plan-card-stat">
                            <strong>Kavramlar ({p.conceptLabels?.length || 0}):</strong>
                            <span>{p.conceptLabels?.slice(0, 4).join(", ") || "—"}</span>
                          </div>
                          <div className="plan-card-stat">
                            <strong>Alan Becerileri ({p.domainCodes?.length || 0}):</strong>
                            <span>{p.domainCodes?.join(", ") || "—"}</span>
                          </div>
                          <div className="plan-card-stat">
                            <strong>Değerler & Eğilimler:</strong>
                            <span>{p.valueCodes?.join(", ") || "—"} · {p.tendencyCodes?.join(", ") || "—"}</span>
                          </div>
                        </div>

                        <div className="plan-card-footer" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>📅 Tarih:</label>
                            <input
                              type="date"
                              value={p.date}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                if (newDate && newDate !== p.date) {
                                  handlePlanDateChange(p.id, newDate);
                                }
                              }}
                              style={{
                                background: "#070d18",
                                color: "#38bdf8",
                                border: "1px solid rgba(56, 189, 248, 0.4)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                                fontWeight: "bold",
                                cursor: "pointer",
                              }}
                              title="Planın Tarihini Değiştir (Aylık plan ve EK-15 matrisi otomatik güncellenir)"
                            />
                          </div>

                          <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="plan-action-btn print"
                              onClick={() => printOfficialFormA4(`EK-6_Gunluk_Plan_${p.date}`)}
                            >
                              🖨️ A4 Yazdır
                            </button>
                            <button
                              type="button"
                              className="plan-action-btn word"
                              onClick={() => downloadOfficialFormWord("SmartDailyPlanWizard")}
                            >
                              📥 Word İndir
                            </button>
                            <button
                              type="button"
                              className="plan-action-btn edit"
                              onClick={() => handleEditPlan(p)}
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              type="button"
                              className="plan-action-btn delete"
                              onClick={() => handleDeletePlan(p.id, p.topic || p.activityName)}
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* ─── TAB 5: AYLIK EĞİTİM PLANI (EK-5) ─── */}
        {activeTab === "monthly" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>📈 Aylık Eğitim Planı (EK-5)</h2>
                <p>
                  Hazırladığınız günlük planlar ilgili ay ile eşleşir. Kazanım, değer, kavram ve materyaller otomatik çekilir.
                </p>
              </div>
              <div className="tymm-section-toolbar-right">
                <span className="tymm-counter-pill green">
                  ✓ Günlük Plan Reaktif Senkronizasyonu Aktif
                </span>
              </div>
            </div>

            <OfficialMonthlyPlanForm />
          </section>
        )}

        {/* ─── TAB 6: EK-15 KONTROL ÇİZELGESİ ─── */}
        {activeTab === "checklist" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>✓ EK-15 Aylık Eğitim Planı Kontrol Çizelgesi</h2>
                <p>
                  Tüm günlük planlarınız taranır; o tarihteki aya karşılık gelen kazanım, eğilim ve değerler yeşil rozetle otomatik tiklenir.
                </p>
              </div>
              <div className="tymm-section-toolbar-right">
                <span className="tymm-counter-pill green">
                  ✓ 10 Aylık Reaktif Matris Motoru Devrede
                </span>
              </div>
            </div>

            <OfficialMonthlyPlanChecklistForm />
          </section>
        )}

        {/* ─── TAB 7: MEYVE VE GÖREV DAĞITIMI ─── */}
        {activeTab === "fruit" && (
          <section className="tymm-hub-section">
            <div className="tymm-section-toolbar">
              <div className="tymm-section-toolbar-left">
                <h2>🍏 Meyve ve Beslenme Görev Çizelgesi</h2>
                <p>
                  "Planlandı" sütunu kaldırılmıştır. GG.AA.YYYY formatında, sadece iş günlerine dengeli paylaştırılır.
                </p>
              </div>
            </div>

            <FruitDutyScheduler
              yearMonth={new Date().toISOString().slice(0, 7)}
              students={sampleStudents}
              eligibleDates={[
                "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25",
                "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02",
              ]}
              personsPerDay={1}
              existingSlots={[]}
              onSave={(slots) => {
                showToast(`✅ ${slots.length} günlük meyve görevi iş günlerine dağıtıldı ve kaydedildi!`);
              }}
            />
          </section>
        )}

        {/* ─── TAB 8: SOSYOMETRİ & ERDEM AĞ GRAFI ─── */}
        {activeTab === "sociometry" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <StudentSociometryGraph />
          </section>
        )}

        {/* ─── TAB 9: 32 EVRAKLI MÜFETTİŞ TEFTİŞ DOSYASI ─── */}
        {activeTab === "inspector" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <InspectorDossierWorkspace onClose={() => setActiveTab("wizard")} />
          </section>
        )}

        {/* ─── TAB 10: AI PEDAGOJİ ASİSTANI ─── */}
        {activeTab === "ai_assistant" && (() => {
          // En son kaydedilen planın bağlamını oluştur
          const latestPlan = dailyPlans[dailyPlans.length - 1];
          const aiCtx: AIContext = latestPlan
            ? {
                topic: latestPlan.topic,
                domain: latestPlan.activityTypes?.[0] ?? "",
                ageGroup: latestPlan.ageGroup,
                concepts: latestPlan.conceptLabels ?? [],
                materials: latestPlan.materialLabels ?? [],
                values: latestPlan.valueCodes ?? [],
                researchQuestion: latestPlan.researchQuestion,
              }
            : {};
          return (
            <section className="tymm-hub-section tymm-hub-section--ai">
              <div className="tymm-section-toolbar">
                <div className="tymm-section-toolbar-left">
                  <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                    Yapay Zekâ Pedagojik Destek
                    <span style={{ fontSize: "0.68rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                      v0.74 APEX
                    </span>
                  </h2>
                  <p>Sıfır API anahtarı ile %100 çevrim dışı çalışır. Sesli dikte, acil sınıf reçeteleri, veli bülteni ve tek tıkla EK-6 plana aktarma desteği.</p>
                </div>
              </div>
              <div className="tymm-ai-embed-wrapper">
                <div className="tymm-ai-info-cards">
                  <div className="tymm-ai-info-card" style={{ borderColor: "rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.05)" }}>
                    <div className="tymm-ai-info-card__dot" style={{ background: "#10b981" }} />
                    <div>
                      <strong style={{ color: "#34d399" }}>Yerel Akıllı Çekirdek</strong>
                      <small>Sıfır API anahtarı · %100 Çevrim dışı ve Anında</small>
                    </div>
                  </div>
                  <div className="tymm-ai-info-card">
                    <div className="tymm-ai-info-card__dot" style={{ background: "#38bdf8" }} />
                    <div>
                      <strong>Sesli Türkçe Dikte (🎙️)</strong>
                      <small>Sınıfta konuşarak gözlem ve plan oluşturun</small>
                    </div>
                  </div>
                  <div className="tymm-ai-info-card">
                    <div className="tymm-ai-info-card__dot" style={{ background: "#fbbf24" }} />
                    <div>
                      <strong>1-Tıkla Plana Aktar</strong>
                      <small>Üretilen planı doğrudan EK-6 planlayıcısına aktarın</small>
                    </div>
                  </div>
                  <div className="tymm-ai-info-card tymm-ai-info-card--security">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    <div>
                      <strong>Zero-Trust Güvenlik</strong>
                      <small>Sıfır sunucu · Öğrenci verileri %100 cihazınızda kalır</small>
                    </div>
                  </div>
                </div>
                {latestPlan && (
                  <div className="tymm-ai-context-banner">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    <span>
                      Son plan bağlamı otomatik eklendi:{" "}
                      <strong>{latestPlan.topic || latestPlan.date}</strong>
                      {latestPlan.ageGroup && <> · <strong>{latestPlan.ageGroup} ay</strong></>}
                    </span>
                  </div>
                )}
                <MaarifAIAssistant
                  context={aiCtx}
                  defaultOpen={true}
                  hideFAB={true}
                />
              </div>
            </section>
          );
        })()}

        {/* ─── TAB 11: DİNAMİK GÜN AKIŞI VE PLANLAYICI ─── */}
        {activeTab === "jit_compiler" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <JITCurriculumCompiler
              onPlanCreated={() => {
                refreshPlans();
                setActiveTab("my_plans");
              }}
            />
          </section>
        )}

        {/* ─── TAB 12: VELİ EMPATİ & WHATSAPP KALKANI ─── */}
        {activeTab === "parent_shield" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <ParentEmpathyShieldWorkspace />
          </section>
        )}

        {/* ─── TAB 13: e-OKUL GELİŞİM RAPORU KÖPRÜSÜ ─── */}
        {activeTab === "e_okul" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <EOkulBridgeWorkspace />
          </section>
        )}

        {/* ─── TAB 14: İLÇE & ZÜMRE MAKRO KONSOLU ─── */}
        {activeTab === "district_console" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <DistrictMacroConsoleWorkspace />
          </section>
        )}

        {/* ─── TAB 15: AMBİENT PEDAGOJİK REZONANS & SENSÖR ─── */}
        {activeTab === "ambient_station" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <AmbientClassroomWorkspace />
          </section>
        )}

        {/* ─── TAB 16: ZERO-TOUCH MEB AKREDİTASYON & TEFTİŞ ROBOTU ─── */}
        {activeTab === "accreditation" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <AccreditationAuditWorkspace />
          </section>
        )}

        {/* ─── TAB 17: YIL SONU GELİŞİM ROMANI & MEZUNİYET ALBÜMÜ ─── */}
        {activeTab === "graduation_album" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <GraduationAlbumWorkspace />
          </section>
        )}

        {/* ─── TAB 18: AKUSTİK SINIF REZONANSI & DESİBEL PUSULASI ─── */}
        {activeTab === "acoustic" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <AcousticResonanceWorkspace />
          </section>
        )}

        {/* ─── TAB 19: W3C SIFIR-BİLGİ PEDAGOJİK ÇOCUK PASAPORTU ─── */}
        {activeTab === "zk_passport" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <PedagogicalPassportWorkspace />
          </section>
        )}

        {/* ─── TAB 20: YAPAY ZEKA DESTEKLİ MEB EK-2 GÖZLEM & ANEKDOT FORMU ─── */}
        {activeTab === "ai_anecdote" && (
          <section className="tymm-hub-section" style={{ maxWidth: "1160px", margin: "0 auto", padding: "16px 20px" }}>
            <AIObservationAnecdoteWorkspace />
          </section>
        )}
      </main>

      {/* ─── MOBİL ALT KOMUTA DOKU (NATIVE MOBILE DOCK) ─── */}
      <nav className="tymm-mobile-dock" aria-label="Mobil Hızlı Menü">
        <button
          type="button"
          className={`tymm-dock-btn ${activeTab === "ai_anecdote" ? "active" : ""}`}
          onClick={() => setActiveTab("ai_anecdote")}
          style={{ color: "#10b981" }}
          title="Yapay Zeka Destekli Gözlem & Anekdot Formu"
        >
          <span className="dock-icon">✨</span>
          <span className="dock-label">AI Gözlem</span>
        </button>
        {onClose && (
          <button
            type="button"
            className="tymm-dock-btn"
            onClick={onClose}
            style={{ color: "#10b981" }}
            title="Sınıfıma ve Ana Ekrana Dön"
          >
            <span className="dock-icon">🏠</span>
            <span className="dock-label">Sınıfım</span>
          </button>
        )}

        <button
          type="button"
          className={`tymm-dock-btn ${activeTab === "wizard" ? "active" : ""}`}
          onClick={() => setActiveTab("wizard")}
        >
          <span className="dock-icon"><SparklesIcon size={20} /></span>
          <span className="dock-label">Planlayıcı</span>
        </button>

        <button
          type="button"
          className={`tymm-dock-btn ${activeTab === "textbook" ? "active" : ""}`}
          onClick={() => setActiveTab("textbook")}
        >
          <span className="dock-icon"><BookOpenIcon size={20} /></span>
          <span className="dock-label">528 Kitap</span>
        </button>

        <button
          type="button"
          className={`tymm-dock-btn ${activeTab === "my_plans" ? "active" : ""}`}
          onClick={() => {
            refreshPlans();
            setActiveTab("my_plans");
          }}
        >
          <span className="dock-icon">
            <CalendarIcon size={20} />
            {dailyPlans.length > 0 && <span className="dock-badge">{dailyPlans.length}</span>}
          </span>
          <span className="dock-label">Planlarım</span>
        </button>

        <button
          type="button"
          className={`tymm-dock-btn ${activeTab === "monthly" || activeTab === "checklist" ? "active" : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          <span className="dock-icon"><FileTextIcon size={20} /></span>
          <span className="dock-label">EK-5 / EK-15</span>
        </button>

        <button
          type="button"
          className={`tymm-dock-btn tymm-dock-btn--ai ${activeTab === "ai_assistant" ? "active" : ""}`}
          onClick={() => setActiveTab("ai_assistant")}
        >
          <span className="dock-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275-1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </span>
          <span className="dock-label">Yapay Zekâ</span>
        </button>
      </nav>

      {/* ─── TELEFONA DOĞRUDAN UYGULAMA YÜKLEME MASASI (PWA) ─── */}
      <PwaInstallPromptModal
        isOpen={showPwaInstallModal}
        onClose={() => setShowPwaInstallModal(false)}
      />
    </div>
  );
}
