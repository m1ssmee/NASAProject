// The newest SPHEREx stories from NASA's own sites, fetched on the server and refreshed daily.
// Any failure returns an empty list and the home page simply leaves the section out.
export interface Story { date: string; title: string; href: string }

const FEEDS = [
  'https://www.nasa.gov/wp-json/wp/v2/posts?search=SPHEREx&per_page=20&orderby=date&_fields=date,link,title',
  'https://science.nasa.gov/wp-json/wp/v2/posts?search=SPHEREx&per_page=20&orderby=date&_fields=date,link,title',
  'https://science.nasa.gov/wp-json/wp/v2/nasa-blog?search=SPHEREx&per_page=20&orderby=date&_fields=date,link,title',
];

const decode = (s: string) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .trim();

export async function getStories(limit = 4): Promise<Story[]> {
  const lists = await Promise.all(FEEDS.map(async (url) => {
    try {
      const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; site news reader)' } });
      if (!res.ok) return [];
      const posts = (await res.json()) as { date: string; link: string; title: { rendered: string } }[];
      return posts.map((p) => ({ date: p.date.slice(0, 10), title: decode(p.title.rendered), href: p.link }));
    } catch {
      return [];
    }
  }));
  const seen = new Set<string>();
  return lists.flat()
    // The search also returns pages that merely mention the mission: keep the ones about it.
    .filter((s) => /spherex/i.test(s.title) && /^https:\/\/(www|science)\.nasa\.gov\//.test(s.href))
    .filter((s) => { const k = s.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}
