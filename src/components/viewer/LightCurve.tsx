// Brightness against date at one position. Small dots are single exposures (each samples a
// slightly different wavelength, so they scatter); the joined marks are the median of each plate.
import { isoDate } from '@/lib/astro';

export interface CurvePoint { mjd: number; flux: number; det: number }
export interface CurveMean { mjd: number; flux: number; det: number; n: number }

const W = 360, H = 190, L = 44, R = 10, T = 12, B = 28;
const INK: Record<number, string> = { 2: '#4f7dff', 4: '#36c46a', 6: '#ff4a3d' };

export function LightCurve({ points, means, coloured }: { points: CurvePoint[]; means: CurveMean[]; coloured: boolean }) {
  if (!points.length) return <p className="note">No usable measurements here: the position is off the detector, saturated, or too close to the edge of the field.</p>;
  const t0 = Math.min(...points.map((p) => p.mjd)), t1 = Math.max(...points.map((p) => p.mjd));
  const span = Math.max(1, t1 - t0);
  const sorted = points.map((p) => p.flux).sort((a, b) => a - b);
  const hi = Math.max(sorted[Math.floor(0.98 * (sorted.length - 1))] * 1.15, 1e-3);
  const lo = Math.min(0, sorted[Math.floor(0.02 * (sorted.length - 1))]);
  const x = (m: number) => L + ((m - t0) / span) * (W - L - R);
  const y = (f: number) => T + (1 - (Math.min(hi, Math.max(lo, f)) - lo) / (hi - lo)) * (H - T - B);
  const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
  const dets = [...new Set(means.map((m) => m.det))];
  const ink = (d: number) => (coloured ? INK[d] ?? 'var(--c-fg)' : 'var(--c-fg)');
  const change = means.length > 1 ? Math.max(...means.map((m) => m.flux)) / Math.max(1e-6, Math.min(...means.map((m) => m.flux))) : 1;
  return (
    <svg className="spectrum" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Brightness over time from ${points.length} exposures between ${isoDate(t0)} and ${isoDate(t1)}. Plate medians differ by a factor of ${change.toFixed(2)}.`}>
      <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
      {lo < 0 && <line className="band" x1={L} x2={W - R} y1={y(0)} y2={y(0)} />}
      <text x={L} y={H - B + 13}>{isoDate(t0)}</text>
      <text x={W - R} y={H - B + 13} textAnchor="end">{isoDate(t1)}</text>
      <text x={L - 5} y={T + 8} textAnchor="end">{fmt(hi)}</text>
      <text x={L - 5} y={y(0) + 3} textAnchor="end">0</text>
      <text x={4} y={H - B - 4}>mJy</text>
      {points.map((p, i) => <circle key={i} cx={x(p.mjd)} cy={y(p.flux)} r={1.4} fill={ink(p.det)} opacity={0.4} />)}
      {dets.map((d) => {
        const m = means.filter((q) => q.det === d).sort((a, b) => a.mjd - b.mjd);
        return (
          <g key={d}>
            <polyline points={m.map((q) => `${x(q.mjd)},${y(q.flux)}`).join(' ')} fill="none" stroke={ink(d)} strokeWidth={1.2} />
            {m.map((q, i) => <rect key={i} x={x(q.mjd) - 3.2} y={y(q.flux) - 3.2} width={6.4} height={6.4} fill={ink(d)} stroke="var(--c-bg)" strokeWidth={1} />)}
          </g>
        );
      })}
    </svg>
  );
}
