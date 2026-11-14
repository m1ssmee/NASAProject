// From a list of SPHEREx exposures to aligned, north-up frames that can be blinked.
import waveTables from '../data/wave.json';
import { NAXIS, openImage, readStrip, stripPixel } from './fits';
import { makeWcs, skyToPix } from './wcs';

/** One archive image covering the requested position (from /api/frames). */
export interface ImageRecord {
  id: string;
  det: number; // 1..6
  mjd: number;
  key: string; // S3 key
  rel: string; // release collection, e.g. spherex_dr1
}

export interface Grid {
  ra: number;
  dec: number;
  /** Output size in pixels (square). */
  n: number;
  /** Output pixel size in arcseconds. */
  scale: number;
}

export interface Frame {
  rec: ImageRecord;
  mjd: number;
  /** n*n background-subtracted surface brightness, MJy/sr. Row 0 is north, column 0 is east. */
  data: Float32Array;
  background: number;
  sigma: number;
  /** Wavelength and bandwidth (microns) sampled at the requested position. */
  wave: number;
  bandwidth: number;
  /** Detector pixel of the requested position (0-based). */
  pixel: [number, number];
  psfFwhm: number;
  exposure: number;
  /** Share of output pixels that fell on the detector. */
  coverage: number;
}

export interface Epoch {
  key: string;
  mode: Mode;
  mjd: number;
  mjdMin: number;
  mjdMax: number;
  data: Float32Array;
  frames: Frame[];
  waveMin: number;
  waveMax: number;
  /** Colour plates only: one stacked image per colour channel (blue, green, red), null where a detector has no exposures. */
  rgb?: (Float32Array | null)[];
  /** Colour plates only: detectors with no exposures in this pass. */
  missing?: number[];
}

export type Mode = 'pass' | 'burst' | 'single';

export const NATIVE_SCALE = 6.15; // arcsec per detector pixel
export const DETECTORS = [
  { det: 1, min: 0.75, max: 1.09 },
  { det: 2, min: 1.1, max: 1.62 },
  { det: 3, min: 1.63, max: 2.41 },
  { det: 4, min: 2.42, max: 3.82 },
  { det: 5, min: 3.83, max: 4.41 },
  { det: 6, min: 4.42, max: 5.0 },
] as const;

/** Output grid for a field of view in arcseconds, oversampling the detector by two. */
export function makeGrid(ra: number, dec: number, fovArcsec: number): Grid {
  const scale = NATIVE_SCALE / 2;
  const n = Math.max(16, Math.min(640, Math.round(fovArcsec / scale / 2) * 2));
  return { ra, dec, n, scale };
}

interface WaveTable { nx: number; ny: number; x: number[]; y: number[]; w: number[]; bw: number[] }

function bracket(axis: number[], v: number): [number, number] {
  let i = 0;
  while (i < axis.length - 2 && v > axis[i + 1]) i++;
  const span = axis[i + 1] - axis[i];
  const t = span === 0 ? 0 : Math.min(1, Math.max(0, (v - axis[i]) / span));
  return [i, t];
}

/** Central wavelength and bandwidth (microns) at a 0-based detector pixel. */
export function wavelengthAt(det: number, x: number, y: number): [number, number] {
  const t = (waveTables as unknown as Record<string, WaveTable>)[String(det)];
  if (!t) return [NaN, NaN];
  const [ix, tx] = bracket(t.x, x + 1);
  const [iy, ty] = bracket(t.y, y + 1);
  const at = (arr: number[], i: number, j: number) => arr[i + t.nx * j];
  const lerp2 = (arr: number[]) =>
    (1 - ty) * ((1 - tx) * at(arr, ix, iy) + tx * at(arr, ix + 1, iy)) +
    ty * ((1 - tx) * at(arr, ix, iy + 1) + tx * at(arr, ix + 1, iy + 1));
  return [lerp2(t.w), lerp2(t.bw)];
}

