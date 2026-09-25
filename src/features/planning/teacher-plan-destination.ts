import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import type { DocumentWorkspaceItemId } from "../documents/document-workspace-model.ts";
import type { PlanWorkbenchLevelId } from "./plan-workbench-model.ts";

export type TeacherPlanDestination =
  | "teacher-records"
  | "daily-workspace"
  | "daily-conflict-review"
  | "premium-library";

/**
 * Öğretmenin cihazında zaten bulunan plan kayıtları lisans keşif akışından
 * bağımsızdır. Premium kütüphane yalnız yeni sağlayıcı içeriği gerektiğinde
 * açılır; entitlement bu karara hiçbir zaman girdi değildir.
 */
export function destinationForPlanLevel(
  levelId: PlanWorkbenchLevelId,
  workspace: TeacherWorkCycleWorkspace,
): TeacherPlanDestination {
  if (levelId === "daily") {
    const daily = workspace.daily as TeacherWorkCycleWorkspace["daily"] & {
      status?: string;
    };
    return daily.status === "conflict"
      ? "daily-conflict-review"
      : "daily-workspace";
  }
  return "teacher-records";
}

export function destinationForPlanDocument(
  itemId: DocumentWorkspaceItemId,
  workspace: TeacherWorkCycleWorkspace,
): TeacherPlanDestination | null {
  if (itemId === "plans") {
    return "teacher-records";
  }
  if (itemId === "monthly") {
    return "teacher-records";
  }
  return null;
}
