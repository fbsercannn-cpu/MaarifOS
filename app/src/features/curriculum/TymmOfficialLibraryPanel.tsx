import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircledIcon,
  ChevronRightIcon,
  Cross2Icon,
  DownloadIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import {
  TYMM_2024_CATALOG_METADATA,
  type Tymm2024AgeBand,
} from "./tymm-2024-catalog.ts";
import { KeyboardInput } from "../../mobile";
import {
  TYMM_PENDING_MAPPING_DISCLOSURE,
  TYMM_PENDING_MAPPING_PUBLICATION_STATE,
} from "../pedagogical-os/tymm-human-review-ledger.ts";
import { getTymmOfficialAgeResource } from "./tymm-official-resource-catalog.ts";
import {
  TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
  TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
  TYMM_OFFICIAL_LIBRARY,
  TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
  TYMM_OFFICIAL_LIBRARY_AREA_LABELS,
  TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS,
  canEmbedTymmOfficialLibraryResource,
  listTymmOfficialLibraryResources,
  recommendTymmOfficialLibraryResources,
  type TymmOfficialLibraryArea,
  type TymmOfficialLibraryMaterialKind,
  type TymmOfficialLibraryResource,
} from "./tymm-official-library.ts";
import "./tymm-official-library.css";

const AGE_LABELS: Readonly<Record<Tymm2024AgeBand, string>> = {
  "36-48": "36–48 ay",
  "48-60": "48–60 ay",
  "60-72": "60–72 ay",
};

const MATERIAL_KINDS = Object.keys(
  TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS,
) as TymmOfficialLibraryMaterialKind[];
const AREAS = Object.keys(
  TYMM_OFFICIAL_LIBRARY_AREA_LABELS,
) as TymmOfficialLibraryArea[];

const EXACT_SOURCE_EVIDENCE: Readonly<
  Partial<
    Record<
      TymmOfficialLibraryResource["id"],
      {
        readonly officialSourceDateOrVersion: string;
        readonly sha256: `sha256:${string}`;
        readonly pageCount: number;
        readonly exactEvidenceCheckedOn: string;
      }
    >
  >
> = Object.freeze({
  "preschool-program-2024": Object.freeze({
    officialSourceDateOrVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
    sha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
    pageCount: TYMM_2024_CATALOG_METADATA.sourcePageCount,
    exactEvidenceCheckedOn: "2026-09-09",
  }),
  "common-text": Object.freeze({
    officialSourceDateOrVersion: "2025 kapak sürümü",
    sha256:
      "sha256:6c294c7d1f759fa2f21089c2d26945b0884658f1c88d8a776cbd9847ad4a0c12",
    pageCount: 158,
    exactEvidenceCheckedOn: "2026-09-09",
  }),
});

