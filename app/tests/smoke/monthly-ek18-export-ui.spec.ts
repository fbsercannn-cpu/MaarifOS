import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";

type CapturedBlob = {
  size: number;
  type: string;
};

async function configurePremiumClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Ek 18 Mobil Kabul Sınıfı");
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
  await page.getByLabel("Çocuğun adı").fill("Ek 18 Kurgu Çocuk");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

async function captureDownload(
  page: Page,
  testId: string,
): Promise<{ blob: CapturedBlob; bytes: Buffer; download: Download }> {
  const capturedCount = await page.evaluate(
    () => (window as Window & { __ek18CapturedBlobs?: CapturedBlob[] })
      .__ek18CapturedBlobs?.length ?? 0,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId(testId).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = await readFile(downloadPath!);
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as Window & { __ek18CapturedBlobs?: CapturedBlob[] })
          .__ek18CapturedBlobs?.length ?? 0,
      ),
    )
    .toBeGreaterThan(capturedCount);
  const blob = await page.evaluate(
    () => (window as Window & { __ek18CapturedBlobs?: CapturedBlob[] })
      .__ek18CapturedBlobs?.at(-1) ?? null,
  );
  expect(blob).not.toBeNull();
  return { blob: blob!, bytes, download };
}

test("kalıcı aylık değerlendirme telefonda Ek 18 PDF/DOCX indirir ve yeniden yüklemede seçimi korur", async ({
  browserName,
  page,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const capturedWindow = window as Window & {
      __ek18CapturedBlobs?: CapturedBlob[];
      __ek18CreateObjectUrlWrapped?: boolean;
    };
    capturedWindow.__ek18CapturedBlobs = [];
    if (capturedWindow.__ek18CreateObjectUrlWrapped) return;
    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (value: Blob | MediaSource) => {
      if (value instanceof Blob) {
        capturedWindow.__ek18CapturedBlobs?.push({
          size: value.size,
          type: value.type,
        });
      }
      return originalCreateObjectURL(value);
    };
    capturedWindow.__ek18CreateObjectUrlWrapped = true;
  });

  await page.goto("/?premiumPilot=1", { waitUntil: "networkidle" });
  await configurePremiumClassroom(page);
  await page.getByRole("button", { name: "Planları aç" }).click();

  const center = page.getByTestId("premium-plan-center");
  await expect(center).toBeVisible();
  const pdfButton = center.getByTestId("premium-monthly-ek18-pdf");
  const wordButton = center.getByTestId("premium-monthly-ek18-word");
  await expect(pdfButton).toBeDisabled();
  await expect(wordButton).toBeDisabled();

  await center
    .getByRole("button", { name: "Eylül paketini + yıllık omurgayı ekle" })
    .click();
  await expect(
    center.getByText("Eylül plan paketi ve yıllık omurga sınıfa eklendi"),
  ).toBeVisible();
  await expect(pdfButton).toBeDisabled();
  await expect(wordButton).toBeDisabled();

  await center
    .getByRole("button", {
      name: "Eylül ayını kanıtlar ve yansıtmayla değerlendir",
    })
    .click();
  const review = center.getByRole("region", {
    name: "Eylül aylık değerlendirme formu",
  });
  await expect(review).toBeVisible();
  const details = review.locator("details");
  await details.nth(1).locator("summary").click();
  await details.nth(2).locator("summary").click();
  await review
    .getByLabel("Program yönü öğretmen değerlendirmesi")
    .fill("Program bileşenleri aylık planın resmî hedefleriyle uyumlu uygulandı.");
  await review
    .getByLabel("Öğretmen yönü yansıtması")
    .fill("Geçiş süreleri ve materyal erişimi bir sonraki ay yeniden düzenlenecek.");
  await review
    .getByLabel("Sonraki ay için öğretmen önerisi")
    .fill("Aynı hedefler farklı merkezlerde yeniden gözlenecek.");
  const saveReview = review.getByRole("button", {
    name: "Aylık değerlendirmeyi yeni kayıt olarak ekle",
  });
  await expect(saveReview).toBeEnabled();
  await saveReview.click();
  await expect(
    review.getByText(
      "Aylık değerlendirme üç boyutuyla kaydedildi. Önceki kayıtlar değiştirilmeden korunuyor.",
    ),
  ).toBeVisible();
  await expect(pdfButton).toBeEnabled();
  await expect(wordButton).toBeEnabled();
  await expect(
    center.getByText(/Belge kaynağı: son kalıcı değerlendirme/),
  ).toBeVisible();

  const word = await captureDownload(page, "premium-monthly-ek18-word");
  if (process.env.MONTHLY_EK18_WORD_QA_PATH) {
    await word.download.saveAs(process.env.MONTHLY_EK18_WORD_QA_PATH);
  }
  expect(word.download.suggestedFilename()).toMatch(
    /^MaarifOS_Ek18_Aylik_Plan_Kontrol_2026-09_[0-9a-z-]{8}\.docx$/,
  );
  expect(word.blob.type).toBe(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  expect(word.blob.size).toBe(word.bytes.length);
  expect([...word.bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

  if (browserName === "chromium") {
    const pdf = await captureDownload(page, "premium-monthly-ek18-pdf");
    if (process.env.MONTHLY_EK18_PDF_QA_PATH) {
      await pdf.download.saveAs(process.env.MONTHLY_EK18_PDF_QA_PATH);
    }
    expect(pdf.download.suggestedFilename()).toMatch(
      /^MaarifOS_Ek18_Aylik_Plan_Kontrol_2026-09_[0-9a-z-]{8}\.pdf$/,
    );
    expect(pdf.blob.type).toBe("application/pdf");
    expect(pdf.blob.size).toBe(pdf.bytes.length);
    expect(pdf.bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.bytes.subarray(-5).toString("ascii")).toBe("%%EOF");
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Planları aç" }).click();
  const reloadedCenter = page.getByTestId("premium-plan-center");
  await expect(reloadedCenter.getByTestId("premium-monthly-ek18-pdf")).toBeEnabled();
  await expect(reloadedCenter.getByTestId("premium-monthly-ek18-word")).toBeEnabled();
  await expect(
    reloadedCenter.getByText(/Belge kaynağı: son kalıcı değerlendirme/),
  ).toBeVisible();

  await reloadedCenter
    .getByRole("button", {
      name: "Eylül ayını kanıtlar ve yansıtmayla değerlendir",
    })
    .click();
  const reloadedReview = reloadedCenter.getByRole("region", {
    name: "Eylül aylık değerlendirme formu",
  });
  const history = reloadedReview.locator("details.premium-monthly-history");
  await history.locator("summary").click();
  await history
    .getByRole("button", { name: "Bu kaydı belge için seç ve yeniden aç" })
    .click();
  await expect(
    reloadedReview.getByText(/Seçili eski kayıt forma ve Ek 18 belge çıktısına açıldı/),
  ).toBeVisible();
  await expect(reloadedCenter.getByTestId("premium-monthly-ek18-word")).toBeEnabled();
});
