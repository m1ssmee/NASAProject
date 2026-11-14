import type { MetadataRoute } from 'next';
import { site } from '@/data/site';
import { targets } from '@/data/targets';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/view', '/targets', ...targets.map((t) => `/targets/${t.slug}`), '/method', '/craft'].map((path) => ({ url: `${site.url}${path}` }));
}
