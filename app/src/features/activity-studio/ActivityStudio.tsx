import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BackpackIcon,
  CheckIcon,
  Cross2Icon,
  CubeIcon,
  FileTextIcon,
  GlobeIcon,
  LapTimerIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlayIcon,
  PlusIcon,
  ScissorsIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";

import {
  ACTIVITY_STUDIO_AGE_BANDS,
  ACTIVITY_STUDIO_AGE_LABELS,
  ACTIVITY_STUDIO_CATEGORY_IDS,
  ACTIVITY_STUDIO_CATEGORY_LABELS,
  ACTIVITY_STUDIO_COLLECTIONS,
  ACTIVITY_STUDIO_ITEMS,
  createActivityStudioChildSession,
  filterActivityStudioItems,
  type ActivityStudioAgeBand,
  type ActivityStudioCategory,
  type ActivityStudioCategoryFilter,
  type ActivityStudioCollectionFilter,
  type ActivityStudioChildChoice,
  type ActivityStudioChildSession,
  type ActivityStudioItem,
} from "./activity-studio-model.ts";
import {
  ACTIVITY_YEAR_MONTH_LENSES,
  ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT,
  ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY,
} from "./activity-year-program.ts";
import {
  renderActivityStudioPrintable,
  type ActivityStudioPrintable,
} from "./printable-templates.ts";
import { ActivityDrawingPad } from "./ActivityDrawingPad.tsx";
import {
  activityStudioDrawingPadMode,
  type ActivityDrawingPadEvidence,
} from "./drawing-pad-model.ts";
import {
  PARTICIPATION_ROUTES,
  PEDAGOGICAL_SCENARIOS,
  PEDAGOGICAL_VARIANT_COUNT,
  createActivityContextAdaptation,
  type ParticipationRouteId,
  type PedagogicalScenarioId,
} from "../pedagogical-os/pedagogical-orchestrator.ts";
import { KeyboardInput } from "../../mobile";
import "./activity-studio.css";

type ControllerResult = void | Promise<void>;

export interface ActivityStudioContext {
  readonly ageBand: ActivityStudioAgeBand;
  readonly ageLabel: string;
  readonly scenarioId: PedagogicalScenarioId;
  readonly participationRouteId: ParticipationRouteId;
}

export interface ActivityStudioPrintRequest extends ActivityStudioContext {
  readonly activity: ActivityStudioItem;
  readonly printable: ActivityStudioPrintable;
}

export interface ActivityStudioChildChoiceRequest
  extends ActivityStudioContext {
  readonly activity: ActivityStudioItem;
  readonly session: ActivityStudioChildSession;
  readonly choice: ActivityStudioChildChoice | null;
}

export interface ActivityStudioObservationRequest
  extends ActivityStudioContext {
  readonly activity: ActivityStudioItem;
  readonly session: ActivityStudioChildSession;
  readonly choice: ActivityStudioChildChoice | null;
  readonly drawingEvidence: ActivityDrawingPadEvidence | null;
}

export interface ActivityStudioProps {
  initialAgeBand?: ActivityStudioAgeBand;
  initialActivityId?: string;
  initialScenarioId?: PedagogicalScenarioId;
  initialCollection?: ActivityStudioCollectionFilter;
  onAddToPlan(
    activity: ActivityStudioItem,
    context: ActivityStudioContext,
  ): ControllerResult;
  onApply(
    activity: ActivityStudioItem,
    context: ActivityStudioContext,
  ): ControllerResult;
  onPrint(request: ActivityStudioPrintRequest): ControllerResult;
  onChildChoice?(request: ActivityStudioChildChoiceRequest): ControllerResult;
  onWriteObservation?(request: ActivityStudioObservationRequest): ControllerResult;
  emptyStateAction?: ReactNode;
}

function CategoryIcon({ category }: { category: ActivityStudioCategory }) {
  if (category === "oyun") return <MagicWandIcon aria-hidden="true" />;
  if (category === "cizim") return <Pencil1Icon aria-hidden="true" />;
  if (category === "boyama") return <SewingPinIcon aria-hidden="true" />;
  if (category === "kes-yapistir") return <ScissorsIcon aria-hidden="true" />;
  if (category === "hareket") return <LapTimerIcon aria-hidden="true" />;
  if (category === "acik-hava") return <GlobeIcon aria-hidden="true" />;
  return <CubeIcon aria-hidden="true" />;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "İşlem tamamlanamadı. Öğretmen ekranında yeniden deneyin.";
}

