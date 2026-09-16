import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function configureMaarifClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Resmî Kaynak Test Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Resmî Kaynak Test Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("Planlar içindeki resmî TYMM kütüphanesi PDF sözleşmesini ve erişim yedeğini korur", async ({
  page,
}) => {
  // Belge gövdesini yüklemiyoruz: test, dış ağdan bağımsız biçimde okuyucu DOM
  // sözleşmesini ve güvenli resmî kaynak URL'sini doğrular.
  await page.route("https://tymm.meb.gov.tr/**", (route) => route.abort());
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureMaarifClassroom(page);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const plans = page.getByRole("main", { name: "Planlar" });
  await expect(plans).toBeVisible();

  const pilotProtocol = plans.getByTestId("teacher-pilot-protocol-summary");
  await expect(pilotProtocol).toHaveAttribute("data-pilot-status", "not-run");
  await expect(pilotProtocol).not.toHaveAttribute("open", "");
  await expect(pilotProtocol.locator("summary")).toContainText("Gerçek öğretmen pilotu");
  await expect(pilotProtocol.locator("summary")).toContainText("Gerçek ölçüm yok");

  const panel = plans.getByTestId("tymm-official-library-panel");
  await expect(panel).toHaveAccessibleName("Resmî TYMM kaynakları");
  await expect(panel.getByRole("button")).toHaveCount(1);
  await expect(panel.getByTestId("tymm-official-library-open")).toContainText(
    "38 PDF · 35 erişilebilir · erişilemeyen üç resmî PDF bağlantısı",
  );
  await expect(panel).toContainText(
    "erişilemeyen üç resmî PDF bağlantısı",
  );
  await expect(plans.getByTestId("simple-official-resources")).toHaveCount(0);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    const pageLayout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(pageLayout.documentWidth).toBeLessThanOrEqual(pageLayout.viewportWidth + 1);
    expect(pageLayout.bodyWidth).toBeLessThanOrEqual(pageLayout.viewportWidth + 1);
    const openButtonBox = await panel
      .getByTestId("tymm-official-library-open")
      .boundingBox();
    expect(openButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    const pilotSummaryBox = await pilotProtocol.locator("summary").boundingBox();
    expect(pilotSummaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await pilotProtocol.locator("summary").click();
  await expect(pilotProtocol).toHaveAttribute("open", "");
  await expect(pilotProtocol.locator("ol > li")).toHaveCount(4);
  await expect(pilotProtocol).toContainText("P01 · quick-observation");
  await expect(pilotProtocol).toContainText("P02 · official-report-preparation");
  await expect(pilotProtocol).toContainText("P03 · official-appointment-preparation");
  await expect(pilotProtocol).toContainText("P04 · scoped-document-export");
  await expect(pilotProtocol).toContainText("En az 19/20 doğru görev");
  await expect(pilotProtocol).toContainText("Ham süre medyanı en fazla 25 saniye");
  await expect(pilotProtocol).toContainText("Başarılı görevlerin hiçbiri 45 saniyeyi aşamaz");
  await expect(pilotProtocol).toContainText("Yanlış çocuk/kapsam sayısı 0");
  await expect(pilotProtocol).toContainText("Sahte resmî tamamlandı sayısı 0");
  await expect(pilotProtocol).toContainText("Tekrar giriş medyanı 0");
  await expect(pilotProtocol).toContainText("15 saniye yalnız P01 için ikincil tasarım hedefidir");
  await expect(pilotProtocol.locator("button, input, select, output")).toHaveCount(0);
  await pilotProtocol.locator("summary").click();
  await expect(pilotProtocol).not.toHaveAttribute("open", "");

  await panel.getByTestId("tymm-official-library-open").click();
  let dialog = page.getByRole("dialog", {
    name: "Resmî TYMM okul öncesi kütüphanesi",
  });
  await expect(dialog).toBeVisible();
  const reviewDisclosure = dialog.getByRole("region", {
    name: "Pedagojik eşleme inceleme durumu",
  });
  await expect(reviewDisclosure).toHaveAttribute(
    "data-review-status",
    "pending-human-review",
  );
  await expect(reviewDisclosure).toContainText(
    "Pedagojik eşlemeler doğrulanmış değildir",
  );
  await expect(reviewDisclosure).toContainText(
    "Resmî kaynak künyesi bu pedagojik onayın yerine geçmez",
  );
  let filters = dialog.locator(".tymm-library-filters");
  let ageFilter = filters.locator("select").nth(0);
  let materialFilter = filters.locator("select").nth(1);
  let areaFilter = filters.locator("select").nth(2);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    const mobileScrollLayout = await dialog.evaluate((element) => {
      const filtersElement = element.querySelector<HTMLElement>(".tymm-library-filters");
      const resultsList = element.querySelector<HTMLElement>(".tymm-library-results > ul");
      const body = element.querySelector<HTMLElement>(".tymm-library-dialog__body");
      if (!filtersElement || !resultsList || !body) {
        throw new Error("TYMM mobil kaydırma bölgeleri bulunamadı.");
      }
      const nestedScrollers = [...element.querySelectorAll<HTMLElement>("*")]
        .filter((candidate) => {
          const style = getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            candidate.scrollHeight > candidate.clientHeight + 1 &&
            /^(auto|scroll)$/u.test(style.overflowY)
          );
        })
        .map((candidate) => candidate.className);
      return {
        bodyOverflow: getComputedStyle(body).overflowY,
        dialogClientWidth: element.clientWidth,
        dialogScrollWidth: element.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        filterClientHeight: filtersElement.clientHeight,
        filterOverflow: getComputedStyle(filtersElement).overflowY,
        filterScrollHeight: filtersElement.scrollHeight,
        nestedScrollers,
        resultsClientHeight: resultsList.clientHeight,
        resultsOverflow: getComputedStyle(resultsList).overflowY,
        resultsScrollHeight: resultsList.scrollHeight,
        viewportWidth: window.innerWidth,
      };
    });
    expect(mobileScrollLayout.bodyOverflow).toBe("auto");
    expect(mobileScrollLayout.filterOverflow).toBe("visible");
    expect(mobileScrollLayout.filterScrollHeight).toBeLessThanOrEqual(
      mobileScrollLayout.filterClientHeight + 1,
    );
    expect(mobileScrollLayout.resultsOverflow).toBe("visible");
    expect(mobileScrollLayout.resultsScrollHeight).toBeLessThanOrEqual(
      mobileScrollLayout.resultsClientHeight + 1,
    );
    expect(mobileScrollLayout.nestedScrollers).toEqual(["tymm-library-dialog__body"]);
    expect(mobileScrollLayout.documentWidth).toBeLessThanOrEqual(
      mobileScrollLayout.viewportWidth + 1,
    );
    expect(mobileScrollLayout.dialogScrollWidth).toBeLessThanOrEqual(
      mobileScrollLayout.dialogClientWidth + 1,
    );

    const undersizedControls = await dialog
      .locator("button, input, select, a, summary")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          })
          .map((element) => ({
            height: element.getBoundingClientRect().height,
            tag: element.tagName,
            width: element.getBoundingClientRect().width,
          })),
      );
    expect(undersizedControls).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(ageFilter).toHaveValue("60-72");
  await expect(materialFilter).toHaveValue("all");
  await expect(areaFilter).toHaveValue("all");
  const featured = dialog.getByTestId("tymm-library-featured");
  await expect(featured).not.toHaveAttribute("open", "");
  await featured.getByText("Bu plan için öne çıkan kaynaklar", { exact: true }).click();
  await expect(featured.locator(".tymm-library-recommendations button")).toHaveCount(3);
  const planExamples = featured.locator(".tymm-library-plan-examples");
  await planExamples
    .getByText("MEB’de yayımlanmış plan örnekleri", { exact: true })
    .click();
  await expect(planExamples.getByRole("link")).toHaveCount(5);
  await expect(
    planExamples.getByRole("link").filter({ hasText: "MEB’de yayımlanmış plan örneği" }),
  ).toHaveCount(4);
  await expect(planExamples).toContainText("planınıza otomatik aktarılmaz");
  await featured.getByText("Bu plan için öne çıkan kaynaklar", { exact: true }).click();
  await expect(featured).not.toHaveAttribute("open", "");
  await expect(dialog).toContainText("Ortak TYMM çerçevesi · 21 resmî sayfa");
  await expect(dialog).toContainText("Okul öncesi videoları · 15 resmî sayfa");
  await expect(dialog).toContainText(
    "Ortak öğretmen eğitim videoları · 11 resmî sayfa",
  );
  const connectivity = dialog.locator(".tymm-library-connectivity");
  await expect(connectivity).toBeVisible();
  await expect(connectivity).toContainText(
    "resmî PDF ve MEB sayfalarını açmak için internet gerekir",
  );

  const programResource = dialog
    .getByRole("complementary", { name: "Resmî belge sonuçları" })
    .locator("li > button")
    .filter({
      hasText: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
    });
  await programResource.click();
  const programViewer = dialog.getByTestId("tymm-official-document-viewer");
  await expect(programViewer).toContainText("2024.09.02");
  await expect(programViewer).toContainText(
    "77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
  );
  await expect(programViewer).toContainText("353 sayfa");
  await expect(programViewer).toContainText("8.333.712 bayt");
  await expect(programViewer).toContainText("Erişilebilir · 1 Eylül 2026 denetimi");
  await expect(programViewer).toContainText(
    "Yok · bu sürümde doğrulanmış yerel TYMM PDF varlığı bulunmuyor",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
  });
  await expect(connectivity).toContainText("Çevrimdışısınız");

  await filters.locator("input[type='search']").fill("matematik");
  await materialFilter.selectOption("teacher-guide");
  await areaFilter.selectOption("mathematics");
  const results = dialog.getByRole("complementary", {
    name: "Resmî belge sonuçları",
  });
  await expect(results.getByRole("status")).toHaveText(/1\s+kaynak gösteriliyor/u);
  const mathematicsGuide = results
    .locator("li > button")
    .filter({ hasText: "Matematik Alanı Kılavuz Kitabı" });
  await expect(mathematicsGuide).toHaveCount(1);
  await mathematicsGuide.click();

  const availableViewer = dialog.getByTestId("tymm-official-document-viewer");
  await expect(availableViewer).toContainText("Matematik Alanı Kılavuz Kitabı");
  await expect(availableViewer).toContainText(
    "Kaynak bilgisi görünür kalır; resmî PDF için internete bağlanın",
  );
  const viewerHeading = availableViewer.getByRole("heading", {
    name: "Matematik Alanı Kılavuz Kitabı",
  });
  await expect(viewerHeading).toBeFocused();
  await expect(viewerHeading).toBeInViewport();
  const iframe = availableViewer.locator("iframe");
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute(
    "src",
    "https://tymm.meb.gov.tr/assets/pdf/matematik-alani.pdf#view=FitH",
  );
  await expect(iframe).toHaveAttribute(
    "title",
    "Matematik Alanı Kılavuz Kitabı · uygulama içi resmî PDF okuyucu",
  );
  await expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(await iframe.evaluate((element) => element.hasAttribute("sandbox"))).toBe(false);
  await expect(
    availableViewer.getByRole("link", { name: /PDF’sini aç veya indir \(yeni sekmede\)/u }),
  ).toHaveAttribute("href", "https://tymm.meb.gov.tr/assets/pdf/matematik-alani.pdf");

  const dialogLayout = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      left: rect.left,
      right: rect.right,
    };
  });
  expect(dialogLayout.documentWidth).toBeLessThanOrEqual(dialogLayout.viewportWidth + 1);
  expect(dialogLayout.scrollWidth).toBeLessThanOrEqual(dialogLayout.clientWidth + 1);
  expect(dialogLayout.left).toBeGreaterThanOrEqual(-1);
  expect(dialogLayout.right).toBeLessThanOrEqual(dialogLayout.viewportWidth + 1);

  await dialog
    .getByRole("button", { name: "Resmî kaynak kütüphanesini kapat" })
    .click();
  await expect(page.getByTestId("tymm-official-library-dialog")).toHaveCount(0);
  await expect(page.getByTestId("tymm-official-document-viewer")).toHaveCount(0);
  await expect(page.locator("iframe[src^='https://tymm.meb.gov.tr/']")).toHaveCount(0);
  await expect(panel.getByTestId("tymm-official-library-open")).toBeFocused();

  await panel.getByTestId("tymm-official-library-open").click();
  dialog = page.getByRole("dialog", {
    name: "Resmî TYMM okul öncesi kütüphanesi",
  });
  filters = dialog.locator(".tymm-library-filters");
  ageFilter = filters.locator("select").nth(0);
  materialFilter = filters.locator("select").nth(1);
  areaFilter = filters.locator("select").nth(2);
  const selectedMathematicsGuide = dialog
    .getByRole("complementary", { name: "Resmî belge sonuçları" })
    .locator("li > button")
    .filter({ hasText: "Matematik Alanı Kılavuz Kitabı" });
  await selectedMathematicsGuide.click();
  await expect(dialog.locator("iframe")).toHaveCount(1);
  await filters.locator("input[type='search']").fill("Sosyal Alanı");
  await expect(dialog.getByTestId("tymm-official-document-viewer")).toHaveCount(0);
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await ageFilter.selectOption("36-48");
  await materialFilter.selectOption("teacher-guide");
  await areaFilter.selectOption("social");

  const unavailableResults = dialog.getByRole("complementary", {
    name: "Resmî belge sonuçları",
  });
  await expect(unavailableResults.getByRole("status")).toHaveText(
    /1\s+kaynak gösteriliyor/u,
  );
  const unavailableGuide = unavailableResults
    .locator("li > button")
    .filter({ hasText: "Sosyal Alan Öğretmen Kılavuz Kitabı" });
  await expect(unavailableGuide).toContainText(
    "PDF bağlantısı 1 Eylül 2026 denetiminde yanıt vermedi",
  );
  await unavailableGuide.click();

  const unavailableViewer = dialog.getByTestId("tymm-official-document-viewer");
  await expect(unavailableViewer).toContainText(
    "Resmî PDF bağlantısı 1 Eylül 2026 denetiminde yanıt vermedi",
  );
  await expect(unavailableViewer.locator("iframe")).toHaveCount(0);
  await expect(unavailableViewer).toContainText(
    "Kaynakta doğrulanmış tarih bulunmuyor",
  );
  await expect(unavailableViewer).toContainText("Bu PDF için doğrulanmadı");
  await expect(unavailableViewer).toContainText(
    "Yanıt vermedi · 1 Eylül 2026 denetimi",
  );
  await expect(
    unavailableViewer.getByRole("link", {
      name: /Sosyal Alan Öğretmen Kılavuz Kitabı resmî MEB sayfasını aç/u,
    }),
  ).toHaveAttribute(
    "href",
    "https://tymm.meb.gov.tr/kitap/2/sosyal-alan-ogretmen-kilavuz-kitabi",
  );
  await expect(
    unavailableViewer.getByRole("link", { name: /PDF’sini aç veya indir/u }),
  ).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(panel.getByTestId("tymm-official-library-open")).toBeFocused();

  await panel.getByTestId("tymm-official-library-open").click();
  dialog = page.getByRole("dialog", {
    name: "Resmî TYMM okul öncesi kütüphanesi",
  });
  const dialogFeatured = dialog.getByTestId("tymm-library-featured");
  await dialogFeatured
    .getByText("Bu plan için öne çıkan kaynaklar", { exact: true })
    .click();
  const recommendationTrigger = dialogFeatured
    .locator(".tymm-library-recommendations button")
    .first();
  await recommendationTrigger.click();
  await expect(dialog.getByTestId("tymm-official-document-viewer")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Resmî kaynak kütüphanesini kapat" })
    .click();
  await expect(panel.getByTestId("tymm-official-library-open")).toBeFocused();
});
