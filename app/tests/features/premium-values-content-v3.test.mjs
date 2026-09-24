import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PREMIUM_V3_PREVIEW_RELEASE_LOCK,
  loadPremiumPreviewPackFromUrl,
  loadPremiumV3PreviewPackFromUrl,
  parsePremiumContentPack,
} from "../../src/features/premium-plans/content-repository.ts";

const releaseUrl = new URL(
  "../../../premium-content/releases/tymm-6072/2026-09/",
  import.meta.url,
);
const contentUrl = new URL("content.v3.json", releaseUrl);
const predecessorUrl = new URL("content.v2.json", releaseUrl);
const manifestUrl = new URL("manifest.v3.json", releaseUrl);
const constitutionUrl = new URL(
  "../../src/features/values/values-pedagogy-constitution.v1.json",
  import.meta.url,
);
const actionCatalogUrl = new URL(
  "../../src/features/values/official-preschool-value-actions.v1.json",
  import.meta.url,
);

const previewContentUrl = "/premium-preview-cache/tymm-6072-2026-09-v3.json";
const previewManifestUrl =
  "/premium-preview-cache/tymm-6072-2026-09-manifest-v3.json";
const previewPredecessorUrl =
  "/premium-preview-cache/tymm-6072-2026-09-v2.json";
const previewConstitutionUrl =
  "/src/features/values/values-pedagogy-constitution.v1.json";
const previewActionCatalogUrl =
  "/src/features/values/official-preschool-value-actions.v1.json";
const HUMAN_REVIEW_ROLES = [
  "early-childhood-education",
  "practicing-preschool-teacher",
  "child-rights-and-safeguarding",
  "tymm-curriculum",
  "content-and-language-editor",
  "turkish-islamic-culture-and-theology",
];

const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

async function rawContent() {
  return JSON.parse(await readFile(contentUrl, "utf8"));
}

async function runtimePreviewFiles() {
  const [content, manifest, predecessor, constitution, actionCatalog] =
    await Promise.all([
      readFile(contentUrl),
      readFile(manifestUrl),
      readFile(predecessorUrl),
      readFile(constitutionUrl),
      readFile(actionCatalogUrl),
    ]);
  return { content, manifest, predecessor, constitution, actionCatalog };
}

function memoryFetcher(entries, calls = []) {
  const sources = new Map(entries);
  return {
    calls,
    fetcher: async (input) => {
      const url = String(input);
      calls.push(url);
      const bytes = sources.get(url);
      if (bytes === undefined) {
        return new Response("not found", { status: 404 });
      }
      return new Response(bytes, {
        status: 200,
        headers: { "content-length": String(bytes.byteLength) },
      });
    },
  };
}

function v3RuntimeEntries(files, overrides = {}) {
  return [
    [previewContentUrl, overrides.content ?? files.content],
    [previewManifestUrl, overrides.manifest ?? files.manifest],
    [previewPredecessorUrl, overrides.predecessor ?? files.predecessor],
    [previewConstitutionUrl, overrides.constitution ?? files.constitution],
    [previewActionCatalogUrl, overrides.actionCatalog ?? files.actionCatalog],
  ];
}

