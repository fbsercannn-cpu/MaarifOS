import {readRepositorySnapshot} from '../helpers/production-repository';
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({},testInfo)=>{if(testInfo.project.name==="webkit-phone")test.setTimeout(90_000);});

async function configureClassroomWithoutStudents(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await expect(setup.getByLabel("Okul adı")).toBeFocused();

  await setup.getByLabel("Okul adı").fill("Kurgu Mobil Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu mobil kararlılık sınıfı");
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

const INTERACTIVE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
].join(", ");

async function expectAboveBottomNavigationAndHitTestable(
  page: Page,
  target: ReturnType<Page["locator"]>,
) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport();

  const navigation = page.getByRole("navigation", { name: "Ana menü" });
  const [targetBox, navigationBox] = await Promise.all([
    target.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(targetBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(
    navigationBox!.y + 1,
  );

  await target.click({trial:true});
  const hitTest = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {ok: hit === element || element.contains(hit), target:element.outerHTML.slice(0,250), hit:hit?.outerHTML.slice(0,250),x:rect.x,y:rect.y,width:rect.width,height:rect.height};
  });
  expect(typeof hitTest === "boolean" ? hitTest : hitTest.ok, JSON.stringify(hitTest)).toBe(true);
}

test("dar telefonda hızlı kayıt CTA'sı kaydırma gerektirmeden görünür ve tıklanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const nextTask = page.getByLabel("Sıradaki en iyi adım");
  const readinessAction = nextTask.getByRole("button");

  await expect(nextTask).toBeVisible();
  await expect(nextTask).toContainText("Sınıfıma çocuk ekle");
  await expect(readinessAction).toBeInViewport();

  const hitTest = await readinessAction.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === button || button.contains(hit);
  });
  expect(typeof hitTest === "boolean" ? hitTest : hitTest.ok, JSON.stringify(hitTest)).toBe(true);

  await readinessAction.click();


  const dialog = page.getByRole("dialog", { name: "Çocuk ekle" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".sheet-content")).toHaveJSProperty("scrollTop", 0);
  await dialog
    .getByRole("button", { name: "Çocuk ekle ekranını kapat" })
    .click();
  await expect(page.getByRole("main", { name: /Sınıfım/ })).toBeVisible();

  await page.goBack();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("çocuksuz sınıfta alt menü Gözlem ilk çocuk formunu tek dokunuşla açar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  await page.getByRole("button", { name: "Gözlem", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Çocuk ekle" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/classroom(?:[/?#]|$)/u);
  await dialog.getByRole("button", { name: "Çocuk ekle ekranını kapat" }).click();
  await expect(page.getByRole("main", { name: /Sınıfım/ })).toBeVisible();
  await expect(page.getByText("Gözleme başlamak için ilk çocuk ekleme alanı açıldı.")).toBeAttached();
});

test("aktif alt menü göstergesi düğme içinde kalır ve kaydırma sonrası sekmeler tıklanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const scroll = page.locator(".mobile-scroll");
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const todayButton = page.getByRole("button", { name: "Bugün", exact: true });
  const indicator = await todayButton.evaluate((button) => {
    const style = getComputedStyle(button, "::before");
    const buttonRect = button.getBoundingClientRect();
    return {
      position: style.position,
      pointerEvents: style.pointerEvents,
      indicatorTop: Number.parseFloat(style.top),
      buttonTop: buttonRect.top,
    };
  });
  expect(indicator.position).toBe("absolute");
  expect(indicator.pointerEvents).toBe("none");
  expect(indicator.indicatorTop).toBe(0);
  expect(indicator.buttonTop).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Planlar", exact: true })).toBeVisible();
  await expect(page.locator(".mobile-scroll")).toHaveJSProperty("scrollTop", 0);
  await expect(page.getByRole("button", { name: "Planlar", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("320 pikselde iki takip adımı kırpılmaz", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  await page.getByRole("button",{name:"Sınıfım",exact:true}).click();
  await page.getByRole("button",{name:"Çocuk ekle",exact:true}).click();
  const child=page.getByRole("dialog",{name:"Çocuk ekle",exact:true});
  await child.getByLabel("Çocuğun adı").fill("Takip Kurgu Çocuğu");
  await child.getByRole("button",{name:"Kaydet ve kapat",exact:true}).click();
  await expect(child).toBeHidden();
  await page.getByRole("button",{name:"Bugün",exact:true}).click();
  const followUps = page.getByRole("region", { name: "Diğer iki adım", exact: true });
  await expect(followUps).toBeVisible();
  const layout = await followUps.evaluate((region) => {
    const titles = [...region.querySelectorAll("button strong")];
    return {
      buttonCount: region.querySelectorAll(":scope > button").length,
      titles: titles.map((title) => title.textContent?.trim() ?? ""),
      horizontalOverflow: region.scrollWidth > region.clientWidth + 1,
      clippedTitles: titles
        .filter((title) => title.scrollHeight > title.clientHeight + 1)
        .map((title) => title.textContent?.trim() ?? ""),
    };
  });

  expect(layout.buttonCount).toBeGreaterThan(0);
  expect(layout.buttonCount).toBeLessThanOrEqual(2);
  expect(layout.titles).toHaveLength(layout.buttonCount);
  expect(layout.titles.every(title=>title.length>0)).toBe(true);
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.clippedTitles).toEqual([]);
});

test("Plan zincirim tam ekran katmanında aşağı kayar ve son eylem tıklanabilir kalır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/plans?native=1");
  await configureClassroomWithoutStudents(page);

  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Yıllık planlama panosu/i })
    .click();

  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog.getByRole("heading", { name: "Plan zincirim" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Yıl → ay → hafta planını oluştur" })
    .click();
  await expect(dialog).toContainText("tek işlemde bu cihaza kaydedildi");
  const scrollBody = dialog.locator(".teacher-owned-plan-scroll");
  await expect(scrollBody).toBeVisible();

  const initialMetrics = await scrollBody.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
    touchAction: getComputedStyle(element).touchAction,
  }));
  expect(initialMetrics.clientHeight).toBeGreaterThan(0);
  expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.clientHeight);
  expect(initialMetrics.overflowY).toBe("auto");
  expect(initialMetrics.touchAction).toBe("pan-y");

  await scrollBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  const lastAction = dialog.getByRole("button", {
    name: "Word hazırla",
  });
  await expect(lastAction).toBeEnabled();
  await expect(lastAction).toBeInViewport();
  const lastActionHit = await lastAction.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === button || button.contains(hit);
  });
  expect(lastActionHit).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await lastAction.click();
  await downloadPromise;
  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
  await expect(dialog).toBeHidden();
});

