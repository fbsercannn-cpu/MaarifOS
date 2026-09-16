import { createHash, randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as officialLibraryModule from "../src/features/curriculum/tymm-official-library.ts";
import { TYMM_OFFICIAL_RESOURCE_CATALOG } from "../src/features/curriculum/tymm-official-resource-catalog.ts";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const DEFAULT_OUTPUT = resolve(
  APP_ROOT,
  "output/live-audit-2026-09-01/tymm-official-library-receipt.json",
);
const AUTHORITY_HOST = "tymm.meb.gov.tr";
const AUTHORITY_NAME = "T.C. Millî Eğitim Bakanlığı";
const AUTHORITY_BASE_URL = `https://${AUTHORITY_HOST}/`;
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
const EXPECTED_UNAVAILABLE_PDF_COUNT = 3;
const EXPECTED_UNAVAILABLE_HTTP_STATUS = 500;

const DEFAULT_OPTIONS = Object.freeze({
  timeoutMs: 20_000,
  concurrency: 6,
  retries: 2,
});
const WINDOWS_ATOMIC_REPLACE_DELAYS_MS = Object.freeze([10, 20, 40, 80, 120, 160, 200]);

const PRESCHOOL_COURSE_ID = 26;
const AGE_DISCOVERY = Object.freeze([
  Object.freeze({
    ageBand: "36-48",
    classId: 1,
    planIds: Object.freeze([443, 442, 482, 444]),
    bookIds: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  }),
  Object.freeze({
    ageBand: "48-60",
    classId: 15,
    planIds: Object.freeze([446, 445, 483, 453]),
    bookIds: Object.freeze([11, 12, 13]),
  }),
  Object.freeze({
    ageBand: "60-72",
    classId: 16,
    planIds: Object.freeze([480, 479, 484, 481]),
    bookIds: Object.freeze([14, 15, 16, 17]),
  }),
]);
const EXPECTED_PRESCHOOL_BOOK_IDS = Object.freeze(
  Array.from({ length: 17 }, (_, index) => index + 1),
);
const EXPECTED_DIRECT_PRESCHOOL_VIDEO_IDS = Object.freeze([
  134,
  153,
  208,
  ...Array.from({ length: 12 }, (_, index) => 280 + index),
]);
const EXPECTED_COMMON_TRAINING_VIDEO_IDS = Object.freeze([
  197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207,
]);
const EXPECTED_PROGRAM_LITERACY_DOCUMENT_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
const EXPECTED_PARENT_GUIDE_DOCUMENT_IDS = Object.freeze([8]);
const EXPECTED_BROCHURE_DOCUMENT_IDS = Object.freeze([16, 17, 18, 19, 20, 21]);
const EXPECTED_REPORT_DOCUMENT_IDS = Object.freeze([25, 38, 39, 41, 42]);
const COMMON_FRAMEWORK_MENU_EXACT_PATHS = Object.freeze([
  "/icerik-cercevesi",
  "/alan-becerileri",
  "/ortak-metin",
  "/temel-yaklasim",
  "/ogrenci-profili",
  "/genel-bakis",
  "/program-disi-etkinlikler",
  "/okul-temelli-planlama",
  "/surec",
]);
const DECLARED_CATALOG_ONLY_DIRECT_OFFICIAL_PATHS = Object.freeze([
  "/ogrenme-ciktilari-cercevesi",
  "/programlar-arasi-bilesenler",
  "/ogrenme-ogretme-yasantilari",
  "/olcme-degerlendirme",
  "/farklilastirilmis-egitim",
  "/ogretmen-yansitmalari",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonSha256(value) {
  return `sha256:${sha256(JSON.stringify(value))}`;
}

export function canonicalizeMebUrl(value) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLocaleLowerCase("en-US") !== AUTHORITY_HOST ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error(`URL resmî TYMM HTTPS yetki alanında değil: ${value}`);
  }

  parsed.hostname = AUTHORITY_HOST;
  parsed.hash = "";
  parsed.searchParams.sort();
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/u, "");
  return parsed.toString();
}

function cleanReference(reference) {
  const expectedByteSize = reference.expectedByteSize ?? null;
  return Object.freeze({
    referenceId: String(reference.referenceId),
    collection: String(reference.collection),
    sourceId: String(reference.sourceId),
    title: String(reference.title),
    role: reference.role,
    url: canonicalizeMebUrl(reference.url),
    expectedKind: reference.expectedKind,
    expectedAvailability: reference.expectedAvailability,
    expectedByteSize,
    materialKind: reference.materialKind ?? null,
    scope: reference.scope ?? null,
    ageBand: reference.ageBand ?? null,
    videoKind: reference.videoKind ?? null,
  });
}

function videoReferences(videos, collection) {
  return videos.map((video) =>
    cleanReference({
      referenceId: `${collection}:${video.id}:page`,
      collection,
      sourceId: video.id,
      title: video.officialRecord.title,
      role: "canonical-page",
      url: video.officialRecord.url,
      expectedKind: "html",
      expectedAvailability: "available",
      materialKind: "video",
      scope: video.scope,
      videoKind: video.videoKind,
    }),
  );
}

export function flattenOfficialSources({
  libraryResources = [],
  commonFrameworkPages = [],
  preschoolVideos = [],
  generalEducationVideos = [],
  resourceCatalog,
}) {
  const references = [];

  for (const resource of libraryResources) {
    references.push(
      cleanReference({
        referenceId: `pdf-library:${resource.id}:page`,
        collection: "pdf-library",
        sourceId: resource.id,
        title: resource.title,
        role: "canonical-page",
        url: resource.officialPageUrl,
        expectedKind: "html",
        expectedAvailability: "available",
        materialKind: resource.materialKind,
        scope: resource.scope,
      }),
      cleanReference({
        referenceId: `pdf-library:${resource.id}:content`,
        collection: "pdf-library",
        sourceId: resource.id,
        title: resource.title,
        role: "canonical-content",
        url: resource.pdfUrl,
        expectedKind: "pdf",
        expectedAvailability:
          resource.accessStatus === "official-pdf-unavailable"
            ? "expected-unavailable"
            : "available",
        expectedByteSize: resource.verifiedByteSize,
        materialKind: resource.materialKind,
        scope: resource.scope,
      }),
    );
  }

  for (const page of commonFrameworkPages) {
    references.push(
      cleanReference({
        referenceId: `common-framework:${page.id}:page`,
        collection: "common-framework",
        sourceId: page.id,
        title: page.officialRecord.title,
        role: "canonical-page",
        url: page.officialRecord.url,
        expectedKind: "html",
        expectedAvailability: "available",
        materialKind: "framework-page",
        scope: page.scope,
      }),
    );
  }

  references.push(
    ...videoReferences(preschoolVideos, "preschool-video"),
    ...videoReferences(generalEducationVideos, "general-education-video"),
  );

  if (resourceCatalog) {
    references.push(
      cleanReference({
        referenceId: `preschool-catalog:${resourceCatalog.landingPage.id}:page`,
        collection: "preschool-catalog",
        sourceId: resourceCatalog.landingPage.id,
        title: resourceCatalog.landingPage.title,
        role: "canonical-page",
        url: resourceCatalog.landingPage.url,
        expectedKind: "html",
        expectedAvailability: "available",
        materialKind: resourceCatalog.landingPage.materialKind,
        scope: "preschool-direct",
      }),
      cleanReference({
        referenceId: `preschool-catalog:${resourceCatalog.programPdf.id}:content`,
        collection: "preschool-catalog",
        sourceId: resourceCatalog.programPdf.id,
        title: resourceCatalog.programPdf.title,
        role: "canonical-content",
        url: resourceCatalog.programPdf.url,
        expectedKind: "pdf",
        expectedAvailability: "available",
        materialKind: resourceCatalog.programPdf.materialKind,
        scope: "preschool-direct",
      }),
    );

    for (const agePage of resourceCatalog.agePages ?? []) {
      references.push(
        cleanReference({
          referenceId: `preschool-catalog:${agePage.id}:page`,
          collection: "preschool-age-page",
          sourceId: agePage.id,
          title: agePage.title,
          role: "canonical-page",
          url: agePage.url,
          expectedKind: "html",
          expectedAvailability: "available",
          materialKind: agePage.materialKind,
          scope: "preschool-direct",
          ageBand: agePage.ageBand,
        }),
      );
      for (const example of agePage.examples ?? []) {
        references.push(
          cleanReference({
            referenceId: `preschool-catalog:${example.id}:page`,
            collection: "preschool-plan-example",
            sourceId: example.id,
            title: example.title,
            role: "canonical-page",
            url: example.url,
            expectedKind: "html",
            expectedAvailability: "available",
            materialKind: example.exampleKind,
            scope: "preschool-direct",
            ageBand: example.ageBand,
          }),
        );
      }
    }
  }

  return Object.freeze(references);
}

export function dedupeOfficialSourceReferences(references) {
  const endpointsByUrl = new Map();

  for (const reference of references) {
    const canonicalUrl = canonicalizeMebUrl(reference.url);
    const existing = endpointsByUrl.get(canonicalUrl);
    if (!existing) {
      endpointsByUrl.set(canonicalUrl, {
        canonicalUrl,
        expectedKind: reference.expectedKind,
        expectedAvailability: reference.expectedAvailability,
        expectedByteSize: reference.expectedByteSize ?? null,
        references: [reference],
      });
      continue;
    }

    if (existing.expectedKind !== reference.expectedKind) {
      throw new Error(`URL içerik türü beklentileri çelişiyor: ${canonicalUrl}`);
    }
    if (existing.expectedAvailability !== reference.expectedAvailability) {
      throw new Error(`URL erişilebilirlik beklentileri çelişiyor: ${canonicalUrl}`);
    }
    if (
      existing.expectedByteSize !== null &&
      reference.expectedByteSize !== null &&
      reference.expectedByteSize !== undefined &&
      existing.expectedByteSize !== reference.expectedByteSize
    ) {
      throw new Error(`URL boyut beklentileri çelişiyor: ${canonicalUrl}`);
    }
    if (
      existing.expectedByteSize === null &&
      reference.expectedByteSize !== null &&
      reference.expectedByteSize !== undefined
    ) {
      existing.expectedByteSize = reference.expectedByteSize;
    }
    existing.references.push(reference);
  }

  return Object.freeze(
    [...endpointsByUrl.values()]
      .sort((left, right) => left.canonicalUrl.localeCompare(right.canonicalUrl, "en"))
      .map((endpoint) =>
        Object.freeze({
          ...endpoint,
          references: Object.freeze(
            endpoint.references
              .slice()
              .sort((left, right) => left.referenceId.localeCompare(right.referenceId, "en")),
          ),
        }),
      ),
  );
}

function distinctResources(resources) {
  return [...new Map(resources.map((resource) => [resource.id, resource])).values()];
}

