import {test,expect} from "@playwright/test";
test.use({viewport:{width:320,height:844}});
const fixture="/tests/click-completion-fixture-2026-09-12.html";
const production = process.env.CLICK_COMPLETION_PRODUCTION === "1";
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date("2026-09-12T09:00:00Z"));});
test("unmatched text offers explicit canonical choice; disabled and rapid double-click preserve one real persisted link",async({page},testInfo)=>{
 test.skip(production,"Fixture checks run against development server"); await page.goto(`${fixture}?mode=work`);const region=page.getByRole("region",{name:"Hazır iş paketleri",exact:true});
 const select=region.getByRole("combobox");await expect(select).toBeVisible();
 const option=await select.locator("option").evaluateAll(options=>options.find((o:HTMLOptionElement)=>o.value.includes("development:"))?.value);expect(option).toBeTruthy();
 await select.selectOption(option!);const checkbox=region.getByRole("checkbox");await checkbox.check();
 expect(await page.evaluate(()=>(window as any).clickCompletionTest.readCount())).toBe(1); await testInfo.attach("initial-snapshot-reads",{body:JSON.stringify({reads:1,scope:"initial mount after fixture seeding",date:"2026-09-12"}),contentType:"application/json"});
 await page.getByRole("button",{name:"İşlem kilidini değiştir"}).click();await expect(region.locator(".work-package-apply")).toBeDisabled();await page.getByRole("button",{name:"İşlem kilidini değiştir"}).click();
 await region.locator(".work-package-apply").evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect.poll(()=>page.evaluate(async()=>{const api=(window as any).clickCompletionTest;const s=await api.store.readSnapshot();return s.evidenceCurriculumLinks.filter(r=>r.observationId===api.neutralId).length;})).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.reload();await page.waitForFunction(()=>!!(window as any).clickCompletionTest);
 expect(await page.evaluate(async()=>{const api=(window as any).clickCompletionTest;const s=await api.store.readSnapshot();return s.evidenceCurriculumLinks.filter(r=>r.observationId===api.neutralId).length;})).toBe(1);
});
test("prewritten assessment checkbox completes exact teacher-authored record once",async({page})=>{
 test.skip(production,"Fixture checks run against development server"); await page.goto(`${fixture}?mode=assessment`);const region=page.getByRole("region",{name:"Değerlendirmeleri tamamla",exact:true});await region.getByRole("checkbox").check();const save=region.getByRole("button",{name:"Seçili değerlendirmeleri kaydet ve tamamla",exact:true});
 await page.getByRole("button",{name:"İşlem kilidini değiştir"}).click();await expect(save).toBeDisabled();await page.getByRole("button",{name:"İşlem kilidini değiştir"}).click();await save.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect.poll(()=>page.evaluate(async()=>{const api=(window as any).clickCompletionTest;return (await api.store.readSnapshot()).reportDrafts.find(r=>r.id===api.assessmentId)?.status;})).toBe("teacher-saved");
 const saved=await page.evaluate(async()=>{const api=(window as any).clickCompletionTest;return (await api.store.readSnapshot()).reportDrafts.filter(r=>r.id===api.assessmentId);});expect(saved).toHaveLength(1);expect(saved[0].teacherAssessmentText).toBe("Öğretmenin önceden yazdığı gerçek değerlendirme metni.");expect(saved[0].evidenceCitations.length).toBeGreaterThan(0);expect(saved[0].reviewedByUserId).toMatch(/^[a-f0-9-]{36}$/);await page.reload();await page.waitForFunction(()=>!!(window as any).clickCompletionTest);await expect(region).toHaveCount(0);
});
test("Desk initializes Saturday calendar and roster from one source snapshot",async({page},testInfo)=>{
 test.skip(production,"Fixture checks run against development server"); await page.goto(`${fixture}?mode=desk`);await expect(page.getByRole("button",{name:"12 Eylül 2026 Cumartesi · Öğretim günü değil",exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).clickCompletionTest.readCount())).toBe(1); await testInfo.attach("initial-snapshot-reads",{body:JSON.stringify({reads:1,scope:"initial mount after fixture seeding",date:"2026-09-12"}),contentType:"application/json"});
});




