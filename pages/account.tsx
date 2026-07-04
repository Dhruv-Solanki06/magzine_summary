import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';

import {
  AuthAlert,
  AuthShell,
  authSecondaryButtonClass,
} from '@/components/auth/AuthShell';
import { useAuth } from '@/components/auth/AuthProvider';

const AccountPage: NextPage = () => {
  const router = useRouter();
  const { user, loading, configured, configError, signOut } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && configured && !user) {
      void router.replace('/login?next=/account');
    }
  }, [configured, loading, router, user]);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) {
      setError(result.error);
      return;
    }

    void router.replace('/login');
  };

  return (
    <AuthShell
      title="Account"
      subtitle="Your app account is stored in Supabase Auth, separate from the backend data users table."
    >
      {!configured && configError && (
        <AuthAlert tone="info">{configError}</AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {loading && <AuthAlert tone="info">Loading your account...</AuthAlert>}

      {user && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-950">User ID</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">
                  {user.id}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-950">Email</p>
                <p className="mt-1 break-all text-sm text-slate-700">
                  {user.email ?? 'No email on this account'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Email verification
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {user.email_confirmed_at
                    ? 'Verified'
                    : 'Pending verification'}
                </p>
              </div>
            </div>
          </div>

          <button
            className={authSecondaryButtonClass}
            type="button"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default AccountPage;
