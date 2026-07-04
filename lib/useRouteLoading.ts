'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * True while a client-side navigation (which triggers server-side
 * getServerSideProps) is in flight. Lets browse pages show loading states
 * during the SSR round-trip that filters/search/pagination incur.
 */
export function useRouteLoading(): boolean {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = (url: string) => {
      // Ignore shallow / hash-only changes.
      if (url.split('#')[0] === router.asPath.split('#')[0]) return;
      setLoading(true);
    };
    const done = () => setLoading(false);

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router]);

  return loading;
}
