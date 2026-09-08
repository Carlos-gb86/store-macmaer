# Macmaer

Next.js storefront and catalogue administration. Read [SPEC.md](SPEC.md) before architectural or domain changes. **Phases 0–2 are implemented and verified.** Cart, customer pricing, tax, shipping, checkout, and payments remain deferred.

## Setup and environment

Use Node **22.12+** (`.nvmrc` pins Node 22):

```sh
nvm use
npm ci
cp .env.example .env.local # only if it does not already exist
npm run dev
```

Open http://localhost:3000. `CATALOG_SOURCE=demo` explicitly uses illustrative fixtures. `CATALOG_SOURCE=supabase` (default) requires the connected project's URL and publishable key; database errors never fall back to samples. Public routes remain `/`, `/shop`, `/collections`, `/collections/[slug]`, `/products/[slug]`.

| Variable                               | Purpose                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `CATALOG_SOURCE`                       | `demo` or `supabase`.                                                              |
| `NEXT_PUBLIC_SITE_URL`                 | Application URL for the deployment.                                                |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API URL.                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key or local legacy anon key.                                          |
| `SUPABASE_SERVICE_ROLE_KEY`            | Optional isolated server credential; unused by normal admin/storefront operations. |
| `NEXT_BUILD_DIR`                       | Optional isolated build directory, used by browser tests.                          |

Actual `.env*` files are ignored. Never expose service credentials through `NEXT_PUBLIC_*`. Validation errors identify fields without printing values. Rebuild after changing public variables.

## Administrator access

1. In Supabase Dashboard → Authentication → Users → Add user, create an email/password account, confirm its email, and set its password privately. This workflow does not send invitations.
2. Disable **Allow new users to sign up** in hosted Auth settings, but keep the **Email provider enabled**. Local `supabase/config.toml` sets `auth.enable_signup=false` and `auth.email.enable_signup=true`: the latter controls the email provider, including existing-user login. Setting both to false disables password login. Account/password management stays in Dashboard; no public signup or recovery UI is provided.
3. Grant allow-list membership through trusted database/CLI access:

```sql
insert into private.admin_users(user_id)
select id from auth.users where lower(email) = lower('owner@example.com')
on conflict do nothing;
```

The staging command below performs this lookup and fails for a missing account. To revoke access, delete its UUID from `private.admin_users`; existing sessions lose access on the next protected request. Users cannot assign themselves membership.

Sign in at `/admin/login`. Every protected page, action, upload, and preview verifies both the Auth identity and current allow-list membership. `src/proxy.ts` refreshes cookies. Admin responses are dynamic and private; ordinary operations use the authenticated user's client and RLS, without service-role bypass.

## Catalogue and homepage workflow

Create a draft, enter descriptions, SEK prices, inventory/processing details, options, valid SKU combinations, memberships, and imagery. Save, preview, and publish. Saving an active product updates it immediately. Products are archived, then optionally restored to drafts. Duplicates receive new identities and require a unique SKU before publication.

All specified option types are supported. Repeated selections configure a product without generating Cartesian-product variants. Forms send decimal strings; the server parses money with integer arithmetic. Tax classification remains unconfigured until Phase 4. Atomic RPCs preserve retained child IDs, reject stale `updated_at` values, and roll back invalid nested edits. Failed saves preserve local form values.

The admin editor groups pricing, availability, and fulfilment separately. Customer options and stock variants have collapsible summaries, contextual help, and settings appropriate to the selected option type. Tags can be created in a dialog directly from an unsaved product, or managed from the tags list. Image selection uses a searchable thumbnail dialog; gallery uploads are added directly and can be ordered with a drag grip or keyboard buttons.

Collections can be deactivated. Tags can be renamed, merged, or deleted when unused. `/admin/content` publishes fixed homepage fields and ordered featured products/collections; inactive references are skipped publicly. Successful actions immediately invalidate `catalogue`/`content` cache tags with `updateTag()`.

## Media and descriptions

Direct browser uploads use authorized signed URLs for private `catalogue-drafts` Storage. Before acceptance, the server fully decodes bytes and verifies format, dimensions, and size: still JPEG, PNG, WebP, AVIF; maximum 10 MiB and 40 megapixels. SVG, corrupt images, and MIME mismatches are rejected.

New uploads are automatically oriented, resized to fit within 2400 × 2400 pixels without enlargement, and encoded as WebP at quality 82. Embedded metadata is stripped and transparency retained. The registry records the processed dimensions, byte size, and MIME type; publication copies the processed image. Existing published files keep their current references and are not rewritten by this update.

