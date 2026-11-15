// The launch film's 3D scene. One fixed side-on camera; the vehicle flies across it. Positions
// come from the picture for the current film time (beats.ts); only flicker, shake and streaming
// run on the clock, so the engines feel alive when the scroll stops and the film still plays
// the same backwards.
//
// Light, as it would be: an hour after sunset the vehicle is in the Earth's shadow, lit by the
// dusk sky and by its own engines. As it climbs it comes out of the shadow and the Sun, low
// behind the Earth's edge, catches one side of it hard. The other side stays black.
import * as THREE from 'three';
import { buildSpacecraft } from '@/sky/spacecraft';
import { createBackdrop } from './backdrop';
import type { Picture } from './beats';
import { createIce } from './ice';
import { createLook } from './look';
import { BOOSTER, BOW, CORE, ENGINE, SKIRT, VACUUM, VAPOUR, createPlume } from './plume';
import { BELL_END, INTER_END, TAIL, TIP, UPPER_END, createVehicle, type Piece } from './vehicle';

export interface Film {
  frame(pic: Picture, clock: number): void;
  /** Where the named things are in the window after the last frame, in px (x then y for each):
   *  the rocket's nose, SPHEREx, the four PUNCH satellites, and the stage PUNCH leaves. */
  tags: Float32Array;
  resize(width: number, height: number): void;
  dispose(): void;
}

const FOV = 20, DIVE_FOV = 58, DIVE_END = 0.9; // the dive ends 0.9 m from the telescope's mouth
const half = (fov: number) => Math.tan((fov * Math.PI) / 360);
// Towards the Sun: low, from under the vehicle and a little behind it. It is more than 90
// degrees from the telescope's line of sight, as on the real spacecraft, so it never shines
// into the cone. Towards the Earth: down and to the right.
const SUN = new THREE.Vector3(0.3, -0.85, -0.2).normalize();
// On its final turn SPHEREx swings round into the light, so the Sun rakes down inside the cone
// and the shields and the telescope are lit, not a dark hole. (The real one keeps the Sun out.)
const SUN_IN = new THREE.Vector3(0.5, -0.5, 0.7).normalize();
const EARTH = new THREE.Vector3(0.4, -0.8, 0.45).normalize();

