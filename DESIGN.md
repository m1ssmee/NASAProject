# Blinkscope: design record

## Brief
- **Subject:** a public web tool for the NASA Space Apps 2026 challenge "Planet X and SPHEREx".
  Enter a sky position, see SPHEREx images of it over time as a blink, spot what moves.
- **Audience:** citizen scientists and hackathon judges; then astronomers who want an embeddable blink.
- **Job:** a first-time visitor sees a real object move within ten seconds, then searches their own coordinates.
- **Assumptions (placeholders in `src/data/site.ts`):** team name. The site was first called "Second Plate"; it was renamed Blinkscope at the owner's request before deployment.

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

## Revision 2: the finder (sky map, spacecraft intro, new-data layer)

Requested by the owner after the first release. The blink comparator stays the idea; the home
page gains the observatory's other instrument, the finder: look at the whole sky, pick a spot,
and a plate is developed from it.

- **Theme split.** The site is now night sky (`--c-bg` emulsion, `--c-fg` glass). Plates keep
  the glass-negative palette through `.plate` scoped tokens, so they read as light squares
  developed from the dark. The header "Invert" switch changes plate tone only.
- **Sky map** (`src/components/SkyMap.tsx`, `src/sky/*`). 9,096 Bright Star Catalogue stars as
  one Three.js point cloud, projected stereographically in the vertex shader; the same maths in
  `src/sky/project.ts` drives picking and DOM markers, and is unit tested. Drag turns the sky,
  ctrl-wheel or pinch zooms (a plain wheel scrolls the page), buttons and arrow keys do both.
- **Stars with notes.** 34 hand-written entries plus the five targets (`src/data/stars.ts`).
  Only these shine: variables pulse steadily at a rate scaled from their period, the rest catch
  the light occasionally. Each is a real button, so hover, tap and Tab all open the card. The
  same entries are a plain list lower on the page for screen readers and browsers without WebGL.
- **Any other point.** A click drops the wax tick, shows coordinates, and asks SIMBAD for the
  brightest catalogued object nearby.
- **New signature moment.** "Blink this star" grows a glass disc out of the chosen point until it
  covers the screen, then the viewer opens: a plate developed from the sky.
