// components/common/Seo.tsx — one place that owns every <head> tag that search
// engines and social scrapers read.
//
// Next's <Head> de-duplicates by the `key` prop, not by tag identity, so every
// tag here carries an explicit key. Without that, a page rendering <Seo> while
// another component also emits, say, og:title, ends up shipping both.

import React from 'react';
import Head from 'next/head';

import { SITE_NAME, SITE_URL } from '@/lib/brand';
import { absoluteUrl, metaText, serializeJsonLd } from '@/lib/seo';

export interface SeoProps {
  /** Page title without the site suffix; omit on the home page. */
  title?: string;
  description: string;
  /** Site-root-relative path of the canonical URL, e.g. `/records/5925`. */
  path: string;
  /** og:type — `article` for a record, `profile` for a researcher, else `website`. */
  type?: 'website' | 'article' | 'profile';
  image?: string;
  /** Alt text for the social card image. */
  imageAlt?: string;
  /** Private/behind-auth pages: keep them out of the index entirely. */
  noindex?: boolean;
  /**
   * With `noindex`, still let crawlers follow the page's links. Use for
   * search/filter/paginated views: the view itself is a duplicate, but the
   * articles it links to are exactly what we want discovered.
   */
  followLinks?: boolean;
  /** One or more JSON-LD documents. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const DEFAULT_IMAGE = absoluteUrl('/assets/aryan-culture-temple-architecture.jpg');

export default function Seo({
  title,
  description,
  path,
  type = 'website',
  image,
  imageAlt,
  noindex = false,
  followLinks = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Indic Culture Archive`;
  const canonical = absoluteUrl(path);
  const desc = metaText(description);
  const socialImage = image || DEFAULT_IMAGE;
  const documents = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      <meta name="description" content={desc} key="description" />
      <link rel="canonical" href={canonical} key="canonical" />

      {/*
        Private surfaces are already Disallow-ed in robots.txt, but robots.txt
        only stops crawling — a URL linked from elsewhere can still be indexed
        without ever being fetched. noindex is what actually keeps it out.
      */}
      {noindex && (
        <meta
          name="robots"
          content={followLinks ? 'noindex, follow' : 'noindex, nofollow'}
          key="robots"
        />
      )}
      {!noindex && (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1"
          key="robots"
        />
      )}

      <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
      <meta property="og:type" content={type} key="og:type" />
      <meta property="og:title" content={fullTitle} key="og:title" />
      <meta property="og:description" content={desc} key="og:description" />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta property="og:image" content={socialImage} key="og:image" />
      <meta property="og:image:alt" content={imageAlt || fullTitle} key="og:image:alt" />
      <meta property="og:locale" content="en_US" key="og:locale" />

      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:title" content={fullTitle} key="twitter:title" />
      <meta name="twitter:description" content={desc} key="twitter:description" />
      <meta name="twitter:image" content={socialImage} key="twitter:image" />
      <meta name="twitter:image:alt" content={imageAlt || fullTitle} key="twitter:image:alt" />

      {documents.map((doc, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(doc) }}
        />
      ))}
    </Head>
  );
}

export { SITE_URL };
