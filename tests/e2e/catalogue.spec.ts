import { expect, test, type Locator, type Page } from "@playwright/test";

async function chooseOption(page: Page, trigger: Locator, option: string) {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
test("browse the public catalogue and use search and filters", async ({
  page,
}, testInfo) => {
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
  if (testInfo.project.name === "desktop") {
    const mainNavigation = page.locator(".main-nav");
    const collectionsLink = mainNavigation.getByRole("link", {
      name: "Collections",
      exact: true,
    });
    await expect(collectionsLink).toHaveAttribute("href", "/collections");
    const collectionMenu = mainNavigation.locator(".nav-dropdown-menu");
    await expect(collectionMenu.locator("a")).toHaveCount(4);
    await collectionsLink.hover();
    await expect(collectionMenu).toBeVisible();
    await expect(
      collectionMenu.getByRole("link", { name: "Velour", exact: true }),
    ).toHaveAttribute("href", "/collections/velour");
    await collectionMenu
      .getByRole("link", { name: "Velour", exact: true })
      .click();
    await expect(page).toHaveURL(/\/collections\/velour$/);
    await expect(collectionMenu).toBeHidden();
    await page.goto("/");
  } else {
    await expect(page.locator(".main-nav")).toBeHidden();
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    const mobileNavigation = page.getByRole("navigation", {
      name: "Main navigation",
    });
    await expect(mobileNavigation).toBeVisible();
    await expect(
      mobileNavigation.getByRole("link", { name: "Cart", exact: true }),
    ).toBeVisible();
    const collectionsAccordion = mobileNavigation.getByRole("button", {
      name: "Collections",
      exact: true,
    });
    await expect(collectionsAccordion).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(
      mobileNavigation.locator(".mobile-nav-category-links"),
    ).toHaveCount(0);
    await collectionsAccordion.click();
    await expect(collectionsAccordion).toHaveAttribute("aria-expanded", "true");
    await expect(
      mobileNavigation.locator(".mobile-nav-category-links a"),
    ).toHaveCount(4);
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(mobileNavigation).toBeHidden();
  }
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: test.info().outputPath("home.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Discover the collection" }).click();
  const search = page.getByLabel("Find your piece");
  await search.pressSequentially("bouclé", { delay: 40 });
  await expect(search).toBeFocused();
  await expect(page.locator(".product-card")).toHaveCount(3);
  const firstProductCard = page.locator(".product-card").first();
  await expect(firstProductCard.locator(".product-card-rating")).toHaveCount(0);
  await expect(firstProductCard).not.toContainText("Not yet reviewed");
  const productImageBox = await firstProductCard
    .locator(".product-card-image")
    .boundingBox();
  expect(
    Math.abs((productImageBox?.width ?? 0) - (productImageBox?.height ?? 0)),
  ).toBeLessThan(2);
  expect(
    await firstProductCard
      .locator(".product-card-meta")
      .evaluate((element) => getComputedStyle(element).flexDirection),
  ).toBe((page.viewportSize()?.width ?? 0) <= 500 ? "column" : "row");
  await expect(firstProductCard.locator(".product-card-action")).toHaveText(
    /Customize|View product/,
  );
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
test("switches cleanly to compact navigation at 800 pixels", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.setViewportSize({ width: 801, height: 900 });
  await page.goto("/");
  const headerLogo = page.locator(".site-header .wordmark");
  await expect(headerLogo).toBeVisible();
  const desktopLogoWidth = await headerLogo.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await expect(page.locator(".main-nav")).toBeVisible();
  await expect(page.locator(".mobile-menu-button")).toBeHidden();

  await page.setViewportSize({ width: 800, height: 900 });
  const compactLogoWidth = await headerLogo.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(compactLogoWidth).toBeLessThanOrEqual(desktopLogoWidth + 1);
  await expect(page.locator(".main-nav")).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Cart", exact: true }),
  ).toHaveAttribute("href", "/cart");
  await navigation
    .getByRole("button", { name: "Collections", exact: true })
    .click();
  await expect(navigation.locator(".mobile-nav-category-links a")).toHaveCount(
    4,
  );
  await page.screenshot({
    path: testInfo.outputPath("compact-navigation.png"),
    animations: "disabled",
  });
  await navigation.getByRole("link", { name: "About us" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(navigation).toBeHidden();
});
test("browse collections and enlarge a product image with keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/collections");
  const collectionCards = page.locator(".collection-card");
  await expect(collectionCards).toHaveCount(4);
  for (const card of await collectionCards.all())
    await expect(card).toBeInViewport();
  await expect(
    page.getByRole("img", { name: "Velour collection" }),
  ).toBeVisible();
  await collectionCards
    .filter({
      has: page.getByRole("heading", { name: "Bouclé", exact: true }),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bouclé", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/collections\/boucle$/);
  const productTypes = page.locator(".product-type-filter");
  await expect(
    productTypes.getByRole("button", { name: "All", exact: true }),
  ).toBeVisible();
  await expect(
    productTypes.getByRole("button", { name: "Ball Knot Pillows" }),
  ).toBeVisible();
  await productTypes.getByRole("button", { name: "Flat Knot Pillows" }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page).toHaveURL(/type=flat-knot-pillows/);
  await productTypes.getByRole("button", { name: "All", exact: true }).click();
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
  await lightbox.locator(".gallery-carousel").dispatchEvent("touchstart", {
    touches: [{ identifier: 0, clientX: 280, clientY: 220 }],
  });
  await lightbox.locator(".gallery-carousel").dispatchEvent("touchend", {
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
}, testInfo) => {
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
  if (testInfo.project.name === "desktop") {
    await expect(page.locator(".main-nav")).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
  }
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

test("uses sticky navigation, a dedicated about page, and a persistent language switch", async ({
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

  await navigation.getByRole("link", { name: "About us" }).click();
  await expect(page).toHaveURL("/about");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "About us",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Our story" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Fabrics & Materials" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Design & Working process",
    }),
  ).toBeVisible();
  await expect(page.locator(".about-block")).toHaveCount(8);
  await expect(page.locator(".about-video-placeholder")).toHaveCount(3);
  await expect(page.locator(".about-signature-avatar img")).toHaveCount(1);
  await expect(page.locator(".about-page img")).toHaveCount(13);
  const storyBlock = page.locator(".about-block").nth(2);
  const boucleBlock = page.locator(".about-block").nth(3);
  await expect(storyBlock).toHaveClass(/about-reveal--up/);
  await expect(boucleBlock).toHaveClass(/about-reveal--side/);
  await storyBlock.scrollIntoViewIfNeeded();
  await expect(storyBlock).toHaveClass(/is-visible/);
  const aboutTitleSize = await page
    .locator(".about-opening h1")
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
      name: "Om oss",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Huvudmeny" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Språk")).toContainText("SV");
  await expect(page.getByRole("link", { name: "Handla allt" })).toBeVisible();

  await page.setViewportSize({ width: 700, height: 1000 });
  const materialImages = page.locator(".about-material-gallery figure");
  await materialImages.last().scrollIntoViewIfNeeded();
  const fifthImage = await materialImages.nth(4).boundingBox();
  const sixthImage = await materialImages.nth(5).boundingBox();
  expect(fifthImage?.y).toBeCloseTo(sixthImage?.y ?? 0, 0);
});
