import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import { getActivityStudioItem } from "../activity-studio/activity-studio-model.ts";
import { scheduledPlanIntegrityIssue } from "../planning/scheduled-plan-workspace.ts";

export interface SmallGroupStudentOption {
  readonly id: string;
  readonly label: string;
  readonly recommended: boolean;
  readonly recommendationSourceIds: readonly string[];
}

export interface SmallGroupDailyTarget {
  readonly planId: string;
  readonly activityId: string;
  readonly civilDate: string;
  readonly planTitle: string;
  readonly activityTitle: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly materials: readonly string[];
  readonly materialSourceLabels: readonly string[];
  readonly assignmentMode: "whole-class" | "selected-students";
  readonly currentStudentIds: readonly string[];
  readonly currentStudentNames: readonly string[];
  readonly eligibleStudentIds: readonly string[];
  readonly recommendedStudentIds: readonly string[];
  readonly planUpdatedAt: string;
  readonly activityUpdatedAt: string;
  readonly sourceFingerprint: string;
  readonly available: boolean;
  readonly blockReason: string | null;
}

export interface SmallGroupPlanCard {
  readonly planId: string;
  readonly activityId: string;
  readonly civilDate: string;
  readonly planTitle: string;
  readonly activityTitle: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly studentIds: readonly string[];
  readonly studentNames: readonly string[];
  readonly materials: readonly string[];
  readonly materialSourceLabels: readonly string[];
  readonly planUpdatedAt: string;
  readonly activityUpdatedAt: string;
  readonly sourceFingerprint: string;
}

export interface SmallGroupCardModel {
  readonly scope: ActiveClassroomScope;
  readonly civilDate: string;
  readonly today: string;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly schoolName: string;
  readonly classroomName: string;
  readonly academicYearLabel: string;
  readonly students: readonly SmallGroupStudentOption[];
  readonly targets: readonly SmallGroupDailyTarget[];
  readonly printableCards: readonly SmallGroupPlanCard[];
  readonly sourceFingerprint: string;
}

export interface LoadSmallGroupCardModelInput {
  readonly civilDate: string;
  readonly now?: Date;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  return result || null;
}

function cleanTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const text = cleanText(entry);
    return text ? [text] : [];
  });
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function utcDate(civilDate: string): Date {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, 12));
}

