import rawCatalog from "./official-preschool-value-actions.v1.json" with { type: "json" };

import {
  VALUE_CODES,
  VALUES_PEDAGOGY_CONSTITUTION,
} from "./values-constitution.ts";

export type OfficialPreschoolValueCode = (typeof VALUE_CODES)[number];
export type OfficialPreschoolIndicatorStatus = "verified" | "source_anomaly";

export interface OfficialPreschoolValueIndicator {
  readonly indicatorCode: string;
  readonly indicatorText: string;
  readonly sourcePage: number;
  readonly status: OfficialPreschoolIndicatorStatus;
  readonly sourceAnomaly?: string;
}

export interface OfficialPreschoolValueAction {
  readonly valueCode: OfficialPreschoolValueCode;
  readonly actionCode: string;
  readonly actionName: string;
  readonly sourcePage: number;
  readonly indicators: readonly OfficialPreschoolValueIndicator[];
}

export interface OfficialPreschoolCatalogTranscription {
  readonly method: string;
  readonly verifiedOn: string;
  readonly layoutNormalization: string;
  readonly statusPolicy: string;
  readonly indicatorCount: 219;
}

export interface OfficialPreschoolValueActionCatalog {
  readonly schemaVersion: 1;
  readonly catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  readonly sourceVersion: string;
  readonly sourceUrl: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly pageNumbering: "pdf-page-label-and-viewer-1-based";
  readonly sourcePageRange: readonly [324, 332];
  readonly transcription: OfficialPreschoolCatalogTranscription;
  readonly actions: readonly OfficialPreschoolValueAction[];
}

export interface OfficialPreschoolValueActionEntry {
  readonly valueCode: OfficialPreschoolValueCode;
  readonly actionCode: string;
  readonly actionName: string;
  readonly indicatorCode: string;
  readonly indicatorText: string;
  readonly catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  readonly sourceVersion: string;
  readonly sourceUrl: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly sourcePage: number;
  readonly status: OfficialPreschoolIndicatorStatus;
  readonly sourceAnomaly?: string;
}

export type VerifiedOfficialPreschoolValueActionEntry = Omit<
  OfficialPreschoolValueActionEntry,
  "status" | "sourceAnomaly"
> & { readonly status: "verified" };

export interface OfficialPreschoolValueActionSnapshot {
  readonly valueCode: OfficialPreschoolValueCode;
  readonly actionCode: string;
  readonly actionName: string;
  readonly indicatorCode: string;
  readonly indicatorText: string;
  readonly catalogId: string;
  readonly sourceVersion: string;
  readonly sourceUrl: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly sourcePage: number;
}

const CANONICAL_SOURCE = VALUES_PEDAGOGY_CONSTITUTION.canonicalSource.preschoolActionSource;
const VALUE_CODE_SET = new Set<string>(VALUE_CODES);
const SOURCE_ACTION_COUNT = 57;
const SOURCE_INDICATOR_COUNT = 219;
const EXPECTED_SOURCE_ANOMALY_CODES = Object.freeze([
  "D.3.3.3",
  "D3.4.2",
  "D4.1.3",
  "D.14.1.2",
  "D15.4.5",
  "D16.2.1",
  "D18.2.3",
] as const);
const EXPECTED_SOURCE_ANOMALY_CODE_SET = new Set<string>(EXPECTED_SOURCE_ANOMALY_CODES);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  item: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  required: readonly string[] = allowed,
): void {
  const unexpected = Object.keys(item).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} beklenmeyen alan içeriyor: ${unexpected.join(", ")}.`);
  }
  const missing = required.filter((key) => !(key in item));
  if (missing.length > 0) {
    throw new Error(`${label} zorunlu alanları eksik: ${missing.join(", ")}.`);
  }
}

function exactText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  if (value !== value.trim()) {
    throw new Error(`${label} başında veya sonunda görünmez boşluk taşıyamaz.`);
  }
  return value;
}

function exactInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${label} tam sayı olmalıdır.`);
  }
  return value;
}

function sourcePage(value: unknown, label: string): number {
  const page = exactInteger(value, label);
  if (page < CANONICAL_SOURCE.sourcePageRange[0] || page > CANONICAL_SOURCE.sourcePageRange[1]) {
    throw new Error(`${label} 324–332 PDF PageLabel aralığında olmalıdır.`);
  }
  return page;
}

