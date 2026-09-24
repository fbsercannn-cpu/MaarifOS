import { useEffect, useState } from "react";
import { CheckCircledIcon, Cross2Icon, ArrowRightIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  DAILY_EVALUATION_PRESETS,
  createInitialDailyEvaluationAspect,
  findDailyPlanEvaluation,
  type DailyEvaluationAspect,
  type DailyPlanEvaluationRecord,
} from "../../core/domain/teacher-owned-daily-evaluation.ts";
import { saveDailyPlanEvaluation } from "./daily-plan-activity-service.ts";
import "./daily-plan-enhancements.css";

export interface DailyPlanEvaluationSheetProps {
  isOpen: boolean;
  onClose(): void;
  store: LocalDataStore;
  scope: ActiveClassroomScope;
  planId: string;
  civilDate: string;
  onSaved?(): void;
}

type AspectKey = "children" | "teacher" | "program";

const STEP_LABELS: Record<AspectKey, { title: string; subtitle: string }> = {
  children: {
    title: "1. Çocuk Açısından Değerlendirme",
    subtitle: "Çocukların katılımı, etkileşimi, ilgisi ve bireysel farklılıkları",
  },
  teacher: {
    title: "2. Öğretmen Açısından Değerlendirme",
    subtitle: "Öğretim yöntemleri, rehberlik, süre yönetimi ve uyarlamalar",
  },
  program: {
    title: "3. Program Açısından Değerlendirme",
    subtitle: "TYMM öğrenme çıktıları, erdem-değerler, ortam ve materyal uygunluğu",
  },
};

