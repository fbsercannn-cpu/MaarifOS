import { useEffect, useState, useMemo, type ReactNode } from "react";
import { BirthdayNotice } from "../today/BirthdayNotice.tsx";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  GearIcon,
  PersonIcon,
  Pencil1Icon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type {
  TodayScreenActions,
  TodayScreenProps,
} from "../today/TodayScreen.tsx";
import {
  ACTIVITY_STUDIO_CATEGORY_LABELS,
  filterActivityStudioItems,
} from "../activity-studio/activity-studio-model.ts";
import {
  resolveActivityYearMonthLens,
  selectDailyActivitySuggestions,
} from "../activity-studio/activity-year-program.ts";
import {
  PEDAGOGICAL_SCENARIOS,
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
import { createMarifTeacherAgentBrief } from "../today/marif-teacher-agent.ts";
import {
  compactTodayProgramLabel,
  configuredClassroomFromToday,
  createTeacherCyclePresentation,
  createTodayControlCenterSummary,
} from "../today/today-screen-model.ts";
import {
  createSimpleTodayPresentation,
  type SimpleTodayAction,
} from "./simple-today-model.ts";
import { createTodayTeachingFocus, TODAY_TEACHING_COPY } from "./today-teaching-focus.ts";
import { TodayRecordedFlow, TodayTeachingCard } from "./TodayTeachingCard.tsx";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  DEFAULT_TEACHER_HOME_PREFERENCES,
  TEACHER_HOME_SHORTCUT_IDS,
  loadTeacherHomePreferences,
  saveTeacherHomePreferences,
  type TeacherHomePreferencesModel,
  type TeacherHomeShortcutId,
} from "./teacher-home-preferences.ts";
import { QuickStatsBar, type QuickStat } from "./QuickStatsBar.tsx";
import { OfflineStatusBadge } from "./OfflineStatusBadge.tsx";
import { WeeklyFocusCard } from "./WeeklyFocusCard.tsx";
import "./simple-experience.css";
import "./today-teaching.css";

export interface SimpleTodayScreenActions {
  onOpenStudentProfile?: TodayScreenActions["onOpenStudentProfile"];
  onOpenSettings: TodayScreenActions["onOpenSettings"];
  onOpenClassroom: TodayScreenActions["onOpenClassroom"];
  onApplyReadyUpdate: TodayScreenActions["onApplyReadyUpdate"];
  onActivateAcademicYear: TodayScreenActions["onActivateAcademicYear"];
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
  onOpenRecordedActivity: TodayScreenActions["onOpenActivityEvidence"];
  onCompleteRecordedActivity(activityId: string): void;
}

export interface SimpleTodayScreenProps extends Omit<TodayScreenProps, "actions" | "slots"> {
  actions: SimpleTodayScreenActions;
  preferenceStore?: LocalDataStore;
  slots: TodayScreenProps["slots"] & {
    thisWeek?: ReactNode;
  };
}

const HOME_SHORTCUT_COPY: Record<TeacherHomeShortcutId, {
  readonly label: string;
  readonly detail: string;
}> = {
  attendance: { label: "Yoklama", detail: "Bugünün devamını işaretle" },
  "daily-plan": { label: "Günün planı", detail: "Kayıtlı akışı aç veya hazırla" },
  classroom: { label: "Sınıfım", detail: "Çocuk ve sınıf bilgilerini aç" },
  calendar: { label: "Takvim", detail: "Planlanan günleri aç" },
};

function teacherGreeting(teacherName?: string): string {
  const firstName = teacherName?.trim().split(/\s+/u)[0];
  return firstName ? `Merhaba ${firstName} Öğretmen` : "Merhaba öğretmenim";
}

function ageBandLabel(value?: string): string {
  if (!value) return "Yaş grubu eksik";
  const normalized = value.trim().replace(/\s*(?:-|\u2013)\s*/u, "\u2013");
  return /\bay$/iu.test(normalized) ? normalized : `${normalized} ay`;
}

