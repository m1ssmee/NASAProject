import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BakedPlate } from '@/components/BakedPlate';
import { Hop } from '@/components/Hop';
import { targetBySlug, targetNow, targets } from '@/data/targets';
import { formatDec, formatRa } from '@/lib/astro';

export const dynamicParams = false;
export function generateStaticParams() {
  return targets.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = targetBySlug(slug);
  return t ? { title: t.name, description: `${t.name} in SPHEREx images. ${t.summary}`.slice(0, 158) } : {};
}

export default async function TargetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = targets.findIndex((t) => t.slug === slug);
  if (i < 0) notFound();
  const t = targets[i];
  const next = targets[(i + 1) % targets.length];
  const now = targetNow(t);
  const href = `/view?ra=${now.ra.toFixed(5)}&dec=${now.dec.toFixed(5)}&det=${t.det}&name=${encodeURIComponent(t.name)}`;
  return (
    <article>
      <header className="page-head wrap grid">
        <h1 className="display" data-split="lines" data-intro>{t.name}</h1>
        <p className="lede">{t.summary}</p>
      </header>
      <div className="case wrap grid">
        <div className="case__plate">
          <BakedPlate slug={t.slug} size={72} alt={`SPHEREx detector ${t.det} image centred on ${t.name}, alternating between the first and latest survey pass. ${t.look}`} />
          <p className="small muted" style={{ marginTop: '0.6rem' }}>Detector {t.det}, each plate a stack of one survey pass. North is up, east is left.</p>
        </div>
        <div className="case__body">
          <section aria-labelledby="look-h">
            <h2 id="look-h" className="h-l">What to look for</h2>
            <p style={{ marginTop: '0.75rem', maxWidth: '52ch' }} className="h-m">{t.look}</p>
          </section>
          <dl className="facts">
            <div><dt>Kind</dt><dd>{t.kind}</dd></div>
            <div><dt>Position in 2026</dt><dd className="mono">{formatRa(now.ra)}<br />{formatDec(now.dec)}</dd></div>
            {t.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
          <div className="prose">{t.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
          <p><Link href={href} className="btn"><Hop tick={false}>Open in the viewer with live data</Hop></Link></p>
        </div>
      </div>
      <nav className="wrap" aria-label="Next target">
        <div className="next-target">
          <span className="muted small">Next target</span>
          <Link href={`/targets/${next.slug}`} className="h-xl"><Hop>{next.name}</Hop></Link>
        </div>
      </nav>
    </article>
  );
}
