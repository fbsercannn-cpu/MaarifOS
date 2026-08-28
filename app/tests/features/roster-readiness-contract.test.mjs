import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classroomRosterDocumentMissingFields,
  classroomStudentProfileMissingFields,
} from "../../src/features/classroom/classroom-screen-model.ts";

const completePrintedFields = {
  id: "student-1",
  name: "Kurgu Öğrenci",
  status: "present",
  optionalCode: "27",
  nationalIdentityNumber: "10000000146",
  contacts: [{ phone: "+90 555 111 22 33" }],
};

test("doğum tarihi profil bilgisidir ancak basılmayan alan sınıf listesini engellemez", () => {
  assert.deepEqual(
    classroomStudentProfileMissingFields(completePrintedFields),
    ["doğum tarihi"],
  );
  assert.deepEqual(
    classroomRosterDocumentMissingFields(completePrintedFields),
    [],
  );
});

test("sınıf listesi hazır olma alanları basılı öğrenci no, T.C. kimlik ve veli telefonu ile birebir eşleşir", () => {
  assert.deepEqual(
    classroomRosterDocumentMissingFields({
      ...completePrintedFields,
      optionalCode: " ",
      nationalIdentityNumber: "",
      contacts: [{ phone: "  " }],
    }),
    ["öğrenci no", "T.C. kimlik", "veli iletişimi"],
  );
});

test("Belgeler yüzeyi doğum tarihini sınıf listesi zorunluluğu diye sunmaz ve görsel PDF eylemini söyler", () => {
  const source = readFileSync(
    new URL(
      "../../src/features/simple-experience/SimpleDocumentWorkspaceScreen.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /öğrenci no, T\.C\. kimlik, doğum tarihi veya veli iletişimi/u,
  );
  assert.match(
    source,
    /öğrenci no, T\.C\. kimlik veya veli iletişimi tamamlanmalı/u,
  );
  assert.match(source, /return "Görsel PDF indir"/u);
  assert.match(source, /Görsel A4 PDF bu cihazda indirildi/u);
  assert.match(source, /Sınıf listesini görsel PDF olarak paylaş/u);
});