export function median(values: Float32Array | number[], count = values.length): number {
  if (count === 0) return NaN;
  const a = Float32Array.from(values.slice(0, count)).sort();
  const m = count >> 1;
  return count % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Median and robust sigma (1.4826 x MAD) of the finite values. */
export function robustStats(data: Float32Array): { med: number; sigma: number } {
  const tmp = new Float32Array(data.length);
  let c = 0;
  for (let i = 0; i < data.length; i++) if (Number.isFinite(data[i])) tmp[c++] = data[i];
  if (c === 0) return { med: NaN, sigma: NaN };
  const med = median(tmp, c);
  for (let i = 0; i < c; i++) tmp[i] = Math.abs(tmp[i] - med);
  return { med, sigma: 1.4826 * median(tmp, c) };
}

/**
 * Fetch one exposure and resample it onto the output grid.
 * Returns null when the requested position is off the detector.
 */
export async function loadFrame(rec: ImageRecord, grid: Grid, signal?: AbortSignal): Promise<Frame | null> {
  const img = await openImage(rec.key, signal);
  const wcs = makeWcs(img.header);
  const half = (grid.n * grid.scale) / 2 / 3600; // degrees
  const cosd = Math.cos((grid.dec * Math.PI) / 180);
  const c = skyToPix(wcs, grid.ra, grid.dec);
  if (c[0] < -1 || c[0] > NAXIS || c[1] < -1 || c[1] > NAXIS) return null;
  // Local affine map from tangent-plane offsets (degrees east, north) to detector pixels.
  // SIP distortion across a field this small is far below a pixel.
  const e = skyToPix(wcs, grid.ra + half / cosd, grid.dec);
  const nn = skyToPix(wcs, grid.ra, grid.dec + half);
  const ex = (e[0] - c[0]) / half, ey = (e[1] - c[1]) / half;
  const nx = (nn[0] - c[0]) / half, ny = (nn[1] - c[1]) / half;

  let yMin = Infinity, yMax = -Infinity;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const y = c[1] + sx * half * ey + sy * half * ny;
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  const strip = await readStrip(img, yMin - 2, yMax + 2, signal);
  if (!strip) return null;

  const n = grid.n;
  const s = grid.scale / 3600;
  const data = new Float32Array(n * n);
  let covered = 0;
  for (let j = 0; j < n; j++) {
    const eta = -(j - (n - 1) / 2) * s; // row 0 is north
    for (let i = 0; i < n; i++) {
      const xi = -(i - (n - 1) / 2) * s; // column 0 is east
      const px = c[0] + xi * ex + eta * nx;
      const py = c[1] + xi * ey + eta * ny;
      const x0 = Math.floor(px), y0 = Math.floor(py);
      const fx = px - x0, fy = py - y0;
      const v00 = stripPixel(strip, x0, y0), v10 = stripPixel(strip, x0 + 1, y0);
      const v01 = stripPixel(strip, x0, y0 + 1), v11 = stripPixel(strip, x0 + 1, y0 + 1);
      const v = (1 - fy) * ((1 - fx) * v00 + fx * v10) + fy * ((1 - fx) * v01 + fx * v11);
      data[j * n + i] = v;
      if (Number.isFinite(v)) covered++;
    }
  }
  const { med, sigma } = robustStats(data);
  if (Number.isFinite(med)) for (let i = 0; i < data.length; i++) data[i] -= med;
  const [wave, bandwidth] = wavelengthAt(rec.det, c[0], c[1]);
  const h = img.header;
  return {
    rec,
    mjd: typeof h['MJD-AVG'] === 'number' ? (h['MJD-AVG'] as number) : rec.mjd,
    data,
    background: med,
    sigma,
    wave,
    bandwidth,
    pixel: c,
    psfFwhm: typeof h.PSF_FWHM === 'number' ? (h.PSF_FWHM as number) : NaN,
    exposure: typeof h.XPOSURE === 'number' ? (h.XPOSURE as number) : NaN,
    coverage: covered / (n * n),
  };
}

/** Run tasks with limited concurrency, reporting each result as it lands. */
export async function pool<T, R>(
  items: T[], limit: number, work: (item: T) => Promise<R>, onDone?: (r: R | null, item: T, err?: unknown) => void,
): Promise<void> {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        const r = await work(item);
        onDone?.(r, item);
      } catch (err) {
        onDone?.(null, item, err);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

const PASS_GAP_DAYS = 60; // visits within one survey pass can be weeks apart; passes are about six months apart
// Near the ecliptic poles coverage is continuous, so a pass is also closed after this long.
const PASS_MAX_DAYS = 45;
const BURST_GAP_DAYS = 0.02; // about half an hour

/** Per-pixel median (three or more frames) or mean, ignoring pixels with no data. */
export function combine(frames: Frame[]): Float32Array {
  const len = frames[0].data.length;
  const out = new Float32Array(len);
  if (frames.length === 1) return frames[0].data;
  const buf = new Float32Array(frames.length);
  for (let p = 0; p < len; p++) {
    let c = 0;
    for (const f of frames) {
      const v = f.data[p];
      if (Number.isFinite(v)) buf[c++] = v;
    }
    if (c === 0) out[p] = NaN;
    else if (c < 3) out[p] = c === 1 ? buf[0] : (buf[0] + buf[1]) / 2;
    else out[p] = median(buf, c);
  }
  return out;
}

/** Group frames of one detector into the epochs that get blinked. */
export function buildEpochs(frames: Frame[], mode: Mode): Epoch[] {
  const sorted = [...frames].sort((a, b) => a.mjd - b.mjd);
  const groups: Frame[][] = [];
  const gap = mode === 'pass' ? PASS_GAP_DAYS : mode === 'burst' ? BURST_GAP_DAYS : 0;
  for (const f of sorted) {
    const last = groups[groups.length - 1];
    const open = last && f.mjd - last[last.length - 1].mjd <= gap &&
      (mode !== 'pass' || f.mjd - last[0].mjd <= PASS_MAX_DAYS);
    if (mode !== 'single' && open) last.push(f);
    else groups.push([f]);
  }
  return groups.map((g) => {
    const waves = g.map((f) => f.wave).filter(Number.isFinite);
    return {
      key: `${mode}:${g[0].rec.id}:${g.length}`,
      mode,
      mjd: g.reduce((s, f) => s + f.mjd, 0) / g.length,
      mjdMin: g[0].mjd,
      mjdMax: g[g.length - 1].mjd,
      data: combine(g),
      frames: g,
      waveMin: Math.min(...waves),
      waveMax: Math.max(...waves),
    };
  });
}

/** Percentile of finite values across several images (used for display limits). */
export function percentiles(images: Float32Array[], ps: number[]): number[] {
  let total = 0;
  for (const im of images) total += im.length;
  const step = Math.max(1, Math.floor(total / 200000));
  const sample: number[] = [];
  for (const im of images) for (let i = 0; i < im.length; i += step) if (Number.isFinite(im[i])) sample.push(im[i]);
  if (!sample.length) return ps.map(() => NaN);
  const a = Float32Array.from(sample).sort();
  return ps.map((p) => a[Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))))]);
}

