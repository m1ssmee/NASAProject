// The spacecraft with its lighting and reflection environment, shared by the opening sequence
// on the home page and the inspection page at /craft.
import * as THREE from 'three';
import { buildSpacecraft } from './spacecraft';

export interface CraftStage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  craft: THREE.Group;
  dispose(): void;
}

export function buildCraftStage(renderer: THREE.WebGLRenderer): CraftStage {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  const craft = buildSpacecraft();
  scene.add(craft);
  // Light as in orbit: one hard sun, a faint blue fill from the Earth below, and an environment
  // for the mirror-finish shield to reflect (black sky above, the Earth's glow below, the sun).
  const sun = new THREE.DirectionalLight(0xfff4e6, 4.2);
  sun.position.set(-4, 5, 6);
  // Real shadows: the shields shade the bus, the array shades its side of it.
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -2.3, right: 2.3, top: 2.3, bottom: -2.3, near: 1, far: 20 });
  sun.shadow.normalBias = 0.012;
  renderer.shadowMap.enabled = true;
  craft.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  scene.add(sun);
  const earthshine = new THREE.DirectionalLight(0x8fa6cc, 0.45);
  earthshine.position.set(2, -5, 1);
  scene.add(earthshine);
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 sky = vec3(0.03, 0.032, 0.038);
          vec3 limb = vec3(0.40, 0.44, 0.52);
          vec3 ground = vec3(0.13, 0.15, 0.20);
          vec3 c = mix(ground, limb, smoothstep(-0.9, -0.12, y));
          c = mix(c, sky, smoothstep(-0.12, 0.12, y));
          float sunDot = dot(vDir, normalize(vec3(-4.0, 5.0, 6.0)));
          c += vec3(1.0, 0.95, 0.85) * (smoothstep(0.985, 0.999, sunDot) * 28.0 + smoothstep(0.55, 1.0, sunDot) * 0.9);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  ));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.02);
  scene.environment = env.texture;
  scene.environmentIntensity = 1.15;
  pmrem.dispose();

  return {
    scene, camera, craft,
    dispose() {
      env.dispose();
      craft.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => {
          const mat = x as THREE.MeshStandardMaterial;
          mat.map?.dispose();
          mat.bumpMap?.dispose();
          mat.normalMap?.dispose();
          mat.dispose();
        });
      });
    },
  };
}
