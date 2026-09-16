import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OfflineBoundary,
  SecurityViolation,
  StorageIntegrityError,
  StorageTransientError,
  ValidationError,
} from "../../src/core/errors/application-errors.ts";
import { TeacherOwnedPlanError } from "../../src/core/domain/teacher-owned-plan.ts";
import {
  TEACHER_FEEDBACK_CODES,
  createTeacherFeedback,
} from "../../src/features/feedback/teacher-feedback.ts";

test("pedagojik kaynak günü hatası yeniden kaydetme döngüsü yerine kaynak seçimine döner", () => {
  const feedback = createTeacherFeedback(
    new Error("Pedagojik etkinlik kaynağı plan günüyle uyuşmuyor."),
  );

  assert.equal(feedback.code, "plan.source-date");
  assert.equal(feedback.severity, "error");
  assert.equal(feedback.supportCode, "PLAN-DATE-001");
  assert.deepEqual(feedback.action, {
    id: "select-activity",
    label: "Etkinliği yeniden seç",
  });
  assert.match(feedback.detail, /Taslağınız korunuyor/);
});

test("öğretmen geri bildirim kodu sözleşmesi benzersizdir ve tüm plan readiness kodlarını kapsar", () => {
  assert.equal(new Set(TEACHER_FEEDBACK_CODES).size, TEACHER_FEEDBACK_CODES.length);
  for (const code of [
    "plan.activity",
    "plan.title",
    "plan.target",
    "plan.child-scope",
    "plan.date-format",
    "plan.week-range",
    "plan.calendar-day",
    "plan.age-profile",
    "plan.program-profile",
    "plan.time",
    "plan.flow",
  ]) {
    assert.ok(TEACHER_FEEDBACK_CODES.includes(code), `${code} sözleşmede bulunamadı`);
  }
});

test("tarih biçimi, hafta aralığı, eksik yaş bandı ve profil uyuşmazlığı ayrı kodlanır", () => {
  const cases = [
    ["Plan günü YYYY-AA-GG biçiminde olmalıdır.", "plan.date-format", "PLAN-DATE-002"],
    [
      "Plan tarihi kayıtlı kaynak haftanın dışına taşınamaz.",
      "plan.week-range",
      "PLAN-WEEK-001",
    ],
    [
      "Plan hedeflerini açmak için sınıf profilinde 36–48, 48–60 veya 60–72 ay resmî yaş bandını seçin.",
      "plan.age-profile",
      "PLAN-AGE-001",
    ],
    [
      "Plan program profili aktif sınıfın kayıtlı program profiliyle uyuşmuyor.",
      "plan.program-profile",
      "PLAN-PROGRAM-001",
    ],
  ];

  for (const [message, code, supportCode] of cases) {
    const feedback = createTeacherFeedback(new Error(message));
    assert.equal(feedback.code, code);
    assert.equal(feedback.supportCode, supportCode);
  }
});

test("etkinlik, başlık ve resmî öğretim günü eksikleri kendi readiness koduna dönüşür", () => {
  const cases = [
    ["Etkinlik başlığı zorunludur.", "plan.activity", "PLAN-ACTIVITY-001"],
    ["Plan başlığı zorunludur.", "plan.title", "PLAN-TITLE-001"],
    [
      "16 Kasım 2026 resmî MEB çalışma takviminde öğretim günü değildir.",
      "plan.calendar-day",
      "PLAN-CALENDAR-001",
    ],
  ];

  for (const [message, code, supportCode] of cases) {
    const feedback = createTeacherFeedback(new Error(message));
    assert.equal(feedback.code, code);
    assert.equal(feedback.supportCode, supportCode);
  }
});

test("genel program, hedef, saat ve akış sözleri plan hatası diye yanlış sınıflandırılmaz", () => {
  for (const message of [
    "Program profili ekranı bugün güncellendi.",
    "TYMM hedefi kartı öğretmene gösterildi.",
    "Başlangıç saati duyurusu hazırlandı.",
    "Günlük akış tanıtım metni kaydedildi.",
  ]) {
    assert.equal(createTeacherFeedback(new Error(message)).code, "unknown", message);
  }
});

test("hafta, hedef, çocuk ve saat uyarıları kararlı eylem kodları taşır", () => {
  const cases = [
    [
      "Plan tarihi kayıtlı kaynak haftanın dışına taşınamaz.",
      "plan.week-range",
      "use-source-week",
    ],
    ["Plan için en az bir program hedefi seçilmelidir.", "plan.target", "select-target"],
    ["En az bir çocuk seçerek çocuk kapsamını tamamlayın.", "plan.child-scope", "select-whole-class"],
    ["Etkinlik bitiş saati başlangıç saatinden sonra olmalıdır.", "plan.time", "restore-class-time"],
  ];

  for (const [message, code, actionId] of cases) {
    const feedback = createTeacherFeedback(new Error(message));
    assert.equal(feedback.code, code);
    assert.equal(feedback.action?.id, actionId);
    assert.match(feedback.supportCode, /^[A-Z]+-[A-Z]+-\d{3}$/);
  }
});

