// Object name to coordinates: CDS Sesame first, then SIMBAD (which knows more aliases).
// Positions come back at epoch 2000 with proper motion, so the caller can move them forward.
import { NextResponse } from 'next/server';

const SESAME = ['https://vizier.cfa.harvard.edu/viz-bin/nph-sesame/-oxp/SNV?', 'https://vizier.idia.ac.za/viz-bin/nph-sesame/-oxp/SNV?'];
const SIMBAD = ['https://simbad.cfa.harvard.edu/simbad/sim-tap/sync', 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync'];

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]+)</${name}>`));
  return m ? m[1].trim() : null;
};

async function sesame(name: string) {
  for (const base of SESAME) {
    try {
      const res = await fetch(base + encodeURIComponent(name), { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const ra = Number(tag(xml, 'jradeg')), dec = Number(tag(xml, 'jdedeg'));
      if (!tag(xml, 'jradeg') || !Number.isFinite(ra) || !Number.isFinite(dec)) return null;
      const pm = xml.match(/<pm>[\s\S]*?<pmRA>([^<]+)<\/pmRA>[\s\S]*?<pmDE>([^<]+)<\/pmDE>/);
      return { name: tag(xml, 'oname') ?? name, ra, dec, pmRa: pm ? Number(pm[1]) : 0, pmDec: pm ? Number(pm[2]) : 0, source: 'CDS Sesame' };
    } catch { /* next mirror */ }
  }
  return null;
}

async function simbad(name: string) {
  const adql = `SELECT TOP 1 main_id, ra, dec, pmra, pmdec FROM basic JOIN ident ON oidref = oid WHERE id = '${name.replace(/'/g, "''")}'`;
  for (const base of SIMBAD) {
    try {
      const body = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'csv', query: adql });
      const res = await fetch(base, { method: 'POST', body, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const lines = (await res.text()).trim().split('\n');
      if (lines.length < 2) return null;
      const f = lines[1].match(/("([^"]*)"|[^,]*)(,|$)/g)!.map((s) => s.replace(/,$/, '').replace(/^"|"$/g, ''));
      const ra = Number(f[1]), dec = Number(f[2]);
      if (!Number.isFinite(ra) || !Number.isFinite(dec) || f[1] === '') return null;
      return { name: f[0], ra, dec, pmRa: Number(f[3]) || 0, pmDec: Number(f[4]) || 0, source: 'SIMBAD' };
    } catch { /* next mirror */ }
  }
  return null;
}

/** Brightest catalogued object near a position, with a plain-language type. Used by the sky map. */
async function nearest(ra: number, dec: number, radiusArcsec: number) {
  const r = (radiusArcsec / 3600).toFixed(5);
  // The brightest catalogued object inside the circle: on a sky map that is what the eye picked.
  const adql = `SELECT TOP 1 main_id, description, ra, dec, V FROM basic JOIN otypedef ON basic.otype = otypedef.otype ` +
    `JOIN allfluxes ON basic.oid = allfluxes.oidref ` +
    `WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra.toFixed(5)}, ${dec.toFixed(5)}, ${r})) = 1 AND V IS NOT NULL ORDER BY V ASC`;
  for (const base of SIMBAD) {
    try {
      const body = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'csv', query: adql });
      const res = await fetch(base, { method: 'POST', body, signal: AbortSignal.timeout(14000) });
      if (!res.ok) continue;
      const lines = (await res.text()).trim().split('\n');
      if (lines.length < 2) return null;
      const f = lines[1].match(/("([^"]*)"|[^,]*)(,|$)/g)!.map((s) => s.replace(/,$/, '').replace(/^"|"$/g, ''));
      if (!f[0]) return null;
      return { name: f[0].replace(/^(NAME|V\*|\*)\s+/, '').replace(/\s+/g, ' '), type: f[1] ?? '', ra: Number(f[2]), dec: Number(f[3]), source: 'SIMBAD' };
    } catch { /* next mirror */ }
  }
  return null;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get('ra') !== null && q.get('dec') !== null) {
    const ra = Number(q.get('ra')), dec = Number(q.get('dec'));
    const radius = Math.min(900, Math.max(5, Number(q.get('r')) || 60));
    if (!(ra >= 0 && ra < 360) || !(Math.abs(dec) <= 90)) return NextResponse.json({ error: 'Give ra and dec in degrees.' }, { status: 400 });
    const hit = await nearest(ra, dec, radius);
    // An empty patch is a normal answer, not an error.
    if (!hit) return NextResponse.json({ name: null }, { headers: { 'Cache-Control': 'public, s-maxage=604800' } });
    return NextResponse.json(hit, { headers: { 'Cache-Control': 'public, s-maxage=604800' } });
  }
  const name = (q.get('q') ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Give an object name in q.' }, { status: 400 });
  const hit = (await sesame(name)) ?? (await simbad(name));
  if (!hit) return NextResponse.json({ error: `No object called "${name}" was found. Try coordinates instead.` }, { status: 404 });
  return NextResponse.json(hit, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
}
