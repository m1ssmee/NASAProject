// SPHEREx's current orbit, as the two-line element set the public catalogue publishes (it is
// refreshed about daily; we ask at most every six hours). The browser works the position out
// from it. If the catalogue cannot be reached, a copy from 15 November 2026 is sent instead and
// marked stale: good for the shape of the orbit, not for exactly where along it SPHEREx is.
import { NextResponse } from 'next/server';

const SOURCE = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=63182&FORMAT=TLE'; // 63182: SPHEREx
const KEPT = [
  '1 63182U 25047E   26318.93660134  .00001015  00000+0  16067-3 0  9999',
  '2 63182  97.9569 141.0450 0011558  71.4698 288.7766 14.74310761 90251',
];

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(8000) });
    const lines = (await res.text()).split('\n').map((l) => l.trimEnd()).filter((l) => /^[12] 63182/.test(l));
    if (res.ok && lines.length === 2) return NextResponse.json({ line1: lines[0], line2: lines[1], stale: false });
  } catch { /* fall through to the kept copy */ }
  return NextResponse.json({ line1: KEPT[0], line2: KEPT[1], stale: true });
}
