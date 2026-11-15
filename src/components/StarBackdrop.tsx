'use client';
// The sky behind every page: the same star catalogue as the map, drawn once on a plain canvas
// (no 3D), a little taller than the window so it can drift as the page scrolls.
import { useEffect, useRef } from 'react';

const CENTRE = { ra: 84, dec: 2 }; // Orion's belt: a rich, familiar piece of sky
const SPAN = 105; // degrees of sky across the window

export function StarBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    let cat: Float32Array | null = null;
    const draw = () => {
      if (!cat) return;
      const w = innerWidth, h = Math.round(innerHeight * 1.4), k = Math.min(devicePixelRatio || 1, 2);
      cv.width = w * k; cv.height = h * k;
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
      const g = cv.getContext('2d')!;
      g.scale(k, k);
      const scale = Math.max(w, 900) / SPAN; // px per degree; a phone shows a narrower piece, not smaller stars
      for (let i = 0; i < cat.length; i += 4) {
        const mag = cat[i + 2];
        const dra = ((cat[i] - CENTRE.ra + 540) % 360) - 180;
        const x = w / 2 - dra * scale * Math.cos((cat[i + 1] * Math.PI) / 180), y = h / 2 - (cat[i + 1] - CENTRE.dec) * scale;
        if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
        const bright = Math.min(1, Math.pow(2.512, (3.2 - mag) * 0.55)), bv = cat[i + 3];
        g.globalAlpha = Math.min(1, 0.18 + bright * 0.8);
        g.fillStyle = bv > 1 ? '#ffd9b8' : bv < 0.1 ? '#cfdcff' : '#f0f1ee';
        g.beginPath();
        g.arc(x, y, 0.45 + bright * 1.25, 0, 6.2832);
        g.fill();
      }
      cv.classList.add('is-on');
    };
    // The sky slides up a little as the page goes down, and stops when it runs out.
    const drift = () => { cv.style.translate = `0 ${-Math.min(scrollY * 0.06, innerHeight * 0.4)}px`; };
    fetch('/sky/stars.bin').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => { cat = new Float32Array(b); draw(); }).catch(() => {});
    addEventListener('resize', draw);
    addEventListener('scroll', drift, { passive: true });
    return () => { removeEventListener('resize', draw); removeEventListener('scroll', drift); };
  }, []);
  return <canvas ref={ref} className="backdrop" aria-hidden="true" />;
}
