import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const prototypeSource = readFileSync(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);
const todaySource = readFileSync(
  new URL("../../src/features/today/TodayScreen.tsx", import.meta.url),
  "utf8",
);
const classroomSource = readFileSync(
  new URL("../../src/features/classroom/ClassroomScreen.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/prototype.css", import.meta.url),
  "utf8",
);

test("kilitli kayıt eylemleri chevron yerine kilit ve görünür neden taşır", () => {
  assert.match(prototypeSource, /capture-observation-readiness/);
  assert.match(prototypeSource, /capture-attendance-readiness/);
  assert.match(prototypeSource, /capture-plan-readiness/);
  assert.match(
    prototypeSource,
    /disabled=\{educationalWritesDisabled \|\| students\.length === 0\}[\s\S]{0,900}<LockClosedIcon className="capture-choice-lock"/,
  );
  assert.match(
    prototypeSource,
    /Kilitli · Önce sınıf listesini oluşturun/,
  );
  assert.match(prototypeSource, /className="capture-readiness-action"/);
  assert.match(prototypeSource, /Sınıf listesini oluştur/);
  assert.match(styles, /\.capture-choice-grid > button:disabled[\s\S]{0,240}opacity: 1/);
});

test("kilitli günlük plan eylemi hazırmış gibi görünmez ve çözüm yolunu açıklar", () => {
  assert.match(prototypeSource, /title=\{displayedPlanIsToday \? "Gün planı"/);
  assert.match(prototypeSource, /Günlük plan yazımı kilitli/);
  assert.match(
    prototypeSource,
    /Önce etkin veya hazırlanmış eğitim yılına haftalık plan bağlayın/,
  );
  assert.match(prototypeSource, /Çalışmayı bugün başlat/);
  assert.match(prototypeSource, /aria-describedby=\{[\s\S]{0,180}"plans-create-readiness"/);
  assert.match(styles, /\.plans-create-button:disabled[\s\S]{0,220}opacity: 1/);
});

test("hazırlık modunda gelecek planı açar ve gerçek kayıtları öğretmen başlatmasına bağlar", () => {
  assert.match(prototypeSource, /const planWritesDisabled =/);
  assert.match(
    prototypeSource,
    /disabled=\{planWritesDisabled\}[\s\S]{0,900}Etkinlik planla/,
  );
  assert.match(prototypeSource, /Gelecek günlük planı oluştur/);
  assert.match(prototypeSource, /Çalışmayı bugün başlat/);
  assert.match(prototypeSource, /Yoklama, uygulama ve gözlemi gerçek kayıt kullanımına aç/);
});

test("boş sınıfta tek kurulum CTA'sı korunur ve anlamsız araç çubuğu gizlenir", () => {
  assert.match(
    classroomSource,
    /\{summary\.activeStudentCount > 0 \? \([\s\S]{0,220}<div className="roster-toolbar">/,
  );
  const emptyBlock = classroomSource.match(
    /<div className="roster-empty"[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(emptyBlock);
  assert.doesNotMatch(emptyBlock, /> Çocuk ekle</);
  assert.match(classroomSource, /İlk çocuğu ekle/);
});

test("Bugün ilk katı tek satırlı tarih ve gerçek kilit ikonları kullanır", () => {
  assert.match(todaySource, /className="today-flow-meta"/);
  assert.match(todaySource, /<time>\{civilDateLabel\}<\/time>/);
  assert.match(todaySource, /className="today-priority-lock"/);
  assert.match(styles, /\.today-priority-card:disabled[\s\S]{0,240}opacity: 1/);
});

test("hazırlık modunda dönem kartları sıradaki işi tekrarlamaz; etkin dönemde dört düzey kompakt kalır", () => {
  assert.match(
    todaySource,
    /configuredClassroom !== null && !preparationNoticeIntegrated \? \([\s\S]{0,160}<section[\s\S]{0,120}className="teacher-cycle"/,
  );
  assert.match(todaySource, /Planlama ve belgeler/);
  assert.match(todaySource, /Dönem kayıtları/);
  assert.doesNotMatch(todaySource, /className="teacher-cycle-steps"/);
  assert.doesNotMatch(todaySource, /<em>\{stage\.detail\}<\/em>/);
  assert.doesNotMatch(todaySource, /Önceki günden: \{dayClosure\.previousCarryForward\.note\}/);
  assert.match(
    styles,
    /@media \(max-width: 520px\)[\s\S]{0,180}\.teacher-cycle-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
  );
});
