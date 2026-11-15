import Link from 'next/link';
import { BakedPlate } from '@/components/BakedPlate';
import { CraftView } from '@/components/CraftView';
import { Tabs } from '@/components/Tabs';
import { ChapterSnap } from '@/components/ChapterSnap';
import { HeroPlate } from '@/components/HeroPlate';
import { LaunchFilm } from '@/components/LaunchFilm';
import { Hop } from '@/components/Hop';
import { Ruler } from '@/components/Ruler';
import { FreshStrip, type FreshData } from '@/components/FreshStrip';
import { FullSkyLink } from '@/components/FullSkyLink';
import { NotedList } from '@/components/NotedList';
import { Seek } from '@/components/Seek';
import { SkyMap } from '@/components/SkyMap';
import { notedStars, viewerHref } from '@/data/stars';
import { pictures } from '@/data/media';
import { targets } from '@/data/targets';
import { getStories } from '@/lib/news';
import freshJson from '../../public/sky/fresh.json';

const fresh = freshJson as FreshData;

const rate = (t: (typeof targets)[number]) => {
  const pm = Math.hypot(t.pmRa, t.pmDec) / 1000;
  return t.expect === 'moves' ? `${pm.toFixed(1)}″ a year` : 'changes brightness';
};

// Refresh the page once a day so the headlines and the days-in-orbit count stay current.
export const revalidate = 86400;

const LAUNCH = Date.UTC(2025, 2, 12, 3, 10); // 11 March 2025, 8:10 p.m. Pacific time
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Whole days since launch, as of when the server last rendered this page (at most a day ago). */
function daysInOrbit(): number {
  return Math.floor((new Date().getTime() - LAUNCH) / 86400000);
}

