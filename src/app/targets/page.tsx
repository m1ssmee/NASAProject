import type { Metadata } from 'next';
import Link from 'next/link';
import { BakedPlate } from '@/components/BakedPlate';
import { Hop } from '@/components/Hop';
import { targets } from '@/data/targets';

export const metadata: Metadata = {
  title: 'Five test targets',
  description: 'Barnard’s Star, Epsilon Indi B, WISE 0855, RW Aurigae and R Draconis: the five objects the challenge uses to test a SPHEREx blink tool, and what each one teaches.',
};

export default function Targets() {
  return (
    <>
      <header className="page-head wrap grid">
        <h1 className="display" data-split="lines" data-intro>Three movers, two that flicker</h1>
        <p className="lede">The challenge names five objects a blink tool has to handle. Each has a page with a plate made from real SPHEREx exposures and notes on what to look for.</p>
      </header>
      <section className="wrap" style={{ paddingBottom: 'clamp(4rem, 10vh, 8rem)' }} aria-label="Targets">
        <ul className="tindex">
          {targets.map((t) => (
            <li key={t.slug}>
              <Link href={`/targets/${t.slug}`} className="tindex__row">
                <BakedPlate slug={t.slug} colour size={48} edge={false} alt={`SPHEREx plate of ${t.name}, blinking between two passes`} />
                <span>
                  <span className="h-l"><Hop>{t.name}</Hop></span>
                  <span className="tindex__kind">{t.kind}</span>
                </span>
                <span className="tindex__look">{t.look}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
