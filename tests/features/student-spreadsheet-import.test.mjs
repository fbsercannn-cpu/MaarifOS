import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { readStudentWorkbook, importCandidates, reviewImportCandidates, IMPORT_FIELDS, importSelectionStillReviewed } from "../../src/features/students/student-spreadsheet-import.ts";
import { commitStudentImport } from "../../src/features/students/student-import-service.ts";
import { upcomingStudentBirthdays } from "../../src/features/today/student-birthdays.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";

const today = "2026-09-07", now = new Date(`${today}T09:00:00.000Z`);
const headers = ["NO", "ADI SOYADI", "TC KİMLİK NO", "DOĞUM TARİHİ", "ADI", "TELEFONU", "MESLEĞİ", "ADI", "TELEFONU", "MESLEĞİ", "ADI SOYADI", "TELEFONU", "YAKINLIĞI", "ADRES"];
const groups = ["Ö Ğ R E N C İ N İ N", "", "", "", "A N N E N İ N", "", "", "B A B A N I N", "", "", "ARANACAK 3. KİŞİNİN"];
const row = ["12", "Kurgu Çocuk", "", "10.09.2021", "Kurgu Anne", "0555 000 00 01", "Mühendis", "Kurgu Baba", "0555 000 00 02", "Öğretmen", "Kurgu Yakın", "0555 000 00 03", "Teyze", "Kurgu Mahallesi 1"];
function workbook(bookType = "biff8", data = row) { const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["Veli iletişim listesi"], groups, headers, data, [], ["", "", "", "", "", "", "", "", "", "", "İmza"]]), "Sınıf"); return XLSX.write(book, { type: "array", bookType }); }
function candidate(name = "Kurgu Çocuk", extra = {}) { return { id: crypto.randomUUID(), sourceRow: 4, values: { ...Object.fromEntries(Object.keys(IMPORT_FIELDS).map(key => [key, ""])), displayName: name, ...extra } }; }

