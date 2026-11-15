// How the launch film talks to the sky map underneath it. The map registers itself here once
// its stars are ready; until then the defaults do the safe thing.
export const bridge = {
  /** True while the film owns the opening: the map holds still and stays full-window. */
  active: false,
  /** 0 shows no stars, 1 all of them, brightest first. */
  setStars: (fill: number) => { void fill; },
  /** Hand the page back: the site fades in around the stars. */
  finish: () => { document.documentElement.classList.remove('intro-pending', 'intro-veil'); },
};
