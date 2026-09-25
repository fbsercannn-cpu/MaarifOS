import assert from "node:assert/strict";
import test from "node:test";

import {
  SENSITIVE_CLASS_ROSTER_SHARE_WARNING,
  shareSensitivePdfWithDownloadFallback,
} from "../../src/features/documents/sensitive-pdf-share.ts";

const file = {
  fileName: "MaarifOS_Sinif_Listesi_v2_0_Güneş_Sınıfı.pdf",
  mimeType: "application/pdf",
  bytes: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
};

class FakeFile {
  constructor(parts, name, options = {}) {
    this.parts = parts;
    this.name = name;
    this.type = options.type ?? "";
    this.lastModified = options.lastModified ?? 0;
  }
}

test("Web Share dosya desteğinde hassas veri uyarısı ve onaydan sonra görsel PDF paylaşılır", async () => {
  const events = [];
  let sharedData;
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    FileConstructor: FakeFile,
    canShare: (data) => {
      events.push("can-share");
      assert.equal(data.files?.[0]?.name, file.fileName);
      return true;
    },
    confirmSensitiveShare: (warning) => {
      events.push("confirm");
      assert.equal(warning, SENSITIVE_CLASS_ROSTER_SHARE_WARNING);
      assert.match(warning, /T\.C\. kimlik numarası/u);
      assert.match(warning, /veli\/yakın adı ve telefon/u);
      assert.match(warning, /mesajlaşma grubunda paylaşmayın/u);
      return true;
    },
    share: async (data) => {
      events.push("share");
      sharedData = data;
    },
    download: () => events.push("download"),
  });

  assert.equal(result, "shared");
  assert.deepEqual(events, ["confirm", "can-share", "share"]);
  assert.equal(sharedData.files[0].name, file.fileName);
  assert.equal(sharedData.files[0].type, "application/pdf");
  assert.equal(sharedData.files[0].parts[0].byteLength, file.bytes.byteLength);
  assert.equal(sharedData.title, "MaarifOS sınıf listesi · görsel PDF");
  assert.equal(
    sharedData.text,
    "Yetkili idare kullanımı için hazırlanmış hassas sınıf listesi görsel PDF belgesi.",
  );
});

test("hassas veri onayı verilmezse paylaşım ve indirme başlamaz", async () => {
  const events = [];
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    FileConstructor: FakeFile,
    canShare: () => true,
    confirmSensitiveShare: () => {
      events.push("confirm");
      return false;
    },
    share: async () => events.push("share"),
    download: () => events.push("download"),
  });

  assert.equal(result, "cancelled");
  assert.deepEqual(events, ["confirm"]);
});

test("Web Share veya File yoksa hassas veri onayından sonra aynı PDF indirilir", async () => {
  const downloads = [];
  const events = [];
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    confirmSensitiveShare: (warning) => {
      events.push("confirm");
      assert.equal(warning, SENSITIVE_CLASS_ROSTER_SHARE_WARNING);
      return true;
    },
    download: (candidate) => {
      events.push("download");
      downloads.push(candidate);
    },
  });

  assert.equal(result, "downloaded");
  assert.deepEqual(events, ["confirm", "download"]);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].fileName, file.fileName);
  assert.equal(downloads[0].mimeType, "application/pdf");
  assert.equal(Buffer.from(downloads[0].bytes).toString("ascii"), "%PDF-1.4");
  assert.notEqual(downloads[0].bytes, file.bytes);
});

test("canShare dosya paylaşımını reddederse share çağrılmadan PDF indirilir", async () => {
  let shared = false;
  let downloaded = false;
  let confirmed = false;
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    FileConstructor: FakeFile,
    canShare: () => false,
    confirmSensitiveShare: () => {
      confirmed = true;
      return true;
    },
    share: async () => {
      shared = true;
    },
    download: () => {
      downloaded = true;
    },
  });

  assert.equal(result, "downloaded");
  assert.equal(confirmed, true);
  assert.equal(shared, false);
  assert.equal(downloaded, true);
});

test("Web Share olmayan cihazda onay reddedilirse indirme başlamaz", async () => {
  let downloaded = false;
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    confirmSensitiveShare: () => false,
    download: () => {
      downloaded = true;
    },
  });

  assert.equal(result, "cancelled");
  assert.equal(downloaded, false);
});

test("paylaşım teknik olarak başarısız olursa PDF kaybolmadan indirmeye düşer", async () => {
  let downloaded = false;
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    FileConstructor: FakeFile,
    canShare: () => true,
    confirmSensitiveShare: () => true,
    share: async () => {
      throw new Error("platform paylaşım hatası");
    },
    download: () => {
      downloaded = true;
    },
  });

  assert.equal(result, "downloaded");
  assert.equal(downloaded, true);
});

test("kullanıcı sistem paylaşım ekranını kapatırsa beklenmedik indirme yapılmaz", async () => {
  let downloaded = false;
  const result = await shareSensitivePdfWithDownloadFallback(file, {
    FileConstructor: FakeFile,
    canShare: () => true,
    confirmSensitiveShare: () => true,
    share: async () => {
      throw { name: "AbortError" };
    },
    download: () => {
      downloaded = true;
    },
  });

  assert.equal(result, "cancelled");
  assert.equal(downloaded, false);
});
