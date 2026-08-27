import { expect, test } from "@playwright/test";

import {
  addAccessibilityStudent,
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
    await expect(page.getByText("Henüz öğrenci eklenmedi", { exact: true })).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "sinif-bos");

    await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Çocuk ekle" })).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "ogrenci-ekle-modal-bos");
  });

  test("dolu beş ana rota, öğrenci profili ve hızlı gözlem modalı", async ({
    page,
  }, testInfo) => {
    await page.goto("/?native=1", { waitUntil: "networkidle" });
    await configureAccessibilityClassroom(page);
    await addAccessibilityStudent(page);

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
        navigation: "Etkinlikler",
        ready: () => page.locator("main.activity-studio"),
        heading: () => page.getByRole("heading", {
          name: "Etkinlik ve Materyal Stüdyosu",
          level: 1,
        }),
        state: "etkinlikler-dolu",
      },
      {
        navigation: "Planlar",
        ready: () => page.getByRole("heading", { name: "Planlar", exact: true }),
        heading: () => page.getByRole("heading", { name: "Planlar", level: 1 }),
        state: "planlar-dolu",
      },
      {
        navigation: "Çıktılar",
        ready: () => page.getByRole("heading", { name: "Çıktılar", exact: true }),
        heading: () => page.getByRole("heading", { name: "Çıktılar", level: 1 }),
        state: "ciktilar-dolu",
      },
    ] as const;

    for (const route of routes) {
      await page.getByRole("button", { name: route.navigation, exact: true }).click();
      await expect(route.ready()).toBeVisible();
      await expect(route.heading()).toBeFocused();
      await expectNoUntriagedAxeViolations(page, testInfo, route.state);
    }

    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    await page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Kurgu Erişilebilirlik Çocuğu" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Kurgu Erişilebilirlik Çocuğu profili" }),
    ).toBeVisible();
    await expectNoUntriagedAxeViolations(page, testInfo, "ogrenci-profili-modal");
    await page
      .getByRole("button", {
        name: "Kurgu Erişilebilirlik Çocuğu profili ekranını kapat",
      })
      .click();

    await page
      .getByRole("group", { name: "Kurgu Erişilebilirlik Çocuğu hızlı işlemleri" })
      .getByRole("button", { name: "Gözlem", exact: true })
      .click();
    await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
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
