import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BakedPlate } from '@/components/BakedPlate';
import { ChapterSnap } from '@/components/ChapterSnap';
import { Ruler } from '@/components/Ruler';
import { COLLECTIONS } from '@/config/releases';
import { site } from '@/data/site';

export const metadata: Metadata = {
  title: 'Method',
  description: 'How Blinkscope turns SPHEREx exposures into aligned plates: archive search, partial file reads, reprojection, stacking by survey pass, and the limits.',
};

const out = (href: string, label: ReactNode) => <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>;

// Each step of the pipeline: a short name, then what happens.
const STEPS: [string, ReactNode][] = [
  ['Find the exposures', 'The position goes to the image search service at the NASA/IPAC Infrared Science Archive, which lists every SPHEREx image that covers it. A typical spot has 250 to 400 so far; the ecliptic poles have thousands.'],
  ['Read only the pixels needed', 'Each exposure is a 65 MB file in a public archive bucket. The browser asks for the header and then for the few rows around your position, about 300 kB instead of the whole file.'],
  ['Line everything up', 'Each exposure is taken at a different angle. Using the pointing solution in its header, every one is resampled onto the same grid, north up and east left, at half a detector pixel (3.075 arcseconds).'],
  ['Remove the glow', 'The median of each cutout is subtracted. That takes out zodiacal light, which changes from visit to visit and would otherwise make the blink flash.'],
  ['Stack by pass', 'SPHEREx returns to a position roughly every six months and takes a few dozen exposures over some weeks. Exposures from one detector and one pass are combined with a median into one plate. Blink the plates.'],
];

const MODES: [string, ReactNode][] = [
  ['Pass stacks', 'Stacking a whole pass averages across the detector’s wavelength range, so the flicker goes and only real change is left.'],
  ['Burst and single', 'Burst mode groups exposures taken minutes apart, for asteroids and comets that move too fast for a pass stack. Single mode shows one exposure at a time, for inspecting it.'],
  ['Colour plates', 'Three detectors combined: 1.1 to 1.6 microns as blue, 2.4 to 3.8 as green and 4.4 to 5.0 as red. These are not colours an eye could see. They show which objects are brighter at long wavelengths, which is where cold things such as brown dwarfs give themselves away.'],
  ['Spectrum', 'The same property the other way round: the source is measured in every exposure, and its brightness plotted against the wavelength each one happened to sample.'],
];

const LIMITS: [string, ReactNode][] = [
  ['How small a move shows', 'A SPHEREx pixel is 6.15 arcseconds across. With about eighteen months of data, only objects moving faster than roughly three arcseconds a year shift far enough to see. Barnard’s Star moves about two and a half pixels; Epsilon Indi B about one.'],
  ['Positions are brought up to date', 'Catalogues give positions for the year 2000. Names typed into the search box are moved forward by their proper motion before images are requested. Coordinates you type are used exactly as given.'],
  ['Grey means no data', 'An overflowed star core or a masked pixel.'],
  ['Stacks hide fast movers', 'The median stack removes most cosmic rays, but also anything that moves within a pass. That is what burst mode is for.'],
  ['Brightness is approximate', 'Photometry is a simple aperture measurement on resampled pixels. It is meant for spotting spectral shapes, not for publication. The brightness chart measures a small circle around the centre or your mark in every exposure; for stars that overflow the detector it measures the halo instead and says so.'],
  ['Contamination flags', 'Every SPHEREx image carries a set of flags for each pixel. The viewer reads them for any spot on the plate and tells you how many exposures marked it as overflowed, hit by a cosmic ray, sitting on a ghost, and so on. A flag named SOURCE only means the pixel is on a catalogued star.'],
  ['Deep stacks', 'Add all stacks every exposure into one deep plate. Shift and add first slides each exposure back along a motion you type in, so an object moving at that rate piles up into a point while the fixed stars smear.'],
];

