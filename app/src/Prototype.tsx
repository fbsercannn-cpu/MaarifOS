import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArchiveIcon,
  BarChartIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  ColorWheelIcon,
  Crosshair2Icon,
  DownloadIcon,
  GearIcon,
  HomeIcon,
  LockClosedIcon,
  PaperPlaneIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  SunIcon,
  TargetIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  useKeyboardInsets,
  useMobileDevice,
} from "./mobile";
import { BackupService, IndexedDbDataStore, type BackupEnvelope, type RestoreMode } from "./core";
import { createInitialAuthState, deriveWelcomeViewModel, reduceAuthState, type AuthState } from "./auth";
import {
  loadDashboardState,
  persistDashboardState,
  type AttendanceStatus,
  type DashboardObservation as Observation,
  type DashboardState,
  type DashboardStudent as Student,
} from "./features/dashboard/dashboard-data";

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  duration?: string;
  audience?: string;
  kind: "current" | "next" | "later";
  icon: "attendance" | "sun" | "art" | "meal" | "story" | "garden";
};

const initialStudents: Student[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Ada Yalın", status: "present" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Aras Ekin", status: "present" },
  { id: "00000000-0000-4000-8000-000000000003", name: "Asya Irmak", status: "present" },
  { id: "00000000-0000-4000-8000-000000000004", name: "Bora Deniz", status: "present" },
  { id: "00000000-0000-4000-8000-000000000005", name: "Defne Işık", status: "present" },
  { id: "00000000-0000-4000-8000-000000000006", name: "Duru Akın", status: "present" },
  { id: "00000000-0000-4000-8000-000000000007", name: "Ege Ural", status: "present" },
  { id: "00000000-0000-4000-8000-000000000008", name: "Ela Güneş", status: "present" },
  { id: "00000000-0000-4000-8000-000000000009", name: "İpek Su", status: "present" },
  { id: "00000000-0000-4000-8000-000000000010", name: "Kerem Alp", status: "present" },
  { id: "00000000-0000-4000-8000-000000000011", name: "Lina Masal", status: "present" },
  { id: "00000000-0000-4000-8000-000000000012", name: "Mert Can", status: "present" },
  { id: "00000000-0000-4000-8000-000000000013", name: "Mina Nehir", status: "late" },
  { id: "00000000-0000-4000-8000-000000000014", name: "Ozan Efe", status: "absent" },
  { id: "00000000-0000-4000-8000-000000000015", name: "Rüya Nil", status: "absent" },
  { id: "00000000-0000-4000-8000-000000000016", name: "Sarp Tuna", status: "absent" },
  { id: "00000000-0000-4000-8000-000000000017", name: "Selin Ay", status: "absent" },
  { id: "00000000-0000-4000-8000-000000000018", name: "Toprak Cem", status: "absent" },
];

const timeline: TimelineItem[] = [
  {
    id: "attendance",
    time: "08:30",
    title: "Yoklama",
    description: "Çocukların katılım durumunu işaretleyin.",
    kind: "current",
    icon: "attendance",
  },
  {
    id: "circle",
    time: "09:00",
    title: "Sabah Çemberi",
    description: "Güne birlikte başlıyoruz.",
    kind: "later",
    icon: "sun",
  },
  {
    id: "colors",
    time: "09:30",
    title: "Renk Avı",
    description: "Sınıf içinde renkleri keşfediyoruz.",
    duration: "30 dk",
    audience: "Tüm grup",
    kind: "next",
    icon: "art",
  },
  {
    id: "meal",
    time: "10:15",
    title: "Beslenme",
    description: "Sağlıklı atıştırmalık zamanı.",
    kind: "later",
    icon: "meal",
  },
  {
    id: "story",
    time: "10:45",
    title: "Hikâye Zamanı",
    description: "Büyük hikâyeye yolculuk.",
    kind: "later",
    icon: "story",
  },
  {
    id: "garden",
    time: "11:15",
    title: "Bahçe Zamanı",
    description: "Açık havada hareket ve oyun.",
    kind: "later",
    icon: "garden",
  },
];

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Geldi",
  late: "Geç",
  absent: "Yok",
};

function nextStatus(status: AttendanceStatus): AttendanceStatus {
  if (status === "present") return "late";
  if (status === "late") return "absent";
  return "present";
}

