import { isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { buildGrowthWorkspace } from "./growth-model.ts";

export interface GrowthReminder {
  readonly id: string;
  readonly title: string;
  readonly dueOn: string;
  readonly studentId?: string;
}

/** At most one calm class reminder; future periods never become overdue work. */
export function growthReminders(
  snapshot: DataSnapshot,
  today: string,
): GrowthReminder[] {
  if (!isCivilDate(today) || !resolveActiveClassroomScope(snapshot)) return [];
  const workspace = buildGrowthWorkspace(snapshot, today);
  const latestDuePeriod = workspace.periods
    .filter((period) => period.windowStart <= today)
    .sort((left, right) => right.windowStart.localeCompare(left.windowStart))
    .find((period) => workspace.states.some((state) =>
      state.period.key === period.key &&
      state.membership === "included" &&
      (!state.height.selected || !state.weight.selected)));
  if (!latestDuePeriod) return [];
  const missing = workspace.states.filter((state) =>
    state.period.key === latestDuePeriod.key &&
    state.membership === "included" &&
    (!state.height.selected || !state.weight.selected));
  const heightMissing = missing.filter((state) => !state.height.selected).length;
  const weightMissing = missing.filter((state) => !state.weight.selected).length;
  return [{
    id: `growth:${workspace.scope.academicYearId}:${workspace.scope.classroomId}:${latestDuePeriod.key}`,
    title: `${latestDuePeriod.label} boy–kilo: ${missing.length.toLocaleString("tr-TR")} çocukta eksik · boy ${heightMissing.toLocaleString("tr-TR")}, kilo ${weightMissing.toLocaleString("tr-TR")}`,
    dueOn: latestDuePeriod.windowEnd,
    ...(missing.length === 1 ? { studentId: missing[0]!.student.id } : {}),
  }];
}
