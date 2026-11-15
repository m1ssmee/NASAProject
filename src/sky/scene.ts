// The sky renderer: the bright star catalogue as one point cloud, projected in the vertex
// shader with the same stereographic maths as project.ts.
import * as THREE from 'three';
import { basis, radecToVec, scaleOf, separation, type View } from './project';

export interface NotedInput { ra: number; dec: number; pulse?: number }

const vertex = /* glsl */ `
uniform mat3 uBasis;
uniform vec2 uScale;
uniform float uShiftY;
uniform float uFill;
uniform float uTime;
uniform float uDpr;
uniform float uZoom;
uniform float uShine;
uniform float uStars;
uniform float uVivid;
attribute float aMag;
attribute float aBv;
attribute float aNote;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 q = uBasis * position;
  float k = 2.0 / (1.0 + q.z);
  gl_Position = q.z < -0.2 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(q.xy * k * uScale + vec2(0.0, uShiftY), 0.0, 1.0);
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
  // Full screen: the same temperature colours, told more plainly (blue Rigel, orange Antares).
  float grey = dot(vColor, vec3(0.3, 0.59, 0.11));
  vColor = mix(vColor, clamp(mix(vec3(grey), vColor, 2.6), 0.0, 1.0), uVivid);
  // The opening fills the sky brightest stars first: uFill sweeps a magnitude limit from -2 to 8.5.
  float limit = mix(-2.0, 8.5, uFill);
  vAlpha = min(1.0, 0.5 + 0.75 * b + 0.5 * glow) * uStars * (1.0 - smoothstep(limit - 0.9, limit, aMag));
}`;

const fragment = /* glsl */ `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.18, d);
  gl_FragColor = vec4(vColor * vAlpha * a, vAlpha * a);
}`;

// The Milky Way: NASA's star-free all-sky map, looked up per pixel by undoing the projection.
const glowVertex = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const glowFragment = /* glsl */ `
precision highp float;
uniform mat3 uBasis;
uniform vec2 uScale;
uniform float uShiftY;
uniform float uGlow;
uniform sampler2D uMap;
varying vec2 vNdc;
void main() {
  vec2 P = vec2(vNdc.x, vNdc.y - uShiftY) / uScale;
  float r2 = dot(P, P);
  float f = 4.0 / (4.0 + r2);
  // Rows of uBasis are right, north, front: q * M is the transpose, back to sky axes.
  vec3 p = vec3(P * f, (4.0 - r2) / (4.0 + r2)) * uBasis;
  float ra = atan(p.y, p.x);
  float dec = asin(clamp(p.z, -1.0, 1.0));
  // The map has RA 0 in the middle and RA increasing to the left.
  vec3 c = texture2D(uMap, vec2(fract(0.5 - ra / 6.2831853), 0.5 + dec / 3.1415927)).rgb;
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  c = clamp(mix(vec3(l), c, 1.7), 0.0, 1.0);
  // Drop the faint all-sky haze so the sky away from the band stays dark.
  float a = smoothstep(0.05, 0.42, l) * uGlow;
  // Premultiplied output: the opacity must cover the colour, or some browsers (Edge, Safari)
  // composite the canvas as if the band were not there.
  vec3 rgb = c * a;
  gl_FragColor = vec4(rgb, max(rgb.r, max(rgb.g, rgb.b)));
}`;

// Constellation figures: each segment is a thin quad built in the vertex shader from its two
// star positions, so the lines stay glued to the stars and stop just short of them.
const lineVertex = /* glsl */ `
uniform mat3 uBasis;
uniform vec2 uScale;
uniform float uShiftY;
uniform vec2 uHalf;
uniform mediump float uWidth;
uniform float uGap;
uniform float uActive;
attribute vec3 aOther;
attribute float aSide;
attribute float aEdge;
attribute float aT;
attribute float aFig;
varying float vEdge;
varying float vT;
varying float vOn;
vec2 proj(vec3 p, out float z) {
  vec3 q = uBasis * p;
  z = q.z;
  return (q.xy * (2.0 / max(1.0 + q.z, 0.05)) * uScale + vec2(0.0, uShiftY)) * uHalf;
}
void main() {
  float za, zb;
  vec2 a = proj(position, za), b = proj(aOther, zb);
  vec2 d = b - a;
  float len = max(length(d), 0.0001);
  vec2 dir = d / len;
  float reach = uWidth * 0.5 + 1.0;
  vec2 p = a + dir * min(uGap, len * 0.3) + vec2(-dir.y, dir.x) * aSide * reach;
  gl_Position = (za < -0.2 || zb < -0.2) ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(p / uHalf, 0.0, 1.0);
  vEdge = aEdge * reach;
  vT = aT;
  vOn = abs(aFig - uActive) < 0.5 ? 1.0 : 0.0;
}`;

