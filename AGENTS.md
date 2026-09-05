# AGENTS.md

## Project

Macmaer e-commerce platform.

## Source of truth

Read SPEC.md before implementing architectural or domain changes.

## Stack

- Next.js
- TypeScript
- Supabase
- Stripe
- Vercel

## Development rules

- Never trust client-calculated prices.
- All tax/shipping/order totals are calculated server-side.
- Never store payment-card information.
- Use database migrations for schema changes.
- Add tests for commerce-critical logic.
- Preserve type safety; avoid `any`.
- Do not hard-code VAT rates, exchange rates, or shipping prices.
- Keep business logic separate from UI components.
- Do not expose service-role secrets to the browser.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
