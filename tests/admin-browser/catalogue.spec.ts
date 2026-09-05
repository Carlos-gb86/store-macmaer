import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
  admin: { email: string; password: string };
  ordinary: { email: string; password: string };
};
async function login(page: Page, credentials = env.admin) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (
    credentials.email === env.admin.email &&
    credentials.password === env.admin.password
  )
    await expect(page).toHaveURL(/\/admin$/);
}
test("refreshes an expired cookie session through the proxy", async ({
  page,
  context,
}) => {
  await login(page);
  const sessionCookies = (await context.cookies())
    .filter((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  expect(sessionCookies.length).toBeGreaterThan(0);
  const encoded = sessionCookies.map((c) => c.value).join("");
  const session = JSON.parse(
    Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString(),
  ) as { expires_at: number; refresh_token: string };
  const oldRefresh = session.refresh_token;
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  await context.clearCookies({ name: /^sb-.*-auth-token/ });
  await context.addCookies([
    {
      ...sessionCookies[0]!,
      name: sessionCookies[0]!.name.replace(/\.\d+$/, ""),
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
    },
  ]);
  const response = await page.goto("/admin");
  // Next's development server replaces route cache headers; production is checked separately.
  expect(response?.headers()["cache-control"]).toMatch(/no-cache|no-store/);
  await expect(
    page.getByRole("heading", { name: "Catalogue overview" }),
  ).toBeVisible();
  const renewed = (await context.cookies())
    .filter((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  const next = JSON.parse(
    Buffer.from(renewed.replace(/^base64-/, ""), "base64url").toString(),
  ) as typeof session;
  expect(next.expires_at).toBeGreaterThan(Date.now() / 1000);
  expect(next.refresh_token).not.toBe(oldRefresh);
});
test("protects pages and rejects invalid and ordinary accounts", async ({
  page,
}) => {
  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/admin\/login/);
  await login(page, { email: env.admin.email, password: "incorrect" });
  await expect(
    page.getByRole("alert").filter({ hasText: "Sign-in failed" }),
  ).toBeVisible();
  await login(page, env.ordinary);
  await expect(
    page.getByRole("alert").filter({ hasText: "does not have" }),
  ).toBeVisible();
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Catalogue overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});
test("creates a draft, previews, publishes, edits, archives and restores", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Create product" }).click();
  const slug = "browser-" + Date.now();
  await page
    .getByLabel("title", { exact: true })
    .fill("Browser handmade piece");
  await page.getByLabel("slug", { exact: true }).fill(slug);
  await page.getByLabel("sku", { exact: true }).fill(slug);
  await page.getByLabel("Base price (SEK)", { exact: true }).fill("199,95");
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Made with care.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Preview saved product" }),
  ).toBeVisible();
  const anonymous = await browser.newContext(),
    publicPage = await anonymous.newPage();
  await publicPage.goto("http://127.0.0.1:3200/products/" + slug);
  await expect(
    publicPage.getByRole("heading", { name: /couldn’t find/i }),
  ).toBeVisible();
  const preview = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Preview saved product" }).click();
  const previewPage = await preview;
  await expect(
    previewPage.getByText("Private preview", { exact: false }),
  ).toBeVisible();
  await previewPage.close();
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "Product published",
  );
  await publicPage.goto("http://127.0.0.1:3200/products/" + slug);
  await expect(
    publicPage.getByRole("heading", { name: "Browser handmade piece" }),
  ).toBeVisible();
  await expect(
    publicPage.getByText("199.95 SEK", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("title", { exact: true })
    .fill("Updated handmade piece");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("status").first()).toContainText(
    "Product published",
  );
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Updated handmade piece" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore to draft" }),
  ).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: /couldn’t find/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore to draft" }).click();
  await expect(
    page.getByRole("button", { name: "Publish product", exact: true }),
  ).toBeVisible();
  await anonymous.close();
});
for (const model of [
  "infinity-knot",
  "boucle-ball",
  "velvet-knot",
  "cotton-knot",
  "colour-accessory-pack",
]) {
  test(
    "duplicates and publishes representative model: " + model,
    async ({ page, browser }) => {
      const client = createClient(env.url, env.key);
      await client.auth.signInWithPassword(env.admin);
      const { data } = await client
        .from("products")
        .select("id")
        .eq("slug", model)
        .single();
      await login(page);
      await page.goto("/admin/products/" + data!.id);
      await page.getByRole("button", { name: "Duplicate as draft" }).click();
      const slug = model + "-browser-" + Date.now();
      await page.getByLabel("slug", { exact: true }).fill(slug);
      await page.getByLabel("sku", { exact: true }).fill(slug);
      await page
        .getByRole("button", { name: "Publish product", exact: true })
        .click();
      await expect(page.getByRole("status").first()).toContainText(
        "Product published",
      );
      const context = await browser.newContext(),
        viewer = await context.newPage();
      await viewer.goto("http://127.0.0.1:3200/products/" + slug);
      await expect(viewer.getByRole("heading", { level: 1 })).toContainText(
        "(copy)",
      );
      await context.close();
    },
  );
}
test("uploads private images and publishes homepage and collection controls", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.goto("/admin/media");
  const name = "browser-image-" + Date.now() + ".png";
  await expect(page.getByLabel("Upload private image")).toBeEnabled();
  await page.getByLabel("Upload private image").setInputFiles({
    name,
    mimeType: "image/png",
    buffer: readFileSync("public/images/catalogue/boucle-infinity.png"),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Image verified" }),
  ).toBeVisible();
  const client = createClient(env.url, env.key);
  await client.auth.signInWithPassword(env.admin);
  const { data: asset, error } = await client
    .from("media_assets")
    .select()
    .eq("original_name", name)
    .single();
  expect(error).toBeNull();
  expect(asset.public_ready).toBe(false);
  const anonymous = await browser.newContext();
  expect(
    (
      await anonymous.request.get(
        env.url +
          "/storage/v1/object/public/catalogue-drafts/" +
          asset.private_path,
      )
    ).ok(),
  ).toBe(false);
  await page.goto("/admin/content");
  const copy = "Homepage acceptance " + Date.now();
  await page.getByLabel("hero title", { exact: true }).fill(copy);
  await page
    .getByRole("combobox", { name: "Image", exact: true })
    .first()
    .selectOption(asset.id);
  await page.getByRole("button", { name: "Publish homepage" }).click();
  await expect(page.getByRole("status")).toContainText("Homepage published");
  const viewer = await anonymous.newPage();
  await viewer.goto("http://127.0.0.1:3200/");
  await expect(viewer.getByRole("heading", { name: copy })).toBeVisible();
  await expect
    .poll(() =>
      viewer
        .locator(".hero-image img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.goto("/admin/collections/new");
  const slug = "collection-" + Date.now();
  await page.getByLabel("name", { exact: true }).fill("Browser collection");
  await page.getByLabel("slug", { exact: true }).fill(slug);
  await page.getByLabel("active", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Image", exact: true })
    .selectOption(asset.id);
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/[0-9a-f-]{36}$/);
  await viewer.goto("http://127.0.0.1:3200/collections/" + slug);
  await expect(
    viewer.getByRole("heading", { name: "Browser collection" }),
  ).toBeVisible();
  expect(
    (await client.rpc("admin_claim_media_cleanup", { asset: asset.id })).data,
  ).toBe(false);
  await anonymous.close();
});
test("preserves unsaved values after a stale edit", async ({
  page,
  context,
}) => {
  await login(page);
  const client = createClient(env.url, env.key);
  await client.auth.signInWithPassword(env.admin);
  const { data } = await client
    .from("products")
    .select("id")
    .eq("slug", "infinity-knot")
    .single();
  await page.goto("/admin/products/" + data!.id);
  const other = await context.newPage();
  await other.goto("/admin/products/" + data!.id);
  await page.getByLabel("subtitle", { exact: true }).fill("First editor");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  await other
    .getByLabel("subtitle", { exact: true })
    .fill("Unsaved second editor");
  await other
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    other.getByRole("alert").filter({ hasText: "Someone changed" }).first(),
  ).toBeVisible();
  await expect(other.getByLabel("subtitle", { exact: true })).toHaveValue(
    "Unsaved second editor",
  );
});
