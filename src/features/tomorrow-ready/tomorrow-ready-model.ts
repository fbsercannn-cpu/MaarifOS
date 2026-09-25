import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { classDutyWeekSummary } from "../class-duty-schedule/class-duty-model.ts";
import {
  resolveDayExitPackageModel,
  type LoadDayExitPackageInput,
} from "../day-exit-package/day-exit-package-model.ts";
import { homeGameCards } from "../home-game-cards/home-game-card-model.ts";
import { resolveSmallGroupCardModel } from "../small-group-cards/small-group-card-model.ts";

export type TomorrowReadyState = "ready" | "needs-action" | "not-available";

export interface TomorrowReadyItem {
  readonly id: "plan" | "materials" | "small-group" | "fruit" | "family-card";
  readonly title: string;
  readonly state: TomorrowReadyState;
  readonly detail: string;
}

export interface TomorrowReadyModel {
  readonly scope: { readonly academicYearId: string; readonly classroomId: string };
  readonly sourceCivilDate: string;
  readonly today: string;
  readonly nextTeachingDate: string | null;
  readonly nextTeachingDayLabel: string | null;
  readonly planIds: readonly string[];
  readonly activityIds: readonly string[];
  readonly pendingPreparationSourceIds: readonly string[];
  readonly preparationSourceFingerprint: string | null;
  readonly smallGroupPlanId: string | null;
  readonly fruitScheduleId: string | null;
  readonly items: readonly TomorrowReadyItem[];
  readonly readyCount: number;
  readonly actionableCount: number;
  readonly sourceFingerprint: string;
}

function item(
  id: TomorrowReadyItem["id"],
  title: string,
  state: TomorrowReadyState,
  detail: string,
): TomorrowReadyItem {
  return { id, title, state, detail };
}

function activeStudentIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string"))].sort()
    : [];
}

function emptyModel(
  source: ReturnType<typeof resolveDayExitPackageModel>,
): TomorrowReadyModel {
  const items = [
    item("plan", "Günlük plan", "not-available", "Eğitim yılı içinde sonraki öğretim günü bulunmuyor."),
    item("materials", "Materyal hazırlığı", "not-available", "Hazırlanacak sonraki öğretim günü bulunmuyor."),
    item("small-group", "Küçük grup", "not-available", "Küçük grup için sonraki öğretim günü bulunmuyor."),
    item("fruit", "Meyve günü", "not-available", "Görev günü için sonraki öğretim günü bulunmuyor."),
    item("family-card", "Aile kartı", "not-available", "Aile kartı için sonraki öğretim günü bulunmuyor."),
  ] as const;
  return {
    scope: source.scope,
    sourceCivilDate: source.civilDate,
    today: source.today,
    nextTeachingDate: null,
    nextTeachingDayLabel: null,
    planIds: [],
    activityIds: [],
    pendingPreparationSourceIds: [],
    preparationSourceFingerprint: null,
    smallGroupPlanId: null,
    fruitScheduleId: null,
    items,
    readyCount: 0,
    actionableCount: 0,
    sourceFingerprint: canonicalJson({
      scope: source.scope,
      sourceCivilDate: source.civilDate,
      nextTeachingDate: null,
    }),
  };
}

