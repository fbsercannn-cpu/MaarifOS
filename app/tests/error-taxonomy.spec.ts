import { expect, test } from "@playwright/test";
import {
  ConflictError,
  OfflineBoundary,
  SecurityViolation,
  StorageIntegrityError,
  StorageTransientError,
  ValidationError,
  classifyApplicationError,
  requiresGlobalFailClosed,
} from "../src/core/errors";

test("uygulama hataları kararlı tür, kod ve bağlam taşır", () => {
  const cause = new Error("kurgu neden");
  const error = new ValidationError("Ad alanı zorunludur.", {
    code: "student.name.required",
    cause,
    context: { field: "displayName" },
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("ValidationError");
  expect(error.kind).toBe("validation");
  expect(error.code).toBe("student.name.required");
  expect(error.cause).toBe(cause);
  expect(error.context).toEqual({ field: "displayName" });
});

test("hata sınıfları doğru operasyon politikasına ayrılır", () => {
  const cases = [
    {
      error: new ValidationError("Alan geçersiz."),
      expected: {
        kind: "validation",
        scope: "field",
        shouldFailClosed: false,
        retryable: false,
        preserveDraft: true,
      },
    },
    {
      error: new ConflictError("Kayıt başka bir işlemde değişti."),
      expected: {
        kind: "conflict",
        scope: "conflict",
        shouldFailClosed: false,
        retryable: false,
        preserveDraft: true,
      },
    },
    {
      error: new StorageTransientError("Geçici depolama hatası."),
      expected: {
        kind: "storage-transient",
        scope: "operation",
        shouldFailClosed: false,
        retryable: true,
        preserveDraft: true,
      },
    },
    {
      error: new StorageIntegrityError("Bütünlük doğrulanamadı."),
      expected: {
        kind: "storage-integrity",
        scope: "global",
        shouldFailClosed: true,
        retryable: false,
        preserveDraft: true,
      },
    },
    {
      error: new SecurityViolation("Yetkisiz işlem durduruldu."),
      expected: {
        kind: "security",
        scope: "global",
        shouldFailClosed: true,
        retryable: false,
        preserveDraft: true,
      },
    },
    {
      error: new OfflineBoundary("Bu işlem çevrim içi bağlantı gerektirir."),
      expected: {
        kind: "offline",
        scope: "boundary",
        shouldFailClosed: false,
        retryable: true,
        preserveDraft: true,
      },
    },
  ] as const;

  for (const { error, expected } of cases) {
    expect(classifyApplicationError(error)).toEqual(expected);
  }
});

test("yalnız depolama bütünlüğü ve güvenlik ihlali küresel fail-closed açar", () => {
  expect(requiresGlobalFailClosed(new StorageIntegrityError("bozuk kayıt"))).toBe(true);
  expect(requiresGlobalFailClosed(new SecurityViolation("güvenlik ihlali"))).toBe(true);

  expect(requiresGlobalFailClosed(new ValidationError("eksik alan"))).toBe(false);
  expect(requiresGlobalFailClosed(new ConflictError("çakışma"))).toBe(false);
  expect(requiresGlobalFailClosed(new StorageTransientError("geçici hata"))).toBe(false);
  expect(requiresGlobalFailClosed(new OfflineBoundary("çevrim dışı"))).toBe(false);
  expect(requiresGlobalFailClosed(new Error("tanımsız hata"))).toBe(false);
  expect(requiresGlobalFailClosed("Error olmayan değer")).toBe(false);
});

test("IndexedDB DOMException hataları depolama etkisine göre ayrılır", () => {
  expect(requiresGlobalFailClosed(new DOMException("kurgu", "UnknownError"))).toBe(true);
  expect(requiresGlobalFailClosed(new DOMException("kurgu", "VersionError"))).toBe(true);
  expect(requiresGlobalFailClosed(new DOMException("kurgu", "SecurityError"))).toBe(true);

  expect(classifyApplicationError(new DOMException("kurgu", "DataError"))).toMatchObject({
    kind: "validation",
    shouldFailClosed: false,
  });
  expect(classifyApplicationError(new DOMException("kurgu", "ConstraintError"))).toMatchObject({
    kind: "conflict",
    shouldFailClosed: false,
  });

  expect(classifyApplicationError(new DOMException("kurgu", "QuotaExceededError"))).toMatchObject({
    kind: "storage-transient",
    shouldFailClosed: false,
    retryable: true,
  });
  expect(classifyApplicationError(new DOMException("kurgu", "NetworkError"))).toMatchObject({
    kind: "offline",
    shouldFailClosed: false,
  });
});

test("tanınmayan hata fail-closed varsayılmaz ve güvenli şekilde raporlanır", () => {
  expect(classifyApplicationError(new Error("beklenmeyen"))).toEqual({
    kind: "unknown",
    scope: "unexpected",
    shouldFailClosed: false,
    retryable: false,
    preserveDraft: true,
  });
  expect(classifyApplicationError(null)).toEqual({
    kind: "unknown",
    scope: "unexpected",
    shouldFailClosed: false,
    retryable: false,
    preserveDraft: true,
  });
});
