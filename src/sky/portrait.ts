// A picture of the SPHEREx model, rendered once and kept as an image, for places that need the
// spacecraft drawn small many times a second without running a second 3D scene.
export async function craftPortrait(size = 512): Promise<string> {
  const [THREE, { buildCraftStage }] = await Promise.all([import('three'), import('./stage')]);
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  const stage = buildCraftStage(renderer);
  stage.camera.aspect = 1;
  stage.camera.position.set(0, 0, 8.4);
  stage.camera.updateProjectionMatrix();
  renderer.render(stage.scene, stage.camera);
  const url = canvas.toDataURL('image/png');
  stage.dispose();
  renderer.dispose();
  return url;
}
