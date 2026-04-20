# Penny Coach

Penny Coach is a personal finance web app I built to track spending and plan money better without relying on paid tools or giving access to bank accounts.

Most apps I tried either required subscriptions or direct bank connections, so I made something that works with your own data and stays under your control.

US-first by default (USD, en-US, US categories and payment methods), but the currency/locale is a profile setting.

## What it does

- Track income and expenses
- Set monthly budgets
- Plan future spending (trips, big purchases, and similar)
- See where your money is going with charts and summaries
- Get simple, rule-based suggestions on how to save or spend better
- Import transactions using CSV, OFX, QFX, or QIF files (no bank login required)
- Optional demo data to explore the app before adding your own

## Why I built it

I wanted a finance tracker that:

- doesn’t require a subscription
- doesn’t connect directly to my bank
- gives clear and practical insights instead of vague advice
- lets me stay in control of my own data

## Run it locally

```bash
npm install
npm run db:push      # creates the tables
npm run dev          # http://localhost:3000
```

Node 20+. SQLite is the default for local dev (`DATABASE_URL="file:./dev.db"` — see `.env.example`).

The DB starts empty. Add transactions manually, import a bank file at `/import`, or load the demo set from Settings.

## Deploy

Works on Vercel + Neon/Supabase Postgres, both free tier. Schema is already on the `postgresql` provider.

1. Create a free Postgres DB on [neon.tech](https://neon.tech).
2. `DATABASE_URL="postgres://..." npx prisma db push` to create the tables.
3. Import the repo into Vercel, add `DATABASE_URL`, `APP_DEFAULT_CURRENCY=USD`, `APP_DEFAULT_LOCALE=en-US`, deploy.

## Scripts

| | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | prod build |
| `npm test` | unit tests (Vitest) |
| `npm run db:push` | sync schema |
| `npm run db:seed` | load US demo data |

## Stack

Next.js 14 (App Router), TypeScript, Tailwind, Radix/shadcn, Prisma, Zod, Recharts, date-fns. Vitest.

## Notes

All money is stored as integer cents so there's no floating-point weirdness. The advisor lives in `src/lib/advisor/` — pure functions, easy to read, easy to test. Import parsers are in `src/lib/import/`.

Not financial advice — just budgeting math I trust because I can read it.
