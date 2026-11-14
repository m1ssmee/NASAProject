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
export const viewport: Viewport = { themeColor: '#101214' };

// Runs before first paint: motion flags, the visitor's plate polarity, and the dark veil the
// home page opens under (with a timeout so a failed 3D load can never leave the page black).
const flags = `var h=document.documentElement;h.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('motion');try{if(localStorage.getItem('plate')==='positive')h.dataset.plate='positive'}catch(e){}var off=false;try{off=sessionStorage.getItem('intro')==='off'}catch(e){}if(location.pathname==='/'&&h.classList.contains('motion')&&!off){h.classList.add('intro-pending','intro-veil');for(var i=1;i<4;i++){h.style.setProperty('--tw'+i+'x',(8+Math.random()*84).toFixed(1)+'vw');h.style.setProperty('--tw'+i+'y',(10+Math.random()*72).toFixed(1)+'vh')}setTimeout(function(){h.classList.remove('intro-pending','intro-veil')},8000)}`;

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
        {/* The opening: three stars twinkle on the dark veil before the spacecraft arrives. */}
        <div id="twinkle" aria-hidden="true"><i /><i /><i /></div>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <Motion />
      </body>
    </html>
  );
}