for (const [type, extension] of [["biff8", "xls"], ["xlsx", "xlsx"]]) test(`${extension} grouped Turkish reference maps all thirteen columns and keeps parent jobs`, () => {
  const [sheet] = readStudentWorkbook(workbook(type), `kurgu.${extension}`);
  assert.equal(sheet.suggestedHeader, 2);
  assert.equal(sheet.suggestedMapping.motherOccupation, 6); assert.equal(sheet.suggestedMapping.fatherOccupation, 9);
  const parsed = importCandidates(sheet, sheet.suggestedHeader, sheet.suggestedMapping);
  assert.equal(parsed.candidates.length, 1); assert.equal(parsed.excludedRows, 2);
  const [review] = reviewImportCandidates(parsed.candidates, [], today);
  assert.deepEqual(review.errors, []); assert.equal(review.profile.birthDate, "2021-09-10");
  assert.equal(review.profile.contacts[0].occupation, "Mühendis"); assert.equal(review.profile.contacts[1].occupation, "Öğretmen");
  assert.equal(review.profile.contacts[2].relationship, "Teyze"); assert.equal(review.profile.careDetails.homeAddress, "Kurgu Mahallesi 1");
  assert.ok(review.profile.contacts.every(contact => !contact.isAuthorizedPickup));
});
test("CSV flat parent headings and empty parent phone retain name/occupation", () => {
  const text = "Öğrenci adı soyadı;Anne adı;Anne mesleği;Baba telefonu\nKurgu Çocuk;Kurgu Anne;Mühendis;05550000002";
  const [sheet] = readStudentWorkbook(new TextEncoder().encode(text).buffer, "kurgu.csv");
  const [review] = reviewImportCandidates(importCandidates(sheet, sheet.suggestedHeader, sheet.suggestedMapping).candidates, [], today);
  assert.deepEqual(review.errors, []); assert.equal(review.profile.contacts[0].phone, ""); assert.equal(review.profile.contacts[0].occupation, "Mühendis");
  assert.equal(review.profile.contacts[1].isPrimary, true);
});
test("file type, size, repeated mapping and unconfigured name are rejected", () => {
  assert.throws(() => readStudentWorkbook(workbook(), "bad.pdf"), /dosyası seçin/);
  assert.throws(() => readStudentWorkbook(new ArrayBuffer(10 * 1024 * 1024 + 1), "bad.xls"), /10 MB/);
  const [sheet] = readStudentWorkbook(workbook(), "kurgu.xls");
  assert.throws(() => importCandidates(sheet, 2, {}), /eşleştirin/);
  assert.throws(() => importCandidates(sheet, 2, { displayName: 1, motherName: 1 }), /iki farklı/);
});
test("invalid dates/identity/phone fail validation without silently clearing data", () => {
  for (const fields of [{ birthDate: "31.02.2021" }, { birthDate: "2027-01-01" }, { nationalIdentityNumber: "11111111111" }, { motherPhone: "555", motherName: "Kurgu Anne" }]) {
    const c = candidate("Kurgu Çocuk", fields); const [review] = reviewImportCandidates([c], [], today);
    assert.equal(review.errors.length, 1); assert.deepEqual(c.values, review.candidate.values);
  }
});
test("same-file and archived/existing duplicate candidates stay in preview with explicit review flag", () => {
  const a = candidate("Işık Çocuk"), b = candidate("IŞIK ÇOCUK");
  const reviews = reviewImportCandidates([a, b], [{ id: "archive", name: "Işık Çocuk" }], today);
  assert.equal(reviews.length, 2); assert.ok(reviews.every(r => r.flag === "_MUKERRER_INCELE" && r.duplicateIds.length === 2));
});
test("whitespace cannot bypass identity or school number duplicates", () => {
  const c = candidate("Kurgu Farklı", { optionalCode: " K1 " });
  const [review] = reviewImportCandidates([c], [{ id: "one", name: "Kurgu Eski", optionalCode: "K1" }], today);
  assert.equal(review.flag, "_MUKERRER_INCELE");
  const [identityReview] = reviewImportCandidates([candidate("Kurgu Farklı", { nationalIdentityNumber: " 10000000146 " })], [{ id: "two", name: "Kurgu Eski", nationalIdentityNumber: "10000000146" }], today);
  assert.equal(identityReview.flag, "_MUKERRER_INCELE");
});
test("editing another row or a concurrent roster change invalidates the old selection acknowledgement", () => {
  const a = candidate("Kurgu Bir"), b = candidate("Kurgu İki");
  assert.equal(importSelectionStillReviewed(reviewImportCandidates([a, b], [], today)[0], []), true);
  b.values.displayName = a.values.displayName;
  const [duplicate] = reviewImportCandidates([a, b], [], today);
  assert.equal(importSelectionStillReviewed(duplicate, []), false);
  assert.equal(importSelectionStillReviewed(duplicate, [b.id]), true);
  const [newDuplicate] = reviewImportCandidates([a, b], [{ id: "new", name: "Kurgu Bir" }], today);
  assert.equal(importSelectionStillReviewed(newDuplicate, [b.id]), false);
});

