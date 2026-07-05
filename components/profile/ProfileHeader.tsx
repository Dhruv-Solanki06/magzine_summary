import React, { useState, type ReactNode } from 'react';
import { Globe, Mail, Linkedin, Twitter, Github, GraduationCap, BadgeCheck } from 'lucide-react';
import type { Profile } from '@/lib/profiles';

function normalizeExternalLink(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) return trimmed;
  return `https://${trimmed}`;
}

type SocialItem = { key: string; label: string; href: string; icon: ReactNode };

function getSocialItems(profile: Profile, isSignedIn: boolean): SocialItem[] {
  const items: SocialItem[] = [
    { key: 'website', label: 'Website', href: profile.website || '', icon: <Globe className="h-[18px] w-[18px]" /> },
    { key: 'email', label: 'Email', href: profile.email ? `mailto:${profile.email}` : '', icon: <Mail className="h-[18px] w-[18px]" /> },
    { key: 'scholar', label: 'Google Scholar', href: profile.scholar || '', icon: <GraduationCap className="h-[18px] w-[18px]" /> },
    { key: 'orcid', label: 'ORCID', href: profile.orcid || '', icon: <BadgeCheck className="h-[18px] w-[18px]" /> },
    { key: 'linkedin', label: 'LinkedIn', href: profile.linkedin || '', icon: <Linkedin className="h-[18px] w-[18px]" /> },
    { key: 'twitter', label: 'X', href: profile.twitter || '', icon: <Twitter className="h-[18px] w-[18px]" /> },
    { key: 'github', label: 'GitHub', href: profile.github || '', icon: <Github className="h-[18px] w-[18px]" /> },
  ];

  return items.filter((item) => {
    if (item.key === 'email' && !isSignedIn) return false;
    return item.href.trim().length > 0;
  });
}

export const ProfileHeader = ({
  profile,
  isSignedIn,
}: {
  profile: Profile;
  isSignedIn: boolean;
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = profile.display_name || profile.username || 'Researcher';
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
  const details = [profile.pronouns, profile.tagline, location].filter(Boolean);
  const socialItems = getSocialItems(profile, isSignedIn);
  const showAvatar = profile.avatar_url && !avatarFailed;

  return (
    <header className="mt-[60px] mb-0">
      <div className="flex flex-col items-center justify-between gap-[30px] sm:flex-row sm:items-start sm:gap-0">
        <div className="h-[110px] w-[110px] rotate-[-3deg] overflow-hidden rounded-2xl bg-neutral-100 sm:h-[186px] sm:w-[186px]">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url as string}
              alt={`${displayName} avatar`}
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-neutral-500 sm:text-6xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col items-center gap-3 text-center sm:w-4/6 sm:items-start sm:gap-[10px] sm:text-left">
          <h1 className="text-[32px] leading-none tracking-[-1px] sm:text-4xl">{displayName}</h1>
          <p className="-mt-0.5 text-lg leading-[24.3px] tracking-[-0.01em] text-zinc-500 sm:text-xl">
            {details.length > 0 ? details.join(' | ') : 'Researcher'}
          </p>

          {socialItems.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {socialItems.map((item) => (
                <a
                  key={item.key}
                  href={normalizeExternalLink(item.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-full text-zinc-900 shadow-[0px_0px_2px_0px_#00000040] transition hover:opacity-70"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;
