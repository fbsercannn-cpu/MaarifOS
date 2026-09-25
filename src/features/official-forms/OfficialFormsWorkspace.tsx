import { createPortal } from "react-dom";
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { FormDialog } from "./FormDialog.tsx";
import { useFormEditorSizing } from "./useFormEditorSizing.ts";
import { OfficialFormRecordProvider } from "./OfficialFormRecordProvider.tsx";
import { OfficialAnecdoteForm } from "./OfficialAnecdoteForm.tsx";
import { OfficialSchoolOutsidePlan } from "./OfficialSchoolOutsidePlan.tsx";
import { OfficialSchoolOutsideProtocol } from "./OfficialSchoolOutsideProtocol.tsx";
import { OfficialDailyPlanForm } from "./OfficialDailyPlanForm.tsx";
import { SmartDailyPlanWizard } from "./SmartDailyPlanWizard.tsx";
import { OfficialMonthlyPlanForm } from "./OfficialMonthlyPlanForm.tsx";
import { OfficialMonthlyPlanChecklistForm } from "./OfficialMonthlyPlanChecklistForm.tsx";
import { OfficialMonthlyEvaluationReportModal } from "./OfficialMonthlyEvaluationReportModal.tsx";
import { OfficialFamilyNeedForm } from "./OfficialFamilyNeedForm.tsx";
import { OfficialFamilyParticipationForm } from "./OfficialFamilyParticipationForm.tsx";
import { OfficialTymmReferenceTablesModal } from "./OfficialTymmReferenceTablesModal.tsx";
import { OfficialEK1SkillMatrixModal } from "./OfficialEK1SkillMatrixModal.tsx";
import { OfficialTermDevelopmentReport } from "./OfficialTermDevelopmentReport.tsx";
import { StudentPortfolioGalleryModal } from "./StudentPortfolioGalleryModal.tsx";
import { WeeklyFamilyNewsletterModal } from "./WeeklyFamilyNewsletterModal.tsx";
import { DifferentiationGuideModal } from "./DifferentiationGuideModal.tsx";
import { ZeroWasteMaterialGuideModal } from "./ZeroWasteMaterialGuideModal.tsx";
import { OfficialGamesLibraryModal } from "./OfficialGamesLibraryModal.tsx";
import { OfficialInspectionDossierModal } from "./OfficialInspectionDossierModal.tsx";
import { OfficialChildInterviewModal } from "./OfficialChildInterviewModal.tsx";
import { OfficialLearningCentersAuditModal } from "./OfficialLearningCentersAuditModal.tsx";
import { OfficialFamilyActivityPlanModal } from "./OfficialFamilyActivityPlanModal.tsx";
import { OfficialClassroomSkillsMatrixModal } from "./OfficialClassroomSkillsMatrixModal.tsx";
import { OfficialSkillAcquisitionReportModal } from "./OfficialSkillAcquisitionReportModal.tsx";
import { OfficialGuidanceReferralForm } from "./OfficialGuidanceReferralForm.tsx";
import { OfficialFamilyMeetingMinutesModal } from "./OfficialFamilyMeetingMinutesModal.tsx";
import { OfficialDigitalLearningGuideModal } from "./OfficialDigitalLearningGuideModal.tsx";
import { OfficialDevelopmentalRubricModal } from "./OfficialDevelopmentalRubricModal.tsx";
import { OfficialOutdoorGardenGuideModal } from "./OfficialOutdoorGardenGuideModal.tsx";
import { OfficialSelfPeerEvaluationModal } from "./OfficialSelfPeerEvaluationModal.tsx";
import { OfficialDayClosingCircleModal } from "./OfficialDayClosingCircleModal.tsx";
import { OfficialMorningOrientationModal } from "./OfficialMorningOrientationModal.tsx";
import { OfficialConflictResolutionModal } from "./OfficialConflictResolutionModal.tsx";
import { OfficialStudentIntakeFormModal } from "./OfficialStudentIntakeFormModal.tsx";
import { OfficialNutritionHygieneTrackerModal } from "./OfficialNutritionHygieneTrackerModal.tsx";
import "./official-forms.css";

