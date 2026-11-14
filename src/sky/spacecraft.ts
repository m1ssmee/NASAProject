// SPHEREx, built from its real silhouette: three nested cone-shaped photon shields around the
// telescope, a compact bus beneath, and one sun-facing solar panel.
// NASA publishes no downloadable 3D model of SPHEREx (checked November 2026), so this is drawn
// in code. It is a likeness for the intro, not an engineering model.
import * as THREE from 'three';

export function buildSpacecraft(): THREE.Group {
  const craft = new THREE.Group();
  const shield = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, metalness: 0.15, roughness: 0.42, side: THREE.DoubleSide });
  const inner = new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: 0.2, roughness: 0.9, side: THREE.DoubleSide });
  const body = new THREE.MeshStandardMaterial({ color: 0xd8b867, metalness: 0.2, roughness: 0.5 });
  const cell = new THREE.MeshStandardMaterial({ color: 0x27407a, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide });

  // Shields: open truncated cones, widest at the top, each sitting inside the last.
  const cones: [number, number, number][] = [[1.55, 0.62, 1.9], [1.22, 0.5, 1.75], [0.9, 0.4, 1.6]];
  cones.forEach(([top, bottom, height], i) => {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 48, 1, true), shield);
    cone.position.y = 0.55 + i * 0.05;
    craft.add(cone);
  });
  // Telescope barrel and its dark aperture.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 32, 1, true), inner);
  barrel.position.y = 0.55;
  craft.add(barrel);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), inner);
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = -0.05;
  craft.add(mirror);
  // Bus.
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.75, 6), body);
  bus.position.y = -0.78;
  craft.add(bus);
  // Solar panel, canted along one side.
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3), cell);
  panel.position.set(1.05, -0.35, 0);
  panel.rotation.set(0, Math.PI / 2, 0);
  panel.rotation.z = -0.32;
  craft.add(panel);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.4), shield);
  frame.position.set(1.07, -0.35, 0);
  frame.rotation.copy(panel.rotation);
  craft.add(frame);

  // Tipped toward the viewer so the nested shields, its most recognisable feature, face the camera.
  craft.rotation.set(1.05, 0.5, -0.3);
  return craft;
}
