import { ChevronRightIcon } from "@radix-ui/react-icons";

import { TEACHER_PILOT_TARGET_CONTRACT } from "./teacher-pilot-protocol.ts";
import "./teacher-pilot-protocol-summary.css";

export function TeacherPilotProtocolSummary() {
  const contract = TEACHER_PILOT_TARGET_CONTRACT;
  const thresholds = contract.acceptanceThresholds;

  return (
    <details
      className="simple-teacher-pilot"
      data-pilot-status="not-run"
      data-testid="teacher-pilot-protocol-summary"
    >
      <summary>
        <span>
          <small>R06 · ÖNCEDEN SABİTLENMİŞ PROTOKOL</small>
          <strong>Gerçek öğretmen pilotu</strong>
          <em>Gerçek ölçüm yok · sonuç veya başarı kararı üretilmedi</em>
        </span>
        <ChevronRightIcon aria-hidden="true" />
      </summary>

      <div className="simple-teacher-pilot__body">
        <p className="simple-teacher-pilot__status" role="status">
          <strong>Gerçek ölçüm yok.</strong> Bu alan yalnız beş gerçek okul öncesi
          öğretmeniyle yürütülecek pilotun görev ve kabul sözleşmesini gösterir.
        </p>

        <section aria-labelledby="teacher-pilot-task-heading">
          <h3 id="teacher-pilot-task-heading">4 exact görev</h3>
          <ol className="simple-teacher-pilot__tasks">
            {contract.tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.id} · {task.name}</strong>
                <p>{task.instruction}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="teacher-pilot-threshold-heading">
          <h3 id="teacher-pilot-threshold-heading">Kabul eşiği</h3>
          <ul className="simple-teacher-pilot__thresholds">
            <li>
              {contract.participantCount} gerçek öğretmen × {contract.tasksPerParticipant}
              {" "}görev = {contract.expectedRawObservationCount} ham görev kaydı
            </li>
            <li>
              En az {thresholds.minimumCorrectObservations}/
              {contract.expectedRawObservationCount} doğru görev
            </li>
            <li>
              Ham süre medyanı en fazla {thresholds.maximumMedianDurationMs / 1_000}
              {" "}saniye
            </li>
            <li>
              Başarılı görevlerin hiçbiri {thresholds.maximumSuccessfulObservationDurationMs / 1_000}
              {" "}saniyeyi aşamaz
            </li>
            <li>
              Yanlış çocuk/kapsam sayısı {thresholds.maximumWrongChildOrScopeIncidents}
            </li>
            <li>
              Sahte resmî tamamlandı sayısı {thresholds.maximumFalseOfficialCompletionClaims}
            </li>
            <li>
              Tekrar giriş medyanı {thresholds.maximumMedianRetryEntryCount}
            </li>
          </ul>
        </section>

        <p className="simple-teacher-pilot__policy">
          {contract.secondaryDesignTarget.explanation} Yardımlı, başarısız ve yarım
          kalan görevler ham süreleriyle saklanır; süreler kırpılmaz veya winsorize
          edilmez.
        </p>
      </div>
    </details>
  );
}