function TimelineIcon({ icon }: { icon: TimelineItem["icon"] }) {
  if (icon === "attendance") return <PersonIcon aria-hidden="true" />;
  if (icon === "sun") return <SunIcon aria-hidden="true" />;
  if (icon === "art") return <ColorWheelIcon aria-hidden="true" />;
  if (icon === "meal") return <TargetIcon aria-hidden="true" />;
  if (icon === "story") return <ReaderIcon aria-hidden="true" />;
  return <Crosshair2Icon aria-hidden="true" />;
}

const fallbackDashboardState: DashboardState = {
  students: initialStudents,
  observations: [],
  attendanceCompleted: false,
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

export default function Prototype() {
  const keyboard = useKeyboard();
  const { device } = useMobileDevice();
  const { bottomInset } = useKeyboardInsets();
  const store = useMemo(() => new IndexedDbDataStore(), []);
  const backupService = useMemo(() => new BackupService(store, { appVersion: "0.1.0" }), [store]);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0].id);
  const [observationText, setObservationText] = useState("");
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState("Yerel veri kasası hazırlanıyor.");
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
  const [activeNav, setActiveNav] = useState("home");
  const [announcement, setAnnouncement] = useState("Akış Pusulası hazır.");
  const authView = useMemo(() => deriveWelcomeViewModel(authState), [authState]);

  const counts = useMemo(
    () => ({
      present: students.filter((student) => student.status === "present").length,
      late: students.filter((student) => student.status === "late").length,
      absent: students.filter((student) => student.status === "absent").length,
    }),
    [students],
  );

  const shellStyle = {
    "--app-safe-top": `max(env(safe-area-inset-top, 0px), ${device.geometry.safeArea.top}px)`,
    "--app-bottom-inset": `max(env(safe-area-inset-bottom, 0px), ${bottomInset}px)`,
  } as CSSProperties;

  useEffect(() => {
    let cancelled = false;
    void loadDashboardState(store, fallbackDashboardState)
      .then((state) => {
        if (cancelled) return;
        setStudents(state.students);
        setObservations(state.observations);
        setAttendanceCompleted(state.attendanceCompleted);
        setSelectedStudentId(state.students[0]?.id ?? initialStudents[0].id);
        setDataHydrated(true);
        setDataStatus("Yerel veri kasası hazır · çevrimdışı çalışır");
      })
      .catch(() => {
        if (cancelled) return;
        setDataStatus("Yerel veri kasası açılamadı. Verilerinizi yedekleyip yeniden deneyin.");
        setAnnouncement("Yerel veri kasası açılamadı.");
      });
    return () => {
      cancelled = true;
      store.close();
    };
  }, [store]);

  useEffect(() => {
    if (!dataHydrated) return;
    void persistDashboardState(store, { students, observations, attendanceCompleted }).catch(() => {
      setDataStatus("Son değişiklik yerel kasaya yazılamadı.");
      setAnnouncement("Veri kaydı tamamlanamadı.");
    });
  }, [attendanceCompleted, dataHydrated, observations, store, students]);

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
      await persistDashboardState(store, { students, observations, attendanceCompleted });
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
      const safety = await backupService.exportBackup();
      downloadJson(
        `maarifos-geri-yukleme-oncesi-${safety.manifest.civilDate}.json`,
        backupService.serializeBackup(safety),
      );
      const report = await backupService.restoreBackup(pendingRestore.source, { mode });
      const restored = await loadDashboardState(store, fallbackDashboardState);
      setStudents(restored.students);
      setObservations(restored.observations);
      setAttendanceCompleted(restored.attendanceCompleted);
      setSelectedStudentId(restored.students[0]?.id ?? initialStudents[0].id);
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
    let message = "";
    setStudents((current) =>
      current.map((student) => {
        if (student.id !== studentId) return student;
        const status = nextStatus(student.status);
        message = `${student.name}: ${statusLabels[status]}.`;
        return { ...student, status };
      }),
    );
    setAttendanceCompleted(false);
    setAnnouncement(message);
  };

  const completeAttendance = () => {
    setAttendanceCompleted(true);
    keyboard.hide();
    setAttendanceOpen(false);
    setAnnouncement(`Yoklama tamamlandı. ${counts.present} geldi, ${counts.late} geç, ${counts.absent} yok.`);
  };

  const saveObservation = () => {
    const trimmed = observationText.trim();
    if (!trimmed) return;
    const student = students.find((item) => item.id === selectedStudentId);
    setObservations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        studentId: selectedStudentId,
        rawText: trimmed,
        createdAtUtc: new Date().toISOString(),
      },
    ]);
    setObservationText("");
    keyboard.hide();
    setObservationOpen(false);
    setAnnouncement(`${student?.name ?? "Öğrenci"} için gözlem kaydedildi.`);
  };

  const handleNav = (id: string, label: string) => {
    if (id === "add") {
      setObservationOpen(true);
      return;
    }
    setActiveNav(id);
    setAnnouncement(`${label} bölümü seçildi. İlk sürümde Günüm akışı aktiftir.`);
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
        <main className="maarif-screen" aria-label="MaarifOS Günüm ekranı">
          <header className="app-header">
            <div className="brand-lockup" aria-label="Akış Pusulası, MaarifOS">
              <span className="brand-mark"><PaperPlaneIcon aria-hidden="true" /></span>
              <span>
                <strong>Akış Pusulası</strong>
                <small>MaarifOS</small>
              </span>
            </div>
            <button
              className="teacher-lockup"
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Hesap ve veri güvenliğini aç"
            >
              <span>
                <strong>Emine Öğretmen</strong>
                <small>Güneş Sınıfı</small>
              </span>
              <img src="/assets/emine-ogretmen-avatar.png" alt="" draggable="false" />
              <GearIcon className="teacher-settings-icon" aria-hidden="true" />
            </button>
          </header>

          <section className="welcome-block" aria-labelledby="today-title">
            <h1 id="today-title">Günaydın Emine Öğretmen <SunIcon aria-hidden="true" /></h1>
            <p>22 Temmuz 2026, Çarşamba</p>
          </section>

          <section className="timeline" aria-label="Bugünün akışı">
            {timeline.map((item) => (
              <article className={`timeline-item timeline-item--${item.kind}`} key={item.id}>
                <div className="timeline-rail" aria-hidden="true">
                  <span className="timeline-icon"><TimelineIcon icon={item.icon} /></span>
                </div>
                <div className="timeline-body">
                  {item.kind === "current" ? <span className="eyebrow eyebrow--current">Şu an</span> : null}
                  <div className="timeline-title-row">
                    <div>
                      <span className="timeline-time">{item.time}</span>
                      <h2>{item.title}</h2>
                    </div>
                    {item.kind === "next" ? <span className="next-badge">Sıradaki etkinlik</span> : null}
                  </div>
                  <p>{item.description}</p>

                  {item.kind === "current" ? (
                    <>
                      <button className="attendance-cta" type="button" onClick={() => setAttendanceOpen(true)}>
                        <CheckCircledIcon aria-hidden="true" />
                        <span>{attendanceCompleted ? "Yoklamayı düzenle" : "Yoklamayı tamamla"}</span>
                        <ChevronRightIcon aria-hidden="true" />
                      </button>
                      <div className="attendance-summary" aria-label={`${students.length} çocuk; ${counts.present} geldi, ${counts.late} geç, ${counts.absent} yok`}>
                        <span className="summary-total"><PersonIcon aria-hidden="true" /> Toplam {students.length} çocuk</span>
                        <span className="summary-stat summary-stat--present">{counts.present} Geldi</span>
                        <span className="summary-stat summary-stat--late">{counts.late} Geç</span>
                        <span className="summary-stat summary-stat--absent">{counts.absent} Yok</span>
                      </div>
                    </>
                  ) : null}

                  {item.duration ? (
                    <div className="event-meta">
                      <span><ClockIcon aria-hidden="true" /> {item.duration}</span>
                      <span><PersonIcon aria-hidden="true" /> {item.audience}</span>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </section>

          <div className="observations-note" aria-label="Kayıt özeti">
            Bugün {observations.length} hızlı gözlem kaydedildi.
          </div>
        </main>
      </MobileScroll>

      <button className="quick-observation" type="button" onClick={() => setObservationOpen(true)} aria-label="Hızlı gözlem ekle">
        <span className="spark-icon"><PlusIcon aria-hidden="true" /></span>
        <span>Hızlı gözlem</span>
      </button>

      <nav className="bottom-nav" aria-label="Ana menü">
        <button type="button" className={activeNav === "home" ? "is-active" : ""} onClick={() => handleNav("home", "Günüm")} aria-current={activeNav === "home" ? "page" : undefined}>
          <HomeIcon aria-hidden="true" /><span>Günüm</span>
        </button>
        <button type="button" className={activeNav === "children" ? "is-active" : ""} onClick={() => handleNav("children", "Çocuklar")} aria-current={activeNav === "children" ? "page" : undefined}>
          <PersonIcon aria-hidden="true" /><span>Çocuklar</span>
        </button>
        <button type="button" className="nav-add" onClick={() => handleNav("add", "Kayıt Ekle")} aria-label="Kayıt ekle">
          <span><PlusIcon aria-hidden="true" /></span><b>Kayıt Ekle</b>
        </button>
        <button type="button" className={activeNav === "archive" ? "is-active" : ""} onClick={() => handleNav("archive", "Arşiv")} aria-current={activeNav === "archive" ? "page" : undefined}>
          <ArchiveIcon aria-hidden="true" /><span>Arşiv</span>
        </button>
        <button type="button" className={activeNav === "reports" ? "is-active" : ""} onClick={() => handleNav("reports", "Raporlar")} aria-current={activeNav === "reports" ? "page" : undefined}>
          <BarChartIcon aria-hidden="true" /><span>Raporlar</span>
        </button>
      </nav>

      <BottomSheet
        open={attendanceOpen}
        onOpenChange={changeAttendanceOpen}
        title="Bugünün yoklaması"
        description="Bir çocuğa dokunarak Geldi → Geç → Yok durumları arasında ilerleyin."
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
        <button className="sheet-primary" type="button" onClick={completeAttendance}>
          <CheckCircledIcon aria-hidden="true" /> Yoklamayı tamamla
        </button>
      </BottomSheet>

      <BottomSheet
        open={observationOpen}
        onOpenChange={changeObservationOpen}
        title="Hızlı gözlem"
        description="Öğrenciyi seçin ve o anı kendi sözlerinizle kaydedin."
        snap={0.78}
      >
        <div className="observation-form">
          <label htmlFor="observation-student">Çocuk</label>
          <select id="observation-student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
          </select>
          <label htmlFor="observation-text">Ham gözlem</label>
          <KeyboardTextarea
            id="observation-text"
            value={observationText}
            onChange={(event) => setObservationText(event.target.value)}
            placeholder="Örn. Renk Avı sırasında sarı nesneleri arkadaşlarına gösterdi..."
            rows={5}
          />
          <p>Yazdığınız ham gözlem değişmeden saklanır.</p>
          <button className="sheet-primary" type="button" onClick={saveObservation} disabled={!observationText.trim()}>
            <PaperPlaneIcon aria-hidden="true" /> Gözlemi kaydet
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
          <section className="local-vault-card" aria-label="Yerel veri durumu">
            <span className="security-icon"><LockClosedIcon aria-hidden="true" /></span>
            <span>
              <strong>Bu cihazda korunan yerel kasa</strong>
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
                <p>Öğrenci, yoklama ve ham gözlemleri bütünlük özetiyle tek dosyada koruyun.</p>
              </div>
            </div>
            <div className="data-action-grid">
              <button type="button" onClick={() => void createBackup()} disabled={dataBusy || !dataHydrated}>
                <DownloadIcon aria-hidden="true" />
                <span><strong>Yedek oluştur</strong><small>Sürümlü JSON</small></span>
              </button>
              <button type="button" onClick={() => restoreFileRef.current?.click()} disabled={dataBusy}>
                <UploadIcon aria-hidden="true" />
                <span><strong>Geri yükle</strong><small>Önce doğrula</small></span>
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
                  <button type="button" onClick={() => void confirmRestore("merge")} disabled={dataBusy}>Mevcut veriye ekle</button>
                  <button type="button" className="replace-action" onClick={() => void confirmRestore("replace")} disabled={dataBusy}>Tümünü değiştir</button>
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
