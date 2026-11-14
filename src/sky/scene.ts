// The sky renderer: the bright star catalogue as one point cloud, projected in the vertex
// shader with the same stereographic maths as project.ts, plus the spacecraft for the intro.
import * as THREE from 'three';
import { basis, radecToVec, scaleOf, separation, type View } from './project';
import { buildSpacecraft } from './spacecraft';

export interface NotedInput { ra: number; dec: number; pulse?: number }

const vertex = /* glsl */ `
uniform mat3 uBasis;
uniform vec2 uScale;
uniform float uTime;
uniform float uDpr;
uniform float uZoom;
uniform float uShine;
uniform float uStars;
attribute float aMag;
attribute float aBv;
attribute float aNote;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 q = uBasis * position;
  float k = 2.0 / (1.0 + q.z);
  gl_Position = q.z < -0.2 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(q.xy * k * uScale, 0.0, 1.0);
  float b = clamp((7.2 - aMag) / 8.6, 0.04, 1.0);
  float size = (1.9 + 10.5 * b * b) * uZoom;
  float glow = 0.0;
  if (aNote != 0.0) {
    float seed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
    // Variables pulse steadily; other noted stars catch the light now and then.
    glow = aNote > 0.0
      ? 0.5 + 0.5 * sin(uTime * 6.2832 / aNote + seed * 6.2832)
      : smoothstep(0.82, 1.0, sin(uTime * 0.45 + seed * 6.2832));
    glow *= uShine;
    size = max(size, 4.2 * uZoom) * (1.0 + 0.7 * glow);
  }
  gl_PointSize = size * uDpr;
  vec3 cool = vec3(0.74, 0.82, 1.0), white = vec3(1.0, 0.98, 0.95), warm = vec3(1.0, 0.76, 0.56);
  float t = clamp((aBv + 0.2) / 1.9, 0.0, 1.0);
  vColor = t < 0.4 ? mix(cool, white, t / 0.4) : mix(white, warm, (t - 0.4) / 0.6);
  vAlpha = min(1.0, 0.5 + 0.75 * b + 0.5 * glow) * uStars;
}`;

const fragment = /* glsl */ `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.18, d);
  gl_FragColor = vec4(vColor * vAlpha * a, 1.0);
}`;

export interface Sky {
  /** Catalogue-snapped positions of the noted stars, in input order. */
  noted: { ra: number; dec: number }[];
  setView(v: View): void;
  /** 0 = no shining (reduced motion), 1 = normal. */
  setShine(s: number): void;
  /** Overall star brightness, 0 to 1 (the opening fades the sky in). */
  setStars(a: number): void;
  craft: THREE.Group;
  craftCamera: THREE.PerspectiveCamera;
  showCraft(on: boolean): void;
  render(time: number): void;
  dispose(): void;
}

export function createSky(canvas: HTMLCanvasElement, catalogue: Float32Array, notedIn: NotedInput[]): Sky {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  const dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(max-width: 767px)').matches ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x101214, 1);
  renderer.autoClear = false;

  const n = catalogue.length / 4;
  const extra = notedIn.length;
  const pos = new Float32Array((n + extra) * 3);
  const mag = new Float32Array(n + extra);
  const bv = new Float32Array(n + extra);
  const note = new Float32Array(n + extra);
  for (let i = 0; i < n; i++) {
    pos.set(radecToVec(catalogue[i * 4], catalogue[i * 4 + 1]), i * 3);
    mag[i] = catalogue[i * 4 + 2];
    bv[i] = catalogue[i * 4 + 3];
  }
  // Put each noted star on its catalogue dot; ones too faint for the catalogue get their own point.
  let count = n;
  const noted = notedIn.map((s) => {
    let best = -1, bestSep = 0.25;
    for (let i = 0; i < n; i++) {
      if (Math.abs(catalogue[i * 4 + 1] - s.dec) > 0.3) continue;
      const sep = separation(s.ra, s.dec, catalogue[i * 4], catalogue[i * 4 + 1]);
      if (sep < bestSep) { best = i; bestSep = sep; }
    }
    const flag = s.pulse ?? -1;
    if (best >= 0) {
      note[best] = flag;
      return { ra: catalogue[best * 4], dec: catalogue[best * 4 + 1] };
    }
    pos.set(radecToVec(s.ra, s.dec), count * 3);
    mag[count] = 5.2; bv[count] = 1.4; note[count] = flag;
    count++;
    return { ra: s.ra, dec: s.dec };
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, count * 3), 3));
  geometry.setAttribute('aMag', new THREE.BufferAttribute(mag.subarray(0, count), 1));
  geometry.setAttribute('aBv', new THREE.BufferAttribute(bv.subarray(0, count), 1));
  geometry.setAttribute('aNote', new THREE.BufferAttribute(note.subarray(0, count), 1));
  const uniforms = {
    uBasis: { value: new THREE.Matrix3() },
    uScale: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uDpr: { value: dpr },
    uZoom: { value: 1 },
    uShine: { value: 1 },
    uStars: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const starScene = new THREE.Scene();
  starScene.add(points);
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const craftScene = new THREE.Scene();
  const craftCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const craft = buildSpacecraft();
  craft.visible = false;
  craftScene.add(craft);
  craftScene.add(new THREE.HemisphereLight(0xffffff, 0x5a6470, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-2, 5, 6);
  craftScene.add(sun);

  let w = 0, h = 0;
  return {
    noted,
    craft,
    craftCamera,
    setView(v) {
      if (v.width !== w || v.height !== h) {
        w = v.width; h = v.height;
        renderer.setSize(w, h, false);
        craftCamera.aspect = w / h;
        craftCamera.updateProjectionMatrix();
      }
      const [r, nn, f] = basis(v.ra, v.dec);
      // Matrix3.set takes rows, so M * p gives (p.right, p.north, p.front).
      uniforms.uBasis.value.set(r[0], r[1], r[2], nn[0], nn[1], nn[2], f[0], f[1], f[2]);
      const s = scaleOf(v);
      uniforms.uScale.value.set(s / (w / 2), s / (h / 2));
      uniforms.uZoom.value = Math.min(2.2, Math.max(0.85, Math.sqrt(60 / v.fov)));
    },
    setShine(s) { uniforms.uShine.value = s; },
    setStars(a) { uniforms.uStars.value = a; },
    showCraft(on) { craft.visible = on; },
    render(time) {
      uniforms.uTime.value = time;
      renderer.clear();
      renderer.render(starScene, flat);
      if (craft.visible) {
        renderer.clearDepth();
        renderer.render(craftScene, craftCamera);
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      craft.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
    },
  };
}
