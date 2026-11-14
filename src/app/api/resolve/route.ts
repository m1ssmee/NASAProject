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

export async function GET(req: Request) {
  const name = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Give an object name in q.' }, { status: 400 });
  const hit = (await sesame(name)) ?? (await simbad(name));
  if (!hit) return NextResponse.json({ error: `No object called "${name}" was found. Try coordinates instead.` }, { status: 404 });
  return NextResponse.json(hit, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
}
