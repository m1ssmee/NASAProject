# Second Plate: design record

## Brief
- **Subject:** a public web tool for the NASA Space Apps 2026 challenge "Planet X and SPHEREx".
  Enter a sky position, see SPHEREx images of it over time as a blink, spot what moves.
- **Audience:** citizen scientists and hackathon judges; then astronomers who want an embeddable blink.
- **Job:** a first-time visitor sees a real object move within ten seconds, then searches their own coordinates.
- **Assumptions (placeholders in `src/data/site.ts`):** site name "Second Plate", team name, production URL.

## Concept
| | A. Blink comparator (process) | B. The filter is the page (material) | C. Everything is a coordinate (formal) |
|---|---|---|---|
| Idea | Everything has a plate A and a plate B; the only change between them is what you are meant to see | Scrolling sweeps the page through 0.75 to 5.0 µm | Every page and label is addressed by RA/Dec |
| Anchor | Pluto was found in 1930 by blinking plates in the search for "Planet X", the challenge's own title | SPHEREx has no filter wheel; detector position sets wavelength | The tool's input is a coordinate pair |
| O / F / Fe / P | 4 / 5 / 4 / 1 | 4 / 4 / 4 / 2 | 3 / 4 / 5 / 3 |

Picked A: it is the tool's mechanism and the challenge's story. From B, the six-detector wavelength
ruler became the band control. From C, the URL scheme.

```
Idea:        Two pictures of the same sky, swapped back and forth; whatever jumps is a discovery.
Metaphor:    The blink comparator and its glass plates: dark stars on clear glass, marked in wax pencil.
Signature:   The home hero is a real SPHEREx field blinking between two passes; one star hops;
             the visitor marks it and gets a wax-pencil tick on both positions.
Emotion:     "Wait, that one moved."
Motion verb: Blink like a comparator: hold, snap, hold.
Screenshot:  A negative star field with red tick marks beside one star, the headline set large beside it.
```

## System
- **Palette (a glass negative):** glass `#E7E9E6` ground, emulsion `#101214` ink and curtain,
  graphite `#555B60` muted, rule ink at 16%, wax pencil `#D8321C` for marks (`#B8260F` when it is
  text, for AA contrast). Used only for the mover mark, the active plate and errors.
  The "Invert" switch exchanges ground and ink through `html[data-plate]`; every colour is a token,
  and the plates repaint from the same value.
- **Type:** Archivo (Google, variable width). Width 62 to 72 for display, 100 for text. Azeret Mono
  (Google) only for measured values: coordinates, dates, wavelengths, counts.
- **Grid:** 12 columns, fluid gutter. Plates are always square with a 1 px ink border and a caption
  strip along the bottom edge, like the writing on a plate margin. Radius 0 everywhere; circles only
  for reticles and the A/B lamp.
- **Section rhythm (home):** split hero (type left, plate right); ruled three-row lesson with
  pictures at the right edge; full-width index list; split copy and ruler; oversized wordmark footer.
- **Motion:** concept moves are hard cuts (`steps(1)`): the plate swap, the hop on primary links,
  the page transition (one blink of the curtain). Text reveals use `expo.out`.
  - Primary targets (nav, index rows, buttons): the label hops up and right once, like a mover
    between plates, and a wax tick appears. Buttons also invert.
  - Idle: the site blink clock (`src/motion/blink.ts`) swaps every 0.85 s. The header lamp and every
    baked plate read the same clock.
  - Safety: never faster than 3 swaps a second (default 1.2 on the site, 1.4 in the viewer; the
    viewer's slider stops at 0.34 s). A pause control sits under the hero plate.
  - Reduced motion: no auto-blink anywhere; the hero offers "Swap plate"; the viewer starts paused.
- **No loader, no WebGL.** This is a tool: the first frame is server-rendered text, and the plates
  are small canvases painted from floats. Theatre is scaled to the brief.
- **Genericness test:** a generic answer is a black space site with a glowing planet. Changed: the
  ground is light, the imagery is the instrument's own pixels shown as negatives, and the only
  colour is a pencil mark.

## Decisions made during the build
- Pixels are read by the browser straight from the public S3 bucket with Range requests. IRSA's
  cutout service returns 4 MB per cutout and often answers 503. Only image discovery (SIA2) and the
  catalogue lookups go through our API routes, because those services send no CORS headers.
- Reprojection runs on the main thread, not in a worker: a plate is at most 390 x 390 pixels.
- The plate is a 2D canvas, not WebGL, for the same reason.
- Sky background is the per-cutout median, not the archive's ZODI layer, which would cost a second
  request per exposure.
- Contamination flags are not shown per pixel: the FLAGS layer is tile-compressed and cannot be
  range-read. Each plate links to its exposure at IRSA instead. Stated on the method page.
- Wavelength lookup tables are identical for every exposure of a detector (checked first against
  last for all six), so they are bundled in `src/data/wave.json`.
- Deep fields (thousands of exposures) are thinned evenly in time to 120 per detector, and a pass
  is closed after 45 days so continuous coverage still yields several plates.
