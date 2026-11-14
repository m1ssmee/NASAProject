// Minimal FITS access for SPHEREx level-2 spectral images in the public S3 bucket.
// Only the bytes that are needed are requested: the IMAGE header, then a strip of rows.

export const S3_BASE = 'https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/';
export const NAXIS = 2040; // SPHEREx detectors are 2040 x 2040 active pixels
const BLOCK = 2880;
const ROW_BYTES = NAXIS * 4;

export type Header = Record<string, number | string | boolean>;

/** Parse 80-character cards. Returns the header and the padded length, or end = -1 if END is missing. */
export function parseHeader(buf: Uint8Array, start = 0): { h: Header; length: number } {
  const h: Header = {};
  const dec = new TextDecoder('latin1');
  for (let i = start; i + 80 <= buf.length; i += 80) {
    const card = dec.decode(buf.subarray(i, i + 80));
    if (card.startsWith('END ')) {
      return { h, length: Math.ceil((i + 80 - start) / BLOCK) * BLOCK };
    }
    const m = card.match(/^HIERARCH (.+?)\s*=\s*(.*)$/) || card.match(/^([A-Z0-9_-]{1,8})\s*=\s*(.*)$/);
    if (!m) continue;
    const raw = m[2];
    const str = raw.match(/^'((?:[^']|'')*)'/);
    let v: number | string | boolean;
    if (str) v = str[1].trim();
    else {
      const t = raw.split('/')[0].trim();
      if (t === 'T') v = true;
      else if (t === 'F') v = false;
      else if (t !== '' && !Number.isNaN(Number(t))) v = Number(t);
      else v = t;
    }
    h[m[1].trim()] = v;
  }
  return { h, length: -1 };
}

async function range(url: string, from: number, to: number, signal?: AbortSignal): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, signal });
      if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
      await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export interface OpenImage {
  url: string;
  header: Header;
  /** Byte offset of the first IMAGE pixel. */
  dataOffset: number;
}

/** Read the primary and IMAGE headers (about 26 kB) and locate the pixel data. */
export async function openImage(key: string, signal?: AbortSignal): Promise<OpenImage> {
  const url = S3_BASE + key;
  let buf = await range(url, 0, BLOCK * 12 - 1, signal);
  const primary = parseHeader(buf, 0);
  if (primary.length < 0) throw new Error('primary header not found');
  let img = parseHeader(buf, primary.length);
  for (let tries = 0; img.length < 0 && tries < 4; tries++) {
    const more = await range(url, buf.length, buf.length + BLOCK * 8 - 1, signal);
    const joined = new Uint8Array(buf.length + more.length);
    joined.set(buf);
    joined.set(more, buf.length);
    buf = joined;
    img = parseHeader(buf, primary.length);
  }
  if (img.length < 0) throw new Error('IMAGE header not found');
  if (img.h.NAXIS1 !== NAXIS || img.h.NAXIS2 !== NAXIS || img.h.BITPIX !== -32) {
    throw new Error('unexpected IMAGE shape');
  }
  return { url, header: img.h, dataOffset: primary.length + img.length };
}

export interface Strip {
  /** First row held (0-based). */
  y0: number;
  rows: number;
  view: DataView;
}

/** Read rows y0..y1 inclusive (0-based, clamped) of the IMAGE extension. */
export async function readStrip(img: OpenImage, y0: number, y1: number, signal?: AbortSignal): Promise<Strip | null> {
  const a = Math.max(0, Math.floor(y0));
  const b = Math.min(NAXIS - 1, Math.ceil(y1));
  if (b < a) return null;
  const from = img.dataOffset + a * ROW_BYTES;
  const to = img.dataOffset + (b + 1) * ROW_BYTES - 1;
  const bytes = await range(img.url, from, to, signal);
  return { y0: a, rows: b - a + 1, view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) };
}

/** Pixel value at 0-based (x, y); NaN outside the strip or the detector. FITS floats are big-endian. */
export function stripPixel(s: Strip, x: number, y: number): number {
  const r = y - s.y0;
  if (x < 0 || x >= NAXIS || r < 0 || r >= s.rows) return NaN;
  return s.view.getFloat32((r * NAXIS + x) * 4, false);
}
