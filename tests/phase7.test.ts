import { describe, expect, it } from "vitest";
import { reviewSubmissionSchema } from "@/modules/reviews/schema";

describe("Phase 7 review boundaries", () => {
  it("normalizes a valid review submission", () => {
    expect(
      reviewSubmissionSchema.parse({
        productId: "00000000-0000-4000-8000-000000000001",
        productSlug: "boucle-ball",
        displayName: "  Anna  ",
        email: " ANNA@example.com ",
        rating: "5",
        title: "  Beautiful  ",
        body: "  A beautifully made pillow for our home.  ",
        company: "",
      }),
    ).toMatchObject({
      displayName: "Anna",
      email: "ANNA@example.com",
      rating: 5,
      title: "Beautiful",
      body: "A beautifully made pillow for our home.",
    });
  });

  it("rejects ratings, paths, and content outside the public limits", () => {
    expect(
      reviewSubmissionSchema.safeParse({
        productId: "not-an-id",
        productSlug: "../../admin",
        displayName: "A",
        email: "not-email",
        rating: 6,
        title: "",
        body: "short",
        company: "",
      }).success,
    ).toBe(false);
  });
});