export type OfficialFormType =
  | "smart_daily"
  | "daily"
  | "monthly"
  | "checklist"
  | "monthly_evaluation"
  | "skill_acquisition"
  | "term_report"
  | "portfolio"
  | "newsletter"
  | "differentiation"
  | "guidance"
  | "child_interview"
  | "classroom_skills"
  | "centers_audit"
  | "family_activity"
  | "meeting_minutes"
  | "digital_learning"
  | "inspection_dossier"
  | "ek1_skills"
  | "games"
  | "anecdote"
  | "outside"
  | "outside_protocol"
  | "zero_waste"
  | "family_need"
  | "family_participation"
  | "tables"
  | "rubric"
  | "outdoor_garden"
  | "self_peer"
  | "day_closing"
  | "morning_orientation"
  | "conflict_resolution"
  | "student_intake"
  | "nutrition_tracker";

export type FormCategory = "all" | "planning" | "assessment" | "family" | "environment" | "curriculum";

export interface FormMetadata {
  id: OfficialFormType;
  title: string;
  tag: string;
  category: "planning" | "assessment" | "family" | "environment" | "curriculum";
  icon: string;
  description: string;
}

export const OFFICIAL_FORMS_REGISTRY: FormMetadata[] = [
  // Planlama & Çizelgeler (7)
  { id: "smart_daily", title: "✨ Adım Adım Günlük Planlayıcı", tag: "EK-6 Yeni", category: "planning", icon: "📋", description: "Çip seçimli, adım adım MEB EK-6 günlük plan — aylık plana otomatik işler." },
  { id: "daily", title: "EK-6 Günlük Plan (Klasik)", tag: "s.183", category: "planning", icon: "📋", description: "Rutinler, etkinlik akışı ve kaynaklı örnek planlar." },
  { id: "monthly", title: "EK-5 Aylık Plan", tag: "s.182", category: "planning", icon: "📅", description: "3B değerlendirme, alan becerileri ve MEB örnek aylık planı." },
  { id: "checklist", title: "EK-15 Kontrol Çizelgesi", tag: "s.207", category: "planning", icon: "📊", description: "60–72 ay resmî EK-15 satırları ve aylık plan kapsamı." },
  { id: "monthly_evaluation", title: "3B Aylık Değerlendirme", tag: "s.111", category: "planning", icon: "📈", description: "Tablo 1 (Çocuk), Tablo 2 (Program), Tablo 3 (Öğretmen) raporu." },
  { id: "morning_orientation", title: "Güne Başlama & Duygu Panosu", tag: "s.93", category: "planning", icon: "☀️", description: "Rutin 1: Selamlaşma, duygu yoklaması, günün mesajı ve merak sorusu." },
  { id: "day_closing", title: "Günü Değerlendirme Çemberi", tag: "s.92", category: "planning", icon: "⭕", description: "Rutin 5: Duygu, kavram, erdem ve yarın hazırlığı kapanış tutanağı." },
  { id: "nutrition_tracker", title: "Beslenme & Hijyen Takip", tag: "s.92", category: "planning", icon: "🍎", description: "Rutin 3: Besin tüketimi, su takibi, el/diş hijyeni ve veli bilgi cetveli." },

  // Ölçme & Değerlendirme (8)
  { id: "rubric", title: "Gözlem Rubriği", tag: "s.109", category: "assessment", icon: "📐", description: "7 alanda 3 düzeyli süreç odaklı dereceli puanlama anahtarı." },
  { id: "skill_acquisition", title: "Beceri Edinim (e-Okul)", tag: "s.110", category: "assessment", icon: "🌟", description: "Kayıtlı öğretmen değerlendirmesinden hazırlık; e-Okul aktarımı yapılmaz." },
  { id: "term_report", title: "Resmî Karne (Gelişim Raporu)", tag: "s.109", category: "assessment", icon: "🎓", description: "10 gelişim alanı renkli A4 ikiye katlanır karne ve kanaat şablonları." },
  { id: "portfolio", title: "Portfolyo (Ürün Seçkisi)", tag: "s.110", category: "assessment", icon: "🖼️", description: "Kamera/galeri ürün fotoğrafları, çocuk ifadeleri ve katalog." },
  { id: "self_peer", title: "Öz & Akran Değerlendirme", tag: "s.110", category: "assessment", icon: "🙂", description: "Gülen yüzler, çocuk cümleleri ve akran iş birliği tescili." },
  { id: "child_interview", title: "Çocukla Görüşme (Mülakat)", tag: "s.109", category: "assessment", icon: "🗣️", description: "Pedagojik soru bankası, doğrudan alıntı ve bireysel takip." },
  { id: "classroom_skills", title: "Sınıf Beceri Matrisi", tag: "s.109", category: "assessment", icon: "📊", description: "Sınıfın kayıtlı çocuklarına ait gelişim alanlarını birlikte inceleyin." },
  { id: "anecdote", title: "EK-2 Anekdot Formu", tag: "s.178", category: "assessment", icon: "📝", description: "Objektif durum ve davranış gözlem tutanağı." },

  // Aile & Rehberlik (7)
  { id: "family_activity", title: "Aile Etkinlik Planı", tag: "s.94", category: "family", icon: "🎨", description: "Velilerin sınıfta yapacakları atölye ve meslek uygulama planı." },
  { id: "meeting_minutes", title: "Veli Toplantı Tutanağı", tag: "s.94", category: "family", icon: "📝", description: "Sene başı/sonu toplantı gündemi, alınan kararlar ve imza cetveli." },
  { id: "digital_learning", title: "Ekran & Dijital Taahhüt", tag: "s.107", category: "family", icon: "📱", description: "30 dk ekran sınırı, sosyal medya mahremiyeti ve aile sözleşmesi." },
  { id: "guidance", title: "PDR & Rehberlik Takip", tag: "s.81", category: "family", icon: "🧭", description: "Sosyal uyum, risk faktörleri ve RAM yönlendirme tutanağı." },
  { id: "conflict_resolution", title: "Barış Masası & Çatışma Çözme", tag: "s.108", category: "family", icon: "🕊️", description: "4 adımlı onarıcı adalet, akran dinleme ve uzlaşma protokolü." },
  { id: "newsletter", title: "Veli Bülteni & Pusula", tag: "s.102", category: "family", icon: "📰", description: "Haftalık kavramlar, erdemler, WhatsApp metni ve ev etkinlikleri." },
  { id: "family_need", title: "EK-9 Aile İhtiyaç Formu", tag: "s.188", category: "family", icon: "👨‍👩‍👧", description: "19 konulu veli eğitim ve danışmanlık anketi." },
  { id: "family_participation", title: "EK-10 Aile Katılım Formu", tag: "s.190", category: "family", icon: "🤝", description: "5 boyutta veli etkinlik ve materyal destek tercihleri." },
  { id: "student_intake", title: "Öğrenciyi Tanıma Formu", tag: "s.193", category: "family", icon: "🧒", description: "Sene başı veli bilgi, sağlık, alerji, teslim yetkilisi anketi." },

  // Ortam & Güvenlik (4)
  { id: "centers_audit", title: "Merkezler Denetimi", tag: "s.97", category: "environment", icon: "🔍", description: "6 merkezin CE, hijyen ve ergonomi standartları denetim tutanağı." },
  { id: "outdoor_garden", title: "Açık Hava & Bahçe Rehberi", tag: "s.104", category: "environment", icon: "🌳", description: "12 maddelik açık hava güvenlik kontrolü, çamur mutfağı ve su kanalları." },
  { id: "outside", title: "EK-4 Okul Dışı Planı", tag: "s.180", category: "environment", icon: "🌳", description: "Gezi güzergâhı, lojistik ve 8 pedagojik değerlendirme sorusu." },
  { id: "outside_protocol", title: "EK-3 Güvenlik Protokolü", tag: "s.179", category: "environment", icon: "🛡️", description: "14 maddelik idari izin, veli muvafakati ve güvenlik taahhütnamesi." },

  // Müfredat & Kaynaklar (6)
  { id: "inspection_dossier", title: "Teftiş Dosyası İndeksi", tag: "Müfettiş", category: "curriculum", icon: "🏛️", description: "30 dosya grubu resmi teftiş kontrol listesi ve klasör sırtlığı." },
  { id: "ek1_skills", title: "EK-1 Alan Becerileri", tag: "s.141", category: "curriculum", icon: "📖", description: "36-72 ay 7 temel öğrenme alanının süreç bileşenleri matrisi." },
  { id: "differentiation", title: "Farklılaştırma / BEP", tag: "s.105", category: "curriculum", icon: "⚡", description: "Destekleme ve zenginleştirme stratejileri, materyal uyarlamaları." },
  { id: "games", title: "Resmî Oyun Sandığı", tag: "s.86", category: "curriculum", icon: "🎲", description: "Geleneksel Türk çocuk oyunları, rastgele çark ve A4 oyun kartları." },
  { id: "zero_waste", title: "Sıfır Atık / Materyal", tag: "OB8", category: "curriculum", icon: "🌱", description: "5 merkez geri dönüşüm rehberi ve WhatsApp veli çağrısı." },
  { id: "tables", title: "Referans Tabloları", tag: "EK-11..14", category: "curriculum", icon: "📚", description: "SDB, Erdem-Değer-Eylem, Eğilimler ve Okuryazarlık tabloları." },
];

