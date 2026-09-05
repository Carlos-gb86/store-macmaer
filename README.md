# Macmaer

Next.js App Router storefront for the Macmaer rebuild. Read [SPEC.md](SPEC.md) before changing architecture or domain behavior. This repository implements **Phases 0 and 1 only**.

## Local setup

Use Node.js **22.12+** (Node 22 LTS is pinned in `.nvmrc`) and npm.

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). The example environment explicitly selects a sample catalogue, with illustrative prices and local Macmaer reference images. No account or external service is needed. If `.env.local` already exists, edit it instead of overwriting it.

Public routes: `/`, `/shop`, `/collections`, `/collections/[slug]`, `/products/[slug]`. Search, collection/tag/availability filters, sorting and pagination use shareable query parameters. Product configuration is a preview; ordering is not enabled.

## Environment conventions

| Variable                               | Purpose                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `CATALOG_SOURCE`                       | `demo` for explicit sample data, `supabase` for database reads. Defaults to `supabase`; missing credentials fail validation. |
| `NEXT_PUBLIC_SITE_URL`                 | Application URL; defaults to localhost for development. Set for each deployment.                                             |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project/API URL; required in Supabase mode.                                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (or local legacy anon key). Required in Supabase mode.                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | Optional server-only credential; unused by public catalogue routes.                                                          |

Copy conventions from `.env.example`. Actual `.env*` files are ignored. Only `NEXT_PUBLIC_*` variables can be exposed to browser code. Public environment values use explicit property access so Next.js can inline them. Validation errors list field names, never supplied values. Rebuild after changing public variables or switching a deployed catalogue source.

## Supabase and migrations

Start Docker Desktop, then:

```sh
npm run db:start
npm run db:reset
npx supabase status
```

`db:reset` replaces the **local** database with migrations and representative seeds; use only for disposable local data. Copy the displayed local API URL and publishable/anon key into `.env.local`, set `CATALOG_SOURCE=supabase`, and restart Next.js. No service-role key is needed to browse.

The migrations create the catalogue tables, constraints, indexes, RLS policies, an RLS-preserving JSON read view and a public `catalogue` Storage bucket. Anonymous and signed-in users can only read active catalogue data. Neither can write. Admin roles, sessions and write policies belong to Phase 2.

```sh
npm run db:lint
npm run seed:generate
npm run db:types
```

The seed is generated from `src/modules/catalog/fixtures/catalogue.json`; edit that source and regenerate. It is repeatable on reset and uses deterministic UUIDs. Its conflict behavior leaves existing rows alone; it is not a production catalogue updater.

Types are generated from the checked-in SQL using embedded PostgreSQL introspection, without Docker or credentials. The generated types support the current tables and read view; SDK relationship inference is intentionally omitted because repositories use the view. Review the generator when introducing new SQL types. For future hosted-schema workflows, Supabase's `gen types typescript` is also available.

Images accept either `/images/...` paths bundled in this repository or relative object paths in the Supabase `catalogue` bucket. Only that configured project's public catalogue path is allowed by Next Image. The bucket is for published assets; use a separate private bucket for drafts. Browser uploads are not enabled.

## Tests and checks

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

- ESLint, strict TypeScript and Prettier run through `check`.
- Vitest covers catalogue queries, generic configurations, exact minor-unit display, environment validation, SQL constraints and RLS.
- Database tests execute the migrations unchanged in PGlite (PostgreSQL). Only Supabase roles and Storage bucket metadata are stubbed. They do not replace a full Supabase Auth/Storage/API smoke test.
- Playwright starts an isolated demo server on port 3100 and checks desktop and mobile catalogue journeys.
- CI runs checks, generated-file drift verification, production build and browser tests.

Commerce calculations and payment tests will be added with their phases. The current preview has no tax, shipping, FX, cart or payment calculations.

## Architecture

- `src/app`: route composition, metadata, loading/error/not-found boundaries.
- `src/components`: shared UI, layout and catalogue presentation.
- `src/modules/catalog`: validated catalogue types, repositories, search and configuration rules; pure functions can be tested without React.
- `src/modules/media`: image-path resolution.
- `src/lib/env`: validated public/server configuration.
- `src/lib/supabase`: typed anonymous, browser, cookie-aware server and isolated service-role clients.
- `supabase/migrations`: schema history and access controls.
- `scripts`, `tests`: reproducible fixtures/types and validation.

Public database reads use a stateless anonymous client and a 60-second cache. There is no fallback to fixtures after a database failure. Read pages are fetched in batches to avoid PostgREST row truncation; filtering and pagination run server-side over the cached small catalogue. Move filtering into SQL when catalogue size justifies it.

The homepage copy and section arrangement live in the homepage component for Phase 1. Phase 2 adds content management. Future pricing, currency, tax, shipping, discounts, cart, checkout, orders, payments/stripe, refunds, fulfilment and email modules must own their business rules outside UI components.

## Stripe test setup

Deferred to Phase 5. There is no Stripe SDK, checkout route, webhook or payment credential requirement in this phase. When implemented, use test credentials, Stripe-hosted payment fields, verified idempotent webhooks and immutable server-calculated order snapshots as specified in `SPEC.md`.

## Deployment

Import the repository into Vercel, choose Node.js 22, use `npm ci` and `npm run build`, and set the environment variables for the appropriate preview environment. The build uses Next.js's supported webpack bundler; development uses Turbopack.

For a Supabase-backed preview, create a development/staging Supabase project, link it with `npx supabase link --project-ref <project-ref>`, review `npx supabase db push --dry-run`, and apply the migrations with `npx supabase db push`. Do not apply sample seeds to production. A new remote database has an empty catalogue until approved data is added. The build must be able to reach Supabase.

All pages intentionally carry `noindex` while this is a catalogue preview. See [DECISIONS.md](DECISIONS.md) for phase boundaries and unresolved production decisions. Launch, SEO/migration, real commerce configuration and production hardening remain later phases.
