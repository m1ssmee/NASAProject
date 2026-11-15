// The launch vehicle, built in code at the real proportions of a Falcon 9: 70 m long, 3.7 m
// across, a 5.2 m fairing. One unit is one metre, the payload sits at the origin and +y points
// to the nose. It carries no markings of any kind.
import * as THREE from 'three';
import { relief, wear } from '@/sky/surface';

const R = 1.83, FAIR_R = 2.6;
const NOSE_BASE = -2, NOSE_SHOULDER = 6.3, NOSE_TIP = 11.1;
export const UPPER_END = -15.8, INTER_END = -22.5, TAIL = -58.9;
/** The very tip of the nose. */
export const TIP = NOSE_TIP;
/** Where the vacuum engine's bell ends. */
export const BELL_END = UPPER_END - 4.0;

/** A piece of the vehicle: the outer group is placed on screen, the inner one rolls. */
export interface Piece { outer: THREE.Group; roll: THREE.Group }
export interface Vehicle {
  booster: Piece;
  upper: Piece;
  noses: [Piece, Piece];
  /** The four PUNCH satellites that rode along, on the ring under SPHEREx, with the direction
   *  each leaves in. The first two are one pair, the last two the other. */
  punch: { sat: THREE.Group; home: THREE.Vector3; out: THREE.Vector3 }[];
  /** The ends of the nine nozzles, in the booster's own space. */
  nozzles: THREE.Vector3[];
  /** How hot the engine bells glow, 0 to 1. */
  heat(booster: number, vacuum: number): void;
  dispose(): void;
}

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  let seed = 20250311;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  draw(c.getContext('2d')!, rnd);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Faint rings where the tank's barrel sections are welded. */
function welds(g: CanvasRenderingContext2D, w: number, h: number, n: number) {
  for (let i = 1; i < n; i++) {
    const y = Math.round((i * h) / n);
    g.fillStyle = 'rgba(0, 0, 0, 0.13)';
    g.fillRect(0, y, w, 2);
    g.fillStyle = 'rgba(255, 255, 255, 0.10)';
    g.fillRect(0, y + 2, w, 1);
  }
}

/** Streaks running down the length: dirt, soot, run-off. */
function streaks(g: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, n: number, from: number, rgb: string, strength: number) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y0 = h * (from + rnd() * (1 - from)), len = h * (0.06 + rnd() * 0.4), wd = 1 + rnd() * 9;
    const fade = g.createLinearGradient(0, y0, 0, y0 + len);
    fade.addColorStop(0, `rgba(${rgb}, 0)`);
    fade.addColorStop(0.25, `rgba(${rgb}, ${strength * (0.3 + rnd() * 0.7)})`);
    fade.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = fade;
    g.fillRect(x, y0, wd, len);
  }
}

/** Frost on a cold oxygen tank: it forms in sheets, cracks, and sheds in patches on the way up. */
function frost(g: CanvasRenderingContext2D, rnd: () => number, w: number, y0: number, y1: number, n: number) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = y0 + rnd() * (y1 - y0), r = 5 + rnd() * 34, shed = rnd() < 0.1;
    const patch = g.createRadialGradient(x, y, 0, x, y, r);
    patch.addColorStop(0, shed ? `rgba(150, 156, 166, ${0.10 + rnd() * 0.14})` : `rgba(247, 250, 254, ${0.25 + rnd() * 0.4})`);
    patch.addColorStop(1, shed ? 'rgba(150, 156, 166, 0)' : 'rgba(247, 250, 254, 0)');
    g.fillStyle = patch;
    g.fillRect(x - r, y - r, r * 2, r * (2 + rnd() * 2.5));
  }
}

/** Small stencilled notices, too small to read: what tells the eye how big the thing is. */
function notices(g: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, n: number, line: number) {
  g.fillStyle = 'rgba(26, 28, 32, 0.72)';
  for (let i = 0; i < n; i++) {
    const x = w * (0.06 + rnd() * 0.8), y = h * (0.44 + rnd() * 0.42); // on the barrel, clear of the nose
    for (let r = 0; r < 2 + Math.floor(rnd() * 3); r++) g.fillRect(x, y + r * line * 2.4, line * (7 + rnd() * 12), line);
  }
}

