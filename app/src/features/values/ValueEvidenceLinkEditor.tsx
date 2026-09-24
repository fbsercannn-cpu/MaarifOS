import { useEffect, useMemo, useRef, useState } from "react";

import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { KeyboardTextarea } from "../../mobile";
import {
  confirmObservationValueEvidenceLink,
  loadValueEvidenceLinkEditorModel,
  supersedeObservationValueEvidenceLink,
  tombstoneObservationValueEvidenceLink,
  type ValueEvidenceEditorLink,
  type ValueEvidenceLinkEditorModel,
  type ValueEvidenceRole,
} from "./value-evidence-links.ts";

const ROLE_OPTIONS: readonly {
  value: ValueEvidenceRole;
  label: string;
  description: string;
}[] = [
  {
    value: "supports",
    label: "Uyumlu olay örneği",
    description: "Gözlenen eylem, seçili resmî eylemle aynı yönde bir olay örneği sunuyor.",
  },
  {
    value: "contrasts",
    label: "Ayrışan-karşı olay",
    description: "Gözlenen olay, seçili eylemden ayrışıyor ve sonraki plan için karşı kanıt sunuyor.",
  },
  {
    value: "context_only",
    label: "Yalnız bağlam",
    description: "Olay yalnız planlama bağlamı sağlıyor; değer hakkında olumlu veya olumsuz hüküm kurmuyor.",
  },
];

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ValueEvidenceRole, string>;

type EditorMode = "create" | "correct" | "remove";

export interface ValueEvidenceLinkEditorProps {
  store: LocalDataStore;
  observationId: string;
  studentId: string;
  writesDisabled?: boolean;
  onClose: () => void;
}

function targetKey(target: {
  targetValueCode: string;
  targetIndicatorCode: string;
}): string {
  return `${target.targetValueCode}\u0000${target.targetIndicatorCode}`;
}

function targetRoleLabel(roles: readonly string[]): string {
  return roles
    .map((role) =>
      role === "primary"
        ? "ana değer"
        : role === "roof"
          ? "çatı değer"
          : "destekleyen değer",
    )
    .join(" · ");
}

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }).format(date);
}

