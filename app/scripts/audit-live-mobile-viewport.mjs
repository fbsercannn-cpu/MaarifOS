import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist/client");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";
  let filePath = path.join(distDir, reqPath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end("Server Error");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

const PORT = 41739;

async function runDeepMobileAudit() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Mega Audit] Canli denetim sunucusu hazir: http://localhost:${PORT}`);

  const viewports = [
    { name: "Küçük Android (360x740)", width: 360, height: 740 },
    { name: "iPhone SE (375x667)", width: 375, height: 667 },
    { name: "Standart iPhone 14/15/16 (390x844)", width: 390, height: 844 },
    { name: "Android Pixel 8/9 / Samsung S24 (412x915)", width: 412, height: 915 },
    { name: "iPhone Pro Max (430x932)", width: 430, height: 932 },
  ];

  const browser = await chromium.launch({ headless: true });
  const auditReport = [];

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      hasTouch: true,
      isMobile: true,
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/?native=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Ekran Denetim Fonksiyonu
    async function inspectScreen(screenName) {
      return await page.evaluate(({ viewportWidth, screenName }) => {
        const docWidth = document.documentElement.clientWidth;
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.clientWidth;
        const bodyScrollWidth = document.body.scrollWidth;

        // Görsel olarak viewport'un sağından taşan elemanları tespit et
        const allElements = document.querySelectorAll("*");
        const visibleOverflows = [];

        for (const el of allElements) {
          if (el instanceof SVGElement) continue;
          if (el.classList.contains("sr-live") || el.classList.contains("sr-only")) continue;
          
          const rect = el.getBoundingClientRect();
          // Eğer eleman ekranda görünüyorsa ve sağ kenarı viewport'u aşıyorsa
          if (rect.width > 0 && rect.height > 0 && rect.right > viewportWidth + 1.5) {
            visibleOverflows.push({
              tag: el.tagName.toLowerCase(),
              className: String(el.className).slice(0, 50),
              id: el.id || "",
              rectRight: Math.round(rect.right),
              viewportWidth,
              overflowPx: Math.round(rect.right - viewportWidth),
              textSnippet: (el.textContent || "").trim().slice(0, 30),
            });
          }
        }

        // Yatay scroll drift testi
        const initialScrollX = window.scrollX;
        window.scrollBy(0, 200);
        const afterScrollX = window.scrollX;

        return {
          screenName,
          docWidth,
          docScrollWidth,
          bodyWidth,
          bodyScrollWidth,
          initialScrollX,
          afterScrollX,
          hasDocHorizontalScroll: docScrollWidth > docWidth,
          hasBodyHorizontalScroll: bodyScrollWidth > bodyWidth,
          visibleOverflows: visibleOverflows.slice(0, 5),
          totalVisibleOverflows: visibleOverflows.length,
        };
      }, { viewportWidth: vp.width, screenName });
    }

    // 1. İlk Açılış Ekranı (veya açık olan BottomSheet)
    const initialResult = await inspectScreen("İlk Açılış / Kurulum Ekranı");

    // Eğer açık bir BottomSheet kapatma butonu varsa kapatmayı dene
    const closeBtn = await page.$('.sheet-close, button[aria-label="Kapat"], button:has-text("✕")');
    if (closeBtn) {
      try {
        await closeBtn.click({ timeout: 2000 });
        await page.waitForTimeout(400);
      } catch (e) {
        // yoksa devam et
      }
    }

    // 2. Ana Ekran
    const mainScreenResult = await inspectScreen("Ana Akış Ekranı");

    // 3. Tab butonlarını evaluate ile doğrudan tetikleme (overlay engeline takılmadan)
    const navItems = ["today", "classroom", "plans", "documents"];
    const navResults = [];

    for (const navId of navItems) {
      const clicked = await page.evaluate((id) => {
        const btn = document.querySelector(`.bottom-nav button[key="${id}"], .bottom-nav button`);
        if (btn) {
          btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return true;
        }
        return false;
      }, navId);

      if (clicked) {
        await page.waitForTimeout(300);
        const res = await inspectScreen(`Navigasyon [${navId}]`);
        navResults.push(res);
      }
    }

    auditReport.push({
      viewport: vp,
      screens: [initialResult, mainScreenResult, ...navResults],
    });

    await context.close();
  }

  await browser.close();
  server.close();

  // Sonuçları özetle
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("MEGA MOBIL CANLI TEST VE SIFIR YATAY TASMA RAPORU");
  console.log("══════════════════════════════════════════════════════════");
  
  let overallPass = true;
  for (const vpResult of auditReport) {
    console.log(`\n📱 VIEWPORT: ${vpResult.viewport.name}`);
    for (const scr of vpResult.screens) {
      const isClean = !scr.hasDocHorizontalScroll && !scr.hasBodyHorizontalScroll && scr.totalVisibleOverflows === 0 && scr.afterScrollX === 0;
      if (!isClean) overallPass = false;
      const status = isClean ? "✅ 0 TAŞMA (STABIL)" : "❌ TAŞMA TESPIT EDILDI";
      console.log(`  [${scr.screenName}]: ${status}`);
      console.log(`    DocScrollWidth: ${scr.docScrollWidth}px / Viewport: ${scr.docWidth}px | ScrollX: ${scr.afterScrollX}px`);
      if (scr.totalVisibleOverflows > 0) {
        console.log(`    Taşan Elemanlar (${scr.totalVisibleOverflows}):`, JSON.stringify(scr.visibleOverflows, null, 2));
      }
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`GENEL MOBIL STABILITE DURUMU: ${overallPass ? "✅ %100 KUSURSUZ (0 HORIZONTAL DRIFT)" : "⚠️ IYILESTIRME GEREKLI"}`);
  console.log("══════════════════════════════════════════════════════════\n");

  return auditReport;
}

runDeepMobileAudit().catch((err) => {
  console.error("Deep audit error:", err);
  server.close();
  process.exit(1);
});