function valueCode(value: unknown, label: string): OfficialPreschoolValueCode {
  if (typeof value !== "string" || !VALUE_CODE_SET.has(value)) {
    throw new Error(`${label} D1–D20 arasında tanımlı bir değer kodu olmalıdır.`);
  }
  return value as OfficialPreschoolValueCode;
}

function parseIndicator(
  value: unknown,
  actionCode: string,
  actionPage: number,
  index: number,
): OfficialPreschoolValueIndicator {
  const label = `${actionCode} göstergesi ${index + 1}`;
  const item = record(value, label);
  const status = item.status;
  if (status !== "verified" && status !== "source_anomaly") {
    throw new Error(`${label} durumu verified veya source_anomaly olmalıdır.`);
  }
  exactKeys(
    item,
    ["indicatorCode", "indicatorText", "sourcePage", "status", "sourceAnomaly"],
    label,
    status === "source_anomaly"
      ? ["indicatorCode", "indicatorText", "sourcePage", "status", "sourceAnomaly"]
      : ["indicatorCode", "indicatorText", "sourcePage", "status"],
  );
  if (status === "verified" && "sourceAnomaly" in item) {
    throw new Error(`${label} doğrulanmışken kaynak anomalisi notu taşıyamaz.`);
  }

  const indicatorCode = exactText(item.indicatorCode, `${label} kodu`);
  const codeMatch = indicatorCode.match(/^D\.?(\d+)\.(\d+)\.(\d+)$/);
  if (!codeMatch) {
    throw new Error(`${label} kodu PDF’deki Dn.n.n veya D.n.n.n dizgisinde olmalıdır.`);
  }
  const actionMatch = actionCode.match(/^D(\d+)\.(\d+)$/);
  if (
    !actionMatch ||
    codeMatch[1] !== actionMatch[1] ||
    codeMatch[2] !== actionMatch[2] ||
    Number(codeMatch[3]) !== index + 1
  ) {
    throw new Error(`${label} kodu üst eylemiyle aynı soyda ve sıralı olmalıdır.`);
  }

  const expectedAnomaly = EXPECTED_SOURCE_ANOMALY_CODE_SET.has(indicatorCode);
  if (expectedAnomaly !== (status === "source_anomaly")) {
    throw new Error(`${label} kaynak anomalisi statüsü kanonik Ek-14 transkripsiyonuyla eşleşmelidir.`);
  }
  if (status === "verified" && !/^D(?:[1-9]|1\d|20)\.\d+\.\d+$/.test(indicatorCode)) {
    throw new Error(`${label} kullanıma açık kodu kanonik Dn.n.n biçiminde olmalıdır.`);
  }

  const page = sourcePage(item.sourcePage, `${label} kaynak sayfası`);
  if (page !== actionPage) {
    throw new Error(`${label} kaynak sayfası üst eylemin kaynak sayfasıyla aynı olmalıdır.`);
  }
  return Object.freeze({
    indicatorCode,
    indicatorText: exactText(item.indicatorText, `${label} metni`),
    sourcePage: page,
    status,
    ...(status === "source_anomaly"
      ? { sourceAnomaly: exactText(item.sourceAnomaly, `${label} kaynak anomalisi`) }
      : {}),
  });
}

function parseAction(value: unknown, index: number): OfficialPreschoolValueAction {
  const label = `Resmî okul öncesi değer eylemi ${index + 1}`;
  const item = record(value, label);
  exactKeys(item, ["valueCode", "actionCode", "actionName", "sourcePage", "indicators"], label);
  const selectedValueCode = valueCode(item.valueCode, `${label} değer kodu`);
  const actionCode = exactText(item.actionCode, `${label} kodu`);
  if (!/^D(?:[1-9]|1\d|20)\.\d+$/.test(actionCode) || !actionCode.startsWith(`${selectedValueCode}.`)) {
    throw new Error(`${label} kodu değer koduna bağlı Dn.n biçiminde olmalıdır.`);
  }
  const page = sourcePage(item.sourcePage, `${label} kaynak sayfası`);
  if (!Array.isArray(item.indicators) || item.indicators.length === 0) {
    throw new Error(`${label} en az bir gösterge içermelidir.`);
  }
  return Object.freeze({
    valueCode: selectedValueCode,
    actionCode,
    actionName: exactText(item.actionName, `${label} adı`),
    sourcePage: page,
    indicators: Object.freeze(
      item.indicators.map((indicator, indicatorIndex) =>
        parseIndicator(indicator, actionCode, page, indicatorIndex),
      ),
    ),
  });
}

