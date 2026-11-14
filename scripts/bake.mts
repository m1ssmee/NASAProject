// Pre-render real SPHEREx frames for the five test targets into public/plates/.
// The home page and target pages use these so the first blink needs no archive round trip.
//
//   npx tsx scripts/bake.mts                 all targets
//   npx tsx scripts/bake.mts wise-0855       one target
//   npx tsx scripts/bake.mts --preview DIR   also write PNG previews (for checking by eye)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { siaUrl } from '../src/config/releases';
import { targets, targetNow } from '../src/data/targets';
import { isoDate } from '../src/lib/astro';
import { buildColourEpochs, buildEpochs, COLOUR_DETS, displayLimits, loadFrame, makeGrid, parseSia, pool, stretch, thin, type Frame } from '../src/lib/frames';
import { rgbaFromChannels } from '../src/lib/render';

const args = process.argv.slice(2);
const pv = args.indexOf('--preview');
const previewDir = pv >= 0 ? args[pv + 1] : null;
const dv = args.indexOf('--det');
const detOverride = dv >= 0 ? Number(args[dv + 1]) : null;
const skip = new Set([pv, pv + 1, dv, dv + 1].filter((i) => i >= 0 && (i === pv || i === dv || args[i - 1]?.startsWith('--'))));
const only = args.filter((a, i) => !skip.has(i) && !a.startsWith('--'));
const outDir = path.join(process.cwd(), 'public', 'plates');
fs.mkdirSync(outDir, { recursive: true });

function png(gray: Uint8Array, n: number, zoom: number): Buffer {
  const w = n * zoom;
  const raw = Buffer.alloc((w + 1) * w);
  for (let y = 0; y < w; y++) {
    raw[y * (w + 1)] = 0;
    for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = gray[Math.floor(y / zoom) * n + Math.floor(x / zoom)];
  }
  const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(w, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const t of targets) {
  if (only.length && !only.includes(t.slug)) continue;
  const det = detOverride ?? t.det;
  const pos = targetNow(t);
  const grid = makeGrid(pos.ra, pos.dec, t.fov);
  const t0 = Date.now();
  let records = parseSia('');
  for (let attempt = 0; attempt < 8 && !records.length; attempt++) {
    const res = await fetch(siaUrl(pos.ra, pos.dec));
    if (res.ok) records = parseSia(await res.text());
    if (!records.length) await new Promise((r) => setTimeout(r, 6000));
  }
  const mine = thin(records.filter((r) => r.det === det), 160);
  const frames: Frame[] = [];
  let failed = 0;
  await pool(mine, 10, (r) => loadFrame(r, grid), (f, _r, err) => { if (f) frames.push(f); else if (err) failed++; });
  const epochs = buildEpochs(frames, 'pass');
  console.log(`${t.slug}: ${records.length} images, ${mine.length} in D${det}, ${frames.length} loaded, ${failed} failed, ${epochs.length} passes, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!epochs.length) continue;
  for (const e of epochs) console.log(`   ${isoDate(e.mjdMin)} to ${isoDate(e.mjdMax)}  n=${e.frames.length}  ${e.waveMin.toFixed(2)}-${e.waveMax.toFixed(2)} um`);

  const limits = displayLimits(epochs.map((e) => e.data));
  const bin = new Float32Array(grid.n * grid.n * epochs.length);
  epochs.forEach((e, i) => bin.set(e.data, i * grid.n * grid.n));
  fs.writeFileSync(path.join(outDir, `${t.slug}.bin`), Buffer.from(bin.buffer));
  // Colour version: the first and latest pass from three detectors, stored as finished 8-bit RGB.
  const cFrames: Frame[] = [];
  const cRecords = COLOUR_DETS.flatMap((d) => thin(records.filter((r) => r.det === d), 60));
  await pool(cRecords, 10, (r) => loadFrame(r, grid), (f) => { if (f) cFrames.push(f); });
  const cEpochs = buildColourEpochs(cFrames);
  let rgbMeta: { from: string; to: string; mjd: number; missing: number[] }[] | null = null;
  if (cEpochs.length >= 2) {
    const ends = [cEpochs[0], cEpochs[cEpochs.length - 1]];
    const cLimits = [0, 1, 2].map((c) => {
      const imgs = cEpochs.map((e) => e.rgb![c]).filter((x): x is Float32Array => !!x);
      return imgs.length ? displayLimits(imgs) : null;
    });
    const size = grid.n * grid.n;
    const rgb = new Uint8Array(size * 3 * ends.length);
    ends.forEach((e, k) => {
      const rgba = rgbaFromChannels(e.rgb!, grid.n, cLimits);
      for (let i = 0; i < size; i++) rgb.set([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]], k * size * 3 + i * 3);
    });
    fs.writeFileSync(path.join(outDir, `${t.slug}-rgb.bin`), Buffer.from(rgb.buffer));
    rgbMeta = ends.map((e) => ({ from: isoDate(e.mjdMin), to: isoDate(e.mjdMax), mjd: e.mjd, missing: e.missing ?? [] }));
    console.log(`   colour: ${cFrames.length} exposures, ${cEpochs.length} passes, kept first and last${rgbMeta.some((m) => m.missing.length) ? ' (a detector is missing in one)' : ''}`);
  }

  fs.writeFileSync(path.join(outDir, `${t.slug}.json`), JSON.stringify({
    slug: t.slug, ra: pos.ra, dec: pos.dec, n: grid.n, scale: grid.scale, det, limits,
    epochs: epochs.map((e) => ({ mjd: e.mjd, from: isoDate(e.mjdMin), to: isoDate(e.mjdMax), count: e.frames.length, waveMin: e.waveMin, waveMax: e.waveMax })),
    rgb: rgbMeta,
    baked: new Date().toISOString().slice(0, 10),
  }));

  if (previewDir) {
    fs.mkdirSync(previewDir, { recursive: true });
    const strip = new Uint8Array(grid.n * grid.n * epochs.length);
    epochs.forEach((e, k) => {
      const g = new Uint8Array(grid.n * grid.n);
      for (let i = 0; i < g.length; i++) {
        const v = e.data[i];
        g[i] = Number.isFinite(v) ? 255 - Math.round(255 * stretch(v, limits)) : 150; // negative: sources are dark
      }
      strip.set(g, k * g.length);
      fs.writeFileSync(path.join(previewDir, `${t.slug}-d${det}-${k}.png`), png(g, grid.n, Math.max(2, Math.round(480 / grid.n))));
    });
  }
}
