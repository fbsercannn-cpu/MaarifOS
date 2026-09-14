/**
 * T.C. Hazine ve Maliye Bakanlığı & MaarifOS Standartları
 * Günün Planı Slide-Over İnceleme ve Akış Çekmecesi
 * İlham: okuloncesirehberi.com (Günün Planı Akışı ve Çekmece Görünümü)
 * Mimari: Sıfır harici API, %100 Client-Side, A4 ve Word Doğrudan Dışa Aktarım
 */

import { useEffect, useState } from "react";
import {
  CalendarIcon,
  CheckCircledIcon,
  ClockIcon,
  Cross2Icon,
  DownloadIcon,
  PlusIcon,
  ReaderIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  findDailyPlanEvaluation,
  type DailyPlanEvaluationRecord,
} from "../../core/domain/teacher-owned-daily-evaluation.ts";
import {
  isTeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlowBlock,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import { exportDailyPlanDocument } from "./daily-plan-export-service.ts";
import "./daily-plan-enhancements.css";

export interface DailyPlanDrawerProps {
  isOpen: boolean;
  onClose(): void;
  store: LocalDataStore;
  scope: ActiveClassroomScope;
  planId: string;
  civilDate: string;
  ageBand?: string | null;
  onOpenEvaluation(): void;
  onOpenAddActivity(): void;
}

const BLOCK_ICONS: Record<string, string> = {
  welcome: "👋",
  "center-play": "🧩",
  "community-circle": "⭕",
  "teacher-activity-one": "⭐",
  "food-selfcare": "🍎",
  "outdoor-movement": "🏃",
  "teacher-activity-two": "🎨",
  "rest-regulation": "🧘",
  "small-group": "👥",
  closing: "🌟",
};

export function DailyPlanDrawer({
  isOpen,
  onClose,
  store,
  scope,
  planId,
  civilDate,
  ageBand,
  onOpenEvaluation,
  onOpenAddActivity,
}: DailyPlanDrawerProps) {
  const [planRecord, setPlanRecord] = useState<StoredRecord | null>(null);
  const [linkedActivities, setLinkedActivities] = useState<StoredRecord[]>([]);
  const [evaluation, setEvaluation] = useState<DailyPlanEvaluationRecord | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"word" | "pdf" | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void store.readSnapshot().then((snapshot) => {
      if (!active) return;
      const plan = snapshot.plans.find((p) => p.id === planId) ?? null;
      setPlanRecord(plan);

      const activities = snapshot.activities.filter(
        (a) => a.planId === planId && typeof a.deletedAt !== "string",
      );
      setLinkedActivities(activities);

      const evalRecord = findDailyPlanEvaluation(snapshot, planId);
      setEvaluation(evalRecord);
    });
    return () => { active = false; };
  }, [store, planId, isOpen]);

  if (!isOpen) return null;

  const flow: TeacherOwnedDailyFlow | null =
    planRecord?.flow && isTeacherOwnedDailyFlow(planRecord.flow)
      ? planRecord.flow
      : null;

  const handleExport = async (format: "word" | "pdf") => {
    try {
      setExportingFormat(format);
      setExportMessage(null);
      const res = await exportDailyPlanDocument({
        store,
        scope,
        planId,
        format,
        ageBand,
      });
      setExportMessage(`✅ ${res.fileName} başarıyla indirildi.`);
    } catch (err) {
      setExportMessage(`❌ Hata: ${err instanceof Error ? err.message : "Dışa aktarılamadı"}`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div
      className="daily-plan-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-plan-drawer-title"
    >
      <div className="daily-plan-drawer">
        {/* Çekmece Başlığı */}
        <header className="daily-plan-drawer__header">
          <div>
            <div className="daily-plan-drawer__badges">
              <span className="daily-plan-drawer__date-badge">
                <CalendarIcon aria-hidden="true" />
                {civilDate}
              </span>
              {ageBand ? (
                <span className="daily-plan-drawer__age-badge">
                  {ageBand.replace("-", "–")} Ay Maarif
                </span>
              ) : null}
            </div>
            <h2 id="daily-plan-drawer-title" className="daily-plan-drawer__title">
              {planRecord?.title ? String(planRecord.title) : "Günün Eğitim Planı ve Akışı"}
            </h2>
          </div>
          <button
            type="button"
            className="daily-plan-modal__close-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </header>

        {/* Hızlı Dışa Aktarma Butonları */}
        <section className="daily-plan-drawer__export-bar" aria-label="Planı İndir ve Yazdır">
          <button
            type="button"
            className="daily-export-btn daily-export-btn--word"
            disabled={exportingFormat !== null}
            onClick={() => void handleExport("word")}
          >
            <DownloadIcon aria-hidden="true" />
            <span>{exportingFormat === "word" ? "Word Hazırlanıyor..." : "Word İndir (.docx)"}</span>
          </button>
          <button
            type="button"
            className="daily-export-btn daily-export-btn--pdf"
            disabled={exportingFormat !== null}
            onClick={() => void handleExport("pdf")}
          >
            <ReaderIcon aria-hidden="true" />
            <span>{exportingFormat === "pdf" ? "PDF Hazırlanıyor..." : "PDF / A4 Yazdır (.pdf)"}</span>
          </button>
        </section>

        {exportMessage ? (
          <div className="daily-plan-drawer__notice" role="status">
            {exportMessage}
          </div>
        ) : null}

        {/* 3 Boyutlu Değerlendirme Durum Paneli */}
        <section className="daily-plan-drawer__section" aria-labelledby="drawer-eval-heading">
          <div className="daily-plan-drawer__section-header">
            <div>
              <span className="daily-plan-drawer__eyebrow">TYMM DÖNÜT KONTROLÜ</span>
              <h3 id="drawer-eval-heading">Günün 3 Boyutlu Değerlendirmesi</h3>
            </div>
            <button
              type="button"
              className="daily-plan-drawer__inline-action"
              onClick={onOpenEvaluation}
            >
              ★ {evaluation ? "Düzenle" : "Değerlendir"}
            </button>
          </div>

          <div className="daily-drawer-eval-grid">
            <div className={`daily-drawer-eval-card ${evaluation?.workflow.children ? "is-complete" : "is-pending"}`}>
              <div className="daily-drawer-eval-card__title">
                {evaluation?.workflow.children ? <CheckCircledIcon /> : <ClockIcon />}
                <strong>1. Çocuk Boyutu</strong>
              </div>
              <p>
                {evaluation?.workflow.children
                  ? `${evaluation.workflow.children.title} — ${evaluation.workflow.children.narrative}`
                  : "Henüz çocuk katılım ve ilgi dönütü girilmedi."}
              </p>
            </div>

            <div className={`daily-drawer-eval-card ${evaluation?.workflow.teacher ? "is-complete" : "is-pending"}`}>
              <div className="daily-drawer-eval-card__title">
                {evaluation?.workflow.teacher ? <CheckCircledIcon /> : <ClockIcon />}
                <strong>2. Öğretmen Boyutu</strong>
              </div>
              <p>
                {evaluation?.workflow.teacher
                  ? `${evaluation.workflow.teacher.title} — ${evaluation.workflow.teacher.narrative}`
                  : "Henüz öğretim yöntem ve rehberlik dönütü girilmedi."}
              </p>
            </div>

            <div className={`daily-drawer-eval-card ${evaluation?.workflow.program ? "is-complete" : "is-pending"}`}>
              <div className="daily-drawer-eval-card__title">
                {evaluation?.workflow.program ? <CheckCircledIcon /> : <ClockIcon />}
                <strong>3. Program Boyutu</strong>
              </div>
              <p>
                {evaluation?.workflow.program
                  ? `${evaluation.workflow.program.title} — ${evaluation.workflow.program.narrative}`
                  : "Henüz TYMM kazanım ve materyal uygunluk dönütü girilmedi."}
              </p>
            </div>
          </div>
        </section>

        {/* Günün Akış Çizelgesi (10 Blok) */}
        <section className="daily-plan-drawer__section" aria-labelledby="drawer-flow-heading">
          <div className="daily-plan-drawer__section-header">
            <div>
              <span className="daily-plan-drawer__eyebrow">GÜNÜN ZAMAN ÇİZELGESİ</span>
              <h3 id="drawer-flow-heading">Pedagojik Gün Akışı & Etkinlikler</h3>
            </div>
            <button
              type="button"
              className="daily-plan-drawer__inline-action daily-plan-drawer__inline-action--primary"
              onClick={onOpenAddActivity}
            >
              <PlusIcon aria-hidden="true" />
              <span>Etkinlik Ekle</span>
            </button>
          </div>

          {flow ? (
            <div className="daily-timeline">
              {flow.blocks.map((block: TeacherOwnedDailyFlowBlock, idx: number) => {
                const icon = BLOCK_ICONS[block.kind] ?? "📌";
                const isActivityBlock =
                  block.kind === "teacher-activity-one" ||
                  block.kind === "teacher-activity-two" ||
                  block.kind === "small-group";

                // Find activity mapped to this block
                const activity = linkedActivities[idx] ?? null;

                return (
                  <div
                    key={block.id || idx}
                    className={`daily-timeline-item ${block.status === "planned" ? "is-planned" : ""}`}
                  >
                    <div className="daily-timeline-item__marker">
                      <span className="daily-timeline-item__icon">{icon}</span>
                      <span className="daily-timeline-item__line" />
                    </div>

                    <div className="daily-timeline-item__content">
                      <header className="daily-timeline-item__header">
                        <div>
                          <strong className="daily-timeline-item__title">{block.title}</strong>
                          <span className="daily-timeline-item__meta">
                            {block.durationMinutes > 0 ? `${block.durationMinutes} dakika` : "Rutin"}
                          </span>
                        </div>
                        <span className={`daily-timeline-item__status is-${block.status}`}>
                          {block.status === "planned" ? "Planlandı" : "İsteğe Bağlı"}
                        </span>
                      </header>

                      {activity ? (
                        <div className="daily-timeline-activity-card">
                          <span className="daily-timeline-activity-card__tag">
                            <TargetIcon aria-hidden="true" />
                            Bağlı Etkinlik
                          </span>
                          <h4 className="daily-timeline-activity-card__title">
                            {typeof activity.title === "string" ? activity.title : "Etkinlik"}
                          </h4>
                          {Array.isArray(activity.materials) && activity.materials.length > 0 ? (
                            <p className="daily-timeline-activity-card__materials">
                              📦 <strong>Materyaller:</strong>{" "}
                              {activity.materials.map(String).join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {block.transitionNote ? (
                        <p className="daily-timeline-item__transition">
                          🔄 <strong>Geçiş:</strong> {block.transitionNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="daily-plan-drawer__empty">
              Bu plan için henüz yapılandırılmış akış bloğu bulunamadı.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
