import type { TodayAttendanceSummary, TodayStudentCard } from "../today/today-screen-model.ts";
import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import {
  ACTIVITY_STUDIO_AGE_BANDS,
  ACTIVITY_STUDIO_ITEMS,
  filterActivityStudioItems,
  type ActivityStudioAgeBand,
  type ActivityStudioItem,
} from "../activity-studio/activity-studio-model.ts";

export type PedagogicalScenarioId =
  | "balanced"
  | "indoor-rain"
  | "low-energy"
  | "high-energy"
  | "no-material"
  | "small-group"
  | "sensory-calm";

export type ParticipationRouteId =
  | "multiple"
  | "verbal"
  | "movement"
  | "visual";

export interface PedagogicalScenario {
  readonly id: PedagogicalScenarioId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly setupChange: string;
  readonly materialStrategy: string;
  readonly pacing: string;
  readonly safetyCheck: string;
}

export interface ParticipationRoute {
  readonly id: ParticipationRouteId;
  readonly label: string;
  readonly instruction: string;
}

export const PEDAGOGICAL_SCENARIOS: readonly PedagogicalScenario[] = Object.freeze([
  {
    id: "balanced",
    label: "Dengeli sınıf akışı",
    shortLabel: "Dengeli",
    description: "Hareket, sakinleşme, keşif ve paylaşım arasında dengeli bir gün kurar.",
    setupChange: "Etkinliğin özgün ortamını ve temel akışını koruyun.",
    materialStrategy: "Listelenen malzemeleri erişilebilir istasyonlara ayırın.",
    pacing: "Kısa yönerge, çocuk denemesi ve ortak yansıtma sırasını koruyun.",
    safetyCheck: "Geçiş alanlarını açık bırakın; izleme ve pas geçme hakkını görünür tutun.",
  },
  {
    id: "indoor-rain",
    label: "Yağmur · içeride kalıyoruz",
    shortLabel: "Yağmur",
    description: "Açık hava niyetini sınıf içinde hareket ve doğa gözlemiyle sürdürür.",
    setupChange: "Mobilyalar arasında güvenli bir dolaşım hattı ve iki küçük istasyon kurun.",
    materialStrategy: "Bahçe malzemesi yerine pencere gözlemi, kâğıt işaretler ve sınıf nesneleri kullanın.",
    pacing: "Hareketli bölümü iki kısa tura ayırıp araya nefes ve su molası ekleyin.",
    safetyCheck: "Kaygan zemin, keskin köşe ve dar geçişleri başlamadan kontrol edin.",
  },
  {
    id: "low-energy",
    label: "Enerji düşük · yumuşak başlangıç",
    shortLabel: "Düşük enerji",
    description: "Katılım baskısı kurmadan merak, ritim ve küçük seçimlerle grubu toplar.",
    setupChange: "Çocukların oturarak, uzanarak veya ayakta katılabileceği yarım çember kurun.",
    materialStrategy: "Az sayıda, yüksek kontrastlı ve kolay taşınan malzeme seçin.",
    pacing: "Bekleme süresini uzatın; tek yönerge ve tek seçimle başlayın.",
    safetyCheck: "Yorgunluk belirtisinde izleme ve dinlenme seçeneğini etkinliğin parçası sayın.",
  },
  {
    id: "high-energy",
    label: "Enerji yüksek · hareketi yapılandır",
    shortLabel: "Yüksek enerji",
    description: "Yoğun hareket ihtiyacını sıra, rol ve güvenli görevlerle öğrenmeye bağlar.",
    setupChange: "Başlangıç ve bitiş noktaları görünür üç kısa hareket istasyonu kurun.",
    materialStrategy: "Yumuşak, büyük ve paylaşımı kolay sınıf malzemeleri kullanın.",
    pacing: "Önce büyük hareket, sonra eşli görev, en sonda kısa sakinleşme uygulayın.",
    safetyCheck: "Aynı anda hareket eden çocuk sayısını sınırlandırın ve çarpışma hattını boşaltın.",
  },
  {
    id: "no-material",
    label: "Malzeme yok · beden ve çevre",
    shortLabel: "Malzemesiz",
    description: "Etkinlik niyetini satın alınan veya basılan araçlara ihtiyaç duymadan korur.",
    setupChange: "Sınıfın mevcut nesnelerini, beden hareketini, sesi ve boş alanı öğrenme ortamı yapın.",
    materialStrategy: "Hazır materyali beden, ses, gölge, sınıf nesnesi veya yeniden kullanım malzemesiyle değiştirin.",
    pacing: "Önce öğretmen modeli yerine bir çocuk fikrini deneyin; varyasyonları çocuklardan toplayın.",
    safetyCheck: "Seçilen günlük nesnelerin kırılma, yutma ve keskin kenar riskini kontrol edin.",
  },
  {
    id: "small-group",
    label: "Küçük grup · derinleşme",
    shortLabel: "Küçük grup",
    description: "Aynı niyeti eş zamanlı küçük gruplarda farklı katılım yollarıyla işler.",
    setupChange: "Üç ila beş çocukluk iki istasyon ve bağımsız bekleme seçeneği hazırlayın.",
    materialStrategy: "Malzemeyi grup başına küçük tepsilere bölün; ortak kaynak için sıra işareti ekleyin.",
    pacing: "Her gruba kısa öğretmen başlangıcı verip deneme süresini uzatın.",
    safetyCheck: "Öğretmen görüş alanı dışında istasyon bırakmayın; grup geçişini işaretle başlatın.",
  },
  {
    id: "sensory-calm",
    label: "Duyusal sakinlik · düşük uyarım",
    shortLabel: "Sakin alan",
    description: "Ses, ışık ve temas yükünü azaltarak gözlemci katılımını eşdeğer tutar.",
    setupChange: "Tek odak noktası, yumuşak ışık ve sessiz geri çekilme alanı oluşturun.",
    materialStrategy: "Ses çıkarmayan, kokusuz ve dokunma zorunluluğu olmayan malzemeleri seçin.",
    pacing: "Yönergeyi önceden gösterin; sürpriz geçiş yapmayın ve ek işlem süresi verin.",
    safetyCheck: "Temas, yüksek ses ve göz teması zorunlu değildir; pas geçme yolu her an açık kalır.",
  },
]);

