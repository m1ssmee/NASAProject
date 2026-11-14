// Bake the Yale Bright Star Catalogue (public domain, about 9,100 stars to magnitude 6.5)
// into public/sky/stars.bin as float32 quadruples: RA deg, Dec deg, V magnitude, B-V colour.
//   npx tsx scripts/bake-stars.mts
import fs from 'node:fs';
import path from 'node:path';

const MIRRORS = ['https://vizier.cfa.harvard.edu', 'https://vizier.idia.ac.za', 'https://vizier.cds.unistra.fr'];
const query = '/viz-bin/asu-tsv?-source=V/50/catalog&-out=_RAJ2000,_DEJ2000,Vmag,B-V&-out.max=unlimited';

let text = '';
for (const m of MIRRORS) {
  try {
    const r = await fetch(m + query, { signal: AbortSignal.timeout(60000) });
    if (r.ok) {
      text = await r.text();
      if (text.length > 100000) break;
    }
  } catch { /* next mirror */ }
}
const rows = text.split('\n').filter((l) => /^\s*\d/.test(l)).map((l) => l.split('\t').map((s) => s.trim()));
const stars = rows
  .map((f) => [Number(f[0]), Number(f[1]), Number(f[2]), f[3] === '' || f[3] === undefined ? 0.6 : Number(f[3])])
  // The catalogue keeps a few removed entries with no position or magnitude.
  .filter((s) => f(s[0]) && f(s[1]) && f(s[2]) && f(s[3]) && !(s[0] === 0 && s[1] === 0));
function f(v: number) { return Number.isFinite(v); }
stars.sort((a, b) => a[2] - b[2]);

const out = new Float32Array(stars.length * 4);
stars.forEach((s, i) => out.set(s, i * 4));
const dir = path.join(process.cwd(), 'public', 'sky');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'stars.bin'), Buffer.from(out.buffer));
console.log(`${stars.length} stars, V ${stars[0]?.[2]} to ${stars.at(-1)?.[2]}, ${(out.byteLength / 1024).toFixed(0)} kB`);
console.log('brightest:', stars[0], '(Sirius is near 101.29, -16.72, V -1.46)');
