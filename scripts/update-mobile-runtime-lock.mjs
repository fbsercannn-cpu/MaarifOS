#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashProtectedRuntimeFile,
  PROTECTED_RUNTIME_FILES,
} from "./runtime-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "mobile-runtime.lock.json");

const hashes = {};
for (const relativePath of PROTECTED_RUNTIME_FILES) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) throw new Error(`Protected runtime file is missing: ${relativePath}`);
  hashes[relativePath] = hashProtectedRuntimeFile(root, relativePath);
}

writeFileSync(lockPath, `${JSON.stringify(hashes, null, 2)}\n`);
console.log(`Updated mobile-runtime.lock.json (${PROTECTED_RUNTIME_FILES.length} protected files).`);
