// Bake the 88 constellations into public/sky/constellations.json: the stick figures (each
// line end snapped onto a star of our own catalogue), a lookup grid that says which
// constellation any point of the sky belongs to, and the proper names of the bright stars.
// Source: d3-celestial by Olaf Frohn (BSD 3-Clause), github.com/ofrohn/d3-celestial.
// Run after bake-stars:   npx tsx scripts/bake-constellations.mts
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const get = async (f: string) => {
  const r = await fetch(BASE + f, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`${f}: ${r.status}`);
  return r.json();
};
type Feature<G> = { id: string | number; properties: Record<string, string | number>; geometry: { type: string; coordinates: G } };
const [lines, info, bounds, starNames, stars6] = await Promise.all([
  get('constellations.lines.json'), get('constellations.json'), get('constellations.bounds.json'), get('starnames.json'), get('stars.6.json'),
]) as [{ features: Feature<number[][][]>[] }, { features: Feature<number[]>[] }, { features: Feature<number[][][]>[] }, Record<string, { name: string }>, { features: Feature<number[]>[] }];

const D2R = Math.PI / 180;
const wrap = (ra: number) => ((ra % 360) + 360) % 360;
const vec = (ra: number, dec: number) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
const sep = (a: number[], b: number[]) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D2R;
const round = (v: number, n = 4) => Number(v.toFixed(n));

// Our own catalogue: the lines must end on the dots the map actually draws.
const cat = new Float32Array(fs.readFileSync(path.join(process.cwd(), 'public', 'sky', 'stars.bin')).buffer.slice(0));
const nCat = cat.length / 4;
function snap(ra: number, dec: number, limit: number, maxMag = 99): { ra: number; dec: number; mag: number } | null {
  const p = vec(ra, dec);
  let best = -1, bestSep = limit;
  for (let i = 0; i < nCat; i++) {
    if (Math.abs(cat[i * 4 + 1] - dec) > limit || cat[i * 4 + 2] > maxMag) continue;
    const s = sep(p, vec(cat[i * 4], cat[i * 4 + 1]));
    if (s < bestSep) { best = i; bestSep = s; }
  }
  return best < 0 ? null : { ra: cat[best * 4], dec: cat[best * 4 + 1], mag: cat[best * 4 + 2] };
}

// What each name means, where the source only repeats the name or uses an asterism.
const MEANING: Record<string, string> = {
  And: 'the chained princess', Aqr: 'the water bearer', Cas: 'the queen', Cep: 'the king', Cha: 'the chameleon',
  Eri: 'the river', Her: 'the strongman', Hyi: 'the water snake', Lyn: 'the lynx', Men: 'the table mountain',
  Oph: 'the serpent bearer', Ori: 'the hunter', Peg: 'the winged horse', Per: 'the hero', Phe: 'the phoenix',
  Scl: 'the sculptor', UMa: 'the great bear', UMi: 'the little bear', Cap: 'the sea goat', Pup: 'the stern',
  Pyx: "the ship's compass", Cir: 'the drawing compass', Nor: 'the set square', Cae: 'the chisel',
  Pic: "the painter's easel", Equ: 'the little horse', Lib: 'the scales', Vir: 'the maiden', Hor: 'the pendulum clock',
  Com: "Berenice's hair", Ind: 'the Indian',
};

let snapped = 0, loose = 0;
const list = lines.features.map((f, i) => {
  const id = String(f.id);
  const meta = info.features[i];
  if (String(meta.id) !== id) throw new Error('order mismatch');
  const polylines = f.geometry.coordinates.map((line) => line.map(([lon, lat]) => {
    const s = snap(wrap(lon), lat, 0.35);
    if (s) snapped++; else loose++;
    return s ? [round(s.ra), round(s.dec)] : [round(wrap(lon)), round(lat)];
  }));
  const pts = polylines.flat();
  const sum = [0, 0, 0];
  for (const [ra, dec] of pts) { const v = vec(ra, dec); sum[0] += v[0]; sum[1] += v[1]; sum[2] += v[2]; }
  const len = Math.hypot(sum[0], sum[1], sum[2]);
  const c = sum.map((x) => x / len);
  const ra = wrap(Math.atan2(c[1], c[0]) / D2R), dec = Math.asin(c[2]) / D2R;
  const r = Math.max(...pts.map(([a, d]) => sep(c, vec(a, d))));
  // Serpens is the one constellation in two pieces.
  const lon = meta.geometry.coordinates[0];
  const name = id === 'Ser' ? `Serpens ${lon < -100 ? 'Caput' : 'Cauda'}` : String(meta.properties.name);
  const meaning = id === 'Ser' ? (lon < -100 ? "the serpent's head" : "the serpent's tail") : MEANING[id] ?? `the ${String(meta.properties.en).toLowerCase()}`;
  return { id, name, meaning, ra: round(ra, 2), dec: round(dec, 2), r: round(r, 1), lines: polylines.map((l) => l.flat()) };
});

