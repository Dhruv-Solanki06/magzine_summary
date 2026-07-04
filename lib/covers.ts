// lib/covers.ts — deterministic, tasteful typographic covers.
// The DB has no real cover art, so we generate a consistent gradient per
// magazine/article seed. Editorial, muted, print-inspired palettes.

export interface CoverTheme {
  from: string;
  to: string;
  ink: string; // text colour that sits on the gradient
  accent: string; // subtle overlay tint
}

const THEMES: CoverTheme[] = [
  { from: '#1E293B', to: '#334155', ink: '#F8FAFC', accent: 'rgba(148,163,184,0.25)' }, // slate
  { from: '#7C2D12', to: '#9A3412', ink: '#FFF7ED', accent: 'rgba(253,186,116,0.22)' }, // rust
  { from: '#134E4A', to: '#0F766E', ink: '#F0FDFA', accent: 'rgba(94,234,212,0.20)' }, // teal
  { from: '#3B0764', to: '#6B21A8', ink: '#FAF5FF', accent: 'rgba(216,180,254,0.22)' }, // plum
  { from: '#78350F', to: '#B45309', ink: '#FFFBEB', accent: 'rgba(252,211,77,0.22)' }, // amber
  { from: '#1E3A8A', to: '#1D4ED8', ink: '#EFF6FF', accent: 'rgba(147,197,253,0.22)' }, // indigo
  { from: '#831843', to: '#9D174D', ink: '#FFF1F2', accent: 'rgba(251,207,232,0.22)' }, // wine
  { from: '#14532D', to: '#166534', ink: '#F0FDF4', accent: 'rgba(134,239,172,0.20)' }, // forest
  { from: '#0C4A6E', to: '#0369A1', ink: '#F0F9FF', accent: 'rgba(125,211,252,0.22)' }, // ocean
  { from: '#44403C', to: '#57534E', ink: '#FAFAF9', accent: 'rgba(214,211,209,0.20)' }, // stone
];

function hashString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function coverTheme(seed: string | number | null | undefined): CoverTheme {
  const key = String(seed ?? 'magazine');
  return THEMES[hashString(key) % THEMES.length];
}

/** Compact monogram from a title — up to two initials. */
export function monogram(text: string | null | undefined): string {
  if (!text) return '§';
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '§';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
