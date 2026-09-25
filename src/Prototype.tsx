import { BUILD_IDENTITY } from "./build-identity";
import { MaarifLogo } from "./components/MaarifLogo.tsx";
import {
  classifyObservationWithAI,
  type AIObservationClassification,
  persistClassifiedObservation,
} from "./services/ai-observation-classifier.ts";
import { EdgeVisionObservationModal } from "./features/vision/EdgeVisionObservationModal.tsx";
import { generateParentEmpathyDigest } from "./services/parent-empathy-shield.ts";
import { DeviceTransferGuide } from "./features/cloud-account/DeviceTransferGuide";
import type { ClassRosterLayoutId } from "./features/classroom/class-roster-layouts.ts";
import { PdfPreviewHost } from "./features/documents/PdfPreviewHost.tsx";
import { studentProfileCopy } from "./features/students/student-profile-copy.ts";
import { MAX_ENCRYPTED_BACKUP_BYTES } from "./core/backup/backup-capacity.ts";
import { attendanceExpectedStudentIdsOnDate } from "./features/attendance/attendance-day-breakdown.ts";
import { FOLLOWUP_CHANGED_EVENT } from "./features/teacher-followup/teacher-followup-service.ts";
import type { ManagementSection } from "./features/classroom-admin/ClassroomManagementWorkspace.tsx";
import type { FollowupSection } from "./features/teacher-followup/TeacherFollowupWorkspace.tsx";
import { downloadBrowserFile } from "./features/documents/browser-file-download.ts";
import { flushSync } from "react-dom";
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
import "./features/simple-experience/teacher-workspace-type.css";
import {
  getDevelopmentObservationPresets,
  type DevelopmentObservationSelection,
} from "./features/evidence/development-observation-presets.ts";
import { getActivityContextObservationPresets } from "./features/evidence/activity-context-observation-model.ts";
import type { Tymm2024AgeBand } from "./features/curriculum/tymm-2024-catalog.ts";
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
  PlayIcon,
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
  assertAppLockAttemptState,
  assertAppLockConfig,
  createAppLockConfig,
  initialAppLockAttemptState,
  type AppLockAttemptState,
  type AppLockConfig,
} from "./core/security/app-lock";
import { DATA_SCHEMA_VERSION } from "./core/backup/schema-version";
import { canonicalJson } from "./core/backup/canonical-json";
import { isEncryptedBackupEnvelope } from "./core/backup/encrypted-backup";
import type { BackupEnvelope, RestoreMode } from "./core/backup/schema";
import { IndexedDbDataStore } from "./core/repository/indexed-db";
import type { RecoverySnapshotMetadata } from "./core/repository/contracts";
import { migrateLegacyAcademicYearOperationalStart } from "./core/migrations/academic-year-operational-migration.ts";
import { OBSERVATION_TAXONOMY_VERSION_V2 } from "./core/domain/observation-taxonomy";
import {
  civilDateInIstanbul,
  isCivilDate,
  type AttendanceEvent,
  type AttendanceRecord,
} from "./core/domain/attendance";
import type {
  CalendarEntry,
  CalendarEntryStatus,
  CalendarEntryType,
} from "./core/domain/calendar";
import {
  ageInMonthsOn,
  composeStudentDisplayName,
  formatStudentPhone,
  isValidStudentNationalIdentityNumber,
  normalizeStudentCareDetails,
  normalizeStudentPhone,
  normalizeTurkishSearchText,
  splitStudentDisplayName,
  type StudentContact,
} from "./core/domain/student";
import type { StudentCareFormState } from "./features/students/StudentProfileSafetyPanels.tsx";
import { StudentAddressField } from "./features/students/StudentAddressField.tsx";
import type { StudentHomeAddressParts } from "./core/domain/student-home-address.ts";
import type { DataSnapshot, StoredRecord } from "./core/domain/model";
import { resolveActiveClassroomScope } from "./core/domain/classroom-scope.ts";
import {
  isCapabilityEnabled,
  visiblePrimaryNavigation,
  type AlphaPrimaryNavigationId,
} from "./core/capabilities/alpha-capabilities";
import {
  backupRecoveryHealth,
  backupReminderState,
  readBackupHealthReceipt,
  readLastSuccessfulEncryptedBackup,
  recordEncryptedBackupHealth,
  recordSuccessfulEncryptedBackup,
  recordSuccessfulRestoreDrill,
  type BackupHealthReceipt,
} from "./core/storage/backup-reminder";
import { sha256Hex } from "./core/backup/crypto";
import {
  inspectStorageHealth,
  type StorageHealthState,
} from "./core/storage/storage-health";
import {
  dashboardAttendanceCounts,
  dashboardStateFromSnapshot,
  LEGACY_STORAGE_KEY,
  loadDashboardState,
  persistAttendanceUpdate,
  persistStudentRosterChange,
  type AttendanceStatus,
  type DashboardState,
  type DashboardStudent as Student,
} from "./features/dashboard/dashboard-data";
import { loadStudentAttendanceHistory } from "./features/attendance";
import { ATTENDANCE_EVENT_LABELS } from "./features/attendance/attendance-panel-model";
import { RouteFocusBoundary, useBrowserRouter } from "./shell";
import { classifyApplicationError } from "./core/errors";
import { TeacherFeedbackPanel } from "./features/feedback/TeacherFeedbackPanel.tsx";
import {
  createTeacherFeedback,
  type TeacherFeedback,
} from "./features/feedback/teacher-feedback.ts";
import {
  createTodayStudentCards,
  todayPlanItemStatusLabel,
} from "./features/today/today-screen-model.ts";
import {
  emptyTeacherWorkCycle,
  loadTeacherWorkCycle,
  resolveTeacherWorkCycle,
  resolveSimpleDailyDocumentReadiness,
  type TeacherWorkCycleWorkspace,
} from "./features/teacher-cycle/teacher-work-cycle.ts";
import {
  type TeacherWeekWorkspace,
} from "./features/teacher-cycle/teacher-week-workspace.ts";
import {
  closeTeacherDay,
  emptyTeacherDayClosureWorkspace,
  loadTeacherDayClosureWorkspace,
  resolveTeacherDayClosureWorkspace,
  transitionTeacherDayCarryForward,
  type TeacherDayClosureWorkspace,
} from "./features/day-closure/teacher-day-closure.ts";
import {
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
  normalizeCurriculumProfile,
  updateScheduledPlanWithActivity,
  CURRICULUM_PROGRAM_LABELS,
  type CurriculumProfileInput,
  type CurriculumProfileSnapshot,
} from "./features/evidence/evidence-flow";
import {
  finalizeQuickObservationDraftBatch,
  finalizeQuickObservationDraft,
  loadQuickObservationDraft,
  loadQuickObservationDraftCollection,
  persistQuickObservationDraftBatch,
  persistQuickObservationDraft,
  QUICK_OBSERVATION_NEUTRAL_TEMPLATES,
  QUICK_OBSERVATION_CATEGORIES_V2,
  type QuickObservationBatchDraft,
  type QuickObservationCategory,
  type QuickObservationDraft,
  type QuickObservationType,
} from "./features/evidence/quick-observation";
import { ensureSpontaneousObservationContext } from "./features/evidence/spontaneous-observation";
import { resolveObservationContext } from "./features/evidence/observation-context";
import {
  createObservationCurriculumLinkCommand,
  OBSERVATION_WORKFLOW_STATUS_LABELS,
} from "./features/evidence/observation-workflow-status.ts";
import {
  hasNonSeedEvidenceText,
  mergeEvidenceSeedParagraph,
} from "./features/evidence/evidence-seed-merge";
import type { AnecdoteExportFormat } from "./features/anecdote/export-document.ts";
import type { AnecdoteFormWorkspace } from "./features/anecdote/anecdote-form.ts";
import type { DocumentWorkspaceItemId } from "./features/documents/document-workspace-model.ts";
import type {
  SimpleObservationDocumentAudience,
  SimpleObservationPeriod,
} from "./features/reports/simple-observation-document.ts";
import type { SetupProgressStepId } from "./features/onboarding/setup-progress-model.ts";
import {
  classroomSetupReadiness,
  type ClassroomSetupSectionId,
} from "./features/onboarding/classroom-setup-model.ts";
import type {
  PlanCreationCommand,
  PlanUpdateCommand,
} from "./features/planning/PlanCreationFlow.tsx";
import type { PlanWorkbenchLevelId } from "./features/planning/plan-workbench-model.ts";
import {
  isAcademicYearPlanWriteAllowed,
  resolvePreparationPlanningWindow,
} from "./features/planning/academic-year-planning-policy.ts";
import type { TeacherOwnedPlanDocumentScope } from "./features/planning/teacher-owned-plan-document.ts";
import {
  destinationForPlanDocument,
  destinationForPlanLevel,
} from "./features/planning/teacher-plan-destination.ts";
import {
  loadScheduledPlanEditDraft,
  loadScheduledPlanWorkspace,
  loadTeacherOwnedDailyFlowCopySources,
  resolveScheduledPlanWorkspace,
  type ScheduledPlanEditDraft,
  type ScheduledPlanSummary,
  type ScheduledPlanWorkspace,
  type TeacherOwnedDailyFlowCopySource,
} from "./features/planning/scheduled-plan-workspace.ts";
import type { PremiumDailyTemplateSelection } from "./features/premium-plans/domain.ts";
import type { BuiltInMaarifPlanPackReference } from "./features/premium-plans/built-in-maarif-content.ts";
import type {
  PremiumFounderActivationErrorPresentation,
  PremiumFounderAccessResult,
  PremiumFounderConfiguration,
} from "./features/premium-access/founder-client.ts";
import type { PremiumPackAccessReference } from "./features/premium-access/entitlement.ts";
import {
  curriculumFrameworkForProgram,
  loadEvidenceWorkspace,
  resolveEvidenceWorkspace,
  type EvidenceActivitySummary,
  type EvidenceObservationSummary,
  type EvidencePremiumProvenance,
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
  getTymmAgeGuide,
  listTymmAgeGuides,
  type TymmAgeGuideChoice,
  type TymmAgeGuideChoiceTemplate,
  type TymmAgeGuideReadModel,
} from "./features/curriculum/tymm-age-guide.ts";
import { TYMM_2024_LEARNING_OUTCOMES } from "./features/curriculum/tymm-2024-catalog.ts";
import {
  TYMM_OFFICIAL_RESOURCE_CATALOG,
  getTymmOfficialAgeResource,
} from "./features/curriculum/tymm-official-resource-catalog.ts";
import {
  activateAcademicYearNow,
  academicYearOperationalNotice,
  academicYearOperationalStatus,
  loadPlanDayWorkspace,
  loadTodayWorkspace,
  resolveTodayWorkspace,
  saveClassroomConfiguration,
  setTodayActivityStatus,
  transitionAcademicYearConfiguration,
  type TodayWorkspace,
} from "./features/today/today-data";
import type { ClassroomScheduleKind } from "./core/domain/classroom";
import { classroomRosterDocumentMissingFields } from "./features/classroom/classroom-screen-model.ts";
import {
  buildClassObservationExport,
  buildStudentObservationExport,
  classroomObservationExportFileName,
  contactActionLinks,
  formatObservationDateTime,
  prepareStudentProfilePhoto,
  studentObservationExportFileName,
} from "./features/students/student-profile-tools";
import {
  OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
  academicYearMatchesCalendarProfile,
  loadAcademicCalendar,
  officialEventsOnDate,
  resolveAcademicCalendar,
  removeCalendarEntry,
  saveCalendarEntry,
  type AcademicCalendarWorkspace,
} from "./features/calendar/academic-calendar";
import {
  permanentlyDeleteStudent,
  previewPermanentStudentDeletion,
  type StudentDeletionImpact,
} from "./features/students/student-lifecycle";
import {
  dossierPrivacyDefaults,
  isExternalAiDossierDestination,
  type DossierAudience,
  type DossierDestination,
  type DossierIdentityMode,
  type ExternalAiFeedback,
} from "./features/reports/student-dossier-contract.ts";
import {
  acknowledgeCurrentRelease,
  CURRENT_RELEASE,
  inspectCurrentRelease,
  PWA_UPDATE_READY_EVENT,
} from "./release";
import type { PedagogicalPlanProvenance } from "./core/domain/pedagogical-plan-provenance.ts";
import { hasLocalSharedAccess } from "./features/access/local-shared-access.ts";
import type { ActivityStudioOpenOptions } from "./features/simple-experience/SimplePlanWorkspaceScreen.tsx";
import { REPORT_EDITOR_COPY } from "./features/development/development-editor-copy.ts";
import { triggerHaptic } from "./services/mobile-haptics";

const ClassroomDevelopmentPanel = lazy(() => import("./features/development/DevelopmentPanels.tsx").then((module) => ({ default: module.ClassroomDevelopmentPanel })));
const StudentDevelopmentPanel = lazy(() => import("./features/development/DevelopmentPanels.tsx").then((module) => ({ default: module.StudentDevelopmentPanel })));
const DevelopmentReportDialog = lazy(() => import("./features/development/DevelopmentReportDialog.tsx").then((module) => ({ default: module.DevelopmentReportDialog })));
const DevelopmentObservationPicker = lazy(() =>
  import("./features/evidence/DevelopmentObservationPicker.tsx").then((module) => ({
    default: module.DevelopmentObservationPicker,
  })),
);

const StudentImportSheet = lazy(() => import("./features/students/StudentImportSheet.tsx").then(module => ({ default: module.StudentImportSheet })));
const loadClassroomScreen = () =>
  import("./features/simple-experience/SimpleClassroomScreen.tsx").then((module) => ({
    default: module.SimpleClassroomScreen,
  }));
const ClassroomScreen = lazy(loadClassroomScreen);

const InviteAccessScreen = lazy(() =>
  import("./features/access/InviteAccessScreen.tsx").then((module) => ({
    default: module.InviteAccessScreen,
  })),
);

const loadTodayScreen = () =>
  import("./features/simple-experience/SimpleTodayScreen.tsx").then((module) => ({
    default: module.SimpleTodayScreen,
  }));
const TodayScreen = lazy(loadTodayScreen);
const DeskDocumentCenter = lazy(() => import("./features/documents/DeskDocumentCenter.tsx").then(module => ({ default: module.DeskDocumentCenter })));
const DocumentWorkshop = lazy(() => import("./features/documents/DocumentWorkshop.tsx").then(module => ({ default: module.DocumentWorkshop })));
const FamilyMeetingFormPanel = lazy(() => import("./features/family-engagement/FamilyMeetingFormPanel.tsx").then(module => ({ default: module.FamilyMeetingFormPanel })));
const MonthEndPackagePanel = lazy(() => import("./features/documents/MonthEndPackagePanel.tsx").then(module => ({ default: module.MonthEndPackagePanel })));
const DocumentHistoryPanel = lazy(() => import("./features/documents/DocumentHistoryPanel.tsx").then(module => ({ default: module.DocumentHistoryPanel })));
const TeacherReportCenterPanel = lazy(() => import("./features/teacher-report-center/TeacherReportCenterPanel.tsx").then(module => ({ default: module.TeacherReportCenterPanel })));
const CloudAccountPanel = lazy(() => import("./features/cloud-account/CloudAccountPanel.tsx").then(module => ({ default: module.CloudAccountPanel })));
const LocalObservationSearch = lazy(() => import("./features/teacher-assistant/LocalObservationSearch.tsx").then(module => ({ default: module.LocalObservationSearch })));
const ClassDutySchedulePanel = lazy(() => import("./features/class-duty-schedule/ClassDutySchedulePanel.tsx").then(module => ({ default: module.ClassDutySchedulePanel })));
const TomorrowReadyCard = lazy(() => import("./features/tomorrow-ready/TomorrowReadyCard.tsx").then(module => ({ default: module.TomorrowReadyCard })));
const TomorrowSmallGroupPanel = lazy(() => import("./features/small-group-cards/SmallGroupCardsPanel.tsx").then(module => ({ default: module.SmallGroupCardsPanel })));
const TomorrowHomeGamePanel = lazy(() => import("./features/home-game-cards/HomeGameCardsPanel.tsx").then(module => ({ default: module.HomeGameCardsPanel })));
const ClassDutyWeekCard = lazy(() => import("./features/class-duty-schedule/ClassDutyWeekCard.tsx").then(module => ({ default: module.ClassDutyWeekCard })));
const PreparedTeacherActions = lazy(() => import("./features/teacher-followup/PreparedTeacherActions.tsx").then(module => ({ default: module.PreparedTeacherActions })));
const TeacherFollowupWorkspace = lazy(() => import("./features/teacher-followup/TeacherFollowupWorkspace.tsx").then(m => ({ default: m.TeacherFollowupWorkspace })));
const BackupRecoveryPanel = lazy(() => import("./features/backup/BackupRecoveryPanel.tsx").then(m => ({ default: m.BackupRecoveryPanel })));
const ClassroomManagementWorkspace = lazy(() => import("./features/classroom-admin/ClassroomManagementWorkspace.tsx").then(m => ({ default: m.ClassroomManagementWorkspace })));
const ClassroomManagementInbox = lazy(() => import("./features/classroom-admin/ClassroomManagementWorkspace.tsx").then(m => ({ default: m.ClassroomManagementInbox })));
const DocumentedConsentStatus = lazy(() => import("./features/classroom-admin/ClassroomManagementWorkspace.tsx").then(m => ({ default: m.DocumentedConsentStatus })));
const FollowupInbox = lazy(() => import("./features/teacher-followup/TeacherFollowupWorkspace.tsx").then(m => ({ default: m.FollowupInbox })));
const ActionCenter = lazy(() => import("./features/action-center/ActionCenter.tsx").then(m => ({ default: m.ActionCenter })));
const PlanNextSteps = lazy(() => import("./features/planning/PlanNextSteps.tsx").then(m => ({ default: m.PlanNextSteps })));
const WorkPackageCenter = lazy(() => import("./features/work-packages/WorkPackageCenter.tsx").then(m => ({ default: m.WorkPackageCenter })));
const AttendanceCalculationPanel = lazy(() => import("./features/attendance/AttendanceCalculationPanel.tsx").then(m => ({ default: m.AttendanceCalculationPanel })));

const ClassroomToolsSheets = lazy(() =>
  import("./features/classroom/ClassroomToolsSheets.tsx").then((module) => ({
    default: module.ClassroomToolsSheets,
  })),
);

const AttendancePanels = lazy(() =>
  import("./features/attendance/AttendancePanels").then((module) => ({
    default: module.AttendancePanels,
  })),
);

const StudentAttendanceHistoryPanel = lazy(() =>
  import("./features/attendance/AttendancePanels").then((module) => ({
    default: module.StudentAttendanceHistoryPanel,
  })),
);

const StudentProfileSafetyPanels = lazy(() =>
  import("./features/students/StudentProfileSafetyPanels.tsx").then((module) => ({
    default: module.StudentProfileSafetyPanels,
  })),
);

const StudentProfileOverviewPanel = lazy(() =>
  import("./features/students/StudentProfileOverviewPanels.tsx").then((module) => ({
    default: module.StudentProfileOverviewPanel,
  })),
);

const StudentProfileTabs = lazy(() =>
  import("./features/students/StudentProfileOverviewPanels.tsx").then((module) => ({
    default: module.StudentProfileTabs,
  })),
);

const loadPlanWorkspaceScreen = () =>
  import("./features/simple-experience/SimplePlanWorkspaceScreen.tsx").then((module) => ({
    default: module.SimplePlanWorkspaceScreen,
  }));
const PlanWorkspaceScreen = lazy(loadPlanWorkspaceScreen);

const PlanCreationFlow = lazy(() =>
  import("./features/planning/PlanCreationFlow.tsx").then((module) => ({
    default: module.PlanCreationFlow,
  })),
);

const TeacherOwnedPlanScreen = lazy(() =>
  import("./features/planning/TeacherOwnedPlanScreen.tsx").then((module) => ({
    default: module.TeacherOwnedPlanScreen,
  })),
);

const loadDocumentWorkspaceScreen = () =>
  import("./features/simple-experience/SimpleDocumentWorkspaceScreen.tsx").then((module) => ({
    default: module.SimpleDocumentWorkspaceScreen,
  }));
const DocumentWorkspaceScreen = lazy(loadDocumentWorkspaceScreen);

const preloadPrimarySurface = (id: AlphaPrimaryNavigationId) => {
  if (id === "today") return loadTodayScreen();
  if (id === "classroom") return loadClassroomScreen();
  if (id === "plans") return loadPlanWorkspaceScreen();
  if (id === "documents") return loadDocumentWorkspaceScreen();
  return Promise.resolve();
};

const ActivityStudio = lazy(() =>
  import("./features/activity-studio/index.ts").then((module) => ({
    default: module.ActivityStudio,
  })),
);

const SimpleObservationOutputSheet = lazy(() =>
  import("./features/simple-experience/SimpleObservationOutputSheet.tsx").then((module) => ({
    default: module.SimpleObservationOutputSheet,
  })),
);

const PremiumPlanCenterScreen = lazy(() =>
  import("./features/premium-plans/PremiumPlanCenterScreen.tsx").then((module) => ({
    default: module.PremiumPlanCenterScreen,
  })),
);

const FounderPremiumActivationPanel = lazy(() =>
  import("./features/premium-plans/FounderPremiumActivationPanel.tsx").then(
    (module) => ({ default: module.FounderPremiumActivationPanel }),
  ),
);

const AnecdoteCenterPanel = lazy(() =>
  import("./features/anecdote/AnecdoteCenterPanel.tsx").then((module) => ({
    default: module.AnecdoteCenterPanel,
  })),
);

const initialStudents: Student[] = [];

function sharedInviteAccessIsRequired(): boolean {
  const parameters = new URLSearchParams(window.location.search);
  if (parameters.get("accessGate") === "1") return true;

  const hostname = window.location.hostname;
  return ![
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "terminal.local",
  ].includes(hostname);
}

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
  schoolName: string;
  teacherName: string;
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

function emptyTeacherWeekState(civilDate: string): TeacherWeekWorkspace {
  return {
    status: "not-configured",
    civilDate,
    weekStart: civilDate,
    weekEnd: civilDate,
    days: [],
    expectedDayCount: 0,
    coverageStatus: "fallback",
    coverageDetail: "Etkin sınıf kurulumu tamamlanmadan öğretim günü paydası oluşturulmaz.",
    completedDayCount: 0,
    carriedDayCount: 0,
    plannedDayCount: 0,
    openWorkDayCount: 0,
    nextActionDate: null,
    nextActionLabel: "Sınıf kurulumunu tamamlayın",
  };
}

async function resolveTeacherWeekWorkspaceLazy(
  snapshot: DataSnapshot,
  options: { readonly civilDate: string },
): Promise<TeacherWeekWorkspace> {
  const module = await import(
    "./features/teacher-cycle/teacher-week-workspace.ts"
  );
  return module.resolveTeacherWeekWorkspace(snapshot, options.civilDate);
}

async function loadTeacherWeekWorkspaceLazy(
  store: IndexedDbDataStore,
  options: { readonly civilDate: string },
): Promise<TeacherWeekWorkspace> {
  const module = await import(
    "./features/teacher-cycle/teacher-week-workspace.ts"
  );
  return module.loadTeacherWeekWorkspace(store, options);
}

type HydrationStepId =
  | "dashboard"
  | "today"
  | "evidence"
  | "calendar"
  | "scheduled-plans"
  | "teacher-cycle"
  | "teacher-week"
  | "day-closure"
  | "app-lock"
  | "recovery";

const HYDRATION_SUPPORT_CODES = {
  dashboard: "HYD-DASH",
  today: "HYD-TODAY",
  evidence: "HYD-EVIDENCE",
  calendar: "HYD-CALENDAR",
  "scheduled-plans": "HYD-SCHEDULE",
  "teacher-cycle": "HYD-CYCLE",
  "teacher-week": "HYD-WEEK",
  "day-closure": "HYD-CLOSURE",
  "app-lock": "HYD-LOCK",
  recovery: "HYD-RECOVERY",
} as const satisfies Record<HydrationStepId, string>;

class HydrationStepError extends Error {
  readonly step: HydrationStepId;
  readonly reason: unknown;

  constructor(step: HydrationStepId, reason: unknown) {
    super(`Hydration failed at ${step}.`);
    this.name = "HydrationStepError";
    this.step = step;
    this.reason = reason;
  }
}

function runHydrationStep<Result>(
  step: HydrationStepId,
  operation: Promise<Result>,
): Promise<Result> {
  return operation.then(
    (result) => result,
    (reason: unknown) => {
      throw new HydrationStepError(step, reason);
    },
  );
}

function describeHydrationFailure(reason: unknown): {
  detail: string;
  supportCode: string;
  step: HydrationStepId | "unknown";
  kind: string;
  recoveryRequired: boolean;
} {
  const step = reason instanceof HydrationStepError ? reason.step : "unknown";
  const rootReason = reason instanceof HydrationStepError ? reason.reason : reason;
  const classification = classifyApplicationError(rootReason);
  const rootCode =
    typeof rootReason === "object" &&
    rootReason !== null &&
    "code" in rootReason &&
    typeof rootReason.code === "string"
      ? rootReason.code
      : null;
  const supportCode =
    step === "unknown" ? "HYD-UNKNOWN" : HYDRATION_SUPPORT_CODES[step];
  const detail =
    step === "recovery"
      ? "Kurtarma kayıtları doğrulanamadı."
      : step === "app-lock"
        ? "Uygulama kilidi bilgisi doğrulanamadı."
        : step === "teacher-cycle" || step === "day-closure"
          ? "Öğretmen çalışma özeti doğrulanamadı."
          : step === "unknown"
            ? "Cihazdaki veriler açılamadı."
            : "Cihazdaki öğretmen kayıtları doğrulanamadı.";
  return {
    detail: `${detail} Destek kodu: ${supportCode}. Yeni kayıtlar güvenlik için durduruldu.`,
    supportCode,
    step,
    kind: classification.kind,
    recoveryRequired: rootCode === "LOCAL_VAULT_RECOVERY_REQUIRED",
  };
}

type OfflineReadiness = "checking" | "ready" | "unavailable";

type PwaRuntimeStatus = {
  phase:
    | "idle"
    | "disabled"
    | "unsupported"
    | "registering"
    | "installing"
    | "checking-update"
    | "ready"
    | "update-ready"
    | "activating-update"
    | "error";
  offlineReady: boolean;
  version: string;
  activeVersion: string | null;
  updateVersion: string | null;
  lastCheckedAt: string | null;
  message: string;
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
  nationalIdentityNumber: string;
  enrollmentYear: string;
  homeLanguages: string;
  interests: string;
  strengths: string;
  supportPreferences: string;
  contacts: StudentContact[];
  careDetails: StudentCareFormState;
  profilePhotoDataUrl: string;
};

const emptyStudentCareForm: StudentCareFormState = {
  homeAddress: "",
  childPrivateNotes: "",
  familySituationNotes: "",
  parentsSeparated: false,
  motherDeceased: false,
  fatherDeceased: false,
  martyrChild: false,
  veteranChild: false,
  allergies: "",
  dietaryNeeds: "",
  medicationNotes: "",
  emergencyNotes: "",
  physicianName: "",
  physicianPhone: "",
  medicalDevices: "",
  guardianEmail: "",
  familyEducationNeeds: "",
  familyParticipationPreferences: "",
  photoVideoPermissionOnFile: false,
  fieldTripPermissionOnFile: false,
  digitalCommunicationPermissionOnFile: false,
  permissionFormDate: "",
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

const initialClassroomForm: ClassroomFormState = {
  schoolName: "",
  teacherName: "",
  classroomName: "",
  academicYearName: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.academicYearName,
  academicYearStart: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate,
  academicYearEnd: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataEndDate,
  ageGroup: "",
  curriculumProgram: CURRICULUM_PROGRAM_LABELS.tymm,
  curriculumCatalogLabel: "",
  curriculumCatalogId: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.catalogId,
  curriculumSourceVersion: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.sourceVersion,
  scheduleKind: "full_day",
  startTime: "08:30",
  endTime: "16:30",
};

const emptyAcademicCalendar: AcademicCalendarWorkspace = {
  academicYearId: null,
  classroomId: null,
  officialEvents: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events,
  entries: [],
};

type StudentProfileTab =
  | "flow"
  | "portfolio"
  | "details"
  | "contacts"
  | "care"
  | "family";

const emptyScheduledPlanWorkspace: ScheduledPlanWorkspace = { plans: [] };

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
  no_school: "Okulda eğitim yok",
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

function premiumPackReferenceFromUnknown(
  value: unknown,
): PremiumPackAccessReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = [
    "sku",
    "contentReleaseId",
    "id",
    "version",
    "manifestDigest",
    "academicRelease",
  ] as const;
  if (keys.some((key) => typeof record[key] !== "string" || !record[key].trim())) {
    return null;
  }
  return {
    sku: record.sku as string,
    contentReleaseId: record.contentReleaseId as string,
    id: record.id as string,
    version: record.version as string,
    manifestDigest: record.manifestDigest as string,
    academicRelease: record.academicRelease as string,
  };
}



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
  if (!record || record.deletedAt) {
    return null;
  }
  try {
    if (record.settingType !== APP_LOCK_SETTING_TYPE) throw new Error("Geçersiz kilit kaydı.");
    assertAppLockConfig(record.config);
    assertAppLockAttemptState(record.attemptState);
    return record as AppLockSettingRecord;
  } catch {
    throw new Error("Uygulama kilidi doğrulanamadı; cihaz kayıtları açılmadı.");
  }
}

async function loadAppLockSetting(
  store: IndexedDbDataStore,
): Promise<AppLockSettingRecord | null> {
  try {
    return await store.transaction("readonly", ["settings"], async (transaction) => {
      const records = await transaction.getAll("settings");
      return parseAppLockSetting(
        records.find((record) => record.id === APP_LOCK_SETTING_ID),
      );
    });
  } catch {
    throw new Error("Uygulama kilidi okunamadı; cihaz kayıtları açılmadı.");
  }
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
  assessmentTarget?: CurriculumTargetSnapshot;
  initialStudentId?: string;
  initialDraft?: EvidenceCaptureSeed;
};

type VaultRecoveryBackup = {
  fileName: string;
  source: string;
  receipt: {
    encryptedSourceChecksum: string;
    payloadChecksum: string;
    entityCounts: BackupEnvelope["manifest"]["entityCounts"];
  } | null;
};

type EvidenceActivityStartPolicy = "start-if-planned" | "preserve";

type ObservationContextChoice = {
  activities: EvidenceActivitySummary[];
  civilDate: string;
  spontaneousStudentId: string;
  initialStudentId?: string;
  initialDraft?: EvidenceCaptureSeed;
  activityStartPolicy: EvidenceActivityStartPolicy;
};

type ObservationRefreshNotice = {
  activityTitle: string;
  committedObservationIds: string[];
  observationCount: number;
  reason: "read-failed" | "committed-record-missing";
};

async function verifyCommittedObservationRefresh(
  committedObservationIds: readonly string[],
  loadWorkspace: () => Promise<EvidenceWorkspace>,
) {
  const refreshModule = await import(
    "./features/evidence/observation-commit-refresh.ts"
  );
  return refreshModule.verifyCommittedObservationRefresh(
    committedObservationIds,
    loadWorkspace,
  );
}

type AppSurface =
  | "capture-menu"
  | "attendance"
  | "student-profile"
  | "development-report"
  | "student-share"
  | "student-delete"
  | "action-completion"
  | "plan-guidance"
  | "settings"
  | "classroom"
  | "plans"
  | "calendar"
  | "documents"
  | "release-notes"
  | "plan-flow"
  | "teacher-plan-records"
  | "premium-gate"
  | "premium-plans"
  | "tymm-guide"
  | "tymm-child"
  | "evidence-flow";

const APP_HISTORY_MARKER = "__maarifOSSurface";

function appSurfaceFromHistoryState(state: unknown): AppSurface | null {
  if (!state || typeof state !== "object") return null;
  const candidate = (state as Record<string, unknown>)[APP_HISTORY_MARKER];
  if (candidate === "premium-gate") return null;
  if (candidate === "premium-plans") return "teacher-plan-records";
  return candidate === "capture-menu" ||
    candidate === "attendance" ||
    candidate === "student-profile" ||
    candidate === "development-report" ||
    candidate === "student-share" ||
    candidate === "student-delete" ||
    candidate === "action-completion" ||
    candidate === "plan-guidance" ||
    candidate === "settings" ||
    candidate === "classroom" ||
    candidate === "plans" ||
    candidate === "calendar" ||
    candidate === "documents" ||
    candidate === "release-notes" ||
    candidate === "plan-flow" ||
    candidate === "teacher-plan-records" ||
    candidate === "premium-gate" ||
    candidate === "premium-plans" ||
    candidate === "tymm-guide" ||
    candidate === "tymm-child" ||
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

function downloadJson(fileName: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function downloadText(fileName: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", contents], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function downloadBytes(fileName: string, mimeType: string, bytes: Uint8Array) {
  downloadBrowserFile({ fileName, mimeType, bytes });
}

function formatTurkishCivilDate(civilDate: string) {
  const [year, month, day] = civilDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : civilDate;
}

function afterInteractivePaint(task: () => void): void {
  window.requestAnimationFrame(() => window.setTimeout(task, 0));
}

function yieldToInteractivePaint(): Promise<void> {
  return new Promise((resolve) => {
    afterInteractivePaint(resolve);
  });
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

function createQuickObservationHeader(_activityTitle: string, onClose: () => void) {
  return (flow: FlowControls) => (
    <div className="quick-observation-header">
      <MaarifLogo size={28} variant="emblem-only" />
      <div>
        <strong>Hızlı Gözlem</strong>
        <small>Çocuk seç · not ekle · kaydet</small>
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
  resolveDateContext: (
    civilDate: string,
    studentId?: string,
  ) => Promise<EvidenceActivitySummary>;
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
      developmentSelection?: DevelopmentObservationSelection;
    },
  ) => Promise<void>;
  loadDraft: (
    activity: EvidenceActivitySummary,
    studentId: string,
  ) => Promise<QuickObservationDraft | null>;
  loadDrafts: (
    activity: EvidenceActivitySummary,
    studentIds: readonly string[],
  ) => Promise<Map<string, QuickObservationDraft | null>>;
  loadDraftBatch: (
    activity: EvidenceActivitySummary,
  ) => Promise<{ drafts: QuickObservationBatchDraft[]; batchId: string } | null>;
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
      developmentSelection?: DevelopmentObservationSelection;
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
      developmentSelection?: DevelopmentObservationSelection;
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
      developmentSelection?: DevelopmentObservationSelection;
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

function shiftCivilDate(civilDate: string, dayDelta: number): string {
  if (!isCivilDate(civilDate) || !Number.isInteger(dayDelta)) {
    throw new Error("Gözlem tarihi geçersiz.");
  }
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + dayDelta))
    .toISOString()
    .slice(0, 10);
}

function observationInstantForCivilDate(civilDate: string, now: Date): string {
  if (!isCivilDate(civilDate) || Number.isNaN(now.getTime())) {
    throw new Error("Gözlem tarihi veya kayıt zamanı geçersiz.");
  }
  const today = civilDateInIstanbul(now);
  if (civilDate > today) {
    throw new Error("Gözlem tarihi bugünden ileri olamaz.");
  }
  if (civilDate === today) return now.toISOString();
  return new Date(`${civilDate}T12:00:00+03:00`).toISOString();
}

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
      developmentSelection?: DevelopmentObservationSelection;
};

type EvidenceCaptureSeed = Pick<
  EvidenceCaptureDraft,
  "rawText" | "context" | "childQuote" | "observationType" | "categoryIds"
>;

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

function BrandedSurfaceLoading({
  title,
  detail,
  compact = false,
}: {
  title: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`surface-loading${compact ? " is-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="surface-loading-brand" aria-hidden="true">
        <MaarifLogo size={34} variant="emblem-only" />
        <span>
          <strong>MaarifOS</strong>
          <small>Öğretmen çalışma alanı</small>
        </span>
      </div>
      <div className="surface-loading-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <div className="surface-loading-progress" aria-hidden="true">
        <span />
      </div>
      <div className="surface-loading-skeleton" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}

function BufferedObservationTextarea({
  value,
  onBufferedChange,
  onLiveChange,
  ...props
}: Omit<React.ComponentProps<typeof KeyboardTextarea>, "value" | "onChange"> & {
  value: string;
  onBufferedChange: (value: string) => void;
  onLiveChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const commit = (next: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    onBufferedChange(next);
  };

  return (
    <KeyboardTextarea
      {...props}
      value={localValue}
      onChange={(event) => {
        const next = event.target.value;
        setLocalValue(next);
        onLiveChange(next);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => commit(next), 120);
      }}
      onBlur={(event) => {
        commit(event.currentTarget.value);
        props.onBlur?.(event);
      }}
    />
  );
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
  ageBand,
  initialStudentId,
  initialDraft,
  students,
  actions,
  availableActivities,
}: {
  activity: EvidenceActivitySummary;
  ageBand?: Tymm2024AgeBand;
  initialStudentId?: string;
  initialDraft?: EvidenceCaptureSeed;
  students: Student[];
  actions: EvidenceFlowActions;
  availableActivities?: EvidenceActivitySummary[];
}) {
  const [captureActivity, setCaptureActivity] = useState(activity);
  const eligibleStudents = captureActivity.assignedStudentIds.length > 0
    ? students.filter((student) => captureActivity.assignedStudentIds.includes(student.id))
    : students;
  const [observationId] = useState(() => crypto.randomUUID());
  const [batchId, setBatchId] = useState<string>(() => crypto.randomUUID());
  const [selectionMode, setSelectionMode] =
    useState<"single" | "selected-children">("single");
  const [studentId, setStudentId] = useState(() =>
    initialStudentId || (eligibleStudents.length > 0 ? eligibleStudents[0].id : ""),
  );
  const [groupStudentIds, setGroupStudentIds] = useState<string[]>([]);
  const [groupConfirmed, setGroupConfirmed] = useState(false);
  const [rawText, setRawText] = useState("");
  const liveRawTextRef = useRef("");
  const [hasLiveRawText, setHasLiveRawText] = useState(false);
  const [context, setContext] = useState("");
  const [contextEditorOpen, setContextEditorOpen] = useState(false);
  const [childQuote, setChildQuote] = useState("");
  const [legacyDetailsReviewRequired, setLegacyDetailsReviewRequired] =
    useState(false);
  const [observationType, setObservationType] =
    useState<QuickObservationType>("quick-note");
  const [categories, setCategories] = useState<QuickObservationCategory[]>([]);
  const [developmentSelection, setDevelopmentSelection] = useState<DevelopmentObservationSelection>();
  const [studentPickerOpen, setStudentPickerOpen] = useState(!initialStudentId);
  const [observationGuide, setObservationGuide] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateNotice, setDateNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [safeError, setSafeError] = useState("");
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);
  const [aiClassification, setAiClassification] = useState<AIObservationClassification | null>(null);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState("");
  const [copiedNotice, setCopiedNotice] = useState("");
  const [visionModalOpen, setVisionModalOpen] = useState(false);

  useEffect(() => {
    liveRawTextRef.current = rawText;
    setHasLiveRawText(Boolean(rawText.trim()));
  }, [rawText]);

  const runAiClassification = async () => {
    if (!rawText.trim() || isAiClassifying) return;
    triggerHaptic("medium");
    setIsAiClassifying(true);
    setAiStatusMsg("");
    try {
      const result = await classifyObservationWithAI(rawText);
      setAiClassification(result);
      if (!context.trim() && result.learningCenter) {
        setContext(result.learningCenter);
      }
      setObservationType("systematic");
      setAiStatusMsg("MEB TYMM 2026 ontolojisiyle başarıyla eşleştirildi.");
      triggerHaptic("success");
    } catch (err) {
      setAiStatusMsg(err instanceof Error ? err.message : "Analiz tamamlanamadı.");
      triggerHaptic("error");
    } finally {
      setIsAiClassifying(false);
    }
  };

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert("Tarayıcınız sesli dikte özelliğini desteklemiyor. Lütfen Google Chrome veya Edge kullanın.");
      return;
    }

    if (isVoiceRecording) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      }
      setIsVoiceRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setRawText((prev) => {
            const base = prev.trim();
            return base ? `${base} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = () => {
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceRecording(false);
    }
  };

  const [draftStatus, setDraftStatus] = useState<
    "ready" | "loading" | "saving" | "saved" | "error"
  >(() => eligibleStudents.length > 0 ? "loading" : "ready");
  const draftTimerRef = useRef<number | null>(null);
  const pendingDraftSnapshotRef = useRef<EvidenceCaptureDraft | null>(null);
  const draftWritePromiseRef = useRef<Promise<void> | null>(null);
  const draftLoadSequenceRef = useRef(0);
  const draftCacheRef = useRef(new Map<string, QuickObservationDraft | null>());
  const draftPrefetchRef = useRef<Promise<void> | null>(null);
  const finalizedRef = useRef(false);
  const initialSelectionAppliedRef = useRef(false);
  const initialSeedAppliedRef = useRef(false);
  const batchRestoreAppliedRef = useRef(false);
  const batchRestoreSequenceRef = useRef(0);
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
    developmentSelection,
  });
  const effectiveStudentId = studentId || (selectionMode === "single" && eligibleStudents.length > 0 ? eligibleStudents[0].id : "");
  const selectedStudent = eligibleStudents.find((student) => student.id === effectiveStudentId);
  const selectedStudentCount =
    selectionMode === "single" ? (effectiveStudentId ? 1 : 0) : groupStudentIds.length;
  const allEligibleStudentsSelected =
    eligibleStudents.length > 0 &&
    groupStudentIds.length === eligibleStudents.length;
  actionsRef.current = actions;
  draftSnapshotRef.current = {
    selectionMode,
    batchId,
    studentId: effectiveStudentId,
    studentIds: groupStudentIds,
    rawText: liveRawTextRef.current,
    context,
    childQuote,
    observationType,
    categoryIds: categories,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    developmentSelection,
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
  const preparedObservationPresets = useMemo(
    () => getActivityContextObservationPresets(ageBand, captureActivity),
    [ageBand, captureActivity],
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
      // Disk yavaşken her ara metni kuyruğa dizmek yerine yalnız en güncel
      // snapshot tutulur. Çalışan yazma bittiğinde son snapshot commit edilir.
      pendingDraftSnapshotRef.current = {
        ...draft,
        studentIds: [...draft.studentIds],
        categoryIds: [...draft.categoryIds],
      };
      if (!draftWritePromiseRef.current) {
        setDraftStatus("saving");
        const operation = (async () => {
          try {
            while (pendingDraftSnapshotRef.current && !finalizedRef.current) {
              const next = pendingDraftSnapshotRef.current;
              pendingDraftSnapshotRef.current = null;
              if (next.selectionMode === "single") {
                const savedDraft = await actionsRef.current.saveDraft(captureActivity, next);
                draftCacheRef.current.set(next.studentId, savedDraft);
              } else {
                await actionsRef.current.saveDraftBatch(captureActivity, {
                  batchId: next.batchId,
                  studentIds: next.studentIds,
                  rawText: next.rawText,
                  context: next.context,
                  childQuote: next.childQuote,
                  observationType: next.observationType,
                  categoryIds: next.categoryIds,
                  taxonomyVersion: next.taxonomyVersion,
                  developmentSelection: next.developmentSelection,
                });
              }
            }
            if (!finalizedRef.current) setDraftStatus("saved");
          } catch (reason) {
            pendingDraftSnapshotRef.current = null;
            setDraftStatus("error");
            throw reason;
          }
        })().finally(() => {
          draftWritePromiseRef.current = null;
        });
        draftWritePromiseRef.current = operation;
      }
      await draftWritePromiseRef.current;
    },
    [captureActivity],
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

  const changeObservationDate = async (nextCivilDate: string) => {
    if (
      nextCivilDate === captureActivity.civilDate ||
      busy ||
      draftStatus === "loading" ||
      selectionMode === "selected-children"
    ) return;
    if (!isCivilDate(nextCivilDate)) {
      setSafeError("Gözlem için geçerli bir tarih seçin.");
      return;
    }
    setBusy(true);
    setSafeError("");
    setFeedback(null);
    setDateNotice("");
    try {
      await flushCurrentDraft();
      setDraftStatus("loading");
      const nextActivity = await actionsRef.current.resolveDateContext(
        nextCivilDate,
        studentId || undefined,
      );
      const targetDraft = studentId
        ? await actionsRef.current.loadDraft(nextActivity, studentId)
        : null;
      const targetPresets = getActivityContextObservationPresets(ageBand, nextActivity);
      setCaptureActivity(nextActivity);
      if (studentId) {
        const loadedCategories =
          targetDraft?.observationTaxonomyVersion === OBSERVATION_TAXONOMY_VERSION_V2
            ? targetDraft.categoryIds.filter((category) =>
                QUICK_OBSERVATION_CATEGORIES_V2.includes(
                  category as (typeof QUICK_OBSERVATION_CATEGORIES_V2)[number],
                ),
              )
            : [];
        setRawText(targetDraft?.rawText ?? "");
        setContext(targetDraft?.context ?? "");
        setChildQuote(targetDraft?.childQuote ?? "");
        setObservationType(targetDraft?.observationType ?? "quick-note");
        setCategories(loadedCategories);
        setDevelopmentSelection(
          targetDraft?.developmentSelection &&
            targetPresets.some(
              (preset) => preset.id === targetDraft.developmentSelection?.presetId,
            )
            ? targetDraft.developmentSelection
            : undefined,
        );
        setLegacyDetailsReviewRequired(
          Boolean(targetDraft?.context.trim() || targetDraft?.childQuote.trim()),
        );
        setDraftStatus(targetDraft ? "saved" : "ready");
      } else {
        setDevelopmentSelection((current) =>
          current && targetPresets.some((preset) => preset.id === current.presetId)
            ? current
            : undefined,
        );
        setDraftStatus("ready");
      }
      setObservationGuide("");
      setDatePickerOpen(false);
      setDateNotice(
        targetDraft
          ? `${formatTurkishCivilDate(nextCivilDate)} tarihindeki taslak açıldı.`
          : studentId
            ? `Önceki taslak korundu; ${formatTurkishCivilDate(nextCivilDate)} için yeni gözlem açıldı.`
            : `${formatTurkishCivilDate(nextCivilDate)} gözlem tarihi seçildi.`,
      );
    } catch (reason) {
      setDraftStatus("ready");
      setSafeError("");
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Gözlem tarihi değiştirilemedi. Mevcut taslak ve tarih korundu; yeniden deneyebilirsiniz.",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

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
    // Her tuş vuruşunda durum değiştirip bütün gözlem ekranını yeniden çizme.
    // "saving" yalnız debounce dolup gerçek disk yazımı başladığında
    // persistDraftSnapshot tarafından gösterilir; kesin kayıt ise bu timer'ı
    // kesip editördeki son değeri doğrudan atomik transaction'a taşır.
    draftTimerRef.current = window.setTimeout(() => {
      draftTimerRef.current = null;
      void flushCurrentDraft().catch(() => undefined);
    }, 1_000);
    return () => {
      if (draftTimerRef.current !== null) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [
    captureActivity,
    categories,
    developmentSelection,
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

  const eligibleStudentIdsKey = eligibleStudents
    .map((student) => student.id)
    .join("\u0000");
  useEffect(() => {
    let cancelled = false;
    draftCacheRef.current.clear();
    const operation = actionsRef.current
      .loadDrafts(captureActivity, eligibleStudents.map((student) => student.id))
      .then((drafts) => {
        if (!cancelled) draftCacheRef.current = drafts;
      })
      .catch(() => undefined)
      .finally(() => {
        if (draftPrefetchRef.current === operation) draftPrefetchRef.current = null;
      });
    draftPrefetchRef.current = operation;
    return () => {
      cancelled = true;
    };
  }, [captureActivity.id, captureActivity.planId, eligibleStudentIdsKey]);

  const loadStudentDraft = async (nextStudentId: string) => {
    if (draftCacheRef.current.has(nextStudentId)) {
      return draftCacheRef.current.get(nextStudentId) ?? null;
    }
    await draftPrefetchRef.current;
    if (draftCacheRef.current.has(nextStudentId)) {
      return draftCacheRef.current.get(nextStudentId) ?? null;
    }
    const draft = await actionsRef.current.loadDraft(captureActivity, nextStudentId);
    draftCacheRef.current.set(nextStudentId, draft);
    return draft;
  };

  const chooseStudent = async (nextStudentId: string, forceLoad = false) => {
    if (nextStudentId === studentId && !forceLoad) return;
    triggerHaptic("selection");
    try {
      await flushCurrentDraft();
    } catch {
      setSafeError(
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
    setLegacyDetailsReviewRequired(false);
    setObservationType("quick-note");
    setCategories([]);
    setDevelopmentSelection(undefined);
    setObservationGuide("");
    setDraftStatus("loading");
    const seed =
      initialDraft &&
      (initialStudentId === undefined || initialStudentId === nextStudentId) &&
      !initialSeedAppliedRef.current
        ? initialDraft
        : null;
    try {
      const draft = await loadStudentDraft(nextStudentId);
      if (draftLoadSequenceRef.current !== loadSequence) return;
      if (draft || seed) {
        const loadedCategories =
          draft?.observationTaxonomyVersion === OBSERVATION_TAXONOMY_VERSION_V2
            ? draft.categoryIds.filter((category) =>
                QUICK_OBSERVATION_CATEGORIES_V2.includes(
                  category as (typeof QUICK_OBSERVATION_CATEGORIES_V2)[number],
                ),
              )
            : [];
        setDevelopmentSelection(draft?.developmentSelection);
        setRawText(mergeEvidenceSeedParagraph(draft?.rawText, seed?.rawText));
        setContext(mergeEvidenceSeedParagraph(draft?.context, seed?.context));
        setChildQuote(
          mergeEvidenceSeedParagraph(draft?.childQuote, seed?.childQuote),
        );
        setLegacyDetailsReviewRequired(
          Boolean(
            draft &&
              (hasNonSeedEvidenceText(draft.context, seed?.context) ||
                hasNonSeedEvidenceText(draft.childQuote, seed?.childQuote)),
          ),
        );
        setObservationType(
          draft?.observationType ?? seed?.observationType ?? "quick-note",
        );
        setCategories(
          Array.from(new Set([...loadedCategories, ...(seed?.categoryIds ?? [])])),
        );
        if (seed) initialSeedAppliedRef.current = true;
        setDraftStatus(draft ? "saved" : "ready");
      } else {
        setLegacyDetailsReviewRequired(false);
        setDraftStatus("ready");
      }
    } catch {
      if (draftLoadSequenceRef.current === loadSequence) {
        if (seed) {
          setRawText(seed.rawText);
          setContext(seed.context);
          setChildQuote(seed.childQuote);
          setObservationType(seed.observationType);
          setCategories([...seed.categoryIds]);
          initialSeedAppliedRef.current = true;
        }
        setDraftStatus("error");
      }
    }
  };

  const chooseSingleMode = async () => {
    if (selectionMode === "single") return;
    try {
      await flushCurrentDraft();
    } catch {
      setSafeError(
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
      setSafeError(
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
      setSafeError(
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
      setSafeError(
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
    if (initialSelectionAppliedRef.current || selectionMode !== "single") return;
    const initialSelectionId =
      initialStudentId && eligibleStudents.some((student) => student.id === initialStudentId)
        ? initialStudentId
        : studentId || eligibleStudents[0]?.id;
    if (!initialSelectionId) return;
    initialSelectionAppliedRef.current = true;
    void chooseStudent(initialSelectionId, true);
  }, [eligibleStudents, initialDraft, initialStudentId, selectionMode, studentId]);

  useEffect(() => {
    if (initialStudentId || batchRestoreAppliedRef.current) return;
    const loadSequence = batchRestoreSequenceRef.current + 1;
    batchRestoreSequenceRef.current = loadSequence;
    setDraftStatus("loading");
    void actionsRef.current
      .loadDraftBatch(captureActivity)
      .then((result) => {
        if (batchRestoreSequenceRef.current !== loadSequence) return;
        batchRestoreAppliedRef.current = true;
        const draft = result?.drafts[0];
        if (!draft) {
          setDraftStatus("ready");
          return;
        }
        setBatchId(result.batchId);
        setSelectionMode("selected-children");
        setGroupStudentIds(result.drafts.map((item) => item.studentId));
        setGroupConfirmed(false);
        setRawText(draft.rawText);
        setContext(draft.context);
        setChildQuote(draft.childQuote);
        setObservationType(draft.observationType);
        setCategories([...draft.categoryIds]);
        setDevelopmentSelection(draft.developmentSelection);
        setDraftStatus("saved");
      })
      .catch((reason) => {
        if (batchRestoreSequenceRef.current !== loadSequence) return;
        batchRestoreAppliedRef.current = true;
        setSafeError("");
        setFeedback(
          createTeacherFeedback(reason, {
            fallbackDetail:
              "Gözlem taslağı bu cihazdan açılamadı. Yeni notunuzu yazabilir veya yeniden deneyebilirsiniz.",
          }),
        );
        setDraftStatus("error");
      });
    return () => {
      if (batchRestoreSequenceRef.current === loadSequence) {
        batchRestoreSequenceRef.current += 1;
      }
    };
  }, [captureActivity.id, captureActivity.planId, initialStudentId]);

  const toggleCategory = (category: QuickObservationCategory) => {
    setObservationGuide("");
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const applyStarter = (starter: string) => {
    setRawText((current) => (current.trim() ? `${current.trim()} ${starter}` : starter));
  };

  const selectDevelopment = (next: DevelopmentObservationSelection | undefined) => {
    if (next && next.presetId !== developmentSelection?.presetId && ageBand) {
      const presets = getDevelopmentObservationPresets(ageBand);
      const selected = presets.find((preset) => preset.id === next.presetId);
      const previous = presets.find((preset) => preset.id === developmentSelection?.presetId);
      if (!selected) return;
      setRawText((current) => !current.trim() || current === previous?.observationText
        ? selected.observationText
        : current.includes(selected.observationText) ? current : `${current}\n${selected.observationText}`);
      setCategories((current) => Array.from(new Set([...current, ...selected.categoryIds])));
      setObservationType("systematic");
    }
    setDevelopmentSelection(next);
  };

  const todayCivilDate = civilDateInIstanbul(new Date());
  const yesterdayCivilDate = shiftCivilDate(todayCivilDate, -1);

  const isChildQuoteObservation = observationType === "child-quote";
  const observationQuestion = isChildQuoteObservation
    ? "Çocuğun aynen sözü neydi?"
    : "Ne yaptı veya ne söyledi?";
  const observationPlaceholder = isChildQuoteObservation
    ? "Çocuğun sözünü değiştirmeden yazın."
    : "… sırasında … yaptı / söyledi.";
  const observationGuidance = isChildQuoteObservation
    ? "Çocuğun sözünü yorum eklemeden ve düzeltmeden yazın."
    : "Gördüğünüz ve duyduğunuz olayı yorum eklemeden yazın.";
  const draftLoading = draftStatus === "loading";
  const saveBlockedReason = draftLoading
    ? "Taslak yükleniyor; yazma alanı veri kaybını önlemek için kısa süre kilitli."
    : busy
      ? "Gözlem bu cihaza kaydediliyor."
    : selectionMode === "single" && !effectiveStudentId
      ? (eligibleStudents.length === 0 ? "Önce sınıfa bir çocuk ekleyin." : "Önce gözlem yaptığınız çocuğu seçin.")
      : selectionMode === "selected-children" && groupStudentIds.length < 2
        ? "Toplu gözlem için en az iki çocuk seçin."
        : selectionMode === "selected-children" && !groupConfirmed
          ? "Aynı gözlemin seçili çocuklar için geçerli olduğunu onaylayın."
          : !hasLiveRawText
            ? "Gözlediğiniz davranışı seçin veya kendi notunuzu yazın."
            : legacyDetailsReviewRequired
              ? "Eski taslak ayrıntıları için ‘dahil et’ veya ‘çıkar’ seçimini yapın."
              : "";
  const saveReady = !saveBlockedReason;
  const saveStatusLabel =
    draftStatus === "loading"
      ? "Taslak yükleniyor."
      : draftStatus === "saving"
        ? "Taslak bu cihazda korunuyor."
        : draftStatus === "error"
          ? "Taslak otomatik korunamadı; bağlantıyı kontrol edin."
          : saveReady
            ? draftStatus === "saved"
              ? "Taslak bu cihazda korundu · Kaydetmeye hazır."
              : "Gözlem kaydetmeye hazır."
            : saveBlockedReason;
  const discardLegacyDetails = () => {
    setContext("");
    setChildQuote("");
    setLegacyDetailsReviewRequired(false);
  };

  const save = async () => {
    const activeStudentId = effectiveStudentId;
    const committedRawText = liveRawTextRef.current;
    const singleReady = selectionMode === "single" && Boolean(activeStudentId);
    const groupReady =
      selectionMode === "selected-children" &&
      groupStudentIds.length >= 2 &&
      groupConfirmed;
    if (
      (!singleReady && !groupReady) ||
      !committedRawText.trim() ||
      legacyDetailsReviewRequired ||
      busy ||
      draftLoading
    ) return;
    setBusy(true);
    setSafeError("");
    setFeedback(null);
    // Final kaydı başlatmadan önce gecikmeli taslak yazımını kesin. Aksi halde
    // 450 ms'lik otomatik-kayıt callback'i finalize işleminden sonra kuyruğa
    // girip silinmiş taslağı yeniden canlandırabilir ve sonraki gözlemde eski
    // metin/türü gösterebilir.
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    pendingDraftSnapshotRef.current = null;
    finalizedRef.current = true;
    try {
      if (selectionMode === "single") {
        await actions.capture(captureActivity, {
          observationId,
          studentId: activeStudentId,
          rawText: committedRawText,
          ...(context.trim() ? { context } : {}),
          ...(childQuote.trim() ? { childQuote } : {}),
          observationType,
          categoryIds: categories,
          taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    developmentSelection,
        });
      } else {
        await actions.captureBatch(captureActivity, {
          batchId,
          studentIds: groupStudentIds,
          rawText: committedRawText,
          ...(context.trim() ? { context } : {}),
          ...(childQuote.trim() ? { childQuote } : {}),
          observationType,
          categoryIds: categories,
          taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    developmentSelection,
        });
      }
      if (aiClassification) {
        try {
          if (selectionMode === "single" && activeStudentId) {
            void persistClassifiedObservation(null, activeStudentId, rawText, aiClassification);
          } else if (groupStudentIds.length > 0) {
            for (const sId of groupStudentIds) {
              void persistClassifiedObservation(null, sId, rawText, aiClassification);
            }
          }
        } catch (e) {
          console.warn("[EvidenceCaptureScreen] AI gözlem persist hatası:", e);
        }
      }
      await actions.close();
      triggerHaptic("success");
    } catch (reason) {
      finalizedRef.current = false;
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Gözlem notu kaydedilemedi. Yazdıklarınız korunuyor; yeniden deneyebilirsiniz.",
        }),
      );
      setBusy(false);
    }
  };

  const copyEokulFormat = () => {
    triggerHaptic("light");
    const activeStudent = students.find((s) => s.id === (effectiveStudentId || studentId));
    const studentName = activeStudent?.name || "Öğrenci";
    const dim = aiClassification?.dimensionLabel || "Gelişim";
    const cleanText = rawText.trim().replace(/\s+/g, " ");
    const eOkulText = `[${studentName}] ${dim}: ${cleanText}`.slice(0, 250);
    try {
      void navigator.clipboard.writeText(eOkulText);
      setCopiedNotice("✓ e-Okul (MEBBİS 250 karakter) formatında panoya kopyalandı!");
      setTimeout(() => setCopiedNotice(""), 3500);
    } catch {
      setCopiedNotice("Panoya kopyalama başarısız oldu.");
    }
  };

  const printOfficialEk2Form = () => {
    triggerHaptic("medium");
    const activeStudent = students.find((s) => s.id === (effectiveStudentId || studentId));
    const studentName = activeStudent?.name || "Öğrenci";
    const dateFormatted = formatTurkishCivilDate(captureActivity.civilDate);
    const center = aiClassification?.learningCenter || context || "Öğrenme Merkezi";
    const interpretation = aiClassification?.pedagogicalInterpretation || "";

    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>MEB EK-2 Gözlem Formu - ${studentName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 11pt; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { font-size: 12pt; margin: 3px 0; color: #334155; }
    .header h3 { font-size: 11pt; margin: 3px 0 0; color: #0284c7; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .meta-table td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10.5pt; }
    .meta-table .lbl { font-weight: bold; background: #f8fafc; width: 25%; }
    .card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }
    .card-title { font-weight: bold; font-size: 10.5pt; color: #0369a1; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; }
    .card-content { font-size: 10.5pt; margin: 0; white-space: pre-wrap; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5pt; margin-right: 5px; margin-bottom: 4px; font-weight: 600; }
    .badge-domain { background: #e0f2fe; color: #0369a1; }
    .badge-val { background: #dcfce7; color: #15803d; }
    .badge-tnd { background: #f3e8ff; color: #7e22ce; }
    .signatures { margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid; padding: 0 20px; }
    .sig-col { text-align: center; font-size: 10.5pt; line-height: 1.8; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>T.C. Millî Eğitim Bakanlığı</h1>
    <h2>Temel Eğitim Genel Müdürlüğü · Türkiye Yüzyılı Maarif Modeli</h2>
    <h3>EK-2: OKUL ÖNCESİ EĞİTİM GÖZLEM VE ANEKDOT KAYIT FORMU</h3>
  </div>
  <table class="meta-table">
    <tr>
      <td class="lbl">Öğrenci Adı Soyadı</td>
      <td><strong>${studentName}</strong></td>
      <td class="lbl">Gözlem Tarihi</td>
      <td>${dateFormatted}</td>
    </tr>
    <tr>
      <td class="lbl">Gelişim Boyutu</td>
      <td>${aiClassification?.dimensionLabel || "Tüm Gelişim Alanları"}</td>
      <td class="lbl">Öğrenme Merkezi</td>
      <td>${center}</td>
    </tr>
  </table>
  <div class="card">
    <div class="card-title">1. GÖZLENEN DAVRANIŞ (Çocuğun Doğrudan Eylemi / Aynen Sözü)</div>
    <div class="card-content">${rawText.trim()}</div>
  </div>
  <div class="card">
    <div class="card-title">2. TYMM 2026 ALAN BECERİLERİ, ERDEMLER VE EĞİLİMLER</div>
    <div>
      ${(aiClassification?.domainLabels || []).map((l, i) => `<span class="badge badge-domain">🎯 ${l} (${aiClassification?.domainCodes[i] || "MAB"})</span>`).join("")}
      ${(aiClassification?.valueCodes || []).map((v) => `<span class="badge badge-val">💎 ${v}</span>`).join("")}
      ${(aiClassification?.tendencyCodes || []).map((t) => `<span class="badge badge-tnd">🌱 ${t}</span>`).join("")}
    </div>
  </div>
  <div class="card">
    <div class="card-title">3. PEDAGOJİK DEĞERLENDİRME & GELİŞİM YORUMU (Öğretmen Kanaati)</div>
    <div class="card-content" style="font-style: italic; color: #1e293b;">${interpretation}</div>
  </div>
  <div class="signatures">
    <div class="sig-col">
      <strong>Gözlemi Yapan Sınıf Öğretmeni</strong><br><br><br>
      İmza: ...........................................
    </div>
    <div class="sig-col">
      <strong>Okul Öncesi Zümre Başkanı</strong><br><br><br>
      İmza / Mühür: ...........................................
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  };

  return (
    <div
      className="quick-observation-page"
      data-initial-draft={initialDraft ? "true" : "false"}
      data-initial-draft-length={initialDraft?.rawText.length ?? 0}
    >
      <MobileScroll className="d1-flow-scroll quick-observation-scroll">
        <div className="quick-observation-content">
          <section className="quick-date-choice" aria-labelledby="quick-date-choice-title">
            <div>
              <strong id="quick-date-choice-title">Gözlem günü</strong>
              <small>{formatTurkishCivilDate(captureActivity.civilDate)}</small>
            </div>
            <div role="group" aria-label="Gözlem tarihi">
              <button
                type="button"
                aria-pressed={captureActivity.civilDate === todayCivilDate}
                disabled={busy || draftLoading || selectionMode === "selected-children"}
                onClick={() => void changeObservationDate(todayCivilDate)}
              >Bugün</button>
              <button
                type="button"
                aria-pressed={captureActivity.civilDate === yesterdayCivilDate}
                disabled={busy || draftLoading || selectionMode === "selected-children"}
                onClick={() => void changeObservationDate(yesterdayCivilDate)}
              >Dün</button>
              <button
                type="button"
                aria-expanded={datePickerOpen}
                disabled={busy || draftLoading || selectionMode === "selected-children"}
                onClick={() => setDatePickerOpen((current) => !current)}
              >Tarih seç</button>
            </div>
            {datePickerOpen ? (
              <label>
                Gerçek gözlem tarihi
                <KeyboardInput
                  type="date"
                  aria-label="Gerçek gözlem tarihi"
                  value={captureActivity.civilDate}
                  max={todayCivilDate}
                  disabled={busy || draftLoading || selectionMode === "selected-children"}
                  onChange={(event) => void changeObservationDate(event.target.value)}
                />
              </label>
            ) : null}
            {selectionMode === "selected-children" ? (
              <p>Toplu gözlem tarihini değiştirmek için önce tek çocuk kapsamına dönün.</p>
            ) : dateNotice ? <p role="status">{dateNotice}</p> : null}
          </section>
          <section
            className={`quick-context-banner quick-context-banner--${captureActivity.contextKind}`}
            aria-label="Gözlem bağlamı"
          >
            <div className="quick-context-banner__header">
              <div className="quick-context-banner__info">
                <TargetIcon aria-hidden="true" />
                <span>
                  <strong>
                    {context.trim()
                      ? `Bağlam: ${context}`
                      : captureActivity.contextKind === "planned-activity"
                      ? "Plan etkinliğine bağlı gözlem"
                      : "Plan dışı / Anlık gözlem"}
                  </strong>
                  <small>
                    {captureActivity.contextKind === "planned-activity"
                      ? `${captureActivity.startTime} · ${captureActivity.title}`
                      : "Serbest zaman, rutin veya anlık gözlenen durum."}
                  </small>
                </span>
              </div>
              <button
                type="button"
                className="quick-context-toggle-btn"
                onClick={() => setContextEditorOpen((prev) => !prev)}
                aria-expanded={contextEditorOpen}
                disabled={draftLoading || busy}
                title="Gözlemin gerçekleştiği ortam, merkez veya etkinliği düzenleyin"
              >
                {contextEditorOpen ? "▲ Kapat" : "✏️ Bağlamı Değiştir"}
              </button>
            </div>

            {contextEditorOpen ? (
              <div className="quick-context-editor">
                {availableActivities && availableActivities.length > 0 ? (
                  <div className="quick-context-row">
                    <span className="quick-context-sublabel">Günün Planlı Etkinlikleri:</span>
                    <div className="quick-context-chips" role="group" aria-label="Planlı etkinlikler">
                      {availableActivities.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          className={`quick-context-chip ${captureActivity.id === act.id ? "is-active" : ""}`}
                          onClick={() => {
                            setCaptureActivity(act);
                            if (!context.trim()) setContext(act.title);
                          }}
                          disabled={draftLoading || busy}
                        >
                          📌 {act.startTime ? `${act.startTime} ` : ""}{act.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="quick-context-row">
                  <span className="quick-context-sublabel">Öğrenme Merkezi / Ortam Seç:</span>
                  <div className="quick-context-chips" role="group" aria-label="Öğrenme merkezleri">
                    {[
                      { label: "🧱 Blok Merkezi", text: "Blok Merkezi" },
                      { label: "📚 Kitap Merkezi", text: "Kitap Merkezi" },
                      { label: "🎨 Sanat Merkezi", text: "Sanat Merkezi" },
                      { label: "🔬 Fen Merkezi", text: "Fen ve Doğa Merkezi" },
                      { label: "🎵 Müzik Merkezi", text: "Müzik Merkezi" },
                      { label: "🎭 Dramatik Oyun", text: "Dramatik Oyun Merkezi" },
                      { label: "🌳 Bahçe / Açık Hava", text: "Bahçe / Açık Hava" },
                      { label: "🍽️ Beslenme & Rutin", text: "Beslenme ve Öz Bakım Rutini" },
                      { label: "⚡ Serbest Zaman", text: "Serbest Zaman Oyunu" },
                    ].map((item) => (
                      <button
                        key={item.text}
                        type="button"
                        className={`quick-context-chip ${context.includes(item.text) ? "is-active" : ""}`}
                        onClick={() => {
                          setContext(item.text);
                        }}
                        disabled={draftLoading || busy}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="quick-context-row">
                  <span className="quick-context-sublabel">TYMM Alanı İle Eşle:</span>
                  <div className="quick-context-chips" role="group" aria-label="TYMM Öğrenme Alanları">
                    {[
                      { id: "social-emotional", label: "🟡 Sosyal-Duygusal", name: "Sosyal-Duygusal Beceriler" },
                      { id: "math", label: "🔵 Matematik", name: "Matematik Alan Becerileri" },
                      { id: "science", label: "🟢 Fen", name: "Fen Alan Becerileri" },
                      { id: "language", label: "🟣 Türkçe", name: "Türkçe Alan Becerileri" },
                      { id: "movement", label: "🔴 Hareket / Sağlık", name: "Hareket ve Sağlık Becerileri" },
                      { id: "art", label: "🟠 Sanat", name: "Sanat Alan Becerileri" },
                      { id: "music", label: "🎵 Müzik", name: "Müzik Alan Becerileri" },
                    ].map((domainItem) => {
                      const isCatActive = categories.includes(domainItem.id as QuickObservationCategory);
                      return (
                        <button
                          key={domainItem.id}
                          type="button"
                          className={`quick-context-chip ${isCatActive ? "is-active" : ""}`}
                          onClick={() => {
                            toggleCategory(domainItem.id as QuickObservationCategory);
                            if (!context.trim()) setContext(domainItem.name);
                          }}
                          disabled={draftLoading || busy}
                        >
                          {domainItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="quick-context-input-wrap">
                  <label htmlFor="quick-context-custom-input">
                    <strong>Gözlem Bağlamı Notu (Kolay Düzenleme):</strong>
                  </label>
                  <KeyboardInput
                    id="quick-context-custom-input"
                    type="text"
                    className="quick-context-input"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Örn: Blok merkezinde kule yaparken, Bahçe koşu oyununda, Masada resim çizerken..."
                    disabled={draftLoading || busy}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    Öğretmen bu bağlamı dilediği gibi değiştirebilir; kaydet butonuna basıldığında doğrudan rapora işlenir.
                  </small>
                </div>
              </div>
            ) : null}
          </section>
          {eligibleStudents.length === 0 ? (
            <section className="d1-empty-state">
              <strong>Önce sınıfa bir çocuk ekleyin.</strong>
              <p>Gözlem notu yalnız etkin sınıftaki bir çocukla ilişkilendirilebilir.</p>
              <button type="button" onClick={actions.manageChildren}>Sınıfımı aç</button>
            </section>
          ) : (
            <>
            {selectedStudent && !studentPickerOpen && selectionMode === "single" ? (
              <div className="quick-selected-child">
                <strong>{selectedStudent.name}</strong>
                <button type="button" onClick={() => setStudentPickerOpen(true)} disabled={busy || draftLoading}>Çocuğu değiştir</button>
              </div>
            ) : (
            <section className="quick-student-section" aria-labelledby="quick-student-heading">
              <div className="quick-section-heading">
                <div>
                  <span className="d1-kicker">1 · Öğrenciyi seç</span>
                  <h1 id="quick-student-heading">Kimin için yazıyorsunuz?</h1>
                </div>
                {selectedStudentCount > 0 ? (
                  <strong style={{ color: "#059669", background: "#ecfdf5", padding: "4px 10px", borderRadius: "16px", border: "1px solid #a7f3d0", fontSize: "0.82rem" }}>
                    {selectionMode === "single"
                      ? `✓ ${selectedStudent?.name}`
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
                  disabled={busy || draftStatus === "loading"}
                >
                  Tek çocuk
                </button>
                <button
                  type="button"
                  aria-pressed={selectionMode === "selected-children"}
                  onClick={() => void chooseGroupMode()}
                  disabled={busy || draftStatus === "loading"}
                >
                  Birden çok çocuk
                </button>
              </div>
              <Carousel
                className="quick-student-strip"
                contentClassName="quick-student-track"
                ariaLabel="Gözlem yapılacak çocuk"
              >
                {eligibleStudents.map((student, index) => {
                  const selected =
                    selectionMode === "single"
                      ? student.id === effectiveStudentId
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
                      style={{
                        outline: selected ? "3px solid #10b981" : "none",
                        backgroundColor: selected ? "#ecfdf5" : undefined,
                        boxShadow: selected ? "0 4px 12px rgba(16, 185, 129, 0.25)" : "none",
                        fontWeight: selected ? 800 : 500,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span className="quick-student-avatar" aria-hidden="true" style={{ position: "relative" }}>
                        {studentInitials(student.name)}
                        {selected ? (
                          <span style={{ position: "absolute", bottom: "-2px", right: "-2px", background: "#10b981", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold" }}>✓</span>
                        ) : null}
                      </span>
                      <span>{student.name}</span>
                    </button>
                  );
                })}
              </Carousel>
              {selectionMode === "selected-children" ? (
                <>
                  <div className="quick-group-toolbar">
                    <p>Çocuklara dokunarak kapsamı değiştirin; her kayıt ayrı korunur.</p>
                    <button
                      type="button"
                      onClick={() => void toggleWholeClass()}
                      disabled={busy || draftStatus === "loading"}
                    >
                      {allEligibleStudentsSelected ? "Seçimi temizle" : "Tüm sınıfı seç"}
                    </button>
                  </div>
                  <section className="quick-group-safety" aria-label="Toplu gözlem onayı">
                    <div>
                      <CheckCircledIcon aria-hidden="true" />
                      <span>
                        <strong>Toplu kayıt, ortak olaylar içindir</strong>
                        <small>Farklı davranışlar gözlediyseniz tek çocuk modunda ayrı ayrı yazın.</small>
                      </span>
                    </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={groupConfirmed}
                      onChange={(event) => setGroupConfirmed(event.target.checked)}
                      disabled={draftLoading || busy || groupStudentIds.length < 2}
                    />
                    <span>
                      <strong>{groupStudentIds.length} çocuk için aynı gözlem geçerli</strong>
                      <small>Her çocuk için ayrı, değişmez gözlem kaydı oluşturulur.</small>
                    </span>
                  </label>
                  </section>
                </>
              ) : null}
            </section>

            )}

            {preparedObservationPresets.length > 0 && selectedStudentCount > 0 ? (
              <section className="quick-prepared-observations" aria-labelledby="quick-prepared-observations-title">
                <header>
                  <strong id="quick-prepared-observations-title">Etkinlikten hazır gözlem ifadeleri</strong>
                  <small>Yalnız gerçekten gördüğünüz ifadeyi seçin; kaydetmeden önce metni değiştirebilirsiniz.</small>
                </header>
                <div>
                  {preparedObservationPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      aria-pressed={developmentSelection?.presetId === preset.id}
                      disabled={draftLoading || busy}
                      onClick={() => selectDevelopment({
                        presetId: preset.id,
                        ageBand: preset.ageBand,
                      })}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.observationText}</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="quick-note-card">
              <div className="quick-note-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label id="quick-note-heading" htmlFor="d1-observation-text">
                    {developmentSelection ? "Gözlem notunuz" : observationQuestion}
                  </label>
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    style={{
                      background: isVoiceRecording
                        ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        : "rgba(2, 132, 199, 0.08)",
                      border: isVoiceRecording ? "1px solid #ef4444" : "1px solid rgba(2, 132, 199, 0.3)",
                      color: isVoiceRecording ? "#ffffff" : "#0284c7",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Mikrofon ile konuşun, söyledikleriniz otomatik yazıya dökülsün"
                  >
                    <span>{isVoiceRecording ? "🔴" : "🎤"}</span>
                    <span>{isVoiceRecording ? "Dinleniyor..." : "Sesli Dikte"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisionModalOpen(true)}
                    style={{
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#059669",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Fotoğraftan görsel pedagojik analiz yapın (Edge Computer Vision)"
                  >
                    <span>📷</span>
                    <span>Görsel Analiz</span>
                  </button>
                </div>
                <small>{rawText.length.toLocaleString("tr-TR")} karakter</small>
              </div>

              {/* Hızlı 1-Dokunuş Gözlem Çipleri */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }} role="group" aria-label="Hızlı gözlem cümleleri">
                {[
                  { label: "✏️ Daire çizdi", text: "Daire çizdi ve şeklini akranına gösterdi." },
                  { label: "✂️ Makasla kesti", text: "Makasla çizgiyi takip ederek düzgünce kesti." },
                  { label: "⏳ Sırasını bekledi", text: "Oyunda sırasını sabırla bekledi ve arkadaşına izin verdi." },
                  { label: "🤝 Kuleyi paylaştı", text: "Bloklarla inşa ettiği kuleyi arkadaşıyla paylaştı." },
                  { label: "🔢 10'a kadar saydı", text: "Masadaki renkli blokları birebir eşleyerek 10'a kadar saydı." },
                  { label: "💬 Duygusunu anlattı", text: "Resim yaparken mutlu olduğunu ve renkleri çok sevdiğini anlattı." },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setRawText((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed} ${chip.text}` : chip.text;
                      });
                    }}
                    disabled={draftLoading || busy}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "16px",
                      padding: "3px 9px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.12s ease",
                    }}
                    title={`Hızlıca nota ekle: ${chip.text}`}
                  >
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>

              <BufferedObservationTextarea
                id="d1-observation-text"
                aria-label={isChildQuoteObservation ? "Çocuğun aynen sözü" : "Ne oldu?"}
                value={rawText}
                onLiveChange={(value) => {
                  liveRawTextRef.current = value;
                  const nextHasText = Boolean(value.trim());
                  setHasLiveRawText((current) =>
                    current === nextHasText ? current : nextHasText,
                  );
                }}
                onBufferedChange={(value) => {
                  liveRawTextRef.current = value;
                  setRawText(value);
                }}
                placeholder={observationPlaceholder}
                rows={3}
                aria-describedby="quick-observation-guidance"
                disabled={draftLoading || busy}
              />
              <p id="quick-observation-guidance">
                {observationGuidance}
              </p>
              {/* ─── YAPAY ZEKÂ TYMM 2026 SEMANTİK DEĞERLENDİRME MASASI ─── */}
              <div style={{ marginTop: "10px", marginBottom: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  className="quick-ai-analyze-btn"
                  disabled={!rawText.trim() || isAiClassifying || draftLoading || busy}
                  onClick={() => void runAiClassification()}
                  style={{
                    background: rawText.trim()
                      ? "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)"
                      : "#e2e8f0",
                    color: rawText.trim() ? "#ffffff" : "#94a3b8",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: rawText.trim() && !isAiClassifying ? "pointer" : "not-allowed",
                    boxShadow: rawText.trim() ? "0 2px 8px rgba(2, 132, 199, 0.25)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title="Yazdığınız gözlemi DeepSeek AI ile analiz edip TYMM 2026 Becerileri, Erdemleri ve Merkezlerine bağlayın"
                >
                  <span style={{ fontSize: "1.1rem" }}>{isAiClassifying ? "⏳" : "🪄"}</span>
                  <span>{isAiClassifying ? "Yapay Zekâ TYMM Çözümlüyor..." : "Yapay Zekâ ile Değerlendir & TYMM'ye Bağla"}</span>
                </button>

                {aiStatusMsg ? (
                  <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: aiClassification ? "#059669" : "#dc2626", fontWeight: 600 }}>
                    {aiStatusMsg}
                  </p>
                ) : null}

                {aiClassification ? (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
                      border: "1px solid #6ee7b7",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                      boxShadow: "0 2px 10px rgba(16, 185, 129, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <strong style={{ color: "#065f46", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>✨</span>
                        <span>TYMM 2026 Otomatik Pedagojik Eşleşme</span>
                      </strong>
                      <span style={{ fontSize: "0.72rem", background: "#d1fae5", color: "#047857", padding: "2px 8px", borderRadius: "10px", fontWeight: 800 }}>
                        {aiClassification.dimensionLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {aiClassification.domainLabels.map((lbl, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontWeight: 700,
                          }}
                        >
                          🎯 {lbl} ({aiClassification.domainCodes[idx] || "MAB"})
                        </span>
                      ))}
                      {aiClassification.valueCodes.map((val, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "#059669",
                            color: "#ffffff",
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontWeight: 700,
                          }}
                        >
                          💎 {val}
                        </span>
                      ))}
                      {aiClassification.tendencyCodes.map((tnd, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "#7c3aed",
                            color: "#ffffff",
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontWeight: 700,
                          }}
                        >
                          🌱 {tnd}
                        </span>
                      ))}
                      {aiClassification.learningCenter ? (
                        <span
                          style={{
                            background: "#d97706",
                            color: "#ffffff",
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontWeight: 700,
                          }}
                        >
                          🏛️ {aiClassification.learningCenter}
                        </span>
                      ) : null}
                    </div>

                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#1e293b", lineHeight: "1.4" }}>
                      💡 <em>{aiClassification.pedagogicalInterpretation}</em>
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #6ee7b7" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const activeName = students.find((s) => s.id === (effectiveStudentId || studentId))?.name || "Öğrenci";
                          const digest = generateParentEmpathyDigest({
                            studentName: activeName,
                            observationText: rawText,
                            customValue: aiClassification.valueCodes[0],
                            learningCenter: aiClassification.learningCenter,
                          });
                          window.open(digest.whatsAppUrl, "_blank");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)",
                        }}
                        title="Veliye 2 cümlelik MEB TYMM uyumlu WhatsApp bülteni oluşturup gönderin"
                      >
                        <span>💬</span>
                        <span>Veli WhatsApp Bülteni</span>
                      </button>

                      <button
                        type="button"
                        onClick={copyEokulFormat}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                        }}
                        title="e-Okul / MEBBİS 250 karakter kısıtlamasına uygun formatta kopyalayın"
                      >
                        <span>📋</span>
                        <span>e-Okul Kopyala</span>
                      </button>

                      <button
                        type="button"
                        onClick={printOfficialEk2Form}
                        style={{
                          background: "#4f46e5",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                        }}
                        title="Resmî MEB EK-2 A4 Gözlem Kayıt Formunu doğrudan yazdırın"
                      >
                        <span>🖨️</span>
                        <span>Resmî EK-2 A4 Yazdır</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void save()}
                        disabled={busy || draftLoading}
                        style={{
                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                          marginLeft: "auto",
                        }}
                        title="Gözlemi anında yerel IndexedDB portfolyosuna kaydedin"
                      >
                        <span>💾</span>
                        <span>Hemen Kaydet</span>
                      </button>
                    </div>

                    {copiedNotice ? (
                      <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>
                        {copiedNotice}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <details className="quick-writing-help">
                <summary>Yazmak için ipuçları</summary>
              {!isChildQuoteObservation ? (
                <div className="quick-starter-grid" role="group" aria-label="Tarafsız cümle başlangıçları">
                  {QUICK_OBSERVATION_NEUTRAL_TEMPLATES.map((starter) => (
                    <button
                      type="button"
                      key={starter.id}
                      onClick={() => applyStarter(starter.text)}
                      disabled={draftLoading || busy}
                    >
                      {starter.text}
                    </button>
                  ))}
                </div>
              ) : null}
              <aside
                className="quick-observation-guide"
                aria-labelledby="quick-observation-guide-heading"
              >
                <div>
                  <ReaderIcon aria-hidden="true" />
                  <span>
                    <strong id="quick-observation-guide-heading">
                      Bakıp yazabileceğiniz ipuçları
                    </strong>
                    <small>Bir odağa dokunun; yalnız gözlediğiniz olayı yazın.</small>
                  </span>
                </div>
                <ul>
                  {visibleObservationGuides.map((guide) => (
                    <li key={guide}>
                      <button
                        type="button"
                        aria-pressed={observationGuide === guide}
                        onClick={() => setObservationGuide(guide)}
                        disabled={draftLoading || busy}
                      >
                        {guide}
                      </button>
                    </li>
                  ))}
                </ul>
                <p role="status" aria-live="polite">
                  {observationGuide
                    ? `Seçili gözlem odağı: ${observationGuide}`
                    : "Henüz bir odak seçmediniz; serbestçe de yazabilirsiniz."}
                </p>
              </aside>
              </details>
            </section>

            {legacyDetailsReviewRequired ? (
              <section
                className="quick-legacy-review"
                aria-labelledby="quick-legacy-review-heading"
                data-testid="quick-legacy-review"
              >
                <strong id="quick-legacy-review-heading">
                  Bu eski taslakta ayrıca kaydedilmiş ayrıntılar var
                </strong>
                <p>
                  Artık bu bilgiler yeniden sorulmuyor. Görmeden onaylamamanız için
                  kaydetmeden önce korumayı veya çıkarmayı seçin.
                </p>
                <dl>
                  {context.trim() ? (
                    <div>
                      <dt>Eski bağlam</dt>
                      <dd>{context}</dd>
                    </div>
                  ) : null}
                  {childQuote.trim() ? (
                    <div>
                      <dt>Eski çocuk sözü</dt>
                      <dd>{childQuote}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="quick-legacy-actions">
                  <button
                    type="button"
                    onClick={() => setLegacyDetailsReviewRequired(false)}
                  >
                    Kayda dahil et
                  </button>
                  <button type="button" onClick={discardLegacyDetails}>
                    Bu kayıttan çıkar
                  </button>
                </div>
              </section>
            ) : null}

            <details className="quick-details">
              <summary tabIndex={0}>
                <span>
                  <ReaderIcon aria-hidden="true" />
                  <strong>İstersen ayrıntı ekle</strong>
                  <small>Yalnız gerekiyorsa tür ve alan seçin</small>
                </span>
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className="quick-details-fields">
                {ageBand && captureActivity.curriculumProfile.framework === "tymm" ? (
                  <Suspense
                    fallback={(
                      <div className="route-loading" role="status">
                        Gelişim bilgileri hazırlanıyor…
                      </div>
                    )}
                  >
                    <DevelopmentObservationPicker
                      key={`${captureActivity.id}-${studentId}-${selectionMode}`}
                      ageBand={ageBand}
                      activityContext={captureActivity}
                      selection={developmentSelection}
                      disabled={draftLoading || busy || selectedStudentCount === 0}
                      onSelect={selectDevelopment}
                    />
                  </Suspense>
                ) : null}
                <span className="quick-detail-label">Gözlem türü</span>
                <div className="quick-type-grid" role="group" aria-label="Gözlem türleri">
                  {quickObservationTypes.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setObservationType(id)}
                      aria-pressed={observationType === id}
                      disabled={draftLoading || busy}
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
                      disabled={draftLoading || busy}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </details>

              {safeError ? <p className="d1-error" role="alert">{safeError}</p> : null}
              {feedback ? (
                <TeacherFeedbackPanel
                  feedback={feedback}
                  onAction={saveReady ? () => void save() : undefined}
                  compact
                />
              ) : null}
            </>
          )}
        </div>
      </MobileScroll>
      {eligibleStudents.length > 0 ? (
        <div
          className={`quick-save-dock${saveReady ? " is-ready" : " is-blocked"}${draftStatus === "error" ? " is-error" : ""}`}
        >
          <p id="quick-save-readiness" role="status">
            {saveReady ? (
              <CheckCircledIcon aria-hidden="true" />
            ) : (
              <ClockIcon aria-hidden="true" />
            )}
            {saveStatusLabel}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!saveReady}
            aria-describedby="quick-save-readiness"
          >
            <CheckCircledIcon aria-hidden="true" />
            {busy
              ? "Kaydediliyor…"
              : selectionMode === "selected-children" &&
                  groupStudentIds.length >= 2
                ? `${groupStudentIds.length} çocuk için gözlemi kaydet`
                : "Gözlemi kaydet"}
          </button>
          <small>
            {developmentSelection
              ? "Kaydet, seçili davranışı ve Maarif bağlantısını onaylar."
              : selectionMode === "selected-children"
              ? "Program bağlantısı her çocuk için ayrı ayrı tamamlanabilir."
              : "Program bağlantısı daha sonra tamamlanabilir."}
          </small>
        </div>
      ) : null}

      <EdgeVisionObservationModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
        studentName={students.find((s) => s.id === studentId)?.name || "Öğrenci"}
        onApplyObservation={(anecdote, centerName) => {
          setRawText((prev) => (prev ? `${prev}\n${anecdote}` : anecdote));
          if (centerName && !context) {
            setContext(centerName);
          }
        }}
      />
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
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);
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
    setFeedback(null);
    try {
      await actions.confirm(observation, targetForSave);
      flow.replace(createAssessmentScreen(observation, targetForSave, actions));
    } catch (reason) {
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Program bağlantısı kaydedilemedi. Seçiminiz korunuyor; yeniden deneyebilirsiniz.",
        }),
      );
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
          <strong>
            {observation.plannedCurriculumTargets.length > 0
              ? "Planlanan hedefle sınırlandırıldı"
              : "Öğretmen beyanı · resmî katalogda doğrulanmadı"}
          </strong>
          <p>
            {observation.plannedCurriculumTargets.length > 0
              ? "Bağlantı yalnız bu etkinlik için önceden seçilen program hedeflerinden kurulabilir. Son karar öğretmen onayıdır."
              : "Eski veya plansız gözlem için yazdığınız referans öğretmen beyanı olarak saklanır; resmî program hedefi sayılmaz."}
          </p>
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

        {feedback ? (
          <TeacherFeedbackPanel
            feedback={feedback}
            onAction={() => void save()}
            compact
          />
        ) : null}
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
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await actions.createDraft(
        observation,
        text,
        draftId,
        assessmentLevel,
        [target.id],
      );
      flow.replace(createCompletionScreen(observation, target, actions));
    } catch (reason) {
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Değerlendirme taslağı kaydedilemedi. Metniniz korunuyor; yeniden deneyebilirsiniz.",
        }),
      );
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

        <p className="d1-integrity-note"><CheckCircledIcon aria-hidden="true" /> Kaydettiğiniz değerlendirme seçili gözleme ve hedefe birlikte bağlanır.</p>
        {feedback ? (
          <TeacherFeedbackPanel
            feedback={feedback}
            onAction={() => void save()}
            compact
          />
        ) : null}
        <button className="d1-primary" type="button" onClick={() => void save()} disabled={busy || !text.trim()}>
          {busy ? "Kaydediliyor…" : "Değerlendirmeyi kaydet ve tamamla"}
        </button>
      </div>
    </MobileScroll>
  );
}

function CompletionScreen({
  observation,
  target,
  actions,
}: {
  observation: EvidenceObservationSummary;
  target: CurriculumTargetSnapshot;
  actions: EvidenceFlowActions;
}) {
  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content d1-completion">
        <span className="d1-completion-icon"><CheckCircledIcon aria-hidden="true" /></span>
        <span className="d1-kicker">Kayıt zinciri tamamlandı</span>
        <h1>{observation.studentName} için değerlendirme kaydedildi.</h1>
        <p>Gözlem notu, seçtiğiniz program bağlantısı ve yazdığınız değerlendirme birlikte kaydedildi.</p>
        <section className="d1-context-card">
          <strong>Bağlantılar tamamlandı</strong>
          <span>1 gözlem notuna atıf</span>
          <em>
            {target.officialCatalogVerified
              ? `${target.referenceCode} · resmî katalog kaynağı doğrulandı`
              : "Program referansı öğretmen beyanı · resmî katalogda doğrulanmadı"}
          </em>
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
  target: CurriculumTargetSnapshot,
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
    render: () => (
      <CompletionScreen observation={observation} target={target} actions={actions} />
    ),
  };
}

function EvidenceCaptureFlow({
  activity,
  ageBand,
  pendingObservation,
  assessmentTarget,
  initialStudentId,
  initialDraft,
  students,
  actions,
  availableActivities,
}: {
  activity: EvidenceActivitySummary;
  ageBand?: Tymm2024AgeBand;
  pendingObservation?: EvidenceObservationSummary;
  assessmentTarget?: CurriculumTargetSnapshot;
  initialStudentId?: string;
  initialDraft?: EvidenceCaptureSeed;
  students: Student[];
  actions: EvidenceFlowActions;
  availableActivities?: EvidenceActivitySummary[];
}) {
  const initial = useMemo<FlowScreen>(
    () =>
      pendingObservation && assessmentTarget
        ? createAssessmentScreen(pendingObservation, assessmentTarget, actions)
        : pendingObservation
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
                ageBand={ageBand}
                initialStudentId={initialStudentId}
                initialDraft={initialDraft}
                students={students}
                actions={actions}
                availableActivities={availableActivities}
              />
            ),
          },
    [
      actions,
      activity,
      ageBand,
      assessmentTarget,
      initialDraft,
      initialStudentId,
      pendingObservation,
      students,
    ],
  );

  return <FlowStack initial={initial} />;
}

type TymmChildParticipationSession = {
  guide: TymmAgeGuideReadModel;
  template: TymmAgeGuideChoiceTemplate;
  student: Student;
};

function TymmChildParticipationDialog({
  session,
  onAdultExit,
  onHandoff,
}: {
  session: TymmChildParticipationSession;
  onAdultExit: () => void;
  onHandoff: (choice: TymmAgeGuideChoice | null) => void;
}) {
  type TymmAdultAction = "exit" | "handoff";
  const TYMM_ADULT_HOLD_MS = 1_400;
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [adultHoldingAction, setAdultHoldingAction] =
    useState<TymmAdultAction | null>(null);
  const [adultConfirmationAction, setAdultConfirmationAction] =
    useState<TymmAdultAction | null>(null);
  const adultHoldTimerRef = useRef<number | null>(null);
  const childName =
    session.student.preferredName?.trim() ||
    session.student.name.trim().split(/\s+/u)[0] ||
    "Arkadaşım";
  const selectedChoice =
    session.template.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const skipped = selectedChoiceId === "skip";
  const readyForHandoff = Boolean(selectedChoice || skipped);
  const choiceIcons = [StarIcon, MagicWandIcon, ChatBubbleIcon] as const;

  const completeAdultAction = (action: TymmAdultAction) => {
    setAdultConfirmationAction(null);
    if (action === "exit") {
      onAdultExit();
      return;
    }
    if (readyForHandoff) onHandoff(selectedChoice);
  };

  const cancelAdultHold = () => {
    if (adultHoldTimerRef.current !== null) {
      window.clearTimeout(adultHoldTimerRef.current);
      adultHoldTimerRef.current = null;
    }
    setAdultHoldingAction(null);
  };

  const beginAdultHold = (action: TymmAdultAction) => {
    if (action === "handoff" && !readyForHandoff) return;
    if (adultHoldTimerRef.current !== null) return;
    setAdultConfirmationAction(null);
    setAdultHoldingAction(action);
    adultHoldTimerRef.current = window.setTimeout(() => {
      adultHoldTimerRef.current = null;
      setAdultHoldingAction(null);
      completeAdultAction(action);
    }, TYMM_ADULT_HOLD_MS);
  };

  useEffect(
    () => () => {
      if (adultHoldTimerRef.current !== null) {
        window.clearTimeout(adultHoldTimerRef.current);
      }
    },
    [],
  );

  const selectChildChoice = (choiceId: string) => {
    cancelAdultHold();
    setAdultConfirmationAction(null);
    setSelectedChoiceId(choiceId);
  };

  return (
    <Dialog.Root open modal onOpenChange={() => undefined}>
      <Dialog.Overlay className="tymm-child-overlay" />
      <Dialog.Content
        className="tymm-child-layer"
        data-testid="tymm-child-participation"
        aria-modal="true"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <header
          className="tymm-child-header"
          inert={Boolean(adultConfirmationAction)}
          aria-hidden={adultConfirmationAction ? true : undefined}
        >
          <span>
            <small>{session.guide.ageLabel} · birlikte seçim</small>
            <Dialog.Title>{childName}, sıra sende</Dialog.Title>
          </span>
          <button
            type="button"
            className={adultHoldingAction === "exit" ? "is-holding" : ""}
            data-testid="tymm-child-adult-exit"
            aria-label="Yetişkin çıkışı için basılı tut veya doğrulama adımını aç"
            aria-describedby="tymm-adult-exit-help"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              beginAdultHold("exit");
            }}
            onPointerUp={cancelAdultHold}
            onPointerCancel={cancelAdultHold}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
                event.preventDefault();
                beginAdultHold("exit");
              }
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                const awaitingConfirmation = adultHoldTimerRef.current !== null;
                cancelAdultHold();
                if (awaitingConfirmation) setAdultConfirmationAction("exit");
              }
            }}
            onClick={() => setAdultConfirmationAction("exit")}
          >
            <LockClosedIcon aria-hidden="true" />
            <span>
              {adultHoldingAction === "exit" ? "Biraz daha tut" : "Yetişkin çıkışı"}
            </span>
          </button>
        </header>

        <main
          className="tymm-child-main"
          inert={Boolean(adultConfirmationAction)}
          aria-hidden={adultConfirmationAction ? true : undefined}
        >
          <div className="tymm-child-intro">
            <span className="tymm-child-step">1 / 1</span>
            <p>{session.template.title}</p>
            <Dialog.Description>{session.template.childPrompt}</Dialog.Description>
          </div>

          <div className="tymm-child-choice-grid" role="group" aria-label="Seçenekler">
            {session.template.choices.map((choice, index) => {
              const Icon = choiceIcons[index];
              const selected = selectedChoiceId === choice.id;
              return (
                <button
                  type="button"
                  key={choice.id}
                  data-testid={`tymm-child-choice-${choice.id}`}
                  aria-pressed={selected}
                  onClick={() => selectChildChoice(choice.id)}
                >
                  <span aria-hidden="true"><Icon /></span>
                  <strong>{choice.label}</strong>
                  {selected ? <CheckCircledIcon aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="tymm-child-skip"
            data-testid="tymm-child-skip"
            aria-pressed={skipped}
            onClick={() => selectChildChoice("skip")}
          >
            Şimdi seçmek istemiyorum
          </button>

          <section className="tymm-child-handoff" aria-live="polite">
            <div>
              <strong>
                {selectedChoice
                  ? `Seçimin: ${selectedChoice.label}`
                  : skipped
                    ? "Seçmemek de olur"
                    : "Bir seçeneğe dokunabilirsin"}
              </strong>
              <small>
                {readyForHandoff
                  ? "İstersen değiştirebilirsin. Yetişkin, öğretmene geçiş için düğmeyi basılı tutar."
                  : "Burada doğru veya yanlış yok; seçim puanlanmaz."}
              </small>
            </div>
            <button
              type="button"
              className={adultHoldingAction === "handoff" ? "is-holding" : ""}
              data-testid="tymm-child-handoff"
              disabled={!readyForHandoff}
              aria-label="Öğretmene geçmek için basılı tut veya doğrulama adımını aç"
              aria-describedby="tymm-adult-exit-help"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                beginAdultHold("handoff");
              }}
              onPointerUp={cancelAdultHold}
              onPointerCancel={cancelAdultHold}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
                  event.preventDefault();
                  beginAdultHold("handoff");
                }
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  const awaitingConfirmation = adultHoldTimerRef.current !== null;
                  cancelAdultHold();
                  if (awaitingConfirmation) setAdultConfirmationAction("handoff");
                }
              }}
              onClick={() => setAdultConfirmationAction("handoff")}
            >
              {adultHoldingAction === "handoff" ? "Biraz daha tut" : "Öğretmenime göster"}
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </section>
        </main>

        <p
          id="tymm-adult-exit-help"
          className="tymm-child-privacy-note"
          inert={Boolean(adultConfirmationAction)}
          aria-hidden={adultConfirmationAction ? true : undefined}
        >
          Bu ekran öğretmen bilgilerini ve sınıf kayıtlarını gizler. Yetişkin
          düğmesini 1,4 saniye basılı tutun veya erişilebilir doğrulama adımını onaylayın.
        </p>

        {adultConfirmationAction ? (
          <Dialog.Root
            open
            modal
            onOpenChange={(open) => {
              if (!open) setAdultConfirmationAction(null);
            }}
          >
            <Dialog.Overlay className="tymm-adult-confirm-overlay" />
            <Dialog.Content
              className="tymm-adult-confirm-dialog"
              data-testid="tymm-adult-confirmation"
              aria-modal="true"
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              <LockClosedIcon aria-hidden="true" />
              <Dialog.Title>Yetişkin doğrulaması</Dialog.Title>
              <Dialog.Description>
                {adultConfirmationAction === "exit"
                  ? "Çocuk ekranını kapatıp öğretmen rehberine dönmek üzeresiniz."
                  : skipped
                    ? "Çocuğun pas seçimini kaydetmeden öğretmen rehberine döneceksiniz."
                    : "Çocuğun seçimini yalnız düzenlenebilir öğretmen taslağına aktaracaksınız."}
              </Dialog.Description>
              <div>
                <button
                  type="button"
                  data-testid="tymm-adult-confirm-cancel"
                  onClick={() => setAdultConfirmationAction(null)}
                >
                  Çocuk ekranına dön
                </button>
                <button
                  type="button"
                  data-testid="tymm-adult-confirm-action"
                  onClick={() => completeAdultAction(adultConfirmationAction)}
                >
                  {adultConfirmationAction === "exit"
                    ? "Evet, rehbere dön"
                    : "Evet, öğretmene geç"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const { device, native } = useMobileDevice();
  const { bottomInset } = useKeyboardInsets();
  const { route, navigate } = useBrowserRouter();
  const sharedInviteRequired = useMemo(sharedInviteAccessIsRequired, []);
  const [sharedInviteGranted, setSharedInviteGranted] = useState(
    () => !sharedInviteRequired || hasLocalSharedAccess(),
  );
  // The 2026-2027 release has one shared, local access gate. Historical
  // premium query parameters intentionally have no runtime effect.
  const premiumLegacyRequested = false;
  const premiumPilotPreviewEnabled = false;
  const [premiumFounderConfigurationState, setPremiumFounderConfigurationState] =
    useState<{
    configuration: PremiumFounderConfiguration | null;
    error: string;
    ready: boolean;
  }>({
    configuration: null,
    error: "",
    ready: !premiumLegacyRequested,
  });
  const internalStaffExportEnabled = false;
  const store = useMemo(() => new IndexedDbDataStore(), []);
  const storeCloseTimerRef = useRef<number | null>(null);
  const [classDutyRequest,setClassDutyRequest]=useState<{kind:'fruit'|'child-of-week';scheduleId?:string;month?:string}|null>(null);
  const [tomorrowTool,setTomorrowTool]=useState<{kind:'groups'|'family';civilDate:string}|null>(null);
  const backupServicePromiseRef = useRef<
    Promise<import("./core/backup/backup-service").BackupService> | null
  >(null);
  const getBackupService = useCallback(() => {
    backupServicePromiseRef.current ??= import(
      "./core/backup/backup-service"
    ).then(
      ({ BackupService }) =>
        new BackupService(store, { appVersion: CURRENT_RELEASE.version }),
    );
    return backupServicePromiseRef.current;
  }, [store]);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const vaultRecoveryFileRef = useRef<HTMLInputElement>(null);
  const vaultRecoveryFileButtonRef = useRef<HTMLButtonElement>(null);
  const vaultRecoveryFileFocusListenerRef = useRef<(() => void) | null>(null);
  const vaultRecoveryRestorePasswordRef = useRef<HTMLInputElement>(null);
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
  const d1ReturnFocusSelectorRef = useRef<string | null>(null);
  const d1ReturnFocusStudentIdRef = useRef<string | null>(null);
  const d1ReturnToProfileRef = useRef(false);
  const [pendingProfileFocusId, setPendingProfileFocusId] = useState<string | null>(null);
  const studentProfileReturnFocusRef = useRef<HTMLElement | null>(null);
  const studentProfileSheetRef = useRef<HTMLDivElement | null>(null);
  const studentProfileExitDialogRef = useRef<HTMLElement | null>(null);
  const studentProfileRestoreFocusOnCloseRef = useRef(false);
  const attendanceMutationSequenceRef = useRef(0);
  const dayRefreshInFlightRef = useRef(false);
  const historyInitializedRef = useRef(false);
  const historySurfaceRef = useRef<AppSurface | null>(null);
  const historyRestoringRef = useRef(false);
  const surfaceTransitionRef = useRef<AppSurface | null>(null);
  const activeSurfaceRef = useRef<AppSurface | null>(null);
  const lastEvidenceFlowRequestRef = useRef<EvidenceFlowRequest | null>(null);
  const lastCompletionRequestRef = useRef<{ studentId?: string; observationId?: string } | null>(null);
  const observationCompletionPromptRef = useRef(true);
  const lastPlanGuidanceDateRef = useRef<string | null>(null);
  const lastTymmChildSessionRef = useRef<TymmChildParticipationSession | null>(null);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [studentArchiveCandidate, setStudentArchiveCandidate] = useState<Student | null>(null);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [attendanceCivilDate, setAttendanceCivilDate] = useState(
    fallbackDashboardState.attendanceCivilDate,
  );
  const [lastAttendanceChange, setLastAttendanceChange] = useState<AttendanceChange | null>(null);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    phase: "hydrating",
    detail: "Sınıf, plan ve taslaklar güvenle açılıyor.",
    pendingWrites: 0,
  });
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [offlineReadiness, setOfflineReadiness] =
    useState<OfflineReadiness>("checking");
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [studentProfileOpen, setStudentProfileOpen] = useState(false);
  const [familyMeetingAppointmentId, setFamilyMeetingAppointmentId] = useState<string | null>(null);
  const studentSummaryLock = useRef(false);
  const deskDocumentBlocked = useRef(true);
  const [studentSummaryBusy, setStudentSummaryBusy] = useState(false);
  const [managementRequest, setManagementRequest] = useState<{ studentId?: string; section?: ManagementSection } | null>(null);
  const [followupRequest, setFollowupRequest] = useState<{ studentId?: string; section?: FollowupSection; civilDate?: string } | null>(null);
  const [followupRevision, setFollowupRevision] = useState(0);
  const [completionRequest, setCompletionRequest] = useState<{ studentId?: string; observationId?: string } | null>(null);
  const [planGuidanceCivilDate, setPlanGuidanceCivilDate] = useState<string | null>(null);
  const [calendarSnapshot, setCalendarSnapshot] = useState<DataSnapshot | null>(null);
  useEffect(() => { const changed = () => setFollowupRevision(value => value + 1); window.addEventListener(FOLLOWUP_CHANGED_EVENT, changed); return () => window.removeEventListener(FOLLOWUP_CHANGED_EVENT, changed); }, []);
  useEffect(() => {
    const handleOpenAttendance = () => setAttendanceOpen(true);
    window.addEventListener("maarif_open_attendance", handleOpenAttendance);
    return () => window.removeEventListener("maarif_open_attendance", handleOpenAttendance);
  }, []);
  const [studentImportScope, setStudentImportScope] = useState<{ classroomId: string; academicYearId: string } | null>(null);
  useEffect(() => {
    if (
      studentProfileOpen ||
      !studentProfileRestoreFocusOnCloseRef.current
    ) {
      return;
    }

    studentProfileRestoreFocusOnCloseRef.current = false;
    const returnFocusTarget = studentProfileReturnFocusRef.current;
    const exitingDialog = studentProfileExitDialogRef.current;
    if (!returnFocusTarget) {
      studentProfileExitDialogRef.current = null;
      return;
    }

    let animationFrame = 0;
    const restoreFocusAfterExit = () => {
      if (exitingDialog?.isConnected) {
        animationFrame = window.requestAnimationFrame(restoreFocusAfterExit);
        return;
      }
      studentProfileExitDialogRef.current = null;
      studentProfileReturnFocusRef.current = null;
      if (returnFocusTarget.isConnected) {
        returnFocusTarget.focus({ preventScroll: true });
      }
    };
    animationFrame = window.requestAnimationFrame(restoreFocusAfterExit);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [studentProfileOpen]);
  const [developmentReportOpen, setDevelopmentReportOpen] = useState(false);
  const [developmentReportStudentId, setDevelopmentReportStudentId] = useState<string | null>(null);
  const [developmentReportPeriod, setDevelopmentReportPeriod] = useState<{ periodStart: string; periodEnd: string } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfileForm, setStudentProfileForm] =
    useState<StudentProfileFormState>({
      firstName: "",
      lastName: "",
      preferredName: "",
      birthDate: "",
      optionalCode: "",
      nationalIdentityNumber: "",
      enrollmentYear: "",
      homeLanguages: "",
      interests: "",
      strengths: "",
      supportPreferences: "",
      contacts: [],
      careDetails: { ...emptyStudentCareForm },
      profilePhotoDataUrl: "",
    });
  const [studentProfileError, setStudentProfileError] = useState("");
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);
  const [studentObservationLimit, setStudentObservationLimit] = useState(20);
  const [studentProfileTab, setStudentProfileTab] =
    useState<StudentProfileTab>("flow");
  const [studentObservationFilter, setStudentObservationFilter] =
    useState<"all" | "pending-link" | "pending-assessment">("all");
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
  const [settingsInitialSection, setSettingsInitialSection] =
    useState<"overview" | "account" | "backup">("overview");
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [tymmGuideOpen, setTymmGuideOpen] = useState(false);
  const [tymmGuideAgeBand, setTymmGuideAgeBand] =
    useState<TymmAgeGuideReadModel["ageBand"]>("60-72");
  const [tymmGuideDomain, setTymmGuideDomain] =
    useState<TymmAgeGuideReadModel["domainOutcomeCounts"][number]["domain"]>("Türkçe");
  const [tymmGuideStudentId, setTymmGuideStudentId] = useState("");
  const [tymmGuideTemplateId, setTymmGuideTemplateId] = useState("");
  const [tymmChildSession, setTymmChildSession] =
    useState<TymmChildParticipationSession | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDutyLinks,setCalendarDutyLinks]=useState<Record<string,{kind:'fruit'|'child-of-week';scheduleId:string}>>({});
  useEffect(()=>{if(!calendarOpen)return;let active=true;void Promise.all([store.readSnapshot(),import('./core/domain/class-duty-schedule.ts')]).then(([snapshot,module])=>{if(!active)return;const links:Record<string,{kind:'fruit'|'child-of-week';scheduleId:string}>={};for(const schedule of module.currentClassDutySchedules(snapshot))for(const row of schedule.workflow.rows)links[row.calendarEntryId]={kind:schedule.workflow.config.kind,scheduleId:schedule.workflow.scheduleId};setCalendarDutyLinks(links);}).catch(()=>{if(active)setCalendarDutyLinks({});});return()=>{active=false;};},[store,calendarOpen,followupRevision]);
  const calendarEntryTitleRef = useRef<HTMLInputElement>(null);
  const [academicCalendar, setAcademicCalendar] =
    useState<AcademicCalendarWorkspace>(emptyAcademicCalendar);
  const [scheduledPlanWorkspace, setScheduledPlanWorkspace] =
    useState<ScheduledPlanWorkspace>(emptyScheduledPlanWorkspace);
  const [calendarMonth, setCalendarMonth] = useState("2026-09");
  const [calendarSelectedDate, setCalendarSelectedDate] =
    useState("2026-09-07");
  const [calendarEntryForm, setCalendarEntryForm] =
    useState<CalendarEntryFormState>(initialCalendarEntryForm);
  const [calendarError, setCalendarError] = useState("");
  const [academicYearTransitionConfirmed, setAcademicYearTransitionConfirmed] =
    useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [simpleObservationOutputOpen, setSimpleObservationOutputOpen] =
    useState(false);
  const [documentsInitialSection, setDocumentsInitialSection] =
    useState<"overview" | "anecdotes" | "students">("overview");
  const [anecdoteWorkspace, setAnecdoteWorkspace] =
    useState<AnecdoteFormWorkspace>({
      forms: [],
      incompleteCount: 0,
      reviewRequiredCount: 0,
      readyCount: 0,
    });
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [activityChildModeOpen, setActivityChildModeOpen] = useState(false);
  const [observationContextChoice, setObservationContextChoice] =
    useState<ObservationContextChoice | null>(null);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [newStudentNationalIdentityNumber, setNewStudentNationalIdentityNumber] =
    useState("");
  const [newStudentGuardianName, setNewStudentGuardianName] = useState("");
  const [newStudentGuardianPhone, setNewStudentGuardianPhone] = useState("");
  const [newStudentHomeAddress, setNewStudentHomeAddress] = useState("");
  const [newStudentHomeAddressParts, setNewStudentHomeAddressParts] = useState<StudentHomeAddressParts | undefined>(undefined);
  const [newStudentError, setNewStudentError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentAddOpen, setStudentAddOpen] = useState(false);
  const [studentActionsOpenId, setStudentActionsOpenId] =
    useState<string | null>(null);
  const [classExportPreviewOpen, setClassExportPreviewOpen] = useState(false);
  const [classroomToolsMounted, setClassroomToolsMounted] = useState(false);
  const [classExportStartDate, setClassExportStartDate] = useState("");
  const [classExportEndDate, setClassExportEndDate] = useState("");
  const [classExportStudentIds, setClassExportStudentIds] = useState<string[]>(
    [],
  );
  const [classExportNameMode, setClassExportNameMode] =
    useState<"preferred" | "registered">("preferred");
  const [todayWorkspace, setTodayWorkspace] = useState<TodayWorkspace>(emptyTodayWorkspace);
  const [teacherWorkCycle, setTeacherWorkCycle] =
    useState<TeacherWorkCycleWorkspace>(() =>
      emptyTeacherWorkCycle(fallbackDashboardState.attendanceCivilDate),
    );
  const [teacherWeekWorkspace, setTeacherWeekWorkspace] =
    useState<TeacherWeekWorkspace>(() =>
      emptyTeacherWeekState(fallbackDashboardState.attendanceCivilDate),
    );
  const [dayClosureWorkspace, setDayClosureWorkspace] =
    useState<TeacherDayClosureWorkspace>(() =>
      emptyTeacherDayClosureWorkspace(
        fallbackDashboardState.attendanceCivilDate,
      ),
    );
  const [dayClosureOpen, setDayClosureOpen] = useState(false);
  const [dayClosureNote, setDayClosureNote] = useState("");
  const [dayClosureError, setDayClosureError] = useState("");
  const [dayClosureBusy, setDayClosureBusy] = useState(false);
  const [selectedPlanDayWorkspace, setSelectedPlanDayWorkspace] =
    useState<TodayWorkspace | null>(null);
  const [evidenceWorkspace, setEvidenceWorkspace] =
    useState<EvidenceWorkspace>(emptyEvidenceWorkspace);
  const [observationOpening, setObservationOpening] = useState(false);
  const spontaneousContextWarmupRef = useRef<{
    key: string;
    promise: ReturnType<typeof ensureSpontaneousObservationContext>;
  } | null>(null);
  const [planFlowOpen, setPlanFlowOpen] = useState(false);
  const [manualPlanCivilDate, setManualPlanCivilDate] = useState<string | null>(null);
  const [studioActivityTitle, setStudioActivityTitle] = useState<string | null>(null);
  const studioOpenOptionsRef = useRef<ActivityStudioOpenOptions>({});
  const [studioPedagogicalProvenance, setStudioPedagogicalProvenance] =
    useState<PedagogicalPlanProvenance | null>(null);
  const [teacherPlanRecordsOpen, setTeacherPlanRecordsOpen] = useState(false);
  const [teacherPlanRecordsInitialLevel, setTeacherPlanRecordsInitialLevel] =
    useState<Exclude<PlanWorkbenchLevelId, "daily">>("annual");
  const [teacherPlanRecordsInitialMonthKey, setTeacherPlanRecordsInitialMonthKey] =
    useState<string | null>(null);
  const [teacherPlanRecordsInitialPlanId, setTeacherPlanRecordsInitialPlanId] = useState<string | null>(null);
  const [scheduledPlanEditDraft, setScheduledPlanEditDraft] =
    useState<ScheduledPlanEditDraft | null>(null);
  const [teacherOwnedDailyFlowCopySources, setTeacherOwnedDailyFlowCopySources] =
    useState<TeacherOwnedDailyFlowCopySource[]>([]);
  const [futurePlanNotice, setFuturePlanNotice] = useState<{
    planId: string;
    civilDate: string;
    activityTitle: string;
    refreshRequired?: boolean;
  } | null>(null);
  const [observationRefreshNotice, setObservationRefreshNotice] =
    useState<ObservationRefreshNotice | null>(null);
  const [observationRefreshBusy, setObservationRefreshBusy] = useState(false);
  const [premiumPlanOpen, setPremiumPlanOpen] = useState(false);
  const [premiumPlanInitialSection, setPremiumPlanInitialSection] =
    useState<"overview" | "weekly" | "monthly">("overview");
  const [premiumPlanBuiltInReference, setPremiumPlanBuiltInReference] =
    useState<BuiltInMaarifPlanPackReference | null>(null);
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const [premiumGateMounted, setPremiumGateMounted] = useState(false);
  const [premiumFounderAccess, setPremiumFounderAccess] =
    useState<PremiumFounderAccessResult | null>(null);
  const [premiumFounderBusy, setPremiumFounderBusy] = useState(
    premiumLegacyRequested,
  );
  const [premiumFounderError, setPremiumFounderError] = useState(
    premiumFounderConfigurationState.error,
  );
  const [premiumFounderErrorPresentation, setPremiumFounderErrorPresentation] =
    useState<PremiumFounderActivationErrorPresentation | null>(null);
  const [premiumFounderResetBusy, setPremiumFounderResetBusy] = useState(false);
  const [premiumDailyTemplate, setPremiumDailyTemplate] =
    useState<PremiumDailyTemplateSelection | null>(null);
  const [evidenceFlowRequest, setEvidenceFlowRequest] =
    useState<EvidenceFlowRequest | null>(null);
  const [classroomForm, setClassroomForm] = useState<ClassroomFormState>(initialClassroomForm);
  const [, setClassroomSetupSection] =
    useState<ClassroomSetupSectionId>("period");
  const [classroomError, setClassroomError] = useState("");
  const [studentDeletionCandidate, setStudentDeletionCandidate] =
    useState<Student | null>(null);
  const [studentDeletionImpact, setStudentDeletionImpact] =
    useState<StudentDeletionImpact | null>(null);
  const [studentDeletionError, setStudentDeletionError] = useState("");
  const permanentDeletionBusyRef = useRef(false);
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
      personalDataApprovedForAi: false,
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
  const [localVaultRecoveryRequired, setLocalVaultRecoveryRequired] =
    useState(false);
  const [vaultRecoveryBackup, setVaultRecoveryBackup] =
    useState<VaultRecoveryBackup | null>(null);
  const [vaultRecoveryPassword, setVaultRecoveryPassword] = useState("");
  const [vaultRecoveryConfirmation, setVaultRecoveryConfirmation] =
    useState("");
  const [vaultResetConfirmation, setVaultResetConfirmation] = useState("");
  const [vaultRecoveryError, setVaultRecoveryError] = useState("");
  const [vaultRecoveryBusy, setVaultRecoveryBusy] = useState(false);
  const [recoverySnapshots, setRecoverySnapshots] = useState<
    RecoverySnapshotMetadata[]
  >([]);
  const [recoverySnapshotWarning, setRecoverySnapshotWarning] = useState("");
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
  const [backupHealthReceipt, setBackupHealthReceipt] =
    useState<BackupHealthReceipt | null>(null);
  const [wipeConfirmation, setWipeConfirmation] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState("Sınıf, plan ve taslaklar güvenle açılıyor.");
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseNotesExpanded, setReleaseNotesExpanded] = useState(false);
  const [releasePreviousVersion, setReleasePreviousVersion] =
    useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [pwaStatus, setPwaStatus] = useState<PwaRuntimeStatus | null>(null);
  const backupReminder = useMemo(
    () => backupReminderState(lastSuccessfulBackupAt),
    [lastSuccessfulBackupAt],
  );
  const recoveryHealth = useMemo(
    () => backupRecoveryHealth(backupHealthReceipt, lastSuccessfulBackupAt),
    [backupHealthReceipt, lastSuccessfulBackupAt],
  );
  const [announcement, setAnnouncement] = useState("MaarifOS hazır.");

  useEffect(() => {
    const warmPrimaryWorkspaces = () => {
      void Promise.allSettled([
        preloadPrimarySurface("today"),
        preloadPrimarySurface("classroom"),
        preloadPrimarySurface("plans"),
        preloadPrimarySurface("documents"),
      ]);
    };
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmPrimaryWorkspaces, { timeout: 1_500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(warmPrimaryWorkspaces, 900);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!classroomOpen) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("school-name")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [classroomOpen]);
  useEffect(
    () => () => {
      const listener = vaultRecoveryFileFocusListenerRef.current;
      if (listener) window.removeEventListener("focus", listener);
      vaultRecoveryFileFocusListenerRef.current = null;
    },
    [],
  );
  useEffect(() => {
    if (
      !localVaultRecoveryRequired ||
      !vaultRecoveryBackup?.receipt ||
      vaultRecoveryBusy
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      vaultRecoveryRestorePasswordRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    localVaultRecoveryRequired,
    vaultRecoveryBackup?.receipt,
    vaultRecoveryBusy,
  ]);
  useEffect(() => {
    if (!localVaultRecoveryRequired) return;
    const input = vaultRecoveryFileRef.current;
    if (!input) return;
    const handleCancel = () => {
      clearVaultRecoveryFileFocusListener();
      focusVaultRecoveryFileButton();
    };
    input.addEventListener("cancel", handleCancel);
    return () => input.removeEventListener("cancel", handleCancel);
  }, [localVaultRecoveryRequired]);
  const dataHydrated =
    persistenceState.phase === "ready" || persistenceState.phase === "pending";
  const writesBlocked =
    !dataHydrated || persistenceState.phase === "error" || appLocked;

  useEffect(() => {
    if (!dataHydrated) return;
    let alive = true;
    void store.readSnapshot().then(value => { if (alive) setCalendarSnapshot(value); }).catch(() => { if (alive) setCalendarSnapshot(null); });
    return () => { alive = false; };
  }, [store, dataHydrated, persistenceState.lastCommittedAt, followupRevision, attendanceCivilDate]);
  const calendarScope = calendarSnapshot ? resolveActiveClassroomScope(calendarSnapshot) : null;
  const schoolCalendarContext = calendarSnapshot && calendarScope ? { academicYear: calendarSnapshot.academicYears.find(r => r.id === calendarScope.academicYearId)!, classroomId: calendarScope.classroomId, calendarEntries: calendarSnapshot.calendarEntries } : undefined;
  const attendanceRoster = useMemo(() => {
    if (!calendarSnapshot || !calendarScope) return [];
    const ids = new Set(attendanceExpectedStudentIdsOnDate(calendarSnapshot, calendarScope, attendanceCivilDate));
    return [...students, ...archivedStudents].filter(student => ids.has(student.id));
  }, [calendarSnapshot, calendarScope?.classroomId, calendarScope?.academicYearId, attendanceCivilDate, students, archivedStudents]);
  const counts = useMemo(() => dashboardAttendanceCounts(attendanceRoster), [attendanceRoster]);
  const configuredClassroom = todayWorkspace.classroom.status === "configured"
    ? todayWorkspace.classroom
    : null;
  const tymmAgeGuides = listTymmAgeGuides();
  const selectedTymmGuide =
    getTymmAgeGuide(tymmGuideAgeBand) ?? tymmAgeGuides[0];
  const selectedTymmOfficialAgeResource = getTymmOfficialAgeResource(
    selectedTymmGuide.ageBand,
  );
  const currentClassTymmAgeBand = curriculumAgeBandFromLabel(
    configuredClassroom?.ageGroup,
  );
  const selectedTymmTemplate =
    selectedTymmGuide.choiceTemplates.find(
      (template) => template.id === tymmGuideTemplateId,
    ) ?? selectedTymmGuide.choiceTemplates[0];
  const selectedTymmStudent =
    students.find((student) => student.id === tymmGuideStudentId) ?? students[0];
  const selectedTymmOutcomes = TYMM_2024_LEARNING_OUTCOMES.filter(
    (outcome) =>
      outcome.ageBand === selectedTymmGuide.ageBand &&
      outcome.domain === tymmGuideDomain,
  );
  const childParticipationBlockedReason =
    configuredClassroom?.curriculumProfile?.framework !== "tymm"
      ? "Çocuk ekranı yalnız TYMM profili seçili sınıfta açılır."
      : currentClassTymmAgeBand !== selectedTymmGuide.ageBand
        ? `Çocuk ekranı sınıfın seçili ${currentClassTymmAgeBand ?? "belirsiz"} ay bandında açılır; diğer yaşlar yalnız rehber olarak görüntülenir.`
        : !selectedTymmStudent
          ? "Çocuk ekranı için önce Sınıfım bölümünden bir çocuk ekleyin."
          : "";
  const educationalWriteNotice = configuredClassroom
    ? academicYearOperationalNotice({
        status: configuredClassroom.operationalStatus,
        startDate: configuredClassroom.academicYearStart,
        endDate: configuredClassroom.academicYearEnd,
      })
    : null;
  const educationalWritesDisabled = educationalWriteNotice !== null;
  const preparationPlanningWindow = resolvePreparationPlanningWindow({
    operationalStatus: configuredClassroom?.operationalStatus ?? "ended",
    academicYearStart: configuredClassroom?.academicYearStart ?? "",
    academicYearEnd: configuredClassroom?.academicYearEnd ?? "",
    weeklyPeriodStart: teacherWorkCycle.weekly?.periodStart,
    weeklyPeriodEnd: teacherWorkCycle.weekly?.periodEnd,
  });
  const preparationPlanningAllowed = preparationPlanningWindow.allowed;
  const upcomingPlanningCivilDate =
    teacherWorkCycle.weekly?.relation === "upcoming"
      ? teacherWorkCycle.weekly.periodStart
      : null;
  const basePlanFlowCivilDate =
    preparationPlanningWindow.defaultCivilDate ??
    upcomingPlanningCivilDate ??
    todayWorkspace.civilDate;
  const defaultPlanFlowCivilDate = (planFlowOpen ? manualPlanCivilDate : null) ?? basePlanFlowCivilDate;
  const planFlowTeacherWeek =
    teacherWorkCycle.weekly &&
    defaultPlanFlowCivilDate >= teacherWorkCycle.weekly.periodStart &&
    defaultPlanFlowCivilDate <= teacherWorkCycle.weekly.periodEnd
      ? teacherWorkCycle.weekly
      : null;
  const planWritesDisabled =
    educationalWritesDisabled && !preparationPlanningAllowed;
  // Historical plans keep their provenance for backup compatibility, but no
  // longer require a commercial entitlement to be edited by an admitted user.
  const premiumMutationAllowed = true;
  const assertPremiumMutationAccessNow = (
    targetPack: PremiumPackAccessReference | null =
      premiumFounderAccess?.pack ?? null,
  ) => {
    void targetPack;
  };
  const premiumPackForEvidence = (
    provenance: EvidencePremiumProvenance | undefined,
  ): PremiumPackAccessReference | null | undefined =>
    provenance?.status === "verified"
      ? provenance.pack
      : provenance?.status === "invalid"
        ? null
        : undefined;
  type EducationalWriteGuard = {
    allowPreparationForCivilDate?: string;
  };
  const evidenceMutationGuards = (
    provenance: EvidencePremiumProvenance | undefined,
  ): {
    educationalWrite: EducationalWriteGuard;
    premiumPack?: PremiumPackAccessReference | null;
  } => {
    const premiumPack = premiumPackForEvidence(provenance);
    return {
      educationalWrite: {},
      ...(premiumPack !== undefined ? { premiumPack } : {}),
    };
  };
  const assertEducationalWriteAllowedForContext = (
    classroom: Extract<TodayWorkspace["classroom"], { status: "configured" }> | null,
    guard: EducationalWriteGuard,
    now: Date,
  ) => {
    if (!classroom) {
      throw new Error(
        "Eğitimsel kayıt için etkin ve arşivlenmemiş sınıf bulunmalıdır.",
      );
    }
    const status = academicYearOperationalStatus(
      classroom.academicYearStart,
      classroom.academicYearEnd,
      civilDateInIstanbul(now),
      classroom.academicYearOperationalStart,
    );
    if (status === "active") return;
    const preparationDate = guard.allowPreparationForCivilDate;
    if (
      status === "preparation" &&
      preparationDate !== undefined &&
      preparationDate >= classroom.academicYearStart &&
      preparationDate <= classroom.academicYearEnd
    ) {
      return;
    }
    throw new Error(
      academicYearOperationalNotice({
        status,
        startDate: classroom.academicYearStart,
        endDate: classroom.academicYearEnd,
      }) ?? "Eğitim yılı yeni kayıt için etkin değildir.",
    );
  };
  const assertEducationalWriteAllowedAtCommit = async (
    guard: EducationalWriteGuard,
  ) => {
    const now = new Date();
    const liveClassroom = await store.transaction(
      "readonly",
      ["academicYears", "classrooms", "settings"],
      async (transaction) => {
        const [academicYears, classrooms, settings] = await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("settings"),
        ]);
        const scope = resolveActiveClassroomScope({ academicYears, classrooms, settings });
        if (!scope) return null;
        const academicYear = academicYears.find(
          (record) =>
            record.id === scope.academicYearId &&
            typeof record.deletedAt !== "string",
        );
        if (
          !academicYear ||
          typeof academicYear.startDate !== "string" ||
          typeof academicYear.endDate !== "string"
        ) return null;
        return {
          academicYearStart: academicYear.startDate,
          academicYearEnd: academicYear.endDate,
          academicYearOperationalStart:
            typeof academicYear.operationalStartDate === "string"
              ? academicYear.operationalStartDate
              : academicYear.startDate,
        };
      },
    );
    if (!liveClassroom) {
      throw new Error(
        "Eğitimsel kayıt için etkin ve arşivlenmemiş sınıf bulunmalıdır.",
      );
    }
    const status = academicYearOperationalStatus(
      liveClassroom.academicYearStart,
      liveClassroom.academicYearEnd,
      civilDateInIstanbul(now),
      liveClassroom.academicYearOperationalStart,
    );
    if (status === "active") return;
    const preparationDate = guard.allowPreparationForCivilDate;
    if (
      status === "preparation" &&
      preparationDate !== undefined &&
      preparationDate >= liveClassroom.academicYearStart &&
      preparationDate <= liveClassroom.academicYearEnd
    ) return;
    throw new Error(
      academicYearOperationalNotice({
        status,
        startDate: liveClassroom.academicYearStart,
        endDate: liveClassroom.academicYearEnd,
      }) ?? "Eğitim yılı yeni kayıt için etkin değildir.",
    );
  };
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
  const officialAcademicCalendarApplied =
    classroomForm.academicYearName ===
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.academicYearName &&
    (classroomForm.academicYearStart ===
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate ||
      classroomForm.academicYearStart ===
        configuredClassroom?.academicYearStart) &&
    classroomForm.academicYearEnd ===
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataEndDate;
  const legacyCurriculumTransitionRequired =
    configuredClassroom !== null &&
    configuredClassroom.curriculumProfile?.framework !== "tymm";
  const academicPeriodChanged =
    configuredClassroom !== null &&
    (classroomForm.academicYearName.trim() !==
      configuredClassroom.academicYearName ||
      classroomForm.academicYearStart !==
        configuredClassroom.academicYearStart ||
      classroomForm.academicYearEnd !==
        configuredClassroom.academicYearEnd);
  const academicYearTransitionRequired =
    configuredClassroom !== null &&
    (legacyCurriculumTransitionRequired || academicPeriodChanged);
  const samePeriodCurriculumTransitionRequired =
    legacyCurriculumTransitionRequired && !academicPeriodChanged;
  useEffect(() => {
    if (
      !classroomOpen ||
      configuredClassroom?.operationalStatus !== "ended" ||
      classroomForm.academicYearName !== configuredClassroom.academicYearName ||
      classroomForm.academicYearStart !== configuredClassroom.academicYearStart ||
      classroomForm.academicYearEnd !== configuredClassroom.academicYearEnd
    ) {
      return;
    }

    setClassroomForm((current) => ({
      ...current,
      academicYearName: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.academicYearName,
      academicYearStart: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataStartDate,
      academicYearEnd: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.dataEndDate,
    }));
    setAcademicYearTransitionConfirmed(false);
    setClassroomError("");
  }, [
    classroomForm.academicYearEnd,
    classroomForm.academicYearName,
    classroomForm.academicYearStart,
    classroomOpen,
    configuredClassroom,
  ]);
  const classroomSetupReadinessState = classroomSetupReadiness({
    schoolName: classroomForm.schoolName,
    teacherName: classroomForm.teacherName,
    classroomName: classroomForm.classroomName,
    academicYearName: classroomForm.academicYearName,
    academicYearStart: classroomForm.academicYearStart,
    academicYearEnd: classroomForm.academicYearEnd,
    ageGroup: classroomForm.ageGroup,
    curriculumProgramSupported: isSupportedCurriculumProgram(
      classroomForm.curriculumProgram,
    ),
    curriculumCatalogId: classroomForm.curriculumCatalogId,
    curriculumSourceVersion: classroomForm.curriculumSourceVersion,
    scheduleKind: classroomForm.scheduleKind,
    startTime: classroomForm.startTime,
    endTime: classroomForm.endTime,
  });
  const classroomSetupSubmitHint = dataBusy
    ? "Sınıf bilgileri kaydediliyor."
    : writesBlocked
      ? "Cihaz verileri yazmaya hazır olduğunda kaydetme açılır."
      : !classroomSetupReadinessState.period
        ? "Okul adı, öğretmen adı soyadı, sınıf adı ve eğitim yılı bilgilerini tamamlayın."
        : !classroomSetupReadinessState.program
          ? "36–48, 48–60 veya 60–72 ay yaş bandını seçin."
          : !classroomSetupReadinessState.schedule
            ? "Çalışma düzeni ile geçerli başlangıç ve bitiş saatlerini seçin."
            : academicYearTransitionRequired && !academicYearTransitionConfirmed
              ? "Yeni dönem geçişi özetini okuyup onay kutusunu işaretleyin."
              : "Bütün zorunlu bilgiler tamamlandı; sınıfı kaydedebilirsiniz.";
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
  const selectedScheduledPlans = useMemo(
    () =>
      scheduledPlanWorkspace.plans.filter(
        (plan) => plan.civilDate === calendarSelectedDate,
      ),
    [calendarSelectedDate, scheduledPlanWorkspace.plans],
  );
  const displayedPlanWorkspace = selectedPlanDayWorkspace ?? todayWorkspace;
  const displayedPlanIsToday =
    displayedPlanWorkspace.civilDate === attendanceCivilDate;
  const displayedPlanPrimaryActivity = displayedPlanIsToday
    ? displayedPlanWorkspace.planItems.find(
        (item) =>
          Boolean(item.activityId && item.canCaptureEvidence) &&
          item.status !== "completed",
      ) ??
      displayedPlanWorkspace.planItems.find((item) =>
        Boolean(item.activityId && item.canCaptureEvidence),
      ) ??
      null
    : null;
  const displayedScheduledPlan = scheduledPlanWorkspace.plans.find(
    (plan) => plan.civilDate === displayedPlanWorkspace.civilDate,
  ) ?? null;
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
    (observation) =>
      observation.workflowStatus === "program-bağlantısı-bekliyor",
  ).length;
  const selectedStudentPendingAssessments = selectedStudentObservations.filter(
    (observation) => observation.workflowStatus === "değerlendirme-bekliyor",
  ).length;
  const selectedStudentMonthObservations =
    studentObservationMonth === "all"
      ? selectedStudentObservations
      : selectedStudentObservations.filter(
          (observation) =>
            observation.civilDate.startsWith(studentObservationMonth),
        );
  const visibleSelectedStudentObservations =
    studentObservationFilter === "pending-link"
      ? selectedStudentMonthObservations.filter(
          (observation) =>
            observation.workflowStatus === "program-bağlantısı-bekliyor",
        )
      : studentObservationFilter === "pending-assessment"
        ? selectedStudentMonthObservations.filter(
            (observation) =>
              observation.workflowStatus === "değerlendirme-bekliyor",
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
  const activeSurface: AppSurface | null = tymmChildSession
    ? "tymm-child"
    : evidenceFlowRequest
      ? "evidence-flow"
    : completionRequest
      ? "action-completion"
    : planGuidanceCivilDate
      ? "plan-guidance"
    : planFlowOpen
      ? "plan-flow"
      : teacherPlanRecordsOpen
        ? "teacher-plan-records"
      : premiumPlanOpen
        ? "premium-plans"
        : premiumGateOpen
          ? "premium-gate"
      : studentShareOpen
        ? "student-share"
        : studentDeletionCandidate || studentArchiveCandidate
          ? "student-delete"
      : developmentReportOpen
        ? "development-report"
      : studentProfileOpen
        ? "student-profile"
        : attendanceOpen
          ? "attendance"
          : captureMenuOpen
            ? "capture-menu"
          : tymmGuideOpen
            ? "tymm-guide"
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
  if (completionRequest) lastCompletionRequestRef.current = completionRequest;
  if (planGuidanceCivilDate) lastPlanGuidanceDateRef.current = planGuidanceCivilDate;
  if (evidenceFlowRequest) {
    lastEvidenceFlowRequestRef.current = evidenceFlowRequest;
  }
  if (tymmChildSession) {
    lastTymmChildSessionRef.current = tymmChildSession;
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
      educationalWrite?: EducationalWriteGuard;
      premiumPack?: PremiumPackAccessReference | null;
      /** İşlem kendi atomik transaction'ında etkin sınıf ve dönem sınırını doğruluyorsa yinelenen kasa okumasını atlar. */
      atomicEducationalWrite?: boolean;
      /** Sık taslak yazımlarında kök ekranı yeniden çizmeden kuyruğu ve hatayı korur. */
      background?: boolean;
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

    try {
      if (options.educationalWrite) {
        assertEducationalWriteAllowedForContext(
          configuredClassroom,
          options.educationalWrite,
          new Date(),
        );
      }
      if (options.premiumPack !== undefined) {
        assertPremiumMutationAccessNow(options.premiumPack);
      }
    } catch (reason) {
      return Promise.reject(reason);
    }

    pendingWriteCountRef.current += 1;
    if (!options.background) {
      applyPersistenceState({
        phase: "pending",
        detail: "Değişiklikler bu cihaza kaydediliyor.",
        pendingWrites: pendingWriteCountRef.current,
        ...(persistenceStateRef.current.lastCommittedAt
          ? { lastCommittedAt: persistenceStateRef.current.lastCommittedAt }
          : {}),
      });
    }

    const queued = persistenceQueueRef.current.then(async () => {
      if (!persistenceReadyRef.current) {
        throw new PersistenceUnavailableError(
          "Önceki yazma işlemi başarısız olduğu için yeni değişiklik uygulanmadı.",
        );
      }
      if (options.educationalWrite && !options.atomicEducationalWrite) {
        await assertEducationalWriteAllowedAtCommit(options.educationalWrite);
      }
      if (options.premiumPack !== undefined) {
        assertPremiumMutationAccessNow(options.premiumPack);
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
        if (!options.background) {
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
        }
        if (options.educationalWrite && !options.background) {
          afterInteractivePaint(() => {
            const civilDate = civilDateInIstanbul(new Date());
            void store.readSnapshot()
              .then(async (snapshot) => {
                const workspace = resolveTeacherDayClosureWorkspace(snapshot, civilDate);
                const week = await resolveTeacherWeekWorkspaceLazy(snapshot, { civilDate });
                setDayClosureWorkspace(workspace);
                setTeacherWeekWorkspace(week);
              })
              .catch(() => {
                // Ana yazma zaten commit edildi; özet yenileme hatası commit sonucunu tersine çeviremez.
              });
          });
        }
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

  const prepareSpontaneousObservationContext = (
    student: Student,
    civilDate: string,
  ) => {
    const key = `${student.id}\u0000${civilDate}`;
    const cached = spontaneousContextWarmupRef.current;
    if (cached?.key === key) return cached.promise;
    const promise = enqueuePersistence(
      () =>
        ensureSpontaneousObservationContext(store, {
          studentId: student.id,
          civilDate,
      }),
      {
        educationalWrite: {},
        atomicEducationalWrite: true,
        background: true,
        failureDetail:
          "Anlık gözlem bağlamı kaydedilemedi. Yeni yazmalar durduruldu.",
        successDetail: `${student.name} için anlık gözlem alanı hazırlandı.`,
      },
    );
    spontaneousContextWarmupRef.current = { key, promise };
    void promise.catch(() => {
      if (spontaneousContextWarmupRef.current?.promise === promise) {
        spontaneousContextWarmupRef.current = null;
      }
    });
    return promise;
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
    const now = new Date();
    const civilDate = civilDateInIstanbul(now);
    // Tek bir şifreli snapshot, bütün D1 görünümlerinin aynı atomik kesitten
    // üretilmesini sağlar. Yedi paralel readSnapshot çağrısı WebKit'te kasa
    // doğrulamalarını çoğaltıp öğretmenin kesin kaydını shared lock arkasında
    // bekletiyordu.
    const snapshot = await store.readSnapshot();
    const today = resolveTodayWorkspace(snapshot, now);
    const evidence = resolveEvidenceWorkspace(snapshot, now);
    const calendar = resolveAcademicCalendar(snapshot);
    const scheduledPlans = resolveScheduledPlanWorkspace(snapshot, { now });
    const cycle = resolveTeacherWorkCycle(snapshot, { civilDate });
    const week = await resolveTeacherWeekWorkspaceLazy(snapshot, { civilDate });
    const dayClosure = resolveTeacherDayClosureWorkspace(snapshot, civilDate);
    setTodayWorkspace(today);
    setEvidenceWorkspace(evidence);
    setAcademicCalendar(calendar);
    setScheduledPlanWorkspace(scheduledPlans);
    setTeacherWorkCycle(cycle);
    setTeacherWeekWorkspace(week);
    setDayClosureWorkspace(dayClosure);
    return { today, evidence, calendar, scheduledPlans, cycle, week, dayClosure };
  };

  const refreshAnecdoteDocuments = useCallback(async () => {
    const { loadAnecdoteFormWorkspace } = await import(
      "./features/anecdote/anecdote-form.ts"
    );
    const workspace = await loadAnecdoteFormWorkspace(store);
    setAnecdoteWorkspace(workspace);
    return workspace;
  }, [store]);

  useEffect(() => {
    if (studentAddOpen || classExportPreviewOpen) {
      setClassroomToolsMounted(true);
    }
  }, [classExportPreviewOpen, studentAddOpen]);

  useEffect(() => {
    if (!studentProfileOpen || !pendingProfileFocusId) return undefined;
    // The encrypted profile workspace can mount after the sheet animation.
    // Observe its actual arrival rather than guessing a fixed number of frames.
    let frame = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      document.removeEventListener("pointerdown", cancel, true);
      document.removeEventListener("keydown", cancel, true);
    };
    const cancel = () => { stop(); setPendingProfileFocusId(null); };
    const restore = () => {
      if (stopped) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const target = Array.from(studentProfileSheetRef.current?.querySelectorAll<HTMLElement>("[data-student-development-trigger]") ?? [])
          .find(element => element.dataset.studentDevelopmentTrigger === pendingProfileFocusId);
        if (!target || target.matches(":disabled") || target.closest("[inert], [aria-hidden='true']") || !target.getClientRects().length) return;
        target.focus({ preventScroll: true });
        if (document.activeElement === target) cancel();
      });
    };
    const observer = new MutationObserver(restore);
    const deadline = window.setTimeout(cancel, 15000);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "inert", "aria-hidden", "data-state"] });
    document.addEventListener("pointerdown", cancel, true);
    document.addEventListener("keydown", cancel, true);
    restore();
    return stop;
  }, [studentProfileOpen, pendingProfileFocusId]);

  useEffect(() => {
    const selector = d1ReturnFocusSelectorRef.current;
    if (!captureMenuOpen || evidenceFlowRequest || !selector) return undefined;
    let focusFrame = 0;
    const renderFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(selector);
        if (!target) return;
        target.focus();
        d1ReturnFocusSelectorRef.current = null;
        d1ReturnFocusRef.current = null;
      });
    });
    return () => {
      window.cancelAnimationFrame(renderFrame);
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
    };
  }, [captureMenuOpen, evidenceFlowRequest]);

  useEffect(() => {
    if (premiumLegacyRequested && premiumGateOpen) {
      setPremiumGateMounted(true);
    }
  }, [premiumGateOpen, premiumLegacyRequested]);

  useEffect(() => {
    if (persistenceState.phase !== "ready") return undefined;
    let cancelled = false;
    void import("./features/anecdote/anecdote-form.ts")
      .then(({ loadAnecdoteFormWorkspace }) => loadAnecdoteFormWorkspace(store))
      .then((workspace) => {
        if (!cancelled) setAnecdoteWorkspace(workspace);
      })
      .catch(() => {
        if (!cancelled) {
          setAnnouncement(
            "Anekdot formları okunamadı; cihazdaki kayıtlar değiştirilmedi.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentsOpen, persistenceState.phase, store]);

  useEffect(() => {
    if (import.meta.env.MODE !== "founder-production") return undefined;
    let cancelled = false;
    void import("./features/premium-access/founder-client.ts")
      .then(({ premiumFounderConfigurationFromEnvironment }) => {
        if (cancelled) return;
        const configuration = premiumFounderConfigurationFromEnvironment();
        setPremiumFounderConfigurationState({
          configuration,
          error: "",
          ready: true,
        });
        if (!configuration) setPremiumFounderBusy(false);
      })
      .catch(() => {
        if (cancelled) return;
        const message =
          "Kurucu Premium yapılandırması geçersiz. Ücretli premium erişimi etkilenmedi.";
        setPremiumFounderConfigurationState({
          configuration: null,
          error: message,
          ready: true,
        });
        setPremiumFounderError(message);
        setPremiumFounderBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [premiumLegacyRequested]);

  useEffect(() => {
    if (!premiumLegacyRequested) return undefined;
    if (!premiumFounderConfigurationState.ready) return undefined;
    const configuration = premiumFounderConfigurationState.configuration;
    if (!configuration) return undefined;
    let cancelled = false;
    setPremiumFounderBusy(true);
    setPremiumFounderErrorPresentation(null);
    void import("./features/premium-access/founder-client.ts")
      .then(({ loadStoredPremiumFounderAccess }) =>
        loadStoredPremiumFounderAccess({ configuration }),
      )
      .then((result) => {
        if (cancelled) return;
        setPremiumFounderAccess(result);
        setPremiumFounderError("");
        setPremiumFounderErrorPresentation(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        void import("./features/premium-access/founder-client.ts").then(
          ({ premiumFounderActivationErrorPresentation }) => {
            if (cancelled) return;
            const presentation = premiumFounderActivationErrorPresentation(error);
            setPremiumFounderError(presentation.message);
            setPremiumFounderErrorPresentation(presentation);
          },
        );
      })
      .finally(() => {
        if (!cancelled) setPremiumFounderBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    premiumFounderConfigurationState.configuration,
    premiumFounderConfigurationState.ready,
    premiumLegacyRequested,
  ]);

  useEffect(() => {
    // React StrictMode mounts effects twice in development. Defer the physical
    // connection close by one task so the immediate remount can retain the
    // same store; a real unmount still closes both IndexedDB connections.
    if (storeCloseTimerRef.current !== null) {
      window.clearTimeout(storeCloseTimerRef.current);
      storeCloseTimerRef.current = null;
    }
    let cancelled = false;
    setLocalVaultRecoveryRequired(false);
    persistenceReadyRef.current = false;
    pendingWriteCountRef.current = 0;
    applyPersistenceState({
      phase: "hydrating",
      detail: "Sınıf, plan ve taslaklar güvenle açılıyor.",
      pendingWrites: 0,
    });
    setDataStatus("Sınıf, plan ve taslaklar güvenle açılıyor.");
    const hydrateFromOneSnapshot = async () => {
      const state = await runHydrationStep(
        "dashboard",
        loadDashboardState(store, fallbackDashboardState).catch(async (error) => {
          console.warn(
            "[MaarifOS Self-Healing] Dashboard hydration error encountered, initiating autonomous recovery:",
            error,
          );
          try {
            const snapshot = await store.readSnapshot();
            const currentCivilDate = isCivilDate(fallbackDashboardState.attendanceCivilDate)
              ? fallbackDashboardState.attendanceCivilDate
              : civilDateInIstanbul(new Date());
            return dashboardStateFromSnapshot(snapshot, currentCivilDate);
          } catch (recoveryError) {
            console.warn(
              "[MaarifOS Self-Healing] Snapshot recovery failed, falling back to safe defaults:",
              recoveryError,
            );
            return fallbackDashboardState;
          }
        }),
      );
      try {
        await migrateLegacyAcademicYearOperationalStart(store);
      } catch (error) {
        console.warn(
          "[MaarifOS Self-Healing] Academic year operational migration skipped:",
          error,
        );
      }
      // A single verified snapshot feeds every read model. Decrypting the same
      // annual plan for each workspace made WebKit reloads stall repeatedly.
      const snapshot = await runHydrationStep("dashboard", store.readSnapshot());
      const now = new Date();
      const civilDate = state.attendanceCivilDate;
      const resolved = await Promise.all([
        runHydrationStep(
          "today",
          Promise.resolve().then(() => resolveTodayWorkspace(snapshot, now)).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Today workspace hydration fallback:", error);
            return emptyTodayWorkspace;
          }),
        ),
        runHydrationStep(
          "evidence",
          Promise.resolve().then(() => resolveEvidenceWorkspace(snapshot, now)).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Evidence workspace hydration fallback:", error);
            return emptyEvidenceWorkspace;
          }),
        ),
        runHydrationStep(
          "calendar",
          Promise.resolve().then(() => resolveAcademicCalendar(snapshot)).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Calendar workspace hydration fallback:", error);
            return emptyAcademicCalendar;
          }),
        ),
        runHydrationStep(
          "scheduled-plans",
          Promise.resolve().then(() => resolveScheduledPlanWorkspace(snapshot)).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Scheduled plans hydration fallback:", error);
            return emptyScheduledPlanWorkspace;
          }),
        ),
        runHydrationStep(
          "teacher-cycle",
          Promise.resolve().then(() => resolveTeacherWorkCycle(snapshot, { civilDate })).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Teacher cycle hydration fallback:", error);
            return emptyTeacherWorkCycle(civilDate);
          }),
        ),
        runHydrationStep(
          "teacher-week",
          resolveTeacherWeekWorkspaceLazy(snapshot, { civilDate }).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Teacher week hydration fallback:", error);
            return emptyTeacherWeekState(civilDate);
          }),
        ),
        runHydrationStep(
          "day-closure",
          Promise.resolve().then(() => resolveTeacherDayClosureWorkspace(snapshot, civilDate)).catch((error) => {
            console.warn("[MaarifOS Self-Healing] Day closure hydration fallback:", error);
            return emptyTeacherDayClosureWorkspace(civilDate);
          }),
        ),
        runHydrationStep("app-lock", loadAppLockSetting(store)),
        getBackupService()
          .then((service) => service.listRecoverySnapshots())
          .then(
            (snapshots) => ({ snapshots, warning: "" }),
            () => ({
              snapshots: [] as RecoverySnapshotMetadata[],
              warning:
                "Önceki cihaz-içi kurtarma noktaları doğrulanamadı. Ana öğretmen kayıtları açıldı; kurtarma noktaları silinmedi ve geri yükleme için inceleme gerekiyor.",
            }),
          ),
      ]);
      return [state, ...resolved] as const;
    };
    void hydrateFromOneSnapshot()
      .then(([state, workspace, evidence, calendar, scheduledPlans, cycle, week, dayClosure, lockSetting, recovery]) => {
        if (cancelled) return;
        setStudents(state.students);
        setArchivedStudents(state.archivedStudents);
        setAttendanceCompleted(state.attendanceCompleted);
        setAttendanceCivilDate(state.attendanceCivilDate);
        setTodayWorkspace(workspace);
        setEvidenceWorkspace(evidence);
        setAcademicCalendar(calendar);
        setScheduledPlanWorkspace(scheduledPlans);
        setTeacherWorkCycle(cycle);
        setTeacherWeekWorkspace(week);
        setDayClosureWorkspace(dayClosure);
        setRecoverySnapshots(recovery.snapshots);
        setRecoverySnapshotWarning(recovery.warning);
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
          const legacyCurriculumProfile =
            classroom.curriculumProfile?.framework !== "tymm";
          const tymmStarterProfile = OFFICIAL_STARTER_CATALOG_PROFILES.tymm;
          setClassroomForm((current) => ({
            ...current,
            schoolName: classroom.schoolName ?? "",
            teacherName: classroom.teacherName ?? "",
            classroomName: classroom.classroomName,
            academicYearName: classroom.academicYearName,
            academicYearStart: classroom.academicYearStart,
            academicYearEnd: classroom.academicYearEnd,
            ageGroup: classroom.ageGroup ?? "",
            curriculumProgram: CURRICULUM_PROGRAM_LABELS.tymm,
            curriculumCatalogLabel: legacyCurriculumProfile
              ? `${tymmStarterProfile.catalogId} · ${tymmStarterProfile.sourceVersion}`
              : classroom.curriculumCatalogLabel ?? current.curriculumCatalogLabel,
            curriculumCatalogId: legacyCurriculumProfile
              ? tymmStarterProfile.catalogId
              : classroom.curriculumProfile?.catalogId ?? "",
            curriculumSourceVersion: legacyCurriculumProfile
              ? tymmStarterProfile.sourceVersion
              : classroom.curriculumProfile?.sourceVersion ?? "",
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
          acknowledgeCurrentRelease();
          setReleaseNotesOpen(false);
          setAnnouncement(
            `MaarifOS ${CURRENT_RELEASE.version} sade Maarif Modeli sürümü kullanıma hazır.`,
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
      .catch((reason: unknown) => {
        if (cancelled) return;
        const diagnostic = describeHydrationFailure(reason);
        if (import.meta.env.DEV) {
          console.warn("[MaarifOS hydration]", {
            step: diagnostic.step,
            kind: diagnostic.kind,
            supportCode: diagnostic.supportCode,
          });
        }
        setLocalVaultRecoveryRequired(diagnostic.recoveryRequired);
        markPersistenceFailure(diagnostic.detail);
        setAnnouncement(
          `Cihaz verileri açılamadı. Destek kodu: ${diagnostic.supportCode}.`,
        );
      });
    return () => {
      cancelled = true;
      storeCloseTimerRef.current = window.setTimeout(() => {
        storeCloseTimerRef.current = null;
        store.close();
      }, 0);
    };
  }, [
    applyPersistenceState,
    hydrationAttempt,
    markPersistenceFailure,
    getBackupService,
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
        const [refreshed, refreshedWorkspace, refreshedEvidence, refreshedCycle, refreshedWeek, refreshedDayClosure] = await Promise.all([
          loadDashboardState(store, {
            ...fallbackDashboardState,
            attendanceCivilDate: currentCivilDate,
          }).catch(async (error) => {
            console.warn("[MaarifOS Self-Healing] Day refresh dashboard error, recovering from snapshot:", error);
            const snapshot = await store.readSnapshot();
            return dashboardStateFromSnapshot(snapshot, currentCivilDate);
          }),
          loadTodayWorkspace(store, { now: new Date() }).catch(() => emptyTodayWorkspace),
          loadEvidenceWorkspace(store, { now: new Date() }).catch(() => emptyEvidenceWorkspace),
          loadTeacherWorkCycle(store, { civilDate: currentCivilDate }).catch(() => emptyTeacherWorkCycle(currentCivilDate)),
          loadTeacherWeekWorkspaceLazy(store, { civilDate: currentCivilDate }).catch(() => emptyTeacherWeekState(currentCivilDate)),
          loadTeacherDayClosureWorkspace(store, { civilDate: currentCivilDate }).catch(() => emptyTeacherDayClosureWorkspace(currentCivilDate)),
        ]);
        if (cancelled) return;
        setStudents(refreshed.students);
        setArchivedStudents(refreshed.archivedStudents);
        setAttendanceCompleted(refreshed.attendanceCompleted);
        setAttendanceCivilDate(refreshed.attendanceCivilDate);
        setTodayWorkspace(refreshedWorkspace);
        setEvidenceWorkspace(refreshedEvidence);
        setTeacherWorkCycle(refreshedCycle);
        setTeacherWeekWorkspace(refreshedWeek);
        setDayClosureWorkspace(refreshedDayClosure);
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
      setPwaStatus(status);
      setOfflineReadiness(
        status.offlineReady
          ? "ready"
          : status.phase === "error"
             ? "unavailable"
             : "checking",
      );
      setUpdateReady(status.phase === "update-ready");
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
      const status = (
        window as Window & { __maarifosPwaStatus?: PwaRuntimeStatus }
      ).__maarifosPwaStatus;
      if (status) setPwaStatus(status);
      setUpdateReady(true);
      setAnnouncement(
        "Yeni MaarifOS sürümü hazır. Kaydınızı tamamladıktan sonra güncelleyebilirsiniz.",
      );
    };

    window.addEventListener(PWA_UPDATE_READY_EVENT, announceReadyUpdate);
    return () =>
      window.removeEventListener(PWA_UPDATE_READY_EVENT, announceReadyUpdate);
  }, []);

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
    const storedBackupHealth = readBackupHealthReceipt(window.localStorage);
    setLastSuccessfulBackupAt(
      storedBackupHealth?.createdAt ?? storedBackup.lastSuccessfulAt,
    );
    setBackupHealthReceipt(storedBackupHealth);
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
      const backupService = await getBackupService();
      const envelope = await backupService.exportEncryptedBackup(passphrase);
      const serialized = backupService.serializeEncryptedBackup(envelope);
      const verifiedBackup = await backupService.parseAndDecryptBackup(
        serialized,
        passphrase,
      );
      const civilDate = envelope.encryption.createdAt.slice(0, 10);
      const fileName = `${prefix}-${civilDate}.maarifos`;
      downloadJson(fileName, serialized);
      recordSuccessfulEncryptedBackup(
        window.localStorage,
        new Date(envelope.encryption.createdAt),
      );
      const receipt = recordEncryptedBackupHealth(window.localStorage, {
        fileName,
        encryptedChecksum: await sha256Hex(serialized),
        encryptedByteLength: new TextEncoder().encode(serialized).byteLength,
        payloadChecksum: verifiedBackup.manifest.payloadChecksum,
        dataSchemaVersion: verifiedBackup.manifest.dataSchemaVersion,
        appVersion: verifiedBackup.manifest.appVersion,
        createdAt: envelope.encryption.createdAt,
        verifiedAt: new Date().toISOString(),
      });
      setBackupHealthReceipt(receipt);
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

  const closeAndDeleteLocalVault = async () => {
    backupServicePromiseRef.current = null;
    await store.cryptographicallyEraseAllData();
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
      throw new Error("Eski cihaz verisi kalıcı alandan kaldırılamadı.");
    }
  };

  const focusVaultRecoveryFileButton = () => {
    window.requestAnimationFrame(() => {
      vaultRecoveryFileButtonRef.current?.focus({ preventScroll: true });
    });
  };

  const clearVaultRecoveryFileFocusListener = () => {
    const listener = vaultRecoveryFileFocusListenerRef.current;
    if (!listener) return;
    window.removeEventListener("focus", listener);
    vaultRecoveryFileFocusListenerRef.current = null;
  };

  const openVaultRecoveryFilePicker = () => {
    if (vaultRecoveryBusy) return;
    const input = vaultRecoveryFileRef.current;
    if (!input) {
      focusVaultRecoveryFileButton();
      return;
    }
    clearVaultRecoveryFileFocusListener();
    const restoreFocus = () => {
      clearVaultRecoveryFileFocusListener();
      window.setTimeout(focusVaultRecoveryFileButton, 0);
    };
    vaultRecoveryFileFocusListenerRef.current = restoreFocus;
    window.addEventListener("focus", restoreFocus, { once: true });
    try {
      input.click();
    } catch {
      clearVaultRecoveryFileFocusListener();
      focusVaultRecoveryFileButton();
    }
  };

  const wipeAllLocalData = async () => {
    if (wipeConfirmation !== "TÜM VERİLERİ SİL" || dataBusy) return;
    setDataBusy(true);
    setSecureBackupError("");
    try {
      await flushPendingWrites();
      markPersistenceFailure(
        "Cihaz verileri kalıcı silme için kapatıldı. İşlem tamamlanana kadar yeni kayıt yapılamaz.",
      );
      await closeAndDeleteLocalVault();
      setWipeConfirmation("");
      setAnnouncement(
        "Ana veritabanı ve şifreleme anahtarı kalıcı olarak silindi.",
      );
      window.location.reload();
    } catch {
      markPersistenceFailure(
        "Cihaz verilerinin tamamı silinemedi. Yeni kayıtlar güvenlik için durduruldu; diğer MaarifOS sekmelerini kapatıp yeniden deneyin.",
      );
      setSecureBackupError(
        "Cihaz kasası kalıcı olarak silinemedi. Diğer MaarifOS sekmelerini kapatıp yeniden deneyin.",
      );
      setDataBusy(false);
    }
  };

  const inspectVaultRecoveryFile = async (file: File | undefined) => {
    if (!file || !localVaultRecoveryRequired || vaultRecoveryBusy) return;
    setVaultRecoveryBusy(true);
    setVaultRecoveryBackup(null);
    setVaultRecoveryPassword("");
    setVaultRecoveryConfirmation("");
    setVaultRecoveryError("");
    try {
      if (file.size > MAX_ENCRYPTED_BACKUP_BYTES) {
        throw new Error("RECOVERY_FILE_TOO_LARGE");
      }
      const source = await file.text();
      let candidate: unknown;
      try {
        candidate = JSON.parse(source);
      } catch {
        throw new Error("RECOVERY_FILE_INVALID");
      }
      if (!isEncryptedBackupEnvelope(candidate)) {
        throw new Error("RECOVERY_FILE_NOT_ENCRYPTED");
      }
      setVaultRecoveryBackup({
        fileName: file.name,
        source,
        receipt: null,
      });
      setAnnouncement("Şifreli kurtarma dosyası seçildi; parola bekleniyor.");
    } catch {
      setVaultRecoveryError(
        `Yalnız en fazla ${MAX_ENCRYPTED_BACKUP_BYTES / 1024 / 1024} MiB boyutunda, parola korumalı .maarifos yedeği kullanılabilir.`,
      );
    } finally {
      setVaultRecoveryBusy(false);
      clearVaultRecoveryFileFocusListener();
      if (vaultRecoveryFileRef.current) {
        vaultRecoveryFileRef.current.value = "";
      }
      focusVaultRecoveryFileButton();
    }
  };

  const unlockVaultRecoveryBackup = async () => {
    if (
      !vaultRecoveryBackup ||
      vaultRecoveryBackup.receipt ||
      vaultRecoveryPassword.length < 10 ||
      vaultRecoveryBusy
    ) {
      return;
    }
    const recovery = vaultRecoveryBackup;
    const passphrase = vaultRecoveryPassword;
    setVaultRecoveryPassword("");
    setVaultRecoveryBusy(true);
    setVaultRecoveryError("");
    try {
      const backupService = await getBackupService();
      const envelope = await backupService.parseAndDecryptBackup(
        recovery.source,
        passphrase,
      );
      const encryptedSourceChecksum = await sha256Hex(recovery.source);
      setVaultRecoveryBackup((current) =>
        current && current.source === recovery.source
          ? {
              ...current,
              receipt: {
                encryptedSourceChecksum,
                payloadChecksum: envelope.manifest.payloadChecksum,
                entityCounts: structuredClone(envelope.manifest.entityCounts),
              },
            }
          : null,
      );
      setAnnouncement(
        "Şifreli yedek doğrulandı; parola tekrarı ve açık onay bekleniyor.",
      );
    } catch {
      setVaultRecoveryError(
        "Yedek açılamadı. Dosyanın değişmediğini ve parolanın doğru olduğunu kontrol edin.",
      );
    } finally {
      setVaultRecoveryBusy(false);
    }
  };

  const restoreVaultFromEncryptedBackup = async () => {
    if (
      !localVaultRecoveryRequired ||
      !vaultRecoveryBackup?.receipt ||
      vaultRecoveryPassword.length < 10 ||
      vaultRecoveryConfirmation !== "KASAYI GERİ YÜKLE" ||
      vaultRecoveryBusy
    ) {
      return;
    }
    const recovery = vaultRecoveryBackup;
    const receipt = vaultRecoveryBackup.receipt;
    const passphrase = vaultRecoveryPassword;
    setVaultRecoveryPassword("");
    setVaultRecoveryConfirmation("");
    setVaultRecoveryBusy(true);
    setVaultRecoveryError("");
    try {
      const verificationService = await getBackupService();
      const verified = await verificationService.parseAndDecryptBackup(
        recovery.source,
        passphrase,
      );
      if (
        (await sha256Hex(recovery.source)) !==
          receipt.encryptedSourceChecksum ||
        verified.manifest.payloadChecksum !== receipt.payloadChecksum ||
        canonicalJson(verified.manifest.entityCounts) !==
          canonicalJson(receipt.entityCounts)
      ) {
        throw new Error("RECOVERY_REVERIFY_FAILED");
      }

      await closeAndDeleteLocalVault();
      const restoreService = await getBackupService();
      await restoreService.restoreEncryptedBackup(recovery.source, passphrase, {
        mode: "replace",
        createRecoverySnapshot: false,
      });
      const restoredSnapshot = await store.readSnapshot();
      for (const [collectionName, expectedCount] of Object.entries(
        verified.manifest.entityCounts,
      )) {
        const collection =
          restoredSnapshot[collectionName as keyof typeof restoredSnapshot];
        if (!Array.isArray(collection) || collection.length !== expectedCount) {
          throw new Error("RECOVERY_COUNT_MISMATCH");
        }
      }
      recordSuccessfulRestoreDrill(window.localStorage, {
        sourceChecksum: await sha256Hex(recovery.source),
        restoredAt: new Date(),
        mode: "replace",
      });
      setAnnouncement(
        "Yerel kasa yeniden oluşturuldu ve şifreli yedek yerine yüklendi.",
      );
      window.location.reload();
    } catch {
      markPersistenceFailure(
        "Yerel kasa kurtarma tamamlanamadı. Yeni kayıtlar durdurulmaya devam ediyor.",
      );
      setLocalVaultRecoveryRequired(true);
      setVaultRecoveryError(
        "Kurtarma tamamlanamadı. Aynı şifreli yedeği ve parolayı yeniden doğrulayın; diğer MaarifOS sekmeleri açıksa kapatın.",
      );
      setVaultRecoveryBusy(false);
    }
  };

  const resetVaultWithoutBackup = async () => {
    if (
      !localVaultRecoveryRequired ||
      vaultResetConfirmation !== "BU CİHAZI SIFIRLA" ||
      vaultRecoveryBusy
    ) {
      return;
    }
    setVaultRecoveryBusy(true);
    setVaultRecoveryError("");
    try {
      await closeAndDeleteLocalVault();
      setAnnouncement(
        "Erişilemeyen yerel kasa ve anahtarı silindi; boş cihaz kurulumu açılıyor.",
      );
      window.location.reload();
    } catch {
      markPersistenceFailure(
        "Cihaz sıfırlanamadı. Yeni kayıtlar güvenlik için durdurulmaya devam ediyor.",
      );
      setLocalVaultRecoveryRequired(true);
      setVaultRecoveryError(
        "Cihaz sıfırlanamadı. Diğer MaarifOS sekmelerini kapatıp yeniden deneyin.",
      );
      setVaultRecoveryBusy(false);
    }
  };

  const inspectRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    setDataBusy(true);
    setPendingRestore(null);
    setRestorePassword("");
    setSecureBackupError("");
    try {
      if (file.size > MAX_ENCRYPTED_BACKUP_BYTES) {
        throw new Error(`Yedek dosyası ${MAX_ENCRYPTED_BACKUP_BYTES / 1024 / 1024} MiB sınırını aşıyor.`);
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
        const backupService = await getBackupService();
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
      const backupService = await getBackupService();
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
      const backupService = await getBackupService();
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
        restoredScheduledPlans,
        restoredCycle,
        restoredWeek,
        restoredDayClosure,
        restoredLockSetting,
        snapshots,
      ] = await Promise.all([
        loadDashboardState(store, fallbackDashboardState),
        loadTodayWorkspace(store),
        loadEvidenceWorkspace(store),
        loadAcademicCalendar(store),
        loadScheduledPlanWorkspace(store),
        loadTeacherWorkCycle(store, {
          civilDate: civilDateInIstanbul(new Date()),
        }),
        loadTeacherWeekWorkspaceLazy(store, {
          civilDate: civilDateInIstanbul(new Date()),
        }),
        loadTeacherDayClosureWorkspace(store, {
          civilDate: civilDateInIstanbul(new Date()),
        }),
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
      setScheduledPlanWorkspace(restoredScheduledPlans);
      setTeacherWorkCycle(restoredCycle);
      setTeacherWeekWorkspace(restoredWeek);
      setDayClosureWorkspace(restoredDayClosure);
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
        const legacyCurriculumProfile =
          classroom.curriculumProfile?.framework !== "tymm";
        const tymmStarterProfile = OFFICIAL_STARTER_CATALOG_PROFILES.tymm;
        setClassroomForm((current) => ({
          ...current,
          schoolName: classroom.schoolName ?? "",
          teacherName: classroom.teacherName ?? "",
          classroomName: classroom.classroomName,
          academicYearName: classroom.academicYearName,
          academicYearStart: classroom.academicYearStart,
          academicYearEnd: classroom.academicYearEnd,
          ageGroup: classroom.ageGroup ?? "",
          curriculumProgram: CURRICULUM_PROGRAM_LABELS.tymm,
          curriculumCatalogLabel: legacyCurriculumProfile
            ? `${tymmStarterProfile.catalogId} · ${tymmStarterProfile.sourceVersion}`
            : classroom.curriculumCatalogLabel ?? current.curriculumCatalogLabel,
          curriculumCatalogId: legacyCurriculumProfile
            ? tymmStarterProfile.catalogId
            : classroom.curriculumProfile?.catalogId ?? "",
          curriculumSourceVersion: legacyCurriculumProfile
            ? tymmStarterProfile.sourceVersion
            : classroom.curriculumProfile?.sourceVersion ?? "",
          scheduleKind: classroom.schedule.kind,
          startTime: classroom.schedule.startTime,
          endTime: classroom.schedule.endTime,
        }));
      }
      if (restoreRequest.encryption === "encrypted") {
        const updatedReceipt = recordSuccessfulRestoreDrill(
          window.localStorage,
          {
            sourceChecksum: await sha256Hex(restoreRequest.source),
            restoredAt: new Date(),
            mode,
          },
        );
        if (updatedReceipt) setBackupHealthReceipt(updatedReceipt);
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

  const updateStudentStatus = (
    studentId: string,
    directStatus?: AttendanceStatus,
  ) => {
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
    const status = directStatus
      ? directStatus
      : student.attendanceMarked === false
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
        educationalWrite: {},
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
          educationalWrite: {},
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
          educationalWrite: {},
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
          educationalWrite: {},
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

  const addStudent = async (
    guardianRelationshipInput: string,
    guardianKind: StudentContact["kind"],
  ): Promise<boolean> => {
    if (configuredClassroom?.operationalStatus === "ended") {
      const message =
        "Bu eğitim yılı sona erdi. Çocuk listesini değiştirmek için yeni dönemi hazırlayın.";
      setNewStudentError(message);
      setAnnouncement(message);
      return false;
    }
    const name = newStudentName.trim();
    if (!name) return false;
    const nameParts = splitStudentDisplayName(name);
    if (!nameParts.lastName) {
      setNewStudentError("Ad ve soyadı yazın.");
      return false;
    }
    const optionalCode = newStudentNumber.trim();
    const birthDate = newStudentBirthDate.trim();
    if (
      birthDate &&
      (!isCivilDate(birthDate) || birthDate > attendanceCivilDate)
    ) {
      setNewStudentError("Doğum tarihi geçersiz.");
      return false;
    }
    const nationalIdentityNumber = newStudentNationalIdentityNumber.trim();
    if (
      nationalIdentityNumber &&
      !isValidStudentNationalIdentityNumber(nationalIdentityNumber)
    ) {
      setNewStudentError("T.C. kimlik geçerli değil.");
      return false;
    }
    const guardianName = newStudentGuardianName.trim();
    const guardianPhone = newStudentGuardianPhone.trim();
    const homeAddress = newStudentHomeAddress.trim();
    if (homeAddress.length > 500) {
      setNewStudentError("Birleşik adres 500 karakteri geçemez. Adres alanlarını kısaltın.");
      return false;
    }
    let normalizedGuardianPhone = "";
    if (guardianPhone) {
      try {
        normalizedGuardianPhone = normalizeStudentPhone(guardianPhone);
      } catch (reason) {
        setNewStudentError(
          reason instanceof Error
            ? reason.message
            : "Veli telefonu geçersiz.",
        );
        return false;
      }
    }
    const student: Student = {
      id: crypto.randomUUID(),
      name: composeStudentDisplayName(nameParts.firstName, nameParts.lastName),
      firstName: nameParts.firstName,
      ...(nameParts.lastName ? { lastName: nameParts.lastName } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(optionalCode ? { optionalCode } : {}),
      ...(nationalIdentityNumber ? { nationalIdentityNumber } : {}),
      ...(homeAddress ? { careDetails: { homeAddress, ...(newStudentHomeAddressParts ? { homeAddressParts: newStudentHomeAddressParts } : {}) } } : {}),
      ...(guardianName || normalizedGuardianPhone
        ? {
            contacts: [
              {
                id: crypto.randomUUID(),
                kind: guardianKind,
                relationship: guardianRelationshipInput,
                ...(guardianName ? { name: guardianName } : {}),
                phone: normalizedGuardianPhone,
                isPrimary: Boolean(normalizedGuardianPhone),
                isEmergencyContact: Boolean(normalizedGuardianPhone),
              },
            ],
          }
        : {}),
      status: "present",
      attendanceMarked: false,
    };
    setNewStudentError("");
    setDataBusy(true);
    try {
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: false }));
      setStudents((current) => [...current, student]);
      if (
        configuredClassroom?.curriculumProfile?.framework === "tymm" &&
        !writesBlocked &&
        !educationalWriteNotice
      ) {
        // İlk gözlem tıklamasını altı koleksiyonlu şifreli kurulumla
        // bekletmemek için bağlamı çocuk ekleme işleminin bekleme ekranında
        // hazırla. Çocuk kaydı zaten commit edildiğinden hazırlık hatası çocuk
        // kaydını başarısız göstermemeli; Gözlem akışı güvenle yeniden dener.
        await prepareSpontaneousObservationContext(
          student,
          civilDateInIstanbul(new Date()),
        ).catch(() => undefined);
      }
      setNewStudentName("");
      setNewStudentNumber("");
      setNewStudentBirthDate("");
      setNewStudentNationalIdentityNumber("");
      setNewStudentGuardianName("");
      setNewStudentGuardianPhone("");
      setNewStudentHomeAddress("");
      setNewStudentHomeAddressParts(undefined);
      setStudentAddOpen(false);
      setStudentSearch("");
      setAnnouncement(`${name} sınıfa eklendi.`);
      return true;
    } catch {
      const message = "Çocuk eklenemedi; kayıtlar korundu.";
      setNewStudentError(message);
      setAnnouncement(message);
      return false;
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

  const requestStudentProfileClose = () => {
    keyboard.hide();
    const dialog = studentProfileSheetRef.current?.closest('[role="dialog"]');
    studentProfileExitDialogRef.current =
      dialog instanceof HTMLElement ? dialog : null;
    studentProfileRestoreFocusOnCloseRef.current = true;
    setStudentProfileOpen(false);
  };

  const openStudentProfile = (
    studentId: string,
    initialTab: Exclude<StudentProfileTab, "portfolio"> = "flow",
    returnFocusTarget?: HTMLElement | null,
  ) => {
    const student =
      students.find((item) => item.id === studentId) ??
      archivedStudents.find((item) => item.id === studentId);
    if (!student) {
      setAnnouncement("Çocuk profili açılamadı.");
      return;
    }
    const focusTarget =
      returnFocusTarget ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    studentProfileReturnFocusRef.current =
      focusTarget?.isConnected && focusTarget.tabIndex >= 0
        ? focusTarget
        : null;
    studentProfileExitDialogRef.current = null;
    studentProfileRestoreFocusOnCloseRef.current = false;
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
      nationalIdentityNumber: student.nationalIdentityNumber ?? "",
      enrollmentYear: student.enrollmentYear ?? "",
      homeLanguages: student.homeLanguages ?? "",
      interests: student.interests ?? "",
      strengths: student.strengths ?? "",
      supportPreferences: student.supportPreferences ?? "",
      contacts: studentContactsForForm(student),
      careDetails: {
        ...emptyStudentCareForm,
        ...student.careDetails,
      },
      profilePhotoDataUrl: student.profilePhotoDataUrl ?? "",
    });
    setStudentProfileError("");
    setStudentObservationLimit(20);
    setStudentProfileTab(initialTab);
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
      childReflection:
        existing?.childReflection ??
        observation.childQuote ??
        (observation.observationType === "child-quote"
          ? observation.rawText
          : ""),
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
      await enqueuePersistence(
        () =>
          savePortfolioSelection(store, {
            studentId: selectedProfileStudent.id,
            observationId: draft.observationId,
            selected: true,
            teacherCaption: draft.teacherCaption,
            childReflection: draft.childReflection,
            familyContribution: draft.familyContribution,
            selectedBy: draft.selectedBy,
          }),
        {
          ...evidenceMutationGuards(
            allEvidenceObservations.find(
              (item) => item.id === draft.observationId,
            )?.premiumProvenance,
          ),
        },
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
      await enqueuePersistence(
        () =>
          savePortfolioSelection(store, {
            studentId: selectedProfileStudent.id,
            observationId,
            selected: false,
          }),
        {
          ...evidenceMutationGuards(
            allEvidenceObservations.find((item) => item.id === observationId)
              ?.premiumProvenance,
          ),
        },
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

  const saveStudentProfile = async (submittedForm?: HTMLFormElement) => {
    if (!selectedProfileStudent || dataBusy) return;
    // WebKit can dispatch submit before React commits the final controlled-input
    // update when a teacher types and immediately taps save. Read the native
    // form values at the commit boundary so the last keystroke is never lost.
    const submittedNationalIdentityNumber = (
      submittedForm?.elements.namedItem("nationalIdentityNumber") instanceof HTMLInputElement
        ? (submittedForm.elements.namedItem("nationalIdentityNumber") as HTMLInputElement).value
        : studentProfileForm.nationalIdentityNumber
    )
      .replace(/\D/g, "")
      .slice(0, 11);
    const submittedEnrollmentYear = (
      submittedForm?.elements.namedItem("enrollmentYear") instanceof HTMLInputElement
        ? (submittedForm.elements.namedItem("enrollmentYear") as HTMLInputElement).value
        : studentProfileForm.enrollmentYear
    )
      .replace(/\D/g, "")
      .slice(0, 4);
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
        contact.occupation?.trim() ||
        contact.isEmergencyContact ||
        contact.isAuthorizedPickup ||
        (contact.kind === "other" && contact.relationship.trim()),
    );
    const incompleteContact = contactsWithDetails.find(
      (contact) => !contact.phone.trim() && (contact.isPrimary || contact.isEmergencyContact),
    );
    if (incompleteContact) {
      setStudentProfileError(
        `${incompleteContact.relationship || "Yakın"} öncelikli veya acil iletişim kişisi: telefon girin ya da bu işaretleri kaldırın.`,
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
    let careDetails: ReturnType<typeof normalizeStudentCareDetails>;
    try {
      careDetails = normalizeStudentCareDetails(studentProfileForm.careDetails);
    } catch (reason) {
      setStudentProfileError(reason instanceof Error ? reason.message : "Adres ve bakım bilgileri doğrulanamadı.");
      return;
    }
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
      ...(submittedNationalIdentityNumber
        ? { nationalIdentityNumber: submittedNationalIdentityNumber }
        : {}),
      ...(submittedEnrollmentYear
        ? { enrollmentYear: submittedEnrollmentYear }
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
      ...(careDetails ? { careDetails } : {}),
      ...(studentProfileForm.profilePhotoDataUrl
        ? { profilePhotoDataUrl: studentProfileForm.profilePhotoDataUrl }
        : {}),
    };
    if (!studentProfileForm.preferredName.trim()) {
      delete updatedStudent.preferredName;
    }
    if (!studentProfileForm.birthDate) delete updatedStudent.birthDate;
    if (!studentProfileForm.optionalCode.trim()) delete updatedStudent.optionalCode;
    if (!submittedNationalIdentityNumber) {
      delete updatedStudent.nationalIdentityNumber;
    }
    if (!submittedEnrollmentYear) delete updatedStudent.enrollmentYear;
    if (!studentProfileForm.homeLanguages.trim()) delete updatedStudent.homeLanguages;
    if (!studentProfileForm.interests.trim()) delete updatedStudent.interests;
    if (!studentProfileForm.strengths.trim()) delete updatedStudent.strengths;
    if (!studentProfileForm.supportPreferences.trim()) {
      delete updatedStudent.supportPreferences;
    }
    if (contacts.length === 0) delete updatedStudent.contacts;
    if (!careDetails) delete updatedStudent.careDetails;
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
      requestStudentProfileClose();
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

  const updateStudentHomeAddress = (homeAddress: string, homeAddressParts?: StudentHomeAddressParts) => {
    setStudentProfileForm(current => ({
      ...current, careDetails: { ...current.careDetails, homeAddress, homeAddressParts },
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

  const archiveStudent = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student || dataBusy) return;
    keyboard.hide();
    setStudentArchiveCandidate(student);
  };

  const confirmArchiveStudent = async () => {
    const student = studentArchiveCandidate;
    if (!student || dataBusy) return;
    setDataBusy(true);
    try {
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: true, preserveCurrentProfile: true }));
      const refreshed = await loadDashboardState(store, fallbackDashboardState);
      setStudents(refreshed.students);
      setArchivedStudents(refreshed.archivedStudents);
      setStudentActionsOpenId(null);
      setStudentArchiveCandidate(null);
      setAnnouncement(`${student.name} silinen öğrenciler bölümüne taşındı. Geri al ile sınıfa dönebilir; geçmiş kayıtları korundu.`);
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
      await enqueuePersistence(() => persistStudentRosterChange(store, { student, archived: false, preserveCurrentProfile: true }));
      const refreshed = await loadDashboardState(store, fallbackDashboardState);
      setStudents(refreshed.students);
      setArchivedStudents(refreshed.archivedStudents);
      setAnnouncement(`${student.name} sınıfa geri alındı.`);
    } catch {
      setAnnouncement("Çocuk sınıfa geri alınamadı; geçmiş kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const openAcademicCalendar = async (
    requestedDate?: string,
    focusEntryForm = false,
  ) => {
    if (!configuredClassroom) {
      setClassroomOpen(true);
      setAnnouncement("Önce sınıfınızı kurun.");
      return;
    }
    surfaceTransitionRef.current = "calendar";
    setDataBusy(true);
    setCalendarError("");
    try {
      const [calendar, scheduledPlans] = await Promise.all([
        loadAcademicCalendar(store),
        loadScheduledPlanWorkspace(store),
      ]);
      const preferredDate =
        requestedDate &&
        requestedDate >= configuredClassroom.academicYearStart &&
        requestedDate <= configuredClassroom.academicYearEnd
          ? requestedDate
          : attendanceCivilDate >= configuredClassroom.academicYearStart &&
        attendanceCivilDate <= configuredClassroom.academicYearEnd
          ? attendanceCivilDate
          : configuredClassroom.academicYearStart;
      setAcademicCalendar(calendar);
      setScheduledPlanWorkspace(scheduledPlans);
      setCalendarSelectedDate(preferredDate);
      setCalendarMonth(preferredDate.slice(0, 7));
      setPlansOpen(false);
      setCalendarOpen(true);
      if (focusEntryForm) {
        setTimeout(() => calendarEntryTitleRef.current?.focus(), 250);
      }
    } catch (reason) {
      surfaceTransitionRef.current = null;
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Takvim açılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const openTodayPlans = () => {
    setSelectedPlanDayWorkspace(null);
    setDocumentsOpen(false);
    setPremiumGateOpen(false);
    surfaceTransitionRef.current = "plans";
    setPlansOpen(true);
  };

  const viewScheduledPlanFlow = async (plan: ScheduledPlanSummary) => {
    setDataBusy(true);
    setCalendarError("");
    try {
      const workspace = await loadPlanDayWorkspace(store, {
        civilDate: plan.civilDate,
      });
      setSelectedPlanDayWorkspace(workspace);
      setCalendarOpen(false);
      setPlansOpen(true);
      setAnnouncement(`${formatTurkishCivilDate(plan.civilDate)} günlük akışı açıldı.`);
    } catch (reason) {
      setCalendarError(
        reason instanceof Error ? reason.message : "Kayıtlı günlük akış açılamadı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const editScheduledPlan = async (plan: ScheduledPlanSummary) => {
    if (writesBlocked) {
      setCalendarError(
        "Cihaz verileri yazmaya hazır değil. Plan düzenleme güvenlik için kapalı.",
      );
      return;
    }
    if (plan.premium && !premiumMutationAllowed) {
      setCalendarError("");
      setCalendarOpen(false);
      setTeacherPlanRecordsOpen(false);
      setAnnouncement(
        "Eski hazır plan salt okunur korundu. Düzenlemek yerine yeni bir Maarif Modeli günlük planı açıldı.",
      );
      void openPlanFlow();
      return;
    }
    if (!plan.editable) {
      setCalendarError(plan.editBlockReason ?? "Bu günlük plan düzenlenemez.");
      return;
    }
    setDataBusy(true);
    setCalendarError("");
    try {
      const draft = await loadScheduledPlanEditDraft(store, {
        planId: plan.planId,
      });
      d1ReturnFocusRef.current ??=
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setScheduledPlanEditDraft(draft);
      setPremiumDailyTemplate(null);
      setCalendarOpen(false);
      setPlansOpen(false);
      surfaceTransitionRef.current = "plan-flow";
      setPlanFlowOpen(true);
      setAnnouncement(`${draft.planTitle} düzenlemeye açıldı.`);
    } catch (reason) {
      setCalendarError(
        reason instanceof Error ? reason.message : "Günlük plan düzenlemeye açılamadı.",
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
    if (dataBusy || writesBlocked) return;
    keyboard.hide();
    setDataBusy(true);
    try {
      const snapshot = await store.readSnapshot();
      const impact = previewPermanentStudentDeletion(snapshot, student.id);
      setStudentDeletionCandidate(student);
      setStudentDeletionImpact(impact);
      setStudentDeletionConfirmation("");
      setStudentArchiveCandidate(null);
      setStudentDeletionError("");
      setStudentProfileOpen(false);
      setStudentActionsOpenId(null);
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
    if (!studentDeletionCandidate || !studentDeletionImpact || dataBusy || writesBlocked || permanentDeletionBusyRef.current || studentDeletionConfirmation !== studentDeletionImpact.displayName) return;
    permanentDeletionBusyRef.current = true;
    setDataBusy(true);
    setStudentDeletionError("");
    try {
      const result = await enqueuePersistence(() =>
        permanentlyDeleteStudent(store, {
          studentId: studentDeletionCandidate.id,
          confirmationName: studentDeletionConfirmation,
          expectedFingerprint: studentDeletionImpact.fingerprint,
        }),
      );
      setStudents(current => current.filter(student => student.id !== studentDeletionCandidate.id));
      setArchivedStudents(current => current.filter(student => student.id !== studentDeletionCandidate.id));
      setStudentDeletionCandidate(null);
      setStudentDeletionImpact(null);
      setStudentDeletionConfirmation("");
      setSelectedStudentId(null);
      setCompletionRequest(null);
      setFollowupRevision(value => value + 1);
      try {
        await refreshD1Workspaces();
      } catch {
        setAnnouncement("Öğrenci kalıcı olarak silindi. Diğer ekranları güncellemek için uygulamayı yeniden açın.");
        return;
      }
      setAnnouncement(
        `${result.displayName} ve ${result.removedEntityCount} bağlı kayıt kalıcı olarak silindi.`,
      );
    } catch (reason) {
      setStudentDeletionConfirmation("");
      setStudentDeletionError(reason instanceof Error ? reason.message : "Öğrenci kalıcı olarak silinemedi.");
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Öğrenci kalıcı olarak silinemedi.",
      );
    } finally {
      permanentDeletionBusyRef.current = false;
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
      ...dossierPrivacyDefaults(current.destination),
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
      const { listExternalAiFeedback } = await import(
        "./features/reports/student-dossier"
      );
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
      const { createStudentDossier } = await import(
        "./features/reports/student-dossier"
      );
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
        const { createStudentDossierPdfDocument } = await import("./features/reports/student-dossier.ts");
        const file = await createStudentDossierPdfDocument(result.dossier);
        downloadBrowserFile(file);
        setAnnouncement("Öğrenci dosyası PDF önizlemesi açıldı; aynı belgeyi paylaşabilirsiniz.");      } else if (
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
      const { listExternalAiFeedback, saveExternalAiFeedback } = await import(
        "./features/reports/student-dossier"
      );
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

  const startAcademicYearWorkToday = async () => {
    if (writesBlocked || dataBusy) {
      setAnnouncement(
        "Cihaz verileri yazmaya hazır değil. Çalışma başlangıcı uygulanmadı.",
      );
      return;
    }
    if (configuredClassroom?.operationalStatus !== "preparation") {
      setAnnouncement("Seçili eğitim yılı zaten kullanıma açık.");
      return;
    }
    setDataBusy(true);
    setClassroomError("");
    try {
      const context = await enqueuePersistence(
        () => activateAcademicYearNow(store),
        {
          failureDetail:
            "Eğitim yılı bugün için açılamadı. Mevcut kayıtlar değiştirilmedi.",
          successDetail:
            "Eğitim yılı bugünden itibaren gerçek kayıt kullanımına açıldı.",
        },
      );
      if (context.status !== "configured") {
        throw new Error("Eğitim yılı açıldı ancak sınıf çalışma alanı okunamadı.");
      }
      const [refreshed, dashboard] = await Promise.all([
        refreshD1Workspaces(),
        loadDashboardState(store, fallbackDashboardState),
      ]);
      setStudents(dashboard.students);
      setArchivedStudents(dashboard.archivedStudents);
      setAttendanceCompleted(dashboard.attendanceCompleted);
      setAttendanceCivilDate(dashboard.attendanceCivilDate);
      setClassroomOpen(false);
      setAnnouncement(
        refreshed.today.classroom.status === "configured"
          ? `${refreshed.today.classroom.classroomName} bugünden itibaren kullanıma açıldı.`
          : `${context.classroomName} bugünden itibaren kullanıma açıldı.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Eğitim yılı bugün için açılamadı.";
      setClassroomError(message);
      setAnnouncement(message);
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
    const selectedProgram = CURRICULUM_PROGRAM_LABELS.tymm;
    const selectedScheduleKind = classroomForm.scheduleKind;
    if (
      !classroomForm.schoolName.trim() ||
      !classroomForm.teacherName.trim() ||
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
        "Okul, öğretmen, sınıf, yaş grubu, çalışma düzeni ve saatleri eksiksiz olmalıdır.",
      );
      return;
    }
    if (academicYearTransitionRequired && !academicYearTransitionConfirmed) {
      setClassroomError(
        samePeriodCurriculumTransitionRequired
          ? "Maarif Modeli sınıfını oluşturmak için önce eski EÇE kayıtlarının arşivleneceğini ve etkin öğrencilerin taşınacağını onaylayın."
          : "Yeni eğitim yılına geçmek için önce arşivleme ve öğrenci taşıma onayını işaretleyin.",
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
          schoolName: classroomForm.schoolName,
          teacherName: classroomForm.teacherName,
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
              transitionKind: samePeriodCurriculumTransitionRequired
                ? "same-period-curriculum"
                : "academic-year",
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
            samePeriodCurriculumTransitionRequired
              ? "Maarif Modeli sınıfı bu cihaza oluşturulamadı. Eski EÇE sınıfı değiştirilmedi."
              : "Sınıf ayarları bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: samePeriodCurriculumTransitionRequired
            ? "Eski EÇE sınıfı arşivlendi; yeni Maarif Modeli sınıfı oluşturuldu."
            : "Sınıf ve çalışma düzeni bu cihaza kaydedildi.",
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
        samePeriodCurriculumTransitionRequired
          ? "Eski EÇE sınıfı salt okunur arşivlendi; öğrenciler yeni Maarif Modeli sınıfına taşındı."
          : refreshed.today.classroom.status === "configured"
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

  const completeRecordedActivity = async (activityId: string) => {
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
    if (writesBlocked) return;
    const activityItem = todayWorkspace.planItems.find(
      (item) => item.activityId === activityId || item.id === activityId,
    );
    const currentEvidenceActivity = evidenceWorkspace.activities.find(
      (item) => item.id === activityId,
    );
    if (!activityItem || !currentEvidenceActivity) {
      setAnnouncement(
        "Etkinliğin güncel kayıt bağlantısı bulunamadı; mevcut gözlemler korunuyor.",
      );
      return;
    }
    if (currentEvidenceActivity.status === "completed") {
      setAnnouncement(`${activityItem.title} zaten tamamlandı.`);
      return;
    }
    const targetPremiumPack = premiumPackForEvidence(
      currentEvidenceActivity?.premiumProvenance,
    );
    if (activityItem.kind === "premium-flow-block") {
      try {
        assertPremiumMutationAccessNow(targetPremiumPack ?? null);
      } catch {
        setAnnouncement(
          "Eski hazır etkinlik salt okunur korunuyor. Yeni etkinliği Etkinlikler alanından başlatın.",
        );
        return;
      }
    }
    setDataBusy(true);
    try {
      await enqueuePersistence(
        () =>
          setTodayActivityStatus(
            store,
            activityId,
            "completed",
          ),
        {
          educationalWrite: {},
          ...(activityItem.kind === "premium-flow-block"
            ? { premiumPack: targetPremiumPack ?? null }
            : {}),
          failureDetail:
            "Etkinlik durumu bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${activityItem.title} tamamlandı olarak kaydedildi.`,
        },
      );
      await refreshD1Workspaces();
      setAnnouncement(`${activityItem.title} tamamlandı; akış sıradaki adıma geçti.`);
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
    setScheduledPlanEditDraft(null);
    setTeacherOwnedDailyFlowCopySources([]);
    setEvidenceFlowRequest(null);
    const completedObservation = lastCompletionRequestRef.current;
    if (completedObservation) {
      lastCompletionRequestRef.current = null;
      surfaceTransitionRef.current = "action-completion";
      setCompletionRequest(completedObservation);
    }
    const returnFocusTarget = d1ReturnFocusRef.current;
    const returnFocusStudentId = d1ReturnFocusStudentIdRef.current;
    if (d1ReturnToProfileRef.current) setPendingProfileFocusId(returnFocusStudentId);
    d1ReturnToProfileRef.current = false;
    d1ReturnFocusRef.current = null;
    d1ReturnFocusStudentIdRef.current = null;
    const restoreDevelopmentFocus = (remainingFrames: number) => {
      const canReceiveReturnFocus = (
        element: HTMLElement | null,
      ): element is HTMLElement =>
        Boolean(
          element?.isConnected &&
            !element.matches(":disabled, [aria-disabled='true']") &&
            element.closest("[inert], [aria-hidden='true']") === null &&
            element.getClientRects().length > 0,
        );
      const remountedDevelopmentTrigger = returnFocusStudentId
        ? Array.from(
            document.querySelectorAll<HTMLElement>(
              "[data-student-development-trigger]",
            ),
          ).find(
            (element) =>
              element.dataset.studentDevelopmentTrigger ===
              returnFocusStudentId &&
              canReceiveReturnFocus(element),
          )
        : null;
      const focusTarget =
        remountedDevelopmentTrigger ??
        (canReceiveReturnFocus(returnFocusTarget)
          ? returnFocusTarget
          : null);
      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
      }
      if (remainingFrames > 0) {
        window.requestAnimationFrame(() =>
          restoreDevelopmentFocus(remainingFrames - 1),
        );
        return;
      }
      if (focusTarget) return;
      const routeHeading = document.querySelector<HTMLElement>(
        "[data-route-heading]",
      );
      if (canReceiveReturnFocus(routeHeading)) {
        routeHeading.focus({ preventScroll: true });
      }
    };
    window.requestAnimationFrame(() => restoreDevelopmentFocus(8));
    return true;
  };

  const restoreAppSurface = useCallback((surface: AppSurface | null) => {
    const normalizedSurface =
      surface === "premium-gate"
        ? null
        : surface === "premium-plans"
          ? "teacher-plan-records"
          : surface;
    const evidenceRequest =
      normalizedSurface === "evidence-flow"
        ? lastEvidenceFlowRequestRef.current
        : null;
    const childSession =
      normalizedSurface === "tymm-child"
        ? lastTymmChildSessionRef.current
        : null;
    const restorableSurface =
      (normalizedSurface === "evidence-flow" && !evidenceRequest) ||
      (normalizedSurface === "action-completion" && !lastCompletionRequestRef.current) ||
      (normalizedSurface === "plan-guidance" && !lastPlanGuidanceDateRef.current) ||
      (normalizedSurface === "tymm-child" && !childSession)
        ? null
        : normalizedSurface;

    setCompletionRequest(restorableSurface === "action-completion" ? lastCompletionRequestRef.current : null);
    setPlanGuidanceCivilDate(restorableSurface === "plan-guidance" ? lastPlanGuidanceDateRef.current : null);
    setCaptureMenuOpen(restorableSurface === "capture-menu");
    setTymmGuideOpen(restorableSurface === "tymm-guide");
    setTymmChildSession(
      restorableSurface === "tymm-child" ? childSession : null,
    );
    setAttendanceOpen(restorableSurface === "attendance");
    setStudentProfileOpen(restorableSurface === "student-profile");
    setDevelopmentReportOpen(restorableSurface === "development-report");
    setStudentShareOpen(restorableSurface === "student-share");
    if (restorableSurface !== "student-delete") {
      setStudentArchiveCandidate(null);
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
    setTeacherPlanRecordsOpen(restorableSurface === "teacher-plan-records");
    setPremiumGateOpen(false);
    setPremiumPlanOpen(false);
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
      if (currentSurface === "tymm-child") {
        window.history.pushState(
          appHistoryState(currentSurface),
          "",
          window.location.href,
        );
        historySurfaceRef.current = currentSurface;
        historyRestoringRef.current = false;
        setAnnouncement(
          "Çocuk ekranında geri işlemi kapalıdır; öğretmene geçmek için yetişkin doğrulaması gerekir.",
        );
        return;
      }
      if (
        currentSurface !== "plan-flow" &&
        currentSurface !== "evidence-flow" &&
        currentSurface !== "development-report"
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

    if (
      previousSurface === "evidence-flow" &&
      activeSurface === "capture-menu"
    ) {
      historyRestoringRef.current = true;
      window.history.back();
      return;
    }

    const replaceCurrentEntry =
      previousSurface === "plan-flow" ||
      previousSurface === "evidence-flow" ||
      previousSurface === "premium-gate" ||
      previousSurface === "tymm-child";
    const method = replaceCurrentEntry ? "replaceState" : "pushState";
    window.history[method](
      appHistoryState(activeSurface),
      "",
      window.location.href,
    );
    historySurfaceRef.current = activeSurface;
    surfaceTransitionRef.current = null;
  }, [activeSurface, native]);

  const openPlanFlow = async (
    initialTemplate?: PremiumDailyTemplateSelection,
    initialActivityTitle?: string,
    initialPedagogicalProvenance?: PedagogicalPlanProvenance,
    requestedCivilDate?: string,
  ) => {
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
    if (configuredClassroom.curriculumProfile?.framework !== "tymm") {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      setAnnouncement(
        "Eski EÇE kayıtları salt okunur korunuyor. Yeni plan için Maarif Modeli sınıfını oluşturun.",
      );
      return;
    }
    if (initialTemplate && !premiumMutationAllowed) {
      setPremiumGateOpen(true);
      setAnnouncement(
        "Premium plan salt okunur. Uygulamak veya değiştirmek için erişimi yenileyin.",
      );
      return;
    }
    const futurePlanPreparation =
      configuredClassroom.operationalStatus === "preparation" &&
      (initialTemplate !== undefined || preparationPlanningAllowed);
    if (educationalWriteNotice && !futurePlanPreparation) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }
    if (!configuredClassroom.curriculumProfile) {
      setClassroomOpen(true);
      setAnnouncement("Plan için program katalog kimliği ve kaynak sürümünü tamamlayın.");
      return;
    }
    const openingDate = requestedCivilDate ?? basePlanFlowCivilDate;
    const openingWeek = teacherWorkCycle.weekly && openingDate >= teacherWorkCycle.weekly.periodStart && openingDate <= teacherWorkCycle.weekly.periodEnd ? teacherWorkCycle.weekly : null;
    let copySources: TeacherOwnedDailyFlowCopySource[] = [];
    if (!initialTemplate && openingWeek) {
      try {
        copySources = await loadTeacherOwnedDailyFlowCopySources(store, {
          weeklyPlanId: openingWeek.id,
          beforeCivilDate: openingDate,
        });
      } catch {
        copySources = [];
      }
    }
    d1ReturnFocusRef.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    surfaceTransitionRef.current = "plan-flow";
    setPlansOpen(false);
    setTeacherPlanRecordsOpen(false);
    setPremiumPlanOpen(false);
    setPremiumDailyTemplate(initialTemplate ?? null);
    setStudioActivityTitle(initialActivityTitle?.trim() || null);
    setStudioPedagogicalProvenance(initialPedagogicalProvenance ?? null);
    setScheduledPlanEditDraft(null);
    setManualPlanCivilDate(requestedCivilDate ?? null);
    setPlanGuidanceCivilDate(null);
    setTeacherOwnedDailyFlowCopySources(copySources);
    setPlanFlowOpen(true);
  };

  const premiumPlanEntryEnabled = true;

  const openPremiumPlans = (
    initialSection: "overview" | "weekly" | "monthly" = "overview",
    builtInPackReference: BuiltInMaarifPlanPackReference | null = null,
  ) => {
    setTeacherPlanRecordsOpen(false);
    setPremiumPlanInitialSection(initialSection);
    setPremiumPlanBuiltInReference(builtInPackReference);
    if (!premiumLegacyRequested) {
      if (!configuredClassroom?.curriculumProfile) {
        setClassroomOpen(true);
        setAnnouncement(
          "Hazır Maarif içerikleri için önce sınıf program profilini tamamlayın.",
        );
        return;
      }
      if (currentClassTymmAgeBand !== "60-72") {
        navigate("plans");
        setAnnouncement(
          currentClassTymmAgeBand
            ? `${currentClassTymmAgeBand.replace("-", "–")} ay için öğretmen planı ve yaşa uygun etkinlik bankası açık; hazır tam plan paketi yalnız 60–72 ay için yayımlandı.`
            : "Hazır içerik için önce sınıfın resmî yaş bandını seçin.",
        );
        return;
      }
      setProfileOpen(false);
      setPlansOpen(false);
      setSelectedPlanDayWorkspace(null);
      setPremiumGateOpen(false);
      surfaceTransitionRef.current = "premium-plans";
      setPremiumPlanOpen(true);
      setAnnouncement("Hazır Maarif planları açıldı.");
      return;
    }
    const verifiedAccess = premiumFounderAccess?.access;
    const canUsePremiumPlans =
      verifiedAccess?.status === "active" &&
      verifiedAccess.canUsePremiumContent === true;
    const canReadExistingPlans =
      verifiedAccess?.canReadExistingTeacherPlans === true;
    if (
      !canUsePremiumPlans &&
      !canReadExistingPlans &&
      !internalStaffExportEnabled &&
      !premiumPilotPreviewEnabled &&
      !isCapabilityEnabled("premiumPlanCenter")
    ) {
      setProfileOpen(false);
      setPlansOpen(false);
      setSelectedPlanDayWorkspace(null);
      surfaceTransitionRef.current = "premium-gate";
      setPremiumGateOpen(true);
      setAnnouncement(
        premiumFounderConfigurationState.configuration
          ? "Plan Kütüphanesi için bu telefonda Kurucu Premium erişimini etkinleştirin."
          : "Plan Kütüphanesi erişimi bu sürümde yapılandırılmamış.",
      );
      return;
    }
    if (!configuredClassroom?.curriculumProfile) {
      setClassroomOpen(true);
      setAnnouncement(
        "Plan Kütüphanesi için önce sınıf program profilini tamamlayın.",
      );
      return;
    }
    setProfileOpen(false);
    setPlansOpen(false);
    setSelectedPlanDayWorkspace(null);
    setPremiumGateOpen(false);
    surfaceTransitionRef.current = "premium-plans";
    setPremiumPlanOpen(true);
  };

  const activateFounderPremium = async (code: string) => {
    const configuration = premiumFounderConfigurationState.configuration;
    if (!configuration || premiumFounderBusy) return;
    setPremiumFounderBusy(true);
    setPremiumFounderError("");
    setPremiumFounderErrorPresentation(null);
    try {
      const { activatePremiumFounderAccess } = await import(
        "./features/premium-access/founder-client.ts"
      );
      const result = await activatePremiumFounderAccess({
        code,
        appVersion: CURRENT_RELEASE.version,
        configuration,
      });
      setPremiumFounderAccess(result);
      setPremiumFounderErrorPresentation(null);
      setPremiumGateOpen(false);
      if (configuredClassroom?.curriculumProfile) {
        surfaceTransitionRef.current = "premium-plans";
        setPremiumPlanOpen(true);
        setAnnouncement(
          "Kurucu Premium bu telefonda etkinleştirildi. Plan Kütüphanesi açıldı ve çevrimdışı kullanım hakkı korundu.",
        );
      } else {
        setClassroomOpen(true);
        setAnnouncement(
          "Kurucu Premium etkinleştirildi. Planları açmak için sınıf program profilini tamamlayın.",
        );
      }
    } catch (error) {
      const { premiumFounderActivationErrorPresentation } = await import(
        "./features/premium-access/founder-client.ts"
      );
      const presentation = premiumFounderActivationErrorPresentation(error);
      setPremiumFounderError(presentation.message);
      setPremiumFounderErrorPresentation(presentation);
    } finally {
      setPremiumFounderBusy(false);
    }
  };

  const resetFounderPremiumLocalLicense = async () => {
    if (premiumFounderBusy || premiumFounderResetBusy) return;
    setPremiumFounderResetBusy(true);
    try {
      const { resetPremiumFounderLocalLicenseAccess } = await import(
        "./features/premium-access/founder-client.ts"
      );
      await resetPremiumFounderLocalLicenseAccess();
      setPremiumFounderAccess(null);
      setPremiumFounderError("");
      setPremiumFounderErrorPresentation(null);
      setAnnouncement(
        "Yalnız bu telefondaki premium lisans alanı onarıldı. Sunucu cihaz hakkı boşaltılmadı; kodu yeniden girdiğinizde bu telefon yeni cihaz sayılabilir.",
      );
    } catch (error) {
      const { premiumFounderActivationErrorPresentation } = await import(
        "./features/premium-access/founder-client.ts"
      );
      const presentation = premiumFounderActivationErrorPresentation(error);
      setPremiumFounderError(presentation.message);
      setPremiumFounderErrorPresentation(presentation);
    } finally {
      setPremiumFounderResetBusy(false);
    }
  };

  const openActivityEvidence = async (
    activityId: string,
    initialStudentId?: string,
    selectedActivity?: EvidenceActivitySummary,
    initialDraft?: EvidenceCaptureSeed,
    activityStartPolicy: EvidenceActivityStartPolicy = "start-if-planned",
  ) => {
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }
    const selected =
      selectedActivity?.id === activityId
        ? selectedActivity
        : evidenceWorkspace.activities.find((item) => item.id === activityId);
    if (!selected) {
      setAnnouncement("Etkinliğin kanıt bağlantısı açılamadı; planı yeniden kontrol edin.");
      return;
    }
    const targetPremiumPack = premiumPackForEvidence(selected.premiumProvenance);
    if (targetPremiumPack !== undefined) {
      try {
        assertPremiumMutationAccessNow(targetPremiumPack);
      } catch {
        setAnnouncement(
          "Eski hazır plan salt okunur korunuyor. Yeni gözlemi Sınıfım alanından ekleyin.",
        );
        return;
      }
    }
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setObservationOpening(true);
    setDataBusy(true);
    surfaceTransitionRef.current = "evidence-flow";
    try {
      if (
        selected.status === "planned" &&
        activityStartPolicy === "start-if-planned"
      ) {
        await enqueuePersistence(
          () => setTodayActivityStatus(store, selected.id, "in_progress"),
          {
            educationalWrite: {},
            ...(targetPremiumPack !== undefined
              ? { premiumPack: targetPremiumPack }
              : {}),
            failureDetail:
              "Etkinlik başlatılamadı. Yeni yazmalar güvenlik için durduruldu.",
            successDetail: `${selected.title} uygulanıyor olarak kaydedildi.`,
          },
        );
      }
      // The selected activity is already a verified read model. Re-reading the
      // whole encrypted repository (and seven unrelated workspaces) before the
      // dialog can paint made this primary action stall on retained histories.
      const activity =
        selected.status === "planned" && activityStartPolicy === "start-if-planned"
          ? { ...selected, status: "in_progress" as const }
          : selected;
      setEvidenceWorkspace((current) => ({
        ...current,
        activities: current.activities.map((item) =>
          item.id === activity.id ? activity : item,
        ),
      }));
      d1ReturnFocusRef.current ??= returnFocusTarget;
      surfaceTransitionRef.current = "evidence-flow";
      setStudentProfileOpen(false);
      setPlansOpen(false);
      observationCompletionPromptRef.current = !initialStudentId;
      setEvidenceFlowRequest({
        activity,
        ...(initialStudentId ? { initialStudentId } : {}),
        ...(initialDraft ? { initialDraft } : {}),
      });
      setAnnouncement(`${activity.title} için gözlem notu açıldı.`);
    } catch (reason) {
      surfaceTransitionRef.current = null;
      setAnnouncement(
        reason instanceof Error ? reason.message : "Etkinlik başlatılamadı; mevcut kayıt korundu.",
      );
    } finally {
      setDataBusy(false);
      setObservationOpening(false);
    }
  };

  const openSpontaneousObservation = async (
    student: Student,
    civilDate: string,
    initialStudentId?: string,
    initialDraft?: EvidenceCaptureSeed,
  ) => {
    if (writesBlocked) {
      setAnnouncement(
        "Cihaz verileri yazmaya hazır değil. Hızlı gözlem güvenlik için kapalı.",
      );
      return;
    }
    setObservationOpening(true);
    setStudentProfileError("");
    surfaceTransitionRef.current = "evidence-flow";
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    try {
      const existingActivity = evidenceWorkspace.activities.find(
        (activity) =>
          activity.contextKind === "spontaneous-observation" &&
          activity.civilDate === civilDate,
      );
      if (existingActivity) {
        keyboard.hide();
        d1ReturnFocusRef.current ??= returnFocusTarget;
        setStudentProfileOpen(false);
        setPlansOpen(false);
        observationCompletionPromptRef.current = !initialStudentId;
        setEvidenceFlowRequest({
          activity: existingActivity,
          ...(initialStudentId ? { initialStudentId } : {}),
          ...(initialDraft ? { initialDraft } : {}),
        });
        setAnnouncement(
          initialStudentId
            ? `${student.name} için anlık gözlem hazır.`
            : "Hızlı gözlem hazır; çocuk veya çocukları seçin.",
        );
        return;
      }

      // Ağır şifreli transaction ancak açılış katmanı gerçekten boyandıktan
      // sonra başlar. Böylece özellikle WebKit'te çocuk kaydından hemen sonra
      // dokunulan Gözlem düğmesinin ana iş parçacığı warm-up ile yarışmaz.
      const context = await prepareSpontaneousObservationContext(student, civilDate);
      const profile = normalizeCurriculumProfile(
        context.activity.curriculumProfileSnapshot as CurriculumProfileInput,
      );
      const activity: EvidenceActivitySummary = {
        id: context.activity.id,
        planId: String(context.activity.planId),
        title: String(context.activity.title),
        startTime: String(context.activity.startTime),
        status: "in_progress",
        civilDate,
        curriculumProfile: profile,
        curriculumTargets: [],
        assignedStudentIds: [],
        assignmentMode: "legacy-unscoped",
        contextKind: "spontaneous-observation",
      };
      setEvidenceWorkspace((current) => ({
        ...current,
        activities: current.activities.some((item) => item.id === activity.id)
          ? current.activities
          : [...current.activities, activity],
      }));
      keyboard.hide();
      d1ReturnFocusRef.current ??= returnFocusTarget;
      surfaceTransitionRef.current = "evidence-flow";
      setStudentProfileOpen(false);
      setPlansOpen(false);
      observationCompletionPromptRef.current = !initialStudentId;
      setEvidenceFlowRequest({
        activity,
        ...(initialStudentId ? { initialStudentId } : {}),
        ...(initialDraft ? { initialDraft } : {}),
      });
      setAnnouncement(
        initialStudentId
          ? `${student.name} için anlık gözlem hazır.`
          : "Hızlı gözlem hazır; çocuk veya çocukları seçin.",
      );
    } catch (reason) {
      surfaceTransitionRef.current = null;
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Anlık gözlem açılamadı; mevcut kayıtlar korundu.",
      );
    } finally {
      setObservationOpening(false);
    }
  };

  const openStudentObservation = async (
    initialStudentId?: string,
    initialDraft?: EvidenceCaptureSeed,
    activityStartPolicy: EvidenceActivityStartPolicy = "start-if-planned",
  ) => {
    lastCompletionRequestRef.current = null;
    if (writesBlocked) {
      setAnnouncement(
        "Cihaz verileri yazmaya hazır değil. Hızlı gözlem güvenlik için kapalı.",
      );
      return;
    }
    const student = initialStudentId
      ? students.find((item) => item.id === initialStudentId)
      : students[0];
    if (!student) {
      if (!initialStudentId) {
        navigatePrimaryRoute("classroom");
        setStudentAddOpen(true);
      }
      setAnnouncement(
        initialStudentId
          ? "Hızlı gözlem yalnız sınıftaki etkin çocuk için açılabilir."
          : "Gözleme başlamak için ilk çocuk ekleme alanı açıldı.",
      );
      return;
    }
    if (!configuredClassroom?.curriculumProfile) {
      setClassroomOpen(true);
      setAnnouncement("Hızlı gözlem için önce sınıf ve program kurulumunu tamamlayın.");
      return;
    }
    if (configuredClassroom.curriculumProfile.framework !== "tymm") {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      setAnnouncement(
        "Eski EÇE kayıtları salt okunur korunuyor. Yeni gözlem için Maarif Modeli sınıfını oluşturun.",
      );
      return;
    }
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }

    const focusedReturnTarget =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    if (!d1ReturnFocusRef.current?.isConnected) {
      d1ReturnFocusRef.current = focusedReturnTarget;
    }
    d1ReturnFocusStudentIdRef.current = initialStudentId ?? null;
    d1ReturnToProfileRef.current = studentProfileOpen;
    keyboard.hide();
    surfaceTransitionRef.current = "evidence-flow";
    setCaptureMenuOpen(false);
    setObservationOpening(true);
    await yieldToInteractivePaint();
    try {
      const now = new Date();
      const today = civilDateInIstanbul(now);
      const liveEvidence =
        evidenceWorkspace.civilDate === today
          ? evidenceWorkspace
          : await loadEvidenceWorkspace(store, { now });
      if (liveEvidence !== evidenceWorkspace) setEvidenceWorkspace(liveEvidence);
      const resolution = resolveObservationContext(liveEvidence, {
        ...(initialStudentId ? { studentId: initialStudentId } : {}),
      });
      if (resolution.kind === "use-activity") {
        setObservationContextChoice(null);
        await openActivityEvidence(
          resolution.activity.id,
          initialStudentId,
          resolution.activity,
          initialDraft,
          activityStartPolicy,
        );
        return;
      }
      if (resolution.kind === "choose-activity") {
        keyboard.hide();
        surfaceTransitionRef.current = "capture-menu";
        setStudentProfileOpen(false);
        setObservationContextChoice({
          activities: resolution.activities,
          civilDate: liveEvidence.civilDate,
          spontaneousStudentId: student.id,
          ...(initialStudentId ? { initialStudentId } : {}),
          ...(initialDraft ? { initialDraft } : {}),
          activityStartPolicy,
        });
        setCaptureMenuOpen(true);
        setAnnouncement(
          "Birden fazla gerçek etkinlik uygun. Gözlemin ait olduğu etkinliği seçin veya plan dışı kaydedin.",
        );
        return;
      }
      setObservationContextChoice(null);
      await openSpontaneousObservation(
        student,
        liveEvidence.civilDate,
        initialStudentId,
        initialDraft,
      );
    } catch (reason) {
      surfaceTransitionRef.current = null;
      setAnnouncement(
        reason instanceof Error
          ? reason.message
          : "Bugünün plan bağlamı doğrulanamadı; anlık gözlem güvenlik için açılmadı.",
      );
    } finally {
      setObservationOpening(false);
    }
  };

  const openTymmAgeGuide = () => {
    const nextAgeBand = currentClassTymmAgeBand ?? tymmGuideAgeBand;
    const nextGuide = getTymmAgeGuide(nextAgeBand) ?? tymmAgeGuides[0];
    setTymmGuideAgeBand(nextGuide.ageBand);
    setTymmGuideDomain(nextGuide.domainOutcomeCounts[0].domain);
    setTymmGuideTemplateId(nextGuide.choiceTemplates[0].id);
    setTymmGuideStudentId((current) =>
      students.some((student) => student.id === current)
        ? current
        : students[0]?.id ?? "",
    );
    surfaceTransitionRef.current = "tymm-guide";
    setTymmGuideOpen(true);
    setAnnouncement(
      "TYMM 2024 yaş rehberi açıldı. Üç resmî yaş bandı ve gözetimli çocuk seçimleri hazır.",
    );
  };

  const selectTymmGuideAge = (ageBand: TymmAgeGuideReadModel["ageBand"]) => {
    const guide = getTymmAgeGuide(ageBand);
    if (!guide) return;
    setTymmGuideAgeBand(guide.ageBand);
    setTymmGuideDomain(guide.domainOutcomeCounts[0].domain);
    setTymmGuideTemplateId(guide.choiceTemplates[0].id);
  };

  const startTymmChildParticipation = () => {
    if (childParticipationBlockedReason || !selectedTymmStudent) {
      setAnnouncement(childParticipationBlockedReason);
      return;
    }
    keyboard.hide();
    surfaceTransitionRef.current = "tymm-child";
    setTymmGuideOpen(false);
    setTymmChildSession({
      guide: selectedTymmGuide,
      template: selectedTymmTemplate,
      student: selectedTymmStudent,
    });
    setAnnouncement(
      `${selectedTymmStudent.preferredName ?? selectedTymmStudent.name} için gözetimli çocuk ekranı açıldı.`,
    );
  };

  const handoffTymmChildParticipation = (choice: TymmAgeGuideChoice | null) => {
    const session = tymmChildSession;
    if (!session) return;
    setTymmChildSession(null);
    if (!choice) {
      surfaceTransitionRef.current = "tymm-guide";
      setTymmGuideOpen(true);
      setAnnouncement(
        "Çocuk seçim yapmamayı tercih etti; hiçbir kayıt veya değerlendirme oluşturulmadı.",
      );
      return;
    }
    if (educationalWriteNotice) {
      surfaceTransitionRef.current = "tymm-guide";
      setTymmGuideOpen(true);
      setAnnouncement(
        `${educationalWriteNotice} Çocuğun seçimi kaydedilmedi.`,
      );
      return;
    }
    const initialDraft: EvidenceCaptureSeed = {
      rawText: `Gözetimli çocuk katılımı sırasında “${choice.label}” seçeneğine dokundu. Bu cümle yalnız gözlenen dokunuşu belirtir; öğretmen gözlemini ekleyip doğrulamalıdır.`,
      context: `MaarifOS özgün katılım şablonu · TYMM ${session.guide.ageLabel} · ${session.template.title} · ${choice.id}`,
      childQuote: "",
      observationType: "quick-note",
      categoryIds: ["play-participation"],
    };
    setAnnouncement(
      "Çocuk seçimi değerlendirmeye dönüşmedi; öğretmen incelemesi için düzenlenebilir gözlem taslağı açılıyor.",
    );
    void openStudentObservation(session.student.id, initialDraft, "preserve");
  };

  const openCaptureEntry = (options: ActivityStudioOpenOptions = {}) => {
    if (
      configuredClassroom &&
      configuredClassroom.curriculumProfile?.framework !== "tymm"
    ) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      setAnnouncement("Maarif Modeli sınıfını oluşturun.");
      return;
    }
    keyboard.hide();
    setDocumentsOpen(false);
    setPlansOpen(false);
    setPlanFlowOpen(false);
    setCalendarOpen(false);
    setCaptureMenuOpen(false);
    setObservationContextChoice(null);
    studioOpenOptionsRef.current = options;
    navigatePrimaryRoute("activities");
  };

  const openObservationActions = (observationId?: string, studentId?: string) => {
    keyboard.hide();
    setStudentProfileOpen(false);
    setCaptureMenuOpen(false);
    surfaceTransitionRef.current = "action-completion";
    setCompletionRequest({ observationId, studentId });
  };

  const openPendingObservation = (requestedObservation?: EvidenceObservationSummary) => {
    const observation = requestedObservation ?? evidenceWorkspace.pendingObservations[0];
    openObservationActions(observation?.id, observation?.studentId);
  };

  const openObservationProgramLinks = (
    requestedObservation?: EvidenceObservationSummary,
  ) => {
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }
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
      contextKind: "planned-activity" as const,
      ...(pending.premiumProvenance
        ? { premiumProvenance: pending.premiumProvenance }
        : {}),
    };
    d1ReturnFocusRef.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setStudentProfileOpen(false);
    setCompletionRequest(null);
    surfaceTransitionRef.current = "evidence-flow";
    setEvidenceFlowRequest({ activity, pendingObservation: pending });
  };

  const openPendingAssessment = (
    observation: EvidenceObservationSummary,
  ) => {
    if (educationalWriteNotice) {
      setClassroomOpen(true);
      setAnnouncement(educationalWriteNotice);
      return;
    }
    if (observation.workflowStatus !== "değerlendirme-bekliyor") {
      setAnnouncement("Bu gözlem için bekleyen bir değerlendirme adımı yok.");
      return;
    }
    const target = observation.confirmedCurriculumTargets[0];
    if (!target) {
      setAnnouncement(
        "Program bağlantısının kaynak bilgisi güvenle çözümlenemedi; değerlendirme açılmadı.",
      );
      return;
    }
    const activity = evidenceWorkspace.activities.find(
      (item) => item.id === observation.activityId,
    ) ?? {
      id: observation.activityId,
      planId: observation.planId,
      title: observation.activityTitle,
      startTime: "00:00",
      status: "completed" as const,
      civilDate: observation.civilDate,
      curriculumProfile: observation.curriculumProfile,
      curriculumTargets: observation.plannedCurriculumTargets,
      assignedStudentIds: [observation.studentId],
      assignmentMode: "legacy-unscoped" as const,
      contextKind: "planned-activity" as const,
      ...(observation.premiumProvenance
        ? { premiumProvenance: observation.premiumProvenance }
        : {}),
    };
    d1ReturnFocusRef.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setStudentProfileOpen(false);
    surfaceTransitionRef.current = "evidence-flow";
    setEvidenceFlowRequest({
      activity,
      pendingObservation: observation,
      assessmentTarget: target,
    });
  };

  const saveAnecdoteDocumentDraft = async (
    observationId: string,
    values: {
      observedLocation: string;
      observerGeneralAssessment: string;
    },
  ) => {
    if (educationalWriteNotice) throw new Error(educationalWriteNotice);
    if (writesBlocked) {
      throw new Error(
        "Cihaz verileri yazmaya hazır değil; anekdot taslağı güvenlik için kaydedilmedi.",
      );
    }
    const targetPremiumPack = premiumPackForEvidence(
      allEvidenceObservations.find((item) => item.id === observationId)
        ?.premiumProvenance,
    );
    setDataBusy(true);
    try {
      const { saveAnecdoteFormDraft } = await import(
        "./features/anecdote/anecdote-form.ts"
      );
      await enqueuePersistence(
        () =>
          saveAnecdoteFormDraft(store, {
            observationId,
            ...values,
          }),
        {
          educationalWrite: {},
          ...(targetPremiumPack !== undefined
            ? { premiumPack: targetPremiumPack }
            : {}),
          failureDetail:
            "Anekdot formu taslağı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Anekdot formu taslağı bu cihazda korundu.",
        },
      );
      await refreshAnecdoteDocuments();
      setAnnouncement("Anekdot formu taslağı bu cihazda korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const approveAnecdoteDocument = async (
    observationId: string,
    values: {
      observedLocation: string;
      observerGeneralAssessment: string;
    },
  ) => {
    if (educationalWriteNotice) throw new Error(educationalWriteNotice);
    if (writesBlocked) {
      throw new Error(
        "Cihaz verileri yazmaya hazır değil; anekdot onayı güvenlik için kaydedilmedi.",
      );
    }
    const targetPremiumPack = premiumPackForEvidence(
      allEvidenceObservations.find((item) => item.id === observationId)
        ?.premiumProvenance,
    );
    setDataBusy(true);
    try {
      const { approveAnecdoteForm, saveAnecdoteFormDraft } = await import(
        "./features/anecdote/anecdote-form.ts"
      );
      await enqueuePersistence(
        async () => {
          await saveAnecdoteFormDraft(store, {
            observationId,
            ...values,
          });
          return approveAnecdoteForm(store, { observationId });
        },
        {
          educationalWrite: {},
          ...(targetPremiumPack !== undefined
            ? { premiumPack: targetPremiumPack }
            : {}),
          failureDetail:
            "Anekdot formu onaylanamadı. Ham gözlem ve önceki taslak korundu.",
          successDetail:
            "Anekdot formu öğretmen incelemesiyle belgeye hazırlandı.",
        },
      );
      await refreshAnecdoteDocuments();
      setAnnouncement(
        "Anekdot formu öğretmen incelemesiyle görsel PDF ve düzenlenebilir Word çıktısına hazırlandı.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const downloadAnecdoteDocument = async (
    observationId: string,
    format: AnecdoteExportFormat,
  ) => {
    const refreshed = await refreshAnecdoteDocuments();
    const form = refreshed.forms.find(
      (candidate) => candidate.observationId === observationId,
    );
    if (!form) throw new Error("Dışa aktarılacak anekdot formu bulunamadı.");
    const { generateAnecdoteExportFile } = await import(
      "./features/anecdote/export-document.ts"
    );
    const file = await generateAnecdoteExportFile(form, format);
    downloadBytes(file.fileName, file.mimeType, file.bytes);
    setAnnouncement(
      format === "pdf"
        ? "Anekdot Kayıt Formu PDF önizlemesi hazır; inceleyip indirebilir veya paylaşabilirsiniz."
        : "Anekdot Kayıt Formu düzenlenebilir Word belgesi olarak indirildi.",
    );
  };

  const openAnecdoteCurriculumLink = (observationId: string) => {
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
    const observation = allEvidenceObservations.find(
      (candidate) => candidate.id === observationId,
    );
    if (!observation) {
      setAnnouncement(
        "Anekdot gözleminin program bağlantısı açılamadı; gözlem arşivini kontrol edin.",
      );
      return;
    }
    setDocumentsOpen(false);
    openPendingObservation(observation);
  };

  const createPlanAndStart = async (command: PlanCreationCommand) => {
    const requestNow = new Date();
    const requestOperationalStatus = configuredClassroom
      ? academicYearOperationalStatus(
          configuredClassroom.academicYearStart,
          configuredClassroom.academicYearEnd,
          civilDateInIstanbul(requestNow),
          configuredClassroom.academicYearOperationalStart,
        )
      : null;
    const futurePlanPreparation = configuredClassroom !== null &&
      isAcademicYearPlanWriteAllowed({
        operationalStatus: requestOperationalStatus ?? "ended",
        academicYearStart: configuredClassroom.academicYearStart,
        academicYearEnd: configuredClassroom.academicYearEnd,
        civilDate: command.civilDate,
        hasPreparedPlanContext:
          command.premiumSource !== undefined ||
          command.teacherOwnedDailyFlowBlocks !== undefined,
      });
    if (configuredClassroom && !futurePlanPreparation) {
      throw new Error(
        academicYearOperationalNotice({
          status: requestOperationalStatus!,
          startDate: configuredClassroom.academicYearStart,
          endDate: configuredClassroom.academicYearEnd,
        }) ?? "Eğitim yılı yeni plan için etkin değildir.",
      );
    }
    if (command.premiumSource) {
      assertPremiumMutationAccessNow(command.premiumSource.contentPack);
    }
    if (!configuredClassroom?.curriculumProfile) {
      throw new Error("Sınıfın program profili tamamlanmalıdır.");
    }
    const curriculumProfile = configuredClassroom.curriculumProfile;
    let commitCivilDate = civilDateInIstanbul(requestNow);
    const result = await enqueuePersistence(
      async () => {
        const commitNow = new Date();
        commitCivilDate = civilDateInIstanbul(commitNow);
        const created = await createPlanWithActivity(store, {
          ...command,
          curriculumProfile,
          now: commitNow,
          initialActivityStatus:
            command.civilDate === commitCivilDate ? "in_progress" : "planned",
        });
        return created;
      },
      {
        educationalWrite: requestOperationalStatus === "preparation"
          ? { allowPreparationForCivilDate: command.civilDate }
          : {},
        ...(command.premiumSource
          ? { premiumPack: command.premiumSource.contentPack }
          : {}),
        failureDetail:
          "Günlük plan bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
        successDetail: "Günlük plan ve ilk etkinlik bu cihaza kaydedildi.",
      },
    );
    let refreshed: Awaited<ReturnType<typeof refreshD1Workspaces>> | null = null;
    try {
      refreshed = await refreshD1Workspaces();
    } catch {
      refreshed = null;
    }
    const refreshedActivity = refreshed?.evidence.activities.find(
      (item) => item.id === result.activity.id,
    ) ?? null;
    const committedReadRequiresRefresh =
      !refreshed ||
      (command.civilDate === commitCivilDate && !refreshedActivity);
    if (command.civilDate !== commitCivilDate || committedReadRequiresRefresh) {
      const activity = result.activity;
      surfaceTransitionRef.current = null;
      setPlanFlowOpen(false);
      setPremiumDailyTemplate(null);
      setScheduledPlanEditDraft(null);
      setFuturePlanNotice({
        planId: result.plan.id,
        civilDate: command.civilDate,
        activityTitle: String(activity.title),
        ...(committedReadRequiresRefresh ? { refreshRequired: true } : {}),
      });
      setAnnouncement(
        committedReadRequiresRefresh
          ? `${activity.title} cihaza kaydedildi; ekran verileri yenilenemedi. Aynı planı yeniden kaydetmeyin, cihaz verilerini yenileyin.`
          : `${activity.title} ${command.civilDate} tarihi için planlandı. Etkinlik ve gözlem, plan gününde başlatılabilir.`,
      );
      return;
    }
    if (!refreshedActivity) {
      surfaceTransitionRef.current = null;
      setPlanFlowOpen(false);
      setPremiumDailyTemplate(null);
      setScheduledPlanEditDraft(null);
      setFuturePlanNotice({
        planId: result.plan.id,
        civilDate: command.civilDate,
        activityTitle: String(result.activity.title),
        refreshRequired: true,
      });
      setAnnouncement(
        `${result.activity.title} cihaza kaydedildi; ekran verileri yenilenemedi. Aynı planı yeniden kaydetmeyin, cihaz verilerini yenileyin.`,
      );
      return;
    }
    surfaceTransitionRef.current = "evidence-flow";
    setPlanFlowOpen(false);
    setEvidenceFlowRequest({ activity: refreshedActivity });
    setAnnouncement(`${refreshedActivity.title} başladı. İlk gözlem notunu ekleyebilirsiniz.`);
  };

  const updateFuturePlan = async (command: PlanUpdateCommand) => {
    const scheduledPlan = scheduledPlanWorkspace.plans.find(
      (plan) => plan.planId === command.planId,
    );
    const requestNow = new Date();
    const requestOperationalStatus = configuredClassroom
      ? academicYearOperationalStatus(
          configuredClassroom.academicYearStart,
          configuredClassroom.academicYearEnd,
          civilDateInIstanbul(requestNow),
          configuredClassroom.academicYearOperationalStart,
        )
      : null;
    const futurePlanPreparation = configuredClassroom !== null &&
      isAcademicYearPlanWriteAllowed({
        operationalStatus: requestOperationalStatus ?? "ended",
        academicYearStart: configuredClassroom.academicYearStart,
        academicYearEnd: configuredClassroom.academicYearEnd,
        civilDate: command.civilDate,
        hasPreparedPlanContext:
          scheduledPlan?.premium === true ||
          (scheduledPlan?.premium === false && scheduledPlan.flowBlockCount === 10),
      });
    if (configuredClassroom && !futurePlanPreparation) {
      throw new Error(
        academicYearOperationalNotice({
          status: requestOperationalStatus!,
          startDate: configuredClassroom.academicYearStart,
          endDate: configuredClassroom.academicYearEnd,
        }) ?? "Eğitim yılı plan güncellemesi için etkin değildir.",
      );
    }
    let targetPremiumPack: PremiumPackAccessReference | null | undefined;
    if (scheduledPlan?.premium) {
      const snapshot = await store.readSnapshot();
      const storedPlan = snapshot.plans.find((plan) => plan.id === command.planId);
      targetPremiumPack = premiumPackReferenceFromUnknown(
        storedPlan?.sourceContentPackSnapshot,
      );
      assertPremiumMutationAccessNow(targetPremiumPack);
    }
    const result = await enqueuePersistence(
      () => updateScheduledPlanWithActivity(store, command),
      {
        educationalWrite: requestOperationalStatus === "preparation"
          ? { allowPreparationForCivilDate: command.civilDate }
          : {},
        ...(scheduledPlan?.premium
          ? { premiumPack: targetPremiumPack ?? null }
          : {}),
        failureDetail:
          "Gelecek günlük plan güncellenemedi. Önceki kayıt bu cihazda korundu.",
        successDetail:
          "Gelecek günlük plan ve gerçek etkinliği aynı işlemde güncellendi.",
      },
    );
    let refreshRequired = false;
    try {
      await refreshD1Workspaces();
      setSelectedPlanDayWorkspace(
        await loadPlanDayWorkspace(store, { civilDate: command.civilDate }),
      );
    } catch {
      refreshRequired = true;
    }
    surfaceTransitionRef.current = null;
    setPlanFlowOpen(false);
    setScheduledPlanEditDraft(null);
    setFuturePlanNotice({
      planId: result.plan.id,
      civilDate: command.civilDate,
      activityTitle: String(result.activity.title),
      ...(refreshRequired ? { refreshRequired: true } : {}),
    });
    setAnnouncement(
      refreshRequired
        ? `${result.activity.title} cihaza güncellendi; ekran verileri yenilenemedi. Aynı değişikliği yeniden kaydetmeyin, cihaz verilerini yenileyin.`
        : `${result.activity.title} planı güncellendi. Kimlik ve kaynak zinciri korundu.`,
    );
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
    resolveDateContext: async (civilDate, studentId) => {
      if (!isCivilDate(civilDate)) {
        throw new Error("Gözlem günü YYYY-AA-GG biçiminde olmalıdır.");
      }
      const now = new Date();
      const today = civilDateInIstanbul(now);
      if (civilDate > today) {
        throw new Error("Gözlem günü bugünden ileri olamaz.");
      }
      const student = studentId
        ? students.find((candidate) => candidate.id === studentId)
        : students[0];
      if (!student) {
        throw new Error("Gözlem tarihi için önce etkin sınıftan bir çocuk seçin.");
      }
      const targetInstant = new Date(`${civilDate}T12:00:00+03:00`);
      const liveEvidence = await loadEvidenceWorkspace(store, { now: targetInstant });
      const resolution = resolveObservationContext(liveEvidence, {
        ...(studentId ? { studentId } : {}),
      });
      if (resolution.kind === "use-activity") return resolution.activity;
      if (resolution.kind === "choose-activity") {
        throw new Error(
          "Bu günde birden fazla uygun etkinlik var. Gözlemi plan veya takvimde ilgili etkinlikten açın.",
        );
      }
      if (civilDate < today) {
        const historicalActivities = liveEvidence.activities
          .filter(
            (activity) =>
              activity.contextKind === "planned-activity" &&
              (activity.assignedStudentIds.length === 0 ||
                !studentId ||
                activity.assignedStudentIds.includes(studentId)),
          )
          .sort(
            (left, right) =>
              left.startTime.localeCompare(right.startTime) ||
              left.title.localeCompare(right.title, "tr-TR") ||
              left.id.localeCompare(right.id),
          );
        if (historicalActivities.length === 1) return historicalActivities[0]!;
        if (historicalActivities.length > 1) {
          throw new Error(
            "Bu geçmiş günde birden fazla etkinlik var. Gözlemi plan veya takvimde ilgili etkinlikten açın.",
          );
        }
      }
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      const context = await enqueuePersistence(
        () => ensureSpontaneousObservationContext(store, {
          studentId: student.id,
          civilDate,
          now,
        }),
        {
          educationalWrite: {},
          failureDetail:
            "Seçilen günün gözlem bağlamı kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: `${formatTurkishCivilDate(civilDate)} için plan dışı gözlem alanı hazırlandı.`,
        },
      );
      const refreshed = await loadEvidenceWorkspace(store, { now: targetInstant });
      const activity = refreshed.activities.find(
        (candidate) => candidate.id === context.activity.id,
      );
      if (!activity) {
        throw new Error("Seçilen günün gözlem bağlamı yeniden açılamadı.");
      }
      return activity;
    },
    loadDraft: (activity, studentId) =>
      loadQuickObservationDraft(store, {
        studentId,
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      }),
    loadDrafts: (activity, studentIds) =>
      loadQuickObservationDraftCollection(store, {
        studentIds,
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      }),
    loadDraftBatch: async (activity) => {
      const { loadQuickObservationDraftBatch } = await import(
        "./features/evidence/quick-observation-batch-recovery.ts"
      );
      return loadQuickObservationDraftBatch(store, {
        planId: activity.planId,
        activityId: activity.id,
        taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      });
    },
    saveDraft: (activity, input) => {
      if (educationalWriteNotice) {
        return Promise.reject(new Error(educationalWriteNotice));
      }
      return enqueuePersistence(
        () =>
          persistQuickObservationDraft(store, {
            ...input,
            planId: activity.planId,
            activityId: activity.id,
          }),
        {
          ...evidenceMutationGuards(activity.premiumProvenance),
          background: true,
          failureDetail:
            "Gözlem taslağı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Gözlem taslağı bu cihazda korundu.",
        },
      );
    },
    saveDraftBatch: async (activity, input) => {
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      await enqueuePersistence(
        () =>
          persistQuickObservationDraftBatch(store, {
            ...input,
            planId: activity.planId,
            activityId: activity.id,
          }),
        {
          ...evidenceMutationGuards(activity.premiumProvenance),
          background: true,
          failureDetail:
            "Toplu gözlem taslağı bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Toplu gözlem taslağı bu cihazda korundu.",
        },
      );
    },
    capture: async (activity, input) => {
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      const {
        observationId,
        studentId,
        rawText,
        context,
        childQuote,
        observationType,
        categoryIds,
        taxonomyVersion,
        developmentSelection,
      } = input;
      const observedAt = observationInstantForCivilDate(activity.civilDate, new Date());
      const result = await enqueuePersistence(
        () =>
          finalizeQuickObservationDraft(store, {
            studentId,
            observationId,
            observedAt,
            planId: activity.planId,
            activityId: activity.id,
            taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
            draft: {
              rawText,
              ...(context ? { context } : {}),
              ...(childQuote ? { childQuote } : {}),
              observationType,
              categoryIds,
              taxonomyVersion,
              developmentSelection,
            },
          }),
        {
          ...evidenceMutationGuards(activity.premiumProvenance),
          atomicEducationalWrite: true,
          background: true,
          failureDetail:
            "Gözlem notu bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Gözlem notu değiştirilemez ham kayıt olarak kaydedildi.",
        },
      );
      // The immutable local commit above is the save boundary. Refreshing the
      // derived workspaces can be expensive on mobile Safari/WebKit, so it must
      // not keep the observation dialog open after the durable write succeeded.
      lastCompletionRequestRef.current = observationCompletionPromptRef.current
        ? { studentId, observationId: result.observation.id }
        : null;
      setAnnouncement("Gözlem notu bu cihaza kaydedildi.");
      afterInteractivePaint(() => {
        void verifyCommittedObservationRefresh(
          [result.observation.id],
          async () => (await refreshD1Workspaces()).evidence,
        ).then((refresh) => {
          if (refresh.status === "refresh-required") {
            setFuturePlanNotice(null);
            setObservationRefreshNotice({
              activityTitle: activity.title,
              committedObservationIds: refresh.committedObservationIds,
              observationCount: 1,
              reason: refresh.reason,
            });
            setAnnouncement(
              "Gözlem bu cihaza kaydedildi; ekran verileri yenilenemedi. Aynı gözlemi yeniden kaydetmeyin, cihaz verilerini yenileyin.",
            );
            return;
          }
          const observation = refresh.observations[0];
          setObservationRefreshNotice(null);
          setAnnouncement(`${observation.studentName} için gözlem notu kaydedildi.`);
          setFollowupRevision(value => value + 1);
        }).catch(() => {
          setFuturePlanNotice(null);
          setObservationRefreshNotice({
            activityTitle: activity.title,
            committedObservationIds: [result.observation.id],
            observationCount: 1,
            reason: "read-failed",
          });
        });
      });
    },
    captureBatch: async (activity, input) => {
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      const observedAt = observationInstantForCivilDate(activity.civilDate, new Date());
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
          ...evidenceMutationGuards(activity.premiumProvenance),
          atomicEducationalWrite: true,
          background: true,
          failureDetail:
            "Toplu gözlem notları bu cihaza kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Toplu gözlem, her çocuk için ayrı ham kayıt olarak kaydedildi.",
        },
      );
      lastCompletionRequestRef.current = {};
      setAnnouncement(
        `${result.observations.length} çocuk için gözlem notları bu cihaza kaydedildi.`,
      );
      afterInteractivePaint(() => {
        void verifyCommittedObservationRefresh(
          result.observations.map((observation) => observation.id),
          async () => (await refreshD1Workspaces()).evidence,
        ).then((refresh) => {
        if (refresh.status === "refresh-required") {
          setFuturePlanNotice(null);
          setObservationRefreshNotice({
            activityTitle: activity.title,
            committedObservationIds: refresh.committedObservationIds,
            observationCount: result.observations.length,
            reason: refresh.reason,
          });
          setAnnouncement(
            `${result.observations.length} gözlem bu cihaza kaydedildi; ekran verileri yenilenemedi. Aynı gözlemleri yeniden kaydetmeyin, cihaz verilerini yenileyin.`,
          );
          return;
        }
        setObservationRefreshNotice(null);
        setFollowupRevision(value => value + 1);
        setAnnouncement(
          `${result.observations.length} çocuk için ayrı gözlem notları kaydedildi.`,
        );
        }).catch(() => {
          setFuturePlanNotice(null);
          setObservationRefreshNotice({
            activityTitle: activity.title,
            committedObservationIds: result.observations.map(
              (observation) => observation.id,
            ),
            observationCount: result.observations.length,
            reason: "read-failed",
          });
        });
      });
      return result.observations.length;
    },
    confirm: async (observation, target) => {
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      await enqueuePersistence(
        () =>
          confirmObservationCurriculumLink(
            store,
            createObservationCurriculumLinkCommand(observation, target),
          ),
        {
          ...evidenceMutationGuards(observation.premiumProvenance),
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
      if (educationalWriteNotice) throw new Error(educationalWriteNotice);
      await enqueuePersistence(
        () =>
          createCitedAssessmentDraft(store, {
            completeTeacherAssessment: true,
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
          ...evidenceMutationGuards(observation.premiumProvenance),
          failureDetail:
            "Değerlendirme taslağı kaydedilemedi. Yeni yazmalar durduruldu.",
          successDetail: "Kanıta dayalı değerlendirme taslağı kaydedildi.",
        },
      );
      await refreshD1Workspaces();
      setAnnouncement("Kanıta dayalı değerlendirme taslağı kaydedildi.");
    },
  };

  const navigatePrimaryRoute = (routeId: Parameters<typeof navigate>[0]) => {
    const performTransition = () => {
      const replacesOpenSurface = native && activeSurfaceRef.current !== null;
      if (replacesOpenSurface) {
        historyRestoringRef.current = true;
        historySurfaceRef.current = null;
        surfaceTransitionRef.current = null;
        window.history.replaceState(
          appHistoryState(null),
          "",
          window.location.href,
        );
      }
      navigate(routeId, replacesOpenSurface ? { replace: true } : undefined);
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        flushSync(performTransition);
      });
    } else {
      performTransition();
    }
  };

  const handleNav = (id: AlphaPrimaryNavigationId, label: string) => {
    window.dispatchEvent(new CustomEvent("maarif_close_global_overlays"));
    if (id === "capture") {
      keyboard.hide();
      setCaptureMenuOpen(false);
      setDocumentsOpen(false);
      setPlansOpen(false);
      setPremiumGateOpen(false);
      setPremiumPlanOpen(false);
      setPlanFlowOpen(false);
      setCalendarOpen(false);
      void openStudentObservation();
      return;
    }
    if (id === "classroom") {
      keyboard.hide();
      setCaptureMenuOpen(false);
      setDocumentsOpen(false);
      setPlansOpen(false);
      setPremiumGateOpen(false);
      navigatePrimaryRoute("classroom");
      setAnnouncement("Sınıfım bölümü açıldı.");
      return;
    }
    if (id === "plans") {
      keyboard.hide();
      setCaptureMenuOpen(false);
      setDocumentsOpen(false);
      setPlansOpen(false);
      setPremiumGateOpen(false);
      setPremiumPlanOpen(false);
      setPlanFlowOpen(false);
      setCalendarOpen(false);
      navigatePrimaryRoute("plans");
      setAnnouncement("Plan çalışma alanı açıldı.");
      return;
    }
    if (id === "documents") {
      keyboard.hide();
      setCaptureMenuOpen(false);
      setPlansOpen(false);
      setPremiumGateOpen(false);
      setPremiumPlanOpen(false);
      setPlanFlowOpen(false);
      setCalendarOpen(false);
      setDocumentsOpen(false);
      navigatePrimaryRoute("documents");
      setAnnouncement("Belge ve kayıt çalışma alanı açıldı.");
      return;
    }
    setCaptureMenuOpen(false);
    setDocumentsOpen(false);
    setPlansOpen(false);
    setPremiumGateOpen(false);
    navigatePrimaryRoute("today");
    setAnnouncement(`${label} bölümü seçildi.`);
  };

  const openTeacherPlanRecords = (
    levelId: Exclude<PlanWorkbenchLevelId, "daily">,
    monthKey: string | null = null,
    planId: string | null = null,
  ) => {
    keyboard.hide();
    setTeacherPlanRecordsInitialLevel(levelId);
    setTeacherPlanRecordsInitialMonthKey(monthKey);
    setTeacherPlanRecordsInitialPlanId(planId);
    setPlansOpen(false);
    setDocumentsOpen(false);
    setPremiumGateOpen(false);
    setPremiumPlanOpen(false);
    surfaceTransitionRef.current = "teacher-plan-records";
    setTeacherPlanRecordsOpen(true);
    setAnnouncement("Bu cihazdaki öğretmen planları açıldı.");
  };

  const openGuidedDailyPlanning = (civilDate = preparationPlanningWindow.defaultCivilDate ?? todayWorkspace.civilDate) => {
    keyboard.hide();
    setTeacherPlanRecordsOpen(false);
    setPlansOpen(false);
    setCaptureMenuOpen(false);
    setCompletionRequest(null);
    surfaceTransitionRef.current = "plan-guidance";
    setPlanGuidanceCivilDate(civilDate);
  };

  const openPlanWorkbenchLevel = (levelId: PlanWorkbenchLevelId) => {
    const destination = destinationForPlanLevel(levelId, teacherWorkCycle);
    if (destination === "teacher-records" && levelId !== "daily") {
      openTeacherPlanRecords(levelId);
      return;
    }
    if (destination === "premium-library") {
      if (levelId === "daily") {
        openGuidedDailyPlanning();
      } else {
        openTeacherPlanRecords(levelId);
      }
      return;
    }
    const dailyState = teacherWorkCycle.daily;
    if (destination === "daily-conflict-review") {
      void openAcademicCalendar(attendanceCivilDate).then(() => {
        setAnnouncement(
          `${dailyState.conflictingPlanIds.length} günlük plan aynı tarihte bulundu. Yeni plan oluşturulmadı; kayıtları inceleyip çakışmayı çözün.`,
        );
      });
      return;
    }
    if (
      (dailyState.status === "chain-mismatch" ||
        dailyState.status === "future-only") &&
      dailyState.referenceCivilDate
    ) {
      void openAcademicCalendar(dailyState.referenceCivilDate).then(() => {
        setAnnouncement(
          dailyState.status === "chain-mismatch"
            ? "Bugün tarihli plan korundu; haftalık plan bağı takvimde incelemeye açıldı."
            : `Yaklaşan plan ${dailyState.referenceCivilDate} tarihinde takvimde açıldı.`,
        );
      });
      return;
    }
    if (planWritesDisabled) {
      setClassroomOpen(true);
      setAnnouncement(
        educationalWriteNotice ??
          "Günlük plan için bugün etkin olan eğitim yılını seçin.",
      );
      return;
    }
    if (teacherWorkCycle.daily.planId) {
      openTodayPlans();
      return;
    }
    openGuidedDailyPlanning();
  };

  const openDocumentWorkspaceItem = (itemId: DocumentWorkspaceItemId) => {
    const planDestination = destinationForPlanDocument(itemId, teacherWorkCycle);
    if (planDestination === "teacher-records") {
      openTeacherPlanRecords(itemId === "monthly" ? "monthly" : "annual");
      return;
    }
    if (planDestination === "premium-library") {
      openTeacherPlanRecords(itemId === "monthly" ? "monthly" : "annual");
      return;
    }
    if (itemId === "students" && students.length + archivedStudents.length === 0) {
      setStudentAddOpen(true);
      setAnnouncement("İlk öğrenci kaydı formu açıldı.");
      return;
    }
    setDocumentsInitialSection(itemId === "anecdotes" ? "anecdotes" : "students");
    surfaceTransitionRef.current = "documents";
    setDocumentsOpen(true);
    setAnnouncement(
      itemId === "anecdotes"
        ? "Anekdot belge hazırlama alanı açıldı."
        : "Öğrenci dosyası hazırlama alanı açıldı.",
    );
  };

  const prepareSimpleClassRosterPdfInput = async () => {
    const snapshot = await store.readSnapshot();
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Sınıf listesi için önce okul ve sınıf kurulumunu tamamlayın.");
    }
    const documentClassroom = snapshot.classrooms.find(record => record.id === scope.classroomId && record.academicYearId === scope.academicYearId);
    const schoolName = typeof documentClassroom?.schoolName === "string" ? documentClassroom.schoolName.trim() : "";
    const teacherName = typeof documentClassroom?.teacherName === "string" ? documentClassroom.teacherName.trim() : "";
    if (!schoolName || !teacherName) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Belge için okul adı ve öğretmen adı soyadını bir kez yazın.");
    }
    if (!snapshot.students.some(record => record.classroomId === scope.classroomId && record.academicYearId === scope.academicYearId && record.active !== false && typeof record.deletedAt !== "string")) {
      navigatePrimaryRoute("classroom");
      setStudentAddOpen(true);
      throw new Error("Sınıf listesi için önce ilk çocuğu ekleyin.");
    }
    return {
      scope,
      snapshot,
      schoolName,
      teacherName,
      generatedAt: new Date().toISOString(),
    };
  };

  const downloadSimpleClassRoster = async (layout: ClassRosterLayoutId = "single-page-roster") => {
    const [input, { downloadSimpleClassRosterPdf }, { classRosterInputForPurpose }] = await Promise.all([
      prepareSimpleClassRosterPdfInput(),
      import("./features/classroom/class-roster-file-actions.ts"),
      import("./features/classroom/class-roster-layouts.ts"),
    ]);
    const summary = await downloadSimpleClassRosterPdf(classRosterInputForPurpose({ ...input, columns: undefined }, layout), prepareSimpleClassRosterPdfInput);
    setAnnouncement(
      `${summary.rowCount} öğrencilik sınıf listesi hazır. Alanları seçerek yazdırabilir, Excel'e çıkarabilir veya PDF indirebilirsiniz.`,
    );
  };

  const shareSimpleClassRoster = async () => {
    const [input, { shareSimpleClassRosterPdf }, { classRosterInputForPurpose }] = await Promise.all([
      prepareSimpleClassRosterPdfInput(),
      import("./features/classroom/class-roster-file-actions.ts"),
      import("./features/classroom/class-roster-layouts.ts"),
    ]);
    const result = await shareSimpleClassRosterPdf(classRosterInputForPurpose(input, "single-page-roster"), prepareSimpleClassRosterPdfInput);
    setAnnouncement(
      result === "shared"
        ? "Sınıf listesi hassas veri onayıyla paylaşım ekranına gönderildi."
        : result === "downloaded"
          ? "Dosya paylaşımı desteklenmedi; sınıf listesi görsel PDF olarak indirildi."
          : "Sınıf listesi paylaşımı iptal edildi; dosya gönderilmedi.",
    );
    return result;
  };

  const downloadSimpleObservation = async (request: {
    studentId: string;
    audience: SimpleObservationDocumentAudience;
    period: SimpleObservationPeriod;
  }) => {
    const snapshot = await store.readSnapshot();
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope || !configuredClassroom) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Gözlem belgesi için önce okul ve sınıf kurulumunu tamamlayın.");
    }
    const schoolName = configuredClassroom.schoolName?.trim();
    const teacherName = configuredClassroom.teacherName?.trim();
    if (!schoolName || !teacherName) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Belge için okul adı ve öğretmen adı soyadını bir kez yazın.");
    }
    const [
      { createSimpleObservationPdfDocument },
      { shareSimpleObservationDocumentWithDownloadFallback },
    ] = await Promise.all([
      import("./features/reports/simple-observation-document.ts"),
      import("./features/reports/simple-observation-share.ts"),
    ]);
    const file = await createSimpleObservationPdfDocument({
      audience: request.audience,
      scope,
      snapshot,
      studentId: request.studentId,
      schoolName,
      teacherName,
      classroomName: configuredClassroom.classroomName,
      academicYearName: configuredClassroom.academicYearName,
      period: request.period,
      generatedAt: new Date().toISOString(),
    });
    const result =
      await shareSimpleObservationDocumentWithDownloadFallback(file);
    setAnnouncement(
      result === "shared"
        ? `${file.observationCount} kayıt içeren ${request.audience === "parent" ? "veli" : "idare"} gözlem özeti paylaşım ekranına gönderildi.`
        : result === "downloaded"
          ? `${file.observationCount} kayıt içeren gözlem özeti bu cihaza indirildi.`
          : "Gözlem özeti paylaşımı iptal edildi; dosya gönderilmedi.",
    );
    return result;
  };

  const downloadSimplePlan = async (
    kind: "annual" | "monthly" | "weekly" | "daily",
  ) => {
    if (!configuredClassroom) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Plan belgesi için önce sınıf kurulumunu tamamlayın.");
    }
    if (
      !configuredClassroom.schoolName?.trim() ||
      !configuredClassroom.teacherName?.trim()
    ) {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      throw new Error("Plan belgesi için okul ve öğretmen adını bir kez yazın.");
    }
    const [{ loadTeacherOwnedPlanGraph }, { generateStandaloneTeacherOwnedPlanExportFile }] =
      await Promise.all([
        import("./features/planning/teacher-owned-plan-service.ts"),
        import("./features/planning/teacher-owned-plan-document.ts"),
      ]);
    const graph = await loadTeacherOwnedPlanGraph(store);
    if (!graph) {
      openTeacherPlanRecords(kind === "daily" ? "annual" : kind);
      throw new Error("Henüz kaydedilmiş plan zinciri yok. Plan alanı açıldı.");
    }

    if (kind === "annual" && !teacherWorkCycle.documents.planDocumentReady) {
      openTeacherPlanRecords("annual");
      throw new Error(
        "Yıllık çıktı için yıllık planı ve en az bir aylık planı tamamlayın.",
      );
    }

    let scope: TeacherOwnedPlanDocumentScope = { kind: "combined" };
    if (kind === "monthly") {
      if (!teacherWorkCycle.monthly?.id) {
        openTeacherPlanRecords("monthly");
        throw new Error("Aylık planı kaydedin; ardından belge tek dokunuşla hazırlanır.");
      }
      scope = { kind: "monthly", monthlyPlanId: teacherWorkCycle.monthly.id };
    } else if (kind === "weekly") {
      if (!teacherWorkCycle.weekly?.id) {
        openTeacherPlanRecords("weekly");
        throw new Error("Haftalık akışı kaydedin; ardından belge tek dokunuşla hazırlanır.");
      }
      scope = { kind: "weekly", weeklyPlanId: teacherWorkCycle.weekly.id };
    } else if (kind === "daily") {
      if (!teacherWorkCycle.daily.planId) {
        openPlanWorkbenchLevel("daily");
        throw new Error("Bugünün planını kaydedin; ardından belge tek dokunuşla hazırlanır.");
      }
      scope = { kind: "daily", dailyPlanId: teacherWorkCycle.daily.planId };
    }

    const file = await generateStandaloneTeacherOwnedPlanExportFile(
      graph,
      store,
      "pdf",
      scope,
      {
        schoolName: configuredClassroom.schoolName,
        teacherName: configuredClassroom.teacherName,
        classroomName: configuredClassroom.classroomName,
        academicYearName: configuredClassroom.academicYearName,
        ageGroup: configuredClassroom.ageGroup,
        curriculumProgram: CURRICULUM_PROGRAM_LABELS.tymm,
      },
    );
    downloadBytes(file.fileName, file.mimeType, file.bytes);
    setAnnouncement(`${kind === "annual" ? "Yıllık" : kind === "monthly" ? "Aylık" : kind === "weekly" ? "Haftalık" : "Günlük"} plan görsel PDF belgesi hazırlandı.`);
  };

  const openSetupProgressStep = (stepId: SetupProgressStepId) => {
    if (stepId === "classroom") {
      setClassroomSetupSection("period");
      setClassroomOpen(true);
      setAnnouncement(
        configuredClassroom
          ? "Sınıf ve eğitim yılı ayarları açıldı."
          : "İlk adım: eğitim yılı ve sınıf bilgilerini tamamlayın.",
      );
      return;
    }
    if (stepId === "students") {
      if (!configuredClassroom) {
        setClassroomOpen(true);
        setAnnouncement("Çocuk listesinden önce eğitim yılı ve sınıfı kurun.");
        return;
      }
      navigate("classroom");
      if (students.length === 0) setStudentAddOpen(true);
      setAnnouncement(
        students.length === 0
          ? "İkinci adım: ilk çocuğu ekleyin."
          : "Sınıf listesi açıldı.",
      );
      return;
    }
    if (stepId === "plan") {
      if (!configuredClassroom || students.length === 0) {
        setAnnouncement("Planlamadan önce sınıf ve çocuk listesini tamamlayın.");
        return;
      }
      navigate("plans");
      setAnnouncement("Üçüncü adım: ilk plan zincirini hazırlayın.");
      return;
    }
    setSettingsInitialSection("backup");
    setProfileOpen(true);
    setAnnouncement("Dördüncü adım: ilk şifreli yedeği oluşturun.");
  };

  useEffect(() => {
    if (!documentsOpen) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          `[data-documents-section="${documentsInitialSection}"]`,
        )
        ?.scrollIntoView({ block: "start" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [documentsInitialSection, documentsOpen]);

  useEffect(() => {
    if (!profileOpen || settingsInitialSection === "overview") return;
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-settings-section="${settingsInitialSection}"]`)
        ?.scrollIntoView({ block: "start" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [profileOpen, settingsInitialSection]);

  useEffect(() => {
    const openAccount = () => {
      keyboard.hide();
      setSettingsInitialSection("account");
      setProfileOpen(true);
    };
    window.addEventListener("maarif_open_account", openAccount);
    return () => window.removeEventListener("maarif_open_account", openAccount);
  }, [keyboard]);

  const changeAttendanceOpen = (open: boolean) => {
    if (open && educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
    if (!open) keyboard.hide();
    setAttendanceOpen(open);
  };

  const openDayClosure = async (civilDate=civilDateInIstanbul(new Date())) => {
    if (educationalWriteNotice) {
      setAnnouncement(educationalWriteNotice);
      return;
    }
    setDayClosureBusy(true);
    setDayClosureError("");
    try {
      const workspace = await loadTeacherDayClosureWorkspace(store, {
        civilDate,
      });
      setDayClosureWorkspace(workspace);
      setDayClosureNote(workspace.latestClosure?.nextDayNote ?? "");
      setDayClosureOpen(true);
      setAnnouncement(
        workspace.issues.length === 0
          ? "Gün sonu kapanışı doğrulandı; kayıt özeti hazır."
          : `${workspace.issues.length} açık iş gün sonu kapanışında görünür tutuluyor.`,
      );
    } catch (reason) {
      const detail =
        reason instanceof Error && reason.message.trim()
          ? reason.message
          : "Gün sonu özeti okunamadı; cihaz verileri değiştirilmedi.";
      setDayClosureError(detail);
      setAnnouncement(detail);
    } finally {
      setDayClosureBusy(false);
    }
  };

  const submitDayClosure = async () => {
    if (dayClosureBusy) return;
    const civilDate = dayClosureWorkspace.civilDate;
    setDayClosureBusy(true);
    setDayClosureError("");
    try {
      const record = await enqueuePersistence(
        () =>
          closeTeacherDay(store, {
            civilDate,
            nextDayNote: dayClosureNote,
          }),
        {
          educationalWrite: {},
          failureDetail:
            "Gün sonu kapanışı kaydedilemedi. Açık işler ve öğretmen notu korunuyor.",
          successDetail: "Gün sonu kapanışı bu cihaza kaydedildi.",
        },
      );
      setDayClosureOpen(false);
      setDayClosureNote(record.nextDayNote ?? "");
      setAnnouncement(
        record.closureStatus === "complete"
          ? "Gün tamamlandı olarak kapatıldı; kanıt özeti bu cihazda korundu."
          : "Açık işler yarına taşındı; öğretmen notu ve kanıt özeti bu cihazda korundu.",
      );
      try {
        const refreshed = await loadTeacherDayClosureWorkspace(store, {
          civilDate,
        });
        setDayClosureWorkspace(refreshed);
      } catch {
        setAnnouncement(
          "Gün sonu cihazda kaydedildi; ekran özeti yenilenemedi. Aynı kapanışı yeniden oluşturmayın, cihaz verilerini yeniden açın.",
        );
      }
    } catch (reason) {
      const detail =
        reason instanceof Error && reason.message.trim()
          ? reason.message
          : "Gün sonu kapanışı tamamlanamadı; cihaz verileri değiştirilmedi.";
      setDayClosureError(detail);
      setAnnouncement(detail);
    } finally {
      setDayClosureBusy(false);
    }
  };

  const transitionDayCarryForward = async (input: {
    sourceIssueIdentity: string;
    state: "resolved" | "deferred" | "reopened";
    deferredUntilCivilDate?: string;
  }): Promise<void> => {
    const civilDate = civilDateInIstanbul(new Date());
    await enqueuePersistence(
      () => transitionTeacherDayCarryForward(store, input),
      {
        educationalWrite: {},
        failureDetail:
          "Taşınan iş güncellenemedi. Önceki durum bu cihazda korunuyor.",
        successDetail: "Taşınan işin yeni durumu bu cihaza kaydedildi.",
      },
    );

    try {
      setDayClosureWorkspace(
        await loadTeacherDayClosureWorkspace(store, { civilDate }),
      );
      setAnnouncement(
        input.state === "resolved"
          ? "Taşınan iş çözüldü olarak kaydedildi."
          : input.state === "reopened"
            ? "Taşınan iş yeniden açıldı."
            : `Taşınan iş ${input.deferredUntilCivilDate} tarihine ertelendi.`,
      );
    } catch {
      setAnnouncement(
        "Taşınan iş cihazda kaydedildi; güncel liste yenilenemedi. Aynı işlemi yeniden oluşturmayın, cihaz verilerini yeniden açın.",
      );
    }
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

  const checkForUpdates = () => {
    if (!navigator.onLine) {
      setAnnouncement("Güncelleme denetimi için internet bağlantısı gerekiyor.");
      return;
    }
    setAnnouncement("Yeni MaarifOS sürümü denetleniyor.");
    window.dispatchEvent(new CustomEvent("maarifos:check-update"));
  };

  useEffect(() => {
    if (
      !updateReady ||
      dataBusy ||
      persistenceState.phase !== "ready" ||
      persistenceState.pendingWrites > 0 ||
      activeSurface !== null ||
      route.id !== "today" ||
      document.visibilityState !== "visible"
    ) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const focused = document.activeElement;
      if (
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ||
        focused instanceof HTMLSelectElement ||
        (focused instanceof HTMLElement && focused.isContentEditable)
      ) {
        return;
      }
      void applyReadyUpdate();
    }, 6_000);
    return () => window.clearTimeout(timer);
  }, [
    activeSurface,
    applyReadyUpdate,
    dataBusy,
    persistenceState.pendingWrites,
    persistenceState.phase,
    route.id,
    updateReady,
  ]);

  const retryPersistence = () => {
    if (persistenceState.phase !== "error" || dataBusy) return;
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
  const waitingUpdateVersion = pwaStatus?.updateVersion;
  const displayedUpdateVersion =
    waitingUpdateVersion ?? CURRENT_RELEASE.version;
  const updateCheckBusy =
    pwaStatus?.phase === "checking-update" ||
    pwaStatus?.phase === "installing" ||
    pwaStatus?.phase === "activating-update";
  const updateActionUnavailable =
    !updateReady &&
    (pwaStatus?.phase === "disabled" || pwaStatus?.phase === "unsupported");
  const releaseStatusLabel = updateReady
    ? `${displayedUpdateVersion} hazır`
    : updateCheckBusy
      ? pwaStatus?.phase === "activating-update"
        ? "Etkinleştiriliyor"
        : "Denetleniyor"
      : pwaStatus?.phase === "error"
        ? "Denetlenemedi"
        : pwaStatus?.activeVersion === CURRENT_RELEASE.version
          ? "Güncel"
          : pwaStatus?.activeVersion
            ? "Eşitleme bekliyor"
            : "Hazırlanıyor";
  const documentIdentityReady = Boolean(
    configuredClassroom?.schoolName?.trim() &&
      configuredClassroom.teacherName?.trim(),
  );
  const incompleteRosterStudents = students.filter(
    (student) => classroomRosterDocumentMissingFields(student).length > 0,
  );
  const dailyDocumentReadiness =
    resolveSimpleDailyDocumentReadiness(teacherWorkCycle);
  const simpleDocumentOutputStates = {
    roster: !documentIdentityReady
      ? "needs-setup"
      : students.length > 0
        ? incompleteRosterStudents.length > 0 ? "incomplete" : "ready"
        : "needs-content",
    observations: !documentIdentityReady
      ? "needs-setup"
      : students.length > 0 && allEvidenceObservations.length > 0
        ? "ready"
        : "needs-content",
    monthly: !documentIdentityReady
      ? "needs-setup"
      : teacherWorkCycle.monthly
        ? "ready"
        : "needs-content",
    daily: !documentIdentityReady
      ? "needs-setup"
      : dailyDocumentReadiness.ready
        ? "ready"
        : "needs-content",
    weekly: !documentIdentityReady
      ? "needs-setup"
      : teacherWorkCycle.weekly
        ? "ready"
        : "needs-content",
    annual: !documentIdentityReady
      ? "needs-setup"
      : !teacherWorkCycle.annual
        ? "needs-content"
        : teacherWorkCycle.documents.planDocumentReady
          ? "ready"
          : "incomplete",
  } as const;
  const renderActivityStudio = () => (
    <ActivityStudio
      initialAgeBand={currentClassTymmAgeBand}
      initialActivityId={studioOpenOptionsRef.current.activityId}
      initialScenarioId={studioOpenOptionsRef.current.scenarioId ?? "balanced"}
      initialCollection={studioOpenOptionsRef.current.collection ?? "tumu"}
      onAddToPlan={async (activity, context) => {
        const { PARTICIPATION_ROUTES, PEDAGOGICAL_SCENARIOS } = await import(
          "./features/pedagogical-os/pedagogical-orchestrator.ts"
        );
        const scenario = PEDAGOGICAL_SCENARIOS.find(
          (item) => item.id === context.scenarioId,
        );
        const participationRoute = PARTICIPATION_ROUTES.find(
          (item) => item.id === context.participationRouteId,
        );
        const contextualTitle = [
          activity.title,
          scenario?.shortLabel,
          participationRoute?.label,
        ]
          .filter(Boolean)
          .join(" · ");
        setCaptureMenuOpen(false);
        setAnnouncement(
          `${activity.title}, ${scenario?.shortLabel ?? "seçili sınıf koşulu"} ve ${participationRoute?.label ?? "seçili katılım yolu"} ile plan taslağına taşındı.`,
        );
        const { createPedagogicalPlanBridge } = await import(
          "./features/pedagogical-os/pedagogical-plan-bridge.ts"
        );
        const provenance = createPedagogicalPlanBridge({
          activity,
          civilDate: attendanceCivilDate,
          ageBand: context.ageBand,
          scenarioId: context.scenarioId,
          participationRouteId: context.participationRouteId,
        });
        void openPlanFlow(undefined, contextualTitle, provenance);
      }}
      onApply={async (activity, context) => {
        if (educationalWriteNotice) {
          setAnnouncement(
            `${activity.title} için gözetimli Çocuk Modu önizlemesi açıldı; eğitim yılı gerçek kayıt kullanımına açık olmadığı için uygulama oturumu ve kanıt oluşturulmadı.`,
          );
          return;
        }
        const { ensureActivityStudioApplication } = await import(
          "./features/activity-studio/activity-studio-application.ts"
        );
        const application = await enqueuePersistence(
          () =>
            ensureActivityStudioApplication(store, {
              activity,
              civilDate: attendanceCivilDate,
              ageBand: context.ageBand,
              scenarioId: context.scenarioId,
              participationRouteId: context.participationRouteId,
            }),
          {
            educationalWrite: {},
            failureDetail:
              "Etkinlik uygulama oturumu bu cihaza kaydedilemedi. Gözlem başlatılmadı.",
            successDetail: `${activity.title} uygulama oturumu kaydedildi.`,
          },
        );
        if (application.activity.status === "planned") {
          await enqueuePersistence(
            () =>
              setTodayActivityStatus(
                store,
                application.identity.activityId,
                "in_progress",
              ),
            {
              educationalWrite: {},
              failureDetail:
                "Etkinlik uygulama durumu kaydedilemedi. Gözlem başlatılmadı.",
              successDetail: `${activity.title} uygulanıyor olarak kaydedildi.`,
            },
          );
        }
        await refreshD1Workspaces();
        setAnnouncement(
          application.created
            ? `${activity.title} için uygulama oturumu hazır.`
            : `${activity.title} için bugünkü uygulama oturumu yeniden açıldı.`,
        );
        return application.identity;
      }}
      childModeObservationUnavailableReason={
        educationalWriteNotice
          ? configuredClassroom?.operationalStatus === "preparation"
            ? "Gözlem kaydı için öğretmen ekranına dönün ve “Çalışmayı bugün başlat” ile eğitim yılını gerçek kayıt kullanımına açın. Çizim ve çocuk seçimleri bu önizlemede kalıcı kanıt oluşturmaz."
            : educationalWriteNotice
          : undefined
      }
      onPrint={async (request) => {
        const { previewHtmlPrintDocument } = await import(
          "./features/documents/html-document-pdf.ts"
        );
        await previewHtmlPrintDocument({
          html: request.printable.html,
          title: `${request.activity.title} · MaarifOS`,
          fileName: request.printable.fileName,
        });
        setAnnouncement(`${request.activity.title} PDF önizlemesi hazırlandı.`);
      }}
      onChildChoice={(request) => {
        setAnnouncement(
          request.choice
            ? "Çocuğun dokunuşu puanlanmadı; öğretmen gözlemine dönüştürülmeden ekranda kaldı."
            : "Çocuk seçim yapmadan geri döndü; kayıt oluşturulmadı.",
        );
      }}
      onWriteObservation={async (request) => {
        if (
          !request.application ||
          request.application.sourceActivityId !== request.activity.id
        ) {
          throw new Error(
            "Etkinlik uygulama kimliği doğrulanamadı; gözlem başka bir etkinliğe bağlanmadı.",
          );
        }
        const liveEvidence = await loadEvidenceWorkspace(store, {
          now: new Date(),
        });
        setEvidenceWorkspace(liveEvidence);
        const exactActivity = liveEvidence.activities.find(
          (item) => item.id === request.application?.activityId,
        );
        if (!exactActivity) {
          throw new Error(
            "Uygulanan etkinlik bağlamı yeniden açılamadı; gözlem başka bir plana bağlanmadı.",
          );
        }
        const { createActivityStudioObservationSeed } = await import(
          "./features/activity-studio/activity-observation-seed.ts"
        );
        await openActivityEvidence(
          exactActivity.id,
          students.length === 1 ? students[0]?.id : undefined,
          exactActivity,
          createActivityStudioObservationSeed(request),
          "preserve",
        );
      }}
      onChildModeChange={setActivityChildModeOpen}
      emptyStateAction={
        !currentClassTymmAgeBand ? (
          <button
            type="button"
            className="sheet-primary"
            onClick={() => {
              setClassroomSetupSection("period");
              setClassroomOpen(true);
              setAnnouncement(
                "Etkinlikleri açmak için sınıfın 36–48, 48–60 veya 60–72 ay bandını seçin.",
              );
            }}
          >
            Sınıf profilini tamamla
          </button>
        ) : undefined
      }
    />
  );
  const renderClassroomSetupFields = () => (
    <>
            <section
              id="classroom-setup-period"
              className="classroom-form-section"
              aria-labelledby="classroom-setup-period-title"
            >
              <div className="classroom-form-section-heading">
                <span className="d1-kicker">TEMEL BİLGİLER</span>
                <h3 id="classroom-setup-period-title">Okul, öğretmen ve sınıf</h3>
                <p>Bu bilgileri bir kez yazın; plan ve idare çıktılarında otomatik kullanılsın.</p>
              </div>
              <label htmlFor="school-name">Okul adı</label>
              <KeyboardInput
                id="school-name"
                autoFocus={!academicYearTransitionRequired}
                value={classroomForm.schoolName}
                onChange={(event) => setClassroomForm((current) => ({ ...current, schoolName: event.target.value }))}
                placeholder="Örn. Cumhuriyet Anaokulu"
                autoComplete="organization"
              />
              <label htmlFor="teacher-name">Öğretmen adı soyadı</label>
              <KeyboardInput
                id="teacher-name"
                value={classroomForm.teacherName}
                onChange={(event) => setClassroomForm((current) => ({ ...current, teacherName: event.target.value }))}
                placeholder="Örn. Ayşe Yılmaz"
                autoComplete="name"
              />
              <label htmlFor="classroom-name">Sınıf adı</label>
              <KeyboardInput
                id="classroom-name"
                value={classroomForm.classroomName}
                onChange={(event) => setClassroomForm((current) => ({ ...current, classroomName: event.target.value }))}
                placeholder="Örn. Güneş Sınıfı"
                autoComplete="off"
              />
              <label htmlFor="age-group">Maarif Modeli yaş grubu</label>
              <select
                id="age-group"
                value={classroomForm.ageGroup}
                onChange={(event) =>
                  setClassroomForm((current) => ({
                    ...current,
                    ageGroup: event.target.value,
                  }))
                }
              >
                <option value="">Yaş grubunu seçin</option>
                <option>36–48 ay</option>
                <option>48–60 ay</option>
                <option>60–72 ay</option>
              </select>
            </section>

          <section className="official-calendar-preset">
            <div>
              <span className="d1-kicker">OTOMATİK HAZIR</span>
              <strong>2026–2027 MEB resmî takvimi</strong>
              <small>1. Dönem Aktif · 14 Eylül 2026 – 25 Haziran 2027</small>
            </div>
            {officialAcademicCalendarApplied ? (
              <span className="official-calendar-applied" role="status">
                <CheckCircledIcon aria-hidden="true" /> Uygulandı
              </span>
            ) : (
              <button type="button" onClick={applyOfficialAcademicCalendar}>
                2026–2027 dönemini hazırla
              </button>
            )}
          </section>

          <details className="classroom-calendar-details">
            <summary>
              <span>
                <strong>Takvim ayrıntıları</strong>
                <small>{classroomForm.academicYearName}</small>
              </span>
            </summary>
            {configuredClassroom && !officialAcademicCalendarApplied ? (
              <div className="classroom-current-period" role="status">
                <CalendarIcon aria-hidden="true" />
                <span>
                  <strong>Bu sınıf {configuredClassroom.academicYearName} dönemine bağlı</strong>
                  Yeni dönemi hazırlamak eski yılı sessizce değiştirmez; kaydederken arşivleme ve öğrenci taşıma onayı istenir.
                </span>
              </div>
            ) : null}
            <label htmlFor="academic-year-name">Eğitim yılı</label>
            <KeyboardInput
              id="academic-year-name"
              value={classroomForm.academicYearName}
              onChange={(event) => {
                setClassroomForm((current) => ({ ...current, academicYearName: event.target.value }));
                setAcademicYearTransitionConfirmed(false);
              }}
              autoComplete="off"
            />
            <div className="settings-grid">
              <label htmlFor="academic-year-start">Eğitim yılı başlangıcı
                <KeyboardInput
                  id="academic-year-start"
                  type="date"
                  value={classroomForm.academicYearStart}
                  onChange={(event) => {
                    setClassroomForm((current) => ({ ...current, academicYearStart: event.target.value }));
                    setAcademicYearTransitionConfirmed(false);
                  }}
                />
              </label>
              <label htmlFor="academic-year-end">Eğitim yılı bitişi
                <KeyboardInput
                  id="academic-year-end"
                  type="date"
                  value={classroomForm.academicYearEnd}
                  onChange={(event) => {
                    setClassroomForm((current) => ({ ...current, academicYearEnd: event.target.value }));
                    setAcademicYearTransitionConfirmed(false);
                  }}
                />
              </label>
            </div>
            {classroomFormOperationalNotice ? (
              <div className="academic-year-form-warning" role="alert">
                <CalendarIcon aria-hidden="true" />
                <span>
                  <strong>{classroomForm.academicYearStart > attendanceCivilDate ? "Yeni dönem hazır" : "Seçili tarihler bugün etkin değil"}</strong>
                  {classroomForm.academicYearStart > attendanceCivilDate
                    ? `Sınıf, çocuk listesi ve plan omurgası hazır. Resmî başlangıcı bekleyebilir veya bu sınıfı bugün gerçek kayıt kullanımına açabilirsiniz.`
                    : classroomFormOperationalNotice}
                </span>
                {configuredClassroom?.operationalStatus === "preparation" ? (
                  <button
                    type="button"
                    disabled={dataBusy}
                    onClick={() => void startAcademicYearWorkToday()}
                  >
                    Çalışmayı bugün başlat
                  </button>
                ) : null}
              </div>
            ) : null}
          </details>

          <details
            className="classroom-advanced-settings"
          >
            <summary>
              <span>
                <strong>İleri ayarlar</strong>
                <small>
                  {classroomForm.scheduleKind === "morning"
                    ? "Sabahçı"
                    : classroomForm.scheduleKind === "afternoon"
                      ? "Öğleci"
                      : classroomForm.scheduleKind === "custom"
                        ? "Özel saatler"
                        : "Tam gün · 08:30–16:30"}
                </small>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </summary>
            <section
              id="classroom-setup-schedule"
              className="classroom-form-section"
              aria-labelledby="classroom-setup-schedule-title"
            >
              <div className="classroom-form-section-heading">
                <h3 id="classroom-setup-schedule-title">Günlük çalışma düzeni</h3>
                <p>Yalnız okulunuzun düzeni farklıysa değiştirin.</p>
              </div>
              <label htmlFor="schedule-kind">Çalışma düzeni</label>
              <select
                id="schedule-kind"
                value={classroomForm.scheduleKind}
                onChange={(event) => chooseScheduleKind(event.target.value as ClassroomScheduleKind | "")}
              >
                <option value="">Çalışma düzenini seçin</option>
                <option value="morning">Sabahçı</option>
                <option value="afternoon">Öğleci</option>
                <option value="full_day">Tam gün</option>
                <option value="custom">Özel saatler</option>
              </select>
              <div className="settings-grid">
                <label htmlFor="schedule-start">Başlangıç
                  <KeyboardInput
                    id="schedule-start"
                    type="time"
                    value={classroomForm.startTime}
                    onChange={(event) => setClassroomForm((current) => ({ ...current, startTime: event.target.value }))}
                    disabled={!classroomForm.scheduleKind}
                  />
                </label>
                <label htmlFor="schedule-end">Bitiş
                  <KeyboardInput
                    id="schedule-end"
                    type="time"
                    value={classroomForm.endTime}
                    onChange={(event) => setClassroomForm((current) => ({ ...current, endTime: event.target.value }))}
                    disabled={!classroomForm.scheduleKind}
                  />
                </label>
              </div>
              <p>Bu düzen yalnız sınıf ayarlarından değiştirilir; Bugün ekranında bilgi olarak gösterilir.</p>

            </section>
          </details>

    </>
  );
  const renderClassroomFormFeedback = () => (
    <>
          {classroomError ? <p role="alert">{classroomError}</p> : null}
          <div className="classroom-form-navigation">
            <button
              className="sheet-primary"
              type="submit"
              aria-describedby="classroom-setup-submit-hint"
              disabled={
                dataBusy ||
                writesBlocked ||
                !classroomSetupReadinessState.schedule ||
                (academicYearTransitionRequired && !academicYearTransitionConfirmed)
              }
            >
              {samePeriodCurriculumTransitionRequired
                ? "Maarif Modeli sınıfını oluştur"
                : academicYearTransitionRequired
                  ? "Yeni eğitim yılına geç"
                  : "Sınıfımı hazırla"}
            </button>
            <small id="classroom-setup-submit-hint" aria-live="polite">
              {classroomSetupSubmitHint}
            </small>
          </div>
    </>
  );

  const securityGateOpen =
    appLocked ||
    persistenceState.phase === "hydrating" ||
    persistenceState.phase === "error";

  deskDocumentBlocked.current = securityGateOpen || writesBlocked || dataBusy;
  const openDeskPlan = (planId: string) => {
    setCompletionRequest(null); setStudentProfileOpen(false);
    void store.readSnapshot().then(async snapshot => {
      const saved = snapshot.plans.find(plan => plan.id === planId);
      if (!saved) throw new Error("Plan artık bulunamıyor.");
      if (saved.planType === "daily") {
        const workspace = await loadScheduledPlanWorkspace(store);
        setScheduledPlanWorkspace(workspace);
        const plan = workspace.plans.find(item => item.planId === planId);
        if (plan) return viewScheduledPlanFlow(plan);
        return openAcademicCalendar(saved.civilDate);
      }
      const level = saved.planType === "annual" || saved.planType === "monthly" ? saved.planType : "weekly";
      openTeacherPlanRecords(level, null, planId);
    }).catch(error => setAnnouncement(error instanceof Error ? error.message : "Plan açılamadı."));
  };
  const openStudentSummaryDocument = async (studentId: string) => {
    if (studentSummaryLock.current || writesBlocked || dataBusy) return;
    studentSummaryLock.current = true; setStudentSummaryBusy(true);
    try {
      const snapshot = await store.readSnapshot();
      const scope = resolveActiveClassroomScope(snapshot);
      if (!scope) throw new Error("Öğrenci özeti için sınıfı açın.");
      const { createStudentSummaryRecipe } = await import("./features/student-summary/student-summary-document.ts");
      const { requestPdfDocument } = await import("./features/documents/pdf-preview-model.ts");
      const recipe = await createStudentSummaryRecipe(store, { scope, studentId });
      if (!deskDocumentBlocked.current) { keyboard.hide(); await requestPdfDocument(recipe); }
    } catch (error) { setAnnouncement(error instanceof Error ? error.message : "Öğrenci özeti hazırlanamadı."); }
    finally { studentSummaryLock.current = false; setStudentSummaryBusy(false); }
  };

  const renderActionCenter = (scope: { studentId?: string; observationId?: string } = {}) => (
    <Suspense fallback={<p role="status">Yapılacak işler hazırlanıyor…</p>}>
      {!scope.observationId && <PreparedTeacherActions store={store} studentId={scope.studentId}
        refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`}
        disabled={writesBlocked || dataBusy || educationalWritesDisabled}
        onChanged={() => { setFollowupRevision(value => value + 1); return refreshD1Workspaces(); }}
        onOpenPlan={planId => {
          setCompletionRequest(null); setStudentProfileOpen(false);
          void store.readSnapshot().then(async snapshot => {
            const saved = snapshot.plans.find(plan => plan.id === planId);
            if (saved?.planType === "daily") {
              const workspace = await loadScheduledPlanWorkspace(store);
              setScheduledPlanWorkspace(workspace);
              const plan = workspace.plans.find(item => item.planId === planId);
              if (plan) return viewScheduledPlanFlow(plan);
              return openAcademicCalendar(saved.civilDate);
            }
            const level = saved?.planType === "annual" || saved?.planType === "monthly" ? saved.planType : "weekly";
            openTeacherPlanRecords(level, null, planId);
          }).catch(() => setAnnouncement("Plan kayıtlı; Planlar bölümünden yeniden açabilirsiniz."));
        }}
        onOpenObservation={(studentId, activityId) => { void openActivityEvidence(activityId, studentId); }}
        onOpenFamily={appointmentId => { keyboard.hide(); setStudentProfileOpen(false); setFamilyMeetingAppointmentId(appointmentId); }}
        onPrepareInvitation={(appointmentId, scheduledOn) => {
          void (async () => {
            const snapshot = await store.readSnapshot();
            const currentScope = resolveActiveClassroomScope(snapshot);
            if (!currentScope) throw new Error("Görüşme daveti için sınıfı açın.");
            const { familyAppointmentPdfRecipe } = await import("./features/family-engagement/family-engagement-document.ts");
            const { requestPdfDocument } = await import("./features/documents/pdf-preview-model.ts");
            await requestPdfDocument(familyAppointmentPdfRecipe(snapshot, { scope: currentScope, scheduledOn, appointmentId }));
          })().catch(error => setAnnouncement(error instanceof Error ? error.message : "Davet hazırlanamadı."));
        }} />}
      <ActionCenter store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`}
        disabled={writesBlocked || dataBusy || educationalWritesDisabled} {...scope}
        onOpenObservation={observationId => openObservationActions(observationId)}
        onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("İşlem kaydedildi; ekranı yeniden açarak güncelleyebilirsiniz.")); }}
        onOpenProgramLinks={observationId => {
          const observation = allEvidenceObservations.find(item => item.id === observationId);
          if (observation) openObservationProgramLinks(observation);
        }}
        onOpenPlans={planId => {
          setCompletionRequest(null); setStudentProfileOpen(false);
          void store.readSnapshot().then(async snapshot => {
            const saved = snapshot.plans.find(plan => plan.id === planId);
            if (saved?.planType === "daily") {
              const workspace = await loadScheduledPlanWorkspace(store);
              setScheduledPlanWorkspace(workspace);
              const plan = workspace.plans.find(item => item.planId === planId);
              if (plan) return viewScheduledPlanFlow(plan);
              return openAcademicCalendar(saved.civilDate);
            }
            const level = saved?.planType === "annual" || saved?.planType === "monthly" ? saved.planType : "weekly";
            openTeacherPlanRecords(level, null, planId);
          }).catch(() => setAnnouncement("Plan kayıtlı; Planlar bölümünden yeniden açabilirsiniz."));
        }} />
    </Suspense>
  );

  const renderPlanNextSteps = (civilDate: string, requestedLevel?: "daily") => (
    <Suspense fallback={<p role="status">Sıradaki plan adımı hazırlanıyor…</p>}>
      <WorkPackageCenter store={store} civilDate={civilDate} mode="planning"
        refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`}
        disabled={writesBlocked || dataBusy || planWritesDisabled}
        onChanged={() => {
          setFollowupRevision(value => value + 1);
          void refreshD1Workspaces().catch(() => setAnnouncement("Plan kaydedildi; görünüm yenilenemedi."));
        }}
        onOpenPlans={planId => {
          setPlanGuidanceCivilDate(null);
          void loadScheduledPlanWorkspace(store).then(workspace => {
            setScheduledPlanWorkspace(workspace);
            const plan = workspace.plans.find(item => item.planId === planId);
            if (plan) return viewScheduledPlanFlow(plan);
            return openAcademicCalendar(civilDate);
          }).catch(() => setAnnouncement("Plan kayıtlı; Planlar bölümünden yeniden açabilirsiniz."));
        }} />
      <PlanNextSteps store={store} civilDate={civilDate} requestedLevel={requestedLevel}
        onManualPlan={date => { void openPlanFlow(undefined, undefined, undefined, date); }}
        refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} density="compact"
        disabled={writesBlocked || dataBusy || planWritesDisabled} disabledReason={educationalWriteNotice ?? undefined}
        onChanged={() => {
          setFollowupRevision(value => value + 1);
          void refreshD1Workspaces().catch(() => setAnnouncement("Plan kaydedildi; görünüm yenilenemedi."));
        }}
        onOpenPlan={target => {
          setPlanGuidanceCivilDate(null);
          if (target.level !== "daily") {
            openTeacherPlanRecords(target.level, null, target.planId);
            return;
          }
          void loadScheduledPlanWorkspace(store).then(workspace => {
            setScheduledPlanWorkspace(workspace);
            const plan = workspace.plans.find(item => item.planId === target.planId);
            if (plan) return viewScheduledPlanFlow(plan);
            return openAcademicCalendar(target.civilDate);
          }).catch(() => setAnnouncement("Günlük plan kayıtlı; Planlar bölümünden yeniden açabilirsiniz."));
        }} />
    </Suspense>
  );

  if (sharedInviteRequired && !sharedInviteGranted) {
    return (
      <div className="maarif-app-shell" style={shellStyle}>
        <Suspense fallback={<div className="route-loading" role="status">Erişim hazırlanıyor…</div>}>
          <InviteAccessScreen onAccessGranted={() => setSharedInviteGranted(true)} />
        </Suspense>
      </div>
    );
  }

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
        inert={securityGateOpen || Boolean(tymmChildSession)}
        aria-hidden={securityGateOpen || tymmChildSession ? true : undefined}
      >
      <RouteFocusBoundary routeId={route.id}>
        {!securityGateOpen ? <PdfPreviewHost historyStore={store} historyScope={calendarScope ?? undefined} sourceRevision={`${persistenceState.lastCommittedAt ?? "initial"}:${followupRevision}:${attendanceCivilDate}:${calendarScope?.classroomId ?? ""}`} /> : null}
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
                  attendanceMarkedStudentCount: counts.marked,
                  attendanceCompleted,
                }}
                visibleStudents={visibleStudents}
                archivedStudents={archivedStudents}
                searchQuery={studentSearch}
                hasActiveSearch={Boolean(normalizedStudentSearch)}
                openActionsStudentId={studentActionsOpenId}
                isBusy={dataBusy}
                classAgeBand={currentClassTymmAgeBand}
                educationalWritesDisabled={educationalWritesDisabled}
                educationalWriteNotice={educationalWriteNotice}
                rosterWritesDisabled={configuredClassroom?.operationalStatus === "ended"}
                rosterWriteNotice="Bu eğitim yılı sona erdi. Çocuk listesini değiştirmek için yeni dönemi hazırlayın."
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
                developmentCoverage={<ClassroomDevelopmentPanel store={store} civilDate={attendanceCivilDate}
                  refreshKey={evidenceWorkspace} rosterKey={students} disabled={dataBusy || educationalWritesDisabled}
                  onOpenStudent={(id) => openStudentProfile(id)} onQuickObservation={(id) => void openStudentObservation(id)} />}
                followupInbox={<>{renderActionCenter()}<FollowupInbox store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(studentId, section) => setFollowupRequest({ studentId, section })} /><ClassroomManagementInbox onOpenCalendarSettings={()=>{setClassroomSetupSection("period");setClassroomOpen(true);}} store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(section, studentId) => setManagementRequest({ section, studentId })} /></>}
                onSearchQueryChange={setStudentSearch}
                onOpenImport={() => {
                  keyboard.hide();
                  void store.readSnapshot().then(async snapshot => {
                    const { resolveActiveClassroomScope } = await import("./core/domain/classroom-scope.ts");
                    const scope = resolveActiveClassroomScope(snapshot);
                    if (scope) setStudentImportScope(scope);
                    else setAnnouncement("Önce sınıfınızı hazırlayın.");
                  }).catch(() => setAnnouncement("Sınıf bilgileri okunamadı."));
                }}
                onOpenClassroomSetup={() => {
                  setClassroomSetupSection("period");
                  setClassroomOpen(true);
                  setAnnouncement("Sınıf ve eğitim yılı bilgileri açıldı.");
                }}
                onOpenDuties={()=>{keyboard.hide();setClassDutyRequest({kind:'fruit'});}}
                onOpenAddStudent={() => {
                  if (configuredClassroom?.operationalStatus === "ended") {
                    setClassroomSetupSection("period");
                    setClassroomOpen(true);
                    setAnnouncement(
                      "Bu eğitim yılı sona erdi. Çocuk listesini değiştirmek için yeni dönemi hazırlayın.",
                    );
                    return;
                  }
                  setStudentActionsOpenId(null);
                  setStudentAddOpen(true);
                }}
                onOpenAttendance={() => changeAttendanceOpen(true)}
                onPrepareRoster={downloadSimpleClassRoster}
                onOpenExport={() => {
                  void downloadSimpleClassRoster().catch((reason) => {
                    setAnnouncement(
                      reason instanceof Error ? reason.message : "Sınıf listesi hazırlanamadı.",
                    );
                  });
                }}
                onOpenProfile={(studentId, section, returnFocusTarget) => {
                  setStudentActionsOpenId(null);
                  openStudentProfile(
                    studentId,
                    section,
                    returnFocusTarget,
                  );
                }}
                onOpenObservation={(studentId, returnFocusTarget) => {
                  d1ReturnFocusRef.current = returnFocusTarget ?? null;
                  d1ReturnFocusStudentIdRef.current = studentId;
                  return openStudentObservation(studentId);
                }}
                onOpenQuickObservation={() => openStudentObservation()}
                onToggleStudentActions={(studentId) =>
                  setStudentActionsOpenId((current) =>
                    current === studentId ? null : studentId,
                  )
                }
                onArchiveStudent={archiveStudent}
                onRestoreStudent={restoreStudent}
                onDeleteStudent={(student) => {
                  const sourceStudent = [...students, ...archivedStudents].find(
                    (candidate) => candidate.id === student.id,
                  );
                  if (sourceStudent) void openStudentDeletion(sourceStudent);
                }}
              />
            </Suspense>
          ) : route.id === "activities" ? (
            <Suspense
              fallback={
                <div className="route-loading" role="status" data-testid="activities-route-loading">
                  Etkinlikler hazırlanıyor…
                </div>
              }
            >
              {renderActivityStudio()}
            </Suspense>
          ) : route.id === "plans" ? (
            <Suspense
              fallback={
                <div className="route-loading" role="status" data-testid="plans-route-loading">
                  Plan çalışma alanı hazırlanıyor…
                </div>
              }
            >
              <>
                <PlanWorkspaceScreen
                  store={store}
                  nextSteps={renderPlanNextSteps(preparationPlanningWindow.defaultCivilDate ?? todayWorkspace.civilDate)}
                  refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`}
                  workspace={{
                    ...teacherWorkCycle,
                    documents: {
                      ...teacherWorkCycle.documents,
                      anecdoteIncompleteCount: anecdoteWorkspace.incompleteCount,
                      anecdoteReviewRequiredCount:
                        anecdoteWorkspace.reviewRequiredCount,
                      anecdoteReadyCount: anecdoteWorkspace.readyCount,
                    },
                  }}
                  educationalWritesDisabled={educationalWritesDisabled}
                  preparationPlanningAllowed={preparationPlanningAllowed}
                  preparationPlanningCivilDate={preparationPlanningWindow.defaultCivilDate}
                  upcomingPlanningCivilDate={upcomingPlanningCivilDate}
                  ageBand={currentClassTymmAgeBand}
                  civilDate={attendanceCivilDate}
                  dataBusy={dataBusy}
                  onOpenLevel={openPlanWorkbenchLevel}
                  onOpenCalendar={() =>
                    void openAcademicCalendar(attendanceCivilDate, true)
                  }
                  onOpenDocuments={() => {
                    navigate("documents");
                    setAnnouncement("Belgeler.");
                  }}
                  onOpenActivityStudio={openCaptureEntry}
                  onOpenBuiltInMaarifLibrary={() => openPremiumPlans("overview")}
                  onOpenAgeBandSetup={() => {
                    setClassroomSetupSection("period");
                    setClassroomOpen(true);
                    setAnnouncement(
                      "Plan desteği için sınıfın resmî yaş bandını seçin.",
                    );
                  }}
                />
                {renderActionCenter()}
                <FollowupInbox store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(studentId, section) => setFollowupRequest({ studentId, section: section ?? "preparation" })} />
                <section
                  className="tymm-guide-entry"
                  aria-labelledby="tymm-guide-entry-heading"
                  data-testid="tymm-age-guide-entry"
                >
                  <div className="tymm-guide-entry-heading">
                    <span className="tymm-guide-entry-icon" aria-hidden="true">
                      <ReaderIcon />
                    </span>
                    <span>
                      <small>Resmî program ve plan kaynağı</small>
                      <h2 id="tymm-guide-entry-heading">TYMM yaş rehberi</h2>
                      <p>Yaş bandına göre öğrenme çıktıları ve MEB örnek plan bağlantıları.</p>
                    </span>
                  </div>
                  <div className="tymm-guide-entry-ages" aria-label="Resmî TYMM yaş bantları">
                    {tymmAgeGuides.map((guide) => (
                      <span
                        key={guide.ageBand}
                        data-current={currentClassTymmAgeBand === guide.ageBand || undefined}
                      >
                        <strong>{guide.ageLabel}</strong>
                        <small>{guide.totalLearningOutcomeCount} çıktı</small>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    data-testid="tymm-guide-open"
                    onClick={openTymmAgeGuide}
                  >
                    Yaş rehberini aç
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                </section>
              </>
            </Suspense>
          ) : route.id === "documents" ? (
            <Suspense
              fallback={
                <div className="route-loading" role="status" data-testid="documents-route-loading">
                  Belge çalışma alanı hazırlanıyor…
                </div>
              }
            >
              <DocumentWorkspaceScreen
                documentPurposeTools={{classroom:<>
                  <button type="button" className="sheet-primary" onClick={()=>setClassDutyRequest({kind:'fruit'})}>Meyve ve haftanın çocuğu çizelgesi</button>
                  <DocumentWorkshop store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy || educationalWritesDisabled}
                    onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Kaydınız tamamlandı; görünümü yeniden açabilirsiniz.")); }}
                    onOpenCenters={() => { keyboard.hide(); setManagementRequest({ section: "centers" }); }} onPlanDate={openGuidedDailyPlanning} onOpenStudent={studentId => { keyboard.hide(); openStudentProfile(studentId, "contacts"); }} onOpenAttendance={() => { keyboard.hide(); changeAttendanceOpen(true); }} onOpenPlan={openDeskPlan} onOpenMeeting={appointmentId => { keyboard.hide(); setFamilyMeetingAppointmentId(appointmentId); }} onOpenPickup={(studentId, civilDate) => { keyboard.hide(); setFollowupRequest({ studentId, section: "pickup", civilDate }); }} />
                  <DeskDocumentCenter store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy || educationalWritesDisabled}
                    onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Plan kaydedildi; ekranı yeniden açarak güncelleyebilirsiniz.")); }}
                    onOpenPlan={openDeskPlan} onOpenDate={openAcademicCalendar} onPlanDate={openGuidedDailyPlanning} />
                </>,family:<DocumentWorkshop purpose="family" store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy || educationalWritesDisabled}
                    onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Aile kaydı tamamlandı; görünümü yeniden açabilirsiniz.")); }}
                    onOpenPlan={openDeskPlan} onOpenPickup={(studentId,civilDate)=>setFollowupRequest({studentId,section:"pickup",civilDate})}
                    onOpenMeeting={appointmentId=>setFamilyMeetingAppointmentId(appointmentId)} onOpenStudent={studentId=>openStudentProfile(studentId,"contacts")} />,
                administration:<TeacherReportCenterPanel store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy}
                    onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Rapor kaydı tamamlandı; görünümü yeniden açabilirsiniz.")); }}
                    onOpenPlan={openDeskPlan} onPreparePlan={openGuidedDailyPlanning} onOpenObservation={openObservationActions}
                    onOpenCapture={()=>void openStudentObservation()}
                    onOpenAssessment={civilDate=>{void openDayClosure(civilDate);}}
                    onOpenStudentReport={studentId=>{keyboard.hide();setDevelopmentReportStudentId(studentId);setDevelopmentReportPeriod(null);setDevelopmentReportOpen(true);}}
                    onOpenMonthlyEvaluation={monthlyPlanId=>openTeacherPlanRecords("monthly",null,monthlyPlanId)} />,
                archive:<><LocalObservationSearch store={store} disabled={securityGateOpen || dataBusy} /><MonthEndPackagePanel store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy}
                    onComplete={(_kind, month) => openTeacherPlanRecords("monthly", month)} />
                  {calendarScope && <DocumentHistoryPanel store={store} scope={calendarScope} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} />}
                </>}}
                workspace={{
                  ...teacherWorkCycle,
                  documents: {
                    ...teacherWorkCycle.documents,
                    anecdoteIncompleteCount: anecdoteWorkspace.incompleteCount,
                    anecdoteReviewRequiredCount:
                      anecdoteWorkspace.reviewRequiredCount,
                    anecdoteReadyCount: anecdoteWorkspace.readyCount,
                  },
                }}
                studentCount={students.length}
                observationCount={allEvidenceObservations.length}
                outputStates={simpleDocumentOutputStates}
                outputRequirements={{
                  ...(dailyDocumentReadiness.ready
                    ? {}
                    : { daily: dailyDocumentReadiness.requirement }),
                  ...(students.length === 0
                    ? { observations: "Gözlem çıktısı için önce ilk çocuğu ekleyin." }
                    : allEvidenceObservations.length === 0
                      ? { observations: "İlk gözlemi kaydedin; ardından veli veya idare özetini alın." }
                      : {}),
                }}
                incompleteRosterStudentCount={incompleteRosterStudents.length}
                schoolNameReady={Boolean(configuredClassroom?.schoolName?.trim())}
                teacherNameReady={Boolean(configuredClassroom?.teacherName?.trim())}
                dataBusy={dataBusy}
                onOpenItem={openDocumentWorkspaceItem}
                onOpenPreparationCenter={() => {
                  setDocumentsInitialSection("overview");
                  surfaceTransitionRef.current = "documents";
                  setDocumentsOpen(true);
                  setAnnouncement("Belge hazırlama alanı açıldı.");
                }}
                onDownloadClassRoster={downloadSimpleClassRoster}
                onPrepareRoster={downloadSimpleClassRoster}
                onShareClassRoster={shareSimpleClassRoster}
                onDownloadPlan={downloadSimplePlan}
                onPrepareOutput={(id) => {
                  if (id === "observations") {
                    if (students.length === 0) {
                      navigatePrimaryRoute("classroom");
                      setStudentAddOpen(true);
                      setAnnouncement("Gözlem için ilk çocuk kaydı alanı açıldı.");
                      return;
                    }
                    void openStudentObservation();
                    setAnnouncement(
                      "İlk gözlemi yazın; kaydettiğinizde çıktı hazır olacak.",
                    );
                    return;
                  }
                  if (id === "annual" || !teacherWorkCycle.annual) {
                    openTeacherPlanRecords("annual");
                    return;
                  }
                  if (id === "monthly" || !teacherWorkCycle.monthly) {
                    openTeacherPlanRecords("monthly");
                    return;
                  }
                  if (id === "weekly" || !teacherWorkCycle.weekly) {
                    openTeacherPlanRecords("weekly");
                    return;
                  }
                  openPlanWorkbenchLevel("daily");
                }}
                onOpenObservationOutput={() => {
                  if (!documentIdentityReady) {
                    setClassroomSetupSection("period");
                    setClassroomOpen(true);
                    setAnnouncement(
                      "Gözlem çıktısı için okul ve öğretmen adını bir kez yazın.",
                    );
                    return;
                  }
                  if (students.length === 0) {
                    navigatePrimaryRoute("classroom");
                    setStudentAddOpen(true);
                    setAnnouncement("Gözlem için önce ilk çocuğu ekleyin.");
                    return;
                  }
                  if (allEvidenceObservations.length === 0) {
                    void openStudentObservation();
                    setAnnouncement(
                      "İlk gözlemi yazın; ardından veli veya idare özetini alın.",
                    );
                    return;
                  }
                  setSimpleObservationOutputOpen(true);
                  setAnnouncement("Veli veya idare gözlem özeti alanı açıldı.");
                }}
                onOpenSetup={() => {
                  setClassroomSetupSection("period");
                  setClassroomOpen(true);
                  setAnnouncement(
                    "Çıktı için eksik okul ve öğretmen bilgileri alanı açıldı.",
                  );
                }}
                onOpenRosterRequirements={() => {
                  const firstIncompleteStudent = incompleteRosterStudents[0];
                  navigatePrimaryRoute("classroom");
                  if (firstIncompleteStudent) {
                    setStudentActionsOpenId(firstIncompleteStudent.id);
                    setAnnouncement(`${firstIncompleteStudent.name} için eksik öğrenci bilgileri açıldı.`);
                  } else {
                    setStudentAddOpen(true);
                    setAnnouncement("Sınıf listesi için ilk çocuğu ekleyin.");
                  }
                }}
              />
            </Suspense>
          ) : (
            <Suspense
              fallback={
                <BrandedSurfaceLoading
                  title="Bugün açılıyor"
                  detail="Sınıf özeti ekranda kalırken günlük araçlar hazırlanıyor."
                />
              }
            >
            <TodayScreen
              preferenceStore={store}
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
                updateVersion: displayedUpdateVersion,
                pendingObservationCount: evidenceWorkspace.pendingObservations.length,
                planEvidenceDetailsEnabled: isCapabilityEnabled("planEvidenceDetails"),
                premiumPlanCenterEnabled:
                  premiumPlanEntryEnabled && currentClassTymmAgeBand === "60-72",
                teacherCycle: {
                  ...teacherWorkCycle,
                  documents: {
                    ...teacherWorkCycle.documents,
                    anecdoteIncompleteCount: anecdoteWorkspace.incompleteCount,
                    anecdoteReviewRequiredCount:
                      anecdoteWorkspace.reviewRequiredCount,
                    anecdoteReadyCount: anecdoteWorkspace.readyCount,
                  },
                },
                teacherWeek: teacherWeekWorkspace,
                dayClosure: dayClosureWorkspace,
                setupProgress: {
                  classroomConfigured: configuredClassroom !== null,
                  planningAcademicYearReady:
                    configuredClassroom !== null &&
                    academicYearMatchesCalendarProfile(
                      configuredClassroom,
                      OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
                    ),
                  activeStudentCount: students.length,
                  planReady:
                    teacherWorkCycle.annual !== null ||
                    teacherWorkCycle.monthly !== null ||
                    teacherWorkCycle.weekly !== null ||
                    teacherWorkCycle.daily.planId !== null,
                  backupReady: lastSuccessfulBackupAt !== null,
                },
              }}
              actions={{
                onOpenSettings: () => {
                  setSettingsInitialSection("overview");
                  setProfileOpen(true);
                },
                onOpenClassroom: () => navigatePrimaryRoute("classroom"),
                onApplyReadyUpdate: applyReadyUpdate,
                onActivateAcademicYear: () => {
                  void startAcademicYearWorkToday();
                },
                onOpenAttendance: () => changeAttendanceOpen(true),
                onOpenCalendar: () => openAcademicCalendar(attendanceCivilDate),
                onOpenWeekDay: (civilDate) => openAcademicCalendar(civilDate),
                onOpenDayClosure: () => {
                  void openDayClosure();
                },
                onOpenPendingObservation: () => {
                  openPendingObservation();
                },
                onOpenQuickObservation: () => {
                  void openStudentObservation();
                },
                onPlanRevisionSaved: () => refreshD1Workspaces().then(() => undefined),
                onOpenStudentObservation: (studentId) => {
                  void openStudentObservation(studentId);
                },
                onOpenPlanFlow: () => openGuidedDailyPlanning(),
                onOpenActivityStudio: openCaptureEntry,
                onOpenStudentProfile: (studentId) => openStudentProfile(studentId),
                onOpenRecordedActivity: (activityId) => openActivityEvidence(activityId),
                onCompleteRecordedActivity: (activityId) => {
                  void completeRecordedActivity(activityId);
                },
                onOpenTeacherCycleStage: (stage) => {
                  if (stage === "daily") {
                    if (todayWorkspace.planItems.length > 0) {
                      openTodayPlans();
                    } else {
                      openGuidedDailyPlanning();
                    }
                    return;
                  }
                  if (stage === "weekly" || stage === "monthly") {
                    openTeacherPlanRecords(stage);
                    return;
                  }
                  setPlansOpen(false);
                  setPremiumGateOpen(false);
                  navigate("documents");
                  setAnnouncement("Belge ve kayıt çalışma alanı açıldı.");
                },
                onOpenSetupStep: openSetupProgressStep,
              }}
              slots={{ formatStudentAge: formatChildAge,
                thisWeek:<Suspense fallback={null}><TomorrowReadyCard store={store} civilDate={attendanceCivilDate} refreshKey={followupRevision} disabled={writesBlocked||dataBusy||educationalWritesDisabled} onChanged={()=>setFollowupRevision(v=>v+1)} onOpenPlan={openDeskPlan} onOpenPlanning={openGuidedDailyPlanning} onOpenSmallGroups={civilDate=>setTomorrowTool({kind:'groups',civilDate})} onOpenHomeGames={civilDate=>setTomorrowTool({kind:'family',civilDate})} onOpenDuties={(kind,scheduleId,civilDate)=>setClassDutyRequest({kind,scheduleId,month:civilDate?.slice(0,7)})}/><ClassDutyWeekCard store={store} civilDate={attendanceCivilDate} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(kind,scheduleId)=>setClassDutyRequest({kind,scheduleId})}/></Suspense>,
                followupInbox: <>{renderActionCenter()}<FollowupInbox store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(studentId, section) => setFollowupRequest({ studentId, section })} /><ClassroomManagementInbox onOpenCalendarSettings={()=>{setClassroomSetupSection("period");setClassroomOpen(true);}} store={store} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={(section, studentId) => setManagementRequest({ section, studentId })} /></> }}
            />
            </Suspense>
          )}
        </MobileScroll>
      </RouteFocusBoundary>

      {!activityChildModeOpen ? <nav className="bottom-nav" aria-label="Ana menü">
        {visiblePrimaryNavigation().map((item) => {
          const active =
            item.id === "capture"
              ? evidenceFlowRequest !== null || captureMenuOpen
              : item.id === "plans"
                ? !documentsOpen &&
                  (route.id === "plans" ||
                    plansOpen ||
                    premiumGateOpen ||
                    premiumPlanOpen ||
                    planFlowOpen ||
                    calendarOpen)
                : item.id === "documents"
                  ? route.id === "documents" || documentsOpen
                  : route.id === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`${item.id === "capture" ? "nav-add" : ""}${active ? " is-active" : ""}`.trim()}
              onFocus={() => void preloadPrimarySurface(item.id)}
              onPointerDown={() => void preloadPrimarySurface(item.id)}
              onPointerEnter={() => void preloadPrimarySurface(item.id)}
              onClick={() => handleNav(item.id, item.label)}
              aria-current={active ? "page" : undefined}
            >
              {item.id === "today" ? (
                <HomeIcon aria-hidden="true" />
              ) : item.id === "classroom" ? (
                <PersonIcon aria-hidden="true" />
              ) : item.id === "plans" ? (
                <ReaderIcon aria-hidden="true" />
              ) : item.id === "documents" ? (
                <ArchiveIcon aria-hidden="true" />
              ) : (
                <Pencil1Icon aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav> : null}

      {futurePlanNotice ? (
        <aside className="future-plan-notice" role="status" data-testid="future-plan-notice">
          <span>
            <strong>{futurePlanNotice.activityTitle}</strong>
            <small>
              {futurePlanNotice.refreshRequired
                ? `${formatTurkishCivilDate(futurePlanNotice.civilDate)} için cihazda kayıtlı · ekran yenilemesi gerekli`
                : `${formatTurkishCivilDate(futurePlanNotice.civilDate)} için cihazda kayıtlı`}
            </small>
          </span>
          <button
            type="button"
            onClick={() => {
              const targetDate = futurePlanNotice.civilDate;
              if (futurePlanNotice.refreshRequired) {
                void refreshD1Workspaces()
                  .then(() => {
                    setFuturePlanNotice(null);
                    setAnnouncement(
                      "Kaydedilmiş plan yeniden okundu; yinelenen kayıt oluşturulmadı.",
                    );
                  })
                  .catch(() => {
                    setAnnouncement(
                      "Plan cihazda kayıtlı. Ekran verileri hâlâ açılamadı; cihaz verilerine yeniden bağlanın.",
                    );
                  });
                return;
              }
              setFuturePlanNotice(null);
              void openAcademicCalendar(targetDate);
            }}
          >
            {futurePlanNotice.refreshRequired ? "Cihaz verilerini yenile" : "Takvimde gör"}
          </button>
          <button
            type="button"
            className="future-plan-notice-dismiss"
            aria-label="Plan bildirimini kapat"
            onClick={() => setFuturePlanNotice(null)}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      {observationRefreshNotice ? (
        <aside
          className="future-plan-notice observation-refresh-notice"
          role="status"
          data-testid="observation-refresh-notice"
        >
          <span>
            <strong>
              {observationRefreshNotice.observationCount.toLocaleString("tr-TR")} gözlem cihazda kayıtlı
            </strong>
            <small>
              {observationRefreshNotice.activityTitle} · {observationRefreshNotice.reason === "read-failed"
                ? "ekran verileri okunamadı"
                : "kayıt ekran projeksiyonunda henüz doğrulanamadı"} · yeniden kaydetmeyin
            </small>
          </span>
          <button
            type="button"
            disabled={observationRefreshBusy}
            onClick={() => {
              const notice = observationRefreshNotice;
              setObservationRefreshBusy(true);
              void verifyCommittedObservationRefresh(
                notice.committedObservationIds,
                async () => (await refreshD1Workspaces()).evidence,
              )
                .then((refresh) => {
                  if (refresh.status === "verified") {
                    setObservationRefreshNotice(null);
                    setAnnouncement(
                      "Kaydedilmiş gözlemler yeniden okundu; yinelenen kayıt oluşturulmadı.",
                    );
                    return;
                  }
                  setObservationRefreshNotice((current) =>
                    current
                      ? {
                          ...current,
                          committedObservationIds:
                            refresh.committedObservationIds,
                          reason: refresh.reason,
                        }
                      : current,
                  );
                  setAnnouncement(
                    refresh.reason === "read-failed"
                      ? "Gözlemler cihazda kayıtlı; ekran verileri okunamadı. Aynı gözlemleri yeniden kaydetmeyin, yenilemeyi tekrar deneyin."
                      : "Gözlemler cihazda kayıtlı ancak ekran projeksiyonunda henüz doğrulanamadı. Aynı gözlemleri yeniden kaydetmeyin, yenilemeyi tekrar deneyin.",
                  );
                })
                .catch(() => {
                  setAnnouncement(
                    "Gözlem kimlikleri doğrulanamadı. Kayıtları yeniden oluşturmayın; cihaz verilerine yeniden bağlanıp yenilemeyi tekrar deneyin.",
                  );
                })
                .finally(() => {
                  setObservationRefreshBusy(false);
                });
            }}
          >
            {observationRefreshBusy ? "Doğrulanıyor…" : "Cihaz verilerini yenile"}
          </button>
          <button
            type="button"
            className="future-plan-notice-dismiss"
            aria-label="Gözlem yenileme bildirimini kapat"
            onClick={() => setObservationRefreshNotice(null)}
            disabled={observationRefreshBusy}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      <BottomSheet
        open={dayClosureOpen}
        onOpenChange={(open) => {
          if (!dayClosureBusy) {
            setDayClosureOpen(open);
            if (!open) setDayClosureError("");
          }
        }}
        title="Gün sonu kapanışı"
        description="Bugünün gerçek kayıtlarını doğrulayın; eksik işi gizlemek yerine yarına açık bir notla taşıyın."
        snap={0.86}
      >
        <div className="day-closure-sheet" data-testid="day-closure-sheet">
          {dayClosureWorkspace.previousCarryForward ? (
            <aside className="day-closure-carry" role="status">
              <ClockIcon aria-hidden="true" />
              <span>
                <strong>Önceki günden taşınan not</strong>
                <small>{dayClosureWorkspace.previousCarryForward.note}</small>
              </span>
            </aside>
          ) : null}

          <section className="day-closure-evidence" aria-label="Gün kanıt özeti">
            <article>
              <strong>
                {dayClosureWorkspace.evidence.attendanceMarkedCount}/
                {dayClosureWorkspace.evidence.expectedStudentCount}
              </strong>
              <small>yoklama</small>
            </article>
            <article>
              <strong>
                {dayClosureWorkspace.evidence.completedActivityCount}/
                {dayClosureWorkspace.evidence.activityCount}
              </strong>
              <small>etkinlik</small>
            </article>
            <article>
              <strong>{dayClosureWorkspace.evidence.observationCount}</strong>
              <small>gözlem</small>
            </article>
            <article>
              <strong>
                {dayClosureWorkspace.evidence.pendingCurriculumLinkCount}
              </strong>
              <small>bekleyen bağ</small>
            </article>
          </section>

          {dayClosureWorkspace.status === "stale" ? (
            <div className="day-closure-stale" role="alert">
              <MagicWandIcon aria-hidden="true" />
              <span>
                <strong>Kapanıştan sonra kayıtlar değişti</strong>
                <small>
                  Eski kapanış silinmedi. Güncel kanıtlarla yeni bir kapanış kaydı
                  oluşturun.
                </small>
              </span>
            </div>
          ) : null}

          <section className="day-closure-checklist" aria-labelledby="day-closure-checklist-title">
            <header>
              <span className="section-eyebrow">Doğrulama</span>
              <h3 id="day-closure-checklist-title">
                {dayClosureWorkspace.issues.length === 0
                  ? "Bugünün zorunlu işleri tamam"
                  : `${dayClosureWorkspace.issues.length} açık iş var`}
              </h3>
              <p>
                Gözlem sayısı bir performans hedefi değildir; gerçek bir olay
                yoksa gözlem yazmanız beklenmez.
              </p>
            </header>
            {dayClosureWorkspace.issues.length === 0 ? (
              <div className="day-closure-complete">
                <CheckCircledIcon aria-hidden="true" />
                <span>
                  <strong>Kayıt zinciri kapanmaya hazır</strong>
                  <small>Yoklama, günlük plan, uygulama ve program bağları doğrulandı.</small>
                </span>
              </div>
            ) : (
              <div className="day-closure-issues">
                {dayClosureWorkspace.issues.map((issue) => (
                  <article key={issue.code}>
                    <span>
                      <strong>{issue.title}</strong>
                      <small>{issue.detail}</small>
                    </span>
                    <button
                      type="button"
                      disabled={dayClosureBusy}
                      onClick={() => {
                        setDayClosureOpen(false);
                        if (issue.code === "no-students") {
                          navigate("classroom");
                          setStudentAddOpen(true);
                          return;
                        }
                        if (issue.code === "attendance-incomplete") {
                          changeAttendanceOpen(true);
                          return;
                        }
                        if (issue.code === "curriculum-links-pending") {
                          void openPendingObservation();
                          return;
                        }
                        if (todayWorkspace.planItems.length > 0) {
                          openTodayPlans();
                        } else {
                          openPlanFlow();
                        }
                      }}
                    >
                      Düzelt
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {dayClosureWorkspace.issues.length > 0 ? (
            <label className="day-closure-note" htmlFor="day-closure-note">
              <span>
                <strong>Yarına öğretmen notu</strong>
                <small>En az 10 karakter · açık işin nasıl ele alınacağını yazın</small>
              </span>
              <KeyboardTextarea
                id="day-closure-note"
                value={dayClosureNote}
                onChange={(event) => setDayClosureNote(event.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="Örn. Sabah ilk akışta yoklamayı tamamlayıp program bağlarını gözden geçireceğim."
                aria-describedby="day-closure-note-help"
              />
              <small id="day-closure-note-help">
                {dayClosureNote.trim().length.toLocaleString("tr-TR")}/1200 karakter
              </small>
            </label>
          ) : null}

          {dayClosureError ? (
            <p className="day-closure-error" role="alert">
              {dayClosureError}
            </p>
          ) : null}

          <footer className="day-closure-actions">
            <button
              type="button"
              className="secondary"
              disabled={dayClosureBusy}
              onClick={() => setDayClosureOpen(false)}
            >
              Şimdi değil
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                dayClosureBusy ||
                (dayClosureWorkspace.issues.length > 0 &&
                  dayClosureNote.trim().length < 10)
              }
              aria-describedby={
                dayClosureWorkspace.issues.length > 0 &&
                dayClosureNote.trim().length < 10
                  ? "day-closure-note-help"
                  : undefined
              }
              onClick={() => void submitDayClosure()}
            >
              {dayClosureBusy
                ? "Kaydediliyor…"
                : dayClosureWorkspace.issues.length === 0
                  ? "Günü tamamlandı olarak kapat"
                  : "Eksikleri yarına taşı ve kapat"}
            </button>
          </footer>
        </div>
      </BottomSheet>

      <BottomSheet
        open={tymmGuideOpen}
        onOpenChange={setTymmGuideOpen}
        title="TYMM 2024 Yaş Rehberi"
        description="36–48, 48–60 ve 60–72 ay resmî program matrisi ile gözetimli çocuk katılımı."
        snap={0.94}
      >
        <div className="tymm-guide-sheet" data-testid="tymm-age-guide-sheet">
          <section className="tymm-official-notice" aria-label="Kaynak durumu">
            <CheckCircledIcon aria-hidden="true" />
            <span>
              <strong>T.C. Millî Eğitim Bakanlığı · resmî program</strong>
              <small>
                2024 programının üç resmî yaş bandı. Karma yaş ayrı bir resmî
                bant değildir; 0–36 ay ise TYMM kapsamında değildir.
              </small>
            </span>
          </section>

          <div className="tymm-age-tabs" role="group" aria-label="TYMM yaş bandı">
            {tymmAgeGuides.map((guide) => (
              <button
                type="button"
                key={guide.ageBand}
                aria-pressed={selectedTymmGuide.ageBand === guide.ageBand}
                onClick={() => selectTymmGuideAge(guide.ageBand)}
              >
                <strong>{guide.ageLabel}</strong>
                <small>{guide.totalLearningOutcomeCount} çıktı</small>
              </button>
            ))}
          </div>

          <section className="tymm-guide-summary" aria-labelledby="tymm-guide-summary-heading">
            <div>
              <span className="d1-kicker">Seçili resmî bant</span>
              <h3 id="tymm-guide-summary-heading">{selectedTymmGuide.ageLabel}</h3>
              <small className="tymm-guide-summary__editorial-label">
                MaarifOS uygulama notu · resmî gelişim basamağı değildir
              </small>
              <p>{selectedTymmGuide.developmentalUseNote}</p>
            </div>
            <strong aria-label={`${selectedTymmGuide.totalLearningOutcomeCount} öğrenme çıktısı`}>
              {selectedTymmGuide.totalLearningOutcomeCount}
              <small>öğrenme çıktısı</small>
            </strong>
          </section>

          {selectedTymmOfficialAgeResource ? (
            <details
              className="tymm-official-examples"
              data-testid="tymm-official-examples"
            >
              <summary>
                <span>
                  <strong>Resmî örnek planlar</strong>
                  <small>
                    {selectedTymmOfficialAgeResource.ageLabel} · yaş sayfası ve 4 MEB örneği
                  </small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </summary>
              <div className="tymm-official-examples__content">
                <p>
                  Bu bağlantılar MEB’de yayımlanan örneklere gider. Örnekler
                  uygulamaya otomatik kurulmaz; sınıfınıza göre inceleyip
                  düzenlemeniz gerekir.
                </p>
                <div className="tymm-official-examples__links">
                  <a
                    href={selectedTymmOfficialAgeResource.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${selectedTymmOfficialAgeResource.title} (yeni sekmede)`}
                  >
                    <span>
                      <strong>{selectedTymmOfficialAgeResource.title}</strong>
                      <small>Seçili yaşın resmî MEB sayfası</small>
                    </span>
                    <Link2Icon aria-hidden="true" />
                  </a>
                  {selectedTymmOfficialAgeResource.examples.map((example) => (
                    <a
                      key={example.id}
                      href={example.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${example.title} (yeni sekmede)`}
                    >
                      <span>
                        <strong>{example.title}</strong>
                        <small>MEB’de yayımlanmış plan örneği · dış bağlantı</small>
                      </span>
                      <Link2Icon aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          <details
            className="tymm-program-details"
            data-testid="tymm-program-details"
          >
            <summary>
              <span>
                <strong>Program ayrıntıları</strong>
                <small>
                  7 öğrenme alanı · {selectedTymmGuide.totalLearningOutcomeCount} resmî öğrenme çıktısı
                </small>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </summary>
            <section className="tymm-domain-section" aria-labelledby="tymm-domain-heading">
              <div className="tymm-section-heading">
                <span>
                  <small>Eksiksiz öğrenme çıktısı sayımı</small>
                  <h3 id="tymm-domain-heading">Yedi öğrenme alanı</h3>
                </span>
                <TargetIcon aria-hidden="true" />
              </div>
              <p className="catalog-scope-note">
                Bu sayı yalnız resmî öğrenme çıktılarını kapsar ve kaynak özetiyle
                izlenir. Diğer program bileşenleri insan incelemesi tamamlandıkça
                ayrıca eklenecektir.
              </p>
              <div className="tymm-domain-tabs" role="group" aria-label="Öğrenme alanları">
                {selectedTymmGuide.domainOutcomeCounts.map((item) => (
                  <button
                    type="button"
                    key={item.domain}
                    aria-pressed={tymmGuideDomain === item.domain}
                    onClick={() => setTymmGuideDomain(item.domain)}
                  >
                    <span>{item.domain}</span>
                    <strong>{item.learningOutcomeCount}</strong>
                  </button>
                ))}
              </div>
              <div className="tymm-outcome-list">
                <p>
                  <strong>{tymmGuideDomain}</strong>
                  <span>{selectedTymmOutcomes.length} resmî öğrenme çıktısı</span>
                </p>
                <ol>
                  {selectedTymmOutcomes.map((outcome) => (
                    <li key={`${outcome.ageBand}-${outcome.code}`}>
                      <span>{outcome.code}</span>
                      <p>{outcome.title}</p>
                      <small>Program s. {outcome.sourcePage}</small>
                    </li>
                  ))}
                </ol>
              </div>
              <a
                className="tymm-source-link"
                href={TYMM_OFFICIAL_RESOURCE_CATALOG.programPdf.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Resmî program PDF’sini yeni sekmede aç"
              >
                <Link2Icon aria-hidden="true" />
                <span>
                  <strong>Resmî program PDF’sini aç</strong>
                  <small>
                    Kontrol: {formatTurkishCivilDate(TYMM_OFFICIAL_RESOURCE_CATALOG.sourceCheckedOn)}
                    {" · "}yaşa ait sayfalar {selectedTymmGuide.officialProvenance.ageBandSourcePages.join(", ")}
                  </small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </a>
            </section>
          </details>

          <section className="tymm-participation-section" aria-labelledby="tymm-participation-heading">
            <div className="tymm-section-heading">
              <span>
                <small>MaarifOS özgün · yetişkin gözetimli</small>
                <h3 id="tymm-participation-heading">Çocuk dokunma alanı</h3>
              </span>
              <MagicWandIcon aria-hidden="true" />
            </div>
            <p className="tymm-participation-policy">
              {selectedTymmGuide.interactionPolicy.notice} Dokunuş önce yalnız
              düzenlenebilir taslak olur; öğretmen incelemeden kanıta dönüşmez.
            </p>
            <div className="tymm-template-grid" role="group" aria-label="Çocuk seçim şablonu">
              {selectedTymmGuide.choiceTemplates.map((template, index) => {
                const Icon = [StarIcon, MagicWandIcon, ChatBubbleIcon][index];
                return (
                  <button
                    type="button"
                    key={template.id}
                    aria-pressed={selectedTymmTemplate.id === template.id}
                    onClick={() => setTymmGuideTemplateId(template.id)}
                  >
                    <Icon aria-hidden="true" />
                    <span>
                      <strong>{template.title}</strong>
                      <small>{template.childPrompt}</small>
                    </span>
                    <CheckCircledIcon aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <label className="tymm-student-select" htmlFor="tymm-guide-student">
              <span>
                <strong>Çocuk ekranını kiminle açacaksınız?</strong>
                <small>Çocuk ekranında yalnız ilk adı veya tercih ettiği adı görünür.</small>
              </span>
              <select
                id="tymm-guide-student"
                value={selectedTymmStudent?.id ?? ""}
                onChange={(event) => setTymmGuideStudentId(event.target.value)}
                disabled={students.length === 0}
              >
                {students.length === 0 ? <option value="">Sınıfta çocuk yok</option> : null}
                {students.map((student) => (
                  <option value={student.id} key={student.id}>
                    {student.preferredName ?? student.name}
                  </option>
                ))}
              </select>
            </label>
            {childParticipationBlockedReason ? (
              <p className="tymm-participation-blocked" role="status">
                <LockClosedIcon aria-hidden="true" />
                {childParticipationBlockedReason}
              </p>
            ) : null}
            <button
              type="button"
              className="tymm-child-launch"
              data-testid="tymm-child-launch"
              disabled={Boolean(childParticipationBlockedReason)}
              onClick={startTymmChildParticipation}
            >
              <PersonIcon aria-hidden="true" />
              Çocuk ekranını aç
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </section>
        </div>
      </BottomSheet>

      <BottomSheet
        open={captureMenuOpen}
        onOpenChange={(open) => {
          setCaptureMenuOpen(open);
          if (!open) setObservationContextChoice(null);
        }}
        title={
          observationContextChoice
            ? "Gözlem hangi etkinliğe ait?"
            : "Etkinlik ve Materyal Stüdyosu"
        }
        description={
          observationContextChoice
            ? "Gerçek plan bağını korumak için etkinliği seçin. Olay plan dışıysa bunu ayrıca belirtin."
            : "Yaş grubunu ve aracı seçin; planlayın, uygulayın veya yazdırın."
        }
        snap={observationContextChoice ? 0.82 : 0.96}
      >
        {observationContextChoice ? (
          <div className="observation-context-chooser" data-testid="observation-context-chooser">
            <p>
              <TargetIcon aria-hidden="true" />
              <span>
                <strong>Bugünün uygun gerçek etkinlikleri</strong>
                <small>Seçiminiz gözlemi plan, hedef ve değerlendirme zincirine bağlar.</small>
              </span>
            </p>
            <div className="observation-context-list">
              {observationContextChoice.activities.map((activity) => (
                <button
                  type="button"
                  key={activity.id}
                  onClick={() => {
                    const initialStudentId = observationContextChoice.initialStudentId;
                    const initialDraft = observationContextChoice.initialDraft;
                    const activityStartPolicy =
                      observationContextChoice.activityStartPolicy;
                    surfaceTransitionRef.current = "evidence-flow";
                    setCaptureMenuOpen(false);
                    setObservationContextChoice(null);
                    void openActivityEvidence(
                      activity.id,
                      initialStudentId,
                      activity,
                      initialDraft,
                      activityStartPolicy,
                    );
                  }}
                >
                  <span>
                    <strong>{activity.title}</strong>
                    <small>
                      {activity.startTime}
                      {activity.endTime ? `–${activity.endTime}` : ""}
                      {activity.status === "in_progress" ? " · uygulanıyor" : " · planlandı"}
                    </small>
                  </span>
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                className="is-spontaneous"
                onClick={() => {
                  const choice = observationContextChoice;
                  const student = students.find(
                    (item) => item.id === choice.spontaneousStudentId,
                  );
                  if (!student) {
                    setAnnouncement(
                      "Plan dışı gözlem için etkin çocuk doğrulanamadı; kayıt açılmadı.",
                    );
                    return;
                  }
                  setObservationContextChoice(null);
                  surfaceTransitionRef.current = "evidence-flow";
                  setCaptureMenuOpen(false);
                  void openSpontaneousObservation(
                    student,
                    choice.civilDate,
                    choice.initialStudentId,
                    choice.initialDraft,
                  );
                }}
              >
                <span>
                  <strong>Bu etkinliklerden bağımsız</strong>
                  <small>Plan dışı anlık gözlem olarak açıkça ayrı kaydet</small>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
        <>
        <Suspense fallback={<div className="route-loading" role="status">Etkinlikler hazırlanıyor…</div>}>
          {renderActivityStudio()}
        </Suspense>
        <div className="capture-choice-grid" hidden aria-hidden="true">
          <button
            id="capture-observation-action"
            type="button"
            onClick={(event) => {
              if (students.length === 0) {
                navigate("classroom");
                setAnnouncement(
                  "Gözlem yazmak için önce Sınıfım bölümünden bir çocuk ekleyin.",
                );
                return;
              }
              d1ReturnFocusRef.current = event.currentTarget;
              d1ReturnFocusSelectorRef.current = "#capture-observation-action";
              void openStudentObservation();
            }}
            disabled={educationalWritesDisabled || students.length === 0}
            aria-describedby="capture-observation-readiness"
          >
            <Pencil1Icon aria-hidden="true" />
            <span>
              <strong>Gözlem yaz</strong>
              <small id="capture-observation-readiness">
                {students.length === 0
                  ? "Kilitli · Önce Sınıfım bölümünden çocuk ekleyin"
                  : educationalWritesDisabled
                    ? configuredClassroom?.operationalStatus === "preparation"
                      ? `Kilitli · ${formatTurkishCivilDate(configuredClassroom.academicYearStart)} tarihinde açılır`
                      : "Kilitli · Etkin bir eğitim yılı seçin"
                    : "Çocuk veya grup seç → yaz → kaydet"}
              </small>
            </span>
            {educationalWritesDisabled || students.length === 0 ? (
              <LockClosedIcon className="capture-choice-lock" aria-hidden="true" />
            ) : (
              <ChevronRightIcon aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureMenuOpen(false);
              changeAttendanceOpen(true);
            }}
            disabled={educationalWritesDisabled || students.length === 0}
            aria-describedby="capture-attendance-readiness"
          >
            <CheckCircledIcon aria-hidden="true" />
            <span>
              <strong>Yoklama al</strong>
              <small id="capture-attendance-readiness">
                {students.length === 0
                  ? "Kilitli · Önce sınıf listesini oluşturun"
                  : educationalWritesDisabled
                    ? configuredClassroom?.operationalStatus === "preparation"
                      ? `Kilitli · ${formatTurkishCivilDate(configuredClassroom.academicYearStart)} tarihinde açılır`
                      : "Kilitli · Etkin bir eğitim yılı seçin"
                    : "Çocuklara dokunarak işaretle"}
              </small>
            </span>
            {educationalWritesDisabled || students.length === 0 ? (
              <LockClosedIcon className="capture-choice-lock" aria-hidden="true" />
            ) : (
              <ChevronRightIcon aria-hidden="true" />
            )}
          </button>
          {isCapabilityEnabled("planEvidenceDetails") ? (
          <button
            type="button"
            onClick={() => {
              d1ReturnFocusRef.current =
                document.querySelector<HTMLElement>(".nav-add");
              setCaptureMenuOpen(false);
              openGuidedDailyPlanning();
            }}
            disabled={planWritesDisabled}
            aria-describedby="capture-plan-readiness"
          >
            <ReaderIcon aria-hidden="true" />
            <span>
              <strong>Etkinlik planla</strong>
              <small id="capture-plan-readiness">
                {preparationPlanningAllowed
                  ? `Açık · ${formatTurkishCivilDate(preparationPlanningWindow.defaultCivilDate!)} tarihinden itibaren yeni dönem planı hazırlayın`
                  : planWritesDisabled
                    ? "Kilitli · Plan için etkin veya hazırlanmış bir eğitim yılı seçin"
                    : "Fikir seç → hedef seç → planı kaydet"}
              </small>
            </span>
            {planWritesDisabled ? (
              <LockClosedIcon className="capture-choice-lock" aria-hidden="true" />
            ) : (
              <ChevronRightIcon aria-hidden="true" />
            )}
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
              <small>Toplantı, etkinlik veya okulda eğitim olmayan gün</small>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          ) : null}
          {educationalWritesDisabled || students.length === 0 ? (
            <button
              type="button"
              className="capture-readiness-action"
              onClick={() => {
                setCaptureMenuOpen(false);
                if (students.length === 0) {
                  navigatePrimaryRoute("classroom");
                  setAnnouncement(
                    "Sınıf listesini oluşturmak için ilk çocuğu ekleyin.",
                  );
                  return;
                }
                if (configuredClassroom?.operationalStatus === "preparation") {
                  void startAcademicYearWorkToday();
                  return;
                }
                setClassroomOpen(true);
                setAnnouncement(
                  educationalWriteNotice ??
                    "Kayıtları açmak için eğitim yılı ayarını tamamlayın.",
                );
              }}
            >
              <PersonIcon aria-hidden="true" />
              <span>
                <strong>
                  {students.length === 0
                    ? "Sınıf listesini oluştur"
                    : configuredClassroom?.operationalStatus === "preparation"
                      ? "Çalışmayı bugün başlat"
                      : "Eğitim yılını etkinleştir"}
                </strong>
                <small>
                  {configuredClassroom?.operationalStatus === "preparation"
                    ? "Yoklama, uygulama ve gözlemi gerçek kayıt kullanımına aç"
                    : "Kilitli kayıtların açılması için eksik adımı tamamla"}
                </small>
              </span>
              <ChevronRightIcon aria-hidden="true" />
            </button>
          ) : null}
        </div>
        </>
        )}
      </BottomSheet>

      <BottomSheet
        open={classroomOpen}
        onOpenChange={(open) => {
          setClassroomOpen(open);
          if (!open) {
            setClassroomSetupSection("period");
            setAcademicYearTransitionConfirmed(false);
          }
        }}
        title={
          academicYearTransitionRequired
            ? samePeriodCurriculumTransitionRequired
              ? "Maarif Modeli sınıfını oluştur"
              : "Yeni eğitim yılına geç"
            : "Sınıfını hazırla"
        }
        description={
          academicYearTransitionRequired
            ? "Eski kayıtları koruyarak sınıfı tek onayla yeni kapsama taşıyın."
            : "Dört temel bilgiyi bir kez yazın; Maarif Modeli ve resmî takvim kendiliğinden hazırlansın."
        }
        snap={0.9}
      >
        <form
          className={`classroom-form${academicYearTransitionRequired ? " is-transition" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            void saveClassroom();
          }}
        >
          {academicYearTransitionRequired ? (
            <>
              <section
                className="academic-year-transition-compact"
                aria-labelledby="academic-year-transition-title"
              >
                <header>
                  <span className="d1-kicker">
                    {samePeriodCurriculumTransitionRequired
                      ? "MAARİF MODELİ GEÇİŞİ"
                      : "EĞİTİM YILI GEÇİŞİ"}
                  </span>
                  <h3 id="academic-year-transition-title">
                    {samePeriodCurriculumTransitionRequired
                      ? "Yeni Maarif Modeli sınıfı hazır"
                      : "Yeni dönem hazır"}
                  </h3>
                </header>
                <div
                  className="academic-year-transition-compact__flow"
                  aria-label={
                    samePeriodCurriculumTransitionRequired
                      ? "Eski programdan yeni Maarif Modeli sınıfına geçiş"
                      : "Eski dönemden yeni döneme geçiş"
                  }
                >
                  <div>
                    <small>
                      {samePeriodCurriculumTransitionRequired
                        ? "Arşivlenecek kapsam"
                        : "Eski dönem"}
                    </small>
                    <strong>{configuredClassroom?.academicYearName}</strong>
                    <span>
                      {samePeriodCurriculumTransitionRequired
                        ? "EÇE kayıtları"
                        : configuredClassroom
                          ? `${formatTurkishCivilDate(configuredClassroom.academicYearStart)}–${formatTurkishCivilDate(configuredClassroom.academicYearEnd)}`
                          : ""}
                    </span>
                  </div>
                  <ChevronRightIcon aria-hidden="true" />
                  <div className="is-next">
                    <small>
                      {samePeriodCurriculumTransitionRequired
                        ? "Yeni kapsam"
                        : "Yeni dönem"}
                    </small>
                    <strong>{classroomForm.academicYearName}</strong>
                    <span>
                      {samePeriodCurriculumTransitionRequired
                        ? "Türkiye Yüzyılı Maarif Modeli"
                        : `${formatTurkishCivilDate(classroomForm.academicYearStart)}–${formatTurkishCivilDate(classroomForm.academicYearEnd)}`}
                    </span>
                  </div>
                </div>
                <label className="academic-year-transition-confirm">
                  <input
                    type="checkbox"
                    autoFocus
                    checked={academicYearTransitionConfirmed}
                    onChange={(event) =>
                      setAcademicYearTransitionConfirmed(event.target.checked)
                    }
                    aria-label="Çocukları yeni sınıfa taşımayı ve eski kayıtları arşivlemeyi onayla"
                    aria-describedby="academic-year-transition-impact"
                  />
                  <span>
                    <strong>
                      {students.length} çocuğu {samePeriodCurriculumTransitionRequired
                        ? "yeni Maarif Modeli sınıfına"
                        : "yeni eğitim yılına"} taşı
                    </strong>
                    <small id="academic-year-transition-impact">
                      Eski plan, gözlem, portfolyo ve değerlendirmeler kendi
                      kapsamında korunur; yalnız etkin çocuk listesi yeni sınıfa bağlanır.
                    </small>
                  </span>
                </label>
              </section>
              {renderClassroomFormFeedback()}
              <details className="classroom-setup-edit-details">
                <summary tabIndex={0}>
                  <span>
                    <strong>Ayrıntıları değiştir</strong>
                    <small>Okul, öğretmen, takvim ve çalışma saatleri</small>
                  </span>
                  <ChevronRightIcon aria-hidden="true" />
                </summary>
                <div className="classroom-setup-edit-details__content">
                  {renderClassroomSetupFields()}
                </div>
              </details>
            </>
          ) : (
            <>
              <div className="classroom-form-simple-intro" role="status">
                <CheckCircledIcon aria-hidden="true" />
                <span>
                  <strong>Türkiye Yüzyılı Maarif Modeli hazır</strong>
                  Resmî program profili, 2026–2027 takvimi ve tam gün çalışma düzeni otomatik seçildi.
                </span>
              </div>
              {renderClassroomSetupFields()}
              {renderClassroomFormFeedback()}
            </>
          )}
        </form>
      </BottomSheet>

      <BottomSheet
        open={plansOpen}
        onOpenChange={(open) => {
          setPlansOpen(open);
          if (!open) setSelectedPlanDayWorkspace(null);
        }}
        title={displayedPlanIsToday ? "Gün planı" : "Seçili günün planı"}
        description={`${displayedPlanIsToday ? "Bugün · " : ""}${formatTurkishCivilDate(displayedPlanWorkspace.civilDate)} · ${displayedPlanWorkspace.planItems.some((item) => item.kind === "premium-flow-block") ? "Kayıtlı günlük akış" : "Kayıtlı etkinlikler"}`}
        snap={0.78}
      >
        <button
          className="plans-calendar-button"
          type="button"
          onClick={() => void openAcademicCalendar(displayedPlanWorkspace.civilDate)}
        >
          <CalendarIcon aria-hidden="true" />
          <span>
            <strong>2026–2027 eğitim takvimi</strong>
            <small>Ders akışı, veli toplantısı, meyve günü ve etkinlikler</small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
        {!displayedPlanIsToday && displayedScheduledPlan?.editable ? (
          <button
            className="sheet-primary plans-edit-button"
            type="button"
            onClick={() => void editScheduledPlan(displayedScheduledPlan)}
            disabled={dataBusy || writesBlocked}
          >
            <Pencil1Icon aria-hidden="true" /> Gelecek planı düzenle
          </button>
        ) : null}
        {displayedPlanIsToday &&
        !teacherWorkCycle.daily.planId &&
        displayedPlanWorkspace.planItems.length === 0 ? (
          <>
            {planWritesDisabled ? (
              <div
                className="plans-create-readiness"
                id="plans-create-readiness"
                aria-label="Günlük plan hazır olma durumu"
              >
                <LockClosedIcon aria-hidden="true" />
                <span>
                  <strong>Günlük plan yazımı kilitli</strong>
                  <small>Önce etkin veya hazırlanmış eğitim yılına haftalık plan bağlayın.</small>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPlansOpen(false);
                    if (configuredClassroom?.operationalStatus === "preparation") {
                      void startAcademicYearWorkToday();
                      return;
                    }
                    setClassroomOpen(true);
                    setAnnouncement(
                      educationalWriteNotice ??
                        "Günlük plan için eğitim yılı ayarını tamamlayın.",
                    );
                  }}
                >
                  {configuredClassroom?.operationalStatus === "preparation"
                    ? "Çalışmayı bugün başlat"
                    : "Eğitim yılı ayarlarını aç"}
                </button>
              </div>
            ) : null}
            <button
              className="sheet-primary plans-create-button"
              type="button"
              onClick={() => openGuidedDailyPlanning()}
              disabled={planWritesDisabled}
              aria-describedby={
                planWritesDisabled ? "plans-create-readiness" : undefined
              }
            >
              {planWritesDisabled ? (
                <LockClosedIcon aria-hidden="true" />
              ) : (
                <PlusIcon aria-hidden="true" />
              )}
              {preparationPlanningAllowed
                ? "Gelecek günlük planı oluştur"
                : "Günlük plan oluştur"}
            </button>
          </>
        ) : null}
        {displayedPlanIsToday &&
        teacherWorkCycle.daily.planId &&
        displayedPlanPrimaryActivity?.activityId ? (
          <button
            className="sheet-primary plans-create-button"
            type="button"
            onClick={() =>
              void openActivityEvidence(displayedPlanPrimaryActivity.activityId!)
            }
            disabled={dataBusy || educationalWritesDisabled}
          >
            <PlayIcon aria-hidden="true" />
            {displayedPlanPrimaryActivity.status === "planned"
              ? "Sıradaki etkinliği başlat"
              : "Sıradaki etkinliğe gözlem ekle"}
          </button>
        ) : null}
        {displayedPlanWorkspace.planItems.length > 0 ? (
          <div className="activity-list">
            {displayedPlanWorkspace.planItems.map((item, index) => {
              const actionable = Boolean(
                displayedPlanIsToday &&
                  item.activityId &&
                  item.canCaptureEvidence,
              );
              const className = `activity-row is-${item.flowBlockStatus === "skipped" ? "skipped is-next" : item.status === "in_progress" ? "current" : item.status === "completed" ? "completed" : "next"}`;
              const content = (
                <>
                  <span className="activity-marker" aria-hidden="true">{item.status === "completed" && item.flowBlockStatus !== "skipped" ? <CheckCircledIcon /> : index + 1}</span>
                  <span className="activity-copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.startTime ?? (item.durationMinutes ? `${item.durationMinutes} dk` : "Akış sırası")} · <b>{todayPlanItemStatusLabel(item)}</b>
                    </small>
                    {item.activityTitle && item.activityTitle !== item.title ? (
                      <small>Etkinlik: {item.activityTitle}</small>
                    ) : null}
                    {item.purpose ? <small>{item.purpose}</small> : null}
                    {item.transitionNote ? (
                      <small>Geçiş: {item.transitionNote}</small>
                    ) : null}
                    {item.teacherNote ? (
                      <small>Öğretmen notu: {item.teacherNote}</small>
                    ) : null}
                  </span>
                  <span className="activity-evidence">
                    {actionable
                      ? item.status === "planned"
                        ? "Başlat"
                        : "Gözlem ekle"
                      : item.activityId
                        ? "Planlı etkinlik"
                        : item.flowBlockStatus === "skipped"
                          ? "Atlandı"
                          : "Akış adımı"}
                  </span>
                </>
              );
              if (!actionable) {
                return (
                  <article
                    className={`${className} is-static`}
                    key={item.id}
                    data-plan-item-actionable="false"
                  >
                    {content}
                  </article>
                );
              }
              return (
                <button
                  className={className}
                  type="button"
                  key={item.id}
                  data-plan-item-actionable="true"
                  onClick={() => void openActivityEvidence(item.activityId!)}
                  disabled={educationalWritesDisabled}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-work">
            <h2>Henüz kayıtlı plan yok</h2>
            <p>Bu ekran yalnız kaydedilmiş planları gösterir; sahte etkinlik oluşturmaz.</p>
          </div>
        )}
      </BottomSheet>

      {premiumLegacyRequested ? (
        <BottomSheet
          open={premiumGateOpen}
          onOpenChange={setPremiumGateOpen}
          title="Plan Kütüphanesi erişimi"
          description="Premium üyelik sistemi korunur; bu telefon yalnız doğrulanmış erişimle plan paketlerini açar."
          snap={0.72}
        >
          <div className="premium-gate-summary" role="status">
            <StarIcon aria-hidden="true" />
            <span>
              <strong>Planlar ayrı, güvenlik ayarları ayrı</strong>
              <small>
                Etkinleştirme yalnız Plan Kütüphanesi için istenir; cihaz yedeği ve
                uygulama kilidi ayarlarına yönlendirilmezsiniz.
              </small>
            </span>
          </div>
          {premiumGateMounted || premiumGateOpen ? (
            <Suspense fallback={<div className="premium-loading" role="status">Premium erişim alanı açılıyor…</div>}>
              <FounderPremiumActivationPanel
                access={premiumFounderAccess?.access ?? null}
                busy={premiumFounderBusy}
                configured={premiumFounderConfigurationState.configuration !== null}
                error={premiumFounderError}
                errorPresentation={premiumFounderErrorPresentation}
                resetBusy={premiumFounderResetBusy}
                onActivate={activateFounderPremium}
                onOpenPlans={openPremiumPlans}
                onResetLocalLicense={resetFounderPremiumLocalLicense}
              />
            </Suspense>
          ) : null}
        </BottomSheet>
      ) : null}

      <BottomSheet open={!!tomorrowTool&&!securityGateOpen} onOpenChange={open=>{if(!open)setTomorrowTool(null);}} title={tomorrowTool?.kind==='groups'?'Yarının küçük grubu':'Yarının aile kartı'} description={tomorrowTool?.civilDate??''} snap={0.94}>
        {tomorrowTool&&!securityGateOpen&&<Suspense fallback={<p role="status">Hazırlık açılıyor…</p>}>{tomorrowTool.kind==='groups'?<TomorrowSmallGroupPanel store={store} civilDate={tomorrowTool.civilDate} refreshKey={followupRevision} disabled={writesBlocked||dataBusy||educationalWritesDisabled} onChanged={()=>setFollowupRevision(v=>v+1)} onOpenPlan={id=>{setTomorrowTool(null);openDeskPlan(id);}}/>:<TomorrowHomeGamePanel store={store} civilDate={tomorrowTool.civilDate} refreshKey={followupRevision} disabled={writesBlocked||dataBusy||educationalWritesDisabled} onChanged={()=>setFollowupRevision(v=>v+1)} onOpenPlanning={date=>{setTomorrowTool(null);openGuidedDailyPlanning(date);}}/>}</Suspense>}
      </BottomSheet>
      <BottomSheet open={!!classDutyRequest&&!securityGateOpen} onOpenChange={open=>{if(!open)setClassDutyRequest(null);}} title="Sınıf görev çizelgeleri" description="Çocukları ve günleri seçin; dağılımı kaydedin, değiştirin ve çıktısını alın." snap={0.94}>
        {classDutyRequest&&!securityGateOpen&&<Suspense fallback={<p role="status">Görev çizelgeleri hazırlanıyor…</p>}><ClassDutySchedulePanel store={store} initialMonth={classDutyRequest.month} initialKind={classDutyRequest.kind} initialScheduleId={classDutyRequest.scheduleId} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked||dataBusy||educationalWritesDisabled}
          onChanged={()=>{setFollowupRevision(v=>v+1);void refreshD1Workspaces().catch(()=>setAnnouncement("Çizelge kaydedildi. Ekranı yeniden açarak güncelleyebilirsiniz."));}}
          onOpenCalendar={date=>{setClassDutyRequest(null);void openAcademicCalendar(date);}} /></Suspense>}
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
              <span className="d1-kicker">Resmî Takvim</span>
              <strong>1. Dönem Dersleri Aktif (14 Eylül 2026 – 22 Ocak 2027)</strong>
              <small>
                2026–2027 Eğitim Öğretim Yılı · 2. Dönem Bitişi: 25 Haziran 2027.
              </small>
            </div>
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
              const scheduledPlans = scheduledPlanWorkspace.plans.filter(
                (plan) => plan.civilDate === day.civilDate,
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
                    scheduledPlans.length > 0 ? "has-plan" : "",
                  ].filter(Boolean).join(" ")}
                  aria-selected={day.civilDate === calendarSelectedDate}
                  aria-label={`${formatTurkishCivilDate(day.civilDate)}${
                    official.length + entries.length + scheduledPlans.length > 0
                      ? `, ${official.length + entries.length + scheduledPlans.length} kayıt`
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
                  selectedTeacherCalendarEntries.length +
                  selectedScheduledPlans.length}{" "}
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
                  {calendarDutyLinks[entry.id]?<button type="button" onClick={()=>{setCalendarOpen(false);setClassDutyRequest(calendarDutyLinks[entry.id]!);}}>Görevi çizelgede düzenle</button>:<><select
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
                  </>}
                </div>
              </article>
            ))}

            {selectedScheduledPlans.map((plan) => (
              <article
                className={`calendar-scheduled-plan ${plan.integrityStatus === "invalid" ? "has-integrity-warning" : ""}`}
                key={plan.planId}
                data-testid="calendar-scheduled-plan"
              >
                <div>
                  <span>Kayıtlı günlük plan</span>
                  <strong>{plan.planTitle}</strong>
                  <p>{plan.flowBlockCount > 0 ? `${plan.flowBlockCount} akış bloğu` : "Günlük plan"} · {plan.persistedActivityCount} uygulanacak etkinlik</p>
                  <small>{plan.activityTitle}</small>
                  {plan.integrityStatus === "invalid" ? (
                    <em>{plan.editBlockReason}</em>
                  ) : null}
                </div>
                <div className="calendar-plan-actions">
                  <button
                    type="button"
                    onClick={() => void viewScheduledPlanFlow(plan)}
                    disabled={dataBusy}
                  >
                    Akışı gör
                  </button>
                  {plan.editable ? (
                    <button
                      type="button"
                      onClick={() => void editScheduledPlan(plan)}
                      disabled={dataBusy || writesBlocked}
                    >
                      <Pencil1Icon aria-hidden="true" /> Düzenle
                    </button>
                  ) : null}
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
                ref={calendarEntryTitleRef}
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
        title="Belgeler"
        description="Resmî formlar ve yalnız öğretmenin seçtiği kapsamla hazırlanan dışa aktarımlar"
        snap={0.82}
      >
        <section
          className="documents-plan-center"
          data-documents-section="overview"
          aria-labelledby="documents-plan-center-title"
        >
          <div className="documents-plan-center-heading">
            <span aria-hidden="true"><ReaderIcon /></span>
            <div>
              <small>Plan → değerlendirme → belge</small>
              <h3 id="documents-plan-center-title">Plan ve değerlendirme belgeleri</h3>
              <p>
                Yıllık, aylık, haftalık ve günlük plan kayıtları ile öğretmen
                değerlendirmelerini aynı kaynak zincirinden görsel PDF veya DOCX alın.
              </p>
            </div>
          </div>
          <div className="documents-plan-status" role="status">
            <span>
              <strong>{teacherWorkCycle.annual ? "Yıllık omurga kayıtlı" : "Yıllık omurga yok"}</strong>
              <small>
                {teacherWorkCycle.monthly
                  ? `${teacherWorkCycle.monthly.weeklyPlanCount} hafta · ${teacherWorkCycle.monthly.dailyPlanCount} günlük plan`
                  : "Aylık ve haftalık plan zinciri henüz kurulmadı"}
              </small>
            </span>
            <span>
              <strong>
                {teacherWorkCycle.documents.monthlyEvaluationCount > 0
                  ? `${teacherWorkCycle.documents.monthlyEvaluationCount} aylık değerlendirme`
                  : "Aylık değerlendirme yok"}
              </strong>
              <small>Ek 18 yalnız kayıtlı öğretmen değerlendirmesinden üretilir.</small>
            </span>
          </div>
          <div className="documents-plan-actions">
            <button
              type="button"
              onClick={() => {
                setDocumentsOpen(false);
                openTeacherPlanRecords("annual");
              }}
            >
              <ReaderIcon aria-hidden="true" /> Plan belgelerini aç
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentsOpen(false);
                openTeacherPlanRecords("monthly");
              }}
            >
              <ArchiveIcon aria-hidden="true" /> Aylık değerlendirme ve Ek 18
            </button>
          </div>
        </section>
        <div data-documents-section="anecdotes">
          <Suspense
            fallback={
              <div className="route-loading" role="status">
                Anekdot belgeleri hazırlanıyor…
              </div>
            }
          >
            <AnecdoteCenterPanel
              workspace={anecdoteWorkspace}
              busy={dataBusy}
              onSave={saveAnecdoteDocumentDraft}
              onApprove={approveAnecdoteDocument}
              onDownload={downloadAnecdoteDocument}
              onCompleteCurriculumLink={openAnecdoteCurriculumLink}
            />
          </Suspense>
        </div>
        <section className="documents-coming-soon" data-documents-section="students">
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
                onClick={(event) => {
                  setDocumentsOpen(false);
                  openStudentProfile(student.id, "flow", event.currentTarget);
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

      {studentImportScope && !securityGateOpen ? <Suspense fallback={<p role="status">Excel aktarımı hazırlanıyor…</p>}>
        <StudentImportSheet civilDate={attendanceCivilDate} classroomName={configuredClassroom?.classroomName ?? "Aktif sınıf"}
          existing={[...students, ...archivedStudents]}
          onClose={() => { keyboard.hide(); setStudentImportScope(null); }}
          onCommit={async selections => {
            if (writesBlocked || dataBusy) throw new Error("Kayıt alanı henüz hazır değil. Lütfen yeniden deneyin.");
            setDataBusy(true);
            try {
              const { commitStudentImport } = await import("./features/students/student-import-service.ts");
              const imported = await enqueuePersistence(() => commitStudentImport(store, { selections, scope: studentImportScope }));
              setStudents(current => [...current, ...imported.filter(student => !current.some(existing => existing.id === student.id))]);
              setStudentSearch("");
              setAnnouncement(`${imported.length} öğrenci veli bilgileriyle sınıfa eklendi.`);
            } finally { setDataBusy(false); }
          }} />
      </Suspense> : null}

      {classroomToolsMounted || studentAddOpen || classExportPreviewOpen ? (
        <Suspense fallback={null}>
          <ClassroomToolsSheets
            addOpen={studentAddOpen}
            exportOpen={classExportPreviewOpen}
            busy={dataBusy}
            newStudentName={newStudentName}
            newStudentNumber={newStudentNumber}
            newStudentBirthDate={newStudentBirthDate}
            newStudentNationalIdentityNumber={newStudentNationalIdentityNumber}
            newStudentGuardianName={newStudentGuardianName}
            newStudentGuardianPhone={newStudentGuardianPhone}
            newStudentHomeAddress={newStudentHomeAddress}
            newStudentHomeAddressParts={newStudentHomeAddressParts}
            newStudentError={newStudentError}
            civilDate={attendanceCivilDate}
            exportStartDate={classExportStartDate}
            exportEndDate={classExportEndDate}
            exportNameMode={classExportNameMode}
            exportStudentIds={classExportStudentIds}
            students={[...students, ...archivedStudents]}
            observationCount={classExportObservations.length}
            onAddOpenChange={(open) => {
              if (!open) {
                keyboard.hide();
                setNewStudentError("");
              }
              setStudentAddOpen(open);
            }}
            onExportOpenChange={(open) => {
              if (!open) keyboard.hide();
              setClassExportPreviewOpen(open);
            }}
            onNewStudentNameChange={setNewStudentName}
            onNewStudentNumberChange={setNewStudentNumber}
            onNewStudentBirthDateChange={setNewStudentBirthDate}
            onNewStudentNationalIdentityNumberChange={setNewStudentNationalIdentityNumber}
            onNewStudentGuardianNameChange={setNewStudentGuardianName}
            onNewStudentGuardianPhoneChange={setNewStudentGuardianPhone}
            onNewStudentHomeAddressChange={(value, parts) => { setNewStudentHomeAddress(value); setNewStudentHomeAddressParts(parts); }}
            onAddStudent={addStudent}
            onExportStartDateChange={setClassExportStartDate}
            onExportEndDateChange={setClassExportEndDate}
            onExportNameModeChange={setClassExportNameMode}
            onExportStudentIdsChange={setClassExportStudentIds}
            onDownload={downloadClassObservations}
          />
        </Suspense>
      ) : null}

      {simpleObservationOutputOpen ? (
        <Suspense fallback={null}>
          <SimpleObservationOutputSheet
            open={simpleObservationOutputOpen}
            students={students.map((student) => ({
              id: student.id,
              displayName: student.preferredName ?? student.name,
              observationCount: observationCountByStudent.get(student.id) ?? 0,
            }))}
            initialStudentId={selectedProfileStudent?.id ?? students[0]?.id ?? null}
            initialStartCivilDate={
              configuredClassroom?.academicYearStart ?? attendanceCivilDate
            }
            initialEndCivilDate={
              configuredClassroom
                ? attendanceCivilDate < configuredClassroom.academicYearStart
                  ? configuredClassroom.academicYearStart
                  : attendanceCivilDate > configuredClassroom.academicYearEnd
                    ? configuredClassroom.academicYearEnd
                    : attendanceCivilDate
                : attendanceCivilDate
            }
            maximumCivilDate={
              configuredClassroom?.academicYearEnd ?? attendanceCivilDate
            }
            disabled={dataBusy || writesBlocked}
            onOpenChange={setSimpleObservationOutputOpen}
            onGenerate={downloadSimpleObservation}
          />
        </Suspense>
      ) : null}

      <BottomSheet key={completionRequest ? "completion-open" : "completion-closed"}
        open={completionRequest !== null && evidenceFlowRequest === null && !securityGateOpen}
        onOpenChange={open => { if (!open) setCompletionRequest(null); }}
        title="Gözlemden sonraki adım" description="Hazır seçeneklerden seçin; MaarifOS kayıtları ve bağlantıları tamamlasın." snap={0.9}>
        {completionRequest && evidenceFlowRequest === null && !securityGateOpen ? renderActionCenter(completionRequest) : null}
      </BottomSheet>

      <BottomSheet open={planGuidanceCivilDate !== null && !securityGateOpen}
        onOpenChange={open => { if (!open) setPlanGuidanceCivilDate(null); }}
        title="Planı adım adım tamamla" description="Hazır seçeneği seçin; kayıt ve sonraki adım birlikte hazırlansın." snap={0.92}>
        {planGuidanceCivilDate && !securityGateOpen ? renderPlanNextSteps(planGuidanceCivilDate, "daily") : null}
      </BottomSheet>

      <BottomSheet
        open={studentArchiveCandidate !== null}
        onOpenChange={(open) => { if (!open && !dataBusy) setStudentArchiveCandidate(null); }}
        title="Öğrenciyi sil"
        description="Öğrenci sınıf listesinden kaldırılır ve geri alınabilir arşive taşınır."
        snap={0.56}
      >
        {studentArchiveCandidate ? (
          <div className="student-delete-sheet">
            <section className="student-delete-warning">
              <TrashIcon aria-hidden="true" />
              <div>
                <h3>{studentArchiveCandidate.name}</h3>
                <p>Gözlemler, yoklamalar, fotoğraflar, aile bilgileri ve diğer kayıtlar korunur.
                  Sınıfım ekranındaki Silinen / ayrılan öğrenciler bölümünden Geri al ile yeniden sınıfa ekleyebilirsiniz.</p>
              </div>
            </section>
            <button className="student-delete-confirm" type="button" disabled={dataBusy}
              onClick={() => void confirmArchiveStudent()}>
              {dataBusy ? "Taşınıyor…" : "Sil ve geri alınabilir arşive taşı"}
            </button>
            <button className="student-contact-add" type="button" disabled={dataBusy}
              onClick={() => setStudentArchiveCandidate(null)}>Vazgeç</button>
            <button className="student-delete-confirm" type="button" disabled={dataBusy || writesBlocked}
              onClick={() => void openStudentDeletion(studentArchiveCandidate)}>{studentProfileCopy.permanentlyDeleteStudent}</button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={studentDeletionCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !dataBusy) {
            setStudentDeletionCandidate(null);
            setStudentDeletionImpact(null);
            setStudentDeletionConfirmation("");
          }
        }}
        title="Kalıcı öğrenci silme"
        description="Etki özetini inceleyin, seçiminizi onaylayıp kalıcı silmeyi tamamlayın."
        snap={0.82}
      >
        {studentDeletionCandidate && studentDeletionImpact ? (
          <div className="student-delete-sheet">
            {studentDeletionError ? <div role="alert"><p>{studentDeletionError}</p>
              <button type="button" className="student-contact-add" disabled={dataBusy || writesBlocked}
                onClick={() => void openStudentDeletion(studentDeletionCandidate)}>Güncel silme kapsamını yeniden hazırla</button>
            </div> : null}
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
              <div><strong>{studentDeletionImpact.relatedRecordCount}</strong><span>incelenen ilişkili kayıt</span></div>
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
                {studentDeletionImpact.sharedMediaCount} ortak medya. Ortak kayıtların metni korunur;
                metin içinde ayrıca yazılmış öğrenci adları kendiliğinden ayıklanmaz.
              </p>
            ) : null}
            <label className="student-delete-consent">
              <input type="checkbox" disabled={dataBusy || writesBlocked}
                checked={studentDeletionConfirmation === studentDeletionImpact.displayName}
                onChange={event => setStudentDeletionConfirmation(event.target.checked ? studentDeletionImpact.displayName : "")} />
              {studentProfileCopy.permanentDeleteConsent}
            </label>
            <button
              className="student-delete-confirm"
              type="button"
              disabled={
                dataBusy || writesBlocked ||
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
        // Dispose the completed profile surface so an exit animation cannot retain
        // a closed, empty dialog or revive it during a rapid report return.
        key={studentProfileOpen ? "profile-open" : developmentReportOpen ? "profile-during-report" : "profile-closed"}
        open={studentProfileOpen}
        onOpenChange={(open) => {
          if (!open) {
            requestStudentProfileClose();
            return;
          }
          setStudentProfileOpen(true);
        }}
        title={selectedProfileStudent ? `${selectedProfileStudent.name} profili` : "Çocuk profili"}
        description="Kimlik, sınıf bağlamı ve kanıt izi tek yerde"
        snap={0.94}
      >
        {selectedProfileStudent ? (
          <div className="student-profile-sheet" ref={studentProfileSheetRef}>
            <button type="button" className="secondary-action" disabled={writesBlocked || dataBusy || studentSummaryBusy} onClick={() => void openStudentSummaryDocument(selectedProfileStudent.id)}>{studentSummaryBusy ? "Özet hazırlanıyor…" : "Öğrencinin tek sayfalık özetini hazırla"}</button>
            {renderActionCenter({ studentId: selectedProfileStudent.id })}
            {studentProfileTab === "flow" ? <Suspense fallback={null}>
              <StudentDevelopmentPanel key={selectedProfileStudent.id} store={store}
                studentId={selectedProfileStudent.id} civilDate={attendanceCivilDate} refreshKey={evidenceWorkspace} rosterKey={students}
                disabled={dataBusy || educationalWritesDisabled}
                onQuickObservation={(id) => void openStudentObservation(id)}
                onCreateReport={(id, period) => {
                  keyboard.hide();
                  setDevelopmentReportStudentId(id);
                  setDevelopmentReportPeriod(period);
                  setStudentProfileOpen(false);
                  setDevelopmentReportOpen(true);
                }}
                onOpenObservation={(id) => openObservationActions(id, selectedProfileStudent.id)} />
            </Suspense> : null}
            <details className="student-profile-context-details" open={studentProfileTab !== "flow" ? true : undefined}>
              <summary>{REPORT_EDITOR_COPY.profileDetails}</summary>
            <Suspense fallback={null}>
              <StudentProfileOverviewPanel
                avatar={
                  <StudentAvatar
                    student={selectedProfileStudent}
                    className="student-profile-avatar"
                    photoDataUrl={studentProfileForm.profilePhotoDataUrl}
                  />
                }
                preferredName={selectedProfileStudent.preferredName}
                fullName={selectedProfileStudent.name}
                ageLabel={formatChildAge(
                  selectedProfileStudent.birthDate,
                  attendanceCivilDate,
                )}
                profilePhotoBusy={profilePhotoBusy}
                dataBusy={dataBusy}
                hasProfilePhoto={Boolean(studentProfileForm.profilePhotoDataUrl)}
                removedProfilePhoto={Boolean(removedProfilePhoto)}
                attendanceLabel={
                  selectedProfileStudent.attendanceMarked === false
                    ? "İşaretlenmedi"
                    : statusLabels[selectedProfileStudent.status]
                }
                observationCount={selectedStudentObservations.length}
                pendingLinkCount={selectedStudentPendingLinks}
                onSelectPhoto={(file) => void selectStudentProfilePhoto(file)}
                onRemovePhoto={removeStudentProfilePhoto}
                onUndoRemovePhoto={undoRemoveStudentProfilePhoto}
                onShowAllObservations={() => {
                  setStudentProfileTab("flow");
                  setStudentObservationFilter("all");
                  setStudentObservationMonth("all");
                  setStudentObservationLimit(20);
                }}
                onShowPendingLinks={() => {
                  setStudentProfileTab("flow");
                  setStudentObservationFilter("pending-link");
                  setStudentObservationMonth("all");
                  setStudentObservationLimit(20);
                }}
              />
            </Suspense>

            <StudentAttendanceHistoryPanel
              records={studentAttendanceHistory}
              error={studentAttendanceHistoryError}
              formatCivilDate={formatTurkishCivilDate}
            />
            <details className="attendance-calculation-disclosure"><summary>Bu çocuğun devam hesabını incele</summary><Suspense fallback={null}><AttendanceCalculationPanel store={store} civilDate={attendanceCivilDate} studentId={selectedProfileStudent.id} refreshKey={persistenceState.lastCommittedAt} /></Suspense></details>
            <button className="student-share-trigger" type="button" onClick={() => { requestStudentProfileClose(); setManagementRequest({ studentId: selectedProfileStudent.id, section: "growth" }); }}><span><strong>Boy–kilo ve veli izinleri</strong><small>Dönem ölçümleri · grafikler · belgeye bağlı izinler</small></span><ChevronRightIcon aria-hidden="true" /></button>
            <Suspense fallback={null}><DocumentedConsentStatus store={store} studentId={selectedProfileStudent.id} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} onOpen={() => { requestStudentProfileClose(); setManagementRequest({ studentId: selectedProfileStudent.id, section: "consents" }); }} /></Suspense>
            <button className="student-share-trigger" type="button" onClick={() => { requestStudentProfileClose(); setFollowupRequest({ studentId: selectedProfileStudent.id, section: "contacts" }); }}><span><strong>İletişim ve öğretmen takibi</strong><small>Güncellik · teslim · veli görüşmesi · uyum · eğitim adımı</small></span><ChevronRightIcon aria-hidden="true" /></button>

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

            <Suspense fallback={null}>
              <StudentProfileTabs
                activeTab={studentProfileTab}
                portfolioEnabled={isCapabilityEnabled("portfolio")}
                onSelect={setStudentProfileTab}
                onSelectPortfolio={() => {
                  setStudentProfileTab("portfolio");
                  setStudentObservationFilter("all");
                  setStudentObservationMonth("all");
                  setStudentObservationLimit(20);
                  void refreshStudentPortfolio(selectedProfileStudent.id);
                }}
              />
            </Suspense>

            {studentProfileTab === "flow" ? (
              <>
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
                    {selectedStudentObservations.length} gözlem · {studentProfileCopy.observationArchiveHelp}
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
                  aria-pressed={studentObservationFilter === "pending-link"}
                  onClick={() => {
                    setStudentObservationFilter("pending-link");
                    setStudentObservationLimit(20);
                  }}
                >
                  Bağlantı bekleyen · {selectedStudentPendingLinks}
                </button>
                <button
                  type="button"
                  aria-pressed={studentObservationFilter === "pending-assessment"}
                  onClick={() => {
                    setStudentObservationFilter("pending-assessment");
                    setStudentObservationLimit(20);
                  }}
                >
                  Değerlendirme bekleyen · {selectedStudentPendingAssessments}
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
                    const workflowStatus = observation.workflowStatus;
                    const pendingLink =
                      workflowStatus === "program-bağlantısı-bekliyor";
                    const pendingAssessment =
                      workflowStatus === "değerlendirme-bekliyor";
                    return (
                      <li key={observation.id} id={`student-observation-${observation.id}`} tabIndex={-1}>
                        <span className="student-observation-time-dot" aria-hidden="true" />
                        <article>
                          <div>
                            <time dateTime={observation.observedAt}>
                              {formatObservationDateTime(observation.observedAt)}
                            </time>
                            <span
                              className={`observation-link-state observation-link-state--${
                                pendingLink
                                  ? "pending"
                                  : pendingAssessment
                                    ? "assessment"
                                    : "complete"
                              }`}
                              data-workflow-status={workflowStatus}
                            >
                              {OBSERVATION_WORKFLOW_STATUS_LABELS[workflowStatus]}
                            </span>
                          </div>
                          <small>{observation.activityTitle}</small>
                          <p>{observation.rawText}</p>
                          {observation.developmentSelection ? (
                            <details>
                              <summary>Maarif gelişim bilgisi</summary>
                              {observation.confirmedCurriculumTargets.map((target) => (
                                <p key={target.id}>{target.domain} · {target.referenceCode} · {target.referenceTitle}</p>
                              ))}
                              {observation.developmentSupportLabel ? <p>Bu gözlemde destek: {observation.developmentSupportLabel}</p> : null}
                              <p>Bu kayıt tek bir gözlemdir; dönemsel gelişim değerlendirmesi değildir.</p>
                            </details>
                          ) : null}
                          {observation.context ? (
                            <details>
                              <summary>Bağlam ve ayrıntı</summary>
                              <p>{observation.context}</p>
                              {observation.childQuote ? (
                                <blockquote>{observation.childQuote}</blockquote>
                              ) : null}
                            </details>
                          ) : null}
                          <button type="button"
                            onClick={() => openObservationActions(observation.id, observation.studentId)}>
                            <Pencil1Icon aria-hidden="true" />
                            {studentProfileCopy.observationActions}
                          </button>
                          {pendingLink && isCapabilityEnabled("planEvidenceDetails") ? (
                            <button
                              type="button"
                              onClick={() => openPendingObservation(observation)}
                            >
                              <Link2Icon aria-hidden="true" />
                              Program bağlantısını tamamla
                            </button>
                          ) : null}
                          {pendingAssessment && isCapabilityEnabled("planEvidenceDetails") ? (
                            <button
                              type="button"
                              className="student-observation-assessment-action"
                              onClick={() => openPendingAssessment(observation)}
                            >
                              <ReaderIcon aria-hidden="true" />
                              Değerlendirmeyi tamamla
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
                  <strong>
                    {selectedStudentObservations.length > 0
                      ? "Bu filtrede bekleyen kayıt yok"
                      : "Henüz gözlem yok"}
                  </strong>
                  <span>
                    {selectedStudentObservations.length > 0
                      ? "Tümü filtresine dönerek tamamlanan kayıtları görebilirsiniz."
                      : "İlk not kaydedildiğinde tarih ve saatiyle burada görünür."}
                  </span>
                  <button type="button" onClick={() => {
                    if (selectedStudentObservations.length > 0) {
                      setStudentObservationFilter("all");
                      setStudentObservationMonth("all");
                    } else {
                      void openStudentObservation(selectedProfileStudent.id);
                    }
                  }}>
                    {selectedStudentObservations.length > 0 ? studentProfileCopy.showAllObservations : studentProfileCopy.addFirstObservation}
                  </button>
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
            studentProfileTab === "contacts" ||
            studentProfileTab === "care" ||
            studentProfileTab === "family" ? (
            <form
              className="student-profile-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveStudentProfile(event.currentTarget);
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
                  Öğrenci numarası
                  <KeyboardInput
                    id="student-profile-code"
                    value={studentProfileForm.optionalCode}
                    onChange={(event) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        optionalCode: event.target.value,
                      }))
                    }
                    placeholder="Örn. 27"
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

              <div className="student-profile-form-grid">
                <label htmlFor="student-profile-national-identity-number">
                  T.C. kimlik numarası (isteğe bağlı)
                  <KeyboardInput
                    id="student-profile-national-identity-number"
                    name="nationalIdentityNumber"
                    inputMode="numeric"
                    maxLength={11}
                    value={studentProfileForm.nationalIdentityNumber}
                    onChange={(event) => {
                      const nationalIdentityNumber = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      setStudentProfileForm((current) => ({
                        ...current,
                        nationalIdentityNumber,
                      }));
                    }}
                    placeholder="11 hane"
                    autoComplete="off"
                  />
                </label>
                <label htmlFor="student-profile-enrollment-year">
                  Okula kayıt yılı
                  <KeyboardInput
                    id="student-profile-enrollment-year"
                    name="enrollmentYear"
                    inputMode="numeric"
                    maxLength={4}
                    value={studentProfileForm.enrollmentYear}
                    onChange={(event) => {
                      const enrollmentYear = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      setStudentProfileForm((current) => ({
                        ...current,
                        enrollmentYear,
                      }));
                    }}
                    placeholder="Örn. 2025"
                    autoComplete="off"
                  />
                </label>
              </div>

              <StudentAddressField id="student-profile-home-address" value={studentProfileForm.careDetails.homeAddress}
                parts={studentProfileForm.careDetails.homeAddressParts}
                disabled={dataBusy} onChange={updateStudentHomeAddress} />

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
                <Suspense fallback={null}>
                  <StudentProfileSafetyPanels
                    mode="contacts"
                    studentSurname={studentProfileForm.lastName}
                    homeAddress={studentProfileForm.careDetails.homeAddress}
                    homeAddressParts={studentProfileForm.careDetails.homeAddressParts}
                    onHomeAddressChange={updateStudentHomeAddress}
                    contacts={studentProfileForm.contacts}
                    removedContact={removedStudentContact}
                    onUpdateContact={updateStudentContact}
                    onSetPrimary={setPrimaryStudentContact}
                    onAddContact={addStudentContact}
                    onRemoveContact={removeStudentContact}
                    onUndoRemove={undoRemoveStudentContact}
                  />
                </Suspense>
              ) : null}

              {studentProfileTab === "care" ? (
                <Suspense fallback={null}>
                  <StudentProfileSafetyPanels
                    mode="care"
                    careDetails={studentProfileForm.careDetails}
                    onHomeAddressChange={updateStudentHomeAddress}
                    onCareDetailsChange={(field, value) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        careDetails: {
                          ...current.careDetails,
                          [field]: value,
                        },
                      }))
                    }
                  />
                </Suspense>
              ) : null}

              {studentProfileTab === "family" ? (
                <Suspense fallback={null}>
                  <StudentProfileSafetyPanels
                    mode="family"
                    careDetails={studentProfileForm.careDetails}
                    onCareDetailsChange={(field, value) =>
                      setStudentProfileForm((current) => ({
                        ...current,
                        careDetails: {
                          ...current.careDetails,
                          [field]: value,
                        },
                      }))
                    }
                  />
                </Suspense>
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
            </details>
          </div>
        ) : null}
      </BottomSheet>

      {developmentReportOpen && developmentReportStudentId ? <Suspense fallback={null}>
        <DevelopmentReportDialog store={store} studentId={developmentReportStudentId}
          civilDate={attendanceCivilDate} suspended={securityGateOpen} initialPeriod={developmentReportPeriod} registerDraftFlusher={registerDraftFlusher}
          runWrite={(task) => enqueuePersistence(task, { failureDetail: "Gözlem özeti bu cihaza kaydedilemedi.", successDetail: "Gözlem özeti bu cihazda korundu." })}
          onClose={() => { keyboard.hide(); setDevelopmentReportOpen(false); if (!native) setStudentProfileOpen(true); }} />
      </Suspense> : null}

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
                <strong>
                  {isExternalAiDossierDestination(studentShareForm.destination)
                    ? "Kimliksiz analiz paketi hazırlanır"
                    : "Tam öğrenci dosyası hazırlanır"}
                </strong>
                {isExternalAiDossierDestination(studentShareForm.destination) ? (
                  <p>
                    Yalnız sistem takma adı kullanılır; ad, okul numarası,
                    yakınlar ve telefonlar pakete eklenmez.
                  </p>
                ) : (
                  <p>
                    Ad soyad, okul numarası, yakın bilgileri ve seçili eğitim
                    kayıtları maskelenmeden kullanılır.
                  </p>
                )}
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
                          ...dossierPrivacyDefaults(destination),
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
                <h3>
                  {isExternalAiDossierDestination(studentShareForm.destination)
                    ? "Takma ad ve eğitim kayıtları"
                    : "Tam kimlik ve kayıtlar"}
                </h3>
              </div>
              {isExternalAiDossierDestination(studentShareForm.destination) ? (
                <p>
                  Analiz paketi devam, gözlem, portfolyo ve kayıtlı geri
                  bildirimleri sistem takma adıyla içerir.
                </p>
              ) : (
                <p>
                  Varsayılan dosya; öğrenci kimliği, yakınlar, telefonlar,
                  devam, gözlem, portfolyo ve kayıtlı geri bildirimleri içerir.
                </p>
              )}
              <details className="quick-details student-share-options">
                <summary tabIndex={0}>
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
                  ] as const)
                    .filter(
                      ([field]) =>
                        field !== "includeContacts" ||
                        !isExternalAiDossierDestination(
                          studentShareForm.destination,
                        ),
                    )
                    .map(([field, label]) => (
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
                <summary tabIndex={0}>
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
                <summary tabIndex={0}>
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

      <BottomSheet open={familyMeetingAppointmentId !== null && !securityGateOpen} onOpenChange={open => { if (!open) setFamilyMeetingAppointmentId(null); }} title="Veli görüşme formu" description="Gündemi inceleyin, sonucu kaydedin ve takip işlerini tamamlayın." snap={0.94}>
        {familyMeetingAppointmentId && !securityGateOpen ? <Suspense fallback={<p role="status">Görüşme formu hazırlanıyor…</p>}><FamilyMeetingFormPanel key={familyMeetingAppointmentId} store={store} appointmentId={familyMeetingAppointmentId} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy || educationalWritesDisabled} onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Görüşme kaydedildi; ekranı yeniden açarak güncelleyebilirsiniz.")); }} onClose={() => setFamilyMeetingAppointmentId(null)} /></Suspense> : null}
      </BottomSheet>
      <BottomSheet key={managementRequest ? "classroom-management-open" : "classroom-management-closed"} open={managementRequest !== null} onOpenChange={open => { if (!open) { keyboard.hide(); setManagementRequest(null); } }} title="Sınıf yönetimi" description="Sınıf düzeni, aile iletişimi, ölçümler ve belgeler" snap={0.94}>
        {managementRequest ? <Suspense fallback={<p role="status">Sınıf yönetimi açılıyor…</p>}><ClassroomManagementWorkspace store={store} initialStudentId={managementRequest.studentId} initialSection={managementRequest.section} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} disabled={writesBlocked || dataBusy} onChanged={() => { setFollowupRevision(v => v + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Sınıf kaydı saklandı; ekranı yeniden açarak güncelleyebilirsiniz.")); }} /></Suspense> : null}
      </BottomSheet>
      <BottomSheet key={followupRequest ? "teacher-followup-open" : "teacher-followup-closed"} open={followupRequest !== null} onOpenChange={open => { if (!open) { keyboard.hide(); setFollowupRequest(null); } }} title="Öğretmen takip defteri" description="Çocuk, aile ve haftalık hazırlık kayıtları" snap={0.94}>
        {followupRequest ? <Suspense fallback={<p role="status">Takip defteri açılıyor…</p>}><TeacherFollowupWorkspace store={store} initialStudentId={followupRequest.studentId} initialSection={followupRequest.section} initialPickupCivilDate={followupRequest.civilDate} refreshKey={persistenceState.lastCommittedAt} disabled={writesBlocked || dataBusy} onOpenStudent={id => { setFollowupRequest(null); openStudentProfile(id, "contacts"); }} onOpenPlans={() => { setFollowupRequest(null); navigate("plans"); }} onChanged={() => { setFollowupRevision(value => value + 1); void refreshD1Workspaces().catch(() => setAnnouncement("Kayıt saklandı; plan ekranını yeniden açarak güncelleyebilirsiniz.")); }} /></Suspense> : null}
      </BottomSheet>
      <AttendancePanels
        store={store}
        open={attendanceOpen}
        onOpenChange={changeAttendanceOpen}
        students={attendanceRoster}
        calculationDetails={attendanceOpen ? <Suspense fallback={null}><AttendanceCalculationPanel store={store} civilDate={attendanceCivilDate} refreshKey={persistenceState.lastCommittedAt} /></Suspense> : null}
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
            setSettingsInitialSection("overview");
          }
          setProfileOpen(open);
        }}
        title="Hesap ve veri güvenliği"
        description="MaarifOS yerel önceliklidir. Hesap bağlantısı isteğe bağlıdır."
        snap={0.86}
      >
        <div className="security-panel">
          {profileOpen ? <Suspense fallback={null}><BackupRecoveryPanel getBackupService={getBackupService} refreshKey={`${persistenceState.lastCommittedAt}:${followupRevision}`} /></Suspense> : null}
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
            <button
              className="install-app-button"
              type="button"
              style={{
                marginTop: "8px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                border: "none",
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => {
                setProfileOpen(false);
                window.dispatchEvent(new CustomEvent("maarif_open_settings"));
              }}
            >
              ⭐ MaarifOS Lisans ve Aktivasyon Kodu (PIN) Gir
            </button>
          </section>

          <section className="local-vault-card" aria-label="Cihazdaki veri durumu">
            <span className="security-icon"><LockClosedIcon aria-hidden="true" /></span>
            <span>
              <strong>
                {appLockSetting
                  ? "MaarifOS erişimi PIN ile kilitli"
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
                    ? "Arka plana geçince veya 5 dakika işlem yapılmayınca MaarifOS kilitlenir. Bu PIN cihaz depolamasını şifrelemez."
                    : "En az 6 karakterlik PIN ile uygulama erişimini sınırlayın; cihaz ekran kilidini de açık tutun."}
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
                  <KeyboardInput
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
                  <KeyboardInput
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

          {profileOpen&&!securityGateOpen&&<div data-settings-section="account"><Suspense fallback={<p role="status">Hesap seçenekleri açılıyor…</p>}><CloudAccountPanel store={store} version={CURRENT_RELEASE.version} disabled={writesBlocked||dataBusy||securityGateOpen} canWrite={()=>!deskDocumentBlocked.current}
            onChanged={({localChanged})=>{setAnnouncement("Şifreli Drive yedeği doğrulandı.");if(localChanged)window.location.reload();}} /></Suspense></div>}

          <section className="security-section" aria-labelledby="store-release-heading">
            <div className="security-heading-row">
              <div>
                <h3 id="store-release-heading">Mobil mağaza yayını</h3>
                <p>Doğrulanmış Android ve iOS sürümleri mağaza incelemesine hazırlanıyor.</p>
              </div>
              <span className="optional-badge">Yakında</span>
            </div>
            <p className="provider-status">
              Yayın tamamlandığında yalnız Google Play, App Store, maarifos.com ve maarifos.net üzerinden duyurulacaktır.
            </p>
          </section>

          <section className="release-summary-card" aria-labelledby="release-summary-heading">
            <div className="release-summary-heading">
              <span className="release-summary-icon" aria-hidden="true">
                <MagicWandIcon />
              </span>
              <span>
                <small>Bu cihazdaki uygulama</small>
                <h3 id="release-summary-heading">MaarifOS {CURRENT_RELEASE.version}</h3>
              </span>
              <b>
                {updateReady ? (
                  <MagicWandIcon aria-hidden="true" />
                ) : updateCheckBusy ? (
                  <ClockIcon aria-hidden="true" />
                ) : pwaStatus?.phase === "error" ? (
                  <Cross2Icon aria-hidden="true" />
                ) : (
                  <CheckCircledIcon aria-hidden="true" />
                )}
                {releaseStatusLabel}
              </b>
            </div>
            <p>{CURRENT_RELEASE.title}</p>
            <div className="release-meta" aria-label="Sürüm bilgileri">
              <span>Uygulama {CURRENT_RELEASE.version}</span>
              <span title={`Kaynak ${BUILD_IDENTITY.revision}; SHA-256 ${BUILD_IDENTITY.sourceSha256}; UTC ${BUILD_IDENTITY.builtAt}`}>Derleme {BUILD_IDENTITY.sourceSha256.slice(0, 12)}</span>
              {pwaStatus?.activeVersion ? (
                <span>Çevrim dışı paket {pwaStatus.activeVersion}</span>
              ) : null}
              <time dateTime={CURRENT_RELEASE.releasedOn}>
                {formatTurkishCivilDate(CURRENT_RELEASE.releasedOn)}
              </time>
            </div>
            <small className="provider-status" role="status">
              {pwaStatus?.message ?? "Güncelleme hizmeti hazırlanıyor."}
            </small>
            <button
              className="install-app-button"
              type="button"
              onClick={() => {
                if (updateReady) {
                  void applyReadyUpdate();
                  return;
                }
                checkForUpdates();
              }}
              disabled={dataBusy || updateCheckBusy || updateActionUnavailable}
            >
              {updateReady ? (
                <MagicWandIcon aria-hidden="true" />
              ) : (
                <CheckCircledIcon aria-hidden="true" />
              )}
              <span>
                {updateReady
                  ? `${displayedUpdateVersion} sürümüne güvenle güncelle`
                  : updateCheckBusy
                    ? "Güncellemeler denetleniyor"
                    : "Güncellemeleri şimdi denetle"}
              </span>
            </button>
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
              <article data-level={recoveryHealth.kind}>
                <strong>Kurtarma tatbikatı</strong>
                <span>{recoveryHealth.message}</span>
                {recoveryHealth.lastRestoreDrillAt ? (
                  <time dateTime={recoveryHealth.lastRestoreDrillAt}>
                    {formatTurkishCivilDate(
                      recoveryHealth.lastRestoreDrillAt.slice(0, 10),
                    )}
                  </time>
                ) : null}
              </article>
            </div>
          </section>

          <section
            className="security-section"
            aria-labelledby="backup-heading"
            data-settings-section="backup"
          >
            <div className="security-heading-row">
              <div>
                {settingsInitialSection === "backup" ? (
                  <span className="d1-kicker">
                    {lastSuccessfulBackupAt
                      ? "Başlangıç planı · tamamlandı"
                      : "Başlangıç planı · 4. adım"}
                  </span>
                ) : null}
                <h3 id="backup-heading">Şifreli yedek ve geri yükle</h3>
                <p>
                  Yeni yedekler parola ile AES-GCM şifrelenir. Parola
                  saklanmaz ve unutulursa dosya açılamaz.
                </p>
              </div>
            </div>
            <DeviceTransferGuide
              disabled={dataBusy || writesBlocked}
              lastBackupAt={lastSuccessfulBackupAt}
              lastVerifiedRestoreAt={recoveryHealth.lastRestoreDrillAt}
              onPrepareBackup={() => {
                const input = document.getElementById("backup-password");
                input?.scrollIntoView({ block: "center", behavior: "instant" });
                input?.focus();
              }}
              onSelectBackup={() => restoreFileRef.current?.click()}
            />
            {lastSuccessfulBackupAt ? (
              <div className="backup-setup-complete" role="status">
                <CheckCircledIcon aria-hidden="true" />
                <span>
                  <strong>İlk kurulum tamamlandı · 4/4</strong>
                  Şifreli yedek oluşturuldu ve aynı parola ile açılarak doğrulandı.
                  Dosyayı güvenli bir yerde saklayın.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("today");
                  }}
                >
                  Bugüne dön
                </button>
              </div>
            ) : null}
            <div
              className="backup-recovery-health"
              data-state={recoveryHealth.kind}
              role="status"
            >
              <span>
                <strong>Kurtarma sağlığı</strong>
                {recoveryHealth.message}
              </span>
              {backupHealthReceipt ? (
                <small>
                  Şema {backupHealthReceipt.dataSchemaVersion} · uygulama {backupHealthReceipt.appVersion} ·{" "}
                  {Math.max(1, Math.ceil(backupHealthReceipt.encryptedByteLength / 1024))} KB şifreli dosya
                </small>
              ) : null}
            </div>
            {recoverySnapshotWarning ? (
              <p className="security-inline-error" role="alert">
                {recoverySnapshotWarning}
              </p>
            ) : null}
            <div className="secure-secret-form secure-secret-form--backup">
              <label htmlFor="backup-password">
                Yedek parolası
                <KeyboardInput
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
                <KeyboardInput
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
                      <KeyboardInput
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
          <details className="security-section security-advanced-zone">
            <summary>
              <GearIcon aria-hidden="true" />
              <span>
                <strong>Gelişmiş cihaz işlemleri</strong>
                <small>Günlük kullanım ve ilk yedekleme için gerekli değildir</small>
              </span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="security-danger-zone">
              <div className="security-danger-heading">
                <TrashIcon aria-hidden="true" />
                <span>
                  <strong>Tüm cihaz verilerini sil</strong>
                  Öğrenciler, kayıtlar, ayarlar ve kurtarma noktaları kalıcı silinir.
                </span>
              </div>
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

      {teacherPlanRecordsOpen ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setTeacherPlanRecordsOpen(false);
          }}
        >
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content className="d1-flow-layer" key="teacher-plan-records">
            <Dialog.Title className="sr-only">Kayıtlı öğretmen planı</Dialog.Title>
            <Dialog.Description className="sr-only">
              Bu cihazdaki yıllık, aylık, haftalık ve günlük öğretmen planlarını
              inceleyin, düzenleyin ve belge olarak alın.
            </Dialog.Description>
            <Suspense
              fallback={(
                <div className="premium-loading" role="status">
                  Kalıcı öğretmen planı açılıyor…
                </div>
              )}
            >
              <TeacherOwnedPlanScreen
                store={store}
                workspace={teacherWorkCycle}
                scheduledPlans={scheduledPlanWorkspace.plans}
                initialLevel={teacherPlanRecordsInitialLevel}
                initialMonthKey={teacherPlanRecordsInitialMonthKey}
                initialPlanId={teacherPlanRecordsInitialPlanId}
                onContinueToDaily={openGuidedDailyPlanning}
                contentPack={premiumFounderAccess?.pack ?? null}
                educationalWritesDisabled={planWritesDisabled}
                educationalWriteNotice={educationalWriteNotice}
                documentContext={{
                  schoolName: configuredClassroom?.schoolName,
                  teacherName: configuredClassroom?.teacherName,
                  classroomName: configuredClassroom?.classroomName,
                  academicYearName: configuredClassroom?.academicYearName,
                  ageGroup: configuredClassroom?.ageGroup,
                  curriculumProgram: CURRICULUM_PROGRAM_LABELS.tymm,
                }}
                showProviderLibrary={
                  premiumPlanEntryEnabled && currentClassTymmAgeBand === "60-72"
                }
                onOpenProviderLibrary={(
                  initialSection = "overview",
                  builtInPackReference,
                ) => {
                  setTeacherPlanRecordsOpen(false);
                  openPremiumPlans(
                    initialSection,
                    builtInPackReference ?? null,
                  );
                }}
                onClose={() => setTeacherPlanRecordsOpen(false)}
                onViewDailyPlan={(plan) => {
                  setTeacherPlanRecordsOpen(false);
                  void viewScheduledPlanFlow(plan);
                }}
                onEditDailyPlan={(plan) => {
                  setTeacherPlanRecordsOpen(false);
                  void editScheduledPlan(plan);
                }}
                onCreatePlanGraph={async (input) => {
                  const { createTeacherOwnedPlanGraph } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  const graph = await enqueuePersistence(
                    () => createTeacherOwnedPlanGraph(store, input),
                    {
                      // Hizmet etkin sınıfı, eğitim yılını ve çakışan planları
                      // aynı atomik transaction içinde yeniden doğrular. Burada
                      // ikinci bir tam kasa okuması yapmak özellikle WebKit'te
                      // ilk plan kaydını gereksiz yere geciktiriyordu.
                      atomicEducationalWrite: true,
                      educationalWrite: {
                        allowPreparationForCivilDate: input.periodStart,
                      },
                      failureDetail:
                        "Öğretmen plan zinciri kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Yıl, ay ve hafta planı tek işlemde bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Plan zinciri kaydedildi; özet yenilenemedi. Aynı planı yeniden kaydetmeyin.",
                    );
                  });
                  return graph;
                }}
                onAppendPlanMonths={async (input) => {
                  const { appendTeacherOwnedPlanMonths } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  const graph = await enqueuePersistence(
                    () => appendTeacherOwnedPlanMonths(store, input),
                    {
                      educationalWrite: {
                        allowPreparationForCivilDate:
                          input.months[0]?.periodStart ?? attendanceCivilDate,
                      },
                      failureDetail:
                        "Yıllık planın eksik ayları eklenemedi. Mevcut planlar değiştirilmedi.",
                      successDetail:
                        "Eylül–Haziran plan omurgası bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Yıllık plan tamamlandı; özet yenilenemedi. Aynı ayları yeniden eklemeyin.",
                    );
                  });
                  return graph;
                }}
                onRevisePlan={async (input) => {
                  const { reviseTeacherOwnedPlan } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  const planToRevise = (
                    await store.transaction("readonly", ["plans"], async (transaction) =>
                      (await transaction.getAll("plans")).find(
                        (plan) => plan.id === input.planId,
                      )
                    )
                  );
                  if (
                    !planToRevise ||
                    typeof planToRevise.periodStart !== "string"
                  ) {
                    throw new Error("Revize edilecek öğretmen planı doğrulanamadı.");
                  }
                  const revised = await enqueuePersistence(
                    () => reviseTeacherOwnedPlan(store, input),
                    {
                      educationalWrite: {
                        allowPreparationForCivilDate: planToRevise.periodStart,
                      },
                      failureDetail:
                        "Öğretmen plan revizyonu kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Öğretmen plan revizyonu, önceki sürüm korunarak kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Plan revizyonu kaydedildi; özet yenilenemedi. Aynı değişikliği yeniden göndermeyin.",
                    );
                  });
                  return revised;
                }}
                onRecordWeeklyEvaluation={async (input) => {
                  const { recordTeacherWeeklyEvaluation } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  await enqueuePersistence(
                    () => recordTeacherWeeklyEvaluation(store, input),
                    {
                      educationalWrite: {},
                      failureDetail:
                        "Haftalık öğretmen değerlendirmesi kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Haftalık değerlendirme ve sonraki hafta önerisi bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Haftalık değerlendirme kaydedildi; özet yenilenemedi. Aynı değerlendirmeyi yeniden göndermeyin.",
                    );
                  });
                }}
                onReviewWeeklyCarry={async (input) => {
                  const { reviewTeacherWeeklyCarry } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  await enqueuePersistence(
                    () => reviewTeacherWeeklyCarry(store, input),
                    {
                      educationalWrite: {},
                      failureDetail:
                        "Haftalık öneri kararı kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Haftalık öneri için öğretmen kararı ve revizyon izi bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Öğretmen kararı kaydedildi; özet yenilenemedi. Aynı kararı yeniden göndermeyin.",
                    );
                  });
                }}
                onReviewMonthlyCarry={async (input) => {
                  const { reviewTeacherMonthlyCarry } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  await enqueuePersistence(
                    () => reviewTeacherMonthlyCarry(store, input),
                    {
                      educationalWrite: {},
                      failureDetail:
                        "Aylık öneri kararı kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Sonraki ay önerisi için öğretmen kararı ve revizyon izi bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Aylık öğretmen kararı kaydedildi; özet yenilenemedi. Aynı kararı yeniden göndermeyin.",
                    );
                  });
                }}
                onRecordMonthlyEvaluation={async (input) => {
                  const { recordTeacherMonthlyEvaluation } = await import(
                    "./features/planning/teacher-owned-plan-service.ts"
                  );
                  await enqueuePersistence(
                    () => recordTeacherMonthlyEvaluation(store, input),
                    {
                      educationalWrite: {},
                      failureDetail:
                        "Aylık öğretmen değerlendirmesi kaydedilemedi. Yeni yazmalar durduruldu.",
                      successDetail:
                        "Çocuklar, program ve öğretmen yönleriyle aylık değerlendirme bu cihaza kaydedildi.",
                    },
                  );
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Aylık değerlendirme kaydedildi; özet yenilenemedi. Aynı değerlendirmeyi yeniden göndermeyin.",
                    );
                  });
                }}
              />
            </Suspense>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

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
              {scheduledPlanEditDraft ? "Günlük plan düzenleme" : "Günlük plan oluşturma"}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {scheduledPlanEditDraft
                ? "Gelecek tarihli günlük planın başlık, saat ve öğretmen akış notlarını düzenleyin."
                : "Günlük planı ve ilk etkinliği oluşturun."} Escape tuşuyla kapatabilirsiniz.
            </Dialog.Description>
            <Suspense
              fallback={(
                <div className="premium-loading" role="status">
                  Plan çalışma alanı açılıyor…
                </div>
              )}
            >
              <PlanCreationFlow
                schoolCalendarContext={schoolCalendarContext}
                civilDate={
                  scheduledPlanEditDraft?.civilDate ??
                  defaultPlanFlowCivilDate
                }
                defaultStartTime={configuredClassroom.schedule.startTime}
                defaultEndTime={configuredClassroom.schedule.endTime}
                ageGroup={configuredClassroom.ageGroup ?? ""}
                curriculumProfile={configuredClassroom.curriculumProfile}
                students={students}
                onCreate={createPlanAndStart}
                onUpdate={updateFuturePlan}
                initialTemplate={premiumDailyTemplate ?? undefined}
                initialEdit={scheduledPlanEditDraft ?? undefined}
                initialActivityTitle={studioActivityTitle ?? undefined}
                initialPedagogicalProvenance={
                  studioPedagogicalProvenance ?? undefined
                }
                enforceOfficialTeachingDays={academicYearMatchesCalendarProfile(
                  configuredClassroom,
                  OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
                )}
                teacherOwnedDailyFlowContext={
                  !premiumDailyTemplate &&
                  !scheduledPlanEditDraft?.premium &&
                  planFlowTeacherWeek
                    ? {
                        schedule: configuredClassroom.schedule,
                        weeklyPlanId: planFlowTeacherWeek.id,
                        allowedDateStart: planFlowTeacherWeek.periodStart,
                        allowedDateEnd: planFlowTeacherWeek.periodEnd,
                        ...(teacherOwnedDailyFlowCopySources.length > 0
                          ? { copySources: teacherOwnedDailyFlowCopySources }
                          : {}),
                      }
                    : undefined
                }
                onClose={() => void closeD1Flow()}
              />
            </Suspense>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      {premiumPlanOpen &&
      premiumPlanEntryEnabled &&
      configuredClassroom?.curriculumProfile ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) {
              setPremiumPlanOpen(false);
              setPremiumPlanBuiltInReference(null);
            }
          }}
        >
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content className="d1-flow-layer" key="premium-plan-center">
            <Dialog.Title className="sr-only">Plan Kütüphanesi</Dialog.Title>
            <Dialog.Description className="sr-only">
              Yıllık, aylık, haftalık ve günlük hazır Maarif planları; pedagojik
              yaklaşım, değerlendirme ve belge çıktıları.
            </Dialog.Description>
            <Suspense fallback={<div className="premium-loading">Plan Kütüphanesi açılıyor…</div>}>
              <PremiumPlanCenterScreen
                store={store}
                curriculumProfile={configuredClassroom.curriculumProfile}
                ageGroup={configuredClassroom.ageGroup ?? ""}
                contentPack={premiumFounderAccess?.pack ?? null}
                internalStaffExportEnabled={internalStaffExportEnabled}
                premiumAccess={premiumFounderAccess?.access ?? null}
                sharedBuiltInAccess={!premiumLegacyRequested}
                sharedBuiltInPackReference={premiumPlanBuiltInReference}
                valueEvidenceWritesDisabled={
                  writesBlocked || educationalWritesDisabled
                }
                initialSection={premiumPlanInitialSection}
                onRecordsChanged={() => {
                  void refreshD1Workspaces().catch(() => {
                    setAnnouncement(
                      "Plan kaydı cihazda tamamlandı; çalışma döngüsü görünümünü yenilemek için cihaz verilerine yeniden bağlanın.",
                    );
                  });
                }}
                onClose={() => {
                  setPremiumPlanOpen(false);
                  setPremiumPlanBuiltInReference(null);
                }}
                onOpenTeacherMonth={(monthKey) => {
                  setPremiumPlanOpen(false);
                  openTeacherPlanRecords("monthly", monthKey);
                  setAnnouncement(
                    `${monthKey} dönemi öğretmenin yıllık plan alanında açıldı. Eksik ay varsa yıllık omurgaya tek onayla ekleyebilirsiniz.`,
                  );
                }}
                onUseActivity={(selection) => {
                  setPremiumPlanOpen(false);
                  openPlanFlow(selection);
                }}
              />
            </Suspense>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      {observationOpening && !evidenceFlowRequest ? (
        <Dialog.Root open>
          <Dialog.Overlay className="d1-flow-overlay" />
          <Dialog.Content
            className="d1-flow-layer observation-opening-layer"
            onEscapeKeyDown={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <Dialog.Title className="sr-only">Hızlı Gözlem</Dialog.Title>
            <Dialog.Description className="sr-only">
              Gözlem bağlamı cihaz kayıtlarından hazırlanıyor.
            </Dialog.Description>
            <BrandedSurfaceLoading
              compact
              title="Hızlı Gözlem açılıyor"
              detail="Çocuk listesi ve bugünün etkinliği eşleştiriliyor."
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
            key={`evidence-flow-${evidenceFlowRequest.pendingObservation?.id ?? evidenceFlowRequest.activity.id}-${evidenceFlowRequest.assessmentTarget?.id ?? "no-assessment"}-${evidenceFlowRequest.initialStudentId ?? "none"}-${evidenceFlowRequest.initialDraft ? "seeded" : "plain"}`}
            onCloseAutoFocus={(event) => {
              const activityReturnTarget = document.querySelector<HTMLElement>(
                '[data-activity-observation-return="true"]',
              );
              if (!activityReturnTarget) return;
              event.preventDefault();
              window.requestAnimationFrame(() => {
                activityReturnTarget.focus({ preventScroll: true });
              });
            }}
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
              ageBand={currentClassTymmAgeBand ?? undefined}
              pendingObservation={evidenceFlowRequest.pendingObservation}
              assessmentTarget={evidenceFlowRequest.assessmentTarget}
              initialStudentId={evidenceFlowRequest.initialStudentId}
              initialDraft={evidenceFlowRequest.initialDraft}
              students={students}
              actions={evidenceFlowActions}
              availableActivities={evidenceWorkspace?.activities}
            />
          </Dialog.Content>
        </Dialog.Root>
      ) : null}
      </div>

      {tymmChildSession ? (
        <TymmChildParticipationDialog
          key={`${tymmChildSession.student.id}-${tymmChildSession.template.id}`}
          session={tymmChildSession}
          onAdultExit={() => {
            setTymmChildSession(null);
            surfaceTransitionRef.current = "tymm-guide";
            setTymmGuideOpen(true);
            setAnnouncement(
              "Gözetimli çocuk ekranı yetişkin tarafından kapatıldı; hiçbir seçim kaydedilmedi.",
            );
          }}
          onHandoff={handoffTymmChildParticipation}
        />
      ) : null}

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
                src="./assets/brand/maarifos-icon-192.png"
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
                <KeyboardInput
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
              {persistenceState.phase === "hydrating" ? (
                <div className="persistence-gate-brand" aria-hidden="true">
                  <MaarifLogo size={48} variant="emblem-only" />
                  <span>
                    <strong>MaarifOS</strong>
                    <small>Öğretmen çalışma alanı</small>
                  </span>
                </div>
              ) : null}
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
                    : "Çalışma alanınız açılıyor"}
                </h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p aria-live="assertive">{persistenceState.detail}</p>
              </Dialog.Description>
              {persistenceState.phase === "hydrating" ? (
                <div className="persistence-gate-progress" aria-hidden="true">
                  <span />
                </div>
              ) : null}
              {persistenceState.phase === "error" ? (
                localVaultRecoveryRequired ? (
                  <section
                    className="vault-recovery-shell"
                    aria-labelledby="vault-recovery-heading"
                    aria-busy={vaultRecoveryBusy}
                  >
                    <div>
                      <h3 id="vault-recovery-heading">
                        Şifreli yedekten kurtar
                      </h3>
                      <p>
                        Bu kasanın cihaz anahtarı bulunamadı. Normal kayıtlar
                        kapalı kalır; yalnız doğrulanmış şifreli yedek yeni bir
                        kasaya, yerine yükleme modunda aktarılabilir.
                      </p>
                    </div>
                    <button
                      ref={vaultRecoveryFileButtonRef}
                      type="button"
                      className="vault-recovery-file-button"
                      onClick={openVaultRecoveryFilePicker}
                      disabled={vaultRecoveryBusy}
                      autoFocus
                    >
                      <UploadIcon aria-hidden="true" />
                      Şifreli .maarifos yedeği seç
                    </button>
                    <input
                      ref={vaultRecoveryFileRef}
                      className="restore-file-input"
                      type="file"
                      accept=".maarifos,application/json"
                      hidden
                      tabIndex={-1}
                      disabled={vaultRecoveryBusy}
                      aria-label="Kasa kurtarma için şifreli MaarifOS yedeği seç"
                      onChange={(event) =>
                        void inspectVaultRecoveryFile(event.target.files?.[0])
                      }
                    />

                    {vaultRecoveryBackup ? (
                      <div className="vault-recovery-steps">
                        <strong>{vaultRecoveryBackup.fileName}</strong>
                        {!vaultRecoveryBackup.receipt ? (
                          <>
                            <label htmlFor="vault-recovery-password">
                              Yedek parolası
                              <KeyboardInput
                                id="vault-recovery-password"
                                type="password"
                                value={vaultRecoveryPassword}
                                onChange={(event) =>
                                  setVaultRecoveryPassword(event.target.value)
                                }
                                minLength={10}
                                maxLength={1024}
                                autoComplete="current-password"
                                disabled={vaultRecoveryBusy}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void unlockVaultRecoveryBackup()}
                              disabled={
                                vaultRecoveryBusy ||
                                vaultRecoveryPassword.length < 10
                              }
                            >
                              {vaultRecoveryBusy
                                ? "Doğrulanıyor…"
                                : "Yedeği bellekte aç ve doğrula"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="vault-recovery-verified" role="status">
                              <CheckCircledIcon aria-hidden="true" />
                              Yedek doğrulandı ·{" "}
                              {Object.values(
                                vaultRecoveryBackup.receipt.entityCounts,
                              ).reduce((total, count) => total + count, 0)}{" "}
                              kayıt
                            </p>
                            <label htmlFor="vault-recovery-restore-password">
                              Yedek parolasını yeniden girin
                              <KeyboardInput
                                ref={vaultRecoveryRestorePasswordRef}
                                id="vault-recovery-restore-password"
                                type="password"
                                value={vaultRecoveryPassword}
                                onChange={(event) =>
                                  setVaultRecoveryPassword(event.target.value)
                                }
                                minLength={10}
                                maxLength={1024}
                                autoComplete="current-password"
                                disabled={vaultRecoveryBusy}
                              />
                            </label>
                            <label htmlFor="vault-recovery-confirmation">
                              Onaylamak için KASAYI GERİ YÜKLE yazın
                              <KeyboardInput
                                id="vault-recovery-confirmation"
                                value={vaultRecoveryConfirmation}
                                onChange={(event) =>
                                  setVaultRecoveryConfirmation(
                                    event.target.value.toLocaleUpperCase(
                                      "tr-TR",
                                    ),
                                  )
                                }
                                autoComplete="off"
                                disabled={vaultRecoveryBusy}
                              />
                            </label>
                            <button
                              type="button"
                              className="vault-recovery-confirm-button"
                              onClick={() =>
                                void restoreVaultFromEncryptedBackup()
                              }
                              disabled={
                                vaultRecoveryBusy ||
                                vaultRecoveryPassword.length < 10 ||
                                vaultRecoveryConfirmation !==
                                  "KASAYI GERİ YÜKLE"
                              }
                            >
                              {vaultRecoveryBusy
                                ? "Kasa yeniden oluşturuluyor…"
                                : "Kasayı sil, yeniden kur ve yedeği yükle"}
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}

                    {vaultRecoveryError ? (
                      <p className="security-inline-error" role="alert">
                        {vaultRecoveryError}
                      </p>
                    ) : null}

                    <details className="vault-reset-fallback">
                      <summary>Şifreli yedeğim yok</summary>
                      <p>
                        Erişilemeyen kayıtlar kurtarılamaz. Bu seçenek ana
                        veritabanını, kasa anahtarını ve eski v1 verisini silip
                        boş kurulum açar.
                      </p>
                      <label htmlFor="vault-reset-confirmation">
                        Onaylamak için BU CİHAZI SIFIRLA yazın
                        <KeyboardInput
                          id="vault-reset-confirmation"
                          value={vaultResetConfirmation}
                          onChange={(event) =>
                            setVaultResetConfirmation(
                              event.target.value.toLocaleUpperCase("tr-TR"),
                            )
                          }
                          autoComplete="off"
                          disabled={vaultRecoveryBusy}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void resetVaultWithoutBackup()}
                        disabled={
                          vaultRecoveryBusy ||
                          vaultResetConfirmation !== "BU CİHAZI SIFIRLA"
                        }
                      >
                        Erişilemeyen kasayı kalıcı sil
                      </button>
                    </details>
                  </section>
                ) : (
                  <button
                    type="button"
                    onClick={retryPersistence}
                    disabled={dataBusy}
                    autoFocus
                  >
                    {dataBusy
                      ? "Kalıcı cihaz işlemi tamamlanıyor…"
                      : "Cihaz verilerine yeniden bağlan"}
                  </button>
                )
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}

      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
