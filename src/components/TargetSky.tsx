'use client';
// The five targets where they really are: the whole sky laid flat (right ascension across,
// increasing to the left as on any star chart; declination up), drawn from the same star
// catalogue as the map, with a ringed marker on each target. Choosing one shows its card.
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface SkyTarget { slug: string; name: string; kind: string; look: string; rate: string; moves: boolean; ra: number; dec: number; plate: ReactNode }

const place = (ra: number, dec: number) => ({ x: 1 - ra / 360, y: 0.5 - dec / 180 }); // 0 to 1 across and down

/** `children`: the key, shown right under the map. */
export function TargetSky({ targets, children }: { targets: SkyTarget[]; children?: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const cv = canvas.current!;
    let cat: Float32Array | null = null;
    const draw = () => {
      if (!cat) return;
      const w = cv.clientWidth, h = cv.clientHeight, k = Math.min(devicePixelRatio || 1, 2);
      cv.width = w * k; cv.height = h * k;
      const g = cv.getContext('2d')!;
      g.scale(k, k);
      for (let i = 0; i < cat.length; i += 4) {
        const p = place(cat[i], cat[i + 1]), bright = Math.min(1, Math.pow(2.512, (3 - cat[i + 2]) * 0.55));
        g.globalAlpha = Math.min(1, 0.12 + bright * 0.8); // faint ones as faint as the page's own stars
        g.fillStyle = cat[i + 3] > 1 ? '#ffd9b8' : cat[i + 3] < 0.1 ? '#cfdcff' : '#f0f1ee';
        g.beginPath();
        g.arc(p.x * w, p.y * h, 0.4 + bright * 1.2, 0, 6.2832);
        g.fill();
      }
    };
    fetch('/sky/stars.bin').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => { cat = new Float32Array(b); draw(); }).catch(() => {});
    addEventListener('resize', draw);
    return () => removeEventListener('resize', draw);
  }, []);
  return (
    <div className="tsky">
      <div>
      <div className="tsky__map">
        <canvas ref={canvas} aria-hidden="true" />
        <p className="tsky__axis mono" aria-hidden="true"><span>24h</span><span>right ascension</span><span>0h</span></p>
        {targets.map((t, i) => {
          const p = place(t.ra, t.dec);
          return (
            <button key={t.slug} type="button" className={`tsky__pin${t.moves ? ' is-mover' : ''}${p.x > 0.7 ? ' is-left' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              aria-pressed={i === at} onClick={() => setAt(i)} onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)}>
              <i aria-hidden="true" /><span>{t.name}</span>
            </button>
          );
        })}
      </div>
      {children}
      </div>
      <div className="tsky__cards">
        {targets.map((t, i) => (
          <Link key={t.slug} href={`/targets/${t.slug}`} className="tcard" hidden={i !== at}>
            {t.plate}
            <span className="tcard__rate mono">{t.rate}</span>
            <span className="h-l">{t.name}</span>
            <span className="tcard__kind">{t.kind}</span>
            <span className="tcard__look">{t.look}</span>
            <span className="textbtn">Open {t.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
