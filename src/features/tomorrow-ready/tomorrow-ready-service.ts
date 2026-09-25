import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  saveDayExitPreparation,
  type SaveDayExitPreparationResult,
} from "../day-exit-package/day-exit-package-service.ts";

export interface SaveTomorrowPreparationInput {
  readonly sourceCivilDate: string;
  readonly sourceIds: readonly string[];
  readonly expectedSourceFingerprint: string;
  readonly now?: Date;
}

/**
 * The compact home card writes through the existing day-exit preparation
 * transaction. It creates no parallel readiness record and inherits the same
 * source-version and idempotency guards.
 */
export function saveTomorrowPreparation(
  store: LocalDataStore,
  input: SaveTomorrowPreparationInput,
): Promise<SaveDayExitPreparationResult> {
  return saveDayExitPreparation(store, {
    civilDate: input.sourceCivilDate,
    sourceIds: input.sourceIds,
    expectedSourceFingerprint: input.expectedSourceFingerprint,
    ...(input.now ? { now: input.now } : {}),
  });
}
