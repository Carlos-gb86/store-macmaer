# Macmaer

Next.js storefront and catalogue administration. Read [SPEC.md](SPEC.md) before architectural or domain changes. **Phases 0–5 are implemented.** Checkout remains safely disabled until Stripe webhooks and the launch policies are approved; fulfilment and transactional email remain deferred.

## Setup and environment

Use Node **22.12+** (`.nvmrc` pins Node 22):

```sh
nvm use
npm ci
cp .env.example .env.local # only if it does not already exist
npm run dev
```

Open http://localhost:3000. `CATALOG_SOURCE=demo` explicitly uses illustrative fixtures. `CATALOG_SOURCE=supabase` (default) requires the connected project's URL, publishable key, and server-only service-role key; database errors never fall back to samples. Public routes are `/`, `/shop`, `/collections`, `/collections/[slug]`, `/products/[slug]`, and `/cart`.

| Variable                               | Purpose                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `CATALOG_SOURCE`                       | `demo` or `supabase`.                                                                                                              |
| `NEXT_PUBLIC_SITE_URL`                 | Application URL for the deployment.                                                                                                |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API URL.                                                                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key or local legacy anon key.                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only Supabase secret key required for anonymous cart persistence. The existing name also supports legacy service-role keys. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Stripe publishable key. Use a sandbox key locally and the matching live key only in production.                                    |
| `STRIPE_SECRET_KEY`                    | Server-only Stripe secret key. Never expose it through a `NEXT_PUBLIC_*` variable.                                                 |
| `STRIPE_WEBHOOK_SECRET`                | Signing secret for this deployment's `/api/stripe/webhook` endpoint.                                                               |
| `CUSTOMER_IDENTITY_HASH_SECRET`        | At least 32 random characters used to HMAC normalized email and phone identities for discount enforcement.                         |
| `CHECKOUT_ENABLED`                     | Explicit `true` opens checkout; absent or `false` keeps all PaymentIntent creation disabled.                                       |
| `NEXT_BUILD_DIR`                       | Optional isolated build directory, used by browser tests.                                                                          |

Actual `.env*` files are ignored. `SUPABASE_SERVICE_ROLE_KEY` may contain Supabase's newer secret API key; despite the backwards-compatible variable name, a legacy JWT is not required. Never expose this credential through `NEXT_PUBLIC_*`. Validation errors identify fields without printing values. Rebuild after changing public variables.

## Cart, destination, currency, and quotes

Supabase mode enables anonymous server-persisted carts. The browser receives a random HTTP-only cart token; only its SHA-256 hash is stored in Postgres. Cart inputs contain product/configuration references and quantity, never trusted prices. Every cart read and mutation reloads the live product, resolves the variant and options, checks availability and tracked inventory, and recalculates prices server-side. Different custom or repeated selections remain separate lines; identical configurations merge. The server then applies any valid discount, selects a configured shipping rule, calculates destination VAT, and converts the reconciled quote for display. The cart clearly remains an estimate until Phase 5 confirms the shipping address and creates an immutable order snapshot.

SEK remains the canonical catalogue currency. The storefront currency and shopping destination are independent HTTP-only preferences, defaulting to SEK and Sweden. `/admin/settings/currency` controls currency availability, conversion markup and rounding, and can fetch ECB reference rates. Rates are append-only with source/effective timestamps; EUR or USD stays unavailable until a real rate has been stored. No exchange rates are seeded or invented. The destination selector is limited to the shipping-country allow-list managed in admin.

Catalogue amounts are fixed customer-facing selling prices. For VAT destinations, VAT is extracted from—not added to—that amount. For a 500 SEK product sent to Sweden, the quote therefore shows 400 SEK net plus 100 SEK VAT; a non-EU customer sees the same 500 SEK selling price with zero Swedish/EU VAT. Shipping can independently be configured as VAT-inclusive or VAT-exclusive.

`/admin/settings/shipping` manages countries, arbitrary zones, services, package classes, weight/subtotal bands, rule priority, free-shipping thresholds, and flat, per-item, or base-plus-additional-item formulas. The initial data assigns the 33 approved destinations to Sweden, United States, EU VAT, and Other non-EU zones. Sweden starts at 80 SEK including VAT; the other zones start at 250 SEK, including VAT in the EU zone and excluding VAT elsewhere. These are database configuration, not application constants.

