#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import type { Database } from "../src/lib/supabase/database.types";

const productFields = [
  "title",
  "subtitle",
  "short_description",
  "description",
  "materials",
  "care",
  "processing_time",
  "seo_title",
  "seo_description",
];
const collectionFields = [
  "name",
  "description",
  "image_alt",
  "seo_title",
  "seo_description",
];
const definitions = {
  products: {
    fields: productFields,
    document: true,
    extras: "status,legacy_woocommerce_id,updated_at",
  },
  collections: {
    fields: collectionFields,
    document: true,
    extras: "active,updated_at",
  },
  tags: { fields: ["name"], document: false, extras: "updated_at" },
  product_options: { fields: ["label"], document: false, extras: "product_id" },
  product_option_values: {
    fields: ["label"],
    document: false,
    extras: "option_id",
  },
  product_variants: {
    fields: ["title"],
    document: false,
    extras: "product_id",
  },
  product_images: {
    fields: ["alt"],
    document: false,
    extras: "product_id,sort_order",
  },
} as const;
type Table = keyof typeof definitions;
export type ContentRow = { id: string; [key: string]: unknown };
export type Snapshot = Record<Table, ContentRow[]>;
export type Dictionary = Record<string, string>;
export type TranslationUpdate = {
  table: Table;
  id: string;
  before: ContentRow;
  patch: Record<string, string | object>;
};

const contentRowSchema = z.object({ id: z.uuid() }).catchall(z.unknown());
const dictionarySchema = z.record(z.string(), z.string().min(1));
// Runtime whitelist also gives Supabase a strictly typed, translation-only patch.
const patchSchema = z
  .object({
    title_sv: z.string().optional(),
    subtitle_sv: z.string().optional(),
    short_description_sv: z.string().optional(),
    description_sv: z.string().optional(),
    materials_sv: z.string().optional(),
    care_sv: z.string().optional(),
    processing_time_sv: z.string().optional(),
    seo_title_sv: z.string().optional(),
    seo_description_sv: z.string().optional(),
    name_sv: z.string().optional(),
    image_alt_sv: z.string().optional(),
    label_sv: z.string().optional(),
    alt_sv: z.string().optional(),
    description_document_sv: z.json().optional(),
  })
  .strict();
const normalize = (text: string) =>
  text.normalize("NFC").replace(/\s+/gu, " ").trim();
export const hasText = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim());

export function textParts(text: string) {
  return text
    .split(/\n\s*\n/)
    .map(normalize)
    .filter(Boolean);
}

export function documentTexts(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid rich-text node.");
  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string")
    throw new Error("Missing rich-text node type.");
  const texts = typeof node.text === "string" ? [node.text] : [];
  if (node.content !== undefined) {
    if (!Array.isArray(node.content))
      throw new Error("Invalid rich-text content.");
    texts.push(...node.content.flatMap(documentTexts));
  }
  return texts;
}

