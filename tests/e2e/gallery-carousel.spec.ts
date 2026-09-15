import { expect, test, type Locator } from "@playwright/test";

async function settled(carousel: Locator) {
  await expect(carousel).toHaveAttribute("data-phase", "idle");
  await expect(carousel.locator(".gallery-slide")).toHaveCount(1);
}
async function direction(carousel: Locator, expected: "next" | "previous") {
  await expect(carousel).toHaveAttribute("data-direction", expected);
  await expect(carousel).toHaveAttribute("data-phase", "sliding");
  const frames = await carousel.evaluate((element) =>
    Array.from(element.querySelectorAll(".gallery-slide")).map((slide) => {
      const animation = slide.getAnimations()[0];
      return {
        outgoing: slide.hasAttribute("data-outgoing"),
        frames: (animation?.effect as KeyframeEffect)?.getKeyframes(),
      };
    }),
  );
  const outgoing = frames.find((slide) => slide.outgoing)?.frames;
  const incoming = frames.find((slide) => !slide.outgoing)?.frames;
  expect(outgoing?.at(-1)?.transform).toBe(
    `translateX(${expected === "next" ? -100 : 100}%)`,
  );
  expect(incoming?.[0]?.transform).toContain(
    `${expected === "next" ? 100 : -100}%`,
  );
  expect(incoming?.at(-1)?.transform).toMatch(/^translateX\(0(?:px)?\)$/);
  await settled(carousel);
}
async function touch(carousel: Locator, x: number, type: string, y = 200) {
  await carousel.dispatchEvent(type, {
    [type === "touchend" ? "changedTouches" : "touches"]: [
      { identifier: 0, clientX: x, clientY: y },
    ],
  });
}