function sourceCheckedOnLabel(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function resourceSizeLabel(resource: TymmOfficialLibraryResource): string | null {
  if (!resource.verifiedByteSize) return null;
  return `${(resource.verifiedByteSize / 1_048_576).toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} MB`;
}

function resourceExactByteLabel(
  resource: TymmOfficialLibraryResource,
): string {
  const compact = resourceSizeLabel(resource);
  return resource.verifiedByteSize
    ? `${resource.verifiedByteSize.toLocaleString("tr-TR")} bayt${compact ? ` (${compact})` : ""}`
    : "Doğrulanmadı";
}

function resourceAccessLabel(resource: TymmOfficialLibraryResource): string {
  const checkedOn = sourceCheckedOnLabel(resource.sourceCheckedOn);
  return resource.accessStatus === "verified-available"
    ? `Erişilebilir · ${checkedOn} denetimi`
    : `Yanıt vermedi · ${checkedOn} denetimi`;
}

function resourceAgeLabel(resource: TymmOfficialLibraryResource): string {
  if (resource.metadataOrigin.ageBands === "unverified") {
    return "yaş kapsamı doğrulanmadı";
  }
  if (resource.metadataOrigin.ageBands === "MaarifOS-editorial-applicability") {
    return "MaarifOS sınıflandırması: yaşa özel olmayan ortak kaynak";
  }
  if (resource.contentVerifiedAgeBands?.length) {
    return `PDF metninde doğrulanan: ${resource.contentVerifiedAgeBands
      .map((ageBand) => AGE_LABELS[ageBand])
      .join(", ")}`;
  }
  if (resource.publisherAgeLabel) {
    return `MEB kart etiketi: ${resource.publisherAgeLabel}`;
  }
  if (resource.ageBands.length === 1) {
    return `MEB kaynak başlığı: ${AGE_LABELS[resource.ageBands[0]]}`;
  }
  return "MEB program kapsamı: üç okul öncesi yaş bandı";
}

function ResourceOriginBadge({ resource }: { resource: TymmOfficialLibraryResource }) {
  return (
    <span className="tymm-library-origin">
      <CheckCircledIcon aria-hidden="true" /> Kaynak: MEB resmî
      <i>·</i>
      {TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS[resource.materialKind]}
    </span>
  );
}

function EmbeddedOfficialDocument({
  resource,
  headingRef,
  online,
}: {
  resource: TymmOfficialLibraryResource;
  headingRef: RefObject<HTMLHeadingElement | null>;
  online: boolean;
}) {
  const [viewerState, setViewerState] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const embeddable = canEmbedTymmOfficialLibraryResource(resource);
  const sizeLabel = resourceSizeLabel(resource);
  const exactSourceEvidence = EXACT_SOURCE_EVIDENCE[resource.id];

  useEffect(() => {
    setViewerState("loading");
  }, [resource.id]);

  return (
    <section
      className="tymm-library-viewer"
      aria-labelledby={`tymm-library-viewer-${resource.id}`}
      data-testid="tymm-official-document-viewer"
    >
      <header>
        <div>
          <ResourceOriginBadge resource={resource} />
          <h3
            id={`tymm-library-viewer-${resource.id}`}
            ref={headingRef}
            tabIndex={-1}
          >
            {resource.title}
          </h3>
          <p><strong>MaarifOS özeti:</strong> {resource.description}</p>
          <small>
            {resource.scopeLabel}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </small>
          {resource.publisherAgeLabel ? (
            <small>
              MEB kart etiketi: {resource.publisherAgeLabel}
              {resource.contentVerifiedAgeBands?.length
                ? ` · PDF metninde doğrulanan: ${resource.contentVerifiedAgeBands
                    .map((ageBand) => AGE_LABELS[ageBand])
                    .join(", ")}`
                : " · PDF metni erişilemediği için ek yaş doğrulaması yok"}
            </small>
          ) : null}
          <dl className="tymm-library-source-evidence" aria-label="Exact resmî kaynak künyesi">
            <div>
              <dt>Resmî kaynak tarihi / sürümü</dt>
              <dd>
                {exactSourceEvidence?.officialSourceDateOrVersion ??
                  "Kaynakta doğrulanmış tarih bulunmuyor"}
              </dd>
            </div>
            <div>
              <dt>Exact SHA-256</dt>
              <dd>
                <code>
                  {exactSourceEvidence?.sha256.replace("sha256:", "") ??
                    "Bu PDF için doğrulanmadı"}
                </code>
              </dd>
            </div>
            <div>
              <dt>Sayfa sayısı</dt>
              <dd>
                {exactSourceEvidence
                  ? `${exactSourceEvidence.pageCount.toLocaleString("tr-TR")} sayfa`
                  : "Doğrulanmadı"}
              </dd>
            </div>
            <div>
              <dt>Exact dosya boyutu</dt>
              <dd>{resourceExactByteLabel(resource)}</dd>
            </div>
            <div>
              <dt>Erişim durumu</dt>
              <dd>{resourceAccessLabel(resource)}</dd>
            </div>
            <div>
              <dt>Hash / sayfa kanıt tarihi</dt>
              <dd>
                {exactSourceEvidence
                  ? sourceCheckedOnLabel(exactSourceEvidence.exactEvidenceCheckedOn)
                  : "Exact içerik kanıtı yok"}
              </dd>
            </div>
            <div>
              <dt>Yerel çevrimdışı paket</dt>
              <dd>Yok · bu sürümde doğrulanmış yerel TYMM PDF varlığı bulunmuyor</dd>
            </div>
          </dl>
        </div>
        <div className="tymm-library-viewer__actions">
          {embeddable ? (
            <a
              href={resource.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              aria-label={`${resource.title} PDF’sini aç veya indir (yeni sekmede)`}
            >
              <DownloadIcon aria-hidden="true" />
              PDF’yi aç / indir
            </a>
          ) : null}
          <a
            href={resource.officialPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${resource.title} resmî MEB sayfasını aç (yeni sekmede)`}
          >
            <Link2Icon aria-hidden="true" />
            MEB sayfası
          </a>
        </div>
      </header>

      {embeddable ? (
        <div className="tymm-library-viewer__frame-wrap" data-viewer-state={viewerState}>
          {viewerState === "loading" ? (
            <span className="tymm-library-viewer__loading" role="status">
              Resmî PDF yükleniyor…
            </span>
          ) : null}
          <iframe
            key={resource.id}
            src={`${resource.pdfUrl}#view=FitH`}
            title={`${resource.title} · uygulama içi resmî PDF okuyucu`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setViewerState("loaded")}
            onError={() => setViewerState("error")}
          />
          <p>
            {!online
              ? "Çevrimdışısınız. Kaynak bilgisi görünür kalır; resmî PDF için internete bağlanın."
              : viewerState === "error"
              ? "Belge bu tarayıcıda görüntülenemedi. PDF’yi MEB’den açın veya indirin."
              : "Okuyucu boş kalırsa tarayıcı PDF gösterimini engellemiş olabilir. Üstteki açma ve indirme bağlantısı her zaman kullanılabilir."}
          </p>
        </div>
      ) : (
        <div className="tymm-library-viewer__unavailable" role="status">
          <ExclamationTriangleIcon aria-hidden="true" />
          <span>
            <strong>
              Resmî PDF bağlantısı {sourceCheckedOnLabel(resource.sourceCheckedOn)}
              {" "}denetiminde yanıt vermedi
            </strong>
            <small>
              Bu belge kullanılabilir gibi gösterilmez. MEB ayrıntı sayfasından güncel
              erişim durumunu kontrol edebilirsiniz.
            </small>
          </span>
        </div>
      )}
    </section>
  );
}

export function TymmOfficialLibraryPanel({
  ageBand,
  contextArea,
}: {
  ageBand: Tymm2024AgeBand | null;
  contextArea?: TymmOfficialLibraryArea;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState<Tymm2024AgeBand | "all">(
    ageBand ?? "all",
  );
  const [materialFilter, setMaterialFilter] = useState<
    TymmOfficialLibraryMaterialKind | "all"
  >("all");
  const [areaFilter, setAreaFilter] = useState<TymmOfficialLibraryArea | "all">(
    "all",
  );
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const viewerHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastOpenTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setAgeFilter(ageBand ?? "all");
  }, [ageBand]);

  useEffect(() => {
    const updateOnlineState = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const recommendations = useMemo(
    () => recommendTymmOfficialLibraryResources({ ageBand, area: contextArea, limit: 4 }),
    [ageBand, contextArea],
  );
  const filteredResources = useMemo(
    () =>
      listTymmOfficialLibraryResources({
        query,
        ageBand: ageFilter,
        materialKind: materialFilter,
        area: areaFilter,
      }),
    [ageFilter, areaFilter, materialFilter, query],
  );
  const selectedResource =
    filteredResources.find((resource) => resource.id === selectedResourceId) ?? null;
  const availableCount = TYMM_OFFICIAL_LIBRARY.filter(
    (resource) => resource.accessStatus === "verified-available",
  ).length;
  const unavailableCount = TYMM_OFFICIAL_LIBRARY.length - availableCount;
  const officialAgeResource = getTymmOfficialAgeResource(ageBand);

  useEffect(() => {
    if (
      selectedResourceId &&
      !filteredResources.some((resource) => resource.id === selectedResourceId)
    ) {
      setSelectedResourceId(null);
    }
  }, [filteredResources, selectedResourceId]);

  useEffect(() => {
    if (!open || !selectedResource) return;
    const animationFrame = window.requestAnimationFrame(() => {
      viewerHeadingRef.current?.focus({ preventScroll: true });
      viewerHeadingRef.current?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [open, selectedResource]);

  return (
    <>
      <section
        className="tymm-library-panel"
        aria-label="Resmî TYMM kaynakları"
        data-testid="tymm-official-library-panel"
      >
        <button
          type="button"
          className="tymm-library-panel__open"
          onClick={(event) => {
            lastOpenTriggerRef.current = event.currentTarget;
            setOpen(true);
          }}
          data-testid="tymm-official-library-open"
          data-tymm-official-library-trigger
        >
          <ReaderIcon aria-hidden="true" />
          <span>
            <strong>Resmî TYMM kaynakları</strong>
            <small>
              {TYMM_OFFICIAL_LIBRARY.length} PDF · {availableCount} erişilebilir
              {unavailableCount === 3
                ? " · erişilemeyen üç resmî PDF bağlantısı"
                : ` · erişilemeyen ${unavailableCount.toLocaleString("tr-TR")} resmî PDF bağlantısı`}
            </small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>

      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSelectedResourceId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="tymm-library-dialog__overlay" />
          <Dialog.Content
            className="tymm-library-dialog"
            aria-describedby="tymm-library-dialog-description"
            data-testid="tymm-official-library-dialog"
            onCloseAutoFocus={(event) => {
              const canReceiveReturnFocus = (element: HTMLElement | null) =>
                Boolean(
                  element?.isConnected &&
                    !element.matches(":disabled, [aria-disabled='true']") &&
                    element.closest("[inert], [aria-hidden='true']") === null &&
                    element.getClientRects().length > 0,
                );
              const originalTrigger = lastOpenTriggerRef.current;
              const remountedTrigger = document.querySelector<HTMLElement>(
                "[data-tymm-official-library-trigger]",
              );
              const routeHeading = document.querySelector<HTMLElement>(
                "[data-route-heading]",
              );
              const returnFocusTarget = canReceiveReturnFocus(originalTrigger)
                ? originalTrigger
                : canReceiveReturnFocus(remountedTrigger)
                  ? remountedTrigger
                  : canReceiveReturnFocus(routeHeading)
                    ? routeHeading
                    : null;
              if (!returnFocusTarget) return;
              event.preventDefault();
              returnFocusTarget.focus({ preventScroll: true });
            }}
          >
            <header className="tymm-library-dialog__header">
              <div>
                <span><CheckCircledIcon aria-hidden="true" /> T.C. Millî Eğitim Bakanlığı</span>
                <Dialog.Title>Resmî TYMM okul öncesi kütüphanesi</Dialog.Title>
                <Dialog.Description id="tymm-library-dialog-description">
                  Resmî PDF’ler MEB adresinden bu okuyucuya yüklenir; içerik
                  kopyalanmaz, plana otomatik aktarılmaz ve değiştirilmez.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Resmî kaynak kütüphanesini kapat">
                <Cross2Icon aria-hidden="true" />
              </Dialog.Close>
            </header>

            <div className="tymm-library-filters" aria-label="Resmî kaynak filtreleri">
              <label className="tymm-library-search">
                <span>Kaynak ara</span>
                <i>
                  <MagnifyingGlassIcon aria-hidden="true" />
                  <KeyboardInput
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Örn. matematik, broşür, veli"
                  />
                </i>
              </label>
              <label>
                <span>Yaş</span>
                <select
                  value={ageFilter}
                  onChange={(event) =>
                    setAgeFilter(event.target.value as Tymm2024AgeBand | "all")
                  }
                >
                  <option value="all">Tüm yaşlar</option>
                  {Object.entries(AGE_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>{label} + ortak</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tür</span>
                <select
                  value={materialFilter}
                  onChange={(event) =>
                    setMaterialFilter(
                      event.target.value as TymmOfficialLibraryMaterialKind | "all",
                    )
                  }
                >
                  <option value="all">Tüm türler</option>
                  {MATERIAL_KINDS.map((kind) => (
                    <option value={kind} key={kind}>
                      {TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Alan</span>
                <select
                  value={areaFilter}
                  onChange={(event) =>
                    setAreaFilter(event.target.value as TymmOfficialLibraryArea | "all")
                  }
                >
                  <option value="all">Tüm alanlar</option>
                  {AREAS.map((area) => (
                    <option value={area} key={area}>
                      {TYMM_OFFICIAL_LIBRARY_AREA_LABELS[area]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p
              className="tymm-library-connectivity"
              role="status"
              aria-live="polite"
              data-online={online}
            >
              {online
                ? "Kaynak künyeleri çevrimdışı kalır; resmî PDF ve MEB sayfalarını açmak için internet gerekir."
                : "Çevrimdışısınız: kaynak künyeleri kullanılabilir, resmî PDF ve MEB sayfaları bağlantı kurulunca açılır."}
            </p>

            <details
              className="tymm-library-review-disclosure"
              aria-label="Pedagojik eşleme inceleme durumu"
              data-review-status="pending-human-review"
              data-publication-state={TYMM_PENDING_MAPPING_PUBLICATION_STATE}
            >
              <summary>Kaynak ve eşleme bilgisi</summary>
              <span>
                <strong>Kaynak künyesi ve öğretmenin eşleme seçimi ayrı kaydedilir.</strong>
                <small>
                  {TYMM_PENDING_MAPPING_DISCLOSURE} Resmî kaynak künyesi bu
                  pedagojik onayın yerine geçmez.
                </small>
              </span>
            </details>

            <div className="tymm-library-dialog__body">
              <aside className="tymm-library-results" aria-label="Resmî belge sonuçları">
                <details className="tymm-library-featured" data-testid="tymm-library-featured">
                  <summary>
                    <span>
                      <strong>Bu plan için öne çıkan kaynaklar</strong>
                      <small>
                        {recommendations.slice(0, 3).length} kaynak
                        {officialAgeResource ? ` · ${officialAgeResource.ageLabel} plan örnekleri` : ""}
                      </small>
                    </span>
                    <ChevronRightIcon aria-hidden="true" />
                  </summary>
                  <div className="tymm-library-featured__content">
                    <div className="tymm-library-recommendations" aria-label="Plan için resmî kaynak önerileri">
                      {recommendations.slice(0, 3).map((resource) => (
                        <button
                          type="button"
                          key={resource.id}
                          onClick={() => {
                            setQuery("");
                            setAgeFilter(ageBand ?? "all");
                            setMaterialFilter("all");
                            setAreaFilter("all");
                            setSelectedResourceId(resource.id);
                          }}
                          aria-label={`${resource.title} belgesini uygulama içinde aç`}
                        >
                          <FileTextIcon aria-hidden="true" />
                          <span>
                            <small>{TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS[resource.materialKind]}</small>
                            <strong>{resource.title}</strong>
                          </span>
                          <ChevronRightIcon aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    {officialAgeResource ? (
                      <details className="tymm-library-plan-examples">
                        <summary>
                          <span>
                            <strong>MEB’de yayımlanmış plan örnekleri</strong>
                            <small>{officialAgeResource.ageLabel} · yaş sayfası ve 4 bağlantı</small>
                          </span>
                          <ChevronRightIcon aria-hidden="true" />
                        </summary>
                        <p>
                          Bu bağlantılar yalnız resmî örneği açar; cihazda veri
                          yazmaz ve planınıza otomatik aktarılmaz.
                        </p>
                        <a
                          href={officialAgeResource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${officialAgeResource.title} (yeni sekmede)`}
                        >
                          <span>
                            <strong>{officialAgeResource.title}</strong>
                            <small>Seçili yaşın resmî MEB sayfası</small>
                          </span>
                          <ChevronRightIcon aria-hidden="true" />
                        </a>
                        {officialAgeResource.examples.map((example) => (
                          <a
                            key={example.id}
                            href={example.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${example.title} (yeni sekmede)`}
                          >
                            <span>
                              <strong>{example.title}</strong>
                              <small>MEB’de yayımlanmış plan örneği</small>
                            </span>
                            <ChevronRightIcon aria-hidden="true" />
                          </a>
                        ))}
                      </details>
                    ) : null}
                  </div>
                </details>
                <p role="status" aria-live="polite">
                  <strong>{filteredResources.length}</strong> kaynak gösteriliyor
                </p>
                {filteredResources.length > 0 ? (
                  <ul>
                    {filteredResources.map((resource) => (
                      <li key={resource.id}>
                        <button
                          type="button"
                          aria-pressed={selectedResource?.id === resource.id}
                          onClick={() => setSelectedResourceId(resource.id)}
                        >
                          <FileTextIcon aria-hidden="true" />
                          <span>
                            <small>
                              {TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS[resource.materialKind]}
                              {` · ${resourceAgeLabel(resource)}`}
                            </small>
                            <strong>{resource.title}</strong>
                            {resource.accessStatus === "official-pdf-unavailable" ? (
                              <em>
                                PDF bağlantısı {sourceCheckedOnLabel(resource.sourceCheckedOn)}
                                {" "}denetiminde yanıt vermedi
                              </em>
                            ) : null}
                          </span>
                          <ChevronRightIcon aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="tymm-library-results__empty">
                    <MagnifyingGlassIcon aria-hidden="true" />
                    <strong>Bu filtrelerle kaynak bulunamadı</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setAgeFilter(ageBand ?? "all");
                        setMaterialFilter("all");
                        setAreaFilter("all");
                      }}
                    >
                      Filtreleri temizle
                    </button>
                  </div>
                )}

                <details className="tymm-library-framework-pages">
                  <summary>
                    Ortak TYMM çerçevesi · {TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES.length} resmî sayfa
                  </summary>
                  <p>
                    Bu sayfalar okul öncesine özel değildir. MaarifOS bunları ortak
                    TYMM bileşenleri olarak ayrı listeler; yaşa özel kaynak saymaz.
                  </p>
                  <ul>
                    {TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES.map((page) => (
                      <li key={page.id}>
                        <a
                          href={page.officialRecord.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${page.officialRecord.title} resmî sayfasını aç (yeni sekmede)`}
                        >
                          <span>
                            <strong>{page.officialRecord.title}</strong>
                            <small>{page.presentation.summary}</small>
                          </span>
                          <Link2Icon aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <small>
                    Sayfa başlıkları MEB; kısa açıklamalar ve okul öncesi bağlantısı
                    MaarifOS sınıflandırmasıdır.
                  </small>
                </details>

                <details className="tymm-library-framework-pages tymm-library-video-pages">
                  <summary>
                    Okul öncesi videoları · {TYMM_OFFICIAL_PRESCHOOL_VIDEOS.length} resmî sayfa
                  </summary>
                  <p>
                    Tanıtım, öğretmen eğitimi, kitap tanıtımı ve 12 sınıf içi örnek
                    uygulama videosu MEB sayfasında açılır.
                  </p>
                  <ul>
                    {TYMM_OFFICIAL_PRESCHOOL_VIDEOS.map((video) => (
                      <li key={video.id}>
                        <a
                          href={video.officialRecord.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${video.officialRecord.title} resmî videosunu aç (yeni sekmede)`}
                        >
                          <span>
                            <strong>{video.officialRecord.title}</strong>
                            <small>
                              {video.presentationAgeLabel} · MaarifOS sunum etiketi · MEB
                              resmî video sayfası
                            </small>
                          </span>
                          <Link2Icon aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>

                <details className="tymm-library-framework-pages tymm-library-video-pages">
                  <summary>
                    Ortak öğretmen eğitim videoları · {TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS.length} resmî sayfa
                  </summary>
                  <p>
                    TYMM genelindeki bu eğitimleri MaarifOS ortak öğretmen kaynağı
                    olarak sınıflandırır; yaşa özel içerik olarak sunmaz.
                  </p>
                  <ul>
                    {TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS.map((video) => (
                      <li key={video.id}>
                        <a
                          href={video.officialRecord.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${video.officialRecord.title} resmî eğitim videosunu aç (yeni sekmede)`}
                        >
                          <span>
                            <strong>{video.officialRecord.title}</strong>
                            <small>{video.presentationAgeLabel} · MEB kaydı {video.officialRecord.url.split("/").at(-1)}</small>
                          </span>
                          <Link2Icon aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </aside>

              <div className="tymm-library-document-stage">
                {selectedResource ? (
                  <EmbeddedOfficialDocument
                    resource={selectedResource}
                    headingRef={viewerHeadingRef}
                    online={online}
                  />
                ) : (
                  <div className="tymm-library-document-stage__empty">
                    <ReaderIcon aria-hidden="true" />
                    <h3>Okuyucuda açmak için bir belge seçin</h3>
                    <p>
                      Yalnız erişimi doğrulanmış resmî PDF’ler gömülür. Üç geçici
                      MEB bağlantı hatası açıkça işaretlenir.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
