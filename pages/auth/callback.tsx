import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';

import { AuthAlert, AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSafeRedirectPath } from '@/lib/auth/paths';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

const AuthCallbackPage: NextPage = () => {
  const router = useRouter();
  const { configured, configError, refreshSession } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const finishAuth = async () => {
      if (!configured) {
        setError(configError ?? 'Supabase Auth is not configured.');
        return;
      }

      const nextPath = getSafeRedirectPath(router.query.next);
      const providerError =
        typeof router.query.error_description === 'string'
          ? router.query.error_description
          : typeof router.query.error === 'string'
            ? router.query.error
            : '';

      if (providerError) {
        void router.replace(
          `/login?error=${encodeURIComponent(providerError)}`,
        );
        return;
      }

      const code = typeof router.query.code === 'string' ? router.query.code : '';
      const supabase = getSupabaseBrowserClient();

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          void router.replace(
            `/login?error=${encodeURIComponent(exchangeError.message)}`,
          );
          return;
        }
      }

      await refreshSession();
      void router.replace(nextPath);
    };

    void finishAuth();
  }, [
    configError,
    configured,
    refreshSession,
    router,
    router.isReady,
    router.query.code,
    router.query.error,
    router.query.error_description,
    router.query.next,
  ]);

  return (
    <AuthShell
      title="Completing sign in"
      subtitle="Hold on while we finish the secure authentication flow."
    >
      {error ? (
        <AuthAlert tone="error">{error}</AuthAlert>
      ) : (
        <AuthAlert tone="info">Checking your authentication link...</AuthAlert>
      )}
    </AuthShell>
  );
};

export default AuthCallbackPage;