export default async function Home() {
  const stories = await getStories(4);
  const daysUp = daysInOrbit();
  return (
    <>
      <LaunchFilm />
      <ChapterSnap select=".snap-top, .chapter" />
      {/* Where the page settles at the top: the very top, menu and all, not the hero under the menu. */}
      <div className="snap-top" aria-hidden="true" />
      <section className="skyhero" aria-labelledby="hero-h">
        <SkyMap fresh={fresh.fields.slice(0, 40)} />
        <div className="skyhero__over grid">
          <div className="skyhero__h">
            <h1 id="hero-h" className="display">Something up here moved.</h1>
          </div>
          <div className="skyhero__seek">
            <p className="skyhero__status mono">
              SPHEREx has been in orbit {daysUp} days.{fresh.newest ? ` Newest image: ${longDate(fresh.newest)}.` : ''}{' '}
              <Link href="/craft#live" className="inline-link">Where is it now?</Link>
            </p>
            <p className="skyhero__hint">Drag the sky. Pick a ringed star, or any spot, and SPHEREx shows you how it changed.</p>
            <Seek hint={false} />
          </div>
        </div>
      </section>

      {/* Chapter 2: how to read a blink. */}
      <section className="chapter wrap" aria-labelledby="read-h">
        <div className="grid game">
          <div className="game__plate">
            <HeroPlate />
          </div>
          <div className="game__copy">
            <h2 id="read-h" className="h-xl" data-split="lines">Pluto was found this way in 1930.</h2>
            <p className="lede" style={{ marginTop: '1.25rem', maxWidth: '40ch' }} data-reveal="fade">
              Clyde Tombaugh flicked between two glass plates until one dot jumped. The machine was called a blink comparator. This is one, pointed at a billion infrared sources nobody has finished looking through.
            </p>
            <Tabs label="What a blink can show" tabs={[
              { name: 'It moved', body: (
                <div className="read__row">
                  <p className="read__text">A source that sits somewhere else on the second plate is close to us: an asteroid, a comet, a nearby star or a brown dwarf. Subtract one plate from the other and it leaves a dark spot beside a light one.</p>
                  <figure className="read__pic">
                    <BakedPlate slug="epsilon-indi-b" view="diff" size={40} alt="Difference of two SPHEREx passes on the brown dwarf pair Epsilon Indi B: a dark spot next to a light spot, the mark of motion." />
                    <figcaption>Epsilon Indi B, 1.1 to 1.6 µm</figcaption>
                  </figure>
                </div>
              ) },
              { name: 'It changed', body: (
                <div className="read__row">
                  <p className="read__text">Same place, different brightness. That is a variable star, a supernova or a flaring galaxy. The subtraction shows one spot of a single shade with no partner.</p>
                  <figure className="read__pic">
                    <BakedPlate slug="rw-aurigae" view="diff" size={40} alt="Difference of two SPHEREx passes on the variable star RW Aurigae: a single spot of one shade, the mark of a brightness change." />
                    <figcaption>RW Aurigae, 1.6 to 2.4 µm</figcaption>
                  </figure>
                </div>
              ) },
              { name: 'It is not real', body: (
                <div className="read__row">
                  <p className="read__text">Bright stars overflow the detector and leave grey holes, rings and spikes. Cosmic rays mark one exposure and never return. If it shows up once, or sits exactly on a bright star, leave it.</p>
                  <figure className="read__pic">
                    <BakedPlate slug="r-draconis" colour size={48} alt="Colour SPHEREx image of the bright star R Draconis with a grey, overflowed centre and a wide halo, blinking between two passes." />
                    <figcaption>R Draconis, saturated core</figcaption>
                  </figure>
                </div>
              ) },
            ]} />
          </div>
        </div>
      </section>

      {/* Chapter 3: where to start. */}
      <section className="chapter wrap" aria-labelledby="targets-h">
        <h2 id="targets-h" className="h-xl chapter__h" data-split="lines">Five places to start</h2>
        <Tabs label="Places to start" tabs={[
          { name: 'Test targets', body: (
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
          ) },
          { name: 'Stars with notes', body: (
            <>
              <p className="muted tabs__intro">Every ringed star on the map, as a list. Each opens the viewer at that star.</p>
              <NotedList stars={notedStars.filter((x) => !x.target).map((x) => ({
                id: x.id, name: x.name, sub: `${x.kind}${x.distance ? `, ${x.distance}` : ''}`, href: viewerHref({ ...x, name: x.name }),
              }))} />
            </>
          ) },
          { name: 'Newly photographed', body: <FreshStrip data={fresh} /> },
        ]} />
      </section>

      {/* Chapter 4: the observatory. */}
      <section className="chapter wrap grid craftchap" aria-labelledby="craft-h">
        <div className="craftchap__copy">
          <h2 id="craft-h" className="h-xl" data-split="lines">A telescope in a cone</h2>
          <p className="lede" style={{ marginTop: '1.25rem' }} data-reveal="fade">SPHEREx is 2.6 metres tall and weighs about as much as a grand piano. Most of what you see is shade.</p>
          <p style={{ marginTop: '2rem' }}><Link href="/craft" className="btn">See how it is built</Link></p>
        </div>
        <div className="craftchap__model"><CraftView /></div>
      </section>

      {/* Chapter 5: from NASA. */}
      <section className="chapter wrap" aria-labelledby="seen-h">
        <h2 id="seen-h" className="h-xl chapter__h" data-split="lines">What SPHEREx has already seen</h2>
        <Tabs label="From NASA" tabs={[
          { name: 'Pictures', body: (
            <>
              <p className="muted tabs__intro">Four pictures from NASA. The viewer on this site reads the same kind of images, one small square at a time.</p>
              <div className="seen">
                {pictures.map((pic) => (
                  <figure key={pic.id} className="seen__item">
                    <a href={`https://images.nasa.gov/details/${pic.id}`} target="_blank" rel="noopener noreferrer" aria-label={`${pic.title}. Open at NASA in a new tab.`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/nasa/${pic.id}.jpg`} alt={pic.alt} width={pic.w} height={pic.h} loading="lazy" decoding="async" />
                    </a>
                    <figcaption>
                      <b>{pic.title}</b>
                      <span>{pic.caption}</span>
                      <i>NASA/JPL-Caltech, {pic.id}</i>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) },
          ...(stories.length > 0 ? [{ name: 'Latest news', body: (
            <>
              <p className="muted tabs__intro">The newest SPHEREx stories on nasa.gov, checked daily. They open in a new tab.</p>
              <ul className="news__list">
                {stories.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} target="_blank" rel="noopener noreferrer">
                      <span className="mono">{longDate(n.date)}</span>
                      <b>{n.title}</b>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) }] : []),
          { name: '102 colours', body: (
            <div className="grid bands">
              <div className="bands__copy">
                <h3 className="h-l">102 colours, none of them visible</h3>
                <p style={{ marginTop: '1rem', maxWidth: '46ch' }}>
                  SPHEREx has no filter wheel. Each of its six detectors sits behind a filter that changes colour along its length, so where a star lands decides which wavelength gets recorded. The viewer stacks every exposure from one detector and one pass into a clean plate, and can turn the whole set into a spectrum while you wait.
                </p>
                <p style={{ marginTop: '1.5rem' }}>
                  <FullSkyLink>Blink your own patch of sky</FullSkyLink>
                </p>
              </div>
              <div className="bands__ruler">
                <Ruler />
              </div>
            </div>
          ) },
        ]} />
      </section>
    </>
  );
}
