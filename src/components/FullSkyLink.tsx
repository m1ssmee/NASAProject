'use client';
// A button that opens the home page's sky map in full screen. It is a real link to the viewer,
// so it still leads somewhere useful if the map is unavailable (no WebGL, or no JavaScript).
import { Hop } from './Hop';

export const OPEN_FULL_SKY = 'sky:full';

export function FullSkyLink({ children }: { children: React.ReactNode }) {
  const open = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!document.querySelector(".sky[data-state='ready']")) return; // fall through to /view
    e.preventDefault();
    window.dispatchEvent(new Event(OPEN_FULL_SKY));
  };
  return (
    <a href="/view" className="btn" onClick={open} data-no-transition>
      <Hop tick={false}>{children}</Hop>
    </a>
  );
}
