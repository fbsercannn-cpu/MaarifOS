import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { writeReceiptAtomically } from "./audit-tymm-official-library.mjs";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = resolve(APP_ROOT, "output");
const requestedOutput = process.argv[2] ?? "output/research-improve-2026-09-09/atomic-receipt";
const output = resolve(APP_ROOT, requestedOutput);
const relativeOutput = relative(OUTPUT_ROOT, output);
if (!relativeOutput || relativeOutput === ".." || relativeOutput.startsWith(`..${sep}`)) {
  throw new Error("Tanı çıktısı APP_ROOT/output altında ayrı bir dizin olmalıdır.");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function waitForExit(child) {
  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolveExit() : reject(new Error(`Kilit yardımcısı ${code ?? signal} ile kapandı.`)));
  });
}

async function acquireWindowsDeleteBlockingLock(path, holdMilliseconds) {
  const command = [
    "$ErrorActionPreference='Stop'",
    "$stream=[System.IO.File]::Open($env:MAARIF_LOCK_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read)",
    "[Console]::Out.WriteLine('LOCKED')",
    "[Console]::Out.Flush()",
    "Start-Sleep -Milliseconds ([int]$env:MAARIF_LOCK_MS)",
    "$stream.Dispose()",
  ].join(";");
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    env: { ...process.env, MAARIF_LOCK_PATH: path, MAARIF_LOCK_MS: String(holdMilliseconds) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((resolveLocked, reject) => {
    let stdout = "";
    const timer = setTimeout(() => reject(new Error(`Kilit yardımcısı hazır olmadı: ${stderr}`)), 5_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes("LOCKED")) {
        clearTimeout(timer);
        resolveLocked();
      }
    });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => {
      if (!stdout.includes("LOCKED")) {
        clearTimeout(timer);
        reject(new Error(`Kilit yardımcısı erken kapandı (${code}): ${stderr}`));
      }
    });
  });
  return { child, exited: waitForExit(child) };
}

if (process.platform !== "win32") {
  throw new Error("Bu tanı Windows paylaşım kilidi semantiğini doğrular ve yalnız Windows'ta çalışır.");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const directTarget = resolve(output, "direct-receipt.json");
const directSource = resolve(output, ".direct-receipt.tmp");
await writeFile(directTarget, '{"version":1}\n', "utf8");
await writeFile(directSource, '{"version":2}\n', "utf8");
const directLock = await acquireWindowsDeleteBlockingLock(directTarget, 450);
let directError;
try {
  await rename(directSource, directTarget);
} catch (error) {
  directError = error;
}
assert.equal(directError?.code, "EPERM");
assert.equal(await readFile(directTarget, "utf8"), '{"version":1}\n');
await directLock.exited;
await rm(directSource, { force: true });

const boundedTarget = resolve(output, "bounded-receipt.json");
await writeFile(boundedTarget, '{"version":1}\n', "utf8");
const boundedLock = await acquireWindowsDeleteBlockingLock(boundedTarget, 180);
const boundedStarted = performance.now();
const boundedResult = await writeReceiptAtomically(boundedTarget, { version: 2 }, { overwrite: true });
const boundedElapsedMilliseconds = Math.round(performance.now() - boundedStarted);
await boundedLock.exited;
assert.ok(boundedResult.retryCount > 0);
assert.deepEqual(JSON.parse(await readFile(boundedTarget, "utf8")), { version: 2 });

const persistentTarget = resolve(output, "persistent-receipt.json");
const persistentBytes = Buffer.from('{"version":1}\n', "utf8");
await writeFile(persistentTarget, persistentBytes);
const persistentLock = await acquireWindowsDeleteBlockingLock(persistentTarget, 1_500);
const persistentStarted = performance.now();
let persistentError;
try {
  await writeReceiptAtomically(persistentTarget, { version: 2 }, { overwrite: true });
} catch (error) {
  persistentError = error;
}
const persistentElapsedMilliseconds = Math.round(performance.now() - persistentStarted);
assert.equal(persistentError?.code, "EPERM");
assert.equal(sha256(await readFile(persistentTarget)), sha256(persistentBytes));
await persistentLock.exited;

const receipt = {
  schemaVersion: 1,
  platform: process.platform,
  directRename: { reproduced: true, code: directError.code, previousReceiptPreserved: true },
  boundedRecovery: { passed: true, ...boundedResult, elapsedMilliseconds: boundedElapsedMilliseconds },
  persistentLock: {
    surfaced: true,
    code: persistentError.code,
    previousReceiptPreserved: true,
    elapsedMilliseconds: persistentElapsedMilliseconds,
    boundedUnderMilliseconds: 1_000,
  },
};
assert.ok(receipt.persistentLock.elapsedMilliseconds < receipt.persistentLock.boundedUnderMilliseconds);
await writeFile(resolve(output, "diagnostic.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
