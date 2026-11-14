'use client';
// The spacecraft on its own, large: drag to turn it. Used to inspect the model.
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

export function CraftView() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

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
        stage.camera.position.set(0, 0, 9.5);
        const size = () => {
          const r = el.getBoundingClientRect();
          renderer.setSize(r.width, r.height, false);
          stage.camera.aspect = r.width / Math.max(1, r.height);
          stage.camera.updateProjectionMatrix();
        };
        size();
        const ro = new ResizeObserver(size);
        ro.observe(el);

        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const q = new URLSearchParams(location.search);
        const rot = { x: Number(q.get('x') ?? 0.34), y: Number(q.get('y') ?? 0.75) };
        let drag: { x: number; y: number } | null = null;
        let idle = q.has('y') ? Infinity : 0;
        const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); idle = gsap.ticker.time + 4; };
        const move = (e: PointerEvent) => {
          if (!drag) return;
          rot.y += (e.clientX - drag.x) * 0.008;
          rot.x = Math.max(-1.4, Math.min(1.4, rot.x + (e.clientY - drag.y) * 0.008));
          drag = { x: e.clientX, y: e.clientY };
          idle = gsap.ticker.time + 4;
        };
        const up = () => { drag = null; };
        const key = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') rot.y -= 0.15; else if (e.key === 'ArrowRight') rot.y += 0.15;
          else if (e.key === 'ArrowUp') rot.x = Math.max(-1.4, rot.x - 0.15); else if (e.key === 'ArrowDown') rot.x = Math.min(1.4, rot.x + 0.15);
          else return;
          e.preventDefault();
          idle = gsap.ticker.time + 4;
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('keydown', key);
        const tick = (time: number) => {
          if (document.hidden) return;
          if (!reduced && !drag && time > idle) rot.y += 0.0025;
          stage.craft.rotation.set(rot.x, rot.y, -0.14);
          renderer.render(stage.scene, stage.camera);
        };
        gsap.ticker.add(tick);
        stop = () => {
          gsap.ticker.remove(tick);
          ro.disconnect();
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
      {failed && <p className="sky__fallback">The model needs WebGL, which this browser has switched off.</p>}
    </div>
  );
}
