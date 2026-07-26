import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArchiveIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  Cross2Icon,
  DownloadIcon,
  GearIcon,
  HomeIcon,
  Link2Icon,
  LockClosedIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  TargetIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
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
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
  CURRICULUM_PROGRAM_LABELS,
  type CurriculumProfileSnapshot,
} from "./features/evidence/evidence-flow";
import {
  curriculumFrameworkForProgram,
  loadEvidenceWorkspace,
  type EvidenceActivitySummary,
  type EvidenceObservationSummary,
  type EvidenceWorkspace,
} from "./features/evidence/evidence-workspace";
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
  curriculumCatalogId: "",
  curriculumSourceVersion: "",
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

type PlanCreationCommand = {
  planId: string;
  activityId: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
};

function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  curriculumProfile,
  onCreate,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  curriculumProfile: CurriculumProfileSnapshot;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!planTitle.trim() || !activityTitle.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({
        ...ids,
        planTitle,
        activityTitle,
        startTime,
        ...(endTime ? { endTime } : {}),
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
          <em>Öğretmen beyanı · resmî katalogda doğrulanmadı</em>
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

        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        <button
          className="d1-primary"
          type="button"
          onClick={() => void save()}
          disabled={busy || !planTitle.trim() || !activityTitle.trim()}
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
  onCreate,
  onClose,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  curriculumProfile: CurriculumProfileSnapshot;
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
          onCreate={onCreate}
        />
      ),
    }),
    [
      civilDate,
      curriculumProfile,
      defaultEndTime,
      defaultStartTime,
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
    input: { observationId: string; studentId: string; rawText: string },
  ) => Promise<EvidenceObservationSummary>;
  confirm: (
    observation: EvidenceObservationSummary,
    referenceCode: string,
    referenceTitle: string,
  ) => Promise<void>;
  createDraft: (
    observation: EvidenceObservationSummary,
    teacherAssessmentText: string,
    draftId: string,
  ) => Promise<void>;
};