test("öğretmen planı kodlu hataları conflict, bütünlük ve alan uyarılarına ayrılır", () => {
  const stale = createTeacherFeedback(
    new TeacherOwnedPlanError(
      "concurrent-update",
      "Plan başka bir ekranda değiştirildi; güncel kaydı açın.",
    ),
  );
  assert.equal(stale.code, "plan.conflict");
  assert.equal(stale.severity, "warning");

  const integrity = createTeacherFeedback(
    new TeacherOwnedPlanError("graph-integrity", "Plan zinciri doğrulanamadı."),
  );
  assert.equal(integrity.code, "plan.integrity");
  assert.equal(integrity.severity, "error");
  assert.equal(integrity.supportCode, "PLAN-INTEGRITY-001");

  const scope = createTeacherFeedback(
    new TeacherOwnedPlanError("active-scope-required", "Etkin eğitim yılı bulunamadı."),
  );
  assert.equal(scope.code, "classroom.scope");
  assert.equal(scope.supportCode, "CLASS-SCOPE-001");
});

test("uygulama hata türleri öğretmen için doğru önem ve kurtarma davranışına dönüşür", () => {
  assert.deepEqual(
    createTeacherFeedback(new StorageTransientError("Kota geçici olarak dolu.")),
    {
      code: "device.storage",
      severity: "error",
      title: "Cihaz kaydı tamamlanamadı",
      detail:
        "Taslağınız korunuyor. Cihazda yeterli alan olduğunu kontrol edip işlemi yeniden deneyin.",
      supportCode: "DEVICE-STORAGE-001",
      action: { id: "retry", label: "Yeniden dene" },
      technicalDetail: "Kota geçici olarak dolu.",
    },
  );
  assert.equal(
    createTeacherFeedback(new StorageIntegrityError("Bütünlük bozuk.")).severity,
    "error",
  );
  assert.equal(
    createTeacherFeedback(new SecurityViolation("Yetki sınırı.")).code,
    "security.boundary",
  );
  assert.equal(
    createTeacherFeedback(new OfflineBoundary("Ağ yok.")).action?.id,
    "retry",
  );
  assert.equal(
    createTeacherFeedback(new ValidationError("Alan eksik."), {
      fallbackDetail: "İşaretli alanı tamamlayın.",
    }).detail,
    "İşaretli alanı tamamlayın.",
  );
});

test("tanınmayan hata ana metinde açığa çıkmaz; teknik ayrıntı kimlikleri temizler", () => {
  const feedback = createTeacherFeedback(
    new Error(
      "Gizli altyapı mesajı 97bca340-a3b8-4604-98fc-926378291bba ve 12345678901",
    ),
  );

  assert.equal(feedback.code, "unknown");
  assert.equal(feedback.title, "İşlem tamamlanamadı");
  assert.doesNotMatch(feedback.detail, /Gizli altyapı/);
  assert.equal(
    feedback.technicalDetail,
    "Gizli altyapı mesajı [kimlik] ve [numara]",
  );
  assert.equal(feedback.supportCode, "UNEXPECTED-001");
});

test("gözlem, program bağlantısı ve değerlendirme ekranları ham hatayı ana metinde göstermez", () => {
  const prototypeSource = readFileSync(
    new URL("../../src/Prototype.tsx", import.meta.url),
    "utf8",
  );
  const screenSections = [
    ["EvidenceCaptureScreen", "function EvidenceLinkScreen"],
    ["EvidenceLinkScreen", "function AssessmentScreen"],
    ["AssessmentScreen", "function CompletionScreen"],
  ];

  for (const [screenName, nextScreenMarker] of screenSections) {
    const start = prototypeSource.indexOf(`function ${screenName}`);
    const end = prototypeSource.indexOf(nextScreenMarker, start + 1);
    assert.notEqual(start, -1, `${screenName} bulunamadı`);
    assert.notEqual(end, -1, `${screenName} sınırı bulunamadı`);
    const screenSource = prototypeSource.slice(start, end);
    assert.match(screenSource, /createTeacherFeedback\(reason/);
    assert.match(screenSource, /<TeacherFeedbackPanel/);
    assert.doesNotMatch(screenSource, /reason\s+instanceof\s+Error\s*\?\s*reason\.message/);
  }
});

test("aktif öğretmen belgeleri ve gün taşıma kartı ham çalışma zamanı hatasını ana metinde göstermez", () => {
  const files = [
    "../../src/features/simple-experience/SimpleDocumentWorkspaceScreen.tsx",
    "../../src/features/simple-experience/SimpleObservationOutputSheet.tsx",
    "../../src/features/today/TodayScreen.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /createTeacherFeedback\(reason/);
    assert.match(source, /<TeacherFeedbackPanel/);
    assert.doesNotMatch(
      source,
      /reason\s+instanceof\s+Error[^\n]*reason\.message/,
    );
  }
});
