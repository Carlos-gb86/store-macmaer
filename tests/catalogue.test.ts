import { describe, expect, it } from "vitest";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import { parseCatalogueQuery, searchCatalogue } from "@/modules/catalog/query";
import {
  resolveVariant,
  validateSelections,
} from "@/modules/catalog/selection";
import { formatCataloguePrice } from "@/modules/catalog/format";
const catalogue = getDemoCatalogue();
function product(slug: string) {
  const item = catalogue.products.find((p) => p.slug === slug);
  if (!item) throw new Error("Missing fixture");
  return item;
}
describe("catalogue discovery", () => {
  it("uses variant inventory for availability and made-to-order filters", () => {
    const velvet = product("velvet-knot");
    const soldOut = {
      ...velvet,
      variants: velvet.variants.map((variant) => ({
        ...variant,
        stock_quantity: 0,
      })),
    };
    expect(
      searchCatalogue(
        { ...catalogue, products: [soldOut] },
        parseCatalogueQuery({ availability: "available" }),
      ).total,
    ).toBe(0);
    expect(
      searchCatalogue(
        { ...catalogue, products: [velvet] },
        parseCatalogueQuery({ availability: "made-to-order" }),
      ).total,
    ).toBe(0);
  });
  it("searches collection names, tags and descriptions without exposing drafts", () => {
    expect(
      searchCatalogue(catalogue, parseCatalogueQuery({ q: "BOUCLÉ" })).total,
    ).toBe(3);
    expect(
      searchCatalogue(catalogue, parseCatalogueQuery({ q: "accessory" }))
        .products[0]?.slug,
    ).toBe("colour-accessory-pack");
    expect(
      searchCatalogue(catalogue, parseCatalogueQuery({ q: "unpublished" }))
        .total,
    ).toBe(0);
    expect(
      searchCatalogue(catalogue, parseCatalogueQuery({ q: "reading corner" }))
        .total,
    ).toBe(6);
  });
  it("combines collection, tag, availability and deterministic price sorting", () => {
    const result = searchCatalogue(
      catalogue,
      parseCatalogueQuery({
        collection: "boucle",
        tag: "handmade",
        availability: "available",
        sort: "price-desc",
      }),
    );
    expect(result.products.map((p) => p.slug)).toEqual([
      "infinity-knot",
      "boucle-ball",
    ]);
  });
  it("normalizes malformed and repeated query parameters", () => {
    expect(
      parseCatalogueQuery({
        q: ["  pillow  ", "ignored"],
        sort: "invalid",
        page: "-1",
      }),
    ).toMatchObject({ q: "pillow", sort: "featured", page: 1 });
    expect(
      parseCatalogueQuery({ page: "NaN", q: "x".repeat(121) }),
    ).toMatchObject({ page: 1, q: "" });
  });
  it("paginates and clamps a page beyond the available result set", () => {
    const data = {
      ...catalogue,
      products: Array.from({ length: 25 }, (_, i) => ({
        ...product("infinity-knot"),
        id: String(i),
        slug: "product-" + i,
      })),
    };
    const result = searchCatalogue(data, parseCatalogueQuery({ page: "100" }));
    expect(result).toMatchObject({ page: 3, totalPages: 3, total: 25 });
    expect(result.products).toHaveLength(1);
  });
});
describe("generic configuration", () => {
  it("supports a product with no options", () =>
    expect(validateSelections(product("infinity-knot"), {})).toEqual([]));
  it("resolves exact size and colour SKU combinations, rejecting invalid ones", () => {
    const item = product("velvet-knot");
    const colour = item.options.find((o) => o.key === "colour")!;
    const size = item.options.find((o) => o.key === "size")!;
    const selections = {
      colour: [colour.values[0]!.id],
      size: [size.values[1]!.id],
    };
    expect(resolveVariant(item, selections)?.sku).toBe(
      "DEMO-VELVET-ivory-large",
    );
    expect(validateSelections(item, selections)).toEqual([]);
    expect(
      resolveVariant(item, {
        colour: [colour.values[3]!.id],
        size: [size.values[0]!.id],
      }),
    ).toBeUndefined();
    expect(
      validateSelections(item, { ...selections, colour: ["forged-id"] }),
    ).not.toEqual([]);
  });
  it("preserves five repeated selections without creating variants", () => {
    const item = product("colour-accessory-pack");
    const value = item.options[0]!.values[0]!.id;
    const selections = { colours: Array<string>(5).fill(value) };
    expect(item.variants).toHaveLength(0);
    expect(validateSelections(item, selections)).toEqual([]);
    expect(validateSelections(item, { colours: [value] })).not.toEqual([]);
    expect(
      validateSelections(
        {
          ...item,
          options: item.options.map((o) => ({ ...o, allow_duplicates: false })),
        },
        selections,
      ),
    ).toContain("Choose different values for Colour.");
  });
  it("enforces text limits and rejects unknown configuration keys", () => {
    const item = product("cotton-knot");
    const fabric = [item.options[0]!.values[0]!.id];
    expect(
      validateSelections(item, { fabric, personalization: ["A".repeat(31)] }),
    ).toContain("Personalization is too long.");
    expect(
      validateSelections(item, {
        fabric,
        personalization: ["M"],
        injected: ["value"],
      }),
    ).toContain("Unknown option.");
    expect(validateSelections(item, { fabric })).toEqual([]);
  });
});
describe("minor-unit display", () => {
  it("formats exact integer minor units without floating-point money arithmetic", () => {
    expect(formatCataloguePrice(65000, "SEK")).toBe("650 SEK");
    expect(formatCataloguePrice(65001, "SEK")).toBe("650.01 SEK");
    expect(formatCataloguePrice(1, "EUR")).toBe("0.01 EUR");
    expect(formatCataloguePrice(0, "USD")).toBe("0 USD");
    expect(() => formatCataloguePrice(1.1, "SEK")).toThrow();
    expect(() => formatCataloguePrice(-1, "SEK")).toThrow();
  });
});
