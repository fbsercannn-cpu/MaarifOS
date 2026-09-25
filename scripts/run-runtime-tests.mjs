#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";
import { createServer } from "node:net";

const projectRoot = new URL("../", import.meta.url);
const port = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
const healthUrl = `http://127.0.0.1:${port}/tests/runtime-fixture.html`;
const rawArguments = process.argv.slice(2);
const budgetArgument = rawArguments.find((argument) =>
  argument.startsWith("--budget-ms="),
);
const budgetMs = budgetArgument
  ? Number(budgetArgument.slice("--budget-ms=".length))
  : 0;
const playwrightArguments = rawArguments.filter(
  (argument) => argument !== budgetArgument,
);
if (budgetArgument && (!Number.isFinite(budgetMs) || budgetMs <= 0)) {
  throw new Error("Runtime süre bütçesi pozitif milisaniye olmalıdır.");
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function waitForServer(child, ownsReadyServer) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error("Vite test sunucusu başlatılamadı.");
    try {
      if (ownsReadyServer()) {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
        if (response.ok && child.exitCode === null && child.signalCode === null) return;
      }
    } catch {
      // Sunucu kısa süre içinde hazır olacak.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite test sunucusu zamanında hazır olmadı.");
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await Promise.race([
    waitForExit(child),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}

// Never run a test against another task's listening server.
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", () => reject(new Error(`Test portu ${port} kullanımda; mevcut sunucuya bağlanılmadı.`)));
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
let startupOutput = "";
const server = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      MOBILE_RUNTIME_EXTERNAL_SERVER: "1",
      VITE_MAARIFOS_TEST_APP_ROOT: "1",
    },
    stdio: ["ignore", "pipe", "inherit"],
    windowsHide: true,
  },
);
server.stdout.on("data", (chunk) => { startupOutput += String(chunk); process.stdout.write(chunk); });

try {
  const startedAt = Date.now();
  await waitForServer(server, () => startupOutput.includes(`127.0.0.1:${port}/`));
  const playwright = spawn(
    process.execPath,
    ["./node_modules/@playwright/test/cli.js", "test", ...playwrightArguments],
    {
      cwd: projectRoot,
      env: { ...process.env, MOBILE_RUNTIME_EXTERNAL_SERVER: "1", MOBILE_RUNTIME_TEST_PORT: String(port) },
      stdio: "inherit",
    },
  );
  const result = await waitForExit(playwright);
  const elapsedMs = Date.now() - startedAt;
  if (result.code === 0 && budgetMs > 0 && elapsedMs > budgetMs) {
    console.error(
      `Runtime test dilimi ${elapsedMs} ms sürdü; bütçe ${budgetMs} ms.`,
    );
    process.exitCode = 1;
  } else {
    if (result.code === 0 && budgetMs > 0) {
      console.log(`Runtime süre bütçesi geçti: ${elapsedMs}/${budgetMs} ms.`);
    }
    process.exitCode = result.code ?? 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Runtime testleri başlatılamadı.");
  process.exitCode = 1;
} finally {
  await stopServer(server);
}
