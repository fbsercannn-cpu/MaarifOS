import { expect, test } from "@playwright/test";

const response = {
  inclusiveAdaptation: "Yönergeyi görsel, sözel ve nesneyle gösterip katılım biçimini çocukların seçmesine alan açın.",
  openEndedQuestions: [
    "Işığın yerini değiştirdiğinde gölgenin biçiminde nasıl bir değişiklik fark ettin?",
    "Aynı nesneyle farklı bir gölge oluşturmak için hangi yolu denemek istersin?",
    "Arkadaşının çözümünden kendi denemene eklemek istediğin fikir hangisi oldu?",
  ],
  endOfDayEvaluation: "Çocukların tahmin kurma, deneme sonucunu açıklama ve çözümünü değiştirme anlarını somut örneklerle kaydedin.",
  nextDaySuggestion: "Ertesi gün farklı ışık kaynaklarını küçük gruplara sunup önceki tahminlerle yeni sonuçların karşılaştırılmasını sağlayın.",
};

test("DeepSeek plan incelemesi 320 pikselde taşmadan öğretmen onayıyla gerçek revizyon yazar", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.route("**/api/ai/chat", async (route) => {
    const request = route.request().postDataJSON();
    expect(JSON.stringify(request)).not.toContain("Ada Yılmaz");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: JSON.stringify(response), model: "deepseek-chat" }),
    });
  });
  await page.goto("/tests/deepseek-plan-review-fixture.html");
  await expect(page.getByRole("heading", { name: "Günlük planı pedagojik olarak incele" })).toBeVisible();
  await expect(page.getByText("DeepSeek taslağı hazır.", { exact: false })).toBeVisible();
  await page.getByLabel(/Metinleri kontrol ettim/u).check();
  await page.getByRole("button", { name: "Plan revizyonunu kaydet" }).click();
  await expect(page.getByLabel("Kaydedilen plan revizyonu")).toHaveText(/:2$/u);
  const result = await page.evaluate(async () => {
    const fixture = (window as unknown as { deepSeekPlanReviewFixture: { store: { readSnapshot(): Promise<any> }; planId: string } }).deepSeekPlanReviewFixture;
    const snapshot = await fixture.store.readSnapshot();
    const plan = snapshot.plans.find((item: any) => item.id === fixture.planId);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      revision: plan.teacherOwnedDailyFlow.revisionNumber,
      history: plan.teacherOwnedDailyFlow.revisionHistory.length,
      labels: plan.teacherOwnedDailyFlow.blocks.filter((block: any) => String(block.teacherNote).includes("DeepSeek")).length,
      activityCount: snapshot.activities.filter((activity: any) => activity.planId === fixture.planId).length,
    };
  });
  expect(result).toEqual({ overflow: false, revision: 2, history: 1, labels: 4, activityCount: 1 });
});
