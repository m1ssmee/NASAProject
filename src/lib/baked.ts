// Pre-rendered plates for the five test targets (written by scripts/bake.mts).
import type { Limits } from './frames';

export interface BakedMeta {
  slug: string; ra: number; dec: number; n: number; scale: number; det: number; limits: Limits; baked: string;
  epochs: { mjd: number; from: string; to: string; count: number; waveMin: number; waveMax: number }[];
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
