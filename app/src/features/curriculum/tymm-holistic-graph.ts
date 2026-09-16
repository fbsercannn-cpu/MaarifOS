import rawGraph from "./tymm-holistic-graph.v1.json" with { type: "json" };

import {
  OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG,
} from "../values/official-preschool-value-actions.ts";
import { VALUES_PEDAGOGY_CONSTITUTION } from "../values/values-constitution.ts";
import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_DOMAINS,
  TYMM_2024_LEARNING_OUTCOMES,
  type Tymm2024AgeBand,
  type Tymm2024Domain,
} from "./tymm-2024-catalog.ts";

export const TYMM_HOLISTIC_GRAPH_SOURCE_SHA256 =
  "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09" as const;

export const TYMM_HOLISTIC_GRAPH_SOURCE_URL =
  "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf" as const;

export const TYMM_HOLISTIC_GRAPH_CONTENT_SHA256 =
  "sha256:3605c74ddc95970671cc54994d40702b6831ad46e92cfed4a9047597804d4d8a" as const;

export const TYMM_HOLISTIC_NODE_KINDS = Object.freeze([
  "field-skill",
  "integrated-skill",
  "learning-outcome",
  "supplementary-learning-outcome",
  "process-component",
  "social-emotional-skill",
  "social-emotional-indicator",
  "disposition-category",
  "disposition",
  "literacy",
  "literacy-skill",
  "conceptual-skill",
  "value",
  "value-action",
  "value-indicator",
] as const);

export type TymmHolisticNodeKind = (typeof TYMM_HOLISTIC_NODE_KINDS)[number];

export interface TymmHolisticGraphNode {
  readonly nodeId: string;
  readonly code: string;
  readonly title: string;
  readonly kind: TymmHolisticNodeKind;
  readonly domain: string;
  readonly ageBands: readonly Tymm2024AgeBand[];
  readonly parentCodes: readonly string[];
  readonly sourceUrl: typeof TYMM_HOLISTIC_GRAPH_SOURCE_URL;
  readonly sourcePage: number;
  readonly sourcePages: readonly number[];
  readonly sourceSha256: typeof TYMM_HOLISTIC_GRAPH_SOURCE_SHA256;
}

export interface TymmHolisticFieldMatrixRelation {
  readonly ageBand: Tymm2024AgeBand;
  readonly learningOutcomeCode: string;
  readonly relationKind:
    | "field-skill"
    | "integrated-skill"
    | "process-component";
  readonly relatedCode: string;
}

export interface TymmHolisticExternalCatalogReference {
  readonly catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  readonly module: "../values/official-preschool-value-actions.ts";
  readonly sourcePageRange: readonly [324, 332];
  readonly sourceSha256: typeof TYMM_HOLISTIC_GRAPH_SOURCE_SHA256;
  readonly sourceUrl: typeof TYMM_HOLISTIC_GRAPH_SOURCE_URL;
  readonly sourceVersion: "2024.09.02";
}

export interface TymmHolisticGraphStatistics {
  readonly baseNodeCount: number;
  readonly externalValueNodeCount: number;
  readonly resolvedNodeCount: number;
  readonly learningOutcomeCount: 210;
  readonly supplementaryLearningOutcomeCount: 6;
  readonly fieldMatrixRelationCount: number;
  readonly ageDomainCoverageCount: 21;
  readonly kindCounts: Readonly<Record<TymmHolisticNodeKind, number>>;
}

export interface TymmHolisticGraph {
  readonly schemaVersion: 1;
  readonly graphId: "meb-tymm-okul-oncesi-2024-holistic-graph";
  readonly graphVersion: "1.0.0";
  readonly sourceVersion: "2024.09.02";
  readonly sourceDocumentTitle: string;
  readonly sourceUrl: typeof TYMM_HOLISTIC_GRAPH_SOURCE_URL;
  readonly sourceSha256: typeof TYMM_HOLISTIC_GRAPH_SOURCE_SHA256;
  readonly sourcePageCount: 353;
  readonly pageNumbering: "pdf-page-label-and-viewer-1-based";
  readonly sourceSections: {
    readonly fieldMatrices: readonly [245, 299];
    readonly socialEmotionalLearning: readonly [318, 320];
    readonly erdemDegerEylem: readonly [324, 332];
    readonly dispositions: readonly [333, 333];
    readonly literacy: readonly [334, 337];
    readonly conceptualSkills: readonly [338, 342];
  };
  readonly reviewStatus: "pending-human-review";
  readonly humanReview: {
    readonly requiredIndependentPreschoolExpertApprovals: 2;
    readonly approvals: readonly [];
  };
  readonly catalogContentSha256: `sha256:${string}`;
  readonly externalCatalogs: readonly TymmHolisticExternalCatalogReference[];
  readonly statistics: TymmHolisticGraphStatistics;
  readonly nodes: readonly TymmHolisticGraphNode[];
  readonly nodeById: Readonly<Record<string, TymmHolisticGraphNode>>;
  readonly fieldMatrixRelations: readonly TymmHolisticFieldMatrixRelation[];
}

