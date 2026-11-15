import type { Metadata } from 'next';
import { BakedPlate } from '@/components/BakedPlate';
import { ChapterSnap } from '@/components/ChapterSnap';
import { TargetSky } from '@/components/TargetSky';
import { targets } from '@/data/targets';

export const metadata: Metadata = {
  title: 'Five test targets',
  description: 'Barnard’s Star, Epsilon Indi B, WISE 0855, RW Aurigae and R Draconis: the five objects the challenge uses to test a SPHEREx blink tool, and what each one teaches.',
};

const rate = (t: (typeof targets)[number]) => (t.expect === 'moves' ? `${(Math.hypot(t.pmRa, t.pmDec) / 1000).toFixed(1)}″ a year` : 'changes brightness');

export default function Targets() {
  return (
    <>
      <header className="page-head wrap grid">
        <h1 className="display" data-split="lines" data-intro>Three movers, two that flicker</h1>
        <p className="lede">The challenge names five objects a blink tool has to handle. Each has a page with a plate made from real SPHEREx exposures and notes on what to look for.</p>
      </header>
      <ChapterSnap select=".tsky" align="center" />
      <section className="wrap tgroup" aria-label="The five targets on the sky">
        <TargetSky targets={targets.map((t) => ({
          slug: t.slug, name: t.name, kind: t.kind, look: t.look, rate: rate(t), moves: t.expect === 'moves', ra: t.ra, dec: t.dec,
          plate: <BakedPlate slug={t.slug} colour size={48} edge={false} alt={`SPHEREx plate of ${t.name}, blinking between two passes`} />,
        }))} />
        <p className="small muted tsky__key"><i className="is-mover" /> moves between passes <i /> changes brightness. The whole sky, laid flat. Pick a target.</p>
      </section>
    </>
  );
}
