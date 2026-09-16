import assert from "node:assert/strict";
import test from "node:test";

import {
  hasNonSeedEvidenceText,
  mergeEvidenceSeedParagraph,
} from "../../src/features/evidence/evidence-seed-merge.ts";

const seed =
  "Gözetimli çocuk katılımı sırasında “Görevleri paylaşalım” seçeneğine dokundu.";

test("seed boş taslağa bir kez eklenir ve tekrar birleştirme idempotent kalır", () => {
  const first = mergeEvidenceSeedParagraph("", seed);
  const second = mergeEvidenceSeedParagraph(first, seed);
  const third = mergeEvidenceSeedParagraph(second, seed);

  assert.equal(first, seed);
  assert.equal(second, seed);
  assert.equal(third, seed);
});

test("seed yoksa dolu öğretmen taslağı byte-exact korunur", () => {
  const teacherFirst = "Öğretmen ilk somut gözlemi yazdı.";
  const teacherSecond = "Ardından akranıyla konuşmasını not etti.";
  const existing = `  ${teacherFirst}\r\n\r\n${teacherSecond}  `;
  const merged = mergeEvidenceSeedParagraph(existing, seed);

  assert.equal(merged, existing);
});

test("aynı seed iki kez kalmışsa ilki korunur, tekrarları silinir ve öğretmen sırası değişmez", () => {
  const teacherFirst = "Öğretmen A paragrafı.";
  const teacherSecond = "Öğretmen B paragrafı.";
  const teacherThird = "Öğretmen C paragrafı.";
  const duplicated = [
    teacherFirst,
    seed,
    teacherSecond,
    seed,
    teacherThird,
  ].join("\n\n");

  assert.equal(
    mergeEvidenceSeedParagraph(duplicated, seed),
    [teacherFirst, seed, teacherSecond, teacherThird].join("\n\n"),
  );
});

test("CRLF ile kalmış aynı seed kopyaları da tek paragrafa indirilir", () => {
  const teacherText = "Öğretmenin mevcut bağlamı.";
  const duplicated = `${seed}\r\n\r\n${seed}\r\n\r\n${teacherText}`;

  assert.equal(
    mergeEvidenceSeedParagraph(duplicated, seed),
    `${seed}\n\n${teacherText}`,
  );
});

test("seed cümlesini içeren daha geniş öğretmen paragrafı seed sayılmaz", () => {
  const teacherText = `Öğretmen açıklaması: ${seed} Sonra çocuk arkadaşını çağırdı.`;
  const merged = mergeEvidenceSeedParagraph(teacherText, seed);

  assert.equal(merged, teacherText);
  assert.equal(hasNonSeedEvidenceText(teacherText, seed), true);
});

test("kalıcı gözlem metni yeni genel etkinlik seed'iyle yeniden açıldığında aynen kalır", () => {
  const persistedDraft = "Akranına sırayla kullanmayı önerdi.";
  const genericActivitySeed =
    "Bu etkinlik için düzenlenebilir gözlem taslağı açıldı. Öğretmen yalnız doğrudan gözlediği olayı yazıp doğrulamalıdır.";

  assert.equal(
    mergeEvidenceSeedParagraph(persistedDraft, genericActivitySeed),
    persistedDraft,
  );
});

test("context ve childQuote yalnız seed taşıyorsa öğretmen metni varmış gibi işaretlenmez", () => {
  assert.equal(hasNonSeedEvidenceText(seed, seed), false);
  assert.equal(hasNonSeedEvidenceText(`${seed}\n\n${seed}`, seed), false);
  assert.equal(hasNonSeedEvidenceText("  \n\n  ", seed), false);
  assert.equal(hasNonSeedEvidenceText(undefined, seed), false);
});

test("seed yanındaki context veya childQuote öğretmen metni doğru ayrılır", () => {
  const context = `${seed}\n\nÖğretmen bağlamı sınıf bahçesi olarak düzeltti.`;
  const childQuote = "Çocuk ‘önce ben taşıyayım’ dedi.";

  assert.equal(hasNonSeedEvidenceText(context, seed), true);
  assert.equal(hasNonSeedEvidenceText(childQuote, ""), true);
  assert.equal(hasNonSeedEvidenceText("", ""), false);
});

test("boş seed mevcut öğretmen metnini veya dış boşluklarını değiştirmez", () => {
  const existing = "  Öğretmen notu.  ";

  assert.equal(mergeEvidenceSeedParagraph(existing, ""), existing);
  assert.equal(mergeEvidenceSeedParagraph(existing, undefined), existing);
});