export interface TymmHolisticLearningOutcomeReference {
  readonly graphId: TymmHolisticGraph["graphId"];
  readonly graphVersion: TymmHolisticGraph["graphVersion"];
  readonly catalogContentSha256: TymmHolisticGraph["catalogContentSha256"];
  readonly reviewStatus: TymmHolisticGraph["reviewStatus"];
  readonly outcomeNodeId: string;
  readonly relatedNodeIds: readonly string[];
  readonly sourceSha256: typeof TYMM_HOLISTIC_GRAPH_SOURCE_SHA256;
}

type UnknownRecord = Record<string, unknown>;

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

const ALL_AGE_BANDS = new Set<string>(TYMM_2024_AGE_BANDS);
const NODE_KIND_SET = new Set<string>(TYMM_HOLISTIC_NODE_KINDS);
const SOURCE_PAGE_MINIMUM = 245;
const SOURCE_PAGE_MAXIMUM = 342;

const ALLOWED_PARENT_KINDS: Readonly<
  Record<TymmHolisticNodeKind, readonly TymmHolisticNodeKind[]>
> = Object.freeze({
  "field-skill": [],
  "integrated-skill": ["field-skill"],
  "learning-outcome": [
    "field-skill",
    "integrated-skill",
    "process-component",
    "conceptual-skill",
    "literacy",
    "literacy-skill",
  ],
  "supplementary-learning-outcome": [
    "field-skill",
    "integrated-skill",
    "process-component",
  ],
  "process-component": [
    "field-skill",
    "integrated-skill",
    "conceptual-skill",
    "social-emotional-skill",
    "literacy-skill",
  ],
  "social-emotional-skill": ["social-emotional-skill"],
  "social-emotional-indicator": ["process-component"],
  "disposition-category": [],
  disposition: ["disposition-category"],
  literacy: [],
  "literacy-skill": ["literacy"],
  "conceptual-skill": ["conceptual-skill"],
  value: [],
  "value-action": ["value"],
  "value-indicator": ["value-action"],
});

const SHA256_ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256HexSync(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const first = words[index - 15];
      const second = words[index - 2];
      const sigmaZero =
        rotateRight(first, 7) ^ rotateRight(first, 18) ^ (first >>> 3);
      const sigmaOne =
        rotateRight(second, 17) ^ rotateRight(second, 19) ^ (second >>> 10);
      words[index] =
        (words[index - 16] + sigmaZero + words[index - 7] + sigmaOne) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sumOne = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporaryOne =
        (h + sumOne + choice + SHA256_ROUND_CONSTANTS[index] + words[index]) >>> 0;
      const sumZero = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporaryTwo = (sumZero + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporaryOne) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporaryOne + temporaryTwo) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const item = value as UnknownRecord;
    return `{${Object.keys(item)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(item[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Kanonik TYMM grafiği undefined içeremez.");
  return serialized;
}

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, keys: readonly string[], label: string): void {
  const missing = keys.filter((key) => !(key in value));
  const unexpected = Object.keys(value).filter((key) => !keys.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} alan sözleşmesine uymuyor; eksik=${missing.join(",") || "yok"}, ` +
        `beklenmeyen=${unexpected.join(",") || "yok"}.`,
    );
  }
}

function exactText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new Error(`${label} kırpılmış ve boş olmayan metin olmalıdır.`);
  }
  return value;
}

function exactInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${label} tam sayı olmalıdır.`);
  }
  return value;
}

function exactTuple<const First extends number, const Second extends number>(
  value: unknown,
  expected: readonly [First, Second],
  label: string,
): readonly [First, Second] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value[0] !== expected[0] ||
    value[1] !== expected[1]
  ) {
    throw new Error(`${label} ${expected[0]}-${expected[1]} olmalıdır.`);
  }
  return Object.freeze([expected[0], expected[1]] as const);
}

function parseAgeBands(value: unknown, label: string): readonly Tymm2024AgeBand[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} en az bir yaş bandı taşımalıdır.`);
  }
  const bands = value.map((item, index) => {
    if (typeof item !== "string" || !ALL_AGE_BANDS.has(item)) {
      throw new Error(`${label}[${index}] geçerli TYMM yaş bandı olmalıdır.`);
    }
    return item as Tymm2024AgeBand;
  });
  if (new Set(bands).size !== bands.length) {
    throw new Error(`${label} mükerrer yaş bandı içeremez.`);
  }
  const expectedOrder = TYMM_2024_AGE_BANDS.filter((band) => bands.includes(band));
  if (bands.some((band, index) => band !== expectedOrder[index])) {
    throw new Error(`${label} TYMM yaş bandı sırasını korumalıdır.`);
  }
  return Object.freeze(bands);
}

function parseUniqueTexts(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${label} dizi olmalıdır.`);
  const items = value.map((item, index) => exactText(item, `${label}[${index}]`));
  if (new Set(items).size !== items.length) throw new Error(`${label} mükerrer öğe içeremez.`);
  return Object.freeze(items);
}

function parseNode(value: unknown, index: number): TymmHolisticGraphNode {
  const label = `TYMM bütüncül grafik düğümü ${index + 1}`;
  const item = record(value, label);
  exactKeys(
    item,
    [
      "nodeId",
      "code",
      "title",
      "kind",
      "domain",
      "ageBands",
      "parentCodes",
      "sourceUrl",
      "sourcePage",
      "sourcePages",
      "sourceSha256",
    ],
    label,
  );
  const nodeId = exactText(item.nodeId, `${label} kimliği`);
  if (!/^[a-z][a-z0-9-]*:[a-z0-9:.\u00e7\u011f\u0131\u00f6\u015f\u00fc-]+$/iu.test(nodeId)) {
    throw new Error(`${label} kimliği kanonik, boşluksuz düğüm biçiminde olmalıdır.`);
  }
  const kind = exactText(item.kind, `${label} türü`);
  if (!NODE_KIND_SET.has(kind) || kind === "value" || kind === "value-action" || kind === "value-indicator") {
    throw new Error(`${label} üretici veri katmanında geçerli bir temel düğüm türü olmalıdır.`);
  }
  const sourcePage = exactInteger(item.sourcePage, `${label} kaynak sayfası`);
  if (sourcePage < SOURCE_PAGE_MINIMUM || sourcePage > SOURCE_PAGE_MAXIMUM) {
    throw new Error(`${label} kaynak sayfası ${SOURCE_PAGE_MINIMUM}-${SOURCE_PAGE_MAXIMUM} arasında olmalıdır.`);
  }
  if (!Array.isArray(item.sourcePages) || item.sourcePages.length === 0) {
    throw new Error(`${label} kaynak sayfaları boş olamaz.`);
  }
  const sourcePages = item.sourcePages.map((page, pageIndex) => {
    const parsed = exactInteger(page, `${label} kaynak sayfaları[${pageIndex}]`);
    if (parsed < SOURCE_PAGE_MINIMUM || parsed > SOURCE_PAGE_MAXIMUM) {
      throw new Error(`${label} kaynak sayfası kanonik bölüm aralığı dışında.`);
    }
    return parsed;
  });
  if (
    sourcePages[0] !== sourcePage ||
    new Set(sourcePages).size !== sourcePages.length ||
    sourcePages.some((page, pageIndex) => pageIndex > 0 && page <= sourcePages[pageIndex - 1])
  ) {
    throw new Error(`${label} kaynak sayfaları tekil, artan ve sourcePage ile aynı başlangıçta olmalıdır.`);
  }
  if (item.sourceUrl !== TYMM_HOLISTIC_GRAPH_SOURCE_URL) {
    throw new Error(`${label} resmî TYMM PDF URL'sine bağlanmalıdır.`);
  }
  if (item.sourceSha256 !== TYMM_HOLISTIC_GRAPH_SOURCE_SHA256) {
    throw new Error(`${label} kanonik TYMM PDF SHA-256 özetini taşımalıdır.`);
  }
  return Object.freeze({
    nodeId,
    code: exactText(item.code, `${label} kodu`),
    title: exactText(item.title, `${label} başlığı`),
    kind: kind as TymmHolisticNodeKind,
    domain: exactText(item.domain, `${label} alanı`),
    ageBands: parseAgeBands(item.ageBands, `${label} yaş bantları`),
    parentCodes: parseUniqueTexts(item.parentCodes, `${label} üst kodları`),
    sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
    sourcePage,
    sourcePages: Object.freeze(sourcePages),
    sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
  });
}

