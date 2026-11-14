import { describe, expect, it } from 'vitest';
import { formatDec, formatRa, parseCoords, propagate } from '../src/lib/astro';
import { parseHeader } from '../src/lib/fits';
import { buildEpochs, makeGrid, parseSia, wavelengthAt, type Frame } from '../src/lib/frames';
import { deproject, makeWcs, pixToSky, project, skyToPix } from '../src/lib/wcs';

const card = (k: string, v: string) => `${k.padEnd(8)}= ${v}`.padEnd(80);
const header = (cards: string[]) => new TextEncoder().encode([...cards, 'END'.padEnd(80)].join(''));

describe('coordinates', () => {
  it('parses the challenge coordinates for WISE 0855', () => {
    const c = parseCoords('08h55m10.831s -7d14m42.53s')!;
    expect(c.ra).toBeCloseTo(133.795129, 5);
    expect(c.dec).toBeCloseTo(-7.245147, 5);
  });
  it('parses decimals, colons and rejects names', () => {
    expect(parseCoords('269.452 4.693')).toEqual({ ra: 269.452, dec: 4.693 });
    expect(parseCoords('17:57:48.5 +04:41:36.1')!.ra).toBeCloseTo(269.45208, 4);
    expect(parseCoords('-00 30 00 -00 30 00')).toBeNull();
    expect(parseCoords("Barnard's Star")).toBeNull();
    expect(parseCoords('400 10')).toBeNull();
  });
  it('keeps the sign of declinations between 0 and -1 degree', () => {
    expect(parseCoords('10 00 00 -00 30 00')!.dec).toBeCloseTo(-0.5, 6);
  });
  it('formats sexagesimal', () => {
    expect(formatRa(133.795129)).toBe('08h 55m 10.83s');
    expect(formatDec(-7.245147)).toBe('−07° 14′ 42.5″');
  });
  it('moves Barnard’s Star about 4.5 arcminutes north by 2026', () => {
    const [ra, dec] = propagate(269.45208, 4.69336, -801.6, 10362.4, 2000, 2026);
    expect((dec - 4.69336) * 60).toBeCloseTo(4.49, 1);
    expect(ra).toBeLessThan(269.45208);
  });
});

describe('FITS header', () => {
  it('reads numbers, strings, booleans and HIERARCH cards', () => {
    const { h, length } = parseHeader(header([
      card('NAXIS1', '2040'), card('BUNIT', "'MJy / sr'           / unit"), card('EXTEND', 'T'),
      'HIERARCH L2 N_HOT = 12 / hot pixels'.padEnd(80), card('CRVAL1', '134.414675682 / [deg]'),
    ]));
    expect(h.NAXIS1).toBe(2040);
    expect(h.BUNIT).toBe('MJy / sr');
    expect(h.EXTEND).toBe(true);
    expect(h['L2 N_HOT']).toBe(12);
    expect(h.CRVAL1).toBeCloseTo(134.414675682, 9);
    expect(length).toBe(2880);
  });
  it('reports a missing END', () => {
    expect(parseHeader(new TextEncoder().encode(card('NAXIS', '2'))).length).toBe(-1);
  });
});

describe('WCS', () => {
  // Values from a real SPHEREx header (2025W19_1B_0116_1, detector 3).
  const { h } = parseHeader(header([
    card('CRPIX1', '1020.5'), card('CRPIX2', '1020.5'),
    card('PC1_1', '0.00162109325783'), card('PC1_2', '-0.000480883137386'),
    card('PC2_1', '-0.000545275460402'), card('PC2_2', '-0.00163988082407'),
    card('CDELT1', '1.0'), card('CDELT2', '1.0'), card('CRVAL1', '134.414675682'), card('CRVAL2', '-9.0062724739'),
    card('A_ORDER', '2'), card('A_0_0', '-0.405191259862'), card('A_2_0', '1.59683498851E-06'), card('A_1_1', '4.16953952278E-06'),
    card('B_ORDER', '2'), card('B_0_0', '-1.16491682327'), card('B_0_2', '1.9958373108E-06'), card('B_2_0', '6.65706232777E-06'),
  ]));
  const w = makeWcs(h);
  it('round-trips pixel to sky to pixel without inverse coefficients', () => {
    for (const [x, y] of [[0, 0], [1019.5, 1019.5], [2039, 150], [300, 1900]]) {
      const [ra, dec] = pixToSky(w, x, y);
      const [bx, by] = skyToPix(w, ra, dec);
      expect(bx).toBeCloseTo(x, 3);
      expect(by).toBeCloseTo(y, 3);
    }
  });
  it('has the SPHEREx pixel scale', () => {
    const a = pixToSky(w, 1000, 1000), b = pixToSky(w, 1000, 1001);
    expect(Math.abs(b[1] - a[1]) * 3600).toBeGreaterThan(5.6);
    expect(Math.hypot((b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180), b[1] - a[1]) * 3600).toBeCloseTo(6.15, 0);
  });
  it('projects and deprojects the tangent plane', () => {
    const [xi, eta] = project(10.02, -29.98, 10, -30);
    const [ra, dec] = deproject(xi, eta, 10, -30);
    expect(ra).toBeCloseTo(10.02, 9);
    expect(dec).toBeCloseTo(-29.98, 9);
    expect(eta).toBeGreaterThan(0);
    expect(xi).toBeGreaterThan(0);
  });
});

describe('frames', () => {
  it('reads SIA rows and ignores the unquoted JSON column', () => {
    const csv = 's_ra,energy_bandpassname,obs_id,access_url,obs_collection,t_min,t_max,cloud_access\n' +
      '268.3,SPHEREx-D6,2025W33_2C_0321_1,https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/x/6/f.fits,spherex_dr1,60902.864715,60902.866047,{"aws": {"bucket_name": "nasa-irsa-spherex", "key":"dr1/level2/x/6/f.fits"}}\n';
    const r = parseSia(csv);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ det: 6, key: 'dr1/level2/x/6/f.fits', rel: 'spherex_dr1', id: '2025W33_2C_0321_1/D6' });
    expect(r[0].mjd).toBeCloseTo(60902.865381, 5);
  });
  it('gives wavelengths inside each detector band', () => {
    const [w3] = wavelengthAt(3, 1020, 1020);
    expect(w3).toBeGreaterThan(1.6);
    expect(w3).toBeLessThan(2.45);
    const [w6, bw6] = wavelengthAt(6, 5, 5);
    expect(w6).toBeGreaterThan(4.4);
    expect(w6).toBeLessThan(5.05);
    expect(bw6).toBeGreaterThan(0.02);
  });
  it('splits passes six months apart and bursts minutes apart', () => {
    const f = (mjd: number): Frame => ({ rec: { id: String(mjd), det: 1, mjd, key: '', rel: '' }, mjd, data: new Float32Array([mjd]), background: 0, sigma: 1, wave: 1, bandwidth: 0.02, pixel: [0, 0], psfFwhm: 7, exposure: 113, coverage: 1 });
    const frames = [60800, 60800.002, 60800.004, 60810, 60990, 60990.002].map(f);
    expect(buildEpochs(frames, 'pass').map((e) => e.frames.length)).toEqual([4, 2]);
    expect(buildEpochs(frames, 'burst').map((e) => e.frames.length)).toEqual([3, 1, 2]);
    expect(buildEpochs(frames, 'single')).toHaveLength(6);
  });
  it('sizes the grid at half a detector pixel', () => {
    const g = makeGrid(10, 10, 300);
    expect(g.scale).toBeCloseTo(3.075, 3);
    expect(g.n).toBe(98);
  });
});
