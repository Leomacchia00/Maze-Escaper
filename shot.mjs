import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
await page.screenshot({ path: '.screenshots/01-home.png', fullPage: true });
// start a run
await page.click('#btn-play');
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots-run.png', fullPage: false });
await browser.close();