export function countOfficialCollections({
  libraryResources = [],
  commonFrameworkPages = [],
  preschoolVideos = [],
  generalEducationVideos = [],
  resourceCatalog,
  sourceReferenceCount = 0,
  uniqueCanonicalUrlCount = 0,
}) {
  const uniquePreschoolVideos = distinctResources(preschoolVideos);
  const uniqueGeneralVideos = distinctResources(generalEducationVideos);
  const agePages = resourceCatalog?.agePages ?? [];
  const teacherGuidePdfCount = libraryResources.filter(
    (resource) => resource.materialKind === "teacher-guide",
  ).length;
  const activityBookPdfCount = libraryResources.filter(
    (resource) => resource.materialKind === "activity-book",
  ).length;
  const directPreschoolVideoCount = uniquePreschoolVideos.filter(
    (video) => video.scope === "preschool-direct",
  ).length;
  const directPreschoolTrainingVideoCount = uniquePreschoolVideos.filter(
    (video) => video.scope === "preschool-direct" && video.videoKind === "training",
  ).length;
  const commonFrameworkPageCount = distinctResources(commonFrameworkPages).length;
  const commonFrameworkTrainingVideoCount = uniqueGeneralVideos.filter(
    (video) => video.scope === "shared-tymm-framework" && video.videoKind === "training",
  ).length;
  const derivedCount = (formula, components) => {
    const values = Object.values(components);
    const value = values.reduce((total, component) => total + component, 0);
    return Object.freeze({
      value,
      formula,
      arithmetic: `${values.join(" + ")} = ${value}`,
      components: Object.freeze(components),
    });
  };
  const derivedCounts = Object.freeze({
    teacherBooksAndGuides: derivedCount(
      "teacherGuidePdfCount + activityBookPdfCount",
      { teacherGuidePdfCount, activityBookPdfCount },
    ),
    pagesAndVideos: derivedCount(
      "commonFrameworkPages + directPreschoolVideos + commonFrameworkTrainingVideos",
      {
        commonFrameworkPages: commonFrameworkPageCount,
        directPreschoolVideos: directPreschoolVideoCount,
        commonFrameworkTrainingVideos: commonFrameworkTrainingVideoCount,
      },
    ),
    trainingVideosTotal: derivedCount(
      "directPreschoolTrainingVideos + commonFrameworkTrainingVideos",
      {
        directPreschoolTrainingVideos: directPreschoolTrainingVideoCount,
        commonFrameworkTrainingVideos: commonFrameworkTrainingVideoCount,
      },
    ),
  });
  return Object.freeze({
    sourceReferences: sourceReferenceCount,
    uniqueCanonicalUrls: uniqueCanonicalUrlCount,
    pdf: Object.freeze({
      total: libraryResources.length,
      available: libraryResources.filter(
        (resource) => resource.accessStatus === "verified-available",
      ).length,
      unavailable: libraryResources.filter(
        (resource) => resource.accessStatus === "official-pdf-unavailable",
      ).length,
    }),
    directPreschoolVideos: directPreschoolVideoCount,
    commonFrameworkPages: commonFrameworkPageCount,
    commonFrameworkTrainingVideos: commonFrameworkTrainingVideoCount,
    trainingVideosTotal: derivedCounts.trainingVideosTotal.value,
    agePages: agePages.length,
    planExamples: agePages.reduce(
      (total, agePage) => total + (agePage.examples?.length ?? 0),
      0,
    ),
    derivedCounts,
  });
}

function catalogError(code, message, canonicalUrl = null) {
  return Object.freeze({
    phase: "catalog",
    code,
    canonicalUrl,
    message,
  });
}

export function validateEndpointContracts(
  endpoints,
  { expectedUnavailablePdfCount = EXPECTED_UNAVAILABLE_PDF_COUNT } = {},
) {
  const errors = [];
  const unavailablePdfs = endpoints.filter(
    (endpoint) =>
      endpoint.expectedKind === "pdf" &&
      endpoint.expectedAvailability === "expected-unavailable",
  );
  if (unavailablePdfs.length !== expectedUnavailablePdfCount) {
    errors.push(
      catalogError(
        "EXPECTED_UNAVAILABLE_PDF_COUNT_MISMATCH",
        `Beklenen erişimsiz PDF sayısı ${expectedUnavailablePdfCount}, katalogta ${unavailablePdfs.length}.`,
      ),
    );
  }

  for (const endpoint of endpoints) {
    if (
      endpoint.expectedKind === "pdf" &&
      endpoint.expectedAvailability === "available" &&
      (!Number.isSafeInteger(endpoint.expectedByteSize) || endpoint.expectedByteSize <= 0)
    ) {
      errors.push(
        catalogError(
          "PDF_EXPECTED_BYTE_SIZE_MISSING",
          "Erişilebilir PDF için pozitif, güvenli bir beklenen bayt boyutu yok.",
          endpoint.canonicalUrl,
        ),
      );
    }
    if (
      endpoint.expectedAvailability === "expected-unavailable" &&
      endpoint.expectedByteSize !== null
    ) {
      errors.push(
        catalogError(
          "UNAVAILABLE_PDF_HAS_EXPECTED_SIZE",
          "Beklenen erişimsiz PDF kullanılabilir dosya boyutu taşıyamaz.",
          endpoint.canonicalUrl,
        ),
      );
    }
  }

  return Object.freeze(errors);
}

function safeHeaderValue(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseContentLength(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value !== "string" || !/^\d+$/u.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function probeError(code, message, canonicalUrl) {
  return Object.freeze({
    phase: "head",
    code,
    canonicalUrl,
    message,
  });
}

export function evaluateHeadProbe(endpoint, observation) {
  const contentType = safeHeaderValue(observation.contentType);
  const contentLength = parseContentLength(observation.contentLength);
  const etag = safeHeaderValue(observation.etag);
  const lastModified = safeHeaderValue(observation.lastModified);
  const errors = [];
  let verificationStatus = "verified";

  if (observation.networkError) {
    verificationStatus = "network-error";
    errors.push(
      probeError(
        "NETWORK_ERROR",
        `HEAD isteği tamamlanamadı: ${String(observation.networkError).slice(0, 300)}`,
        endpoint.canonicalUrl,
      ),
    );
  } else if (endpoint.expectedAvailability === "expected-unavailable") {
    if (observation.status === EXPECTED_UNAVAILABLE_HTTP_STATUS) {
      verificationStatus = "expected-unavailable";
    } else if (observation.status >= 200 && observation.status < 300) {
      verificationStatus = "unexpectedly-available";
      errors.push(
        probeError(
          "EXPECTED_UNAVAILABLE_BECAME_AVAILABLE",
          `Katalog erişimsiz bekliyor; HEAD ${observation.status} döndürdü. Kaynak katalogu yeniden doğrulanmalı.`,
          endpoint.canonicalUrl,
        ),
      );
    } else {
      verificationStatus = "unexpected-status";
      errors.push(
        probeError(
          "EXPECTED_UNAVAILABLE_STATUS_MISMATCH",
          `Beklenen HTTP ${EXPECTED_UNAVAILABLE_HTTP_STATUS}; alınan ${observation.status ?? "yok"}.`,
          endpoint.canonicalUrl,
        ),
      );
    }
  } else if (!(observation.status >= 200 && observation.status < 300)) {
    verificationStatus = "unexpected-status";
    errors.push(
      probeError(
        "HTTP_STATUS_UNAVAILABLE",
        `Erişilebilir kaynak HEAD ${observation.status ?? "yok"} döndürdü.`,
        endpoint.canonicalUrl,
      ),
    );
  }

  if (!observation.networkError && observation.finalUrl) {
    try {
      canonicalizeMebUrl(observation.finalUrl);
    } catch {
      verificationStatus = "authority-mismatch";
      errors.push(
        probeError(
          "FINAL_URL_OUTSIDE_AUTHORITY",
          "Yönlendirme resmî TYMM HTTPS yetki alanı dışında sonlandı.",
          endpoint.canonicalUrl,
        ),
      );
    }
  }

  const responseIsSuccessful =
    !observation.networkError && observation.status >= 200 && observation.status < 300;
  if (responseIsSuccessful && endpoint.expectedKind === "pdf") {
    if (!contentType?.toLocaleLowerCase("en-US").startsWith("application/pdf")) {
      verificationStatus = "content-type-mismatch";
      errors.push(
        probeError(
          "PDF_CONTENT_TYPE_MISMATCH",
          `PDF için application/pdf beklenirken ${contentType ?? "başlık yok"} alındı.`,
          endpoint.canonicalUrl,
        ),
      );
    }
    if (contentLength === null) {
      verificationStatus = "content-length-missing";
      errors.push(
        probeError(
          "PDF_CONTENT_LENGTH_MISSING",
          "PDF HEAD yanıtında Content-Length yok veya geçersiz.",
          endpoint.canonicalUrl,
        ),
      );
    } else if (contentLength !== endpoint.expectedByteSize) {
      verificationStatus = "byte-size-mismatch";
      errors.push(
        probeError(
          "PDF_BYTE_SIZE_MISMATCH",
          `Beklenen ${endpoint.expectedByteSize} bayt; alınan ${contentLength} bayt.`,
          endpoint.canonicalUrl,
        ),
      );
    }
  }

  if (
    responseIsSuccessful &&
    endpoint.expectedKind === "html" &&
    !contentType?.toLocaleLowerCase("en-US").includes("text/html")
  ) {
    verificationStatus = "content-type-mismatch";
    errors.push(
      probeError(
        "HTML_CONTENT_TYPE_MISMATCH",
        `HTML için text/html beklenirken ${contentType ?? "başlık yok"} alındı.`,
        endpoint.canonicalUrl,
      ),
    );
  }

  return Object.freeze({
    canonicalUrl: endpoint.canonicalUrl,
    expectedKind: endpoint.expectedKind,
    expectedAvailability: endpoint.expectedAvailability,
    expectedByteSize: endpoint.expectedByteSize,
    verificationStatus,
    head: Object.freeze({
      method: "HEAD",
      status: observation.status ?? null,
      contentType,
      contentLength,
      etag,
      lastModified,
      finalUrl: observation.finalUrl ?? null,
      redirected: Boolean(observation.redirected),
      attempts: observation.attempts ?? 1,
      durationMs: observation.durationMs ?? null,
      checkedAtUtc: observation.checkedAtUtc ?? null,
    }),
    references: endpoint.references,
    errors: Object.freeze(errors),
  });
}

function shouldRetryStatus(endpoint, status) {
  if (
    endpoint.expectedAvailability === "expected-unavailable" &&
    status === EXPECTED_UNAVAILABLE_HTTP_STATUS
  ) {
    return false;
  }
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function waitForRetry(attempt) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, 250 * 2 ** attempt);
  });
}

export async function probeOfficialEndpoint(
  endpoint,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_OPTIONS.timeoutMs,
    retries = DEFAULT_OPTIONS.retries,
  } = {},
) {
  const startedAt = Date.now();
  let observation = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint.canonicalUrl, {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: endpoint.expectedKind === "pdf" ? "application/pdf" : "text/html",
          "user-agent": "MaarifOS-TYMM-Official-Source-Audit/1.0",
        },
      });
      observation = {
        status: response.status,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        finalUrl: response.url || endpoint.canonicalUrl,
        redirected: response.redirected,
        attempts: attempt + 1,
        checkedAtUtc: new Date().toISOString(),
      };
      if (attempt < retries && shouldRetryStatus(endpoint, response.status)) {
        await waitForRetry(attempt);
        continue;
      }
      break;
    } catch (error) {
      observation = {
        status: null,
        contentType: null,
        contentLength: null,
        etag: null,
        lastModified: null,
        finalUrl: null,
        redirected: false,
        attempts: attempt + 1,
        checkedAtUtc: new Date().toISOString(),
        networkError: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
      if (attempt < retries) {
        await waitForRetry(attempt);
        continue;
      }
    }
  }

  observation.durationMs = Date.now() - startedAt;
  return evaluateHeadProbe(endpoint, observation);
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

