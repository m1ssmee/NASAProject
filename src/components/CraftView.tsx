'use client';
// The spacecraft on its own, large. Drag or use the arrow keys to turn it; a parent can ask it
// to turn to a given view (used by the parts list on the observatory page).
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

export interface CraftAngle { x: number; y: number }

export function CraftView({ target, onUserTurn }: { target?: CraftAngle | null; onUserTurn?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rot = useRef<CraftAngle>({ x: 0.34, y: 0.75 });
  const held = useRef(false); // a part is selected: no idle spin
  const userTurn = useRef(onUserTurn);
  const [failed, setFailed] = useState(false);

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
        const size = () => {
          const r = el.getBoundingClientRect();
          renderer.setSize(r.width, r.height, false);
          stage.camera.aspect = r.width / Math.max(1, r.height);
          // Keep the whole observatory in frame in tall, narrow boxes too.
          stage.camera.position.set(0, 0, stage.camera.aspect < 1 ? 9.2 / stage.camera.aspect : 9.2);
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
          stage.craft.rotation.set(rot.current.x, rot.current.y, -0.14);
          renderer.render(stage.scene, stage.camera);
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
      {failed && <p className="sky__fallback">The model needs WebGL, which this browser has switched off. The notes on each part are in the list.</p>}
    </div>
  );
}
