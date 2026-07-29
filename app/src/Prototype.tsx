import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
  MagnifyingGlassIcon,
  DotsHorizontalIcon,
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
  AppLockSession,
  BackupService,
  DATA_SCHEMA_VERSION,
  IndexedDbDataStore,
  OBSERVATION_TAXONOMY_VERSION_V2,
  ageInMonthsOn,
  assertAppLockAttemptState,
  assertAppLockConfig,
  civilDateInIstanbul,
  createAppLockConfig,
  initialAppLockAttemptState,
  isEncryptedBackupEnvelope,
  type AppLockAttemptState,
  type AppLockConfig,
  type BackupEnvelope,
  type RecoverySnapshotMetadata,
  type RestoreMode,
  type StoredRecord,
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
  finalizeQuickObservationDraftBatch,
  finalizeQuickObservationDraft,
  loadQuickObservationDraft,
  persistQuickObservationDraftBatch,
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
import {
  acknowledgeCurrentRelease,
  CURRENT_RELEASE,
  inspectCurrentRelease,
  PWA_UPDATE_READY_EVENT,
} from "./release";

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
  scheduleKind: ClassroomScheduleKind | "";
  startTime: string;
  endTime: string;
};

type PersistencePhase = "hydrating" | "ready" | "pending" | "error";

type PersistenceState = {
  phase: PersistencePhase;
  detail: string;
  pendingWrites: number;
  lastCommittedAt?: string;
};

type OfflineReadiness = "checking" | "ready" | "unavailable";

type PwaRuntimeStatus = {
  phase: "ready" | "update-ready" | "activating-update" | "error";
  offlineReady: boolean;
};

class PersistenceUnavailableError extends Error {
  constructor(message = "Cihaz verileri yazmaya hazır değil.") {
    super(message);
    this.name = "PersistenceUnavailableError";
  }
}

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
  ageGroup: "",
  curriculumProgram: "",
  curriculumCatalogLabel: "",
  curriculumCatalogId: "",
  curriculumSourceVersion: "",
  scheduleKind: "",
  startTime: "",
  endTime: "",
};

const schedulePresets: Record<Exclude<ClassroomScheduleKind, "custom">, Pick<ClassroomFormState, "startTime" | "endTime">> = {
  morning: { startTime: "08:30", endTime: "12:30" },
  afternoon: { startTime: "13:00", endTime: "17:00" },
  full_day: { startTime: "08:30", endTime: "16:30" },
};

const supportedCurriculumPrograms = [
  "Türkiye Yüzyılı Maarif Modeli",
  "Okul Öncesi Eğitim Programı — EÇE/2024",
] as const;

function isSupportedCurriculumProgram(
  value: string,
): value is (typeof supportedCurriculumPrograms)[number] {
  return supportedCurriculumPrograms.includes(
    value as (typeof supportedCurriculumPrograms)[number],
  );
}

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
  encryption: "encrypted" | "legacy-plaintext";
  envelope: BackupEnvelope | null;
};

type AppLockSettingRecord = StoredRecord & {
  settingType: "app-lock-config-v1";
  config: AppLockConfig;
  attemptState: AppLockAttemptState;
};

const APP_LOCK_SETTING_ID = "7aab50df-a47d-4dcb-8ac0-d8589a34b950";
const APP_LOCK_SETTING_TYPE = "app-lock-config-v1";

function parseAppLockSetting(
  record: StoredRecord | undefined,
): AppLockSettingRecord | null {
  if (!record || record.deletedAt || record.settingType !== APP_LOCK_SETTING_TYPE) {
    return null;
  }
  assertAppLockConfig(record.config);
  assertAppLockAttemptState(record.attemptState);
  return record as AppLockSettingRecord;
}

async function loadAppLockSetting(
  store: IndexedDbDataStore,
): Promise<AppLockSettingRecord | null> {
  return store.transaction("readonly", ["settings"], async (transaction) => {
    const records = await transaction.getAll("settings");
    return parseAppLockSetting(
      records.find((record) => record.id === APP_LOCK_SETTING_ID),
    );
  });
}

async function persistAppLockSetting(
  store: IndexedDbDataStore,
  config: AppLockConfig,
  attemptState: AppLockAttemptState,
  createdAt = config.createdAt,
): Promise<AppLockSettingRecord> {
  const now = new Date();
  const record: AppLockSettingRecord = {
    id: APP_LOCK_SETTING_ID,
    settingType: APP_LOCK_SETTING_TYPE,
    config,
    attemptState,
    createdAt,
    updatedAt: now.toISOString(),
    civilDate: civilDateInIstanbul(now),
    schemaVersion: DATA_SCHEMA_VERSION,
  };
  await store.transaction("readwrite", ["settings"], async (transaction) => {
    await transaction.putMany("settings", [record]);
  });
  return record;
}

type EvidenceFlowRequest = {
  activity: EvidenceActivitySummary;
  pendingObservation?: EvidenceObservationSummary;
  initialStudentId?: string;
};

type AppSurface =
  | "attendance"
  | "children"
  | "student-profile"
  | "settings"
  | "classroom"
  | "plans"
  | "documents"
  | "release-notes"
  | "plan-flow"
  | "evidence-flow";

const APP_HISTORY_MARKER = "__maarifOSSurface";

function appSurfaceFromHistoryState(state: unknown): AppSurface | null {
  if (!state || typeof state !== "object") return null;
  const candidate = (state as Record<string, unknown>)[APP_HISTORY_MARKER];
  return candidate === "attendance" ||
    candidate === "children" ||
    candidate === "student-profile" ||
    candidate === "settings" ||
    candidate === "classroom" ||
    candidate === "plans" ||
    candidate === "documents" ||
    candidate === "release-notes" ||
    candidate === "plan-flow" ||
    candidate === "evidence-flow"
    ? candidate
    : null;
}

function appHistoryState(surface: AppSurface | null) {
  const current =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  return { ...current, [APP_HISTORY_MARKER]: surface };
}

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
  close: () => Promise<boolean>;
  manageChildren: () => Promise<void>;
  registerDraftFlusher: (flusher: () => Promise<void>) => () => void;
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
  saveDraftBatch: (
    activity: EvidenceActivitySummary,
    input: {
      batchId: string;
      studentIds: string[];
      rawText: string;
      context?: string;
      childQuote?: string;
      observationType: QuickObservationType;
      categoryIds: QuickObservationCategory[];
      taxonomyVersion: typeof OBSERVATION_TAXONOMY_VERSION_V2;
    },
  ) => Promise<void>;
  captureBatch: (
    activity: EvidenceActivitySummary,
    input: {
      batchId: string;
      studentIds: string[];
      rawText: string;
      context?: string;
      childQuote?: string;
      observationType: QuickObservationType;
      categoryIds: QuickObservationCategory[];
      taxonomyVersion: typeof OBSERVATION_TAXONOMY_VERSION_V2;
    },
  ) => Promise<number>;
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

type EvidenceCaptureDraft = {
  selectionMode: "single" | "selected-children";
  batchId: string;
  studentId: string;
  studentIds: string[];
  rawText: string;
  context: string;
  childQuote: string;
  observationType: QuickObservationType;
  categoryIds: QuickObservationCategory[];
  taxonomyVersion: typeof OBSERVATION_TAXONOMY_VERSION_V2;
};