function officialDiscoveryUrl(path, query = {}) {
  const url = new URL(path, AUTHORITY_BASE_URL);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  return canonicalizeMebUrl(url.toString());
}

function discoveryDefinition(input) {
  return Object.freeze({
    ...input,
    url: canonicalizeMebUrl(input.url),
    selectionGroups: Object.freeze(
      (input.selectionGroups ?? []).map((group) =>
        Object.freeze({ ...group, expectedIds: Object.freeze([...group.expectedIds]) }),
      ),
    ),
  });
}

function catalogOnlyFrameworkRequestId(pathname) {
  return `catalog-only-framework-${pathname.replace(/^\//u, "").replaceAll("/", "-")}`;
}

export function buildDiscoveryDefinitions() {
  const definitions = [];

  definitions.push(
    discoveryDefinition({
      requestId: "main-navigation-shell",
      category: "common-framework-menu-evidence",
      url: officialDiscoveryUrl("/"),
      responseShape: "navigation-shell-html",
      selector: Object.freeze({ type: "all" }),
      expectedTotalCount: 39,
      selectionOrigin: "MEB-navigation-shell",
      scopeNote:
        "Ana sayfadaki resmî aynı-host bağlantılar ortak çerçeve kataloğunun menü kanıtı için ayrıştırılır.",
    }),
  );

  for (const pathname of DECLARED_CATALOG_ONLY_DIRECT_OFFICIAL_PATHS) {
    definitions.push(
      discoveryDefinition({
        requestId: catalogOnlyFrameworkRequestId(pathname),
        category: "catalog-only-direct-official-page",
        url: officialDiscoveryUrl(pathname),
        responseShape: "official-html-page",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: Object.freeze([pathname]),
        expectedTotalCount: 1,
        expectedOrder: true,
        selectionOrigin: "MEB-direct-official-page",
        scopeNote:
          "Ana navigasyon shell'inde bağlantısı bulunmayan, uygulama kataloğunda beyanlı resmî ortak çerçeve sayfası.",
      }),
    );
  }

  for (const page of [1, 2]) {
    definitions.push(
      discoveryDefinition({
        requestId: `program-list-page-${page}`,
        category: "program-list",
        url: officialDiscoveryUrl("/Ders/GetProgramList", {
          page,
          kademe: "temel-egitim",
        }),
        responseShape: "paged-json",
        selector: Object.freeze({ type: "field-equals", field: "id", value: PRESCHOOL_COURSE_ID }),
        expectedPage: page,
        expectedTotalPages: 2,
        expectedTotalCount: 33,
        selectionOrigin: "MEB-direct-preschool",
      }),
    );
  }

  for (const age of AGE_DISCOVERY) {
    definitions.push(
      discoveryDefinition({
        requestId: `courses-by-age-${age.ageBand}`,
        category: "preschool-course-by-age",
        ageBand: age.ageBand,
        url: officialDiscoveryUrl("/Ders/GetDerslerBySinif", {
          sinifId: age.classId,
          kademe: 2,
        }),
        responseShape: "array-json",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: Object.freeze([PRESCHOOL_COURSE_ID]),
        expectedTotalCount: 1,
        expectedOrder: true,
        selectionOrigin: "MEB-direct-preschool",
      }),
      discoveryDefinition({
        requestId: `plans-by-age-${age.ageBand}`,
        category: "preschool-plan-by-age",
        ageBand: age.ageBand,
        url: officialDiscoveryUrl("/Unite/GetUnitelerByDersId", {
          dersId: PRESCHOOL_COURSE_ID,
          sinifId: age.classId,
        }),
        responseShape: "array-json",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: age.planIds,
        expectedTotalCount: age.planIds.length,
        expectedOrder: true,
        selectionOrigin: "MEB-direct-preschool",
      }),
      discoveryDefinition({
        requestId: `books-by-age-${age.ageBand}`,
        category: "preschool-book-by-age",
        ageBand: age.ageBand,
        url: officialDiscoveryUrl("/Kitap/GetDersKitaplariBySinifDers", {
          sinifId: age.classId,
          dersId: PRESCHOOL_COURSE_ID,
          kademe: 2,
        }),
        responseShape: "array-json",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: age.bookIds,
        expectedTotalCount: age.bookIds.length,
        expectedOrder: false,
        selectionOrigin: "MEB-direct-preschool",
      }),
      discoveryDefinition({
        requestId: `differentiation-by-age-${age.ageBand}`,
        category: "preschool-empty-collection",
        ageBand: age.ageBand,
        url: officialDiscoveryUrl("/Kitap/GetFarklilastirmaBySinifDers", {
          sinifId: age.classId,
          dersId: PRESCHOOL_COURSE_ID,
          kademe: 2,
        }),
        responseShape: "array-json",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: Object.freeze([]),
        expectedTotalCount: 0,
        expectedOrder: true,
        exactEmptyCollection: true,
        selectionOrigin: "MEB-empty-preschool-collection",
      }),
      discoveryDefinition({
        requestId: `teaching-materials-by-age-${age.ageBand}`,
        category: "preschool-empty-collection",
        ageBand: age.ageBand,
        url: officialDiscoveryUrl("/Kitap/GetOgretimMateryalleriBySinifDers", {
          sinifId: age.classId,
          dersId: PRESCHOOL_COURSE_ID,
          kademe: 2,
        }),
        responseShape: "array-json",
        selector: Object.freeze({ type: "all" }),
        expectedSelectedIds: Object.freeze([]),
        expectedTotalCount: 0,
        expectedOrder: true,
        exactEmptyCollection: true,
        selectionOrigin: "MEB-empty-preschool-collection",
      }),
    );
  }

  for (const page of [1, 2, 3, 4]) {
    definitions.push(
      discoveryDefinition({
        requestId: `book-list-page-${page}`,
        category: "book-list",
        url: officialDiscoveryUrl("/Kitap/GetDersKitaplariList", {
          page,
          kademe: "temel-egitim",
        }),
        responseShape: "paged-json",
        selector: Object.freeze({ type: "field-equals", field: "dersId", value: PRESCHOOL_COURSE_ID }),
        expectedPage: page,
        expectedTotalPages: 4,
        expectedTotalCount: 69,
        selectionOrigin: "MEB-direct-preschool",
      }),
    );
  }

  const documentIndexes = [
    {
      requestId: "program-literacy-guides-index",
      category: "common-document-index",
      path: "/program-okuryazarligi-kilavuzlari",
      totalCount: 7,
      selectedIds: EXPECTED_PROGRAM_LITERACY_DOCUMENT_IDS,
      scopeNote: "Tüm yedi program okuryazarlığı modülü ortak TYMM uygulama kaynağıdır.",
    },
    {
      requestId: "parent-student-guides-index",
      category: "scope-decision-document-index",
      path: "/veli-ogrenci-bilgilendirme-kilavuzlari",
      totalCount: 3,
      selectedIds: EXPECTED_PARENT_GUIDE_DOCUMENT_IDS,
      scopeNote:
        "ID 8 temel eğitim geneli için seçilmiştir; okul öncesi uygulanırlığı belge içinde doğrulanmamıştır.",
    },
    {
      requestId: "brochures-index",
      category: "scope-decision-document-index",
      path: "/brosurler",
      totalCount: 21,
      selectedIds: EXPECTED_BROCHURE_DOCUMENT_IDS,
      scopeNote:
        "ID 16–21 ortak TYMM çerçevesi olarak MaarifOS kapsam kararıyla seçilmiştir; diğer branş broşürleri dahil değildir.",
    },
    {
      requestId: "reports-index",
      category: "common-document-index",
      path: "/raporlar",
      totalCount: 5,
      selectedIds: EXPECTED_REPORT_DOCUMENT_IDS,
      scopeNote: "Raporlar genel analitik arka plan kaynağıdır; okul öncesi programı değildir.",
    },
  ];
  for (const index of documentIndexes) {
    definitions.push(
      discoveryDefinition({
        requestId: index.requestId,
        category: index.category,
        url: officialDiscoveryUrl(index.path),
        responseShape: "document-index-html",
        selector: Object.freeze({ type: "ids", ids: index.selectedIds }),
        expectedSelectedIds: index.selectedIds,
        expectedTotalCount: index.totalCount,
        expectedOrder: false,
        selectionOrigin: "MaarifOS-scope-decision",
        scopeNote: index.scopeNote,
      }),
    );
  }

  const videoIndexes = [
    {
      requestId: "introduction-videos-index",
      path: "/tanitim-videolari",
      totalCount: 20,
      groups: [
        {
          id: "direct-preschool",
          origin: "MEB-direct-preschool",
          expectedIds: [134],
        },
      ],
    },
    {
      requestId: "training-videos-index",
      path: "/egitim-videolari",
      totalCount: 55,
      groups: [
        {
          id: "direct-preschool",
          origin: "MEB-direct-preschool",
          expectedIds: [153],
        },
        {
          id: "shared-tymm-framework",
          origin: "MaarifOS-scope-decision",
          expectedIds: EXPECTED_COMMON_TRAINING_VIDEO_IDS,
        },
      ],
    },
    {
      requestId: "book-introduction-videos-index",
      path: "/ders-kitabi-tanitim-videolari",
      totalCount: 26,
      groups: [
        {
          id: "direct-preschool",
          origin: "MEB-direct-preschool",
          expectedIds: [208],
        },
      ],
    },
    {
      requestId: "classroom-activity-videos-index",
      path: "/sinif-ici-etkinlik-videolari",
      totalCount: 56,
      groups: [
        {
          id: "direct-preschool",
          origin: "MEB-direct-preschool",
          expectedIds: Array.from({ length: 12 }, (_, index) => 280 + index),
        },
      ],
    },
  ];
  for (const index of videoIndexes) {
    const selectedIds = index.groups.flatMap((group) => group.expectedIds);
    definitions.push(
      discoveryDefinition({
        requestId: index.requestId,
        category: "video-index",
        url: officialDiscoveryUrl(index.path),
        responseShape: "video-index-html",
        selector: Object.freeze({ type: "ids", ids: Object.freeze(selectedIds) }),
        selectionGroups: index.groups,
        expectedSelectedIds: Object.freeze(selectedIds),
        expectedTotalCount: index.totalCount,
        expectedOrder: false,
        selectionOrigin: "mixed-MEB-and-MaarifOS-scope",
        scopeNote:
          "Doğrudan okul öncesi kayıtları MEB başlığıyla; ortak eğitim videoları MaarifOS kapsam kararıyla seçilir.",
      }),
    );
  }

  return Object.freeze(definitions);
}

function decodeUtf8(rawBody) {
  const bytes = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody ?? []);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function validateDiscoveredIds(items, context) {
  const ids = items.map((item) => item?.id);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error(`${context} kayıtlarının tamamında pozitif tam sayı id bulunmalı.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${context} aynı yanıtta mükerrer id içeriyor.`);
  }
  return ids;
}

export function parsePagedJsonCollection(rawBody) {
  const parsed = JSON.parse(decodeUtf8(rawBody));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.items)) {
    throw new Error("Sayfalı JSON yanıtı items dizisi taşıyan bir nesne olmalı.");
  }
  for (const key of ["page", "pageSize", "totalCount", "totalPages"]) {
    if (!Number.isSafeInteger(parsed[key]) || parsed[key] < 0) {
      throw new Error(`Sayfalı JSON ${key} alanı geçersiz.`);
    }
  }
  return Object.freeze({
    items: Object.freeze(parsed.items),
    allIds: Object.freeze(validateDiscoveredIds(parsed.items, "Sayfalı JSON")),
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalCount: parsed.totalCount,
    totalPages: parsed.totalPages,
    hasMore: Boolean(parsed.hasMore),
  });
}

