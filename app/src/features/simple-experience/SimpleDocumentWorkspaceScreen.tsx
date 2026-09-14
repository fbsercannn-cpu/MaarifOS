import { type ReactNode, useState } from "react";
import {
  ArchiveIcon,
  ChevronRightIcon,
  FileTextIcon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type { DocumentWorkspaceScreenProps } from "../documents/DocumentWorkspaceScreen.tsx";
import { TeacherFeedbackPanel } from "../feedback/TeacherFeedbackPanel.tsx";
import {
  createTeacherFeedback,
  type TeacherFeedback,
} from "../feedback/teacher-feedback.ts";
import { resolveSimpleDailyDocumentReadiness } from "../teacher-cycle/teacher-work-cycle.ts";
import {
  DOCUMENT_AUTHORIZED_CHANNEL_NOTICE,
  DOCUMENT_USE_PHASES,
} from "../documents/document-use-policy.ts";
import "./simple-workspaces.css";
import "./simple-document-purposes.css";
import { ClassRosterPurposeActions } from "../classroom/ClassRosterPurposeActions.tsx";
import type { ClassRosterLayoutId } from "../classroom/class-roster-layouts.ts";

export type SimplePlanOutputKind = "annual" | "monthly" | "weekly" | "daily";
export type SimpleDocumentOutputId = SimplePlanOutputKind | "roster" | "observations";
export type SimpleDocumentOutputState =
  | "ready"
  | "needs-setup"
  | "needs-content"
  | "incomplete";

export interface SimpleDocumentWorkspaceScreenProps
  extends DocumentWorkspaceScreenProps {
  extraDocumentTools?: ReactNode;
  documentPurposeTools?: Partial<Record<"classroom" | "family" | "administration" | "archive", ReactNode>>;
  onDownloadClassRoster(): void | Promise<void>;
  onPrepareRoster?(layout: ClassRosterLayoutId): void | Promise<void>;
  onShareClassRoster(): Promise<"shared" | "downloaded" | "cancelled">;
  onDownloadPlan(kind: SimplePlanOutputKind): void | Promise<void>;
  onOpenObservationOutput(): void;
  onPrepareOutput(
    id: Exclude<SimpleDocumentOutputId, "roster">,
  ): void | Promise<void>;
  onOpenSetup(): void;
  onOpenRosterRequirements(): void;
  outputStates?: Partial<Record<SimpleDocumentOutputId, SimpleDocumentOutputState>>;
  outputRequirements?: Partial<Record<SimpleDocumentOutputId, string>>;
  incompleteRosterStudentCount?: number;
  schoolNameReady?: boolean;
  teacherNameReady?: boolean;
}

const OUTPUTS = [
  {
    id: "roster",
    label: "İDARE",
    title: "Sınıf listesi",
    detail: "Günlük çizelge, veli iletişimi veya ayrıntılı öğrenci dökümü",
    icon: PersonIcon,
  },
  {
    id: "monthly",
    label: "TYMM RESMÎ TEMEL",
    title: "Aylık eğitim planı",
    detail: "Okul, sınıf ve öğretmen imzalı",
    icon: FileTextIcon,
  },
  {
    id: "daily",
    label: "TYMM RESMÎ TEMEL",
    title: "Günlük eğitim planı",
    detail: "Bugünün kaydedilmiş akışı",
    icon: ReaderIcon,
  },
  {
    id: "weekly",
    label: "DESTEK BELGESİ",
    title: "Haftalık çalışma akışı",
    detail: "Günler ve okulun ek etkinlikleri",
    icon: ArchiveIcon,
  },
  {
    id: "annual",
    label: "DESTEK BELGESİ",
    title: "Yıllık planlama panosu",
    detail: "Eğitim yılının bütün plan zinciri",
    icon: ArchiveIcon,
  },
  {
    id: "observations",
    label: "ÇOCUK GÖZLEMİ",
    title: "Veli veya idare özeti",
    detail: "Tek çocuk için, tanı koymadan hazırlanan yazdırılabilir dosya",
    icon: PersonIcon,
  },
] as const;

const STATE_LABELS: Record<SimpleDocumentOutputState, string> = {
  ready: "Hazır",
  "needs-setup": "Bilgi eksik",
  "needs-content": "İçerik gerekli",
  incomplete: "Tamamlanmalı",
};

function defaultOutputState(
  id: SimpleDocumentOutputId,
  options: Pick<SimpleDocumentWorkspaceScreenProps, "workspace" | "studentCount" | "observationCount">,
): SimpleDocumentOutputState {
  if (options.workspace.status === "not-configured") return "needs-setup";
  if (id === "roster") return options.studentCount > 0 ? "ready" : "needs-content";
  if (id === "observations") {
    if (options.studentCount === 0) return "needs-content";
    return options.observationCount > 0 ? "ready" : "needs-content";
  }
  if (id === "daily") {
    return resolveSimpleDailyDocumentReadiness(options.workspace).ready
      ? "ready"
      : "needs-content";
  }
  if (id === "weekly") return options.workspace.weekly ? "ready" : "needs-content";
  if (id === "monthly") return options.workspace.monthly ? "ready" : "needs-content";
  if (!options.workspace.annual) return "needs-content";
  return options.workspace.documents.planDocumentReady ? "ready" : "incomplete";
}

function outputAction(
  id: SimpleDocumentOutputId,
  state: SimpleDocumentOutputState,
): string {
  if (state === "ready") {
    if (id === "roster") return "Görsel PDF indir";
    if (id === "observations") return "Yazdırılabilir dosya";
    return "Görsel PDF";
  }
  if (state === "needs-setup" || id === "roster") return "Bilgileri tamamla";
  if (id === "observations") return "Gözlem ekle";
  if (id === "annual" && state === "incomplete") return "Yılı tamamla";
  return "Planı hazırla";
}

export function SimpleDocumentWorkspaceScreen({
  workspace,
  extraDocumentTools,
  documentPurposeTools,
  studentCount,
  observationCount,
  dataBusy,
  onDownloadClassRoster,
  onPrepareRoster,
  onShareClassRoster,
  onDownloadPlan,
  onOpenObservationOutput,
  onPrepareOutput,
  onOpenSetup,
  onOpenRosterRequirements,
  onOpenPreparationCenter,
  outputStates,
  outputRequirements,
  incompleteRosterStudentCount = 0,
  schoolNameReady = true,
  teacherNameReady = true,
}: SimpleDocumentWorkspaceScreenProps) {
  const [purpose, setPurpose] = useState<"classroom" | "family" | "administration" | "archive">("classroom");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);
  const [retryId, setRetryId] = useState<SimpleDocumentOutputId | "roster-share" | null>(null);
  const setupRequirement = [
    schoolNameReady ? null : "okul adı",
    teacherNameReady ? null : "öğretmen adı soyadı",
  ].filter((field): field is string => field !== null).join(" ve ");
  const rosterRequirement = incompleteRosterStudentCount > 0
    ? `${incompleteRosterStudentCount} çocuk için öğrenci no, T.C. kimlik veya veli iletişimi tamamlanmalı.`
    : undefined;

  const run = async (id: (typeof OUTPUTS)[number]["id"]) => {
    if (busyId || dataBusy) return;
    setBusyId(id);
    setMessage("");
    setFeedback(null);
    setRetryId(null);
    try {
      const state = outputStates?.[id] ?? defaultOutputState(id, {
        workspace,
        studentCount,
        observationCount,
      });
      if (state === "needs-setup") {
        onOpenSetup();
        setMessage("Eksik okul ve öğretmen bilgileri alanı açıldı.");
        return;
      }
      if (id === "roster" && state !== "ready") {
        onOpenRosterRequirements();
        setMessage(outputRequirements?.roster ?? rosterRequirement ?? "Sınıf listesi için eksik öğrenci bilgileri açıldı.");
        return;
      }
      if (id !== "roster" && state !== "ready") {
        await onPrepareOutput(id);
        setMessage(
          outputRequirements?.[id] ??
            (id === "observations"
              ? studentCount === 0
                ? "İlk çocuk kaydı alanı açıldı."
                : "İlk gözlem alanı açıldı; kaydettikten sonra çıktınız hazır olacak."
              : "Eksik plan adımı açıldı; kaydettiğinizde çıktı hazır olacak."),
        );
        return;
      }
      if (id === "roster") await onDownloadClassRoster();
      else if (id === "observations") onOpenObservationOutput();
      else await onDownloadPlan(id);
      setMessage(
        id === "observations"
          ? "Gözlem için yazdırılabilir dosya alanı açıldı."
          : id === "roster"
            ? "Sınıf listesi önizlemede hazır; buradan yazdırabilir, PDF veya Excel olarak alabilirsiniz."
            : "Görsel PDF bu cihazda hazırlandı.",
      );
    } catch (reason) {
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Belge hazırlanamadı. Seçiminiz korunuyor; yeniden deneyebilirsiniz.",
        }),
      );
      setRetryId(id);
    } finally {
      setBusyId(null);
    }
  };

  const shareRoster = async () => {
    if (busyId || dataBusy) return;
    setBusyId("roster-share");
    setMessage("");
    setFeedback(null);
    setRetryId(null);
    try {
      const state = outputStates?.roster ?? defaultOutputState("roster", {
        workspace,
        studentCount,
        observationCount,
      });
      if (state === "needs-setup") {
        onOpenSetup();
        setMessage("Eksik okul ve öğretmen bilgileri alanı açıldı.");
        return;
      }
      if (state !== "ready") {
        onOpenRosterRequirements();
        setMessage(
          outputRequirements?.roster ??
            rosterRequirement ??
            "Sınıf listesi için eksik öğrenci bilgileri açıldı.",
        );
        return;
      }
      const result = await onShareClassRoster();
      setMessage(
        result === "shared"
          ? "Hassas veri onayından sonra sınıf listesi paylaşım ekranına gönderildi."
          : result === "downloaded"
            ? "Bu telefon görsel PDF dosyası paylaşımını desteklemedi; aynı görsel PDF güvenli indirme olarak hazırlandı."
            : "Paylaşım iptal edildi; hiçbir dosya gönderilmedi veya indirilmedi.",
      );
    } catch (reason) {
      setFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail:
            "Sınıf listesi paylaşılamadı. Hiçbir dosya gönderilmedi; yeniden deneyebilirsiniz.",
        }),
      );
      setRetryId("roster-share");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="simple-workspace" aria-labelledby="simple-documents-title">
      <header className="simple-workspace__hero">
        <span>HIZLA HAZIRLA</span>
        <h1 id="simple-documents-title" data-route-heading tabIndex={-1}>Belgeler</h1>
        <p>Belgeyi seçin; okul, sınıf ve öğretmen bilgileri kendiliğinden yerleşsin.</p>
        <div className="simple-workspace__facts" aria-label="Kayıt özeti">
          <span><strong>{studentCount}</strong> öğrenci</span>
          <span><strong>{observationCount}</strong> gözlem</span>
        </div>
      </header>

      <nav className="simple-document-purposes" aria-label="Belge kullanım amacı">
        {([{id:"classroom",label:"Sınıfta kullan"},{id:"family",label:"Aileye ver"},{id:"administration",label:"İdareye sun"},{id:"archive",label:"Dosyala"}] as const).map(item=><button type="button" key={item.id} aria-pressed={purpose===item.id} onClick={()=>setPurpose(item.id)}>{item.label}</button>)}
      </nav>
      {documentPurposeTools?.[purpose] ?? (purpose === "classroom" ? extraDocumentTools : null)}
      <details className="simple-document-use-policy">
        <summary>
          <span>
            <small>SINIF İÇİ KULLANIM SINIRI</small>
            <strong>Ders öncesi hazırla, basılı kullan, ders sonrası kaydet</strong>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </summary>
        <div>
          <ol>
            {DOCUMENT_USE_PHASES.map((phase) => (
              <li key={phase.id}>
                <strong>{phase.label}</strong>
                <p>{phase.detail}</p>
              </li>
            ))}
          </ol>
          <p>{DOCUMENT_AUTHORIZED_CHANNEL_NOTICE}</p>
        </div>
      </details>

      {setupRequirement.length > 0 ? (
        <button
          type="button"
          className="simple-workspace__setup-banner"
          onClick={onOpenSetup}
        >
          <span>
            <small>BİR KEZ TAMAMLAYIN</small>
            <strong>Belgeler için {setupRequirement} eksik</strong>
            <em>Tamamladığınızda bütün uygun çıktılar tek dokunuşla açılır.</em>
          </span>
          <b>Bilgileri yaz</b>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      ) : null}

      <section className="simple-workspace__section" aria-labelledby="simple-outputs-heading">
        <div className="simple-workspace__heading">
          <div>
            <small>HAZIR ÇIKTILAR</small>
            <h2 id="simple-outputs-heading">Hangisini alacaksınız?</h2>
          </div>
        </div>
        {onPrepareRoster && <ClassRosterPurposeActions onPrepare={onPrepareRoster} disabled={dataBusy || busyId !== null} />}
        <div className="simple-action-list">
          {OUTPUTS.filter(output => purpose === "archive" || (purpose === "family" ? output.id === "observations" : purpose === "administration" ? ["monthly", "annual", "roster"].includes(output.id) : ["daily", "weekly", "roster"].includes(output.id))).map((output) => {
            const Icon = output.icon;
            const state = outputStates?.[output.id] ?? defaultOutputState(output.id, {
              workspace,
              studentCount,
              observationCount,
            });
            const action = outputAction(output.id, state);
            const requirement = outputRequirements?.[output.id] ??
              (output.id === "roster" ? rosterRequirement : undefined);
            const busy = busyId === output.id;
            return (
              <button
                type="button"
                key={output.id}
                onClick={() => void run(output.id)}
                disabled={dataBusy || busyId !== null}
                aria-busy={busy}
                aria-label={`${output.title}. Durum: ${STATE_LABELS[state]}. ${busy ? "Hazırlanıyor" : action}. ${requirement ?? output.detail}`}
              >
                <span className="simple-action-list__icon" aria-hidden="true"><Icon /></span>
                <span>
                  <small>{output.label}</small>
                  <strong>{output.title}</strong>
                  <em>{requirement ?? output.detail}</em>
                </span>
                <span className={`simple-state is-${state}`}>
                  {busy ? "Hazırlanıyor" : action}
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="simple-workspace__advanced-documents"
          onClick={() => void shareRoster()}
          disabled={dataBusy || busyId !== null}
          aria-busy={busyId === "roster-share"}
        >
          <PersonIcon aria-hidden="true" />
          <span>
            <strong>{busyId === "roster-share" ? "Sınıf listesi görsel PDF hazırlanıyor…" : "Sınıf listesini görsel PDF olarak paylaş"}</strong>
            <small>T.C. kimlik ve veli telefonu içerir; önce açık uyarı gösterilir. Dosya paylaşımı yoksa görsel PDF indirilir.</small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
        {message ? <p className="simple-workspace__message" role="status">{message}</p> : null}
        {feedback ? (
          <TeacherFeedbackPanel
            feedback={feedback}
            onAction={
              retryId === "roster-share"
                ? () => void shareRoster()
                : retryId
                  ? () => void run(retryId)
                  : undefined
            }
            compact
          />
        ) : null}
      </section>

      <button
        type="button"
        className="simple-workspace__advanced-documents"
        onClick={onOpenPreparationCenter}
        disabled={dataBusy || busyId !== null}
      >
        <ArchiveIcon aria-hidden="true" />
        <span>
          <strong>Ayrıntılı resmî formlar</strong>
          <small>Anekdot kayıt formu, Ek 18 ve öğrenci dosyası</small>
        </span>
        <ChevronRightIcon aria-hidden="true" />
      </button>


      <p className="simple-workspace__privacy">
        T.C. kimlik ve veli telefonu yalnız idare listesindedir; veli gözlem özetine eklenmez.
      </p>
    </main>
  );
}
