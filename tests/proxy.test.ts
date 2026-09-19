import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { isConstructionTarget, proxy } from "@/proxy";

const originalConstructionMode = process.env.UNDER_CONSTRUCTION;

afterEach(() => {
  if (originalConstructionMode === undefined)
    delete process.env.UNDER_CONSTRUCTION;
  else process.env.UNDER_CONSTRUCTION = originalConstructionMode;
});

describe("under-construction routing", () => {
  it("rewrites public storefront requests to the holding page", async () => {
    process.env.UNDER_CONSTRUCTION = "true";
    const response = await proxy(
      new NextRequest("https://www.macmaer.se/products/example"),
    );
    expect(isRewrite(response)).toBe(true);
    const rewrittenUrl = getRewrittenUrl(response);
    expect(rewrittenUrl).not.toBeNull();
    expect(new URL(rewrittenUrl!).pathname).toBe("/under-construction");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("keeps operational and holding-page routes outside the storefront gate", () => {
    expect(isConstructionTarget("/terms")).toBe(true);
    for (const path of [
      "/admin",
      "/admin/products",
      "/api/stripe/webhook",
      "/under-construction",
      "/images/about/example.webp",
      "/logo/macmaer.ico",
    ])
      expect(isConstructionTarget(path)).toBe(false);
  });
});
