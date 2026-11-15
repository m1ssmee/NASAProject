'use client';
// Home: when the scroll comes to rest near the top of a chapter, it settles on it, so each
// chapter fills the window. Only a nudge (within a quarter of a window): never a trap.
// Desktop only; a phone's chapters are taller than its window.
import Snap from 'lenis/snap';
import { useEffect } from 'react';
import { getLenis } from '@/engine/scroll';

export function ChapterSnap() {
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
      snap = new Snap(lenis, { type: 'proximity', distanceThreshold: '25%', debounce: 300, duration: 0.9 });
      snap.addElements([...document.querySelectorAll<HTMLElement>('.skyhero, .chapter')], { align: ['start'] });
    }, 150);
    return () => { clearInterval(timer); snap?.destroy(); };
  }, []);
  return null;
}
