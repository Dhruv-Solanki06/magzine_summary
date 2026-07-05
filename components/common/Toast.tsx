'use client';

// components/common/Toast.tsx — tiny dependency-free toast system.
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Info, CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastTone = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const toneStyles: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  info: { icon: <Info className="h-[18px] w-[18px] text-black/60" />, ring: 'ring-black/10' },
  success: { icon: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" />, ring: 'ring-emerald-200' },
  error: { icon: <AlertCircle className="h-[18px] w-[18px] text-rose-600" />, ring: 'ring-rose-200' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++counter.current;
      setToasts((current) => {
        // Avoid stacking duplicate messages.
        if (current.some((t) => t.message === message)) return current;
        return [...current, { id, message, tone }];
      });
      window.setTimeout(() => remove(id), 3800);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 shadow-[var(--shadow-pop)] ring-1 ${toneStyles[t.tone].ring}`}
          >
            <span className="mt-0.5 shrink-0">{toneStyles[t.tone].icon}</span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-5 text-black/80">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-black/35 transition hover:bg-black/[0.05] hover:text-black/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
