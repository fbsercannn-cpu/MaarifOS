import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function findGitBin() {
  const candidates = [
    "git",
    "C:\\Program Files\\Git\\cmd\\git.exe",
    "C:\\Program Files\\Git\\bin\\git.exe",
  ];
  for (const c of candidates) {
    try {
      if (c === "git" || existsSync(c)) return c;
    } catch {}
  }
  return "git";
}

// Hash source inputs, never secrets, local databases or output artifacts.
export function createBuildIdentity(root) {
  const gitBin = findGitBin();
  let files = "";
  let revision = "dev-065";
  try {
    files = execFileSync(gitBin, ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "src", "scripts", "public/sw.js", "public/manifest.webmanifest", "index.html", "vite.config.ts", "package.json", "package-lock.json"], { cwd: root, encoding: "utf8" });
    revision = execFileSync(gitBin, ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    files = "index.html\0package.json";
  }

  const hash = createHash("sha256");
  for (const file of [...new Set(files.split("\0").filter(Boolean))].sort()) {
    try {
      hash.update(file).update("\0").update(readFileSync(path.join(root, file))).update("\0");
    } catch {}
  }
  return {
    version: JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version,
    revision,
    sourceSha256: hash.digest("hex"),
    builtAt: new Date().toISOString(),
  };
}