function addDays(civilDate: string, amount: number): string {
  const date = utcDate(civilDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function weekBounds(civilDate: string): { start: string; end: string } {
  const weekday = utcDate(civilDate).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = addDays(civilDate, mondayOffset);
  return { start, end: addDays(start, 6) };
}

function recordProjection(record: StoredRecord): Record<string, unknown> {
  const mutableAssignmentKeys = new Set([
    "updatedAt",
    "studentIds",
    "assignmentMode",
    "assignmentSnapshotAt",
    "targetAssignments",
  ]);
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key, value]) => !mutableAssignmentKeys.has(key) && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function scopedActiveStudent(
  student: StoredRecord,
  scope: ActiveClassroomScope,
  academicYear: StoredRecord,
  civilDate: string,
): boolean {
  return resolveStudentMembershipOn(student, {
    ...scope,
    academicYear,
    civilDate,
  }).eligible;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function assignedIds(record: StoredRecord): string[] {
  if (!Array.isArray(record.studentIds)) return [];
  return [...new Set(record.studentIds.filter((id): id is string => typeof id === "string"))].sort();
}

function materialSource(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  plan: StoredRecord,
  activity: StoredRecord,
): { materials: string[]; labels: string[]; fingerprintSources: unknown[] } {
  const materials: string[] = [];
  const labels: string[] = [];
  const fingerprintSources: unknown[] = [];
  const addSnapshot = (value: unknown, label: string) => {
    if (!object(value)) return;
    const sourceMaterials = cleanTextArray(value.materials);
    if (!sourceMaterials.length) return;
    materials.push(...sourceMaterials);
    labels.push(label);
    fingerprintSources.push(value);
  };
  addSnapshot(activity.appliedActivityTemplateSnapshot, "Planın uygulanacak etkinlik şablonu");
  addSnapshot(activity.sourceActivityTemplateSnapshot, "Planın kaynak etkinlik şablonu");
  if (!materials.length) {
    addSnapshot(plan.appliedActivityTemplateSnapshot, "Planın uygulanacak etkinlik şablonu");
    addSnapshot(plan.sourceActivityTemplateSnapshot, "Planın kaynak etkinlik şablonu");
  }

  const provenance = object(activity.pedagogicalProvenance)
    ? activity.pedagogicalProvenance
    : object(plan.pedagogicalProvenance)
      ? plan.pedagogicalProvenance
      : null;
  if (provenance && typeof provenance.sourceActivityId === "string") {
    const studio = getActivityStudioItem(provenance.sourceActivityId);
    if (studio) {
      materials.push(...studio.materials.map((item) => item.normalize("NFC").trim()).filter(Boolean));
      labels.push(`Etkinlik Atölyesi · ${studio.title}`);
      fingerprintSources.push({
        id: studio.id,
        title: studio.title,
        materials: [...studio.materials],
        contentOrigin: studio.contentOrigin,
      });
    }
  }

  const preparationRecords = teacherFollowups(snapshot).filter((record) =>
    record.workflow.kind === "preparation-list" &&
    record.academicYearId === scope.academicYearId &&
    record.classroomId === scope.classroomId &&
    record.workflow.sources.some((source) => source.id === activity.id || source.id === plan.id)
  );
  for (const record of preparationRecords) {
    if (record.workflow.kind !== "preparation-list") continue;
    const sourceIds = new Set(
      record.workflow.sources
        .filter((source) => source.id === activity.id || source.id === plan.id)
        .map((source) => source.id),
    );
    const actualItems = record.workflow.items.filter((item) =>
      item.advance === false && item.sourceIds.some((id) => sourceIds.has(id))
    );
    if (!actualItems.length) continue;
    materials.push(...actualItems.map((item) => item.text));
    labels.push("Kayıtlı materyal hazırlık listesi");
    fingerprintSources.push({
      id: record.id,
      updatedAt: record.updatedAt,
      sources: record.workflow.sources.filter((source) => sourceIds.has(source.id)),
      items: actualItems,
    });
  }
  return {
    materials: unique(materials),
    labels: unique(labels),
    fingerprintSources,
  };
}

function planRecommendations(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  civilDate: string,
): Map<string, string[]> {
  const byStudent = new Map<string, string[]>();
  for (const record of teacherFollowups(snapshot)) {
    if (
      record.academicYearId !== scope.academicYearId ||
      record.classroomId !== scope.classroomId ||
      !record.studentId ||
      record.workflow.kind !== "learning-decision" ||
      record.workflow.support !== "small-group" ||
      civilDate < record.workflow.targetWeekStart ||
      civilDate > record.workflow.targetWeekEnd
    ) continue;
    byStudent.set(record.studentId, [...(byStudent.get(record.studentId) ?? []), record.id]);
  }
  return byStudent;
}

function targetForPlan(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  academicYear: StoredRecord,
  plan: StoredRecord,
  today: string,
): SmallGroupDailyTarget | null {
  if (!isCivilDate(plan.civilDate)) return null;
  const linked = snapshot.activities.filter((activity) =>
    activity.planId === plan.id &&
    typeof activity.deletedAt !== "string" &&
    recordBelongsToClassroomScope(activity, scope)
  );
  if (linked.length !== 1) return null;
  const activity = linked[0]!;
  const eligibleStudents = snapshot.students.filter((student) =>
    scopedActiveStudent(student, scope, academicYear, plan.civilDate)
  );
  const eligibleIds = eligibleStudents.map((student) => student.id).sort();
  const names = new Map(eligibleStudents.map((student) => [student.id, cleanText(student.displayName) ?? "Adı belirtilmemiş çocuk"]));
  const planIds = assignedIds(plan);
  const activityIds = assignedIds(activity);
  const source = materialSource(snapshot, scope, plan, activity);
  const recommendations = planRecommendations(snapshot, scope, plan.civilDate);
  const recommendedIds = eligibleIds.filter((id) => recommendations.has(id));
  const observationLocked = snapshot.observations.some((observation) =>
    typeof observation.deletedAt !== "string" &&
    recordBelongsToClassroomScope(observation, scope) &&
    (observation.planId === plan.id || observation.activityId === activity.id)
  );
  const integrity = scheduledPlanIntegrityIssue({ plan, activity, plans: snapshot.plans, scope });
  const curriculumTargets = Array.isArray(activity.curriculumTargets)
    ? activity.curriculumTargets.filter(object)
    : [];
  const targetFieldsValid = curriculumTargets.length > 0 && curriculumTargets.every((target) =>
    typeof target.id === "string" && target.id.length > 0 &&
    typeof target.referenceCode === "string" && target.referenceCode.trim().length > 0
  );
  const blockReason = integrity
    ?? (plan.civilDate < today ? "Geçmiş tarihli günlük planın çocuk grubu değiştirilemez." : null)
    ?? (plan.coverageStatus !== "planned" || activity.status !== "planned" ? "Uygulanmaya başlanmış veya tamamlanmış planın grubu değiştirilemez." : null)
    ?? (observationLocked ? "Gözlem kanıtı bağlı günlük planın çocuk grubu değiştirilemez." : null)
    ?? (!sameIds(planIds, activityIds) ? "Günlük plan ile etkinliğin mevcut çocuk atamaları uyuşmuyor." : null)
    ?? (activity.schemaVersion < 2 || !targetFieldsValid ? "Etkinliğin program hedefi dağıtım kaynağı doğrulanamadı." : null)
    ?? (!eligibleIds.length ? "Bu plan gününde sınıfa kayıtlı çocuk bulunmuyor." : null);
  const sourceFingerprint = canonicalJson({
    scope,
    plan: recordProjection(plan),
    activity: recordProjection(activity),
    eligibleStudents: eligibleStudents.map((student) => ({
      id: student.id,
      displayName: cleanText(student.displayName) ?? "",
      updatedAt: student.updatedAt,
      enrollments: student.enrollments ?? null,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    materialSources: source.fingerprintSources,
  });
  return {
    planId: plan.id,
    activityId: activity.id,
    civilDate: plan.civilDate,
    planTitle: cleanText(plan.title) ?? "Günlük plan",
    activityTitle: cleanText(activity.title) ?? "Etkinlik",
    startTime: cleanText(activity.startTime),
    endTime: cleanText(activity.endTime),
    materials: source.materials,
    materialSourceLabels: source.labels,
    assignmentMode: activity.assignmentMode === "selected-students" ? "selected-students" : "whole-class",
    currentStudentIds: activityIds,
    currentStudentNames: activityIds.map((id) => names.get(id) ?? "Kayıtlı çocuk"),
    eligibleStudentIds: eligibleIds,
    recommendedStudentIds: recommendedIds,
    planUpdatedAt: plan.updatedAt,
    activityUpdatedAt: activity.updatedAt,
    sourceFingerprint,
    available: blockReason === null,
    blockReason,
  };
}

export function smallGroupPlanCard(target: SmallGroupDailyTarget): SmallGroupPlanCard | null {
  if (
    !target.available ||
    target.assignmentMode !== "selected-students" ||
    target.currentStudentIds.length === 0 ||
    target.currentStudentIds.length !== target.currentStudentNames.length
  ) return null;
  return {
    planId: target.planId,
    activityId: target.activityId,
    civilDate: target.civilDate,
    planTitle: target.planTitle,
    activityTitle: target.activityTitle,
    startTime: target.startTime,
    endTime: target.endTime,
    studentIds: [...target.currentStudentIds],
    studentNames: [...target.currentStudentNames],
    materials: [...target.materials],
    materialSourceLabels: [...target.materialSourceLabels],
    planUpdatedAt: target.planUpdatedAt,
    activityUpdatedAt: target.activityUpdatedAt,
    sourceFingerprint: target.sourceFingerprint,
  };
}

export function resolveSmallGroupCardModel(
  snapshot: DataSnapshot,
  input: LoadSmallGroupCardModelInput,
): SmallGroupCardModel {
  if (!isCivilDate(input.civilDate)) throw new Error("Küçük grup kartı günü YYYY-AA-GG biçiminde olmalıdır.");
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Küçük grup kartı için geçerli saat gerekir.");
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Küçük grup kartı için önce etkin sınıfı açın.");
  const academicYear = snapshot.academicYears.find((record) =>
    record.id === scope.academicYearId && typeof record.deletedAt !== "string" && record.status !== "archived"
  );
  const classroom = snapshot.classrooms.find((record) =>
    record.id === scope.classroomId && record.academicYearId === scope.academicYearId && typeof record.deletedAt !== "string"
  );
  if (!academicYear || !classroom) throw new Error("Etkin sınıfın eğitim yılı doğrulanamadı.");
  const today = civilDateInIstanbul(now);
  const bounds = weekBounds(input.civilDate);
  const plans = snapshot.plans.filter((plan) =>
    plan.planType === "daily" &&
    typeof plan.deletedAt !== "string" &&
    recordBelongsToClassroomScope(plan, scope) &&
    typeof plan.civilDate === "string" &&
    plan.civilDate >= bounds.start &&
    plan.civilDate <= bounds.end
  );
  const targets = plans
    .flatMap((plan) => {
      const target = targetForPlan(snapshot, scope, academicYear, plan, today);
      return target ? [target] : [];
    })
    .sort((left, right) =>
      left.civilDate.localeCompare(right.civilDate) ||
      (left.startTime ?? "").localeCompare(right.startTime ?? "") ||
      left.activityTitle.localeCompare(right.activityTitle, "tr-TR") ||
      left.planId.localeCompare(right.planId)
    );
  const studentIds = new Set(targets.flatMap((target) => target.eligibleStudentIds));
  if (!targets.length) {
    for (const student of snapshot.students) {
      if (scopedActiveStudent(student, scope, academicYear, input.civilDate)) studentIds.add(student.id);
    }
  }
  const recommendationSources = new Map<string, string[]>();
  for (const target of targets) {
    const targetRecommendations = planRecommendations(snapshot, scope, target.civilDate);
    for (const [studentId, sourceIds] of targetRecommendations) {
      recommendationSources.set(studentId, unique([...(recommendationSources.get(studentId) ?? []), ...sourceIds]));
    }
  }
  const students = snapshot.students
    .filter((student) => studentIds.has(student.id))
    .map((student): SmallGroupStudentOption => ({
      id: student.id,
      label: cleanText(student.displayName) ?? "Adı belirtilmemiş çocuk",
      recommended: recommendationSources.has(student.id),
      recommendationSourceIds: recommendationSources.get(student.id) ?? [],
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "tr-TR") || left.id.localeCompare(right.id));
  const printableCards = targets.flatMap((target) => {
    const card = smallGroupPlanCard(target);
    return card ? [card] : [];
  });
  const sourceFingerprint = canonicalJson({
    scope,
    civilDate: input.civilDate,
    today,
    weekStart: bounds.start,
    weekEnd: bounds.end,
    targets,
    students,
  });
  return {
    scope,
    civilDate: input.civilDate,
    today,
    weekStart: bounds.start,
    weekEnd: bounds.end,
    schoolName: cleanText(classroom.schoolName) ?? cleanText(academicYear.schoolName) ?? "Okul adı belirtilmedi",
    classroomName: cleanText(classroom.name) ?? "Sınıf",
    academicYearLabel: cleanText(academicYear.name) ?? cleanText(academicYear.label) ?? `${String(academicYear.startDate ?? "")}–${String(academicYear.endDate ?? "")}`,
    students,
    targets,
    printableCards,
    sourceFingerprint,
  };
}

export async function loadSmallGroupCardModel(
  store: LocalDataStore,
  input: LoadSmallGroupCardModelInput,
): Promise<SmallGroupCardModel> {
  return resolveSmallGroupCardModel(await store.readSnapshot(), input);
}