function hasEvidenceDraftContent(
  value: Pick<
    EvidenceCaptureDraft,
    "rawText" | "context" | "childQuote" | "categoryIds"
  >,
): boolean {
  return Boolean(
    value.rawText.trim() ||
      value.context.trim() ||
      value.childQuote.trim() ||
      value.categoryIds.length > 0,
  );
}

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
  const [batchId] = useState(() => crypto.randomUUID());
  const [selectionMode, setSelectionMode] =
    useState<"single" | "selected-children">("single");
  const [studentId, setStudentId] = useState("");
  const [groupStudentIds, setGroupStudentIds] = useState<string[]>([]);
  const [groupConfirmed, setGroupConfirmed] = useState(false);
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
  const draftSnapshotRef = useRef<EvidenceCaptureDraft>({
    selectionMode,
    batchId,
    studentId,
    studentIds: groupStudentIds,
    rawText,
    context,
    childQuote,
    observationType,
    categoryIds: categories,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
  });
  const selectedStudent = eligibleStudents.find((student) => student.id === studentId);
  const selectedStudentCount =
    selectionMode === "single" ? (studentId ? 1 : 0) : groupStudentIds.length;
  const allEligibleStudentsSelected =
    eligibleStudents.length > 0 &&
    groupStudentIds.length === eligibleStudents.length;
  actionsRef.current = actions;
  draftSnapshotRef.current = {
    selectionMode,
    batchId,
    studentId,
    studentIds: groupStudentIds,
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

  const persistDraftSnapshot = useCallback(
    async (draft: EvidenceCaptureDraft) => {
      const hasRecipient =
        draft.selectionMode === "single"
          ? Boolean(draft.studentId)
          : draft.studentIds.length >= 2;
      if (
        !hasRecipient ||
        finalizedRef.current ||
        !hasEvidenceDraftContent(draft)
      ) {
        return;
      }
      setDraftStatus("saving");
      try {
        if (draft.selectionMode === "single") {
          await actionsRef.current.saveDraft(activity, draft);
        } else {
          await actionsRef.current.saveDraftBatch(activity, {
            batchId: draft.batchId,
            studentIds: draft.studentIds,
            rawText: draft.rawText,
            context: draft.context,
            childQuote: draft.childQuote,
            observationType: draft.observationType,
            categoryIds: draft.categoryIds,
            taxonomyVersion: draft.taxonomyVersion,
          });
        }
        if (!finalizedRef.current) setDraftStatus("saved");
      } catch (reason) {
        setDraftStatus("error");
        throw reason;
      }
    },
    [activity],
  );

  const flushCurrentDraft = useCallback(async () => {
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    const draft = draftSnapshotRef.current;
    await persistDraftSnapshot({
      ...draft,
      studentIds: [...draft.studentIds],
      categoryIds: [...draft.categoryIds],
    });
  }, [persistDraftSnapshot]);

  useEffect(() => {
    const draft = draftSnapshotRef.current;
    const hasRecipient =
      draft.selectionMode === "single"
        ? Boolean(draft.studentId)
        : draft.studentIds.length >= 2;
    if (
      !hasRecipient ||
      finalizedRef.current ||
      !hasEvidenceDraftContent(draft)
    ) {
      return;
    }
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    setDraftStatus("saving");
    draftTimerRef.current = window.setTimeout(() => {
      draftTimerRef.current = null;
      void flushCurrentDraft().catch(() => undefined);
    }, 450);
    return () => {
      if (draftTimerRef.current !== null) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [
    activity,
    categories,
    childQuote,
    context,
    groupStudentIds,
    observationType,
    rawText,
    selectionMode,
    studentId,
    flushCurrentDraft,
  ]);

  useEffect(
    () => actions.registerDraftFlusher(flushCurrentDraft),
    [actions.registerDraftFlusher, flushCurrentDraft],
  );

  const chooseStudent = async (nextStudentId: string) => {
    if (nextStudentId === studentId) return;
    try {
      await flushCurrentDraft();
    } catch {
      setError(
        "Mevcut taslak kaydedilemediği için çocuk değiştirilmedi. Cihaz verilerine yeniden bağlanın.",
      );
      return;
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

  const chooseSingleMode = async () => {
    if (selectionMode === "single") return;
    try {
      await flushCurrentDraft();
    } catch {
      setError(
        "Mevcut taslak kaydedilemediği için gözlem kapsamı değiştirilmedi.",
      );
      return;
    }
    setSelectionMode("single");
    setGroupConfirmed(false);
    const fallbackStudentId = studentId || groupStudentIds[0];
    if (fallbackStudentId && fallbackStudentId !== studentId) {
      void chooseStudent(fallbackStudentId);
    }
  };

  const chooseGroupMode = async () => {
    if (selectionMode === "selected-children") return;
    try {
      await flushCurrentDraft();
    } catch {
      setError(
        "Mevcut taslak kaydedilemediği için gözlem kapsamı değiştirilmedi.",
      );
      return;
    }
    setGroupStudentIds((current) =>
      current.length > 0 ? current : studentId ? [studentId] : [],
    );
    setSelectionMode("selected-children");
    setGroupConfirmed(false);
    setDraftStatus("ready");
  };

  const toggleGroupStudent = async (nextStudentId: string) => {
    try {
      await flushCurrentDraft();
    } catch {
      setError(
        "Mevcut taslak kaydedilemediği için çocuk seçimi değiştirilmedi.",
      );
      return;
    }
    setGroupConfirmed(false);
    setGroupStudentIds((current) =>
      current.includes(nextStudentId)
        ? current.filter((id) => id !== nextStudentId)
        : [...current, nextStudentId],
    );
  };

  const toggleWholeClass = async () => {
    try {
      await flushCurrentDraft();
    } catch {
      setError(
        "Mevcut taslak kaydedilemediği için sınıf seçimi değiştirilmedi.",
      );
      return;
    }
    setGroupConfirmed(false);
    setGroupStudentIds(
      allEligibleStudentsSelected
        ? []
        : eligibleStudents.map((student) => student.id),
    );
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
    const singleReady = selectionMode === "single" && Boolean(studentId);
    const groupReady =
      selectionMode === "selected-children" &&
      groupStudentIds.length >= 2 &&
      groupConfirmed;
    if ((!singleReady && !groupReady) || !rawText.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      if (selectionMode === "single") {
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
      } else {
        await actions.captureBatch(activity, {
          batchId,
          studentIds: groupStudentIds,
          rawText,
          ...(context.trim() ? { context } : {}),
          ...(childQuote.trim() ? { childQuote } : {}),
          observationType,
          categoryIds: categories,
          taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
        });
      }
      finalizedRef.current = true;
      await actions.close();
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
                  <h1 id="quick-student-heading">Gözlem kapsamı</h1>
                </div>
                {selectedStudentCount > 0 ? (
                  <strong>
                    {selectionMode === "single"
                      ? selectedStudent?.name
                      : `${selectedStudentCount} çocuk seçildi`}
                  </strong>
                ) : (
                  <small>Zorunlu</small>
                )}
              </div>
              <div className="quick-scope-switch" role="group" aria-label="Gözlem kapsamı">
                <button
                  type="button"
                  aria-pressed={selectionMode === "single"}
                  onClick={() => void chooseSingleMode()}
                  disabled={busy}
                >
                  Bir çocuk
                </button>
                <button
                  type="button"
                  aria-pressed={selectionMode === "selected-children"}
                  onClick={() => void chooseGroupMode()}
                  disabled={busy}
                >
                  Seçili çocuklar
                </button>
              </div>
              {selectionMode === "selected-children" ? (
                <div className="quick-group-toolbar">
                  <p>
                    Aynı olayı birlikte gözlemlediğiniz çocukları işaretleyin.
                  </p>
                  <button
                    type="button"
                    onClick={() => void toggleWholeClass()}
                    disabled={busy}
                  >
                    {allEligibleStudentsSelected
                      ? "Seçimi temizle"
                      : "Tüm sınıfı seç"}
                  </button>
                </div>
              ) : null}
              <Carousel
                className="quick-student-strip"
                contentClassName="quick-student-track"
                ariaLabel="Gözlem yapılacak çocuk"
              >
                {eligibleStudents.map((student, index) => {
                  const selected =
                    selectionMode === "single"
                      ? student.id === studentId
                      : groupStudentIds.includes(student.id);
                  return (
                    <button
                      className={`quick-student-card quick-student-card--tone-${(index % 5) + 1}`}
                      type="button"
                      key={student.id}
                      onClick={() =>
                        selectionMode === "single"
                          ? void chooseStudent(student.id)
                          : void toggleGroupStudent(student.id)
                      }
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
              {selectionMode === "selected-children" ? (
                <section className="quick-group-safety" aria-label="Toplu gözlem doğrulaması">
                  <div>
                    <CheckCircledIcon aria-hidden="true" />
                    <span>
                      <strong>Toplu işlem, ayrı çocuk kanıtları</strong>
                      <small>
                        Not her çocuğun zaman çizelgesine ayrı ve değiştirilemez
                        ham gözlem olarak kaydedilir.
                      </small>
                    </span>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={groupConfirmed}
                      onChange={(event) => setGroupConfirmed(event.target.checked)}
                      disabled={groupStudentIds.length < 2 || busy}
                    />
                    Seçtiğim çocukların her birini bu olay sırasında gözlemledim.
                  </label>
                </section>
              ) : null}
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
                    {selectionMode === "selected-children"
                      ? "Seçili çocuklar için neye bakabilirim?"
                      : selectedStudent
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
            disabled={
              busy ||
              !rawText.trim() ||
              (selectionMode === "single"
                ? !studentId
                : groupStudentIds.length < 2 || !groupConfirmed)
            }
          >
            <LockClosedIcon aria-hidden="true" />
            {busy
              ? "Kaydediliyor…"
              : selectionMode === "selected-children" &&
                  groupStudentIds.length >= 2
                ? `${groupStudentIds.length} çocuk için gözlemi kaydet`
                : "Gözlemi kaydet"}
          </button>
          <small>
            {selectionMode === "selected-children"
              ? "Program bağı her çocuk için ayrı ayrı tamamlanabilir."
              : "Program bağı daha sonra tamamlanabilir."}
          </small>
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
        <button
          className="d1-secondary"
          type="button"
          onClick={() => void actions.close()}
        >
          Daha sonra tamamla
        </button>
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
        <button
          className="d1-primary"
          type="button"
          onClick={() => void actions.close()}
        >
          Bugün ekranına dön
        </button>
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
      header: createFlowHeader(
        "Program bağlantısı",
        "2 / 3",
        () => void actions.close(),
      ),
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
      header: createFlowHeader(
        "Değerlendirme",
        "3 / 3",
        () => void actions.close(),
      ),
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
      header: createFlowHeader(
        "Kayıt tamamlandı",
        "Hazır",
        () => void actions.close(),
      ),
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
      header: createQuickObservationHeader(
        activity.title,
        () => void actions.close(),
      ),
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
  const { device, native } = useMobileDevice();
  const { bottomInset } = useKeyboardInsets();
  const store = useMemo(() => new IndexedDbDataStore(), []);
  const backupService = useMemo(
    () => new BackupService(store, { appVersion: CURRENT_RELEASE.version }),
    [store],
  );
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingWriteCountRef = useRef(0);
  const persistenceReadyRef = useRef(false);
  const persistencePhaseRef = useRef<PersistencePhase>("hydrating");
  const persistenceStateRef = useRef<PersistenceState>({
    phase: "hydrating",
    detail: "Bu cihazdaki veriler hazırlanıyor.",
    pendingWrites: 0,
  });
  const pendingDraftFlushersRef = useRef(new Set<() => Promise<void>>());
  const appLockSessionRef = useRef<AppLockSession | null>(null);
  const d1ReturnFocusRef = useRef<HTMLElement | null>(null);
  const attendanceMutationSequenceRef = useRef(0);
  const dayRefreshInFlightRef = useRef(false);
  const historyInitializedRef = useRef(false);
  const historySurfaceRef = useRef<AppSurface | null>(null);
  const historyRestoringRef = useRef(false);
  const surfaceTransitionRef = useRef<AppSurface | null>(null);
  const activeSurfaceRef = useRef<AppSurface | null>(null);
  const lastEvidenceFlowRequestRef = useRef<EvidenceFlowRequest | null>(null);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [attendanceCivilDate, setAttendanceCivilDate] = useState(
    fallbackDashboardState.attendanceCivilDate,
  );
  const [lastAttendanceChange, setLastAttendanceChange] = useState<AttendanceChange | null>(null);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    phase: "hydrating",
    detail: "Bu cihazdaki veriler hazırlanıyor.",
    pendingWrites: 0,
  });
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [offlineReadiness, setOfflineReadiness] =
    useState<OfflineReadiness>("checking");
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
  const [studentSearch, setStudentSearch] = useState("");
  const [studentAddOpen, setStudentAddOpen] = useState(false);
  const [studentActionsOpenId, setStudentActionsOpenId] =
    useState<string | null>(null);
  const [todayWorkspace, setTodayWorkspace] = useState<TodayWorkspace>(emptyTodayWorkspace);
  const [evidenceWorkspace, setEvidenceWorkspace] =
    useState<EvidenceWorkspace>(emptyEvidenceWorkspace);
  const [planFlowOpen, setPlanFlowOpen] = useState(false);
  const [evidenceFlowRequest, setEvidenceFlowRequest] =
    useState<EvidenceFlowRequest | null>(null);
  const [classroomForm, setClassroomForm] = useState<ClassroomFormState>(initialClassroomForm);
  const [classroomError, setClassroomError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [recoverySnapshots, setRecoverySnapshots] = useState<
    RecoverySnapshotMetadata[]
  >([]);
  const [appLockSetting, setAppLockSetting] =
    useState<AppLockSettingRecord | null>(null);
  const [appLocked, setAppLocked] = useState(false);
  const [appLockPin, setAppLockPin] = useState("");
  const [appLockPinConfirm, setAppLockPinConfirm] = useState("");
  const [appUnlockPin, setAppUnlockPin] = useState("");
  const [appLockError, setAppLockError] = useState("");
  const [backupPassword, setBackupPassword] = useState("");
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [secureBackupError, setSecureBackupError] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState("Bu cihazdaki veriler hazırlanıyor.");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandaloneApp());
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseNotesExpanded, setReleaseNotesExpanded] = useState(false);
  const [releasePreviousVersion, setReleasePreviousVersion] =
    useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
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
  const dataHydrated =
    persistenceState.phase === "ready" || persistenceState.phase === "pending";
  const writesBlocked =
    !dataHydrated || persistenceState.phase === "error" || appLocked;

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
  const normalizedStudentSearch = studentSearch.trim().toLocaleLowerCase("tr-TR");
  const visibleStudents = useMemo(
    () =>
      [...students]
        .sort((left, right) =>
          (left.preferredName ?? left.name).localeCompare(
            right.preferredName ?? right.name,
            "tr-TR",
          ),
        )
        .filter((student) => {
          if (!normalizedStudentSearch) return true;
          return [student.name, student.preferredName ?? ""].some((value) =>
            value.toLocaleLowerCase("tr-TR").includes(normalizedStudentSearch),
          );
        }),
    [normalizedStudentSearch, students],
  );
  const observedStudentCount = students.filter(
    (student) => (observationCountByStudent.get(student.id) ?? 0) > 0,
  ).length;
  const activeSurface: AppSurface | null = evidenceFlowRequest
    ? "evidence-flow"
    : planFlowOpen
      ? "plan-flow"
      : studentProfileOpen
        ? "student-profile"
        : attendanceOpen
          ? "attendance"
          : childrenOpen
            ? "children"
            : classroomOpen
              ? "classroom"
              : plansOpen
                ? "plans"
                : documentsOpen
                  ? "documents"
                  : profileOpen
                    ? "settings"
                    : releaseNotesOpen
                      ? "release-notes"
                      : null;
  activeSurfaceRef.current = activeSurface;
  if (evidenceFlowRequest) {
    lastEvidenceFlowRequestRef.current = evidenceFlowRequest;
  }

  const shellStyle = {
    "--app-safe-top": `max(env(safe-area-inset-top, 0px), ${device.geometry.safeArea.top}px)`,
    "--app-bottom-inset": `max(env(safe-area-inset-bottom, 0px), ${bottomInset}px)`,
  } as CSSProperties;

  const applyPersistenceState = useCallback((next: PersistenceState) => {
    persistencePhaseRef.current = next.phase;
    persistenceStateRef.current = next;
    setPersistenceState(next);
  }, []);

  const markPersistenceFailure = useCallback(
    (detail: string) => {
      persistenceReadyRef.current = false;
      pendingWriteCountRef.current = 0;
      applyPersistenceState({
        phase: "error",
        detail,
        pendingWrites: 0,
      });
      setDataStatus(detail);
    },
    [applyPersistenceState],
  );

  const enqueuePersistence = <Result,>(
    operation: () => Promise<Result>,
    options: {
      failureDetail?: string;
      successDetail?: string;
    } = {},
  ): Promise<Result> => {
    if (!persistenceReadyRef.current) {
      return Promise.reject(
        new PersistenceUnavailableError(
          persistencePhaseRef.current === "hydrating"
            ? "Cihaz verileri henüz hazırlanıyor."
            : "Cihaz verileri güvenli yazma durumunda değil. Yeniden bağlanmayı deneyin.",
        ),
      );
    }

    pendingWriteCountRef.current += 1;
    applyPersistenceState({
      phase: "pending",
      detail: "Değişiklikler bu cihaza kaydediliyor.",
      pendingWrites: pendingWriteCountRef.current,
      ...(persistenceStateRef.current.lastCommittedAt
        ? { lastCommittedAt: persistenceStateRef.current.lastCommittedAt }
        : {}),
    });

    const queued = persistenceQueueRef.current.then(async () => {
      if (!persistenceReadyRef.current) {
        throw new PersistenceUnavailableError(
          "Önceki yazma işlemi başarısız olduğu için yeni değişiklik uygulanmadı.",
        );
      }
      return operation();
    });

    const tracked = queued.then(
      (result) => {
        pendingWriteCountRef.current = Math.max(
          0,
          pendingWriteCountRef.current - 1,
        );
        const committedAt = new Date().toISOString();
        const detail =
          options.successDetail ?? "Son değişiklik bu cihaza kaydedildi.";
        applyPersistenceState({
          phase: pendingWriteCountRef.current > 0 ? "pending" : "ready",
          detail:
            pendingWriteCountRef.current > 0
              ? "Bekleyen değişiklikler bu cihaza kaydediliyor."
              : detail,
          pendingWrites: pendingWriteCountRef.current,
          lastCommittedAt: committedAt,
        });
        setDataStatus(detail);
        return result;
      },
      (reason: unknown) => {
        const detail =
          options.failureDetail ??
          "Değişiklik bu cihaza kaydedilemedi. Yeni yazmalar güvenlik için durduruldu.";
        markPersistenceFailure(detail);
        throw reason;
      },
    );
    persistenceQueueRef.current = tracked.then(
      () => undefined,
      () => undefined,
    );
    return tracked;
  };

  const registerDraftFlusher = useCallback(
    (flusher: () => Promise<void>) => {
      pendingDraftFlushersRef.current.add(flusher);
      return () => {
        pendingDraftFlushersRef.current.delete(flusher);
      };
    },
    [],
  );

  const flushPendingWrites = useCallback(async () => {
    if (!persistenceReadyRef.current) {
      throw new PersistenceUnavailableError(
        "Cihaz verileri yazmaya hazır olmadığı için bekleyen kayıtlar doğrulanamadı.",
      );
    }
    const flushers = [...pendingDraftFlushersRef.current];
    await Promise.all(flushers.map((flush) => flush()));
    await persistenceQueueRef.current;
    if (!persistenceReadyRef.current || pendingWriteCountRef.current > 0) {
      throw new PersistenceUnavailableError(
        "Bekleyen değişikliklerin tamamı bu cihaza kaydedilemedi.",
      );
    }
  }, []);

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
    persistenceReadyRef.current = false;
    pendingWriteCountRef.current = 0;
    applyPersistenceState({
      phase: "hydrating",
      detail: "Bu cihazdaki veriler hazırlanıyor.",
      pendingWrites: 0,
    });
    setDataStatus("Bu cihazdaki veriler hazırlanıyor.");
    void Promise.all([
      loadDashboardState(store, fallbackDashboardState),
      loadTodayWorkspace(store),
      loadEvidenceWorkspace(store),
      loadAppLockSetting(store),
      backupService.listRecoverySnapshots(),
    ])
      .then(([state, workspace, evidence, lockSetting, snapshots]) => {
        if (cancelled) return;
        setStudents(state.students);
        setArchivedStudents(state.archivedStudents);
        setAttendanceCompleted(state.attendanceCompleted);
        setAttendanceCivilDate(state.attendanceCivilDate);
        setTodayWorkspace(workspace);
        setEvidenceWorkspace(evidence);
        setRecoverySnapshots(snapshots);
        if (lockSetting) {
          appLockSessionRef.current = new AppLockSession(
            lockSetting.config,
            lockSetting.attemptState,
          );
          setAppLockSetting(lockSetting);
          setAppLocked(true);
          setAppLockError("");
        } else {
          appLockSessionRef.current = null;
          setAppLockSetting(null);
          setAppLocked(false);
        }
        if (workspace.classroom.status === "configured") {
          const classroom = workspace.classroom;
          setClassroomForm((current) => ({
            ...current,
            classroomName: classroom.classroomName,
            academicYearName: classroom.academicYearName,
            academicYearStart: classroom.academicYearStart,
            academicYearEnd: classroom.academicYearEnd,
            ageGroup: classroom.ageGroup ?? "",
            curriculumProgram: classroom.curriculumProgram ?? "",
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
        const releaseState = inspectCurrentRelease();
        const isExistingInstallation =
          workspace.classroom.status === "configured";
        const isLegacyUpdate =
          releaseState.kind === "first_install" && isExistingInstallation;
        if (releaseState.shouldPresent || isLegacyUpdate) {
          setReleasePreviousVersion(releaseState.previousVersion);
          setReleaseNotesOpen(true);
          setAnnouncement(
            `MaarifOS ${CURRENT_RELEASE.version} sürümüne güncellendi.`,
          );
        } else if (releaseState.kind === "first_install") {
          acknowledgeCurrentRelease();
        }
        persistenceReadyRef.current = true;
        const hydratedAt = new Date().toISOString();
        applyPersistenceState({
          phase: "ready",
          detail: "Cihaz verileri açıldı ve yazmaya hazır.",
          pendingWrites: 0,
          lastCommittedAt: hydratedAt,
        });
        setDataStatus("Cihaz verileri açıldı ve yazmaya hazır.");
      })
      .catch(() => {
        if (cancelled) return;
        markPersistenceFailure(
          "Cihazdaki veriler açılamadı. Yeni kayıtlar güvenlik için durduruldu.",
        );
        setAnnouncement("Cihazdaki veriler açılamadı.");
      });
    return () => {
      cancelled = true;
      store.close();
    };
  }, [
    applyPersistenceState,
    hydrationAttempt,
    markPersistenceFailure,
    backupService,
    store,
  ]);

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
        if (!cancelled) {
          markPersistenceFailure(
            "Yeni gün verileri açılamadı. Yeni kayıtlar güvenlik için durduruldu.",
          );
          setAnnouncement(
            "Yeni gün verileri açılamadı. Cihaz verilerine yeniden bağlanın.",
          );
        }
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
  }, [attendanceCivilDate, dataHydrated, markPersistenceFailure, store]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setOfflineReadiness("unavailable");
      return;
    }
    const applyStatus = (status: PwaRuntimeStatus | undefined) => {
      if (!status) {
        setOfflineReadiness("checking");
        return;
      }
      setOfflineReadiness(
        status.offlineReady
          ? "ready"
          : status.phase === "error"
            ? "unavailable"
            : "checking",
      );
      if (status.phase === "update-ready") setUpdateReady(true);
    };
    const initial = (
      window as Window & { __maarifosPwaStatus?: PwaRuntimeStatus }
    ).__maarifosPwaStatus;
    applyStatus(initial);
    const handleStatus = (event: Event) => {
      applyStatus((event as CustomEvent<PwaRuntimeStatus>).detail);
    };
    window.addEventListener("maarifos:pwa-status", handleStatus);
    return () => {
      window.removeEventListener("maarifos:pwa-status", handleStatus);
    };
  }, []);

  useEffect(() => {
    if (!dataHydrated) return;
    const flushForLifecycle = () => {
      void flushPendingWrites().catch(() => {
        markPersistenceFailure(
          "Bekleyen değişiklikler uygulama kapanırken kaydedilemedi.",
        );
      });
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushForLifecycle();
    };
    window.addEventListener("pagehide", flushForLifecycle);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushForLifecycle);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [dataHydrated, flushPendingWrites, markPersistenceFailure]);

  useEffect(() => {
    const announceReadyUpdate = () => {
      setUpdateReady(true);
      setAnnouncement(
        "Yeni MaarifOS sürümü hazır. Kaydınızı tamamladıktan sonra güncelleyebilirsiniz.",
      );
    };

    window.addEventListener(PWA_UPDATE_READY_EVENT, announceReadyUpdate);
    return () =>
      window.removeEventListener(PWA_UPDATE_READY_EVENT, announceReadyUpdate);
  }, []);

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

  const activateAppLock = async () => {
    if (writesBlocked || appLockSetting) return;
    if (appLockPin.length < 6) {
      setAppLockError("Uygulama PIN’i en az 6 karakter olmalıdır.");
      return;
    }
    if (appLockPin !== appLockPinConfirm) {
      setAppLockError("Uygulama PIN’leri eşleşmiyor.");
      return;
    }
    const pin = appLockPin;
    setDataBusy(true);
    setAppLockError("");
    try {
      await flushPendingWrites();
      const config = await createAppLockConfig(pin);
      const session = new AppLockSession(config);
      const verification = await session.unlock(pin);
      if (!verification.verified) {
        throw new Error("Uygulama kilidi etkinleştirilemedi.");
      }
      const record = await enqueuePersistence(
        () =>
          persistAppLockSetting(
            store,
            config,
            verification.attemptState,
          ),
        {
          failureDetail:
            "Uygulama kilidi yapılandırması kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Uygulama kilidi bu cihazda etkinleştirildi.",
        },
      );
      appLockSessionRef.current = session;
      setAppLockSetting(record);
      setAppLocked(false);
      setAnnouncement(
        "Uygulama kilidi etkin. PIN yalnız doğrulama sırasında bellekte kullanıldı.",
      );
    } catch (reason) {
      setAppLockError(
        reason instanceof Error
          ? reason.message
          : "Uygulama kilidi etkinleştirilemedi.",
      );
    } finally {
      setAppLockPin("");
      setAppLockPinConfirm("");
      setDataBusy(false);
    }
  };

  const unlockApplication = async () => {
    const session = appLockSessionRef.current;
    const setting = appLockSetting;
    if (!session || !setting || appUnlockPin.length < 6 || dataBusy) return;
    const pin = appUnlockPin;
    setDataBusy(true);
    setAppLockError("");
    try {
      const result = await session.unlock(pin);
      const record = await enqueuePersistence(
        () =>
          persistAppLockSetting(
            store,
            setting.config,
            result.attemptState,
            setting.createdAt,
          ),
        {
          failureDetail:
            "Kilit deneme durumu kaydedilemedi. Uygulama kilitli kalacak.",
          successDetail: result.verified
            ? "Uygulama kilidi açıldı."
            : "Başarısız kilit denemesi güvenli biçimde kaydedildi.",
        },
      );
      setAppLockSetting(record);
      if (result.verified) {
        setAppLocked(false);
        setAppLockError("");
        setAnnouncement("MaarifOS kilidi açıldı.");
      } else {
        const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1_000));
        setAppLockError(
          result.status === "locked"
            ? `Çok sayıda deneme yapıldı. ${seconds} saniye sonra yeniden deneyin.`
            : `PIN doğrulanamadı. ${seconds} saniye sonra yeniden deneyin.`,
        );
      }
    } catch (reason) {
      setAppLockError(
        reason instanceof Error
          ? reason.message
          : "Uygulama kilidi açılamadı.",
      );
    } finally {
      setAppUnlockPin("");
      setDataBusy(false);
    }
  };

  const lockApplication = useCallback(
    async (announcementText = "MaarifOS kilitlendi.") => {
      const session = appLockSessionRef.current;
      if (!session) return;
      try {
        await flushPendingWrites();
        keyboard.hide();
        setPlanFlowOpen(false);
        setEvidenceFlowRequest(null);
        setProfileOpen(false);
      } catch {
        setAnnouncement(
          "Bekleyen kayıt doğrulanamadı; uygulama yine de gizlilik için kilitlendi.",
        );
      } finally {
        session.lock();
        setAppLocked(true);
        setAppUnlockPin("");
        setAnnouncement(announcementText);
      }
    },
    [flushPendingWrites, keyboard],
  );

  const removeAppLock = async () => {
    if (!appLockSetting || appLocked || writesBlocked) return;
    setDataBusy(true);
    setAppLockError("");
    try {
      await flushPendingWrites();
      await enqueuePersistence(
        () =>
          store.transaction(
            "readwrite",
            ["settings"],
            async (transaction) => {
              const settings = await transaction.getAll("settings");
              await transaction.clear("settings");
              await transaction.putMany(
                "settings",
                settings.filter(
                  (record) => record.id !== APP_LOCK_SETTING_ID,
                ),
              );
            },
          ),
        {
          failureDetail:
            "Uygulama kilidi kaldırılamadı. Yeni yazmalar durduruldu.",
          successDetail: "Uygulama kilidi bu cihazdan kaldırıldı.",
        },
      );
      appLockSessionRef.current = null;
      setAppLockSetting(null);
      setAppLocked(false);
      setAnnouncement("Uygulama kilidi bu cihazdan kaldırıldı.");
    } catch (reason) {
      setAppLockError(
        reason instanceof Error
          ? reason.message
          : "Uygulama kilidi kaldırılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  useEffect(() => {
    if (!appLockSetting || appLocked) return;
    let idleTimer = 0;
    const scheduleIdleLock = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(
        () =>
          void lockApplication(
            "MaarifOS 5 dakika işlem yapılmadığı için kilitlendi.",
          ),
        5 * 60 * 1_000,
      );
    };
    const lockWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        void lockApplication(
          "MaarifOS arka plana geçtiği için gizlilik amacıyla kilitlendi.",
        );
      } else {
        scheduleIdleLock();
      }
    };
    scheduleIdleLock();
    window.addEventListener("pointerdown", scheduleIdleLock, {
      passive: true,
    });
    window.addEventListener("keydown", scheduleIdleLock);
    document.addEventListener("visibilitychange", lockWhenHidden);
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("pointerdown", scheduleIdleLock);
      window.removeEventListener("keydown", scheduleIdleLock);
      document.removeEventListener("visibilitychange", lockWhenHidden);
    };
  }, [appLockSetting, appLocked, lockApplication]);

  const createBackup = async (prefix = "maarifos-backup") => {
    if (writesBlocked) {
      setAnnouncement(
        "Cihaz verileri doğrulanamadığı için yedek oluşturma güvenlik için durduruldu.",
      );
      return null;
    }
    if (backupPassword.length < 10) {
      setSecureBackupError("Yedek parolası en az 10 karakter olmalıdır.");
      return null;
    }
    if (backupPassword !== backupPasswordConfirm) {
      setSecureBackupError("Yedek parolaları eşleşmiyor.");
      return null;
    }
    const password = backupPassword;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      await flushPendingWrites();
      const envelope = await backupService.exportEncryptedBackup(password);
      const serialized = backupService.serializeEncryptedBackup(envelope);
      await backupService.parseAndDecryptBackup(serialized, password);
      const civilDate = envelope.encryption.createdAt.slice(0, 10);
      downloadJson(`${prefix}-${civilDate}.maarifos`, serialized);
      setDataStatus(`Şifreli yedek doğrulandı · ${civilDate}`);
      setAnnouncement("Parola korumalı MaarifOS yedeği oluşturuldu.");
      return envelope;
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Şifreli yedek oluşturulamadı.";
      setSecureBackupError(message);
      setDataStatus("Şifreli yedek oluşturulamadı.");
      setAnnouncement("Yedek oluşturulamadı.");
      return null;
    } finally {
      setBackupPassword("");
      setBackupPasswordConfirm("");
      setDataBusy(false);
    }
  };

  const inspectRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    setDataBusy(true);
    setPendingRestore(null);
    setRestorePassword("");
    setSecureBackupError("");
    try {
      if (file.size > 32 * 1024 * 1024) {
        throw new Error("Yedek dosyası 32 MB sınırını aşıyor.");
      }
      const source = await file.text();
      let candidate: unknown;
      try {
        candidate = JSON.parse(source);
      } catch {
        throw new Error("Yedek dosyası geçerli JSON değil.");
      }
      if (isEncryptedBackupEnvelope(candidate)) {
        setPendingRestore({
          fileName: file.name,
          source,
          encryption: "encrypted",
          envelope: null,
        });
        setDataStatus(
          "Şifreli yedek tanındı. İçeriği doğrulamak için parolayı girin.",
        );
        setAnnouncement("Şifreli yedek seçildi; parola bekleniyor.");
      } else {
        const envelope = await backupService.parseAndVerifyBackup(source);
        setPendingRestore({
          fileName: file.name,
          source,
          encryption: "legacy-plaintext",
          envelope,
        });
        setDataStatus(
          "Eski düz metin yedek doğrulandı. Geri yüklemeden sonra yeni şifreli yedek oluşturun.",
        );
        setAnnouncement("Eski düz metin yedek doğrulandı.");
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Bu yedek açılamadı.";
      setSecureBackupError(message);
      setDataStatus(
        "Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor.",
      );
      setAnnouncement("Yedek dosyası doğrulanamadı.");
    } finally {
      setDataBusy(false);
      if (restoreFileRef.current) restoreFileRef.current.value = "";
    }
  };

  const unlockRestorePreview = async () => {
    if (!pendingRestore || pendingRestore.encryption !== "encrypted") return;
    if (restorePassword.length < 10) {
      setSecureBackupError("Yedek parolası en az 10 karakter olmalıdır.");
      return;
    }
    const password = restorePassword;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      const envelope = await backupService.parseAndDecryptBackup(
        pendingRestore.source,
        password,
      );
      setPendingRestore((current) =>
        current
          ? {
              ...current,
              envelope,
            }
          : null,
      );
      setDataStatus(
        "Şifreli yedek doğrulandı. Geri yükleme modunu seçin.",
      );
      setAnnouncement("Şifreli yedek içeriği doğrulandı.");
    } catch (reason) {
      setRestorePassword("");
      setSecureBackupError(
        reason instanceof Error
          ? reason.message
          : "Yedek parolası doğrulanamadı.",
      );
      setAnnouncement("Yedek parolası doğrulanamadı.");
    } finally {
      setDataBusy(false);
    }
  };

  const confirmRestore = async (mode: RestoreMode) => {
    if (
      !pendingRestore ||
      !pendingRestore.envelope ||
      writesBlocked ||
      (pendingRestore.encryption === "encrypted" &&
        restorePassword.length < 10)
    ) {
      return;
    }
    const restoreRequest = pendingRestore;
    const password = restorePassword;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      await flushPendingWrites();
      const { report, recovery } = await enqueuePersistence(
        async () => {
          const recovery = await backupService.createRecoverySnapshot(
            "before-restore",
          );
          const report =
            restoreRequest.encryption === "encrypted"
              ? await backupService.restoreEncryptedBackup(
                  restoreRequest.source,
                  password,
                  {
                    mode,
                    createRecoverySnapshot: false,
                  },
                )
              : await backupService.restoreBackup(restoreRequest.source, {
                  mode,
                  createRecoverySnapshot: false,
                });
          return { report, recovery };
        },
        {
          failureDetail:
            "Geri yükleme tamamlanamadı. Yeni yazmalar güvenlik için durduruldu.",
          successDetail:
            "Kalıcı kurtarma noktası oluşturuldu ve geri yükleme atomik tamamlandı.",
        },
      );
      const [
        restored,
        restoredWorkspace,
        restoredEvidence,
        restoredLockSetting,
        snapshots,
      ] = await Promise.all([
        loadDashboardState(store, fallbackDashboardState),
        loadTodayWorkspace(store),
        loadEvidenceWorkspace(store),
        loadAppLockSetting(store),
        backupService.listRecoverySnapshots(),
      ]);
      setStudents(restored.students);
      setArchivedStudents(restored.archivedStudents);
      setAttendanceCompleted(restored.attendanceCompleted);
      setAttendanceCivilDate(restored.attendanceCivilDate);
      setLastAttendanceChange(null);
      setTodayWorkspace(restoredWorkspace);
      setEvidenceWorkspace(restoredEvidence);
      setRecoverySnapshots(snapshots);
      if (restoredLockSetting) {
        appLockSessionRef.current = new AppLockSession(
          restoredLockSetting.config,
          restoredLockSetting.attemptState,
        );
        setAppLockSetting(restoredLockSetting);
        setAppLocked(true);
      } else {
        appLockSessionRef.current = null;
        setAppLockSetting(null);
        setAppLocked(false);
      }
      if (restoredWorkspace.classroom.status === "configured") {
        const classroom = restoredWorkspace.classroom;
        setClassroomForm((current) => ({
          ...current,
          classroomName: classroom.classroomName,
          academicYearName: classroom.academicYearName,
          academicYearStart: classroom.academicYearStart,
          academicYearEnd: classroom.academicYearEnd,
          ageGroup: classroom.ageGroup ?? "",
          curriculumProgram: classroom.curriculumProgram ?? "",
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
      setRestorePassword("");
      setDataStatus(
        `Geri yükleme tamamlandı · kurtarma noktası ${recovery.createdAt} · ${report.inserted} eklendi, ${report.skipped} aynı kayıt atlandı, ${report.conflicts.length} çakışma`,
      );
      setAnnouncement("Yedek başarıyla geri yüklendi.");
    } catch (reason) {
      setSecureBackupError(
        reason instanceof Error
          ? reason.message
          : "Geri yükleme tamamlanamadı.",
      );
      setDataStatus("Geri yükleme tamamlanamadı; mevcut veriler korunuyor.");
      setAnnouncement("Geri yükleme başarısız oldu.");
    } finally {
      setRestorePassword("");
      setDataBusy(false);
    }
  };

  const updateStudentStatus = (studentId: string) => {
    if (
      !persistenceReadyRef.current ||
      pendingWriteCountRef.current > 0 ||
      dataBusy
    ) {
      setAnnouncement(
        "Önce bekleyen kaydın tamamlanmasını veya cihaz verilerinin yeniden açılmasını bekleyin.",
      );
      return;
    }
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    const mutationSequence = attendanceMutationSequenceRef.current + 1;
    attendanceMutationSequenceRef.current = mutationSequence;
    const status = nextStatus(student.status);
    const previousAttendanceCompleted = attendanceCompleted;
    const previousLastAttendanceChange = lastAttendanceChange;
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
    void enqueuePersistence(
      () =>
        persistAttendanceUpdate(store, {
          students: [{ ...student, status }],
          attendanceCivilDate,
          attendanceCompleted: false,
        }),
      {
        failureDetail:
          "Devam değişikliği bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
        successDetail: `${student.name} için devam durumu kaydedildi.`,
      },
    ).catch(() => {
      if (attendanceMutationSequenceRef.current === mutationSequence) {
        setStudents((current) =>
          current.map((item) =>
            item.id === studentId
              ? { ...item, status: student.status }
              : item,
          ),
        );
        setAttendanceCompleted(previousAttendanceCompleted);
        setLastAttendanceChange(previousLastAttendanceChange);
      }
      setAnnouncement(
        "Yoklama değişikliği kaydedilemedi ve ekrandaki değişiklik geri alındı.",
      );
    });
  };

  const undoAttendanceChange = () => {
    if (
      !lastAttendanceChange ||
      !persistenceReadyRef.current ||
      pendingWriteCountRef.current > 0 ||
      dataBusy
    ) {
      if (lastAttendanceChange) {
        setAnnouncement(
          "Geri almadan önce bekleyen kaydın tamamlanmasını bekleyin.",
        );
      }
      return;
    }
    const mutationSequence = attendanceMutationSequenceRef.current + 1;
    attendanceMutationSequenceRef.current = mutationSequence;
    const changeToUndo = lastAttendanceChange;
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
      void enqueuePersistence(
        () =>
          persistAttendanceUpdate(store, {
            students: [{ ...student, status: changeToUndo.previousStatus }],
            attendanceCivilDate,
            attendanceCompleted: false,
          }),
        {
          failureDetail:
            "Geri alma işlemi bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${student.name} için geri alma kaydedildi.`,
        },
      ).catch(() => {
        if (attendanceMutationSequenceRef.current === mutationSequence) {
          setStudents((current) =>
            current.map((item) =>
              item.id === student.id
                ? { ...item, status: changeToUndo.nextStatus }
                : item,
            ),
          );
          setLastAttendanceChange(changeToUndo);
        }
        setAnnouncement(
          "Geri alma kaydedilemedi; ekrandaki önceki durum geri getirildi.",
        );
      });
    }
  };

  const completeAttendance = async () => {
    if (writesBlocked) return;
    setDataBusy(true);
    try {
      await flushPendingWrites();
      await enqueuePersistence(
        () =>
          persistAttendanceUpdate(store, {
            students: [],
            attendanceCivilDate,
            attendanceCompleted: true,
          }),
        {
          failureDetail:
            "Devam durumu bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Bugünün devam durumu tamamlandı ve kaydedildi.",
        },
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
      setStudentAddOpen(false);
      setStudentSearch("");
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
    setStudentActionsOpenId(null);
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
      setStudentActionsOpenId(null);
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
    if (writesBlocked) {
      setClassroomError(
        "Cihaz verileri yazmaya hazır değil. Önce yeniden bağlanmayı deneyin.",
      );
      return;
    }
    const selectedProgram = classroomForm.curriculumProgram;
    const selectedScheduleKind = classroomForm.scheduleKind;
    if (
      !classroomForm.classroomName.trim() ||
      !classroomForm.academicYearName.trim() ||
      !classroomForm.academicYearStart ||
      !classroomForm.academicYearEnd ||
      !classroomForm.ageGroup ||
      !isSupportedCurriculumProgram(selectedProgram) ||
      !selectedScheduleKind ||
      !classroomForm.startTime ||
      !classroomForm.endTime ||
      !classroomForm.curriculumCatalogId.trim() ||
      !classroomForm.curriculumSourceVersion.trim()
    ) {
      setClassroomError(
        "Sınıf, yaş grubu, program, çalışma düzeni ve saatleri açıkça seçin.",
      );
      return;
    }
    setDataBusy(true);
    setClassroomError("");
    try {
      const framework = curriculumFrameworkForProgram(selectedProgram);
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
      const context = await enqueuePersistence(
        () =>
          saveClassroomConfiguration(store, {
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
              curriculumProgram: selectedProgram,
              curriculumCatalogLabel:
                `${classroomForm.curriculumCatalogId.trim()} · ${classroomForm.curriculumSourceVersion.trim()}`,
              curriculumProfile,
            },
            schedule: {
              kind: selectedScheduleKind,
              startTime: classroomForm.startTime,
              endTime: classroomForm.endTime,
            },
          }),
        {
          failureDetail:
            "Sınıf ayarları bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Sınıf ve çalışma düzeni bu cihaza kaydedildi.",
        },
      );
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

  const chooseScheduleKind = (kind: ClassroomScheduleKind | "") => {
    if (!kind) {
      setClassroomForm((current) => ({
        ...current,
        scheduleKind: "",
        startTime: "",
        endTime: "",
      }));
      return;
    }
    const preset = kind === "custom" ? null : schedulePresets[kind];
    setClassroomForm((current) => ({
      ...current,
      scheduleKind: kind,
      ...(preset ?? {}),
    }));
  };

  const completeCurrentActivity = async () => {
    if (!currentActivity || writesBlocked) return;
    setDataBusy(true);
    try {
      await enqueuePersistence(
        () => setTodayActivityStatus(store, currentActivity.id, "completed"),
        {
          failureDetail:
            "Etkinlik durumu bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${currentActivity.title} tamamlandı olarak kaydedildi.`,
        },
      );
      await refreshD1Workspaces();
      setAnnouncement(`${currentActivity.title} tamamlandı.`);
    } catch {
      setAnnouncement("Etkinlik durumu kaydedilemedi; mevcut kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const closeD1Flow = async (): Promise<boolean> => {
    try {
      await flushPendingWrites();
    } catch {
      setAnnouncement(
        "Bekleyen gözlem taslağı kaydedilemediği için ekran kapatılmadı.",
      );
      return false;
    }
    keyboard.hide();
    setPlanFlowOpen(false);
    setEvidenceFlowRequest(null);
    setActiveNav("today");
    const returnFocusTarget = d1ReturnFocusRef.current;
    d1ReturnFocusRef.current = null;
    window.requestAnimationFrame(() => returnFocusTarget?.focus());
    return true;
  };

  const restoreAppSurface = useCallback((surface: AppSurface | null) => {
    const evidenceRequest =
      surface === "evidence-flow" ? lastEvidenceFlowRequestRef.current : null;
    const restorableSurface =
      surface === "evidence-flow" && !evidenceRequest ? null : surface;

    setAttendanceOpen(restorableSurface === "attendance");
    setChildrenOpen(restorableSurface === "children");
    setStudentProfileOpen(restorableSurface === "student-profile");
    setProfileOpen(restorableSurface === "settings");
    setClassroomOpen(restorableSurface === "classroom");
    setPlansOpen(restorableSurface === "plans");
    setDocumentsOpen(restorableSurface === "documents");
    setReleaseNotesOpen(restorableSurface === "release-notes");
    setPlanFlowOpen(restorableSurface === "plan-flow");
    setEvidenceFlowRequest(evidenceRequest);
    setStudentActionsOpenId(null);
    setActiveNav(
      restorableSurface === "children"
        ? "classroom"
        : restorableSurface === "plans"
          ? "plans"
          : restorableSurface === "documents"
            ? "documents"
            : "today",
    );
  }, []);

  useEffect(() => {
    if (!native) return;

    window.history.replaceState(
      appHistoryState(null),
      "",
      window.location.href,
    );
    historyInitializedRef.current = true;
    historySurfaceRef.current = null;

    const applyHistoryTarget = (surface: AppSurface | null) => {
      historyRestoringRef.current = true;
      historySurfaceRef.current = surface;
      surfaceTransitionRef.current = null;
      keyboard.hide();
      restoreAppSurface(surface);
      if (activeSurfaceRef.current === surface) {
        historyRestoringRef.current = false;
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      const targetSurface = appSurfaceFromHistoryState(event.state);
      const currentSurface = activeSurfaceRef.current;
      if (
        currentSurface !== "plan-flow" &&
        currentSurface !== "evidence-flow"
      ) {
        applyHistoryTarget(targetSurface);
        return;
      }

      void flushPendingWrites()
        .then(() => {
          d1ReturnFocusRef.current = null;
          applyHistoryTarget(targetSurface);
        })
        .catch(() => {
          window.history.pushState(
            appHistoryState(currentSurface),
            "",
            window.location.href,
          );
          historySurfaceRef.current = currentSurface;
          historyRestoringRef.current = false;
          setAnnouncement(
            "Bekleyen gözlem taslağı kaydedilemediği için geri işlemi durduruldu.",
          );
        });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      historyInitializedRef.current = false;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [native, restoreAppSurface]);

  useEffect(() => {
    if (!native || !historyInitializedRef.current) return;

    if (historyRestoringRef.current) {
      if (activeSurface === historySurfaceRef.current) {
        historyRestoringRef.current = false;
      }
      return;
    }

    const transitionTarget = surfaceTransitionRef.current;
    if (transitionTarget && activeSurface !== transitionTarget) return;

    const previousSurface = historySurfaceRef.current;
    if (activeSurface === previousSurface) {
      surfaceTransitionRef.current = null;
      return;
    }

    if (activeSurface === null) {
      if (previousSurface !== null) {
        historyRestoringRef.current = true;
        window.history.back();
      }
      return;
    }

    const replaceCurrentEntry =
      previousSurface === "plan-flow" ||
      previousSurface === "evidence-flow";
    const method = replaceCurrentEntry ? "replaceState" : "pushState";
    window.history[method](
      appHistoryState(activeSurface),
      "",
      window.location.href,
    );
    historySurfaceRef.current = activeSurface;
    surfaceTransitionRef.current = null;
  }, [activeSurface, native]);

  const openPlanFlow = () => {
    if (writesBlocked) {
      setAnnouncement(
        "Cihaz verileri yazmaya hazır değil. Plan oluşturma güvenlik için kapalı.",
      );
      return;
    }
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
    d1ReturnFocusRef.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    surfaceTransitionRef.current = "plan-flow";
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
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDataBusy(true);
    try {
      if (selected.status === "planned") {
        await enqueuePersistence(
          () => setTodayActivityStatus(store, selected.id, "in_progress"),
          {
            failureDetail:
              "Etkinlik başlatılamadı. Yeni yazmalar güvenlik için durduruldu.",
            successDetail: `${selected.title} uygulanıyor olarak kaydedildi.`,
          },
        );
      }
      const refreshed = await refreshD1Workspaces();
      const activity = refreshed.evidence.activities.find((item) => item.id === selected.id);
      if (!activity) throw new Error("Etkinlik yeniden yüklenemedi.");
      d1ReturnFocusRef.current ??= returnFocusTarget;
      surfaceTransitionRef.current = "evidence-flow";
      setStudentProfileOpen(false);
      setChildrenOpen(false);
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
    if (writesBlocked) {
      setAnnouncement(
        "Cihaz verileri yazmaya hazır değil. Hızlı gözlem güvenlik için kapalı.",
      );
      return;
    }
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
      await openActivityEvidence(activeActivity.id, studentId);
      return;
    }

    setDataBusy(true);
    setStudentProfileError("");
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    try {
      const context = await enqueuePersistence(
        () =>
          ensureSpontaneousObservationContext(store, {
            studentId,
            civilDate: attendanceCivilDate,
          }),
        {
          failureDetail:
            "Anlık gözlem bağlamı kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${student.name} için anlık gözlem alanı hazırlandı.`,
        },
      );
      const refreshed = await refreshD1Workspaces();
      const activity = refreshed.evidence.activities.find(
        (item) => item.id === context.activity.id,
      );
      if (!activity) {
        throw new Error("Anlık gözlem bağlamı yeniden açılamadı.");
      }
      keyboard.hide();
      d1ReturnFocusRef.current ??= returnFocusTarget;
      surfaceTransitionRef.current = "evidence-flow";
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
    d1ReturnFocusRef.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setEvidenceFlowRequest({ activity, pendingObservation: pending });
  };

  const createPlanAndStart = async (command: PlanCreationCommand) => {
    if (!configuredClassroom?.curriculumProfile) {
      throw new Error("Sınıfın program profili tamamlanmalıdır.");
    }
    const curriculumProfile = configuredClassroom.curriculumProfile;
    const result = await enqueuePersistence(
      async () => {
        const created = await createPlanWithActivity(store, {
          civilDate: todayWorkspace.civilDate,
          ...command,
          curriculumProfile,
        });
        await setTodayActivityStatus(store, created.activity.id, "in_progress");
        return created;
      },
      {
        failureDetail:
          "Günlük plan bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
        successDetail: "Günlük plan ve ilk etkinlik bu cihaza kaydedildi.",
      },
    );
    const refreshed = await refreshD1Workspaces();
    const activity = refreshed.evidence.activities.find(
      (item) => item.id === result.activity.id,
    );
    if (!activity) throw new Error("Kaydedilen etkinlik yeniden açılamadı.");
    surfaceTransitionRef.current = "evidence-flow";
    setPlanFlowOpen(false);
    setEvidenceFlowRequest({ activity });
    setAnnouncement(`${activity.title} başladı. İlk gözlem notunu ekleyebilirsiniz.`);
  };

  const evidenceFlowActions: EvidenceFlowActions = {
    close: closeD1Flow,
    manageChildren: async () => {
      surfaceTransitionRef.current = "children";
      if (await closeD1Flow()) {
        setChildrenOpen(true);
      } else {
        surfaceTransitionRef.current = null;
      }
    },
    registerDraftFlusher,
    loadDraft: (activity, studentId) =>
      loadQuickObservationDraft(store, {
        studentId,
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      }),
    saveDraft: (activity, input) =>
      enqueuePersistence(
        () =>
          persistQuickObservationDraft(store, {
            ...input,
            planId: activity.planId,
            activityId: activity.id,
          }),
        {
          failureDetail:
            "Gözlem taslağı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Gözlem taslağı bu cihazda korundu.",
        },
      ),
    saveDraftBatch: async (activity, input) => {
      await enqueuePersistence(
        () =>
          persistQuickObservationDraftBatch(store, {
            ...input,
            planId: activity.planId,
            activityId: activity.id,
          }),
        {
          failureDetail:
            "Toplu gözlem taslağı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Toplu gözlem taslağı bu cihazda korundu.",
        },
      );
    },
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
      const result = await enqueuePersistence(
        async () => {
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
          return finalizeQuickObservationDraft(store, {
            studentId,
            observationId,
            observedAt,
            planId: activity.planId,
            activityId: activity.id,
            taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
          });
        },
        {
          failureDetail:
            "Gözlem notu bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Gözlem notu değiştirilemez ham kayıt olarak kaydedildi.",
        },
      );
      const refreshed = await refreshD1Workspaces();
      const observation = [
        ...refreshed.evidence.pendingObservations,
        ...refreshed.evidence.linkedObservations,
      ].find((item) => item.id === result.observation.id);
      if (!observation) throw new Error("Kaydedilen gözlem notu yeniden açılamadı.");
      setAnnouncement(`${observation.studentName} için gözlem notu kaydedildi.`);
      return observation;
    },
    captureBatch: async (activity, input) => {
      const observedAt = new Date().toISOString();
      const result = await enqueuePersistence(
        async () => {
          await persistQuickObservationDraftBatch(store, {
            ...input,
            planId: activity.planId,
            activityId: activity.id,
          });
          return finalizeQuickObservationDraftBatch(store, {
            studentIds: input.studentIds,
            planId: activity.planId,
            activityId: activity.id,
            taxonomyVersion: input.taxonomyVersion,
            batchId: input.batchId,
            observedAt,
          });
        },
        {
          failureDetail:
            "Toplu gözlem notları bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Toplu gözlem, her çocuk için ayrı ham kayıt olarak kaydedildi.",
        },
      );
      await refreshD1Workspaces();
      setAnnouncement(
        `${result.observations.length} çocuk için ayrı gözlem notları kaydedildi.`,
      );
      return result.observations.length;
    },
    confirm: async (observation, target) => {
      const isPlannedTarget = observation.plannedCurriculumTargets.some(
        (planned) => planned.id === target.id,
      );
      await enqueuePersistence(
        () =>
          confirmObservationCurriculumLink(store, {
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
          }),
        {
          failureDetail:
            "Program bağlantısı kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Program bağlantısı öğretmen onayıyla kaydedildi.",
        },
      );
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
      await enqueuePersistence(
        () =>
          createCitedAssessmentDraft(store, {
            draftId,
            studentId: observation.studentId,
            observationIds: [observation.id],
            teacherAssessmentText,
            assessmentLevel,
            assessmentTargetIds,
            periodStart: observation.civilDate,
            periodEnd: observation.civilDate,
          }),
        {
          failureDetail:
            "Değerlendirme taslağı kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Kanıta dayalı değerlendirme taslağı kaydedildi.",
        },
      );
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

  const completeReleaseNotice = () => {
    acknowledgeCurrentRelease();
    setReleaseNotesOpen(false);
    setReleasePreviousVersion(null);
    setAnnouncement(
      `MaarifOS ${CURRENT_RELEASE.version} sürüm notları okundu.`,
    );
  };

  const applyReadyUpdate = () => {
    setUpdateReady(false);
    setAnnouncement("MaarifOS güncelleniyor.");
    window.dispatchEvent(new CustomEvent("maarifos:apply-update"));
  };

  const retryPersistence = () => {
    if (persistenceState.phase !== "error") return;
    setAnnouncement("Cihaz verilerine yeniden bağlanılıyor.");
    setHydrationAttempt((current) => current + 1);
  };

  const syncStateView =
    persistenceState.phase === "hydrating"
      ? {
          label: "Cihaz verileri hazırlanıyor",
          className: "is-hydrating",
          icon: <ClockIcon aria-hidden="true" />,
        }
      : persistenceState.phase === "pending"
        ? {
            label: `Kaydediliyor · ${persistenceState.pendingWrites} bekleyen değişiklik`,
            className: "is-pending",
            icon: <ClockIcon aria-hidden="true" />,
          }
        : persistenceState.phase === "error"
          ? {
              label: "Kayıt durdu · yeniden bağlanın",
              className: "is-error",
              icon: <Cross2Icon aria-hidden="true" />,
            }
          : offlineReadiness === "ready"
            ? {
                label: "Kaydedildi · Çevrimdışı hazır",
                className: "is-ready",
                icon: <CheckCircledIcon aria-hidden="true" />,
              }
            : offlineReadiness === "unavailable"
              ? {
                  label: "Kaydedildi · Çevrimdışı kullanım desteklenmiyor",
                  className: "is-warning",
                  icon: <CheckCircledIcon aria-hidden="true" />,
                }
              : {
                  label: "Kaydedildi · Çevrimdışı hazırlık denetleniyor",
                  className: "is-checking",
                  icon: <ClockIcon aria-hidden="true" />,
                };
  const securityGateOpen =
    appLocked ||
    persistenceState.phase === "hydrating" ||
    persistenceState.phase === "error";

  return (
    <div
      className="maarif-app-shell"
      style={shellStyle}
      aria-busy={
        persistenceState.phase === "hydrating" ||
        persistenceState.phase === "pending"
      }
    >
      <div
        className="maarif-app-content"
        inert={securityGateOpen}
        aria-hidden={securityGateOpen ? true : undefined}
      >
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
            <p
              className={`sync-state ${syncStateView.className}`}
              data-testid="persistence-status"
              role="status"
              aria-live="polite"
            >
              {syncStateView.icon}
              {syncStateView.label}
            </p>
          </header>

          {updateReady ? (
            <section className="update-ready-card" aria-labelledby="update-ready-title">
              <span className="update-ready-icon" aria-hidden="true">
                <MagicWandIcon />
              </span>
              <span className="update-ready-copy">
                <strong id="update-ready-title">Yeni sürüm hazır</strong>
                <small>Kaydınızı tamamladıysanız güvenle güncelleyin.</small>
              </span>
              <button type="button" onClick={applyReadyUpdate}>
                Şimdi güncelle
              </button>
            </section>
          ) : null}

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
                <option value="">Yaş grubunu seçin</option>
                <option>36–48 ay</option>
                <option>48–60 ay</option>
                <option>60–72 ay</option>
              </select>
            </label>
            <label htmlFor="schedule-kind">Çalışma düzeni
              <select
                id="schedule-kind"
                value={classroomForm.scheduleKind}
                onChange={(event) =>
                  chooseScheduleKind(
                    event.target.value as ClassroomScheduleKind | "",
                  )
                }
              >
                <option value="">Çalışma düzenini seçin</option>
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
              if (!isSupportedCurriculumProgram(curriculumProgram)) {
                setClassroomForm((current) => ({
                  ...current,
                  curriculumProgram: "",
                  curriculumCatalogId: "",
                  curriculumSourceVersion: "",
                }));
                return;
              }
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
            <option value="">Emin değilim / henüz seçmedim</option>
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
                disabled={!isSupportedCurriculumProgram(classroomForm.curriculumProgram)}
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
                disabled={!isSupportedCurriculumProgram(classroomForm.curriculumProgram)}
              />
            </label>
          </div>
          <p className="classroom-provenance-note">
            Programı siz seçtiğinizde resmî MEB başlangıç kataloğu önerilir.
            Kimlik veya sürümü değiştirirseniz kayıt öğretmen beyanı olarak
            işaretlenir; seçim yapılmadan planlama açılmaz.
          </p>

          <div className="settings-grid">
            <label htmlFor="schedule-start">Başlangıç
              <input
                id="schedule-start"
                type="time"
                value={classroomForm.startTime}
                onChange={(event) =>
                  setClassroomForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                disabled={!classroomForm.scheduleKind}
              />
            </label>
            <label htmlFor="schedule-end">Bitiş
              <input
                id="schedule-end"
                type="time"
                value={classroomForm.endTime}
                onChange={(event) =>
                  setClassroomForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                disabled={!classroomForm.scheduleKind}
              />
            </label>
          </div>
          <p>Bu düzen yalnız sınıf ayarlarından değiştirilir; Bugün ekranında bilgi olarak gösterilir.</p>
          {classroomError ? <p role="alert">{classroomError}</p> : null}
          <button
            className="sheet-primary"
            type="submit"
            disabled={
              dataBusy ||
              writesBlocked ||
              !classroomForm.classroomName.trim() ||
              !classroomForm.academicYearName.trim() ||
              !classroomForm.academicYearStart ||
              !classroomForm.academicYearEnd ||
              !classroomForm.ageGroup ||
              !isSupportedCurriculumProgram(classroomForm.curriculumProgram) ||
              !classroomForm.scheduleKind ||
              !classroomForm.startTime ||
              !classroomForm.endTime ||
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
        description="Belge üretimi henüz pilot kullanıma açılmadı"
        snap={0.7}
      >
        <section className="documents-coming-soon" role="status">
          <span aria-hidden="true"><ArchiveIcon /></span>
          <small>Deneysel alan</small>
          <h3>Belge üretimi henüz hazır değil</h3>
          <p>
            Bu sürüm PDF, gelişim raporu veya resmî belge üretmez. Önizleme,
            öğrenci izolasyonu ve doğrulanmış dışa aktarma tamamlanmadan burada
            belge varmış gibi bir çıktı sunulmayacak.
          </p>
          <strong>
            Bugünkü veri özeti: {students.length} çocuk · {counts.present} geldi
            · {counts.late} geç geldi · {counts.absent} gelmedi
          </strong>
          <button
            type="button"
            onClick={() => {
              setDocumentsOpen(false);
              setProfileOpen(true);
              setActiveNav("today");
            }}
          >
            Yedek ve veri güvenliğine git
          </button>
        </section>
      </BottomSheet>

      <BottomSheet
        open={childrenOpen}
        onOpenChange={(open) => {
          if (!open) {
            keyboard.hide();
            setStudentActionsOpenId(null);
            setStudentAddOpen(false);
            setStudentSearch("");
          }
          setChildrenOpen(open);
        }}
        title="Sınıfım"
        description={`${students.length} sınıfta · ${archivedStudents.length} sınıftan ayrılmış çocuk`}
        snap={1}
      >
        <div className="roster-overview" aria-label="Sınıf özeti">
          <div>
            <strong>{students.length}</strong>
            <span>Aktif çocuk</span>
          </div>
          <div>
            <strong>{counts.present}</strong>
            <span>Bugün geldi</span>
          </div>
          <div>
            <strong>
              {observedStudentCount}/{students.length}
            </strong>
            <span>Gözlem izi</span>
          </div>
        </div>

        <div className="roster-toolbar">
          <div className="roster-search">
            <MagnifyingGlassIcon aria-hidden="true" />
            <KeyboardInput
              aria-label="Çocuk ara"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Çocuk ara"
              autoComplete="off"
            />
            {studentSearch ? (
              <button
                type="button"
                onClick={() => setStudentSearch("")}
                aria-label="Aramayı temizle"
              >
                <Cross2Icon aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button
            className="roster-add-trigger"
            type="button"
            onClick={() => {
              setStudentActionsOpenId(null);
              setStudentAddOpen((current) => !current);
            }}
            aria-expanded={studentAddOpen}
            aria-controls="student-add-form"
          >
            <PlusIcon aria-hidden="true" />
            Çocuk ekle
          </button>
        </div>

        {studentAddOpen ? (
          <form
            id="student-add-form"
            className="children-form roster-add-form"
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
              <button type="submit" disabled={!newStudentName.trim() || dataBusy}>
                Ekle
              </button>
            </div>
          </form>
        ) : null}

        <section
          className="children-section roster-section"
          aria-labelledby="active-students-heading"
        >
          <div className="roster-section-heading">
            <h3 id="active-students-heading">Sınıftaki çocuklar</h3>
            <span>{visibleStudents.length} gösteriliyor</span>
          </div>
          {visibleStudents.length > 0 ? (
            <ul className="children-list roster-list">
              {visibleStudents.map((student) => {
                const observationCount =
                  observationCountByStudent.get(student.id) ?? 0;
                const actionsOpen = studentActionsOpenId === student.id;
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
                          <span>
                            <i
                              className={`roster-status-dot roster-status-dot--${student.status}`}
                            />
                            {statusLabels[student.status]} · {observationCount} gözlem
                          </span>
                        </span>
                        <ChevronRightIcon aria-hidden="true" />
                      </button>
                      <button
                        className="roster-quick-action"
                        type="button"
                        onClick={() => void openStudentObservation(student.id)}
                        disabled={dataBusy}
                        aria-label={`${student.name} için hızlı gözlem`}
                      >
                        <PlusIcon aria-hidden="true" />
                      </button>
                      <button
                        className="roster-more-action"
                        type="button"
                        onClick={() =>
                          setStudentActionsOpenId((current) =>
                            current === student.id ? null : student.id,
                          )
                        }
                        aria-label={`${student.name} için işlemler`}
                        aria-expanded={actionsOpen}
                        aria-controls={`student-actions-${student.id}`}
                      >
                        <DotsHorizontalIcon aria-hidden="true" />
                      </button>
                    </div>
                    {actionsOpen ? (
                      <div
                        className="roster-card-actions"
                        id={`student-actions-${student.id}`}
                        role="group"
                        aria-label={`${student.name} işlemleri`}
                      >
                        <span>Geçmiş gözlem ve devam kayıtları korunur.</span>
                        <button
                          className="roster-action-observe"
                          type="button"
                          onClick={() => void openStudentObservation(student.id)}
                          disabled={dataBusy}
                          aria-label={`${student.name} için hızlı gözlem menü işlemi`}
                        >
                          <PlusIcon aria-hidden="true" />
                          Gözlem ekle
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
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="roster-empty" role="status">
              <MagnifyingGlassIcon aria-hidden="true" />
              <strong>Eşleşen çocuk bulunamadı</strong>
              <span>Arama ifadesini değiştirerek yeniden deneyin.</span>
            </div>
          )}
        </section>

        {archivedStudents.length > 0 ? (
          <details className="roster-archive">
            <summary>
              <span>Sınıftan ayrılanlar</span>
              <strong>{archivedStudents.length}</strong>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <ul className="children-list roster-archive-list">
              {archivedStudents.map((student) => (
                <li className="children-row children-row--archived" key={student.id}>
                  <span className="student-avatar" aria-hidden="true">
                    {studentInitials(student.name)}
                  </span>
                  <span className="student-name">
                    <strong>{student.name}</strong>
                    <small>Geçmiş kayıtları korunuyor</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => void restoreStudent(student.id)}
                    disabled={dataBusy}
                    aria-label={`${student.name} çocuğunu sınıfa geri al`}
                  >
                    Geri al
                  </button>
                </li>
              ))}
            </ul>
          </details>
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
            <button
              className="student-row"
              type="button"
              key={student.id}
              onClick={() => updateStudentStatus(student.id)}
              disabled={
                writesBlocked ||
                persistenceState.phase === "pending" ||
                dataBusy
              }
            >
              <span className="student-avatar" aria-hidden="true">{student.name.split(" ").map((part) => part[0]).join("")}</span>
              <span className="student-name">{student.name}</span>
              <span className={`status-pill status-pill--${student.status}`}>{statusLabels[student.status]}</span>
            </button>
          ))}
        </div>
        {lastAttendanceChange ? (
          <button
            className="attendance-undo"
            type="button"
            onClick={undoAttendanceChange}
            disabled={
              writesBlocked ||
              persistenceState.phase === "pending" ||
              dataBusy
            }
          >
            Son değişikliği geri al
          </button>
        ) : null}
        <button
          className="sheet-primary"
          type="button"
          onClick={() => void completeAttendance()}
          disabled={dataBusy || writesBlocked}
        >
          <CheckCircledIcon aria-hidden="true" /> Devam durumunu tamamla
        </button>
      </BottomSheet>

      <BottomSheet
        open={profileOpen}
        onOpenChange={(open) => {
          if (!open) {
            keyboard.hide();
            setAppLockPin("");
            setAppLockPinConfirm("");
            setBackupPassword("");
            setBackupPasswordConfirm("");
            setRestorePassword("");
            setPendingRestore(null);
            setSecureBackupError("");
          }
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
              <strong>
                {appLockSetting
                  ? "Cihaz verileri uygulama kilidiyle korunuyor"
                  : "Veriler bu cihazda saklanıyor"}
              </strong>
              <small>{dataStatus}</small>
            </span>
            <b>{appLockSetting ? (appLocked ? "Kilitli" : "Açık") : "Kilit yok"}</b>
          </section>

          <section className="security-section" aria-labelledby="app-lock-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="app-lock-heading">Uygulama kilidi</h3>
                <p>
                  {appLockSetting
                    ? "Arka plana geçince veya 5 dakika işlem yapılmayınca MaarifOS kilitlenir."
                    : "En az 6 karakterlik PIN ile çocuk verilerini uygulama açılışında koruyun."}
                </p>
              </div>
              <span className="optional-badge">
                {appLockSetting ? "Etkin" : "Kurulmadı"}
              </span>
            </div>
            {appLockSetting ? (
              <div className="app-lock-actions">
                <button
                  className="install-app-button"
                  type="button"
                  onClick={() => void lockApplication()}
                  disabled={dataBusy}
                >
                  <LockClosedIcon aria-hidden="true" /> Şimdi kilitle
                </button>
                <button
                  className="security-text-action"
                  type="button"
                  onClick={() => void removeAppLock()}
                  disabled={dataBusy}
                >
                  Bu cihazdaki kilidi kaldır
                </button>
              </div>
            ) : (
              <form
                className="secure-secret-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void activateAppLock();
                }}
              >
                <label htmlFor="app-lock-pin">
                  Uygulama PIN’i
                  <input
                    id="app-lock-pin"
                    type="password"
                    value={appLockPin}
                    onChange={(event) => setAppLockPin(event.target.value)}
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    inputMode="text"
                  />
                </label>
                <label htmlFor="app-lock-pin-confirm">
                  PIN’i doğrula
                  <input
                    id="app-lock-pin-confirm"
                    type="password"
                    value={appLockPinConfirm}
                    onChange={(event) =>
                      setAppLockPinConfirm(event.target.value)
                    }
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    inputMode="text"
                  />
                </label>
                <button
                  className="install-app-button"
                  type="submit"
                  disabled={
                    dataBusy ||
                    appLockPin.length < 6 ||
                    appLockPin !== appLockPinConfirm
                  }
                >
                  <LockClosedIcon aria-hidden="true" /> Uygulama kilidini
                  etkinleştir
                </button>
              </form>
            )}
            {appLockError ? (
              <p className="security-inline-error" role="alert">
                {appLockError}
              </p>
            ) : null}
            <small className="provider-status">
              PIN saklanmaz; yalnız salt ve güçlü PBKDF2 doğrulayıcısı bu
              cihazda tutulur.
            </small>
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

          <section className="release-summary-card" aria-labelledby="release-summary-heading">
            <div className="release-summary-heading">
              <span className="release-summary-icon" aria-hidden="true">
                <MagicWandIcon />
              </span>
              <span>
                <small>Güncel sürüm</small>
                <h3 id="release-summary-heading">MaarifOS {CURRENT_RELEASE.version}</h3>
              </span>
              <b><CheckCircledIcon aria-hidden="true" /> Güncel</b>
            </div>
            <p>{CURRENT_RELEASE.title}</p>
            <div className="release-meta" aria-label="Sürüm bilgileri">
              <span>Sürüm {CURRENT_RELEASE.version}</span>
              <time dateTime={CURRENT_RELEASE.releasedOn}>
                {formatTurkishCivilDate(CURRENT_RELEASE.releasedOn)}
              </time>
            </div>
            <button
              className="release-notes-toggle"
              type="button"
              aria-expanded={releaseNotesExpanded}
              aria-controls="current-release-notes"
              onClick={() => setReleaseNotesExpanded((current) => !current)}
            >
              {releaseNotesExpanded ? "Sürüm notlarını gizle" : "Sürüm notlarını göster"}
              <ChevronDownIcon aria-hidden="true" />
            </button>
            {releaseNotesExpanded ? (
              <ul className="release-notes-list" id="current-release-notes">
                {CURRENT_RELEASE.notes.map((note) => (
                  <li key={note}>
                    <CheckCircledIcon aria-hidden="true" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="security-section" aria-labelledby="backup-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="backup-heading">Şifreli yedek ve geri yükle</h3>
                <p>
                  Yeni yedekler parola ile AES-GCM şifrelenir. Parola
                  saklanmaz ve unutulursa dosya açılamaz.
                </p>
              </div>
            </div>
            <div className="secure-secret-form secure-secret-form--backup">
              <label htmlFor="backup-password">
                Yedek parolası
                <input
                  id="backup-password"
                  type="password"
                  value={backupPassword}
                  onChange={(event) => setBackupPassword(event.target.value)}
                  minLength={10}
                  maxLength={1024}
                  autoComplete="new-password"
                />
              </label>
              <label htmlFor="backup-password-confirm">
                Parolayı doğrula
                <input
                  id="backup-password-confirm"
                  type="password"
                  value={backupPasswordConfirm}
                  onChange={(event) =>
                    setBackupPasswordConfirm(event.target.value)
                  }
                  minLength={10}
                  maxLength={1024}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <div className="data-action-grid">
              <button
                type="button"
                onClick={() => void createBackup()}
                disabled={
                  dataBusy ||
                  writesBlocked ||
                  backupPassword.length < 10 ||
                  backupPassword !== backupPasswordConfirm
                }
              >
                <DownloadIcon aria-hidden="true" />
                <span>
                  <strong>Şifreli yedek oluştur</strong>
                  <small>Parola korumalı .maarifos dosyası</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => restoreFileRef.current?.click()}
                disabled={dataBusy || writesBlocked}
              >
                <UploadIcon aria-hidden="true" />
                <span><strong>Geri yükle</strong><small>Dosyayı kontrol et</small></span>
              </button>
            </div>
            <input
              ref={restoreFileRef}
              className="restore-file-input"
              type="file"
              accept=".maarifos,.json,application/json"
              onChange={(event) => void inspectRestoreFile(event.target.files?.[0])}
              aria-label="MaarifOS yedek dosyası seç"
            />

            {pendingRestore ? (
              <div className="restore-preview" role="status">
                <strong>{pendingRestore.fileName}</strong>
                {pendingRestore.encryption === "encrypted" &&
                !pendingRestore.envelope ? (
                  <div className="restore-password-step">
                    <span>Şifreli yedek · içerik henüz açılmadı</span>
                    <label htmlFor="restore-password">
                      Yedek parolası
                      <input
                        id="restore-password"
                        type="password"
                        value={restorePassword}
                        onChange={(event) =>
                          setRestorePassword(event.target.value)
                        }
                        minLength={10}
                        maxLength={1024}
                        autoComplete="current-password"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void unlockRestorePreview()}
                      disabled={dataBusy || restorePassword.length < 10}
                    >
                      Yedeği aç ve doğrula
                    </button>
                  </div>
                ) : pendingRestore.envelope ? (
                  <>
                    <span>
                      {Object.values(
                        pendingRestore.envelope.manifest.entityCounts,
                      ).reduce((total, count) => total + count, 0)}{" "}
                      kayıt · {pendingRestore.envelope.manifest.civilDate}
                    </span>
                    {pendingRestore.encryption === "legacy-plaintext" ? (
                      <p className="restore-legacy-warning">
                        Bu eski yedek şifreli değildir. Yalnız geçiş için
                        desteklenir; geri yükledikten sonra yeni şifreli yedek
                        oluşturun.
                      </p>
                    ) : null}
                    <p>
                      İşlemden önce cihaz içinde kalıcı ve checksum doğrulamalı
                      kurtarma noktası oluşturulur. İndirme tek güvence
                      değildir.
                    </p>
                    <div className="restore-actions">
                      <button
                        type="button"
                        onClick={() => void confirmRestore("merge")}
                        disabled={dataBusy || writesBlocked}
                      >
                        Kayıtları birleştir
                      </button>
                      <button
                        type="button"
                        className="replace-action"
                        onClick={() => void confirmRestore("replace")}
                        disabled={dataBusy || writesBlocked}
                      >
                        Bu cihazdaki verilerin yerine yükle
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            {secureBackupError ? (
              <p className="security-inline-error" role="alert">
                {secureBackupError}
              </p>
            ) : null}
            <small className="provider-status">
              {recoverySnapshots.length > 0
                ? `${recoverySnapshots.length} kalıcı kurtarma noktası bu cihazda doğrulanmış olarak saklanıyor.`
                : "İlk geri yüklemeden önce kalıcı kurtarma noktası otomatik oluşturulacak."}
            </small>
          </section>
        </div>
      </BottomSheet>

      <BottomSheet
        open={releaseNotesOpen}
        onOpenChange={(open) => {
          if (!open) completeReleaseNotice();
        }}
        title="MaarifOS güncellendi"
        description={`Sürüm ${CURRENT_RELEASE.version} · ${formatTurkishCivilDate(CURRENT_RELEASE.releasedOn)}`}
        snap={0.86}
      >
        <div className="release-celebration">
          <span className="release-celebration-icon" aria-hidden="true">
            <MagicWandIcon />
          </span>
          <span className="release-kicker">Yeni sürüm kullanıma hazır</span>
          <h3>{CURRENT_RELEASE.title}</h3>
          {releasePreviousVersion ? (
            <p className="release-version-transition">
              Sürüm {releasePreviousVersion} → {CURRENT_RELEASE.version}
            </p>
          ) : null}
          <ul className="release-notes-list release-notes-list--featured">
            {CURRENT_RELEASE.notes.map((note) => (
              <li key={note}>
                <CheckCircledIcon aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
          <div className="release-data-safe">
            <LockClosedIcon aria-hidden="true" />
            <span>
              <strong>Kayıtlarınız korundu</strong>
              <small>Çocuk, gözlem, plan ve arşiv verileri bu cihazda yerinde duruyor.</small>
            </span>
          </div>
          <button
            className="sheet-primary release-complete-button"
            type="button"
            onClick={completeReleaseNotice}
          >
            Harika, başlayalım
          </button>
        </div>
      </BottomSheet>

      {planFlowOpen && configuredClassroom?.curriculumProfile ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) void closeD1Flow();
          }}
        >
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content className="d1-flow-layer" key="plan-flow">
            <Dialog.Title className="sr-only">
              Günlük plan oluşturma
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Günlük planı ve ilk etkinliği oluşturun. Escape tuşuyla
              kapatabilirsiniz.
            </Dialog.Description>
            <PlanCreationFlow
              civilDate={todayWorkspace.civilDate}
              defaultStartTime={configuredClassroom.schedule.startTime}
              defaultEndTime={configuredClassroom.schedule.endTime}
              curriculumProfile={configuredClassroom.curriculumProfile}
              students={students}
              onCreate={createPlanAndStart}
              onClose={() => void closeD1Flow()}
            />
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      {evidenceFlowRequest ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) void closeD1Flow();
          }}
        >
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content
            className="d1-flow-layer"
            key={`evidence-flow-${evidenceFlowRequest.pendingObservation?.id ?? evidenceFlowRequest.activity.id}-${evidenceFlowRequest.initialStudentId ?? "none"}`}
          >
            <Dialog.Title className="sr-only">
              Gözlem ve değerlendirme akışı
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Gözlem taslağı kapatılmadan önce bu cihaza kaydedilir. Escape
              tuşuyla güvenli biçimde kapatabilirsiniz.
            </Dialog.Description>
            <EvidenceCaptureFlow
              activity={evidenceFlowRequest.activity}
              pendingObservation={evidenceFlowRequest.pendingObservation}
              initialStudentId={evidenceFlowRequest.initialStudentId}
              students={students}
              actions={evidenceFlowActions}
            />
          </Dialog.Content>
        </Dialog.Root>
      ) : null}
      </div>

      {appLocked ? (
        <Dialog.Root open>
          <Dialog.Overlay className="security-gate-overlay" />
          <Dialog.Content
            className="app-lock-gate"
            data-testid="app-lock-gate"
            onEscapeKeyDown={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <form
              className="app-lock-gate-card"
              onSubmit={(event) => {
                event.preventDefault();
                void unlockApplication();
              }}
            >
              <img
                src="/assets/brand/maarifos-icon-192.png"
                alt=""
                aria-hidden="true"
              />
              <span className="app-lock-gate-icon" aria-hidden="true">
                <LockClosedIcon />
              </span>
              <Dialog.Title asChild>
                <h2>MaarifOS kilitli</h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p>
                  Çocuk verileri gizlendi. Bu oturum için uygulama PIN’ini
                  girin.
                </p>
              </Dialog.Description>
              <label htmlFor="app-unlock-pin">
                Uygulama PIN’i
                <input
                  id="app-unlock-pin"
                  type="password"
                  value={appUnlockPin}
                  onChange={(event) => setAppUnlockPin(event.target.value)}
                  minLength={6}
                  maxLength={128}
                  autoComplete="current-password"
                  autoFocus
                />
              </label>
              {appLockError ? (
                <p className="security-inline-error" role="alert">
                  {appLockError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={dataBusy || appUnlockPin.length < 6}
              >
                {dataBusy ? "Doğrulanıyor…" : "Kilidi aç"}
              </button>
              <small>
                PIN hiçbir dosyaya, ayara veya kalıcı tarayıcı alanına
                yazılmaz.
              </small>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      {persistenceState.phase === "hydrating" ||
      persistenceState.phase === "error" ? (
        <Dialog.Root open>
          <Dialog.Overlay className="security-gate-overlay" />
          <Dialog.Content
            className={`persistence-gate is-${persistenceState.phase}`}
            data-testid="persistence-gate"
            onEscapeKeyDown={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <div className="persistence-gate-card">
              <span className="persistence-gate-icon" aria-hidden="true">
                {persistenceState.phase === "error" ? (
                  <LockClosedIcon />
                ) : (
                  <ClockIcon />
                )}
              </span>
              <Dialog.Title asChild>
                <h2>
                  {persistenceState.phase === "error"
                    ? "Yeni kayıtlar güvenlik için durduruldu"
                    : "Cihaz verileri hazırlanıyor"}
                </h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p aria-live="assertive">{persistenceState.detail}</p>
              </Dialog.Description>
              {persistenceState.phase === "error" ? (
                <button type="button" onClick={retryPersistence} autoFocus>
                  Cihaz verilerine yeniden bağlan
                </button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
