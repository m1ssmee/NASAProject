'use client';
// The blink comparator. Finds every SPHEREx exposure of a position, reads the needed pixels
// from the public archive bucket, aligns them, and plays the epochs.
import { gsap } from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hop } from '@/components/Hop';
import { Ruler } from '@/components/Ruler';
import { Seek } from '@/components/Seek';
import { formatDec, formatRa, isoDate, mjdToYear, propagate } from '@/lib/astro';
import {
  aperture, buildEpochs, DETECTORS, displayLimits, loadFrame, makeGrid, pool, thin,
  type Epoch, type Frame, type ImageRecord, type Mode,
} from '@/lib/frames';
import { paint, subtract } from '@/lib/render';
import { useTone } from '@/lib/tone';
import { deproject, project } from '@/lib/wcs';
import { Spectrum, type SpecPoint } from './Spectrum';

export interface ViewParams {
  ra: number; dec: number; name?: string;
  fov: number; det: number; mode: Mode; diff: boolean; gaia: boolean; hold: number; ends: boolean;
}

interface GaiaSource { id: string; ra: number; dec: number; pmRa: number; pmDec: number; g: number | null }

const FOVS = [{ v: 120, l: '2′' }, { v: 300, l: '5′' }, { v: 600, l: '10′' }, { v: 1200, l: '20′' }];
const MODES: { v: Mode; l: string; hint: string }[] = [
  { v: 'pass', l: 'Pass', hint: 'One plate per survey pass, about six months apart. Best for stars and brown dwarfs.' },
  { v: 'burst', l: 'Burst', hint: 'One plate per group of exposures taken minutes apart. For asteroids and comets.' },
  { v: 'single', l: 'Single', hint: 'Every exposure on its own. Each samples a different wavelength, so sources flicker.' },
];

