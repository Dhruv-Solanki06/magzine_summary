'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LogIn, Lock, UserPlus, X } from 'lucide-react';

interface AuthRequiredModalProps {
  open: boolean;
  /** Short reason shown in the modal, e.g. "bookmark articles". */
  action?: string;
  onClose: () => void;
}

/**
 * Lightweight "please sign in" gate shown when a signed-out visitor tries to
 * use an account-only feature (bookmarks, following authors). Routes to
 * /login or /signup, preserving the current path as `?next=` so the user
 * returns here afterwards.
 */
const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ open, action, onClose }) => {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const next = encodeURIComponent(router.asPath || '/');
  const go = (path: string) => {
    onClose();
    void router.push(`${path}?next=${next}`);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
      onClick={onClose}
    >
      <div
        className="animate-pop-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-[var(--shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.05] text-black/60">
            <Lock className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2
          id="auth-required-title"
          className="mt-4 text-[20px] font-bold tracking-[-0.3px] text-black/92"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Log in to {action || 'continue'}
        </h2>
        <p className="mt-1.5 text-[14.5px] leading-6 text-black/55">
          Searching, filtering, bookmarks and following are for members. Create a free
          account or log in — it only takes a moment.
        </p>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => go('/login')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black/85"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
          <button
            type="button"
            onClick={() => go('/signup')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-black/75 transition hover:border-black/20 hover:text-black/90"
          >
            <UserPlus className="h-4 w-4" />
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredModal;
