// components/browse/FilterBar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, RotateCcw, Search } from 'lucide-react';
import clsx from 'clsx';
import type { Author, MagazineWithStats, SortOption, Tag } from '@/types';
import type { LanguageFacet } from '@/lib/server/records';
import { FilterDropdown, MenuClear, MenuOption } from './FilterDropdown';

export interface FilterBarValue {
  magazineId?: number;
  language?: string;
  yearStart?: number;
  yearEnd?: number;
  sort: SortOption;
  tagIds: number[];
  authorIds: number[];
}

interface FilterBarProps {
  magazines: MagazineWithStats[];
  languages: LanguageFacet[];
  value: FilterBarValue;
  selectedTags: Tag[];
  selectedAuthors: Author[];
  allowRelevance?: boolean;
  hideMagazine?: boolean;
  onChange: (patch: Partial<FilterBarValue>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  random: 'Surprise me',
  title_asc: 'Title A–Z',
  title_desc: 'Title Z–A',
  newest: 'Newest first',
  oldest: 'Oldest first',
};

/* ------------------------- async typeahead filter ------------------------- */

interface TypeaheadItem {
  id: number;
  name: string;
}

function TypeaheadFilter({
  label,
  endpoint,
  selected,
  onToggle,
  onClearAll,
}: {
  label: string;
  endpoint: 'tags' | 'authors';
  selected: TypeaheadItem[];
  onToggle: (id: number) => void;
  onClearAll: () => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<TypeaheadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/${endpoint}?q=${encodeURIComponent(term)}&limit=25`);
        const json = await res.json();
        setResults((json[endpoint] ?? []) as TypeaheadItem[]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [term, endpoint]);

  const selectedIds = new Set(selected.map((s) => s.id));

  return (
    <FilterDropdown
      label={label}
      count={selected.length}
      onClear={selected.length ? onClearAll : undefined}
      selectedLabel={selected.length === 1 ? selected[0].name : undefined}
      menuClassName="w-80"
    >
      {() => (
        <div>
          <div className="mb-1.5 flex items-center gap-2 rounded-md bg-white/[0.06] px-2.5">
            <Search className="h-4 w-4 text-white/40" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="focus-managed h-9 w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
          </div>

          {selected.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5 border-b border-white/10 px-1 pb-2">
              {selected.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-white/60">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto scrollbar-dark">
            {results.length === 0 && !loading && (
              <p className="px-3 py-4 text-center text-sm text-white/45">No matches.</p>
            )}
            {results.map((item) => {
              const active = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={clsx(
                    'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors',
                    active ? 'bg-white/10 text-white' : 'text-white/85 hover:bg-white/[0.06]',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      active ? 'border-white bg-white' : 'border-white/30',
                    )}
                  >
                    {active && <Check className="h-3 w-3 text-black" />}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && <MenuClear onClick={onClearAll} label="Clear all" />}
        </div>
      )}
    </FilterDropdown>
  );
}

/* ------------------------------ year filter ------------------------------- */

function YearFilter({
  start,
  end,
  onApply,
}: {
  start?: number;
  end?: number;
  onApply: (s?: number, e?: number) => void;
}) {
  const [from, setFrom] = useState(start?.toString() ?? '');
  const [to, setTo] = useState(end?.toString() ?? '');

  useEffect(() => setFrom(start?.toString() ?? ''), [start]);
  useEffect(() => setTo(end?.toString() ?? ''), [end]);

  const selectedLabel =
    start || end ? `${start ?? '…'} – ${end ?? '…'}` : undefined;

  return (
    <FilterDropdown
      label="Years"
      selectedLabel={selectedLabel}
      onClear={start || end ? () => onApply(undefined, undefined) : undefined}
    >
      {(close) => (
        <div className="w-56 p-1.5">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From"
              className="focus-managed h-9 w-full rounded-md bg-white/[0.08] px-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <span className="text-white/40">–</span>
            <input
              type="number"
              inputMode="numeric"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To"
              className="focus-managed h-9 w-full rounded-md bg-white/[0.08] px-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onApply(from ? Number(from) : undefined, to ? Number(to) : undefined);
              close();
            }}
            className="mt-2 h-9 w-full rounded-md bg-white text-sm font-medium text-black transition hover:bg-white/90"
          >
            Apply
          </button>
        </div>
      )}
    </FilterDropdown>
  );
}

/* -------------------------------- main bar -------------------------------- */

export const FilterBar: React.FC<FilterBarProps> = ({
  magazines,
  languages,
  value,
  selectedTags,
  selectedAuthors,
  allowRelevance = false,
  hideMagazine = false,
  onChange,
  onReset,
  hasActiveFilters,
}) => {
  const activeMagazine = magazines.find((m) => m.id === value.magazineId);

  const sortOptions: SortOption[] = [
    ...(allowRelevance ? (['relevance'] as SortOption[]) : []),
    'newest',
    'oldest',
    'title_asc',
    'title_desc',
    'random',
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideMagazine && (
        <FilterDropdown
          label="Magazine"
          selectedLabel={activeMagazine?.name}
          onClear={activeMagazine ? () => onChange({ magazineId: undefined }) : undefined}
          menuClassName="w-72"
        >
          {(close) => (
            <div className="max-h-80 overflow-y-auto scrollbar-dark">
              {magazines.map((m) => (
                <MenuOption
                  key={m.id}
                  active={m.id === value.magazineId}
                  count={m.recordCount}
                  onClick={() => {
                    onChange({ magazineId: m.id === value.magazineId ? undefined : m.id });
                    close();
                  }}
                >
                  {m.name}
                </MenuOption>
              ))}
            </div>
          )}
        </FilterDropdown>
      )}

      <FilterDropdown
        label="Language"
        selectedLabel={value.language ?? undefined}
        onClear={value.language ? () => onChange({ language: undefined }) : undefined}
        menuClassName="w-64"
      >
        {(close) => (
          <div className="max-h-80 overflow-y-auto scrollbar-dark">
            {languages.map((l) => (
              <MenuOption
                key={l.label}
                active={l.label === value.language}
                count={l.count}
                onClick={() => {
                  onChange({ language: l.label === value.language ? undefined : l.label });
                  close();
                }}
              >
                {l.label}
              </MenuOption>
            ))}
          </div>
        )}
      </FilterDropdown>

      <YearFilter
        start={value.yearStart}
        end={value.yearEnd}
        onApply={(s, e) => onChange({ yearStart: s, yearEnd: e })}
      />

      <TypeaheadFilter
        label="Topics"
        endpoint="tags"
        selected={selectedTags.map((t) => ({ id: t.id, name: t.name }))}
        onToggle={(id) => {
          const set = new Set(value.tagIds);
          if (set.has(id)) {
            set.delete(id);
          } else {
            set.add(id);
          }
          onChange({ tagIds: Array.from(set) });
        }}
        onClearAll={() => onChange({ tagIds: [] })}
      />

      <TypeaheadFilter
        label="Authors"
        endpoint="authors"
        selected={selectedAuthors.map((a) => ({ id: a.id, name: a.name }))}
        onToggle={(id) => {
          const set = new Set(value.authorIds);
          if (set.has(id)) {
            set.delete(id);
          } else {
            set.add(id);
          }
          onChange({ authorIds: Array.from(set) });
        }}
        onClearAll={() => onChange({ authorIds: [] })}
      />

      <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-start">
        <FilterDropdown label="Sort" selectedLabel={SORT_LABELS[value.sort]} align="right" plain>
          {(close) => (
            <div>
              {sortOptions.map((s) => (
                <MenuOption
                  key={s}
                  active={s === value.sort}
                  onClick={() => {
                    onChange({ sort: s });
                    close();
                  }}
                >
                  {SORT_LABELS[s]}
                </MenuOption>
              ))}
            </div>
          )}
        </FilterDropdown>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-black/54 transition-colors hover:text-black/80"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export { SORT_LABELS };
export default FilterBar;
