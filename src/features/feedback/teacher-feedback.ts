import { TeacherOwnedPlanError } from "../../core/domain/teacher-owned-plan.ts";
import { ApplicationError } from "../../core/errors/application-errors.ts";
import { classifyApplicationError } from "../../core/errors/error-classifier.ts";

export type TeacherFeedbackSeverity = "info" | "warning" | "error";

/**
 * Öğretmen yüzeyindeki bütün kararlı geri bildirim kodlarının çalışma zamanı
 * sözleşmesi. Yeni kodlar bu listeye eklenir; mevcut kodlar sessizce yeniden
 * anlamlandırılmaz veya kaldırılmaz.
 */
export const TEACHER_FEEDBACK_CODES = [
  "plan.source-date",
  "plan.date-format",
  "plan.week-range",
  "plan.calendar-day",
  "plan.age-profile",
  "plan.program-profile",
  "plan.activity",
  "plan.title",
  "plan.target",
  "plan.child-scope",
  "plan.time",
  "plan.conflict",
  "plan.evidence-locked",
  "plan.flow",
  "plan.integrity",
  "plan.integrity.activity-date",
  "plan.integrity.teacher-flow-shape",
  "plan.integrity.teacher-source-chain",
  "plan.integrity.teacher-activity-source",
  "plan.integrity.teacher-flow-block",
  "plan.integrity.premium-flow-shape",
  "plan.integrity.premium-source-missing",
  "plan.integrity.premium-source-chain",
  "plan.integrity.premium-activity-id",
  "plan.integrity.premium-activity-snapshot",
  "plan.integrity.premium-activity-source",
  "plan.edit.activity-count",
  "plan.edit.past-or-today",
  "plan.edit.status-locked",
  "plan.edit.evidence-locked",
  "classroom.scope",
  "observation.scope",
  "evaluation.evidence",
  "device.storage",
  "device.integrity",
  "device.offline",
  "security.boundary",
  "validation.generic",
  "unknown",
] as const;

export type TeacherFeedbackCode = (typeof TEACHER_FEEDBACK_CODES)[number];

export type TeacherFeedbackActionId =
  | "select-activity"
  | "use-source-week"
  | "select-target"
  | "select-whole-class"
  | "restore-class-time"
  | "focus-missing-field"
  | "open-missing-review-step"
  | "use-combined-document"
  | "retry";

export interface TeacherFeedbackAction {
  id: TeacherFeedbackActionId;
  label: string;
}

export interface TeacherFeedback {
  code: TeacherFeedbackCode;
  severity: TeacherFeedbackSeverity;
  title: string;
  detail: string;
  supportCode: string;
  action?: TeacherFeedbackAction;
  technicalDetail?: string;
}

export interface TeacherFeedbackOptions {
  fallbackDetail?: string;
}

interface TeacherFeedbackRule {
  code: TeacherFeedbackCode;
  severity: TeacherFeedbackSeverity;
  supportCode: string;
  title: string;
  detail: string;
  action?: TeacherFeedbackAction;
  patterns: readonly RegExp[];
  applicationCodes?: readonly string[];
}

