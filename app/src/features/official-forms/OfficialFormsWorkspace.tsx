import { useState } from "react";
import { OfficialAnecdoteForm } from "./OfficialAnecdoteForm.tsx";
import { OfficialSchoolOutsidePlan } from "./OfficialSchoolOutsidePlan.tsx";
import { OfficialDailyPlanForm } from "./OfficialDailyPlanForm.tsx";
import { OfficialMonthlyPlanForm } from "./OfficialMonthlyPlanForm.tsx";
import "./official-forms.css";

export type OfficialFormType = "anecdote" | "outside" | "daily" | "monthly";

interface Props {
  initialForm?: OfficialFormType;
  onClose?: () => void;
}

export function OfficialFormsWorkspace({ initialForm = "daily", onClose }: Props) {
  const [activeForm, setActiveForm] = useState<OfficialFormType>(initialForm);

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
                A4 Baskı &amp; Word (.doc) Tam Uyumlu Evrak Sistemi
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

        {/* Tab Selector */}
        <div className="official-workspace-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === "daily"}
            className={`official-tab-btn ${activeForm === "daily" ? "is-active" : ""}`}
            onClick={() => setActiveForm("daily")}
          >
            📋 EK-6 Günlük Plan <span className="tab-page-tag">s.183-184</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === "monthly"}
            className={`official-tab-btn ${activeForm === "monthly" ? "is-active" : ""}`}
            onClick={() => setActiveForm("monthly")}
          >
            📅 EK-5 Aylık Plan <span className="tab-page-tag">s.182</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === "anecdote"}
            className={`official-tab-btn ${activeForm === "anecdote" ? "is-active" : ""}`}
            onClick={() => setActiveForm("anecdote")}
          >
            📝 EK-2 Anekdot Formu <span className="tab-page-tag">s.178</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === "outside"}
            className={`official-tab-btn ${activeForm === "outside" ? "is-active" : ""}`}
            onClick={() => setActiveForm("outside")}
          >
            🌳 EK-4 Okul Dışı Öğrenme <span className="tab-page-tag">s.180-181</span>
          </button>
        </div>
      </div>

      {/* Active Form Body */}
      <div className="official-workspace-body">
        {activeForm === "daily" && <OfficialDailyPlanForm onClose={onClose} />}
        {activeForm === "monthly" && <OfficialMonthlyPlanForm onClose={onClose} />}
        {activeForm === "anecdote" && <OfficialAnecdoteForm onClose={onClose} />}
        {activeForm === "outside" && <OfficialSchoolOutsidePlan onClose={onClose} />}
      </div>
    </div>
  );
}
