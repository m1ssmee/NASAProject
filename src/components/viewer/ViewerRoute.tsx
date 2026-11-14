'use client';
import Link from 'next/link';
import { Hop } from '@/components/Hop';
import { Seek } from '@/components/Seek';
import { targetNow, targets } from '@/data/targets';
import type { Mode } from '@/lib/frames';
import { Viewer, type Stack, type ViewParams } from './Viewer';

const FOVS = [120, 300, 600, 1200];

export type Query = Record<string, string | string[] | undefined>;

export function ViewerRoute({ query, embed = false }: { query: Query; embed?: boolean }) {
  const sp = { get: (k: string) => { const v = query[k]; return (Array.isArray(v) ? v[0] : v) ?? null; } };
  const ra = Number(sp.get('ra')), dec = Number(sp.get('dec'));
  const has = sp.get('ra') !== null && sp.get('dec') !== null && ra >= 0 && ra < 360 && Math.abs(dec) <= 90;
  const base = embed ? '/embed' : '/view';

  if (!has) {
    return (
      <section className="page-head wrap grid" style={{ rowGap: '2rem' }}>
        <h1 className="h-xl">Which patch of sky?</h1>
        <div style={{ gridColumn: '1 / -1' }}><Seek base={base} /></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="small muted" style={{ marginBottom: '0.5rem' }}>Or start with a test target</p>
          <ul className="index">
            {targets.map((t) => {
              const p = targetNow(t);
              return (
                <li key={t.slug}>
                  <Link className="index__row" href={`${base}?ra=${p.ra.toFixed(5)}&dec=${p.dec.toFixed(5)}&det=${t.det}&name=${encodeURIComponent(t.name)}`}>
                    <span className="index__name h-l"><Hop>{t.name}</Hop></span>
                    <span className="index__kind">{t.kind}</span>
                    <span className="index__move mono">detector {t.det}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link className="index__row" href={`${base}?ra=216.79261&dec=-32.51587&det=2&mode=burst&plate=13&name=${encodeURIComponent('704 Interamnia')}`}>
                <span className="index__name h-l"><Hop>704 Interamnia</Hop></span>
                <span className="index__kind">An asteroid caught in one exposure on 1 February 2026, then gone</span>
                <span className="index__move mono">burst 13</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    );
  }

  const fov = Number(sp.get('fov'));
  const det = Number(sp.get('det'));
  const mode = sp.get('mode');
  const hold = Number(sp.get('hold'));
  const initial: ViewParams = {
    ra, dec, name: sp.get('name')?.slice(0, 60) || undefined,
    fov: FOVS.includes(fov) ? fov : 300,
    det: det >= 1 && det <= 6 ? Math.round(det) : 3,
    mode: (['pass', 'burst', 'single'].includes(mode ?? '') ? mode : 'pass') as Mode,
    diff: sp.get('diff') === '1', gaia: sp.get('gaia') === '1', ends: sp.get('ends') === '1', colour: sp.get('rgb') === '1',
    plate: Math.max(0, Math.round(Number(sp.get('plate')) || 0)),
    wise: sp.get('wise') === '1',
    stack: (['sum', 'shift'].includes(sp.get('stack') ?? '') ? sp.get('stack') : 'none') as Stack,
    pmRa: Number(sp.get('pmra')) || 0,
    pmDec: Number(sp.get('pmdec')) || 0,
    // Never faster than 3 swaps a second.
    hold: hold >= 340 && hold <= 2000 ? hold : 700,
  };
  return <Viewer key={`${ra},${dec}`} initial={initial} embed={embed} />;
}