export function parseJsonArrayCollection(rawBody) {
  const parsed = JSON.parse(decodeUtf8(rawBody));
  if (!Array.isArray(parsed)) throw new Error("JSON koleksiyon yanıtı dizi olmalı.");
  return Object.freeze({
    items: Object.freeze(parsed),
    allIds: Object.freeze(validateDiscoveredIds(parsed, "JSON koleksiyonu")),
    totalCount: parsed.length,
  });
}

function decodeHtmlEntities(value) {
  const namedEntities = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  });
  return value.replace(/&(?:#(\d+)|#x([a-f0-9]+)|([a-z]+));/giu, (entity, decimal, hex, named) => {
    if (decimal || hex) {
      const codePoint = Number.parseInt(decimal ?? hex, decimal ? 10 : 16);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    return namedEntities[named.toLocaleLowerCase("en-US")] ?? entity;
  });
}

function collapseOfficialTitle(value) {
  if (typeof value !== "string") return null;
  const collapsed = decodeHtmlEntities(value)
    .replace(/<[^>]*>/gu, " ")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
  return collapsed.length > 0 ? collapsed : null;
}

export function normalizeOfficialTitle(value) {
  return collapseOfficialTitle(value)?.toLocaleLowerCase("tr-TR") ?? null;
}

function readHtmlAttribute(attributes, attributeName) {
  const pattern = new RegExp(
    `(?:^|\\s)${attributeName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
    "iu",
  );
  return pattern.exec(attributes)?.[2] ?? null;
}

function titleEvidence(value, observedFrom) {
  const collapsed = collapseOfficialTitle(value);
  return collapsed
    ? Object.freeze({ value: collapsed, observedFrom })
    : null;
}

function extractClassTitleEvidence(fragment, className, observedFrom) {
  const evidence = [];
  for (const match of fragment.matchAll(/<(h[1-6]|p|span)\b([^>]*)>([\s\S]*?)<\/\1>/giu)) {
    const classValue = readHtmlAttribute(match[2], "class");
    if (!classValue?.split(/\s+/u).includes(className)) continue;
    const candidate = titleEvidence(match[3], observedFrom);
    if (candidate) evidence.push(candidate);
  }
  return evidence;
}

function uniqueTitleEvidence(evidence) {
  const unique = new Map();
  for (const item of evidence) {
    if (!item) continue;
    const key = `${item.observedFrom}\u0000${item.value}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Object.freeze([...unique.values()]);
}

export function extractIndexedResourceRecords(rawBody, indexKind) {
  if (!["document", "video"].includes(indexKind)) {
    throw new Error(`Bilinmeyen resmî indeks türü: ${indexKind}`);
  }
  const html = decodeUtf8(rawBody);
  const records = new Map();
  for (const anchor of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu)) {
    const href = readHtmlAttribute(anchor[1], "href");
    if (!href) continue;
    let canonicalUrl;
    try {
      canonicalUrl = canonicalizeMebUrl(new URL(href, AUTHORITY_BASE_URL).toString());
    } catch {
      continue;
    }
    const pathname = new URL(canonicalUrl).pathname;
    const idMatch =
      indexKind === "document"
        ? /^\/dokuman\/(\d+)(?:\/|$)/u.exec(pathname)
        : /^\/videolar\/[^/]+\/(\d+)(?:\/|$)/u.exec(pathname);
    if (!idMatch) continue;

    const evidence = [];
    if (indexKind === "document") {
      evidence.push(
        titleEvidence(readHtmlAttribute(anchor[1], "title"), "MEB-index-anchor[title]"),
        ...extractClassTitleEvidence(anchor[2], "doc-title", "MEB-index-.doc-title"),
        ...extractClassTitleEvidence(anchor[2], "doc-subtitle", "MEB-index-.doc-subtitle"),
      );
    } else {
      evidence.push(
        ...extractClassTitleEvidence(anchor[2], "card-title", "MEB-index-.card-title"),
        titleEvidence(readHtmlAttribute(anchor[1], "title"), "MEB-index-anchor[title]"),
      );
      for (const image of anchor[2].matchAll(/<img\b([^>]*)>/giu)) {
        evidence.push(titleEvidence(readHtmlAttribute(image[1], "alt"), "MEB-index-img[alt]"));
      }
    }

    const id = Number(idMatch[1]);
    const previous = records.get(id);
    records.set(id, {
      id,
      officialRecordUrl: canonicalUrl,
      titleEvidence: uniqueTitleEvidence([
        ...(previous?.titleEvidence ?? []),
        ...evidence,
      ]),
    });
  }
  if (records.size === 0) {
    throw new Error(`${indexKind} indeksinde hiçbir resmî kayıt bağlantısı bulunamadı.`);
  }
  return Object.freeze(
    [...records.values()].map((record) =>
      Object.freeze({
        ...record,
        titleEvidence: uniqueTitleEvidence(record.titleEvidence),
      }),
    ),
  );
}

export function extractIndexedResourceIds(rawBody, indexKind) {
  return Object.freeze(
    extractIndexedResourceRecords(rawBody, indexKind).map((record) => record.id),
  );
}

function canonicalPathname(value) {
  const parsed = new URL(value, AUTHORITY_BASE_URL);
  let pathname = parsed.pathname;
  if (pathname !== "/") pathname = pathname.replace(/\/+$/u, "");
  return pathname;
}

export function extractSameAuthorityPathnames(rawBody, pageUrl = AUTHORITY_BASE_URL) {
  const html = decodeUtf8(rawBody);
  const pathnames = [];
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/giu)) {
    try {
      const parsed = new URL(match[1], pageUrl);
      if (
        parsed.protocol !== "https:" ||
        parsed.hostname.toLocaleLowerCase("en-US") !== AUTHORITY_HOST ||
        parsed.port !== "" ||
        parsed.username !== "" ||
        parsed.password !== ""
      ) {
        continue;
      }
      pathnames.push(canonicalPathname(parsed.toString()));
    } catch {
      // Invalid or non-URL href values are outside the official pathname evidence set.
    }
  }
  return Object.freeze([...new Set(pathnames)]);
}

export function extractCommonFrameworkMenuCandidatePathnames(pathnames) {
  const exact = new Set(COMMON_FRAMEWORK_MENU_EXACT_PATHS);
  return Object.freeze(
    [...new Set(pathnames.map((pathname) => canonicalPathname(pathname)))].filter(
      (pathname) => exact.has(pathname) || pathname.startsWith("/beceriler/"),
    ),
  );
}

export function compareFrameworkMenuEvidence(
  menuPathnames,
  catalogPathnames,
  declaredCatalogOnlyPathnames = DECLARED_CATALOG_ONLY_DIRECT_OFFICIAL_PATHS,
) {
  const menu = [...new Set(menuPathnames.map((pathname) => canonicalPathname(pathname)))];
  const catalog = [...new Set(catalogPathnames.map((pathname) => canonicalPathname(pathname)))];
  const menuSet = new Set(menu);
  const catalogSet = new Set(catalog);
  const menuFrameworkCandidates = extractCommonFrameworkMenuCandidatePathnames(menu);
  const menuEvidencePathnames = catalog.filter((pathname) => menuSet.has(pathname));
  const missingFromCatalog = menuFrameworkCandidates.filter(
    (pathname) => !catalogSet.has(pathname),
  );
  const catalogOnlyDirectOfficialPathnames = catalog.filter(
    (pathname) => !menuSet.has(pathname),
  );
  const declaredCatalogOnly = [
    ...new Set(declaredCatalogOnlyPathnames.map((pathname) => canonicalPathname(pathname))),
  ];
  const catalogOnlyDeclarationDifference = diffExactIds(
    catalogOnlyDirectOfficialPathnames,
    declaredCatalogOnly,
  );
  const errors = [];
  if (missingFromCatalog.length > 0) {
    errors.push(
      Object.freeze({
        phase: "discovery-comparison",
        code: "COMMON_FRAMEWORK_MISSING_FROM_CATALOG",
        comparison: "common-framework-menu-evidence",
        message: `Menüde bulunup uygulama kataloğunda olmayan ortak çerçeve yolları: ${missingFromCatalog.join(", ")}.`,
      }),
    );
  }
  if (!catalogOnlyDeclarationDifference.matches) {
    errors.push(
      Object.freeze({
        phase: "discovery-comparison",
        code: "COMMON_FRAMEWORK_CATALOG_ONLY_DECLARATION_MISMATCH",
        comparison: "common-framework-menu-evidence",
        message: `Beyanlı katalog eki farkı: eksik [${catalogOnlyDeclarationDifference.missing.join(", ")}], fazla [${catalogOnlyDeclarationDifference.extra.join(", ")}].`,
      }),
    );
  }
  return Object.freeze({
    name: "common-framework-menu-evidence",
    matches: errors.length === 0,
    menuPathnameCount: menu.length,
    menuFrameworkCandidatePathnames: menuFrameworkCandidates,
    applicationCatalogPathnames: Object.freeze(catalog),
    menuEvidencePathnames: Object.freeze(menuEvidencePathnames),
    missingFromCatalog: Object.freeze(missingFromCatalog),
    catalogOnlyDirectOfficialPathnames: Object.freeze(
      catalogOnlyDirectOfficialPathnames,
    ),
    declaredCatalogOnlyDirectOfficialPathnames: Object.freeze(declaredCatalogOnly),
    catalogOnlyDeclarationDifference,
    catalogOnlyStatus: "informational-declared-direct-official-pages",
    errors: Object.freeze(errors),
  });
}

export function diffExactIds(expectedIds, actualIds, { ordered = false } = {}) {
  const expected = [...expectedIds];
  const actual = [...actualIds];
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((id) => !actualSet.has(id));
  const extra = actual.filter((id) => !expectedSet.has(id));
  const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index);
  const orderMismatch =
    ordered &&
    (expected.length !== actual.length || expected.some((id, index) => actual[index] !== id));
  return Object.freeze({
    matches: missing.length === 0 && extra.length === 0 && duplicates.length === 0 && !orderMismatch,
    missing: Object.freeze(missing),
    extra: Object.freeze(extra),
    duplicates: Object.freeze([...new Set(duplicates)]),
    orderMismatch,
  });
}

function discoveryError(code, message, definition) {
  return Object.freeze({
    phase: "discovery",
    code,
    requestId: definition?.requestId ?? null,
    canonicalUrl: definition?.url ?? null,
    message,
  });
}

function selectDiscoveryItems(definition, parsed) {
  const selector = definition.selector ?? { type: "all" };
  if (selector.type === "all") return parsed.items;
  if (selector.type === "field-equals") {
    return parsed.items.filter((item) => item?.[selector.field] === selector.value);
  }
  if (selector.type === "ids") {
    const wanted = new Set(selector.ids);
    return parsed.items.filter((item) => wanted.has(item.id));
  }
  throw new Error(`Bilinmeyen keşif seçicisi: ${selector.type}`);
}