export function DailyPlanEvaluationSheet({
  isOpen,
  onClose,
  store,
  scope,
  planId,
  civilDate,
  onSaved,
}: DailyPlanEvaluationSheetProps) {
  const [activeStep, setActiveStep] = useState<AspectKey>("children");
  const [aspects, setAspects] = useState<Record<AspectKey, DailyEvaluationAspect>>({
    children: createInitialDailyEvaluationAspect("children", 0),
    teacher: createInitialDailyEvaluationAspect("teacher", 0),
    program: createInitialDailyEvaluationAspect("program", 0),
  });
  const [overallNote, setOverallNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    void store.readSnapshot().then((snapshot) => {
      if (!isMounted) return;
      const existing = findDailyPlanEvaluation(snapshot, planId);
      if (existing) {
        setAspects({
          children: existing.workflow.children,
          teacher: existing.workflow.teacher,
          program: existing.workflow.program,
        });
        setOverallNote(existing.workflow.overallNote || "");
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, planId, store]);

  if (!isOpen) return null;

  const currentAspect = aspects[activeStep];
  const presets = DAILY_EVALUATION_PRESETS[activeStep];

  const handleSelectPreset = (preset: (typeof presets)[number]) => {
    setAspects((prev) => ({
      ...prev,
      [activeStep]: {
        presetId: preset.id,
        title: preset.title,
        narrative: preset.narrative,
        customized: false,
      },
    }));
  };

  const handleNarrativeChange = (text: string) => {
    setAspects((prev) => ({
      ...prev,
      [activeStep]: {
        ...prev[activeStep],
        narrative: text,
        customized: true,
      },
    }));
  };

  const handleSave = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveDailyPlanEvaluation(store, scope, {
        planId,
        civilDate,
        children: aspects.children,
        teacher: aspects.teacher,
        program: aspects.program,
        overallNote,
      });
      setMessage("✅ Günlük değerlendirme başarıyla kaydedildi.");
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dpe-sheet-overlay" role="dialog" aria-modal="true" aria-label="Günlük Plan Değerlendirmesi">
      <div className="dpe-sheet-container">
        {/* Header */}
        <div className="dpe-header">
          <div className="dpe-header-title">
            <h3>Günlük Plan Değerlendirmesi</h3>
            <p>{civilDate} · Türkiye Yüzyılı Maarif Modeli 3 Boyutlu Dönüt Paneli</p>
          </div>
          <button
            type="button"
            className="dpe-close-btn"
            onClick={onClose}
            aria-label="Değerlendirme panelini kapat"
          >
            <Cross2Icon />
          </button>
        </div>

        {/* Step Navigation Bar (Tık Tık İlerle) */}
        <div className="dpe-steps-bar">
          <button
            type="button"
            className={`dpe-step-btn ${activeStep === "children" ? "active" : "completed"}`}
            onClick={() => setActiveStep("children")}
          >
            1. Çocuk Açısından
          </button>
          <button
            type="button"
            className={`dpe-step-btn ${activeStep === "teacher" ? "active" : ""}`}
            onClick={() => setActiveStep("teacher")}
          >
            2. Öğretmen Açısından
          </button>
          <button
            type="button"
            className={`dpe-step-btn ${activeStep === "program" ? "active" : ""}`}
            onClick={() => setActiveStep("program")}
          >
            3. Program Açısından
          </button>
        </div>

        {/* Body Content */}
        <div className="dpe-body">
          {message && (
            <div style={{ padding: "10px", background: "#ecfdf5", color: "#065f46", borderRadius: "8px", fontWeight: 600 }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding: "10px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div className="dpe-aspect-intro">
            <h4>{STEP_LABELS[activeStep].title}</h4>
            <p>{STEP_LABELS[activeStep].subtitle}</p>
          </div>

          {/* Preset Cards Selection */}
          <div className="dpe-preset-grid">
            {presets.map((preset) => {
              const isSelected = currentAspect.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`dpe-preset-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="dpe-preset-card-title">
                    {isSelected && "✓ "}
                    {preset.title}
                  </div>
                  <div className="dpe-preset-card-snippet">{preset.narrative}</div>
                </button>
              );
            })}
          </div>

          {/* Customizable Textarea */}
          <div className="dpe-editor-box">
            <div className="dpe-editor-label">
              <span>Seçilen / Düzenlenen Değerlendirme Metni</span>
              <span className="dpe-editor-hint">
                {currentAspect.customized ? "(Öğretmen tarafından düzenlendi)" : "(Hazır şablon)"}
              </span>
            </div>
            <textarea
              className="dpe-textarea"
              value={currentAspect.narrative}
              onChange={(e) => handleNarrativeChange(e.target.value)}
              placeholder="Günün dönütlerine göre metni serbestçe şekillendirebilirsiniz..."
              aria-label={`${STEP_LABELS[activeStep].title} metni`}
            />
          </div>

          {/* Optional Overall Note on the last step */}
          {activeStep === "program" && (
            <div className="dpe-editor-box" style={{ marginTop: "4px" }}>
              <div className="dpe-editor-label">
                <span>Günün Genel Notu (İsteğe Bağlı)</span>
              </div>
              <textarea
                className="dpe-textarea"
                style={{ minHeight: "60px" }}
                value={overallNote}
                onChange={(e) => setOverallNote(e.target.value)}
                placeholder="Örn: Yarın veli katılımı için malzemeler tamamlandı..."
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="dpe-footer">
          {activeStep !== "children" ? (
            <button
              type="button"
              className="dpe-btn-secondary"
              onClick={() => {
                if (activeStep === "program") setActiveStep("teacher");
                else if (activeStep === "teacher") setActiveStep("children");
              }}
            >
              <ArrowLeftIcon style={{ marginRight: 4 }} /> Önceki Adım
            </button>
          ) : (
            <div />
          )}

          {activeStep !== "program" ? (
            <button
              type="button"
              className="dpe-btn-primary"
              onClick={() => {
                if (activeStep === "children") setActiveStep("teacher");
                else if (activeStep === "teacher") setActiveStep("program");
              }}
            >
              Sonraki Boyut <ArrowRightIcon />
            </button>
          ) : (
            <button
              type="button"
              className="dpe-btn-primary dpe-btn-save"
              disabled={busy}
              onClick={handleSave}
            >
              <CheckCircledIcon /> Günü Değerlendir ve Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
