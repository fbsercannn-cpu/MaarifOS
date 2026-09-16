import { isCivilDate } from "../../core/domain/attendance.ts";
import { academicYearEffectiveOperationalStart } from "../../core/domain/academic-year-operational.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import type {
  ActivityStudioAgeBand,
  ActivityStudioItem,
} from "./activity-studio-model.ts";
import {
  TYMM_2024_DOMAINS,
  type Tymm2024Domain,
} from "../curriculum/tymm-2024-catalog.ts";
import type {
  ParticipationRouteId,
  PedagogicalScenarioId,
} from "../pedagogical-os/pedagogical-orchestrator.ts";

export const ACTIVITY_STUDIO_APPLICATION_PLAN_TYPE =
  "activity-studio-application" as const;
export const ACTIVITY_STUDIO_APPLICATION_ACTIVITY_KIND =
  "activity-studio-application" as const;

const APPLICATION_SCHEMA_VERSION = 1;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,119}$/u;

export interface ActivityStudioApplicationIdentity {
  readonly sessionId: string;
  readonly planId: string;
  readonly activityId: string;
  readonly sourceActivityId: string;
  readonly civilDate: string;
}

export interface EnsureActivityStudioApplicationInput {
  readonly activity: Pick<
    ActivityStudioItem,
    "id" | "title" | "contentOrigin" | "tymmDomains"
  >;
  readonly civilDate: string;
  readonly ageBand: ActivityStudioAgeBand;
  readonly scenarioId: PedagogicalScenarioId;
  readonly participationRouteId: ParticipationRouteId;
  readonly now?: Date;
}

