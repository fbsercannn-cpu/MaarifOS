import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  Cross2Icon,
  DownloadIcon,
  GearIcon,
  HomeIcon,
  Link2Icon,
  LockClosedIcon,
  MagicWandIcon,
  PersonIcon,
  Pencil1Icon,
  PlusIcon,
  QuoteIcon,
  ReaderIcon,
  StarIcon,
  TargetIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  Carousel,
  FlowStack,
  KeyboardInput,
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  useKeyboardInsets,
  useMobileDevice,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  BackupService,
  IndexedDbDataStore,
  OBSERVATION_TAXONOMY_VERSION_V2,
  ageInMonthsOn,
  civilDateInIstanbul,
  type BackupEnvelope,
  type RestoreMode,
} from "./core";
import { createInitialAuthState, deriveWelcomeViewModel, reduceAuthState, type AuthState } from "./auth";
import {
  loadDashboardState,
  persistAttendanceUpdate,
  persistStudentRosterChange,
  type AttendanceStatus,
  type DashboardState,
  type DashboardStudent as Student,
} from "./features/dashboard/dashboard-data";
import {
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
  CURRICULUM_PROGRAM_LABELS,
  type CurriculumProfileSnapshot,
} from "./features/evidence/evidence-flow";
import {
  finalizeQuickObservationDraft,
  loadQuickObservationDraft,
  persistQuickObservationDraft,
  QUICK_OBSERVATION_NEUTRAL_TEMPLATES,
  QUICK_OBSERVATION_CATEGORIES_V2,
  type QuickObservationCategory,
  type QuickObservationDraft,
  type QuickObservationType,
} from "./features/evidence/quick-observation";
import { ensureSpontaneousObservationContext } from "./features/evidence/spontaneous-observation";
import {
  PRESCHOOL_ACTIVITY_AREAS,
  PRESCHOOL_ACTIVITY_SUGGESTIONS,
  type PreschoolActivityArea,
} from "./features/planning/activity-suggestions";
import {
  curriculumFrameworkForProgram,
  loadEvidenceWorkspace,
  type EvidenceActivitySummary,
  type EvidenceObservationSummary,
  type EvidenceWorkspace,
} from "./features/evidence/evidence-workspace";
import {
  CURRICULUM_ASSESSMENT_LEVELS,
  CURRICULUM_TARGET_KIND_LABELS,
  OFFICIAL_STARTER_CATALOG_PROFILES,
  curriculumTargetsForProfile,
  type CurriculumAssessmentLevel,
  type CurriculumAssignmentMode,
  type CurriculumTargetSnapshot,
} from "./features/curriculum/curriculum-catalog";
import {
  loadTodayWorkspace,
  saveClassroomConfiguration,
  setTodayActivityStatus,
  type TodayActivityStatus,
  type TodayWorkspace,
} from "./features/today/today-data";
import type { ClassroomScheduleKind } from "./core/domain/classroom";

const initialStudents: Student[] = [];

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Geldi",
  late: "Geç geldi",
  absent: "Gelmedi",
};

function nextStatus(status: AttendanceStatus): AttendanceStatus {
  if (status === "present") return "late";
  if (status === "late") return "absent";
  return "present";
}

const fallbackDashboardState: DashboardState = {
  students: initialStudents,
  archivedStudents: [],
  observations: [],
  attendanceCompleted: false,
  attendanceCivilDate: civilDateInIstanbul(new Date()),
};

const emptyTodayWorkspace: TodayWorkspace = {
  civilDate: civilDateInIstanbul(new Date()),
  classroom: { status: "not_configured" },
  currentActivity: null,
  planItems: [],
  pendingEvidenceLinks: 0,
  linkedLearningGoalCount: 0,
  datedEvidenceCount: 0,
};

const emptyEvidenceWorkspace: EvidenceWorkspace = {
  civilDate: civilDateInIstanbul(new Date()),
  activities: [],
  pendingObservations: [],
  linkedObservations: [],
};

type ClassroomFormState = {
  classroomName: string;
  academicYearName: string;
  academicYearStart: string;
  academicYearEnd: string;
  ageGroup: string;
  curriculumProgram: string;
  curriculumCatalogLabel: string;
  curriculumCatalogId: string;
  curriculumSourceVersion: string;
  scheduleKind: ClassroomScheduleKind;
  startTime: string;
  endTime: string;
};

type StudentProfileFormState = {
  name: string;
  preferredName: string;
  birthDate: string;
  optionalCode: string;
  enrollmentDate: string;
  homeLanguages: string;
  interests: string;
  strengths: string;
  supportPreferences: string;
};

const currentCivilDate = civilDateInIstanbul(new Date());
const currentCivilYear = Number(currentCivilDate.slice(0, 4));
const currentCivilMonth = Number(currentCivilDate.slice(5, 7));
const currentAcademicStartYear =
  currentCivilMonth >= 9 ? currentCivilYear : currentCivilYear - 1;

const initialClassroomForm: ClassroomFormState = {
  classroomName: "",
  academicYearName: `${currentAcademicStartYear}–${currentAcademicStartYear + 1} Eğitim Yılı`,
  academicYearStart: `${currentAcademicStartYear}-09-01`,
  academicYearEnd: `${currentAcademicStartYear + 1}-08-31`,
  ageGroup: "60–72 ay",
  curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
  curriculumCatalogLabel: "",
  curriculumCatalogId: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.catalogId,
  curriculumSourceVersion: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.sourceVersion,
  scheduleKind: "morning",
  startTime: "08:30",
  endTime: "12:30",
};

const schedulePresets: Record<Exclude<ClassroomScheduleKind, "custom">, Pick<ClassroomFormState, "startTime" | "endTime">> = {
  morning: { startTime: "08:30", endTime: "12:30" },
  afternoon: { startTime: "13:00", endTime: "17:00" },
  full_day: { startTime: "08:30", endTime: "16:30" },
};

const activityStatusLabels: Record<TodayActivityStatus, string> = {
  planned: "Sıradaki",
  in_progress: "Uygulanıyor",
  completed: "Tamamlandı",
};

function compactProgramLabel(program: string | undefined): string {
  if (program === "Türkiye Yüzyılı Maarif Modeli") return "TYMM";
  return program ?? "Program belirtilmedi";
}

function curriculumCatalogDisplayLabel(label: string | undefined): string {
  if (!label) return "Katalog belirtilmedi";
  const normalized = label.toLocaleLowerCase("tr-TR");
  if (normalized.includes("meb-tymm-okul-oncesi-2024")) {
    return "2024 Maarif Modeli başlangıç kataloğu";
  }
  if (normalized.includes("meb-okul-oncesi-egitim-programi-2024")) {
    return "EÇE · 2024 başlangıç kataloğu";
  }
  return label;
}

type AttendanceChange = {
  studentId: string;
  previousStatus: AttendanceStatus;
  nextStatus: AttendanceStatus;
};

type PendingRestore = {
  fileName: string;
  source: string;
  envelope: BackupEnvelope;
};

type EvidenceFlowRequest = {
  activity: EvidenceActivitySummary;
  pendingObservation?: EvidenceObservationSummary;
  initialStudentId?: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function downloadJson(fileName: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatTurkishCivilDate(civilDate: string) {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
  }).format(date);
  return `${dateLabel}, ${weekday.slice(0, 1).toLocaleUpperCase("tr-TR")}${weekday.slice(1)}`;
}

function formatChildAge(birthDate: string | undefined, civilDate: string): string {
  if (!birthDate) return "Yaş bilgisi ekle";
  try {
    const ageMonths = ageInMonthsOn(birthDate, civilDate);
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    return `${years} yaş ${months} ay`;
  } catch {
    return "Yaş hesaplanamadı";
  }
}

function curriculumDisplayLabel(profile: CurriculumProfileSnapshot): string {
  return profile.framework === "meb_2024"
    ? "Okul Öncesi Eğitim Programı — EÇE/2024"
    : "Türkiye Yüzyılı Maarif Modeli";
}

function createFlowHeader(title: string, step: string, onClose: () => void) {
  return (flow: FlowControls) => (
    <div className="d1-flow-header">
      <div>
        <small>{step}</small>
        <strong>{title}</strong>
      </div>
      <button type="button" onClick={onClose} aria-label={`${flow.current.title ?? title} akışını kapat`}>
        <Cross2Icon aria-hidden="true" />
      </button>
    </div>
  );
}

function createQuickObservationHeader(activityTitle: string, onClose: () => void) {
  return (flow: FlowControls) => (
    <div className="quick-observation-header">
      <img
        src="/assets/brand/maarifos-icon-192.png"
        alt=""
        aria-hidden="true"
      />
      <div>
        <strong>Hızlı Gözlem</strong>
        <small>{activityTitle}</small>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={`${flow.current.title ?? "Hızlı Gözlem"} akışını kapat`}
      >
        <Cross2Icon aria-hidden="true" />
      </button>
    </div>
  );
}

type PlanCreationCommand = {
  planId: string;
  activityId: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignmentMode: CurriculumAssignmentMode;
  studentIds: string[];
};

