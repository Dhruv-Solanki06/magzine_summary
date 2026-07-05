import React, { useState } from 'react';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { ProfileWork } from '@/lib/profiles';

const WorkTileInner = ({ work }: { work: ProfileWork }) => {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = work.cover_url && !coverFailed;

  return (
    <div
      className={`group/row relative flex min-h-[112px] items-start gap-4 border-t border-zinc-100 py-4 sm:items-center ${
        work.link ? 'cursor-pointer hover:bg-zinc-50' : ''
      }`}
    >
      {work.link ? (
        <div className="pointer-events-none absolute top-0 right-[-16px] bottom-0 left-[-16px] rounded-lg bg-transparent group-hover/row:bg-zinc-50" />
      ) : null}

      <div className="z-10 flex h-[80px] w-[80px] min-w-[80px] items-center justify-center">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.cover_url as string}
            alt={work.title}
            className="h-10 w-10 rounded-full object-cover transition-all duration-100 group-hover/row:h-[46px] group-hover/row:w-[46px]"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition-all duration-100 group-hover/row:h-[46px] group-hover/row:w-[46px]">
            <FileText className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="z-10 flex flex-1 flex-col gap-3 tracking-[-0.01em]">
        <p className="line-clamp-2 w-11/12 text-sm leading-tight text-zinc-950 sm:line-clamp-1">
          {work.title}
        </p>

        {work.venue || work.year ? (
          <p className="-mt-1 text-sm leading-tight text-zinc-500 sm:leading-none">
            <span>{work.venue}</span>
            {work.venue && work.year ? <span>, </span> : null}
            {work.year ? <span>{work.year}</span> : null}
          </p>
        ) : null}

        {work.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {work.tags.map((tag) => (
              <span
                key={`${work.id}-${tag}`}
                className="inline-flex h-5 items-center rounded px-2 text-[10px] leading-none tracking-wider text-zinc-500 uppercase [box-shadow:0px_0px_2px_0px_#00000040]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {work.link ? (
        <div className="absolute top-5 right-0 z-10 hidden h-6 w-6 items-center group-hover/row:flex">
          <ArrowUpRight className="h-4 w-4 text-zinc-900" />
        </div>
      ) : null}
    </div>
  );
};

export const WorkTile = ({ work }: { work: ProfileWork }) => {
  if (work.link) {
    return (
      <a
        className="block w-full"
        href={work.link}
        target="_blank"
        rel="noopener noreferrer"
        title="View publication"
      >
        <WorkTileInner work={work} />
      </a>
    );
  }
  return <WorkTileInner work={work} />;
};

export default WorkTile;
