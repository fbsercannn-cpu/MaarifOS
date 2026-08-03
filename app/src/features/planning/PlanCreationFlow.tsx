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
  planId: string;
  activityId: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignmentMode: CurriculumAssignmentMode;
  studentIds: string[];
};

export function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
}) {
  const [ids] = useState(() => ({
    planId: crypto.randomUUID(),
    activityId: crypto.randomUUID(),
  }));
  const [planTitle, setPlanTitle] = useState("Günlük öğrenme planı");
  const [activityTitle, setActivityTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
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
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
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

  const save = async () => {
    if (
      !planTitle.trim() ||
      !activityTitle.trim() ||
      selectedTargets.length === 0 ||
      assignedStudentIds.length === 0 ||
      busy
    ) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({
        ...ids,
        planTitle,
        activityTitle,
        startTime,
        ...(endTime ? { endTime } : {}),
        curriculumTargets: selectedTargets,
        assignmentMode,
        studentIds: assignedStudentIds,
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
          <h1>Bir etkinlik ve bir program hedefi seçin.</h1>
          <p>İsterseniz başlık ve saat ayrıntılarını değiştirebilirsiniz.</p>
        </div>

        <section className="d1-context-card" aria-label="Plan bağlamı">
          <span>{formatTurkishCivilDate(civilDate)}</span>
          <strong>{curriculumDisplayLabel(curriculumProfile)}</strong>
          <em>
            {curriculumProfile.officialCatalogVerified
              ? "Resmî MEB kaynağıyla doğrulanmış program"
              : "Sınıf için seçilen program"}
          </em>
        </section>

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
            assignedStudentIds.length === 0
          }
        >
          {busy ? "Kaydediliyor…" : "Planı kaydet ve etkinliği başlat"}
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
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onClose: () => void;
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
    ],
  );

  return <FlowStack initial={initial} />;
}
