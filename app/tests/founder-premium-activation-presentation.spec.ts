import { expect, test } from "@playwright/test";

import { founderPremiumAccessPresentation } from "../src/features/premium-plans/FounderPremiumActivationPanel.tsx";

function access(
  status: "active" | "expired" | "refresh-required" | "revoked",
  overrides: Partial<{
    canUsePremiumContent: boolean;
    canReadExistingTeacherPlans: boolean;
  }> = {},
) {
  return {
    status,
    canUsePremiumContent: status === "active",
    canReadExistingTeacherPlans: true,
    ...overrides,
  };
}

test("Kurucu Premium yalnız etkin durum ve içerik yetkisi birlikteyse Etkin gösterilir", () => {
  const active = founderPremiumAccessPresentation(access("active"));
  expect(active.active).toBe(true);
  expect(active.badge).toBe("Etkin");

  const inconsistent = founderPremiumAccessPresentation(
    access("active", { canUsePremiumContent: false }),
  );
  expect(inconsistent.active).toBe(false);
  expect(inconsistent.badge).toBe("Yenileme gerekli");
});

test("süresi dolmuş, yenileme gereken ve iptal edilmiş erişimler doğru Türkçe durumla gösterilir", () => {
  expect(founderPremiumAccessPresentation(access("expired")).badge).toBe(
    "Süresi doldu",
  );
  expect(
    founderPremiumAccessPresentation(access("refresh-required")).badge,
  ).toBe("Yenileme gerekli");
  expect(founderPremiumAccessPresentation(access("revoked")).badge).toBe(
    "İptal edildi",
  );
});

test("etkin olmayan erişim yalnız sözleşme izin veriyorsa mevcut öğretmen planlarını açtırır", () => {
  expect(
    founderPremiumAccessPresentation(access("expired")).canOpenExistingPlans,
  ).toBe(true);
  expect(
    founderPremiumAccessPresentation(
      access("expired", { canReadExistingTeacherPlans: false }),
    ).canOpenExistingPlans,
  ).toBe(false);
  expect(founderPremiumAccessPresentation(null).canOpenExistingPlans).toBe(
    false,
  );
});
