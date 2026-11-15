import { describe, expect, it } from 'vitest';
import { EVENTS, STRETCH, beatAt, filmTime, formatClock, missionClock, picture, scrollOf } from '../src/film/beats';

describe('launch film beats', () => {
  it('starts lower left and ends in the middle', () => {
    const a = picture(0), b = picture(0.6);
    expect(a.at.x).toBeLessThan(-0.2);
    expect(a.at.y).toBeLessThan(-0.2);
    expect(b.at).toEqual({ x: 0, y: 0 });
  });

  it('opens tight on the nose, pulls back to the whole rocket, then only closes in', () => {
    expect(picture(0).frame).toBeCloseTo(24);
    expect(picture(0.3).frame).toBeCloseTo(180);
    expect(picture(0.41).frame).toBeCloseTo(180);
    let last = Infinity;
    for (let p = 0.3; p <= 1; p += 0.01) {
      const f = picture(p).frame;
      expect(f).toBeLessThanOrEqual(last + 1e-9);
      last = f;
    }
    expect(picture(0.86).frame).toBeCloseTo(11);
  });

  it('keeps the order: booster off, nose open, release, dark, stars', () => {
    expect(picture(0.3).booster.on).toBe(true);
    expect(picture(0.45).booster.on).toBe(false);
    expect(picture(0.45).booster.back).toBeGreaterThan(0);
    expect(picture(0.5).nose.open).toBe(0);
    expect(picture(0.6).nose.open).toBeGreaterThan(0);
    expect(picture(0.66).upper.back).toBe(0);
    expect(picture(0.75).upper.back).toBeGreaterThan(0);
    expect(picture(0.94).dark).toBe(1);
    // SPHEREx has finished its first turn before PUNCH goes, and PUNCH is away before the last one.
    expect(picture(0.74).punch).toEqual([0, 0]);
    expect(picture(0.74).craft.face).toBeCloseTo(0.42);
    expect(picture(0.79).punch[1]).toBeGreaterThan(0);
    expect(picture(0.79).craft.face).toBeCloseTo(0.42);
    // Its own full turn happens while PUNCH is leaving, and is over before the last one starts.
    expect(picture(0.71).craft.spin).toBe(0);
    expect(picture(0.76).craft.spin).toBeCloseTo(Math.PI);
    expect(picture(0.81).craft.spin).toBeCloseTo(Math.PI * 2);
  });

  it('names the rocket at the start and each satellite once it is free', () => {
    expect(picture(0).names).toEqual([1, 0, 0, 0]);
    expect(picture(0.2).names).toEqual([0, 0, 0, 0]);
    expect(picture(0.72).names).toEqual([0, 1, 0, 0]);
    expect(picture(0.79).names).toEqual([0, 1, 1, 1]);
    expect(picture(0.86).names).toEqual([0, 0, 0, 0]);
  });

  it('shows no stars in the air, all of them in space, none in the dark, all at the end', () => {
    expect(picture(0.1).stars).toBe(0);
    expect(picture(0.6).stars).toBeCloseTo(0.9); // nearly the whole map, as on the site
    expect(picture(0.945).stars).toBe(0);
    expect(picture(1).stars).toBe(1);
    expect(picture(1).done).toBe(true);
  });

  it('free bodies move in straight lines (no easing in space)', () => {
    const d = (p: number) => picture(p).booster.back;
    expect(d(0.7) - d(0.6)).toBeCloseTo(d(0.6) - d(0.5));
  });

  it('gives the climb out of the air and the satellites more of the scroll, and leaves the rest alone', () => {
    expect(filmTime(0)).toBe(0);
    expect(filmTime(1)).toBeCloseTo(1);
    const rate = (scroll: number) => (filmTime(scroll + 0.001) - filmTime(scroll)) / 0.001;
    expect(rate(0.02)).toBeCloseTo(STRETCH); // nose close-up: full speed
    expect(rate(0.3)).toBeCloseTo(STRETCH / 2); // leaving the air: half speed
    expect(rate(0.6)).toBeCloseTo(STRETCH); // staging onwards: full speed again
    expect(rate(0.8)).toBeCloseTo(STRETCH / 4); // SPHEREx's turn: a quarter speed
    expect(rate(0.97)).toBeCloseTo(STRETCH); // the telescope
    for (let x = 0; x < 1; x += 0.01) expect(filmTime(x + 0.01)).toBeGreaterThan(filmTime(x));
  });

  it('shakes while the engines burn, goes still at cut-off, and stops rolling before release', () => {
    expect(picture(0.05).shake).toBe(1);
    expect(picture(0.3).shake).toBeGreaterThan(0.4);
    expect(picture(0.425).shake).toBe(0);
    expect(picture(0.48).shake).toBeGreaterThan(0);
    expect(picture(0.6).shake).toBe(0);
    expect(picture(0.7).roll).toBe(picture(0.9).roll);
    expect(picture(0).sun).toBeCloseTo(0.3);
    expect(picture(0.4).sun).toBe(1);
    expect(picture(0.3).exposure).toBeLessThan(picture(0).exposure); // stopped down for the flame
  });

  it('places events on the timeline where the scroll reaches them', () => {
    for (const t of [0, 0.05, 0.2, 0.42, 0.6, 0.715, 0.76, 0.805, 0.9, 1]) expect(filmTime(scrollOf(t))).toBeCloseTo(t);
    const marks = EVENTS.map((e) => scrollOf(e.at));
    expect([...marks].sort((a, b) => a - b)).toEqual(marks); // in flight order, left to right
  });

  it('runs the mission clock through the flight\'s real times', () => {
    expect(formatClock(missionClock(0.42))).toBe('T+00:02:22'); // booster cut-off
    expect(formatClock(missionClock(0.56))).toBe('T+00:03:10'); // fairing
    expect(formatClock(missionClock(0.68))).toBe('T+00:41:56'); // SPHEREx released
    for (let t = 0; t < 1; t += 0.01) expect(missionClock(t + 0.01)).toBeGreaterThan(missionClock(t));
  });

  it('names the beat', () => {
    expect(beatAt(0)).toBe(0);
    expect(beatAt(0.45)).toBe(2);
    expect(beatAt(1)).toBe(5);
  });
});
