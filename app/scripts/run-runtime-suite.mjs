import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const RUNTIME_SCRIPT_SEQUENCE = Object.freeze([
  "test:runtime:core:data",
  "test:runtime:core:shell",
  "test:runtime:flow-a:classroom",
  "test:runtime:flow-a:backup",
  "test:runtime:flow-a:concurrency",
  "test:runtime:flow-b:profile",
  "test:runtime:flow-b:archive",
  "test:runtime:flow-b:repeat",
  "test:runtime:flow-b:navigation",
  "test:runtime:ui:mobile",
  "test:runtime:ui:persistence:setup",
  "test:runtime:ui:persistence:writes",
  "test:runtime:ui:persistence:observation",
  "test:runtime:ui:persistence:lock",
  "test:runtime:ui:persistence:health",
  "test:runtime:ui:workflows:academic-year",
  "test:runtime:ui:workflows:attendance-membership",
  "test:runtime:ui:workflows:attendance-events",
  "test:runtime:ui:workflows:anecdote",
  "test:runtime:ui:workflows:day-closure",
  "test:runtime:ui:workflows:plan-creation-readiness",
  "test:runtime:ui:workflows:teacher-owned-create",
  "test:runtime:ui:workflows:teacher-owned-weekly",
  "test:runtime:ui:workflows:daily-flow",
  "test:runtime:ui:workflows:teacher-week",
  "test:runtime:ui:teacher:legacy",
  "test:runtime:ui:teacher:cycles",
  "test:runtime:ui:teacher:scheduled",
  "test:runtime:pwa-ui:shell",
  "test:runtime:pwa-ui:classroom",
  "test:runtime:pwa-ui:profile",
  "test:runtime:pwa-ui:portfolio",
]);

function validateScriptSequence(sequence) {
  const seen = new Set();
  for (const scriptName of sequence) {
    if (!/^test:runtime:[a-z0-9:-]+$/u.test(scriptName)) {
      throw new Error(`Geçersiz runtime test komutu: ${scriptName}`);
    }
    if (seen.has(scriptName)) {
      throw new Error(`Mükerrer runtime test komutu: ${scriptName}`);
    }
    seen.add(scriptName);
  }
}

export function runRuntimeSuite({
  sequence = RUNTIME_SCRIPT_SEQUENCE,
  npmCli = process.env.npm_execpath,
  nodeExecutable = process.execPath,
  cwd = process.cwd(),
  environment = process.env,
} = {}) {
  validateScriptSequence(sequence);
  if (!npmCli) {
    throw new Error("npm çalıştırıcı yolu çözülemedi.");
  }

  for (const [index, scriptName] of sequence.entries()) {
    process.stdout.write(
      `[runtime-suite] ${index + 1}/${sequence.length} ${scriptName}\n`,
    );
    const result = spawnSync(nodeExecutable, [npmCli, "run", scriptName], {
      cwd,
      env: { ...environment },
      stdio: "inherit",
      windowsHide: true,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      return result.status ?? 1;
    }
  }

  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = runRuntimeSuite();
}
