import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureClassroomWithoutStudents(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });

  await setup.getByLabel("Okul adı").fill("Kurgu Mobil Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu mobil kararlılık sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

const INTERACTIVE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
].join(", ");

async function expectAboveBottomNavigationAndHitTestable(
  page: Page,
  target: ReturnType<Page["locator"]>,
) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport();

  const navigation = page.getByRole("navigation", { name: "Ana menü" });
  const [targetBox, navigationBox] = await Promise.all([
    target.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(targetBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(
    navigationBox!.y + 1,
  );

  const hitTest = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === element || element.contains(hit);
  });
  expect(hitTest).toBe(true);
}

test("dar telefonda hızlı kayıt CTA'sı kaydırma gerektirmeden görünür ve tıklanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const nextTask = page.getByLabel("Sıradaki en iyi adım");
  const readinessAction = nextTask.getByRole("button");

  await expect(nextTask).toBeVisible();
  await expect(nextTask).toContainText("İlk çocuğu ekleyin");
  await expect(readinessAction).toBeInViewport();

  const hitTest = await readinessAction.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === button || button.contains(hit);
  });
  expect(hitTest).toBe(true);

  await readinessAction.click();
  const dialog = page.getByRole("dialog", { name: "Çocuk ekle" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".sheet-content")).toHaveJSProperty("scrollTop", 0);
  await dialog
    .getByRole("button", { name: "Çocuk ekle ekranını kapat" })
    .click();
  await expect(page.getByRole("main", { name: /Sınıfım/ })).toBeVisible();

  await page.goBack();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("aktif alt menü göstergesi düğme içinde kalır ve kaydırma sonrası sekmeler tıklanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const scroll = page.locator(".mobile-scroll");
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const todayButton = page.getByRole("button", { name: "Bugün", exact: true });
  const indicator = await todayButton.evaluate((button) => {
    const style = getComputedStyle(button, "::before");
    const buttonRect = button.getBoundingClientRect();
    return {
      position: style.position,
      pointerEvents: style.pointerEvents,
      indicatorTop: Number.parseFloat(style.top),
      buttonTop: buttonRect.top,
    };
  });
  expect(indicator.position).toBe("absolute");
  expect(indicator.pointerEvents).toBe("none");
  expect(indicator.indicatorTop).toBe(0);
  expect(indicator.buttonTop).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Planlar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Planlar", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("320 pikselde hazırlanmış asistan kartları kırpılmaz", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const quickActions = page.locator(".simple-today__prepared-list");
  await expect(quickActions).toBeVisible();
  const layout = await quickActions.evaluate((region) => {
    const titles = [...region.querySelectorAll("button strong")];
    return {
      buttonCount: region.querySelectorAll(":scope > button").length,
      clippedTitles: titles
        .filter((title) => title.scrollHeight > title.clientHeight + 1)
        .map((title) => title.textContent?.trim() ?? ""),
    };
  });

  expect(layout.buttonCount).toBe(2);
  expect(layout.clippedTitles).toEqual([]);
});

test("Plan zincirim tam ekran katmanında aşağı kayar ve son eylem tıklanabilir kalır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/plans?native=1");
  await configureClassroomWithoutStudents(page);

  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Yıllık planlama panosu/i })
    .click();

  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog.getByRole("heading", { name: "Plan zincirim" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Yıl → ay → hafta planını oluştur" })
    .click();
  await expect(dialog).toContainText("tek işlemde bu cihaza kaydedildi");
  const scrollBody = dialog.locator(".teacher-owned-plan-scroll");
  await expect(scrollBody).toBeVisible();

  const initialMetrics = await scrollBody.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
    touchAction: getComputedStyle(element).touchAction,
  }));
  expect(initialMetrics.clientHeight).toBeGreaterThan(0);
  expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.clientHeight);
  expect(initialMetrics.overflowY).toBe("auto");
  expect(initialMetrics.touchAction).toBe("pan-y");

  await scrollBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  const lastAction = dialog.getByRole("button", {
    name: "Word hazırla",
  });
  await expect(lastAction).toBeEnabled();
  await expect(lastAction).toBeInViewport();
  const lastActionHit = await lastAction.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === button || button.contains(hit);
  });
  expect(lastActionHit).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await lastAction.click();
  await downloadPromise;
  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
  await expect(dialog).toBeHidden();
});

