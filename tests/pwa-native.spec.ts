import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureNativeClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Kurgu PWA Okulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu PWA Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Kurgu PWA Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

async function createPortfolioObservation(page: Page, text: string) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const plans = page.getByRole("main", { name: "Planlar", exact: true });
  await expect(plans).toBeVisible();
  await plans
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Günlük eğitim planı/u })
    .click();
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

function studentProfileButton(page: Page, name: string) {
  return page
    .getByRole("region", { name: "Çocuklar", exact: true })
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button")
    .first();
}

async function openProfileDetails(dialog: Locator) {
  const details = dialog.locator("details.student-profile-context-details");
  if (await details.getAttribute("open") === null) {
    await dialog.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  }
  await expect(details).toHaveAttribute("open", "");
}

test("native çalışma modu simülatör çerçevesi olmadan gerçek ekrana yerleşir", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();
  await configureNativeClassroom(page);
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("region", { name: "Sıradaki en iyi adım" })).toBeVisible();
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const plans = page.getByRole("main", { name: "Planlar", exact: true });
  await expect(plans).toBeVisible();
  await expect(
    plans
      .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
      .getByRole("button", { name: /Günlük eğitim planı/u }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByRole("heading", { name: "Mobil mağaza yayını" })).toBeVisible();
  await expect(page.getByText(/yalnız Google Play, App Store, maarifos\.com ve maarifos\.net/u)).toBeVisible();
  await expect(page.getByRole("button", { name: /MaarifOS’u kur|Kurulum adımlarını göster/u })).toHaveCount(0);
});

test("native mod masaüstünde merkezlenir, telefonda ekran genişliğini kullanır", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const desktopBox = await page.locator(".native-app-runtime").boundingBox();
  expect(desktopBox?.width).toBe(1240);
  expect(desktopBox?.x).toBe(20);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await page.locator(".native-app-runtime").boundingBox();
  expect(mobileBox?.width).toBe(390);
});

test("AI günlük planı öğretmen onayı olmadan gerçek kayda dönüşmez", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await configureNativeClassroom(page);

  await page.getByRole("button", { name: /AI ile bugünün plan taslağını hazırla/u }).click();
  const draft = page.getByTestId("ai-plan-draft-dialog");
  await expect(draft).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(draft.getByText(/henüz bugünün planına kaydedilmemiştir/u)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "DeepSeek Öğretmen İşleri" })
      .getByText(/Taslak hazır\. İnceleyip açıkça kaydetmeden/u),
  ).toBeVisible();

  await draft.getByRole("button", { name: "Vazgeç" }).click();
  await expect(draft).toHaveCount(0);
  await expect(page.getByText(/öğretmen onayıyla bugüne kaydedildi/u)).toHaveCount(0);

  await page.getByRole("button", { name: /AI ile bugünün plan taslağını hazırla/u }).click();
  await expect(draft).toBeVisible();
  await draft.getByRole("button", { name: "Kontrol ettim, bugüne kaydet" }).click();
  await expect(draft).toHaveCount(0);
  await expect(page.getByText(/Plan taslağı öğretmen onayıyla bugüne kaydedildi/u).first()).toBeVisible();
});

