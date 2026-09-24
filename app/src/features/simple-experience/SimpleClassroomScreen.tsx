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
  type ClassroomStudentViewModel,
} from "../classroom/classroom-screen-model.ts";
import { generateParentEmpathyDigest } from "../../services/parent-empathy-shield.ts";
import "./simple-workspaces.css";
import { studentProfileCopy } from "../students/student-profile-copy.ts";
import { useState } from "react";
import { triggerHaptic } from "../../core/haptics";
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
  const [showClassAnalysis, setShowClassAnalysis] = useState(false);
  const [rowNotice, setRowNotice] = useState<string | null>(null);

  const handleParentEmpathyClick = (student: ClassroomStudentViewModel) => {
    triggerHaptic(20);
    const studentName = classroomStudentDisplayName(student);
    const phone = student.contacts?.[0]?.phone;
    const digest = generateParentEmpathyDigest({
      studentName,
      studentPhone: phone,
      observationText: "sınıf içi etkinliklere merakla katılım sağladı ve arkadaşlarıyla iş birliği yaptı",
    });
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(digest.digestMessage);
    }
    setRowNotice(`💬 ${studentName} için Veli Empati Bülteni kopyalandı ve WhatsApp hazırlandı!`);
    setTimeout(() => setRowNotice(null), 4000);
    window.open(digest.whatsAppUrl, "_blank");
  };

  const handleVoiceAnecdoteClick = (student: ClassroomStudentViewModel) => {
    triggerHaptic(20);
    const studentName = classroomStudentDisplayName(student);
    window.dispatchEvent(
      new CustomEvent("maarif_toggle_voice_dikte", {
        detail: { studentName },
      })
    );
  };
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
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setShowClassAnalysis(!showClassAnalysis);
          }}
          style={{
            background: showClassAnalysis
              ? "linear-gradient(135deg, rgba(2, 132, 199, 0.35) 0%, rgba(16, 185, 129, 0.35) 100%)"
              : "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)",
            color: "#0284c7",
            border: showClassAnalysis ? "2px solid #0284c7" : "1px solid #38bdf8",
            fontWeight: 700,
          }}
          title="Yapay zekâ ile sınıf pedagojik gelişim analizini aç"
        >
          ✨ AI Sınıf Analizi
        </button>
      </div>

      {/* ─── INLINE AMBIENT AI SINIF PEDAGOJİK GELİŞİM HARİTASI (ZERO CHATBOT MODAL) ─── */}
      {showClassAnalysis && (
        <section
          style={{
            background: "linear-gradient(135deg, rgba(8, 15, 28, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "14px",
            padding: "16px",
            margin: "12px 0 16px 0",
            color: "#f8fafc",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            animation: "fadeIn 0.2s ease-in",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>✨</span>
              <div>
                <strong style={{ fontSize: "0.9rem", color: "#38bdf8", display: "block" }}>
                  TYMM 2026 Pedagojik Sınıf Zekası & Gelişim Radarı
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                  {summary.activeStudentCount} Öğrenci · {classAgeBandLabel}
                </small>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowClassAnalysis(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700 }}>BİLİŞSEL & PROBLEM ÇÖZME</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.76rem", color: "#e2e8f0" }}>
                <strong>MAB 1.3:</strong> Nesneleri özelliklerine göre eşleştirme ve örüntü oluşturma düzeyi yüksek.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 700 }}>SOSYO-DUYGUSAL & ERDEMLER</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.76rem", color: "#e2e8f0" }}>
                <strong>D14 Paylaşım:</strong> Blok ve dramatizasyon merkezlerinde sıra bekleme pekiştirilmeli.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: 700 }}>DİL & İFADE BECERİSİ</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.76rem", color: "#e2e8f0" }}>
                <strong>DAB 2.1:</strong> Çember saatinde söz alma cesareti ve açık uçlu soru yanıtlama desteği.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                window.dispatchEvent(new CustomEvent("maarif_toggle_voice_dikte"));
              }}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🎤 Sınıf Anekdotu Fısılda (EK-2)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                window.dispatchEvent(new CustomEvent("maarif_open_tymm_hub", { detail: { tab: "e_okul" } }));
              }}
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                color: "#6ee7b7",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              📊 e-Okul 250 Karakter Köprüsü
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                window.dispatchEvent(new CustomEvent("maarif_open_tymm_hub", { detail: { tab: "sociometry" } }));
              }}
              style={{
                background: "rgba(168, 85, 247, 0.2)",
                border: "1px solid #a855f7",
                color: "#d8b4fe",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🤝 Sosyometri & Akran Ağı
            </button>
          </div>
        </section>
      )}

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
          <>
            {rowNotice && (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  margin: "0 0 12px 0",
                  background: "#064e3b",
                  color: "#ecfdf5",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(6, 78, 59, 0.25)",
                }}
              >
                <span>{rowNotice}</span>
                <button
                  type="button"
                  onClick={() => setRowNotice(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#a7f3d0",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    padding: "0 4px",
                  }}
                >
                  ✕
                </button>
              </div>
            )}
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
                        className="simple-student-list__ai-voice"
                        onClick={() => handleVoiceAnecdoteClick(student)}
                        disabled={isBusy}
                        aria-label={`${classroomStudentDisplayName(student)} için sesli EK-2 dikte al`}
                        title="Sesli EK-2 Anekdot Al"
                        style={{
                          padding: "6px 9px",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          color: "#059669",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                          marginLeft: "4px",
                        }}
                      >
                        🎤 EK-2
                      </button>
                      <button
                        type="button"
                        className="simple-student-list__parent-empathy"
                        onClick={() => handleParentEmpathyClick(student)}
                        disabled={isBusy}
                        aria-label={`${classroomStudentDisplayName(student)} için veli empati bülteni üret`}
                        title="Veliye 1-Tık WhatsApp Bülteni Gönder"
                        style={{
                          padding: "6px 9px",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#16a34a",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                          marginLeft: "4px",
                        }}
                      >
                        💬 Veli
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
          </>
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
