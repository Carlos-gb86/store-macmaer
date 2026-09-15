import { expect, test } from "@playwright/test";

test("an image recovers automatically from one temporary HTTP failure", async ({
  page,
}) => {
  let failures = 0;
  await page.route("**/_next/image?*", async (route) => {
    const url = new URL(route.request().url());
    const source = url.searchParams.get("url") ?? "";
    if (
      source.includes("/images/catalogue/") &&
      !source.includes("_image_retry")
    ) {
      failures++;
      await route.fulfill({
        status: 429,
        contentType: "text/plain",
        body: "Too many requests",
        headers: { "cache-control": "no-store" },
      });
    } else await route.continue();
  });
  await page.goto("/products/boucle-ball");
  const mainImage = page.locator(".gallery-main img");
  await expect(mainImage).toHaveAttribute("src", /_image_retry/);
  await expect(mainImage).toHaveCSS("opacity", "1");
  await expect
    .poll(() =>
      mainImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(failures).toBeGreaterThan(0);
  await expect(page.locator(".gallery-main .is-unavailable")).toHaveCount(0);
});

test("persistent image errors show a styled fallback without broken alt text or endless retries", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/_next/image?*", async (route) => {
    if (
      (new URL(route.request().url()).searchParams.get("url") ?? "").includes(
        "/images/catalogue/",
      )
    ) {
      requests++;
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Unavailable",
        headers: { "cache-control": "no-store" },
      });
    } else await route.continue();
  });
  await page.goto("/products/boucle-ball");
  await expect(page.locator(".gallery-main .is-unavailable")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".gallery-main img")).toHaveCSS("opacity", "0");
  await expect(page.locator(".gallery-main img")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".gallery-main .is-unavailable")).toContainText(
    "Image temporarily unavailable",
  );
  // Thumbnails and related images finish their independently jittered retries
  // shortly after the main image. Measure stability only once they settle.
  await expect(
    page.locator(".catalogue-image-feedback.is-retrying"),
  ).toHaveCount(0, { timeout: 15000 });
  const count = requests;
  await page.waitForTimeout(3500);
  expect(requests).toBe(count);
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(
    page.getByRole("button", { name: /Enlarge product image, 2 \/ 2/ }),
  ).toBeVisible();
});

test("image endpoint rejects traversal, private paths and arbitrary upstream URLs", async ({
  request,
}) => {
  for (const path of [
    "../private/image.webp",
    "https://other.example/image.webp",
    "catalogue-drafts/secret.webp",
    "woocommerce/sha256/invalid/image.webp",
  ]) {
    const response = await request.get(
      `/api/catalogue-images?path=${encodeURIComponent(path)}`,
    );
    expect(response.status()).toBe(400);
    expect(response.headers()["cache-control"]).toBe("no-store");
  }
});
