import { describe, it, expect } from "vitest";
import { parseMinorUnits } from "@/modules/admin/money";
import {
  adminProductSchema,
  productInput,
  duplicateProduct,
  newProduct,
} from "@/modules/admin/schema";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import { validateSelections } from "@/modules/catalog/selection";
import { matchesNumericStep } from "@/modules/catalog/numeric";
import {
  richTextSchema,
  textDocument,
  plainText,
} from "@/modules/content/rich-text";
describe("Catalogue administration validation", () => {
  it("parses SEK decimals exactly and rejects rounding, exponent notation and overflow", () => {
    expect(parseMinorUnits("100,01")).toBe(10001);
    expect(parseMinorUnits("-0.29", true)).toBe(-29);
    expect(parseMinorUnits("21474836.47")).toBe(2147483647);
    for (const value of [
      "1.001",
      "1e2",
      "-1",
      "Infinity",
      "21474836.48",
      "",
      "0x10",
    ])
      expect(() => parseMinorUnits(value)).toThrow();
  });
  it("accepts all representative catalogue models", () => {
    for (const p of getDemoCatalogue().products)
      expect(
        adminProductSchema.safeParse(productInput(p)).success,
        p.slug,
      ).toBe(true);
  });
  it("duplicates identities while preserving variant ownership and media sharing", () => {
    const source = productInput(
      getDemoCatalogue().products.find((p) => p.slug === "velvet-knot")!,
    );
    const copy = duplicateProduct(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.sku).toBeNull();
    expect(copy.status).toBe("draft");
    expect(
      copy.variants[0]!.value_ids.every((id) =>
        copy.options.some((o) => o.values.some((v) => v.id === id)),
      ),
    ).toBe(true);
    expect(adminProductSchema.safeParse(copy).success).toBe(true);
  });
  it("rejects stale combinations, duplicate keys, incomplete axes and invalid tracked inventory", () => {
    const original = productInput(
      getDemoCatalogue().products.find((p) => p.slug === "velvet-knot")!,
    );
    for (const mutate of [
      (p: typeof original) => (p.options[0]!.values[0]!.active = false),
      (p: typeof original) => (p.options[1]!.key = p.options[0]!.key),
      (p: typeof original) => (p.variants[0]!.value_ids = []),
      (p: typeof original) =>
        p.variants.push({
          ...p.variants[0]!,
          id: crypto.randomUUID(),
          sku: "another",
        }),
      (p: typeof original) => {
        p.inventory_strategy = "TRACKED";
        p.stock_quantity = null;
      },
      (p: typeof original) => {
        p.variants[0]!.price_delta = "1.00";
      },
    ]) {
      const p = structuredClone(original);
      mutate(p);
      expect(adminProductSchema.safeParse(p).success).toBe(false);
    }
  });
  it("validates numeric steps on storefront configuration", () => {
    expect(matchesNumericStep(0.3, 0, 0.1)).toBe(true);
    expect(matchesNumericStep(0.31, 0, 0.1)).toBe(false);
    const p = getDemoCatalogue().products.find(
      (p) => p.slug === "cotton-knot",
    )!;
    const o = p.options.find((o) => !o.is_variant_axis)!;
    o.display_type = "number";
    o.validation_rules = { min: 0.1, max: 1, step: 0.2 };
    expect(validateSelections(p, { [o.key]: ["0.2"] })).toContain(
      "Enter a valid " + o.label.toLowerCase() + ".",
    );
  });
  it("requires a SKU before publication", () => {
    expect(
      adminProductSchema.safeParse({
        ...newProduct(),
        title: "Example",
        slug: "example",
        status: "active",
      }).success,
    ).toBe(false);
  });
  it("accepts structured text and rejects unsupported nodes or link protocols", () => {
    const doc = textDocument("Hello\n\nWorld");
    expect(richTextSchema.parse(doc)).toEqual(doc);
    expect(plainText(doc)).toBe("Hello\nWorld");
    for (const href of [
      "javascript:alert(1)",
      "//example.com",
      "data:text/html,test",
      "/\\example.com",
    ]) {
      const unsafe = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Link",
                marks: [{ type: "link", attrs: { href } }],
              },
            ],
          },
        ],
      };
      expect(richTextSchema.safeParse(unsafe).success).toBe(false);
    }
    expect(
      richTextSchema.safeParse({
        type: "doc",
        content: [{ type: "image", attrs: { src: "x" } }],
      }).success,
    ).toBe(false);
  });
});
