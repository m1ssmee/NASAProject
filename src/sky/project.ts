// Sky map projection: stereographic, seen from inside the celestial sphere.
// North is up and east is left, as on the plates. Pure maths, no DOM.

const D2R = Math.PI / 180;

export type Vec3 = [number, number, number];

export interface View {
  /** Centre of the view, degrees. */
  ra: number;
  dec: number;
  /** Field of view across the shorter side, degrees. */
  fov: number;
  width: number;
  height: number;
}

export const FOV_MIN = 12;
export const FOV_MAX = 100;

export function radecToVec(ra: number, dec: number): Vec3 {
  const a = ra * D2R, d = dec * D2R;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/** Rows: screen-right (which is west), north, and the view direction. */
export function basis(ra: number, dec: number): [Vec3, Vec3, Vec3] {
  const a = ra * D2R, d = dec * D2R;
  const east: Vec3 = [-Math.sin(a), Math.cos(a), 0];
  const north: Vec3 = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  return [[-east[0], -east[1], -east[2]], north, radecToVec(ra, dec)];
}

/** Pixels per unit of stereographic plane. */
export function scaleOf(v: View): number {
  return Math.min(v.width, v.height) / 2 / (2 * Math.tan((v.fov * D2R) / 4));
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Sky position to screen pixels (origin top-left). Null when it is behind the viewer. */
export function toScreen(v: View, ra: number, dec: number): { x: number; y: number } | null {
  const [right, north, front] = basis(v.ra, v.dec);
  const p = radecToVec(ra, dec);
  const z = dot(p, front);
  if (z < -0.2) return null;
  const k = (2 / (1 + z)) * scaleOf(v);
  return { x: v.width / 2 + dot(p, right) * k, y: v.height / 2 - dot(p, north) * k };
}

/** Screen pixels to sky position, degrees. */
export function toSky(v: View, x: number, y: number): { ra: number; dec: number } {
  const [right, north, front] = basis(v.ra, v.dec);
  const s = scaleOf(v);
  const X = (x - v.width / 2) / s, Y = -(y - v.height / 2) / s;
  const r2 = X * X + Y * Y;
  // Inverse stereographic projection onto the unit sphere.
  const z = (4 - r2) / (4 + r2);
  const f = 4 / (4 + r2);
  const p: Vec3 = [
    right[0] * X * f + north[0] * Y * f + front[0] * z,
    right[1] * X * f + north[1] * Y * f + front[1] * z,
    right[2] * X * f + north[2] * Y * f + front[2] * z,
  ];
  const ra = (Math.atan2(p[1], p[0]) / D2R + 360) % 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, p[2]))) / D2R };
}

/** Drag by (dx, dy) pixels: the sky follows the pointer. */
export function pan(v: View, dx: number, dy: number): { ra: number; dec: number } {
  const degPerPx = v.fov / Math.min(v.width, v.height);
  const dec = Math.max(-89.5, Math.min(89.5, v.dec + dy * degPerPx));
  const ra = v.ra + (dx * degPerPx) / Math.max(0.2, Math.cos(dec * D2R));
  return { ra: ((ra % 360) + 360) % 360, dec };
}

/** Angular separation in degrees. */
export function separation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  return Math.acos(Math.max(-1, Math.min(1, dot(radecToVec(ra1, dec1), radecToVec(ra2, dec2))))) / D2R;
}
