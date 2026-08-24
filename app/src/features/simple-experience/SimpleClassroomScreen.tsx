import {
  ArchiveIcon,
  ChevronRightIcon,
  DownloadIcon,
  DotsHorizontalIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import { KeyboardInput } from "../../mobile";
import type { ClassroomScreenProps } from "../classroom/ClassroomScreen.tsx";
import {
  classroomStudentDisplayName,
  classroomStudentProfileMissingFields,
} from "../classroom/classroom-screen-model.ts";
import "./simple-workspaces.css";

export function SimpleClassroomScreen({
  summary,
  visibleStudents,
  archivedStudents,
  searchQuery,
  hasActiveSearch,
  openActionsStudentId,
  isBusy = false,
  educationalWritesDisabled = false,
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
}: ClassroomScreenProps) {
  return (
    <main className="simple-workspace simple-classroom" aria-labelledby="simple-classroom-title">
      <header className="simple-workspace__hero">
        <span>SINIF DOSYASI</span>
        <h1 id="simple-classroom-title" data-route-heading tabIndex={-1}>Sınıfım</h1>
        <p>Öğrenciyi bulun, gözlem ekleyin veya imzaya hazır listeyi indirin.</p>
        <div className="simple-workspace__facts" aria-label="Sınıf özeti">
          <span><strong>{summary.activeStudentCount}</strong> aktif</span>
          <span><strong>{summary.presentStudentCount}</strong> geldi</span>
          <span><strong>{summary.observedStudentCount}</strong> gözlemlendi</span>
        </div>
      </header>

      <div className="simple-classroom__primary-actions">
        <button type="button" onClick={onOpenAddStudent} disabled={isBusy}>
          <PlusIcon aria-hidden="true" /> Öğrenci ekle
        </button>
        <button type="button" onClick={onOpenExport} disabled={isBusy}>
          <DownloadIcon aria-hidden="true" /> Sınıf listesini indir
        </button>
      </div>

      <button
        type="button"
        className="simple-classroom__attendance"
        onClick={onOpenAttendance}
        disabled={isBusy || educationalWritesDisabled}
      >
        <ReaderIcon aria-hidden="true" />
        <span>
          <strong>Bugünün yoklaması</strong>
          <small>{summary.attendanceCompleted ? "Tamamlandı" : "Çocuklara dokunarak işaretleyin"}</small>
        </span>
        <ChevronRightIcon aria-hidden="true" />
      </button>

      <section className="simple-workspace__section" aria-labelledby="simple-students-title">
        <div className="simple-workspace__heading">
          <div>
            <small>ÖĞRENCİLER</small>
            <h2 id="simple-students-title">Sınıf listesi</h2>
          </div>
          <span>{visibleStudents.length} kişi</span>
        </div>
        <label className="simple-classroom__search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <span className="sr-only">Öğrenci ara</span>
          <KeyboardInput
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Öğrenci ara"
            autoComplete="off"
          />
        </label>

        {visibleStudents.length === 0 ? (
          <div className="simple-empty-state">
            <strong>{hasActiveSearch ? "Eşleşen öğrenci yok" : "Henüz öğrenci eklenmedi"}</strong>
            <p>{hasActiveSearch ? "Arama metnini değiştirin." : "İlk öğrenciyi ekleyerek sınıf dosyasını başlatın."}</p>
            {!hasActiveSearch ? <button type="button" onClick={onOpenAddStudent}><PlusIcon aria-hidden="true" /> İlk öğrenciyi ekle</button> : null}
          </div>
        ) : (
          <ul className="simple-student-list">
            {visibleStudents.map((student) => {
              const actionsOpen = openActionsStudentId === student.id;
              const actionsId = `simple-student-actions-${student.id}`;
              const missingProfileFields = classroomStudentProfileMissingFields(student);
              return (
                <li key={student.id} data-actions-open={actionsOpen ? "true" : "false"}>
                  <button type="button" className="simple-student-list__profile" onClick={() => void onOpenProfile(student.id)}>
                    {renderAvatar ? renderAvatar(student) : <span className="simple-student-avatar" aria-hidden="true">{student.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>}
                    <span>
                      <strong>{classroomStudentDisplayName(student)}</strong>
                      <small>{getAgeLabel(student)} · {getObservationCount(student.id)} gözlem</small>
                      <em
                        className={
                          missingProfileFields.length > 0
                            ? "simple-student-list__completeness is-missing"
                            : "simple-student-list__completeness is-complete"
                        }
                      >
                        {missingProfileFields.length > 0
                          ? `${missingProfileFields.length} bilgi tamamlanacak`
                          : "Temel bilgiler tamam"}
                      </em>
                      {student.careDetails?.allergies?.trim() ? (
                        <em className="simple-student-list__safety-alert">
                          Alerji notu var
                        </em>
                      ) : null}
                    </span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                  <div className="simple-student-list__actions" role="group" aria-label={`${student.name} hızlı işlemleri`}>
                    <button
                      type="button"
                      className="simple-student-list__observe"
                      onClick={() => void onOpenObservation(student.id)}
                      disabled={isBusy || educationalWritesDisabled}
                    >
                      <Pencil1Icon aria-hidden="true" />
                      Gözlem
                    </button>
                    <button
                      type="button"
                      className="simple-student-list__more"
                      onClick={() => onToggleStudentActions(student.id)}
                      aria-label={`${student.name} için diğer işlemler`}
                      aria-expanded={actionsOpen}
                      aria-controls={actionsId}
                    >
                      <DotsHorizontalIcon aria-hidden="true" />
                    </button>
                  </div>
                  {actionsOpen ? (
                    <div
                      className="simple-student-list__action-panel"
                      id={actionsId}
                      role="group"
                      aria-label={`${student.name} işlemleri`}
                    >
                      <small>
                        {missingProfileFields.length > 0
                          ? `Eksik: ${missingProfileFields.join(", ")}.`
                          : "Kimlik ve veli iletişim bilgileri tamam."}
                      </small>
                      <div className="simple-student-list__profile-actions">
                        <button
                          type="button"
                          onClick={() => void onOpenProfile(student.id, "details")}
                          disabled={isBusy}
                        >
                          Bilgileri düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => void onOpenProfile(student.id, "contacts")}
                          disabled={isBusy}
                        >
                          Veli / yakınlar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onOpenProfile(student.id, "care")}
                          disabled={isBusy}
                        >
                          Sağlık / teslim
                        </button>
                      </div>
                      <button
                        className="simple-student-list__archive"
                        type="button"
                        onClick={() => void onArchiveStudent(student.id)}
                        disabled={isBusy}
                        aria-label={`${student.name} çocuğunu sınıftan ayır`}
                      >
                        Sınıftan ayır
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {archivedStudents.length > 0 ? (
        <details className="simple-classroom__archive">
          <summary><ArchiveIcon aria-hidden="true" /> Arşivde {archivedStudents.length} öğrenci</summary>
          <ul>
            {archivedStudents.map((student) => (
              <li key={student.id}>
                <span>{classroomStudentDisplayName(student)}</span>
                <button
                  type="button"
                  onClick={() => void onRestoreStudent(student.id)}
                  disabled={isBusy}
                  aria-label={`${student.name} çocuğunu sınıfa geri al`}
                >
                  Geri al
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
