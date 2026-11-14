// A small GIF89a encoder for exporting a blink: looping, one global palette, per-frame delay.

/** LZW-compress palette indices into GIF data sub-blocks. */
function lzw(indices: Uint8Array, minCode: number): Uint8Array {
  const out: number[] = [];
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1;
  let dict = new Map<number, number>();
  let buf = 0, bits = 0;
  const block: number[] = [];
  const flush = () => { if (block.length) { out.push(block.length, ...block); block.length = 0; } };
  const emit = (code: number) => {
    buf |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      block.push(buf & 255);
      if (block.length === 255) flush();
      buf >>>= 8;
      bits -= 8;
    }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dict = new Map();
      codeSize = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) { block.push(buf & 255); }
  flush();
  out.push(0);
  return Uint8Array.from(out);
}

export interface GifFrame { rgba: Uint8ClampedArray; delayMs: number }

/**
 * Encode frames of equal size. `colour` picks the palette: 256 greys through the plate's two
 * tones for single-detector plates, or a 6x7x6 colour cube for colour plates.
 */
export function encodeGif(width: number, height: number, frames: GifFrame[], colour: boolean): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  if (colour) {
    let p = 0;
    for (let r = 0; r < 6; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 6; b++) {
      palette[p++] = Math.round((r * 255) / 5);
      palette[p++] = Math.round((g * 255) / 6);
      palette[p++] = Math.round((b * 255) / 5);
    }
  } else {
    for (let i = 0; i < 256; i++) palette.fill(i, i * 3, i * 3 + 3);
  }
  const index = (r: number, g: number, b: number) => (colour
    ? Math.round((r * 5) / 255) * 42 + Math.round((g * 6) / 255) * 6 + Math.round((b * 5) / 255)
    : Math.round(r * 0.299 + g * 0.587 + b * 0.114));

  const parts: Uint8Array[] = [];
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  parts.push(Uint8Array.from([
    ...'GIF89a'.split('').map((c) => c.charCodeAt(0)), ...u16(width), ...u16(height), 0xf7, 0, 0,
  ]));
  parts.push(palette);
  parts.push(Uint8Array.from([0x21, 0xff, 11, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0])); // loop forever
  for (const f of frames) {
    const idx = new Uint8Array(width * height);
    for (let i = 0; i < idx.length; i++) idx[i] = index(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]);
    parts.push(Uint8Array.from([0x21, 0xf9, 4, 0, ...u16(Math.max(2, Math.round(f.delayMs / 10))), 0, 0]));
    parts.push(Uint8Array.from([0x2c, 0, 0, 0, 0, ...u16(width), ...u16(height), 0, 8]));
    parts.push(lzw(idx, 8));
  }
  parts.push(Uint8Array.from([0x3b]));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
