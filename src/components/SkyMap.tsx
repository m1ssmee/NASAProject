'use client';
// The finder: the real sky, drawn from the bright star catalogue. Drag to turn it, pick a
// star with a note to read about it, pick anywhere to develop a plate from that spot.
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notedStars, viewerHref, type NotedStar } from '@/data/stars';
import { formatDec, formatRa } from '@/lib/astro';
import { FOV_MAX, FOV_MIN, pan, toScreen, toSky, type View } from '@/sky/project';
import type { Sky } from '@/sky/scene';
import { Hop } from './Hop';

export interface FreshField { ra: number; dec: number; date: string; count: number }

type Pick =
  | { kind: 'star'; star: NotedStar }
  | { kind: 'point'; ra: number; dec: number; near?: { name: string; type: string } };

const START = { ra: 262, dec: 8, fov: 62 }; // Ophiuchus, with Barnard's Star near the middle
const FIELD_DEG = 3.5; // one SPHEREx exposure covers 3.5 degrees

export function SkyMap({ fresh = [] }: { fresh?: FreshField[] }) {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ ...START, width: 1, height: 1 });
  const sky = useRef<Sky | null>(null);
  const dirty = useRef(true);
  const touched = useRef(0);
  const pickRef = useRef<Pick | null>(null);
  const [pick, setPickState] = useState<Pick | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'nogl'>('loading');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPick = useCallback((p: Pick | null) => { pickRef.current = p; setPickState(p); dirty.current = true; }, []);
  const hold = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null; };
  const release = () => { hold(); closeTimer.current = setTimeout(() => { if (pickRef.current?.kind === 'star') setPick(null); }, 260); };

  // The card mounts a render after the pick is set: place it once it exists.
  useEffect(() => { dirty.current = true; }, [pick]);

  // Boot: the 3D code and the catalogue load after the page's text is on screen.
  useEffect(() => {
    let dead = false;
    let created: Sky | null = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = host.current!, cv = canvas.current!;
    // While the opening plays the canvas covers the whole window, so it is measured against that.
    let fullscreen = false;
    const measure = () => {
      const r = el.getBoundingClientRect();
      view.current.width = Math.max(1, Math.round(fullscreen ? innerWidth : r.width));
      view.current.height = Math.max(1, Math.round(fullscreen ? innerHeight : r.height));
      dirty.current = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    // Markers and the card are moved by hand each frame: no React render while dragging.
    const place = () => {
      const v = view.current;
      const s = sky.current;
      if (!layer.current || !s) return;
      const kids = layer.current.children;
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i] as HTMLElement;
        const ra = Number(k.dataset.ra), dec = Number(k.dataset.dec);
        const p = toScreen(v, ra, dec);
        const on = !!p && p.x > -40 && p.x < v.width + 40 && p.y > -40 && p.y < v.height + 40;
        k.style.visibility = on ? 'visible' : 'hidden';
        if (on) {
          k.style.translate = `${p!.x}px ${p!.y}px`;
          if (k.dataset.field) k.style.setProperty('--side', `${(FIELD_DEG / v.fov) * Math.min(v.width, v.height)}px`);
        }
      }
      const c = card.current, pk = pickRef.current;
      if (c && pk) {
        const at = pk.kind === 'star' ? pk.star : pk;
        const idx = pk.kind === 'star' ? notedStars.indexOf(pk.star) : -1;
        const pos = idx >= 0 ? s.noted[idx] : at;
        const p = toScreen(v, pos.ra, pos.dec);
        if (p) {
          const left = p.x > v.width * 0.62;
          const up = p.y > v.height * 0.55;
          c.style.translate = `${Math.min(v.width - 12, Math.max(12, p.x))}px ${Math.min(v.height - 12, Math.max(12, p.y))}px`;
          c.dataset.side = `${left ? 'l' : 'r'}${up ? 'u' : 'd'}`;
        }
      }
    };

    let intro: gsap.core.Timeline | null = null;
    // Phones get a lighter loop: half the frame rate and no idle drift, so page scrolling stays smooth.
    const light = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    let frame = 0;
    const tick = (time: number) => {
      const s = sky.current;
      if (!s || (!visible && !fullscreen) || document.hidden) return;
      if (light && !fullscreen && !dirty.current && frame++ % 2) return;
      const v = view.current;
      // Idle: the sky turns very slowly until someone touches it.
      if (!light && !reduced && !intro?.isActive() && !pickRef.current && time - touched.current > 4) {
        v.ra = (v.ra + 0.004) % 360;
        dirty.current = true;
      }
      if (dirty.current) { s.setView(v); place(); dirty.current = false; }
      s.render(time);
    };

    (async () => {
      try {
        const [{ createSky }, buf] = await Promise.all([
          import('@/sky/scene'),
          fetch('/sky/stars.bin').then((r) => { if (!r.ok) throw new Error('catalogue'); return r.arrayBuffer(); }),
        ]);
        if (dead) return;
        created = createSky(cv, new Float32Array(buf), notedStars);
        sky.current = created;
        created.setShine(reduced ? 0 : 1);
        // Snap marker positions to the catalogue dots.
        const kids = layer.current?.querySelectorAll<HTMLElement>('[data-star]') ?? [];
        kids.forEach((k, i) => { k.dataset.ra = String(created!.noted[i].ra); k.dataset.dec = String(created!.noted[i].dec); });
        dirty.current = true;
        gsap.ticker.add(tick);
        setState('ready');
        intro = playIntro(created, reduced, (full) => { fullscreen = full; measure(); });
      } catch {
        endIntro();
        if (!dead) setState('nogl');
      }
    })();

    return () => {
      dead = true;
      ro.disconnect();
      io.disconnect();
      gsap.ticker.remove(tick);
      intro?.kill();
      // Lift the veil if the map is really gone (leaving the page), not on a development re-mount.
      setTimeout(() => { if (!document.querySelector('.sky')) endIntro(); }, 60);
      created?.dispose();
      sky.current = null;
    };
  }, []);

  // Pointer: drag turns the sky; a click without a drag picks.
  const drag = useRef<{ x: number; y: number; moved: number; id: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    touched.current = gsap.ticker.time;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    const p = pan(view.current, dx, dy);
    view.current.ra = p.ra; view.current.dec = p.dec;
    dirty.current = true;
    touched.current = gsap.ticker.time;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved > 6) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const s = toSky(view.current, e.clientX - r.left, e.clientY - r.top);
    setPick({ kind: 'point', ra: s.ra, dec: s.dec });
    // Say what is there, if a catalogue knows. The card works without the answer.
    const radius = Math.max(20, Math.round((view.current.fov / Math.min(view.current.width, view.current.height)) * 3600 * 14));
    fetch(`/api/resolve?ra=${s.ra.toFixed(5)}&dec=${s.dec.toFixed(5)}&r=${Math.min(radius, 1800)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((j) => {
        const cur = pickRef.current;
        if (j?.name && cur?.kind === 'point' && cur.ra === s.ra) setPick({ ...cur, near: { name: j.name, type: j.type ?? '' } });
      })
      .catch(() => {});
  };

  const nudge = (dra: number, ddec: number, zoom = 1) => {
    const v = view.current;
    v.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, v.fov * zoom));
    const p = pan(v, (dra * Math.min(v.width, v.height)) / 6, (ddec * Math.min(v.width, v.height)) / 6);
    v.ra = p.ra; v.dec = p.dec;
    dirty.current = true;
    touched.current = gsap.ticker.time;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') nudge(1, 0); else if (e.key === 'ArrowRight') nudge(-1, 0);
    else if (e.key === 'ArrowUp') nudge(0, 1); else if (e.key === 'ArrowDown') nudge(0, -1);
    else if (e.key === '+' || e.key === '=') nudge(0, 0, 0.8); else if (e.key === '-') nudge(0, 0, 1.25);
    else if (e.key === 'Escape') setPick(null);
    else return;
    e.preventDefault();
  };
  // Pinch and ctrl-wheel zoom; a plain wheel scrolls the page as usual.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const v = view.current;
      v.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, v.fov * Math.exp(e.deltaY * 0.01)));
      dirty.current = true;
      touched.current = gsap.ticker.time;
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  // "Blink": a plate grows out of the chosen point, then the viewer opens.
  const develop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const href = e.currentTarget.getAttribute('href')!;
    const c = card.current?.getBoundingClientRect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !c) { router.push(href); return; }
    const plate = document.createElement('div');
    plate.className = 'develop';
    plate.style.left = `${c.left}px`;
    plate.style.top = `${c.top}px`;
    document.body.appendChild(plate);
    const side = Math.hypot(innerWidth, innerHeight) * 2.1;
    router.prefetch(href);
    gsap.timeline()
      .fromTo(plate, { width: 6, height: 6, xPercent: -50, yPercent: -50 }, { width: side, height: side, duration: 0.55, ease: 'expo.in' })
      .call(() => router.push(href))
      .to(plate, { autoAlpha: 0, duration: 0.35, delay: 0.45 })
      .call(() => plate.remove());
  };

  const at = pick ? (pick.kind === 'star' ? pick.star : pick) : null;
  return (
    <div className="sky" ref={host} data-state={state}>
      <canvas ref={canvas} className="sky__canvas" aria-hidden="true" />
      <div
        className="sky__pad" role="application" tabIndex={0}
        aria-label="Sky map. Arrow keys turn the sky, plus and minus zoom. The stars with notes are also listed below the map."
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }} onKeyDown={onKey}
      />
      <div className="sky__layer" ref={layer}>
        {notedStars.map((s) => (
          <button
            key={s.id} type="button" data-star data-ra={s.ra} data-dec={s.dec}
            className={`sky__star${s.target ? ' sky__star--target' : ''}${pick?.kind === 'star' && pick.star === s ? ' is-open' : ''}`}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') { hold(); setPick({ kind: 'star', star: s }); } }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') release(); }}
            onFocus={() => { hold(); setPick({ kind: 'star', star: s }); }}
            onClick={() => { hold(); setPick({ kind: 'star', star: s }); }}
            aria-label={`${s.name}. ${s.kind}.`}
          >
            {s.target && <span className="sky__label" aria-hidden="true">{s.name}</span>}
          </button>
        ))}
        {fresh.map((f) => (
          <span key={`${f.ra},${f.dec}`} className="sky__field" data-field data-ra={f.ra} data-dec={f.dec} aria-hidden="true" />
        ))}
        {pick?.kind === 'point' && <span className="sky__mark" data-ra={pick.ra} data-dec={pick.dec} aria-hidden="true" />}
      </div>

      {at && pick && (
        <div className="sky__card on-glass" ref={card} role="dialog" aria-label={pick.kind === 'star' ? pick.star.name : 'Chosen position'}
          onPointerEnter={hold} onPointerLeave={(e) => { if (e.pointerType === 'mouse') release(); }}>
          <div className="sky__cardin">
            {pick.kind === 'star' ? (
              <>
                <p className="sky__name">{pick.star.name}</p>
                <p className="sky__kind">{pick.star.kind}{pick.star.distance ? `, ${pick.star.distance}` : ''}</p>
                <p className="sky__note">{pick.star.note}</p>
              </>
            ) : (
              <>
                <p className="sky__name">{pick.near?.name ?? 'This patch of sky'}</p>
                {pick.near?.type && <p className="sky__kind">{pick.near.type}, the nearest catalogued object</p>}
              </>
            )}
            <p className="sky__coords">{formatRa(at.ra, 1)} {formatDec(at.dec, 0)}</p>
            <div className="sky__links">
              <a className="btn" href={viewerHref(pick.kind === 'star' ? { ...at, name: pick.star.name, det: pick.star.det } : { ...at, name: pick.near?.name })} onClick={develop} data-no-transition>
                <Hop tick={false}>{pick.kind === 'star' ? 'Blink this star' : 'Blink this patch'}</Hop>
              </a>
              {pick.kind === 'star' && pick.star.target && <a className="inline-link" href={`/targets/${pick.star.target}`}>About this target</a>}
              <button type="button" className="inline-link" onClick={() => setPick(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="sky__tools" role="group" aria-label="Map controls">
        <button type="button" onClick={() => nudge(0, 0, 0.75)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => nudge(0, 0, 1.33)} aria-label="Zoom out">&minus;</button>
        <button type="button" onClick={() => nudge(1, 0)} aria-label="Turn east">&larr;</button>
        <button type="button" onClick={() => nudge(-1, 0)} aria-label="Turn west">&rarr;</button>
        <button type="button" onClick={() => nudge(0, 1)} aria-label="Turn north">&uarr;</button>
        <button type="button" onClick={() => nudge(0, -1)} aria-label="Turn south">&darr;</button>
      </div>
      {state === 'nogl' && <p className="sky__fallback">This is a still picture of the sky: the live map needs WebGL, which this browser has switched off. The search box and the list of stars below work without it.</p>}
    </div>
  );
}

/** Lift the dark veil that the page starts under (set by the inline script in the layout). */
function endIntro() {
  document.documentElement.classList.remove('intro-pending', 'intro-veil');
}

/**
 * The opening. The page loads fully dark with a few stars twinkling; SPHEREx appears, wanders
 * along a path that is different every time, settles into the header as the logo mark, and
 * then the site fades in. Plays when the home page is loaded directly; any click, key or scroll
 * skips it; never under reduced motion.
 */
function playIntro(sky: Sky, reduced: boolean, setFullscreen: (on: boolean) => void): gsap.core.Timeline | null {
  const html = document.documentElement;
  if (reduced || !html.classList.contains('intro-pending')) { endIntro(); return null; }
  const { craft, craftCamera } = sky;
  setFullscreen(true);
  sky.setStars(0);

  // Screen position to a point in front of the craft camera at a given depth.
  const at = (nx: number, ny: number, depth: number) => {
    const halfH = Math.tan((craftCamera.fov * Math.PI) / 360) * depth;
    return { x: nx * halfH * (innerWidth / innerHeight), y: ny * halfH, z: -depth };
  };
  const mark = document.querySelector<HTMLElement>('.wordmark__craft')?.getBoundingClientRect();
  const end = at(
    mark ? ((mark.left + mark.width / 2) / innerWidth) * 2 - 1 : -0.94,
    mark ? 1 - ((mark.top + mark.height / 2) / innerHeight) * 2 : 0.94,
    64,
  );
  // A different wander each time: start somewhere in the lower right, swing through two random
  // points, then home in on the logo.
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const start = at(rnd(0.15, 0.7), rnd(-0.6, -0.1), 15);
  const mid1 = at(rnd(-0.55, 0.1), rnd(-0.35, 0.5), 19);
  const mid2 = at(rnd(0.0, 0.6), rnd(0.05, 0.65), 27);

  sky.showCraft(true);
  craft.position.set(start.x, start.y, start.z);
  craft.scale.setScalar(0.001);
  const spin = { x: craft.rotation.x, y: craft.rotation.y, z: craft.rotation.z };

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    off();
    sky.showCraft(false);
    craft.scale.setScalar(1);
    craft.rotation.set(spin.x, spin.y, spin.z);
    setFullscreen(false);
    html.classList.remove('intro-pending'); // canvas returns to its place, still under the veil
    const stars = { a: 0 };
    gsap.to(stars, { a: 1, duration: 0.9, ease: 'power2.out', onUpdate: () => sky.setStars(stars.a) });
    requestAnimationFrame(() => html.classList.remove('intro-veil')); // the site fades in
  };
  const tl = gsap.timeline({ onComplete: finish })
    .to({}, { duration: 0.9 }) // dark, stars twinkling
    .to(craft.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.6)' })
    .to(craft.position, { ...mid1, duration: 0.8, ease: 'sine.inOut' }, '<0.1')
    .to(craft.position, { ...mid2, duration: 0.8, ease: 'sine.inOut' })
    .to(craft.position, { ...end, duration: 0.95, ease: 'power2.inOut' })
    .to(craft.scale, { x: 0.75, y: 0.75, z: 0.75, duration: 0.5, ease: 'power2.in' }, '<0.45')
    .to(craft.rotation, { y: spin.y + 2.6, z: spin.z + 0.9, x: spin.x - 0.35, duration: 2.6, ease: 'none' }, 0.9);
  const skip = () => { tl.kill(); finish(); };
  const off = () => { removeEventListener('pointerdown', skip); removeEventListener('keydown', skip); removeEventListener('wheel', skip); removeEventListener('touchstart', skip); };
  addEventListener('pointerdown', skip, { once: true });
  addEventListener('keydown', skip, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchstart', skip, { once: true, passive: true });
  return tl;
}