export const PARTICIPATION_ROUTES: readonly ParticipationRoute[] = Object.freeze([
  {
    id: "multiple",
    label: "Çoklu katılım",
    instruction: "Söyleme, gösterme, taşıma, eşleme ve yalnız izleme seçeneklerini aynı anda açık tutun.",
  },
  {
    id: "verbal",
    label: "Sözlü anlatım",
    instruction: "Açık uçlu tek soru sorun; yanıt için bekleyin ve çocuğun sözünü değiştirmeden kaydedin.",
  },
  {
    id: "movement",
    label: "Hareketle katılım",
    instruction: "Seçimi bedenle gösterme, yer değiştirme veya nesne taşıma yolunu eşdeğer katılım sayın.",
  },
  {
    id: "visual",
    label: "Görsel katılım",
    instruction: "İki veya üç görünür seçenek sunun; bakış, işaret etme ve eşlemeyi kabul edin.",
  },
]);

export const PEDAGOGICAL_VARIANT_COUNT = ACTIVITY_STUDIO_ITEMS.reduce(
  (total, item) => total + item.ageBands.length,
  0,
) * PEDAGOGICAL_SCENARIOS.length * PARTICIPATION_ROUTES.length;

export interface ActivityContextAdaptation {
  readonly scenario: PedagogicalScenario;
  readonly participationRoute: ParticipationRoute;
  readonly setup: string;
  readonly materialSwap: string;
  readonly facilitation: string;
  readonly evidencePrompt: string;
  readonly familyBridge: string;
  readonly safetyCheck: string;
}

