import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const definitionUrl = new URL("../.codex/agents/marif.toml", import.meta.url);
const source = await readFile(definitionUrl, "utf8");
const instructionMatch = source.match(
  /developer_instructions\s*=\s*"""([\s\S]*?)"""\s*$/,
);

test("MARİF ultra ajan yapılandırması yüklenebilir temel alanları korur", () => {
  assert.match(source, /^name\s*=\s*"marif"$/m);
  assert.match(source, /^model\s*=\s*"gpt-5\.6-sol"$/m);
  assert.match(source, /^model_reasoning_effort\s*=\s*"ultra"$/m);
  assert.ok(instructionMatch, "developer_instructions çok satırlı TOML alanı bulunmalı");
  assert.equal(
    source.match(/developer_instructions\s*=/g)?.length,
    1,
    "tek bir kanonik MARİF talimat bloğu bulunmalı",
  );
});

test("MARİF öğretmen-gölge eleştiri ve iyileştirme döngüsünü zorunlu tutar", () => {
  const instructions = instructionMatch?.[1] ?? "";
  const requiredContracts = [
    "Zorunlu öğretmen-gölge modu",
    "gerçek bir okul öncesi öğretmenin günlük çalışma aracı",
    "en az bir telefon görünümünde akışı baştan sona kullan",
    "Emine Öğretmen bir kullanılabilirlik merceğidir",
    "gerçek kullanıcı geri bildirimi simülasyonun her zaman önündedir",
    "aynı anlam ikinci kez soruluyor mu",
    '"Bir bilgi bir kez girilir"',
    "Zorunlu eleştiri → iyileştirme döngüsü",
    "Gözle:",
    "Eleştir:",
    "Karar ver:",
    "Uygula:",
    "Karşılaştır:",
    "Yeniden eleştir:",
    "Kanıtla:",
    "P0/P1 kapsam, bütünlük, pedagojik güven, gizlilik veya kullanım sorunu kaldıysa işi bitmiş sayma",
  ];

  for (const contract of requiredContracts) {
    assert.ok(
      instructions.includes(contract),
      `MARİF sözleşmesi eksik: ${contract}`,
    );
  }
});

test("MARİF son geri bildirime daralmadan bütün ürün hedefini korur", () => {
  const instructions = instructionMatch?.[1] ?? "";
  const requiredScopeContracts = [
    "Ferman sürekliliği ve kapsam hafızası",
    "docs/MARIF_REQUIREMENT_LEDGER.md",
    "Son mesajı, kullanıcı açıkça önceki kapsamı iptal etmedikçe",
    '"bütün hedef", "bu turdaki kanıt" ve "açık kalan işler"',
    "sınıf/eğitim yılı → yıllık/aylık/haftalık/günlük plan",
    "Bütünsel eleştiri mercekleri",
    "beş sınıftan biriyle etiketle",
    "`EKSİK`",
    "`KOPUK`",
    "`YANLIŞ`",
    "`RİSKLİ`",
    "`GEREKSİZ`",
    "Kapsam eksiği:",
    "Akış bütünlüğü:",
    "Pedagojik doğruluk:",
    "Belge kalitesi:",
    "Ürün dürüstlüğü:",
    "Sadeleştirme bu merceklerden yalnız biridir",
    "eksik olanı ekle, kopuk olanı bağla, yanlış olanı düzelt",
    "docs/MARIF_WORLD_BENCHMARK_2026.md",
  ];

  for (const contract of requiredScopeContracts) {
    assert.ok(
      instructions.includes(contract),
      `MARİF kapsam sözleşmesi eksik: ${contract}`,
    );
  }
});

test("MARİF resmî belge isteğini kaynak-veri-değerlendirme zinciri olarak ele alır", () => {
  const instructions = instructionMatch?.[1] ?? "";
  const requiredDocumentContracts = [
    'yalnız bir “PDF/DOCX indir” düğmesi olarak daraltma',
    "yetkili resmî şablonun gerçek görselini",
    "kanonik veri kaynağını",
    "değerlendirme/öğrenci dosyası/portfolyo/dönem raporu tüketicisini",
    "öğretmene ikinci kez yazdırma",
    "Ham gözlemi, öğretmen yorumunu ve program bağlantısını ayrı kayıtlar olarak koru",
    "sahte dolgu metniyle tamamlama",
    "PDF ve DOCX üretimini",
    "yedek/restore'u",
    "her sayfanın görsel QA'sını",
  ];

  for (const contract of requiredDocumentContracts) {
    assert.ok(
      instructions.includes(contract),
      `MARİF resmî belge sözleşmesi eksik: ${contract}`,
    );
  }
});

test("MARİF gerçek çocuk verisini ve kontrolsüz çalışma zamanı değişikliğini reddeder", () => {
  const instructions = instructionMatch?.[1] ?? "";
  const requiredBoundaries = [
    "uygulamanın çalışma zamanına gömülmez",
    "gerçek çocuk verisini haricî modele göndermez",
    "üretimde kendi kendine kod değiştirmez",
    "Kurgu test verisi kullan",
    "Açık yayın/commit/push yetkisi yoksa uzak sistemi değiştirme",
  ];

  for (const boundary of requiredBoundaries) {
    assert.ok(
      instructions.includes(boundary),
      `MARİF güvenlik sınırı eksik: ${boundary}`,
    );
  }
});
