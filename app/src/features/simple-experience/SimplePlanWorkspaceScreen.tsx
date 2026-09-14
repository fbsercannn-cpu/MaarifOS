import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeOpenIcon,
  FileTextIcon,
  ReaderIcon,
  TargetIcon,
} from "@radix-ui/react-icons";

import type { PlanWorkspaceScreenProps } from "../planning/PlanWorkspaceScreen.tsx";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import {
  familyEngagementRecords,
  familyScopeMatches,
  resolveCommunicationPreference,
} from "../../core/domain/family-engagement.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { KeyboardInput, KeyboardTextarea, useKeyboard } from "../../mobile";
import { createPlanWorkbenchPresentation } from "../planning/plan-workbench-model.ts";
import { buildTeachingStateSeparation } from "../planning/teaching-state-separation.ts";
import {
  buildPlayFamilyCycleView,
  playFamilyCycleRecords,
  recordPlayFamilyCycle,
  type PlayFamilyCycleView,
} from "../planning/play-family-cycle.ts";
import {
  ACTIVITY_STUDIO_AGE_BANDS,
  ACTIVITY_STUDIO_COLLECTIONS,
  filterActivityStudioItems,
  type ActivityStudioAgeBand,
  type ActivityStudioCollectionId,
} from "../activity-studio/activity-studio-model.ts";
import {
  PEDAGOGICAL_SCENARIOS,
  createPedagogicalCoverageMatrix,
  createPedagogicalDayFlow,
  type PedagogicalScenarioId,
} from "../pedagogical-os/pedagogical-orchestrator.ts";
import { tymmDomainToOfficialLibraryArea } from "../curriculum/tymm-official-library.ts";
import { TymmOfficialLibraryPanel } from "../curriculum/TymmOfficialLibraryPanel.tsx";
import { TeacherPilotProtocolSummary } from "../teacher-pilot/TeacherPilotProtocolSummary.tsx";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { DailyPlanEvaluationSheet } from "../planning/DailyPlanEvaluationSheet.tsx";
import { AddActivityToPlanModal } from "../planning/AddActivityToPlanModal.tsx";
import { DailyPlanDrawer } from "../planning/DailyPlanDrawer.tsx";
import { DailyPlanMaterialsGallery } from "../planning/DailyPlanMaterialsGallery.tsx";
import { exportDailyPlanDocument } from "../planning/daily-plan-export-service.ts";
import "./simple-workspaces.css";

export type ActivityStudioOpenOptions = {
  activityId?: string;
  scenarioId?: PedagogicalScenarioId;
  collection?: ActivityStudioCollectionId;
};

export interface SimplePlanWorkspaceScreenProps
  extends Pick<
    PlanWorkspaceScreenProps,
    | "workspace"
    | "educationalWritesDisabled"
    | "preparationPlanningAllowed"
    | "preparationPlanningCivilDate"
    | "upcomingPlanningCivilDate"
    | "dataBusy"
    | "onOpenLevel"
    | "onOpenCalendar"
    | "onOpenDocuments"
  > {
  ageBand: ActivityStudioAgeBand | null;
  civilDate: string;
  store: LocalDataStore;
  refreshKey: string | null;
  onOpenActivityStudio(options?: ActivityStudioOpenOptions): void;
  onOpenBuiltInMaarifLibrary(): void;
  onOpenAgeBandSetup(): void;
  nextSteps?: ReactNode;
}

const PLAN_COPY = {
  annual: {
    label: "DESTEK BELGESİ",
    title: "Yıllık planlama panosu",
    detail: "Eğitim yılını ay ay görün ve düzenleyin.",
    icon: ArchiveIcon,
  },
  monthly: {
    label: "TYMM RESMÎ TEMEL",
    title: "Aylık eğitim planı",
    detail: "Maarif Modeli alanlarıyla bu ayı hazırlayın.",
    icon: TargetIcon,
  },
  weekly: {
    label: "DESTEK BELGESİ",
    title: "Haftalık çalışma akışı",
    detail: "Günleri ve okulun ek etkinliklerini yan yana kurun.",
    icon: CalendarIcon,
  },
  daily: {
    label: "TYMM RESMÎ TEMEL",
    title: "Günlük eğitim planı",
    detail: "Etkinlik, süre ve çocuk kapsamını hızla seçin.",
    icon: ReaderIcon,
  },
} as const;

const PLAN_QUALITY_PROMPTS = [
  ["Yaşa uyarlama", "Aynı etkinliğin 36–48, 48–60 ve 60–72 ay karşılığı hazır."],
  ["Katılım çeşitliliği", "Sözel, hareketli, görsel ve gözlemci katılım yollarını birlikte düşünün."],
  ["Gözlem odağı", "Ürün yerine süreç, seçim, strateji ve değişikliği kaydedin."],
  ["Aile bağlantısı", "Evde yapılabilecek düşük maliyetli ve gönüllü uzatmayı seçin."],
] as const;

function collectionItemCount(
  collectionId: (typeof ACTIVITY_STUDIO_COLLECTIONS)[number]["id"],
): number {
  const ids = new Set<string>();
  for (const ageBand of ACTIVITY_STUDIO_AGE_BANDS) {
    for (const item of filterActivityStudioItems({
      ageBand,
      collection: collectionId,
    })) {
      ids.add(item.id);
    }
  }
  return ids.size;
}

interface TeachingStateAndPlayFamilyPanelProps {
  store: LocalDataStore;
  refreshKey: string | null;
  civilDate: string;
  disabled: boolean;
}

function idsFromRecord(record: StoredRecord): string[] {
  if (Array.isArray(record.studentIds)) {
    return record.studentIds.filter((value): value is string => typeof value === "string");
  }
  return typeof record.studentId === "string" ? [record.studentId] : [];
}

function recordTitle(record: StoredRecord, fallback: string): string {
  return typeof record.title === "string" && record.title.trim() ? record.title : fallback;
}