/** The booster's skin: white paint, frost over the cold oxygen tank (the upper part), soot below. */
const boosterSkin = () => paint(512, 2048, (g, rnd) => {
  const w = 512, h = 2048;
  g.fillStyle = '#d6d6d1';
  g.fillRect(0, 0, w, h);
  welds(g, w, h, 13);
  const soot = g.createLinearGradient(0, 0, 0, h);
  soot.addColorStop(0, 'rgba(52, 46, 40, 0.10)');
  soot.addColorStop(0.54, 'rgba(52, 46, 40, 0.18)');
  soot.addColorStop(0.60, 'rgba(46, 40, 34, 0.62)');
  soot.addColorStop(1, 'rgba(28, 24, 20, 0.92)');
  g.fillStyle = soot;
  g.fillRect(0, 0, w, h);
  frost(g, rnd, w, 0, h * 0.56, 1100);
  notices(g, rnd, w, h * 0.5, 5, 2);
  streaks(g, rnd, w, h, 260, 0.0, '24, 20, 17', 0.5);
  streaks(g, rnd, w, h, 130, 0.56, '214, 210, 200', 0.22); // paint showing through the soot
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '0, 0, 0' : '255, 255, 255'}, ${rnd() * 0.07})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
});

/** The upper stage: newer paint, frost over most of it. */
const stageSkin = () => paint(1024, 1024, (g, rnd) => {
  const w = 1024, h = 1024;
  g.fillStyle = '#dededa';
  g.fillRect(0, 0, w, h);
  welds(g, w, h, 6);
  frost(g, rnd, w, h * 0.12, h * 0.9, 1300);
  notices(g, rnd, w, h, 4, 2.5);
  streaks(g, rnd, w, h, 110, 0, '90, 92, 96', 0.12);
  streaks(g, rnd, w, h, 70, 0, '255, 255, 255', 0.16);
});

/** What is on a fairing half, top (the tip) to bottom, as fractions of its length. */
const CAP = 0.085, SHOULDER = 0.40, WAIST = 0.88;
/** The joints, seam, latches, hatches and vents of a fairing half, drawn in the given inks: once
 *  in colour, once as heights for the surface relief. */
function fairingMarks(g: CanvasRenderingContext2D, w: number, h: number, ink: { groove: string; raised: string; bolt: string }) {
  const k = w / 1024;
  [SHOULDER, WAIST, 0.992].forEach((v) => { // ring joints with a row of fasteners
    const y = Math.round(v * h);
    g.fillStyle = ink.groove;
    g.fillRect(0, y - 7 * k, w, 2 * k);
    g.fillRect(0, y + 7 * k, w, 2 * k);
    g.fillStyle = ink.bolt;
    for (let x = 6 * k; x < w; x += 22 * k) { g.beginPath(); g.arc(x, y, 2.4 * k, 0, 7); g.fill(); }
  });
  g.fillStyle = ink.groove; // the edge of the tip's heat protection
  g.fillRect(0, CAP * h, w, 3 * k);
  g.fillRect(0, 0, 4 * k, h); // the seam between the halves, with its latches
  g.fillRect(w - 4 * k, 0, 4 * k, h);
  g.fillStyle = ink.raised;
  for (let y = 0.12 * h; y < 0.98 * h; y += 0.062 * h) { g.fillRect(5 * k, y, 12 * k, 26 * k); g.fillRect(w - 17 * k, y + 0.03 * h, 12 * k, 26 * k); }
  g.strokeStyle = ink.groove; // hatches
  g.lineWidth = 2.5 * k;
  [[0.2, 0.55, 80, 112], [0.62, 0.66, 70, 70], [0.44, 0.93, 96, 52]].forEach(([u, v, a, b]) => g.strokeRect(u * w, v * h, a * k, b * k));
  g.fillStyle = ink.bolt;
  [[0.2, 0.55, 80, 112], [0.62, 0.66, 70, 70]].forEach(([u, v, a, b]) => {
    for (let i = 0; i <= 4; i++) for (const y of [v * h - 6 * k, v * h + b * k + 6 * k]) { g.beginPath(); g.arc(u * w + (i / 4) * a * k, y, 2 * k, 0, 7); g.fill(); }
  });
}