// Which constellation is this point in? Boundaries run along lines of RA and Dec, so a flat
// point-in-polygon test in (RA, Dec) is the right one once each outline is unwrapped.
const polys = bounds.features.map((f) => {
  const ring = f.geometry.coordinates[0];
  const out: number[][] = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i][0];
    const prev = out[i - 1][0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([lon, ring[i][1]]);
  }
  // An outline that goes all the way round the sky holds a pole: close it over that pole.
  const turn = out.at(-1)![0] - out[0][0];
  if (Math.abs(turn) > 180) {
    const meanDec = out.reduce((a, p) => a + p[1], 0) / out.length;
    const pole = meanDec > 0 ? 90 : -90;
    out.push([out.at(-1)![0], pole], [out[0][0], pole]);
  }
  const lons = out.map((p) => p[0]);
  return { id: String(f.id), pts: out, min: Math.min(...lons), max: Math.max(...lons) };
});
function inside(pts: number[][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const ids = [...new Set(list.map((c) => c.id))];
function locate(ra: number, dec: number): number {
  for (const p of polys) {
    for (let x = ra - 720; x <= ra + 720; x += 360) {
      if (x < p.min || x > p.max) continue;
      if (inside(p.pts, x, dec)) return ids.indexOf(p.id);
    }
  }
  return -1;
}
const STEP = 0.5;
let holes = 0;
const rows: number[][] = [];
for (let j = 0; j < 180 / STEP; j++) {
  const dec = -90 + (j + 0.5) * STEP;
  const row: number[] = [];
  let last = -2, run = 0;
  for (let i = 0; i < 360 / STEP; i++) {
    let k = locate((i + 0.5) * STEP, dec);
    if (k < 0) { holes++; k = last < 0 ? 0 : last; }
    if (k === last) run++;
    else { if (run) row.push(last, run); last = k; run = 1; }
  }
  row.push(last, run);
  rows.push(row);
}

// Proper names for the bright stars, placed on our own catalogue dots.
const names: { name: string; ra: number; dec: number; mag: number }[] = [];
for (const s of stars6.features) {
  const n = starNames[String(s.id)]?.name;
  // Alpha Centauri's two stars share one dot: keep one name.
  if (!n || n === 'Toliman' || Number(s.properties.mag) > 2.9) continue;
  const at = snap(wrap(s.geometry.coordinates[0]), s.geometry.coordinates[1], 0.2, 3.2);
  if (at && !names.some((x) => x.ra === round(at.ra) && x.dec === round(at.dec))) names.push({ name: n, ra: round(at.ra), dec: round(at.dec), mag: round(at.mag, 2) });
}
names.sort((a, b) => a.mag - b.mag);

const out = { credit: 'd3-celestial, Olaf Frohn, BSD 3-Clause', ids, list, names, grid: { step: STEP, rows } };
const file = path.join(process.cwd(), 'public', 'sky', 'constellations.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`${list.length} figures, ${ids.length} constellations, ${snapped} line ends on catalogue stars, ${loose} not`);
console.log(`${names.length} named stars; grid holes ${holes}; ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
const check: [string, number, number, string][] = [
  ['Sirius', 101.29, -16.72, 'CMa'], ['Polaris', 37.95, 89.26, 'UMi'], ['Betelgeuse', 88.79, 7.41, 'Ori'], ['Sigma Octantis', 317.2, -88.96, 'Oct'],
  ["Barnard's Star", 269.45, 4.69, 'Oph'], ['Vega', 279.23, 38.78, 'Lyr'], ['Fomalhaut', 344.41, -29.62, 'PsA'], ['Alpheratz', 2.1, 29.09, 'And'],
  ['Unukalhai', 236.07, 6.43, 'Ser'], ['Eta Serpentis', 275.33, -2.9, 'Ser'], ['Acrux', 186.65, -63.1, 'Cru'], ['Deneb Kaitos', 10.9, -17.99, 'Cet'],
];
for (const [n, ra, dec, want] of check) {
  const got = ids[locate(ra, dec)];
  console.log(`${got === want ? 'ok  ' : 'FAIL'} ${n}: ${got} (expected ${want})`);
}