function EvidenceCaptureScreen({
  flow,
  activity,
  students,
  actions,
}: {
  flow: FlowControls;
  activity: EvidenceActivitySummary;
  students: Student[];
  actions: EvidenceFlowActions;
}) {
  const [observationId] = useState(() => crypto.randomUUID());
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!studentId || !rawText.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const observation = await actions.capture(activity, {
        observationId,
        studentId,
        rawText,
      });
      flow.replace(createEvidenceLinkScreen(observation, actions));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gözlem notu kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">{activity.title}</span>
          <h1>Gözlem notu</h1>
          <p>Gördüğünüz ve duyduğunuz olayı yorum eklemeden kaydedin.</p>
        </div>

        {students.length === 0 ? (
          <section className="d1-empty-state">
            <strong>Önce sınıfa bir çocuk ekleyin.</strong>
            <p>Gözlem notu yalnız etkin sınıftaki bir çocukla ilişkilendirilebilir.</p>
            <button type="button" onClick={actions.manageChildren}>Sınıfımı aç</button>
          </section>
        ) : (
          <>
            <div className="d1-form">
              <label htmlFor="d1-observation-student">Çocuk</label>
              <select
                id="d1-observation-student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                {students.map((student) => (
                  <option value={student.id} key={student.id}>{student.name}</option>
                ))}
              </select>

              <label htmlFor="d1-observation-text">Ne oldu?</label>
              <KeyboardTextarea
                id="d1-observation-text"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Örn. Ece iki farklı yaprağı yan yana koydu ve “Bunun çizgileri daha çok” dedi."
                rows={7}
                autoFocus
              />
            </div>
            <p className="d1-integrity-note"><LockClosedIcon aria-hidden="true" /> İlk gözlem notu kaydedildikten sonra değişmeden korunur.</p>
            {error ? <p className="d1-error" role="alert">{error}</p> : null}
            <button
              className="d1-primary"
              type="button"
              onClick={() => void save()}
              disabled={busy || !studentId || !rawText.trim()}
            >
              {busy ? "Kaydediliyor…" : "Gözlem notunu kaydet"}
            </button>
          </>
        )}
      </div>
    </MobileScroll>
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
  const [referenceCode, setReferenceCode] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!referenceCode.trim() || !referenceTitle.trim() || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.confirm(observation, referenceCode, referenceTitle);
      flow.replace(createAssessmentScreen(observation, actions));
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
          <p>Notunuzu hangi program öğesiyle ilişkilendirdiğinizi açıkça kaydedin.</p>
        </div>

        <blockquote className="d1-observation-quote">{observation.rawText}</blockquote>

        <section className="d1-warning-card">
          <strong>Öğretmen beyanı</strong>
          <p>Bu referans resmî katalogda doğrulanmadı. Kod ve başlığı kullandığınız program kaynağından siz giriyorsunuz.</p>
          <small>{curriculumDisplayLabel(observation.curriculumProfile)} · {observation.curriculumProfile.sourceVersion}</small>
        </section>

        <div className="d1-form">
          <label htmlFor="d1-reference-code">Program referans kodu</label>
          <KeyboardInput
            id="d1-reference-code"
            value={referenceCode}
            onChange={(event) => setReferenceCode(event.target.value)}
            placeholder="Kullandığınız kaynaktaki kod"
            autoComplete="off"
          />
          <label htmlFor="d1-reference-title">Program öğesi / başlığı</label>
          <KeyboardTextarea
            id="d1-reference-title"
            value={referenceTitle}
            onChange={(event) => setReferenceTitle(event.target.value)}
            placeholder="Kazanım, öğrenme çıktısı veya beceri başlığı"
            rows={3}
          />
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
          disabled={busy || !referenceCode.trim() || !referenceTitle.trim() || !confirmed}
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
  actions,
}: {
  flow: FlowControls;
  observation: EvidenceObservationSummary;
  actions: EvidenceFlowActions;
}) {
  const [draftId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.createDraft(observation, text, draftId);
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

        <section className="d1-safety-card">
          <strong>Pedagojik sınır</strong>
          <p>MaarifOS tanı koymaz, çocuğu etiketlemez ve gelişim hükmü üretmez. Bu alan yalnız öğretmenin seçili gözleme dayanan mesleki değerlendirmesidir.</p>
        </section>

        <div className="d1-form">
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
  actions: EvidenceFlowActions,
): FlowScreen {
  return {
    id: `assessment-${observation.id}`,
    title: "Değerlendirme",
    headerHeight: 64,
    header: createFlowHeader("Değerlendirme", "3 / 3", actions.close),
    render: (flow) => <AssessmentScreen flow={flow} observation={observation} actions={actions} />,
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
  students,
  actions,
}: {
  activity: EvidenceActivitySummary;
  pendingObservation?: EvidenceObservationSummary;
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
            headerHeight: 64,
            header: createFlowHeader("Gözlem notu", "1 / 3", actions.close),
            render: (flow) => (
              <EvidenceCaptureScreen
                flow={flow}
                activity={activity}
                students={students}
                actions={actions}
              />
            ),
          },
    [actions, activity, pendingObservation, students],
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
      const curriculumProfile: CurriculumProfileSnapshot = {
        framework,
        programLabel: CURRICULUM_PROGRAM_LABELS[framework],
        catalogId: classroomForm.curriculumCatalogId,
        sourceVersion: classroomForm.curriculumSourceVersion,
        referenceOrigin: "teacher-declared",
        officialCatalogVerified: false,
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

  const openActivityEvidence = async (activityId: string) => {
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
      setEvidenceFlowRequest({ activity });
      setAnnouncement(`${activity.title} için gözlem notu açıldı.`);
    } catch (reason) {
      setAnnouncement(
        reason instanceof Error ? reason.message : "Etkinlik başlatılamadı; mevcut kayıt korundu.",
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
    capture: async (activity, input) => {
      const result = await captureImmutableRawObservation(store, {
        ...input,
        planId: activity.planId,
        activityId: activity.id,
        observedAt: new Date().toISOString(),
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
    confirm: async (observation, referenceCode, referenceTitle) => {
      await confirmObservationCurriculumLink(store, {
        observationId: observation.id,
        framework: observation.curriculumProfile.framework,
        catalogId: observation.curriculumProfile.catalogId,
        sourceVersion: observation.curriculumProfile.sourceVersion,
        referenceCode,
        referenceTitle,
        referenceOrigin: "teacher-declared",
        officialCatalogVerified: false,
      });
      await refreshD1Workspaces();
      setAnnouncement("Program bağlantısı öğretmen onayıyla kaydedildi.");
    },
    createDraft: async (observation, teacherAssessmentText, draftId) => {
      await createCitedAssessmentDraft(store, {
        draftId,
        studentId: observation.studentId,
        observationIds: [observation.id],
        teacherAssessmentText,
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
        <main className="maarif-screen" aria-label="MaarifOS Bugün ekranı" data-testid="today-screen">
          <header className="today-header">
            <div className="today-title-row">
              <h1>Bugün</h1>
              <button
                className="settings-button"
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label="Ayarları aç"
              >
                <GearIcon aria-hidden="true" />
              </button>
            </div>
            <p className="today-date">{formatTurkishCivilDate(attendanceCivilDate)}</p>
            <div className="today-context" aria-label="Sınıf ve program bilgisi">
              {configuredClassroom ? (
                <>
                  <span><strong>{configuredClassroom.classroomName}</strong> · {configuredClassroom.scheduleLabel}</span>
                  <span>{configuredClassroom.ageGroup ?? "Yaş grubu belirtilmedi"} · {compactProgramLabel(configuredClassroom.curriculumProgram)} · {configuredClassroom.curriculumCatalogLabel ?? "Katalog belirtilmedi"}</span>
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
              <span>Devam&nbsp; {counts.present + counts.late}/{students.length}</span>
            </button>
            <button className="summary-action summary-action--pending" type="button" onClick={() => {
              if (todayWorkspace.pendingEvidenceLinks > 0) openPendingObservation();
              else setAnnouncement("Program bağlantısı bekleyen gözlem notu yok.");
            }}>
              <ClockIcon aria-hidden="true" />
              <span>{todayWorkspace.pendingEvidenceLinks} bağlantı bekliyor</span>
            </button>
          </section>

          <section className={`current-work ${focusActivity ? "" : "empty-work"}`} aria-labelledby="current-work-title" data-testid="current-work">
            {focusActivity ? (
              <>
                <p className="section-eyebrow">{focusActivity.status === "in_progress" ? "Şimdi" : "Sıradaki"}</p>
                <h2 id="current-work-title">{focusActivity.title}</h2>
                <p className="current-time">{focusActivity.startTime}{focusActivity.endTime ? `–${focusActivity.endTime}` : ""}{focusActivity.subject ? ` · ${focusActivity.subject}` : ""}</p>
                <span className="status-label">{activityStatusLabels[focusActivity.status]}</span>
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
                  <PlusIcon aria-hidden="true" /> {focusActivity.status === "planned" ? "Etkinliği başlat" : "Gözlem notu ekle"}
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
            <h2 id="today-plan-title">Günün planı</h2>
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
            onChange={(event) => setClassroomForm((current) => ({
              ...current,
              curriculumProgram: event.target.value,
              curriculumCatalogId: "",
              curriculumSourceVersion: "",
            }))}
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
            Bu iki bilgi öğretmen beyanı olarak saklanır; MaarifOS henüz resmî katalog doğrulaması yapmaz.
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
                <span className="student-avatar" aria-hidden="true">{student.name.split(" ").map((part) => part[0]).join("")}</span>
                <span className="student-name">{student.name}</span>
                <button type="button" onClick={() => void archiveStudent(student.id)} disabled={dataBusy} aria-label={`${student.name} çocuğunu sınıftan ayır`}>
                  Sınıftan ayır
                </button>
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
          key={`evidence-flow-${evidenceFlowRequest.pendingObservation?.id ?? evidenceFlowRequest.activity.id}`}
        >
          <EvidenceCaptureFlow
            activity={evidenceFlowRequest.activity}
            pendingObservation={evidenceFlowRequest.pendingObservation}
            students={students}
            actions={evidenceFlowActions}
          />
        </section>
      ) : null}

      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
