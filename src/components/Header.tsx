'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/data/site';
import { Hop } from './Hop';

export function Header() {
  const path = usePathname();
  if (path.startsWith('/embed')) return null;
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label={`${site.name}, home`}>
        {/* SPHEREx in outline: three nested shields over the bus. The intro's spacecraft lands here. */}
        <svg className="wordmark__craft" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 4 L8 16 H16 L22 4" /><path d="M6 4 L10 16" /><path d="M18 4 L14 16" />
          <path d="M9 16 V21 H15 V16" /><line x1="2" y1="4" x2="22" y2="4" />
        </svg>
        <span className="hop__t">{site.name}</span>
        <span className="lamp" aria-hidden="true"><i /><i /></span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        {site.nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? 'page' : undefined}>
            <Hop>{n.label}</Hop>
          </Link>
        ))}
      </nav>
    </header>
  );
}
