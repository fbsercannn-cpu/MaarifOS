import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
for(const width of [320,390,430])test(`B plan and local source search complete at ${width}px without writes or overflow`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/tests/assistant-tools-fixture.html');
 await page.getByText('B planı bul',{exact:true}).click();await page.getByRole('combobox',{name:'Yaş grubu',exact:true}).selectOption('48-60');await page.getByLabel('Hazırlık dahil sürem (dakika)').fill('240');
 const first=page.getByRole('button',{name:/· plana ekle/}).first();await expect(first).toBeVisible();await first.click();await expect(page.getByLabel('Seçilen etkinlik')).toHaveText(/@48-60$/);
 await page.getByText('B planı bul',{exact:true}).click();await page.getByText('Gözlemlerimde hızlı bul',{exact:true}).click();await expect(page.getByText('1 kayıt bulundu.',{exact:true})).toBeVisible();
 await page.getByLabel('Metinde, çocukta veya etkinlikte ara').fill('ışık KAĞIT');await expect(page.locator('.assistant-tool__raw')).toHaveText('  IŞIK için kağıt seçti.\nÖzgün söz.  ');
 await page.getByLabel('Başlangıç günü').fill('2026-09-09');await expect(page.getByText('0 kayıt bulundu.',{exact:true})).toBeVisible();await page.getByLabel('Başlangıç günü').fill('2026-09-08');await page.getByLabel('Bitiş günü').fill('2026-09-08');await expect(page.getByText('1 kayıt bulundu.',{exact:true})).toBeVisible();
 await page.screenshot({path:resolve('../../artifacts/implementation-2026-09-19',`assistant-search-${width}.png`),fullPage:true});
 const result=await page.evaluate(async()=>({unchanged:window.assistantToolsFixture.before===JSON.stringify(await window.assistantToolsFixture.store.readSnapshot()),overflow:document.documentElement.scrollWidth>innerWidth+1}));expect(result).toEqual({unchanged:true,overflow:false});
});