function TeachingStateAndPlayFamilyPanel({
  store,
  refreshKey,
  civilDate,
  disabled,
}: TeachingStateAndPlayFamilyPanelProps) {
  const keyboard = useKeyboard();
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [adaptation, setAdaptation] = useState("");
  const [implementation, setImplementation] = useState("");
  const [applicationConfirmed, setApplicationConfirmed] = useState(false);
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);
  const [teacherReflection, setTeacherReflection] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [reflectionConfirmed, setReflectionConfirmed] = useState(false);
  const [familyRecordId, setFamilyRecordId] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [suggestionSharedOn, setSuggestionSharedOn] = useState(() => civilDateInIstanbul(new Date()));
  const [suggestionConfirmed, setSuggestionConfirmed] = useState(false);
  const [feedbackSuggestionId, setFeedbackSuggestionId] = useState("");
  const [feedbackReceivedOn, setFeedbackReceivedOn] = useState(() => civilDateInIstanbul(new Date()));
  const [feedbackSource, setFeedbackSource] = useState<"" | "oral" | "written">("");
  const [feedback, setFeedback] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackConfirmed, setFeedbackConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    void store.readSnapshot().then((value) => {
      if (!active) return;
      setSnapshot(value);
      setLoadError("");
    }).catch((reason) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "Öğretim kayıtları okunamadı.");
    });
    return () => { active = false; };
  }, [store, refreshKey, revision]);

  const derived = useMemo(() => {
    if (!snapshot) return null;
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope) return { scope: null } as const;
    const students = snapshot.students.filter((record) =>
      familyScopeMatches(scope, record) && typeof record.deletedAt !== "string" && record.active !== false);
    const selectedStudent = students.find((record) => record.id === studentId) ?? null;
    let teaching = null;
    let teachingError = "";
    try {
      teaching = buildTeachingStateSeparation(snapshot, {
        ...scope,
        periodStart: civilDate,
        periodEnd: civilDate,
        ...(selectedStudent ? { studentId: selectedStudent.id } : {}),
      });
    } catch (reason) {
      teachingError = reason instanceof Error ? reason.message : "Öğretim durumları doğrulanamadı.";
    }
    const completedActivities = selectedStudent ? snapshot.activities.filter((record) => {
      const assigned = idsFromRecord(record);
      return familyScopeMatches(scope, record) && typeof record.deletedAt !== "string" &&
        record.civilDate === civilDate && record.status === "completed" && typeof record.planId === "string" &&
        (assigned.length === 0 || assigned.includes(selectedStudent.id));
    }) : [];
    const selectedActivity = completedActivities.find((record) => record.id === activityId) ?? null;
    const cycleApplication = selectedActivity ? playFamilyCycleRecords(snapshot).find((record) =>
      record.studentId === selectedStudent?.id && record.workflow.kind === "application" &&
      record.workflow.sourceActivityId === selectedActivity.id) ?? null : null;
    let cycle: PlayFamilyCycleView | null = null;
    let cycleError = "";
    if (cycleApplication) {
      try { cycle = buildPlayFamilyCycleView(snapshot, cycleApplication.id); }
      catch (reason) { cycleError = reason instanceof Error ? reason.message : "Oyun ve aile zinciri doğrulanamadı."; }
    }
    const linkedObservations = selectedActivity && selectedStudent ? snapshot.observations.filter((record) =>
      record.planId === selectedActivity.planId && record.activityId === selectedActivity.id &&
      record.rawTextImmutable === true && idsFromRecord(record).includes(selectedStudent.id)) : [];
    const familyRecords = familyEngagementRecords(snapshot);
    const preferences = selectedStudent ? studentContactsFromRecord(selectedStudent.contacts).flatMap((contact) => {
      const resolution = resolveCommunicationPreference(snapshot, scope, selectedStudent.id, contact.id);
      return resolution.state === "declared" && resolution.record?.workflow.kind === "communication-preference"
        ? [{
            recordId: resolution.record.id,
            contactId: contact.id,
            label: `${contact.name || contact.relationship} · ${contact.relationship}`,
          }]
        : [];
    }).filter((preference) => familyRecords.some((record) => record.id === preference.recordId)) : [];
    const usedContactIds = new Set(cycle?.familySuggestions.map((record) => record.workflow.contactId) ?? []);
    const availablePreferences = preferences.filter((preference) => !usedContactIds.has(preference.contactId));
    const completedSuggestionIds = new Set(cycle?.familyFeedback.map((record) => record.workflow.sourceSuggestionId) ?? []);
    const pendingSuggestions = cycle?.familySuggestions.filter((record) => !completedSuggestionIds.has(record.id)) ?? [];
    return {
      scope,
      students,
      selectedStudent,
      teaching,
      teachingError,
      completedActivities,
      selectedActivity,
      cycle,
      cycleError,
      linkedObservations,
      availablePreferences,
      pendingSuggestions,
    };
  }, [snapshot, studentId, activityId, civilDate]);

  const resetChainDrafts = () => {
    setActivityId("");
    setMaterialText("");
    setAdaptation("");
    setImplementation("");
    setApplicationConfirmed(false);
    setSelectedObservationIds([]);
    setTeacherReflection("");
    setNextStep("");
    setReflectionConfirmed(false);
    setFamilyRecordId("");
    setSuggestion("");
    setSuggestionConfirmed(false);
    setFeedbackSuggestionId("");
    setFeedbackSource("");
    setFeedback("");
    setFeedbackNote("");
    setFeedbackConfirmed(false);
  };

  const perform = async (task: () => Promise<void>, success: string) => {
    keyboard.hide();
    setBusy(true);
    setWriteError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
      setRevision((value) => value + 1);
    } catch (reason) {
      setWriteError(reason instanceof Error ? reason.message : "Kayıt oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return <section className="simple-workspace__section simple-plan-teaching-state" aria-label="Öğretim durumu ve oyun aile zinciri" aria-busy="true">
      <p role={loadError ? "alert" : "status"}>{loadError || "Öğretim kayıtları hazırlanıyor…"}</p>
    </section>;
  }
  if (!derived?.scope) {
    return <section className="simple-workspace__section simple-plan-teaching-state" aria-label="Öğretim durumu ve oyun aile zinciri">
      <p role="status">Plan, uygulama ve gözlem durumları için etkin eğitim yılı ve sınıf seçin.</p>
    </section>;
  }
  const {
    scope, students, selectedStudent, teaching, teachingError, completedActivities,
    selectedActivity, cycle, cycleError, linkedObservations, availablePreferences,
    pendingSuggestions,
  } = derived;
  const selectedPreference = availablePreferences.find((item) => item.recordId === familyRecordId) ?? null;
  const selectedFeedbackSuggestion = pendingSuggestions.find((item) => item.id === feedbackSuggestionId) ?? null;
  const writeDisabled = disabled || busy;
  const materials = materialText.split(/\r?\n/u).map((item) => item.normalize("NFC").trim()).filter(Boolean);

  return <>
    <section className="simple-workspace__section simple-plan-teaching-state" aria-labelledby="simple-plan-teaching-state-title">
      <div className="simple-workspace__heading">
        <div><small>GERÇEK KAYIT DURUMU</small><h2 id="simple-plan-teaching-state-title">Plan, uygulama, gözlem ve öğretmen yargısı</h2></div>
        <span>{civilDate}</span>
      </div>
      <p>Her durum yalnız kendi kaynağını gösterir. Plan kapsamı çocuk puanı veya değerlendirmesi değildir.</p>
      <label className="simple-plan-teaching-state__student">Çocuk kapsamı
        <select value={studentId} onChange={(event) => { setStudentId(event.target.value); resetChainDrafts(); }}>
          <option value="">Sınıfın tamamı</option>
          {students.map((student) => <option key={student.id} value={student.id}>{String(student.displayName ?? "Çocuk")}</option>)}
        </select>
      </label>
      {teachingError ? <p role="alert" className="simple-plan-teaching-state__error">{teachingError}</p> : null}
      {teaching ? <div className="simple-plan-teaching-state__grid">
        <article data-teaching-stage="planned"><header><h3>Planlandı</h3><strong>{teaching.planned.records.length}</strong></header><p>{teaching.planned.notice}</p>
          {teaching.planned.records.length ? <ul>{teaching.planned.records.map((record) => <li key={record.planId}>{record.title} · {record.plannedTargetLabels.length} plan hedefi</li>)}</ul> : <small>Bu gün için plan kaydı yok.</small>}</article>
        <article data-teaching-stage="applied"><header><h3>Uygulandı</h3><strong>{teaching.applied.records.length}</strong></header><p>{teaching.applied.notice}</p>
          {teaching.applied.records.length ? <ul>{teaching.applied.records.map((record) => <li key={record.activityId}>{record.title}</li>)}</ul> : <small>Tamamlandı olarak kaydedilmiş etkinlik yok.</small>}</article>
        <article data-teaching-stage="observed"><header><h3>Gözlendi</h3><strong>{teaching.observed.records.length}</strong></header><p>{teaching.observed.notice}</p>
          {teaching.observed.records.length ? <ul>{teaching.observed.records.map((record) => <li key={record.observationId}>{record.rawText}</li>)}</ul> : <small>Değişmez ham gözlem kaydı yok.</small>}</article>
        <article data-teaching-stage="teacher-judgement"><header><h3>Öğretmen yargısı</h3><strong>{teaching.teacherJudgement.records.length}</strong></header><p>{teaching.teacherJudgement.notice}</p>
          {teaching.teacherJudgement.records.length ? <ul>{teaching.teacherJudgement.records.map((record) => <li key={record.reportId}>{record.teacherEvaluation}</li>)}</ul> : <small>Öğretmen tarafından onaylanmış değerlendirme yok.</small>}</article>
      </div> : null}
    </section>

    <section className="simple-workspace__section simple-plan-play-cycle" aria-labelledby="simple-plan-play-cycle-title">
      <div className="simple-workspace__heading">
        <div><small>OYUN VE AİLE ZİNCİRİ</small><h2 id="simple-plan-play-cycle-title">Var olan kayıttan oyunu izleyin</h2></div>
      </div>
      <p>Materyal, uyarlama, uygulama, gözleme dayalı yansıtma, aile önerisi ve geri bildirim ayrı kayıtlardır. Veli geri bildirimi otomatik beceri üretmez.</p>
      {!selectedStudent ? <p role="status">Oyun zinciri için önce çocuk kapsamını seçin.</p> : <>
        <label>Tamamlanmış etkinlik
          <select value={selectedActivity?.id ?? ""} onChange={(event) => { resetChainDrafts(); setActivityId(event.target.value); }}>
            <option value="">Etkinlik seçin</option>
            {completedActivities.map((activity) => <option key={activity.id} value={activity.id}>{recordTitle(activity, "Başlıksız etkinlik")}</option>)}
          </select>
        </label>
        {!completedActivities.length ? <p role="status">Bu çocuk ve gün için tamamlanmış etkinlik yok; uygulama aşaması henüz eksik.</p> : null}
      </>}
      {cycleError ? <p role="alert" className="simple-plan-teaching-state__error">{cycleError}</p> : null}
      {selectedActivity ? <>
        <ol className="simple-plan-play-cycle__steps" aria-label="Oyun ve aile kayıt aşamaları">
          <li data-state={cycle ? "complete" : "missing"}><strong>Uygulama</strong><small>{cycle ? "Gerçek tamamlanmış etkinliğe bağlı" : "Kayıt eksik"}</small></li>
          <li data-state={cycle ? "complete" : "missing"}><strong>Uyarlama</strong><small>{cycle ? cycle.application.workflow.adaptation : "Öğretmen uyarlaması eksik"}</small></li>
          <li data-state={cycle?.reflection ? "complete" : "missing"}><strong>Yansıtma</strong><small>{cycle?.reflection ? "Seçili ham gözlemlere bağlı" : "Kayıt eksik"}</small></li>
          <li data-state={cycle?.familySuggestions.length ? "complete" : "missing"}><strong>Aile önerisi</strong><small>{cycle?.familySuggestions.length ? `${cycle.familySuggestions.length} yakına bağlı` : "Kayıt eksik"}</small></li>
          <li data-state={cycle?.familyFeedback.length ? "complete" : "missing"}><strong>Geri bildirim</strong><small>{cycle?.familyFeedback.length ? "Ayrı aile bildirimi kayıtlı" : "Kayıt eksik"}</small></li>
        </ol>

        {!cycle ? <fieldset className="simple-plan-play-cycle__form" disabled={writeDisabled}>
          <legend>Materyal, uyarlama ve uygulama kaydı</legend>
          <label>Materyaller · her satıra bir materyal<KeyboardTextarea value={materialText} rows={3} maxLength={6_000} onChange={(event) => setMaterialText(event.target.value)} /></label>
          <label>Uyarlama<KeyboardTextarea value={adaptation} rows={3} maxLength={4_000} onChange={(event) => setAdaptation(event.target.value)} /></label>
          <label>Uygulama notu<KeyboardTextarea value={implementation} rows={4} maxLength={8_000} onChange={(event) => setImplementation(event.target.value)} /></label>
          <label className="simple-plan-play-cycle__confirm"><input type="checkbox" checked={applicationConfirmed} onChange={(event) => setApplicationConfirmed(event.target.checked)} />Bu materyal, uyarlama ve uygulama kaydını öğretmen olarak onaylıyorum.</label>
          <button type="button" disabled={!materials.length || !adaptation.trim() || !implementation.trim() || !applicationConfirmed} onClick={() => void perform(async () => {
            if (!selectedStudent || typeof selectedActivity.planId !== "string") return;
            await recordPlayFamilyCycle(store, { ...scope, studentId: selectedStudent.id, previousRecordId: null, teacherConfirmed: true, workflow: {
              kind: "application", sourcePlanId: selectedActivity.planId, sourceActivityId: selectedActivity.id,
              materials, adaptation, implementation, appliedAtUtc: selectedActivity.updatedAt,
            } });
            setApplicationConfirmed(false);
          }, "Oyun uygulaması ve uyarlaması gerçek etkinliğe bağlandı.")}>Uygulama kaydını bağla</button>
        </fieldset> : null}

        {cycle && !cycle.reflection ? <fieldset className="simple-plan-play-cycle__form" disabled={writeDisabled}>
          <legend>Gözleme dayalı öğretmen yansıtması</legend>
          {!linkedObservations.length ? <p role="status">Bu etkinlik ve çocuk için değişmez gözlem yok; yansıtma aşaması henüz eksik.</p> : linkedObservations.map((observation) => <label className="simple-plan-play-cycle__observation" key={observation.id}><input type="checkbox" checked={selectedObservationIds.includes(observation.id)} onChange={(event) => setSelectedObservationIds(event.target.checked ? [...selectedObservationIds, observation.id] : selectedObservationIds.filter((id) => id !== observation.id))} />{String(observation.rawText ?? "Gözlem")}</label>)}
          <label>Öğretmen yansıtması<KeyboardTextarea value={teacherReflection} rows={4} maxLength={8_000} onChange={(event) => setTeacherReflection(event.target.value)} /></label>
          <label>Sonraki adım<KeyboardTextarea value={nextStep} rows={3} maxLength={4_000} onChange={(event) => setNextStep(event.target.value)} /></label>
          <label className="simple-plan-play-cycle__confirm"><input type="checkbox" checked={reflectionConfirmed} onChange={(event) => setReflectionConfirmed(event.target.checked)} />Yansıtmayı seçtiğim ham gözlemlere dayanarak yazdığımı onaylıyorum.</label>
          <button type="button" disabled={!selectedObservationIds.length || !teacherReflection.trim() || !reflectionConfirmed} onClick={() => void perform(async () => {
            await recordPlayFamilyCycle(store, { ...scope, studentId: cycle.application.studentId, previousRecordId: cycle.application.id, teacherConfirmed: true, workflow: {
              kind: "reflection", sourceApplicationId: cycle.application.id, observationIds: selectedObservationIds,
              teacherReflection, nextStep,
            } });
            setReflectionConfirmed(false);
          }, "Yansıtma seçili ham gözlemlere bağlandı.")}>Yansıtmayı kaydet</button>
        </fieldset> : null}

        {cycle?.reflection ? <>
          <fieldset className="simple-plan-play-cycle__form" disabled={writeDisabled || availablePreferences.length === 0}>
            <legend>Aileye ayrı oyun önerisi</legend>
            {!availablePreferences.length ? <p role="status">Yeni öneri için seçili yakının güncel, bildirilmiş iletişim tercihi gerekli.</p> : <>
              <label>Yakının iletişim kaydı<select value={familyRecordId} onChange={(event) => setFamilyRecordId(event.target.value)}><option value="">Yakın seçin</option>{availablePreferences.map((preference) => <option key={preference.recordId} value={preference.recordId}>{preference.label}</option>)}</select></label>
              <label>Önerinin paylaşıldığı gün<KeyboardInput type="date" value={suggestionSharedOn} onChange={(event) => setSuggestionSharedOn(event.target.value)} /></label>
              <label>Oyun önerisi<KeyboardTextarea value={suggestion} rows={4} maxLength={4_000} onChange={(event) => setSuggestion(event.target.value)} /></label>
              <label className="simple-plan-play-cycle__confirm"><input type="checkbox" checked={suggestionConfirmed} onChange={(event) => setSuggestionConfirmed(event.target.checked)} />Bu öneriyi seçili yakın ve iletişim kaydıyla paylaştığımı onaylıyorum.</label>
              <button type="button" disabled={!selectedPreference || !suggestion.trim() || !suggestionSharedOn || !suggestionConfirmed} onClick={() => void perform(async () => {
                if (!selectedPreference || !cycle.reflection) return;
                await recordPlayFamilyCycle(store, { ...scope, studentId: cycle.application.studentId, previousRecordId: cycle.reflection.id, teacherConfirmed: true, workflow: {
                  kind: "family-suggestion", sourceReflectionId: cycle.reflection.id,
                  familyEngagementRecordId: selectedPreference.recordId, contactId: selectedPreference.contactId,
                  suggestion, sharedOn: suggestionSharedOn,
                } });
                setFamilyRecordId(""); setSuggestion(""); setSuggestionConfirmed(false);
              }, "Aile oyun önerisi iletişim kaynağına bağlandı.")}>Aile önerisini kaydet</button>
            </>}
          </fieldset>

          <fieldset className="simple-plan-play-cycle__form" disabled={writeDisabled || pendingSuggestions.length === 0}>
            <legend>Ayrı aile geri bildirimi</legend>
            {!pendingSuggestions.length ? <p role="status">Geri bildirim bekleyen aile önerisi yok.</p> : <>
              <label>Kaynak aile önerisi<select value={feedbackSuggestionId} onChange={(event) => setFeedbackSuggestionId(event.target.value)}><option value="">Öneri seçin</option>{pendingSuggestions.map((record) => <option key={record.id} value={record.id}>{record.workflow.suggestion}</option>)}</select></label>
              <label>Geri bildirimin alındığı gün<KeyboardInput type="date" value={feedbackReceivedOn} onChange={(event) => setFeedbackReceivedOn(event.target.value)} /></label>
              <label>Bildirim kaynağı<select value={feedbackSource} onChange={(event) => setFeedbackSource(event.target.value as typeof feedbackSource)}><option value="">Kaynak seçin</option><option value="oral">Sözlü</option><option value="written">Yazılı</option></select></label>
              <label>Yakının geri bildirimi<KeyboardTextarea value={feedback} rows={4} maxLength={8_000} onChange={(event) => setFeedback(event.target.value)} /></label>
              <label>Öğretmen notu<KeyboardTextarea value={feedbackNote} rows={3} maxLength={4_000} onChange={(event) => setFeedbackNote(event.target.value)} /></label>
              <label className="simple-plan-play-cycle__confirm"><input type="checkbox" checked={feedbackConfirmed} onChange={(event) => setFeedbackConfirmed(event.target.checked)} />Geri bildirimi ayrı aile kaydı olarak aldığımı onaylıyorum; bu kayıt otomatik beceri üretmez.</label>
              <button type="button" disabled={!selectedFeedbackSuggestion || !feedbackReceivedOn || !feedbackSource || !feedback.trim() || !feedbackConfirmed} onClick={() => void perform(async () => {
                if (!selectedFeedbackSuggestion || !feedbackSource) return;
                await recordPlayFamilyCycle(store, { ...scope, studentId: cycle.application.studentId, previousRecordId: selectedFeedbackSuggestion.id, teacherConfirmed: true, workflow: {
                  kind: "family-feedback", sourceSuggestionId: selectedFeedbackSuggestion.id,
                  familyEngagementRecordId: selectedFeedbackSuggestion.workflow.familyEngagementRecordId,
                  contactId: selectedFeedbackSuggestion.workflow.contactId, receivedOn: feedbackReceivedOn,
                  source: feedbackSource, feedback, teacherNote: feedbackNote,
                } });
                setFeedbackSuggestionId(""); setFeedbackSource(""); setFeedback(""); setFeedbackNote(""); setFeedbackConfirmed(false);
              }, "Aile geri bildirimi öneriden ayrı kaydedildi.")}>Geri bildirimi ayrı kaydet</button>
            </>}
          </fieldset>
        </> : null}
      </> : null}
      {writeError ? <p role="alert" className="simple-plan-teaching-state__error">{writeError}</p> : null}
      {message ? <p role="status" className="simple-plan-play-cycle__success">{message}</p> : null}
    </section>
  </>;
}

