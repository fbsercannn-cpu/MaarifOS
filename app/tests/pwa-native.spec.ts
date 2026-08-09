import { expect, test, type Page } from "@playwright/test";

async function configureNativeClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Sınıf adı").fill("Kurgu PWA Sınıfı");
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByLabel("Program katalog kimliği").fill("KURGU-PWA");
  await setup.getByLabel("Kaynak sürümü").fill("2026-test");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function createPortfolioObservation(page: Page, text: string) {
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await page.getByRole("button", { name: /Etkinlik planla/ }).click();
  const activityTitle = page.getByLabel("Etkinlik adı");
  if (await activityTitle.isVisible().catch(() => false)) {
    await activityTitle.fill("Kurgu portfolyo etkinliği");
    await page
      .getByRole("region", { name: "Program alanları" })
      .getByRole("button", { name: "Fen", exact: true })
      .click();
    await page.getByRole("button", { name: /FAB\.1\b/ }).first().click();
    await page
      .getByRole("button", { name: "Planı kaydet" })
      .click();
  }
  await page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button")
    .first()
    .click();
  await page.getByLabel("Ne oldu?").fill(text);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(
    page.getByRole("main", { name: "MaarifOS Bugün ekranı" }),
  ).toBeVisible();
}

test("native çalışma modu simülatör çerçevesi olmadan gerçek ekrana yerleşir", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();
  await configureNativeClassroom(page);
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByText("Günün akışı", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bugünkü devam/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sınıf takvimi/ })).toBeVisible();
  await expect(page.locator(".today-header")).toHaveCSS("border-radius", "22px");

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByRole("heading", { name: "Bu cihaza kur" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kurulum adımlarını göster" })).toBeVisible();
});

test("native mod masaüstünde merkezlenir, telefonda ekran genişliğini kullanır", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const desktopBox = await page.locator(".native-app-runtime").boundingBox();
  expect(desktopBox?.width).toBe(760);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await page.locator(".native-app-runtime").boundingBox();
  expect(mobileBox?.width).toBe(390);
});

