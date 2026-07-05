// lib/server/profiles.ts — server reads for profile pages + researcher directory.
// Uses the anon server client; profiles/works are publicly readable via RLS.
import { getSupabaseClient } from './records';
import type {
  Profile,
  ProfileWithWorks,
  ProfileWork,
  ResearcherCardData,
  ResearcherSearchResults,
  ResearcherSortValue,
} from '@/lib/profiles';

const DIRECTORY_CAP = 1000;

export async function fetchProfileBySlug(
  slug: string,
): Promise<ProfileWithWorks | null> {
  const supabase = getSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', slug)
    .maybeSingle();

  if (!profile) return null;

  const { data: works } = await supabase
    .from('profile_works')
    .select('*')
    .eq('user_id', (profile as Profile).user_id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return { ...(profile as Profile), works: (works ?? []) as ProfileWork[] };
}

interface DirectoryParams {
  search?: string;
  sort?: ResearcherSortValue;
  page?: number;
  pageSize?: number;
}

function completenessScore(card: ResearcherCardData): number {
  let score = 0;
  if (card.avatar_url) score += 2;
  if (card.tagline) score += 1;
  if (card.interests.length > 0) score += 1;
  if (card.city || card.state || card.country) score += 1;
  score += card.publicationCount + card.projectCount;
  return score;
}

export async function listResearchers({
  search = '',
  sort = 'complete',
  page = 1,
  pageSize = 21,
}: DirectoryParams): Promise<ResearcherSearchResults> {
  const supabase = getSupabaseClient();

  // Public, claimed profiles only.
  const { data: profileRows } = await supabase
    .from('profiles')
    .select(
      'user_id, username, display_name, tagline, pronouns, avatar_url, city, state, country, interests, created_at',
    )
    .eq('is_public', true)
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(DIRECTORY_CAP);

  const profiles = profileRows ?? [];
  if (profiles.length === 0) {
    return { data: [], totalFound: 0, hasMore: false, page };
  }

  const userIds = profiles.map((p) => p.user_id as string);
  const { data: workRows } = await supabase
    .from('profile_works')
    .select('user_id, kind')
    .in('user_id', userIds);

  const counts = new Map<string, { publications: number; projects: number }>();
  for (const row of workRows ?? []) {
    const entry = counts.get(row.user_id as string) ?? { publications: 0, projects: 0 };
    if (row.kind === 'project') entry.projects += 1;
    else entry.publications += 1;
    counts.set(row.user_id as string, entry);
  }

  let cards: (ResearcherCardData & { createdAt: string })[] = profiles.map((p) => {
    const c = counts.get(p.user_id as string) ?? { publications: 0, projects: 0 };
    return {
      user_id: p.user_id as string,
      username: (p.username as string) ?? null,
      display_name: (p.display_name as string) ?? null,
      tagline: (p.tagline as string) ?? null,
      pronouns: (p.pronouns as string) ?? null,
      avatar_url: (p.avatar_url as string) ?? null,
      city: (p.city as string) ?? null,
      state: (p.state as string) ?? null,
      country: (p.country as string) ?? null,
      interests: (p.interests as string[]) ?? [],
      publicationCount: c.publications,
      projectCount: c.projects,
      createdAt: (p.created_at as string) ?? '',
    };
  });

  const q = search.trim().toLowerCase();
  if (q) {
    cards = cards.filter((c) => {
      const haystack = [
        c.display_name,
        c.username,
        c.tagline,
        c.city,
        c.state,
        c.country,
        ...c.interests,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  cards.sort((a, b) => {
    switch (sort) {
      case 'alphabetical':
        return (a.display_name ?? a.username ?? '').localeCompare(
          b.display_name ?? b.username ?? '',
        );
      case 'publications':
        return b.publicationCount - a.publicationCount;
      case 'projects':
        return b.projectCount - a.projectCount;
      case 'recent':
        return b.createdAt.localeCompare(a.createdAt);
      case 'complete':
      default:
        return completenessScore(b) - completenessScore(a);
    }
  });

  const totalFound = cards.length;
  const start = (page - 1) * pageSize;
  const pageItems = cards.slice(start, start + pageSize).map(({ createdAt: _c, ...rest }) => rest);

  return {
    data: pageItems,
    totalFound,
    hasMore: start + pageSize < totalFound,
    page,
  };
}
