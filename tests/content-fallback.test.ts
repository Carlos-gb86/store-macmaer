import { describe, expect, it } from "vitest";
import { resolveHomepage } from "@/modules/content/fallback";
import { homepageDefaults } from "@/modules/content/schema";

describe("homepage availability fallback", () => {
  it("uses the live configuration when it loads", async () => {
    const live = { ...homepageDefaults, announcement: "Live announcement" };
    await expect(resolveHomepage(async () => live, null)).resolves.toEqual({
      value: live,
      fallbackUsed: false,
    });
  });

  it("preserves the last known content during an outage", async () => {
    const previous = {
      ...homepageDefaults,
      announcement: "Previously loaded announcement",
    };
    await expect(
      resolveHomepage(async () => {
        throw new Error("Database unavailable");
      }, previous),
    ).resolves.toEqual({ value: previous, fallbackUsed: true });
  });

  it("has a built-in fallback for cold starts and builds", async () => {
    await expect(
      resolveHomepage(async () => {
        throw new Error("Database unavailable");
      }, null),
    ).resolves.toEqual({ value: homepageDefaults, fallbackUsed: true });
  });
});
