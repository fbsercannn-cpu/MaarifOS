import type {
  TeacherFeedbackCode,
  TeacherFeedbackSeverity,
} from "../feedback/teacher-feedback.ts";

export const PLAN_INTEGRITY_FINDING_CODES = [
  "plan.integrity.activity-date",
  "plan.integrity.teacher-flow-shape",
  "plan.integrity.teacher-source-chain",
  "plan.integrity.teacher-activity-source",
  "plan.integrity.teacher-flow-block",
  "plan.integrity.premium-flow-shape",
  "plan.integrity.premium-source-missing",
  "plan.integrity.premium-source-chain",
  "plan.integrity.premium-activity-id",
  "plan.integrity.premium-activity-snapshot",
  "plan.integrity.premium-activity-source",
] as const satisfies readonly TeacherFeedbackCode[];

export const PLAN_EDIT_BLOCK_FINDING_CODES = [
  "plan.edit.activity-count",
  "plan.edit.past-or-today",
  "plan.edit.status-locked",
  "plan.edit.evidence-locked",
] as const satisfies readonly TeacherFeedbackCode[];

export type PlanIntegrityFindingCode =
  (typeof PLAN_INTEGRITY_FINDING_CODES)[number];
export type PlanEditBlockFindingCode =
  (typeof PLAN_EDIT_BLOCK_FINDING_CODES)[number];
export type PlanRelationFindingCode =
  | PlanIntegrityFindingCode
  | PlanEditBlockFindingCode;

export type PlanRelationRepairActionId =
  | "share-support-code"
  | "review-linked-activities"
  | "create-plan-revision";

export interface PlanRelationRepairAction {
  id: PlanRelationRepairActionId;
  label: string;
}

export interface PlanRelationFinding {
  code: PlanRelationFindingCode;
  severity: TeacherFeedbackSeverity;
  message: string;
  supportCode: string;
  repairAction: Readonly<PlanRelationRepairAction>;
}

export type PlanIntegrityFinding = Omit<PlanRelationFinding, "code"> & {
  code: PlanIntegrityFindingCode;
};

export type PlanEditBlockFinding = Omit<PlanRelationFinding, "code"> & {
  code: PlanEditBlockFindingCode;
};

const SHARE_SUPPORT_CODE = Object.freeze({
  id: "share-support-code",
  label: "Destek kodunu ürün sahibine ilet",
} as const satisfies PlanRelationRepairAction);

const REVIEW_LINKED_ACTIVITIES = Object.freeze({
  id: "review-linked-activities",
  label: "Bağlı etkinlikleri incele",
} as const satisfies PlanRelationRepairAction);

const CREATE_PLAN_REVISION = Object.freeze({
  id: "create-plan-revision",
  label: "Yeni plan veya revizyon oluştur",
} as const satisfies PlanRelationRepairAction);

type PlanRelationFindingDefinition = Omit<PlanRelationFinding, "code">;

const PLAN_RELATION_FINDING_DEFINITIONS = Object.freeze({
  "plan.integrity.activity-date": Object.freeze({
    severity: "error",
    message: "Plan ile gerçek etkinliğin kayıtlı tarihleri uyuşmuyor.",
    supportCode: "PLAN-INTEGRITY-101",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.teacher-flow-shape": Object.freeze({
    severity: "error",
    message: "Öğretmenin 10 bölümlü günlük akış kaydı doğrulanamadı.",
    supportCode: "PLAN-INTEGRITY-102",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.teacher-source-chain": Object.freeze({
    severity: "error",
    message: "Öğretmenin günlük akışının yıl, ay ve hafta kaynak zinciri doğrulanamadı.",
    supportCode: "PLAN-INTEGRITY-103",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.teacher-activity-source": Object.freeze({
    severity: "error",
    message: "Öğretmen planı ile etkinliği arasındaki kaynak zinciri uyuşmuyor.",
    supportCode: "PLAN-INTEGRITY-104",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.teacher-flow-block": Object.freeze({
    severity: "error",
    message: "Gerçek etkinliğin öğretmen akışı bölüm bağlantısı doğrulanamadı.",
    supportCode: "PLAN-INTEGRITY-105",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-flow-shape": Object.freeze({
    severity: "error",
    message: "Kayıtlı tam gün akışının tarih veya 10 blok bütünlüğü doğrulanamadı.",
    supportCode: "PLAN-INTEGRITY-106",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-source-missing": Object.freeze({
    severity: "error",
    message: "Kayıtlı planın yıllık, aylık veya haftalık kaynak zinciri eksik.",
    supportCode: "PLAN-INTEGRITY-107",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-source-chain": Object.freeze({
    severity: "error",
    message: "Kayıtlı planın kaynak hafta veya içerik paketi zinciri değişmiş.",
    supportCode: "PLAN-INTEGRITY-108",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-activity-id": Object.freeze({
    severity: "error",
    message: "Kayıtlı planın kaynak etkinlik kimliği eksik.",
    supportCode: "PLAN-INTEGRITY-109",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-activity-snapshot": Object.freeze({
    severity: "error",
    message: "Kayıtlı planın etkinlik kaynak görüntüsü doğrulanamadı.",
    supportCode: "PLAN-INTEGRITY-110",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.integrity.premium-activity-source": Object.freeze({
    severity: "error",
    message: "Plan ile etkinlik arasındaki premium kaynak zinciri uyuşmuyor.",
    supportCode: "PLAN-INTEGRITY-111",
    repairAction: SHARE_SUPPORT_CODE,
  }),
  "plan.edit.activity-count": Object.freeze({
    severity: "warning",
    message: "Düzenleme için günlük plana bağlı tek bir gerçek etkinlik bulunmalıdır.",
    supportCode: "PLAN-EDIT-101",
    repairAction: REVIEW_LINKED_ACTIVITIES,
  }),
  "plan.edit.past-or-today": Object.freeze({
    severity: "warning",
    message: "Yalnız henüz başlamamış gelecek tarihli planlar düzenlenebilir.",
    supportCode: "PLAN-EDIT-102",
    repairAction: CREATE_PLAN_REVISION,
  }),
  "plan.edit.status-locked": Object.freeze({
    severity: "warning",
    message: "Başlamış veya tamamlanmış planlar düzenlenemez.",
    supportCode: "PLAN-EDIT-103",
    repairAction: CREATE_PLAN_REVISION,
  }),
  "plan.edit.evidence-locked": Object.freeze({
    severity: "warning",
    message: "Gözlem kanıtı bulunan planlar geriye dönük değiştirilemez.",
    supportCode: "PLAN-EDIT-104",
    repairAction: CREATE_PLAN_REVISION,
  }),
} satisfies Record<PlanRelationFindingCode, PlanRelationFindingDefinition>);

/** Kararlı ilişki kodunu tek bir öğretmen mesajı ve onarım yönlendirmesine bağlar. */
export function planRelationFinding<Code extends PlanRelationFindingCode>(
  code: Code,
): Readonly<Omit<PlanRelationFinding, "code"> & { code: Code }> {
  return Object.freeze({
    code,
    ...PLAN_RELATION_FINDING_DEFINITIONS[code],
  });
}
