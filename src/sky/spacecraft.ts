// SPHEREx, modelled from NASA/JPL-Caltech reference images (PIA26531 artist's concept,
// PIA26543 and PIA26537 assembly photographs). NASA publishes no downloadable 3D model, so this
// is built in code. Proportions follow the real observatory, about 3.2 m across the outer
// shield and 2.6 m tall; one unit here is one metre. It is a likeness, not an engineering model.
//
//   +y is the telescope boresight. From the top down:
//   three nested photon shields (mirror-finish cones, stepped rims) around the telescope,
//   three V-groove radiator rings, the interface ring, the bus with its equipment boxes and
//   star trackers, the launch adapter ring, and one solar array hanging along the sun side.
import * as THREE from 'three';

const TAU = Math.PI * 2;

/** A cone wall as a lathe: (radius, height) pairs from bottom to top. */
function wall(bottomR: number, topR: number, y0: number, y1: number, segments = 96) {
  return new THREE.LatheGeometry([new THREE.Vector2(bottomR, y0), new THREE.Vector2(topR, y1)], segments);
}

/** Solar cells: a grid of dark blue cells with thin bus bars, drawn once onto a small canvas. */
function cellTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b1020';
  g.fillRect(0, 0, 256, 256);
  const cols = 6, rows = 8, gap = 3;
  const w = (256 - gap * (cols + 1)) / cols, h = (256 - gap * (rows + 1)) / rows;
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
  t.anisotropy = 4;
  return t;
}

/** Crinkled insulation blanket: a noisy bump map so foil-wrapped parts are not flat. */
function foilBump(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  const img = g.createImageData(128, 128);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 128 * 128; i++) {
    const v = 110 + rnd() * 90;
    img.data.set([v, v, v, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  g.filter = 'blur(1.4px)';
  g.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** The outer shield is built from gores of aluminised film: faint seams and streaks, as in the photographs. */
function shieldTexture(): THREE.Texture {
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
  const bump = foilBump();

  // Materials
  const mirror = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, map: shieldTexture(), metalness: 1, roughness: 0.2, side: THREE.FrontSide });
  const shieldInside = new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.85, roughness: 0.42, side: THREE.BackSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
  const rim = new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 1, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.2, roughness: 0.85, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8963a, metalness: 1, roughness: 0.38, bumpMap: bump, bumpScale: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e9ea, metalness: 0.05, roughness: 0.62 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bec5, metalness: 1, roughness: 0.34, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22262b, metalness: 0.6, roughness: 0.5 });
  const cells = new THREE.MeshStandardMaterial({ map: cellTexture(), metalness: 0.55, roughness: 0.28 });
  const backing = new THREE.MeshStandardMaterial({ color: 0x2b2e33, metalness: 0.35, roughness: 0.7 });

  const add = <T extends THREE.Object3D>(mesh: T, parent: THREE.Object3D = body): T => { parent.add(mesh); return mesh; };

  // ── Photon shields: three nested cones. The outer one is the mirror the photographs show;
  //    each inner rim sits a little lower, which gives the stepped look from above.
  const shields = [
    { bottom: 0.52, top: 1.6, y0: 0, y1: 1.5 },
    { bottom: 0.45, top: 1.3, y0: 0.03, y1: 1.42 },
    { bottom: 0.38, top: 1.02, y0: 0.06, y1: 1.34 },
  ];
  shields.forEach((s, i) => {
    const geo = wall(s.bottom, s.top, s.y0, s.y1);
    add(new THREE.Mesh(geo, i === 0 ? mirror : alu));
    add(new THREE.Mesh(geo, shieldInside));
    const lip = add(new THREE.Mesh(new THREE.TorusGeometry(s.top, 0.014, 8, 96), rim));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = s.y1;
  });
  // Telescope: baffle tube inside the inner shield, dark mouth, and the floor of the shields.
  const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 1.05, 48, 1, true), black));
  tube.position.y = 0.62;
  const tubeLip = add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 48), rim));
  tubeLip.rotation.x = Math.PI / 2;
  tubeLip.position.y = 1.145;
  const mouth = add(new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), black));
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = 0.2;
  const floor = add(new THREE.Mesh(new THREE.RingGeometry(0.27, 0.52, 64), floorMat));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.07;

  // ── V-groove radiators: three shallow cones stacked under the shields.
  [0, 1, 2].forEach((i) => {
    const y = -0.03 - i * 0.055;
    add(new THREE.Mesh(wall(0.46, 0.68 - i * 0.045, y - 0.035, y, 64), alu));
  });
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 48), alu));
  neck.position.y = -0.24;

  // ── Bus: an eight-sided body with white panels, foil-wrapped boxes, star trackers.
  const bus = add(new THREE.Group());
  bus.position.y = -0.68;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.68, 8), white), bus);
  const topDeck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.035, 8), alu), bus);
  topDeck.position.y = 0.355;
  const bottomDeck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.035, 8), alu), bus);
  bottomDeck.position.y = -0.355;
  // Equipment on the faces. Angle is around the axis; the solar array is on the -x side.
  const face = (angle: number, w: number, h: number, d: number, y: number, mat: THREE.Material) => {
    const box = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), bus);
    const r = 0.52 + d / 2;
    box.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    box.rotation.y = -angle + Math.PI / 2;
  };
  const step = TAU / 8;
  face(step * 0.5, 0.26, 0.34, 0.12, 0.02, gold);
  face(step * 1.5, 0.2, 0.16, 0.1, 0.14, gold);
  face(step * 1.5, 0.12, 0.2, 0.07, -0.12, dark);
  face(step * 2.5, 0.3, 0.26, 0.14, -0.04, gold);
  face(step * -0.5, 0.22, 0.4, 0.09, 0, gold);
  face(step * -1.5, 0.28, 0.22, 0.13, 0.08, gold);
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
  const flange = add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.022, 10, 64), rim), bus);
  flange.rotation.x = Math.PI / 2;
  flange.position.y = -0.53;
  const base = add(new THREE.Mesh(new THREE.CircleGeometry(0.43, 48), dark), bus);
  base.rotation.x = Math.PI / 2;
  base.position.y = -0.4;

  // ── Solar array: one flat panel along the sun side (-x), cells facing out, held off the
  //    bus by two struts, with a foil edge and white hinge brackets as in the reference.
  const array = add(new THREE.Group());
  array.position.set(-1.0, -0.66, 0);
  const W = 1.5, H = 1.62, T = 0.035;
  const front = add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), cells), array);
  front.rotation.y = -Math.PI / 2;
  front.position.x = -T / 2 - 0.002;
  add(new THREE.Mesh(new THREE.BoxGeometry(T, H, W), backing), array);
  const edge = (w: number, h: number, y: number, z: number) => {
    const e = add(new THREE.Mesh(new THREE.BoxGeometry(T + 0.012, h, w), gold), array);
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
    const strut = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 10), alu), array);
    strut.rotation.z = Math.PI / 2;
    strut.position.set(0.25, 0.04, z);
  });

  // Centre the observatory on its middle, and show it as the reference illustration does:
  // seen from a little above the rim, with the bus and solar array in view.
  body.position.y = -0.2;
  craft.rotation.set(0.34, 0.75, -0.14);
  return craft;
}
