#!/usr/bin/env node
/**
 * Legacy entrypoint kept as a safety rail.
 *
 * Production is published through the Sites project recorded in
 * .openai/hosting.json. The previous implementation erased and force-synced a
 * separate GitHub Pages checkout, could publish an unrelated source state and
 * embedded stale release/domain claims.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hosting = JSON.parse(
  readFileSync(path.join(appDirectory, ".openai", "hosting.json"), "utf8"),
);

if (typeof hosting.project_id !== "string" || hosting.project_id.length === 0) {
  throw new Error("Sites proje kimliği .openai/hosting.json içinde bulunamadı.");
}

console.error(
  [
    "Güvensiz GitHub Pages senkronizasyonu devre dışı bırakıldı.",
    `Kanonik yayın hedefi: Sites projesi ${hosting.project_id}.`,
    "Önce npm run build:sites:founder ve tüm yayın kapıları çalıştırılmalı; ardından tam kaynak commit'i Sites kaynak deposuna itilip kaydedilmiş sürüm yayımlanmalıdır.",
  ].join("\n"),
);
process.exitCode = 1;
