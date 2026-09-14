import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  type Tymm2024AgeBand,
} from "./tymm-2024-catalog.ts";

export const TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON = "2026-09-01" as const;

export const TYMM_OFFICIAL_PRESCHOOL_LANDING_URL =
  "https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi" as const;

/**
 * Current, verified access URL. The historical source identity URL remains in
 * catalogBinding so persisted curriculum snapshots do not change when MEB
 * relocates an otherwise byte-identical file.
 */
export const TYMM_OFFICIAL_PROGRAM_PDF_URL =
  "https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf" as const;

export type TymmOfficialResourceMaterialKind =
  | "official-reference"
  | "official-example";

export type TymmOfficialExampleKind =
  | "monthly-plan-example"
  | "daily-plan-example";

export interface TymmOfficialResourceLink {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly materialKind: TymmOfficialResourceMaterialKind;
  readonly accessMode: "external-link";
  readonly contentOrigin: "MEB-official";
  readonly republishMode: "link-only";
  readonly importable: false;
}

export interface TymmOfficialExampleResource
  extends TymmOfficialResourceLink {
  readonly materialKind: "official-example";
  readonly ageBand: Tymm2024AgeBand;
  readonly exampleKind: TymmOfficialExampleKind;
  readonly unitId: number;
}

export interface TymmOfficialAgeResource extends TymmOfficialResourceLink {
  readonly materialKind: "official-reference";
  readonly ageBand: Tymm2024AgeBand;
  readonly ageLabel: string;
  readonly pageId: number;
  readonly examples: readonly [
    TymmOfficialExampleResource,
    TymmOfficialExampleResource,
    TymmOfficialExampleResource,
    TymmOfficialExampleResource,
  ];
}

export interface TymmOfficialProgramPdfResource
  extends TymmOfficialResourceLink {
  readonly materialKind: "official-reference";
  readonly sourceFileName: string;
  readonly catalogBinding: {
    readonly catalogId: string;
    readonly catalogVersion: string;
    readonly sourceVersion: string;
    readonly sourceIdentityUrl: string;
    readonly sourceSha256: `sha256:${string}`;
  };
}

export interface TymmOfficialResourceUsePolicy {
  readonly contentHandling: "link-and-metadata-only";
  readonly officialContentCopied: false;
  readonly automaticInstallation: false;
  readonly completePlanPackage: false;
  readonly notice: string;
}

export interface TymmOfficialResourceCatalog {
  readonly schemaVersion: 1;
  readonly catalogId: "meb-tymm-okul-oncesi-official-resources";
  readonly authority: "T.C. Millî Eğitim Bakanlığı";
  readonly sourceCheckedOn: typeof TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON;
  readonly landingPage: TymmOfficialResourceLink & {
    readonly materialKind: "official-reference";
  };
  readonly programPdf: TymmOfficialProgramPdfResource;
  readonly agePages: readonly [
    TymmOfficialAgeResource,
    TymmOfficialAgeResource,
    TymmOfficialAgeResource,
  ];
  readonly usePolicy: TymmOfficialResourceUsePolicy;
}

function officialExample(
  ageBand: Tymm2024AgeBand,
  unitId: number,
  title: string,
  exampleKind: TymmOfficialExampleKind,
): TymmOfficialExampleResource {
  return {
    id: `tymm-okul-oncesi-${ageBand}-unite-${unitId}`,
    title,
    url: `https://tymm.meb.gov.tr/okul-oncesi/unite/${unitId}`,
    materialKind: "official-example",
    accessMode: "external-link",
    contentOrigin: "MEB-official",
    republishMode: "link-only",
    importable: false,
    ageBand,
    exampleKind,
    unitId,
  };
}

