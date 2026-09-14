import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  isClassroomSchedule,
  type ClassroomSchedule,
} from "../../core/domain/classroom.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { assertEntityRecord } from "../../core/repository/entities.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import {
  defaultTeacherOwnedDailyFlowBlockDrafts,
  type TeacherOwnedDailyFlowBlockDraft,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import type {
  CreateTeacherOwnedPlanGraphInput,
  TeacherOwnedMonthlyPlanDraft,
  TeacherOwnedPlanGraph,
  TeacherOwnedWeeklyPlanDraft,
} from "../../core/domain/teacher-owned-plan.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  curriculumAgeBandFromLabel,
  curriculumTargetsForResolvedAgeBand,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import {
  createPlanWithActivity,
  normalizeCurriculumProfile,
  type CurriculumProfileInput,
  type CurriculumProfileSnapshot,
  type ExpectedTeacherOwnedDailyLineage,
} from "../evidence/evidence-flow.ts";
import {
  appendTeacherOwnedPlanMonths,
  appendTeacherOwnedPlanWeeks,
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
} from "./teacher-owned-plan-service.ts";
import {
  buildNeutralTeacherYearOutline,
  buildTeacherFullYearMonthDrafts,
} from "./teacher-year-outline.ts";

export type PlanNextStepLevel = "annual" | "monthly" | "weekly" | "daily";

export interface PlanNextStepTarget {
  level: PlanNextStepLevel;
  planId: string;
  civilDate: string;
}

export type PlanNextStepRequest =
  | {
      kind: "link-existing-daily-plan";
      civilDate: string;
      dailyPlanId: string;
      annualPlanId: string;
      monthlyPlanId: string;
      weeklyPlanId: string;
      expectedFingerprint: string;
    }
  | {
      kind: "create-plan-graph";
      civilDate: string;
      input: Omit<CreateTeacherOwnedPlanGraphInput, "now">;
    }
  | {
      kind: "append-plan-month";
      civilDate: string;
      annualPlanId: string;
      expectedAnnualUpdatedAt: string;
      month: TeacherOwnedMonthlyPlanDraft;
    }
  | {
      kind: "append-plan-week";
      civilDate: string;
      annualPlanId: string;
      monthlyPlanId: string;
      expectedAnnualUpdatedAt: string;
      expectedMonthlyUpdatedAt: string;
      week: TeacherOwnedWeeklyPlanDraft;
    }
  | {
      kind: "create-daily-plan";
      civilDate: string;
      planTitle: string;
      activityTitle: string;
      startTime: string;
      endTime: string;
      curriculumProfile: CurriculumProfileSnapshot;
      curriculumTarget: CurriculumTargetSnapshot;
      dailyFlowBlocks: readonly TeacherOwnedDailyFlowBlockDraft[];
      expectedLineage: ExpectedTeacherOwnedDailyLineage;
    };

export interface PlanNextStepOption {
  id: string;
  title: string;
  detail: string;
  sourceLabel: string;
  actionLabel: string;
  request?: PlanNextStepRequest;
  openTarget?: PlanNextStepTarget;
}

export interface PlanNextStepsModel {
  status: "action-required" | "ready" | "blocked";
  level: PlanNextStepLevel;
  title: string;
  detail: string;
  civilDate: string;
  options: readonly PlanNextStepOption[];
  blockedReason?: string;
}

export interface PlanNextStepApplyResult {
  kind: PlanNextStepRequest["kind"];
  createdPlanIds: readonly string[];
  createdActivityIds: readonly string[];
  nextTarget: PlanNextStepTarget;
  message: string;
}

export interface LoadPlanNextStepsInput {
  civilDate: string;
  requestedLevel?: PlanNextStepLevel;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recordText(record: StoredRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dateLabel(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!, 12)));
}