function parseExternalCatalog(value: unknown): TymmHolisticExternalCatalogReference {
  const item = record(value, "TYMM bütüncül grafik dış kataloğu");
  exactKeys(
    item,
    ["catalogId", "module", "sourcePageRange", "sourceSha256", "sourceUrl", "sourceVersion"],
    "TYMM bütüncül grafik dış kataloğu",
  );
  if (
    item.catalogId !== OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.catalogId ||
    item.module !== "../values/official-preschool-value-actions.ts" ||
    item.sourceVersion !== OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceVersion ||
    item.sourceUrl !== OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceUrl ||
    item.sourceSha256 !== OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceSha256
  ) {
    throw new Error("TYMM grafiğinin EDE dış katalog kaydı doğrulanmış Ek-14 kataloğuyla eşleşmelidir.");
  }
  exactTuple(item.sourcePageRange, [324, 332], "EDE dış katalog kaynak aralığı");
  return Object.freeze({
    catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14",
    module: "../values/official-preschool-value-actions.ts",
    sourcePageRange: Object.freeze([324, 332] as const),
    sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
    sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
    sourceVersion: "2024.09.02",
  });
}

function parseRelation(value: unknown, index: number): TymmHolisticFieldMatrixRelation {
  const label = `TYMM alan matrisi ilişkisi ${index + 1}`;
  const item = record(value, label);
  exactKeys(item, ["ageBand", "learningOutcomeCode", "relationKind", "relatedCode"], label);
  if (typeof item.ageBand !== "string" || !ALL_AGE_BANDS.has(item.ageBand)) {
    throw new Error(`${label} geçerli yaş bandı taşımalıdır.`);
  }
  if (
    item.relationKind !== "field-skill" &&
    item.relationKind !== "integrated-skill" &&
    item.relationKind !== "process-component"
  ) {
    throw new Error(`${label} geçerli ilişki türü taşımalıdır.`);
  }
  return Object.freeze({
    ageBand: item.ageBand as Tymm2024AgeBand,
    learningOutcomeCode: exactText(item.learningOutcomeCode, `${label} öğrenme çıktısı kodu`),
    relationKind: item.relationKind,
    relatedCode: exactText(item.relatedCode, `${label} bağlı kodu`),
  });
}

function externalValueNodes(): readonly TymmHolisticGraphNode[] {
  const result: TymmHolisticGraphNode[] = [];
  const allAges = Object.freeze([...TYMM_2024_AGE_BANDS]);
  for (const definition of VALUES_PEDAGOGY_CONSTITUTION.values) {
    const actions = OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.filter(
      (action) => action.valueCode === definition.code,
    );
    if (actions.length === 0) throw new Error(`${definition.code} için resmî Ek-14 eylemi bulunamadı.`);
    const valuePages = [...new Set(actions.map((action) => action.sourcePage))].sort((a, b) => a - b);
    result.push(
      Object.freeze({
        nodeId: `value:${definition.code.toLocaleLowerCase("tr-TR")}`,
        code: definition.code,
        title: definition.officialName,
        kind: "value",
        domain: "Erdem-Değer-Eylem",
        ageBands: allAges,
        parentCodes: Object.freeze([]),
        sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
        sourcePage: valuePages[0],
        sourcePages: Object.freeze(valuePages),
        sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
      }),
    );
    for (const action of actions) {
      result.push(
        Object.freeze({
          nodeId: `value-action:${action.actionCode.toLocaleLowerCase("tr-TR")}`,
          code: action.actionCode,
          title: action.actionName,
          kind: "value-action",
          domain: "Erdem-Değer-Eylem",
          ageBands: allAges,
          parentCodes: Object.freeze([definition.code]),
          sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
          sourcePage: action.sourcePage,
          sourcePages: Object.freeze([action.sourcePage]),
          sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
        }),
      );
      for (const indicator of action.indicators) {
        result.push(
          Object.freeze({
            nodeId: `value-indicator:${indicator.indicatorCode.toLocaleLowerCase("tr-TR")}`,
            code: indicator.indicatorCode,
            title: indicator.indicatorText,
            kind: "value-indicator",
            domain: "Erdem-Değer-Eylem",
            ageBands: allAges,
            parentCodes: Object.freeze([action.actionCode]),
            sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
            sourcePage: indicator.sourcePage,
            sourcePages: Object.freeze([indicator.sourcePage]),
            sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
          }),
        );
      }
    }
  }
  return Object.freeze(result);
}

