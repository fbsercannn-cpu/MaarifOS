import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function ensureClassroomConfigured(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (await setup.isVisible().catch(() => false)) {
    await setup.getByLabel("Sınıf adı").fill("Kurgu Test Sınıfı");
    await setup.getByLabel("Program katalog kimliği").fill("KURGU-KATALOG");
    await setup.getByLabel("Kaynak sürümü").fill("2026-test");
    await setup
      .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
      .click();
    await expect(setup).toBeHidden();
  }
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(page.getByRole("button", { name: `${name} çocuğunu sınıftan ayır` })).toBeVisible();
  await page.keyboard.press("Escape");
}

async function createD1Observation(page: Page, text: string) {
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  const activityTitle = page.getByLabel("Etkinlik adı");
  if (await activityTitle.isVisible().catch(() => false)) {
    await activityTitle.fill("Kurgu keşif etkinliği");
    await page.getByRole("button", { name: /FAB\.1\b/ }).first().click();
    await page.getByRole("button", { name: "Planı kaydet ve etkinliği başlat" }).click();
  }
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button")
    .first()
    .click();
  await page.getByLabel("Ne oldu?").fill(text);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
}

test("çocuk ekleme, sınıftan ayırma ve geri alma yeniden açılışta korunur", async ({ page }) => {
  const childName = "Kurgu Çocuk Yeni";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await addChild(page, "Kurgu Çocuk İkinci");

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` }).click();
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` }).click();
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` })).toBeVisible();
});

test("cihaz verisi kalıcıdır; yedek doğrulanır ve replace geri yükleme veri kaybını önler", async ({
  page,
}, testInfo) => {
  const childName = "Ada Kurgu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByText("Veriler bu cihazda saklanıyor · çevrimdışı çalışır")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google ile giriş/ })).toBeDisabled();

  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Yedek oluştur/ }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error(`Playwright yedek dosya yolunu oluşturamadı: ${testInfo.title}`);
  const envelope = JSON.parse(await readFile(backupPath, "utf8"));
  expect(envelope.manifest.format).toBe("maarifos-json");
  expect(envelope.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(envelope.manifest.entityCounts.students).toBe(1);
  const backedUpRecordCount = Object.values(envelope.manifest.entityCounts).reduce(
    (total: number, count) => total + Number(count),
    0,
  );

  await page.keyboard.press("Escape");
  await createD1Observation(
    page,
    "Kurgu test gözlemi; yedek geri yükleme sonrasında kaldırılmalı.",
  );
  await expect(page.getByText("1 gözlem bekliyor")).toBeVisible();

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath);
  await expect(page.getByText("Yedek bütünlük kontrolünü geçti. Geri yükleme modunu seçin.")).toBeVisible();
  await expect(page.getByText(`${backedUpRecordCount} kayıt`, { exact: false })).toBeVisible();

  const safetyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle" }).click();
  const safety = await safetyDownload;
  expect(safety.suggestedFilename()).toMatch(/^maarifos-geri-yukleme-oncesi-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/Geri yükleme tamamlandı/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("0 gözlem bekliyor")).toBeVisible();

  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await expect(page.getByRole("button", { name: "Son değişikliği geri al" })).toBeVisible();
  await page.getByRole("button", { name: "Son değişikliği geri al" }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geldi", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});

test("bozuk yedek mevcut veriye dokunmadan Türkçe hata verir", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByText("Veriler bu cihazda saklanıyor · çevrimdışı çalışır")).toBeVisible();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles({
    name: "bozuk-maarifos-yedegi.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"manifest":{"backupVersion":1},"payload":{}}', "utf8"),
  });
  await expect(
    page.getByText("Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
});

test("ikinci sekmedeki gözlem eski devam durumunu geri ezmez", async ({ context, page }) => {
  const childName = "Çift Sekme Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  const stalePage = await context.newPage();
  await stalePage.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(stalePage);
  await stalePage.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await expect(stalePage.getByRole("button", { name: new RegExp(childName) }).getByText("Geldi", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();

  await stalePage.keyboard.press("Escape");
  await createD1Observation(stalePage, "İkinci sekmeden kurgu gözlem.");
  await expect(stalePage.getByText("1 gözlem bekliyor")).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});

test("ana sayfadaki çocuktan profil ve plansız hızlı gözlem akışı kalıcı çalışır", async ({
  page,
}, testInfo) => {
  const childName = `Profil Akış ${testInfo.workerIndex + 1}`;
  const preferredName = "Minik Kâşif";
  const birthDate = "2021-04-23";
  const optionalCode = "SINIF-A7";
  const homeLanguages = "Türkçe, İngilizce";
  const interests = "Yapılar kurma ve bahçedeki küçük canlıları inceleme";

  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  const childrenRail = page.getByRole("region", { name: /Çocuklarım/i });
  await expect(childrenRail).toBeVisible();
  await childrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();

  const profileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByLabel(/Tercih edilen ad/i).fill(preferredName);
  await profileDialog.getByLabel(/Doğum tarihi/i).fill(birthDate);
  await profileDialog.getByLabel(/İsteğe bağlı kod|Sınıf içi kod/i).fill(optionalCode);
  await profileDialog.getByLabel(/Evde kullanılan diller/i).fill(homeLanguages);
  await profileDialog.getByLabel(/İlgi ve merak alanları/i).fill(interests);
  await profileDialog
    .getByRole("button", { name: /Profili kaydet|Bilgileri kaydet/i })
    .click();
  await expect(profileDialog).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  const reloadedChildrenRail = page.getByRole("region", { name: /Çocuklarım/i });
  await reloadedChildrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();

  const reloadedProfileDialog = page.getByRole("dialog", { name: /çocuk profili|profili/i });
  await expect(reloadedProfileDialog.getByLabel(/Tercih edilen ad/i)).toHaveValue(preferredName);
  await expect(reloadedProfileDialog.getByLabel(/Doğum tarihi/i)).toHaveValue(birthDate);
  await expect(
    reloadedProfileDialog.getByLabel(/İsteğe bağlı kod|Sınıf içi kod/i),
  ).toHaveValue(optionalCode);
  await expect(
    reloadedProfileDialog.getByLabel(/Evde kullanılan diller/i),
  ).toHaveValue(homeLanguages);
  await expect(
    reloadedProfileDialog.getByLabel(/İlgi ve merak alanları/i),
  ).toHaveValue(interests);
  await page.keyboard.press("Escape");
  await expect(reloadedProfileDialog).toBeHidden();

  await reloadedChildrenRail
    .getByRole("button", { name: new RegExp(`${childName}.*hızlı gözlem`, "i") })
    .click();

  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  const selectedChild = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: new RegExp(childName) });
  await expect(selectedChild).toHaveAttribute("aria-pressed", "true");

  await page
    .getByLabel("Ne oldu?")
    .fill("Oyun sırasında üç taşı yan yana dizdi ve arkadaşına sırasını anlattı.");
  await page.getByRole("button", { name: /Oyun ve katılım/i }).click();
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();

  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByText("1 gözlem bekliyor")).toBeVisible();
});

test("plan, gözlem, öğretmen onaylı program bağlantısı ve kaynaklı değerlendirme telefonda tamamlanır", async ({
  page,
}) => {
  const childName = "Ece Kanıt";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await page.getByLabel("Etkinlik adı").fill("Yaprakları karşılaştırma");
  await page.getByRole("button", { name: /FAB\.1\b/ }).first().click();
  await page.getByRole("button", { name: "Planı kaydet ve etkinliği başlat" }).click();

  await page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: new RegExp(childName) })
    .click();
  await page.getByLabel("Ne oldu?").fill("Ece iki yaprağı yan yana koydu ve çizgilerini tek tek gösterdi.");
  await page.getByRole("button", { name: "Bilişsel ve öğrenme", exact: true }).click();
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();

  await expect(page.getByText("1 gözlem bekliyor")).toBeVisible();
  await page.getByRole("button", { name: /1 gözlem bekliyor/ }).click();

  await page.getByLabel("Program hedefi").selectOption("tymm-fab-1");
  await page.getByLabel("Bu bağlantıyı ben seçtim ve gözlemle ilişkisini onaylıyorum.").check();
  await page.getByRole("button", { name: "Bağlantıyı onayla" }).click();

  await page.getByLabel("Dört düzeyli gözlem ölçütü").selectOption("mostly_independent");
  await page.getByLabel("Öğretmen değerlendirmesi").fill(
    "Ece, yaprakların çizgi örüntülerini karşılaştırırken farklılıkları işaret ederek gözlemini sözlü olarak açıkladı.",
  );
  await page.getByRole("button", { name: "İnceleme taslağını oluştur" }).click();

  await expect(page.getByRole("heading", { name: `${childName} için taslak hazır.` })).toBeVisible();
  await expect(page.getByText("Öğretmen incelemesi bekliyor")).toBeVisible();
  await expect(page.getByText("resmî katalogda doğrulanmadı", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Bugün ekranına dön" }).click();
  await expect(page.getByText("0 gözlem bekliyor")).toBeVisible();
  await expect(page.getByText("1 öğrenme hedefi", { exact: false })).toBeVisible();
});
