import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as policy from "../../src/features/documents/document-use-policy.ts";

const simpleWorkspaceSource = readFileSync(
  new URL("../../src/features/simple-experience/SimpleDocumentWorkspaceScreen.tsx", import.meta.url),
  "utf8",
);

test("ders öncesi, basılı sınıf kullanımı ve ders sonrası kayıt ayrı görünür", () => {
  assert.deepEqual(policy.DOCUMENT_USE_PHASES.map((item) => item.id), ["before-class", "during-class", "after-class"]);
  assert.doesNotThrow(() => policy.assertClassroomPhoneOptional(policy.DOCUMENT_USE_PHASES));
  assert.match(policy.DOCUMENT_USE_PHASES[1].detail, /Telefon zorunlu değildir/u);
});

test("yetkili kanal sınırı otomatik gönderim iddiasını reddeder", () => {
  assert.match(policy.DOCUMENT_AUTHORIZED_CHANNEL_NOTICE, /kendiliğinden göndermez/u);
  assert.match(policy.DOCUMENT_AUTHORIZED_CHANNEL_NOTICE, /güncel yetkili kanal/u);
  assert.throws(() => policy.assertClassroomPhoneOptional([{ detail: "Telefonla kaydedin." }]), /zorunlu tutmamalıdır/u);
});

test("kullanım yardımı gerçek Belgeler rotasında isteğe bağlı ve erişilebilir görünür", () => {
  assert.match(simpleWorkspaceSource, /<details className="simple-document-use-policy">/u);
  assert.match(simpleWorkspaceSource, /DOCUMENT_USE_PHASES\.map/u);
  assert.match(simpleWorkspaceSource, /DOCUMENT_AUTHORIZED_CHANNEL_NOTICE/u);
  assert.match(simpleWorkspaceSource, /Ders öncesi hazırla, basılı kullan, ders sonrası kaydet/u);
});
