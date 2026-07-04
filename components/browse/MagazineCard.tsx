// components/browse/MagazineCard.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { MagazineWithStats } from '@/types';
import { formatCount, truncate } from '@/lib/format';
import Cover from '@/components/common/Cover';

interface MagazineCardProps {
  magazine: MagazineWithStats;
}

export const MagazineCard: React.FC<MagazineCardProps> = ({ magazine }) => {
  const href = magazine.slug
    ? `/magazines/${magazine.slug}`
    : `/?magazineId=${magazine.id}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] hover:ring-black/10"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Cover
          seed={magazine.id}
          title={magazine.name}
          subtitle={magazine.founded_year ? `Est. ${magazine.founded_year}` : undefined}
          imageUrl={magazine.cover_image_url}
          rounded="rounded-none"
        />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#171717]/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <FileText className="h-3 w-3" />
          {formatCount(magazine.recordCount)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-pretty text-[16px] font-semibold leading-snug tracking-[-0.2px] text-[#171717] line-clamp-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {magazine.name}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-black/30 transition-colors group-hover:text-black/60" />
        </div>

        <p className="mt-1.5 text-[13px] leading-[1.5] text-black/54 line-clamp-2">
          {magazine.description
            ? truncate(magazine.description, 120)
            : `${formatCount(magazine.recordCount)} archived articles across the collection.`}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12px] text-black/45">
          {magazine.headquarters && <span>{magazine.headquarters}</span>}
          {magazine.issn_print && <span>ISSN {magazine.issn_print}</span>}
        </div>
      </div>
    </Link>
  );
};

export default MagazineCard;