/** The fairing's paint: white, a grey heat-protected tip, joints, hatches, vents with their streaks. */
const fairingSkin = () => paint(1024, 2048, (g, rnd) => {
  const w = 1024, h = 2048;
  g.fillStyle = '#e3e3de';
  g.fillRect(0, 0, w, h);
  const cap = g.createLinearGradient(0, 0, 0, CAP * h);
  cap.addColorStop(0, 'rgba(112, 106, 98, 0.85)');
  cap.addColorStop(1, 'rgba(150, 146, 138, 0.6)');
  g.fillStyle = cap;
  g.fillRect(0, 0, w, CAP * h);
  streaks(g, rnd, w, h, 120, 0, '96, 98, 104', 0.10);
  streaks(g, rnd, w, h, 80, 0, '255, 255, 255', 0.14);
  [[0.3, 0.83], [0.72, 0.83], [0.52, 0.47]].forEach(([u, v]) => { // vents, each with a streak running aft
    const x = u * w, y = v * h, run = g.createLinearGradient(0, y, 0, y + 190);
    run.addColorStop(0, 'rgba(40, 38, 36, 0.42)');
    run.addColorStop(1, 'rgba(40, 38, 36, 0)');
    g.fillStyle = run;
    g.fillRect(x - 9, y, 18, 190);
    g.fillStyle = 'rgba(14, 15, 18, 0.9)';
    g.beginPath(); g.ellipse(x, y, 11, 7, 0, 0, 7); g.fill();
  });
  notices(g, rnd, w, h, 6, 3);
  fairingMarks(g, w, h, { groove: 'rgba(34, 36, 40, 0.6)', raised: 'rgba(120, 124, 130, 0.55)', bolt: 'rgba(40, 42, 48, 0.7)' });
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '0, 0, 0' : '255, 255, 255'}, ${rnd() * 0.05})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
});

/** A tank's relief: weld beads standing proud, a seam down the length, frost and dents. */
const tankRelief = (rings: number) => relief(512, 1024, 3.2, (g, rnd) => {
  wear(g, rnd, 512, 1024, 240);
  g.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 1; i < rings; i++) g.fillRect(0, Math.round((i * 1024) / rings) - 1, 512, 3);
  g.fillRect(140, 0, 2, 1024);
  g.fillRect(396, 0, 2, 1024);
});

const fairingRelief = () => relief(512, 1024, 3.4, (g, rnd) => {
  wear(g, rnd, 512, 1024, 160);
  fairingMarks(g, 512, 1024, { groove: 'rgba(0, 0, 0, 0.75)', raised: 'rgba(255, 255, 255, 0.7)', bolt: 'rgba(255, 255, 255, 0.8)' });
});

/** Inside the fairing: foil-faced panels between ribs and rings, as in the onboard footage. */
const foilPanels = () => paint(512, 512, (g, rnd) => {
  g.fillStyle = '#7f858c';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const s = 96 + Math.floor(rnd() * 90);
    g.fillStyle = `rgb(${s}, ${s + 4}, ${s + 8})`;
    g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
  }
  g.fillStyle = 'rgba(12, 14, 16, 0.85)';
  for (let i = 0; i <= 8; i++) { g.fillRect(i * 64 - 2, 0, 4, 512); g.fillRect(0, i * 64 - 2, 512, 4); }
});

