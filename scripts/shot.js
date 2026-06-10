// 截图脚本 - 用 playwright + 已有的 chromium
const { chromium } = require('/tmp/node_modules/playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://localhost:3001/';
  const out = process.argv[3] || '/workspace/preview.png';
  const cat = process.argv[4] || 'text';

  const candidates = [
    '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
    '/root/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
    '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome'
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  console.log('using chromium:', exe || '(default)');

  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.type(), m.text());
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // 切到 tab 后,等所有图片加载完
  const tab = await page.$(`button.tab[data-cat="${cat}"]`);
  if (tab) {
    await tab.click();
    await page.waitForTimeout(800);
    try {
      await page.waitForFunction(
        () => Array.from(document.images).every((i) => i.complete || i.style.display === 'none'),
        { timeout: 15000 }
      );
    } catch (_) {}
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: out, fullPage: true });
  console.log('saved →', out);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
