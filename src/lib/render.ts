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
