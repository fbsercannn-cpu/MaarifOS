import { createRoot } from "react-dom/client";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile";
import { BackupService, IndexedDbDataStore } from "../src/core";
import { BackupRecoveryPanel } from "../src/features/backup/BackupRecoveryPanel";
import "./runtime-backup-recovery.css";

export const fixtureStore = new IndexedDbDataStore({ databaseName: `recovery-ui-${crypto.randomUUID()}` });
export const fixtureService = new BackupService(fixtureStore, { appVersion: "recovery-ui-test" });
export const fixtureReady = fixtureStore.transaction("readwrite", ["students"], tx => tx.putMany("students", [{
  id: crypto.randomUUID(), schemaVersion: 1, createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", displayName: "Kurgu Kabul Çocuğu",
}]));
const getBackupService = async () => { await fixtureReady; return fixtureService; };
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider native><KeyboardProvider native>
  <BackupRecoveryPanel getBackupService={getBackupService} />
</KeyboardProvider></MobileDeviceProvider>);
