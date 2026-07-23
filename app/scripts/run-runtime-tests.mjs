#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const projectRoot = new URL("../", import.meta.url);
const port = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
const healthUrl = `http://127.0.0.1:${port}/tests/runtime-fixture.html`;

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Vite test sunucusu başlatılamadı.");
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Sunucu kısa süre içinde hazır olacak.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite test sunucusu zamanında hazır olmadı.");
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    waitForExit(child),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const server = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: projectRoot, stdio: "inherit" },
);

try {
  await waitForServer(server);
  const playwright = spawn(
    process.execPath,
    ["./node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      cwd: projectRoot,
      env: { ...process.env, MOBILE_RUNTIME_EXTERNAL_SERVER: "1", MOBILE_RUNTIME_TEST_PORT: String(port) },
      stdio: "inherit",
    },
  );
  const result = await waitForExit(playwright);
  process.exitCode = result.code ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Runtime testleri başlatılamadı.");
  process.exitCode = 1;
} finally {
  await stopServer(server);
}
