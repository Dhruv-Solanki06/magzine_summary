'use client';

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Camera, Check, Loader2, Plus } from 'lucide-react';

import Header from '@/components/common/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import WorkEditorCard, { type WorkDraft } from '@/components/profile/WorkEditorCard';
import { uploadAuthHeaders, uploadFiles } from '@/lib/uploadthing';
import {
  CONTACT_FIELDS,
  fetchMyProfile,
  isUsernameAvailable,
  saveProfile,
  slugifyUsername,
  type Profile,
  type ProfileWork,
} from '@/lib/profiles';
import { SITE_NAME } from '@/lib/brand';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/85 outline-none placeholder:text-black/35 focus:ring-1 focus:ring-black/25';
const labelClass = 'mb-1 block text-xs font-medium text-black/55';

interface FormState {
  username: string;
  display_name: string;
  tagline: string;
  pronouns: string;
  bio: string;
  avatar_url: string;
  city: string;
  state: string;
  country: string;
  interests: string;
  website: string;
  email: string;
  linkedin: string;
  twitter: string;
  github: string;
  scholar: string;
  orcid: string;
  is_public: boolean;
}

const emptyForm: FormState = {
  username: '',
  display_name: '',
  tagline: '',
  pronouns: '',
  bio: '',
  avatar_url: '',
  city: '',
  state: '',
  country: '',
  interests: '',
  website: '',
  email: '',
  linkedin: '',
  twitter: '',
  github: '',
  scholar: '',
  orcid: '',
  is_public: true,
};

