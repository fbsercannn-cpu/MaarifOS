import type { ReactNode } from "react";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  GearIcon,
  Link2Icon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  StarIcon,
  TargetIcon,
} from "@radix-ui/react-icons";

import { Carousel } from "../../mobile/Carousel.tsx";
import type { TodayPlanItem } from "./today-data.ts";
import {
  compactTodayProgramLabel,
  configuredClassroomFromToday,
  createTodayControlCenterSummary,
  todayPlanItemStatusLabel,
  todayCatalogDisplayLabel,
  type TodayScreenModel,
  type TodayStudentCard,
} from "./today-screen-model.ts";

export interface TodayScreenActions {
  onOpenSettings: () => void;
  onApplyReadyUpdate: () => void;
  onOpenClassroom: () => void;
  onOpenAttendance: () => void;
  onOpenCalendar: () => void | Promise<void>;
  onOpenStudentSearch: () => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenStudentObservation: (studentId: string) => void | Promise<void>;
  onOpenActivityEvidence: (activityId: string) => void | Promise<void>;
  onCompleteCurrentActivity: () => void | Promise<void>;
  onOpenPlanFlow: () => void;
  onOpenPremiumPlans: () => void;
  onOpenPlanItem: (item: TodayPlanItem) => void;
  onOpenPendingObservation: () => void;
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
  const controlSummary = createTodayControlCenterSummary({
    workspace,
    attendance,
    pendingObservationCount,
  });
  const focusActivity = controlSummary.plan.item;
  const planEntryDisabled =
    focusActivity === null &&
    configuredClassroom !== null &&
    (dataBusy || educationalWritesDisabled);
  const premiumFlowBlockCount = workspace.planItems.filter(
    (item) => item.kind === "premium-flow-block",
  ).length;
  const standaloneActivityCount =
    workspace.planItems.length - premiumFlowBlockCount;

  return (
    <main
      className="maarif-screen today-screen"
      aria-label="MaarifOS Bugün ekranı"
      data-testid="today-screen"
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
        <p className="today-flow-label">Günün akışı</p>
        <p className="today-date">{civilDateLabel}</p>
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

      {educationalWriteNotice ? (
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
          <ChevronRightIcon aria-hidden="true" />
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
          <ChevronRightIcon aria-hidden="true" />
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

      {premiumPlanCenterEnabled ? (
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

      {planEvidenceDetailsEnabled ? (
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
                      : focusActivity.kind === "premium-flow-block"
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
                {premiumFlowBlockCount > 0
                  ? `${premiumFlowBlockCount} akış adımı${
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
