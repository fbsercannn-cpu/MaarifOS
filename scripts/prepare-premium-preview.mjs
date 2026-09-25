import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PREMIUM_V3_PREVIEW_RELEASE_LOCK,
  parsePremiumContentPack,
} from "../src/features/premium-plans/content-repository.ts";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(appRoot, "..");
const releaseDirectory = path.join(
  projectRoot,
  "premium-content",
  "releases",
  "tymm-6072",
  "2026-09",
);
const v2SourcePath = path.join(releaseDirectory, "content.v2.json");
const v3SourcePath = path.join(releaseDirectory, "content.v3.json");
const manifestSourcePath = path.join(releaseDirectory, "manifest.v3.json");
const previewDirectory = path.join(appRoot, "premium-preview-cache");
const builtInDirectory = path.join(
  appRoot,
  "public",
  "assets",
  "maarif-content",
);
const v2TargetPath = path.join(previewDirectory, "tymm-6072-2026-09-v2.json");
const v3TargetPath = path.join(previewDirectory, "tymm-6072-2026-09-v3.json");
const manifestTargetPath = path.join(previewDirectory, "tymm-6072-2026-09-manifest-v3.json");
const builtInV2TargetPath = path.join(
  builtInDirectory,
  "tymm-6072-2026-09-v2.json",
);
const builtInV3TargetPath = path.join(
  builtInDirectory,
  "tymm-6072-2026-09-v3.json",
);
const builtInManifestTargetPath = path.join(
  builtInDirectory,
  "tymm-6072-2026-09-manifest-v3.json",
);

const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} doğrulaması başarısız.`);
  }
}

const [v2Bytes, v3Bytes, manifestBytes] = await Promise.all([
  readFile(v2SourcePath),
  readFile(v3SourcePath),
  readFile(manifestSourcePath),
]);
assertEqual(
  v3Bytes.byteLength,
  PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawByteLength,
  "V3 exact raw byte uzunluğu",
);
assertEqual(
  sha256(v3Bytes),
  PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawSha256,
  "V3 exact raw byte özeti",
);
assertEqual(
  sha256(manifestBytes),
  PREMIUM_V3_PREVIEW_RELEASE_LOCK.manifestRawSha256,
  "V3 manifest exact raw byte özeti",
);
assertEqual(
  sha256(v2Bytes),
  PREMIUM_V3_PREVIEW_RELEASE_LOCK.predecessorRawSha256,
  "V2 exact raw byte özeti",
);
const content = JSON.parse(v3Bytes.toString("utf8"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
assertEqual(manifest.schemaVersion, 1, "Manifest şema sürümü");
assertEqual(manifest.contentFile, "content.v3.json", "Manifest içerik dosyası");
assertEqual(manifest.digestAlgorithm, "sha256", "Manifest özet algoritması");
assertEqual(
  manifest.digestScope,
  "canonical_content_payload_without_manifestDigest",
  "Manifest özet kapsamı",
);
assertEqual(content.manifestDigest, sha256(manifestBytes), "Content → manifest bağı");
assertEqual(manifest.predecessor.rawFileSha256, sha256(v2Bytes), "V2 öncül byte kilidi");

const canonicalPayload = structuredClone(content);
delete canonicalPayload.manifestDigest;
const canonicalPayloadBytes = Buffer.from(
  JSON.stringify(canonicalize(canonicalPayload)),
  "utf8",
);
assertEqual(
  manifest.contentPayloadSha256,
  sha256(canonicalPayloadBytes),
  "Manifest → kanonik content payload bağı",
);
assertEqual(
  manifest.contentPayloadByteLength,
  canonicalPayloadBytes.byteLength,
  "Kanonik content payload uzunluğu",
);

const expectedSourceFiles = {
  constitution: "app/src/features/values/values-pedagogy-constitution.v1.json",
  officialActionCatalog: "app/src/features/values/official-preschool-value-actions.v1.json",
};
const builtInSourceCopies = [];
for (const [sourceKey, expectedRelativePath] of Object.entries(expectedSourceFiles)) {
  const source = manifest.valuesSourceChain?.[sourceKey];
  assertEqual(source?.file, expectedRelativePath, `${sourceKey} kaynak yolu`);
  const sourcePath = path.join(projectRoot, expectedRelativePath);
  const sourceBytes = await readFile(sourcePath);
  assertEqual(source.rawFileSha256, sha256(sourceBytes), `${sourceKey} kaynak byte özeti`);
  builtInSourceCopies.push({
    sourcePath,
    targetPath: path.join(builtInDirectory, path.basename(expectedRelativePath)),
  });
}

const parsedPack = parsePremiumContentPack(content);
assertEqual(
  parsedPack.valuesMappingStatus,
  "machine_validated_pending_human_review",
  "V3 değer sözleşmesi durumu",
);

await mkdir(previewDirectory, { recursive: true });
await mkdir(builtInDirectory, { recursive: true });
await Promise.all([
  copyFile(v2SourcePath, v2TargetPath),
  copyFile(v3SourcePath, v3TargetPath),
  copyFile(manifestSourcePath, manifestTargetPath),
  copyFile(v2SourcePath, builtInV2TargetPath),
  copyFile(v3SourcePath, builtInV3TargetPath),
  copyFile(manifestSourcePath, builtInManifestTargetPath),
  ...builtInSourceCopies.map(({ sourcePath, targetPath }) =>
    copyFile(sourcePath, targetPath),
  ),
]);
