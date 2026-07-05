'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import {
  deleteWork,
  projectCategories,
  upsertWork,
  type ProfileWork,
  type WorkKind,
} from '@/lib/profiles';
import { uploadFiles, uploadAuthHeaders } from '@/lib/uploadthing';

export type WorkDraft = Partial<ProfileWork> & { kind: WorkKind; _key: string };

interface Props {
  userId: string;
  draft: WorkDraft;
  onSaved: (key: string, work: ProfileWork) => void;
  onRemoved: (key: string) => void;
}

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/85 outline-none placeholder:text-black/35 focus:ring-1 focus:ring-black/25';
const labelClass = 'mb-1 block text-xs font-medium text-black/55';

export const WorkEditorCard = ({ userId, draft, onSaved, onRemoved }: Props) => {
  const isProject = draft.kind === 'project';
  const [title, setTitle] = useState(draft.title ?? '');
  const [venue, setVenue] = useState(draft.venue ?? '');
  const [year, setYear] = useState(draft.year ? String(draft.year) : '');
  const [link, setLink] = useState(draft.link ?? '');
  const [tags, setTags] = useState((draft.tags ?? []).join(', '));
  const [coverUrl, setCoverUrl] = useState(draft.cover_url ?? '');
  const [description, setDescription] = useState(draft.description ?? '');
  const [category, setCategory] = useState(draft.category ?? 'paper');
  const [startYear, setStartYear] = useState(draft.start_year ? String(draft.start_year) : '');
  const [endYear, setEndYear] = useState(draft.end_year ? String(draft.end_year) : '');
  const [images, setImages] = useState<string[]>(draft.images ?? []);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const uploadImages = async (files: File[]) => {
    if (files.length === 0) return;
    setError('');
    setUploading(true);
    try {
      const headers = await uploadAuthHeaders();
      const res = await uploadFiles('workImage', { files, headers });
      const urls = res
        .map((r) => r.serverData?.url ?? r.ufsUrl)
        .filter((u): u is string => Boolean(u));
      if (isProject) setImages((prev) => [...prev, ...urls]);
      else if (urls[0]) setCoverUrl(urls[0]);
    } catch {
      setError('Image upload failed. Try a smaller file.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    setError('');
    setSaving(true);
    const payload: Partial<ProfileWork> & { kind: WorkKind; title: string } = {
      kind: draft.kind,
      title: title.trim(),
      link: link.trim() || null,
    };
    if (draft.id) payload.id = draft.id;
    if (isProject) {
      payload.description = description.trim() || null;
      payload.category = category;
      payload.start_year = startYear ? Number(startYear) : null;
      payload.end_year = endYear ? Number(endYear) : null;
      payload.images = images;
    } else {
      payload.venue = venue.trim() || null;
      payload.year = year ? Number(year) : null;
      payload.cover_url = coverUrl || null;
      payload.tags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const { data, error: saveError } = await upsertWork(userId, payload);
    setSaving(false);
    if (saveError || !data) {
      setError(saveError ?? 'Could not save.');
      return;
    }
    onSaved(draft._key, data);
  };

  const remove = async () => {
    if (draft.id) {
      const { error: delError } = await deleteWork(draft.id);
      if (delError) {
        setError(delError);
        return;
      }
    }
    onRemoved(draft._key);
  };

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          {isProject ? 'Project' : 'Publication'}
        </span>
        <button
          type="button"
          onClick={remove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-rose-500"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3">
        <div>
          <label className={labelClass}>Title *</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {isProject ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {projectCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>From</label>
                  <input
                    className={inputClass}
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    inputMode="numeric"
                    placeholder="2022"
                  />
                </div>
                <div>
                  <label className={labelClass}>To</label>
                  <input
                    className={inputClass}
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    inputMode="numeric"
                    placeholder="2024"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Venue / journal</label>
              <input className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input
                className={inputClass}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                placeholder="2023"
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Link</label>
          <input
            className={inputClass}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {!isProject ? (
          <div>
            <label className={labelClass}>Tags (comma separated)</label>
            <input
              className={inputClass}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="machine learning, NLP"
            />
          </div>
        ) : null}

        {/* Images */}
        <div>
          <label className={labelClass}>{isProject ? 'Images' : 'Cover image'}</label>
          <div className="flex flex-wrap items-center gap-2">
            {isProject
              ? images.map((url) => (
                  <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                      className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              : coverUrl && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-black/20 text-black/40 transition hover:border-black/40 hover:text-black/60 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple={isProject}
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                void uploadImages(files);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save {isProject ? 'project' : 'publication'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkEditorCard;
