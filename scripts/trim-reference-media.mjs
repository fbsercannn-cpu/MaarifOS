import { existsSync, lstatSync, readdirSync, realpathSync, unlinkSync } from "node:fs";
import path from "node:path";

// Source originals remain in public/ for provenance and recovery. The installed
// teacher application only needs the 69 KB searchable text for existing records.
export function trimReferenceMedia(clientRoot) {
  const root = realpathSync(clientRoot);
  const folder = path.join(root, "assets", "resources", "orientation-guide-2026-2027");
  if (!existsSync(folder)) return { removedFiles: 0, removedBytes: 0 };
  const resolved = realpathSync(folder);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative) || resolved !== folder) throw new Error("Reference media output path is outside the build directory.");
  let removedFiles = 0, removedBytes = 0;
  for (const name of readdirSync(folder)) {
    if (!/^(?:page-\d{2}\.webp|okula-uyum-rehberi-2026-2027\.pdf|offline-assets\.json)$/u.test(name)) continue;
    const target = path.join(folder, name), stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Reference media output must be a regular file.");
    unlinkSync(target); removedFiles++; removedBytes += stat.size;
  }
  return { removedFiles, removedBytes };
}
