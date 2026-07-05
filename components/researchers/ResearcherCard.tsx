import React, { useState, type SVGProps } from 'react';
import Link from 'next/link';
import type { ResearcherCardData } from '@/lib/profiles';

const MarkerPinIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 12 14.6667" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M0 6C0 2.68629 2.68629 0 6 0C9.31371 0 12 2.68629 12 6C12 8.07939 10.8374 9.57699 9.64757 10.8163C9.36047 11.1153 9.06433 11.4065 8.77808 11.6881L8.74092 11.7246C8.44051 12.0201 8.15159 12.305 7.87943 12.5918C7.33233 13.1684 6.88561 13.7195 6.59629 14.2981C6.48336 14.524 6.25251 14.6667 6 14.6667C5.74749 14.6667 5.51664 14.524 5.40372 14.2981C5.11439 13.7195 4.66767 13.1684 4.12057 12.5918C3.84841 12.305 3.55949 12.0201 3.25908 11.7246L3.22187 11.688C2.93562 11.4065 2.63954 11.1153 2.35243 10.8163C1.16258 9.57699 0 8.07939 0 6ZM8 5.66667C8 6.77124 7.10457 7.66667 6 7.66667C4.89543 7.66667 4 6.77124 4 5.66667C4 4.5621 4.89543 3.66667 6 3.66667C7.10457 3.66667 8 4.5621 8 5.66667Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const LayoutAltIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 13.3333 13.3333" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4 1.06667C4 0.693299 4 0.506615 3.92734 0.364007C3.86342 0.238565 3.76144 0.136578 3.63599 0.0726629C3.49339 5.36442e-07 3.3067 5.36564e-07 2.93333 5.36564e-07H2.77431C2.42288 -1.08682e-05 2.11969 -2.07064e-05 1.86998 0.0203813C1.60642 0.0419153 1.34427 0.0894593 1.09202 0.217989C0.715697 0.409735 0.409735 0.715697 0.217989 1.09202C0.0894593 1.34427 0.0419153 1.60642 0.0203813 1.86998C-2.07064e-05 2.11969 -1.08682e-05 2.42286 5.36564e-07 2.77428V10.559C-1.08682e-05 10.9105 -2.07064e-05 11.2136 0.0203813 11.4634C0.0419153 11.7269 0.0894593 11.9891 0.217989 12.2413C0.409735 12.6176 0.715697 12.9236 1.09202 13.1153C1.34427 13.2439 1.60642 13.2914 1.86998 13.313C2.11969 13.3334 2.42286 13.3333 2.77429 13.3333H2.93333C3.3067 13.3333 3.49339 13.3333 3.636 13.2607C3.76144 13.1968 3.86342 13.0948 3.92734 12.9693C4 12.8267 4 12.64 4 12.2667L4 1.06667Z" fill="currentColor" fillOpacity="0.3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M5.33333 12.2667C5.33333 12.64 5.33333 12.8267 5.406 12.9693C5.46991 13.0948 5.5719 13.1968 5.69734 13.2607C5.83995 13.3333 6.02663 13.3333 6.4 13.3333H10.559C10.9105 13.3333 11.2136 13.3334 11.4634 13.313C11.7269 13.2914 11.9891 13.2439 12.2413 13.1153C12.6176 12.9236 12.9236 12.6176 13.1153 12.2413C13.2439 11.9891 13.2914 11.7269 13.313 11.4634C13.3334 11.2136 13.3333 10.9105 13.3333 10.559V2.77429C13.3333 2.42286 13.3334 2.11969 13.313 1.86998C13.2914 1.60642 13.2439 1.34427 13.1153 1.09202C12.9236 0.715697 12.6176 0.409735 12.2413 0.217989C11.9891 0.0894593 11.7269 0.0419153 11.4634 0.0203813C11.2136 -2.07064e-05 10.9105 -1.08682e-05 10.5591 5.36564e-07H6.4C6.02663 5.36564e-07 5.83995 5.36442e-07 5.69734 0.0726629C5.5719 0.136578 5.46991 0.238565 5.406 0.364007C5.33333 0.506615 5.33333 0.693299 5.33333 1.06667L5.33333 12.2667ZM6.66667 3.33333C6.66667 2.96514 6.96514 2.66667 7.33333 2.66667H11.3333C11.7015 2.66667 12 2.96514 12 3.33333C12 3.70152 11.7015 4 11.3333 4H7.33333C6.96514 4 6.66667 3.70152 6.66667 3.33333ZM7.33333 5.33333C6.96514 5.33333 6.66667 5.63181 6.66667 6C6.66667 6.36819 6.96514 6.66667 7.33333 6.66667H11.3333C11.7015 6.66667 12 6.36819 12 6C12 5.63181 11.7015 5.33333 11.3333 5.33333H7.33333ZM7.33333 8C6.96514 8 6.66667 8.29848 6.66667 8.66667C6.66667 9.03486 6.96514 9.33333 7.33333 9.33333H11.3333C11.7015 9.33333 12 9.03486 12 8.66667C12 8.29848 11.7015 8 11.3333 8H7.33333Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 14.6667 13.3333" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M5.31378e-07 2.77445C-1.07997e-05 2.42303 -2.05735e-05 2.11983 0.0203814 1.87012C0.0419154 1.60656 0.0894594 1.34442 0.217989 1.09216C0.409735 0.715838 0.715697 0.409877 1.09202 0.21813C1.34427 0.0896011 1.60642 0.0420572 1.86998 0.0205232C2.1197 0.000120694 2.42287 0.000130979 2.7743 0.0001429L5.43111 7.08973e-05C5.82681 -0.000451637 6.1748 -0.000911226 6.49477 0.109453C6.77502 0.206118 7.03027 0.363874 7.24206 0.571307C7.48387 0.808139 7.63908 1.11959 7.81558 1.47376L8.41195 2.66667H10.8275C11.3642 2.66666 11.8071 2.66665 12.1679 2.69613C12.5426 2.72675 12.8871 2.79246 13.2106 2.95732C13.7124 3.21298 14.1204 3.62093 14.376 4.12269C14.5409 4.44625 14.6066 4.79072 14.6372 5.16545C14.6667 5.52624 14.6667 5.96915 14.6667 6.50578V9.49422C14.6667 10.0309 14.6667 10.4738 14.6372 10.8346C14.6066 11.2093 14.5409 11.5538 14.376 11.8773C14.1204 12.3791 13.7124 12.787 13.2106 13.0427C12.8871 13.2075 12.5426 13.2733 12.1679 13.3039C11.8071 13.3333 11.3642 13.3333 10.8275 13.3333H3.83915C3.3025 13.3333 2.85958 13.3333 2.49878 13.3039C2.12405 13.2733 1.77958 13.2075 1.45603 13.0427C0.954261 12.787 0.546313 12.3791 0.29065 11.8773C0.12579 11.5538 0.0600804 11.2093 0.0294636 10.8346C-1.44343e-05 10.4738 -7.66777e-06 10.0309 5.31378e-07 9.49421V2.77445ZM5.3482 1.33348C5.87514 1.33348 5.97959 1.34218 6.06 1.36991C6.15342 1.40213 6.23851 1.45472 6.3091 1.52386C6.36988 1.58339 6.42437 1.67292 6.66002 2.14423L6.92124 2.66667L1.33338 2.66667C1.33368 2.35668 1.33572 2.14477 1.34929 1.9787C1.36408 1.79759 1.3892 1.73045 1.406 1.69748C1.46991 1.57204 1.5719 1.47005 1.69734 1.40614C1.7303 1.38934 1.79745 1.36423 1.97856 1.34943C2.16745 1.334 2.41563 1.33348 2.8 1.33348H5.3482Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="10" height="10" viewBox="0 0 6.66667 11.6667" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M0.244078 0.244078C0.569515 -0.0813592 1.09715 -0.0813592 1.42259 0.244078L6.42259 5.24408C6.74803 5.56951 6.74803 6.09715 6.42259 6.42259L1.42259 11.4226C1.09715 11.748 0.569515 11.748 0.244078 11.4226C-0.0813592 11.0972 -0.0813592 10.5695 0.244078 10.2441L4.65482 5.83333L0.244078 1.42259C-0.0813592 1.09715 -0.0813592 0.569515 0.244078 0.244078Z" fill="currentColor" fillOpacity="0.5" />
  </svg>
);

const WindIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 14.0005 11.3319" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.0003 9.66595C13.0003 9.66595 12.2067 9.35294 11.6669 9.20066C8.25341 8.23755 5.74713 11.0944 2.3336 10.1312C1.79388 9.97896 1.00027 9.66595 1.00027 9.66595M13.0003 5.66595C13.0003 5.66595 12.2067 5.35294 11.6669 5.20066C8.25341 4.23755 5.74713 7.09436 2.3336 6.13124C1.79388 5.97896 1.00027 5.66595 1.00027 5.66595M13.0003 1.66595C13.0003 1.66595 12.2067 1.35294 11.6669 1.20066C8.25341 0.237547 5.74713 3.09436 2.3336 2.13124C1.79388 1.97896 1.00027 1.66595 1.00027 1.66595" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ResearcherCardSkeleton = () => (
  <article className="flex h-[280.47px] flex-col gap-[24px] rounded-[16px] border border-[rgba(0,0,0,0.1)] bg-white p-[25px]">
    <div className="flex flex-1 flex-col items-start gap-[16px] pb-[24px]">
      <div className="h-[72px] w-[72px] animate-pulse rounded-[8px] bg-zinc-100" />
      <div className="flex w-full flex-col gap-[8px]">
        <div className="h-[20px] w-3/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-[18px] w-2/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-[18px] w-1/3 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-[16px]">
        <div className="h-[18px] w-8 animate-pulse rounded bg-zinc-100" />
        <div className="h-[18px] w-8 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="h-[18px] w-14 animate-pulse rounded bg-zinc-100" />
    </div>
  </article>
);

