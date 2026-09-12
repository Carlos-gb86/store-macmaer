import { expect, test } from "@playwright/test";

test("submits a contact enquiry through the private server path", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Customer");
  await page.getByLabel("Email address").fill("customer@example.com");
  await page.getByLabel(/Subject/).fill("Product question");
  await page
    .getByLabel("How can we help?")
    .fill("Could you tell me more about the available colours?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText(
      "Thank you. We’ve received your message and will reply by email.",
    ),
  ).toBeVisible();
});
