import { CURRENT_RELEASE } from "../../release.ts";

export const MAARIFOS_CORE_CAPABILITIES = [
  "plan",
  "observation",
  "evaluation",
  "document",
  "backup-restore",
  "classroom-record",
] as const;

export const OUT_OF_SCOPE_CAPABILITIES = [
  "fees",
  "transport-service",
  "live-family-messaging",
  "required-cloud-sync",
  "embedded-generative-ai",
] as const;

export type CoreCapability = typeof MAARIFOS_CORE_CAPABILITIES[number];
export type OutOfScopeCapability = typeof OUT_OF_SCOPE_CAPABILITIES[number];

export interface CapabilityProposal {
  readonly capability: CoreCapability | OutOfScopeCapability | string;
  readonly teacherTask: string;
  readonly repeatedEntryReduction: string;
  readonly requiresCloud: boolean;
  readonly requiresEmbeddedGenerativeAi: boolean;
}

export function assertCapabilityWithinMaarifOsScope(proposal: CapabilityProposal): void {
  if ((OUT_OF_SCOPE_CAPABILITIES as readonly string[]).includes(proposal.capability)) {
    throw new Error(`Önerilen ${proposal.capability} yeteneği öğretmen çalışma çekirdeğinin dışındadır.`);
  }
  if (proposal.requiresCloud || proposal.requiresEmbeddedGenerativeAi) {
    throw new Error("Yerel çalışma buluta veya gömülü üretken yapay zekâya bağımlı hâle getirilemez.");
  }
  if (!proposal.teacherTask.normalize("NFC").trim()) {
    throw new Error("Yeni yetenek için somut öğretmen görevi yazılmalıdır.");
  }
  if (!proposal.repeatedEntryReduction.normalize("NFC").trim()) {
    throw new Error("Yeni yetenek için tekrar giriş azaltımı açıklanmalıdır.");
  }
}

export const CURRENT_SCOPE_DECISION = {
  release: CURRENT_RELEASE.version,
  localFirst: true,
  embeddedGenerativeAi: false,
  requiredCloud: false,
  addedInstitutionModules: [] as readonly string[],
} as const;
