'use client';
// A square of real SPHEREx sky from the baked set, blinking between two passes on the site clock.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { targetBySlug, VIEW_EPOCH } from '@/data/targets';
import { mjdToYear } from '@/lib/astro';
import { crop, loadBaked, type Baked } from '@/lib/baked';
import { paint, subtract } from '@/lib/render';
import { useTone } from '@/lib/tone';
import { currentEpoch, onBlink } from '@/motion/blink';

interface Props {
  slug: string;
  view?: 'blink' | 'diff';
  /** Side of the central crop in output pixels (zooms in). */
  size?: number;
  /** Index of the first plate of the pair (default 0). The second is always the latest. */
  from?: number;
  edge?: boolean;
  /** Called with true when a click lands on the mover, false elsewhere. */
  onMark?: (hit: boolean) => void;
  alt: string;
}

export function BakedPlate({ slug, view = 'blink', size, from = 0, edge = true, onMark, alt }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tone = useTone();
  const [data, setData] = useState<Baked | null>(null);
  const epoch = useSyncExternalStore(onBlink, currentEpoch, () => 'a' as const);
  const [mark, setMark] = useState<{ x: number; y: number; hit: boolean } | null>(null);

  useEffect(() => { let on = true; loadBaked(slug).then((b) => on && setData(b)).catch(() => {}); return () => { on = false; }; }, [slug]);

  const m = data ? Math.min(size ?? data.meta.n, data.meta.n) : 0;
  const pair = useMemo(() => {
    if (!data) return null;
    const a = crop(data.frames[Math.min(from, data.frames.length - 1)], data.meta.n, m);
    const b = crop(data.frames[data.frames.length - 1], data.meta.n, m);
    return { a, b, d: view === 'diff' ? subtract(b, a) : null };
  }, [data, m, view, from]);

  useEffect(() => {
    if (!canvas.current || !pair || !data) return;
    if (pair.d) paint(canvas.current, pair.d, m, data.meta.limits, tone, true);
    else paint(canvas.current, epoch === 'a' ? pair.a : pair.b, m, data.meta.limits, tone);
  }, [pair, epoch, tone, data, m]);

  // Where the catalogued mover sits on each plate (output pixels of the crop).
  const movers = useMemo(() => {
    const t = targetBySlug(slug);
    if (!data || !t) return [];
    const e = data.meta.epochs;
    return [e[Math.min(from, e.length - 1)], e[e.length - 1]].map((ep) => {
      const dt = mjdToYear(ep.mjd) - VIEW_EPOCH;
      return { x: (m - 1) / 2 - (t.pmRa * dt) / 1000 / data.meta.scale, y: (m - 1) / 2 - (t.pmDec * dt) / 1000 / data.meta.scale };
    });
  }, [data, slug, m, from]);

  const click = (ev: React.MouseEvent<HTMLButtonElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    // Keyboard activation reports no pointer position: treat it as a request to be shown.
    const viaKeys = ev.detail === 0;
    const x = viaKeys ? movers[1]?.x ?? 0 : ((ev.clientX - r.left) / r.width) * m - 0.5;
    const y = viaKeys ? movers[1]?.y ?? 0 : ((ev.clientY - r.top) / r.width) * m - 0.5;
    const hit = movers.some((p) => Math.hypot(p.x - x, p.y - y) < Math.max(3.5, m * 0.07));
    setMark({ x, y, hit });
    onMark?.(hit);
  };

  const e = data?.meta.epochs;
  const first = e?.[Math.min(from, e.length - 1)], last = e?.[e.length - 1];
  return (
    <div className="plate">
      <canvas ref={canvas} role="img" aria-label={alt} />
      {data && mark && (
        <svg viewBox={`-0.5 -0.5 ${m} ${m}`} aria-hidden="true">
          {mark.hit
            ? movers.map((p, i) => (
              <g key={i} className="tick">
                <line x1={p.x + m * 0.05} y1={p.y} x2={p.x + m * 0.1} y2={p.y} />
                <line x1={p.x} y1={p.y - m * 0.05} x2={p.x} y2={p.y - m * 0.1} />
              </g>
            ))
            : <circle className="ring" cx={mark.x} cy={mark.y} r={m * 0.035} />}
        </svg>
      )}
      {onMark && <button type="button" className="plate__hit" onClick={click} aria-label="Mark the source that moves. Activate to reveal it." />}
      {edge && first && last && (
        <div className="plate__edge" aria-hidden="true">
          {view === 'diff'
            ? <span>{last.to} minus {first.from}</span>
            : <><span>{epoch === 'a' ? <b>A {first.from}</b> : <>A {first.from}</>}</span><span>{epoch === 'b' ? <b>B {last.to}</b> : <>B {last.to}</>}</span></>}
        </div>
      )}
    </div>
  );
}
