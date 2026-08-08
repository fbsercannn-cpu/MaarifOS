import { sha256Hex } from "./crypto.mjs";
import { FOUNDER_CONTENT_RELEASE, PRIVATE_ASSET_PATHS } from "./release.mjs";

const MAX_PRIVATE_ASSET_BYTES = 1024 * 1024;

function exactObject(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_invalid`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expectedKeys].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label}_fields_invalid`);
  }
  return value;
}

async function fetchPrivateBytes(assetBinding, path) {
  if (!assetBinding || typeof assetBinding.fetch !== "function") {
    throw new Error("private_assets_binding_missing");
  }
  const response = await assetBinding.fetch(`https://private-assets.invalid${path}`);
  if (!response.ok) throw new Error("private_asset_missing");
  const declaredLength = response.headers.get("Content-Length");
  if (declaredLength !== null && Number(declaredLength) > MAX_PRIVATE_ASSET_BYTES) {
    throw new Error("private_asset_too_large");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PRIVATE_ASSET_BYTES) {
    throw new Error("private_asset_size_invalid");
  }
  return bytes;
}

function decodeJson(bytes, label) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}_utf8_invalid`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label}_json_invalid`);
  }
  return { text, parsed };
}

export async function loadPrivateContentBundle(env) {
  const [metadataBytes, manifestBytes, contentBytes] = await Promise.all([
    fetchPrivateBytes(env.PRIVATE_ASSETS, PRIVATE_ASSET_PATHS.metadata),
    fetchPrivateBytes(env.PRIVATE_ASSETS, PRIVATE_ASSET_PATHS.manifest),
    fetchPrivateBytes(env.PRIVATE_ASSETS, PRIVATE_ASSET_PATHS.content),
  ]);
  const { parsed: metadata } = decodeJson(metadataBytes, "bundle_metadata");
  exactObject(
    metadata,
    [
      "academicRelease",
      "contentByteLength",
      "contentFile",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "manifestDigest",
      "manifestFile",
      "schemaVersion",
      "sku",
    ],
    "bundle_metadata",
  );
  const expected = FOUNDER_CONTENT_RELEASE;
  if (
    metadata.schemaVersion !== expected.schemaVersion ||
    metadata.contentReleaseId !== expected.contentReleaseId ||
    metadata.contentPackId !== expected.contentPackId ||
    metadata.contentPackVersion !== expected.contentPackVersion ||
    metadata.manifestDigest !== expected.manifestDigest ||
    metadata.sku !== expected.sku ||
    metadata.academicRelease !== expected.academicRelease ||
    metadata.contentSha256 !== expected.contentRawSha256 ||
    metadata.contentByteLength !== expected.contentByteLength ||
    metadata.contentFile !== "content.v3.json" ||
    metadata.manifestFile !== "manifest.v3.json" ||
    !Number.isSafeInteger(metadata.contentByteLength) ||
    metadata.contentByteLength <= 0 ||
    typeof metadata.contentSha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(metadata.contentSha256)
  ) {
    throw new Error("bundle_metadata_identity_invalid");
  }
  const manifestDigest = `sha256:${await sha256Hex(manifestBytes)}`;
  if (manifestDigest !== metadata.manifestDigest) {
    throw new Error("bundle_manifest_digest_mismatch");
  }
  const contentSha256 = `sha256:${await sha256Hex(contentBytes)}`;
  if (
    contentSha256 !== metadata.contentSha256 ||
    contentBytes.byteLength !== metadata.contentByteLength ||
    contentSha256 !== expected.contentRawSha256 ||
    contentBytes.byteLength !== expected.contentByteLength
  ) {
    throw new Error("bundle_content_digest_mismatch");
  }
  const { text: contentJson, parsed: content } = decodeJson(
    contentBytes,
    "bundle_content",
  );
  const { parsed: manifest } = decodeJson(manifestBytes, "bundle_manifest");
  if (
    content.id !== expected.contentPackId ||
    content.version !== expected.contentPackVersion ||
    content.contentReleaseId !== expected.contentReleaseId ||
    content.manifestDigest !== expected.manifestDigest ||
    content.sku !== expected.sku ||
    content.academicRelease !== expected.academicRelease ||
    manifest.contentReleaseId !== expected.contentReleaseId ||
    manifest.contentFile !== "content.v3.json"
  ) {
    throw new Error("bundle_release_identity_mismatch");
  }
  return Object.freeze({
    schemaVersion: 1,
    contentReleaseId: expected.contentReleaseId,
    contentPackId: expected.contentPackId,
    contentPackVersion: expected.contentPackVersion,
    manifestDigest: expected.manifestDigest,
    sku: expected.sku,
    academicRelease: expected.academicRelease,
    contentSha256,
    contentByteLength: contentBytes.byteLength,
    contentJson,
  });
}
