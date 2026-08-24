import { expect, test } from "@playwright/test";
import {
  ALPHA_CAPABILITIES,
  CAPABILITY_IDS,
  isCapabilityEnabled,
  visiblePrimaryNavigation,
} from "../src/core";

test("Hediye Alpha yalnız doğrulanmış çekirdek kabiliyetleri açar", () => {
  expect(ALPHA_CAPABILITIES).toEqual({
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
  });

  expect(isCapabilityEnabled("attendanceV2")).toBe(true);
  expect(isCapabilityEnabled("planEvidenceDetails")).toBe(true);
  expect(isCapabilityEnabled("calendarNotes")).toBe(true);
  expect(isCapabilityEnabled("portfolio")).toBe(false);
  expect(Object.keys(ALPHA_CAPABILITIES)).toEqual(CAPABILITY_IDS);
});

test("Alpha kabiliyet kayıt defteri çalışma zamanında değiştirilemez", () => {
  expect(Object.isFrozen(ALPHA_CAPABILITIES)).toBe(true);

  expect(
    Reflect.set(ALPHA_CAPABILITIES, "googleAuth", true),
  ).toBe(false);
  expect(isCapabilityEnabled("googleAuth")).toBe(false);
});

test("Alpha ana navigasyonu öğretmenin beş kalıcı iş alanını gösterir", () => {
  const navigation = visiblePrimaryNavigation();

  expect(navigation).toEqual([
    { id: "today", label: "Bugün", capability: "today" },
    { id: "classroom", label: "Sınıfım", capability: "classroom" },
    { id: "capture", label: "Etkinlikler", capability: "capture" },
    { id: "plans", label: "Planlar", capability: "planningHub" },
    { id: "documents", label: "Çıktılar", capability: "recordsHub" },
  ]);
  expect(navigation.every(({ capability }) => isCapabilityEnabled(capability))).toBe(
    true,
  );
  expect(Object.isFrozen(navigation)).toBe(true);
  expect(navigation.every((item) => Object.isFrozen(item))).toBe(true);
});
