// components/browse/FilterDropdown.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

interface FilterDropdownProps {
  label: string;
  /** When set, the pill shows the selection instead of the label + a clear (×). */
  selectedLabel?: string | null;
  /** Number badge for multi-select pills (≥2). */
  count?: number;
  onClear?: () => void;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  menuClassName?: string;
  plain?: boolean;
}

/**
 * A filter pill that opens the signature "dark-glass" popover menu.
 * The trigger mirrors the chill-subs browse controls: h-11 rounded-lg,
 * black/10 border, rotating chevron, selection shown inline with a clear ×.
 */
export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  selectedLabel,
  count,
  onClear,
  children,
  align = 'left',
  menuClassName,
  plain = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const hasSelection = Boolean(selectedLabel);

  return (
    <div ref={ref} className="relative">
      <div
        className={clsx(
          'inline-flex h-11 items-center rounded-lg text-sm font-medium transition-colors',
          plain
            ? 'gap-1.5 text-black/54 hover:text-black/80'
            : 'gap-2 border bg-white px-3.5',
          !plain &&
            (hasSelection || (count ?? 0) > 0
              ? 'border-black/20 text-black/80'
              : 'border-black/10 text-black/54 hover:border-black/20 hover:text-black/80'),
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 focus-managed"
          aria-expanded={open}
        >
          {hasSelection ? (
            <span className="max-w-[180px] truncate text-black/85">{selectedLabel}</span>
          ) : (
            <span>{label}</span>
          )}
          {(count ?? 0) > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/80 px-1 text-[10px] font-semibold tabular-nums text-white">
              {count}
            </span>
          )}
          <ChevronDown
            className={clsx(
              'h-4 w-4 text-black/40 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {hasSelection && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="-mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-black/40 hover:bg-black/[0.06] hover:text-black/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={clsx(
            'absolute z-30 mt-2 min-w-[240px] rounded-xl border border-white/10 bg-[#111111]/95 p-1.5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-md animate-pop-in',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/** A single-select option row inside the dark menu. */
export const MenuOption: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}> = ({ active, onClick, children, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-[15px] transition-colors',
      active ? 'bg-white/10 text-white' : 'text-white/85 hover:bg-white/[0.06]',
    )}
  >
    <span className="truncate text-left">{children}</span>
    {count !== undefined && (
      <span className="shrink-0 text-xs tabular-nums text-white/45">{count}</span>
    )}
  </button>
);

/** A footer "clear selection" row. */
export const MenuClear: React.FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = 'Clear selection',
}) => (
  <div className="mt-1 border-t border-white/10 pt-1">
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90"
    >
      {label}
    </button>
  </div>
);

export default FilterDropdown;
