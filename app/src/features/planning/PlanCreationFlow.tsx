import { useMemo, useState } from "react";
import {
  CheckCircledIcon,
  ChevronDownIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import {
  Carousel,
  FlowStack,
  KeyboardInput,
  MobileScroll,
  type FlowControls,
  type FlowScreen,
} from "../../mobile";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { isLocalTime } from "../../core/domain/classroom.ts";
import type { DashboardStudent as Student } from "../dashboard/dashboard-data";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow";
import {
  createPremiumDailyFlowDraft,
  type PremiumDailyFlowBlockDraft,
  type PremiumDailyTemplateSelection,
} from "../premium-plans/domain.ts";
import {
  CURRICULUM_TARGET_KIND_LABELS,
  curriculumAgeBandFromLabel,
  curriculumTargetsForProfile,
  type CurriculumAssignmentMode,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog";
import {
  PRESCHOOL_ACTIVITY_AREAS,
  PRESCHOOL_ACTIVITY_SUGGESTIONS,
  type PreschoolActivityArea,
} from "./activity-suggestions";
import type { ScheduledPlanEditDraft } from "./scheduled-plan-workspace.ts";

function formatTurkishCivilDate(civilDate: string) {
  if (!isCivilDate(civilDate)) return "Plan tarihini YYYY-AA-GG biçiminde yazın";
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
  }).format(date);
  return `${dateLabel}, ${weekday.slice(0, 1).toLocaleUpperCase("tr-TR")}${weekday.slice(1)}`;
}

function curriculumDisplayLabel(profile: CurriculumProfileSnapshot): string {
  return profile.framework === "meb_2024"
    ? "Okul Öncesi Eğitim Programı — EÇE/2024"
    : "Türkiye Yüzyılı Maarif Modeli";
}

function createFlowHeader(title: string, step: string, onClose: () => void) {
  return (flow: FlowControls) => (
    <div className="d1-flow-header">
      <div>
        <small>{step}</small>
        <strong>{title}</strong>
      </div>
      <button type="button" onClick={onClose} aria-label={`${flow.current.title ?? title} akışını kapat`}>
        <Cross2Icon aria-hidden="true" />
      </button>
    </div>
  );
}

export type PlanCreationCommand = {
  civilDate: string;
  planId: string;
  activityId: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignmentMode: CurriculumAssignmentMode;
  studentIds: string[];
  premiumSource?: PremiumDailyTemplateSelection;
  premiumDailyFlowBlocks?: PremiumDailyFlowBlockDraft[];
  premiumAlternativeActivated?: boolean;
};

export type PlanUpdateCommand = {
  planId: string;
  activityId: string;
  expectedPlanUpdatedAt: string;
  expectedActivityUpdatedAt: string;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  premiumDailyFlowBlocks?: PremiumDailyFlowBlockDraft[];
};