Admin previews use five-minute signed URLs and bypass Next's public image optimizer. Refresh after expiration. A registry tracks shared gallery, variant, swatch, collection, and homepage references. Gallery controls include primary selection, alt text, variant association, drag ordering, and keyboard move buttons.

Publication prepares copies in public `catalogue` Storage before committing references. Failed saves preserve the prior catalogue state and attempt compensation. Failed cleanup remains recorded for retry in `/admin/media`. Database leases serialize asset publication/cleanup. Files can only be deleted when no references or active leases remain; new upload URLs expire after two hours. Archiving does not make previously published images confidential.

Descriptions use open-source Tiptap. Structured JSON permits paragraphs, headings, bold/italic, lists, links, and line breaks, validated server-side and rendered by an allow-listed React renderer. Plain-text projections remain for compatibility and search.

## Database and staging

Start Docker Desktop, then `npm run db:start`. `npm run db:reset` replaces **disposable local data only**. If Docker cannot mount optional Studio folders, use `npx supabase start --exclude studio,edge-runtime,logflare,vector`. Never reset hosted data.

Migrations `001`–`002` retain the original Phase 1 history. New migrations add admin RLS, content/media, append-only audit records, atomic mutations, global SKU uniqueness, and media leases. `npm run db:types` introspects checked-in SQL with embedded PostgreSQL, including callable RPCs. SDK relationship inference is intentionally omitted; repositories use validated read models.

`npm run seed:generate` generates deterministic fixture IDs from `src/modules/catalog/fixtures/catalogue.json`. Seeds use `ON CONFLICT DO NOTHING`, preserve existing rows, and are not a catalogue updater. After local checks, stage explicitly:

```sh
npx supabase link --project-ref YOUR_STAGING_REF
npx supabase db push --linked --dry-run
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --migrate
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --admin-email owner@example.com
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --seed
```

The command requires a staging target, matching linked-project metadata, and a matching `.env.local` URL. It never resets a database. Samples contain illustrative data, not approved business prices. The current staging project is `pvdxqtyklfdzukawbtps`. All six migrations are applied, with six active samples and one private draft. The confirmed owner account has administrator membership, and hosted public signup is disabled.

Audit history covers product status changes, collection edits, and homepage publication. Structured failure logs omit credentials and form contents.

## Verification

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run integration:setup
npm run test:integration
npm run test:admin
npm run build
```

`check` runs lint, strict types, formatting, and unit/database tests. PGlite executes migrations with small Auth/Storage scaffolds. Real integration tests require local Supabase and cover Auth, RLS, refresh/revocation, private Storage, decoding, and publication compensation. Setup creates disposable accounts and writes credentials only to ignored `.env.integration.json` (0600). Integration/browser setup rejects hosted targets.

Storefront browser tests use demo data on port 3100; admin tests use local Supabase on 3200 and separate anonymous contexts. Both have isolated build directories. Run integration and admin suites sequentially because revocation tests alter the shared local test administrator. For staging acceptance, build with `.env.local` selecting the connected project.

Phase 2 acceptance on 2026-09-05: lint, formatting, strict types, 38 unit/database/action tests, 5 real Supabase integration tests, 8 storefront browser checks, 10 admin browser checks, and the staging-backed production build passed. Expired cookie session refresh and production private/no-store admin response headers were verified.

Admin refinement on 2026-09-07: 51 unit/database/action tests, 6 real Supabase integration tests, 13 admin browser checks, and 8 storefront browser checks passed. Desktop/phone layouts, tag dialogs, visual gallery uploads, and WebP processing were verified. Lint, formatting, strict types, and the staging-backed production build passed.

## Architecture and deployment

- `src/app/(storefront)` and `src/app/admin`: separate public/admin layouts.
- `src/modules/catalog`: read models, filtering, shared configuration validation.
- `src/modules/admin`: authorization, inputs, actions, money parsing, media lifecycle.
- `src/modules/content`: homepage persistence and structured rich text.
- `src/lib/supabase`: typed stateless public, browser, cookie server, isolated service clients.
- `supabase/migrations`, `scripts`, `tests`: reproducible schema, setup, validation.

Public reads use a stateless anonymous client and 60-second cache with immediate admin invalidation. Admin lists query PostgreSQL with search/status filters and pagination. The media picker currently shows the most recent 500 assets; revisit search/pagination as the catalogue grows.

Deploy to Vercel with Node 22, `npm ci`, `npm run build`, and preview environment variables. Production builds use webpack; development uses Turbopack. All pages intentionally remain `noindex`. Commerce, transactional email, policies, and launch hardening belong to later phases. See [DECISIONS.md](DECISIONS.md).
