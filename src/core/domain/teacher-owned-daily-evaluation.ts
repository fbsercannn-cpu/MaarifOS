import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { ActiveClassroomScope } from "./classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";

export const DAILY_PLAN_EVALUATION_SETTING_TYPE = "daily-plan-evaluation-v1" as const;
export const DAILY_PLAN_EVALUATION_SCHEMA_VERSION = 1 as const;
export const DAILY_PLAN_EVALUATION_KEYS = [
  "settingType",
  "academicYearId",
  "classroomId",
  "studentId",
  "workflow",
] as const;

export interface DailyEvaluationPresetItem {
  readonly id: string;
  readonly title: string;
  readonly narrative: string;
}

export const DAILY_EVALUATION_PRESETS: Readonly<{
  children: readonly DailyEvaluationPresetItem[];
  teacher: readonly DailyEvaluationPresetItem[];
  program: readonly DailyEvaluationPresetItem[];
}> = {
  children: [
    {
      id: "ch-active-cooperation",
      title: "Yüksek Katılım & İş Birliği",
      narrative:
        "Çocuklar etkinliklere aktif ve istekli katıldı; grup oyunlarında iş birliği, paylaşma ve sıra bekleme davranışları doğal akışta gözlemlendi.",
    },
    {
      id: "ch-differentiated-pace",
      title: "Farklılaşan Bireysel Tempo",
      narrative:
        "Çocukların büyük kısmı süreci başarıyla tamamladı; yönergeleri kavramada ve ince motor basamaklarında bazı çocuklara ek bireysel rehberlik sağlandı.",
    },
    {
      id: "ch-curiosity-discovery",
      title: "Merak & Problem Çözme",
      narrative:
        "Öğrenme merkezlerindeki araştırma ve serbest deneme süreçlerinde çocukların soru sorma, neden-sonuç kurma ve çözüm üretme motivasyonu yüksekti.",
    },
    {
      id: "ch-emotional-expression",
      title: "Duygu Paylaşımı & Öz Düzenleme",
      narrative:
        "Günün çember saati ve geçiş anlarında çocuklar duygularını rahatça ifade etti; duygu regülasyonu ve akran iletişiminde olumlu adımlar pekişti.",
    },
  ],
  teacher: [
    {
      id: "tr-flow-time-harmony",
      title: "Akış ve Süre Uyumu",
      narrative:
        "Planlanan etkinlik süreleri ve geçiş oyunları çocukların dikkat kapasitesine tam uyum sağladı; sınıf dinamiği kesintisiz yönetildi.",
    },
    {
      id: "tr-scaffolding-autonomy",
      title: "Rehberlik ve Çocuk Özerkliği",
      narrative:
        "Öğretmen merkezli yönlendirme dengeli tutuldu; çocukların kendi oyun stratejilerini kurmalarına ve karar almalarına rehberlik edildi.",
    },
    {
      id: "tr-material-differentiation",
      title: "Materyal ve Uyarlama",
      narrative:
        "Sunulan somut nesneler ve kademeli destek basamakları farklı gelişim seviyesindeki tüm çocukların sürece katılımını kolaylaştırdı.",
    },
    {
      id: "tr-flexible-responsiveness",
      title: "Esnek Müdahale",
      narrative:
        "Çocukların anlık merak ve tepkileri doğrultusunda etkinlik akışı pedagojik sınırda esnetilerek öğrenme fırsatına dönüştürüldü.",
    },
  ],
  program: [
    {
      id: "pr-tymm-outcomes-met",
      title: "TYMM Çıktı ve Değer Uyumu",
      narrative:
        "Hedeflenen Türkiye Yüzyılı Maarif Modeli öğrenme çıktıları ve erdem-değer-eylem göstergeleri planlanan biçimde gerçekleşti.",
    },
    {
      id: "pr-learning-environment",
      title: "Ortam ve Materyal Yeterliliği",
      narrative:
        "Fiziksel alan düzenlemesi ve merkezlerdeki donanım hedeflenen beceri çıktılarını doğrudan destekledi.",
    },
    {
      id: "pr-reinforcement-needed",
      title: "Tekrar ve Pekiştirme Önerisi",
      narrative:
        "Kazanılan becerinin kalıcılığı için haftalık planlama akışında benzer temalı bir pekiştirme oyununa yer verilmesi kararlaştırıldı.",
    },
    {
      id: "pr-developmental-fit",
      title: "Gelişim Düzeyine Tam Uygunluk",
      narrative:
        "Etkinlik tasarımının zorluk derecesi ve kullanılan dil sınıf yaş grubunun bilişsel ve duyuşsal hazırbulunuşluğu ile örtüştü.",
    },
  ],
} as const;

