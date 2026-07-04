import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Chrome, LogIn, Mail, Lock } from 'lucide-react';

import {
  AuthAlert,
  AuthLink,
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from '@/components/auth/AuthShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAbsoluteAuthUrl, getSafeRedirectPath } from '@/lib/auth/paths';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { user, loading, configured, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nextPath = useMemo(
    () => getSafeRedirectPath(router.query.next),
    [router.query.next],
  );

  useEffect(() => {
    if (!loading && user) {
      void router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  const queryError =
    typeof router.query.error === 'string' ? router.query.error : '';
  const wasReset =
    typeof router.query.reset === 'string' && router.query.reset === 'success';

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    void router.replace(nextPath);
  };

  const handleGoogleLogin = async () => {
    setError('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    setSubmitting(true);
    const redirectTo = getAbsoluteAuthUrl(
      `/auth/callback?next=${encodeURIComponent(nextPath)}`,
    );
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (oauthError) {
      setSubmitting(false);
      setError(oauthError.message);
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Use your email and password or continue with Google."
      footer={
        <>
          New here? <AuthLink href="/signup">Create an account</AuthLink>
        </>
      }
    >
      {queryError && <AuthAlert tone="error">{queryError}</AuthAlert>}
      {wasReset && (
        <AuthAlert tone="success">
          Your password was updated. Log in with the new password.
        </AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {!configured && configError && (
        <AuthAlert tone="info">{configError}</AuthAlert>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Mail className="h-4 w-4" />
            Email
          </span>
          <input
            className={authInputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Lock className="h-4 w-4" />
            Password
          </span>
          <input
            className={authInputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <div className="text-right text-sm">
          <AuthLink href="/forgot-password">Forgot password?</AuthLink>
        </div>

        <button
          className={authPrimaryButtonClass}
          type="submit"
          disabled={submitting || !configured}
        >
          <LogIn className="h-4 w-4" />
          Log in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        className={authSecondaryButtonClass}
        type="button"
        onClick={handleGoogleLogin}
        disabled={submitting || !configured}
      >
        <Chrome className="h-4 w-4" />
        Continue with Google
      </button>
    </AuthShell>
  );
};

export default LoginPage;
