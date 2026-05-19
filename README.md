This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Team-Safe Local Development

This project includes an API write guard to reduce accidental writes to shared databases:

- In development, `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/*` are blocked by default.
- To temporarily allow local writes, set `BLOCK_API_WRITES=false` in your local env.
- Keep `BLOCK_API_WRITES=true` for normal day-to-day development.

### Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in your local or non-production Supabase credentials.
3. Run the app with `npm run dev`.

### Recommended Team Workflow

1. Use **local Supabase** for feature development and tests.
2. Use a separate **staging Supabase** project for integration testing.
3. Restrict production credentials and avoid using them in local `.env.local`.

### Optional: Run Supabase Locally

If Supabase CLI and Docker are installed:

```bash
supabase start
supabase db reset
```

Then point `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY` to the local project values.

## Mock Commbox Webhooks (Phase 1)

This repository now includes secure webhook endpoints and a mock sender CLI for integration testing.

1. Start the app:

```bash
npm run dev
```

2. In another terminal, trigger a mock ride broadcast:

```bash
npm run mock:broadcast-ride
```

The mock command posts to `POST /api/webhooks/ride-request`, creates a `ride_requests` row, and returns a preview of drivers who would receive WhatsApp notifications.

API contract docs: `docs/commbox-webhook-contract.md`.

## Intake API Draft (Issues #42 / #43)

This branch includes a draft intake contract and a guarded intake route:

- `docs/api/intake-ride-request.md`
- `app/api/intake/ride-request/route.ts`

Current behavior:

- Bearer API-key auth + full contract validation are implemented.
- Database writes are intentionally blocked with `501` in this spike branch.

Do not merge this spike to `dev` until Issues #40, #41, and #42 are finalized.

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