function parseDiscoveryBody(definition, rawBody) {
  if (definition.responseShape === "paged-json") return parsePagedJsonCollection(rawBody);
  if (definition.responseShape === "array-json") return parseJsonArrayCollection(rawBody);

  if (definition.responseShape === "navigation-shell-html") {
    const allPathnames = extractSameAuthorityPathnames(rawBody, definition.url);
    const frameworkCandidatePathnames = extractCommonFrameworkMenuCandidatePathnames(allPathnames);
    return Object.freeze({
      items: Object.freeze(
        frameworkCandidatePathnames.map((pathname) => Object.freeze({ id: pathname })),
      ),
      allIds: frameworkCandidatePathnames,
      allPathnames,
      frameworkCandidatePathnames,
      totalCount: allPathnames.length,
    });
  }

  if (definition.responseShape === "official-html-page") {
    const pathname = canonicalPathname(definition.url);
    return Object.freeze({
      items: Object.freeze([Object.freeze({ id: pathname })]),
      allIds: Object.freeze([pathname]),
      allPathnames: Object.freeze([pathname]),
      totalCount: 1,
    });
  }

  const indexKind = definition.responseShape === "document-index-html" ? "document" : "video";
  const items = extractIndexedResourceRecords(rawBody, indexKind);
  const allIds = Object.freeze(items.map((item) => item.id));
  return Object.freeze({
    items,
    allIds,
    totalCount: allIds.length,
  });
}

function selectedTitleRecord(item) {
  const titleEvidenceItems = uniqueTitleEvidence([
    ...(item?.titleEvidence ?? []),
    titleEvidence(item?.title, "MEB-API-record.title"),
  ]);
  return Object.freeze({
    id: item.id,
    officialRecordUrl: item?.officialRecordUrl ?? null,
    titleEvidence: titleEvidenceItems,
  });
}

export function evaluateDiscoveryGet(definition, observation) {
  const errors = [];
  const rawBody = observation.rawBody
    ? Buffer.isBuffer(observation.rawBody)
      ? observation.rawBody
      : Buffer.from(observation.rawBody)
    : null;
  const contentType = safeHeaderValue(observation.contentType);
  let parsed = null;
  let selectedIds = [];
  let selectedTitleRecords = [];
  let selectionGroups = [];

  if (observation.networkError) {
    errors.push(
      discoveryError(
        "DISCOVERY_NETWORK_ERROR",
        `GET isteği tamamlanamadı: ${String(observation.networkError).slice(0, 300)}`,
        definition,
      ),
    );
  } else if (!(observation.status >= 200 && observation.status < 300)) {
    errors.push(
      discoveryError(
        "DISCOVERY_HTTP_STATUS_UNAVAILABLE",
        `Keşif GET isteği ${observation.status ?? "yok"} döndürdü.`,
        definition,
      ),
    );
  }

  if (!observation.networkError && observation.finalUrl) {
    try {
      canonicalizeMebUrl(observation.finalUrl);
    } catch {
      errors.push(
        discoveryError(
          "DISCOVERY_FINAL_URL_OUTSIDE_AUTHORITY",
          "Keşif yönlendirmesi resmî TYMM HTTPS yetki alanı dışında sonlandı.",
          definition,
        ),
      );
    }
  }

  const responseIsSuccessful =
    !observation.networkError && observation.status >= 200 && observation.status < 300;
  if (responseIsSuccessful) {
    if (!rawBody || rawBody.length === 0) {
      errors.push(
        discoveryError(
          "DISCOVERY_EMPTY_RESPONSE_BODY",
          "Başarılı GET yanıtı boş gövde döndürdü.",
          definition,
        ),
      );
    }
    const expectedType = definition.responseShape.endsWith("json")
      ? "application/json"
      : "text/html";
    if (!contentType?.toLocaleLowerCase("en-US").includes(expectedType)) {
      errors.push(
        discoveryError(
          "DISCOVERY_CONTENT_TYPE_MISMATCH",
          `${expectedType} beklenirken ${contentType ?? "başlık yok"} alındı.`,
          definition,
        ),
      );
    }
    try {
      parsed = parseDiscoveryBody(definition, rawBody ?? Buffer.alloc(0));
      const selectedItems = selectDiscoveryItems(definition, parsed);
      selectedIds = selectedItems.map((item) => item.id);
      selectedTitleRecords = selectedItems.map(selectedTitleRecord);
      selectionGroups = definition.selectionGroups.map((group) => {
        const selectedSet = new Set(selectedIds);
        return Object.freeze({
          id: group.id,
          origin: group.origin,
          expectedIds: group.expectedIds,
          discoveredIds: Object.freeze(group.expectedIds.filter((id) => selectedSet.has(id))),
        });
      });
    } catch (error) {
      errors.push(
        discoveryError(
          "DISCOVERY_PARSE_ERROR",
          error instanceof Error ? error.message : String(error),
          definition,
        ),
      );
    }
  }

  if (parsed) {
    if (
      Number.isSafeInteger(definition.expectedTotalCount) &&
      parsed.totalCount !== definition.expectedTotalCount
    ) {
      errors.push(
        discoveryError(
          "DISCOVERY_TOTAL_COUNT_MISMATCH",
          `Beklenen toplam ${definition.expectedTotalCount}; keşfedilen ${parsed.totalCount}.`,
          definition,
        ),
      );
    }
    if (
      Number.isSafeInteger(definition.expectedPage) &&
      parsed.page !== definition.expectedPage
    ) {
      errors.push(
        discoveryError(
          "DISCOVERY_PAGE_MISMATCH",
          `Beklenen sayfa ${definition.expectedPage}; yanıt ${parsed.page ?? "yok"}.`,
          definition,
        ),
      );
    }
    if (
      Number.isSafeInteger(definition.expectedTotalPages) &&
      parsed.totalPages !== definition.expectedTotalPages
    ) {
      errors.push(
        discoveryError(
          "DISCOVERY_TOTAL_PAGES_MISMATCH",
          `Beklenen sayfa toplamı ${definition.expectedTotalPages}; yanıt ${parsed.totalPages ?? "yok"}.`,
          definition,
        ),
      );
    }
    if (definition.expectedSelectedIds) {
      const difference = diffExactIds(definition.expectedSelectedIds, selectedIds, {
        ordered: Boolean(definition.expectedOrder),
      });
      if (!difference.matches) {
        errors.push(
          discoveryError(
            "DISCOVERY_SELECTED_IDS_MISMATCH",
            `Seçili kimlik farkı: eksik [${difference.missing.join(",")}], fazla [${difference.extra.join(",")}], sıraSapması=${difference.orderMismatch}.`,
            definition,
          ),
        );
      }
    }
    if (definition.exactEmptyCollection && (parsed.totalCount !== 0 || selectedIds.length !== 0)) {
      errors.push(
        discoveryError(
          "DISCOVERY_EXPECTED_EMPTY_COLLECTION_NOT_EMPTY",
          "Okul öncesi için boş olması gereken koleksiyon kayıt döndürdü.",
          definition,
        ),
      );
    }
  }

  return Object.freeze({
    requestId: definition.requestId,
    category: definition.category,
    ageBand: definition.ageBand ?? null,
    canonicalUrl: definition.url,
    selectionOrigin: definition.selectionOrigin,
    scopeNote: definition.scopeNote ?? null,
    verificationStatus: errors.length === 0 ? "verified" : "failed",
    get: Object.freeze({
      method: "GET",
      status: observation.status ?? null,
      contentType,
      rawBodyBytes: rawBody?.length ?? null,
      rawBodySha256: rawBody ? `sha256:${sha256(rawBody)}` : null,
      etag: safeHeaderValue(observation.etag),
      lastModified: safeHeaderValue(observation.lastModified),
      finalUrl: observation.finalUrl ?? null,
      redirected: Boolean(observation.redirected),
      attempts: observation.attempts ?? 1,
      durationMs: observation.durationMs ?? null,
      checkedAtUtc: observation.checkedAtUtc ?? null,
    }),
    parsed: parsed
      ? Object.freeze({
          page: parsed.page ?? null,
          pageSize: parsed.pageSize ?? null,
          totalPages: parsed.totalPages ?? null,
          responseItemCount: parsed.items.length,
          totalCount: parsed.totalCount,
          selectedCount: selectedIds.length,
          allIds: parsed.allIds,
          selectedIds: Object.freeze(selectedIds),
          selectedTitleRecords: Object.freeze(selectedTitleRecords),
          allPathnames: parsed.allPathnames ?? null,
          frameworkCandidatePathnames: parsed.frameworkCandidatePathnames ?? null,
          selectedPathnames:
            ["navigation-shell-html", "official-html-page"].includes(
              definition.responseShape,
            )
              ? Object.freeze([...selectedIds])
              : null,
          selectionGroups: Object.freeze(selectionGroups),
          exactEmptyCollection: Boolean(definition.exactEmptyCollection),
        })
      : null,
    errors: Object.freeze(errors),
  });
}

async function probeDiscoveryEndpoint(
  definition,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_OPTIONS.timeoutMs,
    retries = DEFAULT_OPTIONS.retries,
  } = {},
) {
  const startedAt = Date.now();
  let observation = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(definition.url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: definition.responseShape.endsWith("json")
            ? "application/json"
            : "text/html",
          "user-agent": "MaarifOS-TYMM-Official-Discovery-Audit/1.0",
        },
      });
      const rawBody = Buffer.from(await response.arrayBuffer());
      observation = {
        status: response.status,
        contentType: response.headers.get("content-type"),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        finalUrl: response.url || definition.url,
        redirected: response.redirected,
        attempts: attempt + 1,
        checkedAtUtc: new Date().toISOString(),
        rawBody,
      };
      if (attempt < retries && [408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        await waitForRetry(attempt);
        continue;
      }
      break;
    } catch (error) {
      observation = {
        status: null,
        contentType: null,
        etag: null,
        lastModified: null,
        finalUrl: null,
        redirected: false,
        attempts: attempt + 1,
        checkedAtUtc: new Date().toISOString(),
        rawBody: null,
        networkError: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
      if (attempt < retries) {
        await waitForRetry(attempt);
        continue;
      }
    }
  }

  observation.durationMs = Date.now() - startedAt;
  return evaluateDiscoveryGet(definition, observation);
}

function idsFromUrlRecords(records, pathPattern) {
  return records.map((record) => {
    const url = new URL(record);
    const match = pathPattern.exec(url.pathname);
    pathPattern.lastIndex = 0;
    if (!match) throw new Error(`Katalog URL'sinden sayısal kimlik çıkarılamadı: ${record}`);
    return Number(match[1]);
  });
}

