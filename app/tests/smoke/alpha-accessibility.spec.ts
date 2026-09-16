import { expect, test } from "@playwright/test";

import {
  addAccessibilityChild,
  configureAccessibilityClassroom,
  expectNoUntriagedAxeViolations,
} from "./accessibility-fixtures";

test.describe("ana rotalar ve kritik durumlar Axe erişilebilirlik kapısı", () => {
  test.setTimeout(240_000);

  test("ilk kurulum, boş Bugün ve boş Sınıf durumları", async ({ page }, testInfo) => {
    await page.goto("/?native=1", { waitUntil: "networkidle" });

    const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
    await expect(setup).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "ilk-kurulum-modal");

    await configureAccessibilityClassroom(page);
    await expect(page.getByTestId("today-screen")).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "bugun-bos");

    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    await expect(page.getByText("Henüz çocuk eklenmedi", { exact: true })).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "sinif-bos");

    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Çocuk ekle" })).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "cocuk-ekle-modal-bos");
  });

  test("dolu beş ana rota, çocuk profili ve hızlı gözlem modalı", async ({
    page,
  }, testInfo) => {
    await page.goto("/?native=1", { waitUntil: "networkidle" });
    await configureAccessibilityClassroom(page);
    await addAccessibilityChild(page);

    const routes = [
      {
        navigation: "Bugün",
        ready: () => page.getByTestId("today-screen"),
        heading: () =>
          page.getByTestId("today-screen").locator("[data-route-heading]"),
        state: "bugun-dolu",
      },
      {
        navigation: "Sınıfım",
        ready: () => page.getByRole("main", { name: "Sınıfım" }),
        heading: () => page.getByRole("heading", { name: "Sınıfım", level: 1 }),
        state: "sinif-dolu",
      },
      {
        navigation: "Planlar",
        ready: () => page.getByRole("heading", { name: "Planlar", exact: true }),
        heading: () => page.getByRole("heading", { name: "Planlar", level: 1 }),
        state: "planlar-dolu",
      },
      {
        navigation: "Belgeler",
        ready: () => page.getByRole("heading", { name: "Belgeler", exact: true }),
        heading: () => page.getByRole("heading", { name: "Belgeler", level: 1 }),
        state: "belgeler-dolu",
      },
    ] as const;

    for (const route of routes) {
      await page.getByRole("button", { name: route.navigation, exact: true }).click();
      await expect(route.ready()).toBeVisible();
      await expect(route.heading()).toBeFocused();
      await expectNoUntriagedAxeViolations(page, testInfo, route.state);
    }

    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    const profileTrigger = page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Kurgu Erişilebilirlik Çocuğu" });
    await page.evaluate(() => {
      type LoadingTracker = {
        seen: boolean;
        ariaLive: string | null;
        ariaAtomic: string | null;
        observer: MutationObserver;
      };
      const inspect = () => {
        const status = [...document.querySelectorAll<HTMLElement>('[role="status"]')]
          .find((element) =>
            element.textContent?.includes("Gelişim kayıtları yükleniyor…"),
          );
        if (!status) return;
        const rect = status.getBoundingClientRect();
        const style = getComputedStyle(status);
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.display === "none" ||
          style.visibility === "hidden"
        ) {
          return;
        }
        const tracker = (window as Window & {
          __maarifosDevelopmentLoadingTracker: LoadingTracker;
        }).__maarifosDevelopmentLoadingTracker;
        tracker.seen = true;
        tracker.ariaLive = status.getAttribute("aria-live");
        tracker.ariaAtomic = status.getAttribute("aria-atomic");
      };
      const observer = new MutationObserver(inspect);
      (window as Window & {
        __maarifosDevelopmentLoadingTracker: LoadingTracker;
      }).__maarifosDevelopmentLoadingTracker = {
        seen: false,
        ariaLive: null,
        ariaAtomic: null,
        observer,
      };
      observer.observe(document.body, { childList: true, subtree: true });
      inspect();
    });
    await profileTrigger.click();
    await expect.poll(() => page.evaluate(() => {
      const tracker = (window as Window & {
        __maarifosDevelopmentLoadingTracker?: {
          seen: boolean;
        };
      }).__maarifosDevelopmentLoadingTracker;
      return tracker?.seen ?? false;
    })).toBe(true);
    const loadingStatusContract = await page.evaluate(() => {
      const tracker = (window as Window & {
        __maarifosDevelopmentLoadingTracker?: {
          ariaLive: string | null;
          ariaAtomic: string | null;
          observer: MutationObserver;
        };
      }).__maarifosDevelopmentLoadingTracker;
      tracker?.observer.disconnect();
      return {
        ariaLive: tracker?.ariaLive ?? null,
        ariaAtomic: tracker?.ariaAtomic ?? null,
      };
    });
    expect(loadingStatusContract).toEqual({
      ariaLive: "polite",
      ariaAtomic: "true",
    });
    const profile = page.getByRole("dialog", {
      name: "Kurgu Erişilebilirlik Çocuğu profili",
    });
    await expect(profile).toBeVisible();
    const profileDetails = profile.locator("details.student-profile-context-details");
    await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
    await expect(profileDetails).toHaveAttribute("open", "");

    const profileTabs = profile.getByRole("navigation", {
      name: "Çocuk profili bölümleri",
    });
    const expectedTabs = ["Akış", "Bilgiler", "Yakınlar", "Güvenlik", "Aile & izinler"];
    await expect(profileTabs.getByRole("button")).toHaveCount(expectedTabs.length);
    for (const tabName of expectedTabs) {
      await expect(profileTabs.getByRole("button", { name: tabName, exact: true })).toBeVisible();
    }
    const tabMetrics = await profileTabs.getByRole("button").evaluateAll((buttons) => {
      const parentRect = buttons[0]?.parentElement?.getBoundingClientRect();
      return buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent?.trim() ?? "",
          fontSize: Number.parseFloat(getComputedStyle(button).fontSize),
          width: rect.width,
          height: rect.height,
          insideParent:
            Boolean(parentRect) &&
            rect.left >= (parentRect?.left ?? 0) - 0.5 &&
            rect.right <= (parentRect?.right ?? 0) + 0.5,
        };
      });
    });
    expect(tabMetrics.every(({ fontSize }) => fontSize >= 12), JSON.stringify(tabMetrics)).toBe(true);
    expect(tabMetrics.every(({ width, height }) => width >= 44 && height >= 44), JSON.stringify(tabMetrics)).toBe(true);
    expect(tabMetrics.every(({ insideParent }) => insideParent), JSON.stringify(tabMetrics)).toBe(true);

    for (const photoAction of ["Fotoğraf çek", "Galeriden seç"]) {
      const input = profile.getByLabel(photoAction, { exact: true });
      await input.focus();
      await expect(input).toBeFocused();
      const focusIndicator = await input.evaluate((element) => {
        const label = element.closest("label");
        if (!label) return null;
        const style = getComputedStyle(label);
        const rect = label.getBoundingClientRect();
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          width: rect.width,
          height: rect.height,
        };
      });
      expect(focusIndicator, `${photoAction} görünür etiket odağı`).toMatchObject({
        outlineStyle: "solid",
        outlineWidth: 3,
      });
      expect(focusIndicator?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(focusIndicator?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const galleryInput = profile.getByLabel("Galeriden seç", { exact: true });
    await galleryInput.setInputFiles({
      name: "kurgu-profil.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    const removePhoto = profile.getByRole("button", { name: "Kaldır", exact: true });
    await expect(removePhoto).toBeVisible();
    await removePhoto.click();
    const undoPhoto = profile.getByRole("button", { name: "Geri al", exact: true });
    await expect(undoPhoto).toBeVisible();
    const undoBox = await undoPhoto.boundingBox();
    expect(undoBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(undoBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await undoPhoto.click();
    await expect(removePhoto).toBeVisible();

    await expectNoUntriagedAxeViolations(page, testInfo, "cocuk-profili-modal");
    await page
      .getByRole("button", {
        name: "Kurgu Erişilebilirlik Çocuğu profili ekranını kapat",
      })
      .click();
    await expect(profile).toBeHidden();
    await expect(profileTrigger).toBeFocused();

    await profileTrigger.click();
    await expect(profile).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(profile).toBeHidden();
    await expect(profileTrigger).toBeFocused();

    await page.getByRole("button", { name: "Gözlem", exact: true }).click();
    await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
    const quickDetailsSummary = page.locator("details.quick-details > summary").first();
    await quickDetailsSummary.focus();
    await expect(quickDetailsSummary).toBeFocused();
    const quickDetailsFocus = await quickDetailsSummary.evaluate((summary) => ({
      outlineStyle: getComputedStyle(summary).outlineStyle,
      outlineWidth: Number.parseFloat(getComputedStyle(summary).outlineWidth),
      parentOverflow: getComputedStyle(summary.parentElement as HTMLElement).overflow,
    }));
    expect(quickDetailsFocus).toEqual({
      outlineStyle: "solid",
      outlineWidth: 3,
      parentOverflow: "visible",
    });
    await expectNoUntriagedAxeViolations(page, testInfo, "hizli-gozlem-dolu");
  });

  test("davet kapısının hata durumu", async ({ page }, testInfo) => {
    if (testInfo.project.name.startsWith("live-")) {
      await page.goto("/?native=1", { waitUntil: "domcontentloaded" });
      await page.evaluate(() =>
        localStorage.removeItem("maarifos.shared-invite-access.v1"),
      );
    }
    await page.goto("/?native=1&accessGate=1", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "MaarifOS’a hoş geldiniz" })).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "davet-kapisi-bos");

    await page.getByLabel("6 haneli davet kodu").fill("000000");
    await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
    await expect(page.getByRole("alert")).toContainText("Kod doğrulanamadı");
    await expectNoUntriagedAxeViolations(page, testInfo, "davet-kapisi-hata");
  });
});
