export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

// Shared easing vocabulary. Layout moves use these; concept moves (the blink) are hard cuts.
export const ease = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  blink: 'steps(1)',
} as const;
