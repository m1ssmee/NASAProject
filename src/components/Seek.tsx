'use client';
// Coordinate or name search. Coordinates go straight to the viewer; names are resolved and
// moved forward by proper motion first, because catalogues store where things were in 2000.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VIEW_EPOCH } from '@/data/targets';
import { parseCoords, propagate } from '@/lib/astro';
import { Hop } from './Hop';

export function Seek({ initial = '', base = '/view', hint = true }: { initial?: string; base?: string; hint?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (ra: number, dec: number, name?: string) => {
    const q = new URLSearchParams({ ra: ra.toFixed(5), dec: dec.toFixed(5) });
    if (name) q.set('name', name);
    router.push(`${base}?${q}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const t = text.trim();
    if (!t) { setErr('Type coordinates or an object name.'); return; }
    const c = parseCoords(t);
    if (c) return go(c.ra, c.dec);
    setBusy(true);
    try {
      const res = await fetch(`/api/resolve?q=${encodeURIComponent(t)}`);
      const j = await res.json();
      if (!res.ok) { setErr(j.error ?? 'That name was not found.'); return; }
      const [ra, dec] = propagate(j.ra, j.dec, j.pmRa, j.pmDec, 2000, VIEW_EPOCH);
      go(ra, dec, j.name);
    } catch {
      setErr('The name service did not answer. Coordinates still work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="seek" onSubmit={submit} role="search">
        <label className="sr-only" htmlFor="seek-q">Right ascension and declination, or an object name</label>
        <input id="seek-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="08h55m10.83s -07d14m42.5s" autoComplete="off" spellCheck={false} aria-describedby="seek-err" />
        <button className="btn" type="submit" disabled={busy}><Hop tick={false}>{busy ? 'Looking up' : 'Blink this patch'}</Hop></button>
      </form>
      <p id="seek-err" className="seek__err" role="alert">{err}</p>
      {hint && <p className="seek__hint">Degrees, sexagesimal or a name such as Barnard&rsquo;s Star. Names are moved to where the object is now.</p>}
    </div>
  );
}
