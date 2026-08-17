import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const classroomName = "Gerçek UI Öğretmen Haftası";
const studentNames = ["Ada Yılmaz", "Bora Kaya", "Ceren Aksoy"] as const;
const mutationStudentName = "Geri Yüklenecek Geçici Çocuk";
const backupPassphrase = "Gercek-UI-Haftasi-2026!";

const teachingDays = [
  {
    civilDate: "2026-09-07",
    instant: "2026-09-07T06:00:00.000Z",
    closureInstant: "2026-09-07T14:00:00.000Z",
    activityTitle: "Karşılama çemberi",
    planTitle: "7 Eylül günlük öğretmen planı",
    observation:
      "Ada karşılama çemberinde arkadaşının adını söyleyerek topu ona uzattı.",
    studentName: studentNames[0],
  },
  {
    civilDate: "2026-09-08",
    instant: "2026-09-08T06:00:00.000Z",
    closureInstant: "2026-09-08T14:00:00.000Z",
    activityTitle: "Arkadaşlık hikâyesi",
    planTitle: "8 Eylül günlük öğretmen planı",
    observation:
      "Bora hikâyedeki sorunu dinledikten sonra iki farklı çözüm önerdi.",
    studentName: studentNames[1],
  },
  {
    civilDate: "2026-09-09",
    instant: "2026-09-09T06:00:00.000Z",
    closureInstant: "2026-09-09T14:00:00.000Z",
    activityTitle: "Ses ve ritim araştırması",
    planTitle: "9 Eylül günlük öğretmen planı",
    observation:
      "Ceren seçtiği ritmi iki kez tekrarladı ve grubun ritmine uyarladı.",
    studentName: studentNames[2],
  },
  {
    civilDate: "2026-09-10",
    instant: "2026-09-10T06:00:00.000Z",
    closureInstant: "2026-09-10T14:00:00.000Z",
    activityTitle: "Güvenli yerler haritası",
    planTitle: "10 Eylül günlük öğretmen planı",
    observation:
      "Ada sınıf haritasında sakinleşmek istediği köşeyi gösterip nedenini anlattı.",
    studentName: studentNames[0],
  },
  {
    civilDate: "2026-09-11",
    instant: "2026-09-11T06:00:00.000Z",
    closureInstant: "2026-09-11T14:00:00.000Z",
    activityTitle: "Haftanın izleri",
    planTitle: "11 Eylül günlük öğretmen planı",
    observation:
      "Bora hafta boyunca birlikte yaptıkları üç işi sırasıyla hatırlattı.",
    studentName: studentNames[1],
  },
] as const;

async function dismissReleaseNoticeIfPresent(page: Page): Promise<void> {
  const dismiss = page.getByRole("button", { name: "Harika, başlayalım" });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByTestId("persistence-gate")).toHaveCount(0, {
    timeout: 30_000,
  });
}

async function reloadApp(page: Page): Promise<void> {
  // A registered service worker may legitimately keep background requests
  // alive. Hydration completion is the product-ready contract; global
  // network-idle can remain false forever on CI and on an installed PWA.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForAppReady(page);
}

