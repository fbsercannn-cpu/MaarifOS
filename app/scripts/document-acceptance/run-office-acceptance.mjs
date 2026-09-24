import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Kullanım: node scripts/document-acceptance/run-office-acceptance.mjs <outputDirectory>");
const outputRelation = relative(resolve(appRoot, "output"), output);
if (!outputRelation || outputRelation.startsWith("..") || isAbsolute(outputRelation)) {
  throw new Error("Office kabul çıktısı app/output altında ayrı bir klasör olmalıdır.");
}
await mkdir(output, { recursive: true });

const receipt = {
  startedAtUtc: new Date().toISOString(),
  syntheticOnly: true,
  output,
  platform: process.platform,
  stages: [],
  capabilities: {
    packageReadback: "required",
    excelNativeReadAndFixedFormatRender: "required",
    wordNativePaginationAndPageRender: "required",
    wordFixedFormatPdf: "not-run; native page EMF/PNG used",
  },
  passed: false,
};

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/u, ""));
}

async function taskOwnedOfficePids(sinceMilliseconds) {
  const names = await readdir(output).catch(() => []);
  const values = [];
  for (const name of names.filter((candidate) => candidate.endsWith(".pid"))) {
    const path = resolve(output, name);
    const details = await stat(path).catch(() => null);
    if (!details || details.mtimeMs + 2_000 < sinceMilliseconds) continue;
    const value = Number.parseInt((await readFile(path, "utf8")).trim(), 10);
    if (Number.isSafeInteger(value) && value > 0) values.push(value);
  }
  return [...new Set(values)];
}

async function cleanupTaskOwnedOfficeProcesses(sinceMilliseconds) {
  if (process.platform !== "win32") return [];
  const pids = await taskOwnedOfficePids(sinceMilliseconds);
  if (pids.length === 0) return [];
  const literalPids = pids.join(",");
  const script = [
    `$ids = @(${literalPids})`,
    "$closed = @()",
    "foreach ($idValue in $ids) {",
    "  $p = Get-CimInstance Win32_Process -Filter \"ProcessId=$idValue\" -ErrorAction SilentlyContinue",
    "  if ($null -ne $p -and $p.Name -in @('WINWORD.EXE','EXCEL.EXE') -and $p.CommandLine -match '(?i)(/Automation|-Embedding)') {",
    "    Stop-Process -Id $idValue -Force -ErrorAction SilentlyContinue",
    "    $closed += [int]$idValue",
    "  }",
    "}",
    "$closed | ConvertTo-Json -Compress",
  ].join("; ");
  return new Promise((accept) => {
    const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
      cwd: appRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.once("close", () => {
      try { accept(JSON.parse(stdout.trim() || "[]")); } catch { accept([]); }
    });
    child.once("error", () => accept([]));
  });
}

async function runStage(name, executable, args, timeoutMs) {
  const startedAtUtc = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const logPath = resolve(output, `${name}.log`);
  const log = createWriteStream(logPath);
  const child = spawn(executable, args, {
    cwd: appRoot,
    env: { ...process.env, MAARIF_DOCUMENTS_OUTPUT_DIR: output },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const result = await new Promise((accept) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      accept(value);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ exitCode: null, signal: "TIMEOUT", timedOut: true });
    }, timeoutMs);
    child.once("error", (error) => finish({ exitCode: null, error: error.message }));
    child.once("close", (exitCode, signal) => finish({ exitCode, signal, timedOut: false }));
  });
  const cleanedOfficePids = result.timedOut
    ? await cleanupTaskOwnedOfficeProcesses(startedMilliseconds)
    : [];
  await new Promise((accept) => log.end(accept));
  const stage = {
    name,
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    executable,
    args,
    timeoutMs,
    logPath,
    cleanedOfficePids,
    ...result,
  };
  receipt.stages.push(stage);
  return stage;
}

function stagePassed(stage) {
  return stage.exitCode === 0 && !stage.timedOut && !stage.error;
}