function overlappingAgeBands(first: TymmHolisticGraphNode, second: TymmHolisticGraphNode): boolean {
  return first.ageBands.some((ageBand) => second.ageBands.includes(ageBand));
}

function resolveParentNodes(
  node: TymmHolisticGraphNode,
  parentCode: string,
  nodesByCode: ReadonlyMap<string, readonly TymmHolisticGraphNode[]>,
): readonly TymmHolisticGraphNode[] {
  const allowedKinds = new Set<TymmHolisticNodeKind>(ALLOWED_PARENT_KINDS[node.kind]);
  const candidates = (nodesByCode.get(parentCode) ?? []).filter(
    (candidate) =>
      candidate.nodeId !== node.nodeId &&
      allowedKinds.has(candidate.kind) &&
      overlappingAgeBands(node, candidate),
  );
  const sameDomain = candidates.filter((candidate) => candidate.domain === node.domain);
  return sameDomain.length > 0 ? sameDomain : candidates;
}

function assertGraphIntegrity(nodes: readonly TymmHolisticGraphNode[]): void {
  const nodeIds = nodes.map((node) => node.nodeId);
  if (new Set(nodeIds).size !== nodeIds.length) {
    throw new Error("TYMM bütüncül grafik düğüm kimlikleri mükerrer olamaz.");
  }
  const semanticKeys = nodes.map(
    (node) => `${node.domain}\u0000${node.ageBands.join(",")}\u0000${node.kind}\u0000${node.code}`,
  );
  if (new Set(semanticKeys).size !== semanticKeys.length) {
    throw new Error("TYMM bütüncül grafik aynı kapsam, tür ve kodda mükerrer düğüm içeremez.");
  }
  const nodesByCode = new Map<string, TymmHolisticGraphNode[]>();
  for (const node of nodes) {
    const entries = nodesByCode.get(node.code) ?? [];
    entries.push(node);
    nodesByCode.set(node.code, entries);
  }

  const parentsByNodeId = new Map<string, string[]>();
  for (const node of nodes) {
    const parentNodeIds: string[] = [];
    for (const parentCode of node.parentCodes) {
      const parents = resolveParentNodes(node, parentCode, nodesByCode);
      if (parents.length === 0) {
        throw new Error(`${node.nodeId} üst kodu grafikte çözümlenemedi: ${parentCode}.`);
      }
      parentNodeIds.push(...parents.map((parent) => parent.nodeId));
    }
    parentsByNodeId.set(node.nodeId, [...new Set(parentNodeIds)]);
  }

  const states = new Map<string, "visiting" | "visited">();
  const visit = (nodeId: string, path: readonly string[]): void => {
    const state = states.get(nodeId);
    if (state === "visiting") {
      throw new Error(`TYMM bütüncül grafik döngü içeriyor: ${[...path, nodeId].join(" -> ")}.`);
    }
    if (state === "visited") return;
    states.set(nodeId, "visiting");
    for (const parentId of parentsByNodeId.get(nodeId) ?? []) visit(parentId, [...path, nodeId]);
    states.set(nodeId, "visited");
  };
  for (const nodeId of nodeIds) visit(nodeId, []);
}

/** Public deterministic integrity gate used by migration and regression tests. */
export function assertTymmHolisticGraphIntegrity(
  nodes: readonly TymmHolisticGraphNode[],
): void {
  assertGraphIntegrity(nodes);
}

function assertLearningOutcomeCoverage(nodes: readonly TymmHolisticGraphNode[]): void {
  const outcomes = nodes.filter((node) => node.kind === "learning-outcome");
  if (outcomes.length !== 210) {
    throw new Error(`TYMM bütüncül grafik 210 öğrenme çıktısı taşımalıdır; ${outcomes.length} bulundu.`);
  }
  const expected = new Map(
    TYMM_2024_LEARNING_OUTCOMES.map((outcome) => [
      `${outcome.ageBand}\u0000${outcome.domain}\u0000${outcome.code}`,
      outcome,
    ]),
  );
  for (const node of outcomes) {
    if (node.ageBands.length !== 1) {
      throw new Error(`${node.nodeId} öğrenme çıktısı tam bir yaş bandına ait olmalıdır.`);
    }
    const key = `${node.ageBands[0]}\u0000${node.domain}\u0000${node.code}`;
    const official = expected.get(key);
    if (!official || official.sourcePage !== node.sourcePage) {
      throw new Error(`${node.nodeId} yerleşik 210 çıktılık resmî katalogla eşleşmiyor.`);
    }
    expected.delete(key);
  }
  if (expected.size > 0) {
    throw new Error(`TYMM bütüncül grafikte ${expected.size} yerleşik öğrenme çıktısı eksik.`);
  }
  const coverage = new Set(outcomes.map((node) => `${node.ageBands[0]}\u0000${node.domain}`));
  for (const ageBand of TYMM_2024_AGE_BANDS) {
    for (const domain of TYMM_2024_DOMAINS) {
      if (!coverage.has(`${ageBand}\u0000${domain}`)) {
        throw new Error(`TYMM bütüncül grafik ${ageBand}/${domain} öğrenme çıktısı kapsamını taşımıyor.`);
      }
    }
  }
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => deepFreeze(item))) as DeepReadonly<T>;
  }
  if (value && typeof value === "object") {
    const clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepFreeze(item)]),
    );
    return Object.freeze(clone) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