test("document workshop lazily opens independent panels and keeps entered family draft at 320px",async({page})=>{
 test.skip(production,"Fixture checks run against development server");const requests:string[]=[];page.on("request",r=>{if(r.resourceType()==="script")requests.push(r.url());});
 await page.goto(`${fixture}?mode=workshop`);const workshop=page.getByRole("region",{name:"Sınıfta kullanılacak belgeler",exact:true});await expect(workshop).toBeVisible();expect(requests.filter(u=>/\/(HomeGameCardsPanel|TeacherPrintKit|SmallGroupCardsPanel|DayExitPackagePanel|MaterialBoxLabelsPanel|FamilyResponseBoardPanel)\.tsx/.test(u))).toHaveLength(0);
 await workshop.getByRole("button",{name:/^Aileye ev oyunu/}).click();const family=workshop.getByRole("region",{name:"Aileye ev oyunu kartı",exact:true});await expect(family).toBeVisible();await family.getByLabel("Malzemeler",{exact:true}).fill("Kaybolmaması gereken aile kartı metni.");
 await workshop.getByRole("button",{name:/^Teslim çizelgesi ve klasör/}).click();await expect(workshop.getByRole("region",{name:"Teslim çizelgesi ve klasör seti",exact:true})).toBeVisible();await expect(family).toBeHidden();await workshop.getByRole("button",{name:/^Aileye ev oyunu/}).click();await expect(family.getByLabel("Malzemeler",{exact:true})).toHaveValue("Kaybolmaması gereken aile kartı metni.");
 await workshop.getByRole("button",{name:/^Küçük grup kartları/}).click();await expect(workshop.getByRole("region",{name:"Küçük grup kartları",exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("production defers home-game print and group scripts until the chosen workshop panel opens",async({page},testInfo)=>{
 test.skip(!production,"Run against final production build");test.setTimeout(90000);const scripts:string[]=[];page.on("request",r=>{if(r.resourceType()==="script")scripts.push(r.url());});const target=()=>scripts.filter(u=>/(HomeGameCardsPanel|TeacherPrintKit|SmallGroupCardsPanel|DayExitPackagePanel|MaterialBoxLabelsPanel|FamilyResponseBoardPanel)-[^/]+\.js/.test(u));
 await page.goto("/classroom?native=1");const setup=page.getByRole("dialog",{name:"Sınıfını hazırla",exact:true});await setup.getByLabel("Okul adı").fill("Kurgu Performans Okulu");await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");await setup.getByLabel("Sınıf adı").fill("Kurgu Sınıf");await setup.getByLabel("Maarif Modeli yaş grubu",{exact:true}).selectOption({label:"60–72 ay"});await setup.getByRole("button",{name:"Sınıfımı hazırla",exact:true}).click();await expect(setup).toBeHidden();expect(target()).toHaveLength(0);
 await page.getByRole("button",{name:"Belgeler",exact:true}).click();const workshop=page.getByRole("region",{name:"Sınıfta kullanılacak belgeler",exact:true});await expect(workshop).toBeVisible();expect(target()).toHaveLength(0);
 await workshop.getByRole("button",{name:/^Aileye ev oyunu/}).click();await expect(workshop.getByRole("region",{name:"Aileye ev oyunu kartı",exact:true})).toBeVisible();expect(target().some(u=>u.includes("HomeGameCardsPanel-"))).toBe(true);expect(target().filter(u=>/(TeacherPrintKit|SmallGroupCardsPanel|DayExitPackagePanel|MaterialBoxLabelsPanel|FamilyResponseBoardPanel)-/.test(u))).toHaveLength(0);
 await testInfo.attach("lazy-page-script-requests",{body:JSON.stringify({beforeOpening:0,afterFamily:target(),allPageScripts:scripts},null,2),contentType:"application/json"});
});



test("new workshop empty states open the real next surface without losing a draft",async({page})=>{
 test.skip(production,"Fixture checks run against development server");
 await page.goto(`${fixture}?mode=workshop`);const workshop=page.getByRole("region",{name:"Sınıfta kullanılacak belgeler",exact:true});
 await workshop.getByRole("button",{name:/^Aile dönüş panosu/}).click();
 const board=workshop.getByRole("region",{name:"Aile dönüş panosu",exact:true});await expect(board).toBeVisible();
 await board.getByRole("button",{name:"Aile oyun kartı hazırla",exact:true}).click();
 const family=workshop.getByRole("region",{name:"Aileye ev oyunu kartı",exact:true});await expect(family).toBeVisible();
 await family.getByLabel("Malzemeler",{exact:true}).fill("Kurgu panel geçişinde korunan malzeme");
 await workshop.getByRole("button",{name:/^Malzeme kutusu etiketleri/}).click();await expect(workshop.getByRole("region",{name:"Malzeme kutusu etiketleri",exact:true})).toBeVisible();
 await workshop.getByRole("button",{name:/^Günün çıkış paketi/}).click();await expect(workshop.getByRole("region",{name:"Günün çıkış paketi",exact:true})).toBeVisible();
 await workshop.getByRole("button",{name:/^Aileye ev oyunu/}).click();await expect(family.getByLabel("Malzemeler",{exact:true})).toHaveValue("Kurgu panel geçişinde korunan malzeme");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("production empty family and material panels open their real preparation surfaces",async({page})=>{
 test.skip(!production,"Run against final production build");
 await page.goto("/classroom?native=1");const setup=page.getByRole("dialog",{name:"Sınıfını hazırla",exact:true});
 await setup.getByLabel("Okul adı").fill("Kurgu İş Akışı Okulu");await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");await setup.getByLabel("Sınıf adı").fill("Kurgu Sınıf");await setup.getByLabel("Maarif Modeli yaş grubu",{exact:true}).selectOption({label:"60–72 ay"});await setup.getByRole("button",{name:"Sınıfımı hazırla",exact:true}).click();await expect(setup).toBeHidden();
 await page.getByRole("button",{name:"Belgeler",exact:true}).click();const workshop=page.getByRole("region",{name:"Sınıfta kullanılacak belgeler",exact:true});
 await workshop.getByRole("button",{name:/^Aile dönüş panosu/}).click();await workshop.getByRole("button",{name:"Aile oyun kartı hazırla",exact:true}).click();await expect(workshop.getByRole("region",{name:"Aileye ev oyunu kartı",exact:true})).toBeVisible();
 await workshop.getByRole("button",{name:/^Malzeme kutusu etiketleri/}).click();await workshop.getByRole("button",{name:"Öğrenme merkezlerine malzeme ayır",exact:true}).click();
 const management=page.getByRole("dialog",{name:"Sınıf yönetimi",exact:true});await expect(management).toBeVisible();await expect(management.getByLabel("Sınıf yönetimi alanı")).toHaveValue("centers");
});
