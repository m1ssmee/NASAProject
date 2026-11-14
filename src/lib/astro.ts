// Coordinates, dates and proper motion.

const D2R = Math.PI / 180;

export const mjdToDate = (mjd: number) => new Date((mjd - 40587) * 86400000);
export const mjdToYear = (mjd: number) => 2000 + (mjd - 51544.5) / 365.25;
export const isoDate = (mjd: number) => mjdToDate(mjd).toISOString().slice(0, 10);

/**
 * Move a catalogue position to another epoch with linear proper motion.
 * pmRa is the usual mu_alpha* (already multiplied by cos dec), in mas/yr.
 */
export function propagate(
  ra: number, dec: number, pmRa: number, pmDec: number, fromYear: number, toYear: number,
): [number, number] {
  const dt = toYear - fromYear;
  const d = dec + (pmDec * dt) / 3.6e6;
  const r = ra + (pmRa * dt) / 3.6e6 / Math.cos(dec * D2R);
  return [((r % 360) + 360) % 360, d];
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function formatRa(ra: number, digits = 2): string {
  const total = (((ra % 360) + 360) % 360) / 15;
  let h = Math.floor(total);
  let m = Math.floor((total - h) * 60);
  let s = ((total - h) * 60 - m) * 60;
  const f = 10 ** digits;
  s = Math.round(s * f) / f;
  if (s >= 60) { s -= 60; m += 1; }
  if (m >= 60) { m -= 60; h = (h + 1) % 24; }
  return `${pad(h)}h ${pad(m)}m ${s.toFixed(digits).padStart(3 + digits, '0')}s`;
}

export function formatDec(dec: number, digits = 1): string {
  const sign = dec < 0 ? '−' : '+';
  const a = Math.abs(dec);
  let d = Math.floor(a);
  let m = Math.floor((a - d) * 60);
  let s = ((a - d) * 60 - m) * 60;
  const f = 10 ** digits;
  s = Math.round(s * f) / f;
  if (s >= 60) { s -= 60; m += 1; }
  if (m >= 60) { m -= 60; d += 1; }
  return `${sign}${pad(d)}° ${pad(m)}′ ${s.toFixed(digits).padStart(3 + digits, '0')}″`;
}

/**
 * Parse "133.795 -7.245", "08h55m10.83s -07d14m42.5s", "08 55 10.83 -07 14 42.5" or
 * "08:55:10.83 -07:14:42.5". Returns null when the text is not a coordinate pair (try a name lookup).
 */
export function parseCoords(input: string): { ra: number; dec: number } | null {
  const text = input.trim().replace(/[−–]/g, '-').replace(/,/g, ' ');
  if (!text) return null;
  // Two plain decimals: degrees.
  const dm = text.match(/^([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)$/);
  if (dm) {
    const ra = Number(dm[1]), dec = Number(dm[2]);
    return ra >= 0 && ra < 360 && Math.abs(dec) <= 90 ? { ra, dec } : null;
  }
  // Sexagesimal: six numbers, the fourth carrying the declination sign.
  const cleaned = text.replace(/[hdms:°'"′″]/gi, ' ');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length !== 6 || parts.some((p) => !/^[+-]?\d+(\.\d+)?$/.test(p))) return null;
  if (parts[0].startsWith('-')) return null; // right ascension is never negative
  const n = parts.map(Number);
  const ra = (Math.abs(n[0]) + n[1] / 60 + n[2] / 3600) * 15;
  const sign = parts[3].startsWith('-') ? -1 : 1;
  const dec = sign * (Math.abs(n[3]) + n[4] / 60 + n[5] / 3600);
  if (n[0] >= 24 || n[1] >= 60 || n[2] >= 60 || n[4] >= 60 || n[5] >= 60 || Math.abs(dec) > 90) return null;
  return { ra, dec };
}