- **Opening sequence.** SPHEREx, drawn in code from its real silhouette (no public 3D model
  exists; NASA's 3D repository was checked), recedes while the field of view narrows so the
  stars spread, then flies to the header and becomes the logo mark. 2.4 s, once per session,
  skipped by any click, key or scroll, never played under reduced motion.
- **Idle.** The sky drifts slowly until touched; noted stars shine. Under reduced motion the
  sky is still and noted stars keep their static rings.
- **Newly photographed.** `scripts/fresh.mts` runs daily in GitHub Actions, samples 96 positions
  across the sky, and writes `public/sky/fresh.json`. IRSA does not answer time-only searches, so
  a full list of new exposures was not possible; the page says it is a sample.
- **Cost.** Three.js is loaded only on the home page, after the headline has painted.

Deviations from the revision plan: star streaks during the intro became a narrowing field of
view (points cannot stretch cheaply); a pre-rendered still of the opening view (`public/sky/first.jpg`, made by
`scripts/sky-still.mjs`) is shown until the live map is ready and stays, with a note, when WebGL
is unavailable; automatic descriptions give the object's name and type
from SIMBAD, without distance.

Phone: the map is 46 svh so the headline, search box and button share the first screen with it;
the render loop runs at half rate with no idle drift, to keep page scrolling smooth.

## Revision 3: the opening, as directed by the owner

In the owner's order:
1. The home page loads fully dark and three stars twinkle (positions random per load).
2. The sky fills with stars across the whole window, brightest first.
3. SPHEREx appears and travels slowly to the logo, shrinking into the header mark.
4. The whole site fades in.

The star field in steps 2 to 4 is the real map, drawn full-window but projected at the map's own
scale and centre, so when the site fades in beneath it and the canvas returns to its box, no star
moves. About 6.5 s after the 3D code is ready, plus a 0.9 s fade. It plays on every direct load of
the home page, is skipped by any click, key, scroll or touch, and never plays under reduced
motion. An inline script sets the veil before first paint and removes it after 12 s whatever
happens, so a failed 3D load cannot leave the page dark.

This is well past the 2.6 s the skill recommends for an opening, and the site is not visible
until it ends. That is a deliberate choice by the owner for the hackathon presentation.

## Revision 4: full-screen map

A "Full screen" button heads the map controls. The window goes black, the stars come up brightest
first (the same fill as the opening), and the whole window is the map: every star with a note and
every other point works as before, including "Blink". The browser is also asked for real full
screen where it allows it. Escape or the same button leaves; leaving for the viewer restores the
page. Under reduced motion the switch is instant.

## Revision 5: the spacecraft model

Rebuilt from NASA/JPL-Caltech references (PIA26531, PIA26543, PIA26537) at real proportions,
one unit per metre: three nested photon shields with stepped rims, the outer one a mirror
finish with gore seams; the telescope baffle; three V-groove radiator rings; an eight-sided bus
with foil-wrapped equipment boxes, two star trackers, antennas and the launch adapter ring; and
the solar array hanging along the sun side with its struts and hinge brackets. Lit as in orbit
(one hard sun, faint earthshine) with a generated reflection environment. All textures are drawn
in code; nothing is downloaded. `src/sky/stage.ts` holds the model's scene so the opening and
the new inspection page `/craft` (drag to turn it) share it.

## Revision 6: observatory page and full-screen readout

- "Observatory" joins the top menu. The page is the model beside a list of six parts; choosing a
  part turns the model to show it and opens a short note. Below: six figures, a to-scale diagram of
  one exposure (three detector pairs, the full Moon for size, the 17 colour stripes), and a short
  timeline whose last entry is read from the daily archive check.
- In full-screen map mode a readout at the bottom right follows the pointer with the sky
  coordinates under it, sexagesimal and decimal.
- On phones under 480 px the header drops the wordmark text and the A/B dots to fit four links.

## Revision 7: observatory media

The observatory page now carries seven official films (NASA JPL, NASA Science, Caltech) in an
on-page player, NASA Eyes on the Solar System embedded as a live tracker, and twelve official
links in three groups. Nothing from YouTube or NASA Eyes loads until the visitor asks: videos
are a still and a title until played (then youtube-nocookie.com), and the tracker sits behind a
button. Links open in new tabs because NASA pages cannot be relied on to allow framing. The list
is in `src/data/media.ts`; every video id was checked against YouTube.

## Revision 8: NASA content on the home page

- Under the headline: days in orbit, the newest image date, and a link to the live tracker.
- "Latest from NASA": up to four stories with SPHEREx in the title, read from the public feeds of
  nasa.gov and science.nasa.gov on the server and refreshed daily (`src/lib/news.ts`). If the
  feeds fail the section is left out.
- "What SPHEREx has already seen": four NASA/JPL-Caltech images (PIA26354, PIA26352, PIA25788,
  PIA26280) hosted as compressed copies in `public/nasa/`, each credited and linked to its page
  in the NASA image library.
- "Stars with notes" shows eight with a button for the rest. The footer lists the official
  mission sites.

## Revision 9: colour plates

A "Colour" switch in the viewer loads three detectors and paints them blue (D2, 1.1 to 1.6 um),
green (D4, 2.4 to 3.8) and red (D6, 4.4 to 5.0), each stretched against its own sky noise. Cold
objects come out red; ordinary stars white to blue. Colour plates are always one per survey pass
and always light on dark, like NASA's composites. Subtraction and the other grouping modes are
single-detector tools and are disabled while colour is on. A pass with no exposures from one
detector fills that channel with the average of the other two and says so on the plate; a pixel
with no data in any channel is grey. Off by default: it loads about three times as much.
URL parameter `rgb=1`; key C.

## Revision 10: closing the gaps against the brief

- **Brightness over time.** Aperture photometry on every loaded exposure at the centre or the
  mark, with plate medians joined. Stars that overflow the detector are measured from their halo
  (relative only) and the chart says so. Verified: R Draconis rises nearly sixfold into
  September 2026; RW Aurigae changes by about a fifth between passes.
- **Contamination flags.** The FLAGS layer is Rice-compressed one detector row per tile, so one
  row can be range-read and decoded in the browser (`src/lib/flags.ts`). Verified against real
  files: decoded rows reproduce the header's own flag statistics.
- **Add all, and shift-and-add** with a typed motion or the fastest Gaia star's.
- **WISE overlay** (AllWISE positions from about 2010) alongside Gaia.
- **Animated export** as a looping GIF with dates, encoded in the browser (`src/lib/gif.ts`).
- **Candidate report**: copyable text with coordinates, plates and links, and a pointer to the
  Backyard Worlds discussion board.
- **A fast mover, tested.** JPL Horizons put asteroid 704 Interamnia at 216.79261, -32.51587 at
  the moment of one exposure on 1 February 2026; the viewer shows a bright source there in that
  exposure and in no other. It is the sixth example on the viewer's start page.
- **Colour plates on the site.** The baked plates on the home, targets and target pages now use
  the three-detector colour version; the two difference views stay grey because a difference has
  no colour.

## Revision 11: constellations on the full-screen sky

- **Coming across a constellation.** In full screen, the figure nearest the middle of the view
  that is mostly on screen draws itself star to star, blinks twice with its name and meaning
  ("Orion, the hunter"), and fades away. It is the site's own gesture (hold, snap, hold) applied
  to the sky. One figure at a time; each plays once per visit to the full sky; resting the pointer
  on one of its stars plays it again. Reduced motion: the figure appears, holds and goes.
- **Lines switch** in the map controls shows all 88 figures with their names.
- **Found count** ("12 of 88 constellations found"), kept in the browser.
- **Readout** names the constellation under the pointer; **bright stars** carry their names
  (the 29 brightest always, 110 more when zoomed in).
- Data: d3-celestial (BSD 3-Clause), baked by `scripts/bake-constellations.mts` with every line
  end snapped to a Bright Star Catalogue dot. Lines are quads built in the vertex shader with the
  same projection as the stars (`src/sky/scene.ts`); the choosing is in `src/sky/constellations.ts`.
- Full screen only: on the home page the map sits under the headline and stays plain.

## Revision 12: the Milky Way and colour, full screen

- **Milky Way.** The star-free layer of NASA SVS Deep Star Maps 2020 (Gaia), sampled per pixel by
  undoing the map's projection, so it turns and zooms with the stars. It fades in after the stars
  have filled, is held well under full brightness so lines, names and rings stay readable, and
  steps back slightly when zoomed in. Loaded only when full screen is opened (1 MB).
- **Colour.** The ground goes deep blue-black; the stars' temperature tint is strengthened in full
  screen; the Milky Way keeps its own colour with the saturation raised. Nothing is painted in.
- The home page map stays plain: it sits under the headline.

## Revision 13: the launch film

Requested by the owner. The Revision 3 opening (stars fill, the spacecraft flies to the logo) is
replaced by a scroll-driven film: a Falcon 9 climbs across the window at dusk, drops its booster,
opens its nose and releases SPHEREx; the camera goes down the telescope into the dark, the stars
come up brightest first, and the site fades in on "Something up here moved." Details, timing and
the list of files are in `LAUNCH.md`.

- It departs from "No loader, no WebGL" and from the 2.6 s opening the skill recommends, at the
  owner's request. Skip (or Escape) ends it at once; it never plays under reduced motion, and a
  failed load goes straight to the site.
- The stars in the film are the real sky map underneath, so nothing moves at the hand-over.
- The vehicle and SPHEREx are built in code from photographs and the launch footage, at real
  proportions, with no markings. SPHEREx is now matte white outside, as it flew; the model on the
  observatory page is the same one, now with real shadows.
- The look is a camera's, not a renderer's: haze, shimmer, soft focus, sensor noise, exposure.

## Revision 14: in the stars (in progress)

Requested by the owner: the site felt boxy and busy, and the type too familiar.

- **One sky behind every page.** `StarBackdrop` draws the map's own star catalogue on a plain
  canvas fixed behind the content. Sections have no backgrounds.
- **No rules, soft corners.** The lines between rows and sections are gone; rows are set apart by
  space. Plates, pictures and panels have a 12 px corner; buttons and inputs are pills. Control
  outlines use `--c-edge` (32% ink), not full ink. This replaces "Radius 0 everywhere".
- **Invert is gone from the header.** Plates are light-on-dark by default so they sit in the sky.
- **Home is five chapters, one window each:** the sky; how to read a blink; where to start; the
  observatory; from NASA. Nothing was cut: what used to be stacked sections is now tabs inside a
  chapter (`Tabs`, every panel stays in the page, hidden not removed).
- **Pull-apart SPHEREx.** The model is built from named parts; "Pull it apart" on the model
  separates them along the axis with a name beside each (`CraftView`, `APART`).
- **Into the full-screen map.** The camera pulls back and turns a little, so far more of the
  sky opens around the patch you were on, while the Milky Way and the star colours come up; out
  is the same move backwards to where you came in (`swing` in `SkyMap.tsx`). It replaced a dive
  through SPHEREx that built a second 3D scene on every click and stuttered. The Milky Way is
  fetched and uploaded while the page is idle, and the move waits for the browser's own full
  screen to finish resizing the window.
- **Viewer.** Position, detector and grouping stay open; stacking, display, plate details,
  light curve, flags, spectrum and share are `<details>` groups, closed until wanted.
- **Chapters settle.** On desktop the home page nudges to the top of a chapter when the scroll
  rests near one (`ChapterSnap`, Lenis's snap add-on, proximity only).
- **Observatory page is a scroll teardown.** One pinned window; every piece's position and the
  camera are worked out from the scroll (`ObservatoryStory`, `ACTS` and `RIPS`), so scrolling is
  what pulls it apart: outer shield, inner shields, baffle, telescope, detectors, struts,
  radiators, bus, solar array, one per act with a note. Pieces strain, let go and fly clear,
  then all fly home and the observatory backs away into a single star. Without WebGL the same
  words show as a plain page.
- Still to do: the new typeface (samples at `/type`, a temporary page; the owner has not chosen).
