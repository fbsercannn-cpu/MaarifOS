import test from "node:test";
import assert from "node:assert/strict";
import { saveDocumentVersion, listDocumentVersions, documentVersionFile } from "../../src/features/documents/document-history-service.ts";
import { GrowthMemoryStore, growthScope, growthStudents } from "../fixtures/growth-measurements-fixture.mjs";
const command = (text = "original") => ({ file: { bytes: new TextEncoder().encode(`%PDF-1.4\n${text}\n%%EOF`), mimeType: "application/pdf", fileName: "Kurgu.pdf" }, title: "Kurgu belge", selection: { fields: ["name"], studentIds: [growthStudents.ada], periodStart: "2026-09-07", periodEnd: "2026-09-30", layout: "daily-classroom" }, now: new Date("2027-06-30T09:00:00Z") });
test("history durable payload preserves exact versions; retries deduplicate and validates typed records", async () => {
  const store = new GrowthMemoryStore(), context = { store, scope: growthScope };
  const first = await saveDocumentVersion(context, command());
  const again = await saveDocumentVersion(context, command());
  assert.equal(again.id, first.id);
  const second = await saveDocumentVersion(context, command("changed"));
  assert.notEqual(second.id, first.id);
  const reloaded = new GrowthMemoryStore(JSON.parse(JSON.stringify(await store.readSnapshot())));
  assert.equal((await listDocumentVersions({ store: reloaded, scope: growthScope })).length, 2);
  assert.deepEqual((await documentVersionFile(first)).bytes, command().file.bytes);
  assert.deepEqual(first.selection, command().selection);
  await assert.rejects(documentVersionFile({ ...first, sha256: "0".repeat(64) }), /bütünlüğü/);
});
test("history rejects stale/invalid payload before write and keeps earlier versions on disk failure", async () => {
  const store = new GrowthMemoryStore(), context = { store, scope: growthScope };
  await saveDocumentVersion(context, command()); const before = await store.readSnapshot();
  await assert.rejects(saveDocumentVersion(context, { ...command("changed"), assertCurrent: async () => { throw new Error("source changed"); } }), /source changed/);
  store.failWrites = true; await assert.rejects(saveDocumentVersion(context, command("changed")), /kesintisi/);
  assert.deepEqual(await store.readSnapshot(), before);
  await assert.rejects(saveDocumentVersion(context, { ...command(), file: { ...command().file, bytes: new Uint8Array(2 * 1024 * 1024 + 1) } }), /2 MB/);
});