const RAW_TYMM_OFFICIAL_RESOURCE_CATALOG: TymmOfficialResourceCatalog = {
  schemaVersion: 1,
  catalogId: "meb-tymm-okul-oncesi-official-resources",
  authority: "T.C. Millî Eğitim Bakanlığı",
  sourceCheckedOn: TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
  landingPage: {
    id: "tymm-okul-oncesi-landing",
    title: "Okul Öncesi Öğretim Programı",
    url: TYMM_OFFICIAL_PRESCHOOL_LANDING_URL,
    materialKind: "official-reference",
    accessMode: "external-link",
    contentOrigin: "MEB-official",
    republishMode: "link-only",
    importable: false,
  },
  programPdf: {
    id: "tymm-okul-oncesi-program-pdf",
    title: TYMM_2024_CATALOG_METADATA.sourceDocumentTitle,
    url: TYMM_OFFICIAL_PROGRAM_PDF_URL,
    materialKind: "official-reference",
    accessMode: "external-link",
    contentOrigin: "MEB-official",
    republishMode: "link-only",
    importable: false,
    sourceFileName: TYMM_2024_CATALOG_METADATA.sourceFileName,
    catalogBinding: {
      catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
      catalogVersion: TYMM_2024_CATALOG_METADATA.catalogVersion,
      sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
      sourceIdentityUrl: TYMM_2024_CATALOG_METADATA.sourceUrl,
      sourceSha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
    },
  },
  agePages: [
    {
      id: "tymm-okul-oncesi-age-36-48",
      title: "Okul Öncesi 36-48 Ay",
      url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/1",
      materialKind: "official-reference",
      accessMode: "external-link",
      contentOrigin: "MEB-official",
      republishMode: "link-only",
      importable: false,
      ageBand: "36-48",
      ageLabel: "36–48 ay",
      pageId: 1,
      examples: [
        officialExample(
          "36-48",
          443,
          "36-48 Ay Aralık Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "36-48",
          442,
          "36-48 Ay Eylül Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "36-48",
          482,
          "36-48 Ay Günlük Plan Örneği",
          "daily-plan-example",
        ),
        officialExample(
          "36-48",
          444,
          "36-48 Ay Mayıs Ayı Planı",
          "monthly-plan-example",
        ),
      ],
    },
    {
      id: "tymm-okul-oncesi-age-48-60",
      title: "Okul Öncesi 48-60 Ay",
      url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/15",
      materialKind: "official-reference",
      accessMode: "external-link",
      contentOrigin: "MEB-official",
      republishMode: "link-only",
      importable: false,
      ageBand: "48-60",
      ageLabel: "48–60 ay",
      pageId: 15,
      examples: [
        officialExample(
          "48-60",
          446,
          "48-60 Ay Aralık Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "48-60",
          445,
          "48-60 Ay Eylül Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "48-60",
          483,
          "48-60 Ay Günlük Plan Örneği",
          "daily-plan-example",
        ),
        officialExample(
          "48-60",
          453,
          "48-60 Ay Mayıs Ayı Planı",
          "monthly-plan-example",
        ),
      ],
    },
    {
      id: "tymm-okul-oncesi-age-60-72",
      title: "Okul Öncesi 60-72 Ay",
      url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/16",
      materialKind: "official-reference",
      accessMode: "external-link",
      contentOrigin: "MEB-official",
      republishMode: "link-only",
      importable: false,
      ageBand: "60-72",
      ageLabel: "60–72 ay",
      pageId: 16,
      examples: [
        officialExample(
          "60-72",
          480,
          "60-72 Ay Aralık Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "60-72",
          479,
          "60-72 Ay Eylül Ayı Planı",
          "monthly-plan-example",
        ),
        officialExample(
          "60-72",
          484,
          "60-72 Ay Günlük Plan Örneği",
          "daily-plan-example",
        ),
        officialExample(
          "60-72",
          481,
          "60-72 Ay Mayıs Ayı Planı",
          "monthly-plan-example",
        ),
      ],
    },
  ],
  usePolicy: {
    contentHandling: "link-and-metadata-only",
    officialContentCopied: false,
    automaticInstallation: false,
    completePlanPackage: false,
    notice:
      "Bu katalog resmî TYMM sayfalarına kaynak bağlantısı ile başlık/meta bilgisi sağlar; resmî içeriği kopyalamaz ve kaynakları otomatik kurulabilir tam plan paketi olarak sunmaz.",
  },
};

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}

function assertOfficialTymmUrl(url: string): void {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "tymm.meb.gov.tr" ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error(`Geçersiz TYMM resmî kaynak URL'si: ${url}`);
  }
}

