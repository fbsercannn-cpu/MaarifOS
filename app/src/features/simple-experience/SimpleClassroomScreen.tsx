import {
  ArchiveIcon,
  CalendarIcon,
  ChevronRightIcon,
  DownloadIcon,
  DotsHorizontalIcon,
  GearIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  ReaderIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import { KeyboardInput } from "../../mobile";
import type { Tymm2024AgeBand } from "../curriculum/tymm-2024-catalog.ts";
import type { ClassroomScreenProps } from "../classroom/ClassroomScreen.tsx";
import {
  classroomStudentDisplayName,
  classroomStudentProfileMissingFields,
} from "../classroom/classroom-screen-model.ts";
import "./simple-workspaces.css";
import { studentProfileCopy } from "../students/student-profile-copy.ts";
import { ClassRosterPurposeActions } from "../classroom/ClassRosterPurposeActions.tsx";
import type { ClassRosterLayoutId } from "../classroom/class-roster-layouts.ts";

interface SimpleClassroomScreenProps
  extends Omit<ClassroomScreenProps, "onOpenProfile" | "onOpenObservation"> {
  classAgeBand: Tymm2024AgeBand | null;
  rosterWritesDisabled?: boolean;
  rosterWriteNotice?: string | null;
  onOpenImport?(): void;
  onOpenClassroomSetup?(): void;
  onOpenDuties?(): void;
  onPrepareRoster?(layout: ClassRosterLayoutId): void | Promise<void>;
  onOpenProfile(
    studentId: string,
    section?: "flow" | "details" | "contacts" | "care",
    returnFocusTarget?: HTMLElement | null,
  ): void | Promise<void>;
  onOpenObservation(
    studentId: string,
    returnFocusTarget?: HTMLElement | null,
  ): void | Promise<void>;
}

export function SimpleClassroomScreen({
  summary,
  visibleStudents,
  archivedStudents,
  searchQuery,
  hasActiveSearch,
  openActionsStudentId,
  classAgeBand,
  isBusy = false,
  educationalWritesDisabled = false,
  educationalWriteNotice = null,
  rosterWritesDisabled = false,
  rosterWriteNotice = null,
  getObservationCount,
  getAgeLabel,
  renderAvatar,
  developmentCoverage,
  followupInbox,
  onSearchQueryChange,
  onOpenAddStudent,
  onOpenImport,
  onOpenClassroomSetup,
  onOpenDuties,
  onOpenAttendance,
  onOpenExport,
  onPrepareRoster,
  onOpenProfile,
  onOpenObservation,
  onOpenQuickObservation,
  onToggleStudentActions,
  onArchiveStudent,
  onRestoreStudent,
  onDeleteStudent,
}: SimpleClassroomScreenProps) {
  const rosterNoticeId = rosterWritesDisabled
    ? educationalWritesDisabled
      ? "simple-classroom-write-notice"
      : "simple-classroom-roster-notice"
    : undefined;
  const classAgeBandLabel = classAgeBand
    ? `${classAgeBand.replace("-", "–")} ay sınıf bandı · TYMM`
    : "Sınıf yaş bandı · TYMM";
  return (
    <main className="simple-workspace simple-classroom" aria-labelledby="simple-classroom-title">
      <header className="simple-workspace__hero">
        <h1 id="simple-classroom-title" data-route-heading tabIndex={-1}>Sınıfım</h1>
        <p>{summary.activeStudentCount} çocuk · Gelişim dosyasını açmak için adına dokunun.</p>
      </header>

      {onOpenClassroomSetup ? (
        <button
          type="button"
          className="simple-classroom__setup"
          onClick={onOpenClassroomSetup}
          disabled={isBusy}
        >
          <GearIcon aria-hidden="true" />
          <span>
            <strong>Sınıfı ve eğitim yılını yönet</strong>
            <small>Okul, öğretmen, yaş grubu, program ve çalışma günleri</small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      ) : null}

      {onOpenDuties ? (
        <button
          type="button"
          className="simple-classroom__setup simple-classroom__setup--duties"
          onClick={onOpenDuties}
          disabled={isBusy}
        >
          <CalendarIcon aria-hidden="true" />
          <span>
            <strong>Meyve günü ve haftanın çocuğu</strong>
            <small>Bu haftanın sırasını aç, değiştir veya kilitle</small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      ) : null}

      <div className="simple-classroom__primary-actions">
        <button
          type="button"
          onClick={onOpenAddStudent}
          disabled={isBusy || rosterWritesDisabled}
          aria-describedby={rosterNoticeId}
        >
          <PlusIcon aria-hidden="true" /> Çocuk ekle
        </button>
        {onOpenImport ? <button type="button" onClick={onOpenImport} disabled={isBusy || rosterWritesDisabled} aria-describedby={rosterNoticeId}><DownloadIcon aria-hidden="true" /> Excel'den ekle</button> : null}
      </div>

      {educationalWritesDisabled ? (
        <p id="simple-classroom-write-notice" className="simple-workspace__message" role="status">
          {educationalWriteNotice ?? "Yoklama ve gelişim kaydı için Bugün ekranından eğitim yılını başlatın."}
        </p>
      ) : null}
      {rosterWritesDisabled && !educationalWritesDisabled ? (
        <p id="simple-classroom-roster-notice" className="simple-workspace__message" role="status">
          {rosterWriteNotice ?? "Bu eğitim yılı sona erdi. Çocuk listesini değiştirmek için yeni dönemi hazırlayın."}
        </p>
      ) : null}

      <section className="simple-workspace__section" aria-labelledby="simple-students-title">
        <h2 id="simple-students-title" className="sr-only">Çocuklar</h2>
        <label className="simple-classroom__search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <span className="sr-only">Çocuk ara</span>
          <KeyboardInput
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Çocuk ara"
            autoComplete="off"
          />
        </label>

        {visibleStudents.length === 0 ? (
          <div className="simple-empty-state">
            <div role="status" aria-live="polite" aria-atomic="true">
              <strong>{hasActiveSearch ? "Eşleşen çocuk yok" : "Henüz çocuk eklenmedi"}</strong>
              <p>{hasActiveSearch ? "Arama metnini değiştirin." : "Çocuk ekle düğmesiyle sınıf listenizi oluşturun."}</p>
            </div>
          </div>
        ) : (
          <ul className="simple-student-list">
            {visibleStudents.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className="simple-student-list__profile"
                    onClick={(event) =>
                      void onOpenProfile(student.id, "flow", event.currentTarget)
                    }
                  >
                    {renderAvatar ? renderAvatar(student) : <span className="simple-student-avatar" aria-hidden="true">{student.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>}
                    <span>
                      <strong>{classroomStudentDisplayName(student)}</strong>
                      <small>{student.birthDate ? getAgeLabel(student) : classAgeBandLabel}</small>
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
                      data-student-development-trigger={student.id}
                      onClick={(event) =>
                        void onOpenObservation(student.id, event.currentTarget)
                      }
                      disabled={isBusy || educationalWritesDisabled}
                      aria-label={`${classroomStudentDisplayName(student)} için Maarif gelişim gözlemi ekle`}
                      aria-describedby={educationalWritesDisabled ? "simple-classroom-write-notice" : undefined}
                    >
                      <Pencil1Icon aria-hidden="true" />
                      Gelişim
                    </button>
                    <button
                      type="button"
                      className="simple-student-list__delete-direct"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `"${classroomStudentDisplayName(student)}" adlı öğrenciyi silmek istediğinize emin misiniz?`
                        );
                        if (confirmed) {
                          void onDeleteStudent(student);
                        }
                      }}
                      disabled={isBusy || rosterWritesDisabled}
                      aria-label={`${classroomStudentDisplayName(student)} öğrencisini sil`}
                      title="Öğrenciyi sil"
                      style={{
                        padding: "6px 10px",
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#e11d48",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                        marginLeft: "6px"
                      }}
                    >
                      <TrashIcon aria-hidden="true" />
                      Sil
                    </button>
                  </div>
                </li>
            ))}
          </ul>
        )}
      </section>

      {developmentCoverage ? (
        <details className="simple-classroom__development-coverage">
          <summary>
            <span>
              <strong>Gelişim kapsamı</strong>
              <small>Çocukların kayıt dağılımını gerektiğinde açın</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </summary>
          <div>{developmentCoverage}</div>
        </details>
      ) : null}

      <details className="simple-classroom__operations">
        <summary><DotsHorizontalIcon aria-hidden="true" /> Sınıf işlemleri</summary>
        {onOpenQuickObservation ? (
          <button type="button" className="simple-classroom__attendance"
            disabled={isBusy || educationalWritesDisabled || summary.activeStudentCount === 0}
            onClick={() => void onOpenQuickObservation()}>
            <Pencil1Icon aria-hidden="true" />
            <span><strong>Toplu gözlem</strong><small>Çocukları seçin veya yarım kalan ortak kayda dönün</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        ) : null}
        <div className="simple-classroom__operation-tools">
          <button
            type="button"
            className="simple-classroom__attendance"
            onClick={onOpenAttendance}
            disabled={isBusy || educationalWritesDisabled}
            aria-describedby={educationalWritesDisabled ? "simple-classroom-write-notice" : undefined}
          >
            <ReaderIcon aria-hidden="true" />
            <span>
              <strong>Bugünün yoklaması</strong>
              <small>{summary.attendanceCompleted ? "Tamamlandı" : "Çocuklara dokunarak işaretleyin"}</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" className="simple-classroom__export" onClick={onOpenExport} disabled={isBusy}>
            <DownloadIcon aria-hidden="true" /> Sınıf listesini indir
          </button>
          <p className="simple-classroom__export-hint">Alanları seç · Yazdır · Excel'e çıkar · PDF</p>
        </div>
        {onPrepareRoster && <ClassRosterPurposeActions onPrepare={onPrepareRoster} disabled={isBusy} />}
        {visibleStudents.length > 0 ? (
          <div className="simple-classroom__management">
            <h2>Çocuk bilgileri ve öğrenci silme</h2>
            <ul>
              {visibleStudents.map((student) => {
                const actionsOpen = openActionsStudentId === student.id;
                const actionsId = `simple-student-actions-${student.id}`;
                const missingProfileFields = classroomStudentProfileMissingFields(student);
                return <li key={student.id}>
                  <button
                    type="button"
                    className="simple-classroom__manage-child"
                    onClick={() => onToggleStudentActions(student.id)}
                    aria-label={`${student.name} için diğer işlemler`}
                    aria-expanded={actionsOpen}
                    aria-controls={actionsId}
                  >
                    <span>{classroomStudentDisplayName(student)}</span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                  {actionsOpen ? (
                    <div className="simple-student-list__action-panel" id={actionsId} role="group" aria-label={`${student.name} işlemleri`}>
                      <small>{getObservationCount(student.id)} gözlem · {missingProfileFields.length > 0
                        ? `Eksik: ${missingProfileFields.join(", ")}.`
                        : "Kimlik ve veli iletişim bilgileri tamam."}</small>
                      <div className="simple-student-list__profile-actions">
                        <button
                          type="button"
                          onClick={(event) =>
                            void onOpenProfile(
                              student.id,
                              "details",
                              event.currentTarget,
                            )
                          }
                          disabled={isBusy || rosterWritesDisabled}
                          aria-describedby={rosterNoticeId}
                        >
                          Bilgileri düzenle
                        </button>
                        <button
                          type="button"
                          onClick={(event) =>
                            void onOpenProfile(
                              student.id,
                              "contacts",
                              event.currentTarget,
                            )
                          }
                          disabled={isBusy || rosterWritesDisabled}
                          aria-describedby={rosterNoticeId}
                        >
                          Veli / yakınlar
                        </button>
                        <button
                          type="button"
                          onClick={(event) =>
                            void onOpenProfile(
                              student.id,
                              "care",
                              event.currentTarget,
                            )
                          }
                          disabled={isBusy || rosterWritesDisabled}
                          aria-describedby={rosterNoticeId}
                        >
                          Sağlık / teslim
                        </button>
                      </div>
                      <button
                        className="simple-student-list__archive"
                        type="button"
                        onClick={() => void onArchiveStudent(student.id)}
                        disabled={isBusy || rosterWritesDisabled}
                        aria-describedby={rosterNoticeId}
                        aria-label={`${student.name} öğrencisini sil`}
                      >
                        Öğrenciyi sil
                      </button>
                      <button className="simple-student-list__archive" type="button"
                        onClick={() => void onDeleteStudent(student)} disabled={isBusy || rosterWritesDisabled}
                        aria-label={`${student.name} öğrencisini tamamen sil`}>
                        {studentProfileCopy.permanentlyDeleteStudent}
                      </button>
                    </div>
                  ) : null}
                </li>;
              })}
            </ul>
          </div>
        ) : null}

      {archivedStudents.length > 0 ? (
        <details className="simple-classroom__archive">
          <summary><ArchiveIcon aria-hidden="true" /> Silinen / ayrılan öğrenciler · {archivedStudents.length}</summary>
          <p>Geçmiş kayıtlar ve aile bilgileri korunur. Öğrenciyi aynı dosyasıyla sınıfa geri alabilirsiniz.</p>
          <ul>
            {archivedStudents.map((student) => (
              <li key={student.id}>
                <span>{classroomStudentDisplayName(student)}</span>
                <button
                  type="button"
                  onClick={() => void onRestoreStudent(student.id)}
                  disabled={isBusy || rosterWritesDisabled}
                  aria-describedby={rosterNoticeId}
                  aria-label={`${student.name} çocuğunu sınıfa geri al`}
                >
                  Geri al
                </button>
                <button type="button" onClick={() => void onDeleteStudent(student)}
                  disabled={isBusy || rosterWritesDisabled} aria-label={`${student.name} öğrencisini tamamen sil`}>
                  {studentProfileCopy.permanentlyDeleteStudent}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      </details>
      {followupInbox}
    </main>
  );
}
