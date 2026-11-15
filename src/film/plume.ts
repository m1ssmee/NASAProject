// Engine exhaust. Not particles: a soft shell whose brightness depends on how squarely you look
// through it, so its edges fade out like a volume of hot gas, with turbulence streaming down it
// on the clock. Matched to the launch footage. Low down: a white-hot column as wide as the
// vehicle inside a yellow-orange sheath, with shock diamonds. High up: a wide, soft, deep orange
// column behind a ring of white-hot points where the engines are.
import * as THREE from 'three';

const vertex = /* glsl */ `
uniform float uLength, uRadius, uSpread, uCurve, uTime, uWobble, uSpeed, uCalm;
varying float vS, vFacing;
varying vec3 vSeed;
void main() {
  float s = 1.0 - uv.y; // 0 at the nozzle, 1 at the tail
  // Low down the air squeezes the exhaust into a narrow cone. In thin air it balloons out right
  // behind the engines and runs back as a wide column (uCurve falls towards 0.4).
  float r = uRadius * (1.0 + uSpread * pow(s, uCurve));
  // Billows: the edge is never a straight line.
  float billow = sin(s * 29.0 - uTime * uSpeed * 1.6 + position.x * 5.0) * sin(s * 17.0 - uTime * uSpeed * 1.1 + position.z * 7.0);
  r *= 1.0 + 0.16 * billow * smoothstep(0.02, 0.3, s) * (1.0 - uCalm);
  vec3 p = vec3(position.x * r, -s * uLength, position.z * r);
  float w = uWobble * s * s * uRadius * (1.0 - uCalm);
  p.x += w * sin(uTime * 21.0 + s * 13.0);
  p.z += w * cos(uTime * 17.0 + s * 9.0);
  // The shell's outward direction, tipped back by how fast it widens.
  float slope = uRadius * uSpread * uCurve * pow(max(s, 0.02), uCurve - 1.0) / uLength;
  vec3 n = normalize(normalMatrix * normalize(vec3(position.x, slope, position.z)));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFacing = abs(dot(n, normalize(-mv.xyz)));
  vS = s;
  vSeed = vec3(position.x, position.z, s);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
precision highp float;
uniform float uLength, uTime, uGain, uSpeed, uSoft, uFall, uDiamond, uCalm;
uniform vec3 uCool, uHot, uTint;
varying float vS, vFacing;
varying vec3 vSeed;
float hash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  // Turbulence carried downstream. Round the shell it is sampled on a circle, so it has no seam.
  float run = vSeed.z * uLength * 0.11 - uTime * uSpeed;
  float n = noise(vec3(vSeed.xy * 2.2, run)) * 0.6 + noise(vec3(vSeed.xy * 5.0 + 7.0, run * 2.3)) * 0.4;
  float clumps = noise(vec3(vSeed.xy * 0.9 + 3.0, run * 0.3)); // slow, large billows
  // max(): between samples the value can dip below zero, and a negative base makes pow() fail.
  float body = pow(max(vFacing, 0.0), uSoft); // dense through the middle, nothing at the edge
  float fade = smoothstep(0.0, mix(0.03, 0.16, uCalm), vS) * pow(1.0 - smoothstep(0.1, 1.0, vS), 1.4);
  // Exhaust is torn and streaky. Mist formed by a steady pressure field is smooth: a soft cloud
  // with only slow, broad unevenness, and no filaments.
  float dens = body * fade * mix((0.18 + 1.4 * n * n) * (0.55 + 0.9 * clumps), 0.55 + 0.6 * clumps, uCalm);
  float heat = exp(-vS * uFall) * (0.75 + 0.5 * n);
  vec3 col = mix(uCool, uHot, clamp(heat * heat, 0.0, 1.0));
  col *= mix(vec3(0.55, 0.32, 0.2), vec3(1.0), body); // cooler and redder towards the edge
  col *= mix(vec3(1.0), vec3(0.5, 0.25, 0.17), smoothstep(0.25, 0.95, vS)); // and down the tail
  // Shock diamonds: bright knots standing in the jet where the thick air squeezes it.
  col *= 1.0 + uDiamond * 1.7 * pow(0.5 + 0.5 * cos(vS * uLength * 0.4 - 0.8), 6.0) * exp(-vS * 3.5);
  gl_FragColor = vec4(col * uTint * dens * uGain, dens * 0.6);
}`;

export interface Plume {
  mesh: THREE.Mesh;
  /** power 0 to 1; thin 0 (sea level, narrow and bright) to 1 (near vacuum, wide and faint). */
  set(power: number, thin: number, clock: number): void;
  /** Colour the light falling on it (for vapour, which only shows by the light it is in). */
  tint(r: number, g: number, b: number): void;
  dispose(): void;
}