export function createActivityContextAdaptation(input: {
  activity: ActivityStudioItem;
  ageBand: ActivityStudioAgeBand;
  scenarioId: PedagogicalScenarioId;
  participationRouteId?: ParticipationRouteId;
}): ActivityContextAdaptation {
  if (!input.activity.ageBands.includes(input.ageBand)) {
    throw new Error("Etkinlik seçilen TYMM yaş bandını desteklemiyor.");
  }
  const scenario = PEDAGOGICAL_SCENARIOS.find((item) => item.id === input.scenarioId);
  const participationRoute = PARTICIPATION_ROUTES.find(
    (item) => item.id === (input.participationRouteId ?? "multiple"),
  );
  if (!scenario || !participationRoute) {
    throw new Error("Pedagojik uyarlama bağlamı tanınmıyor.");
  }
  return Object.freeze({
    scenario,
    participationRoute,
    setup: `${scenario.setupChange} ${input.activity.environment} bağlamını koruyun.`,
    materialSwap: `${scenario.materialStrategy} Temel niyet için ${input.activity.materials.slice(0, 2).join(" ve ")} yeterlidir.`,
    facilitation: `${scenario.pacing} ${participationRoute.instruction}`,
    evidencePrompt: `${input.activity.observationPrompt} Katılım biçimini değil çocuğun seçtiği stratejiyi ve koşul değişikliğine verdiği yanıtı kaydedin.`,
    familyBridge: `${input.activity.familyExtension} Paylaşım gönüllüdür; evden fotoğraf, malzeme veya özel bilgi istenmez.`,
    safetyCheck: scenario.safetyCheck,
  });
}

export function resolveActivityAgeBand(value?: string): ActivityStudioAgeBand {
  const normalized = value?.replace(/\s/gu, "") ?? "";
  if (normalized.includes("36") && normalized.includes("48")) return "36-48";
  if (normalized.includes("60") && normalized.includes("72")) return "60-72";
  return "48-60";
}

const LIVED_VALUES = [
  "merhamet",
  "adalet",
  "emanet",
  "yardımlaşma",
  "nezaket",
  "sorumluluk",
  "şükür ve israf etmeme",
] as const;

export interface PedagogicalValueTrace {
  readonly value: string;
  readonly action: string;
  readonly evidence: string;
  readonly reflection: string;
  readonly nextPlan: string;
}

export interface PedagogicalDayPhase {
  readonly id: "welcome" | "circle" | "explore" | "movement" | "studio" | "reflection" | "family";
  readonly sequence: number;
  readonly rhythmLabel: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly intention: string;
  readonly teacherMove: string;
  readonly observationTarget: string;
  readonly activity: ActivityStudioItem | null;
  readonly valueTrace: PedagogicalValueTrace;
}

export interface PedagogicalDayFlow {
  readonly scenario: PedagogicalScenario;
  readonly ageBand: ActivityStudioAgeBand;
  readonly phases: readonly PedagogicalDayPhase[];
  readonly totalMinutes: number;
  readonly activityIds: readonly string[];
  readonly learningDomains: readonly string[];
}

