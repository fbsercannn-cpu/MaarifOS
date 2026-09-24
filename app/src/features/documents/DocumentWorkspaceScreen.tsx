import {
  ArchiveIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import {
  createDocumentWorkspacePresentation,
  type DocumentWorkspaceItemId,
} from "./document-workspace-model.ts";
import {
  DOCUMENT_AUTHORIZED_CHANNEL_NOTICE,
  DOCUMENT_USE_PHASES,
} from "./document-use-policy.ts";
import "./document-workspace.css";

export interface DocumentWorkspaceScreenProps {
  workspace: TeacherWorkCycleWorkspace;
  studentCount: number;
  observationCount: number;
  dataBusy: boolean;
  onOpenItem(itemId: DocumentWorkspaceItemId): void;
  onOpenPreparationCenter(): void;
}

const ITEM_ICONS = {
  plans: ReaderIcon,
  monthly: FileTextIcon,
  anecdotes: ArchiveIcon,
  students: PersonIcon,
} as const;

export function DocumentWorkspaceScreen({
  workspace,
  studentCount,
  observationCount,
  dataBusy,
  onOpenItem,
  onOpenPreparationCenter,
}: DocumentWorkspaceScreenProps) {
  const presentation = createDocumentWorkspacePresentation(workspace, {
    studentCount,
    observationCount,
  });

  return (
    <main className="document-workspace" aria-labelledby="document-workspace-title">
      <header className="document-workspace-hero">
        <div>
          <span>MaarifOS · belge ve kayıt merkezi</span>
          <h1 id="document-workspace-title" data-route-heading tabIndex={-1}>Belgeler</h1>
          <p>Önce kaynağın hazır olup olmadığını görün; sonra doğru belgeyi üretin.</p>
        </div>
        <div className="document-workspace-score" aria-label={`${presentation.readyCount} belge grubu hazır, ${presentation.pendingCount} belge grubu işlem bekliyor, ${presentation.emptyCount} belge grubu için henüz kaynak yok`}>
          <strong>{presentation.readyCount}</strong>
          <span>hazır grup</span>
          <em>{presentation.pendingCount} işlem · {presentation.emptyCount} başlangıç</em>
        </div>
      </header>

      <section className="document-workspace-use-policy" aria-labelledby="document-workspace-use-policy-title">
        <div className="document-workspace-heading">
          <div>
            <span>Sınıf içi kullanım sınırı</span>
            <h2 id="document-workspace-use-policy-title">Hazırla, basılı kullan, sonra kaydet</h2>
          </div>
          <small>Telefon sınıf içinde zorunlu değil</small>
        </div>
        <ol>
          {DOCUMENT_USE_PHASES.map((phase) => <li key={phase.id}>
            <strong>{phase.label}</strong>
            <p>{phase.detail}</p>
          </li>)}
        </ol>
        <p className="document-workspace-channel-notice">{DOCUMENT_AUTHORIZED_CHANNEL_NOTICE}</p>
      </section>

      <section className="document-workspace-readiness" aria-labelledby="document-workspace-readiness-title">
        <div className="document-workspace-heading">
          <div>
            <span>Belge hazır olma durumu</span>
            <h2 id="document-workspace-readiness-title">Kaynak → onay → çıktı</h2>
          </div>
          <small>Bu cihazdaki kalıcı kayıtlar</small>
        </div>
        <div className="document-workspace-grid">
          {presentation.items.map((item) => {
            const Icon = ITEM_ICONS[item.id];
            const StateIcon = item.tone === "ready" ? CheckCircledIcon : ClockIcon;
            return (
              <button
                type="button"
                key={item.id}
                className={`document-workspace-card is-${item.tone}`}
                onClick={() => onOpenItem(item.id)}
                disabled={dataBusy}
                aria-label={`${item.label}: ${item.title}. ${item.detail}. ${item.actionLabel}`}
              >
                <span className="document-workspace-card-icon" aria-hidden="true"><Icon /></span>
                <span className="document-workspace-card-copy">
                  <small>{item.label}</small>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <em><StateIcon aria-hidden="true" /> {item.source}</em>
                  <b>{item.actionLabel} <ChevronRightIcon aria-hidden="true" /></b>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="document-workspace-history" aria-labelledby="document-workspace-history-title">
        <span className="document-workspace-history-icon" aria-hidden="true"><ArchiveIcon /></span>
        <div>
          <small>Belge geçmişi</small>
          <h2 id="document-workspace-history-title">Sürümlü üretim geçmişi henüz tutulmuyor</h2>
          <p>
            Bu sürüm dosyayı üretir; ancak indirilen belgenin manifestini, üretim zamanını ve önceki
            sürümünü kalıcı bir listede saklamaz. Bu nedenle eski çıktıyı “güncel” diye göstermiyoruz.
          </p>
        </div>
        <button type="button" onClick={onOpenPreparationCenter} disabled={dataBusy}>
          Belge hazırlama alanını aç <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
