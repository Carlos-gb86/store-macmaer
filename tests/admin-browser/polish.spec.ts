import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
  admin: { email: string; password: string };
};
async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(env.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(env.admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Catalogue overview" }),
  ).toBeVisible();
}
test("creates a tag inside an unsaved product, then configures options and a variant", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/products/new");
  const unique = "polish-" + Date.now();
  await page.getByLabel("title", { exact: true }).fill("Polished product");
  await page.getByLabel("slug", { exact: true }).fill(unique);
  await page.getByLabel("sku", { exact: true }).fill(unique);
  await page.getByRole("button", { name: "Create tag", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(unique);
  await dialog.getByRole("button", { name: "Save tag", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/admin\/products\/new$/);
  await expect(page.getByLabel("title", { exact: true })).toHaveValue(
    "Polished product",
  );
  await expect(
    page.getByRole("checkbox", { name: unique, exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Add option", exact: true }).click();
  await page.getByLabel("Option label", { exact: true }).fill("Size");
  await page
    .getByRole("checkbox", {
      name: "Use this option for variants",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Add choice", exact: true }).click();
  await page.getByLabel("Choice label", { exact: true }).fill("Small");
  await page.getByRole("button", { name: "Add variant", exact: true }).click();
  await page
    .locator("#product-variants")
    .getByRole("combobox", { name: "Size", exact: true })
    .selectOption({ label: "Small" });
  await page.getByLabel("Variant SKU", { exact: true }).fill(unique + "-small");
  await page
    .getByRole("combobox", { name: "Variant pricing", exact: true })
    .selectOption("override");
  await page.getByLabel("Variant price (SEK)", { exact: true }).fill("450.00");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Product saved");
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+$/);
  await page.screenshot({
    path: "test-results/admin-product-polished.png",
    fullPage: true,
  });
});
test("uses visual galleries, preserves multiple uploads and supports keyboard image selection", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/products/new");
  const stamp = Date.now();
  await page.getByLabel("title", { exact: true }).fill("Gallery test");
  const upload = page.getByLabel("Upload private image", { exact: true });
  await expect(upload).toBeEnabled();
  const buffer = readFileSync("public/images/catalogue/boucle-infinity.png");
  await upload.setInputFiles(
    [1, 2].map((i) => ({
      name: `gallery-${stamp}-${i}.png`,
      mimeType: "image/png",
      buffer,
    })),
  );
  await expect(page.locator(".gallery-card")).toHaveCount(2);
  await expect(page.locator(".gallery-card img").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Choose from library", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Search images", { exact: true })
    .fill(`gallery-${stamp}-1`);
  const image = dialog.getByRole("button", {
    name: `Use gallery-${stamp}-1.png`,
    exact: true,
  });
  await image.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".gallery-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Choose from library", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/admin-gallery-polished.png",
    fullPage: true,
  });
});
test("keeps admin screens usable on desktop and phone", async ({ page }) => {
  await login(page);
  const client = createClient(env.url, env.key);
  await client.auth.signInWithPassword(env.admin);
  const { data: product } = await client
    .from("products")
    .select("id")
    .eq("slug", "velvet-knot")
    .single();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "products",
      "products/" + product!.id,
      "collections/new",
      "tags",
      "media",
      "content",
    ]) {
      await page.goto("/admin/" + path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText("Loading editor…", { exact: true }),
      ).not.toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (path === "products") {
        const input = await page.getByRole("searchbox").boundingBox();
        const button = await page
          .getByRole("button", { name: "Search", exact: true })
          .boundingBox();
        if (width === 1280)
          expect(
            Math.abs(input!.y + input!.height - button!.y - button!.height),
          ).toBeLessThanOrEqual(2);
        await expect(page.locator(".list-thumbnail").first()).toBeVisible();
      }
      await page.screenshot({
        path: `test-results/admin-${path.replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
