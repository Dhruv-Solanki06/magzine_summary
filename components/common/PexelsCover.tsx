// components/common/PexelsCover.tsx
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { fetchPexelsImage } from '@/lib/pexels';
import Cover from './Cover';

interface PexelsCoverProps {
  /** Search query used to pull a relevant Pexels photo. */
  query: string;
  /** Alt text / accessible label. */
  alt: string;
  /** Fallback (generated) cover props, used while loading or if no photo. */
  seed: string | number;
  title: string;
  subtitle?: string;
  className?: string;
  rounded?: string;
}

/**
 * A cover backed by a dynamically-fetched Pexels image. Falls back to the
 * generated <Cover> while the request is in flight or when no photo is found,
 * so a card is never blank.
 */
export const PexelsCover: React.FC<PexelsCoverProps> = ({
  query,
  alt,
  seed,
  title,
  subtitle,
  className,
  rounded = 'rounded-lg',
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setLoaded(false);
    fetchPexelsImage(query).then((result) => {
      if (active) setUrl(result);
    });
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div className={clsx('relative h-full w-full overflow-hidden', rounded, className)}>
      {/* generated fallback always rendered underneath */}
      <div className="absolute inset-0">
        <Cover seed={seed} title={title} subtitle={subtitle} rounded={rounded} />
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={clsx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
            rounded,
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
};

export default PexelsCover;
