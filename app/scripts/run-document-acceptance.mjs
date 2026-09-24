import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
process.chdir(appRoot);
const output = resolve(process.argv[2] ?? `output/document-acceptance-${new Date().toISOString().replace(/[:.]/gu, "-")}`);
const withinOutput = relative(resolve("output"), output);
if (!withinOutput || withinOutput.startsWith("..") || isAbsolute(withinOutput)) throw new Error("Kabul çıktısı app/output altında ayrı bir klasör olmalıdır.");
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error("Kabul çıktı klasörü boş olmalıdır; önceki kanıtlar korunur. Yeni bir klasör adı seçin.");
const receipt = { startedAtUtc: new Date().toISOString(), syntheticOnly: true, output, stages: [], passed: false };
async function sourceFingerprint() {
  const paths = ["package.json", "package-lock.json", "public/sw.js", "mobile-runtime.lock.json"];
  for (const entry of await readdir(appRoot, { withFileTypes: true })) {
    if (entry.isFile() && (entry.name.endsWith(".config.ts") || /^tsconfig.*\.json$/u.test(entry.name))) paths.push(entry.name);
  }
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  for (const directory of ["src", "scripts", "tests", "public/assets/fonts"]) await walk(directory);
  const files = {};
  for (const path of paths.sort()) files[path] = createHash("sha256").update(await readFile(path)).digest("hex");
  return files;
}
const sourcesBefore = await sourceFingerprint();
await writeFile(resolve(output, "source-fingerprints.json"), JSON.stringify(sourcesBefore, null, 2));
const env = { ...process.env, MAARIF_DOCUMENTS_OUTPUT_DIR: resolve(output, "browser"), CLASS_ROSTER_OUTPUT_DIR: resolve(output, "browser/class-roster-columns"), MOBILE_RUNTIME_TEST_PORT: process.env.MOBILE_RUNTIME_TEST_PORT ?? "4191" };
const featureFiles = ["document-export-quality", "semantic-tagged-pdf", "print-pdf-artifact", "pdf-print-text", "pdf-preview-text", "class-roster-spreadsheet", "growth-measurements", "premium-plan-export", "monthly-evaluation-export", "teacher-owned-monthly-evaluation-export", "anecdote-form"].map(name => `tests/features/${name}.test.mjs`);
const stages = [
  ["feature-contracts", process.execPath, ["--test", ...featureFiles]],
  ["pdf-generation", process.execPath, ["scripts/generate-document-pdf-acceptance.mjs", resolve(output, "pdf")]],
  ["browser-downloads", process.execPath, ["scripts/run-runtime-tests.mjs", "--budget-ms=900000", "tests/pdf-preview-ui.spec.ts", "tests/pdf-print-ui.spec.ts", "tests/pdf-export-boundary-ui.spec.ts", "tests/growth-measurements-ui.spec.ts", "tests/growth-pdf-qa.spec.ts", "tests/class-roster-export-ui.spec.ts", "tests/class-roster-columns-ui.spec.ts", "--workers=1", "--timeout=180000", `--output=${resolve(output, "browser-results")}`]],
  ["office-acceptance", process.execPath, ["scripts/document-acceptance/run-office-acceptance.mjs", resolve(output, "office")]],
  ["pdf-readback-render", process.env.MAARIF_DOCUMENTS_PYTHON ?? "python", ["scripts/inspect-document-pdfs.py", output]],
];
for (const [name, executable, args] of stages) {
  process.stdout.write(`Belge kabulü: ${name}\n`);
  const startedAtUtc = new Date().toISOString(), logPath = resolve(output, `${name}.log`);
  const log = createWriteStream(logPath);
  const child = spawn(executable, args, { cwd: appRoot, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const result = await new Promise(accept => {
    child.once("error", error => accept({ exitCode: null, error: error.message }));
    child.once("close", (exitCode, signal) => accept({ exitCode, signal }));
  });
  await new Promise(accept => log.end(accept));
  receipt.stages.push({ name, startedAtUtc, finishedAtUtc: new Date().toISOString(), executable, args, logPath, ...result });
  if (result.exitCode !== 0) {
    process.stderr.write((await readFile(logPath, "utf8")).split(/\r?\n/u).slice(-65).join("\n") + "\n");
    break;
  }
}
receipt.finishedAtUtc = new Date().toISOString();
receipt.sourceFilesUnchanged = JSON.stringify(sourcesBefore) === JSON.stringify(await sourceFingerprint());
receipt.passed = receipt.sourceFilesUnchanged && receipt.stages.length === stages.length && receipt.stages.every(stage => stage.exitCode === 0);
await writeFile(resolve(output, "acceptance.json"), JSON.stringify(receipt, null, 2));
process.stdout.write(`Belge kabulü ${receipt.passed ? "BAŞARILI" : "BAŞARISIZ"}: ${output}\n`);
process.exitCode = receipt.passed ? 0 : 1;