/**
 * Strict, fail-closed parser.  It verifies the exact official source hash,
 * recomputes the generated graph content hash, rejects unknown fields, and
 * proves duplicate/orphan/cycle-free graph integrity before returning a deep-
 * frozen snapshot.  EDE nodes are composed from the existing verified Ek-14
 * catalog instead of duplicating that data in this graph JSON.
 */
export function parseTymmHolisticGraph(value: unknown): TymmHolisticGraph {
  const item = record(value, "TYMM bütüncül grafik");
  exactKeys(
    item,
    [
      "schemaVersion",
      "graphId",
      "graphVersion",
      "sourceVersion",
      "sourceDocumentTitle",
      "sourceUrl",
      "sourceSha256",
      "sourcePageCount",
      "pageNumbering",
      "sourceSections",
      "reviewStatus",
      "humanReview",
      "catalogContentSha256",
      "externalCatalogs",
      "statistics",
      "nodes",
      "fieldMatrixRelations",
    ],
    "TYMM bütüncül grafik",
  );
  if (
    item.schemaVersion !== 1 ||
    item.graphId !== "meb-tymm-okul-oncesi-2024-holistic-graph" ||
    item.graphVersion !== "1.0.0" ||
    item.sourceVersion !== "2024.09.02" ||
    item.sourceUrl !== TYMM_HOLISTIC_GRAPH_SOURCE_URL ||
    item.sourceSha256 !== TYMM_HOLISTIC_GRAPH_SOURCE_SHA256 ||
    item.sourcePageCount !== 353 ||
    item.pageNumbering !== "pdf-page-label-and-viewer-1-based"
  ) {
    throw new Error("TYMM bütüncül grafik sürüm ve kaynak kimliği kanonik PDF ile eşleşmelidir.");
  }
  if (
    TYMM_2024_CATALOG_METADATA.sourceSha256 !== TYMM_HOLISTIC_GRAPH_SOURCE_SHA256 ||
    TYMM_2024_CATALOG_METADATA.sourceVersion !== item.sourceVersion
  ) {
    throw new Error("TYMM bütüncül grafik yerleşik 210 çıktılık katalogla aynı kaynak sürümünde olmalıdır.");
  }
  const sections = record(item.sourceSections, "TYMM bütüncül grafik kaynak bölümleri");
  exactKeys(
    sections,
    [
      "fieldMatrices",
      "socialEmotionalLearning",
      "erdemDegerEylem",
      "dispositions",
      "literacy",
      "conceptualSkills",
    ],
    "TYMM bütüncül grafik kaynak bölümleri",
  );
  const sourceSections = Object.freeze({
    fieldMatrices: exactTuple(sections.fieldMatrices, [245, 299], "Alan matrisleri"),
    socialEmotionalLearning: exactTuple(
      sections.socialEmotionalLearning,
      [318, 320],
      "Sosyal-duygusal öğrenme bölümü",
    ),
    erdemDegerEylem: exactTuple(sections.erdemDegerEylem, [324, 332], "EDE bölümü"),
    dispositions: exactTuple(sections.dispositions, [333, 333], "Eğilimler bölümü"),
    literacy: exactTuple(sections.literacy, [334, 337], "Okuryazarlık bölümü"),
    conceptualSkills: exactTuple(sections.conceptualSkills, [338, 342], "Kavramsal beceriler bölümü"),
  });

  if (item.reviewStatus !== "pending-human-review") {
    throw new Error("TYMM bütüncül grafik iki bağımsız uzman onayına kadar pending-human-review kalmalıdır.");
  }
  const review = record(item.humanReview, "TYMM bütüncül grafik insan incelemesi");
  exactKeys(
    review,
    ["requiredIndependentPreschoolExpertApprovals", "approvals"],
    "TYMM bütüncül grafik insan incelemesi",
  );
  if (
    review.requiredIndependentPreschoolExpertApprovals !== 2 ||
    !Array.isArray(review.approvals) ||
    review.approvals.length !== 0
  ) {
    throw new Error("TYMM grafiği iki bağımsız okul öncesi uzman onayını beklemeli; onay uyduramaz.");
  }

  if (!Array.isArray(item.externalCatalogs) || item.externalCatalogs.length !== 1) {
    throw new Error("TYMM bütüncül grafik doğrulanmış tek bir Ek-14 dış kataloğu taşımalıdır.");
  }
  const externalCatalogs = Object.freeze(item.externalCatalogs.map(parseExternalCatalog));
  if (!Array.isArray(item.nodes)) throw new Error("TYMM bütüncül grafik düğümleri dizi olmalıdır.");
  const baseNodes = Object.freeze(item.nodes.map(parseNode));
  if (!Array.isArray(item.fieldMatrixRelations)) {
    throw new Error("TYMM bütüncül grafik alan matrisi ilişkileri dizi olmalıdır.");
  }
  const fieldMatrixRelations = Object.freeze(item.fieldMatrixRelations.map(parseRelation));
  const relationKeys = fieldMatrixRelations.map(
    (relation) =>
      `${relation.ageBand}\u0000${relation.learningOutcomeCode}\u0000${relation.relationKind}\u0000${relation.relatedCode}`,
  );
  if (new Set(relationKeys).size !== relationKeys.length) {
    throw new Error("TYMM alan matrisi ilişkileri mükerrer olamaz.");
  }

  const digestPayload = {
    externalCatalogs: item.externalCatalogs,
    nodes: item.nodes,
    relations: fieldMatrixRelations.map((relation) => [
      relation.ageBand,
      relation.learningOutcomeCode,
      relation.relationKind,
      relation.relatedCode,
    ]),
  };
  const computedContentSha256 = `sha256:${sha256HexSync(canonicalJson(digestPayload))}`;
  if (
    item.catalogContentSha256 !== computedContentSha256 ||
    item.catalogContentSha256 !== TYMM_HOLISTIC_GRAPH_CONTENT_SHA256
  ) {
    throw new Error("TYMM bütüncül grafik içerik SHA-256 özeti kanonik üretici çıktısıyla eşleşmiyor.");
  }

  const rawStatistics = record(item.statistics, "TYMM bütüncül grafik istatistikleri");
  exactKeys(
    rawStatistics,
    [
      "baseNodeCount",
      "learningOutcomeCount",
      "fieldMatrixRelationCount",
      "ageDomainCoverageCount",
      "kindCounts",
    ],
    "TYMM bütüncül grafik istatistikleri",
  );
  const baseKindCounts = Object.fromEntries(
    TYMM_HOLISTIC_NODE_KINDS.map((kind) => [
      kind,
      baseNodes.filter((node) => node.kind === kind).length,
    ]),
  ) as Record<TymmHolisticNodeKind, number>;
  const rawKindCounts = record(rawStatistics.kindCounts, "TYMM temel düğüm türü sayıları");
  if (
    rawStatistics.baseNodeCount !== baseNodes.length ||
    rawStatistics.learningOutcomeCount !== 210 ||
    rawStatistics.fieldMatrixRelationCount !== fieldMatrixRelations.length ||
    rawStatistics.ageDomainCoverageCount !== 21 ||
    Object.keys(rawKindCounts).length !== Object.values(baseKindCounts).filter((count) => count > 0).length ||
    Object.entries(rawKindCounts).some(([kind, count]) => baseKindCounts[kind as TymmHolisticNodeKind] !== count)
  ) {
    throw new Error("TYMM bütüncül grafik üretici istatistikleri gerçek içerikle eşleşmiyor.");
  }

  const valueNodes = externalValueNodes();
  const nodes = Object.freeze([...baseNodes, ...valueNodes]);
  assertLearningOutcomeCoverage(nodes);
  assertGraphIntegrity(nodes);
  const kindCounts = Object.freeze(
    Object.fromEntries(
      TYMM_HOLISTIC_NODE_KINDS.map((kind) => [
        kind,
        nodes.filter((node) => node.kind === kind).length,
      ]),
    ) as Record<TymmHolisticNodeKind, number>,
  );
  const nodeById = Object.freeze(
    Object.fromEntries(nodes.map((node) => [node.nodeId, node])) as Record<
      string,
      TymmHolisticGraphNode
    >,
  );
  const graph: TymmHolisticGraph = {
    schemaVersion: 1,
    graphId: "meb-tymm-okul-oncesi-2024-holistic-graph",
    graphVersion: "1.0.0",
    sourceVersion: "2024.09.02",
    sourceDocumentTitle: exactText(item.sourceDocumentTitle, "TYMM kaynak belge başlığı"),
    sourceUrl: TYMM_HOLISTIC_GRAPH_SOURCE_URL,
    sourceSha256: TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
    sourcePageCount: 353,
    pageNumbering: "pdf-page-label-and-viewer-1-based",
    sourceSections,
    reviewStatus: "pending-human-review",
    humanReview: Object.freeze({
      requiredIndependentPreschoolExpertApprovals: 2,
      approvals: Object.freeze([] as const),
    }),
    catalogContentSha256: computedContentSha256 as `sha256:${string}`,
    externalCatalogs,
    statistics: Object.freeze({
      baseNodeCount: baseNodes.length,
      externalValueNodeCount: valueNodes.length,
      resolvedNodeCount: nodes.length,
      learningOutcomeCount: 210,
      supplementaryLearningOutcomeCount: 6,
      fieldMatrixRelationCount: fieldMatrixRelations.length,
      ageDomainCoverageCount: 21,
      kindCounts,
    }),
    nodes,
    nodeById,
    fieldMatrixRelations,
  };
  return deepFreeze(graph) as TymmHolisticGraph;
}

