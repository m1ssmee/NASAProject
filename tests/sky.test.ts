import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { notedStars, viewerHref } from '../src/data/stars';
import { pan, radecToVec, separation, toScreen, toSky, type View } from '../src/sky/project';

const view: View = { ra: 262, dec: 8, fov: 60, width: 1200, height: 800 };

describe('sky projection', () => {
  it('puts the view centre in the middle of the screen', () => {
    const p = toScreen(view, 262, 8)!;
    expect(p.x).toBeCloseTo(600, 6);
    expect(p.y).toBeCloseTo(400, 6);
  });
  it('draws north up and east to the left, as seen from inside the sphere', () => {
    expect(toScreen(view, 262, 18)!.y).toBeLessThan(400);
    expect(toScreen(view, 272, 8)!.x).toBeLessThan(600);
  });
  it('spans the field of view across the shorter side', () => {
    const top = toScreen(view, 262, 38)!;
    expect(top.y).toBeCloseTo(0, 0);
  });
  it('round-trips screen to sky to screen', () => {
    for (const [x, y] of [[0, 0], [600, 400], [1199, 30], [250, 790]]) {
      const s = toSky(view, x, y);
      const p = toScreen(view, s.ra, s.dec)!;
      expect(p.x).toBeCloseTo(x, 4);
      expect(p.y).toBeCloseTo(y, 4);
    }
  });
  it('hides what is behind the viewer', () => {
    expect(toScreen(view, 82, -8)).toBeNull();
  });
  it('works across RA zero and near the pole', () => {
    const v: View = { ra: 1, dec: 85, fov: 40, width: 800, height: 800 };
    const s = toSky(v, 100, 700);
    const p = toScreen(v, s.ra, s.dec)!;
    expect(p.x).toBeCloseTo(100, 4);
    expect(p.y).toBeCloseTo(700, 4);
  });
  it('drags the sky with the pointer and stops short of the poles', () => {
    const a = pan(view, 100, 0);
    expect(a.ra).toBeGreaterThan(262); // dragging right brings sky from the east (left) into view
    expect(pan({ ...view, dec: 89 }, 0, 5000).dec).toBeLessThanOrEqual(89.5);
  });
  it('measures separations', () => {
    expect(separation(10, 0, 11, 0)).toBeCloseTo(1, 9);
    expect(separation(0, 89, 180, 89)).toBeCloseTo(2, 9);
    expect(Math.hypot(...radecToVec(123, -45))).toBeCloseTo(1, 12);
  });
});

describe('star data', () => {
  it('has unique ids, valid coordinates and a note for every star', () => {
    expect(new Set(notedStars.map((s) => s.id)).size).toBe(notedStars.length);
    for (const s of notedStars) {
      expect(s.ra).toBeGreaterThanOrEqual(0);
      expect(s.ra).toBeLessThan(360);
      expect(Math.abs(s.dec)).toBeLessThanOrEqual(90);
      expect(s.note.length).toBeGreaterThan(20);
      expect(s.note).not.toMatch(/[–—]/);
    }
    expect(notedStars.filter((s) => s.target)).toHaveLength(5);
  });
  it('finds each famous star in the baked catalogue', () => {
    const buf = fs.readFileSync(path.join(__dirname, '..', 'public', 'sky', 'stars.bin'));
    const cat = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    expect(cat.length / 4).toBeGreaterThan(9000);
    const missing = notedStars.filter((s) => !s.target).filter((s) => {
      for (let i = 0; i < cat.length; i += 4) if (separation(s.ra, s.dec, cat[i], cat[i + 1]) < 0.25) return false;
      return true;
    });
    expect(missing.map((s) => s.name)).toEqual([]);
  });
  it('builds viewer links', () => {
    expect(viewerHref({ ra: 10.123456, dec: -5.5, name: 'Tau Ceti', det: 2 })).toBe('/view?ra=10.12346&dec=-5.50000&det=2&name=Tau%20Ceti');
  });
});
