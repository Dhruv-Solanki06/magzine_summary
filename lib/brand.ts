export const SITE_NAME = 'Aryan Culture';
export const SITE_DOMAIN = 'aryanculture.org';
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_TAGLINE = 'Indic culture archive';
export const SITE_DESCRIPTION =
  'Aryan Culture is a digital archive for articles, journals, manuscripts, and cultural scholarship from the Indic knowledge tradition.';

export interface HeritageAsset {
  src: string;
  alt: string;
  title: string;
  credit: string;
}

export const HERITAGE_ASSETS: HeritageAsset[] = [
  {
    src: '/assets/aryan-culture-jina-manuscript.jpg',
    alt: 'Illuminated Kalpasutra manuscript folio from Gujarat',
    title: 'Kalpasutra manuscript folio',
    credit: 'Los Angeles County Museum of Art via Wikimedia Commons',
  },
  {
    src: '/assets/aryan-culture-palm-leaf.jpg',
    alt: 'Bhagavata Purana palm-leaf manuscript from West Bengal',
    title: 'Palm-leaf manuscript',
    credit: 'Los Angeles County Museum of Art via Wikimedia Commons',
  },
  {
    src: '/assets/aryan-culture-gita-manuscript.jpg',
    alt: 'Gita Govinda manuscript with painted wood covers',
    title: 'Gita Govinda manuscript',
    credit: 'Los Angeles County Museum of Art via Wikimedia Commons',
  },
  {
    src: '/assets/aryan-culture-temple-architecture.jpg',
    alt: 'Architectural diagram of the Khajuraho temples',
    title: 'Khajuraho temple architecture',
    credit: 'Tangopaso via Wikimedia Commons',
  },
];

function hashString(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function heritageAssetForSeed(seed: string | number | null | undefined): HeritageAsset {
  const key = String(seed ?? SITE_NAME);
  return HERITAGE_ASSETS[hashString(key) % HERITAGE_ASSETS.length];
}
