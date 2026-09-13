# Macmaer production runbook

This runbook covers the Next.js storefront hosted by Vercel, Supabase data and Storage, Stripe payments, and Resend transactional email. It never requires copying secrets into tickets or logs.

## Current soft-launch posture

- Canonical origin: stable `store-macmaer.vercel.app` production alias.
- Existing public shop: `macmaer.com` remains on WordPress.
- Intended future storefront: `macmaer.se`, not yet connected.
- Search: `SEO_INDEXING_ENABLED=false` until the custom domain and content are approved.
- Email identity: `info@macmaer.com` for orders and `contact@macmaer.com` for enquiries, independently of the storefront domain.

Review `/admin/settings/readiness` after every production deployment and before changing a feature gate.

## Routine checks

1. Confirm the latest Vercel production deployment is healthy and inspect Functions error rate and Runtime Logs.
2. Open `/`, one product, `/cart`, `/checkout`, `/robots.txt`, and `/sitemap.xml` from a private browser window.
3. Confirm `/admin` redirects to login when signed out, then sign in and check Orders, failed email deliveries on recent orders, and Launch readiness.
4. In Stripe, check that the webhook destination is enabled and its recent deliveries return HTTP 200. It must subscribe to `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `refund.created`, `refund.updated`, and `refund.failed`.
5. In Resend, review delivery failures and domain status without changing the existing `macmaer.com` mail-receiving MX records.
6. In Supabase, review Security and Performance Advisors, current database size, and the latest available backup.

## Safe incident switches

Environment switches require a Vercel production redeployment.

- Payment creation problem: set `CHECKOUT_ENABLED=false`. The signed webhook remains active so already-created payments can still reconcile.
- Refund-provider problem: set `REFUNDS_ENABLED=false`. Existing refund webhook events remain processable.
- Resend problem: set `EMAIL_ENABLED=false`. Orders, fulfilments, refunds, and enquiries continue to save; delivery can be retried after recovery.
- SEO/canonical problem: set `SEO_INDEXING_ENABLED=false` and redeploy.

Do not delete orders, payments, refund rows, webhook events, or email-delivery history during an incident. Never retry a customer payment merely because the browser confirmation is delayed; check the order and Stripe PaymentIntent first.

## Deployment and rollback

Before deployment:

```sh
npm ci
npm run check
npm run build
```

Apply new database migrations before deploying code that requires them. Use a dry run first and never reset a hosted database. After deployment, verify the routine URLs and security headers, then check Vercel Runtime Logs.

For an application-only regression, promote the last known-good Vercel deployment. A code rollback does not reverse database migrations; migrations must remain backward-compatible with the previous application until the deployment is verified. Create a corrective migration instead of editing or deleting applied migration history.

## Backup and recovery ownership

Before launch, record the Supabase plan and retention in the private operating notes, confirm a recent backup in Database → Backups, and name the person authorized to restore it. Daily database backups do not contain Storage objects. Keep a separate periodic export of the `catalogue` and `catalogue-drafts` Storage buckets plus the migration repository.

A restore is a maintenance event: disable new checkout, confirm Stripe's state for any payments near the recovery point, restore or clone the database through Supabase, reconcile Stripe events created after that point, verify Storage objects separately, and only then reopen checkout. Test the procedure on a non-production project before relying on it.

## Final custom-domain acceptance

After `macmaer.se` is owned:

1. Add `macmaer.se` and `www.macmaer.se` to Vercel; make the apex canonical and redirect `www`.
2. Point only the `.se` DNS records to Vercel and wait for TLS/domain verification.
3. Set `NEXT_PUBLIC_SITE_URL=https://macmaer.se` in Vercel Production and redeploy with indexing still disabled.
4. Register both reachable hostnames in Stripe payment method domains.
5. Confirm canonical metadata, sitemap, robots, wallet availability, responsive layout, and email delivery.
6. Submit one deliberately small live payment and immediately test the normal admin refund workflow.
7. Export/crawl the WordPress URLs, finish the path-preserving redirect map, and review final catalogue, VAT, shipping, and policies.
8. Redirect `macmaer.com` and `www.macmaer.com` to the new storefront while preserving its email DNS records.
9. Set `SEO_INDEXING_ENABLED=true`, redeploy, and verify the live robots and sitemap output.
