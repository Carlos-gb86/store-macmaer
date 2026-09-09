import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  admin: { email: string; password: string };
};

test("admin reviews and saves shipping, tax and discount configuration", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(env.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(env.admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await page.getByRole("link", { name: "Shipping", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shipping" })).toBeVisible();
  await expect(
    page.getByLabel("Base / per-item fee (SEK)").first(),
  ).toHaveValue("80.00");
  await expect(page.getByLabel("Sweden shipping zone")).toBeVisible();
  await page.getByRole("button", { name: "Save shipping settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Shipping settings saved",
  );

  await page.getByRole("link", { name: "Tax", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tax and VAT" }),
  ).toBeVisible();
  await expect(page.getByLabel("VAT rate percent").first()).toHaveValue("20");
  await expect(
    page.getByLabel("Tax source 1", { exact: true }),
  ).not.toHaveValue("");

  await page.getByRole("link", { name: "Discounts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Discounts" })).toBeVisible();
  await expect(page.getByLabel("Code")).toHaveValue("MACMAER10");
  await expect(page.getByLabel("Discount (%)")).toHaveValue("10");
  await expect(
    page.getByLabel("Uses per email or phone (optional)"),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "Save discounts" }).click();
  await expect(page.getByRole("status")).toContainText("Discounts saved");
});
