import assert from "node:assert/strict";
import test from "node:test";

import { VALUE_CODES } from "../../src/features/values/values-constitution.ts";
import { OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE } from "../../src/features/values/official-preschool-value-actions.ts";
import {
  evaluateMonthlyCodeSelectionCoverage,
  evaluateTermCodeSelectionCoverage,
  parseActivityValueMapping,
  parsePedagogicalRawObservationText,
} from "../../src/features/values/value-plan-models.ts";

const officialSourceUrl = "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf";

function officialSnapshot(indicatorCode) {
  const { status: _status, sourceAnomaly: _sourceAnomaly, ...snapshot } =
    OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE[indicatorCode];
  return snapshot;
}

function validMapping(overrides = {}) {
  return {
    designDirection: "value_led",
    primaryValueCode: "D4",
    roofValueCode: "D14",
    roofValueChecks: {
      respect: "Çocuğun katılma ve ara verme tercihi korunur.",
      responsibility: "Çocuk seçtiği küçük katkıyı güvenli biçimde tamamlar.",
      justice: "Oyun alanı farklı katılım ihtiyaçlarına göre erişilebilir düzenlenir.",
    },
    supportingValueCodes: ["D15"],
    officialActionSnapshots: [{
      valueCode: "D4",
      actionCode: "D4.1",
      actionName: "Arkadaşlarına destek olmak",
      indicatorCode: "D4.1.1",
      indicatorText: "İyi ve kötü zamanlarında arkadaşlarına destek olur.",
      catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14",
      sourceVersion: "2024.09.02",
      sourceUrl: officialSourceUrl,
      sourceSha256: "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
      sourcePage: 325,
    }],
    culturalBridgeIds: ["aile-sila-i-rahim-komsuluk"],
    rationale: "Dostluk, karşılıklı saygı içinde yaşanan somut bir ilişki bağlamında ele alınır.",
    livedContextOrDilemma: "Oyuna katılmak isteyen bir arkadaş için birlikte yer açma yolları araştırılır.",
    adultModelActions: ["Öğretmen farklı katılım yollarını sakin bir dille model olur."],
    childAgencyOptions: ["Çocuk sözle, işaretle veya bir nesne seçerek katılım yolunu belirtir."],
    repairOrContributionOptions: ["Dışarıda kalan arkadaş için oyun alanında erişilebilir bir yer hazırlanır."],
    familyCommunityTransfer: "Aile, evde birlikte yapılan bir işi çocuğun seçtiği yolla paylaşabilir.",
    observationPrompts: ["Çocuk katılım için kendisinin veya arkadaşının seçtiği yolu nasıl görünür kıldı?"],
    counterEvidencePrompt: "Aynı eylemin görülmediği veya daha fazla yetişkin desteği gerektiren bağlam neydi?",
    reflectionPrompt: "Ortam ve yetişkin dili karşılıklı saygıyı nasıl kolaylaştırdı?",
    nextPlanDecisionRule: "Katılım yolları dar kaldıysa sonraki planda en az bir yeni ifade yolu eklenir.",
    ...overrides,
  };
}

test("etkinlik değer modeli bir ana, bir çatı ve en fazla iki destek değerini kabul eder", () => {
  const parsed = parseActivityValueMapping(validMapping({
    supportingValueCodes: ["D15", "D20"],
  }));

  assert.equal(parsed.primaryValueCode, "D4");
  assert.equal(parsed.roofValueCode, "D14");
  assert.deepEqual(parsed.supportingValueCodes, ["D15", "D20"]);
  assert.ok(Object.isFrozen(parsed));
});

test("çatı ankrajının resmî eylemi ile gerekçeli D5→D1 ve D6→D14 bağları kabul edilir", () => {
  const withRoofAction = parseActivityValueMapping(validMapping({
    officialActionSnapshots: [
      officialSnapshot("D4.1.1"),
      officialSnapshot("D14.1.1"),
    ],
  }));
  assert.deepEqual(
    withRoofAction.officialActionSnapshots.map((snapshot) => snapshot.valueCode),
    ["D4", "D14"],
  );

  assert.equal(parseActivityValueMapping(validMapping({
    primaryValueCode: "D5",
    roofValueCode: "D1",
    supportingValueCodes: [],
    officialActionSnapshots: [officialSnapshot("D5.1.3")],
  })).roofValueCode, "D1");
  assert.equal(parseActivityValueMapping(validMapping({
    primaryValueCode: "D6",
    roofValueCode: "D14",
    supportingValueCodes: [],
    officialActionSnapshots: [officialSnapshot("D6.2.1")],
  })).roofValueCode, "D14");
});

test("fazla, yinelenen veya çatıyla çelişen değerler reddedilir", () => {
  assert.throws(
    () => parseActivityValueMapping(validMapping({ supportingValueCodes: ["D15", "D20", "D6"] })),
    /en fazla iki/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ supportingValueCodes: ["D4"] })),
    /benzersiz/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ primaryValueCode: "D1", roofValueCode: "D14" })),
    /aynı kod/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ primaryValueCode: "D3", roofValueCode: "D1" })),
    /kanonik çatı bağlantılarından/i,
  );
});