test("öğrenci profilinde isteğe bağlı T.C. kimlik numarası ve dört haneli kayıt yılı kalıcıdır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Kurgu Kimlik Çocuğu");
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Çocuk ekle" })).toBeHidden({
    timeout: 15_000,
  });
  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: "Kurgu Kimlik Çocuğu" })
    .click();

  let dialog = page.getByRole("dialog", { name: "Kurgu Kimlik Çocuğu profili" });
  await dialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  const identityInput = dialog.getByLabel("T.C. kimlik numarası (isteğe bağlı)");
  const enrollmentYearInput = dialog.getByLabel("Okula kayıt yılı");
  await identityInput.fill("10000000146");
  await enrollmentYearInput.fill("2025");
  await dialog.getByRole("button", { name: "Profili kaydet" }).click();
  await expect(dialog).toBeHidden();

  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: "Kurgu Kimlik Çocuğu" })
    .click();
  dialog = page.getByRole("dialog", { name: "Kurgu Kimlik Çocuğu profili" });
  await dialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  const persisted = await dialog.evaluate((sheet) => ({
    identityMatches:
      (sheet.querySelector("#student-profile-national-identity-number") as HTMLInputElement | null)
        ?.value === "10000000146",
    enrollmentYear:
      (sheet.querySelector("#student-profile-enrollment-year") as HTMLInputElement | null)
        ?.value,
    legacyDatePresent: sheet.querySelector("#student-profile-enrollment-date") !== null,
  }));
  expect(persisted).toEqual({
    identityMatches: true,
    enrollmentYear: "2025",
    legacyDatePresent: false,
  });
});

test("320 pikselde beş ana sekmenin son eylemi alt menünün üstünde kalır ve dokunma alır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const routes = [
    { navigation: "Bugün", root: "main.simple-today" },
    { navigation: "Sınıfım", root: "main.simple-classroom" },
    { navigation: "Etkinlikler", root: "main.activity-studio" },
    {
      navigation: "Planlar",
      root: 'main.simple-workspace[aria-labelledby="simple-plans-title"]',
    },
    {
      navigation: "Çıktılar",
      root: 'main.simple-workspace[aria-labelledby="simple-documents-title"]',
    },
  ] as const;

  for (const route of routes) {
    await page
      .getByRole("button", { name: route.navigation, exact: true })
      .click();
    const root = page.locator(route.root);
    await expect(root).toBeVisible();

    const scroll = page.locator(".mobile-scroll");
    await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const interactive = root.locator(`${INTERACTIVE_SELECTOR}:visible`);
    expect(await interactive.count(), `${route.navigation} etkileşimli öğe içermeli`).toBeGreaterThan(0);
    await expectAboveBottomNavigationAndHitTestable(page, interactive.last());
  }
});

test("320 piksel Çocuk Modunda çizim ve alt eylemler gezinmenin arkasında kalmaz", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/activities?native=1");
  await configureClassroomWithoutStudents(page);

  const studio = page.locator("main.activity-studio");
  await expect(studio).toBeVisible();
  await studio
    .locator(".activity-studio__category-options")
    .getByRole("button", { name: "Çizim", exact: true })
    .click();
  const activity = studio.locator("article.activity-card").first();
  await activity
    .getByRole("button", { name: /etkinliğini Çocuk Modunda uygula$/u })
    .click();

  const childMode = page.locator("main.activity-child-mode");
  await expect(childMode).toBeVisible();

  for (const label of ["PNG indir", "Yazdır"] as const) {
    await expectAboveBottomNavigationAndHitTestable(
      page,
      childMode.getByRole("button", { name: label, exact: true }),
    );
  }

  const footer = childMode.locator(".activity-child-mode__footer");
  for (const label of [
    "Bu etkinlik için gözlem yaz",
    "Pas geç",
    "Öğretmene dön",
  ] as const) {
    await expectAboveBottomNavigationAndHitTestable(
      page,
      footer.getByRole("button", { name: label, exact: true }),
    );
  }

  await footer.getByRole("button", { name: "Öğretmene dön", exact: true }).click();
  await expect(page.locator("main.activity-studio")).toBeVisible();
});
