'use client';
// NASA's "Eyes on the Solar System", showing where SPHEREx is right now. It is a large 3D
// application, so it loads only when asked for.
import { useState } from 'react';
import { Hop } from './Hop';

const SRC = 'https://eyes.nasa.gov/apps/solar-system/#/sc_spherex?embed=true';

export function LiveOrbit() {
  const [on, setOn] = useState(false);
  return (
    <div className="orbit">
      {on ? (
        <iframe src={SRC} title="NASA Eyes on the Solar System: SPHEREx, live position" allow="fullscreen" allowFullScreen loading="lazy" />
      ) : (
        <div className="orbit__gate">
          <p className="h-l">Where is SPHEREx right now?</p>
          <p className="muted" style={{ maxWidth: '44ch' }}>NASA tracks it live in 3D. Loading the view brings in NASA&rsquo;s own application, inside this page.</p>
          <button type="button" className="btn" onClick={() => setOn(true)}><Hop tick={false}>Load NASA&rsquo;s live view</Hop></button>
        </div>
      )}
    </div>
  );
}
