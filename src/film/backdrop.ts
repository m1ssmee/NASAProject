// Everything behind the vehicle, as one full-window shader: the dusk sky low down, thin cloud
// in layers sliding past, the engines' light caught in that air, and the Earth's edge with the
// Sun coming up behind it. Where it draws nothing it is transparent and the star map shows.
import * as THREE from 'three';

const fragment = /* glsl */ `
precision highp float;
uniform float uAspect, uTime, uAir, uCloud, uFrame, uFlow, uEarth, uSun, uGlow;
uniform vec2 uDir, uGlowAt;
varying vec2 vP;

float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

void main() {
  vec2 p = vec2(vP.x * uAspect, vP.y); // -1..1 up the window, wider than that across
  vec3 col = vec3(0.0);
  float cover = 0.0;

  // ── Air at dusk: nearly black overhead, deep blue through the middle, paler low down, and the
  //    afterglow where the Sun went (to the right).
  float h = vP.y * 0.5 + 0.5;
  vec3 sky = mix(mix(vec3(0.034, 0.058, 0.094), vec3(0.010, 0.026, 0.068), smoothstep(0.0, 0.5, h)), vec3(0.0013, 0.0030, 0.0100), smoothstep(0.35, 1.0, h));
  vec3 glow = vec3(0.090, 0.036, 0.013) * exp(-h * 3.6) * (0.5 + 0.5 * smoothstep(-1.0, 1.0, vP.x));
  sky += glow;
  // Thin cloud. It lies in flat layers, fixed in the air, so as the vehicle climbs the layers
  // slide back along its path. Far ones are huge and slow; near wisps are small, quick and
  // smeared by the speed. Lit from underneath by the afterglow.
  vec2 w = p * uFrame * 0.5 + uDir * uFlow; // metres, in the air's own frame
  float far = fbm(vec2(w.x * 0.0026, w.y * 0.014));
  float near = (fbm(vec2(w.x * 0.016, w.y * 0.085) + 31.0) + fbm(vec2(w.x * 0.016, w.y * 0.085) + 31.0 + uDir * 0.35) + fbm(vec2(w.x * 0.016, w.y * 0.085) + 31.0 - uDir * 0.35)) / 3.0;
  float wisps = (smoothstep(0.44, 0.74, far) * 0.75 + smoothstep(0.47, 0.70, near) * 0.35) * uCloud;
  sky = mix(sky, vec3(0.020, 0.030, 0.050) + glow * 1.6, wisps * 0.55);
  // The engines' light scattered by the air: brightest at the nozzles, stretched down the plume.
  vec2 g = p - vec2(uGlowAt.x * uAspect, uGlowAt.y);
  float back = clamp(dot(g, -uDir), 0.0, 1.6);
  float d = length(g + uDir * back * 0.85);
  float lit = uGlow * (exp(-d * 2.6) * 0.5 + exp(-d * 9.0) * 0.9) * (0.92 + 0.08 * sin(uTime * 37.0) * sin(uTime * 23.0));
  sky += vec3(1.0, 0.36, 0.09) * lit * (0.35 + 0.65 * wisps + 0.25 * uAir);
  col += sky * uAir;
  cover = uAir;

  // ── The Earth: a huge circle rising into the lower right. Night side towards us, the Sun
  //    just behind the edge, so the air along the edge is lit and nothing else is.
  const float R = 5.2;
  vec2 c = vec2(uAspect * 0.55 + 1.9, -1.0 - R + mix(-0.5, 0.62, uEarth));
  vec2 e = p - c;
  float edge = length(e) - R; // above the edge is positive
  vec2 up = e / length(e);
  // Brightest where the Sun is about to come up: along the edge towards the left of the arc.
  float arc = pow(clamp(dot(up, normalize(vec2(-0.42, 1.0))), 0.0, 1.0), 14.0);
  float day = uSun * (0.10 + 0.90 * arc);
  if (edge < 0.0) {
    float depth = -edge;
    // Night ground: barely there. Cloud tops catch the first light near the edge.
    float cl = fbm(e * 3.1 + 11.0) * 0.6 + fbm(e * 9.0) * 0.4;
    vec3 ground = vec3(0.0018, 0.0030, 0.0062) * (0.6 + 0.8 * cl);
    ground += vec3(0.10, 0.19, 0.34) * day * exp(-depth * 26.0) * (0.35 + 0.9 * smoothstep(0.35, 0.75, cl));
    // The lowest, densest air glows orange from inside the edge.
    ground += vec3(1.3, 0.42, 0.10) * day * exp(-depth * 150.0) * 0.9;
    col = mix(col, ground, smoothstep(0.0, 0.004, depth));
    cover = max(cover, smoothstep(0.0, 0.004, depth));
  }
  // The thin blue line of air above the edge. Thin: a wide halo is what gives a fake away.
  float air = exp(-max(edge, 0.0) * 95.0) * smoothstep(-0.006, 0.0, edge);
  col += (vec3(0.16, 0.42, 1.0) * 1.5 + vec3(0.9, 0.95, 1.0) * exp(-max(edge, 0.0) * 420.0)) * air * day;

  gl_FragColor = vec4(col, max(cover, 0.0));
}`;

export interface Backdrop {
  mesh: THREE.Mesh;
  uniforms: Record<'uAspect' | 'uTime' | 'uAir' | 'uCloud' | 'uFrame' | 'uFlow' | 'uEarth' | 'uSun' | 'uGlow', { value: number }> & Record<'uDir' | 'uGlowAt', { value: THREE.Vector2 }>;
  dispose(): void;
}

export function createBackdrop(): Backdrop {
  const uniforms = {
    uAspect: { value: 1 }, uTime: { value: 0 }, uAir: { value: 1 }, uCloud: { value: 1 }, uFrame: { value: 24 },
    uFlow: { value: 0 }, uEarth: { value: 0 }, uSun: { value: 0 }, uGlow: { value: 0 },
    uDir: { value: new THREE.Vector2(0, 1) }, uGlowAt: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, fragmentShader: fragment,
    vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, // writes colour and coverage as they are
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10; // before everything
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); material.dispose(); } };
}
