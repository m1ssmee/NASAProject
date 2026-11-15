'use client';
// The observatory torn down by scrolling. Nothing here plays on its own: every piece's position
// and the camera are worked out from how far the page has scrolled, so the scroll is the hand
// doing the pulling. Each act takes one piece off the way it would really come off (straight up
// along the axis until it is clear of what it sat in, and only then aside), the
// camera closes in on what that uncovers, and a note says what it is. At the end the pieces
// come home one at a time, last off first on, and the observatory backs away until it is one
// more point of light.
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

interface Shot { y: number; d: number; turn: number; tilt: number } // where the camera looks, from how far, and which way round the model is
interface Act { len: number; shot: Shot; name?: string; fact?: string; note?: string }

// `len` is how many window-heights of scrolling the act takes.
const ACTS: Act[] = [
  { len: 0.9, shot: { y: 0.35, d: 9.2, turn: 0.75, tilt: 0.34 } },
  { len: 1, shot: { y: 0.7, d: 8.6, turn: 1.15, tilt: 0.3 }, name: 'Outer shield', fact: '3.2 m across, 1.7 m tall, white outside',
    note: 'The widest of three cones. Two thin aluminium skins on a honeycomb core, 19 millimetres thick in all, painted white outside so it throws the Sun’s heat back.' },
  { len: 1.2, shot: { y: 0.7, d: 7.2, turn: 1.7, tilt: 0.42 }, name: 'Inner shields', fact: 'Two more cones of bare, mirror-bright aluminium',
    note: 'Three cones, one inside the next. Each gap between them is a layer of shade, and lets heat escape sideways to space. Together they keep sunlight and the Earth’s warmth off the telescope. They are why SPHEREx looks like nothing else in orbit.' },
  { len: 1, shot: { y: 0.62, d: 4.8, turn: 2.3, tilt: 0.3 }, name: 'Baffle', fact: 'A black, ribbed tube with rings inside',
    note: 'The tube over the telescope’s mouth. The rings inside trap stray light, so only light from where the telescope is pointed reaches the mirrors.' },
  { len: 1, shot: { y: 0.2, d: 3.3, turn: 2.95, tilt: 0.28 }, name: 'Telescope', fact: 'Three mirrors, 20 cm aperture, 3.5° by 11.3° field',
    note: 'A small telescope with a very wide view, its three mirrors folded into a housing machined into a waffle of pockets. It takes in a strip of sky about 22 full Moons long in every exposure, which is how it covers everything twice a year.' },
  { len: 1, shot: { y: 0.25, d: 3.0, turn: 3.45, tilt: 0.25 }, name: 'Detectors', fact: 'Six, each 2,040 pixels square',
    note: 'The light is split into two beams, with three detectors in each. A filter over every detector changes colour along its length, so where a star lands decides which wavelength is recorded. That is where the 102 colours come from.' },
  { len: 1.2, shot: { y: 0, d: 4.0, turn: 4.0, tilt: 0.16 }, name: 'V-groove radiators', fact: 'Three stacked rings, no coolant',
    note: 'Three rings of mirrored wedges, like umbrellas turned inside out. Each bounces heat sideways out to space. With nothing to run out, the detectors stay near minus 210 degrees Celsius for as long as the mission lasts.' },
  { len: 1, shot: { y: -0.2, d: 2.9, turn: 4.45, tilt: 0.34 }, name: 'Support struts', fact: 'Six legs on a six-sided frame',
    note: 'The telescope has to stay near minus 190 degrees Celsius while the bus under it is warm. It stands on struts built to let almost no heat climb up them.' },
  { len: 1.1, shot: { y: -0.72, d: 4.3, turn: 4.71, tilt: 0.2 }, name: 'Spacecraft bus', fact: 'Computer, battery, reaction wheels, radios, star trackers',
    note: 'Everything that is not the telescope. Reaction wheels and magnetic rods turn the whole observatory to aim it; nothing inside moves. Two star trackers photograph the stars and compare them with a catalogue, so it knows which way it points. The ring underneath is where it sat on the rocket.' },
  { len: 1, shot: { y: -0.7, d: 7.0, turn: 7.4, tilt: 0.2 }, name: 'Solar array', fact: 'One panel, 2.67 m by 1.02 m, about 750 W',
    note: 'A single fixed panel on the sunward side. The spacecraft keeps it pointed at the Sun and keeps the open end of the cones pointed away from both Sun and Earth, all the way round each orbit.' },
  { len: 1.4, shot: { y: 0.35, d: 9.2, turn: 9.6, tilt: 0.34 } },
];
const TOTAL = ACTS.reduce((s, a) => s + a.len, 0);
const LAST = ACTS.length - 1;
const NOTED = ACTS.filter((a) => a.name);

