import React, { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Award,
  Code2,
  Compass,
  Database,
  FileText,
  GraduationCap,
  Mic,
  Trophy,
  Users,
} from 'lucide-react';
import { projectCategories, type ProfileWork } from '@/lib/profiles';

const categoryIcons: Record<string, ReactNode> = {
  paper: <FileText className="h-12 w-12" />,
  dataset: <Database className="h-12 w-12" />,
  software: <Code2 className="h-12 w-12" />,
  grant: <Award className="h-12 w-12" />,
  talk: <Mic className="h-12 w-12" />,
  workshop: <GraduationCap className="h-12 w-12" />,
  collaboration: <Users className="h-12 w-12" />,
  fieldwork: <Compass className="h-12 w-12" />,
  award: <Trophy className="h-12 w-12" />,
  other: <Asterisk className="h-12 w-12" />,
};

const categoryLabels = projectCategories.reduce<Record<string, string>>((acc, c) => {
  acc[c.value] = c.label;
  return acc;
}, {});

export const ProjectTile = ({ work }: { work: ProfileWork }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const images = useMemo(() => {
    const list = (work.images ?? [])
      .map((image) => image.trim())
      .filter(Boolean)
      .filter((image) => !failedImages.includes(image));
    if (list.length > 0) return list;
    if (work.cover_url?.trim() && !failedImages.includes(work.cover_url.trim())) {
      return [work.cover_url.trim()];
    }
    return [];
  }, [failedImages, work.cover_url, work.images]);

  const category = work.category ?? 'other';
  const categoryLabel = categoryLabels[category] ?? 'Other';
  const categoryIcon = categoryIcons[category] ?? <Asterisk className="h-12 w-12" />;

  let projectDates = '';
  if (work.start_year && work.end_year) projectDates = `${work.start_year}–${work.end_year}`;
  else if (work.start_year) projectDates = `${work.start_year}–present`;

  const displayImageIndex = Math.min(currentImageIndex, Math.max(images.length - 1, 0));
  const onImageError = (image: string) =>
    setFailedImages((current) => (current.includes(image) ? current : [...current, image]));

  return (
    <div className="group/row relative mb-5 overflow-hidden rounded-lg border border-zinc-100">
      <div className="flex flex-1 flex-col-reverse sm:flex-row">
        <div className="z-10 flex flex-1 flex-col gap-2 p-6 sm:border-r sm:pr-0">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-2 sm:mb-6">
              <p className="-mb-1 text-xs leading-[22.4px] font-medium tracking-wider text-zinc-500 uppercase">
                {categoryLabel}
                {projectDates ? ` · ${projectDates}` : ''}
              </p>
              <p className="line-clamp-2 w-11/12 text-lg leading-tight text-zinc-950 sm:line-clamp-1">
                {work.title}
              </p>
              <p className="max-w-[290px] text-base leading-[1.5] text-zinc-500">
                {work.description && work.description.length > 150
                  ? `${work.description.substring(0, 150)}...`
                  : work.description}
              </p>
            </div>
            {work.link ? (
              <a href={work.link} target="_blank" rel="noopener noreferrer">
                <button
                  type="button"
                  className="mt-4 inline-flex h-8 w-max items-center gap-1.5 rounded-full border border-black/10 px-3 text-sm font-medium text-black/80 transition hover:bg-black/[0.04] sm:mt-auto"
                >
                  View
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </a>
            ) : null}
          </div>
        </div>

        <div
          className={`relative flex h-[200px] w-full min-w-[335px] justify-center overflow-hidden pt-6 sm:h-[188px] sm:w-[335px] sm:max-w-[335px] sm:py-6 ${
            images.length > 0 ? 'items-center' : 'items-stretch'
          }`}
        >
          {images.length > 0 ? (
            <div className="flex w-full flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={images[displayImageIndex]}
                src={images[displayImageIndex]}
                alt={`Image ${displayImageIndex + 1} of ${work.title}`}
                className="mx-6 h-[188px] w-auto max-w-[calc(100%-3rem)] rounded-lg object-contain sm:mx-auto sm:max-w-full"
                loading="lazy"
                onError={() => {
                  const failedImage = images[displayImageIndex];
                  if (failedImage) onImageError(failedImage);
                }}
              />

              {images.length > 1 ? (
                <div className="mt-2 flex items-center justify-between px-6 sm:mt-5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        displayImageIndex === 0 ? 'opacity-50' : 'cursor-pointer'
                      }`}
                      onClick={() => displayImageIndex > 0 && setCurrentImageIndex((p) => p - 1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        displayImageIndex === images.length - 1 ? 'opacity-50' : 'cursor-pointer'
                      }`}
                      onClick={() =>
                        displayImageIndex < images.length - 1 && setCurrentImageIndex((p) => p + 1)
                      }
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="z-10 flex items-center justify-center gap-2">
                    {images.map((_, index) => (
                      <button
                        key={`${work.id}-dot-${index}`}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-2 w-2 rounded-full ${
                          displayImageIndex === index ? 'bg-black' : 'bg-[#C4C4C4]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="relative z-10 flex h-20 w-20 rotate-2 items-center justify-center rounded-lg border bg-white text-zinc-500">
                {categoryIcon}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTile;
