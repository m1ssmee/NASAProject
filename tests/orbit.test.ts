import { describe, expect, it } from 'vitest';
import { tracker } from '../src/sky/orbit';

describe('SPHEREx orbit', () => {
  const at = tracker('1 63182U 25047E   26318.93660134  .00001015  00000+0  16067-3 0  9999', '2 63182  97.9569 141.0450 0011558  71.4698 288.7766 14.74310761 90251');
  it('is a low, fast, near-polar orbit', () => {
    const t0 = Date.UTC(2026, 10, 15, 0, 0, 0);
    let top = -90;
    for (let m = 0; m < 100; m++) {
      const f = at(new Date(t0 + m * 60000))!;
      expect(f.altitude).toBeGreaterThan(550);
      expect(f.altitude).toBeLessThan(750);
      expect(f.speed).toBeGreaterThan(7.3);
      expect(f.speed).toBeLessThan(7.7);
      top = Math.max(top, f.dec);
    }
    expect(top).toBeGreaterThan(78); // it passes close to the poles every lap
  });
});