test("embedded gallery contains portrait/landscape images in a stable 3:4 frame and slides in both directions", async ({
  page,
}) => {
  await page.route("**/_next/image?*", async (route) => {
    const source = new URL(route.request().url()).searchParams.get("url") ?? "";
    if (!/boucle-ball\.jpg|cotton\.jpg/.test(source)) return route.continue();
    const landscape = source.includes("boucle-ball");
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${landscape ? 960 : 400}" height="${landscape ? 400 : 960}"><rect width="100%" height="100%" fill="${landscape ? "#889070" : "#cfa99b"}"/></svg>`,
    });
  });
  await page.goto("/products/boucle-ball");
  const main = page.locator(".gallery-main");
  const carousel = main.locator(".gallery-carousel");
  await expect(main).toBeVisible();
  const before = await main.boundingBox();
  expect(before).not.toBeNull();
  expect(
    Math.abs(((before?.width ?? 0) * 4) / 3 - (before?.height ?? 0)),
  ).toBeLessThan(1);
  const pageBackground = await page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );
  await expect(page.locator(".gallery-stage")).toHaveCSS(
    "background-color",
    pageBackground,
  );
  await expect(main.locator("[data-current] img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  await expect(main.locator("[data-current] img")).toHaveCSS(
    "object-position",
    "50% 50%",
  );
  await page.getByRole("button", { name: "Next image" }).click();
  await direction(carousel, "next");
  const after = await main.boundingBox();
  expect(after).toEqual(before);
  await expect(main.locator("img")).toHaveCSS("object-fit", "contain");
  expect(
    await main
      .locator("img")
      .evaluate(
        (image) =>
          (image as HTMLImageElement).naturalHeight >
          (image as HTMLImageElement).naturalWidth,
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Previous image" }).click();
  await direction(carousel, "previous");
  expect(
    await main
      .locator("img")
      .evaluate(
        (image) =>
          (image as HTMLImageElement).naturalWidth >
          (image as HTMLImageElement).naturalHeight,
      ),
  ).toBe(true);
});

test("thumbnail, keyboard, wrapping and rapid navigation settle to one correct embedded image", async ({
  page,
}) => {
  await page.goto("/products/boucle-ball");
  const carousel = page.locator(".gallery-main .gallery-carousel");
  const thumbnails = page.getByRole("group", { name: "Product images" });
  await thumbnails.getByRole("button", { name: "View image 2" }).click();
  await direction(carousel, "next");
  await thumbnails.getByRole("button", { name: "View image 1" }).click();
  await direction(carousel, "previous");
  await page.getByRole("button", { name: "Previous image" }).click();
  await direction(carousel, "previous"); // first -> last wraps backwards
  await page.locator(".gallery-main").focus();
  await page.keyboard.press("ArrowRight");
  await direction(carousel, "next"); // last -> first wraps forwards
  await carousel.evaluate((element) => {
    const next = element
      .closest(".gallery-stage")
      ?.querySelector<HTMLButtonElement>(".gallery-arrow-next");
    for (let i = 0; i < 5; i++) next?.click();
  });
  await expect(
    thumbnails.getByRole("button", { name: "View image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await settled(carousel);
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-label",
    /2 \/ 2/,
  );
});

test("full-screen opening is static, then arrows, keyboard and thumbnails slide without changing image fitting", async ({
  page,
}) => {
  await page.goto("/products/boucle-ball");
  await page.locator(".gallery-main").click();
  const dialog = page.getByRole("dialog");
  const carousel = dialog.locator(".gallery-carousel");
  await settled(carousel);
  expect(
    await carousel.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await expect(carousel.locator("img")).toHaveCSS("object-fit", "contain");
  await dialog.getByRole("button", { name: "Next image" }).click();
  await direction(carousel, "next");
  await page.keyboard.press("ArrowLeft");
  await direction(carousel, "previous");
  await dialog.getByRole("button", { name: "View image 2" }).click();
  await direction(carousel, "next");
  await carousel.evaluate((element) => {
    const next = element
      .closest(".lightbox-stage")
      ?.querySelector<HTMLButtonElement>(".lightbox-arrow-next");
    for (let i = 0; i < 3; i++) next?.click();
  });
  await expect(
    dialog.getByRole("button", { name: "View image 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await settled(carousel);
  await dialog.getByRole("button", { name: "Previous image" }).click();
  await direction(carousel, "previous");
  await dialog.getByRole("button", { name: "Next image" }).click();
  await direction(carousel, "next");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await settled(page.locator(".gallery-main .gallery-carousel"));
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-label",
    /1 \/ 2/,
  );
});

test("touch tracks the finger, snaps short drags back and completes swipes in both viewers", async ({
  page,
}) => {
  await page.goto("/products/boucle-ball");
  const carousel = page.locator(".gallery-main .gallery-carousel");
  // Confirm client interaction is hydrated before dispatching synthetic touch
  // events (unlike clicks, these do not get replayed during hydration).
  const thumbnails = page.getByRole("group", { name: "Product images" });
  await thumbnails.getByRole("button", { name: "View image 2" }).click();
  await expect(
    thumbnails.getByRole("button", { name: "View image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await settled(carousel);
  await thumbnails.getByRole("button", { name: "View image 1" }).click();
  await expect(
    thumbnails.getByRole("button", { name: "View image 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await settled(carousel);
  await touch(carousel, 230, "touchstart");
  await touch(carousel, 205, "touchmove");
  await expect(carousel).toHaveAttribute("data-phase", "dragging");
  const matrix = await carousel
    .locator("[data-outgoing]")
    .evaluate(
      (element) =>
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    );
  expect(matrix).toBe(-25);
  await touch(carousel, 205, "touchend");
  await settled(carousel);
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-label",
    /1 \/ 2/,
  );
  await touch(carousel, 240, "touchstart");
  await touch(carousel, 80, "touchmove");
  await touch(carousel, 80, "touchend");
  await direction(carousel, "next");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  // A real tap after the browser's synthetic post-swipe click window still opens.
  await page.waitForTimeout(550);
  await page.locator(".gallery-main").click();
  const fullScreen = page.getByRole("dialog").locator(".gallery-carousel");
  await touch(fullScreen, 80, "touchstart");
  await touch(fullScreen, 240, "touchmove");
  await expect(fullScreen).toHaveAttribute("data-phase", "dragging");
  await touch(fullScreen, 240, "touchend");
  await direction(fullScreen, "previous");
});

test("incoming loading retains the previous image until the replacement is ready", async ({
  page,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/image?*", async (route) => {
    const url = new URL(route.request().url());
    if (
      (url.searchParams.get("url") ?? "").includes("cotton.jpg") &&
      Number(url.searchParams.get("w")) > 150
    )
      await held;
    await route.continue();
  });
  await page.goto("/products/boucle-ball");
  const carousel = page.locator(".gallery-main .gallery-carousel");
  await expect
    .poll(() =>
      carousel
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(carousel).toHaveAttribute("data-phase", "waiting");
  await expect(carousel.locator("[data-outgoing] img")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    await carousel
      .locator("[data-outgoing]")
      .evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      ),
  ).toBe(0);
  release();
  await direction(carousel, "next");
});

test("reduced motion navigates immediately in both viewers and single-image products have no transition", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/products/boucle-ball");
  await page.getByRole("button", { name: "Next image" }).click();
  await settled(page.locator(".gallery-main .gallery-carousel"));
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-label",
    /2 \/ 2/,
  );
  await page.locator(".gallery-main").click();
  const dialog = page.getByRole("dialog");
  await page.keyboard.press("ArrowLeft");
  await settled(dialog.locator(".gallery-carousel"));
  expect(
    await dialog
      .locator(".gallery-carousel")
      .evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(page.locator(".gallery-main .gallery-carousel")).toHaveAttribute(
    "data-phase",
    "sliding",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settled(page.locator(".gallery-main .gallery-carousel"));
  await page.goto("/products/infinity-knot");
  await expect(page.getByRole("button", { name: "Next image" })).toHaveCount(0);
  await settled(page.locator(".gallery-main .gallery-carousel"));
});

test("a failed incoming image finishes bounded recovery and settles without duplicate slides", async ({
  page,
}) => {
  await page.route("**/_next/image?*", async (route) => {
    const url = new URL(route.request().url());
    if (
      (url.searchParams.get("url") ?? "").includes("cotton.jpg") &&
      Number(url.searchParams.get("w")) > 150
    )
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Unavailable",
        headers: { "cache-control": "no-store" },
      });
    else await route.continue();
  });
  await page.goto("/products/boucle-ball");
  await page.getByRole("button", { name: "Next image" }).click();
  const carousel = page.locator(".gallery-main .gallery-carousel");
  await expect(carousel.locator("[data-current] .is-unavailable")).toBeVisible({
    timeout: 15000,
  });
  await settled(carousel);
  await page.getByRole("button", { name: "Previous image" }).click();
  await direction(carousel, "previous");
});