test("telefon geri tuşu profil, sınıf listesi ve ana ekran sırasını korur", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await configureNativeClassroom(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .last()
    .click();
  await page.getByLabel("Çocuğun adı").fill("Geri Akış Çocuğu");
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  const appUrl = page.url();

  await studentProfileButton(page, "Geri Akış Çocuğu").click();
  await expect(
    page.getByRole("dialog", { name: "Geri Akış Çocuğu profili" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("main", { name: /Sınıfım/ })).toBeVisible();
  expect(page.url()).toBe(appUrl);

  await page.goBack();
  await expect(page.getByTestId("today-screen")).toBeVisible();
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
    await page
      .getByRole("button", { name: "Çocuk ekle", exact: true })
      .last()
      .click();
    const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
    await addSheet.getByLabel("Çocuğun adı").fill(name);
    await addSheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(addSheet).toBeHidden();
    await expect(studentProfileButton(page, name)).toBeVisible();
  }

  const search = page.getByLabel("Çocuk ara");
  await search.fill("cagri");
  await expect(studentProfileButton(page, "Çağrı Işık")).toBeVisible();
  await expect(studentProfileButton(page, "Şule Öztürk")).toHaveCount(0);

  await search.fill("ozturk");
  await expect(studentProfileButton(page, "Şule Öztürk")).toBeVisible();
});

test("sınıf listesi dar telefonlarda taşmadan kayar ve dokunma hedeflerini korur", async ({
  page,
}) => {
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const name of [
    "Ada Kurgu",
    "Bora Kurgu",
    "Cem Kurgu",
    "Duru Kurgu",
    "Ece Kurgu",
    "Fırat Kurgu",
  ]) {
    await page
      .getByRole("button", { name: "Çocuk ekle", exact: true })
      .last()
      .click();
    const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
    await addSheet.getByLabel("Çocuğun adı").fill(name);
    await addSheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(addSheet).toBeHidden();
    await expect(studentProfileButton(page, name)).toBeVisible();
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
            return (
              !button.closest("details:not([open])") &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
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
    studentProfileButton(page, "Fırat Kurgu"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Çocuklar", exact: true })
      .getByRole("listitem")
      .filter({ hasText: "Fırat Kurgu" })
      .getByRole("button", {
        name: "Fırat Kurgu için Maarif gelişim gözlemi ekle",
        exact: true,
      }),
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
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .last()
    .click();
  await page.getByLabel("Çocuğun adı").fill("Görsel QA Çocuğu");
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await studentProfileButton(page, "Görsel QA Çocuğu").click();

  const dialog = page.getByRole("dialog", {
    name: "Görsel QA Çocuğu profili",
  });
  await expect(dialog.locator(".student-observation-month-folders")).toHaveCount(0);
  await expect(dialog.getByRole("region", { name: "Gelişim kayıtları" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bilgiler", exact: true })).toHaveCount(0);
  await openProfileDetails(dialog);
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
      await openProfileDetails(dialog);
      await dialog.getByRole("button", { name: tab, exact: true }).click();
      const layout = await dialog.evaluate((sheet) => {
        const content = sheet.querySelector<HTMLElement>(".sheet-content");
        const profile = sheet.querySelector<HTMLElement>(".student-profile-sheet");
        const targets = [
          ...sheet.querySelectorAll<HTMLElement>(
            ".student-profile-tabs button, .student-photo-actions label, .student-profile-observe, .student-observation-month-folders button, .student-observation-export-actions button, .student-contact-actions a, .student-profile-save, .development-card button, .student-profile-context-details > summary",
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
          overflowingElements: [...sheet.querySelectorAll<HTMLElement>(".student-profile-sheet *")]
            .filter((element) => element.getBoundingClientRect().right > rect.right + 1)
            .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) }))
            .slice(0, 12),
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
      expect(layout.contentScrollWidth, JSON.stringify({ tab, viewport, layout })).toBeLessThanOrEqual(layout.contentClientWidth);
      expect(layout.profileScrollWidth).toBeLessThanOrEqual(layout.profileClientWidth);
      expect(layout.undersizedTargets).toEqual([]);
    }
  }

  await expect(dialog.getByRole("heading", { name: "Görsel QA Çocuğu", exact: true })).toBeVisible();
});

test("Hediye Alpha PWA yüzeyi portfolyo yatırımını pilot akışından gizler", async ({
  page,
}) => {
  const childName = "Kurgu Portfolyo Çocuğu";
  await page.goto("/");
  await configureNativeClassroom(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .last()
    .click();
  await page.getByLabel("Çocuğun adı").fill(childName);
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await studentProfileButton(page, childName).click();
  const dialog = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(dialog.getByRole("region", { name: "Gelişim kayıtları" })).toBeVisible();
  await openProfileDetails(dialog);
  await expect(dialog.getByRole("button", { name: "Akış", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bilgiler", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Portfolyo", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Paylaşım|yapay zekâ/i })).toHaveCount(0);
});