const RULES: readonly TeacherFeedbackRule[] = [
  {
    code: "plan.source-date",
    severity: "error",
    supportCode: "PLAN-DATE-001",
    title: "Etkinlik kaynağı doğrulanamadı",
    detail:
      "Plan günü kayıttan önce otomatik eşitlenir. Bu uyarı kaynak ilişkisinin doğrulanamadığını gösterir. Taslağınız korunuyor; etkinliği yeniden seçin.",
    action: { id: "select-activity", label: "Etkinliği yeniden seç" },
    patterns: [/^pedagojik etkinlik kaynağı plan günüyle uyuşmuyor\.?$/i],
    applicationCodes: ["plan.source-date"],
  },
  {
    code: "plan.date-format",
    severity: "warning",
    supportCode: "PLAN-DATE-002",
    title: "Plan tarihi geçerli biçimde değil",
    detail: "Plan gününü YYYY-AA-GG biçiminde yazın veya önerilen kaynak gününü kullanın.",
    patterns: [/^plan günü yyyy-aa-gg biçiminde olmalıdır\.?$/i],
    applicationCodes: ["plan.date-format"],
  },
  {
    code: "plan.week-range",
    severity: "warning",
    supportCode: "PLAN-WEEK-001",
    title: "Plan günü kaynak haftanın dışında",
    detail:
      "Bu plan bağlı olduğu haftanın tarihleri içinde kalmalıdır. Kaynak haftanın ilk gününü kullanabilirsiniz.",
    action: { id: "use-source-week", label: "Kaynak haftaya al" },
    patterns: [
      /plan tarihi.*kaynak haftanın dış/i,
      /plan tarihini.*kaynak haftanın tarih aralığına/i,
      /plan günü.*hafta.*aralığ/i,
    ],
    applicationCodes: ["plan.week-range"],
  },
  {
    code: "plan.calendar-day",
    severity: "warning",
    supportCode: "PLAN-CALENDAR-001",
    title: "Seçilen gün öğretim günü değil",
    detail:
      "Resmî MEB çalışma takvimindeki en yakın öğretim gününü seçin; plan taslağınız korunur.",
    patterns: [/^.+resmî meb çalışma takviminde öğretim günü değildir(?:\. .+)?\.?$/i],
    applicationCodes: ["plan.calendar-day"],
  },
  {
    code: "plan.age-profile",
    severity: "warning",
    supportCode: "PLAN-AGE-001",
    title: "Sınıfın resmî yaş bandı eksik",
    detail:
      "TYMM hedeflerini açmak için sınıf profilinde 36–48, 48–60 veya 60–72 ay yaş bandını seçin.",
    patterns: [
      /^plan hedeflerini açmak için sınıf profilinde 36[–-]48, 48[–-]60 veya 60[–-]72 ay resmî yaş bandını seçin\.?$/i,
    ],
    applicationCodes: ["plan.age-profile"],
  },
  {
    code: "plan.program-profile",
    severity: "error",
    supportCode: "PLAN-PROGRAM-001",
    title: "Sınıfın Maarif Modeli profili eşleşmiyor",
    detail:
      "Planın yaş grubu veya program profili etkin sınıfla uyuşmuyor. Sınıf ve plan bilgilerinizi kontrol edin.",
    patterns: [
      /^plan program profili (?:aktif )?sınıfın kayıtlı program profiliyle uyuşmuyor\.?$/i,
      /^seçilen program hedefi aktif sınıfın program, katalog ve kaynak sürümüyle uyuşmuyor\.?$/i,
      /^bu paket yalnız doğrulanmış tymm 2024 program profiliyle kullanılabilir\.?$/i,
    ],
    applicationCodes: ["plan.program-profile"],
  },
  {
    code: "plan.activity",
    severity: "warning",
    supportCode: "PLAN-ACTIVITY-001",
    title: "Etkinlik seçilmedi",
    detail: "Bir etkinlik seçin veya etkinlik adını yazın.",
    action: { id: "select-activity", label: "Etkinlik seç" },
    patterns: [
      /^bir etkinlik seçin veya etkinlik adını yazın\.?$/i,
      /^etkinlik (?:adı|başlığı) zorunludur\.?$/i,
    ],
    applicationCodes: ["plan.activity"],
  },
  {
    code: "plan.title",
    severity: "warning",
    supportCode: "PLAN-TITLE-001",
    title: "Plan başlığı eksik",
    detail: "Plan başlığını tamamlayın; etkinlik adını başlık olarak da kullanabilirsiniz.",
    patterns: [
      /^plan başlığını yazın\.?$/i,
      /^plan başlığı (?:boş bırakılamaz|gereklidir|zorunludur)\.?$/i,
    ],
    applicationCodes: ["plan.title"],
  },
  {
    code: "plan.target",
    severity: "warning",
    supportCode: "PLAN-TARGET-001",
    title: "TYMM hedefi seçilmedi",
    detail: "Planı kaydetmek için etkinlikte izleyeceğiniz en az bir TYMM hedefini seçin.",
    action: { id: "select-target", label: "Hedef seç" },
    patterns: [
      /^plan için en az bir program hedefi seçilmelidir\.?$/i,
      /^en az bir tymm hedefi seçin\.?$/i,
    ],
    applicationCodes: ["plan.target"],
  },
  {
    code: "plan.child-scope",
    severity: "warning",
    supportCode: "PLAN-CHILD-001",
    title: "Çocuk kapsamı tamamlanmadı",
    detail: "Planın uygulanacağı çocukları seçin veya etkin sınıfın tamamını plana ekleyin.",
    action: { id: "select-whole-class", label: "Tüm sınıfı seç" },
    patterns: [
      /^en az bir çocuk seçerek çocuk kapsamını tamamlayın\.?$/i,
      /^öğrenci dağıtım biçimi tüm sınıf veya seçili çocuklar olmalıdır\.?$/i,
      /^seçili çocuk kapsamı etkin sınıfta bulunamadı\.?$/i,
    ],
    applicationCodes: ["plan.child-scope"],
  },
  {
    code: "plan.time",
    severity: "warning",
    supportCode: "PLAN-TIME-001",
    title: "Etkinlik saatlerini kontrol edin",
    detail:
      "Başlangıç ve bitiş saatlerini geçerli biçimde yazın; bitiş saati başlangıçtan sonra olmalıdır.",
    action: { id: "restore-class-time", label: "Sınıf saatini kullan" },
    patterns: [
      /^etkinlik saatleri ss:dd biçiminde olmalıdır\.?$/i,
      /^etkinlik bitiş saati başlangıç saatinden sonra olmalıdır\.?$/i,
      /^öğretmen günlük akışı için sınıfın başlangıç ve bitiş saatleri tamamlanmalıdır\.?$/i,
    ],
    applicationCodes: ["plan.time"],
  },
  {
    code: "plan.conflict",
    severity: "warning",
    supportCode: "PLAN-CONFLICT-001",
    title: "Plan başka bir işlemde güncellendi",
    detail:
      "Üzerine yazmamak için işlem durduruldu. Taslağınız korunuyor; plan listesini yenileyip değişikliği yeniden uygulayın.",
    patterns: [
      /başka bir işlemde değiş/i,
      /başka bir ekranda değiş/i,
      /beklenen sürüm/i,
      /revizyon.*uyuşmuyor/i,
      /stale/i,
      /zaten kullanılıyor/i,
    ],
    applicationCodes: [
      "plan.conflict",
      "plan.stale",
      "concurrent-update",
      "duplicate-or-overlap",
      "plan-not-found",
    ],
  },
  {
    code: "plan.evidence-locked",
    severity: "warning",
    supportCode: "PLAN-EVIDENCE-001",
    title: "Kanıt bulunan plan korunuyor",
    detail:
      "Başlamış veya gözlem kanıtı bulunan planlar geriye dönük değiştirilemez. Yeni bir plan ya da revizyon oluşturun.",
    patterns: [
      /gözlem kanıtı bulunan plan/i,
      /henüz başlamamış gelecek tarihli plan/i,
      /geriye dönük değiştirilemez/i,
    ],
    applicationCodes: ["plan.evidence-locked"],
  },
  {
    code: "plan.flow",
    severity: "warning",
    supportCode: "PLAN-FLOW-001",
    title: "Günlük akışı kontrol edin",
    detail:
      "Akış bölümlerindeki başlık, süre veya uygulama seçimi tamamlanmadı. Eksik bölümü düzenleyip yeniden deneyin.",
    patterns: [
      /^kayıtlı tam gün akışı düzenleme için doğrulanamadı\.?$/i,
      /^öğretmenin kayıtlı 10 bölümlü günlük akışı düzenleme için doğrulanamadı\.?$/i,
      /^öğretmenin günlük akışı tam olarak 10 bölüm taşımalıdır\.?$/i,
      /^öğretmen günlük akışı .+ dakikalık sınıf düzeniyle tam eşleşmelidir; mevcut toplam .+ dakikadır\.?$/i,
    ],
    applicationCodes: ["plan.flow"],
  },
  {
    code: "observation.scope",
    severity: "warning",
    supportCode: "OBS-SCOPE-001",
    title: "Gözlem doğru çocuk veya etkinlikle eşleşmiyor",
    detail:
      "Gözlemi etkin sınıftaki çocuk ve ilgili günlük etkinlik üzerinden yeniden açın. Mevcut notunuz korunuyor.",
    patterns: [
      /gözlem.*çocuk veya sınıf kapsamıyla uyuşmuyor/i,
      /gözlem.*etkin sınıf/i,
      /gözlemin plan ve etkinlik ilişkisi/i,
    ],
    applicationCodes: ["observation.scope"],
  },
  {
    code: "evaluation.evidence",
    severity: "warning",
    supportCode: "EVAL-EVIDENCE-001",
    title: "Değerlendirme için kanıt eksik",
    detail:
      "Değerlendirmeye uygun, öğretmen onaylı en az bir gözlem seçin. Taslak metniniz korunuyor.",
    patterns: [
      /değerlendirme.*en az bir.*gözlem/i,
      /en az bir bağlı gözlem/i,
      /öğretmen onaylı program bağlantısı/i,
      /değerlendirme kanıt/i,
    ],
    applicationCodes: ["evaluation.evidence"],
  },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  return "";
}

