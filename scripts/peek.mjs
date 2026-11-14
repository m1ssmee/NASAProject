// Quick look: node scripts/peek.mjs <url> <out.png> [width] [height] [waitMs] [full]
import { chromium } from 'playwright';
const [url, out, w = '1440', h = '900', wait = '2500', full = ''] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 300)));
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(+wait);
await p.screenshot({ path: out, fullPage: full === 'full' });
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await b.close();