const CREDITS: [string, ReactNode][] = [
  ['Releases searched', <><span className="tags">{COLLECTIONS.map((c) => <span key={c} className="mono">{c}</span>)}</span> Adding a release is a one line change.</>],
  ['SPHEREx images', <>{out('https://doi.org/10.26131/IRSA678', 'doi:10.26131/IRSA678')} and {out('https://doi.org/10.26131/IRSA662', 'doi:10.26131/IRSA662')}, served by {out('https://irsa.ipac.caltech.edu/Missions/spherex.html', 'IRSA')}.</>],
  ['Star positions', 'Positions and motions from Gaia Data Release 3, through the VizieR service at CDS. Names are resolved by Sesame and SIMBAD.'],
  ['Sky map', 'The 9,096 stars of the Yale Bright Star Catalogue (fifth edition, public domain), at their catalogued positions.'],
  ['Constellations', 'Figures, boundaries and star names from the d3-celestial project by Olaf Frohn (BSD 3-Clause licence), with every line end moved onto a star of that catalogue.'],
  ['Milky Way', 'The star-free layer of the Deep Star Maps 2020 from NASA’s Scientific Visualization Studio, built from Gaia data. Its colours, and the stars’ temperature colours, are strengthened so they can be seen, not invented.'],
  ['Star notes', 'Written for this site from standard references.'],
  ['Spacecraft model', <>The SPHEREx in the opening film and on the <a href="/craft">observatory page</a> is a model built for this site from NASA/JPL-Caltech photographs and illustrations. NASA has not released a 3D model of it.</>],
  ['SPHEREx’s position', <>In the full-screen map, worked out in your browser every second from the orbit elements published by {out('https://celestrak.org/', 'CelesTrak')} (catalogue number 63182), which are refreshed about daily. It is shown as seen from the centre of the Earth, and drawn far larger than life.</>],
  ['Newly photographed', 'Rebuilt once a day by checking 96 positions spread evenly over the sky, so it is a sample of where SPHEREx has been looking, not a complete record.'],
  ['Interface', <>Follows {out('http://byw.tools/wiseview', 'WiseView')}, built by the Backyard Worlds team for the WISE mission.</>],
  ['Older images', <>For older optical images of the same fields, the Canadian Space Agency’s NEOSSat archive is searchable by position at the {out('https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/', 'Canadian Astronomy Data Centre')}.</>],
];

const Points = ({ items, two = false }: { items: [string, ReactNode][]; two?: boolean }) => (
  <dl className={two ? 'points points--two' : 'points'}>
    {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
  </dl>
);

export default function Method() {
  return (
    <>
      <header className="page-head wrap grid">
        <h1 className="display" data-split="lines" data-intro>How a plate is made</h1>
        <p className="lede">Every picture in the viewer is built in your browser from the original SPHEREx exposures. Nothing is stored on our side, so new data shows up the week it is released.</p>
      </header>
      <ChapterSnap select=".method__v" align="center" />
      <div className="method wrap grid">
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <p className="method__n mono">01</p>
            <h2 className="h-l">From coordinates to a blink</h2>
            <figure className="method__aside"><BakedPlate slug="wise-0855" from={1} size={44} alt="Two stacked SPHEREx plates of the brown dwarf WISE 0855 at 4.4 to 5 microns, alternating; the central point shifts west." /><figcaption>The result: WISE 0855, two passes, 21 exposures each</figcaption></figure>
          </div>
          <div className="method__v">
            <ol className="steps">
              {STEPS.map(([t, p]) => <li key={t}><h3 className="steps__t">{t}</h3><p>{p}</p></li>)}
            </ol>
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <p className="method__n mono">02</p>
            <h2 className="h-l">Why not blink single exposures</h2>
            <div className="method__aside method__aside--wide"><Ruler /></div>
          </div>
          <div className="method__v">
            <p className="method__lead">A SPHEREx detector sits behind a filter whose colour changes from one edge to the other. The same star lands on a different part of it in each exposure, so each exposure records it at a different wavelength. Blink them raw and a brown dwarf flickers with its own spectrum, which hides the motion you are looking for.</p>
            <Points items={MODES} two />
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <p className="method__n mono">03</p>
            <h2 className="h-l">Limits worth knowing</h2>
            <figure className="method__aside"><BakedPlate slug="r-draconis" size={56} alt="SPHEREx plate of the bright star R Draconis with a blank overflowed core, alternating between two passes." /><figcaption>No data at the core of R Draconis</figcaption></figure>
          </div>
          <div className="method__v">
            <Points items={LIMITS} two />
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <p className="method__n mono">04</p>
            <h2 className="h-l">Data and credit</h2>
          </div>
          <div className="method__v">
            <dl className="credits">
              {CREDITS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <figure className="cite">
              <figcaption className="mono">Acknowledgement</figcaption>
              <blockquote>{site.acknowledgement}</blockquote>
            </figure>
          </div>
        </div>
      </div>
    </>
  );
}
