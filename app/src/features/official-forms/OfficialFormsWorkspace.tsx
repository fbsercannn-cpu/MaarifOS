import { useState, useMemo } from "react";
import { OfficialAnecdoteForm } from "./OfficialAnecdoteForm.tsx";
import { OfficialSchoolOutsidePlan } from "./OfficialSchoolOutsidePlan.tsx";
import { OfficialSchoolOutsideProtocol } from "./OfficialSchoolOutsideProtocol.tsx";
import { OfficialDailyPlanForm } from "./OfficialDailyPlanForm.tsx";
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
  // Planlama & Çizelgeler (6)
  { id: "daily", title: "EK-6 Günlük Plan", tag: "s.183", category: "planning", icon: "📋", description: "Rutinler, etkinlik akışı ve MEB örnek plan enjektörü." },
  { id: "monthly", title: "EK-5 Aylık Plan", tag: "s.182", category: "planning", icon: "📅", description: "3B değerlendirme, alan becerileri ve MEB örnek aylık planı." },
  { id: "checklist", title: "EK-15 Kontrol Çizelgesi", tag: "s.207", category: "planning", icon: "📊", description: "36-72 ay 10 aylık tam kazanım ve kavram matrisi." },
  { id: "monthly_evaluation", title: "3B Aylık Değerlendirme", tag: "s.111", category: "planning", icon: "📈", description: "Tablo 1 (Çocuk), Tablo 2 (Program), Tablo 3 (Öğretmen) raporu." },
  { id: "morning_orientation", title: "Güne Başlama & Duygu Panosu", tag: "s.93", category: "planning", icon: "☀️", description: "Rutin 1: Selamlaşma, duygu yoklaması, günün mesajı ve merak sorusu." },
  { id: "day_closing", title: "Günü Değerlendirme Çemberi", tag: "s.92", category: "planning", icon: "⭕", description: "Rutin 5: Duygu, kavram, erdem ve yarın hazırlığı kapanış tutanağı." },
  { id: "nutrition_tracker", title: "Beslenme & Hijyen Takip", tag: "s.92", category: "planning", icon: "🍎", description: "Rutin 3: Besin tüketimi, su takibi, el/diş hijyeni ve veli bilgi cetveli." },

  // Ölçme & Değerlendirme (8)
  { id: "rubric", title: "Gözlem Rubriği", tag: "s.109", category: "assessment", icon: "📐", description: "7 alanda 3 düzeyli süreç odaklı dereceli puanlama anahtarı." },
  { id: "skill_acquisition", title: "Beceri Edinim (e-Okul)", tag: "s.110", category: "assessment", icon: "🌟", description: "7 öğrenme alanı e-Okul kopyalama motoru ve resmi döküm." },
  { id: "term_report", title: "Resmî Karne (Gelişim Raporu)", tag: "s.109", category: "assessment", icon: "🎓", description: "10 gelişim alanı renkli A4 ikiye katlanır karne ve kanaat şablonları." },
  { id: "portfolio", title: "Portfolyo (Ürün Seçkisi)", tag: "s.110", category: "assessment", icon: "🖼️", description: "Kamera/galeri ürün fotoğrafları, çocuk ifadeleri ve katalog." },
  { id: "self_peer", title: "Öz & Akran Değerlendirme", tag: "s.110", category: "assessment", icon: "🙂", description: "Gülen yüzler, çocuk cümleleri ve akran iş birliği tescili." },
  { id: "child_interview", title: "Çocukla Görüşme (Mülakat)", tag: "s.109", category: "assessment", icon: "🗣️", description: "Pedagojik soru bankası, doğrudan alıntı ve bireysel takip." },
  { id: "classroom_skills", title: "Sınıf Beceri Matrisi", tag: "s.109", category: "assessment", icon: "📊", description: "20 çocuk x 10 boyut yatay sınıf gelişim tablosu." },
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
  initialForm?: OfficialFormType;
  onClose?: () => void;
}

export function OfficialFormsWorkspace({ initialForm = "daily", onClose }: Props) {
  const [activeForm, setActiveForm] = useState<OfficialFormType>(initialForm);
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

  return (
    <div className="official-workspace-overlay">
      {/* Workspace Navigation Bar (No Print) */}
      <div className="official-workspace-header no-print">
        <div className="official-workspace-header__main">
          <div className="official-workspace-header__brand">
            <span className="official-workspace-badge">MEB TTKB</span>
            <div className="official-workspace-title-group">
              <h2 className="official-workspace-title">Türkiye Yüzyılı Maarif Modeli Resmî Formlar</h2>
              <span className="official-workspace-subtitle">
                A4 Baskı &amp; Word (.doc) Tam Uyumlu 34 Enstrümanlı Kapsamlı Resmî Külliyat
              </span>
            </div>
          </div>

          <div className="official-workspace-header__tools">
            <a
              href="/assets/resources/ttkb-okul-oncesi-programi.pdf"
              download="TTKB_Okul_Oncesi_Egitim_Programi.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="of-btn of-btn--pdf"
              title="221 Sayfalık Resmî TTKB Müfredat Kitapçığını İndir"
            >
              📥 Resmî Müfredat Kitabı (PDF İndir)
            </a>
            {onClose && (
              <button
                type="button"
                className="of-btn of-btn--close"
                onClick={onClose}
                aria-label="Kapat"
              >
                ✕ Kapat
              </button>
            )}
          </div>
        </div>

        {/* Category Filter & Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Category Chips */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "🌟 Tümü (34)" },
              { id: "planning", label: "📋 Plan & Çizelge (7)" },
              { id: "assessment", label: "📊 Ölçme & Değerlendirme (8)" },
              { id: "family", label: "👨‍👩‍👧 Aile & Rehberlik (9)" },
              { id: "environment", label: "🌳 Ortam & Güvenlik (4)" },
              { id: "curriculum", label: "📚 Müfredat & Kaynak (6)" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as FormCategory)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "0.78rem",
                  border: selectedCategory === cat.id ? "1px solid #0284c7" : "1px solid #cbd5e1",
                  background: selectedCategory === cat.id ? "#0284c7" : "#fff",
                  color: selectedCategory === cat.id ? "#fff" : "#334155",
                  fontWeight: selectedCategory === cat.id ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <input
              type="text"
              placeholder="🔍 Form veya sayfa ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                background: "#fff",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="official-workspace-tabs" role="tablist">
          {filteredForms.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeForm === item.id}
              className={`official-tab-btn ${activeForm === item.id ? "is-active" : ""}`}
              onClick={() => setActiveForm(item.id)}
              title={item.description}
            >
              {item.icon} {item.title} <span className="tab-page-tag">{item.tag}</span>
            </button>
          ))}
          {filteredForms.length === 0 && (
            <div style={{ padding: "8px 16px", color: "#64748b", fontSize: "0.85rem" }}>
              Arama kriterinize uygun resmî form bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* Active Form Body */}
      <div className="official-workspace-body">
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
      </div>
    </div>
  );
}
