import { useState, type ReactNode } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  GearIcon,
  Link2Icon,
  LockClosedIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  StarIcon,
  TargetIcon,
} from "@radix-ui/react-icons";

import { Carousel } from "../../mobile/Carousel.tsx";
import { readBackupHealthReceipt } from "../../core/storage/backup-reminder.ts";
import type { TeacherDayCarryForwardItem } from "../day-closure/teacher-day-closure.ts";
import { SetupProgressCenter } from "../onboarding/SetupProgressCenter.tsx";
import {
  createSetupProgressEvidence,
  createSetupProgressPresentation,
  type SetupProgressStepId,
} from "../onboarding/setup-progress-model.ts";
import type { TodayPlanItem } from "./today-data.ts";
import {
  createMarifTeacherAgentBrief,
  type MarifTeacherAgentAction,
} from "./marif-teacher-agent.ts";
import {
  compactTodayProgramLabel,
  configuredClassroomFromToday,
  createTodayControlCenterSummary,
  createTeacherCyclePresentation,
  todayPlanItemStatusLabel,
  todayCatalogDisplayLabel,
  type TeacherCycleStageId,
  type TodayScreenModel,
  type TodayStudentCard,
} from "./today-screen-model.ts";

export interface TodayScreenActions {
  onOpenSettings: () => void;
  onApplyReadyUpdate: () => void;
  onOpenClassroom: () => void;
  onOpenAttendance: () => void;
  onOpenCalendar: () => void | Promise<void>;
  onOpenWeekDay: (civilDate: string) => void | Promise<void>;
  onOpenStudentSearch: () => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenStudentObservation: (studentId: string) => void | Promise<void>;
  onOpenActivityEvidence: (activityId: string) => void | Promise<void>;
  onCompleteCurrentActivity: () => void | Promise<void>;
  onOpenPlanFlow: () => void;
  onOpenPremiumPlans: () => void;
  onOpenTeacherCycleStage: (stage: TeacherCycleStageId) => void;
  onOpenDayClosure: () => void;
  onOpenPlanItem: (item: TodayPlanItem) => void;
  onOpenPendingObservation: () => void;
  onOpenSetupStep: (stepId: SetupProgressStepId) => void;
  onTransitionCarryForward?: (input: {
    sourceIssueIdentity: string;
    state: "resolved" | "deferred" | "reopened";
    deferredUntilCivilDate?: string;
  }) => void | Promise<void>;
}

export interface TodayScreenSlots {
  renderStudentAvatar?: (
    student: TodayStudentCard,
    className: string,
  ) => ReactNode;
  formatStudentAge: (
    birthDate: string | undefined,
    civilDate: string,
  ) => string;
}

export interface TodayScreenProps {
  model: TodayScreenModel;
  actions: TodayScreenActions;
  slots: TodayScreenSlots;
}

function todayStudentInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toLocaleUpperCase("tr-TR"))
    .join("");
}

function TodayStudentAvatar({ student }: { student: TodayStudentCard }) {
  return (
    <span className="home-child-avatar">
      {student.profilePhotoDataUrl ? (
        <img
          src={student.profilePhotoDataUrl}
          alt={`${student.preferredName ?? student.name} profil fotoğrafı`}
        />
      ) : (
        <span aria-hidden="true">{todayStudentInitials(student.name)}</span>
      )}
    </span>
  );
}