export interface DailyEvaluationAspect {
  readonly presetId: string | null;
  readonly title: string;
  readonly narrative: string;
  readonly customized: boolean;
}

export interface DailyPlanEvaluationWorkflow {
  readonly kind: "daily-evaluation";
  readonly planId: string;
  readonly civilDate: string;
  readonly children: DailyEvaluationAspect;
  readonly teacher: DailyEvaluationAspect;
  readonly program: DailyEvaluationAspect;
  readonly overallNote: string;
  readonly evaluatedAt: string;
}

export type DailyPlanEvaluationRecord = StoredRecord &
  ActiveClassroomScope & {
    settingType: typeof DAILY_PLAN_EVALUATION_SETTING_TYPE;
    schemaVersion: typeof DAILY_PLAN_EVALUATION_SCHEMA_VERSION;
    studentId: null;
    deletedAt: null;
    workflow: DailyPlanEvaluationWorkflow;
  };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasExactKeys(v: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(v).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isAspect(v: unknown): v is DailyEvaluationAspect {
  if (!isObject(v)) return false;
  if (
    !hasExactKeys(v, ["presetId", "title", "narrative", "customized"]) ||
    !(v.presetId === null || typeof v.presetId === "string") ||
    typeof v.title !== "string" ||
    typeof v.narrative !== "string" ||
    typeof v.customized !== "boolean"
  ) {
    return false;
  }
  return true;
}

export function isDailyPlanEvaluationRecord(
  v: unknown,
): v is DailyPlanEvaluationRecord {
  if (!isObject(v)) return false;
  if (
    !hasExactKeys(v, [
      "id",
      "createdAt",
      "updatedAt",
      "civilDate",
      "schemaVersion",
      "deletedAt",
      ...DAILY_PLAN_EVALUATION_KEYS,
    ]) ||
    typeof v.id !== "string" ||
    !UUID_PATTERN.test(v.id) ||
    typeof v.createdAt !== "string" ||
    !UTC_ISO_PATTERN.test(v.createdAt) ||
    v.updatedAt !== v.createdAt ||
    typeof v.civilDate !== "string" ||
    !isCivilDate(v.civilDate) ||
    v.civilDate !== civilDateInIstanbul(new Date(v.createdAt)) ||
    v.schemaVersion !== DAILY_PLAN_EVALUATION_SCHEMA_VERSION ||
    v.deletedAt !== null ||
    v.settingType !== DAILY_PLAN_EVALUATION_SETTING_TYPE ||
    typeof v.academicYearId !== "string" ||
    !UUID_PATTERN.test(v.academicYearId) ||
    typeof v.classroomId !== "string" ||
    !UUID_PATTERN.test(v.classroomId) ||
    v.studentId !== null ||
    !isObject(v.workflow)
  ) {
    return false;
  }
  const w = v.workflow;
  if (
    !hasExactKeys(w, [
      "kind",
      "planId",
      "civilDate",
      "children",
      "teacher",
      "program",
      "overallNote",
      "evaluatedAt",
    ]) ||
    w.kind !== "daily-evaluation" ||
    typeof w.planId !== "string" ||
    !UUID_PATTERN.test(w.planId) ||
    typeof w.civilDate !== "string" ||
    !isCivilDate(w.civilDate) ||
    !isAspect(w.children) ||
    !isAspect(w.teacher) ||
    !isAspect(w.program) ||
    typeof w.overallNote !== "string" ||
    typeof w.evaluatedAt !== "string" ||
    !UTC_ISO_PATTERN.test(w.evaluatedAt)
  ) {
    return false;
  }
  return true;
}

export function dailyPlanEvaluations(
  snapshot: DataSnapshot,
  scope?: ActiveClassroomScope,
): DailyPlanEvaluationRecord[] {
  return snapshot.settings
    .filter(isDailyPlanEvaluationRecord)
    .filter(
      (record) =>
        !scope ||
        (record.academicYearId === scope.academicYearId &&
          record.classroomId === scope.classroomId),
    )
    .sort(
      (a, b) =>
        a.workflow.civilDate.localeCompare(b.workflow.civilDate) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}

export function findDailyPlanEvaluation(
  snapshot: DataSnapshot,
  planId: string,
): DailyPlanEvaluationRecord | null {
  const records = snapshot.settings
    .filter(isDailyPlanEvaluationRecord)
    .filter((r) => r.workflow.planId === planId);
  return records.at(-1) ?? null;
}

export function findDailyPlanEvaluationByDate(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  civilDate: string,
): DailyPlanEvaluationRecord | null {
  const records = dailyPlanEvaluations(snapshot, scope).filter(
    (r) => r.workflow.civilDate === civilDate,
  );
  return records.at(-1) ?? null;
}

export function createInitialDailyEvaluationAspect(
  category: "children" | "teacher" | "program",
  presetIndex = 0,
): DailyEvaluationAspect {
  const presets = DAILY_EVALUATION_PRESETS[category];
  const item = presets[presetIndex] ?? presets[0];
  return {
    presetId: item ? item.id : null,
    title: item ? item.title : "",
    narrative: item ? item.narrative : "",
    customized: false,
  };
}

export interface CreateDailyPlanEvaluationInput {
  readonly planId: string;
  readonly civilDate: string;
  readonly children: DailyEvaluationAspect;
  readonly teacher: DailyEvaluationAspect;
  readonly program: DailyEvaluationAspect;
  readonly overallNote?: string;
  readonly timestamp?: string;
}

export function buildDailyPlanEvaluationRecord(
  scope: ActiveClassroomScope,
  input: CreateDailyPlanEvaluationInput,
): DailyPlanEvaluationRecord {
  const now = input.timestamp ?? new Date().toISOString();
  const civilDate = civilDateInIstanbul(new Date(now));
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    civilDate,
    schemaVersion: DAILY_PLAN_EVALUATION_SCHEMA_VERSION,
    deletedAt: null,
    settingType: DAILY_PLAN_EVALUATION_SETTING_TYPE,
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    studentId: null,
    workflow: {
      kind: "daily-evaluation",
      planId: input.planId,
      civilDate: input.civilDate,
      children: input.children,
      teacher: input.teacher,
      program: input.program,
      overallNote: input.overallNote ?? "",
      evaluatedAt: now,
    },
  };
}

export function assertDailyPlanEvaluationRelationships(
  snapshot: DataSnapshot,
): void {
  const records = snapshot.settings.filter(
    (r) => r.settingType === DAILY_PLAN_EVALUATION_SETTING_TYPE,
  );
  if (!records.every(isDailyPlanEvaluationRecord)) {
    throw new Error("Günlük plan değerlendirme kayıt sözleşmesi geçersiz.");
  }
  for (const record of records) {
    const plan = snapshot.plans.find((p) => p.id === record.workflow.planId);
    if (!plan || plan.planType !== "daily" || typeof plan.deletedAt === "string") {
      throw new Error(`Günlük plan ${record.workflow.planId} bulunamadı.`);
    }
    if (
      plan.academicYearId !== record.academicYearId ||
      plan.classroomId !== record.classroomId
    ) {
      throw new Error("Günlük plan değerlendirme sınıf veya yıl uyumsuz.");
    }
  }
}
