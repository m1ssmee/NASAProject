// Paint a frame of floats onto a canvas as a photographic plate.
import { stretch, type Limits } from './frames';

export interface Tone { ground: [number, number, number]; ink: [number, number, number] }

export const NEGATIVE: Tone = { ground: [231, 233, 230], ink: [16, 18, 20] };
export const POSITIVE: Tone = { ground: [16, 18, 20], ink: [231, 233, 230] };

/** Draw n*n values. `diff` renders a signed image around mid grey (linear, +/- 12 sigma). */
export function paint(
  canvas: HTMLCanvasElement, data: Float32Array, n: number, limits: Limits, tone: Tone, diff = false, gain = 1,
) {
  if (canvas.width !== n) { canvas.width = n; canvas.height = n; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(n, n);
  const px = img.data;
  const { ground: g, ink: k } = tone;
  const l = gain === 1 ? limits : { ...limits, hi: limits.lo + (limits.hi - limits.lo) / gain };
  const span = (12 * limits.sigma) / gain;
  for (let i = 0; i < n * n; i++) {
    const v = data[i];
    let t: number;
    if (!Number.isFinite(v)) t = 0.42; // no data: saturated core or masked pixel
    else if (diff) t = Math.min(1, Math.max(0, 0.5 + (0.5 * v) / span));
    else t = stretch(v, l);
    const o = i * 4;
    px[o] = g[0] + (k[0] - g[0]) * t;
    px[o + 1] = g[1] + (k[1] - g[1]) * t;
    px[o + 2] = g[2] + (k[2] - g[2]) * t;
    px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function subtract(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i];
  return out;
}

/**
 * Paint three stacked images as one colour plate: channels[0] blue, [1] green, [2] red, each
 * stretched against its own limits so the sky is neutral. Colour plates are always light on
 * dark, the way NASA's composites are.
 */
/** The RGBA bytes of a colour plate (see paintRgb). Pure, so the bake script can use it too. */
export function rgbaFromChannels(channels: (Float32Array | null)[], n: number, limits: (Limits | null)[], gain = 1): Uint8ClampedArray {
  const px = new Uint8ClampedArray(n * n * 4);
  const ls = limits.map((l) => (l && gain !== 1 ? { ...l, hi: l.lo + (l.hi - l.lo) / gain } : l));
  const [b, g, r] = channels;
  const level = (c: Float32Array | null, l: Limits | null, i: number) => {
    if (!c || !l) return 0;
    const v = c[i];
    return Number.isFinite(v) ? stretch(v, l) : -1;
  };
  for (let i = 0; i < n * n; i++) {
    let R = level(r, ls[2], i), G = level(g, ls[1], i), B = level(b, ls[0], i);
    // A detector with no exposures in this pass: stand in the average of the other two, so the
    // plate stays neutral instead of taking on a colour cast. The viewer says which one is missing.
    if (!r) R = (Math.max(0, G) + Math.max(0, B)) / 2;
    if (!g) G = (Math.max(0, R) + Math.max(0, B)) / 2;
    if (!b) B = (Math.max(0, R) + Math.max(0, G)) / 2;
    const o = i * 4;
    // No data in any one channel (usually a star that overflowed that detector): grey, as on the
    // single-detector plates. Showing the surviving channels alone would invent a vivid colour.
    if (R < 0 || G < 0 || B < 0) { px[o] = 58; px[o + 1] = 60; px[o + 2] = 64; }
    else {
      px[o] = 16 + 239 * Math.max(0, R);
      px[o + 1] = 18 + 237 * Math.max(0, G);
      px[o + 2] = 20 + 235 * Math.max(0, B);
    }
    px[o + 3] = 255;
  }
  return px;
}

export function paintRgb(
  canvas: HTMLCanvasElement, channels: (Float32Array | null)[], n: number, limits: (Limits | null)[], gain = 1,
) {
  if (canvas.width !== n) { canvas.width = n; canvas.height = n; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(n, n);
  img.data.set(rgbaFromChannels(channels, n, limits, gain));
  ctx.putImageData(img, 0, 0);
}
