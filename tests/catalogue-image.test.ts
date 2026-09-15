import { describe, expect, it, vi } from "vitest";
import {
  catalogueImageSource,
  imageRetrySource,
  isManagedImagePath,
} from "@/modules/media/catalogue-image-source";
import {
  createCatalogueImageCache,
  ImageUnavailableError,
  retryAfterMilliseconds,
} from "@/modules/media/catalogue-image-cache";

const hash = "a".repeat(64);
const path = `woocommerce/sha256/${hash}/image.webp`;
const origin = "https://example.supabase.co";
const response = (body = "image") =>
  new Response(body, {
    headers: { "content-type": "image/webp", etag: '"photo"' },
  });

describe("catalogue image sources", () => {
  it("proxies only immutable managed public images on the configured origin", () => {
    const url = `${origin}/storage/v1/object/public/catalogue/${path}`;
    expect(catalogueImageSource(url, origin)).toBe(
      `/api/catalogue-images?path=${encodeURIComponent(path)}`,
    );
    expect(
      isManagedImagePath("11111111-1111-4111-8111-111111111111/image.webp"),
    ).toBe(true);
    for (const source of [
      "/images/photo.jpg",
      url.replace("public/catalogue", "sign/catalogue-drafts") +
        "?token=secret",
      url.replace("example.supabase", "another.supabase"),
      url + "?version=2",
      `${origin}/storage/v1/object/public/catalogue/../private/photo.webp`,
      `${origin}/storage/v1/object/public/catalogue/not-managed.webp`,
    ]) {
      expect(catalogueImageSource(source, origin)).toBe(source);
    }
    for (const invalid of [
      "../image.webp",
      "/image.webp",
      `${path}/../image.webp`,
      `${path}%2fextra`,
      "https://other.example/photo.webp",
    ])
      expect(isManagedImagePath(invalid)).toBe(false);
  });
  it("uses fresh retry URLs without changing signed URL tokens or the storage path", () => {
    const internal = catalogueImageSource(
      `${origin}/storage/v1/object/public/catalogue/${path}`,
      origin,
    );
    const retry = new URL(imageRetrySource(internal, 1), origin);
    expect(retry.searchParams.get("path")).toBe(path);
    expect(retry.searchParams.get("_image_retry")).toBe("1");
    expect(imageRetrySource(`${origin}/signed?token=private`, 1)).toBe(
      `${origin}/signed?token=private`,
    );
  });
});

describe("shared original image cache", () => {
  it("rejects overload without making another origin request", async () => {
    let finish: (value: Response) => void = () => {};
    const fetchImage = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const read = createCatalogueImageCache({ fetchImage, maxPending: 1 });
    const first = read("one");
    await expect(read("two")).rejects.toBeInstanceOf(ImageUnavailableError);
    finish(response());
    await first;
    expect(fetchImage).toHaveBeenCalledTimes(1);
  });
  it("times out a queued request without leaking the active slot", async () => {
    let finish: (value: Response) => void = () => {};
    const fetchImage = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation(async () => response());
    const read = createCatalogueImageCache({
      fetchImage,
      concurrency: 1,
      queueWaitMs: 5,
    });
    const first = read("one");
    await expect(read("two")).rejects.toBeInstanceOf(ImageUnavailableError);
    finish(response());
    await first;
    expect((await read("three")).bytes.toString()).toBe("image");
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });
  it("coalesces concurrent downloads and caches successful bytes", async () => {
    const fetchImage = vi.fn(async () => response());
    const read = createCatalogueImageCache({ fetchImage });
    const [first, second] = await Promise.all([read("photo"), read("photo")]);
    expect(first).toBe(second);
    expect(first.bytes.toString()).toBe("image");
    expect(await read("photo")).toBe(first);
    expect(fetchImage).toHaveBeenCalledTimes(1);
  });
  it("limits simultaneous cold original downloads", async () => {
    let active = 0;
    let peak = 0;
    const fetchImage = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return response();
    });
    const read = createCatalogueImageCache({ fetchImage, concurrency: 2 });
    await Promise.all(
      Array.from({ length: 10 }, (_, index) => read(String(index))),
    );
    expect(peak).toBe(2);
  });
  it("retries a transient 429 then succeeds, observing Retry-After", async () => {
    let clock = 0;
    const sleep = vi.fn(async (milliseconds: number) => {
      clock += milliseconds;
    });
    const fetchImage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Throttled", {
          status: 429,
          headers: { "retry-after": "2" },
        }),
      )
      .mockImplementation(async () => response());
    const read = createCatalogueImageCache({
      fetchImage,
      sleep,
      jitter: () => 0,
      now: () => clock,
    });
    expect((await read("photo")).bytes.toString()).toBe("image");
    expect(fetchImage).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(1900);
  });
  it("does not cache errors or retry permanent 404 responses", async () => {
    const fetchImage = vi
      .fn()
      .mockResolvedValueOnce(new Response("Missing", { status: 404 }))
      .mockImplementation(async () => response());
    const read = createCatalogueImageCache({ fetchImage });
    await expect(read("photo")).rejects.toMatchObject({ status: 404 });
    expect(fetchImage).toHaveBeenCalledTimes(1);
    expect((await read("photo")).bytes.toString()).toBe("image");
  });
  it("never retries early when Retry-After exceeds the bounded request budget", async () => {
    const fetchImage = vi.fn(
      async () =>
        new Response("Throttled", {
          status: 429,
          headers: { "retry-after": "60" },
        }),
    );
    const read = createCatalogueImageCache({ fetchImage });
    await expect(read("one")).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
    await expect(read("two")).rejects.toBeInstanceOf(ImageUnavailableError);
    expect(fetchImage).toHaveBeenCalledTimes(1);
  });
  it("bounds cached bytes using least-recently-used eviction", async () => {
    const fetchImage = vi.fn(async () => response("1234"));
    const read = createCatalogueImageCache({ fetchImage, maxBytes: 8 });
    await read("one");
    await read("two");
    await read("one");
    await read("three");
    await read("two");
    expect(fetchImage).toHaveBeenCalledTimes(4);
  });
  it("rejects invalid image bodies and oversized downloads instead of caching them", async () => {
    const fetchImage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("html", { headers: { "content-type": "text/html" } }),
      )
      .mockImplementation(async () => response("12345"));
    const read = createCatalogueImageCache({ fetchImage, maxEntryBytes: 4 });
    await expect(read("photo")).rejects.toBeInstanceOf(ImageUnavailableError);
    await expect(read("photo")).rejects.toBeInstanceOf(ImageUnavailableError);
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });
  it("retries a network failure", async () => {
    const fetchImage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection reset"))
      .mockImplementation(async () => response());
    const read = createCatalogueImageCache({
      fetchImage,
      sleep: async () => {},
      jitter: () => 0,
    });
    expect((await read("photo")).bytes.toString()).toBe("image");
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });
  it("parses seconds and HTTP-date Retry-After values", () => {
    expect(retryAfterMilliseconds("2")).toBe(2000);
    expect(retryAfterMilliseconds("Thu, 01 Jan 1970 00:00:05 GMT", 2000)).toBe(
      3000,
    );
    expect(retryAfterMilliseconds("invalid")).toBe(0);
  });
});