function validateCatalog(catalog: TymmOfficialResourceCatalog): void {
  if (catalog.agePages.length !== 3) {
    throw new Error("TYMM resmî kaynak kataloğu tam olarak üç yaş sayfası içermeli.");
  }

  const actualAgeBands = catalog.agePages.map((page) => page.ageBand);
  if (
    actualAgeBands.some(
      (ageBand, index) => ageBand !== TYMM_2024_AGE_BANDS[index],
    )
  ) {
    throw new Error("TYMM resmî kaynak yaş bantları kanonik sırayla eşleşmiyor.");
  }

  if (
    catalog.programPdf.catalogBinding.sourceIdentityUrl !==
      TYMM_2024_CATALOG_METADATA.sourceUrl ||
    catalog.programPdf.catalogBinding.sourceSha256 !==
      TYMM_2024_CATALOG_METADATA.sourceSha256
  ) {
    throw new Error("Program PDF erişimi TYMM 2024 kaynak kimliğinden ayrıştı.");
  }

  const resources: TymmOfficialResourceLink[] = [
    catalog.landingPage,
    catalog.programPdf,
    ...catalog.agePages,
    ...catalog.agePages.flatMap((page) => page.examples),
  ];
  const ids = new Set(resources.map((resource) => resource.id));
  const urls = new Set(resources.map((resource) => resource.url));

  if (ids.size !== resources.length || urls.size !== resources.length) {
    throw new Error("TYMM resmî kaynak kimlikleri ve URL'leri benzersiz olmalı.");
  }

  for (const resource of resources) {
    assertOfficialTymmUrl(resource.url);
  }

  if (
    catalog.agePages.some((page) => page.examples.length !== 4) ||
    catalog.agePages.flatMap((page) => page.examples).length !== 12
  ) {
    throw new Error("Her TYMM yaş sayfası dört, katalog toplam on iki örnek taşımalı.");
  }
}

validateCatalog(RAW_TYMM_OFFICIAL_RESOURCE_CATALOG);

export const TYMM_OFFICIAL_RESOURCE_CATALOG = deepFreeze(
  RAW_TYMM_OFFICIAL_RESOURCE_CATALOG,
);

export function isTymmOfficialResourceAgeBand(
  value: unknown,
): value is Tymm2024AgeBand {
  return (
    typeof value === "string" &&
    (TYMM_2024_AGE_BANDS as readonly string[]).includes(value)
  );
}

/**
 * Serbest metni veya örtüşen sınır yaşlarını tahmin etmez. Yalnız üç kanonik
 * yaş bandından biri için resmî sayfa metadata'sını döndürür.
 */
export function getTymmOfficialAgeResource(
  ageBand: unknown,
): TymmOfficialAgeResource | null {
  if (!isTymmOfficialResourceAgeBand(ageBand)) {
    return null;
  }

  return (
    TYMM_OFFICIAL_RESOURCE_CATALOG.agePages.find(
      (page) => page.ageBand === ageBand,
    ) ?? null
  );
}

export function listTymmOfficialAgeResources(): readonly TymmOfficialAgeResource[] {
  return TYMM_OFFICIAL_RESOURCE_CATALOG.agePages;
}

/**
 * Persisted curriculum records retain the historical source identity URL.
 * When that exact, digest-bound PDF is requested, this returns the separately
 * verified current access URL without rewriting the stored evidence identity.
 */
export function resolveTymmOfficialProgramAccessUrl(
  sourceUrl: string,
  sourceSha256: string | undefined,
  sourcePage?: number,
): string | null {
  const isKnownProgramPdf =
    sourceSha256 === TYMM_2024_CATALOG_METADATA.sourceSha256 &&
    (sourceUrl === TYMM_2024_CATALOG_METADATA.sourceUrl ||
      sourceUrl === TYMM_OFFICIAL_PROGRAM_PDF_URL);

  if (!isKnownProgramPdf) {
    return null;
  }

  if (
    sourcePage !== undefined &&
    (!Number.isSafeInteger(sourcePage) ||
      sourcePage < 1 ||
      sourcePage > TYMM_2024_CATALOG_METADATA.sourcePageCount)
  ) {
    return null;
  }

  const pageFragment = sourcePage === undefined ? "" : `#page=${sourcePage}`;
  return `${TYMM_OFFICIAL_PROGRAM_PDF_URL}${pageFragment}`;
}
