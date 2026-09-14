/**
 * T.C. Hazine ve Maliye Bakanlığı & MaarifOS Standartları
 * Günlük Plan Word (.docx) ve PDF Dışa Aktarma Servisi
 * Mimari: %100 Client-Side, IndexedDB verisinden doğrudan OpenXML (.docx) & PDF üretimi
 */

import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { loadTeacherOwnedPlanGraph } from "./teacher-owned-plan-service.ts";
import {
  generateStandaloneTeacherOwnedPlanExportFile,
  type TeacherOwnedPlanDocumentContext,
} from "./teacher-owned-plan-document.ts";

export interface ExportDailyPlanOptions {
  readonly store: LocalDataStore;
  readonly scope: ActiveClassroomScope;
  readonly planId: string;
  readonly format: "word" | "pdf";
  readonly ageBand?: string | null;
}

export async function exportDailyPlanDocument({
  store,
  scope,
  planId,
  format,
  ageBand,
}: ExportDailyPlanOptions): Promise<{ fileName: string }> {
  const snapshot = await store.readSnapshot();
  const graph = await loadTeacherOwnedPlanGraph(store);
  if (!graph) {
    throw new Error("Henüz kayıtlı plan zinciri bulunamadı.");
  }

  const classroom = snapshot.classrooms.find(
    (c) => c.id === scope.classroomId && c.academicYearId === scope.academicYearId,
  );

  const context: TeacherOwnedPlanDocumentContext = {
    schoolName: typeof classroom?.schoolName === "string" ? classroom.schoolName.trim() : null,
    teacherName: typeof classroom?.teacherName === "string" ? classroom.teacherName.trim() : null,
    classroomName: typeof classroom?.name === "string" ? classroom.name.trim() : null,
    ageGroup: ageBand ? `${ageBand.replace("-", "–")} ay` : null,
    curriculumProgram: "TYMM 2024",
  };

  const file = await generateStandaloneTeacherOwnedPlanExportFile(
    graph,
    store,
    format,
    { kind: "daily", dailyPlanId: planId },
    context,
  );

  downloadBrowserFile(file);
  return { fileName: file.fileName };
}
