import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalRuntimeBytes,
  PROTECTED_RUNTIME_FILE_DESCRIPTORS,
  PROTECTED_RUNTIME_FILES,
} from "../scripts/runtime-integrity.mjs";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("runtime metin kilidi Windows ve Unix satır sonlarını aynı kanonik içeriğe bağlar", () => {
  const relativePath = "src/release.ts";
  const lf = canonicalRuntimeBytes(relativePath, Buffer.from("ilk\nikinci\n", "utf8"));
  const crlf = canonicalRuntimeBytes(relativePath, Buffer.from("ilk\r\nikinci\r\n", "utf8"));

  assert.equal(digest(lf), digest(crlf));
  assert.notEqual(
    digest(lf),
    digest(canonicalRuntimeBytes(relativePath, Buffer.from("ilk\rikinci\r", "utf8"))),
  );
  assert.notEqual(
    digest(lf),
    digest(canonicalRuntimeBytes(relativePath, Buffer.from("ilk\ndegisti\n", "utf8"))),
  );
});

test("runtime ikili varlıkları byte byte korur", () => {
  const relativePath = "public/assets/iphone/Bezel.png";
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const changedBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a, 0x1a, 0x0a]);

  assert.strictEqual(canonicalRuntimeBytes(relativePath, bytes), bytes);
  assert.notEqual(digest(canonicalRuntimeBytes(relativePath, bytes)), digest(changedBytes));
});

test("runtime kilidi bilinmeyen yolları reddeder ve dosya türlerini açıkça sınıflandırır", () => {
  assert.throws(
    () => canonicalRuntimeBytes("src/Prototype.tsx", Buffer.from("test", "utf8")),
    /Unknown protected runtime file/,
  );
  assert.equal(new Set(PROTECTED_RUNTIME_FILES).size, PROTECTED_RUNTIME_FILES.length);
  assert.equal(
    PROTECTED_RUNTIME_FILE_DESCRIPTORS.find(({ path }) => path.endsWith("Bezel.png"))?.kind,
    "binary",
  );
  assert.equal(
    PROTECTED_RUNTIME_FILE_DESCRIPTORS.find(({ path }) => path.endsWith("navigation-bar.svg"))?.kind,
    "text",
  );
});