const lineFragment = /* glsl */ `
precision mediump float;
uniform mediump float uWidth;
uniform float uDraw;
uniform float uAlpha;
uniform float uAll;
varying float vEdge;
varying float vT;
varying float vOn;
void main() {
  float edge = 1.0 - smoothstep(uWidth * 0.5 - 0.5, uWidth * 0.5 + 0.5, abs(vEdge));
  float drawn = 1.0 - smoothstep(uDraw - 0.015, uDraw, vT);
  float a = edge * min(1.0, uAll + vOn * uAlpha * drawn);
  gl_FragColor = vec4(vec3(0.6, 0.73, 1.0) * a, a);
}`;

export interface FigureInput { lines: number[][] }
export interface LineState {
  /** Index of the figure being shown, or -1. */
  active: number;
  /** 0 to 1: how much of the active figure has been drawn, star to star. */
  draw: number;
  /** Brightness of the active figure. */
  alpha: number;
  /** Brightness of every figure at once (the "Lines" switch). */
  all: number;
}

export interface Sky {
  /** Catalogue-snapped positions of the noted stars, in input order. */
  noted: { ra: number; dec: number }[];
  setView(v: View): void;
  /** 0 = no shining (reduced motion), 1 = normal. */
  setShine(s: number): void;
  /** Overall star brightness, 0 to 1 (the opening fades the sky in). */
  setStars(a: number): void;
  /** 0 shows no stars, 1 all of them; in between, the brightest come first. */
  setFill(f: number): void;
  /** Hand over the constellation figures (once), then steer them with setLines. */
  setFigures(figures: FigureInput[]): void;
  setLines(state: LineState): void;
  /** Fetch the Milky Way picture (once). Nothing shows until setGlow is raised. */
  loadMilkyWay(url: string): void;
  /** 0 to 1: the Milky Way's brightness and the strength of the star colours. */
  setGlow(a: number): void;
  render(time: number): void;
  dispose(): void;
}

