// "New this fortnight": sky positions SPHEREx photographed most recently, from the daily check
// in scripts/fresh.mts. Each links into the viewer at that position.
import Link from 'next/link';
import { formatDec, formatRa } from '@/lib/astro';
import type { FreshField } from './SkyMap';

export interface FreshData { checked: string; newest: string; windowDays: number; sampled: number; fields: FreshField[] }

export function FreshStrip({ data }: { data: FreshData }) {
  if (!data.fields.length) return null;
  return (
    <div className="fresh">
      <p className="muted tabs__intro">
        Of {data.sampled} positions checked across the sky on {data.checked}, these have exposures from the archive&rsquo;s latest {data.windowDays} days, up to {data.newest}. They are outlined on the map.
      </p>
      <ul className="fresh__list">
        {data.fields.slice(0, 16).map((f) => (
          <li key={`${f.ra},${f.dec}`}>
            <Link href={`/view?ra=${f.ra}&dec=${f.dec}`}>
              <span>{formatRa(f.ra, 0)} {formatDec(f.dec, 0)}</span>
              <span>{f.date.slice(5)}, {f.count} img</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