function blocked(
  civilDate: string,
  level: PlanNextStepLevel,
  reason: string,
): PlanNextStepsModel {
  return {
    status: "blocked",
    level,
    title: "Plan adımı tamamlanamıyor",
    detail: reason,
    civilDate,
    options: [],
    blockedReason: reason,
  };
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function fullYearDrafts(annualPeriodStart: string, annualPeriodEnd: string) {
  return buildTeacherFullYearMonthDrafts({
    annualPeriodStart,
    annualPeriodEnd,
    months: buildNeutralTeacherYearOutline({
      annualPeriodStart,
      annualPeriodEnd,
    }),
  });
}

function draftForMonth(
  annualPeriodStart: string,
  annualPeriodEnd: string,
  civilDate: string,
): TeacherOwnedMonthlyPlanDraft | null {
  const monthKey = civilDate.slice(0, 7);
  return fullYearDrafts(annualPeriodStart, annualPeriodEnd).find(
    (month) => month.monthKey === monthKey,
  ) ?? null;
}

function teacherWeekForDate(graph: TeacherOwnedPlanGraph, civilDate: string) {
  const matches = graph.months.flatMap(({ monthly, weeks }) =>
    weeks
      .filter((week) => week.periodStart <= civilDate && week.periodEnd >= civilDate)
      .map((weekly) => ({ monthly, weekly })),
  );
  return matches;
}

function profileFromClassroom(classroom: StoredRecord): CurriculumProfileSnapshot | null {
  const raw = classroom.curriculumProfileSnapshot;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  try {
    return normalizeCurriculumProfile(raw as CurriculumProfileInput);
  } catch {
    return null;
  }
}

function scheduleMinutes(schedule: ClassroomSchedule): number {
  const minutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour! * 60 + minute!;
  };
  return minutes(schedule.endTime) - minutes(schedule.startTime);
}

function localTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function preparedActivityTimes(
  schedule: ClassroomSchedule,
  blocks: readonly TeacherOwnedDailyFlowBlockDraft[],
): { startTime: string; endTime: string } {
  const [hour, minute] = schedule.startTime.split(":").map(Number);
  const scheduleStart = hour! * 60 + minute!;
  const activityIndex = blocks.findIndex((block) => block.kind === "teacher-activity-one");
  const precedingMinutes = blocks
    .slice(0, activityIndex < 0 ? 0 : activityIndex)
    .reduce((total, block) => total + block.durationMinutes, 0);
  const activityMinutes = activityIndex < 0 ? 30 : blocks[activityIndex]!.durationMinutes;
  return {
    startTime: localTime(scheduleStart + precedingMinutes),
    endTime: localTime(scheduleStart + precedingMinutes + activityMinutes),
  };
}

function diverseTargets(
  targets: readonly CurriculumTargetSnapshot[],
  limit = 3,
): CurriculumTargetSnapshot[] {
  const selected: CurriculumTargetSnapshot[] = [];
  const domains = new Set<string>();
  for (const target of targets) {
    if (domains.has(target.domain)) continue;
    selected.push(target);
    domains.add(target.domain);
    if (selected.length === limit) return selected;
  }
  for (const target of targets) {
    if (selected.some((item) => item.id === target.id)) continue;
    selected.push(target);
    if (selected.length === limit) break;
  }
  return selected;
}

/**
 * Etkin sınıfın kalıcı kayıtlarından tek bir uygulanabilir plan adımı üretir.
 * Bu fonksiyon salt okunurdur; hiçbir öneri öğretmen eyleminden önce kayıt olmaz.
 */