export const ResearcherCard = ({ writer }: { writer: ResearcherCardData }) => {
  const [imageError, setImageError] = useState(false);
  const displayName = writer.display_name || writer.username || 'Anonymous';
  const profileUrl = writer.username ? `/profile/${writer.username}` : '#';

  const location = [writer.city, writer.state, writer.country].filter(Boolean).join(', ');
  const tagline = [writer.pronouns, writer.tagline].filter(Boolean).join(' · ');

  const formatCountLabel = (count: number, noun: string) =>
    `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

  const stats = [
    { icon: LayoutAltIcon, value: writer.publicationCount, label: formatCountLabel(writer.publicationCount, 'Publication') },
    { icon: FolderIcon, value: writer.projectCount, label: formatCountLabel(writer.projectCount, 'Project') },
  ];

  return (
    <Link href={profileUrl} prefetch={false} className="block h-full">
      <article className="group flex h-[280.47px] cursor-pointer flex-col gap-[24px] overflow-visible rounded-[16px] border border-[rgba(0,0,0,0.1)] bg-white p-[25px] transition-shadow duration-200 hover:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex flex-1 flex-col items-start gap-[16px] pb-[24px]">
          <div className="flex h-[74.469px] w-[74.469px] items-center justify-center">
            <div className="-rotate-2">
              <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[8px] bg-neutral-100">
                {writer.avatar_url && !imageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                    src={writer.avatar_url}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-neutral-600">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-start">
            <h3 className="w-full truncate text-[16px] leading-[24px] font-medium tracking-[-0.4px] text-[rgba(0,0,0,0.92)]">
              {displayName}
            </h3>

            <div className="flex h-[24px] w-full items-center gap-[6px] text-[14px] leading-[24px] text-[rgba(0,0,0,0.54)]">
              {tagline ? (
                <>
                  <WindIcon className="h-[16px] w-[16px] text-black" />
                  <span className="truncate">{tagline}</span>
                </>
              ) : null}
            </div>

            <div className="flex h-[24px] w-full items-center gap-[6px] text-[14px] leading-[24px] text-[rgba(0,0,0,0.54)]">
              {location ? (
                <>
                  <MarkerPinIcon className="h-[16px] w-[16px] text-black" />
                  <span className="truncate">{location}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-[16px] text-[14px] leading-[20px] text-[rgba(0,0,0,0.7)]">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={`${index}-${stat.value}`} className="group/metric relative flex items-center gap-[6px] tabular-nums">
                  <Icon className="h-[14px] w-[14px] text-black" />
                  <span>{stat.value.toLocaleString()}</span>
                  <span className="pointer-events-none absolute top-[-34px] left-1/2 z-20 -translate-x-1/2 rounded-[6px] bg-black px-2 py-1 text-[12px] font-bold whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover/metric:opacity-100">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-[6px] text-[14px] leading-[20px] font-medium text-[rgba(0,0,0,0.54)]">
            <span>Profile</span>
            <ChevronRightIcon className="h-[10px] w-[10px] text-black" />
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ResearcherCard;