test("resmî eylem seçili değere, kanonik kaynağa ve Ek-14 exact katalog kaydına bağlanır", () => {
  assert.throws(
    () => parseActivityValueMapping(validMapping({
      officialActionSnapshots: Array.from(
        { length: 4 },
        () => structuredClone(validMapping().officialActionSnapshots[0]),
      ),
    })),
    /bir ila üç/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({
      officialActionSnapshots: [{
        ...validMapping().officialActionSnapshots[0],
        valueCode: "D6",
        actionCode: "D6.1",
        indicatorCode: "D6.1.1",
      }],
    })),
    /seçili değerlerden/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({
      officialActionSnapshots: [{ ...validMapping().officialActionSnapshots[0], sourcePage: 0 }],
    })),
    /kaynak sayfası/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({
      officialActionSnapshots: [{
        ...validMapping().officialActionSnapshots[0],
        sourceUrl: "https://example.invalid/sahte.pdf",
      }],
    })),
    /kanonik TYMM/i,
  );
  for (const mutation of [
    { actionName: "Uydurma eylem" },
    { indicatorText: "Uydurma gösterge metni." },
    { sourcePage: 326 },
    { indicatorCode: "D4.1.99" },
  ]) {
    assert.throws(
      () => parseActivityValueMapping(validMapping({
        officialActionSnapshots: [{ ...validMapping().officialActionSnapshots[0], ...mutation }],
      })),
      /Ek-14 kataloğ/i,
    );
  }
  assert.throws(
    () => parseActivityValueMapping({ ...validMapping(), unapprovedField: true }),
    /beklenmeyen alan/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ culturalBridgeIds: ["uydurma-kopru"] })),
    /kanonik değer anayasasında/i,
  );
});

test("çocuk kişiliğini veya inancını damgalayan otomatik dil reddedilir", () => {
  assert.throws(
    () => parseActivityValueMapping(validMapping({ rationale: "Uslu çocuk yetiştirme amacı taşır." })),
    /etiketleyen dil/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ reflectionPrompt: "Kim saygısız davrandı?" })),
    /etiketleyen dil/i,
  );
  assert.throws(
    () => parseActivityValueMapping(validMapping({ rationale: "a".repeat(4001) })),
    /en fazla 4000 karakter/i,
  );
  for (const unsafeText of [
    "Dua etmeyen çocuğun katılım puanı düşürülür.",
    "Aile mezhebini kaydet.",
    "Çocuk istemediği ibadete zorlanır.",
    "Bu çocuk bencil ve sorumsuzdur.",
  ]) {
    assert.throws(
      () => parseActivityValueMapping(validMapping({ rationale: unsafeText })),
      /güvenlik sınırını|etiketleyen dil/i,
    );
  }
});

test("genel ham gözlem kapısı hassas veriyi yazma öncesinde reddeder ve güvenli metni değiştirmez", () => {
  const exactSafeText = "  Çocuk, iki taşın yerini değiştirip arkadaşına alan açtı.  ";
  assert.equal(
    parsePedagogicalRawObservationText(exactSafeText),
    exactSafeText,
  );
  assert.equal(
    parsePedagogicalRawObservationText(
      "Arkadaşının inancına saygı gösterdi.",
    ),
    "Arkadaşının inancına saygı gösterdi.",
  );
  assert.equal(
    parsePedagogicalRawObservationText(
      "ARKADASININ INANCINA SAYGI GOSTERDI.",
    ),
    "ARKADASININ INANCINA SAYGI GOSTERDI.",
  );
  assert.equal(
    parsePedagogicalRawObservationText(
      "Çocuk ateşe bir odun ekledi.",
    ),
    "Çocuk ateşe bir odun ekledi.",
  );
  assert.equal(
    parsePedagogicalRawObservationText(
      "Çocuk kıyafetini askıya astı.",
    ),
    "Çocuk kıyafetini askıya astı.",
  );

  for (const unsafeText of [
    "Saygısı: 95.",
    "Karakter açısından mükemmeldir.",
    "Fâtiha okudu.",
    "Alerjisi için ilaç kullandı.",
    "Mahrem bölgesinden söz etti.",
    "Ailesinin velayet davası konuşuldu.",
    "FATIHA OKUDU.",
    "HAYIRLI BIR EVLATTIR.",
    "KARAKTER ACISINDAN MUKEMMELDIR.",
    "ALERJISI ICIN ILAC KULLANDI.",
    "Ateşi 39 olarak ölçüldü.",
  ]) {
    assert.throws(
      () => parsePedagogicalRawObservationText(unsafeText),
      /puan|karakter|kişisel inanç|hassas kişisel bilgi/i,
    );
  }
  assert.throws(
    () => parsePedagogicalRawObservationText("Güvenli\u202E gibi görünen metin"),
    /görünmez format|bidi/i,
  );
});

test("aylık kod seçimi en az dört benzersiz değer ister ve pedagojik kapsama iddiası taşımaz", () => {
  assert.equal(evaluateMonthlyCodeSelectionCoverage(["D1", "D14", "D16", "D4"]).valid, true);
  const insufficient = evaluateMonthlyCodeSelectionCoverage(["D1", "D14", "D14"]);
  assert.equal(insufficient.valid, false);
  assert.equal(insufficient.coveredValueCodes.length, 2);
  assert.equal(insufficient.minimumRequired, 4);
});

test("dönem kod seçimi D1–D20 değerlerinin tamamını ister", () => {
  assert.equal(evaluateTermCodeSelectionCoverage(VALUE_CODES).valid, true);
  const incomplete = evaluateTermCodeSelectionCoverage(VALUE_CODES.filter((code) => code !== "D20"));
  assert.equal(incomplete.valid, false);
  assert.deepEqual(incomplete.missingValueCodes, ["D20"]);
  assert.equal(incomplete.minimumRequired, 20);
});