function applicationDiscoverySnapshot(sourceCollections) {
  const preschoolBookResources = sourceCollections.libraryResources.filter((resource) =>
    ["teacher-guide", "activity-book"].includes(resource.materialKind),
  );
  const documentIds = (kind) =>
    idsFromUrlRecords(
      sourceCollections.libraryResources
        .filter((resource) => resource.materialKind === kind)
        .map((resource) => resource.officialPageUrl),
      /\/dokuman\/(\d+)(?:\/|$)/u,
    );
  const videoIds = (videos) =>
    idsFromUrlRecords(
      videos.map((video) => video.officialRecord.url),
      /\/videolar\/[^/]+\/(\d+)(?:\/|$)/u,
    );
  const officialTitleRecords = (resources, urlOf, titleOf, pathPattern) =>
    Object.freeze(
      resources
        .map((resource) => {
          const [id] = idsFromUrlRecords([urlOf(resource)], pathPattern);
          return Object.freeze({
            id,
            catalogOfficialTitle: collapseOfficialTitle(titleOf(resource)),
            catalogTitleOrigin: "application-catalog-declared-MEB-official",
          });
        })
        .sort((left, right) => left.id - right.id),
    );

  return Object.freeze({
    preschoolBookIds: Object.freeze(
      idsFromUrlRecords(
        preschoolBookResources.map((resource) => resource.officialPageUrl),
        /\/kitap\/(\d+)(?:\/|$)/u,
      ).sort((left, right) => left - right),
    ),
    preschoolBookOfficialTitles: officialTitleRecords(
      preschoolBookResources,
      (resource) => resource.officialPageUrl,
      (resource) => resource.title,
      /\/kitap\/(\d+)(?:\/|$)/u,
    ),
    planIdsByAge: Object.freeze(
      Object.fromEntries(
        sourceCollections.resourceCatalog.agePages.map((page) => [
          page.ageBand,
          Object.freeze(page.examples.map((example) => example.unitId)),
        ]),
      ),
    ),
    directPreschoolVideoIds: Object.freeze(
      videoIds(sourceCollections.preschoolVideos).sort((left, right) => left - right),
    ),
    directPreschoolVideoOfficialTitles: officialTitleRecords(
      sourceCollections.preschoolVideos,
      (video) => video.officialRecord.url,
      (video) => video.officialRecord.title,
      /\/videolar\/[^/]+\/(\d+)(?:\/|$)/u,
    ),
    commonTrainingVideoIds: Object.freeze(
      videoIds(sourceCollections.generalEducationVideos).sort((left, right) => left - right),
    ),
    commonTrainingVideoOfficialTitles: officialTitleRecords(
      sourceCollections.generalEducationVideos,
      (video) => video.officialRecord.url,
      (video) => video.officialRecord.title,
      /\/videolar\/[^/]+\/(\d+)(?:\/|$)/u,
    ),
    programLiteracyDocumentIds: Object.freeze(documentIds("program-literacy-guide")),
    parentGuideDocumentIds: Object.freeze(documentIds("parent-guide")),
    brochureDocumentIds: Object.freeze(documentIds("brochure")),
    reportDocumentIds: Object.freeze(documentIds("report")),
    commonFrameworkPathnames: Object.freeze(
      sourceCollections.commonFrameworkPages.map((page) =>
        canonicalPathname(page.officialRecord.url),
      ),
    ),
  });
}

function idsFromResults(results, requestIdPrefix, groupId = null) {
  return results
    .filter((result) => result.requestId.startsWith(requestIdPrefix) && result.parsed)
    .flatMap((result) => {
      if (!groupId) return result.parsed.selectedIds;
      return (
        result.parsed.selectionGroups.find((group) => group.id === groupId)?.discoveredIds ?? []
      );
    });
}

function officialTitleRecordsFromResults(results, requestIdPrefix, groupId = null) {
  const merged = new Map();
  for (const result of results) {
    if (!result.requestId.startsWith(requestIdPrefix) || !result.parsed) continue;
    const groupIds = groupId
      ? new Set(
          result.parsed.selectionGroups.find((group) => group.id === groupId)?.discoveredIds ?? [],
        )
      : null;
    for (const record of result.parsed.selectedTitleRecords ?? []) {
      if (groupIds && !groupIds.has(record.id)) continue;
      const previous = merged.get(record.id);
      merged.set(
        record.id,
        Object.freeze({
          id: record.id,
          officialRecordUrl: record.officialRecordUrl ?? previous?.officialRecordUrl ?? null,
          titleEvidence: uniqueTitleEvidence([
            ...(previous?.titleEvidence ?? []),
            ...(record.titleEvidence ?? []),
          ]),
        }),
      );
    }
  }
  return Object.freeze([...merged.values()].sort((left, right) => left.id - right.id));
}

export function compareObservedOfficialTitles(name, catalogRecords, observedRecords) {
  const observedById = new Map(observedRecords.map((record) => [record.id, record]));
  const records = catalogRecords.map((catalogRecord) => {
    const observed = observedById.get(catalogRecord.id);
    const evidence = observed?.titleEvidence ?? [];
    const normalizedCatalogTitle = normalizeOfficialTitle(catalogRecord.catalogOfficialTitle);
    const matchingEvidence = evidence.find(
      (candidate) => normalizeOfficialTitle(candidate.value) === normalizedCatalogTitle,
    );
    const primaryEvidence = evidence[0] ?? null;
    return Object.freeze({
      id: catalogRecord.id,
      catalogOfficialTitle: catalogRecord.catalogOfficialTitle,
      catalogTitleOrigin: catalogRecord.catalogTitleOrigin,
      observedExactTitle: primaryEvidence?.value ?? null,
      observedTitleOrigin: primaryEvidence?.observedFrom ?? null,
      observedAlternates: Object.freeze(evidence.slice(1)),
      matchedObservedExactTitle: matchingEvidence?.value ?? null,
      matchesAfterNormalization: Boolean(matchingEvidence),
    });
  });
  const reviews = records
    .filter((record) => !record.matchesAfterNormalization)
    .map((record) =>
      Object.freeze({
        phase: "official-title-review",
        code: "OFFICIAL_TITLE_REVIEW_REQUIRED",
        comparison: name,
        resourceId: record.id,
        catalogOfficialTitle: record.catalogOfficialTitle,
        observedExactTitle: record.observedExactTitle,
        message: "MEB yanıtında gözlenen başlık uygulama kataloğundaki resmî başlıkla eşleşmiyor; editoryal tür ve yaş metadata alanlarından ayrı incelenmeli.",
      }),
    );
  return Object.freeze({
    name,
    result: reviews.length === 0 ? "PASS" : "REVIEW_REQUIRED",
    comparisonPolicy:
      "Unicode NFKC; whitespace collapse; tr-TR case-insensitive exact equality",
    observedTitleAuthority: "MEB-live-listing-or-API-response-body",
    catalogTitleAuthority: "application-catalog-declared-MEB-official",
    records: Object.freeze(records),
    reviews: Object.freeze(reviews),
  });
}

export function createFirstBaselineComparison() {
  return Object.freeze({
    status: "not-compared-first-baseline",
    previousApprovedReceipt: null,
    baselineReceiptSha256: null,
    driftCompared: false,
    driftFree: null,
    comparedFields: Object.freeze([]),
    limitation:
      "Onaylı önceki makbuz sağlanmadı; bu koşumda kaynak, keşif evreni veya gövde hashleri için drift-yok iddiası üretilmez.",
  });
}

function comparisonError(name, difference, side) {
  return Object.freeze({
    phase: "discovery-comparison",
    code: "DISCOVERY_CATALOG_ID_SET_MISMATCH",
    comparison: name,
    side,
    message: `Eksik [${difference.missing.join(",")}], fazla [${difference.extra.join(",")}], sıraSapması=${difference.orderMismatch}.`,
  });
}

function buildIdComparison(name, expectedIds, discoveredIds, applicationIds = null, ordered = false) {
  const expectedDifference = diffExactIds(expectedIds, discoveredIds, { ordered });
  const applicationDifference = applicationIds
    ? diffExactIds(discoveredIds, applicationIds, { ordered })
    : null;
  const errors = [];
  if (!expectedDifference.matches) {
    errors.push(comparisonError(name, expectedDifference, "expected-vs-discovered"));
  }
  if (applicationDifference && !applicationDifference.matches) {
    errors.push(comparisonError(name, applicationDifference, "discovered-vs-application"));
  }
  return Object.freeze({
    name,
    expectedIds: Object.freeze([...expectedIds]),
    discoveredIds: Object.freeze([...discoveredIds]),
    applicationIds: applicationIds ? Object.freeze([...applicationIds]) : null,
    ordered,
    matches: errors.length === 0,
    expectedDifference,
    applicationDifference,
    errors: Object.freeze(errors),
  });
}

