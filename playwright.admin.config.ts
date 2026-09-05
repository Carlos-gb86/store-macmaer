import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
};
if (new URL(env.url).hostname !== "127.0.0.1")
  throw new Error("Admin browser tests require local Supabase.");
export default defineConfig({
  testDir: "./tests/admin-browser",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3200", trace: "retain-on-failure" },
  projects: [{ name: "admin-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    env: {
      CATALOG_SOURCE: "supabase",
      NEXT_BUILD_DIR: ".next-admin",
      NEXT_PUBLIC_SUPABASE_URL: env.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.key,
    },
  },
});
