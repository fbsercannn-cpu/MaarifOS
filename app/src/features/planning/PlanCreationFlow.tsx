import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ClockIcon,
  Cross2Icon,
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

function formatTurkishCivilDate(civilDate: string) {
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

export function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
  initialTemplate,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  initialTemplate?: PremiumDailyTemplateSelection;
}) {
  const [ids] = useState(() => ({
    planId: crypto.randomUUID(),
    activityId: crypto.randomUUID(),
  }));
  const [planTitle, setPlanTitle] = useState(
    initialTemplate?.planTitle ?? "Günlük öğrenme planı",
  );
  const [activityTitle, setActivityTitle] = useState(
    initialTemplate?.activityTitle ?? "",
  );
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [planCivilDate, setPlanCivilDate] = useState(
    initialTemplate?.activitySnapshot.recommendedCivilDate ?? civilDate,
  );
  const [premiumDailyFlowBlocks, setPremiumDailyFlowBlocks] = useState<
    PremiumDailyFlowBlockDraft[]
  >(() =>
    initialTemplate ? createPremiumDailyFlowDraft(initialTemplate.fullDayFlow) : [],
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
    const initialCodes = new Set(initialTemplate?.targetCodes ?? []);
    return availableTargets
      .filter((target) => initialCodes.has(target.referenceCode))
      .map((target) => target.id);
  });
  const [assignmentMode, setAssignmentMode] =
    useState<CurriculumAssignmentMode>("whole-class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
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
  const selectedTargets = availableTargets.filter((target) =>
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
  const assignedStudentIds =
    assignmentMode === "whole-class"
      ? students.map((student) => student.id)
      : selectedStudentIds;
  const assignmentCount = selectedTargets.length * assignedStudentIds.length;
  const planDateInPremiumWeek =
    !initialTemplate ||
    (planCivilDate >= initialTemplate.weekSnapshot.periodStart &&
      planCivilDate <= initialTemplate.weekSnapshot.periodEnd);
  const premiumDailyFlowValid =
    !initialTemplate ||
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
      !planDateInPremiumWeek ||
      !premiumDailyFlowValid ||
      busy
    ) return;
    setBusy(true);
    setError("");
    try {
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
          <span className="d1-kicker">Bugünün uygulama kaydı</span>
          <h1>{initialTemplate ? "Tam gün akışını sınıfınıza hazırlayın." : "Bir etkinlik ve bir program hedefi seçin."}</h1>
          <p>{initialTemplate ? "On blok hazır gelir; etkinliği, tarihi, hedefleri ve çocuk kapsamını öğretmen belirler." : "İsterseniz başlık ve saat ayrıntılarını değiştirebilirsiniz."}</p>
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

        {initialTemplate ? (
          <>
            <section className="premium-template-source" aria-label="Premium plan kaynağı">
              <StarIcon aria-hidden="true" />
              <span>
                <strong>Plan Kütüphanesi’nden hazırlandı</strong>
                <small>{initialTemplate.contentPack.displayName} · {initialTemplate.weekSnapshot.dateRange} · Öğretmen incelemesi gerekli</small>
              </span>
            </section>
            <section className="premium-daily-flow-preview" aria-labelledby="premium-daily-flow-title">
              <div>
                <span className="d1-kicker">Tam gün planı</span>
                <h2 id="premium-daily-flow-title">10 blok otomatik yerleşti</h2>
                <p>Seçilen etkinlik ilgili bloğa, haftanın alternatifi isteğe bağlı seçenek olarak eklenir.</p>
              </div>
              <fieldset className="premium-alternative-choice">
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
              </fieldset>
              <ol>
                {initialTemplate.fullDayFlow.map((block, index) => {
                  const selected = initialTemplate.activitySnapshot.flowSlot === block.id;
                  const alternative = initialTemplate.alternativeActivitySnapshot.flowSlot === block.id;
                  const applied = premiumAlternativeActivated ? alternative : selected;
                  const teacherBlock = premiumDailyFlowBlocks[index];
                  return (
                    <li key={block.id} className={applied ? "is-selected" : selected ? "is-replaced" : ""}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{block.title}</strong>
                        {selected ? (
                          <em>
                            {initialTemplate.activitySnapshot.title}
                            {premiumAlternativeActivated ? " · alternatifle değiştirildi" : " · uygulanacak"}
                          </em>
                        ) : null}
                        {alternative ? (
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

        <section className="plan-ideas" aria-labelledby="plan-ideas-title">
          <div className="plan-ideas-heading">
            <div>
              <span className="d1-kicker">Oyun temelli fikir havuzu</span>
              <h2 id="plan-ideas-title">Bugün neyi keşfedelim?</h2>
            </div>
            <strong>Birini seçin</strong>
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
                <span>Bu fikri kullan</span>
              </button>
            ))}
          </Carousel>
        </section>

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
                  Premium plan tarihi {initialTemplate?.weekSnapshot.dateRange} içinde olmalıdır.
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
                  <input
                    id="d1-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </label>
                <label htmlFor="d1-end-time">Bitiş
                  <input
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

        <section className="curriculum-picker" aria-labelledby="curriculum-picker-title">
          <div className="curriculum-section-heading">
            <div>
              <span className="d1-kicker">Program omurgası</span>
              <h2 id="curriculum-picker-title">Bu etkinlikte ele alınacak hedefler</h2>
            </div>
            <strong>{selectedTargets.length} seçili</strong>
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

        {error ? <p className="d1-error" role="alert">{error}</p> : null}
        <button
          className="d1-primary"
          type="button"
          onClick={() => void save()}
          disabled={
            busy ||
            !planTitle.trim() ||
            !activityTitle.trim() ||
            selectedTargets.length === 0 ||
            assignedStudentIds.length === 0 ||
            !planDateInPremiumWeek ||
            !premiumDailyFlowValid
          }
        >
          {busy ? "Kaydediliyor…" : initialTemplate ? "Tam gün planını kaydet ve etkinliği başlat" : "Planı kaydet ve etkinliği başlat"}
        </button>
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
  onClose,
  initialTemplate,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onClose: () => void;
  initialTemplate?: PremiumDailyTemplateSelection;
}) {
  const initial = useMemo<FlowScreen>(
    () => ({
      id: "plan-create",
      title: "Plan oluştur",
      headerHeight: 64,
      header: createFlowHeader("Plan oluştur", "1 / 1", onClose),
      render: () => (
        <PlanCreationScreen
          civilDate={civilDate}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          ageGroup={ageGroup}
          curriculumProfile={curriculumProfile}
          students={students}
          onCreate={onCreate}
          initialTemplate={initialTemplate}
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
      initialTemplate,
    ],
  );

  return <FlowStack initial={initial} />;
}
