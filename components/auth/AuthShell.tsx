import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import Header from '@/components/common/Header';
import { HERITAGE_ASSETS, SITE_NAME } from '@/lib/brand';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{`${title} | ${SITE_NAME}`}</title>
      </Head>
      <Header />
      <main
        className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.96), rgba(255,255,255,0.78)), url("${HERITAGE_ASSETS[1].src}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {children}
          {footer && (
            <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
              {footer}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const classes = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${classes[tone]}`}>
      {children}
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-blue-700 hover:text-blue-800">
      {children}
    </Link>
  );
}

export const authInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export const authPrimaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

export const authSecondaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
