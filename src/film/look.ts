// The film's camera. The scene is drawn in high dynamic range, the brightest things bloom, and a
// last pass does what a real camera and the air in front of it do, because a picture that is
// perfectly sharp and perfectly clean reads as a model: haze between the lens and the vehicle,
// shimmer from the air, a lens that is never quite sharp and fringes colour towards the corners,
// exposure, a film curve, sensor noise, a vignette. That pass also works out how much of the
// star map underneath each pixel hides, because the film's canvas lies over the map and empty
// space has to stay see-through.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** What the camera is doing this frame. */
export interface Lens {
  exposure: number;
  /** Softness in pixels: about 1 at best focus, more while the lens is hunting. */
  soft: number;
  /** Air shimmer in pixels, as seen through a long lens low in the atmosphere. */
  shimmer: number;
  /** 0 to 1: how much the air between camera and vehicle veils it. */
  haze: number;
  /** Sensor noise, as a fraction of full brightness. Some in the dusk air, where a camera is
   *  short of light; next to none in sunlight in space, where the picture is still and any
   *  noise shows as grain crawling over the vehicle. */
  grain: number;
  /** Sunlight glancing off the spacecraft straight into the lens: where in the picture (x and
   *  y, 0 to 1 from the bottom left) and how strongly (z, 0 to 1). */
  glint: THREE.Vector3;
}

const quad = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// One bad pixel (not-a-number, or a glint thousands of times too bright) would be smeared across
// the whole picture by the bloom. This pass, before the bloom, makes every pixel a sane value.
const Clean = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: quad,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      if (any(isnan(t)) || any(isinf(t))) t = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(clamp(t.rgb, 0.0, 40.0), clamp(t.a, 0.0, 1.0));
    }`,
};

const Develop = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uPixel: { value: new THREE.Vector2(1, 1) }, // one device pixel, in texture units
    uExposure: { value: 1 }, uTime: { value: 0 }, uSoft: { value: 1 }, uShimmer: { value: 0 }, uHaze: { value: 0 },
    uHazeColor: { value: new THREE.Vector3(0.011, 0.024, 0.056) },
    uGlint: { value: new THREE.Vector3() },
    uGrain: { value: 0.022 }, uVignette: { value: 0.42 }, uFringe: { value: 0.9 },
  },
  vertexShader: quad,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uPixel;
    uniform vec3 uHazeColor, uGlint;
    uniform float uExposure, uTime, uSoft, uShimmer, uHaze, uGrain, uVignette, uFringe;
    varying vec2 vUv;
    // The ACES film curve (Narkowicz fit): highlights roll off to white the way film does.
    vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    // A lens is never perfectly sharp: each point is spread over a small disc.
    vec4 look(vec2 uv) {
      vec2 r = uPixel * uSoft;
      return texture2D(tDiffuse, uv) * 0.36
        + (texture2D(tDiffuse, uv + r) + texture2D(tDiffuse, uv - r)
         + texture2D(tDiffuse, uv + vec2(r.x, -r.y)) + texture2D(tDiffuse, uv - vec2(r.x, -r.y))) * 0.16;
    }
    // A glint straight into the lens, as a real one shows it: a point burnt out to white, glare
    // spreading round it in soft uneven rays (nothing ruled), and the faint ring and disc of
    // light bounced between the lens's own elements.
    vec3 glint(vec2 uv) {
      vec2 d = (uv - uGlint.xy) * vec2(uPixel.y / uPixel.x, 1.0);
      float r = length(d);
      float light = 20.0 / (1.0 + r * r / 0.000009) + 0.14 * exp(-r * 7.0);
      vec2 dir = d / max(r, 1.0e-4); // sampled round a circle, so the rays have no seam
      light += 0.45 * noise(dir * 4.0 + 3.0) * noise(dir * 9.0 + 9.0) * exp(-r * 19.0);
      vec3 c = vec3(1.0, 0.95, 0.87) * light;
      float ring = r - 0.17;
      c += vec3(0.5, 0.75, 1.0) * 0.022 * exp(-ring * ring * 5000.0) + vec3(1.0, 0.6, 0.3) * 0.018 * exp(-(ring - 0.012) * (ring - 0.012) * 5000.0);
      vec2 g = (uv - (1.0 - uGlint.xy)) * vec2(uPixel.y / uPixel.x, 1.0); // mirrored through the middle
      c += vec3(0.35, 0.6, 0.5) * 0.03 * (1.0 - smoothstep(0.03, 0.036, length(g)));
      return c * uGlint.z;
    }
    void main() {
      vec2 uv = vUv;
      // Air shimmer: slow, small, and different everywhere.
      vec2 wave = vec2(noise(uv * vec2(46.0, 27.0) + vec2(0.0, uTime * 4.6)), noise(uv * vec2(39.0, 31.0) + vec2(21.0, -uTime * 3.9))) - 0.5;
      uv += wave * uShimmer * uPixel * 2.0;
      vec4 t = look(uv);
      // Red and blue land slightly apart towards the corners.
      vec2 q = uv - 0.5;
      vec2 split = q * dot(q, q) * uFringe * uPixel * 6.0;
      // Through the same soft lens as green, or thin bright lines would come out green.
      t.r = look(uv + split).r;
      t.b = look(uv - split).b;
      if (uGlint.z > 0.001) t.rgb += glint(vUv);
      float cover = clamp(t.a, 0.0, 1.0);
      // Haze: the air between the lens and the vehicle lifts its shadows towards the sky's colour.
      t.rgb = mix(t.rgb, uHazeColor * cover, uHaze);
      vec3 c = pow(film(max(t.rgb, 0.0) * uExposure), vec3(1.0 / 2.2));
      // Solid things hide the stars; so does anything bright enough to drown them.
      float peak = max(c.r, max(c.g, c.b));
      float a = max(cover, peak);
      // Sensor noise, a little of it coloured. None where the window is empty space, which
      // belongs to the star map, and none in true black, where it would show as bright specks.
      vec2 g = gl_FragCoord.xy + fract(uTime * 7.31) * 517.0;
      vec3 n = vec3(hash(g), hash(g + 19.7), hash(g + 43.1)) - 0.5;
      c = max(c + mix(vec3(n.g), n, 0.4) * uGrain * a * (1.0 - 0.7 * peak) * smoothstep(0.0, 0.08, peak), 0.0);
      a = max(a, max(c.r, max(c.g, c.b)));
      float keep = 1.0 - uVignette * smoothstep(0.25, 0.85, length(vUv - 0.5) * 1.25);
      // Premultiplied: the vignette darkens the picture and the stars under it alike.
      gl_FragColor = vec4(c * keep, 1.0 - (1.0 - a) * keep);
    }`,
};

