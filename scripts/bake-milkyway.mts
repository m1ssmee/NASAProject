// Bake the Milky Way background for the full-screen sky into public/sky/milkyway.webp.
// Source: NASA/Goddard Space Flight Center Scientific Visualization Studio, "Deep Star Maps
// 2020" (svs.gsfc.nasa.gov/4851), the star-free Milky Way layer, built from Gaia DR2.
// It is a plate carree map in celestial coordinates: RA 0 in the middle, RA increasing to the left.
// Needs ffmpeg (to read the OpenEXR file).   npx tsx scripts/bake-milkyway.mts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const URL = 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'milkyway-'));
const exr = process.argv[2] ?? path.join(tmp, 'mw.exr');
if (!process.argv[2]) {
  const r = await fetch(URL, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(300000) });
  if (!r.ok) throw new Error(`download: ${r.status}`);
  fs.writeFileSync(exr, Buffer.from(await r.arrayBuffer()));
}
const png = path.join(tmp, 'mw.png');
// Linear light to sRGB, and a light denoise: the map carries film-like grain that costs bytes.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-apply_trc', 'iec61966_2_1', '-i', exr, '-vf', 'hqdn3d=4:4:0:0', png]);
const out = path.join(process.cwd(), 'public', 'sky', 'milkyway.webp');
const info = await sharp(png).webp({ quality: 68, effort: 6 }).toFile(out);
console.log(`${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} kB -> ${out}`);
fs.rmSync(tmp, { recursive: true, force: true });
