import { isManagedImagePath } from "@/modules/media/catalogue-image-source";
import {
  createCatalogueImageCache,
  ImageUnavailableError,
} from "@/modules/media/catalogue-image-cache";

export const runtime = "nodejs";
export const maxDuration = 60;
const loadImage = createCatalogueImageCache({
  fetchImage: (src) =>
    fetch(src, {
      cache: "force-cache",
      next: { revalidate: 31536000 },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    }),
});

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !isManagedImagePath(path))
    return new Response("Invalid catalogue image path.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageUrl)
    return new Response("Image service unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "5" },
    });
  try {
    const source = new URL(
      `/storage/v1/object/public/catalogue/${path}`,
      storageUrl,
    ).href;
    const image = await loadImage(source);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.length),
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(image.etag ? { ETag: image.etag } : {}),
      },
    });
  } catch (error) {
    const unavailable =
      error instanceof ImageUnavailableError
        ? error
        : new ImageUnavailableError();
    console.warn("Catalogue image upstream unavailable", {
      path,
      status: unavailable.status,
    });
    return new Response("Image temporarily unavailable.", {
      status: unavailable.status === 404 ? 404 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(unavailable.retryAfter),
      },
    });
  }
}
