'use client';
// A square of real SPHEREx sky from the baked set, blinking between two passes on the site clock.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { targetBySlug, VIEW_EPOCH } from '@/data/targets';
import { mjdToYear } from '@/lib/astro';
import { crop, loadBaked, loadBakedRgb, type Baked } from '@/lib/baked';
import { paint, subtract } from '@/lib/render';
import { useTone } from '@/lib/tone';
import { currentEpoch, onBlink } from '@/motion/blink';

interface Props {
  slug: string;
  view?: 'blink' | 'diff';
  /** Side of the central crop in output pixels (zooms in). */
  size?: number;
  /** Show the three-detector colour version (first and latest pass). Not for difference views. */
  colour?: boolean;
  /** Index of the first plate of the pair (default 0). The second is always the latest. */
  from?: number;
  edge?: boolean;
  /** Called with true when a click lands on the mover, false elsewhere. */
  onMark?: (hit: boolean) => void;
  alt: string;
}

export function BakedPlate({ slug, view = 'blink', size, from = 0, edge = true, colour = false, onMark, alt }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tone = useTone();
  const [data, setData] = useState<Baked | null>(null);
  const epoch = useSyncExternalStore(onBlink, currentEpoch, () => 'a' as const);
  const [mark, setMark] = useState<{ x: number; y: number; hit: boolean } | null>(null);

  const [rgb, setRgb] = useState<Uint8Array | null>(null);

  useEffect(() => { let on = true; loadBaked(slug).then((b) => on && setData(b)).catch(() => {}); return () => { on = false; }; }, [slug]);
  // The colour version is a separate small file; if it is missing the plate stays greyscale.
  const wantColour = colour && view !== 'diff';
  useEffect(() => {
    if (!wantColour) return;
    let on = true;
    loadBakedRgb(slug).then((b) => on && setRgb(b)).catch(() => {});
    return () => { on = false; };
  }, [slug, wantColour]);
  const inColour = wantColour && !!rgb && !!data?.meta.rgb;

  const m = data ? Math.min(size ?? data.meta.n, data.meta.n) : 0;
  const pair = useMemo(() => {
    if (!data) return null;
    const a = crop(data.frames[Math.min(from, data.frames.length - 1)], data.meta.n, m);
    const b = crop(data.frames[data.frames.length - 1], data.meta.n, m);
    return { a, b, d: view === 'diff' ? subtract(b, a) : null };
  }, [data, m, view, from]);

  useEffect(() => {
    if (!canvas.current || !pair || !data) return;
    if (inColour && rgb) {
      // Two finished RGB images: draw the central crop of the one for this half of the blink.
      const n = data.meta.n, o = Math.floor((n - m) / 2), base = (epoch === 'a' ? 0 : 1) * n * n * 3;
      const cv = canvas.current;
      if (cv.width !== m) { cv.width = m; cv.height = m; }
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const img = ctx.createImageData(m, m);
      for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
        const src = base + ((j + o) * n + (i + o)) * 3, dst = (j * m + i) * 4;
        img.data[dst] = rgb[src]; img.data[dst + 1] = rgb[src + 1]; img.data[dst + 2] = rgb[src + 2]; img.data[dst + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return;
    }
    if (pair.d) paint(canvas.current, pair.d, m, data.meta.limits, tone, true);
    else paint(canvas.current, epoch === 'a' ? pair.a : pair.b, m, data.meta.limits, tone);
  }, [pair, epoch, tone, data, m, inColour, rgb]);

  // Where the catalogued mover sits on each plate (output pixels of the crop).
  const movers = useMemo(() => {
    const t = targetBySlug(slug);
    if (!data || !t) return [];
    const e = data.meta.epochs;
    const ends = inColour && data.meta.rgb ? data.meta.rgb : [e[Math.min(from, e.length - 1)], e[e.length - 1]];
    return ends.map((ep) => {
      const dt = mjdToYear(ep.mjd) - VIEW_EPOCH;
      return { x: (m - 1) / 2 - (t.pmRa * dt) / 1000 / data.meta.scale, y: (m - 1) / 2 - (t.pmDec * dt) / 1000 / data.meta.scale };
    });
  }, [data, slug, m, from, inColour]);

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
  const first = inColour ? data?.meta.rgb?.[0] : e?.[Math.min(from, e.length - 1)];
  const last = inColour ? data?.meta.rgb?.[1] : e?.[e.length - 1];
  return (
    <div className={`plate${inColour ? ' plate--colour' : ''}`}>
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
