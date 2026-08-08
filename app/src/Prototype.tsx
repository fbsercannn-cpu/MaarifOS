import {
  lazy,
  Suspense,
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
  CameraIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  Cross2Icon,
  CopyIcon,
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
  TrashIcon,
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
  composeStudentDisplayName,
  createAppLockConfig,
  formatStudentPhone,
  initialAppLockAttemptState,
  isCapabilityEnabled,
  isEncryptedBackupEnvelope,
  normalizeTurkishSearchText,
  backupReminderState,
  inspectStorageHealth,
  readLastSuccessfulEncryptedBackup,
  recordSuccessfulEncryptedBackup,
  splitStudentDisplayName,
  visiblePrimaryNavigation,
  type AppLockAttemptState,
  type AppLockConfig,
  type AttendanceEvent,
  type AttendanceRecord,
  type BackupEnvelope,
  type CalendarEntry,
  type CalendarEntryStatus,
  type CalendarEntryType,
  type RecoverySnapshotMetadata,
  type RestoreMode,
  type StorageHealthState,
  type StudentContact,
  type StoredRecord,
} from "./core";
import { createInitialAuthState, deriveWelcomeViewModel, reduceAuthState, type AuthState } from "./auth";
import {
  dashboardAttendanceCounts,
  loadDashboardState,
  persistAttendanceUpdate,
  persistStudentRosterChange,
  type AttendanceStatus,
  type DashboardState,
  type DashboardStudent as Student,
} from "./features/dashboard/dashboard-data";
import { loadStudentAttendanceHistory } from "./features/attendance";
import {
  AttendancePanels,
  StudentAttendanceHistoryPanel,
} from "./features/attendance/AttendancePanels";
import { ATTENDANCE_EVENT_LABELS } from "./features/attendance/attendance-panel-model";
import { RouteFocusBoundary, useBrowserRouter } from "./shell";
import { classifyApplicationError } from "./core/errors";
import {
  TodayScreen,
  createTodayStudentCards,
} from "./features/today";
import { ClassroomToolsSheets } from "./features/classroom/ClassroomToolsSheets";
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
  PlanCreationFlow,
  type PlanCreationCommand,
} from "./features/planning";
import type { PremiumDailyTemplateSelection } from "./features/premium-plans/domain.ts";
import {
  curriculumFrameworkForProgram,
  loadEvidenceWorkspace,
  type EvidenceActivitySummary,
  type EvidenceObservationSummary,
  type EvidenceWorkspace,
} from "./features/evidence/evidence-workspace";
import {
  emptyStudentPortfolioWorkspace,
  loadStudentPortfolioWorkspace,
  savePortfolioSelection,
  type PortfolioSelectedBy,
  type StudentPortfolioWorkspace,
} from "./features/portfolio/student-portfolio";
import {
  CURRICULUM_ASSESSMENT_LEVELS,
  CURRICULUM_TARGET_KIND_LABELS,
  OFFICIAL_STARTER_CATALOG_PROFILES,
  curriculumAgeBandFromLabel,
  curriculumTargetsForProfile,
  type CurriculumAssessmentLevel,
  type CurriculumAssignmentMode,
  type CurriculumTargetSnapshot,
} from "./features/curriculum/curriculum-catalog";
import {
  academicYearOperationalNotice,
  academicYearOperationalStatus,
  loadTodayWorkspace,
  saveClassroomConfiguration,
  setTodayActivityStatus,
  transitionAcademicYearConfiguration,
  type TodayActivityStatus,
  type TodayWorkspace,
} from "./features/today/today-data";
import type { ClassroomScheduleKind } from "./core/domain/classroom";
import {
  buildClassObservationExport,
  buildStudentObservationExport,
  classroomObservationExportFileName,
  contactActionLinks,
  contactDisplayLabel,
  formatObservationDateTime,
  prepareStudentProfilePhoto,
  studentObservationExportFileName,
} from "./features/students/student-profile-tools";
import {
  OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
  loadAcademicCalendar,
  officialEventsOnDate,
  removeCalendarEntry,
  saveCalendarEntry,
  type AcademicCalendarWorkspace,
} from "./features/calendar/academic-calendar";
import {
  permanentlyDeleteArchivedStudent,
  previewPermanentStudentDeletion,
  type StudentDeletionImpact,
} from "./features/students/student-lifecycle";
import {
  createStudentDossier,
  listExternalAiFeedback,
  saveExternalAiFeedback,
  type DossierAudience,
  type DossierDestination,
  type DossierIdentityMode,
  type ExternalAiFeedback,
} from "./features/reports/student-dossier";
import {
  acknowledgeCurrentRelease,
  CURRENT_RELEASE,
  inspectCurrentRelease,
  PWA_UPDATE_READY_EVENT,
} from "./release";
import { COLLECTION_NAMES } from "./core/domain/model";

const ClassroomScreen = lazy(() =>
  import("./features/classroom/ClassroomScreen").then((module) => ({
    default: module.ClassroomScreen,
  })),
);

const PremiumPlanCenterScreen = lazy(() =>
  import("./features/premium-plans/PremiumPlanCenterScreen.tsx").then((module) => ({
    default: module.PremiumPlanCenterScreen,
  })),
);

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
  firstName: string;
  lastName: string;
  preferredName: string;
  birthDate: string;
  optionalCode: string;
  enrollmentDate: string;
  homeLanguages: string;
  interests: string;
  strengths: string;
  supportPreferences: string;
  contacts: StudentContact[];
  profilePhotoDataUrl: string;
};

type StudentObservationMonth = string;

type PortfolioEditorState = {
  observationId: string;
  teacherCaption: string;
  childReflection: string;
  familyContribution: string;
  selectedBy: PortfolioSelectedBy;
};

type CalendarEntryFormState = {
  entryType: CalendarEntryType;
  title: string;
  note: string;
  status: CalendarEntryStatus;
};

type StudentShareFormState = {
  destination: DossierDestination;
  audience: DossierAudience;
  identityMode: DossierIdentityMode;
  alias: string;
  periodStart: string;
  periodEnd: string;
  includeContacts: boolean;
  includeAttendance: boolean;
  includeObservations: boolean;
  includePortfolio: boolean;
  includeExternalFeedback: boolean;
  personalDataApprovedForAi: boolean;
};

type ExternalFeedbackFormState = {
  provider: "chatgpt" | "gemini" | "other";
  audience: DossierAudience;
  periodStart: string;
  periodEnd: string;
  feedbackText: string;
  teacherNote: string;
  includeInTermSummary: boolean;
  includeInYearSummary: boolean;
};

const currentCivilDate = civilDateInIstanbul(new Date());
const currentCivilYear = Number(currentCivilDate.slice(0, 4));
const currentCivilMonth = Number(currentCivilDate.slice(5, 7));
const currentAcademicStartYear =
  currentCivilMonth >= 9 ? currentCivilYear : currentCivilYear - 1;
const initialClassroomForm: ClassroomFormState = {
  classroomName: "",
  academicYearName:
    `${currentAcademicStartYear}–${currentAcademicStartYear + 1} Eğitim Yılı`,
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

const emptyAcademicCalendar: AcademicCalendarWorkspace = {
  academicYearId: null,
  classroomId: null,
  officialEvents: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events,
  entries: [],
};

const initialCalendarEntryForm: CalendarEntryFormState = {
  entryType: "general_note",
  title: "",
  note: "",
  status: "planned",
};

const schedulePresets: Record<Exclude<ClassroomScheduleKind, "custom">, Pick<ClassroomFormState, "startTime" | "endTime">> = {
  morning: { startTime: "08:30", endTime: "12:30" },
  afternoon: { startTime: "13:00", endTime: "17:00" },
  full_day: { startTime: "08:30", endTime: "16:30" },
};

const calendarEntryTypeLabels: Record<CalendarEntryType, string> = {
  general_note: "Genel not",
  parent_meeting: "Veli toplantısı",
  fruit_day: "Meyve günü",
  activity: "Etkinlik",
  adaptation_day: "Uyum günü",
  official_marker: "Resmî takvim işareti",
};

const calendarEntryStatusLabels: Record<CalendarEntryStatus, string> = {
  planned: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const dossierDestinationLabels: Record<DossierDestination, string> = {
  whatsapp: "WhatsApp / paylaş",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  file: "Metin dosyası",
};

const dossierAudienceLabels: Record<DossierAudience, string> = {
  parent: "Veli",
  administration: "Okul idaresi",
  guidance: "Rehberlik öğretmeni",
  teacher: "Öğretmen çalışma özeti",
};

function shiftCalendarMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

function calendarMonthDays(month: string): {
  civilDate: string;
  day: number;
  inMonth: boolean;
}[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      Date.UTC(year, monthNumber - 1, index - mondayOffset + 1),
    );
    return {
      civilDate: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthNumber - 1,
    };
  });
}

