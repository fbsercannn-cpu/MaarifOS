import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function configurePremiumClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Premium Mobil Kurgu Sınıfı");
  await setup.getByRole("button", { name: "Tarihleri uygula" }).click();
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("full_day");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Premium Kurgu Çocuk");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

test("premium tam gün planı telefonda 10 düzenlenebilir blok üretir ve gelecek tarihli planı erken başlatmaz", async ({
  browserName,
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/?premiumPilot=1", { waitUntil: "networkidle" });
  await configurePremiumClassroom(page);

  await page.getByRole("button", { name: "Önizlemeyi aç" }).click();
  const center = page.getByTestId("premium-plan-center");
  await expect(center).toBeVisible();
  const reviewPendingMonth = center.locator(".premium-month-list li.is-review-pending");
  await expect(reviewPendingMonth).toHaveCount(1);
  await expect(reviewPendingMonth).not.toHaveClass(/is-ready/);
  await expect(
    reviewPendingMonth.getByText("Uzman incelemesi bekliyor", { exact: true }),
  ).toBeVisible();
  await expect(reviewPendingMonth.locator("svg")).toHaveCount(1);
  const monthListOverflows = await reviewPendingMonth.evaluate((item) =>
    item.scrollWidth > item.clientWidth + 1
  );
  expect(monthListOverflows).toBe(false);
  await center.getByRole("button", { name: "Yıllık planı sınıfa ekle" }).click();
  await expect(center.getByText("Yıllık, aylık ve haftalık planlar sınıfa eklendi")).toBeVisible();

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
  await expect(mainActivities).toHaveCount(8);
  await mainActivities.nth(0).getByRole("button", { name: "Tam gün planını hazırla" }).click();

  const flow = page.locator(".premium-daily-flow-preview");
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
    name: "Tam gün planını kaydet ve etkinliği başlat",
  });
  await expect(savePlan).toBeEnabled();
  await savePlan.press("Enter");
  await expect(page.getByText(/tarihi için planlandı/)).toBeVisible();
  await expect(page.getByText(/İlk gözlem notunu ekleyebilirsiniz/)).toHaveCount(0);
});