function civilDateSeed(civilDate: string): number {
  let hash = 2_166_136_261;
  for (const character of civilDate) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function selectFlowActivities(
  ageBand: ActivityStudioAgeBand,
  civilDate: string,
  scenarioId: PedagogicalScenarioId,
): readonly ActivityStudioItem[] {
  const items = filterActivityStudioItems({ ageBand });
  const scenarioIndex = PEDAGOGICAL_SCENARIOS.findIndex((item) => item.id === scenarioId);
  const start = (civilDateSeed(civilDate) + Math.max(0, scenarioIndex) * 5) % items.length;
  const rotated = [...items.slice(start), ...items.slice(0, start)];
  const selected: ActivityStudioItem[] = [];
  const categories = new Set<string>();
  for (const item of rotated) {
    if (categories.has(item.category)) continue;
    categories.add(item.category);
    selected.push(item);
    if (selected.length === 4) break;
  }
  return Object.freeze(selected);
}

function valueTrace(
  index: number,
  action: string,
  evidence: string,
): PedagogicalValueTrace {
  const value = LIVED_VALUES[index % LIVED_VALUES.length];
  return Object.freeze({
    value,
    action,
    evidence,
    reflection: `${value} hakkında hüküm vermeden, ortamın hangi davranışı kolaylaştırdığını öğretmen notuyla düşünün.`,
    nextPlan: "Bir sonraki planda işe yarayan ortam koşulunu koruyun; işlemediği görülen koşulu değiştirin.",
  });
}

export function createPedagogicalDayFlow(input: {
  ageBand: ActivityStudioAgeBand;
  civilDate: string;
  scenarioId?: PedagogicalScenarioId;
}): PedagogicalDayFlow {
  const scenarioId = input.scenarioId ?? "balanced";
  const scenario = PEDAGOGICAL_SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error("Gün akışı senaryosu tanınmıyor.");
  const [circle, explore, movement, studio] = selectFlowActivities(
    input.ageBand,
    input.civilDate,
    scenarioId,
  );
  if (!circle || !explore || !movement || !studio) {
    throw new Error("Seçilen yaş bandı için yeterli etkinlik bulunamadı.");
  }

  const phases: readonly PedagogicalDayPhase[] = Object.freeze([
    {
      id: "welcome",
      sequence: 1,
      rhythmLabel: "Karşılama",
      title: "Sınıfa güvenli giriş ve serbest seçim",
      durationMinutes: 15,
      intention: "Çocuğun güne kendi ritminde başlamasına alan açmak.",
      teacherMove: scenario.id === "high-energy" ? "İki hareketli karşılama görevi ve bir sakin köşe sunun." : "İki görünür seçim ve sessiz gözlem alanı sunun.",
      observationTarget: "Çocuğun kimi, neyi veya hangi alanı kendiliğinden seçtiğini not edin.",
      activity: null,
      valueTrace: valueTrace(0, "Sınıfa gelen arkadaş için alan açma ve selamlaşma seçeneği sunma.", "Çocuğun gönüllü yardım, bekleme veya alan paylaşma davranışı."),
    },
    {
      id: "circle",
      sequence: 2,
      rhythmLabel: "Birlikte başlama",
      title: circle.title,
      durationMinutes: circle.durationMinutes,
      intention: circle.teacherPrompt,
      teacherMove: createActivityContextAdaptation({ activity: circle, ageBand: input.ageBand, scenarioId }).facilitation,
      observationTarget: circle.observationPrompt,
      activity: circle,
      valueTrace: valueTrace(1, "Söz sırası ve farklı fikre yer açma.", circle.observationPrompt),
    },
    {
      id: "explore",
      sequence: 3,
      rhythmLabel: "Keşif",
      title: explore.title,
      durationMinutes: explore.durationMinutes,
      intention: explore.teacherPrompt,
      teacherMove: createActivityContextAdaptation({ activity: explore, ageBand: input.ageBand, scenarioId }).facilitation,
      observationTarget: explore.observationPrompt,
      activity: explore,
      valueTrace: valueTrace(2, "Ortak malzemeyi özenle kullanma ve yerine koyma.", explore.observationPrompt),
    },
    {
      id: "movement",
      sequence: 4,
      rhythmLabel: "Hareket ve açık alan",
      title: movement.title,
      durationMinutes: movement.durationMinutes,
      intention: movement.teacherPrompt,
      teacherMove: createActivityContextAdaptation({ activity: movement, ageBand: input.ageBand, scenarioId }).facilitation,
      observationTarget: movement.observationPrompt,
      activity: movement,
      valueTrace: valueTrace(3, "Eşine alan açma ve güvenli hareket için birlikte karar verme.", movement.observationPrompt),
    },
    {
      id: "studio",
      sequence: 5,
      rhythmLabel: "Üretim ve oyun",
      title: studio.title,
      durationMinutes: studio.durationMinutes,
      intention: studio.teacherPrompt,
      teacherMove: createActivityContextAdaptation({ activity: studio, ageBand: input.ageBand, scenarioId }).facilitation,
      observationTarget: studio.observationPrompt,
      activity: studio,
      valueTrace: valueTrace(4, "Arkadaşının ürününe ve çalışma alanına özen gösterme.", studio.observationPrompt),
    },
    {
      id: "reflection",
      sequence: 6,
      rhythmLabel: "Yansıtma",
      title: "Çocuk sözüyle günü görünür kıl",
      durationMinutes: 10,
      intention: "Sonucu değil seçimi, denemeyi ve değişen fikri konuşmak.",
      teacherMove: "İki açık uçlu soru sorun; konuşmak istemeyen çocuk için gösterme veya çizim seçeneği bırakın.",
      observationTarget: "Çocuk gün içinde hangi stratejisini hatırlıyor ve neyi farklı yapmak istiyor?",
      activity: null,
      valueTrace: valueTrace(5, "Kendi kullandığı alanı toparlama ve bir sonraki grup için hazır bırakma.", "Çocuğun kendi seçimini açıklama veya farklı bir sonraki adım önermesi."),
    },
    {
      id: "family",
      sequence: 7,
      rhythmLabel: "Aile köprüsü",
      title: "Evde devam için gönüllü tek küçük davet",
      durationMinutes: 5,
      intention: "Sınıftaki öğrenmeyi evde düşük maliyetli ve mahremiyete saygılı biçimde sürdürmek.",
      teacherMove: studio.familyExtension,
      observationTarget: "Aileden yanıt gelmemesi çocuk veya aile hakkında değerlendirme nedeni değildir.",
      activity: null,
      valueTrace: valueTrace(6, "Evde bulunanı israf etmeden kullanma ve aile içinde gönüllü paylaşma.", "Yalnız aile gönüllü biçimde geri bildirim verirse kaynağı ayrı aile katkısı olarak saklama."),
    },
  ]);

  return Object.freeze({
    scenario,
    ageBand: input.ageBand,
    phases,
    totalMinutes: phases.reduce((total, phase) => total + phase.durationMinutes, 0),
    activityIds: Object.freeze(phases.flatMap((phase) => phase.activity ? [phase.activity.id] : [])),
    learningDomains: Object.freeze([
      ...new Set(phases.flatMap((phase) => phase.activity?.tymmDomains ?? [])),
    ]),
  });
}

export interface ObservationCoverage {
  readonly totalStudentCount: number;
  readonly observedStudentCount: number;
  readonly unobservedStudentCount: number;
  readonly coveragePercent: number;
  readonly priorityStudents: readonly TodayStudentCard[];
  readonly distributionLabel: string;
}

export function createObservationCoverage(
  students: readonly TodayStudentCard[],
): ObservationCoverage {
  const sorted = [...students].sort(
    (left, right) =>
      left.observationCount - right.observationCount ||
      left.name.localeCompare(right.name, "tr-TR"),
  );
  const observedStudentCount = sorted.filter((student) => student.observationCount > 0).length;
  const coveragePercent = students.length === 0
    ? 0
    : Math.round((observedStudentCount / students.length) * 100);
  return Object.freeze({
    totalStudentCount: students.length,
    observedStudentCount,
    unobservedStudentCount: students.length - observedStudentCount,
    coveragePercent,
    priorityStudents: Object.freeze(sorted.slice(0, 4)),
    distributionLabel: students.length === 0
      ? "Çocuk listesi tamamlandığında gözlem dengesi görünür."
      : observedStudentCount === students.length
        ? "Her çocuk için en az bir gözlem var; sıradaki hedef en az gözlemi olan çocuklar."
        : `${students.length - observedStudentCount} çocuk için henüz gözlem yok; bu bir gelişim hükmü değil, kanıt açığıdır.`,
  });
}

export interface PedagogicalSignal {
  readonly id: "attendance" | "plan" | "application" | "observation";
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: "ready" | "attention" | "waiting";
}

export function createPedagogicalSignals(input: {
  attendance: TodayAttendanceSummary;
  teacherCycle: TeacherWorkCycleWorkspace;
  observationCoverage: ObservationCoverage;
}): readonly PedagogicalSignal[] {
  const attendanceReady = input.attendance.total > 0 && input.attendance.marked === input.attendance.total;
  const daily = input.teacherCycle.daily;
  return Object.freeze([
    {
      id: "attendance",
      label: "Sınıf varlığı",
      value: input.attendance.total === 0 ? "Bekliyor" : `${input.attendance.marked}/${input.attendance.total}`,
      detail: attendanceReady ? "Yoklama tamam" : "Öneriler tamamlanan yoklamayla keskinleşir.",
      tone: attendanceReady ? "ready" : "attention",
    },
    {
      id: "plan",
      label: "Günün planı",
      value: daily.planId ? "Bağlı" : "Eksik",
      detail: daily.title,
      tone: daily.planId ? "ready" : "attention",
    },
    {
      id: "application",
      label: "Uygulama",
      value: `${daily.completedActivityCount}/${daily.activityCount}`,
      detail: daily.activityCount === 0 ? "Plan etkinliği bekleniyor." : "Tamamlanan etkinlikler gerçek kayıttan gelir.",
      tone: daily.activityCount > 0 && daily.completedActivityCount === daily.activityCount ? "ready" : "waiting",
    },
    {
      id: "observation",
      label: "Gözlem dengesi",
      value: `%${input.observationCoverage.coveragePercent}`,
      detail: input.observationCoverage.distributionLabel,
      tone: input.observationCoverage.coveragePercent === 100 ? "ready" : "waiting",
    },
  ]);
}

export interface PedagogicalLoopStage {
  readonly id: "plan" | "apply" | "observe" | "reflect" | "adapt" | "family" | "next-plan";
  readonly label: string;
  readonly state: "done" | "current" | "waiting";
}

export function createPedagogicalLoop(
  workspace: TeacherWorkCycleWorkspace,
): readonly PedagogicalLoopStage[] {
  const planDone = workspace.daily.planId !== null;
  const applyDone = workspace.daily.activityCount > 0 && workspace.daily.completedActivityCount >= workspace.daily.activityCount;
  const observeDone = workspace.daily.observationCount > 0;
  const reflectDone = workspace.monthly?.evaluationCount ? workspace.monthly.evaluationCount > 0 : false;
  const familyReady = workspace.documents.planDocumentReady || workspace.documents.anecdoteReadyCount > 0;
  const done = [planDone, applyDone, observeDone, reflectDone, observeDone, familyReady, workspace.weekly !== null];
  const currentIndex = done.findIndex((value) => !value);
  const labels = ["Planla", "Uygula", "Gözle", "Yansıt", "Uyarla", "Aileye bağla", "Sonraki plan"] as const;
  const ids: readonly PedagogicalLoopStage["id"][] = ["plan", "apply", "observe", "reflect", "adapt", "family", "next-plan"];
  return Object.freeze(ids.map((id, index): PedagogicalLoopStage => {
    const state: PedagogicalLoopStage["state"] = done[index]
      ? "done"
      : index === currentIndex
        ? "current"
        : "waiting";
    return { id, label: labels[index], state };
  }));
}

export interface PedagogicalCoverageDomain {
  readonly domain: string;
  readonly activityCount: number;
  readonly percentage: number;
}

export function createPedagogicalCoverageMatrix(
  ageBand: ActivityStudioAgeBand,
): readonly PedagogicalCoverageDomain[] {
  const items = filterActivityStudioItems({ ageBand });
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const domain of item.tymmDomains) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  const maximum = Math.max(1, ...counts.values());
  return Object.freeze([...counts.entries()]
    .map(([domain, activityCount]) => ({
      domain,
      activityCount,
      percentage: Math.round((activityCount / maximum) * 100),
    }))
    .sort((left, right) => right.activityCount - left.activityCount || left.domain.localeCompare(right.domain, "tr-TR")));
}

export function pedagogicalVariantCountForAge(ageBand: ActivityStudioAgeBand): number {
  return filterActivityStudioItems({ ageBand }).length * PEDAGOGICAL_SCENARIOS.length * PARTICIPATION_ROUTES.length;
}

export const PEDAGOGICAL_AGE_BAND_COUNT = ACTIVITY_STUDIO_AGE_BANDS.length;
