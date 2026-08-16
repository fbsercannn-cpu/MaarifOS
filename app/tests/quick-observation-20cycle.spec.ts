import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

const CYCLE_COUNT = 20;
const MAX_INTERACTIONS_PER_CYCLE = 3;
const TECHNICAL_RUNTIME_BUDGET_MS = 120_000;
const CHILD_NAME = "Defne Kurgu";

type CycleMetric = {
  cycle: number;
  observationType: "child-quote" | "quick-note";
  teacherInteractions: number;
  automatedTechnicalLatencyMs: number;
};

function percentile(values: number[], percentileRank: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileRank / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

async function clearLocalDatabase(page: Page) {
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("maarifos-local");
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () =>
        reject(new Error("Kurgu hızlı gözlem veritabanı temizlenemedi.")),
      );
    });
    window.localStorage.clear();
  });
}

async function acknowledgeReleaseIfNeeded(page: Page) {
  const acknowledgement = page.getByRole("button", {
    name: "Harika, başlayalım",
  });
  if (await acknowledgement.isVisible().catch(() => false)) {
    await acknowledgement.click();
  }
}

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (!(await setup.isVisible().catch(() => false))) return;

  await setup.getByLabel("Sınıf adı").fill("20 Çevrim Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });

  const catalogId = setup.getByLabel("Program katalog kimliği");
  if (await catalogId.isVisible().catch(() => false)) {
    await catalogId.fill("KURGU-20-CEVRIM");
  }
  const sourceVersion = setup.getByLabel("Kaynak sürümü");
  if (await sourceVersion.isVisible().catch(() => false)) {
    await sourceVersion.fill("2026-test");
  }
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");

  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function addFictionalChild(page: Page) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: /^(İlk çocuğu ekle|Çocuk ekle)$/ }).click();
  await page.getByLabel("Çocuğun adı").fill(CHILD_NAME);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: /Sınıftaki çocuklar/i })
      .getByRole("button", { name: new RegExp(`${CHILD_NAME}.*gözlem ekle`, "i") }),
  ).toBeVisible();
}

async function assertRemovedDuplicateFields(page: Page) {
  await expect(
    page.getByLabel("Bağlam / ne sırasında?", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Çocuğun sözü", { exact: true })).toHaveCount(0);
}

async function interact(
  action: "click" | "fill",
  target: Locator,
  value?: string,
) {
  if (action === "click") {
    await target.click();
    return 1;
  }
  await target.fill(value ?? "");
  return 1;
}

async function readObservations(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    try {
      return await new Promise<
        Array<{
          id: string;
          studentId: string;
          rawText: string;
          rawTextImmutable: boolean;
          observationType: string;
          deletedAt: string | null;
        }>
      >((resolve, reject) => {
        const request = database
          .transaction("observations", "readonly")
          .objectStore("observations")
          .getAll();
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error));
      });
    } finally {
      database.close();
    }
  });
}