export const TYMM_HOLISTIC_GRAPH = parseTymmHolisticGraph(rawGraph as unknown);

export function tymmHolisticLearningOutcomeBundle(
  ageBand: Tymm2024AgeBand,
  learningOutcomeCode: string,
): readonly TymmHolisticGraphNode[] {
  const outcome = TYMM_HOLISTIC_GRAPH.nodes.find(
    (node) =>
      node.kind === "learning-outcome" &&
      node.code === learningOutcomeCode &&
      node.ageBands.length === 1 &&
      node.ageBands[0] === ageBand,
  );
  if (!outcome) return Object.freeze([]);
  const relatedCodes = new Set(
    TYMM_HOLISTIC_GRAPH.fieldMatrixRelations
      .filter(
        (relation) =>
          relation.ageBand === ageBand &&
          relation.learningOutcomeCode === learningOutcomeCode,
      )
      .map((relation) => relation.relatedCode),
  );
  return Object.freeze([
    outcome,
    ...TYMM_HOLISTIC_GRAPH.nodes.filter(
      (node) =>
        relatedCodes.has(node.code) &&
        node.ageBands.includes(ageBand) &&
        (node.domain === outcome.domain ||
          node.domain === "Kavramsal Beceriler" ||
          node.domain === "Okuryazarlık Becerileri"),
    ),
  ]);
}