interface Props {
  store: LocalDataStore;
  disabled?: boolean;
  initialForm?: OfficialFormType;
  initialSelectorOpen?: boolean;
  onClose?: () => void;
}

export function OfficialFormsWorkspace({ store, disabled = false, initialForm = "daily", initialSelectorOpen = false, onClose }: Props) {
  const [activeForm, setActiveForm] = useState<OfficialFormType>(initialForm);
  const [selectorOpen, setSelectorOpen] = useState(initialSelectorOpen);
  const [recentForms, setRecentForms] = useState<OfficialFormType[]>([initialForm]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Partial<Record<OfficialFormType, number>>>({});
  useFormEditorSizing(bodyRef);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const restore = () => {
      if (!body.querySelector(".official-form-modal")) return false;
      body.scrollTop = scrollPositions.current[activeForm] ?? 0;
      return true;
    };
    if (restore()) return;
    const observer = new MutationObserver(() => { if (restore()) observer.disconnect(); });
    observer.observe(body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [activeForm]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const workspace = workspaceRef.current;
    workspace?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (!workspace || document.querySelector("dialog[open]")) return;
      if (event.key === "Escape" && onClose) { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const items = Array.from(workspace.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter((item) => item.getClientRects().length > 0);
      const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === workspace)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    workspace?.addEventListener("keydown", trapFocus);
    return () => { workspace?.removeEventListener("keydown", trapFocus); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  function chooseForm(id: OfficialFormType) {
    scrollPositions.current[activeForm] = bodyRef.current?.scrollTop ?? 0;
    setActiveForm(id);
    setRecentForms((previous) => [id, ...previous.filter((item) => item !== id)].slice(0, 5));
    setSelectorOpen(false);
  }
  const activeMetadata = OFFICIAL_FORMS_REGISTRY.find((form) => form.id === activeForm)!;
  const [selectedCategory, setSelectedCategory] = useState<FormCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredForms = useMemo(() => {
    let list = OFFICIAL_FORMS_REGISTRY;
    if (selectedCategory !== "all") {
      list = list.filter((f) => f.category === selectedCategory);
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLocaleLowerCase("tr-TR");
      list = list.filter(
        (f) =>
          f.title.toLocaleLowerCase("tr-TR").includes(q) ||
          f.description.toLocaleLowerCase("tr-TR").includes(q) ||
          f.tag.toLocaleLowerCase("tr-TR").includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  return createPortal(
    <div className="official-workspace-overlay" ref={workspaceRef} role="dialog" aria-modal="true" aria-label="Form çalışma alanı" tabIndex={-1}>
      <header className="official-workspace-header no-print">
        <div className="official-workspace-header__main">
          <div className="official-workspace-title-group">
            <small className="official-workspace-subtitle">Form çalışma alanı</small>
            <h2 className="official-workspace-title">{activeMetadata.title}</h2>
          </div>
          <div className="official-workspace-header__tools">
            <button type="button" className="of-btn of-btn--close" aria-haspopup="dialog" onClick={() => setSelectorOpen(true)}>Form değiştir</button>
            {onClose && <button type="button" className="of-btn of-btn--close" onClick={onClose} aria-label="Form çalışma alanını kapat">Kapat</button>}
          </div>
        </div>
      </header>
      <FormDialog open={selectorOpen} title="Form seç" onClose={() => setSelectorOpen(false)}>
        <label className="of-picker-field">Form ara
          <input type="search" className="of-input" autoFocus placeholder="Ad, konu veya kaynak sayfası" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
        </label>
        <label className="of-picker-field">Kategori
          <select className="of-input" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as FormCategory)}>
            <option value="all">Tüm formlar ({OFFICIAL_FORMS_REGISTRY.length})</option>
            <option value="planning">Plan ve çizelge</option><option value="assessment">Ölçme ve değerlendirme</option>
            <option value="family">Aile ve rehberlik</option><option value="environment">Ortam ve güvenlik</option><option value="curriculum">Müfredat ve kaynaklar</option>
          </select>
        </label>
        {!searchQuery && selectedCategory === "all" && <section aria-label="Son kullanılan formlar" className="of-recent-forms">
          <h3>Son kullanılanlar</h3>
          {recentForms.map((id) => <button type="button" className="of-btn of-btn--close" key={id} onClick={() => chooseForm(id)}>{OFFICIAL_FORMS_REGISTRY.find((item) => item.id === id)?.title}</button>)}
        </section>}
        <p role="status">{filteredForms.length} form</p>
        <div className="of-form-picker-list">
          {filteredForms.map((item) => <button key={item.id} type="button" className="of-form-picker-item" aria-pressed={activeForm === item.id} onClick={() => chooseForm(item.id)}>
            <strong>{item.icon} {item.title}</strong><span>{item.description}</span>
          </button>)}
          {filteredForms.length === 0 && <p>Bu aramaya uygun form bulunamadı.</p>}
        </div>
        <a className="of-btn of-btn--pdf" href="./assets/resources/ttkb-okul-oncesi-programi.pdf" target="_blank" rel="noopener noreferrer">Resmî program kitabını aç (PDF)</a>
      </FormDialog>

      {/* Active Form Body */}
      <div className="official-workspace-body" ref={bodyRef}>
        <OfficialFormRecordProvider key={activeForm} store={store} formId={activeForm} disabled={disabled}>
        {activeForm === "smart_daily" && <SmartDailyPlanWizard onClose={onClose} />}
        {activeForm === "daily" && <OfficialDailyPlanForm onClose={onClose} />}
        {activeForm === "monthly" && <OfficialMonthlyPlanForm onClose={onClose} />}
        {activeForm === "checklist" && <OfficialMonthlyPlanChecklistForm onClose={onClose} />}
        {activeForm === "monthly_evaluation" && <OfficialMonthlyEvaluationReportModal onClose={onClose} />}
        {activeForm === "morning_orientation" && <OfficialMorningOrientationModal onClose={onClose} />}
        {activeForm === "day_closing" && <OfficialDayClosingCircleModal onClose={onClose} />}
        {activeForm === "rubric" && <OfficialDevelopmentalRubricModal onClose={onClose} />}
        {activeForm === "skill_acquisition" && <OfficialSkillAcquisitionReportModal onClose={onClose} />}
        {activeForm === "term_report" && <OfficialTermDevelopmentReport onClose={onClose} />}
        {activeForm === "portfolio" && <StudentPortfolioGalleryModal onClose={onClose} />}
        {activeForm === "self_peer" && <OfficialSelfPeerEvaluationModal onClose={onClose} />}
        {activeForm === "child_interview" && <OfficialChildInterviewModal onClose={onClose} />}
        {activeForm === "classroom_skills" && <OfficialClassroomSkillsMatrixModal onClose={onClose} />}
        {activeForm === "anecdote" && <OfficialAnecdoteForm onClose={onClose} />}
        {activeForm === "family_activity" && <OfficialFamilyActivityPlanModal onClose={onClose} />}
        {activeForm === "meeting_minutes" && <OfficialFamilyMeetingMinutesModal onClose={onClose} />}
        {activeForm === "digital_learning" && <OfficialDigitalLearningGuideModal onClose={onClose} />}
        {activeForm === "guidance" && <OfficialGuidanceReferralForm onClose={onClose} />}
        {activeForm === "conflict_resolution" && <OfficialConflictResolutionModal onClose={onClose} />}
        {activeForm === "student_intake" && <OfficialStudentIntakeFormModal onClose={onClose} />}
        {activeForm === "nutrition_tracker" && <OfficialNutritionHygieneTrackerModal onClose={onClose} />}
        {activeForm === "newsletter" && <WeeklyFamilyNewsletterModal onClose={onClose} />}
        {activeForm === "family_need" && <OfficialFamilyNeedForm onClose={onClose} />}
        {activeForm === "family_participation" && <OfficialFamilyParticipationForm onClose={onClose} />}
        {activeForm === "centers_audit" && <OfficialLearningCentersAuditModal onClose={onClose} />}
        {activeForm === "outdoor_garden" && <OfficialOutdoorGardenGuideModal onClose={onClose} />}
        {activeForm === "outside" && <OfficialSchoolOutsidePlan onClose={onClose} />}
        {activeForm === "outside_protocol" && <OfficialSchoolOutsideProtocol onClose={onClose} />}
        {activeForm === "inspection_dossier" && <OfficialInspectionDossierModal onClose={onClose} />}
        {activeForm === "ek1_skills" && <OfficialEK1SkillMatrixModal onClose={onClose} />}
        {activeForm === "differentiation" && <DifferentiationGuideModal onClose={onClose} />}
        {activeForm === "games" && <OfficialGamesLibraryModal onClose={onClose} />}
        {activeForm === "zero_waste" && <ZeroWasteMaterialGuideModal onClose={onClose} />}
        {activeForm === "tables" && <OfficialTymmReferenceTablesModal onClose={onClose} />}
        </OfficialFormRecordProvider>
      </div>
    </div>,
    document.body
  );
}
