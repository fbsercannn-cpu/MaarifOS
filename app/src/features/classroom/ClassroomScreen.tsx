import { useId, type ReactNode } from "react";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cross2Icon,
  DotsHorizontalIcon,
  DownloadIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { KeyboardInput } from "../../mobile";
import {
  CLASSROOM_STATUS_LABELS,
  classroomRosterStatus,
  classroomScreenDescription,
  classroomStudentDisplayName,
  createClassroomTaskCenterSummary,
  resolveClassroomPriorityTask,
  type ClassroomScreenSummary,
  type ClassroomStudentViewModel,
} from "./classroom-screen-model";
import "./classroom-screen.css";

type ClassroomAction = (studentId: string) => void | Promise<void>;
type ClassroomStudentAction = (
  student: ClassroomStudentViewModel,
) => void | Promise<void>;

export interface ClassroomScreenProps {
  summary: ClassroomScreenSummary;
  visibleStudents: readonly ClassroomStudentViewModel[];
  archivedStudents: readonly ClassroomStudentViewModel[];
  searchQuery: string;
  /** Controller'ın Türkçe-normalize edilmiş aramanın etkin olduğunu bildiren değeri. */
  hasActiveSearch: boolean;
  openActionsStudentId: string | null;
  isBusy?: boolean;
  educationalWritesDisabled?: boolean;
  educationalWriteNotice?: string | null;
  getObservationCount: (studentId: string) => number;
  getAgeLabel: (student: ClassroomStudentViewModel) => string;
  renderAvatar?: (student: ClassroomStudentViewModel) => ReactNode;
  onSearchQueryChange: (value: string) => void;
  onOpenAddStudent: () => void;
  onOpenAttendance: () => void;
  onOpenExport: () => void;
  onOpenProfile: ClassroomAction;
  onOpenObservation: ClassroomAction;
  onToggleStudentActions: (studentId: string) => void;
  onArchiveStudent: ClassroomAction;
  onRestoreStudent: ClassroomAction;
  onDeleteStudent: ClassroomStudentAction;
}

