import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const assetsDirectory = path.resolve("dist/client/assets");
const files = await readdir(assetsDirectory);
const javascript = files.filter((file) => file.endsWith(".js"));
if (javascript.length === 0) throw new Error("Build çıktısında JavaScript paketi bulunamadı.");

const gzipBudgetBytes = 180 * 1024;
const oversized = [];
for (const file of javascript) {
  const content = await readFile(path.join(assetsDirectory, file));
  const gzipBytes = gzipSync(content, { level: 9 }).byteLength;
  if (gzipBytes > gzipBudgetBytes) oversized.push({ file, gzipBytes });
}

const unusedLargeAssets = [];
for (const file of files) {
  const size = (await stat(path.join(assetsDirectory, file))).size;
  if (!file.endsWith(".js") && size > 1024 * 1024) unusedLargeAssets.push({ file, size });
}

if (oversized.length || unusedLargeAssets.length) {
  for (const item of oversized) {
    console.error(`${item.file}: gzip ${(item.gzipBytes / 1024).toFixed(1)} KiB; bütçe 180 KiB.`);
  }
  for (const item of unusedLargeAssets) {
    console.error(`${item.file}: ${(item.size / 1024 / 1024).toFixed(2)} MiB; varlık bütçesi 1 MiB.`);
  }
  process.exitCode = 1;
} else {
  console.log(`Bundle budget passed (${javascript.length} JavaScript chunk, gzip/chunk ≤180 KiB).`);
}
