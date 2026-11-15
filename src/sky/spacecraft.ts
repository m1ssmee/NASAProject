// SPHEREx, modelled from NASA/JPL-Caltech references: the assembly and test photographs
// (PIA26543, PIA26537), NASA JPL's films of the hardware, and the onboard footage of its release
// in orbit. NASA publishes no downloadable 3D model, so this is built in code. Proportions follow
// the real observatory, about 3.2 m across the outer shield and 2.6 m tall; one unit here is one
// metre. It is a likeness, not an engineering model, and it carries no markings.
//
//   +y is the telescope's line of sight. From the top down:
//   three nested photon shields (the outer one matte white outside, as it flew, with its seams,
//   fittings and fastener rows; bare reflective film inside), the black ribbed telescope baffle,
//   three V-groove radiator rings, an orange foil skirt, the bus in white blankets with its
//   equipment boxes and star trackers, the launch adapter ring, and one solar array on the sun side.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { relief, wear } from './surface';

const TAU = Math.PI * 2;

/** A cone wall as a lathe: (radius, height) pairs from bottom to top. */
function wall(bottomR: number, topR: number, y0: number, y1: number, segments = 96) {
  return new THREE.LatheGeometry([new THREE.Vector2(bottomR, y0), new THREE.Vector2(topR, y1)], segments);
}

/** A seeded random number source, so the model is the same every time. */
const random = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** The outside of the outer shield as it flew: matte white, two seams with small dark fittings
 *  and fastener rows, and a ring of fasteners at the base and under the rim. */