export async function loadPlanNextSteps(
  store: LocalDataStore,
  input: LoadPlanNextStepsInput,
): Promise<PlanNextStepsModel> {
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    return blocked(
      input.civilDate,
      "annual",
      "Plan hazırlamak için etkin ve arşivlenmemiş bir sınıf seçin.",
    );
  }
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === scope.academicYearId && typeof record.deletedAt !== "string",
  );
  const classroom = snapshot.classrooms.find(
    (record) => record.id === scope.classroomId && typeof record.deletedAt !== "string",
  );
  if (
    !academicYear ||
    !classroom ||
    !isCivilDate(String(academicYear.startDate)) ||
    !isCivilDate(String(academicYear.endDate))
  ) {
    return blocked(
      input.civilDate,
      "annual",
      "Etkin sınıfın eğitim yılı tarihleri tamamlanmalıdır.",
    );
  }
  const yearStart = String(academicYear.startDate);
  const yearEnd = String(academicYear.endDate);
  if (input.civilDate < yearStart || input.civilDate > yearEnd) {
    return blocked(
      input.civilDate,
      "annual",
      "Seçilen gün etkin eğitim yılının tarih aralığında olmalıdır.",
    );
  }

  let graph: TeacherOwnedPlanGraph | null;
  try {
    graph = await loadTeacherOwnedPlanGraph(store);
  } catch (reason) {
    return blocked(
      input.civilDate,
      "annual",
      reason instanceof Error
        ? reason.message
        : "Plan kayıt zinciri doğrulanamadı.",
    );
  }

  if (!graph) {
    const months = fullYearDrafts(yearStart, yearEnd);
    if (
      months.length === 0 ||
      !months.some(
        (month) => month.periodStart <= input.civilDate && month.periodEnd >= input.civilDate,
      )
    ) {
      return blocked(
        input.civilDate,
        "annual",
        "Seçilen gün için Eylül–Haziran öğretim omurgası hazırlanamaz.",
      );
    }
    const request: PlanNextStepRequest = {
      kind: "create-plan-graph",
      civilDate: input.civilDate,
      input: {
        title: `${recordText(academicYear, "name", "Etkin eğitim yılı")} · Öğretmen yıllık planı`,
        periodStart: yearStart,
        periodEnd: yearEnd,
        teacherContent: {
          narrative: "Yıllık omurga sınıfın gerçek gözlemleri ve öğretmenin seçeceği program hedefleriyle ayrıntılandırılacaktır.",
          draftStatus: "teacher-review-required",
          sourceOutline: "local-neutral-year-outline",
        },
        months,
        expectedAcademicYearId: scope.academicYearId,
        expectedClassroomId: scope.classroomId,
      },
    };
    return {
      status: "action-required",
      level: "annual",
      title: "Yıl, ay ve hafta omurgasını hazırlayın",
      detail: "Eğitim yılı sınırlarından hazırlanmış dönemler kaydedilir; etkinlik uygulandı sayılmaz.",
      civilDate: input.civilDate,
      options: [{
        id: "create-plan-graph",
        title: "Eylül–Haziran plan omurgası",
        detail: `${months.length} aylık plan ve bunlara bağlı hafta dönemleri öğretmen taslağı olarak hazırlanacak.`,
        sourceLabel: "Etkin eğitim yılı tarihleri",
        actionLabel: "Yıl–ay–hafta omurgasını kaydet",
        request,
      }],
    };
  }

  if (
    graph.annual.periodStart > input.civilDate ||
    graph.annual.periodEnd < input.civilDate
  ) {
    return blocked(
      input.civilDate,
      "monthly",
      "Seçilen gün kayıtlı yıllık öğretmen planının döneminde değildir.",
    );
  }
  const monthMatches = graph.months.filter(
    ({ monthly }) =>
      monthly.periodStart <= input.civilDate && monthly.periodEnd >= input.civilDate,
  );
  if (monthMatches.length > 1) {
    return blocked(
      input.civilDate,
      "monthly",
      "Seçilen gün birden fazla aylık plana düşüyor; çakışma çözülmeden devam edilemez.",
    );
  }
  if (monthMatches.length === 0) {
    const month = draftForMonth(
      graph.annual.periodStart,
      graph.annual.periodEnd,
      input.civilDate,
    );
    if (!month) {
      return blocked(
        input.civilDate,
        "monthly",
        "Seçilen gün için eğitim ayı taslağı hazırlanamadı.",
      );
    }
    return {
      status: "action-required",
      level: "monthly",
      title: "Bu ayın plan omurgasını hazırlayın",
      detail: "Kayıtlı yıllık plana seçilen ay ve hafta dönemleri eklenir.",
      civilDate: input.civilDate,
      options: [{
        id: `append-month:${month.monthKey}`,
        title: month.title,
        detail: `${month.periodStart}–${month.periodEnd} · ${month.weeks.length} hafta taslağı`,
        sourceLabel: "Kayıtlı yıllık plan",
        actionLabel: "Bu ayın omurgasını kaydet",
        request: {
          kind: "append-plan-month",
          civilDate: input.civilDate,
          annualPlanId: graph.annual.id,
          expectedAnnualUpdatedAt: graph.annual.updatedAt,
          month,
        },
      }],
    };
  }

  const monthGroup = monthMatches[0]!;
  const weekMatches = monthGroup.weeks.filter(
    (week) => week.periodStart <= input.civilDate && week.periodEnd >= input.civilDate,
  );
  if (weekMatches.length > 1) {
    return blocked(
      input.civilDate,
      "weekly",
      "Seçilen gün birden fazla haftalık plana düşüyor; çakışma çözülmeden devam edilemez.",
    );
  }
  if (weekMatches.length === 0) {
    const monthDraft = draftForMonth(
      graph.annual.periodStart,
      graph.annual.periodEnd,
      input.civilDate,
    );
    const week = monthDraft?.weeks.find(
      (candidate) =>
        candidate.periodStart <= input.civilDate && candidate.periodEnd >= input.civilDate,
    );
    if (!week) {
      return blocked(
        input.civilDate,
        "weekly",
        "Seçilen gün için hafta dönemi hazırlanamadı.",
      );
    }
    const overlaps = monthGroup.weeks.some(
      (existing) =>
        existing.periodStart <= week.periodEnd && week.periodStart <= existing.periodEnd,
    );
    if (overlaps) {
      return blocked(
        input.civilDate,
        "weekly",
        "Hazırlanan hafta mevcut bir dönemle çakışıyor; plan tarihleri incelenmelidir.",
      );
    }
    return {
      status: "action-required",
      level: "weekly",
      title: "Bu haftanın plan omurgasını hazırlayın",
      detail: "Hafta mevcut ayın içine eklenir; diğer haftalar değişmez.",
      civilDate: input.civilDate,
      options: [{
        id: `append-week:${week.weekKey}`,
        title: week.title,
        detail: `${week.periodStart}–${week.periodEnd} öğretmen taslağı`,
        sourceLabel: monthGroup.monthly.title,
        actionLabel: "Bu haftanın omurgasını kaydet",
        request: {
          kind: "append-plan-week",
          civilDate: input.civilDate,
          annualPlanId: graph.annual.id,
          monthlyPlanId: monthGroup.monthly.id,
          expectedAnnualUpdatedAt: graph.annual.updatedAt,
          expectedMonthlyUpdatedAt: monthGroup.monthly.updatedAt,
          week,
        },
      }],
    };
  }

  const weekly = weekMatches[0]!;
  const existingDailyPlans = snapshot.plans.filter(
    (record) =>
      record.planType === "daily" &&
      record.civilDate === input.civilDate &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (existingDailyPlans.length > 1) {
    return blocked(
      input.civilDate,
      "daily",
      "Bu gün için birden fazla günlük plan var; çakışma incelenmeden yeni plan oluşturulamaz.",
    );
  }
  if (existingDailyPlans.length === 1) {
    const daily = existingDailyPlans[0]!;
    const activities = snapshot.activities.filter(a => a.planId === daily.id && typeof a.deletedAt !== "string");
    const matches = (r: StoredRecord) => r.sourceAnnualPlanId === graph.annual.id && r.sourceMonthlyPlanId === monthGroup.monthly.id && r.sourceWeeklyPlanId === weekly.id;
    if (!matches(daily) || activities.some(a => !matches(a))) {
      const premium = [daily,...activities].some(r => r.sourceContentPackSnapshot !== undefined || r.premiumDailyFlowSnapshot !== undefined || r.sourceActivityTemplateId !== undefined);
      if (premium) return blocked(input.civilDate,"daily","Bu günlük plan ayrı bir içerik paketinin kaynaklarını taşıyor. Paketin özgün bağlantıları öğretmen planına dönüştürülemez.");
      return { status:"action-required",level:"daily",title:"Kayıtlı günlük planı haftasına bağlayın",civilDate:input.civilDate,
        detail:`${recordText(daily,"title","Kayıtlı günlük plan")} ve ${activities.length} mevcut etkinlik, ${weekly.periodStart}–${weekly.periodEnd} haftasına birlikte bağlanacak. Mevcut akış, hedefler ve gözlemler korunur.`,
        options:[{id:`link-daily:${daily.id}:${weekly.id}`,title:weekly.title,detail:`${monthGroup.monthly.title} → ${weekly.title} → ${recordText(daily,"title","Günlük plan")}`,sourceLabel:graph.annual.title,actionLabel:"Günlük planı bu haftaya bağla",request:{kind:"link-existing-daily-plan",civilDate:input.civilDate,dailyPlanId:daily.id,annualPlanId:graph.annual.id,monthlyPlanId:monthGroup.monthly.id,weeklyPlanId:weekly.id,expectedFingerprint:dailyLinkFingerprint(snapshot)}}] };
    }
    return {
      status: "ready",
      level: "daily",
      title: "Günlük plan hazır",
      detail: `${dateLabel(input.civilDate)} için kayıtlı planı açarak düzenleyebilirsiniz.`,
      civilDate: input.civilDate,
      options: [{
        id: `open-daily:${daily.id}`,
        title: recordText(daily, "title", "Kayıtlı günlük plan"),
        detail: "Mevcut kayıt korunur; ikinci bir günlük plan oluşturulmaz.",
        sourceLabel: weekly.title,
        actionLabel: "Kayıtlı günlük planı aç",
        openTarget: { level: "daily", planId: daily.id, civilDate: input.civilDate },
      }],
    };
  }

  if (!isClassroomSchedule(classroom.schedule)) {
    return blocked(
      input.civilDate,
      "daily",
      "Günlük akışı hazırlamak için sınıfın başlangıç ve bitiş saatlerini tamamlayın.",
    );
  }
  const profile = profileFromClassroom(classroom);
  if (!profile) {
    return blocked(
      input.civilDate,
      "daily",
      "Günlük hedef seçenekleri için sınıfın program katalog kaynağını tamamlayın.",
    );
  }
  const ageBand = curriculumAgeBandFromLabel(
    typeof classroom.ageGroup === "string" ? classroom.ageGroup : undefined,
  );
  const targets = diverseTargets(
    curriculumTargetsForResolvedAgeBand(profile, ageBand),
  );
  if (targets.length === 0) {
    return blocked(
      input.civilDate,
      "daily",
      "Günlük hedef seçenekleri için sınıfın resmî yaş bandını seçin.",
    );
  }
  const hasActiveStudent = snapshot.students.some(
    (student) =>
      sameScope(student, scope) &&
      typeof student.deletedAt !== "string" &&
      resolveStudentMembershipOn(student, {
        ...scope,
        academicYear,
        civilDate: input.civilDate,
      }).eligible,
  );
  if (!hasActiveStudent) {
    return blocked(
      input.civilDate,
      "daily",
      "Bu gün için etkin sınıfta kayıtlı en az bir çocuk bulunmalıdır.",
    );
  }
  const dailyFlowBlocks = defaultTeacherOwnedDailyFlowBlockDrafts(
    scheduleMinutes(classroom.schedule),
  );
  const times = preparedActivityTimes(classroom.schedule, dailyFlowBlocks);
  const expectedLineage: ExpectedTeacherOwnedDailyLineage = {
    annualPlanId: graph.annual.id,
    monthlyPlanId: monthGroup.monthly.id,
    weeklyPlanId: weekly.id,
    expectedAnnualUpdatedAt: graph.annual.updatedAt,
    expectedMonthlyUpdatedAt: monthGroup.monthly.updatedAt,
    expectedWeeklyUpdatedAt: weekly.updatedAt,
  };
  const planTitle = `${dateLabel(input.civilDate)} · Günlük öğrenme planı`;
  return {
    status: "action-required",
    level: "daily",
    title: "Günlük plan için bir hedef seçin",
    detail: "Seçim gerçek planı ve planlanmış etkinliği kaydeder; uygulanmış veya gözlenmiş sayılmaz.",
    civilDate: input.civilDate,
    options: targets.map((target) => ({
      id: `daily-target:${target.id}`,
      title: `${target.referenceCode} · ${target.referenceTitle}`,
      detail: `${target.domain} · ${weekly.title}`,
      sourceLabel: target.sourceLabel,
      actionLabel: "Günlük planı kaydet ve aç",
      request: {
        kind: "create-daily-plan",
        civilDate: input.civilDate,
        planTitle,
        activityTitle: target.referenceTitle,
        ...times,
        curriculumProfile: profile,
        curriculumTarget: target,
        dailyFlowBlocks,
        expectedLineage,
      },
    })),
  };
}

function requireUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} kimliği geçersiz.`);
}

function dailyLinkFingerprint(snapshot: DataSnapshot): string {
  return canonicalJson(Object.fromEntries(COLLECTION_NAMES.map(name => [name,[...snapshot[name]].sort((a,b)=>a.id.localeCompare(b.id))])));
}

async function linkExistingDailyPlan(store:LocalDataStore,request:Extract<PlanNextStepRequest,{kind:"link-existing-daily-plan"}>,now:Date):Promise<PlanNextStepApplyResult> {
  const {assertDataSnapshotRelationships}=await import("../../core/backup/schema.ts");
  for(const id of [request.dailyPlanId,request.annualPlanId,request.monthlyPlanId,request.weeklyPlanId])requireUuid(id,"Plan");
  if(Object.keys(request).sort().join(",")!==["kind","civilDate","dailyPlanId","annualPlanId","monthlyPlanId","weeklyPlanId","expectedFingerprint"].sort().join(",") || typeof request.expectedFingerprint!=="string")throw new Error("Günlük plan bağlantı isteği geçersiz.");
  return store.transaction("readwrite",COLLECTION_NAMES,async tx=>{
    const snapshot=createEmptySnapshot();for(const name of COLLECTION_NAMES)snapshot[name]=await tx.getAll(name);
    const view:LocalDataStore={readSnapshot:async()=>structuredClone(snapshot),close(){},transaction:async(_mode,_names,task)=>task({getAll:async name=>structuredClone(snapshot[name]) as never,putMany:async()=>{throw new Error("Salt okunur kaynak");},clear:async()=>{throw new Error("Salt okunur kaynak");}})};
    const fresh=await loadPlanNextSteps(view,{civilDate:request.civilDate});
    const scope=resolveActiveClassroomScope(snapshot),daily=snapshot.plans.find(r=>r.id===request.dailyPlanId);
    const activities=snapshot.activities.filter(r=>r.planId===request.dailyPlanId&&typeof r.deletedAt!=="string");
    const linked=(r:StoredRecord)=>r.sourceAnnualPlanId===request.annualPlanId&&r.sourceMonthlyPlanId===request.monthlyPlanId&&r.sourceWeeklyPlanId===request.weeklyPlanId;
    const result=(message:string):PlanNextStepApplyResult=>({kind:request.kind,createdPlanIds:[],createdActivityIds:[],nextTarget:{level:"daily",planId:request.dailyPlanId,civilDate:request.civilDate},message});
    if(fresh.status==="ready"&&fresh.options.some(o=>o.openTarget?.planId===daily?.id)&&daily&&linked(daily)&&activities.every(linked))return result("Günlük plan zaten seçilen haftaya bağlı; ikinci kayıt oluşturulmadı.");
    const option=fresh.options.find(o=>o.request?.kind==="link-existing-daily-plan");
    if(!scope||!daily||!sameScope(daily,scope)||activities.some(a=>!sameScope(a,scope))||canonicalJson(option?.request??null)!==canonicalJson(request))throw new Error("Günlük plan veya hafta kaynakları değişti. Hazır bağlantıyı yenileyin; kayıt yazılmadı.");
    const at=new Date(Math.max(now.getTime(),...([daily,...activities].map(r=>Date.parse(r.updatedAt)+1)))).toISOString();
    const patch={sourceAnnualPlanId:request.annualPlanId,sourceMonthlyPlanId:request.monthlyPlanId,sourceWeeklyPlanId:request.weeklyPlanId,updatedAt:at};
    const nextDaily={...daily,...patch},nextActivities=activities.map(a=>({...a,...patch}));
    snapshot.plans=snapshot.plans.map(r=>r.id===daily.id?nextDaily:r);snapshot.activities=snapshot.activities.map(r=>nextActivities.find(a=>a.id===r.id)??r);
    assertEntityRecord("plans",nextDaily);for(const activity of nextActivities)assertEntityRecord("activities",activity);
    // Validate the complete preserved graph, including dependent reports and raw
    // evidence, before the first real write. The existing daily flow is untouched.
    assertDataSnapshotRelationships(snapshot,civilDateInIstanbul(now));
    await tx.putMany("plans",[nextDaily]);if(nextActivities.length)await tx.putMany("activities",nextActivities);
    return result("Günlük plan ve mevcut etkinlikleri seçilen haftaya bağlandı.");
  });
}

/** Seçilmiş hazır adımı kanonik servis üzerinden atomik olarak uygular. */
export async function applyPlanNextStep(
  store: LocalDataStore,
  request: PlanNextStepRequest,
  options: { now?: Date } = {},
): Promise<PlanNextStepApplyResult> {
  if (!isCivilDate(request.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gereklidir.");

  if(request.kind==="link-existing-daily-plan")return linkExistingDailyPlan(store,request,now);

  if (request.kind === "create-plan-graph") {
    requireUuid(request.input.expectedAcademicYearId ?? "", "Beklenen eğitim yılı");
    requireUuid(request.input.expectedClassroomId ?? "", "Beklenen sınıf");
    const graph = await createTeacherOwnedPlanGraph(store, {
      ...structuredClone(request.input),
      now,
    });
    const week = teacherWeekForDate(graph, request.civilDate)[0]?.weekly;
    if (!week) throw new Error("Kaydedilen omurgada seçilen günün haftası bulunamadı.");
    return {
      kind: request.kind,
      createdPlanIds: [
        graph.annual.id,
        ...graph.months.flatMap(({ monthly, weeks }) => [
          monthly.id,
          ...weeks.map((item) => item.id),
        ]),
      ],
      createdActivityIds: [],
      nextTarget: { level: "weekly", planId: week.id, civilDate: request.civilDate },
      message: "Yıl, ay ve hafta omurgası kaydedildi. Şimdi günlük hedefi seçin.",
    };
  }

  if (request.kind === "append-plan-month") {
    const graph = await appendTeacherOwnedPlanMonths(store, {
      annualPlanId: request.annualPlanId,
      expectedUpdatedAt: request.expectedAnnualUpdatedAt,
      months: [structuredClone(request.month)],
      now,
    });
    const group = graph.months.find(({ monthly }) => monthly.monthKey === request.month.monthKey);
    const week = teacherWeekForDate(graph, request.civilDate)[0]?.weekly;
    if (!group || !week) throw new Error("Kaydedilen ayın hafta zinciri bulunamadı.");
    return {
      kind: request.kind,
      createdPlanIds: [group.monthly.id, ...group.weeks.map((item) => item.id)],
      createdActivityIds: [],
      nextTarget: { level: "weekly", planId: week.id, civilDate: request.civilDate },
      message: "Ay ve hafta omurgası kaydedildi. Şimdi günlük hedefi seçin.",
    };
  }

  if (request.kind === "append-plan-week") {
    const graph = await appendTeacherOwnedPlanWeeks(store, {
      annualPlanId: request.annualPlanId,
      monthlyPlanId: request.monthlyPlanId,
      expectedAnnualUpdatedAt: request.expectedAnnualUpdatedAt,
      expectedMonthlyUpdatedAt: request.expectedMonthlyUpdatedAt,
      weeks: [structuredClone(request.week)],
      now,
    });
    const week = teacherWeekForDate(graph, request.civilDate)[0]?.weekly;
    if (!week) throw new Error("Kaydedilen hafta yeniden yüklenemedi.");
    return {
      kind: request.kind,
      createdPlanIds: [week.id],
      createdActivityIds: [],
      nextTarget: { level: "weekly", planId: week.id, civilDate: request.civilDate },
      message: "Hafta omurgası kaydedildi. Şimdi günlük hedefi seçin.",
    };
  }

  const created = await createPlanWithActivity(store, {
    civilDate: request.civilDate,
    planTitle: request.planTitle,
    activityTitle: request.activityTitle,
    startTime: request.startTime,
    endTime: request.endTime,
    curriculumProfile: structuredClone(request.curriculumProfile),
    curriculumTargets: [structuredClone(request.curriculumTarget)],
    assignmentMode: "whole-class",
    studentIds: [],
    teacherOwnedDailyFlowBlocks: structuredClone(request.dailyFlowBlocks),
    teacherOwnedActivityBlockKind: "teacher-activity-one",
    expectedTeacherOwnedLineage: structuredClone(request.expectedLineage),
    initialActivityStatus: "planned",
    now,
  });
  return {
    kind: request.kind,
    createdPlanIds: [created.plan.id],
    createdActivityIds: [created.activity.id],
    nextTarget: {
      level: "daily",
      planId: created.plan.id,
      civilDate: request.civilDate,
    },
    message: "Günlük plan ve planlanmış etkinlik kaydedildi.",
  };
}
