// Capture the sky map's opening view as a still image. It is shown until the live map is ready
// (and stays if WebGL is unavailable).  node scripts/sky-still.mjs http://127.0.0.1:4400/
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:4400/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await p.addInitScript(() => { try { sessionStorage.setItem('intro', '1'); } catch {} });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
// Only the stars: hide everything drawn over the canvas, and the still itself.
await p.addStyleTag({ content: '.skyhero__over, .sky__tools, .sky__card { visibility: hidden !important; } .sky__layer { display: none !important; } .sky { background-image: none !important; }' });
await p.waitForTimeout(200);
await p.locator('.sky__canvas').screenshot({ path: 'public/sky/first.jpg', type: 'jpeg', quality: 72 });
await b.close();
console.log('wrote public/sky/first.jpg');
