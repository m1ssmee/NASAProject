import { describe, expect, it } from 'vitest';
import { flagNames, riceDecode32 } from '../src/lib/flags';
import { shiftAdd, shiftImage, sumAll, type Frame, type Grid } from '../src/lib/frames';
import { encodeGif } from '../src/lib/gif';

/** A plain Rice encoder (fixed split per block), the inverse of riceDecode32, for the round trip. */
function riceEncode32(values: number[], blockSize = 32): Uint8Array {
  const bits: number[] = [];
  const put = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push(Math.floor(v / 2 ** i) % 2); };
  put(values[0] >>> 0, 32);
  let last = values[0];
  for (let i = 0; i < values.length; i += blockSize) {
    const diffs = values.slice(i, i + blockSize).map((v) => { const d = v - last; last = v; return d >= 0 ? d * 2 : -d * 2 - 1; });
    if (diffs.every((d) => d === 0)) { put(0, 5); continue; }
    const max = Math.max(...diffs);
    if (max >= 2 ** 20) { put(26, 5); diffs.forEach((d) => put(d, 32)); continue; }
    const fs = Math.max(0, Math.floor(Math.log2(max + 1)) - 1);
    put(fs + 1, 5);
    for (const d of diffs) {
      const top = Math.floor(d / 2 ** fs);
      for (let z = 0; z < top; z++) bits.push(0);
      bits.push(1);
      put(d % 2 ** fs, fs);
    }
  }
  while (bits.length % 8) bits.push(0);
  const out = new Uint8Array(bits.length / 8);
  for (let i = 0; i < out.length; i++) for (let b = 0; b < 8; b++) out[i] = out[i] * 2 + bits[i * 8 + b];
  return out;
}

describe('flag layer', () => {
  it('round-trips Rice-compressed 32-bit words, including constant and wide blocks', () => {
    const row: number[] = [];
    for (let i = 0; i < 300; i++) {
      if (i < 64) row.push(1 << 21);                      // a run of SOURCE: all-zero differences
      else if (i < 128) row.push(i % 7 === 0 ? (1 << 21) | 1 : 0); // small values
      else if (i < 160) row.push(i % 2 ? (1 << 28) | (1 << 17) : 0); // big jumps: escape blocks
      else row.push((i * 2654435761) % (1 << 12));
    }
    expect(Array.from(riceDecode32(riceEncode32(row), row.length))).toEqual(row);
  });
  it('names the flags set in a word', () => {
    expect(flagNames((1 << 21) | (1 << 0))).toEqual(['TRANSIENT', 'SOURCE']);
    expect(flagNames(0)).toEqual([]);
  });
});

describe('stacking', () => {
  const grid: Grid = { ra: 0, dec: 0, n: 9, scale: 3 };
  const frame = (mjd: number, x: number, y: number): Frame => {
    const data = new Float32Array(81);
    data[y * 9 + x] = 10;
    return { rec: { id: String(mjd), det: 1, mjd, key: '', rel: '' }, mjd, data, background: 0, sigma: 1, wave: 1, bandwidth: 0.02, pixel: [0, 0], psfFwhm: 7, exposure: 113, coverage: 1 };
  };
  it('shifts an image by whole and half pixels', () => {
    const a = frame(0, 4, 4).data;
    expect(shiftImage(a, 9, 2, -1)[3 * 9 + 6]).toBeCloseTo(10, 6);
    const half = shiftImage(a, 9, 0.5, 0);
    expect(half[4 * 9 + 4]).toBeCloseTo(5, 6);
    expect(half[4 * 9 + 5]).toBeCloseTo(5, 6);
  });
  it('piles a mover onto one pixel when the trial motion matches, and loses it when plates are simply added', () => {
    // A source moving east (left) one pixel = 3 arcsec per year, seen at years -1, 0, +1.
    const frames = [frame(-365.25, 5, 4), frame(0, 4, 4), frame(365.25, 3, 4)];
    const matched = shiftAdd(frames, grid, 3, 0).data;
    expect(matched[4 * 9 + 4]).toBeCloseTo(10, 4);
    const wrong = shiftAdd(frames, grid, -3, 0).data;
    expect(wrong[4 * 9 + 4]).toBeLessThan(10);
    const added = sumAll(frames).data;
    expect(added[4 * 9 + 4]).toBe(0); // the median of three plates rejects something seen at a spot only once
  });
});

describe('GIF export', () => {
  it('writes a valid looping GIF whose pixels decode back', () => {
    const w = 5, h = 4;
    const mk = (v: number) => { const a = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) a.set([(v + i * 9) % 256, (v + i * 9) % 256, (v + i * 9) % 256, 255], i * 4); return a; };
    const gif = encodeGif(w, h, [{ rgba: mk(10), delayMs: 700 }, { rgba: mk(200), delayMs: 700 }], false);
    const text = (a: number, b: number) => String.fromCharCode(...gif.slice(a, b));
    expect(text(0, 6)).toBe('GIF89a');
    expect(gif[6] | (gif[7] << 8)).toBe(w);
    expect(gif[8] | (gif[9] << 8)).toBe(h);
    expect(gif[gif.length - 1]).toBe(0x3b);
    expect(text(13 + 768 + 3, 13 + 768 + 14)).toBe('NETSCAPE2.0');
    // Decode the first frame's LZW data and compare with what went in.
    let p = 13 + 768 + 19; // header, palette, loop extension
    expect(gif[p]).toBe(0x21);
    expect(gif[p + 4] | (gif[p + 5] << 8)).toBe(70); // frame delay in hundredths of a second
    p += 8; // graphic control extension
    expect(gif[p]).toBe(0x2c); p += 10;
    const min = gif[p++];
    const data: number[] = [];
    while (gif[p]) { data.push(...gif.slice(p + 1, p + 1 + gif[p])); p += 1 + gif[p]; }
    const clear = 1 << min, eoi = clear + 1;
    let size = min + 1, next = eoi + 1, bits = 0, buf = 0, prev: number[] | null = null;
    let table: number[][] = Array.from({ length: clear }, (_, i) => [i]);
    const out: number[] = [];
    for (const byte of data) {
      buf |= byte << bits; bits += 8;
      while (bits >= size) {
        const code = buf & ((1 << size) - 1); buf >>>= size; bits -= size;
        if (code === clear) { table = Array.from({ length: clear }, (_, i) => [i]); size = min + 1; next = eoi + 1; prev = null; continue; }
        if (code === eoi) { bits = -1e9; break; }
        const entry: number[] = code < next && table[code] ? table[code] : [...prev!, prev![0]];
        out.push(...entry);
        if (prev) { table[next++] = [...prev, entry[0]]; if (next === (1 << size) && size < 12) size++; }
        prev = entry;
      }
    }
    expect(out.slice(0, w * h)).toEqual(Array.from({ length: w * h }, (_, i) => (10 + i * 9) % 256));
  });
});
