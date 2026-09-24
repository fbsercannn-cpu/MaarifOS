import { ChevronRightIcon, CheckCircledIcon, CircleIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { TeacherFeedbackPanel } from "../feedback/TeacherFeedbackPanel.tsx";
import {
  createTeacherFeedback,
  type TeacherFeedback,
} from "../feedback/teacher-feedback.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../teacher-followup/teacher-followup-service.ts";
import { DAY_EXIT_PACKAGE_CHANGED_EVENT } from "../day-exit-package/day-exit-package-service.ts";
import { HOME_GAME_CARDS_CHANGED } from "../home-game-cards/home-game-card-service.ts";
import { SMALL_GROUP_CARDS_CHANGED_EVENT } from "../small-group-cards/small-group-card-service.ts";
import {
  loadTomorrowReadyModel,
  type TomorrowReadyItem,
  type TomorrowReadyModel,
} from "./tomorrow-ready-model.ts";
import { saveTomorrowPreparation } from "./tomorrow-ready-service.ts";
import "./tomorrow-ready.css";

export interface TomorrowReadyCardProps {
  readonly store: LocalDataStore;
  readonly civilDate: string;
  readonly refreshKey?: string | number;
  readonly disabled?: boolean;
  readonly onChanged?: () => void;
  readonly onOpenPlan?: (planId: string) => void;
  readonly onOpenPlanning?: (civilDate: string) => void;
  readonly onOpenSmallGroups?: (civilDate: string) => void;
  readonly onOpenHomeGames?: (civilDate: string) => void;
  readonly onOpenDuties?: (kind: "fruit", scheduleId?: string, civilDate?: string) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function dateLabel(civilDate: string): string {
  return DATE_FORMAT.format(new Date(`${civilDate}T12:00:00.000Z`));
}

function actionLabel(item: TomorrowReadyItem): string | null {
  if (item.id === "plan") return item.state === "ready" ? "Planı aç" : "Planı hazırla";
  if (item.id === "materials" && item.state === "needs-action") return "Materyalleri hazırlığa al";
  if (item.id === "small-group") return item.state === "ready" ? "Grubu aç" : "Küçük grubu hazırla";
  if (item.id === "fruit") return item.state === "ready" ? "Görevi aç" : "Meyve gününü hazırla";
  if (item.id === "family-card") return item.state === "ready" ? "Kartları aç" : "Aile kartını hazırla";
  return null;
}

export function TomorrowReadyCard({
  store,
  civilDate,
  refreshKey,
  disabled = false,
  onChanged,
  onOpenPlan,
  onOpenPlanning,
  onOpenSmallGroups,
  onOpenHomeGames,
  onOpenDuties,
}: TomorrowReadyCardProps) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<TomorrowReadyModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const writeLock = useRef(false);

  async function read(options: { preserveMessage?: boolean } = {}) {
    const token = ++generation.current;
    setLoading(true);
    try {
      const next = await loadTomorrowReadyModel(store, { civilDate });
      if (token !== generation.current) return;
      setModel(next);
      setFeedback(null);
      if (!options.preserveMessage) setMessage("");
    } catch (reason) {
      if (token !== generation.current) return;
      setModel(null);
      setFeedback(createTeacherFeedback(reason, {
        fallbackDetail: "Sonraki öğretim günü hazırlığı bu cihazdan okunamadı. Güncel kayıtları yeniden açın.",
      }));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }

  useEffect(() => {
    setOpen(false);
    void read();
    return () => { generation.current += 1; };
  }, [store, civilDate, refreshKey]);

  useEffect(() => {
    const changed = () => void read({ preserveMessage: true });
    const events = [
      FOLLOWUP_CHANGED_EVENT,
      DAY_EXIT_PACKAGE_CHANGED_EVENT,
      HOME_GAME_CARDS_CHANGED,
      SMALL_GROUP_CARDS_CHANGED_EVENT,
    ];
    for (const name of events) window.addEventListener(name, changed);
    return () => {
      for (const name of events) window.removeEventListener(name, changed);
    };
  }, [store, civilDate]);

  async function prepareMaterials() {
    if (
      !model?.nextTeachingDate ||
      !model.preparationSourceFingerprint ||
      !model.pendingPreparationSourceIds.length ||
      model.sourceCivilDate !== model.today ||
      disabled ||
      saving ||
      writeLock.current
    ) return;
    writeLock.current = true;
    setSaving(true);
    setFeedback(null);
    setMessage("");
    let committed = false;
    try {
      const result = await saveTomorrowPreparation(store, {
        sourceCivilDate: model.sourceCivilDate,
        sourceIds: model.pendingPreparationSourceIds,
        expectedSourceFingerprint: model.preparationSourceFingerprint,
      });
      committed = true;
      setMessage(result.changed
        ? `${result.itemCount} gerçek materyal veya hazırlık maddesi kaydedildi.`
        : "Bu kaynakların hazırlığı zaten kayıtlı; ikinci liste oluşturulmadı.");
      await read({ preserveMessage: true });
      onChanged?.();
    } catch (reason) {
      const failure = createTeacherFeedback(reason, {
        fallbackDetail: committed
          ? "Hazırlık kaydedildi; ekran yeniden okunamadı. Güncel kayıtları açın."
          : "Hazırlık kaydedilemedi. Kaynaklar değişmeden korunuyor; güncel kartı yeniden açın.",
      });
      await read({ preserveMessage: true }).catch(() => undefined);
      setFeedback(failure);
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }

  function runAction(entry: TomorrowReadyItem) {
    if (!model?.nextTeachingDate) return;
    if (entry.id === "plan") {
      const planId = model.planIds[0];
      if (planId && entry.state === "ready") onOpenPlan?.(planId);
      else onOpenPlanning?.(model.nextTeachingDate);
    } else if (entry.id === "materials") {
      void prepareMaterials();
    } else if (entry.id === "small-group") {
      onOpenSmallGroups?.(model.nextTeachingDate);
    } else if (entry.id === "fruit") {
      onOpenDuties?.("fruit", model.fruitScheduleId ?? undefined, model.nextTeachingDate);
    } else {
      onOpenHomeGames?.(model.nextTeachingDate);
    }
  }

  const targetLabel = model?.nextTeachingDate ? dateLabel(model.nextTeachingDate) : "Dönem sonu";
  return (
    <section className="tomorrow-ready" aria-label="Sonraki öğretim günü hazırlığı" aria-busy={loading || saving}>
      <button
        type="button"
        className="tomorrow-ready__summary"
        aria-expanded={open}
        aria-controls="tomorrow-ready-details"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <small>SONRAKİ ÖĞRETİM GÜNÜ</small>
          <strong>Sonraki öğretim günü hazır mı?</strong>
          <span>{loading && !model ? "Gerçek kayıtlar okunuyor…" : targetLabel}</span>
        </span>
        <b>{model ? `${model.readyCount}/5 hazır` : "—"}</b>
        <ChevronRightIcon aria-hidden="true" />
      </button>

      {open ? (
        <div id="tomorrow-ready-details" className="tomorrow-ready__details">
          {feedback ? <TeacherFeedbackPanel feedback={feedback} compact onAction={() => void read()} /> : null}
          {message ? <p className="tomorrow-ready__success" role="status">{message}</p> : null}
          {model?.nextTeachingDate ? (
            <>
              <p className="tomorrow-ready__context">
                <strong>{dateLabel(model.nextTeachingDate)}</strong>
                <span>{model.nextTeachingDayLabel}</span>
              </p>
              <ul>
                {model.items.map((entry) => {
                  const label = actionLabel(entry);
                  const callbackAvailable = entry.id === "materials"
                    ? model.pendingPreparationSourceIds.length > 0 && model.sourceCivilDate === model.today
                    : entry.id === "plan"
                      ? (entry.state === "ready" ? Boolean(onOpenPlan) : Boolean(onOpenPlanning))
                      : entry.id === "small-group"
                        ? Boolean(onOpenSmallGroups)
                        : entry.id === "fruit"
                          ? Boolean(onOpenDuties)
                          : Boolean(onOpenHomeGames);
                  return (
                    <li key={entry.id} data-state={entry.state}>
                      <span className="tomorrow-ready__state" aria-hidden="true">
                        {entry.state === "ready" ? <CheckCircledIcon /> : <CircleIcon />}
                      </span>
                      <span><strong>{entry.title}</strong><small>{entry.detail}</small></span>
                      {label && callbackAvailable ? (
                        <button
                          type="button"
                          disabled={disabled || saving}
                          onClick={() => runAction(entry)}
                        >
                          {entry.id === "materials" && saving ? "Kaydediliyor…" : label}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : model ? (
            <p>Eğitim yılı içinde hazırlanacak başka öğretim günü bulunmuyor.</p>
          ) : loading ? (
            <p role="status">Sonraki gün hazırlanıyor…</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
