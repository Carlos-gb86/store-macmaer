import { describe, expect, it } from "vitest";
import {
  planTranslations,
  translateDocument,
  translateImageAlt,
  translateText,
  type Snapshot,
} from "../scripts/translate-catalogue-sv";

const dictionary = {
  Pillow: "Kudde",
  Soft: "Mjuk",
  Blue: "Blå",
  Size: "Storlek",
};
const snapshot = (): Snapshot => ({
  products: [],
  collections: [],
  tags: [],
  product_options: [],
  product_option_values: [],
  product_variants: [],
  product_images: [],
});

describe("Swedish catalogue translation", () => {
  it("translates paragraphs and variant labels while preserving numbers", () => {
    expect(translateText("Pillow\n\nSoft", dictionary)).toBe("Kudde\n\nMjuk");
    expect(translateText("Blue / 25", dictionary)).toBe("Blå / 25");
    expect(translateText("Variation 3", dictionary)).toBe("Variant 3");
    expect(translateText("25 / 10", dictionary)).toBe("25 / 10");
    expect(translateText("Unknown", dictionary)).toBeNull();
  });

  it("preserves rich-text structure and links without mutating the source", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Pillow",
              marks: [{ type: "link", attrs: { href: "https://macmaer.com" } }],
            },
          ],
        },
      ],
    };
    expect(translateDocument(document, dictionary)).toEqual({
      ...document,
      content: [
        {
          type: "paragraph",
          content: [{ ...document.content[0]!.content[0]!, text: "Kudde" }],
        },
      ],
    });
    expect(document.content[0]!.content[0]!.text).toBe("Pillow");
    expect(
      translateDocument(
        { type: "doc", content: [{ type: "text", text: "Unknown" }] },
        dictionary,
      ),
    ).toBeNull();
  });

  it("fills only empty Swedish fields and makes reruns a no-op", () => {
    const source = snapshot();
    source.products.push({
      id: "product",
      title: "Pillow",
      title_sv: null,
      description: "Soft",
      description_sv: "Egen beskrivning",
      status: "draft",
    });
    source.tags.push({ id: "tag", name: "Blue", name_sv: " " });
    const plan = planTranslations(source, dictionary);
    expect(plan.missing).toEqual([]);
    expect(plan.updates[0]!.patch).toEqual({ title_sv: "Kudde" });
    expect(plan.preservedFields).toBe(1);
    for (const update of plan.updates) {
      expect(
        Object.keys(update.patch).every((field) => field.endsWith("_sv")),
      ).toBe(true);
      Object.assign(
        source[update.table].find((row) => row.id === update.id)!,
        update.patch,
      );
    }
    expect(planTranslations(source, dictionary).updates).toEqual([]);
    expect(source.products[0]!.status).toBe("draft");
  });

  it("does not override a manual description with an English-derived rich document", () => {
    const source = snapshot();
    source.products.push({
      id: "product",
      description: "Soft",
      description_sv: "Egen beskrivning",
      description_document: {
        type: "doc",
        content: [{ type: "text", text: "Soft" }],
      },
      description_document_sv: null,
    });
    expect(planTranslations(source, dictionary).updates).toEqual([]);
  });

  it("reports unmapped text rather than writing a partial rich-text translation", () => {
    const source = snapshot();
    source.products.push({
      id: "product",
      description: "Unknown",
      description_sv: null,
      description_document: {
        type: "doc",
        content: [{ type: "text", text: "Unknown" }],
      },
      description_document_sv: null,
    });
    const plan = planTranslations(source, dictionary);
    expect(plan.missing).toEqual(["Unknown"]);
    expect(plan.updates).toEqual([]);
  });

  it("uses reviewed image labels or a truthful product-name fallback", () => {
    expect(translateImageAlt("pillow-2", dictionary)).toBe("Kudde – bild 2");
    const source = snapshot();
    source.products.push({ id: "product", title: "Pillow", title_sv: null });
    source.product_images.push({
      id: "image",
      product_id: "product",
      alt: "IMG_0001",
      alt_sv: null,
      sort_order: 0,
    });
    const plan = planTranslations(source, dictionary);
    expect(plan.updates[1]!.patch).toEqual({ alt_sv: "Kudde – produktbild 1" });
    expect(plan.genericImageAlts).toHaveLength(1);
  });
});
