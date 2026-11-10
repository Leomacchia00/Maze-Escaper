import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('.screenshots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
await page.screenshot({ path: '.screenshots/01-home.png', fullPage: true });
await page.click('#btn-play');
await page.waitForTimeout(800);
await page.screenshot({ path: '.screenshots/02-run.png', fullPage: false });
await page.mouse.down();
await page.mouse.move(300, 500);
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/03-move.png', fullPage: false });
await page.mouse.up();
await browser.close();
console.log('screenshots in .screenshots/');
