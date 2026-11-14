// TAN-SIP world coordinates for SPHEREx images, plus the tangent-plane helpers
// used to build a north-up output grid.
import type { Header } from './fits';

const D2R = Math.PI / 180;

export interface Wcs {
  crpix: [number, number];
  crval: [number, number];
  pc: [number, number, number, number];
  pcInv: [number, number, number, number];
  a: number[][];
  b: number[][];
  ap: number[][] | null;
  bp: number[][] | null;
}

function sipMatrix(h: Header, prefix: string): number[][] | null {
  const order = h[`${prefix}_ORDER`];
  if (typeof order !== 'number') return null;
  const m: number[][] = [];
  for (let p = 0; p <= order; p++) {
    m[p] = [];
    for (let q = 0; q <= order - p; q++) {
      const v = h[`${prefix}_${p}_${q}`];
      m[p][q] = typeof v === 'number' ? v : 0;
    }
  }
  return m;
}

function poly(m: number[][], u: number, v: number): number {
  let s = 0;
  let up = 1;
  for (let p = 0; p < m.length; p++) {
    let vq = 1;
    for (let q = 0; q < m[p].length; q++) {
      if (m[p][q] !== 0) s += m[p][q] * up * vq;
      vq *= v;
    }
    up *= u;
  }
  return s;
}

const num = (h: Header, k: string, d = 0) => (typeof h[k] === 'number' ? (h[k] as number) : d);

export function makeWcs(h: Header): Wcs {
  const cd1 = num(h, 'CDELT1', 1);
  const cd2 = num(h, 'CDELT2', 1);
  const pc: [number, number, number, number] = [
    num(h, 'PC1_1', 1) * cd1, num(h, 'PC1_2') * cd1,
    num(h, 'PC2_1') * cd2, num(h, 'PC2_2', 1) * cd2,
  ];
  const det = pc[0] * pc[3] - pc[1] * pc[2];
  return {
    crpix: [num(h, 'CRPIX1'), num(h, 'CRPIX2')],
    crval: [num(h, 'CRVAL1'), num(h, 'CRVAL2')],
    pc,
    pcInv: [pc[3] / det, -pc[1] / det, -pc[2] / det, pc[0] / det],
    a: sipMatrix(h, 'A') ?? [[0]],
    b: sipMatrix(h, 'B') ?? [[0]],
    ap: sipMatrix(h, 'AP'),
    bp: sipMatrix(h, 'BP'),
  };
}

/** Gnomonic projection of (ra, dec) about (ra0, dec0): standard coordinates in degrees (xi east, eta north). */
export function project(ra: number, dec: number, ra0: number, dec0: number): [number, number] {
  const dra = (ra - ra0) * D2R;
  const sd = Math.sin(dec * D2R), cd = Math.cos(dec * D2R);
  const s0 = Math.sin(dec0 * D2R), c0 = Math.cos(dec0 * D2R);
  const cosc = s0 * sd + c0 * cd * Math.cos(dra);
  return [(cd * Math.sin(dra)) / cosc / D2R, (c0 * sd - s0 * cd * Math.cos(dra)) / cosc / D2R];
}

/** Inverse gnomonic projection. */
export function deproject(xi: number, eta: number, ra0: number, dec0: number): [number, number] {
  const x = xi * D2R, y = eta * D2R;
  const s0 = Math.sin(dec0 * D2R), c0 = Math.cos(dec0 * D2R);
  const ra = ra0 + Math.atan2(x, c0 - y * s0) / D2R;
  const dec = Math.atan2((s0 + y * c0) * Math.cos((ra - ra0) * D2R), c0 - y * s0) / D2R;
  return [((ra % 360) + 360) % 360, dec];
}

/** 0-based pixel to sky (degrees). */
export function pixToSky(w: Wcs, x: number, y: number): [number, number] {
  const u = x + 1 - w.crpix[0];
  const v = y + 1 - w.crpix[1];
  const U = u + poly(w.a, u, v);
  const V = v + poly(w.b, u, v);
  return deproject(w.pc[0] * U + w.pc[1] * V, w.pc[2] * U + w.pc[3] * V, w.crval[0], w.crval[1]);
}

/** Sky (degrees) to 0-based pixel. Uses the AP/BP polynomials, then refines against the forward transform. */
export function skyToPix(w: Wcs, ra: number, dec: number): [number, number] {
  const [xi, eta] = project(ra, dec, w.crval[0], w.crval[1]);
  const U = w.pcInv[0] * xi + w.pcInv[1] * eta;
  const V = w.pcInv[2] * xi + w.pcInv[3] * eta;
  let u = U, v = V;
  if (w.ap && w.bp) {
    u = U + poly(w.ap, U, V);
    v = V + poly(w.bp, U, V);
  }
  for (let i = 0; i < 4; i++) {
    const du = U - (u + poly(w.a, u, v));
    const dv = V - (v + poly(w.b, u, v));
    u += du;
    v += dv;
    if (Math.abs(du) + Math.abs(dv) < 1e-6) break;
  }
  return [u + w.crpix[0] - 1, v + w.crpix[1] - 1];
}
