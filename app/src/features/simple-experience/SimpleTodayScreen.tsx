import { useState } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  GearIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type {
  TodayScreenActions,
  TodayScreenProps,
} from "../today/TodayScreen.tsx";
import {
  ACTIVITY_STUDIO_CATEGORY_LABELS,
  ACTIVITY_STUDIO_ITEMS,
  filterActivityStudioItems,
  type ActivityStudioAgeBand,
} from "../activity-studio/activity-studio-model.ts";
import {
  ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT,
  resolveActivityYearMonthLens,
  selectDailyActivitySuggestions,
} from "../activity-studio/activity-year-program.ts";
import {
  PEDAGOGICAL_SCENARIOS,
  PEDAGOGICAL_VARIANT_COUNT,
  createObservationCoverage,
  createPedagogicalDayFlow,
  createPedagogicalLoop,
  createPedagogicalSignals,
  resolveActivityAgeBand,
  type PedagogicalDayPhase,
  type PedagogicalScenarioId,
} from "../pedagogical-os/pedagogical-orchestrator.ts";
import type { ActivityStudioOpenOptions } from "./SimplePlanWorkspaceScreen.tsx";
import {
  createSetupProgressEvidence,
  createSetupProgressPresentation,
} from "../onboarding/setup-progress-model.ts";
import {
  createMarifTeacherAgentBrief,
  type MarifTeacherAgentAction,
} from "../today/marif-teacher-agent.ts";
import {
  compactTodayProgramLabel,
  configuredClassroomFromToday,
  createTeacherCyclePresentation,
  createTodayControlCenterSummary,
} from "../today/today-screen-model.ts";
import "./simple-experience.css";

export interface SimpleTodayScreenActions {
  onOpenSettings: TodayScreenActions["onOpenSettings"];
  onApplyReadyUpdate: TodayScreenActions["onApplyReadyUpdate"];
  onOpenAttendance: TodayScreenActions["onOpenAttendance"];
  onOpenCalendar: TodayScreenActions["onOpenCalendar"];
  onOpenWeekDay: TodayScreenActions["onOpenWeekDay"];
  onOpenDayClosure: TodayScreenActions["onOpenDayClosure"];
  onOpenPendingObservation: TodayScreenActions["onOpenPendingObservation"];
  onOpenStudentObservation: TodayScreenActions["onOpenStudentObservation"];
  onOpenQuickObservation(): void;
  onOpenPlanFlow: TodayScreenActions["onOpenPlanFlow"];
  onOpenTeacherCycleStage: TodayScreenActions["onOpenTeacherCycleStage"];
  onOpenSetupStep: TodayScreenActions["onOpenSetupStep"];
  onOpenActivityStudio(options?: ActivityStudioOpenOptions): void;
}

export interface SimpleTodayScreenProps extends Omit<TodayScreenProps, "actions"> {
  actions: SimpleTodayScreenActions;
}

function teacherGreeting(teacherName?: string): string {
  const firstName = teacherName?.trim().split(/\s+/u)[0];
  return firstName ? `Günaydın ${firstName} Öğretmen` : "Günaydın öğretmenim";
}

function ageBandLabel(value?: string): string {
  if (!value) return "Yaş grubu eksik";
  const normalized = value.trim().replace(/\s*(?:-|\u2013)\s*/u, "\u2013");
  return /\bay$/iu.test(normalized) ? normalized : `${normalized} ay`;
}

function AssistantActionIcon({ action }: { action: MarifTeacherAgentAction }) {
  if (action.kind === "attendance" || action.kind === "day-closure") {
    return <CheckCircledIcon />;
  }
  if (action.kind === "calendar") return <CalendarIcon />;
  if (action.kind === "setup" && action.stepId === "students") {
    return <PersonIcon />;
  }
  return <ReaderIcon />;
}