/** What polished surfaces reflect: black space, a faint glow from the Earth, the Sun. */
function surroundings(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const room = new THREE.Scene();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uSun: { value: SUN }, uEarth: { value: EARTH } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun, uEarth;
      void main() {
        vec3 c = mix(vec3(0.003), vec3(0.035, 0.06, 0.11), smoothstep(0.15, 0.95, dot(vDir, uEarth)));
        float s = dot(vDir, uSun);
        c += vec3(1.0, 0.95, 0.86) * (smoothstep(0.992, 0.9996, s) * 22.0 + smoothstep(0.55, 1.0, s) * 0.35);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  room.add(ball);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const map = pmrem.fromScene(room, 0.02);
  pmrem.dispose();
  ball.geometry.dispose();
  ball.material.dispose();
  return map;
}

export function createFilm(canvas: HTMLCanvasElement): Film {
  const small = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // Sharpness steps down if the machine cannot keep up: a smooth film matters more.
  const sharpness = small ? [1.5, 1.1, 0.8, 0.6] : [2, 1.5, 1.1, 0.8]; // a desktop starts at the screen's own resolution
  let level = 0, counted = 0, since = 0, width = 1, height = 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, sharpness[0]));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 9000);
  const look = createLook(renderer, scene, camera, small ? 2 : 4); // eight samples halves the frame rate

  const reflections = surroundings(renderer);
  scene.environment = reflections.texture;

  const backdrop = createBackdrop();
  scene.add(backdrop.mesh);

  const sun = new THREE.DirectionalLight(0xfff2e2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const earthshine = new THREE.DirectionalLight(0x6d8ec6, 0);
  earthshine.position.copy(EARTH).multiplyScalar(100);
  const dusk = new THREE.HemisphereLight(0x5e82bc, 0x05070b, 0);
  // The last of the twilight, low in the west: it gives the vehicle a lighter side while it is
  // still in the Earth's shadow.
  const west = new THREE.DirectionalLight(0x86a6d8, 0);
  west.position.set(-80, 12, 55);
  // In space nothing fills the shadows but the Earth, and that only faintly.
  const fill = new THREE.HemisphereLight(0x1d2a40, 0x47679c, 0);
  // The plume lights the air under the vehicle, and that lights its belly.
  const bounce = new THREE.DirectionalLight(0xff8440, 0);
  scene.add(sun, sun.target, earthshine, dusk, west, fill, bounce);

  const vehicle = createVehicle(scene);
  const { booster, upper, noses } = vehicle;
  const plume = createPlume(BOOSTER), core = createPlume(CORE), jet = createPlume(ENGINE), vacuum = createPlume(VACUUM);
  plume.mesh.position.y = core.mesh.position.y = TAIL - 0.9;
  // Oxygen boiling off both cold tanks and streaming back along the body.
  const vapour = createPlume(VAPOUR), vapourLow = vapour.mesh.clone();
  vapour.mesh.position.y = UPPER_END + 9;
  vapourLow.position.y = INTER_END - 4;
  // The nose cutting the air: a cone of mist round the curve of the nose, and one behind the
  // fairing's base.
  const bow = createPlume(BOW), skirt = createPlume(SKIRT);
  bow.mesh.position.y = TIP - 2.2;
  skirt.mesh.position.y = 0.2;
  vacuum.mesh.position.y = BELL_END;
  const jets = new THREE.Group();
  vehicle.nozzles.forEach((n) => { const j = jet.mesh.clone(); j.position.copy(n); jets.add(j); });
  const fire = new THREE.PointLight(0xff7a2e, 0, 0, 2);
  fire.position.y = TAIL - 7;
  const kick = new THREE.PointLight(0xffb27a, 0, 0, 2);
  kick.position.y = BELL_END - 2;
  // Frost comes off both oxygen tanks: the upper stage's, and the top half of the booster's.
  const ice = createIce(INTER_END - 16, UPPER_END + 12);
  booster.roll.add(plume.mesh, core.mesh, jets, fire, vapourLow);
  upper.roll.add(vacuum.mesh, kick, ice.mesh, vapour.mesh, bow.mesh, skirt.mesh);

  const craft: Piece = { outer: new THREE.Group(), roll: new THREE.Group() };
  const spherex = buildSpacecraft();
  spherex.rotation.set(0, 0, 0); // the model comes tilted for display; here its axis is the vehicle's
  spherex.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  // At the film's distances the shields' rolled lips and the solar panel's edge strips are
  // thinner than a pixel, as are the cables on the bus, and a sunlit thing that thin draws as a row
  // of dots. Left out here.
  spherex.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as (THREE.TorusGeometry | THREE.BoxGeometry) | undefined, q = g?.parameters as { tube?: number; height?: number; depth?: number } | undefined;
    if (q && ((q.tube ?? 1) < 0.035 || g!.type === 'TubeGeometry' || (g!.type === 'BoxGeometry' && Math.min(q.height!, q.depth!) <= 0.03))) o.visible = false;
  });
  craft.roll.add(spherex);
  craft.outer.add(craft.roll);
  scene.add(craft.outer);

  const jitter = (c: number, f1: number, f2: number, f3: number, ph: number) =>
    (Math.sin(c * f1 + ph) + 0.7 * Math.sin(c * f2 + ph * 1.7) + 0.5 * Math.sin(c * f3 + ph * 0.6)) / 2.2;
  const point = new THREE.Vector3(), sunAt = new THREE.Vector3();
  // The solar panel's glass, in the spacecraft's own frame: its middle, and the way it faces.
  const PANEL = new THREE.Vector3(-1.02, -0.95, 0), PANEL_FACES = new THREE.Vector3(-1, 0, 0);
  const glint = new THREE.Vector3(), faces = new THREE.Vector3(), toLens = new THREE.Vector3();
  const tags = new Float32Array(14);
  // The names are placed through a steady copy of the camera: where it would be with no shake or
  // hand-held sway, so the names hold still enough to read while the picture shakes.
  const steady = new THREE.PerspectiveCamera();
  const tag = (i: number) => { point.project(steady); tags[i * 2] = (point.x * 0.5 + 0.5) * width; tags[i * 2 + 1] = (0.5 - point.y * 0.5) * height; };
  let aspect = 1, blank = false;
  // No painted or metal surface may come out much brighter than sunlit white. A glint hundreds
  // of times brighter, on an edge thinner than a pixel, turns into a string of bright beads that
  // crawl as the thing turns, and reads as grain. (Glowing engine parts and flames are left alone.)
  const cap = (shader: { fragmentShader: string }) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'outgoingLight *= min(1.0, 3.0 / max(max(outgoingLight.r, outgoingLight.g), max(outgoingLight.b, 0.0001)));\n#include <opaque_fragment>');
  };
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => {
      const std = x as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial && std.emissive.getHex() === 0) std.onBeforeCompile = cap;
    });
  });
  look.warm();

  return {
    tags,
    frame(pic, clock) {
      if (pic.done) { // only the stars are left: leave the window clear
        if (!blank) { renderer.setRenderTarget(null); renderer.clear(); blank = true; }
        return;
      }
      blank = false;
      if (++counted === 45) {
        const took = clock - since;
        if (since && took < 4 && took > 45 / 36 && level < sharpness.length - 1) { // under 36 frames a second
          renderer.setPixelRatio(Math.min(devicePixelRatio || 1, sharpness[++level]));
          renderer.setSize(width, height, false);
          look.resize(width, height);
        }
        counted = 0;
        since = clock;
      }
      const halfH = pic.frame / 2, halfW = halfH * aspect;
      const base = new THREE.Vector2(pic.at.x * halfW, pic.at.y * halfH);
      // On an upright phone the vehicle climbs more steeply, so it and its flame stay in the window.
      const tilt = pic.tilt * (aspect < 1 ? 0.6 : 1);
      const axis = new THREE.Vector2(Math.sin(tilt), Math.cos(tilt));
      // Each piece starts on the vehicle's axis, then drifts back along it and falls.
      const place = (p: Piece, back = 0, fall = 0, tumble = 0) => {
        p.outer.position.set(base.x - axis.x * back, base.y - axis.y * back - fall, 0);
        p.outer.rotation.set(0, 0, -tilt + tumble);
        p.roll.rotation.y = pic.roll;
      };
      place(booster, pic.booster.back, pic.booster.fall, pic.booster.tumble);
      place(upper, pic.upper.back, pic.upper.fall);
      noses.forEach((n, i) => {
        const side = i ? -1 : 1, o = pic.nose.open;
        place(n, pic.upper.back + o * 45, pic.upper.fall);
        n.roll.children.forEach((c) => { c.position.x = side * o * 70; c.rotation.z = -side * o * 1.4; });
        n.outer.visible = o < 1;
      });
      // PUNCH: each pair leaves the stage at a steady drift, tumbling slowly.
      vehicle.punch.forEach(({ sat, home, out }, i) => {
        const d = pic.punch[i < 2 ? 0 : 1];
        sat.position.copy(home).addScaledVector(out, d);
        sat.rotation.x = d * (i % 2 ? 0.11 : -0.08);
      });
      place(craft);
      craft.roll.rotation.y = pic.roll + pic.craft.spin;
      // Turning to face us: the line of sight swings from the flight axis to straight at the camera.
      craft.outer.rotation.set((pic.craft.face * Math.PI) / 2, 0, -tilt * (1 - pic.craft.face));

      // Engines.
      const thin = 1 - pic.air;
      const flicker = 0.86 + 0.14 * Math.sin(clock * 31) * Math.sin(clock * 47.3);
      plume.set(pic.booster.flame, thin, clock);
      core.set(pic.booster.flame, thin, clock);
      jet.set(pic.booster.flame, thin, clock);
      jets.visible = pic.booster.flame > 0;
      vacuum.set(pic.upper.flame, 1, clock);
      vehicle.heat(pic.booster.flame, pic.upper.flame);
      fire.intensity = 2600 * pic.booster.flame * flicker;
      kick.intensity = 90 * pic.upper.flame * flicker;
      bounce.intensity = 1.0 * pic.booster.flame * pic.air * flicker;
      bounce.position.set(-axis.x * 0.7 - 0.25, -axis.y * 0.7 - 0.55, -0.3).multiplyScalar(100); // from behind: a warm edge, not a wash

      // Frost shedding: only while there is air to tear it off. Lit by the dusk, then by the Sun.
      const warm = Math.max(0, (pic.sun - 0.3) / 0.7); // the first light is red; it whitens on the way up
      const shed = pic.air * Math.min(1, pic.booster.flame * 2);
      const lr = 0.35 + 2.4 * pic.sun, lg = 0.45 + (0.9 + 1.5 * warm) * pic.sun, lb = 0.7 + (0.4 + 2.0 * warm) * pic.sun;
      ice.set(shed, clock, lr, lg, lb);
      vapour.set(shed, 0, clock);
      vapour.tint(lr * 0.5, lg * 0.5, lb * 0.5);
      vapourLow.visible = vapour.mesh.visible;
      // The mist comes and goes, each cone in its own time, as it does on a real climb. It is
      // white: lit by the whole sky, and a little by the Sun.
      const puff = (a: number, b: number, ph: number) => shed * Math.min(1, Math.max(0, Math.sin(clock * a + ph) * Math.sin(clock * b + 1) + 0.5));
      bow.set(puff(1.3, 0.71, 0), 0.5, clock);
      skirt.set(puff(1.1, 0.47, 4), 0.5, clock);
      [bow, skirt].forEach((m) => m.tint(0.35 + 0.3 * lr, 0.4 + 0.3 * lg, 0.45 + 0.3 * lb));

      // Sky and Sun.
      // Kept low: with a bright sky filling in every shadow the vehicle looks like a model on a desk.
      dusk.intensity = 0.6 * pic.air;
      west.intensity = 0.55 * pic.air;
      fill.intensity = 0.55 * pic.sun;
      sun.intensity = 7.5 * pic.sun;
      sun.color.setRGB(1, 0.40 + 0.55 * warm, 0.17 + 0.71 * warm);
      earthshine.intensity = 0.5 * pic.sun;
      scene.environmentIntensity = 0.05 + 0.35 * pic.sun;
      // The shadow map covers what is in frame, so it is as sharp close in as far out.
      const reach = Math.min(80, Math.max(2.6, pic.frame * 0.55)), shade = sun.shadow.camera;
      sun.target.position.set(base.x, base.y, 0);
      const swing = Math.min(1, Math.max(0, (pic.craft.face - 0.42) / 0.58)); // 0 until the final turn
      sunAt.copy(SUN).lerp(SUN_IN, swing * swing * (3 - 2 * swing)).normalize();
      sun.position.set(base.x, base.y, 0).addScaledVector(sunAt, 300);
      shade.left = shade.bottom = -reach;
      shade.right = shade.top = reach;
      shade.near = 300 - reach * 2.5;
      shade.far = 300 + reach * 2.5;
      shade.updateProjectionMatrix();
      // Just over one texel of the shadow map. More than that and thin parts in shadow (the
      // shields' lips, panel edges) reach out of the shadow and light up as rows of bright specks.
      sun.shadow.normalBias = reach / 900;

      // Camera: back far enough to see `frame` metres, shaken by the engines; then down the cone,
      // widening as it closes so the walls rush past.
      const dive = pic.dive, fov = FOV + (DIVE_FOV - FOV) * Math.pow(dive, 1.5);
      // It is never perfectly still: a hand on a long lens always drifts a little.
      const far = halfH / half(FOV), wobble = pic.frame * pic.shake, drift = pic.frame * 0.0016 * (1 - dive);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.position.set(
        (jitter(clock, 67, 101, 143, 0.3) * 0.0055 + Math.sin(clock * 1.9) * 0.0035) * wobble + jitter(clock, 0.37, 0.61, 0.23, 0.9) * drift,
        (jitter(clock, 73, 113, 131, 1.9) * 0.0055 + Math.sin(clock * 2.3 + 1) * 0.0035) * wobble + jitter(clock, 0.31, 0.53, 0.19, 2.7) * drift,
        far * Math.pow(DIVE_END / far, dive),
      );
      camera.rotation.z = jitter(clock, 59, 97, 151, 4.1) * 0.0035 * pic.shake;
      camera.updateMatrixWorld();
      steady.copy(camera);
      steady.position.set(0, 0, camera.position.z);
      steady.rotation.set(0, 0, 0);
      steady.updateMatrixWorld();

      // Behind it all.
      const u = backdrop.uniforms;
      booster.outer.updateMatrixWorld(true);
      point.set(0, TAIL, 0).applyMatrix4(booster.roll.matrixWorld).project(camera);
      u.uGlowAt.value.set(point.x, point.y);
      u.uGlow.value = pic.booster.flame * pic.air * flicker;
      u.uDir.value.copy(axis);
      u.uAspect.value = aspect;
      u.uTime.value = clock;
      u.uAir.value = pic.air;
      u.uCloud.value = pic.clouds;
      u.uFrame.value = pic.frame;
      u.uFlow.value = clock * 42 + pic.climb;
      u.uEarth.value = pic.earth;
      u.uSun.value = pic.sun;

      // Where the names go.
      upper.outer.updateMatrixWorld(true);
      craft.outer.updateMatrixWorld(true);
      point.set(0, TIP - 4.5, 0).applyMatrix4(upper.roll.matrixWorld); tag(0);
      point.set(0, 0.3, 0).applyMatrix4(craft.roll.matrixWorld); tag(1);
      vehicle.punch.forEach(({ sat }, i) => { point.copy(sat.position).applyMatrix4(upper.roll.matrixWorld); tag(2 + i); });
      point.set(0, -1.74, 0).applyMatrix4(upper.roll.matrixWorld); tag(6);

      // The glint: when the solar panel's glass faces half-way between the Sun and the camera it
      // mirrors the Sun straight into the lens. That happens once in SPHEREx's turn.
      point.copy(PANEL).applyMatrix4(spherex.matrixWorld);
      toLens.copy(camera.position).sub(point).normalize().add(sunAt).normalize();
      const mirror = Math.max(0, faces.copy(PANEL_FACES).transformDirection(spherex.matrixWorld).dot(toLens));
      point.project(camera);
      // Not while it is still on the stage.
      glint.set(point.x * 0.5 + 0.5, point.y * 0.5 + 0.5, Math.min(1, pic.upper.back) * (0.3 * mirror ** 10 + 0.7 * mirror ** 70));

      look.render(clock, {
        exposure: pic.exposure,
        // Nearly sharp in space; a little soft in the air and while the lens hunts.
        soft: 0.4 + 0.3 * pic.air + 0.9 * pic.hunt,
        shimmer: 1.3 * pic.air * pic.shake,
        haze: 0.3 * pic.air,
        grain: 0.002 + 0.018 * pic.air,
        glint,
      });
    },
    resize(w, h) {
      width = w; height = h;
      aspect = width / height;
      renderer.setSize(width, height, false);
      look.resize(width, height);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    dispose() {
      [plume, core, jet, vacuum, vapour, bow, skirt, ice, backdrop, vehicle, look, reflections].forEach((x) => x.dispose());
      spherex.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => {
          const mat = x as THREE.MeshStandardMaterial;
          [mat.map, mat.bumpMap, mat.normalMap, mat.roughnessMap].forEach((t) => t?.dispose());
          mat.dispose();
        });
      });
      renderer.dispose();
    },
  };
}