export function ValueEvidenceLinkEditor({
  store,
  observationId,
  studentId,
  writesDisabled = false,
  onClose,
}: ValueEvidenceLinkEditorProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [model, setModel] = useState<ValueEvidenceLinkEditorModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<EditorMode>("create");
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [selectedTargetKey, setSelectedTargetKey] = useState("");
  const [evidenceRole, setEvidenceRole] = useState<ValueEvidenceRole | "">("");
  const [rationale, setRationale] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [removalConfirmed, setRemovalConfirmed] = useState(false);
  const [relinkAfterRemoval, setRelinkAfterRemoval] = useState(false);

  const loadModel = async (): Promise<ValueEvidenceLinkEditorModel> => {
    const next = await loadValueEvidenceLinkEditorModel(store, {
      observationId,
      studentId,
    });
    setModel(next);
    return next;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setStatus("");
    setMode("create");
    setSelectedLinkId("");
    setSelectedTargetKey("");
    setEvidenceRole("");
    setRationale("");
    setConfirmationChecked(false);
    setRemovalConfirmed(false);
    setRelinkAfterRemoval(false);
    void loadValueEvidenceLinkEditorModel(store, { observationId, studentId })
      .then((next) => {
        if (active) setModel(next);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Değer kanıtı editörü açılamadı.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [observationId, store, studentId]);

  useEffect(() => {
    titleRef.current?.focus();
  }, [observationId]);

  const selectedTarget = useMemo(
    () => model?.targets.find((target) => targetKey(target) === selectedTargetKey),
    [model, selectedTargetKey],
  );
  const selectedLink = useMemo(
    () => model?.activeLinks.find((link) => link.record.id === selectedLinkId),
    [model, selectedLinkId],
  );
  const mutationDisabled = writesDisabled || saving;

  const resetCreateForm = () => {
    setMode("create");
    setSelectedLinkId("");
    setSelectedTargetKey("");
    setEvidenceRole("");
    setRationale("");
    setConfirmationChecked(false);
    setRemovalConfirmed(false);
    setRelinkAfterRemoval(false);
  };

  const startCorrection = (link: ValueEvidenceEditorLink) => {
    setMode("correct");
    setSelectedLinkId(link.record.id);
    setSelectedTargetKey(targetKey(link.target));
    setEvidenceRole(link.record.evidenceRole);
    setRationale(link.record.teacherRationale);
    setConfirmationChecked(false);
    setRemovalConfirmed(false);
    setRelinkAfterRemoval(false);
    setError("");
    setStatus("");
  };

  const startRemoval = (
    link: ValueEvidenceEditorLink,
    relink: boolean,
  ) => {
    setMode("remove");
    setSelectedLinkId(link.record.id);
    setSelectedTargetKey(targetKey(link.target));
    setRemovalConfirmed(false);
    setRelinkAfterRemoval(relink);
    setError("");
    setStatus("");
  };

  const saveLink = async () => {
    if (
      !model ||
      !selectedTarget ||
      !evidenceRole ||
      !rationale.trim() ||
      !confirmationChecked ||
      mutationDisabled
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (mode === "correct") {
        if (!selectedLink) throw new Error("Düzeltilecek canlı bağlantı bulunamadı.");
        await supersedeObservationValueEvidenceLink(store, {
          linkId: selectedLink.record.id,
          evidenceRole,
          teacherRationale: rationale,
        });
        setStatus(
          "Rol veya gerekçe düzeltildi. Önceki sürüm kaldırılmış kayıt olarak geçmişte korunuyor.",
        );
      } else {
        await confirmObservationValueEvidenceLink(store, {
          observationId: model.observationId,
          studentId: model.studentId,
          targetValueCode: selectedTarget.targetValueCode,
          targetIndicatorCode: selectedTarget.targetIndicatorCode,
          evidenceRole,
          teacherRationale: rationale,
        });
        setStatus(
          "Öğretmen onaylı gözlem–değer eylemi bağlantısı kaydedildi.",
        );
      }
      await loadModel();
      resetCreateForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Değer kanıtı bağlantısı kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async () => {
    if (!selectedLink || !removalConfirmed || mutationDisabled) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await tombstoneObservationValueEvidenceLink(store, {
        linkId: selectedLink.record.id,
      });
      await loadModel();
      const shouldRelink = relinkAfterRemoval;
      resetCreateForm();
      setStatus(
        shouldRelink
          ? "Yanlış hedef bağlantısı kaldırıldı ve geçmişte korundu. Yeni hedef, rol ve gerekçeyi yeniden seçin."
          : "Bağlantı fiziksel olarak silinmedi; kaldırılmış kayıt olarak geçmişte korunuyor.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Değer kanıtı bağlantısı kaldırılamadı.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="value-evidence-editor"
      aria-labelledby={`value-evidence-editor-title-${observationId}`}
      aria-busy={loading || saving}
      data-testid="value-evidence-editor"
    >
      <header className="value-evidence-editor-header">
        <div>
          <span>Öğretmen kontrollü değer kanıtı</span>
          <h5
            id={`value-evidence-editor-title-${observationId}`}
            ref={titleRef}
            tabIndex={-1}
          >
            Gözlemi resmî bir değer eylemiyle ilişkilendir
          </h5>
        </div>
        <button type="button" onClick={onClose} aria-label="Değer kanıtı editörünü kapat">
          Kapat
        </button>
      </header>

      <p
        className="value-evidence-pilot-status"
        role="status"
        data-mapping-status={
          model?.mappingStatus ?? "machine_validated_pending_human_review"
        }
      >
        <strong>Seçtiğiniz değer, eylem ve gerçek kanıt birlikte kaydedilir.</strong>{" "}
        Kaynak bilgileri korunur; bu kayıt uzman doğrulaması veya çocuk hakkında hüküm oluşturmaz.
      </p>
      <p className="value-evidence-belief-warning">
        Türk-İslam kültüründeki komşuluk, emanet, paylaşma ve bayram gibi bağlamlar
        saygıyla ele alınabilir; çocuğun inancı, mezhebi, duası veya ibadete katılımı
        değer kanıtı değildir ve burada değerlendirilmez.
      </p>

      {loading ? <p className="value-evidence-loading">Uygulanmış etkinlik snapshot’ı doğrulanıyor…</p> : null}
      {error ? <p className="value-evidence-error" role="alert">{error}</p> : null}
      {status ? <p className="value-evidence-status" role="status" aria-live="polite">{status}</p> : null}
      {writesDisabled ? (
        <p className="value-evidence-write-lock" role="status">
          Eğitimsel yazımlar şu anda kapalı. Kayıtları inceleyebilirsiniz; bağlantı oluşturma,
          düzeltme ve kaldırma kullanılamaz.
        </p>
      ) : null}

      {model ? (
        <>
          <div className="value-evidence-observation-source">
            <span>{model.studentName} · {model.activityTitle}</span>
            <blockquote>{model.rawObservation}</blockquote>
          </div>

          <section className="value-evidence-existing" aria-labelledby={`value-evidence-existing-${observationId}`}>
            <div>
              <h6 id={`value-evidence-existing-${observationId}`}>Canlı bağlantılar</h6>
              <small>{model.activeLinks.length} kayıt</small>
            </div>
            {model.activeLinks.length === 0 ? (
              <p>Henüz değer eylemi bağlantısı yok. Editörü açmak veya haftalık gözlem kutusunu seçmek bağlantı üretmez.</p>
            ) : (
              <ul>
                {model.activeLinks.map((link) => (
                  <li key={link.record.id}>
                    <strong>
                      {link.target.targetValueCode} {link.target.valueName} · {link.target.targetIndicatorCode}
                    </strong>
                    <span>{ROLE_LABELS[link.record.evidenceRole]}</span>
                    <p>{link.record.teacherRationale}</p>
                    <small>{displayDate(link.record.confirmedAt)} · öğretmen onaylı</small>
                    <div className="value-evidence-link-actions">
                      <button
                        type="button"
                        disabled={mutationDisabled}
                        onClick={() => startCorrection(link)}
                      >
                        Rol veya gerekçeyi düzelt
                      </button>
                      <button
                        type="button"
                        disabled={mutationDisabled}
                        onClick={() => startRemoval(link, true)}
                      >
                        Yanlış hedefi kaldırıp yeniden bağla
                      </button>
                      <button
                        type="button"
                        disabled={mutationDisabled}
                        onClick={() => startRemoval(link, false)}
                      >
                        Bağlantıyı kaldır
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {mode === "remove" && selectedLink ? (
            <section className="value-evidence-remove-confirm" aria-labelledby={`value-evidence-remove-${selectedLink.record.id}`}>
              <h6 id={`value-evidence-remove-${selectedLink.record.id}`}>
                {relinkAfterRemoval ? "Yanlış hedefi kaldırıp yeniden bağla" : "Bağlantıyı kaldır"}
              </h6>
              <p>
                {selectedLink.target.targetValueCode} {selectedLink.target.valueName} ·{" "}
                {selectedLink.target.targetIndicatorCode} bağlantısı fiziksel olarak silinmez;
                geçmiş ve kaynak zinciri korunur.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={removalConfirmed}
                  onChange={(event) => setRemovalConfirmed(event.target.checked)}
                />
                <span>Kaldırılmış sürümün geçmişte korunacağını anladım ve bu işlemi açıkça onaylıyorum.</span>
              </label>
              <div>
                <button type="button" onClick={resetCreateForm}>Vazgeç</button>
                <button
                  type="button"
                  disabled={mutationDisabled || !removalConfirmed}
                  onClick={() => void removeLink()}
                >
                  {saving ? "Kaldırılıyor…" : "Kaldırmayı onayla"}
                </button>
              </div>
            </section>
          ) : (
            <form
              className="value-evidence-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveLink();
              }}
            >
              <fieldset>
                <legend>1. Resmî değer eylemi hedefi</legend>
                {mode === "correct" && selectedTarget ? (
                  <div className="value-evidence-fixed-target">
                    <strong>{selectedTarget.targetValueCode} {selectedTarget.valueName}</strong>
                    <span>{selectedTarget.targetIndicatorCode} · {selectedTarget.indicatorText}</span>
                    <small>Düzeltmede hedef sabittir. Hedef yanlışsa canlı bağlantıdan “Yanlış hedefi kaldırıp yeniden bağla” yolunu kullanın.</small>
                  </div>
                ) : (
                  <div className="value-evidence-target-options">
                    {model.targets.map((target) => (
                      <label key={targetKey(target)}>
                        <input
                          type="radio"
                          name={`value-evidence-target-${observationId}`}
                          value={targetKey(target)}
                          checked={selectedTargetKey === targetKey(target)}
                          onChange={() => setSelectedTargetKey(targetKey(target))}
                          disabled={mutationDisabled}
                        />
                        <span>
                          <strong>{target.targetValueCode} {target.valueName} · {target.targetIndicatorCode}</strong>
                          <small>{targetRoleLabel(target.valueRoles)} · {target.actionName} · Ek-14 s. {target.sourcePage}</small>
                          <em>{target.indicatorText}</em>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend>2. Kanıtın rolü</legend>
                <div className="value-evidence-role-options">
                  {ROLE_OPTIONS.map((option) => (
                    <label key={option.value}>
                      <input
                        type="radio"
                        name={`value-evidence-role-${observationId}`}
                        value={option.value}
                        checked={evidenceRole === option.value}
                        onChange={() => setEvidenceRole(option.value)}
                        disabled={mutationDisabled}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="value-evidence-rationale">
                <label htmlFor={`value-evidence-rationale-${observationId}`}>
                  3. Öğretmen gerekçesi
                </label>
                <KeyboardTextarea
                  id={`value-evidence-rationale-${observationId}`}
                  value={rationale}
                  maxLength={1000}
                  rows={4}
                  disabled={mutationDisabled}
                  aria-describedby={`value-evidence-rationale-help-${observationId}`}
                  onChange={(event) =>
                    setRationale(event.target.value.replace(/[\r\n]+/g, " "))
                  }
                  placeholder="Gözlenen somut eylemin seçili rolle ilişkisini açıklayın; puan veya çocuk kişiliği hükmü yazmayın."
                />
                <small id={`value-evidence-rationale-help-${observationId}`}>
                  Ham gözlemi kopyalamayın. Tek satır, somut olay dili kullanın. {rationale.length}/1000
                </small>
              </div>

              <label className="value-evidence-explicit-confirmation">
                <input
                  type="checkbox"
                  checked={confirmationChecked}
                  disabled={mutationDisabled}
                  onChange={(event) => setConfirmationChecked(event.target.checked)}
                />
                <span>
                  Bu kaydın yalnız tek gözlem ile seçili resmî değer eylemi arasındaki
                  öğretmen yorumlu bağ olduğunu; puan, değer düzeyi, karakter, inanç,
                  mezhep veya ibadet hükmü olmadığını açıkça onaylıyorum.
                </span>
              </label>

              <div className="value-evidence-form-actions">
                {mode === "correct" ? (
                  <button type="button" onClick={resetCreateForm}>Düzeltmeden vazgeç</button>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    mutationDisabled ||
                    !selectedTarget ||
                    !evidenceRole ||
                    !rationale.trim() ||
                    !confirmationChecked
                  }
                >
                  {saving
                    ? "Kaydediliyor…"
                    : mode === "correct"
                      ? "Düzeltmeyi onayla"
                      : "Bağlantıyı öğretmen onayıyla kaydet"}
                </button>
              </div>
            </form>
          )}

          {model.historyLinks.length > 0 ? (
            <details className="value-evidence-history">
              <summary>Kaldırılmış ve düzeltilmiş geçmiş ({model.historyLinks.length})</summary>
              <ul>
                {model.historyLinks.map((link) => (
                  <li key={link.record.id}>
                    <strong>{link.target.targetValueCode} {link.target.valueName} · {link.target.targetIndicatorCode}</strong>
                    <span>{ROLE_LABELS[link.record.evidenceRole]}</span>
                    <p>{link.record.teacherRationale}</p>
                    <small>Kaldırılma: {displayDate(link.record.deletedAt ?? link.record.updatedAt)}</small>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default ValueEvidenceLinkEditor;
