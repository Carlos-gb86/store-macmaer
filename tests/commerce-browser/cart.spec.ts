import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  serviceKey: string;
};

async function chooseOption(page: Page, trigger: Locator, option: string) {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.beforeAll(async () => {
  const client = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false },
    realtime: {
      transport: class UnusedWebSocketTransport {} as never,
    },
  });
  const { error } = await client.from("currency_rates").upsert(
    [
      {
        base_currency: "SEK",
        quote_currency: "EUR",
        rate_numerator: 1,
        rate_denominator: 10,
        source: "browser test",
        source_effective_at: "2026-09-08T00:00:00.000Z",
      },
      {
        base_currency: "SEK",
        quote_currency: "USD",
        rate_numerator: 1,
        rate_denominator: 8,
        source: "browser test",
        source_effective_at: "2026-09-08T00:00:00.000Z",
      },
    ],
    {
      onConflict: "base_currency,quote_currency,source,source_effective_at",
      ignoreDuplicates: true,
    },
  );
  if (error) throw error;
});

test("adds a server-priced item, persists it, updates quantity, and removes it", async ({
  page,
}) => {
  await page.goto("/products/infinity-knot");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Cart summary" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cart, 1 item" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cart, 1 item" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cart, 1 item" }).click();
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page.getByRole("heading", { name: "Your cart." })).toBeVisible();
  await expect(
    page.getByText("600 SEK", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Quantity").last().fill("2");
  await expect(
    page.getByText("1,200 SEK", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cart, 2 items" }),
  ).toBeVisible();
  await page.getByLabel("Quantity").last().fill("1");
  await expect(
    page.getByText("600 SEK", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cart, 1 item" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(
    page.getByRole("heading", { name: "Your cart is waiting." }),
  ).toBeVisible();
});

test("keeps repeated custom configurations as separate persistent lines", async ({
  page,
}) => {
  await page.goto("/products/colour-accessory-pack");
  const choices = page.getByLabel(/^Colour \d$/);
  for (let index = 0; index < 5; index++)
    await chooseOption(page, choices.nth(index), "Ivory");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.getByRole("button", { name: "Close cart summary" }).click();
  await chooseOption(page, choices.nth(0), "Sand");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByRole("button", { name: "Cart, 2 items" }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-line")).toHaveCount(2);
});

test("quotes destination VAT, configurable shipping and MACMAER10 on the server", async ({
  page,
}) => {
  await page.goto("/products/infinity-knot");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/cart");

  const summary = page.locator(".cart-summary");
  await expect(summary.getByText("Free", { exact: true })).toBeVisible();
  await expect(summary.getByText("120 SEK", { exact: true })).toBeVisible();
  await expect(summary.getByText("600 SEK", { exact: true })).toHaveCount(2);

  await page.getByLabel("Discount code").fill("MACMAER10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("MACMAER10 applied.")).toBeVisible();
  await expect(summary.getByText("−60 SEK", { exact: true })).toBeVisible();
  await expect(summary.getByText("108 SEK", { exact: true })).toBeVisible();
  await expect(summary.getByText("540 SEK", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "Remove", exact: true })
    .last()
    .click();
  await expect(page.getByText("Discount code removed.")).toBeVisible();
  await chooseOption(
    page,
    page.getByLabel("Shopping destination"),
    "United States",
  );
  await expect(page.getByText("Destination updated.")).toBeAttached();
  await expect(summary.getByText("250 SEK", { exact: true })).toBeVisible();
  await expect(summary.getByText("0 SEK", { exact: true })).toBeVisible();
  await expect(summary.getByText("850 SEK", { exact: true })).toHaveCount(2);
});

test("changes currency independently from destination and rejects unavailable stock", async ({
  page,
}) => {
  await page.goto("/products/infinity-knot");
  await chooseOption(page, page.getByLabel("Display currency"), "EUR");
  await expect(page.getByText("60 EUR", { exact: true }).first()).toBeVisible();
  await page.goto("/cart");
  await chooseOption(
    page,
    page.getByLabel("Shopping destination"),
    "United States",
  );
  await expect(page.getByText("Destination updated.")).toBeAttached();
  await expect(page.getByLabel("Shopping destination")).toContainText(
    "United States",
  );
  await page.goto("/products/infinity-knot");
  await expect(page.getByLabel("Display currency")).toContainText("EUR");
  await page.reload();
  await expect(page.getByLabel("Display currency")).toContainText("EUR");
  await page.goto("/cart");
  await expect(page.getByLabel("Shopping destination")).toContainText(
    "United States",
  );

  await page.goto("/products/velvet-knot");
  await page.getByRole("radio", { name: "Sage" }).check();
  await chooseOption(page, page.getByLabel("Size"), "Large");
  await expect(page.getByText("Currently unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
    0,
  );
});

test("keeps production-safe checkout disabled and exposes draft policy routes", async ({
  page,
}) => {
  await page.goto("/products/infinity-knot");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(
    page.getByRole("heading", { name: "Ordering is not open yet." }),
  ).toBeVisible();
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of Sale and Website Use" }),
  ).toBeVisible();
  await expect(page.getByText(/Pre-launch draft updated/)).toBeVisible();
});
