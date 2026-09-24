import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, ageLabel = "60–72 ay") {
  await page.goto("/?native=1");
  const form = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await form.getByLabel("Okul adı", { exact: true }).fill("Mobil Test Okulu");
  await form.getByLabel("Öğretmen adı soyadı", { exact: true }).fill("Kurgusal Öğretmen");
  await form.getByLabel("Sınıf adı", { exact: true }).fill("Kurgusal Mobil Sınıf");
  await form.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: ageLabel });
  await form.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(form).toBeHidden();
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await openDailyOfficialForm(page);
  const workspace = page.getByRole("dialog", { name: "Form çalışma alanı", exact: true });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByLabel("Okul adı", { exact: true })).toHaveValue("Mobil Test Okulu");
}

async function openDailyOfficialForm(page: Page) {
  await page.getByRole("button", { name: /^Tüm formlarda ara/ }).click();
  const picker = page.getByRole("dialog", { name: "Form seç", exact: true });
  await expect(picker).toBeVisible();
  await picker.getByLabel("Form ara", { exact: true }).fill("EK-6");
  await picker.getByRole("button", { name: /EK-6 Günlük Plan/ }).click();
  await expect(picker).toBeHidden();
}

test("form scope starts from the teacher-selected age and never substitutes the 60–72 checklist", async ({ page }) => {
  await setup(page, "48–60 ay");
  await expect(page.getByRole("combobox", { name: "Yaş bandı", exact: true })).toHaveValue("48-60");
  await expect(page.getByLabel("Yaş grubu", { exact: true })).toHaveValue("48-60");
  await expect(page.getByLabel("Yaş grubu", { exact: true })).toHaveAttribute("readonly", "");
  await choose(page, "EK-15", /EK-15/);
  await expect(page.getByText("Bu EK-15 kaynağı yalnız 60–72 ay için doğrulandı.", { exact: false })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Yaş bandı", exact: true })).toHaveValue("48-60");
});

async function choose(page: Page, query: string, title: RegExp) {
  await page.getByRole("button", { name: "Form değiştir", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Form seç", exact: true });
  await picker.getByLabel("Form ara", { exact: true }).fill(query);
  await picker.getByRole("button", { name: title }).click();
  await expect(picker).toBeHidden();
}

for (const width of [320, 390, 430]) {
  test(`form editor ${width}px preserves long text across form switch and reload`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    const input = page.getByLabel("Alan becerileri", { exact: true });
    const value = "Kurgusal kabul kaydı: blokları renge göre ayırma.\n".repeat(16);
    await input.fill(value);
    await expect(page.getByRole("status").filter({ hasText: "Kayıt cihazda saklı" })).toBeVisible();
    const geometry = await input.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }));
    expect(geometry.width).toBeGreaterThan(width - 120);
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 2);
    await choose(page, "EK-5", /EK-5 Aylık Plan/);
    await expect(page.getByRole("heading", { name: "EK-5 Aylık Plan", exact: true })).toBeVisible();
    await choose(page, "EK-6", /EK-6 Günlük Plan/);
    await expect(input).toHaveValue(value);
    await page.reload();
    await openDailyOfficialForm(page);
    await expect(input).toHaveValue(value);
    const overflow = await page.getByRole("dialog", { name: "Form çalışma alanı", exact: true }).evaluate(el => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await input.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`daily-${width}.png`) });
    await page.getByRole("button", { name: "Form değiştir", exact: true }).click();
    await page.getByRole("dialog", { name: "Form seç", exact: true }).press("Escape");
    await expect(page.getByRole("button", { name: "Form değiştir", exact: true })).toBeFocused();
    expect(await page.locator('meta[name="viewport"]').getAttribute("content")).not.toMatch(/user-scalable=no|maximum-scale=1/);
  });
}

test("monthly examples require explicit choice and support undo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await choose(page, "EK-5", /EK-5 Aylık Plan/);
  const evaluation = page.getByLabel("Çocuk açısından değerlendirme", { exact: true });
  await evaluation.fill("Kurgusal öğretmen değerlendirmesi korunacak.");
  await page.getByRole("button", { name: /^Örnek metin seç/ }).first().click();
  const choices = page.getByRole("dialog", { name: "Örnek metin seç", exact: true });
  await expect(choices).toContainText("Örnekler kayıtlı gözlem değildir");
  await choices.getByRole("button", { name: "Metnin sonuna ekle", exact: true }).first().click();
  await expect(evaluation).toHaveValue(/^Kurgusal öğretmen değerlendirmesi korunacak\.\n\n.+/s);
  await page.getByRole("button", { name: "Örnek eklemeyi geri al", exact: true }).click();
  await expect(evaluation).toHaveValue("Kurgusal öğretmen değerlendirmesi korunacak.");
});