function DefaultStudentAvatar({
  student,
}: {
  student: ClassroomStudentViewModel;
}) {
  const displayName = classroomStudentDisplayName(student);
  const initials = student.name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toLocaleUpperCase("tr-TR"))
    .join("");

  return (
    <span className="student-avatar">
      {student.profilePhotoDataUrl ? (
        <img src={student.profilePhotoDataUrl} alt={`${displayName} profil fotoğrafı`} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

/**
 * Controller'sız iş kuralı çalıştırmayan, route veya sheet içinde kullanılabilen
 * kontrollü Sınıfım yüzeyi.
 */
export function ClassroomScreen({
  summary,
  visibleStudents,
  archivedStudents,
  searchQuery,
  hasActiveSearch,
  openActionsStudentId,
  isBusy = false,
  educationalWritesDisabled = false,
  educationalWriteNotice = null,
  getObservationCount,
  getAgeLabel,
  renderAvatar,
  onSearchQueryChange,
  onOpenAddStudent,
  onOpenAttendance,
  onOpenExport,
  onOpenProfile,
  onOpenObservation,
  onToggleStudentActions,
  onArchiveStudent,
  onRestoreStudent,
  onDeleteStudent,
}: ClassroomScreenProps) {
  const componentId = useId();
  const headingId = `${componentId}-heading`;
  const activeStudentsHeadingId = `${componentId}-active-students-heading`;
  const descriptionId = `${componentId}-description`;
  const taskCenterHeadingId = `${componentId}-task-center-heading`;
  const priorityDetailId = `${componentId}-priority-detail`;
  const priorityDisabledReasonId = `${componentId}-priority-disabled-reason`;
  const avatarFor = (student: ClassroomStudentViewModel) =>
    renderAvatar ? renderAvatar(student) : <DefaultStudentAvatar student={student} />;
  const taskCenter = createClassroomTaskCenterSummary({
    summary,
    students: visibleStudents,
    hasActiveSearch,
  });
  const priorityTask = resolveClassroomPriorityTask({
    summary,
    students: visibleStudents,
    hasActiveSearch,
    educationalWritesDisabled,
    observationCountFor: getObservationCount,
  });
  const priorityActionLabel =
    priorityTask.kind === "open-attendance"
      ? priorityTask.actionLabel
      : priorityTask.kind === "add-student"
      ? "İlk çocuğu ekle"
      : priorityTask.kind === "clear-search"
        ? "Aramayı temizle"
        : priorityTask.kind === "observe-student"
          ? "Gözlem ekle"
          : priorityTask.kind === "review-profile"
            ? "Dosyayı aç"
            : "Dökümü denetle";
  const runPriorityAction = () => {
    if (priorityTask.kind === "open-attendance") {
      onOpenAttendance();
      return;
    }
    if (priorityTask.kind === "add-student") {
      onOpenAddStudent();
      return;
    }
    if (priorityTask.kind === "clear-search") {
      onSearchQueryChange("");
      return;
    }
    if (priorityTask.kind === "observe-student") {
      void onOpenObservation(priorityTask.studentId);
      return;
    }
    if (priorityTask.kind === "review-profile") {
      void onOpenProfile(priorityTask.studentId);
      return;
    }
    onOpenExport();
  };
  const priorityActionDisabled =
    isBusy ||
    (priorityTask.kind === "open-attendance" && educationalWritesDisabled);
  const priorityDisabledReason = isBusy
    ? "Kayıt işlemi tamamlanıyor; eylem birazdan açılacak."
    : priorityTask.kind === "open-attendance" && educationalWritesDisabled
      ? educationalWriteNotice ??
        "Eğitim yılı etkin olmadığı için yoklama değiştirilemez."
      : null;

  return (
    <main
      className="maarif-screen classroom-screen"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <header className="classroom-screen__header">
        <div>
          <span className="d1-kicker">Sınıf yönetimi</span>
          <h1 id={headingId} data-route-heading tabIndex={-1}>
            Sınıfım
          </h1>
          <p id={descriptionId}>
            {classroomScreenDescription(summary, archivedStudents.length)}
          </p>
        </div>
      </header>

      {educationalWriteNotice ? (
        <p className="academic-year-mode-warning" role="status">
          <CalendarIcon aria-hidden="true" />
          <small id="academic-year-mode-copy">{educationalWriteNotice}</small>
        </p>
      ) : null}

      <section
        className="classroom-command-center"
        aria-labelledby={taskCenterHeadingId}
      >
        <div className="classroom-command-center__heading">
          <div>
            <span className="d1-kicker">Öğretmen kontrolü</span>
            <h2 id={taskCenterHeadingId}>Sınıf görev merkezi</h2>
          </div>
          <div className="classroom-command-center__summary" aria-label="Sınıf özeti">
            <span><strong>{summary.activeStudentCount}</strong> aktif</span>
            <span><strong>{summary.presentStudentCount}</strong> geldi</span>
            <span><strong>{archivedStudents.length}</strong> arşiv</span>
          </div>
        </div>

        <div
          className="classroom-health-grid"
          role="status"
          aria-label="Sınıf yoklama ve kanıt durumu"
          aria-live="polite"
        >
          <article data-state={taskCenter.attendance.state}>
            <span className="classroom-health-icon" aria-hidden="true">
              {taskCenter.attendance.state === "ready" ? (
                <CheckCircledIcon />
              ) : (
                <CalendarIcon />
              )}
            </span>
            <div>
              <small>Bugünün yoklaması</small>
              <strong>{taskCenter.attendance.title}</strong>
              <span>{taskCenter.attendance.detail}</span>
            </div>
          </article>
          <article data-state={taskCenter.evidence.state}>
            <span className="classroom-health-icon" aria-hidden="true">
              {taskCenter.evidence.state === "ready" ? (
                <CheckCircledIcon />
              ) : (
                <ReaderIcon />
              )}
            </span>
            <div>
              <small>Kanıt izi</small>
              <strong>{taskCenter.evidence.title}</strong>
              <span>{taskCenter.evidence.detail}</span>
            </div>
          </article>
        </div>

        <div className="classroom-priority-task">
          <span className="classroom-priority-task__icon" aria-hidden="true">
            {priorityTask.kind === "open-attendance" ? (
              <CalendarIcon />
            ) : priorityTask.kind === "export-observations" ||
            priorityTask.kind === "review-profile" ? (
              <ReaderIcon />
            ) : priorityTask.kind === "clear-search" ? (
              <MagnifyingGlassIcon />
            ) : priorityTask.kind === "observe-student" ? (
              <PlusIcon />
            ) : (
              <PersonIcon />
            )}
          </span>
          <div aria-live="polite">
            <small>Sıradaki kritik iş</small>
            <strong>{priorityTask.title}</strong>
            <span id={priorityDetailId}>{priorityTask.detail}</span>
            {priorityDisabledReason ? (
              <span
                className="classroom-priority-task__disabled-reason"
                id={priorityDisabledReasonId}
              >
                {priorityDisabledReason}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={runPriorityAction}
            disabled={priorityActionDisabled}
            aria-describedby={`${priorityDetailId}${
              priorityDisabledReason ? ` ${priorityDisabledReasonId}` : ""
            }`}
          >
            {priorityActionLabel}
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="roster-toolbar">
        <label className="roster-search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <span className="classroom-screen__visually-hidden">Öğrenci ara</span>
          <KeyboardInput
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Ad veya soyad ile ara"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              aria-label="Aramayı temizle"
            >
              <Cross2Icon aria-hidden="true" />
            </button>
          ) : null}
        </label>

        {summary.activeStudentCount > 0 ? (
          <button
            className="roster-add-trigger"
            type="button"
            onClick={onOpenAddStudent}
            disabled={isBusy}
          >
            <PlusIcon aria-hidden="true" />
            Çocuk ekle
          </button>
        ) : null}

        <button
          className="roster-export-trigger"
          type="button"
          onClick={onOpenExport}
          aria-label="Sınıfın tüm gözlemlerini metin olarak dışa aktar"
        >
          <DownloadIcon aria-hidden="true" />
          Gözlem dökümü
        </button>
      </div>

      <section
        className="children-section roster-section"
        aria-labelledby={activeStudentsHeadingId}
      >
        <div className="roster-section-heading">
          <h2 id={activeStudentsHeadingId}>Sınıftaki çocuklar</h2>
          <span>{visibleStudents.length} gösteriliyor</span>
        </div>

        {visibleStudents.length > 0 ? (
          <ul className="children-list roster-list">
            {visibleStudents.map((student, index) => {
              const observationCount = getObservationCount(student.id);
              const actionsOpen = openActionsStudentId === student.id;
              const actionsId = `${componentId}-student-actions-${index}`;
              const rosterStatus = classroomRosterStatus(student);

              return (
                <li
                  className="children-row roster-card"
                  data-actions-open={actionsOpen ? "true" : "false"}
                  key={student.id}
                >
                  <div className="roster-card-main">
                    <button
                      className="children-profile-button"
                      type="button"
                      onClick={() => void onOpenProfile(student.id)}
                      aria-label={`${student.name} profilini aç`}
                    >
                      {avatarFor(student)}
                      <span className="student-name">
                        <strong>{classroomStudentDisplayName(student)}</strong>
                        <small>
                          {student.preferredName ? `${student.name} · ` : ""}
                          {getAgeLabel(student)}
                        </small>
                        <span>
                          <i
                            className={`roster-status-dot roster-status-dot--${rosterStatus}`}
                            aria-hidden="true"
                          />
                          {CLASSROOM_STATUS_LABELS[rosterStatus]} · {observationCount} gözlem
                        </span>
                      </span>
                      <span className="roster-profile-cta" aria-hidden="true">
                        <ReaderIcon />
                        Dosya
                      </span>
                    </button>

                    <div
                      className="roster-card-primary-actions"
                      role="group"
                      aria-label={`${student.name} hızlı işlemleri`}
                    >
                      <button
                        className="roster-quick-action"
                        type="button"
                        onClick={() => void onOpenObservation(student.id)}
                        disabled={isBusy || educationalWritesDisabled}
                        aria-label={`${student.name} için gözlem ekle`}
                        aria-describedby={
                          educationalWritesDisabled ? "academic-year-mode-copy" : undefined
                        }
                      >
                        <PlusIcon aria-hidden="true" />
                        Gözlem
                      </button>

                      <button
                        className="roster-more-action"
                        type="button"
                        onClick={() => onToggleStudentActions(student.id)}
                        aria-label={`${student.name} için diğer işlemler`}
                        aria-expanded={actionsOpen}
                        aria-pressed={actionsOpen}
                        aria-controls={actionsId}
                      >
                        <DotsHorizontalIcon aria-hidden="true" />
                        İşlemler
                      </button>
                    </div>
                  </div>

                  {actionsOpen ? (
                    <div
                      className="roster-card-actions"
                      id={actionsId}
                      role="group"
                      aria-label={`${student.name} işlemleri`}
                    >
                      <span>Geçmiş gözlem ve devam kayıtları korunur.</span>
                      <button
                        type="button"
                        onClick={() => void onArchiveStudent(student.id)}
                        disabled={isBusy}
                        aria-label={`${student.name} çocuğunu sınıftan ayır`}
                      >
                        Arşivle
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="roster-empty" role="status" aria-live="polite">
            {hasActiveSearch ? (
              <>
                <MagnifyingGlassIcon aria-hidden="true" />
                <strong>Eşleşen çocuk bulunamadı</strong>
                <span>Arama ifadesini değiştirerek yeniden deneyin.</span>
              </>
            ) : (
              <>
                <PersonIcon aria-hidden="true" />
                <strong>Henüz çocuk eklenmedi</strong>
                <span>
                  Sınıf listesini oluşturarak yoklama ve gözlem akışını başlatın.
                </span>
                <button type="button" onClick={onOpenAddStudent} disabled={isBusy}>
                  <PlusIcon aria-hidden="true" /> Çocuk ekle
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {archivedStudents.length > 0 ? (
        <details className="roster-archive">
          <summary>
            <span>Sınıftan ayrılanlar / arşivlenenler · geri al veya kalıcı sil</span>
            <strong>{archivedStudents.length}</strong>
            <ChevronDownIcon aria-hidden="true" />
          </summary>
          <ul className="children-list roster-archive-list">
            {archivedStudents.map((student) => (
              <li className="children-row children-row--archived" key={student.id}>
                {avatarFor(student)}
                <span className="student-name">
                  <strong>{student.name}</strong>
                  <small>Geçmiş kayıtları korunuyor</small>
                </span>
                <div className="archived-student-actions">
                  <button
                    type="button"
                    onClick={() => void onOpenProfile(student.id)}
                    disabled={isBusy}
                    aria-label={`${student.name} dosyasını aç`}
                  >
                    Dosya
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRestoreStudent(student.id)}
                    disabled={isBusy}
                    aria-label={`${student.name} çocuğunu sınıfa geri al`}
                  >
                    Geri al
                  </button>
                  <button
                    className="is-danger"
                    type="button"
                    onClick={() => void onDeleteStudent(student)}
                    disabled={isBusy}
                    aria-label={`${student.name} çocuğunu kalıcı sil`}
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
