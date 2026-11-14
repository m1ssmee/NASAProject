// The 88 constellations on the sky map: which one a point belongs to, which figure the
// visitor has just come across, and which figure the pointer is resting on. Pure maths, no DOM.
// The data is baked by scripts/bake-constellations.mts.
import { basis, radecToVec, scaleOf, type Vec3, type View } from './project';

export interface Figure {
  /** IAU abbreviation. Serpens has two figures with the same id. */
  id: string;
  name: string;
  /** "the hunter" */
  meaning: string;
  /** Middle of the figure and its angular radius, degrees. */
  ra: number;
  dec: number;
  r: number;
  /** Polylines as flat [ra, dec, ra, dec, ...], each end on a catalogue star. */
  lines: number[][];
}
export interface NamedStar { name: string; ra: number; dec: number; mag: number }
export interface AtlasData {
  ids: string[];
  list: Figure[];
  names: NamedStar[];
  /** Run-length rows from Dec -90 upward: [constellation index, cells, ...] starting at RA 0. */
  grid: { step: number; rows: number[][] };
}
export interface Atlas extends AtlasData {
  /** Unit vectors of each figure's line ends, and of its middle. */
  points: Vec3[][];
  centres: Vec3[];
  /** Full constellation name per entry of `ids`. */
  fullNames: string[];
}

export function makeAtlas(data: AtlasData): Atlas {
  const points = data.list.map((f) => f.lines.flatMap((l) => {
    const out: Vec3[] = [];
    for (let i = 0; i < l.length; i += 2) out.push(radecToVec(l[i], l[i + 1]));
    return out;
  }));
  const fullNames = data.ids.map((id) => (id === 'Ser' ? 'Serpens' : data.list.find((f) => f.id === id)?.name ?? id));
  return { ...data, points, centres: data.list.map((f) => radecToVec(f.ra, f.dec)), fullNames };
}

/** Index into `ids` of the constellation that holds this point. */
export function constellationAt(atlas: AtlasData, ra: number, dec: number): number {
  const { step, rows } = atlas.grid;
  const row = rows[Math.min(rows.length - 1, Math.max(0, Math.floor((dec + 90) / step)))];
  let cell = Math.floor((((ra % 360) + 360) % 360) / step);
  for (let i = 0; i < row.length; i += 2) {
    if (cell < row[i + 1]) return row[i];
    cell -= row[i + 1];
  }
  return row[row.length - 2];
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A projector for many points under one view: screen pixels, or null when behind the viewer. */
function projector(v: View) {
  const [right, north, front] = basis(v.ra, v.dec);
  const s = scaleOf(v), cx = v.width / 2, cy = v.cy ?? v.height / 2;
  return (p: Vec3): [number, number] | null => {
    const z = dot(p, front);
    if (z < -0.2) return null;
    const k = (2 / (1 + z)) * s;
    return [cx + dot(p, right) * k, cy - dot(p, north) * k];
  };
}

/**
 * The figure the visitor has come across: the one nearest the middle of the screen that is
 * mostly in view. A figure too big to fit at this zoom counts once a fair part of it shows.
 * Returns an index into `list`, or -1.
 */
export function chooseFigure(atlas: Atlas, v: View, skip: ReadonlySet<number>): number {
  const project = projector(v);
  const front = radecToVec(v.ra, v.dec);
  const short = Math.min(v.width, v.height);
  const inset = short * 0.04;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < atlas.list.length; i++) {
    if (skip.has(i)) continue;
    const away = Math.acos(Math.max(-1, Math.min(1, dot(front, atlas.centres[i])))) * (180 / Math.PI);
    if (away > v.fov * 1.3 + atlas.list[i].r) continue;
    const pts = atlas.points[i];
    let on = 0;
    for (const p of pts) {
      const s = project(p);
      if (s && s[0] > inset && s[0] < v.width - inset && s[1] > inset && s[1] < v.height - inset) on++;
    }
    const frac = on / pts.length;
    const tooBig = atlas.list[i].r * 2 > v.fov * 0.85;
    if (!(frac >= 0.7 || (tooBig && on >= 3 && frac >= 0.3))) continue;
    // Prefer what is central and what is whole.
    const score = away / v.fov + (1 - frac) * 0.5;
    if (score < bestScore) { best = i; bestScore = score; }
  }
  return best;
}

/** The figure with a line end within `px` pixels of a screen point, or -1. */
export function figureNear(atlas: Atlas, v: View, x: number, y: number, px = 12): number {
  const project = projector(v);
  let best = -1, bestD = px * px;
  for (let i = 0; i < atlas.points.length; i++) {
    for (const p of atlas.points[i]) {
      const s = project(p);
      if (!s) continue;
      const d = (s[0] - x) ** 2 + (s[1] - y) ** 2;
      if (d < bestD) { best = i; bestD = d; }
    }
  }
  return best;
}
