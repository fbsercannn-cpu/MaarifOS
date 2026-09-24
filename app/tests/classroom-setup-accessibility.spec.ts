import { expect, test } from "@playwright/test";

test.describe("sınıf kurulumu erişilebilirlik ve yeniden akış sözleşmesi", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("kaydetme düğmesi görünür ve programatik olarak bağlı eksik bilgi gerekçesini izler", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
    const submit = setup.getByRole("button", { name: "Sınıfımı hazırla" });
    const hint = setup.locator("#classroom-setup-submit-hint");

    await expect(setup).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute(
      "aria-describedby",
      "classroom-setup-submit-hint",
    );
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute("aria-live", "polite");
    await expect(hint).toHaveText(
      "Okul adı, öğretmen adı soyadı, sınıf adı ve eğitim yılı bilgilerini tamamlayın.",
    );
    await expect(submit).toHaveAccessibleDescription(
      "Okul adı, öğretmen adı soyadı, sınıf adı ve eğitim yılı bilgilerini tamamlayın.",
    );

    const accessibleDescription = await submit.evaluate((button) => {
      const descriptionId = button.getAttribute("aria-describedby");
      return descriptionId
        ? document.getElementById(descriptionId)?.textContent?.trim()
        : null;
    });
    expect(accessibleDescription).toBe(
      "Okul adı, öğretmen adı soyadı, sınıf adı ve eğitim yılı bilgilerini tamamlayın.",
    );

    await setup.getByLabel("Okul adı").fill("Yeniden Akış Anaokulu");
    await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Öğretmen");
    await setup.getByLabel("Sınıf adı").fill("Güneş Sınıfı");
    await expect(hint).toHaveText(
      "36–48, 48–60 veya 60–72 ay yaş bandını seçin.",
    );
    await expect(submit).toBeDisabled();

    await setup
      .getByLabel("Maarif Modeli yaş grubu", { exact: true })
      .selectOption({ label: "60–72 ay" });
    await expect(hint).toHaveText(
      "Bütün zorunlu bilgiler tamamlandı; sınıfı kaydedebilirsiniz.",
    );
    await expect(submit).toBeEnabled();
  });

  test("dar görünümde form yatay kırpılmaz ve eylem alanı içeriğin üstüne binmez", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 256, height: 568 });
    await page.goto("/", { waitUntil: "networkidle" });

    const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
    await expect(setup).toBeVisible();

    for (const width of [256, 320, 390]) {
      await page.setViewportSize({ width, height: 568 });
      const layout = await setup.evaluate((dialog) => {
        const sheetContent = dialog.querySelector<HTMLElement>(".sheet-content");
        const form = dialog.querySelector<HTMLElement>(".classroom-form");
        const navigation = dialog.querySelector<HTMLElement>(
          ".classroom-form-navigation",
        );
        const precedingContent = navigation?.previousElementSibling as HTMLElement | null;
        const navigationRect = navigation?.getBoundingClientRect();
        const precedingRect = precedingContent?.getBoundingClientRect();
        const intersectsPrecedingContent = Boolean(
          navigationRect &&
            precedingRect &&
            navigationRect.left < precedingRect.right &&
            navigationRect.right > precedingRect.left &&
            navigationRect.top < precedingRect.bottom &&
            navigationRect.bottom > precedingRect.top,
        );

        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          sheetWidth: sheetContent?.scrollWidth ?? Number.POSITIVE_INFINITY,
          sheetClientWidth: sheetContent?.clientWidth ?? 0,
          formWidth: form?.scrollWidth ?? Number.POSITIVE_INFINITY,
          formClientWidth: form?.clientWidth ?? 0,
          navigationPosition: navigation
            ? getComputedStyle(navigation).position
            : "missing",
          intersectsPrecedingContent,
        };
      });

      expect(layout.documentWidth, `${width}px belge genişliği`).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      expect(layout.bodyWidth, `${width}px gövde genişliği`).toBeLessThanOrEqual(
        layout.bodyClientWidth + 1,
      );
      expect(layout.sheetWidth, `${width}px panel genişliği`).toBeLessThanOrEqual(
        layout.sheetClientWidth + 1,
      );
      expect(layout.formWidth, `${width}px form genişliği`).toBeLessThanOrEqual(
        layout.formClientWidth + 1,
      );
      expect(layout.navigationPosition).toBe("static");
      expect(layout.intersectsPrecedingContent).toBe(false);
    }

    const navigation = setup.locator(".classroom-form-navigation");
    await navigation.scrollIntoViewIfNeeded();
    await expect(navigation).toBeInViewport();
    await expect(setup.getByRole("button", { name: "Sınıfımı hazırla" })).toBeVisible();
    await expect(setup.locator("#classroom-setup-submit-hint")).toBeVisible();
  });
});
