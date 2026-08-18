# MySpace

A personal task tracker for keeping up with requests from coworkers. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full spec and roadmap.

## Stack

React 19 + Vite 7 + TypeScript, Tailwind CSS, [Supabase](https://supabase.com) (Postgres + Row Level Security + email/password Auth) accessed directly from the client, React Router. No separate backend yet — add a Vercel serverless function under `api/` later if server-side logic (e.g. AI features) is needed.

## Getting started

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql) — this creates the `tasks` table and its Row Level Security policies.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (**Settings → API** in the Supabase dashboard).
4. Install and run:

```bash
npm install
npm run dev
```

Open the printed local URL, sign up for an account, then start creating tasks on the board.

> By default Supabase requires email confirmation before a new account can log in. For a quick personal setup you can disable that under **Authentication → Providers → Email → Confirm email** in the Supabase dashboard.

## Data model

A single `tasks` table (see `supabase/schema.sql`): title, description, priority, status, due date, and a free-text `requester_name` (optional — not a separate entity). RLS policies scope every row to `auth.uid()`, so each user only ever sees their own tasks.

## Deploying

Push to a Git repo and import it on [Vercel](https://vercel.com) with the Vite framework preset. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as project environment variables — `vercel.json` already handles the SPA rewrite so client-side routes like `/board` work on refresh.
