import type {
  EvidenceObservationSummary,
  EvidenceWorkspace,
} from "./evidence-workspace.ts";

export type ObservationCommitRefreshResult =
  | {
      status: "verified";
      workspace: EvidenceWorkspace;
      observations: EvidenceObservationSummary[];
    }
  | {
      status: "refresh-required";
      reason: "read-failed" | "committed-record-missing";
      committedObservationIds: string[];
    };

/**
 * A committed observation is already authoritative. A projection refresh is a
 * separate read concern and must never turn that successful write into a save
 * error that invites a duplicate retry.
 */
export async function verifyCommittedObservationRefresh(
  committedObservationIds: readonly string[],
  loadWorkspace: () => Promise<EvidenceWorkspace>,
): Promise<ObservationCommitRefreshResult> {
  const uniqueIds = [...new Set(committedObservationIds)];
  if (uniqueIds.length === 0 || uniqueIds.some((id) => !id.trim())) {
    throw new Error("Doğrulanacak gözlem kimliği bulunamadı.");
  }

  let workspace: EvidenceWorkspace;
  try {
    workspace = await loadWorkspace();
  } catch {
    return {
      status: "refresh-required",
      reason: "read-failed",
      committedObservationIds: uniqueIds,
    };
  }

  const observationsById = new Map(
    [...workspace.pendingObservations, ...workspace.linkedObservations].map(
      (observation) => [observation.id, observation],
    ),
  );
  const observations = uniqueIds
    .map((id) => observationsById.get(id))
    .filter(
      (observation): observation is EvidenceObservationSummary =>
        observation !== undefined,
    );
  if (observations.length !== uniqueIds.length) {
    return {
      status: "refresh-required",
      reason: "committed-record-missing",
      committedObservationIds: uniqueIds,
    };
  }

  return { status: "verified", workspace, observations };
}
