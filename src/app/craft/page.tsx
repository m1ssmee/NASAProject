import type { Metadata } from 'next';
import Link from 'next/link';
import type { FreshData } from '@/components/FreshStrip';
import { Hop } from '@/components/Hop';
import { LiveOrbit } from '@/components/LiveOrbit';
import { ObservatoryStory } from '@/components/ObservatoryStory';
import { Ruler } from '@/components/Ruler';
import { VideoShelf } from '@/components/VideoShelf';
import { resources, videos } from '@/data/media';
import freshJson from '../../../public/sky/fresh.json';

export const metadata: Metadata = {
  title: 'The observatory',
  description: 'SPHEREx up close: a model you can turn, what each part does, official videos, NASA\u2019s live tracker, and where the mission stands today.',
};

const fresh = freshJson as FreshData;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const numbers = [
  { n: '102', l: 'infrared colours in every patch of sky' },
  { n: '6', l: 'detectors, each 2,040 pixels square' },
  { n: '3.2 m', l: 'across the outer shield' },
  { n: '600', l: 'exposures a day, roughly' },
  { n: '14½', l: 'orbits a day, pole to pole' },
  { n: '2', l: 'maps of the whole sky each year' },
];

export default function Craft() {
  const timeline = [
    { d: '11 March 2025', t: 'Launch', p: 'Lifted off from Vandenberg in California on a Falcon 9, sharing the rocket with NASA’s four PUNCH satellites.' },
    { d: '24 April 2025', t: 'Earliest public image', p: 'The oldest exposure in the archive this site reads from.' },
    { d: '1 May 2025', t: 'Survey begins', p: 'Regular observations start: about 600 exposures a day, stepping across the sky so every spot is seen in every colour.' },
    ...(fresh.newest ? [{ d: day(fresh.newest), t: 'Newest image so far', p: `The most recent exposure in the archive when this site last looked, on ${day(fresh.checked)}. Images are released within about two months of being taken.` }] : []),
  ];
  return (
    <>
      <ObservatoryStory />

      <section className="obsnum wrap" aria-label="SPHEREx in numbers">
        <dl>
          {numbers.map((x) => (
            <div key={x.l}><dt>{x.n}</dt><dd>{x.l}</dd></div>
          ))}
        </dl>
      </section>

      <section className="sec wrap" aria-labelledby="watch-h">
        <div className="grid"><div className="sec__head">
          <h2 id="watch-h" className="h-xl" data-split="lines">Watch it leave the ground</h2>
          <p className="muted" style={{ marginTop: '1rem', maxWidth: '52ch' }}>Seven films from NASA, JPL and Caltech, from the briefing before launch to the launch itself. They play here.</p>
        </div></div>
        <VideoShelf videos={videos} />
      </section>

      <section className="sec wrap grid shot" aria-labelledby="shot-h">
        <div className="shot__copy">
          <h2 id="shot-h" className="h-xl" data-split="lines">One exposure, twenty-two Moons wide</h2>
          <p style={{ marginTop: '1.5rem', maxWidth: '46ch' }} data-reveal="fade">
            Each exposure photographs a strip of sky 11.3 degrees long and 3.5 degrees tall, on three pairs of detectors at once. One detector of each pair sees shorter wavelengths, the other longer, through the same patch of sky.
          </p>
          <p style={{ marginTop: '1em', maxWidth: '46ch' }} data-reveal="fade">
            A filter over each detector changes colour from one edge to the other. The spacecraft nudges its aim between exposures so that, over a few weeks, every star has landed on every stripe. That is where the 102 colours come from, and why the viewer stacks a whole pass before it blinks.
          </p>
        </div>
        <figure className="shot__fig" data-reveal="clip">
          <svg viewBox="-2 -10 117 62" role="img" aria-label="Diagram: one SPHEREx exposure is three square fields side by side, each 3.5 degrees across, with the full Moon drawn to scale as a small dot.">
            {[0, 39, 78].map((x, i) => (
              <g key={x}>
                <rect x={x} y={0} width={35} height={35} className="shot__sq" />
                {Array.from({ length: 16 }, (_, k) => <line key={k} x1={x} x2={x + 35} y1={((k + 1) * 35) / 17} y2={((k + 1) * 35) / 17} className="shot__ch" />)}
                <text x={x + 17.5} y={42} textAnchor="middle" className="shot__lab">D{i + 1} + D{i + 4}</text>
              </g>
            ))}
            <circle cx={8} cy={-5} r={2.5} className="shot__moon" />
            <text x={13} y={-3.8} className="shot__lab">the full Moon, to scale</text>
            <line x1={0} x2={113} y1={48} y2={48} className="shot__dim" />
            <text x={56.5} y={51.6} textAnchor="middle" className="shot__lab shot__lab--bg">11.3 degrees</text>
          </svg>
          <figcaption>Each square is one detector pair. The 17 stripes are the colour channels of its filter.</figcaption>
          <div style={{ marginTop: '1.5rem' }}><Ruler /></div>
        </figure>
      </section>

      <section className="sec--tight wrap" aria-label="Live position" id="live" style={{ scrollMarginTop: '5rem' }}>
        <LiveOrbit />
      </section>

      <section className="sec--tight wrap" aria-labelledby="when-h">
        <div className="grid"><div className="sec__head"><h2 id="when-h" className="h-xl" data-split="lines">Where the mission stands</h2></div></div>
        <ol className="when">
          {timeline.map((x) => (
            <li key={x.t}>
              <span className="when__d mono">{x.d}</span>
              <span className="when__t h-m">{x.t}</span>
              <span className="when__p">{x.p}</span>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 'clamp(2rem, 5vh, 3.5rem)' }}>
          <Link href="/view" className="btn"><Hop tick={false}>See what it has photographed</Hop></Link>
        </p>
      </section>

      <section className="sec wrap" aria-labelledby="more-h">
        <div className="grid"><div className="sec__head">
          <h2 id="more-h" className="h-xl" data-split="lines">Everything else, one step away</h2>
          <p className="muted" style={{ marginTop: '1rem', maxWidth: '52ch' }}>The official pages behind this site. Each opens in a new tab, so this one stays where you left it.</p>
        </div></div>
        <div className="res">
          {resources.map((g) => (
            <div key={g.group}>
              <h3>{g.group}</h3>
              <ul>
                {g.items.map((r) => (
                  <li key={r.href}>
                    <a href={r.href} target="_blank" rel="noopener noreferrer">
                      <em>{r.from}</em>
                      <b>{r.name}</b>
                      <span>{r.what}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="wrap small muted" style={{ paddingBottom: 'clamp(3rem, 8vh, 6rem)', maxWidth: '80ch' }}>
        The model was built for this site from NASA/JPL-Caltech photographs and illustrations; NASA has not released a 3D model of SPHEREx. It is a likeness, not an engineering drawing. Figures are from NASA&rsquo;s mission pages.
      </p>
    </>
  );
}
