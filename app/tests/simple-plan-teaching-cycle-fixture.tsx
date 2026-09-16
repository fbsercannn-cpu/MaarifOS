import { createRoot } from "react-dom/client";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../src/core/domain/classroom.ts";
import { civilDateInIstanbul } from "../src/core/domain/attendance.ts";
import { createEmptySnapshot, type DataSnapshot } from "../src/core/domain/model.ts";
import type { LocalDataStore } from "../src/core/repository/contracts.ts";
import { SimplePlanWorkspaceScreen } from "../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile/index.ts";

const id = (suffix: number) => `b2000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const now = new Date();
const today = civilDateInIstanbul(now);
const before = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
const scope = { academicYearId: id(1), classroomId: id(2) };
const studentId = id(3);
const planId = id(4);
const activityId = id(5);
const observationId = id(6);
const preferenceId = id(7);
const contactId = id(8);
const base = { createdAt: before(90), updatedAt: before(90), civilDate: today, deletedAt: null, schemaVersion: 1 };
const snapshot = createEmptySnapshot();
snapshot.academicYears.push({ ...base, id: scope.academicYearId, name: "Kurgu Eğitim Yılı", startDate: today, operationalStartDate: today, endDate: "2099-06-30", status: "active" });
snapshot.classrooms.push({ ...base, ...scope, id: scope.classroomId, name: "Kurgu Oyun Sınıfı", ageGroup: "60-72 ay" });
snapshot.students.push({ ...base, ...scope, id: studentId, displayName: "Kurgu Oyun Çocuğu", active: true, contacts: [{ id: contactId, kind: "mother", relationship: "Anne", name: "Kurgu Anne", phone: "" }] });
snapshot.settings.push({ ...base, ...scope, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE });
snapshot.settings.push({
  ...base,
  ...scope,
  id: preferenceId,
  settingType: "family-engagement-v1",
  studentId,
  workflow: {
    kind: "communication-preference",
    contact: { id: contactId, kind: "mother", relationship: "Anne", name: "Kurgu Anne", phone: "" },
    previousEventId: null,
    status: "declared",
    reportedOn: today,
    source: "oral",
    channels: ["phone"],
    availableFrom: null,
    availableUntil: null,
    weekdays: [],
    language: "Türkçe",
    formats: ["text"],
    note: "Kurgu bildirilmiş iletişim tercihi",
  },
});
snapshot.plans.push({ ...base, ...scope, id: planId, planType: "daily", title: "Kurgu yapı oyunu planı", curriculumTargets: [{ id: "planned-social", referenceTitle: "Planlanan sosyal alan" }] });
snapshot.activities.push({ ...base, ...scope, id: activityId, planId, title: "Kurgu yapı oyunu", status: "completed", studentIds: [studentId], updatedAt: before(35) });
snapshot.observations.push({ ...base, ...scope, id: observationId, planId, activityId, studentIds: [studentId], rawText: "Çocuk iki parçayı yan yana getirip yakınına gösterdi.", rawTextImmutable: true, workflowStatus: "captured", observedAt: before(30), updatedAt: before(30) });

class BrowserMemoryStore implements LocalDataStore {
  snapshot: DataSnapshot;
  private queue = Promise.resolve();
  constructor(value: DataSnapshot) { this.snapshot = structuredClone(value); }
  async readSnapshot() { return structuredClone(this.snapshot); }
  transaction<T>(mode: "readonly" | "readwrite", collections: Parameters<LocalDataStore["transaction"]>[1], task: Parameters<LocalDataStore["transaction"]>[2]): Promise<T> {
    const run = async () => {
      const working = structuredClone(this.snapshot);
      const allowed = new Set(collections);
      const result = await task({
        getAll: async (collection) => {
          if (!allowed.has(collection)) throw new Error("Kurgu koleksiyon kapsamı geçersiz.");
          return structuredClone(working[collection]) as never;
        },
        putMany: async (collection, records) => {
          if (mode !== "readwrite" || !allowed.has(collection)) throw new Error("Kurgu yazma kapsamı geçersiz.");
          const rows = working[collection];
          for (const record of records) {
            const index = rows.findIndex((candidate) => candidate.id === record.id);
            if (index < 0) rows.push(structuredClone(record));
            else rows[index] = structuredClone(record);
          }
        },
        clear: async (collection) => {
          if (mode !== "readwrite" || !allowed.has(collection)) throw new Error("Kurgu silme kapsamı geçersiz.");
          working[collection] = [];
        },
      });
      if (mode === "readwrite") this.snapshot = working;
      return structuredClone(result) as T;
    };
    const pending = this.queue.then(run, run);
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }
  close() {}
}

const store = new BrowserMemoryStore(snapshot);
Object.assign(window, {
  __readSimplePlanTeachingFixture: () => store.readSnapshot(),
  __simplePlanTeachingIds: { studentId, planId, activityId, observationId, preferenceId, contactId },
});

createRoot(document.getElementById("root")!).render(
  <MobileDeviceProvider native>
    <KeyboardProvider native>
      <SimplePlanWorkspaceScreen
        store={store}
        refreshKey="fixture"
        workspace={{
          status: "ready",
          civilDate: today,
          annual: null,
          monthly: null,
          weekly: null,
          daily: { status: "ready", planId, conflictingPlanIds: [], title: "Kurgu günlük plan", activityCount: 1, completedActivityCount: 1, observationCount: 1 },
          documents: { anecdoteIncompleteCount: 0, anecdoteReviewRequiredCount: 0, anecdoteReadyCount: 0, monthlyEvaluationCount: 0, planDocumentReady: true },
          pendingCurriculumLinkCount: 0,
        }}
        educationalWritesDisabled={false}
        dataBusy={false}
        ageBand="60-72"
        civilDate={today}
        onOpenLevel={() => {}}
        onOpenCalendar={() => {}}
        onOpenDocuments={() => {}}
        onOpenActivityStudio={() => {}}
        onOpenBuiltInMaarifLibrary={() => {}}
        onOpenAgeBandSetup={() => {}}
      />
    </KeyboardProvider>
  </MobileDeviceProvider>,
);
