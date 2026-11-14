'use client';
import { useState, useSyncExternalStore } from 'react';
import { blinkPaused, onBlinkPause, setBlinkPaused, swapEpoch } from '@/motion/blink';
import { BakedPlate } from './BakedPlate';

const SAY = {
  idle: <>One of these stars is not where it was a year ago. <strong>Mark it.</strong></>,
  hit: <><strong>That is Barnard&rsquo;s Star,</strong> six light years away and moving 10.4 arcseconds a year. The grey centre is the detector overflowing.</>,
  miss: <>That one held still. <strong>Watch the brightest star.</strong></>,
};

export function HeroPlate() {
  const [say, setSay] = useState<keyof typeof SAY>('idle');
  const paused = useSyncExternalStore(onBlinkPause, blinkPaused, () => false);
  const toggle = () => setBlinkPaused(!paused);
  return (
    <div>
      <BakedPlate slug="barnards-star" colour onMark={(hit) => setSay(hit ? 'hit' : 'miss')}
        alt="Colour SPHEREx image of the star field around Barnard's Star, from three infrared detectors, alternating between August 2025 and September 2026. The brightest star shifts north; the others stay still." />
      <p className="hero__say" aria-live="polite">{SAY[say]}</p>
      <div className="hero__ctl">
        <button type="button" className="textbtn" onClick={toggle} aria-pressed={paused}>{paused ? 'Resume blinking' : 'Pause blinking'}</button>
        {paused && <button type="button" className="textbtn" onClick={swapEpoch}>Swap plate</button>}
      </div>
    </div>
  );
}
