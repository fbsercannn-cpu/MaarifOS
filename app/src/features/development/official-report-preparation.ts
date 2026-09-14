import type { DataSnapshot } from "../../core/domain/model.ts";
import type {
  DevelopmentReportEvidenceSnapshot,
  DevelopmentReportScope,
} from "./development-report-model.ts";
import { buildDevelopmentReportWorkspace } from "./development-report-sources.ts";

export const OFFICIAL_REPORT_PREPARATION_NOTICE =
  "Bu görünüm Ek 4 ve e-Okul için öğretmen hazırlığıdır. Otomatik beceri edinimi, puan, resmî rapor veya e-Okul aktarımı oluşturmaz." as const;

export interface OfficialReportPreparationEvidence {
  readonly observationId: string;
  readonly civilDate: string;
  readonly activityTitle: string;
  readonly rawText: string;
  readonly sourceUpdatedAt: string;
  readonly sourceAnchor: string;
  readonly confirmedProgramLinkCount: number;
}

export interface OfficialReportPreparationProgramField {
  readonly domain: string;
  readonly references: readonly {
    observationId: string;
    targetId: string;
    referenceCode: string;
    referenceTitle: string;
    sourceUrl: string;
    sourcePage?: number;
  }[];
}

export interface OfficialReportPreparationView {
  readonly kind: "teacher-preparation";
  readonly destination: "Ek 4 / e-Okul";
  readonly status: "evidence-selection-required" | "ready-for-teacher-review";
  readonly notice: typeof OFFICIAL_REPORT_PREPARATION_NOTICE;
  readonly child: { readonly id: string; readonly displayName: string };
  readonly academicYear: { readonly id: string; readonly name: string };
  readonly classroom: { readonly id: string; readonly name: string };
  readonly period: { readonly start: string; readonly end: string };
  readonly selectedObservationIds: readonly string[];
  readonly evidence: readonly OfficialReportPreparationEvidence[];
  readonly programFields: readonly OfficialReportPreparationProgramField[];
  readonly evidenceWithoutConfirmedProgramLinkCount: number;
  readonly claims: {
    readonly automaticSkillAcquisition: false;
    readonly childScore: false;
    readonly officialReportCreated: false;
    readonly eOkulTransferPerformed: false;
  };
}

function sourceAnchor(observationId: string): string {
  return `development-observation-${observationId}`;
}

function selectedEvidence(
  available: readonly DevelopmentReportEvidenceSnapshot[],
  selectedObservationIds: readonly string[],
): DevelopmentReportEvidenceSnapshot[] {
  if (new Set(selectedObservationIds).size !== selectedObservationIds.length) {
    throw new Error("Ek 4 hazırlığında aynı gözlem birden çok kez seçilemez.");
  }
  return selectedObservationIds.map((observationId) => {
    const evidence = available.find((candidate) => candidate.observationId === observationId);
    if (!evidence) {
      throw new Error("Ek 4 hazırlığı başka çocuk, sınıf, yıl veya dönem gözlemi içeremez.");
    }
    return evidence;
  });
}

export function buildOfficialReportPreparation(
  snapshot: DataSnapshot,
  scope: DevelopmentReportScope,
  selectedObservationIds: readonly string[],
): OfficialReportPreparationView {
  const workspace = buildDevelopmentReportWorkspace(snapshot, scope);
  const selected = selectedEvidence(workspace.availableEvidence, selectedObservationIds);
  const programFields = new Map<string, OfficialReportPreparationProgramField["references"][number][]>();
  for (const evidence of selected) {
    for (const target of evidence.confirmedTargets) {
      const rows = programFields.get(target.domain) ?? [];
      rows.push({
        observationId: evidence.observationId,
        targetId: target.id,
        referenceCode: target.referenceCode,
        referenceTitle: target.referenceTitle,
        sourceUrl: target.sourceUrl,
        ...(target.sourcePage === undefined ? {} : { sourcePage: target.sourcePage }),
      });
      programFields.set(target.domain, rows);
    }
  }
  return {
    kind: "teacher-preparation",
    destination: "Ek 4 / e-Okul",
    status: selected.length ? "ready-for-teacher-review" : "evidence-selection-required",
    notice: OFFICIAL_REPORT_PREPARATION_NOTICE,
    child: { id: scope.studentId, displayName: workspace.studentSnapshot.displayName },
    academicYear: { id: scope.academicYearId, name: workspace.scopeSnapshot.academicYearName },
    classroom: { id: scope.classroomId, name: workspace.scopeSnapshot.classroomName },
    period: { start: scope.periodStart, end: scope.periodEnd },
    selectedObservationIds: [...selectedObservationIds],
    evidence: selected.map((entry) => ({
      observationId: entry.observationId,
      civilDate: entry.civilDate,
      activityTitle: entry.contextSnapshot.activityTitle,
      rawText: entry.rawText,
      sourceUpdatedAt: entry.sourceUpdatedAt,
      sourceAnchor: sourceAnchor(entry.observationId),
      confirmedProgramLinkCount: entry.confirmedTargets.length,
    })),
    programFields: [...programFields.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "tr-TR"))
      .map(([domain, references]) => ({ domain, references })),
    evidenceWithoutConfirmedProgramLinkCount: selected.filter((entry) => entry.confirmedTargets.length === 0).length,
    claims: {
      automaticSkillAcquisition: false,
      childScore: false,
      officialReportCreated: false,
      eOkulTransferPerformed: false,
    },
  };
}