function safeTechnicalDetail(message: string): string | undefined {
  if (!message) return undefined;
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[kimlik]")
    .replace(/\b\d{11}\b/g, "[numara]")
    .slice(0, 1_000);
}

function applicationCode(error: unknown): string | undefined {
  if (error instanceof ApplicationError) return error.code;
  if (error instanceof TeacherOwnedPlanError) return error.code;
  return undefined;
}

function ruleMatches(
  rule: TeacherFeedbackRule,
  message: string,
  code: string | undefined,
): boolean {
  return Boolean(
    (code && rule.applicationCodes?.includes(code)) ||
      rule.patterns.some((pattern) => pattern.test(message)),
  );
}

function fromRule(rule: TeacherFeedbackRule, technicalDetail?: string): TeacherFeedback {
  return {
    code: rule.code,
    severity: rule.severity,
    title: rule.title,
    detail: rule.detail,
    supportCode: rule.supportCode,
    ...(rule.action ? { action: rule.action } : {}),
    ...(technicalDetail ? { technicalDetail } : {}),
  };
}

/**
 * Domain ve tarayıcı hatalarını öğretmenin okuyabileceği, kararlı ve desteklenebilir
 * bir sunuma dönüştürür. Ham hata metni yalnız kapalı teknik ayrıntıda tutulur.
 */