function nextCivilDate(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function carryForwardDateLabel(civilDate: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${civilDate}T12:00:00.000Z`));
}

function carryForwardStateLabel(item: TeacherDayCarryForwardItem): string {
  if (item.state === "resolved") return "Çözüldü";
  if (item.state === "deferred") {
    return item.isDeferredDue
      ? "Erteleme vadesi geldi"
      : `Ertelendi · ${carryForwardDateLabel(item.deferredUntilCivilDate!)}`;
  }
  return "Açık";
}

interface CarryForwardItemCardProps {
  item: TeacherDayCarryForwardItem;
  currentCivilDate: string;
  onTransition?: TodayScreenActions["onTransitionCarryForward"];
  secondary?: boolean;
}

function CarryForwardItemCard({
  item,
  currentCivilDate,
  onTransition,
  secondary = false,
}: CarryForwardItemCardProps) {
  const [deferOpen, setDeferOpen] = useState(false);
  const [deferredUntil, setDeferredUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const minimumDeferredDate = nextCivilDate(currentCivilDate);
  const actionUnavailableId = `carry-action-unavailable-${item.sourceIssueId}`;
  const feedbackId = `carry-feedback-${item.sourceIssueId}`;

  const transition = async (
    state: "resolved" | "deferred" | "reopened",
    deferredUntilCivilDate?: string,
  ) => {
    if (!onTransition) return;
    if (
      state === "deferred" &&
      (!deferredUntilCivilDate || deferredUntilCivilDate <= currentCivilDate)
    ) {
      setMessage("Erteleme tarihi bugünden sonra olmalıdır.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onTransition({
        sourceIssueIdentity: item.sourceIssueId,
        state,
        ...(deferredUntilCivilDate ? { deferredUntilCivilDate } : {}),
      });
      setDeferOpen(false);
      setDeferredUntil("");
      setMessage(
        state === "resolved"
          ? "Taşınan iş çözüldü."
          : state === "reopened"
            ? "Taşınan iş yeniden açıldı."
            : `Taşınan iş ${carryForwardDateLabel(deferredUntilCivilDate!)} tarihine ertelendi.`,
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Taşınan iş güncellenemedi.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={`teacher-carry-item${secondary ? " is-secondary" : ""}`}
      data-state={item.state}
      data-deferred-due={item.isDeferredDue ? "true" : "false"}
    >
      <div className="teacher-carry-item-heading">
        <span>
          <strong>{item.title}</strong>
          <small>{carryForwardStateLabel(item)}</small>
        </span>
        <b>{item.ageInDays === 1 ? "1 günlük" : `${item.ageInDays} günlük`}</b>
      </div>
      <p>{item.detail}</p>
      <p className="teacher-carry-note">Öğretmen notu: {item.note}</p>
      <time dateTime={item.sourceCivilDate}>
        Kaynak gün · {carryForwardDateLabel(item.sourceCivilDate)}
      </time>

      <div className="teacher-carry-actions">
        {item.state === "resolved" ? (
          <button
            type="button"
            disabled={busy || !onTransition}
            aria-describedby={!onTransition ? actionUnavailableId : feedbackId}
            onClick={() => void transition("reopened")}
          >
            Geri aç
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !onTransition}
              aria-describedby={!onTransition ? actionUnavailableId : feedbackId}
              onClick={() => void transition("resolved")}
            >
              Çözüldü
            </button>
            <button
              type="button"
              aria-expanded={deferOpen}
              aria-controls={`carry-defer-${item.sourceIssueId}`}
              disabled={busy || !onTransition}
              aria-describedby={!onTransition ? actionUnavailableId : feedbackId}
              onClick={() => {
                setMessage("");
                setDeferOpen((open) => !open);
              }}
            >
              {item.state === "deferred" ? "Tarihi değiştir" : "Ertele"}
            </button>
          </>
        )}
      </div>

      {!onTransition ? (
        <small className="teacher-carry-unavailable" id={actionUnavailableId}>
          Taşınan iş eylemleri veri bağlantısı tamamlandığında açılır.
        </small>
      ) : null}

      {deferOpen && item.state !== "resolved" ? (
        <div className="teacher-carry-defer" id={`carry-defer-${item.sourceIssueId}`}>
          <label htmlFor={`carry-defer-date-${item.sourceIssueId}`}>
            Yeni açık tarih
          </label>
          <input
            id={`carry-defer-date-${item.sourceIssueId}`}
            type="date"
            min={minimumDeferredDate}
            value={deferredUntil}
            onChange={(event) => {
              const value = event.target.value;
              setDeferredUntil(value);
              setMessage(
                value && value <= currentCivilDate
                  ? "Erteleme tarihi bugünden sonra olmalıdır."
                  : "",
              );
            }}
          />
          <button
            type="button"
            disabled={busy || deferredUntil <= currentCivilDate}
            onClick={() => void transition("deferred", deferredUntil)}
          >
            Ertelemeyi kaydet
          </button>
        </div>
      ) : null}

      <small
        className="teacher-carry-feedback"
        id={feedbackId}
        role="status"
        aria-live="polite"
      >
        {message}
      </small>
    </article>
  );
}

/**
 * Bugün ana yüzeyi. Kalıcı veri, dialog ve BottomSheet durumları controller'da
 * kalır; bu bileşen yalnız erişilebilir görünümü ve kullanıcı niyetlerini taşır.
 */
export function TodayScreen({ model, actions, slots }: TodayScreenProps) {
  const {
    workspace,
    civilDateLabel,
    students,
    attendance,
    syncState,
    educationalWriteNotice,
    educationalWritesDisabled,
    dataBusy,
    updateReady,
    updateVersion,
    pendingObservationCount,
    planEvidenceDetailsEnabled,
    premiumPlanCenterEnabled,
  } = model;
  const configuredClassroom = configuredClassroomFromToday(workspace);
  const preparationNoticeIntegrated =
    educationalWriteNotice !== null &&
    configuredClassroom?.operationalStatus === "preparation";
  const controlSummary = createTodayControlCenterSummary({
    workspace,
    attendance,
    pendingObservationCount,
  });
  const teacherCycle = createTeacherCyclePresentation(model.teacherCycle, {
    educationalWritesDisabled,
  });
  const teacherWeek = model.teacherWeek;
  const setupProgress = createSetupProgressPresentation(
    model.setupProgress,
    createSetupProgressEvidence(
      model.teacherCycle,
      typeof window === "undefined"
        ? null
        : readBackupHealthReceipt(window.localStorage),
    ),
  );
  const dayClosure = model.dayClosure;
  const marifBrief = createMarifTeacherAgentBrief({
    educationalWritesDisabled,
    setup: setupProgress,
    control: controlSummary,
    cycle: teacherCycle,
    dayClosure,
  });
  const visibleNextActionChecks = marifBrief.critiques.slice(0, 2);
  const activeCarryForwardItems = dayClosure.carryForwardItems.filter(
    (item) => item.state === "open" || item.isDeferredDue,
  );
  const primaryCarryForwardItems = activeCarryForwardItems.slice(0, 3);
  const primaryCarryForwardIds = new Set(
    primaryCarryForwardItems.map((item) => item.sourceIssueId),
  );
  const secondaryCarryForwardItems = [
    ...dayClosure.carryForwardItems.filter(
      (item) => !primaryCarryForwardIds.has(item.sourceIssueId),
    ),
    ...dayClosure.resolvedCarryForwardItems,
  ];
  const focusActivity = controlSummary.plan.item;
  const planEntryDisabled =
    focusActivity === null &&
    configuredClassroom !== null &&
    (dataBusy || educationalWritesDisabled);
  const flowBlockCount = workspace.planItems.filter(
    (item) => item.kind === "premium-flow-block" || item.kind === "teacher-flow-block",
  ).length;
  const standaloneActivityCount =
    workspace.planItems.length - flowBlockCount;

  const runMarifAction = (action: MarifTeacherAgentAction) => {
    switch (action.kind) {
      case "setup":
        actions.onOpenSetupStep(action.stepId);
        return;
      case "attendance":
        actions.onOpenAttendance();
        return;
      case "plan":
        if (focusActivity) actions.onOpenPlanItem(focusActivity);
        else actions.onOpenPlanFlow();
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
      className="maarif-screen today-screen"
      aria-label="MaarifOS Bugün ekranı"
      data-testid="today-screen"
      data-setup-only={configuredClassroom === null ? "true" : "false"}
    >
      <header className="today-header">
        <div className="today-title-row">
          <div className="today-brand-title">
            <img
              className="today-brand-logo"
              src="/assets/brand/maarifos-icon-192.png"
              alt=""
              aria-hidden="true"
            />
            <div>
              <span className="today-brand-name">MaarifOS</span>
              <h1 data-route-heading tabIndex={-1}>
                Bugün
              </h1>
            </div>
          </div>
          <button
            className="settings-button"
            type="button"
            onClick={actions.onOpenSettings}
            aria-label="Ayarları aç"
          >
            <GearIcon aria-hidden="true" />
          </button>
        </div>
        <p className="today-flow-meta">
          <span className="today-flow-label">Günün akışı</span>
          <span aria-hidden="true">·</span>
          <time>{civilDateLabel}</time>
        </p>
        <div className="today-context" aria-label="Sınıf ve program bilgisi">
          {configuredClassroom ? (
            <>
              <span className="today-context-primary">
                <strong>{configuredClassroom.classroomName}</strong>
                <b>{configuredClassroom.scheduleLabel}</b>
              </span>
              <span className="today-context-program">
                {configuredClassroom.ageGroup ?? "Yaş grubu belirtilmedi"} ·{" "}
                {compactTodayProgramLabel(configuredClassroom.curriculumProgram)} ·{" "}
                {todayCatalogDisplayLabel(
                  configuredClassroom.curriculumCatalogLabel,
                )}
              </span>
            </>
          ) : (
            <span>
              <strong>Sınıf kurulumu tamamlanmadı</strong> · Çalışma düzenini bir
              kez belirleyin
            </span>
          )}
        </div>
      </header>

      {updateReady ? (
        <section
          className="update-ready-card"
          aria-labelledby="update-ready-title"
        >
          <span className="update-ready-icon" aria-hidden="true">
            <MagicWandIcon />
          </span>
          <span className="update-ready-copy">
            <strong id="update-ready-title">MaarifOS {updateVersion} hazır</strong>
            <small>Bekleyen kayıtlarınız önce bu cihazda doğrulanır; sonra güvenle güncellenir.</small>
          </span>
          <button
            type="button"
            disabled={dataBusy}
            onClick={actions.onApplyReadyUpdate}
          >
            Şimdi güncelle
          </button>
        </section>
      ) : null}

      {configuredClassroom === null ? (
        <SetupProgressCenter
          presentation={setupProgress}
          mode="guided"
          dataBusy={dataBusy}
          onOpenStep={actions.onOpenSetupStep}
        />
      ) : null}

      {educationalWriteNotice && !preparationNoticeIntegrated ? (
        <section
          className="academic-year-mode-warning"
          role="alert"
          aria-label="Eğitim yılı hazırlık uyarısı"
        >
          <CalendarIcon aria-hidden="true" />
          <span>
            <strong>
              {configuredClassroom?.operationalStatus === "preparation"
                ? "Hazırlık modu açık"
                : "Seçili eğitim yılı sona erdi"}
            </strong>
            <small id="academic-year-mode-copy">{educationalWriteNotice}</small>
          </span>
          <button type="button" onClick={actions.onOpenClassroom}>
            Eğitim yılını aç
          </button>
        </section>
      ) : null}

      {configuredClassroom !== null ? (
      <section
        className={`marif-teacher-agent is-${marifBrief.tone}`}
        aria-labelledby="marif-teacher-agent-title"
        data-testid="marif-teacher-agent"
      >
        <div className="marif-teacher-agent-body">
          <span className="section-eyebrow">Sıradaki iş</span>
          <h2 id="marif-teacher-agent-title">{marifBrief.title}</h2>
          <p>{marifBrief.rationale}</p>
          {preparationNoticeIntegrated ? (
            <div
              className="academic-year-mode-warning academic-year-mode-warning--integrated"
              role="alert"
              aria-label="Eğitim yılı hazırlık uyarısı"
            >
              <CalendarIcon aria-hidden="true" />
              <span>
                <strong>Hazırlık modu açık</strong>
                <small id="academic-year-mode-copy">{educationalWriteNotice}</small>
              </span>
              <button type="button" onClick={actions.onOpenClassroom}>
                Eğitim yılını aç
              </button>
            </div>
          ) : null}
          <details className="marif-teacher-agent-critique">
            <summary>
              Bu sıra neye dayanıyor? · {visibleNextActionChecks.length} kontrol
            </summary>
            <div
              className="marif-teacher-agent-evidence"
              aria-label="Sıradaki işi belirleyen canlı kanıtlar"
            >
              {marifBrief.evidence.map((item) => <span key={item}>{item}</span>)}
            </div>
            {visibleNextActionChecks.length > 0 ? (
              <ul>
                {visibleNextActionChecks.map((critique) => (
                  <li key={critique.id}>
                    <strong>{critique.title}</strong>
                    <span>{critique.detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <small>Kayıt yalnız siz açıp onayladığınızda oluşur.</small>
          </details>
        </div>
        <button
          type="button"
          className="marif-teacher-agent-action"
          onClick={() => runMarifAction(marifBrief.action)}
          disabled={dataBusy}
        >
          {marifBrief.actionLabel}
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>
      ) : null}

      {configuredClassroom !== null && !preparationNoticeIntegrated ? (
        <section
          className="teacher-control"
          aria-labelledby="teacher-control-title"
          aria-describedby="teacher-control-description"
        >
        <div className="teacher-control-heading">
          <div>
            <span className="section-eyebrow">Öğretmen kontrolü</span>
            <h2 id="teacher-control-title">Şimdi</h2>
            <p id="teacher-control-description">
              Sınıfın durumu, sıradaki akış ve tamamlanacak işler.
            </p>
          </div>
          <button
            className="teacher-control-calendar"
            type="button"
            onClick={() => void actions.onOpenCalendar()}
            aria-label="Sınıf takvimini aç"
          >
            <CalendarIcon aria-hidden="true" />
            Takvim
          </button>
        </div>

        <button
          className="today-priority-card today-priority-card--attendance"
          type="button"
          onClick={actions.onOpenAttendance}
          disabled={dataBusy || educationalWritesDisabled}
          aria-label={`Bugünkü devam ${controlSummary.attendance.inClass}/${controlSummary.attendance.expected} çocuk. ${controlSummary.attendance.stateLabel}. ${controlSummary.attendance.detailLabel}`}
          aria-describedby={
            educationalWritesDisabled
              ? "academic-year-mode-copy"
              : dataBusy
                ? "today-attendance-busy-reason"
                : undefined
          }
        >
          <span className="today-priority-icon" aria-hidden="true">
            <PersonIcon />
          </span>
          <span className="today-priority-copy">
            <small>Bugünkü devam</small>
            <strong>
              {controlSummary.attendance.inClass} mevcut ·{" "}
              {controlSummary.attendance.expected} beklenen
            </strong>
            <em id={dataBusy ? "today-attendance-busy-reason" : undefined}>
              {dataBusy
                ? "Kayıt işlemi tamamlanıyor"
                : educationalWritesDisabled
                  ? "Eğitim yılı etkin değil"
                  : `${controlSummary.attendance.stateLabel} · ${controlSummary.attendance.detailLabel}`}
            </em>
          </span>
          {dataBusy || educationalWritesDisabled ? (
            <LockClosedIcon className="today-priority-lock" aria-hidden="true" />
          ) : (
            <ChevronRightIcon aria-hidden="true" />
          )}
        </button>

        <button
          className="today-priority-card today-priority-card--plan"
          type="button"
          onClick={() => {
            if (focusActivity) {
              actions.onOpenPlanItem(focusActivity);
              return;
            }
            if (configuredClassroom) {
              actions.onOpenPlanFlow();
              return;
            }
            actions.onOpenClassroom();
          }}
          disabled={planEntryDisabled}
          aria-describedby={
            educationalWritesDisabled && planEntryDisabled
              ? "academic-year-mode-copy"
              : dataBusy && planEntryDisabled
                ? "today-plan-busy-reason"
                : undefined
          }
        >
          <span className="today-priority-icon" aria-hidden="true">
            <ReaderIcon />
          </span>
          <span className="today-priority-copy">
            <small>{controlSummary.plan.label}</small>
            <strong>{controlSummary.plan.title}</strong>
            <em id={dataBusy && planEntryDisabled ? "today-plan-busy-reason" : undefined}>
              {dataBusy && planEntryDisabled
                ? "Kayıt işlemi tamamlanıyor"
                : educationalWritesDisabled && planEntryDisabled
                  ? "Eğitim yılı etkin değil"
                  : controlSummary.plan.detail}
            </em>
          </span>
          {planEntryDisabled ? (
            <LockClosedIcon className="today-priority-lock" aria-hidden="true" />
          ) : (
            <ChevronRightIcon aria-hidden="true" />
          )}
        </button>

        {controlSummary.priority.count > 0 ? (
          <button
            className="today-priority-task is-pending"
            type="button"
            onClick={actions.onOpenPendingObservation}
            disabled={dataBusy || educationalWritesDisabled}
            aria-describedby={
              educationalWritesDisabled
                ? "academic-year-mode-copy"
                : dataBusy
                  ? "today-priority-busy-reason"
                  : undefined
            }
          >
            <ClockIcon aria-hidden="true" />
            <span>
              <strong>{controlSummary.priority.title}</strong>
              <small id={dataBusy ? "today-priority-busy-reason" : undefined}>
                {dataBusy ? "Kayıt işlemi tamamlanıyor" : controlSummary.priority.detail}
              </small>
            </span>
            <b>Tamamla</b>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        ) : (
          <div className="today-priority-task is-complete" role="status">
            <CheckCircledIcon aria-hidden="true" />
            <span>
              <strong>{controlSummary.priority.title}</strong>
              <small>{controlSummary.priority.detail}</small>
            </span>
          </div>
        )}

        <div
          className={`sync-state teacher-control-sync ${syncState.className}`}
          data-testid="persistence-status"
          role="status"
          aria-live="polite"
        >
          {syncState.icon}
          <span>
            <small>Taslak ve cihaz durumu</small>
            <strong>{syncState.label}</strong>
          </span>
        </div>
        </section>
      ) : null}

      {configuredClassroom !== null && (dayClosure.carryForwardItems.length > 0 ||
      dayClosure.resolvedCarryForwardItems.length > 0 ? (
        <section
          className="teacher-carry-forward"
          aria-labelledby="teacher-carry-forward-title"
          data-testid="teacher-carry-forward"
        >
          <header className="teacher-carry-forward-heading">
            <div>
              <span className="section-eyebrow">Dünden taşınan işler</span>
              <h2 id="teacher-carry-forward-title">Takibi kaybetmeyin</h2>
              <p>
                {primaryCarryForwardItems.length > 0
                  ? `${activeCarryForwardItems.length} açık veya vadesi gelmiş iş var.`
                  : "Bugün için açık ya da vadesi gelmiş taşıma işi yok."}
              </p>
            </div>
            <strong>{activeCarryForwardItems.length}</strong>
          </header>

          {primaryCarryForwardItems.length > 0 ? (
            <div
              className="teacher-carry-primary"
              aria-label="Açık ve vadesi gelmiş taşınan işler"
            >
              {primaryCarryForwardItems.map((item) => (
                <CarryForwardItemCard
                  key={item.sourceIssueId}
                  item={item}
                  currentCivilDate={dayClosure.civilDate}
                  onTransition={actions.onTransitionCarryForward}
                />
              ))}
            </div>
          ) : (
            <p className="teacher-carry-clear" role="status">
              Günün ana önceliğinde bekleyen taşıma işi yok.
            </p>
          )}

          {secondaryCarryForwardItems.length > 0 ? (
            <details className="teacher-carry-details">
              <summary>
                <span>
                  Diğer açık, ertelenen ve çözülen işler · {secondaryCarryForwardItems.length}
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </summary>
              <div>
                {secondaryCarryForwardItems.map((item) => (
                  <CarryForwardItemCard
                    key={`${item.state}-${item.sourceIssueId}`}
                    item={item}
                    currentCivilDate={dayClosure.civilDate}
                    onTransition={actions.onTransitionCarryForward}
                    secondary
                  />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null)}

      {configuredClassroom !== null && teacherWeek.status === "ready" ? (
        <section
          className="teacher-week"
          aria-labelledby="teacher-week-title"
          data-testid="teacher-week"
        >
          <header className="teacher-week-heading">
            <div>
              <span className="section-eyebrow">Bu hafta</span>
              <h2 id="teacher-week-title">Öğretim günlerini tek zincirde izleyin</h2>
              <p>
                {teacherWeek.completedDayCount}/{teacherWeek.expectedDayCount} gün eksiksiz kapandı · {teacherWeek.plannedDayCount}/{teacherWeek.expectedDayCount} plan hazır
                {teacherWeek.carriedDayCount > 0
                  ? ` · ${teacherWeek.carriedDayCount} gün eksikle taşındı`
                  : ""}
                {teacherWeek.openWorkDayCount > 0
                  ? ` · ${teacherWeek.openWorkDayCount} açık iş günü`
                  : ""}
              </p>
              <small className={`teacher-week-coverage is-${teacherWeek.coverageStatus}`}>
                {teacherWeek.coverageDetail}
              </small>
            </div>
            <button
              type="button"
              onClick={() => void actions.onOpenCalendar()}
              aria-label="Haftanın tamamını eğitim takviminde aç"
            >
              Haftayı aç
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </header>

          <ol className="teacher-week-days" aria-label="Bu haftanın doğrulanmış öğretim günü zinciri">
            {teacherWeek.days.map((day) => (
              <li key={day.civilDate}>
                <button
                  type="button"
                  className={`teacher-week-day is-${day.state}`}
                  data-today={day.isToday ? "true" : "false"}
                  aria-current={day.isToday ? "date" : undefined}
                  onClick={() => void actions.onOpenWeekDay(day.civilDate)}
                  aria-label={`${day.weekdayLabel} ${day.civilDate}${day.isToday ? ", bugün" : ""}: ${day.title}. ${day.detail}. Yoklama ${day.attendanceMarkedCount}/${day.expectedStudentCount}; etkinlik ${day.completedActivityCount}/${day.activityCount}; ${day.observationCount} gözlem.`}
                >
                  <span className="teacher-week-day-date">
                    <small>{day.weekdayLabel}</small>
                    <strong>{Number(day.civilDate.slice(-2))}</strong>
                  </span>
                  <span className="teacher-week-day-copy">
                    <strong>{day.title}</strong>
                    <small>{day.detail}</small>
                  </span>
                  <span className="teacher-week-day-metrics" aria-hidden="true">
                    <b>{day.attendanceMarkedCount}/{day.expectedStudentCount}</b>
                    <b>{day.completedActivityCount}/{day.activityCount}</b>
                    <b>{day.observationCount} gözlem</b>
                  </span>
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>

          <footer className="teacher-week-next" role="status">
            <span>
              <small>Sıradaki doğrulanmış iş</small>
              <strong>{teacherWeek.nextActionLabel}</strong>
            </span>
            {teacherWeek.nextActionDate ? (
              <button
                type="button"
                onClick={() => void actions.onOpenWeekDay(teacherWeek.nextActionDate!)}
              >
                İlgili günü aç
              </button>
            ) : null}
          </footer>
        </section>
      ) : null}

      {configuredClassroom !== null && !preparationNoticeIntegrated ? (
      <section
        className="teacher-cycle"
        aria-labelledby="teacher-cycle-title"
        data-testid="teacher-work-cycle"
      >
        <div className="teacher-cycle-heading">
          <div>
            <span className="section-eyebrow">Planlama ve belgeler</span>
            <h2 id="teacher-cycle-title">Dönem kayıtları</h2>
          </div>
          <span className="teacher-cycle-source">4 düzey</span>
        </div>

        <div className="teacher-cycle-grid">
          {teacherCycle.stages.map((stage) => (
            <button
              className={`teacher-cycle-card is-${stage.tone}`}
              type="button"
              key={stage.id}
              onClick={() => actions.onOpenTeacherCycleStage(stage.id)}
              aria-label={`${stage.label}: ${stage.title}. ${stage.detail}. ${stage.actionLabel}`}
            >
              <span className="teacher-cycle-card-icon" aria-hidden="true">
                {stage.id === "daily" ? (
                  <ReaderIcon />
                ) : stage.id === "weekly" ? (
                  <CalendarIcon />
                ) : stage.id === "monthly" ? (
                  <TargetIcon />
                ) : (
                  <ArchiveIcon />
                )}
              </span>
              <span className="teacher-cycle-card-copy">
                <small>{stage.label}</small>
                <strong>{stage.title}</strong>
                <b>{stage.actionLabel}</b>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      ) : null}

      {configuredClassroom !== null && !preparationNoticeIntegrated ? (
        <section
          className={`teacher-day-close is-${dayClosure.status}`}
          aria-labelledby="teacher-day-close-title"
          data-testid="teacher-day-close"
        >
        <span className="teacher-day-close-icon" aria-hidden="true">
          {dayClosure.status === "closed" ? <CheckCircledIcon /> : <ClockIcon />}
        </span>
        <span className="teacher-day-close-copy">
          <small>60 saniyelik kapanış</small>
          <strong id="teacher-day-close-title">
            {dayClosure.status === "closed"
              ? dayClosure.latestClosure?.closureStatus === "complete"
                ? "Gün kapatıldı"
                : "Eksikler yarına taşındı"
              : dayClosure.status === "stale"
                ? "Kapanışı yeniden kontrol edin"
                : dayClosure.status === "not-configured"
                  ? "Gün sonu henüz kullanılamıyor"
                  : dayClosure.issues.length === 0
                    ? "Gün kapanışa hazır"
                    : `${dayClosure.issues.length} kapanış işi var`}
          </strong>
          <em>
            {dayClosure.status === "closed"
              ? `${dayClosure.evidence.attendanceMarkedCount}/${dayClosure.evidence.expectedStudentCount} yoklama · ${dayClosure.evidence.completedActivityCount}/${dayClosure.evidence.activityCount} etkinlik · ${dayClosure.evidence.observationCount} gözlem`
              : dayClosure.status === "stale"
                ? "Kapanıştan sonra kayıtlar değişti; yeni durumu yeniden onaylayın."
                : educationalWritesDisabled
                  ? "Eğitim yılı etkin olduğunda gün sonu özeti açılır."
                  : dayClosure.issues[0]?.detail ??
                    "Yoklama, uygulama ve program bağları tamamlandı."}
          </em>
        </span>
        <button
          type="button"
          onClick={actions.onOpenDayClosure}
          disabled={
            dataBusy ||
            educationalWritesDisabled ||
            dayClosure.status === "not-configured"
          }
          aria-describedby={
            educationalWritesDisabled ? "academic-year-mode-copy" : undefined
          }
        >
          {dayClosure.status === "closed"
            ? "Özeti aç"
            : dayClosure.status === "stale"
              ? "Yeniden kontrol et"
              : "Günü kapat"}
          <ChevronRightIcon aria-hidden="true" />
        </button>
        </section>
      ) : null}

      {configuredClassroom !== null ? (
      <section className="home-children" aria-labelledby="home-children-title">
        <div className="home-section-heading">
          <div>
            <span className="section-eyebrow">Sınıfın kalbi</span>
            <h2 id="home-children-title">Çocuklarım</h2>
          </div>
          <button type="button" onClick={actions.onOpenStudentSearch}>
            <MagnifyingGlassIcon aria-hidden="true" />
            Öğrenci ara
          </button>
        </div>
        {students.length > 0 ? (
          <Carousel
            className="home-child-carousel"
            contentClassName="home-child-track"
            ariaLabel="Çocuk profilleri ve hızlı gözlem eylemleri"
          >
            {students.map((student, index) => (
              <article
                className={`home-child-card home-child-card--tone-${
                  (index % 5) + 1
                }`}
                key={student.id}
              >
                <button
                  className="home-child-profile"
                  type="button"
                  onClick={() => actions.onOpenStudentProfile(student.id)}
                  aria-label={`${student.name} profilini aç`}
                >
                  {slots.renderStudentAvatar?.(student, "home-child-avatar") ?? (
                    <TodayStudentAvatar student={student} />
                  )}
                  <span className="home-child-copy">
                    <strong>{student.preferredName ?? student.name}</strong>
                    {student.preferredName ? <small>{student.name}</small> : null}
                    <small>
                      {slots.formatStudentAge(
                        student.birthDate,
                        workspace.civilDate,
                      )}
                    </small>
                    <em>{student.observationCount} gözlem</em>
                  </span>
                  <ChevronRightIcon aria-hidden="true" />
                </button>
                <button
                  className="home-child-observe"
                  type="button"
                  onClick={() =>
                    void actions.onOpenStudentObservation(student.id)
                  }
                  disabled={dataBusy || educationalWritesDisabled}
                  aria-label={`${student.name} için hızlı gözlem`}
                  aria-describedby={
                    educationalWritesDisabled
                      ? "academic-year-mode-copy"
                      : undefined
                  }
                >
                  <PlusIcon aria-hidden="true" />
                  Hızlı gözlem
                </button>
              </article>
            ))}
          </Carousel>
        ) : (
          <button
            className="home-children-empty"
            type="button"
            onClick={actions.onOpenStudentSearch}
          >
            <span>
              <PersonIcon aria-hidden="true" />
            </span>
            <strong>Çocukları ekleyin</strong>
            <small>
              Profil, günlük gözlem ve gelişim izi burada başlayacak.
            </small>
          </button>
        )}
      </section>
      ) : null}

      {configuredClassroom !== null && premiumPlanCenterEnabled ? (
        <section
          className="teacher-control-premium"
          aria-labelledby="premium-entry-title"
        >
          <span className="teacher-control-premium-icon" aria-hidden="true">
            <StarIcon />
          </span>
          <span className="teacher-control-premium-copy">
            <small>Premium · yıllık · aylık · haftalık · günlük</small>
            <strong id="premium-entry-title">Plan Kütüphanesi</strong>
          </span>
          <button type="button" onClick={actions.onOpenPremiumPlans}>
            Planları aç <ChevronRightIcon aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {configuredClassroom !== null && planEvidenceDetailsEnabled && !preparationNoticeIntegrated ? (
        <>
          <section
            className={`current-work ${focusActivity ? "" : "empty-work"}`}
            aria-labelledby="current-work-title"
            data-testid="current-work"
          >
            {focusActivity ? (
              <>
                <div className="current-work-heading">
                  <p className="section-eyebrow">
                    {focusActivity.status === "in_progress"
                      ? "Sınıfta şimdi"
                      : focusActivity.kind === "premium-flow-block" ||
                          focusActivity.kind === "teacher-flow-block"
                        ? "Sıradaki akış adımı"
                        : "Sıradaki etkinlik"}
                  </p>
                  <span className="status-label">
                    {todayPlanItemStatusLabel(focusActivity)}
                  </span>
                </div>
                <h2 id="current-work-title">{focusActivity.title}</h2>
                <p className="current-time">
                  {focusActivity.startTime ??
                    (focusActivity.durationMinutes
                      ? `${focusActivity.durationMinutes} dk`
                      : "Akış sırası")}
                  {focusActivity.endTime ? `–${focusActivity.endTime}` : ""}
                  {focusActivity.subject ? ` · ${focusActivity.subject}` : ""}
                </p>
                <div className="current-details">
                  <div className="current-meta-row">
                    <TargetIcon aria-hidden="true" />
                    <span>
                      {focusActivity.activityTitle ??
                        focusActivity.purpose ??
                        focusActivity.curriculumConnection ??
                        `${focusActivity.subject ?? "Planlı etkinlik"} · Program bağlantısı`}
                    </span>
                  </div>
                  {focusActivity.activityId ? (
                    <div className="current-evidence-row">
                      <ReaderIcon aria-hidden="true" />
                      <span>{focusActivity.evidenceCount} öğrenme kanıtı</span>
                    </div>
                  ) : null}
                </div>
                {focusActivity.activityId && focusActivity.canCaptureEvidence ? (
                  <button
                    className="primary-evidence-button"
                    type="button"
                    onClick={() =>
                      void actions.onOpenActivityEvidence(focusActivity.activityId!)
                    }
                    disabled={dataBusy || educationalWritesDisabled}
                  >
                    <PlusIcon aria-hidden="true" />{" "}
                    {focusActivity.status === "planned"
                      ? "Etkinliği başlat"
                      : "Hızlı gözlem ekle"}
                  </button>
                ) : null}
                {focusActivity.status === "in_progress" ? (
                  <button
                    className="secondary-text-button"
                    type="button"
                    onClick={() => void actions.onCompleteCurrentActivity()}
                    disabled={dataBusy || educationalWritesDisabled}
                  >
                    Etkinliği tamamla
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="section-eyebrow">Başlangıç</p>
                <h2 id="current-work-title">
                  {configuredClassroom
                    ? "Bugün için plan eklenmedi"
                    : "Önce sınıfınızı kurun"}
                </h2>
                <p>
                  {configuredClassroom
                    ? "Kayıtlı bir plan olduğunda sıradaki etkinlik ve öğrenme kanıtları burada görünür."
                    : "Sınıf adı, yaş grubu, program ve kalıcı çalışma düzenini belirleyerek başlayın."}
                </p>
                {!configuredClassroom || !educationalWritesDisabled ? (
                  <button
                    className="empty-primary"
                    type="button"
                    onClick={
                      configuredClassroom
                        ? actions.onOpenPlanFlow
                        : actions.onOpenClassroom
                    }
                    disabled={educationalWritesDisabled}
                  >
                    {configuredClassroom ? "Günlük plan oluştur" : "Sınıfı kur"}
                  </button>
                ) : null}
              </>
            )}
          </section>

          <section className="today-plan" aria-labelledby="today-plan-title">
            <div className="today-plan-heading">
              <div>
                <span className="today-plan-kicker">Sıradaki adımlar</span>
                <h2 id="today-plan-title">Günün planı</h2>
              </div>
              <span className="today-plan-count">
                {flowBlockCount > 0
                  ? `${flowBlockCount} akış adımı${
                      standaloneActivityCount > 0
                        ? ` · ${standaloneActivityCount} etkinlik`
                        : ""
                    }`
                  : `${standaloneActivityCount} etkinlik`}
              </span>
            </div>
            {workspace.planItems.length > 0 ? (
              <div className="activity-list">
                {workspace.planItems.map((item, index) => (
                  <button
                    className={`activity-row is-${
                      item.flowBlockStatus === "skipped"
                        ? "skipped is-next"
                        : item.status === "in_progress"
                        ? "current"
                        : item.status === "completed"
                          ? "completed"
                          : "next"
                    }`}
                    type="button"
                    key={item.id}
                    onClick={() => actions.onOpenPlanItem(item)}
                  >
                    <span className="activity-marker" aria-hidden="true">
                      {item.status === "completed" &&
                      item.flowBlockStatus !== "skipped" ? (
                        <CheckCircledIcon />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="activity-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {item.startTime ??
                          (item.durationMinutes
                            ? `${item.durationMinutes} dk`
                            : "Akış sırası")} ·{" "}
                        <b>{todayPlanItemStatusLabel(item)}</b>
                      </small>
                      {item.activityTitle && item.activityTitle !== item.title ? (
                        <small>Etkinlik: {item.activityTitle}</small>
                      ) : null}
                    </span>
                    <span className="activity-evidence">
                      {item.activityId && item.evidenceCount > 0
                        ? `${item.evidenceCount} kanıt`
                        : item.activityId
                          ? "Henüz kanıt yok"
                          : `${item.durationMinutes ?? 0} dk`}
                    </span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
            {pendingObservationCount > 0 ? (
              <button
                className="pending-link"
                type="button"
                onClick={actions.onOpenPendingObservation}
              >
                <ClockIcon aria-hidden="true" />
                <span>
                  Program bağlantısı bekleyen {pendingObservationCount} gözlem
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ) : null}
            {workspace.planItems.length > 0 ? (
              <div className="traceability-link">
                <Link2Icon aria-hidden="true" />
                <span>
                  Bugünün planı {workspace.linkedLearningGoalCount} öğrenme
                  hedefi ve {workspace.datedEvidenceCount} tarihli kanıtla
                  bağlantılı.
                </span>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
