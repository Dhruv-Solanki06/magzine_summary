export const DEFAULT_AUTH_REDIRECT = '/';

export function getSafeRedirectPath(
  value: string | string[] | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  if (
    candidate.startsWith('/login') ||
    candidate.startsWith('/signup') ||
    candidate.startsWith('/forgot-password') ||
    candidate.startsWith('/auth/callback')
  ) {
    return fallback;
  }

  return candidate;
}

export function getAbsoluteAuthUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
}
