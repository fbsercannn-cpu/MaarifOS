import assert from "node:assert/strict";
import test from "node:test";
import { studentContactKindFromRelationship, suggestParentFullName } from "../../src/core/domain/parent-surname-suggestion.ts";

test("anne ve baba için soyadı önerir; girdiyi değiştirmez", () => {
  const input = Object.freeze({ childLastName: " Yılmaz ", parentName: " Elif ", kind: "mother" });
  assert.equal(suggestParentFullName(input), "Elif Yılmaz");
  assert.equal(input.parentName, " Elif ");
  assert.equal(suggestParentFullName({ childLastName: "Kaya Demir", parentName: "Ali", kind: "father" }), "Ali Kaya Demir");
});
test("farklı veya çok sözcüklü mevcut adı, üçüncü kişiyi ve eksik soyadını tahminle değiştirmez", () => {
  for (const input of [
    { childLastName: "Yılmaz", parentName: "Elif Öztürk", kind: "mother" },
    { childLastName: "Yılmaz", parentName: "Elif Nur", kind: "mother" },
    { childLastName: "Yılmaz", parentName: "Ali Yılmaz", kind: "father" },
    { childLastName: "Yılmaz", parentName: "Elif", kind: "other" },
    { childLastName: "", parentName: "Elif", kind: "mother" },
    { childLastName: "Yılmaz", parentName: "", kind: "mother" },
    { childLastName: "IŞIK", parentName: "ışık", kind: "mother" },
    { childLastName: "x".repeat(120), parentName: "Elif", kind: "mother" },
  ]) assert.equal(suggestParentFullName(input), null);
});
test("anne-baba ilişki eşdeğerlerini Türkçe harflerle kanonikleştirir", () => {
  for (const value of ["Anne", " ANNESİ ", "annesi"]) assert.equal(studentContactKindFromRelationship(value), "mother");
  for (const value of ["Baba", " BABASI ", "babası"]) assert.equal(studentContactKindFromRelationship(value), "father");
  for (const value of ["Veli", "Teyze", "Anneanne", "Babaanne", "", "Üvey anne"]) assert.equal(studentContactKindFromRelationship(value), "other");
});
