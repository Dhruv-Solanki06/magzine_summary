// lib/seo.ts — canonical URLs, meta text normalisation and JSON-LD builders.
//
// Everything here is pure and server-safe so it can run inside getServerSideProps
// as well as during render. Keep it free of React and of any browser globals.

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/brand';
import { authorLabel, bestSummary, extractYear, magazineName } from '@/lib/format';
import type { MagazineWithStats, RecordWithDetails } from '@/types';

/** Join a site-root-relative path onto the canonical origin. */
export function absoluteUrl(path = '/'): string {
  if (!path.startsWith('/')) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}

/**
 * Collapse whitespace and clip to `max` characters on a word boundary. Search
 * engines truncate descriptions around 155-160 chars; going long is not
 * penalised but the tail is wasted, and mid-word cuts read badly in the SERP.
 */
export function metaText(raw: string | null | undefined, max = 158): string {
  const flat = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const clipped = flat.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

/** JSON-LD is injected via dangerouslySetInnerHTML, so close no <script> tags. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

type JsonLd = Record<string, unknown>;

/**
 * schema.org's `inLanguage` wants a BCP 47 tag. The archive stores whatever the
 * cataloguer typed — "eng", "English", "Hindi, Sanskrit" — so map what we
 * recognise and emit nothing at all for the rest. A wrong language tag is worse
 * than a missing one: it tells Google to serve the page to the wrong audience.
 */
const BCP47_BY_NAME: globalThis.Record<string, string> = {
  en: 'en', eng: 'en', english: 'en',
  hi: 'hi', hin: 'hi', hindi: 'hi',
  sa: 'sa', san: 'sa', sanskrit: 'sa',
  pra: 'pra', prakrit: 'pra',
  pi: 'pi', pali: 'pi',
  gu: 'gu', guj: 'gu', gujarati: 'gu',
  kn: 'kn', kan: 'kn', kannada: 'kn',
  ne: 'ne', npi: 'ne', nep: 'ne', nepali: 'ne',
  mag: 'mag', magahi: 'mag',
  ln: 'ln', lin: 'ln', lingala: 'ln',
  bn: 'bn', ben: 'bn', bengali: 'bn',
  ta: 'ta', tam: 'ta', tamil: 'ta',
  te: 'te', tel: 'te', telugu: 'te',
  mr: 'mr', mar: 'mr', marathi: 'mr',
  ur: 'ur', urd: 'ur', urdu: 'ur',
  or: 'or', ori: 'or', odia: 'or', oriya: 'or',
};

export function bcp47Language(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  // Multi-language records are comma separated; inLanguage takes one value.
  const first = raw.split(',')[0]?.trim().toLowerCase();
  if (!first) return undefined;
  return BCP47_BY_NAME[first];
}

/**
 * Site-level identity. Emitted once, on the home page. The SearchAction lets
 * Google offer a sitelinks search box for the archive.
 */
export function buildWebSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Aryan Culture Archive',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildOrganizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Breadcrumbs drive the "site > section > page" trail shown under a SERP entry
 * in place of a raw URL. Cheap to emit and one of the few structured-data types
 * with a directly visible payoff.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * A record is a journal article, so ScholarlyArticle with an `isPartOf`
 * Periodical is the honest shape — it tells Google this is scholarship in a
 * named journal rather than a blog post.
 *
 * `timestamp` in this schema is free text ("June - 2014"), so only the year is
 * trustworthy. A bare year is valid ISO 8601 and valid for datePublished; we
 * emit nothing at all rather than invent a month or day.
 */
export function buildRecordJsonLd(record: RecordWithDetails): JsonLd {
  const title = record.title_name || 'Untitled article';
  const journal = magazineName(record);
  const year = extractYear(record.timestamp);
  const abstract = metaText(bestSummary(record), 400);

  const authors = (record.record_authors ?? [])
    .map((ra) => ra.authors?.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ '@type': 'Person', name }));

  const keywords = (record.record_tags ?? [])
    .map((rt) => rt.tags?.name)
    .filter((name): name is string => Boolean(name));

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    '@id': absoluteUrl(`/records/${record.id}`),
    url: absoluteUrl(`/records/${record.id}`),
    headline: title,
    name: title,
    isAccessibleForFree: true,
    inLanguage: bcp47Language(record.language || record.language_legacy),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  if (abstract) jsonLd.abstract = abstract;
  if (authors.length > 0) jsonLd.author = authors;
  if (keywords.length > 0) jsonLd.keywords = keywords.join(', ');
  if (year) jsonLd.datePublished = String(year);
  if (record.page_numbers) jsonLd.pagination = record.page_numbers;

  if (journal && journal !== 'Unknown journal') {
    const issn = record.magazines?.issn_print || record.magazines?.issn_online;
    jsonLd.isPartOf = {
      '@type': 'PublicationIssue',
      issueNumber: record.number || undefined,
      datePublished: year ? String(year) : undefined,
      isPartOf: {
        '@type': 'PublicationVolume',
        volumeNumber: record.volume || undefined,
        isPartOf: {
          '@type': 'Periodical',
          name: journal,
          issn: issn || undefined,
        },
      },
    };
  }

  return jsonLd;
}

/** A journal landing page: the Periodical itself, not one of its articles. */
export function buildMagazineJsonLd(magazine: MagazineWithStats): JsonLd {
  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Periodical',
    name: magazine.name,
    url: absoluteUrl(`/magazines/${magazine.slug}`),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  if (magazine.description) jsonLd.description = metaText(magazine.description, 400);
  if (magazine.issn_print || magazine.issn_online) {
    jsonLd.issn = magazine.issn_print || magazine.issn_online;
  }
  if (magazine.founded_year) jsonLd.foundingDate = String(magazine.founded_year);
  return jsonLd;
}

/** Index/listing pages — tells Google the page is a curated set, not an article. */
export function buildCollectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  itemCount?: number;
}): JsonLd {
  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: metaText(opts.description, 400),
    url: absoluteUrl(opts.path),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
  if (typeof opts.itemCount === 'number') {
    jsonLd.mainEntity = {
      '@type': 'ItemList',
      numberOfItems: opts.itemCount,
    };
  }
  return jsonLd;
}

/** Social card image. Records have no artwork, so fall back to heritage assets. */
export function socialImageForRecord(record: RecordWithDetails): string {
  const cover = record.magazines?.cover_image_url;
  if (cover && /^https?:\/\//.test(cover)) return cover;
  return absoluteUrl('/assets/aryan-culture-temple-architecture.jpg');
}

/** One-line description for a record, used for <meta name="description">. */
export function recordDescription(record: RecordWithDetails): string {
  const summary = metaText(bestSummary(record));
  if (summary) return summary;
  const journal = magazineName(record);
  const who = authorLabel(record);
  const year = extractYear(record.timestamp);
  return metaText(
    [
      record.title_name,
      who ? `by ${who}` : '',
      journal && journal !== 'Unknown journal' ? `in ${journal}` : '',
      year ? `(${year})` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}
