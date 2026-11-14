// Official SPHEREx videos and pages. Every video id was checked against YouTube on 2026-11-14
// (it exists, allows embedding, and is published by the channel named here).

export interface Video { id: string; title: string; by: string; about: string }

export const videos: Video[] = [
  { id: 'TXd53DB2euE', title: 'SPHEREx and PUNCH launch from Vandenberg (highlights)', by: 'NASA Jet Propulsion Laboratory', about: 'Liftoff on a Falcon 9, 11 March 2025.' },
  { id: '2LvSd5HLblo', title: 'How NASA’s SPHEREx mission will map the cosmos', by: 'NASA Jet Propulsion Laboratory', about: 'The hardware: shields, cooling and detectors.' },
  { id: 'V-UhPS1Jwl4', title: 'How NASA will observe the universe with SPHEREx', by: 'NASA Science', about: 'What the survey is for.' },
  { id: 'Jqw6QeUIDoU', title: 'Exploring cosmic origins with NASA’s SPHEREx', by: 'NASA Jet Propulsion Laboratory', about: 'The three science questions.' },
  { id: 'ErwsETCAmSw', title: 'The universe that SPHEREx will see', by: 'Caltech', about: 'From the team that leads the mission.' },
  { id: '6o0q86RKL14', title: 'See the spacecraft: SPHEREx nears launch', by: 'NASA Jet Propulsion Laboratory', about: 'A live question and answer session beside the real observatory.' },
  { id: 'bMXeFDnHVu8', title: 'SPHEREx and PUNCH science overview news conference', by: 'NASA Jet Propulsion Laboratory', about: 'The full pre-launch briefing.' },
];

export interface Resource { href: string; name: string; from: string; what: string }

export const resources: { group: string; items: Resource[] }[] = [
  {
    group: 'The mission',
    items: [
      { href: 'https://science.nasa.gov/mission/spherex/', name: 'SPHEREx mission page', from: 'NASA Science', what: 'News, science goals and status.' },
      { href: 'https://www.jpl.nasa.gov/missions/spherex/', name: 'SPHEREx at JPL', from: 'NASA JPL', what: 'The lab that manages the mission.' },
      { href: 'https://spherex.caltech.edu/', name: 'SPHEREx project site', from: 'Caltech', what: 'The science team’s own pages, with instrument detail.' },
      { href: 'https://www.jpl.nasa.gov/press-kits/spherex/', name: 'Launch press kit', from: 'NASA JPL', what: 'Facts, figures and pictures in one place.' },
    ],
  },
  {
    group: 'The data',
    items: [
      { href: 'https://irsa.ipac.caltech.edu/Missions/spherex.html', name: 'SPHEREx archive', from: 'NASA/IPAC IRSA', what: 'Where every image on this site comes from.' },
      { href: 'https://irsa.ipac.caltech.edu/applications/spherex', name: 'SPHEREx Data Explorer', from: 'NASA/IPAC IRSA', what: 'The archive’s own search and cutout tools.' },
      { href: 'https://caltech-ipac.github.io/irsa-tutorials/spherex/', name: 'Tutorial notebooks', from: 'Caltech/IPAC', what: 'Worked Python examples for reading the images.' },
      { href: 'https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf', name: 'Explanatory supplement', from: 'NASA/IPAC IRSA', what: 'The full technical description of the data (PDF).' },
    ],
  },
  {
    group: 'Pictures and the challenge',
    items: [
      { href: 'https://images.nasa.gov/search?q=SPHEREx', name: 'SPHEREx in the NASA image library', from: 'NASA', what: 'Assembly, testing and launch photographs.' },
      { href: 'https://eyes.nasa.gov/apps/solar-system/#/sc_spherex', name: 'Eyes on the Solar System', from: 'NASA JPL', what: 'The live 3D view shown above, full size.' },
      { href: 'https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/', name: 'Planet X and SPHEREx', from: 'NASA Space Apps 2026', what: 'The challenge this site answers.' },
      { href: 'http://byw.tools/wiseview', name: 'WiseView', from: 'Backyard Worlds', what: 'The blink tool for the WISE mission that this one follows.' },
    ],
  },
];
