// Surface relief drawn in code: what makes light break up across a skin, so that it reads as a
// made thing with seams, fasteners and dents and not as a smooth shape.
import * as THREE from 'three';

/** Heights drawn in grey (mid-grey is the surface, lighter stands proud, darker is cut in),
 *  turned into the surface relief the light catches. */
export function relief(w: number, h: number, strength: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  let seed = 977;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  draw(g, rnd);
  const src = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h);
  const at = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = ((at(x - 1, y) - at(x + 1, y)) / 255) * strength, dy = ((at(x, y + 1) - at(x, y - 1)) / 255) * strength, l = Math.hypot(dx, dy, 1);
    out.data.set([(dx / l) * 127.5 + 127.5, (dy / l) * 127.5 + 127.5, (1 / l) * 127.5 + 127.5, 255], (y * w + x) * 4);
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Shallow dents and the slight unevenness of a painted, handled metal skin. */
export function wear(g: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, dents: number) {
  for (let i = 0; i < dents; i++) {
    const x = rnd() * w, y = rnd() * h, r = 14 + rnd() * 70, v = rnd() > 0.5 ? 255 : 0;
    const d = g.createRadialGradient(x, y, 0, x, y, r);
    d.addColorStop(0, `rgba(${v}, ${v}, ${v}, ${0.04 + rnd() * 0.07})`);
    d.addColorStop(1, `rgba(${v}, ${v}, ${v}, 0)`);
    g.fillStyle = d;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Only the faintest fine texture on top: any more and hard sunlight turns it into grain
  // crawling along the edge of every shadow.
  for (let i = 0; i < w * h * 0.02; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v}, ${v}, ${v}, ${rnd() * 0.02})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}
