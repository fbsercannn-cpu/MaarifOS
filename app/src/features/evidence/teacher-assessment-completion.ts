import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { recordBelongsToClassroomScope, resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveLocalTeacherIdentity } from "./local-teacher-identity.ts";

export function preparedTeacherAssessments(snapshot: DataSnapshot, studentId?: string, observationId?: string) {
  const scope = resolveActiveClassroomScope(snapshot);
  return !scope ? [] : snapshot.reportDrafts.filter(record => !record.deletedAt && recordBelongsToClassroomScope(record, scope) && record.reportType === "evidence-assessment" && record.authoredBy === "teacher" && record.status === "teacher-review-required" && record.reviewStatus === "pending" && (!studentId || (Array.isArray(record.studentIds) && record.studentIds.includes(studentId))) && (!observationId || (Array.isArray(record.observationIds) && record.observationIds.includes(observationId))));
}

export async function completeTeacherAssessments(store: LocalDataStore, input: { snapshot: DataSnapshot; ids: string[]; now?: Date }) {
  if (!input.ids.length || new Set(input.ids).size !== input.ids.length) throw new Error("Tamamlanacak değerlendirmeleri seçin.");
  const now = input.now ?? new Date();
  return store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const current = createEmptySnapshot();
    for (const name of COLLECTION_NAMES) current[name] = await tx.getAll(name);
    if (canonicalJson(current) !== canonicalJson(input.snapshot)) throw new Error("Değerlendirmelerin kaynakları değişti. Güncel metni seçerek yeniden tamamlayın.");
    const available = preparedTeacherAssessments(current);
    if (input.ids.some(id => !available.some(record => record.id === id))) throw new Error("Seçili değerlendirme artık bu işlem için uygun değil.");
    const authorId = await resolveLocalTeacherIdentity(tx, { now });
    current.settings = await tx.getAll("settings");
    const updates = available.filter(record => input.ids.includes(record.id)).map(record => {
      const timestamp = new Date(Math.max(now.getTime(), Date.parse(record.updatedAt) + 1)).toISOString();
      return { ...record, status: "teacher-saved", teacherReviewRequired: false, reviewStatus: "teacher-saved", reviewedByUserId: authorId, reviewedAt: timestamp, updatedAt: timestamp };
    });
    current.reportDrafts = current.reportDrafts.map(record => updates.find(update => update.id === record.id) ?? record);
    assertDataSnapshotRelationships(current, civilDateInIstanbul(now));
    await tx.putMany("reportDrafts", updates);
    return { alreadyCompleted: false };
  });
}
