'use client';
// The stars that carry notes, as a list. The first eight show; the rest are one button away.
import Link from 'next/link';
import { useState } from 'react';

export function NotedList({ stars }: { stars: { id: string; name: string; sub: string; href: string }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? stars : stars.slice(0, 8);
  return (
    <>
      <ul className="noted" id="noted-list">
        {shown.map((s) => (
          <li key={s.id}>
            <Link href={s.href}><b>{s.name}</b><span>{s.sub}</span></Link>
          </li>
        ))}
      </ul>
      {stars.length > 8 && (
        <p style={{ marginTop: '1.25rem' }}>
          <button type="button" className="textbtn" aria-expanded={all} aria-controls="noted-list" onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${stars.length} stars`}
          </button>
        </p>
      )}
    </>
  );
}