export function SimpleTodayScreen({ model, actions }: SimpleTodayScreenProps) {
  const [scenarioId, setScenarioId] =
    useState<PedagogicalScenarioId>("balanced");
  const classroom = configuredClassroomFromToday(model.workspace);
  const control = createTodayControlCenterSummary({
    workspace: model.workspace,
    attendance: model.attendance,
    pendingObservationCount: model.pendingObservationCount,
    teacherCycle: model.teacherCycle,
  });
  const cycle = createTeacherCyclePresentation(model.teacherCycle, {
    educationalWritesDisabled: model.educationalWritesDisabled,
  });
  const setup = createSetupProgressPresentation(
    model.setupProgress,
    createSetupProgressEvidence(model.teacherCycle, null),
  );
  const assistantBrief = createMarifTeacherAgentBrief({
    educationalWritesDisabled: model.educationalWritesDisabled,
    setup,
    control,
    cycle,
    dayClosure: model.dayClosure,
  });
  const assistantReasons = [assistantBrief.rationale, ...assistantBrief.evidence]
    .filter((reason, index, reasons) => reason && reasons.indexOf(reason) === index)
    .slice(0, 2);
  const dailyPlanReady = model.teacherCycle.daily.planId !== null;
  const documentSourceReady =
    model.teacherCycle.documents.planDocumentReady ||
    model.teacherCycle.documents.monthlyEvaluationCount > 0 ||
    model.teacherCycle.documents.anecdoteIncompleteCount > 0 ||
    model.teacherCycle.documents.anecdoteReviewRequiredCount > 0 ||
    model.teacherCycle.documents.anecdoteReadyCount > 0;
  const suggestedAgeBand = resolveActivityAgeBand(classroom?.ageGroup);
  const dailySuggestions = selectDailyActivitySuggestions(
    filterActivityStudioItems({
      ageBand: suggestedAgeBand,
      collection: "hemen",
    }),
    model.workspace.civilDate,
  );
  const monthLens = resolveActivityYearMonthLens(model.workspace.civilDate);
  const attendanceDetail =
    model.attendance.total === 0
      ? "Sınıf listesi bekleniyor"
      : `${model.attendance.marked}/${model.attendance.total} çocuk işaretlendi`;
  const observationCoverage = createObservationCoverage(model.students);
  const pedagogicalSignals = createPedagogicalSignals({
    attendance: model.attendance,
    teacherCycle: model.teacherCycle,
    observationCoverage,
  });
  const pedagogicalLoop = createPedagogicalLoop(model.teacherCycle);
  const pedagogicalDay = createPedagogicalDayFlow({
    ageBand: suggestedAgeBand,
    civilDate: model.workspace.civilDate,
    scenarioId,
  });

  const openOrchestraPhase = (phase: PedagogicalDayPhase) => {
    if (phase.activity) {
      actions.onOpenActivityStudio({ activityId: phase.activity.id, scenarioId });
      return;
    }
    if (phase.id === "welcome") {
      actions.onOpenAttendance();
      return;
    }
    if (phase.id === "reflection") {
      actions.onOpenQuickObservation();
      return;
    }
    if (phase.id === "family") {
      actions.onOpenTeacherCycleStage("documents");
      return;
    }
    actions.onOpenPlanFlow();
  };

  const runAssistantAction = (action: MarifTeacherAgentAction) => {
    switch (action.kind) {
      case "setup":
        actions.onOpenSetupStep(action.stepId);
        return;
      case "attendance":
        actions.onOpenAttendance();
        return;
      case "plan":
        actions.onOpenTeacherCycleStage("daily");
        return;
      case "pending-observation":
        actions.onOpenPendingObservation();
        return;
      case "teacher-cycle":
        actions.onOpenTeacherCycleStage(action.stageId);
        return;
      case "day-closure":
        actions.onOpenDayClosure();
        return;
      case "calendar":
        void actions.onOpenCalendar();
    }
  };

  return (
    <main
      className="simple-today"
      aria-labelledby="simple-today-title"
      data-testid="today-screen"
      data-setup-only={classroom ? "false" : "true"}
    >
      <header className="simple-today__header">
        <div className="simple-today__brand" aria-label="MaarifOS Bugün">
          <img
            src="/assets/brand/maarifos-icon-192.png"
            alt=""
            aria-hidden="true"
          />
          <span>
            <small>MaarifOS</small>
            <strong>Bugün</strong>
          </span>
        </div>
        <button
          type="button"
          className="simple-icon-button"
          onClick={actions.onOpenSettings}
          aria-label="Ayarları aç"
        >
          <GearIcon aria-hidden="true" />
        </button>
      </header>

      <section className="simple-today__context" aria-label="Bugünün sınıf bilgisi">
        <div className="simple-today__context-item">
          <span className="simple-today__context-icon" aria-hidden="true">
            <PersonIcon />
          </span>
          <span>
            <strong>{classroom?.classroomName ?? "Sınıf kurulumu"}</strong>
            <small>
              {classroom
                ? `${model.students.length} çocuk · ${ageBandLabel(classroom.ageGroup)} · ${compactTodayProgramLabel(classroom.curriculumProgram)}`
                : "Bilgileri bir kez girin; her belgede hazır olsun"}
            </small>
          </span>
        </div>
        <div className="simple-today__context-item is-date">
          <span className="simple-today__context-icon" aria-hidden="true">
            <CalendarIcon />
          </span>
          <span>
            <strong>Bugün</strong>
            <small>{model.civilDateLabel}</small>
          </span>
        </div>
      </section>

      {model.updateReady ? (
        <button
          type="button"
          className="simple-update"
          disabled={model.dataBusy}
          onClick={actions.onApplyReadyUpdate}
        >
          <span>
            <strong>MaarifOS {model.updateVersion} hazır</strong>
            <small>Kayıtlar korunarak yenilenecek</small>
          </span>
          <b>Yenile</b>
        </button>
      ) : null}

      <section className="simple-today__brief" aria-labelledby="simple-today-title">
        <h1 id="simple-today-title" data-route-heading tabIndex={-1}>
          {teacherGreeting(classroom?.teacherName)}
        </h1>
        <div className="simple-today__brief-bar">
          <p className="simple-today__brief-label">Bugün için kısa özet</p>
          <button
            type="button"
            className="simple-today__brief-action"
            onClick={actions.onOpenQuickObservation}
            disabled={model.dataBusy}
          >
            <Pencil1Icon aria-hidden="true" />
            Hızlı gözlem
          </button>
        </div>
        <ul aria-label="Önerinin nedenleri">
          {assistantReasons.map((reason) => (
            <li key={reason}>
              <CheckCircledIcon aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="simple-today__focus"
        aria-label="Sıradaki en iyi adım"
        data-tone={assistantBrief.tone}
      >
        <button
          type="button"
          onClick={() => runAssistantAction(assistantBrief.action)}
          disabled={model.dataBusy}
        >
          <span className="simple-focus__icon" aria-hidden="true">
            <AssistantActionIcon action={assistantBrief.action} />
          </span>
          <span className="simple-focus__copy">
            <small>Sıradaki en iyi adım</small>
            <strong>{assistantBrief.title}</strong>
          </span>
          <span className="simple-focus__action">
            {assistantBrief.actionLabel}
            <ChevronRightIcon aria-hidden="true" />
          </span>
        </button>
      </section>

      {classroom ? (
        <section className="simple-today__desk" aria-labelledby="simple-teacher-desk-title">
          <header>
            <div>
              <span>ÖĞRETMEN MASASI</span>
              <h2 id="simple-teacher-desk-title">Bugünün işi tek yerde</h2>
            </div>
            <small>{model.civilDateLabel}</small>
          </header>
          <div className="simple-today__desk-grid">
            <button type="button" onClick={actions.onOpenAttendance} disabled={model.dataBusy}>
              <span className="is-attendance" aria-hidden="true"><CheckCircledIcon /></span>
              <p><strong>Yoklama</strong><small>{attendanceDetail}</small></p>
              <b>{model.attendance.marked === model.attendance.total && model.attendance.total > 0 ? "Tamam" : "Aç"}</b>
            </button>
            <button
              type="button"
              onClick={dailyPlanReady ? () => actions.onOpenTeacherCycleStage("daily") : actions.onOpenPlanFlow}
              disabled={model.dataBusy}
            >
              <span className="is-plan" aria-hidden="true"><ReaderIcon /></span>
              <p><strong>Günün planı</strong><small>{model.teacherCycle.daily.title}</small></p>
              <b>{dailyPlanReady ? "Hazır" : "Hazırla"}</b>
            </button>
            <button type="button" onClick={() => actions.onOpenActivityStudio()} disabled={model.dataBusy}>
              <span className="is-activity" aria-hidden="true"><MagnifyingGlassIcon /></span>
              <p><strong>Etkinlik bankası</strong><small>{ACTIVITY_STUDIO_ITEMS.length} özgün etkinlik · {ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT} yıllık öneri yuvası</small></p>
              <b>Aç</b>
            </button>
            <button type="button" onClick={actions.onOpenQuickObservation} disabled={model.dataBusy}>
              <span className="is-observation" aria-hidden="true"><Pencil1Icon /></span>
              <p><strong>Gözlem</strong><small>{model.pendingObservationCount > 0 ? `${model.pendingObservationCount} bağlantı bekliyor` : "Hızlı not veya etkinlik gözlemi"}</small></p>
              <b>Yaz</b>
            </button>
          </div>
        </section>
      ) : null}

      {classroom ? (
        <section className="simple-today__suggestions" aria-labelledby="simple-today-suggestions-title">
          <header>
            <div>
              <span>BUGÜNE UYGUN</span>
              <h2 id="simple-today-suggestions-title">Hazır etkinlik önerileri</h2>
              {monthLens ? <p>{monthLens.label}</p> : null}
            </div>
            <button type="button" onClick={() => actions.onOpenActivityStudio()}>Tümünü gör</button>
          </header>
          <div className="simple-today__suggestion-list">
            {dailySuggestions.map((activity) => (
              <button
                type="button"
                key={activity.id}
                onClick={() => actions.onOpenActivityStudio({ activityId: activity.id, scenarioId })}
              >
                <span>
                  <small>{ACTIVITY_STUDIO_CATEGORY_LABELS[activity.category]} · {activity.durationMinutes} dk</small>
                  <strong>{activity.title}</strong>
                  <em>{activity.teacherPrompt}</em>
                </span>
                <b>{activity.preparationMinutes} dk hazırlık</b>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {classroom ? (
        <section className="simple-today__orchestra" aria-labelledby="simple-orchestra-title">
          <header className="simple-today__orchestra-heading">
            <div>
              <span>PEDAGOJİK ORKESTRA</span>
              <h2 id="simple-orchestra-title">Sınıfı okuyup akışı yeniden kur</h2>
              <p>Statik öneri değil; yoklama, plan, uygulama ve gözlem kanıtını aynı gün döngüsünde birleştirir.</p>
            </div>
            <strong>{PEDAGOGICAL_VARIANT_COUNT.toLocaleString("tr-TR")}<small>uygulama yolu</small></strong>
          </header>

          <div className="simple-today__signals" aria-label="Canlı sınıf sinyalleri">
            {pedagogicalSignals.map((signal) => (
              <article key={signal.id} data-tone={signal.tone}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <small>{signal.detail}</small>
              </article>
            ))}
          </div>

          <div className="simple-today__scenario-picker">
            <strong>Bugünkü koşul</strong>
            <div>
              {PEDAGOGICAL_SCENARIOS.map((scenario) => (
                <button
                  type="button"
                  key={scenario.id}
                  aria-pressed={scenarioId === scenario.id}
                  onClick={() => setScenarioId(scenario.id)}
                >
                  {scenario.shortLabel}
                </button>
              ))}
            </div>
            <p>{pedagogicalDay.scenario.description}</p>
          </div>

          <div className="simple-today__day-map">
            <header>
              <div><span>7 BÖLÜMLÜ CANLI AKIŞ</span><strong>{pedagogicalDay.totalMinutes} dk çekirdek akış</strong></div>
              <small>{pedagogicalDay.learningDomains.length} öğrenme alanı</small>
            </header>
            <ol>
              {pedagogicalDay.phases.map((phase) => (
                <li key={phase.id}>
                  <button type="button" onClick={() => openOrchestraPhase(phase)}>
                    <span className="simple-day-map__index">{phase.sequence}</span>
                    <span className="simple-day-map__copy">
                      <small>{phase.rhythmLabel} · {phase.durationMinutes} dk</small>
                      <strong>{phase.title}</strong>
                      <em>{phase.intention}</em>
                      <b>Değer izi · {phase.valueTrace.value}</b>
                    </span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                  <details>
                    <summary>Öğretmen hamlesi ve kanıt izi</summary>
                    <dl>
                      <div><dt>Öğretmen hamlesi</dt><dd>{phase.teacherMove}</dd></div>
                      <div><dt>Kanıt</dt><dd>{phase.observationTarget}</dd></div>
                      <div><dt>Yansıtma</dt><dd>{phase.valueTrace.reflection}</dd></div>
                      <div><dt>Sonraki plan</dt><dd>{phase.valueTrace.nextPlan}</dd></div>
                    </dl>
                  </details>
                </li>
              ))}
            </ol>
          </div>

          <div className="simple-today__evidence-balance">
            <header>
              <div><span>KANIT DENGESİ</span><strong>Her çocuğu görünür kıl</strong></div>
              <b>%{observationCoverage.coveragePercent}</b>
            </header>
            <p>{observationCoverage.distributionLabel}</p>
            {observationCoverage.priorityStudents.length > 0 ? (
              <div>
                {observationCoverage.priorityStudents.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => void actions.onOpenStudentObservation(student.id)}
                  >
                    <span><strong>{student.preferredName ?? student.name}</strong><small>{student.observationCount} gözlem</small></span>
                    <b>Gözlem aç</b>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => actions.onOpenSetupStep("students")}>İlk çocuğu ekle</button>
            )}
          </div>

          <ol className="simple-today__learning-loop" aria-label="Pedagojik öğrenme döngüsü">
            {pedagogicalLoop.map((stage, index) => (
              <li key={stage.id} data-state={stage.state}>
                <span>{index + 1}</span>
                <strong>{stage.label}</strong>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {model.teacherWeek.status === "ready" ? (
        <section className="simple-today__week" aria-labelledby="simple-today-week-title">
          <header>
            <div>
              <span>BU HAFTA</span>
              <h2 id="simple-today-week-title">Öğretmen akışı</h2>
            </div>
            <small>{model.teacherWeek.plannedDayCount}/{model.teacherWeek.expectedDayCount} gün planlı</small>
          </header>
          <div className="simple-today__week-days">
            {model.teacherWeek.days.map((day) => (
              <button
                type="button"
                key={day.civilDate}
                data-state={day.state}
                aria-current={day.isToday ? "date" : undefined}
                onClick={() => void actions.onOpenWeekDay(day.civilDate)}
              >
                <span>{day.weekdayLabel}</span>
                <strong>{day.civilDate.slice(-2)}</strong>
                <small>{day.planId ? `${day.completedActivityCount}/${day.activityCount}` : "Plan yok"}</small>
              </button>
            ))}
          </div>
          <button type="button" className="simple-today__week-action" onClick={() => void actions.onOpenCalendar()}>
            <CalendarIcon aria-hidden="true" />
            Haftayı takvimde aç
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {classroom ? (
        <section className="simple-today__prepared" aria-labelledby="simple-prepared-title">
          <header>
            <span aria-hidden="true"><ReaderIcon /></span>
            <h2 id="simple-prepared-title">Ben hazırladım</h2>
          </header>
          <div className="simple-today__prepared-list">
            <button
              type="button"
              onClick={
                dailyPlanReady
                  ? () => actions.onOpenTeacherCycleStage("daily")
                  : actions.onOpenPlanFlow
              }
              disabled={model.dataBusy}
            >
              <span className="simple-prepared__icon is-plan" aria-hidden="true">
                <ReaderIcon />
              </span>
              <span>
                <strong>
                  {dailyPlanReady ? "TYMM günlük planı" : "TYMM günlük plan başlangıcı"}
                </strong>
                <small>
                  {dailyPlanReady
                    ? model.teacherCycle.daily.title
                    : "Sınıf ve yaş grubu hazır; siz açınca düzenlenir"}
                </small>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={
                documentSourceReady
                  ? () => actions.onOpenTeacherCycleStage("documents")
                  : () => actions.onOpenActivityStudio()
              }
              disabled={model.dataBusy}
            >
              <span
                className={`simple-prepared__icon ${documentSourceReady ? "is-document" : "is-activity"}`}
                aria-hidden="true"
              >
                {documentSourceReady ? <ArchiveIcon /> : <MagnifyingGlassIcon />}
              </span>
              <span>
                <strong>
                  {documentSourceReady ? "Veli ve idare çıktıları" : "Oyun ve materyal fikirleri"}
                </strong>
                <small>
                  {documentSourceReady
                    ? "Kayıtlı plan ve gözlem kaynaklarını aç"
                    : "Yaş grubuna uygun oyun, çizim ve boyama"}
                </small>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
