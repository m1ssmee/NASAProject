import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseFigure, constellationAt, figureNear, makeAtlas, type AtlasData } from '../src/sky/constellations';
import { toScreen, type View } from '../src/sky/project';

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'sky', 'constellations.json'), 'utf8')) as AtlasData;
const atlas = makeAtlas(data);
const idOf = (ra: number, dec: number) => atlas.ids[constellationAt(atlas, ra, dec)];
const view = (ra: number, dec: number, fov: number): View => ({ ra, dec, fov, width: 1440, height: 900 });

describe('constellations', () => {
  it('holds all 88, with Serpens in two figures', () => {
    expect(atlas.ids.length).toBe(88);
    expect(atlas.list.length).toBe(89);
    expect(atlas.list.filter((f) => f.id === 'Ser').map((f) => f.name)).toEqual(['Serpens Caput', 'Serpens Cauda']);
  });

  it('knows which constellation a point is in', () => {
    expect(idOf(101.29, -16.72)).toBe('CMa'); // Sirius
    expect(idOf(37.95, 89.26)).toBe('UMi'); // Polaris
    expect(idOf(317.2, -88.96)).toBe('Oct'); // Sigma Octantis
    expect(idOf(269.45, 4.69)).toBe('Oph'); // Barnard's Star
    expect(idOf(359.9, 29)).toBe(idOf(-0.1, 29)); // RA wraps
    expect(atlas.fullNames[constellationAt(atlas, 236.07, 6.43)]).toBe('Serpens');
  });

  it('every grid row covers the full circle', () => {
    for (const row of atlas.grid.rows) {
      let cells = 0;
      for (let i = 1; i < row.length; i += 2) cells += row[i];
      expect(cells).toBe(360 / atlas.grid.step);
    }
  });

  it('picks the figure in the middle of the view, once', () => {
    const ori = atlas.list.findIndex((f) => f.id === 'Ori');
    const v = view(atlas.list[ori].ra, atlas.list[ori].dec, 50);
    expect(chooseFigure(atlas, v, new Set())).toBe(ori);
    expect(chooseFigure(atlas, v, new Set([ori]))).not.toBe(ori);
  });

  it('still finds a figure too big to fit on screen', () => {
    const hya = atlas.list.findIndex((f) => f.id === 'Hya');
    const all = new Set(atlas.list.map((_, i) => i));
    all.delete(hya);
    expect(chooseFigure(atlas, view(atlas.list[hya].ra, atlas.list[hya].dec, 60), all)).toBe(hya);
  });

  it('finds the figure under the pointer', () => {
    const ori = atlas.list.findIndex((f) => f.id === 'Ori');
    const v = view(atlas.list[ori].ra, atlas.list[ori].dec, 40);
    const l = atlas.list[ori].lines[0];
    const p = toScreen(v, l[0], l[1])!;
    expect(figureNear(atlas, v, p.x + 3, p.y - 3)).toBe(ori);
    expect(figureNear(atlas, v, -500, -500)).toBe(-1);
  });
});
