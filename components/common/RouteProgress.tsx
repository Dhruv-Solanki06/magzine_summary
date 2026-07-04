'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * Slim top progress bar shown during client-side navigations (each of which
 * runs getServerSideProps on the server). Gives immediate feedback so filter /
 * search / pagination clicks never feel unresponsive.
 */
export default function RouteProgress() {
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (timer.current) clearInterval(timer.current);
      if (hide.current) clearTimeout(hide.current);
    };

    const start = (url: string) => {
      if (url.split('#')[0] === router.asPath.split('#')[0]) return;
      clearTimers();
      setVisible(true);
      setWidth(10);
      timer.current = setInterval(() => {
        // ease toward 90% while we wait for the server
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w));
      }, 180);
    };

    const done = () => {
      clearTimers();
      setWidth(100);
      hide.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 280);
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      clearTimers();
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div
        className="h-full rounded-r-full bg-[#171717] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${width}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 10px rgba(23,23,23,0.5), 0 0 4px rgba(23,23,23,0.4)',
        }}
      />
    </div>
  );
}