test("390×844 sade hızlı gözlem 20 çevrimde ≤3 etkileşimle tekil ve kalıcı kanıt üretir", async ({
  page,
}) => {
  test.setTimeout(TECHNICAL_RUNTIME_BUDGET_MS + 30_000);
  await clearLocalDatabase(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await acknowledgeReleaseIfNeeded(page);
  await configureClassroom(page);
  await addFictionalChild(page);

  const expectedRawTexts = Array.from({ length: CYCLE_COUNT }, (_, index) =>
    index === 0
      ? "  ‘Mavi parçayı köprünün üstüne koyacağım,’ dedi.  "
      : `  Çevrim ${String(index + 1).padStart(2, "0")}: Defne, kurgu bloklarından ${
          index + 1
        } tanesini yan yana dizdi.  `,
  );
  const metrics: CycleMetric[] = [];

  // Sınıfım kısayolu ilk çocuğu seçili açar. Aşağıdaki etkileşim sözleşmesi
  // tam olarak "çocuk seçildikten sonra" ölçülür.
  await page
    .getByRole("region", { name: /Sınıftaki çocuklar/i })
    .getByRole("button", { name: new RegExp(`${CHILD_NAME}.*gözlem ekle`, "i") })
    .click();
  const initialStudent = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: new RegExp(CHILD_NAME) });
  await expect(initialStudent).toHaveAttribute("aria-pressed", "true");
  await page.getByText("İstersen ayrıntı ekle", { exact: true }).click();
  await page.getByRole("button", { name: "Çocuk sözü", exact: true }).click();

  for (let index = 0; index < CYCLE_COUNT; index += 1) {
    const startedAt = await page.evaluate(() => performance.now());
    let teacherInteractions = 0;

    if (index > 0) {
      const quickObservationShortcut = page
        .getByRole("region", { name: /Sınıftaki çocuklar/i })
        .getByRole("button", {
          name: new RegExp(`${CHILD_NAME}.*gözlem ekle`, "i"),
        });
      teacherInteractions += await interact(
        "click",
        quickObservationShortcut,
      );
      const selectedStudent = page
        .getByRole("region", { name: "Gözlem yapılacak çocuk" })
        .getByRole("button", { name: new RegExp(CHILD_NAME) });
      await expect(selectedStudent).toHaveAttribute("aria-pressed", "true");
    }

    await assertRemovedDuplicateFields(page);
    const textField = page.getByLabel(
      index === 0 ? "Çocuğun aynen sözü" : "Ne oldu?",
      { exact: true },
    );
    teacherInteractions += await interact(
      "fill",
      textField,
      expectedRawTexts[index],
    );
    teacherInteractions += await interact(
      "click",
      page.getByRole("button", { name: "Gözlemi kaydet", exact: true }),
    );
    await expect(
      page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı" }),
    ).toBeHidden();
    await expect(
      page.getByRole("region", { name: /Sınıftaki çocuklar/i }),
    ).toBeVisible();

    const finishedAt = await page.evaluate(() => performance.now());
    metrics.push({
      cycle: index + 1,
      observationType: index === 0 ? "child-quote" : "quick-note",
      teacherInteractions,
      automatedTechnicalLatencyMs: finishedAt - startedAt,
    });
  }

  const elapsed = metrics.reduce(
    (sum, metric) => sum + metric.automatedTechnicalLatencyMs,
    0,
  );
  const latencies = metrics.map(
    (metric) => metric.automatedTechnicalLatencyMs,
  );
  const median = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);

  expect(metrics).toHaveLength(CYCLE_COUNT);
  expect(
    metrics.every(
      (metric) => metric.teacherInteractions <= MAX_INTERACTIONS_PER_CYCLE,
    ),
  ).toBe(true);
  expect(elapsed).toBeLessThanOrEqual(TECHNICAL_RUNTIME_BUDGET_MS);

  const beforeReload = await readObservations(page);
  expect(beforeReload).toHaveLength(CYCLE_COUNT);
  expect(new Set(beforeReload.map((record) => record.id)).size).toBe(CYCLE_COUNT);
  expect(new Set(beforeReload.map((record) => record.rawText)).size).toBe(
    CYCLE_COUNT,
  );
  expect(new Set(beforeReload.map((record) => record.studentId)).size).toBe(1);
  expect(beforeReload.map((record) => record.rawText).sort()).toEqual(
    [...expectedRawTexts].sort(),
  );
  expect(
    beforeReload.every(
      (record) => record.rawTextImmutable === true && record.deletedAt === null,
    ),
  ).toBe(true);
  expect(
    beforeReload.filter((record) => record.observationType === "child-quote"),
  ).toHaveLength(1);

  await page.reload({ waitUntil: "domcontentloaded" });
  await acknowledgeReleaseIfNeeded(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: /Sınıftaki çocuklar/i })
      .getByText(new RegExp(`${CYCLE_COUNT} gözlem$`)),
  ).toBeVisible();

  const afterReload = await readObservations(page);
  expect(afterReload).toEqual(beforeReload);
  expect(new Set(afterReload.map((record) => record.id)).size).toBe(CYCLE_COUNT);
  expect(afterReload.map((record) => record.rawText).sort()).toEqual(
    [...expectedRawTexts].sort(),
  );

  console.info(
    `[quick-observation-20cycle] automated technical latency (not human usability time): ` +
      `median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms ` +
      `total=${elapsed.toFixed(1)}ms budget=${TECHNICAL_RUNTIME_BUDGET_MS}ms ` +
      `interactions=${metrics.map((metric) => metric.teacherInteractions).join(",")} ` +
      `samples=${metrics
        .map((metric) => metric.automatedTechnicalLatencyMs.toFixed(1))
        .join(",")}ms`,
  );
});
