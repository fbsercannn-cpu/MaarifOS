import assert from "node:assert/strict";
import test from "node:test";

import {
  SIMPLE_OBSERVATION_ADMINISTRATION_SHARE_WARNING,
  SIMPLE_OBSERVATION_PARENT_SHARE_WARNING,
  shareSimpleObservationDocumentWithDownloadFallback,
} from "../../src/features/reports/simple-observation-share.ts";

const parentFile = {
  audience: "parent",
  fileName: "MaarifOS_Gozlem_Ozeti_Aile_Deniz.html",
  mimeType: "text/html;charset=utf-8",
  bytes: new TextEncoder().encode("<!doctype html><title>Deniz</title>"),
};

const administrationFile = {
  ...parentFile,
  audience: "administration",
  fileName: "MaarifOS_Gozlem_Ozeti_Idare_Deniz.html",
};

class FakeFile {
  constructor(parts, name, options = {}) {
    this.parts = parts;
    this.name = name;
    this.type = options.type ?? "";
    this.lastModified = options.lastModified ?? 0;
  }
}

test("veli gözlem özeti kişisel veri onayından sonra telefon paylaşım ekranına verilir", async () => {
  const events = [];
  let sharedData;
  const result = await shareSimpleObservationDocumentWithDownloadFallback(
    parentFile,
    {
      FileConstructor: FakeFile,
      confirmPersonalDataTransfer: (warning) => {
        events.push("confirm");
        assert.equal(warning, SIMPLE_OBSERVATION_PARENT_SHARE_WARNING);
        assert.match(warning, /çocuğun adını ve öğretmenin gözlem notlarını/u);
        assert.match(warning, /sınıf ya da mesajlaşma grubunda paylaşmayın/u);
        return true;
      },
      canShare: (data) => {
        events.push("can-share");
        assert.equal(data.files?.[0]?.name, parentFile.fileName);
        return true;
      },
      share: async (data) => {
        events.push("share");
        sharedData = data;
      },
      download: () => events.push("download"),
    },
  );

  assert.equal(result, "shared");
  assert.deepEqual(events, ["confirm", "can-share", "share"]);
  assert.equal(sharedData.files[0].name, parentFile.fileName);
  assert.equal(sharedData.files[0].type, parentFile.mimeType);
  assert.equal(sharedData.files[0].parts[0].byteLength, parentFile.bytes.byteLength);
});

test("idare belgesi T.C. kimlik kapsamını açıkça söyler ve onay reddedilirse hiçbir dosya çıkmaz", async () => {
  const events = [];
  const result = await shareSimpleObservationDocumentWithDownloadFallback(
    administrationFile,
    {
      FileConstructor: FakeFile,
      confirmPersonalDataTransfer: (warning) => {
        events.push("confirm");
        assert.equal(warning, SIMPLE_OBSERVATION_ADMINISTRATION_SHARE_WARNING);
        assert.match(warning, /öğrenci numarasını ve T\.C\. kimlik numarasını/u);
        return false;
      },
      canShare: () => {
        events.push("can-share");
        return true;
      },
      share: async () => events.push("share"),
      download: () => events.push("download"),
    },
  );

  assert.equal(result, "cancelled");
  assert.deepEqual(events, ["confirm"]);
});

test("dosya paylaşımı olmayan telefonda onaydan sonra aynı HTML güvenli indirmeye düşer", async () => {
  const downloads = [];
  const result = await shareSimpleObservationDocumentWithDownloadFallback(
    parentFile,
    {
      confirmPersonalDataTransfer: () => true,
      download: (file) => downloads.push(file),
    },
  );

  assert.equal(result, "downloaded");
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].fileName, parentFile.fileName);
  assert.equal(downloads[0].mimeType, parentFile.mimeType);
  assert.equal(
    new TextDecoder().decode(downloads[0].bytes),
    "<!doctype html><title>Deniz</title>",
  );
  assert.notEqual(downloads[0].bytes, parentFile.bytes);
});

test("canShare dosyayı reddeder veya teknik paylaşım hatası oluşursa onaylı indirme yapılır", async () => {
  for (const mode of ["unsupported", "technical-error"]) {
    let downloaded = false;
    let shared = false;
    const result = await shareSimpleObservationDocumentWithDownloadFallback(
      parentFile,
      {
        FileConstructor: FakeFile,
        confirmPersonalDataTransfer: () => true,
        canShare: () => mode !== "unsupported",
        share: async () => {
          shared = true;
          throw new Error("platform paylaşım hatası");
        },
        download: () => {
          downloaded = true;
        },
      },
    );

    assert.equal(result, "downloaded");
    assert.equal(downloaded, true);
    assert.equal(shared, mode === "technical-error");
  }
});

test("kullanıcı sistem paylaşım ekranını kapatırsa AbortError sessiz iptaldir; indirme başlamaz", async () => {
  let downloaded = false;
  const result = await shareSimpleObservationDocumentWithDownloadFallback(
    parentFile,
    {
      FileConstructor: FakeFile,
      confirmPersonalDataTransfer: () => true,
      canShare: () => true,
      share: async () => {
        throw { name: "AbortError" };
      },
      download: () => {
        downloaded = true;
      },
    },
  );

  assert.equal(result, "cancelled");
  assert.equal(downloaded, false);
});

test("canShare uygulaması hata atarsa dosya kaybolmadan onaylı indirme yapılır", async () => {
  let downloaded = false;
  const result = await shareSimpleObservationDocumentWithDownloadFallback(
    parentFile,
    {
      FileConstructor: FakeFile,
      confirmPersonalDataTransfer: () => true,
      canShare: () => {
        throw new TypeError("canShare desteklenmiyor");
      },
      share: async () => undefined,
      download: () => {
        downloaded = true;
      },
    },
  );

  assert.equal(result, "downloaded");
  assert.equal(downloaded, true);
});
