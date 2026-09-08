import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
  serviceKey: string;
};
if (new URL(env.url).hostname !== "127.0.0.1")
  throw new Error("Commerce browser tests require local Supabase.");

export default defineConfig({
  testDir: "./tests/commerce-browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3300", trace: "retain-on-failure" },
  projects: [
    { name: "commerce-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "commerce-mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3300",
    url: "http://127.0.0.1:3300",
    reuseExistingServer: false,
    env: {
      CATALOG_SOURCE: "supabase",
      NEXT_BUILD_DIR: ".next-commerce",
      NEXT_PUBLIC_SUPABASE_URL: env.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.key,
      SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
    },
  },
});
