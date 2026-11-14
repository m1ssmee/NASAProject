// Contamination flags. Each SPHEREx image carries a FLAGS layer: one 32-bit word per pixel,
// stored Rice-compressed one detector row at a time. That layout lets a single row be read with
// two small range requests, so the flags at one position can be checked without the 12 MB layer.
import { NAXIS, parseHeader, type OpenImage } from './fits';

/** Bit number, name and meaning, from the IRSA SPHEREx tutorial (level-2 spectral image flags). */
export const FLAG_BITS: { bit: number; name: string; meaning: string; bad: boolean }[] = [
  { bit: 0, name: 'TRANSIENT', meaning: 'A cosmic ray or other transient hit during the exposure', bad: true },
  { bit: 1, name: 'OVERFLOW', meaning: 'The pixel overflowed during the exposure', bad: true },
  { bit: 2, name: 'SUR_ERROR', meaning: 'Error in onboard processing', bad: true },
  { bit: 6, name: 'NONFUNC', meaning: 'Permanently unusable pixel', bad: true },
  { bit: 7, name: 'DICHROIC', meaning: 'Low efficiency near the dichroic edge', bad: true },
  { bit: 9, name: 'MISSING_DATA', meaning: 'Onboard data lost', bad: true },
  { bit: 10, name: 'HOT', meaning: 'Hot pixel', bad: true },
  { bit: 11, name: 'COLD', meaning: 'Anomalously low signal', bad: true },
  { bit: 12, name: 'FULLSAMPLE', meaning: 'Full sample history is available (not a problem)', bad: false },
  { bit: 14, name: 'PHANMISS', meaning: 'Phantom correction was not applied', bad: true },
  { bit: 15, name: 'NONLINEAR', meaning: 'Nonlinearity correction is unreliable', bad: true },
  { bit: 17, name: 'PERSIST', meaning: 'Leftover charge from an earlier bright source', bad: true },
  { bit: 19, name: 'OUTLIER', meaning: 'Flagged as an outlier against other exposures', bad: false },
  { bit: 20, name: 'CROSSTALK', meaning: 'Affected by crosstalk', bad: true },
  { bit: 21, name: 'SOURCE', meaning: 'On a known catalogued source (expected for stars)', bad: false },
  { bit: 22, name: 'GHOST', meaning: 'Ghost of a bright source in the same exposure', bad: true },
  { bit: 23, name: 'GHOST_FPA', meaning: 'Ghost of a bright source on another detector', bad: true },
  { bit: 24, name: 'GHOST_EXT', meaning: 'Ghost of a bright source outside the field', bad: true },
  { bit: 25, name: 'STREAK', meaning: 'On a streak, such as a satellite trail', bad: true },
  { bit: 26, name: 'BLOOM', meaning: 'Part of a bloom from a saturated star', bad: true },
  { bit: 27, name: 'SNOWBALL', meaning: 'Part of a snowball artifact', bad: true },
  { bit: 28, name: 'HALO', meaning: 'In the halo of a transient', bad: true },
];

/**
 * Rice decompression of one tile of 32-bit integers (FITS tiled-image RICE_1, BYTEPIX 4).
 * The stream starts with the first pixel as a big-endian word; each block of `blockSize` pixels
 * then stores differences with a 5-bit split parameter.
 */
export function riceDecode32(bytes: Uint8Array, count: number, blockSize = 32): Int32Array {
  const out = new Int32Array(count);
  const FS_BITS = 5, FS_MAX = 25, B_BITS = 32;
  let last = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) | 0;
  let pos = 4;
  let b = 0, nbits = 0; // bit buffer, most significant bit first
  const need = (n: number) => { while (nbits < n) { b = b * 256 + (bytes[pos++] ?? 0); nbits += 8; } };
  const take = (n: number) => {
    let v = 0;
    // Up to 32 bits: read in two halves to stay inside exact double arithmetic.
    for (const part of n > 16 ? [n - 16, 16] : [n]) {
      need(part);
      const shift = 2 ** (nbits - part);
      const chunk = Math.floor(b / shift);
      b -= chunk * shift;
      nbits -= part;
      v = v * 2 ** part + chunk;
    }
    return v;
  };
  for (let i = 0; i < count;) {
    const fs = take(FS_BITS) - 1;
    const end = Math.min(i + blockSize, count);
    if (fs < 0) {
      for (; i < end; i++) out[i] = last;
    } else if (fs === FS_MAX) {
      for (; i < end; i++) {
        let diff = take(B_BITS);
        diff = diff % 2 === 0 ? diff / 2 : -(diff + 1) / 2;
        last = (diff + last) | 0;
        out[i] = last;
      }
    } else {
      for (; i < end; i++) {
        let zeros = 0;
        while (take(1) === 0) { if (++zeros > 1 << 26) throw new Error('corrupt Rice stream'); }
        let diff = zeros * 2 ** fs + (fs ? take(fs) : 0);
        diff = diff % 2 === 0 ? diff / 2 : -(diff + 1) / 2;
        last = (diff + last) | 0;
        out[i] = last;
      }
    }
  }
  return out;
}

async function range(url: string, from: number, to: number, signal?: AbortSignal): Promise<Uint8Array> {
  const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, signal });
  if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** The flag word at a 0-based detector pixel of one image, or null if it cannot be read. */
export async function readFlagWord(img: OpenImage, x: number, y: number, signal?: AbortSignal): Promise<number | null> {
  const px = Math.round(x), py = Math.round(y);
  if (px < 0 || py < 0 || px >= NAXIS || py >= NAXIS) return null;
  const start = img.dataOffset + NAXIS * NAXIS * 4; // FLAGS follows the IMAGE pixels
  const head = await range(img.url, start, start + 2880 * 14 - 1, signal);
  const { h, length } = parseHeader(head, 0);
  if (length < 0 || h.ZCMPTYPE !== 'RICE_1' || h.ZTILE2 !== 1 || h.NAXIS1 !== 8) return null;
  const rows = Number(h.NAXIS2);
  const at = length + py * 8;
  const desc = at + 8 <= head.length ? head.subarray(at, at + 8) : await range(img.url, start + at, start + at + 7, signal);
  const dv = new DataView(desc.buffer, desc.byteOffset, 8);
  const size = dv.getInt32(0), offset = dv.getInt32(4);
  if (size <= 4) return null;
  const heap = start + length + rows * 8;
  const row = await range(img.url, heap + offset, heap + offset + size - 1, signal);
  return riceDecode32(row, Number(h.ZNAXIS1 ?? NAXIS), Number(h.ZVAL1 ?? 32))[px];
}

/** Names of the flags set in a word. */
export const flagNames = (word: number) => FLAG_BITS.filter((f) => (word >>> f.bit) & 1).map((f) => f.name);