`/admin/settings/tax` manages the EU strategy, catalogue price mode, export treatment, tax categories, destination rates, effective dates, source notes, and review status. The initial destination/OSS rates came from the European Commission's current standard-rate table and deliberately remain marked for owner/accountant review. Monaco follows France for VAT; Åland and Greenland are treated as non-EU VAT territories. Regional exceptions within Spain and Portugal require additional address-level handling before selling to excluded territories.

`/admin/discounts` manages percentage/fixed codes, dates, minimums, usage limits, and product/collection restrictions. `MACMAER10` is initially active for 10% with one use per customer. Cart eligibility is authoritative on the server. Phase 5 will collect both email and phone and atomically reserve/redeem against the stored identity hashes; Phase 4 does not claim to enforce identity reuse before checkout has those fields.

Demo catalogue mode remains intentionally non-purchasable and does not fabricate converted prices.

## Checkout, orders, and Stripe

Phase 5 creates immutable server-priced order snapshots, atomic `MAC-YYYY-NNNNNN` order numbers, inventory reservations, and one-customer discount reservations before creating a Stripe PaymentIntent. Only opaque order references are sent to Stripe. The signed webhook is authoritative for payment success, commits inventory exactly once, redeems the discount, and closes the cart. Cards are enabled first; Stripe's card payment method also presents Apple Pay or Google Pay when the browser, device, domain, and Stripe account are eligible. Klarna remains deferred.

Checkout is fail-closed. Keep `CHECKOUT_ENABLED=false` (or omit it) in production until all five policies are approved and published, the live webhook exists, and a live-mode acceptance payment is authorized. Local sandbox testing requires the matching `pk_test_`, `sk_test_`, and webhook signing secret. With the Stripe CLI installed and authenticated, forward the four subscribed events with:

```sh
npm run stripe:listen
```

Keep that process running while testing. A forwarded event prints a `<-- [200] POST` response; seeing only incoming `-->` event lines means the CLI is listening without forwarding. Copy the command's `whsec_...` value into local `STRIPE_WEBHOOK_SECRET`, generate a separate `CUSTOMER_IDENTITY_HASH_SECRET`, set `CHECKOUT_ENABLED=true`, and restart development. If a restarted listener prints a different signing secret, update the local value and restart Next.js. Never put live Stripe keys in the local file. For production, create a Stripe endpoint at `https://YOUR_PRODUCTION_DOMAIN/api/stripe/webhook` with the same four events and store that endpoint's separate signing secret in Vercel.

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

All specified option types are supported. Repeated selections configure a product without generating Cartesian-product variants. Forms send decimal strings; the server parses money with integer arithmetic. Products reference configurable tax and shipping classes. Atomic RPCs preserve retained child IDs, reject stale `updated_at` values, and roll back invalid nested edits. Failed saves preserve local form values.

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

Migrations `001`–`002` retain the original Phase 1 history. Migrations through `011` add admin RLS, content/media, append-only audit records, atomic mutations, global SKU uniqueness, media leases, secure carts/currency, Phase 4 shipping/tax/discount configuration, Phase 5 order/payment/reservation/webhook state, and versioned policy snapshots. `npm run db:types` introspects checked-in SQL with embedded PostgreSQL, including callable RPCs. SDK relationship inference is intentionally omitted; repositories use validated read models.

`npm run seed:generate` generates deterministic fixture IDs from `src/modules/catalog/fixtures/catalogue.json`. Seeds use `ON CONFLICT DO NOTHING`, preserve existing rows, and are not a catalogue updater. After local checks, stage explicitly:

```sh
npx supabase link --project-ref YOUR_STAGING_REF
npx supabase db push --linked --dry-run
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --migrate
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --admin-email owner@example.com
npm run staging:setup -- --target staging --project-ref YOUR_STAGING_REF --seed
```

