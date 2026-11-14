// The five test targets named by the challenge.
// Positions are ICRS at epoch 2000.0 with proper motions from SIMBAD (queried 2026-11-14);
// the viewer moves them to the date of the SPHEREx data before asking for images.
import { propagate } from '../lib/astro';

export interface Target {
  slug: string;
  name: string;
  kind: string;
  /** ICRS degrees at epoch 2000.0 */
  ra: number;
  dec: number;
  /** mas/yr (pmRa includes cos dec) */
  pmRa: number;
  pmDec: number;
  parallax: number; // mas
  /** Detector that shows the object best. */
  det: number;
  fov: number; // arcsec
  expect: 'moves' | 'varies';
  summary: string;
  look: string;
  facts: { label: string; value: string }[];
  body: string[];
}

/** Epoch that current SPHEREx data is centred on; presets are moved here. */
export const VIEW_EPOCH = 2026.0;

export const targets: Target[] = [
  {
    slug: 'barnards-star',
    name: 'Barnard’s Star',
    kind: 'Red dwarf, 6 light years away',
    ra: 269.45208, dec: 4.69336, pmRa: -801.6, pmDec: 10362.4, parallax: 546.98,
    det: 2, fov: 300, expect: 'moves',
    summary: 'The fastest star in the sky. It crosses a SPHEREx pixel roughly every seven months.',
    look: 'One bright source steps north between passes while every other star holds still.',
    facts: [
      { label: 'Proper motion', value: '10.39″ per year, almost due north' },
      { label: 'Parallax', value: '546.98 mas' },
      { label: 'Brightness', value: 'J 5.2, K 4.5' },
      { label: 'Shift per survey pass', value: 'about 0.85 SPHEREx pixels' },
    ],
    body: [
      'E. E. Barnard measured this star’s motion in 1916 by comparing photographic plates taken years apart. Nothing outside the Solar System moves faster across the sky, which makes it the cleanest test of a blink tool: if this star does not jump, the alignment is wrong.',
      'Catalogues list it where it stood in the year 2000. By the time SPHEREx began observing it had travelled more than four arcminutes north of that position, so this page moves the catalogue position forward before requesting images.',
      'It is bright enough to overwhelm the detector core in some bands. A dark ring or a blank centre is saturation, not a discovery.',
    ],
  },
  {
    slug: 'wise-0855',
    name: 'WISE 0855−0714',
    kind: 'Brown dwarf, 7.4 light years away',
    ra: 133.81891, dec: -7.24705, pmRa: -8123.7, pmDec: 673.2, parallax: 439.0,
    det: 6, fov: 300, expect: 'moves',
    summary: 'The coldest brown dwarf known, colder than a winter night in Siberia, and invisible below 4 microns.',
    look: 'Nothing at short wavelengths. In detectors 5 and 6 a faint point drifts west.',
    facts: [
      { label: 'Proper motion', value: '8.15″ per year, westward' },
      { label: 'Parallax', value: '439 mas' },
      { label: 'Brightness', value: 'J 25.0, W2 13.7' },
      { label: 'Shift per survey pass', value: 'about 0.65 SPHEREx pixels' },
    ],
    body: [
      'Kevin Luhman found this object in 2014 by noticing that a faint WISE source had moved between images taken six months apart. At about 250 kelvin it gives off almost no light short of 4 microns, so it only exists in the two longest SPHEREx detectors.',
      'The challenge lists its coordinates as 08h 55m 10.83s, −7° 14′ 42.5″. That is where it was in 2010. It is now about two arcminutes west of there, which is why the default field of view is wide.',
      'It sits near the noise in a single exposure. Use the pass co-add, then the difference view.',
    ],
  },
  {
    slug: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    kind: 'Two brown dwarfs orbiting a star, 12 light years away',
    ra: 331.04415, dec: -56.78284, pmRa: 3982.0, pmDec: -2466.8, parallax: 270.66,
    det: 2, fov: 300, expect: 'moves',
    summary: 'A pair of brown dwarfs too close together for SPHEREx to split, moving southeast as one point.',
    look: 'A modest source that shifts by about one pixel. The difference view shows a dark and light pair.',
    facts: [
      { label: 'Proper motion', value: '4.68″ per year, southeast' },
      { label: 'Parallax', value: '270.66 mas' },
      { label: 'Brightness', value: 'J 11.9, K 11.2 (pair combined)' },
      { label: 'Shift per survey pass', value: 'about 0.4 SPHEREx pixels' },
    ],
    body: [
      'Epsilon Indi Ba and Bb are a T1 and a T6 dwarf less than an arcsecond apart. They share the motion of the bright star Epsilon Indi A, seven arcminutes away, which is how they were recognised as its companions in 2003.',
      'This is the subtle case. The shift between two neighbouring passes is under half a pixel, so blink the first pass against the last, or subtract them.',
      'Their spectra carry deep methane and water absorption. The spectrum panel shows the flux dropping out in those bands.',
    ],
  },
  {
    slug: 'rw-aurigae',
    name: 'RW Aurigae',
    kind: 'Young variable star, 500 light years away',
    ra: 76.95653, dec: 30.40144, pmRa: 7.2, pmDec: -20.3, parallax: 6.41,
    det: 3, fov: 300, expect: 'varies',
    summary: 'A young star that dims without warning when dust from its own disc crosses in front of it.',
    look: 'It stays put. Its brightness changes from pass to pass while its neighbours stay constant.',
    facts: [
      { label: 'Proper motion', value: '0.02″ per year (no visible shift)' },
      { label: 'Variability', value: 'V 9.2 to 13.6, irregular' },
      { label: 'Brightness', value: 'J 8.4, K 7.0' },
      { label: 'Type', value: 'Classical T Tauri binary' },
    ],
    body: [
      'RW Aurigae is here to show what a blink looks like when something changes but does not move. Since 2010 it has gone through deep dimming events that last months.',
      'In the difference view a mover leaves a dark spot beside a light one. A variable leaves a single spot of one sign. Learning that difference is most of the skill.',
    ],
  },
  {
    slug: 'r-draconis',
    name: 'R Draconis',
    kind: 'Pulsating red giant',
    ra: 248.16761, dec: 66.75498, pmRa: -20.6, pmDec: 6.1, parallax: 1.25,
    det: 1, fov: 300, expect: 'varies',
    summary: 'A Mira variable that swells and fades over 246 days, far faster than SPHEREx returns to it.',
    look: 'A very bright, saturated star that changes size and depth between passes.',
    facts: [
      { label: 'Proper motion', value: '0.02″ per year (no visible shift)' },
      { label: 'Period', value: '245.6 days' },
      { label: 'Variability', value: 'V 6.7 to 13.2' },
      { label: 'Brightness', value: 'J 3.7, K 2.2' },
    ],
    body: [
      'R Draconis pulses with a period of about 246 days. SPHEREx comes back roughly every six months, so each pass catches it at a different point in its cycle.',
      'It is far brighter than the detector can record in one exposure. Expect a clipped core, spikes and a halo. Those artifacts are worth learning too: they repeat at the same place in every pass, which a real mover never does.',
    ],
  },
];

export const targetBySlug = (slug: string) => targets.find((t) => t.slug === slug);

/** Position at the epoch of the SPHEREx data. */
export function targetNow(t: Target, year = VIEW_EPOCH): { ra: number; dec: number } {
  const [ra, dec] = propagate(t.ra, t.dec, t.pmRa, t.pmDec, 2000, year);
  return { ra, dec };
}
