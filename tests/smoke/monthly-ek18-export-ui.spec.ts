import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function configureClassroomWithStudent(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Aylık Plan Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Aylık Plan Mobil Kabul Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await expect(setup.locator(".official-calendar-applied")).toHaveText(/Uygulandı/);
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden({timeout:30_000});

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addSheet.getByLabel("Çocuğun adı").fill("Aylık Plan Kurgu Çocuk");
  await addSheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addSheet).toBeHidden();
  await expect(
    page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Aylık Plan Kurgu Çocuk" }),
  ).toBeVisible();
}

test("aylık TYMM planı telefonda PDF olur ve yeniden yüklemede hazır kalır", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=app&native=1&premiumPilot=1", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Aylık eğitim planı/i })
    .click();

  const planDialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(planDialog.getByRole("heading", { name: "TYMM başlangıç öneriniz hazır" })).toBeVisible();
  await planDialog
    .getByRole("button", { name: "Yıl → ay → hafta planını oluştur" })
    .click();
  await expect(planDialog).toContainText("tek işlemde bu cihaza kaydedildi");
  await planDialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();

  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await page.getByRole("button",{name:"İdareye sun",exact:true}).click();
  let monthlyOutput = page.getByRole("button", {
    name: /^Aylık eğitim planı\. Durum: Hazır\. Görsel PDF\./,
  });
  await expect(monthlyOutput).toBeVisible();
  await monthlyOutput.click();
  const preview=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});
  await expect(preview).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await preview.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const bytes = await readFile(downloadPath!);
  expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(bytes.subarray(-5).toString("ascii")).toBe("%%EOF");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("premium-plan-center")).toHaveCount(0);
  await page.getByRole("button",{name:"İdareye sun",exact:true}).click();
  monthlyOutput = page.getByRole("button", {
    name: /^Aylık eğitim planı\. Durum: Hazır\. Görsel PDF\./,
  });
  await expect(monthlyOutput).toBeVisible();
});
