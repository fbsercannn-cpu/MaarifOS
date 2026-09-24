import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOME_ADDRESS_PARTS,
  STUDENT_HOME_ADDRESS_LIMITS,
  formatStudentHomeAddress,
  isStudentHomeAddressParts,
  normalizeStudentHomeAddressParts,
} from "../../src/core/domain/student-home-address.ts";
import {
  normalizeStudentCareDetails,
  normalizeStudentProfile,
  studentProfileFromRecord,
} from "../../src/core/domain/student.ts";
import { isEntityRecord } from "../../src/core/repository/entities.ts";
import { createClassRosterDocument } from "../../src/features/classroom/class-roster-document.ts";
import { classRosterFixture } from "../fixtures/class-roster-fixture.mjs";

const parts = { district: "Acıpayam", province: "Denizli", neighborhood: "Aşağı", streetAddress: "Pancar Caddesi No: 12 / 2" };
const address = "Pancar Caddesi No: 12 / 2 Aşağı Mahalle Acıpayam Denizli";
const emptyParts = { district: "", province: "", neighborhood: "", streetAddress: "" };
const recordBase = { id: "00000000-0000-4000-8000-00000000e010", createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", schemaVersion: 10 };

test("adres dört alanı NFC ve boşluk kuralıyla kanonikleştirir, kaynak nesneyi değiştirmez", () => {
  const source = { district: " Acıpayam ", province: "Denizli", neighborhood: " As\u0327ag\u0306ı ", streetAddress: " Pancar  Caddesi\nNo: 12 / 2 " };
  const before = structuredClone(source);
  assert.deepEqual(normalizeStudentHomeAddressParts(source), parts);
  assert.deepEqual(source, before);
  assert.equal(formatStudentHomeAddress(parts), address);
  assert.equal(isStudentHomeAddressParts(parts), true);
  assert.equal(isStudentHomeAddressParts(source), false);
  assert.deepEqual(DEFAULT_HOME_ADDRESS_PARTS, { ...emptyParts, district: "Acıpayam", province: "Denizli" });
});

test("Mahalle, Mahallesi ve Mah. eklerini iki kez yazmaz", () => {
  for (const neighborhood of ["Aşağı Mahalle", "Aşağı Mahallesi", "Aşağı Mah.", "Aşağı MAHALLESİ"]) {
    assert.equal(formatStudentHomeAddress({ ...parts, neighborhood }), `Pancar Caddesi No: 12 / 2 ${neighborhood} Acıpayam Denizli`);
  }
  assert.equal(formatStudentHomeAddress({ ...parts, neighborhood: "Aşağı" }), address);
  assert.equal(formatStudentHomeAddress(emptyParts), "");
});

test("adres alanı sınırları tam uzunlukta kabul eder ve bir fazlasını reddeder", () => {
  for (const [field, limit] of Object.entries(STUDENT_HOME_ADDRESS_LIMITS)) {
    const boundary = { ...emptyParts, [field]: "x".repeat(limit) };
    assert.equal(normalizeStudentHomeAddressParts(boundary)[field].length, limit);
    assert.equal(isStudentHomeAddressParts(boundary), true);
    assert.throws(() => normalizeStudentHomeAddressParts({ ...boundary, [field]: "x".repeat(limit + 1) }), /en fazla/u);
  }
});

test("adres nesnesinde eksik, bilinmeyen, hatalı tip ve kontrol karakteri reddedilir", () => {
  const malformed = [undefined, null, [], "adres", {}, { ...parts, district: 42 }, { ...parts, province: null }, { ...parts, unknownField: "x" }, { ...parts, streetAddress: "Cadde\u0000No" }];
  const missing = { ...parts }; delete missing.neighborhood; malformed.push(missing);
  for (const value of malformed) {
    assert.throws(() => normalizeStudentHomeAddressParts(value));
    assert.equal(isStudentHomeAddressParts(value), false);
  }
});

test("v10 profil birleşik adresi parçalardan üretir; legacy adres ve diğer bakım alanları korunur", () => {
  const profile = normalizeStudentProfile({ displayName: "Kurgu Adres Çocuğu", careDetails: { homeAddress: "Eski metin", homeAddressParts: parts, parentsSeparated: true, childPrivateNotes: "Kurgu destek notu" } }, "2026-09-07");
  assert.equal(profile.profileSchemaVersion, 10);
  assert.deepEqual(profile.careDetails, { homeAddress: address, homeAddressParts: parts, parentsSeparated: true, childPrivateNotes: "Kurgu destek notu" });
  assert.equal(isEntityRecord("students", { ...recordBase, ...profile }), true);
  assert.deepEqual(studentProfileFromRecord({ ...recordBase, ...profile })?.careDetails, profile.careDetails);
  const legacyAddress = "Eski adres, özgün serbest metin No: 7 / B; Merkezefendi / Denizli";
  const legacyRecord = { ...recordBase, displayName: "Kurgu Eski Çocuk", profileSchemaVersion: 9, careDetails: { homeAddress: legacyAddress } };
  assert.equal(isEntityRecord("students", legacyRecord), true);
  assert.equal(studentProfileFromRecord(legacyRecord)?.careDetails?.homeAddress, legacyAddress);
  assert.equal(studentProfileFromRecord(legacyRecord)?.careDetails?.homeAddressParts, undefined);
  assert.equal(normalizeStudentCareDetails({ homeAddressParts: emptyParts }), undefined);
});

test("canlı formatter toplam sınırda hata fırlatmaz; kayıt sınırı 500 karakteri kesmeden reddeder", () => {
  const exactParts = { district: "D".repeat(80), province: "İ".repeat(80), neighborhood: "N".repeat(29), streetAddress: "S".repeat(300) };
  assert.equal(formatStudentHomeAddress(exactParts).length, 500);
  assert.equal(normalizeStudentCareDetails({ homeAddressParts: exactParts }).homeAddress.length, 500);
  const tooLong = { ...exactParts, neighborhood: "N".repeat(30) };
  assert.equal(formatStudentHomeAddress(tooLong).length, 501);
  assert.deepEqual(normalizeStudentHomeAddressParts(tooLong), tooLong, "parça sınırları toplam sınırdan ayrıdır");
  assert.throws(() => normalizeStudentCareDetails({ homeAddressParts: tooLong }), /500/u);
});

test("ham öğrenci repository sınırı uyumsuz izdüşümü ve kanonik olmayan parçaları reddeder", () => {
  const profile = normalizeStudentProfile({ displayName: "Kurgu Adres Çocuğu", careDetails: { homeAddressParts: parts } }, "2026-09-07");
  const source = { ...recordBase, ...profile };
  assert.equal(isEntityRecord("students", source), true);
  for (const careDetails of [
    { ...profile.careDetails, homeAddress: "Başka adres" },
    { ...profile.careDetails, homeAddressParts: { ...parts, district: " Acıpayam " } },
    { ...profile.careDetails, homeAddressParts: { ...parts, postalCode: "20000" } },
  ]) assert.equal(isEntityRecord("students", { ...source, careDetails }), false);
});

test("sınıf belgesi v10 birleşik adresini ilgili çocuğun tam genişlikteki bandında eksiksiz gösterir", () => {
  const input = classRosterFixture(1);
  input.snapshot.students[0].careDetails = normalizeStudentCareDetails({ homeAddressParts: parts });
  input.snapshot.students[0].profileSchemaVersion = 10;
  const document = createClassRosterDocument(input);
  const band = document.html.match(/<tr class="student-detail-band" data-student-sequence="1">([\s\S]*?)<\/tr>/u)?.[1];
  assert.ok(band, "Adres, ilgili çocuk numarasını taşıyan devam bandında olmalıdır.");
  assert.ok(band.includes('colspan="14"'));
  assert.ok(band.includes(`Ev adresi: ${address}`));
});
