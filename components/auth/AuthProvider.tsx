import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import {
  getSupabaseAuthConfigError,
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from '@/lib/supabase/auth-client';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  configError: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseAuthConfigured();
  const configError = getSupabaseAuthConfigError();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  const refreshSession = useCallback(async () => {
    if (!configured) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();

    setSession(nextSession);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setSession(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) {
      return { error: configError ?? 'Supabase Auth is not configured.' };
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }

    setSession(null);
    return { error: null };
  }, [configError, configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured,
      configError,
      refreshSession,
      signOut,
    }),
    [
      session,
      loading,
      configured,
      configError,
      refreshSession,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