function formatCalendarMonth(month: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00.000Z`));
}

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
    return "TYMM 2024 · tam öğrenme çıktıları";
  }
  if (normalized.includes("meb-okul-oncesi-egitim-programi-2024")) {
    return "EÇE · 2024 başlangıç kataloğu";
  }
  return label;
}

type AttendanceChange = {
  studentId: string;
  description: string;
  previousStatus: AttendanceStatus;
  nextStatus: AttendanceStatus;
  previousMarked: boolean;
  nextMarked: boolean;
  previousEvents: AttendanceEvent[];
  nextEvents: AttendanceEvent[];
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
  | "student-profile"
  | "student-share"
  | "student-delete"
  | "settings"
  | "classroom"
  | "plans"
  | "calendar"
  | "documents"
  | "release-notes"
  | "plan-flow"
  | "premium-plans"
  | "evidence-flow";

const APP_HISTORY_MARKER = "__maarifOSSurface";

function appSurfaceFromHistoryState(state: unknown): AppSurface | null {
  if (!state || typeof state !== "object") return null;
  const candidate = (state as Record<string, unknown>)[APP_HISTORY_MARKER];
  return candidate === "attendance" ||
    candidate === "student-profile" ||
    candidate === "student-share" ||
    candidate === "student-delete" ||
    candidate === "settings" ||
    candidate === "classroom" ||
    candidate === "plans" ||
    candidate === "calendar" ||
    candidate === "documents" ||
    candidate === "release-notes" ||
    candidate === "plan-flow" ||
    candidate === "premium-plans" ||
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

function downloadText(fileName: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", contents], { type: "text/plain;charset=utf-8" }),
  );
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

function emptyStudentContact(
  kind: StudentContact["kind"],
  relationship: string,
): StudentContact {
  return {
    id: crypto.randomUUID(),
    kind,
    relationship,
    phone: "",
    isPrimary: false,
  };
}

function studentContactsForForm(student: Student): StudentContact[] {
  const contacts = (student.contacts ?? []).map((contact) => ({
    ...contact,
    phone: contactActionLinks(contact.phone)
      ? formatStudentPhone(contact.phone)
      : contact.phone,
  }));
  if (!contacts.some((contact) => contact.kind === "mother")) {
    contacts.unshift(emptyStudentContact("mother", "Anne"));
  }
  if (!contacts.some((contact) => contact.kind === "father")) {
    const motherIndex = contacts.findIndex((contact) => contact.kind === "mother");
    contacts.splice(
      motherIndex < 0 ? 0 : motherIndex + 1,
      0,
      emptyStudentContact("father", "Baba"),
    );
  }
  return contacts;
}

function StudentAvatar({
  student,
  className = "student-avatar",
  photoDataUrl,
}: {
  student: Student;
  className?: string;
  photoDataUrl?: string | null;
}) {
  const resolvedPhoto =
    photoDataUrl === undefined
      ? student.profilePhotoDataUrl
      : photoDataUrl || undefined;
  return (
    <span className={className}>
      {resolvedPhoto ? (
        <img
          src={resolvedPhoto}
          alt={`${student.preferredName ?? student.name} profil fotoğrafı`}
        />
      ) : (
        <span aria-hidden="true">{studentInitials(student.name)}</span>
      )}
    </span>
  );
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
                  <span className="d1-kicker">1 · Öğrenciyi seç</span>
                  <h1 id="quick-student-heading">Kimin için yazıyorsunuz?</h1>
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
            </section>

            <section className="quick-note-card">
              <div className="quick-note-label-row">
                <div>
                  <span className="d1-kicker">2 · Yaz</span>
                  <label id="quick-note-heading" htmlFor="d1-observation-text">Ne yaptı veya ne söyledi?</label>
                </div>
                <small>{rawText.length.toLocaleString("tr-TR")} karakter</small>
              </div>
              <KeyboardTextarea
                id="d1-observation-text"
                aria-label="Ne oldu?"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
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
            </section>

            <details className="quick-details">
              <summary>
                <span>
                  <ReaderIcon aria-hidden="true" />
                  <strong>İstersen ayrıntı ekle</strong>
                  <small>Tür, alan, bağlam ve çocuk sözü</small>
                </span>
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className="quick-details-fields">
                <span className="quick-detail-label">Gözlem türü</span>
                <div className="quick-type-grid" role="group" aria-label="Gözlem türleri">
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
                </div>
                <span className="quick-detail-label">Gözlem alanı</span>
                <div className="quick-category-track" role="group" aria-label="Gözlem alanları">
                  {quickObservationCategories.map(({ id, label, tone }) => (
                    <button
                      className={`quick-category-chip quick-category-chip--${tone}`}
                      type="button"
                      key={id}
                      onClick={() => toggleCategory(id)}
                      aria-pressed={categories.includes(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
              ? "Program bağlantısı her çocuk için ayrı ayrı tamamlanabilir."
              : "Program bağlantısı daha sonra tamamlanabilir."}
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
  const [selectedTargetId, setSelectedTargetId] = useState("");
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
                <option value="">Bir hedef seçin</option>
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
  const { route, navigate } = useBrowserRouter();
  const premiumPilotPreviewEnabled =
    isCapabilityEnabled("premiumPlanCenter") ||
    (import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("premiumPilot") === "1");
  const internalStaffExportEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("premiumPilot") === "1";
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
  const [studentProfileOpen, setStudentProfileOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfileForm, setStudentProfileForm] =
    useState<StudentProfileFormState>({
      firstName: "",
      lastName: "",
      preferredName: "",
      birthDate: "",
      optionalCode: "",
      enrollmentDate: "",
      homeLanguages: "",
      interests: "",
      strengths: "",
      supportPreferences: "",
      contacts: [],
      profilePhotoDataUrl: "",
    });
  const [studentProfileError, setStudentProfileError] = useState("");
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);
  const [studentObservationLimit, setStudentObservationLimit] = useState(20);
  const [studentProfileTab, setStudentProfileTab] =
    useState<"flow" | "portfolio" | "details" | "contacts">("flow");
  const [studentObservationFilter, setStudentObservationFilter] =
    useState<"all" | "pending">("all");
  const [studentObservationMonth, setStudentObservationMonth] =
    useState<StudentObservationMonth>("all");
  const [studentPortfolioWorkspace, setStudentPortfolioWorkspace] =
    useState<StudentPortfolioWorkspace>(emptyStudentPortfolioWorkspace);
  const [studentAttendanceHistory, setStudentAttendanceHistory] =
    useState<AttendanceRecord[]>([]);
  const [studentAttendanceHistoryError, setStudentAttendanceHistoryError] =
    useState("");
  const [portfolioEditor, setPortfolioEditor] =
    useState<PortfolioEditorState | null>(null);
  const [portfolioError, setPortfolioError] = useState("");
  const [removedStudentContact, setRemovedStudentContact] =
    useState<StudentContact | null>(null);
  const [removedProfilePhoto, setRemovedProfilePhoto] = useState<string | null>(
    null,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [academicCalendar, setAcademicCalendar] =
    useState<AcademicCalendarWorkspace>(emptyAcademicCalendar);
  const [calendarMonth, setCalendarMonth] = useState("2026-09");
  const [calendarSelectedDate, setCalendarSelectedDate] =
    useState("2026-09-07");
  const [calendarEntryForm, setCalendarEntryForm] =
    useState<CalendarEntryFormState>(initialCalendarEntryForm);
  const [calendarError, setCalendarError] = useState("");
  const [academicYearTransitionConfirmed, setAcademicYearTransitionConfirmed] =
    useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentAddOpen, setStudentAddOpen] = useState(false);
  const [studentActionsOpenId, setStudentActionsOpenId] =
    useState<string | null>(null);
  const [classExportPreviewOpen, setClassExportPreviewOpen] = useState(false);
  const [classExportStartDate, setClassExportStartDate] = useState("");
  const [classExportEndDate, setClassExportEndDate] = useState("");
  const [classExportStudentIds, setClassExportStudentIds] = useState<string[]>(
    [],
  );
  const [classExportNameMode, setClassExportNameMode] =
    useState<"preferred" | "registered">("preferred");
  const [todayWorkspace, setTodayWorkspace] = useState<TodayWorkspace>(emptyTodayWorkspace);
  const [evidenceWorkspace, setEvidenceWorkspace] =
    useState<EvidenceWorkspace>(emptyEvidenceWorkspace);
  const [planFlowOpen, setPlanFlowOpen] = useState(false);
  const [premiumPlanOpen, setPremiumPlanOpen] = useState(false);
  const [premiumDailyTemplate, setPremiumDailyTemplate] =
    useState<PremiumDailyTemplateSelection | null>(null);
  const [evidenceFlowRequest, setEvidenceFlowRequest] =
    useState<EvidenceFlowRequest | null>(null);
  const [classroomForm, setClassroomForm] = useState<ClassroomFormState>(initialClassroomForm);
  const [classroomError, setClassroomError] = useState("");
  const [studentDeletionCandidate, setStudentDeletionCandidate] =
    useState<Student | null>(null);
  const [studentDeletionImpact, setStudentDeletionImpact] =
    useState<StudentDeletionImpact | null>(null);
  const [studentDeletionConfirmation, setStudentDeletionConfirmation] =
    useState("");
  const [studentShareOpen, setStudentShareOpen] = useState(false);
  const [studentShareError, setStudentShareError] = useState("");
  const [studentShareBusy, setStudentShareBusy] = useState(false);
  const [studentShareForm, setStudentShareForm] =
    useState<StudentShareFormState>({
      destination: "whatsapp",
      audience: "administration",
      identityMode: "full",
      alias: "Öğrenci A",
      periodStart: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate,
      periodEnd:
        OFFICIAL_ACADEMIC_CALENDAR_2026_2027.instructionalEndDate,
      includeContacts: true,
      includeAttendance: true,
      includeObservations: true,
      includePortfolio: true,
      includeExternalFeedback: true,
      personalDataApprovedForAi: true,
    });
  const [externalFeedbackForm, setExternalFeedbackForm] =
    useState<ExternalFeedbackFormState>({
      provider: "chatgpt",
      audience: "parent",
      periodStart: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate,
      periodEnd:
        OFFICIAL_ACADEMIC_CALENDAR_2026_2027.instructionalEndDate,
      feedbackText: "",
      teacherNote: "",
      includeInTermSummary: true,
      includeInYearSummary: true,
    });
  const [externalFeedback, setExternalFeedback] =
    useState<ExternalAiFeedback[]>([]);
  const [lastExportPackageId, setLastExportPackageId] =
    useState<string | null>(null);
  const [aiWorkspacePrompt, setAiWorkspacePrompt] = useState("");
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
  const [storageHealth, setStorageHealth] =
    useState<StorageHealthState | null>(null);
  const [lastSuccessfulBackupAt, setLastSuccessfulBackupAt] =
    useState<string | null>(null);
  const [wipeConfirmation, setWipeConfirmation] = useState("");
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
  const backupReminder = useMemo(
    () => backupReminderState(lastSuccessfulBackupAt),
    [lastSuccessfulBackupAt],
  );
  const [announcement, setAnnouncement] = useState("MaarifOS hazır.");
  const authView = useMemo(() => deriveWelcomeViewModel(authState), [authState]);
  const dataHydrated =
    persistenceState.phase === "ready" || persistenceState.phase === "pending";
  const writesBlocked =
    !dataHydrated || persistenceState.phase === "error" || appLocked;

  const counts = useMemo(() => dashboardAttendanceCounts(students), [students]);
  const configuredClassroom = todayWorkspace.classroom.status === "configured"
    ? todayWorkspace.classroom
    : null;
  const educationalWriteNotice = configuredClassroom
    ? academicYearOperationalNotice({
        status: configuredClassroom.operationalStatus,
        startDate: configuredClassroom.academicYearStart,
        endDate: configuredClassroom.academicYearEnd,
      })
    : null;
  const educationalWritesDisabled = educationalWriteNotice !== null;
  const classroomFormOperationalNotice = useMemo(() => {
    if (!classroomForm.academicYearStart || !classroomForm.academicYearEnd) {
      return null;
    }
    try {
      const status = academicYearOperationalStatus(
        classroomForm.academicYearStart,
        classroomForm.academicYearEnd,
        attendanceCivilDate,
      );
      return academicYearOperationalNotice({
        status,
        startDate: classroomForm.academicYearStart,
        endDate: classroomForm.academicYearEnd,
      });
    } catch {
      return null;
    }
  }, [
    attendanceCivilDate,
    classroomForm.academicYearEnd,
    classroomForm.academicYearStart,
  ]);
  const academicYearTransitionRequired =
    configuredClassroom !== null &&
    (classroomForm.academicYearName.trim() !==
      configuredClassroom.academicYearName ||
      classroomForm.academicYearStart !==
        configuredClassroom.academicYearStart ||
      classroomForm.academicYearEnd !==
        configuredClassroom.academicYearEnd);
  const visibleCalendarDays = useMemo(
    () => calendarMonthDays(calendarMonth),
    [calendarMonth],
  );
  const selectedOfficialCalendarEvents = useMemo(
    () =>
      officialEventsOnDate(
        academicCalendar.officialEvents,
        calendarSelectedDate,
      ),
    [academicCalendar.officialEvents, calendarSelectedDate],
  );
  const selectedTeacherCalendarEntries = useMemo(
    () =>
      academicCalendar.entries.filter(
        (entry) =>
          entry.startDate <= calendarSelectedDate &&
          entry.endDate >= calendarSelectedDate,
      ),
    [academicCalendar.entries, calendarSelectedDate],
  );
  const currentActivity = todayWorkspace.currentActivity;
  const focusActivity = currentActivity
    ?? todayWorkspace.planItems.find((item) => item.status === "planned")
    ?? todayWorkspace.planItems[0]
    ?? null;
  const selectedProfileStudent =
    students.find((student) => student.id === selectedStudentId) ??
    archivedStudents.find((student) => student.id === selectedStudentId) ??
    null;
  const allEvidenceObservations = useMemo(
    () =>
      [
        ...evidenceWorkspace.pendingObservations,
        ...evidenceWorkspace.linkedObservations,
      ].sort(
        (left, right) =>
          right.observedAt.localeCompare(left.observedAt) ||
          right.id.localeCompare(left.id),
      ),
    [
      evidenceWorkspace.linkedObservations,
      evidenceWorkspace.pendingObservations,
    ],
  );
  const selectedStudentObservations = selectedStudentId
    ? allEvidenceObservations.filter(
        (observation) => observation.studentId === selectedStudentId,
      )
    : [];
  const selectedStudentPendingLinks = selectedStudentObservations.filter(
    (observation) => observation.confirmedCurriculumLinkIds.length === 0,
  ).length;
  const selectedStudentMonthObservations =
    studentObservationMonth === "all"
      ? selectedStudentObservations
      : selectedStudentObservations.filter(
          (observation) =>
            observation.civilDate.startsWith(studentObservationMonth),
        );
  const visibleSelectedStudentObservations =
    studentObservationFilter === "pending"
      ? selectedStudentMonthObservations.filter(
          (observation) =>
            observation.confirmedCurriculumLinkIds.length === 0,
        )
      : selectedStudentMonthObservations;
  const portfolioSelectionByObservationId = useMemo(
    () =>
      new Map(
        studentPortfolioWorkspace.selections.map((selection) => [
          selection.itemId,
          selection,
        ]),
      ),
    [studentPortfolioWorkspace.selections],
  );
  const observationCountByStudent = useMemo(() => {
    const countsByStudent = new Map<string, number>();
    for (const observation of allEvidenceObservations) {
      countsByStudent.set(
        observation.studentId,
        (countsByStudent.get(observation.studentId) ?? 0) + 1,
      );
    }
    return countsByStudent;
  }, [allEvidenceObservations]);
  const todayStudentCards = useMemo(
    () => createTodayStudentCards(students, observationCountByStudent),
    [observationCountByStudent, students],
  );
  const normalizedStudentSearch = normalizeTurkishSearchText(studentSearch);
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
          return [
            student.firstName ?? "",
            student.lastName ?? "",
            student.name,
            student.preferredName ?? "",
          ].some((value) =>
            normalizeTurkishSearchText(value).includes(normalizedStudentSearch),
          );
        }),
    [normalizedStudentSearch, students],
  );
  const observedStudentCount = students.filter(
    (student) => (observationCountByStudent.get(student.id) ?? 0) > 0,
  ).length;
  const classExportStudents = [...students, ...archivedStudents].filter(
    (student) => classExportStudentIds.includes(student.id),
  );
  const classExportObservations = allEvidenceObservations.filter(
    (observation) =>
      classExportStudentIds.includes(observation.studentId) &&
      (!classExportStartDate ||
        observation.civilDate >= classExportStartDate) &&
      (!classExportEndDate || observation.civilDate <= classExportEndDate),
  );
  const activeSurface: AppSurface | null = evidenceFlowRequest
    ? "evidence-flow"
    : planFlowOpen
      ? "plan-flow"
      : premiumPlanOpen
        ? "premium-plans"
      : studentShareOpen
        ? "student-share"
        : studentDeletionCandidate
          ? "student-delete"
      : studentProfileOpen
        ? "student-profile"
        : attendanceOpen
          ? "attendance"
          : classroomOpen
              ? "classroom"
              : plansOpen
                ? "plans"
                : calendarOpen
                  ? "calendar"
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
        pendingWriteCountRef.current = Math.max(
          0,
          pendingWriteCountRef.current - 1,
        );
        const classification = classifyApplicationError(reason);
        if (classification.shouldFailClosed) {
          markPersistenceFailure(detail);
        } else {
          const operationDetail =
            reason instanceof Error && reason.message.trim()
              ? reason.message
              : detail;
          applyPersistenceState({
            phase: pendingWriteCountRef.current > 0 ? "pending" : "ready",
            detail: operationDetail,
            pendingWrites: pendingWriteCountRef.current,
            ...(persistenceStateRef.current.lastCommittedAt
              ? { lastCommittedAt: persistenceStateRef.current.lastCommittedAt }
              : {}),
          });
          setDataStatus(operationDetail);
        }
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
    const [today, evidence, calendar] = await Promise.all([
      loadTodayWorkspace(store),
      loadEvidenceWorkspace(store),
      loadAcademicCalendar(store),
    ]);
    setTodayWorkspace(today);
    setEvidenceWorkspace(evidence);
    setAcademicCalendar(calendar);
    return { today, evidence, calendar };
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
      loadAcademicCalendar(store),
      loadAppLockSetting(store),
      backupService.listRecoverySnapshots(),
    ])
      .then(([state, workspace, evidence, calendar, lockSetting, snapshots]) => {
        if (cancelled) return;
        setStudents(state.students);
        setArchivedStudents(state.archivedStudents);
        setAttendanceCompleted(state.attendanceCompleted);
        setAttendanceCivilDate(state.attendanceCivilDate);
        setTodayWorkspace(workspace);
        setEvidenceWorkspace(evidence);
        setAcademicCalendar(calendar);
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

  useEffect(() => {
    let active = true;
    void inspectStorageHealth().then((health) => {
      if (active) setStorageHealth(health);
    });
    const storedBackup = readLastSuccessfulEncryptedBackup(window.localStorage);
    setLastSuccessfulBackupAt(storedBackup.lastSuccessfulAt);
    return () => {
      active = false;
    };
  }, []);

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
    const passphrase = backupPassword;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      await flushPendingWrites();
      const envelope = await backupService.exportEncryptedBackup(passphrase);
      const serialized = backupService.serializeEncryptedBackup(envelope);
      await backupService.parseAndDecryptBackup(serialized, passphrase);
      const civilDate = envelope.encryption.createdAt.slice(0, 10);
      downloadJson(`${prefix}-${civilDate}.maarifos`, serialized);
      recordSuccessfulEncryptedBackup(
        window.localStorage,
        new Date(envelope.encryption.createdAt),
      );
      setLastSuccessfulBackupAt(envelope.encryption.createdAt);
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

  const wipeAllLocalData = async () => {
    if (wipeConfirmation !== "TÜM VERİLERİ SİL" || dataBusy) return;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      await flushPendingWrites();
      await store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
        for (const collection of COLLECTION_NAMES) {
          await transaction.clear(collection);
        }
      });
      const snapshots = await store.listRecoverySnapshots();
      for (const snapshot of snapshots) {
        await store.deleteRecoverySnapshot(snapshot.id);
      }
      setWipeConfirmation("");
      setAnnouncement("Bu cihazdaki tüm MaarifOS verileri kalıcı olarak silindi.");
      store.close();
      window.location.reload();
    } catch (reason) {
      setSecureBackupError(
        reason instanceof Error
          ? reason.message
          : "Cihaz verileri kalıcı olarak silinemedi.",
      );
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
    const passphrase = restorePassword;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      const envelope = await backupService.parseAndDecryptBackup(
        pendingRestore.source,
        passphrase,
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
    const passphrase = restorePassword;
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
                  passphrase,
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
        restoredCalendar,
        restoredLockSetting,
        snapshots,
      ] = await Promise.all([
        loadDashboardState(store, fallbackDashboardState),
        loadTodayWorkspace(store),
        loadEvidenceWorkspace(store),
        loadAcademicCalendar(store),
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
      setAcademicCalendar(restoredCalendar);
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
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
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
    const status = student.attendanceMarked === false
      ? "present"
      : nextStatus(student.status);
    const previousAttendanceCompleted = attendanceCompleted;
    const previousLastAttendanceChange = lastAttendanceChange;
    setStudents((current) =>
      current.map((item) =>
        item.id === studentId
          ? { ...item, status, attendanceMarked: true }
          : item,
      ),
    );
    setLastAttendanceChange({
      studentId,
      description: `${statusLabels[status]} durumu`,
      previousStatus: student.status,
      nextStatus: status,
      previousMarked: student.attendanceMarked !== false,
      nextMarked: true,
      previousEvents: structuredClone(student.events ?? []),
      nextEvents: structuredClone(student.events ?? []),
    });
    setAttendanceCompleted(false);
    setAnnouncement(`${student.name}: ${statusLabels[status]}.`);
    void enqueuePersistence(
      () =>
        persistAttendanceUpdate(store, {
          students: [{ ...student, status, attendanceMarked: true }],
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
              ? {
                  ...item,
                  status: student.status,
                  attendanceMarked: student.attendanceMarked,
                  events: structuredClone(student.events ?? []),
                }
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

  const persistAttendanceEvent = async (
    student: Student,
    event: AttendanceEvent,
  ): Promise<string | null> => {
    if (dataBusy) return "Önce devam eden kaydın tamamlanmasını bekleyin.";
    if (educationalWriteNotice) return educationalWriteNotice;
    const previousEvents = structuredClone(student.events ?? []);
    const nextEvents = [...previousEvents, event];
    const nextAttendanceStatus: AttendanceStatus =
      event.type === "excuse"
        ? "absent"
        : student.attendanceMarked === false
          ? "present"
          : student.status;
    const nextStudent: Student = {
      ...student,
      status: nextAttendanceStatus,
      attendanceMarked: true,
      events: nextEvents,
    };
    const change: AttendanceChange = {
      studentId: student.id,
      description: `${ATTENDANCE_EVENT_LABELS[event.type]} olayı`,
      previousStatus: student.status,
      nextStatus: nextAttendanceStatus,
      previousMarked: student.attendanceMarked !== false,
      nextMarked: true,
      previousEvents,
      nextEvents: structuredClone(nextEvents),
    };

    setDataBusy(true);
    setStudents((current) =>
      current.map((item) => (item.id === student.id ? nextStudent : item)),
    );
    setLastAttendanceChange(change);
    setAttendanceCompleted(false);
    try {
      await enqueuePersistence(
        () =>
          persistAttendanceUpdate(store, {
            students: [nextStudent],
            attendanceCivilDate,
            attendanceCompleted: false,
          }),
        {
          failureDetail:
            "Yoklama ayrıntısı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${student.name} için ${ATTENDANCE_EVENT_LABELS[event.type].toLocaleLowerCase("tr-TR")} kaydedildi.`,
        },
      );
      if (selectedStudentId === student.id) {
        void refreshStudentAttendanceHistory(student.id);
      }
      setAnnouncement(
        `${student.name}: ${ATTENDANCE_EVENT_LABELS[event.type]} kaydedildi.`,
      );
      return null;
    } catch (reason) {
      setStudents((current) =>
        current.map((item) => (item.id === student.id ? student : item)),
      );
      setLastAttendanceChange(null);
      return reason instanceof Error
        ? reason.message
        : "Yoklama ayrıntısı kaydedilemedi.";
    } finally {
      setDataBusy(false);
    }
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
          ? {
              ...item,
              status: lastAttendanceChange.previousStatus,
              attendanceMarked: lastAttendanceChange.previousMarked,
              events: structuredClone(lastAttendanceChange.previousEvents),
            }
          : item,
      ),
    );
    setAttendanceCompleted(false);
    setLastAttendanceChange(null);
    setAnnouncement(
      `${student?.name ?? "Çocuk"} için ${lastAttendanceChange.description} geri alındı.`,
    );
    if (student) {
      void enqueuePersistence(
        () =>
          persistAttendanceUpdate(store, {
            students: [{
              ...student,
              status: changeToUndo.previousStatus,
              attendanceMarked: changeToUndo.previousMarked,
              events: structuredClone(changeToUndo.previousEvents),
            }],
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
                ? {
                    ...item,
                    status: changeToUndo.nextStatus,
                    attendanceMarked: changeToUndo.nextMarked,
                    events: structuredClone(changeToUndo.nextEvents),
                  }
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
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
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
    const nameParts = splitStudentDisplayName(name);
    const student: Student = {
      id: crypto.randomUUID(),
      name: composeStudentDisplayName(nameParts.firstName, nameParts.lastName),
      firstName: nameParts.firstName,
      ...(nameParts.lastName ? { lastName: nameParts.lastName } : {}),
      status: "present",
      attendanceMarked: false,
    };
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

  const refreshStudentPortfolio = async (studentId: string) => {
    try {
      const workspace = await loadStudentPortfolioWorkspace(store, studentId);
      setStudentPortfolioWorkspace(workspace);
      return workspace;
    } catch {
      setPortfolioError(
        "Portfolyo verileri açılamadı; mevcut kanıtlar değiştirilmedi.",
      );
      return null;
    }
  };

  const refreshStudentAttendanceHistory = async (studentId: string) => {
    try {
      const history = await loadStudentAttendanceHistory(store, studentId, {
        limit: 30,
      });
      setStudentAttendanceHistory(history);
      setStudentAttendanceHistoryError("");
      return history;
    } catch {
      setStudentAttendanceHistory([]);
      setStudentAttendanceHistoryError(
        "Yoklama geçmişi okunamadı; mevcut günlük kayıt değiştirilmedi.",
      );
      return [];
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
    const nameParts = {
      firstName:
        student.firstName ?? splitStudentDisplayName(student.name).firstName,
      lastName:
        student.lastName ?? splitStudentDisplayName(student.name).lastName,
    };
    setSelectedStudentId(student.id);
    setStudentProfileForm({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      preferredName: student.preferredName ?? "",
      birthDate: student.birthDate ?? "",
      optionalCode: student.optionalCode ?? "",
      enrollmentDate: student.enrollmentDate ?? "",
      homeLanguages: student.homeLanguages ?? "",
      interests: student.interests ?? "",
      strengths: student.strengths ?? "",
      supportPreferences: student.supportPreferences ?? "",
      contacts: studentContactsForForm(student),
      profilePhotoDataUrl: student.profilePhotoDataUrl ?? "",
    });
    setStudentProfileError("");
    setStudentObservationLimit(20);
    setStudentProfileTab("flow");
    setStudentObservationFilter("all");
    setStudentObservationMonth("all");
    setStudentPortfolioWorkspace(emptyStudentPortfolioWorkspace);
    setStudentAttendanceHistory([]);
    setStudentAttendanceHistoryError("");
    setPortfolioEditor(null);
    setPortfolioError("");
    setRemovedStudentContact(null);
    setRemovedProfilePhoto(null);
    setStudentActionsOpenId(null);
    setStudentProfileOpen(true);
    setAnnouncement(`${student.name} profili açıldı.`);
    void refreshStudentPortfolio(student.id);
    void refreshStudentAttendanceHistory(student.id);
  };

  const openPortfolioEditor = (observation: EvidenceObservationSummary) => {
    const existing = portfolioSelectionByObservationId.get(observation.id);
    setPortfolioEditor({
      observationId: observation.id,
      teacherCaption: existing?.teacherCaption ?? "",
      childReflection: existing?.childReflection ?? observation.childQuote ?? "",
      familyContribution: existing?.familyContribution ?? "",
      selectedBy: existing?.selectedBy ?? "teacher-child",
    });
    setPortfolioError("");
  };

  const persistPortfolioEditor = async () => {
    if (!selectedProfileStudent || !portfolioEditor || dataBusy) return;
    const draft = portfolioEditor;
    setDataBusy(true);
    setPortfolioError("");
    try {
      await enqueuePersistence(() =>
        savePortfolioSelection(store, {
          studentId: selectedProfileStudent.id,
          observationId: draft.observationId,
          selected: true,
          teacherCaption: draft.teacherCaption,
          childReflection: draft.childReflection,
          familyContribution: draft.familyContribution,
          selectedBy: draft.selectedBy,
        }),
      );
      await refreshStudentPortfolio(selectedProfileStudent.id);
      keyboard.hide();
      setPortfolioEditor(null);
      setAnnouncement("Kanıt portfolyo seçkisine kaydedildi.");
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Portfolyo seçimi kaydedilemedi.";
      setPortfolioError(message);
      setAnnouncement("Portfolyo seçimi kaydedilemedi; kaynak kanıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const removePortfolioSelection = async (observationId: string) => {
    if (!selectedProfileStudent || dataBusy) return;
    setDataBusy(true);
    setPortfolioError("");
    try {
      await enqueuePersistence(() =>
        savePortfolioSelection(store, {
          studentId: selectedProfileStudent.id,
          observationId,
          selected: false,
        }),
      );
      await refreshStudentPortfolio(selectedProfileStudent.id);
      keyboard.hide();
      setPortfolioEditor(null);
      setAnnouncement(
        "Kanıt seçkiden kaldırıldı; kaynak gözlem ve seçim geçmişi korundu.",
      );
    } catch (reason) {
      setPortfolioError(
        reason instanceof Error
          ? reason.message
          : "Portfolyo seçimi kaldırılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const saveStudentProfile = async () => {
    if (!selectedProfileStudent || dataBusy) return;
    if (
      !studentProfileForm.firstName.trim() ||
      !studentProfileForm.lastName.trim()
    ) {
      setStudentProfileError("Çocuğun adı ve soyadı ayrı ayrı girilmelidir.");
      return;
    }
    const contactsWithDetails = studentProfileForm.contacts.filter(
      (contact) =>
        contact.phone.trim() ||
        contact.name?.trim() ||
        (contact.kind === "other" && contact.relationship.trim()),
    );
    const incompleteContact = contactsWithDetails.find(
      (contact) => !contact.phone.trim(),
    );
    if (incompleteContact) {
      setStudentProfileError(
        `${incompleteContact.relationship || "Yakın"} için telefon numarası girin veya kaydı kaldırın.`,
      );
      return;
    }
    const contacts = contactsWithDetails.map((contact) => ({
      ...contact,
      relationship:
        contact.kind === "mother"
          ? "Anne"
          : contact.kind === "father"
            ? "Baba"
            : contact.relationship,
    }));
    const updatedStudent: Student = {
      ...selectedProfileStudent,
      name: composeStudentDisplayName(
        studentProfileForm.firstName,
        studentProfileForm.lastName,
      ),
      firstName: studentProfileForm.firstName,
      lastName: studentProfileForm.lastName,
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
      ...(contacts.length > 0 ? { contacts } : {}),
      ...(studentProfileForm.profilePhotoDataUrl
        ? { profilePhotoDataUrl: studentProfileForm.profilePhotoDataUrl }
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
    if (contacts.length === 0) delete updatedStudent.contacts;
    if (!studentProfileForm.profilePhotoDataUrl) {
      delete updatedStudent.profilePhotoDataUrl;
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
      setRemovedStudentContact(null);
      setRemovedProfilePhoto(null);
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

  const updateStudentContact = (
    contactId: string,
    update: Partial<StudentContact>,
  ) => {
    setStudentProfileForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact) =>
        contact.id === contactId ? { ...contact, ...update } : contact,
      ),
    }));
  };

  const setPrimaryStudentContact = (contactId: string, selected: boolean) => {
    setStudentProfileForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => ({
        ...contact,
        isPrimary: selected ? contact.id === contactId : false,
      })),
    }));
  };

  const addStudentContact = () => {
    setStudentProfileForm((current) => ({
      ...current,
      contacts: [
        ...current.contacts,
        emptyStudentContact("other", ""),
      ],
    }));
  };

  const removeStudentContact = (contactId: string) => {
    setStudentProfileForm((current) => {
      const removed = current.contacts.find(
        (contact) => contact.id === contactId,
      );
      if (removed) setRemovedStudentContact(removed);
      return {
        ...current,
        contacts: current.contacts.filter(
          (contact) => contact.id !== contactId,
        ),
      };
    });
  };

  const undoRemoveStudentContact = () => {
    if (!removedStudentContact) return;
    setStudentProfileForm((current) => ({
      ...current,
      contacts: [...current.contacts, removedStudentContact],
    }));
    setRemovedStudentContact(null);
  };

  const removeStudentProfilePhoto = () => {
    if (!studentProfileForm.profilePhotoDataUrl) return;
    setRemovedProfilePhoto(studentProfileForm.profilePhotoDataUrl);
    setStudentProfileForm((current) => ({
      ...current,
      profilePhotoDataUrl: "",
    }));
  };

  const undoRemoveStudentProfilePhoto = () => {
    if (!removedProfilePhoto) return;
    setStudentProfileForm((current) => ({
      ...current,
      profilePhotoDataUrl: removedProfilePhoto,
    }));
    setRemovedProfilePhoto(null);
  };

  const selectStudentProfilePhoto = async (file: File | undefined) => {
    if (!file || profilePhotoBusy) return;
    setProfilePhotoBusy(true);
    setStudentProfileError("");
    try {
      const profilePhotoDataUrl = await prepareStudentProfilePhoto(file);
      setStudentProfileForm((current) => ({
        ...current,
        profilePhotoDataUrl,
      }));
      setRemovedProfilePhoto(null);
      setAnnouncement("Profil fotoğrafı hazırlandı. Profili kaydederek tamamlayın.");
    } catch (reason) {
      setStudentProfileError(
        reason instanceof Error
          ? reason.message
          : "Profil fotoğrafı hazırlanamadı.",
      );
    } finally {
      setProfilePhotoBusy(false);
    }
  };

  const currentStudentObservationExport = () => {
    if (!selectedProfileStudent) return null;
    return {
      text: buildStudentObservationExport(
        selectedProfileStudent,
        visibleSelectedStudentObservations,
      ),
      fileName: studentObservationExportFileName(
        selectedProfileStudent,
        attendanceCivilDate,
      ),
    };
  };

  const downloadCurrentStudentObservations = () => {
    const payload = currentStudentObservationExport();
    if (!payload) return;
    downloadText(payload.fileName, payload.text);
    setAnnouncement("Görüntülenen gözlem arşivi metin dosyası olarak indirildi.");
  };

  const copyCurrentStudentObservations = async () => {
    const payload = currentStudentObservationExport();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.text);
      setAnnouncement("Gözlem arşivi panoya kopyalandı.");
    } catch {
      setStudentProfileError(
        "Pano erişimi kullanılamadı. Metin dosyası olarak indirmeyi deneyin.",
      );
    }
  };

  const shareCurrentStudentObservations = async () => {
    const payload = currentStudentObservationExport();
    if (!payload || !navigator.share) {
      downloadCurrentStudentObservations();
      return;
    }
    try {
      const file = new File([payload.text], payload.fileName, {
        type: "text/plain;charset=utf-8",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${selectedProfileStudent?.name ?? "Çocuk"} gözlem arşivi`,
          text: "MaarifOS gözlem arşivi",
          files: [file],
        });
      } else {
        downloadText(payload.fileName, payload.text);
        setAnnouncement(
          "Telefon uzun metin dosyası paylaşımını desteklemedi; arşiv indirildi.",
        );
        return;
      }
      setAnnouncement("Gözlem arşivi paylaşım ekranına gönderildi.");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setStudentProfileError("Paylaşım açılamadı. Metin dosyası indirmeyi deneyin.");
    }
  };

  const downloadClassObservations = () => {
    if (classExportStartDate && classExportEndDate) {
      if (classExportStartDate > classExportEndDate) {
        setAnnouncement("Dışa aktarım başlangıç tarihi bitiş tarihinden sonra olamaz.");
        return;
      }
    }
    if (classExportStudents.length === 0) {
      setAnnouncement("Dışa aktarım için en az bir çocuk seçin.");
      return;
    }
    const text = buildClassObservationExport(
      classExportStudents.map((student) => ({
        id: student.id,
        name:
          classExportNameMode === "preferred"
            ? student.preferredName ?? student.name
            : student.name,
      })),
      classExportObservations,
    );
    downloadText(
      classroomObservationExportFileName(attendanceCivilDate),
      text,
    );
    setAnnouncement("Sınıf gözlem arşivi çocuklara göre gruplanmış metin olarak indirildi.");
  };

  const archiveStudent = async (studentId: string) => {
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

  const openAcademicCalendar = async () => {
    if (!configuredClassroom) {
      setClassroomOpen(true);
      setAnnouncement("Takvimi açmadan önce sınıfınızı kurun.");
      return;
    }
    setDataBusy(true);
    setCalendarError("");
    try {
      const calendar = await loadAcademicCalendar(store);
      const preferredDate =
        attendanceCivilDate >= configuredClassroom.academicYearStart &&
        attendanceCivilDate <= configuredClassroom.academicYearEnd
          ? attendanceCivilDate
          : configuredClassroom.academicYearStart;
      setAcademicCalendar(calendar);
      setCalendarSelectedDate(preferredDate);
      setCalendarMonth(preferredDate.slice(0, 7));
      setPlansOpen(false);
      setCalendarOpen(true);
      setAnnouncement("Eğitim takvimi açıldı.");
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Eğitim takvimi açılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const selectOfficialCalendarEvent = (
    event: (typeof OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events)[number],
  ) => {
    setCalendarSelectedDate(event.startDate);
    setCalendarMonth(event.startDate.slice(0, 7));
    setCalendarEntryForm({
      entryType:
        event.kind === "adaptation"
          ? "adaptation_day"
          : "official_marker",
      title: event.title,
      note: "Öğretmen işareti · MEB 2026–2027 çalışma takvimi",
      status: "planned",
    });
    setCalendarError("");
  };

  const persistCalendarEntry = async () => {
    if (!calendarEntryForm.title.trim()) {
      setCalendarError("Takvim başlığı boş bırakılamaz.");
      return;
    }
    setDataBusy(true);
    setCalendarError("");
    try {
      await enqueuePersistence(() =>
        saveCalendarEntry(store, {
          entryType: calendarEntryForm.entryType,
          title: calendarEntryForm.title,
          note: calendarEntryForm.note,
          status: calendarEntryForm.status,
          startDate: calendarSelectedDate,
          endDate: calendarSelectedDate,
        }),
      );
      const calendar = await loadAcademicCalendar(store);
      setAcademicCalendar(calendar);
      setCalendarEntryForm(initialCalendarEntryForm);
      setAnnouncement(
        `${formatTurkishCivilDate(calendarSelectedDate)} takvim notu kaydedildi.`,
      );
    } catch (reason) {
      setCalendarError(
        reason instanceof Error
          ? reason.message
          : "Takvim notu kaydedilemedi.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const updateCalendarEntryStatus = async (
    entry: CalendarEntry,
    status: CalendarEntryStatus,
  ) => {
    setDataBusy(true);
    setCalendarError("");
    try {
      await enqueuePersistence(() =>
        saveCalendarEntry(store, { ...entry, status }),
      );
      setAcademicCalendar(await loadAcademicCalendar(store));
      setAnnouncement(
        `${entry.title}: ${calendarEntryStatusLabels[status].toLocaleLowerCase("tr-TR")}.`,
      );
    } catch (reason) {
      setCalendarError(
        reason instanceof Error
          ? reason.message
          : "Takvim işareti güncellenemedi.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const deleteCalendarEntry = async (entry: CalendarEntry) => {
    setDataBusy(true);
    setCalendarError("");
    try {
      await enqueuePersistence(() =>
        removeCalendarEntry(store, { id: entry.id }),
      );
      setAcademicCalendar(await loadAcademicCalendar(store));
      setAnnouncement(`${entry.title} takvimden kaldırıldı.`);
    } catch (reason) {
      setCalendarError(
        reason instanceof Error
          ? reason.message
          : "Takvim notu kaldırılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const openStudentDeletion = async (student: Student) => {
    setDataBusy(true);
    try {
      const snapshot = await store.readSnapshot();
      const impact = previewPermanentStudentDeletion(snapshot, student.id);
      setStudentDeletionCandidate(student);
      setStudentDeletionImpact(impact);
      setStudentDeletionConfirmation("");
      setAnnouncement(
        `${student.name} için kalıcı silme etkisi hesaplandı.`,
      );
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Kalıcı silme önizlemesi hazırlanamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const confirmPermanentStudentDeletion = async () => {
    if (!studentDeletionCandidate || !studentDeletionImpact) return;
    setDataBusy(true);
    try {
      const result = await enqueuePersistence(() =>
        permanentlyDeleteArchivedStudent(store, {
          studentId: studentDeletionCandidate.id,
          confirmationName: studentDeletionConfirmation,
        }),
      );
      const dashboard = await loadDashboardState(
        store,
        fallbackDashboardState,
      );
      setStudents(dashboard.students);
      setArchivedStudents(dashboard.archivedStudents);
      setStudentDeletionCandidate(null);
      setStudentDeletionImpact(null);
      setStudentDeletionConfirmation("");
      setAnnouncement(
        `${result.displayName} ve ${result.removedEntityCount} bağlı kayıt kalıcı olarak silindi.`,
      );
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Öğrenci kalıcı olarak silinemedi.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const openStudentShareCenter = async () => {
    if (!selectedProfileStudent || !configuredClassroom) return;
    setStudentShareError("");
    setLastExportPackageId(null);
    setStudentShareForm((current) => ({
      ...current,
      periodStart: configuredClassroom.academicYearStart,
      periodEnd: configuredClassroom.academicYearEnd,
      identityMode: "full",
      includeContacts: true,
      personalDataApprovedForAi: true,
    }));
    setAiWorkspacePrompt("");
    setExternalFeedbackForm((current) => ({
      ...current,
      periodStart: configuredClassroom.academicYearStart,
      periodEnd: configuredClassroom.academicYearEnd,
      feedbackText: "",
      teacherNote: "",
    }));
    try {
      const snapshot = await store.readSnapshot();
      setExternalFeedback(
        listExternalAiFeedback(snapshot, selectedProfileStudent.id),
      );
      setStudentProfileOpen(false);
      setStudentShareOpen(true);
      setAnnouncement(`${selectedProfileStudent.name} paylaşım merkezi açıldı.`);
    } catch (reason) {
      setStudentShareError(
        reason instanceof Error
          ? reason.message
          : "Paylaşım merkezi açılamadı.",
      );
    }
  };

  const prepareStudentDossier = async () => {
    if (!selectedProfileStudent || studentShareBusy) return;
    setStudentShareBusy(true);
    setStudentShareError("");
    try {
      const result = await enqueuePersistence(() =>
        createStudentDossier(store, {
          studentId: selectedProfileStudent.id,
          options: {
            destination: studentShareForm.destination,
            audience: studentShareForm.audience,
            identityMode: studentShareForm.identityMode,
            alias: studentShareForm.alias,
            periodStart: studentShareForm.periodStart,
            periodEnd: studentShareForm.periodEnd,
            includeContacts: studentShareForm.includeContacts,
            includeAttendance: studentShareForm.includeAttendance,
            includeObservations: studentShareForm.includeObservations,
            includePortfolio: studentShareForm.includePortfolio,
            includeExternalFeedback:
              studentShareForm.includeExternalFeedback,
            personalDataApprovedForAi:
              studentShareForm.personalDataApprovedForAi,
          },
        }),
      );
      setLastExportPackageId(result.exportPackageId);
      if (studentShareForm.destination === "whatsapp") {
        const file = new File([result.dossier.text], result.dossier.fileName, {
          type: "text/plain;charset=utf-8",
        });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: result.dossier.title,
            text: "MaarifOS öğrenci dosyası",
            files: [file],
          });
          setAnnouncement("Öğrenci dosyası paylaşım ekranına gönderildi.");
        } else {
          downloadText(result.dossier.fileName, result.dossier.text);
          setAnnouncement(
            "Bu cihaz dosya paylaşımını desteklemedi; WhatsApp’ta ekleyebilmeniz için dosya indirildi.",
          );
        }
      } else if (
        studentShareForm.destination === "chatgpt" ||
        studentShareForm.destination === "gemini"
      ) {
        const aiProvider: ExternalFeedbackFormState["provider"] =
          studentShareForm.destination;
        setAiWorkspacePrompt(result.dossier.text);
        setExternalFeedbackForm((current) => ({
          ...current,
          provider: aiProvider,
          audience: studentShareForm.audience,
          periodStart: studentShareForm.periodStart,
          periodEnd: studentShareForm.periodEnd,
        }));
        setAnnouncement(
          `${studentShareForm.destination === "chatgpt" ? "ChatGPT" : "Gemini"} için metin uygulama içindeki yazma alanına yerleştirildi.`,
        );
      } else {
        downloadText(result.dossier.fileName, result.dossier.text);
        setAnnouncement("Öğrenci dosyası metin olarak indirildi.");
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        return;
      }
      setStudentShareError(
        reason instanceof Error
          ? reason.message
          : "Öğrenci dosyası hazırlanamadı.",
      );
    } finally {
      setStudentShareBusy(false);
    }
  };

  const persistExternalFeedback = async () => {
    if (!selectedProfileStudent || studentShareBusy) return;
    setStudentShareBusy(true);
    setStudentShareError("");
    try {
      await enqueuePersistence(() =>
        saveExternalAiFeedback(store, {
          studentId: selectedProfileStudent.id,
          provider: externalFeedbackForm.provider,
          audience: externalFeedbackForm.audience,
          periodStart: externalFeedbackForm.periodStart,
          periodEnd: externalFeedbackForm.periodEnd,
          feedbackText: externalFeedbackForm.feedbackText,
          teacherNote: externalFeedbackForm.teacherNote,
          includeInTermSummary:
            externalFeedbackForm.includeInTermSummary,
          includeInYearSummary:
            externalFeedbackForm.includeInYearSummary,
          ...(lastExportPackageId
            ? { linkedExportPackageId: lastExportPackageId }
            : {}),
        }),
      );
      const snapshot = await store.readSnapshot();
      setExternalFeedback(
        listExternalAiFeedback(snapshot, selectedProfileStudent.id),
      );
      setExternalFeedbackForm((current) => ({
        ...current,
        feedbackText: "",
        teacherNote: "",
      }));
      setAnnouncement(
        "Yapay zekâ geri bildirimi öğrenciye kaydedildi.",
      );
    } catch (reason) {
      setStudentShareError(
        reason instanceof Error
          ? reason.message
          : "Geri bildirim kaydedilemedi.",
      );
    } finally {
      setStudentShareBusy(false);
    }
  };

  const copyAiWorkspacePrompt = async () => {
    if (!aiWorkspacePrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(aiWorkspacePrompt);
      setAnnouncement("Yapay zekâ yazma alanındaki metin panoya kopyalandı.");
    } catch {
      setStudentShareError("Metin panoya kopyalanamadı; yazma alanından elle seçebilirsiniz.");
    }
  };

  const openSelectedAiProvider = () => {
    const destination =
      studentShareForm.destination === "gemini" ? "gemini" : "chatgpt";
    const url =
      destination === "chatgpt"
        ? "https://chatgpt.com/"
        : "https://gemini.google.com/app";
    window.open(url, "_blank", "noopener,noreferrer");
    setAnnouncement(
      `${destination === "chatgpt" ? "ChatGPT" : "Gemini"} açıldı. Hazır metni tek dokunuşla kopyalayabilirsiniz.`,
    );
  };

  const applyOfficialAcademicCalendar = () => {
    setClassroomForm((current) => ({
      ...current,
      academicYearName:
        OFFICIAL_ACADEMIC_CALENDAR_2026_2027.academicYearName,
      academicYearStart:
        OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate,
      academicYearEnd: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataEndDate,
    }));
    setAcademicYearTransitionConfirmed(false);
    setClassroomError("");
    setAnnouncement("2026–2027 MEB takvim tarihleri forma uygulandı.");
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
    if (academicYearTransitionRequired && !academicYearTransitionConfirmed) {
      setClassroomError(
        "Yeni eğitim yılına geçmek için önce arşivleme ve öğrenci taşıma onayını işaretleyin.",
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
      const baseConfiguration = {
        academicYear: {
          name: classroomForm.academicYearName,
          startDate: classroomForm.academicYearStart,
          endDate: classroomForm.academicYearEnd,
        },
        classroom: {
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
      };
      const context = await enqueuePersistence(
        () => {
          if (academicYearTransitionRequired && configuredClassroom) {
            const today = civilDateInIstanbul(new Date());
            const closedOn =
              today < configuredClassroom.academicYearStart
                ? configuredClassroom.academicYearStart
                : today > configuredClassroom.academicYearEnd
                  ? configuredClassroom.academicYearEnd
                  : today;
            return transitionAcademicYearConfiguration(store, {
              ...baseConfiguration,
              academicYear: {
                ...baseConfiguration.academicYear,
                id: crypto.randomUUID(),
              },
              classroom: {
                ...baseConfiguration.classroom,
                id: crypto.randomUUID(),
              },
              carryStudentIds: students.map((student) => student.id),
              closedOn,
            });
          }
          return saveClassroomConfiguration(store, {
            ...baseConfiguration,
            academicYear: {
              ...baseConfiguration.academicYear,
              id: configuredClassroom?.academicYearId,
            },
            classroom: {
              ...baseConfiguration.classroom,
              id: configuredClassroom?.classroomId,
            },
          });
        },
        {
          failureDetail:
            "Sınıf ayarları bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Sınıf ve çalışma düzeni bu cihaza kaydedildi.",
        },
      );
      const [refreshed, dashboard] = await Promise.all([
        refreshD1Workspaces(),
        loadDashboardState(store, fallbackDashboardState),
      ]);
      setStudents(dashboard.students);
      setArchivedStudents(dashboard.archivedStudents);
      setAttendanceCompleted(dashboard.attendanceCompleted);
      setAttendanceCivilDate(dashboard.attendanceCivilDate);
      setAcademicYearTransitionConfirmed(false);
      setEvidenceFlowRequest(null);
      setPlanFlowOpen(false);
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
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
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
    setPremiumDailyTemplate(null);
    setEvidenceFlowRequest(null);
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
    setStudentProfileOpen(restorableSurface === "student-profile");
    setStudentShareOpen(restorableSurface === "student-share");
    if (restorableSurface !== "student-delete") {
      setStudentDeletionCandidate(null);
      setStudentDeletionImpact(null);
      setStudentDeletionConfirmation("");
    }
    setProfileOpen(restorableSurface === "settings");
    setClassroomOpen(restorableSurface === "classroom");
    setPlansOpen(restorableSurface === "plans");
    setCalendarOpen(restorableSurface === "calendar");
    setDocumentsOpen(restorableSurface === "documents");
    setReleaseNotesOpen(restorableSurface === "release-notes");
    setPlanFlowOpen(restorableSurface === "plan-flow");
    setPremiumPlanOpen(restorableSurface === "premium-plans");
    setEvidenceFlowRequest(evidenceRequest);
    setStudentActionsOpenId(null);
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

  const openPlanFlow = (initialTemplate?: PremiumDailyTemplateSelection) => {
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
    const futurePremiumPreparation =
      configuredClassroom.operationalStatus === "preparation" &&
      initialTemplate !== undefined;
    if (educationalWriteNotice && !futurePremiumPreparation) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
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
    setPremiumPlanOpen(false);
    setPremiumDailyTemplate(initialTemplate ?? null);
    setPlanFlowOpen(true);
  };

  const openActivityEvidence = async (
    activityId: string,
    initialStudentId?: string,
  ) => {
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }
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
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
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
    setCaptureMenuOpen(true);
    setAnnouncement("Ne eklemek istediğinizi seçin.");
  };

  const openPendingObservation = (
    requestedObservation?: EvidenceObservationSummary,
  ) => {
    const pending =
      requestedObservation ??
      evidenceWorkspace.pendingObservations[0];
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
    setStudentProfileOpen(false);
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
          ...command,
          curriculumProfile,
        });
        if (command.civilDate === currentCivilDate) {
          await setTodayActivityStatus(store, created.activity.id, "in_progress");
        }
        return created;
      },
      {
        failureDetail:
          "Günlük plan bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
        successDetail: "Günlük plan ve ilk etkinlik bu cihaza kaydedildi.",
      },
    );
    const refreshed = await refreshD1Workspaces();
    if (command.civilDate !== currentCivilDate) {
      const activity = result.activity;
      surfaceTransitionRef.current = null;
      setPlanFlowOpen(false);
      setPremiumDailyTemplate(null);
      setAnnouncement(
        `${activity.title} ${command.civilDate} tarihi için planlandı. Etkinlik ve gözlem, plan gününde başlatılabilir.`,
      );
      return;
    }
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
      if (await closeD1Flow()) {
        navigate("classroom");
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
      keyboard.hide();
      navigate("classroom");
      setAnnouncement("Sınıfım bölümü açıldı.");
      return;
    }
    if (id === "plans") {
      setPlansOpen(true);
      return;
    }
    if (id === "documents") {
      setDocumentsOpen(true);
      return;
    }
    navigate("today");
    setAnnouncement(`${label} bölümü seçildi.`);
  };

  const changeAttendanceOpen = (open: boolean) => {
    if (open && educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
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

  const applyReadyUpdate = async () => {
    if (dataBusy) return;
    setDataBusy(true);
    setAnnouncement("Bekleyen kayıtlar doğrulanıyor.");
    try {
      await flushPendingWrites();
      setUpdateReady(false);
      setAnnouncement("Kayıtlar doğrulandı; MaarifOS güncelleniyor.");
      window.dispatchEvent(new CustomEvent("maarifos:apply-update"));
    } catch {
      setUpdateReady(true);
      setAnnouncement(
        "Güncelleme bekletildi; önce bekleyen kaydın bu cihaza yazıldığını doğrulayın.",
      );
    } finally {
      setDataBusy(false);
    }
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
                label: "Kaydedildi · Çevrim dışı hazır",
                className: "is-ready",
                icon: <CheckCircledIcon aria-hidden="true" />,
              }
            : offlineReadiness === "unavailable"
              ? {
                  label: "Kaydedildi · Çevrim dışı kullanım desteklenmiyor",
                  className: "is-warning",
                  icon: <CheckCircledIcon aria-hidden="true" />,
                }
              : {
                  label: "Kaydedildi · Çevrim dışı hazırlık denetleniyor",
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
      <RouteFocusBoundary routeId={route.id}>
        <MobileScroll className="maarif-scroll">
          {route.id === "classroom" ? (
            <Suspense
              fallback={
                <div className="route-loading" role="status" data-testid="classroom-route-loading">
                  Sınıf ekranı hazırlanıyor…
                </div>
              }
            >
              <ClassroomScreen
                summary={{
                  activeStudentCount: students.length,
                  presentStudentCount: counts.present,
                  observedStudentCount,
                }}
                visibleStudents={visibleStudents}
                archivedStudents={archivedStudents}
                searchQuery={studentSearch}
                hasActiveSearch={Boolean(normalizedStudentSearch)}
                openActionsStudentId={studentActionsOpenId}
                isBusy={dataBusy}
                educationalWritesDisabled={educationalWritesDisabled}
                educationalWriteNotice={educationalWriteNotice}
                getObservationCount={(studentId) =>
                  observationCountByStudent.get(studentId) ?? 0
                }
                getAgeLabel={(student) =>
                  formatChildAge(student.birthDate, attendanceCivilDate)
                }
                renderAvatar={(student) => {
                  const sourceStudent = [...students, ...archivedStudents].find(
                    (candidate) => candidate.id === student.id,
                  );
                  return sourceStudent ? <StudentAvatar student={sourceStudent} /> : null;
                }}
                onSearchQueryChange={setStudentSearch}
                onOpenAddStudent={() => {
                  setStudentActionsOpenId(null);
                  setStudentAddOpen(true);
                }}
                onOpenExport={() => {
                  if (classExportStudentIds.length === 0) {
                    setClassExportStudentIds(
                      [...students, ...archivedStudents].map((student) => student.id),
                    );
                  }
                  setClassExportPreviewOpen(true);
                }}
                onOpenProfile={openStudentProfile}
                onOpenObservation={openStudentObservation}
                onToggleStudentActions={(studentId) =>
                  setStudentActionsOpenId((current) =>
                    current === studentId ? null : studentId,
                  )
                }
                onArchiveStudent={archiveStudent}
                onRestoreStudent={restoreStudent}
                onDeleteStudent={(student) => {
                  const sourceStudent = archivedStudents.find(
                    (candidate) => candidate.id === student.id,
                  );
                  if (sourceStudent) void openStudentDeletion(sourceStudent);
                }}
              />
            </Suspense>
          ) : (
            <TodayScreen
              model={{
                workspace: todayWorkspace,
                civilDateLabel: formatTurkishCivilDate(attendanceCivilDate),
                students: todayStudentCards,
                attendance: counts,
                syncState: syncStateView,
                educationalWriteNotice,
                educationalWritesDisabled,
                dataBusy,
                updateReady,
                updateVersion: CURRENT_RELEASE.version,
                pendingObservationCount: evidenceWorkspace.pendingObservations.length,
                planEvidenceDetailsEnabled: isCapabilityEnabled("planEvidenceDetails"),
                premiumPlanCenterEnabled: premiumPilotPreviewEnabled,
              }}
              actions={{
                onOpenSettings: () => setProfileOpen(true),
                onApplyReadyUpdate: applyReadyUpdate,
                onOpenClassroom: () => setClassroomOpen(true),
                onOpenAttendance: () => changeAttendanceOpen(true),
                onOpenCalendar: openAcademicCalendar,
                onOpenStudentSearch: () => {
                  setStudentSearch("");
                  navigate("classroom");
                  setAnnouncement("Öğrenci arama açıldı.");
                },
                onOpenStudentProfile: openStudentProfile,
                onOpenStudentObservation: openStudentObservation,
                onOpenActivityEvidence: openActivityEvidence,
                onCompleteCurrentActivity: completeCurrentActivity,
                onOpenPlanFlow: () => openPlanFlow(),
                onOpenPremiumPlans: () => {
                  if (!configuredClassroom?.curriculumProfile) {
                    setClassroomOpen(true);
                    setAnnouncement("Plan Kütüphanesi için önce sınıf program profilini tamamlayın.");
                    return;
                  }
                  surfaceTransitionRef.current = "premium-plans";
                  setPremiumPlanOpen(true);
                },
                onOpenPlanItem: (item) => {
                  setPlansOpen(true);
                  setAnnouncement(`${item.title} plan kaydı açıldı.`);
                },
                onOpenPendingObservation: () => openPendingObservation(),
              }}
              slots={{ formatStudentAge: formatChildAge }}
            />
          )}
        </MobileScroll>
      </RouteFocusBoundary>

      <nav className="bottom-nav" aria-label="Ana menü">
        {visiblePrimaryNavigation().map((item) => (
          <button
            type="button"
            key={item.id}
            className={
              item.id === "capture"
                ? "nav-add"
                : route.id === item.id
                  ? "is-active"
                  : ""
            }
            onClick={() => handleNav(item.id, item.label)}
            aria-label={item.id === "capture" ? "Kayıt ekle" : undefined}
            aria-current={route.id === item.id ? "page" : undefined}
          >
            {item.id === "today" ? (
              <HomeIcon aria-hidden="true" />
            ) : item.id === "classroom" ? (
              <PersonIcon aria-hidden="true" />
            ) : (
              <PlusIcon aria-hidden="true" />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <BottomSheet
        open={captureMenuOpen}
        onOpenChange={setCaptureMenuOpen}
        title="Ne ekleyelim?"
        description="Bir işlem seçin; yalnız gerekli alanlar açılır."
        snap={0.58}
      >
        <div className="capture-choice-grid">
          <button
            type="button"
            onClick={() => {
              setCaptureMenuOpen(false);
              if (students.length === 1) {
                void openStudentObservation(students[0].id);
              } else {
                navigate("classroom");
                setAnnouncement("Gözlem yazacağınız öğrenciyi seçin.");
              }
            }}
            disabled={educationalWritesDisabled}
          >
            <Pencil1Icon aria-hidden="true" />
            <span>
              <strong>Gözlem yaz</strong>
              <small>Öğrenci seç → yaz → kaydet</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureMenuOpen(false);
              changeAttendanceOpen(true);
            }}
            disabled={educationalWritesDisabled}
          >
            <CheckCircledIcon aria-hidden="true" />
            <span>
              <strong>Yoklama al</strong>
              <small>Çocuklara dokunarak işaretle</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          {isCapabilityEnabled("planEvidenceDetails") ? (
          <button
            type="button"
            onClick={() => {
              d1ReturnFocusRef.current =
                document.querySelector<HTMLElement>(".nav-add");
              setCaptureMenuOpen(false);
              openPlanFlow();
            }}
            disabled={educationalWritesDisabled}
          >
            <ReaderIcon aria-hidden="true" />
            <span>
              <strong>Etkinlik planla</strong>
              <small>Fikir seç → hedef seç → başlat</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          ) : null}
          {isCapabilityEnabled("calendarNotes") ? (
          <button
            type="button"
            onClick={() => {
              setCaptureMenuOpen(false);
              void openAcademicCalendar();
            }}
          >
            <CalendarIcon aria-hidden="true" />
            <span>
              <strong>Takvime not ekle</strong>
              <small>Toplantı, meyve günü veya etkinlik</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          ) : null}
        </div>
      </BottomSheet>

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

          <section className="official-calendar-preset">
            <div>
              <span className="d1-kicker">MEB resmî takvimi</span>
              <strong>2026–2027 eğitim öğretim yılı</strong>
              <small>
                Uyum: 7–11 Eylül · Dersler: 14 Eylül 2026–25 Haziran
                2027
              </small>
            </div>
            <button type="button" onClick={applyOfficialAcademicCalendar}>
              Tarihleri uygula
            </button>
            <a
              href={OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events[0].sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              MEB duyurusunu aç
            </a>
          </section>

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

          {classroomFormOperationalNotice ? (
            <div className="academic-year-form-warning" role="alert">
              <CalendarIcon aria-hidden="true" />
              <span>
                <strong>Seçili tarihler bugün etkin değil</strong>
                {classroomFormOperationalNotice}
              </span>
            </div>
          ) : null}

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
            TYMM seçiminde resmî okul öncesi alan matrislerindeki tam öğrenme
            çıktıları; EÇE/2024 seçiminde başlangıç kataloğu önerilir. Kimlik
            veya sürümü değiştirirseniz kayıt öğretmen beyanı olarak
            işaretlenir.
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
          {academicYearTransitionRequired ? (
            <label className="academic-year-transition-confirm">
              <input
                type="checkbox"
                checked={academicYearTransitionConfirmed}
                onChange={(event) =>
                  setAcademicYearTransitionConfirmed(event.target.checked)
                }
              />
              <span>
                <strong>Yeni eğitim yılına güvenli geçiş yap</strong>
                Mevcut yıl ve sınıf arşivlensin; {students.length} etkin
                öğrenci yeni yıla taşınsın. Eski gözlem, portfolyo ve
                değerlendirmeler kendi yılı içinde korunsun.
              </span>
            </label>
          ) : null}
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
              !classroomForm.curriculumSourceVersion.trim() ||
              (academicYearTransitionRequired &&
                !academicYearTransitionConfirmed)
            }
          >
            {academicYearTransitionRequired
              ? "Yeni eğitim yılına geç"
              : "Sınıfı ve çalışma düzenini kaydet"}
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={plansOpen}
        onOpenChange={(open) => {
          setPlansOpen(open);
        }}
        title="Bugünün planı"
        description={`${formatTurkishCivilDate(todayWorkspace.civilDate)} · Kayıtlı etkinlikler`}
        snap={0.78}
      >
        <button
          className="plans-calendar-button"
          type="button"
          onClick={() => void openAcademicCalendar()}
        >
          <CalendarIcon aria-hidden="true" />
          <span>
            <strong>2026–2027 eğitim takvimi</strong>
            <small>Uyum günleri, veli toplantısı, meyve günü ve notlar</small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
        <button className="sheet-primary plans-create-button" type="button" onClick={() => openPlanFlow()} disabled={educationalWritesDisabled}>
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
                disabled={educationalWritesDisabled}
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
        open={calendarOpen}
        onOpenChange={(open) => {
          setCalendarOpen(open);
        }}
        title="Eğitim takvimi"
        description="MEB 2026–2027 çalışma takvimi ve sınıf notları"
        snap={0.94}
      >
        <div className="academic-calendar-sheet">
          <section className="calendar-source-card">
            <CalendarIcon aria-hidden="true" />
            <div>
              <span className="d1-kicker">Resmî kaynak</span>
              <strong>Okul öncesi uyum eğitimi 7–11 Eylül 2026</strong>
              <small>
                Birinci dönem 14 Eylül 2026’da başlar; eğitim öğretim yılı
                25 Haziran 2027’de biter.
              </small>
            </div>
            <a
              href={OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events[0].sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              MEB
            </a>
          </section>

          <div className="calendar-month-toolbar">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((current) =>
                  shiftCalendarMonth(current, -1),
                )
              }
              aria-label="Önceki ay"
            >
              ‹
            </button>
            <strong>{formatCalendarMonth(calendarMonth)}</strong>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((current) =>
                  shiftCalendarMonth(current, 1),
                )
              }
              aria-label="Sonraki ay"
            >
              ›
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(
              (label) => <span key={label}>{label}</span>,
            )}
          </div>
          <div className="calendar-grid" role="grid">
            {visibleCalendarDays.map((day) => {
              const official = officialEventsOnDate(
                academicCalendar.officialEvents,
                day.civilDate,
              );
              const entries = academicCalendar.entries.filter(
                (entry) =>
                  entry.startDate <= day.civilDate &&
                  entry.endDate >= day.civilDate,
              );
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={day.civilDate}
                  className={[
                    day.inMonth ? "" : "is-outside",
                    day.civilDate === calendarSelectedDate
                      ? "is-selected"
                      : "",
                    official.length > 0 ? "has-official" : "",
                    entries.length > 0 ? "has-entry" : "",
                  ].filter(Boolean).join(" ")}
                  aria-selected={day.civilDate === calendarSelectedDate}
                  aria-label={`${formatTurkishCivilDate(day.civilDate)}${
                    official.length + entries.length > 0
                      ? `, ${official.length + entries.length} kayıt`
                      : ""
                  }`}
                  onClick={() => {
                    setCalendarSelectedDate(day.civilDate);
                    if (!day.inMonth) {
                      setCalendarMonth(day.civilDate.slice(0, 7));
                    }
                    setCalendarError("");
                  }}
                >
                  <span>{day.day}</span>
                  <i aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <section className="calendar-selected-day">
            <header>
              <div>
                <span className="d1-kicker">Seçili gün</span>
                <h3>{formatTurkishCivilDate(calendarSelectedDate)}</h3>
              </div>
              <span>
                {selectedOfficialCalendarEvents.length +
                  selectedTeacherCalendarEntries.length}{" "}
                kayıt
              </span>
            </header>

            {selectedOfficialCalendarEvents.map((event) => (
              <article className="calendar-official-event" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <small>
                    {event.startDate === event.endDate
                      ? formatTurkishCivilDate(event.startDate)
                      : `${formatTurkishCivilDate(event.startDate)} – ${formatTurkishCivilDate(event.endDate)}`}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => selectOfficialCalendarEvent(event)}
                >
                  İşaretle
                </button>
              </article>
            ))}

            {selectedTeacherCalendarEntries.map((entry) => (
              <article className="calendar-teacher-entry" key={entry.id}>
                <div>
                  <span>{calendarEntryTypeLabels[entry.entryType]}</span>
                  <strong>{entry.title}</strong>
                  {entry.note ? <p>{entry.note}</p> : null}
                </div>
                <div>
                  <select
                    aria-label={`${entry.title} durumu`}
                    value={entry.status}
                    onChange={(event) =>
                      void updateCalendarEntryStatus(
                        entry,
                        event.target.value as CalendarEntryStatus,
                      )
                    }
                    disabled={dataBusy}
                  >
                    {Object.entries(calendarEntryStatusLabels).map(
                      ([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => void deleteCalendarEntry(entry)}
                    disabled={dataBusy}
                    aria-label={`${entry.title} takvim notunu kaldır`}
                  >
                    <TrashIcon aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </section>

          <form
            className="calendar-entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              void persistCalendarEntry();
            }}
          >
            <div>
              <span className="d1-kicker">Yeni sınıf notu</span>
              <strong>{formatTurkishCivilDate(calendarSelectedDate)}</strong>
            </div>
            <label>
              Tür
              <select
                value={calendarEntryForm.entryType}
                onChange={(event) =>
                  setCalendarEntryForm((current) => ({
                    ...current,
                    entryType: event.target.value as CalendarEntryType,
                  }))
                }
              >
                {Object.entries(calendarEntryTypeLabels).map(
                  ([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Başlık
              <KeyboardInput
                value={calendarEntryForm.title}
                maxLength={160}
                onChange={(event) =>
                  setCalendarEntryForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Örn. Veli toplantısı"
              />
            </label>
            <label>
              Not
              <KeyboardTextarea
                value={calendarEntryForm.note}
                maxLength={5_000}
                rows={3}
                onChange={(event) =>
                  setCalendarEntryForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Saat, hazırlık veya sınıf için kısa açıklama"
              />
            </label>
            {calendarError ? (
              <p className="d1-error" role="alert">{calendarError}</p>
            ) : null}
            <button
              className="sheet-primary"
              type="submit"
              disabled={dataBusy || !calendarEntryForm.title.trim()}
            >
              <PlusIcon aria-hidden="true" />
              Takvime kaydet
            </button>
          </form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={documentsOpen}
        onOpenChange={(open) => {
          setDocumentsOpen(open);
        }}
        title="Paylaşım taslakları"
        description="Yalnız öğretmenin seçtiği kapsamla hazırlanan metin dışa aktarımları"
        snap={0.82}
      >
        <section className="documents-coming-soon">
          <span aria-hidden="true"><ArchiveIcon /></span>
          <small>Öğretmen denetimli çalışma alanı</small>
          <h3>Öğrenci dosyasını amaca göre hazırlayın</h3>
          <p>
            Okul idaresi, rehberlik öğretmeni, veli, ChatGPT veya Gemini için
            kapsamı ayrı seçin. Yapay zekâdan aldığınız geri dönüşü öğrenciye
            kaydedip dönem ve yıl sonu çalışmasına dâhil edin.
          </p>
          <strong>
            {students.length + archivedStudents.length} öğrenci ·{" "}
            {allEvidenceObservations.length} tarihli gözlem
          </strong>
          <div className="documents-student-list">
            {[...students, ...archivedStudents].map((student) => (
              <button
                type="button"
                key={student.id}
                onClick={() => {
                  setDocumentsOpen(false);
                  openStudentProfile(student.id);
                }}
              >
                <StudentAvatar student={student} />
                <span>
                  <strong>{student.preferredName ?? student.name}</strong>
                  <small>
                    {observationCountByStudent.get(student.id) ?? 0} gözlem ·
                    dosyayı aç
                  </small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ))}
          </div>
          {students.length + archivedStudents.length === 0 ? (
            <button
              className="sheet-primary"
              type="button"
              onClick={() => {
                setDocumentsOpen(false);
                navigate("classroom");
                setStudentAddOpen(true);
              }}
            >
              <PlusIcon aria-hidden="true" />
              İlk öğrenciyi ekle
            </button>
          ) : null}
        </section>
      </BottomSheet>

      <ClassroomToolsSheets
        addOpen={studentAddOpen}
        exportOpen={classExportPreviewOpen}
        busy={dataBusy}
        newStudentName={newStudentName}
        civilDate={attendanceCivilDate}
        exportStartDate={classExportStartDate}
        exportEndDate={classExportEndDate}
        exportNameMode={classExportNameMode}
        exportStudentIds={classExportStudentIds}
        students={[...students, ...archivedStudents]}
        observationCount={classExportObservations.length}
        onAddOpenChange={(open) => {
          if (!open) keyboard.hide();
          setStudentAddOpen(open);
        }}
        onExportOpenChange={(open) => {
          if (!open) keyboard.hide();
          setClassExportPreviewOpen(open);
        }}
        onNewStudentNameChange={setNewStudentName}
        onAddStudent={addStudent}
        onExportStartDateChange={setClassExportStartDate}
        onExportEndDateChange={setClassExportEndDate}
        onExportNameModeChange={setClassExportNameMode}
        onExportStudentIdsChange={setClassExportStudentIds}
        onDownload={downloadClassObservations}
      />

      <BottomSheet
        open={studentDeletionCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStudentDeletionCandidate(null);
            setStudentDeletionImpact(null);
            setStudentDeletionConfirmation("");
          }
        }}
        title="Kalıcı öğrenci silme"
        description="Bu işlem geri alınamaz; önce etki özeti ve ad onayı gösterilir"
        snap={0.82}
      >
        {studentDeletionCandidate && studentDeletionImpact ? (
          <div className="student-delete-sheet">
            <section className="student-delete-warning">
              <TrashIcon aria-hidden="true" />
              <div>
                <span className="d1-kicker">Geri alınamaz işlem</span>
                <h3>{studentDeletionImpact.displayName}</h3>
                <p>
                  Öğrenci profili ve ona bağlı kayıtlar bu cihazdan fiziksel
                  olarak kaldırılır; öğrenciyi içeren cihaz içi kurtarma
                  noktaları da temizlenir. Daha önce indirilmiş veya başka
                  yerde tutulan eski yedekler değiştirilemez ve öğrenci
                  verisini içermeye devam edebilir.
                </p>
              </div>
            </section>
            <div className="student-delete-impact" aria-label="Silme etkisi">
              <div><strong>{studentDeletionImpact.attendanceCount}</strong><span>devam kaydı</span></div>
              <div><strong>{studentDeletionImpact.observationCount}</strong><span>gözlem</span></div>
              <div><strong>{studentDeletionImpact.mediaCount}</strong><span>medya</span></div>
              <div><strong>{studentDeletionImpact.portfolioCount}</strong><span>portfolyo seçkisi</span></div>
              <div><strong>{studentDeletionImpact.reportCount}</strong><span>rapor / geri bildirim</span></div>
              <div><strong>{studentDeletionImpact.exportPackageCount}</strong><span>dışa aktarım</span></div>
            </div>
            {studentDeletionImpact.sharedObservationCount > 0 ||
            studentDeletionImpact.sharedMediaCount > 0 ? (
              <p className="student-delete-shared-note">
                Paylaşımlı kayıtlar diğer öğrenciler için korunur; silinen
                öğrenci üyeliği çıkarılır:{" "}
                {studentDeletionImpact.sharedObservationCount} ortak gözlem,{" "}
                {studentDeletionImpact.sharedMediaCount} ortak medya.
              </p>
            ) : null}
            <label>
              Onaylamak için öğrencinin adını aynen yazın
              <KeyboardInput
                value={studentDeletionConfirmation}
                onChange={(event) =>
                  setStudentDeletionConfirmation(event.target.value)
                }
                placeholder={studentDeletionImpact.displayName}
                autoComplete="off"
              />
            </label>
            <button
              className="student-delete-confirm"
              type="button"
              disabled={
                dataBusy ||
                studentDeletionConfirmation.trim() !==
                  studentDeletionImpact.displayName
              }
              onClick={() => void confirmPermanentStudentDeletion()}
            >
              <TrashIcon aria-hidden="true" />
              {dataBusy ? "Siliniyor…" : "Öğrenciyi ve bağlı kayıtları kalıcı sil"}
            </button>
          </div>
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
              <StudentAvatar
                student={selectedProfileStudent}
                className="student-profile-avatar"
                photoDataUrl={studentProfileForm.profilePhotoDataUrl}
              />
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

            <section className="student-photo-actions" aria-label="Profil fotoğrafı işlemleri">
              <label>
                <CameraIcon aria-hidden="true" />
                <span>{profilePhotoBusy ? "Hazırlanıyor…" : "Fotoğraf çek"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  disabled={profilePhotoBusy || dataBusy}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void selectStudentProfilePhoto(file);
                  }}
                />
              </label>
              <label>
                <UploadIcon aria-hidden="true" />
                <span>Galeriden seç</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={profilePhotoBusy || dataBusy}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void selectStudentProfilePhoto(file);
                  }}
                />
              </label>
              {studentProfileForm.profilePhotoDataUrl ? (
                <button
                  type="button"
                  onClick={removeStudentProfilePhoto}
                  disabled={profilePhotoBusy || dataBusy}
                >
                  <TrashIcon aria-hidden="true" />
                  Kaldır
                </button>
              ) : null}
            </section>
            {removedProfilePhoto ? (
              <div className="student-profile-undo" role="status">
                <span>Fotoğraf kaldırıldı; profil kaydedilene kadar geri alınabilir.</span>
                <button type="button" onClick={undoRemoveStudentProfilePhoto}>
                  Geri al
                </button>
              </div>
            ) : null}

            <section className="student-profile-metrics" aria-label="Profil göstergeleri">
              <div>
                <small>Bugünkü devam</small>
                <strong>
                  {selectedProfileStudent.attendanceMarked === false
                    ? "İşaretlenmedi"
                    : statusLabels[selectedProfileStudent.status]}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStudentProfileTab("flow");
                  setStudentObservationFilter("all");
                  setStudentObservationMonth("all");
                  setStudentObservationLimit(20);
                }}
              >
                <small>Toplam gözlem</small>
                <strong>{selectedStudentObservations.length}</strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentProfileTab("flow");
                  setStudentObservationFilter("pending");
                  setStudentObservationMonth("all");
                  setStudentObservationLimit(20);
                }}
              >
                <small>Bağlantı bekleyen</small>
                <strong>{selectedStudentPendingLinks}</strong>
              </button>
            </section>

            <StudentAttendanceHistoryPanel
              records={studentAttendanceHistory}
              error={studentAttendanceHistoryError}
              formatCivilDate={formatTurkishCivilDate}
            />

            {isCapabilityEnabled("documentCenter") ||
            isCapabilityEnabled("aiFeedback") ? (
              <button
                className="student-share-trigger"
                type="button"
                onClick={() => void openStudentShareCenter()}
              >
                <UploadIcon aria-hidden="true" />
                <span>
                  <strong>Paylaşım taslakları</strong>
                  <small>Yalnız çalışan dışa aktarımlar ve öğretmen onaylı taslaklar</small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            ) : null}

            <nav className="student-profile-tabs" aria-label="Çocuk profili bölümleri">
              <button
                type="button"
                aria-current={studentProfileTab === "flow" ? "page" : undefined}
                onClick={() => setStudentProfileTab("flow")}
              >
                Akış
              </button>
              {isCapabilityEnabled("portfolio") ? (
                <button
                  type="button"
                  aria-current={studentProfileTab === "portfolio" ? "page" : undefined}
                  onClick={() => {
                    setStudentProfileTab("portfolio");
                    setStudentObservationFilter("all");
                    setStudentObservationMonth("all");
                    setStudentObservationLimit(20);
                    void refreshStudentPortfolio(selectedProfileStudent.id);
                  }}
                >
                  Portfolyo
                </button>
              ) : null}
              <button
                type="button"
                aria-current={studentProfileTab === "details" ? "page" : undefined}
                onClick={() => setStudentProfileTab("details")}
              >
                Bilgiler
              </button>
              <button
                type="button"
                aria-current={studentProfileTab === "contacts" ? "page" : undefined}
                onClick={() => setStudentProfileTab("contacts")}
              >
                Yakınlar
              </button>
            </nav>

            {studentProfileTab === "flow" ? (
              <>
            <button
              className="student-profile-observe"
              type="button"
              onClick={() => void openStudentObservation(selectedProfileStudent.id)}
              disabled={dataBusy || educationalWritesDisabled || archivedStudents.some(
                (student) => student.id === selectedProfileStudent.id,
              )}
            >
              <PlusIcon aria-hidden="true" />
              {selectedProfileStudent.preferredName ??
                selectedProfileStudent.name} için hızlı gözlem
            </button>

            <section
              className="student-observation-archive"
              aria-labelledby="student-observation-archive-heading"
            >
              <div className="student-observation-archive-heading">
                <div>
                  <span className="d1-kicker">Zaman çizelgesi</span>
                  <h3 id="student-observation-archive-heading">
                    Gözlem arşivi
                  </h3>
                  <p>
                    {selectedStudentObservations.length} değiştirilemez kayıt ·
                    tarih ve saat sırasıyla
                  </p>
                </div>
                <ArchiveIcon aria-hidden="true" />
              </div>
              {studentPortfolioWorkspace.monthFolders.length > 0 ? (
                <div
                  className="student-observation-month-folders"
                  role="group"
                  aria-label="Kanıt bulunan aylar"
                >
                  {studentPortfolioWorkspace.monthFolders.map((folder) => (
                    <button
                      type="button"
                      key={folder.key}
                      aria-pressed={studentObservationMonth === folder.key}
                      onClick={() => {
                        setStudentObservationMonth((current) =>
                          current === folder.key ? "all" : folder.key,
                        );
                        setStudentObservationLimit(20);
                      }}
                    >
                      <ArchiveIcon aria-hidden="true" />
                      <strong>{folder.label}</strong>
                      <small>
                        {folder.totalCount} kanıt
                        {folder.selectionCount > 0
                          ? ` · ${folder.selectionCount} seçki`
                          : ""}
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="student-observation-filters" role="group" aria-label="Gözlem filtresi">
                <button
                  type="button"
                  aria-pressed={studentObservationFilter === "all"}
                  onClick={() => {
                    setStudentObservationFilter("all");
                    setStudentObservationLimit(20);
                  }}
                >
                  Tümü · {selectedStudentObservations.length}
                </button>
                <button
                  type="button"
                  aria-pressed={studentObservationFilter === "pending"}
                  onClick={() => {
                    setStudentObservationFilter("pending");
                    setStudentObservationLimit(20);
                  }}
                >
                  Bağlantı bekleyen · {selectedStudentPendingLinks}
                </button>
              </div>
              <div className="student-observation-export-actions">
                <button type="button" onClick={downloadCurrentStudentObservations}>
                  <DownloadIcon aria-hidden="true" />
                  Metin indir
                </button>
                <button type="button" onClick={() => void copyCurrentStudentObservations()}>
                  <CopyIcon aria-hidden="true" />
                  Kopyala
                </button>
                <button type="button" onClick={() => void shareCurrentStudentObservations()}>
                  <UploadIcon aria-hidden="true" />
                  Paylaş
                </button>
              </div>
              <p className="student-observation-export-note">
                Görüntülenen ay ve filtreye uygun düz metin üretilir. Telefonlar
                ve fotoğraf dışa aktarılmaz.
              </p>
              {visibleSelectedStudentObservations.length > 0 ? (
                <ol className="student-observation-timeline">
                  {visibleSelectedStudentObservations
                    .slice(0, studentObservationLimit)
                    .map((observation) => {
                    const pending =
                      observation.confirmedCurriculumLinkIds.length === 0;
                    return (
                      <li key={observation.id}>
                        <span className="student-observation-time-dot" aria-hidden="true" />
                        <article>
                          <div>
                            <time dateTime={observation.observedAt}>
                              {formatObservationDateTime(observation.observedAt)}
                            </time>
                            <span
                              className={
                                pending
                                  ? "observation-link-state observation-link-state--pending"
                                  : "observation-link-state observation-link-state--linked"
                              }
                            >
                              {pending ? "Bağ bekliyor" : "Bağ tamam"}
                            </span>
                          </div>
                          <small>{observation.activityTitle}</small>
                          <p>{observation.rawText}</p>
                          {observation.context ? (
                            <details>
                              <summary>Bağlam ve ayrıntı</summary>
                              <p>{observation.context}</p>
                              {observation.childQuote ? (
                                <blockquote>{observation.childQuote}</blockquote>
                              ) : null}
                            </details>
                          ) : null}
                          {pending && isCapabilityEnabled("planEvidenceDetails") ? (
                            <button
                              type="button"
                              onClick={() => openPendingObservation(observation)}
                            >
                              <Link2Icon aria-hidden="true" />
                              Program bağlantısını tamamla
                            </button>
                          ) : null}
                        </article>
                      </li>
                    );
                    })}
                </ol>
              ) : (
                <div className="student-observation-empty">
                  <ReaderIcon aria-hidden="true" />
                  <strong>Henüz gözlem yok</strong>
                  <span>İlk not kaydedildiğinde tarih ve saatiyle burada görünür.</span>
                </div>
              )}
              {visibleSelectedStudentObservations.length > studentObservationLimit ? (
                <button
                  className="student-observation-more"
                  type="button"
                  onClick={() =>
                    setStudentObservationLimit((current) => current + 20)
                  }
                >
                  Sonraki 20 kaydı göster
                </button>
              ) : null}
            </section>
              </>
            ) : null}

            {studentProfileTab === "portfolio" ? (
              <section
                className="student-portfolio"
                aria-labelledby="student-portfolio-heading"
              >
                <header className="student-portfolio-heading">
                  <div>
                    <span className="d1-kicker">Gelişim yolculuğu</span>
                    <h3 id="student-portfolio-heading">Portfolyo seçkisi</h3>
                    <p>
                      {studentPortfolioWorkspace.selections.length} seçili kanıt ·
                      kaynak gözlemler değiştirilmez
                    </p>
                  </div>
                </header>

                <div className="student-portfolio-principles">
                  <strong>Birlikte seç, kaynağı koru.</strong>
                  <span>
                    Öğretmen yorumu, çocuğun sesi ve aile katkısı kaynak kanıttan
                    ayrı saklanır. Puanlama, sıralama veya tanı üretilmez.
                  </span>
                </div>

                {studentPortfolioWorkspace.monthFolders.length > 0 ? (
                  <div
                    className="student-observation-month-folders"
                    role="group"
                    aria-label="Portfolyo için kanıt bulunan aylar"
                  >
                    {studentPortfolioWorkspace.monthFolders.map((folder) => (
                      <button
                        type="button"
                        key={folder.key}
                        aria-pressed={studentObservationMonth === folder.key}
                        onClick={() => {
                          setStudentObservationMonth((current) =>
                            current === folder.key ? "all" : folder.key,
                          );
                          setPortfolioEditor(null);
                        }}
                      >
                        <ArchiveIcon aria-hidden="true" />
                        <strong>{folder.label}</strong>
                        <small>
                          {folder.totalCount} kanıt
                          {folder.selectionCount > 0
                            ? ` · ${folder.selectionCount} seçki`
                            : ""}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : null}

                {portfolioError ? (
                  <p className="student-portfolio-error" role="alert">
                    {portfolioError}
                  </p>
                ) : null}

                {selectedStudentMonthObservations.length > 0 ? (
                  <ol className="student-portfolio-list">
                    {[...selectedStudentMonthObservations]
                      .sort((left, right) => {
                        const leftSelected = portfolioSelectionByObservationId.has(
                          left.id,
                        );
                        const rightSelected = portfolioSelectionByObservationId.has(
                          right.id,
                        );
                        return (
                          Number(rightSelected) - Number(leftSelected) ||
                          right.observedAt.localeCompare(left.observedAt)
                        );
                      })
                      .map((observation) => {
                        const selection =
                          portfolioSelectionByObservationId.get(observation.id);
                        const editing =
                          portfolioEditor?.observationId === observation.id;
                        return (
                          <li
                            key={observation.id}
                            className={selection ? "is-selected" : undefined}
                          >
                            <article>
                              <div className="student-portfolio-card-heading">
                                <div>
                                  <time dateTime={observation.observedAt}>
                                    {formatObservationDateTime(
                                      observation.observedAt,
                                    )}
                                  </time>
                                  <strong>{observation.activityTitle}</strong>
                                </div>
                                <span>
                                  {selection ? "Seçkide" : "Kanıt"}
                                </span>
                              </div>
                              <p>{observation.rawText}</p>
                              {observation.childQuote ? (
                                <blockquote>
                                  <QuoteIcon aria-hidden="true" />
                                  <span>{observation.childQuote}</span>
                                </blockquote>
                              ) : null}
                              {selection && !editing ? (
                                <div className="student-portfolio-reflections">
                                  {selection.teacherCaption ? (
                                    <p>
                                      <strong>Öğretmen notu</strong>
                                      {selection.teacherCaption}
                                    </p>
                                  ) : null}
                                  {selection.childReflection ? (
                                    <p>
                                      <strong>Çocuğun seçim sözü</strong>
                                      {selection.childReflection}
                                    </p>
                                  ) : null}
                                  {selection.familyContribution ? (
                                    <p>
                                      <strong>Aile katkısı</strong>
                                      {selection.familyContribution}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              {editing && portfolioEditor ? (
                                <div className="student-portfolio-editor">
                                  <div
                                    className="student-portfolio-participation"
                                    role="group"
                                    aria-label="Seçime katılanlar"
                                  >
                                    <button
                                      type="button"
                                      aria-pressed={
                                        portfolioEditor.selectedBy === "teacher"
                                      }
                                      onClick={() =>
                                        setPortfolioEditor((current) =>
                                          current
                                            ? {
                                                ...current,
                                                selectedBy: "teacher",
                                              }
                                            : current,
                                        )
                                      }
                                    >
                                      Öğretmen seçti
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={
                                        portfolioEditor.selectedBy ===
                                        "teacher-child"
                                      }
                                      onClick={() =>
                                        setPortfolioEditor((current) =>
                                          current
                                            ? {
                                                ...current,
                                                selectedBy: "teacher-child",
                                              }
                                            : current,
                                        )
                                      }
                                    >
                                      Çocukla birlikte
                                    </button>
                                  </div>
                                  <label>
                                    Öğretmenin kanıta bağlı notu
                                    <KeyboardTextarea
                                      value={portfolioEditor.teacherCaption}
                                      maxLength={2000}
                                      onChange={(event) =>
                                        setPortfolioEditor((current) =>
                                          current
                                            ? {
                                                ...current,
                                                teacherCaption:
                                                  event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                    />
                                  </label>
                                  <label>
                                    Çocuğun bu seçime ilişkin sözü
                                    <KeyboardTextarea
                                      value={portfolioEditor.childReflection}
                                      maxLength={1000}
                                      onChange={(event) =>
                                        setPortfolioEditor((current) =>
                                          current
                                            ? {
                                                ...current,
                                                childReflection:
                                                  event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                    />
                                  </label>
                                  <label>
                                    Aile katkısı
                                    <KeyboardTextarea
                                      value={portfolioEditor.familyContribution}
                                      maxLength={2000}
                                      onChange={(event) =>
                                        setPortfolioEditor((current) =>
                                          current
                                            ? {
                                                ...current,
                                                familyContribution:
                                                  event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                    />
                                  </label>
                                  <div className="student-portfolio-editor-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void persistPortfolioEditor()
                                      }
                                      disabled={dataBusy}
                                    >
                                      <CheckCircledIcon aria-hidden="true" />
                                      {dataBusy
                                        ? "Kaydediliyor…"
                                        : "Seçkiyi kaydet"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        keyboard.hide();
                                        setPortfolioEditor(null);
                                      }}
                                      disabled={dataBusy}
                                    >
                                      Vazgeç
                                    </button>
                                    {selection ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void removePortfolioSelection(
                                            observation.id,
                                          )
                                        }
                                        disabled={dataBusy}
                                      >
                                        Seçkiden kaldır
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="student-portfolio-select"
                                  type="button"
                                  onClick={() => openPortfolioEditor(observation)}
                                  disabled={
                                    dataBusy ||
                                    archivedStudents.some(
                                      (student) =>
                                        student.id === selectedProfileStudent.id,
                                    )
                                  }
                                >
                                  {selection
                                    ? "Seçim notlarını düzenle"
                                    : "Seçkiye ekle"}
                                </button>
                              )}
                            </article>
                          </li>
                        );
                      })}
                  </ol>
                ) : (
                  <div className="student-observation-empty">
                    <ReaderIcon aria-hidden="true" />
                    <strong>
                      {studentObservationMonth === "all"
                        ? "Henüz portfolyo kanıtı yok"
                        : "Bu ayda kullanılabilir kanıt yok"}
                    </strong>
                    <span>
                      Gözlem kaydedildiğinde kaynak metin değişmeden seçkiye
                      eklenebilir.
                    </span>
                  </div>
                )}
              </section>
            ) : null}

            {studentProfileTab === "details" ||
            studentProfileTab === "contacts" ? (
            <form
              className="student-profile-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveStudentProfile();
              }}
            >
              {studentProfileTab === "details" ? (
                <>
              <div className="student-profile-section-heading">
                <div>
                  <span className="d1-kicker">Temel bilgiler</span>
                  <h3>Çocuğu doğru tanıyın</h3>
                </div>
                <CalendarIcon aria-hidden="true" />
              </div>

              <div className="student-profile-form-grid">
                <label htmlFor="student-profile-first-name">
                  Adı
                  <KeyboardInput
                    id="student-profile-first-name"
                    value={studentProfileForm.firstName}
                    onChange={(event) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        firstName: event.target.value.slice(0, 80),
                      }))
                    }
                    autoComplete="given-name"
                  />
                </label>
                <label htmlFor="student-profile-last-name">
                  Soyadı
                  <KeyboardInput
                    id="student-profile-last-name"
                    value={studentProfileForm.lastName}
                    onChange={(event) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        lastName: event.target.value.slice(0, 80),
                      }))
                    }
                    autoComplete="family-name"
                  />
                </label>
              </div>

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
                </>
              ) : null}

              {studentProfileTab === "contacts" ? (
                <>
              <div className="student-profile-section-heading student-profile-section-heading--secondary">
                <div>
                  <span className="d1-kicker">Aile ve yakınlar</span>
                  <h3>İletişim merkezi</h3>
                </div>
                <ChatBubbleIcon aria-hidden="true" />
              </div>

              <p className="student-contact-intro">
                Anne, baba, dede, amca, bakıcı veya başka bir yakını ekleyin.
                Arama ve WhatsApp işlemleri doğrudan telefon uygulamalarına geçer.
              </p>

              <div className="student-contact-editor">
                {studentProfileForm.contacts.map((contact) => {
                  const contactLinks = contactActionLinks(contact.phone);
                  return (
                  <section className="student-contact-card" key={contact.id}>
                    <div className="student-contact-card-heading">
                      <strong>
                        {contact.kind === "mother"
                          ? "Anne"
                          : contact.kind === "father"
                            ? "Baba"
                            : contact.relationship || "Diğer yakın"}
                      </strong>
                      {contact.isPrimary ? <span>Öncelikli</span> : null}
                      {contact.kind === "other" ? (
                        <button
                          type="button"
                          onClick={() => removeStudentContact(contact.id)}
                          aria-label={`${contact.relationship || "Yakın"} iletişim kaydını kaldır`}
                        >
                          <TrashIcon aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    {contact.kind === "other" ? (
                      <label htmlFor={`student-contact-relationship-${contact.id}`}>
                        Yakınlığı
                        <KeyboardInput
                          id={`student-contact-relationship-${contact.id}`}
                          value={contact.relationship}
                          onChange={(event) =>
                            updateStudentContact(contact.id, {
                              relationship: event.target.value.slice(0, 60),
                            })
                          }
                          placeholder="Örn. Dede, amca, bakıcı"
                          autoComplete="off"
                        />
                      </label>
                    ) : null}

                    <label htmlFor={`student-contact-name-${contact.id}`}>
                      Adı ve soyadı
                      <KeyboardInput
                        id={`student-contact-name-${contact.id}`}
                        value={contact.name ?? ""}
                        onChange={(event) =>
                          updateStudentContact(contact.id, {
                            name: event.target.value.slice(0, 120),
                          })
                        }
                        placeholder="İsteğe bağlı"
                        autoComplete="name"
                      />
                    </label>

                    <label htmlFor={`student-contact-phone-${contact.id}`}>
                      Cep telefonu
                      <KeyboardInput
                        id={`student-contact-phone-${contact.id}`}
                        type="tel"
                        inputMode="tel"
                        value={contact.phone}
                        onChange={(event) =>
                          updateStudentContact(contact.id, {
                            phone: formatStudentPhone(event.target.value),
                          })
                        }
                        placeholder="05"
                        autoComplete="tel"
                      />
                    </label>

                    <label className="student-contact-primary">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(event) =>
                          setPrimaryStudentContact(
                            contact.id,
                            event.target.checked,
                          )
                        }
                      />
                      Öncelikli iletişim kişisi
                    </label>

                    {contactLinks ? (
                      <div className="student-contact-actions">
                        <a
                          href={contactLinks.tel}
                          aria-label={`${contactDisplayLabel(contact)} kişisini ara`}
                        >
                          <PersonIcon aria-hidden="true" />
                          Ara
                        </a>
                        <a
                          href={contactLinks.whatsapp}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${contactDisplayLabel(contact)} kişisine WhatsApp mesajı gönder`}
                        >
                          <ChatBubbleIcon aria-hidden="true" />
                          WhatsApp
                        </a>
                      </div>
                    ) : contact.phone.trim() ? (
                      <p className="student-contact-invalid" role="status">
                        Arama ve WhatsApp için geçerli bir cep telefonu girin.
                      </p>
                    ) : null}
                  </section>
                  );
                })}
              </div>

              <button
                className="student-contact-add"
                type="button"
                onClick={addStudentContact}
              >
                <PlusIcon aria-hidden="true" />
                Başka bir yakın ekle
              </button>
              {removedStudentContact ? (
                <div className="student-profile-undo" role="status">
                  <span>
                    {removedStudentContact.relationship} iletişim kaydı kaldırıldı;
                    profil kaydedilene kadar geri alınabilir.
                  </span>
                  <button type="button" onClick={undoRemoveStudentContact}>
                    Geri al
                  </button>
                </div>
              ) : null}
                </>
              ) : null}

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
                Profil, fotoğraf ve iletişim bilgileri bu cihazda saklanır ve
                doğrulanmış MaarifOS yedeğine dâhildir. Gözlem metni dışa
                aktarımında telefon ve fotoğraf kendiliğinden paylaşılmaz.
              </p>
              {studentProfileError ? (
                <p className="d1-error" role="alert">{studentProfileError}</p>
              ) : null}
              <button
                className="student-profile-save"
                type="submit"
                disabled={
                  !studentProfileForm.firstName.trim() ||
                  !studentProfileForm.lastName.trim() ||
                  dataBusy
                }
              >
                <CheckCircledIcon aria-hidden="true" />
                {dataBusy ? "Kaydediliyor…" : "Profili kaydet"}
              </button>
            </form>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={studentShareOpen}
        onOpenChange={(open) => {
          setStudentShareOpen(open);
          if (!open && !native && selectedProfileStudent) {
            setStudentProfileOpen(true);
          }
        }}
        title="Paylaşım taslağı"
        description={
          selectedProfileStudent
            ? `${selectedProfileStudent.name} · kapsamı ve alıcıyı siz seçersiniz`
            : "Öğrenci dosyası"
        }
        snap={0.96}
      >
        {selectedProfileStudent ? (
          <div className="student-share-sheet">
            <section className="student-share-privacy">
              <CheckCircledIcon aria-hidden="true" />
              <div>
                <strong>Tam öğrenci dosyası hazırlanır</strong>
                <p>
                  Ad soyad, okul numarası, yakın bilgileri ve seçili eğitim
                  kayıtları maskelenmeden kullanılır.
                </p>
              </div>
            </section>

            <section className="student-share-section">
              <div className="student-share-section-heading">
                <span className="d1-kicker">1 · Hedef ve amaç</span>
                <h3>Dosya nereye hazırlanacak?</h3>
              </div>
              <div className="student-share-destinations" role="group" aria-label="Paylaşım hedefi">
                {(Object.keys(dossierDestinationLabels) as DossierDestination[]).map(
                  (destination) => (
                    <button
                      type="button"
                      key={destination}
                      aria-pressed={studentShareForm.destination === destination}
                      onClick={() =>
                        setStudentShareForm((current) => ({
                          ...current,
                          destination,
                          identityMode: "full",
                          includeContacts: true,
                          personalDataApprovedForAi: true,
                        }))
                      }
                    >
                      {dossierDestinationLabels[destination]}
                    </button>
                  ),
                )}
              </div>
              <label>
                Hazırlanma amacı / alıcı
                <select
                  value={studentShareForm.audience}
                  onChange={(event) =>
                    setStudentShareForm((current) => ({
                      ...current,
                      audience: event.target.value as DossierAudience,
                    }))
                  }
                >
                  {(Object.keys(dossierAudienceLabels) as DossierAudience[]).map(
                    (audience) => (
                      <option key={audience} value={audience}>
                        {dossierAudienceLabels[audience]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="student-share-date-grid">
                <label>
                  Başlangıç
                  <KeyboardInput
                    type="date"
                    value={studentShareForm.periodStart}
                    max={studentShareForm.periodEnd}
                    onChange={(event) =>
                      setStudentShareForm((current) => ({
                        ...current,
                        periodStart: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Bitiş
                  <KeyboardInput
                    type="date"
                    min={studentShareForm.periodStart}
                    value={studentShareForm.periodEnd}
                    onChange={(event) =>
                      setStudentShareForm((current) => ({
                        ...current,
                        periodEnd: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </section>

            <section className="student-share-section">
              <div className="student-share-section-heading">
                <span className="d1-kicker">2 · Kimlik ve içerik</span>
                <h3>Tam kimlik ve kayıtlar</h3>
              </div>
              <p>
                Varsayılan dosya; öğrenci kimliği, yakınlar, telefonlar, devam,
                gözlem, portfolyo ve kayıtlı geri bildirimleri içerir.
              </p>
              <details className="quick-details student-share-options">
                <summary>
                  <span>
                    <GearIcon aria-hidden="true" />
                    <strong>İçeriği özelleştir</strong>
                    <small>İsteğe bağlı</small>
                  </span>
                  <ChevronDownIcon aria-hidden="true" />
                </summary>
                <div className="student-share-inclusions">
                  {([
                    ["includeContacts", "Yakınlar ve telefonlar"],
                    ["includeAttendance", "Devam özeti"],
                    ["includeObservations", "Tarihli gözlemler"],
                    ["includePortfolio", "Portfolyo seçkileri"],
                    ["includeExternalFeedback", "Kayıtlı AI geri bildirimleri"],
                  ] as const).map(([field, label]) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={studentShareForm[field]}
                        onChange={(event) =>
                          setStudentShareForm((current) => ({
                            ...current,
                            [field]: event.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </details>
              <button
                className="sheet-primary"
                type="button"
                onClick={() => void prepareStudentDossier()}
                disabled={studentShareBusy}
              >
                <MagicWandIcon aria-hidden="true" />
                {studentShareBusy
                  ? "Hazırlanıyor…"
                  : `${dossierDestinationLabels[studentShareForm.destination]} için dosya hazırla`}
              </button>
              {lastExportPackageId ? (
                <p className="student-share-export-ready" role="status">
                  <CheckCircledIcon aria-hidden="true" />
                  Son dosyanın kapsam kaydı MaarifOS’a işlendi.
                </p>
              ) : null}
            </section>

            {aiWorkspacePrompt ? (
              <section className="student-share-section ai-workspace-section">
                <div className="student-share-section-heading">
                  <span className="d1-kicker">Uygulama içi yazma alanı</span>
                  <h3>
                    {studentShareForm.destination === "gemini"
                      ? "Gemini"
                      : "ChatGPT"}{" "}
                    için metin hazır
                  </h3>
                  <p>
                    Metin doğrudan bu alana yerleştirildi. Düzenleyebilir,
                    kopyalayabilir veya sağlayıcıyı açabilirsiniz.
                  </p>
                </div>
                <KeyboardTextarea
                  value={aiWorkspacePrompt}
                  maxLength={100_000}
                  rows={10}
                  onChange={(event) => setAiWorkspacePrompt(event.target.value)}
                  aria-label="Yapay zekâ yazma metni"
                />
                <div className="ai-workspace-actions">
                  <button
                    type="button"
                    onClick={() => void copyAiWorkspacePrompt()}
                  >
                    <CopyIcon aria-hidden="true" />
                    Metni kopyala
                  </button>
                  <button type="button" onClick={openSelectedAiProvider}>
                    <MagicWandIcon aria-hidden="true" />
                    {studentShareForm.destination === "gemini"
                      ? "Gemini’yi aç"
                      : "ChatGPT’yi aç"}
                  </button>
                </div>
                <small>
                  Sağlayıcı hesabı ve gizli anahtar bu çevrim dışı uygulamanın
                  içine gömülmez.
                </small>
              </section>
            ) : null}

            <section className="student-share-section student-feedback-section">
              <div className="student-share-section-heading">
                <span className="d1-kicker">3 · Geri dönüşü kaydet</span>
                <h3>ChatGPT / Gemini yanıtı</h3>
                <p>
                  Aldığınız metni buraya yapıştırın. Kaynak metin değişmez
                  biçimde saklanır; dönem veya yıl sonu özetine dâhil edilip
                  edilmeyeceğini siz seçersiniz.
                </p>
              </div>
              <details className="quick-details student-share-options">
                <summary>
                  <span>
                    <GearIcon aria-hidden="true" />
                    <strong>Kaynak ve dönem</strong>
                    <small>İsteğe bağlı</small>
                  </span>
                  <ChevronDownIcon aria-hidden="true" />
                </summary>
                <div className="quick-details-fields">
              <div className="student-share-date-grid">
                <label>
                  Kaynak
                  <select
                    value={externalFeedbackForm.provider}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        provider: event.target.value as
                          ExternalFeedbackFormState["provider"],
                      }))
                    }
                  >
                    <option value="chatgpt">ChatGPT</option>
                    <option value="gemini">Gemini</option>
                    <option value="other">Diğer</option>
                  </select>
                </label>
                <label>
                  Amaç
                  <select
                    value={externalFeedbackForm.audience}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        audience: event.target.value as DossierAudience,
                      }))
                    }
                  >
                    {(Object.keys(dossierAudienceLabels) as DossierAudience[]).map(
                      (audience) => (
                        <option key={audience} value={audience}>
                          {dossierAudienceLabels[audience]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="student-share-date-grid">
                <label>
                  Dönem başlangıcı
                  <KeyboardInput
                    type="date"
                    value={externalFeedbackForm.periodStart}
                    max={externalFeedbackForm.periodEnd}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        periodStart: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Dönem bitişi
                  <KeyboardInput
                    type="date"
                    min={externalFeedbackForm.periodStart}
                    value={externalFeedbackForm.periodEnd}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        periodEnd: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
                </div>
              </details>
              <label>
                Yapay zekâ geri bildirimi
                <KeyboardTextarea
                  value={externalFeedbackForm.feedbackText}
                  maxLength={50_000}
                  rows={8}
                  onChange={(event) =>
                    setExternalFeedbackForm((current) => ({
                      ...current,
                      feedbackText: event.target.value,
                    }))
                  }
                  placeholder="ChatGPT veya Gemini yanıtını buraya yapıştırın"
                />
              </label>
              <details className="quick-details student-share-options">
                <summary>
                  <span>
                    <ReaderIcon aria-hidden="true" />
                    <strong>Öğretmen notu ve rapor kapsamı</strong>
                    <small>İsteğe bağlı</small>
                  </span>
                  <ChevronDownIcon aria-hidden="true" />
                </summary>
                <div className="quick-details-fields">
              <label>
                Öğretmen notu
                <KeyboardTextarea
                  value={externalFeedbackForm.teacherNote}
                  maxLength={5_000}
                  rows={3}
                  onChange={(event) =>
                    setExternalFeedbackForm((current) => ({
                      ...current,
                      teacherNote: event.target.value,
                    }))
                  }
                  placeholder="Kullanacağınız, düzelteceğiniz veya dışarıda bırakacağınız noktalar"
                />
              </label>
              <div className="student-share-inclusions">
                <label>
                  <input
                    type="checkbox"
                    checked={externalFeedbackForm.includeInTermSummary}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        includeInTermSummary: event.target.checked,
                      }))
                    }
                  />
                  Dönem sonu çalışmasına dâhil et
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={externalFeedbackForm.includeInYearSummary}
                    onChange={(event) =>
                      setExternalFeedbackForm((current) => ({
                        ...current,
                        includeInYearSummary: event.target.checked,
                      }))
                    }
                  />
                  Yıl sonu çalışmasına dâhil et
                </label>
              </div>
                </div>
              </details>
              <button
                className="sheet-primary"
                type="button"
                onClick={() => void persistExternalFeedback()}
                disabled={
                  studentShareBusy ||
                  !externalFeedbackForm.feedbackText.trim()
                }
              >
                <CheckCircledIcon aria-hidden="true" />
                Geri bildirimi öğrenciye kaydet
              </button>
              {studentShareError ? (
                <p className="d1-error" role="alert">{studentShareError}</p>
              ) : null}
            </section>

            {externalFeedback.length > 0 ? (
              <section className="student-feedback-history">
                <div className="student-share-section-heading">
                  <span className="d1-kicker">Kayıt geçmişi</span>
                  <h3>{externalFeedback.length} haricî geri bildirim</h3>
                </div>
                {externalFeedback.map((feedback) => (
                  <details key={feedback.id}>
                    <summary>
                      <strong>
                        {feedback.provider.toLocaleUpperCase("tr-TR")} ·{" "}
                        {dossierAudienceLabels[feedback.audience]}
                      </strong>
                      <small>
                        {feedback.periodStart}–{feedback.periodEnd}
                      </small>
                    </summary>
                    <p>{feedback.feedbackText}</p>
                    {feedback.teacherNote ? (
                      <blockquote>{feedback.teacherNote}</blockquote>
                    ) : null}
                    <span>
                      {feedback.includeInTermSummary ? "Dönem sonu" : ""}
                      {feedback.includeInTermSummary &&
                      feedback.includeInYearSummary
                        ? " · "
                        : ""}
                      {feedback.includeInYearSummary ? "Yıl sonu" : ""}
                    </span>
                  </details>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <AttendancePanels
        open={attendanceOpen}
        onOpenChange={changeAttendanceOpen}
        students={students}
        civilDate={attendanceCivilDate}
        formattedCivilDate={formatTurkishCivilDate(attendanceCivilDate)}
        statusLabels={statusLabels}
        renderAvatar={(student) => <StudentAvatar student={student} />}
        writesBlocked={writesBlocked}
        educationalWritesDisabled={educationalWritesDisabled}
        persistencePending={persistenceState.phase === "pending"}
        dataBusy={dataBusy}
        canUndo={lastAttendanceChange !== null}
        onToggleStatus={updateStudentStatus}
        onUndo={undoAttendanceChange}
        onComplete={() => void completeAttendance()}
        onSaveEvent={persistAttendanceEvent}
      />


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
            setWipeConfirmation("");
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

          {isCapabilityEnabled("googleAuth") ? (
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
          ) : null}

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

          <section
            className="security-section storage-health-section"
            aria-labelledby="storage-health-heading"
          >
            <div className="security-heading-row">
              <div>
                <h3 id="storage-health-heading">Yerel kasa durumu</h3>
                <p>Tarayıcı kalıcılığı, kullanılabilir alan ve yedek yaşı birlikte izlenir.</p>
              </div>
            </div>
            <div className="storage-health-grid" aria-live="polite">
              <article>
                <strong>Kalıcı depolama</strong>
                <span>
                  {storageHealth?.persistence.message ??
                    "Kalıcı depolama desteği kontrol ediliyor."}
                </span>
              </article>
              <article
                data-level={storageHealth?.estimate.level ?? "unknown"}
              >
                <strong>Yerel alan</strong>
                <span>
                  {storageHealth?.estimate.message ??
                    "Yerel kullanım ve kota kontrol ediliyor."}
                </span>
                {storageHealth?.estimate.level === "warning" ? (
                  <small>Alan %80 eşiğini geçti; eski dışa aktarımları cihazdan kaldırıp şifreli yedek alın.</small>
                ) : null}
                {storageHealth?.estimate.level === "critical" ? (
                  <small>Alan %90 eşiğini geçti; yeni medya eklemeden önce cihazda alan açın ve şifreli yedek alın.</small>
                ) : null}
              </article>
              <article data-level={backupReminder.kind}>
                <strong>Son şifreli yedek</strong>
                <span>{backupReminder.message}</span>
                {lastSuccessfulBackupAt ? (
                  <time dateTime={lastSuccessfulBackupAt}>
                    {formatTurkishCivilDate(lastSuccessfulBackupAt.slice(0, 10))}
                  </time>
                ) : null}
              </article>
            </div>
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
                      İşlemden önce cihaz içinde kalıcı ve bütünlüğü doğrulanmış
                      bir kurtarma noktası oluşturulur. İndirme tek güvence
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
          <details className="security-section security-danger-zone">
            <summary>
              <TrashIcon aria-hidden="true" />
              <span>
                <strong>Tüm cihaz verilerini sil</strong>
                <small>Öğrenciler, kayıtlar, ayarlar ve kurtarma noktaları</small>
              </span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="secure-secret-form">
              <p>
                Bu işlem geri alınamaz. Varsa önce şifreli yedek oluşturun.
                Onaylamak için <strong>TÜM VERİLERİ SİL</strong> yazın.
              </p>
              <KeyboardInput
                value={wipeConfirmation}
                onChange={(event) => setWipeConfirmation(event.target.value)}
                autoComplete="off"
                aria-label="Tüm verileri silme onayı"
              />
              <button
                className="student-delete-confirm"
                type="button"
                disabled={
                  dataBusy || wipeConfirmation !== "TÜM VERİLERİ SİL"
                }
                onClick={() => void wipeAllLocalData()}
              >
                <TrashIcon aria-hidden="true" />
                Bu cihazdaki tüm verileri kalıcı sil
              </button>
            </div>
          </details>
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
              ageGroup={configuredClassroom.ageGroup ?? ""}
              curriculumProfile={configuredClassroom.curriculumProfile}
              students={students}
              onCreate={createPlanAndStart}
              initialTemplate={premiumDailyTemplate ?? undefined}
              onClose={() => void closeD1Flow()}
            />
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      {premiumPlanOpen && premiumPilotPreviewEnabled && configuredClassroom?.curriculumProfile ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setPremiumPlanOpen(false);
          }}
        >
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content className="d1-flow-layer" key="premium-plan-center">
            <Dialog.Title className="sr-only">Plan Kütüphanesi</Dialog.Title>
            <Dialog.Description className="sr-only">
              Kapalı premium pilotun yıllık plan, pedagojik lens ve etkinlik seçimi.
            </Dialog.Description>
            <Suspense fallback={<div className="premium-loading">Plan Kütüphanesi açılıyor…</div>}>
              <PremiumPlanCenterScreen
                store={store}
                curriculumProfile={configuredClassroom.curriculumProfile}
                ageGroup={configuredClassroom.ageGroup ?? ""}
                internalStaffExportEnabled={internalStaffExportEnabled}
                valueEvidenceWritesDisabled={
                  writesBlocked || educationalWritesDisabled
                }
                onClose={() => setPremiumPlanOpen(false)}
                onUseActivity={(selection) => {
                  setPremiumPlanOpen(false);
                  openPlanFlow(selection);
                }}
              />
            </Suspense>
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
