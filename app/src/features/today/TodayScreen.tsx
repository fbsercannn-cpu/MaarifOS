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
  TargetIcon,
} from "@radix-ui/react-icons";

import { Carousel } from "../../mobile/Carousel.tsx";
import type { TodayPlanItem } from "./today-data.ts";
import {
  TODAY_ACTIVITY_STATUS_LABELS,
  compactTodayProgramLabel,
  configuredClassroomFromToday,
  focusActivityFromToday,
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
    pendingObservationCount,
    planEvidenceDetailsEnabled,
  } = model;
  const configuredClassroom = configuredClassroomFromToday(workspace);
  const focusActivity = focusActivityFromToday(workspace);

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
        <p
          className={`sync-state ${syncState.className}`}
          data-testid="persistence-status"
          role="status"
          aria-live="polite"
        >
          {syncState.icon}
          {syncState.label}
        </p>
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
            <strong id="update-ready-title">Yeni sürüm hazır</strong>
            <small>Kaydınızı tamamladıysanız güvenle güncelleyin.</small>
          </span>
          <button type="button" onClick={actions.onApplyReadyUpdate}>
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

      <section className="daily-summary" aria-label="Günlük özet">
        <button
          className="summary-action"
          type="button"
          onClick={actions.onOpenAttendance}
          disabled={educationalWritesDisabled}
        >
          <PersonIcon aria-hidden="true" />
          <span>
            <small>Bugünkü devam</small>
            <strong>
              {attendance.present + attendance.late}/{attendance.total} çocuk
            </strong>
          </span>
        </button>
        <button
          className="summary-action"
          type="button"
          onClick={() => void actions.onOpenCalendar()}
        >
          <CalendarIcon aria-hidden="true" />
          <span>
            <small>Sınıf takvimi</small>
            <strong>Takvimi aç</strong>
          </span>
        </button>
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
                      : "Sıradaki etkinlik"}
                  </p>
                  <span className="status-label">
                    {TODAY_ACTIVITY_STATUS_LABELS[focusActivity.status]}
                  </span>
                </div>
                <h2 id="current-work-title">{focusActivity.title}</h2>
                <p className="current-time">
                  {focusActivity.startTime}
                  {focusActivity.endTime ? `–${focusActivity.endTime}` : ""}
                  {focusActivity.subject ? ` · ${focusActivity.subject}` : ""}
                </p>
                <div className="current-details">
                  <div className="current-meta-row">
                    <TargetIcon aria-hidden="true" />
                    <span>
                      {focusActivity.curriculumConnection ??
                        `${focusActivity.subject ?? "Planlı etkinlik"} · Program bağlantısı`}
                    </span>
                  </div>
                  <div className="current-evidence-row">
                    <ReaderIcon aria-hidden="true" />
                    <span>{focusActivity.evidenceCount} öğrenme kanıtı</span>
                  </div>
                </div>
                <button
                  className="primary-evidence-button"
                  type="button"
                  onClick={() =>
                    void actions.onOpenActivityEvidence(focusActivity.id)
                  }
                  disabled={dataBusy || educationalWritesDisabled}
                >
                  <PlusIcon aria-hidden="true" />{" "}
                  {focusActivity.status === "planned"
                    ? "Etkinliği başlat"
                    : "Hızlı gözlem ekle"}
                </button>
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
                {workspace.planItems.length} etkinlik
              </span>
            </div>
            {workspace.planItems.length > 0 ? (
              <div className="activity-list">
                {workspace.planItems.map((item, index) => (
                  <button
                    className={`activity-row is-${
                      item.status === "in_progress"
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
                      {item.status === "completed" ? (
                        <CheckCircledIcon />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="activity-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {item.startTime} ·{" "}
                        <b>{TODAY_ACTIVITY_STATUS_LABELS[item.status]}</b>
                      </small>
                    </span>
                    <span className="activity-evidence">
                      {item.evidenceCount > 0
                        ? `${item.evidenceCount} kanıt`
                        : "Henüz kanıt yok"}
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