/**
 * Aperture photometry on an output image at pixel (cx, cy).
 * Returns flux density in millijansky and its scatter-based uncertainty.
 */
export function aperture(data: Float32Array, grid: Grid, cx: number, cy: number): { flux: number; err: number } {
  const n = grid.n;
  const rAp = (2 * NATIVE_SCALE) / grid.scale; // 2 detector pixels
  const rIn = (4 * NATIVE_SCALE) / grid.scale;
  const rOut = (7 * NATIVE_SCALE) / grid.scale;
  const sky: number[] = [];
  let sum = 0, count = 0, bad = 0;
  const lo = (v: number) => Math.max(0, Math.floor(v)), hi = (v: number) => Math.min(n - 1, Math.ceil(v));
  for (let j = lo(cy - rOut); j <= hi(cy + rOut); j++) {
    for (let i = lo(cx - rOut); i <= hi(cx + rOut); i++) {
      const r = Math.hypot(i - cx, j - cy);
      const v = data[j * n + i];
      if (r <= rAp) {
        if (Number.isFinite(v)) { sum += v; count++; } else bad++;
      } else if (r >= rIn && r <= rOut && Number.isFinite(v)) sky.push(v);
    }
  }
  if (count === 0 || bad > count * 0.2 || sky.length < 8) return { flux: NaN, err: NaN };
  const skyArr = Float32Array.from(sky);
  const { med, sigma } = robustStats(skyArr);
  const srPerPixel = (grid.scale * 4.84813681e-6) ** 2;
  const toMjy = 1e6 * srPerPixel * 1e3; // MJy/sr per pixel -> mJy
  return { flux: (sum - med * count) * toMjy, err: sigma * Math.sqrt(count) * toMjy * (NATIVE_SCALE / grid.scale) };
}

