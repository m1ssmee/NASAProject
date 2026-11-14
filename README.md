# Blinkscope

A blink comparator for SPHEREx, built for the NASA Space Apps 2026 challenge
[Planet X and SPHEREx](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/).
Enter a sky position; the viewer finds every SPHEREx exposure of it, aligns them and plays them
so anything that moves or changes stands out.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests for coordinates, FITS, WCS and frame grouping
npm run build && npm start
```

If Node reports `unable to get local issuer certificate` when the app calls IRSA, your shell has
`SSL_CERT_FILE` pointing at a certificate bundle that lacks IRSA's root. Run with
`env -u SSL_CERT_FILE npm run dev`.

## Use

- `/view?ra=133.75976&dec=-7.24219` opens the viewer. Optional: `fov` (120, 300, 600, 1200 arcsec),
  `det` (1 to 6), `mode` (`pass`, `burst`, `single`), `diff=1`, `ends=1`, `gaia=1`, `hold` (ms), `name`.
- `/embed?...` takes the same parameters and has no site navigation, for iframes.
- Keys in the viewer: space plays, arrows step, 1 to 6 pick a detector, D subtracts the first plate.

## How it works

1. `/api/frames` asks IRSA's SIA2 service which images cover the position (IRSA sends no CORS headers).
2. The browser reads each image's header and a strip of rows from the public bucket
   `nasa-irsa-spherex` with HTTP Range requests (`src/lib/fits.ts`).
3. Each strip is resampled north-up onto a shared grid (`src/lib/wcs.ts`, `src/lib/frames.ts`),
   the sky median is removed, and exposures are stacked per survey pass.
4. `/api/resolve` (Sesame, SIMBAD) and `/api/catalog` (Gaia DR3 via VizieR) proxy the lookups.

## Sky map

The home page is a map of the real sky (`src/components/SkyMap.tsx`, `src/sky/`). Stars come from
`public/sky/stars.bin`, baked from the Yale Bright Star Catalogue with `npx tsx scripts/bake-stars.mts`.
The stars that carry notes are in `src/data/stars.ts`; edit that file to add or correct one.

## Keeping up with new data

Images are discovered live, so weekly additions appear on their own. When IRSA publishes a new
release, add its collection name to `src/config/releases.ts`. To refresh the pre-rendered plates
used on the home and target pages: `npm run bake`.

`scripts/fresh.mts` samples 96 sky positions and writes `public/sky/fresh.json`, the list of
newly photographed fields. `.github/workflows/fresh.yml` runs it daily and commits the result.

## Layout

```
src/app            pages and API routes
src/components     site components; viewer/ holds the tool
src/lib            fits, wcs, frames, astro, render
src/data           targets, site copy, wavelength tables
src/engine         scroll, reveals, page transitions
src/motion         the blink clock and site-wide motion setup
scripts/bake.mts   pre-render plates for the five test targets
DESIGN.md          concept and design system
```

See `/method` in the app for the limits of the approach and the data credits.
