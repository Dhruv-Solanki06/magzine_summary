// lib/profiles.ts — researcher profile types, constants, and browser-side CRUD
// (all through Supabase; RLS keeps writes scoped to the authenticated owner).
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

export type WorkKind = 'publication' | 'project';

export interface ProfileWork {
  id: string;
  kind: WorkKind;
  title: string;
  venue: string | null;
  year: number | null;
  link: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  images: string[];
  tags: string[];
  sort_order: number;
}

export interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  tagline: string | null;
  pronouns: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  interests: string[];
  website: string | null;
  email: string | null;
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  scholar: string | null;
  orcid: string | null;
  is_public: boolean;
}

export interface ProfileWithWorks extends Profile {
  works: ProfileWork[];
}

export interface ResearcherCardData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  tagline: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  interests: string[];
  publicationCount: number;
  projectCount: number;
}

export interface ResearcherSearchResults {
  data: ResearcherCardData[];
  totalFound: number;
  hasMore: boolean;
  page: number;
}

export const RESEARCHERS_PAGE_SIZE = 21;

export type ResearcherSortValue =
  | 'complete'
  | 'alphabetical'
  | 'publications'
  | 'projects'
  | 'recent';

export const researcherSortOptions: { value: ResearcherSortValue; label: string }[] = [
  { value: 'complete', label: 'Complete profile' },
  { value: 'alphabetical', label: 'Alphabetically' },
  { value: 'publications', label: 'By # of publications' },
  { value: 'projects', label: 'By # of projects' },
  { value: 'recent', label: 'Recently joined' },
];

export const projectCategories: { value: string; label: string }[] = [
  { value: 'paper', label: 'Paper' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'software', label: 'Software / tool' },
  { value: 'grant', label: 'Grant' },
  { value: 'talk', label: 'Talk / lecture' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'fieldwork', label: 'Fieldwork' },
  { value: 'award', label: 'Award' },
  { value: 'other', label: 'Other' },
];

export const CONTACT_FIELDS: { key: keyof Profile; label: string; placeholder: string }[] = [
  { key: 'website', label: 'Website', placeholder: 'https://…' },
  { key: 'email', label: 'Public email', placeholder: 'you@university.edu' },
  { key: 'scholar', label: 'Google Scholar', placeholder: 'https://scholar.google.com/…' },
  { key: 'orcid', label: 'ORCID', placeholder: '0000-0000-0000-0000' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/…' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
];

/* -------------------------------------------------------------------------- */
/*  Browser-side reads/writes (RLS scopes them to the signed-in owner)        */
/* -------------------------------------------------------------------------- */

export async function fetchMyProfile(userId: string): Promise<ProfileWithWorks | null> {
  const supabase = getSupabaseBrowserClient();
  const [{ data: profile }, { data: works }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('profile_works')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  ]);
  if (!profile) return null;
  return { ...(profile as Profile), works: (works ?? []) as ProfileWork[] };
}

export async function saveProfile(
  userId: string,
  fields: Partial<Profile>,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() }, {
      onConflict: 'user_id',
    });
  return { error: error?.message ?? null };
}

export async function isUsernameAvailable(
  username: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('username', username)
    .maybeSingle();
  return !data || (data as { user_id: string }).user_id === userId;
}

export async function upsertWork(
  userId: string,
  work: Partial<ProfileWork> & { kind: WorkKind; title: string },
): Promise<{ data: ProfileWork | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const payload = { ...work, user_id: userId };
  const { data, error } = await supabase
    .from('profile_works')
    .upsert(payload)
    .select('*')
    .single();
  return { data: (data as ProfileWork) ?? null, error: error?.message ?? null };
}

export async function deleteWork(id: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('profile_works').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Turn a display name / email into a candidate username slug. */
export function slugifyUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}
