'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/data/site';
import { Hop } from './Hop';

export function Header() {
  const path = usePathname();
  if (path.startsWith('/embed')) return null;
  const flip = () => {
    const h = document.documentElement;
    const next = h.dataset.plate === 'positive' ? 'negative' : 'positive';
    h.dataset.plate = next;
    try { localStorage.setItem('plate', next); } catch { /* private mode */ }
  };
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label={`${site.name}, home`}>
        <span className="lamp" aria-hidden="true"><i /><i /></span>
        <span className="hop__t">{site.name}</span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        {site.nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? 'page' : undefined}>
            <Hop>{n.label}</Hop>
          </Link>
        ))}
        <button type="button" className="plate-toggle" onClick={flip} aria-label="Invert plate colours">
          <i aria-hidden="true" /><span>Invert</span>
        </button>
      </nav>
    </header>
  );
}
