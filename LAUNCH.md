# Launch film

The home page opens on a scroll-driven film: a rocket climbs across the window, releases SPHEREx,
and the camera goes down its telescope into the full-window sky map. Then the site fades in on
"Something up here moved."

Status: built (15 November 2026). Timing, scroll, cuts, the hand-over to the site and the looks
are in. It runs at about 55 frames a second at full sharpness on a laptop, and steps its
sharpness down by itself on slower machines.

## The six beats

`p` is film time, 0 to 1. The whole film is about ten window-heights of scrolling.

Scroll and film time are separate (`filmTime()` in `beats.ts`). Two parts get more than their
share of the scroll: the climb out of the air (film time 0.08 to 0.42, twice: about four
window-heights of leaving the Earth before the booster drops), and SPHEREx's turn (0.715 to
0.805, four times: about two window-heights). Everything else moves at the pace it had. The
list `SLOW` sets this.

| p | Beat | What happens |
|---|---|---|
| 0.00 | Climb | Opens tight on the nose at dusk, in the last red sunlight, nose up and right. The camera pulls back until the whole rocket and its flame are in view (by 0.30). The sky is a dusk gradient with an afterglow low down; thin cloud in flat layers slides back and frost sheds off the tanks. |
| 0.20 | Thin air | The sky fades to black, the sunlight whitens and hardens, the brightest stars come in, the Earth's edge rises at the bottom right. The flame balloons into a wide column. |
| 0.40 | Staging | The booster cuts off at 0.42 and falls back, tumbling. The upper stage lights a small pale flame. The camera closes in again on the upper stage. |
| 0.50 | Space | The upper stage reaches the middle. Its flame goes out. At 0.56 the nose halves part and drift off. |
| 0.65 | Release | At 0.68 the spent stage starts to drift back. SPHEREx holds the middle and tips part-way, so its nested shields show (done by 0.73), and is named. |
| 0.72 | Satellites | SPHEREx turns once about its own axis (0.715 to 0.805). Meanwhile the four PUNCH satellites leave the stage in two pairs (0.745 and 0.765), as they did about ten minutes after SPHEREx, and each is named. About three-quarters through the turn the glass of the solar panel mirrors the Sun straight into the camera: the panel burns out to white and the lens flares. |
| 0.81 | Telescope | SPHEREx turns its cone to the camera. The camera runs down the cone into the dark (0.94). The stars come up brightest first, and the site fades in. |

## Where things are

- `src/film/beats.ts`: every position, cut, light level and fade as a pure function of `p`. Tune
  timing here. Tested in `tests/film.test.ts`.
- `src/film/scene.ts`: puts the scene together: lights, camera, shake, and what each piece does
  each frame.
- `src/film/vehicle.ts`: the Falcon 9 at real proportions (70 m), built in code, with its paint,
  frost, soot, seams and surface relief drawn in code. No markings.
- `src/film/plume.ts`: engine exhaust as a soft shell shader. `src/film/ice.ts`: frost shedding.
- `src/film/backdrop.ts`: the dusk air, the cloud streaming past, the engines' light in that air,
  and the Earth's edge, as one full-window shader.
- `src/film/look.ts`: the camera: bloom, haze, air shimmer, lens softness, colour fringing,
  exposure, film curve, sensor noise, vignette.
- `src/sky/spacecraft.ts`: SPHEREx, rebuilt from the photographs. `src/sky/surface.ts`: the relief
  helper both models use.
- `src/film/bridge.ts`: how the film asks the sky map for stars and hands the page back.
- `src/components/LaunchFilm.tsx`: the canvas, scroll and key input, Skip, and the mission
  timeline along the bottom: the flight's events on a curved track, a marker that travels with
  the scroll, and the mission clock (`EVENTS`, `missionClock()` in `beats.ts`). The clock is
  pinned to the flight's real times: booster cut-off about 2:22, fairing 3:10, release 41:56.
- `src/components/SkyMap.tsx` (`joinFilm`): the map fills the window during the film and shows as
  many stars as the film asks for. The stars in the film are the real map, so nothing moves at
  the hand-over.

## Rules

