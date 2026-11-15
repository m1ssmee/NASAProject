// Temporary: typeface candidates on the site's own words, for the owner to choose from.
// Delete this page once one is chosen.
import { Big_Shoulders, Chakra_Petch, Instrument_Serif, Krona_One, Onest, Oxanium, Syne, Tektur } from 'next/font/google';

const body = Onest({ subsets: ['latin'], display: 'swap' });
const syne = Syne({ subsets: ['latin'], display: 'swap' });
const tektur = Tektur({ subsets: ['latin'], display: 'swap' });
const krona = Krona_One({ subsets: ['latin'], weight: '400', display: 'swap' });
const oxanium = Oxanium({ subsets: ['latin'], display: 'swap' });
const shoulders = Big_Shoulders({ subsets: ['latin'], display: 'swap' });
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], display: 'swap' });
const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '700'], display: 'swap' });

export const metadata = { title: 'Typeface samples', robots: { index: false } };

// size is a multiple of the headline size, so wide faces and narrow ones fill about the same space
const SAMPLES = [
  { key: 'E', name: 'Syne', note: 'Wide, odd, art-school', cls: syne.className, h: { fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95 }, size: 0.9 },
  { key: 'F', name: 'Tektur', note: 'Angular, machined', cls: tektur.className, h: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 0.98 }, size: 0.95 },
  { key: 'G', name: 'Krona One', note: 'Very wide, calm, 1970s space programme', cls: krona.className, h: { fontWeight: 400, letterSpacing: '-0.05em', lineHeight: 1.05 }, size: 0.68 },
  { key: 'H', name: 'Oxanium', note: 'Squared-off, sci-fi console', cls: oxanium.className, h: { fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.98 }, size: 0.95 },
  { key: 'I', name: 'Big Shoulders', note: 'Tall, industrial, stencilled on a rocket', cls: shoulders.className, h: { fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 0.88, textTransform: 'uppercase' as const }, size: 1.25 },
  { key: 'J', name: 'Instrument Serif, italic', note: 'Elegant and quiet', cls: instrument.className, h: { fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 0.95 }, size: 1.1 },
  { key: 'K', name: 'Chakra Petch', note: 'Clipped corners, flight hardware labels', cls: chakra.className, h: { fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.98 }, size: 0.95 },
];

export default function TypeSamples() {
  return (
    <div className={`wrap ${body.className}`} style={{ padding: '6rem var(--gutter) 4rem', display: 'grid', gap: '4.5rem', fontStretch: '100%' }}>
      {SAMPLES.map((s) => (
        <section key={s.key} style={{ display: 'grid', gap: '1rem', maxWidth: '76rem' }}>
          <p className="mono" style={{ color: 'var(--c-mark)' }}>{s.key} · {s.name} · {s.note}</p>
          <p className={s.cls} style={{ ...s.h, fontSize: `calc(${s.size} * clamp(3rem, 8.5vw, 8rem))` }}>Something up here moved.</p>
          <p className={s.cls} style={{ ...s.h, fontSize: `calc(${s.size} * clamp(1.6rem, 3vw, 2.6rem))` }}>Pluto was found this way in 1930.</p>
          <p style={{ maxWidth: '46ch', fontSize: '1.125rem', lineHeight: 1.5 }}>
            Clyde Tombaugh flicked between two glass plates until one dot jumped. The machine was called a blink comparator.
          </p>
          <p style={{ display: 'flex', gap: '2rem', fontSize: '0.9375rem', fontWeight: 500 }}>
            <span>Viewer</span><span>Targets</span><span>Observatory</span><span>Method</span>
            <span className="mono" style={{ marginLeft: 'auto' }}>17h 57m 48.48s  +04° 41′ 34.8″</span>
          </p>
        </section>
      ))}
    </div>
  );
}
