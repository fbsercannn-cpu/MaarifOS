import type {
  CollectionName,
  DataSnapshot,
  StoredRecord,
} from "../domain/model";
import type { BackupEnvelope } from "../backup/schema";

export type TransactionMode = "readonly" | "readwrite";

export interface DataTransaction {
  getAll(collection: CollectionName): Promise<StoredRecord[]>;
  putMany(collection: CollectionName, records: readonly StoredRecord[]): Promise<void>;
  clear(collection: CollectionName): Promise<void>;
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
  listStudentsByClassroom(classroomId: string): Promise<StoredRecord[]>;
  listAttendanceByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<StoredRecord[]>;
  listAttendanceByStudentDate(
    studentId: string,
    civilDate: string,
  ): Promise<StoredRecord[]>;
  listObservationsByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<StoredRecord[]>;
  listObservationsByStudent(studentId: string): Promise<StoredRecord[]>;
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