async function configureClassroomFromUi(page: Page): Promise<void> {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Sınıf adı").fill(classroomName);

  const officialCalendar = setup.getByRole("button", {
    name: "2026–2027 dönemini hazırla",
  });
  if (await officialCalendar.isVisible().catch(() => false)) {
    await officialCalendar.click();
  }

  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup
    .getByLabel("Yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await expect(setup.getByLabel("Program katalog kimliği")).not.toHaveValue("");
  await expect(setup.getByLabel("Kaynak sürümü")).not.toHaveValue("");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup
    .getByLabel("Çalışma düzeni", { exact: true })
    .selectOption("full_day");
  await expect(setup.getByLabel("Bitiş")).toHaveValue("16:30");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function addStudentFromUi(page: Page, name: string): Promise<void> {
  await page
    .getByRole("button", { name: /^(İlk çocuğu ekle|Çocuk ekle)$/ })
    .click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await sheet.getByLabel("Çocuğun adı").fill(name);
  await sheet.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(sheet).toHaveAttribute("data-state", "closed");
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await expect(
    page.getByRole("button", { name: `${name} profilini aç` }),
  ).toBeVisible();
}

async function openTeacherPlanWorkspace(page: Page) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const hierarchy = page.getByRole("region", { name: "Yıl → Ay → Hafta → Gün" });
  await expect(hierarchy).toBeVisible();
  await hierarchy.getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createTeacherPlanGraphFromUi(page: Page): Promise<void> {
  const dialog = await openTeacherPlanWorkspace(page);
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
    await nextMonth.fill(
      "İlk ayın kanıtlarına göre katılım yollarını ve küçük grup düzenini uyarlamak",
    );
  }

  await dialog
    .getByRole("button", { name: "Yıl → ay → hafta planını oluştur" })
    .click();
  await expect(
    dialog.getByRole("button", { name: /haftalık planını düzenle/i }).first(),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
}

async function takeAttendanceFromUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Bugünkü devam\s+0\/3 çocuk/ }).click();
  const attendance = page.getByRole("dialog", { name: "Bugünün devam durumu" });
  await expect(attendance).toBeVisible();
  for (const studentName of studentNames) {
    const row = attendance.locator("button.student-row").filter({
      hasText: studentName,
    });
    await row.click();
    await expect(row.getByText("Geldi", { exact: true })).toBeVisible();
  }
  const complete = attendance.getByRole("button", {
    name: "Devam durumunu tamamla",
    exact: true,
  });
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(attendance).toHaveAttribute("data-state", "closed");
  // The fixed civil clock deliberately advances between teaching days. Reloading
  // after the committed write also proves the attendance survives a cold read
  // and prevents an in-flight exit animation from spanning the next clock jump.
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "MaarifOS Bugün ekranı" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
  }
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bugünkü devam\s+3\/3 çocuk/ })).toBeVisible();
}