const GOLDEN_VALUE_MAP = Object.freeze({
  "tymm6072-sep-friendship-story": ["value_led", "D4", "D14", ["D8", "D15"], ["D4.1.1", "D4.2.1", "D4.4.3"], ["aile-sila-i-rahim-komsuluk", "edep-nezaket"]],
  "tymm6072-sep-safe-places-map": ["learning_outcome_led", "D13", "D16", ["D5"], ["D13.3.5", "D16.1.3", "D5.1.3"], ["emanet"]],
  "tymm6072-sep-quiet-joining": ["value_led", "D8", "D1", ["D11", "D14"], ["D8.1.1", "D8.1.3", "D11.1.5"], ["kul-hakki", "edep-nezaket"]],
  "tymm6072-sep-day-rhythm": ["learning_outcome_led", "D12", "D16", ["D3"], ["D12.1.3", "D3.2.1", "D16.1.1"], ["helal-emek-caliskanlik"]],
  "tymm6072-sep-material-homes": ["value_led", "D16", "D16", ["D6", "D17"], ["D16.2.2", "D6.2.2", "D17.3.4"], ["emanet", "sukur-kanaat-israf-etmeme"]],
  "tymm6072-sep-sound-signals": ["learning_outcome_led", "D14", "D14", ["D5", "D11"], ["D14.1.1", "D5.1.3", "D11.1.5"], ["edep-nezaket"]],
  "tymm6072-sep-accessible-classroom": ["value_led", "D1", "D1", ["D5", "D16"], ["D1.2.4", "D5.1.3", "D16.3.3"], ["kul-hakki", "imece-yardimlasma"]],
  "tymm6072-sep-choice-for-everyone": ["value_led", "D11", "D1", ["D8", "D14"], ["D11.1.1", "D11.1.2", "D8.1.1"], ["kul-hakki", "edep-nezaket"]],
  "tymm6072-sep-route-map": ["learning_outcome_led", "D5", "D1", ["D13", "D16"], ["D5.1.3", "D13.3.5", "D16.1.3"], ["kul-hakki", "imece-yardimlasma"]],
  "tymm6072-sep-evidence-museum": ["learning_outcome_led", "D6", "D14", ["D8", "D10"], ["D6.2.1", "D8.1.1", "D10.1.6"], ["emanet", "edep-nezaket"]],
  "tymm6072-sep-october-questions": ["learning_outcome_led", "D3", "D16", ["D10"], ["D3.3.2", "D10.1.6", "D16.1.1"], ["helal-emek-caliskanlik"]],
  "tymm6072-sep-many-ways-agreement": ["value_led", "D14", "D14", ["D1", "D16"], ["D14.1.10", "D1.2.1", "D16.3.3"], ["kul-hakki", "imece-yardimlasma"]],
});

test("content.v3 manifesti içerik payload'ını, v2 öncülünü ve değer kaynak zincirini doğrular", async () => {
  const [contentBytes, manifestBytes, constitutionBytes, catalogBytes] = await Promise.all([
    readFile(contentUrl),
    readFile(manifestUrl),
    readFile(constitutionUrl),
    readFile(actionCatalogUrl),
  ]);
  const contentText = contentBytes.toString("utf8");
  const content = JSON.parse(contentText);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const payload = structuredClone(content);
  delete payload.manifestDigest;
  const canonicalPayload = JSON.stringify(canonicalize(payload));

  assert.equal(contentBytes.byteLength, PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawByteLength);
  assert.equal(sha256(contentBytes), PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawSha256);
  assert.equal(sha256(manifestBytes), PREMIUM_V3_PREVIEW_RELEASE_LOCK.manifestRawSha256);
  assert.equal(content.manifestDigest, sha256(manifestBytes));
  assert.equal(manifest.contentPayloadSha256, sha256(Buffer.from(canonicalPayload, "utf8")));
  assert.equal(manifest.contentPayloadByteLength, Buffer.byteLength(canonicalPayload, "utf8"));
  assert.equal(
    manifest.predecessor.rawFileSha256,
    "sha256:f096c3d98990796c11e4b72747458248e2fd7a530dd54102acba9ddea996d8e5",
  );
  assert.equal(manifest.valuesSourceChain.constitution.rawFileSha256, sha256(constitutionBytes));
  assert.equal(manifest.valuesSourceChain.officialActionCatalog.rawFileSha256, sha256(catalogBytes));
  assert.equal(manifest.status, "machine_validated_pending_human_review");
  assert.deepEqual(manifest.requiredHumanReviewRoles, HUMAN_REVIEW_ROLES);
  assert.deepEqual(content.valuesContract.requiredHumanReviewRoles, HUMAN_REVIEW_ROLES);
});

test("v3 runtime loader raw manifest, kanonik payload, v2 öncül ve iki değer kaynağını fail-closed doğrular", async () => {
  const files = await runtimePreviewFiles();
  const { fetcher, calls } = memoryFetcher(v3RuntimeEntries(files));
  const pack = await loadPremiumV3PreviewPackFromUrl(previewContentUrl, fetcher);

  assert.equal(pack.version, "3.0.0");
  assert.equal(pack.valuesMappingStatus, "machine_validated_pending_human_review");
  assert.deepEqual(new Set(calls), new Set([
    previewContentUrl,
    previewManifestUrl,
    previewPredecessorUrl,
    previewConstitutionUrl,
    previewActionCatalogUrl,
  ]));
  assert.equal(calls.length, 5);
});

