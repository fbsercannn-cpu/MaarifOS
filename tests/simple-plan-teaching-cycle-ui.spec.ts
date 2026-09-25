import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });
test.use({ viewport: { width: 390, height: 844 } });

test("dört öğretim durumu ve oyun-aile zinciri gerçek kaynaklarla ayrı çalışır", async ({ page }) => {
  await page.goto("/tests/simple-plan-teaching-cycle-fixture.html");
  const teaching = page.getByRole("region", { name: "Plan, uygulama, gözlem ve öğretmen yargısı" });
  await expect(teaching).toBeVisible();
  for (const [stage, heading, count] of [
    ["planned", "Planlandı", "1"],
    ["applied", "Uygulandı", "1"],
    ["observed", "Gözlendi", "1"],
    ["teacher-judgement", "Öğretmen yargısı", "0"],
  ] as const) {
    const card = teaching.locator(`[data-teaching-stage="${stage}"]`);
    await expect(card.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(card.locator("header > strong")).toHaveText(count);
  }
  await expect(teaching).toContainText("Plan kapsamı çocuk puanı veya değerlendirmesi değildir");
  await teaching.getByLabel("Çocuk kapsamı").selectOption({ label: "Kurgu Oyun Çocuğu" });

  const cycle = page.getByRole("region", { name: "Var olan kayıttan oyunu izleyin" });
  await cycle.getByLabel("Tamamlanmış etkinlik").selectOption({ label: "Kurgu yapı oyunu" });
  await expect(cycle.getByText("Kayıt eksik", { exact: true }).first()).toBeVisible();
  await cycle.getByLabel("Materyaller · her satıra bir materyal").fill("Ahşap bloklar\nKumaş parçaları");
  await cycle.getByLabel("Uyarlama", { exact: true }).fill("Kavraması kolay iki büyük parça yakına yerleştirildi.");
  await cycle.getByLabel("Uygulama notu").fill("Çocukların seçtiği parçalarla ortak yapı oyunu uygulandı.");
  await cycle.getByLabel("Bu materyal, uyarlama ve uygulama kaydını öğretmen olarak onaylıyorum.").check();
  await cycle.getByRole("button", { name: "Uygulama kaydını bağla" }).click();
  await expect(cycle.getByRole("status").filter({ hasText: "gerçek etkinliğe bağlandı" })).toBeVisible();

  await cycle.getByLabel("Çocuk iki parçayı yan yana getirip yakınına gösterdi.").check();
  await cycle.getByLabel("Öğretmen yansıtması").fill("Ham gözlemdeki yaklaşımı bir sonraki oyunda yeniden inceleyeceğim.");
  await cycle.getByLabel("Sonraki adım").fill("Farklı büyüklükte parçalar sunacağım.");
  await cycle.getByLabel("Yansıtmayı seçtiğim ham gözlemlere dayanarak yazdığımı onaylıyorum.").check();
  await cycle.getByRole("button", { name: "Yansıtmayı kaydet" }).click();
  await expect(cycle.getByRole("status").filter({ hasText: "ham gözlemlere bağlandı" })).toBeVisible();

  await cycle.getByLabel("Yakının iletişim kaydı").selectOption({ label: "Kurgu Anne · Anne" });
  await cycle.getByLabel("Oyun önerisi").fill("Evde iki farklı dokudaki nesneyle küçük bir yapı kurmayı deneyebilirsiniz.");
  await cycle.getByLabel("Bu öneriyi seçili yakın ve iletişim kaydıyla paylaştığımı onaylıyorum.").check();
  await cycle.getByRole("button", { name: "Aile önerisini kaydet" }).click();
  await expect(cycle.getByRole("status").filter({ hasText: "iletişim kaynağına bağlandı" })).toBeVisible();

  await cycle.getByLabel("Kaynak aile önerisi").selectOption({ index: 1 });
  await cycle.getByLabel("Bildirim kaynağı").selectOption("oral");
  await cycle.getByLabel("Yakının geri bildirimi").fill("Yakını, kumaş parçalarıyla kısa süre oyun kurduklarını bildirdi.");
  await cycle.getByLabel("Öğretmen notu").fill("Sonraki gerçek gözlemde yeniden bakılacak.");
  await cycle.getByLabel("Geri bildirimi ayrı aile kaydı olarak aldığımı onaylıyorum; bu kayıt otomatik beceri üretmez.").check();
  await cycle.getByRole("button", { name: "Geri bildirimi ayrı kaydet" }).click();
  await expect(cycle.getByRole("status").filter({ hasText: "öneriden ayrı kaydedildi" })).toBeVisible();

  const steps = cycle.locator(".simple-plan-play-cycle__steps li");
  await expect(steps).toHaveCount(5);
  await expect(cycle.locator('.simple-plan-play-cycle__steps li[data-state="complete"]')).toHaveCount(5);
  await expect(cycle).toContainText("Veli geri bildirimi otomatik beceri üretmez");
  const persisted = await page.evaluate(async () => {
    const read = (window as unknown as { __readSimplePlanTeachingFixture(): Promise<{ settings: Array<Record<string, unknown>>; observations: Array<Record<string, unknown>> }> }).__readSimplePlanTeachingFixture;
    const snapshot = await read();
    const records = snapshot.settings.filter((record) => record.settingType === "play-family-cycle-v1");
    return { records, observation: snapshot.observations[0] };
  });
  expect(persisted.records).toHaveLength(4);
  expect(persisted.records.map((record) => (record.workflow as { kind: string }).kind)).toEqual(["application", "reflection", "family-suggestion", "family-feedback"]);
  expect(JSON.stringify(persisted.records)).not.toMatch(/skill|score|kazanım/iu);
  expect(persisted.observation.rawText).toBe("Çocuk iki parçayı yan yana getirip yakınına gösterdi.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