export function Viewer({ initial, embed = false }: { initial: ViewParams; embed?: boolean }) {
  const { ra, dec, name } = initial;
  const [fov, setFovRaw] = useState(initial.fov);
  const [det, setDetRaw] = useState(initial.det);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [diff, setDiff] = useState(initial.diff);
  const [ends, setEnds] = useState(initial.ends);
  const [showGaia, setShowGaia] = useState(initial.gaia);
  const [hold, setHold] = useState(initial.hold);
  const [gain, setGain] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);

  const [records, setRecords] = useState<ImageRecord[] | null>(null);
  const [error, setError] = useState('');
  // Loaded pixels are tagged with the detector and field they belong to, so a change of either
  // shows an empty plate at once instead of the previous selection.
  const [load, setLoad] = useState<{ key: string; frames: Frame[]; done: number; total: number; failed: number } | null>(null);
  const [gaiaData, setGaia] = useState<{ fov: number; sources: GaiaSource[] } | null>(null);
  const [gaiaErr, setGaiaErr] = useState('');
  const [mark, setMark] = useState<{ x: number; y: number } | null>(null);
  const [spec, setSpec] = useState<{ points: SpecPoint[]; done: number; total: number } | null>(null);
  const [copied, setCopied] = useState('');

  const canvas = useRef<HTMLCanvasElement>(null);
  const tone = useTone();
  const grid = useMemo(() => makeGrid(ra, dec, fov), [ra, dec, fov]);
  const loadKey = `${det}:${fov}`;
  const current = load && load.key === loadKey ? load : null;
  const frames = useMemo(() => current?.frames ?? [], [current]);
  const progress = { done: current?.done ?? 0, total: current?.total ?? 0, failed: current?.failed ?? 0 };
  const gaia = gaiaData && gaiaData.fov === fov ? gaiaData.sources : null;
  const setDet = useCallback((d: number) => { setDetRaw(d); setIdx(0); setMark(null); }, []);
  const setFov = (f: number) => { setFovRaw(f); setIdx(0); setMark(null); };

  // 1. Which exposures cover this position?
  useEffect(() => {
    const ac = new AbortController();
    // The archive often answers 502 or 503 when busy, so ask up to three times before giving up.
    (async () => {
      let message = 'The archive did not answer.';
      for (let attempt = 0; attempt < 3 && !ac.signal.aborted; attempt++) {
        try {
          const r = await fetch(`/api/frames?ra=${ra}&dec=${dec}`, { signal: ac.signal });
          const j = await r.json();
          if (r.ok) { setError(''); setRecords(j.images as ImageRecord[]); return; }
          message = j.error ?? message;
          if (r.status === 400) break;
        } catch { /* network error: retry */ }
        if (attempt < 2) { setError('The archive is busy. Trying again.'); await new Promise((res) => setTimeout(res, 2500)); }
      }
      if (!ac.signal.aborted) setError(message);
    })();
    return () => ac.abort();
  }, [ra, dec]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    records?.forEach((r) => { c[r.det] = (c[r.det] ?? 0) + 1; });
    return c;
  }, [records]);

  // 2. Read the pixels for the chosen detector, a few files at a time, showing frames as they land.
  useEffect(() => {
    if (!records) return;
    const ac = new AbortController();
    const mine = thin(records.filter((r) => r.det === det), fov >= 600 ? 48 : 120);
    const got: Frame[] = [];
    let done = 0, failed = 0, last = 0;
    const flush = (force = false) => {
      const now = performance.now();
      if (!force && now - last < 350) return;
      last = now;
      setLoad({ key: loadKey, frames: [...got], done, total: mine.length, failed });
    };
    pool(mine, 8, (r) => loadFrame(r, grid, ac.signal), (f, _r, err) => {
      if (ac.signal.aborted) return;
      done++;
      if (f && f.coverage > 0.2) got.push(f); else if (err) failed++;
      flush();
    }).then(() => {
      if (ac.signal.aborted) return;
      flush(true);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
    });
    return () => ac.abort();
  }, [records, det, grid, fov, loadKey]);

  const epochs: Epoch[] = useMemo(() => (frames.length ? buildEpochs(frames, mode) : []), [frames, mode]);
  // Display limits come from the deepest plate, so a thin plate looks as noisy as it is.
  const limits = useMemo(() => {
    const deepest = epochs.reduce<Epoch | null>((best, e) => (!best || e.frames.length > best.frames.length ? e : best), null);
    return displayLimits(deepest ? [deepest.data] : []);
  }, [epochs]);
  const order = useMemo(() => {
    if (epochs.length < 2) return epochs.map((_, i) => i);
    if (ends) return [0, epochs.length - 1];
    return epochs.map((_, i) => i).filter((i) => !diff || i > 0);
  }, [epochs, ends, diff]);
  const cur = epochs.length ? Math.min(idx, epochs.length - 1) : 0;
  const epoch = epochs[cur];

  // 3. Play on the shared clock.
  const step = useCallback((dir: number) => {
    setIdx((i) => {
      if (!order.length) return 0;
      const at = order.indexOf(i);
      return order[((at < 0 ? 0 : at + dir) + order.length) % order.length];
    });
  }, [order]);
  useEffect(() => {
    if (!playing || order.length < 2) return;
    let last = gsap.ticker.time;
    const tick = (time: number) => {
      if (document.hidden) { last = time; return; }
      if (time - last >= hold / 1000) { last = time; step(1); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [playing, hold, step, order.length]);

  // 4. Paint.
  useEffect(() => {
    if (!canvas.current || !epoch) return;
    if (diff && epochs.length > 1) {
      const ref = cur === 0 ? epochs[epochs.length - 1] : epochs[0];
      paint(canvas.current, cur === 0 ? subtract(ref.data, epoch.data) : subtract(epoch.data, ref.data), grid.n, limits, tone, true, gain);
    } else paint(canvas.current, epoch.data, grid.n, limits, tone, false, gain);
  }, [epoch, epochs, cur, diff, limits, tone, gain, grid.n]);

  // Keyboard: space, arrows, 1 to 6, D.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' && !t.closest('button, a')) { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === 'ArrowRight') { setPlaying(false); step(1); }
      else if (e.key === 'ArrowLeft') { setPlaying(false); step(-1); }
      else if (/^[1-6]$/.test(e.key)) setDet(Number(e.key));
      else if (e.key.toLowerCase() === 'd') setDiff((d) => !d);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [step, setDet]);

  // Keep the address bar shareable.
  const query = useMemo(() => {
    const q = new URLSearchParams({ ra: ra.toFixed(5), dec: dec.toFixed(5), fov: String(fov), det: String(det), mode });
    if (name) q.set('name', name);
    if (diff) q.set('diff', '1');
    if (ends) q.set('ends', '1');
    if (showGaia) q.set('gaia', '1');
    if (hold !== 700) q.set('hold', String(hold));
    return q.toString();
  }, [ra, dec, fov, det, mode, name, diff, ends, showGaia, hold]);
  useEffect(() => { history.replaceState(history.state, '', `${location.pathname}?${query}`); }, [query]);

  // Gaia DR3 overlay.
  useEffect(() => {
    if (!showGaia || gaia) return;
    const ac = new AbortController();
    fetch(`/api/catalog?ra=${ra}&dec=${dec}&r=${Math.min(1200, Math.round(fov * 0.75))}`, { signal: ac.signal })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setGaiaErr(''); setGaia({ fov, sources: (j.sources as GaiaSource[]).slice(0, 80) }); })
      .catch((e) => { if (!ac.signal.aborted) setGaiaErr(e.message || 'Gaia did not answer.'); });
    return () => ac.abort();
  }, [showGaia, gaia, ra, dec, fov]);

  const toPixel = useCallback((sRa: number, sDec: number): [number, number] => {
    const [xi, eta] = project(sRa, sDec, ra, dec);
    return [(grid.n - 1) / 2 - (xi * 3600) / grid.scale, (grid.n - 1) / 2 - (eta * 3600) / grid.scale];
  }, [ra, dec, grid]);

  const stars = useMemo(() => {
    if (!showGaia || !gaia || !epoch) return [];
    const year = mjdToYear(epoch.mjd);
    const y0 = epochs.length ? mjdToYear(epochs[0].mjd) : year;
    const y1 = epochs.length ? mjdToYear(epochs[epochs.length - 1].mjd) : year;
    return gaia.map((s) => {
      const at = (y: number) => toPixel(...propagate(s.ra, s.dec, s.pmRa, s.pmDec, 2016, y));
      const pm = Math.hypot(s.pmRa, s.pmDec);
      return { id: s.id, p: at(year), a: at(y0), b: at(y1), pm, fast: pm >= 100, g: s.g };
    }).filter((s) => s.p[0] > -1 && s.p[0] < grid.n && s.p[1] > -1 && s.p[1] < grid.n);
  }, [showGaia, gaia, epoch, epochs, toPixel, grid.n]);

  const clickPlate = (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (ev.detail === 0) { setMark(null); return; }
    const r = ev.currentTarget.getBoundingClientRect();
    setMark({ x: ((ev.clientX - r.left) / r.width) * grid.n - 0.5, y: ((ev.clientY - r.top) / r.height) * grid.n - 0.5 });
  };
  const markSky = useMemo(() => {
    if (!mark) return null;
    const xi = (-(mark.x - (grid.n - 1) / 2) * grid.scale) / 3600;
    const eta = (-(mark.y - (grid.n - 1) / 2) * grid.scale) / 3600;
    const [r, d] = deproject(xi, eta, ra, dec);
    return { ra: r, dec: d };
  }, [mark, grid, ra, dec]);

  // Spectrum on the fly: a small cutout from every detector, one measurement per exposure.
  const specAbort = useRef<AbortController | null>(null);
  useEffect(() => () => specAbort.current?.abort(), []);
  const measure = () => {
    if (!records) return;
    specAbort.current?.abort();
    const ac = new AbortController();
    specAbort.current = ac;
    const at = markSky ?? { ra, dec };
    const g = makeGrid(at.ra, at.dec, 110);
    const list = DETECTORS.flatMap((d) => thin(records.filter((r) => r.det === d.det), 40));
    const pts: SpecPoint[] = [];
    let done = 0;
    setSpec({ points: [], done: 0, total: list.length });
    pool(list, 8, (r) => loadFrame(r, g, ac.signal), (f) => {
      if (ac.signal.aborted) return;
      done++;
      if (f) {
        const m = aperture(f.data, g, (g.n - 1) / 2, (g.n - 1) / 2);
        if (Number.isFinite(m.flux) && Number.isFinite(f.wave)) pts.push({ wave: f.wave, flux: m.flux, err: m.err, mjd: f.mjd, det: f.rec.det });
      }
      if (done % 6 === 0 || done === list.length) setSpec({ points: [...pts], done, total: list.length });
    });
  };

  const copy = async (what: 'link' | 'embed') => {
    const url = `${location.origin}/${what === 'embed' ? 'embed' : 'view'}?${query}`;
    const text = what === 'embed' ? `<iframe src="${url}" width="900" height="640" style="border:0" title="SPHEREx blink of ${name ?? 'a sky position'}"></iframe>` : url;
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1800); } catch { setCopied('failed'); }
  };
  const savePng = () => {
    if (!canvas.current || !epoch) return;
    const z = Math.max(1, Math.round(960 / grid.n));
    const out = document.createElement('canvas');
    out.width = out.height = grid.n * z;
    const c = out.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.drawImage(canvas.current, 0, 0, out.width, out.height);
    const a = document.createElement('a');
    a.download = `spherex-d${det}-${isoDate(epoch.mjd)}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
  };

  const loading = !!records && (!current || progress.done < progress.total);
  const empty = !!records && !loading && frames.length === 0;
  const span = epochs.length > 1 ? (epochs[epochs.length - 1].mjd - epochs[0].mjd) / 365.25 : 0;
  const label = epoch
    ? (isoDate(epoch.mjdMin) === isoDate(epoch.mjdMax) ? isoDate(epoch.mjdMin) : `${isoDate(epoch.mjdMin)} to ${isoDate(epoch.mjdMax)}`)
    : '';
  const fwhm = epoch ? epoch.frames.map((f) => f.psfFwhm).filter(Number.isFinite).sort((a, b) => a - b)[epoch.frames.length >> 1] : NaN;
  const modeHint = MODES.find((m) => m.v === mode)!.hint;

  return (
    <div className={`viewer${embed ? ' viewer--embed' : ''}`}>
      <div className="viewer__stage">
        <div className="plate viewer__plate">
          <canvas ref={canvas} role="img"
            aria-label={epoch ? `SPHEREx detector ${det} image of ${name ?? 'the requested position'}, ${label}, plate ${cur + 1} of ${epochs.length}${diff ? ', shown as a difference' : ''}` : 'No image yet'} />
          {epoch && (
            <svg viewBox={`-0.5 -0.5 ${grid.n} ${grid.n}`} aria-hidden="true">
              {stars.map((s) => (
                <g key={s.id}>
                  {s.fast && <line className="track" x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} />}
                  <circle className={`ring${s.fast ? ' ring--fast' : ''}`} cx={s.p[0]} cy={s.p[1]} r={Math.max(0.9, grid.n * 0.011)} />
                </g>
              ))}
              {mark && (
                <g className="tick">
                  <line x1={mark.x + grid.n * 0.03} y1={mark.y} x2={mark.x + grid.n * 0.075} y2={mark.y} />
                  <line x1={mark.x} y1={mark.y - grid.n * 0.03} x2={mark.x} y2={mark.y - grid.n * 0.075} />
                </g>
              )}
            </svg>
          )}
          {!epoch && (
            <p className="plate__msg">
              {error ? error : empty ? `No detector ${det} exposures cover this position yet.` : records ? 'Reading pixels from the archive' : 'Asking the archive which exposures cover this position'}
            </p>
          )}
          {epoch && <button type="button" className="plate__hit" onClick={clickPlate} aria-label="Mark a position on the plate" />}
          <span className="plate__compass" aria-hidden="true">N up, E left</span>
          {epoch && (
            <div className="plate__edge" aria-hidden="true">
              <span><b>{cur + 1}/{epochs.length}</b> {label}</span>
              <span>{epoch.frames.length} exp, {epoch.waveMin.toFixed(2)} to {epoch.waveMax.toFixed(2)} µm</span>
            </div>
          )}
        </div>

        <div className="transport">
          <div className="transport__btns">
            <button type="button" onClick={() => { setPlaying(false); step(-1); }} aria-label="Previous plate"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11 1v12L3 7z" /><rect x="1" y="1" width="2" height="12" /></svg></button>
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
              {playing ? <svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" /><rect x="8.5" y="1" width="3.5" height="12" /></svg> : <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1l9 6-9 6z" /></svg>}
            </button>
            <button type="button" onClick={() => { setPlaying(false); step(1); }} aria-label="Next plate"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1v12l8-6z" /><rect x="11" y="1" width="2" height="12" /></svg></button>
          </div>
          <div className="epochs" role="group" aria-label="Plates">
            {epochs.length <= 24 && epochs.map((e, i) => (
              <button key={e.key} type="button" aria-pressed={i === cur} aria-label={`Plate ${i + 1}, ${isoDate(e.mjd)}`} onClick={() => { setPlaying(false); setIdx(i); }}>{i + 1}</button>
            ))}
            {epochs.length > 24 && <span className="mono">{cur + 1} of {epochs.length}</span>}
          </div>
        </div>
        <div className="status" aria-live="polite">
          {error && <p className="note note--warn">{error} <button type="button" className="inline-link" onClick={() => location.reload()}>Try again</button></p>}
          {records && current && progress.total > 0 && (
            <>
              <span>{loading ? `Loading ${progress.done} of ${progress.total} exposures` : `${frames.length} exposures in ${epochs.length} plates${span ? `, ${span.toFixed(1)} years apart` : ''}`}{progress.failed ? `, ${progress.failed} failed` : ''}</span>
              {loading && <div className="status__bar"><i style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>}
            </>
          )}
        </div>
      </div>

      <div className="viewer__panel">
        <section className="panel" aria-label="Position">
          <h1>{name ?? 'Sky position'}</h1>
          <p className="coords">{formatRa(ra)}<br />{formatDec(dec)}</p>
          <p className="note mono">{ra.toFixed(5)}, {dec >= 0 ? '+' : ''}{dec.toFixed(5)} deg</p>
          {!embed && <Seek hint={false} initial={name ?? `${ra.toFixed(5)} ${dec >= 0 ? '+' : ''}${dec.toFixed(5)}`} />}
        </section>

        <section className="panel" aria-label="Detector">
          <h2 className="panel__h">Detector and wavelength</h2>
          <Ruler selected={det} onSelect={setDet} counts={records ? counts : undefined} />
        </section>

        <section className="panel" aria-label="Plates">
          <h2 className="panel__h">Group exposures by</h2>
          <div className="seg" role="group" aria-label="Grouping">
            {MODES.map((m) => <button key={m.v} type="button" aria-pressed={mode === m.v} onClick={() => { setMode(m.v); setIdx(0); }}>{m.l}</button>)}
          </div>
          <p className="note">{modeHint}</p>
          <label className="check"><input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} />Subtract the first plate</label>
          <label className="check"><input type="checkbox" checked={ends} onChange={(e) => setEnds(e.target.checked)} />Blink only first and last</label>
        </section>

        <section className="panel" aria-label="Display">
          <h2 className="panel__h">Display</h2>
          <div className="seg" role="group" aria-label="Field of view">
            {FOVS.map((f) => <button key={f.v} type="button" aria-pressed={fov === f.v} onClick={() => setFov(f.v)} aria-label={`Field of view ${f.l.replace('′', ' arcminutes')}`}>{f.l}</button>)}
          </div>
          <label className="field"><span>Speed</span>
            <input type="range" min={200} max={1860} step={20} value={2200 - hold} onChange={(e) => setHold(2200 - Number(e.target.value))} aria-valuetext={`${(hold / 1000).toFixed(2)} seconds per plate`} />
            <output>{(hold / 1000).toFixed(2)} s</output></label>
          <label className="field"><span>Contrast</span>
            <input type="range" min={-2} max={3} step={0.1} value={Math.log2(gain)} onChange={(e) => setGain(2 ** Number(e.target.value))} aria-valuetext={`${gain.toFixed(1)} times`} />
            <output>{gain.toFixed(1)}&times;</output></label>
          <label className="check"><input type="checkbox" checked={showGaia} onChange={(e) => setShowGaia(e.target.checked)} />Gaia DR3 stars, moved to each plate&rsquo;s date</label>
          {showGaia && gaia && <p className="note">{stars.length} stars. Red rings move faster than 0.1&Prime; a year; the dashed line is their path across these plates.</p>}
          {gaiaErr && <p className="note note--warn">{gaiaErr}</p>}
        </section>

        {mark && markSky && (
          <section className="panel" aria-label="Marked position">
            <h2 className="panel__h">Your mark</h2>
            <p className="coords">{formatRa(markSky.ra)}<br />{formatDec(markSky.dec)}</p>
            <div className="links">
              <a className="inline-link" href={`${embed ? '/embed' : '/view'}?ra=${markSky.ra.toFixed(5)}&dec=${markSky.dec.toFixed(5)}&fov=${fov}&det=${det}`}>Centre here</a>
              <a className="inline-link" target="_blank" rel="noopener noreferrer" href={`https://simbad.cfa.harvard.edu/simbad/sim-coo?Coord=${markSky.ra.toFixed(5)}+${markSky.dec.toFixed(5)}&Radius=20&Radius.unit=arcsec`}>SIMBAD</a>
              <a className="inline-link" target="_blank" rel="noopener noreferrer" href={`https://vizier.cfa.harvard.edu/viz-bin/VizieR-4?-c=${markSky.ra.toFixed(5)}+${markSky.dec.toFixed(5)}&-c.rs=10`}>VizieR</a>
              <a className="inline-link" target="_blank" rel="noopener noreferrer" href={`http://byw.tools/wiseview#ra=${markSky.ra.toFixed(5)}&dec=${markSky.dec.toFixed(5)}&size=${fov}`}>WiseView</a>
              <button type="button" className="inline-link" onClick={() => setMark(null)}>Clear</button>
            </div>
          </section>
        )}

        {epoch && (
          <section className="panel" aria-label="This plate">
            <h2 className="panel__h">This plate</h2>
            <dl className="meta">
              <dt>Dates</dt><dd>{label}</dd>
              <dt>MJD</dt><dd>{epoch.mjd.toFixed(3)}</dd>
              <dt>Exposures</dt><dd>{epoch.frames.length} &times; {Number.isFinite(epoch.frames[0].exposure) ? epoch.frames[0].exposure.toFixed(0) : '114'} s</dd>
              <dt>Wavelength here</dt><dd>{epoch.waveMin.toFixed(3)} to {epoch.waveMax.toFixed(3)} µm</dd>
              <dt>Median PSF</dt><dd>{Number.isFinite(fwhm) ? `${fwhm.toFixed(1)}″` : 'n/a'}</dd>
              <dt>Sky removed</dt><dd>{epoch.frames[0].background.toFixed(3)} MJy/sr</dd>
              <dt>Release</dt><dd>{[...new Set(epoch.frames.map((f) => f.rec.rel.replace('spherex_', '')))].join(', ')}</dd>
              <dt>First exposure</dt><dd><a className="inline-link" target="_blank" rel="noopener noreferrer" href={`https://irsa.ipac.caltech.edu/ibe/data/spherex/${epoch.frames[0].rec.key}`}>{epoch.frames[0].rec.id}</a></dd>
            </dl>
            <p className="note">Grey pixels have no data: a star that overflowed the detector, or a masked pixel.</p>
          </section>
        )}

        <section className="panel" aria-label="Spectrum">
          <h2 className="panel__h">Spectrum {mark ? 'at your mark' : 'at the centre'}</h2>
          {spec && <Spectrum points={spec.points} />}
          {spec && spec.done < spec.total && <p className="note" aria-live="polite">Measuring {spec.done} of {spec.total} exposures</p>}
          {spec && spec.done === spec.total && <p className="note">{spec.points.length} measurements. Filled points are the latest pass, open points the first. Simple aperture photometry, good for shape only.</p>}
          <button type="button" className="btn btn--quiet" onClick={measure} disabled={!records}><Hop tick={false}>{spec ? 'Measure again' : 'Measure across all 102 bands'}</Hop></button>
        </section>

        <section className="panel" aria-label="Share">
          <h2 className="panel__h">Share</h2>
          <div className="links">
            <button type="button" className="inline-link" onClick={() => copy('link')}>{copied === 'link' ? 'Link copied' : 'Copy link'}</button>
            <button type="button" className="inline-link" onClick={() => copy('embed')}>{copied === 'embed' ? 'Embed code copied' : 'Copy embed code'}</button>
            <button type="button" className="inline-link" onClick={savePng} disabled={!epoch}>Save this plate as PNG</button>
          </div>
          <p className="note">Keys: space plays, arrows step, 1 to 6 pick a detector, D subtracts.</p>
        </section>
      </div>
    </div>
  );
}