test("v3 runtime loader manifest/payload/öncül/Anayasa/Ek-14 byte oynamalarını reddeder", async () => {
  const files = await runtimePreviewFiles();
  const changedContent = JSON.parse(files.content.toString("utf8"));
  changedContent.displayName = `${changedContent.displayName} değiştirildi`;
  const mediaSynonymContent = JSON.parse(files.content.toString("utf8"));
  mediaSynonymContent.activities[0].adultPrompts[0] =
    "Çocuk konuşur; öğretmen bu anlatımı çoğaltılabilir bir dijital hatıraya dönüştürür.";
  const tamperedCases = [
    [
      "raw manifest",
      { manifest: Buffer.concat([files.manifest, Buffer.from(" ")]) },
      /manifest exact raw özeti/i,
    ],
    [
      "canonical payload",
      { content: Buffer.from(JSON.stringify(changedContent), "utf8") },
      /v3 exact raw/i,
    ],
    [
      "open-ended media synonym",
      { content: Buffer.from(JSON.stringify(mediaSynonymContent), "utf8") },
      /v3 exact raw/i,
    ],
    [
      "invalid JSON before codec",
      { content: Buffer.from("{not-json", "utf8") },
      /v3 exact raw/i,
    ],
    [
      "v2 predecessor",
      { predecessor: Buffer.concat([files.predecessor, Buffer.from(" ")]) },
      /V2 öncül raw byte özeti/i,
    ],
    [
      "constitution source",
      { constitution: Buffer.concat([files.constitution, Buffer.from(" ")]) },
      /Anayasa raw kaynak zinciri/i,
    ],
    [
      "official action source",
      { actionCatalog: Buffer.concat([files.actionCatalog, Buffer.from(" ")]) },
      /Ek-14 raw kaynak zinciri/i,
    ],
  ];

  for (const [label, overrides, expectedError] of tamperedCases) {
    const { fetcher } = memoryFetcher(v3RuntimeEntries(files, overrides));
    await assert.rejects(
      loadPremiumPreviewPackFromUrl(previewContentUrl, fetcher),
      expectedError,
      label,
    );
  }
});

test("legacy v2 runtime loader manifest aramadan tek fetch ile çalışmayı sürdürür", async () => {
  const files = await runtimePreviewFiles();
  const { fetcher, calls } = memoryFetcher([
    [previewPredecessorUrl, files.predecessor],
  ]);
  const pack = await loadPremiumPreviewPackFromUrl(previewPredecessorUrl, fetcher);
  assert.equal(pack.version, "2.0.0");
  assert.equal(pack.valuesMappingStatus, "legacy-unmapped");
  assert.deepEqual(calls, [previewPredecessorUrl]);
});

test("runtime loader v3→v2 downgrade girişimini, oynanmış v2 byte'ını ve kanonik olmayan yolu reddeder", async () => {
  const files = await runtimePreviewFiles();

  const { fetcher: downgradeFetcher } = memoryFetcher(
    v3RuntimeEntries(files, { content: files.predecessor }),
  );
  await assert.rejects(
    loadPremiumPreviewPackFromUrl(previewContentUrl, downgradeFetcher),
    /v3 exact raw/i,
  );

  const { fetcher: tamperedV2Fetcher } = memoryFetcher([
    [previewPredecessorUrl, Buffer.concat([files.predecessor, Buffer.from(" ")])],
  ]);
  await assert.rejects(
    loadPremiumPreviewPackFromUrl(previewPredecessorUrl, tamperedV2Fetcher),
    /v2 exact raw byte özeti/i,
  );

  const unknownCalls = [];
  const { fetcher: unknownFetcher } = memoryFetcher([], unknownCalls);
  await assert.rejects(
    loadPremiumPreviewPackFromUrl(
      "/premium-preview-cache/custom-content.json",
      unknownFetcher,
    ),
    /kanonik v2 veya v3 dosya adını/i,
  );
  assert.deepEqual(unknownCalls, []);

  const pilotDowngradeCalls = [];
  const { fetcher: pilotDowngradeFetcher } = memoryFetcher(
    [[previewPredecessorUrl, files.predecessor]],
    pilotDowngradeCalls,
  );
  await assert.rejects(
    loadPremiumV3PreviewPackFromUrl(
      previewPredecessorUrl,
      pilotDowngradeFetcher,
    ),
    /pilot ekranı yalnız kanonik v3/i,
  );
  assert.deepEqual(pilotDowngradeCalls, []);
});