export interface Look {
  /** Build every shader now, so nothing stalls the first time it comes into view. */
  warm(): void;
  render(clock: number, lens: Lens): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, samples: number): Look {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, target);
  const draw = new RenderPass(scene, camera);
  draw.clearColor = new THREE.Color(0x000000);
  draw.clearAlpha = 0; // empty space stays transparent
  // Flame and hard glints bloom widely; sunlit paint only just, as glare does in a real lens.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.11, 0.45, 2.3);
  const clean = new ShaderPass(Clean), develop = new ShaderPass(Develop);
  composer.addPass(draw);
  composer.addPass(clean);
  composer.addPass(bloom);
  composer.addPass(develop);
  const u = develop.uniforms;
  return {
    warm() {
      renderer.setRenderTarget(composer.readBuffer); // shaders are built for the buffer they draw into
      renderer.compile(scene, camera);
      renderer.setRenderTarget(null);
    },
    render(clock, lens) {
      u.uTime.value = clock;
      u.uExposure.value = lens.exposure;
      u.uSoft.value = lens.soft * renderer.getPixelRatio();
      u.uShimmer.value = lens.shimmer * renderer.getPixelRatio();
      u.uHaze.value = lens.haze;
      u.uGrain.value = lens.grain;
      u.uGlint.value.copy(lens.glint);
      composer.render();
    },
    resize(width, height) {
      const ratio = renderer.getPixelRatio(); // it may have been lowered to keep the film smooth
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
      u.uPixel.value.set(1 / (width * ratio), 1 / (height * ratio));
    },
    dispose() { bloom.dispose(); clean.dispose(); develop.dispose(); composer.dispose(); target.dispose(); },
  };
}
