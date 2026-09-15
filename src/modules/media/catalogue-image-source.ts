// Only immutable, application-managed public images are eligible for shared caching.
// Signed/private URLs and unrelated hosts must never enter this public endpoint.
export function isManagedImagePath(path: string) {
  return /^(?:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\/image\.(?:webp|jpg|jpeg|png|avif)|woocommerce\/sha256\/[a-f0-9]{64}\/image\.webp)$/u.test(
    path,
  );
}

export function catalogueImageSource(src: string, storageUrl?: string) {
  if (!storageUrl) return src;
  try {
    const url = new URL(src);
    const storage = new URL(storageUrl);
    const prefix = "/storage/v1/object/public/catalogue/";
    if (
      url.origin !== storage.origin ||
      !url.pathname.startsWith(prefix) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return src;
    const path = url.pathname.slice(prefix.length);
    return isManagedImagePath(path)
      ? `/api/catalogue-images?path=${encodeURIComponent(path)}`
      : src;
  } catch {
    return src;
  }
}

export function imageRetrySource(src: string, attempt: number) {
  // Do not alter signed URLs. Internal retries use the same origin-cache key,
  // but a fresh optimizer/browser URL so a failed response cannot stick.
  if (
    !attempt ||
    (!src.startsWith("/api/catalogue-images?") && !src.startsWith("/images/"))
  )
    return src;
  const url = new URL(src, "https://local.invalid");
  url.searchParams.set("_image_retry", String(attempt));
  return url.pathname + url.search;
}
