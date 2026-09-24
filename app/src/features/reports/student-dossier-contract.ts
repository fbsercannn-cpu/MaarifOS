export const DOSSIER_DESTINATIONS = [
  "whatsapp",
  "chatgpt",
  "gemini",
  "file",
] as const;

export type DossierDestination = (typeof DOSSIER_DESTINATIONS)[number];

export const DOSSIER_AUDIENCES = [
  "parent",
  "administration",
  "guidance",
  "teacher",
] as const;

export type DossierAudience = (typeof DOSSIER_AUDIENCES)[number];
export type DossierIdentityMode = "full" | "alias";

export interface DossierPrivacyDefaults {
  identityMode: DossierIdentityMode;
  includeContacts: boolean;
  personalDataApprovedForAi: false;
}

export function isExternalAiDossierDestination(
  destination: DossierDestination,
): destination is "chatgpt" | "gemini" {
  return destination === "chatgpt" || destination === "gemini";
}

export function dossierPrivacyDefaults(
  destination: DossierDestination,
): DossierPrivacyDefaults {
  return isExternalAiDossierDestination(destination)
    ? {
        identityMode: "alias",
        includeContacts: false,
        personalDataApprovedForAi: false,
      }
    : {
        identityMode: "full",
        includeContacts: true,
        personalDataApprovedForAi: false,
      };
}

export interface ExternalAiFeedback {
  id: string;
  provider: "chatgpt" | "gemini" | "other";
  audience: DossierAudience;
  periodStart: string;
  periodEnd: string;
  receivedAt: string;
  feedbackText: string;
  teacherNote?: string;
  includeInTermSummary: boolean;
  includeInYearSummary: boolean;
  linkedExportPackageId?: string;
}
