import React, { FormEvent, useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { KeyRound, Lock } from 'lucide-react';

import {
  AuthAlert,
  AuthLink,
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

const ResetPasswordPage: NextPage = () => {
  const router = useRouter();
  const { configured, configError, user, loading, refreshSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const prepareRecoverySession = async () => {
      setCheckingLink(true);

      if (!configured) {
        setError(configError ?? 'Supabase Auth is not configured.');
        setCheckingLink(false);
        return;
      }

      const code = typeof router.query.code === 'string' ? router.query.code : '';
      const supabase = getSupabaseBrowserClient();

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          setCheckingLink(false);
          return;
        }

        await refreshSession();
        void router.replace('/reset-password', undefined, { shallow: true });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Open this page from the latest password reset email.');
      }

      setCheckingLink(false);
    };

    void prepareRecoverySession();
  }, [
    configError,
    configured,
    refreshSession,
    router,
    router.isReady,
    router.query.code,
  ]);

  const canSubmit = configured && !checkingLink && (user || !loading);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setSubmitting(false);
    setSuccess('Password updated. Redirecting to login...');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      void router.replace('/login?reset=success');
    }, 900);
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Set a new password for your account."
      footer={
        <>
          Need another link? <AuthLink href="/forgot-password">Request reset</AuthLink>
        </>
      }
    >
      {checkingLink && (
        <AuthAlert tone="info">Checking your reset link...</AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}
      {!configured && configError && (
        <AuthAlert tone="info">{configError}</AuthAlert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Lock className="h-4 w-4" />
            New password
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
            Confirm new password
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
          disabled={submitting || !canSubmit}
        >
          <KeyRound className="h-4 w-4" />
          Update password
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