export function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
  onUpdate,
  initialTemplate,
  initialEdit,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onUpdate?: (command: PlanUpdateCommand) => Promise<void>;
  initialTemplate?: PremiumDailyTemplateSelection;
  initialEdit?: ScheduledPlanEditDraft;
}) {
  const [ids] = useState(() => ({
    planId: initialEdit?.planId ?? crypto.randomUUID(),
    activityId: initialEdit?.activityId ?? crypto.randomUUID(),
  }));
  const [planTitle, setPlanTitle] = useState(
    initialEdit?.planTitle ?? initialTemplate?.planTitle ?? "Günlük öğrenme planı",
  );
  const [activityTitle, setActivityTitle] = useState(
    initialEdit?.activityTitle ?? initialTemplate?.activityTitle ?? "",
  );
  const [startTime, setStartTime] = useState(initialEdit?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(
    initialEdit ? initialEdit.endTime ?? "" : defaultEndTime,
  );
  const [planCivilDate, setPlanCivilDate] = useState(
    initialEdit?.civilDate ?? initialTemplate?.activitySnapshot.recommendedCivilDate ?? civilDate,
  );
  const [premiumDailyFlowBlocks, setPremiumDailyFlowBlocks] = useState<
    PremiumDailyFlowBlockDraft[]
  >(() =>
    initialEdit
      ? structuredClone(initialEdit.flowBlocks)
      : initialTemplate
        ? createPremiumDailyFlowDraft(initialTemplate.fullDayFlow)
        : [],
  );
  const [premiumAlternativeActivated, setPremiumAlternativeActivated] =
    useState(false);
  const [suggestionArea, setSuggestionArea] =
    useState<PreschoolActivityArea>("all");
  const curriculumAgeBand = curriculumAgeBandFromLabel(ageGroup);
  const availableTargets = useMemo(
    () =>
      curriculumTargetsForProfile(
        curriculumProfile,
        curriculumAgeBand ?? undefined,
      ),
    [curriculumAgeBand, curriculumProfile],
  );
  const [targetQuery, setTargetQuery] = useState("");
  const [targetDomain, setTargetDomain] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => {
    const initialCodes = new Set(
      initialEdit?.curriculumTargets.map((target) => target.referenceCode) ??
        initialTemplate?.targetCodes ??
        [],
    );
    return availableTargets
      .filter((target) => initialCodes.has(target.referenceCode))
      .map((target) => target.id);
  });
  const [assignmentMode, setAssignmentMode] =
    useState<CurriculumAssignmentMode>(initialEdit?.assignmentMode ?? "whole-class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    initialEdit?.studentIds ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const targetDomains = useMemo(
    () => Array.from(new Set(availableTargets.map((target) => target.domain))),
    [availableTargets],
  );
  const visibleTargets = useMemo(() => {
    const query = targetQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query && !targetDomain) return [];
    return availableTargets
      .filter(
        (target) =>
          !targetDomain || target.domain === targetDomain,
      )
      .filter(
        (target) =>
          !query ||
          [
            target.referenceCode,
            target.referenceTitle,
            target.domain,
            CURRICULUM_TARGET_KIND_LABELS[target.kind],
          ]
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(query),
      )
      .slice(0, 16);
  }, [availableTargets, targetDomain, targetQuery]);
  const selectedTargets = initialEdit?.curriculumTargets ?? availableTargets.filter((target) =>
    selectedTargetIds.includes(target.id),
  );
  const visibleActivitySuggestions = useMemo(
    () =>
      suggestionArea === "all"
        ? PRESCHOOL_ACTIVITY_SUGGESTIONS
        : PRESCHOOL_ACTIVITY_SUGGESTIONS.filter(
            (suggestion) => suggestion.area === suggestionArea,
          ),
    [suggestionArea],
  );
  const selectedActivitySuggestion = PRESCHOOL_ACTIVITY_SUGGESTIONS.find(
    (suggestion) => suggestion.title === activityTitle,
  );
  const assignedStudentIds = initialEdit?.studentIds ??
    (assignmentMode === "whole-class"
      ? students.map((student) => student.id)
      : selectedStudentIds);
  const assignmentCount = selectedTargets.length * assignedStudentIds.length;
  const planDateValid = isCivilDate(planCivilDate);
  const startTimeValid = isLocalTime(startTime);
  const endTimeValid = !endTime || isLocalTime(endTime);
  const timeOrderValid =
    startTimeValid && endTimeValid && (!endTime || startTime < endTime);
  const planDateInPremiumWeek =
    planDateValid && (initialEdit
      ? planCivilDate >= initialEdit.allowedDateStart &&
        planCivilDate <= initialEdit.allowedDateEnd
      : !initialTemplate ||
        (planCivilDate >= initialTemplate.weekSnapshot.periodStart &&
          planCivilDate <= initialTemplate.weekSnapshot.periodEnd));
  const premiumFlowDefinition =
    initialEdit?.flowDefinition ?? initialTemplate?.fullDayFlow ?? [];
  const premiumDailyFlowValid =
    premiumFlowDefinition.length === 0 ||
    (premiumDailyFlowBlocks.length === 10 &&
      premiumDailyFlowBlocks.every(
        (block) =>
          Number.isInteger(block.durationMinutes) &&
          block.durationMinutes >= 5 &&
          block.durationMinutes <= 240 &&
          block.transitionNote.length <= 500 &&
          block.teacherNote.length <= 1_000,
      ));
  const resolvedPremiumActivityTitle =
    initialTemplate &&
    premiumAlternativeActivated &&
    activityTitle === initialTemplate.activitySnapshot.title
      ? initialTemplate.alternativeActivitySnapshot.title
      : activityTitle;
  const resolvedPremiumPlanTitle =
    initialTemplate &&
    premiumAlternativeActivated &&
    planTitle === initialTemplate.planTitle
      ? `${initialTemplate.alternativeActivitySnapshot.title} planı`
      : planTitle;
  const saveBlockingReasons = [
    !activityTitle.trim()
      ? "Bir etkinlik seçin veya etkinlik adını yazın."
      : null,
    !planTitle.trim() ? "Plan başlığını yazın." : null,
    selectedTargets.length === 0
      ? "En az bir program hedefi seçin."
      : null,
    assignedStudentIds.length === 0
      ? "En az bir çocuk seçerek çocuk kapsamını tamamlayın."
      : null,
    !planDateValid
      ? "Plan tarihini YYYY-AA-GG biçiminde yazın."
      : null,
    planDateValid && !planDateInPremiumWeek
      ? "Plan tarihini kaynak haftanın tarih aralığına alın."
      : null,
    !startTimeValid
      ? "Başlangıç saatini SS:DD biçiminde yazın."
      : null,
    !endTimeValid
      ? "Bitiş saatini SS:DD biçiminde yazın."
      : null,
    startTimeValid && endTimeValid && !timeOrderValid
      ? "Bitiş saati başlangıç saatinden sonra olmalıdır."
      : null,
    !premiumDailyFlowValid
      ? "Tam gün akışındaki süre ve not alanlarını kontrol edin."
      : null,
  ].filter((reason): reason is string => reason !== null);
  const saveReady = !busy && saveBlockingReasons.length === 0;
  const saveDisabled = busy || saveBlockingReasons.length > 0;
  const saveReadinessTitle = error
    ? "Plan kaydedilemedi"
    : busy
      ? "Plan kaydediliyor"
      : saveReady
        ? "Kaydetmeye hazır"
        : saveBlockingReasons.length === 1
          ? "1 adım kaldı"
          : `${saveBlockingReasons.length} adım kaldı`;
  const saveReadinessDetail = error
    ? error
    : busy
      ? "Kayıt tamamlanana kadar bu ekranda kalın."
      : saveReady
        ? initialEdit
          ? "Değişiklikler kontrol edildi; kaydedebilirsiniz."
          : "Etkinlik, hedef ve çocuk kapsamı tamamlandı."
        : saveBlockingReasons.join(" ");
  const selectPremiumApplication = (useAlternative: boolean) => {
    setPremiumAlternativeActivated(useAlternative);
    if (!initialTemplate) return;
    const template = useAlternative
      ? initialTemplate.alternativeActivitySnapshot
      : initialTemplate.activitySnapshot;
    const templateCodes = new Set(template.curriculumTargetCodes);
    setSelectedTargetIds(
      availableTargets
        .filter((target) => templateCodes.has(target.referenceCode))
        .map((target) => target.id),
    );
  };

  const save = async () => {
    if (
      !planTitle.trim() ||
      !activityTitle.trim() ||
      selectedTargets.length === 0 ||
      assignedStudentIds.length === 0 ||
      !planDateValid ||
      !planDateInPremiumWeek ||
      !startTimeValid ||
      !endTimeValid ||
      !timeOrderValid ||
      !premiumDailyFlowValid ||
      busy
    ) return;
    setBusy(true);
    setError("");
    try {
      if (initialEdit) {
        if (!onUpdate) {
          throw new Error("Plan düzenleme işlemi bu ekranda kullanılamıyor.");
        }
        await onUpdate({
          ...ids,
          expectedPlanUpdatedAt: initialEdit.expectedPlanUpdatedAt,
          expectedActivityUpdatedAt: initialEdit.expectedActivityUpdatedAt,
          civilDate: planCivilDate,
          planTitle,
          activityTitle,
          startTime,
          ...(endTime ? { endTime } : {}),
          ...(premiumFlowDefinition.length > 0
            ? { premiumDailyFlowBlocks }
            : {}),
        });
        return;
      }
      await onCreate({
        ...ids,
        civilDate: planCivilDate,
        planTitle: resolvedPremiumPlanTitle,
        activityTitle: resolvedPremiumActivityTitle,
        startTime,
        ...(endTime ? { endTime } : {}),
        curriculumTargets: selectedTargets,
        assignmentMode,
        studentIds: assignedStudentIds,
        ...(initialTemplate ? { premiumSource: initialTemplate } : {}),
        ...(initialTemplate ? { premiumDailyFlowBlocks } : {}),
        ...(initialTemplate ? { premiumAlternativeActivated } : {}),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan kaydedilemedi.");
      setBusy(false);
    }
  };

  return (
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">{initialEdit ? "Kayıtlı öğretmen planı" : "Günlük plan hazırlığı"}</span>
          <h1>{initialEdit ? "Gelecek planın uygulama ayrıntılarını düzenleyin." : initialTemplate ? "Tam gün akışını sınıfınıza hazırlayın." : "Bir etkinlik ve bir program hedefi seçin."}</h1>
          <p>{initialEdit ? "Plan kimliği, kaynak hafta, program hedefleri ve çocuk kapsamı korunur; tarih, saat, başlıklar ve öğretmen akış notları güncellenebilir." : initialTemplate ? "On blok hazır gelir; etkinliği, tarihi, hedefleri ve çocuk kapsamını öğretmen belirler." : "İsterseniz başlık ve saat ayrıntılarını değiştirebilirsiniz."}</p>
        </div>

        <section className="d1-context-card" aria-label="Plan bağlamı">
          <span>{formatTurkishCivilDate(planCivilDate)}</span>
          <strong>{curriculumDisplayLabel(curriculumProfile)}</strong>
          <em>
            {curriculumProfile.officialCatalogVerified
              ? "Resmî MEB kaynağıyla doğrulanmış program"
              : "Sınıf için seçilen program"}
          </em>
        </section>

        <section
          className="plan-save-dock"
          aria-label="Plan kaydetme durumu"
          data-error={error ? "true" : "false"}
        >
          <div
            id="plan-save-readiness"
            className={
              error
                ? "plan-readiness is-error"
                : saveReady
                  ? "plan-readiness is-ready"
                  : "plan-readiness"
            }
            role={error ? "alert" : "status"}
            aria-live={error ? "assertive" : "polite"}
            aria-atomic="true"
          >
            {!error && saveReady ? (
              <CheckCircledIcon aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon aria-hidden="true" />
            )}
            <span>
              <strong>{saveReadinessTitle}</strong>
              <small>{saveReadinessDetail}</small>
            </span>
          </div>
          <button
            className="d1-primary"
            type="button"
            onClick={() => void save()}
            disabled={saveDisabled}
            aria-describedby="plan-save-readiness"
          >
            {busy ? "Kaydediliyor…" : initialEdit ? "Değişiklikleri kaydet" : initialTemplate ? "Tam gün planını kaydet" : "Planı kaydet"}
          </button>
        </section>

        {premiumFlowDefinition.length > 0 ? (
          <>
            <section className="premium-template-source" aria-label="Premium plan kaynağı">
              <StarIcon aria-hidden="true" />
              <span>
                <strong>{initialEdit ? "Kayıtlı kaynak zinciri korunuyor" : "Plan Kütüphanesi’nden hazırlandı"}</strong>
                <small>{initialEdit ? `${initialEdit.allowedDateStart} – ${initialEdit.allowedDateEnd} · Kaynak etkinlik değiştirilemez` : `${initialTemplate!.contentPack.displayName} · ${initialTemplate!.weekSnapshot.dateRange} · Öğretmen incelemesi gerekli`}</small>
              </span>
            </section>
            <section className="premium-daily-flow-preview" aria-labelledby="premium-daily-flow-title">
              <div>
                <span className="d1-kicker">Tam gün planı</span>
                <h2 id="premium-daily-flow-title">{initialEdit ? "10 blok kayıtlı akış" : "10 blok otomatik yerleşti"}</h2>
                <p>{initialEdit ? "Kaynak bloklar yerinde kalır; öğretmen süre, uygulama durumu, geçiş ve kendi notlarını düzenleyebilir." : "Seçilen etkinlik ilgili bloğa, haftanın alternatifi isteğe bağlı seçenek olarak eklenir."}</p>
              </div>
              {initialTemplate ? <fieldset className="premium-alternative-choice">
                <legend>Bu günlük planda uygulanacak etkinlik</legend>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!premiumAlternativeActivated}
                  onPointerUp={() => {
                    selectPremiumApplication(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPremiumApplication(false);
                    }
                  }}
                >
                  <span>
                    <strong>Ana etkinliği uygula</strong>
                    <small>{initialTemplate.activitySnapshot.title}</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={premiumAlternativeActivated}
                  onPointerUp={() => {
                    selectPremiumApplication(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPremiumApplication(true);
                    }
                  }}
                >
                  <span>
                    <strong>Haftanın alternatifini bunun yerine uygula</strong>
                    <small>
                      {initialTemplate.alternativeActivitySnapshot.title} · Yerine geçtiği ana etkinlik: {initialTemplate.activitySnapshot.title}
                    </small>
                  </span>
                </button>
                <p>
                  {premiumAlternativeActivated
                    ? "Öğretmen seçimi kayda alınır; hedef önerileri alternatif için yenilenir ve kaydetmeden önce değiştirilebilir."
                    : "Alternatif yalnız aday olarak kalır ve uygulanmış sayılmaz."}
                </p>
              </fieldset> : (
                <p className="premium-edit-source-lock">
                  Uygulanacak kaynak etkinlik bu düzenleme diliminde sabittir. Böylece planın yıllık → aylık → haftalık kaynak izi bozulmaz.
                </p>
              )}
              <ol>
                {premiumFlowDefinition.map((block, index) => {
                  const selected = initialTemplate?.activitySnapshot.flowSlot === block.id;
                  const alternative = initialTemplate?.alternativeActivitySnapshot.flowSlot === block.id;
                  const applied = premiumAlternativeActivated ? alternative : selected;
                  const teacherBlock = premiumDailyFlowBlocks[index];
                  return (
                    <li key={block.id} className={applied ? "is-selected" : selected ? "is-replaced" : ""}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{block.title}</strong>
                        {initialTemplate && selected ? (
                          <em>
                            {initialTemplate.activitySnapshot.title}
                            {premiumAlternativeActivated ? " · alternatifle değiştirildi" : " · uygulanacak"}
                          </em>
                        ) : null}
                        {initialTemplate && alternative ? (
                          <small>
                            Alternatif: {initialTemplate.alternativeActivitySnapshot.title}
                            {premiumAlternativeActivated ? " · uygulanacak" : " · aday"}
                          </small>
                        ) : null}
                        {teacherBlock ? (
                          <details className="premium-flow-block-editor">
                            <summary>Bloğu düzenle · {teacherBlock.durationMinutes} dk</summary>
                            <label htmlFor={`premium-block-status-${block.id}`}>Uygulama durumu</label>
                            <select
                              id={`premium-block-status-${block.id}`}
                              value={teacherBlock.status}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? {
                                          ...candidate,
                                          status: event.target.value as PremiumDailyFlowBlockDraft["status"],
                                        }
                                      : candidate,
                                  ),
                                )
                              }
                            >
                              <option value="planned">Planlandı</option>
                              <option value="optional">İsteğe bağlı</option>
                              <option value="skipped">Bu gün uygulanmayacak</option>
                            </select>
                            <label htmlFor={`premium-block-duration-${block.id}`}>Süre (dakika)</label>
                            <KeyboardInput
                              id={`premium-block-duration-${block.id}`}
                              inputMode="numeric"
                              value={String(teacherBlock.durationMinutes)}
                              onChange={(event) => {
                                const durationMinutes = Number(event.target.value.replace(/\D/g, ""));
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, durationMinutes }
                                      : candidate,
                                  ),
                                );
                              }}
                            />
                            <label htmlFor={`premium-block-transition-${block.id}`}>Geçiş notu</label>
                            <KeyboardInput
                              id={`premium-block-transition-${block.id}`}
                              value={teacherBlock.transitionNote}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, transitionNote: event.target.value }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                            <label htmlFor={`premium-block-note-${block.id}`}>Öğretmen notu</label>
                            <KeyboardInput
                              id={`premium-block-note-${block.id}`}
                              value={teacherBlock.teacherNote}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, teacherNote: event.target.value }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        ) : null}

        {!initialEdit ? <section className="plan-ideas" aria-labelledby="plan-ideas-title">
          <div className="plan-ideas-heading">
            <div>
              <span className="d1-kicker">Oyun temelli fikir havuzu</span>
              <h2 id="plan-ideas-title">Bugün neyi keşfedelim?</h2>
            </div>
            <strong aria-live="polite">
              {selectedActivitySuggestion ? "Fikir seçildi" : "Birini seçin"}
            </strong>
          </div>
          <p>
            Alanı seçin, ardından bir etkinliğe dokunun.
          </p>
          <Carousel
            className="plan-area-carousel"
            contentClassName="plan-area-track"
            ariaLabel="Etkinlik fikir alanları"
          >
            {PRESCHOOL_ACTIVITY_AREAS.map((area) => (
              <button
                type="button"
                key={area.id}
                aria-pressed={suggestionArea === area.id}
                onClick={() => setSuggestionArea(area.id)}
              >
                {area.label}
              </button>
            ))}
          </Carousel>
          <Carousel
            className="plan-suggestion-carousel"
            contentClassName="plan-suggestion-track"
            ariaLabel="Etkinlik fikirleri"
          >
            {visibleActivitySuggestions.slice(0, 8).map((suggestion) => (
              <button
                type="button"
                className="plan-suggestion"
                key={suggestion.id}
                aria-pressed={activityTitle === suggestion.title}
                onClick={() => {
                  setActivityTitle(suggestion.title);
                  if (planTitle === "Günlük öğrenme planı") {
                    setPlanTitle(`${suggestion.title} planı`);
                  }
                }}
              >
                <StarIcon aria-hidden="true" />
                <strong>{suggestion.title}</strong>
                <small>{suggestion.teacherPrompt}</small>
                <span>
                  {activityTitle === suggestion.title ? "Seçildi" : "Bu fikri kullan"}
                </span>
              </button>
            ))}
          </Carousel>
        </section> : null}

        <div className="d1-form">
          <label htmlFor="d1-activity-title">Etkinlik adı</label>
          <KeyboardInput
            id="d1-activity-title"
            value={activityTitle}
            onChange={(event) => setActivityTitle(event.target.value)}
            placeholder="Örn. Bahçede gölge incelemesi"
            autoComplete="off"
            autoFocus
          />

          <details className="quick-details plan-optional-details">
            <summary>
              <span>
                <ClockIcon aria-hidden="true" />
                <strong>Başlık ve saati değiştir</strong>
                <small>İsteğe bağlı</small>
              </span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="quick-details-fields">
              <label htmlFor="d1-plan-title">Plan başlığı</label>
              <KeyboardInput
                id="d1-plan-title"
                value={planTitle}
                onChange={(event) => setPlanTitle(event.target.value)}
                autoComplete="off"
              />
              {!planDateInPremiumWeek ? (
                <p className="d1-error" role="alert">
                  Plan tarihi {initialEdit ? `${initialEdit.allowedDateStart} – ${initialEdit.allowedDateEnd}` : initialTemplate?.weekSnapshot.dateRange} içinde olmalıdır.
                </p>
              ) : null}
              <label htmlFor="d1-plan-date">Plan tarihi</label>
              <KeyboardInput
                id="d1-plan-date"
                value={planCivilDate}
                onChange={(event) => setPlanCivilDate(event.target.value)}
                placeholder="YYYY-AA-GG"
                inputMode="numeric"
                autoComplete="off"
              />
              <div className="d1-form-grid">
                <label htmlFor="d1-start-time">Başlangıç
                  <KeyboardInput
                    id="d1-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </label>
                <label htmlFor="d1-end-time">Bitiş
                  <KeyboardInput
                    id="d1-end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </details>
        </div>

        {initialEdit ? (
          <section className="scheduled-plan-locked-scope" aria-label="Korunan plan kapsamı">
            <span className="d1-kicker">Korunan program kapsamı</span>
            <h2>{selectedTargets.length} hedef · {assignedStudentIds.length} çocuk</h2>
            <p>
              Kaynak program hedefleri, çocuk atamaları ve premium etkinlik görüntüleri bu düzenlemede değişmez. Başlık, tarih, saat ve 10 bloktaki öğretmen notları güncellenebilir.
            </p>
          </section>
        ) : <>
        <section className="curriculum-picker" aria-labelledby="curriculum-picker-title">
          <div className="curriculum-section-heading">
            <div>
              <span className="d1-kicker">Program omurgası</span>
              <h2 id="curriculum-picker-title">Bu etkinlikte ele alınacak hedefler</h2>
            </div>
            <strong aria-live="polite">{selectedTargets.length} hedef seçili</strong>
          </div>
          <KeyboardInput
            value={targetQuery}
            onChange={(event) => setTargetQuery(event.target.value)}
            placeholder="Kod, başlık veya alan ara"
            aria-label="Program hedeflerinde ara"
          />
          <Carousel
            className="plan-area-carousel"
            contentClassName="plan-area-track"
            ariaLabel="Program alanları"
          >
            {targetDomains.map((domain) => (
              <button
                type="button"
                key={domain}
                aria-pressed={targetDomain === domain}
                onClick={() => setTargetDomain(domain)}
              >
                {domain}
              </button>
            ))}
          </Carousel>
          <div className="curriculum-target-list" role="group" aria-label="Program hedefleri">
            {visibleTargets.map((target) => {
              const selected = selectedTargetIds.includes(target.id);
              return (
                <button
                  type="button"
                  className={selected ? "curriculum-target is-selected" : "curriculum-target"}
                  aria-pressed={selected}
                  key={target.id}
                  onClick={() =>
                    setSelectedTargetIds((current) =>
                      current.includes(target.id)
                        ? current.filter((id) => id !== target.id)
                        : [...current, target.id],
                    )
                  }
                >
                  <span>
                    <b>{target.referenceCode}</b>
                    <small>{target.domain} · {CURRICULUM_TARGET_KIND_LABELS[target.kind]}</small>
                  </span>
                  <strong>{target.referenceTitle}</strong>
                  <em>{selected ? "Seçildi" : "Seç"}</em>
                </button>
              );
            })}
          </div>
          <p className="catalog-scope-note">
            {targetDomain || targetQuery.trim()
              ? "İlk 16 eşleşme gösterilir; arayarak daha da daraltabilirsiniz."
              : "Önce bir program alanına dokunun veya hedef kodunu arayın."}
          </p>
        </section>

        <details className="quick-details plan-optional-details">
          <summary>
            <span>
              <PersonIcon aria-hidden="true" />
              <strong>Çocuk kapsamı</strong>
              <small>{assignmentMode === "whole-class" ? "Tüm sınıf" : `${assignedStudentIds.length} çocuk`}</small>
            </span>
            <ChevronDownIcon aria-hidden="true" />
          </summary>
          <div className="quick-details-fields">
          <div className="assignment-mode" role="radiogroup" aria-label="Öğrenci kapsamı">
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "whole-class"}
                onChange={() => setAssignmentMode("whole-class")}
              />
              <span><strong>Tüm sınıf</strong><small>Şu anki {students.length} aktif çocuk</small></span>
            </label>
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "selected-students"}
                onChange={() => setAssignmentMode("selected-students")}
              />
              <span><strong>Seçili çocuklar</strong><small>Farklılaştırılmış takip</small></span>
            </label>
          </div>
          {assignmentMode === "selected-students" ? (
            <div className="student-assignment-list" role="group" aria-label="Seçilecek çocuklar">
              {students.map((student) => (
                <label key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={(event) =>
                      setSelectedStudentIds((current) =>
                        event.target.checked
                          ? [...current, student.id]
                          : current.filter((id) => id !== student.id),
                      )
                    }
                  />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="assignment-summary" aria-live="polite">
            <strong>{selectedTargets.length} hedef × {assignedStudentIds.length} çocuk</strong>
            <span>{assignmentCount} planlı takip kaydı açılacak.</span>
          </div>
          </div>
        </details>
        </>}
      </div>
    </MobileScroll>
  );
}

export function PlanCreationFlow({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
  onUpdate,
  onClose,
  initialTemplate,
  initialEdit,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onUpdate?: (command: PlanUpdateCommand) => Promise<void>;
  onClose: () => void;
  initialTemplate?: PremiumDailyTemplateSelection;
  initialEdit?: ScheduledPlanEditDraft;
}) {
  const initial = useMemo<FlowScreen>(
    () => ({
      id: initialEdit ? "plan-edit" : "plan-create",
      title: initialEdit ? "Planı düzenle" : "Plan oluştur",
      headerHeight: 64,
      header: createFlowHeader(initialEdit ? "Planı düzenle" : "Plan oluştur", "1 / 1", onClose),
      render: () => (
        <PlanCreationScreen
          civilDate={civilDate}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          ageGroup={ageGroup}
          curriculumProfile={curriculumProfile}
          students={students}
          onCreate={onCreate}
          onUpdate={onUpdate}
          initialTemplate={initialTemplate}
          initialEdit={initialEdit}
        />
      ),
    }),
    [
      civilDate,
      ageGroup,
      curriculumProfile,
      defaultEndTime,
      defaultStartTime,
      students,
      onClose,
      onCreate,
      onUpdate,
      initialTemplate,
      initialEdit,
    ],
  );

  return <FlowStack initial={initial} />;
}
