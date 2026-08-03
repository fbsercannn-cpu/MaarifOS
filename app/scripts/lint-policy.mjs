import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const ignoredDirectories = new Set(["node_modules", "dist", "output", "test-results"]);
const policies = [
  {
    id: "TR-CASE",
    pattern: /\.toUpperCase\s*\(/g,
    message: "Türkçe metinde toLocaleUpperCase('tr-TR') kullanın.",
  },
  {
    id: "NO-PLACEHOLDER",
    pattern: /\b(?:TODO|FIXME)\b/g,
    message: "Üretim kodunda TODO/FIXME bırakmayın.",
  },
  {
    id: "NO-DYNAMIC-CODE",
    pattern: /\b(?:eval|Function)\s*\(/g,
    message: "Dinamik kod çalıştırma yasaktır.",
  },
  {
    id: "NO-RAW-HTML",
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/g,
    message: "Ham HTML enjeksiyonu kullanmayın.",
  },
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.flatMap((entry) => {
      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : [filesUnder(resolved)];
      }
      return extensions.has(path.extname(entry.name)) ? [[resolved]] : [];
    }),
  );
  return nested.flat();
}

const violations = [];
for (const root of roots) {
  for (const file of await filesUnder(root)) {
    const source = await readFile(file, "utf8");
    for (const policy of policies) {
      for (const match of source.matchAll(policy.pattern)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        violations.push(`${file}:${line} [${policy.id}] ${policy.message}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Policy lint passed (${policies.length} enforced rules).`);
}
