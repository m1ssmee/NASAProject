// Pre-rendered plates for the five test targets (written by scripts/bake.mts).
import type { Limits } from './frames';

export interface BakedMeta {
  slug: string; ra: number; dec: number; n: number; scale: number; det: number; limits: Limits; baked: string;
  epochs: { mjd: number; from: string; to: string; count: number; waveMin: number; waveMax: number }[];
  /** Colour version, when baked: the first and latest pass. */
  rgb?: { from: string; to: string; mjd: number; missing: number[] }[] | null;
}
export interface Baked { meta: BakedMeta; frames: Float32Array[] }

const cache = new Map<string, Promise<Baked>>();

export function loadBaked(slug: string): Promise<Baked> {
  let p = cache.get(slug);
  if (!p) {
    p = (async () => {
      const [meta, buf] = await Promise.all([
        fetch(`/plates/${slug}.json`).then((r) => r.json() as Promise<BakedMeta>),
        fetch(`/plates/${slug}.bin`).then((r) => r.arrayBuffer()),
      ]);
      const all = new Float32Array(buf);
      const size = meta.n * meta.n;
      return { meta, frames: meta.epochs.map((_, i) => all.subarray(i * size, (i + 1) * size)) };
    })();
    cache.set(slug, p);
  }
  return p;
}

/** Central crop of an n*n image to m*m. */
export function crop(data: Float32Array, n: number, m: number): Float32Array {
  if (m >= n) return data;
  const o = Math.floor((n - m) / 2);
  const out = new Float32Array(m * m);
  for (let j = 0; j < m; j++) out.set(data.subarray((j + o) * n + o, (j + o) * n + o + m), j * m);
  return out;
}

const rgbCache = new Map<string, Promise<Uint8Array>>();

/** The colour version of a baked plate: two n*n RGB images, first pass then latest. */
export function loadBakedRgb(slug: string): Promise<Uint8Array> {
  let p = rgbCache.get(slug);
  if (!p) {
    p = fetch(`/plates/${slug}-rgb.bin`).then((r) => { if (!r.ok) throw new Error('no colour plate'); return r.arrayBuffer(); }).then((b) => new Uint8Array(b));
    rgbCache.set(slug, p);
  }
  return p;
}
