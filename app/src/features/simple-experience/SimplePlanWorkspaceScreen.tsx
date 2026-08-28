import { useState } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  ChevronRightIcon,
  FileTextIcon,
  ReaderIcon,
  TargetIcon,
} from "@radix-ui/react-icons";

import type { PlanWorkspaceScreenProps } from "../planning/PlanWorkspaceScreen.tsx";
import { createPlanWorkbenchPresentation } from "../planning/plan-workbench-model.ts";
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
  onOpenActivityStudio(options?: ActivityStudioOpenOptions): void;
  onOpenBuiltInMaarifLibrary(): void;
  onOpenAgeBandSetup(): void;
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
}: SimplePlanWorkspaceScreenProps) {
  const [scenarioId, setScenarioId] =
    useState<PedagogicalScenarioId>("balanced");
  const [advancedSupportOpen, setAdvancedSupportOpen] = useState(false);
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
        <p>Plan türünü seçin; kaydedin veya tek dokunuşla çıktı alın.</p>
      </header>

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
            ? "Yaş bandını tamamla"
            : presentation.priority.actionLabel}
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>

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
                ? "60–72 AY · HAZIR MAARİF İÇERİĞİ"
                : ageBand
                  ? `${ageBand.replace("-", "–")} AY · YAŞA UYGUN ETKİNLİKLER`
                  : "YAŞ BANDI GEREKLİ"}</small>
              <strong>{builtInMaarifPlanEligible
                ? "Kaynak bütünlüğü doğrulanmış içerikler"
                : ageBand
                  ? "Bu yaş bandının etkinlik bankasını aç"
                  : "Önce sınıfın resmî yaş bandını seç"}</strong>
              <em>{builtInMaarifPlanEligible
                ? "Eylül için dört hafta ve 12 etkinliği inceleyip planınıza ekleyin."
                : ageBand
                  ? "Hazır tam plan paketi yalnız 60–72 ay için yayımlandı; bu yaş bandında öğretmen planı ve çevrimdışı etkinlikler açıktır."
                  : "Yanlış yaşa ait plan veya etkinlik gösterilmez."}</em>
            </span>
            <span className={`simple-state ${ageBand ? "is-ready" : ""}`.trim()}>
              {ageBand ? "Aç" : "Tamamla"}
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
            ? "Plan için yaş bandını tamamla"
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

        </>
      ) : null}

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
            onClick={ageBand ? () => onOpenActivityStudio() : onOpenAgeBandSetup}
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
    </main>
  );
}
