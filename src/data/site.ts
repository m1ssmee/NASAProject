// Site-wide content. Items marked placeholder are assumptions for the team to replace.
export const site = {
  name: 'Second Plate', // placeholder: working title
  role: 'SPHEREx blink comparator',
  // placeholder: set NEXT_PUBLIC_SITE_URL to the production URL at build time
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://second-plate.example',
  description:
    'Enter a sky position and blink real SPHEREx infrared images of it across time. Whatever jumps between plates is moving. A NASA Space Apps 2026 project.',
  team: { name: 'Team name', placeholder: true },
  challengeUrl: 'https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/',
  acknowledgement:
    'This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.',
  nav: [
    { href: '/view', label: 'Viewer' },
    { href: '/targets', label: 'Targets' },
    { href: '/method', label: 'Method' },
  ],
};