/**
 * Plan/observation/evaluation lineage can persist this compact immutable
 * reference instead of copying the full 1,439-node graph.  The graph and
 * catalog digests pin the exact vocabulary version; outcome/related node IDs
 * pin the selected evidence bundle.  Human-review status is deliberately
 * retained so downstream documents cannot present a pending graph as approved.
 */
export function createTymmHolisticLearningOutcomeReference(
  ageBand: Tymm2024AgeBand,
  learningOutcomeCode: string,
): TymmHolisticLearningOutcomeReference | null {
  const bundle = tymmHolisticLearningOutcomeBundle(ageBand, learningOutcomeCode);
  const outcome = bundle.find((node) => node.kind === "learning-outcome");
  if (!outcome) return null;
  const relatedNodeIds = Object.freeze(
    bundle
      .filter((node) => node.nodeId !== outcome.nodeId)
      .map((node) => node.nodeId)
      .sort(),
  );
  return Object.freeze({
    graphId: TYMM_HOLISTIC_GRAPH.graphId,
    graphVersion: TYMM_HOLISTIC_GRAPH.graphVersion,
    catalogContentSha256: TYMM_HOLISTIC_GRAPH.catalogContentSha256,
    reviewStatus: TYMM_HOLISTIC_GRAPH.reviewStatus,
    outcomeNodeId: outcome.nodeId,
    relatedNodeIds,
    sourceSha256: TYMM_HOLISTIC_GRAPH.sourceSha256,
  });
}