test("v3 görünür pedagojik metin ağacının herhangi bir dalındaki anayasa kırmızı çizgisini reddeder", async () => {
  const base = await rawContent();
  const mutations = [
    ["title punishment", (raw) => { raw.activities[0].title = "Çocuk cezalandırılır."; }],
    ["identity scoring", (raw) => { raw.activities[0].shortDescription = "İnanç puanlanır."; }],
    ["blocked complaint", (raw) => { raw.activities[0].preparation[0] = "Şikâyet etme."; }],
    ["opening", (raw) => { raw.activities[0].opening = "Çocuk dua etmeye zorlanır."; }],
    ["processSteps", (raw) => { raw.activities[0].processSteps[0] = "Katılmayan cezalandırılır."; }],
    ["adultPrompts", (raw) => { raw.activities[0].adultPrompts[0] = "Tüm çocuklar dua eder."; }],
    ["childAgencyPoints", (raw) => { raw.activities[0].childAgencyPoints[0] = "Çocuk ibadete katılmak zorunda."; }],
    ["evidenceOptions", (raw) => { raw.activities[0].evidenceOptions[0] = "Dua katılımı puanlanır."; }],
    ["familyCommunityConnection", (raw) => { raw.activities[0].familyCommunityConnection = "İtiraz eden çocuk dışlanır."; }],
    ["safetyNotes", (raw) => { raw.activities[0].safetyNotes[0] = "Çocuğa kimseye anlatma denir."; }],
    ["reflectionPrompt", (raw) => { raw.activities[0].reflectionPrompt = "Koşulsuz itaat beklenir."; }],
    ["materials", (raw) => { raw.activities[0].materials[0] = "Zorunlu özür paylaşımı"; }],
    ["fullDayFlow", (raw) => { raw.fullDayFlow[0].flexibilityNote = "Katılmayan cezalandırılır."; }],
    ["weekly purpose", (raw) => { raw.weeks[0].purpose = "Bir din üstündür."; }],
    ["monthly routine", (raw) => { raw.monthlyPlan.routines[0] = "Çocuk ritüele katılır ve not verilir."; }],
    ["zero-width media cloak", (raw) => { raw.activities[0].materials[0] = "Çocuk foto\u200Bğrafı"; }],
    ["Cyrillic confusable media cloak", (raw) => { raw.activities[0].materials[0] = "Çocuğun fоtoğrafı"; }],
  ];

  for (const [label, mutate] of mutations) {
    const raw = structuredClone(base);
    mutate(raw);
    assert.throws(
      () => parsePremiumContentPack(raw),
      /Anayasası kırmızı çizgisini ihlal ediyor/i,
      label,
    );
  }
});

