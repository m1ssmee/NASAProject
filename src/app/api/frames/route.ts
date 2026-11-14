// Lists every SPHEREx image that covers a sky position, via IRSA's SIA2 service.
// IRSA sends no CORS headers, so the browser asks this route instead. Pixels are then read
// by the browser straight from the public S3 bucket.
import { NextResponse } from 'next/server';
import { COLLECTIONS, siaUrl } from '@/config/releases';
import { parseSia } from '@/lib/frames';

export const maxDuration = 30;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ra = Number(q.get('ra'));
  const dec = Number(q.get('dec'));
  if (!q.get('ra') || !q.get('dec') || !(ra >= 0 && ra < 360) || !(Math.abs(dec) <= 90)) {
    return NextResponse.json({ error: 'Give ra (0 to 360) and dec (-90 to 90) in degrees.' }, { status: 400 });
  }
  // Round to about 0.4 arcsec so nearby requests share a cache entry.
  const url = siaUrl(Math.round(ra * 1e4) / 1e4, Math.round(dec * 1e4) / 1e4);
  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 6 * 3600 }, signal: AbortSignal.timeout(20000) });
      lastStatus = res.status;
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('s_ra')) {
          const images = parseSia(text);
          return NextResponse.json(
            { ra, dec, collections: COLLECTIONS, count: images.length, images },
            { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
          );
        }
      }
    } catch {
      lastStatus = 0;
    }
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  return NextResponse.json(
    { error: 'The SPHEREx archive at IRSA did not answer. It is often busy; try again in a few seconds.', status: lastStatus },
    { status: 502 },
  );
}