async function validateWordReceipt(fileName, expected) {
  const receiptPath = resolve(output, `${fileName.replace(/\.docx$/u, "")}-word-pages.json`);
  const native = await readJson(receiptPath);
  if (native.readOnly !== true || !Number.isInteger(native.pages) || native.pages < expected.minimumPages) {
    throw new Error(`${fileName} native Word sayfa sayısı/read-only makbuzu geçersiz.`);
  }
  if (!Array.isArray(native.errors) || native.errors.length !== 0) {
    throw new Error(`${fileName} native Word renderer hata kaydetti.`);
  }
  if (!Array.isArray(native.renderedFiles) || native.renderedFiles.length !== native.pages) {
    throw new Error(`${fileName} bütün gerçek Word sayfalarını PNG olarak üretmedi.`);
  }
  for (let index = 0; index < native.renderedFiles.length; index += 1) {
    const rendered = native.renderedFiles[index];
    if (rendered.page !== index + 1 || rendered.bytes < 1_000 || (await stat(resolve(output, rendered.file))).size !== rendered.bytes) {
      throw new Error(`${fileName} Word PNG sıra/boyut kanıtı geçersiz: sayfa ${index + 1}.`);
    }
  }
  for (const sentinel of expected.sentinels) {
    if (!Number.isInteger(native.sentinelPages?.[sentinel]) || native.sentinelPages[sentinel] < 1 || native.sentinelPages[sentinel] > native.pages) {
      throw new Error(`${fileName} Word sentinel sayfası bulunamadı: ${sentinel}.`);
    }
  }
  if (expected.keepPair && native.sentinelPages[expected.keepPair[0]] !== native.sentinelPages[expected.keepPair[1]]) {
    throw new Error(`${fileName} keep-with-next başlık ve gövdeyi aynı Word sayfasında tutmadı.`);
  }
  if (expected.forcedAfter && native.sentinelPages[expected.forcedAfter[1]] <= native.sentinelPages[expected.forcedAfter[0]]) {
    throw new Error(`${fileName} zorunlu sayfa kırımı yeni bir Word sayfası başlatmadı.`);
  }
  if (!Array.isArray(native.paginationCounts) || native.paginationCounts.length < 2 ||
    native.paginationCounts.at(-1) !== native.pages || native.paginationCounts.at(-2) !== native.pages ||
    native.warmupPages !== native.pages) {
    throw new Error(`${fileName} Word sayfalaması/EMF önbelleği kararlı değil.`);
  }
  const numberOfPagesField = native.footerFields?.find(({ code }) => String(code).trim().toLocaleUpperCase("tr-TR") === "NUMPAGES");
  const pageField = native.footerFields?.find(({ code }) => String(code).trim().toLocaleUpperCase("tr-TR") === "PAGE");
  if (!pageField || Number(numberOfPagesField?.result) !== native.pages) {
    throw new Error(`${fileName} Word footer PAGE/NUMPAGES alan önbelleği güncel değil.`);
  }
  if (expected.requireNormalWeight) {
    for (const sample of native.fontSamples ?? []) {
      if (["paragraph-3", "sentinel-body", "first-list-item"].includes(sample.label) && sample.bold !== 0) {
        throw new Error(`${fileName} Word normal gövde/liste örneği beklenmedik kalın yazı taşıyor: ${sample.label}.`);
      }
    }
  }
  return native;
}

