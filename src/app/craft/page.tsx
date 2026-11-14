import type { Metadata } from 'next';
import { CraftView } from '@/components/CraftView';

export const metadata: Metadata = {
  title: 'The observatory',
  description: 'A model of the SPHEREx observatory, built from NASA reference images: three nested photon shields, the radiators, the bus and its solar array. Drag to turn it.',
};

export default function Craft() {
  return (
    <>
      <header className="page-head wrap grid" style={{ paddingBottom: '1.5rem' }}>
        <h1 className="display">The observatory</h1>
        <p className="lede">SPHEREx is 2.6 metres tall and 3.2 across. Most of that is three nested cones that shade the telescope from the Sun and the Earth so it can cool to about minus 210 degrees Celsius on its own.</p>
      </header>
      <section className="wrap" aria-label="Model" style={{ paddingBottom: 'clamp(3rem, 8vh, 6rem)' }}>
        <CraftView />
        <p className="small muted" style={{ marginTop: '0.75rem', maxWidth: '70ch' }}>
          Drag to turn it. This model was built for this site from NASA/JPL-Caltech photographs and illustrations; NASA has not released a 3D model of SPHEREx. It is a likeness, not an engineering drawing.
        </p>
      </section>
    </>
  );
}
