'use client';
// When the scroll comes to rest near a chapter it settles on it. On the home page each chapter
// fills the window; on the targets page the sky map settles in the middle of it. Only a nudge (within a quarter of a window): never a trap.
// Desktop only; a phone's chapters are taller than its window.
import Snap from 'lenis/snap';
import { useEffect } from 'react';
import { getLenis } from '@/engine/scroll';

/** `select`: what to settle on. `align`: where in the window it settles ('start' or 'center'). */
export function ChapterSnap({ select = '.skyhero, .chapter', align = 'start' }: { select?: string; align?: 'start' | 'center' }) {
  useEffect(() => {
    if (!matchMedia('(min-width: 901px)').matches) return;
    let snap: Snap | null = null;
    // The scroller starts a moment after the page does: look for it a few times, then give up
    // (there is none under reduced motion).
    let tries = 0;
    const timer = setInterval(() => {
      const lenis = getLenis();
      if (!lenis && ++tries < 20) return;
      clearInterval(timer);
      if (!lenis) return;
      snap = new Snap(lenis, { type: 'proximity', distanceThreshold: align === 'center' ? '45%' : '25%', debounce: 300, duration: 0.9 });
      // Centred, only things that fit in the window under the menu: settling on anything taller would hide part of it.
      const fits = (el: HTMLElement) => align === 'start' || el.offsetHeight <= innerHeight - 80;
      snap.addElements([...document.querySelectorAll<HTMLElement>(select)].filter(fits), { align: [align] });
    }, 150);
    return () => { clearInterval(timer); snap?.destroy(); };
  }, [select, align]);
  return null;
}