export function resolveTomorrowReadyModel(
  snapshot: DataSnapshot,
  input: LoadDayExitPackageInput = {},
): TomorrowReadyModel {
  const exit = resolveDayExitPackageModel(snapshot, input);
  if (!exit.nextDay) return emptyModel(exit);

  const nextDate = exit.nextDay.civilDate;
  const planIds = exit.nextDay.plans.map((plan) => plan.id);
  const planIdSet = new Set(planIds);
  const activities = snapshot.activities
    .filter((record) =>
      typeof record.deletedAt !== "string" &&
      typeof record.planId === "string" &&
      planIdSet.has(record.planId) &&
      record.civilDate === nextDate,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const activityIds = activities.map((record) => record.id);

  const pendingSources = exit.nextDay.sources.filter(
    (source) => source.available && !source.alreadySaved,
  );
  const availableSources = exit.nextDay.sources.filter((source) => source.available);
  const unavailableSources = exit.nextDay.sources.filter((source) => !source.available);

  const smallGroup = resolveSmallGroupCardModel(snapshot, {
    civilDate: nextDate,
    now: input.now,
  });
  const exactTargets = smallGroup.targets.filter((target) => target.civilDate === nextDate);
  const smallGroupTargets = exactTargets.filter(
    (target) =>
      target.assignmentMode === "selected-students" &&
      target.currentStudentIds.length > 0,
  );
  const smallGroupPlanId = smallGroupTargets[0]?.planId ?? exactTargets[0]?.planId ?? planIds[0] ?? null;

  const fruitRows = classDutyWeekSummary(snapshot, { civilDate: nextDate }).filter(
    (row) =>
      row.kind === "fruit" &&
      row.status !== "cancelled" &&
      row.civilDate <= nextDate &&
      row.endOn >= nextDate,
  );

  const expectedFamilyPairs = activities.flatMap((activity) =>
    activeStudentIds(activity.studentIds).map((studentId) => ({
      activityId: activity.id,
      planId: String(activity.planId),
      studentId,
    })),
  );
  const expectedFamilyKeys = new Set(
    expectedFamilyPairs.map((entry) => `${entry.planId}\u0000${entry.activityId}\u0000${entry.studentId}`),
  );
  const preparedFamilyKeys = new Set(
    homeGameCards(snapshot).flatMap((record) =>
      record.workflow.kind === "prepared"
        ? [`${record.workflow.planId}\u0000${record.workflow.activityId}\u0000${record.studentId}`]
        : [],
    ).filter((key) => expectedFamilyKeys.has(key)),
  );

  const items: TomorrowReadyItem[] = [
    planIds.length
      ? item(
          "plan",
          "Günlük plan",
          "ready",
          planIds.length === 1
            ? exit.nextDay.plans[0]!.title
            : `${planIds.length} kayıtlı günlük plan`,
        )
      : item(
          "plan",
          "Günlük plan",
          "needs-action",
          "Bu öğretim günü için kayıtlı günlük plan yok.",
        ),
    availableSources.length === 0
      ? item(
          "materials",
          "Materyal hazırlığı",
          "not-available",
          unavailableSources.length
            ? "Plan kaynaklarında materyal veya ön hazırlık belirtilmemiş."
            : "Hazırlık için gerçek plan veya etkinlik kaynağı henüz yok.",
        )
      : pendingSources.length === 0
        ? item(
            "materials",
            "Materyal hazırlığı",
            "ready",
            `${availableSources.length} gerçek kaynak hazırlık listesinde kayıtlı.`,
          )
        : item(
            "materials",
            "Materyal hazırlığı",
            "needs-action",
            `${pendingSources.length} gerçek plan veya etkinlik kaynağı hazırlık bekliyor.`,
          ),
    exactTargets.length === 0
      ? item(
          "small-group",
          "Küçük grup",
          "needs-action",
          "Küçük grup seçimi için önce günlük planı hazırlayın.",
        )
      : smallGroupTargets.length === exactTargets.length
        ? item(
            "small-group",
            "Küçük grup",
            "ready",
            `${smallGroupTargets.length} etkinliğin çocuk grubu kayıtlı.`,
          )
        : item(
            "small-group",
            "Küçük grup",
            "needs-action",
            `${exactTargets.length - smallGroupTargets.length} etkinlikte küçük grup seçimi yapılmadı.`,
          ),
    fruitRows.length
      ? item(
          "fruit",
          "Meyve günü",
          "ready",
          fruitRows.map((row) => row.studentName || "Kayıtlı çocuk").join(" · "),
        )
      : item(
          "fruit",
          "Meyve günü",
          "needs-action",
          "Bu gün için kayıtlı meyve günü görevi yok.",
        ),
    expectedFamilyKeys.size === 0
      ? item(
          "family-card",
          "Aile kartı",
          "not-available",
          "Aile kartı için çocuk kapsamı olan gerçek etkinlik henüz yok.",
        )
      : preparedFamilyKeys.size === expectedFamilyKeys.size
        ? item(
            "family-card",
            "Aile kartı",
            "ready",
            `${preparedFamilyKeys.size} çocuk-etkinlik kartı kayıtlı.`,
          )
        : item(
            "family-card",
            "Aile kartı",
            "needs-action",
            `${preparedFamilyKeys.size}/${expectedFamilyKeys.size} çocuk-etkinlik kartı hazır.`,
          ),
  ];

  const result = {
    scope: exit.scope,
    sourceCivilDate: exit.civilDate,
    today: exit.today,
    nextTeachingDate: nextDate,
    nextTeachingDayLabel: exit.nextDay.schoolDay.official
      ? "MEB çalışma takvimi"
      : "Sınıf çalışma takvimi",
    planIds,
    activityIds,
    pendingPreparationSourceIds: pendingSources.map((source) => source.id),
    preparationSourceFingerprint: exit.nextDay.sourceFingerprint,
    smallGroupPlanId,
    fruitScheduleId: fruitRows[0]?.scheduleId ?? null,
    items,
    readyCount: items.filter((entry) => entry.state === "ready").length,
    actionableCount: items.filter((entry) => entry.state === "needs-action").length,
  };
  return { ...result, sourceFingerprint: canonicalJson(result) };
}

export async function loadTomorrowReadyModel(
  store: LocalDataStore,
  input: LoadDayExitPackageInput = {},
): Promise<TomorrowReadyModel> {
  return resolveTomorrowReadyModel(await store.readSnapshot(), input);
}
