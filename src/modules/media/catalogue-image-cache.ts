import "server-only";

export type CachedImage = {
  bytes: Buffer;
  contentType: string;
  etag: string | null;
};
export class ImageUnavailableError extends Error {
  constructor(
    public readonly status = 503,
    public readonly retryAfter = 5,
  ) {
    super("Catalogue image temporarily unavailable.");
  }
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0)
    return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

// Per-process bulkhead and request coalescing complement Next's persistent fetch
// cache. Width/quality variants all share one original download, including in dev.
export function createCatalogueImageCache({
  fetchImage,
  concurrency = 4,
  maxBytes = 40 * 1024 * 1024,
  maxEntryBytes = 10 * 1024 * 1024,
  maxPending = 80,
  queueWaitMs = 8000,
  now = () => Date.now(),
  sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  jitter = () => Math.floor(Math.random() * 250),
}: {
  fetchImage: (src: string) => Promise<Response>;
  concurrency?: number;
  maxBytes?: number;
  maxEntryBytes?: number;
  maxPending?: number;
  queueWaitMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  jitter?: () => number;
}) {
  const cached = new Map<string, CachedImage>();
  const pending = new Map<string, Promise<CachedImage>>();
  const waiting: (() => void)[] = [];
  let active = 0;
  let cacheBytes = 0;
  let cooldownUntil = 0;
  async function acquire() {
    if (active < concurrency) {
      active++;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(resume);
        if (index >= 0) waiting.splice(index, 1);
        reject(new ImageUnavailableError());
      }, queueWaitMs);
      waiting.push(resume);
    });
  }
  function release() {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
  async function download(src: string): Promise<CachedImage> {
    await acquire();
    const deadline = now() + 35000;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        while (cooldownUntil > now()) {
          const cooldown = cooldownUntil - now();
          if (cooldown > 15000 || now() + cooldown + 10000 > deadline)
            throw new ImageUnavailableError(429, Math.ceil(cooldown / 1000));
          await sleep(cooldown);
        }
        if (now() + 10000 > deadline) throw new ImageUnavailableError();
        try {
          const response = await fetchImage(src);
          if (!response.ok) {
            await response.body?.cancel();
            const retryable = response.status === 429 || response.status >= 500;
            if (retryable) {
              const delay = Math.max(
                750 * 2 ** attempt + jitter(),
                retryAfterMilliseconds(
                  response.headers.get("retry-after"),
                  now(),
                ),
              );
              cooldownUntil = Math.max(cooldownUntil, now() + delay);
              if (attempt < 2 && delay <= 15000) continue;
              throw new ImageUnavailableError(
                response.status,
                Math.max(1, Math.ceil(delay / 1000)),
              );
            }
            throw new ImageUnavailableError(response.status);
          }
          const contentType =
            response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
          if (
            !/^image\/(?:webp|jpeg|png|avif)$/u.test(contentType) ||
            Number(response.headers.get("content-length")) > maxEntryBytes
          ) {
            await response.body?.cancel();
            throw new ImageUnavailableError(502);
          }
          const reader = response.body?.getReader();
          if (!reader) throw new ImageUnavailableError(502);
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              bytes += chunk.value.byteLength;
              if (bytes > maxEntryBytes) {
                await reader.cancel();
                throw new ImageUnavailableError(502);
              }
              chunks.push(chunk.value);
            }
          } finally {
            reader.releaseLock();
          }
          if (!bytes) throw new ImageUnavailableError(502);
          return {
            bytes: Buffer.concat(chunks, bytes),
            contentType,
            etag: response.headers.get("etag"),
          };
        } catch (error) {
          if (error instanceof ImageUnavailableError) throw error;
          if (attempt === 2) throw new ImageUnavailableError();
          // Timeouts, connection resets and interrupted body reads are transient.
          await sleep(750 * 2 ** attempt + jitter());
        }
      }
      throw new ImageUnavailableError();
    } finally {
      release();
    }
  }
  return async (src: string) => {
    const hit = cached.get(src);
    if (hit) {
      cached.delete(src);
      cached.set(src, hit);
      return hit;
    }
    const inFlight = pending.get(src);
    if (inFlight) return inFlight;
    if (pending.size >= maxPending) throw new ImageUnavailableError();
    const work = download(src).then((image) => {
      if (image.bytes.length <= maxBytes) {
        cached.set(src, image);
        cacheBytes += image.bytes.length;
        while (cacheBytes > maxBytes) {
          const oldest = cached.keys().next().value;
          if (!oldest) break;
          cacheBytes -= cached.get(oldest)!.bytes.length;
          cached.delete(oldest);
        }
      }
      return image;
    });
    pending.set(src, work);
    try {
      return await work;
    } finally {
      pending.delete(src);
    }
  };
}
