import React from "react";
import { createRoot } from "react-dom/client";

import { defaultTeacherOwnedDailyFlowBlockDrafts } from "../src/core/domain/teacher-owned-daily-flow.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../src/features/evidence/evidence-flow.ts";
import { PlanCreationScreen } from "../src/features/planning/PlanCreationFlow.tsx";
import type { TeacherOwnedDailyFlowCopySource } from "../src/features/planning/scheduled-plan-workspace.ts";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile/index.ts";
import "../src/prototype.css";

const baseBlocks = defaultTeacherOwnedDailyFlowBlockDrafts(240);
const copySources: TeacherOwnedDailyFlowCopySource[] = [
  {
    planId: "30000000-0000-4000-8000-000000000009",
    weeklyPlanId: "30000000-0000-4000-8000-000000000001",
    civilDate: "2026-09-09",
    planTitle: "Doğa keşfi günlük planı",
    flowRevisionNumber: 2,
    activityBlockKind: "teacher-activity-one",
    blocks: baseBlocks.map((block, index) => ({
      ...block,
      title: index === 3 ? "Bahçede doku keşfi" : block.title,
      teacherNote: index === 3 ? "Dokunmak istemeyen çocuk için gözlem seçeneği sun." : "",
    })),
  },
  {
    planId: "30000000-0000-4000-8000-000000000008",
    weeklyPlanId: "30000000-0000-4000-8000-000000000001",
    civilDate: "2026-09-08",
    planTitle: "Sınıf ritmi günlük planı",
    flowRevisionNumber: 1,
    activityBlockKind: "teacher-activity-two",
    blocks: baseBlocks.map((block, index) => ({
      ...block,
      title: index === 6 ? "Birlikte ritim kuruyoruz" : block.title,
      transitionNote: index === 6 ? "Çemberden küçük gruplara yumuşak geçiş." : "",
    })),
  },
];

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MobileDeviceProvider native>
      <KeyboardProvider>
        <main className="prototype-shell" style={{ minHeight: "100vh" }}>
          <PlanCreationScreen
        civilDate="2026-09-10"
        defaultStartTime="08:30"
        defaultEndTime="12:30"
        ageGroup="60–72 ay"
        curriculumProfile={{
          framework: "tymm",
          programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
          catalogId: "meb-tymm-okul-oncesi-2024-learning-outcomes",
          sourceVersion: "2024.09.02",
          referenceOrigin: "official-catalog",
          officialCatalogVerified: true,
        }}
        students={[{
          id: "20000000-0000-4000-8000-000000000001",
          name: "Kurgu Ada",
          status: "present",
          attendanceMarked: true,
        }]}
        onCreate={async () => undefined}
        teacherOwnedDailyFlowContext={{
          schedule: {
            kind: "morning",
            startTime: "08:30",
            endTime: "12:30",
            timeZone: "Europe/Istanbul",
          },
          weeklyPlanId: "30000000-0000-4000-8000-000000000001",
          allowedDateStart: "2026-09-07",
          allowedDateEnd: "2026-09-11",
          copySources,
        }}
          />
        </main>
      </KeyboardProvider>
    </MobileDeviceProvider>
  </React.StrictMode>,
);
