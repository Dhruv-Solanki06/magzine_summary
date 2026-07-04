import React from 'react';
import clsx from 'clsx';
import { coverTheme, monogram } from '@/lib/covers';
import { heritageAssetForSeed } from '@/lib/brand';

interface CoverProps {
  /** Seed drives the deterministic colour theme (use the magazine name/id). */
  seed: string | number;
  /** Big label shown on the cover — usually the magazine name. */
  title: string;
  /** Optional smaller line below (issue / year). */
  subtitle?: string;
  /** Real image URL if the DB ever has one; falls back to generated art. */
  imageUrl?: string | null;
  className?: string;
  rounded?: string;
}

/**
 * Branded archive cover. Uses local public assets with a deterministic fallback,
 * then overlays publication text so every card feels part of Aryan Culture.
 */
export const Cover: React.FC<CoverProps> = ({
  seed,
  title,
  subtitle,
  imageUrl,
  className,
  rounded = 'rounded-lg',
}) => {
  const theme = coverTheme(seed);
  const localAsset = heritageAssetForSeed(seed);
  const coverImage = imageUrl || localAsset.src;

  return (
    <div
      className={clsx('relative flex h-full w-full overflow-hidden bg-black', rounded, className)}
      style={{
        backgroundImage: `linear-gradient(150deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18)), url("${coverImage}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
      role="img"
      aria-label={imageUrl ? title : localAsset.alt}
    >
      {/* watermark monogram */}
      <span
        className="pointer-events-none absolute -right-3 -top-6 select-none font-black leading-none opacity-[0.14]"
        style={{ color: theme.ink, fontSize: '9rem' }}
      >
        {monogram(title)}
      </span>
      {/* content */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between bg-gradient-to-t from-black/58 via-transparent to-black/20 p-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70"
          style={{ color: theme.ink }}
        >
          Aryan Culture
        </span>
        <div className="space-y-1">
          <p
            className="text-pretty text-[13px] font-bold leading-tight line-clamp-4"
            style={{ color: theme.ink, fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className="text-[10px] font-medium opacity-75"
              style={{ color: theme.ink }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cover;
