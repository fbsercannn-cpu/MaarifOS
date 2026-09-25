import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatTurkishDate, formatTurkishInstantDate } from "../../src/shared/turkish-date.ts";

test("tarihler kullanıcıya sabit gg/aa/yyyy biçiminde sunulur", () => {
  assert.equal(formatTurkishDate("2026-09-24"), "24/09/2026");
  assert.equal(formatTurkishInstantDate(new Date("2026-09-23T21:30:00.000Z")), "24/09/2026");
});

test("yeni kurulumlarda DeepSeek güvenli ağ geçidi varsayılandır", async () => {
  const [client, assistant, modal] = await Promise.all([
    readFile(new URL("../../src/services/secure-ai-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/MaarifAIAssistant.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/MaarifApiConfigModal.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(client, /return stored === "local" \? "local" : "deepseek"/u);
  assert.match(assistant, /localStorage\.getItem\(LS\.PROVIDER\)[\s\S]*?\|\| "deepseek"/u);
  assert.match(assistant, /localStorage\.getItem\(LS\.MODE\)[\s\S]*?\|\| "apikey"/u);
  assert.match(modal, /useState<SupportedAIProvider>\("deepseek"\)/u);
  assert.doesNotMatch(client, /apiKey\s*:/u);
});