/** Parse the CSV returned by IRSA's SIA2 service into image records. */
export function parseSia(csv: string): ImageRecord[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(',');
  const col = (name: string) => head.indexOf(name);
  const iBand = col('energy_bandpassname'), iId = col('obs_id'), iUrl = col('access_url');
  const iRel = col('obs_collection'), iT0 = col('t_min'), iT1 = col('t_max');
  const out: ImageRecord[] = [];
  for (const line of lines.slice(1)) {
    // Columns before cloud_access hold no commas; the JSON in cloud_access does, so it is ignored.
    const f = line.split(',');
    const url = f[iUrl] ?? '';
    const key = url.replace(/^https?:\/\/irsa\.ipac\.caltech\.edu\/ibe\/data\/spherex\//, '');
    const det = Number((f[iBand] ?? '').replace('SPHEREx-D', ''));
    const t0 = Number(f[iT0]), t1 = Number(f[iT1]);
    if (!key || key === url || !(det >= 1 && det <= 6) || !Number.isFinite(t0)) continue;
    out.push({ id: `${f[iId]}/D${det}`, det, mjd: (t0 + (Number.isFinite(t1) ? t1 : t0)) / 2, key, rel: f[iRel] ?? '' });
  }
  return out.sort((a, b) => a.mjd - b.mjd);
}

export interface Limits { lo: number; hi: number; soft: number; sigma: number }

/**
 * Display limits from the noise, not from the brightest star: black point a little below the
 * sky, white point well into the sources, with an asinh knee a few sigma up.
 */
export function displayLimits(images: Float32Array[]): Limits {
  let total = 0;
  for (const im of images) total += im.length;
  const step = Math.max(1, Math.floor(total / 200000));
  const sample: number[] = [];
  for (const im of images) for (let i = 0; i < im.length; i += step) if (Number.isFinite(im[i])) sample.push(im[i]);
  if (!sample.length) return { lo: 0, hi: 1, soft: 0.1, sigma: 0.1 };
  const arr = Float32Array.from(sample);
  const { med, sigma: raw } = robustStats(arr);
  const sigma = raw > 0 ? raw : 1e-3;
  const sorted = arr.sort();
  const p = sorted[Math.round(0.997 * (sorted.length - 1))];
  return { lo: med - 1.5 * sigma, hi: Math.max(med + 25 * sigma, p), soft: 3 * sigma, sigma };
}

/** Map a pixel value to 0..1 with an asinh stretch. */
export function stretch(v: number, l: Limits): number {
  const t = Math.asinh(Math.max(0, v - l.lo) / l.soft) / Math.asinh((l.hi - l.lo) / l.soft);
  return t > 1 ? 1 : t;
}

/** Keep at most `max` records, spread evenly in time (deep fields have thousands). */
export function thin<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(items[Math.floor((i * items.length) / max)]);
  return out;
}

/**
 * Detectors used for colour plates, as blue, green, red: short, middle and long wavelength.
 * A cold object such as a brown dwarf is faint in the first and bright in the last, so it comes
 * out red; ordinary stars come out white to blue.
 */
export const COLOUR_DETS = [2, 4, 6] as const;

/**
 * Colour plates: frames from three detectors grouped into survey passes, each pass stacked per
 * detector. The detectors see a position at slightly different times, so anything that moves
 * within a pass shows as separated coloured dots.
 */
export function buildColourEpochs(frames: Frame[], dets: readonly number[] = COLOUR_DETS): Epoch[] {
  // Passes are found from all frames together, so the three channels share the same epochs.
  const sorted = [...frames].sort((a, b) => a.mjd - b.mjd);
  const groups: Frame[][] = [];
  for (const f of sorted) {
    const last = groups[groups.length - 1];
    if (last && f.mjd - last[last.length - 1].mjd <= PASS_GAP_DAYS && f.mjd - last[0].mjd <= PASS_MAX_DAYS) last.push(f);
    else groups.push([f]);
  }
  return groups.map((g) => {
    const rgb = dets.map((d) => {
      const mine = g.filter((f) => f.rec.det === d);
      return mine.length ? combine(mine) : null;
    });
    const waves = g.map((f) => f.wave).filter(Number.isFinite);
    return {
      key: `rgb:${g[0].rec.id}:${g.length}`,
      mode: 'pass' as Mode,
      mjd: g.reduce((sum, f) => sum + f.mjd, 0) / g.length,
      mjdMin: g[0].mjd,
      mjdMax: g[g.length - 1].mjd,
      data: rgb[2] ?? rgb[1] ?? rgb[0] ?? g[0].data,
      frames: g,
      waveMin: Math.min(...waves),
      waveMax: Math.max(...waves),
      rgb,
      missing: dets.filter((_, i) => !rgb[i]),
    };
  }).filter((e) => e.rgb.filter(Boolean).length >= 2); // a colour plate needs at least two channels
}