export function ActivityStudio({
  initialAgeBand = "48-60",
  initialActivityId,
  initialScenarioId = "balanced",
  initialCollection = "tumu",
  onAddToPlan,
  onApply,
  onPrint,
  onChildChoice,
  onWriteObservation,
  emptyStateAction,
}: ActivityStudioProps) {
  const componentId = useId();
  const headingId = `${componentId}-heading`;
  const statusId = `${componentId}-status`;
  const [ageBand, setAgeBand] =
    useState<ActivityStudioAgeBand>(initialAgeBand);
  const [category, setCategory] =
    useState<ActivityStudioCategoryFilter>("tumu");
  const [collection, setCollection] =
    useState<ActivityStudioCollectionFilter>(initialCollection);
  const [query, setQuery] = useState(() =>
    ACTIVITY_STUDIO_ITEMS.find((item) => item.id === initialActivityId)?.title ?? "",
  );
  const [scenarioId, setScenarioId] =
    useState<PedagogicalScenarioId>(initialScenarioId);
  const [participationRouteId, setParticipationRouteId] =
    useState<ParticipationRouteId>("multiple");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [childActivityId, setChildActivityId] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [drawingEvidence, setDrawingEvidence] =
    useState<ActivityDrawingPadEvidence | null>(null);
  const [observationReturnActivityId, setObservationReturnActivityId] =
    useState<string | null>(null);
  const childHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const childModeReturnFocusRef = useRef<HTMLElement | null>(null);
  const childModeReturnActivityIdRef = useRef<string | null>(null);
  const childModeWasOpenRef = useRef(false);

  const activities = useMemo(
    () => filterActivityStudioItems({ ageBand, category, collection, query }),
    [ageBand, category, collection, query],
  );
  const childActivity = childActivityId
    ? activities.find((activity) => activity.id === childActivityId) ?? null
    : null;
  const childSession = childActivity
    ? createActivityStudioChildSession(childActivity.id, ageBand)
    : null;
  const context: ActivityStudioContext = {
    ageBand,
    ageLabel: ACTIVITY_STUDIO_AGE_LABELS[ageBand],
    scenarioId,
    participationRouteId,
  };

  const childModeOpen = Boolean(childActivity && childSession);

  useEffect(() => {
    const wasOpen = childModeWasOpenRef.current;
    childModeWasOpenRef.current = childModeOpen;

    if (childModeOpen && !wasOpen) {
      const frame = window.requestAnimationFrame(() => {
        childHeadingRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (!childModeOpen && wasOpen) {
      const returnTarget = childModeReturnFocusRef.current;
      const returnActivityId = childModeReturnActivityIdRef.current;
      if (observationReturnActivityId) return;
      childModeReturnFocusRef.current = null;
      childModeReturnActivityIdRef.current = null;
      const frame = window.requestAnimationFrame(() => {
        const remountedTarget = returnActivityId
          ? Array.from(
              document.querySelectorAll<HTMLElement>(
                "[data-activity-child-trigger]",
              ),
            ).find(
              (element) =>
                element.dataset.activityChildTrigger === returnActivityId,
            )
          : null;
        const focusTarget = returnTarget?.isConnected
          ? returnTarget
          : remountedTarget;
        focusTarget?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [childModeOpen, observationReturnActivityId]);

  const runCardAction = async (
    kind: "plan" | "apply" | "print",
    activity: ActivityStudioItem,
  ) => {
    const actionKey = `${kind}:${activity.id}`;
    if (kind === "apply" && document.activeElement instanceof HTMLElement) {
      childModeReturnFocusRef.current = document.activeElement;
      childModeReturnActivityIdRef.current = activity.id;
      setObservationReturnActivityId(null);
    }
    setBusyAction(actionKey);
    setErrorMessage(null);
    try {
      if (kind === "plan") {
        await onAddToPlan(activity, context);
      } else if (kind === "print") {
        await onPrint({
          activity,
          ...context,
          printable: renderActivityStudioPrintable(activity, ageBand),
        });
      } else {
        await onApply(activity, context);
        setSelectedChoiceId(null);
        setDrawingEvidence(null);
        setChildActivityId(activity.id);
      }
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const submitChildChoice = async (
    choice: ActivityStudioChildChoice | null,
  ) => {
    if (!childActivity || !childSession) return;
    setErrorMessage(null);
    setSelectedChoiceId(choice?.id ?? null);
    try {
      await onChildChoice?.({
        activity: childActivity,
        session: childSession,
        choice,
        ...context,
      });
    } catch (error) {
      setErrorMessage(messageFromError(error));
    }
  };

  const leaveChildMode = async (writeObservation = false) => {
    if (!childActivity || !childSession) return;
    const actionKey = writeObservation
      ? `observation:${childActivity.id}`
      : `teacher:${childActivity.id}`;
    setBusyAction(actionKey);
    setErrorMessage(null);
    try {
      if (writeObservation) {
        const selectedChoice =
          childSession.choices.find((choice) => choice.id === selectedChoiceId) ??
          null;
        await onWriteObservation?.({
          activity: childActivity,
          session: childSession,
          choice: selectedChoice,
          drawingEvidence,
          ...context,
        });
        setObservationReturnActivityId(childActivity.id);
      } else {
        setObservationReturnActivityId(null);
      }
      setChildActivityId(null);
      setSelectedChoiceId(null);
      setDrawingEvidence(null);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setBusyAction(null);
    }
  };

  if (childActivity && childSession) {
    const drawingPadMode = activityStudioDrawingPadMode(childActivity);
    return (
      <main
        className="activity-child-mode"
        aria-labelledby={`${componentId}-child-heading`}
      >
        <header className="activity-child-mode__header">
          <div>
            <span className="activity-child-mode__supervision">
              <BackpackIcon aria-hidden="true" />
              Yetişkin eşliği açık
            </span>
            <h1
              id={`${componentId}-child-heading`}
              ref={childHeadingRef}
              tabIndex={-1}
            >
              {childActivity.title}
            </h1>
            <p>{childSession.ageLabel} · Puan yok, yarışma yok.</p>
          </div>
          <button
            type="button"
            className="activity-child-mode__exit"
            disabled={busyAction !== null}
            onClick={() => void leaveChildMode()}
            aria-label="Çocuk Modundan öğretmen ekranına dön"
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </header>

        <section
          className="activity-child-mode__task"
          aria-labelledby={`${componentId}-child-task-title`}
        >
          <span className="activity-child-mode__step">Birlikte seçelim</span>
          <h2 id={`${componentId}-child-task-title`}>{childSession.title}</h2>
          <p className="activity-child-mode__prompt">
            {childSession.childPrompt}
          </p>
          {drawingPadMode ? (
            <ActivityDrawingPad
              key={childActivity.id}
              activityTitle={childActivity.title}
              mode={drawingPadMode}
              onEvidenceChange={setDrawingEvidence}
            />
          ) : null}
          {drawingPadMode ? (
            <span className="activity-child-mode__step">
              İstersen bir seçim de yap
            </span>
          ) : null}
          <div className="activity-child-mode__choices">
            {childSession.choices.map((choice) => {
              const selected = selectedChoiceId === choice.id;
              return (
                <button
                  type="button"
                  key={choice.id}
                  className="activity-child-mode__choice"
                  aria-pressed={selected}
                  onClick={() => void submitChildChoice(choice)}
                >
                  <span>{choice.label}</span>
                  {selected ? <CheckIcon aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <p className="activity-child-mode__change-note">
            Seçimini değiştirebilir veya pas geçebilirsin.
          </p>
        </section>

        <aside className="activity-child-mode__adult-note">
          <strong>Öğretmene not</strong>
          <p>{childSession.adultFacilitation}</p>
          <p>{childSession.notice}</p>
        </aside>

        {errorMessage ? (
          <p className="activity-studio__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="activity-child-mode__footer">
          <button
            type="button"
            className="activity-child-mode__observation-button"
            disabled={busyAction !== null}
            onClick={() => void leaveChildMode(true)}
          >
            <Pencil1Icon aria-hidden="true" />
            {busyAction === `observation:${childActivity.id}`
              ? "Gözlem açılıyor"
              : "Bu etkinlik için gözlem yaz"}
          </button>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void submitChildChoice(null)}
          >
            Pas geç
          </button>
          <button
            type="button"
            className="activity-child-mode__teacher-button"
            disabled={busyAction !== null}
            onClick={() => void leaveChildMode()}
          >
            Öğretmene dön
          </button>
        </footer>
      </main>
    );
  }

  return (
    <main className="activity-studio" aria-labelledby={headingId}>
      <header className="activity-studio__header">
        <div className="activity-studio__header-icon" aria-hidden="true">
          <MagicWandIcon />
        </div>
        <div>
          <span className="activity-studio__kicker">Hazırla · uygula · yazdır</span>
          <h1 id={headingId}>Etkinlik ve Materyal Stüdyosu</h1>
          <p>Temel etkinliği sınıfın koşuluna, katılım yoluna ve yaşa göre dönüştür; planla, uygula ve gözleme bağla.</p>
          <div className="activity-studio__inventory" aria-label="İçerik envanteri">
            <span><strong>{ACTIVITY_STUDIO_ITEMS.length}</strong> özgün etkinlik</span>
            <span><strong>{PEDAGOGICAL_VARIANT_COUNT.toLocaleString("tr-TR")}</strong> uygulama yolu</span>
            <span><strong>{ACTIVITY_YEAR_SCHOOL_DAY_CAPACITY}</strong> günlük rotasyon</span>
            <span><strong>{ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT}</strong> yıllık öneri yuvası</span>
            <span><strong>{ACTIVITY_YEAR_MONTH_LENSES.length}</strong> aylık odak</span>
          </div>
        </div>
      </header>

      <section className="activity-studio__filters" aria-label="Etkinlik filtreleri">
        <label className="activity-studio__search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <span className="sr-only">Etkinliklerde ara</span>
          <KeyboardInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Etkinlik, malzeme veya TYMM alanı ara"
          />
        </label>

        <fieldset className="activity-studio__context-fieldset">
          <legend>Sınıfın bugünkü koşulu</legend>
          <p>Seçim, bütün kartların ortamını, hızını, malzemesini ve güvenlik kontrolünü yeniden kurar.</p>
          <div className="activity-studio__scenario-options">
            {PEDAGOGICAL_SCENARIOS.map((scenario) => (
              <button
                type="button"
                key={scenario.id}
                aria-pressed={scenarioId === scenario.id}
                title={scenario.description}
                onClick={() => setScenarioId(scenario.id)}
              >
                {scenario.shortLabel}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="activity-studio__context-fieldset">
          <legend>Öne çıkarılan katılım yolu</legend>
          <div className="activity-studio__participation-options">
            {PARTICIPATION_ROUTES.map((route) => (
              <button
                type="button"
                key={route.id}
                aria-pressed={participationRouteId === route.id}
                title={route.instruction}
                onClick={() => setParticipationRouteId(route.id)}
              >
                {route.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Hazır koleksiyonlar</legend>
          <div className="activity-studio__collection-options">
            <button
              type="button"
              aria-pressed={collection === "tumu"}
              onClick={() => setCollection("tumu")}
            >
              Tüm koleksiyonlar
            </button>
            {ACTIVITY_STUDIO_COLLECTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-pressed={collection === option.id}
                title={option.detail}
                onClick={() => setCollection(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Yaş grubu</legend>
          <div className="activity-studio__age-options">
            {ACTIVITY_STUDIO_AGE_BANDS.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={ageBand === option}
                onClick={() => {
                  setAgeBand(option);
                  setChildActivityId(null);
                  setDrawingEvidence(null);
                }}
              >
                {ACTIVITY_STUDIO_AGE_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Etkinlik türü</legend>
          <div className="activity-studio__category-options">
            <button
              type="button"
              aria-pressed={category === "tumu"}
              onClick={() => setCategory("tumu")}
            >
              Tümü
            </button>
            {ACTIVITY_STUDIO_CATEGORY_IDS.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={category === option}
                onClick={() => setCategory(option)}
              >
                {ACTIVITY_STUDIO_CATEGORY_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <p id={statusId} className="activity-studio__result-count" role="status">
        <strong>{activities.length}</strong> uygun etkinlik
        <span>
          {ACTIVITY_STUDIO_AGE_LABELS[ageBand]}
          {collection !== "tumu"
            ? ` · ${ACTIVITY_STUDIO_COLLECTIONS.find((item) => item.id === collection)?.label}`
            : ""}
          {` · ${PEDAGOGICAL_SCENARIOS.find((item) => item.id === scenarioId)?.shortLabel}`}
        </span>
      </p>

      {errorMessage ? (
        <p className="activity-studio__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section
        className="activity-studio__grid"
        aria-label="Uygun etkinlikler"
        aria-describedby={statusId}
      >
        {activities.map((activity) => {
          const ageNote = activity.ageAdaptations[ageBand];
          const categoryLabel =
            ACTIVITY_STUDIO_CATEGORY_LABELS[activity.category];
          const adaptation = createActivityContextAdaptation({
            activity,
            ageBand,
            scenarioId,
            participationRouteId,
          });
          return (
            <article
              className="activity-card"
              key={activity.id}
              data-activity-id={activity.id}
            >
              <header className="activity-card__header">
                <div className="activity-card__category-icon">
                  <CategoryIcon category={activity.category} />
                </div>
                <div>
                  <span className="activity-card__category">{categoryLabel}</span>
                  <h2>{activity.title}</h2>
                </div>
                <span className="activity-card__duration">
                  <LapTimerIcon aria-hidden="true" />
                  {activity.durationMinutes} dk
                </span>
              </header>

              <p className="activity-card__prompt">{activity.teacherPrompt}</p>
              <p className="activity-card__age-note">
                <strong>{ACTIVITY_STUDIO_AGE_LABELS[ageBand]}:</strong> {ageNote}
              </p>

              <dl className="activity-card__details">
                <div>
                  <dt>Ortam</dt>
                  <dd>{activity.environment}</dd>
                </div>
                <div>
                  <dt>TYMM alanı</dt>
                  <dd>{activity.tymmDomains.join(", ")}</dd>
                </div>
                <div>
                  <dt>Malzeme</dt>
                  <dd>{activity.materials.join(", ")}</dd>
                </div>
                <div>
                  <dt>Hazırlık</dt>
                  <dd>{activity.preparationMinutes} dk</dd>
                </div>
              </dl>

              <details className="activity-card__guide">
                <summary>Öğretmen uygulama rehberi</summary>
                <div className="activity-card__guide-body">
                  <ol>
                    {activity.teacherSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <dl>
                    <div>
                      <dt>Katılım uyarlaması</dt>
                      <dd>{activity.inclusionNote}</dd>
                    </div>
                    <div>
                      <dt>Gözlem odağı</dt>
                      <dd>{activity.observationPrompt}</dd>
                    </div>
                    <div>
                      <dt>Aileye uzatma</dt>
                      <dd>{activity.familyExtension}</dd>
                    </div>
                  </dl>
                </div>
              </details>

              <details className="activity-card__adaptation">
                <summary aria-label={`${activity.title} için bağlamsal uyarlamayı aç`}>
                  <span><small>CANLI UYARLAMA</small><strong>{adaptation.scenario.label}</strong></span>
                  <b>{adaptation.participationRoute.label}</b>
                </summary>
                <dl>
                  <div><dt>Ortamı kur</dt><dd>{adaptation.setup}</dd></div>
                  <div><dt>Malzemeyi değiştir</dt><dd>{adaptation.materialSwap}</dd></div>
                  <div><dt>Kolaylaştır</dt><dd>{adaptation.facilitation}</dd></div>
                  <div><dt>Kanıtı yakala</dt><dd>{adaptation.evidencePrompt}</dd></div>
                  <div><dt>Aile köprüsü</dt><dd>{adaptation.familyBridge}</dd></div>
                  <div><dt>Güvenlik</dt><dd>{adaptation.safetyCheck}</dd></div>
                </dl>
              </details>

              <div className="activity-card__actions">
                <button
                  type="button"
                  className="activity-card__primary-action"
                  disabled={busyAction !== null}
                  onClick={() => void runCardAction("plan", activity)}
                  aria-label={`${activity.title} etkinliğini planıma ekle`}
                >
                  <PlusIcon aria-hidden="true" />
                  {busyAction === `plan:${activity.id}`
                    ? "Ekleniyor"
                    : "Planıma ekle"}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  data-activity-child-trigger={activity.id}
                  data-activity-observation-return={
                    observationReturnActivityId === activity.id ? "true" : undefined
                  }
                  onFocus={() => {
                    if (observationReturnActivityId !== activity.id) return;
                    childModeReturnFocusRef.current = null;
                    childModeReturnActivityIdRef.current = null;
                    setObservationReturnActivityId(null);
                  }}
                  onClick={() => void runCardAction("apply", activity)}
                  aria-label={`${activity.title} etkinliğini Çocuk Modunda uygula`}
                >
                  <PlayIcon aria-hidden="true" />
                  {busyAction === `apply:${activity.id}` ? "Açılıyor" : "Uygula"}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void runCardAction("print", activity)}
                  aria-label={`${activity.title} materyalini yazdır`}
                >
                  <FileTextIcon aria-hidden="true" />
                  {busyAction === `print:${activity.id}` ? "Hazırlanıyor" : "Yazdır"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {activities.length === 0 ? (
        <section className="activity-studio__empty" role="status">
          <Pencil1Icon aria-hidden="true" />
          <h2>Bu seçimde etkinlik yok</h2>
          <p>Başka bir etkinlik türüne dokunarak devam edebilirsin.</p>
          {emptyStateAction}
        </section>
      ) : null}

      <p className="activity-studio__provenance">
        Etkinlikler MaarifOS tarafından özgün hazırlanır; resmî MEB etkinliği veya
        değerlendirme aracı değildir. Çocuk Modu puansız ve yetişkin eşliğindedir.
      </p>
    </main>
  );
}