export function createSky(canvas: HTMLCanvasElement, catalogue: Float32Array, notedIn: NotedInput[]): Sky {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  const dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(max-width: 767px)').matches ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  // Transparent: during the opening this canvas lies over the whole page.
  renderer.setClearColor(0x000000, 0);
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
    uFill: { value: 1 },
    uShiftY: { value: 0 },
    uVivid: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  const starScene = new THREE.Scene();
  starScene.add(points);

  const lineUniforms = {
    uBasis: uniforms.uBasis, uScale: uniforms.uScale, uShiftY: uniforms.uShiftY,
    uHalf: { value: new THREE.Vector2(1, 1) },
    uWidth: { value: 1.3 }, uGap: { value: 7 },
    uActive: { value: -1 }, uDraw: { value: 0 }, uAlpha: { value: 0 }, uAll: { value: 0 },
  };
  const lineMaterial = new THREE.ShaderMaterial({
    vertexShader: lineVertex, fragmentShader: lineFragment, uniforms: lineUniforms,
    depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  let lineMesh: THREE.Mesh | null = null;

  const glowUniforms = {
    uBasis: uniforms.uBasis, uScale: uniforms.uScale, uShiftY: uniforms.uShiftY,
    uGlow: { value: 0 }, uMap: { value: null as THREE.Texture | null },
  };
  const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: glowVertex, fragmentShader: glowFragment, uniforms: glowUniforms,
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMaterial);
  glowMesh.frustumCulled = false;
  glowMesh.renderOrder = -1;
  glowMesh.visible = false;
  starScene.add(glowMesh);
  let glow = 0, zoomDim = 1, glowAsked = false;
  const applyGlow = () => {
    glowUniforms.uGlow.value = glow * zoomDim * 0.62;
    glowMesh.visible = glow > 0 && !!glowUniforms.uMap.value;
    uniforms.uVivid.value = glow;
  };
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);


  let w = 0, h = 0;
  return {
    noted,
    setView(v) {
      if (v.width !== w || v.height !== h) {
        w = v.width; h = v.height;
        renderer.setSize(w, h, false);
      }
      const [r, nn, f] = basis(v.ra, v.dec);
      // Matrix3.set takes rows, so M * p gives (p.right, p.north, p.front).
      uniforms.uBasis.value.set(r[0], r[1], r[2], nn[0], nn[1], nn[2], f[0], f[1], f[2]);
      const s = scaleOf(v);
      uniforms.uScale.value.set(s / (w / 2), s / (h / 2));
      uniforms.uShiftY.value = v.cy !== undefined ? 1 - (2 * v.cy) / h : 0;
      lineUniforms.uHalf.value.set(w / 2, h / 2);
      // Close in, the picture is softer than the stars: let it step back a little.
      zoomDim = 0.7 + 0.3 * Math.min(1, Math.max(0, (v.fov - 14) / 40));
      applyGlow();
      uniforms.uZoom.value = Math.min(2.2, Math.max(0.85, Math.sqrt(60 / v.fov)));
    },
    setShine(s) { uniforms.uShine.value = s; },
    setStars(a) { uniforms.uStars.value = a; },
    setFill(f) { uniforms.uFill.value = f; },
    setFigures(figures) {
      if (lineMesh) return;
      const P: number[] = [], O: number[] = [], S: number[] = [], E: number[] = [], T: number[] = [], F: number[] = [], I: number[] = [];
      figures.forEach((fig, f) => {
        const segs: { a: number[]; b: number[]; len: number }[] = [];
        for (const l of fig.lines) {
          for (let i = 0; i + 3 < l.length; i += 2) {
            segs.push({ a: radecToVec(l[i], l[i + 1]), b: radecToVec(l[i + 2], l[i + 3]), len: separation(l[i], l[i + 1], l[i + 2], l[i + 3]) });
          }
        }
        const total = segs.reduce((x, s) => x + s.len, 0) || 1;
        let run = 0;
        for (const s of segs) {
          const t0 = run / total, t1 = (run += s.len) / total, base = P.length / 3;
          // Two corners at each end; "side" is geometric, "edge" is which rim of the line it is.
          P.push(...s.a, ...s.a, ...s.b, ...s.b);
          O.push(...s.b, ...s.b, ...s.a, ...s.a);
          S.push(1, -1, -1, 1);
          E.push(1, -1, 1, -1);
          T.push(t0, t0, t1, t1);
          F.push(f, f, f, f);
          I.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('aOther', new THREE.Float32BufferAttribute(O, 3));
      g.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1));
      g.setAttribute('aEdge', new THREE.Float32BufferAttribute(E, 1));
      g.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1));
      g.setAttribute('aFig', new THREE.Float32BufferAttribute(F, 1));
      g.setIndex(I);
      lineMesh = new THREE.Mesh(g, lineMaterial);
      lineMesh.frustumCulled = false;
      lineMesh.renderOrder = 0;
      lineMesh.visible = false;
      starScene.add(lineMesh);
    },
    setLines(state) {
      lineUniforms.uActive.value = state.active;
      lineUniforms.uDraw.value = state.draw;
      lineUniforms.uAlpha.value = state.alpha;
      lineUniforms.uAll.value = state.all;
      if (lineMesh) lineMesh.visible = state.all > 0 || (state.active >= 0 && state.alpha > 0);
    },
    loadMilkyWay(url) {
      if (glowAsked) return;
      glowAsked = true;
      new THREE.TextureLoader().load(url, (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        glowUniforms.uMap.value = t;
        renderer.initTexture(t); // upload it now, not on the first frame it is seen
        applyGlow();
      }, undefined, () => { glowAsked = false; });
    },
    setGlow(a) { glow = a; applyGlow(); },
    render(time) {
      uniforms.uTime.value = time;
      renderer.clear();
      renderer.render(starScene, flat);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      lineMesh?.geometry.dispose();
      lineMaterial.dispose();
      glowUniforms.uMap.value?.dispose();
      glowMesh.geometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    },
  };
}
