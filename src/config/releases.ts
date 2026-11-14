// SPHEREx data releases searched by the tool.
// When IRSA publishes a new release, add its collection name here. Nothing else changes:
// images are discovered live, so weekly additions to a listed release appear on their own.
export const COLLECTIONS = ['spherex_dr1', 'spherex_qr3', 'spherex_dr1_deep', 'spherex_qr3_deep'];

export const SIA_ENDPOINT = 'https://irsa.ipac.caltech.edu/SIA';

export function siaUrl(ra: number, dec: number): string {
  const q = COLLECTIONS.map((c) => `COLLECTION=${c}`).join('&');
  return `${SIA_ENDPOINT}?${q}&POS=circle+${ra.toFixed(6)}+${dec.toFixed(6)}+0.0003&RESPONSEFORMAT=CSV`;
}
