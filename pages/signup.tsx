import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Chrome, Lock, Mail, UserPlus } from 'lucide-react';

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

const SignupPage: NextPage = () => {
  const router = useRouter();
  const { user, loading, configured, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nextPath = useMemo(
    () => getSafeRedirectPath(router.query.next),
    [router.query.next],
  );

  useEffect(() => {
    if (!loading && user) {
      void router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAbsoluteAuthUrl(
          `/auth/callback?next=${encodeURIComponent(nextPath)}`,
        ),
      },
    });

    setSubmitting(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      void router.replace(nextPath);
      return;
    }

    setSuccess('Check your email to verify your account, then log in.');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogleSignup = async () => {
    setError('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAbsoluteAuthUrl(
          `/auth/callback?next=${encodeURIComponent(nextPath)}`,
        ),
      },
    });

    if (oauthError) {
      setSubmitting(false);
      setError(oauthError.message);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Sign up with email and password, or use Google."
      footer={
        <>
          Already have an account? <AuthLink href="/login">Log in</AuthLink>
        </>
      }
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}
      {!configured && configError && (
        <AuthAlert tone="info">{configError}</AuthAlert>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Lock className="h-4 w-4" />
            Confirm password
          </span>
          <input
            className={authInputClass}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button
          className={authPrimaryButtonClass}
          type="submit"
          disabled={submitting || !configured}
        >
          <UserPlus className="h-4 w-4" />
          Create account
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
        onClick={handleGoogleSignup}
        disabled={submitting || !configured}
      >
        <Chrome className="h-4 w-4" />
        Continue with Google
      </button>
    </AuthShell>
  );
};

export default SignupPage;