test("v3 medya kapısı çocuk kaydı ve aile-kamusal paylaşımı reddeder; nesne/mekân fotoğrafını korur", async () => {
  const base = await rawContent();
  const target = (raw) => raw.activities.find(
    (activity) => activity.id === "tymm6072-sep-evidence-museum",
  );
  assert.doesNotThrow(() => parsePremiumContentPack(structuredClone(base)));

  const unsafeMutations = [
    ["legacy evidence media", (raw) => {
      target(raw).differentiation[0] =
        "Kanıt dokunulabilir nesne, ses kaydı listesi veya fotoğraf olabilir.";
    }],
    ["child photo or audio", (raw) => {
      target(raw).childAgencyPoints[0] =
        "Çocuk isterse seçimini kendi fotoğrafı veya kısa ses kaydıyla açıklayabilir.";
    }],
    ["family sees evidence", (raw) => {
      target(raw).familyCommunityConnection =
        "Aile yalnız çocuk tarafından paylaşılmak üzere seçilmiş sınıf izini görebilir.";
    }],
    ["values child media", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk kendi fotoğrafını veya ses kaydını seçebilir.";
    }],
    ["values adult capture", (raw) => {
      target(raw).valuesDesign.mapping.adultModelActions[0] =
        "Öğretmen çocuğun videosunu çekebilir ve sergide kullanabilir.";
    }],
    ["values family public", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Aileler çocuk fotoğrafını görebilir; kamusal sergiye davet edilir.";
    }],
    ["cross-clause family public", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Aile davet edilir; çocuk fotoğrafı paylaşılır.";
    }],
    ["cross-clause capture offer", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk fotoğrafı düşünülür. Kaydedilebilir.";
    }],
    ["safe context cannot cloak child capture", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Nesne fotoğrafı kullanılabilir. Çocuk fotoğrafı düşünülür. Kaydedilebilir.";
    }],
    ["mixed negation and offer", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Fotoğraf çekilmez; çocuğun sesi kaydedilebilir.";
    }],
    ["question own photo", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun sorusu kendi fotoğrafıyla kaydedilebilir.";
    }],
    ["family child-photo exhibition synonym", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Ailelerle cocuk fotografi sergisi duzenlenebilir.";
    }],
    ["child voice phone-recording synonym", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Cocugun sesi telefona alinabilir.";
    }],
    ["parent child-picture delivery synonym", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Velilere cocuk resmi gonderilebilir.";
    }],
    ["child-photo colloquial synonym", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun fotosu çekilebilir.";
    }],
    ["child spoken-narrative recording synonym", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun sözlü anlatımı telefona kaydedilebilir.";
    }],
    ["audio recording may be made", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Öğrenci anlatırken ses kaydı yapılabilir.";
    }],
    ["child-photo shoot may be made", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk fotoğrafı çekimi yapılabilir.";
    }],
    ["parent child-photo album", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Veliler için çocuk fotoğraflarından albüm hazırlanabilir.";
    }],
    ["child video family portal upload", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Çocuk videosu aile portalına yüklenebilir.";
    }],
    ["negation cloak followed by recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk fotoğrafı çekilmez denir ama kaydedilebilir.";
    }],
    ["child speech recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun konuşması kaydedilebilir.";
    }],
    ["child voiced-answer recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun sesli yanıtı kaydedilebilir.";
    }],
    ["child drawing family sharing", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Çocuğun çizimi ailelerle paylaşılabilir.";
    }],
    ["child work family portal upload", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Çocuk çalışmaları aile portalına yüklenebilir.";
    }],
    ["whatsapp photo sharing", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "WhatsApp grubunda fotoğraf paylaşılabilir.";
    }],
    ["school website child-product publication", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Okulun web sitesinde çocuk ürünü yayımlanabilir.";
    }],
    ["plural child voices recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocukların sesleri kaydedilebilir.";
    }],
    ["plural student words recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Öğrencilerin sözleri kayda alınabilir.";
    }],
    ["children may be imaged", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuklar görüntülenebilir.";
    }],
    ["child selfie may be used", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun özçekimi kullanılabilir.";
    }],
    ["safe-context child laundering", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Nesne fotoğrafında çocuklar da kadraja girebilir.";
    }],
    ["child drawings sent home", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Evlere çocuk çizimleri gönderilebilir.";
    }],
    ["student drawing school board", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Okul panosuna öğrenci çizimi asılabilir.";
    }],
    ["family receives child product", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Aileler çocuk ürünü teslim alabilir.";
    }],
    ["cross-clause negation group send", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Çocuk videosu kaydedilmez. Aile grubuna atılabilir.";
    }],
    ["direct child photography", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğu fotoğraflayabilir.";
    }],
    ["direct child recording", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğu kayda alabilir.";
    }],
    ["child voice record under", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuğun sesi kayıt altına alınabilir.";
    }],
    ["parents may inspect evidence", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Ebeveynler kanıtı görebilir.";
    }],
    ["evidence on school board", (raw) => {
      target(raw).valuesDesign.mapping.familyCommunityTransfer =
        "Kanıt okul panosunda sergilenebilir.";
    }],
    ["cross-field anaphoric recording", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun sesi dinlenir.";
      target(raw).adultPrompts[0] = "Öğretmen bunu kayda alabilir.";
    }],
    ["monthly media scope", (raw) => {
      raw.monthlyPlan.routines[0] = "Çocuk fotoğrafı çekilebilir.";
    }],
    ["full-day media scope", (raw) => {
      raw.fullDayFlow[0].flexibilityNote = "Çocuğun sesi kaydedilebilir.";
    }],
    ["week media scope", (raw) => {
      raw.weeks[0].purpose = "Çocuk videosu aile portalına yüklenebilir.";
    }],
    ["annual-month media scope", (raw) => {
      raw.annualMonths[0].purpose = "Veliler kanıtı görebilir.";
    }],
    ["positive recording before negative sharing", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocukların sesleri kaydedilir ve paylaşılmaz.";
    }],
    ["positive photo before negative family send", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk fotoğrafı çekilebilir ve aileye gönderilmez.";
    }],
    ["positive video before negative archive", (raw) => {
      target(raw).valuesDesign.mapping.childAgencyOptions[0] =
        "Çocuk videosu kaydedilir ve arşivde tutulmaz.";
    }],
    ["cross-field drawing recording", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun çizimi seçilir.";
      target(raw).adultPrompts[0] = "Öğretmen bunu kayda alabilir.";
    }],
    ["cross-field drawing family send", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun çizimi seçilir.";
      target(raw).familyCommunityConnection = "Aileye gönderilebilir.";
    }],
    ["cross-field voice family view", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun sesi dinlenir.";
      target(raw).familyCommunityConnection = "Aile bunu görebilir.";
    }],
    ["child voice publication without audience", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun sesi yayımlanabilir.";
    }],
    ["child drawing sharing without audience", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocuğun çizimi paylaşılabilir.";
    }],
    ["children words publication without audience", (raw) => {
      target(raw).childAgencyPoints[0] = "Çocukların sözleri yayımlanabilir.";
    }],
    ["school board child-product print", (raw) => {
      target(raw).familyCommunityConnection =
        "Okul panosunda çocuk ürünü basılabilir.";
    }],
    ["parents child-work download", (raw) => {
      target(raw).familyCommunityConnection =
        "Ebeveynler çocuk çalışmasını indirebilir.";
    }],
  ];
  for (const [label, mutate] of unsafeMutations) {
    const raw = structuredClone(base);
    mutate(raw);
    assert.throws(
      () => parsePremiumContentPack(raw),
      /tipli izin kaydı olmadan medya seçeneği/i,
      label,
    );
  }

  for (const safeText of [
    "Çocuk fotoğrafı çekilmez; nesne çizimi kullanılabilir.",
    "Fotoğraf çekilmez. Çocuk isterse sözle açıklayabilir.",
    "Çocuk sözlü anlatımı seçebilir.",
    "Çocuk sözlü anlatımla açıklayabilir.",
    "Çocuk sözünü seçebilir.",
    "Nesnenin fotoğrafı çekilebilir.",
    "Mekânın fotoğrafı çekilebilir.",
    "Koridorun fotoğrafı çekilebilir.",
    "Sınıf alanının görüntüsü kaydedilebilir.",
    "Çocuk videosu kayda alınmamalıdır.",
    "Aileye çocuk fotoğrafı gönderilmemelidir.",
    "Video kullanılmasına izin verilmez.",
    "Çocuk görüntüsü arşivde tutulmayacaktır.",
    "Çocuk kendi resmini çizebilir.",
    "Çocuk kendi portresini kâğıda çizer.",
    "Çocuk aynada kendi görüntüsünü inceler.",
    "Nesnelerin fotoğrafları çekilebilir.",
    "Mekânların görüntüleri kaydedilebilir.",
    "Çocuk fotoğrafı kullanılmamalıdır.",
    "Çocuk fotoğrafı saklanmamalıdır.",
    "Çocuk fotoğrafı paylaşılmamalıdır.",
    "Aileye çocuk fotoğrafı gösterilmemelidir.",
    "Çocuk fotoğrafı çekilmez: çocuk isterse sözle açıklar.",
    "Nesneye ait fotoğraf çekilebilir.",
    "Çocuk ses kaydı olmadan sözlü anlatımı seçebilir.",
    "Nesnenin fotoğrafı çekilebilir. Çocuk farklı bir nesne seçebilir.",
    "Nesne fotoğrafı veya gerçek nesne etiketi kullanılabilir.",
    "Sınıf alanı ve koridor fotoğrafları rota kartında kullanılabilir.",
    "Yakın çevreye ait nesne fotoğrafı çocuk ve kişisel veri içermez; kullanılabilir.",
  ]) {
    const raw = structuredClone(base);
    target(raw).differentiation[0] = safeText;
    assert.doesNotThrow(() => parsePremiumContentPack(raw), safeText);
  }
});