function assertSequentialActions(actions: readonly OfficialPreschoolValueAction[]): void {
  let actionIndex = 0;
  for (const selectedValueCode of VALUE_CODES) {
    const valueActions = actions.filter((action) => action.valueCode === selectedValueCode);
    if (valueActions.length === 0) {
      throw new Error(`${selectedValueCode} için Ek-14 üst eylemi bulunmalıdır.`);
    }
    for (let index = 0; index < valueActions.length; index += 1) {
      const action = valueActions[index];
      if (action !== actions[actionIndex] || action.actionCode !== `${selectedValueCode}.${index + 1}`) {
        throw new Error("Ek-14 üst eylemleri D1–D20 ve Dn.1…Dn.n kaynak sırasını korumalıdır.");
      }
      actionIndex += 1;
    }
  }
  if (actionIndex !== actions.length) {
    throw new Error("Ek-14 kataloğu D1–D20 dışında üst eylem içeremez.");
  }
}

export function parseOfficialPreschoolValueActionCatalog(
  value: unknown,
): OfficialPreschoolValueActionCatalog {
  const item = record(value, "Resmî okul öncesi değer eylemi kataloğu");
  exactKeys(item, [
    "schemaVersion",
    "catalogId",
    "sourceVersion",
    "sourceUrl",
    "sourceSha256",
    "pageNumbering",
    "sourcePageRange",
    "transcription",
    "actions",
  ], "Resmî okul öncesi değer eylemi kataloğu");
  if (item.schemaVersion !== 1) {
    throw new Error("Resmî okul öncesi değer eylemi katalog şema sürümü 1 olmalıdır.");
  }
  for (const field of ["catalogId", "sourceVersion", "sourceUrl", "sourceSha256", "pageNumbering"] as const) {
    if (item[field] !== CANONICAL_SOURCE[field]) {
      throw new Error(`Resmî okul öncesi değer eylemi kataloğunun ${field} alanı kanonik kaynakla eşleşmelidir.`);
    }
  }
  if (
    !Array.isArray(item.sourcePageRange) ||
    item.sourcePageRange.length !== 2 ||
    item.sourcePageRange[0] !== 324 ||
    item.sourcePageRange[1] !== 332
  ) {
    throw new Error("Resmî okul öncesi değer eylemi kaynak aralığı 324–332 PDF PageLabel olmalıdır.");
  }

  const transcriptionItem = record(item.transcription, "Ek-14 transkripsiyon kaydı");
  exactKeys(transcriptionItem, [
    "method",
    "verifiedOn",
    "layoutNormalization",
    "statusPolicy",
    "indicatorCount",
  ], "Ek-14 transkripsiyon kaydı");
  const verifiedOn = exactText(transcriptionItem.verifiedOn, "Ek-14 doğrulama tarihi");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn)) {
    throw new Error("Ek-14 doğrulama tarihi YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (transcriptionItem.indicatorCount !== SOURCE_INDICATOR_COUNT) {
    throw new Error(`Ek-14 transkripsiyon kaydı ${SOURCE_INDICATOR_COUNT} gösterge bildirmelidir.`);
  }
  const transcription = Object.freeze({
    method: exactText(transcriptionItem.method, "Ek-14 transkripsiyon yöntemi"),
    verifiedOn,
    layoutNormalization: exactText(
      transcriptionItem.layoutNormalization,
      "Ek-14 dizgi normalizasyonu",
    ),
    statusPolicy: exactText(transcriptionItem.statusPolicy, "Ek-14 anomali statüsü politikası"),
    indicatorCount: SOURCE_INDICATOR_COUNT,
  } as const);

  if (!Array.isArray(item.actions) || item.actions.length !== SOURCE_ACTION_COUNT) {
    throw new Error(`Ek-14 kataloğu ${SOURCE_ACTION_COUNT} üst eylem içermelidir.`);
  }
  const actions = Object.freeze(item.actions.map(parseAction));
  assertSequentialActions(actions);
  const indicatorCount = actions.reduce((total, action) => total + action.indicators.length, 0);
  if (indicatorCount !== SOURCE_INDICATOR_COUNT) {
    throw new Error(`Ek-14 kataloğu ${SOURCE_INDICATOR_COUNT} gösterge içermelidir.`);
  }
  const indicatorCodes = actions.flatMap((action) =>
    action.indicators.map((indicator) => indicator.indicatorCode),
  );
  if (new Set(indicatorCodes).size !== indicatorCodes.length) {
    throw new Error("Ek-14 gösterge kodları benzersiz olmalıdır.");
  }
  const actionCodes = actions.map((action) => action.actionCode);
  if (new Set(actionCodes).size !== actionCodes.length) {
    throw new Error("Ek-14 üst eylem kodları benzersiz olmalıdır.");
  }
  const anomalyCodes = actions.flatMap((action) =>
    action.indicators
      .filter((indicator) => indicator.status === "source_anomaly")
      .map((indicator) => indicator.indicatorCode),
  );
  if (
    anomalyCodes.length !== EXPECTED_SOURCE_ANOMALY_CODES.length ||
    EXPECTED_SOURCE_ANOMALY_CODES.some((code) => !anomalyCodes.includes(code))
  ) {
    throw new Error("Ek-14 kaynak anomalileri kanonik transkripsiyon listesiyle eşleşmelidir.");
  }

  return Object.freeze({
    schemaVersion: 1,
    catalogId: CANONICAL_SOURCE.catalogId,
    sourceVersion: CANONICAL_SOURCE.sourceVersion,
    sourceUrl: CANONICAL_SOURCE.sourceUrl,
    sourceSha256: CANONICAL_SOURCE.sourceSha256,
    pageNumbering: CANONICAL_SOURCE.pageNumbering,
    sourcePageRange: Object.freeze([324, 332] as const),
    transcription,
    actions,
  });
}

