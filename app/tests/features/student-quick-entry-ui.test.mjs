import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [sheetSource, prototypeSource, prototypeCssSource, classroomCssSource] = await Promise.all([
  readFile(
    new URL(
      "../../src/features/classroom/ClassroomToolsSheets.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/prototype.css", import.meta.url), "utf8"),
  readFile(
    new URL("../../src/features/classroom/classroom-tools-sheets.css", import.meta.url),
    "utf8",
  ),
]);

test("hızlı öğrenci kaydı ilk görünümde adı ve kapatan birincil eylemi öne çıkarır", () => {
  assert.match(sheetSource, /snap=\{0\.9\}/);
  assert.match(sheetSource, /onSubmit=\{\(event\) => \{[\s\S]*?submitStudent\("close"\)/);
  assert.match(sheetSource, /className="sheet-primary"[\s\S]*?type="submit"[\s\S]*?>\s*Kaydet ve kapat\s*</);
  assert.match(sheetSource, /<details className="student-optional-details">/);
  assert.doesNotMatch(sheetSource, /<details className="student-optional-details" open/u);
  assert.match(sheetSource, /<summary>[\s\S]*?İsteğe bağlı çocuk ve veli bilgileri[\s\S]*?ChevronDownIcon[\s\S]*?<\/summary>/);
});

test("isteğe bağlı kimlik ve veli alanları tek kapalı ayrıntıda korunur", () => {
  assert.match(sheetSource, />\s*Öğrenci numarası\s*</);
  assert.match(sheetSource, />\s*Doğum tarihi\s*</);
  assert.match(sheetSource, /max=\{civilDate\}/);
  assert.match(sheetSource, /boşsa sınıfın yaş bandı kullanılır/);
  assert.match(sheetSource, />\s*T\.C\. kimlik numarası\s*</);
  assert.match(sheetSource, />\s*Yakınlığı\s*</);
  assert.match(sheetSource, />\s*Yakının adı ve soyadı\s*</);
  assert.match(sheetSource, />\s*Yakının cep telefonu\s*</);
  assert.doesNotMatch(sheetSource, /type="checkbox"[\s\S]{0,120}(?:onay|kabul)/iu);
});

test("seri giriş ikincil eylem olarak formu açık tutar ve eklenen çocuk sayısını canlı bildirir", () => {
  assert.match(sheetSource, /className="student-quick-entry-next"[\s\S]*?type="button"[\s\S]*?submitStudent\("next"\)/);
  assert.match(sheetSource, />\s*Kaydet ve sıradakini ekle\s*</);
  assert.match(sheetSource, />\s*Kaydet ve kapat\s*</);
  assert.match(sheetSource, /students\.length - submittedStudentCountRef\.current/);
  assert.match(sheetSource, /const saved = await onAddStudent\(relationship, guardianKind\);[\s\S]*?if \(!saved\)/);
  assert.match(sheetSource, /studentContactKindFromRelationship\(relationship\)/);
  assert.match(sheetSource, /continuingSeriesRef\.current = true;[\s\S]*?onAddOpenChange\(true\)/);
  assert.match(sheetSource, /role="status"/);
  assert.match(sheetSource, /aria-live="polite"/);
  assert.match(sheetSource, /Bu seride \{addedStudentCount\} çocuk eklendi\./);
  assert.doesNotMatch(sheetSource, /Seri girişe hazır\./);
});

test("dar telefonda hızlı kayıt alanları tek sütuna iner ve en az 44 piksel dokunma alanını korur", () => {
  assert.match(
    prototypeCssSource,
    /@media \(max-width: 370px\)[\s\S]*?\.student-profile-form-grid\s*\{\s*grid-template-columns:\s*1fr;/,
  );
  assert.match(
    prototypeCssSource,
    /\.student-profile-form input,[\s\S]*?min-height:\s*48px;/,
  );
  assert.match(prototypeCssSource, /\.sheet-primary,[\s\S]*?min-height:\s*44px;/);
  assert.match(classroomCssSource, /\.student-quick-entry-next[\s\S]*?min-height:\s*44px;/);
  assert.match(classroomCssSource, /\.student-optional-details > summary[\s\S]*?min-height:\s*44px;/);
});

test("hızlı kayıt TCKN ve telefonu doğrular, veli kaydını öncelikli kişi olarak saklar", () => {
  assert.match(prototypeSource, /isValidStudentNationalIdentityNumber\(nationalIdentityNumber\)/);
  assert.match(prototypeSource, /normalizeStudentPhone\(guardianPhone\)/);
  assert.match(prototypeSource, /relationship: guardianRelationshipInput/);
  assert.match(prototypeSource, /kind: guardianKind/);
  assert.match(prototypeSource, /isPrimary: Boolean\(normalizedGuardianPhone\)/);
  assert.match(prototypeSource, /\{ optionalCode \}/);
  assert.match(prototypeSource, /\{ nationalIdentityNumber \}/);
  assert.doesNotMatch(sheetSource, /console\.(?:log|info|warn|error)/);
});

test("tam profilde eski isteğe bağlı kod alanı öğrenci numarası olarak adlandırılır", () => {
  const profileCodeBlock = prototypeSource.match(
    /<label htmlFor="student-profile-code">[\s\S]*?<\/label>/,
  )?.[0];
  assert.ok(profileCodeBlock);
  assert.match(profileCodeBlock, /Öğrenci numarası/);
  assert.match(profileCodeBlock, /placeholder="Örn\. 27"/);
  assert.doesNotMatch(profileCodeBlock, /İsteğe bağlı kod/);
});
