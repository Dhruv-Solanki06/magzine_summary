'use client';

import React, { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { PencilLine } from 'lucide-react';

import Header from '@/components/common/Header';
import ProfileHeader from '@/components/profile/ProfileHeader';
import WorkTile from '@/components/profile/WorkTile';
import ProjectTile from '@/components/profile/ProjectTile';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ProfileWithWorks } from '@/lib/profiles';
import { SITE_NAME } from '@/lib/brand';

interface Props {
  profile: ProfileWithWorks | null;
}

const ProfilePage: NextPage<Props> = ({ profile }) => {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const isMe = Boolean(user && profile && user.id === profile.user_id);

  const publications = useMemo(
    () => (profile?.works ?? []).filter((w) => w.kind === 'publication'),
    [profile?.works],
  );
  const projects = useMemo(
    () => (profile?.works ?? []).filter((w) => w.kind === 'project'),
    [profile?.works],
  );

  if (!profile) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto box-content max-w-[670px] px-5 pt-20 pb-[100px] sm:px-10">
          <h1 className="text-3xl tracking-[-0.7px] text-zinc-900">Profile not found</h1>
          <p className="mt-2 text-zinc-500">
            This researcher profile doesn&apos;t exist or isn&apos;t public yet.
          </p>
          <Link href="/researchers" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            Browse researchers
          </Link>
        </main>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || 'Researcher';

  return (
    <>
      <Head>
        <title>{`${displayName} | ${SITE_NAME}`}</title>
        <meta name="description" content={(profile.bio || `${displayName} on ${SITE_NAME}`).slice(0, 160)} />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="relative mx-auto box-content max-w-[670px] px-5 pt-8 pb-[100px] sm:px-10">
          <ProfileHeader profile={profile} isSignedIn={signedIn} />

          <section className="mt-10 mb-16 flex flex-col gap-8 sm:mb-20">
            {profile.bio ? (
              <div className="text-lg leading-[24.3px] tracking-[-0.01em] text-zinc-900 sm:leading-[27px]">
                <p className="whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}

            {profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Link
                    key={interest}
                    href={`/researchers?search=${encodeURIComponent(interest)}`}
                    className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium tracking-[-0.01em] text-zinc-700 [box-shadow:0px_0px_2px_0px_#00000040] transition hover:bg-zinc-50"
                  >
                    {interest}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          {publications.length > 0 ? (
            <section className="mt-14 mb-16 flex flex-col gap-5 sm:mt-16 sm:mb-20 sm:gap-8">
              <h2 className="text-[26px] tracking-[-1px]">Selected work</h2>
              <div>
                {publications.map((work) => (
                  <WorkTile key={work.id} work={work} />
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section className="my-16 flex flex-col gap-5 sm:my-20 sm:gap-8">
              <h2 className="text-[26px] tracking-[-1px]">Projects</h2>
              <div>
                {projects.map((work) => (
                  <ProjectTile key={work.id} work={work} />
                ))}
              </div>
            </section>
          ) : null}

          {isMe && publications.length === 0 && projects.length === 0 ? (
            <section className="mt-16 flex flex-col gap-3">
              <p className="text-2xl tracking-[-0.7px] text-zinc-400">Nothing here yet...</p>
              <Link
                href="/profile/edit"
                className="flex w-max items-center gap-2 text-2xl tracking-[-0.7px] text-zinc-900"
              >
                Add work <PencilLine className="h-5 w-5" />
              </Link>
            </section>
          ) : null}
        </main>

        {isMe ? (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 lg:left-auto lg:right-10 lg:translate-x-0">
            <Link
              href="/profile/edit"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-black/80 shadow-[0px_2px_8px_0px_#00000022] transition hover:bg-black/[0.03]"
            >
              <PencilLine className="h-4 w-4" />
              Edit profile
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  if (!slug) return { notFound: true };

  const { fetchProfileBySlug } = await import('@/lib/server/profiles');
  const profile = await fetchProfileBySlug(slug);
  if (!profile) return { props: { profile: null } };

  return { props: { profile: JSON.parse(JSON.stringify(profile)) as ProfileWithWorks } };
};

export default ProfilePage;