function AssistantActionIcon({ action }: { action: SimpleTodayAction }) {
  if (
    action.kind === "attendance" ||
    action.kind === "day-closure" ||
    action.kind === "start-year" ||
    action.kind === "complete-recorded"
  ) {
    return <CheckCircledIcon />;
  }
  if (action.kind === "calendar") return <CalendarIcon />;
  if (action.kind === "setup" && action.stepId === "students") {
    return <PersonIcon />;
  }
  return <ReaderIcon />;
}

export function SimpleTodayScreen({
  model,
  actions,
  slots,
  preferenceStore,
}: SimpleTodayScreenProps) {
  const [scenarioId, setScenarioId] =
    useState<PedagogicalScenarioId>("balanced");
  const [advancedSupportOpen, setAdvancedSupportOpen] = useState(false);
  const classroom = configuredClassroomFromToday(model.workspace);
  const [homePreferences, setHomePreferences] = useState<TeacherHomePreferencesModel>({
    scope: null,
    ...DEFAULT_TEACHER_HOME_PREFERENCES,
    expectedUpdatedAt: null,
  });
  const [shortcutDraft, setShortcutDraft] = useState<readonly TeacherHomeShortcutId[]>(
    DEFAULT_TEACHER_HOME_PREFERENCES.pinnedShortcutIds,
  );
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  useEffect(() => {
    let active = true;
    if (!preferenceStore) return undefined;
    setPreferenceNotice("");
    void loadTeacherHomePreferences(preferenceStore).then(
      (loaded) => {
        if (!active) return;
        setHomePreferences(loaded);
        setShortcutDraft(loaded.pinnedShortcutIds);
      },
      (reason) => {
        if (!active) return;
        setPreferenceNotice(
          reason instanceof Error
            ? reason.message
            : "Ana ekran tercihleri bu cihazdan okunamadı.",
        );
      },
    );
    return () => {
      active = false;
    };
  }, [
    preferenceStore,
    classroom?.academicYearId,
    classroom?.classroomId,
  ]);
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
  const dailyPlanReady = model.teacherCycle.daily.planId !== null;
  const suggestedAgeBand = resolveActivityAgeBand(classroom?.ageGroup);
  const dailySuggestions = useMemo(() => {
    return suggestedAgeBand
      ? selectDailyActivitySuggestions(
          filterActivityStudioItems({
            ageBand: suggestedAgeBand,
            collection: "hemen",
          }),
          model.workspace.civilDate,
        )
      : [];
  }, [suggestedAgeBand, model.workspace.civilDate]);
  const teachingFocus = createTodayTeachingFocus({
    enabled: classroom?.operationalStatus === "active" && !model.educationalWritesDisabled && model.students.length > 0,
    pendingObservationCount: model.pendingObservationCount,
    blockedByPlanIntegrity: model.teacherCycle.daily.status === "conflict" || model.teacherCycle.daily.status === "chain-mismatch",
    hasRecordedDailyPlan: dailyPlanReady,
    dayNeedsReview: assistantBrief.action.kind === "day-closure" && assistantBrief.tone === "attention",
    currentActivity: model.workspace.currentActivity,
    planItems: model.workspace.planItems,
    suggestions: classroom?.curriculumProfile?.framework === "tymm" ? dailySuggestions : [],
  });
  const presentation = createSimpleTodayPresentation({
    hasClassroom: classroom !== null,
    operationalStatus: classroom?.operationalStatus,
    educationalWritesDisabled: model.educationalWritesDisabled,
    studentCount: model.students.length,
    dailyPlanReady,
    attendanceMarked: model.attendance.marked,
    attendanceTotal: model.attendance.total,
    assistantBrief,
    teachingFocus,
  });
  const monthLens = resolveActivityYearMonthLens(model.workspace.civilDate);
  const observationCoverage = useMemo(
    () => createObservationCoverage(model.students),
    [model.students],
  );
  const pedagogicalSignals = useMemo(
    () =>
      createPedagogicalSignals({
        attendance: model.attendance,
        teacherCycle: model.teacherCycle,
        observationCoverage,
      }),
    [model.attendance, model.teacherCycle, observationCoverage],
  );
  const pedagogicalLoop = useMemo(
    () => createPedagogicalLoop(model.teacherCycle),
    [model.teacherCycle],
  );
  const currentPedagogicalStageIndex = pedagogicalLoop.findIndex(
    (stage) => stage.state === "current",
  );
  const currentPedagogicalStage = currentPedagogicalStageIndex >= 0
    ? pedagogicalLoop[currentPedagogicalStageIndex]
    : null;
  const nextPedagogicalStage = currentPedagogicalStageIndex >= 0
    ? pedagogicalLoop[currentPedagogicalStageIndex + 1] ?? null
    : null;
  const completedPedagogicalStageCount = pedagogicalLoop.filter(
    (stage) => stage.state === "done",
  ).length;
  const pedagogicalDay = useMemo(() => {
    return suggestedAgeBand
      ? createPedagogicalDayFlow({
          ageBand: suggestedAgeBand,
          civilDate: model.workspace.civilDate,
          scenarioId,
        })
      : null;
  }, [suggestedAgeBand, model.workspace.civilDate, scenarioId]);

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

  const runAssistantAction = (action: SimpleTodayAction) => {
    switch (action.kind) {
      case "studio":
        actions.onOpenActivityStudio({ activityId: action.activityId, scenarioId });
        return;
      case "recorded-item":
        if (action.item.activityId && action.item.canCaptureEvidence) {
          void actions.onOpenRecordedActivity(action.item.activityId);
        } else {
          actions.onOpenTeacherCycleStage("daily");
        }
        return;
      case "complete-recorded":
        actions.onCompleteRecordedActivity(action.activityId);
        return;
      case "start-year":
        void actions.onActivateAcademicYear();
        return;
      case "day-details":
        setAdvancedSupportOpen((current) => !current);
        return;
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

  const persistHomePreferences = async (next: {
    lessonMode: boolean;
    pinnedShortcutIds: readonly TeacherHomeShortcutId[];
  }) => {
    if (!preferenceStore || !homePreferences.scope || preferenceBusy) return;
    setPreferenceBusy(true);
    setPreferenceNotice("");
    try {
      const saved = await saveTeacherHomePreferences(preferenceStore, {
        ...next,
        expectedUpdatedAt: homePreferences.expectedUpdatedAt,
      });
      setHomePreferences(saved);
      setShortcutDraft(saved.pinnedShortcutIds);
      setPreferenceNotice("Ana ekran tercihiniz bu cihazda kaydedildi.");
      if (saved.lessonMode) setAdvancedSupportOpen(false);
    } catch (reason) {
      try {
        const current = await loadTeacherHomePreferences(preferenceStore);
        setHomePreferences(current);
        setShortcutDraft(current.pinnedShortcutIds);
      } catch {
        // İlk hata öğretmenin yapabileceği işlemi daha iyi açıkladığı için korunur.
      }
      setPreferenceNotice(
        reason instanceof Error
          ? reason.message
          : "Ana ekran tercihi kaydedilemedi; mevcut seçimler korundu.",
      );
    } finally {
      setPreferenceBusy(false);
    }
  };

  const toggleShortcutDraft = (shortcutId: TeacherHomeShortcutId) => {
    setPreferenceNotice("");
    setShortcutDraft((current) => {
      if (current.includes(shortcutId)) {
        return current.filter((id) => id !== shortcutId);
      }
      if (current.length >= 2) {
        setPreferenceNotice("Yeni kısayolu seçmeden önce mevcut iki kısayoldan birini kaldırın.");
        return current;
      }
      return [...current, shortcutId];
    });
  };

  const runHomeShortcut = (shortcutId: TeacherHomeShortcutId) => {
    if (shortcutId === "attendance") {
      actions.onOpenAttendance();
      return;
    }
    if (shortcutId === "daily-plan") {
      if (dailyPlanReady) actions.onOpenTeacherCycleStage("daily");
      else actions.onOpenPlanFlow();
      return;
    }
    if (shortcutId === "classroom") {
      actions.onOpenClassroom();
      return;
    }
    void actions.onOpenCalendar();
  };

  const completionEntries = [
    presentation.primary,
    ...presentation.followUps.map((entry) => entry),
  ]
    .filter((entry, index, all) =>
      all.findIndex((candidate) => candidate.label === entry.label) === index &&
      (index === 0 || !homePreferences.lessonMode ||
        (entry.action.kind !== "day-details" &&
          entry.action.kind !== "day-closure" &&
          entry.action.kind !== "calendar")),
    )
    .slice(0, 3);

  const quickStats: QuickStat[] = [
    {
      label: "Sınıfta",
      value: `${control.attendance.inClass}/${control.attendance.expected}`,
      detail: `Bugün ${control.attendance.inClass} mevcut, ${control.attendance.expected} beklenen çocuk (Kayıtlı: ${model.students.length}).`,
      onClick: actions.onOpenAttendance,
      tone: model.attendance.marked ? "ok" : "warn",
    },
    {
      label: "Haftalık Plan",
      value: `${model.teacherWeek.plannedDayCount}/${model.teacherWeek.expectedDayCount} gün`,
      detail: `${model.teacherWeek.plannedDayCount} gün planlandı.`,
      onClick: () => void actions.onOpenCalendar(),
      tone: model.teacherWeek.plannedDayCount >= model.teacherWeek.expectedDayCount ? "ok" : "warn",
    },
    {
      label: "Gözlem Kapsamı",
      value: `%${observationCoverage.coveragePercent}`,
      detail: `Sınıfın %${observationCoverage.coveragePercent} kadarı gözlemlendi.`,
      onClick: actions.onOpenQuickObservation,
      tone: observationCoverage.coveragePercent >= 70 ? "ok" : "warn",
    },
  ];

  return (
    <main
      className="simple-today today-teaching"
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
        {!homePreferences.lessonMode ? (
          <button
            type="button"
            className="simple-icon-button"
            onClick={actions.onOpenSettings}
            aria-label="Ayarları aç"
          >
            <GearIcon aria-hidden="true" />
          </button>
        ) : <span className="simple-today__lesson-badge">Ders modu</span>}
      </header>

      <section className="today-teaching__context" aria-label="Bugünün sınıf bilgisi">
        <p>{model.civilDateLabel}</p>
        <strong>{classroom?.classroomName ?? "Sınıf kurulumu"}</strong>
        <span>{classroom
          ? `Kayıtlı ${model.students.length} · Bugünün yoklama kapsamı ${model.attendance.total} · ${ageBandLabel(classroom.ageGroup)} · ${compactTodayProgramLabel(classroom.curriculumProgram)}`
          : "Bilgileri bir kez girin; her belgede hazır olsun"}</span>
      </section>

      <QuickStatsBar stats={quickStats} />

      {!homePreferences.lessonMode ? (
        <WeeklyFocusCard
          focus={{
            weekLabel: `${model.teacherWeek.plannedDayCount}/${model.teacherWeek.expectedDayCount} Günlük Öğretmen Akışı`,
            theme: compactTodayProgramLabel(classroom?.curriculumProgram),
            keyActivities: dailySuggestions.slice(0, 3).map((a) => a.title),
            reminder: pedagogicalSignals[0]?.detail,
          }}
          mondayCivilDate={model.workspace.civilDate}
        />
      ) : null}

      <BirthdayNotice students={model.students} civilDate={model.workspace.civilDate} onOpenStudent={actions.onOpenStudentProfile} />

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
        {presentation.reasons.length > 0 ? <ul aria-label="Önerinin nedenleri">
          {presentation.reasons.map((reason) => (
            <li key={reason}>
              <CheckCircledIcon aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul> : null}
      </section>

      {classroom?.operationalStatus === "active" ? (
        <section className="simple-today__lesson-tools" aria-labelledby="simple-today-lesson-tools-title">
          <header>
            <div>
              <h2 id="simple-today-lesson-tools-title">Ders sırasında</h2>
              <p>Çocuğu gözlem açılınca seçin; yeni kayıt önceki çocuğa kendiliğinden yazılmaz.</p>
            </div>
            <button
              type="button"
              className="simple-today__lesson-toggle"
              aria-pressed={homePreferences.lessonMode}
              disabled={!preferenceStore || !homePreferences.scope || preferenceBusy}
              onClick={() => void persistHomePreferences({
                lessonMode: !homePreferences.lessonMode,
                pinnedShortcutIds: homePreferences.pinnedShortcutIds,
              })}
            >
              {homePreferences.lessonMode ? "Ders modunu kapat" : "Ders modunu aç"}
            </button>
          </header>
          <div className="simple-today__capture-shortcuts">
            <button
              type="button"
              className="is-observation"
              aria-label="Hızlı gözlem"
              onClick={actions.onOpenQuickObservation}
              disabled={model.dataBusy || model.educationalWritesDisabled || model.students.length === 0}
            >
              <Pencil1Icon aria-hidden="true" />
              <span><strong>Hızlı gözlem</strong><small>Çocuk seç · davranışı yaz veya seç · kaydet</small></span>
              <ChevronRightIcon aria-hidden="true" />
            </button>
            {homePreferences.pinnedShortcutIds.map((shortcutId) => (
              <button
                type="button"
                key={shortcutId}
                onClick={() => runHomeShortcut(shortcutId)}
                disabled={model.dataBusy || (shortcutId === "attendance" && model.educationalWritesDisabled)}
              >
                {shortcutId === "attendance" ? <CheckCircledIcon aria-hidden="true" />
                  : shortcutId === "calendar" ? <CalendarIcon aria-hidden="true" />
                  : shortcutId === "classroom" ? <PersonIcon aria-hidden="true" />
                  : <ReaderIcon aria-hidden="true" />}
                <span>
                  <strong>{HOME_SHORTCUT_COPY[shortcutId].label}</strong>
                  <small>{HOME_SHORTCUT_COPY[shortcutId].detail}</small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ))}
          </div>
          {!homePreferences.lessonMode ? (
            <details className="simple-today__shortcut-editor">
              <summary>Sabit iki kısayolu değiştir</summary>
              <div role="group" aria-label="Ana ekran sabit kısayolları">
                {TEACHER_HOME_SHORTCUT_IDS.map((shortcutId) => (
                  <button
                    type="button"
                    key={shortcutId}
                    aria-pressed={shortcutDraft.includes(shortcutId)}
                    disabled={preferenceBusy}
                    onClick={() => toggleShortcutDraft(shortcutId)}
                  >
                    {HOME_SHORTCUT_COPY[shortcutId].label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="simple-today__shortcut-save"
                disabled={preferenceBusy || shortcutDraft.length !== 2 || !homePreferences.scope}
                onClick={() => void persistHomePreferences({
                  lessonMode: homePreferences.lessonMode,
                  pinnedShortcutIds: shortcutDraft,
                })}
              >
                {preferenceBusy ? "Kaydediliyor…" : "İki kısayolu kaydet"}
              </button>
            </details>
          ) : null}
          {preferenceNotice ? <p className="simple-today__preference-notice" role="status">{preferenceNotice}</p> : null}
        </section>
      ) : null}

      {teachingFocus ? <TodayTeachingCard focus={teachingFocus} /> : null}

      {teachingFocus?.kind === "recorded" ? <TodayRecordedFlow
        items={model.workspace.planItems.filter((item) => item.flowBlockStatus !== "skipped" && item.flowBlockStatus !== "optional")}
        currentId={teachingFocus.item.id}
      /> : null}

      <section className="simple-today__completion" aria-labelledby="simple-today-completion-title">
        <header>
          <h2 id="simple-today-completion-title">Bugünü tamamla</h2>
          <small>En çok üç iş</small>
        </header>
        {completionEntries[0] ? (
          <section
            className="simple-today__focus"
            aria-label="Sıradaki en iyi adım"
            data-tone={assistantBrief.tone}
          >
            <button
              type="button"
              onClick={() => runAssistantAction(completionEntries[0]!.action)}
              disabled={model.dataBusy}
              aria-label={presentation.primary.label}
              aria-expanded={completionEntries[0]!.action.kind === "day-details" ? advancedSupportOpen : undefined}
              aria-controls={completionEntries[0]!.action.kind === "day-details" ? "simple-today-details" : undefined}
            >
              <span className="simple-focus__icon" aria-hidden="true">
                <AssistantActionIcon action={completionEntries[0]!.action} />
              </span>
              <span className="simple-focus__copy">
                <small>Sıradaki adım</small>
                <strong>{completionEntries[0]!.label}</strong>
                {completionEntries[0]!.detail ? <small>{completionEntries[0]!.detail}</small> : null}
              </span>
              <span className="simple-focus__action" aria-hidden="true"><ChevronRightIcon /></span>
            </button>
          </section>
        ) : null}
        {completionEntries.length > 1 ? (
          <section className="simple-today__follow-ups" aria-label="Diğer iki adım">
            {completionEntries.slice(1).map((entry) => (
              <button
                type="button"
                key={entry.label}
                onClick={() => runAssistantAction(entry.action)}
                disabled={model.dataBusy}
                aria-label={entry.label}
                aria-expanded={entry.action.kind === "day-details" ? advancedSupportOpen : undefined}
                aria-controls={entry.action.kind === "day-details" ? "simple-today-details" : undefined}
              >
                <span>
                  <strong>{entry.label}</strong>
                  {entry.detail ? <small>{entry.detail}</small> : null}
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ))}
          </section>
        ) : null}
      </section>

      {!homePreferences.lessonMode && slots.thisWeek ? slots.thisWeek : null}

      {!homePreferences.lessonMode && slots.followupInbox ? (
        <details className="simple-today__ready-work">
          <summary>
            <span><strong>Hazır paketler ve diğer işler</strong><small>Gerektiğinde açın</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </summary>
          <div>{slots.followupInbox}</div>
        </details>
      ) : null}

      {advancedSupportOpen ? (
        <div id="simple-today-details">

      <div className="today-teaching__more-actions">
        <button type="button" disabled={model.dataBusy} onClick={() => actions.onOpenTeacherCycleStage("daily")}><ReaderIcon aria-hidden="true" />{TODAY_TEACHING_COPY.dayPlan}<ChevronRightIcon aria-hidden="true" /></button>
        <button type="button" disabled={model.dataBusy || model.educationalWritesDisabled} onClick={actions.onOpenQuickObservation}><PersonIcon aria-hidden="true" />{TODAY_TEACHING_COPY.observe}<ChevronRightIcon aria-hidden="true" /></button>
      </div>

      {classroom ? (
        <section className="simple-today__suggestions" aria-labelledby="simple-today-suggestions-title">
          <header>
            <div>
              <span>BUGÜN İÇİN SIRALANDI</span>
              <h2 id="simple-today-suggestions-title">Özgün etkinlik fikirleri</h2>
              {monthLens ? <p>{monthLens.label}</p> : null}
              <p>
                Yaş bandı ve tarih rotasyonuna göre sıralanır; pedagojik
                uygunluğu öğretmen sınıfın o günkü durumuna göre belirler.
              </p>
            </div>
            {suggestedAgeBand ? (
              <button type="button" onClick={() => actions.onOpenActivityStudio()}>Tümünü gör</button>
            ) : null}
          </header>
          {suggestedAgeBand ? (
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
          ) : (
            <div className="simple-today__suggestion-list" role="status" aria-live="polite">
              <button type="button" onClick={() => actions.onOpenSetupStep("classroom")}>
                <span>
                  <small>YAŞ BANDI GEREKLİ</small>
                  <strong>Yaş bandı seçilmeden etkinlik önerisi gösterilmez.</strong>
                  <em>
                    Yanlış yaşa ait içerik açılmaması için 36–48, 48–60
                    veya 60–72 ay resmî bandını seçin.
                  </em>
                </span>
                <b>Tamamla</b>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          )}
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

          {pedagogicalDay ? <div className="simple-today__scenario-picker">
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
          </div> : null}

          {pedagogicalDay ? <div className="simple-today__day-map">
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
          </div> : (
            <div className="simple-today__evidence-balance" role="status" aria-live="polite">
              <header>
                <div>
                  <span>YAŞ BANDI GEREKLİ</span>
                  <strong>Pedagojik akış henüz açılmadı</strong>
                </div>
              </header>
              <p>
                Akış, etkinlik ve gözlem odağı yaşa göre kurulur; sistem eksik
                bilgiyi 48–60 ay olarak tahmin etmez.
              </p>
              <button type="button" onClick={() => actions.onOpenSetupStep("classroom")}>
                <span>
                  <strong>Sınıf profilini tamamla</strong>
                  <small>36–48, 48–60 veya 60–72 ay bandını seç</small>
                </span>
                <b>Aç</b>
              </button>
            </div>
          )}

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

          <div className="simple-today__learning-loop" role="region" aria-label="Pedagojik öğrenme döngüsü">
            <div className="simple-learning-loop__glance" aria-live="polite">
              {currentPedagogicalStage ? (
                <article data-stage-preview="current">
                  <span>Şimdi</span>
                  <strong>{currentPedagogicalStage.label}</strong>
                  <small>Bugünün mevcut pedagojik aşaması</small>
                </article>
              ) : (
                <article data-stage-preview="complete">
                  <span>Bugünkü döngü</span>
                  <strong>Tamamlandı</strong>
                  <small>Yedi aşama da kanıtla kapandı</small>
                </article>
              )}
              {nextPedagogicalStage ? (
                <article data-stage-preview="next">
                  <span>Sıradaki</span>
                  <strong>{nextPedagogicalStage.label}</strong>
                  <small>Mevcut aşama tamamlanınca açılır</small>
                </article>
              ) : null}
            </div>
            <details className="simple-learning-loop__details">
              <summary>
                <span>
                  <strong>Yedi aşamanın tümünü göster</strong>
                  <small>{completedPedagogicalStageCount}/7 tamamlandı</small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </summary>
              <ol>
                {pedagogicalLoop.map((stage, index) => (
                  <li
                    key={stage.id}
                    data-state={stage.state}
                    aria-current={stage.state === "current" ? "step" : undefined}
                  >
                    <span className="simple-learning-loop__index" aria-hidden="true">{index + 1}</span>
                    <span className="simple-learning-loop__stage-copy">
                      <strong>{stage.label}</strong>
                      <small>
                        {stage.state === "done"
                          ? "Tamamlandı"
                          : stage.state === "current"
                            ? "Şimdi"
                            : index === currentPedagogicalStageIndex + 1
                              ? "Sıradaki"
                              : "Bekliyor"}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
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

        </div>
      ) : null}

      <OfflineStatusBadge />
    </main>
  );
}
