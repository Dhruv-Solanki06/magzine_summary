// lib/clientId.ts
// A stable, anonymous per-browser identifier persisted in localStorage. Attached
// to content reports so the admin panel can correlate multiple submissions from
// the same device (e.g. spot spam) even though it's not personally identifying.

const CLIENT_ID_KEY = 'ac_client_id';

export function getClientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
