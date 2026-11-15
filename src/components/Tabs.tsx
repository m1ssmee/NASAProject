'use client';
// A row of pills that swaps what is shown beneath it. Every panel stays in the page (hidden,
// not removed), so nothing is cut: search engines and "find in page" still see all of it.
import { useId, useState, type ReactNode } from 'react';

export function Tabs({ label, tabs }: { label: string; tabs: { name: string; body: ReactNode }[] }) {
  const [at, setAt] = useState(0);
  const id = useId();
  return (
    <div className="tabs">
      <div className="seg tabs__bar" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button key={t.name} type="button" role="tab" id={`${id}t${i}`} aria-selected={i === at} aria-controls={`${id}p${i}`} onClick={() => setAt(i)}>{t.name}</button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.name} role="tabpanel" id={`${id}p${i}`} aria-labelledby={`${id}t${i}`} hidden={i !== at} className="tabs__panel">{t.body}</div>
      ))}
    </div>
  );
}
