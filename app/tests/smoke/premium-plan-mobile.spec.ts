import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function configurePremiumClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Premium Mobil Kurgu Sınıfı");
  await expect(setup.getByText("Resmî tarihler uygulandı", { exact: true })).toBeVisible();
  await expect(setup.getByLabel("Eğitim yılı başlangıcı")).toHaveValue("2026-09-01");
  await expect(setup.getByLabel("Eğitim yılı bitişi")).toHaveValue("2027-08-31");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("full_day");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: /^(İlk çocuğu ekle|Çocuk ekle)$/ }).click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addSheet.getByLabel("Çocuğun adı").fill("Premium Kurgu Çocuk");
  await addSheet.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(addSheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Premium Kurgu Çocuk profilini aç" })).toBeVisible();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

test("premium tam gün planı telefonda 10 düzenlenebilir blok üretir ve gelecek tarihli planı erken başlatmaz", async ({
  browserName,
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/?premiumPilot=1", { waitUntil: "networkidle" });
  await configurePremiumClassroom(page);

  await page.getByRole("button", { name: "Planları aç" }).click();
  const center = page.getByTestId("premium-plan-center");
  await expect(center).toBeVisible();
  const libraryTabs = center.getByRole("navigation", {
    name: "Plan Kütüphanesi bölümleri",
  });
  await expect(libraryTabs.getByRole("button")).toHaveCount(3);
  await expect(
    libraryTabs.getByRole("button", { name: "Yıllık omurga" }),
  ).toHaveAttribute("aria-current", "page");
  const centerHasHorizontalOverflow = await center.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1,
  );
  expect(centerHasHorizontalOverflow).toBe(false);
  const monthList = center.locator(".premium-month-list");
  await expect(monthList.locator("li")).toHaveCount(10);
  await expect(monthList.getByRole("button", { name: "Bu ayı planla" })).toHaveCount(9);
  await expect(center.getByText(/insan uzman incelemeleri bekliyor/)).toBeVisible();
  const monthListOverflows = await monthList.evaluate((item) =>
    item.scrollWidth > item.clientWidth + 1,
  );
  expect(monthListOverflows).toBe(false);
  await center.getByRole("button", { name: "Eylül hazır içeriğini ekle" }).click();
  const installPanel = center.getByTestId("premium-install-panel");
  await expect(installPanel).toBeFocused();
  await expect(
    installPanel.getByText("Eylül hazır içerik paketi sınıfa eklendi"),
  ).toBeVisible();

  await libraryTabs.getByRole("button", { name: "Değerlendirme ve belge" }).click();
  await expect(
    libraryTabs.getByRole("button", { name: "Değerlendirme ve belge" }),
  ).toHaveAttribute("aria-current", "page");

  await center
    .getByRole("button", {
      name: "Eylül ayını kanıtlar ve yansıtmayla değerlendir",
    })
    .click();
  const monthlySave = center.getByRole("button", {
    name: "Aylık değerlendirmeyi yeni kayıt olarak ekle",
  });
  await expect(monthlySave).toBeDisabled();
  await expect(center.getByText("Kaydetmek için kalanlar", { exact: true })).toBeVisible();
  await expect(
    center.getByText("Program yönü öğretmen değerlendirmesini yazın.", {
      exact: true,
    }),
  ).toBeVisible();
  await center
    .getByRole("button", { name: "Aylık değerlendirme kayıtlarını kapat" })
    .click();

  const wordDownloadPromise = page.waitForEvent("download");
  await center.getByTestId("premium-export-word").click();
  const wordDownload = await wordDownloadPromise;
  expect(wordDownload.suggestedFilename()).toMatch(/\.docx$/);
  const wordPath = await wordDownload.path();
  expect(wordPath).toBeTruthy();
  const wordBytes = await readFile(wordPath!);
  expect([...wordBytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

  if (browserName === "chromium") {
    const pdfDownloadPromise = page.waitForEvent("download");
    await center.getByTestId("premium-export-pdf").click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    if (process.env.PREMIUM_PDF_QA_PATH) {
      await pdfDownload.saveAs(process.env.PREMIUM_PDF_QA_PATH);
    }
    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
    const pdfBytes = await readFile(pdfPath!);
    expect(pdfBytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdfBytes.subarray(-5).toString("ascii")).toBe("%%EOF");
  }

  const mainActivities = center.locator('article[data-activity-role="main"]');
  await libraryTabs.getByRole("button", { name: "Eylül içeriği" }).click();
  const weekSections = center.locator("details.premium-week-block");
  await expect(weekSections).toHaveCount(4);
  await weekSections.first().locator(":scope > summary").click();
  await expect(mainActivities).toHaveCount(8);
  await weekSections
    .first()
    .getByRole("button", { name: "Haftayı kanıtlarla değerlendir" })
    .click();
  await expect(
    center.getByRole("button", {
      name: "Değerlendirmeyi kaydet ve sonraki haftaya taşı",
    }),
  ).toBeDisabled();
  await expect(
    center.getByText("En az bir bağlı ham gözlem seçin.", { exact: true }),
  ).toBeVisible();
  await weekSections
    .first()
    .getByRole("button", { name: "Hafta kayıtlarını kapat" })
    .click();
  await weekSections.first().locator(":scope > summary").click();
  await mainActivities.nth(0).getByRole("button", { name: "Tam gün planını hazırla" }).click();

  const flow = page.locator(".premium-daily-flow-preview");
  await expect(page.getByText("Günlük plan hazırlığı", { exact: true })).toBeVisible();
  await expect(page.getByText("Bugünün uygulama kaydı", { exact: true })).toHaveCount(0);
  await expect(flow.getByRole("heading", { name: "10 blok otomatik yerleşti" })).toBeVisible();
  await expect(flow.locator(":scope > ol > li")).toHaveCount(10);
  await flow.getByRole("radio", { name: /Haftanın alternatifini bunun yerine uygula/ }).click();
  await expect(flow.getByRole("radio", { name: /Haftanın alternatifini bunun yerine uygula/ })).toHaveAttribute("aria-checked", "true");
  await expect(flow.getByText(/Yerine geçtiği ana etkinlik:/)).toBeVisible();
  const firstEditor = flow.locator(":scope > ol > li").nth(0).locator("details");
  await firstEditor.locator("summary").press("Enter");
  await expect(firstEditor).toHaveAttribute("open", "");
  await firstEditor.getByLabel("Süre (dakika)").fill("25");
  await firstEditor.getByLabel("Geçiş notu").fill("Sakin geçiş");
  await firstEditor.getByLabel("Öğretmen notu").fill("Karşılama gözlemi");
  await flow.getByRole("heading", { name: "10 blok otomatik yerleşti" }).click();

  const horizontalOverflow = await page.evaluate(() => {
    const scroller = document.querySelector(".d1-flow-scroll");
    return scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : true;
  });
  expect(horizontalOverflow).toBe(false);

  const savePlan = page.getByRole("button", {
    name: "Tam gün planını kaydet",
  });
  await expect(savePlan).toBeEnabled();
  await savePlan.press("Enter");
  await expect(page.getByText(/tarihi için planlandı/)).toBeVisible();
  await expect(page.getByText(/İlk gözlem notunu ekleyebilirsiniz/)).toHaveCount(0);
});
