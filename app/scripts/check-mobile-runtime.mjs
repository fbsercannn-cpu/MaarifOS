#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashProtectedRuntimeFile,
  PROTECTED_RUNTIME_FILES,
} from "./runtime-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "mobile-runtime.lock.json");
const lockedFiles = JSON.parse(readFileSync(lockPath, "utf8"));
const failures = [];

if (typeof lockedFiles !== "object" || lockedFiles === null || Array.isArray(lockedFiles)) {
  console.error("Mobile runtime integrity check failed:\n\n- mobile-runtime.lock.json must be an object");
  process.exit(1);
}

const lockedPaths = Object.keys(lockedFiles);
const missingLockEntries = PROTECTED_RUNTIME_FILES.filter((relativePath) => !(relativePath in lockedFiles));
const unexpectedLockEntries = lockedPaths.filter((relativePath) => !PROTECTED_RUNTIME_FILES.includes(relativePath));

for (const relativePath of missingLockEntries) failures.push(`${relativePath} is missing from the lock`);
for (const relativePath of unexpectedLockEntries) failures.push(`${relativePath} is not a protected runtime file`);

for (const relativePath of PROTECTED_RUNTIME_FILES) {
  const expectedHash = lockedFiles[relativePath];
  const filePath = path.join(root, relativePath);

  if (typeof expectedHash !== "string" || !/^[0-9a-f]{64}$/.test(expectedHash)) {
    failures.push(`${relativePath} has an invalid lock hash`);
    continue;
  }

  if (!existsSync(filePath)) {
    failures.push(`${relativePath} is missing`);
    continue;
  }

  const actualHash = hashProtectedRuntimeFile(root, relativePath);
  if (actualHash !== expectedHash) {
    failures.push(`${relativePath} was modified`);
  }
}

if (failures.length > 0) {
  console.error("Mobile runtime integrity check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nRestore the protected runtime. Put app UI in src/Prototype.tsx and src/prototype.css.");
  process.exit(1);
}

console.log(`Mobile runtime integrity check passed (${PROTECTED_RUNTIME_FILES.length} protected files).`);