/** Shift an n*n image by (dx, dy) output pixels with bilinear resampling. Uncovered pixels are NaN. */
export function shiftImage(data: Float32Array, n: number, dx: number, dy: number): Float32Array {
  const out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const sy = j - dy, y0 = Math.floor(sy), fy = sy - y0;
    for (let i = 0; i < n; i++) {
      const sx = i - dx, x0 = Math.floor(sx), fx = sx - x0;
      if (x0 < 0 || y0 < 0 || x0 + 1 >= n || y0 + 1 >= n) { out[j * n + i] = NaN; continue; }
      const a = data[y0 * n + x0], b = data[y0 * n + x0 + 1], c = data[(y0 + 1) * n + x0], d = data[(y0 + 1) * n + x0 + 1];
      out[j * n + i] = (1 - fy) * ((1 - fx) * a + fx * b) + fy * ((1 - fx) * c + fx * d);
    }
  }
  return out;
}

function stackEpoch(frames: Frame[], images: Float32Array[], key: string): Epoch {
  const sorted = [...frames].sort((a, b) => a.mjd - b.mjd);
  const waves = sorted.map((f) => f.wave).filter(Number.isFinite);
  const len = images[0].length;
  const data = new Float32Array(len);
  const buf = new Float32Array(images.length);
  for (let p = 0; p < len; p++) {
    let c = 0;
    for (const im of images) { const v = im[p]; if (Number.isFinite(v)) buf[c++] = v; }
    data[p] = c === 0 ? NaN : c < 3 ? (c === 1 ? buf[0] : (buf[0] + buf[1]) / 2) : median(buf, c);
  }
  return {
    key, mode: 'pass', mjd: sorted.reduce((s, f) => s + f.mjd, 0) / sorted.length,
    mjdMin: sorted[0].mjd, mjdMax: sorted[sorted.length - 1].mjd,
    data, frames: sorted, waveMin: Math.min(...waves), waveMax: Math.max(...waves),
  };
}

/** Add everything together: one deep plate from every exposure. Fixed stars sharpen; movers smear or vanish. */
export function sumAll(frames: Frame[]): Epoch {
  return stackEpoch(frames, frames.map((f) => f.data), `sum:${frames.length}`);
}

/**
 * Shift-and-add: slide each exposure back along a trial proper motion before stacking, so an
 * object moving at that rate lands on the same pixel every time and adds up, while the fixed
 * stars smear. pmRa (already times cos dec) and pmDec are in arcseconds per year.
 */
export function shiftAdd(frames: Frame[], grid: Grid, pmRa: number, pmDec: number): Epoch {
  const ref = frames.reduce((s, f) => s + f.mjd, 0) / frames.length;
  const images = frames.map((f) => {
    const years = (f.mjd - ref) / 365.25;
    // East is left, north is up: motion east moves a source to smaller x, north to smaller y.
    const moved = { x: (-pmRa * years) / grid.scale, y: (-pmDec * years) / grid.scale };
    return shiftImage(f.data, grid.n, -moved.x, -moved.y);
  });
  return stackEpoch(frames, images, `shift:${pmRa}:${pmDec}:${frames.length}`);
}

/**
 * Brightness of a star whose core has overflowed the detector, measured from its halo: the
 * light in a ring 3 to 6 detector pixels out, minus the sky further out. The halo is a fixed
 * fraction of the star's light, so this follows changes in brightness, but it is a relative
 * measure and not a calibrated flux. Returned in the same units as aperture() for plotting.
 */
export function haloFlux(data: Float32Array, grid: Grid, cx: number, cy: number): number {
  const n = grid.n;
  const px = NATIVE_SCALE / grid.scale;
  const half = Math.min(cx, cy, n - 1 - cx, n - 1 - cy);
  const r1 = 3 * px, r2 = 6 * px;
  const s1 = Math.min(9 * px, half * 0.8), s2 = Math.min(11.5 * px, half * 0.98);
  if (s1 <= r2 || s2 - s1 < 1) return NaN;
  const sky: number[] = [];
  let sum = 0, count = 0;
  for (let j = Math.max(0, Math.floor(cy - s2)); j <= Math.min(n - 1, Math.ceil(cy + s2)); j++) {
    for (let i = Math.max(0, Math.floor(cx - s2)); i <= Math.min(n - 1, Math.ceil(cx + s2)); i++) {
      const v = data[j * n + i];
      if (!Number.isFinite(v)) continue;
      const r = Math.hypot(i - cx, j - cy);
      if (r >= r1 && r <= r2) { sum += v; count++; } else if (r >= s1 && r <= s2) sky.push(v);
    }
  }
  if (count < 20 || sky.length < 20) return NaN;
  const srPerPixel = (grid.scale * 4.84813681e-6) ** 2;
  return (sum - median(sky) * count) * 1e9 * srPerPixel;
}
