// Flux against wavelength, one point per exposure. Each SPHEREx exposure samples the source at
// a different wavelength, so the full set of exposures is a low-resolution spectrum.
import { DETECTORS } from '@/lib/frames';

export interface SpecPoint { wave: number; flux: number; err: number; mjd: number; det: number }

const W = 360, H = 190, L = 44, R = 8, T = 10, B = 26;

export function Spectrum({ points }: { points: SpecPoint[] }) {
  const x = (w: number) => L + ((w - 0.7) / (5.05 - 0.7)) * (W - L - R);
  const fluxes = points.map((p) => p.flux).sort((a, b) => a - b);
  const hi = fluxes.length ? Math.max(fluxes[Math.floor(0.97 * (fluxes.length - 1))] * 1.15, 1e-3) : 1;
  const lo = Math.min(0, fluxes.length ? fluxes[Math.floor(0.03 * (fluxes.length - 1))] : 0);
  const y = (f: number) => T + (1 - (Math.min(hi, Math.max(lo, f)) - lo) / (hi - lo)) * (H - T - B);
  const mid = points.length ? (Math.min(...points.map((p) => p.mjd)) + Math.max(...points.map((p) => p.mjd))) / 2 : 0;
  const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
  return (
    <svg className="spectrum" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={points.length ? `Spectrum from ${points.length} exposures between 0.75 and 5 microns, peaking near ${fmt(hi / 1.15)} millijansky` : 'Spectrum, waiting for measurements'}>
      {DETECTORS.map((d) => (
        <g key={d.det}>
          <line className="band" x1={x(d.min)} x2={x(d.min)} y1={T} y2={H - B} />
          <text x={(x(d.min) + x(d.max)) / 2} y={T + 9} textAnchor="middle">D{d.det}</text>
        </g>
      ))}
      <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
      {lo < 0 && <line className="band" x1={L} x2={W - R} y1={y(0)} y2={y(0)} />}
      {[1, 2, 3, 4, 5].map((w) => <text key={w} x={x(w)} y={H - B + 13} textAnchor="middle">{w}</text>)}
      <text x={W - R} y={H - 2} textAnchor="end">wavelength, µm</text>
      <text x={L - 5} y={T + 8} textAnchor="end">{fmt(hi)}</text>
      <text x={L - 5} y={y(0) + 3} textAnchor="end">0</text>
      <text x={4} y={H - B - 4}>mJy</text>
      {points.map((p, i) => (
        <circle key={i} cx={x(p.wave)} cy={y(p.flux)} r={2.2}
          fill={p.mjd > mid ? 'var(--c-mark)' : 'var(--c-bg)'} stroke={p.mjd > mid ? 'var(--c-mark)' : 'var(--c-fg)'} strokeWidth={1} />
      ))}
    </svg>
  );
}