let failure;
try {
  const generation = await runStage(
    "package-generation-readback",
    process.execPath,
    ["scripts/document-acceptance/generate-office-fixtures.mjs", output],
    60_000,
  );
  if (!stagePassed(generation)) throw new Error("Office paket üretimi veya bağımsız paket okuması başarısız.");
  const packageReceipt = await readJson(resolve(output, "package-acceptance.json"));
  if (packageReceipt.passed !== true) throw new Error("Office paket kabul makbuzu başarısız.");
  const firstHashes = Object.fromEntries(packageReceipt.artifacts.map(({ name, sha256 }) => [name, sha256]));
  const regeneration = await runStage(
    "package-determinism-regeneration",
    process.execPath,
    ["scripts/document-acceptance/generate-office-fixtures.mjs", output],
    60_000,
  );
  if (!stagePassed(regeneration)) throw new Error("Office paketleri deterministik tekrar üretilemedi.");
  const regeneratedReceipt = await readJson(resolve(output, "package-acceptance.json"));
  const secondHashes = Object.fromEntries(regeneratedReceipt.artifacts.map(({ name, sha256 }) => [name, sha256]));
  if (JSON.stringify(firstHashes) !== JSON.stringify(secondHashes)) {
    throw new Error("Aynı kurgu girdisiyle Office artifact SHA-256 değerleri değişti.");
  }
  receipt.determinism = { passed: true, firstHashes, secondHashes };

  if (process.platform !== "win32") {
    throw new Error("Native Office kabulü yalnız Windows üzerindeki gerçek Word ve Excel ile çalışır; platform doğrulaması atlanmadı.");
  }
  const powershell = "powershell.exe";
  const excel = await runStage(
    "excel-native-read-render",
    powershell,
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "scripts/document-acceptance/inspect-excel-native.ps1", "-OutputDirectory", output],
    120_000,
  );
  if (!stagePassed(excel)) throw new Error("Excel native okuma veya sabit biçim render doğrulaması başarısız.");
  const excelPdfReadback = await runStage(
    "excel-native-pdf-readback",
    process.env.MAARIF_DOCUMENTS_PYTHON ?? "python",
    ["scripts/document-acceptance/inspect-office-native.py", output],
    60_000,
  );
  if (!stagePassed(excelPdfReadback)) throw new Error("Excel native PDF yeniden açma, geometri veya sayfa bağlamı doğrulaması başarısız.");

  for (const [name, file] of [["word-native-premium", "premium-layout.docx"], ["word-native-ek18", "ek18-long.docx"]]) {
    const word = await runStage(
      name,
      powershell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "scripts/document-acceptance/render-word-pages.ps1", "-InputPath", resolve(output, file), "-OutputDirectory", output],
      90_000,
    );
    if (!stagePassed(word)) throw new Error(`${file} native Word sayfalama veya sayfa render doğrulaması başarısız.`);
  }

  const nativeExcel = await readJson(resolve(output, "native-excel.json"));
  if (nativeExcel.passed !== true) throw new Error("Excel native makbuzu başarısız.");
  const compactLink = nativeExcel.observations?.compactDataEditPropagation;
  if (compactLink?.executed !== true || compactLink?.passed !== true ||
    !compactLink.checks || Object.values(compactLink.checks).some((value) => value !== true)) {
    throw new Error("Kompakt XLSX canlı veri bağlantısı gerçek Excel hesaplama/yazdırma kapısından geçmedi.");
  }
  const nativeExcelPdf = await readJson(resolve(output, "native-excel-pdf-readback.json"));
  if (nativeExcelPdf.passed !== true) throw new Error("Excel native PDF makbuzu başarısız.");
  const premiumWord = await validateWordReceipt("premium-layout.docx", {
    minimumPages: 5,
    sentinels: ["SENTINEL_KEEP_HEADING", "SENTINEL_KEEP_BODY", "SENTINEL_FORCE_HEADING", "WORD_LAYOUT_SON"],
    keepPair: ["SENTINEL_KEEP_HEADING", "SENTINEL_KEEP_BODY"],
    forcedAfter: ["SENTINEL_KEEP_HEADING", "SENTINEL_FORCE_HEADING"],
    requireNormalWeight: true,
  });
  const ek18Word = await validateWordReceipt("ek18-long.docx", {
    minimumPages: 7,
    sentinels: ["EK18_COCUK_SON", "EK18_PROGRAM_SON", "EK18_OGRETMEN_SON", "EK18_ONERI_SON"],
  });
  receipt.native = { excel: nativeExcel, excelPdfReadback: nativeExcelPdf, word: { premium: premiumWord, ek18: ek18Word } };
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

receipt.finishedAtUtc = new Date().toISOString();
receipt.failure = failure;
receipt.passed = !failure && receipt.stages.every(stagePassed);
await writeFile(resolve(output, "office-acceptance.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`Office kabulü ${receipt.passed ? "BAŞARILI" : "BAŞARISIZ"}: ${output}\n`);
if (failure) process.stderr.write(`${failure}\n`);
process.exitCode = receipt.passed ? 0 : 1;
