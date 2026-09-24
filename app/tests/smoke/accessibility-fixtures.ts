import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

export const PHONE_VIEWPORT_WIDTHS = [320, 360, 390, 412, 430] as const;

export async function configureAccessibilityClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Erişilebilirlik Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Erişilebilirlik Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden({timeout:30_000});
}

export async function addAccessibilityChild(page: Page) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Çocuk ekle" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Çocuğun adı").fill("Kurgu Erişilebilirlik Çocuğu");
  await dialog.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

type AxeImpact = "minor" | "moderate" | "serious" | "critical" | null;

type AxeTriage = Readonly<{
  state: string;
  ruleId: string;
  impact: Exclude<AxeImpact, null>;
  target: string;
  owner: string;
  reason: string;
}>;

// İstisnalar sessizce filtrelenmez. Her kayıt tam durum + kural + hedef,
// sorumlu ve gerekçe taşımalı; eşleşen kayıt test raporuna annotation olur.
const OPEN_AXE_TRIAGE: readonly AxeTriage[] = [];

function targetText(target: readonly (string | readonly string[])[]) {
  return target
    .map((part) => (Array.isArray(part) ? part.join(" ") : part))
    .join(" ");
}

function matchesTriage(
  entry: AxeTriage,
  state: string,
  ruleId: string,
  impact: AxeImpact,
  target: string,
) {
  return (
    entry.state === state &&
    entry.ruleId === ruleId &&
    entry.impact === impact &&
    target.includes(entry.target)
  );
}

export async function expectNoUntriagedAxeViolations(
  page: Page,
  testInfo: TestInfo,
  state: string,
) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const untriaged: Array<{
    state: string;
    id: string;
    impact: AxeImpact;
    help: string;
    target: string;
    failureSummary: string | undefined;
  }> = [];

  for (const violation of result.violations) {
    for (const node of violation.nodes) {
      const target = targetText(node.target);
      const triage = OPEN_AXE_TRIAGE.find((entry) =>
        matchesTriage(entry, state, violation.id, violation.impact, target),
      );
      if (triage) {
        testInfo.annotations.push({
          type: `axe-triage/${triage.impact}`,
          description: `${state} · ${triage.ruleId} · ${triage.target} · ${triage.owner}: ${triage.reason}`,
        });
        continue;
      }
      untriaged.push({
        state,
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        target,
        failureSummary: node.failureSummary,
      });
    }
  }

  const manualReview = result.incomplete.map(({ id, impact, help, nodes }) => ({
    state,
    id,
    impact,
    help,
    targets: nodes.map((node) => targetText(node.target)),
  }));
  if (manualReview.length > 0) {
    await testInfo.attach(`axe-manual-review-${state}.json`, {
      body: Buffer.from(JSON.stringify(manualReview, null, 2)),
      contentType: "application/json",
    });
  }

  expect(
    untriaged,
    `${state} durumunda triage edilmemiş minor–critical Axe ihlalleri bulundu`,
  ).toEqual([]);
}