function shieldSkin(): THREE.Texture {
  const W = 2048, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!, rnd = random(23);
  g.fillStyle = '#e9e8e3';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { // handling marks: barely there
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255, 255, 255' : '150, 154, 160'}, ${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * W, rnd() * H, 30 + rnd() * 220, 10 + rnd() * 120);
  }
  const dot = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  [0.2, 0.64].forEach((u) => {
    const x = Math.round(u * W);
    g.fillStyle = 'rgba(58, 60, 66, 0.6)';
    g.fillRect(x - 1, 0, 2, H);
    g.fillStyle = 'rgba(255, 255, 255, 0.5)';
    g.fillRect(x + 1, 0, 1, H);
    g.fillStyle = '#2f3136';
    for (let k = 0; k < 6; k++) g.fillRect(x - 8, 34 + k * 82, 16, 16); // fittings along the seam
    g.fillStyle = 'rgba(40, 42, 48, 0.8)';
    for (let k = 0; k < 30; k++) { dot(x - 13, 12 + k * 16.6, 1.6); dot(x + 13, 12 + k * 16.6, 1.6); }
  });
  g.fillStyle = 'rgba(40, 42, 48, 0.75)';
  for (let k = 0; k < 120; k++) { dot((k + 0.5) * (W / 120), H - 12, 1.8); dot((k + 0.5) * (W / 120), 9, 1.5); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** The outer shield's relief: the seams and their fittings stand proud, fasteners dimple the
 *  skin, and the skin itself is very slightly uneven, as any large thin panel is. */
const shieldRelief = () => relief(1024, 256, 2.6, (g, rnd) => {
  wear(g, rnd, 1024, 256, 120);
  [0.2, 0.64].forEach((u) => {
    const x = Math.round(u * 1024);
    g.fillStyle = 'rgba(255, 255, 255, 0.7)';
    g.fillRect(x - 2, 0, 4, 256);
    for (let k = 0; k < 6; k++) g.fillRect(x - 5, 17 + k * 41, 10, 9);
  });
  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  for (let k = 0; k < 16; k++) g.fillRect(Math.round((k / 16) * 1024), 0, 1, 256); // where the gores meet
  g.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let k = 0; k < 120; k++) { g.fillRect((k + 0.5) * (1024 / 120) - 1, 249, 2, 2); g.fillRect((k + 0.5) * (1024 / 120) - 1, 4, 2, 2); }
});

/** Crinkled insulation blanket as a normal map: soft folds with sharp creases between them. */
function crinkle(): THREE.Texture {
  const N = 256, rnd = random(7);
  const lattice = (cells: number) => {
    const v = Float32Array.from({ length: cells * cells }, rnd);
    const at = (i: number, j: number) => v[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
    return (x: number, y: number) => {
      const fx = (x * cells) / N, fy = (y * cells) / N, x0 = Math.floor(fx), y0 = Math.floor(fy);
      let tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    };
  };
  const big = lattice(5), mid = lattice(13), fine = lattice(34);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    h[y * N + x] = Math.abs(big(x, y) - 0.5) * 2 + Math.abs(mid(x, y) - 0.5) + fine(x, y) * 0.22;
  }
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!, img = g.createImageData(N, N);
  const H = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * 7, dy = (H(x, y - 1) - H(x, y + 1)) * 7, l = Math.hypot(dx, dy, 1);
    img.data.set([(dx / l) * 127.5 + 127.5, (dy / l) * 127.5 + 127.5, (1 / l) * 127.5 + 127.5, 255], (y * N + x) * 4);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The back of the solar array, as photographed: a black panel with cable runs laid at right angles. */
function arrayBack(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0e10';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(205, 210, 220, 0.75)';
  g.lineWidth = 3;
  [[60, 40, 60, 300, 250, 300, 250, 470], [450, 60, 450, 200, 300, 200, 300, 470], [120, 470, 120, 380, 400, 380]].forEach((p) => {
    g.beginPath();
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.stroke();
  });
  g.fillStyle = 'rgba(60, 100, 190, 0.8)';
  [[60, 300], [250, 300], [450, 200], [300, 200], [120, 380]].forEach(([x, y]) => g.fillRect(x - 5, y - 5, 10, 10));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Solar cells: a grid of dark blue cells with thin bus bars, drawn once onto a small canvas. */
function cellTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b1020';
  g.fillRect(0, 0, 512, 512);
  const cols = 8, rows = 11, gap = 4;
  const w = (512 - gap * (cols + 1)) / cols, h = (512 - gap * (rows + 1)) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = gap + i * (w + gap), y = gap + j * (h + gap);
    const shade = 18 + ((i * 7 + j * 13) % 5) * 3;
    g.fillStyle = `rgb(${shade - 8}, ${shade}, ${shade + 26})`;
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(190, 200, 215, 0.35)';
    g.fillRect(x + w * 0.33, y, 1, h);
    g.fillRect(x + w * 0.66, y, 1, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Bare aluminised film, as on the inside of the shields: gores with faint seams and streaks. */
function filmTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2f3f4';
  g.fillRect(0, 0, 1024, 64);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Soft streaks of slightly different reflectance.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 1024, w = 4 + rnd() * 26;
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '120,126,134'}, ${0.04 + rnd() * 0.1})`;
    g.fillRect(x, 0, w, 64);
  }
  // Sixteen seams between gores.
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * 1024;
    g.fillStyle = 'rgba(70, 76, 84, 0.55)';
    g.fillRect(x, 0, 1.5, 64);
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.fillRect(x + 2, 0, 1, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function buildSpacecraft(): THREE.Group {
  const craft = new THREE.Group();
  const body = new THREE.Group();
  craft.add(body);
  const folds = crinkle();
  const film = filmTexture();

  // Materials
  // Semi-gloss paint: under one hard light it carries a soft sheen along the cone, not a flat tone.
  const whiteSkin = new THREE.MeshPhysicalMaterial({
    map: shieldSkin(), roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.28,
    normalMap: shieldRelief(), normalScale: new THREE.Vector2(0.7, 0.7), side: THREE.FrontSide,
  });
  // Satin, not mirror: a mirror shows only what it reflects, and in space that is black. This
  // takes the light the way the photographs of the bare shields do.
  const filmOut = new THREE.MeshStandardMaterial({ color: 0xd4d8dd, map: film, metalness: 0.6, roughness: 0.42, side: THREE.FrontSide });
  const filmIn = new THREE.MeshStandardMaterial({ color: 0xc2c7ce, map: film, metalness: 0.5, roughness: 0.5, side: THREE.BackSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
  const rim = new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 1, roughness: 0.42 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: 0.1, roughness: 0.85, side: THREE.DoubleSide });
  const mirror = new THREE.MeshStandardMaterial({ color: 0xb9c6dc, metalness: 1, roughness: 0.14, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8963a, metalness: 1, roughness: 0.46 });
  const kapton = new THREE.MeshStandardMaterial({ color: 0xc77a26, metalness: 0.9, roughness: 0.5, normalMap: folds, normalScale: new THREE.Vector2(0.7, 0.7) });
  const blanket = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.62, normalMap: folds, normalScale: new THREE.Vector2(0.5, 0.5) });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e9ea, metalness: 0.05, roughness: 0.62 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bec5, metalness: 1, roughness: 0.44, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.45, roughness: 0.5 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.62 }); // brushed: no mirror glint
  const cells = new THREE.MeshStandardMaterial({ map: cellTexture(), metalness: 0.55, roughness: 0.28 });
  const backing = new THREE.MeshStandardMaterial({ map: arrayBack(), metalness: 0.2, roughness: 0.7 });

  const add = <T extends THREE.Object3D>(mesh: T, parent: THREE.Object3D = body): T => { parent.add(mesh); return mesh; };
  // The pieces the pull-apart view separates (CraftView finds them by name). Each is a group at
  // the body's origin, so assembled nothing moves.
  const part = (name: string) => { const g = add(new THREE.Group()); g.name = name; return g; };
  const telescope = part('telescope'), radiators = part('radiators');

  // ── Photon shields: three nested cones, each with a rolled lip. The outer one is white
  //    outside; every other face is bare film. Each inner rim sits a little lower, which gives
  //    the stepped look from above.
  const shields = [
    { bottom: 0.52, top: 1.6, y0: 0, y1: 1.5 },
    { bottom: 0.45, top: 1.3, y0: 0.03, y1: 1.42 },
    { bottom: 0.38, top: 1.02, y0: 0.06, y1: 1.34 },
  ];
  const shieldParts = shields.map((s, i) => {
    const shield = part(`shield${i}`);
    const geo = wall(s.bottom, s.top, s.y0, s.y1);
    add(new THREE.Mesh(geo, i === 0 ? whiteSkin : filmOut), shield);
    add(new THREE.Mesh(geo, filmIn), shield);
    const lip = add(new THREE.Mesh(new THREE.TorusGeometry(s.top, i === 0 ? 0.03 : 0.022, 10, 128), i === 0 ? white : rim), shield);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = s.y1;
    return shield;
  });
  const foot = add(new THREE.Mesh(new THREE.TorusGeometry(0.525, 0.016, 8, 96), alu), shieldParts[0]); // the ring the outer shield stands on
  foot.rotation.x = Math.PI / 2;
  // Telescope: a black baffle tube with stiffening ribs outside and light-trapping vanes inside,
  // a dark floor at the bottom, and the floor of the shields around it.
  const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 1.05, 64, 1, true), black), telescope);
  tube.position.y = 0.62;
  const tubeLip = add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), dark), telescope);
  tubeLip.rotation.x = Math.PI / 2;
  tubeLip.position.y = 1.145;
  for (let i = 0; i < 6; i++) {
    const y = 0.22 + i * 0.165, r = 0.272 + (y - 0.095) * (0.03 / 1.05);
    const rib = add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.006, 0.009, 6, 64), dark), telescope);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    const vane = add(new THREE.Mesh(new THREE.RingGeometry(r - 0.05 - i * 0.004, r, 64), black), telescope);
    vane.rotation.x = -Math.PI / 2;
    vane.position.y = y;
  }
  // At the bottom of the tube, the telescope's mirror: a shallow dish, so it catches a glint.
  const mouth = add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 48, 8, 0, TAU, Math.PI - 0.24, 0.24), mirror), telescope);
  mouth.position.y = 0.2 + 1.2 * Math.cos(0.24);
  const floor = add(new THREE.Mesh(new THREE.RingGeometry(0.27, 0.52, 64), floorMat), radiators);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.07;

  // ── V-groove radiators: three shallow cones stacked under the shields.
  [0, 1, 2].forEach((i) => {
    const y = -0.03 - i * 0.055;
    add(new THREE.Mesh(wall(0.46, 0.68 - i * 0.045, y - 0.035, y, 64), alu), radiators);
  });
  // The orange foil skirt between the radiators and the bus.
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.53, 0.2, 48), kapton), radiators);
  neck.position.y = -0.24;

  // ── Bus: an eight-sided body in white blankets, dark equipment boxes with rounded edges,
  //    two foil-wrapped ones, star trackers.
  const bus = part('bus');
  bus.position.y = -0.68;
  const hull = new THREE.CylinderGeometry(0.56, 0.56, 0.68, 8);
  hull.attributes.uv.array.forEach((v, i, uv) => { if (i % 2 === 0) uv[i] = v * 3; }); // three repeats of the folds round the body
  add(new THREE.Mesh(hull, blanket), bus);
  const topDeck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.035, 8), alu), bus);
  topDeck.position.y = 0.355;
  const bottomDeck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.035, 8), alu), bus);
  bottomDeck.position.y = -0.355;
  // Equipment on the faces. Angle is around the axis; the solar array is on the -x side.
  const face = (angle: number, w: number, h: number, d: number, y: number, mat: THREE.Material) => {
    const box = add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.014), mat), bus);
    const r = 0.52 + d / 2;
    box.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    box.rotation.y = -angle + Math.PI / 2;
  };
  const step = TAU / 8;
  face(step * 0.5, 0.26, 0.34, 0.12, 0.02, dark);
  face(step * 1.5, 0.2, 0.16, 0.1, 0.14, kapton);
  face(step * 1.5, 0.12, 0.2, 0.07, -0.12, dark);
  face(step * 2.5, 0.3, 0.26, 0.14, -0.04, dark);
  face(step * -0.5, 0.22, 0.4, 0.09, 0, kapton);
  face(step * -1.5, 0.28, 0.22, 0.13, 0.08, dark);
  face(step * -2.5, 0.16, 0.3, 0.08, -0.06, dark);
  // Two star trackers: short gold barrels angled up and out, with dark apertures.
  [step * 0.1, step * 1.0].forEach((angle, i) => {
    const tracker = add(new THREE.Group(), bus);
    const barrel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.2, 24), gold), tracker);
    barrel.position.y = 0.1;
    const hood = add(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.07, 24, 1, true), dark), tracker);
    hood.position.y = 0.225;
    const eye = add(new THREE.Mesh(new THREE.CircleGeometry(0.066, 24), black), tracker);
    eye.rotation.x = -Math.PI / 2;
    eye.position.y = 0.201;
    tracker.position.set(Math.cos(angle) * 0.62, 0.16 - i * 0.06, Math.sin(angle) * 0.62);
    tracker.rotation.set(0, -angle, -0.95, 'YXZ');
  });
  // Low-gain antennas: two small white cones.
  [step * -3.2, step * 0.2].forEach((angle) => {
    const ant = add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 20), white), bus);
    ant.position.set(Math.cos(angle) * 0.5, -0.42, Math.sin(angle) * 0.5);
    ant.rotation.x = Math.PI;
  });
  // Launch adapter ring and its lower flange.
  const adapter = add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.16, 64, 1, true), alu), bus);
  adapter.position.y = -0.45;
  const flange = add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 10, 64), rim), bus);
  flange.rotation.x = Math.PI / 2;
  flange.position.y = -0.53;
  const base = add(new THREE.Mesh(new THREE.CircleGeometry(0.43, 48), dark), bus);
  base.rotation.x = Math.PI / 2;
  base.position.y = -0.4;

  // ── Solar array: one flat panel along the sun side (-x), cells facing out, cable runs on
  //    the back, an aluminium edge frame, hinge brackets, and two struts holding it off the bus.
  const array = part('array');
  array.position.set(-1.0, -0.66, 0);
  const W = 1.5, H = 1.62, T = 0.035;
  const front = add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), cells), array);
  front.rotation.y = -Math.PI / 2;
  front.position.x = -T / 2 - 0.002;
  add(new THREE.Mesh(new THREE.BoxGeometry(T, H, W), [backing, dark, dark, dark, dark, dark]), array); // +x is the back
  const edge = (w: number, h: number, y: number, z: number) => {
    const e = add(new THREE.Mesh(new THREE.BoxGeometry(T + 0.012, h, w), frame), array);
    e.position.set(0, y, z);
  };
  edge(W + 0.03, 0.03, H / 2, 0);
  edge(W + 0.03, 0.03, -H / 2, 0);
  edge(0.03, H, 0, W / 2);
  edge(0.03, H, 0, -W / 2);
  [[H / 2 - 0.12, W / 2 - 0.1], [-H / 2 + 0.12, W / 2 - 0.1], [H / 2 - 0.12, -W / 2 + 0.1], [-H / 2 + 0.12, -W / 2 + 0.1]].forEach(([y, z]) => {
    const bracket = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.09), white), array);
    bracket.position.set(0.045, y, z);
  });
  [-0.38, 0.38].forEach((z) => {
    const strut = add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.48, 10), alu), array);
    strut.rotation.z = Math.PI / 2;
    strut.position.set(0.25, 0.04, z);
  });

  // Centre the observatory on its middle, and show it as the reference illustration does:
  // seen from a little above the rim, with the bus and solar array in view.
  body.position.y = -0.2;
  craft.rotation.set(0.34, 0.75, -0.14);
  return craft;
}
