import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { recordBelongsToClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type { DataTransaction } from "../../core/repository/contracts.ts";
import { curriculumAgeBandFromLabel } from "../curriculum/curriculum-catalog.ts";
import type { TymmHolisticLearningOutcomeReference } from "../curriculum/tymm-holistic-graph.ts";
import {
  parseDevelopmentObservationSelection,
  resolveDevelopmentObservationProgramMapping,
  type DevelopmentObservationSelection,
} from "./development-observation-presets.ts";
import { resolveLocalTeacherIdentity } from "./local-teacher-identity.ts";
import { isAuthenticSpontaneousObservationActivity } from "./spontaneous-observation-integrity.ts";
import { developmentObservationGraphReference } from "./development-observation-graph-references.ts";

function hasTymmProfile(record: StoredRecord): boolean {
  const profile = record.curriculumProfileSnapshot;
  return typeof profile === "object" && profile !== null && !Array.isArray(profile) &&
    (profile as Record<string, unknown>).framework === "tymm";
}

/** Katalog seçimi eski plan profilini dönüştürmez; TYMM/EÇE sınırı korunur. */
export function assertDevelopmentObservationContext(input: {
  selection: DevelopmentObservationSelection;
  observation: StoredRecord;
  classrooms: readonly StoredRecord[];
  plans: readonly StoredRecord[];
  activities: readonly StoredRecord[];
  validateCurrentAgeBand?: boolean;
}): void {
  const selection = parseDevelopmentObservationSelection(input.selection);
  const { observation } = input;
  if (typeof observation.classroomId !== "string" || typeof observation.academicYearId !== "string") {
    throw new Error("Maarif gelişim gözleminin sınıf ve eğitim yılı kapsamı gerekli.");
  }
  const scope = { classroomId: observation.classroomId, academicYearId: observation.academicYearId };
  const classroom = input.classrooms.find((entry) => entry.id === scope.classroomId &&
    entry.academicYearId === scope.academicYearId);
  const plan = input.plans.find((entry) => entry.id === observation.planId &&
    recordBelongsToClassroomScope(entry, scope));
  const activity = input.activities.find((entry) => entry.id === observation.activityId &&
    entry.planId === plan?.id && recordBelongsToClassroomScope(entry, scope));
  if (!classroom || !plan || !activity || !hasTymmProfile(plan) || !hasTymmProfile(activity)) {
    throw new Error("Maarif gelişim gözlemi yalnız TYMM programındaki aynı sınıfın etkinliğine bağlanabilir.");
  }
  if (input.validateCurrentAgeBand !== false &&
    (typeof classroom.ageGroup !== "string" ||
      curriculumAgeBandFromLabel(classroom.ageGroup) !== selection.ageBand)) {
    throw new Error("Gözlem örneği sınıfın seçili Maarif yaş bandıyla uyuşmuyor.");
  }
  if (plan.planType === "spontaneous-observation" || activity.activityKind === "spontaneous-observation") {
    // Eski kayıtların arşivlenmesi bağın geçmişini geçersiz kılmaz.
    const livePlan = { ...plan, deletedAt: null };
    const liveActivity = { ...activity, deletedAt: null };
    if (!isAuthenticSpontaneousObservationActivity(liveActivity, [livePlan], scope, observation.civilDate)) {
      throw new Error("Maarif gelişim gözleminin anlık plan-etkinlik bağlamı geçersiz.");
    }
  }
}

/** Yedek ve repository aynı canonical hedefi doğrular; planlı hedef uydurulamaz. */
export function isDevelopmentObservationCurriculumLink(link: Record<string, unknown>): boolean {
  try {
    const selection = parseDevelopmentObservationSelection(link.developmentSelection);
    const { target, profile } = resolveDevelopmentObservationProgramMapping(selection.presetId, selection.ageBand);
    return link.plannedTargetId === undefined &&
      link.confirmationMethod === "teacher-confirmed" &&
      link.framework === profile.framework && link.programLabel === profile.programLabel &&
      link.catalogId === profile.catalogId && link.sourceVersion === profile.sourceVersion &&
      link.referenceOrigin === "official-catalog" && link.officialCatalogVerified === true &&
      link.referenceCode === target.referenceCode && link.referenceTitle === target.referenceTitle &&
      link.targetKind === target.kind && link.targetDomain === target.domain &&
      link.targetSourceUrl === target.sourceUrl && link.targetSourcePage === target.sourcePage &&
      link.targetSourceSha256 === target.sourceSha256 &&
      canonicalJson(link.targetSnapshot) === canonicalJson(target) &&
      canonicalJson(link.holisticGraphReference) === canonicalJson(
        developmentObservationGraphReference(selection.ageBand, target.referenceCode),
      );
  } catch {
    return false;
  }
}

type GraphReferenceFactory = (
  ageBand: DevelopmentObservationSelection["ageBand"],
  referenceCode: string,
) => TymmHolisticLearningOutcomeReference | null;

/** Doğrulanmış küçük alt küme; tam grafı yüklemeden transaction öncesinde hazırdır. */
export async function loadDevelopmentObservationGraphFactory(): Promise<GraphReferenceFactory> {
  return developmentObservationGraphReference;
}

/** Çağıranın gözlem transaction'ına katılır; kendi transaction'ını açmaz. */
export async function prepareDevelopmentObservationRecord(
  transaction: DataTransaction,
  input: {
    observation: StoredRecord;
    selection: DevelopmentObservationSelection;
    now: Date;
    graphReferenceFactory: GraphReferenceFactory;
  },
): Promise<StoredRecord> {
  const selection = parseDevelopmentObservationSelection(input.selection);
  const { observation } = input;
  const [classrooms, plans, activities, links] = await Promise.all([
    transaction.getAll("classrooms"),
    transaction.getAll("plans"),
    transaction.getAll("activities"),
    transaction.getAll("evidenceCurriculumLinks"),
  ]);
  assertDevelopmentObservationContext({ selection, observation, classrooms, plans, activities });
  if (links.some((link) => link.observationId === observation.id)) {
    throw new Error("Bu gözlemin program bağı zaten var; yinelenen onay yazılmadı.");
  }
  const { target, profile } = resolveDevelopmentObservationProgramMapping(selection.presetId, selection.ageBand);
  const holisticGraphReference = input.graphReferenceFactory(selection.ageBand, target.referenceCode);
  if (!holisticGraphReference) throw new Error("Gözlemin kaynaklı Maarif grafik referansı bulunamadı.");
  const approvedByUserId = await resolveLocalTeacherIdentity(transaction, { now: input.now });
  const timestamp = input.now.toISOString();
  return {
    id: crypto.randomUUID(),
    observationId: observation.id,
    academicYearId: observation.academicYearId,
    classroomId: observation.classroomId,
    ...profile,
    referenceCode: target.referenceCode,
    referenceTitle: target.referenceTitle,
    confirmationMethod: "teacher-confirmed",
    approvedByUserId,
    confirmedAt: timestamp,
    targetKind: target.kind,
    targetDomain: target.domain,
    targetSourceUrl: target.sourceUrl,
    targetSourcePage: target.sourcePage,
    targetSourceSha256: target.sourceSha256,
    targetSnapshot: target,
    holisticGraphReference: structuredClone(holisticGraphReference),
    developmentSelection: selection,
    createdAt: timestamp,
    updatedAt: timestamp,
    civilDate: observation.civilDate,
    deletedAt: null,
    schemaVersion: 2,
  };
}
