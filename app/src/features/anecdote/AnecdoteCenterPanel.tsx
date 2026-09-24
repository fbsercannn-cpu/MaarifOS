import { useEffect, useState } from "react";
import {
  CheckCircledIcon,
  DownloadIcon,
  Link2Icon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import type {
  AnecdoteExportFormat,
} from "./export-document.ts";
import type {
  AnecdoteFormMissingField,
  AnecdoteFormReadModel,
  AnecdoteFormWorkspace,
} from "./anecdote-form.ts";

interface AnecdoteCenterPanelProps {
  workspace: AnecdoteFormWorkspace;
  busy: boolean;
  onSave: (
    observationId: string,
    values: { observedLocation: string; observerGeneralAssessment: string },
  ) => Promise<void>;
  onApprove: (
    observationId: string,
    values: { observedLocation: string; observerGeneralAssessment: string },
  ) => Promise<void>;
  onDownload: (
    observationId: string,
    format: AnecdoteExportFormat,
  ) => Promise<void>;
  onCompleteCurriculumLink: (observationId: string) => void;
}

const missingFieldLabels: Record<AnecdoteFormMissingField, string> = {
  "child-name": "çocuğun adı soyadı",
  date: "tarih",
  "observed-location": "gözlenen mekân",
  "observed-situation": "gözlenen durum",
  "observed-skills": "öğretmen onaylı gözlenen beceriler",
  "observer-general-assessment": "gözlemcinin genel değerlendirmesi",
  "teacher-review": "öğretmen incelemesi ve onayı",
};

function formatCivilDate(civilDate: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${civilDate}T12:00:00.000Z`));
}

function statusLabel(form: AnecdoteFormReadModel): string {
  if (form.workflowStatus === "ready") return "Belgeye hazır";
  if (form.workflowStatus === "review-required") return "Öğretmen onayı bekliyor";
  return "Eksikleri tamamlayın";
}

function AnecdoteFormCard({
  form,
  busy,
  onSave,
  onApprove,
  onDownload,
  onCompleteCurriculumLink,
}: Omit<AnecdoteCenterPanelProps, "workspace"> & {
  form: AnecdoteFormReadModel;
}) {
  const [observedLocation, setObservedLocation] = useState(
    form.observedLocation,
  );
  const [observerGeneralAssessment, setObserverGeneralAssessment] = useState(
    form.observerGeneralAssessment,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setObservedLocation(form.observedLocation);
    setObserverGeneralAssessment(form.observerGeneralAssessment);
  }, [
    form.observationId,
    form.observedLocation,
    form.observerGeneralAssessment,
    form.reviewStatus,
  ]);

  const values = { observedLocation, observerGeneralAssessment };
  const perform = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Anekdot formu işlemi tamamlanamadı.",
      );
    }
  };

  return (
    <details className="anecdote-form-card" data-status={form.workflowStatus}>
      <summary>
        <span className="anecdote-form-icon" aria-hidden="true">
          <ReaderIcon />
        </span>
        <span>
          <strong>{form.childFullName || "Çocuk adı eksik"}</strong>
          <small>
            {formatCivilDate(form.civilDate)} · {form.activityTitle}
          </small>
        </span>
        <em>{statusLabel(form)}</em>
      </summary>

      <div className="anecdote-form-body">
        <section className="anecdote-auto-fields" aria-label="Kayıttan gelen alanlar">
          <div>
            <small>Çocuğun Adı Soyadı</small>
            <strong>{form.childFullName || "Eksik"}</strong>
          </div>
          <div>
            <small>Tarih</small>
            <strong>{formatCivilDate(form.civilDate)}</strong>
          </div>
        </section>

        <section className="anecdote-source-observation">
          <small>Gözlenen Durum · değişmez gözlem notundan</small>
          <p>{form.observedSituation}</p>
        </section>

        <label className="anecdote-form-field" htmlFor={`anecdote-location-${form.observationId}`}>
          <span>Gözlenen Mekân</span>
          <KeyboardInput
            id={`anecdote-location-${form.observationId}`}
            value={observedLocation}
            onChange={(event) => setObservedLocation(event.target.value)}
            maxLength={300}
            placeholder="Örn. Fen merkezi, okul bahçesi"
            autoComplete="off"
          />
          {form.observedLocationSource === "activity" ||
          form.observedLocationSource === "plan" ? (
            <small>
              {form.observedLocationSource === "activity" ? "Etkinlik" : "Plan"}
              {" "}ortamından hazırlandı; öğretmen olarak kontrol edebilirsiniz.
            </small>
          ) : null}
        </label>

        <section className="anecdote-skills">
          <div>
            <span>Gözlenen Beceriler</span>
            <small>Yalnız öğretmenin onayladığı sürümlü program bağları</small>
          </div>
          {form.observedSkills.length > 0 ? (
            <ul>
              {form.observedSkills.map((skill) => (
                <li key={skill.linkId}>
                  <strong>{skill.referenceCode}</strong>
                  <span>{skill.referenceTitle}</span>
                  <small>Kaynak sürümü {skill.sourceVersion}</small>
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              className="anecdote-link-action"
              onClick={() => onCompleteCurriculumLink(form.observationId)}
            >
              <Link2Icon aria-hidden="true" />
              Program bağını tamamla
            </button>
          )}
        </section>

        <label
          className="anecdote-form-field"
          htmlFor={`anecdote-assessment-${form.observationId}`}
        >
          <span>Gözlemcinin Genel Değerlendirmesi</span>
          <KeyboardTextarea
            id={`anecdote-assessment-${form.observationId}`}
            value={observerGeneralAssessment}
            onChange={(event) =>
              setObserverGeneralAssessment(event.target.value)
            }
            rows={6}
            maxLength={10_000}
            placeholder="Gözleme dayanan mesleki değerlendirmenizi yazın; tanı veya kesin hüküm eklemeyin."
          />
          {form.generalEvaluationSourceDraftId ? (
            <small>
              Daha önce yazdığınız kanıta dayalı değerlendirmeden hazırlandı;
              yeniden yazmadan kontrol edip onaylayabilirsiniz.
            </small>
          ) : (
            <small>
              Bu metin değişmez gözlem notundan ayrı, öğretmen yazarlı kayıt olarak saklanır.
            </small>
          )}
        </label>

        {form.missingFields.length > 0 ? (
          <section className="anecdote-missing" aria-label="Eksik alanlar">
            <strong>Belge henüz dışa aktarılamaz</strong>
            <ul>
              {form.missingFields.map((field) => (
                <li key={field}>{missingFieldLabels[field]}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        {message ? (
          <p className="anecdote-success" role="status">
            <CheckCircledIcon aria-hidden="true" />
            {message}
          </p>
        ) : null}

        <div className="anecdote-form-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void perform(
                () => onSave(form.observationId, values),
                "Anekdot taslağı bu cihazda saklandı.",
              )
            }
          >
            Taslağı kaydet
          </button>
          <button
            type="button"
            className="is-primary"
            disabled={busy}
            onClick={() =>
              void perform(
                () => onApprove(form.observationId, values),
                "Form öğretmen onayıyla belgeye hazırlandı.",
              )
            }
          >
            İncele ve onayla
          </button>
        </div>

        {form.workflowStatus === "ready" ? (
          <div className="anecdote-download-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void perform(
                  () => onDownload(form.observationId, "pdf"),
                  "PDF önizlemesi hazır; inceleyip indirebilirsiniz.",
                )
              }
            >
              <DownloadIcon aria-hidden="true" />
              Görsel PDF indir
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void perform(
                  () => onDownload(form.observationId, "word"),
                  "Word belgesi indirildi.",
                )
              }
            >
              <DownloadIcon aria-hidden="true" />
              Word indir
            </button>
          </div>
        ) : null}

        <p className="anecdote-trace-note">
          Form, {form.formSource.sourceLabel} içindeki resmî Ek 3 alan sırasını
          kullanır. Gözlem kimliği ve program kaynak sürümü dosya izlenebilirliğinde korunur.
        </p>
      </div>
    </details>
  );
}

export function AnecdoteCenterPanel(props: AnecdoteCenterPanelProps) {
  const { workspace, ...cardActions } = props;
  return (
    <section className="anecdote-center" aria-labelledby="anecdote-center-heading">
      <div className="anecdote-center-heading">
        <div>
          <small>MEB 2024 · Ek 3</small>
          <h3 id="anecdote-center-heading">Anekdot Kayıt Formları</h3>
          <p>
            Gözlem notunu yeniden yazmadan eksikleri tamamlayın, öğretmen olarak
            onaylayın ve resmî alan sırasıyla belge alın.
          </p>
        </div>
        <ReaderIcon aria-hidden="true" />
      </div>
      <div className="anecdote-center-summary" aria-label="Anekdot belge durumu">
        <span>{workspace.incompleteCount} eksik</span>
        <span>{workspace.reviewRequiredCount} onay bekliyor</span>
        <span>{workspace.readyCount} hazır</span>
      </div>
      {workspace.forms.length > 0 ? (
        <div className="anecdote-form-list">
          {workspace.forms.map((form) => (
            <AnecdoteFormCard
              key={form.observationId}
              form={form}
              {...cardActions}
            />
          ))}
        </div>
      ) : (
        <div className="anecdote-empty">
          <ReaderIcon aria-hidden="true" />
          <strong>Henüz anekdot türünde gözlem yok</strong>
          <p>
            Hızlı gözlemde türü “Anekdot” seçtiğiniz kayıtlar burada otomatik görünür.
          </p>
        </div>
      )}
    </section>
  );
}