test("telefon geri tuşu profil, sınıf listesi ve ana ekran sırasını korur", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await configureNativeClassroom(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Geri Akış Çocuğu");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  const appUrl = page.url();

  await page
    .getByRole("button", { name: "Geri Akış Çocuğu profilini aç" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Geri Akış Çocuğu profili" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("main", { name: /Sınıfım/ })).toBeVisible();
  expect(page.url()).toBe(appUrl);

  await page.goBack();
  await expect(
    page.getByRole("main", { name: "MaarifOS Bugün ekranı" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");
});

test("ana sayfadaki öğrenci araması ad ve soyadı Türkçe harflerden bağımsız eşleştirir", async ({
  page,
}) => {
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const name of ["Çağrı Işık", "Şule Öztürk"]) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    await page.getByLabel("Çocuğun adı").fill(name);
    await page.getByRole("button", { name: "Ekle", exact: true }).click();
  }
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await page.getByRole("button", { name: "Öğrenci ara", exact: true }).click();
  const search = page.getByLabel("Öğrenci ara");
  await search.fill("cagri");
  await expect(
    page.getByRole("button", { name: "Çağrı Işık profilini aç" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Şule Öztürk profilini aç" }),
  ).toHaveCount(0);

  await search.fill("ozturk");
  await expect(
    page.getByRole("button", { name: "Şule Öztürk profilini aç" }),
  ).toBeVisible();
});

test("sınıf listesi dar telefonlarda taşmadan kayar ve dokunma hedeflerini korur", async ({
  page,
}) => {
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const name of ["Ada", "Bora", "Cem", "Duru", "Ece", "Fırat"]) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    await page.getByLabel("Çocuğun adı").fill(name);
    await page.getByRole("button", { name: "Ekle", exact: true }).click();
  }

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    const layout = await page.getByRole("main", { name: /Sınıfım/ }).evaluate(
      (screen, currentViewport) => {
        const routeScreen = screen as HTMLElement;
        const content = routeScreen.closest(".mobile-scroll-content") as HTMLElement | null;
        const visibleButtons = [...routeScreen.querySelectorAll<HTMLElement>("button")].filter(
          (button) => {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            return style.display !== "none" && rect.width > 0 && rect.height > 0;
          },
        );
        return {
          sheetLeft: routeScreen.getBoundingClientRect().left,
          sheetRight: routeScreen.getBoundingClientRect().right,
          sheetTop: routeScreen.getBoundingClientRect().top,
          contentScrollWidth: content?.scrollWidth ?? 0,
          contentClientWidth: content?.clientWidth ?? 0,
          undersizedTargets: visibleButtons
            .map((button) => {
              const rect = button.getBoundingClientRect();
              return { label: button.getAttribute("aria-label") ?? button.textContent, width: rect.width, height: rect.height };
            })
            .filter((button) => button.width < 44 || button.height < 44),
          overlappingTargets: visibleButtons.flatMap((button, index) => {
            const left = button.getBoundingClientRect();
            return visibleButtons.slice(index + 1).flatMap((candidate) => {
              const right = candidate.getBoundingClientRect();
              const overlaps =
                Math.min(left.right, right.right) - Math.max(left.left, right.left) > 1 &&
                Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 1;
              return overlaps
                ? [
                    `${button.getAttribute("aria-label") ?? button.textContent} / ${
                      candidate.getAttribute("aria-label") ?? candidate.textContent
                    }`,
                  ]
                : [];
            });
          }),
          viewport: currentViewport,
        };
      },
      viewport,
    );

    expect(layout.sheetLeft).toBeGreaterThanOrEqual(-0.5);
    expect(layout.sheetRight).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(layout.sheetTop).toBeGreaterThanOrEqual(-1.5);
    expect(layout.contentScrollWidth).toBeLessThanOrEqual(
      layout.contentClientWidth,
    );
    expect(layout.undersizedTargets).toEqual([]);
    expect(layout.overlappingTargets).toEqual([]);
  }

  const sheetContent = page.locator(".mobile-scroll");
  await sheetContent.hover();
  await page.mouse.wheel(0, 1200);
  await expect(
    page.getByRole("button", { name: "Fırat profilini aç" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fırat için diğer işlemler" }).click();
  await expect(
    page.getByRole("button", { name: "Fırat çocuğunu sınıftan ayır" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bugün", exact: true }),
  ).toBeVisible();
});

test("öğrenci profili tüm telefon genişliklerinde taşmadan ve erişilebilir hedeflerle çalışır", async ({
  page,
}) => {
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Görsel QA Çocuğu");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page
    .getByRole("button", { name: "Görsel QA Çocuğu profilini aç" })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Görsel QA Çocuğu profili",
  });
  await expect(dialog.locator(".student-observation-month-folders")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await expect(dialog.getByLabel("Adı", { exact: true })).toHaveValue("Görsel QA");
  await expect(dialog.getByLabel("Soyadı", { exact: true })).toHaveValue("Çocuğu");
  await dialog.getByRole("button", { name: "Akış", exact: true }).click();

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);

    await expect(dialog.getByRole("button", { name: "Portfolyo", exact: true })).toHaveCount(0);
    for (const tab of ["Akış", "Bilgiler", "Yakınlar"]) {
      await dialog.getByRole("button", { name: tab, exact: true }).click();
      const layout = await dialog.evaluate((sheet) => {
        const content = sheet.querySelector<HTMLElement>(".sheet-content");
        const profile = sheet.querySelector<HTMLElement>(".student-profile-sheet");
        const targets = [
          ...sheet.querySelectorAll<HTMLElement>(
            ".student-profile-tabs button, .student-photo-actions label, .student-profile-observe, .student-observation-month-folders button, .student-observation-export-actions button, .student-contact-actions a, .student-profile-save",
          ),
        ].filter((target) => {
          const rect = target.getBoundingClientRect();
          return getComputedStyle(target).display !== "none" && rect.width > 0 && rect.height > 0;
        });
        const rect = (sheet as HTMLElement).getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          contentScrollWidth: content?.scrollWidth ?? 0,
          contentClientWidth: content?.clientWidth ?? 0,
          profileScrollWidth: profile?.scrollWidth ?? 0,
          profileClientWidth: profile?.clientWidth ?? 0,
          undersizedTargets: targets
            .map((target) => {
              const targetRect = target.getBoundingClientRect();
              return {
                label: target.getAttribute("aria-label") ?? target.textContent,
                width: targetRect.width,
                height: targetRect.height,
              };
            })
            .filter((target) => target.width < 44 || target.height < 44),
        };
      });

      expect(layout.left).toBeGreaterThanOrEqual(-0.5);
      expect(layout.right).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(layout.contentScrollWidth).toBeLessThanOrEqual(layout.contentClientWidth);
      expect(layout.profileScrollWidth).toBeLessThanOrEqual(layout.profileClientWidth);
      expect(layout.undersizedTargets).toEqual([]);
    }
  }

  await expect(dialog.getByText("Görsel QA Çocuğu", { exact: true })).toBeVisible();
});

test("Hediye Alpha PWA yüzeyi portfolyo yatırımını pilot akışından gizler", async ({
  page,
}) => {
  const childName = "Kurgu Portfolyo Çocuğu";
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(childName);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page
    .getByRole("button", { name: `${childName} profilini aç` })
    .click();
  const dialog = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(dialog.getByRole("button", { name: "Akış", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bilgiler", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Portfolyo", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Paylaşım|yapay zekâ/i })).toHaveCount(0);
});
