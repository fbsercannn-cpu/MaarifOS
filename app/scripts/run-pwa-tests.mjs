#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const projectRoot = new URL("../", import.meta.url);
const port = Number(process.env.PWA_PREVIEW_PORT ?? 4175);
const healthUrl = `http://127.0.0.1:${port}/`;

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Vite önizleme sunucusu başlatılamadı.");
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Üretim önizlemesi kısa süre içinde hazır olacak.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite önizleme sunucusu zamanında hazır olmadı.");
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
  [
    "./node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: projectRoot, stdio: "inherit" },
);

try {
  await waitForServer(server);
  const playwright = spawn(
    process.execPath,
    [
      "./node_modules/@playwright/test/cli.js",
      "test",
      "-c",
      "pwa.playwright.config.ts",
      ...process.argv.slice(2),
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        PWA_EXTERNAL_SERVER: "1",
        PWA_PREVIEW_PORT: String(port),
      },
      stdio: "inherit",
    },
  );
  const result = await waitForExit(playwright);
  process.exitCode = result.code ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "PWA testleri başlatılamadı.");
  process.exitCode = 1;
} finally {
  await stopServer(server);
}