export const OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG =
  parseOfficialPreschoolValueActionCatalog(rawCatalog as unknown);

export const OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES = Object.freeze(
  OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.flatMap((action) =>
    action.indicators.map((indicator): OfficialPreschoolValueActionEntry => Object.freeze({
      valueCode: action.valueCode,
      actionCode: action.actionCode,
      actionName: action.actionName,
      indicatorCode: indicator.indicatorCode,
      indicatorText: indicator.indicatorText,
      catalogId: OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.catalogId,
      sourceVersion: OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceVersion,
      sourceUrl: OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceUrl,
      sourceSha256: OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceSha256,
      sourcePage: indicator.sourcePage,
      status: indicator.status,
      ...(indicator.status === "source_anomaly"
        ? { sourceAnomaly: indicator.sourceAnomaly }
        : {}),
    })),
  ),
);

export const OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE = Object.freeze(
  Object.fromEntries(
    OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES
      .filter(
        (entry): entry is VerifiedOfficialPreschoolValueActionEntry => entry.status === "verified",
      )
      .map((entry) => [entry.indicatorCode, entry]),
  ) as Readonly<Record<string, VerifiedOfficialPreschoolValueActionEntry>>,
);

export function assertOfficialPreschoolValueActionSnapshot(
  snapshot: OfficialPreschoolValueActionSnapshot,
): void {
  const officialEntry = OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE[snapshot.indicatorCode];
  if (!officialEntry) {
    throw new Error(
      "Resmî değer eylemi göstergesi doğrulanmış Ek-14 kataloğunda kullanıma açık olmalıdır.",
    );
  }
  const fields = [
    "valueCode",
    "actionCode",
    "actionName",
    "indicatorCode",
    "indicatorText",
    "catalogId",
    "sourceVersion",
    "sourceUrl",
    "sourceSha256",
    "sourcePage",
  ] as const;
  const mismatchedFields = fields.filter((field) => snapshot[field] !== officialEntry[field]);
  if (mismatchedFields.length > 0) {
    throw new Error(
      `Resmî değer eylemi snapshot'ı Ek-14 kataloğuyla tam eşleşmelidir: ${mismatchedFields.join(", ")}.`,
    );
  }
}