test("öğrenci profilinde isteğe bağlı T.C. kimlik numarası ve dört haneli kayıt yılı kalıcıdır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Kurgu Kimlik Çocuğu");
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Çocuk ekle" })).toBeHidden({
    timeout: 15_000,
  });
  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: "Kurgu Kimlik Çocuğu" })
    .click();

  let dialog = page.getByRole("dialog", { name: "Kurgu Kimlik Çocuğu profili" });
  await dialog.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await dialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  const identityInput = dialog.getByLabel("T.C. kimlik numarası (isteğe bağlı)");
  const enrollmentYearInput = dialog.getByLabel("Okula kayıt yılı");
  await identityInput.fill("10000000146");
  await enrollmentYearInput.fill("2025");
  await dialog.getByRole("button", { name: "Profili kaydet" }).click();
  await expect(dialog).toBeHidden();

  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: "Kurgu Kimlik Çocuğu" })
    .click();
  dialog = page.getByRole("dialog", { name: "Kurgu Kimlik Çocuğu profili" });
  await dialog.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await dialog.getByRole("button", { name: "Bilgiler", exact: true }).click();
  const persisted = await dialog.evaluate((sheet) => ({
    identityMatches:
      (sheet.querySelector("#student-profile-national-identity-number") as HTMLInputElement | null)
        ?.value === "10000000146",
    enrollmentYear:
      (sheet.querySelector("#student-profile-enrollment-year") as HTMLInputElement | null)
        ?.value,
    legacyDatePresent: sheet.querySelector("#student-profile-enrollment-date") !== null,
  }));
  expect(persisted).toEqual({
    identityMatches: true,
    enrollmentYear: "2025",
    legacyDatePresent: false,
  });
});

