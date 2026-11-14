// Global motion for this site: runs once on the client, before the first page initializes.
import { gsap } from 'gsap';
import { setTransition } from '@/engine';
import { startBlink, swapEpoch } from './blink';

export function setupMotion() {
  startBlink();
  // A page change is one blink: the plate is swapped, not slid. Hard cut, short hold, hard cut.
  setTransition({
    leave: (c) => gsap.timeline().set(c, { autoAlpha: 1 }).call(swapEpoch).to({}, { duration: 0.24 }),
    enter: (c) => gsap.timeline().to({}, { duration: 0.2 }).set(c, { autoAlpha: 0 }),
  });
}
