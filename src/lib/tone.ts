'use client';
import { useSyncExternalStore } from 'react';
import { NEGATIVE, POSITIVE, type Tone } from './render';

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-plate'] });
  return () => mo.disconnect();
}
const get = () => document.documentElement.dataset.plate === 'positive';

/** Plate polarity chosen in the header: dark sources on glass (negative) or the reverse. */
export function useTone(): Tone {
  const positive = useSyncExternalStore(subscribe, get, () => false);
  return positive ? POSITIVE : NEGATIVE;
}