test("gelişim gözlemi satır, kapsam ve profilden kapanınca odak aynı çocuğa döner", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classroom?native=1");
  await configureClassroomWithoutStudents(page);

  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Odak Kurgu Çocuğu");
  await addStudent
    .getByRole("button", { name: "Kaydet ve kapat", exact: true })
    .click();
  await expect(addStudent).toBeHidden({ timeout: 15_000 });
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await addStudent.getByLabel("Çocuğun adı").fill("Diğer Odak Çocuğu");
  await addStudent
    .getByRole("button", { name: "Kaydet ve kapat", exact: true })
    .click();
  await expect(addStudent).toBeHidden({ timeout: 15_000 });

  const developmentTrigger = page.getByRole("button", {
    name: "Odak Kurgu Çocuğu için Maarif gelişim gözlemi ekle",
    exact: true,
  });
  const otherDevelopmentTrigger = page.getByRole("button", {
    name: "Diğer Odak Çocuğu için Maarif gelişim gözlemi ekle",
    exact: true,
  });
  const observationDialog = page.getByRole("dialog", {
    name: "Gözlem ve değerlendirme akışı",
  });
  const closeObservationAndExpectReturn = async (
    expectedTrigger = developmentTrigger,
  ) => {
    await expect(observationDialog).toBeVisible();
    await observationDialog
      .getByRole("button", { name: "Gözlem notu akışını kapat", exact: true })
      .click();
    await expect(observationDialog).toBeHidden();
    try { await expect(expectedTrigger).toBeFocused(); }
    catch(error){
      const focus=await page.evaluate(()=>({active:document.activeElement?.outerHTML.slice(0,400),dialogs:[...document.querySelectorAll('[role="dialog"]')].map(el=>({state:el.getAttribute('data-state'),title:el.getAttribute('aria-label')}))}));
      throw new Error(`Focus return diagnostic: ${JSON.stringify(focus)}`,{cause:error});
    }
  };

  await developmentTrigger.click();
  await closeObservationAndExpectReturn();

  await page
    .getByRole("button", {
      name: "Diğer Odak Çocuğu için Maarif gelişim gözlemi ekle",
      exact: true,
    })
    .click();
  await expect(observationDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(observationDialog).toBeHidden();
  await expect(otherDevelopmentTrigger).toBeFocused();

  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: "Odak Kurgu Çocuğu" })
    .click();
  const profileDialog = page.getByRole("dialog", {
    name: "Odak Kurgu Çocuğu profili",
  });
  const profileObservationTrigger = profileDialog.getByRole("button", {
    name: "Gözlem ekle",
    exact: true,
  });
  await profileObservationTrigger.click();
  await expect(profileDialog).toBeHidden();
  await closeObservationAndExpectReturn(profileObservationTrigger);
  await expect(profileDialog).toBeVisible();
});

test("320 pikselde dört kalıcı ekranın son eylemi alt menünün üstünde kalır ve dokunma alır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?native=1");
  await configureClassroomWithoutStudents(page);

  const routes = [
    { navigation: "Bugün", root: "main.simple-today" },
    { navigation: "Sınıfım", root: "main.simple-classroom" },
    {
      navigation: "Planlar",
      root: 'main.simple-workspace[aria-labelledby="simple-plans-title"]',
    },
    {
      navigation: "Belgeler",
      root: 'main.simple-workspace[aria-labelledby="simple-documents-title"]',
    },
  ] as const;

  for (const route of routes) {
    await page
      .getByRole("button", { name: route.navigation, exact: true })
      .click();
    const root = page.locator(route.root);
    await expect(root).toBeVisible();

    const scroll = page.locator(".mobile-scroll");
    const maxScrollTop = await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
      return element.scrollHeight - element.clientHeight;
    });
    if (maxScrollTop > 0) {
      await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    } else {
      await expect(scroll).toHaveJSProperty("scrollTop", 0);
    }

    const interactive = root.locator(INTERACTIVE_SELECTOR).filter({ visible: true });
    expect(await interactive.count(), `${route.navigation} etkileşimli öğe içermeli`).toBeGreaterThan(0);
    // WebKit reports layout boxes for descendants of closed details. Such controls
    // are not painted or interactive; audit the final control in the open tree.
    const exposedCount=await interactive.evaluateAll(elements=>{
      const exposed=elements.filter(element=>{
        for(let ancestor=element.parentElement;ancestor;ancestor=ancestor.parentElement){
          if(ancestor instanceof HTMLDetailsElement&&!ancestor.open){
            const summary=ancestor.querySelector(':scope > summary');
            if(!summary?.contains(element))return false;
          }
        }
        return true;
      });
      for(const old of document.querySelectorAll('[data-smoke-last-interactive]'))old.removeAttribute('data-smoke-last-interactive');
      exposed.at(-1)?.setAttribute('data-smoke-last-interactive','true');
      return exposed.length;
    });
    expect(exposedCount).toBeGreaterThan(0);
    // A lazy section can insert earlier buttons; retain element identity instead
    // of re-resolving a stale numeric index against the growing list.
    await expectAboveBottomNavigationAndHitTestable(page, root.locator('[data-smoke-last-interactive="true"]'));  }
});

