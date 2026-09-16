import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outputDirectory = fileURLToPath(
  new URL("../public/images/about/", import.meta.url),
);

const images = [
  [
    "maria.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/DBC6D279-E29B-433E-A18B-70E3D70B4D74.jpg",
  ],
  [
    "boucle-white.webp",
    "https://macmaer.com/wp-content/uploads/2023/01/Background-white.jpg",
  ],
  [
    "boucle-collection.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/6E2D15DE-96C7-4A5B-B2F0-4529B4BD69B0.jpg",
  ],
  [
    "velvet-fabrics.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_6094-scaled.jpg",
  ],
  [
    "gemma-reversible-knot.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_4127-2-scaled.jpg",
  ],
  [
    "mini-velvet-ball-knot.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_4284-4-scaled.jpg",
  ],
  [
    "boucle-fabric.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_5212.jpg",
  ],
  [
    "boucle-ball-knot.webp",
    "https://macmaer.com/wp-content/uploads/2023/02/IMG_5397.jpg",
  ],
  [
    "boucle-colours.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_5554-1-scaled.jpg",
  ],
  [
    "process-stitching.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_6940-1-scaled.jpg",
  ],
  [
    "process-shaping.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_8470-scaled.jpg",
  ],
  [
    "process-finishing.webp",
    "https://macmaer.com/wp-content/uploads/2023/07/IMG_6707-6-scaled.jpg",
  ],
];

await mkdir(outputDirectory, { recursive: true });

for (const [filename, source] of images) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Could not download ${source}: ${response.status}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({
      width: 1600,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  await writeFile(`${outputDirectory}/${filename}`, output);
  console.log(`${filename}: ${Math.round(output.length / 1024)} KB`);
}