test("content.v3 on iki etkinliğin golden değer haritasını ve bekleyen insan incelemesini korur", async () => {
  const raw = await rawContent();
  const before = structuredClone(raw);
  const pack = parsePremiumContentPack(raw);
  assert.deepEqual(raw, before, "codec ham release nesnesini değiştirmemeli");
  assert.equal(pack.id, "maarifos-tymm-6072-2026-2027-v3");
  assert.equal(pack.version, "3.0.0");
  assert.equal(pack.contentReleaseId, "tymm-6072-2026-09-v3");
  assert.equal(pack.valuesMappingStatus, "machine_validated_pending_human_review");
  assert.equal(pack.valuesContract?.status, "machine_validated_pending_human_review");
  assert.equal(pack.annualMonths[0].releaseStatus, "internal-review-ready");
  assert.ok(pack.annualMonths.slice(1).every((month) => month.releaseStatus === "planned-release"));
  assert.equal(pack.activities.length, 12);
  assert.equal(pack.activities.filter((activity) => activity.activityRole === "alternative").length, 4);

  let culturalContextCount = 0;
  for (const activity of pack.activities) {
    const design = activity.valuesDesign;
    assert.ok(design);
    assert.equal(design.id, `${activity.id}:values:v1`);
    assert.equal(design.editorialReview.humanReviewRequired, true);
    assert.equal(design.editorialReview.status, "machine_validated_pending_human_review");
    assert.equal("verification" in design, false);
    assert.equal("teacherConfirmed" in design.editorialReview, false);
    assert.ok(design.culturalContexts.every((context) => context.provenance.status === "draft"));
    assert.ok(design.culturalContexts.every((context) => context.provenance.checkedAtUtc === null));
    culturalContextCount += design.culturalContexts.length;
    const mapping = design.mapping;
    assert.deepEqual(
      [
        mapping.designDirection,
        mapping.primaryValueCode,
        mapping.roofValueCode,
        [...mapping.supportingValueCodes],
        mapping.officialActionSnapshots.map((snapshot) => snapshot.indicatorCode),
        [...mapping.culturalBridgeIds],
      ],
      GOLDEN_VALUE_MAP[activity.id],
    );
  }
  assert.equal(culturalContextCount, 20);
  assert.equal(
    pack.activities.flatMap((activity) => activity.valuesDesign.mapping.officialActionSnapshots).length,
    36,
  );
});

