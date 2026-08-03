import type {
  CollectionName,
  DataSnapshot,
  StoredRecord,
} from "../domain/model";
import type { BackupEnvelope } from "../backup/schema";
import type {
  AttendanceRecord,
} from "../domain/attendance";
import type {
  EntityMap,
  ObservationRecord,
  StudentRecord,
} from "./entities";

export type TransactionMode = "readonly" | "readwrite";

export interface DataTransaction {
  getAll<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<EntityMap[Collection][]>;
  putMany<Collection extends CollectionName>(
    collection: Collection,
    records: readonly EntityMap[Collection][],
  ): Promise<void>;
  /** Dinamik koleksiyon kullanan migration/restore akışları için eski sözleşme. */
  putMany(
    collection: CollectionName,
    records: readonly StoredRecord[],
  ): Promise<void>;
  clear<Collection extends CollectionName>(collection: Collection): Promise<void>;
}

export interface LocalDataStore {
  transaction<T>(
    mode: TransactionMode,
    collections: readonly CollectionName[],
    task: (transaction: DataTransaction) => Promise<T>,
  ): Promise<T>;
  readSnapshot(): Promise<DataSnapshot>;
  close(): void;
}

export const RECOVERY_SNAPSHOT_REASONS = [
  "before-restore",
  "before-migration",
  "manual",
] as const;

export type RecoverySnapshotReason =
  (typeof RECOVERY_SNAPSHOT_REASONS)[number];

export interface RecoverySnapshotRecord {
  id: string;
  createdAt: string;
  reason: RecoverySnapshotReason;
  checksumAlgorithm: "SHA-256";
  snapshotChecksum: string;
  envelope: BackupEnvelope;
}

export interface RecoverySnapshotMetadata {
  id: string;
  createdAt: string;
  reason: RecoverySnapshotReason;
  snapshotChecksum: string;
  entityCount: number;
}

export interface RecoverySnapshotRepository {
  saveRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
    options?: { retentionLimit?: number },
  ): Promise<RecoverySnapshotMetadata>;
  listRecoverySnapshots(): Promise<RecoverySnapshotMetadata[]>;
  getRecoverySnapshot(id: string): Promise<RecoverySnapshotRecord | null>;
  deleteRecoverySnapshot(id: string): Promise<void>;
  deleteRecoverySnapshotsContainingStudent(studentId: string): Promise<number>;
}

export interface ClassroomDataQueryRepository {
  listStudentsByClassroom(classroomId: string): Promise<StudentRecord[]>;
  listAttendanceByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<AttendanceRecord[]>;
  listAttendanceByStudentDate(
    studentId: string,
    civilDate: string,
  ): Promise<AttendanceRecord[]>;
  listObservationsByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<ObservationRecord[]>;
  listObservationsByStudent(studentId: string): Promise<ObservationRecord[]>;
  listMediaByStudent(studentId: string): Promise<StoredRecord[]>;
}

export function isRecoverySnapshotRepository(
  store: LocalDataStore,
): store is LocalDataStore & RecoverySnapshotRepository {
  const candidate = store as Partial<RecoverySnapshotRepository>;
  return (
    typeof candidate.saveRecoverySnapshot === "function" &&
    typeof candidate.listRecoverySnapshots === "function" &&
    typeof candidate.getRecoverySnapshot === "function" &&
    typeof candidate.deleteRecoverySnapshot === "function" &&
    typeof candidate.deleteRecoverySnapshotsContainingStudent === "function"
  );
}
