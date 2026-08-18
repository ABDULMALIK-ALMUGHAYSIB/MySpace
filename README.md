# MySpace

A personal task tracker for keeping up with requests from coworkers. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full spec and roadmap.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Prisma with a libSQL driver adapter (local SQLite file for dev, swap to Turso for cloud deployment), Auth.js (NextAuth) with email/password credentials.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up for an account, add a requester, then start creating tasks on the board.

## Database

Local dev uses a SQLite file at `dev.db` (git-ignored). To change the schema, edit `prisma/schema.prisma` then run:

```bash
npx prisma migrate dev --name <change-description>
```

## Deploying

Not deployed yet. The plan is to move the database to [Turso](https://turso.tech) (libSQL-compatible, so no adapter change needed — just swap `DATABASE_URL`/`DATABASE_AUTH_TOKEN`) and host on [Vercel](https://vercel.com).