function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  curriculumProfile,
  students,
  onCreate,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
}) {
  const [ids] = useState(() => ({
    planId: crypto.randomUUID(),
    activityId: crypto.randomUUID(),
  }));
  const [planTitle, setPlanTitle] = useState("Günlük öğrenme planı");
  const [activityTitle, setActivityTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [suggestionArea, setSuggestionArea] =
    useState<PreschoolActivityArea>("all");
  const availableTargets = useMemo(
    () => curriculumTargetsForProfile(curriculumProfile),
    [curriculumProfile],
  );
  const [targetQuery, setTargetQuery] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] =
    useState<CurriculumAssignmentMode>("whole-class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visibleTargets = useMemo(() => {
    const query = targetQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return availableTargets;
    return availableTargets.filter((target) =>
      [
        target.referenceCode,
        target.referenceTitle,
        target.domain,
        CURRICULUM_TARGET_KIND_LABELS[target.kind],
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query),
    );
  }, [availableTargets, targetQuery]);
  const selectedTargets = availableTargets.filter((target) =>
    selectedTargetIds.includes(target.id),
  );
  const visibleActivitySuggestions = useMemo(
    () =>
      suggestionArea === "all"
        ? PRESCHOOL_ACTIVITY_SUGGESTIONS
        : PRESCHOOL_ACTIVITY_SUGGESTIONS.filter(
            (suggestion) => suggestion.area === suggestionArea,
          ),
    [suggestionArea],
  );
  const assignedStudentIds =
    assignmentMode === "whole-class"
      ? students.map((student) => student.id)
      : selectedStudentIds;
  const assignmentCount = selectedTargets.length * assignedStudentIds.length;

  const save = async () => {
    if (
      !planTitle.trim() ||
      !activityTitle.trim() ||
      selectedTargets.length === 0 ||
      assignedStudentIds.length === 0 ||
      busy
    ) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({
        ...ids,
        planTitle,
        activityTitle,
        startTime,
        ...(endTime ? { endTime } : {}),
        curriculumTargets: selectedTargets,
        assignmentMode,
        studentIds: assignedStudentIds,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">Bugünün uygulama kaydı</span>
          <h1>Planı sınıfta kullanacağınız kadar açık yazın.</h1>
          <p>Etkinlik kaydedildiğinde başlayacak; gözlem notları doğrudan bu etkinliğe bağlanacak.</p>
        </div>

        <section className="d1-context-card" aria-label="Plan bağlamı">
          <span>{formatTurkishCivilDate(civilDate)}</span>
          <strong>{curriculumDisplayLabel(curriculumProfile)}</strong>
          <small>{curriculumProfile.catalogId} · {curriculumProfile.sourceVersion}</small>
          <em>
            {curriculumProfile.officialCatalogVerified
              ? "Resmî MEB kaynaklarıyla eşleşen kısmi başlangıç kataloğu"
              : "Hedef başlıkları resmî kaynaktan; sınıf katalog kimliği öğretmen beyanı"}
          </em>
        </section>

        <section className="plan-ideas" aria-labelledby="plan-ideas-title">
          <div className="plan-ideas-heading">
            <div>
              <span className="d1-kicker">Oyun temelli fikir havuzu</span>
              <h2 id="plan-ideas-title">Bugün neyi keşfedelim?</h2>
            </div>
            <strong>{PRESCHOOL_ACTIVITY_SUGGESTIONS.length} fikir</strong>
          </div>
          <p>
            Bir başlangıç seçin; etkinlik adını dolduralım. Program hedefini
            aşağıdan öğretmen olarak siz belirlersiniz.
          </p>
          <Carousel
            className="plan-area-carousel"
            contentClassName="plan-area-track"
            ariaLabel="Etkinlik fikir alanları"
          >
            {PRESCHOOL_ACTIVITY_AREAS.map((area) => (
              <button
                type="button"
                key={area.id}
                aria-pressed={suggestionArea === area.id}
                onClick={() => setSuggestionArea(area.id)}
              >
                {area.label}
              </button>
            ))}
          </Carousel>
          <Carousel
            className="plan-suggestion-carousel"
            contentClassName="plan-suggestion-track"
            ariaLabel="Etkinlik fikirleri"
          >
            {visibleActivitySuggestions.map((suggestion) => (
              <button
                type="button"
                className="plan-suggestion"
                key={suggestion.id}
                aria-pressed={activityTitle === suggestion.title}
                onClick={() => {
                  setActivityTitle(suggestion.title);
                  if (planTitle === "Günlük öğrenme planı") {
                    setPlanTitle(`${suggestion.title} planı`);
                  }
                }}
              >
                <StarIcon aria-hidden="true" />
                <strong>{suggestion.title}</strong>
                <small>{suggestion.teacherPrompt}</small>
                <span>Bu fikri kullan</span>
              </button>
            ))}
          </Carousel>
        </section>

        <div className="d1-form">
          <label htmlFor="d1-plan-title">Plan başlığı</label>
          <KeyboardInput
            id="d1-plan-title"
            value={planTitle}
            onChange={(event) => setPlanTitle(event.target.value)}
            autoComplete="off"
          />

          <label htmlFor="d1-activity-title">Etkinlik adı</label>
          <KeyboardInput
            id="d1-activity-title"
            value={activityTitle}
            onChange={(event) => setActivityTitle(event.target.value)}
            placeholder="Örn. Bahçede gölge incelemesi"
            autoComplete="off"
            autoFocus
          />

          <div className="d1-form-grid">
            <label htmlFor="d1-start-time">Başlangıç
              <input
                id="d1-start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label htmlFor="d1-end-time">Bitiş
              <input
                id="d1-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>
        </div>

        <section className="curriculum-picker" aria-labelledby="curriculum-picker-title">
          <div className="curriculum-section-heading">
            <div>
              <span className="d1-kicker">Program omurgası</span>
              <h2 id="curriculum-picker-title">Bu etkinlikte ele alınacak hedefler</h2>
            </div>
            <strong>{selectedTargets.length} seçili</strong>
          </div>
          <KeyboardInput
            value={targetQuery}
            onChange={(event) => setTargetQuery(event.target.value)}
            placeholder="Kod, başlık veya alan ara"
            aria-label="Program hedeflerinde ara"
          />
          <div className="curriculum-target-list" role="group" aria-label="Program hedefleri">
            {visibleTargets.map((target) => {
              const selected = selectedTargetIds.includes(target.id);
              return (
                <button
                  type="button"
                  className={selected ? "curriculum-target is-selected" : "curriculum-target"}
                  aria-pressed={selected}
                  key={target.id}
                  onClick={() =>
                    setSelectedTargetIds((current) =>
                      current.includes(target.id)
                        ? current.filter((id) => id !== target.id)
                        : [...current, target.id],
                    )
                  }
                >
                  <span>
                    <b>{target.referenceCode}</b>
                    <small>{target.domain} · {CURRICULUM_TARGET_KIND_LABELS[target.kind]}</small>
                  </span>
                  <strong>{target.referenceTitle}</strong>
                  <em>{selected ? "Seçildi" : "Seç"}</em>
                </button>
              );
            })}
          </div>
          <p className="catalog-scope-note">
            Bu aşamada görünen liste tam resmî katalog değildir. Her öğenin kaynağı
            kayıtla birlikte saklanır; katalog genişledikçe eski planlar değişmez.
          </p>
        </section>

        <section className="curriculum-picker" aria-labelledby="assignment-title">
          <div className="curriculum-section-heading">
            <div>
              <span className="d1-kicker">Takip kapsamı</span>
              <h2 id="assignment-title">Kimler için planlansın?</h2>
            </div>
          </div>
          <div className="assignment-mode" role="radiogroup" aria-label="Öğrenci kapsamı">
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "whole-class"}
                onChange={() => setAssignmentMode("whole-class")}
              />
              <span><strong>Tüm sınıf</strong><small>Şu anki {students.length} aktif çocuk</small></span>
            </label>
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "selected-students"}
                onChange={() => setAssignmentMode("selected-students")}
              />
              <span><strong>Seçili çocuklar</strong><small>Farklılaştırılmış takip</small></span>
            </label>
          </div>
          {assignmentMode === "selected-students" ? (
            <div className="student-assignment-list" role="group" aria-label="Seçilecek çocuklar">
              {students.map((student) => (
                <label key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={(event) =>
                      setSelectedStudentIds((current) =>
                        event.target.checked
                          ? [...current, student.id]
                          : current.filter((id) => id !== student.id),
                      )
                    }
                  />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="assignment-summary" aria-live="polite">
            <strong>{selectedTargets.length} hedef × {assignedStudentIds.length} çocuk</strong>
            <span>{assignmentCount} planlı takip kaydı açılacak.</span>
            <small>Bu işlem “öğrendi” veya “başardı” kaydı oluşturmaz.</small>
          </div>
        </section>

        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        <button
          className="d1-primary"
          type="button"
          onClick={() => void save()}
          disabled={
            busy ||
            !planTitle.trim() ||
            !activityTitle.trim() ||
            selectedTargets.length === 0 ||
            assignedStudentIds.length === 0
          }
        >
          {busy ? "Kaydediliyor…" : "Planı kaydet ve etkinliği başlat"}
        </button>
      </div>
    </MobileScroll>
  );
}

function PlanCreationFlow({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  curriculumProfile,
  students,
  onCreate,
  onClose,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onClose: () => void;
}) {
  const initial = useMemo<FlowScreen>(
    () => ({
      id: "plan-create",
      title: "Plan oluştur",
      headerHeight: 64,
      header: createFlowHeader("Plan oluştur", "1 / 1", onClose),
      render: () => (
        <PlanCreationScreen
          civilDate={civilDate}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          curriculumProfile={curriculumProfile}
          students={students}
          onCreate={onCreate}
        />
      ),
    }),
    [
      civilDate,
      curriculumProfile,
      defaultEndTime,
      defaultStartTime,
      students,
      onClose,
      onCreate,
    ],
  );

  return <FlowStack initial={initial} />;
}

type EvidenceFlowActions = {
  close: () => void;
  manageChildren: () => void;
  capture: (
    activity: EvidenceActivitySummary,
    input: {
      observationId: string;
      studentId: string;
      rawText: string;
      context?: string;
      childQuote?: string;
      observationType: QuickObservationType;
      categoryIds: QuickObservationCategory[];
      taxonomyVersion: typeof OBSERVATION_TAXONOMY_VERSION_V2;
    },
  ) => Promise<EvidenceObservationSummary>;
  loadDraft: (
    activity: EvidenceActivitySummary,
    studentId: string,
  ) => Promise<QuickObservationDraft | null>;
  saveDraft: (
    activity: EvidenceActivitySummary,
    input: {
      studentId: string;
      rawText: string;
      context?: string;
      childQuote?: string;
      observationType: QuickObservationType;
      categoryIds: QuickObservationCategory[];
      taxonomyVersion: typeof OBSERVATION_TAXONOMY_VERSION_V2;
    },
  ) => Promise<QuickObservationDraft>;
  confirm: (
    observation: EvidenceObservationSummary,
    target: CurriculumTargetSnapshot,
  ) => Promise<void>;
  createDraft: (
    observation: EvidenceObservationSummary,
    teacherAssessmentText: string,
    draftId: string,
    assessmentLevel: CurriculumAssessmentLevel,
    assessmentTargetIds: string[],
  ) => Promise<void>;
};

const quickObservationTypes: Array<{
  id: QuickObservationType;
  label: string;
  icon: typeof Pencil1Icon;
}> = [
  { id: "quick-note", label: "Kısa not", icon: Pencil1Icon },
  { id: "child-quote", label: "Çocuk sözü", icon: QuoteIcon },
  { id: "anecdotal", label: "Anekdot", icon: ReaderIcon },
  { id: "systematic", label: "Sistematik", icon: TargetIcon },
];

const quickObservationCategories: Array<{
  id: QuickObservationCategory;
  label: string;
  tone: "teal" | "amber" | "plum" | "leaf" | "coral";
}> = [
  { id: "language-communication", label: "Dil ve iletişim", tone: "teal" },
  { id: "cognitive-learning", label: "Bilişsel ve öğrenme", tone: "amber" },
  { id: "social-emotional", label: "Sosyal-duygusal", tone: "plum" },
  {
    id: "values-dispositions-participation",
    label: "Değerler, eğilimler ve katılım",
    tone: "coral",
  },
  {
    id: "physical-motor-health",
    label: "Fiziksel, motor ve sağlık",
    tone: "leaf",
  },
  { id: "self-care-daily-life", label: "Öz bakım ve günlük yaşam", tone: "coral" },
  { id: "art-creativity", label: "Sanat ve yaratıcılık", tone: "plum" },
  { id: "play-participation", label: "Oyun ve katılım", tone: "teal" },
  {
    id: "interest-attention-curiosity",
    label: "İlgi, dikkat ve merak",
    tone: "amber",
  },
  { id: "other", label: "Diğer", tone: "leaf" },
];

const quickObservationGuides: Partial<
  Record<QuickObservationCategory, readonly string[]>
> = {
  "language-communication": [
    "Kendi cümlesiyle ne anlattı veya hangi soruyu sordu?",
    "Sohbeti başlatmak ya da sürdürmek için ne yaptı?",
    "Yeni bir sözcüğü hangi bağlamda kullandı?",
  ],
  "cognitive-learning": [
    "Problemi çözerken hangi yolu denedi?",
    "Neleri karşılaştırdı, sıraladı, eşleştirdi veya grupladı?",
    "Tahmini ile gözlemlediği sonuç arasında nasıl bağ kurdu?",
  ],
  "social-emotional": [
    "Duygusunu nasıl ifade etti ve düzenlemek için ne yaptı?",
    "Akranının duygusuna veya isteğine nasıl karşılık verdi?",
    "Bir anlaşmazlığı çözmek için hangi sözü ya da davranışı kullandı?",
  ],
  "values-dispositions-participation": [
    "Sorumluluğu üstlenirken hangi adımları izledi?",
    "Adil paylaşım, saygı veya yardımlaşma hangi davranışta görünür oldu?",
    "Zorlandığında sürdürme isteğini nasıl gösterdi?",
  ],
  "physical-motor-health": [
    "Bedenini, aracını veya malzemeyi nasıl kontrol etti?",
    "Denge, koordinasyon ya da el-göz uyumu hangi anda görüldü?",
    "Sağlık ve güvenlik kuralını kendiliğinden nasıl uyguladı?",
  ],
  "self-care-daily-life": [
    "Günlük işi hangi adımlarla ve ne kadar yardımla tamamladı?",
    "Eşyasını ya da ortamı düzenlemek için ne yaptı?",
    "İhtiyacını fark edip nasıl ifade etti?",
  ],
  "art-creativity": [
    "Malzemeyi alışılmışın dışında nasıl kullandı?",
    "Üretim sürecinde hangi seçimi yaptı ve değiştirdi?",
    "Fikrini ses, hareket, çizgi, renk ya da rolle nasıl anlattı?",
  ],
  "play-participation": [
    "Oyuna nasıl katıldı, rolünü nasıl kurdu veya değiştirdi?",
    "Oyun kuralını akranlarıyla nasıl oluşturdu ya da sürdürdü?",
    "Bir nesneye oyunda hangi yeni anlamı verdi?",
  ],
  "interest-attention-curiosity": [
    "Dikkatini çeken ayrıntıya nasıl yöneldi?",
    "Merakını hangi soru, deneme veya incelemeyle sürdürdü?",
    "Bir deneyime kendiliğinden geri dönmesine ne sebep oldu?",
  ],
  other: [
    "Gözlenebilir olarak ne yaptı veya ne söyledi?",
    "Olay hangi bağlamda ve kimlerle gerçekleşti?",
    "Davranışın öncesinde ve sonrasında ne oldu?",
  ],
};

function studentInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toLocaleUpperCase("tr-TR"))
    .join("");
}

function EvidenceCaptureScreen({
  activity,
  initialStudentId,
  students,
  actions,
}: {
  activity: EvidenceActivitySummary;
  initialStudentId?: string;
  students: Student[];
  actions: EvidenceFlowActions;
}) {
  const eligibleStudents = activity.assignedStudentIds.length > 0
    ? students.filter((student) => activity.assignedStudentIds.includes(student.id))
    : students;
  const [observationId] = useState(() => crypto.randomUUID());
  const [studentId, setStudentId] = useState("");
  const [rawText, setRawText] = useState("");
  const [context, setContext] = useState("");
  const [childQuote, setChildQuote] = useState("");
  const [observationType, setObservationType] =
    useState<QuickObservationType>("quick-note");
  const [categories, setCategories] = useState<QuickObservationCategory[]>([]);
  const [observationGuide, setObservationGuide] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState<
    "ready" | "loading" | "saving" | "saved" | "error"
  >("ready");
  const draftTimerRef = useRef<number | null>(null);
  const draftLoadSequenceRef = useRef(0);
  const finalizedRef = useRef(false);
  const initialSelectionAppliedRef = useRef(false);
  const actionsRef = useRef(actions);
  const draftSnapshotRef = useRef({
    studentId,
    rawText,
    context,
    childQuote,
    observationType,
    categoryIds: categories,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
  });
  const selectedStudent = eligibleStudents.find((student) => student.id === studentId);
  actionsRef.current = actions;
  draftSnapshotRef.current = {
    studentId,
    rawText,
    context,
    childQuote,
    observationType,
    categoryIds: categories,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
  };
  const visibleObservationGuides = useMemo(
    () =>
      categories.length > 0
        ? Array.from(
            new Set(
              categories.flatMap(
                (category) => quickObservationGuides[category] ?? [],
              ),
            ),
          )
        : [
            "Ne yaptı veya ne söyledi?",
            "Hangi yardım ya da ipucuyla sürdürdü?",
            "Akranıyla veya materyalle nasıl etkileşti?",
          ],
    [categories],
  );

  const hasDraftContent = (
    value: Pick<
      typeof draftSnapshotRef.current,
      "rawText" | "context" | "childQuote" | "categoryIds"
    >,
  ) =>
    Boolean(
      value.rawText.trim() ||
      value.context.trim() ||
      value.childQuote.trim() ||
      value.categoryIds.length > 0,
    );

  useEffect(() => {
    if (!studentId || finalizedRef.current || !hasDraftContent(draftSnapshotRef.current)) {
      return;
    }
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    setDraftStatus("saving");
    draftTimerRef.current = window.setTimeout(() => {
      const draft = draftSnapshotRef.current;
      void actionsRef.current
        .saveDraft(activity, draft)
        .then(() => setDraftStatus("saved"))
        .catch(() => setDraftStatus("error"));
      draftTimerRef.current = null;
    }, 450);
    return () => {
      if (draftTimerRef.current !== null) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [activity, categories, childQuote, context, observationType, rawText, studentId]);

  useEffect(
    () => () => {
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
      const draft = draftSnapshotRef.current;
      if (!finalizedRef.current && draft.studentId && hasDraftContent(draft)) {
        void actionsRef.current.saveDraft(activity, draft);
      }
    },
    [activity],
  );

  const chooseStudent = async (nextStudentId: string) => {
    if (nextStudentId === studentId) return;
    const previous = draftSnapshotRef.current;
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    if (previous.studentId && hasDraftContent(previous)) {
      try {
        await actions.saveDraft(activity, previous);
      } catch {
        setDraftStatus("error");
      }
    }

    const loadSequence = draftLoadSequenceRef.current + 1;
    draftLoadSequenceRef.current = loadSequence;
    setStudentId(nextStudentId);
    setRawText("");
    setContext("");
    setChildQuote("");
    setObservationType("quick-note");
    setCategories([]);
    setDraftStatus("loading");
    try {
      const draft = await actions.loadDraft(activity, nextStudentId);
      if (draftLoadSequenceRef.current !== loadSequence) return;
      if (draft) {
        setRawText(draft.rawText);
        setContext(draft.context);
        setChildQuote(draft.childQuote);
        setObservationType(draft.observationType);
        setCategories(
          draft.observationTaxonomyVersion ===
            OBSERVATION_TAXONOMY_VERSION_V2
            ? draft.categoryIds.filter((category) =>
                QUICK_OBSERVATION_CATEGORIES_V2.includes(
                  category as (typeof QUICK_OBSERVATION_CATEGORIES_V2)[number],
                ),
              )
            : [],
        );
        setDraftStatus("saved");
      } else {
        setDraftStatus("ready");
      }
    } catch {
      if (draftLoadSequenceRef.current === loadSequence) setDraftStatus("error");
    }
  };

  useEffect(() => {
    if (
      initialStudentId &&
      !initialSelectionAppliedRef.current &&
      !studentId &&
      eligibleStudents.some((student) => student.id === initialStudentId)
    ) {
      initialSelectionAppliedRef.current = true;
      void chooseStudent(initialStudentId);
    }
  }, [initialStudentId]);

  const toggleCategory = (category: QuickObservationCategory) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const applyStarter = (starter: string) => {
    setRawText((current) => (current.trim() ? `${current.trim()} ${starter}` : starter));
  };

  const save = async () => {
    if (!studentId || !rawText.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.capture(activity, {
        observationId,
        studentId,
        rawText,
        ...(context.trim() ? { context } : {}),
        ...(childQuote.trim() ? { childQuote } : {}),
        observationType,
        categoryIds: categories,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      });
      finalizedRef.current = true;
      actions.close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gözlem notu kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <div className="quick-observation-page">
      <MobileScroll className="d1-flow-scroll quick-observation-scroll">
        <div className="quick-observation-content">
          {eligibleStudents.length === 0 ? (
            <section className="d1-empty-state">
              <strong>Önce sınıfa bir çocuk ekleyin.</strong>
              <p>Gözlem notu yalnız etkin sınıftaki bir çocukla ilişkilendirilebilir.</p>
              <button type="button" onClick={actions.manageChildren}>Sınıfımı aç</button>
            </section>
          ) : (
            <>
            <section className="quick-student-section" aria-labelledby="quick-student-heading">
              <div className="quick-section-heading">
                <div>
                  <h1 id="quick-student-heading">Çocuk seç</h1>
                </div>
                {selectedStudent ? <strong>{selectedStudent.name}</strong> : <small>Zorunlu</small>}
              </div>
              <Carousel
                className="quick-student-strip"
                contentClassName="quick-student-track"
                ariaLabel="Gözlem yapılacak çocuk"
              >
                {eligibleStudents.map((student, index) => {
                  const selected = student.id === studentId;
                  return (
                    <button
                      className={`quick-student-card quick-student-card--tone-${(index % 5) + 1}`}
                      type="button"
                      key={student.id}
                      onClick={() => void chooseStudent(student.id)}
                      aria-pressed={selected}
                      disabled={draftStatus === "loading" || busy}
                    >
                      <span className="quick-student-avatar" aria-hidden="true">
                        {studentInitials(student.name)}
                        {selected ? <CheckCircledIcon /> : null}
                      </span>
                      <span>{student.name}</span>
                    </button>
                  );
                })}
              </Carousel>
            </section>

            <section className="quick-note-card">
              <div className="quick-note-label-row">
                <div>
                  <label id="quick-note-heading" htmlFor="d1-observation-text">Ne oldu?</label>
                </div>
                <small>{rawText.length} / 500</small>
              </div>
              <KeyboardTextarea
                id="d1-observation-text"
                value={rawText}
                onChange={(event) => setRawText(event.target.value.slice(0, 500))}
                placeholder="… sırasında … yaptı / söyledi."
                rows={6}
                aria-describedby="quick-observation-guidance"
              />
              <p id="quick-observation-guidance">
                Gördüğünüz ve duyduğunuz olayı yorum eklemeden yazın.
              </p>
              <Carousel
                className="quick-starter-row"
                contentClassName="quick-starter-track"
                ariaLabel="Tarafsız cümle başlangıçları"
              >
                {QUICK_OBSERVATION_NEUTRAL_TEMPLATES.map((starter) => (
                  <button type="button" key={starter.id} onClick={() => applyStarter(starter.text)}>
                    {starter.text}
                  </button>
                ))}
              </Carousel>
              <Carousel
                className="quick-type-carousel"
                contentClassName="quick-type-grid"
                ariaLabel="Gözlem türleri"
              >
                {quickObservationTypes.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setObservationType(id)}
                    aria-pressed={observationType === id}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </Carousel>
            </section>

            <section className="quick-choice-section" aria-labelledby="quick-category-heading">
              <div className="quick-section-heading quick-section-heading--plain">
                <h2 id="quick-category-heading">Gözlem alanı</h2>
                <small>Birden çok seçilebilir</small>
              </div>
              <Carousel
                className="quick-category-list"
                contentClassName="quick-category-track"
                ariaLabel="Gözlem alanları"
              >
                {quickObservationCategories.map(({ id, label, tone }) => (
                  <button
                    className={`quick-category-chip quick-category-chip--${tone}`}
                    type="button"
                    key={id}
                    onClick={() => toggleCategory(id)}
                    aria-pressed={categories.includes(id)}
                  >
                    <ChatBubbleIcon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </Carousel>
            </section>

            <section className="quick-guide-section" aria-labelledby="quick-guide-heading">
              <div className="quick-section-heading quick-section-heading--plain">
                <div>
                  <span className="d1-kicker">Nötr gözlem istemleri</span>
                  <h2 id="quick-guide-heading">
                    {selectedStudent
                      ? `${selectedStudent.preferredName ?? selectedStudent.name} için neye bakabilirim?`
                      : "Neye bakabilirim?"}
                  </h2>
                </div>
                <small>Olgu cümlesi üretmez</small>
              </div>
              <div className="quick-guide-grid">
                {visibleObservationGuides.map((guide) => (
                  <button
                    type="button"
                    key={guide}
                    aria-pressed={observationGuide === guide}
                    onClick={() => setObservationGuide(guide)}
                  >
                    <MagicWandIcon aria-hidden="true" />
                    <span>{guide}</span>
                  </button>
                ))}
              </div>
              {observationGuide ? (
                <p className="quick-guide-focus" role="status">
                  <TargetIcon aria-hidden="true" />
                  Bakış odağı: <strong>{observationGuide}</strong>
                </p>
              ) : null}
            </section>

            <details className="quick-details">
              <summary>
                <span>
                  <ReaderIcon aria-hidden="true" />
                  <strong>Ayrıntı ekle</strong>
                  <small>Bağlam ve çocuğun sözü</small>
                </span>
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className="quick-details-fields">
                <label htmlFor="d1-observation-context">Bağlam / ne sırasında?</label>
                <KeyboardInput
                  id="d1-observation-context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Örn. Fen merkezinde küçük grup çalışması"
                  autoComplete="off"
                />
                <label htmlFor="d1-observation-quote">Çocuğun sözü</label>
                <KeyboardTextarea
                  id="d1-observation-quote"
                  value={childQuote}
                  onChange={(event) => setChildQuote(event.target.value)}
                  placeholder="Çocuğun kendi cümlesini değiştirmeden yazın."
                  rows={3}
                />
              </div>
            </details>

              {error ? <p className="d1-error" role="alert">{error}</p> : null}
            </>
          )}
        </div>
      </MobileScroll>
      {eligibleStudents.length > 0 ? (
        <div className="quick-save-dock">
          <p>
            <CheckCircledIcon aria-hidden="true" />
            {draftStatus === "loading"
              ? "Taslak yükleniyor"
              : draftStatus === "saving"
                ? "Taslak kaydediliyor"
                : draftStatus === "saved"
                  ? "Taslak bu cihazda korundu"
                  : draftStatus === "error"
                    ? "Taslak kaydedilemedi"
                    : "Not yazmaya hazır"}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !studentId || !rawText.trim()}
          >
            <LockClosedIcon aria-hidden="true" />
            {busy ? "Kaydediliyor…" : "Gözlemi kaydet"}
          </button>
          <small>Program bağı daha sonra tamamlanabilir.</small>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceLinkScreen({
  flow,
  observation,
  actions,
}: {
  flow: FlowControls;
  observation: EvidenceObservationSummary;
  actions: EvidenceFlowActions;
}) {
  const [selectedTargetId, setSelectedTargetId] = useState(
    observation.plannedCurriculumTargets[0]?.id ?? "",
  );
  const [legacyReferenceCode, setLegacyReferenceCode] = useState("");
  const [legacyReferenceTitle, setLegacyReferenceTitle] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedTarget = observation.plannedCurriculumTargets.find(
    (target) => target.id === selectedTargetId,
  );
  const targetForSave: CurriculumTargetSnapshot | undefined =
    selectedTarget ??
    (legacyReferenceCode.trim() && legacyReferenceTitle.trim()
      ? {
          id: `legacy-teacher-declared-${observation.id}`,
          framework: observation.curriculumProfile.framework,
          catalogId: observation.curriculumProfile.catalogId,
          sourceVersion: observation.curriculumProfile.sourceVersion,
          referenceCode: legacyReferenceCode.trim(),
          referenceTitle: legacyReferenceTitle.trim(),
          kind: "learning-outcome",
          domain: "Öğretmen beyanı",
          sourceUrl: "about:blank",
          sourceLabel: "Eski plan kaydı · öğretmen beyanı",
          sourceCheckedOn: observation.civilDate,
          catalogCompleteness: "partial",
          verificationStatus: "teacher-declared-unverified",
          referenceOrigin: "teacher-declared",
          officialCatalogVerified: false,
        }
      : undefined);

  const save = async () => {
    if (!targetForSave || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.confirm(observation, targetForSave);
      flow.replace(createAssessmentScreen(observation, targetForSave, actions));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Program bağlantısı kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">{observation.studentName} · {observation.activityTitle}</span>
          <h1>Program bağlantısı</h1>
          <p>Etkinlikte planladığınız hedeflerden gözlemin doğrudan kanıtladığını seçin.</p>
        </div>

        <blockquote className="d1-observation-quote">{observation.rawText}</blockquote>

        <section className="d1-warning-card">
          <strong>Planlanan hedefle sınırlandırıldı</strong>
          <p>Bağlantı yalnız bu etkinlik için önceden seçilen program hedeflerinden kurulabilir. Son karar öğretmen onayıdır.</p>
          <small>{curriculumDisplayLabel(observation.curriculumProfile)} · {observation.curriculumProfile.sourceVersion}</small>
        </section>

        <div className="d1-form">
          {observation.plannedCurriculumTargets.length > 0 ? (
            <>
              <label htmlFor="d1-reference-target">Program hedefi</label>
              <select
                id="d1-reference-target"
                value={selectedTargetId}
                onChange={(event) => setSelectedTargetId(event.target.value)}
              >
                {observation.plannedCurriculumTargets.map((target) => (
                  <option value={target.id} key={target.id}>
                    {target.referenceCode} · {target.referenceTitle}
                  </option>
                ))}
              </select>
              {selectedTarget ? (
                <section className="selected-target-detail">
                  <span>{selectedTarget.domain} · {CURRICULUM_TARGET_KIND_LABELS[selectedTarget.kind]}</span>
                  <strong>{selectedTarget.referenceTitle}</strong>
                  <small>{selectedTarget.sourceLabel} · {selectedTarget.sourceCheckedOn}</small>
                </section>
              ) : null}
            </>
          ) : (
            <>
              <p className="catalog-scope-note">
                Bu gözlem eski, programsız hedef seçicisiyle oluşturulmuş. Kaydı kaybetmemek için öğretmen beyanı yolu açık tutuluyor.
              </p>
              <label htmlFor="d1-reference-code">Program referans kodu</label>
              <KeyboardInput
                id="d1-reference-code"
                value={legacyReferenceCode}
                onChange={(event) => setLegacyReferenceCode(event.target.value)}
                autoComplete="off"
              />
              <label htmlFor="d1-reference-title">Program öğesi / başlığı</label>
              <KeyboardTextarea
                id="d1-reference-title"
                value={legacyReferenceTitle}
                onChange={(event) => setLegacyReferenceTitle(event.target.value)}
                rows={3}
              />
            </>
          )}
          <label className="d1-confirmation" htmlFor="d1-reference-confirmed">
            <input
              id="d1-reference-confirmed"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>Bu bağlantıyı ben seçtim ve gözlemle ilişkisini onaylıyorum.</span>
          </label>
        </div>

        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        <button
          className="d1-primary"
          type="button"
          onClick={() => void save()}
          disabled={busy || !targetForSave || !confirmed}
        >
          {busy ? "Kaydediliyor…" : "Bağlantıyı onayla"}
        </button>
        <button className="d1-secondary" type="button" onClick={actions.close}>Daha sonra tamamla</button>
      </div>
    </MobileScroll>
  );
}

function AssessmentScreen({
  flow,
  observation,
  target,
  actions,
}: {
  flow: FlowControls;
  observation: EvidenceObservationSummary;
  target: CurriculumTargetSnapshot;
  actions: EvidenceFlowActions;
}) {
  const [draftId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [assessmentLevel, setAssessmentLevel] =
    useState<CurriculumAssessmentLevel>("not_assessed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.createDraft(
        observation,
        text,
        draftId,
        assessmentLevel,
        [target.id],
      );
      flow.replace(createCompletionScreen(observation, actions));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Değerlendirme taslağı kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">{observation.studentName}</span>
          <h1>Kanıta dayalı değerlendirme</h1>
          <p>Değerlendirme cümlesini siz yazarsınız; not, kaynak olarak taslağa bağlanır.</p>
        </div>

        <section className="d1-citation-card">
          <small>1 tarihli gözlem notu</small>
          <blockquote>{observation.rawText}</blockquote>
          <span>{formatTurkishCivilDate(observation.civilDate)} · {observation.activityTitle}</span>
        </section>

        <section className="selected-target-detail">
          <span>{target.referenceCode} · {target.domain}</span>
          <strong>{target.referenceTitle}</strong>
          <small>Değerlendirme yalnız bu seçili hedef ve tarihli kanıta dayanır.</small>
        </section>

        <section className="d1-safety-card">
          <strong>Pedagojik sınır</strong>
          <p>MaarifOS tanı koymaz, çocuğu etiketlemez ve gelişim hükmü üretmez. Bu alan yalnız öğretmenin seçili gözleme dayanan mesleki değerlendirmesidir.</p>
        </section>

        <div className="d1-form">
          <label htmlFor="d1-assessment-level">Dört düzeyli gözlem ölçütü</label>
          <select
            id="d1-assessment-level"
            value={assessmentLevel}
            onChange={(event) =>
              setAssessmentLevel(event.target.value as CurriculumAssessmentLevel)
            }
          >
            {CURRICULUM_ASSESSMENT_LEVELS.map((level) => (
              <option value={level.value} key={level.value}>{level.label}</option>
            ))}
          </select>
          <p className="assessment-level-help">
            {CURRICULUM_ASSESSMENT_LEVELS.find((level) => level.value === assessmentLevel)?.description}
          </p>
          <label htmlFor="d1-assessment-text">Öğretmen değerlendirmesi</label>
          <KeyboardTextarea
            id="d1-assessment-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Bu gözlemin öğrenme süreci açısından ne gösterdiğini, kesin hüküm vermeden yazın."
            rows={7}
            autoFocus
          />
        </div>

        <p className="d1-integrity-note"><ClockIcon aria-hidden="true" /> Tek not sınırlı bir kanıttır; taslak öğretmen incelemesi bekleyecek.</p>
        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        <button className="d1-primary" type="button" onClick={() => void save()} disabled={busy || !text.trim()}>
          {busy ? "Kaydediliyor…" : "İnceleme taslağını oluştur"}
        </button>
      </div>
    </MobileScroll>
  );
}

function CompletionScreen({
  observation,
  actions,
}: {
  observation: EvidenceObservationSummary;
  actions: EvidenceFlowActions;
}) {
  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content d1-completion">
        <span className="d1-completion-icon"><CheckCircledIcon aria-hidden="true" /></span>
        <span className="d1-kicker">Kayıt zinciri tamamlandı</span>
        <h1>{observation.studentName} için taslak hazır.</h1>
        <p>Gözlem notu, öğretmenin onayladığı program bağlantısı ve değerlendirme taslağı birlikte korundu.</p>
        <section className="d1-context-card">
          <strong>Öğretmen incelemesi bekliyor</strong>
          <span>1 gözlem notuna atıf</span>
          <em>Program referansı öğretmen beyanı · resmî katalogda doğrulanmadı</em>
        </section>
        <button className="d1-primary" type="button" onClick={actions.close}>Bugün ekranına dön</button>
      </div>
    </MobileScroll>
  );
}

function createEvidenceLinkScreen(
  observation: EvidenceObservationSummary,
  actions: EvidenceFlowActions,
): FlowScreen {
  return {
    id: `evidence-link-${observation.id}`,
    title: "Program bağlantısı",
    headerHeight: 64,
    header: createFlowHeader("Program bağlantısı", "2 / 3", actions.close),
    render: (flow) => <EvidenceLinkScreen flow={flow} observation={observation} actions={actions} />,
  };
}

function createAssessmentScreen(
  observation: EvidenceObservationSummary,
  target: CurriculumTargetSnapshot,
  actions: EvidenceFlowActions,
): FlowScreen {
  return {
    id: `assessment-${observation.id}`,
    title: "Değerlendirme",
    headerHeight: 64,
    header: createFlowHeader("Değerlendirme", "3 / 3", actions.close),
    render: (flow) => (
      <AssessmentScreen
        flow={flow}
        observation={observation}
        target={target}
        actions={actions}
      />
    ),
  };
}

function createCompletionScreen(
  observation: EvidenceObservationSummary,
  actions: EvidenceFlowActions,
): FlowScreen {
  return {
    id: `complete-${observation.id}`,
    title: "Tamamlandı",
    headerHeight: 64,
    header: createFlowHeader("Kayıt tamamlandı", "Hazır", actions.close),
    render: () => <CompletionScreen observation={observation} actions={actions} />,
  };
}

function EvidenceCaptureFlow({
  activity,
  pendingObservation,
  initialStudentId,
  students,
  actions,
}: {
  activity: EvidenceActivitySummary;
  pendingObservation?: EvidenceObservationSummary;
  initialStudentId?: string;
  students: Student[];
  actions: EvidenceFlowActions;
}) {
  const initial = useMemo<FlowScreen>(
    () =>
      pendingObservation
        ? createEvidenceLinkScreen(pendingObservation, actions)
        : {
            id: `capture-${activity.id}`,
            title: "Gözlem notu",
            headerHeight: 68,
            header: createQuickObservationHeader(activity.title, actions.close),
            render: () => (
              <EvidenceCaptureScreen
                activity={activity}
                initialStudentId={initialStudentId}
                students={students}
                actions={actions}
              />
            ),
          },
    [actions, activity, initialStudentId, pendingObservation, students],
  );

  return <FlowStack initial={initial} />;
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const { device } = useMobileDevice();
  const { bottomInset } = useKeyboardInsets();
  const store = useMemo(() => new IndexedDbDataStore(), []);
  const backupService = useMemo(() => new BackupService(store, { appVersion: "0.1.0" }), [store]);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const dayRefreshInFlightRef = useRef(false);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [attendanceCivilDate, setAttendanceCivilDate] = useState(
    fallbackDashboardState.attendanceCivilDate,
  );
  const [lastAttendanceChange, setLastAttendanceChange] = useState<AttendanceChange | null>(null);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const [studentProfileOpen, setStudentProfileOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfileForm, setStudentProfileForm] =
    useState<StudentProfileFormState>({
      name: "",
      preferredName: "",
      birthDate: "",
      optionalCode: "",
      enrollmentDate: "",
      homeLanguages: "",
      interests: "",
      strengths: "",
      supportPreferences: "",
    });
  const [studentProfileError, setStudentProfileError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [todayWorkspace, setTodayWorkspace] = useState<TodayWorkspace>(emptyTodayWorkspace);
  const [evidenceWorkspace, setEvidenceWorkspace] =
    useState<EvidenceWorkspace>(emptyEvidenceWorkspace);
  const [planFlowOpen, setPlanFlowOpen] = useState(false);
  const [evidenceFlowRequest, setEvidenceFlowRequest] =
    useState<EvidenceFlowRequest | null>(null);
  const [classroomForm, setClassroomForm] = useState<ClassroomFormState>(initialClassroomForm);
  const [classroomError, setClassroomError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState("Bu cihazdaki veriler hazırlanıyor.");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandaloneApp());
  const [installStatus, setInstallStatus] = useState(() =>
    isStandaloneApp()
      ? "MaarifOS bu cihazda uygulama olarak çalışıyor."
      : "Windows, Android ve iPhone ana ekranına kurulabilir.",
  );
  const [authState, setAuthState] = useState<AuthState>(() =>
    createInitialAuthState({
      network: navigator.onLine ? "online" : "offline",
      googleReadiness: "coming_soon",
    }),
  );
  const [activeNav, setActiveNav] = useState("today");
  const [announcement, setAnnouncement] = useState("MaarifOS hazır.");
  const authView = useMemo(() => deriveWelcomeViewModel(authState), [authState]);

  const counts = useMemo(
    () => ({
      present: students.filter((student) => student.status === "present").length,
      late: students.filter((student) => student.status === "late").length,
      absent: students.filter((student) => student.status === "absent").length,
    }),
    [students],
  );
  const configuredClassroom = todayWorkspace.classroom.status === "configured"
    ? todayWorkspace.classroom
    : null;
  const currentActivity = todayWorkspace.currentActivity;
  const focusActivity = currentActivity
    ?? todayWorkspace.planItems.find((item) => item.status === "planned")
    ?? todayWorkspace.planItems[0]
    ?? null;
  const selectedProfileStudent =
    students.find((student) => student.id === selectedStudentId) ??
    archivedStudents.find((student) => student.id === selectedStudentId) ??
    null;
  const selectedStudentObservations = selectedStudentId
    ? [
        ...evidenceWorkspace.pendingObservations,
        ...evidenceWorkspace.linkedObservations,
      ].filter((observation) => observation.studentId === selectedStudentId)
    : [];
  const selectedStudentPendingLinks = selectedStudentObservations.filter(
    (observation) => observation.confirmedCurriculumLinkIds.length === 0,
  ).length;
  const observationCountByStudent = useMemo(() => {
    const countsByStudent = new Map<string, number>();
    for (const observation of [
      ...evidenceWorkspace.pendingObservations,
      ...evidenceWorkspace.linkedObservations,
    ]) {
      countsByStudent.set(
        observation.studentId,
        (countsByStudent.get(observation.studentId) ?? 0) + 1,
      );
    }
    return countsByStudent;
  }, [
    evidenceWorkspace.linkedObservations,
    evidenceWorkspace.pendingObservations,
  ]);

  const shellStyle = {
    "--app-safe-top": `max(env(safe-area-inset-top, 0px), ${device.geometry.safeArea.top}px)`,
    "--app-bottom-inset": `max(env(safe-area-inset-bottom, 0px), ${bottomInset}px)`,
  } as CSSProperties;

  const enqueuePersistence = (operation: () => Promise<void>) => {
    const queued = persistenceQueueRef.current.then(operation, operation);
    persistenceQueueRef.current = queued.catch(() => undefined);
    return queued;
  };

  const refreshD1Workspaces = async () => {
    const [today, evidence] = await Promise.all([
      loadTodayWorkspace(store),
      loadEvidenceWorkspace(store),
    ]);
    setTodayWorkspace(today);
    setEvidenceWorkspace(evidence);
    return { today, evidence };
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadDashboardState(store, fallbackDashboardState),
      loadTodayWorkspace(store),
      loadEvidenceWorkspace(store),
    ])
      .then(([state, workspace, evidence]) => {
        if (cancelled) return;
        setStudents(state.students);
        setArchivedStudents(state.archivedStudents);
        setAttendanceCompleted(state.attendanceCompleted);
        setAttendanceCivilDate(state.attendanceCivilDate);
        setTodayWorkspace(workspace);
        setEvidenceWorkspace(evidence);
        if (workspace.classroom.status === "configured") {
          const classroom = workspace.classroom;
          setClassroomForm((current) => ({
            ...current,
            classroomName: classroom.classroomName,
            academicYearName: classroom.academicYearName,
            academicYearStart: classroom.academicYearStart,
            academicYearEnd: classroom.academicYearEnd,
            ageGroup: classroom.ageGroup ?? current.ageGroup,
            curriculumProgram: classroom.curriculumProgram ?? current.curriculumProgram,
            curriculumCatalogLabel:
              classroom.curriculumCatalogLabel ?? current.curriculumCatalogLabel,
            curriculumCatalogId:
              classroom.curriculumProfile?.catalogId ?? "",
            curriculumSourceVersion:
              classroom.curriculumProfile?.sourceVersion ?? "",
            scheduleKind: classroom.schedule.kind,
            startTime: classroom.schedule.startTime,
            endTime: classroom.schedule.endTime,
          }));
        } else {
          setClassroomOpen(true);
        }
        setDataHydrated(true);
        setDataStatus("Veriler bu cihazda saklanıyor · çevrimdışı çalışır");
      })
      .catch(() => {
        if (cancelled) return;
        setDataStatus("Cihazdaki veriler açılamadı. Yedeğinizi kontrol edip yeniden deneyin.");
        setAnnouncement("Cihazdaki veriler açılamadı.");
      });
    return () => {
      cancelled = true;
      store.close();
    };
  }, [store]);

  useEffect(() => {
    if (!dataHydrated) return;
    let cancelled = false;
    const refreshCivilDay = async () => {
      const currentCivilDate = civilDateInIstanbul(new Date());
      if (currentCivilDate === attendanceCivilDate || dayRefreshInFlightRef.current) return;
      dayRefreshInFlightRef.current = true;
      try {
        await persistenceQueueRef.current;
        const [refreshed, refreshedWorkspace, refreshedEvidence] = await Promise.all([
          loadDashboardState(store, {
            ...fallbackDashboardState,
            attendanceCivilDate: currentCivilDate,
          }),
          loadTodayWorkspace(store, { now: new Date() }),
          loadEvidenceWorkspace(store, { now: new Date() }),
        ]);
        if (cancelled) return;
        setStudents(refreshed.students);
        setArchivedStudents(refreshed.archivedStudents);
        setAttendanceCompleted(refreshed.attendanceCompleted);
        setAttendanceCivilDate(refreshed.attendanceCivilDate);
        setTodayWorkspace(refreshedWorkspace);
        setEvidenceWorkspace(refreshedEvidence);
        setLastAttendanceChange(null);
        setAnnouncement("Yeni İstanbul takvim günü açıldı; önceki yoklama geçmişte korundu.");
      } catch {
        if (!cancelled) setAnnouncement("Yeni gün verileri açılamadı. Lütfen uygulamayı yeniden açın.");
      } finally {
        dayRefreshInFlightRef.current = false;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshCivilDay();
    };
    const timer = window.setInterval(() => void refreshCivilDay(), 30_000);
    window.addEventListener("focus", refreshCivilDay);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshCivilDay);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [attendanceCivilDate, dataHydrated, store]);

  useEffect(() => {
    const updateNetwork = () => {
      setAuthState((current) =>
        reduceAuthState(current, {
          type: "NETWORK_CHANGED",
          network: navigator.onLine ? "online" : "offline",
        }),
      );
    };
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setInstallStatus("Hazır · bu cihaza tek dokunuşla kurabilirsiniz.");
    };
    const markInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
      setInstallStatus("MaarifOS bu cihazda uygulama olarak çalışıyor.");
      setAnnouncement("MaarifOS bu cihaza kuruldu.");
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const installApp = async () => {
    if (standalone) {
      setAnnouncement("MaarifOS zaten uygulama olarak açık.");
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") {
        setInstallStatus("Kurulum kabul edildi · uygulama listenizde görünecek.");
        setAnnouncement("MaarifOS kurulumu kabul edildi.");
      } else {
        setInstallStatus("Kurulum ertelendi; istediğiniz zaman yeniden deneyebilirsiniz.");
        setAnnouncement("Kurulum ertelendi.");
      }
      return;
    }

    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const message = isiOS
      ? "Safari’de Paylaş düğmesine, ardından Ana Ekrana Ekle’ye dokunun."
      : "Tarayıcı menüsünden Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın.";
    setInstallStatus(message);
    setAnnouncement(message);
  };

  const createBackup = async (prefix = "maarifos-backup") => {
    setDataBusy(true);
    try {
      await persistenceQueueRef.current;
      const envelope = await backupService.exportBackup();
      await backupService.parseAndVerifyBackup(envelope);
      downloadJson(`${prefix}-${envelope.manifest.civilDate}.json`, backupService.serializeBackup(envelope));
      setDataStatus(`Yedek doğrulandı · ${envelope.manifest.civilDate}`);
      setAnnouncement("MaarifOS yedeği oluşturuldu.");
      return envelope;
    } catch {
      setDataStatus("Yedek oluşturulamadı. Cihaz depolamasını kontrol edin.");
      setAnnouncement("Yedek oluşturulamadı.");
      return null;
    } finally {
      setDataBusy(false);
    }
  };

  const inspectRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    setDataBusy(true);
    setPendingRestore(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("large");
      const source = await file.text();
      const envelope = await backupService.parseAndVerifyBackup(source);
      setPendingRestore({ fileName: file.name, source, envelope });
      setDataStatus("Yedek bütünlük kontrolünü geçti. Geri yükleme modunu seçin.");
    } catch {
      setDataStatus("Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor.");
      setAnnouncement("Yedek dosyası doğrulanamadı.");
    } finally {
      setDataBusy(false);
      if (restoreFileRef.current) restoreFileRef.current.value = "";
    }
  };

  const confirmRestore = async (mode: RestoreMode) => {
    if (!pendingRestore) return;
    setDataBusy(true);
    try {
      await persistenceQueueRef.current;
      const safety = await backupService.exportBackup();
      downloadJson(
        `maarifos-geri-yukleme-oncesi-${safety.manifest.civilDate}.json`,
        backupService.serializeBackup(safety),
      );
      const report = await backupService.restoreBackup(pendingRestore.source, { mode });
      const [restored, restoredWorkspace, restoredEvidence] = await Promise.all([
        loadDashboardState(store, fallbackDashboardState),
        loadTodayWorkspace(store),
        loadEvidenceWorkspace(store),
      ]);
      setStudents(restored.students);
      setArchivedStudents(restored.archivedStudents);
      setAttendanceCompleted(restored.attendanceCompleted);
      setAttendanceCivilDate(restored.attendanceCivilDate);
      setLastAttendanceChange(null);
      setTodayWorkspace(restoredWorkspace);
      setEvidenceWorkspace(restoredEvidence);
      if (restoredWorkspace.classroom.status === "configured") {
        const classroom = restoredWorkspace.classroom;
        setClassroomForm((current) => ({
          ...current,
          classroomName: classroom.classroomName,
          academicYearName: classroom.academicYearName,
          academicYearStart: classroom.academicYearStart,
          academicYearEnd: classroom.academicYearEnd,
          ageGroup: classroom.ageGroup ?? current.ageGroup,
          curriculumProgram: classroom.curriculumProgram ?? current.curriculumProgram,
          curriculumCatalogLabel:
            classroom.curriculumCatalogLabel ?? current.curriculumCatalogLabel,
          curriculumCatalogId: classroom.curriculumProfile?.catalogId ?? "",
          curriculumSourceVersion: classroom.curriculumProfile?.sourceVersion ?? "",
          scheduleKind: classroom.schedule.kind,
          startTime: classroom.schedule.startTime,
          endTime: classroom.schedule.endTime,
        }));
      }
      setPendingRestore(null);
      setDataStatus(
        `Geri yükleme tamamlandı · ${report.inserted} eklendi, ${report.skipped} aynı kayıt atlandı, ${report.conflicts.length} çakışma`,
      );
      setAnnouncement("Yedek başarıyla geri yüklendi.");
    } catch {
      setDataStatus("Geri yükleme tamamlanamadı; mevcut veriler korunuyor.");
      setAnnouncement("Geri yükleme başarısız oldu.");
    } finally {
      setDataBusy(false);
    }
  };

  const updateStudentStatus = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    const status = nextStatus(student.status);
    setStudents((current) =>
      current.map((item) => (item.id === studentId ? { ...item, status } : item)),
    );
    setLastAttendanceChange({
      studentId,
      previousStatus: student.status,
      nextStatus: status,
    });
    setAttendanceCompleted(false);
    setAnnouncement(`${student.name}: ${statusLabels[status]}.`);
    void enqueuePersistence(() =>
      persistAttendanceUpdate(store, {
        students: [{ ...student, status }],
        attendanceCivilDate,
        attendanceCompleted: false,
      }),
    ).catch(() => {
      setDataStatus("Devam değişikliği bu cihaza kaydedilemedi.");
      setAnnouncement("Yoklama değişikliği kaydedilemedi.");
    });
  };

  const undoAttendanceChange = () => {
    if (!lastAttendanceChange) return;
    const student = students.find((item) => item.id === lastAttendanceChange.studentId);
    setStudents((current) =>
      current.map((item) =>
        item.id === lastAttendanceChange.studentId
          ? { ...item, status: lastAttendanceChange.previousStatus }
          : item,
      ),
    );
    setAttendanceCompleted(false);
    setLastAttendanceChange(null);
    setAnnouncement(
      `${student?.name ?? "Çocuk"} için ${statusLabels[lastAttendanceChange.nextStatus]} değişikliği geri alındı.`,
    );
    if (student) {
      void enqueuePersistence(() =>
        persistAttendanceUpdate(store, {
          students: [{ ...student, status: lastAttendanceChange.previousStatus }],
          attendanceCivilDate,
          attendanceCompleted: false,
        }),
      ).catch(() => {
        setDataStatus("Geri alma işlemi bu cihaza kaydedilemedi.");
        setAnnouncement("Geri alma işlemi kaydedilemedi.");
      });
    }
  };

  const completeAttendance = async () => {
    setDataBusy(true);
    try {
      await persistenceQueueRef.current;
      await enqueuePersistence(() =>
        persistAttendanceUpdate(store, {
          students: [],
          attendanceCivilDate,
          attendanceCompleted: true,
        }),
      );
      setAttendanceCompleted(true);
      setLastAttendanceChange(null);
      keyboard.hide();
      setAttendanceOpen(false);
      setAnnouncement(`Yoklama tamamlandı. ${counts.present} geldi, ${counts.late} geç, ${counts.absent} yok.`);
    } catch {
      setDataStatus("Devam durumu bu cihaza kaydedilemedi; ekran açık bırakıldı.");
      setAnnouncement("Yoklama kaydedilemedi. Lütfen yeniden deneyin.");
    } finally {
      setDataBusy(false);
    }
  };

  const addStudent = async () => {
    const name = newStudentName.trim();
    if (!name) return;
    const student: Student = { id: crypto.randomUUID(), name, status: "present" };
    setDataBusy(true);
    try {
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: false }));
      setStudents((current) => [...current, student]);
      setNewStudentName("");
      setAnnouncement(`${name} sınıfa eklendi.`);
    } catch {
      setAnnouncement("Çocuk eklenemedi; mevcut kayıtlar korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const openStudentProfile = (studentId: string) => {
    const student =
      students.find((item) => item.id === studentId) ??
      archivedStudents.find((item) => item.id === studentId);
    if (!student) {
      setAnnouncement("Çocuk profili açılamadı.");
      return;
    }
    keyboard.hide();
    setSelectedStudentId(student.id);
    setStudentProfileForm({
      name: student.name,
      preferredName: student.preferredName ?? "",
      birthDate: student.birthDate ?? "",
      optionalCode: student.optionalCode ?? "",
      enrollmentDate: student.enrollmentDate ?? "",
      homeLanguages: student.homeLanguages ?? "",
      interests: student.interests ?? "",
      strengths: student.strengths ?? "",
      supportPreferences: student.supportPreferences ?? "",
    });
    setStudentProfileError("");
    setChildrenOpen(false);
    setStudentProfileOpen(true);
    setAnnouncement(`${student.name} profili açıldı.`);
  };

  const saveStudentProfile = async () => {
    if (!selectedProfileStudent || dataBusy) return;
    const updatedStudent: Student = {
      ...selectedProfileStudent,
      name: studentProfileForm.name,
      ...(studentProfileForm.preferredName.trim()
        ? { preferredName: studentProfileForm.preferredName }
        : {}),
      ...(studentProfileForm.birthDate
        ? { birthDate: studentProfileForm.birthDate }
        : {}),
      ...(studentProfileForm.optionalCode.trim()
        ? { optionalCode: studentProfileForm.optionalCode }
        : {}),
      ...(studentProfileForm.enrollmentDate
        ? { enrollmentDate: studentProfileForm.enrollmentDate }
        : {}),
      ...(studentProfileForm.homeLanguages.trim()
        ? { homeLanguages: studentProfileForm.homeLanguages }
        : {}),
      ...(studentProfileForm.interests.trim()
        ? { interests: studentProfileForm.interests }
        : {}),
      ...(studentProfileForm.strengths.trim()
        ? { strengths: studentProfileForm.strengths }
        : {}),
      ...(studentProfileForm.supportPreferences.trim()
        ? { supportPreferences: studentProfileForm.supportPreferences }
        : {}),
    };
    if (!studentProfileForm.preferredName.trim()) {
      delete updatedStudent.preferredName;
    }
    if (!studentProfileForm.birthDate) delete updatedStudent.birthDate;
    if (!studentProfileForm.optionalCode.trim()) delete updatedStudent.optionalCode;
    if (!studentProfileForm.enrollmentDate) delete updatedStudent.enrollmentDate;
    if (!studentProfileForm.homeLanguages.trim()) delete updatedStudent.homeLanguages;
    if (!studentProfileForm.interests.trim()) delete updatedStudent.interests;
    if (!studentProfileForm.strengths.trim()) delete updatedStudent.strengths;
    if (!studentProfileForm.supportPreferences.trim()) {
      delete updatedStudent.supportPreferences;
    }

    setDataBusy(true);
    setStudentProfileError("");
    try {
      await enqueuePersistence(() =>
        persistStudentRosterChange(store, {
          student: updatedStudent,
          archived: archivedStudents.some(
            (student) => student.id === updatedStudent.id,
          ),
        }),
      );
      setStudents((current) =>
        current.map((student) =>
          student.id === updatedStudent.id ? updatedStudent : student,
        ),
      );
      setArchivedStudents((current) =>
        current.map((student) =>
          student.id === updatedStudent.id ? updatedStudent : student,
        ),
      );
      keyboard.hide();
      setStudentProfileOpen(false);
      setAnnouncement(`${updatedStudent.name} profili kaydedildi.`);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Çocuk profili kaydedilemedi.";
      setStudentProfileError(message);
      setAnnouncement("Çocuk profili kaydedilemedi; mevcut kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const archiveStudent = async (studentId: string) => {
    if (students.length <= 1) {
      setAnnouncement("Sınıfta en az bir çocuk kalmalı.");
      return;
    }
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    setDataBusy(true);
    try {
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: true }));
      const remaining = students.filter((item) => item.id !== studentId);
      setStudents(remaining);
      setArchivedStudents((current) => [...current.filter((item) => item.id !== studentId), student]);
      setAnnouncement(`${student.name} sınıftan ayrıldı; geçmiş kayıtları korundu.`);
    } catch {
      setAnnouncement("Çocuk sınıftan ayrılamadı; mevcut kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const restoreStudent = async (studentId: string) => {
    const student = archivedStudents.find((item) => item.id === studentId);
    if (!student) return;
    setDataBusy(true);
    try {
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: false }));
      setArchivedStudents((current) => current.filter((item) => item.id !== studentId));
      setStudents((current) => [...current.filter((item) => item.id !== studentId), student]);
      setAnnouncement(`${student.name} sınıfa geri alındı.`);
    } catch {
      setAnnouncement("Çocuk sınıfa geri alınamadı; geçmiş kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const saveClassroom = async () => {
    setDataBusy(true);
    setClassroomError("");
    try {
      const framework = curriculumFrameworkForProgram(classroomForm.curriculumProgram);
      const officialStarterProfile = OFFICIAL_STARTER_CATALOG_PROFILES[framework];
      const usesOfficialStarterProfile =
        classroomForm.curriculumCatalogId.trim() ===
          officialStarterProfile.catalogId &&
        classroomForm.curriculumSourceVersion.trim() ===
          officialStarterProfile.sourceVersion;
      const curriculumProfile: CurriculumProfileSnapshot = {
        framework,
        programLabel: CURRICULUM_PROGRAM_LABELS[framework],
        catalogId: classroomForm.curriculumCatalogId,
        sourceVersion: classroomForm.curriculumSourceVersion,
        referenceOrigin: usesOfficialStarterProfile
          ? "official-catalog"
          : "teacher-declared",
        officialCatalogVerified: usesOfficialStarterProfile,
      };
      const context = await saveClassroomConfiguration(store, {
        academicYear: {
          id: configuredClassroom?.academicYearId,
          name: classroomForm.academicYearName,
          startDate: classroomForm.academicYearStart,
          endDate: classroomForm.academicYearEnd,
        },
        classroom: {
          id: configuredClassroom?.classroomId,
          name: classroomForm.classroomName,
          ageGroup: classroomForm.ageGroup,
          curriculumProgram: classroomForm.curriculumProgram,
          curriculumCatalogLabel:
            `${classroomForm.curriculumCatalogId.trim()} · ${classroomForm.curriculumSourceVersion.trim()}`,
          curriculumProfile,
        },
        schedule: {
          kind: classroomForm.scheduleKind,
          startTime: classroomForm.startTime,
          endTime: classroomForm.endTime,
        },
      });
      const refreshed = await refreshD1Workspaces();
      setClassroomOpen(false);
      setAnnouncement(
        refreshed.today.classroom.status === "configured"
          ? `${refreshed.today.classroom.classroomName} çalışma düzeni kaydedildi.`
          : context.status === "configured"
            ? `${context.classroomName} çalışma düzeni kaydedildi.`
          : "Sınıf çalışma düzeni kaydedildi.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sınıf ayarları kaydedilemedi.";
      setClassroomError(message);
      setAnnouncement("Sınıf ayarları kaydedilemedi.");
    } finally {
      setDataBusy(false);
    }
  };

  const chooseScheduleKind = (kind: ClassroomScheduleKind) => {
    const preset = kind === "custom" ? null : schedulePresets[kind];
    setClassroomForm((current) => ({
      ...current,
      scheduleKind: kind,
      ...(preset ?? {}),
    }));
  };

  const completeCurrentActivity = async () => {
    if (!currentActivity) return;
    setDataBusy(true);
    try {
      await setTodayActivityStatus(store, currentActivity.id, "completed");
      await refreshD1Workspaces();
      setAnnouncement(`${currentActivity.title} tamamlandı.`);
    } catch {
      setAnnouncement("Etkinlik durumu kaydedilemedi; mevcut kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const closeD1Flow = () => {
    keyboard.hide();
    setPlanFlowOpen(false);
    setEvidenceFlowRequest(null);
    setActiveNav("today");
  };

  const openPlanFlow = () => {
    if (!configuredClassroom) {
      setClassroomOpen(true);
      setAnnouncement("Plan oluşturmadan önce sınıfınızı kurun.");
      return;
    }
    if (!configuredClassroom.curriculumProfile) {
      setClassroomOpen(true);
      setAnnouncement("Plan için program katalog kimliği ve kaynak sürümünü tamamlayın.");
      return;
    }
    setPlansOpen(false);
    setPlanFlowOpen(true);
  };

  const openActivityEvidence = async (
    activityId: string,
    initialStudentId?: string,
  ) => {
    const selected = evidenceWorkspace.activities.find((item) => item.id === activityId);
    if (!selected) {
      setAnnouncement("Etkinliğin kanıt bağlantısı açılamadı; planı yeniden kontrol edin.");
      return;
    }
    setDataBusy(true);
    try {
      if (selected.status === "planned") {
        await setTodayActivityStatus(store, selected.id, "in_progress");
      }
      const refreshed = await refreshD1Workspaces();
      const activity = refreshed.evidence.activities.find((item) => item.id === selected.id);
      if (!activity) throw new Error("Etkinlik yeniden yüklenemedi.");
      setPlansOpen(false);
      setEvidenceFlowRequest({
        activity,
        ...(initialStudentId ? { initialStudentId } : {}),
      });
      setAnnouncement(`${activity.title} için gözlem notu açıldı.`);
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error ? reason.message : "Etkinlik başlatılamadı; mevcut kayıt korundu.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const openStudentObservation = async (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      setAnnouncement("Hızlı gözlem yalnız sınıftaki etkin çocuk için açılabilir.");
      return;
    }
    if (!configuredClassroom?.curriculumProfile) {
      setClassroomOpen(true);
      setAnnouncement("Hızlı gözlem için önce sınıf ve program kurulumunu tamamlayın.");
      return;
    }

    const activeActivity =
      evidenceWorkspace.activities.find(
        (activity) =>
          activity.status === "in_progress" &&
          (activity.assignedStudentIds.length === 0 ||
            activity.assignedStudentIds.includes(studentId)),
      ) ??
      evidenceWorkspace.activities.find(
        (activity) =>
          activity.status === "planned" &&
          (activity.assignedStudentIds.length === 0 ||
            activity.assignedStudentIds.includes(studentId)),
      );
    if (activeActivity) {
      setStudentProfileOpen(false);
      setChildrenOpen(false);
      await openActivityEvidence(activeActivity.id, studentId);
      return;
    }

    setDataBusy(true);
    setStudentProfileError("");
    try {
      const context = await ensureSpontaneousObservationContext(store, {
        studentId,
        civilDate: attendanceCivilDate,
      });
      const refreshed = await refreshD1Workspaces();
      const activity = refreshed.evidence.activities.find(
        (item) => item.id === context.activity.id,
      );
      if (!activity) {
        throw new Error("Anlık gözlem bağlamı yeniden açılamadı.");
      }
      keyboard.hide();
      setStudentProfileOpen(false);
      setChildrenOpen(false);
      setPlansOpen(false);
      setEvidenceFlowRequest({ activity, initialStudentId: studentId });
      setAnnouncement(`${student.name} için anlık gözlem hazır.`);
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Anlık gözlem açılamadı; mevcut kayıtlar korundu.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const openCaptureEntry = () => {
    const active =
      evidenceWorkspace.activities.find((item) => item.status === "in_progress") ??
      evidenceWorkspace.activities.find((item) => item.status === "planned");
    if (active) {
      void openActivityEvidence(active.id);
      return;
    }
    openPlanFlow();
  };

  const openPendingObservation = () => {
    const pending = evidenceWorkspace.pendingObservations[0];
    if (!pending) {
      setAnnouncement("Program bağlantısı bekleyen gözlem notu yok.");
      return;
    }
    const activity = evidenceWorkspace.activities.find(
      (item) => item.id === pending.activityId,
    ) ?? {
      id: pending.activityId,
      planId: pending.planId,
      title: pending.activityTitle,
      startTime: "00:00",
      status: "completed" as const,
      civilDate: pending.civilDate,
      curriculumProfile: pending.curriculumProfile,
      curriculumTargets: pending.plannedCurriculumTargets,
      assignedStudentIds: [pending.studentId],
      assignmentMode: "legacy-unscoped" as const,
    };
    setEvidenceFlowRequest({ activity, pendingObservation: pending });
  };

  const createPlanAndStart = async (command: PlanCreationCommand) => {
    if (!configuredClassroom?.curriculumProfile) {
      throw new Error("Sınıfın program profili tamamlanmalıdır.");
    }
    const result = await createPlanWithActivity(store, {
      civilDate: todayWorkspace.civilDate,
      ...command,
      curriculumProfile: configuredClassroom.curriculumProfile,
    });
    await setTodayActivityStatus(store, result.activity.id, "in_progress");
    const refreshed = await refreshD1Workspaces();
    const activity = refreshed.evidence.activities.find(
      (item) => item.id === result.activity.id,
    );
    if (!activity) throw new Error("Kaydedilen etkinlik yeniden açılamadı.");
    setPlanFlowOpen(false);
    setEvidenceFlowRequest({ activity });
    setAnnouncement(`${activity.title} başladı. İlk gözlem notunu ekleyebilirsiniz.`);
  };

  const evidenceFlowActions: EvidenceFlowActions = {
    close: closeD1Flow,
    manageChildren: () => {
      closeD1Flow();
      setChildrenOpen(true);
    },
    loadDraft: (activity, studentId) =>
      loadQuickObservationDraft(store, {
        studentId,
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      }),
    saveDraft: (activity, input) =>
      persistQuickObservationDraft(store, {
        ...input,
        planId: activity.planId,
        activityId: activity.id,
      }),
    capture: async (activity, input) => {
      const {
        observationId,
        studentId,
        rawText,
        context,
        childQuote,
        observationType,
        categoryIds,
        taxonomyVersion,
      } = input;
      const observedAt = new Date().toISOString();
      await persistQuickObservationDraft(store, {
        studentId,
        rawText,
        ...(context ? { context } : {}),
        ...(childQuote ? { childQuote } : {}),
        observationType,
        categoryIds,
        taxonomyVersion,
        planId: activity.planId,
        activityId: activity.id,
      });
      const result = await finalizeQuickObservationDraft(store, {
        studentId,
        observationId,
        observedAt,
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      });
      const refreshed = await refreshD1Workspaces();
      const observation = [
        ...refreshed.evidence.pendingObservations,
        ...refreshed.evidence.linkedObservations,
      ].find((item) => item.id === result.observation.id);
      if (!observation) throw new Error("Kaydedilen gözlem notu yeniden açılamadı.");
      setAnnouncement(`${observation.studentName} için gözlem notu kaydedildi.`);
      return observation;
    },
    confirm: async (observation, target) => {
      const isPlannedTarget = observation.plannedCurriculumTargets.some(
        (planned) => planned.id === target.id,
      );
      await confirmObservationCurriculumLink(store, {
        observationId: observation.id,
        framework: observation.curriculumProfile.framework,
        catalogId: observation.curriculumProfile.catalogId,
        sourceVersion: observation.curriculumProfile.sourceVersion,
        referenceCode: target.referenceCode,
        referenceTitle: target.referenceTitle,
        referenceOrigin: observation.curriculumProfile.referenceOrigin,
        officialCatalogVerified:
          observation.curriculumProfile.officialCatalogVerified,
        ...(isPlannedTarget ? { plannedTargetId: target.id } : {}),
      });
      await refreshD1Workspaces();
      setAnnouncement("Program bağlantısı öğretmen onayıyla kaydedildi.");
    },
    createDraft: async (
      observation,
      teacherAssessmentText,
      draftId,
      assessmentLevel,
      assessmentTargetIds,
    ) => {
      await createCitedAssessmentDraft(store, {
        draftId,
        studentId: observation.studentId,
        observationIds: [observation.id],
        teacherAssessmentText,
        assessmentLevel,
        assessmentTargetIds,
        periodStart: observation.civilDate,
        periodEnd: observation.civilDate,
      });
      await refreshD1Workspaces();
      setAnnouncement("Kanıta dayalı değerlendirme taslağı kaydedildi.");
    },
  };

  const handleNav = (id: string, label: string) => {
    if (id === "capture") {
      openCaptureEntry();
      return;
    }
    if (id === "classroom") {
      setActiveNav(id);
      setChildrenOpen(true);
      setAnnouncement("Sınıfım bölümü açıldı.");
      return;
    }
    if (id === "plans") {
      setActiveNav(id);
      setPlansOpen(true);
      return;
    }
    if (id === "documents") {
      setActiveNav(id);
      setDocumentsOpen(true);
      return;
    }
    setActiveNav(id);
    setAnnouncement(`${label} bölümü seçildi.`);
  };

  const changeAttendanceOpen = (open: boolean) => {
    if (!open) keyboard.hide();
    setAttendanceOpen(open);
  };

  return (
    <div className="maarif-app-shell" style={shellStyle}>
      <MobileScroll className="maarif-scroll">
        <main className="maarif-screen today-screen" aria-label="MaarifOS Bugün ekranı" data-testid="today-screen">
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
                  <h1>Bugün</h1>
                </div>
              </div>
              <button
                className="settings-button"
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label="Ayarları aç"
              >
                <GearIcon aria-hidden="true" />
              </button>
            </div>
            <p className="today-flow-label">Günün akışı</p>
            <p className="today-date">{formatTurkishCivilDate(attendanceCivilDate)}</p>
            <div className="today-context" aria-label="Sınıf ve program bilgisi">
              {configuredClassroom ? (
                <>
                  <span className="today-context-primary"><strong>{configuredClassroom.classroomName}</strong><b>{configuredClassroom.scheduleLabel}</b></span>
                  <span className="today-context-program">{configuredClassroom.ageGroup ?? "Yaş grubu belirtilmedi"} · {compactProgramLabel(configuredClassroom.curriculumProgram)} · {curriculumCatalogDisplayLabel(configuredClassroom.curriculumCatalogLabel)}</span>
                </>
              ) : (
                <span><strong>Sınıf kurulumu tamamlanmadı</strong> · Çalışma düzenini bir kez belirleyin</span>
              )}
            </div>
            <p className="sync-state"><CheckCircledIcon aria-hidden="true" /> Kaydedildi · Çevrimdışı hazır</p>
          </header>

          <section className="daily-summary" aria-label="Günlük özet">
            <button className="summary-action" type="button" onClick={() => setAttendanceOpen(true)}>
              <PersonIcon aria-hidden="true" />
              <span><small>Bugünkü devam</small><strong>{counts.present + counts.late}/{students.length} çocuk</strong></span>
            </button>
            <button className="summary-action summary-action--pending" type="button" onClick={() => {
              if (todayWorkspace.pendingEvidenceLinks > 0) openPendingObservation();
              else setAnnouncement("Program bağlantısı bekleyen gözlem notu yok.");
            }}>
              <ClockIcon aria-hidden="true" />
              <span><small>Program bağı</small><strong>{todayWorkspace.pendingEvidenceLinks} gözlem bekliyor</strong></span>
            </button>
          </section>

          <section className="home-children" aria-labelledby="home-children-title">
            <div className="home-section-heading">
              <div>
                <span className="section-eyebrow">Sınıfın kalbi</span>
                <h2 id="home-children-title">Çocuklarım</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChildrenOpen(true);
                  setAnnouncement("Sınıfım bölümü açıldı.");
                }}
              >
                Tümünü gör
                <ChevronRightIcon aria-hidden="true" />
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
                    className={`home-child-card home-child-card--tone-${(index % 5) + 1}`}
                    key={student.id}
                  >
                    <button
                      className="home-child-profile"
                      type="button"
                      onClick={() => openStudentProfile(student.id)}
                      aria-label={`${student.name} profilini aç`}
                    >
                      <span className="home-child-avatar" aria-hidden="true">
                        {studentInitials(student.name)}
                      </span>
                      <span className="home-child-copy">
                        <strong>{student.preferredName ?? student.name}</strong>
                        {student.preferredName ? <small>{student.name}</small> : null}
                        <small>
                          {formatChildAge(student.birthDate, attendanceCivilDate)}
                        </small>
                        <em>
                          {observationCountByStudent.get(student.id) ?? 0} gözlem
                        </em>
                      </span>
                      <ChevronRightIcon aria-hidden="true" />
                    </button>
                    <button
                      className="home-child-observe"
                      type="button"
                      onClick={() => void openStudentObservation(student.id)}
                      disabled={dataBusy}
                      aria-label={`${student.name} için hızlı gözlem`}
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
                onClick={() => setChildrenOpen(true)}
              >
                <span><PersonIcon aria-hidden="true" /></span>
                <strong>Çocukları ekleyin</strong>
                <small>Profil, günlük gözlem ve gelişim izi burada başlayacak.</small>
              </button>
            )}
          </section>

          <section className={`current-work ${focusActivity ? "" : "empty-work"}`} aria-labelledby="current-work-title" data-testid="current-work">
            {focusActivity ? (
              <>
                <div className="current-work-heading">
                  <p className="section-eyebrow">{focusActivity.status === "in_progress" ? "Sınıfta şimdi" : "Sıradaki etkinlik"}</p>
                  <span className="status-label">{activityStatusLabels[focusActivity.status]}</span>
                </div>
                <h2 id="current-work-title">{focusActivity.title}</h2>
                <p className="current-time">{focusActivity.startTime}{focusActivity.endTime ? `–${focusActivity.endTime}` : ""}{focusActivity.subject ? ` · ${focusActivity.subject}` : ""}</p>
                <div className="current-details">
                  <div className="current-meta-row"><TargetIcon aria-hidden="true" /><span>{focusActivity.curriculumConnection ?? `${focusActivity.subject ?? "Planlı etkinlik"} · Program bağlantısı`}</span></div>
                  <div className="current-evidence-row"><ReaderIcon aria-hidden="true" /><span>{focusActivity.evidenceCount} öğrenme kanıtı</span></div>
                </div>
                <button
                  className="primary-evidence-button"
                  type="button"
                  onClick={() => void openActivityEvidence(focusActivity.id)}
                  disabled={dataBusy}
                >
                  <PlusIcon aria-hidden="true" /> {focusActivity.status === "planned" ? "Etkinliği başlat" : "Hızlı gözlem ekle"}
                </button>
                {focusActivity.status === "in_progress" ? (
                  <button className="secondary-text-button" type="button" onClick={() => void completeCurrentActivity()} disabled={dataBusy}>
                    Etkinliği tamamla
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="section-eyebrow">Başlangıç</p>
                <h2 id="current-work-title">{configuredClassroom ? "Bugün için plan eklenmedi" : "Önce sınıfınızı kurun"}</h2>
                <p>{configuredClassroom ? "Kayıtlı bir plan olduğunda sıradaki etkinlik ve öğrenme kanıtları burada görünür." : "Sınıf adı, yaş grubu, program ve kalıcı çalışma düzenini belirleyerek başlayın."}</p>
                <button className="empty-primary" type="button" onClick={() => configuredClassroom ? openPlanFlow() : setClassroomOpen(true)}>
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
              <span className="today-plan-count">{todayWorkspace.planItems.length} etkinlik</span>
            </div>
            {todayWorkspace.planItems.length > 0 ? (
              <div className="activity-list">
                {todayWorkspace.planItems.map((item, index) => (
                  <button
                    className={`activity-row is-${item.status === "in_progress" ? "current" : item.status === "completed" ? "completed" : "next"}`}
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setPlansOpen(true);
                      setAnnouncement(`${item.title} plan kaydı açıldı.`);
                    }}
                  >
                    <span className="activity-marker" aria-hidden="true">{item.status === "completed" ? <CheckCircledIcon /> : index + 1}</span>
                    <span className="activity-copy"><strong>{item.title}</strong><small>{item.startTime} · <b>{activityStatusLabels[item.status]}</b></small></span>
                    <span className="activity-evidence">{item.evidenceCount > 0 ? `${item.evidenceCount} kanıt` : "Henüz kanıt yok"}</span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
            {todayWorkspace.pendingEvidenceLinks > 0 ? (
              <button className="pending-link" type="button" onClick={openPendingObservation}>
                <ClockIcon aria-hidden="true" />
                <span>Program bağlantısı bekleyen {todayWorkspace.pendingEvidenceLinks} gözlem</span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ) : null}
            {todayWorkspace.planItems.length > 0 ? (
              <div className="traceability-link">
                <Link2Icon aria-hidden="true" />
                <span>Bugünün planı {todayWorkspace.linkedLearningGoalCount} öğrenme hedefi ve {todayWorkspace.datedEvidenceCount} tarihli kanıtla bağlantılı.</span>
              </div>
            ) : null}
          </section>
        </main>
      </MobileScroll>

      <nav className="bottom-nav" aria-label="Ana menü">
        <button type="button" className={activeNav === "today" ? "is-active" : ""} onClick={() => handleNav("today", "Bugün")} aria-current={activeNav === "today" ? "page" : undefined}>
          <HomeIcon aria-hidden="true" /><span>Bugün</span>
        </button>
        <button type="button" className={activeNav === "classroom" ? "is-active" : ""} onClick={() => handleNav("classroom", "Sınıfım")} aria-current={activeNav === "classroom" ? "page" : undefined}>
          <PersonIcon aria-hidden="true" /><span>Sınıfım</span>
        </button>
        <button type="button" className="nav-add" onClick={() => handleNav("capture", "Kayıt Ekle")} aria-label="Kayıt ekle">
          <PlusIcon aria-hidden="true" /><span>Kayıt Ekle</span>
        </button>
        <button type="button" className={activeNav === "plans" ? "is-active" : ""} onClick={() => handleNav("plans", "Planlar")} aria-current={activeNav === "plans" ? "page" : undefined}>
          <ReaderIcon aria-hidden="true" /><span>Planlar</span>
        </button>
        <button type="button" className={activeNav === "documents" ? "is-active" : ""} onClick={() => handleNav("documents", "Belgeler")} aria-current={activeNav === "documents" ? "page" : undefined}>
          <ArchiveIcon aria-hidden="true" /><span>Belgeler</span>
        </button>
      </nav>

      <BottomSheet
        open={classroomOpen}
        onOpenChange={setClassroomOpen}
        title="Sınıf kurulumu"
        description="Bu bilgiler eğitim yılı boyunca kalır. Çalışma düzeni günlük olarak değiştirilmez."
        snap={0.9}
      >
        <form
          className="classroom-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveClassroom();
          }}
        >
          <label htmlFor="classroom-name">Sınıf adı</label>
          <KeyboardInput
            id="classroom-name"
            value={classroomForm.classroomName}
            onChange={(event) => setClassroomForm((current) => ({ ...current, classroomName: event.target.value }))}
            placeholder="Örn. Güneş Sınıfı"
            autoComplete="off"
          />

          <label htmlFor="academic-year-name">Eğitim yılı</label>
          <KeyboardInput
            id="academic-year-name"
            value={classroomForm.academicYearName}
            onChange={(event) => setClassroomForm((current) => ({ ...current, academicYearName: event.target.value }))}
            autoComplete="off"
          />

          <div className="settings-grid">
            <label htmlFor="academic-year-start">Eğitim yılı başlangıcı
              <input
                id="academic-year-start"
                type="date"
                value={classroomForm.academicYearStart}
                onChange={(event) => setClassroomForm((current) => ({
                  ...current,
                  academicYearStart: event.target.value,
                }))}
              />
            </label>
            <label htmlFor="academic-year-end">Eğitim yılı bitişi
              <input
                id="academic-year-end"
                type="date"
                value={classroomForm.academicYearEnd}
                onChange={(event) => setClassroomForm((current) => ({
                  ...current,
                  academicYearEnd: event.target.value,
                }))}
              />
            </label>
          </div>

          <div className="settings-grid">
            <label htmlFor="age-group">Yaş grubu
              <select id="age-group" value={classroomForm.ageGroup} onChange={(event) => setClassroomForm((current) => ({ ...current, ageGroup: event.target.value }))}>
                <option>36–48 ay</option>
                <option>48–60 ay</option>
                <option>60–72 ay</option>
              </select>
            </label>
            <label htmlFor="schedule-kind">Çalışma düzeni
              <select id="schedule-kind" value={classroomForm.scheduleKind} onChange={(event) => chooseScheduleKind(event.target.value as ClassroomScheduleKind)}>
                <option value="morning">Sabahçı</option>
                <option value="afternoon">Öğleci</option>
                <option value="full_day">Tam gün</option>
                <option value="custom">Özel saatler</option>
              </select>
            </label>
          </div>

          <label htmlFor="curriculum-program">Uygulanan program</label>
          <select
            id="curriculum-program"
            value={classroomForm.curriculumProgram}
            onChange={(event) => {
              const curriculumProgram = event.target.value;
              const framework = curriculumFrameworkForProgram(curriculumProgram);
              const starter = OFFICIAL_STARTER_CATALOG_PROFILES[framework];
              setClassroomForm((current) => ({
                ...current,
                curriculumProgram,
                curriculumCatalogId: starter.catalogId,
                curriculumSourceVersion: starter.sourceVersion,
              }));
            }}
          >
            <option>Türkiye Yüzyılı Maarif Modeli</option>
            <option>Okul Öncesi Eğitim Programı — EÇE/2024</option>
          </select>

          <div className="settings-grid settings-grid--program">
            <label htmlFor="curriculum-catalog-id">Program katalog kimliği
              <KeyboardInput
                id="curriculum-catalog-id"
                value={classroomForm.curriculumCatalogId}
                onChange={(event) => setClassroomForm((current) => ({
                  ...current,
                  curriculumCatalogId: event.target.value,
                }))}
                placeholder="Kullandığınız kaynaktaki kimlik"
                autoComplete="off"
              />
            </label>
            <label htmlFor="curriculum-source-version">Kaynak sürümü
              <KeyboardInput
                id="curriculum-source-version"
                value={classroomForm.curriculumSourceVersion}
                onChange={(event) => setClassroomForm((current) => ({
                  ...current,
                  curriculumSourceVersion: event.target.value,
                }))}
                placeholder="Baskı / sürüm tarihi"
                autoComplete="off"
              />
            </label>
          </div>
          <p className="classroom-provenance-note">
            Varsayılan değerler resmî MEB kaynaklarıyla kontrol edilmiş kısmi
            başlangıç kataloğudur. Kimlik veya sürümü değiştirirseniz kayıt
            öğretmen beyanı olarak işaretlenir.
          </p>

          <div className="settings-grid">
            <label htmlFor="schedule-start">Başlangıç
              <input id="schedule-start" type="time" value={classroomForm.startTime} onChange={(event) => setClassroomForm((current) => ({ ...current, startTime: event.target.value }))} />
            </label>
            <label htmlFor="schedule-end">Bitiş
              <input id="schedule-end" type="time" value={classroomForm.endTime} onChange={(event) => setClassroomForm((current) => ({ ...current, endTime: event.target.value }))} />
            </label>
          </div>
          <p>Bu düzen yalnız sınıf ayarlarından değiştirilir; Bugün ekranında bilgi olarak gösterilir.</p>
          {classroomError ? <p role="alert">{classroomError}</p> : null}
          <button
            className="sheet-primary"
            type="submit"
            disabled={
              dataBusy ||
              !classroomForm.classroomName.trim() ||
              !classroomForm.curriculumCatalogId.trim() ||
              !classroomForm.curriculumSourceVersion.trim()
            }
          >
            Sınıfı ve çalışma düzenini kaydet
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={plansOpen}
        onOpenChange={(open) => {
          setPlansOpen(open);
          if (!open) setActiveNav("today");
        }}
        title="Planlar"
        description={`${formatTurkishCivilDate(todayWorkspace.civilDate)} · Kayıtlı etkinlikler`}
        snap={0.78}
      >
        <button className="sheet-primary plans-create-button" type="button" onClick={openPlanFlow}>
          <PlusIcon aria-hidden="true" /> Günlük plan oluştur
        </button>
        {todayWorkspace.planItems.length > 0 ? (
          <div className="activity-list">
            {todayWorkspace.planItems.map((item, index) => (
              <button
                className={`activity-row is-${item.status === "in_progress" ? "current" : item.status === "completed" ? "completed" : "next"}`}
                type="button"
                key={item.id}
                onClick={() => void openActivityEvidence(item.id)}
              >
                <span className="activity-marker" aria-hidden="true">{item.status === "completed" ? <CheckCircledIcon /> : index + 1}</span>
                <span className="activity-copy"><strong>{item.title}</strong><small>{item.startTime} · <b>{activityStatusLabels[item.status]}</b></small></span>
                <span className="activity-evidence">{item.status === "planned" ? "Başlat" : "Gözlem ekle"}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-work">
            <h2>Henüz kayıtlı plan yok</h2>
            <p>Bu ekran yalnız kaydedilmiş planları gösterir; sahte etkinlik oluşturmaz.</p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={documentsOpen}
        onOpenChange={(open) => {
          setDocumentsOpen(open);
          if (!open) setActiveNav("today");
        }}
        title="Belgeler"
        description="Kayıtlı verilerden üretilebilen ve dışa aktarılabilen belgeler"
        snap={0.7}
      >
        <div className="security-panel">
          <section className="security-section">
            <div className="security-heading-row"><div><h3>Devam özeti</h3><p>{students.length} çocuk · {counts.present} geldi · {counts.late} geç geldi · {counts.absent} gelmedi</p></div></div>
          </section>
          <section className="security-section">
            <div className="security-heading-row"><div><h3>Veri yedeği</h3><p>Sınıf, çalışma düzeni, yoklama, plan ve kanıt kayıtlarını tek dosyada korur.</p></div></div>
            <button className="install-app-button" type="button" onClick={() => void createBackup()} disabled={dataBusy || !dataHydrated}><DownloadIcon aria-hidden="true" /> Yedek oluştur</button>
          </section>
        </div>
      </BottomSheet>

      <BottomSheet
        open={childrenOpen}
        onOpenChange={setChildrenOpen}
        title="Sınıfım"
        description={`${students.length} sınıfta · ${archivedStudents.length} sınıftan ayrılmış çocuk`}
        snap={0.86}
      >
        <form
          className="children-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addStudent();
          }}
        >
          <label htmlFor="new-student-name">Çocuğun adı</label>
          <div className="children-add-row">
            <KeyboardInput
              id="new-student-name"
              value={newStudentName}
              onChange={(event) => setNewStudentName(event.target.value)}
              placeholder="Ad ve soyad"
              autoComplete="off"
            />
            <button type="submit" disabled={!newStudentName.trim() || dataBusy}>Ekle</button>
          </div>
        </form>

        <section className="children-section" aria-labelledby="active-students-heading">
          <h3 id="active-students-heading">Sınıftaki çocuklar</h3>
          <div className="children-list">
            {students.map((student) => (
              <div className="children-row" key={student.id}>
                <button
                  className="children-profile-button"
                  type="button"
                  onClick={() => openStudentProfile(student.id)}
                  aria-label={`${student.name} profilini aç`}
                >
                  <span className="student-avatar" aria-hidden="true">
                    {studentInitials(student.name)}
                  </span>
                  <span className="student-name">
                    <strong>{student.preferredName ?? student.name}</strong>
                    <small>
                      {student.preferredName ? `${student.name} · ` : ""}
                      {formatChildAge(student.birthDate, attendanceCivilDate)}
                    </small>
                  </span>
                  <ChevronRightIcon aria-hidden="true" />
                </button>
                <div className="children-row-actions">
                  <button
                    type="button"
                    onClick={() => void openStudentObservation(student.id)}
                    disabled={dataBusy}
                    aria-label={`${student.name} için hızlı gözlem`}
                  >
                    <PlusIcon aria-hidden="true" /> Gözlem
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveStudent(student.id)}
                    disabled={dataBusy}
                    aria-label={`${student.name} çocuğunu sınıftan ayır`}
                  >
                    Sınıftan ayır
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {archivedStudents.length > 0 ? (
          <section className="children-section" aria-labelledby="archived-students-heading">
            <h3 id="archived-students-heading">Sınıftan ayrılanlar</h3>
            <div className="children-list">
              {archivedStudents.map((student) => (
                <div className="children-row children-row--archived" key={student.id}>
                  <span className="student-avatar" aria-hidden="true">{student.name.split(" ").map((part) => part[0]).join("")}</span>
                  <span className="student-name">{student.name}</span>
                  <button type="button" onClick={() => void restoreStudent(student.id)} disabled={dataBusy} aria-label={`${student.name} çocuğunu sınıfa geri al`}>
                    Geri al
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={studentProfileOpen}
        onOpenChange={(open) => {
          if (!open) keyboard.hide();
          setStudentProfileOpen(open);
        }}
        title={selectedProfileStudent ? `${selectedProfileStudent.name} profili` : "Çocuk profili"}
        description="Kimlik, sınıf bağlamı ve kanıt izi tek yerde"
        snap={0.94}
      >
        {selectedProfileStudent ? (
          <div className="student-profile-sheet">
            <section className="student-profile-hero" aria-label="Çocuk profil özeti">
              <span className="student-profile-avatar" aria-hidden="true">
                {studentInitials(selectedProfileStudent.name)}
              </span>
              <div>
                <span className="section-eyebrow">Bireysel gelişim izi</span>
                <h3>
                  {selectedProfileStudent.preferredName ??
                    selectedProfileStudent.name}
                </h3>
                {selectedProfileStudent.preferredName ? (
                  <p>{selectedProfileStudent.name}</p>
                ) : null}
                <strong>
                  {formatChildAge(
                    selectedProfileStudent.birthDate,
                    attendanceCivilDate,
                  )}
                </strong>
              </div>
            </section>

            <section className="student-profile-metrics" aria-label="Profil göstergeleri">
              <div>
                <small>Bugünkü devam</small>
                <strong>{statusLabels[selectedProfileStudent.status]}</strong>
              </div>
              <div>
                <small>Toplam gözlem</small>
                <strong>{selectedStudentObservations.length}</strong>
              </div>
              <div>
                <small>Bağ bekleyen</small>
                <strong>{selectedStudentPendingLinks}</strong>
              </div>
            </section>

            <button
              className="student-profile-observe"
              type="button"
              onClick={() => void openStudentObservation(selectedProfileStudent.id)}
              disabled={dataBusy || archivedStudents.some(
                (student) => student.id === selectedProfileStudent.id,
              )}
            >
              <PlusIcon aria-hidden="true" />
              {selectedProfileStudent.preferredName ??
                selectedProfileStudent.name} için hızlı gözlem
            </button>

            <form
              className="student-profile-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveStudentProfile();
              }}
            >
              <div className="student-profile-section-heading">
                <div>
                  <span className="d1-kicker">Temel bilgiler</span>
                  <h3>Çocuğu doğru tanıyın</h3>
                </div>
                <CalendarIcon aria-hidden="true" />
              </div>

              <label htmlFor="student-profile-name">Adı ve soyadı</label>
              <KeyboardInput
                id="student-profile-name"
                value={studentProfileForm.name}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                autoComplete="off"
              />

              <label htmlFor="student-profile-preferred-name">
                Tercih edilen ad
                <small>Varsa çocuğun günlük yaşamda tercih ettiği ad</small>
              </label>
              <KeyboardInput
                id="student-profile-preferred-name"
                value={studentProfileForm.preferredName}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    preferredName: event.target.value,
                  }))
                }
                placeholder="Örn. Ece"
                autoComplete="off"
              />

              <div className="student-profile-form-grid">
                <label htmlFor="student-profile-birth-date">
                  Doğum tarihi
                  <KeyboardInput
                    id="student-profile-birth-date"
                    type="date"
                    max={attendanceCivilDate}
                    value={studentProfileForm.birthDate}
                    onChange={(event) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                    onInput={(event) => {
                      const birthDate = event.currentTarget.value;
                      setStudentProfileForm((current) => ({
                        ...current,
                        birthDate,
                      }));
                    }}
                  />
                </label>
                <label htmlFor="student-profile-code">
                  İsteğe bağlı kod
                  <KeyboardInput
                    id="student-profile-code"
                    value={studentProfileForm.optionalCode}
                    onChange={(event) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        optionalCode: event.target.value,
                      }))
                    }
                    placeholder="T.C. kimlik no değil"
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="student-profile-section-heading student-profile-section-heading--secondary">
                <div>
                  <span className="d1-kicker">Tanıma ve katılım</span>
                  <h3>Çocuğun günlük bağlamı</h3>
                </div>
                <StarIcon aria-hidden="true" />
              </div>

              <label htmlFor="student-profile-enrollment-date">
                Sınıfa kayıt tarihi
                <KeyboardInput
                  id="student-profile-enrollment-date"
                  type="date"
                  min={studentProfileForm.birthDate || undefined}
                  max={attendanceCivilDate}
                  value={studentProfileForm.enrollmentDate}
                  onChange={(event) =>
                    setStudentProfileForm((current) => ({
                      ...current,
                      enrollmentDate: event.target.value,
                    }))
                  }
                  onInput={(event) => {
                    const enrollmentDate = event.currentTarget.value;
                    setStudentProfileForm((current) => ({
                      ...current,
                      enrollmentDate,
                    }));
                  }}
                />
              </label>

              <label htmlFor="student-profile-languages">
                Evde kullanılan diller
                <small>
                  Çocuğun iletişim bağlamını anlamak için; tek bir dil
                  varsayılmaz.
                </small>
              </label>
              <KeyboardInput
                id="student-profile-languages"
                value={studentProfileForm.homeLanguages}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    homeLanguages: event.target.value.slice(0, 200),
                  }))
                }
                placeholder="Örn. Türkçe, İngilizce"
                autoComplete="off"
              />

              <label htmlFor="student-profile-interests">
                İlgi ve merak alanları
                <small>
                  Oyunlarda, sohbetlerde veya araştırmalarda tekrar döndüğü
                  konular
                </small>
              </label>
              <KeyboardTextarea
                id="student-profile-interests"
                value={studentProfileForm.interests}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    interests: event.target.value.slice(0, 500),
                  }))
                }
                placeholder="Örn. yapılar kurma, böcekleri inceleme, ritim üretme"
                rows={3}
              />

              <label htmlFor="student-profile-strengths">
                Görünür güçlü yönleri
                <small>
                  Yalnız gözlenebilir davranış ve ürünlere dayanan öğretmen
                  notu
                </small>
              </label>
              <KeyboardTextarea
                id="student-profile-strengths"
                value={studentProfileForm.strengths}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    strengths: event.target.value.slice(0, 500),
                  }))
                }
                placeholder="Örn. akranlarını oyuna davet ediyor; birden çok çözüm deniyor"
                rows={3}
              />

              <label htmlFor="student-profile-support">
                Katılımını destekleyen tercihler
                <small>
                  Tanı veya değerlendirme hükmü değil; sınıfta işe yarayan
                  rutin ve düzenlemeler
                </small>
              </label>
              <KeyboardTextarea
                id="student-profile-support"
                value={studentProfileForm.supportPreferences}
                onChange={(event) =>
                  setStudentProfileForm((current) => ({
                    ...current,
                    supportPreferences: event.target.value.slice(0, 1_000),
                  }))
                }
                placeholder="Örn. geçişten önce kısa haber vermek; seçimleri görsel olarak sunmak"
                rows={4}
              />

              <section className="student-profile-context" aria-label="Sınıf ve program bağlamı">
                <div>
                  <small>Sınıf</small>
                  <strong>
                    {configuredClassroom?.classroomName ?? "Sınıf belirtilmedi"}
                  </strong>
                </div>
                <div>
                  <small>Yaş grubu</small>
                  <strong>
                    {configuredClassroom?.ageGroup ?? "Belirtilmedi"}
                  </strong>
                </div>
                <div>
                  <small>Program</small>
                  <strong>
                    {compactProgramLabel(
                      configuredClassroom?.curriculumProgram,
                    )}
                  </strong>
                </div>
              </section>

              <p className="student-profile-privacy">
                <LockClosedIcon aria-hidden="true" />
                Profil bu cihazda saklanır ve doğrulanmış MaarifOS yedeğine
                dâhildir. Kimlik numarası bu alanda tutulmaz.
              </p>
              {studentProfileError ? (
                <p className="d1-error" role="alert">{studentProfileError}</p>
              ) : null}
              <button
                className="student-profile-save"
                type="submit"
                disabled={!studentProfileForm.name.trim() || dataBusy}
              >
                <CheckCircledIcon aria-hidden="true" />
                {dataBusy ? "Kaydediliyor…" : "Profili kaydet"}
              </button>
            </form>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={attendanceOpen}
        onOpenChange={changeAttendanceOpen}
        title="Bugünün devam durumu"
        description={`${formatTurkishCivilDate(attendanceCivilDate)} · Bir çocuğa dokunarak Geldi → Geç geldi → Gelmedi durumları arasında ilerleyin.`}
        snap={0.84}
      >
        <div className="attendance-list">
          {students.map((student) => (
            <button className="student-row" type="button" key={student.id} onClick={() => updateStudentStatus(student.id)}>
              <span className="student-avatar" aria-hidden="true">{student.name.split(" ").map((part) => part[0]).join("")}</span>
              <span className="student-name">{student.name}</span>
              <span className={`status-pill status-pill--${student.status}`}>{statusLabels[student.status]}</span>
            </button>
          ))}
        </div>
        {lastAttendanceChange ? (
          <button className="attendance-undo" type="button" onClick={undoAttendanceChange}>
            Son değişikliği geri al
          </button>
        ) : null}
        <button className="sheet-primary" type="button" onClick={() => void completeAttendance()} disabled={dataBusy}>
          <CheckCircledIcon aria-hidden="true" /> Devam durumunu tamamla
        </button>
      </BottomSheet>

      <BottomSheet
        open={profileOpen}
        onOpenChange={(open) => {
          if (!open) keyboard.hide();
          setProfileOpen(open);
        }}
        title="Hesap ve veri güvenliği"
        description="MaarifOS yerel önceliklidir. Hesap bağlantısı isteğe bağlıdır."
        snap={0.86}
      >
        <div className="security-panel">
          <section className="security-section" aria-labelledby="classroom-settings-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="classroom-settings-heading">Sınıf ve çalışma düzeni</h3>
                <p>{configuredClassroom ? `${configuredClassroom.classroomName} · ${configuredClassroom.scheduleLabel}` : "Henüz kurulmadı"}</p>
              </div>
            </div>
            <button className="install-app-button" type="button" onClick={() => {
              setProfileOpen(false);
              setClassroomOpen(true);
            }}>
              <GearIcon aria-hidden="true" /> {configuredClassroom ? "Sınıf ayarlarını düzenle" : "Sınıfı kur"}
            </button>
          </section>

          <section className="local-vault-card" aria-label="Cihazdaki veri durumu">
            <span className="security-icon"><LockClosedIcon aria-hidden="true" /></span>
            <span>
              <strong>Veriler bu cihazda saklanıyor</strong>
              <small>{dataStatus}</small>
            </span>
            <b>Aktif</b>
          </section>

          <section className="security-section" aria-labelledby="account-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="account-heading">Öğretmen hesabı</h3>
                <p>{authView.privacySummary}</p>
              </div>
              <span className="optional-badge">İsteğe bağlı</span>
            </div>
            <button
              className="google-account-button"
              type="button"
              disabled={!authView.googleAction.enabled}
              onClick={() => setAuthState((current) => reduceAuthState(current, { type: "REQUEST_GOOGLE" }))}
            >
              <img src="/assets/google-g-logo.png" alt="" aria-hidden="true" />
              <span>{authView.googleAction.label}</span>
            </button>
            <small className="provider-status">{authView.googleAction.statusText}</small>
          </section>

          <section className="security-section" aria-labelledby="install-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="install-heading">Bu cihaza kur</h3>
                <p>Tarayıcı sekmesi olmadan, masaüstünden veya ana ekrandan doğrudan açın.</p>
              </div>
              <span className="optional-badge">Windows + Telefon</span>
            </div>
            <button
              className="install-app-button"
              type="button"
              onClick={() => void installApp()}
              disabled={standalone}
            >
              <DownloadIcon aria-hidden="true" />
              <span>{standalone ? "Bu cihaza kuruldu" : installPrompt ? "MaarifOS’u kur" : "Kurulum adımlarını göster"}</span>
            </button>
            <small className="provider-status" role="status">{installStatus}</small>
          </section>

          <section className="security-section" aria-labelledby="backup-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="backup-heading">Yedek ve geri yükle</h3>
                <p>Sınıf, çalışma düzeni, devam ve gözlem kayıtlarını doğrulanmış tek dosyada koruyun.</p>
              </div>
            </div>
            <div className="data-action-grid">
              <button type="button" onClick={() => void createBackup()} disabled={dataBusy || !dataHydrated}>
                <DownloadIcon aria-hidden="true" />
                <span><strong>Yedek oluştur</strong><small>Doğrulanmış yedek dosyası</small></span>
              </button>
              <button type="button" onClick={() => restoreFileRef.current?.click()} disabled={dataBusy}>
                <UploadIcon aria-hidden="true" />
                <span><strong>Geri yükle</strong><small>Dosyayı kontrol et</small></span>
              </button>
            </div>
            <input
              ref={restoreFileRef}
              className="restore-file-input"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void inspectRestoreFile(event.target.files?.[0])}
              aria-label="MaarifOS yedek dosyası seç"
            />

            {pendingRestore ? (
              <div className="restore-preview" role="status">
                <strong>{pendingRestore.fileName}</strong>
                <span>
                  {Object.values(pendingRestore.envelope.manifest.entityCounts).reduce((total, count) => total + count, 0)} kayıt · {pendingRestore.envelope.manifest.civilDate}
                </span>
                <p>Geri yüklemeden önce mevcut verileriniz otomatik güvenlik yedeği olarak indirilir.</p>
                <div className="restore-actions">
                  <button type="button" onClick={() => void confirmRestore("merge")} disabled={dataBusy}>Kayıtları birleştir</button>
                  <button type="button" className="replace-action" onClick={() => void confirmRestore("replace")} disabled={dataBusy}>Bu cihazdaki verilerin yerine yükle</button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </BottomSheet>

      {planFlowOpen && configuredClassroom?.curriculumProfile ? (
        <section
          className="d1-flow-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Günlük plan oluşturma"
          key="plan-flow"
        >
          <PlanCreationFlow
            civilDate={todayWorkspace.civilDate}
            defaultStartTime={configuredClassroom.schedule.startTime}
            defaultEndTime={configuredClassroom.schedule.endTime}
            curriculumProfile={configuredClassroom.curriculumProfile}
            students={students}
            onCreate={createPlanAndStart}
            onClose={closeD1Flow}
          />
        </section>
      ) : null}

      {evidenceFlowRequest ? (
        <section
          className="d1-flow-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Gözlem ve değerlendirme akışı"
          key={`evidence-flow-${evidenceFlowRequest.pendingObservation?.id ?? evidenceFlowRequest.activity.id}-${evidenceFlowRequest.initialStudentId ?? "none"}`}
        >
          <EvidenceCaptureFlow
            activity={evidenceFlowRequest.activity}
            pendingObservation={evidenceFlowRequest.pendingObservation}
            initialStudentId={evidenceFlowRequest.initialStudentId}
            students={students}
            actions={evidenceFlowActions}
          />
        </section>
      ) : null}

      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
