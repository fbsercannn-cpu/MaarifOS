import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircledIcon, Cross2Icon, LockClosedIcon, MagicWandIcon } from "@radix-ui/react-icons";

import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { KeyboardTextarea } from "../../mobile";
import {
  applyDailyPlanReview,
  createLocalDailyPlanReview,
  generateDailyPlanReviewWithDeepSeek,
  type DailyPlanReviewCandidate,
  type DailyPlanReviewContent,
} from "./deepseek-plan-review.ts";
import "./deepseek-plan-review.css";

export interface DeepSeekPlanReviewDialogProps {
  readonly store: LocalDataStore;
  readonly planId: string;
  readonly onClose: () => void;
  readonly onSaved: (result: { planId: string; revisionNumber: number }) => void;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Plan inceleme işlemi tamamlanamadı.";
}

function contentFromCandidate(candidate: DailyPlanReviewCandidate): DailyPlanReviewContent {
  return {
    inclusiveAdaptation: candidate.inclusiveAdaptation,
    openEndedQuestions: [...candidate.openEndedQuestions],
    endOfDayEvaluation: candidate.endOfDayEvaluation,
    nextDaySuggestion: candidate.nextDaySuggestion,
  };
}

export function DeepSeekPlanReviewDialog({
  store,
  planId,
  onClose,
  onSaved,
}: DeepSeekPlanReviewDialogProps) {
  const [candidate, setCandidate] = useState<DailyPlanReviewCandidate | null>(null);
  const [draft, setDraft] = useState<DailyPlanReviewContent | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("Cihaz içi güvenli taslak hazırlanıyor…");
  const [error, setError] = useState("");
  const teacherEditedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const snapshot = await store.readSnapshot();
        const local = createLocalDailyPlanReview(snapshot, planId);
        if (!active) return;
        setCandidate(local);
        setDraft(contentFromCandidate(local));
        setBusy(false);
        setNotice("Cihaz içi taslak hazır. DeepSeek güvenli ağ geçidi deneniyor…");
        try {
          const generated = await generateDailyPlanReviewWithDeepSeek(snapshot, planId);
          if (!active) return;
          if (teacherEditedRef.current) {
            setNotice("DeepSeek yanıtı geldi; ancak düzenlemeye başladığınız cihaz içi taslak değiştirilmedi.");
            return;
          }
          setCandidate(generated);
          setDraft(contentFromCandidate(generated));
          setNotice("DeepSeek taslağı hazır. Metinleri düzenleyip açıkça onaylamadan plan değişmez.");
        } catch (reason) {
          if (!active) return;
          setError(errorText(reason));
          setNotice("DeepSeek kullanılamadı; cihaz içi taslak korunuyor ve düzenlenebilir.");
        }
      } catch (reason) {
        if (!active) return;
        setError(errorText(reason));
        setNotice("");
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [planId, store]);

  const update = <Key extends keyof DailyPlanReviewContent>(
    key: Key,
    value: DailyPlanReviewContent[Key],
  ) => {
    teacherEditedRef.current = true;
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setConfirmed(false);
    setError("");
  };

  const save = async () => {
    if (!candidate || !draft || !confirmed || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await applyDailyPlanReview(store, candidate, draft);
      onSaved({ planId: result.planId, revisionNumber: result.revisionNumber });
      onClose();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="deepseek-plan-review__overlay" />
        <Dialog.Content className="deepseek-plan-review" aria-describedby="deepseek-plan-review-description">
          <header className="deepseek-plan-review__header">
            <span className="deepseek-plan-review__icon" aria-hidden="true"><MagicWandIcon /></span>
            <span>
              <Dialog.Title>Günlük planı pedagojik olarak incele</Dialog.Title>
              <Dialog.Description id="deepseek-plan-review-description">
                Önerileri düzenleyin; yalnız açık onayınız gerçek plan revizyonu oluşturur.
              </Dialog.Description>
            </span>
            <Dialog.Close asChild>
              <button type="button" aria-label="Plan incelemesini kapat" disabled={saving}>
                <Cross2Icon />
              </button>
            </Dialog.Close>
          </header>

          <div className="deepseek-plan-review__privacy">
            <LockClosedIcon aria-hidden="true" />
            <span>{candidate?.privacyDisclosure ?? "Kişisel veri sınırı hazırlanıyor."}</span>
          </div>

          {busy && !draft ? <p className="deepseek-plan-review__loading" role="status">Plan okunuyor ve güvenli taslak hazırlanıyor…</p> : null}

          {draft ? (
            <div className="deepseek-plan-review__fields">
              <label>
                <span>Kapsayıcı uyarlama</span>
                <KeyboardTextarea
                  value={draft.inclusiveAdaptation}
                  onChange={(event) => update("inclusiveAdaptation", event.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </label>
              <label>
                <span>Açık uçlu sorular <small>Her satıra bir soru, 3-5 satır</small></span>
                <KeyboardTextarea
                  value={draft.openEndedQuestions.join("\n")}
                  onChange={(event) => update(
                    "openEndedQuestions",
                    event.target.value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).slice(0, 5),
                  )}
                  rows={6}
                  maxLength={900}
                />
              </label>
              <label>
                <span>Gün sonu değerlendirmesi</span>
                <KeyboardTextarea
                  value={draft.endOfDayEvaluation}
                  onChange={(event) => update("endOfDayEvaluation", event.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </label>
              <label>
                <span>Ertesi gün önerisi</span>
                <KeyboardTextarea
                  value={draft.nextDaySuggestion}
                  onChange={(event) => update("nextDaySuggestion", event.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </label>
            </div>
          ) : null}

          <p className="deepseek-plan-review__notice" role="status">{notice}</p>
          {error ? <p className="deepseek-plan-review__error" role="alert">{error}</p> : null}

          {draft && candidate ? (
            <footer className="deepseek-plan-review__footer">
              <label className="deepseek-plan-review__confirmation">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>Metinleri kontrol ettim; planın yeni revizyonuna eklenmesini onaylıyorum.</span>
              </label>
              <div>
                <button type="button" className="deepseek-plan-review__cancel" onClick={onClose} disabled={saving}>Vazgeç</button>
                <button
                  type="button"
                  className="deepseek-plan-review__save"
                  onClick={() => void save()}
                  disabled={!confirmed || saving || busy}
                >
                  <CheckCircledIcon aria-hidden="true" />
                  {saving ? "Revizyon kaydediliyor…" : "Plan revizyonunu kaydet"}
                </button>
              </div>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
