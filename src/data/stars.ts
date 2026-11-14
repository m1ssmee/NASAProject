// Stars that carry a note on the sky map. Positions are J2000 degrees; on the map each is
// snapped to its catalogue star so the marker sits exactly on the dot.
// Distances and facts are drafted from standard references and are flagged for owner review.
import { targetNow, targets } from './targets';

export interface NotedStar {
  id: string;
  name: string;
  ra: number;
  dec: number;
  kind: string;
  distance: string;
  note: string;
  /** Challenge target: links to its page as well. */
  target?: string;
  /** Detector that suits it in the viewer. */
  det?: number;
  /** Seconds per pulse on the map, for variables. Scaled from the real period, not equal to it. */
  pulse?: number;
}

const S = (id: string, name: string, ra: number, dec: number, kind: string, distance: string, note: string, pulse?: number): NotedStar =>
  ({ id, name, ra, dec, kind, distance, note, pulse });

const famous: NotedStar[] = [
  S('sirius', 'Sirius', 101.287, -16.716, 'White star with a white dwarf companion', '8.6 light years', 'The brightest star in the night sky, and one of the nearest.'),
  S('canopus', 'Canopus', 95.988, -52.696, 'Yellow-white supergiant', 'about 310 light years', 'Second brightest star. Spacecraft use it as a reference point for steering.'),
  S('alpha-centauri', 'Alpha Centauri', 219.902, -60.834, 'Triple star system', '4.4 light years', 'The nearest star system. It crosses 3.7 arcseconds of sky a year.'),
  S('arcturus', 'Arcturus', 213.915, 19.182, 'Red giant', '37 light years', 'Moves 2.3 arcseconds a year, fast for a star you can see without a telescope.'),
  S('vega', 'Vega', 279.235, 38.784, 'White main-sequence star', '25 light years', 'In 1983 an infrared satellite found a disc of dust around it, the first seen around another star.'),
  S('capella', 'Capella', 79.172, 45.998, 'Four stars in two pairs', '43 light years', 'Looks like one yellow star. It is two giants orbiting each other, with two red dwarfs far out.'),
  S('rigel', 'Rigel', 78.634, -8.202, 'Blue supergiant', 'about 860 light years', 'The bright foot of Orion, tens of thousands of times more luminous than the Sun.'),
  S('procyon', 'Procyon', 114.825, 5.225, 'Yellow-white star with a white dwarf', '11.5 light years', 'A close neighbour whose faint companion was predicted from its wobble before anyone saw it.'),
  S('betelgeuse', 'Betelgeuse', 88.793, 7.407, 'Red supergiant', 'about 550 light years', 'Faded sharply in late 2019 when it threw off a cloud of dust. In infrared it outshines almost everything.', 9),
  S('achernar', 'Achernar', 24.429, -57.237, 'Hot blue star', 'about 140 light years', 'Spins so fast that it is visibly flattened, wider at its equator than pole to pole.'),
  S('altair', 'Altair', 297.696, 8.868, 'White main-sequence star', '16.7 light years', 'Turns once in about nine hours. The Sun takes almost a month.'),
  S('aldebaran', 'Aldebaran', 68.98, 16.509, 'Red giant', '65 light years', 'The eye of Taurus. It sits in front of the Hyades cluster but is not part of it.'),
  S('antares', 'Antares', 247.352, -26.432, 'Red supergiant', 'about 550 light years', 'So large that, in place of the Sun, it would reach past the orbit of Mars.'),
  S('spica', 'Spica', 201.298, -11.161, 'Close pair of blue stars', 'about 250 light years', 'Two stars so close that they pull each other into egg shapes, circling every four days.'),
  S('pollux', 'Pollux', 116.329, 28.026, 'Orange giant', '34 light years', 'The nearest giant star to the Sun, with a planet more massive than Jupiter.'),
  S('fomalhaut', 'Fomalhaut', 344.413, -29.622, 'White main-sequence star', '25 light years', 'Ringed by a sharp belt of debris that shows clearly in infrared images.'),
  S('deneb', 'Deneb', 310.358, 45.28, 'White supergiant', 'roughly 2,600 light years', 'Among the most distant stars visible to the eye, and still one of the brightest.'),
  S('regulus', 'Regulus', 152.093, 11.967, 'Blue-white star', '79 light years', 'Lies almost exactly on the path the Sun, Moon and planets follow across the sky.'),
  S('polaris', 'Polaris', 37.954, 89.264, 'Yellow supergiant, Cepheid variable', 'about 430 light years', 'The North Star. It pulses slightly every four days.', 5),
  S('mira', 'Mira', 34.837, -2.978, 'Pulsating red giant', 'about 300 light years', 'The star that gave Mira variables their name. It swells and fades over 332 days, like R Draconis.', 7),
  S('algol', 'Algol', 47.042, 40.956, 'Eclipsing binary', 'about 90 light years', 'Dims for a few hours every 2.87 days as one star passes in front of the other.', 4),
  S('delta-cephei', 'Delta Cephei', 337.293, 58.415, 'Cepheid variable', 'about 890 light years', 'Brightens and fades every 5.4 days. Stars like it are used to measure distances to other galaxies.', 5),
  S('eta-carinae', 'Eta Carinae', 161.265, -59.684, 'Massive unstable star system', 'about 7,500 light years', 'Erupted in the 1840s and briefly became the second brightest star in the sky.'),
  S('epsilon-eridani', 'Epsilon Eridani', 53.233, -9.458, 'Young orange dwarf', '10.5 light years', 'A young, nearby star with a dusty disc and at least one planet.'),
  S('tau-ceti', 'Tau Ceti', 26.017, -15.938, 'Sun-like star', '11.9 light years', 'The nearest single star that resembles the Sun.'),
  S('61-cygni', '61 Cygni', 316.725, 38.749, 'Pair of orange dwarfs', '11.4 light years', 'In 1838 it became the first star with a measured distance. It moves 5.2 arcseconds a year.'),
  S('groombridge-1830', 'Groombridge 1830', 178.245, 37.719, 'Old yellow dwarf', '30 light years', 'Crosses 7 arcseconds of sky a year. Only two stars are known to move faster.'),
  S('epsilon-indi-a', 'Epsilon Indi A', 330.84, -56.786, 'Orange dwarf', '11.9 light years', 'Host star of the two brown dwarfs on the target list. They share its motion across the sky.'),
  S('albireo', 'Albireo', 292.68, 27.96, 'Double star', 'about 430 light years', 'A gold star beside a blue one, a favourite sight in small telescopes.'),
  S('mizar', 'Mizar', 200.981, 54.925, 'Multiple star', '83 light years', 'The first double star found with a telescope, in the handle of the Big Dipper.'),
  S('castor', 'Castor', 113.65, 31.888, 'Six stars in three pairs', '51 light years', 'Looks single to the eye and is a system of six stars.'),
  S('alcyone', 'Alcyone', 56.871, 24.105, 'Blue giant in a cluster', 'about 440 light years', 'The brightest member of the Pleiades, a young cluster wrapped in dust that glows in infrared.'),
  S('mu-cephei', 'Mu Cephei', 325.877, 58.78, 'Red supergiant', 'several thousand light years', 'Called the Garnet Star for its colour. One of the largest stars known.', 11),
  S('r-doradus', 'R Doradus', 69.19, -62.077, 'Pulsating red giant', 'about 180 light years', 'Faint to the eye and brilliant in infrared. Its disc looks larger from Earth than any star but the Sun.', 8),
];

const challenge: NotedStar[] = targets.map((t) => {
  const p = targetNow(t);
  return {
    id: t.slug, name: t.name, ra: p.ra, dec: p.dec, kind: t.kind, distance: '', note: t.summary,
    target: t.slug, det: t.det, pulse: t.expect === 'varies' ? 6 : undefined,
  };
});

export const notedStars: NotedStar[] = [...challenge, ...famous];

export const viewerHref = (s: { ra: number; dec: number; name?: string; det?: number }) =>
  `/view?ra=${s.ra.toFixed(5)}&dec=${s.dec.toFixed(5)}${s.det ? `&det=${s.det}` : ''}${s.name ? `&name=${encodeURIComponent(s.name)}` : ''}`;
