import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";

const classroomName = "Gerçek UI Öğretmen Haftası";
const studentNames = ["Ada Yılmaz", "Bora Kaya", "Ceren Aksoy"] as const;

async function configureClassroom(page: Page): Promise<void> {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Okul adı").fill("Kurgu İlkokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Akış");
  await setup.getByLabel("Sınıf adı").fill(classroomName);
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

async function addStudentsSerially(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  const nameInput = sheet.getByLabel("Çocuğun adı");

  for (const name of studentNames.slice(0, -1)) {
    await nameInput.fill(name);
    await sheet
      .getByRole("button", { name: "Kaydet ve sıradakini ekle", exact: true })
      .click();
    await expect(nameInput).toHaveValue("");
    await expect(nameInput).toBeFocused();
  }

  await nameInput.fill(studentNames.at(-1)!);
  await sheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(sheet).toBeHidden();
  for (const name of studentNames) {
    await expect(
      page.locator("button.simple-student-list__profile").filter({ hasText: name }),
    ).toBeVisible();
  }
}

async function openTeacherPlanWorkspace(page: Page) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Yıllık planlama panosu/i })
    .click();
  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectDocumentDownload(
  page: Page,
  dialog: ReturnType<Page["getByRole"]>,
  buttonName: "Görsel PDF hazırla" | "Word hazırla",
  extension: ".pdf" | ".docx",
): Promise<Download> {
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: buttonName }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`));
  return download;
}

test.use({ viewport: { width: 390, height: 844 } });

test("öğretmen gerçek UI ile sınıfını kurar, haftalık planını revize eder ve belgelerini alır", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addStudentsSerially(page);

  let dialog = await openTeacherPlanWorkspace(page);
  await expect(dialog.getByRole("heading", { name: "TYMM başlangıç öneriniz hazır" })).toBeVisible();
  await dialog.getByText("Başlangıç metinlerini düzenle", { exact: true }).click();
  await dialog
    .getByLabel("Bu yıl sınıfınız için en önemli öncelik nedir?")
    .fill("Her çocuğun güvenli katılımını ve sınıf aidiyetini güçlendirmek");
  await dialog
    .getByLabel("Bu ay neye odaklanacaksınız?")
    .fill("Uyum, güvenli rutinler ve akranlarla birlikte karar verme");
  await dialog
    .getByLabel("Bu haftanın öğretmen akışı nedir?")
    .fill("Karşılama, oyun, araştırma, günlük gözlem ve gün sonu kapanışı");
  const nextMonth = dialog.getByLabel("Sonraki ay için başlangıç niyetiniz nedir?");
  if (await nextMonth.isVisible().catch(() => false)) {
    await nextMonth.fill("İlk ayın kanıtlarına göre küçük grup düzenini uyarlamak");
  }
  await dialog
    .getByRole("button", { name: "Yıl → ay → hafta planını oluştur" })
    .click();
  await expect(dialog).toContainText("tek işlemde bu cihaza kaydedildi");

  await dialog
    .getByRole("button", { name: /haftalık planını düzenle/i })
    .first()
    .click();
  await dialog.getByLabel("Plan başlığı").fill("Kurgu Revize Haftalık Çalışma Akışı");
  await dialog
    .getByLabel("Öğretmen plan notu")
    .fill("Oyun, gözlem ve aile iletişimi hafta sonunda yeniden değerlendirilecek.");
  await dialog.getByRole("button", { name: "Revizyonu kaydet" }).click();
  await expect(dialog).toContainText("önceki sürüm korunarak kaydedildi");
  await expect(dialog).toContainText("Kurgu Revize Haftalık Çalışma Akışı");

  const documentCenter = dialog.locator(
    'section[aria-labelledby="teacher-plan-export-title"]',
  );
  await documentCenter.getByLabel("Belge kapsamı").selectOption("combined");
  const pdf = await expectDocumentDownload(page, documentCenter, "Görsel PDF hazırla", ".pdf");
  const pdfPath = await pdf.path();
  expect(pdfPath).not.toBeNull();
  expect((await readFile(pdfPath!)).subarray(0, 4).toString("ascii")).toBe("%PDF");
  const word = await expectDocumentDownload(page, documentCenter, "Word hazırla", ".docx");
  const wordPath = await word.path();
  expect(wordPath).not.toBeNull();
  expect((await readFile(wordPath!)).subarray(0, 2).toString("ascii")).toBe("PK");

  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
  await page.reload({ waitUntil: "networkidle" });
  dialog = await openTeacherPlanWorkspace(page);
  await expect(dialog).toContainText("Kurgu Revize Haftalık Çalışma Akışı");
  await expect(dialog).toContainText("revizyon 2");

  const layout = await dialog.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});
