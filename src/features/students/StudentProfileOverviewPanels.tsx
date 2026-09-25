import type { ReactNode } from "react";
import {
  CameraIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";

export type StudentProfileSection =
  | "flow"
  | "portfolio"
  | "details"
  | "contacts"
  | "care"
  | "family";

type OverviewProps = {
  avatar: ReactNode;
  preferredName?: string;
  fullName: string;
  ageLabel: string;
  profilePhotoBusy: boolean;
  dataBusy: boolean;
  hasProfilePhoto: boolean;
  removedProfilePhoto: boolean;
  attendanceLabel: string;
  observationCount: number;
  pendingLinkCount: number;
  onSelectPhoto(file?: File): void;
  onRemovePhoto(): void;
  onUndoRemovePhoto(): void;
  onShowAllObservations(): void;
  onShowPendingLinks(): void;
};

export function StudentProfileOverviewPanel(props: OverviewProps) {
  const disabled = props.profilePhotoBusy || props.dataBusy;
  return (
    <>
      <section className="student-profile-hero" aria-label="Çocuk profil özeti">
        {props.avatar}
        <div>
          <span className="section-eyebrow">Bireysel gelişim izi</span>
          <h3>{props.preferredName ?? props.fullName}</h3>
          {props.preferredName ? <p>{props.fullName}</p> : null}
          <strong>{props.ageLabel}</strong>
        </div>
      </section>

      <section className="student-photo-actions" aria-label="Profil fotoğrafı işlemleri">
        <label>
          <CameraIcon aria-hidden="true" />
          <span>{props.profilePhotoBusy ? "Hazırlanıyor…" : "Fotoğraf çek"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              props.onSelectPhoto(file);
            }}
          />
        </label>
        <label>
          <UploadIcon aria-hidden="true" />
          <span>Galeriden seç</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              props.onSelectPhoto(file);
            }}
          />
        </label>
        {props.hasProfilePhoto ? (
          <button type="button" onClick={props.onRemovePhoto} disabled={disabled}>
            <TrashIcon aria-hidden="true" />
            Kaldır
          </button>
        ) : null}
      </section>

      {props.removedProfilePhoto ? (
        <div className="student-profile-undo" role="status">
          <span>Fotoğraf kaldırıldı; profil kaydedilene kadar geri alınabilir.</span>
          <button type="button" onClick={props.onUndoRemovePhoto}>
            Geri al
          </button>
        </div>
      ) : null}

      <section className="student-profile-metrics" aria-label="Profil göstergeleri">
        <div>
          <small>Bugünkü devam</small>
          <strong>{props.attendanceLabel}</strong>
        </div>
        <button type="button" onClick={props.onShowAllObservations}>
          <small>Toplam gözlem</small>
          <strong>{props.observationCount}</strong>
        </button>
        <button type="button" onClick={props.onShowPendingLinks}>
          <small>Seçerek bağla</small>
          <strong>{props.pendingLinkCount}</strong>
        </button>
      </section>
    </>
  );
}

type TabsProps = {
  activeTab: StudentProfileSection;
  portfolioEnabled: boolean;
  onSelect(tab: Exclude<StudentProfileSection, "portfolio">): void;
  onSelectPortfolio(): void;
};

export function StudentProfileTabs(props: TabsProps) {
  return (
    <nav className="student-profile-tabs" aria-label="Çocuk profili bölümleri">
      <button
        type="button"
        aria-current={props.activeTab === "flow" ? "page" : undefined}
        onClick={() => props.onSelect("flow")}
      >
        Akış
      </button>
      {props.portfolioEnabled ? (
        <button
          type="button"
          aria-current={props.activeTab === "portfolio" ? "page" : undefined}
          onClick={props.onSelectPortfolio}
        >
          Portfolyo
        </button>
      ) : null}
      <button
        type="button"
        aria-current={props.activeTab === "details" ? "page" : undefined}
        onClick={() => props.onSelect("details")}
      >
        Bilgiler
      </button>
      <button
        type="button"
        aria-current={props.activeTab === "contacts" ? "page" : undefined}
        onClick={() => props.onSelect("contacts")}
      >
        Yakınlar
      </button>
      <button
        type="button"
        aria-current={props.activeTab === "care" ? "page" : undefined}
        onClick={() => props.onSelect("care")}
      >
        Güvenlik
      </button>
      <button
        type="button"
        aria-current={props.activeTab === "family" ? "page" : undefined}
        onClick={() => props.onSelect("family")}
      >
        Aile & izinler
      </button>
    </nav>
  );
}