test("content.v3 codec'i eksik mapping, sahte Ek-14, erken doğrulanmış kültürel kaynak ve denge kaymasını reddeder", async () => {
  const missingDesign = await rawContent();
  delete missingDesign.activities[0].valuesDesign;
  assert.throws(() => parsePremiumContentPack(missingDesign), /her etkinlik.*valuesDesign/i);

  const fakeAction = await rawContent();
  fakeAction.activities[0].valuesDesign.mapping.officialActionSnapshots[0].indicatorText = "Uydurma gösterge.";
  assert.throws(() => parsePremiumContentPack(fakeAction), /Ek-14 kataloğ/i);

  const falselyVerifiedCulture = await rawContent();
  const provenance = falselyVerifiedCulture.activities[0].valuesDesign.culturalContexts[0].provenance;
  provenance.status = "verified";
  provenance.checkedAtUtc = "2026-08-07T00:00:00.000Z";
  assert.throws(
    () => parsePremiumContentPack(falselyVerifiedCulture),
    /doğrulanmış gibi işaretlenemez/i,
  );

  const imbalanced = await rawContent();
  const quietJoining = imbalanced.activities.find(
    (activity) => activity.id === "tymm6072-sep-quiet-joining",
  );
  quietJoining.valuesDesign.mapping.roofValueCode = "D14";
  assert.throws(() => parsePremiumContentPack(imbalanced), /4\/4\/4/);

  const falseHumanApproval = await rawContent();
  falseHumanApproval.activities[0].valuesDesign.editorialReview.status = "human_approved";
  assert.throws(() => parsePremiumContentPack(falseHumanApproval), /bekleyen insan incelemesini/i);
});

test("content.v3 exact release kimliğini ve strict wrapper alanlarını fail-closed korur", async () => {
  for (const mutation of [
    { id: "uydurma-v3" },
    { version: "3.1.0" },
    { contentReleaseId: "uydurma-v3" },
    { displayName: "forged" },
    { sourceUrl: "https://evil.example/forged.pdf" },
    { sourceCheckedOn: "2099-01-01" },
  ]) {
    const changed = Object.assign(await rawContent(), mutation);
    assert.throws(() => parsePremiumContentPack(changed), /exact 3\.0\.0/);
  }

  const noContract = await rawContent();
  delete noContract.valuesContract;
  assert.throws(() => parsePremiumContentPack(noContract), /valuesContract/);

  const extraTeacherVerification = await rawContent();
  extraTeacherVerification.activities[0].valuesDesign.verification = {
    status: "verified",
    teacherConfirmed: true,
  };
  assert.throws(() => parsePremiumContentPack(extraTeacherVerification), /beklenmeyen alan/);
});
