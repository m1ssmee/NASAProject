import Link from 'next/link';
import { BakedPlate } from '@/components/BakedPlate';
import { HeroPlate } from '@/components/HeroPlate';
import { Hop } from '@/components/Hop';
import { Ruler } from '@/components/Ruler';
import { FreshStrip, type FreshData } from '@/components/FreshStrip';
import { FullSkyLink } from '@/components/FullSkyLink';
import { Seek } from '@/components/Seek';
import { SkyMap } from '@/components/SkyMap';
import { notedStars, viewerHref } from '@/data/stars';
import { targets } from '@/data/targets';
import freshJson from '../../public/sky/fresh.json';

const fresh = freshJson as FreshData;

const rate = (t: (typeof targets)[number]) => {
  const pm = Math.hypot(t.pmRa, t.pmDec) / 1000;
  return t.expect === 'moves' ? `${pm.toFixed(1)}″ a year` : 'changes brightness';
};

export default function Home() {
  return (
    <>
      <section className="skyhero" aria-labelledby="hero-h">
        <SkyMap fresh={fresh.fields.slice(0, 40)} />
        <div className="skyhero__over grid">
          <div className="skyhero__h">
            <h1 id="hero-h" className="display">Something up here moved.</h1>
          </div>
          <div className="skyhero__seek">
            <p className="skyhero__hint">Drag the sky. Pick a ringed star, or any spot, and SPHEREx shows you how it changed.</p>
            <Seek hint={false} />
          </div>
        </div>
      </section>

      <FreshStrip data={fresh} />

      <section className="sec wrap" aria-labelledby="read-h">
        <div className="grid game">
          <div className="game__plate">
            <HeroPlate />
          </div>
          <div className="game__copy">
            <h2 id="read-h" className="h-xl" data-split="lines">Pluto was found this way in 1930.</h2>
            <p className="lede" style={{ marginTop: '1.5rem', maxWidth: '40ch' }} data-reveal="fade">
              Clyde Tombaugh flicked between two glass plates until one dot jumped. The machine was called a blink comparator. This is one, pointed at a billion infrared sources nobody has finished looking through.
            </p>
          </div>
        </div>
        <div className="read">
          <div className="read__row">
            <h3 className="read__name h-l">It moved</h3>
            <p className="read__text">A source that sits somewhere else on the second plate is close to us: an asteroid, a comet, a nearby star or a brown dwarf. Subtract one plate from the other and it leaves a dark spot beside a light one.</p>
            <figure className="read__pic">
              <BakedPlate slug="epsilon-indi-b" view="diff" size={40} alt="Difference of two SPHEREx passes on the brown dwarf pair Epsilon Indi B: a dark spot next to a light spot, the mark of motion." />
              <figcaption>Epsilon Indi B, 1.1 to 1.6 µm</figcaption>
            </figure>
          </div>
          <div className="read__row">
            <h3 className="read__name h-l">It changed</h3>
            <p className="read__text">Same place, different brightness. That is a variable star, a supernova or a flaring galaxy. The subtraction shows one spot of a single shade with no partner.</p>
            <figure className="read__pic">
              <BakedPlate slug="rw-aurigae" view="diff" size={40} alt="Difference of two SPHEREx passes on the variable star RW Aurigae: a single spot of one shade, the mark of a brightness change." />
              <figcaption>RW Aurigae, 1.6 to 2.4 µm</figcaption>
            </figure>
          </div>
          <div className="read__row">
            <h3 className="read__name h-l">It is not real</h3>
            <p className="read__text">Bright stars overflow the detector and leave grey holes, rings and spikes. Cosmic rays mark one exposure and never return. If it shows up once, or sits exactly on a bright star, leave it.</p>
            <figure className="read__pic">
              <BakedPlate slug="r-draconis" size={48} alt="SPHEREx image of the bright star R Draconis with a blank, overflowed centre and a wide halo, blinking between two passes." />
              <figcaption>R Draconis, saturated core</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="sec--tight wrap" aria-labelledby="targets-h">
        <div className="grid">
          <div className="sec__head">
            <h2 id="targets-h" className="h-xl" data-split="lines">Five places to start</h2>
          </div>
        </div>
        <ul className="index">
          {targets.map((t) => (
            <li key={t.slug}>
              <Link href={`/targets/${t.slug}`} className="index__row">
                <span className="index__name h-l"><Hop>{t.name}</Hop></span>
                <span className="index__kind">{t.kind}</span>
                <span className="index__move mono">{rate(t)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sec--tight wrap" aria-labelledby="noted-h">
        <div className="grid">
          <div className="sec__head">
            <h2 id="noted-h" className="h-xl" data-split="lines">Stars with notes</h2>
            <p className="muted" style={{ marginTop: '1rem', maxWidth: '52ch' }}>Every ringed star on the map, as a list. Each opens the viewer at that star.</p>
          </div>
        </div>
        <ul className="noted">
          {notedStars.filter((s) => !s.target).map((s) => (
            <li key={s.id}>
              <Link href={viewerHref({ ...s, name: s.name })}>
                <b>{s.name}</b>
                <span>{s.kind}{s.distance ? `, ${s.distance}` : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sec wrap grid bands" aria-labelledby="bands-h">
        <div className="bands__copy">
          <h2 id="bands-h" className="h-xl" data-split="lines">102 colours, none of them visible</h2>
          <p style={{ marginTop: '1.5rem', maxWidth: '46ch' }} data-reveal="fade">
            SPHEREx has no filter wheel. Each of its six detectors sits behind a filter that changes colour along its length, so where a star lands decides which wavelength gets recorded. The viewer stacks every exposure from one detector and one pass into a clean plate, and can turn the whole set into a spectrum while you wait.
          </p>
          <p style={{ marginTop: '2rem' }}>
            <FullSkyLink>Blink your own patch of sky</FullSkyLink>
          </p>
        </div>
        <div className="bands__ruler" data-reveal="clip">
          <Ruler />
        </div>
      </section>
    </>
  );
}
