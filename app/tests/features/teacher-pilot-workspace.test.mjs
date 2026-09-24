import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../src/features/teacher-pilot/TeacherPilotWorkspace.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/features/teacher-pilot/teacher-pilot-workspace.css", import.meta.url),
  "utf8",
);

test("pilot çalışma yüzeyi gerçek sonuç uydurmadan exact eşikleri ve ham alanları gösterir", () => {
  assert.match(source, /Gerçek pilot sonucu henüz yok/u);
  assert.match(source, /5 öğretmen × 4 görev ham ölçüm alanı/u);
  assert.match(source, /Toplam 20 ham görev; en az 19 doğru tamamlama/u);
  assert.match(source, /Ham süre medyanı en çok 25 saniye/u);
  assert.match(source, /hiçbiri 45 saniyeyi aşmaz/u);
  assert.match(source, /Yanlış çocuk\/kapsam ve sahte resmî tamamlandı olayı sıfırdır/u);
  assert.match(source, /Tekrar giriş medyanı sıfırdır/u);
  assert.match(source, /15 saniye yalnız P01 için ikincil tasarım hedefidir/u);
  assert.match(source, /winsorize edilmez/u);
  assert.match(source, /Yardım kullanıldı/u);
  assert.match(source, /Başarısız/u);
  assert.match(source, /Bırakıldı/u);
  assert.match(source, /Bu sayı pilotun kabul edildiği anlamına gelmez/u);
  assert.match(
    source,
    /doğrulanmış gerçek okul öncesi öğretmeniyle canlı yürütüldüğünü[\s\S]*?gözlemlediğimi beyan ederim/u,
  );
  assert.match(source, /disabled=\{running \|\| !exactParticipantSetup \|\| !observerAttestation\}/u);
  assert.doesNotMatch(source, /pilot (?:başarılı|geçti|onaylandı)/iu);
});

test("pilot çalışma yüzeyi dar ekranda tek kolona iner ve bütün kontroller en az 44px'tir", () => {
  assert.match(styles, /\.teacher-pilot-workspace select,[\s\S]*?min-height: 44px;/u);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?grid-template-columns: 1fr;/u);
  assert.match(styles, /:focus-visible[\s\S]*?outline: 3px solid/u);
});
