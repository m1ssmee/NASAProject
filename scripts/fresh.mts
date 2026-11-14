// Which parts of the sky has SPHEREx photographed most recently?
// IRSA will not answer a search by time alone, so this samples positions spread evenly over
// the sky with the position search (the same one the viewer uses) and keeps those whose newest
// exposure falls in the archive's latest two weeks. Run daily; writes public/sky/fresh.json.
//   npx tsx scripts/fresh.mts
import fs from 'node:fs';
import path from 'node:path';
import { siaUrl } from '../src/config/releases';
import { isoDate } from '../src/lib/astro';
import { parseSia, pool } from '../src/lib/frames';

const SAMPLES = 96;
const WINDOW_DAYS = 14;

// Fibonacci lattice: near-uniform points on a sphere.
const golden = Math.PI * (3 - Math.sqrt(5));
const points = Array.from({ length: SAMPLES }, (_, i) => {
  const z = 1 - (2 * (i + 0.5)) / SAMPLES;
  return { ra: (((i * golden) * 180) / Math.PI) % 360, dec: (Math.asin(z) * 180) / Math.PI };
});

async function newest(p: { ra: number; dec: number }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(siaUrl(p.ra, p.dec), { signal: AbortSignal.timeout(25000) });
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('s_ra')) return parseSia(text);
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
  }
  return null;
}

const results: { ra: number; dec: number; latest: number; mjds: number[] }[] = [];
let failed = 0;
await pool(points, 3, newest, (records, p) => {
  if (!records) { failed++; return; }
  if (!records.length) return;
  const mjds = records.map((r) => r.mjd);
  results.push({ ra: p.ra, dec: p.dec, latest: Math.max(...mjds), mjds });
});

const file = path.join(process.cwd(), 'public', 'sky', 'fresh.json');
if (results.length < SAMPLES / 3) {
  // The archive was mostly unreachable: keep yesterday's file instead of publishing a thin one.
  console.error(`Only ${results.length} of ${SAMPLES} positions answered (${failed} failed). Leaving fresh.json unchanged.`);
  process.exit(fs.existsSync(file) ? 0 : 1);
}
const newestMjd = Math.max(...results.map((r) => r.latest));
const fields = results
  .filter((r) => r.latest > newestMjd - WINDOW_DAYS)
  .map((r) => ({
    ra: Math.round(r.ra * 1e4) / 1e4,
    dec: Math.round(r.dec * 1e4) / 1e4,
    date: isoDate(r.latest),
    // Exposures of this position inside the window (each exposure yields images on two detectors).
    count: r.mjds.filter((m) => m > newestMjd - WINDOW_DAYS).length,
  }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({
  checked: new Date().toISOString().slice(0, 10),
  newest: isoDate(newestMjd),
  windowDays: WINDOW_DAYS,
  sampled: results.length,
  fields,
}, null, 1) + '\n');
console.log(`${results.length}/${SAMPLES} positions answered, ${failed} failed. Newest exposure ${isoDate(newestMjd)}. ${fields.length} fresh fields.`);
