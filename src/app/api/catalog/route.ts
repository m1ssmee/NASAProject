// Gaia DR3 sources around a position, from the VizieR mirrors. Positions are epoch 2016.0.
import { NextResponse } from 'next/server';

const MIRRORS = ['https://vizier.cfa.harvard.edu', 'https://vizier.idia.ac.za', 'https://vizier.cds.unistra.fr'];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ra = Number(q.get('ra')), dec = Number(q.get('dec'));
  const radius = Math.min(1200, Math.max(10, Number(q.get('r')) || 150)); // arcsec
  if (!q.get('ra') || !q.get('dec') || !Number.isFinite(ra) || !Number.isFinite(dec)) {
    return NextResponse.json({ error: 'Give ra and dec in degrees.' }, { status: 400 });
  }
  const params = `-source=I/355/gaiadr3&-c=${ra.toFixed(5)}%20${dec >= 0 ? '%2B' : ''}${dec.toFixed(5)}&-c.rs=${radius}` +
    '&-out=Source,RA_ICRS,DE_ICRS,Plx,pmRA,pmDE,Gmag&-sort=Gmag&-out.max=400';
  for (const base of MIRRORS) {
    try {
      const res = await fetch(`${base}/viz-bin/asu-tsv?${params}`, { next: { revalidate: 7 * 86400 }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const rows = (await res.text()).split('\n').filter((l) => /^\d/.test(l)).map((l) => l.split('\t').map((s) => s.trim()));
      const sources = rows.map((f) => ({
        id: f[0], ra: Number(f[1]), dec: Number(f[2]),
        plx: f[3] ? Number(f[3]) : null, pmRa: f[4] ? Number(f[4]) : 0, pmDec: f[5] ? Number(f[5]) : 0, g: f[6] ? Number(f[6]) : null,
      })).filter((s) => Number.isFinite(s.ra) && Number.isFinite(s.dec));
      return NextResponse.json({ epoch: 2016.0, count: sources.length, sources }, { headers: { 'Cache-Control': 'public, s-maxage=604800' } });
    } catch { /* next mirror */ }
  }
  return NextResponse.json({ error: 'The Gaia catalogue mirrors did not answer.' }, { status: 502 });
}
