// The driver: one site-wide blink clock. Everything that carries the concept (the lamp in the
// header, every baked plate) reads the same epoch, so they always swap together.
import { gsap } from 'gsap';

export type EpochName = 'a' | 'b';
const HOLD = 0.85; // seconds per plate; about 1.2 swaps a second, well under the 3 Hz flash limit

let epoch: EpochName = 'a';
let last = 0;
let running = false;
let paused = false;
const listeners = new Set<(e: EpochName) => void>();

function set(e: EpochName) {
  epoch = e;
  document.documentElement.dataset.epoch = e;
  listeners.forEach((fn) => fn(e));
}

function tick(time: number) {
  if (paused || document.hidden) { last = time; return; }
  if (time - last >= HOLD) { last = time; set(epoch === 'a' ? 'b' : 'a'); }
}

export function startBlink() {
  if (running) return;
  running = true;
  document.documentElement.dataset.epoch = epoch;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paused = true; return; }
  gsap.ticker.add(tick);
}
export const onBlink = (fn: (e: EpochName) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const currentEpoch = () => epoch;
export const blinkPaused = () => paused;
const pauseListeners = new Set<() => void>();
export const onBlinkPause = (fn: () => void) => { pauseListeners.add(fn); return () => { pauseListeners.delete(fn); }; };
export function setBlinkPaused(p: boolean) { paused = p; pauseListeners.forEach((fn) => fn()); }
/** Manual swap (the reduced-motion and paused path). */
export function swapEpoch() { set(epoch === 'a' ? 'b' : 'a'); }