The command requires a staging target, matching linked-project metadata, and a matching `.env.local` URL. It never resets a database. Samples contain illustrative data, not approved business prices. The recorded staging project is `pvdxqtyklfdzukawbtps`; verify its migration list before use rather than assuming it matches local development. The confirmed owner account has administrator membership, and hosted public signup is disabled.

Audit history covers product status changes, collection edits, and homepage publication. Structured failure logs omit credentials and form contents.

## Verification

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run integration:setup
npm run test:integration
npm run test:admin
npm run test:commerce
npm run build
```

`check` runs lint, strict types, formatting, and unit/database tests. PGlite executes migrations with small Auth/Storage scaffolds. Real integration tests require local Supabase and cover Auth, RLS, refresh/revocation, private Storage, decoding, and publication compensation. The commerce browser suite uses local Supabase and deterministic test-only FX rows to cover cart persistence, configurations, currency/destination context, quantities, removal, destination VAT, shipping, and discounts. Admin browser coverage includes the three Phase 4 configuration areas. Setup creates disposable accounts and writes credentials only to ignored `.env.integration.json` (0600). Integration/browser setup rejects hosted targets.

Storefront browser tests use demo data on port 3100; admin tests use local Supabase on 3200 and separate anonymous contexts. Both have isolated build directories. Run integration and admin suites sequentially because revocation tests alter the shared local test administrator. For staging acceptance, build with `.env.local` selecting the connected project.

Phase 2 acceptance on 2026-09-05: lint, formatting, strict types, 38 unit/database/action tests, 5 real Supabase integration tests, 8 storefront browser checks, 10 admin browser checks, and the staging-backed production build passed. Expired cookie session refresh and production private/no-store admin response headers were verified.

Admin refinement on 2026-09-07: 51 unit/database/action tests, 6 real Supabase integration tests, 13 admin browser checks, and 8 storefront browser checks passed. Desktop/phone layouts, tag dialogs, visual gallery uploads, and WebP processing were verified. Lint, formatting, strict types, and the staging-backed production build passed.

Phase 4 acceptance on 2026-09-09: 72 unit/database/action checks, 6 real Supabase integration checks, 15 admin browser checks, 8 commerce browser checks, and 8 storefront browser checks passed. The clean local migration/reset, database lint, strict types, formatting, lint, and demo-mode production build passed. Database lint retains one pre-existing unused-variable warning in the Phase 2 product validator.

Phase 5 acceptance on 2026-09-10: 79 unit/database/action checks and 10 desktop/mobile commerce browser checks passed. A clean local reset applied migrations through `010`, the production build completed, and the linked production database reported no pending migrations. Checkout remains deliberately disabled pending policy approval and Stripe webhook acceptance.

## Architecture and deployment

- `src/app/(storefront)` and `src/app/admin`: separate public/admin layouts.
- `src/modules/catalog`: read models, filtering, shared configuration validation.
- `src/modules/pricing`, `currency`, `country`: configured-price/FX logic and persisted storefront context.
- `src/modules/cart`: canonical option snapshots, secure anonymous ownership, validation, and persistence.
- `src/modules/quote`, `shipping`, `tax`, `discount`: server-authoritative quote orchestration and isolated commerce rules.
- `src/modules/checkout`, `payments`: immutable order snapshots, inventory/discount reservations, Stripe PaymentIntents, and idempotent webhook reconciliation.
- `src/modules/admin`: authorization, inputs, actions, money parsing, media lifecycle.
- `src/modules/content`: homepage persistence and structured rich text.
- `src/lib/supabase`: typed stateless public, browser, cookie server, isolated service clients.
- `supabase/migrations`, `scripts`, `tests`: reproducible schema, setup, validation.

Public catalogue reads use a stateless anonymous client and 60-second cache with immediate admin invalidation. Request-specific context and carts are never put in that shared cache. Admin lists query PostgreSQL with search/status filters and pagination. The media picker currently shows the most recent 500 assets; revisit search/pagination as the catalogue grows.

Deploy to Vercel with Node 22, `npm ci`, `npm run build`, and preview environment variables. Production builds use webpack; development uses Turbopack. All pages intentionally remain `noindex`. Checkout, order/payment snapshots, Stripe, transactional email, policies, and launch hardening belong to later phases. See [DECISIONS.md](DECISIONS.md).
