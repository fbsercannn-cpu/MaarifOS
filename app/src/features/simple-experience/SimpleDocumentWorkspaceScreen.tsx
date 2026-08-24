import { useState } from "react";
import {
  ArchiveIcon,
  ChevronRightIcon,
  FileTextIcon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type { DocumentWorkspaceScreenProps } from "../documents/DocumentWorkspaceScreen.tsx";
import "./simple-workspaces.css";

export type SimplePlanOutputKind = "annual" | "monthly" | "weekly" | "daily";
export type SimpleDocumentOutputId = SimplePlanOutputKind | "roster" | "observations";
export type SimpleDocumentOutputState =
  | "ready"
  | "needs-setup"
  | "needs-content"
  | "incomplete";

export interface SimpleDocumentWorkspaceScreenProps
  extends DocumentWorkspaceScreenProps {
  onDownloadClassRoster(): void | Promise<void>;
  onDownloadPlan(kind: SimplePlanOutputKind): void | Promise<void>;
  onOpenObservationOutput(): void;
  onOpenSetup(): void;
  outputStates?: Partial<Record<SimpleDocumentOutputId, SimpleDocumentOutputState>>;
}

const OUTPUTS = [
  {
    id: "roster",
    label: "İDARE",
    title: "Sınıf listesi",
    detail: "Öğrenci no, T.C. kimlik, veli ve imza alanlı yazdırılabilir dosya",
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
    if (options.studentCount === 0) return "needs-setup";
    return options.observationCount > 0 ? "ready" : "needs-content";
  }
  if (id === "daily") return options.workspace.daily.planId ? "ready" : "needs-content";
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
    if (id === "roster" || id === "observations") return "Yazdırılabilir dosya";
    return "PDF";
  }
  if (state === "needs-setup" || id === "roster") return "Bilgileri tamamla";
  if (id === "observations") return "Gözlem ekle";
  if (id === "annual" && state === "incomplete") return "Yılı tamamla";
  return "Planı hazırla";
}

export function SimpleDocumentWorkspaceScreen({
  workspace,
  studentCount,
  observationCount,
  dataBusy,
  onDownloadClassRoster,
  onDownloadPlan,
  onOpenObservationOutput,
  onOpenSetup,
  onOpenPreparationCenter,
  outputStates,
}: SimpleDocumentWorkspaceScreenProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const run = async (id: (typeof OUTPUTS)[number]["id"]) => {
    if (busyId || dataBusy) return;
    setBusyId(id);
    setMessage("");
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
      if (id === "roster") await onDownloadClassRoster();
      else if (id === "observations") onOpenObservationOutput();
      else await onDownloadPlan(id);
      setMessage(
        id === "observations"
          ? "Gözlem için yazdırılabilir dosya alanı açıldı."
          : id === "roster"
            ? "Yazdırılabilir dosya bu cihazda hazırlandı."
            : "PDF bu cihazda hazırlandı.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Belge hazırlanamadı.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="simple-workspace" aria-labelledby="simple-documents-title">
      <header className="simple-workspace__hero">
        <span>TEK DOKUNUŞLA HAZIRLA</span>
        <h1 id="simple-documents-title" data-route-heading tabIndex={-1}>Çıktılar</h1>
        <p>Belgeyi seçin; okul, sınıf ve öğretmen bilgileri kendiliğinden yerleşsin.</p>
        <div className="simple-workspace__facts" aria-label="Kayıt özeti">
          <span><strong>{studentCount}</strong> öğrenci</span>
          <span><strong>{observationCount}</strong> gözlem</span>
        </div>
      </header>

      <section className="simple-workspace__section" aria-labelledby="simple-outputs-heading">
        <div className="simple-workspace__heading">
          <div>
            <small>HAZIR ÇIKTILAR</small>
            <h2 id="simple-outputs-heading">Hangisini alacaksınız?</h2>
          </div>
        </div>
        <div className="simple-action-list">
          {OUTPUTS.map((output) => {
            const Icon = output.icon;
            const state = outputStates?.[output.id] ?? defaultOutputState(output.id, {
              workspace,
              studentCount,
              observationCount,
            });
            const action = outputAction(output.id, state);
            const busy = busyId === output.id;
            return (
              <button
                type="button"
                key={output.id}
                onClick={() => void run(output.id)}
                disabled={dataBusy || busyId !== null}
                aria-busy={busy}
                aria-label={`${output.title}. Durum: ${STATE_LABELS[state]}. ${busy ? "Hazırlanıyor" : action}. ${output.detail}`}
              >
                <span className="simple-action-list__icon" aria-hidden="true"><Icon /></span>
                <span>
                  <small>{output.label}</small>
                  <strong>{output.title}</strong>
                  <em>{output.detail}</em>
                </span>
                <span className={`simple-state is-${state}`}>
                  {busy ? "Hazırlanıyor" : action}
                </span>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {message ? <p className="simple-workspace__message" role="status">{message}</p> : null}
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
