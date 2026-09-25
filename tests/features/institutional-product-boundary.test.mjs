import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("mağaza bilgi yüzeyi yalnız resmî alan adlarını ve doğrulanmış mağaza sınırını gösterir", async () => {
  const modal = await read("src/components/PwaInstallPromptModal.tsx");
  assert.match(modal, /Google Play ve App Store/u);
  assert.match(modal, /maarifos\.com/u);
  assert.match(modal, /maarifos\.net/u);
  assert.doesNotMatch(modal, /github\.io|fbsercannn|WebAPK|Ana Ekrana Ekle|Linki Kopyala/iu);
});

test("resmî web alanları tanıtım yüzeyidir ve URL ile tam uygulama erişimi vermez", async () => {
  const landing = await read("src/features/landing/MaarifLandingPage.tsx");
  const app = await read("src/App.tsx");
  assert.match(landing, /Bu site tanıtım amaçlıdır/u);
  assert.match(landing, /Google Play ve App Store yayınıyla başlayacak/u);
  assert.doesNotMatch(landing, /Uygulamayı aç|Bugünü hazırla|Sınıfıma geç|Planlama alanını aç/u);
  assert.match(app, /if \(officialPromotionHost\) return "landing"/u);
});

test("okul öncesi kimliği mali ünvan varsayımına dönmez", async () => {
  const passport = await read("src/services/zk-pedagogical-passport.ts");
  assert.match(passport, /issuerTeacher: params\.teacherName \|\| "Okul Öncesi Öğretmeni"/u);
  assert.doesNotMatch(passport, /Gelir Uzmanı|Maliye Bakanlığı/iu);
});

test("AI plan üretimi önce öğretmenin inceleyeceği taslağa dönüşür", async () => {
  const today = await read("src/features/simple-experience/SimpleTodayScreen.tsx");
  assert.match(today, /setPendingAiPlan\(newPlan\)/u);
  assert.match(today, /Kontrol ettim, bugüne kaydet/u);
  assert.match(today, /upsertDailyPlan\(pendingAiPlan\)/u);
  assert.doesNotMatch(today, /Günün resmî MEB planı başarıyla üretildi/u);
});

test("yerel veli bülteni resmî uygunluk iddiası değil öğretmen taslağıdır", async () => {
  const brain = await read("src/components/pedagogical-ai-brain.ts");
  assert.match(brain, /Öğretmen Onayına Hazır Veli Bülteni Taslağı/u);
  assert.doesNotMatch(brain, /MEB okul öncesi veli iletişim standartlarına uygun/iu);
});
