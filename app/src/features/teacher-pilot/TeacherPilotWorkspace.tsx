import { useEffect, useRef, useState } from "react";

import { KeyboardInput } from "../../mobile";
import {
  TEACHER_PILOT_TARGET_CONTRACT,
  TEACHER_PILOT_TASK_IDS,
  createTeacherPilotTimer,
  type TeacherPilotRawObservation,
  type TeacherPilotTaskId,
  type TeacherPilotTaskOutcome,
} from "./teacher-pilot-protocol.ts";
import "./teacher-pilot-workspace.css";

export interface TeacherPilotParticipantOption {
  readonly participantRef: string;
  readonly participantEvidenceId: string;
  readonly participantEvidenceSha256: `sha256:${string}`;
}

export function TeacherPilotWorkspace({
  pilotRunId,
  participants,
  onRecord,
}: {
  readonly pilotRunId: string;
  readonly participants: readonly TeacherPilotParticipantOption[];
  readonly onRecord: (record: TeacherPilotRawObservation) => void;
}) {
  const timerRef = useRef(createTeacherPilotTimer());
  const [participantRef, setParticipantRef] = useState(
    participants[0]?.participantRef ?? "",
  );
  const [taskId, setTaskId] = useState<TeacherPilotTaskId>("P01");
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [outcome, setOutcome] = useState<TeacherPilotTaskOutcome>("successful");
  const [correctCompletion, setCorrectCompletion] = useState(true);
  const [assisted, setAssisted] = useState(false);
  const [errorCount, setErrorCount] = useState("0");
  const [retryEntryCount, setRetryEntryCount] = useState("0");
  const [wrongChildOrScopeIncident, setWrongChildOrScopeIncident] = useState(false);
  const [falseOfficialCompletionClaim, setFalseOfficialCompletionClaim] = useState(false);
  const [observerAttestation, setObserverAttestation] = useState(false);
  const [records, setRecords] = useState<readonly TeacherPilotRawObservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const exactParticipantSetup =
    participants.length === TEACHER_PILOT_TARGET_CONTRACT.participantCount &&
    new Set(participants.map((participant) => participant.participantRef)).size ===
      participants.length;
  const selectedParticipant = participants.find(
    (participant) => participant.participantRef === participantRef,
  );
  const selectedTask = TEACHER_PILOT_TARGET_CONTRACT.tasks.find(
    (task) => task.id === taskId,
  );

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setElapsedMs(timerRef.current.elapsedMs());
    }, 100);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (participants.some((participant) => participant.participantRef === participantRef)) {
      return;
    }
    setParticipantRef(participants[0]?.participantRef ?? "");
  }, [participantRef, participants]);

  function start(): void {
    if (!exactParticipantSetup || !selectedParticipant) {
      setError("Pilot başlamadan önce beş ayrı gerçek öğretmenin doğrulanmış pseudonymous kaydı gerekir.");
      return;
    }
    if (!observerAttestation) {
      setError("Zamanlayıcı yalnız canlı gerçek öğretmen oturumu gözlemci beyanından sonra başlatılabilir.");
      return;
    }
    try {
      timerRef.current.start({
        pilotRunId,
        participantRef: selectedParticipant.participantRef,
        participantEvidenceId: selectedParticipant.participantEvidenceId,
        participantEvidenceSha256: selectedParticipant.participantEvidenceSha256,
        taskId,
        origin: "observed-real-human-session",
        observerAttestation,
      });
      setElapsedMs(0);
      setRunning(true);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Zamanlayıcı başlatılamadı.");
    }
  }

  function finish(): void {
    try {
      const record = timerRef.current.finish({
        outcome,
        correctCompletion: outcome === "successful" && correctCompletion,
        assisted,
        errorCount: Number(errorCount),
        retryEntryCount: Number(retryEntryCount),
        wrongChildOrScopeIncident,
        falseOfficialCompletionClaim,
      });
      setRecords((current) => [...current, record]);
      onRecord(record);
      setRunning(false);
      setElapsedMs(record.durationMs);
      setObserverAttestation(false);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Ham görev kaydı oluşturulamadı.");
    }
  }

  function cancel(): void {
    timerRef.current.cancel();
    setRunning(false);
    setElapsedMs(0);
    setError(null);
  }

  return (
    <section
      className="teacher-pilot-workspace"
      aria-labelledby="teacher-pilot-heading"
      data-pilot-status={records.length === 0 ? "not-run" : "raw-data-in-progress"}
    >
      <header>
        <span>R06 · gerçek öğretmen pilotu çalışma aracı</span>
        <h2 id="teacher-pilot-heading">5 öğretmen × 4 görev ham ölçüm alanı</h2>
        <p>
          Gerçek pilot sonucu henüz yok. Bu yüzey yalnız canlı oturumda süre,
          doğruluk, yardım, hata ve tekrar giriş sayısını kaydeder; örnek veri
          üretmez ve kaydı kendiliğinden kabul kararı saymaz.
        </p>
      </header>

      <aside className="teacher-pilot-workspace__target" aria-label="Pilot kabul sözleşmesi">
        <strong>Deneyden önce sabitlenen tek hedef</strong>
        <ul>
          <li>Toplam 20 ham görev; en az 19 doğru tamamlama.</li>
          <li>Ham süre medyanı en çok 25 saniye.</li>
          <li>Başarılı görevlerin hiçbiri 45 saniyeyi aşmaz.</li>
          <li>Yanlış çocuk/kapsam ve sahte resmî tamamlandı olayı sıfırdır.</li>
          <li>Tekrar giriş medyanı sıfırdır.</li>
        </ul>
        <small>
          15 saniye yalnız P01 için ikincil tasarım hedefidir; kabul eşiği değildir.
          Yardımlı, başarısız ve bırakılan görevlerin ham süreleri korunur; kırpılmaz
          veya winsorize edilmez.
        </small>
      </aside>

      {!exactParticipantSetup ? (
        <p className="teacher-pilot-workspace__setup" role="status">
          Kayıt kapalı: beş ayrı, dış sicilde doğrulanmış gerçek okul öncesi öğretmeni
          pseudonymous kimliği sağlanmadı.
        </p>
      ) : null}

      <div className="teacher-pilot-workspace__controls">
        <label>
          <span>Öğretmen kodu</span>
          <select
            value={participantRef}
            disabled={running || !exactParticipantSetup}
            onChange={(event) => setParticipantRef(event.target.value)}
          >
            {participants.map((participant) => (
              <option key={participant.participantRef} value={participant.participantRef}>
                {participant.participantRef}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Görev</span>
          <select
            value={taskId}
            disabled={running}
            onChange={(event) => setTaskId(event.target.value as TeacherPilotTaskId)}
          >
            {TEACHER_PILOT_TASK_IDS.map((id) => {
              const task = TEACHER_PILOT_TARGET_CONTRACT.tasks.find((item) => item.id === id);
              return <option key={id} value={id}>{id} · {task?.name}</option>;
            })}
          </select>
        </label>
        <p className="teacher-pilot-workspace__instruction">
          <strong>{selectedTask?.id}</strong> {selectedTask?.instruction}
        </p>
        <output aria-live="polite" className="teacher-pilot-workspace__timer">
          {(elapsedMs / 1_000).toLocaleString("tr-TR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} sn
        </output>
        <label className="teacher-pilot-workspace__check teacher-pilot-workspace__attestation">
          <input
            type="checkbox"
            checked={observerAttestation}
            disabled={running || !exactParticipantSetup}
            onChange={(event) => setObserverAttestation(event.target.checked)}
          />
          <span>
            Bu görevin doğrulanmış gerçek okul öncesi öğretmeniyle canlı yürütüldüğünü
            gözlemlediğimi beyan ederim.
          </span>
        </label>
        <div className="teacher-pilot-workspace__timer-actions">
          <button
            type="button"
            onClick={start}
            disabled={running || !exactParticipantSetup || !observerAttestation}
          >
            Zamanlayıcıyı başlat
          </button>
          <button type="button" onClick={finish} disabled={!running}>
            Bitir ve ham kaydı ekle
          </button>
          <button type="button" onClick={cancel} disabled={!running}>
            İptal et
          </button>
        </div>
      </div>

      <fieldset disabled={!exactParticipantSetup}>
        <legend>Ham görev sonucu</legend>
        <p className="teacher-pilot-workspace__field-note">
          Gözlemci bu alanları görev sürerken işaretler; “bitir” anı ham sürenin sonudur.
        </p>
        <label>
          <span>Sonuç</span>
          <select
            value={outcome}
            onChange={(event) => {
              const nextOutcome = event.target.value as TeacherPilotTaskOutcome;
              setOutcome(nextOutcome);
              if (nextOutcome !== "successful") setCorrectCompletion(false);
            }}
          >
            <option value="successful">Başarılı</option>
            <option value="failed">Başarısız</option>
            <option value="abandoned">Bırakıldı</option>
          </select>
        </label>
        <label>
          <span>Hata sayısı</span>
          <KeyboardInput
            type="number"
            min="0"
            max="1000"
            step="1"
            inputMode="numeric"
            value={errorCount}
            onChange={(event) => setErrorCount(event.target.value)}
          />
        </label>
        <label>
          <span>Tekrar giriş sayısı</span>
          <KeyboardInput
            type="number"
            min="0"
            max="1000"
            step="1"
            inputMode="numeric"
            value={retryEntryCount}
            onChange={(event) => setRetryEntryCount(event.target.value)}
          />
        </label>
        <label className="teacher-pilot-workspace__check">
          <input
            type="checkbox"
            checked={correctCompletion}
            disabled={outcome !== "successful"}
            onChange={(event) => setCorrectCompletion(event.target.checked)}
          />
          <span>Görev doğru tamamlandı</span>
        </label>
        <label className="teacher-pilot-workspace__check">
          <input
            type="checkbox"
            checked={assisted}
            onChange={(event) => setAssisted(event.target.checked)}
          />
          <span>Yardım kullanıldı</span>
        </label>
        <label className="teacher-pilot-workspace__check">
          <input
            type="checkbox"
            checked={wrongChildOrScopeIncident}
            onChange={(event) => setWrongChildOrScopeIncident(event.target.checked)}
          />
          <span>Yanlış çocuk veya kapsam olayı oldu</span>
        </label>
        <label className="teacher-pilot-workspace__check">
          <input
            type="checkbox"
            checked={falseOfficialCompletionClaim}
            onChange={(event) => setFalseOfficialCompletionClaim(event.target.checked)}
          />
          <span>Yapılmamış resmî işlem tamamlandı göründü</span>
        </label>
      </fieldset>

      {error ? <p className="teacher-pilot-workspace__error" role="alert">{error}</p> : null}

      <section className="teacher-pilot-workspace__raw" aria-label="Bu oturumun ham kayıtları">
        <h3>Ham kayıtlar · {records.length}/20</h3>
        <p>Bu sayı pilotun kabul edildiği anlamına gelmez.</p>
        {records.length > 0 ? (
          <ol>
            {records.map((record) => (
              <li key={record.recordId}>
                <strong>{record.participantRef} · {record.taskId}</strong>
                <span>
                  {(record.durationMs / 1_000).toLocaleString("tr-TR", {
                    maximumFractionDigits: 1,
                  })} sn · {record.outcome} · hata {record.errorCount} · tekrar {record.retryEntryCount}
                  {record.assisted ? " · yardımlı" : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <small>Henüz gerçek insan oturumu kaydı yok.</small>
        )}
      </section>
    </section>
  );
}