interface Shape { radius: number; length: [number, number]; spread: [number, number]; gain: [number, number]; cool: number[]; hot: number[]; fall: number; soft: number; speed: number; diamonds?: number; calm?: boolean }

/** Nine kerosene engines burning as one column: the orange sheath round the flame. */
export const BOOSTER: Shape = { radius: 2.25, length: [140, 270], spread: [1.1, 7.5], gain: [2.4, 1.7], cool: [1.5, 0.105, 0.012], hot: [7.0, 3.0, 0.7], fall: 4.5, soft: 2.6, speed: 10 };
/** The white-hot heart of the flame low down: as wide as the vehicle, narrowing to its tail.
 *  It shortens and fades as the air thins and the exhaust spreads. */
export const CORE: Shape = { radius: 1.75, length: [95, 40], spread: [-0.5, 2.2], gain: [3.0, 0.45], cool: [5.5, 2.3, 0.45], hot: [15, 11.5, 6.5], fall: 1.7, soft: 1.15, speed: 18, diamonds: 1 };
/** The nose cutting the air. Air itself cannot be seen; what a camera sees, near the speed of
 *  sound, is a smooth cone of mist that forms where the air the nose has shoved aside speeds up
 *  round its curve, expands and chills. It starts part-way down the nose (not at the tip, where
 *  the air is squeezed), lies just clear of the skin, and thins out behind the shoulder. It
 *  comes and goes. Set with thin = 0.5. */
export const BOW: Shape = { radius: 2.3, length: [9, 9], spread: [0.35, 0.35], gain: [0.5, 0.5], cool: [0.8, 0.84, 0.9], hot: [1.0, 1.0, 1.0], fall: 3, soft: 1.5, speed: 30, calm: true };
/** The same again behind the fairing's base, where the vehicle narrows and the air expands. */
export const SKIRT: Shape = { radius: 2.68, length: [8, 8], spread: [0.2, 0.2], gain: [0.32, 0.32], cool: [0.8, 0.84, 0.9], hot: [1.0, 1.0, 1.0], fall: 3, soft: 1.7, speed: 30, calm: true };
/** Cold oxygen boiling off the tanks, torn back along the body by the airflow. */
export const VAPOUR: Shape = { radius: 1.95, length: [34, 34], spread: [0.9, 0.9], gain: [0.16, 0.16], cool: [0.55, 0.62, 0.75], hot: [1.0, 1.0, 1.0], fall: 4, soft: 2.6, speed: 24 };
/** One engine's own jet: what shows as a white-hot point at the base. */
export const ENGINE: Shape = { radius: 0.5, length: [12, 8], spread: [0.9, 3.4], gain: [1.2, 0.9], cool: [2.6, 0.4, 0.04], hot: [10, 5.6, 1.9], fall: 2.6, soft: 1.3, speed: 16 };
/** The vacuum engine: almost invisible, as in the footage. */
export const VACUUM: Shape = { radius: 1.5, length: [60, 60], spread: [11, 11], gain: [0.02, 0.02], cool: [0.35, 0.5, 1.0], hot: [1.6, 1.3, 1.0], fall: 9, soft: 3.2, speed: 14 };

export function createPlume(shape: Shape): Plume {
  const shell = new THREE.CylinderGeometry(1, 1, 1, 40, 28, true);
  const uniforms = {
    uLength: { value: shape.length[0] }, uRadius: { value: shape.radius }, uSpread: { value: shape.spread[0] },
    uCurve: { value: 0.8 }, uTime: { value: 0 }, uWobble: { value: 0.5 }, uGain: { value: 0 }, uSpeed: { value: shape.speed },
    uSoft: { value: shape.soft }, uFall: { value: shape.fall },
    uCool: { value: new THREE.Vector3(...shape.cool) }, uHot: { value: new THREE.Vector3(...shape.hot) },
    uDiamond: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uCalm: { value: shape.calm ? 1 : 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(shell, material);
  mesh.frustumCulled = false; // the shader moves the vertices
  const mix = (r: [number, number], u: number) => r[0] + (r[1] - r[0]) * u;
  return {
    mesh,
    set(power, thin, clock) {
      mesh.visible = power > 0.001;
      const flicker = 0.88 + 0.09 * Math.sin(clock * 43) * Math.sin(clock * 29.3) + 0.05 * Math.sin(clock * 97);
      uniforms.uTime.value = clock;
      uniforms.uGain.value = mix(shape.gain, thin) * power * flicker;
      uniforms.uLength.value = mix(shape.length, thin) * (0.5 + 0.5 * power);
      uniforms.uSpread.value = mix(shape.spread, thin);
      uniforms.uCurve.value = 0.8 - 0.38 * thin;
      uniforms.uDiamond.value = (shape.diamonds ?? 0) * (1 - thin);
    },
    tint(r, g, b) { uniforms.uTint.value.set(r, g, b); },
    dispose() { shell.dispose(); material.dispose(); },
  };
}
