import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  admin: { email: string; password: string };
};

test("admin manages storefront currency availability", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(env.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(env.admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Currency" }).click();
  await expect(
    page.getByRole("heading", { name: "Currency", exact: true }),
  ).toBeVisible();
  const eur = page.getByRole("checkbox", { name: /EUR.*Enabled/ });
  await eur.uncheck();
  await page.getByRole("button", { name: "Save currency settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Currency settings saved",
  );
  await page.reload();
  await expect(eur).not.toBeChecked();
  await eur.check();
  await page.getByRole("button", { name: "Save currency settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Currency settings saved",
  );
});
