This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Team-Safe Local Development

This project includes an API write guard to reduce accidental writes to shared databases:

- In development, `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/*` are blocked by default.
- To temporarily allow local writes, set `BLOCK_API_WRITES=false` in your local env.
- Keep `BLOCK_API_WRITES=true` for normal day-to-day development.

### Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Keep `.env.local` pointed at localhost/Docker only.
3. Run the app with `npm run dev`.

### Recommended Team Workflow

1. Use **local Supabase** for feature development and tests.
2. Use a separate **staging Supabase** project for integration testing outside local development.
3. Restrict production credentials and avoid using them in local `.env.local`.

### Optional: Run Supabase Locally

If Supabase CLI and Docker are installed:

```bash
supabase start
supabase db reset
```

Then point `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY` to the local project values.

## Local Docker Test Database

This branch includes an isolated local Postgres database for tests and schema checks. It runs in Docker on host port `55432`, separate from the Supabase CLI default DB port `54322` and separate from any hosted Supabase project.

The committed `.env.test` is intentionally local-only:

- `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/postgres`
- `SUPABASE_DB_URL=postgres://postgres:postgres@127.0.0.1:55432/postgres`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_ANON_KEY=local-test-anon-key`

Do not replace `.env.test` with production, staging, or shared project credentials. If schema is copied from a real database in the future, use a schema-only export unless the data has been explicitly approved and anonymized. Never copy real emails, passwords, phone numbers, payment data, tokens, or private records into the test database.

The local startup path is guarded: `npm run dev`, `npm test`, and the test DB scripts run local environment validation before starting. In development and test mode, hosted Supabase URLs, remote Postgres URLs, Vercel OIDC tokens, and Supabase service-role keys fail fast.

### Start the DB

```bash
npm run db:test:start
```

Equivalent Docker command:

```bash
docker compose up -d test-db
```

### Load Schema

This resets the disposable `public` and `auth` schemas, creates a minimal local `auth.users` table needed by the existing migrations, and applies every migration in `supabase/migrations`.

```bash
npm run db:test:schema
```

### Seed Test Data

This loads synthetic data from `supabase/test-seed.sql`.

```bash
npm run db:test:seed
```

### Reset the DB

This reloads the schema and then reloads synthetic seed data.

```bash
npm run db:test:reset
```

### Verify the DB

```bash
npm run db:test:verify
```

This confirms the container is running, Postgres is accepting local connections, and the seeded schema can be queried.

### Run Tests

```bash
npm test
```

Vitest loads `.env.test` through `__tests__/setup-env.ts`. The test setup rejects non-local database URLs, and `createSupabaseClient()` refuses non-local Supabase URLs while `NODE_ENV=test`, so tests cannot accidentally point at a hosted project database.

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
