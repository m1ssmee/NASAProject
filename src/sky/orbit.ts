// Where SPHEREx is against the stars at a given moment, from its published orbit.
import { propagate, twoline2satrec } from 'satellite.js';

export interface Fix { ra: number; dec: number; altitude: number; speed: number } // degrees, degrees, km, km/s

/** Returns a function giving SPHEREx's place in the sky, as seen from the centre of the Earth.
 *  (The orbit's own frame differs from the star catalogue's by about a third of a degree, which
 *  does not show at this scale.) */
export function tracker(line1: string, line2: string): (when: Date) => Fix | null {
  const rec = twoline2satrec(line1, line2);
  return (when) => {
    const { position: p, velocity: v } = propagate(rec, when) ?? {};
    if (!p || !v || typeof p === 'boolean' || typeof v === 'boolean') return null;
    const r = Math.hypot(p.x, p.y, p.z);
    return {
      ra: ((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360,
      dec: (Math.asin(p.z / r) * 180) / Math.PI,
      altitude: r - 6371,
      speed: Math.hypot(v.x, v.y, v.z),
    };
  };
}
