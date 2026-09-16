import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FOUNDER_CONTENT_RELEASE } from "../src/release.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(licenseApiRoot, "..");
const outputDirectory = resolve(licenseApiRoot, "private-assets");

const sourceFiles = Object.freeze({
  content: resolve(
    repositoryRoot,
    "premium-content",
    "releases",
    "tymm-6072",
    "2026-09",
    "content.v3.json",
  ),
  manifest: resolve(
    repositoryRoot,
    "premium-content",
    "releases",
    "tymm-6072",
    "2026-09",
    "manifest.v3.json",
  ),
  predecessor: resolve(
    repositoryRoot,
    "premium-content",
    "releases",
    "tymm-6072",
    "2026-09",
    "content.v2.json",
  ),
  valuesConstitution: resolve(
    repositoryRoot,
    "app",
    "src",
    "features",
    "values",
    "values-pedagogy-constitution.v1.json",
  ),
  officialValueActions: resolve(
    repositoryRoot,
    "app",
    "src",
    "features",
    "values",
    "official-preschool-value-actions.v1.json",
  ),
});

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function parseJson(bytes, label) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}: UTF-8 doğrulaması başarısız.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: JSON doğrulaması başarısız.`);
  }
}

function canonicalize(value) {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  const normalizedEntries = Object.entries(value).map(([key, nested]) => [
    key.normalize("NFC"),
    canonicalize(nested),
  ]);
  const normalizedKeys = normalizedEntries.map(([key]) => key);
  if (new Set(normalizedKeys).size !== normalizedKeys.length) {
    throw new Error("Kanonik anahtar normalizasyonu çakışma üretti.");
  }
  normalizedEntries.sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  return Object.fromEntries(normalizedEntries);
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: beklenen kaynak kilidiyle uyuşmuyor.`);
  }
}

const entries = await Promise.all(
  Object.entries(sourceFiles).map(async ([name, path]) => [name, await readFile(path)]),
);
const bytes = Object.fromEntries(entries);
const content = parseJson(bytes.content, "content.v3.json");
const manifest = parseJson(bytes.manifest, "manifest.v3.json");
const predecessor = parseJson(bytes.predecessor, "content.v2.json");
const valuesConstitution = parseJson(
  bytes.valuesConstitution,
  "values-pedagogy-constitution.v1.json",
);
const officialValueActions = parseJson(
  bytes.officialValueActions,
  "official-preschool-value-actions.v1.json",
);
const expected = FOUNDER_CONTENT_RELEASE;

requireEqual(content.id, expected.contentPackId, "Paket kimliği");
requireEqual(content.version, expected.contentPackVersion, "Paket sürümü");
requireEqual(content.contentReleaseId, expected.contentReleaseId, "İçerik sürümü");
requireEqual(content.manifestDigest, expected.manifestDigest, "Manifest bağı");
requireEqual(content.sku, expected.sku, "SKU");
requireEqual(content.academicRelease, expected.academicRelease, "Akademik sürüm");
requireEqual(bytes.content.byteLength, expected.contentByteLength, "Ham içerik boyutu");
requireEqual(digest(bytes.content), expected.contentRawSha256, "Ham içerik özeti");

requireEqual(manifest.contentReleaseId, expected.contentReleaseId, "Manifest sürümü");
requireEqual(manifest.contentFile, "content.v3.json", "Manifest içerik dosyası");
requireEqual(digest(bytes.manifest), expected.manifestDigest, "Ham manifest özeti");

const canonicalPayload = { ...content };
delete canonicalPayload.manifestDigest;
const canonicalPayloadBytes = new TextEncoder().encode(
  JSON.stringify(canonicalize(canonicalPayload)),
);
requireEqual(
  canonicalPayloadBytes.byteLength,
  manifest.contentPayloadByteLength,
  "Kanonik payload boyutu",
);
requireEqual(
  digest(canonicalPayloadBytes),
  manifest.contentPayloadSha256,
  "Kanonik payload özeti",
);

requireEqual(
  predecessor.contentReleaseId,
  manifest.predecessor.contentReleaseId,
  "Öncül içerik sürümü",
);
requireEqual(
  digest(bytes.predecessor),
  manifest.predecessor.rawFileSha256,
  "Öncül ham dosya özeti",
);
requireEqual(
  valuesConstitution.constitutionId,
  manifest.valuesSourceChain.constitution.constitutionId,
  "Değerler anayasası kimliği",
);
requireEqual(
  valuesConstitution.version,
  manifest.valuesSourceChain.constitution.version,
  "Değerler anayasası sürümü",
);
requireEqual(
  digest(bytes.valuesConstitution),
  manifest.valuesSourceChain.constitution.rawFileSha256,
  "Değerler anayasası ham özeti",
);
requireEqual(
  officialValueActions.catalogId,
  manifest.valuesSourceChain.officialActionCatalog.catalogId,
  "Resmî değer eylemleri katalog kimliği",
);
requireEqual(
  officialValueActions.sourceSha256,
  manifest.valuesSourceChain.officialActionCatalog.sourceSha256,
  "Resmî değer eylemleri kaynak özeti",
);
requireEqual(
  digest(bytes.officialValueActions),
  manifest.valuesSourceChain.officialActionCatalog.rawFileSha256,
  "Resmî değer eylemleri ham özeti",
);
requireEqual(
  content.valuesContract.constitutionId,
  valuesConstitution.constitutionId,
  "İçerik-anayasa bağı",
);
requireEqual(
  content.valuesContract.officialActionCatalogId,
  officialValueActions.catalogId,
  "İçerik-eylem kataloğu bağı",
);

await mkdir(outputDirectory, { recursive: true });
const stagedFiles = [
  ["content.v3.json", bytes.content],
  ["manifest.v3.json", bytes.manifest],
  ["content.v2.json", bytes.predecessor],
  ["values-pedagogy-constitution.v1.json", bytes.valuesConstitution],
  ["official-preschool-value-actions.v1.json", bytes.officialValueActions],
];
for (const [filename, payload] of stagedFiles) {
  await writeFile(resolve(outputDirectory, filename), payload, { flag: "w" });
}
const metadata = {
  schemaVersion: 1,
  contentReleaseId: expected.contentReleaseId,
  contentPackId: expected.contentPackId,
  contentPackVersion: expected.contentPackVersion,
  manifestDigest: expected.manifestDigest,
  sku: expected.sku,
  academicRelease: expected.academicRelease,
  contentSha256: expected.contentRawSha256,
  contentByteLength: expected.contentByteLength,
  contentFile: "content.v3.json",
  manifestFile: "manifest.v3.json",
};
await writeFile(
  resolve(outputDirectory, "bundle-meta.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
  { encoding: "utf8", flag: "w" },
);

process.stdout.write(
  `Private premium asset cache doğrulandı: ${expected.contentReleaseId} (${expected.contentByteLength} bayt).\n`,
);
