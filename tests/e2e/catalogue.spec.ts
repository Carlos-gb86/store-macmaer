import { expect, test, type Locator, type Page } from "@playwright/test";

async function chooseOption(page: Page, trigger: Locator, option: string) {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
test("browse the public catalogue and use search and filters", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A softer",
  );
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: test.info().outputPath("home.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Discover the collection" }).click();
  await page.getByLabel("Find your piece").fill("bouclé");
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(page).toHaveURL(/q=boucl%C3%A9/);
  await chooseOption(
    page,
    page.getByLabel("Availability", { exact: true }),
    "Available",
  );
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel("Find your piece")).toHaveValue("bouclé");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByLabel("Find your piece").fill("no-matching-product");
  await expect(
    page.getByRole("heading", { name: "No pieces found" }),
  ).toBeVisible();
});
test("browse collections and enlarge a product image with keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/collections");
  await page.getByRole("link", { name: /Bouclé.*softer kind/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bouclé", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/collection=boucle/);
  await page.getByRole("link", { name: /Bouclé ball knot pillow/ }).click();
  await expect(page).toHaveURL("/products/boucle-ball");

  const thumbnailGroup = page.getByRole("group", { name: "Product images" });
  const thumbnails = thumbnailGroup.getByRole("button");
  await expect(thumbnails).toHaveCount(2);
  const thumbnailBox = await thumbnails.first().boundingBox();
  const mainImageBox = await page.locator(".gallery-main").boundingBox();
  expect(thumbnailBox?.x).toBeLessThan(mainImageBox?.x ?? 0);
  expect(
    await thumbnailGroup.evaluate(
      (element) => getComputedStyle(element).flexDirection,
    ),
  ).toBe("column");

  await page.getByRole("button", { name: "Next image" }).click();
  await expect(
    page.getByRole("button", { name: /Enlarge product image, 2 \/ 2/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enlarge product image" }).click();
  const lightbox = page.getByRole("dialog", { name: "Enlarged product image" });
  await expect(lightbox).toBeVisible();
  const viewport = page.viewportSize();
  const lightboxBox = await lightbox.boundingBox();
  expect(lightboxBox?.height).toBeGreaterThan((viewport?.height ?? 0) * 0.95);
  await expect(
    lightbox.getByRole("button", { name: "Close enlarged image" }),
  ).toBeVisible();

  const lightboxThumbnails = lightbox.getByRole("group", {
    name: "Enlarged product images",
  });
  expect(
    await lightboxThumbnails.evaluate(
      (element) => getComputedStyle(element).flexDirection,
    ),
  ).toBe("row");
  await lightboxThumbnails
    .getByRole("button", { name: "View image 1" })
    .click();
  await lightbox.locator(".lightbox-stage").dispatchEvent("touchstart", {
    touches: [{ identifier: 0, clientX: 280, clientY: 220 }],
  });
  await lightbox.locator(".lightbox-stage").dispatchEvent("touchend", {
    changedTouches: [{ identifier: 0, clientX: 120, clientY: 225 }],
  });
  await expect(
    lightboxThumbnails.getByRole("button", { name: "View image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();
  await page.getByLabel("Large", { exact: true }).check();
  await page.getByRole("button", { name: "Preview configuration" }).click();
  await expect(page.getByText(/Your selections are ready/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Customer reviews" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit review" }),
  ).toBeVisible();
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(
    structuredData.some((value) => value.includes('"@type":"Product"')),
  ).toBe(true);
});
test("preview five repeated colours without a cart or payment flow", async ({
  page,
}) => {
  await page.goto("/products/colour-accessory-pack");
  for (let i = 1; i <= 5; i++)
    await chooseOption(
      page,
      page.getByLabel("Colour " + i, { exact: true }),
      "Ivory",
    );
  await page.getByRole("button", { name: "Preview configuration" }).click();
  await expect(page.getByText(/Your selections are ready/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add to cart|Pay/ }),
  ).toHaveCount(0);
});
test("draft and unknown products are not public and pages fit the viewport", async ({
  page,
}) => {
  const response = await page.goto("/products/draft-sample");
  // App Router can stream a not-found boundary with HTTP 200; its UI must still hide draft data.
  expect([200, 404]).toContain(response?.status());
  await expect(
    page.getByRole("heading", { name: "We couldn’t find that page." }),
  ).toBeVisible();
  await page.goto("/shop");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});

test("footer social links and policy accordions are accessible", async ({
  page,
}) => {
  await page.goto("/");
  for (const social of ["Instagram", "YouTube", "Etsy", "Pinterest"])
    await expect(
      page.getByRole("link", { name: `Follow Macmaer on ${social}` }),
    ).toBeVisible();

  await page.goto("/terms");
  const sections = page.locator(".policy-accordion details");
  await expect(sections).toHaveCount(7);
  await expect(sections.first()).toHaveAttribute("open", "");
  await sections.nth(1).locator("summary").click();
  await expect(sections.nth(1)).toHaveAttribute("open", "");
  await sections.first().locator("summary").click();
  await expect(sections.first()).not.toHaveAttribute("open", "");
  await expect(sections.nth(1)).toHaveAttribute("open", "");
  await sections.last().locator("summary").click();
  await expect(
    page.getByText("VAT registration number: SE820627434501"),
  ).toBeVisible();
});

test("uses a compact cart, product currency control, and contact page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Shopping destination")).toHaveCount(0);
  await page.getByRole("button", { name: "Cart, 0 items" }).click();
  const miniCart = page.getByRole("dialog", { name: "Cart summary" });
  await expect(miniCart).toBeVisible();
  await expect(miniCart).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(miniCart).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cart, 0 items" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cart, 0 items" }).click();
  await page.screenshot({
    path: test.info().outputPath("mini-cart.png"),
    fullPage: false,
  });
  await expect(
    miniCart.getByRole("link", { name: "Explore all pieces", exact: true }),
  ).toBeVisible();

  await page.goto("/products/infinity-knot");
  await expect(page.getByLabel("Display currency")).toBeVisible();
  await expect(page.getByLabel("Display currency")).toContainText("🇸🇪");
  await expect(page.getByLabel("Display currency")).toContainText("SEK");

  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Get in touch." }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("contact.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("link", { name: "info@macmaer.com" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#main-content")
      .getByRole("link", { name: "Follow Macmaer on Instagram" }),
  ).toBeVisible();
});

test("uses sticky navigation, a dedicated story page, and a persistent language switch", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toHaveCSS("position", "sticky");
  const heroTitleSize = await page
    .locator(".hero h1")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(page.getByLabel("Language")).toBeVisible();
  await expect(
    page.locator(".language-switcher .lucide-globe-2"),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Our story" }).click();
  await expect(page).toHaveURL("/about");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Made by hand. Shaped by curiosity.",
    }),
  ).toBeVisible();
  const aboutTitleSize = await page
    .locator(".about-intro h1")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(aboutTitleSize).toBeLessThan(heroTitleSize);

  await page.getByLabel("Language").click();
  await expect(page.getByRole("option", { name: "SV" })).toContainText("🇸🇪");
  await expect(page.locator(".storefront-select-content")).toHaveCSS(
    "border-radius",
    "10px",
  );
  await page.keyboard.press("Escape");

  await chooseOption(page, page.getByLabel("Language"), "SV");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Handgjort. Format av nyfikenhet.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Huvudmeny" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Språk")).toContainText("SV");
  await expect(page.getByRole("link", { name: "Handla allt" })).toBeVisible();
});