export function SimplePlanWorkspaceScreen({
  workspace,
  educationalWritesDisabled,
  preparationPlanningAllowed = false,
  preparationPlanningCivilDate = null,
  upcomingPlanningCivilDate = null,
  dataBusy,
  onOpenLevel,
  onOpenCalendar,
  onOpenDocuments,
  onOpenActivityStudio,
  onOpenBuiltInMaarifLibrary,
  onOpenAgeBandSetup,
  ageBand,
  civilDate,
  store,
  refreshKey,
  nextSteps,
}: SimplePlanWorkspaceScreenProps) {
  const [scenarioId, setScenarioId] =
    useState<PedagogicalScenarioId>("balanced");
  const [advancedSupportOpen, setAdvancedSupportOpen] = useState(false);
  const [dailyEvaluationOpen, setDailyEvaluationOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [dailyDrawerOpen, setDailyDrawerOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"word" | "pdf" | null>(null);
  const [dailyPlanRecord, setDailyPlanRecord] = useState<StoredRecord | null>(null);
  const [activeScope, setActiveScope] = useState<ActiveClassroomScope | null>(null);

  const handleQuickExport = async (format: "word" | "pdf") => {
    if (!dailyPlanRecord || !activeScope) return;
    try {
      setExportingFormat(format);
      setExportNotice(null);
      const res = await exportDailyPlanDocument({
        store,
        scope: activeScope,
        planId: dailyPlanRecord.id,
        format,
        ageBand,
      });
      setExportNotice(`✅ ${res.fileName} başarıyla indirildi.`);
    } catch (err) {
      setExportNotice(`❌ Hata: ${err instanceof Error ? err.message : "Dışa aktarılamadı"}`);
    } finally {
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    let active = true;
    void store.readSnapshot().then((snapshot) => {
      if (!active) return;
      const resolvedScope = resolveActiveClassroomScope(snapshot);
      setActiveScope(resolvedScope);
      if (!resolvedScope) return;
      const plan = snapshot.plans.find(
        (p) =>
          p.planType === "daily" &&
          p.civilDate === civilDate &&
          typeof p.deletedAt !== "string" &&
          p.academicYearId === resolvedScope.academicYearId &&
          p.classroomId === resolvedScope.classroomId,
      );
      setDailyPlanRecord(plan ?? null);
    });
    return () => { active = false; };
  }, [store, civilDate, refreshKey]);
  const presentation = createPlanWorkbenchPresentation(workspace, {
    educationalWritesDisabled,
    preparationPlanningAllowed,
    preparationPlanningCivilDate,
    upcomingPlanningCivilDate,
  });
  const orchestratedDay = ageBand
    ? createPedagogicalDayFlow({ ageBand, civilDate, scenarioId })
    : null;
  const coverageMatrix = ageBand
    ? createPedagogicalCoverageMatrix(ageBand)
    : [];
  const officialLibraryContextArea = tymmDomainToOfficialLibraryArea(
    orchestratedDay?.learningDomains[0],
  );
  const builtInMaarifPlanEligible = ageBand === "60-72";
  const openLevel = (levelId: (typeof presentation.levels)[number]["id"]) => {
    if (levelId === "daily" && !ageBand) {
      onOpenAgeBandSetup();
      return;
    }
    onOpenLevel(levelId);
  };

  return (
    <main className="simple-workspace" aria-labelledby="simple-plans-title">
      <header className="simple-workspace__hero">
        <span>Yalnız Türkiye Yüzyılı Maarif Modeli</span>
        <h1 id="simple-plans-title" data-route-heading tabIndex={-1}>Planlar</h1>
        <p>Hazır adımı seçin; MaarifOS planı yerleştirip sıradaki adımı hazırlasın.</p>
      </header>

      {nextSteps}

      {!nextSteps ? (
      <section
        className="simple-workspace__priority"
        aria-labelledby="simple-plan-priority-title"
      >
        <span>{presentation.priority.eyebrow}</span>
        <h2 id="simple-plan-priority-title">{presentation.priority.title}</h2>
        <p>{presentation.priority.detail}</p>
        <button
          type="button"
          onClick={() => openLevel(presentation.priority.levelId)}
          disabled={dataBusy}
        >
          {presentation.priority.levelId === "daily" && !ageBand
            ? "Yaş bandını seç"
            : presentation.priority.actionLabel}
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>
      ) : null}

      <section className="simple-workspace__section" aria-labelledby="simple-plan-types">
        <div className="simple-workspace__heading">
          <div>
            <small>PLAN TÜRÜ</small>
            <h2 id="simple-plan-types">Neyi hazırlayacaksınız?</h2>
          </div>
          <span>{presentation.linkedLevelCount}/4 kayıtlı</span>
        </div>
        <div className="simple-action-list">
          <button
            type="button"
            data-testid="built-in-maarif-library-entry"
            onClick={!ageBand
              ? onOpenAgeBandSetup
              : builtInMaarifPlanEligible
                ? onOpenBuiltInMaarifLibrary
                : () => onOpenActivityStudio()}
            disabled={dataBusy}
          >
            <span className="simple-action-list__icon" aria-hidden="true"><ReaderIcon /></span>
            <span>
              <small>{builtInMaarifPlanEligible
                ? "60–72 AY · DÜZENLENEBİLİR İÇERİK"
                : ageBand
                  ? `${ageBand.replace("-", "–")} AY · YAŞA UYGUN ETKİNLİKLER`
                  : "YAŞ BANDI GEREKLİ"}</small>
              <strong>{builtInMaarifPlanEligible
                ? "MaarifOS’un özgün içeriği · TYMM’ye dayalı"
                : ageBand
                  ? "Bu yaş bandının etkinlik bankasını aç"
                  : "Yaş bandını seç"}</strong>
              <em>{builtInMaarifPlanEligible
                ? "MaarifOS tarafından hazırlandı; MEB’de yayımlanmış resmî örnek değildir. Eylül için dört hafta ve 12 etkinliği inceleyin."
                : ageBand
                  ? "MaarifOS’un düzenlenebilir plan içeriği yalnız 60–72 ayda hazır; bu yaş bandında öğretmen planı ve çevrimdışı etkinlikler açıktır."
                  : "Yanlış yaşa ait plan veya etkinlik gösterilmez."}</em>
            </span>
                <span className={`simple-state ${ageBand ? "is-ready" : ""}`.trim()}>
              {ageBand ? "Aç" : "Seç"}
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          {presentation.levels.map((level) => {
            const copy = PLAN_COPY[level.id];
            const Icon = copy.icon;
            return (
              <button
                type="button"
                key={level.id}
                onClick={() => openLevel(level.id)}
                disabled={dataBusy}
              >
                <span className="simple-action-list__icon" aria-hidden="true"><Icon /></span>
                <span>
                  <small>{copy.label}</small>
                  <strong>{copy.title}</strong>
                  <em>{copy.detail}</em>
                </span>
                <span className={`simple-state is-${level.tone}`}>
                  {level.id === "daily" && !ageBand
                    ? "Tamamla"
                    : level.tone === "ready" ? "Hazır" : "Aç"}
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {dailyPlanRecord && activeScope ? (
        <section className="simple-workspace__section" aria-labelledby="simple-daily-enhancements">
          <div className="simple-workspace__heading">
            <div>
              <small>GÜNÜN PLANI · HIZLI İŞLEMLER</small>
              <h2 id="simple-daily-enhancements">{dailyPlanRecord.title ? String(dailyPlanRecord.title) : "Günün Eğitim Akışı"}</h2>
            </div>
            <span className="simple-state is-ready">Kayıtlı</span>
          </div>

          {/* Hızlı Aksiyon Kartları */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="simple-action-button"
              style={{ padding: "12px 14px", background: "#f0f9ff", border: "1.5px solid #0284c7", color: "#0369a1", borderRadius: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              onClick={() => setDailyEvaluationOpen(true)}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.92rem" }}>★ Günü Değerlendir</strong>
                <small style={{ color: "#0284c7", fontSize: "0.76rem" }}>Çocuk · Öğretmen · Program</small>
              </div>
              <ChevronRightIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              className="simple-action-button"
              style={{ padding: "12px 14px", background: "#f0fdf4", border: "1.5px solid #059669", color: "#065f46", borderRadius: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              onClick={() => setAddActivityOpen(true)}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.92rem" }}>+ Plana Etkinlik Ekle</strong>
                <small style={{ color: "#059669", fontSize: "0.76rem" }}>TYMM Havuzu veya Özgün</small>
              </div>
              <ChevronRightIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              className="simple-action-button"
              style={{ padding: "12px 14px", background: "#fefce8", border: "1.5px solid #ca8a04", color: "#854d0e", borderRadius: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              onClick={() => setDailyDrawerOpen(true)}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.92rem" }}>👁 Planı İncele & Akış</strong>
                <small style={{ color: "#854d0e", fontSize: "0.76rem" }}>Zaman Çizelgesi ve Detaylar</small>
              </div>
              <ChevronRightIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              className="simple-action-button"
              style={{ padding: "12px 14px", background: "#eff6ff", border: "1.5px solid #2563eb", color: "#1d4ed8", borderRadius: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              disabled={exportingFormat !== null}
              onClick={() => void handleQuickExport("word")}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.92rem" }}>
                  {exportingFormat === "word" ? "Hazırlanıyor..." : "📄 Word İndir (.docx)"}
                </strong>
                <small style={{ color: "#1d4ed8", fontSize: "0.76rem" }}>Doğrudan OpenXML Belgesi</small>
              </div>
              <DownloadIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              className="simple-action-button"
              style={{ padding: "12px 14px", background: "#fdf2f8", border: "1.5px solid #db2777", color: "#be185d", borderRadius: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              disabled={exportingFormat !== null}
              onClick={() => void handleQuickExport("pdf")}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.92rem" }}>
                  {exportingFormat === "pdf" ? "Hazırlanıyor..." : "🖨️ PDF / A4 Yazdır"}
                </strong>
                <small style={{ color: "#be185d", fontSize: "0.76rem" }}>A4 Baskı Uyumlu</small>
              </div>
              <ReaderIcon aria-hidden="true" />
            </button>
          </div>

          {exportNotice ? (
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "0.82rem", color: "#166534" }}>
              {exportNotice}
            </div>
          ) : null}

          {/* Günün Materyalleri ve Kaynak Galerisi (Okul Öncesi Rehberi İlhamı) */}
          <DailyPlanMaterialsGallery />
        </section>
      ) : null}

      {dailyPlanRecord && activeScope ? (
        <>
          <DailyPlanEvaluationSheet
            isOpen={dailyEvaluationOpen}
            onClose={() => setDailyEvaluationOpen(false)}
            store={store}
            scope={activeScope}
            planId={dailyPlanRecord.id}
            civilDate={civilDate}
            onSaved={() => {
              void store.readSnapshot().then((snapshot) => {
                const plan = snapshot.plans.find((p) => p.id === dailyPlanRecord.id);
                setDailyPlanRecord(plan ?? null);
              });
            }}
          />
          <AddActivityToPlanModal
            isOpen={addActivityOpen}
            onClose={() => setAddActivityOpen(false)}
            store={store}
            scope={activeScope}
            planId={dailyPlanRecord.id}
            civilDate={civilDate}
            onAdded={() => {
              void store.readSnapshot().then((snapshot) => {
                const plan = snapshot.plans.find((p) => p.id === dailyPlanRecord.id);
                setDailyPlanRecord(plan ?? null);
              });
            }}
          />
          <DailyPlanDrawer
            isOpen={dailyDrawerOpen}
            onClose={() => setDailyDrawerOpen(false)}
            store={store}
            scope={activeScope}
            planId={dailyPlanRecord.id}
            civilDate={civilDate}
            ageBand={ageBand}
            onOpenEvaluation={() => {
              setDailyDrawerOpen(false);
              setDailyEvaluationOpen(true);
            }}
            onOpenAddActivity={() => {
              setDailyDrawerOpen(false);
              setAddActivityOpen(true);
            }}
          />
        </>
      ) : null}

      <TymmOfficialLibraryPanel
        ageBand={ageBand}
        contextArea={officialLibraryContextArea}
      />

      <TeacherPilotProtocolSummary />

      <button
        type="button"
        className="simple-workspace__advanced-toggle"
        aria-expanded={ageBand ? advancedSupportOpen : false}
        onClick={ageBand
          ? () => setAdvancedSupportOpen((current) => !current)
          : onOpenAgeBandSetup}
      >
        <span>
          <strong>{!ageBand
            ? "Yaş bandını seç"
            : advancedSupportOpen
              ? "Gelişmiş plan desteğini kapat"
              : "Gelişmiş plan desteğini aç"}</strong>
          <small>{ageBand
            ? "Koşula göre tam gün akışı, kapsam dengesi ve hazır koleksiyonlar"
            : "Yanlış yaşa ait etkinlik ve hedef gösterilmez"}</small>
        </span>
        <ChevronRightIcon aria-hidden="true" />
      </button>

      {advancedSupportOpen && orchestratedDay && ageBand ? (
        <>

      <section
        className="simple-workspace__section simple-plan-orchestra"
        aria-labelledby="simple-plan-orchestra-title"
      >
        <div className="simple-workspace__heading">
          <div>
            <small>PEDAGOJİK ORKESTRA</small>
            <h2 id="simple-plan-orchestra-title">Koşula göre tam gün akışı kur</h2>
          </div>
          <span>{orchestratedDay.totalMinutes} dk çekirdek akış</span>
        </div>
        <p className="simple-plan-orchestra__intro">
          Yaş bandı, sınıf koşulu, katılım yolları ve değer–eylem–kanıt izi birlikte yeniden hesaplanır. Hiçbir öneri öğretmen açmadan kayda dönüşmez.
        </p>
        <div className="simple-plan-orchestra__scenarios" aria-label="Sınıf koşulu">
          {PEDAGOGICAL_SCENARIOS.map((scenario) => (
            <button
              type="button"
              key={scenario.id}
              aria-pressed={scenarioId === scenario.id}
              onClick={() => setScenarioId(scenario.id)}
            >
              <strong>{scenario.shortLabel}</strong>
              <small>{scenario.description}</small>
            </button>
          ))}
        </div>
        <div className="simple-plan-orchestra__summary">
          <span><strong>{orchestratedDay.activityIds.length}</strong><small>bağlı etkinlik</small></span>
          <span><strong>{orchestratedDay.learningDomains.length}</strong><small>öğrenme alanı</small></span>
          <span><strong>7</strong><small>gün bölümü</small></span>
          <span><strong>7</strong><small>değer izi</small></span>
        </div>
        <ol className="simple-plan-orchestra__flow">
          {orchestratedDay.phases.map((phase) => (
            <li key={phase.id}>
              <button
                type="button"
                onClick={phase.activity
                  ? () => onOpenActivityStudio({
                      activityId: phase.activity?.id,
                      scenarioId,
                    })
                  : () => onOpenLevel("daily")}
                disabled={dataBusy}
              >
                <span>{phase.sequence}</span>
                <span>
                  <small>{phase.rhythmLabel} · {phase.durationMinutes} dk</small>
                  <strong>{phase.title}</strong>
                  <em>{phase.teacherMove}</em>
                  <b>{phase.valueTrace.value} → eylem → kanıt → sonraki plan</b>
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <div className="simple-plan-orchestra__actions">
          <button type="button" onClick={() => onOpenLevel("daily")} disabled={dataBusy}>
            <ReaderIcon aria-hidden="true" /> Günlük planı bu akışla aç
          </button>
          <button
            type="button"
            onClick={() => onOpenActivityStudio({ scenarioId })}
            disabled={dataBusy}
          >
            <TargetIcon aria-hidden="true" /> Etkinlikleri koşula göre incele
          </button>
        </div>
      </section>

      <section
        className="simple-workspace__section simple-plan-coverage"
        aria-labelledby="simple-plan-coverage-title"
      >
        <div className="simple-workspace__heading">
          <div>
            <small>KAPSAM RADARI</small>
            <h2 id="simple-plan-coverage-title">Öğrenme alanlarını dengede tut</h2>
          </div>
          <span>{ageBand.replace("-", "–")} ay</span>
        </div>
        <p>Bu dağılım resmî değerlendirme değildir; etkinlik envanterindeki görünür planlama dengesidir.</p>
        <div className="simple-plan-coverage__matrix">
          {coverageMatrix.map((item) => (
            <article key={item.domain}>
              <header><strong>{item.domain}</strong><span>{item.activityCount}</span></header>
              <div aria-label={`${item.domain} göreli kapsamı yüzde ${item.percentage}`}>
                <span style={{ width: `${item.percentage}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="simple-workspace__section simple-plan-collections"
        aria-labelledby="simple-plan-collections-title"
      >
        <div className="simple-workspace__heading">
          <div>
            <small>PLAN ZENGİNLEŞTİRME</small>
            <h2 id="simple-plan-collections-title">Hazır etkinlik koleksiyonları</h2>
          </div>
          <span>Her biri düzenlenebilir</span>
        </div>
        <p className="simple-plan-collections__intro">
          Süre, ortam veya öğrenme ihtiyacına göre seçin; etkinlikleri yaş grubuna uyarlayıp günlük plana ekleyin.
        </p>
        <div className="simple-plan-collection-grid">
          {ACTIVITY_STUDIO_COLLECTIONS.map((collection) => (
            <button
              type="button"
              key={collection.id}
              onClick={() => onOpenActivityStudio({ collection: collection.id })}
              disabled={dataBusy}
            >
              <span>
                <strong>{collection.label}</strong>
                <small>{collection.detail}</small>
              </span>
              <b>{collectionItemCount(collection.id)} etkinlik</b>
              <ChevronRightIcon aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section
        className="simple-workspace__section simple-plan-quality"
        aria-labelledby="simple-plan-quality-title"
      >
        <div className="simple-workspace__heading">
          <div>
            <small>ÖĞRETMEN ASİSTANI KONTROLÜ</small>
            <h2 id="simple-plan-quality-title">Planı kaydetmeden önce</h2>
          </div>
        </div>
        <ul>
          {PLAN_QUALITY_PROMPTS.map(([title, detail]) => (
            <li key={title}>
              <span aria-hidden="true">{PLAN_QUALITY_PROMPTS.findIndex((item) => item[0] === title) + 1}</span>
              <p><strong>{title}</strong><small>{detail}</small></p>
            </li>
          ))}
        </ul>
      </section>

      <section className="simple-workspace__section simple-workspace__tools" aria-labelledby="simple-plan-tools">
        <div className="simple-workspace__heading">
          <div>
            <small>HIZLI ARAÇLAR</small>
            <h2 id="simple-plan-tools">Etkinlik ve okul ekleri</h2>
          </div>
        </div>
        <div className="simple-tool-grid">
          <button
            type="button"
            onClick={() => onOpenActivityStudio()}
            disabled={dataBusy}
          >
            <TargetIcon aria-hidden="true" />
            <span><strong>Oyun ve materyaller</strong><small>Boyama, çizim, eşleştirme, hareket</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenCalendar} disabled={dataBusy}>
            <CalendarIcon aria-hidden="true" />
            <span><strong>Okul etkinliği ekle</strong><small>Başlık, tarih ve kısa not yeterli</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenDocuments} disabled={dataBusy}>
            <FileTextIcon aria-hidden="true" />
            <span><strong>Plan çıktıları</strong><small>Görsel PDF ve yazdırılabilir belgeleri hazırla</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </section>

        </>
      ) : null}
      <TeachingStateAndPlayFamilyPanel
        store={store}
        refreshKey={refreshKey}
        civilDate={civilDate}
        disabled={educationalWritesDisabled || dataBusy}
      />
    </main>
  );
}
