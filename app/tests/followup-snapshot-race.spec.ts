import { test, expect } from "@playwright/test";

test("ortak takip görünümünde geç dönen eski okuma güncel kaydı geri alamaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const { React, createRoot } = await import("/tests/fixtures/react-browser.ts");
    const { useTeacherFollowupSnapshot } = await import("/src/features/teacher-followup/TeacherFollowupWorkspace.tsx");
    const { createEmptySnapshot } = await import("/src/core/domain/model.ts");
    const pending = [];
    const store = { readSnapshot: () => new Promise(resolve => pending.push(resolve)) };
    window.__snapshotRace = {
      count: () => pending.length,
      deliver: (index, name) => { const snapshot = createEmptySnapshot(); snapshot.classrooms = [{ id: crypto.randomUUID(), name }]; pending[index](snapshot); },
    };
    function Harness() {
      const { snapshot, refresh } = useTeacherFollowupSnapshot(store);
      const [busy, setBusy] = React.useState(false);
      return React.createElement("div", {},
        React.createElement("p", { role: "status" }, snapshot?.classrooms[0]?.name ?? "Bekleniyor"),
        React.createElement("button", { disabled: busy, onClick: async () => { setBusy(true); try { await refresh(); } finally { setBusy(false); } } }, "Kaydı yenile"));
    }
    const host = document.createElement("div"); document.body.replaceChildren(host); createRoot(host).render(React.createElement(Harness));
  });
  const count = () => page.evaluate(() => window.__snapshotRace.count());
  const deliver = (index: number, name: string) => page.evaluate(({ index, name }) => window.__snapshotRace.deliver(index, name), { index, name });
  await expect.poll(count).toBe(1);
  await deliver(0, "Kurgu İlk Kayıt");
  await expect(page.getByRole("status")).toHaveText("Kurgu İlk Kayıt");
  await page.getByRole("button", { name: "Kaydı yenile" }).click();
  await expect.poll(count).toBe(2);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(count).toBe(3);
  await deliver(1, "Kurgu Eski Görünüm");
  await expect(page.getByRole("button")).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Kurgu İlk Kayıt");
  await deliver(2, "Kurgu Güncel Kayıt");
  await expect(page.getByRole("status")).toHaveText("Kurgu Güncel Kayıt");
  await expect(page.getByRole("button")).toBeEnabled();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(count).toBe(4);
  await page.getByRole("button").click();
  await expect.poll(count).toBe(5);
  await deliver(4, "Kurgu Son Kayıt");
  await expect(page.getByRole("status")).toHaveText("Kurgu Son Kayıt");
  await expect(page.getByRole("button")).toBeEnabled();
  await deliver(3, "Kurgu Gecikmiş Eski Kayıt");
  await expect(page.getByRole("status")).toHaveText("Kurgu Son Kayıt");
});