let draftCounter = 0;

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [works, setWorks] = useState<(ProfileWork | WorkDraft)[]>([]);
  const [savedWorkKeys] = useState(() => new Map<string, string>());
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'ok'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const avatarRef = useRef<HTMLInputElement | null>(null);

  // Auth gate + load existing profile.
  useEffect(() => {
    if (loading) return;
    if (!configured || !user) {
      void router.replace('/login?next=/profile/edit');
      return;
    }
    let cancelled = false;
    (async () => {
      const existing = await fetchMyProfile(user.id);
      if (cancelled) return;
      if (existing) {
        setForm({
          username: existing.username ?? '',
          display_name: existing.display_name ?? '',
          tagline: existing.tagline ?? '',
          pronouns: existing.pronouns ?? '',
          bio: existing.bio ?? '',
          avatar_url: existing.avatar_url ?? '',
          city: existing.city ?? '',
          state: existing.state ?? '',
          country: existing.country ?? '',
          interests: (existing.interests ?? []).join(', '),
          website: existing.website ?? '',
          email: existing.email ?? '',
          linkedin: existing.linkedin ?? '',
          twitter: existing.twitter ?? '',
          github: existing.github ?? '',
          scholar: existing.scholar ?? '',
          orcid: existing.orcid ?? '',
          is_public: existing.is_public,
        });
        setWorks(existing.works);
      } else {
        // Seed a starter username + display name from the account email.
        const local = user.email?.split('@')[0] ?? '';
        setForm((f) => ({
          ...f,
          username: slugifyUsername(local),
          display_name: local,
          email: user.email ?? '',
        }));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, loading, router, user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const checkUsername = async () => {
    if (!user) return;
    const uname = slugifyUsername(form.username);
    set('username', uname);
    if (!uname) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const available = await isUsernameAvailable(uname, user.id);
    setUsernameStatus(available ? 'ok' : 'taken');
  };

  const uploadAvatar = async (file: File) => {
    setError('');
    setAvatarUploading(true);
    try {
      const headers = await uploadAuthHeaders();
      const res = await uploadFiles('avatar', { files: [file], headers });
      const url = res[0]?.serverData?.url ?? res[0]?.ufsUrl;
      if (url) set('avatar_url', url);
    } catch {
      setError('Avatar upload failed.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const uname = slugifyUsername(form.username);
    if (!uname) {
      setError('Please choose a username.');
      return;
    }
    if (!form.display_name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    setSaving(true);

    const available = await isUsernameAvailable(uname, user.id);
    if (!available) {
      setSaving(false);
      setUsernameStatus('taken');
      setError('That username is taken.');
      return;
    }

    const fields: Partial<Profile> = {
      username: uname,
      display_name: form.display_name.trim(),
      tagline: form.tagline.trim() || null,
      pronouns: form.pronouns.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      interests: form.interests
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      website: form.website.trim() || null,
      email: form.email.trim() || null,
      linkedin: form.linkedin.trim() || null,
      twitter: form.twitter.trim() || null,
      github: form.github.trim() || null,
      scholar: form.scholar.trim() || null,
      orcid: form.orcid.trim() || null,
      is_public: form.is_public,
    };

    const { error: saveErr } = await saveProfile(user.id, fields);
    setSaving(false);
    if (saveErr) {
      setError(saveErr);
      return;
    }
    setSavedMsg('Profile saved.');
    set('username', uname);
    window.setTimeout(() => setSavedMsg(''), 2500);
  };

  const addWork = (kind: 'publication' | 'project') => {
    draftCounter += 1;
    const draft: WorkDraft = { kind, _key: `draft-${draftCounter}`, title: '', images: [], tags: [] };
    setWorks((prev) => [draft, ...prev]);
  };

  const keyOf = (w: ProfileWork | WorkDraft) => ('_key' in w ? w._key : w.id);

  const onWorkSaved = (key: string, saved: ProfileWork) => {
    savedWorkKeys.set(key, saved.id);
    setWorks((prev) => prev.map((w) => (keyOf(w) === key ? saved : w)));
  };
  const onWorkRemoved = (key: string) =>
    setWorks((prev) => prev.filter((w) => keyOf(w) !== key));

  const usernameHint =
    usernameStatus === 'checking'
      ? 'Checking…'
      : usernameStatus === 'taken'
        ? 'Username is taken'
        : usernameStatus === 'ok'
          ? 'Available'
          : '';

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto flex max-w-[720px] items-center justify-center px-5 pt-24">
          <Loader2 className="h-6 w-6 animate-spin text-black/40" />
        </main>
      </div>
    );
  }

  const displayName = form.display_name || form.username || 'R';

  return (
    <>
      <Head>
        <title>{`Edit profile | ${SITE_NAME}`}</title>
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto max-w-[720px] px-5 pb-28 pt-8 sm:px-10">
          <div className="flex items-center justify-between">
            <h1
              className="text-[28px] font-bold tracking-[-0.6px] text-black/92"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Edit profile
            </h1>
            {form.username ? (
              <Link
                href={`/profile/${slugifyUsername(form.username)}`}
                className="text-sm font-medium text-black/60 underline underline-offset-4 hover:text-black/90"
              >
                View profile
              </Link>
            ) : null}
          </div>

          {/* Avatar + identity */}
          <section className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-neutral-100">
                {form.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-neutral-500">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center gap-1 bg-black/55 text-[11px] font-medium text-white"
                >
                  {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Photo
                </button>
              </div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="grid flex-1 gap-3">
              <div>
                <label className={labelClass}>Username *</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black/40">/profile/</span>
                  <input
                    className={inputClass}
                    value={form.username ?? ''}
                    onChange={(e) => set('username', e.target.value)}
                    onBlur={checkUsername}
                    placeholder="jane-doe"
                  />
                </div>
                {usernameHint ? (
                  <p
                    className={`mt-1 text-xs ${
                      usernameStatus === 'taken' ? 'text-rose-600' : 'text-black/45'
                    }`}
                  >
                    {usernameHint}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Display name *</label>
                  <input
                    className={inputClass}
                    value={form.display_name ?? ''}
                    onChange={(e) => set('display_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pronouns</label>
                  <input
                    className={inputClass}
                    value={form.pronouns ?? ''}
                    onChange={(e) => set('pronouns', e.target.value)}
                    placeholder="she/her"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tagline</label>
                <input
                  className={inputClass}
                  value={form.tagline ?? ''}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="PhD candidate, computational linguistics"
                />
              </div>
            </div>
          </section>

          {/* Bio + interests */}
          <section className="mt-6 grid gap-3">
            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={form.bio ?? ''}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="A short introduction to your research and background."
              />
            </div>
            <div>
              <label className={labelClass}>Research interests (comma separated)</label>
              <input
                className={inputClass}
                value={form.interests}
                onChange={(e) => set('interests', e.target.value)}
                placeholder="Sanskrit manuscripts, epigraphy, digital humanities"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>State / region</label>
                <input className={inputClass} value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input className={inputClass} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Contact / links */}
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-black/70">Links</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    className={inputClass}
                    value={(form[field.key as keyof FormState] as string) ?? ''}
                    onChange={(e) => set(field.key as keyof FormState, e.target.value as never)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Visibility */}
          <section className="mt-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => set('is_public', e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-black/70">
                Show my profile in the public researcher directory
              </span>
            </label>
          </section>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save profile
            </button>
            {savedMsg ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" />
                {savedMsg}
              </span>
            ) : null}
          </div>

          {/* Works */}
          <section className="mt-12 border-t border-black/[0.08] pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-black/90" style={{ fontFamily: 'var(--font-heading)' }}>
                Publications & projects
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addWork('publication')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-3 text-sm font-medium text-black/70 transition hover:border-black/20 hover:text-black/90"
                >
                  <Plus className="h-4 w-4" /> Publication
                </button>
                <button
                  type="button"
                  onClick={() => addWork('project')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-3 text-sm font-medium text-black/70 transition hover:border-black/20 hover:text-black/90"
                >
                  <Plus className="h-4 w-4" /> Project
                </button>
              </div>
            </div>

            <p className="mt-2 text-sm text-black/50">
              Each item saves on its own. Save your profile details above separately.
            </p>

            {!user ? null : (
              <div className="mt-5 flex flex-col gap-4">
                {works.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-black/45">
                    No publications or projects yet. Add your first above.
                  </p>
                ) : (
                  works.map((w) => {
                    const key = keyOf(w);
                    const draft: WorkDraft =
                      '_key' in w ? w : { ...w, _key: w.id };
                    return (
                      <WorkEditorCard
                        key={key}
                        userId={user.id}
                        draft={draft}
                        onSaved={onWorkSaved}
                        onRemoved={onWorkRemoved}
                      />
                    );
                  })
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