// Which piece comes off in which act, over what part of that act, and where it ends up: how far
// it flies (metres: across, up, towards us) and how it turns (radians).
const RIPS: { piece: string; act: number; from: number; to: number; move: [number, number, number]; turn?: [number, number, number] }[] = [
  { piece: 'shield0', act: 1, from: 0.06, to: 0.68, move: [2.9, 2.5, -1.2], turn: [0.15, 0, -0.55] },
  { piece: 'shield1', act: 2, from: 0.03, to: 0.46, move: [-3.0, 2.3, -0.8], turn: [-0.1, 0, 0.5] },
  { piece: 'shield2', act: 2, from: 0.38, to: 0.82, move: [0.3, 3.9, -2.4], turn: [0.45, 0, -0.2] },
  { piece: 'baffle', act: 3, from: 0.06, to: 0.64, move: [-1.6, 1.2, 1.5], turn: [0.2, 0, 0.95] },
  { piece: 'optics', act: 4, from: 0.26, to: 0.7, move: [0, 0.34, 0] }, // the housing lifts off its legs, detectors and all
  { piece: 'detectors', act: 4, from: 0.26, to: 0.7, move: [0, 0.34, 0] },
  { piece: 'detectors', act: 5, from: 0.05, to: 0.46, move: [0.5, 0.2, 1.5], turn: [0.3, -0.7, 0.5] },
  { piece: 'optics', act: 5, from: 0.5, to: 0.94, move: [1.7, 0.4, 0.9], turn: [0.3, 0.5, -0.4] }, // and gets out of the radiators' way
  { piece: 'groove0', act: 6, from: 0.06, to: 0.4, move: [0, 0.6, 0] },
  { piece: 'groove1', act: 6, from: 0.12, to: 0.44, move: [0, 0.33, 0] },
  { piece: 'groove2', act: 6, from: 0.18, to: 0.48, move: [0, 0.08, 0] },
  { piece: 'radiators', act: 6, from: 0.5, to: 0.95, move: [1.6, 1.5, -0.6], turn: [0.3, 0, -0.5] }, // up over the legs, then aside
  { piece: 'legs', act: 7, from: 0.34, to: 0.7, move: [0, 0.25, 0], turn: [0, -0.6, 0] },
  { piece: 'legs', act: 8, from: 0.02, to: 0.34, move: [-1.6, 0.35, 0.3], turn: [0.2, 0, 0.7] },
  { piece: 'array', act: 9, from: 0.06, to: 0.6, move: [-1.5, 0.15, 0], turn: [0, 0.75, 0] },
];

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const span = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
const smooth = (a: number, b: number, x: number) => { const u = span(a, b, x); return u * u * (3 - 2 * u); };
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
// Starting gently, stopping gently: nothing snaps or bounces.
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export function ObservatoryStory() {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const head = useRef<HTMLElement>(null);
  const notes = useRef<HTMLOListElement>(null);
  const star = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false, stop = () => {};
    const el = host.current!, cv = canvas.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    (async () => {
      try {
        const [THREE, { buildCraftStage }] = await Promise.all([import('three'), import('@/sky/stage')]);
        if (dead) return;
        const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        const stage = buildCraftStage(renderer);
        const lift = new THREE.HemisphereLight(0xc6d4ff, 0x3a3f4a, 0); // apart, the dark insides need light from all round
        stage.scene.add(lift);
        const body = stage.craft.children[0];

        // Every piece that moves, with where it sits assembled.
        type Mover = { o: import('three').Object3D; at: import('three').Vector3; rot: import('three').Euler; steps: typeof RIPS; out?: import('three').Vector3 };
        const movers = new Map<import('three').Object3D, Mover>();
        const mover = (o: import('three').Object3D) => movers.get(o) ?? movers.set(o, { o, at: o.position.clone(), rot: o.rotation.clone(), steps: [] }).get(o)!;
        RIPS.forEach((r) => mover(stage.craft.getObjectByName(r.piece)!).steps.push(r));
        // The order things come off in, so they can go back on in the opposite order.
        const order = new Map<object, number>();
        const count = () => order.size;
        // The equipment boxes and star trackers jump straight out from the faces of the bus.
        stage.craft.getObjectByName('bus')!.children.filter((c) => c.name === 'box' || c.name === 'tracker').forEach((c, i) => {
          const m = mover(c);
          m.out = new THREE.Vector3(c.position.x, 0, c.position.z).normalize().multiplyScalar(c.name === 'box' ? 0.55 : 0.4).setY(c.name === 'box' ? 0 : 0.3);
          m.steps.push({ piece: c.name, act: 8, from: 0.36 + i * 0.035, to: 0.64 + i * 0.035, move: [0, 0, 0] });
        });
        [...movers.values()].flatMap((m) => m.steps).sort((x, y) => x.act - y.act || x.from - y.from).forEach((st) => order.set(st, count()));

        let aspect = 1, p = -1;
        const size = () => {
          renderer.setSize(innerWidth, innerHeight, false);
          aspect = innerWidth / Math.max(1, innerHeight);
          stage.camera.aspect = aspect;
          stage.camera.updateProjectionMatrix();
        };
        size();
        addEventListener('resize', size);
        let seen = true;
        const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
        io.observe(el);
        const look = new THREE.Vector3(), half = Math.tan((stage.camera.fov * Math.PI) / 360);

        const tick = (time: number) => {
          if (document.hidden || !seen) return;
          const box = el.getBoundingClientRect(), want = clamp(-box.top / Math.max(1, box.height - innerHeight));
          p = p < 0 || reduced ? want : p + (want - p) * 0.09; // weight: it glides to where the scroll is
          // Which act, and how far through it.
          let i = 0, x = p * TOTAL;
          while (i < LAST && x >= ACTS[i].len) x -= ACTS[i++].len;
          const u = clamp(x / ACTS[i].len);
          const home = i === LAST; // the last act: everything goes back on, then it backs away
          const away = home ? span(0.62, 0.97, u) : 0;

          movers.forEach((m) => {
            let dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0;
            for (const st of m.steps) {
              // How far along its way out this piece is. Going home, each waits its turn: last off, first on.
              const n = order.get(st)!, wait = 0.03 + ((count() - 1 - n) / count()) * 0.4;
              const t = home ? 1 - span(wait, wait + 0.17, u) : i > st.act ? 1 : i < st.act ? 0 : span(st.from, st.to, u);
              const [mx, my, mz] = m.out ? [m.out.x, m.out.y, m.out.z] : st.move, [tx, ty, tz] = st.turn ?? [0, 0, 0];
              // Straight up the axis first, clear of whatever it sat in; only then aside, turning as it goes.
              const both = my !== 0 && (mx !== 0 || mz !== 0) && !m.out;
              const up = ease(both ? span(0, 0.6, t) : t), aside = ease(both ? span(0.42, 1, t) : t);
              dx += mx * aside; dy += my * up; dz += mz * aside;
              rx += tx * aside; ry += ty * aside; rz += tz * aside;
            }
            m.o.position.set(m.at.x + dx, m.at.y + dy, m.at.z + dz);
            m.o.rotation.set(m.rot.x + rx, m.rot.y + ry, m.rot.z + rz);
          });

          // The camera: at this act's framing while its piece comes off, then on to the next.
          // It never quite stops: a slow drift through the act, most of the move at the end, and no jump between acts.
          const a = ACTS[i].shot, b = ACTS[Math.min(LAST, i + 1)].shot, t = i === LAST ? 0 : 0.14 * u + 0.86 * smooth(0.6, 1, u);
          const intro = i === 0 ? 1 - smooth(0.5, 1, u) : 0, outro = home ? smooth(0.05, 0.4, u) : 0;
          const reading = 1 - Math.max(intro, outro); // a note is up: the model keeps to one side
          stage.craft.rotation.set(mix(a.tilt, b.tilt, t), mix(a.turn, b.turn, t) + (home ? 0.5 * u : 0) + Math.sin(time * 0.4) * 0.03, -0.14 * (intro + outro));
          stage.craft.updateMatrixWorld(true);
          body.localToWorld(look.set(0, mix(a.y, b.y, t), 0));
          const tall = aspect < 1;
          const d = mix(a.d, b.d, t) * (tall ? 0.78 / aspect : 1) * (1 + 40 * away ** 3), h = d * half;
          stage.camera.position.set(
            look.x + h * aspect * (tall ? 0 : 0.36 * reading - 0.1 * intro),
            look.y + h * (tall ? 0.34 * intro - 0.3 * reading : 0.32 * intro),
            look.z + d,
          );
          lift.intensity = 0.6 * (i === 0 ? 0 : i === 1 ? smooth(0, 0.5, u) : home ? 1 - smooth(0.2, 0.6, u) : 1);
          renderer.render(stage.scene, stage.camera);

          // The words.
          cv.style.opacity = String(1 - away ** 2);
          if (star.current) star.current.style.opacity = String(away ** 3);
          if (head.current) { head.current.style.opacity = String(intro); head.current.style.visibility = intro > 0.01 ? 'visible' : 'hidden'; }
          Array.from(notes.current?.children ?? []).forEach((li, n) => {
            const on = n + 1 === i ? smooth(0.1, 0.3, u) * (1 - smooth(0.84, 0.97, u)) : 0, s = (li as HTMLElement).style;
            s.opacity = String(on);
            s.visibility = on > 0.01 ? 'visible' : 'hidden';
            s.setProperty('--slide', `${(n + 1 === i ? (1 - smooth(0.1, 0.34, u)) * 2.5 - smooth(0.8, 1, u) * 2 : 0).toFixed(2)}rem`);
          });
        };
        gsap.ticker.add(tick);
        stop = () => {
          gsap.ticker.remove(tick);
          removeEventListener('resize', size);
          io.disconnect();
          stage.dispose();
          renderer.dispose();
        };
        if (dead) stop();
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => { dead = true; stop(); };
  }, []);

  return (
    <section ref={host} className={failed ? 'story story--plain' : 'story'} style={failed ? undefined : { height: `${(TOTAL + 1) * 100}svh` }} aria-label="SPHEREx, taken apart piece by piece">
      <div className="story__pin">
        {!failed && <canvas ref={canvas} className="story__model" aria-hidden="true" />}
        <i ref={star} className="story__star" aria-hidden="true" />
        <header ref={head} className="story__head">
          <h1 className="display" data-split="lines" data-intro>A telescope in a cone</h1>
          <p className="lede">SPHEREx is 2.6 metres tall and weighs about as much as a grand piano. Most of what you see is shade.</p>
          {!failed && <p className="story__cue mono">Scroll to take it apart</p>}
        </header>
        <ol ref={notes} className="story__notes">
          {NOTED.map((x, n) => (
            <li key={x.name}>
              <p className="mono story__count">{String(n + 1).padStart(2, '0')} / {String(NOTED.length).padStart(2, '0')}</p>
              <h2 className="h-xl">{x.name}</h2>
              <p className="mono story__fact">{x.fact}</p>
              <p className="story__text">{x.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
