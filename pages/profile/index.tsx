'use client';

import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';

import Header from '@/components/common/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';
import { SITE_NAME } from '@/lib/brand';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!configured || !user) {
      void router.replace('/login?next=/profile');
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      const username = (data as { username: string | null } | null)?.username;
      // No profile / unclaimed username yet → send them to the editor to set one up.
      void router.replace(username ? `/profile/${username}` : '/profile/edit');
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, loading, router, user]);

  return (
    <>
      <Head>
        <title>{`Profile | ${SITE_NAME}`}</title>
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto flex max-w-[670px] items-center justify-center px-5 pt-24">
          <Loader2 className="h-6 w-6 animate-spin text-black/40" />
        </main>
      </div>
    </>
  );
}
