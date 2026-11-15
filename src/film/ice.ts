// Frost shaken off the cold oxygen tanks and carried back by the airflow, as on every real
// climb. Each flake is a short streak (where it was a fiftieth of a second ago to where it is
// now), placed by formula from the clock, so nothing is simulated and nothing accumulates.
import * as THREE from 'three';

const vertex = /* glsl */ `
uniform float uTime, uStrength;
attribute vec4 aSeed; // angle round the tank, where along it, how fast, when
attribute float aEnd; // 0 the head of the streak, 1 its tail
varying float vA;
void main() {
  const float LIFE = 1.5;
  float age = fract(uTime / LIFE * (0.6 + 0.8 * aSeed.z) + aSeed.w);
  float t = max(age - aEnd * 0.014, 0.0) * LIFE;
  float ang = aSeed.x * 6.2832;
  float back = (26.0 + 62.0 * aSeed.z) * t * (0.3 + 0.7 * min(t * 2.5, 1.0)); // the airflow picks it up
  float away = 1.88 + 1.5 * sqrt(t) * (0.2 + aSeed.z); // off the skin, staying close in the slipstream
  vec3 p = vec3(cos(ang) * away, aSeed.y - back, sin(ang) * away);
  p.x += sin(t * 9.0 + aSeed.w * 40.0) * 0.3 * t;
  p.z += cos(t * 7.0 + aSeed.w * 23.0) * 0.3 * t;
  vA = uStrength * smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(0.45, 1.0, age)) * (0.3 + 0.7 * fract(aSeed.w * 7.3));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export interface Ice {
  mesh: THREE.LineSegments;
  /** strength 0 to 1; colour is the light falling on the flakes. */
  set(strength: number, clock: number, r: number, g: number, b: number): void;
  dispose(): void;
}

/** Flakes come off between y0 and y1 (metres along the vehicle). */
export function createIce(y0: number, y1: number, count = 150): Ice {
  let seed = 4711;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const seeds = new Float32Array(count * 8), ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const s = [rnd(), y0 + (y1 - y0) * rnd(), rnd(), rnd()];
    seeds.set(s, i * 8);
    seeds.set(s, i * 8 + 4);
    ends[i * 2 + 1] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3)); // unused: the shader places them
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  const uniforms = { uTime: { value: 0 }, uStrength: { value: 0 }, uColor: { value: new THREE.Vector3(1, 1, 1) } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex,
    fragmentShader: /* glsl */ `precision highp float; uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor * vA * 0.5, vA * 0.3); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    set(strength, clock, r, g, b) {
      mesh.visible = strength > 0.01;
      uniforms.uStrength.value = strength;
      uniforms.uTime.value = clock;
      uniforms.uColor.value.set(r, g, b);
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
