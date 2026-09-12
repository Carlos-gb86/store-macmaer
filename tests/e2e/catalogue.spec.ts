import { expect, test } from "@playwright/test";
test("browse the public catalogue and use search and filters", async ({
  page,
}) => {
  await page.goto("/");
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
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page
    .getByLabel("Availability", { exact: true })
    .selectOption("available");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel("Find your piece")).toHaveValue("bouclé");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByLabel("Find your piece").fill("no-matching-product");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
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
  await page.getByRole("link", { name: /Bouclé ball knot pillow/ }).click();
  await page.getByRole("button", { name: "Enlarge product image" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Large", { exact: true }).check();
  await page.getByRole("button", { name: "Preview configuration" }).click();
  await expect(page.getByText(/Your selections are ready/)).toBeVisible();
});
test("preview five repeated colours without a cart or payment flow", async ({
  page,
}) => {
  await page.goto("/products/colour-accessory-pack");
  for (let i = 1; i <= 5; i++)
    await page
      .getByLabel("Colour " + i, { exact: true })
      .selectOption({ label: "Ivory" });
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
  await expect(
    page.getByRole("dialog", { name: "Cart summary" }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("mini-cart.png"),
    fullPage: false,
  });
  await expect(
    page.getByRole("link", { name: "Explore all pieces", exact: true }),
  ).toBeVisible();

  await page.goto("/products/infinity-knot");
  await expect(page.getByLabel("Display currency")).toBeVisible();
  await expect(
    page.getByLabel("Display currency").locator("option").first(),
  ).toContainText("🇸🇪 SEK");

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