export function createTeacherFeedback(
  error: unknown,
  options: TeacherFeedbackOptions = {},
): TeacherFeedback {
  const message = errorMessage(error);
  const technicalDetail = safeTechnicalDetail(message);
  const code = applicationCode(error);
  const matchingRule = RULES.find((rule) => ruleMatches(rule, message, code));
  if (matchingRule) return fromRule(matchingRule, technicalDetail);

  if (code === "graph-integrity") {
    return {
      code: "plan.integrity",
      severity: "error",
      title: "Plan kayıtlarının bütünlüğü doğrulanamadı",
      detail:
        "Verilerin üzerine yazmamak için işlem durduruldu. Destek kodunu ürün sahibine iletin.",
      supportCode: "PLAN-INTEGRITY-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (code === "active-scope-required") {
    return {
      code: "classroom.scope",
      severity: "warning",
      title: "Etkin sınıf veya eğitim yılı gerekli",
      detail:
        "Bu işlemi kullanmak için etkin sınıfı ve bağlı eğitim yılını tamamlayın. Taslağınız korunuyor.",
      supportCode: "CLASS-SCOPE-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (code === "invalid-input") {
    return {
      code: "validation.generic",
      severity: "warning",
      title: "Plan bilgilerini kontrol edin",
      detail:
        options.fallbackDetail?.trim() ||
        "Eksik veya geçersiz alanları tamamlayıp yeniden deneyin. Taslağınız korunuyor.",
      supportCode: "PLAN-INPUT-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }

  const classification = classifyApplicationError(error);
  if (classification.kind === "storage-transient") {
    return {
      code: "device.storage",
      severity: "error",
      title: "Cihaz kaydı tamamlanamadı",
      detail:
        "Taslağınız korunuyor. Cihazda yeterli alan olduğunu kontrol edip işlemi yeniden deneyin.",
      supportCode: "DEVICE-STORAGE-001",
      action: { id: "retry", label: "Yeniden dene" },
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (classification.kind === "storage-integrity") {
    return {
      code: "device.integrity",
      severity: "error",
      title: "Kayıt bütünlüğü doğrulanamadı",
      detail:
        "Verilerin üzerine yazmamak için işlem durduruldu. Destek kodunu ürün sahibine iletin.",
      supportCode: "DEVICE-INTEGRITY-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (classification.kind === "security") {
    return {
      code: "security.boundary",
      severity: "error",
      title: "Güvenlik kontrolü işlemi durdurdu",
      detail:
        "Kayıtlarınız değiştirilmedi. Uygulamayı güncel bağlantıdan yeniden açın; sorun sürerse destek kodunu iletin.",
      supportCode: "SECURITY-BOUNDARY-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (classification.kind === "offline") {
    return {
      code: "device.offline",
      severity: "warning",
      title: "Bu adım için bağlantı gerekiyor",
      detail: "Wi-Fi veya mobil veriyi kontrol edip işlemi yeniden deneyin.",
      supportCode: "DEVICE-OFFLINE-001",
      action: { id: "retry", label: "Yeniden dene" },
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (classification.kind === "conflict") {
    return {
      code: "plan.conflict",
      severity: "warning",
      title: "Kayıt başka bir işlemde güncellendi",
      detail:
        "Üzerine yazmamak için işlem durduruldu. Taslağınız korunuyor; güncel kaydı açıp değişikliği yeniden uygulayın.",
      supportCode: "PLAN-CONFLICT-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }
  if (classification.kind === "validation") {
    return {
      code: "validation.generic",
      severity: "warning",
      title: "Bilgileri kontrol edin",
      detail:
        options.fallbackDetail?.trim() ||
        "Bir veya daha fazla alan tamamlanmadı. İşaretli alanları kontrol edip yeniden deneyin.",
      supportCode: "VALIDATION-001",
      ...(technicalDetail ? { technicalDetail } : {}),
    };
  }

  return {
    code: "unknown",
    severity: "error",
    title: "İşlem tamamlanamadı",
    detail:
      options.fallbackDetail?.trim() ||
      "Taslağınız korunuyor. Yeniden deneyin; sorun sürerse teknik ayrıntılardaki destek kodunu paylaşın.",
    supportCode: "UNEXPECTED-001",
    action: { id: "retry", label: "Yeniden dene" },
    ...(technicalDetail ? { technicalDetail } : {}),
  };
}