async function buildDiscovery(sourceCollections, options) {
  const definitions = buildDiscoveryDefinitions();
  const requests = await mapWithConcurrency(
    definitions,
    options.concurrency,
    (definition) =>
      probeDiscoveryEndpoint(definition, {
        timeoutMs: options.timeoutMs,
        retries: options.retries,
      }),
  );
  const application = applicationDiscoverySnapshot(sourceCollections);
  const navigationShell = requests.find(
    (result) => result.requestId === "main-navigation-shell",
  );
  const frameworkMenuEvidence = compareFrameworkMenuEvidence(
    navigationShell?.parsed?.allPathnames ?? [],
    application.commonFrameworkPathnames,
  );

  const universes = {
    preschoolProgramIds: idsFromResults(requests, "program-list-page-"),
    preschoolBookIdsFromAgeEndpoints: idsFromResults(requests, "books-by-age-").sort(
      (left, right) => left - right,
    ),
    preschoolBookIdsFromPagedIndex: idsFromResults(requests, "book-list-page-").sort(
      (left, right) => left - right,
    ),
    directPreschoolVideoIds: [
      ...idsFromResults(requests, "introduction-videos-index", "direct-preschool"),
      ...idsFromResults(requests, "training-videos-index", "direct-preschool"),
      ...idsFromResults(requests, "book-introduction-videos-index", "direct-preschool"),
      ...idsFromResults(requests, "classroom-activity-videos-index", "direct-preschool"),
    ].sort((left, right) => left - right),
    commonTrainingVideoIds: idsFromResults(
      requests,
      "training-videos-index",
      "shared-tymm-framework",
    ).sort((left, right) => left - right),
    programLiteracyDocumentIds: idsFromResults(
      requests,
      "program-literacy-guides-index",
    ),
    parentGuideDocumentIds: idsFromResults(requests, "parent-student-guides-index"),
    brochureDocumentIds: idsFromResults(requests, "brochures-index"),
    reportDocumentIds: idsFromResults(requests, "reports-index"),
    commonFrameworkMenuEvidencePathnames: frameworkMenuEvidence.menuEvidencePathnames,
    commonFrameworkMenuCandidatePathnames:
      frameworkMenuEvidence.menuFrameworkCandidatePathnames,
    commonFrameworkCatalogOnlyDirectOfficialPathnames:
      frameworkMenuEvidence.catalogOnlyDirectOfficialPathnames,
    planIdsByAge: Object.fromEntries(
      AGE_DISCOVERY.map((age) => [
        age.ageBand,
        requests.find((result) => result.requestId === `plans-by-age-${age.ageBand}`)?.parsed
          ?.selectedIds ?? [],
      ]),
    ),
  };

  const comparisons = [
    buildIdComparison(
      "preschool-program-id",
      [PRESCHOOL_COURSE_ID],
      universes.preschoolProgramIds,
    ),
    buildIdComparison(
      "preschool-books-age-endpoints",
      EXPECTED_PRESCHOOL_BOOK_IDS,
      universes.preschoolBookIdsFromAgeEndpoints,
      application.preschoolBookIds,
    ),
    buildIdComparison(
      "preschool-books-paged-index",
      EXPECTED_PRESCHOOL_BOOK_IDS,
      universes.preschoolBookIdsFromPagedIndex,
      application.preschoolBookIds,
    ),
    buildIdComparison(
      "direct-preschool-videos",
      [...EXPECTED_DIRECT_PRESCHOOL_VIDEO_IDS].sort((left, right) => left - right),
      universes.directPreschoolVideoIds,
      application.directPreschoolVideoIds,
    ),
    buildIdComparison(
      "common-training-videos",
      EXPECTED_COMMON_TRAINING_VIDEO_IDS,
      universes.commonTrainingVideoIds,
      application.commonTrainingVideoIds,
    ),
    buildIdComparison(
      "program-literacy-documents",
      EXPECTED_PROGRAM_LITERACY_DOCUMENT_IDS,
      universes.programLiteracyDocumentIds,
      application.programLiteracyDocumentIds,
    ),
    buildIdComparison(
      "parent-guide-scope-decision",
      EXPECTED_PARENT_GUIDE_DOCUMENT_IDS,
      universes.parentGuideDocumentIds,
      application.parentGuideDocumentIds,
    ),
    buildIdComparison(
      "brochure-scope-decision",
      EXPECTED_BROCHURE_DOCUMENT_IDS,
      universes.brochureDocumentIds,
      application.brochureDocumentIds,
    ),
    buildIdComparison(
      "reports",
      EXPECTED_REPORT_DOCUMENT_IDS,
      universes.reportDocumentIds,
      application.reportDocumentIds,
    ),
    ...AGE_DISCOVERY.map((age) =>
      buildIdComparison(
        `plans-${age.ageBand}`,
        age.planIds,
        universes.planIdsByAge[age.ageBand],
        application.planIdsByAge[age.ageBand] ?? [],
        true,
      ),
    ),
    frameworkMenuEvidence,
  ];
  const officialTitleComparisons = [
    compareObservedOfficialTitles(
      "preschool-books-age-endpoints-official-titles",
      application.preschoolBookOfficialTitles,
      officialTitleRecordsFromResults(requests, "books-by-age-"),
    ),
    compareObservedOfficialTitles(
      "preschool-books-paged-index-official-titles",
      application.preschoolBookOfficialTitles,
      officialTitleRecordsFromResults(requests, "book-list-page-"),
    ),
    compareObservedOfficialTitles(
      "direct-preschool-video-official-titles",
      application.directPreschoolVideoOfficialTitles,
      officialTitleRecordsFromResults(requests, "", "direct-preschool"),
    ),
    compareObservedOfficialTitles(
      "common-training-video-official-titles",
      application.commonTrainingVideoOfficialTitles,
      officialTitleRecordsFromResults(
        requests,
        "training-videos-index",
        "shared-tymm-framework",
      ),
    ),
  ];
  const officialTitleReviews = officialTitleComparisons.flatMap(
    (comparison) => comparison.reviews,
  );
  const requestErrors = requests.flatMap((request) => request.errors);
  const comparisonErrors = comparisons.flatMap((comparison) => comparison.errors);
  const errors = [...requestErrors, ...comparisonErrors];
  const frozenUniverses = Object.freeze({
    ...universes,
    planIdsByAge: Object.freeze(universes.planIdsByAge),
  });

  return Object.freeze({
    result: errors.length === 0 ? "PASS" : "FAIL",
    scope: Object.freeze({
      asOfCivilDate: "2026-09-01",
      timeZone: ISTANBUL_TIME_ZONE,
      authorityHost: AUTHORITY_HOST,
      statement:
        "Bu closed-world keşfi tüm TYMM sitesini değil, 1 Eylül 2026 tarihinde okul öncesi için belirlenen menü ve API evrenini kapsar.",
      wholeSiteInventory: false,
      commonResourcePolicy:
        "Ortak doküman, broşür, rapor ve eğitim videosu seçimleri MaarifOS kapsam kararıdır; doğrudan okul öncesi programı olarak sunulmaz.",
    }),
    requestCount: requests.length,
    requestDefinitionSetSha256: jsonSha256(
      definitions.map((definition) => ({
        requestId: definition.requestId,
        url: definition.url,
        responseShape: definition.responseShape,
        expectedTotalCount: definition.expectedTotalCount ?? null,
        expectedSelectedIds: definition.expectedSelectedIds ?? null,
      })),
    ),
    responseBodySetSha256: jsonSha256(
      requests.map((request) => ({
        requestId: request.requestId,
        rawBodyBytes: request.get.rawBodyBytes,
        rawBodySha256: request.get.rawBodySha256,
      })),
    ),
    discoveredUniverseSha256: jsonSha256(frozenUniverses),
    officialTitleEvidenceSetSha256: jsonSha256(
      officialTitleComparisons.map((comparison) => ({
        name: comparison.name,
        records: comparison.records,
      })),
    ),
    counts: Object.freeze({
      requests: requests.length,
      verifiedRequests: requests.filter((request) => request.verificationStatus === "verified")
        .length,
      failedRequests: requests.filter((request) => request.verificationStatus !== "verified")
        .length,
      rawBodyBytes: requests.reduce(
        (total, request) => total + (request.get.rawBodyBytes ?? 0),
        0,
      ),
      comparisons: comparisons.length,
      matchingComparisons: comparisons.filter((comparison) => comparison.matches).length,
      officialTitleComparisons: officialTitleComparisons.length,
      officialTitleRecords: officialTitleComparisons.reduce(
        (total, comparison) => total + comparison.records.length,
        0,
      ),
      officialTitleReviews: officialTitleReviews.length,
    }),
    applicationCatalog: application,
    discoveredUniverses: frozenUniverses,
    comparisons: Object.freeze(comparisons),
    officialTitleReviewGate: Object.freeze({
      result: officialTitleReviews.length === 0 ? "PASS" : "REVIEW_REQUIRED",
      accessVerificationResultUnaffected: true,
      comparisons: Object.freeze(officialTitleComparisons),
      reviews: Object.freeze(officialTitleReviews),
    }),
    requests: Object.freeze(requests),
    baselineComparison: createFirstBaselineComparison(),
    errors: Object.freeze(errors),
  });
}

function isOfficialAuthorityUrlOrMissing(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === AUTHORITY_HOST;
  } catch {
    return false;
  }
}

function buildCatalogOnlyDirectOfficialPageEvidence(discovery, endpointResults) {
  const comparison = discovery.comparisons.find(
    (candidate) => candidate.name === "common-framework-menu-evidence",
  );
  const errors = [];
  const pages = (comparison?.catalogOnlyDirectOfficialPathnames ?? []).map((pathname) => {
    const canonicalUrl = officialDiscoveryUrl(pathname);
    const headResult = endpointResults.find(
      (endpoint) => endpoint.canonicalUrl === canonicalUrl,
    );
    const getResult = discovery.requests.find(
      (request) => request.requestId === catalogOnlyFrameworkRequestId(pathname),
    );
    const sameHost =
      isOfficialAuthorityUrlOrMissing(canonicalUrl) &&
      isOfficialAuthorityUrlOrMissing(headResult?.head.finalUrl) &&
      isOfficialAuthorityUrlOrMissing(getResult?.get.finalUrl);
    if (!headResult || headResult.verificationStatus !== "verified") {
      errors.push(
        Object.freeze({
          phase: "catalog-only-page-evidence",
          code: "CATALOG_ONLY_HEAD_EVIDENCE_FAILED",
          canonicalUrl,
          message: "Beyanlı katalog eki için başarılı kanonik HEAD kanıtı bulunamadı.",
        }),
      );
    }
    if (!getResult || getResult.verificationStatus !== "verified") {
      errors.push(
        Object.freeze({
          phase: "catalog-only-page-evidence",
          code: "CATALOG_ONLY_GET_EVIDENCE_FAILED",
          canonicalUrl,
          message: "Beyanlı katalog eki için başarılı kanonik GET kanıtı bulunamadı.",
        }),
      );
    }
    if (!sameHost) {
      errors.push(
        Object.freeze({
          phase: "catalog-only-page-evidence",
          code: "CATALOG_ONLY_AUTHORITY_MISMATCH",
          canonicalUrl,
          message: "Beyanlı katalog eki TYMM resmî same-host yetki alanında kalmadı.",
        }),
      );
    }
    return Object.freeze({
      pathname,
      canonicalUrl,
      declaration: "catalog-only-direct-official-page",
      menuEvidence: false,
      sameHost,
      verificationStatus:
        sameHost &&
        headResult?.verificationStatus === "verified" &&
        getResult?.verificationStatus === "verified"
          ? "verified"
          : "failed",
      head: headResult
        ? Object.freeze({
            status: headResult.head.status,
            contentType: headResult.head.contentType,
            contentLength: headResult.head.contentLength,
            etag: headResult.head.etag,
            lastModified: headResult.head.lastModified,
            finalUrl: headResult.head.finalUrl,
            checkedAtUtc: headResult.head.checkedAtUtc,
          })
        : null,
      get: getResult
        ? Object.freeze({
            requestId: getResult.requestId,
            status: getResult.get.status,
            contentType: getResult.get.contentType,
            rawBodyBytes: getResult.get.rawBodyBytes,
            rawBodySha256: getResult.get.rawBodySha256,
            finalUrl: getResult.get.finalUrl,
            checkedAtUtc: getResult.get.checkedAtUtc,
          })
        : null,
    });
  });

  return Object.freeze({
    status: errors.length === 0 ? "PASS" : "FAIL",
    pageCount: pages.length,
    verifiedPageCount: pages.filter((page) => page.verificationStatus === "verified").length,
    evidenceSha256: jsonSha256(
      pages.map((page) => ({
        pathname: page.pathname,
        canonicalUrl: page.canonicalUrl,
        sameHost: page.sameHost,
        headStatus: page.head?.status ?? null,
        getStatus: page.get?.status ?? null,
        getBodySha256: page.get?.rawBodySha256 ?? null,
      })),
    ),
    pages: Object.freeze(pages),
    errors: Object.freeze(errors),
  });
}