const scope = { academicYearId: "00000000-0000-4000-8000-000000000701", classroomId: "00000000-0000-4000-8000-000000000702" };
function storeFixture() {
  const snapshot = createEmptySnapshot(), base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: today, schemaVersion: 1, deletedAt: null };
  snapshot.academicYears.push({ ...base, id: scope.academicYearId, name: "Kurgu Yıl", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  snapshot.classrooms.push({ ...base, id: scope.classroomId, academicYearId: scope.academicYearId, name: "Kurgu Sınıf", status: "active" });
  snapshot.settings.push({ ...base, ...scope, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE });
  return { snapshot, writes: 0, failAt: 0, async transaction(mode, collections, task) {
    const draft = structuredClone(this.snapshot);
    const result = await task({ getAll: async key => structuredClone(draft[key]), putMany: async (key, records) => { this.writes++; if (this.failAt && this.writes === this.failAt) throw new Error("Kurgu disk hatası"); for (const r of records) { const index = draft[key].findIndex(x => x.id === r.id); if (index >= 0) draft[key][index] = structuredClone(r); else draft[key].push(structuredClone(r)); } } });
    if (mode === "readwrite") this.snapshot = draft;
    return result;
  }, readSnapshot() { return structuredClone(this.snapshot); }, close() {} };
}
const selection = c => ({ candidate: c, acknowledgedDuplicateIds: [] });
test("atomic import creates enrollment without attendance and repeat cannot duplicate", async () => {
  const store = storeFixture(), c = candidate("Kurgu Çocuk", { motherName: "Kurgu Anne", motherOccupation: "Mühendis", childPrivateNotes: "Kurgu destek notu" });
  const result = await commitStudentImport(store, { scope, selections: [selection(c)], now });
  assert.equal(result.length, 1); assert.equal(store.snapshot.students[0].careDetails.childPrivateNotes, "Kurgu destek notu");
  assert.equal(store.snapshot.students[0].enrollments[0].classroomId, scope.classroomId); assert.equal(store.snapshot.attendanceRecords.length, 0);
  await assert.rejects(commitStudentImport(store, { scope, selections: [selection(c)], now }), /zaten kaydedilmiş/); assert.equal(store.snapshot.students.length, 1);
});
test("failure on second durable row rolls back all students", async () => {
  const store = storeFixture(); store.failAt = 2;
  await assert.rejects(commitStudentImport(store, { scope, selections: [selection(candidate("Kurgu Bir")), selection(candidate("Kurgu İki"))], now }), /disk/);
  assert.equal(store.snapshot.students.length, 0);
});
test("concurrent duplicate, changed scope and ended year fail before any student remains", async () => {
  const store = storeFixture(), c = candidate();
  await commitStudentImport(store, { scope, selections: [selection(c)], now });
  await assert.rejects(commitStudentImport(store, { scope, selections: [selection(candidate())], now }), /mükerrer/);
  await assert.rejects(commitStudentImport(store, { scope: { ...scope, classroomId: "other" }, selections: [selection(candidate("Kurgu Başka"))], now }), /sınıf değişti/);
  await assert.rejects(commitStudentImport(store, { scope, selections: [selection(candidate("Kurgu Başka"))], now: new Date("2028-01-01T09:00:00Z") }), /sona erdiği/);
  assert.equal(store.snapshot.students.length, 1);
});
test("all candidates stay available while reviewed distinct duplicate can be explicitly imported", async () => {
  const store = storeFixture(), a = candidate(), b = candidate();
  await commitStudentImport(store, { scope, selections: [selection(a)], now });
  const [review] = reviewImportCandidates([b], [{ id: a.id, name: a.values.displayName }], today);
  await commitStudentImport(store, { scope, selections: [{ candidate: b, acknowledgedDuplicateIds: review.duplicateIds }], now });
  assert.equal(store.snapshot.students.length, 2);
  assert.equal(store.snapshot.students[1].spreadsheetImportReview._MUKERRER_INCELE, true);
  assert.deepEqual(store.snapshot.students[1].spreadsheetImportReview.duplicateCandidateIds, [a.id]);
});
test("birthdays include day zero to three, reject fourth day and absent/archived/invalid profiles", () => {
  const students = [0, 1, 2, 3, 4].map(offset => ({ id: String(offset), name: `Kurgu ${offset}`, birthDate: `2021-09-${String(7 + offset).padStart(2, "0")}` }));
  students.push({ id: "archived", name: "Kurgu Arşiv", birthDate: "2021-09-07", enrollmentStatus: "left" }, { id: "missing", name: "Kurgu Eksik" }, { id: "bad", name: "Kurgu Geçersiz", birthDate: "2021-02-31" });
  assert.deepEqual(upcomingStudentBirthdays(students, today).map(b => b.daysUntil), [0, 1, 2, 3]);
});
test("birthdays cross year end and explicitly handle February 29", () => {
  assert.equal(upcomingStudentBirthdays([{ id: "one", name: "Kurgu Yıl", birthDate: "2021-01-01" }], "2026-12-29")[0].daysUntil, 3);
  const leap = upcomingStudentBirthdays([{ id: "one", name: "Kurgu Şubat", birthDate: "2020-02-29" }], "2027-02-25")[0];
  assert.equal(leap.civilDate, "2027-02-28"); assert.equal(leap.leapDayAdjusted, true);
  assert.equal(upcomingStudentBirthdays([{ id: "one", name: "Kurgu Şubat", birthDate: "2020-02-29" }], "2028-02-26")[0].civilDate, "2028-02-29");
});
