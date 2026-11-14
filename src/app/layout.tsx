import type { Metadata, Viewport } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Motion } from '@/components/Motion';
import { site } from '@/data/site';
import { display, mono } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.role}`, template: `%s | ${site.name}` },
  description: site.description,
  alternates: { canonical: './' },
  openGraph: { type: 'website', siteName: site.name, images: ['/og.png'] },
  twitter: { card: 'summary_large_image' },
};
export const viewport: Viewport = { themeColor: '#e7e9e6' };

// Runs before first paint: motion flags and the visitor's plate polarity.
const flags = `var h=document.documentElement;h.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('motion');try{if(localStorage.getItem('plate')==='positive')h.dataset.plate='positive'}catch(e){}`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.name,
  url: site.url,
  description: site.description,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: flags }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div id="curtain" aria-hidden="true"><div className="curtain__panel" /></div>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <Motion />
      </body>
    </html>
  );
}
