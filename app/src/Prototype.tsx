import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArchiveIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  GearIcon,
  HomeIcon,
  Link2Icon,
  LockClosedIcon,
  PaperPlaneIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  TargetIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  KeyboardInput,
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  useKeyboardInsets,
  useMobileDevice,
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
  persistDashboardObservation,
  persistStudentRosterChange,
  type AttendanceStatus,
  type DashboardObservation as Observation,
  type DashboardState,
  type DashboardStudent as Student,
} from "./features/dashboard/dashboard-data";
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

type ClassroomFormState = {
  classroomName: string;
  academicYearName: string;
  academicYearStart: string;
  academicYearEnd: string;
  ageGroup: string;
  curriculumProgram: string;
  curriculumCatalogLabel: string;
  scheduleKind: ClassroomScheduleKind;
  startTime: string;
  endTime: string;
};

const initialClassroomForm: ClassroomFormState = {
  classroomName: "",
  academicYearName: "2026–2027 Eğitim Yılı",
  academicYearStart: "2026-09-01",
  academicYearEnd: "2027-06-30",
  ageGroup: "60–72 ay",
  curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
  curriculumCatalogLabel: "Katalog 2025",
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
  const [observations, setObservations] = useState<Observation[]>([]);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [attendanceCivilDate, setAttendanceCivilDate] = useState(
    fallbackDashboardState.attendanceCivilDate,
  );
  const [lastAttendanceChange, setLastAttendanceChange] = useState<AttendanceChange | null>(null);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [observationText, setObservationText] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [todayWorkspace, setTodayWorkspace] = useState<TodayWorkspace>(emptyTodayWorkspace);
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

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadDashboardState(store, fallbackDashboardState),
      loadTodayWorkspace(store),
    ])
      .then(([state, workspace]) => {
        if (cancelled) return;
        setStudents(state.students);
        setArchivedStudents(state.archivedStudents);
        setObservations(state.observations);
        setAttendanceCompleted(state.attendanceCompleted);
        setAttendanceCivilDate(state.attendanceCivilDate);
        setSelectedStudentId(state.students[0]?.id ?? "");
        setTodayWorkspace(workspace);
        if (workspace.classroom.status === "configured") {
          const classroom = workspace.classroom;
          setClassroomForm((current) => ({
            ...current,
            classroomName: classroom.classroomName,
            academicYearName: classroom.academicYearName,
            ageGroup: classroom.ageGroup ?? current.ageGroup,
            curriculumProgram: classroom.curriculumProgram ?? current.curriculumProgram,
            curriculumCatalogLabel:
              classroom.curriculumCatalogLabel ?? current.curriculumCatalogLabel,
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
        const [refreshed, refreshedWorkspace] = await Promise.all([
          loadDashboardState(store, {
            ...fallbackDashboardState,
            attendanceCivilDate: currentCivilDate,
          }),
          loadTodayWorkspace(store, { now: new Date() }),
        ]);
        if (cancelled) return;
        setStudents(refreshed.students);
        setArchivedStudents(refreshed.archivedStudents);
        setObservations(refreshed.observations);
        setAttendanceCompleted(refreshed.attendanceCompleted);
        setAttendanceCivilDate(refreshed.attendanceCivilDate);
        setTodayWorkspace(refreshedWorkspace);
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
      const [restored, restoredWorkspace] = await Promise.all([
        loadDashboardState(store, fallbackDashboardState),
        loadTodayWorkspace(store),
      ]);
      setStudents(restored.students);
      setArchivedStudents(restored.archivedStudents);
      setObservations(restored.observations);
      setAttendanceCompleted(restored.attendanceCompleted);
      setAttendanceCivilDate(restored.attendanceCivilDate);
      setLastAttendanceChange(null);
      setSelectedStudentId(restored.students[0]?.id ?? "");
      setTodayWorkspace(restoredWorkspace);
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

  const saveObservation = async () => {
    const trimmed = observationText.trim();
    if (!trimmed || !selectedStudentId) return;
    const student = students.find((item) => item.id === selectedStudentId);
    const observation: Observation = {
      id: crypto.randomUUID(),
      studentId: selectedStudentId,
      rawText: trimmed,
      createdAtUtc: new Date().toISOString(),
    };
    try {
      await enqueuePersistence(() => persistDashboardObservation(store, observation));
    } catch {
      setDataStatus("Gözlem notu bu cihaza kaydedilemedi; form açık bırakıldı.");
      setAnnouncement("Gözlem kaydedilemedi. Lütfen yeniden deneyin.");
      return;
    }
    setObservations((current) => [
      ...current,
      observation,
    ]);
    void loadTodayWorkspace(store).then(setTodayWorkspace).catch(() => undefined);
    setObservationText("");
    keyboard.hide();
    setObservationOpen(false);
    setAnnouncement(`${student?.name ?? "Çocuk"} için gözlem notu kaydedildi.`);
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
      setSelectedStudentId((current) => current || student.id);
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
      if (selectedStudentId === studentId) setSelectedStudentId(remaining[0]?.id ?? "");
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
          curriculumCatalogLabel: classroomForm.curriculumCatalogLabel,
        },
        schedule: {
          kind: classroomForm.scheduleKind,
          startTime: classroomForm.startTime,
          endTime: classroomForm.endTime,
        },
      });
      setTodayWorkspace(await loadTodayWorkspace(store));
      setClassroomOpen(false);
      setAnnouncement(
        context.status === "configured"
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
      setTodayWorkspace(await loadTodayWorkspace(store));
      setAnnouncement(`${currentActivity.title} tamamlandı.`);
    } catch {
      setAnnouncement("Etkinlik durumu kaydedilemedi; mevcut kayıt korundu.");
    } finally {
      setDataBusy(false);
    }
  };

  const handleNav = (id: string, label: string) => {
    if (id === "capture") {
      setObservationOpen(true);
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

  const changeObservationOpen = (open: boolean) => {
    if (!open) keyboard.hide();
    setObservationOpen(open);
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
              if (todayWorkspace.pendingEvidenceLinks > 0) setObservationOpen(true);
              else setAnnouncement("Program hedefiyle ilişkilendirilmeyi bekleyen kayıt yok.");
            }}>
              <ClockIcon aria-hidden="true" />
              <span>{todayWorkspace.pendingEvidenceLinks} kayıt bekliyor</span>
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
                <button className="primary-evidence-button" type="button" onClick={() => setObservationOpen(true)}>
                  <PlusIcon aria-hidden="true" /> Kanıt ekle
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
                <button className="empty-primary" type="button" onClick={() => configuredClassroom ? setPlansOpen(true) : setClassroomOpen(true)}>
                  {configuredClassroom ? "Planları aç" : "Sınıfı kur"}
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
              <button className="pending-link" type="button" onClick={() => setObservationOpen(true)}>
                <ClockIcon aria-hidden="true" />
                <span>{todayWorkspace.pendingEvidenceLinks} kaydı program hedefiyle ilişkilendir</span>
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
          <select id="curriculum-program" value={classroomForm.curriculumProgram} onChange={(event) => setClassroomForm((current) => ({ ...current, curriculumProgram: event.target.value }))}>
            <option>Türkiye Yüzyılı Maarif Modeli</option>
            <option>Okul Öncesi Eğitim Programı — EÇE/2024</option>
          </select>

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
          <button className="sheet-primary" type="submit" disabled={dataBusy || !classroomForm.classroomName.trim()}>
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
        {todayWorkspace.planItems.length > 0 ? (
          <div className="activity-list">
            {todayWorkspace.planItems.map((item, index) => (
              <button className={`activity-row is-${item.status === "in_progress" ? "current" : item.status === "completed" ? "completed" : "next"}`} type="button" key={item.id} onClick={() => setAnnouncement(`${item.title}: ${activityStatusLabels[item.status]}.`)}>
                <span className="activity-marker" aria-hidden="true">{item.status === "completed" ? <CheckCircledIcon /> : index + 1}</span>
                <span className="activity-copy"><strong>{item.title}</strong><small>{item.startTime} · <b>{activityStatusLabels[item.status]}</b></small></span>
                <span className="activity-evidence">{item.evidenceCount} kanıt</span>
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
        open={observationOpen}
        onOpenChange={changeObservationOpen}
        title="Kayıt ekle"
        description="Çocuğu seçin ve gözlediğiniz olayı nesnel biçimde kaydedin."
        snap={0.78}
      >
        <div className="observation-form">
          <label htmlFor="observation-student">Çocuk</label>
          <select id="observation-student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
          </select>
          {students.length === 0 ? <p>Önce Sınıfım bölümünden bir çocuk ekleyin.</p> : null}
          <label htmlFor="observation-text">Ne oldu?</label>
          <KeyboardTextarea
            id="observation-text"
            value={observationText}
            onChange={(event) => setObservationText(event.target.value)}
            placeholder="Gözlediğiniz davranışı yorum eklemeden yazın..."
            rows={5}
          />
          <p>İlk yazdığınız gözlem notu değişmeden saklanır. Program eşlemesini daha sonra tamamlayabilirsiniz.</p>
          <button className="sheet-primary" type="button" onClick={() => void saveObservation()} disabled={!selectedStudentId || !observationText.trim()}>
            <PaperPlaneIcon aria-hidden="true" /> Kaydı sakla
          </button>
        </div>
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

      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