export function createVehicle(scene: THREE.Scene): Vehicle {
  const made: THREE.Mesh[] = [];
  const mesh = <G extends THREE.BufferGeometry>(g: G, m: THREE.Material, y = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.y = y;
    o.castShadow = o.receiveShadow = true;
    made.push(o);
    return o;
  };
  const tube = (r0: number, r1: number, y0: number, y1: number, m: THREE.Material, open = true) =>
    mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, 56, 1, open), m, (y0 + y1) / 2);
  /** Something mounted on the outside of the body: thin along the radius, facing outwards. */
  const mount = (g: THREE.BufferGeometry, m: THREE.Material, angle: number, radius: number, y: number) => {
    const o = mesh(g, m, y);
    o.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    o.rotation.y = Math.PI / 2 - angle;
    return o;
  };
  const piece = (): Piece => {
    const outer = new THREE.Group(), roll = new THREE.Group();
    outer.add(roll);
    scene.add(outer);
    return { outer, roll };
  };

  const bumps = (t: THREE.Texture, k: number) => ({ normalMap: t, normalScale: new THREE.Vector2(k, k) });
  const sooty = new THREE.MeshStandardMaterial({ map: boosterSkin(), roughness: 0.68, ...bumps(tankRelief(13), 0.9) });
  // Gloss paint: the Sun leaves a long bright streak down a real painted tank.
  const white = new THREE.MeshStandardMaterial({ map: stageSkin(), roughness: 0.4, ...bumps(tankRelief(6), 0.9) });
  const fairingPaint = new THREE.MeshStandardMaterial({ map: fairingSkin(), roughness: 0.32, ...bumps(fairingRelief(), 1) });
  const foil = new THREE.MeshStandardMaterial({ map: foilPanels(), roughness: 0.4, metalness: 0.85, side: THREE.BackSide });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.46, metalness: 0.85 });
  const scorched = new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb98a30, roughness: 0.42, metalness: 1 });
  const hot = () => new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.5, metalness: 0.8, side: THREE.DoubleSide, emissive: 0xff5a1c, emissiveIntensity: 0 });
  const bells = hot(), vacuumBell = hot();
  // The vacuum engine's long bell glows hottest at the throat and dull red at the lip.
  vacuumBell.emissiveMap = paint(64, 256, (g, rnd) => {
    const heat = g.createLinearGradient(0, 0, 0, 256);
    heat.addColorStop(0, '#fff2d0');
    heat.addColorStop(0.25, '#e8742a');
    heat.addColorStop(0.7, '#7a1f0a');
    heat.addColorStop(1, '#2a0904');
    g.fillStyle = heat;
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0, 0, 0, ${rnd() * 0.25})`; g.fillRect(rnd() * 64, 0, 1 + rnd() * 3, 256); }
  });
  vacuumBell.emissive.set(0xffffff);

  // ── Booster: sooty tank, black interstage, nine engines, four folded legs, four grid fins.
  const booster = piece();
  booster.roll.add(
    tube(R, R, TAIL + 1.6, INTER_END, sooty),
    tube(R, R, INTER_END, UPPER_END, carbon),
    tube(R * 1.01, R * 1.01, TAIL, TAIL + 1.6, scorched),
    mount(new THREE.BoxGeometry(0.34, INTER_END - TAIL - 2, 0.16), scorched, 0.35, R + 0.06, (TAIL + INTER_END) / 2),
  );
  const plate = mesh(new THREE.CircleGeometry(R, 48), scorched, TAIL);
  plate.rotation.x = Math.PI / 2;
  booster.roll.add(plate);
  const nozzles: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI) / 4, r = i === 8 ? 0 : 1.24;
    const bell = mesh(new THREE.CylinderGeometry(0.2, 0.47, 0.95, 20, 1, true), bells, TAIL - 0.42);
    bell.position.set(Math.cos(a) * r, TAIL - 0.42, Math.sin(a) * r);
    nozzles.push(new THREE.Vector3(bell.position.x, TAIL - 0.9, bell.position.z));
    booster.roll.add(bell);
  }
  const leg = new THREE.BoxGeometry(1.3, 9.6, 0.44);
  const at = leg.attributes.position;
  for (let i = 0; i < at.count; i++) if (at.getY(i) > 0) at.setX(i, at.getX(i) * 0.28); // tapers to the top
  leg.computeVertexNormals();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    booster.roll.add(
      mount(leg, scorched, a, R + 0.2, TAIL + 6.2),
      mount(new THREE.BoxGeometry(1.35, 1.75, 0.13), metal, a, R + 0.1, UPPER_END - 1.3), // grid fin, folded
    );
  }

  // ── Upper stage: clean tank, the vacuum engine and its long bell, the payload adapter with
  //    the four small PUNCH satellites that rode along.
  const upper = piece();
  const bellShape = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    return new THREE.Vector2(0.28 + 1.24 * Math.pow(1 - t, 0.55), BELL_END + t * 3.1); // wide at the exit, narrow at the throat
  });
  upper.roll.add(
    tube(R, R, UPPER_END, NOSE_BASE, white),
    tube(0.55, R, UPPER_END - 0.9, UPPER_END, metal, false),
    mesh(new THREE.LatheGeometry(bellShape, 48), vacuumBell),
    tube(R, 0.66, NOSE_BASE, -1.42, carbon, false),
    tube(0.66, 0.66, -1.5, -1.38, metal),
    mount(new THREE.BoxGeometry(0.2, NOSE_BASE - UPPER_END - 1, 0.1), white, 2.2, R + 0.04, (UPPER_END + NOSE_BASE) / 2),
  );
  // PUNCH: four suitcase-sized satellites, each a foil-wrapped box with a solar panel either side.
  const cellBlue = new THREE.MeshStandardMaterial({ color: 0x0d1630, roughness: 0.3, metalness: 0.5 });
  const punch = [0, 2, 1, 3].map((k) => { // opposite ones leave together
    const a = (k * Math.PI) / 2 + 0.5, sat = new THREE.Group();
    sat.add(mesh(new THREE.BoxGeometry(0.62, 0.42, 0.34), gold), mesh(new THREE.BoxGeometry(0.5, 0.3, 0.2), metal));
    [-1, 1].forEach((side) => { const wing = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.02), cellBlue); wing.position.set(side * 0.57, 0, 0.12); sat.add(wing); });
    sat.children[1].position.z = 0.2;
    const home = new THREE.Vector3(Math.cos(a) * 1.42, -1.74, Math.sin(a) * 1.42);
    sat.position.copy(home);
    sat.rotation.y = Math.PI / 2 - a;
    upper.roll.add(sat);
    return { sat, home, out: new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize() };
  });

  // ── Fairing: two half shells with a curved nose, painted outside, foil panels inside.
  const profile: THREE.Vector2[] = [new THREE.Vector2(R, NOSE_BASE), new THREE.Vector2(FAIR_R, NOSE_BASE + 1.5), new THREE.Vector2(FAIR_R, NOSE_SHOULDER)];
  // The nose: a blunt curve that leaves the barrel smoothly and closes in a rounded tip.
  const L = NOSE_TIP - NOSE_SHOULDER;
  for (let i = 1; i <= 28; i++) {
    const y = L * Math.sin((i / 28) * (Math.PI / 2)); // more points towards the tip
    profile.push(new THREE.Vector2(Math.max(FAIR_R * Math.pow(1 - (y / L) ** 2, 0.68), 0.001), NOSE_SHOULDER + y));
  }
  const half = (start: number): Piece => {
    const p = piece(), shell = new THREE.LatheGeometry(profile, 48, start, Math.PI);
    // Spread the paint evenly along the shell's length, not by how many points the curve has.
    const uv = shell.attributes.uv, n = profile.length, along = [0];
    for (let i = 1; i < n; i++) along.push(along[i - 1] + profile[i].distanceTo(profile[i - 1]));
    for (let i = 0; i < uv.count; i++) uv.setY(i, along[i % n] / along[n - 1]);
    p.roll.add(mesh(shell, fairingPaint), mesh(shell, foil));
    return p;
  };

  return {
    booster, upper, noses: [half(0), half(Math.PI)], nozzles, punch,
    heat(b, v) { bells.emissiveIntensity = b * 3; vacuumBell.emissiveIntensity = v * 3.2; },
    dispose() {
      const seen = new Set<THREE.Material>();
      made.forEach((o) => { o.geometry.dispose(); seen.add(o.material as THREE.Material); });
      seen.forEach((m) => { const x = m as THREE.MeshStandardMaterial; x.map?.dispose(); x.normalMap?.dispose(); x.emissiveMap?.dispose(); m.dispose(); });
    },
  };
}