export function translateText(
  text: string,
  dictionary: Dictionary,
): string | null {
  const exact = dictionary[normalize(text)];
  if (exact !== undefined) return exact;
  if (!normalize(text) || /^[\d\s.,%+×−–—/"“”'’():;•-]+$/u.test(text))
    return text;
  const variant = /^Variation (\d+)$/u.exec(normalize(text));
  if (variant) return `Variant ${variant[1]}`;
  const parts = textParts(text);
  if (parts.length > 1) {
    const translated = parts.map((part) => translateText(part, dictionary));
    if (translated.every((part): part is string => part !== null))
      return translated.join("\n\n");
  }
  // Variation labels are composed from existing option labels. No SKU/key is changed.
  const combinations = text.split(" / ");
  if (combinations.length > 1) {
    const translated = combinations.map((part) =>
      translateText(part, dictionary),
    );
    if (translated.every((part): part is string => part !== null))
      return translated.join(" / ");
  }
  return null;
}

export function translateDocument(
  value: unknown,
  dictionary: Dictionary,
): object | null {
  documentTexts(value);
  let complete = true;
  function visit(value: unknown): object {
    const node = value as Record<string, unknown>;
    const translated = { ...node };
    if (typeof node.text === "string") {
      const text = translateText(node.text, dictionary);
      if (text === null) complete = false;
      else translated.text = text;
    }
    if (Array.isArray(node.content))
      translated.content = node.content.map(visit);
    return translated;
  }
  const document = visit(value);
  return complete ? document : null;
}

export function translateImageAlt(text: string, dictionary: Dictionary) {
  const source = normalize(text);
  const exact = translateText(source, dictionary);
  if (exact !== null) return exact;
  const numbered = /^(.*?)[\s-]*(\d+)$/u.exec(source);
  const base = numbered?.[1]?.trim() ?? source;
  const match = Object.entries(dictionary).find(
    ([key]) => normalize(key).toLowerCase() === base.toLowerCase(),
  );
  return match
    ? `${match[1]}${numbered ? ` – bild ${numbered[2]}` : ""}`
    : null;
}

export function planTranslations(snapshot: Snapshot, dictionary: Dictionary) {
  const updates: TranslationUpdate[] = [];
  const missing = new Set<string>();
  const genericImageAlts: { id: string; source: string; translated: string }[] =
    [];
  const productTitles = new Map(
    snapshot.products.map((row) => [
      row.id,
      hasText(row.title_sv)
        ? row.title_sv
        : hasText(row.title)
          ? translateText(row.title, dictionary)
          : null,
    ]),
  );
  let preservedFields = 0;
  for (const [table, definition] of Object.entries(definitions) as [
    Table,
    (typeof definitions)[Table],
  ][]) {
    for (const row of snapshot[table]) {
      const patch: Record<string, string | object> = {};
      for (const field of definition.fields) {
        if (hasText(row[`${field}_sv`])) {
          preservedFields++;
          continue;
        }
        if (!hasText(row[field])) continue;
        let translated =
          table === "product_images"
            ? translateImageAlt(row[field], dictionary)
            : translateText(row[field], dictionary);
        if (translated === null && table === "product_images") {
          const title = productTitles.get(String(row.product_id));
          if (title) {
            translated = `${title} – produktbild ${Number(row.sort_order) + 1}`;
            genericImageAlts.push({
              id: row.id,
              source: row[field],
              translated,
            });
          }
        }
        if (translated === null)
          textParts(row[field]).forEach((text) => {
            if (translateText(text, dictionary) === null) missing.add(text);
          });
        else patch[`${field}_sv`] = translated;
      }
      if (
        definition.document &&
        row.description_document &&
        !row.description_document_sv
      ) {
        // A manually translated plain description must not be replaced by translated English formatting.
        if (!hasText(row.description_sv)) {
          const translated = translateDocument(
            row.description_document,
            dictionary,
          );
          if (translated) patch.description_document_sv = translated;
          else
            documentTexts(row.description_document).forEach((text) => {
              if (translateText(text, dictionary) === null)
                missing.add(normalize(text));
            });
        }
      }
      if (Object.keys(patch).length)
        updates.push({ table, id: row.id, before: row, patch });
    }
  }
  return {
    updates,
    missing: [...missing].sort(),
    preservedFields,
    genericImageAlts,
  };
}

async function readSnapshot(
  client: ReturnType<typeof createClient<Database>>,
): Promise<Snapshot> {
  const snapshot = {} as Snapshot;
  for (const [table, definition] of Object.entries(definitions) as [
    Table,
    (typeof definitions)[Table],
  ][]) {
    const fields = [
      "id",
      definition.extras,
      ...definition.fields.flatMap((field) => [field, `${field}_sv`]),
      ...(definition.document
        ? ["description_document", "description_document_sv"]
        : []),
    ].join(",");
    const rows: ContentRow[] = [];
    for (let from = 0; ; from += 100) {
      const { data, error } = await client
        .from(table)
        .select(fields)
        .order("id")
        .range(from, from + 99);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...z.array(contentRowSchema).parse(data));
      if (data.length < 100) break;
    }
    snapshot[table] = rows;
  }
  return snapshot;
}

async function saveReport(name: string, value: unknown) {
  await mkdir("migration", { recursive: true });
  await writeFile(
    `migration/swedish-catalogue-${name}.json`,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
}

function updateQuery(
  client: ReturnType<typeof createClient<Database>>,
  update: TranslationUpdate,
) {
  const patch = patchSchema.parse(update.patch);
  const definition = definitions[update.table];
  const allowed = new Set<string>(
    definition.fields.map((field) => `${field}_sv`),
  );
  if (definition.document) allowed.add("description_document_sv");
  if (Object.keys(patch).some((field) => !allowed.has(field)))
    throw new Error("Unexpected translation field for table.");
  // Supabase's strict update typing requires a concrete table. The runtime schema
  // and per-table whitelist above validate these narrow generated-type assertions.
  switch (update.table) {
    case "products":
      return client
        .from("products")
        .update(patch as Database["public"]["Tables"]["products"]["Update"])
        .eq("id", update.id);
    case "collections":
      return client
        .from("collections")
        .update(patch as Database["public"]["Tables"]["collections"]["Update"])
        .eq("id", update.id);
    case "tags":
      return client
        .from("tags")
        .update(patch as Database["public"]["Tables"]["tags"]["Update"])
        .eq("id", update.id);
    case "product_options":
      return client
        .from("product_options")
        .update(
          patch as Database["public"]["Tables"]["product_options"]["Update"],
        )
        .eq("id", update.id);
    case "product_option_values":
      return client
        .from("product_option_values")
        .update(
          patch as Database["public"]["Tables"]["product_option_values"]["Update"],
        )
        .eq("id", update.id);
    case "product_variants":
      return client
        .from("product_variants")
        .update(
          patch as Database["public"]["Tables"]["product_variants"]["Update"],
        )
        .eq("id", update.id);
    case "product_images":
      return client
        .from("product_images")
        .update(
          patch as Database["public"]["Tables"]["product_images"]["Update"],
        )
        .eq("id", update.id);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      inspect: { type: "boolean" },
      apply: { type: "boolean" },
      "project-ref": { type: "string" },
      "env-file": { type: "string", default: ".env.local" },
    },
  });
  process.loadEnvFile(values["env-file"]);
  const url = z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = new URL(url).hostname.replace(/\.supabase\.co$/u, "");
  if (
    values.apply &&
    (values.inspect ||
      !/^[a-z]{20}$/u.test(projectRef) ||
      values["project-ref"] !== projectRef)
  )
    throw new Error(
      "Apply requires --project-ref matching the hosted Supabase environment; --inspect cannot be combined with --apply.",
    );
  const key = z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  const snapshot = await readSnapshot(client);
  const dictionary = Object.fromEntries(
    Object.entries(
      dictionarySchema.parse(
        JSON.parse(
          await readFile(
            new URL("./data/catalogue-sv.json", import.meta.url),
            "utf8",
          ),
        ),
      ),
    ).map(([source, translated]) => [normalize(source), translated]),
  );
  const plan = planTranslations(snapshot, dictionary);
  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const summary = {
    projectRef,
    counts: Object.fromEntries(
      Object.entries(snapshot).map(([table, rows]) => [table, rows.length]),
    ),
    recordsToUpdate: plan.updates.length,
    fieldsToUpdate: plan.updates.reduce(
      (count, update) => count + Object.keys(update.patch).length,
      0,
    ),
    preservedFields: plan.preservedFields,
    unmappedTexts: plan.missing.length,
    genericImageAlts: plan.genericImageAlts.length,
  };
  if (values.inspect) {
    await saveReport(`snapshot-${timestamp}`, snapshot);
    await saveReport(`sources-${timestamp}`, {
      ...summary,
      sources: plan.missing,
    });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!values.apply) {
    await saveReport(`dry-run-${timestamp}`, {
      ...summary,
      missing: plan.missing,
      genericAltReview: plan.genericImageAlts,
      updates: plan.updates,
    });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (plan.missing.length)
    throw new Error(
      `Refusing a partial translation: ${plan.missing.length} source texts need mapping. Run --inspect or a dry run.`,
    );
  await saveReport(`backup-${timestamp}`, {
    projectRef,
    snapshot,
    updates: plan.updates,
  });
  const applied: TranslationUpdate[] = [];
  try {
    for (const update of plan.updates) {
      // Patch only Swedish fields. Compare both source and target to avoid clobbering edits made since the read.
      let query = updateQuery(client, update);
      if (typeof update.before.updated_at === "string")
        query = query.eq("updated_at" as string, update.before.updated_at);
      for (const target of Object.keys(update.patch)) {
        for (const field of [target, target.replace(/_sv$/u, "")]) {
          const original = update.before[field];
          query =
            original === null
              ? query.is(field, null)
              : query.eq(
                  field,
                  typeof original === "object"
                    ? JSON.stringify(original)
                    : (original as string),
                );
        }
      }
      const { data, error } = await query.select("id");
      if (error)
        throw new Error(`${update.table}/${update.id}: ${error.message}`);
      if (data.length !== 1)
        throw new Error(
          `${update.table}/${update.id} changed during translation. Rerun after review.`,
        );
      applied.push(update);
      if (applied.length % 50 === 0)
        console.log(
          `Translated ${applied.length}/${plan.updates.length} records.`,
        );
    }
    const verified = await readSnapshot(client);
    for (const update of applied) {
      const row = verified[update.table].find((row) => row.id === update.id);
      for (const [field, expected] of Object.entries(update.patch))
        if (!isDeepStrictEqual(row?.[field], expected))
          throw new Error(
            `Verification failed: ${update.table}/${update.id}/${field}`,
          );
    }
    await saveReport(`applied-${timestamp}`, {
      ...summary,
      genericAltReview: plan.genericImageAlts,
      appliedRecords: applied.length,
      verified: true,
    });
    console.log(
      JSON.stringify(
        { ...summary, appliedRecords: applied.length, verified: true },
        null,
        2,
      ),
    );
  } catch (error) {
    await saveReport(`interrupted-${timestamp}`, {
      projectRef,
      appliedRecords: applied.length,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Translation failed.",
    );
    process.exitCode = 1;
  });
