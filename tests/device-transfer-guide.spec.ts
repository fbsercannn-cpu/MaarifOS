import {test,expect} from '@playwright/test';
for(const width of [320,390,768])test(`device transfer shows verified state and invokes only requested action at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/tests/device-transfer-fixture.html');
 await page.getByText('Telefon veya bilgisayar değiştiriyorum',{exact:true}).click();
 const old=page.getByRole('button',{name:'Eski cihazım',exact:true}),newDevice=page.getByRole('button',{name:'Yeni cihazım',exact:true});
 await expect(old).toHaveAttribute('aria-pressed','true');await expect(page.locator('details').getByRole('status')).toHaveText('Henüz başarılı dosya yedeği yok.');
 await page.getByRole('button',{name:'Şifreli yedek alanına git',exact:true}).click();await expect(page.getByLabel('Yedek alanına yönlendirme')).toHaveText('1');
 // Navigation is not successful backup evidence.
 await expect(page.locator('details').getByRole('status')).toHaveText('Henüz başarılı dosya yedeği yok.');
 await page.evaluate(()=>(window as any).transferFixture.setBackup('2026-09-19T09:00:00Z'));
 await expect(page.locator('details').getByRole('status').locator('time')).toHaveAttribute('datetime','2026-09-19T09:00:00Z');
 await newDevice.click();await expect(newDevice).toHaveAttribute('aria-pressed','true');await expect(page.locator('details').getByRole('status')).toHaveText('Bu cihazda doğrulanmış geri yükleme denetimi henüz yok.');
 await page.getByRole('button',{name:'Taşıma dosyasını seç',exact:true}).click();await expect(page.getByLabel('Dosya seçme isteği')).toHaveText('1');await expect(page.locator('details').getByRole('status')).toHaveText('Bu cihazda doğrulanmış geri yükleme denetimi henüz yok.');
 await page.evaluate(()=>(window as any).transferFixture.setRestore('2026-09-19T10:00:00Z'));await expect(page.locator('details').getByRole('status').locator('time')).toHaveAttribute('datetime','2026-09-19T10:00:00Z');
 await page.evaluate(()=>(window as any).transferFixture.setDisabled(true));await expect(page.getByRole('button',{name:'Taşıma dosyasını seç',exact:true})).toBeDisabled();await old.click();await expect(page.getByRole('button',{name:'Şifreli yedek alanına git',exact:true})).toBeDisabled();
 await expect(page.getByLabel('Yedek alanına yönlendirme')).toHaveText('1');await expect(page.getByLabel('Dosya seçme isteği')).toHaveText('1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const button of await page.getByRole('button').all()){const bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);expect(bounds!.width).toBeGreaterThanOrEqual(44);}
});