export interface ActivityStudioApplicationContext {
  readonly plan: StoredRecord;
  readonly activity: StoredRecord;
  readonly identity: ActivityStudioApplicationIdentity;
  readonly created: boolean;
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} boş bırakılamaz.`);
  return normalized;
}

function validSourceActivityId(value: string): string {
  const normalized = value.trim();
  if (!SOURCE_ID_PATTERN.test(normalized)) {
    throw new Error("Etkinlik Stüdyosu kaynak kimliği geçersiz.");
  }
  return normalized;
}

function isTymm2024Domain(value: unknown): value is Tymm2024Domain {
  return (
    typeof value === "string" &&
    (TYMM_2024_DOMAINS as readonly string[]).includes(value)
  );
}

function observationDomainHintFromActivity(
  activity: EnsureActivityStudioApplicationInput["activity"],
): Tymm2024Domain {
  const firstDomain = Array.isArray(activity.tymmDomains)
    ? activity.tymmDomains[0]
    : undefined;
  if (!isTymm2024Domain(firstDomain)) {
    throw new Error("Etkinliğin ilk TYMM öğrenme alanı geçersiz.");
  }
  return firstDomain;
}

function assertStoredObservationDomainHint(
  record: StoredRecord,
  expected: Tymm2024Domain,
): void {
  if (record.observationDomainHint === undefined) return;
  if (
    !isTymm2024Domain(record.observationDomainHint) ||
    record.observationDomainHint !== expected
  ) {
    throw new Error(
      "Etkinlik uygulamasının gözlem alanı kaynağıyla uyuşmuyor; mevcut kayıt değiştirilmeden inceleme gerekir.",
    );
  }
}

function timeInIstanbul(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) {
    throw new Error("Etkinlik uygulama saati oluşturulamadı.");
  }
  return `${hour}:${minute}`;
}

function isLiveInScope(
  record: StoredRecord,
  scope: ActiveClassroomScope,
  civilDate: string,
): boolean {
  return (
    record.civilDate === civilDate &&
    typeof record.deletedAt !== "string" &&
    recordBelongsToClassroomScope(record, scope)
  );
}

function matchesApplication(
  record: StoredRecord,
  input: EnsureActivityStudioApplicationInput,
  sourceActivityId: string,
  scope: ActiveClassroomScope,
): boolean {
  return (
    record.sourceActivityId === sourceActivityId &&
    record.ageBand === input.ageBand &&
    record.scenarioId === input.scenarioId &&
    record.participationRouteId === input.participationRouteId &&
    isLiveInScope(record, scope, input.civilDate)
  );
}

async function activeScopeInTransaction(transaction: DataTransaction): Promise<{
  scope: ActiveClassroomScope;
  academicYears: StoredRecord[];
  classrooms: StoredRecord[];
}> {
  const [academicYears, classrooms, settings] = await Promise.all([
    transaction.getAll("academicYears"),
    transaction.getAll("classrooms"),
    transaction.getAll("settings"),
  ]);
  const scope = resolveActiveClassroomScope({
    academicYears,
    classrooms,
    settings,
  });
  if (!scope) {
    throw new Error(
      "Etkinliği uygulamak için etkin ve arşivlenmemiş bir sınıf gerekli.",
    );
  }
  return { scope, academicYears, classrooms };
}

/**
 * A Studio application is a durable, idempotent context. It deliberately uses
 * its own plan/activity kind so an observation can never be silently attached
 * to a different daily-plan activity that happened to be live at the time.
 */
export async function ensureActivityStudioApplication(
  store: LocalDataStore,
  input: EnsureActivityStudioApplicationInput,
): Promise<ActivityStudioApplicationContext> {
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Etkinlik uygulama günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const sourceActivityId = validSourceActivityId(input.activity.id);
  const activityTitle = requiredText(input.activity.title, "Etkinlik adı");
  if (input.activity.contentOrigin !== "MaarifOS-original") {
    throw new Error("Yalnız kaynağı doğrulanmış MaarifOS etkinliği uygulanabilir.");
  }
  const observationDomainHint = observationDomainHintFromActivity(input.activity);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Etkinlik uygulaması için geçerli bir kayıt zamanı gerekli.");
  }
  const timestamp = now.toISOString();
  let result: ActivityStudioApplicationContext | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans", "activities"],
    async (transaction) => {
      const { scope, academicYears, classrooms } =
        await activeScopeInTransaction(transaction);
      const [plans, activities] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("activities"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.civilDate <
          academicYearEffectiveOperationalStart({
            startDate: academicYear.startDate,
            operationalStartDate:
              typeof academicYear.operationalStartDate === "string"
                ? academicYear.operationalStartDate
                : undefined,
          }) ||
        input.civilDate > academicYear.endDate
      ) {
        throw new Error(
          "Etkinlik uygulama günü aktif eğitim yılının tarih aralığında olmalıdır.",
        );
      }

      const classroom = classrooms.find(
        (record) =>
          record.id === scope.classroomId &&
          record.academicYearId === scope.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      const curriculumProfile = classroom?.curriculumProfileSnapshot;
      if (
        typeof curriculumProfile !== "object" ||
        curriculumProfile === null ||
        Array.isArray(curriculumProfile)
      ) {
        throw new Error(
          "Etkinliği uygulamak için sınıfın program profili tamamlanmalıdır.",
        );
      }

      const matchingPlans = plans.filter(
        (record) =>
          record.planType === ACTIVITY_STUDIO_APPLICATION_PLAN_TYPE &&
          matchesApplication(record, input, sourceActivityId, scope),
      );
      const matchingActivities = activities.filter(
        (record) =>
          record.activityKind === ACTIVITY_STUDIO_APPLICATION_ACTIVITY_KIND &&
          matchesApplication(record, input, sourceActivityId, scope),
      );

      if (matchingPlans.length > 1 || matchingActivities.length > 1) {
        throw new Error(
          "Bu etkinlik için birden fazla uygulama bağlamı bulundu; kayıtlar silinmeden inceleme gerekir.",
        );
      }

      if (matchingPlans.length === 1 || matchingActivities.length === 1) {
        const plan = matchingPlans[0];
        const activity = matchingActivities[0];
        if (
          !plan ||
          !activity ||
          activity.planId !== plan.id ||
          activity.studioApplicationId !== plan.studioApplicationId ||
          typeof activity.studioApplicationId !== "string"
        ) {
          throw new Error(
            "Etkinlik uygulama bağlamı eksik; mevcut kayıtlar değiştirilmeden inceleme gerekir.",
          );
        }
        assertStoredObservationDomainHint(plan, observationDomainHint);
        assertStoredObservationDomainHint(activity, observationDomainHint);
        const backfilledPlan =
          plan.observationDomainHint === undefined
            ? { ...plan, observationDomainHint, updatedAt: timestamp }
            : plan;
        const backfilledActivity =
          activity.observationDomainHint === undefined
            ? { ...activity, observationDomainHint, updatedAt: timestamp }
            : activity;
        if (backfilledPlan !== plan) {
          await transaction.putMany("plans", [backfilledPlan]);
        }
        if (backfilledActivity !== activity) {
          await transaction.putMany("activities", [backfilledActivity]);
        }
        result = {
          plan: backfilledPlan,
          activity: backfilledActivity,
          identity: {
            sessionId: activity.studioApplicationId,
            planId: plan.id,
            activityId: activity.id,
            sourceActivityId,
            civilDate: input.civilDate,
          },
          created: false,
        };
        return;
      }

      const sessionId = crypto.randomUUID();
      const planId = crypto.randomUUID();
      const activityId = crypto.randomUUID();
      const commonSource = {
        studioApplicationId: sessionId,
        sourceActivityId,
        sourceContentOrigin: input.activity.contentOrigin,
        ageBand: input.ageBand,
        scenarioId: input.scenarioId,
        participationRouteId: input.participationRouteId,
        observationDomainHint,
      } as const;
      const plan: StoredRecord = {
        id: planId,
        planType: ACTIVITY_STUDIO_APPLICATION_PLAN_TYPE,
        title: `${activityTitle} uygulaması`,
        status: "active",
        ...commonSource,
        curriculumProfileSnapshot: curriculumProfile,
        curriculumTargets: [],
        maarifRefs: [],
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: APPLICATION_SCHEMA_VERSION,
      };
      const activity: StoredRecord = {
        id: activityId,
        planId,
        activityKind: ACTIVITY_STUDIO_APPLICATION_ACTIVITY_KIND,
        title: activityTitle,
        startTime: timeInIstanbul(now),
        status: "planned",
        studioApplicationStatus: "active",
        ...commonSource,
        assignmentMode: "whole-class",
        studentIds: [],
        curriculumProfileSnapshot: curriculumProfile,
        curriculumTargets: [],
        maarifRefs: [],
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: APPLICATION_SCHEMA_VERSION,
      };
      await transaction.putMany("plans", [plan]);
      await transaction.putMany("activities", [activity]);
      result = {
        plan,
        activity,
        identity: {
          sessionId,
          planId,
          activityId,
          sourceActivityId,
          civilDate: input.civilDate,
        },
        created: true,
      };
    },
  );

  if (!result) {
    throw new Error("Etkinlik uygulama bağlamı oluşturulamadı.");
  }
  return result;
}
