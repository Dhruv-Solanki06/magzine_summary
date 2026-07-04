# Aryan Culture

Aryan Culture (`aryanculture.org`) is a Next.js archive for cultural articles, journals, manuscripts, and related scholarship.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication setup

This app uses Supabase Auth for app-user login, signup, account verification, and password reset. It does not use or modify the existing backend `users` table.

1. Add the public auth env vars in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=<same value as SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

For older Supabase projects, `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works instead of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

2. In Supabase Auth URL settings, add your site URL and redirect URL:

```text
http://localhost:3000
http://localhost:3000/auth/callback
```

For production, add:

```text
https://aryanculture.org
https://aryanculture.org/auth/callback
```

Email/password verification and password reset are handled by Supabase Auth emails. The existing `MAILEROO_API_KEY` is not required for this default flow; using Maileroo for these auth emails would require a custom email-sending flow or SMTP setup.

Optional Google login: enable Google under Supabase Auth Providers, add your Google client ID/secret there, and add Supabase's Google callback URL in Google Cloud.

The primary archive page lives at `pages/index.tsx`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
