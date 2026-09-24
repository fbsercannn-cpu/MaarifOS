import { isCivilDate } from "../domain/attendance.ts";
import type { LocalDataStore } from "../repository/contracts.ts";

function isUtcIso(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

/**
 * Erken prototipte resmî dönem başlangıcı doğrudan startDate alanına çekildi.
 * Bu tek seferlik migrasyon resmî/veri başlangıcını geri kurar ve öğretmenin
 * açık çalışma kararını ayrı operationalStartDate alanına taşır.
 */
export async function migrateLegacyAcademicYearOperationalStart(
  store: LocalDataStore,
  options: { now?: Date } = {},
): Promise<void> {
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Eğitim yılı operasyon migrasyonu için geçerli zaman gerekli.");
  }
  await store.transaction("readwrite", ["academicYears"], async (transaction) => {
    const academicYears = await transaction.getAll("academicYears");
    const changed = academicYears.flatMap((record) => {
      const legacyDataStart = record.officialStartDate;
      const legacyOperationalStartedAt = record.activatedEarlyAt;
      if (
        !isCivilDate(record.startDate) ||
        !isCivilDate(record.endDate) ||
        !isCivilDate(legacyDataStart) ||
        !isUtcIso(legacyOperationalStartedAt) ||
        record.startDate > legacyDataStart ||
        legacyDataStart > record.endDate
      ) {
        return [];
      }
      const {
        officialStartDate: _officialStartDate,
        activatedEarlyAt: _activatedEarlyAt,
        ...preserved
      } = record;
      return [
        {
          ...preserved,
          startDate: legacyDataStart,
          operationalStartDate:
            typeof record.operationalStartDate === "string"
              ? record.operationalStartDate
              : record.startDate,
          operationalStartedAt:
            typeof record.operationalStartedAt === "string"
              ? record.operationalStartedAt
              : legacyOperationalStartedAt,
          updatedAt: now.toISOString(),
        },
      ];
    });
    if (changed.length > 0) {
      await transaction.putMany("academicYears", changed);
    }
  });
}