function civilDateInIstanbul(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function assertPathInsideRoot(rootPath, candidatePath, label, { allowRoot = false } = {}) {
  const relativePath = relative(rootPath, candidatePath);
  if (
    (!allowRoot && relativePath === "") ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} APP_ROOT altında bir dosya olmalı: ${candidatePath}`);
  }
  return candidatePath;
}

export function resolveAuditOutputPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("--output boş olmayan bir dosya yolu olmalı.");
  }
  return assertPathInsideRoot(APP_ROOT, resolve(APP_ROOT, value), "--output");
}

export function parseArguments(argv) {
  const options = { ...DEFAULT_OPTIONS, output: DEFAULT_OUTPUT, overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--overwrite") {
      options.overwrite = true;
      continue;
    }
    const value = argv[index + 1];
    if (argument === "--output" && value) {
      options.output = resolveAuditOutputPath(value);
      index += 1;
      continue;
    }
    if (argument === "--timeout-ms" && value) {
      options.timeoutMs = Number(value);
      index += 1;
      continue;
    }
    if (argument === "--concurrency" && value) {
      options.concurrency = Number(value);
      index += 1;
      continue;
    }
    if (argument === "--retries" && value) {
      options.retries = Number(value);
      index += 1;
      continue;
    }
    throw new Error(`Bilinmeyen veya eksik komut seçeneği: ${argument}`);
  }

  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error("--timeout-ms en az 1000 olan bir tam sayı olmalı.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 20) {
    throw new Error("--concurrency 1 ile 20 arasında bir tam sayı olmalı.");
  }
  if (!Number.isInteger(options.retries) || options.retries < 0 || options.retries > 5) {
    throw new Error("--retries 0 ile 5 arasında bir tam sayı olmalı.");
  }
  return options;
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function findExistingAncestor(candidatePath) {
  let currentPath = candidatePath;
  while (true) {
    try {
      await stat(currentPath);
      return currentPath;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parentPath = dirname(currentPath);
      if (parentPath === currentPath) throw error;
      currentPath = parentPath;
    }
  }
}

async function prepareOutputDirectory(outputPath) {
  const outputDirectory = dirname(outputPath);
  const existingAncestor = await findExistingAncestor(outputDirectory);
  const [realAppRoot, realExistingAncestor] = await Promise.all([
    realpath(APP_ROOT),
    realpath(existingAncestor),
  ]);
  assertPathInsideRoot(realAppRoot, realExistingAncestor, "--output üst dizini", {
    allowRoot: true,
  });

  await mkdir(outputDirectory, { recursive: true });
  const realOutputDirectory = await realpath(outputDirectory);
  assertPathInsideRoot(realAppRoot, realOutputDirectory, "--output üst dizini", {
    allowRoot: true,
  });
  return outputDirectory;
}

async function hashInput(relativePath) {
  const absolutePath = resolve(APP_ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  return Object.freeze({
    path: relative(APP_ROOT, absolutePath).replaceAll("\\", "/"),
    sha256: `sha256:${sha256(bytes)}`,
    bytes: bytes.length,
  });
}

function resolveGeneralEducationVideos(moduleNamespace) {
  if (Array.isArray(moduleNamespace.TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS)) {
    return moduleNamespace.TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS;
  }
  return [];
}

function receiptExclusions() {
  return Object.freeze([
    Object.freeze({
      id: "non-preschool-course-resources",
      scope: "TYMM’deki diğer derslere ve sınıf düzeylerine özgü program, kitap ve materyaller",
      reason: "Okul öncesi ders/yaş kimlikleriyle doğrudan eşleşmez.",
    }),
    Object.freeze({
      id: "empty-preschool-material-collections",
      scope: "Ayrı Farklılaştırma Etkinlik Kitapları ve Öğretim Materyalleri koleksiyonları",
      reason: "MEB uçları üç okul öncesi yaş bandı için kayıt döndürmemektedir.",
    }),
    Object.freeze({
      id: "superseded-upload-aliases",
      scope: "Eski /upload/program ve /upload/kitap takma yolları",
      reason: "Canlı erişim için katalogtaki kanonik /assets/pdf yolları denetlenir.",
    }),
    Object.freeze({
      id: "third-party-video-streams",
      scope: "Resmî video sayfalarında gömülü üçüncü taraf akış ve küçük resim uçları",
      reason: "Yetki alanı makbuzu yalnız tymm.meb.gov.tr üzerindeki resmî kayıt sayfalarını kapsar.",
    }),
    Object.freeze({
      id: "unverified-preschool-applicability",
      scope: "Çoktan Seçmeli Soru Yazım Kılavuzu, telafi programları ve okul öncesiyle eşleşmeyen taslak çerçeve planları",
      reason: "Okul öncesi programı veya üç yaş bandıyla uygulanırlık kanıtı yoktur.",
    }),
  ]);
}

async function buildReceipt(options) {
  const startedAt = new Date();
  const generalEducationVideos = resolveGeneralEducationVideos(officialLibraryModule);
  const sourceCollections = {
    libraryResources: officialLibraryModule.TYMM_OFFICIAL_LIBRARY,
    commonFrameworkPages: officialLibraryModule.TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
    preschoolVideos: officialLibraryModule.TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
    generalEducationVideos,
    resourceCatalog: TYMM_OFFICIAL_RESOURCE_CATALOG,
  };
  const references = flattenOfficialSources(sourceCollections);
  const endpoints = dedupeOfficialSourceReferences(references);
  const catalogErrors = validateEndpointContracts(endpoints);

  const [endpointResults, discovery] = await Promise.all([
    mapWithConcurrency(endpoints, options.concurrency, (endpoint) =>
      probeOfficialEndpoint(endpoint, {
        timeoutMs: options.timeoutMs,
        retries: options.retries,
      }),
    ),
    buildDiscovery(sourceCollections, options),
  ]);
  const catalogOnlyDirectOfficialPages = buildCatalogOnlyDirectOfficialPageEvidence(
    discovery,
    endpointResults,
  );
  const discoveryWithEvidence = Object.freeze({
    ...discovery,
    result:
      discovery.errors.length === 0 && catalogOnlyDirectOfficialPages.errors.length === 0
        ? "PASS"
        : "FAIL",
    catalogOnlyDirectOfficialPages,
  });
  const errors = [
    ...catalogErrors,
    ...endpointResults.flatMap((endpoint) => endpoint.errors),
    ...discoveryWithEvidence.errors,
    ...catalogOnlyDirectOfficialPages.errors,
  ];
  const finishedAt = new Date();
  const counts = countOfficialCollections({
    ...sourceCollections,
    sourceReferenceCount: references.length,
    uniqueCanonicalUrlCount: endpoints.length,
  });
  const inputFiles = await Promise.all([
    hashInput("src/features/curriculum/tymm-official-library.ts"),
    hashInput("src/features/curriculum/tymm-official-resource-catalog.ts"),
    hashInput("scripts/audit-tymm-official-library.mjs"),
  ]);
  const safeExecutionSpec = {
    methods: ["HEAD", "GET"],
    authorityHost: AUTHORITY_HOST,
    timeoutMs: options.timeoutMs,
    concurrency: options.concurrency,
    retries: options.retries,
    expectedUnavailableHttpStatus: EXPECTED_UNAVAILABLE_HTTP_STATUS,
  };

  return {
    schemaVersion: 2,
    receiptKind: "TYMM-official-library-source-verification",
    result: errors.length === 0 ? "PASS" : "FAIL",
    asOfUtc: finishedAt.toISOString(),
    civilDate: civilDateInIstanbul(finishedAt),
    timeZone: ISTANBUL_TIME_ZONE,
    startedAtUtc: startedAt.toISOString(),
    finishedAtUtc: finishedAt.toISOString(),
    authority: {
      name: AUTHORITY_NAME,
      canonicalHost: AUTHORITY_HOST,
      baseUrl: AUTHORITY_BASE_URL,
      transport: "HTTPS",
    },
    catalog: {
      catalogId: TYMM_OFFICIAL_RESOURCE_CATALOG.catalogId,
      catalogSchemaVersion: TYMM_OFFICIAL_RESOURCE_CATALOG.schemaVersion,
      librarySchemaVersion: officialLibraryModule.TYMM_OFFICIAL_LIBRARY_SCHEMA_VERSION,
      sourceCheckedOn: TYMM_OFFICIAL_RESOURCE_CATALOG.sourceCheckedOn,
      sourceReferenceSetSha256: jsonSha256(
        references.map((reference) => ({
          referenceId: reference.referenceId,
          url: reference.url,
          expectedKind: reference.expectedKind,
          expectedAvailability: reference.expectedAvailability,
          expectedByteSize: reference.expectedByteSize,
        })),
      ),
      canonicalEndpointSetSha256: jsonSha256(
        endpoints.map((endpoint) => ({
          canonicalUrl: endpoint.canonicalUrl,
          expectedKind: endpoint.expectedKind,
          expectedAvailability: endpoint.expectedAvailability,
          expectedByteSize: endpoint.expectedByteSize,
        })),
      ),
    },
    execution: {
      tool: "Node.js fetch",
      nodeVersion: process.version,
      requestMethods: ["HEAD", "GET"],
      safeSpecSha256: jsonSha256(safeExecutionSpec),
      policy: safeExecutionSpec,
    },
    inputs: inputFiles,
    counts,
    exclusions: receiptExclusions(),
    discovery: discoveryWithEvidence,
    endpoints: endpointResults,
    errors,
  };
}

export async function writeReceiptAtomically(
  requestedOutputPath,
  receipt,
  { overwrite = false } = {},
) {
  const outputPath = resolveAuditOutputPath(requestedOutputPath);
  const outputDirectory = await prepareOutputDirectory(outputPath);
  const temporaryPath = resolve(
    outputDirectory,
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const serializedReceipt = `${JSON.stringify(receipt, null, 2)}\n`;
  let temporaryHandle;
  let replacement = Object.freeze({ strategy: "exclusive-link", attempts: 1, retryCount: 0 });

  try {
    temporaryHandle = await open(temporaryPath, "wx", 0o600);
    await temporaryHandle.writeFile(serializedReceipt, { encoding: "utf8" });
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = undefined;

    if (overwrite) {
      const result = await renameReceiptWithBoundedWindowsRetry(temporaryPath, outputPath);
      replacement = Object.freeze({ strategy: "atomic-rename", ...result });
    } else {
      try {
        await link(temporaryPath, outputPath);
      } catch (error) {
        if (error?.code === "EEXIST") {
          throw new Error(
            `Makbuz zaten var; bilinçli yenileme için --overwrite kullanın: ${outputPath}`,
          );
        }
        throw error;
      }
      await rm(temporaryPath, { force: true });
    }
    return replacement;
  } finally {
    if (temporaryHandle) {
      await temporaryHandle.close().catch(() => undefined);
    }
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

/**
 * Windows reports a transient sharing violation as EPERM when an indexer,
 * antivirus scanner, or reader has the existing destination open without
 * FILE_SHARE_DELETE. Keep the old receipt intact and retry the same atomic
 * rename for a fixed 630 ms budget. A missing/non-file participant or the
 * final failed attempt is surfaced unchanged; deletion is never a fallback.
 */
export async function renameReceiptWithBoundedWindowsRetry(
  sourcePath,
  destinationPath,
  {
    platform = process.platform,
    renameImpl = rename,
    statImpl = stat,
    waitImpl = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)),
  } = {},
) {
  let attempts = 0;
  while (true) {
    attempts += 1;
    try {
      await renameImpl(sourcePath, destinationPath);
      return Object.freeze({ attempts, retryCount: attempts - 1 });
    } catch (error) {
      const delay = WINDOWS_ATOMIC_REPLACE_DELAYS_MS[attempts - 1];
      if (platform !== "win32" || error?.code !== "EPERM" || delay === undefined) throw error;
      const [source, destination] = await Promise.all([
        statImpl(sourcePath).catch(() => null),
        statImpl(destinationPath).catch(() => null),
      ]);
      if (!source?.isFile() || !destination?.isFile()) throw error;
      await waitImpl(delay);
    }
  }
}

export async function runAudit(
  options,
  {
    buildReceiptImpl = buildReceipt,
    writeReceiptImpl = writeReceiptAtomically,
  } = {},
) {
  const output = resolveAuditOutputPath(options.output);
  const normalizedOptions = { ...options, output };
  if ((await pathExists(output)) && !normalizedOptions.overwrite) {
    throw new Error(
      `Makbuz zaten var; bilinçli yenileme için --overwrite kullanın: ${output}`,
    );
  }

  const receipt = await buildReceiptImpl(normalizedOptions);
  await writeReceiptImpl(output, receipt, { overwrite: normalizedOptions.overwrite });
  return receipt;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    const receipt = await runAudit(options);
    console.log(
      JSON.stringify(
        {
          result: receipt.result,
          output: relative(APP_ROOT, options.output).replaceAll("\\", "/"),
          counts: receipt.counts,
          discovery: {
            result: receipt.discovery.result,
            counts: receipt.discovery.counts,
            responseBodySetSha256: receipt.discovery.responseBodySetSha256,
            discoveredUniverseSha256: receipt.discovery.discoveredUniverseSha256,
          },
          errors: receipt.errors.length,
        },
        null,
        2,
      ),
    );
    if (receipt.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMainModule) await main();
