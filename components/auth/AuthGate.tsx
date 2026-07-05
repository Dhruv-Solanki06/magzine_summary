'use client';

// components/auth/AuthGate.tsx
// Central gate for account-only features. `requireAuth(action)` returns true when
// the visitor is signed in; otherwise it shows a toast + the login/signup modal
// and returns false, so callers can bail out before hitting the DB (protects
// egress from anonymous filtering/searching).

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/common/Toast';
import AuthRequiredModal from '@/components/auth/AuthRequiredModal';

interface AuthGateContextValue {
  /** Returns true if signed in; else opens the modal + toast and returns false. */
  requireAuth: (action?: string) => boolean;
  promptAuth: (action?: string) => void;
}

const AuthGateContext = createContext<AuthGateContextValue>({
  requireAuth: () => true,
  promptAuth: () => {},
});

export function useAuthGate(): AuthGateContextValue {
  return useContext(AuthGateContext);
}

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modal, setModal] = useState<{ open: boolean; action: string }>({
    open: false,
    action: '',
  });

  const promptAuth = useCallback(
    (action = 'use this feature') => {
      setModal({ open: true, action });
      toast(`Log in or sign up to ${action}.`, 'info');
    },
    [toast],
  );

  const requireAuth = useCallback(
    (action = 'use this feature') => {
      if (user) return true;
      promptAuth(action);
      return false;
    },
    [promptAuth, user],
  );

  const value = useMemo<AuthGateContextValue>(
    () => ({ requireAuth, promptAuth }),
    [requireAuth, promptAuth],
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthRequiredModal
        open={modal.open}
        action={modal.action}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </AuthGateContext.Provider>
  );
}

export default AuthGateProvider;
