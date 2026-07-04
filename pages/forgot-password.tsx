import React, { FormEvent, useState } from 'react';
import type { NextPage } from 'next';
import { KeyRound, Mail } from 'lucide-react';

import {
  AuthAlert,
  AuthLink,
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAbsoluteAuthUrl } from '@/lib/auth/paths';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

const ForgotPasswordPage: NextPage = () => {
  const { configured, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!configured) {
      setError(configError ?? 'Supabase Auth is not configured.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: getAbsoluteAuthUrl(
          '/auth/callback?next=/reset-password',
        ),
      },
    );
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess('If an account exists for that email, a reset link has been sent.');
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we will send a password reset link."
      footer={
        <>
          Remembered it? <AuthLink href="/login">Back to login</AuthLink>
        </>
      }
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}
      {!configured && configError && (
        <AuthAlert tone="info">{configError}</AuthAlert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          className={authPrimaryButtonClass}
          type="submit"
          disabled={submitting || !configured}
        >
          <KeyRound className="h-4 w-4" />
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
