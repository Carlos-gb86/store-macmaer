import { expect, it } from "vitest";
import sharp from "sharp";
import { optimiseImage } from "@/modules/admin/media";
it.each(["jpeg", "png", "webp", "avif"] as const)(
  "converts %s uploads to bounded WebP without enlarging",
  async (format) => {
    const bytes = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 4,
        background: { r: 120, g: 80, b: 40, alpha: 0.5 },
      },
    })
      .toFormat(format)
      .toBuffer();
    const output = await optimiseImage(bytes, "image/" + format);
    const metadata = await sharp(output.bytes).metadata();
    expect(output.metadata).toMatchObject({
      mime_type: "image/webp",
      width: 120,
      height: 80,
      byte_size: output.bytes.length,
    });
    expect(metadata.format).toBe("webp");
    if (format !== "jpeg") expect(metadata.hasAlpha).toBe(true);
  },
);
it("corrects orientation, bounds large images and strips embedded metadata", async () => {
  const bytes = await sharp({
    create: { width: 4000, height: 2000, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await optimiseImage(bytes, "image/jpeg");
  expect(output.metadata).toMatchObject({ width: 1200, height: 2400 });
  const metadata = await sharp(output.bytes).metadata();
  expect(metadata.exif).toBeUndefined();
  expect(metadata.orientation).toBeUndefined();
});
it("rejects a false MIME declaration and SVG before encoding", async () => {
  const bytes = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await expect(optimiseImage(bytes, "image/jpeg")).rejects.toThrow(
    "Format mismatch",
  );
  await expect(
    optimiseImage(
      Buffer.from('<svg width="10" height="10"></svg>'),
      "image/png",
    ),
  ).rejects.toThrow();
});
