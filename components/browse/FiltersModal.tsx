import React, { useEffect, useMemo, useState } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import type { Author, Tag, SortOption } from '@/types';

export interface FilterState {
  magazine?: string;
  language?: string;
  yearStart?: number;
  yearEnd?: number;
  tags: number[];
  authors: number[];
  sort: SortOption;
}

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onClear?: () => void;
  tags: Tag[];
  authors: Author[];
  initialFilters: FilterState;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const DEFAULT_FILTERS: FilterState = {
  magazine: '',
  language: '',
  yearStart: undefined,
  yearEnd: undefined,
  tags: [],
  authors: [],
  sort: 'title_asc',
};

function mergeFilters(base: FilterState, overrides: Partial<FilterState>): FilterState {
  return {
    ...base,
    ...overrides,
    tags: overrides.tags ?? base.tags ?? [],
    authors: overrides.authors ?? base.authors ?? [],
  };
}

type FilterBy = 'tags' | 'authors';

export const FiltersModal: React.FC<FiltersModalProps> = ({
  open,
  onClose,
  onApply,
  onClear,
  tags,
  authors,
  initialFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(
    mergeFilters(DEFAULT_FILTERS, initialFilters)
  );

  // Decide initial mode from provided filters: prefer authors if present
  const initialMode: FilterBy =
    (initialFilters.authors?.length ?? 0) > 0 ? 'authors' : 'tags';

  const [filterBy, setFilterBy] = useState<FilterBy>(initialMode);

  useEffect(() => {
    setLocalFilters(mergeFilters(DEFAULT_FILTERS, initialFilters));
    setFilterBy((initialFilters.authors?.length ?? 0) > 0 ? 'authors' : 'tags');
  }, [initialFilters]);

  const selectedTagSet = useMemo(
    () => new Set(localFilters.tags ?? []),
    [localFilters.tags]
  );

  const selectedAuthorSet = useMemo(
    () => new Set(localFilters.authors ?? []),
    [localFilters.authors]
  );

  if (!open) return null;

  const handleCheckboxToggle = (id: number, collection: 'tags' | 'authors') => {
    // guard against toggling the inactive collection
    if (collection !== filterBy) return;

    setLocalFilters((current) => {
      const set = new Set(collection === 'tags' ? current.tags : current.authors);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return {
        ...current,
        [collection]: Array.from(set),
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // sanitize: only keep the active collection
    const sanitized: FilterState =
      filterBy === 'tags'
        ? { ...localFilters, authors: [] }
        : { ...localFilters, tags: [] };

    onApply(sanitized);
    onClose();
  };

  const handleClear = () => {
    // keep current sort, reset everything else, and reset to tags mode
    const reset = mergeFilters(DEFAULT_FILTERS, { sort: localFilters.sort });
    setLocalFilters(reset);
    setFilterBy('tags');
    onClear?.();
  };

  const switchMode = (mode: FilterBy) => {
    if (mode === filterBy) return;
    setFilterBy(mode);
    // clear the other collection immediately for clarity
    setLocalFilters((prev) =>
      mode === 'tags' ? { ...prev, authors: [] } : { ...prev, tags: [] }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Refine Results</h2>
                <p className="text-sm text-slate-500">
                  Filter and sort summaries to find the perfect match.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-3">
            {/* General */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">General</h3>

              <label className="block text-sm">
                <span className="text-xs font-medium uppercase text-slate-400">Magazine</span>
                <input
                  type="text"
                  value={localFilters.magazine ?? ''}
                  onChange={(event) =>
                    setLocalFilters((prev) => ({ ...prev, magazine: event.target.value }))
                  }
                  placeholder="e.g. Jain Journal"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm">
                <span className="text-xs font-medium uppercase text-slate-400">Language</span>
                <input
                  type="text"
                  value={localFilters.language ?? ''}
                  onChange={(event) =>
                    setLocalFilters((prev) => ({ ...prev, language: event.target.value }))
                  }
                  placeholder="e.g. English"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Year From</span>
                  <input
                    type="number"
                    value={localFilters.yearStart ?? ''}
                    onChange={(event) =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        yearStart: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 1990"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Year To</span>
                  <input
                    type="number"
                    value={localFilters.yearEnd ?? ''}
                    onChange={(event) =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        yearEnd: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 2020"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-xs font-medium uppercase text-slate-400">Sort by</span>
                <select
                  value={localFilters.sort}
                  onChange={(event) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      sort: event.target.value as SortOption,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Mode Switch + Active Panel */}
            <div className="space-y-4 lg:col-span-2">
              {/* Segmented control */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Filter By
                </h3>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode('tags')}
                    className={`px-4 py-1.5 text-sm rounded-lg transition ${
                      filterBy === 'tags'
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Tags
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('authors')}
                    className={`px-4 py-1.5 text-sm rounded-lg transition ${
                      filterBy === 'authors'
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Authors
                  </button>
                </div>
              </div>

              {/* TAGS PANEL */}
              {filterBy === 'tags' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Tags
                    </h4>
                    <span className="text-xs text-slate-400">
                      {selectedTagSet.size} selected
                    </span>
                  </div>
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                    {tags.map((tag) => {
                      const selected = selectedTagSet.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleCheckboxToggle(tag.id, 'tags')}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                            selected
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{tag.name}</span>
                          {selected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                    {tags.length === 0 && (
                      <p className="text-sm text-slate-400">No tags available.</p>
                    )}
                  </div>
                </div>
              )}

              {/* AUTHORS PANEL */}
              {filterBy === 'authors' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Authors
                    </h4>
                    <span className="text-xs text-slate-400">
                      {selectedAuthorSet.size} selected
                    </span>
                  </div>
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                    {authors.map((author) => {
                      const selected = selectedAuthorSet.has(author.id);
                      return (
                        <button
                          key={author.id}
                          type="button"
                          onClick={() => handleCheckboxToggle(author.id, 'authors')}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                            selected
                              ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{author.name}</span>
                          {selected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                    {authors.length === 0 && (
                      <p className="text-sm text-slate-400">No authors available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Clear filters
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiltersModal;
