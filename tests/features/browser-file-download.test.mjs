import assert from "node:assert/strict";
import test from "node:test";

import {
  BROWSER_FILE_DOWNLOAD_URL_LIFETIME_MS,
  downloadBrowserFile,
} from "../../src/features/documents/browser-file-download.ts";

function fixtureEnvironment() {
  const calls = {
    blobs: [],
    anchors: [],
    timers: [],
    revokedUrls: [],
  };
  return {
    calls,
    environment: {
      createObjectUrl(blob) {
        calls.blobs.push(blob);
        return "blob:maarifos-document";
      },
      revokeObjectUrl(url) {
        calls.revokedUrls.push(url);
      },
      createAnchor() {
        const anchor = {
          href: "",
          download: "",
          rel: "",
          clickCount: 0,
          removeCount: 0,
          click() {
            this.clickCount += 1;
          },
          remove() {
            this.removeCount += 1;
          },
        };
        calls.anchors.push(anchor);
        return anchor;
      },
      setTimer(handler, delayMs) {
        calls.timers.push({ handler, delayMs });
      },
    },
  };
}

test("Blob URL mobil indirme devralınmadan önce iptal edilmez", async () => {
  const { calls, environment } = fixtureEnvironment();

  downloadBrowserFile(
    {
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      mimeType: "application/pdf",
      fileName: "MaarifOS_Ogretmen_Plani.pdf",
    },
    environment,
  );

  assert.equal(calls.revokedUrls.length, 0);
  assert.equal(calls.timers.length, 1);
  assert.equal(
    calls.timers[0].delayMs,
    BROWSER_FILE_DOWNLOAD_URL_LIFETIME_MS,
  );
  assert.ok(calls.timers[0].delayMs >= 30_000);
  assert.deepEqual(
    {
      href: calls.anchors[0].href,
      download: calls.anchors[0].download,
      rel: calls.anchors[0].rel,
      clickCount: calls.anchors[0].clickCount,
    },
    {
      href: "blob:maarifos-document",
      download: "MaarifOS_Ogretmen_Plani.pdf",
      rel: "noopener",
      clickCount: 1,
    },
  );
  assert.equal(calls.blobs[0].type, "application/pdf");
  assert.deepEqual(
    [...new Uint8Array(await calls.blobs[0].arrayBuffer())],
    [0x25, 0x50, 0x44, 0x46],
  );

  calls.timers[0].handler();
  assert.deepEqual(calls.revokedUrls, ["blob:maarifos-document"]);
  assert.equal(calls.anchors[0].removeCount, 1);
});

test("Uint8Array görünümünün yalnız seçili baytlarını indirir", async () => {
  const { calls, environment } = fixtureEnvironment();
  const source = new Uint8Array([1, 2, 3, 4, 5]);

  downloadBrowserFile(
    {
      bytes: source.subarray(1, 4),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "MaarifOS_Aylik_Plan.docx",
    },
    environment,
  );

  assert.deepEqual(
    [...new Uint8Array(await calls.blobs[0].arrayBuffer())],
    [2, 3, 4],
  );
  assert.equal(
    calls.blobs[0].type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
});
