import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const safetyPanelSource = await readFile(
  new URL("../../src/features/students/StudentProfileSafetyPanels.tsx", import.meta.url),
  "utf8",
);
const simpleClassroomSource = await readFile(
  new URL("../../src/features/simple-experience/SimpleClassroomScreen.tsx", import.meta.url),
  "utf8",
);
const prototypeSource = await readFile(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);
const overviewSource = await readFile(
  new URL("../../src/features/students/StudentProfileOverviewPanels.tsx", import.meta.url),
  "utf8",
);

test("öğrenci profilinde sağlık, acil iletişim ve teslim yetkisi alanları eksiksizdir", () => {
  for (const label of [
    "Bilinen alerjiler",
    "Beslenme gereksinimleri",
    "İlaç ve uygulama notu",
    "Acil durumda bilinmesi gerekenler",
    "Ev adresi",
    "Acil durumda aranabilir",
    "Çocuğu teslim alabilir",
    "Hekim / sağlık birimi",
    "Sağlık cihazı veya sürekli destek",
    "Veli e-posta adresi",
    "Aile eğitimi ihtiyaçları",
    "Aile katılım tercihleri",
    "Fotoğraf / video kullanım formu",
    "Okul dışı gezi / öğrenme formu",
    "Dijital iletişim formu",
    "Formların son kontrol tarihi",
  ]) {
    assert.match(safetyPanelSource, new RegExp(label));
  }
  assert.match(safetyPanelSource, /cihazda şifreli saklanır/);
  assert.match(safetyPanelSource, /standart gözlem çıktısına eklenmez/);
});

test("basit sınıf akışı güvenlik profiline tek dokunuşla gider ve alerji uyarısını gösterir", () => {
  assert.match(simpleClassroomSource, /Sağlık \/ teslim/);
  assert.match(simpleClassroomSource, /onOpenProfile\(student\.id, "care"\)/);
  assert.match(simpleClassroomSource, /Alerji notu var/);
  assert.match(prototypeSource, /studentProfileTab === "care"/);
  assert.match(overviewSource, />\s*Güvenlik\s*</);
  assert.match(overviewSource, />\s*Aile & izinler\s*</);
  assert.match(prototypeSource, /lazy\(.*StudentProfileSafetyPanels/s);
  assert.match(prototypeSource, /lazy\(.*StudentProfileOverviewPanels/s);
});
