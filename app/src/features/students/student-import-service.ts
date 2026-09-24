import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, classroomScopesEqual, recordBelongsToClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { persistStudentRosterChange, type DashboardStudent } from "../dashboard/dashboard-data.ts";
import { candidateProfile, duplicateStudentIds, type ImportCandidate } from "./student-spreadsheet-import.ts";

export interface StudentImportSelection { candidate: ImportCandidate; acknowledgedDuplicateIds: readonly string[]; }

/** One durable transaction: a failed row cannot leave a partially imported class. */
export async function commitStudentImport(store: LocalDataStore, options: {
  scope: ActiveClassroomScope;
  selections: readonly StudentImportSelection[];
  now?: Date;
}): Promise<DashboardStudent[]> {
  const now = options.now ?? new Date(), civilDate = civilDateInIstanbul(now);
  if (!options.selections.length || options.selections.length > 1000) throw new Error("1 ile 1.000 arasında öğrenci seçin.");
  const ids = new Set(options.selections.map(s => s.candidate.id));
  if (ids.size !== options.selections.length) throw new Error("Aynı aktarım satırı birden fazla seçilemez.");
  const normalized = options.selections.map(({ candidate }) => {
    const profile = candidateProfile(candidate, civilDate);
    return { ...profile, id: candidate.id, name: profile.displayName, status: "present" as const, attendanceMarked: false };
  });
  return store.transaction("readwrite", ["academicYears", "classrooms", "settings", "students"], async transaction => {
    const [academicYears, classrooms, settings, students] = await Promise.all([transaction.getAll("academicYears"), transaction.getAll("classrooms"), transaction.getAll("settings"), transaction.getAll("students")]);
    const scope = resolveActiveClassroomScope({ academicYears, classrooms, settings });
    if (!scope || !classroomScopesEqual(scope, options.scope)) throw new Error("Aktif sınıf değişti. Dosyayı bu sınıf için yeniden önizleyin.");
    if (students.some(s => ids.has(s.id))) throw new Error("Bu aktarım zaten kaydedilmiş olabilir. Listeyi yenileyip yeniden kontrol edin.");
    const existing = students.filter(s => recordBelongsToClassroomScope(s, scope)).map(s => ({ id: s.id, name: s.displayName, birthDate: s.birthDate, nationalIdentityNumber: s.nationalIdentityNumber, optionalCode: s.optionalCode }));
    const candidates = options.selections.map(({ candidate }) => ({ id: candidate.id, name: candidate.values.displayName, nationalIdentityNumber: candidate.values.nationalIdentityNumber, optionalCode: candidate.values.optionalCode }));
    for (const selection of options.selections) {
      const duplicateIds = duplicateStudentIds(selection.candidate.values, [...existing, ...candidates], selection.candidate.id);
      if (duplicateIds.some(id => !selection.acknowledgedDuplicateIds.includes(id))) throw new Error(`Satır ${selection.candidate.sourceRow}: yeni mükerrer adayı bulundu. Önizlemeyi yenileyip inceleyin.`);
    }
    // Reuse canonical roster rules and enrollment history inside this same transaction.
    const transactionStore: LocalDataStore = { transaction: (_mode, _collections, task) => task(transaction), readSnapshot: () => { throw new Error("Aktarım içinde anlık görüntü okunamaz."); }, close: () => {} };
    for (const student of normalized) await persistStudentRosterChange(transactionStore, { student, archived: false, now });
    const reviewedDuplicates = options.selections.filter(selection => selection.acknowledgedDuplicateIds.length > 0);
    if (reviewedDuplicates.length) {
      const saved = await transaction.getAll("students");
      await transaction.putMany("students", reviewedDuplicates.map(selection => {
        const record = saved.find(student => student.id === selection.candidate.id);
        if (!record) throw new Error("Aktarım inceleme kaydı yazılamadı; işlem geri alındı.");
        return { ...record, spreadsheetImportReview: {
          sourceRow: selection.candidate.sourceRow,
          reviewedAtUtc: now.toISOString(),
          duplicateCandidateIds: [...selection.acknowledgedDuplicateIds],
          _MUKERRER_INCELE: true as const,
          decision: "distinct-student-confirmed" as const,
        } };
      }));
    }
    return normalized;
  });
}
