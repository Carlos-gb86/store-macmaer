// Mechanically pairs the reviewed, indexed Swedish batch with its frozen English source snapshot.
// No database or network access. Refuse mismatched snapshots rather than shift translations.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const [snapshotPath, batchPath] = process.argv.slice(2);
if (!snapshotPath || !batchPath)
  throw new Error(
    "Provide a catalogue snapshot and the reviewed paragraph batch.",
  );
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const batch = JSON.parse(await readFile(batchPath, "utf8"));
const sources = [
  ...new Set(
    [...snapshot.products, ...snapshot.collections].flatMap((row) =>
      [
        row.description,
        row.materials,
        row.care,
        row.processing_time,
        row.subtitle,
        row.seo_title,
        row.seo_description,
      ]
        .filter(Boolean)
        .flatMap((text) =>
          text
            .split(/\n\s*\n/u)
            .map((text) => text.replace(/\s+/gu, " ").trim())
            .filter(Boolean),
        ),
    ),
  ),
];
const hash = createHash("sha256").update(JSON.stringify(sources)).digest("hex");
if (
  hash !== batch.sourceHash ||
  Object.keys(batch.translations).length !== sources.length
)
  throw new Error(
    "The reviewed source hash or translation count does not match.",
  );
const output = new URL("./data/catalogue-sv.json", import.meta.url);
const dictionary = JSON.parse(await readFile(output, "utf8"));
sources.forEach((source, index) => {
  const translated = batch.translations[index];
  if (typeof translated !== "string" || !translated.trim())
    throw new Error(`Missing translation ${index}`);
  if (dictionary[source] && dictionary[source] !== translated)
    throw new Error(`Conflicting translation ${index}`);
  dictionary[source] = translated;
});
await writeFile(output, JSON.stringify(dictionary, null, 2) + "\n");
console.log(
  `Compiled ${sources.length} reviewed paragraph translations into the catalogue dictionary.`,
);
