'use client';
// The spacecraft on its own, large. Drag or use the arrow keys to turn it; a parent can ask it
// to turn to a given view (used by the parts list on the observatory page).
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

export interface CraftAngle { x: number; y: number }

// Pulled apart, each piece moves this far along the axis (and the solar panel also sideways),
// in metres. Chosen so the stack stays centred on where the whole observatory was.
const APART: Record<string, [number, number]> = {
  telescope: [0, 1.9], shield2: [0, 1.0], shield1: [0, 0.2], shield0: [0, -0.55], radiators: [0, -1.1], bus: [0, -1.85], array: [-0.9, -1.85],
};
// A name beside each piece once they are apart: which piece, and how high up it its middle is.
const NAMES: [string, string, number][] = [
  ['telescope', 'Telescope', 0.65], ['shield1', 'Photon shields', 0.75], ['radiators', 'V-groove radiators', -0.1], ['bus', 'Spacecraft bus', -0.68], ['array', 'Solar array', -1.3],
];

export function CraftView({ target, onUserTurn, explodable = false }: { target?: CraftAngle | null; onUserTurn?: () => void; explodable?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rot = useRef<CraftAngle>({ x: 0.34, y: 0.75 });
  const held = useRef(false); // a part is selected: no idle spin
  const userTurn = useRef(onUserTurn);
  const [failed, setFailed] = useState(false);
  const [apart, setApart] = useState(false);
  const open = useRef({ v: 0 }); // 0 assembled, 1 pulled apart
  const tags = useRef<HTMLUListElement>(null);

  useEffect(() => { userTurn.current = onUserTurn; }, [onUserTurn]);

  // Turn to the requested view by the shorter way round.
  useEffect(() => {
    held.current = !!target;
    if (!target) return;
    const r = rot.current;
    const tau = Math.PI * 2;
    const y = r.y + ((((target.y - r.y) % tau) + tau * 1.5) % tau) - Math.PI;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(r, { x: target.x, y, duration: reduced ? 0 : 1.1, ease: 'power3.inOut' });
    return () => { tween.kill(); };
  }, [target]);

  // Pull it apart or put it back; side-on while apart, so the stack reads top to bottom.
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(open.current, { v: apart ? 1 : 0, duration: reduced ? 0 : 1.5, ease: 'power3.inOut' });
    const turn = apart ? gsap.to(rot.current, { x: 0.22, duration: reduced ? 0 : 1.5, ease: 'power3.inOut' }) : null;
    return () => { tween.kill(); turn?.kill(); };
  }, [apart]);

  useEffect(() => {
    let dead = false;
    let stop = () => {};
    const el = host.current!, cv = canvas.current!;
    (async () => {
      try {
        const [THREE, { buildCraftStage }] = await Promise.all([import('three'), import('@/sky/stage')]);
        if (dead) return;
        const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        const stage = buildCraftStage(renderer);
        const pieces = Object.entries(APART).map(([name, by]) => [stage.craft.getObjectByName(name)!, by] as const);
        const at = new THREE.Vector3();
        let far = 9.2, was = -1;
        const size = () => {
          const r = el.getBoundingClientRect();
          renderer.setSize(r.width, r.height, false);
          stage.camera.aspect = r.width / Math.max(1, r.height);
          // Keep the whole observatory in frame in tall, narrow boxes too.
          far = stage.camera.aspect < 1 ? 9.2 / stage.camera.aspect : 9.2;
          was = -1; // place the camera again
          stage.camera.updateProjectionMatrix();
        };
        size();
        const ro = new ResizeObserver(size);
        ro.observe(el);

        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const q = new URLSearchParams(location.search);
        if (q.has('x')) rot.current.x = Number(q.get('x'));
        if (q.has('y')) rot.current.y = Number(q.get('y'));
        let drag: { x: number; y: number } | null = null;
        let idle = q.has('y') ? Infinity : 0;
        const touched = () => { idle = gsap.ticker.time + 4; held.current = false; userTurn.current?.(); };
        const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); };
        const move = (e: PointerEvent) => {
          if (!drag) return;
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) < 1) return;
          gsap.killTweensOf(rot.current);
          rot.current.y += dx * 0.008;
          rot.current.x = Math.max(-1.4, Math.min(1.4, rot.current.x + dy * 0.008));
          drag = { x: e.clientX, y: e.clientY };
          touched();
        };
        const up = () => { drag = null; };
        const key = (e: KeyboardEvent) => {
          const r = rot.current;
          if (e.key === 'ArrowLeft') r.y -= 0.15; else if (e.key === 'ArrowRight') r.y += 0.15;
          else if (e.key === 'ArrowUp') r.x = Math.max(-1.4, r.x - 0.15); else if (e.key === 'ArrowDown') r.x = Math.min(1.4, r.x + 0.15);
          else return;
          e.preventDefault();
          gsap.killTweensOf(r);
          touched();
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('keydown', key);
        let visible = true;
        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
        io.observe(el);
        const tick = (time: number) => {
          if (document.hidden || !visible) return;
          if (!reduced && !drag && !held.current && time > idle) rot.current.y += 0.0025;
          stage.craft.rotation.set(rot.current.x, rot.current.y, -0.14 * (1 - open.current.v));
          const e = open.current.v;
          if (e !== was) { // the pieces slide along the axis and the camera steps back to keep them in view
            was = e;
            pieces.forEach(([g, [dx, dy]]) => g.position.set(dx * e, dy * e, 0));
            stage.camera.position.set(0, 0, far * (1 + 0.6 * e));
          }
          renderer.render(stage.scene, stage.camera);
          // Names ride beside their pieces, level with each one's middle.
          const list = tags.current;
          if (list) {
            list.style.opacity = String(Math.max(0, e * 2 - 1));
            if (e > 0.5) NAMES.forEach(([name, , y], i) => {
              const g = stage.craft.getObjectByName(name)!, r = el.getBoundingClientRect();
              at.set(name === 'array' ? -1 : 0, y - 0.2, 0);
              g.localToWorld(at).project(stage.camera);
              (list.children[i] as HTMLElement).style.translate = `${(at.x * 0.5 + 0.5) * r.width}px ${(0.5 - at.y * 0.5) * r.height}px`;
            });
          }
        };
        gsap.ticker.add(tick);
        stop = () => {
          gsap.ticker.remove(tick);
          ro.disconnect();
          io.disconnect();
          el.removeEventListener('pointerdown', down);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          el.removeEventListener('keydown', key);
          stage.dispose();
          renderer.dispose();
        };
        if (dead) stop();
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => { dead = true; stop(); };
  }, []);

  return (
    <div className="craftview" ref={host} tabIndex={0} role="application" aria-label="Model of the SPHEREx observatory. Drag, or use the arrow keys, to turn it.">
      <canvas ref={canvas} aria-hidden="true" />
      {explodable && !failed && (
        <>
          <ul ref={tags} className="craftview__tags" aria-hidden="true">
            {NAMES.map(([part, name]) => <li key={part}><span>{name}</span></li>)}
          </ul>
          <button type="button" className="btn btn--quiet craftview__apart" aria-pressed={apart} onPointerDown={(e) => e.stopPropagation()} onClick={() => setApart(!apart)}>
            {apart ? 'Put it back together' : 'Pull it apart'}
          </button>
        </>
      )}
      {failed && <p className="sky__fallback">The model needs WebGL, which this browser has switched off. The notes on each part are in the list.</p>}
    </div>
  );
}