- Everything is a pure function of `p`. Nothing accumulates, so scrolling back plays it in reverse.
- Free bodies (booster, nose halves, spent stage) move in straight lines at constant speed. Only
  the camera eases.
- The page does not scroll during the film. Leftover scroll momentum is swallowed for 1.2 s after
  it ends so the page stays on the headline.
- No film under reduced motion, without WebGL, or if the code fails to load: the site just appears.
- `/?film=0.6` holds the film at that film time, for checking a single frame.
- A pixel that is not a number is cleaned before the bloom (`Clean` in `look.ts`), because the
  bloom would smear it across the picture.

## Why it does not look like a model

Decided with the owner: dark and realistic, and you should feel the thrust on the way up.
A render that is perfectly sharp, clean and evenly lit reads as a toy, so:

- **Light as it would be.** A launch at dusk: blue twilight on one side, the last red sunlight
  on the other, whitening as the vehicle climbs out of the Earth's shadow. In space one hard Sun,
  real shadows, and only a faint fill from the Earth. Through the release the Sun stays more than
  90 degrees from the telescope's line of sight, as on the real spacecraft. On the final turn
  SPHEREx swings into the light (`SUN_IN` in `scene.ts`), so the inside of the cone is lit and
  the telescope casts its shadow across the shields. That is the owner's choice over accuracy.
- **A real camera.** Haze between lens and vehicle, air shimmer, a lens that is never quite
  sharp and hunts while it zooms, colour fringing at the corners, exposure that stops down for
  the flame, a trace of sensor noise in the dusk air and next to none in space, where the picture is still and it showed as grain crawling over the vehicle (the owner found more too grainy), a vignette, and a hand that never holds perfectly still.
- **Surfaces that were made and used.** Frost on the oxygen tanks, soot below, weld beads, seam
  latches, fastener rows, vents with their streaks, dents. SPHEREx is matte white with its seams
  and fittings, as it flew, with foil blankets and a black ribbed telescope.
- **The exhaust from the footage.** Low down, a white-hot column as wide as the vehicle inside
  an orange sheath, with shock diamonds (compare `S2_tracker_01_tp28s.jpg` in
  `.shots/refs/launch/`). High up, a wide, soft, deep orange column behind a ring of white-hot
  engine points (compare `S2_tracker_03_tp1m55s.jpg`).
- **The air.** Air cannot be seen, and nothing is drawn to stand for it. What a camera sees near
  the speed of sound is a smooth cone of mist where the air speeds up round the curve of the
  nose, and another behind the fairing's base (`BOW` and `SKIRT` in `plume.ts`). They are soft,
  white, and come and go. Oxygen boils off the cold tanks and trails along the body.
- **The glint.** The flare off SPHEREx is not timed by hand: `scene.ts` works out each frame how
  nearly the solar panel mirrors the Sun into the camera, and the lens pass (`glint` in
  `look.ts`) adds the burnt-out point, soft glare and a faint ring. No ruled spikes.
- **Names.** `picture().names` says when each name shows; `Film.tags` gives where each thing is
  in the window; `LaunchFilm.tsx` draws a dot, a leader line and the name. The rocket is named
  while only its nose is in view; SPHEREx and the four PUNCH satellites once each is free.
  PUNCH is one Narrow Field Imager and three Wide Field Imagers; which sat where on the ring is
  not published, so which model carries which name is our choice. In the air the sky's fill light is kept low and the paint is glossy, so
  the Sun leaves a bright streak down the tanks.
- **Space as full as the site's map.** Once the air is gone nearly all the map's stars show
  (`FEW_STARS` in `beats.ts`), so the film and the site are the same sky. They go dark inside
  the telescope and come back brightest first.
- **Thrust.** While the engines burn the picture shakes (hardest low down), the flame flickers
  and streams, cloud and ice rush past. At cut-off everything goes still.

Shake, flicker and streaming run on the clock, so the rocket feels alive when the scroll stops.
Positions stay pure functions of film time.

Reference frames of the real launch and of the hardware are in `.shots/refs/` (git-ignored; never
ship them). Their credits are in the `README.md` files there.
