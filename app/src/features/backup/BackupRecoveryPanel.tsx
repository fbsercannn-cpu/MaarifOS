import { useEffect, useId, useRef, useState } from "react";
import { KeyboardInput } from "../../mobile";
import type { BackupService } from "../../core/backup/backup-service";
import { MAX_ENCRYPTED_BACKUP_BYTES, type BackupRecoverySummary } from "../../core/backup/backup-capacity";
import { backupCollectionLabels, backupRecoveryCopy as copy } from "./backup-recovery-copy";
import "./backup-recovery.css";

const size = (bytes: number) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(bytes / (bytes < 1024 * 1024 ? 1024 : 1024 * 1024))} ${bytes < 1024 * 1024 ? "KiB" : "MiB"}`;
function Summary({ value, title }: { value: BackupRecoverySummary; title: string }) {
  return <div className="backup-recovery-summary">
    <strong>{title}</strong>
    <p>{value.recordCount} kayıt · {value.photoCount} profil fotoğrafı</p>
    <p>Veri: {size(value.plaintextBytes)} / {size(value.maximumPlaintextBytes)} · Dosya sınırı: {size(value.maximumFileBytes)}</p>
    <details><summary>{copy.counts}</summary><dl>{value.collections.map(item => <div key={item.collection}>
      <dt>{backupCollectionLabels[item.collection]}</dt><dd>{item.count}</dd>
    </div>)}</dl></details>
  </div>;
}

export interface BackupRecoveryPanelProps {
  getBackupService(): Promise<BackupService>;
  /** Change after a successful restore to show its durable count/hash receipt. */
  refreshKey?: string | number;
}

export function BackupRecoveryPanel({ getBackupService, refreshKey }: BackupRecoveryPanelProps) {
  const id = useId();
  const getter = useRef(getBackupService); getter.current = getBackupService;
  const mounted = useRef(true);
  const action = useRef(0);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState<BackupRecoverySummary | null>(null);
  const [verified, setVerified] = useState<BackupRecoverySummary | null>(null);
  const [restored, setRestored] = useState<BackupRecoverySummary | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; action.current += 1; }; }, []);
  useEffect(() => {
    let active = true;
    void getter.current().then(service => { if (active) setRestored(service.lastRestoreVerification); }).catch(() => undefined);
    return () => { active = false; };
  }, [refreshKey]);
  const run = async (task: (service: BackupService) => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const generation = ++action.current;
    setBusy(true); setError("");
    try { await task(await getter.current()); }
    catch (failure) { if (mounted.current && generation === action.current) setError(failure instanceof Error ? failure.message : copy.error); }
    finally { busyRef.current = false; if (mounted.current && generation === action.current) { setBusy(false); setPassword(""); } }
  };
  const inspect = () => void run(async service => {
    const summary = await service.recoverySummary();
    if (mounted.current) { setCurrent(summary); setRestored(service.lastRestoreVerification); }
  });
  const verify = () => {
    setVerified(null);
    if (!file || password.length < 10) { setError(copy.missing); return; }
    if (file.size > MAX_ENCRYPTED_BACKUP_BYTES) { setError(copy.unsupported); return; }
    void run(async service => {
      const summary = await service.verifyEncryptedRecovery(await file.text(), password);
      if (mounted.current) setVerified(summary);
    });
  };
  return <section className="backup-recovery-panel" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <h3 id={`${id}-title`}>{copy.title}</h3><p>{copy.protected}</p>
    <button type="button" onClick={inspect} disabled={busy}>{busy ? copy.busy : copy.inspect}</button>
    {current ? <Summary value={current} title={copy.local} /> : null}
    {restored ? <Summary value={restored} title={copy.restored} /> : null}
    <details className="backup-recovery-file"><summary>{copy.fileSection}</summary>
      <p id={`${id}-help`}>{copy.drillHelp}</p>
      <label htmlFor={`${id}-file`}>{copy.file}</label>
      <input id={`${id}-file`} type="file" accept=".maarifos,.json,application/json" disabled={busy}
        onChange={event => { setFile(event.target.files?.[0] ?? null); setVerified(null); setPassword(""); setError(""); }} />
      <label htmlFor={`${id}-password`}>{copy.password}</label>
      <KeyboardInput id={`${id}-password`} type="password" value={password} maxLength={1024} autoComplete="off"
        disabled={busy} onChange={event => setPassword(event.target.value)} aria-describedby={`${id}-help`} />
      <button type="button" disabled={busy || !file || password.length < 10} onClick={verify}>{busy ? copy.busy : copy.verify}</button>
    </details>
    {error ? <p role="alert" className="backup-recovery-error">{error}</p> : null}
    <div role="status" aria-live="polite">{verified ? <Summary value={verified} title={copy.verified} /> : null}</div>
  </section>;
}
