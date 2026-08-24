export const CAPABILITY_IDS = Object.freeze([
  "today",
  "classroom",
  "capture",
  "planningHub",
  "recordsHub",
  "attendanceV2",
  "localBackupRestore",
  "appLock",
  "googleAuth",
  "curriculumCatalogBrowser",
  "planEvidenceDetails",
  "premiumPlanCenter",
  "portfolio",
  "aiFeedback",
  "documentCenter",
  "generalMedia",
  "pdfReports",
  "notifications",
  "cloudSync",
  "calendarNotes",
] as const);

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export type AlphaCapabilityRegistry = Readonly<
  Record<CapabilityId, boolean>
>;

export const ALPHA_CAPABILITIES = Object.freeze({
  today: true,
  classroom: true,
  capture: true,
  planningHub: true,
  recordsHub: true,
  attendanceV2: true,
  localBackupRestore: true,
  appLock: true,
  googleAuth: false,
  curriculumCatalogBrowser: false,
  planEvidenceDetails: true,
  premiumPlanCenter: false,
  portfolio: false,
  aiFeedback: false,
  documentCenter: false,
  generalMedia: false,
  pdfReports: false,
  notifications: false,
  cloudSync: false,
  calendarNotes: true,
} as const) satisfies AlphaCapabilityRegistry;

export function isCapabilityEnabled(capability: CapabilityId): boolean {
  return ALPHA_CAPABILITIES[capability];
}

export type AlphaPrimaryNavigationId =
  | "today"
  | "classroom"
  | "capture"
  | "plans"
  | "documents";

export interface AlphaPrimaryNavigationItem {
  readonly id: AlphaPrimaryNavigationId;
  readonly label: "Bugün" | "Sınıfım" | "Etkinlikler" | "Planlar" | "Çıktılar";
  readonly capability: "today" | "classroom" | "capture" | "planningHub" | "recordsHub";
}

const ALPHA_PRIMARY_NAVIGATION: readonly AlphaPrimaryNavigationItem[] =
  Object.freeze([
    Object.freeze({ id: "today", label: "Bugün", capability: "today" }),
    Object.freeze({
      id: "classroom",
      label: "Sınıfım",
      capability: "classroom",
    }),
    Object.freeze({ id: "capture", label: "Etkinlikler", capability: "capture" }),
    Object.freeze({ id: "plans", label: "Planlar", capability: "planningHub" }),
    Object.freeze({
      id: "documents",
      label: "Çıktılar",
      capability: "recordsHub",
    }),
  ]);

export function visiblePrimaryNavigation(): readonly AlphaPrimaryNavigationItem[] {
  return ALPHA_PRIMARY_NAVIGATION;
}