async function createDailyPlanAndObservationFromUi(
  page: Page,
  day: (typeof teachingDays)[number],
): Promise<void> {
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  const capture = page.getByRole("dialog", { name: "Ne ekleyelim?" });
  await capture.getByRole("button", { name: /Etkinlik planla/ }).click();

  const plan = page.getByRole("dialog", { name: "Günlük plan oluşturma" });
  await expect(plan).toBeVisible();
  await plan.getByLabel("Etkinlik adı").fill(day.activityTitle);
  await plan.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await plan.getByLabel("Plan başlığı").fill(day.planTitle);
  await expect(plan.getByLabel("Plan tarihi")).toHaveValue(day.civilDate);
  await plan
    .getByRole("region", { name: "Program alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  const target = plan.getByRole("button", { name: /FAB\.1\b/ }).first();
  await target.click();
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await plan.getByText("Çocuk kapsamı", { exact: true }).click();
  await expect(
    plan.getByText("3 planlı takip kaydı açılacak.", { exact: true }),
  ).toBeVisible();
  const dailyFlow = plan.getByTestId("teacher-owned-daily-flow-editor");
  await expect(dailyFlow).toBeVisible();
  await expect(dailyFlow.locator("li")).toHaveCount(10);
  const firstFlowBlock = dailyFlow.locator("li").first();
  await firstFlowBlock.locator("summary").click();
  await firstFlowBlock
    .getByLabel("Öğretmen notu")
    .fill(`${day.civilDate} için öğretmenin gözden geçirdiği karşılama notu.`);
  await dailyFlow
    .getByRole("checkbox", { name: /10 bölümü gözden geçirdim/ })
    .check();
  const save = plan.getByRole("button", { name: "Planı kaydet" });
  await expect(save).toBeEnabled();
  await save.click();

  const studentRail = page.getByRole("region", { name: "Gözlem yapılacak çocuk" });
  await expect(studentRail).toBeVisible();
  await studentRail.getByRole("button", { name: day.studentName, exact: true }).click();
  await page.getByLabel("Ne oldu?").fill(day.observation);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  const pendingLink = page.getByRole("button", {
    name: /1 gözlem program bağlantısı bekliyor/,
  });
  await expect(pendingLink).toBeVisible({ timeout: 20_000 });
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "MaarifOS Bugün ekranı" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
  }
  await expect(pendingLink).toBeVisible();
  await pendingLink.click();
  await page.getByLabel("Program hedefi").selectOption({ index: 1 });
  await page
    .getByRole("checkbox", {
      name: "Bu bağlantıyı ben seçtim ve gözlemle ilişkisini onaylıyorum.",
    })
    .check();
  await page.getByRole("button", { name: "Bağlantıyı onayla" }).click();
  await expect(
    page.getByRole("heading", { name: "Kanıta dayalı değerlendirme" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Değerlendirme akışını kapat/ }).click();
  // Re-open from storage after the committed curriculum link. This validates
  // persistence and avoids carrying nested sheet exit animations across the
  // fixed-clock teaching-day journey.
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "MaarifOS Bugün ekranı" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
  }
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /gözlem program bağlantısı bekliyor/ }),
  ).toHaveCount(0);

  const finishActivity = page.getByRole("button", { name: "Etkinliği tamamla" });
  await expect(finishActivity).toBeEnabled();
  await finishActivity.click();
  await expect(page.getByTestId("teacher-day-close")).toContainText(
    "Gün kapanışa hazır",
    { timeout: 20_000 },
  );

  // Günün kanıtı sabah üretilir; kapanış sınıfın 16:30 bitişinden sonra yapılır.
  await page.clock.setFixedTime(new Date(day.closureInstant));
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "MaarifOS Bugün ekranı" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
  }
  await expect(page.getByTestId("persistence-gate")).toHaveCount(0);
  await page.waitForTimeout(1_000);

  const closureCard = page.getByTestId("teacher-day-close");
  await expect(closureCard).toContainText("Gün kapanışa hazır");
  await closureCard.getByRole("button", { name: "Günü kapat" }).click();
  const closureDialog = page.getByRole("dialog", { name: "Gün sonu kapanışı" });
  const closure = page.getByTestId("day-closure-sheet");
  await expect(closure).toContainText("Bugünün zorunlu işleri tamam");
  await expect(closure).toContainText("3/3");
  await expect(closure).toContainText("1/1");
  await expect(
    closure.locator(".day-closure-evidence article").filter({ hasText: "bekleyen bağ" }),
  ).toContainText("0");
  await closure
    .getByRole("button", { name: "Günü tamamlandı olarak kapat" })
    .click();
  await expect(closureDialog).toHaveAttribute("data-state", "closed", {
    timeout: 30_000,
  });
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  if (!(await page.getByRole("main", { name: "MaarifOS Bugün ekranı" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Bugün", exact: true }).click();
  }
  await expect(closureCard).toContainText("Gün kapatıldı");
}

async function moveToTeachingDay(page: Page, instant: string): Promise<void> {
  await page.clock.setFixedTime(new Date(instant));
  await reloadApp(page);
  await dismissReleaseNoticeIfPresent(page);
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
}

async function expectDocumentDownload(
  page: Page,
  buttonName: "PDF indir" | "Word indir",
  extension: ".pdf" | ".docx",
): Promise<Download> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" })
    .getByRole("button", { name: buttonName })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`, "i"));
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.byteLength).toBeGreaterThan(500);
  if (extension === ".pdf") expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
  else expect(bytes.subarray(0, 2).toString("ascii")).toBe("PK");
  return download;
}

test.use({
  viewport: { width: 390, height: 844 },
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  acceptDownloads: true,
});

test("öğretmen gerçek UI ile Pazartesi–Cuma haftasını kapatır, W2 kararını ve yedeğini geri yükler", async ({
  page,
}) => {
  // GitHub'ın paylaşımlı Linux koşucusu, aynı gerçek tarayıcı yolculuğunu yerel
  // 6,3 dakikalık kanıttan daha yavaş tamamlıyor. Kapsamı azaltmak yerine
  // beş gün + belge + şifreli geri yükleme zincirine 15 dakika tanıyoruz.
  test.setTimeout(900_000);
  await page.clock.setFixedTime(new Date(teachingDays[0].instant));
  await page.goto("/?native=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await dismissReleaseNoticeIfPresent(page);

  await configureClassroomFromUi(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const studentName of studentNames) await addStudentFromUi(page, studentName);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await createTeacherPlanGraphFromUi(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  for (const [index, day] of teachingDays.entries()) {
    if (index > 0) await moveToTeachingDay(page, day.instant);
    await takeAttendanceFromUi(page);
    await createDailyPlanAndObservationFromUi(page, day);
  }

  // Tam gün sınıfta değerlendirme, son öğretim gününün 16:30 bitişinden sonra açılır.
  await page.clock.setFixedTime(new Date("2026-09-11T14:00:00.000Z"));
  const planDialog = await openTeacherPlanWorkspace(page);
  await planDialog
    .getByRole("button", {
      name: /7 Eylül.*13 Eylül.*haftasını kanıtlarla değerlendir/i,
    })
    .click();
  const review = planDialog.getByTestId("teacher-weekly-review");
  await expect(review).toContainText("5/5 öğretim günü kapandı");
  await expect(review.getByText("Haftalık değerlendirme henüz hazır değil")).toHaveCount(0);
  await expect(review.getByRole("checkbox")).toHaveCount(5);
  await expect(review.getByText("1 öğretmen onaylı program bağı")).toHaveCount(5);
  await review
    .getByLabel("Kanıt özeti")
    .fill("Beş günün gözlemleri çocukların güvenli rutinlerde seçim yapıp akranlarına yanıt verdiğini gösterdi.");
  await review
    .getByLabel("Öğretmen değerlendirmesi")
    .fill("Küçük grup kararlarını koruyup geçişlerde görsel desteği güçlendireceğim.");
  await review.getByLabel("Sonraki plan kararı").selectOption("adapt");
  await review
    .getByRole("button", { name: "Kaydet ve sonraki haftaya öneri taşı" })
    .click();
  await expect(planDialog).toContainText(
    "sonraki hafta için öneri yalnız öğretmen incelemesine taşındı",
  );

  await planDialog
    .getByRole("button", { name: "Öneriyi incele ve karar ver" })
    .click();
  const carryReview = planDialog.getByTestId("teacher-weekly-carry-review");
  await carryReview
    .getByLabel("Kabul edilirse haftalık plana yazılacak son metin")
    .fill("W2’de küçük grup kararlarını koru; geçişlerde görsel sıra kartlarını kullan.");
  await carryReview
    .getByLabel("Karar gerekçeniz")
    .fill("Beş günlük kanıt, bu uyarlamanın sınıf katılımını destekleyeceğini gösteriyor.");
  await page.clock.setFixedTime(new Date("2026-09-11T14:05:00.000Z"));
  await carryReview.getByRole("button", { name: "Düzenleyip kabul et" }).click();
  await expect(planDialog).toContainText(
    "Öneri öğretmenin son düzenlemesiyle kabul edildi",
  );
  await expect(planDialog).toContainText("revizyon 2");

  await planDialog.getByLabel("Belge kapsamı").selectOption("combined");
  await planDialog.getByRole("button", { name: "Belgeyi önizle" }).click();
  await planDialog
    .getByLabel(
      "Bu önizlemenin seçtiğim kapsamı ve güncel plan revizyonunu yansıttığını onaylıyorum.",
    )
    .check();
  await expectDocumentDownload(page, "PDF indir", ".pdf");
  await expectDocumentDownload(page, "Word indir", ".docx");
  await planDialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("Yedek parolası").first().fill(backupPassphrase);
  await page.getByLabel("Parolayı doğrula").fill(backupPassphrase);
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Şifreli yedek oluştur/ }).click();
  const backupDownload = await backupPromise;
  expect(backupDownload.suggestedFilename()).toMatch(/\.maarifos$/);
  const backupPath = await backupDownload.path();
  expect(backupPath).not.toBeNull();
  const backupBytes = await readFile(backupPath!);
  const backupWireText = backupBytes.toString("utf8");
  expect(backupBytes.byteLength).toBeGreaterThan(1_000);
  expect(backupWireText).not.toContain(classroomName);
  for (const studentName of studentNames) expect(backupWireText).not.toContain(studentName);
  for (const day of teachingDays) expect(backupWireText).not.toContain(day.planTitle);
  await expect(page.getByText("İlk kurulum tamamlandı · 4/4")).toBeVisible();
  await page.getByRole("button", { name: "Bugüne dön" }).click();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await addStudentFromUi(page, mutationStudentName);
  await expect(
    page.getByRole("button", { name: `${mutationStudentName} profilini aç` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath!);
  await expect(page.getByText("Şifreli yedek · içerik henüz açılmadı")).toBeVisible();
  await page.getByLabel("Yedek parolası").last().fill(backupPassphrase);
  await page.getByRole("button", { name: "Yedeği aç ve doğrula" }).click();
  await expect(page.getByText("Şifreli yedek doğrulandı. Geri yükleme modunu seçin.")).toBeVisible();
  await page.getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle" }).click();
  await expect(page.getByText(/Geri yükleme tamamlandı/)).toBeVisible();
  await page.getByRole("button", { name: "Bugüne dön" }).click();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `${mutationStudentName} profilini aç` }),
  ).toHaveCount(0);
  for (const studentName of studentNames) {
    await expect(
      page.getByRole("button", { name: `${studentName} profilini aç` }),
    ).toBeVisible();
  }

  const restoredPlanDialog = await openTeacherPlanWorkspace(page);
  for (const day of teachingDays) await expect(restoredPlanDialog).toContainText(day.planTitle);
  await restoredPlanDialog
    .getByRole("button", { name: "Kararı ve geçmişi aç" })
    .click();
  await expect(restoredPlanDialog).toContainText(
    "Öğretmen düzenleyip kabul etti · plan revizyonuna uygulandı.",
  );

  // Tek page.evaluate kullanımı salt okunur final invariant/kimlik kontrolüdür.
  const invariant = await page.evaluate(async ({ expectedCivilDates, expectedClassroomName, expectedPlanTitles, temporaryName }) => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    try {
      const snapshot = await store.readSnapshot();
      const plans = snapshot.plans;
      const dailyPlans = plans.filter((record) => record.planType === "daily");
      const annualPlanIds = new Set(
        plans.filter((record) => record.planType === "annual").map((record) => record.id),
      );
      const monthlyPlanIds = new Set(
        plans.filter((record) => record.planType === "monthly").map((record) => record.id),
      );
      const weeklyPlanIds = new Set(
        plans.filter((record) => record.planType === "weekly").map((record) => record.id),
      );
      const activities = snapshot.activities.filter((record) =>
        dailyPlans.some((plan) => plan.id === record.planId),
      );
      const weeklyPlans = plans.filter((record) => record.planType === "weekly");
      const sourceWeek = weeklyPlans.find(
        (record) =>
          Array.isArray(record.weeklyEvaluations) && record.weeklyEvaluations.length === 1,
      );
      const evaluation = Array.isArray(sourceWeek?.weeklyEvaluations)
        ? sourceWeek.weeklyEvaluations[0]
        : null;
      const targetWeek = weeklyPlans.find(
        (record) => record.id === evaluation?.nextPlanTargetPlanId,
      );
      const attendanceCompletionCount = snapshot.settings.filter(
        (record) =>
          record.settingType === "attendance-day-completion" &&
          record.attendanceCompleted === true,
      ).length;
      const completeClosures = snapshot.settings.filter(
        (record) =>
          record.settingType === "teacher-day-closure" &&
          record.closureStatus === "complete",
      );
      const expectedDates = [...expectedCivilDates].sort();
      const attendanceDates = snapshot.attendanceRecords
        .map((record) => record.civilDate)
        .sort();
      const closureDates = completeClosures.map((record) => record.civilDate).sort();
      const observationIds = snapshot.observations.map((record) => record.id);
      const linkObservationIds = snapshot.evidenceCurriculumLinks.map(
        (record) => record.observationId,
      );
      const activeClassroom = snapshot.classrooms.find(
        (record) =>
          record.name === expectedClassroomName && typeof record.deletedAt !== "string",
      );
      const scopedIds = [
        ...dailyPlans.map((record) => record.id),
        ...activities.map((record) => record.id),
        ...snapshot.observations.map((record) => record.id),
        ...snapshot.evidenceCurriculumLinks.map((record) => record.id),
        ...snapshot.attendanceRecords.map((record) => record.id),
        ...completeClosures.map((record) => record.id),
      ];
      return {
        activeStudentNames: snapshot.students
          .filter((record) => typeof record.deletedAt !== "string")
          .map((record) => record.displayName)
          .sort(),
        temporaryStudentPresent: snapshot.students.some(
          (record) => record.displayName === temporaryName,
        ),
        dailyPlanTitles: dailyPlans.map((record) => record.title).sort(),
        dailyCivilDates: dailyPlans.map((record) => record.civilDate).sort(),
        expectedPlanTitles: [...expectedPlanTitles].sort(),
        dailyLineageComplete: dailyPlans.every(
          (record) =>
            annualPlanIds.has(record.sourceAnnualPlanId) &&
            monthlyPlanIds.has(record.sourceMonthlyPlanId) &&
            weeklyPlanIds.has(record.sourceWeeklyPlanId),
        ) && new Set(dailyPlans.map((record) => record.sourceWeeklyPlanId)).size === 1,
        classroomScheduleExact:
          activeClassroom?.schedule?.kind === "full_day" &&
          activeClassroom.schedule.endTime === "16:30" &&
          activeClassroom.schedule.timeZone === "Europe/Istanbul",
        completedActivityCount: activities.filter(
          (record) => record.status === "completed",
        ).length,
        immutableObservationCount: snapshot.observations.filter(
          (record) => record.rawTextImmutable === true,
        ).length,
        teacherConfirmedLinkCount: snapshot.evidenceCurriculumLinks.filter(
          (record) => record.confirmationMethod === "teacher-confirmed",
        ).length,
        attendanceRecordCount: snapshot.attendanceRecords.length,
        attendanceDatesExact:
          attendanceDates.length === expectedDates.length * 3 &&
          expectedDates.every(
            (civilDate) =>
              attendanceDates.filter((candidate) => candidate === civilDate).length === 3,
          ),
        attendanceCompletionCount,
        completeClosureCount: completeClosures.length,
        closureDatesExact: JSON.stringify(closureDates) === JSON.stringify(expectedDates),
        dailyDatesExact:
          JSON.stringify(dailyPlans.map((record) => record.civilDate).sort()) ===
          JSON.stringify(expectedDates),
        linkObservationsOneToOne:
          new Set(observationIds).size === expectedDates.length &&
          new Set(linkObservationIds).size === expectedDates.length &&
          observationIds.every((id) => linkObservationIds.includes(id)),
        weeklyEvaluationObservationCount: Array.isArray(evaluation?.observationIds)
          ? evaluation.observationIds.length
          : 0,
        weeklyEvaluationLinkCount: Array.isArray(evaluation?.curriculumLinkIds)
          ? evaluation.curriculumLinkIds.length
          : 0,
        weeklyEvaluationLinksMatchObservations:
          Array.isArray(evaluation?.observationIds) &&
          Array.isArray(evaluation?.curriculumLinkIds) &&
          evaluation.curriculumLinkIds.every((linkId) => {
            const link = snapshot.evidenceCurriculumLinks.find((record) => record.id === linkId);
            return Boolean(link && evaluation.observationIds.includes(link.observationId));
          }),
        w2Status: targetWeek?.nextPlanDecisionContext?.applicationStatus ?? null,
        w2Narrative: targetWeek?.teacherContent?.narrative ?? null,
        w2ReviewActions: Array.isArray(
          targetWeek?.nextPlanDecisionContext?.reviewHistory,
        )
          ? targetWeek.nextPlanDecisionContext.reviewHistory.map(
              (entry: { action?: unknown }) => entry.action,
            )
          : [],
        allOperationalIdsUnique: new Set(scopedIds).size === scopedIds.length,
      };
    } finally {
      store.close();
    }
  }, {
    expectedCivilDates: teachingDays.map((day) => day.civilDate),
    expectedClassroomName: classroomName,
    expectedPlanTitles: teachingDays.map((day) => day.planTitle),
    temporaryName: mutationStudentName,
  });

  expect(invariant.activeStudentNames).toEqual([...studentNames].sort());
  expect(invariant.temporaryStudentPresent).toBe(false);
  expect(invariant.dailyPlanTitles).toEqual(invariant.expectedPlanTitles);
  expect(invariant.dailyCivilDates).toEqual(teachingDays.map((day) => day.civilDate));
  expect(invariant.dailyLineageComplete).toBe(true);
  expect(invariant.classroomScheduleExact).toBe(true);
  expect(invariant.completedActivityCount).toBe(5);
  expect(invariant.immutableObservationCount).toBe(5);
  expect(invariant.teacherConfirmedLinkCount).toBe(5);
  expect(invariant.attendanceRecordCount).toBe(15);
  expect(invariant.attendanceDatesExact).toBe(true);
  expect(invariant.attendanceCompletionCount).toBe(5);
  expect(invariant.completeClosureCount).toBe(5);
  expect(invariant.closureDatesExact).toBe(true);
  expect(invariant.dailyDatesExact).toBe(true);
  expect(invariant.linkObservationsOneToOne).toBe(true);
  expect(invariant.weeklyEvaluationObservationCount).toBe(5);
  expect(invariant.weeklyEvaluationLinkCount).toBe(5);
  expect(invariant.weeklyEvaluationLinksMatchObservations).toBe(true);
  expect(invariant.w2Status).toBe("accepted");
  expect(invariant.w2Narrative).toBe(
    "W2’de küçük grup kararlarını koru; geçişlerde görsel sıra kartlarını kullan.",
  );
  expect(invariant.w2ReviewActions).toEqual(["accepted"]);
  expect(invariant.allOperationalIdsUnique).toBe(true);
});
