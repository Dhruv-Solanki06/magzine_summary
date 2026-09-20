// pages/sitemap.xml.ts — the archive's sitemap, generated on request.
//
// ~8.7k article URLs plus the browse surfaces. That is comfortably inside the
// 50,000-URL / 50 MB limit for a single sitemap, so there is no index file to
// keep in sync. If the archive ever passes ~45k records, split this into a
// sitemap index rather than letting it silently overflow.
//
// Deliberately absent: <lastmod>. The only date a record carries is
// `timestamp`, free text like "June - 2014" describing the *issue*, not when
// our copy last changed. A wrong lastmod is worse than none — it teaches
// crawlers to distrust the file.

import type { GetServerSideProps } from 'next';

import { SITE_URL } from '@/lib/brand';

/** Supabase caps a single select at 1000 rows, so walk the table in pages. */
const PAGE_SIZE = 1000;

interface SitemapUrl {
  loc: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderSitemap(urls: SitemapUrl[]): string {
  const body = urls
    .map(
      (url) =>
        `  <url>\n` +
        `    <loc>${xmlEscape(url.loc)}</loc>\n` +
        `    <changefreq>${url.changefreq}</changefreq>\n` +
        `    <priority>${url.priority}</priority>\n` +
        `  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const { getSupabaseClient } = await import('@/lib/server/records');
  const supabase = getSupabaseClient();

  const urls: SitemapUrl[] = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/magazines`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/subjects`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/researchers`, changefreq: 'weekly', priority: '0.5' },
  ];

  // Journals. Several rows have a null slug and therefore no reachable page —
  // those must not end up in the sitemap as /magazines/null.
  const { data: magazines } = await supabase
    .from('magazines')
    .select('slug')
    .not('slug', 'is', null);

  for (const magazine of magazines ?? []) {
    if (magazine.slug) {
      urls.push({
        loc: `${SITE_URL}/magazines/${magazine.slug}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  // Subject areas are a separate table from the (unused) `subjects` one.
  const { data: subjects } = await supabase
    .from('subject_areas')
    .select('slug')
    .not('slug', 'is', null);

  for (const subject of subjects ?? []) {
    if (subject.slug) {
      urls.push({
        loc: `${SITE_URL}/subjects/${subject.slug}`,
        changefreq: 'weekly',
        priority: '0.6',
      });
    }
  }

  // The articles themselves — the reason this file exists.
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('records')
      .select('id')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      urls.push({
        loc: `${SITE_URL}/records/${row.id}`,
        changefreq: 'monthly',
        priority: '0.9',
      });
    }

    if (data.length < PAGE_SIZE) break;
  }

  // Rebuilding this means ~9 round trips to Supabase, and the archive changes
  // rarely, so let any CDN in front of the app serve it for six hours.
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
  );
  res.write(renderSitemap(urls));
  res.end();

  return { props: {} };
};

// Never rendered — getServerSideProps always ends the response itself.
export default function Sitemap() {
  return null;
}
