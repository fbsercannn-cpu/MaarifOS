import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("1. Viewport yakınlaştırmayı ve güvenli ekran kenarlarını destekler", () => {
  const indexPath = path.join(root, "index.html");
  assert.ok(existsSync(indexPath), "index.html mevcut olmalıdır");
  const html = readFileSync(indexPath, "utf8");

  assert.ok(
    html.includes('name="viewport"'),
    "index.html içinde viewport meta etiketi tanımlı olmalıdır",
  );
  assert.ok(
    !html.includes("maximum-scale=1.0") && !html.includes("user-scalable=no"),
    "Kullanıcının yakınlaştırması engellenmemelidir",
  );
  assert.ok(
    html.includes("viewport-fit=cover"),
    "Viewport etiketi çentikli ekranlar için viewport-fit=cover içermelidir",
  );
});

test("2. Zero Horizontal Drift & Pan-Y: styles.css tek sayfa kararlılık kurallarını içerir", () => {
  const stylesPath = path.join(root, "src/styles.css");
  assert.ok(existsSync(stylesPath), "src/styles.css mevcut olmalıdır");
  const css = readFileSync(stylesPath, "utf8");

  assert.ok(
    css.includes("overflow-x: hidden !important;"),
    "styles.css içinde overflow-x hidden kuralı bulunmalıdır",
  );
  assert.ok(
    css.includes("max-width: 100vw !important;"),
    "styles.css içinde max-width 100vw kuralı bulunmalıdır",
  );
  assert.ok(
    css.includes("overscroll-behavior-x: none !important;"),
    "styles.css içinde overscroll-behavior-x none kuralı bulunmalıdır",
  );
  assert.ok(
    css.includes("touch-action: pan-y pinch-zoom !important;"),
    "styles.css içinde touch-action pan-y kuralı bulunmalıdır",
  );
});

test("3. View Transitions API: styles.css donanım hızlandırmalı rota geçiş animasyonunu içerir", () => {
  const stylesPath = path.join(root, "src/styles.css");
  const css = readFileSync(stylesPath, "utf8");

  assert.ok(
    css.includes("::view-transition-old(root)"),
    "::view-transition-old(root) pseudo elementi tanımlı olmalıdır",
  );
  assert.ok(
    css.includes("::view-transition-new(root)") && css.includes("prefers-reduced-motion: reduce"),
    "::view-transition-new(root) pseudo elementi tanımlı olmalıdır",
  );
});

test("4. Resmî Formlar Mobil Tablo Bükümü & Dikey Kart Modu: official-forms.css kuralları", () => {
  const formsCssPath = path.join(root, "src/features/official-forms/official-forms.css");
  assert.ok(existsSync(formsCssPath), "official-forms.css mevcut olmalıdır");
  const css = readFileSync(formsCssPath, "utf8");

  assert.ok(
    css.includes("table-layout: fixed !important;"),
    "official-forms.css içinde mobil tablo sabit layout kuralı bulunmalıdır",
  );
  assert.ok(
    css.includes("word-break: break-word !important;") || css.includes("overflow-wrap: anywhere !important;"),
    "official-forms.css içinde taşmayı önleyen kelime bölme kuralı bulunmalıdır",
  );
  assert.ok(
    css.includes(".of-checklist-cards"),
    ".of-checklist-cards sınıfı tanımlı olmalıdır",
  );
  assert.ok(
    css.includes(".of-checklist-month-chip"),
    ".of-checklist-month-chip sınıfı tanımlı olmalıdır",
  );
  assert.ok(
    css.includes(".of-checklist-table-wrapper"),
    ".of-checklist-table-wrapper sınıfı tanımlı olmalıdır",
  );
});

test("5. EK-15 Mobil Kart Modu: OfficialMonthlyPlanChecklistForm.tsx viewMode ve kart desteği", () => {
  const formTsxPath = path.join(root, "src/features/official-forms/OfficialMonthlyPlanChecklistForm.tsx");
  assert.ok(existsSync(formTsxPath), "OfficialMonthlyPlanChecklistForm.tsx mevcut olmalıdır");
  const tsx = readFileSync(formTsxPath, "utf8");

  assert.ok(
    tsx.includes("viewMode") && tsx.includes("setViewMode"),
    "Bileşen viewMode state'i barındırmalıdır",
  );
  assert.ok(
    tsx.includes("of-checklist-cards"),
    "Bileşen of-checklist-cards kapsayıcısını render etmelidir",
  );
  assert.ok(
    tsx.includes("of-checklist-month-chip"),
    "Bileşen ay seçimi için of-checklist-month-chip kullanmalıdır",
  );
});

test("6. Apple HIG Web Vibration API: Dokunsal Geri Bildirim Entegrasyonu", () => {
  const hapticsPath = path.join(root, "src/core/haptics.ts");
  assert.ok(existsSync(hapticsPath), "src/core/haptics.ts mevcut olmalıdır");
  const hapticsCode = readFileSync(hapticsPath, "utf8");
  assert.ok(
    hapticsCode.includes("navigator.vibrate"),
    "haptics.ts içinde navigator.vibrate çağrısı olmalıdır",
  );

  const quickAttendancePath = path.join(root, "src/features/attendance/QuickAttendanceGrid.tsx");
  const quickAttendanceCode = readFileSync(quickAttendancePath, "utf8");
  assert.ok(
    quickAttendanceCode.includes("triggerHaptic"),
    "QuickAttendanceGrid.tsx triggerHaptic çağırmalıdır",
  );

  const attendancePanelsPath = path.join(root, "src/features/attendance/AttendancePanels.tsx");
  const attendancePanelsCode = readFileSync(attendancePanelsPath, "utf8");
  assert.ok(
    attendancePanelsCode.includes("triggerHaptic"),
    "AttendancePanels.tsx triggerHaptic çağırmalıdır",
  );
});