test("320 piksel Çocuk Modunda çizim ve alt eylemler gezinmenin arkasında kalmaz", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  // This case exercises preparation mode; keep animation clocks native.
  await page.addInitScript((offsetMs: number) => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [NativeDate.now() + offsetMs]); },
      apply() { return new NativeDate(NativeDate.now() + offsetMs).toString(); },
      get(target, key, receiver) { return key === "now" ? () => NativeDate.now() + offsetMs : Reflect.get(target, key, receiver); },
    });
  }, Date.parse("2026-08-31T06:00:00.000Z") - Date.now());
  await page.goto("/activities?native=1");
  await configureClassroomWithoutStudents(page);

  const studio = page.locator("main.activity-studio");
  await expect(studio).toBeVisible();
  await studio.getByRole("button", { name: "Tüm filtreler", exact: true }).click();
  await studio
    .locator(".activity-studio__category-options")
    .getByRole("button", { name: "Çizim", exact: true })
    .click();
  const activity = studio.locator("article.activity-card").first();
  const activityTitle = (await activity.getByRole("heading").textContent())?.trim() ?? "";
  expect(activityTitle).not.toBe("");
  await activity.getByRole("button", { name: /rehberini aç$/u }).click();
  const guide = page.locator("main.activity-teacher-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await guide.locator("summary").filter({ hasText: "Program bağlantısı ve araçlar" }).click();
  const applyTrigger = guide.getByRole("button", { name: /etkinliğini Çocuk Modunda uygula$/u });
  await applyTrigger.click();

  const childMode = page.locator("main.activity-child-mode");
  await expect(childMode).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ana menü" })).toHaveCount(0);
  await expect(page.locator(".mobile-scroll")).toHaveJSProperty("scrollTop", 0);

  const previewWrites = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    store.close();
    return {
      applicationPlans: snapshot.plans.filter(
        (record) => record.planType === "activity-studio-application",
      ).length,
      applicationActivities: snapshot.activities.filter(
        (record) => record.activityKind === "activity-studio-application",
      ).length,
    };
  });
  expect(previewWrites).toEqual({
    applicationPlans: 0,
    applicationActivities: 0,
  });

  const addDot = childMode.getByRole("button", { name: "Nokta ekle", exact: true });
  await expect(addDot).toBeEnabled();
  await addDot.click();
  await expect(childMode.locator(".activity-drawing-pad__status")).toHaveText(
    "Nokta çizime eklendi.",
  );

  for (const label of ["PNG indir", "Yazdır"] as const) {
    const target = childMode.getByRole("button", { name: label, exact: true });
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await expect(target).toBeInViewport();
    await expect(target).toBeEnabled();
  }

  const footer = childMode.locator(".activity-child-mode__footer");
  const observationAction = footer.getByRole("button", {
    name: "Bu etkinlik için gözlem yaz",
    exact: true,
  });
  const recordingNotice = childMode.locator(
    ".activity-child-mode__recording-note",
  );
  await expect(recordingNotice).toContainText("Çalışmayı bugün başlat");
  await expect(recordingNotice).toContainText("kalıcı kanıt oluşturmaz");
  await expect(observationAction).toBeDisabled();
  const recordingNoticeId = await recordingNotice.getAttribute("id");
  expect(recordingNoticeId).toBeTruthy();
  await expect(observationAction).toHaveAttribute(
    "aria-describedby",
    recordingNoticeId!,
  );
  await expect(
    footer.getByRole("button", { name: "Pas geç", exact: true }),
  ).toBeEnabled();
  await expect(
    footer.getByRole("button", { name: "Öğretmene dön", exact: true }),
  ).toBeEnabled();

  for (const label of [
    "Bu etkinlik için gözlem yaz",
    "Pas geç",
    "Öğretmene dön",
  ] as const) {
    const target = footer.getByRole("button", { name: label, exact: true });
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await expect(target).toBeInViewport();
  }

  await footer.getByRole("button", { name: "Öğretmene dön", exact: true }).click();
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await expect(applyTrigger).toBeFocused();
  await guide.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  await expect(page.locator("main.activity-studio")).toBeVisible();
});




test("StrictMode kapanan ilk bağlantı güncel sınıf ve çocuk hidrasyonunu kaybettirmez",async({page},testInfo)=>{
 const warnings:string[]=[];
 page.on('console',message=>{if(message.type()==='warning'&&message.text().includes('hydration'))warnings.push(message.text().split(':')[0]);});
 await page.goto('/?native=1');await configureClassroomWithoutStudents(page);
 await page.getByRole('button',{name:'Sınıfım',exact:true}).click();await page.getByRole('button',{name:'Çocuk ekle',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Çocuk ekle',exact:true});await dialog.getByLabel('Çocuğun adı').fill('Hidrasyon Kurgu Çocuğu');await dialog.getByRole('button',{name:'Kaydet ve kapat',exact:true}).click();await expect(dialog).toBeHidden();
 const before=await readRepositorySnapshot(page);
 await page.reload({waitUntil:'networkidle'});
 await expect(page.getByRole('dialog',{name:'Cihaz verileri hazırlanıyor',exact:true})).toBeHidden({timeout:30_000});
 await expect(page.locator('button.simple-student-list__profile').filter({hasText:'Hidrasyon Kurgu Çocuğu'})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Sınıfını hazırla'})).toHaveCount(0);
 const after=await readRepositorySnapshot(page);
 expect(after.students).toEqual(before.students);
 expect(after.classrooms).toEqual(before.classrooms);
 await testInfo.attach('hydration-observation',{body:JSON.stringify({warningCount:warnings.length,persistedChildren:after.students.length,classroomsPreserved:true}),contentType:'application/json'});
});
