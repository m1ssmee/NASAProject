import type { Metadata } from 'next';
import { BakedPlate } from '@/components/BakedPlate';
import { Ruler } from '@/components/Ruler';
import { COLLECTIONS } from '@/config/releases';
import { site } from '@/data/site';

export const metadata: Metadata = {
  title: 'Method',
  description: 'How Blinkscope turns SPHEREx exposures into aligned plates: archive search, partial file reads, reprojection, stacking by survey pass, and the limits.',
};

export default function Method() {
  return (
    <>
      <header className="page-head wrap grid">
        <h1 className="display" data-split="lines" data-intro>How a plate is made</h1>
        <p className="lede">Every picture in the viewer is built in your browser from the original SPHEREx exposures. Nothing is stored on our side, so new data shows up the week it is released.</p>
      </header>
      <div className="method wrap grid">
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <h2 className="h-l">From coordinates to a blink</h2>
            <figure className="method__aside"><BakedPlate slug="wise-0855" from={1} size={44} alt="Two stacked SPHEREx plates of the brown dwarf WISE 0855 at 4.4 to 5 microns, alternating; the central point shifts west." /><figcaption>The result: WISE 0855, two passes, 21 exposures each</figcaption></figure>
          </div>
          <div className="method__v">
            <ol className="steps">
              <li><p><strong>Find the exposures.</strong> The position goes to the image search service at the NASA/IPAC Infrared Science Archive, which lists every SPHEREx image that covers it. A typical spot has 250 to 400 so far; the ecliptic poles have thousands.</p></li>
              <li><p><strong>Read only the pixels needed.</strong> Each exposure is a 65 MB file in a public archive bucket. The browser asks for the header and then for the few rows around your position, about 300 kB instead of the whole file.</p></li>
              <li><p><strong>Line everything up.</strong> Each exposure is taken at a different angle. Using the pointing solution in its header, every one is resampled onto the same grid, north up and east left, at half a detector pixel (3.075 arcseconds).</p></li>
              <li><p><strong>Remove the glow.</strong> The median of each cutout is subtracted. That takes out zodiacal light, which changes from visit to visit and would otherwise make the blink flash.</p></li>
              <li><p><strong>Stack by pass.</strong> SPHEREx returns to a position roughly every six months and takes a few dozen exposures over some weeks. Exposures from one detector and one pass are combined with a median into one plate. Blink the plates.</p></li>
            </ol>
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <h2 className="h-l">Why not blink single exposures</h2>
            <div className="method__aside method__aside--wide"><Ruler /></div>
          </div>
          <div className="method__v prose">
            <p>A SPHEREx detector sits behind a filter whose colour changes from one edge to the other. The same star lands on a different part of that filter in each exposure, so each exposure records it at a different wavelength. Blink them raw and a brown dwarf flickers with its own spectrum, which hides the motion you are looking for.</p>
            <p>Stacking a whole pass averages across the detector&rsquo;s wavelength range. The viewer also offers burst mode, which groups exposures taken minutes apart, for asteroids and comets that move too fast for a pass stack, and single mode for inspecting one exposure.</p>
            <p>Colour plates combine three detectors: 1.1 to 1.6 microns as blue, 2.4 to 3.8 as green and 4.4 to 5.0 as red. These are not colours an eye could see. They show which objects are brighter at long wavelengths, which is where cold things such as brown dwarfs give themselves away.</p>
            <p>The spectrum panel uses the same property the other way round: it measures the source in every exposure and plots brightness against the wavelength each one happened to sample.</p>
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <div className="method__k">
            <h2 className="h-l">Limits worth knowing</h2>
            <figure className="method__aside"><BakedPlate slug="r-draconis" size={56} alt="SPHEREx plate of the bright star R Draconis with a blank overflowed core, alternating between two passes." /><figcaption>No data at the core of R Draconis</figcaption></figure>
          </div>
          <div className="method__v prose">
            <p>A SPHEREx pixel is 6.15 arcseconds across. With about eighteen months of data, only objects moving faster than roughly three arcseconds a year shift far enough to see. Barnard&rsquo;s Star moves about two and a half pixels; Epsilon Indi B about one.</p>
            <p>Catalogues give positions for the year 2000. Names typed into the search box are moved forward by their proper motion before images are requested. Coordinates you type are used exactly as given.</p>
            <p>Grey patches mean no data: an overflowed star core or a masked pixel. The median stack removes most cosmic rays but also removes anything that moves within a pass, which is what burst mode is for. Photometry is a simple aperture measurement on resampled pixels and is meant for spotting spectral shapes, not for publication.</p>
            <p>The archive&rsquo;s contamination flags are stored in a compressed layout that cannot be read a few rows at a time. The viewer links each exposure to the archive, where the flags can be inspected in full.</p>
          </div>
        </div>
        <hr className="rule" />
        <div className="method__row">
          <h2 className="method__k h-l">Data and credit</h2>
          <div className="method__v prose">
            <p>Releases searched: <span className="mono">{COLLECTIONS.join(', ')}</span>. Adding a release is a one line change.</p>
            <p className="cite">{site.acknowledgement}</p>
            <p>SPHEREx spectral images: <a href="https://doi.org/10.26131/IRSA678" target="_blank" rel="noopener noreferrer">doi:10.26131/IRSA678</a> and <a href="https://doi.org/10.26131/IRSA662" target="_blank" rel="noopener noreferrer">doi:10.26131/IRSA662</a>, served by <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noopener noreferrer">IRSA</a>. Star positions and motions come from Gaia Data Release 3 through the VizieR service at CDS, and names are resolved by Sesame and SIMBAD.</p>
            <p>The sky map draws the 9,096 stars of the Yale Bright Star Catalogue (fifth edition, public domain) at their catalogued positions. The notes on individual stars were written for this site from standard references. The spacecraft in the opening sequence is a <a href="/craft">model built for this site</a> from NASA/JPL-Caltech photographs and illustrations of SPHEREx; NASA has not released a 3D model of it.</p>
            <p>The list of newly photographed fields is rebuilt once a day by checking 96 positions spread evenly over the sky, so it is a sample of where SPHEREx has been looking, not a complete record.</p>
            <p>The interface follows <a href="http://byw.tools/wiseview" target="_blank" rel="noopener noreferrer">WiseView</a>, built by the Backyard Worlds team for the WISE mission. For older optical images of the same fields, the Canadian Space Agency&rsquo;s NEOSSat archive is searchable by position at the <a href="https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/" target="_blank" rel="noopener noreferrer">Canadian Astronomy Data Centre</a>.</p>
          </div>
        </div>
      </div>
    </>
  );
}
