# Bhishi

Mobile-first web app for running a **Bhishi / Kameti / Committee** register. It tracks members, contributions, lucky draws, and reminders. It never collects, holds, or transfers the pool money.

## Stack

- Next.js + TypeScript + Tailwind
- Supabase (Postgres, Auth, Row Level Security)
- Vercel hosting

## Local setup

1. Create a Supabase project in **Mumbai (`ap-south-1`)**.
2. In Authentication → Providers, keep Email enabled.
3. In Authentication → Settings, turn **Confirm email** off while you are developing.
4. Copy environment variables:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` locally)
- `NEXT_PUBLIC_SUPPORT_WHATSAPP` (optional, country code + number, e.g. `9198xxxxxxxx`)

5. In the Supabase SQL editor, run `supabase/migrations/00001_init.sql`.
6. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub + Vercel

1. Create a GitHub repository and push this project.
2. In Vercel, import the repo.
3. Add the same environment variables in Vercel Project Settings.
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain.
5. In Supabase Auth → URL configuration, add:
   - `http://localhost:3000/**`
   - `https://your-domain.com/**`
   - `https://*-your-team.vercel.app/**` for preview deploys

## What is in this first version

- Email sign up / sign in
- Groups, Alerts, and Profile tabs
- 4-step group wizard (Lucky Draw + Bidding; Loan is hidden)
- Shadow members (no account needed)
- Contribution grid with paid / unpaid / partial
- Lucky draw that excludes past winners
- WhatsApp invite and reminder links
- PDF group statement
- Group notes for late fees and drop-outs

Bidding payments work. The bid-round screen is next. Loan groups and the loan-referral tab are intentionally not built.

## Product boundary

All contribution and payout money moves outside the app, by UPI, cash, or bank transfer between members.
