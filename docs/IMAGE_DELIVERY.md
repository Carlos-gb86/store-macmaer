# Public catalogue image delivery

Published image URLs still refer to Supabase Storage. The storefront sends immutable, application-managed public catalogue images through `/api/catalogue-images` before Next's responsive image optimizer. Different widths and qualities therefore share the same original download instead of independently requesting Supabase on a cold cache.

The endpoint only accepts the existing UUID upload paths and content-hashed WooCommerce paths. It constructs the upstream URL from the configured Supabase origin, never a caller-supplied host. Signed private previews and unrelated images are not routed through this public cache. No service-role key, authentication cookie, or private Storage access is used.

## Caches and limits

- Successful original downloads use Next's persistent fetch cache with a one-year lifetime. Public responses are also immutable and CDN-cacheable for one year. This assumes managed paths are never overwritten: uploads use unique UUIDs and WooCommerce imports use content hashes.
- An additional 40 MiB in-process LRU cache and same-path request coalescing prevent repeated downloads, including development reloads that bypass Next's persistent fetch cache.
- Each running server instance allows four concurrent cold downloads, at most 80 pending unique paths, and an eight-second queue wait. These are per-instance limits, not a distributed global Storage quota.
- Downloads have a ten-second attempt timeout, at most three attempts, and a 35-second post-queue budget. Rate limits and upstream server failures trigger exponential backoff and respect `Retry-After`; excessively long waits return a temporary failure instead of hammering Storage. Connection resets and interrupted body reads are retried too.
- Bodies are limited to 10 MiB and accepted formats are WebP, JPEG, PNG and AVIF. Errors are returned with `no-store`, not cached as images. Next's responsive width/quality optimization remains enabled.

The defaults live in [the cache module](../src/modules/media/catalogue-image-cache.ts); persistent cache and response headers live in [the endpoint](../src/app/api/catalogue-images/route.ts). New local image query patterns are restricted to `/images/**` and the validated endpoint.

## Browser recovery

The shared catalogue image component retries failed images twice with increasing delays and jitter. Each retry uses a fresh optimizer URL but the same original-image cache key. During recovery the broken image is hidden behind a subtle loading surface. If recovery fails, a localized, accessible unavailable-image placeholder replaces the browser's broken-image icon and exposed alt text. Retries stop; changing to another gallery image remains possible. Alt text remains available to assistive technology.

## Product gallery navigation

The embedded gallery keeps a stable portrait viewport (3:4 width-to-height) with the page background around its contained main photo; card and thumbnail cropping are unchanged. The full-screen viewer retains its existing contained-image layout. Both use the shared `GalleryCarousel` two-slide viewport and a 300 ms transform-only transition, with no carousel dependency or full-gallery image preload.

Arrow, keyboard and completed-swipe directions remain explicit when wrapping. Thumbnail jumps use the displayed index versus the requested index. Rapid requests coalesce to the latest intended destination; sequence-checked completion prevents stale animation callbacks from affecting a newer transition. Touch tracks horizontal finger movement and snaps short drags back; vertical scrolling and click-to-open remain intact. Only the open viewer owns transition completion. The previous photo remains visible while a replacement loads or finishes bounded error recovery.

Reduced-motion navigation is immediate, and changing that preference finishes an active transition. Opening/closing the lightbox does not animate between images. Unit navigation tests and `tests/e2e/gallery-carousel.spec.ts` cover direction, wrapping, rapid requests, mixed aspect ratios, loading, touch, reduced motion and single-image products.

## Deployment and diagnosis

No database migration, Storage rewrite, or new environment variable is needed. Deploy the source changes to Vercel; restart local development if the updated Next configuration has not been picked up.

HTTP 429 indicates an upstream refusal, not necessarily a missing image. Supabase documents Storage 429 errors caused by excessive concurrent clients in its [Storage error guide](https://supabase.com/docs/guides/storage/debugging/error-codes). If failures persist after deployment, check Storage logs, CDN hit/miss behaviour, and project capacity. This reduces origin pressure and provides bounded recovery; it cannot guarantee image availability during a provider outage. Do not automatically upgrade paid infrastructure or change database connection limits without confirming the cause.

Run `npm run check` for unit, type, lint and formatting checks. Run `npm run test:e2e -- --grep 'image|public catalogue'` for desktop/mobile recovery, prolonged failures, path validation, catalogue browsing and gallery checks. Browser tests simulate failures against local demo images and do not modify production data.
